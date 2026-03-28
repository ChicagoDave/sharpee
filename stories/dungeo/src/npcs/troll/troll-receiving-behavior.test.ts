/**
 * Tests for TrollReceivingBehavior
 *
 * Verifies the MDL give/throw logic (act1.254, lines 216-230):
 * - Knife: troll throws it back to the floor
 * - Non-knife: troll eats it (item removed from world)
 * - Report: correct messages for give vs throw
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IdentityTrait,
  CapabilitySharedData,
  EntityType
} from '@sharpee/world-model';
import { TrollTrait } from '../../traits/troll-trait';
import { TrollReceivingBehavior } from './troll-receiving-behavior';
import { TrollMessages } from './troll-messages';

describe('TrollReceivingBehavior', () => {
  let world: WorldModel;
  let troll: ReturnType<WorldModel['createEntity']>;
  let room: ReturnType<WorldModel['createEntity']>;
  let player: ReturnType<WorldModel['createEntity']>;

  beforeEach(() => {
    world = new WorldModel();

    room = world.createEntity('Troll Room', EntityType.ROOM);
    room.add({ type: 'room' });

    player = world.createEntity('player', EntityType.ACTOR);
    player.add({ type: 'actor' });
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    troll = world.createEntity('troll', EntityType.ACTOR);
    troll.add(new IdentityTrait({ name: 'nasty-looking troll' }));
    troll.add(new TrollTrait({ roomId: room.id, axeId: 'axe-placeholder' }));
    world.moveEntity(troll.id, room.id);
  });

  describe('validate', () => {
    it('should always pass — troll accepts anything', () => {
      const sharedData: CapabilitySharedData = {};
      const result = TrollReceivingBehavior.validate(troll, world, player.id, sharedData);
      expect(result.valid).toBe(true);
    });
  });

  describe('execute — knife given', () => {
    it('should move knife back to troll room floor', () => {
      const knife = world.createEntity('knife', EntityType.OBJECT);
      knife.add(new IdentityTrait({ name: 'rusty knife', aliases: ['knife'] }));
      world.moveEntity(knife.id, player.id);

      const sharedData: CapabilitySharedData = { itemId: knife.id };

      // Precondition: knife is with player
      expect(world.getLocation(knife.id)).toBe(player.id);

      TrollReceivingBehavior.execute(troll, world, player.id, sharedData);

      // Postcondition: knife is on room floor
      expect(world.getLocation(knife.id)).toBe(room.id);
      expect(sharedData.trollAction).toBe('throws_back');
    });

    it('should move stiletto back to troll room floor', () => {
      const stiletto = world.createEntity('stiletto', EntityType.OBJECT);
      stiletto.add(new IdentityTrait({ name: 'stiletto', aliases: ['stiletto', 'knife'] }));
      world.moveEntity(stiletto.id, player.id);

      const sharedData: CapabilitySharedData = { itemId: stiletto.id };

      TrollReceivingBehavior.execute(troll, world, player.id, sharedData);

      expect(world.getLocation(stiletto.id)).toBe(room.id);
      expect(sharedData.trollAction).toBe('throws_back');
    });
  });

  describe('execute — non-knife given', () => {
    it('should destroy the item (troll eats it)', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.add(new IdentityTrait({ name: 'red apple' }));
      world.moveEntity(apple.id, player.id);

      const sharedData: CapabilitySharedData = { itemId: apple.id };

      // Precondition: apple exists
      expect(world.getEntity(apple.id)).toBeDefined();

      TrollReceivingBehavior.execute(troll, world, player.id, sharedData);

      // Postcondition: apple is removed from world
      expect(world.getEntity(apple.id)).toBeUndefined();
      expect(sharedData.trollAction).toBe('eats');
    });
  });

  describe('report — give', () => {
    it('should emit accept + eat messages for non-knife give', () => {
      const sharedData: CapabilitySharedData = {
        itemName: 'red apple',
        trollAction: 'eats'
        // no throwType — this is a give
      };

      const effects = TrollReceivingBehavior.report(troll, world, player.id, sharedData);

      expect(effects).toHaveLength(2);
      expect(effects[0].payload.messageId).toBe(TrollMessages.ACCEPTS_GIFT);
      expect(effects[1].payload.messageId).toBe(TrollMessages.EATS_ITEM);
    });

    it('should emit accept + throws-back messages for knife give', () => {
      const sharedData: CapabilitySharedData = {
        itemName: 'rusty knife',
        trollAction: 'throws_back'
      };

      const effects = TrollReceivingBehavior.report(troll, world, player.id, sharedData);

      expect(effects).toHaveLength(2);
      expect(effects[0].payload.messageId).toBe(TrollMessages.ACCEPTS_GIFT);
      expect(effects[1].payload.messageId).toBe(TrollMessages.THROWS_KNIFE_BACK);
    });
  });

  describe('report — throw', () => {
    it('should emit catches + eat messages for non-knife throw', () => {
      const sharedData: CapabilitySharedData = {
        itemName: 'red apple',
        trollAction: 'eats',
        throwType: 'at_target'
      };

      const effects = TrollReceivingBehavior.report(troll, world, player.id, sharedData);

      expect(effects).toHaveLength(2);
      expect(effects[0].payload.messageId).toBe(TrollMessages.CATCHES_ITEM);
      expect(effects[1].payload.messageId).toBe(TrollMessages.EATS_ITEM);
    });

    it('should emit catches + throws-back messages for knife throw', () => {
      const sharedData: CapabilitySharedData = {
        itemName: 'rusty knife',
        trollAction: 'throws_back',
        throwType: 'at_target'
      };

      const effects = TrollReceivingBehavior.report(troll, world, player.id, sharedData);

      expect(effects).toHaveLength(2);
      expect(effects[0].payload.messageId).toBe(TrollMessages.CATCHES_ITEM);
      expect(effects[1].payload.messageId).toBe(TrollMessages.THROWS_KNIFE_BACK);
    });
  });
});
