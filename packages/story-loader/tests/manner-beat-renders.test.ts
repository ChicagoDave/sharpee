/**
 * manner-beat-renders.test.ts — a `define manner` beat is printed with the
 * answer it colors (GH #710). Only exchange answers selected a beat, and
 * nothing rendered the ones that rode the scene wire; now a table answer
 * and a greeting select one too, and each conversation action prints it
 * ahead of its answer. Asserted on the text real engine turns print: the
 * beat's own words, its place before the answer, its rotation, and the
 * beat of a rendered silence.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader tests, conversation rendering.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns, eventsOfType } from './helpers/boot-turns';

const KETTLE = 'He turns the kettle a quarter round on its hook.';
const FLAME = 'He looks at the blue flame on the sill.';

const SOURCE = `story
  title: Kitchen
  authors:
    T
  id: kitchen
  story-version: 0.0.1

create the Kitchen
  a room

  A kitchen with no door.

create Hobb
  a person, proper
  in the Kitchen
  mood calm

  The cook.

create Alex
  a person
  playable
  starts in the Kitchen

  You.

before the game starts
  change the player to Alex
end before

define topics for Hobb
  about "the soup":
    phrase hobb-soup
  about "the bread":
    phrase hobb-bread
  about "the cellar":
    phrase hobb-cellar
    then asks the-dare
end topics

define exchange the-dare for Hobb
  answer "yes":
    phrase hobb-dare-yes
  answer "no":
    phrase hobb-dare-no
    leave
end exchange

define greetings for Hobb
  first time:
    phrase hobb-hello
end greetings

define phrase hobb-hello
  "You're back," says Hobb.
end phrase

define manner for Hobb
  when Hobb is calm:
    beat "${KETTLE}"
    beat "${FLAME}"
  when Hobb is angry:
    beat "He slams the ladle down."
end manner

define phrase hobb-soup
  "Leek," says Hobb.
end phrase

define phrase hobb-bread
  "Yesterday's," says Hobb.
end phrase

define phrase hobb-cellar
  "Will you go down?" says Hobb.
end phrase

define phrase hobb-dare-yes
  "Good," says Hobb.
end phrase

define phrase hobb-dare-no
  "Then I will," says Hobb.
end phrase
`;

describe('a manner beat is printed with the answer it colors (GH #710)', () => {
  it('prints the beat before the answer once the conversation is under way', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask hobb about the soup');
    const { text } = await b.turnText('ask hobb about the bread');
    const beatAt = Math.max(text.indexOf(KETTLE), text.indexOf(FLAME));
    const answerAt = text.indexOf('"Yesterday\'s," says Hobb.');
    expect(beatAt).toBeGreaterThanOrEqual(0);
    expect(answerAt).toBeGreaterThan(beatAt);
  });

  it('colors the first answer of a conversation, which opens the scene', async () => {
    const b = await bootTurns(SOURCE);
    const { text } = await b.turnText('ask hobb about the soup');
    const beatAt = text.indexOf(KETTLE);
    expect(beatAt).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('"Leek," says Hobb.')).toBeGreaterThan(beatAt);
  });

  it('colors a greeting, whose scene does not exist until the action opens it', async () => {
    const b = await bootTurns(SOURCE);
    const { events, text } = await b.turnText('talk to hobb');
    const beatAt = text.indexOf(KETTLE);
    expect(beatAt).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('"You\'re back," says Hobb.')).toBeGreaterThan(beatAt);
    const utterance = eventsOfType(events, 'character.scene.utterance')[0].data as { sceneId: string };
    const opened = eventsOfType(events, 'character.scene.scene-opened')[0].data as { sceneId: string };
    expect(utterance.sceneId).toBe(opened.sceneId);
  });

  it('rotates through the matching row and never prints a row whose condition fails', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask hobb about the soup');
    const second = (await b.turnText('ask hobb about the bread')).text;
    const third = (await b.turnText('ask hobb about the soup')).text;
    const beatOf = (text: string) => [KETTLE, FLAME].filter((beat) => text.includes(beat));
    expect(beatOf(second)).toHaveLength(1);
    expect(beatOf(third)).toHaveLength(1);
    expect(beatOf(third)[0]).not.toBe(beatOf(second)[0]);
    expect(second + third).not.toContain('He slams the ladle down.');
  });

  it('prints one beat event per beat the utterance carried', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask hobb about the soup');
    const events = await b.turn('ask hobb about the bread');
    const utterances = eventsOfType(events, 'character.scene.utterance');
    const beats = eventsOfType(events, 'character.manner.beat');
    expect(utterances).toHaveLength(1);
    const carried = (utterances[0].data as { beats: string[] }).beats;
    expect(carried).toHaveLength(1);
    expect(beats.map((e) => (e.data as { messageId: string }).messageId)).toEqual(carried);
  });

  it('prints the beat of a rendered silence, ahead of the action\'s own line', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask hobb about the cellar');
    // The kitchen has no exit, so the `leave` row is refused and the
    // response is a rendered silence: its beat, never the row's phrase.
    // The answering action's default line still stands after it.
    const { events, text } = await b.turnText('answer no');
    expect(eventsOfType(events, 'character.scene.rendered-silence')).toHaveLength(1);
    const beatAt = Math.max(text.indexOf(KETTLE), text.indexOf(FLAME));
    expect(beatAt).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('You answer')).toBeGreaterThan(beatAt);
    expect(text).not.toContain('"Then I will," says Hobb.');
  });
});
