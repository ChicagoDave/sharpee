/**
 * Inflatable Entering Interceptor (ADR-118)
 *
 * Handles the boat puncture mechanic: when entering an inflated boat
 * while carrying a sharp/pointy object, the boat gets punctured and deflates.
 *
 * This replaces the event handler pattern in boat-puncture-handler.ts.
 * The interceptor hooks into the ENTERING action phases to:
 * - postValidate: Check for sharp objects, store data for postExecute
 * - postExecute: Puncture the boat if sharp object detected
 * - postReport: Add puncture message to output
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  IdentityTrait,
  TraitType
} from '@sharpee/world-model';
import { InflatableTrait } from '../traits/inflatable-trait';

// Message IDs for boat puncture
export const BoatPunctureMessages = {
  PUNCTURED: 'dungeo.boat.punctured',
  STICK_POKES: 'dungeo.boat.stick_pokes'
};

/**
 * Check if an entity punctures the boat (sharp/pointy items)
 */
function puncturesBoat(entity: IFEntity): boolean {
  return !!(entity as any).puncturesBoat || !!(entity as any).isPointy;
}

/**
 * Check if the entity is an inflated boat
 */
function isInflatedBoat(entity: IFEntity): boolean {
  const inflatableTrait = entity.get(InflatableTrait);
  if (!inflatableTrait?.isInflated) return false;

  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  const boatTerms = ['boat', 'raft'];
  return boatTerms.some(term => name.includes(term)) ||
    aliases.some((a: string) => boatTerms.some(term => a.toLowerCase().includes(term)));
}

/**
 * Inflatable Entering Interceptor
 *
 * Intercepts ENTERING actions on inflatable entities (boats).
 * Checks if the actor is carrying a sharp object and punctures the boat.
 */
export const InflatableEnteringInterceptor: ActionInterceptor = {
  /**
   * Post-validate: Check if actor is carrying sharp objects.
   * Store data for postExecute - don't block the action.
   */
  postValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    // Only care about inflated boats
    if (!isInflatedBoat(entity)) {
      return null;
    }

    // Check if actor is carrying a sharp object
    const inventory = world.getContents(actorId);
    const sharpItem = inventory.find(item => puncturesBoat(item));

    if (sharpItem) {
      // Store for postExecute - will puncture after entering
      sharedData.willPuncture = true;
      sharedData.punctureItemId = sharpItem.id;
      sharedData.punctureItemName = sharpItem.get(IdentityTrait)?.name || 'sharp object';
    }

    // Allow entering to proceed - puncture happens in postExecute
    return null;
  },

  /**
   * Post-execute: Puncture the boat if sharp object was detected.
   * Actor is now inside the boat - eject them and deflate.
   */
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    if (!sharedData.willPuncture) {
      return;
    }

    // Eject actor from boat
    const boatLocation = world.getLocation(entity.id);
    if (boatLocation) {
      world.moveEntity(actorId, boatLocation);
    }

    // Deflate the boat
    const inflatableTrait = entity.get(InflatableTrait);
    if (inflatableTrait) {
      inflatableTrait.isInflated = false;
    }

    // Update name and description
    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.name = 'pile of plastic';
      identity.article = 'a';
      identity.description = 'There is a folded pile of plastic here which has a small valve attached. It appears to have been punctured.';
    }

    // Update displayName if it exists
    if ((entity as any).attributes?.displayName) {
      (entity as any).attributes.displayName = 'pile of plastic';
    }

    // Remove enterable/vehicle traits
    if (entity.has(TraitType.ENTERABLE)) {
      entity.remove(TraitType.ENTERABLE);
    }
    if (entity.has(TraitType.VEHICLE)) {
      entity.remove(TraitType.VEHICLE);
    }

    // Mark for message display
    sharedData.punctured = true;
  },

  /**
   * Post-report: Add puncture message to output.
   */
  postReport(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    if (!sharedData.punctured) {
      return [];
    }

    return [
      createEffect('game.message', {
        messageId: 'dungeo.boat.punctured',
        params: { item: sharedData.punctureItemName }
      })
    ];
  }
};
