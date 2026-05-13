#!/usr/bin/env node
/**
 * validate-bundle-baseline.js — ADR-178 §AC-5 enforcement.
 *
 * Walks a `.sharpee` bundle's story.js (or a raw JS bundle file), pulls
 * every external module reference, and exits non-zero if any reference
 * is not in `STORY_RUNTIME_BASELINE`.
 *
 * Usage:
 *   node scripts/validate-bundle-baseline.js <bundle-path> [baseline-module]
 *
 * Defaults:
 *   baseline-module = packages/story-runtime-baseline/dist/index.js
 *
 * Exit codes:
 *   0 — every external reference is in the baseline.
 *   1 — at least one reference is not in the baseline. stderr lists each
 *       offending reference, one per line.
 *
 * Notes on detection:
 *   The story bundle is a flat JS file produced by esbuild with
 *   `@sharpee/*` marked external. External references survive as
 *   string-literal specifiers in `import`, dynamic `import()`, and
 *   `require()` forms. A regex pass over the source is sufficient — no
 *   AST parser is needed for this contract, and keeping the validator
 *   AST-free means it can be vendored to story authors who don't ship
 *   the workspace's bundler stack.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { unzipSync, strFromU8 } = require('fflate');

function usage(stream, code) {
  stream.write(
    'usage: node scripts/validate-bundle-baseline.js <bundle-path> [baseline-module]\n'
  );
  process.exit(code);
}

function loadBaseline(modulePath) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(modulePath);
  if (!mod || !Array.isArray(mod.STORY_RUNTIME_BASELINE)) {
    throw new Error(
      `[baseline-check] baseline module did not export STORY_RUNTIME_BASELINE: ${modulePath}`
    );
  }
  return new Set(mod.STORY_RUNTIME_BASELINE);
}

function readBundleSource(bundlePath) {
  if (bundlePath.endsWith('.sharpee')) {
    const buf = fs.readFileSync(bundlePath);
    const entries = unzipSync(new Uint8Array(buf));
    const storyJs = entries['story.js'];
    if (!storyJs) {
      throw new Error(`[baseline-check] no story.js inside ${bundlePath}`);
    }
    return strFromU8(storyJs);
  }
  return fs.readFileSync(bundlePath, 'utf8');
}

// Static specifier patterns. We only match string-literal forms — the
// bundle is post-bundle output, so external references are always
// literal specifiers.
const SPECIFIER_PATTERNS = [
  // `from "<pkg>"` / `from '<pkg>'`
  /\bfrom\s*['"]([^'"]+)['"]/g,
  // `import("<pkg>")` / `import('<pkg>')`
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // `require("<pkg>")` / `require('<pkg>')`
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function isExternal(specifier) {
  if (!specifier) return false;
  if (specifier.startsWith('.')) return false;
  if (specifier.startsWith('/')) return false;
  // Node built-ins like `node:fs` are not in scope for stories; the
  // baseline does not list them and they should not appear in `.sharpee`
  // bundles. Treat `node:` as external-but-out-of-baseline so we still
  // flag it.
  return true;
}

function bareName(specifier) {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return name ? `${scope}/${name}` : scope;
  }
  return specifier.split('/')[0];
}

function collectReferences(source) {
  const seen = new Set();
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const spec = match[1];
      if (!isExternal(spec)) continue;
      seen.add(bareName(spec));
    }
  }
  return seen;
}

function validateBundle(bundlePath, baselinePath) {
  const baseline = loadBaseline(baselinePath);
  const source = readBundleSource(bundlePath);
  const refs = collectReferences(source);
  const offenders = [...refs].filter((r) => !baseline.has(r)).sort();
  return { refs, offenders };
}

function main(argv) {
  if (argv.length < 1 || argv[0] === '--help' || argv[0] === '-h') {
    usage(process.stdout, 0);
    return;
  }

  const bundlePath = path.resolve(argv[0]);
  const repoRoot = path.resolve(__dirname, '..');
  const defaultBaseline = path.join(
    repoRoot,
    'packages',
    'story-runtime-baseline',
    'dist',
    'index.js'
  );
  const baselinePath = argv[1] ? path.resolve(argv[1]) : defaultBaseline;

  if (!fs.existsSync(bundlePath)) {
    process.stderr.write(`[baseline-check] bundle not found: ${bundlePath}\n`);
    process.exit(1);
  }
  if (!fs.existsSync(baselinePath)) {
    process.stderr.write(
      `[baseline-check] baseline module not found: ${baselinePath} (build @sharpee/story-runtime-baseline first)\n`
    );
    process.exit(1);
  }

  let result;
  try {
    result = validateBundle(bundlePath, baselinePath);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  if (result.offenders.length === 0) {
    process.stdout.write('[baseline-check] OK\n');
    process.exit(0);
  }

  for (const offender of result.offenders) {
    process.stderr.write(
      `[baseline-check] NOT IN BASELINE: ${offender} (found in ${bundlePath})\n`
    );
  }
  process.exit(1);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  collectReferences,
  validateBundle,
  isExternal,
  bareName,
};
