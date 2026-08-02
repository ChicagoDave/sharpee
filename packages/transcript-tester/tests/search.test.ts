/**
 * search.test.ts — first-firing outcome search (ADR-293 D12): base-pass
 * natural hit, candidate-loop success with a reproducible point-seed,
 * budget exhaustion, never-fires, validation rejections, and force-prefix
 * composition (search the first DRAWN firing behind a forced prefix).
 *
 * Derived from the Behavior Statement. The random service and its
 * save/restore semantics are the REAL EngineRandomService (the part D12's
 * mechanics depend on — a forced prefix leaving the target stream
 * unmaterialized so the candidate override governs); only the story layer is
 * a stub. The full-bundle real-path proof is the dungeo search run (Phase 4
 * exit evidence).
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { definePoint, createSeededRandom, deriveStreamSeed, SeededRandom } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { parseTranscript } from '../src/parser.js';
import { searchOutcome } from '../src/search.js';

const MASTER = 424242;

// Classes: RARE at p = 1% (roll 1..10 of 1..1000), NEVER unreachable.
const TARGET = definePoint('tt-search.outcome', {
  classes: ['COMMON', 'RARE', 'NEVER'] as const
});
definePoint('tt-search.plain');

type Cls = 'COMMON' | 'RARE' | 'NEVER';
function sample(draw: SeededRandom): { cls: Cls; value: number } {
  const roll = draw.int(1, 1000);
  return { cls: roll <= 10 ? 'RARE' : 'COMMON', value: roll };
}

/** Reference: the class candidate seed `s` produces at the first firing. */
function classAtSeed(s: number): Cls {
  return sample(createSeededRandom(s)).cls;
}

/**
 * Stub story over a REAL EngineRandomService: 'trigger' resolves TARGET,
 * 'noop' draws nothing. save/restore round-trips the service's real stream
 * states plus the stub's own turn counter — the exact semantics the search's
 * fork-per-try depends on.
 */
function searchEngine(seed = MASTER) {
  const service = new EngineRandomService(seed);
  let turn = 0;
  const engine: {
    lastEvents: Array<{ type: string; data?: unknown }>;
    /** Every executed command with the turn it ran at — restore-reset evidence. */
    log: string[];
    executeCommand(cmd: string): string;
    engine: {
      registerSaveRestoreHooks(hooks: {
        onSaveRequested(data: unknown): Promise<void>;
        onRestoreRequested(): Promise<unknown | null>;
      }): void;
      save(): Promise<boolean>;
      restore(): Promise<boolean>;
      getMasterSeed(): number;
      getRandomService(): EngineRandomService;
      setRandomTraceEnabled(enabled: boolean): void;
    };
  } = {
    lastEvents: [],
    log: [],
    executeCommand(cmd: string) {
      engine.lastEvents = [];
      turn++;
      engine.log.push(`${cmd}@${turn}`);
      if (cmd === 'explode') {
        throw new Error('the story blew up');
      }
      if (cmd === 'trigger') {
        const outcome = service.resolve(TARGET, sample, (cls) => (cls === 'RARE' ? 5 : 500));
        return `Outcome: ${outcome.cls} (turn ${turn}).`;
      }
      return `Nothing happens (turn ${turn}).`;
    },
    engine: (() => {
      let hooks: {
        onSaveRequested(data: unknown): Promise<void>;
        onRestoreRequested(): Promise<unknown | null>;
      } | null = null;
      return {
        registerSaveRestoreHooks(h: typeof hooks) { hooks = h; },
        async save() {
          await hooks!.onSaveRequested({ version: '3.0.0', turn, streams: service.serializeStreamStates() });
          return true;
        },
        async restore() {
          const payload = (await hooks!.onRestoreRequested()) as
            | { turn: number; streams: Record<string, number> }
            | null;
          if (!payload) return false;
          turn = payload.turn;
          service.restoreStreamStates(payload.streams);
          return true;
        },
        getMasterSeed: () => seed,
        getRandomService: () => service,
        setRandomTraceEnabled(enabled: boolean) {
          service.setTraceSink(
            enabled
              ? (record) => engine.lastEvents.push({ type: 'system.draw', data: record })
              : undefined
          );
        }
      };
    })()
  };
  return engine;
}

function driver(source: string) {
  return parseTranscript(source, '/tmp/search-driver.transcript');
}

const TRIGGER_DRIVER = driver('title: D\n---\n> noop\n\n> trigger\n\n> noop\n');

