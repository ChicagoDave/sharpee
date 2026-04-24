/**
 * Extracts DSLM design pattern data from markdown files into JSON
 * for the interactive pattern map visualization.
 *
 * Usage: node website/scripts/extract-patterns.mjs [path-to-patterns]
 * Default patterns path: ../sharpee-dslm/patterns (sibling repo)
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsRoot = process.argv[2] || join(__dirname, '..', '..', '..', 'sharpee-dslm', 'patterns');
const outPath = join(__dirname, '..', 'src', 'data', 'patterns.json');

const CATEGORIES = [
  { dir: 'puzzles', label: 'Puzzles', color: '#e74c3c' },
  { dir: 'geography', label: 'Geography', color: '#2ecc71' },
  { dir: 'npcs', label: 'NPCs', color: '#3498db' },
  { dir: 'objects', label: 'Objects', color: '#f39c12' },
  { dir: 'narrative', label: 'Narrative', color: '#9b59b6' },
  { dir: 'structure', label: 'Structure', color: '#1abc9c' },
  { dir: 'conversation', label: 'Conversation', color: '#e67e22' },
];

function extractId(text) {
  const m = text.match(/^#\s+DP-(\d+)/m);
  return m ? `DP-${m[1]}` : null;
}

function extractName(text) {
  const m = text.match(/^#\s+DP-\d+:\s*(.+)/m);
  return m ? m[1].trim() : 'Unknown';
}

function extractSection(text, heading) {
  const re = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractCombinations(text) {
  const section = extractSection(text, 'Combinations');
  const refs = [];
  const re = /DP-(\d+)/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    refs.push(`DP-${m[1]}`);
  }
  // dedupe
  return [...new Set(refs)];
}

async function extractCategory(catDef) {
  const dir = join(patternsRoot, catDef.dir);
  let files;
  try {
    files = (await readdir(dir)).filter(f => f.endsWith('.md') && f.startsWith('dp-'));
  } catch {
    console.warn(`Warning: could not read ${dir}`);
    return [];
  }

  const patterns = [];
  for (const file of files) {
    const text = await readFile(join(dir, file), 'utf-8');
    const id = extractId(text);
    if (!id) continue;
    patterns.push({
      id,
      name: extractName(text),
      category: catDef.label,
      intent: extractSection(text, 'Intent'),
      combinations: extractCombinations(text),
    });
  }
  return patterns;
}

async function main() {
  console.log(`Reading patterns from: ${patternsRoot}`);
  const allPatterns = [];
  for (const cat of CATEGORIES) {
    const patterns = await extractCategory(cat);
    allPatterns.push(...patterns);
    console.log(`  ${cat.label}: ${patterns.length} patterns`);
  }

  // Build category color map
  const categoryColors = {};
  for (const c of CATEGORIES) {
    categoryColors[c.label] = c.color;
  }

  // Build edges from combinations (bidirectional deduped)
  const edgeSet = new Set();
  const edges = [];
  const patternIds = new Set(allPatterns.map(p => p.id));
  for (const p of allPatterns) {
    for (const ref of p.combinations) {
      if (!patternIds.has(ref)) continue;
      const key = [p.id, ref].sort().join('--');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: p.id, target: ref });
      }
    }
  }

  const data = {
    categories: categoryColors,
    nodes: allPatterns.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      intent: p.intent,
    })),
    edges,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`\nWrote ${allPatterns.length} patterns, ${edges.length} edges to ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
