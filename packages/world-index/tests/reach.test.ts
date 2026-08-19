/**
 * reach.test.ts — AC-1 through AC-5 of ADR-321.
 *
 * Every test here runs against a real story compiled from its own source. The
 * clean cases assert the corpus reports nothing; the fault cases write one known
 * fault into a private copy of the IR and assert the analyzer names it. A clean
 * assertion on its own could pass with the check switched off, so each obstacle
 * class is proved in both directions: silent when the story is sound, and loud
 * when it is not.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 AC-1..AC-5, D4
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { deriveReach } from '../src/reach.js';
import { CORPUS, compileStory, entity, faultable } from './corpus.js';

let fernhill: StoryIR;
let alderman: StoryIR;
let idesOfMarch: StoryIR;

beforeAll(() => {
  fernhill = compileStory(CORPUS.fernhill);
  alderman = compileStory(CORPUS.alderman);
  idesOfMarch = compileStory(CORPUS.idesOfMarch);
});

describe('AC-1 — the corpus is clean unmodified', () => {
  it('reports no Reach findings for Fernhill', () => {
    const reach = deriveReach(fernhill);
    expect(reach.rooms.total).toBe(13);
    expect(reach.rooms.unreached).toEqual([]);
    expect(reach.blocked).toEqual([]);
    expect(reach.stranded).toEqual([]);
    expect(reach.brokenExits).toEqual([]);
    expect(reach.nothingToRead).toEqual([]);
    expect(reach.findingCount).toBe(0);
  });

  it('reports no Reach findings for The Alderman', () => {
    const reach = deriveReach(alderman);
    expect(reach.rooms.total).toBe(8);
    expect(reach.findingCount).toBe(0);
  });

  it('reports no Reach findings for Ides of March', () => {
    const reach = deriveReach(idesOfMarch);
    expect(reach.rooms.total).toBe(5);
    expect(reach.findingCount).toBe(0);
  });

  it('reaches the cellar only because the key sits outside it', () => {
    const reach = deriveReach(fernhill);
    expect(reach.rooms.reachable).toContain('cellar');
  });
});

describe('AC-2 — the key inside the room it opens', () => {
  let reach: ReturnType<typeof deriveReach>;

  beforeAll(() => {
    const faulted = faultable(fernhill);
    entity(faulted, 'tarnished-key').placement = {
      relation: 'in',
      place: 'cellar',
      span: entity(faulted, 'tarnished-key').placement!.span,
    };
    reach = deriveReach(faulted);
  });

  it('leaves the cellar unreached', () => {
    expect(reach.rooms.unreached).toEqual(['cellar']);
    expect(reach.rooms.reachable).not.toContain('cellar');
  });

  it('names the reason rather than the fact', () => {
    const block = reach.blocked.find((candidate) => candidate.to === 'cellar');
    expect(block).toMatchObject({
      from: 'cellar-stairs',
      to: 'cellar',
      direction: 'down',
      obstacle: 'lock',
      door: 'cellar-door',
      key: 'tarnished-key',
      keyRoom: 'cellar',
      reason: 'the key is inside the room it opens',
    });
  });

  it('reports the key and the crowbar stranded behind it', () => {
    expect(reach.stranded.map((thing) => thing.id).sort()).toEqual(['crowbar', 'tarnished-key']);
    for (const thing of reach.stranded) {
      expect(thing.room).toBe('cellar');
      expect(thing.reason).toBe('nothing reaches the room it sits in');
    }
  });
});

describe('AC-3 — exit to nowhere', () => {
  let reach: ReturnType<typeof deriveReach>;

  beforeAll(() => {
    const faulted = faultable(fernhill);
    const kitchen = entity(faulted, 'kitchen');
    kitchen.exits.push({ direction: 'east', to: 'scullery', via: null, span: kitchen.exits[0].span });
    reach = deriveReach(faulted);
  });

  it('reports exactly one broken exit', () => {
    expect(reach.brokenExits).toEqual([
      { from: 'kitchen', direction: 'east', to: 'scullery', line: expect.any(Number) },
    ]);
  });

  it('does not inflate the room count', () => {
    expect(reach.rooms.total).toBe(13);
    expect(reach.rooms.reachable).toHaveLength(13);
    expect(reach.rooms.reachable).not.toContain('scullery');
  });

  it('finds nothing else wrong with the story', () => {
    expect(reach.findingCount).toBe(1);
  });
});

describe('AC-4 — missing description', () => {
  it('reports a reachable thing with nothing to read', () => {
    const faulted = faultable(fernhill);
    entity(faulted, 'oil-lamp').descriptionKey = null;
    const reach = deriveReach(faulted);

    expect(reach.nothingToRead).toEqual([
      { id: 'oil-lamp', name: expect.any(String), room: 'cellar-stairs' },
    ]);
    expect(reach.rooms.reachable).toContain('cellar-stairs');
    expect(reach.findingCount).toBe(1);
  });

  it('stays quiet about a thing nothing reaches — that is the stranding, not the prose', () => {
    const faulted = faultable(fernhill);
    entity(faulted, 'crowbar').descriptionKey = null;
    entity(faulted, 'tarnished-key').placement = {
      relation: 'in',
      place: 'cellar',
      span: entity(faulted, 'tarnished-key').placement!.span,
    };
    const reach = deriveReach(faulted);

    expect(reach.nothingToRead).toEqual([]);
    expect(reach.stranded.map((thing) => thing.id)).toContain('crowbar');
  });
});

describe('AC-5 — the polarity guard', () => {
  it('reads Fernhill’s two gates as openable, not sealed', () => {
    const reach = deriveReach(fernhill);
    expect(reach.blocked.filter((block) => block.obstacle === 'gate')).toEqual([]);
    expect(reach.rooms.reachable).toEqual(expect.arrayContaining(['study', 'folly-hill', 'folly']));
  });

  it('seals the guard gate when nothing changes her out of the blocking state', () => {
    const faulted = faultable(fernhill);
    entity(faulted, 'mrs-kettle').onClauses = [];
    const reach = deriveReach(faulted);

    expect(reach.blocked).toEqual([
      expect.objectContaining({
        from: 'entrance-hall',
        to: 'study',
        direction: 'west',
        obstacle: 'gate',
        reason: 'nothing the player can reach lifts the condition blocking this exit',
      }),
    ]);
    expect(reach.rooms.unreached).toEqual(['study']);
  });

  it('seals the boiler gate when the switch sits behind the exit it opens', () => {
    const faulted = faultable(fernhill);
    const boiler = entity(faulted, 'boiler');
    boiler.placement = { relation: 'in', place: 'folly-hill', span: boiler.placement!.span };
    const reach = deriveReach(faulted);

    expect(reach.blocked).toEqual([
      expect.objectContaining({
        from: 'greenhouse',
        to: 'folly-hill',
        direction: 'north',
        obstacle: 'gate',
        reason: 'nothing the player can reach lifts the condition blocking this exit',
      }),
    ]);
    expect(reach.rooms.unreached.sort()).toEqual(['folly', 'folly-hill']);
    expect(reach.stranded.map((thing) => thing.id)).toContain('boiler');
  });
});

describe('a gate with no condition never lifts', () => {
  it('blocks the exit permanently and strands what is behind it', () => {
    const faulted = faultable(fernhill);
    const stairs = entity(faulted, 'cellar-stairs');
    stairs.blockedExits.push({
      direction: 'down',
      phraseKey: entity(faulted, 'iron-gates').blockedExits[0].phraseKey,
      condition: null,
      span: stairs.exits[0].span,
    });
    const reach = deriveReach(faulted);

    expect(reach.blocked).toEqual([
      expect.objectContaining({
        from: 'cellar-stairs',
        to: 'cellar',
        direction: 'down',
        obstacle: 'gate',
        reason: 'the exit is blocked with no condition that lifts it',
      }),
    ]);
    expect(reach.rooms.unreached).toEqual(['cellar']);
    expect(reach.stranded.map((thing) => thing.id)).toEqual(['crowbar']);
  });

  it('says nothing when the blocked direction has no exit at all', () => {
    const reach = deriveReach(fernhill);
    expect(entity(fernhill, 'iron-gates').blockedExits[0]).toMatchObject({
      direction: 'south',
      condition: null,
    });
    expect(reach.blocked).toEqual([]);
  });
});
