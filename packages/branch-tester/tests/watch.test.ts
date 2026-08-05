/**
 * watch.test.ts — watch mode decision logic (ADR-294 D14).
 *
 * Derived from the Behavior Statement: change classification (one transcript
 * vs whole story vs noise), the bless state machine (unattended never
 * blesses; `all` is sticky), the cycle's golden-only bless affordance, and
 * the live watcher's targeted rerun + self-write suppression.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { classifyChange, BlessPolicy, runCycle, startWatch } from '../src/watch.js';
import { TranscriptResult } from '../src/types.js';

const T1 = '/work/stories/demo/tests/one.transcript';
const T2 = '/work/other/two.transcript';
const STORY = '/work/stories/demo';

describe('classifyChange', () => {
  const classify = (p: string) => classifyChange(p, [T1, T2], [STORY]);

  it('maps a watched transcript and its recordings to that transcript', () => {
    expect(classify(T1)).toEqual({ kind: 'transcript', transcriptPath: T1 });
    expect(classify('/work/stories/demo/tests/one.golden')).toEqual({ kind: 'transcript', transcriptPath: T1 });
    expect(classify('/work/stories/demo/tests/one.777.golden')).toEqual({ kind: 'transcript', transcriptPath: T1 });
    expect(classify('/work/other/two.golden')).toEqual({ kind: 'transcript', transcriptPath: T2 });
  });

  it('ignores unwatched transcript artifacts even inside the story dir', () => {
    expect(classify('/work/stories/demo/tests/unwatched.transcript')).toEqual({ kind: 'ignored' });
    expect(classify('/work/stories/demo/walkthroughs/wt-01.golden')).toEqual({ kind: 'ignored' });
    expect(classify('/work/stories/demo/tests/one.divergence.json')).toEqual({ kind: 'ignored' });
  });

  it('ignores save churn from our own runs', () => {
    expect(classify('/work/stories/demo/saves/alpha.json')).toEqual({ kind: 'ignored' });
  });

  it('maps any other story-dir change to a story rerun', () => {
    expect(classify('/work/stories/demo/dist/index.js')).toEqual({ kind: 'story' });
    expect(classify('/work/stories/demo/src/rooms.ts')).toEqual({ kind: 'story' });
  });

  it('ignores paths outside the watch set entirely', () => {
    expect(classify('/work/elsewhere/file.ts')).toEqual({ kind: 'ignored' });
  });
});

describe('BlessPolicy', () => {
  it('never blesses without a prompt — the unattended guarantee', async () => {
    const policy = new BlessPolicy(undefined);
    expect(await policy.decide(T1)).toBe(false);
  });

  it('blesses on y, declines on n and unknown answers', async () => {
    const answers: Array<'y' | 'n' | 'all'> = ['y', 'n'];
    const policy = new BlessPolicy(async () => answers.shift()!);
    expect(await policy.decide(T1)).toBe(true);
    expect(await policy.decide(T1)).toBe(false);
  });

  it('makes "all" sticky — no further prompting', async () => {
    let prompts = 0;
    const policy = new BlessPolicy(async () => {
      prompts++;
      return 'all';
    });
    expect(await policy.decide(T1)).toBe(true);
    expect(await policy.decide(T2)).toBe(true);
    expect(await policy.decide(T1)).toBe(true);
    expect(prompts).toBe(1);
  });
});

function fakeResult(partial: Partial<TranscriptResult>): TranscriptResult {
  return {
    transcript: { filePath: 'x', header: {}, commands: [], comments: [] },
    commands: [],
    status: 'passed',
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    skipped: 0,
    duration: 0,
    ...partial
  } as TranscriptResult;
}

describe('runCycle', () => {
  it('offers bless only for golden-tier non-passes, and reruns with bless on approval', async () => {
    const calls: Array<[string, boolean]> = [];
    const io = {
      run: async (p: string, bless: boolean) => {
        calls.push([p, bless]);
        if (bless) return [fakeResult({ tier: 'golden', blessed: true, goldenPath: `${p}.golden` })];
        if (p === 'golden-fail') return [fakeResult({ tier: 'golden', status: 'failed', failed: 1 })];
        if (p === 'assertion-fail') return [fakeResult({ tier: 'assertion', status: 'failed', failed: 1 })];
        return [fakeResult({ tier: 'golden' })];
      },
      log: () => {}
    };
    const policy = new BlessPolicy(async () => 'y');

    const { blessedGoldens } = await runCycle(['green', 'assertion-fail', 'golden-fail'], io, policy);

    expect(calls).toEqual([
      ['green', false],
      ['assertion-fail', false],   // failed, but assertion tier — no bless offer
      ['golden-fail', false],
      ['golden-fail', true]        // the only bless rerun
    ]);
    expect(blessedGoldens).toEqual(['golden-fail.golden']);
  });

  it('unattended: a golden failure reports and nothing is rerun with bless', async () => {
    const calls: Array<[string, boolean]> = [];
    const io = {
      run: async (p: string, bless: boolean) => {
        calls.push([p, bless]);
        return [fakeResult({ tier: 'golden', status: 'failed', failed: 1 })];
      },
      log: () => {}
    };

    const { blessedGoldens } = await runCycle(['golden-fail'], io, new BlessPolicy(undefined));

    expect(calls).toEqual([['golden-fail', false]]);
    expect(blessedGoldens).toEqual([]);
  });

  it('offers bless for stale-recording errors too (status error, golden tier)', async () => {
    const io = {
      run: async (p: string, bless: boolean) =>
        bless
          ? [fakeResult({ tier: 'golden', blessed: true, goldenPath: 'g' })]
          : [fakeResult({ tier: 'golden', status: 'error', errorMessage: 'stale recording — re-bless' })],
      log: () => {}
    };
    const { blessedGoldens } = await runCycle(['stale'], io, new BlessPolicy(async () => 'y'));
    expect(blessedGoldens).toEqual(['g']);
  });
});

describe('startWatch (live filesystem)', () => {
  let dir: string;
  let handle: { close(): void } | null = null;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-watch-'));
  });

  afterEach(() => {
    handle?.close();
    handle = null;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Poll until the predicate holds or the timeout elapses. */
  async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
      await new Promise(r => setTimeout(r, 25));
    }
  }

  it('a transcript edit reruns only that transcript; a story edit reruns all', async () => {
    const storyDir = path.join(dir, 'story');
    fs.mkdirSync(path.join(storyDir, 'dist'), { recursive: true });
    const t1 = path.join(dir, 'a.transcript');
    const t2 = path.join(dir, 'b.transcript');
    fs.writeFileSync(t1, 'title: A\n---\n> look\n');
    fs.writeFileSync(t2, 'title: B\n---\n> look\n');
    const distFile = path.join(storyDir, 'dist', 'index.js');
    fs.writeFileSync(distFile, '// v1');

    const runs: string[] = [];
    const io = {
      run: async (p: string) => {
        runs.push(path.basename(p));
        return [fakeResult({ tier: 'golden' })];
      },
      log: () => {}
    };
    handle = startWatch(
      { transcripts: [t1, t2], storyDirs: [storyDir], debounceMs: 50 },
      io,
      new BlessPolicy(undefined)
    );
    // FSEvents can deliver events for the setup writes above after the
    // watcher arms — drain them before acting, then measure from clean.
    await new Promise(r => setTimeout(r, 700));
    runs.length = 0;

    fs.appendFileSync(t1, '# edited\n');
    await waitFor(() => runs.length >= 1);
    await new Promise(r => setTimeout(r, 300));
    expect([...new Set(runs)]).toEqual(['a.transcript']);

    runs.length = 0;
    fs.writeFileSync(distFile, '// v2');
    await waitFor(() => runs.length >= 2);
    expect([...new Set(runs)].sort()).toEqual(['a.transcript', 'b.transcript']);
  });

  it('suppresses the golden write of its own bless — no self-triggered rerun', async () => {
    const t1 = path.join(dir, 'a.transcript');
    const golden = path.join(dir, 'a.golden');
    fs.writeFileSync(t1, 'title: A\n---\n> look\n');
    fs.writeFileSync(golden, 'old');

    const runs: Array<[string, boolean]> = [];
    const io = {
      run: async (p: string, bless: boolean) => {
        runs.push([path.basename(p), bless]);
        if (bless) {
          fs.writeFileSync(golden, 'new');  // the bless writes the recording
          return [fakeResult({ tier: 'golden', blessed: true, goldenPath: golden })];
        }
        return [fakeResult({ tier: 'golden', status: 'failed', failed: 1 })];
      },
      log: () => {}
    };
    handle = startWatch(
      { transcripts: [t1], storyDirs: [], debounceMs: 50 },
      io,
      new BlessPolicy(async () => 'y')
    );
    // Drain arm-time stale events for the setup writes, then measure clean.
    await new Promise(r => setTimeout(r, 700));
    runs.length = 0;

    fs.appendFileSync(t1, '# edited\n');
    await waitFor(() => runs.length >= 2);
    expect(runs).toEqual([['a.transcript', false], ['a.transcript', true]]);

    // Give the golden-write event time to arrive; it must be suppressed.
    await new Promise(r => setTimeout(r, 500));
    expect(runs).toHaveLength(2);
  });
});
