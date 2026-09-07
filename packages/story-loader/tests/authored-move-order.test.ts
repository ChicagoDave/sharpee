/**
 * authored-move-order.test.ts — the authored-move narration and event order
 * (`docs/architecture/authored-move-narration-and-event-order.md`) on the
 * REAL path: a real `GameEngine` over compiled Chord, one command a turn.
 *
 * GH #367 — an authored `move the player` narrates the room before the
 *   destination's `after the player entering` text, from an `after` mover,
 *   from an `on the player entering` mover (the drain-hole shape), and at
 *   every level of a re-entry chain (the walked bounce's shape).
 * GH #368 — `begins when the player visits <room> for the first time` fires
 *   when the room's own entering clause moves the player on the same turn,
 *   walked or moved.
 * GH #373 — `move <entity> offstage` and `remove <entity>` raise the mover's
 *   `when <entity> moves` clause.
 *
 * Owner context: story-loader tests (secret-letter-port-platform-defects
 * plan Phase 2, P-6 cases a–c).
 */
import { CHAPTER_BEGAN_EVENT } from '@sharpee/ext-chapters';
import { describe, expect, it } from 'vitest';
import { CHORD_VISITED_PREFIX } from '../src/state-keys';
import { bootTurns, eventsOfType } from './helpers/boot-turns';

const HEADER = (id: string, extra = '') => `story
  title: Order
  authors:
    T
  id: ${id}
  story-version: 0.0.1
${extra}
`;

const PLAYER = (room: string) => `
create Jack
  a person
  playable
  starts in ${room}

  You.

before the game starts
  change the player to Jack
end before
`;

/** Index of the first event carrying this phrase key (message ids are owner-prefixed, `owner.key`), or -1. */
const at = (events: { data?: unknown }[], phraseKey: string): number =>
  events.findIndex((e) => {
    const id = (e.data as { messageId?: string } | undefined)?.messageId;
    return id === phraseKey || (typeof id === 'string' && id.endsWith(`.${phraseKey}`));
  });

/** Index of the first room description for this room, or -1. */
const roomAt = (events: { type: string; data?: unknown }[], roomId: string): number =>
  events.findIndex((e) => e.type === 'if.event.room.description' && (e.data as { roomId?: string }).roomId === roomId);

describe('GH #367: an authored move narrates the room before the arrival clauses', () => {
  const SEWER = HEADER('sewer') + `
create the Cell
  a room

  A cell.

create the hole
  scenery, enterable
  in the Cell

  A hole in the floor.

  on the player entering
    phrase hole-drop
      You drop into the dark.
    move the player to the Sewer
  end on

create the rope
  in the Cell

  A rope.

  after the player taking
    phrase rope-slip
      The rope slips and you fall.
    move the player to the Sewer
  end after

create the Sewer
  a room

  Brick tunnels, slimy with filth.

  after the player entering
    phrase olmer-drops
      Olmer drops down into the muck next to you.
  end after
` + PLAYER('the Cell');

  it('from an `on the player entering` mover (`enter hole`): the clause’s own text, the room, then the arrival text', async () => {
    const b = await bootTurns(SEWER);
    const { events, text } = await b.turnText('enter hole');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('sewer'));
    const drop = at(events, 'hole-drop');
    const room = roomAt(events, b.id('sewer'));
    const olmer = at(events, 'olmer-drops');
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(room).toBeGreaterThan(drop);
    expect(olmer).toBeGreaterThan(room);
    // The rendered order is the event order.
    expect(text.indexOf('Brick tunnels')).toBeLessThan(text.indexOf('Olmer drops'));
  });

  it('from an `after` mover (`take rope`): the clause’s own text, the room, then the arrival text', async () => {
    const b = await bootTurns(SEWER);
    const { events } = await b.turnText('take rope');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('sewer'));
    const slip = at(events, 'rope-slip');
    const room = roomAt(events, b.id('sewer'));
    const olmer = at(events, 'olmer-drops');
    expect(slip).toBeGreaterThanOrEqual(0);
    expect(room).toBeGreaterThan(slip);
    expect(olmer).toBeGreaterThan(room);
  });

  it('a re-entry chain describes every room in order, each before its own clause — the walked bounce’s shape', async () => {
    const BOUNCE = HEADER('bounce') + `
create the Start
  a room

  The start.

create the token
  in the Start

  A token.

  after the player taking
    move the player to the Stall
  end after

create the Stall
  a room

  The stall.

  after the player entering
    phrase keeper-yells
      The keeper yells and you dart away.
    move the player to the Far Room
  end after

create the Far Room
  a room

  Far.
` + PLAYER('the Start');
    const b = await bootTurns(BOUNCE);
    const { events } = await b.turnText('take token');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('far-room'));
    const descriptions = eventsOfType(events, 'if.event.room.description').map((e) => (e.data as { roomId: string }).roomId);
    expect(descriptions).toEqual([b.id('stall'), b.id('far-room')]);
    const yell = at(events, 'keeper-yells');
    expect(yell).toBeGreaterThan(roomAt(events, b.id('stall')));
    expect(yell).toBeLessThan(roomAt(events, b.id('far-room')));
  });
});

