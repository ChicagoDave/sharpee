/**
 * Trophy Case Putting Interceptor (ADR-129)
 *
 * Awards trophy case points when a treasure is placed in the trophy case.
 * Uses postExecute to call world.awardScore() after the item has been moved.
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  IFEntity,
  WorldModel,
  IdentityTrait
} from '@sharpee/world-model';
import { TreasureTrait } from '../traits/treasure-trait';

export const TrophyCasePuttingInterceptor: ActionInterceptor = {
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const itemId = sharedData.itemId as string;
    if (!itemId) return;

    const item = world.getEntity(itemId);
    if (!item) return;

    const treasure = item.get(TreasureTrait);
    if (!treasure?.trophyCaseValue) return;

    const identity = item.get(IdentityTrait);
    const description = treasure.trophyCaseDescription
      ?? `Placed the ${identity?.name ?? 'treasure'} in the trophy case`;

    world.awardScore(`trophy:${itemId}`, treasure.trophyCaseValue, description);
  }
};
