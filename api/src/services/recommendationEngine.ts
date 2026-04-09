import { sqlFilterEngine, SQLFilterEngine } from './sqlFilterEngine';
import { embeddingManager, EmbeddingManager } from './embeddingManager';
import { pineconeClient } from './pineconeClient';
import { geographyEligibilityService } from './geographyEligibilityService';
import { getSupabaseClient } from '../config/supabase';
import logger from '../utils/logger';

interface UserContext {
  // Location fields (new — geo eligibility)
  user_location?: string;
  business_location?: string;
  // Legacy field kept for backward compat during transition
  geography?: string;
  nomination_scope?: string;
  organization_name?: string;
  job_title?: string;
  org_type?: string;
  org_size?: string;
  nomination_subject?: string;
  description?: string;
  achievement_focus?: string[];
  tech_orientation?: string;
  operating_scope?: string;
  gender?: string;
}

interface Recommendation {
  category_id: string;
  category_name: string;
  description: string;
  program_name: string;
  program_code: string;
  similarity_score: number;
  match_reasons?: string[];
  geographic_scope: string[];
  applicable_org_types: string[];
  applicable_org_sizes: string[];
  nomination_subject_type: string;
  achievement_focus: string[];
}

export class RecommendationEngine {
  private sqlFilter: SQLFilterEngine;
  private embeddingMgr: EmbeddingManager;

  constructor(sqlFilter?: SQLFilterEngine, embeddingMgr?: EmbeddingManager) {
    this.sqlFilter = sqlFilter || sqlFilterEngine;
    this.embeddingMgr = embeddingMgr || embeddingManager;
  }

  private validateContextCompleteness(context: UserContext): boolean {
    const criticalFields = ['nomination_subject', 'description'];
    for (const field of criticalFields) {
      const value = context[field as keyof UserContext];
      if (value === undefined || value === null || value === '') {
        logger.warn('incomplete_context_critical', { missing_field: field });
        return false;
      }
    }
    return true;
  }

  async generateRecommendations(
    context: UserContext,
    options: { limit?: number } = {}
  ): Promise<Recommendation[]> {
    const { limit = 10 } = options;

    logger.info('generating_recommendations', {
      user_location: context.user_location,
      business_location: context.business_location,
      org_type: context.org_type,
      nomination_subject: context.nomination_subject,
      limit,
    });

    try {
      if (!this.validateContextCompleteness(context)) {
        throw new Error('UserContext is incomplete. Cannot generate recommendations.');
      }

      // Step 1: Run Multi-HyDE + intent detection + geo eligibility in parallel (B7 + Fix 5)
      const userLocation = context.user_location || context.geography || '';
      const bizLocation = context.business_location || userLocation;

      const [multiHydeResult, detectedCategoryTypesResult, eligibleProgramCodes] =
        await Promise.all([
          this.embeddingMgr.generateMultiHyDE(context),
          this.embeddingMgr.detectCategoryTypes(context).catch((err: any) => {
            logger.warn('intent_detection_error_skipping', { error: err.message });
            return undefined;
          }),
          geographyEligibilityService.getEligiblePrograms(userLocation, bizLocation).catch((err: any) => {
            logger.warn('geo_eligibility_error_skipping', { error: err.message });
            return undefined;
          }),
        ]);

      const { embeddings: hydeEmbeddings, expandedQuery } = multiHydeResult;
      const detectedCategoryTypes = detectedCategoryTypesResult;

      logger.info('parallel_step_complete', {
        hyde_count: hydeEmbeddings.length,
        intent_types: detectedCategoryTypes || 'none',
        eligible_programs: eligibleProgramCodes || 'all',
      });

      // Step 2: Fix 5 — Multi-HyDE vector search + RRF merge
      // Run parallel searches (one per HyDE angle), merge with Reciprocal Rank Fusion
      const searchLimit = 50; // per-query limit; RRF merges and deduplicates
      const searchResults = await Promise.all(
        hydeEmbeddings.map(emb =>
          this.embeddingMgr.performSimilaritySearch(
            emb,
            eligibleProgramCodes || undefined,
            searchLimit,
            context.achievement_focus,
            context.gender
          )
        )
      );

      // RRF merge: categories ranked highly across multiple angles score higher
      const similarityResults = reciprocalRankFusion(searchResults).slice(0, Math.min(limit * 10, 150));

      logger.info('similarity_search_complete', {
        per_query_counts: searchResults.map(r => r.length),
        merged_count: similarityResults.length,
      });

      // Step 3: Rerank using Pinecone cross-encoder with HyDE-expanded query (B3)
      let rerankedResults = similarityResults;
      if (similarityResults.length > 1 && expandedQuery) {
        try {
          const rerankDocs = similarityResults.map(r => `${r.contextual_prefix || ''} ${r.category_name}. ${r.description}`);
          const rerankIndices = await pineconeClient.rerank(expandedQuery, rerankDocs, limit);
          rerankedResults = rerankIndices.map(i => similarityResults[i]);
          logger.info('rerank_complete', {
            input_count: similarityResults.length,
            output_count: rerankedResults.length,
          });
        } catch (rerankError: any) {
          logger.warn('rerank_failed_using_vector_order', { error: rerankError.message });
          rerankedResults = similarityResults.slice(0, limit);
        }
      } else {
        rerankedResults = similarityResults.slice(0, limit);
      }

      // Step 4: Min similarity threshold
      const minScore = parseFloat(process.env.MIN_SIMILARITY_SCORE || '0.35');
      let filtered = rerankedResults;
      if (minScore > 0) {
        filtered = rerankedResults.filter(r => r.similarity_score >= minScore);
        if (filtered.length < rerankedResults.length) {
          logger.info('low_similarity_filtered', {
            before: rerankedResults.length,
            after: filtered.length,
            min_score: minScore,
          });
        }
      }

      // Step 5: Intent boost on SimilarityResult (before dedup/map) — checks metadata.category_types (B2)
      if (detectedCategoryTypes && detectedCategoryTypes.length > 0) {
        const womenIntent = detectedCategoryTypes.some(t => t === 'women_empowerment');
        filtered = filtered.map(result => {
          const catTypes: string[] = result.metadata?.category_types || [];
          const matchesCatType = detectedCategoryTypes.some(t =>
            catTypes.some(c => c.toLowerCase() === t.toLowerCase())
          );
          // Also boost WOMEN program directly when women_empowerment intent is detected
          const matchesWomenProgram = womenIntent && result.program_code === 'WOMEN';
          const matchesIntent = matchesCatType || matchesWomenProgram;
          return {
            ...result,
            similarity_score: matchesIntent
              ? Math.min(0.95, result.similarity_score + 0.08)
              : result.similarity_score,
          };
        });
        filtered.sort((a, b) => b.similarity_score - a.similarity_score);
        logger.info('intent_boost_applied', { detected_types: detectedCategoryTypes });
      }

      // Step 6: Dedup by category_id and map to Recommendation
      const seen = new Set<string>();
      let recommendations: Recommendation[] = filtered
        .filter(result => {
          if (seen.has(result.category_id)) return false;
          seen.add(result.category_id);
          return true;
        })
        .map(result => ({
          category_id: result.category_id,
          category_name: result.category_name,
          description: result.description,
          program_name: result.program_name,
          program_code: result.program_code,
          similarity_score: result.similarity_score,
          geographic_scope: result.metadata?.geographic_scope || result.geographic_scope,
          applicable_org_types: result.metadata?.applicable_org_types || result.applicable_org_types,
          applicable_org_sizes: result.metadata?.applicable_org_sizes || result.applicable_org_sizes,
          nomination_subject_type: result.metadata?.nomination_subject_type || result.nomination_subject_type,
          achievement_focus: result.metadata?.achievement_focus || result.achievement_focus,
        }));

      logger.info('recommendations_generated', { total_recommendations: recommendations.length });
      return recommendations;
    } catch (error: any) {
      logger.error('recommendation_generation_error', { error: error.message });
      throw error;
    }
  }

