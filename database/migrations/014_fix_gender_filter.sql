-- Migration 014: Fix gender filter — include all categories when no gender restriction
-- Date: 2026-04-04
-- Problem: Passing user_gender='any' (instead of NULL) excluded categories with
--          gender_requirement='female' (Stevie Awards for Women in Business).
--          Node.js now passes NULL when no preference, but this migration also hardens
--          the SQL so 'any' is treated identically to NULL.

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
  -- Normalise: treat 'any' same as NULL (no restriction)
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
    sp.program_name,
    sp.program_code,
    LEAST(0.95,
      (1 - (ce.embedding <=> query_embedding))

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
    ) AS similarity_score,
    sc.metadata
  FROM stevie_categories sc
  INNER JOIN category_embeddings ce ON ce.category_id = sc.id
  INNER JOIN stevie_programs sp ON sp.id = sc.program_id
  WHERE
    -- Program eligibility filter
    (
      eligible_program_codes IS NULL
      OR sp.program_code = ANY(eligible_program_codes)
    )

    -- Gender filter:
    --   opt_out  → exclude Women in Business program entirely
    --   female   → include all categories (gender-neutral + female-only)
    --   NULL     → include all categories (no restriction)
    AND (
      CASE
        WHEN effective_gender = 'opt_out' THEN
          sp.program_name != 'Stevie Awards for Women in Business'
        ELSE
          -- female or NULL: include category if no gender_requirement OR matches
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

GRANT EXECUTE ON FUNCTION search_similar_categories TO authenticated, anon;

COMMENT ON FUNCTION search_similar_categories IS
'Semantic search with hybrid scoring. Fixes gender filter: NULL and "any" both mean no restriction
(include all categories, including Women in Business). "opt_out" excludes Women in Business entirely.
"female" includes all gender-neutral categories plus female-only ones.';
