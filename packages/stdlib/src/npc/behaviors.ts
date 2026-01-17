/**
 * Standard NPC Behaviors (ADR-070)
 *
 * Reusable behavior patterns for common NPC archetypes.
 * These are generic behaviors that can be used in any IF game.
 * Game-specific behaviors (thief, cyclops, etc.) should be defined in the story.
 */

import { NpcBehavior, NpcContext, NpcAction, Direction } from './types';
import { NpcMessages } from './npc-messages';
import { TraitType, CombatantTrait } from '@sharpee/world-model';

/**
 * Guard behavior - stationary NPC that blocks passage and fights back
 *
 * Guards:
 * - Don't move on their own
 * - Emit a blocking message when player enters
 * - Attack player each turn if hostile and engaged
 * - Counterattack when attacked
 */
export const guardBehavior: NpcBehavior = {
  id: 'guard',
  name: 'Guard Behavior',

  onTurn(context: NpcContext): NpcAction[] {
    // Check if NPC is alive and conscious
    const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (combatant && (!combatant.isAlive || !combatant.isConscious)) {
      return [];
    }

    // If hostile and player is visible, attack!
    if (combatant?.hostile && context.playerVisible) {
      const player = context.world.getPlayer();
      if (player) {
        return [{ type: 'attack', target: player.id }];
      }
    }

    return [];
  },

  onPlayerEnters(context: NpcContext): NpcAction[] {
    // Check if NPC is alive and conscious
    const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (combatant && (!combatant.isAlive || !combatant.isConscious)) {
      return [];
    }

    // Growl or block when player enters
    return [
      {
        type: 'emote',
        messageId: NpcMessages.GUARD_BLOCKS,
        data: { npcName: context.npc.name },
      },
    ];
  },

  onAttacked(context: NpcContext, attacker): NpcAction[] {
    // Check if NPC is alive and conscious
    const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (combatant && (!combatant.isAlive || !combatant.isConscious)) {
      return [];
    }

    // Counterattack
    return [{ type: 'attack', target: attacker.id }];
  },
};

/**
 * Wanderer behavior - NPC that moves randomly between rooms
 *
 * Wanderers:
 * - Move randomly with configurable probability
 * - Respect room restrictions
 * - Announce presence when entering player's room
 */
export function createWandererBehavior(options: {
  /** Probability of moving each turn (0-1) */
  moveChance?: number;
  /** Whether to announce when entering player's room */
  announceEntry?: boolean;
} = {}): NpcBehavior {
  const moveChance = options.moveChance ?? 0.3;
  const announceEntry = options.announceEntry ?? true;

  return {
    id: 'wanderer',
    name: 'Wanderer Behavior',

    onTurn(context: NpcContext): NpcAction[] {
      const actions: NpcAction[] = [];

      // Chance to move
      if (context.random.chance(moveChance)) {
        const exits = context.getAvailableExits();
        if (exits.length > 0) {
          const exit = context.random.pick(exits);
          actions.push({ type: 'move', direction: exit.direction });

          // If we're about to enter player's room, announce
          if (announceEntry && exit.destination === context.playerLocation) {
            actions.push({
              type: 'emote',
              messageId: NpcMessages.NPC_ENTERS,
              data: { npcName: context.npc.name },
            });
          }
        }
      }

      return actions;
    },

    onPlayerEnters(context: NpcContext): NpcAction[] {
      // Acknowledge player's arrival
      return [
        {
          type: 'emote',
          messageId: NpcMessages.NPC_NOTICES_PLAYER,
          data: { npcName: context.npc.name },
        },
      ];
    },
  };
}

/**
 * Follower behavior - NPC that follows the player
 *
 * Followers:
 * - Stay with the player when possible
 * - Follow the player when they move
 * - Don't enter forbidden rooms
 */
