/**
 * Tests for `handleGameStarted`.
 *
 * Post-refactor (session 2026-05-12): emits the structured banner via
 * `buildBannerBlocks`. One block per semantically-classed piece; no
 * single multi-line template resolution.
 *
 * @see ADR-097 IGameEvent Deprecation
 * @see ADR-174 §Engine-internal prose pipeline
 * @see packages/engine/src/prose-pipeline/handlers/banner.ts
 */

import { describe, it, expect } from 'vitest';
import { handleGameStarted } from '../../../src/prose-pipeline/handlers/game';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

describe('handleGameStarted', () => {
  it('emits structured banner pieces with semantic classNames', () => {
    const event = makeEvent('game.started', {
      story: {
        title: 'Dungeon',
        author: 'Dave Lebling',
        version: '2.0',
        id: 'dungeo',
        description: 'A port of Mainframe Zork (1981)',
      },
      engineVersion: '0.9.113',
    });

    const blocks = handleGameStarted(event, makeContext());

    expect(blocks.map((b) => b.className)).toEqual([
      'game-title',
      'story-version',
      'platform-version',
      'sub-title',
      'author-list',
      'banner-spacer',
    ]);
    expect(blocks.every((b) => b.key === 'game.banner')).toBe(true);
    expect(blocks[0].content).toEqual(['Dungeon']);
    expect(blocks[2].content).toEqual(['Sharpee v0.9.113']);
  });

  it('includes the build date in the story-version line when present', () => {
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

    const blocks = handleGameStarted(event, makeContext());
    const versionBlock = blocks.find((b) => b.className === 'story-version');
    expect(versionBlock?.content[0]).toBe('Story v1.0 (built 2026-04-11)');
  });

  it('emits one author-list block per credits[] entry', () => {
    const event = makeEvent('game.started', {
      story: {
        title: 'Dungeon',
        author: 'Tim, Marc, Bruce, Dave',
        credits: ['By Tim, Marc, Bruce, Dave', 'Ported by David Cornelson'],
        version: '1.0',
        id: 'test',
      },
      engineVersion: '0.9.113',
    });

    const blocks = handleGameStarted(event, makeContext());
    const authors = blocks.filter((b) => b.className === 'author-list');
    expect(authors).toHaveLength(2);
    expect(authors[0].content).toEqual(['By Tim, Marc, Bruce, Dave']);
    expect(authors[1].content).toEqual(['Ported by David Cornelson']);
  });

  it('appends `game.banner.story-tail` after the spacer when registered', () => {
    const provider = makeProvider({
      'game.banner.story-tail': 'Type HELP for instructions, ABOUT for credits.',
    });
    const event = makeEvent('game.started', {
      story: { title: 'Dungeon', version: '1.0', id: 'test' },
      engineVersion: '0.9.113',
    });

    const blocks = handleGameStarted(event, makeContext(provider));

    const last = blocks[blocks.length - 1];
    expect(last.content).toEqual([
      'Type HELP for instructions, ABOUT for credits.',
    ]);
    expect(last.className).toBeUndefined();

    const secondToLast = blocks[blocks.length - 2];
    expect(secondToLast.className).toBe('banner-spacer');
  });

  it('returns empty when no story data', () => {
    const event = makeEvent('game.started', {});
    expect(handleGameStarted(event, makeContext())).toEqual([]);
  });

  it('skips banner-spacer when no pieces emit (all fields missing)', () => {
    const event = makeEvent('game.started', { story: { id: 'test' } });
    const blocks = handleGameStarted(event, makeContext());
    expect(blocks).toEqual([]);
  });
});
