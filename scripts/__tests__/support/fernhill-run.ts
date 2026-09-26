/**
 * fernhill-run.ts — the narrative-walk suite's one door to the author CLI.
 *
 * Purpose: spawn the built devkit CLI (`packages/devkit/dist/cli.js`, what
 *   `./sharpee` execs) against `branch-stories/fernhill` and hand the beats
 *   what the process actually produced: the exit status, stdout decoded as
 *   run events through the wire's own guard, stderr as lines. Nothing here is
 *   recorded or fixtured; every value a beat asserts on came out of a process
 *   that ran during the test.
 *
 *   `runFernhillTest` memoizes within the process. Vitest isolates test files
 *   in their own workers, so the memo is per file, not per suite: each beat
 *   file spawns fernhill's `test --json` once (about half a second) and its
 *   cases share that run. A cross-worker disk cache was considered and
 *   rejected — it would trade one second for a staleness risk keyed on
 *   every dist the CLI lazily requires.
 *
 * Public interface: REPO_ROOT, CLI, FERNHILL_DIR, FERNHILL_STORY, FERNHILL_TREE,
 *   spawnCli, runTestJson, runFernhillTest, resetFernhillMemo, composeIR,
 *   runWorldIndex, derivedBranches, derivedSummary, commandResults, runEnd,
 *   and the Spawner / TestRun types.
 * Owner context: repo tooling — `scripts/__tests__/` (the real-path suites
 *   that drive the built CLIs; not published).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import {
  isRunEvent,
  type CommandResultEvent,
  type DerivedBranchEvent,
  type DerivedRunSummaryEvent,
  type RunEndEvent,
  type RunEvent,
} from '@sharpee/ide-protocol';

export const REPO_ROOT = resolve(__dirname, '..', '..', '..');
/** The devkit engine `./sharpee` execs — the author CLI, not the platform bundle. */
export const CLI = join(REPO_ROOT, 'packages', 'devkit', 'dist', 'cli.js');
export const FERNHILL_DIR = join(REPO_ROOT, 'branch-stories', 'fernhill');
export const FERNHILL_STORY = join(FERNHILL_DIR, 'fernhill.story');
export const FERNHILL_TREE = join(FERNHILL_DIR, 'fernhill.tests.json');

/** One CLI invocation's raw outcome. */
export interface SpawnOutcome {
  /** The exit code, or null when the process was killed (timeout). */
  status: number | null;
  stdout: string;
  stderr: string;
}

/** How a helper spawns the CLI — injectable so a test can count or fake spawns. */
export type Spawner = (args: string[], cwd?: string) => SpawnOutcome;

/**
 * Spawn the author CLI with the given arguments.
 *
 * @param args the command line after `sharpee`
 * @param cwd the working directory; the repo root by default
 * @returns the exit status and both output streams, decoded as UTF-8
 */
export const spawnCli: Spawner = (args, cwd = REPO_ROOT) => {
  const result = spawnSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};

/** A `test --json` run as the beats read it. */
export interface TestRun {
  /** The CLI's exit code: 0 pass, 1 a failed card or derived branch, 2 a defective document, 3 a load error. */
  status: number;
  /** Every stdout line, decoded through the wire's own guard, in emission order. */
  events: RunEvent[];
  /** stderr, split into lines — under `--json` this carries the human derived report. */
  stderr: string[];
}

/**
 * Run `sharpee test <project> --json` and decode what it produced.
 *
 * @param projectDir the story project directory
 * @param spawner how to spawn; the real CLI by default
 * @returns the run
 * @throws when the process timed out (status null) or any stdout line is not
 *   a valid run event — a malformed stream is a failure of the CLI, never an
 *   empty result
 */
