/**
 * The opening routine: run a story's opening once, routine by routine, in
 * the order the story states, outside the turn cycle.
 *
 * Each routine sends one channel packet that carries only its own
 * channels, so a client that appends what it receives prints the story's
 * order with no rule of its own:
 *
 *  - `show-prologue` writes the story's prologue text where the `prologue`
 *    channel reads it, and sends that channel; when no text is written
 *    (no prologue, or a phrase that does not resolve) it sends no packet.
 *    A story whose opening has
 *    no `show-prologue` never has the text written, so no later packet
 *    carries it either.
 *  - `show-banner` renders the events `start()` left pending (the
 *    `game.started` the banner is built from) and sends the `banner`
 *    channel. Without it those events are dropped, so the title block
 *    does not appear on the first command instead.
 *  - `do-first-look` runs `OPENING_STAGES`.
 *
 * Invariants: the turn counter, the session's turn count, the history and
 * the undo snapshots are as `start()` left them when this returns; every
 * packet is stamped `OPENING_PACKET_TURN`; and no event of the opening is
 * left in the store for the first command's render.
 *
 * Public interface: `runOpeningRoutines`.
 * Owner context: `@sharpee/engine` — the opening routine.
 *
 * References: ADR-404 decisions 2, 3, 6 and 9.
 */

import { STANDARD_CHANNEL_IDS } from '@sharpee/stdlib';
import type { TurnResult } from '../types.js';
import type { OpeningRoutine } from '../install/story.js';
import type { TurnEngine, TurnStageContext } from './context.js';
import { emitChannelPacket } from './channel-packet.js';
import { OPENING_PACKET_TURN } from './opening-packet.js';
import { runTurnStages } from './runner.js';
import { OPENING_STAGES } from './stages.js';

/**
 * Run the routines of an opening, in order, and return the first look's
 * result.
 *
 * @param engine - The turn-facing engine surface, in the `playing` phase
 *   with no turn run yet (the facade's `runOpening()` checks both)
 * @param routines - The story's opening, already validated at install
 * @returns the first look's result; when the opening has no
 *   `do-first-look`, a successful result with no events and no blocks
 */
export async function runOpeningRoutines(
  engine: TurnEngine,
  routines: readonly OpeningRoutine[]
): Promise<TurnResult> {
  const turn = engine.context.currentTurn;

  // What `start()` emitted waits in the first turn's events, where the
  // first rendered turn used to find it. The opening owns it now: taken
  // out here, it is rendered by `show-banner` or by nothing.
  const pending = [...engine.turnEventsOf(turn)];
  engine.clearTurnEvents(turn);

  let lookResult: TurnResult | undefined;
  for (const routine of routines) {
    switch (routine) {
      case 'show-prologue':
        // The default opening names this routine for every story; one
        // without a prologue, or whose prologue phrase does not resolve,
        // has nothing to show and sends no packet.
        if (!engine.writePrologue()) break;
        emitChannelPacket(engine, [], [], OPENING_PACKET_TURN, [STANDARD_CHANNEL_IDS.PROLOGUE]);
        break;
      case 'show-banner': {
        const blocks = engine.textService ? engine.textService.processTurn(pending) : [];
        if (blocks.length > 0) {
          engine.emit('text:output', blocks, OPENING_PACKET_TURN);
        }
        emitChannelPacket(engine, pending, blocks, OPENING_PACKET_TURN, [STANDARD_CHANNEL_IDS.BANNER]);
        break;
      }
      case 'do-first-look': {
        const context: TurnStageContext = {
          engine,
          input: '',
          turn,
          started: false,
          semanticEvents: [],
          events: []
        };
        lookResult = await runTurnStages(context, OPENING_STAGES, OPENING_STAGES);
        break;
      }
    }
  }

  return lookResult ?? { turn, input: '', success: true, events: [] };
}
