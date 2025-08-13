/**
 * Integration tests for the event handler system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { StoryWithEvents } from '../../src/story';
import { EventEmitter } from '../../src/events/event-emitter';
import { SemanticEvent } from '@sharpee/core';

describe('Event Handler System (Integration)', () => {
  let world: WorldModel;
  let story: StoryWithEvents;
  
  beforeEach(() => {
    world = new WorldModel();
    story = new StoryWithEvents({
      id: 'test-story',
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0'
    });
  });
  
  describe('Entity-level handlers', () => {
    it('should allow entities to define event handlers', () => {
      const book = world.createEntity('book', 'item');
      const bookshelf = world.createEntity('bookshelf', 'item');
      
      // Define a handler for the book
      book.on = {
        'if.event.pushed': (event) => {
          return [{
            id: `${Date.now()}-bookshelf-opens`,
            type: 'if.event.opened',
            timestamp: Date.now(),
            data: {
              entity: bookshelf.id,
              trigger: book.id
            },
            entities: { [bookshelf.id]: bookshelf }
          }];
        }
      };
      
      // Simulate pushing the book
      const pushEvent = {
        type: 'if.event.pushed',
        data: {
          target: book.id
        }
      };
      
      // Execute the handler
      const handler = book.on['if.event.pushed'];
      const result = handler(pushEvent);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('if.event.opened');
      expect(result![0].data.entity).toBe(bookshelf.id);
    });
    
    it('should handle multiple entities with different handlers', () => {
      const button1 = world.createEntity('button1', 'item');
      const button2 = world.createEntity('button2', 'item');
      const door = world.createEntity('door', 'item');
      
      let button1Pressed = false;
      let button2Pressed = false;
      
      button1.on = {
        'if.event.pushed': () => {
          button1Pressed = true;
          return undefined;
        }
      };
      
      button2.on = {
        'if.event.pushed': () => {
          button2Pressed = true;
          return [{
            id: '1',
            type: 'if.event.unlocked',
            timestamp: Date.now(),
            data: { entity: door.id },
            entities: {}
          }];
        }
      };
      
      // Push button 1
      if (button1.on) {
        button1.on['if.event.pushed']({ type: 'if.event.pushed', data: {} });
      }
      expect(button1Pressed).toBe(true);
      expect(button2Pressed).toBe(false);
      
      // Push button 2
      if (button2.on) {
        const result = button2.on['if.event.pushed']({ type: 'if.event.pushed', data: {} });
        expect(result).toHaveLength(1);
        expect(result![0].type).toBe('if.event.unlocked');
      }
      expect(button2Pressed).toBe(true);
    });
  });
  
  describe('Story-level handlers', () => {
    it('should allow stories to register event handlers', () => {
      let handlerCalled = false;
      
      story.on('if.event.pushed', (event) => {
        handlerCalled = true;
        return [{
          id: '1',
          type: 'story.reaction',
          timestamp: Date.now(),
          data: { message: 'Something happened!' },
          entities: {}
        }];
      });
      
      const result = story.emit({
        type: 'if.event.pushed',
        data: { target: 'something' }
      });
      
      expect(handlerCalled).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('story.reaction');
    });
    
    it('should support complex multi-entity interactions', () => {
      const statue1 = world.createEntity('statue1', 'item');
      const statue2 = world.createEntity('statue2', 'item');
      const statue3 = world.createEntity('statue3', 'item');
      const secretDoor = world.createEntity('secretDoor', 'item');
      
      const pushedStatues = new Set<string>();
      
      // Story-level handler for the three statues puzzle
      story.on('if.event.pushed', (event) => {
        const targetId = event.data?.target;
        if (targetId && [statue1.id, statue2.id, statue3.id].includes(targetId)) {
          pushedStatues.add(targetId);
          
          // Check if all three statues have been pushed
          if (pushedStatues.size === 3) {
            return [{
              id: `${Date.now()}-puzzle-solved`,
              type: 'if.event.puzzle_solved',
              timestamp: Date.now(),
              data: {
                puzzle: 'three_statues',
                door: secretDoor.id
              },
              entities: {}
            }];
          }
        }
      });
      
      // Push statues one by one
      story.emit({ type: 'if.event.pushed', data: { target: statue1.id } });
      expect(pushedStatues.size).toBe(1);
      
      story.emit({ type: 'if.event.pushed', data: { target: statue2.id } });
      expect(pushedStatues.size).toBe(2);
      
      const result = story.emit({ type: 'if.event.pushed', data: { target: statue3.id } });
      expect(pushedStatues.size).toBe(3);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('if.event.puzzle_solved');
    });
  });
  
  describe('Handler composition', () => {
    it('should allow both entity and story handlers to fire', () => {
      const button = world.createEntity('button', 'item');
      const results: string[] = [];
      
      // Entity handler
      button.on = {
        'if.event.pushed': () => {
          results.push('entity');
          return [{
            id: '1',
            type: 'entity.response',
            timestamp: Date.now(),
            data: {},
            entities: {}
          }];
        }
      };
      
      // Story handler
      story.on('if.event.pushed', () => {
        results.push('story');
        return [{
          id: '2',
          type: 'story.response',
          timestamp: Date.now(),
          data: {},
          entities: {}
        }];
      });
      
      // In a real scenario, CommandExecutor would call both
      // Here we simulate it
      const event = { type: 'if.event.pushed', data: { target: button.id } };
      
      // Entity handler
      if (button.on) {
        button.on['if.event.pushed'](event);
      }
      
      // Story handler
      story.emit(event);
      
      expect(results).toEqual(['entity', 'story']);
    });
  });
});