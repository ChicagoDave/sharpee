/**
 * presence-of.test.ts — `PerceptionService.presenceOf` (ADR-328 D3).
 *
 * Presence is co-location plus concealment, never sight: a room owner means
 * the observer is IN that room, a region owner means the observer is in one
 * of its member rooms, anything else means a shared containing room. Each
 * DOES line of the behavior statement is one assertion below; the darkness
 * case pins that presence and `canPerceive` are different questions.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  EntityType,
  RoomTrait,
  RegionTrait,
  ConcealedStateTrait,
} from '@sharpee/world-model';
import { PerceptionService } from '../../../src/services/PerceptionService';

describe('PerceptionService.presenceOf (ADR-328 D3)', () => {
  let world: WorldModel;
  let service: PerceptionService;
  let player: IFEntity;
  let hall: IFEntity;
  let cellar: IFEntity;
  let npc: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    service = new PerceptionService();
    player = world.createEntity('player', EntityType.ACTOR);
    world.setPlayer(player.id);
    hall = world.createEntity('Hall', EntityType.ROOM);
    hall.add(new RoomTrait({ requiresLight: false }));
    cellar = world.createEntity('Cellar', EntityType.ROOM);
    cellar.add(new RoomTrait({ requiresLight: true }));
    npc = world.createEntity('thief', EntityType.ACTOR);
    world.moveEntity(player.id, hall.id);
  });

  test('present when the location is the room the observer is in', () => {
    expect(service.presenceOf(player, hall.id, world)).toBe('present');
  });

  test('absent when the location is a room the observer is not in', () => {
    expect(service.presenceOf(player, cellar.id, world)).toBe('absent');
  });

  test('present for an entity sharing the observer\'s containing room', () => {
    world.moveEntity(npc.id, hall.id);
    expect(service.presenceOf(player, npc.id, world)).toBe('present');
  });

  test('absent for an entity in another room', () => {
    world.moveEntity(npc.id, cellar.id);
    expect(service.presenceOf(player, npc.id, world)).toBe('absent');
  });

  test('present for a region the observer\'s room belongs to, absent for one it does not', () => {
    const wing = world.createEntity('East Wing', EntityType.REGION);
    wing.add(new RegionTrait({ name: 'East Wing' }));
    const attic = world.createEntity('Attic', EntityType.REGION);
    attic.add(new RegionTrait({ name: 'Attic' }));
    (hall.get(RoomTrait.type) as RoomTrait).regionId = wing.id;

    expect(service.presenceOf(player, wing.id, world)).toBe('present');
    expect(service.presenceOf(player, attic.id, world)).toBe('absent');
  });

  test('concealed when co-located and the observer carries a concealed state', () => {
    world.moveEntity(npc.id, hall.id);
    player.add(new ConcealedStateTrait({ targetId: 'curtain', position: 'behind', quality: 'good' }));

    expect(service.presenceOf(player, npc.id, world)).toBe('concealed');
    expect(service.presenceOf(player, hall.id, world)).toBe('concealed');
  });

  test('absent, not concealed, when hidden but elsewhere', () => {
    world.moveEntity(npc.id, cellar.id);
    player.add(new ConcealedStateTrait({ targetId: 'curtain', position: 'behind', quality: 'good' }));

    expect(service.presenceOf(player, npc.id, world)).toBe('absent');
  });

  test('the observer is always present at itself', () => {
    expect(service.presenceOf(player, player.id, world)).toBe('present');
  });

  test('an unknown location is absent', () => {
    expect(service.presenceOf(player, 'no-such-entity', world)).toBe('absent');
  });

  test('darkness does not make the observer absent — presence is not sight', () => {
    world.moveEntity(player.id, cellar.id);
    expect(service.canPerceive(player, cellar, world, 'sight')).toBe(false);
    expect(service.presenceOf(player, cellar.id, world)).toBe('present');
  });
});