describe('GH #368: `visits <room> for the first time` rides the arrival, not the end-of-turn location', () => {
  const ALLEY = HEADER('alley', '  use chapters') + `
define chapters
  jail - Chapter V: The Jail
    begins when the game starts
  alley - Chapter VI: The Alley
    begins when the player visits the Alley for the first time
end chapters

create the Yard
  a room
  north to the Alley

  A yard.

create the coin
  in the Yard

  A coin.

  after the player taking
    move the player to the Alley
  end after

create the Alley
  a room
  south to the Yard

  An empty alleyway.

  after the player entering
    phrase alley-hurry
      You hurry on through to the street.
    move the player to the Street
  end after

create the Street
  a room

  Commerce Street.
` + PLAYER('the Yard');

  const began = (events: { type: string; data?: unknown }[]) =>
    events.filter((e) => e.type === CHAPTER_BEGAN_EVENT).map((e) => (e.data as { name: string }).name);

  it('a walked arrival whose entering clause moves the player on still begins the chapter, that turn', async () => {
    const b = await bootTurns(ALLEY);
    await b.turn('look');
    const north = await b.turn('north');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('street'));
    expect(b.world.getStateValue(CHORD_VISITED_PREFIX + b.id('alley'))).toBe(true);
    expect(began(north)).toEqual(['alley']);
  });

  it('an authored arrival whose entering clause moves the player on begins it too', async () => {
    const b = await bootTurns(ALLEY);
    await b.turn('look');
    const take = await b.turn('take coin');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('street'));
    expect(began(take)).toEqual(['alley']);
    // Once: standing in the street, or walking back and forth, begins nothing more.
    expect(began(await b.turn('look'))).toEqual([]);
  });

  it('the start room is not an arrival: the player stands there without it being visited', async () => {
    const b = await bootTurns(ALLEY);
    await b.turn('look');
    expect(b.world.getStateValue(CHORD_VISITED_PREFIX + b.id('yard'))).toBeUndefined();
  });
});

describe('GH #373: a move offstage raises `when <entity> moves`', () => {
  const GALLOWS = HEADER('gallows') + `
create the Hall
  a room

  A hall.

create the butler
  a person
  in the Hall
  states: waiting, gone

  The butler.

create the gallows
  scenery

  A gallows.

  when the butler moves, while the butler is gone
    phrase gallows-rise
      Somewhere, carpenters begin to hammer.
    move the gallows to the Hall
  end when

define action releasing
  grammar
    release butler
  change the butler to gone
  move the butler offstage

define action dismissing
  grammar
    dismiss butler
  change the butler to gone
  remove the butler
` + PLAYER('the Hall');

  it('`move <entity> offstage` fires the watcher: its statements run and its phrase renders', async () => {
    const b = await bootTurns(GALLOWS);
    expect(b.world.getLocation(b.id('gallows'))).toBeUndefined();

    const { events, text } = await b.turnText('release butler');

    expect(b.world.getLocation(b.id('butler'))).toBeUndefined();
    expect(b.world.getLocation(b.id('gallows'))).toBe(b.id('hall'));
    expect(at(events, 'gallows-rise')).toBeGreaterThanOrEqual(0);
    expect(text).toContain('carpenters begin to hammer');
  });

  it('`remove <entity>` is the same completed move: the watcher fires', async () => {
    const b = await bootTurns(GALLOWS);

    await b.turnText('dismiss butler');

    expect(b.world.getLocation(b.id('butler'))).toBeUndefined();
    expect(b.world.getLocation(b.id('gallows'))).toBe(b.id('hall'));
  });

  it('an entity already offstage moved offstage again is not a move: nothing fires', async () => {
    const b = await bootTurns(GALLOWS);
    await b.turnText('release butler');
    b.world.moveEntity(b.id('gallows'), null);

    const { events } = await b.turnText('release butler');

    expect(at(events, 'gallows-rise')).toBe(-1);
    expect(b.world.getLocation(b.id('gallows'))).toBeUndefined();
  });
});
