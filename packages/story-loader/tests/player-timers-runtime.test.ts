/**
 * player-timers-runtime.test.ts — a timer defined for the player belongs to
 * the character, and its reports know whether that character is the player,
 * on the REAL engine (boot-turns: real parser, language, perception, turn cycle).
 *
 * One, two and three playable characters (Alex and Brook in the Yard, Casey
 * in the Shed). `cut myself` starts the player's wound; `become <name>` moves
 * the role. The wound is the character's: after the role moves it keeps
 * running on Alex and the new player's own is unstarted. Its turn prose and
 * its expiry clause are sourced to Alex, so `{You}` reads "You" while Alex
 * plays, "Alex" to a witness in the Yard, and nothing reaches Casey in the
 * Shed. A counter the player owns is read and written through the same owner
 * resolution (GH #613): after the role moves, `the player's blood` is the new
 * player's.
 *
 * The wound has two silent turns before it bleeds, so no report shares a turn
 * with the role moving: a switch is drained at turn end, after that turn's
 * timers, and that one turn is its own open question (filed separately).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { counterKey, timerKey } from '../src/state-keys';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

/** The one rendered line containing `word` (whole line, so an article or a wrong person fails it). */
const lineOf = (text: string, word: string): string | undefined => {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.includes(word));
  return lines.length === 1 ? lines[0] : `${lines.length} lines contain \`${word}\``;
};

/** Run `wait` this many turns. */
const wait = async (b: BootedTurns, turns: number): Promise<void> => {
  for (let i = 0; i < turns; i++) await b.turn('wait');
};

/** The presence tag of the turn's phrase event with this message id. */
const presenceOf = (events: ISemanticEvent[], messageId: string): string | undefined => {
  const found = events.filter((e) => (e.data as { messageId?: string } | undefined)?.messageId === messageId);
  return found.length === 1 ? found[0].presence : `${found.length} events carry \`${messageId}\``;
};

const PEOPLE = [
  { name: 'Alex', room: 'Yard' },
  { name: 'Brook', room: 'Yard' },
  { name: 'Casey', room: 'Shed' },
];

/** A story with the first `playable` of Alex, Brook and Casey; `start` is the start block's body. */
const story = (playable: number, start = '  change the player to Alex') => {
  const people = PEOPLE.slice(0, playable);
  return `story
  title: Wounds
  authors:
    T
  id: wounds
  story-version: 0.0.1

define timer wound for the player
  numb
  aching
  bleeding
    {You} {bleed} into the dirt.
end timer

define action cutting
  grammar
    cut myself
  start the player's wound

define action bleeding-more
  grammar
    bleed more
  raise the player's blood by 1

define action checking-wound
  grammar
    check wound
  phrase whole when the player's wound has not started
  phrase wounded when the player's wound has started

define action checking-blood
  grammar
    check blood
  phrase unbloodied when the player's blood is 0
  phrase bloodied when the player's blood is at least 1

${people.map((p) => `define action becoming-${p.name.toLowerCase()}
  grammar
    become ${p.name.toLowerCase()}
  change the player to ${p.name}
`).join('\n')}
define phrase collapse
  {You} {collapse}.
end phrase

define phrase whole
  Whole.
end phrase

define phrase wounded
  Wounded.
end phrase

define phrase unbloodied
  Unbloodied.
end phrase

define phrase bloodied
  Bloodied.
end phrase

create the Yard
  a room
  north to the Shed

  A yard.

create the Shed
  a room

  A shed.

${people.map((p) => `create ${p.name}
  a person, proper
  playable
  starts in the ${p.room}
  counter blood starts 0 between 0 and 5

  ${p.name}.

  when wound expires
    phrase collapse
  end when
`).join('\n')}
before the game starts
${start}
end before
`;
};

describe('one playable character: the player\'s wound is theirs, told in the second person', () => {
  it('numb, aching, then bleeding, then the collapse — each told to the player', async () => {
    const b = await bootTurns(story(1));
    expect((await b.turnText('cut myself')).text).not.toMatch(/bleed/i);
    await wait(b, 2); // numb, aching: silent turns
    expect(lineOf((await b.turnText('wait')).text, 'bleed')).toBe('You bleed into the dirt.');
    expect(lineOf((await b.turnText('wait')).text, 'collapse')).toBe('You collapse.');
    expect(b.world.getStateValue(timerKey('alex.wound'))).toMatchObject({ phase: 'expired' });
  });
});

