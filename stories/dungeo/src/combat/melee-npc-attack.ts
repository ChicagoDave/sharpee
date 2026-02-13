/**
 * Melee NPC Resolver — villain attacks hero (NPC→PC direction)
 *
 * Implements the canonical MDL melee combat for when NPCs attack the player.
 * Registered via registerNpcCombatResolver() in the story's initializeWorld().
 *
 * Flow:
 * 1. Guard: If target is not the player, no-op.
 * 2. Stagger check: If villain is staggered, clear flag and emit recovery message.
 * 3. Compute strengths: villainStrength() for attacker, fightStrength() for defender.
 * 4. Resolve blow: resolveBlow(att, def, isHeroAttacking=false, ...).
 * 5. Apply side effects to hero: wounds, stagger, lose weapon, death.
 * 6. Return events with canonical villain attack message.
 *
 * Source: docs/internal/dungeon-81/original_source/melee.137
 */

import { ISemanticEvent, EntityId, SeededRandom, createSeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  IdentityTrait,
} from '@sharpee/world-model';
import { findWieldedWeapon } from '@sharpee/stdlib';

import {
  fightStrength,
  villainStrength,
  getBestWeaponPenalty,
  resolveBlow,
  applyVillainBlowToHero,
  isHeroDeadFromWounds,
  MeleeOutcome,
} from './melee';
import { getVillainAttackMessage } from './melee-messages';
import { MELEE_STATE, getBaseOstrength } from './melee-state';

/**
 * Module-level random instance shared across all NPC melee calls.
 * Same pattern as the melee interceptor — avoids identical rolls
 * when multiple NPCs attack within the same millisecond.
 */
const npcMeleeRandom: SeededRandom = createSeededRandom();

// ============= Helpers =============

function createEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId?: EntityId
): ISemanticEvent {
  return {
    id: createEventId('npc_melee'),
    type,
    timestamp: Date.now(),
    entities: npcId ? { actor: npcId } : {},
    data,
  };
}

/**
 * Get the villain key for message lookup.
 */
function getVillainKey(villain: IFEntity): string {
  const identity = villain.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  const name = identity?.name?.toLowerCase() ?? '';
  if (name.includes('troll')) return 'troll';
  if (name.includes('thief')) return 'thief';
  if (name.includes('cyclops')) return 'cyclops';
  return 'troll'; // Default
}

/**
 * Get current player score from the score ledger.
 */
function getPlayerScore(world: WorldModel): number {
  return world.getScore();
}

/**
 * Get or initialize melee state for a villain.
 */
function getVillainOstrength(villain: IFEntity): number {
  const stored = villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH];
  if (typeof stored === 'number') return stored;
  const base = getBaseOstrength(villain);
  villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = base;
  return base;
}

// ============= The Resolver =============

/**
 * Melee NPC Combat Resolver.
 *
 * Handles villain→hero attacks using the canonical MDL melee engine.
 * Returns ISemanticEvent[] for the NPC service to emit.
 */
