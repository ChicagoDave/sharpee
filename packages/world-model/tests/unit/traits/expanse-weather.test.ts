/**
 * expanse-weather.test.ts — the expanse behavior owns an expanse's
 * visibility and wind: `setExpanseVisibility` and `setExpanseWind` change the
 * trait when the value is one the trait can hold, and refuse — changing
 * nothing — when the entity is not an expanse or the value breaks the
 * trait's own invariant (the constructor's checks, shared).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { setExpanseVisibility, setExpanseWind } from '../../../src/traits/expanse/expanseBehavior';

describe('the expanse behavior owns visibility and wind', () => {
  let world: WorldModel;
  let sea: IFEntity;
  let rock: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    sea = world.createEntity('Sea', EntityType.ROOM);
    sea.add(new ExpanseTrait({ width: 10, height: 10, visibility: 6, wind: 90 }));
    rock = world.createEntity('rock', EntityType.ITEM);
  });

  it('sets the visibility, zero included', () => {
    expect(setExpanseVisibility(sea, 2)).toBe(true);
    expect(sea.get(ExpanseTrait)!.visibility).toBe(2);
    expect(setExpanseVisibility(sea, 0)).toBe(true);
    expect(sea.get(ExpanseTrait)!.visibility).toBe(0);
  });

  it('sets the wind to a bearing or a calm', () => {
    expect(setExpanseWind(sea, 270)).toBe(true);
    expect(sea.get(ExpanseTrait)!.wind).toBe(270);
    expect(setExpanseWind(sea, 'calm')).toBe(true);
    expect(sea.get(ExpanseTrait)!.wind).toBe('calm');
  });

  it('refuses a visibility below zero and leaves the old one', () => {
    expect(setExpanseVisibility(sea, -1)).toBe(false);
    expect(sea.get(ExpanseTrait)!.visibility).toBe(6);
  });

  it('refuses a bearing outside 0 to 359, or not whole, and leaves the old wind', () => {
    expect(setExpanseWind(sea, 360)).toBe(false);
    expect(setExpanseWind(sea, -5)).toBe(false);
    expect(setExpanseWind(sea, 12.5)).toBe(false);
    expect(sea.get(ExpanseTrait)!.wind).toBe(90);
  });

  it('refuses an entity that is not an expanse', () => {
    expect(setExpanseVisibility(rock, 3)).toBe(false);
    expect(setExpanseWind(rock, 'calm')).toBe(false);
    expect(rock.get(ExpanseTrait)).toBeUndefined();
  });

  it('the constructor holds the same invariants the setters check', () => {
    expect(() => new ExpanseTrait({ width: 1, height: 1, visibility: -1 })).toThrow('visibility is zero or more');
    expect(() => new ExpanseTrait({ width: 1, height: 1, wind: 360 })).toThrow('a wind is a bearing of 0 to 359, or calm');
  });
});
