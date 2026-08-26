/**
 * timers-runtime.test.ts — ADR-325 D3 (GH #307) loader half against a real
 * WorldModel and the real scheduler daemons, ticked turn by turn: verb
 * semantics (start/stop/restart/reset/interrupt), stepping through named
 * turns, `expires` firing exactly once (run-out, verb, chance), a turn's
 * prose speaking on its turn, `meanwhile` only while running and never on
 * the expiring turn, `has started`/`has expired`/`is <turn>` reads, the
 * daemon's place at the head of the roster, and persistence of a mid-run
 * timer through world state.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { timerKey } from '../src/state-keys';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Booted {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
  turn: number;
  /** Run the daemon roster for the next turn; returns message ids narrated. */
  tick(): string[];
  /** Fire the Yard's `after the player entering` clause (the verbs live there). */
  enterYard(): string[];
  record(): { phase: string; index: number } | undefined;
  read(stateKey: string): unknown;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((m): m is string => !!m);

function boot(source: string, seed = 5): Booted {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const daemons = story.runtime.buildSchedulerDaemons();
  // The engine wires its live turn counter at engine-ready; the harness
  // plays that role so a `start` in turn T's action stamps T.
  story.runtime.setTurnProvider(() => booted.turn);
  const booted: Booted = {
    story,
    world,
    playerId: player.id,
    turn: 1,
    tick() {
      const ctx = { world, turn: this.turn };
      const events = daemons.flatMap((d) => (d.condition && !d.condition(ctx) ? [] : d.run(ctx)));
      this.turn++;
      return messageIdsOf(events);
    },
    enterYard() {
      const roomId = story.entityId('yard')!;
      world.moveEntity(player.id, roomId);
      return messageIdsOf(
        story.runtime.fireEventClauses(world, {
          id: 'm1',
          type: 'if.event.actor_moved',
          timestamp: 0,
          entities: { actor: player.id },
          data: { toRoom: roomId },
        }),
      );
    },
    record() {
      return world.getStateValue(timerKey('guards.search')) as { phase: string; index: number } | undefined;
    },
    read(key) {
      return world.getStateValue(key);
    },
  };
  return booted;
}

/** `verbs` run in the Yard's after-entering clause; `extra` lands in the guards' block. */
const SOURCE = (verbs: string, extra = '', timer = TIMER) => `story
  title: Timers
  authors:
    N
  id: timers
  story-version: 0.0.1

${timer}

create the Yard
  a room

  A yard.

  after the player entering
${verbs.split('\n').map((l) => `    ${l}`).join('\n')}
  end after

create the guards
  a person, plural
  in the Yard
  states, reversible: calm, alert

  Guards.

  phrase expired-line:
    The guards pounce.

  phrase idle:
    They mutter.

  when search expires
    change the guards to alert
    phrase expired-line
  end when
${extra}
create the player
  starts in the Yard

  You.
`;

const TIMER = `define timer search for the guards
  arriving
  lingering
    The guards are getting close.
end timer`;

