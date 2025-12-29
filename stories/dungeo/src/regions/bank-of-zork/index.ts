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

  // West of Chasm - leads to bank entrance
  const westOfChasm = world.getEntity(roomIds.westOfChasm);
  if (westOfChasm) {
    const roomTrait = westOfChasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.eastOfChasm },
        [Direction.SOUTH]: { destination: roomIds.bankEntrance }
      };
    }
  }

  // Bank Entrance
  const bankEntrance = world.getEntity(roomIds.bankEntrance);
  if (bankEntrance) {
    const roomTrait = bankEntrance.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.westOfChasm },
        [Direction.SOUTH]: { destination: roomIds.bankLobby }
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

  // West Teller
  const westTeller = world.getEntity(roomIds.westTeller);
  if (westTeller) {
    const roomTrait = westTeller.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.eastTeller }
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

  // Safety Deposit Area
  const safetyDeposit = world.getEntity(roomIds.safetyDeposit);
  if (safetyDeposit) {
    const roomTrait = safetyDeposit.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.chairmansOffice },
        [Direction.SOUTH]: { destination: roomIds.vault }
      };
    }
  }

  // Vault
  const vault = world.getEntity(roomIds.vault);
  if (vault) {
    const roomTrait = vault.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.safetyDeposit }
      };
    }
  }

  // Viewing Room
  const viewingRoom = world.getEntity(roomIds.viewingRoom);
  if (viewingRoom) {
    const roomTrait = viewingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.chairmansOffice },
        [Direction.SOUTH]: { destination: roomIds.smallRoom }
      };
    }
  }

  // Small Room (behind curtain)
  const smallRoom = world.getEntity(roomIds.smallRoom);
  if (smallRoom) {
    const roomTrait = smallRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.viewingRoom }
      };
    }
  }
}

/**
 * Connect Bank of Zork to Underground (via Round Room)
 */
export function connectBankToUnderground(
  world: WorldModel,
  bankIds: BankRoomIds,
  roundRoomId: string
): void {
  // East of Chasm connects north to Round Room
  const eastOfChasm = world.getEntity(bankIds.eastOfChasm);
  if (eastOfChasm) {
    const roomTrait = eastOfChasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: roundRoomId };
    }
  }

  // Round Room connects south to East of Chasm
  const roundRoom = world.getEntity(roundRoomId);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: bankIds.eastOfChasm };
    }
  }
}
