/**
 * check-chord-snippets.test.ts — the Chord manual's snippet checker on the
 * real path: the real `scripts/check-chord-snippets.cjs` and the built
 * `sharpee` CLI's own loader and claims check, run over a committed fixture
 * edition (`fixtures/check-chord-snippets/`) that holds two fences broken on
 * purpose. The checker is an instrument, so the suite's first duty is to
 * show it fails on the defect it exists to detect.
 *
 * Needs `packages/devkit/dist` built.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface Fence {
  line: number;
  text: string;
}
interface Block {
  key: string;
  lines: string[];
}
interface ChapterRow {
  file: string;
  fences: number;
  complete: number;
  snapshot: number;
  fragment: number;
  waiting: number;
  failed: number;
}
interface Failure {
  where: string;
  fence: number;
  kind: string;
  detail: string[];
}
interface Proof {
  where: string;
  fence: number;
  route: string;
  via: string;
}
interface SnapshotResult {
  name: string;
  error: string[] | null;
}
interface CheckResult {
  chapters: ChapterRow[];
  failures: Failure[];
  proofs: Proof[];
  snapshots: SnapshotResult[];
}
interface CheckOptions {
  edition: string;
  cli: string;
  snapshots: string;
  harness: string;
  workDir: string;
}
interface ExpandedHarness {
  lines: string[];
  snapshot: string | null;
  claims: string | null;
  refused: string | null;
}
interface Checker {
  chordFences(markdown: string): Fence[];
  tidy(text: string): string[];
  appearsIn(fenceLines: string[], snapshotLines: string[]): boolean;
  excerptOf(fenceLines: string[], blockLines: string[]): boolean;
  topLevelBlocks(source: string): Block[];
  blockKey(line: string): string;
  expandHarness(text: string, fenceLines: string[]): ExpandedHarness;
  withMissingPhrases(source: string, error: string[]): string | null;
  checkEdition(options: CheckOptions): Promise<CheckResult>;
  formatTable(chapters: ChapterRow[]): string[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-chord-snippets.cjs');
const CLI = join(ROOT, 'packages', 'devkit', 'dist', 'cli.js');
const FIXTURE = join(HERE, 'fixtures', 'check-chord-snippets');
const EDITION = join(FIXTURE, 'edition');
const SNAPSHOTS = join(FIXTURE, 'snapshots');
const CHAPTER = 'parts/part-1/01-fixture.md';

const checker = createRequire(import.meta.url)(SCRIPT) as Checker;

describe('check-chord-snippets', () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'check-chord-snippets-test-'));
  });
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /** Runs the checker over the fixture edition, with a given harness directory. */
  const check = (harness: string = join(EDITION, 'snippet-harness')): Promise<CheckResult> =>
    checker.checkEdition({ edition: EDITION, cli: CLI, snapshots: SNAPSHOTS, harness, workDir: join(scratch, 'work') });

  /** A copy of the fixture's harness directory that a test may change. */
  const harnessCopy = (): string => {
    const copy = join(scratch, 'harness');
    cpSync(join(EDITION, 'snippet-harness'), copy, { recursive: true });
    return copy;
  };

  describe('on the fixture edition', () => {
    it('reports the broken fence, with its place and the compiler\'s code', async () => {
      const result = await check();
      const broken = result.failures.find((failure) => failure.fence === 4);
      expect(broken).toBeDefined();
      expect(broken?.where).toBe(`${CHAPTER}:33`);
      expect(broken?.detail.join('\n')).toContain('[analysis.unknown-kind-noun]');
    });

    it('fails a fence that matches the snapshot only when its indentation is ignored', async () => {
      const result = await check();
      const pulledOut = result.failures.find((failure) => failure.fence === 5);
      expect(pulledOut?.where).toBe(`${CHAPTER}:42`);
      expect(pulledOut?.detail.join('\n')).toContain('[parse.unknown-declaration]');
    });

    it('fails exactly the two broken fences and no other', async () => {
      const result = await check();
      expect(result.failures.map((failure) => failure.fence)).toEqual([4, 5]);
    });

    it('sorts every fence into one column, and the columns add up', async () => {
      const result = await check();
      expect(result.chapters).toEqual([
        { file: CHAPTER, fences: 7, complete: 0, snapshot: 2, fragment: 2, waiting: 1, failed: 2 },
      ]);
    });

    it('says how each proven fence was proven', async () => {
      const result = await check();
      expect(result.proofs.map((proof) => [proof.fence, proof.route, proof.via])).toEqual([
        [1, 'snapshot', 'lines of the snapshot chapter-01'],
        [2, 'snapshot', 'an excerpt of a block in the snapshot chapter-01'],
        [3, 'fragment', 'top level in the harness world'],
        [6, 'fragment', 'refused with analysis.unknown-entity in its own harness snippet-harness/fences/01-fixture-06.story'],
      ]);
    });

    it('loads the snapshot the fences are proven by', async () => {
      const result = await check();
      expect(result.snapshots).toEqual([{ name: 'chapter-01', error: null }]);
    });
  });

  describe('what the lists and harness files may not hide', () => {
    it('fails a fence that is listed as a known issue and now loads', async () => {
      const harness = harnessCopy();
      writeFileSync(join(harness, 'known-issues.json'), JSON.stringify([{ file: CHAPTER, fence: 3, issue: 0, reason: 'stale' }]));
      const result = await check(harness);
      const stale = result.failures.find((failure) => failure.fence === 3);
      expect(stale?.kind).toBe('known issue');
      expect(stale?.detail.join(' ')).toContain('remove the entry');
    });

    it('fails a fence its harness says is refused when the refusal is a different one', async () => {
      const harness = harnessCopy();
      writeFileSync(join(harness, 'fences', '01-fixture-06.story'), '## refused: analysis.no-such-code\n\n<<fence>>\n');
      const result = await check(harness);
      const wrong = result.failures.find((failure) => failure.fence === 6);
      expect(wrong?.detail[0]).toContain('should be refused with analysis.no-such-code');
      expect(wrong?.detail.join('\n')).toContain('[analysis.unknown-entity]');
    });

    it('throws on a harness file that matches no fence', async () => {
      const harness = harnessCopy();
      writeFileSync(join(harness, 'fences', '01-fixture-99.story'), '<<fence>>\n');
      await expect(check(harness)).rejects.toThrow('the fence harness 01-fixture-99.story matches no fence');
    });

    it('throws on a known issue that names a fence the chapter does not have', async () => {
      const harness = harnessCopy();
      writeFileSync(join(harness, 'known-issues.json'), JSON.stringify([{ file: CHAPTER, fence: 99, issue: 0, reason: 'gone' }]));
      await expect(check(harness)).rejects.toThrow('names fence 99');
    });

    it('throws when the harness world is missing', async () => {
      await expect(check(join(scratch, 'nowhere'))).rejects.toThrow('no harness world');
    });
  });

  describe('the command line', () => {
    it('exits 1 on the fixture and names the broken fence', () => {
      const run = spawnSync('node', [SCRIPT, EDITION, '--snapshots', SNAPSHOTS], { encoding: 'utf8' });
      expect(run.status).toBe(1);
      expect(run.stdout).toContain(`FAILED ${CHAPTER}:33 (fragment, fence 4)`);
      expect(run.stdout).toContain('2 failure(s)');
    });

    it('exits 2 with no edition named', () => {
      const run = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
      expect(run.status).toBe(2);
      expect(run.stderr).toContain('usage:');
    });
  });

  describe('the helpers', () => {
    it('reads only chord fences, with the line of their first content line', () => {
      const fences = checker.chordFences('one\n```chord\ncreate the Den, a room\n```\n```text\nnot this\n```\n```chord\nb\n```\n');
      expect(fences).toEqual([
        { line: 3, text: 'create the Den, a room' },
        { line: 9, text: 'b' },
      ]);
    });

    it('matches a fence shown at a different depth, and refuses one whose shape differs', () => {
      const snapshot = ['create the Den, a room', '  on the player waiting', '    phrase tick', '  end on'];
      expect(checker.appearsIn(['on the player waiting', '  phrase tick', 'end on'], snapshot)).toBe(true);
      expect(checker.appearsIn(['on the player waiting', 'phrase tick', 'end on'], snapshot)).toBe(false);
      expect(checker.appearsIn(['on the player waiting', '  phrase tock', 'end on'], snapshot)).toBe(false);
    });

    it('accepts an excerpt in order from the block\'s first line, and refuses any other', () => {
      const block = ['create the jar, a thing', '  in the Pantry', '', '  A jar.'];
      expect(checker.excerptOf(['create the jar, a thing', '  ...', '  A jar.'], block)).toBe(true);
      expect(checker.excerptOf(['create the jar, a thing', '  A jar.', '  in the Pantry'], block)).toBe(false);
      expect(checker.excerptOf(['create the jar, a thing', '    A jar.'], block)).toBe(false);
      expect(checker.excerptOf(['  in the Pantry', '  A jar.'], block)).toBe(false);
    });

    it('names a block the same way however its first line is written', () => {
      expect(checker.blockKey('create the Den, a room')).toBe('create den');
      expect(checker.blockKey('create Den')).toBe('create den');
      expect(checker.blockKey('define phrase no-such-word, cycling')).toBe('define phrase no-such-word');
      expect(checker.blockKey('define topics for Tamsin Vey')).toBe('define topics for tamsin vey');
      expect(checker.blockKey('before the game starts')).toBe('before the game starts');
    });

    it('keeps `or` and `end` lines inside the block they belong to', () => {
      const blocks = checker.topLevelBlocks('define phrase a, cycling\n  One.\nor\n  Two.\nend phrase\n\ncreate the Den, a room\n');
      expect(blocks.map((block) => block.key)).toEqual(['define phrase a', 'create den']);
      expect(blocks[0].lines).toEqual(['define phrase a, cycling', '  One.', 'or', '  Two.', 'end phrase']);
    });

    it('puts a fence into its harness at the marker\'s indentation and reads the directives', () => {
      const expanded = checker.expandHarness(
        '## a comment\n## snapshot: chapter-17\n## refused: analysis.refusal-misplaced\n\ncreate the page, a thing\n  on the player reading\n    <<fence>>\n  end on\n',
        ['  select on its state', '    when faded'],
      );
      expect(expanded.lines).toEqual(['create the page, a thing', '  on the player reading', '    select on its state', '      when faded', '  end on']);
      expect(expanded.snapshot).toBe('chapter-17');
      expect(expanded.refused).toBe('analysis.refusal-misplaced');
      expect(expanded.claims).toBeNull();
    });

    it('refuses a harness with no marker', () => {
      expect(() => checker.expandHarness('create the page, a thing\n', ['a'])).toThrow('exactly one <<fence>> line');
    });

    it('defines the phrases a diagnostic reports missing, and nothing else', () => {
      const repaired = checker.withMissingPhrases('create the Den, a room', ['fence:3:5 [analysis.missing-phrase] Phrase `tick` is not declared in en-US.']);
      expect(repaired).toBe('define phrase tick\n  Harness text.\nend phrase\n\ncreate the Den, a room');
      expect(checker.withMissingPhrases('create the Den, a room', ['fence:1:1 [analysis.unknown-entity] No entity named `Den`.'])).toBeNull();
    });

    it('totals the table', () => {
      const table = checker.formatTable([{ file: 'a.md', fences: 3, complete: 0, snapshot: 2, fragment: 0, waiting: 0, failed: 1 }]);
      expect(table[2]).toMatch(/^total\s+3\s+0\s+2\s+0\s+0\s+1$/);
    });
  });
});
