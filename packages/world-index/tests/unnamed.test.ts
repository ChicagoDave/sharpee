/**
 * unnamed.test.ts — AC-13, the unnamed-tool finding.
 *
 * AC-13's demand is the whole point of these tests: each reported thing must be
 * confirmed absent from the prose by DIRECT search, not merely unreached by the
 * phrase extractor. Two of the cases below therefore assert a NON-finding on real
 * corpus entities the extractor never resolves — `winding-key` and `crowbar` are
 * both invisible to it, and both must stay off the list.
 *
 * The corpus figure is a pin in the same sense as D6b's: it moves when the rule
 * moves, and a diff here is the record of that.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D13, AC-13
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { buildDocument } from '../src/document.js';
import { collectProse } from '../src/prose.js';
import { deriveReach } from '../src/reach.js';
import { roleTable } from '../src/roles.js';
import { deriveUnnamedTools } from '../src/unnamed.js';
import { CORPUS, compileSource, compileStory, entity, faultable } from './corpus.js';

/** Run the finding the way `buildDocument` runs it. */
function unnamed(ir: StoryIR) {
  const reach = deriveReach(ir);
  return deriveUnnamedTools(ir, roleTable(ir, reach), collectProse(ir));
}

/** A two-room fixture with prose that names nothing in particular. */
const ROOMS = `story
  title: Unannounced
  authors:
    Test
  id: unannounced
  story-version: 1.0.0

create the Hall
  a room
  north to the Study

  A hall. A worn rug covers the boards.

create the Study
  a room

  A study.

create Alex
  a person
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before

`;

describe('D13 — a thing the mechanics need that nothing announces', () => {
  let fernhill: StoryIR;
  let alderman: StoryIR;
  let idesOfMarch: StoryIR;

  beforeAll(() => {
    fernhill = compileStory(CORPUS.fernhill);
    alderman = compileStory(CORPUS.alderman);
    idesOfMarch = compileStory(CORPUS.idesOfMarch);
  });

  // THE CORPUS PIN. Fernhill's doormat is scenery, so the standard room listing
  // passes over it, and no passage but its own says `doormat` or `mat` — the player
  // is told nothing. It is the one thing in three stories that survives both guards,
  // and that ratio is the finding's claim to being worth reading.
  it('reports the one thing in the corpus nothing tells the player about', () => {
    expect(unnamed(fernhill)).toEqual([
      {
        id: 'doormat',
        name: 'doormat',
        role: 'tool',
        room: 'fountain-court',
        vocabulary: expect.arrayContaining(['doormat', 'mat']),
      },
    ]);
    expect(unnamed(alderman)).toEqual([]);
    expect(unnamed(idesOfMarch)).toEqual([]);
  });

  // AC-13, THE GUARD ITSELF. `winding-key` is one of sixteen Fernhill things the
  // phrase extractor never resolves — an edge-only reading reports every one of them.
  // The prose says `winding`, `key` and `clock`, so a player has words that reach it,
  // and reporting it would report the extractor's recall as the author's hole.
  it('never reports a thing the prose names but the extractor misses', () => {
    const reach = deriveReach(fernhill);
    const edges = new Set(
      deriveUnnamedTools(fernhill, roleTable(fernhill, reach), collectProse(fernhill)).map((f) => f.id),
    );
    const document = buildDocument(fernhill, '0.0.0');

    // The premise: no resolved edge reaches it, so only the direct search can clear it.
    expect(document.incomplete.edges.some((edge) => edge.entity === 'winding-key')).toBe(false);
    expect(edges).not.toContain('winding-key');
  });

  // The second guard, on a real entity. `crowbar` is named by no passage but its own,
  // and the extractor never resolves it either — but it lies loose in the cellar, and
  // `looking` lists what sits in a room. Reporting it would report the platform.
  it('never reports what the room listing announces on its own', () => {
    const document = buildDocument(fernhill, '0.0.0');
    expect(document.incomplete.edges.some((edge) => edge.entity === 'crowbar')).toBe(false);
    expect(unnamed(fernhill).map((finding) => finding.id)).not.toContain('crowbar');
  });

  // FAULT INJECTION (the ADR's acceptance method): rename a thing to a word the story
  // never says, and the finding must name it.
  it('names a thing whose every word has gone out of the prose', () => {
    const faulted = faultable(fernhill);
    const key = entity(faulted, 'winding-key');
    key.name = 'zarquon';
    key.aka = [];

    const finding = unnamed(faulted).find((candidate) => candidate.id === 'winding-key');
    expect(finding).toMatchObject({ name: 'zarquon', role: 'tool', vocabulary: ['zarquon'] });
  });

  // THE SHARP CASE (D13 × D14). A thing ON the chain that nothing announces is not a
  // nag — it is a story that cannot be finished by reading. The role is what says so.
  it('marks a thing on the progression chain as the sharp case', () => {
    const faulted = faultable(fernhill);
    const door = entity(faulted, 'cellar-door');
    door.name = 'zarquon';
    door.aka = [];

    const finding = unnamed(faulted).find((candidate) => candidate.id === 'cellar-door');
    expect(finding).toMatchObject({ name: 'zarquon', role: 'progression-info' });
  });

  // A thing's OWN description is not how anyone learns it is there: reading it means
  // already being able to name it. The pair below differ in nothing else.
  it('does not let a thing announce itself', () => {
    const crate = (mention: string) => `${ROOMS}
create the crate
  a container
  openable
  in the Hall

  A nailed crate.${mention}

create the brass spanner
  in the crate

  A brass spanner.
`;
    const announced = compileSource(crate(' A brass spanner is somewhere inside it.'));
    const alone = compileSource(crate(''));

    expect(unnamed(announced).map((finding) => finding.id)).not.toContain('brass-spanner');
    expect(unnamed(alone).map((finding) => finding.id)).toContain('brass-spanner');
  });

  // THE REJECTIONS. Atmosphere is the residual D12 exists to keep out of this list;
  // rooms, regions and the player are not things anybody uses.
  it('reports nothing that is scenery with nothing to do, a place, or the player', () => {
    const story = compileSource(`${ROOMS}
create the zarquon frieze
  scenery
  in the Study

  A frieze.
`);

    const ids = unnamed(story).map((finding) => finding.id);
    expect(ids).not.toContain('zarquon-frieze');
    expect(ids).not.toContain('hall');
    expect(ids).not.toContain('study');
    expect(ids).not.toContain('player');
  });

  it('rides the wire as a list of its own, uncounted by Reach', () => {
    const document = buildDocument(fernhill, '0.0.0');
    expect(document.unnamedTools).toEqual(unnamed(fernhill));
    // Fernhill is AC-1's clean story and stays clean: this finding is Reach-adjacent,
    // never a Reach finding, because a story can be perfectly reachable and still
    // leave a thing the player is never told about.
    expect(document.reach.findingCount).toBe(0);
    expect(document.unnamedTools.length).toBeGreaterThan(0);
  });
});
