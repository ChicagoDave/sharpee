/**
 * movement-clauses-runtime.test.ts — ADR-325 D3h–D3i (GH #308) loader half
 * against a real WorldModel and the runtime's own binding: the player's
 * bare `on going` / `after going` reached through the going action's
 * source-room interceptor slot (room trait binding, any room target, `it`
 * = the player), `when <entity> moves` riding the actor-moved event and
 * filtering on the mover, and an inline `kill the player` body reaching the
 * player-died sink. The engine-turn half (the real `going` action) is the
 * CLI-bundle `--exec` check recorded in the session summary.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { actorConsultationId } from '@sharpee/stdlib';
import { HealthBehavior, TraitType, WorldModel } from '@sharpee/world-model';
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
}

function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 5 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.runtime.setTurnProvider(() => 3);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

const SOURCE = (guards: string, player: string) => `story
  title: Movement
  authors:
    N
  id: movement
  story-version: 0.0.1

define phrase merc-held
  The guards hold you fast.
end phrase

define timer waiting for the player
  pausing
end timer

create the Yard
  a room

  A yard.

create the Gate
  a room

  A gate.

create the guards
  a person, plural
  in the Gate
  states, reversible: calm, alert
${guards}
  Guards.

create the player
  starts in the Yard
${player}
  You.
`;

/** Drive the going action's source-room slot through the registered interceptor. */
/**
 * Drive a `go` from a room the way the lifecycle engine consults it: the
 * source-room slot first (the room's own clauses), then the actor slot
 * (the player's bare `on going`, under the actor-consultation key —
 * ADR-327 D1). First veto wins; the post hooks run for both.
 */
function goFrom(b: Booted, roomIrId: string) {
  const room = b.world.getEntity(b.story.entityId(roomIrId)!)!;
  const player = b.world.getEntity(b.playerId)!;
  const consultations = [
    { target: room, lookup: b.world.getInterceptorForAction(room, 'if.action.going') },
    { target: player, lookup: b.world.getInterceptorForAction(player, actorConsultationId('if.action.going')) },
  ].filter((c) => c.lookup !== undefined).map((c) => ({ ...c, data: {} }));
  expect(consultations.length, 'a going interceptor bound on the room or the player').toBeGreaterThan(0);
  for (const c of consultations) {
    const veto = c.lookup!.interceptor.preValidate?.(c.target, b.world, b.playerId, c.data) ?? null;
    if (veto) return { veto, report: null };
  }
  for (const c of consultations) c.lookup!.interceptor.postValidate?.(c.target, b.world, b.playerId, c.data);
  for (const c of consultations) c.lookup!.interceptor.postExecute?.(c.target, b.world, b.playerId, c.data);
  const reports = consultations.map((c) => c.lookup!.interceptor.postReport?.(c.target, b.world, b.playerId, c.data) ?? {});
  return { veto: null, report: reports.find((r) => r.override || r.emit) ?? reports[0] };
}

describe("the player's own going (D3h)", () => {
  const PLAYER = `  on going while the guards is alert
    refuse merc-held
  end on

  after going
    restart waiting
  end after
`;

  it('binds on the player under the actor-consultation key — an unmarked room carries no going interceptor (ADR-327 D1)', () => {
    const b = boot(SOURCE('', PLAYER));
    const yard = b.world.getEntity(b.story.entityId('yard')!)!;
    expect(yard.has(TraitType.ROOM)).toBe(true);
    expect(b.world.getInterceptorForAction(yard, 'if.action.going')).toBeUndefined();
    const player = b.world.getEntity(b.playerId)!;
    expect(b.world.getInterceptorForAction(player, actorConsultationId('if.action.going'))).toBeDefined();
    expect(b.world.getInterceptorForAction(player, 'if.action.going')).toBeUndefined();
  });

  it('`on going while …` refuses the move when the gate holds, from any room', () => {
    const b = boot(SOURCE('', PLAYER));
    b.world.setStateValue('chord.state.guards', 'alert');
    expect(goFrom(b, 'yard').veto).toMatchObject({ valid: false, error: 'merc-held' });
    expect(goFrom(b, 'gate').veto).toMatchObject({ valid: false, error: 'merc-held' });
    // The timer was not touched — a refused go runs no `after going`.
    expect(b.world.getStateValue(timerKey('player.waiting'))).toBeUndefined();
  });

  it('`after going` runs its mutations once the move completes', () => {
    const b = boot(SOURCE('', PLAYER));
    expect(b.world.getStateValue(timerKey('player.waiting'))).toBeUndefined();
    const { veto } = goFrom(b, 'yard');
    expect(veto).toBeNull();
    expect(b.world.getStateValue(timerKey('player.waiting'))).toMatchObject({ phase: 'running', index: 0, startedTurn: 3 });
  });

  it("`it` inside the clause is the player, not the room", () => {
    const b = boot(SOURCE('', '  after going\n    move the player to the Gate\n  end after\n'));
    goFrom(b, 'yard');
    expect(b.world.getLocation(b.playerId)).toBe(b.story.entityId('gate'));
  });

  it("a room's own `on the player going` still fires only for that room", () => {
    const src = `story
  title: Movement
  authors:
    N
  id: movement
  story-version: 0.0.1

define phrase merc-held
  Held.
end phrase

create the Yard
  a room
  on the player going
    refuse merc-held
  end on

  A yard.

create the Gate
  a room

  A gate.

create the player
  starts in the Yard

  You.
`;
    const b = boot(src);
    expect(goFrom(b, 'yard').veto).toMatchObject({ error: 'merc-held' });
    const gate = b.world.getEntity(b.story.entityId('gate')!)!;
    expect(b.world.getInterceptorForAction(gate, 'if.action.going')).toBeUndefined();
  });
});

