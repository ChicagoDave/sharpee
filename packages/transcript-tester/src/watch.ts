/**
 * Watch mode (ADR-294 D14) — targeted reruns with an inline bless affordance.
 *
 * A change to a watched transcript (or one of its recordings) reruns that one
 * test; a change to the story's files reruns every watched transcript. Golden
 * failures offer `bless? [y/n/all]` when a prompt is available; an unattended
 * watch (no prompt wired) never blesses anything — it only reports.
 *
 * Public interface: `classifyChange`, `BlessPolicy`, `runCycle`, `startWatch`.
 * The host CLI supplies the run/prompt/log callbacks; this module owns only
 * the watch/decision logic, so both are testable without a real terminal.
 * Owner context: transcript-tester (testing tooling).
 */

import * as fs from 'fs';
import * as path from 'path';
import { TranscriptResult } from './types.js';

/** Where a filesystem change points: one transcript, the whole story, or noise. */
export type ChangeTarget =
  | { kind: 'transcript'; transcriptPath: string }
  | { kind: 'story' }
  | { kind: 'ignored' };

/** Escape a string for literal use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Classify one changed path against the watch set.
 *
 * Order matters: a watched transcript's own artifacts map to that transcript;
 * OTHER transcript artifacts are noise even inside a story dir (an unwatched
 * suite's files must not retrigger this one); save churn from our own runs is
 * noise; anything else under a story dir is a story change (rerun all).
 */
export function classifyChange(
  changedPath: string,
  watchedTranscripts: string[],
  storyDirs: string[]
): ChangeTarget {
  const resolved = path.resolve(changedPath);

  for (const transcriptPath of watchedTranscripts) {
    const resolvedTranscript = path.resolve(transcriptPath);
    if (resolved === resolvedTranscript) {
      return { kind: 'transcript', transcriptPath };
    }
    const base = escapeRegExp(resolvedTranscript.replace(/\.transcript$/, ''));
    if (new RegExp(`^${base}(\\.\\d+)?\\.golden$`).test(resolved)) {
      return { kind: 'transcript', transcriptPath };
    }
  }

  if (/\.(transcript|golden)$/.test(resolved) || resolved.endsWith('.divergence.json')) {
    return { kind: 'ignored' };
  }

  for (const storyDir of storyDirs) {
    const prefix = path.resolve(storyDir) + path.sep;
    if (resolved.startsWith(prefix)) {
      if (resolved.includes(`${path.sep}saves${path.sep}`)) {
        return { kind: 'ignored' };
      }
      return { kind: 'story' };
    }
  }

  return { kind: 'ignored' };
}

/**
 * The bless decision state machine (D14). With no prompt wired (headless,
 * no TTY), `decide` is always false — an unattended watch never blesses.
 * An explicit `all` answer is sticky for the rest of the watch session.
 */
export class BlessPolicy {
  private blessAll = false;

  constructor(
    private readonly promptBless?: (transcriptPath: string) => Promise<'y' | 'n' | 'all'>
  ) {}

  async decide(transcriptPath: string): Promise<boolean> {
    if (!this.promptBless) return false;
    if (this.blessAll) return true;
    const answer = await this.promptBless(transcriptPath);
    if (answer === 'all') {
      this.blessAll = true;
      return true;
    }
    return answer === 'y';
  }
}

/** Host-supplied callbacks: run one transcript (all its matrix seeds), log. */
export interface WatchRunIO {
  /** Run one transcript file fresh; returns one result per matrix seed. */
  run(transcriptPath: string, bless: boolean): Promise<TranscriptResult[]>;
  log(message: string): void;
}

/**
 * Run one watch cycle over the affected transcripts. A golden-tier non-pass
 * offers bless via the policy; assertion-tier failures only report (bless is
 * a golden affordance). Returns the golden paths this cycle wrote, so the
 * watcher can suppress its own write events.
 */
