/**
 * first-time-on-arrival.test.ts — GH #326 on the REAL path: a room's
 * `first time` prose renders in place of the standing description when the
 * room is first entered by going, through the real parser and going
 * action; the next arrival and every later `look` show the standing
 * description.
 *
 * Owner context: story-loader tests (publish-readiness Phase 2, P-2).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Street
  authors:
    T
  id: street
  story-version: 0.0.1

create the Eastern Junction
  a room
  east to Commerce Street

  A junction.

create Commerce Street
  a room
  first time
    You made it.

  Commerce Street, the chapter's way out.

create Jack
  a person
  playable
  starts in the Eastern Junction

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #326: `first time` renders on the first arrival by going', () => {
  it('the first arrival shows the first-time prose; later arrivals and looks show the standing description', async () => {
    const b = await bootTurns(SOURCE);

    const arrival = await b.turnText('east');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('commerce-street'));
    expect(arrival.text).toContain('You made it.');
    expect(arrival.text).not.toContain("the chapter's way out");

    const look = await b.turnText('look');
    expect(look.text).toContain("Commerce Street, the chapter's way out.");
    expect(look.text).not.toContain('You made it.');

    await b.turnText('west');
    const again = await b.turnText('east');
    expect(again.text).toContain("Commerce Street, the chapter's way out.");
    expect(again.text).not.toContain('You made it.');
  });
});
