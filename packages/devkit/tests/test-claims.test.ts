/**
 * test-claims.test.ts — `sharpee test`'s claims tier (ADR-365 D6, D9, D10)
 * at the command surface: the manifest's `claims` file runs after the
 * derived tier at the tree's seed, the report carries the held-over-declared
 * ratio and every verdict, a violated or unproven claim leaves the exit code
 * alone, and a claims file the command cannot run exits 2 with the reason
 * named. Each case runs the real command function over a real project —
 * the compiled `@sharpee/chord` and `@sharpee/branch-tester` with the engine
 * behind them, no stub. The Fernhill cases are the REAL-PATH test of the
 * end-to-end scenario: the repository's own story, its manifest line, its
 * fragment, at its pinned seed.
 *
 * Owner context: devkit test suite.
 */
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { runTestCommand } from '../src/commands/test.js';

const FIXTURE = path.resolve(__dirname, 'fixtures', 'claims-tier');
const FERNHILL = path.resolve(__dirname, '..', '..', '..', 'branch-stories', 'fernhill');

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/**
 * A scratch copy of a project with its manifest rewritten (canonical form:
 * keys sorted, two-space indent, trailing newline) and, optionally, a claims
 * fragment written beside the story.
 */
function projectVariant(
  source: string,
  storyId: string,
  seed: number,
  claims: string | undefined,
  fragment?: { name: string; text: string },
): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'sharpee-claims-tier-'));
  scratch.push(dir);
  cpSync(source, dir, { recursive: true });
  const manifest = { ...(claims !== undefined ? { claims } : {}), seed, story: storyId, version: 3 };
  writeFileSync(path.join(dir, `${storyId}.tests`, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  if (fragment) writeFileSync(path.join(dir, fragment.name), fragment.text);
  return dir;
}

async function runCapturing(args: string[]): Promise<{ code: number; stdout: string[]; stderr: string[] }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand(args);
    return {
      code,
      stdout: log.mock.calls.map((call) => call.join(' ')),
      stderr: error.mock.calls.map((call) => call.join(' ')),
    };
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
}

/** Run with `--json`, capturing the NDJSON stdout carries and the text stderr carries. */
async function runStreaming(args: string[]): Promise<{ code: number; stdoutChunks: string[]; stderr: string[] }> {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand([...args, '--json']);
    return { code, stdoutChunks: chunks, stderr: error.mock.calls.map((call) => call.join(' ')) };
  } finally {
    write.mockRestore();
    log.mockRestore();
    error.mockRestore();
  }
}

const FRAGMENT = 'claims-tier.claims.chord';

describe('sharpee test — the claims tier runs when the manifest names a file (ADR-365 D6, D10)', () => {
  it('prints the ratio, each walk, and each verdict after the derived report, and exits 0', async () => {
    const { code, stdout } = await runCapturing([FIXTURE]);
    expect(code).toBe(0);
    const rooms = stdout.findIndex((line) => line.startsWith('Rooms entered:'));
    const heading = stdout.indexOf(`Claims: ${FRAGMENT}`);
    expect(rooms).toBeGreaterThan(0);
    expect(heading).toBeGreaterThan(rooms);
    expect(stdout[heading - 1]).toBe('');
    expect(stdout[heading + 1]).toBe('claims: 2 of 2 held (seed 7)');
    expect(stdout[heading + 2]).toMatch(/^1 walk, \d+\.\ds in all$/);
    expect(stdout[heading + 3]).toMatch(/^ {2}under the declared set: 2 rooms, 1 things, 1 verbs — \d+ states, \d+ commands, \d+\.\ds, stopped: frontier-exhausted$/);
    expect(stdout).toContain('HELD  the note has been read — at depth 1: read note');
    expect(stdout).toContain('HELD  the note leaves the Hall (never) — every reachable state under its set was tried (the declared set)');
  }, 60_000);

  it('a manifest without the key runs no claims and prints no claims section', async () => {
    const dir = projectVariant(FIXTURE, 'claims-tier', 7, undefined);
    const { code, stdout } = await runCapturing([dir]);
    expect(code).toBe(0);
    expect(stdout.some((line) => line.startsWith('Claims:') || line.startsWith('claims:'))).toBe(false);
  }, 60_000);

  it('under --json the report goes to stderr, nothing about claims rides the wire, and the code is unchanged', async () => {
    const { code, stdoutChunks, stderr } = await runStreaming([FIXTURE]);
    expect(code).toBe(0);
    expect(stdoutChunks.join('').toLowerCase()).not.toContain('claim');
    expect(stderr).toContain(`Claims: ${FRAGMENT}`);
    expect(stderr).toContain('claims: 2 of 2 held (seed 7)');
  }, 60_000);
});

