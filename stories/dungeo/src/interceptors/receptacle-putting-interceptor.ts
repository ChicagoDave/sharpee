/**
 * Receptacle Putting Interceptor (ADR-118)
 *
 * Handles the balloon inflation mechanic: when a burning object is placed
 * in the receptacle (brazier), the balloon's cloth bag inflates with hot air.
 *
 * This replaces the event handler pattern in balloon-handler.ts.
 * The interceptor hooks into the PUTTING action phases to:
 * - postValidate: Check if item being put is burning, store data
 * - postExecute: Update balloon state if burning item was put
 * - postReport: Add inflation message to output
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  IdentityTrait
} from '@sharpee/world-model';
import { BalloonReceptacleTrait } from '../traits/balloon-receptacle-trait';
import { BalloonStateTrait } from '../traits/balloon-state-trait';
import { BurnableTrait } from '../traits/burnable-trait';
import { InflatableTrait } from '../traits/inflatable-trait';

// Message IDs for receptacle/balloon events
// Note: Uses existing message from DungeoSchedulerMessages
export const ReceptacleMessages = {
  BALLOON_INFLATES: 'dungeo.balloon.inflating',  // Reuse existing message
  PUT_IN_RECEPTACLE: 'dungeo.balloon.put_in_receptacle'
};

// State keys for world state (backward compatibility with daemon)
const BALLOON_BURNING_OBJECT_KEY = 'dungeo.balloon.burningObject';
const BALLOON_INFLATED_KEY = 'dungeo.balloon.inflated';

/**
 * Update the cloth bag state (inflated/deflated)
 */
function updateClothBagState(world: WorldModel, balloonId: string, isInflated: boolean): void {
  // Find cloth bag in balloon
  const contents = world.getContents(balloonId);
  const clothBag = contents.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'cloth bag';
  });

  if (clothBag) {
    const inflatableTrait = clothBag.get(InflatableTrait);
    if (inflatableTrait) {
      inflatableTrait.isInflated = isInflated;
    }
    const identity = clothBag.get(IdentityTrait);
    if (identity) {
      if (isInflated) {
        identity.description = 'The silk bag billows overhead, filled with hot air.';
      } else {
        identity.description = 'The cloth bag is draped over the basket.';
      }
    }
  }
}

/**
 * Receptacle Putting Interceptor
 *
 * Intercepts PUTTING actions targeting the receptacle.
 * Inflates the balloon when a burning object is placed in it.
 */
export const ReceptaclePuttingInterceptor: ActionInterceptor = {
  /**
   * Post-validate: Check if item being put is burning.
   * Store data for postExecute - don't block the action.
   */
  postValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const receptacleTrait = entity.get(BalloonReceptacleTrait);
    if (!receptacleTrait) return null;

    // Get the item being put from shared data (set by putting action)
    const itemId = sharedData.itemId as string | undefined;
    if (!itemId) return null;

    const item = world.getEntity(itemId);
    if (!item) return null;

    // Check if item is burning via BurnableTrait
    const burnable = item.get(BurnableTrait);
    const isBurning = burnable?.isBurning === true;

    // Store for postExecute
    sharedData.receptacleTarget = true;
    sharedData.itemIsBurning = isBurning;
    sharedData.balloonId = receptacleTrait.balloonId;

    return null;
  },

  /**
   * Post-execute: Update balloon state if burning item was put.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    if (!sharedData.receptacleTarget) return;

    const balloonId = sharedData.balloonId as string | undefined;
    if (!balloonId) return;

    const balloon = world.getEntity(balloonId);
    if (!balloon) return;

    const balloonState = balloon.get(BalloonStateTrait);
    if (!balloonState) return;

    const itemId = sharedData.itemId as string | undefined;
    const itemIsBurning = sharedData.itemIsBurning as boolean;

    if (itemIsBurning && itemId) {
      // Track the burning object
      balloonState.burningObject = itemId;
      world.setStateValue(BALLOON_BURNING_OBJECT_KEY, itemId);
      world.setStateValue(BALLOON_INFLATED_KEY, true);

      // Update cloth bag to inflated
      updateClothBagState(world, balloonId, true);

      // Store flag for reporting
      sharedData.balloonJustInflated = true;

      // Set flag for messaging (backward compatibility)
      world.setStateValue('dungeo.balloon.just_inflated', true);
    }
  },

  /**
   * Post-report: Add inflation message to output if balloon inflated.
   */
  postReport(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];

    if (sharedData.balloonJustInflated) {
      effects.push(
        createEffect('game.message', {
          messageId: ReceptacleMessages.BALLOON_INFLATES,
          params: {}
        })
      );
    }

    return effects;
  }
};
