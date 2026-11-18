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

const OPENING_STORY = `story
  title: The Short Night
  authors:
    T
  id: short-night
  story-version: 0.0.1
  description: One room and one note.
  prologue:
    It was late, and the house had gone quiet.

create the Study
  a room

  A narrow study.

create the note
  a thing, scenery
  in the Study

  A folded note.

  on the player reading
    lose
  end on

create Alex
  a person
  playable
  starts in the Study

  You.

before the game starts
  change the player to Alex
end before
`;

describe('sharpee play: the opening and the ending (GH #704)', () => {
  let openingDir: string;
  beforeAll(() => {
    openingDir = mkdtempSync(join(tmpdir(), 'devkit-play-opening-'));
    writeFileSync(join(openingDir, 'short-night.story'), OPENING_STORY);
  });
  afterAll(() => rmSync(openingDir, { recursive: true, force: true }));

  /** Play the story with the given piped lines; returns everything console.log printed. */
  async function play(lines: string[]): Promise<string> {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPlayCommand([openingDir], {
        input: Readable.from(lines),
        output: new PassThrough(),
        isTTY: false,
      });
      expect(code).toBe(0);
      return log.mock.calls.map((c) => c.join(' ')).join('\n');
    } finally {
      log.mockRestore();
    }
  }

  it('prints the prologue, then the banner, then the first room', async () => {
    const out = await play([]);

    const prologue = out.indexOf('It was late, and the house had gone quiet.');
    const title = out.indexOf('The Short Night');
    const room = out.indexOf('A narrow study.');
    expect(prologue).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(prologue);
    expect(room).toBeGreaterThan(title);
    // The banner is rendered from its record, never printed as the record.
    expect(out).not.toContain('"title"');
    expect(out).not.toContain('{');
  }, 60_000);

  it('prints one blank line between the parts of the opening', async () => {
    const out = await play(['look\n']);

    const opening = out.slice(out.indexOf('It was late'), out.indexOf('> look'));
    expect(opening).toContain('It was late, and the house had gone quiet.\n\nThe Short Night');
    expect(opening).toContain('Story v0.0.1\n\nStudy');
  }, 60_000);

  it('prints the new game\'s opening after a RESTART', async () => {
    const out = await play(['restart\n']);

    const afterRestart = out.slice(out.indexOf('> restart'));
    const ack = afterRestart.indexOf('The story restarts.');
    const prologue = afterRestart.indexOf('It was late, and the house had gone quiet.');
    const title = afterRestart.indexOf('The Short Night');
    const room = afterRestart.indexOf('A narrow study.');
    expect(ack).toBeGreaterThan(-1);
    expect(prologue).toBeGreaterThan(ack);
    expect(title).toBeGreaterThan(prologue);
    expect(room).toBeGreaterThan(title);
  }, 60_000);

  it('says the story has ended, once, on the turn it ends', async () => {
    const out = await play(['read note\n']);

    expect(out.split('The story has ended').length - 1).toBe(1);
  }, 60_000);

  it('answers a command after the ending with the ended line, not the engine error', async () => {
    const out = await play(['read note\n', 'look\n']);

    const afterLook = out.slice(out.indexOf('> look'));
    expect(afterLook).toContain('The story has ended');
    expect(out).not.toContain('executeTurn');
    expect(out).not.toContain("'stopped'");
  }, 60_000);
});

describe("sharpee play: the opening in the story's order", () => {
  let reorderedDir: string;
  beforeAll(() => {
    reorderedDir = mkdtempSync(join(tmpdir(), 'devkit-play-reordered-'));
    writeFileSync(
      join(reorderedDir, 'short-night.story'),
      `${OPENING_STORY}\nwhen the game starts\n  show-prologue\n  do-first-look\n  show-banner\nend when\n`,
    );
  });
  afterAll(() => rmSync(reorderedDir, { recursive: true, force: true }));

  it('prints the room before the banner when the block says so', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    let out: string;
    try {
      const code = await runPlayCommand([reorderedDir], {
        input: Readable.from([]),
        output: new PassThrough(),
        isTTY: false,
      });
      expect(code).toBe(0);
      out = log.mock.calls.map((c) => c.join(' ')).join('\n');
    } finally {
      log.mockRestore();
    }

    const prologue = out.indexOf('It was late, and the house had gone quiet.');
    const room = out.indexOf('A narrow study.');
    const title = out.indexOf('The Short Night');
    expect(prologue).toBeGreaterThan(-1);
    expect(room).toBeGreaterThan(prologue);
    expect(title).toBeGreaterThan(room);
  }, 60_000);
});