describe('sharpee test — a claim never gates the build (ADR-365 D9, AC-3)', () => {
  it('a positive claim whose set leaves the note out is unproven, names the set, and exits 0', async () => {
    const dir = projectVariant(FIXTURE, 'claims-tier', 7, FRAGMENT, {
      name: FRAGMENT,
      text: [
        'claims',
        '  needs rooms: the Hall, the Landing',
        '  needs things: the bench',
        '  needs verbs: read',
        '',
        '  claim the note has been read',
        '    the note is read',
        '',
        '  never the note leaves the Hall',
        '    the note is not in the Hall',
        'end claims',
        '',
      ].join('\n'),
    });
    const { code, stdout } = await runCapturing([dir]);
    expect(code).toBe(0);
    expect(stdout).toContain('claims: 1 of 2 held, 1 unproven (seed 7)');
    expect(stdout).toContain('UNPROVEN  the note has been read — no reachable state under its set satisfies it (the declared set)');
    expect(stdout).toContain('HELD  the note leaves the Hall (never) — every reachable state under its set was tried (the declared set)');
  }, 60_000);

  it('a violated never prints its witness and exits 0', async () => {
    const dir = projectVariant(FIXTURE, 'claims-tier', 7, FRAGMENT, {
      name: FRAGMENT,
      text: [
        'claims',
        '  needs rooms: the Hall',
        '  needs things: the note',
        '  needs verbs: read',
        '',
        '  never the note is read',
        '    the note is read',
        'end claims',
        '',
      ].join('\n'),
    });
    const { code, stdout } = await runCapturing([dir]);
    expect(code).toBe(0);
    expect(stdout).toContain('claims: 0 of 1 held, 1 violated (seed 7)');
    expect(stdout).toContain('VIOLATED  the note is read (never) — at depth 1: read note');
  }, 60_000);
});

describe('sharpee test — a claims file the command cannot run exits 2 (ADR-365 D1, AC-4a)', () => {
  it('a path the manifest names that is not there', async () => {
    const dir = projectVariant(FIXTURE, 'claims-tier', 7, 'absent.claims.chord');
    const { code, stdout, stderr } = await runCapturing([dir]);
    expect(code).toBe(2);
    // The tree and the derived tier ran first; the claims file is what failed.
    expect(stdout.some((line) => line.startsWith('Rooms entered:'))).toBe(true);
    expect(stderr.some((line) => line.startsWith("test: claims file 'absent.claims.chord' named by manifest.json: not found ("))).toBe(true);
    expect(stdout.some((line) => line.startsWith('Claims:'))).toBe(false);
  }, 60_000);

  it('a fragment that does not compile, with the diagnostic at its line', async () => {
    const dir = projectVariant(FIXTURE, 'claims-tier', 7, FRAGMENT, {
      name: FRAGMENT,
      text: ['claims', '  needs rooms: the Hall', '  needs things: the note', '  needs verbs: read', '', '  claim the teapot is read', '    the teapot is read', 'end claims', ''].join('\n'),
    });
    const { code, stderr, stdout } = await runCapturing([dir]);
    expect(code).toBe(2);
    expect(stderr.some((line) => line.startsWith(`test: claims file '${FRAGMENT}' does not compile (1 error(s)):`))).toBe(true);
    expect(stderr.join('\n')).toMatch(new RegExp(`^ {2}${FRAGMENT.replace('.', '\\.')}:7:\\d+ \\[claims\\.unknown-entity\\] `, 'm'));
    expect(stdout.some((line) => line.startsWith('Claims:'))).toBe(false);
  }, 60_000);
});

const describeFernhill = existsSync(path.join(FERNHILL, 'fernhill.story')) ? describe : describe.skip;

describeFernhill('REAL-PATH: Fernhill\'s claims through sharpee test (ADR-365 end-to-end scenario)', () => {
  let withClaims: { code: number; stdout: string[] };

  it('reports 8 held and 1 violated from the manifest line, at the tree\'s seed', async () => {
    withClaims = await runCapturing([FERNHILL]);
    expect(withClaims.code).toBe(0);
    const heading = withClaims.stdout.indexOf('Claims: fernhill.claims.chord');
    expect(heading).toBeGreaterThan(withClaims.stdout.findIndex((line) => line.startsWith('Rooms entered:')));
    expect(withClaims.stdout[heading + 1]).toBe('claims: 8 of 9 held, 1 violated (seed 42)');
    expect(withClaims.stdout[heading + 2]).toMatch(/^8 walks, \d+\.\ds in all$/);
    const violated = withClaims.stdout.filter((line) => line.startsWith('VIOLATED'));
    expect(violated).toHaveLength(1);
    expect(violated[0]).toMatch(/^VIOLATED {2}the deed box leaves the Folly \(never\) — at depth \d+: /);
    expect(withClaims.stdout.filter((line) => line.startsWith('HELD'))).toHaveLength(8);
  }, 300_000);

  it('exits as the same run exits without the manifest line, and prints the same report up to the claims', async () => {
    const dir = projectVariant(FERNHILL, 'fernhill', 42, undefined);
    const without = await runCapturing([dir]);
    expect(without.code).toBe(withClaims.code);
    const heading = withClaims.stdout.indexOf('Claims: fernhill.claims.chord');
    // The first line names the project directory, which differs by construction.
    expect(withClaims.stdout.slice(1, heading - 1)).toEqual(without.stdout.slice(1));
  }, 300_000);
});
