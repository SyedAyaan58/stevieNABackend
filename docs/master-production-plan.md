# stevieNABackend — Master Production Plan

> Consolidated: April 2026 | Replaces: rag-optimization-research.md, rag-edge-case-fix.md, production-issues.md, geography-eligibility-plan.md
> Sources: live code investigation + internet research (2024–2026)

---

## Table of Contents

1. [Critical Bugs (Breaking Now)](#1-critical-bugs-breaking-now)
2. [RAG Accuracy — Root Causes & Fixes](#2-rag-accuracy--root-causes--fixes)
3. [RAG Accuracy — Advanced Improvements](#3-rag-accuracy--advanced-improvements)
4. [Token Cost Optimization](#4-token-cost-optimization)
5. [Latency Optimization](#5-latency-optimization)
6. [Geography Eligibility System](#6-geography-eligibility-system)
7. [Intake Flow — Field Collection Overhaul](#7-intake-flow--field-collection-overhaul)
8. [Master Implementation Priority](#8-master-implementation-priority)

---

## 1. Critical Bugs (Breaking Now)

These are silent failures confirmed by reading live code. None of them surface as errors — they just degrade accuracy or skip entire features.

---

### Bug 1 — HyDE disabled in production

**File:** `api/src/services/embeddingManager.ts:216`

```typescript
const useRichExpansion = process.env.RICH_QUERY_EXPANSION === "true" || process.env.RICH_QUERY_EXPANSION === "1";
```

HyDE — the entire query expansion strategy — is gated behind an env flag that defaults to `false`. If `RICH_QUERY_EXPANSION` is not set in a deployment environment, every user query falls back to `formatUserQueryText()` (plain field concatenation). The `.env` in this repo has it set, but any new deployment environment will silently run without HyDE.

**Fix:** Remove the flag. HyDE is the correct default. Add `DISABLE_RICH_EXPANSION=true` only for debug mode.

---

### Bug 2 — Intent boost checks the wrong column

**File:** `api/src/services/recommendationEngine.ts:239-243`

```typescript
const matchesIntent = detectedCategoryTypes!.some(t =>
  (r.achievement_focus || []).some(f =>
    f.toLowerCase().includes(t.replace(/_/g, ' '))
  )
);
```

`achievement_focus` in the DB contains `["innovation", "growth", "leadership"]` for almost every category. The detected intent types (`healthcare_medical`, `social_impact`, `technology`) never match these strings. The intent boost **never fires**.

The real type data is in `metadata.category_types`:
```json
["education_training", "social_impact", "marketing_media"]
```

**Fix:** Change to check `r.metadata?.category_types` instead of `r.achievement_focus`.

---

### Bug 3 — Reranker receives raw description, not HyDE-expanded query

**File:** `api/src/services/recommendationEngine.ts:179`

```typescript
const rerankQuery = context.description;
```

HyDE already generated a rich multi-sentence paragraph. The reranker scores relevance against the raw description instead of that expanded text — wasting the work HyDE did.

**Fix:** Return HyDE-expanded text from `generateUserEmbedding()` alongside the embedding vector, pass it to the reranker.

---

### Bug 4 — QA Agent bypasses `openaiService` entirely

**File:** `api/src/services/qaAgent.ts:151-157`

```typescript
let response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  tools,
  ...
});
```

Direct `openai` client call. This means:
- No circuit breaker (OpenAI degradation crashes QA, not fails fast)
- No retry with exponential backoff on 429/5xx
- No token tracking in Prometheus metrics
- No request queue — can overwhelm rate limits under concurrent users
- Separate OpenAI client instance initialized on every import

**Fix:** All OpenAI calls must go through `openaiService.chatCompletion()`.

---

### Bug 5 — QA Agent tool calls execute serially

**File:** `api/src/services/qaAgent.ts:177`

```typescript
for (const toolCall of toolCalls) {
  // executes one at a time
}
```

When the LLM calls `search_knowledge_base` + `search_stevie_website` simultaneously, they run sequentially. Each tool call: 1–3 seconds. Serial = 2–6s for two tools.

**Fix:** `await Promise.all(toolCalls.map(tc => executeToolCall(tc)))` then push all results.

---

### Bug 6 — IVFFlat index stale after bulk re-embed

**File:** `database/migrations/000_initial_schema.sql:102`

```sql
CREATE INDEX idx_category_embeddings_vector
  ON category_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

After deleting and re-inserting all 1348 rows, the IVFFlat index was built on the old data distribution. IVFFlat degrades with data changes and requires a full rebuild after bulk writes. HNSW is graph-based, self-healing, and consistently faster.

**Fix — Migration 013 includes this:**
```sql
DROP INDEX IF EXISTS idx_category_embeddings_vector;
CREATE INDEX idx_category_embeddings_hnsw
  ON category_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

### Bug 7 — Embedding + intent detection run sequentially

**File:** `api/src/services/recommendationEngine.ts:122-140`

```typescript
const userEmbedding = await this.embeddingMgr.generateUserEmbedding(context); // ~600ms
detectedCategoryTypes = await this.embeddingMgr.detectCategoryTypes(context); // ~400ms
```

These are fully independent. Sequential adds ~400ms to every recommendation request.

**Fix:** `Promise.all([generateUserEmbedding(), detectCategoryTypes()])` — saves 400ms per request.

---

### Bug 8 — QA Agent context window grows unbounded

**File:** `api/src/services/qaAgent.ts:174, 207`

Each tool call appends the full raw result to `messages`. 3 tool calls × 2000 token outputs + system prompt + conversation history = 12,000+ tokens per turn. No trimming, no token budget.

gpt-4o-mini won't error (128k context) but cost per QA query balloons silently.

**Fix:** Truncate tool results to 1500 tokens before appending. Current code does `substring(0, 2000)` on characters — wrong unit. Use `Math.floor(rawResult.length / 4)` tokens estimate, cap at 1500 tokens = 6000 chars.

---

### Bug 9 — No minimum similarity score

**File:** `api/src/services/recommendationEngine.ts:196`

```typescript
const minScore = parseFloat(process.env.MIN_SIMILARITY_SCORE || '0');
```

Defaults to 0. A category with 0.15 cosine similarity (essentially unrelated) appears in results.

**Fix:** Set `MIN_SIMILARITY_SCORE=0.35` in all environments. Research shows 0.35–0.45 is the correct floor for `text-embedding-3-small` in domain-specific matching.

---

### Bug 10 — KB search has no program metadata filter

**File:** `api/src/services/qaAgent.ts:251`

```typescript
const results = await pineconeClient.query(embedding, 5);
```

No filter — searches ALL Pinecone documents regardless of program. User asking about ABA deadlines may get APAC or MENA documents.

**Fix:**
```typescript
const filter = detectedProgram ? { program: detectedProgram } : undefined;
await pineconeClient.query(embedding, 5, filter);
```

---

## 2. RAG Accuracy — Root Causes & Fixes

### What the system actually does

Despite variable naming that suggests "contextual retrieval," the codebase runs **HyDE (Hypothetical Document Embeddings)** — query-side expansion only. The category embeddings themselves were previously basic structured text from `formatCategoryText`.

**What changed:**
- `reembed-categories.ts` now generates an LLM contextual prefix per category (2–3 discriminative sentences) and bakes it into the embedding text. All 1348 rows have been re-embedded.
- This is now proper Contextual Retrieval: document-side LLM contextualization + query-side HyDE.

### Root cause of edge case failures

**Problem 1 — `contextual_prefix` was wired in SQL but never written**

`database/migrations/010_rollback_to_working_state.sql:87` applies a `+2% per keyword match` scoring boost against `contextual_prefix`, but the column was always NULL. The fix (re-embedding with LLM-generated prefixes) has been applied.

**Problem 2 — Intent detection was a hard SQL filter, not a soft boost**

Intent detection in `recommendationEngine.ts` was disabled entirely because it was previously wired as a hard SQL WHERE clause that returned 0 results when metadata wasn't populated. The fix was to re-enable it as a post-retrieval soft score boost (+8% to matching categories), which cannot return 0 results.

**Problem 3 — Single HyDE query, one framing**

For ambiguous descriptions ("AI-powered healthcare platform"), a single HyDE paragraph may lean toward technology OR healthcare depending on word ordering. One framing = one shot.

**Fix:** Multi-query HyDE — see section 3.

**Problem 4 — No cross-encoder reranking**

Cosine similarity cannot distinguish "semantically close but wrong category" from "actually the right match." After retrieval, results need to be re-scored by a model that reads query + document together.

**Fix:** Pinecone Rerank v0 — already partially implemented, but receiving raw description instead of HyDE text (Bug 3).

---

## 3. RAG Accuracy — Advanced Improvements

### 3.1 Multi-Query HyDE (Next improvement after current fixes)

**Benchmarks:** Multi-query retrieval improves recall 15–25% over single-query.

Instead of one HyDE expansion, generate 3 variants with different framings via 3 parallel gpt-4o-mini calls (each ~100ms, well within request budget):

| Framing | Focus |
|---|---|
| Achievement-focused | What was accomplished and its measurable impact |
| Domain-focused | What industry/sector/org type this belongs to |
| Award-language-focused | How this maps to award terminology (excellence, innovation) |

Run 3 parallel `performSimilaritySearch` calls, union by `category_id` keeping highest score, then feed to Pinecone Rerank.

**Where to change:** `embeddingManager.ts` — add `generateMultiQueryExpansions()`. `recommendationEngine.ts` — run `Promise.all` of 3 searches.

---

### 3.2 Cross-Encoder Reranking (Already integrated — fix Bug 3 first)

**Benchmarks:** 18–42% precision improvement. Pinecone Rerank V0 achieves highest average NDCG@10 on BEIR, surpasses Google Semantic Ranker on 6/12 datasets. For ambiguous queries: 89% relevance vs 34% for vector-only.

After `performSimilaritySearch` returns top-20 candidates, pass HyDE-expanded query + candidate descriptions to Pinecone Rerank V0. Keep top-10 for final output.

**Practical sizing:** 20 input candidates, return 10. Below 10 candidates you miss relevant ones ranked low by bi-encoder; above 50, latency grows linearly (~8ms/pair).

---

### 3.3 Semantic Chunking for Document Ingestion (Future)

Current: 1000-char fixed chunks with 200-char overlap.

**Benchmarks:** Up to 70% accuracy improvement vs naive fixed-size chunking.

Semantic chunking splits on topic boundaries (detects similarity drops between adjacent sentences) rather than character count. The 200-char overlap is compensating for fixed-size boundary errors — semantic chunking eliminates the root cause.

**Implementation:** `langchain.text_splitter.SemanticChunker` (embedding similarity-based, no extra API). Apply to new document ingestion first, then re-ingest incrementally.

---

### 3.4 Late Chunking (Future — complements semantic chunking)

Encode the entire document with a long-context embedding model first, pool token-level embeddings into chunk-level vectors. Chunks retain full document context without a separate LLM contextualization call per chunk.

**Best for:** Long documents where context from the beginning is critical for middle/end chunks.

**Tradeoff:** Requires a long-context embedding model (`text-embedding-3-large` or `jina-embeddings-v3`). Use after 3.1 + 3.2 are validated.

---

## 4. Token Cost Optimization

### 4.1 Semantic Response Caching (Biggest win)

**Benchmarks:** 60–73% reduction in LLM API calls. Cache hits: 52ms vs 1.67s LLM (96.9% latency reduction). Effective similarity threshold: 0.85–0.92.

You already have Redis. Add a semantic cache layer in front of LLM calls:
1. Embed the incoming query
2. Search Redis for cached (query_embedding, response) pairs with cosine similarity > 0.87
3. Hit → return in <100ms, no LLM call
4. Miss → call LLM, cache result with 24–48h TTL

**Why this fits:** Award search queries ("What is the ABA deadline?") repeat heavily. Stevie Awards info doesn't change daily.

**Implementation:** Add `semanticResponseCache.ts` wrapping `openaiService.ts`. Use existing Redis client (ioredis) + cosine similarity check on stored embeddings.

---

### 4.2 OpenAI Prompt Caching (Free, immediate)

OpenAI automatically caches prompt prefixes ≥1024 tokens. Cache hits cost 50% less. Structure all prompts so static system prompt + static context comes first, dynamic user content last.

**Action:** Audit `openaiService.ts` and `unifiedChatbotService.ts`. Move static instructions to top of every prompt. This is a zero-code-logic change with immediate cost impact.

---

### 4.3 Model Routing by Task Complexity

Current is already good (gpt-4o-mini for most, gpt-4o for award search synthesis). One enhancement:

Intent classification is a short binary classification task. A small local heuristic (keyword matching on 5–10 signals) can handle obvious cases before calling the LLM. Only send to LLM when ambiguous.

**Estimated savings:** 15–30% on intent classification calls.

---

### 4.4 LLMLingua Prompt Compression (Future)

A small fast model identifies and removes low-information tokens from retrieved chunks before they enter the LLM context. Preserves semantic meaning.

**Results:** Typical 6–10% cost reduction on lean prompts; up to 95% on verbose Jina-scraped pages (3000+ tokens of mixed-quality content).

**Implementation:** Use Claude Haiku to summarize/compress scraped content before gpt-4o synthesis. Simpler than a Python port.

---

## 5. Latency Optimization

### 5.1 HNSW Index (Covered under Bug 6)

Sub-5ms vs 5–50ms for IVFFlat at this scale. Migration planned in step 013.

### 5.2 Parallel Pipeline (Partial — extend further)

Currently sequential where it doesn't need to be. Target state:

```
Query received
    ├── [async] Geography eligibility (Redis → LLM)     ← NEW
    ├── [async] Embed query (HyDE — OpenAI)
    ├── [async] Check semantic response cache (Redis)   ← NEW
    └── [wait for embed + eligibility]
            └── pgvector search (pre-filtered by program codes)
                    └── Pinecone Rerank
                            └── LLM generation (streaming)
```

**Savings:** 400ms from parallel intent+embed (Bug 7). Additional 200–400ms from parallelizing geo eligibility.

### 5.3 Connection Warm-Up

On server startup, send a dummy embedding request and dummy Pinecone query to warm TCP connections. Eliminates cold-start latency (~200–500ms) on the first real user request.

**Where:** `app.ts` startup sequence, after all services initialize.

### 5.4 Embedding Cache TTL

Current 7-day Redis TTL for embeddings is correct. For semantic response cache: 24–48h TTL with invalidation hook when content changes (document ingestion pipeline).

---

## 6. Geography Eligibility System

### What We're Replacing

`api/src/utils/geographyMapper.ts` — hardcoded static lookup (~30 countries). Fails on:
- Any country not in the list (UK, Brazil, France, Nigeria, Mexico → no match)
- City inputs ("Mumbai", "Dubai")
- Business location ≠ user location (someone in London with a US company)
- New programs added to DB — requires code changes

### Architecture

```
User input: userLocation="Mumbai", businessLocation="Singapore"
                            │
                            ▼
         geographyEligibilityService
         1. Check Redis cache (TTL: 6h)
            key: sha256("geo:v1:" + userLoc + "|" + bizLoc)
         2. On miss: fetch all programs from stevie_programs
            (program_code + geographic_scope)
         3. Call gpt-4o-mini via openaiService.chatCompletion()
            → structured JSON output: { eligible_program_codes[] }
         4. Cache result, return string[]
                            │
                            ▼
         recommendationEngine
         → pass eligibleProgramCodes to performSimilaritySearch
                            │
                            ▼
         SQL: search_similar_categories
         WHERE sp.program_code = ANY(eligible_program_codes)
         (pre-filter inside ANN query)
```

### Programs and Geographic Scope (from DB — not hardcoded)

| Program | Scope | Restricted |
|---|---|---|
| ABA | `["USA"]` | Yes |
| IBA | `["Global"]` | No |
| WOMEN | `["Global"]` | No |
| MENA | `["Middle East", "North Africa"]` | Yes |
| APAC | `["Asia", "Pacific"]` | Yes |
| TECH | `["Global"]` | No |
| GERMAN | `["Germany", "Austria", "Switzerland"]` | Yes |
| EMPLOYERS | `["Global"]` | No |
| SALES | `["Global"]` | No |

The program list is fetched live from the DB — not hardcoded here. Adding a new program to `stevie_programs` automatically includes it in the eligibility check without any code changes.

### LLM Classification Design

**Key rule the LLM enforces:** Eligibility is based on **business/org location**, not personal location.

System prompt:
```
You are a geographic eligibility classifier for the Stevie Awards.
Given a user's personal location and their business/organization location,
determine which award programs they are eligible for.

Rules:
- Eligibility is based on BUSINESS/ORGANIZATION location, not personal location.
- "Global" programs are always eligible for everyone.
- For regional programs, use world geography knowledge to determine if the
  business location is within the program's geographic scope.
- If business location is unknown or ambiguous, include only Global programs.

Respond ONLY with valid JSON matching the exact schema provided.
```

**Structured output schema (OpenAI Structured Outputs, not JSON mode):**
```json
{
  "eligible_program_codes": ["APAC", "IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"],
  "reasoning": "Business in Singapore falls within Asia-Pacific scope."
}
```

**Fallback:** LLM failure → return all Global programs (`["IBA", "WOMEN", "TECH", "EMPLOYERS", "SALES"]`). Never crashes the recommendation pipeline.

### Example Eligibility Decisions

| User Location | Business Location | Eligible Programs |
|---|---|---|
| Mumbai, India | Singapore | APAC, IBA, WOMEN, TECH, EMPLOYERS, SALES |
| London, UK | New York, USA | ABA, IBA, WOMEN, TECH, EMPLOYERS, SALES |
| Dubai, UAE | UAE | MENA, IBA, WOMEN, TECH, EMPLOYERS, SALES |
| Berlin | Germany | GERMAN, IBA, WOMEN, TECH, EMPLOYERS, SALES |
| (not provided) | (not provided) | IBA, WOMEN, TECH, EMPLOYERS, SALES |

### Pre-filter vs Post-filter Decision

**We use pre-filter (SQL WHERE clause inside ANN query).**

Research (2024–2025) confirms:
- Post-filtering requires fetching 3–5x results to compensate for filtered rows — wastes retrieval budget
- Pre-filtering degrades HNSW only when filters are very selective (<1% of index remains)
- We have 9 programs total; 3–6 are typically eligible → pre-filter retains 40–70% of index. HNSW handles this without degradation.

### Metadata in `category_embeddings`

Each row needs `program_code` for the SQL WHERE clause without a JOIN:

```json
{
  "program_code": "APAC",
  "program_name": "Asia-Pacific Stevie Awards",
  "geographic_scope": ["Asia", "Pacific"],
  "is_geo_restricted": true
}
```

Populated by `reembed-categories.ts` on next run (targeted SQL UPDATE is faster — see implementation order).

### Implementation Order

| Step | Task | File |
|---|---|---|
| 1 | SQL UPDATE to populate program metadata in category_embeddings | one-time SQL |
| 2 | Write `geographyEligibilityService.ts` | `api/src/services/` (NEW) |
| 3 | Migration 013 — HNSW index + update `search_similar_categories` | `database/migrations/` |
| 4 | Update `performSimilaritySearch` to accept `eligibleProgramCodes` | `embeddingManager.ts` |
| 5 | Wire into `recommendationEngine.ts`, delete `geographyMapper.ts` | `recommendationEngine.ts` |

### What Gets Deleted

- `api/src/utils/geographyMapper.ts` — replaced entirely
- All `GeographyMapper` imports
- `NominationScope` type — LLM decides scope dynamically
- `filter_geographies` SQL parameter — replaced by `eligible_program_codes`

---

## 7. Intake Flow — Field Collection Overhaul

### Current Problems

`intakeAssistant.ts` collects a single `geography` field. For the geography eligibility system, we need:
- `user_location` — where the person lives (city/country)
- `business_location` — where the organization/company is registered or operates from

The current system also uses raw `JSON.parse()` on LLM output (unreliable), no confidence scoring, and no entity-level validation beyond email regex.

### 7.1 Add Two Location Fields

**Change in `intakeFlow.ts`:**

```typescript
export type IntakeField =
  | 'user_name'
  | 'user_email'
  | 'user_location'       // NEW — replaces 'geography'
  | 'business_location'   // NEW
  | 'nomination_subject'
  | 'org_type'
  | 'gender_programs_opt_in'
  | 'recognition_scope'
  | 'nomination_scope'
  | 'description'
  | 'achievement_impact'
  | 'achievement_innovation'
  | 'achievement_challenges';
```

**Change in `intakeAssistant.ts` prompt:**

Replace single `geography` field with:
```
- user_location: where the USER personally lives (city, country, or region)
- business_location: where the ORGANIZATION or company is based (may differ from user location)
  → IMPORTANT: extract both if mentioned in the same message ("I'm in London but my company is in Dubai")
  → Ask for user_location first, then business_location as a follow-up
  → Natural phrasing: "And where is your company or organization based?" / "Is the company in the same country?"
```

**Extraction example to add to prompt:**
```
- "I'm in London but my company is based in Dubai" → { user_location: "London, UK", business_location: "Dubai, UAE" }
- "We're a US company, I work from India" → { user_location: "India", business_location: "USA" }
- "Mumbai" (no business context) → { user_location: "Mumbai, India", business_location: null }
```

### 7.2 Switch to OpenAI Structured Outputs (Not JSON mode)

**Current:** Raw `JSON.parse()` on LLM text output with a try/catch. Failure rate on complex responses can be significant.

**Problem with JSON mode:** Only validates JSON syntax. The LLM can still return the wrong field names, wrong types, or extra fields.

**Solution:** OpenAI Structured Outputs with explicit JSON schema. Achieves 100% schema compliance on gpt-4o-mini (vs <40% with basic JSON mode in 2024 evals). Uses constrained decoding — deterministic.

**Implementation:**
```typescript
const response = await openaiService.chatCompletion({
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.2,
  maxTokens: 500,
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'intake_plan',
      schema: {
        type: 'object',
        properties: {
          updates: {
            type: 'object',
            properties: {
              user_name: { type: 'string' },
              user_email: { type: 'string' },
              user_location: { type: 'string' },
              business_location: { type: 'string' },
              // ... all other fields
            },
            additionalProperties: false,
          },
          next_field: { type: 'string', enum: INTAKE_FIELDS },
          next_question: { type: 'string' },
          ready_for_recommendations: { type: 'boolean' },
        },
        required: ['updates', 'next_field', 'next_question', 'ready_for_recommendations'],
        additionalProperties: false,
      },
    },
  },
});
```

This eliminates the JSON parsing try/catch fallback entirely. Schema violations become impossible.

### 7.3 Post-Extraction Validation Layer

After the LLM returns extracted fields, validate before storing:

**Email:**
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (updates.user_email && !EMAIL_REGEX.test(updates.user_email)) {
  // override next_field to re-ask for email
}
```

**Location canonicalization:**
LLMs are unreliable for geocoding — research shows 40%+ failure rate on uncommon locations (GDELT Project, 2024). Two options:
- Option A (lightweight): Store user's raw text, let the geo eligibility LLM handle disambiguation at recommendation time. The eligibility LLM already has world geography knowledge.
- Option B (production-grade): Call a geocoding API (Google Maps Geocoding, Nominatim/OpenStreetMap free tier) to resolve `user_location` and `business_location` to normalized city + country code. Store both raw and canonical.

**Recommendation:** Option A for now (no new vendor), Option B as upgrade when traffic justifies it.

**Free-text fields (description, achievement_*):**
- Strip HTML tags before storing: `value.replace(/<[^>]*>/g, '')`
- Enforce max length at storage layer (already done with `substring(0, 1200)`)
- No SQL injection risk since these go through Supabase client (parameterized), but sanitize for downstream LLM prompt injection

### 7.4 Slot Contradiction Handling

When a user changes a previously collected field ("actually, my company is in Singapore not India"), the LLM should detect the contradiction and update the field. 

**Current behavior:** The LLM already extracts field updates from each message. Since all fields are in the context summary, a new value for an existing field overwrites the old one.

**Gap:** No explicit user confirmation for changed critical fields (email, business_location). Production pattern: if a previously confirmed field changes, echo it back:
*"Got it — updating your company location to Singapore. Is that right?"*

**Implementation:** Add a `changed_fields` array to the LLM response schema. In the handler, if `changed_fields` includes `business_location` or `user_email`, set `next_question` to a confirmation before proceeding.

### 7.5 Confidence Scoring (Light-touch)

Token log probabilities are available in the OpenAI API response (`logprobs: true`). For semantic extractions (location, business type), a low aggregate log probability signals uncertain extraction.

**Practical rule (no complex implementation needed):**
If the LLM's `next_question` phrasing is a confirmation ("Just to confirm, your company is in X?"), treat the field as unconfirmed and do not use it for eligibility until the user responds. This is already possible with the current state machine — just add a `pending_confirmation` flag to context.

### 7.6 Natural Question Order

Revised field collection order (updated for two-location):

| Order | Field | Question style |
|---|---|---|
| 1 | `user_name` | "What's your name?" |
| 2 | `user_email` | "And your email?" |
| 3 | `user_location` | "Where are you based?" |
| 4 | `business_location` | "And where is your company/organization based? Same country or different?" |
| 5 | `nomination_subject` | "Are we nominating an individual, team, company, or product?" |
| 6 | `org_type` | "For-profit or non-profit?" |
| 7 | `gender_programs_opt_in` | "Interested in women's leadership award categories too?" |
| 8 | `description` | "Tell me about the achievement!" |
| 9–11 | optional follow-ups | 1–2 max after description |

Business location is asked immediately after user location while geographic context is active in the conversation, which feels natural. If the user answers both in one message ("I'm in London, company's in New York"), both fields are extracted simultaneously and question 4 is skipped.

### Summary of Changes to `intakeAssistant.ts`

| Change | Reason |
|---|---|
| Replace `geography` field with `user_location` + `business_location` | Support geo eligibility system |
| Switch to OpenAI Structured Outputs | 100% schema compliance, eliminate JSON parse failures |
| Add extraction examples for dual-location in one message | Prevent missed extractions |
| Add post-extraction email validation | Catch invalid emails before they propagate |
| Add HTML strip on free-text fields | Prevent LLM prompt injection from user input |
| Update field order in prompt | Natural two-location flow |

---

## 8. Master Implementation Priority

### Tier 1 — Critical Fixes (do now, breaking in production)

| # | Fix | File | Effort |
|---|---|---|---|
| B1 | Remove HyDE env flag gate — hard-enable | `embeddingManager.ts:216` | 5 min |
| B2 | Intent boost → check `metadata.category_types` | `recommendationEngine.ts:239` | 10 min |
| B3 | Pass HyDE text to reranker, not raw description | `recommendationEngine.ts:179` | 30 min |
| B4 | QA Agent → use `openaiService.chatCompletion` | `qaAgent.ts:151` | 1 hr |
| B5 | QA Agent tool calls → `Promise.all` | `qaAgent.ts:177` | 30 min |
| B7 | Embed + intent detection → `Promise.all` | `recommendationEngine.ts:122` | 15 min |
| B8 | Cap tool results at 6000 chars (1500 tokens) | `qaAgent.ts:174` | 15 min |
| B9 | Set `MIN_SIMILARITY_SCORE=0.35` in all envs | `.env` | 2 min |
| B10 | KB search → add program metadata filter | `qaAgent.ts:251` | 20 min |

### Tier 2 — High Impact Improvements (this sprint)

| # | Improvement | File | Effort |
|---|---|---|---|
| G1 | Geography eligibility service | NEW `geographyEligibilityService.ts` | 3 hr |
| G2 | SQL Migration 013 — HNSW + program filter | `database/migrations/013.sql` | 1 hr |
| G3 | Update `performSimilaritySearch` signature | `embeddingManager.ts` | 30 min |
| G4 | Wire geo service into engine, delete GeographyMapper | `recommendationEngine.ts` | 1 hr |
| I1 | Add `user_location` + `business_location` fields | `intakeFlow.ts`, `intakeAssistant.ts` | 1.5 hr |
| I2 | Switch to OpenAI Structured Outputs | `intakeAssistant.ts` | 1 hr |
| I3 | Post-extraction validation layer | `intakeAssistant.ts` | 30 min |

### Tier 3 — Performance (next sprint)

| # | Improvement | Estimated Impact | Effort |
|---|---|---|---|
| P1 | Semantic response cache (Redis) | Cost -60%, Latency -97% on hits | 4 hr |
| P2 | OpenAI prompt prefix ordering | Cost -50% on cached tokens | 1 hr |
| P3 | Multi-query HyDE (3 variants) | Recall +15–25% | 4 hr |
| P4 | Connection warm-up on startup | -200–500ms cold start | 30 min |

### Tier 4 — Future (next quarter)

| # | Improvement | Estimated Impact |
|---|---|---|
| F1 | Semantic chunking for document ingestion | Accuracy +20–70% |
| F2 | Geocoding API for location canonicalization | Intake quality improvement |
| F3 | LLMLingua compression for scraped content | Cost -10–30% on long contexts |
| F4 | Late chunking with long-context embedding model | Accuracy improvement on long docs |

---

## Sources

**RAG Accuracy**
- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Contextual Retrieval — 67% accuracy boost](https://www.maginative.com/article/anthropics-contextual-retrieval-technique-enhances-rag-accuracy-by-67/)
- [Pinecone Rerankers & Two-Stage Retrieval](https://www.pinecone.io/learn/series/rag/rerankers/)
- [Pinecone Rerank V0 Announcement](https://www.pinecone.io/blog/pinecone-rerank-v0-announcement/)
- [Cross-Encoder Reranking — 40% accuracy improvement](https://app.ailog.fr/en/blog/news/reranking-cross-encoders-study)
- [Multi-Query RAG: Dramatically Improve Retrieval Accuracy](https://dev.to/sreeni5018/multi-query-retriever-rag-how-to-dramatically-improve-your-ais-document-retrieval-accuracy-5892)
- [Document Chunking: 9 Strategies, 70% Accuracy Boost](https://langcopilot.com/posts/2025-10-11-document-chunking-for-rag-practical-guide)
- [Ultimate Guide to Reranking Models 2026](https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025)

**Cost & Latency**
- [Semantic Caching: Cut API Bills 60%](https://blog.premai.io/semantic-caching-for-llms-how-to-cut-api-bills-by-60-without-hurting-quality/)
- [GPT Semantic Cache — ArXiv](https://arxiv.org/abs/2411.05276)
- [Redis LLM Token Optimization 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Prompt Caching — ngrok blog](https://ngrok.com/blog/prompt-caching)
- [RAG Low Latency Case Study — 60% reduction](https://devilsdev.github.io/rag-pipeline-utils/blog/reducing-retrieval-latency-case-study)
- [IVFFlat vs HNSW pgvector](https://dev.to/philip_mcclarence_2ef9475/ivfflat-vs-hnsw-in-pgvector-which-index-should-you-use-305p)
- [Supabase HNSW Index Docs](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes)

**Geography & Intake**
- [Pre and Post Filtering in Vector Search](https://dev.to/volland/pre-and-post-filtering-in-vector-search-with-metadata-and-rag-pipelines-2hji)
- [The Achilles Heel of Vector Search: Filters](https://yudhiesh.github.io/2025/05/09/the-achilles-heel-of-vector-search-filters/)
- [GeoAgent: To Empower LLMs using Geospatial Tools](https://aclanthology.org/2024.findings-acl.362.pdf)
- [Why LLM-Based Geocoders Struggle (GDELT)](https://blog.gdeltproject.org/generative-ai-experiments-why-llm-based-geocoders-struggle/)
- [Redis LLM Semantic Cache](https://redis.io/docs/latest/develop/ai/redisvl/user_guide/llmcache/)
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [When to use function calling vs structured outputs vs JSON mode](https://vellum.ai/blog/when-should-i-use-function-calling-structured-outputs-or-json-mode)
- [Zero-Shot Slot-Filling for Conversational Assistants](https://arxiv.org/html/2406.08848v1)
- [Evaluating Modular Dialogue Systems for Form Filling with LLMs](https://aclanthology.org/2024.scichat-1.4/)
- [Context Window Overflow](https://redis.io/blog/context-window-overflow/)
- [HyDE — Conditional vs Always On](https://medium.com/@mudassar.hakim/retrieval-is-the-bottleneck-hyde-query-expansion-and-multi-query-rag-explained-for-production-c1842bed7f8a)
