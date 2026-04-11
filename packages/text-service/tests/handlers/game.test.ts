/**
 * Tests for handleGameStarted handler
 *
 * Verifies banner generation from game.started events
 * using language provider template resolution.
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-097 IGameEvent Deprecation
 */

import { describe, it, expect } from 'vitest';
import { handleGameStarted } from '../../src/handlers/game.js';
import { makeEvent, makeProvider, makeContext } from '../test-helpers.js';

describe('handleGameStarted', () => {
  it('should produce a banner block from language provider template', () => {
    const provider = makeProvider({
      'game.started.banner': '{title} by {author} (v{version})',
    });
    const event = makeEvent('game.started', {
      story: {
        title: 'Dungeon',
        author: 'Dave Lebling',
        version: '2.0',
        id: 'dungeo',
      },
    });

    const blocks = handleGameStarted(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('game.banner');
    expect(blocks[0].content).toEqual(['Dungeon by Dave Lebling (v2.0)']);
  });

  it('should include engineVersion and buildDate in params', () => {
    const provider = makeProvider({
      'game.started.banner': (params) => {
        const p = params as Record<string, string>;
        return `${p?.title} | Engine: ${p?.engineVersion} | Built: ${p?.buildDate}`;
      },
    });
    const event = makeEvent('game.started', {
      story: {
        title: 'Dungeon',
        author: 'Unknown',
        version: '1.0',
        id: 'test',
        buildDate: '2026-04-11T12:00:00Z',
      },
      engineVersion: '0.9.107',
    });

    const blocks = handleGameStarted(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content[0]).toContain('Engine: 0.9.107');
    expect(blocks[0].content[0]).toContain('Built: 2026-04-11');
  });

  it('should return empty when no story data', () => {
    const provider = makeProvider({
      'game.started.banner': '{title}',
    });
    const event = makeEvent('game.started', {});

    const blocks = handleGameStarted(event, makeContext(provider));

    expect(blocks).toHaveLength(0);
  });

  it('should return empty when provider echoes the template key', () => {
    const provider = makeProvider({}); // echoes all keys
    const event = makeEvent('game.started', {
      story: { title: 'Test', author: 'Author', version: '1.0', id: 'test' },
    });

    const blocks = handleGameStarted(event, makeContext(provider));

    expect(blocks).toHaveLength(0);
  });

  it('should return empty when no language provider', () => {
    const event = makeEvent('game.started', {
      story: { title: 'Test', author: 'Author', version: '1.0', id: 'test' },
    });

    const blocks = handleGameStarted(event, makeContext());

    expect(blocks).toHaveLength(0);
  });

  it('should use defaults for missing story fields', () => {
    const provider = makeProvider({
      'game.started.banner': '{title} by {author}',
    });
    const event = makeEvent('game.started', {
      story: { id: 'test' },
    });

    const blocks = handleGameStarted(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Unknown by Unknown']);
  });
});
