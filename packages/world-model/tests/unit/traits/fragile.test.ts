/**
 * Tests for FragileTrait
 */

import { FragileTrait } from '../../../src/traits/fragile/fragileTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('FragileTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new FragileTrait();
      
      expect(trait.type).toBe(TraitType.FRAGILE);
      expect(trait.breakSound).toBeUndefined();
      expect(trait.breaksInto).toBeUndefined();
      expect(trait.breakThreshold).toBe(2); // Very fragile by default
      expect(trait.fragileMaterial).toBeUndefined();
      expect(trait.damaged).toBe(false);
      expect(trait.triggersOnBreak).toBeUndefined();
      expect(trait.breakMessage).toBeUndefined();
      expect(trait.sharpFragments).toBe(false);
      expect(trait.valueWhenBroken).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new FragileTrait({
        breakSound: 'glass_shatter.mp3',
        breaksInto: ['glass-shard-001', 'glass-shard-002'],
        breakThreshold: 1,
        fragileMaterial: 'glass',
        damaged: true,
        triggersOnBreak: 'alarm-system',
        breakMessage: 'vase_shatters_message',
        sharpFragments: true,
        valueWhenBroken: 0
      });
      
      expect(trait.breakSound).toBe('glass_shatter.mp3');
      expect(trait.breaksInto).toEqual(['glass-shard-001', 'glass-shard-002']);
      expect(trait.breakThreshold).toBe(1);
      expect(trait.fragileMaterial).toBe('glass');
      expect(trait.damaged).toBe(true);
      expect(trait.triggersOnBreak).toBe('alarm-system');
      expect(trait.breakMessage).toBe('vase_shatters_message');
      expect(trait.sharpFragments).toBe(true);
      expect(trait.valueWhenBroken).toBe(0);
    });

    it('should handle all fragile materials', () => {
      const glassTrait = new FragileTrait({ fragileMaterial: 'glass' });
      expect(glassTrait.fragileMaterial).toBe('glass');
      
      const crystalTrait = new FragileTrait({ fragileMaterial: 'crystal' });
      expect(crystalTrait.fragileMaterial).toBe('crystal');
      
      const porcelainTrait = new FragileTrait({ fragileMaterial: 'porcelain' });
      expect(porcelainTrait.fragileMaterial).toBe('porcelain');
      
      const ceramicTrait = new FragileTrait({ fragileMaterial: 'ceramic' });
      expect(ceramicTrait.fragileMaterial).toBe('ceramic');
      
      const thinMetalTrait = new FragileTrait({ fragileMaterial: 'thin_metal' });
      expect(thinMetalTrait.fragileMaterial).toBe('thin_metal');
      
      const iceTrait = new FragileTrait({ fragileMaterial: 'ice' });
      expect(iceTrait.fragileMaterial).toBe('ice');
      
      const paperTrait = new FragileTrait({ fragileMaterial: 'paper' });
      expect(paperTrait.fragileMaterial).toBe('paper');
    });
  });

  describe('sharp fragments logic', () => {
    it('should default glass to sharp fragments', () => {
      const glassTrait = new FragileTrait({ fragileMaterial: 'glass' });
      expect(glassTrait.sharpFragments).toBe(true);
    });

    it('should default crystal to sharp fragments', () => {
      const crystalTrait = new FragileTrait({ fragileMaterial: 'crystal' });
      expect(crystalTrait.sharpFragments).toBe(true);
    });

    it('should not default other materials to sharp', () => {
      const porcelainTrait = new FragileTrait({ fragileMaterial: 'porcelain' });
      expect(porcelainTrait.sharpFragments).toBe(false);
      
      const ceramicTrait = new FragileTrait({ fragileMaterial: 'ceramic' });
      expect(ceramicTrait.sharpFragments).toBe(false);
      
      const paperTrait = new FragileTrait({ fragileMaterial: 'paper' });
      expect(paperTrait.sharpFragments).toBe(false);
    });

    it('should allow override of sharp fragments', () => {
      const safeGlass = new FragileTrait({
        fragileMaterial: 'glass',
        sharpFragments: false // Safety glass
      });
      expect(safeGlass.sharpFragments).toBe(false);
      
      const sharpCeramic = new FragileTrait({
        fragileMaterial: 'ceramic',
        sharpFragments: true
      });
      expect(sharpCeramic.sharpFragments).toBe(true);
    });
  });

  describe('break threshold', () => {
    it('should handle different fragility levels', () => {
      const extremelyFragile = new FragileTrait({ breakThreshold: 0 });
      expect(extremelyFragile.breakThreshold).toBe(0);
      
      const veryFragile = new FragileTrait({ breakThreshold: 1 });
      expect(veryFragile.breakThreshold).toBe(1);
      
      const fragile = new FragileTrait({ breakThreshold: 2 });
      expect(fragile.breakThreshold).toBe(2);
      
      const somewhatFragile = new FragileTrait({ breakThreshold: 5 });
      expect(somewhatFragile.breakThreshold).toBe(5);
      
      const barelyFragile = new FragileTrait({ breakThreshold: 10 });
      expect(barelyFragile.breakThreshold).toBe(10);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Crystal Vase', 'object');
      const trait = new FragileTrait({ fragileMaterial: 'crystal' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.FRAGILE)).toBe(true);
      expect(entity.getTrait(TraitType.FRAGILE)).toBe(trait);
    });

    it('should work with multiple fragile objects', () => {
      const vase = world.createEntity('Ming Vase', 'object');
      vase.add(new FragileTrait({
        fragileMaterial: 'porcelain',
        breakThreshold: 1,
        valueWhenBroken: 0,
        breaksInto: ['porcelain-shards']
      }));
      
      const window = world.createEntity('Window', 'object');
      window.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 3,
        breakSound: 'window_break.mp3',
        sharpFragments: true
      }));
      
      const vaseTrait = vase.getTrait(TraitType.FRAGILE) as FragileTrait;
      const windowTrait = window.getTrait(TraitType.FRAGILE) as FragileTrait;
      
      expect(vaseTrait.fragileMaterial).toBe('porcelain');
      expect(vaseTrait.valueWhenBroken).toBe(0);
      expect(windowTrait.fragileMaterial).toBe('glass');
      expect(windowTrait.sharpFragments).toBe(true);
    });
  });

  describe('break behavior', () => {
    it('should handle objects that break into fragments', () => {
      const trait = new FragileTrait({
        breaksInto: ['fragment-001', 'fragment-002', 'fragment-003'],
        breakSound: 'crash.mp3'
      });
      
      expect(trait.breaksInto).toHaveLength(3);
      expect(trait.breaksInto).toContain('fragment-001');
      expect(trait.breaksInto).toContain('fragment-002');
      expect(trait.breaksInto).toContain('fragment-003');
      expect(trait.breakSound).toBe('crash.mp3');
    });

    it('should handle objects that trigger events when broken', () => {
      const trait = new FragileTrait({
        triggersOnBreak: 'security-alarm',
        breakMessage: 'display_case_breaks'
      });
      
      expect(trait.triggersOnBreak).toBe('security-alarm');
      expect(trait.breakMessage).toBe('display_case_breaks');
    });

    it('should track damaged state', () => {
      const trait = new FragileTrait();
      
      expect(trait.damaged).toBe(false);
      
      // Simulate damage
      trait.damaged = true;
      expect(trait.damaged).toBe(true);
    });
  });

  describe('value handling', () => {
    it('should track value loss when broken', () => {
      const expensiveVase = new FragileTrait({
        fragileMaterial: 'crystal',
        valueWhenBroken: 0
      });
      
      expect(expensiveVase.valueWhenBroken).toBe(0);
      
      const partialValue = new FragileTrait({
        fragileMaterial: 'glass',
        valueWhenBroken: 10 // Some salvage value
      });
      
      expect(partialValue.valueWhenBroken).toBe(10);
    });

    it('should handle no value specification', () => {
      const trait = new FragileTrait();
      expect(trait.valueWhenBroken).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new FragileTrait({});
      
      expect(trait.breakThreshold).toBe(2);
      expect(trait.damaged).toBe(false);
      expect(trait.sharpFragments).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new FragileTrait(undefined);
      
      expect(trait.breakThreshold).toBe(2);
      expect(trait.damaged).toBe(false);
      expect(trait.sharpFragments).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(FragileTrait.type).toBe(TraitType.FRAGILE);
      
      const trait = new FragileTrait();
      expect(trait.type).toBe(TraitType.FRAGILE);
      expect(trait.type).toBe(FragileTrait.type);
    });

    it('should handle custom break messages', () => {
      const trait = new FragileTrait({
        breakMessage: 'ancient_artifact_destroyed'
      });
      
      expect(trait.breakMessage).toBe('ancient_artifact_destroyed');
    });
  });

  describe('realistic scenarios', () => {
    it('should create a fragile glass vase', () => {
      const entity = world.createEntity('Glass Vase', 'object');
      
      entity.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 1,
        breakSound: 'glass_shatter.mp3',
        breaksInto: ['glass-shard-001', 'glass-shard-002', 'glass-shard-003'],
        sharpFragments: true,
        valueWhenBroken: 0
      }));
      
      const trait = entity.getTrait(TraitType.FRAGILE) as FragileTrait;
      
      expect(trait.fragileMaterial).toBe('glass');
      expect(trait.sharpFragments).toBe(true);
      expect(trait.breaksInto?.length).toBe(3);
    });

    it('should create a fragile ice sculpture', () => {
      const entity = world.createEntity('Ice Sculpture', 'object');
      
      entity.add(new FragileTrait({
        fragileMaterial: 'ice',
        breakThreshold: 2,
        breakSound: 'ice_crack.mp3',
        breaksInto: ['ice-chunk-001', 'ice-chunk-002'],
        sharpFragments: false,
        damaged: false
      }));
      
      const trait = entity.getTrait(TraitType.FRAGILE) as FragileTrait;
      
      expect(trait.fragileMaterial).toBe('ice');
      expect(trait.sharpFragments).toBe(false);
      expect(trait.breakThreshold).toBe(2);
    });

    it('should create a security-protected display case', () => {
      const entity = world.createEntity('Display Case', 'object');
      
      entity.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 5, // Reinforced glass
        breakSound: 'reinforced_glass_break.mp3',
        triggersOnBreak: 'museum-alarm',
        breakMessage: 'display_case_alarm',
        sharpFragments: true
      }));
      
      const trait = entity.getTrait(TraitType.FRAGILE) as FragileTrait;
      
      expect(trait.triggersOnBreak).toBe('museum-alarm');
      expect(trait.breakThreshold).toBe(5);
    });
  });
});
