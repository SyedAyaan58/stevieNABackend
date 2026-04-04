# RAG Optimization Research
## stevieNABackend — Production Improvement Plan

> Researched: April 2026 | Goal: ≥97% retrieval accuracy, lower cost, lower latency

---

## Current System Snapshot

| Component | Current |
|---|---|
| Embeddings | text-embedding-3-small (1536 dims), Redis-cached 7d |
| Vector DB | Pinecone + pgvector (IVFFlat, lists=100) |
| Chunking | 1000 chars, 200 char overlap |
| Query expansion | HyDE — working well, keep |
| Keyword search | BM25 attempted, failed — do not retry |
| LLM | gpt-4o-mini (most tasks), gpt-4o (award search) |
| Cache | Redis (embeddings), Supabase (web scrape results) |

---

## 1. RAG ACCURACY (Priority 1 — target 97%+)

### 1.1 Contextual Retrieval (Highest ROI — implement first)

Anthropic's own technique. Before embedding each chunk, prepend a short LLM-generated
context sentence that situates the chunk within its source document. This makes chunks
self-contained and dramatically reduces retrieval failures.

**Results:**
- Contextual Embeddings alone: 35% reduction in failed retrievals (5.7% → 3.7%)
- Contextual Embeddings + reranking: **67% reduction in failed retrievals**
- Cost of contextualization: ~$1.02 per million document tokens (cheap with prompt caching)

**How it works:**
```
Original chunk: "The winner will be announced in March."
With context:   "This chunk is from the American Business Awards FAQ.
                 The winner will be announced in March."
```

**Why it fits this system:**
- No keyword search needed (avoids the BM25 failure)
- Extends existing HyDE pipeline (both are query-side + doc-side expansion)
- Can use Claude Haiku for contextualization — very cheap with prefix caching
- Anthropic provides a production cookbook at platform.claude.com/cookbook

**Implementation path:**
1. During document ingestion (`documentManager.ts`), call Claude to generate a
   1-2 sentence context for each chunk
2. Prepend context to chunk text before sending to `embeddingManager.ts`
3. Store both original and contextualized text in the DB
4. Use prompt caching (static document preamble) to reduce cost by 90%

---

### 1.2 Cross-Encoder Re-ranking (Second layer — combine with 1.1)

After vector retrieval returns top-N candidates, pass query + each candidate to a
cross-encoder model that jointly scores relevance. Much more accurate than bi-encoder
similarity alone because it sees query and document together.

**Results:** 18–42% precision improvement, ~50–100ms added latency

**Best options for production (2025–2026):**

| Model | Speed | Accuracy | Cost |
|---|---|---|---|
| **Pinecone Rerank v0** | Fastest (native) | +60% on Fever vs Google Semantic Ranker | Per-call |
| **Cohere Rerank 3 Nimble** | Fast | High, designed for prod | Per-call |
| **Cohere Rerank 4** | Moderate | SOTA, multilingual | Per-call |
| **BGE-Reranker** | Self-hosted | Very high | Infra cost |

**Recommendation:** Use **Pinecone Rerank v0** since you already use Pinecone —
it is native to the pipeline, no new vendor, minimal integration effort.

**Implementation path:**
1. Increase initial retrieval from top-10 to top-20 from Pinecone
2. Pass top-20 results + original query to Pinecone Rerank
3. Keep only top-5 for context injection into LLM prompt
4. Add latency tracking in Prometheus metrics

---

### 1.3 Semantic Chunking (Upgrade from fixed-size)

Current: 1000-char fixed chunks with 200-char overlap.

Semantic chunking splits on topic boundaries (detects similarity drops between adjacent
sentences) rather than character count. Keeps semantically coherent units together.

**Results:** Up to 70% accuracy boost in benchmarks vs naive fixed-size chunking

**Options:**
- `langchain.text_splitter.SemanticChunker` (uses embedding similarity, no extra API)
- `llama-index` semantic splitter
- Custom: embed adjacent sentence pairs, split where cosine similarity drops below 0.7

**Recommendation:** Apply to new document ingestion first. Re-embed existing corpus
incrementally. The 200-char overlap is partially compensating for fixed-size boundary
errors — semantic chunking eliminates the root cause.

---

### 1.4 Late Chunking (Alternative to semantic — complementary)

Encode the entire document with a long-context embedding model first, then pool
token-level embeddings to form chunk-level vectors. Chunks retain full document context
without needing a separate LLM contextualization call.

**Best for:** Long documents where context from the beginning is critical for
understanding chunks in the middle/end.

**Tradeoff:** Requires a long-context embedding model (e.g., `text-embedding-3-large`
or `jina-embeddings-v3`). Higher embedding cost per document.

