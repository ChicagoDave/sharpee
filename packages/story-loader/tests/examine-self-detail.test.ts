/**
 * examine-self-detail.test.ts — GH #325 on the REAL path: examining the
 * player (`x me`, or the playable character by name) renders the
 * character's `phrase detail while …` lines exactly as examining any other
 * person does — the state-gated detail follows the description once the
 * state holds, and is absent before.
 *
 * Owner context: story-loader tests (publish-readiness Phase 2, P-12).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Mirror
  authors:
    T
  id: mirror
  story-version: 0.0.1

create the Stall
  a room

  A stall.

create Jack
  a person, proper
  playable
  starts in the Stall
  states: urchin, dressed

  Jack Toresal, a boy in this market.

  phrase detail while Jack is dressed:
    Jack in the dress and the fashionable hat, boots underneath.

create the dress
  wearable
  in the Stall

  A dress.

  after the player taking
    change Jack to dressed
  end after

before the game starts
  change the player to Jack
end before
`;

describe('GH #325: `x me` renders the player’s own detail lines', () => {
  it('shows the detail line once its state holds, on `x me` and by name', async () => {
    const b = await bootTurns(SOURCE);

    const before = await b.turnText('x me');
    expect(before.text).toContain('Jack Toresal, a boy in this market.');
    expect(before.text).not.toContain('boots underneath');

    await b.turnText('take dress');

    const me = await b.turnText('x me');
    expect(me.text).toContain('Jack Toresal, a boy in this market.');
    expect(me.text).toContain('Jack in the dress and the fashionable hat, boots underneath.');

    const byName = await b.turnText('x jack');
    expect(byName.text).toContain('Jack in the dress and the fashionable hat, boots underneath.');
  });
});
