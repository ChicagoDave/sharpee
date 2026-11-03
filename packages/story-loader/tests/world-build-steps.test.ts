/**
 * world-build-steps.test.ts — the world build's step modules and its order.
 *
 * Pins (ADR-389 D2a, D2b): every step's module exists under `src/build/`
 * and none imports the facade; the facade holds none of the moved bodies
 * and its `initializeWorld` is the loop over the list and nothing else;
 * `WORLD_BUILD_STEPS` has unique names in an order that satisfies every
 * `requires` (a reordered copy is reported by name); and a real load runs
 * every step exactly once, in list order, each leaving its fact on the
 * world.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Direction, LockableTrait, lookupLocationName, RoomBehavior, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordDetailTrait, createStory } from '../src';
import { WORLD_BUILD_STEPS, type WorldBuildStep } from '../src/build/steps';
import { counterKey } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

const SRC = join(__dirname, '..', 'src');
const BUILD_DIR = join(SRC, 'build');

/** The build's modules (ADR-389 D2a, D2b): the context, the list, the step and helper modules, the grammar. */
const MODULES = [
  'context', 'steps',
  'entity', 'adjectives', 'trait-routes', 'wiring', 'vehicles', 'admittance', 'snippets',
  'extensions', 'story-state', 'removal-observer', 'detail-channels', 'location-names', 'runtime-bind', 'cuttable', 'start', 'characters',
  'grammar',
];

/** The bodies that moved out of the facade. */
const MOVED = [
  'buildEntity', 'wireEntity', 'wireExit', 'applyTraitAdjectives', 'applyNpcAdjective', 'applyCombatAdjective', 'compileDescriptionSnippets', 'stampExitAdmits', 'stampPushingWays', 'wireVehicle',
  'finalizeRoleHolder', 'applyCharacterBlocks', 'storyOracle', 'registerRemovalObserver', 'compileDetailChannels', 'compileLocationNames', 'checkCuttableImplementations',
  'registerActionGrammar', 'registerPassageGrammar',
];

/** Order faults in a `requires` list: each entry's requirement must exist and come earlier. */
function orderViolations(steps: ReadonlyArray<Pick<WorldBuildStep, 'name' | 'requires'>>): Array<{ name: string; requires: string }> {
  const out: Array<{ name: string; requires: string }> = [];
  steps.forEach((step, index) => {
    for (const required of step.requires) {
      const at = steps.findIndex((s) => s.name === required);
      if (at === -1 || at >= index) out.push({ name: step.name, requires: required });
    }
  });
  return out;
}

describe('the entity family is a module family under src/build/', () => {
  it('every module exists', () => {
    for (const name of MODULES) {
      expect(existsSync(join(BUILD_DIR, `${name}.ts`)), `src/build/${name}.ts`).toBe(true);
    }
  });

  it('no build module imports the facade', () => {
    for (const name of MODULES) {
      const src = readFileSync(join(BUILD_DIR, `${name}.ts`), 'utf8');
      expect(src.includes("from '../loader.js'"), `${name}.ts imports the facade`).toBe(false);
    }
  });

  it('the facade holds none of the moved bodies', () => {
    const facade = readFileSync(join(SRC, 'loader.ts'), 'utf8');
    for (const name of MOVED) {
      expect(facade, `loader.ts still defines ${name}`).not.toMatch(new RegExp(`^  (?:private )?${name}\\(`, 'm'));
    }
  });

  it('the facade\'s initializeWorld is the loop over the list and nothing else', () => {
    const facade = readFileSync(join(SRC, 'loader.ts'), 'utf8');
    const start = facade.indexOf('  initializeWorld(world: WorldModel): void {\n');
    expect(start, 'loader.ts defines initializeWorld').toBeGreaterThan(-1);
    const end = facade.indexOf('\n  }\n', start);
    const body = facade.slice(start, end).split('\n').slice(1);
    expect(body).toEqual([
      '    this.world = world;',
      '    for (const step of WORLD_BUILD_STEPS) step.run(this.build, world);',
    ]);
  });
});

