/// <reference types="node" />
/**
 * Load Categories from Markdown — Full Reseed Script
 *
 * 1. Backs up existing data (logs counts)
 * 2. DELETES all existing stevie_categories + category_embeddings
 * 3. Parses all 9 markdown files in docs/award_seeding/
 * 4. Enriches ⚠️ categories via GPT-4o-mini (using per-program prompts)
 * 5. Batch-inserts into stevie_categories
 *
 * Run:
 *   node node_modules/tsx/dist/cli.mjs --env-file=.env scripts/load-categories-from-markdown.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ── Config ──────────────────────────────────────────────────────────────────

const ENRICHMENT_BATCH_SIZE = 8;
const ENRICHMENT_DELAY_MS = 500;
const INSERT_BATCH_SIZE = 50;
const INSERT_DELAY_MS = 300;
const CHAT_MODEL = 'gpt-4o-mini';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ── Types ───────────────────────────────────────────────────────────────────

interface ParsedGroup {
  group_name: string;
  group_description: string;
  entry_format: string;
  nominee_type: string;
}

interface ParsedCategory {
  program_code: string;
  program_name: string;
  category_code: string;
  category_name: string;
  raw_description: string;
  needs_enrichment: boolean;
  group_name: string;
  group_description: string;
  entry_format: string;
  nomination_subject_type: string;
  applicable_org_types: string[];
  applicable_org_sizes: string[];
  achievement_focus: string[];
  geographic_scope: string[];
}

// ── Geographic Scope Map ────────────────────────────────────────────────────

const GEO_SCOPE: Record<string, string[]> = {
  ABA:       ['America'],
  APAC:      ['Asia', 'Pacific'],
  MENA:      ['Middle East', 'North Africa'],
  GERMAN:    ['Germany'],
  IBA:       ['Global'],
  WOMEN:     ['Global'],
  TECH:      ['Global'],
  EMPLOYERS: ['Global'],
  SALES:     ['Global'],
};

// ── Program Code from Filename ──────────────────────────────────────────────

// Maps markdown filenames → DB program_code (must match stevie_programs.program_code)
const FILENAME_TO_PROGRAM: Record<string, string> = {
  'aba_doc.md':    'ABA',
  'apac_doc.md':   'APAC',
  'german_doc.md': 'GERMAN',
  'iba_doc.md':    'IBA',
  'mena_doc.md':   'MENA',
  'sage_doc.md':   'EMPLOYERS',
  'sate_doc.md':   'TECH',
  'scs_doc.md':    'SALES',
  'women_doc.md':  'WOMEN',
};

const PROGRAM_NAMES: Record<string, string> = {
  ABA:       'American Business Awards',
  APAC:      'Asia-Pacific Stevie Awards',
  GERMAN:    'German Stevie Awards',
  IBA:       'International Business Awards',
  MENA:      'Middle East & North Africa Stevie Awards',
  EMPLOYERS: 'Stevie Awards for Great Employers',
  TECH:      'Stevie Awards for Technology Excellence',
  SALES:     'Stevie Awards for Sales & Customer Service',
  WOMEN:     'Stevie Awards for Women in Business',
};

// ── Achievement Focus Keyword Detection ─────────────────────────────────────

const FOCUS_KEYWORDS: Record<string, string[]> = {
  'Innovation':        ['innovation', 'innovative', 'breakthrough', 'new product', 'new service', 'technical innovation'],
  'Leadership':        ['leadership', 'executive', 'leader', 'ceo', 'management', 'lifetime achievement'],
  'Technology':        ['technology', 'tech', 'software', 'hardware', 'ai', 'artificial intelligence', 'digital', 'app', 'website', 'cyber'],
  'Marketing':         ['marketing', 'advertising', 'pr', 'public relations', 'brand', 'communications', 'media'],
  'Customer Service':  ['customer service', 'contact center', 'customer satisfaction', 'customer experience'],
  'HR/Employers':      ['employer', 'hr', 'human resources', 'talent', 'recruitment', 'training', 'learning', 'employee', 'workplace'],
  'Social Impact':     ['csr', 'corporate social responsibility', 'social', 'community', 'diversity', 'inclusion', 'esg', 'sustainability'],
  'Sales':             ['sales', 'revenue', 'business development', 'demand generation', 'selling'],
  'Women in Business': ['women', 'female', 'woman'],
  'Excellence':        ['achievement', 'excellence', 'award', 'distinction', 'best'],
  'Product/Service':   ['product', 'service', 'solution', 'platform'],
};

function detectAchievementFocus(name: string, groupName: string): string[] {
  const text = `${name} ${groupName}`.toLowerCase();
  const matched: string[] = [];
  for (const [focus, keywords] of Object.entries(FOCUS_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      matched.push(focus);
    }
  }
  return matched.length > 0 ? matched : ['Excellence'];
}

// ── Org Size Detection ──────────────────────────────────────────────────────

function detectOrgSizes(categoryName: string): string[] {
  const name = categoryName.toLowerCase();
  const sizes: string[] = [];
  if (/(\bsmall\b|≤\s*50|up to 10 emp|10 or less|≤10)/.test(name)) sizes.push('small');
  if (/(\bmedium\b|≤\s*250|more than 10|11.?250)/.test(name)) sizes.push('medium');
  if (/(\blarge\b|>\s*250|2[,.]?500 or more|more than 2[,.]?500)/.test(name)) sizes.push('large');
  return sizes; // empty = all sizes
}

// ── Nominee Type Normalization ──────────────────────────────────────────────

function normalizeNomineeType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('individual')) return 'individual';
  if (lower.includes('product') || lower.includes('app') || lower.includes('solution')) return 'product';
  if (lower.includes('team')) return 'team';
  return 'organization';
}

// ── Markdown Parsing ────────────────────────────────────────────────────────

// Remap markdown-internal program codes to DB program codes
const CODE_REMAP: Record<string, string> = {
  'GSA':  'GERMAN',
  'SAGE': 'EMPLOYERS',
  'SATE': 'TECH',
  'SCS':  'SALES',
};

function extractProgramCode(content: string, filename: string): string {
  // Always prefer filename mapping — it's the most reliable
  const fromFilename = FILENAME_TO_PROGRAM[filename];
  if (fromFilename) return fromFilename;

  // Fallback: try explicit metadata in the markdown
  const match = content.match(/\*?\*?Program code:?\*?\*?\s*:?\s*(\w+)/i);
  if (match) {
    const code = match[1].toUpperCase();
    return CODE_REMAP[code] || code;
  }

  return 'UNKNOWN';
}

function parseGroups(content: string): Array<{ header: string; body: string }> {
  // Split on GROUP headers — handles:
  //   ## GROUP 1: Name
  //   ## GROUP 1 — Name
  //   ## ══════...  ## GROUP 1: Name (ABA style with decorative lines)
  const groupPattern = /^##\s+(?:═+\s*\n##\s+)?GROUP\s+\d+[:\s—–-]+/gim;
  const matches = [...content.matchAll(groupPattern)];

  if (matches.length === 0) {
    // SATE/GSA style — groups start with ## GROUP N: or just ## SectorName
    // Try splitting on any ## that starts a category group
    const altPattern = /^##\s+GROUP\s+\d+/gim;
    const altMatches = [...content.matchAll(altPattern)];
    if (altMatches.length > 0) return splitAtMatches(content, altMatches);

    // Last resort: split on ## headers that aren't metadata/template sections
    const headerPattern = /^##\s+(?!PROGRAM|EMBEDDING|LLM|KEY DIFF|HOW TO|Summary)[A-Z]/gm;
    const headerMatches = [...content.matchAll(headerPattern)];
    return splitAtMatches(content, headerMatches);
  }

  return splitAtMatches(content, matches);
}

function splitAtMatches(content: string, matches: RegExpMatchArray[]): Array<{ header: string; body: string }> {
  const groups: Array<{ header: string; body: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : content.length;
    const block = content.slice(start, end);
    const firstNewline = block.indexOf('\n');
    const header = firstNewline > 0 ? block.slice(0, firstNewline).trim() : block.trim();
    const body = firstNewline > 0 ? block.slice(firstNewline + 1) : '';
    groups.push({ header, body });
  }
  return groups;
}

function parseGroupMetadata(header: string, body: string): ParsedGroup {
  // Extract group name from header
  let groupName = header
    .replace(/^##\s+/, '')
    .replace(/═+/g, '')
    .replace(/^GROUP\s+\d+[:\s—–-]+\s*/i, '')
    .trim();

  // Extract group description
  const descMatch = body.match(/\*\*Group\s+desc(?:ription)?:?\*\*\s*:?\s*(.+)/i);
  const groupDesc = descMatch ? descMatch[1].trim() : '';

  // Extract entry format
  const entryMatch = body.match(/\*\*Entry(?:\s+format)?:?\*\*\s*:?\s*(.+)/i);
  const entryFormat = entryMatch ? entryMatch[1].trim() : '';

  // Extract nominee type
  const nomineeMatch = body.match(/\*\*Nominee\s+type:?\*\*\s*:?\s*(.+)/i);
  const nomineeType = nomineeMatch ? nomineeMatch[1].trim() : 'organization';

  return {
    group_name: groupName,
    group_description: groupDesc,
    entry_format: entryFormat,
    nominee_type: nomineeType,
  };
}

