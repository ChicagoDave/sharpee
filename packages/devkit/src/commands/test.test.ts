/**
 * test.test.ts — `sharpee test` routing after the ADR-307 cutover: the test
 * tree (the `<story-id>.tests/` directory, ADR-355) is the only run model. Discovery + delegation run REAL-PATH (a
 * temp Chord project through the real chord compile → bootstrap → walker
 * chain — document-run behavior itself is pinned in
 * test-tree-document.test.ts); every retired form fails by name with exit 2,
 * never a silent pass or silent fallback.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TREE_DOCUMENT_VERSION, ensureSegmentIds, segmentTree, type TreeDocument } from '@sharpee/branch-tester';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runTestCommand } from './test.js';

const STORY = `story
  title: Mini
  authors:
    T
  id: mini
  story-version: 0.0.1

create the Den
  a room

  A small square den.

create Alex
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Alex
end before

`;

/** The tree a Testing tab session would have written. Seed pinned (D5). */
const TREE_DOCUMENT: TreeDocument = {
  version: TREE_DOCUMENT_VERSION,
  story: 'mini',
  seed: 42,
  id: 'root0000',
  cards: [
    { type: 'opening' },
    { type: 'boot', assertions: { contains: ['A small square den'] } },
  ],
};

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-test-cmd-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  ensureSegmentIds(TREE_DOCUMENT);
  mkdirSync(join(projectDir, 'mini.tests'));
  for (const [name, text] of Object.entries(segmentTree(TREE_DOCUMENT))) {
    writeFileSync(join(projectDir, 'mini.tests', name), text);
  }
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

describe('sharpee test routes to the tree document (ADR-307 cutover)', () => {
  it('discovers and runs the document against the REAL compiled story (exit 0)', async () => {
    const { code, out } = await muted(() => runTestCommand([projectDir]));
    expect(code).toBe(0);
    expect(out).toContain('Test tree: mini.tests/');
  }, 60_000);

  it('--tree is accepted — the IDE spawn spelling changes nothing', async () => {
    const { code, out } = await muted(() =>
      runTestCommand([join(projectDir, 'mini.story'), '--tree']),
    );
    expect(code).toBe(0);
    expect(out).toContain('Test tree: mini.tests/');
  }, 60_000);
});

describe('retired forms fail by name, never silently (ADR-307 cutover)', () => {
  it('a .transcript argument is refused with the document pointer (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([projectDir, 'old.transcript']));
    expect(code).toBe(2);
    expect(err).toContain("'.transcript' files are retired");
    expect(err).toContain('<story-id>.tests/ directory');
  });

  it('--chain is refused by name (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([projectDir, '--chain']));
    expect(code).toBe(2);
    expect(err).toContain('--chain is retired');
  });

  it('--coverage is refused by name (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([projectDir, '--coverage']));
    expect(code).toBe(2);
    expect(err).toContain('--coverage is retired');
  });

  it('an unknown flag is a usage error (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([projectDir, '--frobnicate']));
    expect(code).toBe(2);
    expect(err).toContain('unknown flag');
  });

  it('a project without a test tree is a named condition, not an empty pass (exit 2)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'devkit-test-empty-'));
    try {
      writeFileSync(join(empty, 'mini.story'), STORY);
      const { code, err } = await muted(() => runTestCommand([empty]));
      expect(code).toBe(2);
      expect(err).toContain('no test tree found');
      expect(err).toContain('expected a <story-id>.tests/ directory beside the .story file');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('a project holding only the retired one-file tree is told there is no test tree — never run from it (exit 2)', async () => {
    const retired = mkdtempSync(join(tmpdir(), 'devkit-test-retired-'));
    try {
      writeFileSync(join(retired, 'mini.story'), STORY);
      writeFileSync(
        join(retired, 'mini.tests.json'),
        '{ "version": 2, "story": "mini", "seed": 42, "cards": [{ "type": "opening" }] }\n',
      );
      const { code, out, err } = await muted(() => runTestCommand([retired]));
      expect(code).toBe(2);
      expect(err).toContain('no test tree found');
      expect(out).not.toContain('Loading story');
    } finally {
      rmSync(retired, { recursive: true, force: true });
    }
  });

  it('an unresolvable project name is a usage error (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand(['no-such-story-registered']));
    expect(code).toBe(2);
    expect(err).toContain('neither a directory nor a registered story');
  });
});
