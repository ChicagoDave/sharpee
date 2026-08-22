/**
 * compose.test.ts — `sharpee compose` behavior: gate-clean stories emit IR
 * (the `-o` write is asserted by re-reading the file), gate failures exit 1
 * with `.story` line numbers on stderr.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { runCompose } from './compose.js';

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
    expect(ir.format).toBe('story language 2');
    expect(Array.isArray(ir.entities)).toBe(true);
    expect(ir.entities.length).toBeGreaterThan(0);
  });

  it('reports a broken config sidecar as a named gate error, writing NOTHING (ADR-309 D5)', async () => {
    // Compose is a read-only surface: the broken config is a diagnostic and a
    // gate failure — never a re-mint, never a reconcile.
    const dir = mkdtempSync(join(tmpdir(), 'compose-broken-config-'));
    const story =
      'story\n  title: T\n  authors:\n    A\n  id: t\n  story-version: 0.0.1\n\n' +
      'create the Den\n  a room\n\n  A small den.\n\n' +
      'create the player\n  starts in the Den\n\n  You.\n';
    const storyFile = join(dir, 't.story');
    writeFileSync(storyFile, story);
    writeFileSync(join(dir, 't.config.json'), '{ not json');
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCompose([storyFile, '--check']);
      expect(code).toBe(1);
      const output = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('story-config.broken');
      // Read-only: nothing reconciled, nothing minted.
      expect(readFileSync(storyFile, 'utf8')).toBe(story);
      expect(readFileSync(join(dir, 't.config.json'), 'utf8')).toBe('{ not json');
    } finally {
      stderr.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
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

  it('reports an analyzer error inside an imported fragment at the FRAGMENT path and line (ADR-251 D6 amended, GH #301)', async () => {
    // Dedicated fixture: a story importing `regions/market`, whose room fires
    // an undefined phrase at line 7 of the fragment. Pre-fix this was reported
    // as `<story>:7` — an innocent main-file line.
    const dir = mkdtempSync(join(tmpdir(), 'compose-fragment-span-'));
    const story =
      'story\n  title: T\n  authors:\n    A\n  id: t\n  story-version: 0.0.1\n\n' +
      'import "regions/market"\n\n' +
      'create the player\n  starts in the Market\n\n  You.\n';
    const fragment = 'create the Market\n  a room\n\n  Stalls.\n\n  after entering it\n    phrase no-such-key\n  end after\n';
    const storyFile = join(dir, 't.story');
    writeFileSync(storyFile, story);
    mkdirSync(join(dir, 'regions'));
    writeFileSync(join(dir, 'regions', 'market.chord'), fragment);
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runCompose([storyFile, '--check']);
      expect(code).toBe(1);
      const output = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain(`${join(dir, 'regions', 'market.chord')}:7:`);
      expect(output).toContain('analysis.missing-phrase');
      expect(output).not.toMatch(/t\.story:7:/);
    } finally {
      stderr.mockRestore();
      rmSync(dir, { recursive: true, force: true });
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
