# RAG Accuracy Fixes — AI Layer
**Deadline:** April 10, 2026  
**Scope:** Retrieval accuracy improvements only (AI layer, not backend infra)  
**Status:** In progress

---

## Priority Order (ranked by impact vs effort)

| # | Fix | Effort | Impact | Status |
|---|-----|--------|--------|--------|
| 1 | Increase candidate pool: 20 → 150 | Tiny (1 line) | High | ⬜ |
| 2 | Pass full text to reranker (include contextual_prefix) | Tiny (1 line) | Medium-High | ⬜ |
| 3 | Set `iterative_scan` for HNSW — stops silent result drops | Small (SQL + service) | High | ⬜ |
| 4 | Soft-filter org_type / nomination_subject | Medium (SQL function) | Medium | ⬜ |
| 5 | Multi-HyDE with RRF (3 queries, parallel, merge) | Medium (refactor) | High | ⬜ |

---

## Fix 1 — Increase Candidate Pool (20 → 150)

**File:** `api/src/services/recommendationEngine.ts` line ~108

**Problem:**  
Vector search retrieves only `min(limit * 2, 20)` = 20 candidates before handing off to the Pinecone reranker. If the correct category ranks 25th or 30th in raw cosine similarity (common when HyDE drifts slightly), it is never seen by the reranker. The reranker can fix order — it cannot surface what was never retrieved.

**Fix:**
```ts
// Before
const candidateLimit = Math.min(limit * 2, 20);

// After
const candidateLimit = Math.min(limit * 10, 150);
```

**Why it won't crash:**  
- Pinecone cross-encoder (`pinecone-rerank-v0`) is designed for 100–300 document inputs. Not an LLM — no token limits.  
- pgvector already scans the full index; returning 150 rows vs 20 is a trivial cost increase (~5–10ms).  
- The LLM (explanation generation) only ever receives the final top-15 after reranking — unchanged.

---

## Fix 2 — Pass Full Text to Reranker (Include contextual_prefix)

**File:** `api/src/services/recommendationEngine.ts` (wherever rerank documents are built)

**Problem:**  
The Pinecone reranker currently receives `"${category_name}. ${description}"`. The `contextual_prefix` — which is the most discriminative part of each category (engineered specifically to separate similar categories) — is never seen by the reranker. It's making relevance judgments with half the signal.

**Fix:**
```ts
// Before
const doc = `${result.category_name}. ${result.description}`;

// After
const doc = `${result.contextual_prefix} ${result.category_name}. ${result.description}`;
```

---

## Fix 3 — Set `iterative_scan` for HNSW (Stops Silent Result Drops)

**File:** `database/migrations/` (new migration) + wherever the RPC is called

**Problem:**  
When HNSW index is used with metadata pre-filters (geography, org type, gender), pgvector performs a filtered ANN search. With tight filters, the HNSW graph may not find enough candidates in the filtered subset and silently returns fewer results than requested — or worse, returns lower-quality results — without any error. This is documented in the pgvector changelog as a known issue requiring `iterative_scan`.

**Fix — SQL (set before each search_similar_categories call):**
```sql
SET hnsw.iterative_scan = relaxed_order;
SET max_parallel_workers_per_gather = 0;  -- required for iterative_scan
```

**Fix — Service layer** (`embeddingManager.ts` or `recommendationEngine.ts`, before calling the RPC):
```ts
// Run before the supabase.rpc('search_similar_categories', ...) call
await supabase.rpc('set_hnsw_iterative_scan');
```

**Migration (new SQL function):**
```sql
CREATE OR REPLACE FUNCTION set_hnsw_iterative_scan()
RETURNS void AS $$
BEGIN
  SET LOCAL hnsw.iterative_scan = relaxed_order;
  SET LOCAL max_parallel_workers_per_gather = 0;
END;
$$ LANGUAGE plpgsql;
```

**Why this matters:** Without `iterative_scan`, filtered HNSW can silently drop valid categories that pass the filter but are in a region of the graph not reachable from the query's entry point. The doc already flagged this as critical.

---

## Fix 4 — Soft-Filter org_type / nomination_subject

**File:** `database/migrations/` (update `search_similar_categories` SQL function)

**Problem:**  
`org_type` and `nomination_subject_type` are applied as hard `WHERE` filters before ranking. If a category's metadata has a gap (e.g., `applicable_org_types` is `null` or missing a valid type), it gets excluded before being scored. This silently removes valid results.

