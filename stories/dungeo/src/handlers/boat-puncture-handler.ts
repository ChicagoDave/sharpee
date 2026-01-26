/**
 * Boat Puncture Handler
 *
 * Handles the mechanic where carrying a sharp/pointy object (like the stick)
 * into the inflated boat causes the boat to be punctured and deflated.
 *
 * In Zork, the solution is to put the stick IN the boat before boarding,
 * rather than carrying it in your inventory.
 */

import { WorldModel, IWorldModel, IdentityTrait, IFEntity, TraitType } from '@sharpee/world-model';
import { InflatableTrait } from '../traits';
import { ISemanticEvent } from '@sharpee/core';

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
 * Check if entity is the inflatable boat
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
 * Deflate the boat due to puncture
 */
function punctureBoat(world: IWorldModel, boat: IFEntity, actorId: string): void {
  // Eject actor from boat
  const boatLocation = world.getLocation(boat.id);
  if (boatLocation) {
    world.moveEntity(actorId, boatLocation);
  }

  // Deflate the boat
  const inflatableTrait = boat.get(InflatableTrait);
  if (inflatableTrait) {
    inflatableTrait.isInflated = false;
  }

  // Update name and description
  const identity = boat.get(IdentityTrait);
  if (identity) {
    identity.name = 'pile of plastic';
    identity.article = 'a';
    identity.description = 'There is a folded pile of plastic here which has a small valve attached. It appears to have been punctured.';
  }

  // Update displayName
  (boat as any).attributes.displayName = 'pile of plastic';

  // Remove enterable/vehicle traits
  if (boat.has(TraitType.ENTERABLE)) {
    boat.remove(TraitType.ENTERABLE);
  }
  if (boat.has(TraitType.VEHICLE)) {
    boat.remove(TraitType.VEHICLE);
  }
}

/**
 * Register the boat puncture event handler
 *
 * Listens for if.event.entered events and checks if the actor
 * entered the boat while carrying a sharp object.
 */
export function registerBoatPunctureHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.entered', (event: ISemanticEvent, w: IWorldModel): void => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return;

    const targetId = data.targetId as string | undefined;
    if (!targetId) return;

    const target = w.getEntity(targetId);
    if (!target) return;

    // Check if entering an inflated boat
    if (!isInflatedBoat(target)) return;

    // Get the actor (player) who entered
    // The actor should now be inside the boat
    const boatContents = w.getContents(targetId);
    const actors = boatContents.filter(e => e.has(TraitType.ACTOR));

    for (const actor of actors) {
      // Check if this actor is carrying a sharp object
      const inventory = w.getContents(actor.id);
      const sharpItem = inventory.find(item => puncturesBoat(item));

      if (sharpItem) {
        // Found a sharp object - puncture the boat!
        punctureBoat(w, target, actor.id);

        // Set flag for message display
        w.setStateValue('dungeo.boat.just_punctured', true);
        w.setStateValue('dungeo.boat.puncture_item', sharpItem.get(IdentityTrait)?.name || 'sharp object');
        return;
      }
    }
  });
}
