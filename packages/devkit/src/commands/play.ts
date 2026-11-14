/**
 * play.ts — `sharpee play`: interactive REPL over an author project.
 *
 * Author-side counterpart of the platform bundle's `--play` (ADR-187 R1).
 * Loads the project's story through the shared author-game loader (Chord
 * `.story` or module story) and reads commands from stdin until `/quit`
 * or EOF. Deliberately lean — the platform bundle keeps the debug REPL
 * (/debug, /trace, …); this is the author's quick play loop.
 *
 * Pipe-safe (GH #240): commands arrive through readline's async iterator,
 * so `printf 'north\nnorth\n' | sharpee play` runs every line in order and
 * exits at EOF — the old `question()` loop re-armed only after each turn's
 * await and lost every queued line to the close event.
 *
 * The opening (GH #704): the prologue and the banner travel on their own
 * channels, so the REPL prints them itself, before the first room. Once the
 * story has an ending the prompt is the language layer's ended line, and a
 * command the stopped engine refuses prints that line, not the engine's error.
 *
 * Public interface: runPlayCommand(rest, io?) → process exit code (resolves
 * on REPL close); `io` injects the input/output streams (tests).
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import * as readline from 'node:readline';
import { existsSync, statSync } from 'node:fs';
import type { Readable, Writable } from 'node:stream';
import type { LoadedGame } from '@sharpee/bootstrap';
import type { BannerData } from '@sharpee/stdlib';
import { loadAuthorGame } from '../standalone/author-game.js';
import { lookupStory } from '../registry.js';

const USAGE = 'usage: sharpee play [name|path]';
const PLAYING_PROMPT = '\n> ';
/** The language layer's prompt for a story that has ended (ADR-347 D3a). */
const ENDED_PROMPT_MESSAGE = 'if.platform.prompt.ended';

/** Whether a captured `banner` channel value is the banner record. */
function isBannerData(value: LoadedGame['lastChannelValues'][string][number]): value is BannerData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The lines of the story's opening, read after the first command: the
 * prologue, then the banner (title, subtitle, credits, story version, and
 * any closing lines the story added), each followed by a blank line.
 *
 * @param game the loaded game, after its first `executeCommand`
 * @returns the lines to print before the first room; empty when the story
 *   said nothing on either channel
 */
function openingLines(game: LoadedGame): string[] {
  const lines: string[] = [];
  const prologue = game.lastChannels['prologue'] ?? [];
  if (prologue.length > 0) lines.push(...prologue, '');

  // `banner` is a replace-mode channel: the last value is the banner.
  const banner = (game.lastChannelValues['banner'] ?? []).filter(isBannerData).at(-1);
  if (banner) {
    const bannerLines = [
      banner.title,
      banner.subtitle,
      ...(banner.credits ?? []),
      banner.storyVersion,
      ...(banner.tail ?? []),
    ].filter((line): line is string => typeof line === 'string' && line.length > 0);
    if (bannerLines.length > 0) lines.push(...bannerLines, '');
  }
  return lines;
}

/** The ended-story line, as the language layer words it, without its trailing space. */
function endedLine(game: LoadedGame): string {
  return game.engine.getLanguageProvider().getMessage(ENDED_PROMPT_MESSAGE).trimEnd();
}

/**
 * Run `sharpee play`.
 *
 * @param rest CLI args after the subcommand: optional project (registered
 *   name or directory; defaults to cwd).
 * @returns process exit code — 0 on clean quit/EOF, 2 usage error, 3 story
 *   load error.
 */
export async function runPlayCommand(
  rest: string[],
  io: { input: Readable; output: Writable; isTTY?: boolean } = {
    input: process.stdin,
    output: process.stdout,
    isTTY: process.stdin.isTTY === true,
  },
): Promise<number> {
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
  // The opening rides its own channels and is captured by the first command,
  // so it is read after `look` and printed before it: prologue, banner, room.
  const firstRoom = await game.executeCommand('look');
  for (const line of openingLines(game)) console.log(line);
  console.log(firstRoom);

  // A TTY gets the prompt echoed by readline; a pipe gets the command echoed
  // (`> north`) so the transcript reads as a play session.
  const rl = readline.createInterface({
    input: io.input,
    output: io.isTTY ? io.output : undefined,
    terminal: io.isTTY === true,
    prompt: PLAYING_PROMPT,
  });
  // Whether the last turn left the story ended. A TTY reads it off the
  // prompt; a pipe has no prompt, so it is told once, on the turn it ends.
  let ended = false;
  const showPrompt = (): void => {
    if (!io.isTTY) return;
    rl.setPrompt(ended ? `\n${endedLine(game)} ` : PLAYING_PROMPT);
    rl.prompt();
  };
  showPrompt();
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === '/quit' || trimmed === '/q') {
      rl.close();
      break;
    }
    if (trimmed) {
      if (!io.isTTY) console.log(`\n> ${trimmed}`);
      try {
        const output = await game.executeCommand(trimmed);
        const endedNow = game.world.getEnding() !== undefined;
        if (endedNow && game.lastError !== undefined) {
          // The stopped engine refused the command; its error names engine
          // internals, so the player reads the ended line in its place.
          console.log(endedLine(game));
        } else {
          console.log(output);
          if (endedNow && !ended && !io.isTTY) console.log(`\n${endedLine(game)}`);
        }
        ended = endedNow;
      } catch (error) {
        console.error(`error: ${error instanceof Error ? error.message : error}`);
      }
    }
    showPrompt();
  }
  return 0; // EOF (^D, or the end of the pipe) ends the session cleanly
}
