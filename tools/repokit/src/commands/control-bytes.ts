/**
 * control-bytes.ts — the ADR-289 D7 gate: no raw control bytes in source.
 *
 * D7 ruled that a control character belongs in source as an ESCAPE, never as a
 * raw byte, and fixed the two instances it knew about (`runtime.ts`'s NUL join
 * separator). It did not close the class: a repo sweep during ADR-289 Phase 6
 * found eight offending lines across six more files, four of them predating the
 * ADR entirely, and one written *during* its own implementation.
 *
 * The failure mode is why this is a build gate rather than a lint preference.
 * A raw NUL makes most search tooling treat the file as binary and silently
 * return NOTHING for every query against it — `grep` reports no matches in a
 * 4,400-line file rather than reporting an error. `tsc` compiles it happily (a
 * NUL inside a template literal is valid TypeScript), no test fails, and the
 * only symptom is that search lies to whoever comes next, human or agent.
 * Nothing else in the toolchain can see it, so nothing else can gate it.
 *
 * Tab, newline and carriage return are exempt — they are legitimate text.
 * Everything else in C0 (and DEL) is refused with its file, line and codepoint.
 *
 * Public interface: findControlBytes, ControlByteHit.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Directories never scanned: build output, dependencies, VCS, caches. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-esm',
  'dist-web',
  'coverage',
  '.turbo',
  '.next',
  'build',
]);

/**
 * Text file types this gate owns. An allowlist, not a denylist: binary formats
 * (images, fonts, archives, sourcemaps) are full of control bytes by nature and
 * must never be scanned. `.snap` is deliberately absent — a golden snapshot may
 * legitimately capture escape sequences from terminal output.
 */
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|story|ebnf|transcript|yml|yaml|css|html|sh)$/;

/** Raw C0 controls except tab (09), newline (0a), carriage return (0d); plus DEL (7f). */
// eslint-disable-next-line no-control-regex
const RAW_CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

/** One offending line. */
export interface ControlByteHit {
  /** Repo-relative path. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** The offending codepoints, as `U+XXXX` strings, in first-seen order. */
  codepoints: string[];
}

/** Every raw control byte in one file's text, by line. */
function scanText(text: string, file: string): ControlByteHit[] {
  const hits: ControlByteHit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!RAW_CONTROL.test(lines[i])) continue;
    const seen = new Set<string>();
    for (const ch of lines[i]) {
      if (!RAW_CONTROL.test(ch)) continue;
      seen.add('U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'));
    }
    hits.push({ file, line: i + 1, codepoints: [...seen] });
  }
  return hits;
}

/**
 * Walk the repo for raw control bytes in text sources.
 *
 * @param root repo root to scan from
 * @returns every offending line, in walk order; empty when the tree is clean
 */
export function findControlBytes(root: string): ControlByteHit[] {
  const hits: ControlByteHit[] = [];

  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // unreadable directory is not this gate's business
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
      if (!TEXT_EXT.test(name)) continue;
      // latin1 so every byte survives the read: a decode to UTF-8 could turn
      // an invalid sequence into U+FFFD and hide the very byte being hunted.
      hits.push(...scanText(readFileSync(path, 'latin1'), relative(root, path)));
    }
  };

  walk(root);
  return hits;
}

/**
 * Format the gate's failure for the console.
 *
 * @param hits offending lines from {@link findControlBytes}
 * @returns a multi-line message naming each site and the fix
 */
export function formatControlByteFailure(hits: ControlByteHit[]): string {
  const shown = hits.slice(0, 20);
  const lines = shown.map((h) => `  ${h.file}:${h.line}  ${h.codepoints.join(' ')}`);
  if (hits.length > shown.length) lines.push(`  … and ${hits.length - shown.length} more`);
  return [
    `verify: ${hits.length} raw control byte(s) in source (ADR-289 D7) —`,
    ...lines,
    '  Write the character as an escape (e.g. `\\u0000`) instead of a raw byte:',
    '  a raw control byte makes search tooling treat the file as binary and',
    '  silently report NO matches for every query against it.',
  ].join('\n');
}
