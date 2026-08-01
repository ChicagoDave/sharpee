/**
 * random-gate.ts — the split ADR-293 D6 entropy gate for `repokit verify`.
 *
 * Two checks (A1 ruling 1):
 *  1. STRICT PATH GATE — `createSeededRandom(` may appear only under
 *     `packages/engine/src/`, `packages/core/src/random/`,
 *     `packages/story-loader/src/` (the Chord evaluator, until it folds in),
 *     and test code. Anywhere else is a hard failure: gameplay code draws
 *     exclusively through `ChoicePoint` handles.
 *  2. ALLOWLIST GATE — `Math.random(` / `crypto.randomUUID(` in non-test
 *     source must match the checked-in allowlist (`entropy-allowlist.txt`,
 *     per-file occurrence counts) seeded with the pre-ADR id-generation
 *     idiom that D13 defers. Only NEW entropy fails; removing entropy also
 *     fails, so the list shrinks consciously as sites are cleaned up.
 *
 * Comment mentions are ignored via a line heuristic (lines starting with
 * `//`, `*`, or `/*`), so documentation may name the banned calls.
 *
 * Public interface: `checkRandomGate`, `formatRandomGateFailure`.
 * Owner context: tools/repokit — the in-repo platform build tool.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Directories never scanned: build output, dependencies, VCS, caches. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-esm',
  'dist-npm',
  'dist-web',
  'coverage',
  // Test code is exempt from both gates (D6's test-fixture exemption).
  'tests',
  '__tests__',
  'test-utils',
  'test-support',
  'fixtures',
  // repokit's own source names the banned calls in this gate.
  'repokit',
]);

/** Trees scanned, relative to the repo root. */
const SCAN_ROOTS = ['packages', 'stories', 'tools'];

/** Paths (prefixes) where `createSeededRandom(` construction is sanctioned. */
const STRICT_ALLOWED_PREFIXES = [
  'packages/engine/src/',
  'packages/core/src/random/',
  'packages/story-loader/src/',
];

const TEST_FILE = /\.(test|spec)\.ts$/;
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

export interface RandomGateFailure {
  file: string;
  reason: string;
}

/** Count non-comment occurrences of a call token in a source text. */
function countCalls(text: string, token: string): number {
  let count = 0;
  for (const line of text.split('\n')) {
    if (COMMENT_LINE.test(line)) continue;
    let index = line.indexOf(token);
    while (index !== -1) {
      count++;
      index = line.indexOf(token, index + token.length);
    }
  }
  return count;
}

/** Parse `entropy-allowlist.txt`: `<count> <path>` lines, `#` comments. */
function parseAllowlist(text: string): Map<string, number> {
  const entries = new Map<string, number>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(\d+)\s+(.+)$/.exec(line);
    if (match) entries.set(match[2], Number(match[1]));
  }
  return entries;
}

/**
 * Run both halves of the D6 gate.
 *
 * @param root repo root
 * @param allowlistPath absolute path to the checked-in entropy allowlist
 * @returns every failure; empty when the tree is clean
 */
export function checkRandomGate(root: string, allowlistPath: string): RandomGateFailure[] {
  const failures: RandomGateFailure[] = [];
  const allowlist = parseAllowlist(readFileSync(allowlistPath, 'utf8'));
  const seenEntropy = new Map<string, number>();

  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const path = join(dir, name);
      let st;
      try {
        st = statSync(path);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!name.endsWith('.ts') || TEST_FILE.test(name)) continue;

      const rel = relative(root, path).replace(/\\/g, '/');
      const text = readFileSync(path, 'utf8');

      // 1. Strict path gate.
      const constructions = countCalls(text, 'createSeededRandom(');
      const isDefinition = rel === 'packages/core/src/random/seeded-random.ts';
      if (
        constructions > 0 &&
        !isDefinition &&
        !STRICT_ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix))
      ) {
        failures.push({
          file: rel,
          reason:
            `calls createSeededRandom() outside the sanctioned paths — gameplay code ` +
            `draws through ChoicePoint handles (ADR-293 D6)`,
        });
      }

      // 2. Allowlist gate.
      const entropy =
        countCalls(text, 'Math.random(') + countCalls(text, 'crypto.randomUUID(');
      if (entropy > 0) seenEntropy.set(rel, entropy);
    }
  };

  for (const scanRoot of SCAN_ROOTS) walk(join(root, scanRoot));

  for (const [file, count] of seenEntropy) {
    const allowed = allowlist.get(file);
    if (allowed === undefined) {
      failures.push({
        file,
        reason:
          `new Math.random()/crypto.randomUUID() (${count} occurrence(s)) — declare a ` +
          `ChoicePoint instead, or add the file to entropy-allowlist.txt with justification (ADR-293 D6)`,
      });
    } else if (allowed !== count) {
      failures.push({
        file,
        reason:
          `entropy count changed (${count} found, ${allowed} allowlisted) — update ` +
          `entropy-allowlist.txt consciously (ADR-293 D6)`,
      });
    }
  }
  for (const [file, allowed] of allowlist) {
    if (!seenEntropy.has(file)) {
      failures.push({
        file,
        reason: `allowlisted (${allowed}) but no entropy found — remove the stale entry from entropy-allowlist.txt`,
      });
    }
  }

  return failures;
}

/** Human-readable failure block for the verify output. */
export function formatRandomGateFailure(failures: RandomGateFailure[]): string {
  const lines = failures.map((f) => `  ${f.file}: ${f.reason}`);
  return [`verify: ADR-293 D6 entropy gate FAILED (${failures.length} issue(s)):`, ...lines].join('\n');
}
