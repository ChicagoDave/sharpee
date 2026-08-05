/**
 * EngineRandomService.reseedStreams tests (ADR-302 D5/D8 — branching vs resuming).
 *
 * Derived from the Behavior Statement:
 *
 *  - DOES: drops the named points' live streams and restored stream states, so
 *    each one's next draw re-derives from its point-seed override if active,
 *    else from `(masterSeed, pointName)`.
 *  - WHEN: called after a restore, by a harness starting a NEW run from a saved
 *    state rather than resuming one.
 *  - BECAUSE: a save's stream states are the parent's history; a branch wants
 *    the world state but not the luck. Without this, both seed instruments are
 *    inert for any point that already drew.
 *  - REJECTS WHEN: nothing. Idempotent, and silent on names that never drew.
 *
 * The first test is the measured regression this method exists for: before it,
 * a child restoring its parent's save produced byte-identical draws whether its
 * master seed matched the parent's or not.
 *
 * The catalog is process-global, so point names here are unique to this file.
 */

import { describe, it, expect } from 'vitest';
import { definePoint, createSeededRandom, deriveStreamSeed } from '@sharpee/core';
import { EngineRandomService } from '../src/engine-random-service';

const PARENT_SEED = 42;
const CHILD_SEED = 999;

const yesNo = { classes: ['yes', 'no'] as const };

const ALPHA = definePoint('test-reseed.alpha', yesNo);
const BETA = definePoint('test-reseed.beta', yesNo);

/** Play a parent session that draws at ALPHA and never touches BETA. */
function parentSave(): Record<string, number> {
  const parent = new EngineRandomService(PARENT_SEED);
  for (let i = 0; i < 3; i++) parent.int(ALPHA, 0, 999);
  return parent.serializeStreamStates();
}

const drawThree = (service: EngineRandomService, point: typeof ALPHA) =>
  [0, 1, 2].map(() => service.int(point, 0, 999));

