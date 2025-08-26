/**
 * Tests for sensory extensions in the scope system
 * Fixed version with proper room/door setup
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, AuthorModel, TraitType, IFEntity, EntityType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../../../src/scope/scope-resolver';
import { ScopeLevel } from '../../../src/scope/types';

describe('Sensory Extensions', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let resolver: StandardScopeResolver;
  let player: IFEntity;
  let room: IFEntity;
  let hallway: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    resolver = new StandardScopeResolver(world);

    // Create test world using AuthorModel
    room = author.createEntity('Living Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    room.add({ type: TraitType.IDENTITY, name: 'Living Room' });

    hallway = author.createEntity('Hallway', EntityType.ROOM);
    hallway.add({ type: TraitType.ROOM });
    hallway.add({ type: TraitType.IDENTITY, name: 'Hallway' });

    // Connect the rooms
    room.add({ 
      type: TraitType.EXIT,
      direction: 'north',
      destination: hallway.id
    });
    hallway.add({
      type: TraitType.EXIT,
      direction: 'south',
      destination: room.id
    });

    player = author.createEntity('Player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER });
    player.add({ type: TraitType.IDENTITY, name: 'Player' });
    
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Hearing', () => {
    test('should hear entities in same room', () => {
      const radio = author.createEntity('radio', EntityType.OBJECT);
      radio.add({ type: TraitType.IDENTITY, name: 'radio' });
      author.moveEntity(radio.id, room.id);

      expect(resolver.canHear(player, radio)).toBe(true);
      expect(resolver.getScope(player, radio)).toBe(ScopeLevel.REACHABLE);
    });

    test('should hear through open doors', () => {
      // Create door connecting the rooms
      const door = author.createEntity(EntityType.DOOR, EntityType.DOOR);
      door.add({ 
        type: TraitType.DOOR,
        room1: room.id,
        room2: hallway.id
      });
      door.add({ type: TraitType.OPENABLE, isOpen: true });
      // Door must be placed in one of the rooms
      author.moveEntity(door.id, room.id);

      const npc = author.createEntity('Bob', EntityType.ACTOR);
      npc.add({ type: TraitType.ACTOR });
      npc.add({ type: TraitType.IDENTITY, name: 'Bob' });
      author.moveEntity(npc.id, hallway.id);

      expect(resolver.canHear(player, npc)).toBe(true);
      expect(resolver.canSee(player, npc)).toBe(false); // Can't see through doorway
      expect(resolver.getScope(player, npc)).toBe(ScopeLevel.AUDIBLE);
    });

    test('should hear through closed doors (muffled)', () => {
      // Create closed door
      const door = author.createEntity(EntityType.DOOR, EntityType.DOOR);
      door.add({ 
        type: TraitType.DOOR,
        room1: room.id,
        room2: hallway.id
      });
      door.add({ type: TraitType.OPENABLE, isOpen: false });
      // Place door in one of the rooms
      author.moveEntity(door.id, room.id);

      const npc = author.createEntity('Bob', EntityType.ACTOR);
      npc.add({ type: TraitType.ACTOR });
      npc.add({ type: TraitType.IDENTITY, name: 'Bob' });
      author.moveEntity(npc.id, hallway.id);

      expect(resolver.canHear(player, npc)).toBe(true);
      expect(resolver.getScope(player, npc)).toBe(ScopeLevel.AUDIBLE);
    });

    test('should not hear in unconnected rooms', () => {
      const basement = author.createEntity('Basement', EntityType.ROOM);
      basement.add({ type: TraitType.ROOM });

      const npc = author.createEntity('Bob', EntityType.ACTOR);
      npc.add({ type: TraitType.ACTOR });
      author.moveEntity(npc.id, basement.id);

      expect(resolver.canHear(player, npc)).toBe(false);
      expect(resolver.getScope(player, npc)).toBe(ScopeLevel.OUT_OF_SCOPE);
    });

    test('should get all audible entities', () => {
      // In same room
      const radio = author.createEntity('radio', EntityType.OBJECT);
      radio.add({ type: TraitType.IDENTITY, name: 'radio' });
      author.moveEntity(radio.id, room.id);

      // In connected room with door
      const door = author.createEntity(EntityType.DOOR, EntityType.DOOR);
      door.add({ 
        type: TraitType.DOOR,
        room1: room.id,
        room2: hallway.id
      });
      door.add({ type: TraitType.OPENABLE, isOpen: false });
      // Place door in one of the rooms
      author.moveEntity(door.id, room.id);

      const npc = author.createEntity('Bob', EntityType.ACTOR);
      npc.add({ type: TraitType.ACTOR });
      npc.add({ type: TraitType.IDENTITY, name: 'Bob' });
      author.moveEntity(npc.id, hallway.id);

      // In unconnected room
      const basement = author.createEntity('Basement', EntityType.ROOM);
      basement.add({ type: TraitType.ROOM });
      const mouse = author.createEntity('mouse', EntityType.OBJECT);
      mouse.add({ type: TraitType.IDENTITY, name: 'mouse' });
      author.moveEntity(mouse.id, basement.id);

      const audible = resolver.getAudible(player);
      
      // Filter out rooms and player
      const audibleNonRooms = audible.filter(e => 
        !e.has(TraitType.ROOM) && e.id !== player.id
      );
      
      // Should hear: radio (same room), door (in same room), npc (through door)
      // Should NOT hear: mouse (unconnected room)
      expect(audibleNonRooms.map(e => e.name)).toContain('radio');
      expect(audibleNonRooms.map(e => e.name)).toContain(EntityType.DOOR);
      expect(audibleNonRooms.map(e => e.name)).toContain('Bob');
      expect(audibleNonRooms.map(e => e.name)).not.toContain('mouse');
    });
  });

  describe('Smell', () => {
    test('should smell food items in same room', () => {
      const bread = author.createEntity('fresh bread', EntityType.OBJECT);
      bread.add({ type: TraitType.EDIBLE });
      bread.add({ type: TraitType.IDENTITY, name: 'fresh bread' });
      author.moveEntity(bread.id, room.id);

      expect(resolver.canSmell(player, bread)).toBe(true);
    });

    test('should smell actors in same room', () => {
      const npc = author.createEntity('Bob', EntityType.ACTOR);
      npc.add({ type: TraitType.ACTOR });
      npc.add({ type: TraitType.IDENTITY, name: 'Bob' });
      author.moveEntity(npc.id, room.id);

      expect(resolver.canSmell(player, npc)).toBe(true);
    });

    test('should smell through open doors', () => {
      const door = author.createEntity(EntityType.DOOR, EntityType.DOOR);
      door.add({ 
        type: TraitType.DOOR,
        room1: room.id,
        room2: hallway.id
      });
      door.add({ type: TraitType.OPENABLE, isOpen: true });
      // Place door in one of the rooms
      author.moveEntity(door.id, room.id);

      const bread = author.createEntity('fresh bread', EntityType.OBJECT);
      bread.add({ type: TraitType.EDIBLE });
      bread.add({ type: TraitType.IDENTITY, name: 'fresh bread' });
      author.moveEntity(bread.id, hallway.id);

      expect(resolver.canSmell(player, bread)).toBe(true);
      // Bread can be both heard and smelled - hearing takes priority in getScope
      expect(resolver.getScope(player, bread)).toBe(ScopeLevel.AUDIBLE);
    });

    test('should not smell through closed doors', () => {
      const door = author.createEntity(EntityType.DOOR, EntityType.DOOR);
      door.add({ 
        type: TraitType.DOOR,
        room1: room.id,
        room2: hallway.id
      });
      door.add({ type: TraitType.OPENABLE, isOpen: false });
      // Place door in one of the rooms
      author.moveEntity(door.id, room.id);

      const bread = author.createEntity('fresh bread', EntityType.OBJECT);
      bread.add({ type: TraitType.EDIBLE });
      bread.add({ type: TraitType.IDENTITY, name: 'fresh bread' });
      author.moveEntity(bread.id, hallway.id);

      expect(resolver.canSmell(player, bread)).toBe(false);
    });

    test('should not smell non-scented items', () => {
      const rock = author.createEntity('rock', EntityType.OBJECT);
      rock.add({ type: TraitType.IDENTITY, name: 'rock' });
      author.moveEntity(rock.id, room.id);

      expect(resolver.canSmell(player, rock)).toBe(false);
    });
  });

  describe('Darkness', () => {
    test('should not see in dark rooms without light', () => {
      // Make room dark using custom properties
      // Get the existing identity trait and add customProperties
      const identity = room.get(TraitType.IDENTITY) as any;
      identity.customProperties = { isDark: true };
      
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({ type: TraitType.IDENTITY, name: 'ball' });
      author.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(false);
      expect(resolver.canHear(player, ball)).toBe(true); // Can still hear
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.AUDIBLE);
    });

    test('should see in dark rooms with carried light source', () => {
      // Make room dark
      const identity = room.get(TraitType.IDENTITY) as any;
      identity.customProperties = { isDark: true };
      
      // Give player a lit torch
      const torch = author.createEntity('torch', EntityType.OBJECT);
      torch.add({ 
        type: TraitType.IDENTITY,
        name: 'torch',
        customProperties: { isLit: true }
      });
      author.moveEntity(torch.id, player.id);

      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({ type: TraitType.IDENTITY, name: 'ball' });
      author.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(true);
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.REACHABLE);
    });

    test('should see if actor itself provides light', () => {
      // Make room dark
      room.add({
        type: TraitType.IDENTITY,
        name: 'Living Room',
        customProperties: { isDark: true }
      });
      
      // Make player glow
      const playerIdentity = player.get(TraitType.IDENTITY) as any;
      playerIdentity.customProperties = { providesLight: true };

      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({ type: TraitType.IDENTITY, name: 'ball' });
      author.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(true);
    });

    test('should see in lit rooms', () => {
      // Rooms are lit by default
      const ball = author.createEntity('ball', EntityType.OBJECT);
      ball.add({ type: TraitType.IDENTITY, name: 'ball' });
      author.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(true);
    });
  });
});