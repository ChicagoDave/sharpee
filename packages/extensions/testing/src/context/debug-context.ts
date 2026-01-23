/**
 * Debug Context Implementation
 *
 * Provides a unified context for debug and test commands to interact with the game world.
 * Generalizes the pattern from Dungeo's GDTContext.
 */

import type { WorldModel, IFEntity } from '@sharpee/world-model';
import { AuthorModel } from '@sharpee/world-model';
import type { DebugContext } from '../types.js';

/**
 * Create a debug context for the given world
 */
export function createDebugContext(world: WorldModel): DebugContext {
  // Create AuthorModel for bypassing game rules
  const author = new AuthorModel(world.getDataStore(), world);

  // Debug flags storage
  const flags = new Map<string, boolean>();

  // Find player entity
  const player = world.getPlayer();
  if (!player) {
    throw new Error('Cannot create debug context: no player entity found');
  }

  const context: DebugContext = {
    world,
    author,
    player,
    flags,

    // ========================================================================
    // Entity Lookup
    // ========================================================================

    findEntity(idOrName: string): IFEntity | undefined {
      // Try exact ID match first
      const byId = world.getEntity(idOrName);
      if (byId) return byId;

      // Normalize search term: lowercase, convert hyphens to spaces
      const searchLower = idOrName.toLowerCase();
      const searchNormalized = searchLower.replace(/-/g, ' ');
      const allEntities = world.getAllEntities();

      // Exact name match (with normalized search)
      const exactMatch = allEntities.find(
        (e) => e.name?.toLowerCase() === searchNormalized ||
               e.name?.toLowerCase() === searchLower
      );
      if (exactMatch) return exactMatch;

      // Partial name match (with normalized search)
      const partialMatch = allEntities.find(
        (e) => e.name?.toLowerCase().includes(searchNormalized) ||
               e.name?.toLowerCase().includes(searchLower)
      );
      if (partialMatch) return partialMatch;

      // ID contains search term
      const idMatch = allEntities.find(
        (e) => e.id.toLowerCase().includes(searchLower)
      );
      return idMatch;
    },

    findRoom(idOrName: string): IFEntity | undefined {
      const entity = context.findEntity(idOrName);
      if (entity && entity.type === 'room') {
        return entity;
      }

      // Search only rooms
      const searchLower = idOrName.toLowerCase();
      const rooms = world.getAllEntities().filter((e) => e.type === 'room');

      const exactMatch = rooms.find(
        (r) => r.name?.toLowerCase() === searchLower
      );
      if (exactMatch) return exactMatch;

      const partialMatch = rooms.find(
        (r) => r.name?.toLowerCase().includes(searchLower) ||
               r.id.toLowerCase().includes(searchLower)
      );
      return partialMatch;
    },

    findEntities(predicate: (entity: IFEntity) => boolean): IFEntity[] {
      return world.getAllEntities().filter(predicate);
    },

    // ========================================================================
    // Location Queries
    // ========================================================================

    getPlayerLocation(): IFEntity | undefined {
      const locationId = world.getLocation(player.id);
      if (!locationId) return undefined;
      return world.getEntity(locationId);
    },

    getInventory(): IFEntity[] {
      return world.getContents(player.id);
    },

    getContents(locationId: string): IFEntity[] {
      return world.getContents(locationId);
    },

    // ========================================================================
    // Mutations (bypass game rules via AuthorModel)
    // ========================================================================

    teleportPlayer(roomId: string): boolean {
      const room = context.findRoom(roomId);
      if (!room) return false;

      author.moveEntity(player.id, room.id);
      return true;
    },

    moveObject(objectId: string, locationId: string): boolean {
      const object = context.findEntity(objectId);
      const location = context.findEntity(locationId);

      if (!object || !location) return false;

      author.moveEntity(object.id, location.id);
      return true;
    },

    takeObject(objectId: string): boolean {
      const object = context.findEntity(objectId);
      if (!object) return false;

      author.moveEntity(object.id, player.id);
      return true;
    },

    removeObject(objectId: string): boolean {
      const object = context.findEntity(objectId);
      if (!object) return false;

      // Move to limbo (null location)
      author.moveEntity(object.id, 'limbo');
      return true;
    },

    spawnObject(objectId: string, locationId: string): boolean {
      const object = context.findEntity(objectId);
      const location = context.findEntity(locationId);

      if (!object || !location) return false;

      author.moveEntity(object.id, location.id);
      return true;
    },

    // ========================================================================
    // Flag Operations
    // ========================================================================

    setFlag(name: string, value: boolean): void {
      flags.set(name, value);
    },

    getFlag(name: string): boolean {
      return flags.get(name) ?? false;
    },
  };

  return context;
}

/**
 * Format entity for debug display
 */
export function formatEntity(entity: IFEntity): string {
  const traitTypes = entity.traits
    ? Array.from(entity.traits.values()).map((t) => t.type.split('.').pop()).join(', ')
    : 'none';
  return `${entity.id} (${entity.name || 'unnamed'}) [${traitTypes}]`;
}

/**
 * Format location chain for an entity
 */
export function formatLocationChain(entity: IFEntity, world: WorldModel): string {
  const chain: string[] = [entity.id];
  let current = entity;
  let depth = 0;

  while (depth < 10) {
    const locationId = world.getLocation(current.id);
    if (!locationId) break;

    chain.push(locationId);
    const location = world.getEntity(locationId);
    if (!location) break;

    current = location;
    depth++;
  }

  return chain.join(' -> ');
}
