/**
 * compose.test.ts — `sharpee compose` behavior: gate-clean stories emit IR
 * (the `-o` write is asserted by re-reading the file), gate failures exit 1
 * with `.story` line numbers on stderr.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { runCompose } from './compose';

const CHORD_FIXTURES = join(__dirname, '..', '..', '..', 'chord', 'tests', 'fixtures');
const OUT_DIR = mkdtempSync(join(tmpdir(), 'compose-test-'));

afterAll(() => rmSync(OUT_DIR, { recursive: true, force: true }));

describe('sharpee compose', () => {
  it('writes valid Story IR JSON with -o (pure-IR story, load proof included)', async () => {
    const out = join(OUT_DIR, 'ac5.ir.json');
    const code = await runCompose([join(CHORD_FIXTURES, 'ac5-random.story'), '-o', out]);
    expect(code).toBe(0);

    // The mutation under test: the file exists and holds the versioned IR.
    const ir = JSON.parse(readFileSync(out, 'utf8'));
    expect(ir.format).toBe('story language 1');
    expect(Array.isArray(ir.entities)).toBe(true);
    expect(ir.entities.length).toBeGreaterThan(0);
  });

  it('exits 1 on a gate failure and reports the .story line', async () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCompose([join(CHORD_FIXTURES, 'gates', 'missing-phrase.story'), '--check']);
      expect(code).toBe(1);
      const output = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('analysis.missing-phrase');
      expect(output).toMatch(/missing-phrase\.story:\d+:\d+/);
    } finally {
      stderr.mockRestore();
    }
  });

  it('exits 2 with usage on missing file argument', async () => {
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await runCompose([])).toBe(2);
    } finally {
      stderr.mockRestore();
    }
  });
});
