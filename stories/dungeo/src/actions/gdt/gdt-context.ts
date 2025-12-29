/**
 * GDT Context Factory
 *
 * Creates the context object passed to GDT command handlers.
 * Provides helper methods for inspecting and modifying game state.
 * Uses AuthorModel for mutations to bypass game rules (ADR-014).
 */

import { WorldModel, IFEntity, EntityType, AuthorModel } from '@sharpee/world-model';
import { GDTContext, GDTFlags, DEFAULT_GDT_FLAGS, GDT_STATE_KEY } from './types';

/**
 * Get GDT flags from world state
 */
export function getGDTFlags(world: WorldModel): GDTFlags {
  const stored = world.getStateValue(GDT_STATE_KEY) as Partial<GDTFlags> | undefined;
  return { ...DEFAULT_GDT_FLAGS, ...stored };
}

/**
 * Set GDT flags in world state
 */
export function setGDTFlags(world: WorldModel, flags: GDTFlags): void {
  world.setStateValue(GDT_STATE_KEY, flags);
}

/**
 * Check if GDT mode is currently active
 */
export function isGDTActive(world: WorldModel): boolean {
  return getGDTFlags(world).active;
}

/**
 * Create a GDT context for command handlers
 */
export function createGDTContext(world: WorldModel): GDTContext {
  const player = world.getPlayer();
  if (!player) {
    throw new Error('No player entity found');
  }

  const flags = getGDTFlags(world);

  // Create AuthorModel for unrestricted mutations (ADR-014)
  // This allows GDT to move entities into closed containers, etc.
  const authorModel = new AuthorModel(world.getDataStore(), world);

  return {
    world,
    player,
    flags,

    findEntity(idOrName: string): IFEntity | undefined {
      // Try by ID first
      let entity = world.getEntity(idOrName);
      if (entity) return entity;

      // Try by name or alias (case-insensitive)
      const lowerName = idOrName.toLowerCase();
      for (const e of world.getAllEntities()) {
        const identity = e.get('identity') as { name?: string; aliases?: string[] } | undefined;
        // Check primary name
        if (identity?.name?.toLowerCase() === lowerName) {
          return e;
        }
        // Check aliases
        if (identity?.aliases) {
          for (const alias of identity.aliases) {
            if (alias.toLowerCase() === lowerName) {
              return e;
            }
          }
        }
      }
      return undefined;
    },

    findRoom(idOrName: string): IFEntity | undefined {
      const entity = this.findEntity(idOrName);
      if (entity && entity.has('room')) {
        return entity;
      }
      return undefined;
    },

    listRooms(): IFEntity[] {
      return world.getAllEntities().filter(e => e.has('room'));
    },

    listObjects(): IFEntity[] {
      return world.getAllEntities().filter(e =>
        e.type === EntityType.OBJECT || e.type === EntityType.CONTAINER
      );
    },

    getPlayerLocation(): IFEntity | undefined {
      const location = world.getLocation(player.id);
      if (!location) return undefined;
      return world.getEntity(location);
    },

    getInventory(): IFEntity[] {
      return world.getContents(player.id);
    },

    setFlag(name: keyof GDTFlags, value: boolean): void {
      const currentFlags = getGDTFlags(world);
      currentFlags[name] = value;
      setGDTFlags(world, currentFlags);
      // Update local copy
      (this.flags as GDTFlags)[name] = value;
    },

    teleportPlayer(roomId: string): boolean {
      const room = this.findRoom(roomId);
      if (!room) return false;
      // Use AuthorModel to bypass game rules (can teleport anywhere)
      authorModel.moveEntity(player.id, room.id);
      return true;
    },

    moveObject(objectId: string, locationId: string): boolean {
      const obj = this.findEntity(objectId);
      if (!obj) return false;

      // Handle special location 'player' or 'inventory'
      const targetId = (locationId === 'player' || locationId === 'inventory')
        ? player.id
        : locationId;

      const target = this.findEntity(targetId);
      if (!target && targetId !== player.id) return false;

      // Use AuthorModel to bypass game rules (can move into closed containers, etc.)
      authorModel.moveEntity(obj.id, targetId);
      return true;
    }
  };
}
