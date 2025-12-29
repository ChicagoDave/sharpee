/**
 * Thief NPC Helper Functions
 *
 * Utility functions for:
 * - Treasure detection and valuation
 * - Player inventory inspection
 * - State management
 * - Room traversal
 */

import { IFEntity, WorldModel, NpcTrait, IdentityTrait } from '@sharpee/world-model';
import { NpcContext } from '@sharpee/stdlib';
import { ThiefCustomProperties, ThiefState } from './thief-entity';

// Key for storing thief disabled state in world data store
const THIEF_DISABLED_KEY = 'dungeo.thief.disabled';

/**
 * Check if an entity is a treasure (something worth stealing)
 */
export function isTreasure(entity: IFEntity): boolean {
  const entityAny = entity as any;

  // Check for explicit treasure marking
  if (entityAny.isTreasure === true) {
    return true;
  }

  // Check for treasure value
  if (typeof entityAny.treasureValue === 'number' && entityAny.treasureValue > 0) {
    return true;
  }

  // Check for trophy case value
  if (typeof entityAny.trophyCaseValue === 'number' && entityAny.trophyCaseValue > 0) {
    return true;
  }

  return false;
}

/**
 * Get the value of a treasure (for prioritization)
 */
export function getTreasureValue(entity: IFEntity): number {
  const entityAny = entity as any;
  const baseValue = entityAny.treasureValue ?? 0;
  const caseValue = entityAny.trophyCaseValue ?? 0;
  return baseValue + caseValue;
}

/**
 * Find all treasures in a container (player, NPC, or room)
 */
export function findTreasuresIn(world: WorldModel, containerId: string): IFEntity[] {
  const container = world.getEntity(containerId);
  if (!container) return [];

  // Get all entities in this container using getContents
  const contents = world.getContents(containerId);

  // Filter to treasures and sort by value (highest first)
  return contents
    .filter((entity: IFEntity) => isTreasure(entity))
    .sort((a: IFEntity, b: IFEntity) => getTreasureValue(b) - getTreasureValue(a));
}

/**
 * Find treasures the player is carrying
 */
export function findPlayerTreasures(context: NpcContext): IFEntity[] {
  const player = context.world.getPlayer();
  if (!player) return [];

  return findTreasuresIn(context.world, player.id);
}

/**
 * Find treasures in the NPC's current room (not held by anyone)
 */
export function findRoomTreasures(context: NpcContext): IFEntity[] {
  return findTreasuresIn(context.world, context.npcLocation);
}

/**
 * Check if thief is carrying the jeweled egg
 */
export function isCarryingEgg(context: NpcContext): boolean {
  return context.npcInventory.some(item => {
    const identity = item.get(IdentityTrait);
    const name = identity?.name?.toLowerCase() ?? '';
    return name.includes('egg') || (item as any).treasureId === 'egg';
  });
}

/**
 * Get the jeweled egg from thief's inventory (if present)
 */
export function getEggFromInventory(context: NpcContext): IFEntity | undefined {
  return context.npcInventory.find(item => {
    const identity = item.get(IdentityTrait);
    const name = identity?.name?.toLowerCase() ?? '';
    return name.includes('egg') || (item as any).treasureId === 'egg';
  });
}

/**
 * Get thief's custom properties (state machine data)
 */
export function getThiefProps(npc: IFEntity): ThiefCustomProperties | undefined {
  const npcTrait = npc.get(NpcTrait);
  if (!npcTrait?.customProperties) return undefined;
  return npcTrait.customProperties as unknown as ThiefCustomProperties;
}

/**
 * Update thief's state
 */
export function setThiefState(npc: IFEntity, newState: ThiefState): void {
  const npcTrait = npc.get(NpcTrait);
  if (npcTrait?.customProperties) {
    (npcTrait.customProperties as unknown as ThiefCustomProperties).state = newState;
  }
}

/**
 * Check if thief is at his lair (Treasure Room)
 */
export function isAtLair(context: NpcContext): boolean {
  const props = getThiefProps(context.npc);
  return props ? context.npcLocation === props.lairRoomId : false;
}

/**
 * Check if an item is the stiletto (thief shouldn't drop his weapon)
 */
export function isStilettoItem(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  const name = identity?.name?.toLowerCase() ?? '';
  return name.includes('stiletto');
}

/**
 * Get all items thief is carrying except the stiletto
 */
export function getDroppableItems(context: NpcContext): IFEntity[] {
  return context.npcInventory.filter(item => !isStilettoItem(item));
}

/**
 * Check if the thief is disabled (via GDT NR command)
 */
export function isThiefDisabled(world: WorldModel): boolean {
  // Access world state through data store
  const dataStore = world.getDataStore();
  return dataStore.state[THIEF_DISABLED_KEY] === true;
}

/**
 * Set the thief disabled state (via GDT commands)
 */
export function setThiefDisabled(world: WorldModel, disabled: boolean): void {
  const dataStore = world.getDataStore();
  dataStore.state[THIEF_DISABLED_KEY] = disabled;
}

/**
 * Decrement cooldown timers
 */
export function decrementCooldowns(props: ThiefCustomProperties): void {
  if (props.stealCooldown > 0) {
    props.stealCooldown--;
  }
}

/**
 * Get player's current score (for combat scaling)
 */
export function getPlayerScore(world: WorldModel): number {
  // Try to access scoring capability
  const worldAny = world as any;
  const scoring = worldAny.getCapability?.('scoring');
  return scoring?.scoreValue ?? 0;
}

/**
 * Check if we should escalate to combat (late-game hostility)
 *
 * Thief becomes aggressive when player has high score.
 */
export function shouldEscalateToCombat(context: NpcContext): boolean {
  const SCORE_THRESHOLD = 150;
  const ESCALATION_CHANCE = 0.3;

  const playerScore = getPlayerScore(context.world);

  if (playerScore >= SCORE_THRESHOLD && context.playerVisible) {
    return context.random.chance(ESCALATION_CHANCE);
  }

  return false;
}

/**
 * Get the player entity
 */
export function getPlayer(world: WorldModel): IFEntity | undefined {
  return world.getPlayer();
}
