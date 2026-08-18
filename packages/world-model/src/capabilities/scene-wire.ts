/**
 * Scene wire schema (ADR-320 D12; adr-320 contracts.md §3)
 *
 * The presentation-agnostic conversation wire: a scene emits structured
 * events — speaker, addressee, phrase, manner beats, floor changes,
 * interruptions, rendered silences — and an open exchange advertises its
 * available responses as data. Carried as channel data under the ADR-163
 * discipline (data only, clients render); parser prose and chat bubbles
 * are two renderings of one stream. Scene internals reach the author
 * channel only — the player-facing build sees rendered prose alone
 * (ADR-320 AC11, the ADR-310 D12/AC8 isolation).
 *
 * Runtime-free data shapes, importable by character, stdlib, and
 * platform-browser/devkit without duplication (the co-located wire-type
 * rule). Every shape is platform-internal (contracts.md §7).
 *
 * Public interface: SceneWireEvent, AffordanceTopic, ResponseAffordance,
 * ExchangeAffordances, ThreadContinuability.
 * Owner context: world-model (per-world wiring surface)
 */

import type { EntityId } from '@sharpee/core';
import type { SceneOpenedBy, SceneBoundaryKind } from '../traits/character-model/conversation-scene.js';

/**
 * One structured scene event on the wire (ADR-320 D12). `beats` carry
 * manner beat message ids (D5) — authored text, resolved by the language
 * layer, never platform-generated prose (ADR-310 D12).
 */
export type SceneWireEvent =
  | { kind: 'scene-opened'; sceneId: string; participantIds: EntityId[]; openedBy: SceneOpenedBy }
  | { kind: 'scene-closed'; sceneId: string; boundary: SceneBoundaryKind }
  | {
      kind: 'utterance';
      sceneId: string;
      speakerId: EntityId;
      addresseeId?: EntityId;
      messageId: string;
      beats: string[];
    }
  | { kind: 'floor-change'; sceneId: string; holderId: EntityId | null }
  | {
      kind: 'interruption';
      sceneId: string;
      interrupterId: EntityId;
      outcome: 'yields' | 'protests' | 'blocks';
    }
  | { kind: 'rendered-silence'; sceneId: string; speakerId: EntityId; beats: string[] }
  // -- ADR-320 D14 thread lifecycle (additive, Phase 10.2). `beatIndex` is
  // the served beat's 0-based position; a park/resume carries the cursor
  // (beats already served) so tooling can show where the thread stands.
  | { kind: 'thread-opened'; sceneId: string; ownerId: EntityId; threadKey: string }
  | { kind: 'thread-beat'; sceneId: string; ownerId: EntityId; threadKey: string; beatIndex: number }
  | { kind: 'thread-parked'; sceneId: string; ownerId: EntityId; threadKey: string; beatCursor: number }
  | { kind: 'thread-resumed'; sceneId: string; ownerId: EntityId; threadKey: string; beatCursor: number }
  | { kind: 'thread-concluded'; sceneId: string; ownerId: EntityId; threadKey: string };

/**
 * What input a verbal exchange row matches (ADR-320 D12): an entity
 * reference, or a text phrase with its aliases. Mirrors the compiled
 * Chord row's topic filter — the enumerable "what could the player say
 * here?" is the filter itself, resolved topic text, not a message id
 * (amended 2026-08-17, Phase 9: the Phase 1 sketch's `messageId` had no
 * counterpart in the compiled row; the response body is statements,
 * resolved only when spoken).
 */
export type AffordanceTopic =
  | { kind: 'entity'; id: string }
  | { kind: 'text'; primary: string; aliases: string[] };

/**
 * One advertised response on an open exchange (ADR-320 D12): a verbal row,
 * an act/event row, or silence — silence is always available (D8, the
 * inalienable move). A chat client renders these as reply choices (`topic`
 * `primary` is the chip text); the parser client may ignore them; the
 * testing surface consumes them for coverage and recording. `rowId` is
 * minted as `<exchangeId>#<row-index>` at load time.
 */
export type ResponseAffordance =
  | { kind: 'verbal'; rowId: string; topic: AffordanceTopic }
  | { kind: 'act'; rowId: string; actionId: string }
  | { kind: 'silence' };

/**
 * The full advertised-response set of an open exchange (ADR-320 D12) —
 * part of the wire schema from first release; exchange rows are
 * declarative and therefore enumerable.
 */
export interface ExchangeAffordances {
  sceneId: string;
  exchangeId: string;
  responses: ResponseAffordance[];
}

/**
 * An active thread's continuability (ADR-320 D14, additive to the D12
 * affordance surface): whether the owner has a next beat ready — the
 * "Kemp has more to say" a chat client renders as a continue chip and
 * the testing surface consumes for coverage. `continuable` is false
 * while the next beat's hold-gate is unmet (the thread waits for its
 * world) and the record disappears entirely when no thread is active
 * (never stale, the exchange-affordances discipline).
 */
export interface ThreadContinuability {
  sceneId: string;
  ownerId: EntityId;
  threadKey: string;
  /** Beats already served (the cursor position the next beat would advance). */
  beatCursor: number;
  /** True when the next beat (or the conclusion) is ready to serve. */
  continuable: boolean;
}
