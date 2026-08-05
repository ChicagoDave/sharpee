/**
 * corpus.ts — opt-in corpus resolution for the whole-corpus sweep tests.
 *
 * A corpus is *configured*, never discovered. Tests in this package do not climb
 * out of the package looking for `stories/`: they read the roots handed to them
 * and, when none are configured, report as skipped rather than passing on an
 * empty set. A sweep that silently no-ops outside the repository and asserts on
 * repo-wide file counts inside it is two different tests wearing one name.
 *
 * Configure with `SHARPEE_TRANSCRIPT_CORPUS` — one or more directories separated
 * by the platform path delimiter. `vitest.config.ts` is where that is set, and
 * it is the only place: `test.env` takes precedence over an inherited shell
 * variable, so edit the config to change or disable the sweeps. A consumer
 * running these tests from a published tarball has no such config, configures
 * nothing, and sees the sweeps skip.
 *
 * Public interface: `corpusRoots()`, `corpusFiles()`, `hasCorpus`.
 * Owner context: branch-tester test suite (tooling).
 */
import * as fs from 'fs';
import * as path from 'path';

/** Configured corpus directories, in declaration order. Empty when unset. */
export function corpusRoots(): string[] {
  const raw = process.env.SHARPEE_TRANSCRIPT_CORPUS;
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(path.delimiter)
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
    .map(entry => path.resolve(entry));
}

/**
 * Every `.transcript` beneath the configured roots, sorted for stable ordering.
 *
 * A configured root that does not exist is an error, not an empty result — it
 * means the configuration is wrong, and silently sweeping nothing is the failure
 * mode this module exists to prevent.
 */
export function corpusFiles(): string[] {
  const files: string[] = [];

  for (const root of corpusRoots()) {
    if (!fs.existsSync(root)) {
      throw new Error(
        `SHARPEE_TRANSCRIPT_CORPUS names a directory that does not exist: ${root}`
      );
    }
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.transcript')) files.push(full);
      }
    };
    walk(root);
  }

  return files.sort();
}

/** Whether any corpus is configured. Gates the sweeps via `describe.skipIf`. */
export const hasCorpus: boolean = corpusRoots().length > 0;

/** Display path for failure messages — relative to its own root, not the repo. */
export function corpusRelative(file: string): string {
  for (const root of corpusRoots()) {
    if (file.startsWith(root + path.sep)) return path.relative(root, file);
  }
  return file;
}
