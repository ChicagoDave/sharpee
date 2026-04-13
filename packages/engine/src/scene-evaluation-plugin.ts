/**
 * Scene evaluation turn plugin (ADR-149).
 *
 * Evaluates scene begin/end conditions each turn. Runs after NPC turns
 * and state machines, before daemons/fuses (priority 60).
 *
 * For each registered scene:
 * - If state='waiting' and begin() returns true → activate, emit scene_began
 * - If state='active' and end() returns true → end (or reset if recurring), emit scene_ended
 * - If state='active' → increment activeTurns
 *
 * Public interface: SceneEvaluationPlugin (TurnPlugin implementation).
 * Owner context: @sharpee/engine — turn cycle
 */

import { ISemanticEvent } from '@sharpee/core';
import { SceneTrait, TraitType } from '@sharpee/world-model';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

let eventCounter = 0;

/**
 * Creates a minimal ISemanticEvent with the given type and data.
 */
function sceneEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
  return {
    id: `scene-${++eventCounter}-${Date.now()}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
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
