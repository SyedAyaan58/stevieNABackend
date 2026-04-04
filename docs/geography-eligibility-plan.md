# AI-Driven Geography Eligibility System — Plan

> Written: April 2026 | Based on current codebase + 2024-2025 production RAG research

---

## What We're Replacing

`api/src/utils/geographyMapper.ts` — a hardcoded static lookup table with ~30 countries mapped
to fixed region strings (India → `Asia-Pacific`, UAE → `MENA`, etc.). It fails on:
- Any country not in the list (UK, Brazil, France, Nigeria, Mexico — all return nothing)
- Cities (user types "Mumbai" or "Dubai" — no match)
- Business location vs. user location being different countries
- Edge cases: someone in the USA with a business registered in Singapore
- New Stevie programs added to the DB — requires code changes to stay correct

**Goal:** Replace this entirely with an LLM classification pipeline that:
1. Takes `userLocation` + `businessLocation` as plain-text inputs
2. Asks gpt-4o-mini (via structured output) which Stevie programs the user is eligible for
3. Loads program geographic_scope data **from the DB at runtime** — not hardcoded
4. Caches the result in Redis by (userLocation + businessLocation) hash
5. Uses the result to pre-filter the vector similarity search via SQL

---

## Programs and Their Geographic Scope (from DB)

| Program Code | Name | Geographic Scope | Restriction |
|---|---|---|---|
| ABA | American Business Awards | `["USA"]` | USA only |
| IBA | International Business Awards | `["Global"]` | Open |
| WOMEN | Stevie Awards for Women | `["Global"]` | Open |
| MENA | Middle East & North Africa Stevie | `["Middle East", "North Africa"]` | MENA only |
| APAC | Asia-Pacific Stevie Awards | `["Asia", "Pacific"]` | APAC only |
| TECH | Stevie Awards for Technology | `["Global"]` | Open |
| GERMAN | German Stevie Awards | `["Germany", "Austria", "Switzerland"]` | DACH only |
| EMPLOYERS | Stevie Awards for Great Employers | `["Global"]` | Open |
| SALES | Stevie Awards for Sales & CS | `["Global"]` | Open |

**Note:** These values are fetched live from `stevie_programs.geographic_scope` (JSONB column).
No program data is hardcoded in the new system.

---

## Architecture

```
User input: userLocation="Mumbai, India", businessLocation="Singapore"
                            │
                            ▼
         ┌─────────────────────────────────┐
         │   geographyEligibilityService   │
         │                                 │
         │  1. Check Redis cache            │
         │     key: sha256(user+biz loc)   │
         │     hit → return cached result  │
         │                                 │
         │  2. Fetch programs from DB      │
         │     stevie_programs.geo_scope   │
         │                                 │
         │  3. Call gpt-4o-mini            │
         │     structured output (JSON)    │
         │     → eligible_program_codes[]  │
         │                                 │
         │  4. Cache result (TTL: 6h)      │
         │  5. Return eligible codes       │
         └─────────────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────┐
         │     recommendationEngine        │
         │                                 │
         │  performSimilaritySearch(       │
         │    userEmbedding,               │
         │    eligibleProgramCodes,  ← NEW │
         │    limit                        │
         │  )                              │
         └─────────────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────┐
         │   SQL: search_similar_categories│
         │                                 │
         │  WHERE ce.metadata->>'prog_code'│
         │    = ANY(eligible_program_codes)│
         │                                 │
         │  (pre-filter inside ANN query)  │
         └─────────────────────────────────┘
```

---

## Step 1 — Metadata in `category_embeddings`

We need each row in `category_embeddings` to carry the program code so SQL can filter on it
without a JOIN. We upsert this during the re-embedding script.

**Target schema for `category_embeddings.metadata`:**
```json
{
  "program_code": "APAC",
  "program_name": "Asia-Pacific Stevie Awards",
  "geographic_scope": ["Asia", "Pacific"],
  "is_geo_restricted": true
}
```

- `program_code`: used in the SQL WHERE clause for pre-filtering
- `geographic_scope`: stored for reference/debugging
- `is_geo_restricted`: boolean — `false` for Global programs, `true` for region-locked

**Where this gets populated:** `reembed-categories.ts` already upserts `metadata` — we extend it
to include program metadata on every upsert.

**What we do NOT do:** We do not store eligibility decisions (which users are eligible) in the
embedding metadata. Eligibility is computed per-request and used as a SQL filter parameter.

---

## Step 2 — SQL Migration (013)

Add a `program_code` GIN index on `category_embeddings.metadata` for fast filtering.
Update `search_similar_categories` to accept an `eligible_program_codes` parameter.