**Geography** should remain a hard filter — it's binary, reliable, and intentional.

**Fix — Change hard filters to score penalties:**
```sql
-- Remove from WHERE clause:
-- AND (metadata->'applicable_org_types' @> to_jsonb(ARRAY[user_org_type]))
-- AND (metadata->>'nomination_subject_type' = user_nomination_subject)

-- Add to score calculation:
+ CASE 
    WHEN user_org_type IS NOT NULL 
         AND metadata->'applicable_org_types' IS NOT NULL
         AND NOT (metadata->'applicable_org_types' @> to_jsonb(ARRAY[user_org_type]))
    THEN -0.15  -- penalty for mismatch, not exclusion
    ELSE 0
  END

+ CASE
    WHEN user_nomination_subject IS NOT NULL
         AND metadata->>'nomination_subject_type' IS NOT NULL
         AND metadata->>'nomination_subject_type' != user_nomination_subject
    THEN -0.10
    ELSE 0
  END
```

---

## Fix 5 — Multi-HyDE with Reciprocal Rank Fusion (RRF)

**File:** `api/src/services/recommendationEngine.ts` + `embeddingManager.ts`

**Problem:**  
One HyDE query = one point in vector space. If the LLM emphasizes the wrong angle (e.g., focuses on "technology" when the achievement is really "customer service"), the embedding lands in the wrong region and retrieval suffers. There is no recovery mechanism.

**Fix — Generate 3 HyDE queries in parallel, merge with RRF:**

Each query emphasizes a different angle of the user's context:
- **Query A (default):** Current HyDE prompt — balanced, full context
- **Query B (achievement-angle):** Emphasize the specific achievement type and innovation
- **Query C (impact-angle):** Emphasize business/social impact and outcomes

Run 3 parallel vector searches (top-50 each), merge results using RRF:
```
RRF_score(category) = Σ 1 / (60 + rank_in_search_i)
```

Pass merged candidates (deduplicated, sorted by RRF score, top-150) to the reranker.

**Implementation sketch:**
```ts
// In recommendationEngine.ts
const [embA, embB, embC] = await Promise.all([
  embeddingManager.generateUserEmbedding(context, 'balanced'),
  embeddingManager.generateUserEmbedding(context, 'achievement'),
  embeddingManager.generateUserEmbedding(context, 'impact'),
]);

const [resultsA, resultsB, resultsC] = await Promise.all([
  performSimilaritySearch(embA.embedding, { limit: 50, ...filters }),
  performSimilaritySearch(embB.embedding, { limit: 50, ...filters }),
  performSimilaritySearch(embC.embedding, { limit: 50, ...filters }),
]);

const merged = reciprocalRankFusion([resultsA, resultsB, resultsC], k=60);
// merged is deduplicated, sorted by RRF score, capped at 150
// → pass to Pinecone reranker as before
```

**RRF helper:**
```ts
function reciprocalRankFusion(rankLists: SimilarityResult[][], k = 60): SimilarityResult[] {
  const scores = new Map<string, number>();
  const items = new Map<string, SimilarityResult>();

  for (const list of rankLists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.category_id) ?? 0;
      scores.set(item.category_id, prev + 1 / (k + rank + 1));
      if (!items.has(item.category_id)) items.set(item.category_id, item);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ ...items.get(id)!, similarity_score: score }));
}
```

**Cost:** 3× embedding API calls + 3× pgvector queries. Embeddings are cached — if same user context hits again, no extra cost. pgvector queries are cheap (~5–10ms each). Net latency increase: ~20–40ms.

---

## What's NOT in scope (defer post-April 10)

| Item | Why deferred |
|------|-------------|
| Hybrid BM25 + vector search | Requires schema migration + ParadeDB/pg_search setup — higher effort |
| Evaluation framework (RAGAS / hit-rate tracking) | Important but doesn't fix current accuracy — monitoring, not fixing |
| Semantic query caching | Performance optimization, not accuracy |
| Prompt injection protection | Security layer, separate concern |
| Conversation history compression | Context management, separate concern |

---

## Implementation Order (April 7–10)

| Day | Tasks |
|-----|-------|
| April 7 | Fix 1 (candidate pool) + Fix 2 (reranker text) — both are 1-line changes |
| April 8 | Fix 3 (iterative_scan migration + service call) |
| April 9 | Fix 4 (soft-filter SQL) + Fix 5 (Multi-HyDE + RRF) |
| April 10 | Test end-to-end, verify recommendations are more accurate |