  async getRecommendationStats(context: UserContext): Promise<{
    eligible_categories: number;
    total_categories: number;
    filter_rate: number;
  }> {
    try {
      const supabase = getSupabaseClient();
      const { count: totalCount } = await supabase
        .from('stevie_categories')
        .select('*', { count: 'exact', head: true });

      const filteredCategories = await this.sqlFilter.filterCategories({
        geography: context.geography,
        org_type: context.org_type,
        org_size: context.org_size,
        nomination_subject: context.nomination_subject,
        achievement_focus: context.achievement_focus,
      });

      const eligibleCount = filteredCategories.length;
      const filterRate = totalCount ? (eligibleCount / totalCount) * 100 : 0;

      return {
        eligible_categories: eligibleCount,
        total_categories: totalCount || 0,
        filter_rate: Math.round(filterRate * 100) / 100,
      };
    } catch (error: any) {
      logger.error('stats_generation_error', { error: error.message });
      throw error;
    }
  }
}

/**
 * Fix 5: Reciprocal Rank Fusion — merges multiple ranked result lists.
 * Categories that rank highly across multiple HyDE angles get boosted.
 * RRF_score(category) = Σ 1 / (k + rank_in_list_i), k=60
 *
 * IMPORTANT: RRF scores are used for ORDERING only. The original cosine
 * similarity_score is preserved for display (confidence %). Raw RRF values
 * are tiny (0.01–0.05) and would show as "4% confidence" on the frontend.
 */
function reciprocalRankFusion(
  rankLists: Array<Array<{ category_id: string; similarity_score: number; [key: string]: any }>>,
  k: number = 60
): any[] {
  const rrfScores = new Map<string, number>();
  const bestItems = new Map<string, any>();

  for (const list of rankLists) {
    list.forEach((item, rank) => {
      const prev = rrfScores.get(item.category_id) ?? 0;
      rrfScores.set(item.category_id, prev + 1 / (k + rank + 1));
      // Keep the item with the highest ORIGINAL similarity score for display
      if (!bestItems.has(item.category_id) ||
          item.similarity_score > (bestItems.get(item.category_id)?.similarity_score ?? 0)) {
        bestItems.set(item.category_id, item);
      }
    });
  }

  // Sort by RRF score (ordering), but return original similarity_score (display)
  return [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => bestItems.get(id)!);
}

export const recommendationEngine = new RecommendationEngine();
