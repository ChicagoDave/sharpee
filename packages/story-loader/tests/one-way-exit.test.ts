/**
 * one-way-exit.test.ts — GH #327 / ADR-234 D4 on the REAL path: an exit
 * written `<direction> to <room>, one-way` connects the written direction
 * only. At load the far room carries no reverse exit; through the real
 * parser and going action the reverse command is refused as no exit, while
 * the written direction still walks. A plain exit keeps both directions
 * (the standing behaviour, pinned so the modifier is the only thing that
 * changes it), and a one-way door opens from the written side only.
 *
 * Owner context: story-loader tests (publish-readiness Phase 2, P-1).
 */
import { describe, expect, it } from 'vitest';
import { Direction, RoomTrait, DoorTrait, TraitType } from '@sharpee/world-model';
import { bootTurns, messageIdsOf } from './helpers/boot-turns';

const SOURCE = `story
  title: Landing
  authors:
    T
  id: landing
  story-version: 0.0.1

create the Fruit Stall
  a room
  north to the Lane

  Fruit everywhere.

create the Lane
  a room

  A lane.

create Behind the Fruit Stall
  a room
  southwest to the Fruit Stall, one-way

  Cramped and flea-ridden.

create the Vault
  a room
  east to the Lane through the iron gate, one-way

  A vault.

create the iron gate
  a door, openable, starts open

  An iron gate.

create Jack
  a person
  playable
  starts in Behind the Fruit Stall

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #327: `, one-way` exits', () => {
  it('stamps the written direction only — the far room has no reverse exit', async () => {
    const b = await bootTurns(SOURCE);
    const landing = b.world.getEntity(b.id('behind-the-fruit-stall'))!.get(TraitType.ROOM) as RoomTrait;
    const stall = b.world.getEntity(b.id('fruit-stall'))!.get(TraitType.ROOM) as RoomTrait;

    expect(landing.exits?.[Direction.SOUTHWEST]?.destination).toBe(b.id('fruit-stall'));
    expect(stall.exits?.[Direction.NORTHEAST]).toBeUndefined();
  });

  it('a plain exit still connects both ways', async () => {
    const b = await bootTurns(SOURCE);
    const stall = b.world.getEntity(b.id('fruit-stall'))!.get(TraitType.ROOM) as RoomTrait;
    const lane = b.world.getEntity(b.id('lane'))!.get(TraitType.ROOM) as RoomTrait;

    expect(stall.exits?.[Direction.NORTH]?.destination).toBe(b.id('lane'));
    expect(lane.exits?.[Direction.SOUTH]?.destination).toBe(b.id('fruit-stall'));
  });

  it('walks out the written direction and refuses the way back as no exit', async () => {
    const b = await bootTurns(SOURCE);

    const out = await b.turn('southwest');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('fruit-stall'));
    expect(out.some((e) => e.type === 'if.event.room.description')).toBe(true);

    const back = await b.turn('northeast');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('fruit-stall'));
    expect(messageIdsOf(back)).toContain('if.action.going.no_exit_that_way');
  });

  it('a one-way door opens from the written side only', async () => {
    const b = await bootTurns(SOURCE);
    const vault = b.world.getEntity(b.id('vault'))!.get(TraitType.ROOM) as RoomTrait;
    const lane = b.world.getEntity(b.id('lane'))!.get(TraitType.ROOM) as RoomTrait;
    const gate = b.world.getEntity(b.id('iron-gate'))!.get(TraitType.DOOR) as DoorTrait;

    expect(vault.exits?.[Direction.EAST]?.via).toBe(b.id('iron-gate'));
    expect(lane.exits?.[Direction.WEST]).toBeUndefined();
    expect(gate.bidirectional).toBe(false);
  });
});
