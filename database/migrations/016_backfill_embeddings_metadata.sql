-- Migration 016: Backfill category_embeddings.metadata
-- Date: 2026-04-04
-- Problem: category_embeddings.metadata was never populated — always {}.
--          The index on metadata->>'program_code' (migration 013) was useless.
--          Node.js reads metadata.category_types from the RPC result, but that
--          field only existed on stevie_categories.metadata, not the embeddings row.
--
-- Fix: One UPDATE that denormalizes program_code + category_types from their
--      source tables into category_embeddings.metadata so:
--      1. The program_code index actually fires on program eligibility lookups
--      2. category_types is returned directly on the embeddings row (no extra join)
--      3. Future Pinecone migration would have all metadata ready on the vector

UPDATE category_embeddings ce
SET metadata = jsonb_build_object(
  'program_code',    sp.program_code,
  'category_types',  COALESCE(sc.metadata -> 'category_types', '[]'::jsonb),
  'is_women_award',  (sp.program_code = 'WOMEN')
)
FROM stevie_categories sc
INNER JOIN stevie_programs sp ON sp.id = sc.program_id
WHERE ce.category_id = sc.id;

-- Verify
SELECT
  COUNT(*) AS total_embeddings,
  COUNT(*) FILTER (WHERE metadata->>'program_code' IS NOT NULL) AS has_program_code,
  COUNT(*) FILTER (WHERE metadata->'category_types' != '[]'::jsonb) AS has_category_types
FROM category_embeddings;
