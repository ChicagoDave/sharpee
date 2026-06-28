/**
 * @file ADR-193 — state-derived adjective contributors: default OPENABLE/LOCKABLE
 * contributors, the open registry, and the "marked state only" behaviour.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../src/world/WorldModel';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { registerAdjectiveContributor, getStateAdjectives } from '../../src/state-adjectives';

function world() {
  return new WorldModel();
}

describe('getStateAdjectives (ADR-193)', () => {
  it('AC-1: OPENABLE contributes "open" when open, nothing when closed', () => {
    const w = world();
    const open = w.createEntity('Box', 'container');
    open.add(new OpenableTrait({ isOpen: true }));
    expect(getStateAdjectives(open)).toEqual(['open']);

    const closed = w.createEntity('Crate', 'container');
    closed.add(new OpenableTrait({ isOpen: false }));
    expect(getStateAdjectives(closed)).toEqual([]);
  });

  it('AC-1: LOCKABLE contributes "locked" when locked, nothing when unlocked', () => {
    const w = world();
    const locked = w.createEntity('Chest', 'container');
    locked.add(new LockableTrait({ isLocked: true }));
    expect(getStateAdjectives(locked)).toEqual(['locked']);

    const unlocked = w.createEntity('Drawer', 'container');
    unlocked.add(new LockableTrait({ isLocked: false }));
    expect(getStateAdjectives(unlocked)).toEqual([]);
  });

  it('an entity with no contributing trait yields no state adjectives', () => {
    const w = world();
    const rock = w.createEntity('Rock', 'object');
    expect(getStateAdjectives(rock)).toEqual([]);
  });

  it('AC-5: the registry is open — a registered contributor is collected', () => {
    const w = world();
    const lamp = w.createEntity('Lamp', 'object');
    lamp.add(new OpenableTrait({ isOpen: false })); // any trait to attach a contributor to
    registerAdjectiveContributor('openable', (e) =>
      (e.get('openable') as OpenableTrait | undefined)?.isOpen ? ['open'] : ['shut'],
    );
    // latest registration wins → closed openable now yields "shut"
    expect(getStateAdjectives(lamp)).toEqual(['shut']);
    // restore the default so other tests/order are unaffected
    registerAdjectiveContributor('openable', (e) =>
      (e.get('openable') as OpenableTrait | undefined)?.isOpen ? ['open'] : [],
    );
    expect(getStateAdjectives(lamp)).toEqual([]);
  });
});
