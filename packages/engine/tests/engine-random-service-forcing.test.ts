/**
 * EngineRandomService Phase C tests (ADR-293 D8, D9, D11, D16 — Phase C/1).
 *
 * Derived from the Behavior Statement: force-table load validation and typed
 * rejections (D9), forced firings substituting classes with zero draws (D8),
 * occurrence-index matching (D9), point-seed overrides leaving every other
 * point's derivation untouched (D11), and trace records with provenance for
 * drawn and forced firings, silent when no sink is installed (D16). The
 * catalog is process-global, so point names here are unique to this file.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  definePoint,
  createSeededRandom,
  deriveStreamSeed,
  DuplicateForceKeyError,
  UnknownForcePointError,
  UndeclaredForceClassError,
  IRandomTraceData
} from '@sharpee/core';
import { EngineRandomService } from '../src/engine-random-service';
import { setupTestEngine } from './test-helpers/setup-test-engine';

const MASTER_SEED = 424242;
const yesNo = { classes: ['yes', 'no'] as const };
const BLOW_CLASSES = ['MISSED', 'SERIOUS_WOUND', 'KILLED'] as const;
type BlowClass = (typeof BLOW_CLASSES)[number];

/** Sample helper: one table draw + one follow-up draw, classed by threshold. */
function blowSample(draw: { int(min: number, max: number): number }): {
  cls: BlowClass;
  value: number;
} {
  const roll = draw.int(1, 100);
  const followUp = draw.int(1, 10);
  const cls: BlowClass = roll > 90 ? 'KILLED' : roll > 50 ? 'SERIOUS_WOUND' : 'MISSED';
  return { cls, value: roll * 1000 + followUp };
}

describe('loadForces validation (D9, AC-13 groundwork)', () => {
  it('rejects a force naming an unknown point', () => {
    const service = new EngineRandomService(MASTER_SEED);
    expect(() =>
      service.loadForces([
        { point: 'test-forcing.never-declared', cls: 'yes', mode: 'once' }
      ])
    ).toThrow(UnknownForcePointError);
  });

  it('rejects a force naming a class the point does not declare', () => {
    definePoint('test-forcing.declared-yes-no', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    expect(() =>
      service.loadForces([
        { point: 'test-forcing.declared-yes-no', cls: 'KILLED', mode: 'once' }
      ])
    ).toThrow(UndeclaredForceClassError);
  });

  it('rejects a force on a plain draw (no classes)', () => {
    definePoint('test-forcing.plain');
    const service = new EngineRandomService(MASTER_SEED);
    expect(() =>
      service.loadForces([{ point: 'test-forcing.plain', cls: 'yes', mode: 'once' }])
    ).toThrow(/plain draw and declares no classes/);
  });

  it('rejects duplicate force keys, including across separate loads', () => {
    definePoint('test-forcing.duplicate', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: 'test-forcing.duplicate', cls: 'yes', mode: 'once' }]);
    expect(() =>
      service.loadForces([{ point: 'test-forcing.duplicate', cls: 'no', mode: 'once' }])
    ).toThrow(DuplicateForceKeyError);
  });

  it('treats indexed and unindexed keys on one point as distinct, not duplicates', () => {
    definePoint('test-forcing.indexed-distinct', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: 'test-forcing.indexed-distinct', cls: 'yes', mode: 'once' },
      { point: 'test-forcing.indexed-distinct', occurrence: 2, cls: 'no', mode: 'once' }
    ]);
    expect(service.getForceReport()).toHaveLength(2);
  });

  it('rejects a non-positive or non-integer occurrence index', () => {
    definePoint('test-forcing.bad-occurrence', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    expect(() =>
      service.loadForces([
        { point: 'test-forcing.bad-occurrence', occurrence: 0, cls: 'yes', mode: 'once' }
      ])
    ).toThrow(/positive integer/);
    expect(() =>
      service.loadForces([
        { point: 'test-forcing.bad-occurrence', occurrence: 1.5, cls: 'yes', mode: 'once' }
      ])
    ).toThrow(/positive integer/);
  });
});

