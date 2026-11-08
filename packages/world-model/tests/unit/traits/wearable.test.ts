// tests/unit/traits/wearable.test.ts
//
// ADR-392 D1: a wearable is simple (no placement) or placed (a required
// bodyPart + layer pair). The earlier slot / blocksSlots / wearableOver
// vocabulary, which no action ever read, is retired.

import { WearableTrait, IWearableData } from '../../../src/traits/wearable/wearableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { WearableBehavior } from '../../../src/traits/wearable/wearableBehavior';
import { createTestWearable, createTestActor } from '../../fixtures/test-entities';

describe('WearableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create a simple wearable by default', () => {
      const trait = new WearableTrait();

      expect(trait.type).toBe(TraitType.WEARABLE);
      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
      expect(trait.placement).toBeUndefined();
      expect(trait.wearMessage).toBeUndefined();
      expect(trait.removeMessage).toBeUndefined();
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
      expect(trait.canRemove).toBe(true);
    });

    it('should create trait with provided data', () => {
      const trait = new WearableTrait({
        isWorn: true,
        wornBy: 'player',
        placement: { bodyPart: 'head', layer: 2 },
        wearMessage: 'You put on the helmet.',
        removeMessage: 'You take off the helmet.',
        weight: 3,
        bulk: 2,
        canRemove: true
      });

      expect(trait.isWorn).toBe(true);
      expect(trait.wornBy).toBe('player');
      expect(trait.placement).toEqual({ bodyPart: 'head', layer: 2 });
      expect(trait.wearMessage).toBe('You put on the helmet.');
      expect(trait.removeMessage).toBe('You take off the helmet.');
      expect(trait.weight).toBe(3);
      expect(trait.bulk).toBe(2);
      expect(trait.canRemove).toBe(true);
    });

    it('should handle partial initialization', () => {
      const trait = new WearableTrait({
        weight: 0.5
      });

      expect(trait.isWorn).toBe(false);
      expect(trait.placement).toBeUndefined();
      expect(trait.weight).toBe(0.5);
      expect(trait.bulk).toBe(1);
    });

    it('copies the placement pair rather than keeping the caller\'s object', () => {
      const given = { bodyPart: 'torso', layer: 1 };
      const trait = new WearableTrait({ placement: given });
      given.layer = 9;
      expect(trait.placement).toEqual({ bodyPart: 'torso', layer: 1 });
    });
  });

  describe('placement (ADR-392 D1)', () => {
    it('a placed wearable carries both halves', () => {
      const hat = new WearableTrait({ placement: { bodyPart: 'head', layer: 1 } });
      expect(hat.placement!.bodyPart).toBe('head');
      expect(hat.placement!.layer).toBe(1);
    });

    it('body parts are the author\'s words', () => {
      const pad = new WearableTrait({ placement: { bodyPart: 'left-shoulder', layer: 1 } });
      expect(pad.placement!.bodyPart).toBe('left-shoulder');
    });

    it('supports different layers on one part', () => {
      const underwear = new WearableTrait({ placement: { bodyPart: 'torso', layer: 0 } });
      const shirt = new WearableTrait({ placement: { bodyPart: 'torso', layer: 1 } });
      const jacket = new WearableTrait({ placement: { bodyPart: 'torso', layer: 2 } });
      const coat = new WearableTrait({ placement: { bodyPart: 'torso', layer: 3 } });

      expect(underwear.placement?.layer).toBe(0);
      expect(shirt.placement?.layer).toBe(1);
      expect(jacket.placement?.layer).toBe(2);
      expect(coat.placement?.layer).toBe(3);
    });
  });

  describe('worn state', () => {
    it('should track worn state via isWorn accessor', () => {
      const trait = new WearableTrait();

      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();

      // Simulate wearing
      trait.isWorn = true;
      trait.wornBy = 'player';

      expect(trait.isWorn).toBe(true);
      expect(trait.wornBy).toBe('player');
    });

    it('should handle different wearers', () => {
      const crown = new WearableTrait({
        isWorn: true,
        wornBy: 'king'
      });

      expect(crown.isWorn).toBe(true);
      expect(crown.wornBy).toBe('king');

      // Transfer to another wearer
      crown.wornBy = 'usurper';

      expect(crown.wornBy).toBe('usurper');
    });

    it('should clear wornBy when not worn', () => {
      const trait = new WearableTrait({
        isWorn: true,
        wornBy: 'player'
      });

      // Remove item
      trait.isWorn = false;
      trait.wornBy = undefined;

      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
    });
  });

  describe('messages', () => {
    it('should store custom wear and remove messages', () => {
      const trait = new WearableTrait({
        wearMessage: 'You slip on the silk gloves.',
        removeMessage: 'You carefully remove the silk gloves.'
      });

      expect(trait.wearMessage).toBe('You slip on the silk gloves.');
      expect(trait.removeMessage).toBe('You carefully remove the silk gloves.');
    });

    it('should allow undefined messages', () => {
      const trait = new WearableTrait({
        placement: { bodyPart: 'finger', layer: 1 }
        // No messages defined
      });

      expect(trait.wearMessage).toBeUndefined();
      expect(trait.removeMessage).toBeUndefined();
    });

    it('should allow only wear message', () => {
      const trait = new WearableTrait({
        wearMessage: 'You don the armor with a satisfying clank.'
      });

      expect(trait.wearMessage).toBe('You don the armor with a satisfying clank.');
      expect(trait.removeMessage).toBeUndefined();
    });
  });

  describe('physical properties', () => {
    it('should handle weight and bulk', () => {
      const heavyArmor = new WearableTrait({
        weight: 25,
        bulk: 10
      });

      const lightCloak = new WearableTrait({
        weight: 0.5,
        bulk: 2
      });

      expect(heavyArmor.weight).toBe(25);
      expect(heavyArmor.bulk).toBe(10);
      expect(lightCloak.weight).toBe(0.5);
      expect(lightCloak.bulk).toBe(2);
    });

    it('should handle zero weight items', () => {
      const feather = new WearableTrait({
        weight: 0,
        bulk: 0
      });

      expect(feather.weight).toBe(0);
      expect(feather.bulk).toBe(0);
    });

    it('should handle fractional values', () => {
      const trait = new WearableTrait({
        weight: 1.75,
        bulk: 0.25
      });

      expect(trait.weight).toBe(1.75);
      expect(trait.bulk).toBe(0.25);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Wizard Hat', 'item');
      const trait = new WearableTrait({ placement: { bodyPart: 'head', layer: 1 } });

      entity.add(trait);

      expect(entity.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(entity.getTrait(TraitType.WEARABLE)).toBe(trait);
    });

    it('should create various wearable items', () => {
      const helmet = world.createEntity('Steel Helmet', 'item');
      helmet.add(new WearableTrait({
        placement: { bodyPart: 'head', layer: 1 },
        weight: 5
      }));

      const gloves = world.createEntity('Leather Gloves', 'item');
      gloves.add(new WearableTrait({
        weight: 0.5,
        placement: { bodyPart: 'hands', layer: 1 }
      }));

      const cloak = world.createEntity('Traveling Cloak', 'item');
      cloak.add(new WearableTrait({
        weight: 2,
        placement: { bodyPart: 'back', layer: 3 }
      }));

      expect(helmet.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(gloves.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(cloak.hasTrait(TraitType.WEARABLE)).toBe(true);
    });

    it('should work with actor wearing items', () => {
      const player = world.createEntity('Hero', 'actor');
      player.add(new ActorTrait({ isPlayer: true }));
      player.add(new ContainerTrait()); // For inventory

      const shirt = world.createEntity('Cotton Shirt', 'item');
      const shirtTrait = new WearableTrait({
        placement: { bodyPart: 'torso', layer: 1 },
        isWorn: true,
        wornBy: 'player'
      });
      shirt.add(shirtTrait);

      expect(shirtTrait.isWorn).toBe(true);
      expect(shirtTrait.wornBy).toBe('player');
    });
  });

  describe('complex wearable scenarios', () => {
    it('should handle layered armor system', () => {
      const padding = new WearableTrait({ placement: { bodyPart: 'torso', layer: 0 }, weight: 2 });
      const chainmail = new WearableTrait({ placement: { bodyPart: 'torso', layer: 1 }, weight: 15 });
      const breastplate = new WearableTrait({ placement: { bodyPart: 'torso', layer: 2 }, weight: 20 });
      const tabard = new WearableTrait({ placement: { bodyPart: 'torso', layer: 3 }, weight: 0.5 });

      // All occupy the same body part at different layers
      expect(padding.placement!.bodyPart).toBe('torso');
      expect(chainmail.placement!.bodyPart).toBe('torso');
      expect(breastplate.placement!.bodyPart).toBe('torso');
      expect(tabard.placement!.bodyPart).toBe('torso');

      // Layers increase from inner to outer
      expect(padding.placement!.layer < chainmail.placement!.layer).toBe(true);
      expect(chainmail.placement!.layer < breastplate.placement!.layer).toBe(true);
      expect(breastplate.placement!.layer < tabard.placement!.layer).toBe(true);
    });

    it('jewelry is simple: several rings never place themselves anywhere', () => {
      const ring1 = new WearableTrait();
      const ring2 = new WearableTrait();
      const ring3 = new WearableTrait();

      expect(ring1.placement).toBeUndefined();
      expect(ring2.placement).toBeUndefined();
      expect(ring3.placement).toBeUndefined();
    });

    it('should handle outfit sets', () => {
      const wizardHat = new WearableTrait({
        placement: { bodyPart: 'head', layer: 1 },
        wearMessage: 'You feel magical as you don the pointed hat.'
      });

      const wizardRobe = new WearableTrait({
        placement: { bodyPart: 'torso', layer: 2 },
        wearMessage: 'The robe swirls dramatically around you.'
      });

      const wizardStaff = new WearableTrait({
        wearMessage: 'Power courses through the staff as you grip it.'
      });

      expect(wizardHat.placement!.bodyPart).toBe('head');
      expect(wizardRobe.placement!.bodyPart).toBe('torso');
      expect(wizardStaff.placement).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new WearableTrait({});

      expect(trait.isWorn).toBe(false);
      expect(trait.placement).toBeUndefined();
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
    });

    it('should handle undefined as parameter', () => {
      const trait = new WearableTrait(undefined as unknown as IWearableData);

      expect(trait.worn).toBe(false);
      expect(trait.placement).toBeUndefined();
    });

    it('should maintain type constant', () => {
      expect(WearableTrait.type).toBe(TraitType.WEARABLE);

      const trait = new WearableTrait();
      expect(trait.type).toBe(TraitType.WEARABLE);
      expect(trait.type).toBe(WearableTrait.type);
    });

    it('should handle boolean false values correctly', () => {
      const trait = new WearableTrait({
        isWorn: false,
        canRemove: false
      });

      expect(trait.isWorn).toBe(false);
      expect(trait.canRemove).toBe(false);
    });

    it('should handle zero and negative values', () => {
      const trait = new WearableTrait({
        placement: { bodyPart: 'torso', layer: 0 },
        weight: 0,
        bulk: 0
      });

      expect(trait.placement?.layer).toBe(0);
      expect(trait.weight).toBe(0);
      expect(trait.bulk).toBe(0);

      // Negative values (game logic should validate)
      const negativeTrait = new WearableTrait({
        placement: { bodyPart: 'torso', layer: -1 },
        weight: -5
      });

      expect(negativeTrait.placement?.layer).toBe(-1);
      expect(negativeTrait.weight).toBe(-5);
    });
  });

  describe('World State Behaviors', () => {
    it('should mutate worn state via WearableBehavior.wear', () => {
      const player = createTestActor(world, 'Player', true);
      const ring = createTestWearable(world, 'Gold Ring');
      world.moveEntity(ring.id, player.id);

      const wearable = ring.getTrait(TraitType.WEARABLE) as WearableTrait;

      // PRECONDITION
      expect(wearable.worn).toBe(false);
      expect(wearable.wornBy).toBeUndefined();

      // ACT
      const result = WearableBehavior.wear(ring, player);

      // POSTCONDITION
      expect(result.success).toBe(true);
      expect(wearable.worn).toBe(true);
      expect(wearable.wornBy).toBe(player.id);
    });

    it('reports a placed wearable\'s layer and nothing for a simple one', () => {
      const player = createTestActor(world, 'Player', true);
      const hat = createTestWearable(world, 'Hat', { bodyPart: 'head', layer: 2 });
      const ring = createTestWearable(world, 'Ring');
      world.moveEntity(hat.id, player.id);
      world.moveEntity(ring.id, player.id);

      expect(WearableBehavior.wear(hat, player).layer).toBe(2);
      expect(WearableBehavior.wear(ring, player).layer).toBeUndefined();
      expect(WearableBehavior.getLayer(hat)).toBe(2);
      expect(WearableBehavior.getLayer(ring)).toBeUndefined();
    });

    it('should mutate worn state via WearableBehavior.remove', () => {
      const player = createTestActor(world, 'Player', true);
      const hat = createTestWearable(world, 'Hat', { bodyPart: 'head' });
      world.moveEntity(hat.id, player.id);
      WearableBehavior.wear(hat, player);

      const wearable = hat.getTrait(TraitType.WEARABLE) as WearableTrait;

      // PRECONDITION
      expect(wearable.worn).toBe(true);

      // ACT
      const result = WearableBehavior.remove(hat, player);

      // POSTCONDITION
      expect(result.success).toBe(true);
      expect(wearable.worn).toBe(false);
      expect(wearable.wornBy).toBeUndefined();
    });

    it('should block wearing an already-worn item', () => {
      const player = createTestActor(world, 'Player', true);
      const gloves = createTestWearable(world, 'Gloves', { bodyPart: 'hands' });
      world.moveEntity(gloves.id, player.id);
      WearableBehavior.wear(gloves, player);

      // ACT: try to wear again
      const result = WearableBehavior.wear(gloves, player);

      // POSTCONDITION
      expect(result.success).toBe(false);
      expect(result.alreadyWorn).toBe(true);
    });

    it('should block removal by a different actor', () => {
      const player = createTestActor(world, 'Player', true);
      const npc = createTestActor(world, 'Guard', false);
      const crown = createTestWearable(world, 'Crown', { bodyPart: 'head' });
      world.moveEntity(crown.id, player.id);
      WearableBehavior.wear(crown, player);

      // ACT: NPC tries to remove player's crown
      const result = WearableBehavior.remove(crown, npc);

      // POSTCONDITION: blocked, crown still worn by player
      expect(result.success).toBe(false);
      expect(result.wornByOther).toBe(player.id);
      const wearable = crown.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(wearable.worn).toBe(true);
      expect(wearable.wornBy).toBe(player.id);
    });
  });
});
