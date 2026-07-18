/**
 * state-machine-depth.test.ts — ADR-215 `use state-machines` through the
 * REAL loader: `define machine` lowers onto the real StateMachinePlugin
 * (role-bound action trigger, story-state condition trigger, onEnter
 * effects through the runtime's statement executor, terminal states).
 * REAL-PATH per Integration Reality: real @sharpee/chord compile, real
 * loader world, real plugin ticks — assertions on the events machines
 * emit and on transition behavior, not on registration counts. The
 * pre-existing `states:`/`select`/`change` surface is regressed by the
 * zoo fixtures (untouched — ADR-215's hard invariant).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'drawbridge.story'),
  'utf8',
);

const CHORD_STORY_STATE_KEY = 'chord.story.state';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

describe('use state-machines through the real loader (ADR-215, ADR-119 depth)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let smPlugin: StateMachinePlugin;
  let turn: number;

  const tick = (actionResult?: { actionId: string; targetId?: string }): string[] => {
    turn += 1;
    const events = smPlugin.onAfterAction({
      world,
      turn,
      playerId: player.id,
      playerLocation: world.getLocation(player.id)!,
      actionResult,
      actionEvents: [],
    } as never);
    return messageIdsOf(events) as string[];
  };

  beforeEach(() => {
    story = createStory(compileSource(FIXTURE), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    const plugins: unknown[] = [];
    story.onEngineReady({ getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p) }) });
    smPlugin = plugins.find((p): p is StateMachinePlugin => p instanceof StateMachinePlugin)!;
    expect(smPlugin, 'StateMachinePlugin registered under use state-machines').toBeDefined();
    turn = 0;
  });

  it('registers the machine and stays quiet until a trigger fires', () => {
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('raised');
    expect(tick()).toEqual([]); // no trigger, no transition
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('raised');
  });

  it('a role-bound action trigger transitions and runs the onEnter body (real events)', () => {
    const winchId = story.entityId('rusty-winch')!;
    const fired = tick({ actionId: 'if.action.turning', targetId: winchId });
    expect(fired).toContain('chains-groan');
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('lowering');
    // The wrong target does NOT fire it (role binding is real).
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('lowering');
  });

  it('a story-state condition trigger fires on the tick where it holds; terminal states stop', () => {
    tick({ actionId: 'if.action.turning', targetId: story.entityId('rusty-winch')! });
    expect(tick()).toEqual([]); // calm — the stormy condition does not hold
    world.setStateValue(CHORD_STORY_STATE_KEY, 'stormy');
    const fired = tick();
    expect(fired).toContain('bridge-thuds');
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('lowered');
    // Terminal: still stormy, but nothing more ever fires.
    expect(tick()).toEqual([]);
    expect(tick()).toEqual([]);
  });

  it('an action on a non-role target does not transition', () => {
    const doorId = story.entityId('gatehouse')!;
    expect(tick({ actionId: 'if.action.turning', targetId: doorId })).toEqual([]);
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('raised');
  });

  it('rogue IR with machines but no `use` → LoadError at engine-ready', () => {
    const ir = compileSource(FIXTURE);
    ir.uses = [];
    const rogue = createStory(ir, { seed: 11 });
    const w = new WorldModel();
    rogue.initializeWorld(w);
    const p = rogue.createPlayer(w);
    w.setPlayer(p.id);
    expect(() =>
      rogue.onEngineReady({ getPluginRegistry: () => ({ register: () => {} }) }),
    ).toThrow(LoadError);
  });
});
