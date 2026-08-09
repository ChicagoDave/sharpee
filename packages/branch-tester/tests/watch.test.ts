/**
 * watch.test.ts — watch mode decision logic (ADR-294 D14).
 *
 * Derived from the Behavior Statement: change classification (one transcript
 * vs whole story vs noise), the cycle's targeted rerun, and the live
 * watcher's debounced rerun behaviour.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { classifyChange, runCycle, startWatch } from '../src/watch.js';
import { TranscriptResult } from '../src/types.js';

const T1 = '/work/stories/demo/tests/one.transcript';
const T2 = '/work/other/two.transcript';
const STORY = '/work/stories/demo';

describe('classifyChange', () => {
  const classify = (p: string) => classifyChange(p, [T1, T2], [STORY]);

  it('maps a watched transcript to itself', () => {
    expect(classify(T1)).toEqual({ kind: 'transcript', transcriptPath: T1 });
    expect(classify(T2)).toEqual({ kind: 'transcript', transcriptPath: T2 });
  });

  it('ignores unwatched transcripts even inside the story dir', () => {
    expect(classify('/work/stories/demo/tests/unwatched.transcript')).toEqual({ kind: 'ignored' });
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
  it('runs each affected transcript exactly once, failures included', async () => {
    const calls: string[] = [];
    const io = {
      run: async (p: string) => {
        calls.push(p);
        if (p === 'failing') return [fakeResult({ status: 'failed', failed: 1 })];
        return [fakeResult({})];
      },
      log: () => {}
    };

    await runCycle(['green', 'failing'], io);

    expect(calls).toEqual(['green', 'failing']);
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
        return [fakeResult({})];
      },
      log: () => {}
    };
    handle = startWatch(
      { transcripts: [t1, t2], storyDirs: [storyDir], debounceMs: 50 },
      io
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
});
