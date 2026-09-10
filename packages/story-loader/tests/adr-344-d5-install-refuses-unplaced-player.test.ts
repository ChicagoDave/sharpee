/**
 * adr-344-d5-install-refuses-unplaced-player.test.ts — the install seam is
 * where an unplaced protagonist is caught, now that the loader has no
 * first-declared-room fallback to hide one.
 *
 * The loader half of this rule is asserted in `adr-289-d4-player.test.ts`
 * (the holder is left unplaced). This file asserts the consequence an author
 * actually meets: a Chord story whose protagonist has no placement line
 * fails `installStory` with the `unplaced` reason, naming the character —
 * instead of booting into whichever room happened to be declared first.
 *
 * Public interface: none (test module).
 * Owner context: story-loader tests — the Chord-source side of the engine's
 * `validate-role-holder` install step.
 */
import { describe, expect, it } from 'vitest';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const ROOMS = `create the Hall
  a room

  A hall.

create the Kitchen
  a room

  A kitchen.
`;

/**
 * Install a Chord source into a real engine.
 *
 * @param source - Chord source
 * @returns the world the install built, for post-install assertions
 * @throws whatever the install steps throw — the point of these tests
 */
function install(source: string): WorldModel {
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const engine = new GameEngine({ world, parser, language, config: { seed: 42 } });
  engine.installStory(createStory(compileSource(source), { seed: 42 }));
  return world;
}

/** A protagonist whose `create` block carries the given placement line (or none). */
const storyWithPlacement = (placement: string) => `${HEADER}${ROOMS}
create Alex
  a person
  playable
${placement ? `  ${placement}\n` : ''}
  You.

before the game starts
  change the player to Alex
end before

`;

describe('ADR-344 D5 — an unplaced protagonist fails installation', () => {
  it('refuses a Chord story whose protagonist has no placement line', () => {
    let caught: unknown;
    try {
      install(storyWithPlacement(''));
    } catch (error) {
      caught = error;
    }

    expect(caught, 'the install refused').toBeInstanceOf(Error);
    // `reason` is the structured branch point the step carries so tests do
    // not match prose (ADR-344 D1).
    expect((caught as { reason?: string }).reason).toBe('unplaced');
    expect((caught as { entityName?: string }).entityName).toBe('Alex');
    expect((caught as Error).message).toContain('nowhere to play');
  });

  it('installs the same story once the protagonist is placed, in the room the author wrote', () => {
    const world = install(storyWithPlacement('in the Kitchen'));
    const player = world.getPlayer()!;
    const room = world.getEntity(world.getLocation(player.id)!)!;
    expect(room.name).toBe('Kitchen');
  });

  it('does not silently start the protagonist in the first declared room', () => {
    // The regression this rule exists for: `Hall` is declared first, so the
    // removed fallback would have made the unplaced case above succeed here.
    expect(() => install(storyWithPlacement(''))).toThrow(/nowhere to play/);
    const world = install(storyWithPlacement('starts in the Kitchen'));
    const player = world.getPlayer()!;
    expect(world.getEntity(world.getLocation(player.id)!)!.name).toBe('Kitchen');
  });
});
