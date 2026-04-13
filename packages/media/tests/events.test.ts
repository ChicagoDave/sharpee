/**
 * Audio event type guard and declaration merging tests.
 *
 * Public interface under test: isAudioEvent(), createTypedEvent() with
 * audio event keys (proves declaration merging is active).
 *
 * Owner context: @sharpee/media (ADR-138)
 */

import { describe, test, expect } from 'vitest';
import { createTypedEvent } from '@sharpee/core';
import { isAudioEvent } from '../src/audio/events';

// Import registry-merge to activate declaration merging
import '../src/audio/registry-merge';

describe('isAudioEvent', () => {
  const audioTypes = [
    'audio.sfx',
    'audio.music.play',
    'audio.music.stop',
    'audio.ambient.play',
    'audio.ambient.stop',
    'audio.ambient.stop_all',
    'audio.procedural',
    'audio.effect',
    'audio.effect.clear',
  ] as const;

  test.each(audioTypes)('returns true for %s', (type) => {
    expect(isAudioEvent({ type })).toBe(true);
  });

  const nonAudioTypes = [
    'if.action.taking',
    'if.action.going',
    'platform.save.completed',
    'text:output',
    'client.query',
    'room.entered',
    '',
  ];

  test.each(nonAudioTypes)('returns false for %s', (type) => {
    expect(isAudioEvent({ type })).toBe(false);
  });
});

describe('createTypedEvent declaration merging', () => {
  test('createTypedEvent("audio.sfx") produces valid event', () => {
    const event = createTypedEvent('audio.sfx', {
      src: 'sfx/door-open.mp3',
      volume: 0.8,
      rate: 1.0,
      pan: 0,
      duck: 1,
    });

    expect(event.type).toBe('audio.sfx');
    expect(event.data.src).toBe('sfx/door-open.mp3');
    expect(event.data.volume).toBe(0.8);
    expect(event.data.duck).toBe(1);
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeGreaterThan(0);
  });

  test('createTypedEvent("audio.music.play") produces valid event', () => {
    const event = createTypedEvent('audio.music.play', {
      src: 'music/theme.mp3',
      volume: 0.5,
      fadeIn: 1000,
      loop: true,
    });

    expect(event.type).toBe('audio.music.play');
    expect(event.data.src).toBe('music/theme.mp3');
    expect(event.data.loop).toBe(true);
  });

  test('createTypedEvent("audio.music.stop") produces valid event', () => {
    const event = createTypedEvent('audio.music.stop', { fadeOut: 500 });

    expect(event.type).toBe('audio.music.stop');
    expect(event.data.fadeOut).toBe(500);
  });

  test('createTypedEvent("audio.ambient.play") produces valid event', () => {
    const event = createTypedEvent('audio.ambient.play', {
      src: 'ambient/rain.mp3',
      channel: 'weather',
      volume: 0.3,
      fadeIn: 2000,
      loop: true,
    });

    expect(event.type).toBe('audio.ambient.play');
    expect(event.data.channel).toBe('weather');
  });

  test('createTypedEvent("audio.ambient.stop") produces valid event', () => {
    const event = createTypedEvent('audio.ambient.stop', {
      channel: 'weather',
      fadeOut: 2000,
    });

    expect(event.type).toBe('audio.ambient.stop');
    expect(event.data.channel).toBe('weather');
  });

  test('createTypedEvent("audio.ambient.stop_all") produces valid event', () => {
    const event = createTypedEvent('audio.ambient.stop_all', { fadeOut: 1000 });

    expect(event.type).toBe('audio.ambient.stop_all');
  });

  test('createTypedEvent("audio.procedural") produces valid event', () => {
    const event = createTypedEvent('audio.procedural', {
      recipe: 'beep',
      params: { frequency: 440, duration: 200 },
      volume: 0.9,
    });

    expect(event.type).toBe('audio.procedural');
    expect(event.data.recipe).toBe('beep');
    expect(event.data.params).toEqual({ frequency: 440, duration: 200 });
  });

  test('createTypedEvent("audio.effect") produces valid event', () => {
    const event = createTypedEvent('audio.effect', {
      target: 'ambient:wind',
      effect: 'lowpass',
      params: { frequency: 2000, q: 1 },
      transition: 500,
    });

    expect(event.type).toBe('audio.effect');
    expect(event.data.target).toBe('ambient:wind');
    expect(event.data.effect).toBe('lowpass');
  });

  test('createTypedEvent("audio.effect.clear") produces valid event', () => {
    const event = createTypedEvent('audio.effect.clear', {
      target: 'master',
      transition: 200,
    });

    expect(event.type).toBe('audio.effect.clear');
    expect(event.data.target).toBe('master');
  });

  test('isAudioEvent recognizes events from createTypedEvent', () => {
    const sfx = createTypedEvent('audio.sfx', { src: 'test.mp3' });
    const music = createTypedEvent('audio.music.play', { src: 'theme.mp3' });

    expect(isAudioEvent(sfx)).toBe(true);
    expect(isAudioEvent(music)).toBe(true);
  });
});
