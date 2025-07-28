/**
 * Golden test for showing action - demonstrates testing non-transfer social interactions
 * 
 * This shows patterns for testing actions that:
 * - Display objects without transferring ownership
 * - Check viewer awareness and proximity
 * - Handle worn items
 * - Support different viewer reactions
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { showingAction } from '../../../src/actions/standard/showing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createEntity, 
  createTestContext, 
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

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
      const context = createTestContext(showingAction);
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });

    test('should fail when no viewer specified', () => {
      const { world, player } = TestData.basicSetup();
      const badge = createEntity('badge', 'police badge', 'thing');
      (world as any).addTestEntity(badge);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: badge }
          // No indirect object
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_viewer'),
        reason: 'no_viewer'
      });
    });

    test('should fail when not carrying item', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const photo = createEntity('photo', 'old photo', 'thing');
      const detective = createEntity('detective', 'detective', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      
      (world as any).addTestEntity(photo);
      (world as any).addTestEntity(detective);
      (world as any).setTestLocation(photo.id, room.id);  // Photo on floor
      (world as any).setTestLocation(detective.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: photo },
          { entity: detective, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_carrying'),
        params: { item: 'old photo' }
      });
    });

    test('should succeed when showing worn item', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const badge = createEntity('badge', 'sheriff badge', 'thing', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: true,
          slot: 'chest'
        }
      });
      
      const deputy = createEntity('deputy', 'deputy', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      
      (world as any).addTestEntity(badge);
      (world as any).addTestEntity(deputy);
      (world as any).setTestLocation(badge.id, player.id);  // Badge on player
      (world as any).setTestLocation(deputy.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: badge },
          { entity: deputy, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        item: 'badge',
        itemName: 'sheriff badge',
        isWorn: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('wearing_shown')
      });
    });

    test('should fail when viewer not visible', () => {
      const { world, player, item } = TestData.withInventoryItem('map', 'treasure map');
      
      const pirate = createEntity('pirate', 'old pirate', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      (world as any).addTestEntity(pirate);
      (world as any).setTestLocation(pirate.id, 'room2');  // Different room
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: item },
          { entity: pirate, preposition: 'to' }
        )
      });
      
      // Override canSee to return false
      context.canSee = jest.fn(() => false);
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('viewer_not_visible'),
        params: { viewer: 'old pirate' }
      });
    });

    test('should fail when viewer too far away', () => {
      const { world, player, item } = TestData.withInventoryItem('scroll', 'ancient scroll');
      
      const scholar = createEntity('scholar', 'wise scholar', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      (world as any).addTestEntity(scholar);
      (world as any).setTestLocation(scholar.id, 'room2');  // Different room
      
      // Mock getLocation to show different rooms
      (world.getLocation as jest.Mock).mockImplementation((id: string) => {
        if (id === player.id) return 'room1';
        if (id === scholar.id) return 'room2';
        if (id === item.id) return player.id;
        return undefined;
      });
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: item },
          { entity: scholar, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('viewer_too_far'),
        params: { viewer: 'wise scholar' }
      });
    });

    test('should fail when viewer is not an actor', () => {
      const { world, player, room, item } = TestData.withInventoryItem('painting', 'famous painting');
      
      const mirror = createEntity('mirror', 'ornate mirror', 'thing');  // Not an actor
      (world as any).addTestEntity(mirror);
      (world as any).setTestLocation(mirror.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: item },
          { entity: mirror, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_actor'),
        reason: 'not_actor'
      });
    });

    test('should fail when showing to self', () => {
      const { world, player, item } = TestData.withInventoryItem('mirror', 'hand mirror');
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: item },
          { entity: player, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('self'),
        params: { item: 'hand mirror' }
      });
    });
  });

  describe('Viewer Reactions', () => {
    test('should recognize specific items', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const locket = createEntity('locket', 'silver locket', 'thing', {
        [TraitType.IDENTITY]: {
          type: TraitType.IDENTITY,
          properName: 'The Lost Locket of Lady Margaret'
        }
      });
      
      const ghost = createEntity('ghost', 'pale ghost', 'actor', {
        [TraitType.ACTOR]: { 
          type: TraitType.ACTOR,
          reactions: {
            recognizes: ['locket', 'portrait', 'ring']
          }
        }
      });
      
      (world as any).addTestEntity(locket);
      (world as any).addTestEntity(ghost);
      (world as any).setTestLocation(locket.id, player.id);
      (world as any).setTestLocation(ghost.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: locket },
          { entity: ghost, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        item: 'locket',
        viewer: 'ghost',
        recognized: true,
        itemProperName: 'The Lost Locket of Lady Margaret'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_recognizes')
      });
    });

    test('should be impressed by certain items', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const crown = createEntity('crown', 'golden crown', 'thing');
      
      const noble = createEntity('noble', 'haughty noble', 'actor', {
        [TraitType.ACTOR]: { 
          type: TraitType.ACTOR,
          reactions: {
            impressed: ['crown', 'scepter', 'jewel']
          }
        }
      });
      
      (world as any).addTestEntity(crown);
      (world as any).addTestEntity(noble);
      (world as any).setTestLocation(crown.id, player.id);
      (world as any).setTestLocation(noble.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: crown },
          { entity: noble, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        impressed: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_impressed')
      });
    });

    test('should be unimpressed by certain items', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const stick = createEntity('stick', 'plain stick', 'thing');
      
      const king = createEntity('king', 'mighty king', 'actor', {
        [TraitType.ACTOR]: { 
          type: TraitType.ACTOR,
          reactions: {
            unimpressed: ['stick', 'rock', 'dirt']
          }
        }
      });
      
      (world as any).addTestEntity(stick);
      (world as any).addTestEntity(king);
      (world as any).setTestLocation(stick.id, player.id);
      (world as any).setTestLocation(king.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: stick },
          { entity: king, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_unimpressed')
      });
    });

    test('should examine certain items closely', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const document = createEntity('document', 'official document', 'thing');
      
      const clerk = createEntity('clerk', 'meticulous clerk', 'actor', {
        [TraitType.ACTOR]: { 
          type: TraitType.ACTOR,
          reactions: {
            examines: ['document', 'letter', 'scroll']
          }
        }
      });
      
      (world as any).addTestEntity(document);
      (world as any).addTestEntity(clerk);
      (world as any).setTestLocation(document.id, player.id);
      (world as any).setTestLocation(clerk.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: document },
          { entity: clerk, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_examines')
      });
    });

    test('should nod at unspecified items', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const rock = createEntity('rock', 'ordinary rock', 'thing');
      
      const farmer = createEntity('farmer', 'busy farmer', 'actor', {
        [TraitType.ACTOR]: { 
          type: TraitType.ACTOR,
          reactions: {
            impressed: ['gold'],
            // Rock matches nothing
          }
        }
      });
      
      (world as any).addTestEntity(rock);
      (world as any).addTestEntity(farmer);
      (world as any).setTestLocation(rock.id, player.id);
      (world as any).setTestLocation(farmer.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: rock },
          { entity: farmer, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('viewer_nods')
      });
    });
  });

  describe('Successful Showing', () => {
    test('should show item normally', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const card = createEntity('card', 'business card', 'thing');
      const secretary = createEntity('secretary', 'secretary', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      
      (world as any).addTestEntity(card);
      (world as any).addTestEntity(secretary);
      (world as any).setTestLocation(card.id, player.id);
      (world as any).setTestLocation(secretary.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: card },
          { entity: secretary, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        item: 'card',
        itemName: 'business card',
        viewer: 'secretary',
        viewerName: 'secretary',
        isWorn: false
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('shown'),
        params: { 
          item: 'business card',
          viewer: 'secretary'
        }
      });
    });

    test('should show to NPC with no reactions defined', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const photo = createEntity('photo', 'family photo', 'thing');
      const stranger = createEntity('stranger', 'stranger', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
        // No reactions defined
      });
      
      (world as any).addTestEntity(photo);
      (world as any).addTestEntity(stranger);
      (world as any).setTestLocation(photo.id, player.id);
      (world as any).setTestLocation(stranger.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: photo },
          { entity: stranger, preposition: 'to' }
        )
      });
      
      const events = showingAction.execute(context);
      
      expectEvent(events, 'if.event.shown', {
        item: 'photo',
        viewer: 'stranger'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('shown')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = TestData.basicSetup();
      
      const necklace = createEntity('necklace', 'pearl necklace', 'thing');
      const appraiser = createEntity('appraiser', 'jewelry appraiser', 'actor', {
        [TraitType.ACTOR]: { type: TraitType.ACTOR }
      });
      
      (world as any).addTestEntity(necklace);
      (world as any).addTestEntity(appraiser);
      (world as any).setTestLocation(necklace.id, player.id);
      (world as any).setTestLocation(appraiser.id, room.id);
      
      const context = createTestContext(showingAction, {
        world,
        player,
        command: createCommand(
          IFActions.SHOWING,
          { entity: necklace },
          { entity: appraiser, preposition: 'to' }
        )
      });
      
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
  test('should handle showing worn item to viewer with reactions', () => {
    const { world, player, room } = setupBasicWorld();
    
    const uniform = world.createEntity('military uniform', 'object');
    uniform.add({
      type: TraitType.WEARABLE,
      worn: true,
      slot: 'body'
    });
    
    const general = world.createEntity('stern general', 'actor');
    general.add({ 
      type: TraitType.ACTOR,
      reactions: {
        impressed: ['uniform', 'medal']
      }
    });
    
    world.moveEntity(uniform.id, player.id);
    world.moveEntity(general.id, room.id);
    
    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: uniform },
      { entity: general, preposition: 'to' }
    ));
    
    const events = showingAction.execute(context);
    
    expectEvent(events, 'if.event.shown', {
      isWorn: true,
      impressed: true
    });
    
    // Should use impressed message, not wearing_shown
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('viewer_impressed')
    });
  });

  test('should handle showing to multiple viewers sequentially', () => {
    const { world, player, room } = setupBasicWorld();
    
    const evidence = world.createEntity('crucial evidence', 'object');
    const detective1 = world.createEntity('junior detective', 'actor');
    detective1.add({ type: TraitType.ACTOR });
    const detective2 = world.createEntity('senior detective', 'actor');
    detective2.add({ 
      type: TraitType.ACTOR,
      reactions: {
        examines: ['evidence']
      }
    });
    
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

  test('should handle viewer location check properly', () => {
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
});entities.actor).toBe('player');
          expect(event.entities.target).toBe('necklace');
          expect(event.entities.location).toBe('room1');
        }
      });
    });
  });
});

describe('Showing Action Edge Cases', () => {
  test('should handle showing worn item to viewer with reactions', () => {
    const { world, player, room } = TestData.basicSetup();
    
    const uniform = createEntity('uniform', 'military uniform', 'thing', {
      [TraitType.WEARABLE]: {
        type: TraitType.WEARABLE,
        worn: true,
        slot: 'body'
      }
    });
    
    const general = createEntity('general', 'stern general', 'actor', {
      [TraitType.ACTOR]: { 
        type: TraitType.ACTOR,
        reactions: {
          impressed: ['uniform', 'medal']
        }
      }
    });
    
    (world as any).addTestEntity(uniform);
    (world as any).addTestEntity(general);
    (world as any).setTestLocation(uniform.id, player.id);
    (world as any).setTestLocation(general.id, room.id);
    
    const context = createTestContext(showingAction, {
      world,
      player,
      command: createCommand(
        IFActions.SHOWING,
        { entity: uniform },
        { entity: general, preposition: 'to' }
      )
    });
    
    const events = showingAction.execute(context);
    
    expectEvent(events, 'if.event.shown', {
      isWorn: true,
      impressed: true
    });
    
    // Should use impressed message, not wearing_shown
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('viewer_impressed')
    });
  });

  test('should handle showing to multiple viewers sequentially', () => {
    const { world, player, room } = TestData.basicSetup();
    
    const evidence = createEntity('evidence', 'crucial evidence', 'thing');
    const detective1 = createEntity('detective1', 'junior detective', 'actor', {
      [TraitType.ACTOR]: { type: TraitType.ACTOR }
    });
    const detective2 = createEntity('detective2', 'senior detective', 'actor', {
      [TraitType.ACTOR]: { 
        type: TraitType.ACTOR,
        reactions: {
          examines: ['evidence']
        }
      }
    });
    
    (world as any).addTestEntity(evidence);
    (world as any).addTestEntity(detective1);
    (world as any).addTestEntity(detective2);
    (world as any).setTestLocation(evidence.id, player.id);
    (world as any).setTestLocation(detective1.id, room.id);
    (world as any).setTestLocation(detective2.id, room.id);
    
    // Show to first detective
    const context1 = createTestContext(showingAction, {
      world,
      player,
      command: createCommand(
        IFActions.SHOWING,
        { entity: evidence },
        { entity: detective1, preposition: 'to' }
      )
    });
    
    const events1 = showingAction.execute(context1);
    
    expectEvent(events1, 'action.success', {
      messageId: expect.stringContaining('shown')
    });
    
    // Show to second detective
    const context2 = createTestContext(showingAction, {
      world,
      player,
      command: createCommand(
        IFActions.SHOWING,
        { entity: evidence },
        { entity: detective2, preposition: 'to' }
      )
    });
    
    const events2 = showingAction.execute(context2);
    
    expectEvent(events2, 'action.success', {
      messageId: expect.stringContaining('viewer_examines')
    });
  });

  test('should handle viewer location check properly', () => {
    const { world, player, room } = TestData.basicSetup();
    
    const map = createEntity('map', 'treasure map', 'thing');
    const pirate = createEntity('pirate', 'one-eyed pirate', 'actor', {
      [TraitType.ACTOR]: { type: TraitType.ACTOR }
    });
    
    (world as any).addTestEntity(map);
    (world as any).addTestEntity(pirate);
    (world as any).setTestLocation(map.id, player.id);
    (world as any).setTestLocation(pirate.id, room.id);
    
    // Mock location checks
    (world.getLocation as jest.Mock).mockImplementation((id: string) => {
      if (id === player.id) return room.id;
      if (id === pirate.id) return room.id;
      if (id === map.id) return player.id;
      return undefined;
    });
    
    const context = createTestContext(showingAction, {
      world,
      player,
      command: createCommand(
        IFActions.SHOWING,
        { entity: map },
        { entity: pirate, preposition: 'to' }
      )
    });
    
    const events = showingAction.execute(context);
    
    // Should succeed - both in same room
    expectEvent(events, 'if.event.shown', {
      item: 'map',
      viewer: 'pirate'
    });
  });
});
