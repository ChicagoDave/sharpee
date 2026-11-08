/**
 * Integration tests for scope validation with CommandValidator
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CommandValidator } from '../src/validation/command-validator';
import { StandardActionRegistry } from '../src/actions/registry';
import { WorldModel, AuthorModel, IFEntity, TraitType, EntityType, ActorTrait, ContainerTrait, IdentityTrait, EdibleTrait, RoomTrait, OpenableTrait, DoorTrait, SoundingTrait } from '@sharpee/world-model';
import { StandardScopeResolver } from '../src/scope/scope-resolver';
import { ScopeLevel } from '../src/scope/types';
import { takingAction } from '../src/actions/standard/taking/taking';
import { throwingAction } from '../src/actions/standard/throwing/throwing';
import { listeningAction } from '../src/actions/standard/listening/listening';
import { smellingAction } from '../src/actions/standard/smelling/smelling';

/** The validated command of a successful result; fails the test on a refusal. */
function valueOf<T>(result: { success: true; value: T } | { success: false }): T {
  if (!result.success) throw new Error('expected the validator to succeed');
  return result.value;
}

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

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
    world.setLanguageWords(ENGLISH_WORDS);
    author = new AuthorModel(world.getDataStore(), world);
    registry = new StandardActionRegistry();
    scopeResolver = new StandardScopeResolver(world);
    validator = new CommandValidator(world, registry, scopeResolver);
    
    // Create test world using AuthorModel for setup
    room = author.createEntity('Test Room', EntityType.ROOM);
    room.add(new RoomTrait());
    
    player = author.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    
    // Set player as the active player
    player.add(new ActorTrait({ isPlayable: true }));
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
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: false }));
      author.moveEntity(chest.id, room.id);
      
      // Put gem in closed chest (AuthorModel allows this setup)
      const gem = author.createEntity('gem', EntityType.OBJECT);
      author.moveEntity(gem.id, chest.id);
      
      const command = {
        rawInput: 'take gem',
        action: 'if.action.taking',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            tokens: [],
            text: 'gem',
            head: 'gem',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT'      };
      
      
      const result = validator.validate(command);
      
      
      // The gem is out of scope, so the validator might find the chest instead
      // or it might not find anything. Either way, we can't take the gem.
      if (result.success) {
        // If something was found, it shouldn't be the gem
        expect(valueOf(result).directObject?.entity.id).not.toBe(gem.id);
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
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            tokens: [],
            text: 'coin',
            head: 'coin',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT'      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('coin');
    });
  });
  
  describe('CARRIED scope validation', () => {
    it('should resolve a non-carried object at REACHABLE scope for throwing', () => {
      // Throwing's directObjectScope is REACHABLE (to allow implicit take).
      // The rock is in the room and therefore REACHABLE, so the command
      // validator resolves it successfully. The "must be carried" check
      // happens in the action's validate phase, not in command validation.
      const rock = author.createEntity('rock', EntityType.OBJECT);
      author.moveEntity(rock.id, room.id);

      const target = author.createEntity('window', EntityType.OBJECT);
      author.moveEntity(target.id, room.id);

      const command = {
        rawInput: 'throw rock at window',
        action: 'if.action.throwing',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'throw', head: 'throw' },
          directObject: {
            tokens: [],
            text: 'rock',
            head: 'rock',
            modifiers: [],
            articles: [],
            determiners: []
          },
          preposition: { tokens: [2], text: 'at' },
          indirectObject: {
            tokens: [],
            text: 'window',
            head: 'window',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT_PREP_OBJECT'      };

      const result = validator.validate(command);
      // Rock is REACHABLE (in the room), and throwing requires REACHABLE scope
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('rock');
      expect(valueOf(result).indirectObject?.entity.name).toBe('window');
    });
    
    it('should succeed when object is carried', () => {
      const rock = author.createEntity('rock', EntityType.OBJECT);
      author.moveEntity(rock.id, player.id); // In player's inventory
      
      const target = author.createEntity('window', EntityType.OBJECT);
      author.moveEntity(target.id, room.id);
      
      const command = {
        rawInput: 'throw rock at window',
        action: 'if.action.throwing',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'throw', head: 'throw' },
          directObject: { 
            tokens: [],
            text: 'rock',
            head: 'rock',
            modifiers: [],
            articles: [],
            determiners: []
          },
          preposition: { tokens: [2], text: 'at' },
          indirectObject: {
            tokens: [],
            text: 'window',
            head: 'window',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT_PREP_OBJECT'      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('rock');
      expect(valueOf(result).indirectObject?.entity.name).toBe('window');
    });
  });
  
  describe('AUDIBLE scope validation', () => {
    it('should succeed when listening to something audible from another room', () => {
      const nextRoom = author.createEntity('Next Room', EntityType.ROOM);
      nextRoom.add(new RoomTrait());
      
      // Connect rooms with an open passage
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add(new DoorTrait({ room1: room.id, room2: nextRoom.id }));
      passage.add(new OpenableTrait({ isOpen: true }));
      author.moveEntity(passage.id, room.id);
      
      // Create a loud chime in the next room (avoiding "bell" vs "doorbell" confusion)
      const chime = author.createEntity('chime', EntityType.OBJECT);
      chime.add(new SoundingTrait({ tier: 'raised' })); // loud (ADR-392 D5)
      author.moveEntity(chime.id, nextRoom.id);
      
      const command = {
        rawInput: 'listen to chime',
        action: 'if.action.listening',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'listen', head: 'listen' },
          preposition: { tokens: [1], text: 'to' },
          directObject: { 
            tokens: [],
            text: 'chime',
            head: 'chime',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_PREP_OBJECT'      };
      
      const result = validator.validate(command);
      
      
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('chime');
    });
  });
  
  describe('DETECTABLE scope validation', () => {
    it('should succeed when smelling something smelly from another room', () => {
      const nextRoom = author.createEntity('Kitchen', EntityType.ROOM);
      nextRoom.add(new RoomTrait());
      
      // Connect rooms with open passage
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add(new DoorTrait({ room1: room.id, room2: nextRoom.id }));
      passage.add(new OpenableTrait({ isOpen: true }));
      author.moveEntity(passage.id, room.id);
      
      // Create smelly cheese in kitchen
      const cheese = author.createEntity('cheese', EntityType.OBJECT);
      cheese.add(new IdentityTrait({ name: 'cheese' }));
      cheese.add(new EdibleTrait()); // food has a scent (scope-resolver hasScent)
      author.moveEntity(cheese.id, nextRoom.id);
      
      const command = {
        rawInput: 'smell cheese',
        action: 'if.action.smelling',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'smell', head: 'smell' },
          directObject: { 
            tokens: [],
            text: 'cheese',
            head: 'cheese',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT'      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('cheese');
    });
    
    it('should resolve entity behind closed door at AWARE scope (sound passes through)', () => {
      // Smelling's directObjectScope is AWARE. The scope resolver's
      // canHear() returns true even through closed doors (sound is
      // muffled but not blocked). So the cheese is findable at AWARE
      // scope. The smelling action's validate phase then handles the
      // "too far to smell" rejection for different rooms.
      const nextRoom = author.createEntity('Kitchen', EntityType.ROOM);
      nextRoom.add(new RoomTrait());

      // Connect rooms with closed passage
      const passage = author.createEntity('passage', EntityType.DOOR);
      passage.add(new DoorTrait({ room1: room.id, room2: nextRoom.id }));
      passage.add(new OpenableTrait({ isOpen: false }));
      author.moveEntity(passage.id, room.id);

      // Create smelly cheese in kitchen
      const cheese = author.createEntity('cheese', EntityType.OBJECT);
      cheese.add(new IdentityTrait({ name: 'cheese' }));
      cheese.add(new EdibleTrait()); // food has a scent (scope-resolver hasScent)
      author.moveEntity(cheese.id, nextRoom.id);

      const command = {
        rawInput: 'smell cheese',
        action: 'if.action.smelling',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'smell', head: 'smell' },
          directObject: {
            tokens: [],
            text: 'cheese',
            head: 'cheese',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT'      };

      const result = validator.validate(command);

      // Cheese is findable at AWARE scope (canHear returns true through closed doors)
      expect(result.success).toBe(true);
      expect(valueOf(result).directObject?.entity.name).toBe('cheese');
    });
  });
  
  describe('Scope info in ValidatedCommand', () => {
    it('should include scope info in validated command', () => {
      const coin = author.createEntity('coin', EntityType.OBJECT);
      author.moveEntity(coin.id, room.id);
      
      const command = {
        rawInput: 'take coin',
        action: 'if.action.taking',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'take', head: 'take' },
          directObject: { 
            tokens: [],
            text: 'coin',
            head: 'coin',
            modifiers: [],
            articles: [],
            determiners: []
          }
        },
        pattern: 'VERB_OBJECT'      };
      
      const result = validator.validate(command);
      expect(result.success).toBe(true);
      expect(valueOf(result).scopeInfo).toBeDefined();
      // The coin is on the floor so it's reachable, not just visible
      expect(valueOf(result).scopeInfo?.directObject?.level).toBe(ScopeLevel.REACHABLE);
      expect(valueOf(result).scopeInfo?.directObject?.perceivedBy).toContain('sight');
    });
  });
});