/**
 * Line-by-line table parser that handles all markdown table variations:
 *  - 2-col: | Code | Name |
 *  - 3-col: | Code | Name | Description/Notes/Status |
 *  - 4-col: | Code | Name | Subcategories | Description |
 *  - Codes: A01, 54a, BD-01, G01m, W35, pure integers (1, 2, 13)
 *  - Sub-headers (###) between table rows are skipped
 *  - Empty third columns are treated as needing enrichment
 */
function parseTableRows(body: string): Array<{ code: string; name: string; description: string; needsEnrichment: boolean }> {
  const rows: Array<{ code: string; name: string; description: string; needsEnrichment: boolean }> = [];
  const lines = body.split('\n');

  // Pattern for valid category codes:
  //   A01, B55, R05         → letter + digits
  //   54a, 54o              → digits + optional letter
  //   BD-01, SI-03, SP-04   → multi-letter prefix + hyphen + digits
  //   G01a, G01m, G02b      → letter + digits + letter suffix
  //   W01, W35              → letter + digits
  //   1, 2, 13              → pure integers
  const CODE_PATTERN = /^[A-Za-z]{0,3}-?[0-9]+[a-z]?$/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip non-table lines (headers, blank lines, blockquotes, etc.)
    if (!trimmed.startsWith('|')) continue;

    // Split on pipe, remove first/last empty elements from leading/trailing |
    const cells = trimmed.split('|').map(c => c.trim());
    // Remove empty first and last from | ... | ... |
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();

    if (cells.length < 2) continue;

    const rawCode = cells[0];
    const rawName = cells[1];

    // Skip header rows and separator rows
    if (/^code$/i.test(rawCode)) continue;
    if (/^-+$/.test(rawCode)) continue;
    if (/^-+$/.test(rawName)) continue;

    // Validate code matches our pattern
    if (!CODE_PATTERN.test(rawCode)) continue;

    const code = rawCode;
    const name = rawName.replace(/\*\(New.*?\)\*/gi, '').replace(/\(New\s+\d+\)/gi, '').trim();

    // Extract description from remaining columns (could be col 2, 3, or none)
    let rawDesc = '';
    if (cells.length >= 3) {
      // Could be Description, Notes, Status, or Subcategories
      // If 4+ columns, last is usually Description, second-to-last is Subcategories
      rawDesc = cells.length >= 4 ? cells[cells.length - 1] : cells[2];
    }

    // Determine enrichment status
    const { description, needsEnrichment } = classifyDescription(rawDesc);

    rows.push({ code, name, description, needsEnrichment });
  }

  return rows;
}

