/**
 * adr-362-folds-load.test.ts — ADR-362 on the loaded world (AC-3, AC-4's
 * positive case, AC-8's three exits). An `exits, one-way:` line stamps only
 * the written direction while a plain `exits:` line's exits get their reverse
 * inferred (D2); a blocked line beside an `exits:` line guards that one exit
 * and a real `go` is refused with its phrase; three exits on one line all
 * load. No doubles: chord compile, the loader's real binding, a real
 * `GameEngine` turn.
 *
 * Owner context: story-loader tests (ADR-362, plan chord-syntax-round Phase 10).
 */
import { describe, expect, it } from 'vitest';
import { exitBlockedKey } from '@sharpee/stdlib';
import { Direction, RoomTrait, TraitType } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const story = (hall: string, extra = '') => `story
  title: Folds
  authors:
    T
  id: folds
  story-version: 0.0.1

create the Hall, a room
${hall}
  A hall.

create the B, a room

  B.

create the C, a room

  C.

create the D, a room

  D.
${extra}
create Alex, a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const exitsOf = (b: BootedTurns, irId: string) =>
  (b.world.getEntity(b.id(irId))!.get(TraitType.ROOM) as RoomTrait).exits ?? {};

describe('ADR-362 AC-3 — `exits:` lines on the loaded world', () => {
  it('`exits, one-way: east to the B` gives the Hall an east exit and the B no inferred west', async () => {
    const b = await bootTurns(story('  exits, one-way: east to the B\n'));
    expect(exitsOf(b, 'hall')[Direction.EAST]?.destination).toBe(b.id('b'));
    expect(exitsOf(b, 'b')[Direction.WEST]).toBeUndefined();
  });

  it('`exits: east to the B` gives the B a west exit back', async () => {
    const b = await bootTurns(story('  exits: east to the B\n'));
    expect(exitsOf(b, 'hall')[Direction.EAST]?.destination).toBe(b.id('b'));
    expect(exitsOf(b, 'b')[Direction.WEST]?.destination).toBe(b.id('hall'));
  });
});

describe('ADR-362 AC-8 — an `exits:` line of three', () => {
  it('the loaded room has all three', async () => {
    const b = await bootTurns(story('  exits: east to the B, north to the C, west to the D\n'));
    const exits = exitsOf(b, 'hall');
    expect(exits[Direction.EAST]?.destination).toBe(b.id('b'));
    expect(exits[Direction.NORTH]?.destination).toBe(b.id('c'));
    expect(exits[Direction.WEST]?.destination).toBe(b.id('d'));
    expect(Object.keys(exits)).toHaveLength(3);
  });
});

describe('ADR-362 AC-4 — a blocked line beside an `exits:` line (the positive case)', () => {
  const GUARDED = story(
    '  exits: north to the B, east to the C\n  north is blocked while the lamp is here: too-dark\n',
    `
create the lamp, a thing
  in the Hall

  A lamp.

define phrases en-US
  too-dark:
    Too dark to go north.
`,
  );

  it('the loaded Hall has one north exit, blocked while the condition holds', async () => {
    const b = await bootTurns(GUARDED);
    const exits = exitsOf(b, 'hall');
    expect(exits[Direction.NORTH]?.destination).toBe(b.id('b'));
    expect(exits[Direction.EAST]?.destination).toBe(b.id('c'));
    expect(b.world.evaluate(exitBlockedKey(b.id('hall'), Direction.NORTH))).toBe(true);
  });

  it('a real `north` is refused with the phrase while the lamp is here, and walks once it is gone', async () => {
    const b = await bootTurns(GUARDED);
    const refused = await b.turnText('north');
    expect(refused.text).toContain('Too dark to go north.');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('hall'));

    b.world.moveEntity(b.id('lamp'), b.id('c'));
    expect(b.world.evaluate(exitBlockedKey(b.id('hall'), Direction.NORTH))).toBe(false);
    await b.turn('north');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('b'));
  });
});