describe('stepping (D3f)', () => {
  it('a timer started on turn T reaches its first named turn on T+1 and expires after the last, firing `expires` once', () => {
    const b = boot(SOURCE('start the guards\' search'));
    expect(b.record()).toBeUndefined();
    b.enterYard(); // turn 1: start
    expect(b.record()).toMatchObject({ phase: 'running', index: 0 });
    expect(b.tick()).toEqual([]); // tick of turn 1: started this turn — no step
    expect(b.record()).toMatchObject({ phase: 'running', index: 0 });
    expect(b.tick()).toEqual([]); // turn 2: arriving (no prose)
    expect(b.record()).toMatchObject({ phase: 'running', index: 1 });
    expect(b.tick()).toEqual(['guards.search.lingering']); // turn 3: lingering speaks
    expect(b.tick()).toEqual(['guards.expired-line']); // turn 4: expired — clause fires, it = guards
    expect(b.record()).toMatchObject({ phase: 'expired' });
    expect(b.world.getStateValue('chord.state.guards')).toBe('alert');
    expect(b.tick()).toEqual([]); // never again
    expect(b.tick()).toEqual([]);
  });

  it('a timer with no named turns expires on T+1', () => {
    const b = boot(SOURCE('start the guards\' search', '', 'define timer search for the guards\nend timer'));
    b.enterYard();
    expect(b.tick()).toEqual([]);
    expect(b.tick()).toEqual(['guards.expired-line']);
  });

  it("a turn's prose is not spoken when the owner is off-stage", () => {
    const b = boot(SOURCE('start the guards\' search'));
    b.enterYard();
    b.tick();
    b.tick();
    b.world.moveEntity(b.story.entityId('guards')!, null);
    expect(b.tick()).toEqual([]); // lingering reached, nobody to hear it
    expect(b.record()).toMatchObject({ index: 2 });
  });

  it('the timer daemon is first in the roster', () => {
    const b = boot(SOURCE('start the guards\' search'));
    const daemons = b.story.runtime.buildSchedulerDaemons();
    expect(daemons[0].id).toBe('chord.timers');
  });
});

describe('verbs (D3c)', () => {
  it('`stop` holds, and a stopped timer never expires on its own', () => {
    const b = boot(SOURCE('start the guards\' search when the guards is calm\nstop the guards\' search when the guards is alert'));
    b.enterYard();
    b.tick();
    b.tick(); // arriving
    b.world.setStateValue('chord.state.guards', 'alert');
    b.enterYard(); // stop
    expect(b.record()).toMatchObject({ phase: 'stopped', index: 1 });
    for (let i = 0; i < 5; i++) expect(b.tick()).toEqual([]);
    expect(b.record()).toMatchObject({ phase: 'stopped', index: 1 });
  });

  it('`start` on a started timer is a no-op; `restart` goes back to the top', () => {
    const b = boot(SOURCE('start the guards\' search'));
    b.enterYard();
    b.tick();
    b.tick(); // arriving
    b.enterYard(); // start again — no-op
    expect(b.record()).toMatchObject({ phase: 'running', index: 1 });
    const r = boot(SOURCE('restart the guards\' search'));
    r.enterYard();
    r.tick();
    r.tick(); // arriving
    r.enterYard(); // restart
    expect(r.record()).toMatchObject({ phase: 'running', index: 0 });
    expect(r.tick()).toEqual([]); // restarted this turn
    expect(r.tick()).toEqual([]); // arriving again
    expect(r.tick()).toEqual(['guards.search.lingering']);
  });

  it('`reset` returns to not-started, and `has started` answers no again', () => {
    const b = boot(SOURCE('start the guards\' search when the guards is calm\nreset the guards\' search when the guards is alert'));
    b.enterYard();
    b.tick();
    b.tick();
    b.world.setStateValue('chord.state.guards', 'alert');
    b.enterYard();
    expect(b.record()).toMatchObject({ phase: 'idle', index: 0 });
    expect(b.tick()).toEqual([]);
  });

  it('`interrupt` expires now and fires the clause in place; on a stopped timer too; on an idle one nothing', () => {
    const b = boot(SOURCE('start the guards\' search when the guards is calm\ninterrupt the guards\' search when the guards is alert'));
    b.enterYard();
    b.tick();
    b.world.setStateValue('chord.state.guards', 'alert');
    expect(b.enterYard()).toEqual(['guards.expired-line']);
    expect(b.record()).toMatchObject({ phase: 'expired' });
    expect(b.tick()).toEqual([]); // not a second time

    const s = boot(SOURCE('start the guards\' search when the guards is calm\nstop the guards\' search when the guards is alert\ninterrupt the guards\' search when the guards is alert'));
    s.enterYard();
    s.tick();
    s.world.setStateValue('chord.state.guards', 'alert');
    expect(s.enterYard()).toEqual(['guards.expired-line']);

    const i = boot(SOURCE('interrupt the guards\' search'));
    expect(i.enterYard()).toEqual([]);
    expect(i.record()).toBeUndefined();
  });

  it('an interrupt on the turn it would have expired anyway is just expiry — once', () => {
    const b = boot(SOURCE('start the guards\' search when the guards is calm\ninterrupt the guards\' search when the guards is alert', '', 'define timer search for the guards\n  arriving\nend timer'));
    b.enterYard();
    b.tick();
    b.tick(); // arriving
    b.world.setStateValue('chord.state.guards', 'alert');
    expect(b.enterYard()).toEqual(['guards.expired-line']);
    expect(b.tick()).toEqual([]);
  });
});

