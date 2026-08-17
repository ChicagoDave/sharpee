/**
 * world-digest.test.ts — the play feed's world digest (ADR-306 Phase 2).
 *
 * Pins: the digest lists non-room, non-player entities with their locations
 * (kind npc for actors, item otherwise), the score from the scoring
 * capability, and machine states through the plugin registry's existing
 * surface — every field degrading to absence, never a throw. The token rule
 * (alias → single-token name → id) is the MIRROR of branch-tester's
 * `worldEntityRef`; these cases pin this side of the mirror (the harness
 * pins its own), so drift on either side is a red test, not silence.
 */
import { describe, it, expect } from 'vitest';
import { TraitType } from '@sharpee/world-model';
import { buildWorldDigest } from '../src/world-digest';

interface FakeEntity {
  id: string;
  name?: string;
  traits?: Set<string>;
  identity?: { name?: string; aliases?: unknown[] };
}

function makeWorld(entities: FakeEntity[], opts: { playerId?: string; score?: unknown; locations?: Record<string, string> } = {}) {
  const byId = new Map(entities.map((e) => [e.id, wrap(e)]));
  function wrap(e: FakeEntity) {
    return {
      id: e.id,
      name: e.name,
      has: (t: string) => e.traits?.has(t) ?? false,
      get: (t: string) => (t === 'identity' ? e.identity : undefined),
    };
  }
  return {
    getPlayer: () => (opts.playerId ? byId.get(opts.playerId) : undefined),
    getAllEntities: () => [...byId.values()],
    getLocation: (id: string) => opts.locations?.[id],
    getEntity: (id: string) => byId.get(id),
    getCapability: (name: string) =>
      name === 'scoring' && opts.score !== undefined ? { scoreValue: opts.score } : undefined,
  } as any;
}

const ROOM = { id: 'r1', name: 'cellar', traits: new Set([TraitType.ROOM]) };

describe('buildWorldDigest', () => {
  it('lists npc and item locations, excluding the player and rooms', () => {
    const world = makeWorld(
      [
        ROOM,
        { id: 'p1', name: 'hero', traits: new Set([TraitType.ACTOR]) },
        { id: 'n1', name: 'gardener', traits: new Set([TraitType.ACTOR]) },
        { id: 'i1', name: 'lamp' },
      ],
      { playerId: 'p1', locations: { p1: 'r1', n1: 'r1', i1: 'r1' } },
    );
    const digest = buildWorldDigest(world, {});
    expect(digest.entities).toEqual([
      // `id` is the world id author-channel rows carry (`npcId`) — the
      // testing surface's NPC panel resolves rows to names through it.
      { kind: 'npc', id: 'n1', name: 'gardener', token: 'gardener', location: { name: 'cellar', token: 'cellar' } },
      { kind: 'item', id: 'i1', name: 'lamp', token: 'lamp', location: { name: 'cellar', token: 'cellar' } },
    ]);
  });

  it('token rule mirrors branch-tester worldEntityRef: alias wins, multiword name falls back to id', () => {
    const world = makeWorld(
      [
        ROOM,
        {
          id: 'i9',
          name: 'ring',
          identity: { name: 'tarnished silver ring', aliases: ['heavy old thing', 'ring'] },
        },
        { id: 'i10', identity: { name: 'deed box and papers', aliases: [] } },
      ],
      { locations: { i9: 'r1', i10: 'r1' } },
    );
    const [aliased, unresolvable] = buildWorldDigest(world, {}).entities;
    // Display name is the identity name; the token is the FIRST alias that
    // is a single whitespace-free token ('heavy old thing' is disqualified).
    expect(aliased).toEqual({
      kind: 'item',
      id: 'i9',
      name: 'tarnished silver ring',
      token: 'ring',
      location: { name: 'cellar', token: 'cellar' },
    });
    // No single-token alias, multiword name → the id, which always resolves.
    expect(unresolvable.token).toBe('i10');
    expect(unresolvable.name).toBe('deed box and papers');
  });

  it('skips entities with no location or an unresolvable location', () => {
    const world = makeWorld(
      [ROOM, { id: 'i1', name: 'lamp' }, { id: 'i2', name: 'ghost' }, { id: 'i3', name: 'stray' }],
      { locations: { i2: 'nowhere-real', i1: 'r1' } },
    );
    const digest = buildWorldDigest(world, {});
    expect(digest.entities.map((e) => e.name)).toEqual(['lamp']);
  });

  it('carries the score only when the scoring capability holds a number', () => {
    expect(buildWorldDigest(makeWorld([], { score: 11 }), {}).score).toBe(11);
    expect('score' in buildWorldDigest(makeWorld([], {}), {})).toBe(false);
    expect('score' in buildWorldDigest(makeWorld([], { score: 'high' }), {})).toBe(false);
  });

  it('reads machine states through the plugin registry surface, degrading to [] on any shape mismatch', () => {
    const engineWith = (state: unknown) => ({
      getPluginRegistry: () => ({
        getById: (id: string) =>
          id === 'sharpee.plugin.state-machine' ? { getState: () => state } : undefined,
      }),
    });
    expect(
      buildWorldDigest(makeWorld([]), engineWith({
        instances: [
          { id: 'timeline', currentState: 'before-dawn', history: [] },
          { id: 'boiler', currentState: 'cold' },
          { id: 42, currentState: 'bogus' },
        ],
      })).machines,
    ).toEqual([
      { id: 'timeline', state: 'before-dawn' },
      { id: 'boiler', state: 'cold' },
    ]);
    expect(buildWorldDigest(makeWorld([]), engineWith(null)).machines).toEqual([]);
    expect(buildWorldDigest(makeWorld([]), engineWith('junk')).machines).toEqual([]);
    expect(buildWorldDigest(makeWorld([]), {}).machines).toEqual([]);
    expect(
      buildWorldDigest(makeWorld([]), {
        getPluginRegistry: () => { throw new Error('no registry'); },
      }).machines,
    ).toEqual([]);
  });

  it('never throws on a world with no enumeration surface at all', () => {
    expect(buildWorldDigest({} as any, {})).toEqual({ entities: [], machines: [] });
  });
});
