/**
 * Story Loader — thin facade over @sharpee/bootstrap (ADR-180).
 *
 * Story loading/assembly now lives in @sharpee/bootstrap — the single loader
 * shared by transcript-tester, the CLI bundle, and devkit. This module keeps
 * the historical export surface (loadStory / createTestableGame / TestableGame /
 * findTranscripts) and threads the optional `entry:` sub-entry through.
 *
 * Owner context: transcript-tester (test harness).
 */

import * as path from 'path';
import {
  loadStory as bootstrapLoadStory,
  assembleGame,
  type LoadedGame,
} from '@sharpee/bootstrap';

/** A loaded, runnable game — now provided by @sharpee/bootstrap. */
export type TestableGame = LoadedGame;

/**
 * Load a story from a path (entry-aware) and create a testable game instance.
 *
 * @param storyPath story directory (resolved against cwd if relative)
 * @param entry     optional story sub-entry from the transcript `entry:` header
 */
export async function loadStory(storyPath: string, entry?: string): Promise<TestableGame> {
  return bootstrapLoadStory(storyPath, { entry });
}

/**
 * Assemble a testable game from an already-loaded story instance.
 */
export function createTestableGame(story: any): TestableGame {
  return assembleGame(story);
}

/**
 * Find all transcript files in a directory.
 */
export function findTranscripts(dir: string, pattern: string = '*.transcript'): string[] {
  const glob = require('glob');
  const resolvedDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  const files = glob.sync(path.join(resolvedDir, '**', pattern));
  return files;
}
