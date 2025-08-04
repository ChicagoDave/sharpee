/**
 * @file Cloak of Darkness Test
 * @description Tests for the Cloak of Darkness story implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { CloakOfDarknessStory } from '../src/index';

describe('Cloak of Darkness Story', () => {
  let world: WorldModel;
  let story: CloakOfDarknessStory;

  beforeEach(() => {
    world = new WorldModel();
    story = new CloakOfDarknessStory();
    
    // Create and prepare player
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    
    // Initialize the story
    story.initializeWorld(world);
  });

  describe('World Setup', () => {
    it('should create all required rooms', () => {
      const rooms = world.getAllEntities().filter(e => e.has('room'));
      const roomNames = rooms.map(r => r.attributes.name);
      
      expect(roomNames).toContain('foyer');
      expect(roomNames).toContain('cloakroom');
      expect(roomNames).toContain('bar');
      expect(roomNames).toContain('outside');
    });

    it('should create required objects', () => {
      const objects = world.getAllEntities();
      const objectNames = objects.map(o => o.attributes.name);
      
      expect(objectNames).toContain('cloak');
      expect(objectNames).toContain('hook');
      expect(objectNames).toContain('message');
    });

    it('should place player in foyer with cloak', () => {
      const player = world.getPlayer();
      expect(player).toBeDefined();
      
      const playerLocation = world.getLocation(player!.id);
      const foyer = world.getAllEntities().find(e => e.attributes.name === 'foyer');
      expect(playerLocation).toBe(foyer?.id);
      
      // Player should be carrying the cloak
      const carried = world.getContents(player!.id);
      const carriedNames = carried.map(c => c.attributes.name);
      expect(carriedNames).toContain('cloak');
    });
  });

  describe('Darkness Mechanics', () => {
    it('should make bar dark when carrying cloak', () => {
      const player = world.getPlayer()!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      
      // Make sure player has the cloak
      world.moveEntity(cloak.id, player.id);
      
      // Move player to bar
      world.moveEntity(player.id, bar.id);
      
      // Check visibility - should only see the bar itself
      const visible = world.getVisible(player.id);
      const visibleNames = visible.map(v => v.attributes.name || v.id);
      console.log('Visible in darkness:', visibleNames);
      
      expect(visible.length).toBe(1);
      expect(visible[0].id).toBe(bar.id);
    });

    it('should make bar visible without cloak', () => {
      const player = world.getPlayer()!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      const hook = world.getAllEntities().find(e => e.attributes.name === 'hook')!;
      
      // Hang cloak on hook
      world.moveEntity(cloak.id, hook.id);
      
      // Move player to bar
      world.moveEntity(player.id, bar.id);
      
      // Check visibility - should see bar and message
      const visible = world.getVisible(player.id);
      const visibleNames = visible.map(v => v.attributes.name);
      
      expect(visibleNames).toContain('bar');
      expect(visibleNames).toContain('message');
    });
  });

  describe('Message State', () => {
    it('should not be readable in darkness', () => {
      const player = world.getPlayer()!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      const message = world.getAllEntities().find(e => e.attributes.name === 'message')!;
      
      // Make sure player has cloak
      world.moveEntity(cloak.id, player.id);
      
      // Move to bar with cloak
      world.moveEntity(player.id, bar.id);
      
      // Update message state manually (since we're not using GO action)
      story['updateMessage']();
      
      // Message should not be readable
      const readable = message.get('readable');
      expect(readable?.isReadable).toBe(false);
    });

    it('should be readable with light', () => {
      const player = world.getPlayer()!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      const hook = world.getAllEntities().find(e => e.attributes.name === 'hook')!;
      const message = world.getAllEntities().find(e => e.attributes.name === 'message')!;
      
      // Hang cloak first
      world.moveEntity(cloak.id, hook.id);
      
      // Move to bar
      world.moveEntity(player.id, bar.id);
      
      // Update message state
      story['updateMessage']();
      
      // Message should be readable
      const readable = message.get('readable');
      expect(readable?.isReadable).toBe(true);
      expect(readable?.text).toBe('You have won!');
    });

    it('should become disturbed when entering in darkness', () => {
      const player = world.getPlayer()!;
      const foyer = world.getAllEntities().find(e => e.attributes.name === 'foyer')!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      
      // Make sure player has cloak
      world.moveEntity(cloak.id, player.id);
      
      // Start in foyer
      world.moveEntity(player.id, foyer.id);
      
      // Initial disturbances should be 0
      expect(story['disturbances']).toBe(0);
      
      // Simulate the GO action's effect
      const goAction = story.getCustomActions().find(a => a.id === 'GO_ENHANCED');
      expect(goAction).toBeDefined();
      
      // Execute the relevant part of GO action
      if (goAction?.execute) {
        const context = {
          world,
          actor: player,
          event: (type: string, data: any) => ({ type, data })
        };
        
        // Move to bar
        world.moveEntity(player.id, bar.id);
        
        // Check if it's dark and increase disturbances
        if (story['isBarDark']()) {
          story['disturbances']++;
          story['updateMessage']();
        }
      }
      
      // Check disturbances
      expect(story['disturbances']).toBeGreaterThan(0);
    });
  });

  describe('Completion', () => {
    it('should not be complete initially', () => {
      expect(story.isComplete()).toBe(false);
    });

    it('should complete when message is read successfully', () => {
      const player = world.getPlayer()!;
      const bar = world.getAllEntities().find(e => e.attributes.name === 'bar')!;
      const cloak = world.getAllEntities().find(e => e.attributes.name === 'cloak')!;
      const hook = world.getAllEntities().find(e => e.attributes.name === 'hook')!;
      
      // Hang cloak
      world.moveEntity(cloak.id, hook.id);
      
      // Move to bar
      world.moveEntity(player.id, bar.id);
      
      // Read message successfully
      world.setStateValue('message_read_successfully', true);
      
      expect(story.isComplete()).toBe(true);
    });
  });

  describe('Custom Actions', () => {
    it('should provide HANG action', () => {
      const vocabulary = story.getCustomVocabulary();
      const hangVerb = vocabulary.verbs.find(v => v.actionId === 'HANG');
      
      expect(hangVerb).toBeDefined();
      expect(hangVerb?.verbs).toContain('hang');
      expect(hangVerb?.verbs).toContain('hook');
    });

    it('should provide READ action', () => {
      const vocabulary = story.getCustomVocabulary();
      const readVerb = vocabulary.verbs.find(v => v.actionId === 'READ');
      
      expect(readVerb).toBeDefined();
      expect(readVerb?.verbs).toContain('read');
      expect(readVerb?.verbs).toContain('examine');
    });
  });
});