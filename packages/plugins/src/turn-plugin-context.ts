import { EntityId, SeededRandom, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

export interface TurnPluginActionResult {
  actionId: string;
  success: boolean;
  targetId?: EntityId;
  sharedData?: Record<string, unknown>;
}

export interface TurnPluginContext {
  world: WorldModel;
  turn: number;
  playerId: EntityId;
  playerLocation: EntityId;
  random: SeededRandom;
  actionResult?: TurnPluginActionResult;
  actionEvents?: ISemanticEvent[];
}
