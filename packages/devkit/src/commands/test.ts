/**
 * test.ts — `sharpee test`: run an author project's test tree.
 *
 * Author-side counterpart of the platform bundle's `--test` (ADR-187 R1:
 * both tools carry a test command, each its own implementation). Resolves
 * the project (cwd, a registered name, a directory, or a `.story` file —
 * ADR-277 D1: the file's containing folder is the project), discovers its
 * ADR-307 tree document (`<story-id>.tests.json` beside the `.story` file),
 * and runs it through branch-tester's walker. The document is the ONLY test
 * model for Chord projects: the transcript-file workflow (`tests/`
 * discovery, `--chain`, explicit `.transcript` args) was retired by
 * ADR-307's cutover — each retired form fails by name, never silently.
 * (Sharpee's own hand-authored transcript world lives in
 * `@sharpee/transcript-tester` and is untouched.)
 *
 * Public interface: runTestCommand(rest) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { lookupStory } from '../registry.js';
import { findTreeDocument, runTreeDocumentCommand } from './test-tree-document.js';

const USAGE =
  'usage: sharpee test [name|dir|file.story] [--tree] [--stop-on-failure|-s] [--verbose|-v] [--json] [--capture-output] [--capture-world]';

/**
 * Run `sharpee test`.
 *
 * @param rest CLI args after the subcommand: optional project (registered
 *   name, directory, or `.story` file) and flags `--tree` (accepted for
 *   compatibility with the documented spelling — the tree document is the
 *   only model, so it changes nothing), `--stop-on-failure`, `--verbose`,
 *   `--json` (NDJSON record stream on stdout — ADR-277 D1),
 *   `--capture-output` (every executed command-result carries
 *   `actualOutput`, not only failures), and `--capture-world` (world
 *   snapshots on command results).
 * @returns process exit code — 0 all lines passed, 1 failures or errored
 *   lines, 2 usage error or refused/malformed document, 3 story load error.
 *   Never calls `process.exit()` — a piped `--json` stream must flush
 *   completely (the 64KB-pipe gotcha, see cli.ts).
 */
export async function runTestCommand(rest: string[]): Promise<number> {
  let stopOnFailure = false;
  let verbose = false;
  let json = false;
  let captureOutput = false;
  let captureWorld = false;
  let projectDir: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--tree') {
      // The document is the only run model; the flag names what already
      // happens. Accepted so `sharpee test story.story --tree` (the IDE's
      // spawn and the documented spelling) keeps working.
    } else if (arg === '--chain' || arg === '-c') {
      console.error(
        `test: --chain is retired — the tree document has no chain (a shared prefix already runs once; ADR-302 D10, ADR-307 cutover)\n${USAGE}`,
      );
      return 2;
    } else if (arg === '--coverage') {
      console.error(`test: --coverage is retired with the transcript grammar (ADR-307 cutover)\n${USAGE}`);
      return 2;
    } else if (arg === '--stop-on-failure' || arg === '-s') stopOnFailure = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
    else if (arg === '--json') json = true;
    else if (arg === '--capture-output') captureOutput = true;
    else if (arg === '--capture-world') captureWorld = true;
    else if (arg.startsWith('-')) {
      console.error(`test: unknown flag '${arg}'\n${USAGE}`);
      return 2;
    } else if (arg.endsWith('.transcript')) {
      console.error(
        `test: '.transcript' files are retired for Chord projects — tests live in the story's tree document (<story-id>.tests.json), recorded by the Testing tab (ADR-307)\n${USAGE}`,
      );
      return 2;
    } else if (arg.endsWith('.story')) {
      // ADR-277 D1: one mental model across build/compose/test — the
      // `.story` file's containing folder is the project.
      if (projectDir) {
        console.error(`test: unexpected argument '${arg}'\n${USAGE}`);
        return 2;
      }
      if (!existsSync(arg) || !statSync(arg).isFile()) {
        console.error(`test: story file '${arg}' not found`);
        return 2;
      }
      projectDir = path.dirname(path.resolve(arg));
    } else if (!projectDir) {
      if (existsSync(arg) && statSync(arg).isDirectory()) projectDir = arg;
      else {
        const registered = lookupStory(arg);
        if (!registered) {
          console.error(
            `test: '${arg}' is neither a directory nor a registered story — run \`sharpee register <location>\`, or run \`sharpee test\` from the project directory`,
          );
          return 2;
        }
        projectDir = registered;
      }
    } else {
      console.error(`test: unexpected argument '${arg}'\n${USAGE}`);
      return 2;
    }
  }

  const dir = path.resolve(projectDir ?? process.cwd());

  // ADR-307 D2/Q-2: `<story-id>.tests.json` beside the `.story` file is the
  // one artifact. No document is a named condition, not an empty pass — a
  // module project (no `.story` file) has no tree document either.
  const docPath = findTreeDocument(dir);
  if (docPath === undefined) {
    console.error(
      `test: no tree document found in ${dir} — expected <story-id>.tests.json beside the .story file (record tests in the IDE's Testing tab, ADR-307)`,
    );
    return 2;
  }

  return runTreeDocumentCommand({
    dir,
    docPath,
    verbose,
    stopOnFailure,
    json,
    captureOutput,
    captureWorld,
  });
}