describe('meanwhile and interrupted (D3a)', () => {
  const TEXTURED = `define timer search for the guards
  arriving
  lingering
  meanwhile
    phrase idle
end timer`;

  it('`meanwhile` runs each running turn, never on the expiring turn, never before the first step', () => {
    const b = boot(SOURCE('start the guards\' search', '', TEXTURED));
    b.enterYard();
    expect(b.tick()).toEqual([]); // started this turn
    expect(b.tick()).toEqual(['guards.idle']); // arriving + meanwhile
    expect(b.tick()).toEqual(['guards.idle']); // lingering + meanwhile
    expect(b.tick()).toEqual(['guards.expired-line']); // expiry — no meanwhile
  });

  it('`interrupted one chance in n` expires early at the pinned seed, still firing `expires` once', () => {
    const CHANCY = `define timer search for the guards
  a
  b
  c
  d
  e
  f
  interrupted one chance in 2
end timer`;
    const b = boot(SOURCE('start the guards\' search', '', CHANCY), 11);
    b.enterYard();
    const narrated: string[][] = [];
    for (let i = 0; i < 9; i++) narrated.push(b.tick());
    const expiries = narrated.flat().filter((m) => m === 'guards.expired-line');
    expect(expiries).toHaveLength(1);
    const expiredAt = narrated.findIndex((m) => m.includes('guards.expired-line'));
    // Pinned at seed 11: earlier than the seventh tick the run-out would take.
    expect(expiredAt).toBeLessThan(7);
    expect(expiredAt).toBe(2);
  });
});

describe('reads (D3d)', () => {
  const READS = (cond: string) => SOURCE('start the guards\' search', `  on every turn while ${cond}\n    phrase idle\n  end on\n`);

  it('`is <turn>` holds only on that turn', () => {
    const b = boot(READS('search is lingering'));
    b.enterYard();
    expect(b.tick()).toEqual([]);
    expect(b.tick()).toEqual([]);
    expect(b.tick()).toEqual(['guards.search.lingering', 'guards.idle']);
    expect(b.tick()).toEqual(['guards.expired-line']);
  });

  it('`has started` holds from start through expiry; `has expired` only after', () => {
    const started = boot(READS('search has started'));
    expect(started.tick()).toEqual([]);
    started.enterYard();
    expect(started.tick()).toEqual(['guards.idle']);
    started.tick();
    started.tick();
    started.tick(); // expired
    expect(started.tick()).toEqual(['guards.idle']);

    const expired = boot(READS('search has expired'));
    expired.enterYard();
    expect(expired.tick()).toEqual([]);
    expect(expired.tick()).toEqual([]);
    expect(expired.tick()).toEqual(['guards.search.lingering']);
    expect(expired.tick()).toEqual(['guards.expired-line', 'guards.idle']);
  });
});

describe('persistence (D3g)', () => {
  it('a mid-run timer is plain world state and resumes from it', () => {
    const b = boot(SOURCE('start the guards\' search'));
    b.enterYard();
    b.tick();
    b.tick();
    const snapshot = b.world.getState();
    const c = boot(SOURCE('start the guards\' search'));
    c.world.setState(snapshot);
    c.turn = 3;
    expect(c.tick()).toEqual(['guards.search.lingering']);
    expect(c.tick()).toEqual(['guards.expired-line']);
  });
});
