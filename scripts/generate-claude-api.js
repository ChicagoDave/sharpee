#!/usr/bin/env node
/**
 * generate-claude-api.js
 *
 * Reads generated .d.ts files from each Sharpee package and produces
 * organized markdown files in docs/claude-api/ for Claude to reference
 * when writing code against the platform.
 *
 * Run: node scripts/generate-claude-api.js
 * Integrated into build.sh after platform build.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'claude-api');

// ---------------------------------------------------------------------------
// Package → output file mapping
// ---------------------------------------------------------------------------

const PACKAGE_GROUPS = [
  {
    output: 'core.md',
    title: '@sharpee/core',
    description: 'Base types, query system, platform events, entity interfaces, debug utilities.',
    packages: [{ name: 'core', dir: 'packages/core' }],
  },
  {
    output: 'if-domain.md',
    title: '@sharpee/if-domain',
    description: 'Domain events, contracts, grammar system, language/parser provider interfaces.',
    packages: [{ name: 'if-domain', dir: 'packages/if-domain' }],
  },
  {
    output: 'world-model.md',
    title: '@sharpee/world-model',
    description:
      'Entity system (IFEntity), WorldModel, all traits, capability dispatch, scope, annotations.',
    packages: [{ name: 'world-model', dir: 'packages/world-model' }],
  },
  {
    output: 'engine.md',
    title: '@sharpee/engine',
    description:
      'GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary.',
    packages: [{ name: 'engine', dir: 'packages/engine' }],
  },
  {
    output: 'stdlib.md',
    title: '@sharpee/stdlib',
    description:
      'All 43 standard actions, validation, scope builders, NPC support, combat, action chains.',
    packages: [{ name: 'stdlib', dir: 'packages/stdlib' }],
  },
  {
    output: 'parser.md',
    title: '@sharpee/parser-en-us',
    description: 'English parser, grammar patterns, story grammar extension API.',
    packages: [{ name: 'parser-en-us', dir: 'packages/parser-en-us' }],
  },
  {
    output: 'lang.md',
    title: '@sharpee/lang-en-us',
    description: 'English language provider, message resolution, formatters.',
    packages: [{ name: 'lang-en-us', dir: 'packages/lang-en-us' }],
  },
  {
    output: 'plugins.md',
    title: 'Plugins',
    description: 'Plugin system, NPC plugin, scheduler (daemons/fuses), state machine.',
    packages: [
      { name: 'plugins', dir: 'packages/plugins' },
      { name: 'plugin-npc', dir: 'packages/plugin-npc' },
      { name: 'plugin-scheduler', dir: 'packages/plugin-scheduler' },
      { name: 'plugin-state-machine', dir: 'packages/plugin-state-machine' },
    ],
  },
  {
    output: 'text.md',
    title: 'Text System',
    description: 'Text blocks, decorations, text service, rendering.',
    packages: [
      { name: 'text-blocks', dir: 'packages/text-blocks' },
      { name: 'text-service', dir: 'packages/text-service' },
    ],
  },
  {
    output: 'if-services.md',
    title: '@sharpee/if-services',
    description: 'Runtime service interfaces (perception).',
    packages: [{ name: 'if-services', dir: 'packages/if-services' }],
  },
  {
    output: 'event-processor.md',
    title: '@sharpee/event-processor',
    description: 'Event sequencing and effect processing.',
    packages: [{ name: 'event-processor', dir: 'packages/event-processor' }],
  },
  {
    output: 'combat.md',
    title: '@sharpee/ext-basic-combat',
    description: 'Basic combat extension — attack/defend mechanics.',
    packages: [{ name: 'ext-basic-combat', dir: 'packages/extensions/basic-combat' }],
  },
];

// ---------------------------------------------------------------------------
// .d.ts resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a relative export path to an actual .d.ts file path.
 * Handles: ./foo → foo.d.ts or foo/index.d.ts
 * Also handles ESM-style .js extensions: ./foo.js → foo.d.ts
 */
