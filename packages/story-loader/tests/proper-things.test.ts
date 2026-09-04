/**
 * proper-things.test.ts — GH #342: `proper` composes on any create block
 * (ADR-242 D1 extended, David 2026-08-30), and the loader gives a proper
 * THING the same identity shape a proper person gets — `properName: true,
 * article: ''` — so stdlib defaults render "Grubber's Market", never
 * "the Grubber's Market". REAL-PATH: real compile, real loader.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { IdentityTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const SOURCE = `story
  title: Names
  authors:
    T
  id: names
  story-version: 0.0.1

create the Yard
  a room

  A yard.

create Grubber's Market
  scenery, proper
  aka market
  in the Yard

  The market is bustling.

create the gates
  scenery, plural
  in the Yard

  Gates.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;

describe('`proper` on things (GH #342, REAL-PATH)', () => {
  const load = () => {
    const story = createStory(compileSource(SOURCE), { seed: 3 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    // Look up by display name — a possessive name's IR slug is the
    // compiler's business, not this test's.
    const identity = (name: string) => {
      const entity = world.getAllEntities().find((e) => e.name === name)!;
      return entity.get(TraitType.IDENTITY) as IdentityTrait;
    };
    return { identity };
  };

  it('a proper scenery thing loads with the proper-name shape', () => {
    const { identity } = load();
    const market = identity("Grubber's Market");
    expect(market.properName).toBe(true);
    expect(market.article).toBe('');
  });

  it('an unmarked thing keeps the trait defaults', () => {
    const { identity } = load();
    const gates = identity('gates');
    expect(gates.properName).toBe(false);
    expect(gates.article).not.toBe('');
  });
});
