/**
 * publish.test.ts — `sharpee publish` (ADR-284).
 *
 * The refusal paths are the point of this suite. Publication is where a missing
 * IFID stops being a warning (ADR-298 D5), and a refusal that had already built
 * a bundle would be a half-artifact the author has to clean up — so every
 * rejection case asserts what is NOT on disk afterwards, not just the thrown
 * error.
 *
 * The zip's structure is pinned because it is a contract with itch.io's
 * HTML-project flow: `index.html` at the archive root. That would otherwise be
 * verified once by hand and then drift silently.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { unzipSync, strFromU8 } from 'fflate';
import { checkPublishable, zipDirectory, cleanOutputDirectory, PublishError } from './publish.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-publish-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** A story that compiles, with the header fields the test needs. */
function writeStory(name: string, header: string): string {
  const file = path.join(tmp, `${name}.story`);
  fs.writeFileSync(
    file,
    `${header}

create the Landing
  a room

  A quiet place to begin.

create the player
  starts in the Landing
`,
  );
  return file;
}

const IFID = '8221EC69-3D96-4F60-A057-99D1FE72000F';

describe('checkPublishable', () => {
  it('reports the story id and IFID of a publishable story', () => {
    const file = writeStory(
      'orchard',
      `story\n  title: Orchard\n  id: orchard\n  ifid: ${IFID}`,
    );

    const target = checkPublishable(file);

    expect(target.storyId).toBe('orchard');
    expect(target.ifid).toBe(IFID);
    expect(target.projectDir).toBe(tmp);
  });

  // REJECTS WHEN: no IFID (ADR-298 D5 — the whole reason publish is stricter
  // than compile).
  it('REFUSES a story with no ifid, and builds nothing', () => {
    const file = writeStory('orchard', 'story\n  title: Orchard\n  id: orchard');

    expect(() => checkPublishable(file)).toThrow(PublishError);
    try {
      checkPublishable(file);
    } catch (error) {
      expect((error as PublishError).code).toBe('publish.missing-ifid');
      // The message must name both fixes, because both exist.
      expect((error as PublishError).message).toContain('sharpee ifid');
      expect((error as PublishError).message).toContain('Generate IFID');
    }

    expect(fs.existsSync(path.join(tmp, 'dist'))).toBe(false);
    expect(fs.readdirSync(tmp)).toEqual(['orchard.story']);
  });

  it('REFUSES an empty ifid the same as a missing one', () => {
    const file = writeStory('orchard', 'story\n  title: Orchard\n  id: orchard\n  ifid:');

    // An `ifid:` with no value is a parse error before it is a publish
    // refusal — either way nothing is published and nothing is written.
    expect(() => checkPublishable(file)).toThrow(PublishError);
    expect(fs.existsSync(path.join(tmp, 'dist'))).toBe(false);
  });

  // REJECTS WHEN: the story does not compile.
  it('REFUSES a story that does not compile, naming the first error', () => {
    const file = path.join(tmp, 'broken.story');
    fs.writeFileSync(file, 'story\n  title: Broken\n  id: broken\n  mood: purple\n');

    try {
      checkPublishable(file);
      throw new Error('expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(PublishError);
      expect((error as PublishError).code).toBe('publish.compile-failed');
      expect((error as PublishError).message).toContain('header-unknown-field');
    }
    expect(fs.existsSync(path.join(tmp, 'dist'))).toBe(false);
  });

  // REJECTS WHEN: there is no story at all.
  it('REFUSES a path that is not there', () => {
    try {
      checkPublishable(path.join(tmp, 'nope.story'));
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as PublishError).code).toBe('publish.story-missing');
    }
  });

  it('resolves imports, so a multi-file story is publishable', () => {
    fs.writeFileSync(
      path.join(tmp, 'extra.chord'),
      'create the Shed\n  a room\n\n  A shed.\n',
    );
    const file = writeStory(
      'harbor',
      `story\n  title: Harbor\n  id: harbor\n  ifid: ${IFID}\n\nimport "extra"`,
    );

    expect(checkPublishable(file).storyId).toBe('harbor');
  });
});

describe('cleanOutputDirectory', () => {
  // Regression test for a defect found by the first real publish: fernhill's
  // artifact carried a game.js.map five hours older than its game.js, because
  // buildBrowser writes into dist/web/<id> without clearing it. Anything left
  // by an earlier build otherwise ships to strangers.
  it('removes output left by an earlier build', () => {
    const outDir = path.join(tmp, 'dist', 'web', 'orchard');
    fs.mkdirSync(path.join(outDir, 'themes'), { recursive: true });
    fs.writeFileSync(path.join(outDir, 'game.js.map'), 'stale map');
    fs.writeFileSync(path.join(outDir, 'themes', 'gone.css'), 'stale theme');

    const cleared = cleanOutputDirectory(tmp, 'orchard');

    expect(cleared).toBe(outDir);
    expect(fs.existsSync(outDir)).toBe(false);
  });

  it('is a no-op on a first publish, when there is nothing to clear', () => {
    expect(() => cleanOutputDirectory(tmp, 'orchard')).not.toThrow();
  });

  it('clears only this story, not a sibling built beside it', () => {
    const mine = path.join(tmp, 'dist', 'web', 'orchard');
    const other = path.join(tmp, 'dist', 'web', 'harbor');
    fs.mkdirSync(mine, { recursive: true });
    fs.mkdirSync(other, { recursive: true });
    fs.writeFileSync(path.join(other, 'index.html'), 'someone else');

    cleanOutputDirectory(tmp, 'orchard');

    expect(fs.existsSync(mine)).toBe(false);
    expect(fs.existsSync(path.join(other, 'index.html'))).toBe(true);
  });
});

describe('zipDirectory', () => {
  it('puts index.html at the ARCHIVE ROOT — itch.io accepts nothing else', () => {
    const dir = path.join(tmp, 'web');
    fs.mkdirSync(path.join(dir, 'themes'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>x</title>');
    fs.writeFileSync(path.join(dir, 'game.js'), 'console.log(1)');
    fs.writeFileSync(path.join(dir, 'themes', 'dark.css'), 'body{}');

    const entries = unzipSync(zipDirectory(dir));
    const names = Object.keys(entries).sort();

    expect(names).toEqual(['game.js', 'index.html', 'themes/dark.css']);
    expect(names).toContain('index.html'); // at the root, not under a folder
    expect(strFromU8(entries['index.html'])).toContain('<!doctype html>');
    // Nested files keep forward slashes whatever the host platform uses.
    expect(names.some((n) => n.includes('\\'))).toBe(false);
  });

  it('round-trips file contents byte for byte', () => {
    const dir = path.join(tmp, 'web');
    fs.mkdirSync(dir, { recursive: true });
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    fs.writeFileSync(path.join(dir, 'asset.bin'), bytes);

    const entries = unzipSync(zipDirectory(dir));

    expect(Array.from(entries['asset.bin'])).toEqual(Array.from(bytes));
  });
});
