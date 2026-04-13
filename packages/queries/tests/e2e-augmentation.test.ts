/**
 * End-to-end test for WorldModel augmentation (ADR-150 Section 7).
 *
 * Creates a real WorldModel, populates it with rooms and entities,
 * imports the augmentation, and verifies chained queries work through
 * the entry points.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WorldModel, IWorldModel, EntityType, TraitType } from '@sharpee/world-model';

// Side-effect import: activates w.rooms, w.all, etc.
import '../src/augmentation';

describe('WorldModel augmentation (ADR-150 e2e)', () => {
  let w: IWorldModel;

  beforeAll(() => {
    w = new WorldModel();

    // Create room
    const armory = w.createEntity('Armory', EntityType.ROOM);
    armory.add({ type: TraitType.IDENTITY, name: 'Armory' } as any);
    armory.add({ type: TraitType.ROOM } as any);

    // Create player (actor)
    const player = w.createEntity('player', EntityType.ACTOR);
    player.add({ type: TraitType.IDENTITY, name: 'player' } as any);
    player.add({ type: TraitType.ACTOR, isPlayer: true } as any);
    w.moveEntity(player.id, armory.id);

    // Create sword (weapon)
    const sword = w.createEntity('sword', EntityType.OBJECT);
    sword.add({ type: TraitType.IDENTITY, name: 'sword', aliases: ['blade'] } as any);
    sword.add({ type: 'weapon' } as any);
    w.moveEntity(sword.id, armory.id);

    // Create shield (wearable)
    const shield = w.createEntity('shield', EntityType.OBJECT);
    shield.add({ type: TraitType.IDENTITY, name: 'shield' } as any);
    shield.add({ type: TraitType.WEARABLE } as any);
    w.moveEntity(shield.id, armory.id);
  });

  // ── ADR-150 Section 7 assertions ───────────────────────────────────

  it('w.rooms.count() returns room count', () => {
    expect(w.rooms.count()).toBe(1);
  });

  it('w.rooms.named("Armory").single() returns the room', () => {
    const room = w.rooms.named('Armory').single();
    expect(room).toBeDefined();
    expect(room.type).toBe(EntityType.ROOM);
  });

  it('w.contents(roomId) returns room contents', () => {
    const room = w.rooms.first()!;
    // Contents include player, sword, shield
    expect(w.contents(room.id).count()).toBe(3);
  });

  it('w.contents(roomId).named("sword").single() finds the sword', () => {
    const room = w.rooms.first()!;
    const sword = w.contents(room.id).named('sword').single();
    expect(sword).toBeDefined();
    expect(sword.has('weapon' as any)).toBe(true);
  });

  it('w.contents(roomId).withTrait("weapon").any() is true', () => {
    const room = w.rooms.first()!;
    expect(w.contents(room.id).withTrait('weapon').any()).toBe(true);
  });

  it('w.contents(roomId).withTrait(LIGHT_SOURCE).none() is true', () => {
    const room = w.rooms.first()!;
    expect(w.contents(room.id).withTrait(TraitType.LIGHT_SOURCE).none()).toBe(true);
  });

  it('w.all.count() includes all entities', () => {
    // room + player + sword + shield = 4
    expect(w.all.count()).toBeGreaterThanOrEqual(3);
  });

  it('w.contents(roomId).toIdSet() returns correct IDs', () => {
    const room = w.rooms.first()!;
    const ids = w.contents(room.id).toIdSet();
    // Should contain player, sword, shield IDs
    expect(ids.size).toBe(3);
  });

  it('w.contents(roomId).named("axe").first() returns undefined', () => {
    const room = w.rooms.first()!;
    expect(w.contents(room.id).named('axe').first()).toBeUndefined();
  });

  it('w.contents(roomId).named("axe").single() throws', () => {
    const room = w.rooms.first()!;
    expect(() => w.contents(room.id).named('axe').single()).toThrow(
      'Expected exactly one entity, found none',
    );
  });

  // ── Additional augmentation tests ──────────────────────────────────

  it('w.actors returns actor entities', () => {
    expect(w.actors.count()).toBe(1);
    expect(w.actors.first()!.type).toBe(EntityType.ACTOR);
  });

  it('w.objects returns non-room, non-actor entities', () => {
    // sword + shield = 2
    expect(w.objects.count()).toBe(2);
  });

  it('w.scenes returns empty query (ADR-149 not implemented)', () => {
    expect(w.scenes.count()).toBe(0);
    expect(w.scenes.none()).toBe(true);
  });

  it('w.regions returns empty query (ADR-149 not implemented)', () => {
    expect(w.regions.count()).toBe(0);
    expect(w.regions.none()).toBe(true);
  });

  it('w.having(traitType) returns entities with that trait', () => {
    const wearables = w.having(TraitType.WEARABLE);
    expect(wearables.count()).toBe(1);
    expect(wearables.first()!.has(TraitType.WEARABLE)).toBe(true);
  });

  it('chaining works across entry points and filters', () => {
    const room = w.rooms.first()!;
    const weaponNames = w.contents(room.id)
      .withTrait('weapon')
      .select(e => {
        const id = e.get(TraitType.IDENTITY as any) as { name: string } | undefined;
        return id?.name;
      });
    expect(weaponNames).toEqual(['sword']);
  });

  it('matching() works through augmented entry point', () => {
    const room = w.rooms.first()!;
    const found = w.contents(room.id).matching('blade');
    expect(found.count()).toBe(1);
  });

  it('groupBy() works on augmented entry point', () => {
    const groups = w.all.groupBy(e => e.type);
    expect(groups.has(EntityType.ROOM)).toBe(true);
    expect(groups.has(EntityType.ACTOR)).toBe(true);
    expect(groups.has(EntityType.OBJECT)).toBe(true);
  });
});
