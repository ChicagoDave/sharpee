/**
 * Condition Evaluator for Smart Transcript Directives (ADR-092)
 *
 * Evaluates condition expressions against game state.
 *
 * Supported expressions:
 * - location = "Room Name"           - Player is in room with that name
 * - room contains "entity"           - Entity with that name is in current room
 * - inventory contains "item"        - Player has item with that name
 * - not inventory contains "item"    - Player does NOT have item
 * - entity "X" exists                - Entity with name X exists anywhere
 * - entity "X" alive                 - NPC entity is not dead
 * - entity "X" in "Room"             - Entity X is in specified room
 */

import { ConditionResult } from './types';

// WorldModel interface (minimal subset needed)
interface WorldModelLike {
  getLocation(entityId: string): string | null;
  getContents(containerId: string, options?: { includeWorn?: boolean }): any[];
  getEntity(entityId: string): any | null;
  findWhere(predicate: (entity: any) => boolean): any[];
  getAllEntities(): any[];
}

/**
 * Find an entity by name (searches identity.name and aliases)
 */
function findEntityByName(world: WorldModelLike, name: string): any | null {
  const nameLower = name.toLowerCase();

  const entities = world.findWhere((entity: any) => {
    const identity = entity.get?.('identity') || entity.traits?.get?.('identity');
    if (!identity) return false;

    const entityName = (identity.name || '').toLowerCase();
    const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

    return entityName === nameLower ||
           entityName.includes(nameLower) ||
           aliases.some((a: string) => a === nameLower || a.includes(nameLower));
  });

  return entities[0] || null;
}

/**
 * Find a room by name
 */
function findRoomByName(world: WorldModelLike, name: string): any | null {
  const nameLower = name.toLowerCase();

  const rooms = world.findWhere((entity: any) => {
    // Check if it's a room
    const roomTrait = entity.get?.('room') || entity.traits?.get?.('room');
    if (!roomTrait) return false;

    const identity = entity.get?.('identity') || entity.traits?.get?.('identity');
    if (!identity) return false;

    const entityName = (identity.name || '').toLowerCase();
    return entityName === nameLower || entityName.includes(nameLower);
  });

  return rooms[0] || null;
}

/**
 * Get player entity
 */
function getPlayer(world: WorldModelLike): any | null {
  const players = world.findWhere((entity: any) => {
    const identity = entity.get?.('identity') || entity.traits?.get?.('identity');
    return identity?.name === 'player' || identity?.name === 'yourself';
  });
  return players[0] || null;
}

/**
 * Get the name of a room by ID
 */
function getRoomName(world: WorldModelLike, roomId: string): string {
  const room = world.getEntity(roomId);
  if (!room) return roomId;

  const identity = room.get?.('identity') || room.traits?.get?.('identity');
  return identity?.name || roomId;
}

/**
 * Check if an entity is "alive" (for NPCs)
 */
function isEntityAlive(entity: any): boolean {
  // Check for NPC trait with health/alive status
  const npcTrait = entity.get?.('npc') || entity.traits?.get?.('npc');
  if (npcTrait) {
    // Check isDead flag
    if ((entity as any).isDead === true) return false;
    if (npcTrait.isDead === true) return false;
    // Check health
    if (npcTrait.health !== undefined && npcTrait.health <= 0) return false;
  }

  // Default to alive if no NPC trait or death indicators
  return true;
}

/**
 * Parse and evaluate a condition expression
 */
export function evaluateCondition(
  condition: string,
  world: WorldModelLike,
  playerId: string
): ConditionResult {
  const trimmed = condition.trim();

  // Handle negation prefix
  const isNegated = trimmed.toLowerCase().startsWith('not ');
  const expr = isNegated ? trimmed.slice(4).trim() : trimmed;

  // Try each pattern
  let result = tryLocationEquals(expr, world, playerId);
  if (result) return applyNegation(result, isNegated);

  result = tryRoomContains(expr, world, playerId);
  if (result) return applyNegation(result, isNegated);

  result = tryInventoryContains(expr, world, playerId);
  if (result) return applyNegation(result, isNegated);

  result = tryEntityExists(expr, world);
  if (result) return applyNegation(result, isNegated);

  result = tryEntityAlive(expr, world);
  if (result) return applyNegation(result, isNegated);

  result = tryEntityInRoom(expr, world);
  if (result) return applyNegation(result, isNegated);

  // Unknown condition format
  return {
    met: false,
    reason: `Unknown condition format: "${condition}"`
  };
}

/**
 * Apply negation to a result
 */
function applyNegation(result: ConditionResult, negate: boolean): ConditionResult {
  if (!negate) return result;
  return {
    met: !result.met,
    reason: `NOT (${result.reason})`
  };
}

/**
 * Pattern: location = "Room Name"
 */