**Recommendation:** Use as a future upgrade after 1.1 + 1.2 are validated.

---

### 1.5 Multi-Query Retrieval (Complements existing HyDE)

Instead of one expanded query, generate 3-5 alternative phrasings of the user's query,
retrieve for each, then union and deduplicate results before re-ranking.

**Results:** Higher recall — catches documents that any single query phrasing would miss

**Implementation:** Add a query-diversification step before the HyDE expansion in
`embeddingManager.ts`. Use gpt-4o-mini at temperature=0.7, ~100 tokens, very cheap.

---

## 2. TOKEN COST OPTIMIZATION

### 2.1 Semantic Response Caching (Biggest win — build on existing Redis)

You already have Redis. Add a semantic cache layer in front of LLM calls:
- Embed the incoming query
- Search Redis for cached (query_embedding, response) pairs with cosine similarity > 0.87
- If hit: return cached response in <100ms, no LLM call
- If miss: call LLM, cache the result

**Results:**
- 60–73% reduction in LLM API calls for repetitive workloads
- Cache hits: 0.052s vs 1.67s LLM call (96.9% latency reduction)
- Effective threshold: 0.85–0.92 cosine similarity (tune to your false-positive tolerance)

**Why this fits:** Award search queries ("What is the deadline for ABA?") repeat heavily.
Stevie Awards info doesn't change daily. 7-day TTL is appropriate.

**Implementation:** Add a `semanticResponseCache.ts` service that wraps `openaiService.ts`.
Use the existing Redis client (`ioredis`) + vector similarity check.

---

### 2.2 OpenAI Prompt Caching (Free, already partially available)

OpenAI automatically caches prompt prefixes ≥1024 tokens. Cache hits cost 50% less.
Structure prompts so the static system prompt + static context comes first,
dynamic user content last — maximizing cache hits.

**Results:** 50% input cost reduction on cached prefix tokens

**Action:** Audit prompts in `openaiService.ts` and `unifiedChatbotService.ts`.
Move static instructions and any static document context to the beginning of prompts.
This is a zero-effort change with immediate cost impact.

---

### 2.3 Anthropic Prompt Caching (If switching synthesis to Claude)

If you move the award search synthesis step to Claude (already using HyDE via Anthropic):
- Cache writes: 25% premium over base
- Cache reads: **90% discount** (10% of base price)

**At scale:** If your system prompt + retrieved context = 4000 tokens and 80% of requests
hit the cache, effective input cost drops by ~72%.

---

### 2.4 LLMLingua Prompt Compression (For long retrieved contexts)

A small fast model identifies and removes low-information tokens from retrieved chunks
before they enter the LLM context. Preserves semantic meaning.

**Results:** Up to 20x compression on verbose documents; typical: 6–10% cost savings
on already-lean prompts, up to 95% on verbose ones.

**Best for:** Award search synthesis where Jina-scraped pages can be 3000+ tokens of
mixed-quality content. Compress before sending to gpt-4o.

**Library:** `llmlingua` (Python) — would need a Python microservice or port to TS.
Alternative: Use Claude Haiku to summarize/compress scraped content before gpt-4o synthesis.

---

### 2.5 Model Routing by Complexity

Current: gpt-4o-mini for most, gpt-4o for award search synthesis.
This is already good. Potential enhancement:

- Simple factual queries → gpt-4o-mini (current)
- Multi-part/complex reasoning → gpt-4o (current)  
- Intent classification (short) → classify locally with a lightweight heuristic first,
  only call LLM when ambiguous

**Estimated savings:** 15–30% additional reduction for intent classification tasks.

---

## 3. LOW LATENCY

### 3.1 HNSW Index (Replace IVFFlat in pgvector)

Current pgvector index: IVFFlat with `lists=100`.

HNSW (Hierarchical Navigable Small World) is graph-based and significantly faster,
especially for lower-latency single-query workloads.

| Index | Query Time | Build Time | Recall |
|---|---|---|---|
| IVFFlat | ~5–50ms | Fast | Good (depends on `probes`) |
| **HNSW** | **<5ms** | Slower | **Higher (95–99%)** |

**Action:** Add a new HNSW index on `category_embeddings`:
```sql
CREATE INDEX idx_category_embeddings_hnsw
  ON category_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```
Keep IVFFlat as fallback. HNSW uses more memory but is faster for your scale.

Note: Pinecone already uses HNSW internally — this applies to pgvector side.

---

### 3.2 Parallel Retrieval Pipeline

Instead of sequential: embed → retrieve → rerank → generate,
run independent operations concurrently:

```
Query received
    ├── [async] Embed query (OpenAI)
    ├── [async] Check semantic cache (Redis)          ← NEW
    └── [wait for embed]
            ├── [async] Pinecone search
            └── [async] pgvector search (categories)
                    └── [merge + rerank]
                            └── LLM generation (streaming)
```

