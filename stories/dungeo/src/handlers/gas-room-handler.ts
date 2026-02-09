/**
 * Gas Room Explosion Handler
 *
 * Implements death when player brings an open flame into the Gas Room.
 * Per MDL source (act3.199): gas room contains flammable gas that
 * explodes on contact with any open flame (torch, candles, match).
 * The brass lantern (electric) is safe.
 *
 * Triggers:
 * 1. GO into gas room while carrying a lit flame source
 * 2. SWITCH ON / LIGHT a flame source while in gas room
 * 3. Already in gas room with lit flame (edge case / $teleport)
 *
 * Uses ParsedCommandTransformer pattern (same as falls-death, grue-death).
 */

import { WorldModel, IParsedCommand, TraitType, LightSourceBehavior, RoomTrait, VehicleTrait, DirectionType } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';

// Gas room ID - set during registration
let gasRoomId: string | null = null;

// Death action ID
export const GAS_EXPLOSION_ACTION_ID = 'dungeo.action.gas_explosion';

// Message IDs
export const GasExplosionMessages = {
  DEATH: 'dungeo.gas.explosion_death',
  LIGHT_DEATH: 'dungeo.gas.light_death'
} as const;

/**
 * Get the player's containing room, handling being inside a vehicle
 */
function getPlayerRoom(world: WorldModel): string | null {
  const player = world.getPlayer();
  if (!player) return null;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return null;

  // Check if player is in a vehicle
  const locationEntity = world.getEntity(playerLocation);
  if (locationEntity?.has(TraitType.VEHICLE)) {
    return world.getLocation(playerLocation) || null;
  }

  return playerLocation;
}

/**
 * Check if the player is carrying any lit flame source
 */
function hasLitFlame(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const contents = world.getContents(player.id);
  for (const item of contents) {
    // Must have LightSourceTrait and be lit
    if (!item.has(TraitType.LIGHT_SOURCE)) continue;
    if (!LightSourceBehavior.isLit(item)) continue;

    // Must be a flame source (not electric)
    if (item.attributes.isFlame) return true;
  }

  return false;
}

/**
 * Check if the action target is a flame source being turned on
 */
function isLightingFlame(parsed: IParsedCommand, world: WorldModel): boolean {
  const actionId = parsed.action?.toLowerCase() || '';

  // Check for switch on / light actions
  const lightActions = [
    'if.action.switching_on',
    'dungeo.action.light'
  ];
  if (!lightActions.includes(actionId)) return false;

  // Check the direct object
  const targetRef = parsed.structure?.directObject;
  if (!targetRef) return false;

  const targetId = targetRef.entityId;
  if (!targetId) return false;

  const target = world.getEntity(targetId);
  if (!target) return false;

  // Is it a flame source?
  return !!target.attributes.isFlame;
}

/**
 * Get destination room for a GO command
 */
function getGoDestination(parsed: IParsedCommand, world: WorldModel): string | null {
  const actionId = parsed.action?.toLowerCase() || '';
  if (actionId !== 'if.action.going' && actionId !== 'going') return null;

  // Get direction from extras or direct object head (same as grue/chimney handlers)
  let direction: string | undefined;
  if (parsed.extras?.direction) {
    direction = String(parsed.extras.direction).toLowerCase();
  } else if (parsed.structure?.directObject?.head) {
    direction = parsed.structure.directObject.head.toLowerCase();
  }
  if (!direction) return null;

  const playerRoom = getPlayerRoom(world);
  if (!playerRoom) return null;

  const room = world.getEntity(playerRoom);
  if (!room) return null;

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait) return null;

  const exit = roomTrait.exits[direction as DirectionType];
  return exit?.destination || null;
}

/**
 * Create command transformer for gas room explosion
 *
 * Intercepts commands that would result in flame + gas contact.
 */
export function createGasRoomTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    if (!gasRoomId) return parsed;

    // GDT commands are always safe
    const actionId = parsed.action?.toLowerCase() || '';
    if (actionId.startsWith('dungeo.action.gdt')) return parsed;

    const playerRoom = getPlayerRoom(world);

    // Case 1: Player is GOING to gas room with lit flame
    const destination = getGoDestination(parsed, world);
    // DEBUG - log every call
    console.error(`[GAS] action=${actionId}, playerRoom=${playerRoom}, destination=${destination}, gasRoomId=${gasRoomId}`);
    // DEBUG
    if (destination === gasRoomId) {
      const player = world.getPlayer();
      if (player) {
        const contents = world.getContents(player.id);
        for (const item of contents) {
          if (item.has(TraitType.LIGHT_SOURCE)) {
            console.error(`[GAS DEBUG] Item: ${item.id}, isLit: ${LightSourceBehavior.isLit(item)}, isFlame: ${item.attributes.isFlame}`);
          }
        }
      }
      console.error(`[GAS DEBUG] destination=${destination}, gasRoomId=${gasRoomId}, hasLitFlame=${hasLitFlame(world)}`);
    }
    // END DEBUG
    if (destination === gasRoomId && hasLitFlame(world)) {
      return {
        ...parsed,
        action: GAS_EXPLOSION_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          isGasExplosion: true,
          explosionType: 'enter'
        }
      };
    }

    // Case 2: Player is IN gas room and trying to light a flame source
    if (playerRoom === gasRoomId && isLightingFlame(parsed, world)) {
      return {
        ...parsed,
        action: GAS_EXPLOSION_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          isGasExplosion: true,
          explosionType: 'light'
        }
      };
    }

    // Case 3: Player is IN gas room with a lit flame (edge case / $teleport)
    if (playerRoom === gasRoomId && hasLitFlame(world)) {
      return {
        ...parsed,
        action: GAS_EXPLOSION_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          isGasExplosion: true,
          explosionType: 'already_present'
        }
      };
    }

    return parsed;
  };
}

/**
 * Register the gas room for explosion checking
 */
export function registerGasRoom(roomId: string): void {
  gasRoomId = roomId;
}
