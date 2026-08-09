/**
 * auto-assertion.test.ts — the `auto-assertion:` policy end to end (REAL-PATH,
 * Phase 6e, #253): a temp Chord project whose `.story` header declares the
 * policy runs a BARE-command transcript through the real chord compile →
 * story-loader → bootstrap → runner chain; the runner writes the assertion
 * into the transcript file on disk, and the written file passes a fresh run.
 * No stubs of any owned dependency.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTestCommand } from './test.js';

const STORY_BASE = `story
  title: Mini
  authors: T
  id: mini
  story-version: 0.0.1
{POLICY}
create the Den
  a room

  A small square den.

create the player
  starts in the Den

  You.
`;

function project(policyLine: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'devkit-autoassert-'));
  const story = STORY_BASE.replace('{POLICY}', policyLine ? `  ${policyLine}\n` : '');
  writeFileSync(join(dir, 'mini.story'), story);
  mkdirSync(join(dir, 'tests', 'transcripts'), { recursive: true });
  return dir;
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Silence the runner's console reporting (test.test.ts convention). */
function muted<T>(fn: () => Promise<T>): Promise<T> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  return fn().finally(() => {
    log.mockRestore();
    error.mockRestore();
  });
}

describe('auto-assertion policy, real path (Phase 6e)', () => {
  it('all-emitted-text: a bare command run writes [OK] + the real turn into the file, which then passes a fresh run', async () => {
    const dir = project('auto-assertion: all-emitted-text');
    dirs.push(dir);
    const transcriptPath = join(dir, 'tests', 'transcripts', 'bare.transcript');
    writeFileSync(transcriptPath, 'title: Bare\nseed: 42\n---\n\n> look\n');

    const code = await muted(() => runTestCommand([dir]));
    expect(code).toBe(0);

    const onDisk = readFileSync(transcriptPath, 'utf-8');
    expect(onDisk).toContain('> look');
    expect(onDisk).toContain('[OK]');
    expect(onDisk).toContain('text');
    expect(onDisk).toContain('end text');
    // The block holds the REAL story's output, not a placeholder.
    expect(onDisk).toContain('A small square den.');

    // The written file is now an ordinary asserted transcript: it passes.
    const rerun = await muted(() => runTestCommand([dir]));
    expect(rerun).toBe(0);
  });

  it('room-name-and-description: contains-form is written from the real room emissions', async () => {
    const dir = project('auto-assertion: room-name-and-description');
    dirs.push(dir);
    const transcriptPath = join(dir, 'tests', 'transcripts', 'bare.transcript');
    writeFileSync(transcriptPath, 'title: Bare\nseed: 42\n---\n\n> look\n');

    const code = await muted(() => runTestCommand([dir]));
    expect(code).toBe(0);

    const onDisk = readFileSync(transcriptPath, 'utf-8');
    expect(onDisk).toContain('[OK: contains');
    expect(onDisk).toContain('A small square den.');

    const rerun = await muted(() => runTestCommand([dir]));
    expect(rerun).toBe(0);
  });

  it('without the header field, a bare command still fails the run (ADR-294 D2 stands)', async () => {
    const dir = project('');
    dirs.push(dir);
    const transcriptPath = join(dir, 'tests', 'transcripts', 'bare.transcript');
    const source = 'title: Bare\nseed: 42\n---\n\n> look\n';
    writeFileSync(transcriptPath, source);

    const code = await muted(() => runTestCommand([dir]));
    expect(code).toBe(1);
    expect(readFileSync(transcriptPath, 'utf-8')).toBe(source);
  });

  it('the policy applies through the tree path too (sharpee test --tree)', async () => {
    const dir = project('auto-assertion: all-emitted-text');
    dirs.push(dir);
    const transcriptPath = join(dir, 'tests', 'transcripts', 'bare.transcript');
    writeFileSync(transcriptPath, 'title: Bare\nseed: 42\n---\n\n> look\n');

    const code = await muted(() => runTestCommand([dir, '--tree']));
    expect(code).toBe(0);
    expect(readFileSync(transcriptPath, 'utf-8')).toContain('[OK]');
  });
});
