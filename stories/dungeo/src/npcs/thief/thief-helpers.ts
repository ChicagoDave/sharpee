/**
 * Thief NPC Helper Functions
 *
 * Utility functions for:
 * - Treasure detection and valuation
 * - Player inventory inspection
 * - State management
 * - Room traversal
 */

import { IFEntity, WorldModel, NpcTrait, IdentityTrait, StandardCapabilities } from '@sharpee/world-model';
import { NpcContext } from '@sharpee/stdlib';
import { ThiefCustomProperties, ThiefState } from './thief-entity';
import { TreasureTrait } from '../../traits';
import { fightStrength, isVillainWinning, VILLAIN_OSTRENGTH } from '../../combat/melee';
import { MELEE_STATE } from '../../combat/melee-state';

// Key for storing thief disabled state in world data store
const THIEF_DISABLED_KEY = 'dungeo.thief.disabled';

/**
 * Check if an entity is a treasure (something worth stealing)
 */
export function isTreasure(entity: IFEntity): boolean {
  const treasure = entity.get(TreasureTrait);
  return treasure !== undefined;
}

/**
 * Get the value of a treasure (for prioritization)
 */
export function getTreasureValue(entity: IFEntity): number {
  const treasure = entity.get(TreasureTrait);
  if (!treasure) return 0;
  return treasure.treasureValue + treasure.trophyCaseValue;
}

/**
 * Find all treasures in a container (player, NPC, or room)
 */
export function findTreasuresIn(world: WorldModel, containerId: string): IFEntity[] {
  const container = world.getEntity(containerId);
  if (!container) return [];

  // Get all entities in this container using getContents
  const contents = world.getContents(containerId);

  // Filter to visible treasures and sort by value (highest first)
  return contents
    .filter((entity: IFEntity) => {
      if (!isTreasure(entity)) return false;
      const identity = entity.get(IdentityTrait);
      return !identity?.concealed;
    })
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
    const treasure = item.get(TreasureTrait);
    return name.includes('egg') || treasure?.treasureId === 'jewel-encrusted-egg';
  });
}

/**
 * Get the jeweled egg from thief's inventory (if present)
 */
export function getEggFromInventory(context: NpcContext): IFEntity | undefined {
  return context.npcInventory.find(item => {
    const identity = item.get(IdentityTrait);
    const name = identity?.name?.toLowerCase() ?? '';
    const treasure = item.get(TreasureTrait);
    return name.includes('egg') || treasure?.treasureId === 'jewel-encrusted-egg';
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
 * Get treasures the thief should deposit at his lair (MDL: OTVAL > 0)
 */
export function depositTreasures(context: NpcContext): IFEntity[] {
  return context.npcInventory.filter(item => {
    const treasure = item.get(TreasureTrait);
    return treasure !== undefined && treasure.trophyCaseValue > 0;
  });
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
  const scoring = world.getCapability(StandardCapabilities.SCORING);
  return scoring?.scoreValue ?? 0;
}

/**
 * Get the thief's current melee OSTRENGTH from entity attributes.
 * Falls back to canonical base (5) if not yet initialized.
 */
function getThiefOstrength(npc: IFEntity): number {
  const stored = npc.attributes[MELEE_STATE.VILLAIN_OSTRENGTH];
  return typeof stored === 'number' ? stored : VILLAIN_OSTRENGTH.THIEF;
}

/**
 * Get the hero's current fight-strength (base + wound adjustment).
 */
function getHeroFightStrength(world: WorldModel): number {
  const score = getPlayerScore(world);
  const player = world.getPlayer();
  const woundAdjust = (player?.attributes?.[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;
  return fightStrength(score, woundAdjust);
}

/**
 * Canonical WINNING? decision for thief combat AI (melee.137:287-293).
 *
 * Uses actual strength comparison between thief and hero to decide:
 * - shouldAttack: whether the thief attacks this turn
 * - shouldStay: whether the thief stays in the room (vs flees)
 *
 * Replaces the old score-threshold + flat probability approach.
 */
export function getThiefCombatDecision(context: NpcContext): { shouldAttack: boolean; shouldStay: boolean } {
  const vs = getThiefOstrength(context.npc);
  const heroStr = getHeroFightStrength(context.world);

  return isVillainWinning({
    villainStrength: vs,
    heroFightStrength: heroStr,
    random: context.random,
  });
}

/**
 * Check if thief should escalate to combat (canonical WINNING?).
 *
 * The thief initiates combat when he's likely to win, based on actual
 * strength comparison. Early game (hero weak): very aggressive.
 * Late game (hero strong): cautious.
 */
export function shouldEscalateToCombat(context: NpcContext): boolean {
  if (!context.playerVisible) return false;
  const { shouldAttack } = getThiefCombatDecision(context);
  return shouldAttack;
}

/**
 * Get the player entity
 */
export function getPlayer(world: WorldModel): IFEntity | undefined {
  return world.getPlayer();
}