function resolveDeclarationFile(basedir, relPath) {
  // Strip quotes and clean up
  relPath = relPath.replace(/['"]/g, '');

  // Skip cross-package imports (@sharpee/...)
  if (relPath.startsWith('@')) return null;

  // Handle ESM-style .js extensions → .d.ts
  if (relPath.endsWith('.js')) {
    relPath = relPath.slice(0, -3);
  }

  const full = path.resolve(basedir, relPath);

  // Try direct .d.ts
  if (fs.existsSync(full + '.d.ts')) return full + '.d.ts';

  // Try /index.d.ts
  if (fs.existsSync(path.join(full, 'index.d.ts'))) return path.join(full, 'index.d.ts');

  return null;
}

/**
 * Parse export statements from a .d.ts file and collect all referenced .d.ts files.
 * Recursively follows re-exports up to a depth limit.
 */
function collectDeclarationFiles(indexFile, maxDepth = 4) {
  const visited = new Set();
  const result = [];

  function walk(filePath, depth) {
    if (depth > maxDepth) return;
    if (visited.has(filePath)) return;
    visited.add(filePath);

    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);

    // Follow re-exports regardless of whether the file also has local declarations
    // Matches: export * from, export { ... } from, export type { ... } from
    const exportRegex = /export\s+(?:type\s+)?(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      const ref = match[1];
      if (ref.startsWith('@')) continue; // skip cross-package

      const resolved = resolveDeclarationFile(dir, ref);
      if (resolved) {
        const resolvedContent = fs.readFileSync(resolved, 'utf8');
        const barrel = isBarrelFile(resolvedContent);

        if (barrel) {
          walk(resolved, depth + 1);
        } else {
          if (!visited.has(resolved)) {
            visited.add(resolved);
            result.push(resolved);
          }
        }
      }
    }

    // If this file also has local declarations (not just re-exports), include it too
    if (hasLocalDeclarations(content)) {
      // Don't duplicate — only add if not already in result
      if (!result.includes(filePath)) {
        result.push(filePath);
      }
    }
  }

  walk(indexFile, 0);
  return result;
}

/**
 * Check if a .d.ts file is purely a barrel (only export/re-export statements and comments).
 */
function isBarrelFile(content) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/**'));

  if (lines.length === 0) return true;

  return lines.every((l) => {
    // Pure re-exports
    if (l.startsWith('export ') && l.includes(' from ')) return true;
    // Empty export
    if (l === 'export {};') return true;
    // import statements (sometimes in barrels)
    if (l.startsWith('import ')) return true;
    return false;
  });
}

/**
 * Check if a file has actual declarations (not just re-exports).
 */
function hasLocalDeclarations(content) {
  return (
    content.includes('declare class') ||
    content.includes('declare function') ||
    content.includes('declare const') ||
    content.includes('declare enum') ||
    content.includes('interface ')
  );
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

/**
 * Clean up a .d.ts file for inclusion in markdown:
 * - Strip sourceMappingURL comments
 * - Strip empty lines at end
 */
function cleanDeclaration(content) {
  return content
    .replace(/\/\/# sourceMappingURL=.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/**
 * Get a readable label for a .d.ts file path relative to the package dist/.
 */
function fileLabel(filePath, pkgDir) {
  const distDir = path.join(ROOT, pkgDir, 'dist');
  const rel = path.relative(distDir, filePath);
  // Convert e.g. traits/identity/identityTrait.d.ts → traits/identity/identityTrait
  return rel.replace(/\.d\.ts$/, '').replace(/\/index$/, '');
}

/**
 * Generate a markdown file for a package group.
 */
function generateGroupMarkdown(group) {
  const lines = [];
  lines.push(`# ${group.title}`);
  lines.push('');
  lines.push(group.description);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const pkg of group.packages) {
    const distDir = path.join(ROOT, pkg.dir, 'dist');
    const indexFile = path.join(distDir, 'index.d.ts');

    if (!fs.existsSync(indexFile)) {
      lines.push(`> **${pkg.name}**: dist/index.d.ts not found — build first.`);
      lines.push('');
      continue;
    }

    if (group.packages.length > 1) {
      lines.push(`## @sharpee/${pkg.name}`);
      lines.push('');
    }

    const dtsFiles = collectDeclarationFiles(indexFile);

    if (dtsFiles.length === 0) {
      lines.push(`> No declaration files found for ${pkg.name}.`);
      lines.push('');
      continue;
    }

    for (const dtsFile of dtsFiles) {
      const content = fs.readFileSync(dtsFile, 'utf8');
      const cleaned = cleanDeclaration(content);
      const label = fileLabel(dtsFile, pkg.dir);

      lines.push(`### ${label}`);
      lines.push('');
      lines.push('```typescript');
      lines.push(cleaned);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate index.md with navigation and summaries.
 */
function generateIndex(groups, stats) {
  const lines = [];
  lines.push('# Sharpee API Reference (for Claude)');
  lines.push('');
  lines.push(
    'Auto-generated from `.d.ts` declarations. Read these files instead of exploring the codebase when you need to understand an API.'
  );
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`);
  lines.push('');
  lines.push('## Quick Start');
  lines.push('');
  lines.push('**Building a story?** Read in this order:');
  lines.push('1. `engine.md` — `Story` interface, lifecycle methods');
  lines.push('2. `world-model.md` — `WorldModel`, `IFEntity`, all traits');
  lines.push('3. `stdlib.md` — standard actions, validation');
  lines.push('4. `parser.md` — grammar extension for story-specific commands');
  lines.push('5. `plugins.md` — NPC, scheduler, state machine');
  lines.push('');
  lines.push('**Working on platform code?** Also read:');
  lines.push('- `core.md` — base types, query system');
  lines.push('- `if-domain.md` — domain events, contracts');
  lines.push('- `event-processor.md` — event sequencing');
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('| File | Package(s) | Description |');
  lines.push('|------|-----------|-------------|');

  for (const group of groups) {
    const s = stats.get(group.output) || { files: 0, lines: 0 };
    lines.push(
      `| [${group.output}](${group.output}) | ${group.title} | ${group.description} (${s.files} files, ~${s.lines} lines) |`
    );
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const stats = new Map();
  let totalFiles = 0;
  let totalLines = 0;

  for (const group of PACKAGE_GROUPS) {
    const markdown = generateGroupMarkdown(group);
    const outPath = path.join(OUT_DIR, group.output);
    fs.writeFileSync(outPath, markdown, 'utf8');

    const lineCount = markdown.split('\n').length;
    const fileCount = (markdown.match(/^### /gm) || []).length;
    stats.set(group.output, { files: fileCount, lines: lineCount });
    totalFiles += fileCount;
    totalLines += lineCount;

    // Brief console output
    process.stdout.write(`  ${group.output} (${fileCount} declarations)\n`);
  }

  // Generate index
  const indexMarkdown = generateIndex(PACKAGE_GROUPS, stats);
  fs.writeFileSync(path.join(OUT_DIR, 'index.md'), indexMarkdown, 'utf8');

  process.stdout.write(
    `  index.md\n  Total: ${totalFiles} declarations across ${PACKAGE_GROUPS.length} files (~${totalLines} lines)\n`
  );
}

main();
