/**
 * Thief NPC Behavior (ADR-070)
 *
 * Complex behavior implementing Mainframe Zork's Thief:
 * - Wandering: Random movement through underground
 * - Stalking: Following player when they have valuables
 * - Stealing: Taking items from player and rooms
 * - Returning: Bringing loot back to lair
 * - Fighting: Combat when attacked or late-game
 * - Fleeing: Escaping when wounded
 *
 * Special mechanics:
 * - Opens jeweled egg when depositing treasures at lair (canonical MDL act1.254:1078-1099)
 * - Combat difficulty scales with player score
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { IFEntity, NpcTrait, CombatantTrait, OpenableTrait, IdentityTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { ThiefMessages } from './thief-messages';
import { TreasureTrait, EggTrait } from '../../traits';
import { ThiefCustomProperties, ThiefState } from './thief-entity';
import {
  getThiefProps,
  setThiefState,
  findPlayerTreasures,
  findRoomTreasures,
  isCarryingEgg,
  getEggFromInventory,
  isAtLair,
  depositTreasures,
  isThiefDisabled,
  decrementCooldowns,
  shouldEscalateToCombat,
  getThiefCombatDecision,
  isStilettoItem,
  getTreasureValue
} from './thief-helpers';

// Constants
const MOVE_CHANCE = 0.33;           // 33% chance to move each turn
const STEAL_CHANCE = 0.4;           // 40% chance to steal when opportunity arises
const STEAL_COOLDOWN = 5;           // Turns between steals
const MAX_CARRY_BEFORE_RETURN = 3;  // Items before heading home
// FLEE_HEALTH_THRESHOLD removed — flee decision now uses canonical WINNING? (melee.137:287-293)

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `thief-bhv-${Date.now()}-${++eventCounter}`;
}

/**
 * The Thief's NPC behavior implementation
 */
export const thiefBehavior: NpcBehavior = {
  id: 'thief',
  name: 'Thief Behavior',

  /**
   * Main turn logic - state machine dispatcher
   */
  onTurn(context: NpcContext): NpcAction[] {
    const props = getThiefProps(context.npc);
    if (!props) return [];

    // Check global disabled flag (GDT NR command)
    if (isThiefDisabled(context.world)) {
      return [];
    }

    // Check state-level disabled
    if (props.state === 'DISABLED') {
      return [];
    }

    // Decrement cooldowns
    decrementCooldowns(props);

    // Priority 1: Lair deposit (canonical MDL act1.254:1078-1099)
    // When at lair and player absent, deposit treasures and open egg.
    // This fires regardless of state — even in FIGHTING, the thief deposits
    // when the player is gone (canonical behavior).
    const depositActions = handleLairDeposit(context, props);
    if (depositActions.length > 0) {
      return depositActions;
    }

    // Priority 2: Handle fighting state (includes WINNING? flee decision)
    if (props.state === 'FIGHTING') {
      return handleFightingState(context, props);
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
      return handleFightingState(context, props);
    }

    // State machine dispatch
    switch (props.state) {
      case 'WANDERING':
        return handleWanderingState(context, props);
      case 'STALKING':
        return handleStalkingState(context, props);
      case 'STEALING':
        return handleStealingState(context, props);
      case 'RETURNING':
        return handleReturningState(context, props);
      case 'FLEEING':
        return handleFleeingState(context, props);
      default:
        return [];
    }
  },

  /**
   * When player enters thief's room
   */
  onPlayerEnters(context: NpcContext): NpcAction[] {
    const props = getThiefProps(context.npc);
    if (!props || props.state === 'DISABLED') return [];
    if (isThiefDisabled(context.world)) return [];

    // Update tracking
    props.lastKnownPlayerRoom = context.playerLocation;

    // Check if player has valuables - thief notices
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0 && context.random.chance(0.5)) {
      return [{
        type: 'emote',
        messageId: ThiefMessages.NOTICES_VALUABLES,
        data: { npcName: context.npc.name }
      }];
    }

    // Otherwise just appear
    return [{
      type: 'emote',
      messageId: ThiefMessages.APPEARS,
      data: { npcName: context.npc.name }
    }];
  },

  /**
   * When player leaves thief's room
   */
  onPlayerLeaves(context: NpcContext): NpcAction[] {
    const props = getThiefProps(context.npc);
    if (!props || props.state === 'DISABLED') return [];

    // Update last known location for stalking
    props.lastKnownPlayerRoom = context.playerLocation;

    return [];
  },

  /**
   * When thief is attacked
   */
  onAttacked(context: NpcContext, attacker: IFEntity): NpcAction[] {
    const props = getThiefProps(context.npc);
    if (!props) return [];

    // Mark as attacked (permanent hostility)
    props.hasBeenAttacked = true;
    props.state = 'FIGHTING';

    // Make combatant hostile
    const combatant = context.npc.get(CombatantTrait);
    if (combatant) {
      combatant.hostile = true;
    }

    // Counter-attack
    return [
      {
        type: 'emote',
        messageId: ThiefMessages.COUNTERATTACKS,
        data: { npcName: context.npc.name }
      },
      { type: 'attack', target: attacker.id }
    ];
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

// ============= State Handlers =============

/**
 * WANDERING: Random movement, looking for opportunities
 */
function handleWanderingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  const actions: NpcAction[] = [];

  // Check if player is visible with valuables -> STALKING
  if (context.playerVisible) {
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0) {
      props.state = 'STALKING';
      props.lastKnownPlayerRoom = context.playerLocation;
      return handleStalkingState(context, props);
    }
  }

  // Check room for unattended treasures -> STEALING
  const roomTreasures = findRoomTreasures(context);
  if (roomTreasures.length > 0 && !context.playerVisible) {
    props.state = 'STEALING';
    return handleStealingState(context, props);
  }

  // Random movement
  if (context.random.chance(MOVE_CHANCE)) {
    const exits = context.getAvailableExits();
    if (exits.length > 0) {
      const exit = context.random.pick(exits);
      actions.push({ type: 'move', direction: exit.direction });
      props.turnsInRoom = 0;
    }
  } else {
    props.turnsInRoom++;
  }

  return actions;
}

