/**
 * Scene runtime — open, close, floor, exchange, and decay (ADR-320 D4;
 * adr-320 contracts.md §1)
 *
 * The one writer of the scene store: scenes open against per-pair memory
 * (first-meeting vs return boundaries), moves stamp the floor clock,
 * selector-issued directives mutate scene state (the selector computes,
 * this runtime mutates — the arbiter discipline), closes fold the scene
 * into both sides' conversation memory, and unattended scenes decay into
 * a `silence` close (the ADR-142 attention-decay machinery wired live).
 * All turn reads go through the character clock seam (D6).
 *
 * Public interface: OpenSceneOptions, PartingLine, openScene, closeScene,
 *   recordSceneMove, applySceneDirectives, stampThreadContinuability,
 *   ageScenes.
 * Owner context: @sharpee/character / conversation
 */

import type {
  WorldModel,
  ConversationSceneState,
  SceneBoundaryKind,
  SceneOpenedBy,
  SceneStrength,
  SceneDirective,
  SceneWireEvent,
  ThreadContinuability,
} from '@sharpee/world-model';
import { dialogueTurn } from '../character-clock.js';
import { DEFAULT_DECAY_THRESHOLDS } from './lifecycle.js';
import { readSceneStore, writeSceneStore, sceneWith } from './scene-store.js';
import { type ConversationMemoryAccess, recordSceneClosed } from './conversation-memory.js';
import { parkActiveThreadsOnClose } from './thread-runtime.js';

/** What a caller supplies to open a scene. */
export interface OpenSceneOptions {
  /** Everyone in the scene, PC included (at least two). */
  participantIds: string[];

  /** How the scene opened (selects boundary rows, seeds aboutness). */
  openedBy: SceneOpenedBy;

  /** Authored scene strength, if any (D10); absent = derived at read time. */
  strength?: SceneStrength;
}

/**
 * Open a scene (ADR-320 D4). Mints the id, seats the participants, and
 * gives an addressing/initiating opener the floor (a witnessed-event
 * opening leaves the floor contested). Enforces the store's invariants:
 * at least two participants, none already in a live scene.
 *
 * @param world - The live world
 * @param options - Participants, opener, optional strength
 * @returns The opened scene and its wire events
 * @throws Error when the participant invariants are violated
 */
export function openScene(
  world: WorldModel,
  options: OpenSceneOptions,
): { scene: ConversationSceneState; wireEvents: SceneWireEvent[] } {
  const { participantIds, openedBy, strength } = options;

  if (participantIds.length < 2) {
    throw new Error(`A scene needs at least two participants; got ${participantIds.length}.`);
  }
  for (const id of participantIds) {
    const existing = sceneWith(world, id);
    if (existing) {
      throw new Error(`Participant \`${id}\` is already in scene \`${existing.id}\`.`);
    }
  }

  const store = readSceneStore(world);
  const turn = dialogueTurn(world);
  const scene: ConversationSceneState = {
    id: `scene-${store.nextSceneSeq}`,
    participantIds: [...participantIds],
    openedBy,
    floorHolderId: openedBy.kind === 'witnessed-event' ? null : openedBy.openerId,
    openExchange: null,
    ...(strength !== undefined ? { strength } : {}),
    openedTurn: turn,
    lastMoveTurn: turn,
  };

  store.nextSceneSeq += 1;
  store.scenes[scene.id] = scene;
  writeSceneStore(world, store);

  const wireEvents: SceneWireEvent[] = [
    { kind: 'scene-opened', sceneId: scene.id, participantIds: scene.participantIds, openedBy },
  ];
  if (scene.floorHolderId !== null) {
    wireEvents.push({ kind: 'floor-change', sceneId: scene.id, holderId: scene.floorHolderId });
  }
  return { scene, wireEvents };
}

