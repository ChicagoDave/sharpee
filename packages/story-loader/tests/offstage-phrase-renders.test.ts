/**
 * offstage-phrase-renders.test.ts — GH #329 on the REAL path: a phrase
 * emitted in the same clause arm that moves its owner offstage (or removes
 * it) renders in that turn's output. The phrase was spoken while the owner
 * was on stage; what the rest of the arm does to the owner afterward must
 * not silence it. Asserted on the rendered text and on the phrase event's
 * presence tag.
 *
 * Owner context: story-loader tests (publish-readiness Phase 2, P-9).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const source = (finalLine: string) => `story
  title: Briefing
  authors:
    T
  id: briefing
  story-version: 0.0.1
  states: calm, hunted

create the Roof
  a room

  A roof.

create the group of mercenaries
  scenery, plural
  in the Roof

  Mercenaries.

  on every turn while the group of mercenaries is here
    first time
      phrase overheard-spread-out
        "Spread out," one says.
    second time
      phrase overheard-go
        "Go," the captain says, and they go.
      ${finalLine}
      change the story to hunted
  end on

create Jack
  a person
  playable
  starts in the Roof

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #329: a phrase in the arm that sends its owner away still renders', () => {
  it('renders the arm’s phrase when the arm moves the owner offstage', async () => {
    const b = await bootTurns(source('move the group of mercenaries offstage'));

    const first = await b.turnText('wait');
    expect(first.text).toContain('"Spread out," one says.');

    const second = await b.turnText('wait');
    expect(b.world.getLocation(b.id('group-of-mercenaries'))).toBeUndefined();
    const go = second.events.find((e) => (e.data as { messageId?: string })?.messageId?.endsWith('overheard-go'));
    expect(go, 'the phrase event reached the stream').toBeDefined();
    expect(go!.presence).not.toBe('absent');
    expect(second.text).toContain('"Go," the captain says, and they go.');
  });

  it('renders the arm’s phrase when the arm removes the owner', async () => {
    const b = await bootTurns(source('remove the group of mercenaries'));

    await b.turnText('wait');
    const second = await b.turnText('wait');

    expect(b.world.getEntity(b.id('group-of-mercenaries'))).toBeUndefined();
    expect(second.text).toContain('"Go," the captain says, and they go.');
  });
});
