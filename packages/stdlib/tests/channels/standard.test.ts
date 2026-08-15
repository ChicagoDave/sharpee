/**
 * Tests for the standard `IOChannel` closures.
 *
 * Each closure is invoked with a hand-built `ChannelProduceContext`
 * and the return value asserted directly. No `ChannelService`, no
 * engine, no real story — pure unit tests.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import {
  roomNameChannel,
  roomDescriptionChannel,
  roomContentsChannel,
  actionResultChannel,
  actionBlockedChannel,
  errorChannel,
  gameMessageChannel,
  PROSE_CHANNELS,
  preferredLayoutChannel,
  STANDARD_CHANNELS,
  promptChannel,
  locationChannel,
  scoreChannel,
  turnChannel,
  infoChannel,
  ifidChannel,
  prologueChannel,
  bannerChannel,
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

function makeBlock(
  key: string,
  text: string,
  opts?: { tight?: boolean; className?: string },
) {
  return {
    key,
    content: [text],
    ...(opts?.tight ? { tight: true } : {}),
    ...(opts?.className ? { className: opts.className } : {}),
  };
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
  /** ADR-260 D1: score comes from the LEDGER; there is no scoring capability. */
  ledger?: { score: number; maxScore?: number };
  storyInfo?: {
    title?: string;
    authors?: string[];
    testers?: string[];
    version?: string;
    ifid?: string;
    prologue?: string;
  };
  player?: { id: string };
  room?: { id: string; name: string };
} = {}) {
  return {
    getCapability(name: string): Record<string, unknown> | undefined {
      if (name === 'storyInfo' && opts.storyInfo) return opts.storyInfo as Record<string, unknown>;
      return undefined;
    },
    hasCapability(name: string) {
      return Boolean(this.getCapability(name));
    },
    ...(opts.ledger
      ? {
          getScore: () => opts.ledger!.score,
          getMaxScore: () => opts.ledger!.maxScore ?? 0,
        }
      : {}),
    getPlayer() {
      return opts.player;
    },
    getContainingRoom(_id: string) {
      return opts.room;
    },
  } as unknown;
}

// ────────────────────────────────────────────────────────────────────
//  prose channels (ADR-300 D8) + preferred-layout (D9)
// ────────────────────────────────────────────────────────────────────

describe('prose channels', () => {
  it('routes each prose block key to its own channel', () => {
    const blocks = [
      makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
      makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A dark cave.'),
      makeBlock(CORE_BLOCK_KEYS.ROOM_CONTENTS, 'There is a lamp here.'),
      makeBlock(CORE_BLOCK_KEYS.ACTION_RESULT, 'You take the lamp.'),
      makeBlock(CORE_BLOCK_KEYS.ACTION_BLOCKED, 'It is locked.'),
      makeBlock(CORE_BLOCK_KEYS.ERROR, 'I do not know that verb.'),
      makeBlock(CORE_BLOCK_KEYS.GAME_MESSAGE, 'Welcome.'),
    ];

    expect(roomNameChannel.produce(makeCtx({ blocks }))).toEqual([{ content: ['Cave'] }]);
    expect(roomDescriptionChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['A dark cave.'] },
    ]);
    expect(roomContentsChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['There is a lamp here.'] },
    ]);
    expect(actionResultChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['You take the lamp.'] },
    ]);
    expect(actionBlockedChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['It is locked.'] },
    ]);
    expect(errorChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['I do not know that verb.'] },
    ]);
    expect(gameMessageChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['Welcome.'] },
    ]);
  });

  it('takes only its own blocks, ignoring the other prose channels', () => {
    const result = roomDescriptionChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A dark cave.'),
          makeBlock(CORE_BLOCK_KEYS.ACTION_RESULT, 'You take the lamp.'),
        ],
      }),
    );
    expect(result).toEqual([{ content: ['A dark cave.'] }]);
  });

  it('skips status blocks (status.score, status.turns, status.room)', () => {
    const blocks = [
      makeBlock(CORE_BLOCK_KEYS.STATUS_SCORE, '42'),
      makeBlock(CORE_BLOCK_KEYS.STATUS_TURNS, '5'),
      makeBlock(CORE_BLOCK_KEYS.STATUS_ROOM, 'Forest'),
      makeBlock(CORE_BLOCK_KEYS.GAME_MESSAGE, 'Welcome.'),
    ];
    for (const channel of PROSE_CHANNELS) {
      const produced = channel.produce(makeCtx({ blocks })) as unknown[];
      expect(produced.length).toBe(channel === gameMessageChannel ? 1 : 0);
    }
    expect(preferredLayoutChannel.produce(makeCtx({ blocks }))).toEqual(['game-message']);
  });

  it('threads `tight: true` and `className` from blocks to entries', () => {
    const result = roomDescriptionChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'It is dark.', {
            tight: true,
            className: 'cave-prose',
          }),
        ],
      }),
    );
    expect(result).toEqual([
      { content: ['It is dark.'], tight: true, className: 'cave-prose' },
    ]);
  });

  it('returns an empty array when no blocks match', () => {
    for (const channel of PROSE_CHANNELS) {
      expect(channel.produce(makeCtx({ blocks: [] }))).toEqual([]);
    }
  });

  it('is sparse — an empty array is emitted as no-entries, not as prose', () => {
    for (const channel of PROSE_CHANNELS) {
      expect(channel.emit).toBe('sparse');
      expect(channel.mode).toBe('append');
    }
  });
});

