/**
 * Shared helpers for the conversation actions' dialogue dispatch
 * (ADR-310 D15; ADR-320 D4/D8/D16; adr-320 contracts.md §4 and the
 * Phase 6 design, docs/work/archive/adr-320-conversation/phase6-dispatch-design.md).
 *
 * ASK/TELL/SAY/TALK TO consult the registered selection surface when the
 * addressed NPC carries a `CharacterModelTrait`; an unhandled or absent
 * selection falls through to the action's default (ADR-310 D7: no model,
 * no change). Two ADR-320 extensions ride the same call sites:
 *
 * - The PURE exchange probe (D16): when the NPC's open exchange claims
 *   the input, the firing is exchange-gripped — the innermost active
 *   context wins outright, so the actions skip the remaining interceptor
 *   phases (the topic table's dispatch path) for that firing.
 * - Scene lifecycle (D4): a conversational address to a modeled NPC
 *   opens a scene through the world's registered scene runtime, every
 *   firing stamps the move clock, and a handled selection's directives
 *   are applied — with `leave` checked against real exit legality (D8)
 *   before the scene may close on an `exit` boundary.
 *
 * - PC intrusion (D10, Phase 8): addressing an NPC seated in a scene the
 *   player is NOT part of challenges that scene's grip first — `yields`/
 *   `protests` close it (the address then proceeds normally), `blocks`
 *   refuses the consult and the action's default response stands.
 *
 * - Continuation prompts (D14, Phase 10.5): a targetless talking firing
 *   ("tell me more" / "continue" / "go on" / "and?") resolves its
 *   conversation partner implicitly through the same pure thread probe —
 *   `resolveImplicitThreadPartner` names the co-located NPC whose thread
 *   claims a `talk-to` intent; none claiming leaves the action's default
 *   no-target path standing.
 *
 * Public interface: consultDialogueSelector, exchangeGrips, threadGrips,
 *   resolveImplicitThreadPartner, runConversationScene,
 *   resolveSceneIntrusion, isExchangeGripped, markExchangeGripped,
 *   isThreadGripped, markThreadGripped.
 * Owner context: stdlib / actions / helpers
 */

import { type ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  TraitType,
  sceneWith,
  type ConversationIntent,
  type DialogueSelectionContext,
  type DialogueSelectionResult,
  type SceneDirective,
  type SceneWireEvent,
} from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types.js';
import { hasTraversableExit } from './exit-legality.js';

/** The sharedData slots marking a firing as gripped (D16/D14). */
interface GripSharedData {
  exchangeGripped?: boolean;
  threadGripped?: boolean;
}

/** Whether this firing was marked exchange-gripped during validation. */
export function isExchangeGripped(context: ActionContext): boolean {
  return (context.sharedData as GripSharedData).exchangeGripped === true;
}

/** Mark this firing exchange-gripped (validation-time, probe-confirmed). */
export function markExchangeGripped(context: ActionContext): void {
  (context.sharedData as GripSharedData).exchangeGripped = true;
}

/** Whether this firing was marked thread-gripped during validation (D14). */
export function isThreadGripped(context: ActionContext): boolean {
  return (context.sharedData as GripSharedData).threadGripped === true;
}

/** Mark this firing thread-gripped (validation-time, probe-confirmed). */
export function markThreadGripped(context: ActionContext): void {
  (context.sharedData as GripSharedData).threadGripped = true;
}

/**
 * The selection context, scene included (adr-320 contracts.md §4). A
 * scene the player is NOT part of never rides the context (Phase 8):
 * a foreign exchange must not grip the player's firing — intrusion into
 * a foreign scene is `resolveSceneIntrusion`'s job, not the selector's.
 */
function selectionContext(context: ActionContext, target: IFEntity): DialogueSelectionContext {
  const scene = sceneWith(context.world, target.id);
  const shared = scene?.participantIds.includes(context.actor.id) ? scene : undefined;
  return {
    world: context.world,
    speakerId: context.actor.id,
    ...(shared ? { scene: shared } : {}),
  };
}

/**
 * The PURE exchange probe (ADR-320 D16): does the addressed NPC's open
 * exchange claim this input? Consulted during validation — it must not
 * mutate (only `select` runs in the mutating report phase). True exactly
 * when the NPC is modeled, in a scene with an open exchange, and the
 * registered probe claims the input.
 *
 * @param context - The action context (provides world and player)
 * @param target - The addressed NPC
 * @param intent - What the player is conversationally doing
 * @returns True when the firing is exchange-gripped
 */
