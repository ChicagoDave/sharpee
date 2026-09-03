/**
 * play.test.ts — `sharpee play` over a pipe (GH #240): every piped line runs,
 * in order, and EOF ends the session with exit 0. Real path: a temp Chord
 * project through the shared author-game loader; only the streams are
 * injected.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runPlayCommand } from './play.js';

const STORY = `story
  title: Mini
  authors:
    T
  id: mini
  story-version: 0.0.1

create the Den
  a room
  north to the Loft

  A small square den.

create the Loft
  a room

  A dusty loft.

create Alex
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Alex
end before
`;

let projectDir: string;
beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-play-cmd-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
});
afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

describe('sharpee play over a pipe (GH #240)', () => {
  it('runs every piped command in order and exits 0 at EOF', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const input = Readable.from(['north\n', 'south\n', 'north\n']);
      const code = await runPlayCommand([projectDir], { input, output: new PassThrough(), isTTY: false });
      const out = log.mock.calls.map((c) => c.join(' ')).join('\n');

      expect(code).toBe(0);
      expect(out.split('> north').length - 1).toBe(2);
      expect(out.split('> south').length - 1).toBe(1);
      expect(out.split('A dusty loft.').length - 1).toBe(2); // both norths played
      expect(out.indexOf('> south')).toBeGreaterThan(out.indexOf('> north'));
    } finally {
      log.mockRestore();
    }
  }, 60_000);

  it('/quit ends the session before the remaining lines', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const input = Readable.from(['north\n', '/quit\n', 'south\n']);
      const code = await runPlayCommand([projectDir], { input, output: new PassThrough(), isTTY: false });
      const out = log.mock.calls.map((c) => c.join(' ')).join('\n');

      expect(code).toBe(0);
      expect(out).toContain('> north');
      expect(out).not.toContain('> south');
    } finally {
      log.mockRestore();
    }
  }, 60_000);
});