describe('two playable characters: the wound stays with Alex when the role moves to Brook', () => {
  it('Brook, in the Yard, sees Alex bleed and collapse in the third person', async () => {
    const b = await bootTurns(story(2));
    await b.turn('cut myself');
    await b.turn('become brook'); // numb
    await wait(b, 1); // aching
    const bleeding = await b.turnText('wait');
    expect(lineOf(bleeding.text, 'bleeds')).toBe('Alex bleeds into the dirt.');
    expect(presenceOf(bleeding.events, 'alex.wound.bleeding')).toBe('present');
    const collapse = await b.turnText('wait');
    expect(lineOf(collapse.text, 'collapses')).toBe('Alex collapses.');
    expect(presenceOf(collapse.events, 'collapse')).toBe('present');
  });

  it('as Alex, `the player\'s wound` reads Alex\'s', async () => {
    const b = await bootTurns(story(2));
    expect((await b.turnText('check wound')).text).toContain('Whole.');
    await b.turn('cut myself');
    expect((await b.turnText('check wound')).text).toContain('Wounded.');
  });

  it('Alex\'s wound runs on Alex; Brook\'s is unstarted, and `the player\'s wound` now reads Brook\'s', async () => {
    const b = await bootTurns(story(2));
    await b.turn('cut myself');
    await b.turn('become brook');
    expect(b.world.getStateValue(timerKey('alex.wound'))).toMatchObject({ phase: 'running', turn: 'numb' });
    expect(b.world.getStateValue(timerKey('brook.wound'))).toBeUndefined();
    expect((await b.turnText('check wound')).text).toContain('Whole.');
    await wait(b, 2); // bleeding, then expiry
    expect(b.world.getStateValue(timerKey('alex.wound'))).toMatchObject({ phase: 'expired' });
    expect(b.world.getStateValue(timerKey('brook.wound'))).toBeUndefined();
  });

  it('back as Alex, the bleeding and the collapse are told to Alex in the second person', async () => {
    const b = await bootTurns(story(2));
    await b.turn('cut myself');
    await b.turn('become brook'); // numb
    await b.turn('become alex'); // aching
    expect(lineOf((await b.turnText('wait')).text, 'bleed')).toBe('You bleed into the dirt.');
    expect(lineOf((await b.turnText('wait')).text, 'collapse')).toBe('You collapse.');
  });

  it('the player\'s counter is read and written as the holder\'s, through one owner (GH #613)', async () => {
    const b = await bootTurns(story(2));
    await b.turn('bleed more');
    expect(b.world.getStateValue(counterKey('blood', 'alex'))).toBe(1);
    expect((await b.turnText('check blood')).text).toContain('Bloodied.');
    await b.turn('become brook');
    expect((await b.turnText('check blood')).text).toContain('Unbloodied.');
    await b.turn('bleed more');
    await b.turn('bleed more');
    expect(b.world.getStateValue(counterKey('blood', 'brook'))).toBe(2);
    expect(b.world.getStateValue(counterKey('blood', 'alex'))).toBe(1);
  });
});

describe('the start block names the player it has just assigned', () => {
  it('`change the player to Brook` then `start the player\'s wound` starts Brook\'s, not Alex\'s', async () => {
    const b = await bootTurns(story(2, '  change the player to Brook\n  start the player\'s wound'));
    expect(b.world.getStateValue(timerKey('brook.wound'))).toMatchObject({ phase: 'running' });
    expect(b.world.getStateValue(timerKey('alex.wound'))).toBeUndefined();
  });
});

describe('three playable characters: a witness out of sight is told nothing', () => {
  it('Casey, in the Shed, is absent from the bleeding and the collapse, and Alex\'s wound still runs out', async () => {
    // Out of sight is tagged `absent` (ADR-328 D3), which a client hides by default.
    const b = await bootTurns(story(3));
    await b.turn('cut myself');
    await b.turn('become casey'); // numb
    await wait(b, 1); // aching
    const bleeding = await b.turnText('wait');
    expect(presenceOf(bleeding.events, 'alex.wound.bleeding')).toBe('absent');
    const collapse = await b.turnText('wait');
    expect(presenceOf(collapse.events, 'collapse')).toBe('absent');
    expect(b.world.getStateValue(timerKey('alex.wound'))).toMatchObject({ phase: 'expired' });
    expect(b.world.getStateValue(timerKey('casey.wound'))).toBeUndefined();
  });

  it('Brook, in the Yard with Alex, is the one who sees it', async () => {
    const b = await bootTurns(story(3));
    await b.turn('cut myself');
    await b.turn('become brook'); // numb
    await wait(b, 1); // aching
    const bleeding = await b.turnText('wait');
    expect(lineOf(bleeding.text, 'bleeds')).toBe('Alex bleeds into the dirt.');
    expect(presenceOf(bleeding.events, 'alex.wound.bleeding')).toBe('present');
    expect(lineOf((await b.turnText('wait')).text, 'collapses')).toBe('Alex collapses.');
  });
});
