/**
 * Standard NPC Behaviors (ADR-070; ADR-328 D5)
 *
 * Reusable behavior patterns for common NPC archetypes.
 * These are generic behaviors that can be used in any IF game.
 * Game-specific behaviors (thief, cyclops, etc.) should be defined in the story.
 *
 * Every act here is a real standard action run as the NPC through
 * `context.act` — a guard's attack is `if.action.attacking`, a wanderer's
 * step is `if.action.going` — so the world's rules apply to it exactly as
 * they apply to the player.
 *
 * Public interface: guardBehavior, passiveBehavior, createWandererBehavior,
 * createFollowerBehavior, createPatrolBehavior.
 * Owner context: stdlib / npc
 */

import { definePoint } from '@sharpee/core';
import { type NpcBehavior, type NpcContext } from './types.js';
import { NpcMessages } from './npc-messages.js';

// ADR-293 D2: the wanderer's two draws. Moving is a forceable yes/no choice
// point; the exit pick is a plain draw (the class set — available exits — is
// dynamic, so it carries no static coverage classes, D4).
const NPC_MOVE_POINT = definePoint('stdlib.npc.move', { classes: ['yes', 'no'] });
const NPC_EXIT_POINT = definePoint('stdlib.npc.exit');
import { TraitType, CombatantTrait, HealthTrait, HealthBehavior } from '@sharpee/world-model';
import { IFActions } from '../actions/constants.js';
import { nounPhraseFor } from '../utils/index.js';

/**
 * Guard behavior - stationary NPC that blocks passage and fights back
 *
 * Guards:
 * - Don't move on their own
 * - Narrate a blocking line when the player enters
 * - Attack the player each turn while hostile and engaged
 */
export const guardBehavior: NpcBehavior = {
  id: 'guard',
  name: 'Guard Behavior',

  onTurn(context: NpcContext): void {
    // Check if NPC is alive and conscious (life-state on HealthTrait — ADR-226)
    const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    const health = context.npc.get(TraitType.HEALTH) as HealthTrait | undefined;
    if (health && !HealthBehavior.canAct(health)) {
      return;
    }

    // If hostile and player is visible, attack!
    if (combatant?.hostile && context.playerVisible) {
      const player = context.world.getPlayer();
      if (player) {
        context.act(IFActions.ATTACKING, { directObject: player });
      }
    }
  },

  onPlayerEnters(context: NpcContext): void {
    // Check if NPC is alive and conscious (life-state on HealthTrait — ADR-226)
    const health = context.npc.get(TraitType.HEALTH) as HealthTrait | undefined;
    if (health && !HealthBehavior.canAct(health)) {
      return;
    }

    // Growl or block when player enters
    context.narrate(NpcMessages.GUARD_BLOCKS, { speaker: nounPhraseFor(context.npc) });
  },
};

/**
 * Wanderer behavior - NPC that moves randomly between rooms
 *
 * Wanderers:
 * - Move randomly with configurable probability
 * - Respect room restrictions
 * - Acknowledge the player's arrival
 *
 * Arrival in the player's room is narrated by the going action itself
 * (the player witnesses the NPC enter), not by the behavior.
 */
export function createWandererBehavior(options: {
  /** Probability of moving each turn (0-1) */
  moveChance?: number;
} = {}): NpcBehavior {
  const moveChance = options.moveChance ?? 0.3;

  return {
    id: 'wanderer',
    name: 'Wanderer Behavior',

    onTurn(context: NpcContext): void {
      // Chance to move
      if (context.random.chance(NPC_MOVE_POINT, moveChance)) {
        const exits = context.getAvailableExits();
        if (exits.length > 0) {
          const exit = context.random.pick(NPC_EXIT_POINT, exits);
          context.act(IFActions.GOING, { direction: exit.direction });
        }
      }
    },

    onPlayerEnters(context: NpcContext): void {
      // Acknowledge player's arrival
      context.narrate(NpcMessages.NPC_NOTICES_PLAYER, { speaker: nounPhraseFor(context.npc) });
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

  /** Step toward the player if an exit leads straight to them; narrate only if the step happened. */
  const follow = (context: NpcContext): void => {
    const exits = context.getAvailableExits();
    const exitToPlayer = exits.find(
      (e) => e.destination === context.playerLocation
    );
    if (!exitToPlayer) return;

    const went = context.act(IFActions.GOING, { direction: exitToPlayer.direction });
    if (went.success) {
      context.narrate(followMessageId, { speaker: nounPhraseFor(context.npc) });
    }
  };

  return {
    id: 'follower',
    name: 'Follower Behavior',

    onTurn(context: NpcContext): void {
      // If player is not visible and we're not in the same room, try to follow
      if (!context.playerVisible && lastPlayerLocation) {
        follow(context);
      }

      // Update last known player location
      lastPlayerLocation = context.playerLocation;
    },

    onPlayerLeaves(context: NpcContext): void {
      if (!immediate) {
        return;
      }

      // Immediately follow (find which exit player took)
      follow(context);
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

  onTurn(): void {
    // Nothing to do.
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

    onTurn(context: NpcContext): void {
      if (route.length === 0) return;

      // Wait at waypoint
      if (waitCounter > 0) {
        waitCounter--;
        return;
      }

      // Check if we're at the current waypoint
      const targetRoom = route[currentWaypoint];
      if (context.npcLocation !== targetRoom) {
        // Move toward target
        const exits = context.getAvailableExits();
        const exitToTarget = exits.find((e) => e.destination === targetRoom);

        if (exitToTarget) {
          context.act(IFActions.GOING, { direction: exitToTarget.direction });
          return;
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
