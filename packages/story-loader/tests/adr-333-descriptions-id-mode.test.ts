/**
 * adr-333-descriptions-id-mode.test.ts — ADR-333 D1a (AC-2a) on the REAL path:
 * a Chord entity carries its description KEY (ADR-107 id mode) and no literal
 * text; the first-arrival block names the room's registered first-time key,
 * a later look names its description key with the snippet spliced, `x <thing>`
 * and `x me` name the thing's key. Keys are read from the loader's own
 * registration, never guessed. No doubles: the loader's real binding, the real
 * parser, language layer and prose pipeline, `GameEngine.executeTurn`.
 *
 * Owner context: story-loader tests (ADR-333 Phase 2).
 */
import { describe, expect, it } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import { IdentityTrait, RoomTrait, TraitType } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Id Mode
  authors:
    T
  id: id-mode
  story-version: 0.0.1

create the Alley
  a room
  north to the Market

  A quiet alley.

create the Market
  a room
  south to the Alley
  first time
    Stalls crowd the square, for the first time.

  Stalls crowd the square{note}.

create the dress
  in the Market

  A silk dress the colour of midnight.

create Jack
  a person, playable
  in the Alley

  A boy in this market.

before the game starts
  change the player to Jack
end before

define phrase note
  and a kettle whistles somewhere
end phrase
`;

const textOf = (b: ITextBlock): string =>
  b.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('');

describe('ADR-333 D1a — descriptions through the id mode, real path', () => {
  it('traits carry keys, blocks carry the entity\'s key, and the text is the registered template', async () => {
    const b = await bootTurns(SOURCE);
    const template = (id: string) => b.engine.getLanguageProvider()!.getTemplate!(id);
    const blocks: ITextBlock[] = [];
    b.engine.on('text:output', (out) => blocks.push(...out));
    const sourcesOf = (needle: string) =>
      blocks.filter((x) => textOf(x).includes(needle)).map((x) => x.source);

    // The traits: keys bound, literal text absent (AC-2a).
    const market = b.world.getEntity(b.id('market'))!;
    const marketIdentity = market.get(TraitType.IDENTITY) as IdentityTrait;
    const marketRoom = market.get(TraitType.ROOM) as RoomTrait;
    const dress = b.world.getEntity(b.id('dress'))!.get(TraitType.IDENTITY) as IdentityTrait;
    expect(marketIdentity.descriptionId).toBe('market.description');
    expect(marketIdentity.description).toBe('');
    expect(marketRoom.initialDescriptionId).toBe('market.initial-description');
    expect(marketRoom.initialDescription).toBeUndefined();
    expect(dress.descriptionId).toBe('dress.description');
    expect(dress.description).toBe('');
    // The registered template is the author's text; a room's marker is rewritten to the snippet form.
    expect(template('market.description')).toBe('Stalls crowd the square{snippet:note}.');
    expect(template('dress.description')).toBe('A silk dress the colour of midnight.');

    // First arrival: the first-time key.
    await b.turn('north');
    expect(sourcesOf('for the first time')).toEqual([{ messageId: marketRoom.initialDescriptionId }]);

    // A later look: the description key, the snippet spliced.
    blocks.length = 0;
    await b.turn('look');
    const looked = blocks.filter((x) => textOf(x).includes('Stalls crowd the square'));
    expect(looked).toHaveLength(1);
    expect(looked[0].source).toEqual({ messageId: marketIdentity.descriptionId });
    expect(textOf(looked[0])).toContain('and a kettle whistles somewhere');
    expect(textOf(looked[0])).not.toContain('{');

    // Examining: the thing's key, the text byte for byte.
    blocks.length = 0;
    await b.turn('x dress');
    const examined = blocks.filter((x) => textOf(x).includes('silk dress'));
    expect(examined).toHaveLength(1);
    expect(examined[0].source).toEqual({ messageId: dress.descriptionId });
    expect(textOf(examined[0])).toBe('A silk dress the colour of midnight.');

    // Examining yourself rides the same rule.
    blocks.length = 0;
    await b.turn('x me');
    const jack = b.player.get(TraitType.IDENTITY) as IdentityTrait;
    expect(jack.descriptionId).toBe('jack.description');
    expect(sourcesOf('A boy in this market.')).toEqual([{ messageId: 'jack.description' }]);
  });
});
