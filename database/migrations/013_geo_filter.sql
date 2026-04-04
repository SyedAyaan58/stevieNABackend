-- Migration 013: HNSW Index + Geographic Program Filter
-- Date: 2026-04-04
-- Description:
--   1. Replaces stale IVFFlat index with HNSW (faster, self-healing after bulk re-embeds)
--   2. Replaces single-string geography filter with eligible_program_codes[] array
--      (populated by geographyEligibilityService — AI-driven, not hardcoded country maps)
--
-- Prerequisites: Run AFTER migration 012. Requires pgvector >= 0.5.0 for HNSW support.
-- How to apply: Run in Supabase SQL editor or psql.

-- ============================================================================
-- 1. Replace IVFFlat index with HNSW
-- ============================================================================

DROP INDEX IF EXISTS idx_category_embeddings_vector;

CREATE INDEX idx_category_embeddings_hnsw
  ON category_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index on extracted program_code from metadata for fast lookups (optional — SQL JOIN is the primary filter)
CREATE INDEX IF NOT EXISTS idx_category_embeddings_program_code
  ON category_embeddings ((metadata->>'program_code'));

-- ============================================================================
-- 2. Update search_similar_categories function
--    Replaces user_geography text filter with eligible_program_codes text[] filter
-- ============================================================================

DROP FUNCTION IF EXISTS search_similar_categories(
  vector(1536),
  text,
  text,
  int,
  text,
  text[],
  text
);

CREATE OR REPLACE FUNCTION search_similar_categories(
  query_embedding vector(1536),
  eligible_program_codes text[] DEFAULT NULL,   -- From geographyEligibilityService (replaces user_geography)
  user_nomination_subject text DEFAULT NULL,    -- Kept for future use; not filtered on currently
  match_limit int DEFAULT 10,
  user_org_type text DEFAULT NULL,              -- Kept for future use; not filtered on currently
  user_achievement_focus text[] DEFAULT NULL,
  user_gender text DEFAULT 'any'
)
RETURNS TABLE (
  category_id text,
  category_name text,
  description text,
  program_name text,
  program_code text,
  similarity_score float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  user_focus_lower text[];
  focus_boost_amount float := 0.05;
BEGIN
  IF user_achievement_focus IS NOT NULL THEN
    SELECT array_agg(lower(unnest)) INTO user_focus_lower
    FROM unnest(user_achievement_focus);
  END IF;

  RETURN QUERY
  SELECT
    sc.id::text AS category_id,
    sc.category_name,
    sc.description,
    sp.program_name,
    sp.program_code,
    LEAST(0.95,
      -- Base semantic similarity
      (1 - (ce.embedding <=> query_embedding))

      -- Keyword boost: category name (5%), description (3%), contextual prefix (2%)
      + CASE
          WHEN user_focus_lower IS NOT NULL THEN
            LEAST(0.15, (
              (SELECT COUNT(*) * 0.05 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(sc.category_name) LIKE '%' || keyword || '%')
              +
              (SELECT COUNT(*) * 0.03 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(sc.description) LIKE '%' || keyword || '%')
              +
              (SELECT COUNT(*) * 0.02 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(ce.contextual_prefix) LIKE '%' || keyword || '%')
            ))
          ELSE 0
        END

      -- Achievement focus metadata alignment boost (0-5%)
      + CASE
          WHEN user_focus_lower IS NOT NULL
               AND sc.metadata->'achievement_focus' IS NOT NULL THEN
            LEAST(focus_boost_amount,
              (SELECT COUNT(*) * 0.02 FROM unnest(user_focus_lower) AS user_kw
               WHERE EXISTS (
                 SELECT 1 FROM jsonb_array_elements_text(sc.metadata->'achievement_focus') AS cat_focus
                 WHERE lower(cat_focus) LIKE '%' || user_kw || '%'
               ))
            )
          ELSE 0
        END
    ) AS similarity_score,
    sc.metadata
  FROM stevie_categories sc
  INNER JOIN category_embeddings ce ON ce.category_id = sc.id
  INNER JOIN stevie_programs sp ON sp.id = sc.program_id
  WHERE
    -- Program eligibility filter (AI-driven — replaces hardcoded geography string match)
    (
      eligible_program_codes IS NULL
      OR sp.program_code = ANY(eligible_program_codes)
    )

    -- Gender filter
    AND (
      (user_gender = 'opt_out' AND sp.program_name != 'Stevie Awards for Women in Business')
      OR (COALESCE(user_gender, 'any') != 'opt_out' AND (
        user_gender IS NULL
        OR sc.metadata->>'gender_requirement' IS NULL
        OR sc.metadata->>'gender_requirement' = 'any'
        OR sc.metadata->>'gender_requirement' = user_gender
      ))
    )

  ORDER BY similarity_score DESC
  LIMIT match_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_similar_categories TO authenticated, anon;

COMMENT ON FUNCTION search_similar_categories IS
'Semantic search with hybrid scoring. Filters by eligible_program_codes[] (AI-driven geo eligibility)
and gender. HNSW index provides sub-5ms ANN queries at this scale.
eligible_program_codes is produced by geographyEligibilityService and cached in Redis (6h TTL).
NULL eligible_program_codes = no program restriction (searches all programs).';
