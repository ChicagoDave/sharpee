/**
 * npc-behaviors.test.ts — ADR-215 AC-4 (Q4) through the REAL loader: the
 * NPC plugin auto-wires with NO `use` line, the five standard behaviors
 * are composable vocabulary, and behavior params flow through the loader
 * (percent → fraction conversion, resolved patrol routes, room-list trait
 * fields). REAL-PATH per Integration Reality: real @sharpee/chord
 * compile, real loader world, real NpcPlugin/NpcService ticks via
 * onEngineReady's own registration — assertions on actual entity
 * locations and HealthTrait mutations, never on registration counts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { createSeededRandom } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { CombatantTrait, HealthTrait, IFEntity, NpcTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'npc-behaviors.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('core NPC behaviors through the real loader (ADR-215 AC-4)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let npcPlugin: NpcPlugin;
  let turn: number;
  const random = createSeededRandom(7);

  const tick = () => {
    turn += 1;
    return npcPlugin.onAfterAction({
      world,
      turn,
      random,
      playerLocation: world.getLocation(player.id)!,
      playerId: player.id,
      actionEvents: [],
    } as never);
  };

  const at = (slug: string) => world.getLocation(story.entityId(slug)!);

  beforeEach(() => {
    story = createStory(compileSource(FIXTURE), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    // Real onEngineReady registration path — the stub captures what the
    // loader registers; the plugin and service are the real things.
    const plugins: unknown[] = [];
    story.onEngineReady({ getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p) }) });
    npcPlugin = plugins.find((p): p is NpcPlugin => p instanceof NpcPlugin)!;
    expect(npcPlugin, 'NpcPlugin auto-wired with no `use` line').toBeDefined();
    turn = 0;
  });

  it('a wanderer with move-chance 100 moves every tick (percent → fraction conversion)', () => {
    for (let i = 0; i < 3; i++) {
      const before = at('moth');
      tick();
      expect(at('moth'), `tick ${turn}`).not.toBe(before);
    }
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
    const routeRooms = ['gate', 'yard', 'shed'].map((slug) => story.entityId(slug)!);
    // Every stop is on the route, and the round actually progressed.
    for (const stop of visited) expect(routeRooms).toContain(stop);
    expect(visited.size).toBeGreaterThanOrEqual(2);
    expect(visited.has(story.entityId('shed')!)).toBe(true);
  });

  it('room-list trait fields wire through pending refs (forbidden-rooms, can-move)', () => {
    const rat = world.getEntity(story.entityId('rat')!)!;
    const npc = rat.get(TraitType.NPC) as NpcTrait;
    expect(npc.canMove).toBe(true);
    expect(npc.forbiddenRooms).toEqual([story.entityId('shed')!]);
    expect(npc.behaviorId).toBe('passive');
  });

  it('a hostile guard attacks through the real combat resolver (use combat) and mutates health', () => {
    // The player's combat traits COMPOSE from the story block (Gap-2
    // ruling, David 2026-07-18): `a person, combatant with health 30 and
    // skill 10` on `create the player` lands on the real traits.
    const combatant = player.get(TraitType.COMBATANT) as CombatantTrait;
    expect(combatant, 'player-block combatant composed').toBeDefined();
    expect(combatant.skill).toBe(10);
    const initial = (player.get(TraitType.HEALTH) as HealthTrait).health;
    expect(initial).toBe(30);
    let health = initial;
    for (let i = 0; i < 8 && health >= initial; i++) {
      tick();
      health = (player.get(TraitType.HEALTH) as HealthTrait).health;
    }
    expect(health).toBeLessThan(initial);
  });
});
