/**
 * RankWatcherPlugin — promotion announcements (ADR-260 D6).
 *
 * Covers acceptance #6: one promotion per threshold crossing, no re-fire
 * across save/restore, ids (not display names) in the payload, and
 * `fromRank: null` on the first promotion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, type RankDefinition } from '@sharpee/world-model';
import type { TurnPluginContext } from '@sharpee/plugins';
import { createSeededRandom } from '@sharpee/core';
import { registerScoring, registerScoringPlugin, RankWatcherPlugin } from '../src';

const LADDER: RankDefinition[] = [
  { id: 'novice', name: 'Novice', threshold: 0 },
  { id: 'apprentice', name: 'Apprentice', threshold: 50 },
  { id: 'journeyman', name: 'Journeyman', threshold: 200 },
];

function makeContext(world: WorldModel, turn = 1): TurnPluginContext {
  return {
    world,
    turn,
    playerId: 'player',
    playerLocation: 'room',
    random: createSeededRandom(1),
  };
}

describe('RankWatcherPlugin (ADR-260 D6)', () => {
  let world: WorldModel;
  let plugin: RankWatcherPlugin;

  beforeEach(() => {
    world = new WorldModel();
    registerScoring(world);
    world.setRanks(LADDER);
    plugin = new RankWatcherPlugin();
  });

  it('says nothing while scoring is disabled', () => {
    const bare = new WorldModel();
    bare.setRanks(LADDER);
    bare.awardScore('haul', 100, 'Points on a scoring-less world');

    expect(new RankWatcherPlugin().onAfterAction(makeContext(bare))).toEqual([]);
  });

  it('says nothing when no ladder is installed', () => {
    const noLadder = new WorldModel();
    registerScoring(noLadder);
    noLadder.awardScore('haul', 100, 'Points without a ladder');

    expect(new RankWatcherPlugin().onAfterAction(makeContext(noLadder))).toEqual([]);
  });

  it('does not announce the starting rung — nothing was crossed at zero points', () => {
    expect(plugin.onAfterAction(makeContext(world))).toEqual([]);
  });

  it('announces a crossing with rank IDS and the current score', () => {
    plugin.onAfterAction(makeContext(world)); // baseline turn at 0 points
    world.awardScore('lamp', 60, 'Found the lamp');

    const events = plugin.onAfterAction(makeContext(world, 2));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('if.event.rank_risen');
    expect(events[0].data).toMatchObject({
      fromRank: 'novice',
      toRank: 'apprentice',
      score: 60,
    });
  });

  it('carries fromRank null when no rank was ever announced', () => {
    // First observed turn already past a threshold — nothing announced before.
    world.awardScore('windfall', 250, 'A big first haul');

    const events = plugin.onAfterAction(makeContext(world));

    expect(events[0].data).toMatchObject({ fromRank: null, toRank: 'journeyman' });
  });

  it('fires ONCE per crossing — two awards inside one band emit one event (acceptance #6)', () => {
    plugin.onAfterAction(makeContext(world));

    world.awardScore('lamp', 60, 'Found the lamp');
    expect(plugin.onAfterAction(makeContext(world, 2))).toHaveLength(1);

    // Still inside the apprentice band (50..199).
    world.awardScore('coin', 60, 'Found a coin');
    expect(plugin.onAfterAction(makeContext(world, 3))).toEqual([]);
  });

  it('skips intermediate rungs — one event names the rank actually reached', () => {
    plugin.onAfterAction(makeContext(world));
    world.awardScore('windfall', 250, 'Straight past apprentice');

    const events = plugin.onAfterAction(makeContext(world, 2));

    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({ fromRank: 'novice', toRank: 'journeyman' });
  });

  it('is silent on demotion, and announces again on re-crossing', () => {
    plugin.onAfterAction(makeContext(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    plugin.onAfterAction(makeContext(world, 2));

    world.revokeScore('lamp');
    expect(plugin.onAfterAction(makeContext(world, 3))).toEqual([]);

    world.awardScore('lamp', 60, 'Found the lamp again');
    expect(plugin.onAfterAction(makeContext(world, 4))).toHaveLength(1);
  });

  it('does not re-fire across save/restore (acceptance #6)', () => {
    plugin.onAfterAction(makeContext(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    expect(plugin.onAfterAction(makeContext(world, 2))).toHaveLength(1);

    const saved = plugin.getState();
    const savedWorld = world.toJSON();

    // A fresh session: new plugin, new world, ladder from registration alone.
    const restoredWorld = new WorldModel();
    registerScoring(restoredWorld);
    restoredWorld.setRanks(LADDER);
    restoredWorld.loadJSON(savedWorld);

    const restoredPlugin = new RankWatcherPlugin();
    restoredPlugin.setState(saved);

    expect(restoredPlugin.onAfterAction(makeContext(restoredWorld, 3))).toEqual([]);
  });

  it('a restored plugin still announces the NEXT crossing', () => {
    plugin.onAfterAction(makeContext(world));
    world.awardScore('lamp', 60, 'Found the lamp');
    plugin.onAfterAction(makeContext(world, 2));

    const restored = new RankWatcherPlugin();
    restored.setState(plugin.getState());

    world.awardScore('treasure', 200, 'The big one');
    expect(restored.onAfterAction(makeContext(world, 3))).toHaveLength(1);
  });

  it('setState tolerates absent state — a save written before this plugin existed', () => {
    const fresh = new RankWatcherPlugin();
    fresh.setState(undefined);

    world.awardScore('lamp', 60, 'Found the lamp');
    expect(fresh.onAfterAction(makeContext(world))).toHaveLength(1);
  });
});

describe('registerScoring / registerScoringPlugin (ADR-260 D5)', () => {
  it('registerScoring takes no options and only flips enablement', () => {
    const world = new WorldModel();
    expect(world.isScoringEnabled()).toBe(false);

    registerScoring(world);

    expect(world.isScoringEnabled()).toBe(true);
    // The ladder travels the generic path, not the registration.
    expect(world.getRanks()).toEqual([]);
    expect(registerScoring.length).toBe(1);
  });

  it('is idempotent — calling it on every load is correct', () => {
    const world = new WorldModel();
    registerScoring(world);
    world.setRanks(LADDER);
    registerScoring(world);

    expect(world.isScoringEnabled()).toBe(true);
    expect(world.getRanks()).toHaveLength(3);
  });

  it('registerScoringPlugin installs exactly one rank watcher', () => {
    const registered: unknown[] = [];
    registerScoringPlugin({ register: (p) => registered.push(p) });

    expect(registered).toHaveLength(1);
    expect(registered[0]).toBeInstanceOf(RankWatcherPlugin);
  });
});
