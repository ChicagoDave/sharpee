/**
 * AudioRegistry unit tests — verifies cue registration, pool resolution,
 * atmosphere builder, ducking config, and fade defaults.
 *
 * Public interface under test: AudioRegistry, AtmosphereBuilder.
 * Owner context: @sharpee/media (ADR-138)
 */

import { describe, test, expect } from 'vitest';
import { createTypedEvent } from '@sharpee/core';
import { AudioRegistry } from '../src/audio/audio-registry';
import type { VariationPool } from '../src/audio/audio-registry';

describe('AudioRegistry', () => {
  // ── Cues ────────────────────────────────────────────────────────────

  describe('cue registration and firing', () => {
    test('registerCue + cue() returns single-element array with the factory result', () => {
      const registry = new AudioRegistry();
      const factory = () => createTypedEvent('audio.sfx', { src: 'sfx/click.mp3', volume: 0.8 });

      registry.registerCue('ui.click', factory);
      const events = registry.cue('ui.click');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('audio.sfx');
      expect(events[0].data.src).toBe('sfx/click.mp3');
      expect(events[0].data.volume).toBe(0.8);
    });

    test('cue() on unregistered name returns empty array', () => {
      const registry = new AudioRegistry();

      const events = registry.cue('nonexistent');

      expect(events).toEqual([]);
    });

    test('each cue() call invokes the factory fresh (unique event ids)', () => {
      const registry = new AudioRegistry();
      registry.registerCue('test', () =>
        createTypedEvent('audio.sfx', { src: 'test.mp3' }),
      );

      const [first] = registry.cue('test');
      const [second] = registry.cue('test');

      expect(first.id).not.toBe(second.id);
    });
  });

  // ── Pools ───────────────────────────────────────────────────────────

  describe('pool registration and resolution', () => {
    test('registerPool + cue() returns audio.sfx event with source from pool', () => {
      const registry = new AudioRegistry();
      const pool: VariationPool = {
        sources: ['step-1.mp3', 'step-2.mp3', 'step-3.mp3'],
        volume: 0.6,
      };

      registry.registerPool('footstep', pool);
      const events = registry.cue('footstep');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('audio.sfx');
      expect(pool.sources).toContain(events[0].data.src);
    });

    test('pool resolution clamps volume to [0, 1] range', () => {
      const registry = new AudioRegistry();
      const pool: VariationPool = {
        sources: ['test.mp3'],
        volume: 0.95,
        volumeJitter: 0.2, // could push above 1.0
      };

      registry.registerPool('loud', pool);

      // Run multiple times to exercise jitter
      for (let i = 0; i < 50; i++) {
        const [event] = registry.cue('loud');
        expect(event.data.volume).toBeGreaterThanOrEqual(0);
        expect(event.data.volume).toBeLessThanOrEqual(1);
      }
    });

    test('pool with no jitter uses exact base volume', () => {
      const registry = new AudioRegistry();
      const pool: VariationPool = {
        sources: ['test.mp3'],
        volume: 0.7,
        // no jitter specified
      };

      registry.registerPool('exact', pool);
      const [event] = registry.cue('exact');

      expect(event.data.volume).toBe(0.7);
    });

    test('pool defaults volume to 1.0 when omitted', () => {
      const registry = new AudioRegistry();
      const pool: VariationPool = {
        sources: ['test.mp3'],
        // no volume specified
      };

      registry.registerPool('default-vol', pool);
      const [event] = registry.cue('default-vol');

      expect(event.data.volume).toBe(1.0);
    });

    test('cue resolution checks cues before pools', () => {
      const registry = new AudioRegistry();

      // Register both a cue and a pool with the same name
      registry.registerCue('clash', () =>
        createTypedEvent('audio.sfx', { src: 'from-cue.mp3' }),
      );
      registry.registerPool('clash', { sources: ['from-pool.mp3'] });

      const [event] = registry.cue('clash');

      // Cue takes priority
      expect(event.data.src).toBe('from-cue.mp3');
    });
  });

  // ── Ducking ─────────────────────────────────────────────────────────

  describe('ducking config', () => {
    test('getDucking() returns sensible defaults', () => {
      const registry = new AudioRegistry();
      const ducking = registry.getDucking();

      expect(ducking.duckVolume).toBe(0.3);
      expect(ducking.attackMs).toBe(100);
      expect(ducking.releaseMs).toBe(500);
      expect(ducking.targets).toEqual(['music', 'ambient']);
    });

    test('setDucking() merges partial config with defaults', () => {
      const registry = new AudioRegistry();

      registry.setDucking({ duckVolume: 0.1, attackMs: 50 });
      const ducking = registry.getDucking();

      expect(ducking.duckVolume).toBe(0.1);
      expect(ducking.attackMs).toBe(50);
      // Unset fields retain defaults
      expect(ducking.releaseMs).toBe(500);
      expect(ducking.targets).toEqual(['music', 'ambient']);
    });
  });

  // ── Atmospheres ─────────────────────────────────────────────────────

  describe('atmosphere registration', () => {
    test('registerAtmosphere() + getAtmosphere() round-trips', () => {
      const registry = new AudioRegistry();
      const atmosphere = {
        ambient: [{ src: 'wind.mp3', channel: 'wind', volume: 0.3 }],
        music: { src: 'theme.mp3', volume: 0.4 },
        effect: { effect: 'reverb' as const, target: 'ambient:wind' as const, params: { decay: 2 } },
      };

      registry.registerAtmosphere('room.cave', atmosphere);

      expect(registry.getAtmosphere('room.cave')).toEqual(atmosphere);
    });

    test('getAtmosphere() returns undefined for unregistered room', () => {
      const registry = new AudioRegistry();

      expect(registry.getAtmosphere('room.nowhere')).toBeUndefined();
    });
  });

  describe('AtmosphereBuilder', () => {
    test('fluent builder registers atmosphere with all three layers', () => {
      const registry = new AudioRegistry();

      registry
        .atmosphere('room.bridge')
        .ambient('ambient/hum.mp3', 'environment', 0.3)
        .ambient('ambient/beeps.mp3', 'machinery', 0.15)
        .music('music/bridge.mp3', 0.4)
        .effect('lowpass', 'ambient:environment', { frequency: 2000, q: 1 })
        .build();

      const atmo = registry.getAtmosphere('room.bridge');

      expect(atmo).toBeDefined();
      expect(atmo!.ambient).toHaveLength(2);
      expect(atmo!.ambient[0]).toEqual({ src: 'ambient/hum.mp3', channel: 'environment', volume: 0.3 });
      expect(atmo!.ambient[1]).toEqual({ src: 'ambient/beeps.mp3', channel: 'machinery', volume: 0.15 });
      expect(atmo!.music).toEqual({ src: 'music/bridge.mp3', volume: 0.4 });
      expect(atmo!.effect).toEqual({
        effect: 'lowpass',
        target: 'ambient:environment',
        params: { frequency: 2000, q: 1 },
      });
    });

    test('builder with ambient only omits music and effect', () => {
      const registry = new AudioRegistry();

      registry
        .atmosphere('room.forest')
        .ambient('ambient/birds.mp3', 'nature', 0.5)
        .build();

      const atmo = registry.getAtmosphere('room.forest');

      expect(atmo).toBeDefined();
      expect(atmo!.ambient).toHaveLength(1);
      expect(atmo!.music).toBeUndefined();
      expect(atmo!.effect).toBeUndefined();
    });
  });

  // ── Fade Defaults ───────────────────────────────────────────────────

  describe('fade defaults', () => {
    test('getFadeDefaults() returns sensible defaults', () => {
      const registry = new AudioRegistry();
      const fades = registry.getFadeDefaults();

      expect(fades.ambientIn).toBe(2000);
      expect(fades.ambientOut).toBe(2000);
      expect(fades.musicIn).toBe(1000);
      expect(fades.effectTransition).toBe(2000);
    });

    test('setFadeDefaults() merges partial config with defaults', () => {
      const registry = new AudioRegistry();

      registry.setFadeDefaults({ musicIn: 500 });
      const fades = registry.getFadeDefaults();

      expect(fades.musicIn).toBe(500);
      // Unset fields retain defaults
      expect(fades.ambientIn).toBe(2000);
      expect(fades.ambientOut).toBe(2000);
      expect(fades.effectTransition).toBe(2000);
    });
  });
});
