/**
 * Tests for BellPullTrait
 */

import { BellPullTrait } from '../../../src/traits/bell-pull/bellPullTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { CordTrait } from '../../../src/traits/cord/cordTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('BellPullTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new BellPullTrait();
      
      expect(trait.type).toBe(TraitType.BELL_PULL);
      expect(trait.ringsBellId).toBeUndefined();
      expect(trait.bellSound).toBe('ding');
      expect(trait.ringCount).toBe(1);
      expect(trait.audibleDistance).toBe(1);
      expect(trait.broken).toBe(false);
      expect(trait.ringPattern).toBe('single');
    });

    it('should create trait with provided data', () => {
      const trait = new BellPullTrait({
        ringsBellId: 'church-bell-001',
        bellSound: 'deep_gong',
        ringCount: 3,
        audibleDistance: 5,
        broken: false,
        ringPattern: 'triple'
      });
      
      expect(trait.ringsBellId).toBe('church-bell-001');
      expect(trait.bellSound).toBe('deep_gong');
      expect(trait.ringCount).toBe(3);
      expect(trait.audibleDistance).toBe(5);
      expect(trait.broken).toBe(false);
      expect(trait.ringPattern).toBe('triple');
    });

    it('should handle all ring patterns', () => {
      const single = new BellPullTrait({ ringPattern: 'single' });
      expect(single.ringPattern).toBe('single');
      
      const double = new BellPullTrait({ ringPattern: 'double' });
      expect(double.ringPattern).toBe('double');
      
      const triple = new BellPullTrait({ ringPattern: 'triple' });
      expect(triple.ringPattern).toBe('triple');
      
      const continuous = new BellPullTrait({ ringPattern: 'continuous' });
      expect(continuous.ringPattern).toBe('continuous');
    });
  });

  describe('bell mechanics', () => {
    it('should track bell association', () => {
      const trait = new BellPullTrait({
        ringsBellId: 'tower-bell-001'
      });
      
      expect(trait.ringsBellId).toBe('tower-bell-001');
    });

    it('should handle broken state', () => {
      const trait = new BellPullTrait();
      
      expect(trait.broken).toBe(false);
      
      trait.broken = true;
      expect(trait.broken).toBe(true);
    });

    it('should define audible distance', () => {
      const quietBell = new BellPullTrait({
        bellSound: 'tiny_tinkle',
        audibleDistance: 0
      });
      
      const loudBell = new BellPullTrait({
        bellSound: 'massive_gong',
        audibleDistance: 10
      });
      
      expect(quietBell.audibleDistance).toBe(0);
      expect(loudBell.audibleDistance).toBe(10);
    });

    it('should handle ring count variations', () => {
      const singleRing = new BellPullTrait({ ringCount: 1 });
      const alarm = new BellPullTrait({ 
        ringCount: 10,
        ringPattern: 'continuous' 
      });
      
      expect(singleRing.ringCount).toBe(1);
      expect(alarm.ringCount).toBe(10);
      expect(alarm.ringPattern).toBe('continuous');
    });
  });

  describe('entity integration', () => {
    it('should work with pullable and cord traits', () => {
      const entity = world.createEntity('Chapel Bell Pull', 'object');
      
      entity.add(new PullableTrait({
        pullType: 'cord',
        activates: 'chapel-bell'
      }));
      
      entity.add(new CordTrait({
        cordType: 'rope',
        tension: 'slack'
      }));
      
      entity.add(new BellPullTrait({
        ringsBellId: 'chapel-bell',
        bellSound: 'church_bell',
        audibleDistance: 3
      }));
      
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.CORD)).toBe(true);
      expect(entity.hasTrait(TraitType.BELL_PULL)).toBe(true);
      
      const bellPull = entity.getTrait(TraitType.BELL_PULL) as BellPullTrait;
      expect(bellPull.ringsBellId).toBe('chapel-bell');
      expect(bellPull.audibleDistance).toBe(3);
    });

    it('should handle multiple bell pulls', () => {
      const servantBell = world.createEntity('Servant Bell Pull', 'object');
      servantBell.add(new BellPullTrait({
        bellSound: 'small_chime',
        ringCount: 2,
        audibleDistance: 1
      }));
      
      const alarmBell = world.createEntity('Fire Alarm Pull', 'object');
      alarmBell.add(new BellPullTrait({
        bellSound: 'alarm_clang',
        ringCount: 20,
        ringPattern: 'continuous',
        audibleDistance: 10
      }));
      
      const servant = servantBell.getTrait(TraitType.BELL_PULL) as BellPullTrait;
      const alarm = alarmBell.getTrait(TraitType.BELL_PULL) as BellPullTrait;
      
      expect(servant.bellSound).toBe('small_chime');
      expect(servant.audibleDistance).toBe(1);
      
      expect(alarm.bellSound).toBe('alarm_clang');
      expect(alarm.audibleDistance).toBe(10);
      expect(alarm.ringPattern).toBe('continuous');
    });
  });

  describe('sound variations', () => {
    it('should support different bell sounds', () => {
      const examples = [
        { sound: 'tiny_bell', desc: 'Small desk bell' },
        { sound: 'door_chime', desc: 'Entry bell' },
        { sound: 'ship_bell', desc: 'Naval bell' },
        { sound: 'temple_gong', desc: 'Large gong' },
        { sound: 'school_bell', desc: 'Class bell' }
      ];
      
      examples.forEach(({ sound, desc }) => {
        const trait = new BellPullTrait({ bellSound: sound });
        expect(trait.bellSound).toBe(sound);
      });
    });

    it('should handle custom ring patterns', () => {
      const doorbell = new BellPullTrait({
        bellSound: 'ding_dong',
        ringPattern: 'double'
      });
      
      const alarm = new BellPullTrait({
        bellSound: 'urgent_clang',
        ringPattern: 'continuous',
        ringCount: 30
      });
      
      expect(doorbell.ringPattern).toBe('double');
      expect(alarm.ringPattern).toBe('continuous');
      expect(alarm.ringCount).toBe(30);
    });
  });

  describe('broken bell pulls', () => {
    it('should handle broken state', () => {
      const trait = new BellPullTrait({
        broken: true,
        bellSound: 'silence'
      });
      
      expect(trait.broken).toBe(true);
      expect(trait.bellSound).toBe('silence');
    });

    it('should track previously working bell', () => {
      const trait = new BellPullTrait({
        ringsBellId: 'tower-bell',
        bellSound: 'deep_toll',
        broken: false
      });
      
      expect(trait.broken).toBe(false);
      
      // Simulate breaking
      trait.broken = true;
      
      // Still retains bell association
      expect(trait.ringsBellId).toBe('tower-bell');
      expect(trait.broken).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new BellPullTrait({});
      
      expect(trait.bellSound).toBe('ding');
      expect(trait.ringCount).toBe(1);
      expect(trait.audibleDistance).toBe(1);
      expect(trait.broken).toBe(false);
      expect(trait.ringPattern).toBe('single');
    });

    it('should handle undefined options', () => {
      const trait = new BellPullTrait(undefined);
      
      expect(trait.bellSound).toBe('ding');
      expect(trait.ringCount).toBe(1);
      expect(trait.audibleDistance).toBe(1);
      expect(trait.broken).toBe(false);
      expect(trait.ringPattern).toBe('single');
    });

    it('should maintain type constant', () => {
      expect(BellPullTrait.type).toBe(TraitType.BELL_PULL);
      
      const trait = new BellPullTrait();
      expect(trait.type).toBe(TraitType.BELL_PULL);
      expect(trait.type).toBe(BellPullTrait.type);
    });

    it('should handle silent bell (audibleDistance 0)', () => {
      const trait = new BellPullTrait({
        audibleDistance: 0,
        bellSound: 'muffled_thud'
      });
      
      expect(trait.audibleDistance).toBe(0);
      // Only audible in same room
    });

    it('should handle very loud bell', () => {
      const trait = new BellPullTrait({
        bellSound: 'cathedral_peal',
        audibleDistance: 20,
        ringCount: 12
      });
      
      expect(trait.audibleDistance).toBe(20);
      expect(trait.ringCount).toBe(12);
    });
  });
});
