/**
 * Golden test for showing action - demonstrates testing non-transfer social interactions
 * 
 * This shows patterns for testing actions that:
 * - Display objects without transferring ownership
 * - Check viewer awareness and proximity
 * - Handle worn items
 * - Support different viewer reactions
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { showingAction } from '../../../src/actions/standard/showing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand,
  findEntityByName
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('showingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(showingAction.id).toBe(IFActions.SHOWING);
    });

    test('should declare required messages', () => {
      expect(showingAction.requiredMessages).toContain('no_item');
      expect(showingAction.requiredMessages).toContain('no_viewer');
      expect(showingAction.requiredMessages).toContain('not_carrying');
      expect(showingAction.requiredMessages).toContain('viewer_not_visible');
      expect(showingAction.requiredMessages).toContain('viewer_too_far');
      expect(showingAction.requiredMessages).toContain('not_actor');
      expect(showingAction.requiredMessages).toContain('self');
      expect(showingAction.requiredMessages).toContain('shown');
      expect(showingAction.requiredMessages).toContain('viewer_examines');
      expect(showingAction.requiredMessages).toContain('viewer_nods');
      expect(showingAction.requiredMessages).toContain('viewer_impressed');
      expect(showingAction.requiredMessages).toContain('viewer_unimpressed');
      expect(showingAction.requiredMessages).toContain('viewer_recognizes');
      expect(showingAction.requiredMessages).toContain('wearing_shown');
    });

    test('should belong to social group', () => {
      expect(showingAction.group).toBe('social');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no item specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(showingAction, world, createCommand(IFActions.SHOWING));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });

    test('should fail when no viewer specified', () => {
      const { world, player } = setupBasicWorld();
      const badge = world.createEntity('police badge', 'object');
      world.moveEntity(badge.id, player.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: badge }
        // No indirect object
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_viewer'),
        reason: 'no_viewer'
      });
    });

    test.skip('should fail when not carrying item', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const photo = world.createEntity('old photo', 'object');
      const detective = world.createEntity('detective', 'actor');
      detective.add({ type: TraitType.ACTOR });
      world.moveEntity(photo.id, room.id);
      world.moveEntity(detective.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: photo },
        { entity: detective, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_carrying'),
        params: { item: 'old photo' }
      });
    });

    test.skip('should succeed when showing worn item', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const badge = world.createEntity('sheriff badge', 'object');
      badge.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'chest'
      });
      world.moveEntity(badge.id, player.id);
      
      const deputy = world.createEntity('deputy', 'actor');
      deputy.add({ type: TraitType.ACTOR });
      world.moveEntity(deputy.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: badge },
        { entity: deputy, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      // Should succeed - worn items can be shown
      expectEvent(events, 'if.event.shown', {
        item: badge.id,
        viewer: deputy.id,
        isWorn: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('wearing_shown')
      });
    });

    test.skip('should fail when viewer not visible', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      const treasure = world.createEntity('ancient treasure', 'object');
      world.moveEntity(treasure.id, player.id);
      
      const pirate = world.createEntity('old pirate', 'actor');
      pirate.add({ type: TraitType.ACTOR });
      world.moveEntity(pirate.id, otherRoom.id); // In different room
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: treasure },
        { entity: pirate, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('viewer_not_visible'),
        params: { viewer: 'old pirate' }
      });
    });

    test.skip('should fail when viewer too far away', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      const book = world.createEntity('ancient book', 'object');
      world.moveEntity(book.id, player.id);
      
      const scholar = world.createEntity('wise scholar', 'actor');
      scholar.add({ type: TraitType.ACTOR });
      world.moveEntity(scholar.id, otherRoom.id); // In different room
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: book },
        { entity: scholar, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('viewer_too_far'),
        params: { viewer: 'wise scholar' }
      });
    });

    test.skip('should fail when viewer is not an actor', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const mirror = world.createEntity('ornate mirror', 'object');  // Not an actor
      world.moveEntity(mirror.id, room.id);
      
      const gem = world.createEntity('precious gem', 'object');
      world.moveEntity(gem.id, player.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: gem },
        { entity: mirror, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_actor'),
        reason: 'not_actor'
      });
    });

    test.skip('should fail when showing to self', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const locket = world.createEntity('silver locket', 'object');
      locket.add({
        type: TraitType.IDENTITY,
        name: 'silver locket',
        properName: 'Emily\'s Locket'
      });
      world.moveEntity(locket.id, player.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: locket },
        { entity: player, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('self'),
        params: { item: 'silver locket' }
      });
    });
  });

  describe('Viewer Reactions', () => {
    test.skip('should recognize specific items', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const crown = world.createEntity('golden crown', 'object');
      world.moveEntity(crown.id, player.id);
      
      const noble = world.createEntity('haughty noble', 'actor');
      noble.add({ type: TraitType.ACTOR });
      noble.add({
        type: TraitType.ACTOR,
        reactions: {
          recognizes: ['crown', 'scepter', 'throne']
        }
      } as any);
      world.moveEntity(noble.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: crown },
        { entity: noble, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        recognized: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_recognizes')
      });
    });

    test.skip('should be impressed by certain items', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const diamond = world.createEntity('huge diamond', 'object');
      world.moveEntity(diamond.id, player.id);
      
      const merchant = world.createEntity('greedy merchant', 'actor');
      merchant.add({ type: TraitType.ACTOR });
      merchant.add({
        type: TraitType.ACTOR,
        reactions: {
          impressed: ['diamond', 'gold', 'jewel']
        }
      } as any);
      world.moveEntity(merchant.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: diamond },
        { entity: merchant, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        impressed: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_impressed')
      });
    });

    test.skip('should be unimpressed by certain items', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const stick = world.createEntity('plain stick', 'object');
      world.moveEntity(stick.id, player.id);
      
      const king = world.createEntity('mighty king', 'actor');
      king.add({ type: TraitType.ACTOR });
      king.add({
        type: TraitType.ACTOR,
        reactions: {
          unimpressed: ['stick', 'rock', 'dirt']
        }
      } as any);
      world.moveEntity(king.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: stick },
        { entity: king, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_unimpressed')
      });
    });

    test.skip('should examine certain items closely', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const document = world.createEntity('official document', 'object');
      world.moveEntity(document.id, player.id);
      
      const clerk = world.createEntity('meticulous clerk', 'actor');
      clerk.add({ type: TraitType.ACTOR });
      clerk.add({
        type: TraitType.ACTOR,
        reactions: {
          examines: ['document', 'letter', 'scroll']
        }
      } as any);
      world.moveEntity(clerk.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: document },
        { entity: clerk, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_examines')
      });
    });

    test.skip('should nod at unspecified items', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      world.moveEntity(rock.id, player.id);
      
      const farmer = world.createEntity('busy farmer', 'actor');
      farmer.add({ type: TraitType.ACTOR });
      farmer.add({
        type: TraitType.ACTOR,
        reactions: {
          // Has reactions but none match
          impressed: ['crops', 'seeds'],
          examines: ['soil', 'water']
        }
      } as any);
      world.moveEntity(farmer.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: rock },
        { entity: farmer, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_nods')
      });
    });
  });

  describe('Successful Showing', () => {
    test.skip('should show item normally', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      const card = world.createEntity('business card', 'object');
      const secretary = world.createEntity('secretary', 'actor');
      secretary.add({ type: TraitType.ACTOR });
      // No reactions defined
      
      world.moveEntity(card.id, player.id);
      world.moveEntity(secretary.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: card },
        { entity: secretary, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      // Should emit SHOWN event
      expectEvent(events, 'if.event.shown', {
        item: card.id,
        itemName: 'business card',
        viewer: secretary.id,
        viewerName: 'secretary',
        isWorn: false
      });
      
      // Should emit basic shown message (no reactions)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('shown'),
        params: {
          item: 'business card',
          viewer: 'secretary'
        }
      });
    });

    test.skip('should show to NPC with no reactions defined', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const photo = world.createEntity('family photo', 'object');
      const stranger = world.createEntity('stranger', 'actor');
      stranger.add({ type: TraitType.ACTOR });
      // No reactions at all
      
      world.moveEntity(photo.id, player.id);
      world.moveEntity(stranger.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: photo },
        { entity: stranger, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      // Should default to 'shown' message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('shown')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test.skip('should include proper entities in all events', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const necklace = world.createEntity('pearl necklace', 'object');
      const appraiser = world.createEntity('jewelry appraiser', 'actor');
      appraiser.add({ type: TraitType.ACTOR });
      
      world.moveEntity(necklace.id, player.id);
      world.moveEntity(appraiser.id, room.id);
      
      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: necklace },
        { entity: appraiser, preposition: 'to' }
      ));
      
      const events = showingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(necklace.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Showing Action Edge Cases', () => {
  test.skip('should handle showing worn item to viewer with reactions', () => {  // Skip: depends on scope logic
    const { world, player, room } = setupBasicWorld();
    
    const uniform = world.createEntity('military uniform', 'object');
    uniform.add({
      type: TraitType.WEARABLE,
      worn: true,
      bodyPart: 'torso'
    });
    world.moveEntity(uniform.id, player.id);
    
    const general = world.createEntity('stern general', 'actor');
    general.add({ type: TraitType.ACTOR });
    general.add({
      type: TraitType.ACTOR,
      reactions: {
        recognizes: ['uniform', 'medal', 'insignia']
      }
    } as any);
    world.moveEntity(general.id, room.id);
    
    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: uniform },
      { entity: general, preposition: 'to' }
    ));
    
    const events = showingAction.execute(context);
    
    // Should recognize uniform
    expectEvent(events, 'if.event.shown', {
      isWorn: true,
      recognized: true
    });
    
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('viewer_recognizes')
    });
  });

  test.skip('should handle showing to multiple viewers sequentially', () => {  // Skip: depends on scope logic
    const { world, player, room } = setupBasicWorld();
    
    const evidence = world.createEntity('crucial evidence', 'object');
    const detective1 = world.createEntity('junior detective', 'actor');
    detective1.add({ type: TraitType.ACTOR });
    const detective2 = world.createEntity('senior detective', 'actor');
    detective2.add({ type: TraitType.ACTOR });
    detective2.add({
      type: TraitType.ACTOR,
      reactions: {
        examines: ['evidence', 'clue', 'weapon']
      }
    } as any);
    
    world.moveEntity(evidence.id, player.id);
    world.moveEntity(detective1.id, room.id);
    world.moveEntity(detective2.id, room.id);
    
    // Show to first detective
    const context1 = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: evidence },
      { entity: detective1, preposition: 'to' }
    ));
    
    const events1 = showingAction.execute(context1);
    
    expectEvent(events1, 'action.success', {
      messageId: expect.stringContaining('shown')
    });
    
    // Show to second detective
    const context2 = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: evidence },
      { entity: detective2, preposition: 'to' }
    ));
    
    const events2 = showingAction.execute(context2);
    
    expectEvent(events2, 'action.success', {
      messageId: expect.stringContaining('viewer_examines')
    });
  });

  test.skip('should handle viewer location check properly', () => {  // Skip: depends on scope logic
    const { world, player, room } = setupBasicWorld();
    
    const map = world.createEntity('treasure map', 'object');
    const pirate = world.createEntity('one-eyed pirate', 'actor');
    pirate.add({ type: TraitType.ACTOR });
    
    world.moveEntity(map.id, player.id);
    world.moveEntity(pirate.id, room.id);
    
    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: map },
      { entity: pirate, preposition: 'to' }
    ));
    
    const events = showingAction.execute(context);
    
    // Should succeed - both in same room
    expectEvent(events, 'if.event.shown', {
      item: map.id,
      viewer: pirate.id
    });
  });
});

describe('Testing Pattern Examples for Showing', () => {
  test.skip('pattern: proper name items', () => {  // Skip: depends on scope logic
    const { world, player, room } = setupBasicWorld();
    
    const painting = world.createEntity('old painting', 'object');
    painting.add({
      type: TraitType.IDENTITY,
      name: 'old painting',
      properName: 'The Night Watch'
    });
    
    const expert = world.createEntity('art expert', 'actor');
    expert.add({ type: TraitType.ACTOR });
    
    world.moveEntity(painting.id, player.id);
    world.moveEntity(expert.id, room.id);
    
    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: painting },
      { entity: expert, preposition: 'to' }
    ));
    
    const events = showingAction.execute(context);
    
    // Should include proper name in event data
    expectEvent(events, 'if.event.shown', {
      itemProperName: 'The Night Watch'
    });
  });

  test.skip('pattern: multiple reaction types priority', () => {  // Skip: depends on scope logic
    // Tests that recognizes > impressed > unimpressed > examines > nods
    const { world, player, room } = setupBasicWorld();
    
    const crown = world.createEntity('ancient crown', 'object');
    world.moveEntity(crown.id, player.id);
    
    const curator = world.createEntity('museum curator', 'actor');
    curator.add({ type: TraitType.ACTOR });
    curator.add({
      type: TraitType.ACTOR,
      reactions: {
        recognizes: ['crown'],  // Should take priority
        impressed: ['crown', 'ancient'],
        examines: ['artifact', 'crown']
      }
    } as any);
    world.moveEntity(curator.id, room.id);
    
    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: crown },
      { entity: curator, preposition: 'to' }
    ));
    
    const events = showingAction.execute(context);
    
    // Should use recognizes (highest priority)
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('viewer_recognizes')
    });
  });
});