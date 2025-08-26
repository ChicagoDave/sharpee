/**
 * Integration tests for scope validation with CommandValidator
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CommandValidator } from '../src/validation/command-validator';
import { StandardActionRegistry } from '../src/actions/registry';
import { WorldModel, AuthorModel, IFEntity, TraitType, EntityType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../src/scope/scope-resolver';
import { takingAction } from '../src/actions/standard/taking/taking';
import { throwingAction } from '../src/actions/standard/throwing/throwing';
import { listeningAction } from '../src/actions/standard/listening/listening';
import { smellingAction } from '../src/actions/standard/smelling/smelling';

describe('Scope Integration Tests', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let validator: CommandValidator;
  let registry: StandardActionRegistry;
  let scopeResolver: StandardScopeResolver;
  let player: IFEntity;
  let room: IFEntity;
  
  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    registry = new StandardActionRegistry();
    scopeResolver = new StandardScopeResolver(world);
    validator = new CommandValidator(world, registry, scopeResolver);
    
    // Create test world using AuthorModel for setup
    room = author.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    
    player = author.createEntity('player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER, capacity: { maxItems: 10 } });
    
    // Set player as the active player
    world.setPlayer(player.id);
    
    // Move player to room
    author.moveEntity(player.id, room.id);
    
    // Register actions
    registry.register(takingAction);
    registry.register(throwingAction);
    registry.register(listeningAction);
    registry.register(smellingAction);
  });
  
  describe('REACHABLE scope validation', () => {
    it('should fail when trying to take an object that is not reachable', () => {
      // Create a closed chest in the room (AuthorModel allows this)
      const chest = author.createEntity('chest', EntityType.CONTAINER);
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ type: TraitType.OPENABLE, isOpen: false });
      author.moveEntity(chest.id, room.id);
      
      // Put gem in closed chest (AuthorModel allows this setup)
      const gem = author.createEntity('gem', EntityType.OBJECT);
      author.moveEntity(gem.id, chest.id);
      
      const command = {
        rawInput: 'take gem',
        action: 'if.action.taking',
        tokens: ['take', 'gem'],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            text: 'gem',
            candidates: ['gem'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT',
        confidence: 1.0
      };
      
      
      const result = validator.validate(command);
      
      
      // The gem is out of scope, so the validator might find the chest instead
      // or it might not find anything. Either way, we can't take the gem.
      if (result.success) {
        // If something was found, it shouldn't be the gem
        expect(result.value?.directObject?.entity.id).not.toBe(gem.id);
      } else {
        // If nothing was found, that's also correct
        expect(result.error?.code).toBe('ENTITY_NOT_FOUND');
      }
    });
    
    it('should succeed when object is reachable', () => {
      const coin = author.createEntity('coin', EntityType.OBJECT);
      author.moveEntity(coin.id, room.id);
      
      const command = {
        rawInput: 'take coin',
        action: 'if.action.taking',
        tokens: ['take', 'coin'],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            text: 'coin',
            candidates: ['coin'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(result.value?.directObject?.entity.name).toBe('coin');
    });
  });
  
  describe('CARRIED scope validation', () => {
    it('should fail when trying to throw something not carried', () => {
      const rock = author.createEntity('rock', EntityType.OBJECT);
      author.moveEntity(rock.id, room.id);
      
      const target = author.createEntity('window', EntityType.OBJECT);
      author.moveEntity(target.id, room.id);
      
      const command = {
        rawInput: 'throw rock at window',
        action: 'if.action.throwing',
        tokens: ['throw', 'rock', 'at', 'window'],
        structure: {
          verb: { tokens: [0], text: 'throw', head: 'throw' },
          directObject: { 
            text: 'rock',
            candidates: ['rock'],
            modifiers: []
          },
          preposition: 'at',
          indirectObject: {
            text: 'window',
            candidates: ['window'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT_PREP_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(false);
      // The rock is not carried, so it won't be found when looking for carried items
      expect(result.error?.code).toBe('ENTITY_NOT_FOUND');
      if (result.error?.message) {
        expect(result.error.message).toContain("rock");
      }
    });
    
    it('should succeed when object is carried', () => {
      const rock = author.createEntity('rock', EntityType.OBJECT);
      author.moveEntity(rock.id, player.id); // In player's inventory
      
      const target = author.createEntity('window', EntityType.OBJECT);
      author.moveEntity(target.id, room.id);
      
      const command = {
        rawInput: 'throw rock at window',
        action: 'if.action.throwing',
        tokens: ['throw', 'rock', 'at', 'window'],
        structure: {
          verb: { tokens: [0], text: 'throw', head: 'throw' },
          directObject: { 
            text: 'rock',
            candidates: ['rock'],
            modifiers: []
          },
          preposition: 'at',
          indirectObject: {
            text: 'window',
            candidates: ['window'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT_PREP_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(result.value?.directObject?.entity.name).toBe('rock');
      expect(result.value?.indirectObject?.entity.name).toBe('window');
    });
  });
  
  describe('AUDIBLE scope validation', () => {
    it('should succeed when listening to something audible from another room', () => {
      const nextRoom = author.createEntity('Next Room', EntityType.ROOM);
      nextRoom.add({ type: TraitType.ROOM });
      
      // Connect rooms with an open passage
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add({ type: TraitType.DOOR, room1: room.id, room2: nextRoom.id });
      passage.add({ type: TraitType.OPENABLE, isOpen: true });
      author.moveEntity(passage.id, room.id);
      
      // Create a loud chime in the next room (avoiding "bell" vs "doorbell" confusion)
      const chime = author.createEntity('chime', EntityType.OBJECT);
      // Don't override the identity trait - it's already set by createEntity
      const identity = chime.get(TraitType.IDENTITY);
      if (identity) {
        identity.customProperties = { loud: true };
      }
      author.moveEntity(chime.id, nextRoom.id);
      
      const command = {
        rawInput: 'listen to chime',
        action: 'if.action.listening',
        tokens: ['listen', 'to', 'chime'],
        structure: {
          verb: { tokens: [0], text: 'listen', head: 'listen' },
          preposition: 'to',
          directObject: { 
            text: 'chime',
            candidates: ['chime'],
            modifiers: []
          }
        },
        pattern: 'VERB_PREP_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      
      
      expect(result.success).toBe(true);
      expect(result.value?.directObject?.entity.name).toBe('chime');
    });
  });
  
  describe('DETECTABLE scope validation', () => {
    it('should succeed when smelling something smelly from another room', () => {
      const nextRoom = author.createEntity('Kitchen', EntityType.ROOM);
      nextRoom.add({ type: TraitType.ROOM });
      
      // Connect rooms with open passage
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add({ type: TraitType.DOOR, room1: room.id, room2: nextRoom.id });
      passage.add({ type: TraitType.OPENABLE, isOpen: true });
      author.moveEntity(passage.id, room.id);
      
      // Create smelly cheese in kitchen
      const cheese = author.createEntity('cheese', EntityType.OBJECT);
      cheese.add({ type: TraitType.IDENTITY, name: 'cheese', customProperties: { smelly: true } });
      author.moveEntity(cheese.id, nextRoom.id);
      
      const command = {
        rawInput: 'smell cheese',
        action: 'if.action.smelling',
        tokens: ['smell', 'cheese'],
        structure: {
          verb: { tokens: [0], text: 'smell', head: 'smell' },
          directObject: { 
            text: 'cheese',
            candidates: ['cheese'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(result.value?.directObject?.entity.name).toBe('cheese');
    });
    
    it('should fail when smelling something behind closed door', () => {
      const nextRoom = author.createEntity('Kitchen', EntityType.ROOM);
      nextRoom.add({ type: TraitType.ROOM });
      
      // Connect rooms with closed passage  
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add({ type: TraitType.DOOR, room1: room.id, room2: nextRoom.id });
      passage.add({ type: TraitType.OPENABLE, isOpen: false });
      author.moveEntity(passage.id, room.id);
      
      // Create smelly cheese in kitchen
      const cheese = author.createEntity('cheese', EntityType.OBJECT);
      cheese.add({ type: TraitType.IDENTITY, name: 'cheese', customProperties: { smelly: true } });
      author.moveEntity(cheese.id, nextRoom.id);
      
      const command = {
        rawInput: 'smell cheese',
        action: 'if.action.smelling',
        tokens: ['smell', 'cheese'],
        structure: {
          verb: { tokens: [0], text: 'smell', head: 'smell' },
          directObject: { 
            text: 'cheese',
            candidates: ['cheese'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENTITY_NOT_FOUND'); // Can't detect through closed door
    });
  });
  
  describe('Scope info in ValidatedCommand', () => {
    it('should include scope info in validated command', () => {
      const coin = author.createEntity('coin', EntityType.OBJECT);
      author.moveEntity(coin.id, room.id);
      
      const command = {
        rawInput: 'take coin',
        action: 'if.action.taking',
        tokens: ['take', 'coin'],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            text: 'coin',
            candidates: ['coin'],
            modifiers: []
          }
        },
        pattern: 'VERB_OBJECT',
        confidence: 1.0
      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(result.value?.scopeInfo).toBeDefined();
      // The coin is on the floor so it's reachable, not just visible
      expect(result.value?.scopeInfo?.directObject?.level).toBe('reachable');
      expect(result.value?.scopeInfo?.directObject?.perceivedBy).toContain('sight');
    });
  });
});