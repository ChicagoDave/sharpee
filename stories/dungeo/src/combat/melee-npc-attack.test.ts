/**
 * Tests for meleeNpcResolver's GDT ND (immortality) guard.
 *
 * emitHeroDeath must suppress the canonical killPlayer death event while the
 * GDT immortal flag is set — this is what makes the troll/cyclops unit
 * transcripts deterministic under `> nd`. The guard is asserted directly here
 * (mutation-verification finding, session 17e36e): in the transcripts a
 * regressed guard is indistinguishable from combat RNG, since RETRY silently
 * absorbs deaths.
 *
 * The resolver draws from a module-level time-seeded RNG (not the injected
 * parameter), so each test sweeps many fresh worlds to cover the blow-table
 * outcome space, including the fatal outcomes.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  CombatantTrait,
  HealthTrait,
  TraitType,
} from '@sharpee/world-model';
import { createSeededRandom } from '@sharpee/core';
import { PLAYER_DIED_EVENT } from '@sharpee/stdlib';
import { meleeNpcResolver } from './melee-npc-attack';
import { setGDTFlags, getGDTFlags } from '../actions/gdt/gdt-context';

const SWEEPS = 150;

/** Fresh world with a player standing next to a full-strength troll. */
function buildArena(immortal: boolean) {
  const world = new WorldModel();
  const room = world.createEntity('Troll Room', EntityType.ROOM);

  const player = world.createEntity('yourself', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  world.setPlayer(player.id);
  player.add(new HealthTrait({}));
  world.moveEntity(player.id, room.id);

  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new CombatantTrait({ hostile: true }));
  troll.add(new HealthTrait({}));
  world.moveEntity(troll.id, room.id);

  if (immortal) {
    setGDTFlags(world, { ...getGDTFlags(world), immortal: true });
  }
  return { world, player, troll };
}

describe('meleeNpcResolver GDT immortality guard', () => {
  it('never emits the canonical player-death event while immortal', () => {
    // Sequential blows on the same player: wounds accumulate, so the blow
    // table's fatal outcomes (which need a weakened defender) are reached
    // many times over — every one of them must be suppressed.
    const { world, player, troll } = buildArena(true);
    for (let i = 0; i < SWEEPS; i++) {
      const events = meleeNpcResolver(troll, player, world, createSeededRandom(i));
      const died = events.filter((e) => e.type === PLAYER_DIED_EVENT);
      expect(died).toEqual([]);
    }
  });

  it('control: without immortality the fatal outcomes do occur (guard is not always-on)', () => {
    // Accumulating wounds kill a score-0 player within a handful of blows
    // (~80% per 7-blow stretch in the transcripts); 150 sequential blows
    // make a zero-death run astronomically unlikely unless the death path
    // itself is broken.
    const { world, player, troll } = buildArena(false);
    let sawDeath = false;
    for (let i = 0; i < SWEEPS && !sawDeath; i++) {
      const events = meleeNpcResolver(troll, player, world, createSeededRandom(i));
      if (events.some((e) => e.type === PLAYER_DIED_EVENT)) {
        sawDeath = true;
      }
    }
    expect(sawDeath).toBe(true);
  });
});
