/**
 * The stage lists the engine runs: `TURN_STAGES` for a regular command,
 * `META_STAGES` for a meta command, and `OPENING_STAGES` for the first
 * look of a new game's opening, which is not a turn. The order here IS
 * the contract; each stage's `requires` names what it must follow, and
 * the order test pins every list and drives each once.
 *
 * Both lists open with the same routing stages through `parse`, where
 * they part: the regular list executes the command, enriches and emits
 * its events, ticks the plugins, dispatches sound, advances the turn,
 * lands a player switch, drains platform requests, renders, detects a
 * death, clears the turn's events, announces completion, and ends the
 * story if the turn did. The meta list runs the command outside the
 * turn cycle and renders its events at once; that it never touches the
 * turn machinery is readable as the absence of those stages from it.
 *
 * Public interface: `TURN_STAGES`, `META_STAGES`, `SHARED_STAGES`,
 * `OPENING_STAGES`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the list), D1a (two lists, shared prefix; a
 * third for the opening, as amended by ADR-404), D2 (the order pinned by
 * test).
 */

import type { TurnStage, TurnStageContext } from './context.js';
import { chainStage } from './chain.js';
import { heldCommandStage } from './held-command.js';
import { exchangeOfferStage } from './exchange-offer.js';
import { undoSnapshotStage } from './undo-snapshot.js';
import { validateInputStage } from './validate-input.js';
import { turnStartStage } from './turn-start.js';
import { inputModeStage } from './input-mode.js';
import { parseStage } from './parse.js';
import { executeCommandStage } from './execute-command.js';
import { enrichEventsStage } from './enrich-events.js';
import { commandHistoryStage } from './command-history.js';
import { emitEventsStage } from './emit-events.js';
import { pluginTickStage } from './plugin-tick.js';
import { soundDispatchStage } from './sound-dispatch.js';
import { advanceTurnStage } from './advance-turn.js';
import { playerSwitchStage } from './player-switch.js';
import { platformOperationsStage } from './platform-operations.js';
import { renderProseStage } from './render-prose.js';
import { channelPacketStage } from './channel-packet.js';
import { detectDeathStage } from './detect-death.js';
import { clearTurnEventsStage } from './clear-turn-events.js';
import { turnCompleteStage } from './turn-complete.js';
import { endingStage } from './ending.js';
import { metaCommandStage } from './meta-command.js';
import { metaRenderStage } from './meta-render.js';
import { openingPluginsStage } from './opening-plugins.js';
import { openingLookStage } from './opening-look.js';
import { openingPacketStage } from './opening-packet.js';

/** The routing stages both lists open with, through the parse that parts them. */
export const SHARED_STAGES: readonly TurnStage[] = Object.freeze([
  chainStage,
  heldCommandStage,
  exchangeOfferStage,
  undoSnapshotStage,
  validateInputStage,
  turnStartStage,
  inputModeStage,
  parseStage
]);

/** A regular command's turn, in run order. */
export const TURN_STAGES: readonly TurnStage[] = Object.freeze([
  ...SHARED_STAGES,
  executeCommandStage,
  enrichEventsStage,
  commandHistoryStage,
  emitEventsStage,
  pluginTickStage,
  soundDispatchStage,
  advanceTurnStage,
  playerSwitchStage,
  platformOperationsStage,
  // ADR-347: before `render-prose`, not after `channel-packet`. A death is
  // an ending the story never declared, and this stage declares it — so it
  // has to happen while the turn can still carry it, or the turn that ends
  // the story renders the ordinary prompt and sends no `story-ending`.
  detectDeathStage,
  renderProseStage,
  channelPacketStage,
  clearTurnEventsStage,
  turnCompleteStage,
  endingStage
]);

/** A meta command's run, in run order: the shared routing, then the command and its render. */
export const META_STAGES: readonly TurnStage[] = Object.freeze([
  ...SHARED_STAGES,
  metaCommandStage,
  metaRenderStage
]);

/**
 * A turn stage as the opening's list runs it: the same `run`, with the
 * `requires` restated for a list that has no parse, no plugin tick and no
 * advance. The stage's own `requires` names stages the opening leaves
 * out, so it cannot be checked there; the restated one can, and the order
 * test checks it as it checks the other two lists.
 */
function inOpening(stage: TurnStage, requires: readonly string[]): TurnStage {
  return Object.freeze({ name: stage.name, requires, run: (context: TurnStageContext) => stage.run(context) });
}

/**
 * The opening's first look, in run order (ADR-404 decisions 3 and 9).
 *
 * It is a turn from its execution on, without the three stages that make
 * a turn cost something: there is no `plugin-tick` (no timer, daemon or
 * each-turn mechanic steps), no `advance-turn` (the counter and the
 * session's turn count do not move, and nothing joins the history) and no
 * `command-history` (nothing for AGAIN to repeat). The routing stages are
 * absent because there is no typed input to route, `undo-snapshot` among
 * them, so no snapshot is taken. `turn-complete` is absent because no turn
 * completed: a listener counting turns must not count this.
 *
 * Kept, each checked against its module: the plugins' `onOpening` hook
 * and the look replace the routing and the typed execution; the events
 * are enriched and emitted as a turn's are; a sound the look makes is
 * heard; a `change the player to` a looking clause ran lands; a platform
 * request is honoured; a death is detected and an ending stops the
 * engine, as after any action; the prose renders with the prompt; the
 * packet goes out with the look's channels only, stamped 0; and the
 * events are cleared so the first command's render starts empty.
 */
export const OPENING_STAGES: readonly TurnStage[] = Object.freeze([
  openingPluginsStage,
  openingLookStage,
  inOpening(enrichEventsStage, ['opening-look']),
  emitEventsStage,
  inOpening(soundDispatchStage, ['emit-events']),
  inOpening(playerSwitchStage, ['sound-dispatch']),
  inOpening(platformOperationsStage, ['enrich-events', 'sound-dispatch']),
  inOpening(detectDeathStage, ['platform-operations']),
  renderProseStage,
  openingPacketStage,
  inOpening(clearTurnEventsStage, ['opening-packet', 'detect-death']),
  inOpening(endingStage, ['clear-turn-events', 'detect-death', 'emit-events'])
]);