/**
 * Classify a raw description/notes/status cell into:
 *  - A real description (needsEnrichment = false)
 *  - Or a label/empty that needs LLM enrichment (needsEnrichment = true)
 */
function classifyDescription(raw: string): { description: string; needsEnrichment: boolean } {
  if (!raw || raw.trim().length === 0) {
    return { description: '', needsEnrichment: true };
  }

  const trimmed = raw.trim();

  // Strip markers but remember them
  const hasCheckmark = trimmed.includes('✅');
  const hasWarning = trimmed.includes('⚠️');

  const cleaned = trimmed
    .replace(/✅\s*/g, '')
    .replace(/⚠️\s*/g, '')
    .replace(/^\s*ENRICH\s*$/i, '')
    .replace(/^\s*Label only\s*$/i, '')
    .replace(/^No additional description.*$/i, '')
    .trim();

  // Explicit enrichment markers
  if (hasWarning || /^ENRICH$/i.test(trimmed) || /Label only/i.test(trimmed)) {
    return { description: cleaned, needsEnrichment: true };
  }

  // Has ✅ with substantial text → ready
  if (hasCheckmark && cleaned.length > 20) {
    return { description: cleaned, needsEnrichment: false };
  }

  // No markers but substantial text (SATE style) → treat as ready
  if (cleaned.length > 40) {
    return { description: cleaned, needsEnrichment: false };
  }

  // Short text — likely just a note like "Women-owned/led" or "NEW for 2026" or empty
  // → needs enrichment
  return { description: cleaned, needsEnrichment: true };
}

