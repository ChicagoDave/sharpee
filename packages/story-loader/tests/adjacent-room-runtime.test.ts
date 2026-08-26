/**
 * adjacent-room-runtime.test.ts — ADR-326 (GH #311) loader half, against a
 * real WorldModel and the runtime's own clause path: `move … to a random
 * adjacent room` lands the mover one traversable exit away (asserted on
 * world location), honours composed blocked arms (GH #315), locked doors,
 * and computed directions (ADR-326 D6 — resolver active/inactive/blocked,
 * narration dropped), draws on a per-mover persisted seed, refuses loudly
 * on an empty set (D3), and — ADR-327 D5's slice — a `move` arrival fires
 * the destination's entering clause so the blocked-stall bounce composes,
 * bounded by the re-entry cap.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { Direction, LockableBehavior, WorldModel, type ExitResolver, type ITrait } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { CHORD_STORY_STATE_KEY, adjacentKey } from '../src/state-keys';

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

function boot(source: string, seed = 5): Booted {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

/** Put the player in `roomIr` and fire that room's `after the player entering` clause. */
function enter(b: Booted, roomIr: string): ISemanticEvent[] {
  const roomId = b.story.entityId(roomIr)!;
  b.world.moveEntity(b.playerId, roomId);
  return b.story.runtime.fireEventClauses(b.world, {
    id: 'm1',
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: b.playerId },
    data: { toRoom: roomId },
  });
}

const room = (b: Booted, ir: string) => b.story.entityId(ir)!;
const roomOf = (b: Booted, entityId: string) => b.world.getContainingRoom(entityId)?.id;

/** Draw `n` times from the Hub; returns the sequence of landing room ids. */
function drawsFromHub(b: Booted, n: number, clauseRoom = 'hub'): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    enter(b, clauseRoom);
    out.push(roomOf(b, b.playerId)!);
  }
  return out;
}

/**
 * The Hub has four static exits: north, east (through a locked door),
 * south (blocked while hunted), west. Entering the Hub ejects the player
 * while the story is calm.
 */
const HUB = (hubClause: string, extra = '') => `story
  title: Adjacency
  authors:
    T
  id: adjacency
  story-version: 0.0.1
  states: calm, hunted

create the Hub
  a room
  north to the North Room
  east to the East Room through the east door
  south to the South Room
  west to the West Room
  south is blocked while hunted: south-shut

  The hub.

  after the player entering while calm
    ${hubClause}
  end after

create the east door
  a door, lockable, starts locked

  A door.

create the North Room
  a room
  south to the Hub

  North.

create the East Room
  a room
  west to the Hub through the east door

  East.

create the South Room
  a room
  north to the Hub

  South.

create the West Room
  a room
  east to the Hub

  West.

create the monkey
  in the Hub

  A monkey.
${extra}
create the player
  starts in the Hub

  You.

define phrase south-shut
  The south way is shut.
end phrase
`;

describe('`move … to a random adjacent room` lands one traversable exit away (D1/D2)', () => {
  it('moves the player to a neighbour of the room the statement runs in', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    enter(b, 'hub');
    const landed = roomOf(b, b.playerId);
    expect([room(b, 'north-room'), room(b, 'south-room'), room(b, 'west-room')]).toContain(landed);
  });

  it('is pinned by the seed: two boots at the same seed draw the same sequence', () => {
    const a = drawsFromHub(boot(HUB('move the player to a random adjacent room'), 5), 8);
    const c = drawsFromHub(boot(HUB('move the player to a random adjacent room'), 5), 8);
    expect(a).toEqual(c);
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('persists only the mover\'s stream seed, and advances it per draw', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    const key = adjacentKey(b.story.irIdOf(b.playerId)!);
    expect(b.world.getStateValue(key)).toBeUndefined();
    enter(b, 'hub');
    const first = b.world.getStateValue(key) as { seed: number };
    expect(Object.keys(first)).toEqual(['seed']);
    enter(b, 'hub');
    const second = b.world.getStateValue(key) as { seed: number };
    expect(second.seed).not.toBe(first.seed);
  });

  it('any entity can be the mover', () => {
    const b = boot(HUB('move the monkey to a random adjacent room'));
    const monkey = b.story.entityId('monkey')!;
    enter(b, 'hub');
    expect(roomOf(b, b.playerId)).toBe(room(b, 'hub'));
    expect([room(b, 'north-room'), room(b, 'south-room'), room(b, 'west-room')]).toContain(roomOf(b, monkey));
  });
});

