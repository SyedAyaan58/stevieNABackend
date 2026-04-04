/// <reference types="node" />
/**
 * Full category resync from stevieawards.com
 *
 * What it does:
 * 1. Fetches every program's category pages via Jina AI Reader (free, no key)
 * 2. Uses GPT-4o-mini to extract structured category data from raw markdown
 * 3. Upserts into stevie_programs + stevie_categories (adds missing, updates all)
 * 4. Saves docs/category-descriptions-crawled.md as a full audit trail
 *
 * After running:
 *   → Run backfill-category-types.ts  (classify new categories)
 *   → Run reembed-categories.ts       (regenerate all embeddings)
 *   → Run migration 016 again          (repopulate category_embeddings.metadata)
 *
 * Run:
 *   node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/crawl-category-descriptions.ts
 *
 * Dry run (no DB writes):
 *   DRY_RUN=true node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/crawl-category-descriptions.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const DRY_RUN = process.env.DRY_RUN === 'true';
const PAGE_DELAY_MS = 3000;
const JINA_BASE = 'https://r.jina.ai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---------------------------------------------------------------------------
// Program definitions with all known category page URLs
// ---------------------------------------------------------------------------
const PROGRAMS: Array<{
  code: string;
  name: string;
  description: string;
  website_url: string;
  urls: string[];
}> = [
  {
    code: 'IBA',
    name: 'International Business Awards',
    description: 'The world\'s premier business awards program. Open to all organizations worldwide.',
    website_url: 'https://www.stevieawards.com/iba',
    urls: [
      'https://www.stevieawards.com/iba/product-and-service-categories',
      'https://www.stevieawards.com/iba/company-and-organization-categories',
      'https://www.stevieawards.com/iba/individual-categories',
      'https://www.stevieawards.com/iba/media-categories',
      'https://www.stevieawards.com/iba/live-event-virtual-event-and-conference-categories',
      'https://www.stevieawards.com/iba/innovation-categories',
      'https://www.stevieawards.com/iba/pr-marketing-categories',
      'https://www.stevieawards.com/iba/solution-provider-categories',
    ],
  },
  {
    code: 'ABA',
    name: 'American Business Awards',
    description: 'The premier business awards program in the U.S.A. Open to all US organizations.',
    website_url: 'https://www.stevieawards.com/aba',
    urls: [
      'https://www.stevieawards.com/aba/product-and-service-categories',
      'https://www.stevieawards.com/aba/company-and-organization-categories',
      'https://www.stevieawards.com/aba/individual-categories',
      'https://www.stevieawards.com/aba/media-categories',
      'https://www.stevieawards.com/aba/live-event-virtual-event-and-conference-categories',
      'https://www.stevieawards.com/aba/innovation-categories',
      'https://www.stevieawards.com/aba/pr-marketing-categories',
    ],
  },
  {
    code: 'WOMEN',
    name: 'Stevie Awards for Women in Business',
    description: 'The world\'s top honors for female entrepreneurs, executives, employees, and the organizations they run.',
    website_url: 'https://www.stevieawards.com/women',
    urls: [
      'https://www.stevieawards.com/women/award-categories',
    ],
  },
  {
    code: 'MENA',
    name: 'Middle East & North Africa Stevie Awards',
    description: 'Recognizes the achievements of organizations and individuals in the Middle East and North Africa.',
    website_url: 'https://www.stevieawards.com/mena',
    urls: [
      'https://www.stevieawards.com/mena/categories',
    ],
  },
  {
    code: 'APAC',
    name: 'Asia-Pacific Stevie Awards',
    description: 'Recognizes innovation and achievement in the workplace in all 29 nations of the Asia-Pacific region.',
    website_url: 'https://www.stevieawards.com/apac',
    urls: [
      'https://www.stevieawards.com/apac/categories',
    ],
  },
  {
    code: 'TECH',
    name: 'Stevie Awards for Technology Excellence',
    description: 'Recognizes the remarkable work of IT and technology professionals worldwide.',
    website_url: 'https://www.stevieawards.com/tse',
    urls: [
      'https://www.stevieawards.com/tse/categories',
    ],
  },
  {
    code: 'GERMAN',
    name: 'German Stevie Awards',
    description: 'Recognizes the achievements of organizations and individuals in German-speaking countries.',
    website_url: 'https://www.stevieawards.com/german',
    urls: [
      'https://www.stevieawards.com/german/award-categories',
    ],
  },
  {
    code: 'EMPLOYERS',
    name: 'Stevie Awards for Great Employers',
    description: 'Recognizes the world\'s best employers and the HR teams, professionals, achievements, and products that help create great places to work.',
    website_url: 'https://www.stevieawards.com/employers',
    urls: [
      'https://www.stevieawards.com/employers/award-categories',
    ],
  },
  {
    code: 'SALES',
    name: 'Stevie Awards for Sales & Customer Service',
    description: 'The world\'s top honors for customer service, contact center, business development, and sales professionals.',
    website_url: 'https://www.stevieawards.com/sales',
    urls: [
      'https://www.stevieawards.com/sales/award-categories',
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(`${JINA_BASE}/${url}`, {
    headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.text()).replace(/\n{3,}/g, '\n\n').trim();
}

interface ExtractedCategory {
  name: string;
  description: string;
  nomination_subject_type?: string; // individual | team | organization | product
  applicable_org_types?: string[];  // for_profit | non_profit | etc
  achievement_focus?: string[];
}

async function extractCategories(
  markdown: string,
  programName: string,
  pageUrl: string
): Promise<ExtractedCategory[]> {
  const prompt = `Extract ALL award categories from this Stevie Awards page.

Program: ${programName}
Page: ${pageUrl}

Page content:
${markdown.substring(0, 14000)}

For each category return:
- name: exact category name
- description: full description (2-4 sentences). If missing from page, write one based on the name.
- nomination_subject_type: what is being nominated — one of: individual, team, organization, product (infer from name/description)
- applicable_org_types: array, any of: for_profit, non_profit, government, education, startup (leave empty if open to all)
- achievement_focus: array of 1-3 focus areas from: Innovation, Leadership, Technology, Marketing, Customer Service, HR/Employers, Social Impact, Sales, Women in Business, Excellence, Product/Service

Rules:
- Include EVERY category, even small sub-categories
- If a category has size variants (Small, Medium, Large), include each as separate entry with the size in the name
- Do not skip any category
- Return a JSON object with key "categories" containing the array

Example:
{"categories": [{"name": "...", "description": "...", "nomination_subject_type": "individual", "applicable_org_types": [], "achievement_focus": ["Leadership"]}]}`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}');
    const arr: any[] = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed.categories) ? parsed.categories
      : Array.isArray(parsed.data) ? parsed.data
      : [];
    return arr
      .filter(c => c?.name)
      .map(c => ({
        name: String(c.name).trim(),
        description: String(c.description ?? '').trim(),
        nomination_subject_type: c.nomination_subject_type ?? null,
        applicable_org_types: Array.isArray(c.applicable_org_types) ? c.applicable_org_types : [],
        achievement_focus: Array.isArray(c.achievement_focus) ? c.achievement_focus : ['Excellence'],
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('Stevie Awards Full Category Resync');
  if (DRY_RUN) console.log('  *** DRY RUN — no DB writes ***');
  console.log('='.repeat(70));

  const docsDir = path.join(process.cwd(), '..', 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, 'category-descriptions-crawled.md');

  const mdLines: string[] = [
    '# Stevie Awards — Full Category Descriptions (Crawled)',
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  let totalExtracted = 0;
  let totalUpserted = 0;
  let totalFailed = 0;

  for (const program of PROGRAMS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${program.code}] ${program.name}`);
    console.log('─'.repeat(60));

    mdLines.push(`## ${program.name} (${program.code})`);
    mdLines.push('');

    // Upsert program row first
    let programId: string | null = null;
    if (!DRY_RUN) {
      const { data: progData, error: progErr } = await supabase
        .from('stevie_programs')
        .upsert({
          program_code: program.code,
          program_name: program.name,
          description: program.description,
          website_url: program.website_url,
          is_active: true,
        }, { onConflict: 'program_code' })
        .select('id')
        .single();

      if (progErr) {
        console.error(`  ✗ Program upsert failed: ${progErr.message}`);
      } else {
        programId = progData?.id ?? null;
        console.log(`  ✓ Program upserted (id: ${programId})`);
      }
    } else {
      // In dry run, get existing program id for logging
      const { data } = await supabase
        .from('stevie_programs')
        .select('id')
        .eq('program_code', program.code)
        .single();
      programId = data?.id ?? null;
    }

    // Crawl all pages for this program
    const allExtracted: ExtractedCategory[] = [];

    for (const url of program.urls) {
      process.stdout.write(`  Fetching ${url.replace('https://www.stevieawards.com', '')} ... `);
      try {
        const markdown = await fetchPage(url);
        process.stdout.write(`${markdown.length} chars → `);
        const extracted = await extractCategories(markdown, program.name, url);
        process.stdout.write(`${extracted.length} categories\n`);
        allExtracted.push(...extracted);
      } catch (err: any) {
        process.stdout.write(`FAILED: ${err.message}\n`);
      }
      await sleep(PAGE_DELAY_MS);
    }

    // Dedup by normalised name
    const seen = new Set<string>();
    const deduped = allExtracted.filter(c => {
      const k = c.name.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    console.log(`  Extracted ${allExtracted.length} → ${deduped.length} after dedup`);
    totalExtracted += deduped.length;

    // Upsert each category
    for (const cat of deduped) {
      mdLines.push(`### ${cat.name}`);
      mdLines.push('');
      mdLines.push(cat.description || '_No description_');
      mdLines.push('');
      if (cat.achievement_focus?.length) mdLines.push(`**Focus:** ${cat.achievement_focus.join(', ')}`);
      if (cat.nomination_subject_type) mdLines.push(`**Nominating:** ${cat.nomination_subject_type}`);
      mdLines.push('');

      if (!programId) {
        totalFailed++;
        continue;
      }

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('stevie_categories')
          .upsert({
            program_id: programId,
            category_name: cat.name,
            description: cat.description || null,
            nomination_subject_type: cat.nomination_subject_type || null,
            applicable_org_types: cat.applicable_org_types?.length ? cat.applicable_org_types : null,
            achievement_focus: cat.achievement_focus?.length ? cat.achievement_focus : null,
            is_active: true,
            metadata: {},
          }, { onConflict: 'program_id,category_name' });

        if (error) {
          console.error(`  ✗ Failed: ${cat.name} — ${error.message}`);
          totalFailed++;
        } else {
          totalUpserted++;
        }
      } else {
        totalUpserted++;
      }
    }

    console.log(`  ✓ ${deduped.length} categories upserted for ${program.code}`);
  }

  // Write MD file
  fs.writeFileSync(outPath, mdLines.join('\n'), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log('DONE');
  console.log(`  Total categories extracted:  ${totalExtracted}`);
  console.log(`  Upserted to DB:              ${totalUpserted}${DRY_RUN ? ' (dry run)' : ''}`);
  console.log(`  Failed:                      ${totalFailed}`);
  console.log(`  MD file:                     ${outPath}`);
  if (!DRY_RUN && totalUpserted > 0) {
    console.log('\nNext steps (in order):');
    console.log('  1. node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/backfill-category-types.ts');
    console.log('  2. node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/reembed-categories.ts');
    console.log('  3. Run migration 016 in Supabase SQL editor to repopulate category_embeddings.metadata');
  }
  console.log('='.repeat(70));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
