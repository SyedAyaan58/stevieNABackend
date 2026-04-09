-- Migration 017: RAG Retrieval Accuracy Fixes
-- Date: 2026-04-09
-- Fixes:
--   Fix 2: Return contextual_prefix so reranker gets full discriminative text
--   Fix 3: Add set_hnsw_iterative_scan() to prevent silent result drops under filtered HNSW
--   Fix 4: Soft-filter org_type and nomination_subject (penalty, not exclusion)

-- ============================================================================
-- FIX 3: HNSW iterative_scan helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION set_hnsw_iterative_scan()
RETURNS void AS $$
BEGIN
  SET LOCAL hnsw.iterative_scan = relaxed_order;
  SET LOCAL max_parallel_workers_per_gather = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_hnsw_iterative_scan IS
'Call before search_similar_categories to prevent silent result drops when HNSW is filtered.';

-- ============================================================================
-- FIXES 2 + 4: Updated search function
-- Must DROP first because return type changed (added contextual_prefix)
-- ============================================================================

DROP FUNCTION search_similar_categories(vector,text[],text,integer,text,text[],text);

CREATE OR REPLACE FUNCTION search_similar_categories(
  query_embedding vector(1536),
  eligible_program_codes text[] DEFAULT NULL,
  user_nomination_subject text DEFAULT NULL,
  match_limit int DEFAULT 10,
  user_org_type text DEFAULT NULL,
  user_achievement_focus text[] DEFAULT NULL,
  user_gender text DEFAULT NULL
)
RETURNS TABLE (
  category_id text,
  category_name text,
  description text,
  contextual_prefix text,        -- FIX 2: now returned for reranker
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
  effective_gender text;
BEGIN
  -- Normalise: treat 'any' or '' same as NULL (no restriction)
  effective_gender := CASE WHEN user_gender IN ('any', '') THEN NULL ELSE user_gender END;

  IF user_achievement_focus IS NOT NULL THEN
    SELECT array_agg(lower(unnest)) INTO user_focus_lower
    FROM unnest(user_achievement_focus);
  END IF;

  RETURN QUERY
  SELECT
    sc.id::text AS category_id,
    sc.category_name,
    sc.description,
    ce.contextual_prefix,          -- FIX 2: return contextual_prefix
    sp.program_name,
    sp.program_code,
    LEAST(0.95,
      (1 - (ce.embedding <=> query_embedding))

      -- Keyword boost via trigram-indexed LIKE (fast at scale)
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

      -- FIX 4: Soft-filter org_type (penalty, not exclusion)
      + CASE
          WHEN user_org_type IS NOT NULL
               AND sc.metadata->'applicable_org_types' IS NOT NULL
               AND jsonb_array_length(sc.metadata->'applicable_org_types') > 0
               AND NOT (sc.metadata->'applicable_org_types' @> to_jsonb(ARRAY[user_org_type]))
          THEN -0.15
          ELSE 0
        END

      -- FIX 4: Soft-filter nomination_subject (penalty, not exclusion)
      + CASE
          WHEN user_nomination_subject IS NOT NULL
               AND sc.metadata->>'nomination_subject_type' IS NOT NULL
               AND sc.metadata->>'nomination_subject_type' != user_nomination_subject
          THEN -0.10
          ELSE 0
        END
    ) AS similarity_score,
    sc.metadata
  FROM stevie_categories sc
  INNER JOIN category_embeddings ce ON ce.category_id = sc.id
  INNER JOIN stevie_programs sp ON sp.id = sc.program_id
  WHERE
    -- Program eligibility filter (hard — geography is binary)
    (
      eligible_program_codes IS NULL
      OR sp.program_code = ANY(eligible_program_codes)
    )

    -- Gender filter using pre-computed is_women_award boolean
    AND (
      CASE
        WHEN effective_gender = 'opt_out' THEN
          sc.is_women_award = false
        ELSE
          (
            sc.metadata->>'gender_requirement' IS NULL
            OR sc.metadata->>'gender_requirement' = 'any'
            OR sc.metadata->>'gender_requirement' = effective_gender
            OR effective_gender IS NULL
          )
      END
    )

  ORDER BY similarity_score DESC
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION search_similar_categories IS
'Semantic search with hybrid scoring. Migration 017 changes:
- Returns contextual_prefix for reranker (Fix 2)
- org_type and nomination_subject are soft penalties, not hard filters (Fix 4)
- Use set_hnsw_iterative_scan() before calling to prevent silent drops (Fix 3)';
