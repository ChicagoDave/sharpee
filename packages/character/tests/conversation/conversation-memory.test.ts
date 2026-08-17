/**
 * Conversation memory tests (ADR-320 D4/D6/D9; Phase 5) — per-pair
 * records mutate through the access, and the word curves classify off
 * clock-seam turns (numbers in, words out; ADR-310 D6).
 */

import { describe, it, expect } from 'vitest';
import {
  createMapMemoryAccess,
  recordSceneClosed,
  recordTopicDiscussed,
  recordAsked,
  wasDiscussed,
  boundaryKindOnOpen,
  recencyWordFor,
  absenceWordFor,
  askedWordFor,
} from '../../src/conversation';

describe('per-pair records', () => {
  it('recordSceneClosed increments visits and stamps the close turn', () => {
    const access = createMapMemoryAccess();
    recordSceneClosed(access, 'npc-kemp', 'pc', 10);
    recordSceneClosed(access, 'npc-kemp', 'pc', 15);

    const memory = access.get('npc-kemp', 'pc');
    expect(memory?.visits).toBe(2);
    expect(memory?.lastSceneClosedTurn).toBe(15);
  });

  it('each side holds its own view — pairs are ordered', () => {
    const access = createMapMemoryAccess();
    recordSceneClosed(access, 'npc-kemp', 'pc', 10);
    expect(access.get('pc', 'npc-kemp')).toBeUndefined();
  });

  it('recordTopicDiscussed appends once (set semantics) and wasDiscussed reads it', () => {
    const access = createMapMemoryAccess();
    recordTopicDiscussed(access, 'npc-kemp', 'pc', 'the-play-book');
    recordTopicDiscussed(access, 'npc-kemp', 'pc', 'the-play-book');

    expect(access.get('npc-kemp', 'pc')?.discussedTopics).toEqual(['the-play-book']);
    expect(wasDiscussed(access, 'npc-kemp', 'pc', 'the-play-book')).toBe(true);
    expect(wasDiscussed(access, 'npc-kemp', 'pc', 'the-globe')).toBe(false);
  });

  it('recordAsked counts per topic', () => {
    const access = createMapMemoryAccess();
    recordAsked(access, 'npc-kemp', 'pc', 'wages');
    recordAsked(access, 'npc-kemp', 'pc', 'wages');
    recordAsked(access, 'npc-kemp', 'pc', 'the-globe');

    expect(access.get('npc-kemp', 'pc')?.askedCounts).toEqual({ wages: 2, 'the-globe': 1 });
  });

  it('boundaryKindOnOpen: first-meeting with no completed scene, return after', () => {
    const access = createMapMemoryAccess();
    expect(boundaryKindOnOpen(access, 'npc-kemp', 'pc')).toBe('first-meeting');
    recordSceneClosed(access, 'npc-kemp', 'pc', 10);
    expect(boundaryKindOnOpen(access, 'npc-kemp', 'pc')).toBe('return');
  });
});

describe('word curves (runtime-owned)', () => {
  it('recency ages fresh → recent → stale', () => {
    expect(recencyWordFor(10, 10)).toBe('fresh');
    expect(recencyWordFor(11, 10)).toBe('fresh');
    expect(recencyWordFor(12, 10)).toBe('recent');
    expect(recencyWordFor(18, 10)).toBe('recent');
    expect(recencyWordFor(19, 10)).toBe('stale');
  });

  it('absence ages again-so-soon → after-a-while → after-days; undefined with no history', () => {
    expect(absenceWordFor(10, undefined)).toBeUndefined();
    expect(absenceWordFor(12, 10)).toBe('again-so-soon');
    expect(absenceWordFor(14, 10)).toBe('after-a-while');
    expect(absenceWordFor(41, 10)).toBe('after-days');
  });

  it('asked counts read once / again / many-times; undefined when never asked', () => {
    expect(askedWordFor(0)).toBeUndefined();
    expect(askedWordFor(1)).toBe('once');
    expect(askedWordFor(2)).toBe('again');
    expect(askedWordFor(3)).toBe('many-times');
    expect(askedWordFor(7)).toBe('many-times');
  });
});