export function runTestJson(projectDir: string, spawner: Spawner = spawnCli): TestRun {
  const outcome = spawner(['test', projectDir, '--json']);
  if (outcome.status === null) {
    throw new Error(`sharpee test ${projectDir} --json: the process did not exit (timed out)\n${outcome.stderr}`);
  }
  const events = outcome.stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error(`sharpee test --json: stdout line ${index + 1} is not JSON: ${line.slice(0, 200)}`);
      }
      if (!isRunEvent(parsed)) {
        throw new Error(`sharpee test --json: stdout line ${index + 1} is not a run event: ${line.slice(0, 200)}`);
      }
      return parsed;
    });
  return { status: outcome.status, events, stderr: outcome.stderr.split('\n') };
}

let fernhillMemo: TestRun | undefined;

/**
 * Fernhill's `test --json` run, spawned once per process and shared.
 *
 * @param spawner how to spawn; the real CLI by default
 * @returns the memoized run
 */
export function runFernhillTest(spawner: Spawner = spawnCli): TestRun {
  fernhillMemo ??= runTestJson(FERNHILL_DIR, spawner);
  return fernhillMemo;
}

/** Forget the memoized fernhill run — for the support module's own test only. */
export function resetFernhillMemo(): void {
  fernhillMemo = undefined;
}

/**
 * Compile a story to an IR file at a path of the caller's choosing.
 *
 * @param storyFile the `.story` file
 * @param outFile where the IR JSON goes — a scratch directory, never the story's own
 * @param spawner how to spawn; the real CLI by default
 * @throws when compose exits non-zero, with its stderr
 */
export function composeIR(storyFile: string, outFile: string, spawner: Spawner = spawnCli): void {
  const outcome = spawner(['compose', storyFile, '-o', outFile]);
  if (outcome.status !== 0) {
    throw new Error(`sharpee compose ${storyFile}: exit ${outcome.status}\n${outcome.stderr}`);
  }
}

/**
 * Run `sharpee world-index <ir.json>` and parse the document it writes.
 *
 * @param irFile the compiled IR
 * @param spawner how to spawn; the real CLI by default
 * @returns the exit status and the parsed document (an analysis at 0, a failure document at 1)
 * @throws when stdout is not JSON — the command promises a document either way
 */
export function runWorldIndex(irFile: string, spawner: Spawner = spawnCli): { status: number | null; document: Record<string, unknown> } {
  const outcome = spawner(['world-index', irFile]);
  let document: unknown;
  try {
    document = JSON.parse(outcome.stdout);
  } catch {
    throw new Error(`sharpee world-index ${irFile}: stdout is not JSON (exit ${outcome.status})\n${outcome.stderr}`);
  }
  if (typeof document !== 'object' || document === null) {
    throw new Error(`sharpee world-index ${irFile}: stdout is not a document`);
  }
  return { status: outcome.status, document: document as Record<string, unknown> };
}

/** The run's `derived-branch` events, in emission order. */
export function derivedBranches(run: TestRun): DerivedBranchEvent[] {
  return run.events.filter((event): event is DerivedBranchEvent => event.type === 'derived-branch');
}

/**
 * The run's one `derived-summary` event.
 *
 * @throws when the run carries none or more than one — the wire promises exactly one per run
 */
export function derivedSummary(run: TestRun): DerivedRunSummaryEvent {
  const summaries = run.events.filter((event): event is DerivedRunSummaryEvent => event.type === 'derived-summary');
  if (summaries.length !== 1) throw new Error(`expected exactly one derived-summary, found ${summaries.length}`);
  return summaries[0];
}

/** The run's `command-result` events, in emission order. */
export function commandResults(run: TestRun): CommandResultEvent[] {
  return run.events.filter((event): event is CommandResultEvent => event.type === 'command-result');
}

/**
 * The run's `run-end` event.
 *
 * @throws when the stream did not close — a run without `run-end` is a defect
 */
export function runEnd(run: TestRun): RunEndEvent {
  const end = run.events.find((event): event is RunEndEvent => event.type === 'run-end');
  if (!end) throw new Error('the run has no run-end event');
  return end;
}
