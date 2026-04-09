/**
 * Randomization system for The Alderman.
 *
 * Selects a random killer, weapon, and murder location for each playthrough.
 * Applies the 5% shift: removes the murder weapon from its home location
 * and marks the murder location with physical evidence.
 *
 * Public interface: randomizeSolution(), GameSolution
 * Owner: thealderman story
 */

import { WorldModel } from '@sharpee/world-model';
import { NpcIds } from './npcs';
import { WeaponIds } from './objects';
import { RoomIds } from './rooms';
import { setSolution } from './actions';

/** The randomized solution for the current playthrough. */
export interface GameSolution {
  killerId: string;
  killerName: string;
  weaponId: string;
  weaponName: string;
  locationId: string;
  locationName: string;
}

interface SuspectDef {
  getId: () => string;
  name: string;
}

interface WeaponDef {
  getId: () => string;
  name: string;
}

interface LocationDef {
  getId: () => string;
  name: string;
}

const SUSPECTS: SuspectDef[] = [
  { getId: () => NpcIds.ross, name: 'Ross Bielack' },
  { getId: () => NpcIds.viola, name: 'Viola Wainright' },
  { getId: () => NpcIds.john, name: 'John Barber' },
  { getId: () => NpcIds.catherine, name: 'Catherine Shelby' },
  { getId: () => NpcIds.jack, name: 'Jack Margolin' },
  { getId: () => NpcIds.chelsea, name: 'Chelsea Sumner' },
];

const WEAPONS: WeaponDef[] = [
  { getId: () => WeaponIds.revolver, name: 'revolver' },
  { getId: () => WeaponIds.knife, name: 'kitchen knife' },
  { getId: () => WeaponIds.champagneBottle, name: 'champagne bottle' },
  { getId: () => WeaponIds.fireplacePoker, name: 'fireplace poker' },
  { getId: () => WeaponIds.sadIron, name: 'sad iron' },
  { getId: () => WeaponIds.curtainCord, name: 'curtain cord' },
];

const LOCATIONS: LocationDef[] = [
  { getId: () => RoomIds.room302, name: "Stephanie's room" },
  { getId: () => RoomIds.laundry, name: 'Laundry' },
  { getId: () => RoomIds.kitchen, name: 'Kitchen' },
  { getId: () => RoomIds.staircase, name: 'Elevator' },
  { getId: () => RoomIds.ballroom, name: 'Ballroom' },
  // "Suspect's room" picks from Ross/Viola/Jack
  { getId: () => pickSuspectRoom(), name: "a suspect's room" },
];

function pickSuspectRoom(): string {
  const rooms = [RoomIds.room304, RoomIds.room306, RoomIds.room308];
  return rooms[Math.floor(Math.random() * rooms.length)];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Selects the random solution and applies world modifications.
 *
 * @param world - The world model (after all entities are created)
 * @returns The solution for debugging/testing
 */
export function randomizeSolution(world: WorldModel): GameSolution {
  const suspect = pickRandom(SUSPECTS);
  const weapon = pickRandom(WEAPONS);
  const location = pickRandom(LOCATIONS);

  const sol: GameSolution = {
    killerId: suspect.getId(),
    killerName: suspect.name,
    weaponId: weapon.getId(),
    weaponName: weapon.name,
    locationId: location.getId(),
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
