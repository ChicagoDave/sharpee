/**
 * Shared helpers for the conversation actions' dialogue dispatch
 * (ADR-310 D15; ADR-320 D4/D8/D16; adr-320 contracts.md §4 and the
 * Phase 6 design, docs/work/adr-320-conversation/phase6-dispatch-design.md).
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
 * Public interface: consultDialogueSelector, exchangeGrips,
 *   runConversationScene, isExchangeGripped, markExchangeGripped.
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

/** The sharedData slot marking a firing as exchange-gripped (D16). */
interface GripSharedData {
  exchangeGripped?: boolean;
}

/** Whether this firing was marked exchange-gripped during validation. */
export function isExchangeGripped(context: ActionContext): boolean {
  return (context.sharedData as GripSharedData).exchangeGripped === true;
}

/** Mark this firing exchange-gripped (validation-time, probe-confirmed). */
export function markExchangeGripped(context: ActionContext): void {
  (context.sharedData as GripSharedData).exchangeGripped = true;
}

/** The selection context, scene included (adr-320 contracts.md §4). */
function selectionContext(context: ActionContext, target: IFEntity): DialogueSelectionContext {
  const scene = sceneWith(context.world, target.id);
  return {
    world: context.world,
    speakerId: context.player.id,
    ...(scene ? { scene } : {}),
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
    // joining/intruding on a foreign scene is the Phase 8 interruption path).
    if (sceneWith(context.world, context.player.id)) return [];
    const opened = runtime.openScene(
      [context.player.id, target.id],
      { kind: 'address', openerId: context.player.id },
    );
    scene = opened.scene;
    events.push(...opened.wireEvents.map((w) => toSceneEvent(context, w)));
  } else {
    runtime.recordMove(scene.id);
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
