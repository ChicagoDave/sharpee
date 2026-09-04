/**
 * npc-behaviors.test.ts — ADR-215 AC-4 (Q4) through the REAL loader and
 * the REAL engine: NPCs are core (no `use` line), the five standard
 * behaviors are composable vocabulary, and behavior params flow through
 * the loader (percent → fraction conversion, resolved patrol routes,
 * room-list trait fields). REAL-PATH per Integration Reality: real
 * @sharpee/chord compile, real loader world, a real `GameEngine` whose
 * own actor turn phase (ADR-328 D5) runs each behavior's chosen act as
 * the real standard action — a wanderer's step is `going`, a guard's blow
 * is `attacking` through the story's real combat interceptor. Assertions
 * on actual entity locations and HealthTrait mutations, never on
 * registration counts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { CombatantTrait, HealthTrait, NpcTrait, TraitType } from '@sharpee/world-model';
import { bootEngine, type Booted } from './helpers/boot-engine';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'npc-behaviors.story'),
  'utf8',
);

describe('core NPC behaviors through the real loader and engine (ADR-215 AC-4; ADR-328 D5)', () => {
  let b: Booted;
  let turn: number;

  /** One actor turn, the engine's own call shape, with the engine's random. */
  const tick = () => {
    turn += 1;
    return b.phase.onAfterAction({
      world: b.world,
      turn,
      random: b.engine.getRandomService(),
      playerLocation: b.world.getLocation(b.player.id)!,
      playerId: b.player.id,
      actionEvents: [],
    });
  };

  const at = (slug: string) => b.world.getLocation(b.story.entityId(slug)!);

  beforeEach(() => {
    b = bootEngine(FIXTURE, 11);
    turn = 0;
  });

  it('a wanderer with move-chance 100 moves every tick (percent → fraction conversion)', () => {
    for (let i = 0; i < 3; i++) {
      const before = at('moth');
      tick();
      expect(at('moth'), `tick ${turn}`).not.toBe(before);
    }
  });

  it('a wanderer moves through a whole real turn — player action, then the actor phase', async () => {
    await b.engine.start();
    const before = at('moth');
    const result = await b.engine.executeTurn('wait');
    expect(result.success).toBe(true);
    expect(at('moth')).not.toBe(before);
  });

  it('a wanderer with move-chance 0 never moves', () => {
    const home = at('slug');
    for (let i = 0; i < 10; i++) tick();
    expect(at('slug')).toBe(home);
  });

  it('a patrol NPC walks its resolved route through real rooms', () => {
    const visited = new Set<string>();
    for (let i = 0; i < 8; i++) {
      tick();
      visited.add(at('keeper')!);
    }
    const routeRooms = ['gate', 'yard', 'shed'].map((slug) => b.story.entityId(slug)!);
    // Every stop is on the route, and the round actually progressed.
    for (const stop of visited) expect(routeRooms).toContain(stop);
    expect(visited.size).toBeGreaterThanOrEqual(2);
    expect(visited.has(b.story.entityId('shed')!)).toBe(true);
  });

  it('room-list trait fields wire through pending refs (forbidden-rooms, can-move)', () => {
    const rat = b.world.getEntity(b.story.entityId('rat')!)!;
    const npc = rat.get(TraitType.NPC) as NpcTrait;
    expect(npc.canMove).toBe(true);
    expect(npc.forbiddenRooms).toEqual([b.story.entityId('shed')!]);
    expect(npc.behaviorId).toBe('passive');
  });

  it('a hostile guard attacks through the real attacking action and combat interceptor (use combat) and mutates health', () => {
    // The player's combat traits COMPOSE from the story block (Gap-2
    // ruling, David 2026-07-18): `a person, combatant with health 30 and
    // skill 10` on the playable character lands on the real traits.
    const combatant = b.player.get(TraitType.COMBATANT) as CombatantTrait;
    expect(combatant, 'player-block combatant composed').toBeDefined();
    expect(combatant.skill).toBe(10);
    const initial = (b.player.get(TraitType.HEALTH) as HealthTrait).health;
    expect(initial).toBe(30);
    let health = initial;
    let attacked = false;
    for (let i = 0; i < 8 && health >= initial; i++) {
      const events = tick();
      attacked ||= events.some((e) => e.type === 'if.event.attacked' && e.entities.actor !== b.player.id);
      health = (b.player.get(TraitType.HEALTH) as HealthTrait).health;
    }
    expect(attacked, 'the guard swung through the real attacking action').toBe(true);
    expect(health).toBeLessThan(initial);
  });
});
