/**
 * Tests for `handleAboutDisplayed`.
 *
 * Post-refactor (session 2026-05-12): ABOUT emits the structured
 * banner via the shared `buildBannerBlocks` helper — one block per
 * semantically-classed piece, no `\n` in any block's content.
 *
 * @see packages/engine/src/prose-pipeline/handlers/banner.ts
 * @see ADR-174 §Engine-internal prose pipeline
 */

import { describe, it, expect } from 'vitest';
import { handleAboutDisplayed } from '../../../src/prose-pipeline/handlers/about';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

describe('handleAboutDisplayed', () => {
  it('emits the structured banner: game-title, story-version, platform-version, sub-title, author-list, banner-spacer', () => {
    const event = makeEvent('if.event.about_displayed', {
      params: {
        title: 'Dungeon',
        version: '1.0.0',
        buildDate: '2026-05-12T00:00:00Z',
        description: 'A port of Mainframe Zork (1981)',
        author: 'Dave Lebling',
        engineVersion: '0.9.113',
      },
    });

    const blocks = handleAboutDisplayed(event, makeContext());

    const classes = blocks.map((b) => b.className);
    expect(classes).toEqual([
      'game-title',
      'story-version',
      'platform-version',
      'sub-title',
      'author-list',
      'banner-spacer',
    ]);
    expect(blocks.every((b) => b.key === 'about.text')).toBe(true);
  });

  it('uses `credits` array when provided, one author-list block per entry', () => {
    const event = makeEvent('if.event.about_displayed', {
      params: {
        title: 'Dungeon',
        version: '1.0.0',
        engineVersion: '0.9.113',
        credits: [
          'By Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling',
          'Ported by David Cornelson',
        ],
      },
    });

    const blocks = handleAboutDisplayed(event, makeContext());

    const authorBlocks = blocks.filter((b) => b.className === 'author-list');
    expect(authorBlocks).toHaveLength(2);
    expect(authorBlocks[0].content).toEqual([
      'By Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling',
    ]);
    expect(authorBlocks[1].content).toEqual(['Ported by David Cornelson']);
  });

  it('falls back to `By {author}` when credits are absent', () => {
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'Game', author: 'Author Name', version: '1.0.0' },
    });

    const blocks = handleAboutDisplayed(event, makeContext());

    const authorBlocks = blocks.filter((b) => b.className === 'author-list');
    expect(authorBlocks).toHaveLength(1);
    expect(authorBlocks[0].content).toEqual(['By Author Name']);
  });

  it('appends `game.banner.story-tail` template when registered', () => {
    const provider = makeProvider({
      'game.banner.story-tail': 'Type HELP for instructions.',
    });
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'Dungeon', version: '1.0.0' },
    });

    const blocks = handleAboutDisplayed(event, makeContext(provider));

    const last = blocks[blocks.length - 1];
    expect(last.content).toEqual(['Type HELP for instructions.']);
    expect(last.className).toBeUndefined();
  });

  it('returns an empty array when params are empty', () => {
    const event = makeEvent('if.event.about_displayed', {});

    const blocks = handleAboutDisplayed(event, makeContext());

    expect(blocks).toEqual([]);
  });
});
