/**
 * grammar-seam-guard.test.ts — a grammar rule crosses from Chord to the
 * matcher as structured parts, and nothing on that path reads the rule's
 * display text back as a pattern (ADR-382 AC7). The test scans the source of
 * the four packages on the seam for the scans that used to re-split it, so
 * the seam cannot silently reopen.
 *
 * One place is allowed: `parser-en-us/src/english-pattern-compiler.ts` is the
 * one text front end (`define(text)` → parts, ADR-382 D3). Parsing pattern
 * text is its job. No other line is allowed: the parser seats a noun by its
 * compiled slot's seat (ADR-383 D5), so the five `rule.pattern.includes(…)`
 * seat tests are gone and the allowance list is asserted empty.
 *
 * Public interface: none (a vitest suite under `pnpm test:scripts`).
 * Owner context: repo tooling, guarding the grammar seam across if-domain,
 * parser-en-us, story-loader and chord.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The source trees on the seam. */
const SEAM_DIRS = [
  'packages/if-domain/src/grammar',
  'packages/parser-en-us/src',
  'packages/story-loader/src',
  'packages/chord/src',
];

/** Scans that read pattern text or a manifest shape as a pattern. */
const FORBIDDEN: ReadonlyArray<{ name: string; test: RegExp }> = [
  { name: "a `startsWith(':')` slot scan", test: /startsWith\(\s*['"]:['"]\s*\)/ },
  { name: 'a string operation on a rule`s `pattern`', test: /\.pattern\s*\.\s*(split|match|matchAll|replace|replaceAll|startsWith|endsWith|includes|indexOf|search|slice|substring)\s*\(/ },
  { name: 'a `:slot` substring test', test: /includes\(\s*(`:\$\{|['"]:['"]\s*\+)/ },
  { name: 'a string operation on a grammar shape', test: /(grammarShapes|shape)\s*(\[[^\]]*\])?\s*\.\s*(split|match|matchAll|startsWith|includes)\s*\(/ },
];

/** The one file whose job is parsing pattern text (ADR-382 D3). */
const TEXT_FRONT_END = 'packages/parser-en-us/src/english-pattern-compiler.ts';

/** Lines allowed to scan pattern text, by file and exact trimmed line; empty, and asserted so. */
const ALLOWED_LINES: ReadonlyArray<{ file: string; line: string }> = [];

/** Every .ts source file under a directory. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.d.ts') ? [path] : [];
  });
}

/**
 * The lines of a source text that match a forbidden scan, comment lines left out.
 * @param file The repo-relative path, for the allowances
 * @param text The file's text
 * @returns One entry per offending line
 */
export function findSeamScans(file: string, text: string): Array<{ file: string; line: number; text: string; scan: string }> {
  if (file === TEXT_FRONT_END) return [];
  const found: Array<{ file: string; line: number; text: string; scan: string }> = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) return;
    if (ALLOWED_LINES.some((allowed) => allowed.file === file && allowed.line === line)) return;
    for (const scan of FORBIDDEN) {
      if (scan.test.test(raw)) found.push({ file, line: index + 1, text: line, scan: scan.name });
    }
  });
  return found;
}

describe('the grammar seam carries parts, not text (ADR-382 AC7)', () => {
  const files = SEAM_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir))).map((path) => ({
    file: relative(ROOT, path),
    text: readFileSync(path, 'utf8'),
  }));

  it('scans every seam package', () => {
    for (const dir of SEAM_DIRS) expect(files.some((f) => f.file.startsWith(dir)), dir).toBe(true);
  });

  it('no seam source scans a rule`s pattern text or a shape string', () => {
    expect(files.flatMap((f) => findSeamScans(f.file, f.text))).toEqual([]);
  });

  it('allows no line outside the text front end', () => {
    expect(ALLOWED_LINES).toEqual([]);
  });

  it('flags a seat test on a rule`s pattern text, the kind the parser used to carry', () => {
    const seatTest = "} else if (rule.pattern.includes(':item from :container')) {";
    expect(findSeamScans('packages/parser-en-us/src/english-parser.ts', seatTest)).toHaveLength(1);
  });

  it('flags each scan the seam used to carry', () => {
    const offending = [
      "const lineSlots = words.filter((w) => w.startsWith(':'));",
      'const words = rule.pattern.split(/\\s+/);',
      'if (text.includes(`:${slot}`)) types[slot] = type;',
      'const verb = shape.split(" ")[0];',
      "if (pattern.includes(':' + slot)) found = true;",
    ].join('\n');
    expect(findSeamScans('packages/chord/src/example.ts', offending).map((f) => f.line)).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves a colon test on something other than a pattern alone', () => {
    const unrelated = "const isTemplate = markers.some((m) => m.includes(' ') || m.includes(':'));";
    expect(findSeamScans('packages/chord/src/example.ts', unrelated)).toEqual([]);
  });
});
