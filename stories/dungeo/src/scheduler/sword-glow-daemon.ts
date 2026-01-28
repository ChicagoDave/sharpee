/**
 * Sword Glow Daemon - ADR-071
 *
 * The elvish sword glows when enemies are nearby:
 * - Glow level 2 (bright): Enemy in same room
 * - Glow level 1 (faint): Enemy in adjacent room
 * - Glow level 0: No enemies nearby
 *
 * Only emits message when glow state changes.
 *
 * Villains that trigger glow: Troll, Thief, Cyclops
 *
 * From MDL source (act1.254 SWORD-GLOW function):
 * - "Your sword has begun to glow very brightly." (level 2)
 * - "Your sword is glowing with a faint blue glow." (level 1)
 * - "Your sword is no longer glowing." (level 0)
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait, CombatantTrait, RoomTrait, ActorTrait } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

// Daemon ID
const SWORD_GLOW_DAEMON = 'dungeo.sword.glow';

// Message IDs
export const SwordGlowMessages = {
  GLOW_BRIGHT: 'dungeo.sword.glow_bright',
  GLOW_FAINT: 'dungeo.sword.glow_faint',
  GLOW_OFF: 'dungeo.sword.glow_off',
} as const;

// Glow levels
const GLOW_OFF = 0;
const GLOW_FAINT = 1;
const GLOW_BRIGHT = 2;

// Current glow level (persisted across turns)
let currentGlowLevel = GLOW_OFF;

// Cached entity IDs
let swordId: string | null = null;
let playerId: string | null = null;

/**
 * Find the elvish sword in the world
 */
function findSword(world: WorldModel): string | null {
  const entities = world.getAllEntities();
  for (const entity of entities) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('elvish sword')) {
      return entity.id;
    }
  }
  return null;
}

/**
 * Find the player entity
 */
function findPlayer(world: WorldModel): string | null {
  const entities = world.getAllEntities();
  for (const entity of entities) {
    const actor = entity.get(ActorTrait);
    if (actor?.isPlayer) {
      return entity.id;
    }
  }
  return null;
}

/**
 * Check if an entity is a villain (hostile NPC that triggers sword glow)
 */
function isVillain(entity: any, world: WorldModel): boolean {
  const identity = entity.get?.(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const combatant = entity.get?.(CombatantTrait);

  // Must be alive to trigger glow
  if (combatant && !combatant.isAlive) return false;

  // Check for troll, thief, or cyclops
  return name.includes('troll') || name.includes('thief') || name.includes('cyclops');
}

/**
 * Check if a room contains a villain
 */
function roomHasVillain(roomId: string, world: WorldModel): boolean {
  const contents = world.getContents(roomId);
  for (const entity of contents) {
    if (isVillain(entity, world)) {
      return true;
    }
  }
  return false;
}

/**
 * Get adjacent room IDs from a room
 */
function getAdjacentRooms(roomId: string, world: WorldModel): string[] {
  const room = world.getEntity(roomId);
  if (!room) return [];

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait) return [];

  const adjacent: string[] = [];
  const exits = roomTrait.exits || {};

  for (const [_direction, exit] of Object.entries(exits)) {
    if (typeof exit === 'string') {
      adjacent.push(exit);
    } else if (exit && typeof exit === 'object' && 'destination' in exit) {
      adjacent.push((exit as any).destination);
    }
  }

  return adjacent;
}

/**
 * Check if sword is carried by player
 */
function swordIsCarried(world: WorldModel): boolean {
  if (!swordId || !playerId) return false;

  const location = world.getLocation(swordId);
  return location === playerId;
}

/**
 * Calculate the appropriate glow level based on villain proximity
 */
function calculateGlowLevel(world: WorldModel, playerLocation: string): number {
  // Check same room first (bright glow)
  if (roomHasVillain(playerLocation, world)) {
    return GLOW_BRIGHT;
  }

  // Check adjacent rooms (faint glow)
  const adjacentRooms = getAdjacentRooms(playerLocation, world);
  for (const adjacentId of adjacentRooms) {
    if (roomHasVillain(adjacentId, world)) {
      return GLOW_FAINT;
    }
  }

  // No villains nearby
  return GLOW_OFF;
}

/**
 * Create the sword glow daemon
 */
function createSwordGlowDaemon(): Daemon {
  return {
    id: SWORD_GLOW_DAEMON,
    name: 'Sword Glow',
    priority: 5, // Lower priority - cosmetic effect

    // Only run when sword is carried by player
    condition: (ctx: SchedulerContext): boolean => {
      // Find entities if not cached
      if (!swordId) {
        swordId = findSword(ctx.world);
      }
      if (!playerId) {
        playerId = findPlayer(ctx.world);
      }

      // Need both sword and player
      if (!swordId || !playerId) return false;

      // Only active when sword is carried
      return swordIsCarried(ctx.world);
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      // Get player's current room
      const playerLocation = ctx.playerLocation;
      if (!playerLocation) return events;

      // Calculate new glow level
      const newGlowLevel = calculateGlowLevel(ctx.world, playerLocation);

      // Only emit message if glow state changed
      if (newGlowLevel !== currentGlowLevel) {
        let messageId: string;

        switch (newGlowLevel) {
          case GLOW_BRIGHT:
            messageId = SwordGlowMessages.GLOW_BRIGHT;
            break;
          case GLOW_FAINT:
            messageId = SwordGlowMessages.GLOW_FAINT;
            break;
          default:
            messageId = SwordGlowMessages.GLOW_OFF;
            break;
        }

        events.push({
          id: `sword-glow-${ctx.turn}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: { instrument: swordId! },
          data: {
            messageId,
            daemonId: SWORD_GLOW_DAEMON,
            previousLevel: currentGlowLevel,
            newLevel: newGlowLevel
          },
          narrate: true
        });

        // Update current level
        currentGlowLevel = newGlowLevel;
      }

      return events;
    }
  };
}

/**
 * Register the sword glow daemon
 */
export function registerSwordGlowDaemon(scheduler: ISchedulerService): void {
  // Reset state
  currentGlowLevel = GLOW_OFF;
  swordId = null;
  playerId = null;

  scheduler.registerDaemon(createSwordGlowDaemon());
}

/**
 * Get current sword glow state for debugging
 */
export function getSwordGlowState(): {
  swordId: string | null;
  glowLevel: number;
  glowName: string;
} {
  const glowNames = ['off', 'faint', 'bright'];
  return {
    swordId,
    glowLevel: currentGlowLevel,
    glowName: glowNames[currentGlowLevel] || 'unknown'
  };
}

/**
 * Reset glow state (for testing or game restart)
 */
export function resetSwordGlowState(): void {
  currentGlowLevel = GLOW_OFF;
  swordId = null;
  playerId = null;
}
