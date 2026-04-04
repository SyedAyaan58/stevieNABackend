/**
 * Geography Eligibility Service
 *
 * Determines which Stevie Award programs a user is eligible for based on
 * their personal location and business/organization location.
 *
 * Design:
 * - Eligibility is based on BUSINESS location, not personal location
 * - Global programs (IBA, WOMEN, TECH, EMPLOYERS, SALES) are always included
 * - LLM (gpt-4o-mini) does the geographic classification — no hardcoded country maps
 * - Results are Redis-cached for 6 hours by sha256(userLocation|bizLocation)
 * - On any failure, returns all Global programs (graceful degradation — never crashes the pipeline)
 */

import crypto from 'crypto';
import { openaiService } from './openaiService';
import { cacheManager } from './cacheManager';
import { getSupabaseClient } from '../config/supabase';
import logger from '../utils/logger';

const CACHE_TTL_SECONDS = 6 * 3600; // 6 hours
const CACHE_KEY_VERSION = 'geo:v1:';
const GLOBAL_FALLBACK_PROGRAMS = ['IBA', 'WOMEN', 'TECH', 'EMPLOYERS', 'SALES'];

/**
 * Static program geographic scope definitions.
 * Used to build the LLM prompt — not used as the filter mechanism itself.
 * The SQL filter uses program_code from the JOIN with stevie_programs.
 */
const PROGRAM_SCOPES: Array<{ code: string; name: string; scope: string[] }> = [
  { code: 'ABA',       name: 'American Business Awards',           scope: ['USA'] },
  { code: 'IBA',       name: 'International Business Awards',      scope: ['Global'] },
  { code: 'WOMEN',     name: 'Stevie Awards for Women in Business', scope: ['Global'] },
  { code: 'MENA',      name: 'Middle East & North Africa Stevie Awards', scope: ['Middle East', 'North Africa'] },
  { code: 'APAC',      name: 'Asia-Pacific Stevie Awards',         scope: ['Asia', 'Pacific'] },
  { code: 'TECH',      name: 'Stevie Awards for Technology Excellence', scope: ['Global'] },
  { code: 'GERMAN',    name: 'German Stevie Awards',               scope: ['Germany', 'Austria', 'Switzerland'] },
  { code: 'EMPLOYERS', name: 'Stevie Awards for Great Employers',  scope: ['Global'] },
  { code: 'SALES',     name: 'Stevie Awards for Sales & Customer Service', scope: ['Global'] },
];

const systemPrompt = `You are a geographic eligibility classifier for the Stevie Awards nomination system.

Given a user's personal location and their business/organization location, determine which award programs they are eligible for.

Rules:
- Eligibility is based on BUSINESS/ORGANIZATION location, not personal location.
- "Global" programs are always eligible for everyone regardless of location.
- For regional programs, use your world geography knowledge to determine if the business location falls within the program's geographic scope.
- If business location is ambiguous, empty, or unknown — include only Global programs.
- A company registered or operating in a country is eligible for that country's regional program even if the submitter lives elsewhere.

Respond ONLY with valid JSON. No explanation outside the JSON object.`;

function buildCacheKey(userLocation: string, bizLocation: string): string {
  const raw = `${CACHE_KEY_VERSION}${userLocation.toLowerCase().trim()}|${bizLocation.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildUserPrompt(userLocation: string, bizLocation: string): string {
  const programList = PROGRAM_SCOPES.map(
    p => `- ${p.code} (${p.name}): geographic_scope = [${p.scope.join(', ')}]`
  ).join('\n');

  return `User personal location: ${userLocation || 'not provided'}
Business/organization location: ${bizLocation || 'not provided'}

Available programs:
${programList}

Which program codes is this user eligible for? Reply with JSON:
{"eligible_program_codes": ["CODE1", "CODE2", ...], "reasoning": "one sentence"}`;
}

export class GeographyEligibilityService {
  /**
   * Returns the list of Stevie program codes the user is eligible for.
   * Uses Redis cache (6h TTL). Falls back to Global-only programs on any error.
   */
  async getEligiblePrograms(
    userLocation: string,
    businessLocation: string
  ): Promise<string[]> {
    // If no location info at all, return global programs only
    const hasLocation = (userLocation || '').trim().length > 0 || (businessLocation || '').trim().length > 0;
    if (!hasLocation) {
      logger.info('geo_eligibility_no_location', { result: GLOBAL_FALLBACK_PROGRAMS });
      return GLOBAL_FALLBACK_PROGRAMS;
    }

    const cacheKey = buildCacheKey(userLocation, businessLocation);

    // Check Redis cache
    try {
      const cached = await cacheManager.get<string[]>(`geo:${cacheKey}`);
      if (cached) {
        logger.info('geo_eligibility_cache_hit', {
          user_location: userLocation,
          biz_location: businessLocation,
          programs: cached,
        });
        return cached;
      }
    } catch (cacheErr: any) {
      logger.warn('geo_eligibility_cache_read_error', { error: cacheErr.message });
    }

    // Call LLM
    try {
      const rawResponse = await openaiService.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserPrompt(userLocation, businessLocation) },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 200,
      });

      // Parse response
      let text = (rawResponse || '').trim();
      // Strip markdown code fences if present
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }

      const parsed = JSON.parse(text);
      const codes: string[] = Array.isArray(parsed?.eligible_program_codes)
        ? parsed.eligible_program_codes.filter((c: any) => typeof c === 'string')
        : [];

      if (codes.length === 0) {
        logger.warn('geo_eligibility_empty_response', { raw: text.substring(0, 200) });
        return GLOBAL_FALLBACK_PROGRAMS;
      }

      // Validate codes against known programs
      const validCodes = PROGRAM_SCOPES.map(p => p.code);
      const filteredCodes = codes.filter(c => validCodes.includes(c));

      // Always ensure Global programs are included (safety net)
      const globalCodes = PROGRAM_SCOPES.filter(p => p.scope.includes('Global')).map(p => p.code);
      const finalCodes = [...new Set([...filteredCodes, ...globalCodes])];

      logger.info('geo_eligibility_resolved', {
        user_location: userLocation,
        biz_location: businessLocation,
        programs: finalCodes,
        reasoning: parsed?.reasoning,
      });

      // Cache result
      try {
        await cacheManager.set(`geo:${cacheKey}`, finalCodes, CACHE_TTL_SECONDS);
      } catch (cacheErr: any) {
        logger.warn('geo_eligibility_cache_write_error', { error: cacheErr.message });
      }

      return finalCodes;
    } catch (error: any) {
      logger.warn('geo_eligibility_llm_failed_using_global_fallback', {
        user_location: userLocation,
        biz_location: businessLocation,
        error: error.message,
      });
      return GLOBAL_FALLBACK_PROGRAMS;
    }
  }
}

export const geographyEligibilityService = new GeographyEligibilityService();
