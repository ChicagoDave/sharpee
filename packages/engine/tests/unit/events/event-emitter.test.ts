/**
 * Tests for the EventEmitter class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from '../../../src/events/event-emitter';
import { GameEvent, EntityEntityEventHandler } from '@sharpee/world-model';

describe('EventEmitter', () => {
  let emitter: EventEmitter;
  
  beforeEach(() => {
    emitter = new EventEmitter();
  });
  
  describe('on()', () => {
    it('should register a handler for an event type', () => {
      const handler: EntityEventHandler = () => {};
      emitter.on('test.event', handler);
      
      expect(emitter.listenerCount('test.event')).toBe(1);
    });
    
    it('should allow multiple handlers for the same event', () => {
      const handler1: EntityEventHandler = () => {};
      const handler2: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler1);
      emitter.on('test.event', handler2);
      
      expect(emitter.listenerCount('test.event')).toBe(2);
    });
  });
  
  describe('off()', () => {
    it('should remove a specific handler', () => {
      const handler1: EntityEventHandler = () => {};
      const handler2: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler1);
      emitter.on('test.event', handler2);
      emitter.off('test.event', handler1);
      
      expect(emitter.listenerCount('test.event')).toBe(1);
    });
    
    it('should handle removing non-existent handler gracefully', () => {
      const handler: EntityEventHandler = () => {};
      
      expect(() => emitter.off('test.event', handler)).not.toThrow();
      expect(emitter.listenerCount('test.event')).toBe(0);
    });
  });
  
  describe('emit()', () => {
    it('should call all registered handlers', () => {
      let called1 = false;
      let called2 = false;
      
      const handler1: EntityEventHandler = () => { called1 = true; };
      const handler2: EntityEventHandler = () => { called2 = true; };
      
      emitter.on('test.event', handler1);
      emitter.on('test.event', handler2);
      
      const event: GameEvent = {
        type: 'test.event',
        data: {}
      };
      
      emitter.emit(event);
      
      expect(called1).toBe(true);
      expect(called2).toBe(true);
    });
    
    it('should collect semantic events from handlers', () => {
      const handler1: EntityEventHandler = () => [{
        id: '1',
        type: 'response.1',
        timestamp: Date.now(),
        data: {},
        entities: {}
      }];
      
      const handler2: EntityEventHandler = () => [{
        id: '2',
        type: 'response.2',
        timestamp: Date.now(),
        data: {},
        entities: {}
      }];
      
      emitter.on('test.event', handler1);
      emitter.on('test.event', handler2);
      
      const event: GameEvent = {
        type: 'test.event',
        data: {}
      };
      
      const results = emitter.emit(event);
      
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('response.1');
      expect(results[1].type).toBe('response.2');
    });
    
    it('should handle handlers that return void', () => {
      const handler: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler);
      
      const event: GameEvent = {
        type: 'test.event',
        data: {}
      };
      
      const results = emitter.emit(event);
      
      expect(results).toHaveLength(0);
    });
  });
  
  describe('clear()', () => {
    it('should clear all handlers for a specific event type', () => {
      const handler: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler);
      emitter.on('other.event', handler);
      
      emitter.clear('test.event');
      
      expect(emitter.listenerCount('test.event')).toBe(0);
      expect(emitter.listenerCount('other.event')).toBe(1);
    });
    
    it('should clear all handlers when no event type specified', () => {
      const handler: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler);
      emitter.on('other.event', handler);
      
      emitter.clear();
      
      expect(emitter.listenerCount('test.event')).toBe(0);
      expect(emitter.listenerCount('other.event')).toBe(0);
    });
  });
  
  describe('listenerCount()', () => {
    it('should return 0 for unregistered events', () => {
      expect(emitter.listenerCount('unknown.event')).toBe(0);
    });
    
    it('should return correct count for registered events', () => {
      const handler: EntityEventHandler = () => {};
      
      emitter.on('test.event', handler);
      emitter.on('test.event', handler);
      emitter.on('test.event', handler);
      
      expect(emitter.listenerCount('test.event')).toBe(3);
    });
  });
});