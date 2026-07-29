/**
 * control-bytes.test.ts — the ADR-289 D7 gate.
 *
 * Guards the search-lies class: a raw NUL makes search tooling treat a file as
 * binary and return NOTHING for every query against it, while `tsc` compiles it
 * and every test passes. The gate is the only thing in the toolchain that can
 * see one, so these tests pin that it does — and, just as importantly, that it
 * does not fire on the escapes that are the correct way to write the same byte.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findControlBytes, formatControlByteFailure } from './control-bytes';

let roots: string[] = [];

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'repokit-ctlbytes-test-'));
  roots.push(root);
  return root;
}

function write(root: string, relative: string, text: string): void {
  const full = join(root, relative);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, text);
}

/** Built at runtime so this test file never contains a raw control byte itself. */
const NUL = String.fromCharCode(0);
const ESC = String.fromCharCode(27);
const DEL = String.fromCharCode(127);

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe('findControlBytes', () => {
  it('a clean tree yields nothing', () => {
    const root = repo();
    write(root, 'packages/chord/src/analyzer.ts', 'const key = `${a}\\u0000${b}`;\n');
    write(root, 'docs/adr.md', '# Fine\n\nTabs\tand newlines are text.\n');
    expect(findControlBytes(root)).toEqual([]);
  });

  it('catches a raw NUL and reports its file, line and codepoint', () => {
    const root = repo();
    write(root, 'packages/chord/src/analyzer.ts', `const a = 1;\nconst key = \`x${NUL}y\`;\n`);
    const hits = findControlBytes(root);
    expect(hits).toHaveLength(1);
    expect(hits[0].file).toBe(join('packages', 'chord', 'src', 'analyzer.ts'));
    expect(hits[0].line).toBe(2);
    expect(hits[0].codepoints).toEqual(['U+0000']);
  });

  it('catches ESC and DEL too, not just NUL', () => {
    const root = repo();
    write(root, 'a.ts', `const strip = /${ESC}\\[[0-9]*m/;\n`);
    write(root, 'b.ts', `const x = "${DEL}";\n`);
    const codepoints = findControlBytes(root).flatMap((h) => h.codepoints);
    expect(codepoints).toContain('U+001B');
    expect(codepoints).toContain('U+007F');
  });

  it('the escape form — the fix the gate asks for — does NOT fire', () => {
    const root = repo();
    // The literal characters backslash-u-0-0-0-0, which is what D7 requires.
    write(root, 'a.ts', 'const key = `${ns}\\u0000${name}`;\n');
    expect(findControlBytes(root)).toEqual([]);
  });

  it('tab, newline and carriage return are text, not control bytes', () => {
    const root = repo();
    write(root, 'a.ts', 'const a = 1;\r\n\tconst b = 2;\r\n');
    expect(findControlBytes(root)).toEqual([]);
  });

  it('skips build output and dependencies — a bundled NUL is not source', () => {
    const root = repo();
    write(root, 'packages/chord/dist/index.js', `x${NUL}y\n`);
    write(root, 'packages/chord/dist-esm/index.js', `x${NUL}y\n`);
    write(root, 'node_modules/dep/index.js', `x${NUL}y\n`);
    write(root, 'coverage/report.json', `{"x":"${NUL}"}\n`);
    expect(findControlBytes(root)).toEqual([]);
  });

  it('skips binary and snapshot file types', () => {
    const root = repo();
    // Not in the allowlist: a sourcemap and a golden snapshot, both of which
    // can legitimately carry control bytes.
    write(root, 'a.js.map', `{"x":"${NUL}"}\n`);
    write(root, 'tests/__snapshots__/a.test.ts.snap', `exports[\`x\`] = \`${ESC}[0m\`;\n`);
    expect(findControlBytes(root)).toEqual([]);
  });

  it('reports every offending line, not just the first', () => {
    const root = repo();
    write(root, 'a.ts', `const a = "${NUL}";\nconst b = 2;\nconst c = "${NUL}";\n`);
    const hits = findControlBytes(root);
    expect(hits.map((h) => h.line)).toEqual([1, 3]);
  });
});

describe('formatControlByteFailure', () => {
  it('names each site and the remedy', () => {
    const message = formatControlByteFailure([
      { file: 'packages/chord/src/analyzer.ts', line: 2635, codepoints: ['U+0000'] },
    ]);
    expect(message).toContain('packages/chord/src/analyzer.ts:2635');
    expect(message).toContain('U+0000');
    expect(message).toContain('ADR-289 D7');
    expect(message).toContain('escape');
  });

  it('truncates a long list rather than flooding the console', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      file: `a${i}.ts`,
      line: i + 1,
      codepoints: ['U+0000'],
    }));
    const message = formatControlByteFailure(many);
    expect(message).toContain('and 5 more');
    expect(message).toContain('25 raw control byte(s)');
  });
});
