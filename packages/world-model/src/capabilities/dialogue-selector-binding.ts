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
 * Public interface: `DialogueSelector`, `DialogueSelectorRegistration`,
 *   `ConversationIntent`, `DialogueSelectionContext`,
 *   `DialogueSelectionResult`, `SceneDirective`.
 * Owner: world-model (per-world wiring surface).
 */

import type { EntityId, ISemanticEvent } from '@sharpee/core';
import type { IFEntity } from '../entities/if-entity.js';
import type { WorldModel } from '../world/WorldModel.js';
import type {
  ConversationSceneState,
  ExchangeState,
  SceneBoundaryKind,
} from '../traits/character-model/conversation-scene.js';
import type { SceneWireEvent } from './scene-wire.js';

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
  /**
   * The scene the addressed NPC is in, if any (ADR-320 D4; adr-320
   * contracts.md §4). An exchange-aware selector reads the open exchange
   * off it for the overlay-before-table rule (ADR-310 D16 innermost-wins).
   * Absent until the Phase 6 dispatch integration wires it — existing
   * registrants and the zero-registrant default are unaffected.
   */
  scene?: ConversationSceneState;
}

/**
 * A scene lifecycle change the selection asks the scene runtime to
 * perform (ADR-320 D4; adr-320 contracts.md §4). The directive shape
 * keeps the selector pure (the arbiter discipline: it computes, the
 * runtime mutates) — a selector never writes scene state itself.
 */
export type SceneDirective =
  | { kind: 'open-exchange'; exchange: ExchangeState }
  | { kind: 'close-exchange' }
  | { kind: 'set-floor'; holderId: EntityId | null }
  | {
      kind: 'close-scene';
      boundary: SceneBoundaryKind;
      /**
       * Who is leaving, for an `exit` boundary (ADR-320 D8): the dispatch
       * layer checks the leaver's exit legality against the world before
       * applying — a restrained, cornered, or blocked NPC cannot take it.
       * Absent = a mutual/narrative close, never legality-checked.
       */
      leaverId?: EntityId;
    };

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
  /**
   * Scene lifecycle the selection asks the runtime to perform (ADR-320
   * D4; adr-320 contracts.md §4). Absent from every pre-scene selector —
   * the consulting action ignores the field until Phase 6 wires it.
   */
  sceneDirectives?: SceneDirective[];
  /**
   * D12 wire events this selection produced, for the channel layer
   * (ADR-320 D12; adr-320 contracts.md §3). Author-channel visibility
   * only — never player prose (ADR-310 D12).
   */
  wireEvents?: SceneWireEvent[];
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

/**
 * The registered selector surface (ADR-320 D16; adr-320 contracts.md §4
 * as amended for Phase 6): the mutating report-time selection plus an
 * optional PURE probe the conversation actions consult during validation.
 * When the addressed NPC's open exchange claims the input, the firing is
 * exchange-gripped — the innermost active context wins outright, so the
 * remaining interceptor phases (the topic table's dispatch path) are
 * skipped and no table bookkeeping runs. The probe must not mutate:
 * validation can be re-entered, and only `select` runs in the mutating
 * report phase.
 */
export interface DialogueSelectorRegistration {
  /** The report-time selection (may mutate trait state by design). */
  select: DialogueSelector;

  /**
   * Pure (D16): does the addressed NPC's open exchange claim this input?
   * Absent = no exchange overlay (every firing takes today's path).
   */
  exchangeClaims?: (
    npc: IFEntity,
    intent: ConversationIntent,
    ctx: DialogueSelectionContext
  ) => boolean;

  /**
   * Pure (ADR-320 D14): does a conversation thread claim this input?
   * True when the pair's ACTIVE thread will serve it (an on-filter
   * advance, a blocking off-topic refusal, or an assertive protest with
   * an authored `on parting` row), or when no thread is active and a
   * parked thread resumes / an unopened thread activates on the matching
   * filter. The dispatch precedence extends D16's innermost-wins: open
   * exchange > active thread > parked-thread resume > topic table.
   * Absent = no threads declared (every firing takes today's path).
   */
  threadClaims?: (
    npc: IFEntity,
    intent: ConversationIntent,
    ctx: DialogueSelectionContext
  ) => boolean;
}
