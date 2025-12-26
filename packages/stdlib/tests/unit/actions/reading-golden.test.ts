/**
 * Golden path tests for the reading action
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reading } from '../../../src/actions/standard/reading/reading';
import { IFActions } from '../../../src/actions/constants';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import { WorldModel, IFEntity, TraitType, ReadableTrait, EntityType } from '@sharpee/world-model';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with three-phase pattern
const executeAndReport = (action: any, context: ActionContext) => {
  action.execute(context);
  return action.report(context);
};

describe('Reading Action - Golden Path', () => {
  let testData: TestData;

  beforeEach(() => {
    // Setup the test world with basic entities
    testData = setupBasicWorld();
  });

  describe('Basic Reading', () => {
    it('should read a simple note', () => {
      // Create a readable note
      const note = testData.world.createEntity('note', EntityType.ITEM);
      note.add(new ReadableTrait({
        text: 'Meet me at midnight.',
        readableType: 'note'
      }));
      testData.world.moveEntity(note.id, testData.room.id);

      // Create command
      const command = createCommand(IFActions.READING, {
        entity: note
      });

      // Create context
      const context = createRealTestContext(reading, testData.world, command);

      // Validate
      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      // Execute
      const events = executeAndReport(reading, context);
      
      // Should emit read event and success
      expect(events).toHaveLength(2);
      
      expectEvent(events, 'if.event.read', {
        targetId: note.id,
        targetName: 'note',
        text: 'Meet me at midnight.',
        readableType: 'note'
      });
      
      expectEvent(events, 'action.success', {
        actionId: 'if.action.reading',
        messageId: 'read_text',
        params: {
          item: 'note',
          text: 'Meet me at midnight.'
        }
      });

      // Should mark as read
      const readable = note.get(TraitType.READABLE) as ReadableTrait;
      expect(readable.hasBeenRead).toBe(true);
    });

    it('should read a book', () => {
      const book = testData.world.createEntity('novel', EntityType.ITEM);
      book.add(new ReadableTrait({
        text: 'It was a dark and stormy night...',
        readableType: 'book'
      }));
      testData.world.moveEntity(book.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: book
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      const events = executeAndReport(reading, context);
      
      expectEvent(events, 'action.success', {
        actionId: 'if.action.reading',
        messageId: 'read_book',
        params: {
          item: 'novel',
          text: 'It was a dark and stormy night...'
        }
      });
    });

    it('should read a sign', () => {
      const sign = testData.world.createEntity('sign', EntityType.ITEM);
      sign.add(new ReadableTrait({
        text: 'DANGER: Keep Out!',
        readableType: 'sign'
      }));
      testData.world.moveEntity(sign.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: sign
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      const events = executeAndReport(reading, context);
      
      expectEvent(events, 'action.success', {
        actionId: 'if.action.reading',
        messageId: 'read_sign',
        params: {
          item: 'sign',
          text: 'DANGER: Keep Out!'
        }
      });
    });

    it('should read an inscription', () => {
      const stone = testData.world.createEntity('stone', EntityType.ITEM);
      stone.add(new ReadableTrait({
        text: 'Here lies an adventurer',
        readableType: 'inscription'
      }));
      testData.world.moveEntity(stone.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: stone
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      const events = executeAndReport(reading, context);
      
      expectEvent(events, 'action.success', {
        actionId: 'if.action.reading',
        messageId: 'read_inscription',
        params: {
          item: 'stone',
          text: 'Here lies an adventurer'
        }
      });
    });
  });

  describe('Multi-page Books', () => {
    it('should read current page of multi-page book', () => {
      const book = testData.world.createEntity('diary', EntityType.ITEM);
      book.add(new ReadableTrait({
        readableType: 'book',
        pageContent: [
          'Dear Diary, Day 1...',
          'Day 2: Things got worse...',
          'Day 3: The end is near...'
        ],
        currentPage: 2
      }));
      testData.world.moveEntity(book.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: book
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      const events = executeAndReport(reading, context);
      
      expectEvent(events, 'if.event.read', {
        text: 'Day 2: Things got worse...',
        currentPage: 2,
        totalPages: 3
      });
      
      expectEvent(events, 'action.success', {
        messageId: 'read_book_page',
        params: {
          item: 'diary',
          text: 'Day 2: Things got worse...',
          currentPage: 2,
          totalPages: 3
        }
      });
    });
  });

  describe('Validation', () => {
    it('should fail without direct object', () => {
      const command = createCommand(IFActions.READING, {});
      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('what_to_read');
    });

    it('should fail for non-readable items', () => {
      const rock = testData.world.createEntity('rock', EntityType.ITEM);
      testData.world.moveEntity(rock.id, testData.room.id);
      // No readable trait

      const command = createCommand(IFActions.READING, {
        entity: rock
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('not_readable');
      expect(validation.params?.item).toBe('rock');
    });

    it('should fail when text is not currently readable', () => {
      const scroll = testData.world.createEntity('scroll', EntityType.ITEM);
      scroll.add(new ReadableTrait({
        text: 'Ancient wisdom',
        isReadable: false,
        cannotReadMessage: 'The text is too faded to read.'
      }));
      testData.world.moveEntity(scroll.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: scroll
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('cannot_read_now');
      expect(validation.params?.item).toBe('scroll');
      expect(validation.params?.reason).toBe('The text is too faded to read.');
    });

    it('should handle items with language requirements', () => {
      const tablet = testData.world.createEntity('tablet', EntityType.ITEM);
      tablet.add(new ReadableTrait({
        text: 'Ancient text',
        language: 'elvish',
        requiresAbility: true,
        requiredAbility: 'read_elvish'
      }));
      testData.world.moveEntity(tablet.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: tablet
      });

      const context = createRealTestContext(reading, testData.world, command);

      // For now, we assume the player has the ability
      // TODO: Implement ability checking
      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Integration with ReadableTrait', () => {
    it('should track whether item has been read', () => {
      const letter = testData.world.createEntity('letter', EntityType.ITEM);
      const readable = new ReadableTrait({
        text: 'Dear friend...',
        hasBeenRead: false
      });
      letter.add(readable);
      testData.world.moveEntity(letter.id, testData.room.id);

      expect(readable.hasBeenRead).toBe(false);

      const command = createCommand(IFActions.READING, {
        entity: letter
      });

      const context = createRealTestContext(reading, testData.world, command);
      executeAndReport(reading, context);

      expect(readable.hasBeenRead).toBe(true);
    });

    it('should handle empty text gracefully', () => {
      const paper = testData.world.createEntity('paper', EntityType.ITEM);
      paper.add(new ReadableTrait({
        text: '',
        readableType: 'paper'
      }));
      testData.world.moveEntity(paper.id, testData.room.id);

      const command = createCommand(IFActions.READING, {
        entity: paper
      });

      const context = createRealTestContext(reading, testData.world, command);

      const validation = reading.validate(context);
      expect(validation.valid).toBe(true);

      const events = executeAndReport(reading, context);
      expect(events[1].data?.params?.text).toBe('');
    });
  });
});