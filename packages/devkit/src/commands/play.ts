/**
 * play.ts — `sharpee play`: interactive REPL over an author project.
 *
 * Author-side counterpart of the platform bundle's `--play` (ADR-187 R1).
 * Loads the project's story through the shared author-game loader (Chord
 * `.story` or module story) and reads commands from stdin until `/quit`
 * or EOF. Deliberately lean — the platform bundle keeps the debug REPL
 * (/debug, /trace, …); this is the author's quick play loop.
 *
 * Public interface: runPlayCommand(rest) → process exit code (resolves on
 * REPL close).
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import * as readline from 'node:readline';
import { existsSync, statSync } from 'node:fs';
import { loadAuthorGame } from '../standalone/author-game';
import { lookupStory } from '../registry';

const USAGE = 'usage: sharpee play [name|path]';

/**
 * Run `sharpee play`.
 *
 * @param rest CLI args after the subcommand: optional project (registered
 *   name or directory; defaults to cwd).
 * @returns process exit code — 0 on clean quit/EOF, 2 usage error, 3 story
 *   load error.
 */
export async function runPlayCommand(rest: string[]): Promise<number> {
  let projectDir: string | undefined;
  for (const arg of rest) {
    if (arg.startsWith('-')) {
      console.error(`play: unknown flag '${arg}'\n${USAGE}`);
      return 2;
    }
    if (projectDir) {
      console.error(`play: unexpected argument '${arg}'\n${USAGE}`);
      return 2;
    }
    if (existsSync(arg) && statSync(arg).isDirectory()) projectDir = arg;
    else {
      const registered = lookupStory(arg);
      if (!registered) {
        console.error(
          `play: '${arg}' is neither a directory nor a registered story — run \`sharpee register <location>\`, or run \`sharpee play\` from the project directory`,
        );
        return 2;
      }
      projectDir = registered;
    }
  }

  const dir = path.resolve(projectDir ?? process.cwd());
  console.log(`Loading story from: ${dir}`);
  let game;
  try {
    game = await loadAuthorGame(dir);
  } catch (error) {
    console.error(`Error loading story: ${error instanceof Error ? error.message : error}`);
    return 3;
  }

  console.log("\n--- Play Mode ---  (/quit or /q to exit)\n");
  console.log(await game.executeCommand('look'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<number>((resolve) => {
    rl.on('close', () => resolve(0)); // EOF (^D) ends the session cleanly
    const prompt = () => {
      rl.question('\n> ', async (input) => {
        const trimmed = input.trim();
        if (trimmed === '/quit' || trimmed === '/q') {
          rl.close();
          return;
        }
        if (trimmed) {
          try {
            console.log(await game.executeCommand(trimmed));
          } catch (error) {
            console.error(`error: ${error instanceof Error ? error.message : error}`);
          }
        }
        prompt();
      });
    };
    prompt();
  });
}
