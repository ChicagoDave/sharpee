/**
 * Fixture RandomService for stdlib unit tests (ADR-293 D6 test-fixture
 * exemption — `createSeededRandom` is callable from test fixtures only).
 *
 * Mirrors the engine implementation's derivation (per-point streams via
 * `deriveStreamSeed`) without importing engine, which stdlib cannot depend
 * on. Force lookup is a pass-through, exactly like the engine's until
 * ADR-293 Phase C.
 *
 * Public interface: `createFixtureRandomService(masterSeed?)`.
 * Owner context: basic-combat test harness.
 */

import {
  ChoicePoint,
  RandomService,
  SeededRandom,
  createSeededRandom,
  deriveStreamSeed
} from '@sharpee/core';

/** Deterministic per-point RandomService for tests. */
export function createFixtureRandomService(masterSeed = 12345): RandomService {
  const streams = new Map<string, SeededRandom>();

  function streamFor(name: string): SeededRandom {
    let stream = streams.get(name);
    if (!stream) {
      stream = createSeededRandom(deriveStreamSeed(masterSeed, name));
      streams.set(name, stream);
    }
    return stream;
  }

  return {
    chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean {
      return streamFor(p.name).chance(probability);
    },
    int(p: ChoicePoint, min: number, max: number): number {
      return streamFor(p.name).int(min, max);
    },
    pick<T>(p: ChoicePoint, items: readonly T[]): T {
      return streamFor(p.name).pick([...items]);
    },
    resolve<C extends string, R>(
      p: ChoicePoint<C>,
      sample: (draw: SeededRandom) => { cls: C; value: R },
      _materialize: (forced: C) => R
    ): { cls: C; value: R } {
      return sample(streamFor(p.name));
    }
  };
}