describe('forced chance (D8 — yes/no bijection, zero draws)', () => {
  it('substitutes the forced class and leaves the stream untouched', () => {
    const point = definePoint('test-forcing.chance-forced', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: 'test-forcing.chance-forced', cls: 'yes', mode: 'once' }
    ]);

    // probability 0 would always draw false — the force overrides.
    expect(service.chance(point, 0)).toBe(true);

    // Zero draws consumed: the NEXT draw is the stream's FIRST value.
    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-forcing.chance-forced')
    );
    expect(service.chance(point, 0.5)).toBe(reference.chance(0.5));
  });

  it("forces 'no' to false even at probability 1", () => {
    const point = definePoint('test-forcing.chance-forced-no', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: 'test-forcing.chance-forced-no', cls: 'no', mode: 'once' }
    ]);
    expect(service.chance(point, 1)).toBe(false);
  });

  it('a once force fires exactly once; later firings draw naturally', () => {
    const point = definePoint('test-forcing.chance-once', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: 'test-forcing.chance-once', cls: 'yes', mode: 'once' }]);

    service.chance(point, 0); // forced
    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-forcing.chance-once')
    );
    expect(service.chance(point, 0.5)).toBe(reference.chance(0.5)); // natural
    expect(service.getForceReport()).toEqual([
      {
        spec: { point: 'test-forcing.chance-once', cls: 'yes', mode: 'once' },
        fireCount: 1
      }
    ]);
  });

  it('a sticky force fires on every reach and reports its count', () => {
    const point = definePoint('test-forcing.chance-sticky', yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: 'test-forcing.chance-sticky', cls: 'yes', mode: 'sticky' }
    ]);

    expect(service.chance(point, 0)).toBe(true);
    expect(service.chance(point, 0)).toBe(true);
    expect(service.chance(point, 0)).toBe(true);
    expect(service.getForceReport()[0].fireCount).toBe(3);
  });
});

describe('forced resolve (D8 — materialize, zero draws)', () => {
  it('materializes the forced class without calling sample', () => {
    const point = definePoint('test-forcing.resolve-forced', { classes: BLOW_CLASSES });
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: 'test-forcing.resolve-forced', cls: 'KILLED', mode: 'once' }
    ]);
    const sample = vi.fn(blowSample);
    const materialize = vi.fn((cls: BlowClass) => (cls === 'KILLED' ? -999 : 0));

    const outcome = service.resolve(point, sample, materialize);

    expect(outcome).toEqual({ cls: 'KILLED', value: -999 });
    expect(sample).not.toHaveBeenCalled();
    expect(materialize).toHaveBeenCalledWith('KILLED');
  });

  it('a forced firing consumes zero draws: the next natural resolve matches an unforced run shifted by one firing (AC-10)', () => {
    const name = 'test-forcing.resolve-zero-draw';
    const point = definePoint(name, { classes: BLOW_CLASSES });

    // Unforced reference: the stream's first sample.
    const reference = createSeededRandom(deriveStreamSeed(MASTER_SEED, name));
    const expectedFirstNatural = blowSample(reference);

    // Forced run: firing #1 forced, firing #2 draws naturally — and must
    // produce the sequence an unforced run produces at its FIRST firing,
    // because the force consumed nothing.
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: name, occurrence: 1, cls: 'MISSED', mode: 'once' }]);
    service.resolve(point, blowSample, () => 0);
    expect(service.resolve(point, blowSample, () => 0)).toEqual(expectedFirstNatural);
  });

  it("a forced run leaves every OTHER point's sequence identical (D3 + D8)", () => {
    const forcedName = 'test-forcing.other-points-forced';
    const bystander = definePoint('test-forcing.other-points-bystander', yesNo);
    const point = definePoint(forcedName, { classes: BLOW_CLASSES });

    const unforced = new EngineRandomService(MASTER_SEED);
    const unforcedDraws = [
      unforced.int(bystander, 0, 1000000),
      (unforced.resolve(point, blowSample, () => 0), unforced.int(bystander, 0, 1000000)),
      unforced.int(bystander, 0, 1000000)
    ];

    const forced = new EngineRandomService(MASTER_SEED);
    forced.loadForces([{ point: forcedName, cls: 'KILLED', mode: 'sticky' }]);
    const forcedDraws = [
      forced.int(bystander, 0, 1000000),
      (forced.resolve(point, blowSample, () => 0), forced.int(bystander, 0, 1000000)),
      forced.int(bystander, 0, 1000000)
    ];

    expect(forcedDraws).toEqual(unforcedDraws);
  });
});

