/**
 * lens.ts — `sharpee lens examinable`: run the examinable lens over a story
 * (ADR-408 D3, D6, D7).
 *
 * `sharpee lens examinable [name|dir|file.story] [--seed N] [--max-seconds N]
 * [--all] [--json]`
 *
 * The lens reaches every room a player can walk to by its shortest route
 * (ADR-408 Amendment 1), types `examine <phrase>` for each noun in the prose
 * a player reads there, in both grammatical numbers, and reports the phrases
 * the engine could not resolve, the things that answer with no text, and
 * each room it did not reach with the reason. All of that is branch-tester's
 * `runExaminableLens` and its words are `formatExaminableReport`; this module
 * owns the arguments, the story file, the extractor lookup and the output.
 *
 * The story is compiled here (`compileChordStory`), never read from a `dist/`
 * IR, so a stale build cannot reach the lens. The defaults are seed 1209 and
 * a 120 s time budget.
 *
 * Exit codes: 0 a report (findings never fail the command, ADR-408 D7);
 * 1 the story's language has no extractor, or the engine's language is not
 * the story's (one line on stderr, or the refusal document under `--json`);
 * 2 a usage error or no story.
 *
 * Public interface: `runLensCommand(args)`.
 * Owner context: @sharpee/devkit — the author CLI.
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { formatExaminableReport, runExaminableLens, type LensGame } from '@sharpee/branch-tester';
import { compileChordStory, findStoryFile, loadAuthorGame } from '../standalone/author-game.js';
import { nounExtractorLookup } from './world-index.js';

const USAGE = 'usage: sharpee lens examinable [name|dir|file.story] [--seed N] [--max-seconds N] [--all] [--json]';

/** The defaults: the explorer's seed and time budget. */
const DEFAULTS = { seed: 1209, maxSeconds: 120 };

interface LensArgs {
  readonly target: string;
  readonly seed: number;
  readonly maxSeconds: number;
  readonly all: boolean;
  readonly json: boolean;
}

/** Parse the arguments after `lens`; a string is a usage error to print. */
function parseLensArgs(args: readonly string[]): LensArgs | string {
  const [lens, ...rest] = args;
  if (lens !== 'examinable') return lens === undefined ? `lens: name a lens\n${USAGE}` : `lens: unknown lens '${lens}' (the lenses: examinable)\n${USAGE}`;
  let target: string | undefined;
  const numbers: Record<'seed' | 'maxSeconds', number> = { ...DEFAULTS };
  const flags: Record<string, keyof typeof numbers> = { '--seed': 'seed', '--max-seconds': 'maxSeconds' };
  let all = false;
  let json = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--all') all = true;
    else if (arg === '--json') json = true;
    else if (arg in flags) {
      const value = Number(rest[++i]);
      const key = flags[arg];
      const minimum = key === 'seed' ? 0 : 1;
      if (!Number.isInteger(value) || value < minimum) return `lens: ${arg} takes a whole number of at least ${minimum}\n${USAGE}`;
      numbers[key] = value;
    } else if (arg.startsWith('-')) return `lens: unknown flag ${arg}\n${USAGE}`;
    else if (target === undefined) target = arg;
    else return `lens: one story at a time (got '${target}' and '${arg}')\n${USAGE}`;
  }
  return { target: target ?? '.', ...numbers, all, json };
}

/**
 * Run `sharpee lens`.
 *
 * @param args the arguments after `lens`
 * @returns the exit code: 0 a report, 1 a refusal, 2 a usage error or no story
 */
export async function runLensCommand(args: readonly string[]): Promise<number> {
  const parsed = parseLensArgs(args);
  if (typeof parsed === 'string') {
    console.error(parsed);
    return 2;
  }
  const target = path.resolve(parsed.target);
  // `findStoryFile` reads a directory; a place that does not exist is the
  // same answer as a directory with no story in it.
  const storyFile = !existsSync(target) ? null : target.endsWith('.story') ? target : findStoryFile(target);
  if (!storyFile) {
    console.error(`lens: no .story file found at ${target}`);
    return 2;
  }

  const ir = compileChordStory(storyFile);
  const result = await runExaminableLens(
    ir,
    (): Promise<LensGame> => loadAuthorGame(storyFile, { seed: parsed.seed, undoSnapshots: 0 }),
    { story: path.basename(storyFile), seed: parsed.seed, lookup: nounExtractorLookup, maxSeconds: parsed.maxSeconds },
  );

  if ('refused' in result) {
    if (parsed.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else console.error(result.refused);
    return 1;
  }
  if (parsed.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${formatExaminableReport(result, { all: parsed.all }).join('\n')}\n`);
  return 0;
}