describe('preferredLayoutChannel.produce', () => {
  it('names the source channel of every prose entry, in block order', () => {
    const result = preferredLayoutChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.ACTION_RESULT, 'You go north.'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A dark cave.'),
        ],
      }),
    );
    // Action result BEFORE room name — the interleaving a fixed render
    // order gets wrong, which is why D9 rejects one.
    expect(result).toEqual(['action-result', 'room-name', 'room-description']);
  });

  it('repeats a channel id once per entry that channel produced', () => {
    const result = preferredLayoutChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.GAME_MESSAGE, 'First.'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
          makeBlock(CORE_BLOCK_KEYS.GAME_MESSAGE, 'Second.'),
        ],
      }),
    );
    expect(result).toEqual(['game-message', 'room-name', 'game-message']);
  });

  it('emits an empty order on a turn that produced no prose', () => {
    expect(preferredLayoutChannel.produce(makeCtx({ blocks: [] }))).toEqual([]);
  });

  it('emits always, so a client never re-renders the previous turn', () => {
    expect(preferredLayoutChannel.emit).toBe('always');
    expect(preferredLayoutChannel.mode).toBe('replace');
  });

  it('excludes non-prose blocks from the order', () => {
    const result = preferredLayoutChannel.produce(
      makeCtx({
        blocks: [
          makeBlock(CORE_BLOCK_KEYS.PROMPT, '> '),
          makeBlock(CORE_BLOCK_KEYS.STATUS_SCORE, '42'),
          makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'Cave'),
        ],
      }),
    );
    expect(result).toEqual(['room-name']);
  });
});

