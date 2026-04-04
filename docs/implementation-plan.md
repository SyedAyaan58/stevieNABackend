# Implementation Plan — RAG Accuracy Fix
## What We're Doing & Why, Step by Step

---

## The Core Problem (plain english)

The current contextual prefix ("This award category is from the Asia-Pacific Stevie Awards
program, recognizing innovative achievements in workplace culture...") is **template-generated**.
Every category in the same program gets nearly identical prefix text. It adds zero discriminative
signal to the embedding — two different workplace categories in Asia-Pacific will still look
almost identical in vector space.

On top of that, there is **no reranking layer**. After pgvector returns top-10 results by cosine
similarity, they go straight to the LLM with no second pass to verify which ones actually match.
This is where edge cases fall through.

---

## What We Are NOT Touching

- The HyDE query expansion (`generateRichSearchQuery`) — it works, leave it alone
- The SQL `search_similar_categories` function — works fine as-is
- Pinecone KB document search — separate system, not touched
- Any route/middleware/auth code

---

## Changes, In Order

---

### Step 1 — Write the plan doc *(this file)*

**File:** `docs/implementation-plan.md`

---

### Step 2 — Add `rerank()` to `pineconeClient.ts`

**File:** `api/src/services/pineconeClient.ts`

Pinecone SDK v7 has a native inference API for reranking. We add one new method:

```typescript
async rerank(query: string, documents: string[], topN: number): Promise<number[]>
```

- Calls `this.client.inference.rerank('pinecone-rerank-v0', query, documents, { topN })`
- Returns the reranked indices (so caller can reorder its result array)
- Has the same timeout + circuit breaker pattern as existing methods
- Falls back gracefully (returns original order) if rerank fails — never breaks recommendations

**Why Pinecone Rerank v0:** Already using Pinecone, no new vendor, no new API key. Native to
the SDK. Highest NDCG@10 on BEIR benchmarks, specifically outperforms on ambiguous queries.

---

### Step 3 — Add `generateContextualPrefix()` to `embeddingManager.ts`

**File:** `api/src/services/embeddingManager.ts`

New method that calls gpt-4o-mini with a prompt designed to produce a **specific, discriminative**
2-3 sentence prefix for a category. The prompt:

- Tells the model: "You have the full list of categories in this program. Write a prefix that
  distinguishes THIS category from similar ones."
- Forces it to describe: what specifically qualifies, what does NOT qualify, the key differentiator
- Uses temperature=0.1 (deterministic) — we want factual, not creative
- ~100-150 tokens max output

Example output for "Innovative Achievement in Workplace Culture" (Asia-Pacific):
```
This category specifically recognizes HR-led or executive-led initiatives that measurably 
transformed internal employee culture — such as DEI programs, engagement overhauls, or 
well-being frameworks — within an Asia-Pacific organization. It does NOT cover customer-facing 
products, external community work, or general operational excellence. The key differentiator is 
that the achievement must be internal and employee-focused, with measurable outcomes like 
retention rates, survey scores, or participation metrics.
```

That is genuinely discriminative. Two similar categories would now have different prefixes
that push them apart in vector space.

---

### Step 4 — Update `precomputeCategoryEmbedding()` in `embeddingManager.ts`

**File:** `api/src/services/embeddingManager.ts`

Currently stores:
```typescript
{ category_id, embedding, embedding_text }
```

After this change stores:
```typescript
{ category_id, embedding, embedding_text, contextual_prefix }
```

Where:
- `contextual_prefix` = LLM-generated specific context (from Step 3)
- `embedding_text` = `contextual_prefix + "\n\n" + formatCategoryText(category)`
- `embedding` = embedding of the combined text

This immediately activates the `+0.02 per keyword match on contextual_prefix` boost
already written in the SQL function — for free.

---

### Step 5 — Re-enable intent detection as soft boost in `recommendationEngine.ts`

**File:** `api/src/services/recommendationEngine.ts`

Currently (line 138):
```typescript
// Step 3.5: Intent detection DISABLED (was causing issues)
```

The issue was it was a **hard SQL filter** — it removed categories. We instead run it
**after retrieval** as a score adjustment:

```typescript
const categoryTypes = await this.embeddingMgr.detectCategoryTypes(context);
if (categoryTypes && categoryTypes.length > 0) {
  recommendations = recommendations.map(r => {
    const matchesIntent = categoryTypes.some(t =>
      r.achievement_focus?.some(f => f.toLowerCase().includes(t.replace('_', ' ')))
    );
    return {
      ...r,
      similarity_score: matchesIntent
        ? Math.min(0.95, r.similarity_score + 0.08)
        : r.similarity_score,
    };
  });
  recommendations.sort((a, b) => b.similarity_score - a.similarity_score);
}
```

- Never removes anything → can never return 0 results
- Boosts categories whose `achievement_focus` metadata matches detected intent by 8%
- Re-sorts after boost

---

### Step 6 — Add reranking step in `recommendationEngine.ts`

**File:** `api/src/services/recommendationEngine.ts`

Change retrieval from top-10 to top-20, then after similarity search add:

```typescript
// Rerank top-20 results using Pinecone cross-encoder
const queryText = context.description || '';
const rerankIndices = await pineconeClient.rerank(
  queryText,
  similarityResults.map(r => `${r.category_name}. ${r.description}`),
  limit  // return top-N after reranking
);
const rerankedResults = rerankIndices.map(i => similarityResults[i]);
```

The cross-encoder reads `queryText + category description` as a pair and scores true
relevance — this is what catches edge cases where cosine similarity was ambiguous.

Reranking is placed **before** the soft intent boost (Step 5), so the order is:
```
retrieve top-20 → rerank to top-10 → soft intent boost → deduplicate → return
```

---

### Step 7 — Create `scripts/reembed-categories.ts`

**File:** `api/scripts/reembed-categories.ts`

One-time script. Run once after all code changes are deployed.

What it does:
1. Connects to Supabase using env vars
2. Fetches all rows from `stevie_categories` JOIN `stevie_programs` (the backup data source)
3. For each category, calls `generateContextualPrefix()` to get LLM-generated prefix
4. Builds full embedding text = prefix + `formatCategoryText()` output
5. Generates embedding with `text-embedding-3-small`
6. Upserts to `category_embeddings` with `contextual_prefix` populated
7. Processes in batches of 5 with 1s delay between batches (respects OpenAI rate limits)
8. Logs progress: `[12/147] Embedded: Innovative Achievement in Workplace Culture (APSA)`

**Run with:**
```bash
cd api && npx tsx --env-file=.env scripts/reembed-categories.ts
```

No data needs to be deleted first — upsert handles it. If a category already has an
embedding, it gets overwritten with the better version.

---

## File Change Summary

| File | Type | What changes |
|---|---|---|
| `api/src/services/pineconeClient.ts` | Edit | Add `rerank()` method |
| `api/src/services/embeddingManager.ts` | Edit | Add `generateContextualPrefix()`, update `precomputeCategoryEmbedding()` |
| `api/src/services/recommendationEngine.ts` | Edit | Re-enable intent as soft boost, add rerank step, increase retrieval to 20 |
| `api/scripts/reembed-categories.ts` | New | One-time re-embedding script |

---

---

## Dead Code & Cleanup Plan

Every item below was identified by reading the actual files — not guesses.

---

### Cleanup 1 — `console.log` debug statements in production code

**File:** `embeddingManager.ts:262-266`

```typescript
console.log('\n' + '='.repeat(80));
console.log('🎯 HyDE GENERATED DOCUMENT:');
console.log('='.repeat(80));
console.log(queryText);
console.log('='.repeat(80) + '\n');
```

These are debug prints that go to stdout in production. The `logger.info("HYDE_DOCUMENT_GENERATED")` 
on line 258 already does the same thing via the structured logger. The `console.log` block 
should be deleted entirely — it leaks full user nomination text to raw stdout on every request.

---

### Cleanup 2 — `expandFocusAreas()` and `expandDescriptionForSearch()` — dead keyword expansion

**File:** `embeddingManager.ts:139-164`

```typescript
private expandFocusAreas(focus: string): string { ... }
private expandDescriptionForSearch(description: string): string { ... }
```

These are crude hardcoded if/else keyword matchers written before HyDE existed. They only 
cover ~8 keywords ("innovation", "ai", "product", "marketing") and miss everything else.
`generateRichSearchQuery()` (HyDE) replaced them completely and does this far better with LLM.

They are still called from `formatUserQueryText(context, enrichWithSynonyms: true)`, but
`formatUserQueryText` itself is only used as a fallback when `RICH_QUERY_EXPANSION=false`
or when HyDE fails. Since HyDE is the default and has its own fallback, these two methods
are never the primary path and produce worse results when they are.

**Delete both methods.** Remove `enrichWithSynonyms` parameter from `formatUserQueryText`
and call both focus and description without expansion (the raw values are fine — HyDE
handles expansion for real queries).

---

### Cleanup 3 — Dead parameters in `performSimilaritySearch()`

**File:** `embeddingManager.ts:481-483`

```typescript
_userNominationSubject?: string, // Unused - kept for backward compatibility
// ...
_userOrgType?: string, // Unused - kept for backward compatibility
```

Both parameters are prefixed `_` because they're never read. The call site in 
`recommendationEngine.ts:179-180` passes `undefined` for both. The DB RPC call passes 
`null` for both. Neither the code nor the database does anything with them.

**Remove both parameters** from the signature and the call site. Update the one call in 
`recommendationEngine.ts` to drop the two `undefined` args.

---

### Cleanup 4 — Stale comments in `recommendationEngine.ts`

**File:** `recommendationEngine.ts:169`

```typescript
note: 'REVERTED TO WORKING STATE - pure semantic search with geography filter only'
```

No longer accurate — we now have reranking and intent boost. Update the log message.

**File:** `recommendationEngine.ts:175`

```typescript
// Pure vector search (working version from migration 002)
```

Stale comment. Just says "vector search" now.

---

### Cleanup 5 — Hardcoded Technology Excellence program bias in SQL

**File:** `database/migrations/000_initial_schema.sql:226-229` and  
`database/migrations/010_rollback_to_working_state.sql:107-110`

```sql
+ CASE 
    WHEN sp.program_name = 'Stevie Awards for Technology Excellence' THEN program_boost_amount
    ELSE 0
  END
```

A hardcoded +5% boost for one specific program with no documented reason. It unfairly 
inflates Technology Excellence results regardless of whether the user's achievement is 
tech-related. Intent detection (now re-enabled as a soft boost) handles this correctly 
for all programs — if the user's achievement is tech-focused, the boost applies; if not, it 
doesn't. This SQL bias applies blindly.

**Write a new migration** that drops this `CASE` block from the scoring formula. The 
`program_boost_amount` variable declaration can be removed too.

---

### Cleanup 6 — Noisy default-value warning logs in `validateContextCompleteness()`

**File:** `recommendationEngine.ts:78-86`

```typescript
logger.info('using_default_org_type', { default: 'for_profit' });
logger.info('using_default_org_size', { default: 'small' });
logger.info('using_default_achievement_focus', { default: ['Innovation', 'Technology'] });
```

These fire on almost every request (most users don't provide org_type/size at the start 
of the intake flow). They're not warnings — just noise that fills log storage. Delete them.

---

### Cleanup Summary Table

| # | File | Lines | What to do |
|---|---|---|---|
| 1 | `embeddingManager.ts` | 262-266 | Delete `console.log` block |
| 2 | `embeddingManager.ts` | 139-164 | Delete `expandFocusAreas()` and `expandDescriptionForSearch()` |
| 3 | `embeddingManager.ts` | 481, 483 | Remove `_userNominationSubject` and `_userOrgType` params + call site |
| 4 | `recommendationEngine.ts` | 169, 175 | Update stale comments |
| 5 | SQL (both files) | scoring formula | Write migration to remove hardcoded program bias |
| 6 | `recommendationEngine.ts` | 78-86 | Delete noisy default-value info logs |

---

## Run Order After All Code Changes

1. Deploy code changes (or run locally with env vars set)
2. Run `npx tsx --env-file=.env scripts/reembed-categories.ts`
3. Wait for script to complete (~5-15 min depending on category count)
4. Test recommendations — existing queries should now be more accurate on edge cases
