# RAG Edge Case Analysis & Fixes
## Root Causes + Specific Recommendations

> Based on reading the actual code, not assumptions.

---

## What "contextual retrieval" actually is in this codebase

Despite the name, the system does **not** use Anthropic's Contextual Retrieval technique
(which adds context to document chunks at ingest time).

What's actually running is **HyDE (Hypothetical Document Embeddings)**:
- `embeddingManager.ts:170` → `generateRichSearchQuery()` expands the user's nomination
  context into a rich paragraph using gpt-4o-mini, then embeds that paragraph.
- This is query-side expansion only. The category embeddings themselves are basic
  structured text (`formatCategoryText` at line 77).

---

## Root Causes of Edge Case Failures (from reading the code)

### Problem 1: `contextual_prefix` is wired up in SQL but never written

**File:** `embeddingManager.ts:553-590` — `precomputeCategoryEmbedding()`

```typescript
const { error } = await this.client.from("category_embeddings").upsert({
  category_id: category.category_id,
  embedding: embedding,
  embedding_text: categoryText,
  // contextual_prefix is NEVER SET here
});
```

**File:** `database/migrations/010_rollback_to_working_state.sql:87`

```sql
-- Check contextual prefix (2% per match)
(SELECT COUNT(*) * 0.02 FROM unnest(user_focus_lower) AS keyword
 WHERE lower(ce.contextual_prefix) LIKE '%' || keyword || '%')
```

The SQL scoring function applies a 2% keyword boost against `contextual_prefix`, but the
column is always NULL. This boost never fires. Populating it is a zero-migration fix that
immediately activates an already-written scoring path.

---

### Problem 2: Intent detection exists but is fully disabled

**File:** `recommendationEngine.ts:138-144`

```typescript
// Step 3.5: Intent detection DISABLED (was causing issues)
// const categoryTypes = undefined;

logger.info('intent_detection_complete', {
  category_types: 'all',
  note: 'Intent filtering DISABLED - reverted to working state',
});
```

The full detection logic (`detectCategoryTypes` in `embeddingManager.ts:281-392`) is still
there and works. It was disabled because it was being used as a **hard SQL filter** in a
previous migration, which returned 0 results when metadata wasn't populated.

The fix is **not** to re-enable the hard filter — it's to use intent detection as a
**soft re-scoring signal** after retrieval, not before.

---

### Problem 3: Single HyDE query — one framing, one shot

`generateUserEmbedding` generates exactly one expanded query. For ambiguous descriptions
(e.g., "AI-powered healthcare platform"), the single HyDE paragraph might lean toward
technology OR healthcare depending on which words appear first — and miss the other.

---

### Problem 4: No post-retrieval reranking

After `performSimilaritySearch` returns results, they go directly to the output.
There is no step that reads query + category description together to verify relevance.
Cosine similarity alone cannot distinguish between "semantically close but wrong category"
and "actually the right match".

---

## The Three Fixes (in priority order)

### Fix 1 — Populate `contextual_prefix` at ingestion (zero new infrastructure)

During `precomputeCategoryEmbedding()`, generate a short context sentence per category
and store it in `contextual_prefix`. The SQL scoring boost for it is already written.

What to write in `contextual_prefix`:
```
"This is a {program_name} award category for {org_type} organizations recognizing 
excellence in {achievement_focus}."
```

This activates the existing `+ 0.02 per keyword match` scoring path in SQL immediately.
No migration needed, no new service, no new vendor.

**Where to change:** `embeddingManager.ts:566` — add `contextual_prefix` to the upsert.

---

### Fix 2 — Add Pinecone Rerank after retrieval (directly fixes edge cases)

Retrieve top-20 from pgvector, then pass them through Pinecone Rerank V0 to reorder by
true relevance before returning top-5 to the LLM.

Cross-encoders read query + category description together and score them as a pair.
This is exactly what fails in edge cases: "AI healthcare platform" looks similar to both
Technology Excellence and healthcare categories in embedding space, but a cross-encoder
can distinguish based on the full category description.

**Benchmark:** Pinecone Rerank V0 achieves highest average NDCG@10 on BEIR, surpasses
competitors on 6/12 datasets. For ambiguous queries specifically: 89% relevance vs 34%
for vector-only approaches.

