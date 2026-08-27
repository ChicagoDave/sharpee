/**
 * hunger-loader.test.ts — ADR-263 loader lowering: `ir.hunger` installs the
 * decay/death daemon (`grows`/`fatal`), the ADR-262 crossing watcher (rungs),
 * and the narrator (author phrase or the overridable fallback), under
 * `use hunger, announce <mode>`.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
import { createSeededRandom } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { getHungerSeverity, setHungerSeverity } from '@sharpee/ext-hunger';
import { createStory } from '../src';

const source = (headerBody: string, phrases = '') => `story
  title: Survive
  authors:
    T
  id: survive
  story-version: 0.0.1
${headerBody}
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

${phrases}`;

function load(text: string) {
  const result = compile(text);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  world.setPlayer(story.createPlayer(world).id);
  const plugins: TurnPlugin[] = [];
  story.onEngineReady({ getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p as TurnPlugin) }) });
  return { world, plugins };
}

const context = (world: WorldModel, turn = 1): TurnPluginContext => ({
  world,
  turn,
  playerId: world.getPlayer()!.id,
  playerLocation: 'camp',
  random: createSeededRandom(1),
});

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const PHRASES = '\ndefine phrases en-US\n  feeling-peckish:\n    You could eat.\n';
const HUNGER = (announce = '') =>
  `  use hunger${announce}\n` +
  '    grows 5 each turn\n' +
  '    peckish at 30 says feeling-peckish\n' +
  '    hungry at 60\n' +
  '    starving at 90\n' +
  '    fatal at 100\n';

const daemonOf = (p: TurnPlugin[]) => p.find((x) => x.id === 'chord.story.hunger-daemon')!;
const watcherOf = (p: TurnPlugin[]) => p.find((x) => x.id === 'sharpee.ext.hunger.crossing-watcher')!;
const narratorOf = (p: TurnPlugin[]) => p.find((x) => x.id === 'chord.story.hunger-narrator')!;

describe('use hunger loader lowering (ADR-263)', () => {
  it('registers the daemon, crossing watcher, and narrator', () => {
    const ids = load(source(HUNGER(), PHRASES)).plugins.map((p) => p.id);
    expect(ids).toContain('chord.story.hunger-daemon');
    expect(ids).toContain('sharpee.ext.hunger.crossing-watcher');
    expect(ids).toContain('chord.story.hunger-narrator');
  });

  it('the daemon raises severity by `grows` each turn', () => {
    const { world, plugins } = load(source(HUNGER(), PHRASES));
    const daemon = daemonOf(plugins);
    daemon.onAfterAction(context(world));
    expect(getHungerSeverity(world)).toBe(5);
    daemon.onAfterAction(context(world, 2));
    expect(getHungerSeverity(world)).toBe(10);
  });

  it('the watcher emits band_crossed over severity', () => {
    const { world, plugins } = load(source(HUNGER(), PHRASES));
    setHungerSeverity(world, 65); // -> hungry, from the bottom
    const events = watcherOf(plugins).onAfterAction(context(world));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('if.event.band_crossed');
    expect(events[0].data).toMatchObject({ concept: 'hunger', to: 'hungry', bandsCrossed: ['peckish', 'hungry'] });
  });

  it('the narrator speaks the author phrase, then the fallback for a phraseless band', () => {
    const { world, plugins } = load(source(HUNGER(), PHRASES));
    setHungerSeverity(world, 65); // crosses peckish (says) then hungry (no says)
    expect(messageIdsOf(narratorOf(plugins).onAfterAction(context(world))))
      .toEqual(['feeling-peckish', 'if.action.hunger.crossed']);
  });

  it('announce silent suppresses narration but the watcher still fires', () => {
    const { world, plugins } = load(source(HUNGER(', announce silent'), PHRASES));
    setHungerSeverity(world, 65);
    expect(narratorOf(plugins).onAfterAction(context(world))).toEqual([]);
    expect(watcherOf(plugins).onAfterAction(context(world))).toHaveLength(1);
  });

  it('`fatal` kills the player once severity reaches it', () => {
    const { world, plugins } = load(source(HUNGER(), PHRASES));
    setHungerSeverity(world, 100);
    const events = daemonOf(plugins).onAfterAction(context(world));
    expect(events.length).toBeGreaterThan(0); // a death event was emitted
  });

  it('severity survives save/restore (ADR-263 #4a)', () => {
    const { world } = load(source(HUNGER(), PHRASES));
    setHungerSeverity(world, 47);

    const saved = world.toJSON();
    const restored = new WorldModel();
    restored.loadJSON(saved);

    expect(getHungerSeverity(restored)).toBe(47);
  });
});
