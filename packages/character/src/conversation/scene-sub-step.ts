/**
 * The scenes sub-step: world acts break live scenes, authored occasions
 * seize their moments, goal says and propagation transfers open and continue
 * scenes, thread floor turns are served after every challenge resolves, a
 * participant who moved away closes on exit, and unattended scenes decay on
 * silence. Observable text rides the sound pipeline only; every mutation
 * lands regardless.
 *
 * Public interface: runSceneSubStep.
 * Owner context: @sharpee/character — conversation.
 *
 * References:
 *   ADR-320 D7/D8/D10/D10a/D14 — occasions, interruptions, scenes as propagation made visible, threads.
 *   ADR-172 — conversation sound through spatial propagation.
 *   GH #349, #354 — leave on the speaker's turn; challenges before floor turns.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { VolumeTier } from '@sharpee/if-domain';
import {
  type IFEntity,
  TraitType,
  type CharacterModelTrait,
  type SceneWireEvent,
  type ConversationSceneState,
  type SceneOccasion,
  type InitiativeSeizure,
} from '@sharpee/world-model';
import type { PropagationColoring } from '../propagation/propagation-types.js';
import { dialogueTurn } from '../character-clock.js';
import { markConversationTurn } from './conversation-marker.js';
import { readSceneStore, sceneWith } from './scene-store.js';
import {
  openScene,
  recordSceneMove,
  noteTopicMove,
  applySceneDirectives,
  ageScenes,
} from './scene-runtime.js';
import { createTraitMemoryAccess } from './scene-binding.js';
import { recordTopicDiscussed } from './conversation-memory.js';
import { DEFAULT_DECAY_THRESHOLDS } from './lifecycle.js';
import { type TickContext, type SceneTickSurface, createEvent } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Scenes sub-step (ADR-320 D10; Phase 8 — NPC↔NPC scenes as propagation
// made visible, one machinery with two faces)
// ---------------------------------------------------------------------------

/** The runtime-owned coloring→volume curve (Phase 8 design §3a). */
function volumeFromColoring(coloring?: PropagationColoring): VolumeTier {
  if (coloring === 'conspiratorial' || coloring === 'fearful') return 'whisper';
  if (coloring === 'dramatic') return 'raised';
  return 'normal';
}

/** The authored coloring of a speaker's profile, when any. */
function coloringOf(registry: CharacterPhaseRegistry, npcId: string): PropagationColoring | undefined {
  return registry.getConfig(npcId)?.propagationProfile?.coloring;
}

/**
 * Drive NPC↔NPC scene lifecycle for one turn (ADR-320 D10; Phase 8):
 * world acts break live scenes (D8's exemption), authored occasions
 * seize their moments (D7), goal `say` completions and propagation
 * transfers open and continue scenes, a participant moved away closes on
 * `exit`, and unattended scenes decay on `silence`. Observable text
 * rides the sound pipeline only (§3a); every mutation lands regardless.
 */
