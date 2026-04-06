import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, IdentityTrait, SupporterTrait, RoomTrait, TraitType, EntityType } from '@sharpee/world-model';
import { CommandValidator } from '../../src/validation/command-validator';
import { StandardActionRegistry } from '../../src/actions/registry';
import { standardActions } from '../../src/actions/standard/index';
import { ParsedCommand, NounPhrase } from '@sharpee/world-model';
import { createSemanticEventSource, SystemEvent } from '@sharpee/core';

describe('Entity alias resolution', () => {
  let world: WorldModel;
  let validator: CommandValidator;
  let registry: StandardActionRegistry;
  let player: IFEntity;
  let room: IFEntity;
  let hook: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    registry = new StandardActionRegistry();
    
    // Register standard actions
    for (const action of standardActions) {
      registry.register(action);
    }
    
    validator = new CommandValidator(world, registry);
    
    // Set up debug event capture
    const systemEvents = createSemanticEventSource();
    (validator as unknown as { systemEvents: ReturnType<typeof createSemanticEventSource> }).systemEvents = systemEvents;

    // Create room
    room = world.createEntity('Test Room', EntityType.ROOM);
    room.add(new RoomTrait({
      exits: {}
    }));
    
    // Create player
    player = world.createEntity('Test Player', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'Test Player',
      properName: true
    }));
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);
    
    // Create hook with aliases
    hook = world.createEntity('brass hook', EntityType.OBJECT);
    hook.add(new IdentityTrait({
      name: 'brass hook',
      description: 'A small brass hook screwed to the wall.',
      aliases: ['hook', 'peg', 'brass hook'],
      properName: false,
      article: 'a'
    }));
    hook.add(new SupporterTrait({
      capacity: { maxItems: 1 }
    }));
    world.moveEntity(hook.id, room.id);
    
    // Add default visibility scope rules
    world.addScopeRule({
      id: 'test_room_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const results = [];
        // Include the current location
        results.push(context.currentLocation);
        // Include contents of current location
        const contents = context.world.getContents(context.currentLocation);
        results.push(...contents.map(e => e.id));
        return results;
      }
    });
    
    world.addScopeRule({
      id: 'test_inventory_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        // Include carried items
        const carried = context.world.getContents(context.actorId);
        return carried.map(e => e.id);
      }
    });
  });

  it('should find entity by its primary name', async () => {
    const command: ParsedCommand = {
      pattern: 'VERB_NOUN',
      confidence: 1,
      action: 'if.action.examining',
      structure: {
        verb: 'examine',
        directObject: {
          text: 'brass hook',
          head: 'hook',
          modifiers: ['brass'],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase
      }
    };

    const result = await validator.validate(command);
    expect(result.success).toBe(true);
    if (result.success && result.value.directObject) {
      expect(result.value.directObject.entity.id).toBe(hook.id);
    }
  });

  it('should find entity by alias "hook"', async () => {
    const command: ParsedCommand = {
      pattern: 'VERB_NOUN',
      confidence: 1,
      action: 'if.action.examining',
      structure: {
        verb: 'examine',
        directObject: {
          text: 'hook',
          head: 'hook',
          modifiers: [],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase
      }
    };

    const result = await validator.validate(command);
    expect(result.success).toBe(true);
    if (result.success && result.value.directObject) {
      expect(result.value.directObject.entity.id).toBe(hook.id);
    }
  });

  it('should find entity by alias "peg"', async () => {
    const command: ParsedCommand = {
      pattern: 'VERB_NOUN',
      confidence: 1,
      action: 'if.action.examining',
      structure: {
        verb: 'examine',
        directObject: {
          text: 'peg',
          head: 'peg',
          modifiers: [],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase
      }
    };

    const result = await validator.validate(command);
    expect(result.success).toBe(true);
    if (result.success && result.value.directObject) {
      expect(result.value.directObject.entity.id).toBe(hook.id);
    }
  });

  it('should find entity as indirect object for PUT action', async () => {
    // Create a cloak to put on the hook
    const cloak = world.createEntity('velvet cloak', EntityType.ITEM);
    cloak.add(new IdentityTrait({
      name: 'velvet cloak',
      aliases: ['cloak'],
      description: 'A handsome cloak of velvet.',
      properName: false,
      article: 'a'
    }));
    world.moveEntity(cloak.id, player.id); // Player is carrying it
    
    const command: ParsedCommand = {
      pattern: 'VERB_NOUN_PREP_NOUN',
      confidence: 1,
      action: 'if.action.putting',
      structure: {
        verb: 'hang',
        directObject: {
          text: 'cloak',
          head: 'cloak',
          modifiers: [],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase,
        preposition: 'on',
        indirectObject: {
          text: 'hook',
          head: 'hook',
          modifiers: [],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase
      }
    };

    const result = await validator.validate(command);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.directObject?.entity.id).toBe(cloak.id);
      expect(result.value.indirectObject?.entity.id).toBe(hook.id);
    }
  });

  describe('multi-word alias resolution (ISSUE-057)', () => {
    let bushBabies: IFEntity;

    beforeEach(() => {
      // Create entity with multi-word aliases and no single-word fallback
      bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
      bushBabies.add(new IdentityTrait({
        name: 'bush babies',
        description: 'A family of bush babies peers at you from the branches.',
        aliases: ['bush babies', 'bush baby', 'galagos'],
        properName: false,
        article: 'the'
      }));
      world.moveEntity(bushBabies.id, room.id);
    });

    it('should resolve multi-word alias "bush babies" via full text match', async () => {
      const command: ParsedCommand = {
        pattern: 'VERB_NOUN',
        confidence: 1,
        action: 'if.action.examining',
        structure: {
          verb: 'examine',
          directObject: {
            text: 'bush babies',
            head: 'babies',     // Parser sets head to last token
            modifiers: ['bush'],
            determiner: null,
            quantity: null,
            isAll: false
          } as NounPhrase
        }
      };

      const result = await validator.validate(command);
      expect(result.success).toBe(true);
      if (result.success && result.value.directObject) {
        expect(result.value.directObject.entity.id).toBe(bushBabies.id);
      }
    });

    it('should resolve single-word alias "galagos" normally', async () => {
      const command: ParsedCommand = {
        pattern: 'VERB_NOUN',
        confidence: 1,
        action: 'if.action.examining',
        structure: {
          verb: 'examine',
          directObject: {
            text: 'galagos',
            head: 'galagos',
            modifiers: [],
            determiner: null,
            quantity: null,
            isAll: false
          } as NounPhrase
        }
      };

      const result = await validator.validate(command);
      expect(result.success).toBe(true);
      if (result.success && result.value.directObject) {
        expect(result.value.directObject.entity.id).toBe(bushBabies.id);
      }
    });

    it('should resolve multi-word entity name as primary name', async () => {
      // "bush babies" is the entity name, not just an alias
      const command: ParsedCommand = {
        pattern: 'VERB_NOUN',
        confidence: 1,
        action: 'if.action.examining',
        structure: {
          verb: 'examine',
          directObject: {
            text: 'bush babies',
            head: 'babies',
            modifiers: ['bush'],
            determiner: null,
            quantity: null,
            isAll: false
          } as NounPhrase
        }
      };

      const result = await validator.validate(command);
      expect(result.success).toBe(true);
    });

    it('should prefer full text match over head-only match for disambiguation', async () => {
      // Create a second entity that matches "babies" (head token)
      const babies = world.createEntity('babies', EntityType.OBJECT);
      babies.add(new IdentityTrait({
        name: 'babies',
        description: 'Some baby dolls.',
        aliases: ['babies', 'dolls'],
        properName: false,
        article: 'the'
      }));
      world.moveEntity(babies.id, room.id);

      // "examine bush babies" — full text "bush babies" should match bush-babies entity,
      // not the "babies" entity (which only matches the head token)
      const command: ParsedCommand = {
        pattern: 'VERB_NOUN',
        confidence: 1,
        action: 'if.action.examining',
        structure: {
          verb: 'examine',
          directObject: {
            text: 'bush babies',
            head: 'babies',
            modifiers: ['bush'],
            determiner: null,
            quantity: null,
            isAll: false
          } as NounPhrase
        }
      };

      const result = await validator.validate(command);
      expect(result.success).toBe(true);
      if (result.success && result.value.directObject) {
        expect(result.value.directObject.entity.id).toBe(bushBabies.id);
      }
    });

    it('should fall back to head noun when full text has no match', async () => {
      // "examine old hook" — no entity named "old hook", but "hook" is an alias
      const command: ParsedCommand = {
        pattern: 'VERB_NOUN',
        confidence: 1,
        action: 'if.action.examining',
        structure: {
          verb: 'examine',
          directObject: {
            text: 'old hook',
            head: 'hook',
            modifiers: ['old'],
            determiner: null,
            quantity: null,
            isAll: false
          } as NounPhrase
        }
      };

      const result = await validator.validate(command);
      expect(result.success).toBe(true);
      if (result.success && result.value.directObject) {
        expect(result.value.directObject.entity.id).toBe(hook.id);
      }
    });
  });

  it('should handle entities with same aliases in different locations', async () => {
    // Create another room with another hook
    const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
    otherRoom.add(new RoomTrait({ exits: {} }));
    
    const otherHook = world.createEntity('iron hook', EntityType.OBJECT);
    otherHook.add(new IdentityTrait({
      name: 'iron hook',
      aliases: ['hook', 'iron hook'],
      description: 'A rusty iron hook.',
      properName: false,
      article: 'an'
    }));
    world.moveEntity(otherHook.id, otherRoom.id);
    
    // Player should only see the hook in their current room
    const command: ParsedCommand = {
      pattern: 'VERB_NOUN',
      confidence: 1,
      action: 'if.action.examining',
      structure: {
        verb: 'examine',
        directObject: {
          text: 'hook',
          head: 'hook',
          modifiers: [],
          determiner: null,
          quantity: null,
          isAll: false
        } as NounPhrase
      }
    };

    const result = await validator.validate(command);
    expect(result.success).toBe(true);
    if (result.success && result.value.directObject) {
      // Should find the brass hook in the player's room, not the iron hook in the other room
      expect(result.value.directObject.entity.id).toBe(hook.id);
      const identity = result.value.directObject.entity.get('identity') as IdentityTrait;
      expect(identity.name).toBe('brass hook');
    }
  });
});