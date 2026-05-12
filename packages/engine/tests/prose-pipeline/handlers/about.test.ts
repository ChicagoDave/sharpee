/**
 * Tests for `handleAboutDisplayed` — ported from text-service.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

import { describe, it, expect } from 'vitest';
import { handleAboutDisplayed } from '../../../src/prose-pipeline/handlers/about';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

describe('handleAboutDisplayed', () => {
  it('should resolve banner template with story params', () => {
    const provider = makeProvider({
      'game.started.banner': '{title} by {author}',
    });
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'Dungeon', author: 'Dave Lebling' },
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
    expect(blocks[0].content[0]).toContain('(engine=)');
  });

  it('should fall back to title/author as two blocks (tight) when provider echoes key', () => {
    const provider = makeProvider({});
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'My Game', author: 'An Author' },
    });

    const blocks = handleAboutDisplayed(event, makeContext(provider));

    expect(blocks).toHaveLength(2);
    expect(blocks[0].key).toBe('about.text');
    expect(blocks[0].content).toEqual(['My Game']);
    expect(blocks[0].tight).toBeUndefined();
    expect(blocks[1].key).toBe('about.text');
    expect(blocks[1].content).toEqual(['By An Author']);
    expect(blocks[1].tight).toBe(true);
  });

  it('should fall back to title/author as two blocks when no provider', () => {
    const event = makeEvent('if.event.about_displayed', {
      params: { title: 'My Game', author: 'An Author' },
    });

    const blocks = handleAboutDisplayed(event, makeContext());

    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toEqual(['My Game']);
    expect(blocks[1].content).toEqual(['By An Author']);
    expect(blocks[1].tight).toBe(true);
  });

  it('should use Unknown defaults as two blocks when params are empty', () => {
    const event = makeEvent('if.event.about_displayed', {});

    const blocks = handleAboutDisplayed(event, makeContext());

    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toEqual(['Unknown']);
    expect(blocks[1].content).toEqual(['By Unknown']);
    expect(blocks[1].tight).toBe(true);
  });
});
