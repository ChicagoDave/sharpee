/**
 * Thief NPC Behavior (ADR-070; ADR-328 D5)
 *
 * Complex behavior implementing Mainframe Zork's Thief:
 * - Wandering: Random movement through underground
 * - Stalking: Following player when they have valuables
 * - Stealing: Taking items from player and rooms
 * - Returning: Bringing loot back to lair
 * - Fighting: Combat when late-game
 * - Fleeing: Escaping when wounded
 *
 * Special mechanics:
 * - Opens jeweled egg when depositing treasures at lair (canonical MDL act1.254:1078-1099)
 * - Combat difficulty scales with player score
 *
 * Every act is a real action run as the thief through the engine's
 * execution entry: a step is `going`, a take from the room is `taking`, a
 * theft from the player is Dungeo's `stealing`, a blow is `attacking`
 * through the melee interceptor. The world's rules apply — a take an
 * interceptor refuses does not happen, and the thief knows it. The lair
 * deposit is authorial mutation (concealed drops), kept direct.
 */

import { type NpcBehavior, type NpcContext, IFActions } from '@sharpee/stdlib';
import { IFEntity, NpcTrait, OpenableTrait, IdentityTrait } from '@sharpee/world-model';

import { ThiefMessages } from './thief-messages';
import { STEAL_ACTION_ID } from '../../actions/stealing';
import { EggTrait } from '../../traits';
import { ThiefCustomProperties } from './thief-entity';
import {
  getThiefProps,
  findPlayerTreasures,
  findRoomTreasures,
  isCarryingEgg,
  isAtLair,
  depositTreasures,
  isThiefDisabled,
  decrementCooldowns,
  shouldEscalateToCombat,
  getThiefCombatDecision,
} from './thief-helpers';

import { definePoint } from '@sharpee/core';

// ADR-293 D2: the thief's declared draw points. Steal/move/notice/gloat are
// forceable yes/no choice points; the exit pick is a plain draw (dynamic
// class set, D4) shared by every wander/flee site.
const THIEF_NOTICE_POINT = definePoint('dungeo.thief.notice-valuables', { classes: ['yes', 'no'] });
const THIEF_MOVE_POINT = definePoint('dungeo.thief.move', { classes: ['yes', 'no'] });
const THIEF_STEAL_POINT = definePoint('dungeo.thief.steal', { classes: ['yes', 'no'] });
const THIEF_GLOAT_POINT = definePoint('dungeo.thief.gloat', { classes: ['yes', 'no'] });
const THIEF_EXIT_POINT = definePoint('dungeo.thief.exit');

// Constants
const MOVE_CHANCE = 0.33;           // 33% chance to move each turn
const STEAL_CHANCE = 0.4;           // 40% chance to steal when opportunity arises
const STEAL_COOLDOWN = 5;           // Turns between steals
const MAX_CARRY_BEFORE_RETURN = 3;  // Items before heading home
// FLEE_HEALTH_THRESHOLD removed — flee decision now uses canonical WINNING? (melee.137:287-293)

/**
 * The Thief's NPC behavior implementation
 */
