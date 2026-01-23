/**
 * Chimney Handler
 *
 * Implements the chimney restriction from the Studio to Kitchen.
 *
 * Per MDL source (act1.254 lines 133-146, dung.355 lines 1793-1797):
 * - CEXIT with LIGHT-LOAD flag and CHIMNEY-FUNCTION
 * - Player must have lamp AND max 2 items total
 * - Empty-handed gives special message
 * - Too much baggage gives standard chimney message
 *
 * Logic:
 * 1. If empty inventory -> "Going up empty-handed is a bad idea."
 * 2. If inventory > 2 OR no lamp -> "The chimney is too narrow for you and all of your baggage."
 * 3. Otherwise -> allow passage to Kitchen
 */

import { WorldModel, IdentityTrait, IParsedCommand } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';
import { CHIMNEY_BLOCKED_ACTION_ID, ChimneyBlockReason } from '../actions/chimney-blocked';

/**
 * Check if player is in the Studio
 */
function isInStudio(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  const roomName = identity?.name || '';

  return roomName === 'Studio';
}

/**
 * Check if command is going up
 */
function isGoingUp(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase();

  // Check if it's a GO/GOING action
  if (actionId !== 'go' && actionId !== 'going' && actionId !== 'if.action.going') {
    return false;
  }

  // Get direction
  let direction: string | undefined;

  if (parsed.extras?.direction) {
    direction = String(parsed.extras.direction).toLowerCase();
  } else if (parsed.structure?.directObject?.head) {
    direction = parsed.structure.directObject.head.toLowerCase();
  }

  return direction === 'up' || direction === 'u';
}

/**
 * Get the lamp entity (brass lantern)
 */
function getLampId(world: WorldModel): string | null {
  // Find the lamp by searching for the brass lantern
  const entities = world.getAllEntities();
  for (const entity of entities) {
    const identity = entity.get(IdentityTrait);
    if (identity) {
      const name = identity.name.toLowerCase();
      const aliases = identity.aliases.map(a => a.toLowerCase());
      if (name === 'brass lantern' ||
          name === 'lantern' ||
          name === 'lamp' ||
          aliases.includes('lamp') ||
          aliases.includes('lantern') ||
          aliases.includes('brass lantern')) {
        return entity.id;
      }
    }
  }
  return null;
}

/**
 * Get player's direct inventory (items carried)
 */
function getPlayerInventory(world: WorldModel): string[] {
  const player = world.getPlayer();
  if (!player) return [];

  const contents = world.getContents(player.id);
  return contents.map(entity => entity.id);
}

/**
 * Check if player has the lamp in inventory
 */
function playerHasLamp(world: WorldModel): boolean {
  const lampId = getLampId(world);
  if (!lampId) return false;

  const inventoryIds = getPlayerInventory(world);
  return inventoryIds.includes(lampId);
}

/**
 * Create the chimney command transformer
 *
 * Intercepts "go up" in the Studio and checks inventory requirements.
 */
export function createChimneyCommandTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept when in Studio and going up
    if (!isInStudio(world) || !isGoingUp(parsed)) {
      return parsed;
    }

    const inventory = getPlayerInventory(world);
    const inventoryCount = inventory.length;

    // Check 1: Empty inventory
    if (inventoryCount === 0) {
      return {
        ...parsed,
        action: CHIMNEY_BLOCKED_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          chimneyBlockReason: 'empty' as ChimneyBlockReason
        }
      };
    }

    // Check 2: More than 2 items
    if (inventoryCount > 2) {
      return {
        ...parsed,
        action: CHIMNEY_BLOCKED_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          chimneyBlockReason: 'baggage' as ChimneyBlockReason
        }
      };
    }

    // Check 3: Must have lamp
    if (!playerHasLamp(world)) {
      return {
        ...parsed,
        action: CHIMNEY_BLOCKED_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          chimneyBlockReason: 'baggage' as ChimneyBlockReason
        }
      };
    }

    // All checks passed - allow passage
    return parsed;
  };
}