```sql
-- Migration 013_geo_filter.sql

-- Index for fast program_code lookups in JSONB metadata
CREATE INDEX IF NOT EXISTS idx_category_embeddings_program_code
  ON category_embeddings USING gin ((metadata->>'program_code') gin_trgm_ops);

-- Or simpler B-tree on extracted text column (more efficient for equality):
CREATE INDEX IF NOT EXISTS idx_category_embeddings_program_code_btree
  ON category_embeddings ((metadata->>'program_code'));

-- Updated function signature (replaces existing search_similar_categories):
CREATE OR REPLACE FUNCTION search_similar_categories(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.0,
  filter_geographies text[] DEFAULT NULL,     -- KEPT for backward compat (may remove later)
  eligible_program_codes text[] DEFAULT NULL  -- NEW: from geographyEligibilityService
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  similarity float,
  program_code text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id AS category_id,
    sc.category_name,
    (1 - (ce.embedding <=> query_embedding))::float AS similarity,
    sp.program_code,
    ce.metadata
  FROM category_embeddings ce
  JOIN stevie_categories sc ON sc.id = ce.category_id
  JOIN stevie_programs sp ON sp.id = sc.program_id
  WHERE
    -- Geo filter: if eligible_program_codes is provided, restrict to those programs
    (
      eligible_program_codes IS NULL
      OR sp.program_code = ANY(eligible_program_codes)
    )
    AND (1 - (ce.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Design decision — pre-filter, not post-filter:**
We filter inside the SQL query (pre-retrieval) rather than fetching all results and filtering
afterward. Research (2024-2025) confirms this is correct for our scale:
- We have 9 programs total, 3-6 are typically eligible for any user
- Pre-filtering retains 60-90% of the index — HNSW doesn't degrade at this selectivity
- Post-filtering would require fetching 3x results to compensate for filtered-out rows

---

## Step 3 — `geographyEligibilityService.ts` (NEW FILE)

**Location:** `api/src/services/geographyEligibilityService.ts`

**What it does:**
1. Accepts `userLocation: string` and `businessLocation: string`
2. Generates a Redis cache key: `sha256("geo:v1:" + userLocation + "|" + businessLocation)`
3. On cache miss: fetches all programs from `stevie_programs` (id, program_code, geographic_scope)
4. Calls `openaiService.chatCompletion()` with structured output (JSON schema enforced)
5. Parses and validates the response
6. Caches in Redis with 6-hour TTL
7. Returns `string[]` of eligible program codes

**LLM Prompt Design:**

System prompt:
```
You are a geographic eligibility classifier for the Stevie Awards nomination system.

Given a user's personal location and their business/organization location, determine which 
award programs they are eligible for.

Rules:
- A user is eligible for a program if their BUSINESS location falls within the program's 
  geographic scope OR if the program is globally open.
- Personal location (where the user lives) does NOT determine program eligibility — 
  only the business/organization location does.
- "Global" programs are always eligible for everyone.
- For regional programs, use your knowledge of world geography to determine if the 
  business location falls within the specified scope regions.
- If business location is ambiguous or unknown, include only Global programs.

Respond ONLY with valid JSON matching this exact schema — no explanation.
```

User prompt (dynamically built from DB data):
```
User personal location: {userLocation}
Business/organization location: {businessLocation}

Available programs:
{programs.map(p => `- ${p.program_code}: geographic_scope = ${JSON.stringify(p.geographic_scope)}`).join('\n')}

Which program codes is this user eligible for?
```

**Structured output schema:**
```json
{
  "type": "object",
  "properties": {
    "eligible_program_codes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Program codes the user is eligible for"
    },
    "reasoning": {
      "type": "string",
      "description": "One sentence explaining the eligibility decision"
    }
  },
  "required": ["eligible_program_codes", "reasoning"]
}
```

**Fallback behavior:**
- If LLM call fails → return all Global programs only (IBA, WOMEN, TECH, EMPLOYERS, SALES)
- If Redis is unavailable → skip caching, proceed with fresh LLM call
- Never crash the recommendation pipeline — geo eligibility degrades gracefully

**Redis TTL:** 6 hours
- Geographic eligibility rarely changes within a session or even a day
- If user changes their business location, they start a new session (new cache key)

---

## Step 4 — Update `reembed-categories.ts`

The re-embedding script already runs and upserts to `category_embeddings`. We extend the upsert
payload to include program metadata in the `metadata` JSONB column.

**Change in upsert block:**
```typescript
// In the upsert payload, add:
metadata: {
  program_code: cat.stevie_programs?.program_code || null,
  program_name: cat.stevie_programs?.program_name || null,
  geographic_scope: cat.stevie_programs?.geographic_scope || [],
  is_geo_restricted: !((cat.stevie_programs?.geographic_scope || []).includes('Global')),
}
```

This requires fetching `geographic_scope` from `stevie_programs` in the SELECT query — it already
joins `stevie_programs`, we just add `geographic_scope` to the join.

**Note:** This re-embed must be re-run after the metadata schema is finalized. The script is
idempotent (upsert) so re-running is safe.

---

## Step 5 — Wire into `recommendationEngine.ts`

**Current flow:**
```typescript
const userGeographies = GeographyMapper.mapGeography(context.geography, 'both');
const results = await embeddingMgr.performSimilaritySearch(userEmbedding, userGeographies, ...);
```

**New flow:**
```typescript
// Run geo eligibility + embedding in parallel
const [eligibleProgramCodes, userEmbedding] = await Promise.all([
  geographyEligibilityService.getEligiblePrograms(
    context.userLocation,
    context.businessLocation
  ),
  embeddingMgr.generateUserEmbedding(context),
]);

