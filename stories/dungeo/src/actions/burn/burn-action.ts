/**
 * Burn Action - Story-specific action for burning items
 *
 * Handles two burn targets:
 * - Incense: disarms basin trap in ghost ritual (ADR-078)
 * - Fuse wire: starts 2-turn explosion countdown (brick/safe puzzle)
 *
 * Pattern: "burn incense", "light wire", "burn fuse"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { ISchedulerService } from '@sharpee/plugin-scheduler';
import { BURN_ACTION_ID, BurnMessages } from './types';
import { BurnableTrait, BasinRoomTrait } from '../../traits';
import { startExplosionCountdown, ExplosionConfig } from '../../scheduler';

// Module-level scheduler reference for explosion fuse (set during orchestration)
let explosionSchedulerRef: ISchedulerService | null = null;
let explosionConfigRef: ExplosionConfig | null = null;

/**
 * Set the scheduler reference and explosion config.
 * Called from scheduler-setup.ts during story initialization.
 */
export function setBurnActionExplosionConfig(
  scheduler: ISchedulerService,
  config: ExplosionConfig
): void {
  explosionSchedulerRef = scheduler;
  explosionConfigRef = config;
}

/**
 * Check if an entity has BurnableTrait (any burnable type)
 */
function isBurnable(entity: IFEntity): boolean {
  return !!entity.get(BurnableTrait);
}

/**
 * Check if entity is already burning
 */
function isBurning(entity: IFEntity): boolean {
  const burnable = entity.get(BurnableTrait);
  return burnable?.isBurning === true;
}

/**
 * Check if entity is burned out
 */
function isBurnedOut(entity: IFEntity): boolean {
  const burnable = entity.get(BurnableTrait);
  return burnable?.burnedOut === true;
}

/**
 * Get the direct object from context
 */
function getDirectObject(context: ActionContext): { entity?: IFEntity; text?: string } | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) {
    return undefined;
  }

  const text = structure.directObject.text || '';
  const entity = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const lowerText = text.toLowerCase();
    return name.includes(lowerText) ||
           lowerText.includes(name) ||
           aliases.some((a: string) => a.toLowerCase().includes(lowerText) || lowerText.includes(a.toLowerCase()));
  });

  return { entity, text };
}

/**
 * Find any burnable item in current location or inventory
 */
function findBurnableItem(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check player inventory
  const inventory = world.getContents(player.id);
  for (const item of inventory) {
    if (isBurnable(item)) {
      return item;
    }
  }

  // Check current room
  const playerLocation = world.getLocation(player.id);
  if (playerLocation) {
    const roomContents = world.getContents(playerLocation);
    for (const item of roomContents) {
      if (isBurnable(item)) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Burn Action Definition
 */
export const burnAction: Action = {
  id: BURN_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const directObject = getDirectObject(context);

    // If no target specified, try to find a burnable item
    if (!directObject || !directObject.text) {
      const burnable = findBurnableItem(context);
      if (burnable) {
        if (isBurning(burnable)) {
          return { valid: false, error: BurnMessages.ALREADY_BURNING };
        }
        if (isBurnedOut(burnable)) {
          return { valid: false, error: BurnMessages.BURNED_OUT };
        }
        context.sharedData.burnTarget = burnable;
        return { valid: true };
      }
      return { valid: false, error: BurnMessages.NO_TARGET };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return { valid: false, error: BurnMessages.NOT_VISIBLE };
    }

    // Check if target has BurnableTrait
    if (!isBurnable(targetEntity)) {
      return {
        valid: false,
        error: BurnMessages.CANT_BURN,
        params: { target: directObject.text }
      };
    }

    // Check if already burning
    if (isBurning(targetEntity)) {
      return { valid: false, error: BurnMessages.ALREADY_BURNING };
    }

    // Check if burned out
    if (isBurnedOut(targetEntity)) {
      return { valid: false, error: BurnMessages.BURNED_OUT };
    }

    // Store target for execute phase
    context.sharedData.burnTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const target = sharedData.burnTarget as IFEntity;
    if (!target) return;

    const burnable = target.get(BurnableTrait);
    if (!burnable) return;

    // Set to burning state
    burnable.isBurning = true;

    // Type-specific execute logic
    if (burnable.burnableType === 'incense') {
      // Store incense ID for the fuse registration
      world.setStateValue('dungeo.incense.burning_id', target.id);
      sharedData.incenseId = target.id;

      // If burned in Basin Room, disarm the trap
      const playerLocation = world.getLocation(context.player.id);
      if (playerLocation) {
        const room = world.getEntity(playerLocation);
        const basinTrait = room?.get(BasinRoomTrait);
        if (basinTrait) {
          basinTrait.basinState = 'disarmed';
          sharedData.basinDisarmed = true;
        }
      }
    } else if (burnable.burnableType === 'fuse') {
      // Start the explosion countdown
      if (explosionSchedulerRef && explosionConfigRef) {
        startExplosionCountdown(explosionSchedulerRef, explosionConfigRef);
      }
      sharedData.fuseId = target.id;
    }

    sharedData.burnableType = burnable.burnableType;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: BURN_ACTION_ID,
      messageId: result.error || BurnMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.burnTarget as IFEntity;
    if (!target) return events;

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';

    // Emit type-specific message
    if (sharedData.burnableType === 'fuse') {
      events.push(context.event('game.message', {
        messageId: BurnMessages.BURN_FUSE,
        target: targetName,
        fuseId: sharedData.fuseId
      }));
    } else if (sharedData.burnableType === 'flammable') {
      events.push(context.event('game.message', {
        messageId: BurnMessages.BURN_SUCCESS,
        target: targetName
      }));
    } else {
      events.push(context.event('game.message', {
        messageId: BurnMessages.BURN_INCENSE,
        target: targetName,
        incenseId: sharedData.incenseId
      }));
    }

    return events;
  }
};