describe('when <entity> moves (D3h)', () => {
  const GUARDS = `  when the player moves, while the guards is calm
    change the guards to alert
    phrase merc-held
  end when
`;

  const moved = (b: Booted, actorId: string) =>
    b.story.runtime.fireMoveClauses(b.world, {
      id: 'm1',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: actorId },
      data: { fromRoom: b.story.entityId('yard'), toRoom: b.story.entityId('gate') },
    });

  it('fires on the completed move by the named mover, with `it` as the owner', () => {
    const b = boot(SOURCE(GUARDS, ''));
    expect(b.world.getStateValue('chord.state.guards')).toBe('calm');
    const events = moved(b, b.playerId);
    expect(b.world.getStateValue('chord.state.guards')).toBe('alert');
    expect(messageIdsOf(events)).toContain('merc-held');
  });

  it('ignores moves by anyone else', () => {
    const b = boot(SOURCE(GUARDS, ''));
    moved(b, b.story.entityId('guards')!);
    expect(b.world.getStateValue('chord.state.guards')).toBe('calm');
  });

  it('sits out while the `while` fails', () => {
    const b = boot(SOURCE(GUARDS, ''));
    b.world.setStateValue('chord.state.guards', 'alert');
    expect(moved(b, b.playerId)).toEqual([]);
  });

  it('an entity mover matches that entity, read off the event envelope', () => {
    const b = boot(SOURCE('', '  when the guards moves\n    restart waiting\n  end when\n'));
    moved(b, b.playerId);
    expect(b.world.getStateValue(timerKey('player.waiting'))).toBeUndefined();
    moved(b, b.story.entityId('guards')!);
    expect(b.world.getStateValue(timerKey('player.waiting'))).toMatchObject({ phase: 'running' });
  });

  it('ignores other event types', () => {
    const b = boot(SOURCE(GUARDS, ''));
    const out = b.story.runtime.fireMoveClauses(b.world, {
      id: 'x',
      type: 'if.event.taken',
      timestamp: 0,
      entities: { actor: b.playerId },
      data: {},
    });
    expect(out).toEqual([]);
    expect(b.world.getStateValue('chord.state.guards')).toBe('calm');
  });
});

describe('kill the player with an inline body (D3i)', () => {
  it('speaks the body and reaches the player-died sink', () => {
    const b = boot(SOURCE('  when the player moves\n    kill the player\n      The guards close in. That is the end of you.\n  end when\n', ''));
    const events = b.story.runtime.fireMoveClauses(b.world, {
      id: 'm1',
      type: 'if.event.actor_moved',
      timestamp: 0,
      entities: { actor: b.playerId },
      data: {},
    });
    const ids = messageIdsOf(events);
    expect(ids.some((id) => /^death-at-\d+-\d+$/.test(String(id)))).toBe(true);
    expect(events.some((e) => e.type === 'if.event.player.died')).toBe(true);
    // The state change behind the event: the player's health flipped.
    const health = b.world.getEntity(b.playerId)!.get(TraitType.HEALTH);
    expect(health).toBeDefined();
    expect(HealthBehavior.isAlive(health as never)).toBe(false);
  });
});
