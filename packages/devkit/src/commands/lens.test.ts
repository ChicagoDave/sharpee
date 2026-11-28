/**
 * lens.test.ts — `sharpee lens examinable` through its real path: the real
 * compiler, the real engine at the seed, and English's extractor found by
 * the same lookup `sharpee world-index` uses (ADR-408 AC-1, D7). The JOIN
 * test runs `sharpee world-index` on the same IR and checks the lens's
 * passage key and target id against its document (ADR-408 D4, AC-2).
 *
 * The stories are the test stories `test-stories/orchard` and
 * `test-stories/scullery` (ADR-395); nothing under them is edited.
 *
 * Owner context: @sharpee/devkit — the author CLI.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LensOutput } from '@sharpee/ide-protocol';
import type { WorldIndexResponse } from '@sharpee/world-index';
import { compileChordStory } from '../standalone/author-game.js';
import { resolveSourceSpan } from './lens-sources.js';
import { runLensCommand } from './lens.js';
import { runWorldIndex } from './world-index.js';

const TEST_STORIES = resolve(__dirname, '../../../../test-stories');
const ORCHARD = join(TEST_STORIES, 'orchard/orchard.story');
const SCULLERY = join(TEST_STORIES, 'scullery/scullery.story');

/** Runs the command and captures what it wrote to stdout and stderr. */
async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { stdout += String(chunk); return true; });
  const err = vi.spyOn(console, 'error').mockImplementation((...parts: string[]) => { stderr += `${parts.join(' ')}\n`; });
  try {
    const code = await runLensCommand(args);
    return { code, stdout, stderr };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

describe('sharpee lens examinable — the real path', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prints orchard\'s soundness header: every room reached and 92 forms examined, and exits 0', async () => {
    const { code, stdout } = await run(['examinable', ORCHARD, '--seed', '42']);
    expect(code).toBe(0);
    expect(stdout).toContain('rooms reached     5 of 5 declared');
    expect(stdout).toContain('phrases examined  92');
    // The class titles are lens-words.ts's, the one vocabulary the Testing tab prints too.
    // Re-recorded 2026-11-28 (thing-answers-both-numbers Phase 4): orchard's 6
    // plurals now resolve, so no Number form class remains.
    expect(stdout).toContain('by class          Not answered 40, Described 6\n');
    expect(stdout).toContain('Absence is not proof');
  }, 120_000);

  it('reports scullery\'s whetstone as answering with no text, as a format-3 JSON document, and exits 0 with findings present', async () => {
    const { code, stdout } = await run(['examinable', SCULLERY, '--seed', '42', '--json']);
    expect(code).toBe(0);
    const output = JSON.parse(stdout) as LensOutput;
    expect(output).toMatchObject({ lens: 'examinable', format: 3, story: 'scullery.story', ok: true });
    expect(output.refusal).toBeUndefined();
    const report = output.report!;
    expect(report.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, unreached: [] });
    expect(report.phrasesExecuted).toBe(42);
    const whetstone = report.findings.find((finding) => finding.phrase === 'whetstone');
    expect(whetstone).toMatchObject({
      kind: 'resolved-default',
      target: 'whetstone',
      targetId: 'whetstone',
      sources: [{ key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery' }],
    });
    // Re-recorded 2026-11-28 (thing-answers-both-numbers Phase 4): 20 → 16, as
    // jar, crock, whetstones and cheeses now resolve (scullery's OB-56, OB-58).
    expect(report.findings.length).toBe(16);
  }, 120_000);

  it('the console form prints each source\'s owner, kind, file and line', async () => {
    const { code, stdout } = await run(['examinable', SCULLERY, '--seed', '42']);
    expect(code).toBe(0);
    // The Scullery's description starts on line 18; the chore list's on 49.
    expect(stdout).toMatch(/"whetstone" {2}-> whetstone\n\s+from: Scullery description at scullery\.story:18 {3}\[if\.action\.examining\.default_description\]/);
    expect(stdout).toContain('from: chore list description at scullery.story:49');
  }, 120_000);

  it('JOIN — the whetstone\'s passage key is a prose key in `sharpee world-index`\'s document for the same IR, and its target id a declaration at line 35 (ADR-408 AC-2)', async () => {
    const lens = JSON.parse((await run(['examinable', SCULLERY, '--seed', '42', '--json'])).stdout) as LensOutput;
    const whetstone = lens.report!.findings.find((finding) => finding.phrase === 'whetstone' && finding.kind === 'resolved-default')!;

    const dir = mkdtempSync(join(tmpdir(), 'lens-join-'));
    try {
      const irPath = join(dir, 'scullery.ir.json');
      writeFileSync(irPath, JSON.stringify(compileChordStory(SCULLERY)));
      let indexOut = '';
      const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => { indexOut += String(chunk); return true; });
      let indexCode: number;
      try { indexCode = runWorldIndex([irPath]); } finally { out.mockRestore(); }
      expect(indexCode).toBe(0);
      const index = JSON.parse(indexOut) as WorldIndexResponse;
      if (!index.ok) throw new Error(`world-index failed: ${index.failure.message}`);

      const passage = index.prose.find((site) => site.key === whetstone.sources[0].key);
      expect(passage).toMatchObject({ key: 'scullery.description', kind: 'description', owner: 'scullery' });
      expect(passage!.text).toContain('whetstone');
      expect(index.declarations[whetstone.targetId!].span?.line).toBe(35);
      // Every room the lens names is a room the index declares.
      for (const room of lens.report!.rooms) expect(index.declarations[room.roomId]).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  // The refusal of a language with no extractor is not reachable from a
  // `.story` file: Chord writes every IR's language as `en-US`, and this
  // command compiles the story itself. It is pinned where it is reachable,
  // on an IR whose language is changed, in branch-tester's
  // `examinable-lens-real-path.test.ts` ("the language guard").

  it('a place with no .story file is exit 2, naming the place, and nothing is walked', async () => {
    const nowhere = resolve(TEST_STORIES, 'no-such-story-here');
    const { code, stdout, stderr } = await run(['examinable', nowhere]);
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr.trim()).toBe(`lens: no .story file found at ${nowhere}`);
  });

  it('resolveSourceSpan: a keyed source sits at its passage, a keyless one at its owner\'s declaration, an unknown one nowhere', () => {
    const ir = compileChordStory(SCULLERY);
    expect(resolveSourceSpan(ir, { key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery' })).toMatchObject({ line: 18, endLine: 19 });
    expect(resolveSourceSpan(ir, { key: null, kind: 'state', ownerId: 'whetstone', ownerName: 'whetstone' })?.line).toBe(35);
    expect(resolveSourceSpan(ir, { key: 'no-such.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery' })).toBeNull();
    expect(resolveSourceSpan(ir, { key: null, kind: 'state', ownerId: null, ownerName: 'stranger' })).toBeNull();
  });

  it('rejects an unknown lens and a bad budget as usage errors, exit 2', async () => {
    expect((await run(['declared-state', ORCHARD])).code).toBe(2);
    const bad = await run(['examinable', ORCHARD, '--max-seconds', '0']);
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain('--max-seconds takes a whole number of at least 1');
    // The walk's flags went with the walk (ADR-408 Amendment 1).
    expect((await run(['examinable', ORCHARD, '--max-states', '600'])).code).toBe(2);
  });
});
