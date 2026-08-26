/**
 * adr-327-actor-match.test.ts — ADR-327 D1 loader half (Phase 2), REAL-PATH
 * against a real WorldModel and the runtime's own binding: a clause head's
 * actor gates firing. `the player` is the ROLE, read at fire time; a named
 * actor is its world entity; a bare head is the owner's own action, reached
 * through the lifecycle engine's actor consultation (registered under
 * `actorConsultationId`). Assertions are on world state (occurrence keys,
 * entity state) and on the specific refusal, never on "did not throw".
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { actorConsultationId } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import type { IFEntity, InterceptorSharedData } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { CHORD_OCCURRENCE_PREFIX } from '../src/state-keys';

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
  id: (irId: string) => string;
  entity: (irId: string) => IFEntity;
}

/** Direct/test order: world first, then the player (bind runs before the player exists). */
function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.runtime.setTurnProvider(() => 3);
  const id = (irId: string) => story.entityId(irId)!;
  return { story, world, playerId: player.id, id, entity: (irId) => world.getEntity(id(irId))! };
}

const SOURCE = (sword: string, jack = '', gate = '', player = '') => `story
  title: Actors
  authors:
    N
  id: actors
  story-version: 0.0.1

define phrase not-yours
  Not yours.
end phrase

define phrase not-theirs
  Not theirs.
end phrase

define phrase jack-grabs
  Jack grabs.
end phrase

define phrase you-arrive
  You arrive.
end phrase

define phrase they-arrive
  They arrive.
end phrase

create the Yard
  a room

  A yard.

create the Gate
  a room
${gate}
  A gate.

create Jack
  a person
  in the Yard
  states, reversible: idle, busy
${jack}
  Jack.

create the guards
  a person, plural
  in the Yard

  Guards.

create the sword
  in the Yard
${sword}
  A sword.

create the player
  starts in the Yard
${player}
  You.
`;

/** Drive one consultation through the four hooks the way the lifecycle engine does. */
function consult(b: Booted, target: IFEntity, actionId: string, actorId: string) {
  const lookup = b.world.getInterceptorForAction(target, actionId);
  expect(lookup, `interceptor bound on ${target.name} under ${actionId}`).toBeDefined();
  const data: InterceptorSharedData = {};
  const veto = lookup!.interceptor.preValidate?.(target, b.world, actorId, data) ?? null;
  if (veto) return { veto, report: null };
  lookup!.interceptor.postValidate?.(target, b.world, actorId, data);
  lookup!.interceptor.postExecute?.(target, b.world, actorId, data);
  return { veto: null, report: lookup!.interceptor.postReport?.(target, b.world, actorId, data) ?? {} };
}

const occurrence = (b: Booted, ns: string) => b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}on.${ns}`);
const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const SWORD = `  on the player taking
    refuse not-yours
  end on

  on the guards taking
    refuse not-theirs
  end on
`;

describe('explicit heads on the interceptor path — the head names who acts', () => {
  it("the player's action fires `on the player taking` and not `on the guards taking`", () => {
    const b = boot(SOURCE(SWORD));
    expect(consult(b, b.entity('sword'), 'if.action.taking', b.playerId).veto).toMatchObject({ valid: false, error: 'not-yours' });
  });

  it("the guards' action fires `on the guards taking` and not `on the player taking`", () => {
    const b = boot(SOURCE(SWORD));
    expect(consult(b, b.entity('sword'), 'if.action.taking', b.id('guards')).veto).toMatchObject({ valid: false, error: 'not-theirs' });
  });

  it('only the matching clause counts a firing — the other keeps its occurrence unset (state, not return)', () => {
    const b = boot(SOURCE('  after the player taking\n    phrase you-arrive\n  end after\n\n  after the guards taking\n    phrase they-arrive\n  end after\n'));
    consult(b, b.entity('sword'), 'if.action.taking', b.playerId);
    expect(occurrence(b, 'sword.taking.after.0')).toBe(1);
    expect(occurrence(b, 'sword.taking.after.1')).toBeUndefined();
    consult(b, b.entity('sword'), 'if.action.taking', b.id('guards'));
    expect(occurrence(b, 'sword.taking.after.0')).toBe(1);
    expect(occurrence(b, 'sword.taking.after.1')).toBe(1);
  });

  it('a clause for another actor sits out its `after` phrases too', () => {
    const b = boot(SOURCE('  after the player taking\n    phrase you-arrive\n  end after\n\n  after the guards taking\n    phrase they-arrive\n  end after\n'));
    const report = consult(b, b.entity('sword'), 'if.action.taking', b.id('guards')).report!;
    const ids = (report.emit ?? []).map((e) => (e.payload as { messageId?: string }).messageId);
    expect(ids).toEqual(['they-arrive']);
  });

  it('an actor the engine never names (no actorId) fires no explicit head', () => {
    const b = boot(SOURCE(SWORD));
    const sword = b.entity('sword');
    const lookup = b.world.getInterceptorForAction(sword, 'if.action.taking')!;
    expect(lookup.interceptor.preValidate!(sword, b.world, undefined as unknown as string, {})).toBeNull();
  });
});

describe('`the player` is the role, read at fire time (D1 / ADR-132)', () => {
  it('after `setPlayer` the same clause fires for the new PC and not the old one', () => {
    const b = boot(SOURCE(SWORD));
    const jack = b.id('jack');
    b.world.setPlayer(jack);
    expect(consult(b, b.entity('sword'), 'if.action.taking', jack).veto).toMatchObject({ error: 'not-yours' });
    expect(consult(b, b.entity('sword'), 'if.action.taking', b.playerId).veto).toBeNull();
  });
});

describe('bare heads ride the actor consultation (D1 own-block exception, Q1 any gerund)', () => {
  const JACK = `  on taking
    refuse when Jack is busy: jack-grabs
    change Jack to busy
  end on
