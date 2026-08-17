/**
 * story-config.test.ts — ADR-309's config sidecar and reconciliation,
 * REAL-PATH: every case runs against real files in a tmpdir through the
 * production read/write/splice code — no fs stubs.
 *
 * Derived from the Behavior Statement: reconcileHeader guarantees on-disk
 * identity agreement (adopt / mint / insert / overwrite / no-op), never
 * touches config bytes on the reconcile path, refuses a BROKEN config by
 * name, and never invents identity under `mint: false`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  STORY_CONFIG_VERSION,
  StoryConfigError,
  configPathFor,
  readStoryConfig,
  reconcileHeader,
  writeStoryConfig,
} from './story-config.js';

let dir = '';

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = '';
});

const HEADER_WITH = (ifid: string) =>
  `story\n  title: Harbor\n  authors:\n    T\n  id: harbor\n  story-version: 0.1.0\n  ifid: ${ifid}\n\ncreate the Quay\n  a room\n\n  Salt air.\n`;
const HEADER_WITHOUT =
  'story\n  title: Harbor\n  authors:\n    T\n  id: harbor\n  story-version: 0.1.0\n\ncreate the Quay\n  a room\n\n  Salt air.\n';

function project(source: string): string {
  dir = mkdtempSync(join(tmpdir(), 'devkit-story-config-'));
  const storyFile = join(dir, 'harbor.story');
  writeFileSync(storyFile, source);
  return storyFile;
}

describe('adoption and minting (D2 — absent config)', () => {
  it('adopts an existing header value verbatim — recording identity, not author choice (AC-3)', () => {
    const storyFile = project(HEADER_WITH('LEGACY-NOT-A-UUID-1234'));
    const result = reconcileHeader(storyFile);

    // Value EQUALITY, not presence — and legacy non-UUID IFIDs adopt as-is.
    expect(result).toEqual({ ifid: 'LEGACY-NOT-A-UUID-1234', headerChanged: false, configCreated: 'adopted' });
    const read = readStoryConfig(configPathFor(storyFile));
    expect(read).toEqual({
      status: 'ok',
      config: { version: STORY_CONFIG_VERSION, ifid: 'LEGACY-NOT-A-UUID-1234' },
    });
  });

  it('mints once for a bare story, and renders the header line after id:', () => {
    const storyFile = project(HEADER_WITHOUT);
    const result = reconcileHeader(storyFile);

    expect(result.configCreated).toBe('minted');
    expect(result.headerChanged).toBe(true);
    const source = readFileSync(storyFile, 'utf-8');
    expect(source).toContain(`  ifid: ${result.ifid}`);
    // Directly after id: — the identity fields belong together.
    const lines = source.split('\n');
    expect(lines[lines.indexOf('  id: harbor') + 1]).toBe(`  ifid: ${result.ifid}`);
    // A second reconcile is a total no-op: same identity, no rewrite.
    const again = reconcileHeader(storyFile);
    expect(again).toEqual({ ifid: result.ifid, headerChanged: false });
  });

  it('never mints under mint: false — publish must not invent identity', () => {
    const storyFile = project(HEADER_WITHOUT);
    const result = reconcileHeader(storyFile, { mint: false });

    expect(result).toEqual({ ifid: undefined, headerChanged: false });
    expect(readStoryConfig(configPathFor(storyFile))).toEqual({ status: 'absent' });
    expect(readFileSync(storyFile, 'utf-8')).toBe(HEADER_WITHOUT);
  });

  it('adoption still runs under mint: false — existing identity is recorded', () => {
    const storyFile = project(HEADER_WITH('0F5A7B2C-1D3E-4A5B-8C9D-0E1F2A3B4C5D'));
    const result = reconcileHeader(storyFile, { mint: false });
    expect(result.ifid).toBe('0F5A7B2C-1D3E-4A5B-8C9D-0E1F2A3B4C5D');
    expect(result.configCreated).toBe('adopted');
  });
});

describe('reconciliation (D3 — present config)', () => {
  it('re-inserts a deleted header line with the identical value (AC-2)', () => {
    const storyFile = project(HEADER_WITHOUT);
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'AAAA-1111' });
    const configBytes = readFileSync(configPathFor(storyFile), 'utf-8');

    const result = reconcileHeader(storyFile);

    expect(result).toEqual({ ifid: 'AAAA-1111', headerChanged: true });
    expect(readFileSync(storyFile, 'utf-8')).toContain('  ifid: AAAA-1111');
    // The config's bytes are untouched by reconciliation (AC-2).
    expect(readFileSync(configPathFor(storyFile), 'utf-8')).toBe(configBytes);
  });

  it('overwrites an edited header value back from the config (AC-2 — edits do not stick)', () => {
    const storyFile = project(HEADER_WITH('HAND-EDITED-VALUE'));
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'BBBB-2222' });

    const result = reconcileHeader(storyFile);

    expect(result).toEqual({ ifid: 'BBBB-2222', headerChanged: true });
    const source = readFileSync(storyFile, 'utf-8');
    expect(source).toContain('  ifid: BBBB-2222');
    expect(source).not.toContain('HAND-EDITED-VALUE');
  });

  it('a consistent story is byte-untouched — no gratuitous rewrite', () => {
    const storyFile = project(HEADER_WITH('CCCC-3333'));
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'CCCC-3333' });
    const before = readFileSync(storyFile, 'utf-8');

    const result = reconcileHeader(storyFile);

    expect(result).toEqual({ ifid: 'CCCC-3333', headerChanged: false });
    expect(readFileSync(storyFile, 'utf-8')).toBe(before);
  });
});

describe('broken config stops the line (D5 / AC-4)', () => {
  it('malformed JSON is a named error — no mint, no reconcile, files untouched', () => {
    const storyFile = project(HEADER_WITHOUT);
    writeFileSync(configPathFor(storyFile), '{ this is not json');

    expect(() => reconcileHeader(storyFile)).toThrow(StoryConfigError);
    try {
      reconcileHeader(storyFile);
    } catch (error) {
      expect((error as StoryConfigError).code).toBe('story-config.broken');
      expect((error as StoryConfigError).message).toContain('not valid JSON');
    }
    // Broken stops the line: the story file gained no minted line.
    expect(readFileSync(storyFile, 'utf-8')).toBe(HEADER_WITHOUT);
  });

  it('an unknown version and a missing ifid are broken, distinct from absent', () => {
    const storyFile = project(HEADER_WITHOUT);
    const configPath = configPathFor(storyFile);

    writeFileSync(configPath, `${JSON.stringify({ version: 99, ifid: 'X' })}\n`);
    expect(readStoryConfig(configPath)).toMatchObject({ status: 'broken' });

    writeFileSync(configPath, `${JSON.stringify({ version: 1 })}\n`);
    expect(readStoryConfig(configPath)).toMatchObject({ status: 'broken', message: expect.stringContaining('ifid') });

    rmSync(configPath);
    expect(readStoryConfig(configPath)).toEqual({ status: 'absent' });
  });
});

describe('the cross-host byte contract (shared with Chord Writer)', () => {
  it('writes exactly the bytes the IDE writes for the same config', () => {
    // Pinned as a LITERAL on both sides (the IDE's StoryIdentityTests pins the
    // same string): the two hosts write the same story's identity file, so a
    // format change on either must fail a test rather than surface as a
    // spurious diff in an author's repository.
    const storyFile = project(HEADER_WITHOUT);
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'PINNED-1234' });

    expect(readFileSync(configPathFor(storyFile), 'utf-8')).toBe(
      '{\n  "ifid": "PINNED-1234",\n  "version": 1\n}\n',
    );
  });
});

describe('splice mechanics', () => {
  it('stops scanning at the first non-field line — an ifid: in a nested block is not a header field', () => {
    const source =
      'story\n  title: T\n  id: t\n\nuse thing\n  ifid: NOT-A-HEADER\n\ncreate the player\n  a room\n\n  You.\n';
    const storyFile = project(source);
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'DDDD-4444' });

    reconcileHeader(storyFile);

    const after = readFileSync(storyFile, 'utf-8');
    const lines = after.split('\n');
    // Inserted after id: in the header…
    expect(lines[lines.indexOf('  id: t') + 1]).toBe('  ifid: DDDD-4444');
    // …and the nested block's line was never treated as the header's.
    expect(after).toContain('  ifid: NOT-A-HEADER');
  });

  it('a grammar file (no story block) is left alone', () => {
    const storyFile = project('grammar\n  verb take\n');
    writeStoryConfig(configPathFor(storyFile), { version: STORY_CONFIG_VERSION, ifid: 'EEEE-5555' });

    const result = reconcileHeader(storyFile);

    expect(result.headerChanged).toBe(false);
    expect(readFileSync(storyFile, 'utf-8')).toBe('grammar\n  verb take\n');
  });
});
