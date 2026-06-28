/**
 * Tests for the phrase-pipeline RenderContext runtime (ADR-192, W2).
 *
 * Covers the read-only world adapter's delegation, the inert placeholder seams
 * (reference / textState / contribute), and the per-turn factory that binds the
 * turn invariants once and varies only `params` per message.
 *
 * @see ADR-192 §6
 */

import { describe, it, expect, vi } from 'vitest';
import type { EntityId, IEntity } from '@sharpee/core';
import {
  createRenderWorld,
  createRenderContextFactory,
  type WorldModelLike,
} from '../../src/prose-pipeline/render-context';

/** A stand-in entity (only identity matters for delegation checks). */
function entity(id: string): IEntity {
  return { id } as unknown as IEntity;
}

/** A spy-backed world model satisfying the minimal `WorldModelLike` surface. */
function stubWorld(): WorldModelLike & {
  getEntity: ReturnType<typeof vi.fn>;
  getContents: ReturnType<typeof vi.fn>;
  getContainingRoom: ReturnType<typeof vi.fn>;
  getPlayer: ReturnType<typeof vi.fn>;
} {
  return {
    getEntity: vi.fn((id: EntityId) => entity(String(id))),
    getContents: vi.fn(() => [entity('a'), entity('b')]),
    getContainingRoom: vi.fn(() => entity('room')),
    getPlayer: vi.fn(() => entity('player')),
  };
}

const THIRD = { person: 'third' as const };

describe('createRenderWorld', () => {
  it('delegates getEntity to the model', () => {
    const world = stubWorld();
    const rw = createRenderWorld(world);
    expect(rw.getEntity('torch')).toEqual(entity('torch'));
    expect(world.getEntity).toHaveBeenCalledWith('torch');
  });

  it('maps getEntityContents onto the model getContents', () => {
    const world = stubWorld();
    const rw = createRenderWorld(world);
    expect(rw.getEntityContents('box')).toHaveLength(2);
    expect(world.getContents).toHaveBeenCalledWith('box');
  });

  it('delegates getContainingRoom to the model', () => {
    const world = stubWorld();
    const rw = createRenderWorld(world);
    expect(rw.getContainingRoom('torch')).toEqual(entity('room'));
    expect(world.getContainingRoom).toHaveBeenCalledWith('torch');
  });
});

describe('createRenderContextFactory', () => {
  it('binds the world, settings, and narrative, and varies params per message', () => {
    const rw = createRenderWorld(stubWorld());
    const settings = { serialComma: false };
    const narrative = { person: 'second' as const, playerId: 'player' };
    const make = createRenderContextFactory(rw, settings, narrative);

    const ctxA = make({ item: 'lamp' });
    const ctxB = make({ item: 'sword' });

    expect(ctxA.world).toBe(rw);
    expect(ctxA.settings).toBe(settings);
    expect(ctxA.narrative).toBe(narrative);
    expect(ctxA.params).toEqual({ item: 'lamp' });
    expect(ctxB.params).toEqual({ item: 'sword' });
  });

  it('shares the per-turn seams across every message context it builds', () => {
    const make = createRenderContextFactory(createRenderWorld(stubWorld()), {}, THIRD);
    const ctxA = make({});
    const ctxB = make({});
    expect(ctxA.reference).toBe(ctxB.reference);
    expect(ctxA.textState).toBe(ctxB.textState);
  });

  it('reference seam tracks the last-mentioned referent (ADR-197)', () => {
    const make = createRenderContextFactory(createRenderWorld(stubWorld()), {}, THIRD);
    const ctx = make({});

    expect(ctx.reference.lastMentioned()).toBeUndefined();
    ctx.reference.note({ referableId: 'torch', number: 'singular', pronounSet: 'it' });
    expect(ctx.reference.lastMentioned()).toEqual({ referableId: 'torch', number: 'singular', pronounSet: 'it' });
    ctx.reference.note({ referableId: 'coins', number: 'plural' });
    expect(ctx.reference.lastMentioned()?.referableId).toBe('coins'); // most recent wins
  });

  it('exposes still-inert placeholder seams (textState ADR-196, contribute ADR-195)', () => {
    const make = createRenderContextFactory(createRenderWorld(stubWorld()), {}, THIRD);
    const ctx = make({});

    // textState: always-empty store.
    expect(ctx.textState.get('e', 'k')).toBeUndefined();
    ctx.textState.set('e', 'k', 3);
    expect(ctx.textState.get('e', 'k')).toBeUndefined();

    // contribute: no-op (does not throw).
    expect(() => ctx.contribute('slot', { kind: 'empty' })).not.toThrow();
  });
});
