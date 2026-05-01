/**
 * @sharpee/story-channel-service-test — scenarios
 *
 * Scripted `ITextBlock` and `ISemanticEvent` sequences for the
 * channel-service Phase 2 acceptance tests.
 *
 * Each scenario is a self-contained data object. The test files import
 * what they need and drive `produceTurnPacket` directly. No mutable
 * state — scenarios may be reused across tests safely.
 *
 * @see ADR-163 — Channel-Service Platform
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';

// ─── Builders ──────────────────────────────────────────────────────────

/**
 * Construct an `ITextBlock` from a key and content array. Convenience
 * wrapper for the verbose object literal — scenarios become readable.
 */
export function block(key: string, ...content: TextContent[]): ITextBlock {
  return { key, content };
}

/**
 * Construct an `ISemanticEvent` from a type and payload. The fixture
 * does not care about `id`, `timestamp`, or `entities`; tests that need
 * them can assemble the event manually. The default values here are
 * deterministic so test snapshots stay stable.
 */
export function event(type: string, data?: unknown, id = 'fixture-event'): ISemanticEvent {
  return {
    id,
    type,
    timestamp: 0,
    entities: {},
    data,
  };
}

// ─── A single playable turn (AC-3) ─────────────────────────────────────

/**
 * One turn of typical engine output: enter a room, see contents, status
 * bar updates. Drives the round-trip test for `main`, `location`,
 * `score`, and `turn` channels.
 *
 * Expected derived payloads (after rules applied):
 *  - `main`: append-mode array of three TextContent[] (room.name,
 *    room.description, room.contents)
 *  - `location`: `'West of House'`
 *  - `score`: `{ current: 0, max: 350 }`
 *  - `turn`: `1`
 */
export const SCENARIO_BASIC_TURN = {
  textBlocks: [
    block(CORE_BLOCK_KEYS.ROOM_NAME, { type: 'room', content: ['West of House'] }),
    block(
      CORE_BLOCK_KEYS.ROOM_DESCRIPTION,
      'You are standing in an open field west of a white house, with a boarded front door.',
    ),
    block(
      CORE_BLOCK_KEYS.ROOM_CONTENTS,
      'There is a small mailbox here.',
    ),
    block(CORE_BLOCK_KEYS.STATUS_ROOM, 'West of House'),
    block(CORE_BLOCK_KEYS.STATUS_SCORE, '0 / 350'),
    block(CORE_BLOCK_KEYS.STATUS_TURNS, '1'),
  ] as ReadonlyArray<ITextBlock>,
  events: [] as ReadonlyArray<ISemanticEvent>,
};

// ─── Per-event media scenarios (AC-6) ──────────────────────────────────

/**
 * One scenario per ADR-101 event type, each carrying a representative
 * payload. Tests register the necessary channels (image:main,
 * ambient:wind, etc.) before driving these.
 */
export const MEDIA_SCENARIOS = {
  imageShow: event('media.image.show', {
    src: 'rooms/west-of-house.png',
    layer: 'main',
    transition: { type: 'fade', duration: 500 },
  }),

  /**
   * Image show with hotspots. The `action` field on each hotspot
   * should be renamed to `command` by the routing rule (ADR-163 §7).
   */
  imageShowWithHotspots: event('media.image.show', {
    src: 'puzzles/combination-lock.png',
    layer: 'overlay',
    hotspots: [
      { id: 'dial1', bounds: { x: 10, y: 50, w: 30, h: 30 }, action: 'turn dial 1' },
      { id: 'dial2', bounds: { x: 50, y: 50, w: 30, h: 30 }, action: 'turn dial 2' },
      { id: 'dial3', bounds: { x: 90, y: 50, w: 30, h: 30 }, action: 'turn dial 3' },
    ],
  }),

  imageHide: event('media.image.hide', {
    layer: 'main',
    transition: { type: 'fade', duration: 250 },
  }),

  imagePreload: event('media.image.preload', {
    src: ['rooms/cave-1.png', 'rooms/cave-2.png'],
  }),

  /**
   * Sound play with a `channel` field (ADR-101 mixer-bus terminology).
   * The routing rule should rename this to `bus` on the wire.
   */
  soundPlay: event('media.sound.play', {
    src: 'sfx/door-open.mp3',
    channel: 'sfx',
    volume: 0.8,
  }),

  /** Sound play without `channel` — bus rename should be a no-op. */
  soundPlayNoBus: event('media.sound.play', {
    src: 'sfx/footstep.mp3',
    volume: 0.5,
  }),

  musicPlay: event('media.music.play', {
    src: 'music/exploration.mp3',
    fadeIn: 1000,
    loop: true,
    volume: 0.4,
  }),

  musicStop: event('media.music.stop', { fadeOut: 500 }),

  ambientPlay: event('media.ambient.play', {
    src: 'audio/wind.mp3',
    channel: 'wind',
    volume: 0.3,
    loop: true,
  }),

  ambientStop: event('media.ambient.stop', { channel: 'wind', fadeOut: 1000 }),

  /**
   * Animation play with `onComplete` — the rule must drop this field
   * (ADR-163 §9 — triggers are one-way; no engine completion tracking).
   */
  animationPlay: event('media.animation.play', {
    src: 'animations/torch-flicker.json',
    layer: 'main',
    loop: true,
    onComplete: 'animation.done',
  }),

  animate: event('media.animate', {
    target: { layer: 'main' },
    properties: { opacity: 0, x: 100 },
    duration: 750,
    easing: 'ease-out',
  }),

  transition: event('media.transition', {
    transition: { type: 'fade', duration: 500 },
  }),

  layoutConfigure: event('media.layout.configure', {
    layout: {
      main: { type: 'text', position: 'left', width: '60%' },
      graphics: { type: 'image', position: 'right', width: '40%' },
      status: { type: 'status', position: 'top', height: '32px' },
    },
  }),

  clearMain: event('media.clear', { target: 'main' }),
  clearAll: event('media.clear', { target: 'all' }),
};