export function runSceneSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const { world } = ctx;
  const runtime = world.getSceneRuntime();
  if (!runtime) return [];

  // All scene clock reads go through the seam (D6): scene stamps are on
  // the dialogue-turn scale (mirror + 1), never raw ctx.turn.
  const clockTurn = dialogueTurn(world);
  const memory = createTraitMemoryAccess(world);
  const events: ISemanticEvent[] = [];

  const pushWire = (wire: SceneWireEvent[]): void => {
    for (const w of wire) {
      events.push(createEvent(`character.scene.${w.kind}`, { ...w }));
      // ADR-320 D10a: a parked thread's `on parting` line is wire data
      // like every scene move (never rendered as `character.scene.*`);
      // the prose event is this one, the same the dispatch path emits.
      if (w.kind === 'thread-parting') {
        events.push(
          createEvent('character.thread.parting', {
            sceneId: w.sceneId,
            ownerId: w.ownerId,
            partnerId: w.partnerId,
            threadKey: w.threadKey,
            messageId: w.messageId,
            params: w.params,
          }),
        );
      }
    }
  };

  /**
   * Stamp one on-floor move: the silence clock, the D16 marker on every
   * modeled participant (partner = the speaker; the speaker's partner is
   * the addressee or the first other seat), and — when a line was spoken —
   * the utterance wire event plus the conversation sound (§3a).
   */
  const speak = (
    sceneId: string,
    speakerId: string,
    addresseeId: string | undefined,
    messageId: string | undefined,
    coloring: PropagationColoring | undefined,
    params?: Record<string, unknown>,
  ): void => {
    recordSceneMove(world, sceneId);
    const scene = readSceneStore(world).scenes[sceneId];
    if (scene) {
      for (const pid of scene.participantIds) {
        const trait = world.getEntity(pid)?.get(TraitType.CHARACTER_MODEL) as
          | CharacterModelTrait
          | undefined;
        if (!trait) continue;
        const partner =
          pid === speakerId
            ? (addresseeId ?? scene.participantIds.find((o) => o !== pid) ?? pid)
            : speakerId;
        markConversationTurn(trait, partner, clockTurn);
      }
    }
    if (messageId) {
      pushWire([
        {
          kind: 'utterance',
          sceneId,
          speakerId,
          ...(addresseeId !== undefined ? { addresseeId } : {}),
          messageId,
          beats: [],
        },
      ]);
      // Kind `speech` — the shipped ADR-172 content-bearing family:
      // full/muffled embed the line, fragments/presence degrade it, and
      // lang-en-us already carries the per-tier defaults (untouched).
      ctx.emitSound?.({
        sourceLocation: world.getLocation(speakerId) ?? '',
        sourceEntity: speakerId,
        kind: 'speech',
        volumeTier: volumeFromColoring(coloring),
        content: { messageId, ...(params ? { params } : {}) },
      });
    }
  };

  /**
   * The live scene a pair's move lands in: their co-seated scene, or a
   * fresh one when both are unseated (opened by the initiator). A party
   * seated elsewhere gets no scene bookkeeping — the one-live-scene
   * invariant (state may have shifted since the wrappable check).
   */
  const ensureScene = (
    openerId: string,
    otherId: string,
  ): ConversationSceneState | undefined => {
    const so = sceneWith(world, openerId);
    const st = sceneWith(world, otherId);
    if (so && st && so.id === st.id) return so;
    if (so || st) return undefined;
    const opened = openScene(world, {
      participantIds: [openerId, otherId],
      openedBy: { kind: 'initiative', openerId },
    });
    pushWire(opened.wireEvents);
    return opened.scene;
  };

  /**
   * Open a seizure's `then asks` exchange (#273; ADR-320 Phase 10.3):
   * only against a scene that includes the player — an exchange targets
   * the player, so an NPC↔NPC seizure drops the open silently (the row's
   * phrase already spoke; the same occasion stays servable in player
   * scenes, where the open is meaningful). Never a throw, never a wedge.
   */
  const applySeizedExchange = (scene: ConversationSceneState, seizure: InitiativeSeizure): void => {
    // GH #349: a `leave` served on the speaker's own turn closes the scene
    // — the floor-turn counterpart of the dispatch path's `leave`. The
    // leaver is the participant who is not the player; in an NPC↔NPC
    // scene, the first participant.
    if (seizure.leaves) {
      const leaverId = scene.participantIds.find((p) => p !== ctx.playerId) ?? scene.participantIds[0];
      pushWire(applySceneDirectives(world, scene.id, [{ kind: 'close-scene', boundary: 'exit', leaverId }], memory));
      return;
    }
    if (!seizure.openExchange || !scene.participantIds.includes(ctx.playerId)) return;
    pushWire(
      applySceneDirectives(
        world,
        scene.id,
        [{ kind: 'open-exchange', exchange: seizure.openExchange }],
        memory,
      ),
    );
    events.push(
      createEvent('character.exchange.opened', {
        exchangeId: seizure.openExchange.exchangeId,
        word: seizure.openWord,
      }),
    );
  };

  // 1) World acts break live scenes in their room — any grip, `blocking`
  // included (D8's exemption). Resolved and applied through the binding
  // so the interruption wire and memory folds match the dispatch path.
  for (const act of surface.acts) {
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      const inRoom = scene.participantIds.some((p) => world.getLocation(p) === act.roomId);
      if (!inRoom) continue;
      pushWire(runtime.resolveIntrusion(scene.id, act.actorId, true).wireEvents);
    }
  }

  // 2) Witnessed-event occasions (D7): the first co-located modeled NPC
  // (id order — deterministic) whose authored row forces the moment
  // seizes it; disposition alone never seizes a content-bearing occasion
  // (design §3.6). The seizure addresses the act's actor — the PC
  // included: this is the NPC-initiates-with-the-player surface.
  if (runtime.seizeInitiative) {
    for (const act of surface.acts) {
      const candidates = npcs
        .filter(
          (n) =>
            n.id !== act.actorId &&
            n.has(TraitType.CHARACTER_MODEL) &&
            world.getLocation(n.id) === act.roomId,
        )
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const npc of candidates) {
        const seizure = runtime.seizeInitiative(
          npc.id,
          { kind: 'witnessed-event', eventId: act.eventId },
          act.action,
          act.actorId,
        );
        if (!seizure) continue;
        events.push(...seizure.events);
        const scene = ensureScene(npc.id, act.actorId);
        if (scene && seizure.spokenMessageId) {
          speak(scene.id, npc.id, act.actorId, seizure.spokenMessageId, coloringOf(registry, npc.id), seizure.spokenParams);
        }
        if (scene) applySeizedExchange(scene, seizure);
        break; // one seizure per act — the moment is taken
      }
    }
  }

  // 3) Goal `say` completions open (or continue) a scene with the
  // addressed partner — the "seek out, then speak" driver (seek-out is
  // shipped); the say line is the opening move.
  for (const say of surface.says) {
    const scene = ensureScene(say.npcId, say.targetId);
    if (!scene) continue;
    speak(scene.id, say.npcId, say.targetId, say.messageId, coloringOf(registry, say.npcId));
  }

  // 4) Applied transfers are the scene's moves (D10 — one machinery):
  // thread and floor bookkeeping, discussed-pair recording on both
  // sides, and the observable line through the sound path only.
  for (const t of surface.transfers) {
    const scene = ensureScene(t.speakerId, t.listenerId);
    if (!scene) continue;
    noteTopicMove(world, scene.id, t.topic);
    const live = readSceneStore(world).scenes[scene.id];
    if (live && live.floorHolderId !== t.speakerId) {
      pushWire(
        applySceneDirectives(world, scene.id, [{ kind: 'set-floor', holderId: t.speakerId }], memory),
      );
    }
    recordTopicDiscussed(memory, t.speakerId, t.listenerId, t.topic);
    recordTopicDiscussed(memory, t.listenerId, t.speakerId, t.topic);
    speak(scene.id, t.speakerId, t.listenerId, t.soundMessageId, t.coloring, t.soundParams);
  }

  // 4a) Thread floor turns (ADR-320 D14; Phase 10.4): a modeled NPC with
  // a ready thread move toward the co-located player takes the floor —
  // the owner's-own-turn half of D14's advance clause (the dispatch path
  // is the other half). An `opens when` thread opens the scene itself;
  // the pure probe runs first so no scene is minted for nothing. Threads
  // are owner↔player only (D14 v1), so only pairs with the player are
  // consulted; an open exchange holds the thread (a `then asks` beat
  // waits for its exchange to close).
  if (runtime.threadTurn && runtime.threadTurnReady) {
    const candidates = npcs
      .filter(
        (n) =>
          n.has(TraitType.CHARACTER_MODEL) &&
          world.getLocation(n.id) === world.getLocation(ctx.playerId),
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    // Two passes (GH #354, ruled 2026-09-03): every challenge resolves
    // before any floor turn is served, so which partner speaks on a
    // hand-off turn follows the story's `opens when`, never entity-id
    // order. A seated owner whose beat is ready is not served first and
    // then parked by a later-sorted candidate's challenge.
    //
    // Pass one — ADR-320 D10a (2026-09-02): an authored `opens when` is an
    // interjection. When the player is seated in a scene this NPC is not
    // part of, that scene's grip answers — thread-aware, so a `blocking`
    // thread holds (D14) — through the same call the world-act and
    // player-address paths make. `yields`/`protests` close it (its
    // threads park and their `on parting` renders); `blocks` skips this
    // candidate for the turn — no throw, no wedge, tried again next turn.
    const blockedThisTurn = new Set<string>();
    for (const npc of candidates) {
      if (!runtime.threadTurnReady(npc.id, ctx.playerId)) continue;
      const foreign = sceneWith(world, ctx.playerId);
      if (!foreign || foreign.participantIds.includes(npc.id)) continue;
      const challenge = runtime.resolveIntrusion(foreign.id, npc.id, false);
      pushWire(challenge.wireEvents);
      if (challenge.outcome === 'blocks') blockedThisTurn.add(npc.id);
    }
    // Pass two — floor turns for whoever still holds the floor. Readiness
    // is re-probed: a partner parked in pass one reads not-ready here
    // because a parked thread re-engages only when its `opens when` holds
    // again (readyThreadMove), and the hand has already passed.
    for (const npc of candidates) {
      if (blockedThisTurn.has(npc.id)) continue;
      if (!runtime.threadTurnReady(npc.id, ctx.playerId)) continue;
      const scene = ensureScene(npc.id, ctx.playerId);
      if (!scene || scene.openExchange) continue;
      const turn = runtime.threadTurn(npc.id, ctx.playerId, scene.id);
      if (!turn) continue;
      events.push(...turn.events);
      if (turn.spokenMessageId) {
        speak(scene.id, npc.id, ctx.playerId, turn.spokenMessageId, coloringOf(registry, npc.id), turn.spokenParams);
      }
      applySeizedExchange(scene, turn);
    }
  }

  // 5) Subject-change occasions (D9's third exposure): a thread abandoned
  // this turn is a moment a disposition can seize — authored rows only,
  // first modeled participant in id order.
  if (runtime.seizeInitiative) {
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      if (scene.subjectChangedTurn !== clockTurn) continue;
      seizeSceneOccasion(scene, {
        kind: 'subject-change',
        sceneId: scene.id,
        abandonedTopicId: scene.abandonedTopic ?? '',
      });
    }

    // 6) Silence occasions: one turn before decay would close the scene,
    // an authored row may keep it alive — the seizure is a move.
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      if (clockTurn - scene.lastMoveTurn !== DEFAULT_DECAY_THRESHOLDS.neutral - 1) continue;
      seizeSceneOccasion(scene, { kind: 'silence', sceneId: scene.id });
    }
  }

  function seizeSceneOccasion(scene: ConversationSceneState, occasion: SceneOccasion): void {
    for (const pid of [...scene.participantIds].sort()) {
      if (!world.getEntity(pid)?.has(TraitType.CHARACTER_MODEL)) continue;
      const seizure = runtime!.seizeInitiative!(pid, occasion);
      if (!seizure) continue;
      events.push(...seizure.events);
      if (seizure.spokenMessageId) {
        speak(scene.id, pid, undefined, seizure.spokenMessageId, coloringOf(registry, pid), seizure.spokenParams);
      }
      applySeizedExchange(scene, seizure);
      break;
    }
  }

  // 7) A participant whose goal moved it away this turn closes the scene
  // on `exit` — legality held by construction (the world accepted the
  // move in the goal sub-step).
  for (const scene of Object.values(readSceneStore(world).scenes)) {
    const mover = [...scene.participantIds].filter((p) => surface.movedNpcIds.has(p)).sort()[0];
    if (!mover) continue;
    const rooms = new Set(scene.participantIds.map((p) => world.getLocation(p)));
    if (rooms.size <= 1) continue;
    pushWire(
      applySceneDirectives(world, scene.id, [{ kind: 'close-scene', boundary: 'exit', leaverId: mover }], memory),
    );
  }

  // 8) Unattended scenes decay into a `silence` close (Phase 5's
  // machinery, wired to its runtime caller here).
  pushWire(
    ageScenes(
      world,
      memory,
      undefined,
      runtime.partingLine ? (o, p, k) => runtime.partingLine!(o, p, k) : undefined,
    ),
  );

  return events;
}
