/**
 * Watch mode (ADR-294 D14) — targeted reruns.
 *
 * A change to a watched transcript reruns that one test; a change to the
 * story's files reruns every watched transcript. Failures report — durable
 * regression protection is the transcript's own assertions (ADR-306 retired
 * the author-world golden tier, and the bless affordance with it).
 *
 * Public interface: `classifyChange`, `runCycle`, `startWatch`.
 * The host CLI supplies the run/log callbacks; this module owns only the
 * watch/decision logic, so both are testable without a real terminal.
 * Owner context: branch-tester (testing tooling).
 */

import * as fs from 'fs';
import * as path from 'path';
import { TranscriptResult } from './types.js';

/** Where a filesystem change points: one transcript, the whole story, or noise. */
export type ChangeTarget =
  | { kind: 'transcript'; transcriptPath: string }
  | { kind: 'story' }
  | { kind: 'ignored' };

/**
 * Classify one changed path against the watch set.
 *
 * Order matters: a watched transcript maps to itself; OTHER transcripts are
 * noise even inside a story dir (an unwatched suite's files must not
 * retrigger this one); save churn from our own runs is noise; anything else
 * under a story dir is a story change (rerun all).
 */
export function classifyChange(
  changedPath: string,
  watchedTranscripts: string[],
  storyDirs: string[]
): ChangeTarget {
  const resolved = path.resolve(changedPath);

  for (const transcriptPath of watchedTranscripts) {
    if (resolved === path.resolve(transcriptPath)) {
      return { kind: 'transcript', transcriptPath };
    }
  }

  if (resolved.endsWith('.transcript')) {
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

/** Host-supplied callbacks: run one transcript (all its matrix seeds), log. */
export interface WatchRunIO {
  /** Run one transcript file fresh; returns one result per matrix seed. */
  run(transcriptPath: string): Promise<TranscriptResult[]>;
  log(message: string): void;
}

/** Run one watch cycle over the affected transcripts. Failures only report. */
export async function runCycle(transcriptPaths: string[], io: WatchRunIO): Promise<void> {
  for (const transcriptPath of transcriptPaths) {
    await io.run(transcriptPath);
  }
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
  io: WatchRunIO
): { close(): void } {
  const debounceMs = config.debounceMs ?? 200;
  const pending = new Set<string>();
  let storyPending = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const onChange = (changedPath: string) => {
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
      await runCycle(affected, io);
      io.log('watching…');
    } finally {
      running = false;
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