`;

  it("Jack's block registers on Jack under the actor key, not under the action's own id", () => {
    const b = boot(SOURCE('', JACK));
    const jack = b.entity('jack');
    expect(b.world.getInterceptorForAction(jack, actorConsultationId('if.action.taking'))).toBeDefined();
    expect(b.world.getInterceptorForAction(jack, 'if.action.taking')).toBeUndefined();
  });

  it('fires when Jack is the actor — whatever the target — and mutates Jack', () => {
    const b = boot(SOURCE('', JACK));
    const jack = b.entity('jack');
    expect(b.world.getStateValue('chord.state.jack')).toBe('idle');
    const first = consult(b, jack, actorConsultationId('if.action.taking'), jack.id);
    expect(first.veto).toBeNull();
    expect(b.world.getStateValue('chord.state.jack')).toBe('busy');
    // Second take: the refusal now holds (state carried over).
    expect(consult(b, jack, actorConsultationId('if.action.taking'), jack.id).veto).toMatchObject({ error: 'jack-grabs' });
  });

  it('does not fire when someone else acts', () => {
    const b = boot(SOURCE('', JACK));
    const jack = b.entity('jack');
    consult(b, jack, actorConsultationId('if.action.taking'), b.playerId);
    expect(b.world.getStateValue('chord.state.jack')).toBe('idle');
    expect(occurrence(b, 'jack.taking.on.0')).toBeUndefined();
  });

  it("the player's own bare head is marked at createPlayer (the player is created after bind in this order)", () => {
    const b = boot(SOURCE('', '', '', '  on taking\n    refuse not-yours\n  end on\n'));
    const player = b.world.getEntity(b.playerId)!;
    expect(consult(b, player, actorConsultationId('if.action.taking'), b.playerId).veto).toMatchObject({ error: 'not-yours' });
  });
});

describe('the event path — `after <actor> entering` filters on the mover', () => {
  const GATE = `  after the player entering
    phrase you-arrive
  end after

  after the guards entering
    phrase they-arrive
  end after
`;
  const arrival = (b: Booted, actorId: string): ISemanticEvent => ({
    id: 'm1',
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: actorId },
    data: { actorId, fromRoom: b.id('yard'), toRoom: b.id('gate') },
  });

  it('the player walking in fires the player clause only', () => {
    const b = boot(SOURCE('', '', GATE));
    const events = b.story.runtime.fireEventClauses(b.world, arrival(b, b.playerId));
    expect(messageIdsOf(events)).toEqual(['you-arrive']);
    expect(b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}chord.clause.gate.entering.1`)).toBeUndefined();
  });

  it('the guards arriving fires the guards clause only — live for any mover today (D5 stamps the actor)', () => {
    const b = boot(SOURCE('', '', GATE));
    const events = b.story.runtime.fireEventClauses(b.world, arrival(b, b.id('guards')));
    expect(messageIdsOf(events)).toEqual(['they-arrive']);
  });

  it('a `move` effect arriving fires the moved actor\'s clause through the loader\'s own D5 arrival', () => {
    // The guards' every-turn clause moves them to the Gate; the Gate's
    // `after the guards entering` fires from the move, not from any walk.
    const src = SOURCE('', '', GATE).replace('  Guards.\n', '  on every turn\n    move the guards to the Gate\n  end on\n\n  Guards.\n');
    const b = boot(src);
    const daemons = b.story.runtime.buildSchedulerDaemons();
    expect(daemons.length).toBeGreaterThan(0);
    // The player shares the guards' room (the Yard), so the presence-gated
    // daemon fires; the guards' arrival at the Gate is the loader's own D5.
    for (const d of daemons) {
      const ctx = { world: b.world, turn: 3 };
      if (d.condition && !d.condition(ctx)) continue;
      d.run(ctx);
    }
    expect(b.world.getLocation(b.id('guards'))).toBe(b.id('gate'));
    expect(b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}chord.clause.gate.entering.1`)).toBe(1); // after the guards entering
    expect(b.world.getStateValue(`${CHORD_OCCURRENCE_PREFIX}chord.clause.gate.entering.0`)).toBeUndefined(); // after the player entering
  });
});
