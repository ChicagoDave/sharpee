/**
 * Tests for handleRoomDescription handler
 *
 * Verifies ADR-107 dual-mode (messageId vs literal text),
 * verbose flag for room name, and fallback chains.
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-107 Dual-mode message ID / literal text
 */

import { describe, it, expect } from 'vitest';
import { handleRoomDescription } from '../../src/handlers/room.js';
import { makeEvent, makeProvider, makeContext } from './test-helpers.js';

describe('handleRoomDescription', () => {
  describe('non-verbose mode', () => {
    it('should return only description block with literal text', () => {
      const event = makeEvent('if.event.room.description', {
        verbose: false,
        roomDescription: 'A dark cave with dripping water.',
      });

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(1);
      expect(blocks[0].key).toBe('room.description');
      expect(blocks[0].content).toEqual(['A dark cave with dripping water.']);
    });

    it('should not emit room name block even when name is present', () => {
      const event = makeEvent('if.event.room.description', {
        verbose: false,
        roomName: 'Dark Cave',
        roomDescription: 'A dark cave.',
      });

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(1);
      expect(blocks[0].key).toBe('room.description');
    });
  });

  describe('verbose mode', () => {
    it('should emit both room name and description blocks', () => {
      const event = makeEvent('if.event.room.description', {
        verbose: true,
        roomName: 'West of House',
        roomDescription: 'You are standing in an open field.',
      });

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(2);
      expect(blocks[0].key).toBe('room.name');
      expect(blocks[0].content).toEqual(['West of House']);
      expect(blocks[1].key).toBe('room.description');
      expect(blocks[1].content).toEqual(['You are standing in an open field.']);
    });

    it('should use nested room object fields', () => {
      const event = makeEvent('if.event.room.description', {
        verbose: true,
        room: {
          id: 'west-of-house',
          name: 'West of House',
          description: 'You are standing in an open field.',
        },
      });

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toEqual(['West of House']);
      expect(blocks[1].content).toEqual(['You are standing in an open field.']);
    });
  });

  describe('ADR-107 dual-mode (message IDs)', () => {
    it('should resolve roomDescriptionId through language provider', () => {
      const provider = makeProvider({
        'rooms.cave.description': 'A damp cave echoes with dripping water.',
      });
      const event = makeEvent('if.event.room.description', {
        verbose: false,
        roomDescriptionId: 'rooms.cave.description',
        roomDescription: 'Fallback description.',
      });

      const blocks = handleRoomDescription(event, makeContext(provider));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toEqual(['A damp cave echoes with dripping water.']);
    });

    it('should fall back to literal when provider echoes the ID', () => {
      const provider = makeProvider({}); // empty = echoes all IDs
      const event = makeEvent('if.event.room.description', {
        verbose: false,
        roomDescriptionId: 'rooms.unknown.description',
        roomDescription: 'Literal fallback.',
      });

      const blocks = handleRoomDescription(event, makeContext(provider));

      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toEqual(['Literal fallback.']);
    });

    it('should resolve roomNameId through language provider in verbose mode', () => {
      const provider = makeProvider({
        'rooms.cave.name': 'The Crystal Cave',
        'rooms.cave.description': 'Sparkling crystals line the walls.',
      });
      const event = makeEvent('if.event.room.description', {
        verbose: true,
        roomNameId: 'rooms.cave.name',
        roomDescriptionId: 'rooms.cave.description',
      });

      const blocks = handleRoomDescription(event, makeContext(provider));

      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toEqual(['The Crystal Cave']);
      expect(blocks[1].content).toEqual(['Sparkling crystals line the walls.']);
    });

    it('should prefer top-level roomDescriptionId over room.descriptionId', () => {
      const provider = makeProvider({
        'rooms.top.desc': 'Top-level wins.',
        'rooms.nested.desc': 'Nested loses.',
      });
      const event = makeEvent('if.event.room.description', {
        verbose: false,
        room: {
          id: 'test',
          name: 'Test',
          descriptionId: 'rooms.nested.desc',
        },
        roomDescriptionId: 'rooms.top.desc',
      });

      const blocks = handleRoomDescription(event, makeContext(provider));

      // data.roomDescriptionId ?? data.room?.descriptionId — top-level takes precedence
      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toEqual(['Top-level wins.']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no description data', () => {
      const event = makeEvent('if.event.room.description', {});

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(0);
    });

    it('should return empty array when verbose but no name or description', () => {
      const event = makeEvent('if.event.room.description', { verbose: true });

      const blocks = handleRoomDescription(event, makeContext());

      expect(blocks).toHaveLength(0);
    });
  });
});