**Practical sizing:** pass 20 candidates, return top-5. Below 10 candidates you miss
relevant ones ranked low by bi-encoder; above 50, latency grows linearly (~8ms/pair).

**Where to change:** `recommendationEngine.ts:166` — after `performSimilaritySearch`,
add a `rerankResults(query, results)` step. Retrieve limit=20, rerank, slice to 10.

**Pinecone Rerank API:**
```typescript
const reranked = await pinecone.inference.rerank(
  "pinecone-rerank-v0",
  originalQuery,           // The user's original nomination description
  candidates.map(r => r.description),
  { topN: 10 }
);
```

---

### Fix 3 — Multi-query HyDE (handles semantic ambiguity)

Instead of one HyDE expansion, generate 3 variants with different framings, run parallel
searches, union + deduplicate, then rerank with Fix 2.

**Three framings:**
1. Achievement-focused: "What was accomplished and its impact"
2. Industry/domain-focused: "What sector and organization type this belongs to"
3. Award-term-focused: "How this maps to award language (excellence, recognition, innovation)"

Mature production RAG systems do not pick one strategy — they adapt dynamically:
use HyDE for short queries, Multi-Query when ambiguity is high, union + rerank always.

**Where to change:** `embeddingManager.ts:170` — add `generateMultiQueryExpansions()`
that calls `generateRichSearchQuery` with 3 different system prompt framings.
In `recommendationEngine.ts`, run 3 parallel `performSimilaritySearch` calls (already
async), union results by `category_id` keeping highest score, then rerank.

---

### Fix 4 — Re-enable intent detection as soft boost (not hard filter)

The detection logic is already written and working. The issue was it was wired as a hard
SQL filter that removed categories. Instead: run it after retrieval, apply a score boost.

```typescript
const categoryTypes = await this.embeddingMgr.detectCategoryTypes(context);
// Don't filter — boost matching results
if (categoryTypes) {
  recommendations = recommendations.map(r => ({
    ...r,
    similarity_score: categoryTypes.some(t => 
      r.achievement_focus?.some(f => f.toLowerCase().includes(t.replace('_', ' ')))
    ) ? Math.min(0.95, r.similarity_score + 0.08) : r.similarity_score
  }));
  recommendations.sort((a, b) => b.similarity_score - a.similarity_score);
}
```

This adds 8% to categories whose `achievement_focus` metadata matches the detected intent.
It cannot return 0 results because it never removes anything.

---

## Implementation Order

| # | Fix | File | Effort | Impact on edge cases |
|---|---|---|---|---|
| 1 | Populate `contextual_prefix` in upsert | `embeddingManager.ts:566` | 30 min | Low-medium |
| 2 | Pinecone Rerank after retrieval | `recommendationEngine.ts:166` | 2-3 hrs | **High** |
| 3 | Re-enable intent as soft boost | `recommendationEngine.ts:138` | 1 hr | Medium |
| 4 | Multi-query HyDE (3 variants) | `embeddingManager.ts:170` | 3-4 hrs | High (recall) |

Fix 2 + Fix 3 together should close the majority of edge case failures without
touching the working HyDE pipeline at all.

---

## Sources

- [Pinecone Rerankers & Two-Stage Retrieval](https://www.pinecone.io/learn/series/rag/rerankers/)
- [Pinecone Rerank V0 Announcement](https://www.pinecone.io/blog/pinecone-rerank-v0-announcement/)
- [Multi-Query RAG: Dramatically Improve Retrieval Accuracy](https://dev.to/sreeni5018/multi-query-retriever-rag-how-to-dramatically-improve-your-ais-document-retrieval-accuracy-5892)
- [Retrieval is the Bottleneck: HyDE, Query Expansion, Multi-Query RAG](https://medium.com/@mudassar.hakim/retrieval-is-the-bottleneck-hyde-query-expansion-and-multi-query-rag-explained-for-production-c1842bed7f8a)
- [Cross-Encoder Reranking Improves RAG Accuracy by 40%](https://app.ailog.fr/en/blog/news/reranking-cross-encoders-study)
- [DMQR-RAG: Diverse Multi-Query Rewriting](https://openreview.net/forum?id=lz936bYmb3)
- [Query Augmentation: Expansion and Transformation](https://apxml.com/courses/optimizing-rag-for-production/chapter-2-advanced-retrieval-optimization/query-augmentation-rag)
