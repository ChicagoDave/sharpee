/**
 * The history stage: record a successful command, update the pronoun
 * context, and register a refusal's referent.
 *
 * A successful command joins the command history and updates what "it",
 * "them", "him", and "her" resolve to. A refusal that names an entity
 * ("The oak door is closed.") makes it the pronoun referent — the player
 * expects to act on whatever was just mentioned. A blocked action counts
 * as a successful turn (its `blocked()` events are ordinary events), so
 * this reads the events, not the success flag: only `blocked: true`
 * events and the events of a failed turn are scanned.
 *
 * Public interface: `commandHistoryStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-089 (pronoun context); GH #97 (the refusal referent).
 */

import { hasPronounContext } from '../parser-interface.js';
import type { TurnStage } from './context.js';

export const commandHistoryStage: TurnStage = {
  name: 'command-history',
  requires: ['execute-command'],
  async run(context) {
    const { engine, turn } = context;
    const result = context.result!;

    if (result.success) {
      engine.updateCommandHistory(result, context.input, turn);
      if (engine.parser && hasPronounContext(engine.parser) && result.validatedCommand) {
        engine.parser.updatePronounContext(result.validatedCommand, turn);
      }
    }
    engine.registerBlockedReferent(
      result.success
        ? result.events.filter((e) => (e.data as { blocked?: unknown } | undefined)?.blocked === true)
        : result.events,
      turn
    );
    return 'continue';
  }
};
