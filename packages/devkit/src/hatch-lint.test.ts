/**
 * hatch-lint.test.ts — the devkit-side (authoritative) `'chord.'` hatch
 * source lint (design.md §5.6; hatch-context proposal 2026-07-12): quoted
 * literals in hatch source are findings with file:line; comments are
 * stripped first so prose mentions pass; compose exits 1 on findings.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { lintHatchSources } from './hatch-lint.js';
import { runCompose, runComposeGates } from './commands/compose.js';

const DIR = mkdtempSync(join(tmpdir(), 'hatch-lint-test-'));
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

function write(name: string, content: string): string {
  const file = join(DIR, name);
  writeFileSync(file, content);
  return file;
}

describe('lintHatchSources', () => {
  it('finds a quoted chord. literal with its file and 1-based line', () => {
    write(
      'leaky.ts',
      [
        "export const flavor = () => {", // line 1
        "  const key = 'chord.private-key';", // line 2 — the hit
        '  return { kind: "literal", text: key };',
        '};',
        '',
      ].join('\n')
    );
    const findings = lintHatchSources(DIR, ['./leaky.ts']);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toContain('leaky.ts');
    expect(findings[0].line).toBe(2);
    expect(findings[0].text).toContain('chord.private-key');
  });

  it('does NOT trip on chord. inside comments (line, block, or quoted-in-comment)', () => {
    write(
      'commented.ts',
      [
        "// the old producer read 'chord.flag.gate-closed' by string — retired",
        '/* chord.anything in a block comment,',
        "   even quoted: 'chord.flag.x' */",
        'export const flavor = () => ({ kind: "literal", text: "clean" });',
        '',
      ].join('\n')
    );
    expect(lintHatchSources(DIR, ['./commented.ts'])).toEqual([]);
  });

  it('scans the compiled dist fallback when the declared .ts is absent, and skips missing modules', () => {
    mkdirSync(join(DIR, 'dist'), { recursive: true });
    writeFileSync(join(DIR, 'dist', 'compiled-only.js'), 'exports.flavor = () => "chord.private-key";\n');
    const findings = lintHatchSources(DIR, ['./compiled-only.ts', './does-not-exist.ts']);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toContain(join('dist', 'compiled-only.js'));
  });
});

/** The lint-case story used by the compose-hosted tests below. */
function lintCaseStory(extraLines: string[] = []): string {
  return [
    'story "Lint Case" by "Test"',
    '  id: lint-case',
    '',
    'create the Lab',
    '  a room',
    '',
    '  A bare room.',
    '',
    'create the player',
    '  starts in the Lab',
    '',
    '  You.',
    '',
    'create the note',
    '  readable',
    '  in the Lab',
    '',
    '  A note.',
    '',
    '  on reading it',
    '    phrase note-text',
    '  end on',
    '',
    'define phrases en-US',
    '  note-text:',
    '    It reads: {garbled}',
    '',
    'define text garbled from "./leaky.ts"',
    '',
    ...extraLines,
  ].join('\n');
}

const LEAKY_HATCH = "export const garbled = () => ({ kind: 'literal', text: 'chord.private-key' });\n";

describe('sharpee compose hosts the lint', () => {
  it('exits 1 and reports file:line when a declared hatch source references chord.*', async () => {
    const storyDir = mkdtempSync(join(tmpdir(), 'hatch-lint-story-'));
    try {
      writeFileSync(join(storyDir, 'leaky.ts'), LEAKY_HATCH);
      writeFileSync(join(storyDir, 'story.story'), lintCaseStory());

      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const code = await runCompose([join(storyDir, 'story.story'), '--check']);
        expect(code).toBe(1);
        const output = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toContain('hatch.chord-namespace');
        expect(output).toMatch(/leaky\.ts:1 /);
        expect(output).toContain('design.md §5.6');
      } finally {
        stderr.mockRestore();
      }
    } finally {
      rmSync(storyDir, { recursive: true, force: true });
    }
  });

  it('prints the hatch finding and summary lines byte-for-byte (ADR-276 D4 regression)', async () => {
    const storyDir = mkdtempSync(join(tmpdir(), 'hatch-lint-story-'));
    try {
      writeFileSync(join(storyDir, 'leaky.ts'), LEAKY_HATCH);
      const file = join(storyDir, 'story.story');
      writeFileSync(file, lintCaseStory());

      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const code = await runCompose([file, '--check']);
        expect(code).toBe(1);
        const lines = stderr.mock.calls.map((c) => c.join(' '));
        expect(lines).toEqual([
          `${join(storyDir, 'leaky.ts')}:1 error [hatch.chord-namespace] \`export const garbled = () => ({ kind: 'literal', text: 'chord.private-key' });\` — the chord.* state namespace is loader-private; hatches read the world through their context only (design.md §5.6)`,
          `compose: ${file} hatch source references chord.* (1 hit(s))`,
        ]);
      } finally {
        stderr.mockRestore();
      }
    } finally {
      rmSync(storyDir, { recursive: true, force: true });
    }
  });
});