describe('occurrence indexing (D9 — the AC-9 motivating shape)', () => {
  it('an indexed force applies only at its occurrence; unindexed firings draw naturally', () => {
    const name = 'test-forcing.occurrence-indexed';
    const point = definePoint(name, { classes: BLOW_CLASSES });
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: name, occurrence: 1, cls: 'SERIOUS_WOUND', mode: 'once' },
      { point: name, occurrence: 2, cls: 'SERIOUS_WOUND', mode: 'once' }
    ]);

    // Firings #1 and #2 forced; #3 draws naturally — the wound-spiral shape:
    // the natural draw continues from an untouched stream (zero draws consumed
    // by the two forces), so it equals the unforced stream's FIRST sample.
    const first = service.resolve(point, blowSample, () => 0);
    const second = service.resolve(point, blowSample, () => 0);
    const reference = createSeededRandom(deriveStreamSeed(MASTER_SEED, name));
    const third = service.resolve(point, blowSample, () => 0);

    expect(first.cls).toBe('SERIOUS_WOUND');
    expect(second.cls).toBe('SERIOUS_WOUND');
    expect(third).toEqual(blowSample(reference));
  });

  it('an indexed force beats an unindexed force at its occurrence', () => {
    const name = 'test-forcing.indexed-beats-unindexed';
    const point = definePoint(name, yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([
      { point: name, cls: 'yes', mode: 'sticky' },
      { point: name, occurrence: 2, cls: 'no', mode: 'once' }
    ]);

    expect(service.chance(point, 0.5)).toBe(true); // #1: unindexed sticky
    expect(service.chance(point, 0.5)).toBe(false); // #2: indexed wins
    expect(service.chance(point, 0.5)).toBe(true); // #3: unindexed sticky again

    // The fireCount split proves exactly one entry matched per firing: the
    // sticky force fired at #1 and #3 only, the indexed force at #2 only.
    const report = service.getForceReport();
    expect(report.find((s) => s.spec.occurrence === undefined)?.fireCount).toBe(2);
    expect(report.find((s) => s.spec.occurrence === 2)?.fireCount).toBe(1);
  });

  it('int and pick advance the occurrence counter but never consult the force table (ruling 2a)', () => {
    const name = 'test-forcing.int-not-forced';
    const point = definePoint(name, yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    // Force occurrence #2. Firing #1 is an int() — it must count as an
    // occurrence yet not fire the force; firing #2 (chance) fires it.
    service.loadForces([{ point: name, occurrence: 2, cls: 'yes', mode: 'once' }]);

    const reference = createSeededRandom(deriveStreamSeed(MASTER_SEED, name));
    expect(service.int(point, 0, 1000000)).toBe(reference.int(0, 1000000)); // natural
    expect(service.chance(point, 0)).toBe(true); // forced at #2
  });
});