export function exchangeGrips(
  context: ActionContext,
  target: IFEntity,
  intent: ConversationIntent,
): boolean {
  if (!target.has(TraitType.CHARACTER_MODEL)) return false;
  const registration = context.world.getDialogueSelector();
  if (!registration?.exchangeClaims) return false;

  const ctx = selectionContext(context, target);
  if (!ctx.scene?.openExchange) return false;
  return registration.exchangeClaims(target, intent, ctx);
}

/**
 * The PURE thread probe (ADR-320 D14): does a conversation thread claim
 * this input? Consulted during validation AFTER the exchange probe (the
 * precedence: open exchange > active thread > parked-thread resume >
 * topic table) — a thread-gripped firing skips the interceptor phases
 * exactly as an exchange-gripped one does, so no table bookkeeping runs
 * for an input the thread will serve (an on-filter advance, a blocking
 * refusal, an assertive protest, a resume, or an activation).
 *
 * @param context - The action context (provides world and player)
 * @param target - The addressed NPC
 * @param intent - What the player is conversationally doing
 * @returns True when the firing is thread-gripped
 */
export function threadGrips(
  context: ActionContext,
  target: IFEntity,
  intent: ConversationIntent,
): boolean {
  if (!target.has(TraitType.CHARACTER_MODEL)) return false;
  const registration = context.world.getDialogueSelector();
  if (!registration?.threadClaims) return false;

  const ctx = selectionContext(context, target);
  // The exchange stays innermost: an open exchange claiming the input is
  // exchange-gripped, never thread-gripped (D14's precedence table).
  if (ctx.scene?.openExchange && registration.exchangeClaims?.(target, intent, ctx)) return false;
  return registration.threadClaims(target, intent, ctx);
}

/**
 * Resolve the implicit conversation partner for a targetless continuation
 * prompt (ADR-320 D14 frozen list: "tell me more" / "continue" / "go on" /
 * "and?"). The partner is the co-located actor whose conversation thread
 * claims a `talk-to` intent through the PURE thread probe — true exactly
 * when the pair's active thread has a ready beat, so a held beat or an
 * absent thread resolves nothing and the caller's default no-target path
 * stands. The scan is deterministic (containment order, first claimant
 * wins) — in practice at most one NPC can claim: a player holds at most
 * one live scene, and a second pair's activation is refused while the
 * player is seated in another pair's scene, so two simultaneous
 * claimants would require a multi-party scene with two active
 * player-pair threads, which no current path produces.
 *
 * @param context - The action context (provides world and player)
 * @returns The implicit partner, or `undefined` when no thread claims one
 */
export function resolveImplicitThreadPartner(context: ActionContext): IFEntity | undefined {
  const location = context.world.getLocation(context.actor.id);
  if (!location) return undefined;
  for (const entity of context.world.getContents(location)) {
    if (entity.id === context.actor.id || !entity.has(TraitType.ACTOR)) continue;
    if (threadGrips(context, entity, { type: 'talk-to' })) return entity;
  }
  return undefined;
}

/**
 * Consult the world's dialogue selector for a conversation act.
 *
 * @param context - The action context (provides world and player)
 * @param target - The addressed NPC
 * @param intent - What the player is conversationally doing
 * @returns A handled selection, or `undefined` to use the action's default
 */
export function consultDialogueSelector(
  context: ActionContext,
  target: IFEntity,
  intent: ConversationIntent,
): DialogueSelectionResult | undefined {
  // D7: no model, no change — unmodeled NPCs never reach the selector.
  if (!target.has(TraitType.CHARACTER_MODEL)) return undefined;

  const registration = context.world.getDialogueSelector();
  if (!registration) return undefined;

  const selection = registration.select(target, intent, selectionContext(context, target));
  return selection?.handled ? selection : undefined;
}

/** A wire event as a semantic event (`character.scene.<kind>`, Phase 9's feed). */
function toSceneEvent(context: ActionContext, wire: SceneWireEvent): ISemanticEvent {
  return context.event(`character.scene.${wire.kind}`, { ...wire });
}

