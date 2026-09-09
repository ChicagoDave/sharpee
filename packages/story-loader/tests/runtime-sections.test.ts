/**
 * runtime-sections.test.ts — the runtime's section modules and its bind order.
 *
 * Pins: the thirteen section modules exist under `src/runtime/`, each
 * importing only the core among its sibling modules and never the facade;
 * `RUNTIME_BIND_STEPS` has unique names in an order that satisfies every
 * `requires` (a reordered copy is reported by name); and a real load runs
 * every step exactly once, in list order.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { ChordBehaviorTrait, createStory } from '../src';
import { RUNTIME_BIND_STEPS, type RuntimeBindStep } from '../src/runtime';
import { compileSource } from './helpers/boot-engine';

const RUNTIME_DIR = join(__dirname, '..', 'src', 'runtime');

/** The thirteen sections ADR-335 D1 names, one module each. */
const SECTIONS = [
  'bind',
  'event-clauses',
  'move-clauses',
  'on-clauses',
  'topic-tables',
  'dialogue',
  'conversation-threads',
  'dispatch-verbs',
  'scheduler-constructs',
  'timers',
  'derived',
  'statements',
  'phrases',
];

/** Order faults in a `requires` list: each entry's requirement must exist and come earlier. */
function orderViolations(steps: ReadonlyArray<Pick<RuntimeBindStep, 'name' | 'requires'>>): Array<{ name: string; requires: string }> {
  const out: Array<{ name: string; requires: string }> = [];
  steps.forEach((step, index) => {
    for (const required of step.requires) {
      const at = steps.findIndex((s) => s.name === required);
      if (at === -1 || at >= index) out.push({ name: step.name, requires: required });
    }
  });
  return out;
}

describe('AC-1: the runtime is thirteen section modules over one core', () => {
  it('every section has its module', () => {
    for (const name of SECTIONS) {
      expect(existsSync(join(RUNTIME_DIR, `${name}.ts`)), `src/runtime/${name}.ts`).toBe(true);
    }
  });

  it('a section imports only the core among its siblings, and never the facade', () => {
    for (const name of SECTIONS) {
      const src = readFileSync(join(RUNTIME_DIR, `${name}.ts`), 'utf8');
      const siblings = [...src.matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1]);
      expect(siblings, `${name}.ts sibling imports`).toEqual(siblings.length ? ['core.js'] : []);
      expect(src.includes("from '../runtime.js'"), `${name}.ts imports the facade`).toBe(false);
    }
  });

  it('the facade holds the core and delegations only — no section body', () => {
    const facade = readFileSync(join(__dirname, '..', 'src', 'runtime.ts'), 'utf8');
    const methods = [...facade.matchAll(/^  (?:get )?(\w+)\(/gm)].map((m) => m[1]).filter((n) => n !== 'constructor');
    for (const name of methods) {
      if (name === 'bind') continue;
      expect(facade, `${name} delegates`).toMatch(new RegExp(`return this\\.\\w+\\.${name}\\b`));
    }
  });
});

describe('RUNTIME_BIND_STEPS — the bind order as data', () => {
  it('has unique names', () => {
    const names = RUNTIME_BIND_STEPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is ordered so every `requires` names an earlier step', () => {
    expect(orderViolations(RUNTIME_BIND_STEPS)).toEqual([]);
  });

  it('reports a reordered copy by name', () => {
    const copy = RUNTIME_BIND_STEPS.map((s) => ({ name: s.name, requires: [...s.requires] }));
    const derived = copy.find((s) => s.name === 'derived-evaluators')!;
    const overrides = copy.find((s) => s.name === 'message-override-evaluators')!;
    derived.requires.push('message-override-evaluators');
    expect(orderViolations(copy)).toEqual([{ name: 'derived-evaluators', requires: 'message-override-evaluators' }]);
    // Move the override step ahead of the derived step and the fault clears.
    const reordered = copy.filter((s) => s !== overrides);
    reordered.splice(reordered.indexOf(derived), 0, overrides);
    expect(orderViolations(reordered)).toEqual([]);
  });

  it('a load runs every step exactly once, in list order', () => {
    const calls: string[] = [];
    const originals = RUNTIME_BIND_STEPS.map((s) => s.run);
    try {
      for (const step of RUNTIME_BIND_STEPS) {
        const run = step.run;
        (step as { run: RuntimeBindStep['run'] }).run = (r, w) => {
          calls.push(step.name);
          run(r, w);
        };
      }
      const story = createStory(compileSource(SOURCE), { seed: 7 });
      const world = new WorldModel();
      story.initializeWorld(world);
      // The on-clauses step's registration landed on this world: the lamp,
      // owner of an `after the player taking` clause, carries the behavior
      // trait the step composes so its interceptor is consulted.
      const lamp = world.getEntity(story.entityId('lamp')!)!;
      expect(lamp.has(ChordBehaviorTrait.type)).toBe(true);
      expect(world.getEntity(story.entityId('hall')!)!.has(ChordBehaviorTrait.type)).toBe(false);
    } finally {
      RUNTIME_BIND_STEPS.forEach((s, i) => { (s as { run: RuntimeBindStep['run'] }).run = originals[i]; });
    }
    expect(calls).toEqual(RUNTIME_BIND_STEPS.map((s) => s.name));
  });
});

const SOURCE = `story
  title: Steps
  authors:
    T
  id: steps
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the lamp
  in the Hall

  A lamp.

  after the player taking
    emit lamp-taken with what "lamp"
  end after

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;
