/**
 * closed-container-contents.test.ts — load-time placement into CLOSED
 * containers (David-approved loader fix, 2026-07-18). Placement is world
 * construction: it rides AuthorModel.moveEntity, which bypasses the runtime
 * containment rules — so a `.story` can author the classic closed trunk
 * with the clue inside. Regression: the silent world.moveEntity drop left
 * such contents nowhere (getLocation undefined) with no diagnostic.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const SOURCE = `story "Closed Box" by "T"
  id: closed-box
  version: 0.0.1

create the Attic
  a room

  Dust and one box.

create the strongbox
  a container
  openable
  in the Attic

  A closed strongbox.

create the letter
  in the strongbox

  The hidden letter.

create the player
  starts in the Attic

  You.
`;

describe('load-time contents of a closed container', () => {
  it('places the letter INSIDE the closed strongbox (AuthorModel construction path)', () => {
    const result = compile(SOURCE);
    expect(result.diagnostics).toEqual([]);
    const story = createStory(result.ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);

    const boxId = story.entityId('strongbox')!;
    const letterId = story.entityId('letter')!;
    // The mutation under test: the letter's location IS the closed box.
    expect(world.getLocation(letterId)).toBe(boxId);
    expect(world.getContents(boxId).map((e) => e.id)).toContain(letterId);
  });
});
