/**
 * counter-loader.test.ts — ADR-264 P1 loader lowering: `define counter` and
 * per-entity `counter` declarations seed their initial value into world state
 * (`chord.counter.*`), and each value survives save/restore independently.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { createStory, SchedulerDaemon } from '../src';
import { counterKey } from '../src/state-keys';

function load(text: string) {
  const result = compile(text);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  world.setPlayer(story.createPlayer(world).id);
  return { world };
}

const STORY = `story
  title: Survive
  authors:
    T
  id: survive
  story-version: 0.0.1

define counter madness starts 5 between 0 and 100

create the Camp
  a room

  A cold camp.

create the innkeeper
  a person
  in the Camp
  counter suspicion starts 3 between 0 and 100

  A wary innkeeper.

create the guard
  a person
  in the Camp
  counter suspicion starts 0 between 0 and 100

  A bored guard.

create the player
  starts in the Camp

  You.
`;

describe('counter loader lowering (ADR-264 P1)', () => {
  it('seeds a story-global counter into world state', () => {
    const { world } = load(STORY);
    expect(world.getStateValue(counterKey('madness'))).toBe(5);
  });

  it('seeds per-entity counters independently per instance', () => {
    const { world } = load(STORY);
    expect(world.getStateValue(counterKey('suspicion', 'innkeeper'))).toBe(3);
    expect(world.getStateValue(counterKey('suspicion', 'guard'))).toBe(0);
  });

  it('all counter values survive save/restore (ADR-264 D5)', () => {
    const { world } = load(STORY);
    // mutate directly (P2 adds the raise/lower statements) to prove persistence
    world.setStateValue(counterKey('madness'), 42);
    world.setStateValue(counterKey('suspicion', 'innkeeper'), 17);

    const saved = world.toJSON();
    const restored = new WorldModel();
    restored.loadJSON(saved);

    expect(restored.getStateValue(counterKey('madness'))).toBe(42);
    expect(restored.getStateValue(counterKey('suspicion', 'innkeeper'))).toBe(17);
    expect(restored.getStateValue(counterKey('suspicion', 'guard'))).toBe(0);
  });
});

const DAEMON_STORY = (clause: string, decl: string) => `story
  title: Tick
  authors:
    T
  id: tick
  story-version: 0.0.1
${clause}

${decl}

create the Camp
  a room

  A camp.

create the player
  starts in the Camp

  You.
`;

function loadDaemons(text: string) {
  const result = compile(text);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  world.setPlayer(story.createPlayer(world).id);
  const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
  return { world, daemons };
}

function tick(daemons: SchedulerDaemon[], world: WorldModel, turn: number): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  for (const d of daemons) {
    const ctx = { world, turn } as never;
    if (d.condition && !d.condition(ctx)) continue;
    events.push(...d.run(ctx));
  }
  return events;
}

describe('raise / lower runtime mutation (ADR-264 D2)', () => {
  it('raise accrues each turn and clamps silently at the ceiling', () => {
    const { world, daemons } = loadDaemons(
      DAEMON_STORY('  on every turn\n    raise madness by 30\n  end on', 'define counter madness between 0 and 100'),
    );
    tick(daemons, world, 1); expect(world.getStateValue(counterKey('madness'))).toBe(30);
    tick(daemons, world, 2); expect(world.getStateValue(counterKey('madness'))).toBe(60);
    tick(daemons, world, 3); expect(world.getStateValue(counterKey('madness'))).toBe(90);
    tick(daemons, world, 4); expect(world.getStateValue(counterKey('madness'))).toBe(100); // clamped, not 120
  });

  it('lower subtracts and clamps silently at the floor', () => {
    const { world, daemons } = loadDaemons(
      DAEMON_STORY('  on every turn\n    lower madness by 40\n  end on', 'define counter madness starts 100 between 0 and 100'),
    );
    tick(daemons, world, 1); expect(world.getStateValue(counterKey('madness'))).toBe(60);
    tick(daemons, world, 2); expect(world.getStateValue(counterKey('madness'))).toBe(20);
    tick(daemons, world, 3); expect(world.getStateValue(counterKey('madness'))).toBe(0); // clamped, not -20
  });
});

describe('counter comparison gates a runtime statement (ADR-264 D3)', () => {
  const died = (events: ISemanticEvent[]) => events.some((e) => e.type === 'if.event.player.died');

  const runGate = (cmp: string) => {
    const { world, daemons } = loadDaemons(
      DAEMON_STORY(
        `  on every turn\n    raise madness by 30\n    kill the player when madness ${cmp}\n  end on`,
        'define counter madness between 0 and 100',
      ),
    );
    const t1 = tick(daemons, world, 1); // madness 30 — gate false
    const t2 = tick(daemons, world, 2); // madness 60 — gate true
    return { t1, t2, world };
  };

  it('word form: `is at least` fires only once the counter reaches the threshold', () => {
    const { t1, t2, world } = runGate('is at least 60');
    expect(world.getStateValue(counterKey('madness'))).toBe(60);
    expect(died(t1)).toBe(false);
    expect(died(t2)).toBe(true);
  });

  it('symbolic form `>=` evaluates identically', () => {
    const { t1, t2 } = runGate('>= 60');
    expect(died(t1)).toBe(false);
    expect(died(t2)).toBe(true);
  });
});
