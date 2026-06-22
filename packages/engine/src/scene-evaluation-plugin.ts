/**
 * Scene evaluation turn plugin (ADR-149, ADR-186).
 *
 * Evaluates scene begin/end conditions each turn. Runs after NPC turns
 * and state machines, before daemons/fuses (priority 60).
 *
 * For each registered scene:
 * - If state='waiting' and begin() returns true → activate, emit scene_began,
 *   then invoke the scene's onBegin reaction (ADR-186)
 * - If state='active' and end() returns true → end (or reset if recurring),
 *   emit scene_ended, then invoke the scene's onEnd reaction (ADR-186)
 * - If state='active' → increment activeTurns
 *
 * scene_began / scene_ended are emitted as observable facts (perception,
 * tooling, transcripts). Author-visible reactions come from the typed
 * onBegin/onEnd callbacks, translated here into game.message events — the
 * event the prose pipeline renders — so reactions are visible by construction
 * (ADR-186).
 *
 * Public interface: SceneEvaluationPlugin (TurnPlugin implementation).
 * Owner context: @sharpee/engine — turn cycle
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  SceneTrait,
  TraitType,
  type SceneCallback,
  type SceneEventContext,
  type SceneReaction,
} from '@sharpee/world-model';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

let eventCounter = 0;

/**
 * Creates a minimal ISemanticEvent with the given type and data.
 *
 * The id is made unique by a monotonic counter — no wall-clock is stamped in
 * (deterministic replay, ADR-186). timestamp is left as a 0 sentinel; the
 * engine's turn-event-processor backfills it at the single normalization point
 * (`event.timestamp || Date.now()`).
 */
function sceneEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
  return {
    id: `scene-${++eventCounter}`,
    type,
    timestamp: 0,
    entities: {},
    data,
  };
}

/**
 * Translates the return of a scene reaction callback into game.message events.
 *
 * Invokes the callback under try/catch (parity with the begin/end condition
 * guards): a throwing callback is swallowed and produces no events, the
 * transition having already completed. Normalizes the return (undefined → none,
 * a single reaction → one event) and maps each SceneReaction to a game.message
 * carrying either direct text or a messageId + params.
 */
function reactionEvents(
  callback: SceneCallback | undefined,
  ctx: SceneEventContext,
): ISemanticEvent[] {
  if (!callback) return [];

  let result: SceneReaction[] | SceneReaction | void;
  try {
    result = callback(ctx);
  } catch {
    // Callback threw — transition already happened; emit no reaction events.
    return [];
  }

  if (!result) return [];
  const reactions = Array.isArray(result) ? result : [result];

  return reactions.map((reaction) => {
    if ('text' in reaction) {
      return sceneEvent('game.message', { text: reaction.text });
    }
    return sceneEvent('game.message', {
      messageId: reaction.messageId,
      params: reaction.params,
    });
  });
}

export class SceneEvaluationPlugin implements TurnPlugin {
  id = 'sharpee.scene-evaluation';
  priority = 60;

  /**
   * Evaluates all registered scene conditions after a successful action.
   */
  onAfterAction(context: TurnPluginContext): ISemanticEvent[] {
    const { world, turn } = context;
    const conditions = world.getAllSceneConditions();
    if (conditions.size === 0) return [];

    const events: ISemanticEvent[] = [];

    for (const [sceneId, conds] of conditions) {
      const entity = world.getEntity(sceneId);
      if (!entity) continue;

      const trait = entity.get<SceneTrait>(TraitType.SCENE);
      if (!trait) continue;

      if (trait.state === 'waiting') {
        // Evaluate begin condition
        try {
          if (conds.begin(world)) {
            trait.state = 'active';
            trait.activeTurns = 1;
            trait.beganAtTurn = turn;

            events.push(sceneEvent('if.event.scene_began', {
              sceneId,
              sceneName: trait.name,
              turn,
            }));

            // Author-visible reaction (ADR-186)
            events.push(...reactionEvents(conds.onBegin, {
              world,
              sceneId,
              sceneName: trait.name,
              turn,
            }));
          }
        } catch {
          // Condition threw — leave scene in waiting state
        }
      } else if (trait.state === 'active') {
        // Evaluate end condition
        let ended = false;
        try {
          ended = conds.end(world);
        } catch {
          // Condition threw — don't end the scene
        }

        if (ended) {
          const totalTurns = trait.activeTurns;
          trait.endedAtTurn = turn;

          if (trait.recurring) {
            trait.state = 'waiting';
          } else {
            trait.state = 'ended';
          }
          trait.activeTurns = 0;

          events.push(sceneEvent('if.event.scene_ended', {
            sceneId,
            sceneName: trait.name,
            turn,
            totalTurns,
          }));

          // Author-visible reaction (ADR-186). totalTurns is captured before
          // the activeTurns reset above.
          events.push(...reactionEvents(conds.onEnd, {
            world,
            sceneId,
            sceneName: trait.name,
            turn,
            totalTurns,
          }));
        } else {
          // Scene still active — increment turn counter
          trait.activeTurns++;
        }
      }
      // state === 'ended' and not recurring: skip
    }

    return events;
  }
}
