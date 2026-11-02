/**
 * engine-ready-steps.test.ts — the engine-ready wiring's step modules and its order.
 *
 * Pins (ADR-389 D2c): every engine-ready step's module exists under
 * `src/build/engine-ready/` and none imports the facade; the restore
 * reconciler lives in `src/restore.ts`; the facade holds none of the moved
 * bodies and its `onEngineReady` is the precondition plus the loop and
 * nothing else; `ENGINE_READY_STEPS` has unique names in an order that
 * satisfies every `requires` (a reordered copy is reported by name); and a
 * real boot runs every step exactly once, in list order, each leaving its
 * registration on the engine.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENGINE_READY_STEPS, type EngineReadyStep } from '../src/build/engine-ready/steps';
import { bootEngine } from './helpers/boot-engine';

const SRC = join(__dirname, '..', 'src');
const READY_DIR = join(SRC, 'build', 'engine-ready');

/** The engine-ready family's modules (ADR-389 D2c): the list, the steps, the shared install context. */
const MODULES = ['steps', 'engine-seams', 'npc-behaviors', 'character-phase', 'install-context', 'machines', 'extension-plugins', 'scheduler', 'deadly-exits', 'present-entries'];

/** The bodies that moved out of the facade. */
const MOVED = ['buildNpcBehavior', 'buildDeadlyExitTransformer', 'registerPresentEntries', 'reconcileRestoredWorld'];

/** Order faults in a `requires` list: each entry's requirement must exist and come earlier. */
function orderViolations(steps: ReadonlyArray<Pick<EngineReadyStep, 'name' | 'requires'>>): Array<{ name: string; requires: string }> {
  const out: Array<{ name: string; requires: string }> = [];
  steps.forEach((step, index) => {
    for (const required of step.requires) {
      const at = steps.findIndex((s) => s.name === required);
      if (at === -1 || at >= index) out.push({ name: step.name, requires: required });
    }
  });
  return out;
}

describe('the engine-ready family is a module family under src/build/engine-ready/', () => {
  it('every module exists, and the restore reconciler is beside reconcile.ts', () => {
    for (const name of MODULES) {
      expect(existsSync(join(READY_DIR, `${name}.ts`)), `src/build/engine-ready/${name}.ts`).toBe(true);
    }
    expect(existsSync(join(SRC, 'restore.ts'))).toBe(true);
    expect(existsSync(join(SRC, 'reconcile.ts'))).toBe(true);
  });

  it('no engine-ready module imports the facade', () => {
    for (const name of MODULES) {
      const src = readFileSync(join(READY_DIR, `${name}.ts`), 'utf8');
      expect(src.includes("/loader.js'"), `${name}.ts imports the facade`).toBe(false);
    }
    expect(readFileSync(join(SRC, 'restore.ts'), 'utf8').includes("/loader.js'")).toBe(false);
  });

  it('the facade holds none of the moved bodies', () => {
    const facade = readFileSync(join(SRC, 'loader.ts'), 'utf8');
    for (const name of MOVED) {
      expect(facade, `loader.ts still defines ${name}`).not.toMatch(new RegExp(`^  (?:private )?${name}\\(`, 'm'));
    }
  });

  it('the facade\'s onEngineReady is the precondition and the loop and nothing else', () => {
    const facade = readFileSync(join(SRC, 'loader.ts'), 'utf8');
    const start = facade.indexOf('  onEngineReady(engine: StoryEngine): void {\n');
    expect(start, 'loader.ts defines onEngineReady').toBeGreaterThan(-1);
    const end = facade.indexOf('\n  }\n', start);
    const body = facade.slice(start, end).split('\n').slice(1);
    expect(body).toEqual([
      '    if (!this.world) {',
      "      throw new LoadError('The story has no world yet: initializeWorld runs before onEngineReady.');",
      '    }',
      '    for (const step of ENGINE_READY_STEPS) step.run(this.build, this.world, engine);',
    ]);
  });
});

describe('ENGINE_READY_STEPS — the engine-ready order as data', () => {
  it('has unique names', () => {
    const names = ENGINE_READY_STEPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is ordered so every `requires` names an earlier step', () => {
    expect(orderViolations(ENGINE_READY_STEPS)).toEqual([]);
  });

  it('reports a reordered copy by name', () => {
    const copy = ENGINE_READY_STEPS.map((s) => ({ name: s.name, requires: [...s.requires] }));
    // Register the extensions' plugins before the state-machine plugin: the
    // equal-priority tie-break is now the header's, not the platform's.
    const machines = copy.findIndex((s) => s.name === 'state-machines');
    const extensions = copy.findIndex((s) => s.name === 'extensions');
    [copy[machines], copy[extensions]] = [copy[extensions], copy[machines]];
    expect(orderViolations(copy)).toEqual([{ name: 'extensions', requires: 'state-machines' }]);
    // Put them back and the fault clears.
    [copy[machines], copy[extensions]] = [copy[extensions], copy[machines]];
    expect(orderViolations(copy)).toEqual([]);
    // Wire the seams after the plugins that register behind the flush.
    const seams = copy.findIndex((s) => s.name === 'engine-seams');
    [copy[seams], copy[machines]] = [copy[machines], copy[seams]];
    expect(orderViolations(copy)).toEqual([{ name: 'state-machines', requires: 'engine-seams' }]);
  });

  it('a boot runs every step exactly once, in list order, each leaving its registration', () => {
    const calls: string[] = [];
    const originals = ENGINE_READY_STEPS.map((s) => s.run);
    let booted: ReturnType<typeof bootEngine>;
    try {
      for (const step of ENGINE_READY_STEPS) {
        const run = step.run;
        (step as { run: EngineReadyStep['run'] }).run = (s, w, e) => {
          calls.push(step.name);
          run(s, w, e);
        };
      }
      booted = bootEngine(SOURCE, 7);
    } finally {
      ENGINE_READY_STEPS.forEach((s, i) => { (s as { run: EngineReadyStep['run'] }).run = originals[i]; });
    }
    expect(calls).toEqual(ENGINE_READY_STEPS.map((s) => s.name));

    const { engine } = booted;
    // npc-behaviors: the moth's wanderer behavior is on the engine's service under its per-entity id.
    expect(engine.getNpcService().getBehavior('chord.npc.moth')).toBeDefined();
    // state-machines: every story carries the one state-machine plugin.
    expect(engine.getPluginRegistry().getById('sharpee.plugin.state-machine')).toBeDefined();
    // extensions: `use scoring` registered its rank watcher.
    expect(engine.getPluginRegistry().getById('sharpee.ext.scoring.rank-watcher')).toBeDefined();
  });
});

const SOURCE = `story
  title: Ready
  authors:
    T
  id: ready
  story-version: 0.0.1
  use scoring

create the Yard
  a room

  A yard.

create the moth
  a person, wanderer with move-chance 100
  in the Yard

  A giant moth, never still.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;
