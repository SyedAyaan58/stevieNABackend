# Production Issues — Full Investigation
## RAG Pipeline + QA Agent

> Investigated: April 2026 | All issues found by reading actual code + live DB schema

---

## CRITICAL Issues (breaking things silently right now)

---

### Issue 1 — HyDE is OFF by default in production

**File:** `embeddingManager.ts:216`

```typescript
const useRichExpansion = process.env.RICH_QUERY_EXPANSION === "true" || process.env.RICH_QUERY_EXPANSION === "1";
```

HyDE — the entire query expansion strategy — is **gated behind an env flag that defaults to false**.
If `RICH_QUERY_EXPANSION` is not set in the production `.env`, every user query goes through
the bare `formatUserQueryText()` fallback (just concatenates fields). The whole accuracy
improvement is silently disabled.

**Fix:** Either hard-enable HyDE (remove the flag), or at minimum verify `RICH_QUERY_EXPANSION=true`
is set in all environments. Best practice per 2025 research: make HyDE the default, with a flag
to disable for debugging only.

---

### Issue 2 — Intent boost checks the wrong column

**File:** `recommendationEngine.ts:239-243`

```typescript
const matchesIntent = detectedCategoryTypes!.some(t =>
  (r.achievement_focus || []).some(f =>
    f.toLowerCase().includes(t.replace(/_/g, ' '))
  )
);
```

Intent types detected: `healthcare_medical`, `social_impact`, `technology`, `marketing_media`, etc.

What's actually in `achievement_focus` in the DB for almost every category:
```json
["innovation", "growth", "leadership"]
```

These never match. `"healthcare_medical".replace(/_/g, ' ')` = `"healthcare medical"` — not in
`["innovation", "growth", "leadership"]`. The intent boost **never fires** for any category.

The real type data is in `metadata.category_types`:
```json
["education_training", "social_impact", "marketing_media"]
```

**Fix:** Change the boost to check `metadata.category_types` instead of `achievement_focus`.
The `Recommendation` interface already carries `metadata` — it's accessible.

---

### Issue 3 — Reranker uses raw description, not the HyDE-expanded query

**File:** `recommendationEngine.ts:179`

```typescript
const rerankQuery = context.description;
```

The reranker scores relevance between `context.description` and each category. But HyDE already
generated a rich multi-sentence paragraph that captures the achievement far better than the raw
description. Passing the raw description to the reranker wastes the work HyDE did.

**Fix:** Pass the HyDE-expanded query text to the reranker. Return it from `generateUserEmbedding`
alongside the embedding, or store it temporarily in context.

---

### Issue 4 — QA Agent bypasses the request queue entirely

**File:** `qaAgent.ts:151-157`

```typescript
let response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  tools,
  ...
});
```

Direct `openai` client call — bypasses `openaiService` completely. This means:
- No circuit breaker (if OpenAI is degraded, QA agent crashes instead of failing fast)
- No retry with exponential backoff on 429/5xx
- No token tracking in Prometheus metrics
- No request queue (can overwhelm rate limits when concurrent users hit QA)
- A separate OpenAI client instance initialized on every import

**Fix:** All OpenAI calls must go through `openaiService.chatCompletion()`.

---

### Issue 5 — QA Agent tool calls execute serially

**File:** `qaAgent.ts:177`

```typescript
for (const toolCall of toolCalls) {
  // executes one at a time
}
```

When the LLM decides to call multiple tools (e.g., `search_knowledge_base` + `search_stevie_website`),
they run one after the other. Each tool call can take 1-3 seconds. Serial = 2-6s for two tools.

**Fix:** `await Promise.all(toolCalls.map(tc => executeToolCall(tc)))`, then push all results.

---

## HIGH Issues (degraded accuracy/performance)

---

### Issue 6 — IVFFlat index — should be HNSW

**File:** `database/migrations/000_initial_schema.sql:102`

```sql
CREATE INDEX idx_category_embeddings_vector
  ON category_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

Supabase officially recommends HNSW for production RAG because:
- HNSW doesn't degrade with data changes (IVFFlat does — requires rebuild after bulk writes)
- HNSW doesn't require data to exist at build time (we just deleted + re-inserted all 1348 rows — IVFFlat index is now stale)
- HNSW delivers higher recall without tuning `probes`
- Sub-5ms queries vs 5-50ms for IVFFlat at this scale

After the re-embedding script finishes, the IVFFlat index is built on the old data distribution.
It needs to be rebuilt, or better — replaced with HNSW.

**Fix:** New migration:
```sql
DROP INDEX IF EXISTS idx_category_embeddings_vector;
CREATE INDEX idx_category_embeddings_hnsw
  ON category_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

