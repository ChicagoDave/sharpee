/**
 * Tests for the opened→revealed event chain (ADR-094 Phase 2)
 *
 * Tests that opening a container with contents triggers a revealed event
 * with the list of items inside.
 */

import { WorldModel, ContainerTrait, OpenableTrait, TraitType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { createOpenedRevealedChain, OPENED_REVEALED_CHAIN_KEY } from '../../../src/chains/opened-revealed';
import { RevealedEventData } from '../../../src/actions/standard/opening/opening-events';

describe('Opened→Revealed Chain (ADR-094)', () => {
  let world: WorldModel;
  let chainHandler: ReturnType<typeof createOpenedRevealedChain>;

  beforeEach(() => {
    world = new WorldModel();
    chainHandler = createOpenedRevealedChain();
  });

  // Helper to create a test opened event
  function createOpenedEvent(targetId: string, targetName: string): ISemanticEvent {
    return {
      id: `opened-${Date.now()}`,
      type: 'if.event.opened',
      timestamp: Date.now(),
      entities: { target: targetId },
      data: { targetId, targetName }
    };
  }

  describe('basic behavior', () => {
    it('should return revealed event when container has contents', () => {
      // Create container with contents
      const chest = world.createEntity('wooden chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const coin = world.createEntity('gold coin', 'object');
      world.moveEntity(coin.id, chest.id);

      // Invoke chain handler
      const openedEvent = createOpenedEvent(chest.id, 'wooden chest');
      const result = chainHandler(openedEvent, world);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('if.event.revealed');

      const data = result!.data as RevealedEventData;
      expect(data.containerId).toBe(chest.id);
      expect(data.containerName).toBe('wooden chest');
      expect(data.items).toHaveLength(1);
      expect(data.items[0].entityId).toBe(coin.id);
    });

    it('should return null for non-containers', () => {
      // Create non-container object
      const door = world.createEntity('oak door', 'door');
      door.add(new OpenableTrait({ isOpen: true }));

      const openedEvent = createOpenedEvent(door.id, 'oak door');
      const result = chainHandler(openedEvent, world);

      expect(result).toBeNull();
    });

    it('should return null for empty containers', () => {
      // Create container with no contents
      const box = world.createEntity('empty box', 'container');
      box.add(new ContainerTrait());
      box.add(new OpenableTrait({ isOpen: true }));

      const openedEvent = createOpenedEvent(box.id, 'empty box');
      const result = chainHandler(openedEvent, world);

      expect(result).toBeNull();
    });

    it('should return null when target entity not found', () => {
      const openedEvent = createOpenedEvent('nonexistent-id', 'mystery box');
      const result = chainHandler(openedEvent, world);

      expect(result).toBeNull();
    });

    it('should return null when targetId is missing', () => {
      const openedEvent: ISemanticEvent = {
        id: 'opened-1',
        type: 'if.event.opened',
        timestamp: Date.now(),
        entities: {},
        data: { targetName: 'something' }
      };

      const result = chainHandler(openedEvent, world);

      expect(result).toBeNull();
    });
  });

  describe('multiple items', () => {
    it('should list all items in revealed event', () => {
      // Create container with multiple items
      const sack = world.createEntity('leather sack', 'container');
      sack.add(new ContainerTrait());
      sack.add(new OpenableTrait({ isOpen: true }));

      const apple = world.createEntity('apple', 'object');
      const bread = world.createEntity('bread', 'object');
      const cheese = world.createEntity('cheese', 'object');

      world.moveEntity(apple.id, sack.id);
      world.moveEntity(bread.id, sack.id);
      world.moveEntity(cheese.id, sack.id);

      const openedEvent = createOpenedEvent(sack.id, 'leather sack');
      const result = chainHandler(openedEvent, world);

      expect(result).not.toBeNull();
      const data = result!.data as RevealedEventData;
      expect(data.items).toHaveLength(3);

      const itemIds = data.items.map(i => i.entityId);
      expect(itemIds).toContain(apple.id);
      expect(itemIds).toContain(bread.id);
      expect(itemIds).toContain(cheese.id);
    });
  });

  describe('event data structure', () => {
    it('should include container in entities.target field', () => {
      const trunk = world.createEntity('trunk', 'container');
      trunk.add(new ContainerTrait());
      trunk.add(new OpenableTrait({ isOpen: true }));

      const jewel = world.createEntity('jewel', 'object');
      world.moveEntity(jewel.id, trunk.id);

      const openedEvent = createOpenedEvent(trunk.id, 'trunk');
      const result = chainHandler(openedEvent, world);

      expect(result!.entities.target).toBe(trunk.id);
    });

    it('should include item ids in entities.others field', () => {
      const trunk = world.createEntity('trunk', 'container');
      trunk.add(new ContainerTrait());
      trunk.add(new OpenableTrait({ isOpen: true }));

      const jewel = world.createEntity('jewel', 'object');
      const ring = world.createEntity('ring', 'object');
      world.moveEntity(jewel.id, trunk.id);
      world.moveEntity(ring.id, trunk.id);

      const openedEvent = createOpenedEvent(trunk.id, 'trunk');
      const result = chainHandler(openedEvent, world);

      expect(result!.entities.others).toContain(jewel.id);
      expect(result!.entities.others).toContain(ring.id);
    });

    it('should generate unique event id', () => {
      const chest = world.createEntity('chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const coin = world.createEntity('coin', 'object');
      world.moveEntity(coin.id, chest.id);

      const openedEvent = createOpenedEvent(chest.id, 'chest');
      const result = chainHandler(openedEvent, world);

      expect(result!.id).toBeDefined();
      expect(result!.id).toMatch(/^revealed-/);
    });

    it('should set event type to if.event.revealed', () => {
      const chest = world.createEntity('chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const coin = world.createEntity('coin', 'object');
      world.moveEntity(coin.id, chest.id);

      const openedEvent = createOpenedEvent(chest.id, 'chest');
      const result = chainHandler(openedEvent, world);

      expect(result!.type).toBe('if.event.revealed');
    });

    it('should include timestamp', () => {
      const before = Date.now();

      const chest = world.createEntity('chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const coin = world.createEntity('coin', 'object');
      world.moveEntity(coin.id, chest.id);

      const openedEvent = createOpenedEvent(chest.id, 'chest');
      const result = chainHandler(openedEvent, world);

      const after = Date.now();

      expect(result!.timestamp).toBeGreaterThanOrEqual(before);
      expect(result!.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('item message IDs', () => {
    it('should use item name as messageId', () => {
      const chest = world.createEntity('chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const sword = world.createEntity('shiny sword', 'object');
      world.moveEntity(sword.id, chest.id);

      const openedEvent = createOpenedEvent(chest.id, 'chest');
      const result = chainHandler(openedEvent, world);

      const data = result!.data as RevealedEventData;
      expect(data.items[0].messageId).toBe('shiny sword');
    });

    it('should fall back to entity id if no name', () => {
      const chest = world.createEntity('chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      // Create entity with blank name
      const item = world.createEntity('', 'object');
      world.moveEntity(item.id, chest.id);

      const openedEvent = createOpenedEvent(chest.id, 'chest');
      const result = chainHandler(openedEvent, world);

      const data = result!.data as RevealedEventData;
      // Should fall back to item id since name is empty
      expect(data.items[0].messageId).toBe(item.id);
    });
  });

  describe('chain key constant', () => {
    it('should export the chain key constant', () => {
      expect(OPENED_REVEALED_CHAIN_KEY).toBe('stdlib.chain.opened-revealed');
    });
  });

  describe('handler uses entity name from world when not in event', () => {
    it('should use entity name from world if targetName not provided', () => {
      const chest = world.createEntity('iron chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: true }));

      const coin = world.createEntity('coin', 'object');
      world.moveEntity(coin.id, chest.id);

      // Create event without targetName
      const openedEvent: ISemanticEvent = {
        id: 'opened-1',
        type: 'if.event.opened',
        timestamp: Date.now(),
        entities: {},
        data: { targetId: chest.id }
      };

      const result = chainHandler(openedEvent, world);

      const data = result!.data as RevealedEventData;
      expect(data.containerName).toBe('iron chest');
    });
  });
});