describe('STANDARD_CHANNELS registration order', () => {
  it('registers preferred-layout after every prose channel', () => {
    // ORDER-SENSITIVE (ADR-300 D9). The manifest is walked in
    // registration order, and the browser composes prose by buffering
    // each channel's entries and flushing them when the layout arrives.
    // Registering the layout first would flush an empty buffer and drop
    // the turn's prose entirely.
    const ids = STANDARD_CHANNELS.map((c) => c.id);
    const layoutAt = ids.indexOf('preferred-layout');
    expect(layoutAt).toBeGreaterThan(-1);
    for (const prose of PROSE_CHANNELS) {
      expect(ids.indexOf(prose.id)).toBeLessThan(layoutAt);
    }
  });

  it('registers the opening (prologue, banner) before the prose flush', () => {
    // ORDER-SENSITIVE. A client that appends each channel's output as it is
    // dispatched renders in registration order, so the story-start emissions
    // have to arrive before `preferred-layout` flushes the turn's prose —
    // otherwise the banner lands behind the first room description, which is
    // what ADR-298 D3's "prologue precedes the banner, banner opens the game"
    // rules out.
    const ids = STANDARD_CHANNELS.map((c) => c.id);
    const layoutAt = ids.indexOf('preferred-layout');
    expect(ids.indexOf('prologue')).toBeLessThan(layoutAt);
    expect(ids.indexOf('banner')).toBeLessThan(layoutAt);
    expect(ids.indexOf('prologue')).toBeLessThan(ids.indexOf('banner'));
    for (const prose of PROSE_CHANNELS) {
      expect(ids.indexOf('banner')).toBeLessThan(ids.indexOf(prose.id));
    }
  });

  it('registers exactly one channel per prose id, with no `main` left', () => {
    const ids = STANDARD_CHANNELS.map((c) => c.id);
    expect(ids).not.toContain('main');
    for (const prose of PROSE_CHANNELS) {
      expect(ids.filter((id) => id === prose.id).length).toBe(1);
    }
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
  it('returns { current, max } from the score ledger', () => {
    const world = makeWorldStub({ ledger: { score: 42, maxScore: 100 } });
    expect(scoreChannel.produce(makeCtx({ world }))).toEqual({ current: 42, max: 100 });
  });

  it('returns max: null when maxScore is 0 (unbounded)', () => {
    const world = makeWorldStub({ ledger: { score: 5, maxScore: 0 } });
    expect(scoreChannel.produce(makeCtx({ world }))).toEqual({ current: 5, max: null });
  });

  it('returns undefined when the world exposes no ledger', () => {
    const world = makeWorldStub();
    expect(scoreChannel.produce(makeCtx({ world }))).toBeUndefined();
  });

  it('ignores a story-registered `scoring` capability (ADR-260 D1)', () => {
    // A story may keep private bookkeeping under that name. It is NOT the
    // scoring contract, and the channel must not read it.
    const world = {
      ...(makeWorldStub({ ledger: { score: 7, maxScore: 20 } }) as object),
      getCapability: (name: string) =>
        name === 'scoring' ? { scoreValue: 999, maxScore: 999 } : undefined,
    } as unknown;
    expect(scoreChannel.produce(makeCtx({ world }))).toEqual({ current: 7, max: 20 });
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
  it('returns title/authors/testers/version from the storyInfo capability', () => {
    const world = makeWorldStub({
      storyInfo: {
        title: 'Cloak',
        authors: ['Roger Firth', 'Sharpee Team'],
        testers: ['Joe Mason'],
        version: '1.0',
      },
    });
    expect(infoChannel.produce(makeCtx({ world }))).toEqual({
      title: 'Cloak',
      authors: ['Roger Firth', 'Sharpee Team'],
      testers: ['Joe Mason'],
      version: '1.0',
    });
  });

  it('carries authors as an array, never a joined string (ADR-298 data-only wire)', () => {
    const world = makeWorldStub({
      storyInfo: { authors: ['A One', 'B Two'] },
    });
    const payload = infoChannel.produce(makeCtx({ world })) as { authors?: unknown };
    expect(Array.isArray(payload.authors)).toBe(true);
    expect(payload.authors).toEqual(['A One', 'B Two']);
  });

  it('suppresses empty authors/testers arrays', () => {
    const world = makeWorldStub({
      storyInfo: { title: 'Sparse', authors: [], testers: [] },
    });
    expect(infoChannel.produce(makeCtx({ world }))).toEqual({ title: 'Sparse' });
  });

  it('returns undefined when storyInfo is absent', () => {
    expect(infoChannel.produce(makeCtx({ world: makeWorldStub() }))).toBeUndefined();
  });
});

describe('prologueChannel.produce', () => {
  it('returns the resolved prologue text from storyInfo', () => {
    const world = makeWorldStub({
      storyInfo: { prologue: 'A cold night falls over Fernhill.' },
    });
    expect(prologueChannel.produce(makeCtx({ world }))).toBe(
      'A cold night falls over Fernhill.',
    );
  });

  it('suppresses emission when the prologue is absent or empty', () => {
    expect(
      prologueChannel.produce(makeCtx({ world: makeWorldStub({ storyInfo: { title: 'T' } }) })),
    ).toBeUndefined();
    expect(
      prologueChannel.produce(makeCtx({ world: makeWorldStub({ storyInfo: { prologue: '' } }) })),
    ).toBeUndefined();
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

describe('banner channel (opening is addressable on its own)', () => {
  const bannerBlock = (text: string, className: string) => ({
    key: 'game.banner',
    content: [text],
    className,
  });

  it('carries each banner piece as its own property', () => {
    const result = bannerChannel.produce(
      makeCtx({
        blocks: [
          bannerBlock('DUNGEON', 'game-title'),
          bannerBlock('Story v4.3.0', 'story-version'),
          bannerBlock('Sharpee v4.3.0', 'platform-version'),
          bannerBlock('A port of Mainframe Zork (1981)', 'sub-title'),
          bannerBlock('By Tim Anderson', 'author-list'),
          bannerBlock('Ported by David Cornelson', 'author-list'),
          bannerBlock('', 'banner-spacer'),
        ],
      }),
    );

    expect(result).toEqual({
      title: 'DUNGEON',
      storyVersion: 'Story v4.3.0',
      platformVersion: 'Sharpee v4.3.0',
      subtitle: 'A port of Mainframe Zork (1981)',
      credits: ['By Tim Anderson', 'Ported by David Cornelson'],
    });
  });

  it('collects unclassed story-tail lines separately from the credits', () => {
    const result = bannerChannel.produce(
      makeCtx({
        blocks: [
          bannerBlock('DUNGEON', 'game-title'),
          { key: 'game.banner', content: ['Type HELP for instructions.'] },
        ],
      }),
    ) as Record<string, unknown>;

    expect(result.tail).toEqual(['Type HELP for instructions.']);
    expect(result.credits).toBeUndefined();
  });

  it('emits nothing on a turn with no banner blocks', () => {
    const result = bannerChannel.produce(
      makeCtx({ blocks: [makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'West of House')] }),
    );

    expect(result).toBeUndefined();
  });

  it('keeps banner blocks off the prose channels and out of the layout', () => {
    const blocks = [
      bannerBlock('DUNGEON', 'game-title'),
      makeBlock(CORE_BLOCK_KEYS.ROOM_NAME, 'West of House'),
    ];

    expect(roomNameChannel.produce(makeCtx({ blocks }))).toEqual([
      { content: ['West of House'] },
    ]);
    expect(preferredLayoutChannel.produce(makeCtx({ blocks }))).toEqual(['room-name']);
  });
});