/**
 * Close a scene (ADR-320 D4/D6): removes it from the store and folds it
 * into conversation memory — every ordered participant pair records a
 * completed visit and the close turn (the access ignores unmodeled
 * holders; no model, no change).
 *
 * @param world - The live world
 * @param sceneId - The scene to close
 * @param boundary - Which boundary closed it (`exit` or `silence`)
 * @param memory - The per-pair memory home
 * @param partingLine - The parting-line deliverer (D10a); absent = parks render nothing
 * @returns The thread-parked, thread-parting and scene-closed wire events, or none when the id is not live
 */
/**
 * The parting-line deliverer (ADR-320 D10a, 2026-09-02): the registrar's
 * runner executes a parked thread's authored `on parting` body and hands
 * back the spoken line, or undefined when none is authored. Bound by the
 * loader; absent in builder-authored stories.
 */
export type PartingLine = (
  ownerId: string,
  partnerId: string,
  threadKey: string,
) => { messageId: string; params: Record<string, unknown> } | undefined;

export function closeScene(
  world: WorldModel,
  sceneId: string,
  boundary: SceneBoundaryKind,
  memory: ConversationMemoryAccess,
  partingLine?: PartingLine,
): SceneWireEvent[] {
  const store = readSceneStore(world);
  const scene = store.scenes[sceneId];
  if (!scene) return [];

  delete store.scenes[sceneId];
  writeSceneStore(world, store);

  const closedTurn = dialogueTurn(world);
  for (const holderId of scene.participantIds) {
    for (const partnerId of scene.participantIds) {
      if (holderId !== partnerId) {
        recordSceneClosed(memory, holderId, partnerId, closedTurn);
      }
    }
  }

  // A close never resets a thread — it parks it, cursor held, so the
  // next engagement resumes via `on resuming` (ADR-320 D14 persistence).
  const threadWire = parkActiveThreadsOnClose(world, sceneId, scene.participantIds);

  // ADR-320 D10a (2026-09-02): every park-on-close renders the parked
  // thread's authored `on parting` — interruption, exit, silence alike —
  // as `thread-parting` wire the hosts turn into the prose event. One
  // step for every path; nothing authored, nothing rendered.
  const partingWire: SceneWireEvent[] = [];
  for (const w of threadWire) {
    if (w.kind !== 'thread-parked') continue;
    const line = partingLine?.(w.ownerId, w.partnerId, w.threadKey);
    if (!line) continue;
    partingWire.push({
      kind: 'thread-parting',
      sceneId,
      ownerId: w.ownerId,
      partnerId: w.partnerId,
      threadKey: w.threadKey,
      messageId: line.messageId,
      params: line.params,
    });
  }

  return [...threadWire, ...partingWire, { kind: 'scene-closed', sceneId, boundary }];
}

/**
 * Stamp an on-floor move (utterance, act, or event — one vocabulary):
 * resets the scene's silence clock.
 *
 * @param world - The live world
 * @param sceneId - The scene the move landed in
 */
export function recordSceneMove(world: WorldModel, sceneId: string): void {
  const store = readSceneStore(world);
  const scene = store.scenes[sceneId];
  if (!scene) return;
  scene.lastMoveTurn = dialogueTurn(world);
  writeSceneStore(world, store);
}

/**
 * Stamp a topic move onto the scene's thread (ADR-320 D9; Phase 7 design
 * §6): a topic differing from the live thread abandons it —
 * `subjectChangedTurn` stamps the abandoning turn (the evaluator's
 * `subject-changes` and Phase 8's subject-change occasion read it) and
 * the new topic becomes the thread. The same topic again is not a change.
 *
 * @param world - The live world
 * @param sceneId - The scene the topic move landed in
 * @param topic - The normalized topic of the move
 */
export function noteTopicMove(world: WorldModel, sceneId: string, topic: string): void {
  const store = readSceneStore(world);
  const scene = store.scenes[sceneId];
  if (!scene || scene.currentTopic === topic) return;
  if (scene.currentTopic !== undefined) {
    scene.subjectChangedTurn = dialogueTurn(world);
    scene.abandonedTopic = scene.currentTopic;
  }
  scene.currentTopic = topic;
  writeSceneStore(world, store);
}

