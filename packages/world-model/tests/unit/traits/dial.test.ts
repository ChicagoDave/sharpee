/**
 * Tests for DialTrait
 */

import { DialTrait } from '../../../src/traits/dial/dialTrait';
import { TurnableTrait } from '../../../src/traits/turnable/turnableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('DialTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new DialTrait();
      
      expect(trait.type).toBe(TraitType.DIAL);
      expect(trait.numbered).toBe(true);
      expect(trait.hasTickMarks).toBe(true);
      expect(trait.tickCount).toBeUndefined();
      expect(trait.labels).toBeUndefined();
      expect(trait.continuous).toBe(false);
      expect(trait.displayType).toBeUndefined();
      expect(trait.units).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new DialTrait({
        numbered: false,
        hasTickMarks: true,
        tickCount: 10,
        labels: ['OFF', 'LOW', 'MED', 'HIGH'],
        continuous: true,
        displayType: 'digital',
        units: 'MHz'
      });
      
      expect(trait.numbered).toBe(false);
      expect(trait.hasTickMarks).toBe(true);
      expect(trait.tickCount).toBe(10);
      expect(trait.labels).toEqual(['OFF', 'LOW', 'MED', 'HIGH']);
      expect(trait.continuous).toBe(true);
      expect(trait.displayType).toBe('digital');
      expect(trait.units).toBe('MHz');
    });

    it('should handle all display types', () => {
      const analogDial = new DialTrait({ displayType: 'analog' });
      expect(analogDial.displayType).toBe('analog');
      
      const digitalDial = new DialTrait({ displayType: 'digital' });
      expect(digitalDial.displayType).toBe('digital');
      
      const bothDial = new DialTrait({ displayType: 'both' });
      expect(bothDial.displayType).toBe('both');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Radio Dial', 'object');
      const trait = new DialTrait({ units: 'MHz' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.DIAL)).toBe(true);
      expect(entity.getTrait(TraitType.DIAL)).toBe(trait);
    });

    it('should work with TurnableTrait', () => {
      const entity = world.createEntity('Safe Dial', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'dial',
        settings: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
        currentSetting: 0,
        bidirectional: true,
        turnSound: 'safe_click.mp3'
      }));
      
      entity.add(new DialTrait({
        numbered: true,
        hasTickMarks: true,
        tickCount: 100,
        continuous: false,
        displayType: 'analog'
      }));
      
      const turnableTrait = entity.getTrait(TraitType.TURNABLE) as TurnableTrait;
      const dialTrait = entity.getTrait(TraitType.DIAL) as DialTrait;
      
      expect(turnableTrait.turnType).toBe('dial');
      expect(dialTrait.numbered).toBe(true);
      expect(dialTrait.tickCount).toBe(100);
    });
  });

  describe('dial configurations', () => {
    it('should handle numbered dial with tick marks', () => {
      const trait = new DialTrait({
        numbered: true,
        hasTickMarks: true,
        tickCount: 60
      });
      
      expect(trait.numbered).toBe(true);
      expect(trait.hasTickMarks).toBe(true);
      expect(trait.tickCount).toBe(60);
    });

    it('should handle labeled dial', () => {
      const trait = new DialTrait({
        labels: ['OFF', 'STANDBY', 'ON'],
        numbered: false
      });
      
      expect(trait.labels).toHaveLength(3);
      expect(trait.labels).toContain('STANDBY');
      expect(trait.numbered).toBe(false);
    });

    it('should handle continuous vs discrete dial', () => {
      const continuousDial = new DialTrait({ continuous: true });
      expect(continuousDial.continuous).toBe(true);
      
      const discreteDial = new DialTrait({ continuous: false });
      expect(discreteDial.continuous).toBe(false);
    });

    it('should handle dial with units', () => {
      const frequencyDial = new DialTrait({ units: 'kHz' });
      expect(frequencyDial.units).toBe('kHz');
      
      const temperatureDial = new DialTrait({ units: '°C' });
      expect(temperatureDial.units).toBe('°C');
      
      const volumeDial = new DialTrait({ units: 'dB' });
      expect(volumeDial.units).toBe('dB');
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new DialTrait({});
      
      expect(trait.numbered).toBe(true);
      expect(trait.hasTickMarks).toBe(true);
      expect(trait.continuous).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new DialTrait(undefined);
      
      expect(trait.numbered).toBe(true);
      expect(trait.hasTickMarks).toBe(true);
      expect(trait.continuous).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(DialTrait.type).toBe(TraitType.DIAL);
      
      const trait = new DialTrait();
      expect(trait.type).toBe(TraitType.DIAL);
      expect(trait.type).toBe(DialTrait.type);
    });
  });

  describe('realistic scenarios', () => {
    it('should create a radio tuner dial', () => {
      const entity = world.createEntity('Radio Tuner', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'dial',
        minValue: 88.0,
        maxValue: 108.0,
        stepSize: 0.1,
        currentSetting: 96.5,
        bidirectional: true,
        activates: 'radio-receiver'
      }));
      
      entity.add(new DialTrait({
        numbered: true,
        hasTickMarks: true,
        continuous: true,
        displayType: 'both',
        units: 'MHz'
      }));
      
      const dialTrait = entity.getTrait(TraitType.DIAL) as DialTrait;
      
      expect(dialTrait.continuous).toBe(true);
      expect(dialTrait.displayType).toBe('both');
      expect(dialTrait.units).toBe('MHz');
    });

    it('should create a washing machine dial', () => {
      const entity = world.createEntity('Wash Cycle Selector', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'dial',
        settings: ['Delicate', 'Normal', 'Heavy', 'Quick'],
        currentSetting: 'Normal',
        bidirectional: false,
        turnDirection: 'clockwise'
      }));
      
      entity.add(new DialTrait({
        numbered: false,
        hasTickMarks: true,
        tickCount: 4,
        labels: ['Delicate', 'Normal', 'Heavy', 'Quick'],
        continuous: false,
        displayType: 'analog'
      }));
      
      const dialTrait = entity.getTrait(TraitType.DIAL) as DialTrait;
      
      expect(dialTrait.labels).toContain('Normal');
      expect(dialTrait.continuous).toBe(false);
      expect(dialTrait.tickCount).toBe(4);
    });

    it('should create a combination lock dial', () => {
      const entity = world.createEntity('Combination Lock', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'dial',
        settings: Array.from({length: 40}, (_, i) => i),
        currentSetting: 0,
        bidirectional: true,
        turnSound: 'lock_click.mp3',
        activates: 'lock-mechanism'
      }));
      
      entity.add(new DialTrait({
        numbered: true,
        hasTickMarks: true,
        tickCount: 40,
        continuous: false,
        displayType: 'analog'
      }));
      
      const dialTrait = entity.getTrait(TraitType.DIAL) as DialTrait;
      
      expect(dialTrait.numbered).toBe(true);
      expect(dialTrait.tickCount).toBe(40);
    });
  });
});