/**
 * STALKING: Following player, waiting for steal opportunity
 */
function handleStalkingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  if (context.playerVisible) {
    // Update tracking
    props.lastKnownPlayerRoom = context.playerLocation;

    // Try to steal if cooldown is up
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0 && props.stealCooldown <= 0 && context.random.chance(STEAL_CHANCE)) {
      props.state = 'STEALING';
      return handleStealingState(context, props);
    }

    // Otherwise just lurk and maybe gloat
    if (context.random.chance(0.2)) {
      return [{
        type: 'emote',
        messageId: ThiefMessages.GLOATS,
        data: { npcName: context.npc.name }
      }];
    }

    return [];
  }

  // Player not visible - try to follow
  if (props.lastKnownPlayerRoom && props.lastKnownPlayerRoom !== context.npcLocation) {
    const exits = context.getAvailableExits();
    const exitToPlayer = exits.find(e => e.destination === props.lastKnownPlayerRoom);
    if (exitToPlayer) {
      return [{ type: 'move', direction: exitToPlayer.direction }];
    }
  }

  // Lost the player - go back to wandering
  props.state = 'WANDERING';
  props.lastKnownPlayerRoom = null;
  return [];
}

/**
 * STEALING: Taking items from player or room
 */
function handleStealingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  const actions: NpcAction[] = [];

  // Priority: steal from player if visible
  if (context.playerVisible) {
    const playerTreasures = findPlayerTreasures(context);
    if (playerTreasures.length > 0) {
      // Take highest value item
      const target = playerTreasures[0];
      const identity = target.get(IdentityTrait);
      const itemName = identity?.name ?? 'item';

      actions.push({ type: 'take', target: target.id });
      actions.push({
        type: 'speak',
        messageId: ThiefMessages.STEALS_FROM_PLAYER,
        data: { itemName }
      });

      props.stealCooldown = STEAL_COOLDOWN;

      // Check if we should return to lair
      const droppable = depositTreasures(context);
      if (droppable.length >= MAX_CARRY_BEFORE_RETURN) {
        props.state = 'RETURNING';
      } else {
        props.state = 'WANDERING';
      }

      return actions;
    }
  }

  // Otherwise steal from room
  const roomTreasures = findRoomTreasures(context);
  if (roomTreasures.length > 0) {
    const target = roomTreasures[0];

    actions.push({ type: 'take', target: target.id });

    // Silent steal from room (player might not be watching)
    if (!context.playerVisible) {
      // No message - stealth
    } else {
      const identity = target.get(IdentityTrait);
      actions.push({
        type: 'emote',
        messageId: ThiefMessages.STEALS_FROM_ROOM,
        data: { itemName: identity?.name ?? 'something' }
      });
    }

    props.stealCooldown = STEAL_COOLDOWN;

    // Check if we should return to lair
    const droppable = depositTreasures(context);
    if (droppable.length >= MAX_CARRY_BEFORE_RETURN) {
      props.state = 'RETURNING';
    } else {
      props.state = 'WANDERING';
    }

    return actions;
  }

  // Nothing to steal, go back to wandering
  props.state = 'WANDERING';
  return [];
}

