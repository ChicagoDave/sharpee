/**
 * Dialogue-selector binding types (ADR-310 D15; contracts.md §5).
 *
 * The dialogue selector is the conversation half of the character model's
 * stdlib integration: ASK/TELL/SAY/TALK TO consult the world's registered
 * selector when the addressed NPC carries a `CharacterModelTrait`, and a
 * `undefined` result falls through to the action's default behavior
 * (ADR-310 D7: no model, no change). Same ownership model as capability
 * behaviors (ADR-207), action interceptors (ADR-208), and exit resolvers
 * (ADR-295): scoped to one running `WorldModel`, idempotent last-wins,
 * never serialized — registrars re-register on every story load.
 *
 * Every signature here is platform-internal (contracts.md §7) — NOT
 * author-facing compatibility surface; revisable at refactor cost.
 *
 * Public interface: `DialogueSelector`, `ConversationIntent`,
 *   `DialogueSelectionContext`, `DialogueSelectionResult`.
 * Owner: world-model (per-world wiring surface).
 */

import type { EntityId, ISemanticEvent } from '@sharpee/core';
import type { IFEntity } from '../entities/if-entity.js';
import type { WorldModel } from '../world/WorldModel.js';

/**
 * What the player is doing conversationally (the four D15 verbs).
 * `text` is the raw topic/speech text (ADR-231 D4's first-class topic);
 * `topicEntityId` is set when that text quietly resolved to an in-scope
 * entity.
 */
export interface ConversationIntent {
  type: 'ask' | 'tell' | 'say' | 'talk-to';
  text?: string;
  topicEntityId?: EntityId;
}

/**
 * Context handed to the selector at consultation time. Deliberately
 * turn-less: the turn counter is engine state the actions cannot reach;
 * a selector needing it closes over its own turn source at wiring time
 * (the character subsystem's existing `getTurn` idiom).
 */
export interface DialogueSelectionContext {
  /** The live world the conversation is happening in. */
  world: WorldModel;
  /** The conversing actor (the player). */
  speakerId: EntityId;
}

/**
 * A selector's answer: the message the action's report phase should emit
 * in place of its default. `handled: false` (or an `undefined` return)
 * falls through to the action's default behavior.
 */
export interface DialogueSelectionResult {
  handled: boolean;
  /** Message ID for the action to emit via the reporting phase. */
  messageId?: string;
  /** Parameters for the language layer message. */
  params?: Record<string, unknown>;
  /**
   * Author-channel events the selection produced (ADR-318 D11: ledger
   * mints, pressure deposits, band transitions, paralysis warnings).
   * The consulting action appends them to its report events so the
   * `character` channel can project them. They carry no message ID and
   * never render as player prose (ADR-310 D12).
   */
  authorEvents?: ISemanticEvent[];
}

/**
 * The world's dialogue selector (ADR-310 D15 — built by the character
 * subsystem, consulted by stdlib's conversation actions).
 *
 * @param npc - The addressed NPC (carries `CharacterModelTrait` — the
 *   actions only consult for modeled NPCs)
 * @param intent - What the player is conversationally doing
 * @param ctx - Live world, speaker, and turn
 * @returns The selection, or `undefined` to fall through to the default
 */
export type DialogueSelector = (
  npc: IFEntity,
  intent: ConversationIntent,
  ctx: DialogueSelectionContext
) => DialogueSelectionResult | undefined;
