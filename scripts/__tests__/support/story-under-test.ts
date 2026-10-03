/**
 * story-under-test.ts — which stories the story-agnostic narrative suite runs.
 *
 * Purpose: resolve a story project directory into the paths the beats read
 *   (the `.story` file, the `<story-id>.tests/` tree) and list the stories
 *   under test: fernhill always, plus the one the `NARRATIVE_STORY`
 *   environment variable names. Fernhill stays in the list so the suite is
 *   green-or-red on a known story in every run, and a second story is checked
 *   alongside it rather than instead of it.
 *
 *   `runStoryTest` memoizes `sharpee test --json` per directory within the
 *   process, the same trade `runFernhillTest` makes (per file, not cross-worker).
 *   It spawns asynchronously: a story the size of secret-letter runs for a
 *   minute and a half, and a synchronous spawn that long blocks the vitest
 *   worker's event loop until its RPC to the runner times out.
 *
 * Public interface: NARRATIVE_STORY_VARIABLE, StoryUnderTest, AsyncSpawner,
 *   resolveStory, storiesUnderTest, spawnCliAsync, runTestJsonAsync, runStoryTest.
 * Owner context: repo tooling — `scripts/__tests__/` (the real-path suites
 *   that drive the built CLIs; not published).
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { CLI, FERNHILL_DIR, REPO_ROOT, decodeTestRun, type SpawnOutcome, type TestRun } from './fernhill-run';

/** The environment variable that names a second story directory to check. */
export const NARRATIVE_STORY_VARIABLE = 'NARRATIVE_STORY';

/** A story project the beats can run against. */
export interface StoryUnderTest {
  /** The story id — the `.story` file's base name, and the tree directory's prefix. */
  id: string;
  /** The project directory, absolute. */
  dir: string;
  /** The project's one `.story` file. */
  storyFile: string;
  /** The `<story-id>.tests/` directory beside it. */
  treeDir: string;
}

/**
 * Resolve a story project directory into the paths the beats read.
 *
 * @param dir the project directory; a relative path is read from the repo root
 * @returns the story's id and paths
 * @throws when the directory does not exist, holds no `.story` file or more
 *   than one, or has no `<story-id>.tests/` directory — a beat must not pass
 *   vacuously against a story it could not find
 */
export function resolveStory(dir: string): StoryUnderTest {
  const absolute = isAbsolute(dir) ? dir : resolve(REPO_ROOT, dir);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new Error(`story under test: ${absolute} is not a directory`);
  }
  const stories = readdirSync(absolute).filter((name) => name.endsWith('.story'));
  if (stories.length !== 1) {
    throw new Error(`story under test: expected one .story file in ${absolute}, found ${stories.length}`);
  }
  const id = stories[0].slice(0, -'.story'.length);
  const treeDir = join(absolute, `${id}.tests`);
  if (!existsSync(treeDir) || !statSync(treeDir).isDirectory()) {
    throw new Error(`story under test: ${absolute} has no ${id}.tests/ directory — record tests in the Testing tab first`);
  }
  return { id, dir: absolute, storyFile: join(absolute, stories[0]), treeDir };
}

/**
 * The stories the agnostic suite runs: fernhill, then the named story if any.
 *
 * @param environment the variables to read; the process's own by default
 * @returns fernhill first, and the named story when it is a different directory
 * @throws when the named directory does not resolve (see {@link resolveStory})
 */
export function storiesUnderTest(environment: NodeJS.ProcessEnv = process.env): StoryUnderTest[] {
  const fernhill = resolveStory(FERNHILL_DIR);
  const named = environment[NARRATIVE_STORY_VARIABLE]?.trim();
  if (!named) return [fernhill];
  const story = resolveStory(named);
  return story.dir === fernhill.dir ? [fernhill] : [fernhill, story];
}

/** How the agnostic suite spawns the CLI — injectable so a test can count or fake spawns. */
export type AsyncSpawner = (args: string[]) => Promise<SpawnOutcome>;

/** Ten minutes: a ceiling for the largest story, not an expected duration. */
const SPAWN_TIMEOUT_MS = 600_000;

/**
 * Spawn the author CLI without blocking the event loop.
 *
 * @param args the command line after `sharpee`
 * @returns the exit status (null when killed at the timeout) and both output streams
 */
export const spawnCliAsync: AsyncSpawner = (args) =>
  new Promise((resolveOutcome, reject) => {
    const child = spawn('node', [CLI, ...args], { cwd: REPO_ROOT });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    const timer = setTimeout(() => child.kill(), SPAWN_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveOutcome({
        status: code,
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
      });
    });
  });

/**
 * Run `sharpee test <project> --json` asynchronously and decode it, unmemoized.
 *
 * @param projectDir the story project directory
 * @param spawner how to spawn; the real CLI by default
 * @returns the run
 * @throws as `runTestJson` does — a timeout or a malformed stream is never an empty run
 */
export async function runTestJsonAsync(projectDir: string, spawner: AsyncSpawner = spawnCliAsync): Promise<TestRun> {
  return decodeTestRun(projectDir, await spawner(['test', projectDir, '--json']));
}

const runs = new Map<string, Promise<TestRun>>();

/**
 * A story's `test --json` run, spawned once per directory per process.
 *
 * @param story the story to run
 * @param spawner how to spawn; the real CLI by default
 * @returns the memoized run — the same promise for every caller
 */
export function runStoryTest(story: StoryUnderTest, spawner: AsyncSpawner = spawnCliAsync): Promise<TestRun> {
  let run = runs.get(story.dir);
  if (!run) {
    run = runTestJsonAsync(story.dir, spawner);
    runs.set(story.dir, run);
  }
  return run;
}
