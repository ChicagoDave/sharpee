/**
 * from-play.test.ts — `sharpee transcript-from-play` (ADR-305 D5/D6), including
 * the REAL-PATH replay half: text created from a played session's records is
 * written into a temp Chord project and passes a genuine chord compile →
 * story-loader → bootstrap → runner run. No stubs of any owned dependency —
 * the play FEED itself is exercised at its own layers (platform-browser unit
 * tests; the IDE's live-webview test).
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runFromPlayCommand } from './from-play.js';
import { runTestCommand } from './test.js';

const STORY = `story
  title: Mini
  authors: T
  id: mini
  story-version: 0.0.1
  auto-assertion: room-name-and-description
create the Den
  a room

  A small square den.

create the player
  starts in the Den

  You.
`;

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), 'devkit-fromplay-'));
  writeFileSync(join(dir, 'mini.story'), STORY);
  mkdirSync(join(dir, 'tests', 'transcripts'), { recursive: true });
  return dir;
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Run the command with a seamed stdin payload, capturing stdout/stderr. */
async function run(payload: unknown): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const out = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
  const err = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderr += args.join(' ') + '\n';
  });
  try {
    const code = await runFromPlayCommand(
      typeof payload === 'string' ? payload : JSON.stringify(payload)
    );
    return { code, stdout, stderr };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

/** Silence the runner's console reporting (test.test.ts convention). */
function muted<T>(fn: () => Promise<T>): Promise<T> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  return fn().finally(() => {
    log.mockRestore();
    error.mockRestore();
  });
}

const PLAYED_SESSION = {
  policy: 'room-name-and-description',
  seed: 42,
  turns: [
    { turn: 1, command: 'wait', output: 'Time passes.', selected: false },
    {
      turn: 2,
      command: 'look',
      output: 'Den\nA small square den.',
      captures: [
        { channel: 'room-name', values: ['Den'] },
        { channel: 'room-description', values: ['A small square den.'] }
      ],
      selected: true
    }
  ]
};

describe('sharpee transcript-from-play', () => {
  it('emits the created transcript on stdout with exit 0', async () => {
    const { code, stdout } = await run(PLAYED_SESSION);
    expect(code).toBe(0);
    expect(stdout).toContain('seed: 42');
    expect(stdout).toContain('> wait');
    expect(stdout).toContain('[SKIP]');
    expect(stdout).toContain('> look');
    expect(stdout).toContain('[OK: contains "Den"]');
    expect(stdout).toContain('[OK: contains "A small square den."]');
  });

  it('REAL PATH: the created file passes a genuine run of the story it was played against', async () => {
    const dir = project();
    dirs.push(dir);

    const { code, stdout } = await run(PLAYED_SESSION);
    expect(code).toBe(0);
    writeFileSync(join(dir, 'tests', 'transcripts', 'created.transcript'), stdout);

    const rerun = await muted(() => runTestCommand([dir]));
    expect(rerun).toBe(0);
  });

  it('refuses malformed JSON: exit 2, nothing on stdout, nothing on disk', async () => {
    const dir = project();
    dirs.push(dir);
    const before = readdirSync(join(dir, 'tests', 'transcripts'));

    const { code, stdout, stderr } = await run('{not json');
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain('not valid JSON');
    expect(readdirSync(join(dir, 'tests', 'transcripts'))).toEqual(before);
  });

  it('refuses a payload missing seed/turns: exit 2, nothing on stdout', async () => {
    const { code, stdout, stderr } = await run({ turns: 'nope' });
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain('{ seed, turns[] }');
  });

  it('refuses an empty selection (FromPlayError): exit 2, nothing on stdout', async () => {
    const { code, stdout, stderr } = await run({
      seed: 42,
      turns: [{ turn: 1, command: 'look', output: 'Den', selected: false }]
    });
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain('no turns selected');
  });
});
