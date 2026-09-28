/**
 * unlisted-holder.test.ts — the `unlisted` adjective on the REAL path: a
 * scenery supporter whose prose describes its wares prints no "On the … you
 * see …" line when the room is looked at, while the ware on it stays in
 * scope — examinable and takeable — and a holder without the word still
 * lists. Through the loader, the real parser, language layer, prose
 * pipeline and `GameEngine.executeTurn`; no doubles.
 *
 * Owner context: story-loader tests (the Secret Letter stall displays,
 * 2026-09-06: the 2009 game never listed a display's wares).
 */
import { describe, expect, it } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Unlisted
  authors:
    T
  id: unlisted
  story-version: 0.0.1

create the Rope Stall
  a room

  Rope everywhere.

create the rope wares
  aka display
  scenery, a supporter, plural, unlisted
  in the Rope Stall

  It's all rope, and lots of it.

create the length of rope
  aka rope
  on the rope wares

  Five feet of rope.

create the bench
  scenery, a supporter
  in the Rope Stall

  A bench.

create the hat
  on the bench

  A hat.

create Jack
  a person, playable
  in the Rope Stall

  You.

before the game starts
  change the player to Jack
end before
`;

const textOf = (b: ITextBlock): string => b.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('');

describe('`unlisted` — the holder\'s prose is the listing', () => {
  it('a look lists the bench\'s hat and never the display\'s rope; the rope is still examinable and takeable', async () => {
    const b = await bootTurns(SOURCE);
    const blocks: ITextBlock[] = [];
    b.engine.on('text:output', (out) => blocks.push(...out));

    await b.turn('look');
    const looked = blocks.map(textOf).join('\n');
    expect(looked).toContain('On the bench you see a hat.');
    expect(looked).not.toContain('On the rope wares');
    expect(looked).not.toContain('length of rope');

    // Examining the display: its prose, and no contents line either.
    blocks.length = 0;
    await b.turn('x display');
    const examinedDisplay = blocks.map(textOf).join('\n');
    expect(examinedDisplay).toContain("It's all rope, and lots of it.");
    expect(examinedDisplay).not.toContain('you see');
    expect(examinedDisplay).not.toContain('length of rope');
    // Examining the bench still lists its hat.
    blocks.length = 0;
    await b.turn('x bench');
    expect(blocks.map(textOf).join('\n')).toContain('hat');

    blocks.length = 0;
    await b.turn('x rope');
    expect(blocks.map(textOf).join('\n')).toContain('Five feet of rope.');

    blocks.length = 0;
    await b.turn('take rope');
    expect(b.world.getLocation(b.story.entityId('length-of-rope')!)).toBe(b.player.id);
  });
});