describe('traversability is what going means (D1)', () => {
  it('a composed blocked arm (GH #315) excludes its direction while it holds', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    // Calm: the south arm does not hold, so the south room is reachable.
    expect(drawsFromHub(b, 12)).toContain(room(b, 'south-room'));
    // Hunted: the arm holds — the south room is never drawn. The Hub's own
    // eject clause is `while calm`, so fire the draw from a plain clause
    // instead: move the player back and eject through the ever-calm Annex.
    b.world.setStateValue(CHORD_STORY_STATE_KEY, 'hunted');
    const hub = room(b, 'hub');
    const draws: string[] = [];
    for (let i = 0; i < 12; i++) {
      b.world.moveEntity(b.playerId, hub);
      draws.push(b.story.evaluator.drawAdjacentRoom(b.playerId, b.world)!);
    }
    expect(draws).not.toContain(room(b, 'south-room'));
    expect(draws).toContain(room(b, 'north-room'));
  });

  it('a locked door excludes its direction; unlocking admits it', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    const door = b.world.getEntity(b.story.entityId('east-door')!)!;
    expect(drawsFromHub(b, 12)).not.toContain(room(b, 'east-room'));
    LockableBehavior.unlock(door);
    expect(drawsFromHub(b, 24)).toContain(room(b, 'east-room'));
  });
});

/** A computed `north` on the Hub: the resolver decides where north goes right now. */
class TestComputedTrait implements ITrait {
  static readonly type = 'test.computed-north';
  readonly type = TestComputedTrait.type;
  constructor(readonly computedExits: Record<string, { candidates: string[] }>) {}
}

function withComputedNorth(b: Booted, resolver: ExitResolver): void {
  const hub = b.world.getEntity(room(b, 'hub'))!;
  hub.add(new TestComputedTrait({ [Direction.NORTH]: { candidates: [room(b, 'north-room'), room(b, 'south-room')] } }));
  b.world.registerExitResolver(TestComputedTrait.type, resolver);
}

describe('computed directions answer "where would going take the mover right now" (D6)', () => {
  it('needs the engine random service — headless, a computed direction is a named error, never a silent skip', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    withComputedNorth(b, () => undefined);
    expect(() => enter(b, 'hub')).toThrow(/computed and no random service/);
    expect(roomOf(b, b.playerId)).toBe(room(b, 'hub'));
  });

  it('an inactive resolver (undefined) leaves the static destination in the set', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    withComputedNorth(b, () => undefined);
    b.story.evaluator.setRandomService(new EngineRandomService(7));
    expect(drawsFromHub(b, 12)).toContain(room(b, 'north-room'));
  });

  it('an active resolver contributes exactly its resolved room, and its narration is dropped', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    const target = room(b, 'south-room');
    withComputedNorth(b, () => ({
      kind: 'exit',
      destination: target,
      events: [{ id: 'n', type: 'game.message', timestamp: 0, data: { messageId: 'resolver.spin' } }],
    }));
    b.story.evaluator.setRandomService(new EngineRandomService(7));
    const events: ISemanticEvent[] = [];
    const draws: string[] = [];
    for (let i = 0; i < 12; i++) {
      events.push(...enter(b, 'hub'));
      draws.push(roomOf(b, b.playerId)!);
    }
    expect(draws).not.toContain(room(b, 'north-room'));
    expect(draws).toContain(target);
    expect(messageIdsOf(events)).not.toContain('resolver.spin');
  });

  it('a resolver answering `blocked` contributes nothing', () => {
    const b = boot(HUB('move the player to a random adjacent room'));
    withComputedNorth(b, () => ({ kind: 'blocked', messageId: 'nope' } as never));
    b.story.evaluator.setRandomService(new EngineRandomService(7));
    expect(drawsFromHub(b, 12)).not.toContain(room(b, 'north-room'));
  });
});

