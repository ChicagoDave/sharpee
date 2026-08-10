/**
 * test.test.ts — `sharpee test` routing after the ADR-307 cutover: the tree
 * document is the only run model. Discovery + delegation run REAL-PATH (a
 * temp Chord project through the real chord compile → bootstrap → walker
 * chain — document-run behavior itself is pinned in
 * test-tree-document.test.ts); every retired form fails by name with exit 2,
 * never a silent pass or silent fallback.
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

  A small square den.

create the player
  starts in the Den

  You.
`;

/** The document a Testing tab session would have written. Seed pinned (D5). */
const TREE_DOCUMENT = {
  version: 1,
  story: 'mini',
  seed: 42,
  cards: [
    { type: 'opening' },
    { type: 'boot', assertions: { contains: ['A small square den'] } },
  ],
};

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-test-cmd-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  writeFileSync(join(projectDir, 'mini.tests.json'), `${JSON.stringify(TREE_DOCUMENT, null, 2)}\n`);
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
    expect(out).toContain('Tree document: mini.tests.json');
  }, 60_000);

  it('--tree is accepted — the IDE spawn spelling changes nothing', async () => {
    const { code, out } = await muted(() =>
      runTestCommand([join(projectDir, 'mini.story'), '--tree']),
    );
    expect(code).toBe(0);
    expect(out).toContain('Tree document: mini.tests.json');
  }, 60_000);
});

describe('retired forms fail by name, never silently (ADR-307 cutover)', () => {
  it('a .transcript argument is refused with the document pointer (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([projectDir, 'old.transcript']));
    expect(code).toBe(2);
    expect(err).toContain("'.transcript' files are retired");
    expect(err).toContain('.tests.json');
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

  it('a project without a tree document is a named condition, not an empty pass (exit 2)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'devkit-test-empty-'));
    try {
      writeFileSync(join(empty, 'mini.story'), STORY);
      const { code, err } = await muted(() => runTestCommand([empty]));
      expect(code).toBe(2);
      expect(err).toContain('no tree document found');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('an unresolvable project name is a usage error (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand(['no-such-story-registered']));
    expect(code).toBe(2);
    expect(err).toContain('neither a directory nor a registered story');
  });
});