export const thiefBehavior: NpcBehavior = {
  id: 'thief',
  name: 'Thief Behavior',

  /**
   * Main turn logic - state machine dispatcher
   */
  onTurn(context: NpcContext): void {
    const props = getThiefProps(context.npc);
    if (!props) return;

    // Check global disabled flag (GDT NR command)
    if (isThiefDisabled(context.world)) {
      return;
    }

    // Check state-level disabled
    if (props.state === 'DISABLED') {
      return;
    }

    // Decrement cooldowns
    decrementCooldowns(props);

    // Priority 1: Lair deposit (canonical MDL act1.254:1078-1099)
    // When at lair and player absent, deposit treasures and open egg.
    // This fires regardless of state — even in FIGHTING, the thief deposits
    // when the player is gone (canonical behavior).
    if (handleLairDeposit(context)) {
      return;
    }

    // Priority 2: Handle fighting state (includes WINNING? flee decision)
    if (props.state === 'FIGHTING') {
      handleFightingState(context, props);
      return;
    }

    // Track engrossed flag: thief is engrossed while carrying the egg
    if (isCarryingEgg(context)) {
      context.npc.attributes.thiefEngrossed = true;
    } else {
      context.npc.attributes.thiefEngrossed = false;
    }

    // Priority 3: Late-game combat escalation (canonical WINNING?)
    if (shouldEscalateToCombat(context) && !props.hasBeenAttacked) {
      props.state = 'FIGHTING';
      handleFightingState(context, props);
      return;
    }

    // State machine dispatch
    switch (props.state) {
      case 'WANDERING':
        handleWanderingState(context, props);
        return;
      case 'STALKING':
        handleStalkingState(context, props);
        return;
      case 'STEALING':
        handleStealingState(context, props);
        return;
      case 'RETURNING':
        handleReturningState(context, props);
        return;
      case 'FLEEING':
        handleFleeingState(context, props);
        return;
      default:
        return;
    }
  },

  /**
   * When player enters thief's room
   */
  onPlayerEnters(context: NpcContext): void {
    const props = getThiefProps(context.npc);
    if (!props || props.state === 'DISABLED') return;
    if (isThiefDisabled(context.world)) return;

    // Update tracking
    props.lastKnownPlayerRoom = context.playerLocation;

    // Check if player has valuables - thief notices
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0 && context.random.chance(THIEF_NOTICE_POINT, 0.5)) {
      context.narrate(ThiefMessages.NOTICES_VALUABLES, { npcName: context.npc.name });
      return;
    }

    // Otherwise just appear
    context.narrate(ThiefMessages.APPEARS, { npcName: context.npc.name });
  },

  /**
   * When player leaves thief's room
   */
  onPlayerLeaves(context: NpcContext): void {
    const props = getThiefProps(context.npc);
    if (!props || props.state === 'DISABLED') return;

    // Update last known location for stalking
    props.lastKnownPlayerRoom = context.playerLocation;
  },

  /**
   * Get serializable state for save/load
   */
  getState(npc: IFEntity): Record<string, unknown> {
    const trait = npc.get(NpcTrait);
    return trait?.customProperties ?? {};
  },

  /**
   * Restore state after load
   */
  setState(npc: IFEntity, state: Record<string, unknown>): void {
    const trait = npc.get(NpcTrait);
    if (trait) {
      trait.customProperties = state;
    }
  }
};

// ============= Acts =============

/** Step through an exit — the real going action as the thief. */
function go(context: NpcContext, direction: string): boolean {
  return context.act(IFActions.GOING, { direction: direction as never }).success;
}

/** Take an item from the room — the real taking action as the thief; false when the world refused. */
function take(context: NpcContext, item: IFEntity): boolean {
  return context.act(IFActions.TAKING, { directObject: item }).success;
}

/** Steal an item out of the player's possession — Dungeo's stealing action as the thief. */
function steal(context: NpcContext, item: IFEntity): boolean {
  return context.act(STEAL_ACTION_ID, { directObject: item }).success;
}

// ============= State Handlers =============

/**
 * WANDERING: Random movement, looking for opportunities
 */
function handleWanderingState(context: NpcContext, props: ThiefCustomProperties): void {
  // Check if player is visible with valuables -> STALKING
  if (context.playerVisible) {
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0) {
      props.state = 'STALKING';
      props.lastKnownPlayerRoom = context.playerLocation;
      handleStalkingState(context, props);
      return;
    }
  }

  // Check room for unattended treasures -> STEALING
  const roomTreasures = findRoomTreasures(context);
  if (roomTreasures.length > 0 && !context.playerVisible) {
    props.state = 'STEALING';
    handleStealingState(context, props);
    return;
  }

  // Random movement
  if (context.random.chance(THIEF_MOVE_POINT, MOVE_CHANCE)) {
    const exits = context.getAvailableExits();
    if (exits.length > 0) {
      const exit = context.random.pick(THIEF_EXIT_POINT, exits);
      go(context, exit.direction);
      props.turnsInRoom = 0;
    }
  } else {
    props.turnsInRoom++;
  }
}

/**
 * STALKING: Following player, waiting for steal opportunity
 */
