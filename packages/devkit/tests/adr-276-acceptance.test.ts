/**
 * adr-276-acceptance.test.ts — ADR-276 Phase 8: the composite acceptance
 * fixture through the REAL `sharpee compose --check` path.
 *
 * Acceptance item 1: the fixture carries all four of the ADR's named
 * violations (typo'd `remove from action` target, unmatched removal shape,
 * a `true`/`false` setting given a word, an unknown direction word) and a
 * single `compose --check` run reports all four compile codes and exits 1 —
 * no load, no IR emitted. The unknown direction surfaces as
 * `analysis.trait-not-declared` (census 16 is parser-gated; Phase 6).
 *
 * The same fixture file is compiled by the browser-bundled chord dist in
 * `src/standalone/manifest-browser-parity.test.ts` — one source, both paths.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCompose } from '../src/commands/compose.js';

export const COMPOSITE_FIXTURE = join(__dirname, 'fixtures', 'adr-276-composite.story');

export const COMPOSITE_CODES = [
  'analysis.trait-not-declared',
  'analysis.setting-not-boolean',
  'analysis.removal-target',
  'analysis.unmatched-removal-pattern',
] as const;

describe('ADR-276 Acceptance item 1 — composite fixture via sharpee compose --check', () => {
  it('reports all four diagnostics with spans in one run and exits 1 without emitting IR', async () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const code = await runCompose([COMPOSITE_FIXTURE, '--check']);
      expect(code).toBe(1);
      const lines = stderr.mock.calls.map((c) => c.join(' '));
      for (const expected of COMPOSITE_CODES) {
        const line = lines.find((l) => l.includes(`[${expected}]`));
        expect(line, `diagnostic ${expected} reported`).toBeDefined();
        // Site format `file:line:column` — the span reaches the author.
        expect(line).toMatch(new RegExp(`adr-276-composite\\.story:\\d+:\\d+ error \\[${expected}\\]`));
      }
      expect(lines.at(-1)).toContain('failed the load-time gates (4 error(s))');
      expect(stdout).not.toHaveBeenCalled(); // --check: no IR on stdout, no load
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});
