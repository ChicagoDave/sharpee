/**
 * test-tree-document.test.ts — `sharpee test --tree` over the ADR-307 tree
 * document (REAL-PATH, rule 13a): a temp Chord author project (root `.story`
 * + `<story-id>.tests.json`) runs through the real chord compile →
 * bootstrap → branch-tester tree-walker chain at the pinned seed — no stubs
 * of any owned dependency. Covers the Phase 2 exit bar: a branched document
 * produces PASS rows with derived labels through the real CLI, and a seeded
 * content edit surfaces as a failed assertion at the seam — not a crash, not
 * a silent pass, and never blocking the lines around it (D4).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runTestCommand } from './test.js';

const STORY = `story
  title: Mini
  authors: T
  id: mini
  story-version: 0.0.1

create the Den
  a room
  north to the Garden

  A small square den.

create the Garden
  a room

  Roses everywhere.

create the brass lamp
  in the Den

  It gleams dully.

create the player
  starts in the Den

  You.
`;

/**
 * The document a Testing tab session would have written: opening, asserted
 * boot look, an examine turn carrying a branch (an alternate `look`), then a
 * move north. Seed pinned at 42 (D5).
 */
const TREE_DOCUMENT = {
  version: 1,
  story: 'mini',
  seed: 42,
  cards: [
    { type: 'opening' },
    { type: 'boot', assertions: { contains: ['A small square den'] } },
    {
      type: 'turn',
      command: 'examine the brass lamp',
      assertions: { contains: ['gleams dully'] },
      branches: [
        {
          branch: 1,
          cards: [
            { type: 'turn', command: 'look', assertions: { contains: ['A small square den'] } },
          ],
        },
      ],
    },
    {
      type: 'turn',
      command: 'north',
      assertions: {
        contains: ['Roses everywhere'],
        // A channel claim: its id must be derived from the document, forwarded
        // through loadAuthorGame into the assembler, captured on this command,
        // and evaluated — the whole ADR-294 D15 chain, or this claim fails
        // with "said nothing this turn" and the run exits 1.
        channels: [{ id: 'room-name', contains: ['Garden'] }],
      },
    },
  ],
};

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-tree-doc-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  writeFileSync(
    join(projectDir, 'mini.tests.json'),
    `${JSON.stringify(TREE_DOCUMENT, null, 2)}\n`,
  );
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Silence the runner's console reporting; return captured text. */
function muted<T>(fn: () => Promise<T>): Promise<{ code: T; out: string; err: string }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  return fn()
    .then((code) => ({
      code,
      out: log.mock.calls.map((c) => c.join(' ')).join('\n'),
      err: error.mock.calls.map((c) => c.join(' ')).join('\n'),
    }))
    .finally(() => {
      log.mockRestore();
      error.mockRestore();
    });
}

describe('sharpee test --tree over a tree document (ADR-307 Phase 2, REAL-PATH)', () => {
  it('discovery prefers the document, runs both lines against the real engine, labels derived (exit 0)', async () => {
    const { code, out } = await muted(() => runTestCommand(['--tree', projectDir]));
    expect(code).toBe(0);
    // The document path announced itself — discovery routed here, not tests/.
    expect(out).toContain('Tree document: mini.tests.json (seed 42, 2 line(s))');
    // Derived labels (D2/Q-8): the main line from its opening room, the
    // branch from its fork room and first command.
    expect(out).toContain('✓ opening-den (2 turns)');
    expect(out).toContain('✓ den · look (1 turn)');
    expect(out).toContain('2 passed');
    // The branch's replay share is real and visible: the fresh boot replayed
    // the boot look + examine before the branch's own look.
    expect(out).toMatch(/\d+ commands \(\d+ authored \+ \d+ replayed\)/);
  }, 60_000);

  it('a content edit is a seam: that claim fails, surrounding lines still pass (exit 1, D4)', async () => {
    writeFileSync(join(projectDir, 'mini.story'), STORY.replace('It gleams dully.', 'It is tarnished.'));
    try {
      const { code, out } = await muted(() => runTestCommand(['--tree', projectDir]));
      expect(code).toBe(1);
      // The seam: exactly the examine claim, cited on its row.
      expect(out).toContain('✗ opening-den');
      expect(out).toContain('gleams dully');
      // The branch forks BEFORE the seam card's claims broke anything
      // structural — it still runs and still passes (seams never block).
      expect(out).toContain('✓ den · look (1 turn)');
      expect(out).toContain('1 passed, 1 failed');
    } finally {
      writeFileSync(join(projectDir, 'mini.story'), STORY);
    }
  }, 60_000);

  it('explicit transcript files bypass document discovery — the fallback path runs', async () => {
    const transcript = join(projectDir, 'explicit.transcript');
    writeFileSync(transcript, 'title: Explicit\n---\n\n> look\n[OK: contains "A small square den"]\n');
    try {
      const { code, out } = await muted(() => runTestCommand(['--tree', projectDir, transcript]));
      expect(code).toBe(0);
      // The transcript path announced itself; the document path never did.
      expect(out).not.toContain('Tree document:');
      expect(out).toContain('1 passed');
    } finally {
      rmSync(transcript);
    }
  }, 60_000);

  it('a newer-version document is refused by name (exit 2, AC-4)', async () => {
    const refusedDir = mkdtempSync(join(tmpdir(), 'devkit-tree-doc-refused-'));
    try {
      writeFileSync(join(refusedDir, 'mini.story'), STORY);
      writeFileSync(
        join(refusedDir, 'mini.tests.json'),
        JSON.stringify({ ...TREE_DOCUMENT, version: 99 }),
      );
      const { code, err } = await muted(() => runTestCommand(['--tree', refusedDir]));
      expect(code).toBe(2);
      expect(err).toContain('version 99');
      expect(err).toContain('update Sharpee');
    } finally {
      rmSync(refusedDir, { recursive: true, force: true });
    }
  });

  it('a malformed document is an error at the CLI, never a silent pass (exit 2)', async () => {
    const malformedDir = mkdtempSync(join(tmpdir(), 'devkit-tree-doc-malformed-'));
    try {
      writeFileSync(join(malformedDir, 'mini.story'), STORY);
      writeFileSync(join(malformedDir, 'mini.tests.json'), '{ not json');
      const { code, err } = await muted(() => runTestCommand(['--tree', malformedDir]));
      expect(code).toBe(2);
      expect(err).toContain('not valid JSON');
    } finally {
      rmSync(malformedDir, { recursive: true, force: true });
    }
  });
});
