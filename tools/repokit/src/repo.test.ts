/**
 * repo.test.ts — repo-layout helpers.
 *
 * findChordStoryFile is covered here because it is the helper that removed
 * repokit's runtime dependency on @sharpee/devkit from the build path: version
 * stamping calls it on every `repokit build`, so importing devkit for it made
 * devkit's dist/ a prerequisite for the command that builds devkit. If someone
 * later "simplifies" this back to a devkit import, a cleaned tree stops being
 * able to rebuild itself — these tests are the guard on that.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findChordStoryFile } from './repo';

let dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'repokit-repo-test-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

describe('findChordStoryFile', () => {
  it('returns the absolute path of the single .story file', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'fernhill.story'), 'story fernhill\n');

    expect(findChordStoryFile(dir)).toBe(join(dir, 'fernhill.story'));
  });

  it('returns null for a directory with no .story file (a TypeScript story)', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'package.json'), '{}');
    mkdirSync(join(dir, 'src'));

    expect(findChordStoryFile(dir)).toBeNull();
  });

  it('ignores files that merely contain .story in the name', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'notes.story.md'), '# notes\n');

    expect(findChordStoryFile(dir)).toBeNull();
  });

  it('throws naming every candidate when a project holds more than one', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'b.story'), '');
    writeFileSync(join(dir, 'a.story'), '');

    // Sorted, so the message is stable regardless of readdir order.
    expect(() => findChordStoryFile(dir)).toThrow(/2 \.story files \(a\.story, b\.story\)/);
  });
});
