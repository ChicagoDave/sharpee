/**
 * Tests for platform query handlers
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  QuitQueryHandler,
  RestartQueryHandler,
  createQuitQueryHandler,
  createRestartQueryHandler
} from '../../src/query-handlers';
import { 
  PendingQuery,
  QueryResponse,
  QuerySource,
  QueryType,
  PlatformEventType
} from '@sharpee/core';

describe('Platform Query Handlers', () => {
  describe('QuitQueryHandler', () => {
    let handler: QuitQueryHandler;
    let emittedEvents: any[];
    
    beforeEach(() => {
      handler = createQuitQueryHandler();
      emittedEvents = [];
      handler.getEventSource().subscribe(event => emittedEvents.push(event));
    });

    describe('canHandle', () => {
      test('should handle quit confirmation queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'quit_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(true);
      });

      test('should handle quit with unsaved changes queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'quit_unsaved_query',
          options: ['save_and_quit', 'quit_without_saving', 'cancel'],
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(true);
      });

      test('should not handle non-quit queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(false);
      });
    });

    describe('handleResponse', () => {
      test('should emit quit requested event for quit option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'quit_unsaved_query',
          options: ['quit', 'cancel'],
          context: { score: 100, moves: 50 },
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: '1',
          response: 'quit',
          selectedIndex: 0,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const quitEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
        expect(quitEvent).toBeDefined();
        expect(quitEvent.payload.context).toMatchObject({
          score: 100,
          moves: 50,
          force: true
        });
      });

      it('should handle save and quit option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'quit_unsaved_query',
          options: ['save_and_quit', 'quit_without_saving', 'cancel'],
          context: { score: 100, moves: 50 },
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: '1',
          response: 'save_and_quit',
          selectedIndex: 0,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const saveEvent = emittedEvents.find(e => e.type === 'platform.save_requested');
        const quitEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
        
        expect(saveEvent).toBeDefined();
        expect(saveEvent.data.autosave).toBe(true);
        expect(quitEvent).toBeDefined();
        expect(quitEvent.payload.context.stats.savedBeforeQuit).toBe(true);
      });

      it('should emit quit cancelled for cancel option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'quit_confirmation',
          options: ['quit', 'cancel'],
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: '2',
          response: 'cancel',
          selectedIndex: 1,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_CANCELLED);
        expect(cancelEvent).toBeDefined();
      });

      it('should handle yes/no responses', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'quit_confirmation',
          context: { score: 100 },
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: 'yes',
          response: true,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const quitEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
        expect(quitEvent).toBeDefined();
      });
    });

    describe('handleTimeout', () => {
      it('should emit quit cancelled on timeout', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'quit_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        handler.handleTimeout?.(query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_CANCELLED);
        expect(cancelEvent).toBeDefined();
        
        const timeoutEvent = emittedEvents.find(e => e.type === 'query.timeout');
        expect(timeoutEvent).toBeDefined();
        expect(timeoutEvent.data.reason).toBe('timeout');
      });
    });

    describe('handleCancel', () => {
      it('should emit quit cancelled on cancellation', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'quit_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        handler.handleCancel?.(query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.QUIT_CANCELLED);
        expect(cancelEvent).toBeDefined();
      });
    });
  });

  describe('RestartQueryHandler', () => {
    let handler: RestartQueryHandler;
    let emittedEvents: any[];
    
    beforeEach(() => {
      handler = createRestartQueryHandler();
      emittedEvents = [];
      handler.getEventSource().subscribe(event => emittedEvents.push(event));
    });

    describe('canHandle', () => {
      it('should handle restart confirmation queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(true);
      });

      it('should handle restart with unsaved changes queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'restart_unsaved',
          options: ['save_and_restart', 'restart_without_saving', 'cancel'],
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(true);
      });

      it('should not handle non-restart queries', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'quit_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        expect(handler.canHandle(query)).toBe(false);
      });
    });

    describe('handleResponse', () => {
      it('should emit restart requested event for restart option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: { 
            score: 100, 
            moves: 50, 
            location: 'library',
            hasUnsavedProgress: true 
          },
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: 'yes',
          response: true,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const restartEvent = emittedEvents.find(e => e.type === PlatformEventType.RESTART_REQUESTED);
        expect(restartEvent).toBeDefined();
        expect(restartEvent.payload.context).toMatchObject({
          currentProgress: {
            score: 100,
            moves: 50,
            location: 'library'
          },
          hasUnsavedChanges: true,
          force: true
        });
      });

      it('should handle save and restart option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.MULTIPLE_CHOICE,
          messageId: 'restart_unsaved',
          options: ['save_and_restart', 'restart_without_saving', 'cancel'],
          context: { score: 100, moves: 50, location: 'library' },
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: '1',
          response: 'save_and_restart',
          selectedIndex: 0,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const saveEvent = emittedEvents.find(e => e.type === 'platform.save_requested');
        const restartEvent = emittedEvents.find(e => e.type === PlatformEventType.RESTART_REQUESTED);
        
        expect(saveEvent).toBeDefined();
        expect(saveEvent.data.saveName).toBe('before_restart');
        expect(saveEvent.data.metadata.reason).toBe('restart');
        expect(restartEvent).toBeDefined();
        expect(restartEvent.payload.context.hasUnsavedChanges).toBe(false);
      });

      it('should emit restart cancelled for cancel option', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        const response: QueryResponse = {
          queryId: 'q1',
          rawInput: 'no',
          response: false,
          wasInterrupted: false,
          timestamp: Date.now()
        };
        
        handler.handleResponse(response, query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.RESTART_CANCELLED);
        expect(cancelEvent).toBeDefined();
      });
    });

    describe('handleTimeout', () => {
      it('should emit restart cancelled on timeout', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        handler.handleTimeout?.(query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.RESTART_CANCELLED);
        expect(cancelEvent).toBeDefined();
      });
    });

    describe('handleCancel', () => {
      it('should emit restart cancelled on cancellation', () => {
        const query: PendingQuery = {
          id: 'q1',
          source: QuerySource.SYSTEM,
          type: QueryType.YES_NO,
          messageId: 'restart_confirmation',
          context: {},
          allowInterruption: false,
          created: Date.now()
        };
        
        handler.handleCancel?.(query);
        
        const cancelEvent = emittedEvents.find(e => e.type === PlatformEventType.RESTART_CANCELLED);
        expect(cancelEvent).toBeDefined();
        
        const cancelledEvent = emittedEvents.find(e => e.type === 'query.cancelled');
        expect(cancelledEvent).toBeDefined();
        expect(cancelledEvent.data.reason).toBe('cancelled');
      });
    });
  });
});
