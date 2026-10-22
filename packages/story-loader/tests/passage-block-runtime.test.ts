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