function parseMarkdownFile(filePath: string): ParsedCategory[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const programCode = extractProgramCode(content, filename);
  const programName = PROGRAM_NAMES[programCode] || programCode;
  const geoScope = GEO_SCOPE[programCode] || ['Global'];

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${programCode}] ${programName} — ${filename}`);
  console.log('─'.repeat(60));

  const groups = parseGroups(content);
  console.log(`  Found ${groups.length} groups`);

  const categories: ParsedCategory[] = [];
  // Track seen codes + names to handle duplicates within a program
  const seenCodes = new Map<string, number>();  // code → occurrence count
  const seenNames = new Set<string>();

  for (const { header, body } of groups) {
    const groupMeta = parseGroupMetadata(header, body);
    const tableRows = parseTableRows(body);

    if (tableRows.length === 0) continue;

    console.log(`  ${groupMeta.group_name}: ${tableRows.length} categories (${tableRows.filter(r => r.needsEnrichment).length} need enrichment)`);

    for (const row of tableRows) {
      // Deduplicate category_code within the program
      // DB has UNIQUE(program_id, category_code) — suffix duplicates
      const codeKey = `${programCode}:${row.code}`;
      const codeCount = seenCodes.get(codeKey) || 0;
      seenCodes.set(codeKey, codeCount + 1);

      let categoryCode = row.code;
      if (codeCount > 0) {
        // Append group-based suffix to make code unique
        // e.g., C07 → C07-PR, C07 → C07-MKT
        const suffix = groupMeta.group_name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        categoryCode = `${row.code}-${suffix}${codeCount > 1 ? codeCount : ''}`;
      }

      // Also deduplicate category_name
      let categoryName = row.name;
      const nameKey = `${programCode}:${categoryName}`;
      if (seenNames.has(nameKey)) {
        categoryName = `${groupMeta.group_name} — ${row.name}`;
      }
      seenNames.add(`${programCode}:${categoryName}`);

      categories.push({
        program_code: programCode,
        program_name: programName,
        category_code: categoryCode,
        category_name: categoryName,
        raw_description: row.description,
        needs_enrichment: row.needsEnrichment,
        group_name: groupMeta.group_name,
        group_description: groupMeta.group_description,
        entry_format: groupMeta.entry_format,
        nomination_subject_type: normalizeNomineeType(groupMeta.nominee_type),
        applicable_org_types: [],
        applicable_org_sizes: detectOrgSizes(row.name),
        achievement_focus: detectAchievementFocus(row.name, groupMeta.group_name),
        geographic_scope: geoScope,
      });
    }
  }

  console.log(`  → Total: ${categories.length} categories (${categories.filter(c => c.needs_enrichment).length} need enrichment)`);
  return categories;
}

// ── LLM Enrichment ──────────────────────────────────────────────────────────

async function enrichCategory(cat: ParsedCategory): Promise<string> {
  const prompt = `You are building a RAG system to recommend Stevie Award categories.
Write a WHAT THIS RECOGNIZES paragraph (120–160 words) for:

Program: ${cat.program_name} (${cat.program_code})
Program scope: ${cat.geographic_scope.join(', ')}
Category group: ${cat.group_name}
Group purpose: ${cat.group_description}
Category: ${cat.category_code}. ${cat.category_name}
Existing description: "${cat.raw_description || 'label only'}"