export function meleeNpcResolver(
  npc: IFEntity,
  target: IFEntity,
  world: WorldModel,
  _random: SeededRandom
): ISemanticEvent[] {
  // Guard: Only resolve combat against the player
  if (!target.isPlayer) {
    return [];
  }

  const random = npcMeleeRandom;
  const villainKey = getVillainKey(npc);
  const events: ISemanticEvent[] = [];

  // --- Check if villain is staggered (skip attack, recover) ---
  if (npc.attributes[MELEE_STATE.VILLAIN_STAGGERED]) {
    npc.attributes[MELEE_STATE.VILLAIN_STAGGERED] = false;
    // Villain recovers from stagger — no attack this turn
    events.push(createEvent('game.message', {
      messageId: 'dungeo.melee.villain_recovers',
      text: `The ${villainKey} slowly regains his composure.`,
    }, npc.id));
    return events;
  }

  // --- Compute strengths ---
  const currentOstrength = getVillainOstrength(npc);

  // Villain dead or removed — no attack
  if (currentOstrength <= 0) {
    return [];
  }

  const isThiefEngrossed = npc.attributes.thiefEngrossed === true;
  // Villain doesn't benefit from best-weapon penalty when attacking
  const villainStr = villainStrength(currentOstrength, isThiefEngrossed);

  const score = getPlayerScore(world);
  const woundAdjust = (target.attributes[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;
  const heroStr = Math.max(1, fightStrength(score, woundAdjust));

  // --- Check if hero is unconscious ---
  const heroUnconscious = target.attributes[MELEE_STATE.STAGGERED] === true;

  // --- Resolve the villain's blow against the hero ---
  const blowResult = resolveBlow(villainStr, heroStr, false, heroUnconscious, random);

  // --- Get hero's weapon name for messages (e.g., "lose weapon" text) ---
  const heroWeapon = findWieldedWeapon(target, world);
  const heroWeaponName = heroWeapon?.name ?? 'weapon';

  // --- Apply side effects to hero ---
  const baseFight = fightStrength(score, 0, false);

  switch (blowResult.outcome) {
    case MeleeOutcome.MISSED:
    case MeleeOutcome.HESITATE:
      // No effect on hero
      break;

    case MeleeOutcome.STAGGER:
      // Hero is staggered — misses next attack
      target.attributes[MELEE_STATE.STAGGERED] = true;
      break;

    case MeleeOutcome.LIGHT_WOUND: {
      // Reduce hero wound adjust by 1
      const newWound = applyVillainBlowToHero(woundAdjust, blowResult, baseFight);
      target.attributes[MELEE_STATE.WOUND_ADJUST] = newWound;
      // Check for death from wounds
      if (isHeroDeadFromWounds(score, newWound)) {
        emitHeroDeath(events, npc, target);
      }
      break;
    }

    case MeleeOutcome.SERIOUS_WOUND: {
      // Reduce hero wound adjust by 2
      const newWound = applyVillainBlowToHero(woundAdjust, blowResult, baseFight);
      target.attributes[MELEE_STATE.WOUND_ADJUST] = newWound;
      if (isHeroDeadFromWounds(score, newWound)) {
        emitHeroDeath(events, npc, target);
      }
      break;
    }

    case MeleeOutcome.LOSE_WEAPON:
      // Drop hero's weapon to the room
      if (heroWeapon) {
        const heroRoom = world.getLocation(target.id);
        if (heroRoom) {
          world.moveEntity(heroWeapon.id, heroRoom);
        }
      }
      break;

    case MeleeOutcome.UNCONSCIOUS:
      // MDL melee.137:246-248 — UNCONSCIOUS only negates DEF when hero
      // is the attacker (villain goes unconscious). When villain attacks
      // hero, DEF is NOT modified, so ASTRENGTH = DEF - OD = 0 (no wound).
      // The message is dramatic but mechanically it's a no-op.
      break;

    case MeleeOutcome.KILLED:
    case MeleeOutcome.SITTING_DUCK:
      // Hero is killed
      emitHeroDeath(events, npc, target);
      break;
  }

  // --- Get the canonical villain attack message ---
  const message = getVillainAttackMessage(
    villainKey,
    blowResult.outcome,
    heroWeaponName,
    (arr) => random.pick(arr)
  ) ?? `The ${villainKey} attacks!`;

  // Emit the attack message
  events.unshift(createEvent('game.message', {
    messageId: 'dungeo.melee.villain_attack',
    text: message,
  }, npc.id));

  // Also emit standard npc.attacked event for any listeners
  events.push(createEvent('npc.attacked', {
    npc: npc.id,
    target: target.id,
    outcome: blowResult.outcome,
  }, npc.id));

  return events;
}

/**
 * Emit hero death event.
 */
function emitHeroDeath(
  events: ISemanticEvent[],
  npc: IFEntity,
  target: IFEntity
): void {
  events.push(createEvent('if.event.death', {
    target: target.id,
    targetName: target.name,
    killedBy: npc.id,
  }, npc.id));
}
