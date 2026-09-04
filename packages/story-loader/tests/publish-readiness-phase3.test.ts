/**
 * publish-readiness-phase3.test.ts — the REAL-path pins for publish-readiness
 * plan Phase 3, through the parser, the loader, and the engine:
 *
 * - GH #335 (P-5): `phrase <key> with <p> = <v> when <cond>` binds and
 *   evaluates — the phrase fires with its binding rendered only while the
 *   condition holds.
 * - GH #337 (P-6): `{bare item}` renders the bound entity's name with no
 *   article ("another pear").
 * - GH #285 (P-15): under a `directions` block with compass canonicals,
 *   `refuse when the direction is east` refuses and `{the direction}`
 *   prints the author's canonical word, not the platform constant.
 * - GH #336 (P-4): a possessive-named room works in a condition at run time.
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Phase Three
  authors:
    T
  id: phase-three-runtime
  story-version: 0.0.1

create the Weaponsmith's Stall
  a room
  states: calm, chaotic
  east to the Lookout

  Blades.

create the pear
  in the Weaponsmith's Stall

  A pear.

  after the player taking
    phrase lift-quietly with ware = the pear when the Weaponsmith's Stall is calm
    phrase another-one with ware = the pear when the Weaponsmith's Stall is chaotic
  end after

create the drum
  in the Weaponsmith's Stall

  A drum.

  after the player taking
    change the Weaponsmith's Stall to chaotic
  end after

create the Lookout
  a room

  A lookout.

define phrase lift-quietly
  You pocket {the ware} without a sound.
end phrase

define phrase another-one
  No one notices you picking up another {bare ware}.
end phrase

define action peering
  grammar
    peer the direction
  directions
    north or n
    northeast or ne
    east or e
  refuse when the direction is east: peer-where
  phrase peered-generic

define phrase peer-where
  Not that way.
end phrase

define phrase peered-generic
  You peer off {the direction}.
end phrase

create Jack
  a person
  playable
  starts in the Weaponsmith's Stall

  You.

before the game starts
  change the player to Jack
end before
`;

describe('Phase 3 on the real path', () => {
  it('GH #335 / #336: a `with … when …` phrase fires with its binding only while the possessive-named room’s state holds', async () => {
    const b = await bootTurns(SOURCE);

    const calm = await b.turnText('take pear');
    expect(calm.text).toContain('You pocket the pear without a sound.');
    expect(calm.text).not.toContain('another');

    await b.turnText('drop pear');
    await b.turnText('take drum');
    const chaotic = await b.turnText('take pear');
    expect(chaotic.text).not.toContain('without a sound');
    // GH #337: the `bare` hint renders "another pear", never "another a pear".
    expect(chaotic.text).toContain('No one notices you picking up another pear.');
  });

  it('GH #285: compass canonicals in a `directions` block compare and print as the author wrote them', async () => {
    const b = await bootTurns(SOURCE);

    const east = await b.turnText('peer e');
    expect(east.text).toContain('Not that way.');
    expect(east.text).not.toContain('You peer off');

    const northeast = await b.turnText('peer ne');
    expect(northeast.text).toContain('You peer off northeast.');
    expect(northeast.text).not.toContain('NORTHEAST');
  });
});