/**
 * Resolve the PC's intrusion into a foreign scene (ADR-320 D10; Phase 8):
 * when the addressed NPC is seated in a scene the player is not part of,
 * the scene's grip answers through the registered runtime — `yields` and
 * `protests` close it (the interruption wire carries the protest for
 * rendering and authored reactions), `blocks` refuses: the caller skips
 * the selector consult and the action's default response stands, with
 * `character.scene.intrusion_blocked` on the author channel.
 *
 * @param context - The action context
 * @param target - The addressed NPC
 * @returns Whether the address is blocked, plus the challenge's events
 */
export function resolveSceneIntrusion(
  context: ActionContext,
  target: IFEntity,
): { blocks: boolean; events: ISemanticEvent[] } {
  const runtime = context.world.getSceneRuntime();
  if (!runtime || !target.has(TraitType.CHARACTER_MODEL)) {
    return { blocks: false, events: [] };
  }
  const scene = sceneWith(context.world, target.id);
  if (!scene || scene.participantIds.includes(context.actor.id)) {
    return { blocks: false, events: [] };
  }

  const { outcome, wireEvents } = runtime.resolveIntrusion(scene.id, context.actor.id, false);
  const events = wireEvents.map((w) => toSceneEvent(context, w));
  if (outcome === 'blocks') {
    events.push(context.event('character.scene.intrusion_blocked', {
      sceneId: scene.id,
      interrupterId: context.actor.id,
    }));
    return { blocks: true, events };
  }
  return { blocks: false, events };
}

/**
 * Drive scene lifecycle for one conversational firing (ADR-320 D4/D8):
 * opens a scene on first address, stamps the move clock, and applies the
 * selection's directives through the world's registered scene runtime —
 * with `close-scene`/`exit` checked against real exit legality first
 * (D8: leaving is movement and obeys the world; an illegal exit leaves
 * the scene live and surfaces as an author-channel refusal event).
 *
 * No registered runtime or unmodeled target: no scenes, no change.
 *
 * @param context - The action context
 * @param target - The addressed NPC
 * @param selection - The handled selection, if any (its directives and
 *   wire events are processed)
 * @returns Semantic events for everything that happened, in order
 */
export function runConversationScene(
  context: ActionContext,
  target: IFEntity,
  selection: DialogueSelectionResult | undefined,
): ISemanticEvent[] {
  const runtime = context.world.getSceneRuntime();
  if (!runtime || !target.has(TraitType.CHARACTER_MODEL)) return [];

  const events: ISemanticEvent[] = [];
  let scene = sceneWith(context.world, target.id);

  if (!scene) {
    // First conversational contact opens the scene — only when neither
    // side is already seated (a participant is in at most one live scene;
    // intruding on a foreign scene resolved via `resolveSceneIntrusion`
    // before this runs).
    if (sceneWith(context.world, context.actor.id)) return [];
    const opened = runtime.openScene(
      [context.actor.id, target.id],
      { kind: 'address', openerId: context.actor.id },
    );
    scene = opened.scene;
    events.push(...opened.wireEvents.map((w) => toSceneEvent(context, w)));
  } else if (scene.participantIds.includes(context.actor.id)) {
    // The move clock stamps only for the actor's own scene — a foreign
    // scene's clock is not the actor's to reset (Phase 8 fix; the actor is
    // whoever is speaking, player or NPC, per ADR-328 D2).
    runtime.recordMove(scene.id);
  } else {
    // Foreign scene still live (a `blocks` outcome upstream): no scene
    // bookkeeping for this firing.
    return events;
  }

  for (const wire of selection?.wireEvents ?? []) {
    events.push(toSceneEvent(context, wire));
  }

  const directives = selection?.sceneDirectives ?? [];
  if (directives.length > 0) {
    const kept: SceneDirective[] = [];
    for (const directive of directives) {
      if (directive.kind === 'close-scene' && directive.boundary === 'exit' && directive.leaverId) {
        const room = context.world.getContainingRoom(directive.leaverId)?.id
          ?? context.world.getLocation(directive.leaverId);
        if (!room || !hasTraversableExit(context.world, room)) {
          // D8: the world refuses the exit — the scene stays live; the
          // selection's rendered response (typically a rendered silence)
          // stands. Author-channel visibility only.
          events.push(context.event('character.scene.exit_refused', {
            sceneId: scene.id,
            leaverId: directive.leaverId,
          }));
          continue;
        }
      }
      kept.push(directive);
    }
    events.push(...runtime.applyDirectives(scene.id, kept).map((w) => toSceneEvent(context, w)));
  }

  return events;
}