function handleStalkingState(context: NpcContext, props: ThiefCustomProperties): void {
  if (context.playerVisible) {
    // Update tracking
    props.lastKnownPlayerRoom = context.playerLocation;

    // Try to steal if cooldown is up
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0 && props.stealCooldown <= 0 && context.random.chance(THIEF_STEAL_POINT, STEAL_CHANCE)) {
      props.state = 'STEALING';
      handleStealingState(context, props);
      return;
    }

    // Otherwise just lurk and maybe gloat
    if (context.random.chance(THIEF_GLOAT_POINT, 0.2)) {
      context.narrate(ThiefMessages.GLOATS, { npcName: context.npc.name });
    }
    return;
  }

  // Player not visible - try to follow
  if (props.lastKnownPlayerRoom && props.lastKnownPlayerRoom !== context.npcLocation) {
    const exits = context.getAvailableExits();
    const exitToPlayer = exits.find(e => e.destination === props.lastKnownPlayerRoom);
    if (exitToPlayer) {
      go(context, exitToPlayer.direction);
      return;
    }
  }

  // Lost the player - go back to wandering
  props.state = 'WANDERING';
  props.lastKnownPlayerRoom = null;
}

/**
 * STEALING: Taking items from player or room
 */
function handleStealingState(context: NpcContext, props: ThiefCustomProperties): void {
  // Priority: steal from player if visible
  if (context.playerVisible) {
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0) {
      // Take highest value item
      const target = playerTreasures[0];
      const identity = target.get(IdentityTrait);
      const itemName = identity?.name ?? 'item';

      if (steal(context, target)) {
        context.narrate(ThiefMessages.STEALS_FROM_PLAYER, { itemName });
      }

      props.stealCooldown = STEAL_COOLDOWN;

      // Check if we should return to lair
      const droppable = depositTreasures(context);
      if (droppable.length >= MAX_CARRY_BEFORE_RETURN) {
        props.state = 'RETURNING';
      } else {
        props.state = 'WANDERING';
      }
      return;
    }
  }

  // Otherwise steal from room
  const roomTreasures = findRoomTreasures(context);
  if (roomTreasures.length > 0) {
    const target = roomTreasures[0];

    const taken = take(context, target);

    // Silent steal from room (player might not be watching)
    if (taken && context.playerVisible) {
      const identity = target.get(IdentityTrait);
      context.narrate(ThiefMessages.STEALS_FROM_ROOM, { itemName: identity?.name ?? 'something' });
    }

    props.stealCooldown = STEAL_COOLDOWN;

    // Check if we should return to lair
    const droppable = depositTreasures(context);
    if (droppable.length >= MAX_CARRY_BEFORE_RETURN) {
      props.state = 'RETURNING';
    } else {
      props.state = 'WANDERING';
    }
    return;
  }

  // Nothing to steal, go back to wandering
  props.state = 'WANDERING';
}

/**
 * RETURNING: Heading back to lair with loot
 *
 * Deposit is handled by Priority 1 (handleLairDeposit) when the player
 * is absent. Here we just transition to WANDERING once at lair, or
 * move toward it if not there yet.
 */
function handleReturningState(context: NpcContext, props: ThiefCustomProperties): void {
  // At lair — Priority 1 handles deposit when player is absent
  if (isAtLair(context)) {
    props.state = 'WANDERING';
    return;
  }

  // Not at lair - move toward it
  const exits = context.getAvailableExits();
  if (exits.length > 0) {
    const exitToLair = exits.find(e => e.destination === props.lairRoomId);
    if (exitToLair) {
      go(context, exitToLair.direction);
      return;
    }
    const exit = context.random.pick(THIEF_EXIT_POINT, exits);
    go(context, exit.direction);
  }
}

/**
 * FIGHTING: In combat with player (canonical WINNING? AI, melee.137:287-293)
 *
 * Each combat turn, the thief evaluates his strength vs the hero's:
 * - !shouldStay → flee the room (transition back to WANDERING)
 *   BUT: thief NEVER flees from his lair (Treasure Room) — guards it to the death
 * - shouldAttack → attack the player
 * - !shouldAttack but shouldStay → hesitate (circle warily)
 */
