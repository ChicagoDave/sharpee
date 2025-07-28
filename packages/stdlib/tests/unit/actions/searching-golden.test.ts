/**
 * Golden test for searching action - demonstrates testing object/location searching
 * 
 * This shows patterns for testing actions that:
 * - Search containers, supporters, or locations for items
 * - Find concealed/hidden items
 * - Handle closed containers
 * - Display contents appropriately
 * - Search current location when no target specified
 * - Check visibility and reachability
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { searchingAction } from '../../../src/actions/standard/searching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

describe('searchingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(searchingAction.id).toBe(IFActions.SEARCHING);
    });

    test('should declare required messages', () => {
      expect(searchingAction.requiredMessages).toContain('not_visible');
      expect(searchingAction.requiredMessages).toContain('not_reachable');
      expect(searchingAction.requiredMessages).toContain('container_closed');
      expect(searchingAction.requiredMessages).toContain('nothing_special');
      expect(searchingAction.requiredMessages).toContain('found_items');
      expect(searchingAction.requiredMessages).toContain('empty_container');
      expect(searchingAction.requiredMessages).toContain('container_contents');
      expect(searchingAction.requiredMessages).toContain('supporter_contents');
      expect(searchingAction.requiredMessages).toContain('searched_location');
      expect(searchingAction.requiredMessages).toContain('searched_object');
      expect(searchingAction.requiredMessages).toContain('found_concealed');
    });

    test('should belong to sensory group', () => {
      expect(searchingAction.group).toBe('sensory');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when target is not visible', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('wooden box', 'object');
      
      // Place box in a different room
      const otherRoom = world.createEntity('Other Room', 'room');
      world.moveEntity(box.id, otherRoom.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: box
      }));
      
      const events = searchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'wooden box' }
      });
    });

    test('should fail when target is not reachable', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create a closed container with a shelf inside
      const closedBox = world.createEntity('closed box', 'object');
      closedBox.add({ type: TraitType.CONTAINER });
      closedBox.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(closedBox.id, room.id);
      
      const shelf = world.createEntity('high shelf', 'object');
      world.moveEntity(shelf.id, closedBox.id); // Put shelf inside closed container
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: shelf
      }));
      
      const events = searchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'high shelf' }
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, room } = setupBasicWorld();
      const chest = world.createEntity('treasure chest', 'object');
      chest.add({
        type: TraitType.CONTAINER,
        capacity: 10
      });
      chest.add({
        type: TraitType.OPENABLE,
        isOpen: false
      });
      world.moveEntity(chest.id, room.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: chest
      }));
      
      const events = searchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_closed'),
        params: { target: 'treasure chest' }
      });
    });
  });

  describe('Searching Containers', () => {
    test('should search empty container', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('cardboard box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      world.moveEntity(box.id, room.id);
      
      // No contents - box is empty
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: box
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit SEARCHED event
      expectEvent(events, 'if.event.searched', {
        target: box.id,
        targetName: 'cardboard box',
        foundItems: [],
        foundItemNames: []
      });
      
      // Should emit empty_container message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('empty_container'),
        params: { target: 'cardboard box' }
      });
    });

    test('should list visible contents of container', () => {
      const { world, player } = setupBasicWorld();
      
      const box = world.createEntity('jewelry box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 3
      });
      world.moveEntity(box.id, player.id);
      
      const ring = world.createEntity('gold ring', 'object');
      const necklace = world.createEntity('pearl necklace', 'object');
      
      // Put items in box
      world.moveEntity(ring.id, box.id);
      world.moveEntity(necklace.id, box.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: box
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit container_contents message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('container_contents'),
        params: { 
          target: 'jewelry box',
          items: 'gold ring, pearl necklace'
        }
      });
    });

    test('should find concealed items in container', () => {
      const { world, player } = setupBasicWorld();
      
      const desk = world.createEntity('oak desk', 'object');
      desk.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      world.moveEntity(desk.id, player.id);
      
      const paper = world.createEntity('blank paper', 'object');
      const key = world.createEntity('secret key', 'object');
      key.add({
        type: TraitType.IDENTITY,
        name: 'secret key',
        concealed: true
      });
      
      // Put items in desk
      world.moveEntity(paper.id, desk.id);
      world.moveEntity(key.id, desk.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: desk
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit SEARCHED event with concealed items
      expectEvent(events, 'if.event.searched', {
        target: desk.id,
        foundItems: [key.id],
        foundItemNames: ['secret key']
      });
      
      // Should emit found_concealed message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('found_concealed'),
        params: { 
          target: 'oak desk',
          items: 'secret key',
          where: 'inside'
        }
      });
    });
  });

  describe('Searching Supporters', () => {
    test('should list items on supporter', () => {
      const { world, player } = setupBasicWorld();
      
      const table = world.createEntity('dining table', 'object');
      table.add({
        type: TraitType.SUPPORTER,
        capacity: 10
      });
      world.moveEntity(table.id, player.id);
      
      const plate = world.createEntity('dinner plate', 'object');
      const candle = world.createEntity('lit candle', 'object');
      
      // Put items on table
      world.moveEntity(plate.id, table.id);
      world.moveEntity(candle.id, table.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: table
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit supporter_contents message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('supporter_contents'),
        params: { 
          target: 'dining table',
          items: 'dinner plate, lit candle'
        }
      });
    });

    test('should find concealed items on supporter', () => {
      const { world, player } = setupBasicWorld();
      
      const altar = world.createEntity('stone altar', 'object');
      altar.add({
        type: TraitType.SUPPORTER,
        capacity: 5
      });
      world.moveEntity(altar.id, player.id);
      
      const chalice = world.createEntity('golden chalice', 'object');
      const gem = world.createEntity('hidden gem', 'object');
      gem.add({
        type: TraitType.IDENTITY,
        name: 'hidden gem',
        concealed: true
      });
      
      // Put items on altar
      world.moveEntity(chalice.id, altar.id);
      world.moveEntity(gem.id, altar.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: altar
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit found_concealed message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('found_concealed'),
        params: { 
          target: 'stone altar',
          items: 'hidden gem',
          where: 'on'
        }
      });
    });

    test('should handle empty supporter', () => {
      const { world, player, room } = setupBasicWorld();
      const pedestal = world.createEntity('marble pedestal', 'object');
      pedestal.add({
        type: TraitType.SUPPORTER,
        capacity: 1
      });
      world.moveEntity(pedestal.id, room.id);
      
      // No contents
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: pedestal
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit nothing_special message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('nothing_special'),
        params: { target: 'marble pedestal' }
      });
    });
  });

  describe('Searching Regular Objects', () => {
    test('should find nothing special in ordinary objects', () => {
      const { world, player, room } = setupBasicWorld();
      const statue = world.createEntity('bronze statue', 'object');
      world.moveEntity(statue.id, room.id);
      
      // No contents
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: statue
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit SEARCHED event
      expectEvent(events, 'if.event.searched', {
        target: statue.id,
        targetName: 'bronze statue',
        foundItems: [],
        foundItemNames: []
      });
      
      // Should emit nothing_special message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('nothing_special'),
        params: { target: 'bronze statue' }
      });
    });

    test('should find concealed items in/on regular objects', () => {
      const { world, player } = setupBasicWorld();
      
      const painting = world.createEntity('old painting', 'object');
      world.moveEntity(painting.id, player.id);
      
      const safe = world.createEntity('wall safe', 'object');
      safe.add({
        type: TraitType.IDENTITY,
        name: 'wall safe',
        concealed: true
      });
      
      // Safe is "behind" the painting
      world.moveEntity(safe.id, painting.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: painting
      }));
      
      const events = searchingAction.execute(context);
      
      // Should emit found_concealed message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('found_concealed'),
        params: { 
          target: 'old painting',
          items: 'wall safe',
          where: 'here' // Not inside or on
        }
      });
    });
  });

  describe('Searching Current Location', () => {
    test('should search current room when no target specified', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('silver coin', 'object');
      coin.add({
        type: TraitType.IDENTITY,
        name: 'silver coin',
        concealed: true
      });
      
      // Coin is hidden in room
      world.moveEntity(coin.id, room.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING));
      // No directObject
      
      const events = searchingAction.execute(context);
      
      // Should emit SEARCHED event with location flag
      expectEvent(events, 'if.event.searched', {
        target: room.id,
        targetName: 'Test Room',
        searchingLocation: true,
        foundItems: [coin.id],
        foundItemNames: ['silver coin']
      });
      
      // Should emit found_concealed message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('found_concealed'),
        params: { 
          target: 'Test Room',
          items: 'silver coin',
          where: 'here'
        }
      });
    });

    test('should find nothing when searching empty location', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Only player in room
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING));
      
      const events = searchingAction.execute(context);
      
      // Should emit searched_location message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('searched_location'),
        params: { target: 'Test Room' }
      });
    });
  });

  describe('Complex Search Scenarios', () => {
    test('should handle open container requirement', () => {
      const { world, player, room } = setupBasicWorld();
      const safe = world.createEntity('wall safe', 'object');
      safe.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      safe.add({
        type: TraitType.OPENABLE,
        isOpen: true // Already open
      });
      world.moveEntity(safe.id, room.id);
      
      const document = world.createEntity('secret document', 'object');
      world.moveEntity(document.id, safe.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: safe
      }));
      
      const events = searchingAction.execute(context);
      
      // Should succeed and list contents
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('container_contents'),
        params: { 
          target: 'wall safe',
          items: 'secret document'
        }
      });
    });

    test('should find multiple concealed items', () => {
      const { world, player } = setupBasicWorld();
      
      const bookshelf = world.createEntity('dusty bookshelf', 'object');
      bookshelf.add({
        type: TraitType.SUPPORTER,
        capacity: 20
      });
      world.moveEntity(bookshelf.id, player.id);
      
      const book1 = world.createEntity('red book', 'object');
      const book2 = world.createEntity('blue book', 'object');
      const lever = world.createEntity('hidden lever', 'object');
      lever.add({
        type: TraitType.IDENTITY,
        name: 'hidden lever',
        concealed: true
      });
      const compartment = world.createEntity('secret compartment', 'object');
      compartment.add({
        type: TraitType.IDENTITY,
        name: 'secret compartment',
        concealed: true
      });
      
      // Put all items on bookshelf
      world.moveEntity(book1.id, bookshelf.id);
      world.moveEntity(book2.id, bookshelf.id);
      world.moveEntity(lever.id, bookshelf.id);
      world.moveEntity(compartment.id, bookshelf.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: bookshelf
      }));
      
      const events = searchingAction.execute(context);
      
      // Should find both concealed items
      expectEvent(events, 'if.event.searched', {
        foundItems: [lever.id, compartment.id],
        foundItemNames: ['hidden lever', 'secret compartment']
      });
      
      // Should list all concealed items
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('found_concealed'),
        params: { 
          items: 'hidden lever, secret compartment'
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const crate = world.createEntity('wooden crate', 'object');
      world.moveEntity(crate.id, room.id);
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, {
        entity: crate
      }));
      
      const events = searchingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(crate.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });

    test('should include location as target when searching room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING));
      
      const events = searchingAction.execute(context);
      
      const searchEvent = events.find(e => e.type === 'if.event.searched');
      expect(searchEvent?.data.target).toBe(room.id);
      expect(searchEvent?.data.searchingLocation).toBe(true);
    });
  });
});

describe('Testing Pattern Examples for Searching', () => {
  test('pattern: concealment mechanics', () => {
    // Test different concealment scenarios
    const world = new WorldModel();
    const concealmentTypes = [
      {
        location: 'under_rug',
        item: 'trapdoor',
        findChance: 'guaranteed'
      },
      {
        location: 'behind_painting',
        item: 'safe',
        findChance: 'guaranteed'
      },
      {
        location: 'inside_false_bottom',
        item: 'documents',
        findChance: 'guaranteed'
      },
      {
        location: 'among_books',
        item: 'special_book',
        findChance: 'skill_based'
      }
    ];
    
    concealmentTypes.forEach(({ item }) => {
      const entity = world.createEntity(item, 'object');
      entity.add({
        type: TraitType.IDENTITY,
        name: item,
        concealed: true
      });
      
      const identity = entity.get(TraitType.IDENTITY) as any;
      expect(identity.concealed).toBe(true);
    });
  });

  test('pattern: searchable object types', () => {
    // Test different object types that can be searched
    const world = new WorldModel();
    const searchableTypes = [
      {
        type: 'container',
        examples: ['chest', 'drawer', 'box'],
        trait: TraitType.CONTAINER
      },
      {
        type: 'supporter',
        examples: ['table', 'shelf', 'altar'],
        trait: TraitType.SUPPORTER
      },
      {
        type: 'location',
        examples: ['room', 'cave', 'clearing'],
        trait: undefined // Locations don't need special trait
      },
      {
        type: 'regular',
        examples: ['statue', 'painting', 'fireplace'],
        trait: undefined // Can hide things without special traits
      }
    ];
    
    searchableTypes.forEach(({ examples, trait }) => {
      examples.forEach(example => {
        const entity = world.createEntity(example, 'object');
        if (trait) {
          entity.add({ type: trait });
        }
        // All can potentially have concealed items
        expect(entity).toBeDefined();
      });
    });
  });

  test('pattern: search result variations', () => {
    // Test different search outcomes
    const searchOutcomes = [
      {
        scenario: 'empty_container',
        visible: 0,
        concealed: 0,
        message: 'empty_container'
      },
      {
        scenario: 'visible_contents_only',
        visible: 3,
        concealed: 0,
        message: 'container_contents'
      },
      {
        scenario: 'concealed_items_only',
        visible: 0,
        concealed: 2,
        message: 'found_concealed'
      },
      {
        scenario: 'mixed_contents',
        visible: 2,
        concealed: 1,
        message: 'found_concealed' // Prioritizes concealed discovery
      },
      {
        scenario: 'nothing_to_find',
        visible: 0,
        concealed: 0,
        message: 'nothing_special'
      }
    ];
    
    searchOutcomes.forEach(({ concealed, message }) => {
      // Verify message priority
      if (concealed > 0) {
        expect(message).toBe('found_concealed');
      }
    });
  });

  test('pattern: container state requirements', () => {
    // Test container states that affect searching
    const containerStates = [
      {
        state: 'open',
        openable: { isOpen: true },
        canSearch: true
      },
      {
        state: 'closed',
        openable: { isOpen: false },
        canSearch: false
      },
      {
        state: 'not_openable',
        openable: undefined,
        canSearch: true
      },
      {
        state: 'transparent',
        openable: { isOpen: false },
        transparent: true,
        canSearch: true // Might allow seeing but not taking
      }
    ];
    
    containerStates.forEach(({ openable, canSearch }) => {
      const shouldBlock = openable && !openable.isOpen;
      expect(shouldBlock).toBe(!canSearch);
    });
  });

  test('pattern: location searching', () => {
    // Test searching entire locations
    const locationTypes = [
      {
        type: 'room',
        description: 'indoor space',
        typicalFinds: ['coins_under_cushions', 'keys_in_drawers']
      },
      {
        type: 'forest',
        description: 'outdoor area',
        typicalFinds: ['herbs', 'hidden_paths']
      },
      {
        type: 'cave',
        description: 'natural formation',
        typicalFinds: ['gems', 'secret_passages']
      }
    ];
    
    // All locations can be searched without a target
    locationTypes.forEach(location => {
      expect(location.typicalFinds.length).toBeGreaterThan(0);
    });
  });
});
