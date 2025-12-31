/**
 * Bank of Zork Region - The famous underground bank
 *
 * Accessed from the Underground via a narrow ledge crossing
 * a great chasm. Contains valuable treasures including
 * a portrait, zorkmid bills, and a zorkmid coin.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createEastOfChasm } from './rooms/east-of-chasm';
import { createWestOfChasm } from './rooms/west-of-chasm';
import { createBankEntrance } from './rooms/bank-entrance';
import { createBankLobby } from './rooms/bank-lobby';
import { createWestTeller } from './rooms/west-teller';
import { createEastTeller } from './rooms/east-teller';
import { createChairmansOffice } from './rooms/chairmans-office';
import { createSafetyDeposit } from './rooms/safety-deposit';
import { createVault } from './rooms/vault';
import { createViewingRoom } from './rooms/viewing-room';
import { createSmallRoom } from './rooms/small-room';

export interface BankRoomIds {
  eastOfChasm: string;
  westOfChasm: string;
  bankEntrance: string;
  bankLobby: string;
  westTeller: string;
  eastTeller: string;
  chairmansOffice: string;
  safetyDeposit: string;
  vault: string;
  viewingRoom: string;
  smallRoom: string;
}

/**
 * Create all rooms in the Bank of Zork region
 */
export function createBankRooms(world: WorldModel): BankRoomIds {
  const eastOfChasm = createEastOfChasm(world);
  const westOfChasm = createWestOfChasm(world);
  const bankEntrance = createBankEntrance(world);
  const bankLobby = createBankLobby(world);
  const westTeller = createWestTeller(world);
  const eastTeller = createEastTeller(world);
  const chairmansOffice = createChairmansOffice(world);
  const safetyDeposit = createSafetyDeposit(world);
  const vault = createVault(world);
  const viewingRoom = createViewingRoom(world);
  const smallRoom = createSmallRoom(world);

  const roomIds: BankRoomIds = {
    eastOfChasm: eastOfChasm.id,
    westOfChasm: westOfChasm.id,
    bankEntrance: bankEntrance.id,
    bankLobby: bankLobby.id,
    westTeller: westTeller.id,
    eastTeller: eastTeller.id,
    chairmansOffice: chairmansOffice.id,
    safetyDeposit: safetyDeposit.id,
    vault: vault.id,
    viewingRoom: viewingRoom.id,
    smallRoom: smallRoom.id
  };

  connectBankRooms(world, roomIds);
  return roomIds;
}

export { createBankObjects } from './objects';

