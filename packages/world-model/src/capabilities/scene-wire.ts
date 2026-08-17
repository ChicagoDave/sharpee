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
 * Public interface: SceneWireEvent, ResponseAffordance, ExchangeAffordances.
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
  | { kind: 'rendered-silence'; sceneId: string; speakerId: EntityId; beats: string[] };

/**
 * One advertised response on an open exchange (ADR-320 D12): a verbal row,
 * an act/event row, or silence — silence is always available (D8, the
 * inalienable move). A chat client renders these as reply choices; the
 * parser client may ignore them; the testing surface consumes them for
 * coverage and recording.
 */
export type ResponseAffordance =
  | { kind: 'verbal'; rowId: string; messageId: string }
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
