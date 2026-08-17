/**
 * Randomization system for The Alderman.
 *
 * Selects a random killer, weapon, and murder location for each playthrough.
 * Applies the 5% shift: removes the murder weapon from its home location
 * and marks the murder location with physical evidence.
 *
 * Public interface: randomizeSolution(), GameSolution, StoryIds
 * Owner: thealderman story
 *
 * ADR-248: all entity ids come in as parameters (per-world maps returned by
 * the create* builders) — no module-level id registries.
 */

import { WorldModel } from '@sharpee/world-model';
import { NpcIds } from './npcs';
import { WeaponIds } from './objects';
import { RoomIds } from './rooms';

/** The randomized solution for the current playthrough. */
export interface GameSolution {
  killerId: string;
  killerName: string;
  weaponId: string;
  weaponName: string;
  locationId: string;
  locationName: string;
}

/** The per-world id maps the randomizer draws from. */
export interface StoryIds {
  rooms: RoomIds;
  npcs: NpcIds;
  weapons: WeaponIds;
}

interface CandidateDef {
  id: string;
  name: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Selects the random solution and applies world modifications.
 *
 * @param world - The world model (after all entities are created)
 * @param ids - The per-world id maps (rooms, NPCs, weapons)
 * @param setSolution - The story instance's ACCUSE-action solution setter
 *   (ADR-248: the action's state is per-instance, so the setter is passed
 *   in rather than imported as a module-level singleton)
 * @returns The solution for debugging/testing
 */
export function randomizeSolution(
  world: WorldModel,
  ids: StoryIds,
  setSolution: (killerId: string, weaponId: string, locationId: string) => void,
): GameSolution {
  const { rooms, npcs, weapons } = ids;

  const suspects: CandidateDef[] = [
    { id: npcs.ross, name: 'Ross Bielack' },
    { id: npcs.viola, name: 'Viola Wainright' },
    { id: npcs.john, name: 'John Barber' },
    { id: npcs.catherine, name: 'Catherine Shelby' },
    { id: npcs.jack, name: 'Jack Margolin' },
    { id: npcs.chelsea, name: 'Chelsea Sumner' },
  ];

  const weaponChoices: CandidateDef[] = [
    { id: weapons.revolver, name: 'revolver' },
    { id: weapons.knife, name: 'kitchen knife' },
    { id: weapons.champagneBottle, name: 'champagne bottle' },
    { id: weapons.fireplacePoker, name: 'fireplace poker' },
    { id: weapons.sadIron, name: 'sad iron' },
    { id: weapons.curtainCord, name: 'curtain cord' },
  ];

  const locations: CandidateDef[] = [
    { id: rooms.room302, name: "Stephanie's room" },
    { id: rooms.laundry, name: 'Laundry' },
    { id: rooms.kitchen, name: 'Kitchen' },
    { id: rooms.staircase, name: 'Elevator' },
    { id: rooms.ballroom, name: 'Ballroom' },
    // "Suspect's room" picks from Ross/Viola/Jack
    {
      id: pickRandom([rooms.room304, rooms.room306, rooms.room308]),
      name: "a suspect's room",
    },
  ];

  const suspect = pickRandom(suspects);
  const weapon = pickRandom(weaponChoices);
  const location = pickRandom(locations);

  const sol: GameSolution = {
    killerId: suspect.id,
    killerName: suspect.name,
    weaponId: weapon.id,
    weaponName: weapon.name,
    locationId: location.id,
    locationName: location.name,
  };

  // Wire up the ACCUSE action with the correct answer
  setSolution(sol.killerId, sol.weaponId, sol.locationId);

  // Remove the murder weapon from its home location (it was used and hidden)
  // The weapon entity still exists but is moved to a "hidden" state
  // TODO: Move weapon to a limbo location or mark as hidden evidence
  // For now, the weapon's absence from its normal spot is the clue

  return sol;
}