/**
 * RETURNING: Heading back to lair with loot
 *
 * Deposit is handled by Priority 2 (handleLairDeposit) when the player
 * is absent. Here we just transition to WANDERING once at lair, or
 * move toward it if not there yet.
 */
function handleReturningState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  // At lair — Priority 2 handles deposit when player is absent
  if (isAtLair(context)) {
    props.state = 'WANDERING';
    return [];
  }

  // Not at lair - move toward it
  const exits = context.getAvailableExits();
  if (exits.length > 0) {
    const exitToLair = exits.find(e => e.destination === props.lairRoomId);
    if (exitToLair) {
      return [{ type: 'move', direction: exitToLair.direction }];
    }
    const exit = context.random.pick(exits);
    return [{ type: 'move', direction: exit.direction }];
  }

  return [];
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
function handleFightingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  // If player is visible, use WINNING? to decide fight/flee
  if (context.playerVisible) {
    const { shouldAttack, shouldStay } = getThiefCombatDecision(context);

    // Canonical MDL: thief guards his lair (Treasure Room) to the death.
    // He never flees from his own hideaway. (act1.mud:1387-1420)
    const inLair = context.npcLocation === props.lairRoomId;

    if (!shouldStay && !inLair) {
      // Flee: emit message, leave room, go back to wandering
      const actions: NpcAction[] = [{
        type: 'emote',
        messageId: ThiefMessages.FLEES,
        data: { npcName: context.npc.name }
      }];

      const exits = context.getAvailableExits();
      if (exits.length > 0) {
        // Try to head toward lair, otherwise pick random exit
        const exitToLair = exits.find(e => e.destination === props.lairRoomId);
        const exit = exitToLair ?? context.random.pick(exits);
        actions.push({ type: 'move', direction: exit.direction });
      }

      props.state = 'WANDERING';
      return actions;
    }

    if (shouldAttack) {
      const player = context.world.getPlayer();
      if (player) {
        return [
          {
            type: 'emote',
            messageId: ThiefMessages.ATTACKS,
            data: { npcName: context.npc.name }
          },
          { type: 'attack', target: player.id }
        ];
      }
    }

    // shouldStay but !shouldAttack — hesitate (no action, just stay in room)
    return [];
  }

  // Player fled - chase them
  if (props.lastKnownPlayerRoom && props.lastKnownPlayerRoom !== context.npcLocation) {
    const exits = context.getAvailableExits();
    const exitToPlayer = exits.find(e => e.destination === props.lastKnownPlayerRoom);
    if (exitToPlayer) {
      return [{ type: 'move', direction: exitToPlayer.direction }];
    }
  }

  // Lost player - back to wandering but stay hostile
  props.state = 'WANDERING';
  return [];
}

/**
 * FLEEING: Running away when wounded
 */
function handleFleeingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  const actions: NpcAction[] = [];

  // Emit flee message once
  if (props.state !== 'FLEEING') {
    actions.push({
      type: 'emote',
      messageId: ThiefMessages.FLEES,
      data: { npcName: context.npc.name }
    });
  }

  // Head toward lair
  if (isAtLair(context)) {
    // At lair, stay here to recover
    props.state = 'WANDERING';
    return actions;
  }

  const exits = context.getAvailableExits();
  if (exits.length > 0) {
    // Try to get to lair
    const exitToLair = exits.find(e => e.destination === props.lairRoomId);
    if (exitToLair) {
      actions.push({ type: 'move', direction: exitToLair.direction });
    } else {
      // Move away from player if visible
      if (context.playerVisible) {
        // Pick random exit (away from player)
        const exit = context.random.pick(exits);
        actions.push({ type: 'move', direction: exit.direction });
      } else {
        // Random wander toward lair
        const exit = context.random.pick(exits);
        actions.push({ type: 'move', direction: exit.direction });
      }
    }
  }

  return actions;
}

// ============= Special Mechanics =============

/**
 * Handle lair deposit (canonical MDL ROBBER function, act1.254:1078-1099)
 *
 * When the thief is at his lair (Treasure Room) and the player is NOT present,
 * he deposits all carried treasures in the room. If the egg is among them, he
 * opens it (sets OpenableTrait.isOpen = true), making the canary inside accessible.
 * The canary already exists inside the egg from world setup (forest.ts).
 */
function handleLairDeposit(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  // Only fire when at lair AND player is NOT in the room (MDL: <N==? .RM .WROOM>)
  if (!isAtLair(context) || context.playerVisible) {
    return [];
  }

  const droppable = depositTreasures(context);
  if (droppable.length === 0) {
    return [];
  }

  return [{
    type: 'custom',
    handler: (): ISemanticEvent[] => {
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

      return [];
    }
  }];
}
