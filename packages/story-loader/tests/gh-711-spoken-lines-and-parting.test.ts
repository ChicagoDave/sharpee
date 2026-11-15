/**
 * gh-711-spoken-lines-and-parting.test.ts — a line a character speaks to
 * the player on the character's own turn prints as the authored phrase,
 * never as overheard speech, and a conversation the player walks out of
 * closes on that turn with its `on parting` line ahead of the new room
 * (GH #711). Asserted on the text real engine turns print and on the
 * scene store and thread state they leave behind.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader tests, conversation rendering.
 */
import { describe, expect, it } from 'vitest';
import { CharacterModelTrait, TraitType, readSceneStore } from '@sharpee/world-model';
import { bootTurns, eventsOfType, type BootedTurns } from './helpers/boot-turns';

const BEAT_ONE = '"I have it," says Vey.';
const BEAT_TWO = '"Here is my price," says Vey.';
const CONCLUSION = '"Then we\'ve said it," says Vey.';
const PARTING = '"It\'ll keep," she says.';

const SOURCE = `story
  title: Refectory
  authors:
    T
  id: refectory
  story-version: 0.0.1

create the Refectory
  a room
  west to the Cloister

  A long room of benches.

create the Cloister
  a room
  east to the Refectory

  A covered walk.

create Vey
  a person, proper
  in the Refectory
  mood calm

  The keeper.

create Alex
  a person
  playable
  starts in the Refectory

  You.

before the game starts
  change the player to Alex
end before

define conversation the-bargain for Vey
  about "the page"
  beat:
    phrase vey-has-it
  beat:
    phrase vey-names-price
  on parting:
    phrase vey-lets-you-go
  conclusion:
    phrase vey-concluded
end conversation

define phrase vey-has-it
  ${BEAT_ONE}
end phrase

define phrase vey-names-price
  ${BEAT_TWO}
end phrase

define phrase vey-lets-you-go
  ${PARTING}
end phrase

define phrase vey-concluded
  ${CONCLUSION}
end phrase
`;

const threadOf = (b: BootedTurns) =>
  (b.world.getEntity('vey')!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait)
    .conversationThreads?.[b.player.id]?.['the-bargain'];

const scenes = (b: BootedTurns) => Object.values(readSceneStore(b.world).scenes);

describe('a line spoken to the player on the speaker\'s own turn prints as written (GH #711)', () => {
  it('prints the next beat and the conclusion plainly, with no heard-speech frame', async () => {
    const b = await bootTurns(SOURCE);
    const first = await b.turnText('ask vey about the page');
    expect(first.text).toContain(BEAT_ONE);

    const second = await b.turnText('wait');
    expect(threadOf(b)).toMatchObject({ status: 'active', beatCursor: 2 });
    expect(second.text).toContain(BEAT_TWO);
    expect(second.text).not.toContain('You hear');
    expect(second.text).not.toContain('""');

    const third = await b.turnText('wait');
    expect(threadOf(b)).toMatchObject({ status: 'concluded' });
    expect(third.text).toContain(CONCLUSION);
    expect(third.text).not.toContain('You hear');
    expect(third.text).not.toContain('""');
  });

  it('carries the line on one spoken-line event and makes no sound of it', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask vey about the page');
    const events = await b.turn('wait');
    const spoken = eventsOfType(events, 'character.line.spoken');
    expect(spoken.map((e) => (e.data as { messageId: string }).messageId)).toEqual(['vey-names-price']);
    expect(eventsOfType(events, 'sound.audibility.heard')).toHaveLength(0);
    // The wire event still records the utterance for the channel layer.
    expect(
      eventsOfType(events, 'character.scene.utterance').map((e) => (e.data as { messageId: string }).messageId),
    ).toEqual(['vey-names-price']);
  });
});

describe('walking out of a conversation closes it on that turn (GH #711)', () => {
  it('speaks the parting line before the new room and parks the thread', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask vey about the page');
    expect(scenes(b)).toHaveLength(1);

    const { text } = await b.turnText('west');
    expect(b.world.getLocation(b.player.id)).toBe('cloister');
    expect(scenes(b)).toHaveLength(0);
    expect(threadOf(b)).toMatchObject({ status: 'parked', beatCursor: 1 });
    const partingAt = text.indexOf(PARTING);
    expect(partingAt).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('A covered walk.')).toBeGreaterThan(partingAt);
  });

  it('never speaks the parting line on a later turn in another room', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask vey about the page');
    await b.turn('west');
    let later = '';
    for (let i = 0; i < 6; i++) later += (await b.turnText('wait')).text;
    expect(later).not.toContain(PARTING);
    expect(later).not.toContain(BEAT_TWO);
  });

  it('closes silently when the player leaves by any other means', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask vey about the page');
    expect(scenes(b)).toHaveLength(1);

    b.world.moveEntity(b.player.id, 'cloister');
    const { text } = await b.turnText('wait');
    expect(scenes(b)).toHaveLength(0);
    expect(threadOf(b)).toMatchObject({ status: 'parked', beatCursor: 1 });
    expect(text).not.toContain(PARTING);
    expect(text).not.toContain(BEAT_TWO);
  });

  it('keeps the conversation open while the player stays', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('ask vey about the page');
    const { text } = await b.turnText('look');
    expect(scenes(b)).toHaveLength(1);
    expect(text).not.toContain(PARTING);
  });
});
