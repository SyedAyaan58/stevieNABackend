-- Migration 012: Remove hardcoded Technology Excellence program bias
-- Date: 2026-04-04
-- Description: Removes the arbitrary +5% score boost that was hardcoded for the
--   "Stevie Awards for Technology Excellence" program. Intent detection (re-enabled
--   as a soft post-retrieval boost) now handles program relevance correctly for all
--   programs based on actual user context — not a hardcoded favoring of one program.

CREATE OR REPLACE FUNCTION search_similar_categories(
  query_embedding vector(1536),
  user_geography text DEFAULT NULL,
  user_nomination_subject text DEFAULT NULL,
  match_limit int DEFAULT 10,
  user_org_type text DEFAULT NULL,
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
  keyword_boost_amount float := 0.15;
  focus_boost_amount float := 0.05;
BEGIN
  IF user_achievement_focus IS NOT NULL THEN
    SELECT array_agg(lower(unnest)) INTO user_focus_lower
    FROM unnest(user_achievement_focus);
  END IF;

  RETURN QUERY
  SELECT
    sc.id::text as category_id,
    sc.category_name,
    sc.description,
    sp.program_name,
    sp.program_code,
    LEAST(0.95,
      -- Base semantic similarity
      (1 - (ce.embedding <=> query_embedding))

      -- Keyword matching boost against category name, description, and contextual prefix (0-15%)
      + CASE
          WHEN user_focus_lower IS NOT NULL THEN
            (
              (SELECT COUNT(*) * 0.05 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(sc.category_name) LIKE '%' || keyword || '%')
              +
              (SELECT COUNT(*) * 0.03 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(sc.description) LIKE '%' || keyword || '%')
              +
              (SELECT COUNT(*) * 0.02 FROM unnest(user_focus_lower) AS keyword
               WHERE lower(ce.contextual_prefix) LIKE '%' || keyword || '%')
            )
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
    (
      user_geography IS NULL
      OR sc.metadata->'geographic_scope' @> to_jsonb(ARRAY[user_geography])
    )
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
'Semantic search with hybrid scoring. Filters by geography and gender only.
Keyword boosts against category name, description, and contextual_prefix.
Program-level relevance is handled by the application-layer intent boost, not SQL.';
