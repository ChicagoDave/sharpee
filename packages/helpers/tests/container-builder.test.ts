/**
 * container-builder.test.ts — ADR-231 D5b: ContainerBuilder.openable()
 * defers the open/closed default to the world-model trait. A no-arg
 * `.openable()` yields OpenableTrait.isOpen === false (the trait's own
 * closed default, openableTrait.ts) — the builder's former `?? true` is
 * gone. Explicit isOpen passes through in both directions. Assertions
 * are on the built entity's trait state in a real WorldModel.
 */
import { describe, expect, it } from 'vitest';
import { OpenableTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ContainerBuilder } from '../src/builders/container';

const build = (configure: (b: ContainerBuilder) => ContainerBuilder) => {
  const world = new WorldModel();
  return configure(new ContainerBuilder(world, 'crate')).build();
};

describe('ContainerBuilder.openable() default (ADR-231 D5b)', () => {
  it('no-arg openable() starts CLOSED — the world-model trait default decides', () => {
    const entity = build((b) => b.openable());
    const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable).toBeDefined();
    expect(openable.isOpen).toBe(false);
  });

  it('openable({ isOpen: true }) starts open — explicit config passes through', () => {
    const entity = build((b) => b.openable({ isOpen: true }));
    const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable.isOpen).toBe(true);
  });

  it('openable({ isOpen: false }) starts closed — explicit config passes through', () => {
    const entity = build((b) => b.openable({ isOpen: false }));
    const openable = entity.get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable.isOpen).toBe(false);
  });

  it('without openable() no OpenableTrait is added at all', () => {
    const entity = build((b) => b);
    expect(entity.has(TraitType.OPENABLE)).toBe(false);
  });
});