describe('reseedStreams — branching from a save rather than resuming it', () => {
  it('the measured defect: without reseeding, a child\'s master seed is inert on a drawn point', () => {
    // Pinned so the regression is legible if it ever returns. This is the
    // behavior that made ADR-302 D8's "seed is overridable, and that is the
    // point" false as built.
    const saved = parentSave();

    const sameSeed = new EngineRandomService(PARENT_SEED);
    sameSeed.restoreStreamStates(saved);

    const differentSeed = new EngineRandomService(CHILD_SEED);
    differentSeed.restoreStreamStates(saved);

    expect(drawThree(differentSeed, ALPHA)).toEqual(drawThree(sameSeed, ALPHA));
  });

  it('after reseeding, the child\'s master seed governs the drawn point', () => {
    const saved = parentSave();

    const child = new EngineRandomService(CHILD_SEED);
    child.restoreStreamStates(saved);
    child.reseedStreams([ALPHA.name]);

    const fresh = new EngineRandomService(CHILD_SEED);

    expect(drawThree(child, ALPHA)).toEqual(drawThree(fresh, ALPHA));
  });

  it('a reseeded point derives from (masterSeed, name), not from the save', () => {
    const saved = parentSave();
    const child = new EngineRandomService(CHILD_SEED);
    child.restoreStreamStates(saved);
    child.reseedStreams([ALPHA.name]);

    const reference = createSeededRandom(deriveStreamSeed(CHILD_SEED, ALPHA.name));
    expect(drawThree(child, ALPHA)).toEqual([0, 1, 2].map(() => reference.int(0, 999)));
  });

  it('a point-seed override reaches a reseeded point — the narrow instrument works', () => {
    // This is D5's actual use case: same state, one point re-rolled, the rest
    // of the firing schedule left alone.
    const saved = parentSave();

    const child = new EngineRandomService(PARENT_SEED);
    child.setPointSeedOverrides({ [ALPHA.name]: 7 });
    child.restoreStreamStates(saved);
    child.reseedStreams([ALPHA.name]);

    const fresh = new EngineRandomService(PARENT_SEED);
    fresh.setPointSeedOverrides({ [ALPHA.name]: 7 });

    expect(drawThree(child, ALPHA)).toEqual(drawThree(fresh, ALPHA));
  });

  it('reseeds only the points named — an unnamed point keeps its continuity', () => {
    // The whole reason to name points rather than reseed everything: an
    // untouched point must go on exactly as a plain restore would leave it, or
    // the firing schedule shifts under a test that asked to vary one thing.
    const parent = new EngineRandomService(PARENT_SEED);
    for (let i = 0; i < 3; i++) parent.int(ALPHA, 0, 999);
    for (let i = 0; i < 3; i++) parent.int(BETA, 0, 999);
    const saved = parent.serializeStreamStates();

    const resumed = new EngineRandomService(PARENT_SEED);
    resumed.restoreStreamStates(saved);

    const branched = new EngineRandomService(PARENT_SEED);
    branched.restoreStreamStates(saved);
    branched.reseedStreams([ALPHA.name]);

    expect(drawThree(branched, BETA)).toEqual(drawThree(resumed, BETA));
  });

  it('`all` reseeds every stream — the blunt instrument, and it is blunt', () => {
    const parent = new EngineRandomService(PARENT_SEED);
    for (let i = 0; i < 3; i++) parent.int(ALPHA, 0, 999);
    for (let i = 0; i < 3; i++) parent.int(BETA, 0, 999);
    const saved = parent.serializeStreamStates();

    const branched = new EngineRandomService(CHILD_SEED);
    branched.restoreStreamStates(saved);
    branched.reseedStreams('all');

    const fresh = new EngineRandomService(CHILD_SEED);
    expect(drawThree(branched, ALPHA)).toEqual(drawThree(fresh, ALPHA));
    expect(drawThree(branched, BETA)).toEqual(drawThree(fresh, BETA));
  });

  it('drops a live stream too, not only a restored one', () => {
    // A point that drew in THIS session has a live stream rather than a
    // restored state; reseeding has to reach both or it works only before the
    // first draw.
    const service = new EngineRandomService(PARENT_SEED);
    const before = drawThree(service, ALPHA);
    service.reseedStreams([ALPHA.name]);
    expect(drawThree(service, ALPHA)).toEqual(before);
  });

  it('is idempotent', () => {
    const saved = parentSave();
    const once = new EngineRandomService(CHILD_SEED);
    once.restoreStreamStates(saved);
    once.reseedStreams([ALPHA.name]);

    const twice = new EngineRandomService(CHILD_SEED);
    twice.restoreStreamStates(saved);
    twice.reseedStreams([ALPHA.name]);
    twice.reseedStreams([ALPHA.name]);

    expect(drawThree(twice, ALPHA)).toEqual(drawThree(once, ALPHA));
  });

  it('is silent on a point that never drew', () => {
    const saved = parentSave();
    const named = new EngineRandomService(PARENT_SEED);
    named.restoreStreamStates(saved);
    named.reseedStreams([BETA.name, 'test-reseed.never-existed']);

    const untouched = new EngineRandomService(PARENT_SEED);
    untouched.restoreStreamStates(saved);

    expect(drawThree(named, BETA)).toEqual(drawThree(untouched, BETA));
  });

  it('leaves occurrence counters alone, so a parent-numbered force still means what it said', () => {
    // Occurrences index a point's firings across the session. A branch child
    // is the same game in every respect except the luck it asked to re-roll.
    const service = new EngineRandomService(PARENT_SEED);
    service.int(ALPHA, 0, 999);
    service.int(ALPHA, 0, 999);
    service.reseedStreams([ALPHA.name]);

    const traced: number[] = [];
    service.setTraceSink((record) => traced.push(record.occurrence));
    service.int(ALPHA, 0, 999);

    // Third firing of the point, not a restart at 1.
    expect(traced).toEqual([3]);
  });

  it('does not disturb serialization — a reseeded point re-serializes from its new stream', () => {
    const saved = parentSave();
    const child = new EngineRandomService(CHILD_SEED);
    child.restoreStreamStates(saved);
    child.reseedStreams([ALPHA.name]);
    child.int(ALPHA, 0, 999);

    const states = child.serializeStreamStates();
    expect(states[ALPHA.name]).toBeDefined();
    expect(states[ALPHA.name]).not.toBe(saved[ALPHA.name]);
  });
});