describe('WORLD_BUILD_STEPS — the build order as data', () => {
  it('has unique names', () => {
    const names = WORLD_BUILD_STEPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is ordered so every `requires` names an earlier step', () => {
    expect(orderViolations(WORLD_BUILD_STEPS)).toEqual([]);
  });

  it('reports a reordered copy by name', () => {
    const copy = WORLD_BUILD_STEPS.map((s) => ({ name: s.name, requires: [...s.requires] }));
    const entities = copy.findIndex((s) => s.name === 'entities');
    const wiring = copy.findIndex((s) => s.name === 'wiring');
    // Wire before anything exists: the wiring step's requirement is now behind it.
    [copy[entities], copy[wiring]] = [copy[wiring], copy[entities]];
    expect(orderViolations(copy)).toEqual([{ name: 'wiring', requires: 'entities' }]);
    // Put them back and the fault clears.
    [copy[entities], copy[wiring]] = [copy[wiring], copy[entities]];
    expect(orderViolations(copy)).toEqual([]);
    // Stamp the grants before the lines: the later stamp's requirement is behind it.
    const admits = copy.findIndex((s) => s.name === 'exit-admittance');
    const pushing = copy.findIndex((s) => s.name === 'pushing-ways');
    [copy[admits], copy[pushing]] = [copy[pushing], copy[admits]];
    expect(orderViolations(copy)).toEqual([{ name: 'pushing-ways', requires: 'exit-admittance' }]);
    [copy[admits], copy[pushing]] = [copy[pushing], copy[admits]];
    // Compose an extension's vocabulary before the extension registered.
    const extensions = copy.findIndex((s) => s.name === 'extensions');
    [copy[extensions], copy[entities]] = [copy[entities], copy[extensions]];
    expect(orderViolations(copy)).toEqual([{ name: 'entities', requires: 'extensions' }]);
    [copy[extensions], copy[entities]] = [copy[entities], copy[extensions]];
    // Run the start block through a runtime not yet bound.
    const bind = copy.findIndex((s) => s.name === 'runtime-bind');
    const start = copy.findIndex((s) => s.name === 'start-block');
    [copy[bind], copy[start]] = [copy[start], copy[bind]];
    expect(orderViolations(copy)).toEqual([{ name: 'start-block', requires: 'runtime-bind' }]);
  });

  it('a load runs every step exactly once, in list order, each leaving its fact', () => {
    const calls: string[] = [];
    const originals = WORLD_BUILD_STEPS.map((s) => s.run);
    const world = new WorldModel();
    try {
      for (const step of WORLD_BUILD_STEPS) {
        const run = step.run;
        (step as { run: WorldBuildStep['run'] }).run = (s, w) => {
          calls.push(step.name);
          run(s, w);
        };
      }
      const story = createStory(compileSource(SOURCE), { seed: 7 });
      story.initializeWorld(world);
    } finally {
      WORLD_BUILD_STEPS.forEach((s, i) => { (s as { run: WorldBuildStep['run'] }).run = originals[i]; });
    }
    expect(calls).toEqual(WORLD_BUILD_STEPS.map((s) => s.name));

    // entities: every entity exists under its IR id (ADR-389 D1).
    const lane = world.getEntity('lane')!;
    expect(lane).toBeDefined();
    expect(world.getEntity('crate')).toBeDefined();
    // wiring: the crate is placed and the lane's exits connect.
    expect(world.getLocation('crate')).toBe('lane');
    expect(RoomBehavior.getExit(lane, Direction.NORTH)?.destination).toBe('shed');
    expect(RoomBehavior.getExit(lane, Direction.EAST)?.destination).toBe('barn');
    // exit-admittance: the exit line's own `admits pushing` rides the way.
    expect(RoomBehavior.getExit(lane, Direction.NORTH)?.admits).toEqual({ vehicles: [], pushed: 'any' });
    // pushing-ways: the crate's grant lands on the way into the barn, which admits no pushable of its own.
    expect(RoomBehavior.getExit(lane, Direction.EAST)?.admits).toEqual({ pushed: ['crate'] });
    // story-state: the counter's starting value is world state.
    expect(world.getStateValue(counterKey('crates-moved'))).toBe(3);
    // detail-channels: a gated `detail` outside the two trait shapes marks its owner.
    expect(world.getEntity('crate')!.has(ChordDetailTrait.type)).toBe(true);
    // location-names: the lane's `room name` arm is registered under its id.
    expect(lookupLocationName('lane')?.map((arm) => arm.text)).toEqual(['The Old Lane']);
    // pending-refs: the strongbox's key is the brass key's world id, never its name.
    expect((world.getEntity('strongbox')!.get(TraitType.LOCKABLE) as LockableTrait).keyId).toBe('brass-key');
    // start-block: the block gave Alex the role.
    expect(world.playerCharacter.id).toBe('alex');
  });
});

const SOURCE = `story
  title: Steps
  authors:
    T
  id: steps
  story-version: 0.0.1

define counter crates-moved starts 3

create the Lane
  a room
  north to the Shed admits pushing
  east to the Barn
  room name:
    The Old Lane

  A lane.

create the Shed
  a room

  A shed.

create the Barn
  a room

  A barn.

create the crate
  a thing, pushable
  in the Lane

  A crate.

  phrase detail while the crate is here:
    It is scuffed.

  pushing
    from the Lane to the Barn
  end pushing

create the strongbox
  a container
  in the Shed
  openable, lockable with the brass key

  A strongbox.

create the brass key
  a thing
  in the Lane

  A small brass key.

create Alex
  a person
  playable
  starts in the Lane

  You.

before the game starts
  change the player to Alex
end before
`;
