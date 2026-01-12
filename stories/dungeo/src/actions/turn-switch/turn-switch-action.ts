/**
 * Turn Switch Action - Activates the coal machine
 *
 * When the player turns the switch on the machine:
 * - If coal is in the machine, it gets converted to a diamond
 * - If no coal, tells player the machine needs fuel
 * - If already used (diamond created), nothing happens
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, EntityType } from '@sharpee/world-model';
import { TURN_SWITCH_ACTION_ID, TurnSwitchMessages } from './types';

/**
 * Check if an entity is the machine
 */
function isMachine(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  return name === 'machine' || name.includes('coal machine');
}

/**
 * Check if an entity is coal
 */
function isCoal(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('coal') || aliases.some((a: string) => a.toLowerCase() === 'coal');
}

/**
 * Find machine in current room
 */
function findMachineInRoom(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  const roomContents = world.getContents(playerLocation);
  return roomContents.find(e => isMachine(e));
}

/**
 * Find coal in machine
 */
function findCoalInMachine(context: ActionContext, machineId: string): IFEntity | undefined {
  const { world } = context;
  const machineContents = world.getContents(machineId);
  return machineContents.find(e => isCoal(e));
}

/**
 * Create the diamond treasure
 */
function createDiamond(context: ActionContext, machineId: string): IFEntity {
  const { world } = context;

  const diamond = world.createEntity('huge diamond', EntityType.ITEM);

  diamond.add(new IdentityTrait({
    name: 'huge diamond',
    aliases: ['diamond', 'large diamond', 'gem'],
    description: 'This is an enormous diamond, perfectly cut and dazzlingly brilliant. It must be worth a fortune.',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring (6 take + 10 case = 16 total) - DIAMO in 1981 MDL
  (diamond as any).isTreasure = true;
  (diamond as any).treasureId = 'huge-diamond';
  (diamond as any).treasureValue = 6;     // OTVAL from 1981 MDL
  (diamond as any).trophyCaseValue = 10;  // OFVAL from 1981 MDL

  // Place diamond in machine (player will need to take it)
  world.moveEntity(diamond.id, machineId);

  return diamond;
}

/**
 * Turn Switch Action Definition
 */
export const turnSwitchAction: Action = {
  id: TURN_SWITCH_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Find machine in current room
    const machine = findMachineInRoom(context);

    if (!machine) {
      return {
        valid: false,
        error: TurnSwitchMessages.NO_SWITCH
      };
    }

    // Check if machine was already used
    if ((machine as any).machineActivated) {
      return {
        valid: false,
        error: TurnSwitchMessages.ALREADY_USED
      };
    }

    // Check if coal is in the machine
    const coal = findCoalInMachine(context, machine.id);

    if (!coal) {
      return {
        valid: false,
        error: TurnSwitchMessages.NO_COAL
      };
    }

    // Store for execute phase
    context.sharedData.machine = machine;
    context.sharedData.coal = coal;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const machine = sharedData.machine as IFEntity;
    const coal = sharedData.coal as IFEntity;

    if (!machine || !coal) return;

    // Remove the coal
    world.removeEntity(coal.id);

    // Create the diamond in the machine
    const diamond = createDiamond(context, machine.id);
    sharedData.diamond = diamond;

    // Mark machine as activated (one-time use)
    (machine as any).machineActivated = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: TURN_SWITCH_ACTION_ID,
      messageId: result.error || TurnSwitchMessages.NO_SWITCH,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('game.message', {
      messageId: TurnSwitchMessages.SUCCESS
    })];
  }
};
