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
import { TraitType, ITrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  executeWithValidation,
  expectEvent,
  TestData,
  createCommand,
  findEntityByName
} from '../../test-utils';

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

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.show_blocked', {
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
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.show_blocked', {
        messageId: expect.stringContaining('no_viewer'),
        reason: 'no_viewer'
      });
    });

    test('should implicitly take item when not carrying it', () => {
      const { world, player, room } = setupBasicWorld();
      const photo = world.createEntity('old photo', 'object');
      const detective = world.createEntity('detective', 'actor');
      detective.add({ type: TraitType.ACTOR });
      world.moveEntity(photo.id, room.id);
      world.moveEntity(detective.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: photo, secondEntity: detective, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      // Showing action implicitly takes the item first, then shows it
      expectEvent(events, 'if.event.implicit_take');
      expectEvent(events, 'if.event.shown');
    });

    test('should succeed when showing worn item', () => {
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
        { entity: badge, secondEntity: deputy, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        item: badge.id,
        viewer: deputy.id,
        isWorn: true
      });

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('wearing_shown')
      });
    });

    test('should fail when viewer not visible', () => {
      const { world, player, room } = setupBasicWorld();
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });

      const treasure = world.createEntity('ancient treasure', 'object');
      world.moveEntity(treasure.id, player.id);

      const pirate = world.createEntity('old pirate', 'actor');
      pirate.add({ type: TraitType.ACTOR });
      world.moveEntity(pirate.id, otherRoom.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: treasure, secondEntity: pirate, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.show_blocked', {
        messageId: expect.stringContaining('viewer_too_far'),
        params: { viewer: 'old pirate' }
      });
    });

    test('should fail when viewer is not an actor', () => {
      const { world, player, room } = setupBasicWorld();
      const mirror = world.createEntity('ornate mirror', 'object');
      world.moveEntity(mirror.id, room.id);

      const gem = world.createEntity('precious gem', 'object');
      world.moveEntity(gem.id, player.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: gem, secondEntity: mirror, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.show_blocked', {
        messageId: expect.stringContaining('not_actor'),
        reason: 'not_actor'
      });
    });

    test('should fail when showing to self', () => {
      const { world, player, room } = setupBasicWorld();
      const locket = world.createEntity('silver locket', 'object');
      world.moveEntity(locket.id, player.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: locket, secondEntity: player, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.show_blocked', {
        messageId: expect.stringContaining('self'),
        params: { item: 'silver locket' }
      });
    });
  });

  describe('Viewer Reactions', () => {
    test('should recognize specific items', () => {
      const { world, player, room } = setupBasicWorld();
      const crown = world.createEntity('golden crown', 'object');
      world.moveEntity(crown.id, player.id);

      const noble = world.createEntity('haughty noble', 'actor');
      noble.add({
        type: TraitType.ACTOR,
        customProperties: {
          reactions: { recognizes: ['crown', 'scepter', 'throne'] }
        }
      });
      world.moveEntity(noble.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: crown, secondEntity: noble, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('viewer_recognizes')
      });
    });

    test('should be impressed by certain items', () => {
      const { world, player, room } = setupBasicWorld();
      const diamond = world.createEntity('huge diamond', 'object');
      world.moveEntity(diamond.id, player.id);

      const merchant = world.createEntity('greedy merchant', 'actor');
      merchant.add({
        type: TraitType.ACTOR,
        customProperties: {
          reactions: { impressed: ['diamond', 'gold', 'jewel'] }
        }
      });
      world.moveEntity(merchant.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: diamond, secondEntity: merchant, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('viewer_impressed')
      });
    });

    test('should be unimpressed by certain items', () => {
      const { world, player, room } = setupBasicWorld();
      const stick = world.createEntity('plain stick', 'object');
      world.moveEntity(stick.id, player.id);

      const king = world.createEntity('mighty king', 'actor');
      king.add({
        type: TraitType.ACTOR,
        customProperties: {
          reactions: { unimpressed: ['stick', 'rock', 'dirt'] }
        }
      });
      world.moveEntity(king.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: stick, secondEntity: king, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('viewer_unimpressed')
      });
    });

    test('should examine certain items closely', () => {
      const { world, player, room } = setupBasicWorld();
      const document = world.createEntity('official document', 'object');
      world.moveEntity(document.id, player.id);

      const clerk = world.createEntity('meticulous clerk', 'actor');
      clerk.add({
        type: TraitType.ACTOR,
        customProperties: {
          reactions: { examines: ['document', 'letter', 'scroll'] }
        }
      });
      world.moveEntity(clerk.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: document, secondEntity: clerk, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('viewer_examines')
      });
    });

    test('should nod at unspecified items', () => {
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      world.moveEntity(rock.id, player.id);

      const farmer = world.createEntity('busy farmer', 'actor');
      farmer.add({
        type: TraitType.ACTOR,
        customProperties: {
          reactions: {
            impressed: ['crops', 'seeds'],
            examines: ['soil', 'water']
          }
        }
      });
      world.moveEntity(farmer.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: rock, secondEntity: farmer, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('viewer_nods')
      });
    });
  });

  describe('Successful Showing', () => {
    test('should show item normally', () => {
      const { world, player, room } = setupBasicWorld();
      const card = world.createEntity('business card', 'object');
      const secretary = world.createEntity('secretary', 'actor');
      secretary.add({ type: TraitType.ACTOR });

      world.moveEntity(card.id, player.id);
      world.moveEntity(secretary.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: card, secondEntity: secretary, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        item: card.id,
        itemName: 'business card',
        viewer: secretary.id,
        viewerName: 'secretary'
      });

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('shown'),
        params: {
          item: 'business card',
          viewer: 'secretary'
        }
      });
    });

    test('should show to NPC with no reactions defined', () => {
      const { world, player, room } = setupBasicWorld();

      const photo = world.createEntity('family photo', 'object');
      const stranger = world.createEntity('stranger', 'actor');
      stranger.add({ type: TraitType.ACTOR });

      world.moveEntity(photo.id, player.id);
      world.moveEntity(stranger.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: photo, secondEntity: stranger, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

      expectEvent(events, 'if.event.shown', {
        messageId: expect.stringContaining('shown')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();

      const necklace = world.createEntity('pearl necklace', 'object');
      const appraiser = world.createEntity('jewelry appraiser', 'actor');
      appraiser.add({ type: TraitType.ACTOR });

      world.moveEntity(necklace.id, player.id);
      world.moveEntity(appraiser.id, room.id);

      const context = createRealTestContext(showingAction, world, createCommand(
        IFActions.SHOWING,
        { entity: necklace, secondEntity: appraiser, preposition: 'to' }
      ));

      const events = executeWithValidation(showingAction, context);

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
      bodyPart: 'torso'
    });
    world.moveEntity(uniform.id, player.id);

    const general = world.createEntity('stern general', 'actor');
    general.add({
      type: TraitType.ACTOR,
      customProperties: {
        reactions: { recognizes: ['uniform', 'medal', 'insignia'] }
      }
    });
    world.moveEntity(general.id, room.id);

    const context = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: uniform, secondEntity: general, preposition: 'to' }
    ));

    const events = executeWithValidation(showingAction, context);

    expectEvent(events, 'if.event.shown', {
      isWorn: true
    });

    expectEvent(events, 'if.event.shown', {
      messageId: expect.stringContaining('viewer_recognizes')
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
      customProperties: {
        reactions: { examines: ['evidence', 'clue', 'weapon'] }
      }
    });

    world.moveEntity(evidence.id, player.id);
    world.moveEntity(detective1.id, room.id);
    world.moveEntity(detective2.id, room.id);

    // Show to first detective
    const context1 = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: evidence, secondEntity: detective1, preposition: 'to' }
    ));

    const events1 = executeWithValidation(showingAction, context1);

    expectEvent(events1, 'if.event.shown', {
      messageId: expect.stringContaining('shown')
    });

    // Show to second detective
    const context2 = createRealTestContext(showingAction, world, createCommand(
      IFActions.SHOWING,
      { entity: evidence, secondEntity: detective2, preposition: 'to' }
    ));

    const events2 = executeWithValidation(showingAction, context2);

    expectEvent(events2, 'if.event.shown', {
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
      { entity: map, secondEntity: pirate, preposition: 'to' }
    ));

    const events = executeWithValidation(showingAction, context);

    expectEvent(events, 'if.event.shown', {
      item: map.id,
      viewer: pirate.id
    });
  });
});