const CELL = `story
  title: Cell
  authors:
    T
  id: cell
  story-version: 0.0.1

create the Cell
  a room
  north to the Yard
  north is blocked: cell-shut

  The cell.

  after the player entering
    move the player to a random adjacent room
  end after

create the Yard
  a room
  south to the Cell

  The yard.

create the player
  starts in the Cell

  You.

define phrase cell-shut
  The cell is shut.
end phrase
`;

describe('an empty candidate set refuses loudly (D3)', () => {
  it('performs no move and names the mover and the room', () => {
    const b = boot(CELL);
    expect(() => enter(b, 'cell')).toThrow(/Cannot move .* to a random adjacent room — no exit from .*Cell/);
    expect(roomOf(b, b.playerId)).toBe(room(b, 'cell'));
  });
});

/**
 * The bounce (ADR-326 D4 composed with ADR-327 D5): the Hub ejects into its
 * only neighbour, the Stall; the Stall is blocked, yells, flips the story to
 * hunted (so the Hub will not re-eject), and darts the arriver back out.
 */
const BOUNCE = `story
  title: Bounce
  authors:
    T
  id: bounce
  story-version: 0.0.1
  states: calm, hunted

create the Hub
  a room
  north to the Stall

  The hub.

  after the player entering while calm
    move the player to a random adjacent room
  end after

create the Stall
  a room
  south to the Hub
  east to the Far Room
  states: blocked, open

  The stall.

  after the player entering while the Stall is blocked
    change the story to hunted
    phrase keeper-yells
    move the player to a random adjacent room
  end after

create the Far Room
  a room
  west to the Stall

  Far.

create the player
  starts in the Hub

  You.

define phrase keeper-yells
  The keeper yells and you dart away.
end phrase
`;

describe('a `move` arrival fires the destination\'s entering clause (ADR-327 D5)', () => {
  it('the blocked-stall bounce composes: eject → arrive → yell → eject again', () => {
    const b = boot(BOUNCE);
    const events = enter(b, 'hub');
    expect(messageIdsOf(events).filter((m) => m === 'keeper-yells')).toHaveLength(1);
    expect(roomOf(b, b.playerId)).not.toBe(room(b, 'stall'));
    expect([room(b, 'hub'), room(b, 'far-room')]).toContain(roomOf(b, b.playerId));
  });

  it('`when <entity> moves` clauses fire on a moved arrival too', () => {
    const b = boot(HUB('move the monkey to a random adjacent room', `
create the watcher
  in the Hub

  A watcher.

  when the monkey moves
    phrase monkey-moved
  end when

define phrase monkey-moved
  The monkey scampers off.
end phrase
`));
    const events = enter(b, 'hub');
    expect(messageIdsOf(events)).toContain('monkey-moved');
  });
});

const PING_PONG = `story
  title: Ping
  authors:
    T
  id: ping
  story-version: 0.0.1

create the Ping
  a room
  east to the Pong

  Ping.

  after the player entering
    move the player to a random adjacent room
  end after

create the Pong
  a room
  west to the Ping

  Pong.

  after the player entering
    move the player to a random adjacent room
  end after

create the player
  starts in the Ping

  You.
`;

describe('re-entrant arrivals are bounded (ADR-327 D5)', () => {
  it('two rooms ejecting into each other stop at the cap with the named diagnostic', () => {
    const b = boot(PING_PONG);
    expect(() => enter(b, 'ping')).toThrow(/runtime\.move-arrival-reentry/);
  });
});
