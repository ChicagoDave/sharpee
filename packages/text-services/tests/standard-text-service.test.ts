/**
 * Tests for StandardTextService with atomic events
 * 
 * Verifies that the text service can work without world model dependencies,
 * using only the data provided in events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StandardTextService } from '../src/standard-text-service';
import { TextServiceContext } from '@sharpee/if-services';
import { ISemanticEvent } from '@sharpee/core';

describe('StandardTextService - Atomic Events', () => {
  let service: StandardTextService;
  let mockContext: TextServiceContext;
  let currentEvents: ISemanticEvent[];

  beforeEach(() => {
    service = new StandardTextService();
    currentEvents = [];
    
    mockContext = {
      getCurrentTurnEvents: () => currentEvents,
      world: null as any, // No world model access!
      getEntity: () => { throw new Error('Should not access world model!'); }
    } as TextServiceContext;
    
    service.initialize(mockContext);
  });

  describe('Room Description Events', () => {
    it('should handle room description with atomic event data', () => {
      currentEvents = [{
        type: 'if.event.room_description',
        timestamp: Date.now(),
        data: {
          room: {
            id: 'room-1',
            name: 'Test Room',
            description: 'A room for testing.',
            isDark: false,
            isVisited: false
          },
          verbose: true
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('Test Room');
      expect(output).toContain('A room for testing.');
    });

    it('should handle room description with backward compatibility fields', () => {
      currentEvents = [{
        type: 'if.event.room_description',
        timestamp: Date.now(),
        data: {
          roomId: 'room-1',
          roomName: 'Legacy Room',
          roomDescription: 'A legacy room description.',
          verbose: true
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('Legacy Room');
      expect(output).toContain('A legacy room description.');
    });

    it('should not show name when verbose is false', () => {
      currentEvents = [{
        type: 'if.event.room_description',
        timestamp: Date.now(),
        data: {
          room: {
            id: 'room-1',
            name: 'Test Room',
            description: 'A room for testing.',
            isDark: false,
            isVisited: true
          },
          verbose: false
        }
      }];

      const output = service.processTurn();
      expect(output).not.toContain('Test Room');
      expect(output).toContain('A room for testing.');
    });
  });

  describe('Provider Functions', () => {
    it('should execute provider functions for dynamic descriptions', () => {
      let counter = 0;
      const dynamicDescription = () => {
        counter++;
        return `Dynamic description #${counter}`;
      };

      currentEvents = [{
        type: 'if.event.room_description',
        timestamp: Date.now(),
        data: {
          room: {
            id: 'room-1',
            name: 'Dynamic Room',
            description: dynamicDescription,
            isDark: false,
            isVisited: false
          },
          verbose: true
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('Dynamic Room');
      expect(output).toContain('Dynamic description #1');
      expect(counter).toBe(1);
    });

    it('should handle provider function errors gracefully', () => {
      const faultyProvider = () => {
        throw new Error('Provider error!');
      };

      currentEvents = [{
        type: 'if.event.room_description',
        timestamp: Date.now(),
        data: {
          room: {
            id: 'room-1',
            name: 'Test Room',
            description: faultyProvider,
            isDark: false,
            isVisited: false
          },
          verbose: true
        }
      }];

      // Should not throw, just return empty or partial output
      const output = service.processTurn();
      expect(output).toContain('Test Room');
      expect(output).not.toContain('Provider error');
    });
  });

  describe('Action Success Events', () => {
    it('should handle action success with entity snapshots in params', () => {
      currentEvents = [{
        type: 'action.success',
        timestamp: Date.now(),
        data: {
          actionId: 'examining',
          messageId: 'examined_wearable',
          params: {
            target: {
              id: 'cloak-1',
              name: 'black cloak',
              description: 'A velvet cloak, dark as night.'
            }
          }
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('A velvet cloak, dark as night.');
    });

    it('should extract names from entity snapshots in fallback', () => {
      currentEvents = [{
        type: 'action.success',
        timestamp: Date.now(),
        data: {
          actionId: 'putting',
          messageId: 'put_on',
          params: {
            item: { id: 'book-1', name: 'leather book' },
            surface: { id: 'table-1', name: 'wooden table' }
          }
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('leather book');
      expect(output).toContain('wooden table');
    });
  });

  describe('Game Messages', () => {
    it('should handle game messages', () => {
      currentEvents = [{
        type: 'game.message',
        timestamp: Date.now(),
        data: {
          text: 'Welcome to the game!'
        }
      }];

      const output = service.processTurn();
      expect(output).toBe('Welcome to the game!');
    });

    it('should handle game over events', () => {
      currentEvents = [{
        type: 'game.over',
        timestamp: Date.now(),
        data: {
          message: 'Congratulations!',
          won: true,
          score: 100
        }
      }];

      const output = service.processTurn();
      expect(output).toContain('Congratulations!');
      expect(output).toContain('You have won!');
      expect(output).toContain('Final score: 100');
    });
  });

  describe('Event Filtering', () => {
    it('should skip system events', () => {
      currentEvents = [
        {
          type: 'system.command.parsed',
          timestamp: Date.now(),
          data: { command: 'look' }
        },
        {
          type: 'game.message',
          timestamp: Date.now(),
          data: { text: 'Visible message' }
        }
      ];

      const output = service.processTurn();
      expect(output).toBe('Visible message');
    });

    it('should handle multiple events in order', () => {
      currentEvents = [
        {
          type: 'if.event.room_description',
          timestamp: Date.now(),
          data: {
            room: {
              id: 'room-1',
              name: 'Test Room',
              description: 'A test room.'
            },
            verbose: true
          }
        },
        {
          type: 'action.success',
          timestamp: Date.now(),
          data: {
            actionId: 'looking',
            messageId: 'contents_list',
            params: {
              items: 'a book and a lamp',
              count: 2
            }
          }
        }
      ];

      const output = service.processTurn();
      expect(output).toContain('Test Room');
      expect(output).toContain('A test room.');
      expect(output).toContain('You can see a book and a lamp here.');
    });
  });
});