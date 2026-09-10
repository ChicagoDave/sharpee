/**
 * The two stage lists a turn can run: `TURN_STAGES` for a regular command
 * and `META_STAGES` for a meta command. The order here IS the turn's
 * contract; each stage's `requires` names what it must follow, and the
 * order test pins both lists and drives each once.
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
 * Public interface: `TURN_STAGES`, `META_STAGES`, `SHARED_STAGES`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the list), D1a (two lists, shared prefix),
 * D2 (the order pinned by test).
 */

import type { TurnStage } from './context.js';
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
  renderProseStage,
  channelPacketStage,
  detectDeathStage,
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
