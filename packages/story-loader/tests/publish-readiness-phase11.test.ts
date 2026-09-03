/**
 * publish-readiness-phase11.test.ts — the REAL-path pins for the room
 * description and dialogue mechanics of publish-readiness plan Phase 11:
 *
 * - GH #338 (P-23): arriving by going lists a scenery supporter's contents
 *   exactly as an explicit `look` does ("On the display you see a cheese.").
 * - GH #346 (P-26): an open exchange takes a bare answer (`yes`), `say aye`
 *   and `answer no`; outside one, `answer yes` is refused sensibly.
 * - GH #300 (P-27): `goodbye` closes the live conversation and the active
 *   thread's `on parting` line speaks; outside one, `bye` is refused.
 * - GH #241 (P-28): `cut the fuse` with the shears in hand cuts by implicit
 *   instrument; without them the refusal names the shears.
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { sceneWith } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Phase Eleven
  authors:
    T
  id: phase-eleven
  story-version: 0.0.1

create the Yard
  a room
  north to the Stall

  A yard.

create the Stall
  a room

  A stall.

create the pyramid display
  scenery, a supporter
  in the Stall

  A display.

create the cheese
  on the pyramid display

  A cheese.

create the fuse
  scenery
  cuttable with the shears
  in the Yard
  states: coiled, cut

  A fuse.

  on the player cutting
    change the fuse to cut
    phrase fuse-cut-through
  end on

create the shears
  in the Yard

  Shears.

create Kemp
  a person, proper, impulsive
  in the Yard
  mood cheerful
  temperament desire over fear

  Kemp.

define topics for Kemp
  about "the offer":
    phrase kemp-offers
    then asks the-offer
end topics

define exchange the-offer for Kemp
  answer "yes", "aye":
    phrase kemp-glad
  answer "no":
    phrase kemp-sad
end exchange

define conversation the-weather-talk for Kemp, passive
  about "the weather"
  beat:
    phrase kemp-weather
  beat:
    phrase kemp-weather-more
  on parting:
    phrase kemp-parting
  conclusion:
    phrase kemp-weather-done
end conversation

define phrase fuse-cut-through
  The shears bite through the cord.
end phrase

define phrase kemp-offers
  "The clown is yours, if you say so. Well?"
end phrase

define phrase kemp-glad
  "Sworn, then," says Kemp.
end phrase

define phrase kemp-sad
  "Then it is finished," says Kemp.
end phrase

define phrase kemp-weather
  "Rain on the thatch," says Kemp.
end phrase

define phrase kemp-weather-more
  "And more to come," says Kemp.
end phrase

define phrase kemp-parting
  Kemp turns back to his ale.
end phrase

define phrase kemp-weather-done
  "Enough of weather," says Kemp.
end phrase

create Jack
  a person, proper
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Jack
end before
`;

describe('Phase 11 on the real path', () => {
  it('GH #338: arriving by going lists the scenery supporter contents that look lists', async () => {
    const b = await bootTurns(SOURCE);

    const arrived = await b.turnText('north');
    const looked = await b.turnText('look');

    expect(looked.text).toContain('On the pyramid display you see a cheese.');
    expect(arrived.text).toContain('On the pyramid display you see a cheese.');
  });

  it('GH #346: a bare answer reaches the open exchange', async () => {
    const b = await bootTurns(SOURCE);
    const opened = await b.turnText('ask kemp about the offer');
    expect(opened.text).toContain('Well?');
    expect(sceneWith(b.world, b.player.id)?.openExchange).toBeTruthy();

    const answered = await b.turnText('yes');

    expect(answered.text).toContain('"Sworn, then," says Kemp.');
    expect(sceneWith(b.world, b.player.id)?.openExchange).toBeFalsy();
  });

  it('GH #346: `say <word>` and `answer <word>` reach the open exchange', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('ask kemp about the offer');
    const said = await b.turnText('say aye');
    expect(said.text).toContain('"Sworn, then," says Kemp.');
    expect(sceneWith(b.world, b.player.id)?.openExchange).toBeFalsy();

    const c = await bootTurns(SOURCE);
    await c.turnText('ask kemp about the offer');
    const answered = await c.turnText('answer no');
    expect(answered.text).toContain('"Then it is finished," says Kemp.');
    expect(sceneWith(c.world, c.player.id)?.openExchange).toBeFalsy();
  });

  it('GH #346: outside an open exchange, `answer yes` is refused and a bare `yes` stays unparsed', async () => {
    const b = await bootTurns(SOURCE);

    const refused = await b.turnText('answer yes');
    expect(refused.text).toContain('No one has asked you anything.');

    const bare = await b.turnText('yes');
    expect(bare.text).not.toContain('Sworn');
  });

  it('GH #300: `goodbye` closes the live conversation and speaks the thread parting line', async () => {
    const b = await bootTurns(SOURCE);
    const talk = await b.turnText('ask kemp about the weather');
    expect(talk.text).toContain('Rain on the thatch');
    expect(sceneWith(b.world, b.player.id)).toBeTruthy();

    const bye = await b.turnText('goodbye');

    expect(bye.text).toContain('You say goodbye to Kemp.');
    expect(bye.text).toContain('Kemp turns back to his ale.');
    expect(sceneWith(b.world, b.player.id)).toBeUndefined();
  });

  it('GH #300: `bye` with no conversation is refused', async () => {
    const b = await bootTurns(SOURCE);

    const bye = await b.turnText('bye');

    expect(bye.text).toContain("You aren't talking to anyone.");
  });

  it('GH #241: `cut the fuse` with the shears in hand cuts by implicit instrument', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('take shears');

    const cut = await b.turnText('cut the fuse');

    expect(cut.text).toContain('The shears bite through the cord.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'fuse')).toBe('cut');
  });

  it('GH #241: without the shears the refusal names them', async () => {
    const b = await bootTurns(SOURCE);

    const refused = await b.turnText('cut the fuse');

    expect(refused.text).toContain('You need the shears to cut the fuse.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'fuse')).not.toBe('cut');
  });
});
