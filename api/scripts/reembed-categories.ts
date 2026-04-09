/// <reference types="node" />
/**
 * Re-embedding script for category_embeddings.
 *
 * 1. Deletes all existing rows in category_embeddings
 * 2. Fetches all categories from stevie_categories + stevie_programs
 * 3. For each category: generates a specific LLM contextual prefix using ALL available
 *    metadata (name, description, category_types, primary_focus, nomination_subject_type,
 *    org_types, geographic_scope, program). Handles empty descriptions gracefully.
 * 4. Builds full embedding text = prefix + structured text
 * 5. Embeds with text-embedding-3-small and upserts to category_embeddings
 *
 * Run: node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/reembed-categories.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 1000;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCategoryText(cat: any): string {
  const parts: string[] = [];

  // Focus areas
  const focus = (cat.achievement_focus as string[] || []);
  if (focus.length > 0) parts.push(`Focus areas: ${focus.join(', ')}.`);

  // Category name + description (if present)
  const desc = (cat.description || '').trim();
  parts.push(desc ? `${cat.category_name}. ${desc}.` : `${cat.category_name}.`);

  // Nomination subject type
  if (cat.nomination_subject_type) {
    parts.push(`Nominating: ${cat.nomination_subject_type}.`);
  }

  // Org types
  const orgTypes = (cat.applicable_org_types as string[] || []);
  if (orgTypes.length > 0) parts.push(`Eligible for: ${orgTypes.join(', ')}.`);

  // Program
  parts.push(`Program: ${cat.stevie_programs?.program_name || ''}.`);

  return parts.join(' ');
}

async function generateContextualPrefix(cat: any): Promise<string> {
  const programName = cat.stevie_programs?.program_name || '';
  const desc = (cat.description || '').trim();
  const categoryTypes = (cat.metadata?.category_types as string[] || []).join(', ');
  const primaryFocus = cat.metadata?.primary_focus || '';
  const nominationSubject = cat.nomination_subject_type || '';
  const orgTypes = (cat.applicable_org_types as string[] || []).join(', ');
  const geoScope = (cat.geographic_scope as string[] || []).join(', ');

  // Build rich context block for the LLM — include everything
  const contextBlock = [
    `Category name: ${cat.category_name}`,
    `Program: ${programName}`,
    desc ? `Description: ${desc}` : `Description: (none provided — infer from category name and types)`,
    `Nomination subject: ${nominationSubject} (who/what is being nominated)`,
    `Primary focus area: ${primaryFocus}`,
    `Category types: ${categoryTypes}`,
    `Eligible org types: ${orgTypes}`,
    `Geographic scope: ${geoScope}`,
  ].join('\n');

  const systemPrompt = `You are building a semantic search index for Stevie Awards. For each award category, write a 2-3 sentence description that makes it uniquely findable and distinguishable from similar categories.

Rules:
- Be SPECIFIC about what achievement qualifies. If description is empty, infer from the category name and types.
- State what the nomination subject is (individual person, team, company/organization, or product/service).
- Include one differentiating sentence: what separates this from adjacent categories in the same program.
- Use natural language — no bullet points, no markdown, no category name repeated verbatim.
- Output ONLY the 2-3 sentences.`;

  const userPrompt = `${contextBlock}\n\nWrite the discriminative contextual description:`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 160,
    });

    const prefix = response.choices[0]?.message?.content?.trim() || '';
    if (prefix.length > 20) return prefix;
  } catch (err: any) {
    console.warn(`  ⚠ LLM failed for "${cat.category_name}": ${err.message}`);
  }

  // Fallback: structured template using all available data
  const subjLabel = nominationSubject === 'individual' ? 'an individual'
    : nominationSubject === 'team' ? 'a team'
    : nominationSubject === 'product' ? 'a product or service'
    : 'an organization';
  return `This ${programName} award recognizes ${subjLabel} for achievement in ${primaryFocus || cat.category_name.toLowerCase()}. Eligible for ${orgTypes} organizations in ${geoScope}. Focus: ${categoryTypes}.`;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

const GLOBAL_PROGRAMS = new Set(['IBA', 'WOMEN', 'TECH', 'EMPLOYERS', 'SALES']);

function getGeoScope(programCode?: string): string[] {
  if (!programCode) return ['Global'];
  if (GLOBAL_PROGRAMS.has(programCode)) return ['Global'];
  if (programCode === 'ABA') return ['America'];
  if (programCode === 'MENA') return ['Middle East', 'North Africa'];
  if (programCode === 'APAC') return ['Asia', 'Pacific'];
  if (programCode === 'GERMAN') return ['Germany'];
  return ['Global'];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('Category Re-Embedding Script');
  console.log('='.repeat(60));

  // Step 1: Fetch all categories (paginated — Supabase default limit is 1000)
  console.log('\nFetching categories...');
  const categories: any[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;

  while (true) {
    const { data, error: fetchError } = await supabase
      .from('stevie_categories')
      .select(`
        id,
        category_name,
        description,
        achievement_focus,
        applicable_org_types,
        applicable_org_sizes,
        geographic_scope,
        nomination_subject_type,
        metadata,
        stevie_programs (
          program_name,
          program_code
        )
      `)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (fetchError) {
      console.error('Failed to fetch categories:', fetchError.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    categories.push(...data);
    console.log(`  Fetched page ${page + 1}: ${data.length} rows (total so far: ${categories.length})`);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`Found ${categories.length} categories across ${new Set(categories.map((c: any) => c.stevie_programs?.program_code)).size} programs.`);

  // Step 2: Delete all existing category_embeddings
  console.log('\nDeleting existing category_embeddings...');
  const { error: deleteError } = await supabase
    .from('category_embeddings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (deleteError) {
    console.error('Failed to delete existing embeddings:', deleteError.message);
    process.exit(1);
  }
  console.log('Existing embeddings deleted.\n');

  // Step 3: Re-embed all categories
  let success = 0;
  let failed = 0;
  const failedCategories: string[] = [];

  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = (categories as any[]).slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (cat: any, batchIdx: number) => {
        const globalIdx = i + batchIdx + 1;
        const programCode = cat.stevie_programs?.program_code || '?';
        const label = `[${globalIdx}/${categories.length}] ${cat.category_name} (${programCode})`;

        try {
          const contextualPrefix = await generateContextualPrefix(cat);
          const structuredText = formatCategoryText(cat);
          const embeddingText = `${contextualPrefix}\n\n${structuredText}`;
          const embedding = await generateEmbedding(embeddingText);

          const { error: upsertError } = await supabase
            .from('category_embeddings')
            .upsert({
              category_id: cat.id,
              embedding,
              embedding_text: embeddingText,
              contextual_prefix: contextualPrefix,
              // Denormalize ALL filter + display fields for zero-join retrieval.
              metadata: {
                program_code:            cat.stevie_programs?.program_code ?? null,
                category_code:           cat.metadata?.category_code ?? null,
                is_women_award:          cat.stevie_programs?.program_code === 'WOMEN',
                group_name:              cat.metadata?.group_name ?? null,
                group_description:       cat.metadata?.group_description ?? null,
                entry_format:            cat.metadata?.entry_format ?? null,
                category_types:          (cat.metadata?.category_types as string[] ?? []),
                geographic_scope:        getGeoScope(cat.stevie_programs?.program_code),
                applicable_org_types:    (cat.metadata?.applicable_org_types as string[] ?? cat.applicable_org_types as string[] ?? []),
                applicable_org_sizes:    (cat.metadata?.applicable_org_sizes as string[] ?? cat.applicable_org_sizes as string[] ?? []),
                nomination_subject_type: cat.metadata?.nomination_subject_type ?? cat.nomination_subject_type ?? null,
                achievement_focus:       (cat.metadata?.achievement_focus as string[] ?? []),
              },
            });

          if (upsertError) throw new Error(upsertError.message);

          console.log(`  ✓ ${label}`);
          success++;
        } catch (err: any) {
          console.error(`  ✗ ${label} — ${err.message}`);
          failedCategories.push(cat.category_name);
          failed++;
        }
      })
    );

    if (i + BATCH_SIZE < categories.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done. Success: ${success} | Failed: ${failed}`);
  if (failedCategories.length > 0) {
    console.log('Failed categories:', failedCategories.join(', '));
    console.log('Re-run the script to retry failed ones — upsert is idempotent.');
  }
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
