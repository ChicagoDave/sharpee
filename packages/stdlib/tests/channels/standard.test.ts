/**
 * Tests for the ten standard `IOChannel` closures.
 *
 * Each closure is invoked with a hand-built `ChannelProduceContext`
 * and the return value asserted directly. No `ChannelService`, no
 * engine, no real story — pure unit tests.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import {
  mainChannel,
  promptChannel,
  locationChannel,
  scoreChannel,
  turnChannel,
  infoChannel,
  ifidChannel,
  deathChannel,
  endgameChannel,
  scoreNotifyChannel,
  lifecycleChannel,
  STANDARD_CHANNEL_EVENTS,
} from '../../src/channels';

function makeCtx(over: Partial<ChannelProduceContext> = {}): ChannelProduceContext {
  return {
    world: undefined,
    events: [],
    blocks: [],
    turn: 1,
    prevValue: undefined,
    ...over,
  };
}

function makeBlock(key: string, text: string, opts?: { tight?: boolean }) {
  return { key, content: [text], ...(opts?.tight ? { tight: true } : {}) };
}

function makeEvent(type: string, data: Record<string, unknown> = {}) {
  return {
    id: `e-${type}`,
    type,
    timestamp: 0,
    entities: {},
    data,
  };
}

// Minimal world-model stub providing just the surface the closures use.
function makeWorldStub(opts: {
  scoring?: { scoreValue: number; maxScore?: number };
  storyInfo?: { title?: string; author?: string; version?: string; ifid?: string };
  player?: { id: string };
  room?: { id: string; name: string };
} = {}) {
  return {
    getCapability(name: string): Record<string, unknown> | undefined {
      if (name === 'scoring' && opts.scoring) return opts.scoring as Record<string, unknown>;
      if (name === 'storyInfo' && opts.storyInfo) return opts.storyInfo as Record<string, unknown>;
      return undefined;
    },
    hasCapability(name: string) {
      return Boolean(this.getCapability(name));
    },
    getPlayer() {
      return opts.player;
    },
    getContainingRoom(_id: string) {
      return opts.room;
    },
  } as unknown;
}

// ────────────────────────────────────────────────────────────────────
//  main
// ────────────────────────────────────────────────────────────────────

describe('mainChannel.produce', () => {
  it('projects every block whose key is in MAIN_KEYS into entries', () => {
    const result = mainChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A dark cave.'),
          makeBlock(CORE_BLOCK_KEYS.ACTION_RESULT, 'You take the lamp.'),
        ],
      }),
    );
    expect(result).toEqual([
      { content: ['A dark cave.'] },
      { content: ['You take the lamp.'] },
    ]);
  });

  it('skips status blocks (status.score, status.turns, status.room)', () => {
    const result = mainChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.STATUS_SCORE, '42'),
          makeBlock(CORE_BLOCK_KEYS.STATUS_TURNS, '5'),
          makeBlock(CORE_BLOCK_KEYS.STATUS_ROOM, 'Forest'),
          makeBlock(CORE_BLOCK_KEYS.GAME_MESSAGE, 'Welcome.'),
        ],
      }),
    );
    expect(result).toEqual([{ content: ['Welcome.'] }]);
  });

  it('threads `tight: true` from blocks to entries', () => {
    const result = mainChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'It is dark.', {
            tight: true,
          }),
        ],
      }),
    );
    expect(result).toEqual([
      { content: ['Cave'] },
      { content: ['It is dark.'], tight: true },
    ]);
  });

  it('returns an empty array when no blocks match', () => {
    const result = mainChannel.produce(makeCtx({ blocks: [] }));
    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────
//  prompt
// ────────────────────────────────────────────────────────────────────

describe('promptChannel.produce', () => {
  it('returns the prompt block content as a flattened string', () => {
    const result = promptChannel.produce(
      makeCtx({ blocks: [makeBlock(CORE_BLOCK_KEYS.PROMPT, '> ')] }),
    );
    expect(result).toBe('> ');
  });

  it('falls back to "> " when no prompt block is present', () => {
    expect(promptChannel.produce(makeCtx())).toBe('> ');
  });

  it('flattens decorations within the prompt content', () => {
    const result = promptChannel.produce(
      makeCtx({
        blocks: [
          {
            key: CORE_BLOCK_KEYS.PROMPT,
            content: ['? ', { type: 'em', content: ['hi'] }, ' '],
          },
        ],
      }),
    );
    expect(result).toBe('? hi ');
  });
});

// ────────────────────────────────────────────────────────────────────
//  location
// ────────────────────────────────────────────────────────────────────

describe('locationChannel.produce', () => {
  it('returns the player room name from the world', () => {
    const world = makeWorldStub({
      player: { id: 'p1' },
      room: { id: 'r1', name: 'Forest Clearing' },
    });
    expect(locationChannel.produce(makeCtx({ world }))).toBe('Forest Clearing');
  });

  it('returns undefined when there is no player', () => {
    const world = makeWorldStub();
    expect(locationChannel.produce(makeCtx({ world }))).toBeUndefined();
  });

  it('returns undefined when world is undefined', () => {
    expect(locationChannel.produce(makeCtx({ world: undefined }))).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
//  score
// ────────────────────────────────────────────────────────────────────

describe('scoreChannel.produce', () => {
  it('returns { current, max } from the scoring capability', () => {
    const world = makeWorldStub({ scoring: { scoreValue: 42, maxScore: 100 } });
    expect(scoreChannel.produce(makeCtx({ world }))).toEqual({ current: 42, max: 100 });
  });

  it('returns max: null when maxScore is 0 (unbounded)', () => {
    const world = makeWorldStub({ scoring: { scoreValue: 5, maxScore: 0 } });
    expect(scoreChannel.produce(makeCtx({ world }))).toEqual({ current: 5, max: null });
  });

  it('returns undefined when the scoring capability is absent', () => {
    const world = makeWorldStub();
    expect(scoreChannel.produce(makeCtx({ world }))).toBeUndefined();
  });

  it('returns undefined when world is missing', () => {
    expect(scoreChannel.produce(makeCtx({ world: null }))).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
//  turn
// ────────────────────────────────────────────────────────────────────

describe('turnChannel.produce', () => {
  it('returns ctx.turn directly', () => {
    expect(turnChannel.produce(makeCtx({ turn: 7 }))).toBe(7);
    expect(turnChannel.produce(makeCtx({ turn: 0 }))).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────
//  info / ifid
// ────────────────────────────────────────────────────────────────────

describe('infoChannel.produce', () => {
  it('returns title/author/version from the storyInfo capability', () => {
    const world = makeWorldStub({
      storyInfo: { title: 'Cloak', author: 'RP', version: '1.0' },
    });
    expect(infoChannel.produce(makeCtx({ world }))).toEqual({
      title: 'Cloak',
      author: 'RP',
      version: '1.0',
    });
  });

  it('returns undefined when storyInfo is absent', () => {
    expect(infoChannel.produce(makeCtx({ world: makeWorldStub() }))).toBeUndefined();
  });
});

describe('ifidChannel.produce', () => {
  it('returns the ifid from storyInfo', () => {
    const world = makeWorldStub({ storyInfo: { ifid: 'ABCD-1234' } });
    expect(ifidChannel.produce(makeCtx({ world }))).toBe('ABCD-1234');
  });

  it('returns undefined when ifid is absent', () => {
    const world = makeWorldStub({ storyInfo: { title: 'No-IFID' } });
    expect(ifidChannel.produce(makeCtx({ world }))).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
//  death / endgame / score_notify
// ────────────────────────────────────────────────────────────────────

describe('deathChannel.produce', () => {
  it('emits the message from a player_died event', () => {
    const result = deathChannel.produce(
      makeCtx({
        events: [makeEvent(STANDARD_CHANNEL_EVENTS.PLAYER_DIED, { message: 'You are slain.' })],
      }),
    );
    expect(result).toBe('You are slain.');
  });

  it('returns undefined when no death event fired', () => {
    expect(deathChannel.produce(makeCtx())).toBeUndefined();
  });

  it('returns undefined when the death event has no message field', () => {
    const result = deathChannel.produce(
      makeCtx({ events: [makeEvent(STANDARD_CHANNEL_EVENTS.PLAYER_DIED, {})] }),
    );
    expect(result).toBeUndefined();
  });
});

describe('endgameChannel.produce', () => {
  it('emits the message from a game_won event', () => {
    const result = endgameChannel.produce(
      makeCtx({
        events: [makeEvent(STANDARD_CHANNEL_EVENTS.GAME_WON, { message: 'Victory!' })],
      }),
    );
    expect(result).toBe('Victory!');
  });

  it('emits the message from a game_lost event', () => {
    const result = endgameChannel.produce(
      makeCtx({
        events: [makeEvent(STANDARD_CHANNEL_EVENTS.GAME_LOST, { message: 'Defeat.' })],
      }),
    );
    expect(result).toBe('Defeat.');
  });

  it('returns undefined when no endgame event fired', () => {
    expect(endgameChannel.produce(makeCtx())).toBeUndefined();
  });
});

describe('scoreNotifyChannel.produce', () => {
  it('emits the message from a score_changed event', () => {
    const result = scoreNotifyChannel.produce(
      makeCtx({
        events: [makeEvent(STANDARD_CHANNEL_EVENTS.SCORE_CHANGED, { message: '+10 points' })],
      }),
    );
    expect(result).toBe('+10 points');
  });

  it('returns undefined when no score event fired', () => {
    expect(scoreNotifyChannel.produce(makeCtx())).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
//  lifecycle (save/restore signals — Phase 2 of channel-io-event-retirement)
// ────────────────────────────────────────────────────────────────────

// Platform events store completion data on `payload`, not `data`.
// Build a stub matching the IPlatformEvent shape from
// packages/core/src/events/platform-events.ts.
function makePlatformEvent(
  type: string,
  payload: Record<string, unknown> = {},
) {
  return {
    id: `pe-${type}`,
    type,
    timestamp: 0,
    requiresClientAction: true as const,
    entities: {},
    payload,
  };
}

describe('lifecycleChannel.produce', () => {
  it('returns undefined when no lifecycle event fired', () => {
    expect(lifecycleChannel.produce(makeCtx())).toBeUndefined();
  });

  it('emits save_failed with the payload error message', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [
          makePlatformEvent('platform.save_failed', {
            success: false,
            error: 'Disk full',
          }),
        ],
      }),
    );
    expect(result).toEqual({ kind: 'save_failed', message: 'Disk full' });
  });

  it('emits save_failed with no message when payload has no error string', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [makePlatformEvent('platform.save_failed', { success: false })],
      }),
    );
    expect(result).toEqual({ kind: 'save_failed' });
  });

  it('emits restore_failed with the payload error message', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [
          makePlatformEvent('platform.restore_failed', {
            success: false,
            error: 'No save data available',
          }),
        ],
      }),
    );
    expect(result).toEqual({
      kind: 'restore_failed',
      message: 'No save data available',
    });
  });

  it('emits restore_completed with no message', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [makePlatformEvent('platform.restore_completed', { success: true })],
      }),
    );
    expect(result).toEqual({ kind: 'restore_completed' });
  });

  it('ignores non-lifecycle events', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [
          makePlatformEvent('platform.save_requested', {}),
          makeEvent('if.event.command_error', { reason: 'unrelated' }),
        ],
      }),
    );
    expect(result).toBeUndefined();
  });

  it('uses last-wins when multiple lifecycle events appear in one turn', () => {
    const result = lifecycleChannel.produce(
      makeCtx({
        events: [
          makePlatformEvent('platform.save_failed', { error: 'first' }),
          makePlatformEvent('platform.restore_completed', { success: true }),
        ],
      }),
    );
    expect(result).toEqual({ kind: 'restore_completed' });
  });
});
