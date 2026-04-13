/**
 * Integration tests for the audio event forwarding pipeline.
 *
 * Simulates the pattern used by BrowserPlatform: engine emits events,
 * isAudioEvent() filters them, and a handler callback receives audio
 * events. Proves the full path from AudioRegistry.cue() through to
 * a consumer callback.
 *
 * Owner context: @sharpee/media (ADR-138)
 */

import { describe, test, expect, vi } from 'vitest';
import { createTypedEvent } from '@sharpee/core';
import type { ISemanticEvent } from '@sharpee/core';
import { AudioRegistry } from '../src/audio/audio-registry';
import { isAudioEvent } from '../src/audio/events';
import type { AudioEvent } from '../src/audio/events';
import '../src/audio/registry-merge';

/**
 * Simulates the browser platform's event forwarding pattern:
 * engine.on('event', cb) → isAudioEvent check → handler callback.
 */
function createEventForwarder() {
  const audioHandler = vi.fn<(event: AudioEvent) => void>();
  const nonAudioHandler = vi.fn<(event: ISemanticEvent) => void>();

  function onEngineEvent(event: ISemanticEvent): void {
    if (isAudioEvent(event)) {
      audioHandler(event as AudioEvent);
    } else {
      nonAudioHandler(event);
    }
  }

  return { onEngineEvent, audioHandler, nonAudioHandler };
}

describe('Audio event forwarding pipeline', () => {
  test('AudioRegistry.cue() → isAudioEvent → handler receives the event', () => {
    const registry = new AudioRegistry();
    registry.registerCue('door.open', () =>
      createTypedEvent('audio.sfx', { src: 'sfx/door.mp3', volume: 0.7 }),
    );

    const { onEngineEvent, audioHandler } = createEventForwarder();

    const events = registry.cue('door.open');
    for (const event of events) {
      onEngineEvent(event);
    }

    expect(audioHandler).toHaveBeenCalledTimes(1);
    const received = audioHandler.mock.calls[0][0];
    expect(received.type).toBe('audio.sfx');
    expect(received.data.src).toBe('sfx/door.mp3');
    expect(received.data.volume).toBe(0.7);
  });

  test('non-audio events are not forwarded to the audio handler', () => {
    const { onEngineEvent, audioHandler, nonAudioHandler } = createEventForwarder();

    const event = createTypedEvent('if.event.action_completed', {
      actionId: 'if.action.taking',
      actorId: 'player',
      success: true,
    });
    onEngineEvent(event);

    expect(audioHandler).not.toHaveBeenCalled();
    expect(nonAudioHandler).toHaveBeenCalledTimes(1);
  });

  test('pool-based cue fires event with source from pool', () => {
    const registry = new AudioRegistry();
    const sources = ['step-1.mp3', 'step-2.mp3', 'step-3.mp3'];
    registry.registerPool('footstep', { sources, volume: 0.6 });

    const { onEngineEvent, audioHandler } = createEventForwarder();

    const events = registry.cue('footstep');
    for (const event of events) {
      onEngineEvent(event);
    }

    expect(audioHandler).toHaveBeenCalledTimes(1);
    const received = audioHandler.mock.calls[0][0];
    expect(received.type).toBe('audio.sfx');
    expect(sources).toContain(received.data.src);
  });

  test('multiple audio event types forwarded in sequence', () => {
    const { onEngineEvent, audioHandler } = createEventForwarder();

    const sfx = createTypedEvent('audio.sfx', { src: 'sfx/click.mp3' });
    const music = createTypedEvent('audio.music.play', { src: 'music/theme.mp3', volume: 0.5 });
    const ambient = createTypedEvent('audio.ambient.play', {
      src: 'ambient/rain.mp3',
      channel: 'weather',
      volume: 0.3,
    });

    onEngineEvent(sfx);
    onEngineEvent(music);
    onEngineEvent(ambient);

    expect(audioHandler).toHaveBeenCalledTimes(3);
    expect(audioHandler.mock.calls[0][0].type).toBe('audio.sfx');
    expect(audioHandler.mock.calls[1][0].type).toBe('audio.music.play');
    expect(audioHandler.mock.calls[2][0].type).toBe('audio.ambient.play');
  });

  test('mixed audio and non-audio events are correctly separated', () => {
    const { onEngineEvent, audioHandler, nonAudioHandler } = createEventForwarder();

    const sfx = createTypedEvent('audio.sfx', { src: 'test.mp3' });
    const action = createTypedEvent('if.event.action_completed', {
      actionId: 'if.action.going',
      actorId: 'player',
      success: true,
    });
    const music = createTypedEvent('audio.music.stop', { fadeOut: 500 });

    onEngineEvent(sfx);
    onEngineEvent(action);
    onEngineEvent(music);

    expect(audioHandler).toHaveBeenCalledTimes(2);
    expect(nonAudioHandler).toHaveBeenCalledTimes(1);

    expect(audioHandler.mock.calls[0][0].type).toBe('audio.sfx');
    expect(audioHandler.mock.calls[1][0].type).toBe('audio.music.stop');
    expect(nonAudioHandler.mock.calls[0][0].type).toBe('if.event.action_completed');
  });

  test('handler receives exact event object without mutation', () => {
    const { onEngineEvent, audioHandler } = createEventForwarder();

    const original = createTypedEvent('audio.effect', {
      target: 'ambient:wind',
      effect: 'lowpass',
      params: { frequency: 2000, q: 1 },
      transition: 500,
    });

    onEngineEvent(original);

    const received = audioHandler.mock.calls[0][0];
    expect(received).toBe(original); // same reference, no copying
    expect(received.data).toEqual(original.data);
  });

  test('all nine audio event types pass through the pipeline', () => {
    const { onEngineEvent, audioHandler } = createEventForwarder();

    const events: ISemanticEvent[] = [
      createTypedEvent('audio.sfx', { src: 'test.mp3' }),
      createTypedEvent('audio.music.play', { src: 'theme.mp3' }),
      createTypedEvent('audio.music.stop', {}),
      createTypedEvent('audio.ambient.play', { src: 'rain.mp3', channel: 'weather' }),
      createTypedEvent('audio.ambient.stop', { channel: 'weather' }),
      createTypedEvent('audio.ambient.stop_all', {}),
      createTypedEvent('audio.procedural', { recipe: 'beep' }),
      createTypedEvent('audio.effect', { target: 'master', effect: 'reverb', params: { decay: 2 } }),
      createTypedEvent('audio.effect.clear', { target: 'master' }),
    ];

    for (const event of events) {
      onEngineEvent(event);
    }

    expect(audioHandler).toHaveBeenCalledTimes(9);

    const receivedTypes = audioHandler.mock.calls.map(call => call[0].type);
    expect(receivedTypes).toEqual([
      'audio.sfx',
      'audio.music.play',
      'audio.music.stop',
      'audio.ambient.play',
      'audio.ambient.stop',
      'audio.ambient.stop_all',
      'audio.procedural',
      'audio.effect',
      'audio.effect.clear',
    ]);
  });

  test('unregistered cue produces no events and no handler calls', () => {
    const registry = new AudioRegistry();
    const { onEngineEvent, audioHandler } = createEventForwarder();

    const events = registry.cue('nonexistent');
    for (const event of events) {
      onEngineEvent(event);
    }

    expect(events).toEqual([]);
    expect(audioHandler).not.toHaveBeenCalled();
  });
});
