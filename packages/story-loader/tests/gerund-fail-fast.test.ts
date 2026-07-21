/**
 * gerund-fail-fast.test.ts — ADR-228 D5: the loader rejects `on <gerund>
 * it` clauses nothing will ever consult, at load time, instead of letting
 * them register and silently die. The valid set is stdlib's wired-action
 * registry (derived from the descriptor table) plus author-owned surfaces
 * (dispatch `after` reactions, `define action X from` hatches).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function loadStory(source: string): { story: ChordStory; world: WorldModel } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  return { story, world };
}

const PRODDING_ACTION = `define action prodding
  grammar
    prod :thing
  refuse without thing: prod-what
  otherwise refuse cant-prod

  phrases en-US
    prod-what:
      Prod what?
    cant-prod:
      Best not.
`;

const storyWith = (body: string) => `story "Gate" by "T"
  id: gate
  version: 0.0.1

define phrase nope
  Not a chance.
end phrase

${body}

create the player
  starts in the Shed

  You.
`;

describe('D5 gerund fail-fast (ADR-228)', () => {
  it('rejects an entity clause whose gerund no standard action consults', () => {
    const source = storyWith(`create the Shed
  a room

  A shed.

create the biscuit
  in the Shed

  A biscuit.

  on tasting it
    phrase nope
  end on`);
    expect(() => loadStory(source)).toThrowError(LoadError);
    expect(() => loadStory(source)).toThrowError(/no standard action consults `if\.action\.tasting`/);
  });

  it('rejects lowering/raising with the pointed capability-dispatch message', () => {
    const source = storyWith(`create the Shed
  a room

  A shed.

create the basket
  in the Shed

  A basket.

  on lowering it
    phrase nope
  end on`);
    expect(() => loadStory(source)).toThrowError(/full-delegation capability action/);
  });

  it('rejects a trait clause whose gerund no standard action consults', () => {
    const source = storyWith(`define trait lickable
  on tasting it
    phrase nope
  end on
end trait

create the Shed
  a room

  A shed.

create the lolly
  lickable
  in the Shed

  A lolly.`);
    expect(() => loadStory(source)).toThrowError(/no standard action consults `if\.action\.tasting`/);
  });

  it('rejects an entity `on` clause naming a dispatch action, pointing to traits/after', () => {
    const source = storyWith(`${PRODDING_ACTION}
create the Shed
  a room

  A shed.

create the badger
  in the Shed

  A badger.

  on prodding it
    phrase nope
  end on`);
    expect(() => loadStory(source)).toThrowError(/dispatch action/);
    expect(() => loadStory(source)).toThrowError(/Move the clause into a trait/);
  });

  it('still loads dispatch `after` reactions (fireAfterClauses path)', () => {
    const source = storyWith(`${PRODDING_ACTION}
create the Shed
  a room

  A shed.

create the badger
  in the Shed

  A badger.

  after prodding it
    phrase nope
  end after`);
    const { story, world } = loadStory(source);
    // The reaction fires via fireAfterClauses, so no interceptor target is
    // prepared: the badger must NOT carry the chord.behavior marker trait.
    const badger = world.getEntity(story.entityId('badger')!)!;
    expect(badger.has('chord.behavior')).toBe(false);
  });

  it('still loads consulted-gerund clauses and event-trigger clauses', () => {
    const source = storyWith(`create the Shed
  a room

  A shed.

  after entering it
    phrase nope
  end after

create the note
  in the Shed

  A note.

  on reading it
    phrase nope
  end on

  after taking it
    phrase nope
  end after`);
    const { story, world } = loadStory(source);
    // Consulted gerunds bind as interceptors: the target is prepared with
    // the chord.behavior marker trait.
    const note = world.getEntity(story.entityId('note')!)!;
    expect(note.has('chord.behavior')).toBe(true);
  });
});