export function createFollowerBehavior(options: {
  /** Whether to follow immediately or wait a turn */
  immediate?: boolean;
  /** Message when following */
  followMessageId?: string;
} = {}): NpcBehavior {
  const immediate = options.immediate ?? true;
  const followMessageId = options.followMessageId ?? NpcMessages.NPC_FOLLOWS;

  // Track the last room we saw the player in
  let lastPlayerLocation: string | undefined;

  return {
    id: 'follower',
    name: 'Follower Behavior',

    onTurn(context: NpcContext): NpcAction[] {
      const actions: NpcAction[] = [];

      // If player is not visible and we're not in the same room, try to follow
      if (!context.playerVisible && lastPlayerLocation) {
        // Find a path to the player (simplified: just try to move toward them)
        const exits = context.getAvailableExits();
        const exitToPlayer = exits.find(
          (e) => e.destination === context.playerLocation
        );

        if (exitToPlayer) {
          actions.push({ type: 'move', direction: exitToPlayer.direction });
          actions.push({
            type: 'emote',
            messageId: followMessageId,
            data: { npcName: context.npc.name },
          });
        }
      }

      // Update last known player location
      lastPlayerLocation = context.playerLocation;

      return actions;
    },

    onPlayerLeaves(context: NpcContext): NpcAction[] {
      if (!immediate) {
        return [];
      }

      // Immediately follow (find which exit player took)
      const exits = context.getAvailableExits();
      const exitToPlayer = exits.find(
        (e) => e.destination === context.playerLocation
      );

      if (exitToPlayer) {
        return [
          { type: 'move', direction: exitToPlayer.direction },
          {
            type: 'emote',
            messageId: followMessageId,
            data: { npcName: context.npc.name },
          },
        ];
      }

      return [];
    },

    getState() {
      return { lastPlayerLocation };
    },

    setState(_npc, state) {
      lastPlayerLocation = state.lastPlayerLocation as string | undefined;
    },
  };
}

/**
 * Passive behavior - NPC that does nothing autonomously
 *
 * Useful as a base for NPCs that only react to player actions.
 */
export const passiveBehavior: NpcBehavior = {
  id: 'passive',
  name: 'Passive Behavior',

  onTurn(): NpcAction[] {
    return [];
  },
};

/**
 * Patrol behavior - NPC that moves along a fixed route
 */
export function createPatrolBehavior(options: {
  /** Ordered list of room IDs to patrol */
  route: string[];
  /** Whether to reverse at the end or loop */
  loop?: boolean;
  /** Turns to wait at each waypoint */
  waitTurns?: number;
} = { route: [] }): NpcBehavior {
  const route = options.route;
  const loop = options.loop ?? true;
  const waitTurns = options.waitTurns ?? 0;

  let currentWaypoint = 0;
  let direction = 1; // 1 = forward, -1 = backward
  let waitCounter = 0;

  return {
    id: 'patrol',
    name: 'Patrol Behavior',

    onTurn(context: NpcContext): NpcAction[] {
      if (route.length === 0) return [];

      // Wait at waypoint
      if (waitCounter > 0) {
        waitCounter--;
        return [];
      }

      // Check if we're at the current waypoint
      const targetRoom = route[currentWaypoint];
      if (context.npcLocation !== targetRoom) {
        // Move toward target
        const exits = context.getAvailableExits();
        const exitToTarget = exits.find((e) => e.destination === targetRoom);

        if (exitToTarget) {
          return [{ type: 'move', direction: exitToTarget.direction }];
        }
      }

      // We're at the waypoint, move to next
      waitCounter = waitTurns;

      if (loop) {
        currentWaypoint = (currentWaypoint + 1) % route.length;
      } else {
        // Ping-pong
        currentWaypoint += direction;
        if (currentWaypoint >= route.length - 1 || currentWaypoint <= 0) {
          direction *= -1;
        }
      }

      return [];
    },

    getState() {
      return { currentWaypoint, direction, waitCounter };
    },

    setState(_npc, state) {
      currentWaypoint = (state.currentWaypoint as number) ?? 0;
      direction = (state.direction as number) ?? 1;
      waitCounter = (state.waitCounter as number) ?? 0;
    },
  };
}
