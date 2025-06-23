/**
 * Tests for trait-aware action execution pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStory } from '../../src/story/story-trait-aware';
import { createEnglishLanguagePlugin } from '../../../lang-en-us/src';
import { IFEntity } from '../../src/world-model/traits/if-entity';
import { TraitType } from '../../src/world-model/traits/trait-types';
import { PortableTrait } from '../../src/world-model/traits/standard/portable';
import { ContainerTrait } from '../../src/world-model/traits/standard/container';
import { OpenableTrait } from '../../src/world-model/traits/standard/openable';
import { IFEvents } from '../../src/constants/if-events';

describe('Trait-Aware Action Execution', () => {
  let story: any;
  let world: any;
  let player: IFEntity;
  let room: IFEntity;
  
  beforeEach(() => {
    // Create story with trait-based actions enabled
    story = createStory({
      useTraitBasedActions: true
    });
    
    // Set language
    story.languageSet(createEnglishLanguagePlugin());
    
    // Get world and create entities
    world = story.getWorld();
    
    // Create a test room
    room = world.createEntity('test-room', 'location');
    room.add(TraitType.IDENTITY, { 
      name: 'Test Room',
      description: 'A room for testing.'
    });
    
    // Get player and set location
    player = world.getEntity('player')!;
    world.moveEntity(player.id, room.id);
  });
  
  describe('Basic Action Execution', () => {
    it('should execute examining action with trait context', async () => {
      // Create a test object
      const lamp = world.createEntity('lamp', 'thing');
      lamp.add(TraitType.IDENTITY, {
        name: 'brass lamp',
        description: 'A shiny brass lamp.'
      });
      lamp.add(TraitType.PORTABLE, { weight: 1 });
      world.moveEntity(lamp.id, room.id);
      
      // Process the examine command
      const events = await story.processInput('examine lamp');
      
      // Should have successful examination event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.ITEM_EXAMINED);
      expect(events[0].data.itemId).toBe(lamp.id);
    });
    
    it('should execute taking action with trait validation', async () => {
      // Create a portable object
      const book = world.createEntity('book', 'thing');
      book.add(TraitType.IDENTITY, {
        name: 'book',
        description: 'A dusty old book.'
      });
      book.add(TraitType.PORTABLE, { weight: 1 });
      world.moveEntity(book.id, room.id);
      
      // Process the take command
      const events = await story.processInput('take book');
      
      // Should have successful take event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.ITEM_TAKEN);
      expect(events[0].data.itemId).toBe(book.id);
      
      // Book should now be in player's inventory
      expect(world.getLocation(book.id)).toBe(player.id);
    });
    
    it('should fail taking fixed objects', async () => {
      // Create a fixed object
      const statue = world.createEntity('statue', 'thing');
      statue.add(TraitType.IDENTITY, {
        name: 'statue',
        description: 'A heavy marble statue.'
      });
      statue.add(TraitType.FIXED, {});
      world.moveEntity(statue.id, room.id);
      
      // Process the take command
      const events = await story.processInput('take statue');
      
      // Should have action failed event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.ACTION_FAILED);
      expect(events[0].data.message).toContain("can't");
      
      // Statue should still be in room
      expect(world.getLocation(statue.id)).toBe(room.id);
    });
  });
  
  describe('Container Actions', () => {
    it('should handle opening containers', async () => {
      // Create a closeable container
      const box = world.createEntity('box', 'thing');
      box.add(TraitType.IDENTITY, {
        name: 'wooden box',
        description: 'A wooden box with a lid.'
      });
      box.add(TraitType.PORTABLE, { weight: 2 });
      box.add(TraitType.CONTAINER, { capacity: 10 });
      box.add(TraitType.OPENABLE, { isOpen: false });
      world.moveEntity(box.id, room.id);
      
      // Process the open command
      const events = await story.processInput('open box');
      
      // Should have successful open event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.CONTAINER_OPENED);
      expect(events[0].data.itemId).toBe(box.id);
      
      // Box should now be open
      const openable = box.get<OpenableTrait>(TraitType.OPENABLE);
      expect(openable?.isOpen).toBe(true);
    });
    
    it('should handle putting items in containers', async () => {
      // Create an open container and an item
      const basket = world.createEntity('basket', 'thing');
      basket.add(TraitType.IDENTITY, {
        name: 'wicker basket',
        description: 'A woven basket.'
      });
      basket.add(TraitType.PORTABLE, { weight: 1 });
      basket.add(TraitType.CONTAINER, { capacity: 5 });
      basket.add(TraitType.OPENABLE, { isOpen: true });
      world.moveEntity(basket.id, room.id);
      
      const apple = world.createEntity('apple', 'thing');
      apple.add(TraitType.IDENTITY, {
        name: 'red apple',
        description: 'A fresh red apple.'
      });
      apple.add(TraitType.PORTABLE, { weight: 1 });
      world.moveEntity(apple.id, player.id); // Player holds apple
      
      // Process the put command
      const events = await story.processInput('put apple in basket');
      
      // Should have successful put event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.ITEM_PUT_IN);
      expect(events[0].data.itemId).toBe(apple.id);
      expect(events[0].data.containerId).toBe(basket.id);
      
      // Apple should now be in basket
      expect(world.getLocation(apple.id)).toBe(basket.id);
    });
  });
  
  describe('ALL Command Handling', () => {
    it('should handle ALL commands with trait validation', async () => {
      // Create multiple portable objects
      const coin1 = world.createEntity('coin1', 'thing');
      coin1.add(TraitType.IDENTITY, { name: 'gold coin' });
      coin1.add(TraitType.PORTABLE, { weight: 0.1 });
      world.moveEntity(coin1.id, room.id);
      
      const coin2 = world.createEntity('coin2', 'thing');
      coin2.add(TraitType.IDENTITY, { name: 'silver coin' });
      coin2.add(TraitType.PORTABLE, { weight: 0.1 });
      world.moveEntity(coin2.id, room.id);
      
      const rock = world.createEntity('rock', 'thing');
      rock.add(TraitType.IDENTITY, { name: 'heavy rock' });
      rock.add(TraitType.FIXED, {}); // Not portable
      world.moveEntity(rock.id, room.id);
      
      // Process the take all command
      const events = await story.processInput('take all');
      
      // Should have events for successful takes and batch complete
      const batchEvent = events.find(e => e.type === IFEvents.BATCH_ACTION_COMPLETE);
      expect(batchEvent).toBeDefined();
      expect(batchEvent!.data.succeeded).toContain('gold coin');
      expect(batchEvent!.data.succeeded).toContain('silver coin');
      expect(batchEvent!.data.failed).toHaveLength(1);
      expect(batchEvent!.data.failed[0].target).toBe('heavy rock');
      
      // Coins should be taken, rock should not
      expect(world.getLocation(coin1.id)).toBe(player.id);
      expect(world.getLocation(coin2.id)).toBe(player.id);
      expect(world.getLocation(rock.id)).toBe(room.id);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle parse errors gracefully', async () => {
      const events = await story.processInput('xyzzy plugh');
      
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('parse-error');
      expect(events[0].data.message).toContain('understand');
    });
    
    it('should handle missing noun errors', async () => {
      const events = await story.processInput('take');
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(IFEvents.ACTION_FAILED);
      expect(events[0].data.message).toContain('what');
    });
  });
});