export async function runCycle(
  transcriptPaths: string[],
  io: WatchRunIO,
  policy: BlessPolicy,
  onBlessed?: (goldenPath: string) => void
): Promise<{ blessedGoldens: string[] }> {
  const blessedGoldens: string[] = [];

  for (const transcriptPath of transcriptPaths) {
    const results = await io.run(transcriptPath, false);
    const goldenFailed = results.some(r => r.tier === 'golden' && r.status !== 'passed');
    if (!goldenFailed) continue;

    if (await policy.decide(transcriptPath)) {
      const blessed = await io.run(transcriptPath, true);
      for (const result of blessed) {
        if (result.blessed && result.goldenPath) {
          blessedGoldens.push(result.goldenPath);
          // Immediately — the write's fs event may already be in flight, and
          // suppression registered only after the cycle would miss it.
          onBlessed?.(result.goldenPath);
          io.log(`blessed: ${result.goldenPath}`);
        } else if (result.status !== 'passed') {
          io.log(`bless failed: ${result.errorMessage ?? 'see the report above'}`);
        }
      }
    }
  }

  return { blessedGoldens };
}

export interface WatchConfig {
  /** The transcript files this watch session runs. */
  transcripts: string[];
  /** Directories whose non-artifact changes rerun every transcript. */
  storyDirs: string[];
  /** Debounce window for coalescing change events (ms). */
  debounceMs?: number;
}

/**
 * Start watching. Never resolves on its own — the returned handle's `close`
 * stops the watchers (tests and Ctrl+C both go through it).
 */
export function startWatch(
  config: WatchConfig,
  io: WatchRunIO,
  policy: BlessPolicy
): { close(): void } {
  const debounceMs = config.debounceMs ?? 200;
  const pending = new Set<string>();
  let storyPending = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  /** Goldens our own bless just wrote: path → written-at. */
  const selfWrites = new Map<string, number>();
  const SELF_WRITE_WINDOW_MS = 2000;

  const markSelfWrite = (writtenPath: string) => {
    selfWrites.set(path.resolve(writtenPath), Date.now());
  };

  const onChange = (changedPath: string) => {
    const wroteAt = selfWrites.get(path.resolve(changedPath));
    if (wroteAt !== undefined && Date.now() - wroteAt < SELF_WRITE_WINDOW_MS) {
      return;
    }
    const target = classifyChange(changedPath, config.transcripts, config.storyDirs);
    if (target.kind === 'ignored') return;
    if (target.kind === 'story') storyPending = true;
    else pending.add(target.transcriptPath);
    schedule();
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  const flush = async () => {
    timer = null;
    if (running) {
      schedule();
      return;
    }
    const affected = storyPending ? [...config.transcripts] : [...pending];
    storyPending = false;
    pending.clear();
    if (affected.length === 0) return;

    running = true;
    try {
      io.log(`\nchange detected — rerunning ${affected.length} transcript(s)`);
      // Self-writes are registered the moment each bless lands (the write's
      // fs event may arrive while the cycle is still running).
      await runCycle(affected, io, policy, markSelfWrite);
      io.log('watching…');
    } finally {
      running = false;
    }
    // Drop anything the in-flight suppression window caught late: a pending
    // entry whose only cause was our own bless write must not re-run.
    for (const transcriptPath of [...pending]) {
      const stillReal = ![...selfWrites.entries()].some(([written, at]) =>
        Date.now() - at < SELF_WRITE_WINDOW_MS &&
        classifyChange(written, [transcriptPath], []).kind === 'transcript');
      if (!stillReal) pending.delete(transcriptPath);
    }
    if (pending.size > 0 || storyPending) schedule();
  };

  // Watch each transcript's directory plus the story directories. Story dirs
  // are watched recursively (dist trees are nested); transcript dirs are flat.
  const watchers: fs.FSWatcher[] = [];
  const transcriptDirs = [...new Set(config.transcripts.map(t => path.dirname(path.resolve(t))))];
  for (const dir of transcriptDirs) {
    watchers.push(fs.watch(dir, (_event, filename) => {
      if (filename) onChange(path.join(dir, filename));
    }));
  }
  for (const storyDir of config.storyDirs) {
    watchers.push(fs.watch(path.resolve(storyDir), { recursive: true }, (_event, filename) => {
      if (filename) onChange(path.join(path.resolve(storyDir), filename));
    }));
  }

  return {
    close() {
      if (timer) clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    }
  };
}
