# Latency Reduction Plan
**Created:** April 9, 2026  
**Review date:** April 12, 2026  
**Status:** Planned — not yet implemented

---

## Current Request Breakdown

```
Recommendation request flow (estimated):
┌─────────────────────────────────────────────────────────┐
│ 1. Multi-HyDE (2 LLM calls parallel)     ~400-500ms    │
│ 2. 3 embeddings (parallel)                ~100-150ms    │
│ 3. 3 vector searches (parallel)           ~10-30ms      │
│ 4. Pinecone reranker                      ~200-300ms    │
│ 5. Intent detection (LLM or keyword)      ~0-300ms      │
│ 6. Geo eligibility lookup                 ~50-100ms     │
│ 7. Explanation generation (LLM)           ~500-800ms    │
│                                                         │
│ TOTAL (sequential parts):                ~1.2-2.2s      │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Wins (this week)

| # | Change | Saving | Effort | Details |
|---|--------|--------|--------|---------|
| 1 | **Cache embeddings in Redis** | ~100-150ms | Small | `cacheManager.getEmbedding/setEmbedding` already exists but isn't used in the Multi-HyDE path. Same user context = skip embedding API calls entirely. |
| 2 | **Stream explanations via SSE** | Perceived ~500-800ms | Medium | Return recommendations immediately, stream `match_reasons` as they generate. Needs SSE response format change on frontend. |
| 3 | **Skip reranker when <20 candidates** | ~200-300ms | Tiny | If vector search returned few results, reranking adds latency without improving order. 1 conditional. |
| 4 | **Keyword-only intent detection** | ~0-300ms | Tiny | LLM fallback for intent is rarely needed. Set `USE_LLM_INTENT_DETECTION=false` in env. |

## Medium-Term (next sprint)

| # | Change | Saving | Effort | Details |
|---|--------|--------|--------|---------|
| 5 | **Drop to 2 HyDE queries** | ~30-50ms + 1 search | Measure first | If the template query isn't surfacing unique results vs. balanced, remove it. Requires A/B testing. |
| 6 | **Precompute geo eligibility** | ~50-100ms | Small | Cache country→programs mapping in Redis on startup instead of computing per-request. |
| 7 | **Connection pooling / keep-alive** | ~20-50ms per DB call | Config | Ensure Supabase client reuses HTTP connections. |

## Bigger Wins (requires infra)

| # | Change | Saving | Effort | Details |
|---|--------|--------|--------|---------|
| 8 | **HNSW index** (already planned) | ~10-20ms | SQL migration | Sub-10ms queries vs IVFFlat's ~20-30ms. Migration 017 already added `iterative_scan` support. |
| 9 | **Edge caching** | Entire request | Medium | Cache full recommendation responses for identical user contexts in Redis (5min TTL). |
| 10 | **Self-hosted reranker** | ~100-200ms | Large | Replace Pinecone reranker with local cross-encoder model. Eliminates network round-trip. |

---

## Targets

| Metric | Current | Target |
|--------|---------|--------|
| Time to first recommendation | ~1.5-2s | <1s |
| Time to full response (with explanations) | ~2-3s | <1.5s (stream explanations) |

---

## Implementation Order (suggested)

1. Fixes 3 + 4 (tiny, deploy immediately)
2. Fix 1 (embedding cache — small, high impact)
3. Fix 6 (geo precompute)
4. Fix 2 (SSE streaming — medium effort, biggest perceived improvement)
5. Measure, then decide on fixes 5, 8, 9, 10
