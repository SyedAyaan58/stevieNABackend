/**
 * Geography Eligibility Service
 *
 * Determines which Stevie Award programs a user is eligible for based on
 * their business/organization location.
 *
 * Design:
 * - Eligibility is based on BUSINESS location, not personal location
 * - Global programs (IBA, WOMEN, TECH, EMPLOYERS, SALES) are always included
 * - Static lookup: country/region → program codes (no LLM call, zero latency)
 * - Results are Redis-cached for 24h as a warm layer (survives restarts)
 * - On any failure, returns all Global programs (graceful degradation)
 *
 * Why static instead of LLM:
 * - 9 programs with fixed geographic scopes that never change
 * - LLM added 300–1000ms latency + cache miss risk on free-text location variants
 * - Static map is instant, deterministic, and has zero per-call cost
 */

import crypto from 'crypto';
import { cacheManager } from './cacheManager';
import logger from '../utils/logger';

const CACHE_TTL_SECONDS = 24 * 3600; // 24h — scopes never change
const CACHE_KEY_VERSION = 'geo:v2:';  // v2 = static map (bump if map changes)

const GLOBAL_PROGRAMS = ['IBA', 'WOMEN', 'TECH', 'EMPLOYERS', 'SALES'];

// ---------------------------------------------------------------------------
// Static country → regional program map
// Covers all countries likely to appear as business locations.
// Global programs are always appended — they never need to be in this map.
// ---------------------------------------------------------------------------

/** Regional programs keyed by normalized country/region string fragments. */
const REGIONAL_MAP: Array<{ patterns: string[]; programs: string[] }> = [
  // USA / Canada / Americas → ABA (American Business Awards accepts USA + international entries via IBA)
  {
    patterns: ['united states', 'usa', 'u.s.a', 'u.s.', 'america', 'canada', 'mexico',
               'brazil', 'argentina', 'colombia', 'chile', 'peru', 'venezuela',
               'puerto rico', 'caribbean'],
    programs: ['ABA'],
  },

  // APAC — Asia & Pacific
  {
    patterns: [
      'india', 'china', 'japan', 'south korea', 'korea', 'singapore', 'hong kong',
      'taiwan', 'thailand', 'vietnam', 'indonesia', 'malaysia', 'philippines',
      'bangladesh', 'sri lanka', 'pakistan', 'nepal', 'myanmar', 'cambodia',
      'australia', 'new zealand', 'fiji', 'papua new guinea',
      'asia', 'pacific', 'apac',
    ],
    programs: ['APAC'],
  },

  // MENA — Middle East & North Africa
  {
    patterns: [
      'saudi arabia', 'ksa', 'uae', 'united arab emirates', 'dubai', 'abu dhabi',
      'qatar', 'kuwait', 'bahrain', 'oman', 'jordan', 'lebanon', 'iraq', 'iran',
      'israel', 'turkey', 'egypt', 'morocco', 'algeria', 'tunisia', 'libya',
      'sudan', 'middle east', 'north africa', 'mena',
    ],
    programs: ['MENA'],
  },

  // GERMAN — Germany, Austria, Switzerland (DACH)
  {
    patterns: ['germany', 'deutschland', 'austria', 'österreich', 'switzerland', 'schweiz', 'dach'],
    programs: ['GERMAN'],
  },

  // Rest of Europe → no regional Stevie program (only Global programs apply)
  // Intentionally not listed — they get Global only, which is correct.
];

// ---------------------------------------------------------------------------
// Normalise location string for consistent matching
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return (s || '').toLowerCase().trim()
    .replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a business location string to eligible Stevie program codes.
 * Always includes all Global programs.
 * Pure function — no I/O, instant.
 */
function resolvePrograms(bizLocation: string): string[] {
  const loc = normalise(bizLocation);
  if (!loc) return [...GLOBAL_PROGRAMS];

  const regional: string[] = [];

  for (const entry of REGIONAL_MAP) {
    const matched = entry.patterns.some(p => loc.includes(p));
    if (matched) {
      for (const prog of entry.programs) {
        if (!regional.includes(prog)) regional.push(prog);
      }
    }
  }

  // Always include Global programs — deduplicate
  return [...new Set([...GLOBAL_PROGRAMS, ...regional])];
}

function buildCacheKey(bizLocation: string): string {
  const raw = `${CACHE_KEY_VERSION}${normalise(bizLocation)}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GeographyEligibilityService {
  /**
   * Returns the list of Stevie program codes the user is eligible for.
   * Uses static lookup (instant, no LLM) with Redis warm cache (24h TTL).
   * Falls back to Global-only programs on any error.
   */
  async getEligiblePrograms(
    userLocation: string,
    businessLocation: string
  ): Promise<string[]> {
    // Eligibility is based on BUSINESS location
    const bizLoc = (businessLocation || userLocation || '').trim();

    if (!bizLoc) {
      logger.info('geo_eligibility_no_location', { result: GLOBAL_PROGRAMS });
      return [...GLOBAL_PROGRAMS];
    }

    const cacheKey = buildCacheKey(bizLoc);

    // Check Redis cache (warm layer — avoids repeated log noise, not needed for correctness)
    try {
      const cached = await cacheManager.get<string[]>(`geo:${cacheKey}`);
      if (cached) {
        logger.info('geo_eligibility_cache_hit', { biz_location: bizLoc, programs: cached });
        return cached;
      }
    } catch (cacheErr: any) {
      logger.warn('geo_eligibility_cache_read_error', { error: cacheErr.message });
    }

    // Static lookup — instant, no LLM
    try {
      const programs = resolvePrograms(bizLoc);

      logger.info('geo_eligibility_resolved', {
        user_location: userLocation,
        biz_location: bizLoc,
        programs,
        method: 'static_map',
      });

      // Cache result
      try {
        await cacheManager.set(`geo:${cacheKey}`, programs, CACHE_TTL_SECONDS);
      } catch (cacheErr: any) {
        logger.warn('geo_eligibility_cache_write_error', { error: cacheErr.message });
      }

      return programs;
    } catch (error: any) {
      logger.warn('geo_eligibility_static_map_failed', {
        biz_location: bizLoc,
        error: error.message,
      });
      return [...GLOBAL_PROGRAMS];
    }
  }
}

export const geographyEligibilityService = new GeographyEligibilityService();
