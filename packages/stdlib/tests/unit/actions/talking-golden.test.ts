/**
 * Golden test for talking action - demonstrates testing social interactions
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to initiate conversation with NPCs
 * - Check if target is a conversational actor
 * - Handle different conversation states and personalities
 * - Track first meetings vs subsequent greetings
 * - Detect available conversation topics
 */

import { describe, test, expect } from 'vitest';
import { talkingAction } from '../../../src/actions/standard/talking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  createCommand
} from '../../test-utils';

describe('talkingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(talkingAction.id).toBe(IFActions.TALKING);
    });

    test('should declare required messages', () => {
      expect(talkingAction.requiredMessages).toContain('no_target');
      expect(talkingAction.requiredMessages).toContain('not_visible');
      expect(talkingAction.requiredMessages).toContain('too_far');
      expect(talkingAction.requiredMessages).toContain('not_actor');
      expect(talkingAction.requiredMessages).toContain('self');
      expect(talkingAction.requiredMessages).toContain('not_available');
      expect(talkingAction.requiredMessages).toContain('talked');
      expect(talkingAction.requiredMessages).toContain('no_response');
      expect(talkingAction.requiredMessages).toContain('first_meeting');
      expect(talkingAction.requiredMessages).toContain('friendly_greeting');
      expect(talkingAction.requiredMessages).toContain('has_topics');
    });

    test('should belong to social group', () => {
      expect(talkingAction.group).toBe('social');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING));
      
      const events = executeWithValidation(talkingAction, context);

      expectEvent(events, 'if.event.talk_blocked', {
        messageId: 'if.action.talking.no_target',
        reason: 'no_target'
      });
    });


    test('should fail when target is not an actor', () => {
      const { world, player, room } = setupBasicWorld();
      const statue = world.createEntity('marble statue', 'object');
      world.moveEntity(statue.id, room.id);
      // statue has no ACTOR trait

      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: statue
      }));

      const events = executeWithValidation(talkingAction, context);

      expectEvent(events, 'if.event.talk_blocked', {
        messageId: 'if.action.talking.not_actor',
        reason: 'not_actor'
      });
    });

    test('should fail when trying to talk to self', () => {
      const { world, player } = setupBasicWorld();

      // Player already has ACTOR trait from setupBasicWorld

      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: player // Talking to self
      }));

      const events = executeWithValidation(talkingAction, context);

      expectEvent(events, 'if.event.talk_blocked', {
        messageId: 'if.action.talking.self',
        reason: 'self'
      });
    });

    test('should fail when NPC is not available to talk', () => {
      const { world, player, room } = setupBasicWorld();
      const busyNpc = world.createEntity('busy worker', 'actor');
      busyNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          isAvailable: false
        }
      });

      world.moveEntity(busyNpc.id, room.id);

      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: busyNpc
      }));

      const events = executeWithValidation(talkingAction, context);

      expectEvent(events, 'if.event.talk_blocked', {
        messageId: 'if.action.talking.not_available',
        params: { target: { name: 'busy worker' } }
      });
    });
  });

  describe('Basic Conversation', () => {
    test('should talk to NPC without conversation system', () => {
      const { world, player, room } = setupBasicWorld();
      const simpleNpc = world.createEntity('service robot', 'actor');
      simpleNpc.add({
        type: TraitType.ACTOR
        // No conversation object
      });
      
      world.moveEntity(simpleNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: simpleNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);

      // report() emits a single 'if.event.talked' event with messageId and entity data
      expectEvent(events, 'if.event.talked', {
        target: simpleNpc.id,
        targetName: 'service robot',
        messageId: 'if.action.talking.no_response',
        params: { target: { name: 'service robot' } }
      });
    });
  });

  describe('First Meeting', () => {
    test('should handle first meeting with NPC', () => {
      const { world, player, room } = setupBasicWorld();
      const newNpc = world.createEntity('traveling merchant', 'actor');
      newNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: false,
          state: 'initial'
        }
      });
      
      world.moveEntity(newNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: newNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);

      // report() emits a single 'if.event.talked' with all data
      expectEvent(events, 'if.event.talked', {
        target: newNpc.id,
        firstMeeting: true,
        conversationState: 'initial',
        messageId: 'if.action.talking.first_meeting',
        params: { target: { name: 'traveling merchant' } }
      });
    });

    test('should handle formal personality on first meeting', () => {
      const { world, player, room } = setupBasicWorld();
      const formalNpc = world.createEntity('distinguished professor', 'actor');
      formalNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: false,
          personality: 'formal'
        }
      });
      
      world.moveEntity(formalNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: formalNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.formal_greeting',
        params: { target: { name: 'distinguished professor' } }
      });
    });

    test('should handle casual personality on first meeting', () => {
      const { world, player, room } = setupBasicWorld();
      const casualNpc = world.createEntity('friendly bartender', 'actor');
      casualNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: false,
          personality: 'casual'
        }
      });
      
      world.moveEntity(casualNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: casualNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.casual_greeting',
        params: { target: { name: 'friendly bartender' } }
      });
    });
  });

  describe('Subsequent Meetings', () => {
    test('should handle subsequent meeting with friendly NPC', () => {
      const { world, player, room } = setupBasicWorld();
      const friendlyNpc = world.createEntity('trusted ally', 'actor');
      friendlyNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: true,
          relationship: 'friendly'
        }
      });
      
      world.moveEntity(friendlyNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: friendlyNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.friendly_greeting',
        params: { target: { name: 'trusted ally' } }
      });
    });

    test('should handle NPC that remembers player', () => {
      const { world, player, room } = setupBasicWorld();
      const memoryNpc = world.createEntity('old innkeeper', 'actor');
      memoryNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: true,
          remembersPlayer: true
        }
      });
      
      world.moveEntity(memoryNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: memoryNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.remembers_you',
        params: { target: { name: 'old innkeeper' } }
      });
    });

    test('should handle regular subsequent greeting', () => {
      const { world, player, room } = setupBasicWorld();
      const regularNpc = world.createEntity('store clerk', 'actor');
      regularNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: true
          // No special relationship
        }
      });
      
      world.moveEntity(regularNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: regularNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.greets_again',
        params: { target: { name: 'store clerk' } }
      });
    });
  });

  describe('Conversation Topics', () => {
    test('should detect NPC with topics to discuss', () => {
      const { world, player, room } = setupBasicWorld();
      const informativeNpc = world.createEntity('helpful librarian', 'actor');
      informativeNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: true,
          topics: {
            books: 'I have many rare books in the collection.',
            history: 'The town has a fascinating history.',
            magic: 'Magic? Oh, that\'s a dangerous subject...'
          }
        }
      });
      
      world.moveEntity(informativeNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: informativeNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      // report() emits a single 'if.event.talked' with all data
      expectEvent(events, 'if.event.talked', {
        target: informativeNpc.id,
        hasTopics: true,
        messageId: 'if.action.talking.has_topics',
        params: { target: { name: 'helpful librarian' } }
      });
    });

    test('should detect NPC with no topics', () => {
      const { world, player, room } = setupBasicWorld();
      const quietNpc = world.createEntity('silent guard', 'actor');
      quietNpc.add({
        type: TraitType.ACTOR,
        conversation: {
          hasGreeted: true,
          topics: {} // Empty topics
        }
      });
      
      world.moveEntity(quietNpc.id, room.id);
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: quietNpc
      }));
      
      const events = executeWithValidation(talkingAction, context);
      
      expectEvent(events, 'if.event.talked', {
        messageId: 'if.action.talking.nothing_to_say',
        params: { target: { name: 'silent guard' } }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const npc = world.createEntity('helpful assistant', 'actor');
      npc.add({
        type: TraitType.ACTOR,
        conversation: {
          state: 'active'
        }
      });

      world.moveEntity(npc.id, room.id);

      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: npc
      }));

      const events = executeWithValidation(talkingAction, context);

      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(npc.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });

  /**
   * World State Mutations
   *
   * The talking action is a signal action — it reads conversation state but
   * performs zero world mutations. hasGreeted, topics, and other conversation
   * state are read-only during execute. Any conversation state changes must
   * be handled by event handlers or story-specific logic.
   */
  describe('World State Mutations', () => {
    test('should NOT mutate conversation state after talking', () => {
      const { world, player, room } = setupBasicWorld();
      const npc = world.createEntity('town elder', 'actor');
      const conversation = {
        hasGreeted: false,
        personality: 'formal',
        topics: { quest: 'Find the sword' }
      };
      npc.add({
        type: TraitType.ACTOR,
        customProperties: { conversation }
      });
      world.moveEntity(npc.id, room.id);

      // VERIFY PRECONDITION: conversation state before talking
      const actorBefore = npc.get(TraitType.ACTOR);
      const convBefore = actorBefore.customProperties?.conversation;
      expect(convBefore?.hasGreeted).toBe(false);

      const command = createCommand(IFActions.TALKING, { entity: npc });
      const context = createRealTestContext(talkingAction, world, command);

      const validation = talkingAction.validate(context);
      expect(validation.valid).toBe(true);
      talkingAction.execute(context);

      // VERIFY POSTCONDITION: conversation state unchanged
      const actorAfter = npc.get(TraitType.ACTOR);
      const convAfter = actorAfter.customProperties?.conversation;
      expect(convAfter?.hasGreeted).toBe(false);
      expect(convAfter?.personality).toBe('formal');
      expect(convAfter?.topics).toEqual({ quest: 'Find the sword' });
    });
  });
});

