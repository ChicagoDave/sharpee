/**
 * Coal Machine Handler
 *
 * Handles the coal machine puzzle in the Machine Room.
 * When the switch is turned on with coal inside the machine,
 * the coal is transformed into a huge diamond (16 point treasure).
 *
 * Per FORTRAN source:
 * - PUT COAL IN MACHINE (into the hopper/slot)
 * - TURN SWITCH / SWITCH ON SWITCH (activates machine)
 * - Coal is consumed, diamond appears in the "small opening"
 */

import { WorldModel, IWorldModel, IdentityTrait, EntityType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { TreasureTrait } from '../traits';

// Message IDs for coal machine puzzle
export const CoalMachineMessages = {
  MACHINE_WHIRS: 'dungeo.machine.whirs',
  COAL_TRANSFORMS: 'dungeo.machine.coal_transforms',
  SWITCH_ALREADY_ON: 'dungeo.machine.switch_already_on',
  NO_COAL: 'dungeo.machine.no_coal'
};

// Diamond treasure ID
export const DIAMOND_ID = 'dungeo.entity.diamond';

/**
 * Register the coal machine event handler
 *
 * Listens for if.event.switched_on events and handles the machine puzzle.
 */
export function registerCoalMachineHandler(
  world: WorldModel,
  machineRoomId: string
): void {
  world.registerEventHandler('if.event.switched_on', (event: ISemanticEvent, w: IWorldModel): void => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return;

    const targetId = data.target as string | undefined;
    if (!targetId) return;

    const target = w.getEntity(targetId);
    if (!target) return;

    // Check if this is the coal machine switch by checking:
    // 1. It's named "switch"
    // 2. It's in the Machine Room
    const targetIdentity = target.get(IdentityTrait);
    const targetName = targetIdentity?.name || '';
    const targetLocation = w.getLocation(targetId);

    if (!targetName.includes('switch') || targetLocation !== machineRoomId) return;

    // Find the machine in the room
    const roomContents = w.getContents(machineRoomId);
    const machine = roomContents.find(e => {
      const identity = e.get(IdentityTrait);
      return identity?.aliases?.includes('machine') || identity?.name === 'coal machine';
    });

    if (!machine) return;

    // Check if coal is in the machine
    const machineContents = w.getContents(machine.id);
    const coal = machineContents.find(e => {
      const identity = e.get(IdentityTrait);
      return identity?.aliases?.includes('coal') || identity?.name?.includes('coal');
    });

    if (!coal) {
      // Machine whirs but does nothing without coal
      w.setStateValue('dungeo.machine.no_coal_pending', true);
      return;
    }

    // SUCCESS! Coal in machine + switch turned on = diamond!
    transformCoalToDiamond(w, machineRoomId, machine.id, coal.id);
  });
}

/**
 * Transform coal into diamond
 */
function transformCoalToDiamond(
  world: IWorldModel,
  machineRoomId: string,
  machineId: string,
  coalId: string
): void {
  // Remove the coal
  world.removeEntity(coalId);

  // Create the diamond and place it in the room (from the "small opening")
  createDiamond(world as WorldModel, machineRoomId);

  // Set flag for messaging
  world.setStateValue('dungeo.machine.transformed', true);
}

/**
 * Create the huge diamond treasure
 *
 * Per implementation plan: 10 take + 6 case = 16 points total
 */
export function createDiamond(world: WorldModel, roomId: string): void {
  const diamond = world.createEntity('huge diamond', EntityType.ITEM);

  diamond.add(new IdentityTrait({
    name: 'huge diamond',
    aliases: ['diamond', 'huge diamond', 'gem', 'jewel'],
    description: 'A huge, flawless diamond that sparkles brilliantly in any light. It must be worth a fortune!',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring - 10 take + 6 case = 16 points (DIAMO in mdlzork_810722)
  diamond.add(new TreasureTrait({
    treasureId: 'huge-diamond',
    treasureValue: 10,     // OFVAL from mdlzork_810722
    trophyCaseValue: 6,    // OTVAL from mdlzork_810722
  }));

  world.moveEntity(diamond.id, roomId);
}