function handleFightingState(context: NpcContext, props: ThiefCustomProperties): void {
  // If player is visible, use WINNING? to decide fight/flee
  if (context.playerVisible) {
    const { shouldAttack, shouldStay } = getThiefCombatDecision(context);

    // Canonical MDL: thief guards his lair (Treasure Room) to the death.
    // He never flees from his own hideaway. (act1.mud:1387-1420)
    const inLair = context.npcLocation === props.lairRoomId;

    if (!shouldStay && !inLair) {
      // Flee: emit message, leave room, go back to wandering
      context.narrate(ThiefMessages.FLEES, { npcName: context.npc.name });

      const exits = context.getAvailableExits();
      if (exits.length > 0) {
        // Try to head toward lair, otherwise pick random exit
        const exitToLair = exits.find(e => e.destination === props.lairRoomId);
        const exit = exitToLair ?? context.random.pick(THIEF_EXIT_POINT, exits);
        go(context, exit.direction);
      }

      props.state = 'WANDERING';
      return;
    }

    if (shouldAttack) {
      const player = context.world.getPlayer();
      if (player) {
        context.narrate(ThiefMessages.ATTACKS, { npcName: context.npc.name });
        // The real attacking action — the melee interceptor resolves the blow
        context.act(IFActions.ATTACKING, { directObject: player });
      }
    }

    // shouldStay but !shouldAttack — hesitate (no action, just stay in room)
    return;
  }

  // Player fled - chase them
  if (props.lastKnownPlayerRoom && props.lastKnownPlayerRoom !== context.npcLocation) {
    const exits = context.getAvailableExits();
    const exitToPlayer = exits.find(e => e.destination === props.lastKnownPlayerRoom);
    if (exitToPlayer) {
      go(context, exitToPlayer.direction);
      return;
    }
  }

  // Lost player - back to wandering but stay hostile
  props.state = 'WANDERING';
}

/**
 * FLEEING: Running away when wounded
 */
function handleFleeingState(context: NpcContext, props: ThiefCustomProperties): void {
  // Head toward lair
  if (isAtLair(context)) {
    // At lair, stay here to recover
    props.state = 'WANDERING';
    return;
  }

  const exits = context.getAvailableExits();
  if (exits.length > 0) {
    // Try to get to lair; otherwise a random exit (away from the player if
    // visible — the pick is random either way)
    const exitToLair = exits.find(e => e.destination === props.lairRoomId);
    const exit = exitToLair ?? context.random.pick(THIEF_EXIT_POINT, exits);
    go(context, exit.direction);
  }
}

// ============= Special Mechanics =============

/**
 * Handle lair deposit (canonical MDL ROBBER function, act1.254:1078-1099)
 *
 * When the thief is at his lair (Treasure Room) and the player is NOT present,
 * he deposits all carried treasures in the room. If the egg is among them, he
 * opens it (sets OpenableTrait.isOpen = true), making the canary inside accessible.
 * The canary already exists inside the egg from world setup (forest.ts).
 *
 * This is authorial mutation, not an act: the drops are CONCEALED (MDL:
 * OVISON bit cleared) until the thief dies, which no standard action says.
 *
 * @returns true when a deposit happened (the thief's turn is spent)
 */
function handleLairDeposit(context: NpcContext): boolean {
  // Only fire when at lair AND player is NOT in the room (MDL: <N==? .RM .WROOM>)
  if (!isAtLair(context) || context.playerVisible) {
    return false;
  }

  const droppable = depositTreasures(context);
  if (droppable.length === 0) {
    return false;
  }

  for (const item of droppable) {
    // Special egg handling (MDL act1.254:1097-1099):
    // If item is the egg, open it so the canary inside becomes accessible
    const eggTrait = item.get(EggTrait);
    if (eggTrait && !eggTrait.hasBeenOpened) {
      const openable = item.get(OpenableTrait);
      if (openable && !openable.isOpen) {
        openable.isOpen = true;
      }
      eggTrait.hasBeenOpened = true;
    }

    // Drop item in the Treasure Room, concealed (MDL: OVISON bit cleared)
    // Items become visible when the thief dies
    context.world.moveEntity(item.id, context.npcLocation);
    const identity = item.get(IdentityTrait);
    if (identity) {
      identity.concealed = true;
    }
  }

  // Clear engrossed flag — treasures deposited
  context.npc.attributes.thiefEngrossed = false;

  return true;
}
