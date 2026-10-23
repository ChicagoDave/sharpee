/**
 * passage-block-runtime.test.ts — the passage block and a fixed noun's
 * bracketed article through the REAL engine. A passage both hidden and
 * blocked refuses as hidden: its commands are not understood until its
 * `while` holds, and only then does its `blocked:` phrase answer. A command
 * written with an article works typed with or without it. An action
 * pattern's fixed noun written `[the] arrow` is a word, so `shoot rock at
 * wumpus` binds nothing to it and is refused, while `shoot the arrow at the
 * wumpus` and `shoot arrow at wumpus` play. Every assertion reads a
 * location or the turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const HEADER = `story
  title: Passages
  authors:
    T
  id: passages
  story-version: 0.0.1
`;

const PLAYER = `
create Alex
  a person
  playable
  starts in the Shaft

  You.

before the game starts
  change the player to Alex
end before
`;

const SHAFT = `${HEADER}
create the Shaft
  a room

  passage to the Loft
    grammar
      climb the rope
    while the lever is pulled
    blocked while the gate is shut: rope-snagged
  end passage

  A shaft with a rope.

create the Loft
  a room

  The loft.

create the lever
  a thing, pushable
  in the Shaft
  states: resting, pulled

  A lever.

  on the player pushing
    change the lever to pulled
  end on

create the gate
  a thing, pushable
  in the Shaft
  states: shut, open

  A gate.

  on the player pushing
    change the gate to open
  end on

define phrase rope-snagged
  The rope is snagged on the gate.
end phrase
${PLAYER}`;

describe('a passage both hidden and blocked refuses as hidden', () => {
  it('is not understood while hidden, then answers its blocked phrase, then takes the player', async () => {
    const b = await bootTurns(SHAFT);
    const hidden = await b.turnText('climb the rope');
    expect(hidden.text).not.toContain('snagged');
    expect(hidden.events.some((e) => e.type === 'command.failed')).toBe(true);
    expect(b.world.getLocation(b.player.id)).toBe(b.id('shaft'));

    await b.turn('push lever');
    const blocked = await b.turnText('climb rope');
    expect(blocked.text).toContain('The rope is snagged on the gate.');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('shaft'));

    await b.turn('push gate');
    await b.turn('climb rope');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('loft'));
  });
});

const RIVER = `${HEADER}
create the Shaft
  a room

  The riverbank.

create the Wumpus
  a thing
  in the Shaft

  A wumpus.

create the rock
  a thing
  in the Shaft

  A rock.

create Alex
  a person
  playable
  starts in the Shaft

  You.

before the game starts
  change the player to Alex
end before

define action shooting
  grammar
    shoot the target
    shoot [the] arrow at the target
  the target must be visible
  refuse without target: shoot-what
  phrase loosed

  phrases en-US
    shoot-what:
      Shoot what?
    loosed:
      You loose an arrow.
`;

describe('a fixed noun written `[the] arrow` is a word, not a slot', () => {
  it.each(['shoot the arrow at the wumpus', 'shoot arrow at wumpus', 'shoot the wumpus'])('`%s` plays', async (command) => {
    const b = await bootTurns(RIVER);
    const turn = await b.turnText(command);
    expect(turn.text).toContain('You loose an arrow.');
  });

  it('`shoot rock at wumpus` does not reach the arrow pattern', async () => {
    const b = await bootTurns(RIVER);
    const turn = await b.turnText('shoot rock at wumpus');
    expect(turn.text).not.toContain('You loose an arrow.');
  });
});

const WELL = `${HEADER}
create the Shaft
  a room

  passage to the Cellar
    grammar
      climb down the ladder
  end passage

  passage to the Loft
    grammar
      climb up the rope
  end passage

  A shaft with a ladder and a rope.

create the Cellar
  a room

  The cellar.

create the Loft
  a room

  The loft.
${PLAYER}`;

describe('a passage command holding a compass word reaches its passage (parser review C3)', () => {
  it('`climb down the ladder` takes the player to the Cellar, though the Shaft has no way down', async () => {
    const b = await bootTurns(WELL);
    await b.turn('climb down the ladder');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('cellar'));
  });

  it('`climb up the rope` takes the player to the Loft, not "You can\'t go that way."', async () => {
    const b = await bootTurns(WELL);
    const turn = await b.turnText('climb up the rope');
    expect(turn.text).not.toContain("can't go that way");
    expect(b.world.getLocation(b.player.id)).toBe(b.id('loft'));
  });
});

const HALL = `${HEADER}
create the Hall
  a room

  A hall.

  out to the Yard
  out is blocked while the bolt is shot: bolted

create the Yard
  a room

  A yard.

create the Den
  a room

  A den with no way out.

create the Porch
  a room

  A porch with a way north and none out.

  north to the Yard

create the bolt
  a thing, pushable
  in the Hall
  states: drawn, shot

  A bolt.

  on the player pushing
    change the bolt to shot
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

define phrase bolted
  The door is bolted.
end phrase
`;

describe('every word for leaving takes the author\'s `out` exit (parser review step 1)', () => {
  it.each(['out', 'go out', 'exit', 'leave'])('`%s` takes the player from the Hall to the Yard', async (command) => {
    const b = await bootTurns(HALL);
    await b.turn(command);
    expect(b.world.getLocation(b.player.id)).toBe(b.id('yard'));
  });

  it('`go out` through a blocked way speaks the way\'s phrase and stays', async () => {
    const b = await bootTurns(HALL);
    await b.turn('push bolt');
    const turn = await b.turnText('go out');
    expect(turn.text).toContain('The door is bolted.');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('hall'));
  });

  it('going out of a room records going\'s move, not an exit from a container', async () => {
    const b = await bootTurns(HALL);
    const events = await b.turn('exit');
    expect(events.some((e) => e.type === 'if.event.actor_moved')).toBe(true);
    expect(events.some((e) => e.type === 'if.event.exited')).toBe(false);
  });

  it('`exit` in a room with other ways but none out keeps "You\'re not inside anything." and stays', async () => {
    const b = await bootTurns(HALL);
    b.world.moveEntity(b.player.id, b.id('porch'));
    const turn = await b.turnText('exit');
    expect(turn.text).toContain("You're not inside anything.");
    expect(turn.text).not.toContain("can't go that way");
    expect(b.world.getLocation(b.player.id)).toBe(b.id('porch'));
  });

  it('`exit` in a room with no way out keeps "You\'re not inside anything." and stays', async () => {
    const b = await bootTurns(HALL);
    b.world.moveEntity(b.player.id, b.id('den'));
    const turn = await b.turnText('exit');
    expect(turn.text).toContain("You're not inside anything.");
    expect(b.world.getLocation(b.player.id)).toBe(b.id('den'));
  });
});