**Estimated savings:** 100–300ms off total pipeline for cache misses.

---

### 3.3 Streaming Already Implemented — Optimize SSE Chunk Size

If SSE streaming is active, ensure first token reaches client within 300ms.
Keep LLM context short enough that TTFT (time-to-first-token) stays low.
Truncate/compress retrieved context to the minimum needed before LLM call.

---

### 3.4 Connection Warm-Up

On server startup, send a dummy embedding request and dummy Pinecone query
to warm up TCP connections and connection pools. Eliminates cold-start latency
on the first real user request (~200–500ms saved on first request).

Add to `app.ts` startup sequence after all services initialize.

---

### 3.5 Embedding Cache TTL Tuning

Current: 7-day Redis TTL for embeddings. This is good.
For the semantic response cache (section 2.1), use 24–48h TTL with a
time-based invalidation hook when Stevie Awards data changes (e.g., after
content admin updates documents via the ingestion pipeline).

---

## Implementation Priority Order

| # | Change | Impact | Effort | Dependency |
|---|---|---|---|---|
| 1 | **Contextual Retrieval** (doc-side context) | Accuracy +35–67% | Medium | Ingest pipeline |
| 2 | **Pinecone Rerank v0** | Accuracy +18–42% | Low | Pinecone account |
| 3 | **Semantic Response Cache** | Cost -60%, Latency -97% on hits | Medium | Existing Redis |
| 4 | **OpenAI prompt prefix ordering** | Cost -50% on cached tokens | Very Low | None |
| 5 | **HNSW index on pgvector** | Latency -50–80% on DB queries | Low | Migration |
| 6 | **Parallel retrieval pipeline** | Latency -100–300ms | Medium | Refactor |
| 7 | **Semantic chunking** | Accuracy +20–40% | High | Re-ingestion |
| 8 | **Multi-query retrieval** | Recall +15–25% | Low | embeddingManager |
| 9 | **LLMLingua compression** | Cost -10–30% on long contexts | High | New service |

---

## Sources

- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Anthropic Contextual Embeddings Cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide)
- [Anthropic Contextual Retrieval — 67% accuracy boost](https://www.maginative.com/article/anthropics-contextual-retrieval-technique-enhances-rag-accuracy-by-67/)
- [Building Production RAG with Contextual Retrieval](https://medium.com/@reliabledataengineering/building-production-rag-with-anthropics-contextual-retrieval-complete-python-implementation-f8a436095860)
- [Pinecone Rerankers & Two-Stage Retrieval](https://www.pinecone.io/learn/series/rag/rerankers/)
- [Pinecone Rerank v0 Announcement](https://www.pinecone.io/blog/pinecone-rerank-v0-announcement/)
- [Cohere Rerank 4 for RAG](https://orq.ai/blog/from-noise-to-signal-how-cohere-rerank-4-improves-rag)
- [Ultimate Guide to Reranking Models 2026](https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025)
- [Document Chunking: 9 Strategies, 70% Accuracy Boost](https://langcopilot.com/posts/2025-10-11-document-chunking-for-rag-practical-guide)
- [How I Improved RAG Accuracy from 73% to 100%](https://dev.to/oharu121/how-i-improved-rag-accuracy-from-73-to-100-a-chunking-strategy-comparison-3nao)
- [Building Production RAG 2026 Guide](https://blog.premai.io/building-production-rag-architecture-chunking-evaluation-monitoring-2026-guide/)
- [GPT Semantic Cache — ArXiv](https://arxiv.org/abs/2411.05276)
- [Semantic Caching: Cut API Bills 60%](https://blog.premai.io/semantic-caching-for-llms-how-to-cut-api-bills-by-60-without-hurting-quality/)
- [Redis LLM Token Optimization 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Prompt Caching — ngrok blog](https://ngrok.com/blog/prompt-caching)
- [LLM Cost Optimization Guide — Koombea](https://ai.koombea.com/blog/llm-cost-optimization)
- [Prompt Compression — MachineLearningMastery](https://machinelearningmastery.com/prompt-compression-for-llm-generation-optimization-and-cost-reduction/)
- [RAG Low Latency Case Study — 60% reduction](https://devilsdev.github.io/rag-pipeline-utils/blog/reducing-retrieval-latency-case-study)
- [Real-Time RAG Streaming Vector Search](https://www.striim.com/blog/real-time-rag-streaming-vector-embeddings-and-low-latency-ai-search/)
- [RAG at Scale — Redis 2026](https://redis.io/blog/rag-at-scale/)
- [Advanced RAG Techniques — Neo4j](https://neo4j.com/blog/genai/advanced-rag-techniques/)