const results = await embeddingMgr.performSimilaritySearch(
  userEmbedding,
  eligibleProgramCodes,  // replaces userGeographies
  limit
);
```

`GeographyMapper` is deleted entirely. No imports, no references remain.

---

## Step 6 — Update `performSimilaritySearch` in `embeddingManager.ts`

**Current signature:**
```typescript
async performSimilaritySearch(
  userEmbedding: number[],
  userGeographies?: string[],
  limit: number = 10,
  userAchievementFocus?: string[],
  userGender?: string
): Promise<SimilarityResult[]>
```

**New signature:**
```typescript
async performSimilaritySearch(
  userEmbedding: number[],
  eligibleProgramCodes?: string[],   // replaces userGeographies
  limit: number = 10,
  userAchievementFocus?: string[],
  userGender?: string
): Promise<SimilarityResult[]>
```

The SQL call changes from passing `filter_geographies` to passing `eligible_program_codes`.

---

## What Gets Deleted

| File/Code | Reason |
|---|---|
| `api/src/utils/geographyMapper.ts` | Replaced entirely by `geographyEligibilityService` |
| All `GeographyMapper` imports | 3 files — `recommendationEngine.ts`, any routes that use it |
| `filter_geographies` SQL parameter | Replaced by `eligible_program_codes` in migration 013 |
| `NominationScope` type | No longer needed — LLM decides scope dynamically |

---

## Example Scenarios

**Scenario A: User in Mumbai, Business in Singapore**
- LLM receives: `userLocation="Mumbai, India"`, `businessLocation="Singapore"`
- LLM reasoning: "Business is in Singapore, which is in Asia-Pacific region"
- Returns: `["APAC", "IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`
- ABA (USA), MENA, GERMAN → excluded

**Scenario B: User in Dubai, Business in UAE**
- LLM receives: `userLocation="Dubai"`, `businessLocation="UAE"`
- LLM reasoning: "UAE is in the Middle East, eligible for MENA + all Global programs"
- Returns: `["MENA", "IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`
- ABA, APAC, GERMAN → excluded

**Scenario C: User in Berlin, Business in Germany**
- Returns: `["GERMAN", "IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`
- ABA, APAC, MENA → excluded

**Scenario D: US company, user working remotely from UK**
- `userLocation="London, UK"`, `businessLocation="New York, USA"`
- LLM reasoning: "Business is in USA — eligible for ABA + all Global"
- Returns: `["ABA", "IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`
- APAC, MENA, GERMAN → excluded

**Scenario E: No location provided**
- LLM falls back → returns all Global programs only
- `["IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`

---

## Implementation Order

| Step | Task | File(s) |
|---|---|---|
| 1 | Add `geographic_scope` to reembed SELECT + upsert program metadata | `scripts/reembed-categories.ts` |
| 2 | Write `geographyEligibilityService.ts` | `api/src/services/` (NEW) |
| 3 | Write SQL migration 013 | `database/migrations/013_geo_filter.sql` |
| 4 | Update `performSimilaritySearch` to use `eligible_program_codes` | `api/src/services/embeddingManager.ts` |
| 5 | Wire `geographyEligibilityService` into engine, delete `GeographyMapper` | `api/src/services/recommendationEngine.ts` |
| 6 | Re-run reembed script to populate metadata in all 1348 rows | one-time script run |

---

## Open Questions / Decisions Needed

1. **Where does `businessLocation` come from?** The user profile currently has a single `geography`
   field. We need two fields: `userLocation` (personal) and `businessLocation` (org). Does the
   intake flow ask for both? If only one is available, we use it for both.

2. **Should APAC-eligible users also see ABA?** Some US companies have APAC offices — they may be
   eligible for both. The LLM handles this correctly (businessLocation=APAC but company is USA →
   returns both APAC + ABA if the company is registered in USA). But we need to decide what input
   the user provides.

3. **Re-run reembed or just update metadata?** We can update `category_embeddings.metadata` for
   all rows with a targeted SQL UPDATE (no LLM needed) since we just need to copy data from
   `stevie_programs`. This is faster than re-running the full reembed script.

---

## What This Does NOT Do

- Does NOT affect the embedding content — we're only adding SQL filter metadata
- Does NOT change reranking logic (Pinecone reranker still runs after SQL retrieval)
- Does NOT add soft geo scoring penalties (we use hard pre-filter because our program count is
  small enough that recall impact is negligible)
- Does NOT store user eligibility decisions in the DB (always computed per-request, cached in Redis)
