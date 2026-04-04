-- Migration 016: Backfill category_embeddings.metadata
-- Date: 2026-04-04
-- Problem: category_embeddings.metadata was never populated — always {}.
--          The index on metadata->>'program_code' (migration 013) was useless.
--          Node.js reads metadata.category_types from the RPC result, but that
--          field only existed on stevie_categories.metadata, not the embeddings row.
--
-- Fix: One UPDATE that denormalizes all key filter fields into category_embeddings.metadata:
--   - program_code, category_types, is_women_award
--   - geographic_scope: global programs (IBA, WOMEN, TECH, EMPLOYERS, SALES) get ['Global']
--     so they are never excluded by a geography filter — open to everyone worldwide
--   - applicable_org_types, applicable_org_sizes, nomination_subject_type
--
-- Geographic scope logic:
--   Global programs  → ['Global']  (always eligible regardless of location)
--   ABA              → ['USA']
--   MENA             → ['Middle East', 'North Africa']
--   APAC             → ['Asia', 'Pacific']
--   GERMAN           → ['Germany', 'Austria', 'Switzerland']

UPDATE category_embeddings ce
SET metadata = jsonb_build_object(
  -- Program identification
  'program_code',            sp.program_code,
  'is_women_award',          (sp.program_code = 'WOMEN'),

  -- Intent classification (populated by backfill-category-types.ts)
  'category_types',          COALESCE(sc.metadata -> 'category_types', '[]'::jsonb),

  -- Geographic scope — global programs are open worldwide
  'geographic_scope',        CASE sp.program_code
                               WHEN 'IBA'       THEN '["Global"]'::jsonb
                               WHEN 'WOMEN'     THEN '["Global"]'::jsonb
                               WHEN 'TECH'      THEN '["Global"]'::jsonb
                               WHEN 'EMPLOYERS' THEN '["Global"]'::jsonb
                               WHEN 'SALES'     THEN '["Global"]'::jsonb
                               WHEN 'ABA'       THEN '["USA"]'::jsonb
                               WHEN 'MENA'      THEN '["Middle East", "North Africa"]'::jsonb
                               WHEN 'APAC'      THEN '["Asia", "Pacific"]'::jsonb
                               WHEN 'GERMAN'    THEN '["Germany", "Austria", "Switzerland"]'::jsonb
                               ELSE COALESCE(sc.metadata -> 'geographic_scope', '["Global"]'::jsonb)
                             END,

  -- Org + nomination filters (sourced from stevie_categories columns)
  'applicable_org_types',    COALESCE(
                               sc.metadata -> 'applicable_org_types',
                               to_jsonb(sc.applicable_org_types)
                             ),
  'applicable_org_sizes',    COALESCE(
                               sc.metadata -> 'applicable_org_sizes',
                               to_jsonb(sc.applicable_org_sizes)
                             ),
  'nomination_subject_type', COALESCE(
                               sc.metadata ->> 'nomination_subject_type',
                               sc.nomination_subject_type
                             )
)
FROM stevie_categories sc
INNER JOIN stevie_programs sp ON sp.id = sc.program_id
WHERE ce.category_id = sc.id;

-- Verify — all rows should show populated
SELECT
  COUNT(*)                                                              AS total_embeddings,
  COUNT(*) FILTER (WHERE metadata->>'program_code' IS NOT NULL)        AS has_program_code,
  COUNT(*) FILTER (WHERE metadata->'category_types' != '[]'::jsonb)   AS has_category_types,
  COUNT(*) FILTER (WHERE metadata->'geographic_scope' != '[]'::jsonb) AS has_geographic_scope,
  -- Show breakdown by program
  jsonb_object_agg(
    metadata->>'program_code',
    metadata->'geographic_scope'
  ) FILTER (WHERE metadata->>'program_code' IS NOT NULL) AS sample_geo_per_program
FROM (
  SELECT DISTINCT ON (metadata->>'program_code') metadata
  FROM category_embeddings
  ORDER BY metadata->>'program_code'
) sample;
