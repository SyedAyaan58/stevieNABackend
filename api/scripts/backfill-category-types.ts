/// <reference types="node" />
/**
 * One-time backfill: classify every stevie_category into category_types
 * and write them back into the metadata JSONB column.
 *
 * After this runs, the Node.js intent boost in recommendationEngine.ts
 * will fire correctly, and re-running reembed-categories.ts will produce
 * richer contextual prefixes.
 *
 * Idempotent — skips rows that already have a non-empty category_types array.
 *
 * Run:
 *   node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/backfill-category-types.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=true node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/backfill-category-types.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 10;       // categories per parallel batch
const BATCH_DELAY_MS = 1200; // stay well under RPM limits
const PAGE_SIZE = 1000;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Category types used by the intent boost in embeddingManager.ts ──────────
// Must stay in sync with detectCategoryTypes() in that file.
const VALID_TYPES = [
  'healthcare_medical',
  'women_empowerment',
  'technology',
  'social_impact',
  'business_general',
  'marketing_media',
  'product_service',
] as const;

type CategoryType = typeof VALID_TYPES[number];

// ─── LLM classifier ───────────────────────────────────────────────────────────

async function classifyCategory(cat: any): Promise<CategoryType[]> {
  const programName = cat.stevie_programs?.program_name ?? '';
  const desc = (cat.description ?? '').trim();

  const prompt = `Classify this Stevie Award category into 1-2 category types.

Category: ${cat.category_name}
Program: ${programName}
Description: ${desc || '(none)'}
Nomination subject: ${cat.nomination_subject_type ?? 'any'}
Achievement focus: ${(cat.achievement_focus as string[] ?? []).join(', ') || 'general'}

Types (pick 1-2 most accurate):
- healthcare_medical: medical, health, disease, surgery, hospital, pharmaceutical, wellness, vision
- women_empowerment: women helping women, female leadership, gender equality, women in business
- technology: software, AI, digital products, IT innovation, cybersecurity, cloud, data
- social_impact: CSR, community service, humanitarian, charity, sustainability, non-profit programs
- business_general: company growth, leadership, management, operations, finance, HR
- marketing_media: advertising, PR, content, social media campaigns, communications, video
- product_service: product launch, service excellence, customer experience innovation

Rules:
- Women in Business program → always include women_empowerment
- Technology Excellence program → always include technology
- Great Employers program → always include business_general
- Pick by the ACHIEVEMENT TYPE, not by how it was communicated

Reply ONLY with a JSON array, e.g.: ["social_impact", "business_general"]`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 60,
    });

    let text = (res.choices[0]?.message?.content ?? '').trim();
    // strip markdown fences
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Not an array');

    const types = parsed
      .filter((t): t is CategoryType => VALID_TYPES.includes(t as CategoryType));

    if (types.length === 0) throw new Error('No valid types after filter');
    return types;
  } catch (err: any) {
    // Rule-based fallback
    return ruleBasedFallback(cat);
  }
}

function ruleBasedFallback(cat: any): CategoryType[] {
  const programCode = (cat.stevie_programs?.program_code ?? '').toUpperCase();
  const name = (cat.category_name ?? '').toLowerCase();
  const desc = (cat.description ?? '').toLowerCase();
  const text = `${name} ${desc}`;

  if (programCode === 'WOMEN') return ['women_empowerment'];
  if (programCode === 'TECH') return ['technology'];
  if (programCode === 'EMPLOYERS') return ['business_general'];
  if (programCode === 'SALES') return ['business_general', 'product_service'];

  if (/health|medical|hospital|pharma|disease|wellness|vision/.test(text)) return ['healthcare_medical'];
  if (/women|female|gender/.test(text)) return ['women_empowerment'];
  if (/software|ai |tech|digital|cloud|cyber/.test(text)) return ['technology'];
  if (/social|community|charity|humanitarian|csr|nonprofit/.test(text)) return ['social_impact'];
  if (/marketing|advertising|pr |campaign|content|media/.test(text)) return ['marketing_media'];
  if (/product|service|customer experience/.test(text)) return ['product_service'];

  return ['business_general'];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('Category Types Backfill Script');
  if (DRY_RUN) console.log('  *** DRY RUN — no writes will happen ***');
  console.log('='.repeat(60));

  // Fetch all categories
  console.log('\nFetching categories...');
  const allCategories: any[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from('stevie_categories')
      .select(`
        id,
        category_name,
        description,
        achievement_focus,
        applicable_org_types,
        nomination_subject_type,
        metadata,
        stevie_programs (
          program_name,
          program_code
        )
      `)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCategories.push(...data);
    console.log(`  Page ${page + 1}: ${data.length} rows (total: ${allCategories.length})`);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nTotal categories: ${allCategories.length}`);

  // Split into needs-classification vs already done
  const todo = allCategories.filter(c => {
    const types = c.metadata?.category_types;
    return !Array.isArray(types) || types.length === 0;
  });
  const alreadyDone = allCategories.length - todo.length;

  console.log(`Already classified: ${alreadyDone}`);
  console.log(`Needs classification: ${todo.length}`);

  if (todo.length === 0) {
    console.log('\nAll categories already have category_types. Nothing to do.');
    process.exit(0);
  }

  // Batch classify
  let success = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (cat, batchIdx) => {
      const globalIdx = i + batchIdx + 1;
      const programCode = cat.stevie_programs?.program_code ?? '?';
      const label = `[${globalIdx}/${todo.length}] ${cat.category_name} (${programCode})`;

      try {
        const types = await classifyCategory(cat);

        if (!DRY_RUN) {
          const updatedMetadata = {
            ...(cat.metadata ?? {}),
            category_types: types,
          };

          const { error: updateError } = await supabase
            .from('stevie_categories')
            .update({ metadata: updatedMetadata })
            .eq('id', cat.id);

          if (updateError) throw new Error(updateError.message);
        }

        console.log(`  ✓ ${label} → [${types.join(', ')}]${DRY_RUN ? ' (dry run)' : ''}`);
        success++;
      } catch (err: any) {
        console.error(`  ✗ ${label} — ${err.message}`);
        failures.push(cat.category_name);
        failed++;
      }
    }));

    if (i + BATCH_SIZE < todo.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done. Success: ${success} | Failed: ${failed} | Skipped (already done): ${alreadyDone}`);

  if (failures.length > 0) {
    console.log('\nFailed:');
    failures.forEach(f => console.log(`  - ${f}`));
    console.log('\nRe-run to retry — upsert is idempotent.');
  }

  if (!DRY_RUN && success > 0) {
    console.log('\nNext step: run reembed-categories.ts to regenerate contextual prefixes');
    console.log('with the new category_types included in the LLM context.');
  }

  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
