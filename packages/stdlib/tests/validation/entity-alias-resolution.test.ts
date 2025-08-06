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
    (validator as any).systemEvents = systemEvents;

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
    
    // Debug: Check entity IDs and locations
    console.log('Test setup debug:', {
      playerId: player.id,
      roomId: room.id,
      hookId: hook.id,
      playerLocation: world.getLocation(player.id),
      hookLocation: world.getLocation(hook.id),
      roomContents: world.getContents(room.id).map(e => ({ id: e.id, name: e.name }))
    });
    
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
    // Debug: Dump complete world state
    console.log('\n=== WORLD STATE BEFORE TEST ===');
    console.log('All entities:', world.getAllEntities().map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      location: world.getLocation(e.id),
      identity: e.get('identity')
    })));
    
    console.log('\nSpatial graph:', {
      player: {
        id: player.id,
        location: world.getLocation(player.id),
        contents: world.getContents(player.id).map(e => e.id)
      },
      room: {
        id: room.id,
        location: world.getLocation(room.id),
        contents: world.getContents(room.id).map(e => ({ id: e.id, name: e.name }))
      },
      hook: {
        id: hook.id,
        location: world.getLocation(hook.id),
        contents: world.getContents(hook.id).map(e => e.id)
      }
    });
    console.log('=== END WORLD STATE ===\n');
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

    // Listen for debug events
    const debugEvents: SystemEvent[] = [];
    const systemEvents = (validator as any).systemEvents;
    if (systemEvents) {
      systemEvents.subscribe((event: SystemEvent) => {
        debugEvents.push(event);
      });
    }
    
    const result = await validator.validate(command);
    if (!result.success) {
      // Find relevant debug events
      const searchEvent = debugEvents.find(e => e.type === 'entity_search');
      const scopeEvent = debugEvents.find(e => e.type === 'scope_check');
      console.log('Entity search debug:', searchEvent?.data);
      console.log('Scope check debug:', scopeEvent?.data);
      console.log('Validation error:', result.error);
    }
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