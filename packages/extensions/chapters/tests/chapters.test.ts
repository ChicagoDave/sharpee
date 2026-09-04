/**
 * chapters.test.ts — scaffolding for the chapters plugin and channel over a
 * hand-built world: forward-only begins, one fire per row, the stale event,
 * and the channel's projection. The REAL path — `GameEngine.executeTurn`
 * through the loader on a Chord fixture — is
 * `packages/story-loader/tests/adr-330-chapters.test.ts` (rule 13a).
 */
import { describe, expect, it } from 'vitest';
import type { TurnPluginContext } from '@sharpee/plugins';
import {
  CHAPTER_ANNOUNCED_KEY,
  CHAPTER_BEGAN_EVENT,
  CHAPTER_CURRENT_KEY,
  CHAPTER_FIRED_PREFIX,
  CHAPTER_STALE_EVENT,
  chapterChannel,
  createChaptersPlugin,
  type ChapterRow,
} from '../src';

/** A world that is only a state map — all the plugin reads. */
function fakeWorld() {
  const state = new Map<string, unknown>();
  return {
    state,
    getStateValue: (k: string) => state.get(k),
    setStateValue: (k: string, v: unknown) => void state.set(k, v),
  };
}

const rows: ChapterRow[] = [
  { name: 'market', title: 'Chapter I', description: 'An apple.', ordinal: 0, trigger: { kind: 'game-starts' } },
  { name: 'street', title: 'Chapter II', description: '', ordinal: 1, trigger: { kind: 'first-visit', roomId: 'r_street' } },
  { name: 'chase', title: 'Chapter III', description: '', ordinal: 2, trigger: { kind: 'becomes', stateKey: 'chord.story.state', state: 'chase' } },
  { name: 'ball', title: 'Chapter IV', description: '', ordinal: 3, trigger: { kind: 'timer-expires', stateKey: 'chord.timer.player.bell' } },
];

const ctx = (world: ReturnType<typeof fakeWorld>, turn: number, playerLocation: string): TurnPluginContext =>
  ({ world, turn, playerId: 'p', playerLocation, random: undefined as never }) as unknown as TurnPluginContext;

describe('createChaptersPlugin', () => {
  it('the opening row begins on the first turn and writes the current ordinal and its fired flag', () => {
    const world = fakeWorld();
    const events = createChaptersPlugin(rows).onAfterAction(ctx(world, 1, 'r_market'));
    expect(events.map((e) => e.type)).toEqual([CHAPTER_BEGAN_EVENT]);
    expect(events[0].data).toEqual({ name: 'market', title: 'Chapter I', description: 'An apple.', ordinal: 0 });
    expect(world.state.get(CHAPTER_CURRENT_KEY)).toBe(0);
    expect(world.state.get(CHAPTER_FIRED_PREFIX + 'market')).toBe(true);
  });

  it('a first visit begins its chapter once; standing there again emits nothing', () => {
    const world = fakeWorld();
    const plugin = createChaptersPlugin(rows);
    plugin.onAfterAction(ctx(world, 1, 'r_market'));
    const first = plugin.onAfterAction(ctx(world, 2, 'r_street'));
    const again = plugin.onAfterAction(ctx(world, 3, 'r_street'));
    expect(first.map((e) => e.type)).toEqual([CHAPTER_BEGAN_EVENT]);
    expect((first[0].data as { name: string }).name).toBe('street');
    expect(again).toEqual([]);
    expect(world.state.get(CHAPTER_CURRENT_KEY)).toBe(1);
  });

  it('a state anchor and a timer expiry each begin their chapter when the world state says so', () => {
    const world = fakeWorld();
    const plugin = createChaptersPlugin(rows);
    plugin.onAfterAction(ctx(world, 1, 'r_market'));
    world.setStateValue('chord.story.state', 'chase');
    expect(plugin.onAfterAction(ctx(world, 2, 'r_market')).map((e) => (e.data as { name: string }).name)).toEqual(['chase']);
    world.setStateValue('chord.timer.player.bell', { phase: 'expired', index: 0, startedTurn: 2 });
    expect(plugin.onAfterAction(ctx(world, 3, 'r_market')).map((e) => (e.data as { name: string }).name)).toEqual(['ball']);
    expect(world.state.get(CHAPTER_CURRENT_KEY)).toBe(3);
  });

  it('a stale trigger — an earlier row firing after a later chapter began — changes nothing and raises runtime.chapter-stale once', () => {
    const world = fakeWorld();
    const plugin = createChaptersPlugin(rows);
    plugin.onAfterAction(ctx(world, 1, 'r_market'));
    world.setStateValue('chord.story.state', 'chase');
    plugin.onAfterAction(ctx(world, 2, 'r_market'));
    const late = plugin.onAfterAction(ctx(world, 3, 'r_street'));
    expect(late.map((e) => e.type)).toEqual([CHAPTER_STALE_EVENT]);
    expect((late[0].data as { chapter: string; current: number }).chapter).toBe('street');
    expect((late[0].data as { current: number }).current).toBe(2);
    expect(world.state.get(CHAPTER_CURRENT_KEY)).toBe(2);
    expect(plugin.onAfterAction(ctx(world, 4, 'r_street'))).toEqual([]);
  });

  it('restored world state is honoured: a fired row and a current ordinal never re-fire', () => {
    const world = fakeWorld();
    world.setStateValue(CHAPTER_CURRENT_KEY, 1);
    world.setStateValue(CHAPTER_ANNOUNCED_KEY, 1);
    world.setStateValue(CHAPTER_FIRED_PREFIX + 'market', true);
    world.setStateValue(CHAPTER_FIRED_PREFIX + 'street', true);
    expect(createChaptersPlugin(rows).onAfterAction(ctx(world, 9, 'r_street'))).toEqual([]);
  });

  it('a seeded-but-unannounced opener (the loader\'s start moment) is announced once on the first turn', () => {
    const world = fakeWorld();
    world.setStateValue(CHAPTER_CURRENT_KEY, 0);
    world.setStateValue(CHAPTER_FIRED_PREFIX + 'market', true);
    const plugin = createChaptersPlugin(rows);
    const first = plugin.onAfterAction(ctx(world, 1, 'r_market'));
    expect(first.map((e) => e.type)).toEqual([CHAPTER_BEGAN_EVENT]);
    expect(world.state.get(CHAPTER_ANNOUNCED_KEY)).toBe(0);
    expect(plugin.onAfterAction(ctx(world, 2, 'r_market'))).toEqual([]);
  });
});

describe('chapterChannel', () => {
  it('projects the turn\'s last story.chapter_began event and is silent otherwise', () => {
    const world = fakeWorld();
    const events = createChaptersPlugin(rows).onAfterAction(ctx(world, 1, 'r_market'));
    const packet = chapterChannel.produce({ world, events, blocks: [], turn: 1, prevValue: undefined });
    expect(packet).toEqual({ name: 'market', title: 'Chapter I', description: 'An apple.', ordinal: 0 });
    expect(chapterChannel.produce({ world, events: [], blocks: [], turn: 2, prevValue: packet })).toBeUndefined();
  });
});