function connectBankRooms(world: WorldModel, roomIds: BankRoomIds): void {
  // East of Chasm - entry point from main dungeon
  const eastOfChasm = world.getEntity(roomIds.eastOfChasm);
  if (eastOfChasm) {
    const roomTrait = eastOfChasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.westOfChasm },
        // South connects to Underground - set externally
      };
    }
  }

  // West of Chasm - connects Cellar to Gallery (main passage)
  // Per play transcript: W→Cellar, S→Gallery, N/E continue path
  const westOfChasm = world.getEntity(roomIds.westOfChasm);
  if (westOfChasm) {
    const roomTrait = westOfChasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.eastOfChasm },
        // W → Cellar - connected externally
        // S → Gallery - connected externally
      };
    }
  }

  // Bank Entrance - "large entrance hall of the Bank of Zork"
  // Per play transcript: E→Gallery, NW→West Viewing, NE→East Viewing
  const bankEntrance = world.getEntity(roomIds.bankEntrance);
  if (bankEntrance) {
    const roomTrait = bankEntrance.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // E → Gallery - connected externally
        [Direction.NORTHWEST]: { destination: roomIds.westTeller },  // West viewing area
        [Direction.NORTHEAST]: { destination: roomIds.eastTeller },  // East viewing area
      };
    }
  }

  // Bank Lobby
  const bankLobby = world.getEntity(roomIds.bankLobby);
  if (bankLobby) {
    const roomTrait = bankLobby.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.bankEntrance },
        [Direction.WEST]: { destination: roomIds.westTeller },
        [Direction.EAST]: { destination: roomIds.eastTeller }
      };
    }
  }

  // West Teller's Room - small square room
  // Per transcript: W → Safety Depository, SE → Bank Entrance
  const westTeller = world.getEntity(roomIds.westTeller);
  if (westTeller) {
    const roomTrait = westTeller.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.safetyDeposit },
        [Direction.SOUTHEAST]: { destination: roomIds.bankEntrance }
      };
    }
  }

  // East Teller
  const eastTeller = world.getEntity(roomIds.eastTeller);
  if (eastTeller) {
    const roomTrait = eastTeller.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.westTeller },
        [Direction.SOUTH]: { destination: roomIds.chairmansOffice }
      };
    }
  }

  // Chairman's Office
  const chairmansOffice = world.getEntity(roomIds.chairmansOffice);
  if (chairmansOffice) {
    const roomTrait = chairmansOffice.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.eastTeller },
        [Direction.WEST]: { destination: roomIds.viewingRoom },
        [Direction.EAST]: { destination: roomIds.safetyDeposit }
      };
    }
  }

  // Safety Depository - large rectangular room with cube and shimmering curtain
  // Per transcript: E/W/S doorways, N is the curtain (not a normal exit)
  const safetyDeposit = world.getEntity(roomIds.safetyDeposit);
  if (safetyDeposit) {
    const roomTrait = safetyDeposit.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.westTeller },
        [Direction.WEST]: { destination: roomIds.westTeller },
        [Direction.SOUTH]: { destination: roomIds.chairmansOffice }
      };
    }
  }

  // Vault - NO normal exits, only via walk-through-walls
  // "This is the Vault of the Bank of Zork, in which there are no doors."
  const vault = world.getEntity(roomIds.vault);
  if (vault) {
    const roomTrait = vault.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {};  // No normal exits
    }
  }

  // Viewing Room - reached via curtain after completing the wall-walk cycle
  // Per transcript: S → Bank Entrance
  const viewingRoom = world.getEntity(roomIds.viewingRoom);
  if (viewingRoom) {
    const roomTrait = viewingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.bankEntrance }
      };
    }
  }

  // Small Room - NO normal exits, only via walk-through-walls
  // "This is a small bare room with no distinguishing features. There are no exits from this room."
  const smallRoom = world.getEntity(roomIds.smallRoom);
  if (smallRoom) {
    const roomTrait = smallRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {};  // No normal exits
    }
  }
}

/**
 * Connect Bank of Zork to Underground (via Cellar, Gallery, and N/S Crawlway)
 *
 * Per map-connections.md:
 * - Cellar S → West of Chasm
 * - West of Chasm W → Cellar, N → N/S Crawlway, S → Gallery
 * - N/S Crawlway N → West Chasm
 * - Gallery N → West of Chasm, W → Bank Entrance
 * - Bank Entrance E → Gallery
 */
export function connectBankToUnderground(
  world: WorldModel,
  bankIds: BankRoomIds,
  cellarId: string,
  galleryId: string,
  nsCrawlwayId?: string
): void {
  // Cellar S → West of Chasm
  const cellar = world.getEntity(cellarId);
  if (cellar) {
    const roomTrait = cellar.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: bankIds.westOfChasm };
    }
  }

  // West of Chasm W → Cellar, N → N/S Crawlway, S → Gallery
  const westOfChasm = world.getEntity(bankIds.westOfChasm);
  if (westOfChasm) {
    const roomTrait = westOfChasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: cellarId };
      roomTrait.exits[Direction.SOUTH] = { destination: galleryId };
      if (nsCrawlwayId) {
        roomTrait.exits[Direction.NORTH] = { destination: nsCrawlwayId };
      }
    }
  }

  // N/S Crawlway N → West Chasm
  if (nsCrawlwayId) {
    const nsCrawlway = world.getEntity(nsCrawlwayId);
    if (nsCrawlway) {
      const roomTrait = nsCrawlway.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.NORTH] = { destination: bankIds.westOfChasm };
      }
    }
  }

  // Gallery N → West of Chasm, W → Bank Entrance
  const gallery = world.getEntity(galleryId);
  if (gallery) {
    const roomTrait = gallery.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: bankIds.westOfChasm };
      roomTrait.exits[Direction.WEST] = { destination: bankIds.bankEntrance };
    }
  }

  // Bank Entrance E → Gallery
  const bankEntrance = world.getEntity(bankIds.bankEntrance);
  if (bankEntrance) {
    const roomTrait = bankEntrance.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: galleryId };
    }
  }
}