describe('searchOutcome (D12)', () => {
  it('a natural base-pass hit is try 1 with no point-seed needed', async () => {
    const naturalClass = classAtSeed(deriveStreamSeed(MASTER, 'tt-search.outcome'));

    const result = await searchOutcome(TRIGGER_DRIVER, searchEngine() as never, {
      point: 'tt-search.outcome',
      cls: naturalClass
    });

    expect(result).toMatchObject({ found: true, tries: 1, firingCommandIndex: 1 });
    expect(result.pointSeed).toBeUndefined();
  });

  it('finds a rare class within budget and the point-seed is the reproducible artifact', async () => {
    // Reference-simulate the deterministic candidate sequence to know the
    // exact try where RARE first occurs — the search must agree.
    let expectedTry = -1;
    let expectedSeed = -1;
    for (let attempt = 2; attempt <= 2000; attempt++) {
      const candidate = deriveStreamSeed(MASTER, `tt-search.outcome#search:${attempt}`);
      if (classAtSeed(candidate) === 'RARE') {
        expectedTry = attempt;
        expectedSeed = candidate;
        break;
      }
    }
    expect(expectedTry).toBeGreaterThan(1); // the test setup found a reference hit

    const result = await searchOutcome(
      TRIGGER_DRIVER,
      searchEngine() as never,
      { point: 'tt-search.outcome', cls: 'RARE' },
      { budget: 2000 }
    );

    expect(result.found).toBe(true);
    expect(result.tries).toBe(expectedTry);
    expect(result.pointSeed).toBe(expectedSeed);

    // The reproduce instruction is real: a FRESH session at the same master
    // seed with the point-seed override draws RARE at the first drawn firing.
    const fresh = searchEngine();
    fresh.engine.getRandomService().setPointSeedOverrides({
      'tt-search.outcome': result.pointSeed!
    });
    expect(fresh.executeCommand('trigger')).toContain('Outcome: RARE');
  });

  it('reports budget-exhausted for an unreachable class, trying exactly the budget', async () => {
    const engine = searchEngine();
    const result = await searchOutcome(
      TRIGGER_DRIVER,
      engine as never,
      { point: 'tt-search.outcome', cls: 'NEVER' },
      { budget: 25 }
    );

    expect(result).toMatchObject({
      found: false,
      tries: 25,
      budget: 25,
      reason: 'budget-exhausted'
    });

    // The fork actually rewinds world state per try: the driver's firing
    // command is 'trigger' at turn 2 (after 'noop' at turn 1), and every
    // candidate re-execution must run at turn 2 again — a restore that
    // leaked the turn counter forward would show trigger@3, trigger@4, …
    const triggerRuns = engine.log.filter((entry) => entry.startsWith('trigger@'));
    expect(triggerRuns).toHaveLength(25); // base pass + 24 candidates
    expect(new Set(triggerRuns)).toEqual(new Set(['trigger@2']));
  });

  it('a restore failure mid-loop is a named failure, not a silent wrong-world search', async () => {
    const engine = searchEngine();
    const realRestore = engine.engine.restore.bind(engine.engine);
    let restores = 0;
    engine.engine.restore = async () => {
      restores++;
      return restores > 2 ? false : realRestore();
    };

    const result = await searchOutcome(
      TRIGGER_DRIVER,
      engine as never,
      { point: 'tt-search.outcome', cls: 'NEVER' },
      { budget: 25 }
    );

    expect(result.found).toBe(false);
    expect(result.reason).toMatch(/engine restore failed during the candidate loop/);
  });

  it('a save-capture failure in the base pass is a named failure', async () => {
    const engine = searchEngine();
    engine.engine.save = async () => false;

    const result = await searchOutcome(TRIGGER_DRIVER, engine as never, {
      point: 'tt-search.outcome',
      cls: 'NEVER'
    });

    expect(result.found).toBe(false);
    expect(result.reason).toMatch(/could not capture the pre-firing engine save/);
  });

  it('a throwing driver command is a named failure carrying the command and message', async () => {
    const result = await searchOutcome(
      driver('title: D\n---\n> explode\n\n> trigger\n'),
      searchEngine() as never,
      { point: 'tt-search.outcome', cls: 'RARE' }
    );

    expect(result.found).toBe(false);
    expect(result.reason).toMatch(/driver command "explode" threw: the story blew up/);
  });

  it('defaults the budget to 10 × declared class count (phase-start ruling)', async () => {
    const result = await searchOutcome(TRIGGER_DRIVER, searchEngine() as never, {
      point: 'tt-search.outcome',
      cls: 'NEVER'
    });

    expect(result.budget).toBe(30); // 3 classes × 10
  });

  it("reports never-fires when the driver's commands never reach the point", async () => {
    const result = await searchOutcome(
      driver('title: D\n---\n> noop\n\n> noop\n'),
      searchEngine() as never,
      { point: 'tt-search.outcome', cls: 'RARE' }
    );

    expect(result.found).toBe(false);
    expect(result.reason).toMatch(/never fires \(drawn\) under this command sequence/);
  });

  it('rejects unknown points, plain draws, and undeclared classes by name', async () => {
    const engine = searchEngine() as never;
    const unknown = await searchOutcome(TRIGGER_DRIVER, engine, { point: 'tt-search.nope', cls: 'x' });
    expect(unknown.reason).toMatch(/unknown point 'tt-search\.nope'/);

    const plain = await searchOutcome(TRIGGER_DRIVER, engine, { point: 'tt-search.plain', cls: 'x' });
    expect(plain.reason).toMatch(/plain draw/);

    const undeclared = await searchOutcome(TRIGGER_DRIVER, engine, {
      point: 'tt-search.outcome',
      cls: 'DISARM'
    });
    expect(undeclared.reason).toMatch(/does not declare class 'DISARM'/);
  });

  it('composes with a force prefix: searches the first DRAWN firing behind forced ones (D12)', async () => {
    // Firing #1 forced (zero draws — the target stream stays unmaterialized),
    // so the first DRAWN firing is occurrence #2 on the second trigger, and
    // the candidate override governs it.
    const composed = driver(
      'title: D\nforces: tt-search.outcome#1=COMMON\n---\n> trigger\n\n> trigger\n'
    );

    const result = await searchOutcome(
      composed,
      searchEngine() as never,
      { point: 'tt-search.outcome', cls: 'RARE' },
      { budget: 2000 }
    );

    expect(result.found).toBe(true);
    expect(result.firingCommandIndex).toBe(1); // the SECOND trigger

    // Same reference arithmetic as the unforced case: the drawn firing reads
    // the candidate stream from its start, because the forced prefix consumed
    // zero draws.
    expect(classAtSeed(result.pointSeed!)).toBe('RARE');
  });
});
