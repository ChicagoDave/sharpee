// tests/unit/traits/light-source.test.ts

import { LightSourceTrait } from '../../../src/traits/light-source/lightSourceTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { SwitchableTrait } from '../../../src/traits/switchable/switchableTrait';
import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';

describe('LightSourceTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new LightSourceTrait();
      
      expect(trait.type).toBe(TraitType.LIGHT_SOURCE);
      expect(trait.brightness).toBe(5);
      expect(trait.isLit).toBe(false);
      expect(trait.fuelRemaining).toBeUndefined();
      expect(trait.maxFuel).toBeUndefined();
      expect(trait.fuelConsumptionRate).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new LightSourceTrait({
        brightness: 8,
        isLit: true,
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 0.5
      });
      
      expect(trait.brightness).toBe(8);
      expect(trait.isLit).toBe(true);
      expect(trait.fuelRemaining).toBe(100);
      expect(trait.maxFuel).toBe(100);
      expect(trait.fuelConsumptionRate).toBe(0.5);
    });

    it('should handle partial initialization', () => {
      const trait = new LightSourceTrait({
        brightness: 10,
        isLit: true
      });
      
      expect(trait.brightness).toBe(10);
      expect(trait.isLit).toBe(true);
      expect(trait.fuelRemaining).toBeUndefined();
      expect(trait.maxFuel).toBeUndefined();
      expect(trait.fuelConsumptionRate).toBeUndefined();
    });

    it('should handle fuel-based initialization', () => {
      const trait = new LightSourceTrait({
        fuelRemaining: 50,
        maxFuel: 100,
        fuelConsumptionRate: 1
      });
      
      expect(trait.brightness).toBe(5); // Default
      expect(trait.isLit).toBe(false); // Default
      expect(trait.fuelRemaining).toBe(50);
      expect(trait.maxFuel).toBe(100);
      expect(trait.fuelConsumptionRate).toBe(1);
    });
  });

  describe('brightness levels', () => {
    it('should support various brightness levels', () => {
      const candle = new LightSourceTrait({ brightness: 2 });
      const torch = new LightSourceTrait({ brightness: 5 });
      const lantern = new LightSourceTrait({ brightness: 7 });
      const floodlight = new LightSourceTrait({ brightness: 10 });
      
      expect(candle.brightness).toBe(2);
      expect(torch.brightness).toBe(5);
      expect(lantern.brightness).toBe(7);
      expect(floodlight.brightness).toBe(10);
    });

    it('should handle edge brightness values', () => {
      const dim = new LightSourceTrait({ brightness: 1 });
      const blinding = new LightSourceTrait({ brightness: 10 });
      
      expect(dim.brightness).toBe(1);
      expect(blinding.brightness).toBe(10);
    });

    it('should allow out-of-range brightness values', () => {
      const subDim = new LightSourceTrait({ brightness: 0 });
      const superBright = new LightSourceTrait({ brightness: 15 });
      
      expect(subDim.brightness).toBe(0);
      expect(superBright.brightness).toBe(15);
    });
  });

  describe('lit state', () => {
    it('should track lit status', () => {
      const trait = new LightSourceTrait();
      
      expect(trait.isLit).toBe(false);
      
      trait.isLit = true;
      expect(trait.isLit).toBe(true);
      
      trait.isLit = false;
      expect(trait.isLit).toBe(false);
    });

    it('should maintain brightness when lit state changes', () => {
      const trait = new LightSourceTrait({
        brightness: 8,
        isLit: false
      });
      
      expect(trait.brightness).toBe(8);
      expect(trait.isLit).toBe(false);
      
      trait.isLit = true;
      expect(trait.brightness).toBe(8); // Unchanged
    });
  });

  describe('fuel management', () => {
    it('should handle infinite fuel sources', () => {
      const trait = new LightSourceTrait({
        brightness: 6,
        isLit: true
        // No fuel properties = infinite
      });
      
      expect(trait.fuelRemaining).toBeUndefined();
      expect(trait.maxFuel).toBeUndefined();
      expect(trait.fuelConsumptionRate).toBeUndefined();
    });

    it('should handle fuel-based sources', () => {
      const trait = new LightSourceTrait({
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 1
      });
      
      expect(trait.fuelRemaining).toBe(100);
      expect(trait.maxFuel).toBe(100);
      expect(trait.fuelConsumptionRate).toBe(1);
    });

    it('should track fuel consumption', () => {
      const trait = new LightSourceTrait({
        isLit: true,
        fuelRemaining: 50,
        fuelConsumptionRate: 0.5
      });
      
      expect(trait.fuelRemaining).toBe(50);
      
      // Simulate fuel consumption
      trait.fuelRemaining = 49.5;
      expect(trait.fuelRemaining).toBe(49.5);
      
      trait.fuelRemaining = 0;
      expect(trait.fuelRemaining).toBe(0);
    });

    it('should handle various consumption rates', () => {
      const efficient = new LightSourceTrait({ fuelConsumptionRate: 0.1 });
      const normal = new LightSourceTrait({ fuelConsumptionRate: 1 });
      const hungry = new LightSourceTrait({ fuelConsumptionRate: 5 });
      
      expect(efficient.fuelConsumptionRate).toBe(0.1);
      expect(normal.fuelConsumptionRate).toBe(1);
      expect(hungry.fuelConsumptionRate).toBe(5);
    });

    it('should handle partial fuel properties', () => {
      const trait = new LightSourceTrait({
        fuelRemaining: 30
        // No maxFuel or consumption rate
      });
      
      expect(trait.fuelRemaining).toBe(30);
      expect(trait.maxFuel).toBeUndefined();
      expect(trait.fuelConsumptionRate).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('torch', 'Burning Torch');
      const trait = new LightSourceTrait({ brightness: 5, isLit: true });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
      expect(entity.getTrait(TraitType.LIGHT_SOURCE)).toBe(trait);
    });

    it('should create various light source entities', () => {
      const candle = world.createEntity('candle', 'Wax Candle');
      candle.add(new LightSourceTrait({
        brightness: 2,
        isLit: false,
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 2
      }));
      
      const flashlight = world.createEntity('flashlight', 'LED Flashlight');
      flashlight.add(new LightSourceTrait({
        brightness: 8,
        isLit: false,
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 0.1
      }));
      
      const magicOrb = world.createEntity('orb', 'Glowing Orb');
      magicOrb.add(new LightSourceTrait({
        brightness: 6,
        isLit: true
        // No fuel - magical
      }));
      
      expect(candle.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
      expect(flashlight.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
      expect(magicOrb.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
    });

    it('should work with switchable light sources', () => {
      const lantern = world.createEntity('lantern', 'Oil Lantern');
      
      lantern.add(new LightSourceTrait({
        brightness: 7,
        isLit: false,
        fuelRemaining: 50,
        maxFuel: 100,
        fuelConsumptionRate: 0.5
      }));
      
      lantern.add(new SwitchableTrait({
        isOn: false,
        onMessage: 'You light the lantern.',
        offMessage: 'You extinguish the lantern.'
      }));
      
      expect(lantern.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
      expect(lantern.hasTrait(TraitType.SWITCHABLE)).toBe(true);
    });

    it('should work with wearable light sources', () => {
      const headlamp = world.createEntity('headlamp', 'LED Headlamp');
      
      headlamp.add(new LightSourceTrait({
        brightness: 7,
        isLit: false,
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 0.2
      }));
      
      headlamp.add(new WearableTrait({
        slot: 'head',
        wearMessage: 'You strap on the headlamp.'
      }));
      
      expect(headlamp.hasTrait(TraitType.LIGHT_SOURCE)).toBe(true);
      expect(headlamp.hasTrait(TraitType.WEARABLE)).toBe(true);
    });
  });

  describe('light source types', () => {
    it('should handle flame-based sources', () => {
      const match = new LightSourceTrait({
        brightness: 1,
        fuelRemaining: 10,
        fuelConsumptionRate: 10 // Burns out quickly
      });
      
      const candle = new LightSourceTrait({
        brightness: 2,
        fuelRemaining: 100,
        fuelConsumptionRate: 1
      });
      
      const torch = new LightSourceTrait({
        brightness: 5,
        fuelRemaining: 60,
        fuelConsumptionRate: 2
      });
      
      expect(match.fuelConsumptionRate).toBe(10);
      expect(candle.brightness).toBe(2);
      expect(torch.brightness).toBe(5);
    });

    it('should handle electric sources', () => {
      const flashlight = new LightSourceTrait({
        brightness: 8,
        fuelRemaining: 100, // Battery percentage
        maxFuel: 100,
        fuelConsumptionRate: 0.1
      });
      
      const floodlight = new LightSourceTrait({
        brightness: 10,
        fuelRemaining: 100,
        fuelConsumptionRate: 0.5
      });
      
      expect(flashlight.fuelConsumptionRate).toBe(0.1);
      expect(floodlight.brightness).toBe(10);
    });

    it('should handle magical sources', () => {
      const glowStone = new LightSourceTrait({
        brightness: 4,
        isLit: true
        // No fuel needed
      });
      
      const enchantedLantern = new LightSourceTrait({
        brightness: 9,
        isLit: false
        // Toggleable but infinite
      });
      
      expect(glowStone.fuelRemaining).toBeUndefined();
      expect(enchantedLantern.fuelRemaining).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new LightSourceTrait({});
      
      expect(trait.brightness).toBe(5);
      expect(trait.isLit).toBe(false);
      expect(trait.fuelRemaining).toBeUndefined();
      expect(trait.maxFuel).toBeUndefined();
      expect(trait.fuelConsumptionRate).toBeUndefined();
    });

    it('should handle undefined options', () => {
      const trait = new LightSourceTrait(undefined);
      
      expect(trait.brightness).toBe(5);
      expect(trait.isLit).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(LightSourceTrait.type).toBe(TraitType.LIGHT_SOURCE);
      
      const trait = new LightSourceTrait();
      expect(trait.type).toBe(TraitType.LIGHT_SOURCE);
      expect(trait.type).toBe(LightSourceTrait.type);
    });

    it('should handle zero values', () => {
      const trait = new LightSourceTrait({
        brightness: 0,
        fuelRemaining: 0,
        maxFuel: 0,
        fuelConsumptionRate: 0
      });
      
      expect(trait.brightness).toBe(0);
      expect(trait.fuelRemaining).toBe(0);
      expect(trait.maxFuel).toBe(0);
      expect(trait.fuelConsumptionRate).toBe(0);
    });

    it('should handle negative values', () => {
      const trait = new LightSourceTrait({
        brightness: -5,
        fuelRemaining: -10,
        fuelConsumptionRate: -1
      });
      
      expect(trait.brightness).toBe(-5);
      expect(trait.fuelRemaining).toBe(-10);
      expect(trait.fuelConsumptionRate).toBe(-1);
    });

    it('should handle fractional values', () => {
      const trait = new LightSourceTrait({
        brightness: 7.5,
        fuelRemaining: 33.33,
        maxFuel: 100.5,
        fuelConsumptionRate: 0.25
      });
      
      expect(trait.brightness).toBe(7.5);
      expect(trait.fuelRemaining).toBe(33.33);
      expect(trait.maxFuel).toBe(100.5);
      expect(trait.fuelConsumptionRate).toBe(0.25);
    });
  });

  describe('complex scenarios', () => {
    it('should handle refillable light sources', () => {
      const oilLamp = world.createEntity('oil_lamp', 'Oil Lamp');
      
      const lightTrait = new LightSourceTrait({
        brightness: 6,
        isLit: false,
        fuelRemaining: 25,
        maxFuel: 100,
        fuelConsumptionRate: 0.5
      });
      
      oilLamp.add(lightTrait);
      
      // Simulate refilling
      lightTrait.fuelRemaining = 100;
      expect(lightTrait.fuelRemaining).toBe(100);
      expect(lightTrait.maxFuel).toBe(100);
    });

    it('should handle multi-mode light sources', () => {
      const adjustableLamp = world.createEntity('lamp', 'Adjustable Lamp');
      
      const lightTrait = new LightSourceTrait({
        brightness: 5, // Medium setting
        isLit: true,
        fuelRemaining: 80,
        maxFuel: 100,
        fuelConsumptionRate: 0.5
      });
      
      adjustableLamp.add(lightTrait);
      
      // Simulate brightness adjustment
      // Low mode
      lightTrait.brightness = 2;
      lightTrait.fuelConsumptionRate = 0.2;
      
      expect(lightTrait.brightness).toBe(2);
      expect(lightTrait.fuelConsumptionRate).toBe(0.2);
      
      // High mode
      lightTrait.brightness = 9;
      lightTrait.fuelConsumptionRate = 1.5;
      
      expect(lightTrait.brightness).toBe(9);
      expect(lightTrait.fuelConsumptionRate).toBe(1.5);
    });

    it('should handle degrading light sources', () => {
      const dyingTorch = world.createEntity('torch', 'Dying Torch');
      
      const lightTrait = new LightSourceTrait({
        brightness: 5,
        isLit: true,
        fuelRemaining: 10,
        maxFuel: 100,
        fuelConsumptionRate: 2
      });
      
      dyingTorch.add(lightTrait);
      
      // Simulate degradation
      expect(lightTrait.brightness).toBe(5);
      
      // As fuel runs low, brightness might decrease
      lightTrait.fuelRemaining = 5;
      lightTrait.brightness = 3;
      
      expect(lightTrait.fuelRemaining).toBe(5);
      expect(lightTrait.brightness).toBe(3);
      
      // Nearly out
      lightTrait.fuelRemaining = 1;
      lightTrait.brightness = 1;
      
      expect(lightTrait.brightness).toBe(1);
    });

    it('should handle emergency light sources', () => {
      const glowstick = world.createEntity('glowstick', 'Emergency Glowstick');
      
      const lightTrait = new LightSourceTrait({
        brightness: 3,
        isLit: false, // Not activated yet
        fuelRemaining: 100, // Once activated, can't be turned off
        maxFuel: 100,
        fuelConsumptionRate: 1
      });
      
      glowstick.add(lightTrait);
      
      // Activate (crack the glowstick)
      lightTrait.isLit = true;
      
      expect(lightTrait.isLit).toBe(true);
      expect(lightTrait.fuelRemaining).toBe(100);
      
      // Can't turn it off once activated
      // (behavior would enforce this, trait just holds data)
      expect(lightTrait.isLit).toBe(true);
    });

    it('should handle combined light sources', () => {
      // A room might have multiple light sources
      const chandelier = new LightSourceTrait({
        brightness: 8,
        isLit: true
      });
      
      const fireplace = new LightSourceTrait({
        brightness: 4,
        isLit: true,
        fuelRemaining: 50,
        fuelConsumptionRate: 3
      });
      
      const candelabra = new LightSourceTrait({
        brightness: 3,
        isLit: false,
        fuelRemaining: 100,
        maxFuel: 100,
        fuelConsumptionRate: 1
      });
      
      // Total brightness would be calculated by behavior
      expect(chandelier.brightness).toBe(8);
      expect(fireplace.brightness).toBe(4);
      expect(candelabra.brightness).toBe(3);
    });
  });
});