/**
 * extension-install.test.ts — the registry owns IR-shaped extension construction.
 *
 * Pins: the loader imports none of the extension packages (the registry is
 * the whole boundary); every `use` name's entry lives in its own module
 * under `src/extensions/`; rogue IR carrying a gated construct without its
 * `use` is refused at engine-ready with the named message; and the install
 * loop runs in the registry's order, not the header's — the equal-priority
 * pair (scoring's narrator, hunger's narrator) keeps the same tie-break when
 * an author writes `use hunger` first.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { createNpcService } from '@sharpee/stdlib';
import { createStory, LoadError } from '../src';
import { EXTENSION_REGISTRY } from '../src/extension-registry';
import { compileSource } from './helpers/boot-engine';

const SRC = join(__dirname, '..', 'src');

describe('AC-3: the loader imports no extension package', () => {
  it('loader.ts has no import from @sharpee/ext-* or @sharpee/plugin-state-machine', () => {
    const loader = readFileSync(join(SRC, 'loader.ts'), 'utf8');
    const offending = [...loader.matchAll(/from '(@sharpee\/(?:ext-[a-z-]+|plugin-state-machine))'/g)].map((m) => m[1]);
    expect(offending).toEqual([]);
  });

  it('every registry entry is defined in its own module under src/extensions/', () => {
    for (const name of EXTENSION_REGISTRY.keys()) {
      expect(existsSync(join(SRC, 'extensions', `${name}.ts`)), `src/extensions/${name}.ts`).toBe(true);
    }
  });
});

const MACHINE_STORY = `story
  title: Gate
  authors:
    T
  id: gate
  story-version: 0.0.1
  states: calm, chase
  use state-machines

define machine the watch
  starts waiting
  state waiting
    when chase: done
  state done, terminal
end machine

create the Camp
  a room

  A cold camp.

create Alex
  a person
  playable
  starts in the Camp

  You.

before the game starts
  change the player to Alex
end before
`;

function bootHeadless(source: string, uses?: string[]) {
  const ir = compileSource(source);
  if (uses) ir.uses = uses;
  const story = createStory(ir, { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const plugins: Array<{ id: string; priority: number }> = [];
  const engine = {
    getNpcService: () => createNpcService(),
    getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p as { id: string; priority: number }) }),
  } as unknown as Parameters<typeof story.onEngineReady>[0];
  return { story, engine, plugins };
}

describe('gatedConstruct — the rogue-IR backstop at engine-ready', () => {
  it('`define machine` without `use state-machines` throws the named LoadError', () => {
    const { story, engine } = bootHeadless(MACHINE_STORY, []);
    expect(() => story.onEngineReady(engine)).toThrow(LoadError);
    expect(() => story.onEngineReady(engine)).toThrow('`define machine` needs `use state-machines` in the story header.');
  });

  it('with the `use`, the machine is lowered into a registered state-machine plugin', () => {
    const { story, engine, plugins } = bootHeadless(MACHINE_STORY);
    story.onEngineReady(engine);
    const sm = plugins.find((p) => p.id === 'sharpee.plugin.state-machine') as
      | { getRegistry(): { getMachineState(id: string): string | undefined } }
      | undefined;
    expect(sm).toBeDefined();
    expect(sm!.getRegistry().getMachineState('chord.machine.the-watch')).toBe('waiting');
  });
});

const HUNGER_FIRST = `story
  title: Order
  authors:
    T
  id: order
  story-version: 0.0.1
  use hunger
    grows 5 each turn
    peckish at 30
    fatal at 100
  use scoring
    rank "Nobody" at 0
    rank "Somebody" at 10

create the Camp
  a room

  A cold camp.

create Alex
  a person
  playable
  starts in the Camp

  You.

before the game starts
  change the player to Alex
end before
`;

describe('install order — the registry\'s order, not the header\'s', () => {
  it('`use hunger` before `use scoring` still registers scoring\'s plugins first', () => {
    const { story, engine, plugins } = bootHeadless(HUNGER_FIRST);
    story.onEngineReady(engine);
    const ids = plugins.map((p) => p.id);
    const order = (a: string, b: string) => {
      expect(ids, `${a} and ${b} both registered`).toContain(a);
      expect(ids).toContain(b);
      expect(ids.indexOf(a), `${a} before ${b}`).toBeLessThan(ids.indexOf(b));
    };
    order('sharpee.ext.scoring.rank-watcher', 'sharpee.ext.hunger.crossing-watcher');
    order('chord.story.promotion-narrator', 'chord.story.hunger-narrator');
    // The registry pairs share a priority, so registration order is their run order.
    const at = (id: string) => plugins.find((p) => p.id === id)!.priority;
    expect(at('chord.story.promotion-narrator')).toBe(at('chord.story.hunger-narrator'));
    expect(at('sharpee.ext.scoring.rank-watcher')).toBe(at('sharpee.ext.hunger.crossing-watcher'));
  });
});
