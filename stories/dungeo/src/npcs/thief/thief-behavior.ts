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
 * - Opens jeweled egg after carrying it for 3 turns
 * - Combat difficulty scales with player score
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { IFEntity, NpcTrait, CombatantTrait, OpenableTrait, IdentityTrait, EntityType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { ThiefMessages } from './thief-messages';
import { TreasureTrait } from '../../traits';
import { ThiefCustomProperties, ThiefState } from './thief-entity';
import {
  getThiefProps,
  setThiefState,
  findPlayerTreasures,
  findRoomTreasures,
  isCarryingEgg,
  getEggFromInventory,
  isAtLair,
  getDroppableItems,
  isThiefDisabled,
  decrementCooldowns,
  shouldEscalateToCombat,
  isStilettoItem,
  getTreasureValue
} from './thief-helpers';

// Constants
const MOVE_CHANCE = 0.33;           // 33% chance to move each turn
const STEAL_CHANCE = 0.4;           // 40% chance to steal when opportunity arises
const EGG_OPEN_TURNS = 3;           // Turns before thief opens the egg
const STEAL_COOLDOWN = 5;           // Turns between steals
const MAX_CARRY_BEFORE_RETURN = 3;  // Items before heading home
const FLEE_HEALTH_THRESHOLD = 0.3;  // 30% health triggers flee

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

    // Priority 1: Handle fighting state
    if (props.state === 'FIGHTING') {
      return handleFightingState(context, props);
    }

    // Priority 2: Check for fleeing (low health)
    if (shouldFlee(context)) {
      props.state = 'FLEEING';
      return handleFleeingState(context, props);
    }

    // Priority 3: Check egg opening (special mechanic)
    const eggActions = checkEggOpening(context, props);
    if (eggActions.length > 0) {
      return eggActions;
    }

    // Priority 4: Late-game combat escalation
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
      const droppable = getDroppableItems(context);
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
    const droppable = getDroppableItems(context);
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
 */
function handleReturningState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  // At lair - drop everything except stiletto
  if (isAtLair(context)) {
    const actions: NpcAction[] = [];
    const droppable = getDroppableItems(context);

    for (const item of droppable) {
      actions.push({ type: 'drop', target: item.id });
    }

    props.state = 'WANDERING';
    return actions;
  }

  // Not at lair - move toward it
  // Note: This is simplified - true pathfinding would need graph traversal
  // For now, just wander and hope to reach lair eventually
  const exits = context.getAvailableExits();
  if (exits.length > 0) {
    // Check if any exit leads directly to lair
    const exitToLair = exits.find(e => e.destination === props.lairRoomId);
    if (exitToLair) {
      return [{ type: 'move', direction: exitToLair.direction }];
    }

    // Otherwise pick random exit (simplified pathfinding)
    const exit = context.random.pick(exits);
    return [{ type: 'move', direction: exit.direction }];
  }

  return [];
}

/**
 * FIGHTING: In combat with player
 */
function handleFightingState(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  // Check for flee
  if (shouldFlee(context)) {
    props.state = 'FLEEING';
    return handleFleeingState(context, props);
  }

  // Attack if player is visible
  if (context.playerVisible) {
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
 * Check if thief should flee (low health)
 */
function shouldFlee(context: NpcContext): boolean {
  const combatant = context.npc.get(CombatantTrait);
  if (!combatant) return false;

  const healthRatio = combatant.health / combatant.maxHealth;
  return healthRatio <= FLEE_HEALTH_THRESHOLD;
}

/**
 * Check and handle egg opening (special Zork mechanic)
 *
 * If thief has been carrying the jeweled egg for 3+ turns,
 * he opens it, revealing the clockwork canary.
 */
function checkEggOpening(context: NpcContext, props: ThiefCustomProperties): NpcAction[] {
  if (isCarryingEgg(context)) {
    props.turnsWithEgg++;

    if (props.turnsWithEgg >= EGG_OPEN_TURNS) {
      props.turnsWithEgg = 0;

      // Custom action to open the egg
      return [{
        type: 'custom',
        handler: (): ISemanticEvent[] => {
          const egg = getEggFromInventory(context);
          if (!egg) return [];

          // Check if egg is openable and not already open
          const openable = egg.get(OpenableTrait);
          if (openable && !openable.isOpen) {
            openable.isOpen = true;

            // Create the clockwork canary if it doesn't exist
            let canary = context.world.getAllEntities().find(e => {
              const identity = e.get(IdentityTrait);
              return identity?.name?.includes('canary');
            });

            if (!canary) {
              canary = context.world.createEntity('clockwork canary', EntityType.ITEM);
              canary.add(new IdentityTrait({
                name: 'clockwork canary',
                aliases: ['canary', 'bird', 'clockwork bird', 'mechanical bird'],
                description: 'A beautifully crafted mechanical songbird. Its delicate clockwork is exposed, revealing gears of the finest craftsmanship.',
                properName: false,
                article: 'a'
              }));
              canary.add(new TreasureTrait({
                treasureId: 'clockwork-canary',
                treasureValue: 6,      // OFVAL from mdlzork_810722
                trophyCaseValue: 2,    // OTVAL from mdlzork_810722
              }));
            }

            // Drop canary in thief's current room
            context.world.moveEntity(canary.id, context.npcLocation);

            return [{
              id: generateEventId(),
              type: 'npc.emoted',
              timestamp: Date.now(),
              entities: { actor: context.npc.id },
              data: {
                npc: context.npc.id,
                messageId: ThiefMessages.OPENS_EGG
              }
            }];
          }

          return [];
        }
      }];
    }
  } else {
    // Reset counter if not carrying egg
    props.turnsWithEgg = 0;
  }

  return [];
}
