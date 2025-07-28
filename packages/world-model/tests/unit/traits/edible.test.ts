// tests/unit/traits/edible.test.ts

import { EdibleTrait } from '../../../src/traits/edible/edibleTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('EdibleTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new EdibleTrait();
      
      expect(trait.type).toBe(TraitType.EDIBLE);
      expect(trait.nutrition).toBe(1);
      expect(trait.servings).toBe(1);
      expect(trait.liquid).toBe(false);
      expect(trait.consumeMessage).toBeUndefined();
      expect(trait.remainsType).toBeUndefined();
      expect(trait.hasEffect).toBe(false);
      expect(trait.effectDescription).toBeUndefined();
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
    });

    it('should create trait with provided data', () => {
      const trait = new EdibleTrait({
        nutrition: 5,
        servings: 3,
        liquid: true,
        consumeMessage: 'You drink the refreshing water.',
        remainsType: 'empty_bottle',
        hasEffect: true,
        effectDescription: 'You feel refreshed!',
        weight: 0.5,
        bulk: 1
      });
      
      expect(trait.nutrition).toBe(5);
      expect(trait.servings).toBe(3);
      expect(trait.liquid).toBe(true);
      expect(trait.consumeMessage).toBe('You drink the refreshing water.');
      expect(trait.remainsType).toBe('empty_bottle');
      expect(trait.hasEffect).toBe(true);
      expect(trait.effectDescription).toBe('You feel refreshed!');
      expect(trait.weight).toBe(0.5);
      expect(trait.bulk).toBe(1);
    });

    it('should handle partial initialization', () => {
      const trait = new EdibleTrait({
        nutrition: 10,
        liquid: true
      });
      
      expect(trait.nutrition).toBe(10);
      expect(trait.servings).toBe(1);
      expect(trait.liquid).toBe(true);
      expect(trait.hasEffect).toBe(false);
      expect(trait.weight).toBe(1);
    });

    it('should allow zero nutrition value', () => {
      const trait = new EdibleTrait({
        nutrition: 0,
        consumeMessage: 'The food is completely devoid of nutrition.'
      });
      
      expect(trait.nutrition).toBe(0);
      expect(trait.consumeMessage).toBe('The food is completely devoid of nutrition.');
    });
  });

  describe('food vs liquid', () => {
    it('should handle solid food', () => {
      const apple = new EdibleTrait({
        liquid: false,
        nutrition: 3,
        consumeMessage: 'You eat the crisp apple.'
      });
      
      expect(apple.liquid).toBe(false);
      expect(apple.nutrition).toBe(3);
    });

    it('should handle liquids', () => {
      const water = new EdibleTrait({
        liquid: true,
        nutrition: 1,
        consumeMessage: 'You drink the cool water.'
      });
      
      expect(water.liquid).toBe(true);
      expect(water.consumeMessage).toContain('drink');
    });

    it('should support various food types', () => {
      const bread = new EdibleTrait({ nutrition: 5, servings: 4 });
      const wine = new EdibleTrait({ liquid: true, nutrition: 2, hasEffect: true });
      const herb = new EdibleTrait({ nutrition: 0, hasEffect: true });
      
      expect(bread.liquid).toBe(false);
      expect(bread.servings).toBe(4);
      expect(wine.liquid).toBe(true);
      expect(wine.hasEffect).toBe(true);
      expect(herb.nutrition).toBe(0);
      expect(herb.hasEffect).toBe(true);
    });
  });

  describe('servings management', () => {
    it('should handle single serving items', () => {
      const trait = new EdibleTrait({
        servings: 1,
        consumeMessage: 'You eat the entire cookie.'
      });
      
      expect(trait.servings).toBe(1);
    });

    it('should handle multi-serving items', () => {
      const pizza = new EdibleTrait({
        servings: 8,
        nutrition: 4,
        consumeMessage: 'You eat a slice of pizza.'
      });
      
      expect(pizza.servings).toBe(8);
      expect(pizza.nutrition).toBe(4);
    });

    it('should allow fractional servings', () => {
      const trait = new EdibleTrait({
        servings: 2.5
      });
      
      expect(trait.servings).toBe(2.5);
    });

    it('should track serving consumption', () => {
      const trait = new EdibleTrait({
        servings: 3
      });
      
      expect(trait.servings).toBe(3);
      
      // Simulate consumption
      trait.servings = 2;
      expect(trait.servings).toBe(2);
      
      trait.servings = 1;
      expect(trait.servings).toBe(1);
      
      trait.servings = 0;
      expect(trait.servings).toBe(0);
    });
  });

  describe('remains after consumption', () => {
    it('should specify remains type', () => {
      const bottledWater = new EdibleTrait({
        liquid: true,
        remainsType: 'empty_bottle'
      });
      
      expect(bottledWater.remainsType).toBe('empty_bottle');
    });

    it('should handle items with no remains', () => {
      const apple = new EdibleTrait({
        nutrition: 3
        // No remainsType specified
      });
      
      expect(apple.remainsType).toBeUndefined();
    });

    it('should support various remain types', () => {
      const cannedFood = new EdibleTrait({ remainsType: 'empty_can' });
      const wrappedCandy = new EdibleTrait({ remainsType: 'candy_wrapper' });
      const bottledPotion = new EdibleTrait({ remainsType: 'empty_vial' });
      
      expect(cannedFood.remainsType).toBe('empty_can');
      expect(wrappedCandy.remainsType).toBe('candy_wrapper');
      expect(bottledPotion.remainsType).toBe('empty_vial');
    });
  });

  describe('effects', () => {
    it('should handle items with no effects', () => {
      const trait = new EdibleTrait({
        hasEffect: false
      });
      
      expect(trait.hasEffect).toBe(false);
      expect(trait.effectDescription).toBeUndefined();
    });

    it('should handle items with effects', () => {
      const healingPotion = new EdibleTrait({
        liquid: true,
        hasEffect: true,
        effectDescription: 'Your wounds begin to heal!',
        nutrition: 0
      });
      
      expect(healingPotion.hasEffect).toBe(true);
      expect(healingPotion.effectDescription).toBe('Your wounds begin to heal!');
      expect(healingPotion.nutrition).toBe(0); // Potions might not be nutritious
    });

    it('should support various effect types', () => {
      const poisonedApple = new EdibleTrait({
        hasEffect: true,
        effectDescription: 'You feel very sleepy...'
      });
      
      const magicMushroom = new EdibleTrait({
        hasEffect: true,
        effectDescription: 'Colors seem more vibrant!'
      });
      
      const energyDrink = new EdibleTrait({
        liquid: true,
        hasEffect: true,
        effectDescription: 'You feel energized!'
      });
      
      expect(poisonedApple.hasEffect).toBe(true);
      expect(magicMushroom.hasEffect).toBe(true);
      expect(energyDrink.hasEffect).toBe(true);
    });

    it('should allow effect without description', () => {
      const trait = new EdibleTrait({
        hasEffect: true
        // No effectDescription
      });
      
      expect(trait.hasEffect).toBe(true);
      expect(trait.effectDescription).toBeUndefined();
    });
  });

  describe('consume messages', () => {
    it('should support custom consume messages', () => {
      const trait = new EdibleTrait({
        consumeMessage: 'You devour the feast hungrily.'
      });
      
      expect(trait.consumeMessage).toBe('You devour the feast hungrily.');
    });

    it('should handle no consume message', () => {
      const trait = new EdibleTrait({
        nutrition: 5
      });
      
      expect(trait.consumeMessage).toBeUndefined();
    });

    it('should have appropriate messages for food vs liquid', () => {
      const food = new EdibleTrait({
        liquid: false,
        consumeMessage: 'You eat the bread.'
      });
      
      const drink = new EdibleTrait({
        liquid: true,
        consumeMessage: 'You drink the wine.'
      });
      
      expect(food.consumeMessage).toContain('eat');
      expect(drink.consumeMessage).toContain('drink');
    });
  });

  describe('physical properties', () => {
    it('should handle weight and bulk', () => {
      const heavyRation = new EdibleTrait({
        weight: 2,
        bulk: 3
      });
      
      const lightSnack = new EdibleTrait({
        weight: 0.1,
        bulk: 0.5
      });
      
      expect(heavyRation.weight).toBe(2);
      expect(heavyRation.bulk).toBe(3);
      expect(lightSnack.weight).toBe(0.1);
      expect(lightSnack.bulk).toBe(0.5);
    });

    it('should handle zero weight items', () => {
      const magicalFood = new EdibleTrait({
        weight: 0,
        bulk: 0,
        hasEffect: true
      });
      
      expect(magicalFood.weight).toBe(0);
      expect(magicalFood.bulk).toBe(0);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('apple', 'Red Apple');
      const trait = new EdibleTrait({ nutrition: 3 });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.EDIBLE)).toBe(true);
      expect(entity.getTrait(TraitType.EDIBLE)).toBe(trait);
    });

    it('should create various edible entities', () => {
      const bread = world.createEntity('bread', 'Loaf of Bread');
      bread.add(new EdibleTrait({
        nutrition: 5,
        servings: 6,
        consumeMessage: 'You eat a piece of bread.'
      }));
      
      const potion = world.createEntity('potion', 'Healing Potion');
      potion.add(new EdibleTrait({
        liquid: true,
        nutrition: 0,
        hasEffect: true,
        effectDescription: 'Your wounds heal!',
        remainsType: 'empty_vial'
      }));
      
      const wine = world.createEntity('wine', 'Bottle of Wine');
      wine.add(new EdibleTrait({
        liquid: true,
        nutrition: 2,
        servings: 4,
        hasEffect: true,
        effectDescription: 'You feel slightly tipsy.',
        remainsType: 'empty_bottle'
      }));
      
      expect(bread.hasTrait(TraitType.EDIBLE)).toBe(true);
      expect(potion.hasTrait(TraitType.EDIBLE)).toBe(true);
      expect(wine.hasTrait(TraitType.EDIBLE)).toBe(true);
    });

    it('should work with containers for liquids', () => {
      const bottle = world.createEntity('water_bottle', 'Water Bottle');
      
      bottle.add(new ContainerTrait());
      bottle.add(new EdibleTrait({
        liquid: true,
        servings: 3,
        nutrition: 1,
        remainsType: 'empty_bottle'
      }));
      
      expect(bottle.hasTrait(TraitType.CONTAINER)).toBe(true);
      expect(bottle.hasTrait(TraitType.EDIBLE)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new EdibleTrait({});
      
      expect(trait.nutrition).toBe(1);
      expect(trait.servings).toBe(1);
      expect(trait.liquid).toBe(false);
      expect(trait.hasEffect).toBe(false);
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
    });

    it('should handle undefined options', () => {
      const trait = new EdibleTrait(undefined as any);
      
      expect(trait.nutrition).toBe(1);
      expect(trait.servings).toBe(1);
      expect(trait.liquid).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(EdibleTrait.type).toBe(TraitType.EDIBLE);
      
      const trait = new EdibleTrait();
      expect(trait.type).toBe(TraitType.EDIBLE);
      expect(trait.type).toBe(EdibleTrait.type);
    });

    it('should handle negative values', () => {
      const trait = new EdibleTrait({
        nutrition: -5, // Harmful food
        servings: -1, // Invalid but allowed
        weight: -2 // Invalid but allowed
      });
      
      expect(trait.nutrition).toBe(-5);
      expect(trait.servings).toBe(-1);
      expect(trait.weight).toBe(-2);
    });

    it('should handle very large values', () => {
      const giantFeast = new EdibleTrait({
        nutrition: 1000,
        servings: 100,
        weight: 500,
        bulk: 1000
      });
      
      expect(giantFeast.nutrition).toBe(1000);
      expect(giantFeast.servings).toBe(100);
      expect(giantFeast.weight).toBe(500);
      expect(giantFeast.bulk).toBe(1000);
    });
  });

  describe('complex scenarios', () => {
    it('should handle magical food with multiple effects', () => {
      const enchantedApple = new EdibleTrait({
        nutrition: 10,
        hasEffect: true,
        effectDescription: 'You feel stronger and wiser!',
        consumeMessage: 'The golden apple tastes divine.',
        weight: 0.5
      });
      
      expect(enchantedApple.nutrition).toBe(10);
      expect(enchantedApple.hasEffect).toBe(true);
      expect(enchantedApple.consumeMessage).toContain('divine');
    });

    it('should handle rations with multiple servings', () => {
      const travelRations = new EdibleTrait({
        nutrition: 4,
        servings: 7, // One week of food
        weight: 3.5,
        bulk: 4,
        consumeMessage: 'You eat a portion of the dried rations.'
      });
      
      expect(travelRations.servings).toBe(7);
      expect(travelRations.weight).toBe(3.5);
      
      // Simulate daily consumption
      for (let day = 7; day > 0; day--) {
        travelRations.servings = day - 1;
      }
      expect(travelRations.servings).toBe(0);
    });

    it('should handle transformation items', () => {
      const mysteriousMushroom = new EdibleTrait({
        nutrition: 0,
        hasEffect: true,
        effectDescription: 'You feel strange... your body begins to change!',
        consumeMessage: 'The mushroom has an otherworldly taste.'
      });
      
      expect(mysteriousMushroom.nutrition).toBe(0);
      expect(mysteriousMushroom.hasEffect).toBe(true);
    });

    it('should handle poisoned or cursed food', () => {
      const cursedMeat = new EdibleTrait({
        nutrition: 5,
        hasEffect: true,
        effectDescription: 'You feel violently ill!',
        consumeMessage: 'The meat tastes... wrong.'
      });
      
      expect(cursedMeat.nutrition).toBe(5); // Still nutritious
      expect(cursedMeat.hasEffect).toBe(true); // But harmful
      expect(cursedMeat.consumeMessage).toContain('wrong');
    });
  });
});