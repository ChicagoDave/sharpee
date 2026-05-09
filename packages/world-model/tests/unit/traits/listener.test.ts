/**
 * Tests for the Listener trait — ADR-172 Phase 2.
 *
 * Verifies trait identifier registration and composition with IFEntity
 * (actors, objects, devices). Phase 2 ships only the trait shape — the
 * automatic player attachment lives in `@sharpee/engine` (Phase 4) and
 * the propagation function's listener enumeration lives in Phase 3;
 * neither is tested here.
 *
 * Owner context: `@sharpee/world-model` — sensory primitives.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { EntityType } from '../../../src/entities/entity-types';
import { TraitType } from '../../../src/traits/trait-types';
import { ListenerTrait } from '../../../src/traits/listener';

describe('ListenerTrait', () => {
  it('exposes the canonical TraitType.LISTENER identifier on instance and class', () => {
    const trait = new ListenerTrait();
    expect(trait.type).toBe(TraitType.LISTENER);
    expect(ListenerTrait.type).toBe(TraitType.LISTENER);
    expect(TraitType.LISTENER).toBe('if.trait.listener');
  });

  it('composes onto an actor via add()/has()/get()', () => {
    const world = new WorldModel();
    const guard = world.createEntity('guard', EntityType.ACTOR);
    guard.add(new ListenerTrait());

    expect(guard.has(TraitType.LISTENER)).toBe(true);
    const trait = guard.get<ListenerTrait>(TraitType.LISTENER);
    expect(trait).toBeDefined();
    expect(trait?.type).toBe(TraitType.LISTENER);
  });

  it('composes onto a device-shaped entity (intercom microphone, recorder)', () => {
    const world = new WorldModel();
    const intercom = world.createEntity('intercom', EntityType.OBJECT);
    intercom.add(new ListenerTrait());
    expect(intercom.has(TraitType.LISTENER)).toBe(true);
  });

  it('an entity without ListenerTrait does not report has(LISTENER)', () => {
    const world = new WorldModel();
    const rock = world.createEntity('rock', EntityType.OBJECT);
    expect(rock.has(TraitType.LISTENER)).toBe(false);
  });
});
