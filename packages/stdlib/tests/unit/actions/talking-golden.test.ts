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

import { describe, test, expect, beforeEach } from 'vitest';
import { talkingAction } from '../../../src/actions/standard/talking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

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
      
      const events = talkingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
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
      
      const events = talkingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_actor'),
        reason: 'not_actor'
      });
    });

    test('should fail when trying to talk to self', () => {
      const { world, player } = setupBasicWorld();
      
      // Add ACTOR trait to player
      player.add({
        type: TraitType.ACTOR
      });
      
      const context = createRealTestContext(talkingAction, world, createCommand(IFActions.TALKING, {
        entity: player // Talking to self
      }));
      
      const events = talkingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('self'),
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
      
      const events = talkingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_available'),
        params: { target: 'busy worker' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit TALKED event
      expectEvent(events, 'if.event.talked', {
        target: simpleNpc.id,
        targetName: 'service robot'
      });
      
      // Should emit no_response message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_response'),
        params: { target: 'service robot' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit TALKED event with first meeting flag
      expectEvent(events, 'if.event.talked', {
        target: newNpc.id,
        firstMeeting: true,
        conversationState: 'initial'
      });
      
      // Should emit first_meeting message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('first_meeting'),
        params: { target: 'traveling merchant' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit formal_greeting message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('formal_greeting'),
        params: { target: 'distinguished professor' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit casual_greeting message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('casual_greeting'),
        params: { target: 'friendly bartender' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit friendly_greeting message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('friendly_greeting'),
        params: { target: 'trusted ally' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit remembers_you message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('remembers_you'),
        params: { target: 'old innkeeper' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit greets_again message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('greets_again'),
        params: { target: 'store clerk' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit TALKED event with hasTopics flag
      expectEvent(events, 'if.event.talked', {
        target: informativeNpc.id,
        hasTopics: true
      });
      
      // Should emit has_topics message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('has_topics'),
        params: { target: 'helpful librarian' }
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
      
      const events = talkingAction.execute(context);
      
      // Should emit nothing_to_say message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('nothing_to_say'),
        params: { target: 'silent guard' }
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
      
      const events = talkingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(npc.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Talking', () => {
  test('pattern: NPC conversation states', () => {
    // Test various conversation configurations
    const world = new WorldModel();
    const npcTypes = [
      {
        name: 'quest_giver',
        conversation: {
          hasGreeted: false,
          state: 'quest_available',
          topics: { quest: 'I need your help with something important.' }
        }
      },
      {
        name: 'merchant',
        conversation: {
          hasGreeted: true,
          personality: 'formal',
          topics: { trade: 'Would you like to see my wares?', prices: 'My prices are very fair.' }
        }
      },
      {
        name: 'guard',
        conversation: {
          hasGreeted: true,
          isAvailable: true,
          relationship: 'neutral',
          topics: {}
        }
      }
    ];
    
    npcTypes.forEach(({ name, conversation }) => {
      const npc = world.createEntity(name, 'actor');
      npc.add({
        type: TraitType.ACTOR,
        conversation
      });
      
      const actorTrait = npc.get(TraitType.ACTOR) as any;
      expect(actorTrait.conversation).toEqual(conversation);
    });
  });

  test('pattern: conversation relationships', () => {
    // Test different relationship types
    const world = new WorldModel();
    const relationships = [
      { type: 'friendly', expectWarm: true },
      { type: 'neutral', expectWarm: false },
      { type: 'hostile', expectWarm: false },
      { type: 'romantic', expectWarm: true }
    ];
    
    relationships.forEach(({ type, expectWarm }) => {
      const npc = world.createEntity('test npc', 'actor');
      npc.add({
        type: TraitType.ACTOR,
        conversation: {
          relationship: type
        }
      });
      
      const actorTrait = npc.get(TraitType.ACTOR) as any;
      if (expectWarm) {
        expect(['friendly', 'romantic']).toContain(actorTrait.conversation.relationship);
      } else {
        expect(['neutral', 'hostile']).toContain(actorTrait.conversation.relationship);
      }
    });
  });

  test('pattern: conversation personalities', () => {
    // Test personality types
    const world = new WorldModel();
    const personalities = ['formal', 'casual', 'gruff', 'cheerful', 'mysterious'];
    
    personalities.forEach(personality => {
      const npc = world.createEntity('test npc', 'actor');
      npc.add({
        type: TraitType.ACTOR,
        conversation: {
          personality
        }
      });
      
      const actorTrait = npc.get(TraitType.ACTOR) as any;
      expect(actorTrait.conversation.personality).toBe(personality);
    });
  });
});
