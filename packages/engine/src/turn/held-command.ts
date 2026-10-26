/**
 * The held-command stage: spend a command held after a question on this
 * input.
 *
 * A command held after a missing-object clarification or a disambiguation
 * prompt is completed by this input when the input is not a command of
 * its own; either way the hold is spent here — exactly one input. A
 * disambiguation hold carries where the answer goes: its words, without
 * their articles and without words the command already holds, are
 * inserted at the tied phrase's first content word (`x clock` + `brass`
 * → `x brass clock`; `take sword and key` + `silver` → `take sword and
 * silver key`). A missing-object hold has no insertion point and takes
 * the answer at the end (`drop` + `pear`; `put pear` + `in the box`).
 *
 * Public interface: `heldCommandStage`, `spliceAnswer`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-225 as amended (GH #318); ADR-385 D11.
 */

import { PartOfSpeech, type Token } from '@sharpee/if-domain';
import type { HeldCommand } from '../types.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Rebuild a held command from the player's answer.
 *
 * With an insertion point, the answer's words are inserted there, less
 * any article and any word the held command already holds; an answer
 * that adds nothing yields the held input unchanged. Without one, the
 * answer is appended as typed.
 * @param held the held command
 * @param answer this turn's input
 * @param tokenize the parser's tokenizer, which marks the articles
 * @returns the rebuilt command text
 */
export function spliceAnswer(held: HeldCommand, answer: string, tokenize: (text: string) => Token[]): string {
  if (held.insertAt === undefined) return `${held.input} ${answer}`;
  const known = new Set(held.tokens.map((word) => word.toLowerCase()));
  const words = tokenize(answer)
    .filter((token) => !token.candidates.some((candidate) => candidate.partOfSpeech === PartOfSpeech.ARTICLE))
    .filter((token) => !known.has(token.normalized))
    .map((token) => token.word);
  if (words.length === 0) return held.input;
  return [...held.tokens.slice(0, held.insertAt), ...words, ...held.tokens.slice(held.insertAt)].join(' ');
}

/**
 * Spend the held command: when a question is open and this input does
 * not parse as a command of its own, rebuild the held command with it
 * and run the rebuilt form if it parses. An input that parses on its own
 * drops the hold and runs as written. The hold is cleared here whatever
 * happens — exactly one input.
 * @param engine the turn-facing engine surface
 * @param input the raw input for this turn
 * @returns the input to run: rebuilt, or as given
 */
function spliceHeldCommand(engine: TurnEngine, input: string): string {
  const held = engine.takeHeldCommand();
  const parser = engine.parser;
  if (held === undefined) return input;
  const world = engine.world;
  const player = world.getPlayer();
  if (player) {
    parser.setWorldContext(world, player.id, world.getLocation(player.id) || '');
  }
  if (parser.parse(input).success) return input;
  const rebuilt = spliceAnswer(held, input, (text) => parser.tokenize(text));
  return parser.parse(rebuilt).success ? rebuilt : input;
}

export const heldCommandStage: TurnStage = {
  name: 'held-command',
  requires: ['chain'],
  async run(context) {
    context.input = spliceHeldCommand(context.engine, context.input);
    return 'continue';
  }
};
