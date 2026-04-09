/**
 * Geography Eligibility Service
 *
 * Determines which Stevie Award programs a user is eligible for based on
 * their business/organization location.
 *
 * Design:
 * - LLM classifies user location into eligible regional programs
 * - Handles fuzzy/informal locations ("EMEA", "South-East Asia", "the Gulf")
 * - Global programs (IBA, WOMEN, TECH, EMPLOYERS, SALES) are always included
 * - Results are Redis-cached for 24h (location → programs doesn't change)
 * - On LLM failure, falls back to keyword matching, then Global-only
 */

import crypto from 'crypto';
import { cacheManager } from './cacheManager';
import { openaiService } from './openaiService';
import logger from '../utils/logger';

const CACHE_TTL_SECONDS = 24 * 3600; // 24h
const CACHE_KEY_VERSION = 'geo:v3:';  // v3 = LLM-driven

const GLOBAL_PROGRAMS = ['IBA', 'WOMEN', 'TECH', 'EMPLOYERS', 'SALES'];
const ALL_REGIONAL = ['ABA', 'APAC', 'MENA', 'GERMAN'];
const ALL_PROGRAMS = [...GLOBAL_PROGRAMS, ...ALL_REGIONAL];

// ---------------------------------------------------------------------------
// LLM classification
// ---------------------------------------------------------------------------

const GEO_SYSTEM_PROMPT = `You classify a business location into eligible Stevie Award programs.

Regional programs and their eligibility:
- ABA: Organizations in the Americas (USA, Canada, Mexico, Central America, South America, Caribbean)
- APAC: Organizations in Asia or the Pacific (India, China, Japan, Korea, Singapore, Australia, New Zealand, Southeast Asia, etc.)
- MENA: Organizations in the Middle East or North Africa (UAE, Saudi Arabia, Egypt, Turkey, Israel, Qatar, etc.)
- GERMAN: Organizations in German-speaking countries (Germany, Austria, Switzerland)

Rules:
- Return ONLY the regional program codes that match. Do NOT include Global programs.
- A location can match multiple regional programs (rare but possible for border regions).
- If the location is ambiguous or you cannot determine the region, return an empty array.
- "EMEA" = MENA + GERMAN (Europe has no dedicated program, but MENA and GERMAN are subsets)
- "Global", "worldwide", "international" with no specific country = return empty array (Global programs handle it)

Return JSON only: {"programs": ["ABA"]} or {"programs": []} or {"programs": ["APAC", "MENA"]}`;

async function classifyWithLLM(location: string): Promise<string[]> {
  const response = await openaiService.chatCompletion({
    messages: [
      { role: 'system', content: GEO_SYSTEM_PROMPT },
      { role: 'user', content: `Business location: "${location}"` },
    ],
    model: 'gpt-4o-mini',
    temperature: 0,
    maxTokens: 50,
  });

  const parsed = JSON.parse(response);
  const programs: string[] = parsed.programs || [];

  // Validate — only allow known regional codes
  return programs.filter(p => ALL_REGIONAL.includes(p));
}

// ---------------------------------------------------------------------------
// Keyword fallback (no LLM, instant — used when LLM fails)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: Array<{ keywords: string[]; programs: string[] }> = [
  { keywords: ['united states', 'usa', 'america', 'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile', 'peru', 'caribbean'], programs: ['ABA'] },
  { keywords: ['india', 'china', 'japan', 'korea', 'singapore', 'hong kong', 'taiwan', 'thailand', 'vietnam', 'indonesia', 'malaysia', 'philippines', 'australia', 'new zealand', 'asia', 'pacific', 'apac'], programs: ['APAC'] },
  { keywords: ['saudi', 'uae', 'emirates', 'dubai', 'qatar', 'kuwait', 'bahrain', 'oman', 'jordan', 'lebanon', 'egypt', 'morocco', 'algeria', 'tunisia', 'turkey', 'middle east', 'north africa', 'mena'], programs: ['MENA'] },
  { keywords: ['germany', 'deutschland', 'austria', 'switzerland', 'schweiz', 'dach'], programs: ['GERMAN'] },
];

function keywordFallback(location: string): string[] {
  const loc = location.toLowerCase().replace(/[.,\/#!$%^&*;:{}=_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!loc) return [];

  const regional: string[] = [];
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some(kw => loc.includes(kw))) {
      for (const prog of entry.programs) {
        if (!regional.includes(prog)) regional.push(prog);
      }
    }
  }
  return regional;
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function buildCacheKey(bizLocation: string): string {
  const raw = `${CACHE_KEY_VERSION}${bizLocation.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GeographyEligibilityService {
  /**
   * Returns eligible Stevie program codes for a user's location.
   * LLM-classified, Redis-cached, keyword fallback on failure.
   */
  async getEligiblePrograms(
    userLocation: string,
    businessLocation: string
  ): Promise<string[]> {
    const bizLoc = (businessLocation || userLocation || '').trim();

    if (!bizLoc) {
      logger.info('geo_eligibility_no_location', { result: GLOBAL_PROGRAMS });
      return [...GLOBAL_PROGRAMS];
    }

    const cacheKey = buildCacheKey(bizLoc);

    // Check Redis cache
    try {
      const cached = await cacheManager.get<string[]>(`geo:${cacheKey}`);
      if (cached) {
        logger.info('geo_eligibility_cache_hit', { biz_location: bizLoc, programs: cached });
        return cached;
      }
    } catch (cacheErr: any) {
      logger.warn('geo_eligibility_cache_read_error', { error: cacheErr.message });
    }

    // LLM classification
    let regional: string[] = [];
    let method = 'llm';

    try {
      regional = await classifyWithLLM(bizLoc);
    } catch (llmErr: any) {
      logger.warn('geo_eligibility_llm_failed', { error: llmErr.message, biz_location: bizLoc });
      // Fallback to keyword matching
      regional = keywordFallback(bizLoc);
      method = 'keyword_fallback';
    }

    const programs = [...new Set([...GLOBAL_PROGRAMS, ...regional])];

    logger.info('geo_eligibility_resolved', {
      biz_location: bizLoc,
      regional,
      programs,
      method,
    });

    // Cache result
    try {
      await cacheManager.set(`geo:${cacheKey}`, programs, CACHE_TTL_SECONDS);
    } catch (cacheErr: any) {
      logger.warn('geo_eligibility_cache_write_error', { error: cacheErr.message });
    }

    return programs;
  }
}

export const geographyEligibilityService = new GeographyEligibilityService();
