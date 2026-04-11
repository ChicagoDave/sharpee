/**
 * Tests for handleAboutDisplayed handler
 *
 * Verifies about text generation using the same banner template
 * as game.started, with fallback to title/author format.
 *
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { handleAboutDisplayed } from '../../src/handlers/about.js';
import { makeEvent, makeProvider, makeContext } from './test-helpers.js';

describe('handleAboutDisplayed', () => {
  it('should resolve banner template with story params', () => {
    const provider = makeProvider({
      'game.started.banner': '{title} by {author}',
    });
    const event = makeEvent('if.event.about_displayed', {
      params: {
        title: 'Dungeon',
        author: 'Dave Lebling',
      },
    });

    const blocks = handleAboutDisplayed(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('about.text');
    expect(blocks[0].content).toEqual(['Dungeon by Dave Lebling']);
  });

  it('should supply default empty strings for engine/build params', () => {
    const provider = makeProvider({
      'game.started.banner': (params) => {
        const p = params as Record<string, string>;
        return `${p?.title} (engine=${p?.engineVersion})`;
      },
    });
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'Test Game' },
    });

    const blocks = handleAboutDisplayed(event, makeContext(provider));

    expect(blocks[0].content[0]).toContain('Test Game');
    // engineVersion defaults to '' when about handler supplies it
    expect(blocks[0].content[0]).toContain('(engine=)');
  });

  it('should fall back to title/author format when provider echoes key', () => {
    const provider = makeProvider({}); // echoes all keys
    const event = makeEvent('if.event.about_displayed', {
      params: {
        title: 'My Game',
        author: 'An Author',
      },
    });

    const blocks = handleAboutDisplayed(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('about.text');
    expect(blocks[0].content).toEqual(['My Game\nBy An Author']);
  });

  it('should fall back to title/author format when no provider', () => {
    const event = makeEvent('if.event.about_displayed', {
      params: {
        title: 'My Game',
        author: 'An Author',
      },
    });

    const blocks = handleAboutDisplayed(event, makeContext());

    expect(blocks[0].content).toEqual(['My Game\nBy An Author']);
  });

  it('should use Unknown defaults when params are empty', () => {
    const event = makeEvent('if.event.about_displayed', {});

    const blocks = handleAboutDisplayed(event, makeContext());

    expect(blocks[0].content).toEqual(['Unknown\nBy Unknown']);
  });
});
