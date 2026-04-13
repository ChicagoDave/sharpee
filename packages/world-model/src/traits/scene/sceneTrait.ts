/**
 * Scene trait for temporal story phases (ADR-149).
 *
 * Entities with this trait represent named dramatic episodes with
 * begin/end conditions evaluated each turn by the engine. Multiple
 * scenes can be active simultaneously. Scenes can be recurring.
 *
 * Condition closures are NOT serializable. On save/restore, trait
 * data (state, activeTurns, etc.) persists, but stories must
 * re-register conditions after restore.
 *
 * Public interface: SceneTrait, ISceneData, SceneState.
 * Owner context: @sharpee/world-model — traits / temporal
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/** Possible states for a scene lifecycle. */
export type SceneState = 'waiting' | 'active' | 'ended';

/**
 * Data interface for SceneTrait construction.
 *
 * @param name - Human-readable scene name (required).
 * @param state - Initial state. Defaults to 'waiting'.
 * @param recurring - Whether the scene can re-activate after ending.
 * @param activeTurns - Turns the scene has been active. Defaults to 0.
 * @param beganAtTurn - Turn number when the scene last began.
 * @param endedAtTurn - Turn number when the scene last ended.
 */
export interface ISceneData {
  name: string;
  state?: SceneState;
  recurring?: boolean;
  activeTurns?: number;
  beganAtTurn?: number;
  endedAtTurn?: number;
}

/**
 * Marks an entity as a temporal scene — a dramatic episode with
 * begin/end conditions polled each turn by the engine.
 */
export class SceneTrait implements ITrait, ISceneData {
  static readonly type = TraitType.SCENE;
  readonly type = TraitType.SCENE;

  /** Human-readable scene name. */
  name: string;

  /** Current lifecycle state. */
  state: SceneState;

  /** Whether the scene can activate more than once. */
  recurring: boolean;

  /** Number of turns the scene has been active (0 if not active). */
  activeTurns: number;

  /** Turn number when the scene last began. */
  beganAtTurn?: number;

  /** Turn number when the scene last ended. */
  endedAtTurn?: number;

  constructor(data: ISceneData) {
    this.name = data.name;
    this.state = data.state ?? 'waiting';
    this.recurring = data.recurring ?? false;
    this.activeTurns = data.activeTurns ?? 0;
    this.beganAtTurn = data.beganAtTurn;
    this.endedAtTurn = data.endedAtTurn;
  }
}