### Issue 7 — Intent detection and embedding run sequentially, adding latency

**File:** `recommendationEngine.ts:122-140`

```typescript
const userEmbedding = await this.embeddingMgr.generateUserEmbedding(context); // ~600ms
// then...
detectedCategoryTypes = await this.embeddingMgr.detectCategoryTypes(context); // ~400ms
```

These are independent — intent detection doesn't need the embedding result. Running them
sequentially adds ~400ms to every request.

**Fix:** `Promise.all([generateUserEmbedding(), detectCategoryTypes()])` — run in parallel.
Save ~400ms per recommendation request.

---

### Issue 8 — QA Agent context window grows unbounded

**File:** `qaAgent.ts:174, 207`

Each tool call appends the full raw result to `messages`. With 3 tool calls × 2000 token outputs
+ system prompt + conversation history, the context can hit 12,000+ tokens in a single turn.
No trimming, no summarization, no token budget check.

Per 2025 production best practice: stay below 80% of token limit. gpt-4o-mini has 128k context
so it won't error, but cost per QA query balloons silently.

**Fix:** Truncate tool results to 1500 tokens max before appending. Already partially done
(`substring(0, 2000)`) but chars ≠ tokens. Use a token estimate (~4 chars/token) and cap at 1500.

---

### Issue 9 — No minimum similarity score enforced

**File:** `recommendationEngine.ts:196`

```typescript
const minScore = parseFloat(process.env.MIN_SIMILARITY_SCORE || '0');
```

Defaults to 0 — means a category with 0.15 cosine similarity (essentially unrelated) can appear
in recommendations. Users would see irrelevant results with no indication of low confidence.

**Fix:** Set `MIN_SIMILARITY_SCORE=0.35` in production env. Research shows 0.35–0.45 is the
right floor for cosine similarity with text-embedding-3-small for domain-specific matching.

---

### Issue 10 — `searchKnowledgeBase` in QA Agent passes no metadata filter to Pinecone

**File:** `qaAgent.ts:251`

```typescript
const results = await pineconeClient.query(embedding, 5);
```

No filter — searches ALL documents in the Pinecone index regardless of program or category.
If the user asks about "ABA deadlines", KB results could include APAC or MENA documents
that happen to be semantically similar, causing cross-program contamination.

**Fix:** If the detected program is known from the query, pass a Pinecone metadata filter:
```typescript
const filter = detectedProgram ? { program: detectedProgram } : undefined;
await pineconeClient.query(embedding, 5, filter);
```

---

## Summary Table

| # | Issue | Severity | File | Fix |
|---|---|---|---|---|
| 1 | HyDE disabled by default | **Critical** | `embeddingManager.ts:216` | Hard-enable or set env var |
| 2 | Intent boost checks wrong column (`achievement_focus` vs `metadata.category_types`) | **Critical** | `recommendationEngine.ts:239` | Check `metadata.category_types` |
| 3 | Reranker uses raw description not HyDE query | **Critical** | `recommendationEngine.ts:179` | Pass expanded query text |
| 4 | QA Agent bypasses openaiService | **Critical** | `qaAgent.ts:151` | Use `openaiService.chatCompletion()` |
| 5 | QA Agent tool calls run serially | High | `qaAgent.ts:177` | `Promise.all()` |
| 6 | IVFFlat index stale after bulk re-embed | High | SQL migration | Replace with HNSW |
| 7 | Embedding + intent detection run sequentially | High | `recommendationEngine.ts:122` | `Promise.all()` |
| 8 | QA Agent context window unbounded | High | `qaAgent.ts:174` | Token-budget tool results |
| 9 | No minimum similarity score | High | `recommendationEngine.ts:196` | Set `MIN_SIMILARITY_SCORE=0.35` |
| 10 | KB search has no program filter | Medium | `qaAgent.ts:251` | Pass metadata filter |

---

## Sources

- [Supabase HNSW Index Docs](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes)
- [IVFFlat vs HNSW pgvector](https://dev.to/philip_mcclarence_2ef9475/ivfflat-vs-hnsw-in-pgvector-which-index-should-you-use-305p)
- [HyDE Production — Conditional vs Always On](https://medium.com/@mudassar.hakim/retrieval-is-the-bottleneck-hyde-query-expansion-and-multi-query-rag-explained-for-production-c1842bed7f8a)
- [Context Window Overflow 2026](https://redis.io/blog/context-window-overflow/)
- [Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- [Agentic RAG Tool Selection](https://airbyte.com/agentic-data/ai-context-window-optimization-techniques)