describe('point-seed override (D11)', () => {
  it("moves one point's stream start and leaves every other point's derivation untouched", () => {
    const overridden = definePoint('test-forcing.override-target');
    const untouched = definePoint('test-forcing.override-bystander');
    const OVERRIDE_SEED = 777001;

    const service = new EngineRandomService(MASTER_SEED, {
      pointSeedOverrides: { 'test-forcing.override-target': OVERRIDE_SEED }
    });

    // The overridden point starts at exactly the override seed — the draw
    // genuinely happens on a real stream (provenance stays 'drawn').
    expect(service.int(overridden, 0, 1000000)).toBe(
      createSeededRandom(OVERRIDE_SEED).int(0, 1000000)
    );
    // The bystander derives from the master seed exactly as without overrides.
    expect(service.int(untouched, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, 'test-forcing.override-bystander')
      ).int(0, 1000000)
    );
  });

  it('setPointSeedOverrides applies to streams not yet materialized; a live stream keeps its state', () => {
    const late = definePoint('test-forcing.override-late');
    const alreadyLive = definePoint('test-forcing.override-already-live');
    const service = new EngineRandomService(MASTER_SEED);

    const firstDraw = service.int(alreadyLive, 0, 1000000); // materializes the stream
    service.setPointSeedOverrides({
      'test-forcing.override-late': 555001,
      'test-forcing.override-already-live': 555002
    });

    expect(service.int(late, 0, 1000000)).toBe(
      createSeededRandom(555001).int(0, 1000000)
    );
    // The live stream continues its original sequence — the override is inert.
    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-forcing.override-already-live')
    );
    reference.int(0, 1000000); // consume the draw already taken
    expect(service.int(alreadyLive, 0, 1000000)).toBe(reference.int(0, 1000000));
    void firstDraw;
  });

  it('a restored save state wins over an override for that point', () => {
    const point = definePoint('test-forcing.override-vs-restore');
    const service = new EngineRandomService(MASTER_SEED, {
      pointSeedOverrides: { 'test-forcing.override-vs-restore': 111 }
    });
    service.restoreStreamStates({ 'test-forcing.override-vs-restore': 222 });

    expect(service.int(point, 0, 1000000)).toBe(
      createSeededRandom(222).int(0, 1000000)
    );
  });
});

describe('trace (D16)', () => {
  it('emits a drawn record with class, value, occurrence, and draws consumed', () => {
    const point = definePoint('test-forcing.trace-drawn', { classes: BLOW_CLASSES });
    const records: IRandomTraceData[] = [];
    const service = new EngineRandomService(MASTER_SEED, {
      traceSink: (r) => records.push(r)
    });

    const outcome = service.resolve(point, blowSample, () => 0);

    expect(records).toEqual([
      {
        point: 'test-forcing.trace-drawn',
        occurrence: 1,
        cls: outcome.cls,
        value: outcome.value,
        provenance: 'drawn',
        drawsConsumed: 2 // blowSample draws twice — the D16 multi-draw count
      }
    ]);
  });

  it('emits a forced record with provenance, mode, key index, and zero draws', () => {
    const name = 'test-forcing.trace-forced';
    const point = definePoint(name, { classes: BLOW_CLASSES });
    const records: IRandomTraceData[] = [];
    const service = new EngineRandomService(MASTER_SEED, {
      traceSink: (r) => records.push(r)
    });
    service.loadForces([{ point: name, occurrence: 1, cls: 'KILLED', mode: 'once' }]);

    service.resolve(point, blowSample, () => -1);

    expect(records).toEqual([
      {
        point: name,
        occurrence: 1,
        cls: 'KILLED',
        value: -1,
        provenance: 'forced',
        drawsConsumed: 0,
        forceMode: 'once',
        forceOccurrence: 1
      }
    ]);
  });

  it('traces class-less draws (int/pick) without a cls field, and labels picks', () => {
    const intPoint = definePoint('test-forcing.trace-int');
    const pickPoint = definePoint('test-forcing.trace-pick');
    const records: IRandomTraceData[] = [];
    const service = new EngineRandomService(MASTER_SEED, {
      traceSink: (r) => records.push(r)
    });

    const n = service.int(intPoint, 1, 6);
    service.pick(pickPoint, ['north', 'south'] as const, (d) => `exit:${d}`);

    expect(records[0]).toEqual({
      point: 'test-forcing.trace-int',
      occurrence: 1,
      value: n,
      provenance: 'drawn',
      drawsConsumed: 1
    });
    expect(records[1].value).toMatch(/^exit:(north|south)$/);
    expect(records[1].cls).toBeUndefined();
  });

  it('chance traces yes/no as the class for drawn firings', () => {
    const point = definePoint('test-forcing.trace-chance', yesNo);
    const records: IRandomTraceData[] = [];
    const service = new EngineRandomService(MASTER_SEED, {
      traceSink: (r) => records.push(r)
    });

    const result = service.chance(point, 0.5);

    expect(records[0].cls).toBe(result ? 'yes' : 'no');
    expect(records[0].provenance).toBe('drawn');
    expect(records[0].drawsConsumed).toBe(1);
  });

  it('is silent when no sink is installed, and installing one does not perturb draws (AC-14 groundwork)', () => {
    const name = 'test-forcing.trace-silent';
    const point = definePoint(name, { classes: BLOW_CLASSES });

    const silent = new EngineRandomService(MASTER_SEED);
    const traced = new EngineRandomService(MASTER_SEED, { traceSink: () => {} });

    // Identical outcomes with and without a sink: the counting wrapper
    // delegates to the same stream and must not change any drawn value.
    expect(silent.resolve(point, blowSample, () => 0)).toEqual(
      traced.resolve(point, blowSample, () => 0)
    );

    // setTraceSink(undefined) returns to silence.
    const records: IRandomTraceData[] = [];
    traced.setTraceSink((r) => records.push(r));
    traced.setTraceSink(undefined);
    traced.resolve(point, blowSample, () => 0);
    expect(records).toEqual([]);
  });
});