function tryLocationEquals(
  expr: string,
  world: WorldModelLike,
  playerId: string
): ConditionResult | null {
  const match = expr.match(/^location\s*=\s*"([^"]+)"$/i);
  if (!match) return null;

  const targetRoomName = match[1];
  const currentRoomId = world.getLocation(playerId);

  if (!currentRoomId) {
    return { met: false, reason: `Player location unknown` };
  }

  const currentRoomName = getRoomName(world, currentRoomId);
  const met = currentRoomName.toLowerCase() === targetRoomName.toLowerCase() ||
              currentRoomName.toLowerCase().includes(targetRoomName.toLowerCase());

  return {
    met,
    reason: `Player is in "${currentRoomName}" (expected "${targetRoomName}")`
  };
}

/**
 * Pattern: room contains "entity"
 */
function tryRoomContains(
  expr: string,
  world: WorldModelLike,
  playerId: string
): ConditionResult | null {
  const match = expr.match(/^room\s+contains\s+"([^"]+)"$/i);
  if (!match) return null;

  const entityName = match[1];
  const currentRoomId = world.getLocation(playerId);

  if (!currentRoomId) {
    return { met: false, reason: `Player location unknown` };
  }

  // Get room contents
  const contents = world.getContents(currentRoomId);
  const entityNameLower = entityName.toLowerCase();

  const found = contents.some((item: any) => {
    const identity = item.get?.('identity') || item.traits?.get?.('identity');
    if (!identity) return false;

    const itemName = (identity.name || '').toLowerCase();
    const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

    return itemName === entityNameLower ||
           itemName.includes(entityNameLower) ||
           aliases.some((a: string) => a === entityNameLower || a.includes(entityNameLower));
  });

  const roomName = getRoomName(world, currentRoomId);
  return {
    met: found,
    reason: found
      ? `"${entityName}" found in ${roomName}`
      : `"${entityName}" not found in ${roomName}`
  };
}

/**
 * Pattern: inventory contains "item"
 */
function tryInventoryContains(
  expr: string,
  world: WorldModelLike,
  playerId: string
): ConditionResult | null {
  const match = expr.match(/^inventory\s+contains\s+"([^"]+)"$/i);
  if (!match) return null;

  const itemName = match[1];

  // Get player inventory
  const inventory = world.getContents(playerId, { includeWorn: true });
  const itemNameLower = itemName.toLowerCase();

  const found = inventory.some((item: any) => {
    const identity = item.get?.('identity') || item.traits?.get?.('identity');
    if (!identity) return false;

    const name = (identity.name || '').toLowerCase();
    const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());

    return name === itemNameLower ||
           name.includes(itemNameLower) ||
           aliases.some((a: string) => a === itemNameLower || a.includes(itemNameLower));
  });

  return {
    met: found,
    reason: found
      ? `"${itemName}" found in inventory`
      : `"${itemName}" not in inventory`
  };
}

/**
 * Pattern: entity "X" exists
 */
function tryEntityExists(
  expr: string,
  world: WorldModelLike
): ConditionResult | null {
  const match = expr.match(/^entity\s+"([^"]+)"\s+exists$/i);
  if (!match) return null;

  const entityName = match[1];
  const entity = findEntityByName(world, entityName);

  return {
    met: entity !== null,
    reason: entity
      ? `Entity "${entityName}" exists`
      : `Entity "${entityName}" not found`
  };
}

/**
 * Pattern: entity "X" alive
 */
function tryEntityAlive(
  expr: string,
  world: WorldModelLike
): ConditionResult | null {
  const match = expr.match(/^entity\s+"([^"]+)"\s+alive$/i);
  if (!match) return null;

  const entityName = match[1];
  const entity = findEntityByName(world, entityName);

  if (!entity) {
    return { met: false, reason: `Entity "${entityName}" not found` };
  }

  const alive = isEntityAlive(entity);
  return {
    met: alive,
    reason: alive
      ? `Entity "${entityName}" is alive`
      : `Entity "${entityName}" is dead`
  };
}

/**
 * Pattern: entity "X" in "Room"
 */
function tryEntityInRoom(
  expr: string,
  world: WorldModelLike
): ConditionResult | null {
  const match = expr.match(/^entity\s+"([^"]+)"\s+in\s+"([^"]+)"$/i);
  if (!match) return null;

  const entityName = match[1];
  const roomName = match[2];

  const entity = findEntityByName(world, entityName);
  if (!entity) {
    return { met: false, reason: `Entity "${entityName}" not found` };
  }

  const targetRoom = findRoomByName(world, roomName);
  if (!targetRoom) {
    return { met: false, reason: `Room "${roomName}" not found` };
  }

  const entityLocation = world.getLocation(entity.id);
  const met = entityLocation === targetRoom.id;

  const actualRoomName = entityLocation ? getRoomName(world, entityLocation) : 'unknown';
  return {
    met,
    reason: met
      ? `"${entityName}" is in "${roomName}"`
      : `"${entityName}" is in "${actualRoomName}", not "${roomName}"`
  };
}