/**
 * Stamp — or clear — a scene's active-thread continuability snapshot
 * (ADR-320 D14; the D12 affordance surface). Written HERE because the
 * scene runtime is the store's single writer; callers (the thread
 * dispatch and the thread floor turn, Phase 10.4) compute the record via
 * `threadContinuabilityFor` after each thread mutation. `undefined`
 * clears it — the record disappears when no thread is active, the
 * exchange-affordances never-stale discipline.
 *
 * @param world - The live world
 * @param sceneId - The scene the affordance describes
 * @param continuability - The fresh record, or undefined to clear
 */
export function stampThreadContinuability(
  world: WorldModel,
  sceneId: string,
  continuability: ThreadContinuability | undefined,
): void {
  const store = readSceneStore(world);
  const scene = store.scenes[sceneId];
  if (!scene) return;
  if (continuability === undefined) delete scene.threadContinuability;
  else scene.threadContinuability = continuability;
  writeSceneStore(world, store);
}

/**
 * Apply a selection's scene directives (adr-320 contracts.md §4): the
 * selector stays pure and this runtime performs the lifecycle it asked
 * for. `open-exchange` replaces any open exchange (at most one — a chained
 * `then asks` hands the moment over); `close-scene` folds memory like any
 * close.
 *
 * @param world - The live world
 * @param sceneId - The scene the directives target
 * @param directives - The selection's directives, in order
 * @param memory - The per-pair memory home (for `close-scene`)
 * @param partingLine - The parting-line deliverer for a `close-scene` (D10a)
 * @returns Wire events the directives produced
 */
export function applySceneDirectives(
  world: WorldModel,
  sceneId: string,
  directives: SceneDirective[],
  memory: ConversationMemoryAccess,
  partingLine?: PartingLine,
): SceneWireEvent[] {
  const wireEvents: SceneWireEvent[] = [];

  for (const directive of directives) {
    const store = readSceneStore(world);
    const scene = store.scenes[sceneId];
    if (!scene) break; // a close-scene directive ends the walk

    switch (directive.kind) {
      case 'open-exchange':
        scene.openExchange = directive.exchange;
        scene.lastMoveTurn = dialogueTurn(world);
        writeSceneStore(world, store);
        break;

      case 'close-exchange':
        scene.openExchange = null;
        writeSceneStore(world, store);
        break;

      case 'set-floor':
        scene.floorHolderId = directive.holderId;
        writeSceneStore(world, store);
        wireEvents.push({ kind: 'floor-change', sceneId, holderId: directive.holderId });
        break;

      case 'close-scene':
        wireEvents.push(...closeScene(world, sceneId, directive.boundary, memory, partingLine));
        break;
    }
  }

  return wireEvents;
}

/**
 * Decay unattended scenes (ADR-142's attention decay, wired live): a
 * scene with no on-floor move for `threshold` turns closes on the
 * `silence` boundary. The default threshold is the neutral continuation
 * intent's decay (intent-aware thresholds arrive with dispatch wiring,
 * which knows each scene's holder intent).
 *
 * @param world - The live world
 * @param memory - The per-pair memory home
 * @param threshold - Silent turns before a scene closes
 * @param partingLine - The parting-line deliverer (D10a)
 * @returns The scene-closed wire events, oldest scene first
 */
export function ageScenes(
  world: WorldModel,
  memory: ConversationMemoryAccess,
  threshold: number = DEFAULT_DECAY_THRESHOLDS.neutral,
  partingLine?: PartingLine,
): SceneWireEvent[] {
  const turn = dialogueTurn(world);
  const wireEvents: SceneWireEvent[] = [];
  for (const scene of Object.values(readSceneStore(world).scenes)) {
    if (turn - scene.lastMoveTurn >= threshold) {
      wireEvents.push(...closeScene(world, scene.id, 'silence', memory, partingLine));
    }
  }
  return wireEvents;
}
