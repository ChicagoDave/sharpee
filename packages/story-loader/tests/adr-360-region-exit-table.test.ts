/**
 * adr-360-region-exit-table.test.ts — ADR-360 AC-3 and the REAL-PATH half of
 * AC-4. On the loaded world, a region's `exits, one-way` table stamps only the
 * written direction while a plain `exits` table's row gets its reverse
 * inferred like any plain exit (D3). A room that is not identical joins the
 * region from its own block (D4): a real `go` into it fires the region's
 * entering reaction, and the world answers it is in the region. No doubles:
 * chord compile, the loader's real binding, `GameEngine.executeTurn`.
 *
 * Owner context: story-loader tests (ADR-360 Phase 6).
 */
import { describe, expect, it } from 'vitest';
import { Direction, RoomTrait, TraitType } from '@sharpee/world-model';
import { bootTurns, messageIdsOf, type BootedTurns } from './helpers/boot-turns';

const TABLES = `story
  title: Tables
  authors:
    T
  id: tables
  story-version: 0.0.1

create the House
  a region

  rooms Room 1 to 4

    A plain room.

  exits, one-way
    the Room 1: east to the Room 2

  exits
    the Room 3: north to the Room 4

create Alex
  a person
  playable
  starts in the Room 1

  You.

before the game starts
  change the player to Alex
end before
`;

const exitsOf = (b: BootedTurns, irId: string) =>
  (b.world.getEntity(b.id(irId))!.get(TraitType.ROOM) as RoomTrait).exits ?? {};

describe('ADR-360 AC-3 — the exit table on the loaded world', () => {
  it('`exits, one-way` stamps the written direction and infers no way back', async () => {
    const b = await bootTurns(TABLES);
    expect(exitsOf(b, 'room-1')[Direction.EAST]?.destination).toBe(b.id('room-2'));
    expect(exitsOf(b, 'room-2')[Direction.WEST]).toBeUndefined();
  });

  it('a plain `exits` row infers its reverse', async () => {
    const b = await bootTurns(TABLES);
    expect(exitsOf(b, 'room-3')[Direction.NORTH]?.destination).toBe(b.id('room-4'));
    expect(exitsOf(b, 'room-4')[Direction.SOUTH]?.destination).toBe(b.id('room-3'));
  });
});

const SPLIT = `story
  title: Split
  authors:
    T
  id: split
  story-version: 0.0.1

create the Maze
  a region

  rooms Maze 61 to 63
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

  rooms Maze 65 to 71
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

  after the player entering
    phrase maze-closes-in
  end after

create the Maze 64
  a room
  in the Maze
  room name:
    Maze
  west to the Cave

  You are in a maze of twisty little passages, all alike.

create the Cave
  a room

  A cave.

create Alex
  a person
  playable
  starts in the Cave

  You.

define phrase maze-closes-in
  The passages close in around you.
end phrase

before the game starts
  change the player to Alex
end before
`;

describe('ADR-360 AC-4 — a room that differs joins from its own block (REAL-PATH)', () => {
  it('a real `go` into the Maze 64 fires the region\'s entering reaction', async () => {
    const b = await bootTurns(SPLIT);
    const events = await b.turn('east'); // the Cave → the Maze 64, the reverse of its `west to the Cave`
    expect(b.world.getLocation(b.player.id)).toBe(b.id('maze-64'));
    expect(messageIdsOf(events)).toContain('maze-closes-in');
  });

  it('the Maze 64 is in the Maze, and so are the group rooms around it', async () => {
    const b = await bootTurns(SPLIT);
    const maze = b.id('maze');
    expect(b.world.isInRegion(b.id('maze-64'), maze)).toBe(true);
    expect(b.world.isInRegion(b.id('maze-63'), maze)).toBe(true);
    expect(b.world.isInRegion(b.id('maze-65'), maze)).toBe(true);
    expect(b.world.isInRegion(b.id('cave'), maze)).toBe(false);
  });
});