// ─── Clear-truncation scenario (AC-8) ──────────────────────────────────

/**
 * Five turns of plain `main`-channel appends followed by one `clear`
 * targeting main. The renderer's accumulated buffer should be empty
 * after the clear; subsequent appends restart accumulation.
 */
export const SCENARIO_CLEAR_TRUNCATION = {
  /** Turns 1–5: each emits one room.description block contributing to main. */
  appendTurns: [
    { textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Line 1')], events: [] },
    { textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Line 2')], events: [] },
    { textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Line 3')], events: [] },
    { textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Line 4')], events: [] },
    { textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Line 5')], events: [] },
  ] as ReadonlyArray<{
    textBlocks: ReadonlyArray<ITextBlock>;
    events: ReadonlyArray<ISemanticEvent>;
  }>,

  /** Turn 6: clear main. */
  clearTurn: {
    textBlocks: [] as ReadonlyArray<ITextBlock>,
    events: [event('media.clear', { target: 'main' })] as ReadonlyArray<ISemanticEvent>,
  },

  /** Turn 7: post-clear append, should NOT carry the prior 5 lines. */
  postClearTurn: {
    textBlocks: [block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'Fresh line after clear')] as ReadonlyArray<ITextBlock>,
    events: [] as ReadonlyArray<ISemanticEvent>,
  },
};

// ─── Ten-turn walk for repaint identity (AC-12) ────────────────────────

/**
 * A 10-turn sequence exercising the platform contract end-to-end:
 *  - Turn 1: opening room + initial status (info / ifid emit).
 *  - Turn 2: "look" — re-emits room contents.
 *  - Turn 3: take an item — action.result + status update.
 *  - Turn 4: idle (turn counter advances; main stays empty).
 *  - Turn 5: media event — show portrait image (image:portrait).
 *  - Turn 6: ambient kicks in — ambient:wind starts.
 *  - Turn 7: room change — new room.name + location update + score change.
 *  - Turn 8: clear main — drops accumulated prose for the new scene.
 *  - Turn 9: post-clear narrative.
 *  - Turn 10: ambient stop + music play.
 *
 * Channels exercised: main, location, score, turn, image:portrait,
 * ambient:wind, music. The fresh-init + replay test must produce the
 * same final renderer state as the live run.
 */
export const SCENARIO_TEN_TURN_WALK: ReadonlyArray<{
  textBlocks: ReadonlyArray<ITextBlock>;
  events: ReadonlyArray<ISemanticEvent>;
}> = [
  // Turn 1 — opening room
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ROOM_NAME, { type: 'room', content: ['Foyer'] }),
      block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A grand foyer.'),
      block(CORE_BLOCK_KEYS.STATUS_ROOM, 'Foyer'),
      block(CORE_BLOCK_KEYS.STATUS_SCORE, '0 / 100'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '1'),
    ],
    events: [],
  },
  // Turn 2 — look
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A grand foyer with a portrait on the wall.'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '2'),
    ],
    events: [],
  },
  // Turn 3 — take item
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ACTION_RESULT, 'You take ', { type: 'item', content: ['the brass key'] }, '.'),
      block(CORE_BLOCK_KEYS.STATUS_SCORE, '5 / 100'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '3'),
    ],
    events: [],
  },
  // Turn 4 — idle (only status updates)
  {
    textBlocks: [block(CORE_BLOCK_KEYS.STATUS_TURNS, '4')],
    events: [],
  },
  // Turn 5 — image show
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ACTION_RESULT, 'You examine the portrait closely.'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '5'),
    ],
    events: [
      event('media.image.show', { src: 'images/portrait.png', layer: 'portrait' }),
    ],
  },
  // Turn 6 — ambient starts
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ACTION_RESULT, 'A draft moves through the room.'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '6'),
    ],
    events: [
      event('media.ambient.play', { src: 'audio/wind.mp3', channel: 'wind', volume: 0.3, loop: true }),
    ],
  },
  // Turn 7 — room change
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ROOM_NAME, { type: 'room', content: ['Library'] }),
      block(CORE_BLOCK_KEYS.ROOM_DESCRIPTION, 'A dusty library.'),
      block(CORE_BLOCK_KEYS.STATUS_ROOM, 'Library'),
      block(CORE_BLOCK_KEYS.STATUS_SCORE, '10 / 100'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '7'),
    ],
    events: [],
  },
  // Turn 8 — clear main (scene transition)
  {
    textBlocks: [block(CORE_BLOCK_KEYS.STATUS_TURNS, '8')],
    events: [event('media.clear', { target: 'main' })],
  },
  // Turn 9 — post-clear narrative
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.GAME_MESSAGE, 'Time passes...'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '9'),
    ],
    events: [],
  },
  // Turn 10 — ambient stop + music
  {
    textBlocks: [
      block(CORE_BLOCK_KEYS.ACTION_RESULT, 'Music swells.'),
      block(CORE_BLOCK_KEYS.STATUS_TURNS, '10'),
    ],
    events: [
      event('media.ambient.stop', { channel: 'wind' }),
      event('media.music.play', { src: 'music/finale.mp3', volume: 0.6 }),
    ],
  },
];

/**
 * Story-defined channels referenced by the ten-turn walk. The repaint
 * test must register these alongside the platform standard + media
 * channels before driving the scenario.
 */
export const TEN_TURN_STORY_CHANNELS = ['image:portrait', 'ambient:wind'] as const;