Cover: (1) exactly who/what qualifies, (2) concrete activities/outputs typical of
winners, (3) what differentiates this from adjacent categories,
(4) example achievement that would win.
Be specific. Do NOT start with "This category recognizes". Return ONLY the paragraph.`;

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 250,
  });

  const text = response.choices[0]?.message?.content?.trim() || '';

  // Validate
  if (text.length < 80) {
    throw new Error(`Enrichment too short (${text.length} chars) for ${cat.category_code}`);
  }

  return text;
}

async function enrichBatch(categories: ParsedCategory[]): Promise<void> {
  const needsEnrichment = categories.filter(c => c.needs_enrichment);
  if (needsEnrichment.length === 0) return;

  console.log(`\n  Enriching ${needsEnrichment.length} categories via GPT-4o-mini...`);

  for (let i = 0; i < needsEnrichment.length; i += ENRICHMENT_BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + ENRICHMENT_BATCH_SIZE);

    await Promise.all(
      batch.map(async (cat, batchIdx) => {
        const globalIdx = i + batchIdx + 1;
        const label = `[${globalIdx}/${needsEnrichment.length}] ${cat.category_code} ${cat.category_name}`;

        try {
          const enriched = await enrichCategory(cat);
          cat.raw_description = enriched;
          cat.needs_enrichment = false;
          console.log(`    ✓ ${label}`);
        } catch (err: any) {
          console.error(`    ✗ ${label} — ${err.message}`);
          // Hard fail: abort entire program
          throw new Error(`Enrichment failed for ${cat.category_code} "${cat.category_name}": ${err.message}`);
        }
      })
    );

    if (i + ENRICHMENT_BATCH_SIZE < needsEnrichment.length) {
      await new Promise(r => setTimeout(r, ENRICHMENT_DELAY_MS));
    }
  }
}

// ── Database Operations ─────────────────────────────────────────────────────

async function getPrograms(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('stevie_programs')
    .select('id, program_code');

  if (error) throw new Error(`Failed to fetch programs: ${error.message}`);

  const map = new Map<string, string>();
  for (const p of data || []) {
    map.set(p.program_code, p.id);
  }
  return map;
}

async function backupAndDelete(): Promise<void> {
  // Log current counts
  const { count: catCount } = await supabase
    .from('stevie_categories')
    .select('*', { count: 'exact', head: true });

  const { count: embCount } = await supabase
    .from('category_embeddings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nCurrent DB state: ${catCount} categories, ${embCount} embeddings`);

  // Delete embeddings first (FK dependency)
  console.log('Deleting all category_embeddings...');
  const { error: embError } = await supabase
    .from('category_embeddings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (embError) throw new Error(`Failed to delete embeddings: ${embError.message}`);

  // Delete categories
  console.log('Deleting all stevie_categories...');
  const { error: catError } = await supabase
    .from('stevie_categories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (catError) throw new Error(`Failed to delete categories: ${catError.message}`);

  console.log('Existing data deleted.');
}

async function insertCategories(
  categories: ParsedCategory[],
  programMap: Map<string, string>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < categories.length; i += INSERT_BATCH_SIZE) {
    const batch = categories.slice(i, i + INSERT_BATCH_SIZE);

    const rows = batch.map(cat => {
      const programId = programMap.get(cat.program_code);
      if (!programId) {
        console.warn(`  ⚠ No program_id for ${cat.program_code} — skipping ${cat.category_name}`);
        return null;
      }

      return {
        program_id: programId,
        category_code: cat.category_code,
        category_name: cat.category_name,
        description: cat.raw_description || null,
        nomination_subject_type: cat.nomination_subject_type,
        applicable_org_types: cat.applicable_org_types,
        applicable_org_sizes: cat.applicable_org_sizes,
        geographic_scope: cat.geographic_scope,
        achievement_focus: cat.achievement_focus,
        is_free: false,
        is_women_award: cat.program_code === 'WOMEN',
        metadata: {
          group_name: cat.group_name,
          group_description: cat.group_description,
          entry_format: cat.entry_format,
          category_types: detectCategoryTypes(cat.group_name),
          primary_focus: cat.achievement_focus[0] || 'Excellence',
        },
      };
    }).filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from('stevie_categories')
      .upsert(rows, { onConflict: 'program_id,category_code' });

    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} failed: ${error.message}`);
      failed += rows.length;
    } else {
      success += rows.length;
      process.stdout.write(`  Inserted ${success}/${categories.length}\r`);
    }

    if (i + INSERT_BATCH_SIZE < categories.length) {
      await new Promise(r => setTimeout(r, INSERT_DELAY_MS));
    }
  }

  return { success, failed };
}

function detectCategoryTypes(groupName: string): string[] {
  const lower = groupName.toLowerCase();
  const types: string[] = [];

  if (lower.includes('achievement')) types.push('achievement');
  if (lower.includes('company') || lower.includes('organization') || lower.includes('employer')) types.push('company');
  if (lower.includes('individual') || lower.includes('executive') || lower.includes('employee')) types.push('individual');
  if (lower.includes('team')) types.push('team');
  if (lower.includes('product') || lower.includes('new product') || lower.includes('app')) types.push('product');
  if (lower.includes('innovation') || lower.includes('technology')) types.push('innovation');
  if (lower.includes('management')) types.push('management');
  if (lower.includes('publication') || lower.includes('video') || lower.includes('website') || lower.includes('media')) types.push('media');
  if (lower.includes('event')) types.push('event');
  if (lower.includes('sales')) types.push('sales');
  if (lower.includes('customer service') || lower.includes('contact center')) types.push('customer_service');
  if (lower.includes('hr') || lower.includes('human resources') || lower.includes('talent')) types.push('hr');

  return types.length > 0 ? types : ['general'];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('Load Categories from Markdown — Full Reseed');
  console.log('='.repeat(60));

  // Step 1: Get program IDs
  console.log('\nFetching stevie_programs...');
  const programMap = await getPrograms();
  console.log(`Found ${programMap.size} programs: ${[...programMap.keys()].join(', ')}`);

  // Validate all expected programs exist
  const expectedPrograms = Object.values(FILENAME_TO_PROGRAM);
  const missing = expectedPrograms.filter(p => !programMap.has(p));
  if (missing.length > 0) {
    console.error(`\n✗ Missing programs in DB: ${missing.join(', ')}`);
    console.error('  Please insert these into stevie_programs first.');
    process.exit(1);
  }

  // Step 2: Parse all markdown files
  const seedDir = path.resolve(__dirname, '../../docs/award_seeding');
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('_doc.md'));
  console.log(`\nFound ${files.length} markdown files in ${seedDir}`);

  const allCategories: ParsedCategory[] = [];
  for (const file of files) {
    const filePath = path.join(seedDir, file);
    const categories = parseMarkdownFile(filePath);
    allCategories.push(...categories);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PARSED: ${allCategories.length} total categories`);
  console.log(`  Need enrichment: ${allCategories.filter(c => c.needs_enrichment).length}`);
  console.log(`  Ready: ${allCategories.filter(c => !c.needs_enrichment).length}`);

  // Step 3: Enrich categories that need it
  const enrichmentNeeded = allCategories.filter(c => c.needs_enrichment);
  if (enrichmentNeeded.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ENRICHING ${enrichmentNeeded.length} categories via GPT-4o-mini`);
    console.log('='.repeat(60));
    await enrichBatch(allCategories);
  }

  // Step 4: Delete existing data and insert
  console.log(`\n${'='.repeat(60)}`);
  console.log('DATABASE: Delete + Fresh Insert');
  console.log('='.repeat(60));

  await backupAndDelete();

  console.log(`\nInserting ${allCategories.length} categories...`);
  const { success, failed } = await insertCategories(allCategories, programMap);

  // Step 5: Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('DONE');
  console.log(`  Total parsed:    ${allCategories.length}`);
  console.log(`  Inserted:        ${success}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`  Enriched:        ${enrichmentNeeded.length}`);
  console.log();

  // Program breakdown
  const byProgram = new Map<string, number>();
  for (const cat of allCategories) {
    byProgram.set(cat.program_code, (byProgram.get(cat.program_code) || 0) + 1);
  }
  console.log('Program breakdown:');
  for (const [code, count] of [...byProgram.entries()].sort()) {
    console.log(`  ${code.padEnd(8)} ${count}`);
  }
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