describe('GameEngine trace wiring (D16 — setRandomTraceEnabled)', () => {
  it('routes each firing onto the system-event channel as system.draw with the trace record as data', () => {
    const point = definePoint('test-forcing.engine-wiring', yesNo);
    const { engine } = setupTestEngine();
    const events: Array<{ type: string; data: unknown }> = [];
    engine.on('event', (e: { type: string; data: unknown }) => events.push(e));

    engine.setRandomTraceEnabled(true);
    const result = engine.getRandomService().chance(point, 0.5);

    const draws = events.filter((e) => e.type === 'system.draw');
    expect(draws).toHaveLength(1);
    expect(draws[0].data).toEqual({
      point: 'test-forcing.engine-wiring',
      occurrence: 1,
      cls: result ? 'yes' : 'no',
      value: result,
      provenance: 'drawn',
      drawsConsumed: 1
    });
  });

  it('setRandomTraceEnabled(false) stops emission; never enabling emits nothing (AC-14 groundwork)', () => {
    const point = definePoint('test-forcing.engine-wiring-off', yesNo);
    const { engine } = setupTestEngine();
    const events: Array<{ type: string }> = [];
    engine.on('event', (e: { type: string }) => events.push(e));

    // Default: never enabled — a draw emits no system.draw event.
    engine.getRandomService().chance(point, 0.5);
    expect(events.filter((e) => e.type === 'system.draw')).toHaveLength(0);

    // Enabled then disabled: emission stops again.
    engine.setRandomTraceEnabled(true);
    engine.getRandomService().chance(point, 0.5);
    engine.setRandomTraceEnabled(false);
    engine.getRandomService().chance(point, 0.5);
    expect(events.filter((e) => e.type === 'system.draw')).toHaveLength(1);
  });
});

describe('force session-state boundaries (D9)', () => {
  it('serializeStreamStates carries no force or occurrence state', () => {
    const name = 'test-forcing.no-force-in-save';
    const point = definePoint(name, yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: name, cls: 'yes', mode: 'sticky' }]);

    service.chance(point, 0.5); // forced — stream never touched

    // The forced-only point has no stream state to save.
    expect(service.serializeStreamStates()).toEqual({});
  });

  it('restore within a session keeps the force table', () => {
    const name = 'test-forcing.force-survives-restore';
    const point = definePoint(name, yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: name, cls: 'yes', mode: 'sticky' }]);

    service.restoreStreamStates({});

    expect(service.chance(point, 0)).toBe(true); // still forced
  });

  it('clearForces drops the table; subsequent firings draw naturally', () => {
    const name = 'test-forcing.clear';
    const point = definePoint(name, yesNo);
    const service = new EngineRandomService(MASTER_SEED);
    service.loadForces([{ point: name, cls: 'yes', mode: 'sticky' }]);
    service.clearForces();

    const reference = createSeededRandom(deriveStreamSeed(MASTER_SEED, name));
    expect(service.chance(point, 0.5)).toBe(reference.chance(0.5));
    expect(service.getForceReport()).toEqual([]);
  });
});
