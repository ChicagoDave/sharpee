/**
 * Integration tests for the event handler system
 *
 * Entity `on` handler tests removed in ISSUE-068 — entity `on` dispatch
 * was removed from the EventProcessor and GameEngine. Only story-level
 * event handlers (via StoryWithEvents) remain.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { StoryWithEvents } from '../../src/story';

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
});
