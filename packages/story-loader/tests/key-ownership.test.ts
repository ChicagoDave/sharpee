/**
 * key-ownership.test.ts — ADR-356 AC-5, as an assertion rather than a
 * promise: no source file outside `packages/story-loader/src` writes the
 * loader's state keys. `state-keys.ts`'s header says the keys are
 * loader-internal; `arrange()` exists so the derived runner never has to
 * touch one; this test is what makes both true on every run.
 *
 * Two signals, either of which fails the test: a literal spelling of a key
 * (`chord.state.`, `chord.story.state`, `chord.occurrence.`, `chord.gone.`)
 * anywhere in a source file, or a `setStateValue(` call whose argument
 * names one of the exported constants for those keys. Reading a key through
 * the constants (the assertion core's `StoryStateKeys`) is allowed and is
 * why the second signal is scoped to the write call.
 *
 * Owner context: story-loader test suite.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
const PACKAGE_ROOTS = ['packages', 'packages/extensions'];
const OWNER = resolve(repoRoot, 'packages/story-loader/src');

const KEY_LITERALS = ['chord.state.', 'chord.story.state', 'chord.occurrence.', 'chord.gone.'];
const KEY_CONSTANTS = ['CHORD_STATE_PREFIX', 'CHORD_STORY_STATE_KEY', 'CHORD_OCCURRENCE_PREFIX', 'CHORD_GONE_PREFIX', 'CHORD_SELECT_PREFIX'];
const WRITE_CALL = new RegExp(`setStateValue\\(\\s*(?:${KEY_CONSTANTS.join('|')})`);

/** Every `.ts` source file under a package `src/`, outside the owner. */
function sourceFilesOutsideOwner(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (entry === 'node_modules' || entry === 'dist' || entry === 'dist-esm' || entry.startsWith('_archive')) continue;
      const info = statSync(path);
      if (info.isDirectory()) walk(path);
      else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) files.push(path);
    }
  };
  for (const root of PACKAGE_ROOTS) {
    const rootDir = resolve(repoRoot, root);
    for (const pkg of readdirSync(rootDir)) {
      const src = join(rootDir, pkg, 'src');
      if (src === OWNER) continue;
      let isDir = false;
      try {
        isDir = statSync(src).isDirectory();
      } catch {
        isDir = false;
      }
      if (isDir) walk(src);
    }
  }
  return files;
}

describe('AC-5 — the loader keys have one writer', () => {
  const files = sourceFilesOutsideOwner();

  it('scans a real set of source files', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.includes('/branch-tester/src/'))).toBe(true);
    expect(files.some((f) => f.includes('/transcript-tester/src/'))).toBe(true);
  });

  it('no source file outside packages/story-loader/src spells a loader key', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const literal of KEY_LITERALS) {
        if (text.includes(literal)) offenders.push(`${relative(repoRoot, file)}: "${literal}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no source file outside packages/story-loader/src writes a loader key through its constant', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (WRITE_CALL.test(text)) offenders.push(relative(repoRoot, file));
    }
    expect(offenders).toEqual([]);
  });
});