describe('runComposeGates — the unified diagnostics stream (ADR-276 D4)', () => {
  it('collects a compile diagnostic and a hatch record in ONE collection, compile first', async () => {
    const storyDir = mkdtempSync(join(tmpdir(), 'hatch-lint-story-'));
    try {
      writeFileSync(join(storyDir, 'leaky.ts'), LEAKY_HATCH);
      const file = join(storyDir, 'story.story');
      // An analyzer error (undeclared trait adjective) AND a chord.* hatch
      // violation in the same story — one pass yields both record kinds.
      writeFileSync(
        file,
        lintCaseStory(['create the widget', '  frobnicating', '  in the Lab', '', '  A widget.', ''])
      );

      const gates = runComposeGates(file);
      expect(gates.ok).toBe(false);
      expect(gates.compile.ok).toBe(false);

      const compileRecord = gates.diagnostics.find((r) => r.code === 'analysis.trait-not-declared');
      expect(compileRecord).toBeDefined();
      expect(compileRecord!.severity).toBe('error');
      expect(compileRecord!.file).toBe(file);
      expect(compileRecord!.span).toBeDefined();
      expect(compileRecord!.line).toBe(compileRecord!.span!.line);

      const hatchRecord = gates.diagnostics.find((r) => r.code === 'hatch.chord-namespace');
      expect(hatchRecord).toBeDefined();
      expect(hatchRecord!.severity).toBe('error');
      expect(hatchRecord!.file).toBe(join(storyDir, 'leaky.ts'));
      expect(hatchRecord!.line).toBe(1);
      expect(hatchRecord!.span).toBeUndefined();
      expect(hatchRecord!.message).toContain("`export const garbled = () => ({ kind: 'literal', text: 'chord.private-key' });`");
      expect(hatchRecord!.message).toContain('design.md §5.6');

      // One stream, deterministic order: compile diagnostics before hatch records.
      expect(gates.diagnostics.indexOf(compileRecord!)).toBeLessThan(
        gates.diagnostics.indexOf(hatchRecord!)
      );

      // D4 defines the shape, not a new transport: text mode keeps its
      // historical gating — a failed compile reports NO hatch text.
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const code = await runCompose([file, '--check']);
        expect(code).toBe(1);
        const output = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toContain('failed the load-time gates');
        expect(output).not.toContain('hatch.chord-namespace');
      } finally {
        stderr.mockRestore();
      }
    } finally {
      rmSync(storyDir, { recursive: true, force: true });
    }
  });

  it('reports ok with an empty collection for a clean story and hatch source', () => {
    const storyDir = mkdtempSync(join(tmpdir(), 'hatch-lint-story-'));
    try {
      writeFileSync(
        join(storyDir, 'leaky.ts'),
        "export const garbled = () => ({ kind: 'literal', text: 'clean' });\n"
      );
      const file = join(storyDir, 'story.story');
      writeFileSync(file, lintCaseStory());

      const gates = runComposeGates(file);
      expect(gates.ok).toBe(true);
      expect(gates.compile.ok).toBe(true);
      expect(gates.hatchFindings).toEqual([]);
      expect(gates.diagnostics.filter((r) => r.severity === 'error')).toEqual([]);
    } finally {
      rmSync(storyDir, { recursive: true, force: true });
    }
  });
});
