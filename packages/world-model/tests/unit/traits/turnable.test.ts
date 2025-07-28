/**
 * Tests for TurnableTrait
 */

import { TurnableTrait } from '../../../src/traits/turnable/turnableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('TurnableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new TurnableTrait();
      
      expect(trait.type).toBe(TraitType.TURNABLE);
      expect(trait.turnType).toBe('knob');
      expect(trait.settings).toBeUndefined();
      expect(trait.currentSetting).toBe(0);
      expect(trait.turnsRequired).toBeUndefined();
      expect(trait.turnsMade).toBe(0);
      expect(trait.turnSound).toBeUndefined();
      expect(trait.bidirectional).toBe(true);
      expect(trait.turnDirection).toBeUndefined();
      expect(trait.springLoaded).toBe(false);
      expect(trait.activates).toBeUndefined();
      expect(trait.jammed).toBe(false);
      expect(trait.minValue).toBeUndefined();
      expect(trait.maxValue).toBeUndefined();
      expect(trait.stepSize).toBeUndefined();
      expect(trait.effects).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new TurnableTrait({
        turnType: 'dial',
        settings: ['low', 'medium', 'high'],
        currentSetting: 'medium',
        turnsRequired: 5,
        turnsMade: 2,
        turnSound: 'dial_click.mp3',
        bidirectional: false,
        turnDirection: 'clockwise',
        springLoaded: true,
        activates: 'radio-001',
        jammed: false,
        effects: {
          onTurn: 'if.event.dial_clicks',
          onComplete: 'if.event.frequency_locked',
          onSettingChange: 'if.event.station_changes'
        }
      });
      
      expect(trait.turnType).toBe('dial');
      expect(trait.settings).toEqual(['low', 'medium', 'high']);
      expect(trait.currentSetting).toBe('medium');
      expect(trait.turnsRequired).toBe(5);
      expect(trait.turnsMade).toBe(2);
      expect(trait.turnSound).toBe('dial_click.mp3');
      expect(trait.bidirectional).toBe(false);
      expect(trait.turnDirection).toBe('clockwise');
      expect(trait.springLoaded).toBe(true);
      expect(trait.activates).toBe('radio-001');
      expect(trait.jammed).toBe(false);
      expect(trait.effects?.onTurn).toBe('if.event.dial_clicks');
      expect(trait.effects?.onComplete).toBe('if.event.frequency_locked');
      expect(trait.effects?.onSettingChange).toBe('if.event.station_changes');
    });

    it('should handle all turn types', () => {
      const dialTrait = new TurnableTrait({ turnType: 'dial' });
      expect(dialTrait.turnType).toBe('dial');
      
      const knobTrait = new TurnableTrait({ turnType: 'knob' });
      expect(knobTrait.turnType).toBe('knob');
      
      const wheelTrait = new TurnableTrait({ turnType: 'wheel' });
      expect(wheelTrait.turnType).toBe('wheel');
      
      const crankTrait = new TurnableTrait({ turnType: 'crank' });
      expect(crankTrait.turnType).toBe('crank');
      
      const valveTrait = new TurnableTrait({ turnType: 'valve' });
      expect(valveTrait.turnType).toBe('valve');
    });
  });

  describe('settings management', () => {
    it('should handle string settings', () => {
      const trait = new TurnableTrait({
        settings: ['off', 'low', 'medium', 'high'],
        currentSetting: 'low'
      });
      
      expect(trait.settings).toEqual(['off', 'low', 'medium', 'high']);
      expect(trait.currentSetting).toBe('low');
    });

    it('should handle numeric settings', () => {
      const trait = new TurnableTrait({
        settings: [0, 25, 50, 75, 100],
        currentSetting: 50
      });
      
      expect(trait.settings).toEqual([0, 25, 50, 75, 100]);
      expect(trait.currentSetting).toBe(50);
    });

    it('should default current setting to first in array', () => {
      const trait = new TurnableTrait({
        settings: ['A', 'B', 'C']
      });
      
      expect(trait.currentSetting).toBe('A');
    });

    it('should handle numeric ranges', () => {
      const trait = new TurnableTrait({
        minValue: 0,
        maxValue: 100,
        stepSize: 10,
        currentSetting: 30
      });
      
      expect(trait.minValue).toBe(0);
      expect(trait.maxValue).toBe(100);
      expect(trait.stepSize).toBe(10);
      expect(trait.currentSetting).toBe(30);
    });
  });

  describe('turn tracking', () => {
    it('should track turns made', () => {
      const trait = new TurnableTrait({
        turnsRequired: 10,
        turnsMade: 0
      });
      
      expect(trait.turnsMade).toBe(0);
      expect(trait.turnsRequired).toBe(10);
      
      // Simulate turning
      trait.turnsMade++;
      expect(trait.turnsMade).toBe(1);
      
      trait.turnsMade = 10;
      expect(trait.turnsMade).toBe(trait.turnsRequired);
    });

    it('should track turn direction', () => {
      const trait = new TurnableTrait({
        bidirectional: true
      });
      
      expect(trait.bidirectional).toBe(true);
      expect(trait.turnDirection).toBeUndefined();
      
      // Simulate turning clockwise
      trait.turnDirection = 'clockwise';
      expect(trait.turnDirection).toBe('clockwise');
      
      // Simulate turning counterclockwise
      trait.turnDirection = 'counterclockwise';
      expect(trait.turnDirection).toBe('counterclockwise');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Volume Knob', 'object');
      const trait = new TurnableTrait({ turnType: 'knob' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.TURNABLE)).toBe(true);
      expect(entity.getTrait(TraitType.TURNABLE)).toBe(trait);
    });

    it('should work with multiple turnable objects', () => {
      const dial = world.createEntity('Radio Dial', 'object');
      dial.add(new TurnableTrait({
        turnType: 'dial',
        settings: [88.1, 92.5, 96.3, 101.1, 105.7],
        currentSetting: 92.5
      }));
      
      const valve = world.createEntity('Water Valve', 'object');
      valve.add(new TurnableTrait({
        turnType: 'valve',
        turnsRequired: 5,
        activates: 'water-flow'
      }));
      
      const dialTrait = dial.getTrait(TraitType.TURNABLE) as TurnableTrait;
      const valveTrait = valve.getTrait(TraitType.TURNABLE) as TurnableTrait;
      
      expect(dialTrait.turnType).toBe('dial');
      expect(dialTrait.currentSetting).toBe(92.5);
      expect(valveTrait.turnType).toBe('valve');
      expect(valveTrait.activates).toBe('water-flow');
    });
  });

  describe('turn type behaviors', () => {
    it('should handle dial configuration', () => {
      const trait = new TurnableTrait({
        turnType: 'dial',
        settings: ['AM', 'FM', 'SW'],
        currentSetting: 'FM',
        turnSound: 'dial_click.mp3',
        springLoaded: false
      });
      
      expect(trait.turnType).toBe('dial');
      expect(trait.settings).toContain('FM');
      expect(trait.currentSetting).toBe('FM');
      expect(trait.springLoaded).toBe(false);
    });

    it('should handle wheel configuration', () => {
      const trait = new TurnableTrait({
        turnType: 'wheel',
        turnsRequired: 20,
        bidirectional: true,
        activates: 'vault-door'
      });
      
      expect(trait.turnType).toBe('wheel');
      expect(trait.turnsRequired).toBe(20);
      expect(trait.bidirectional).toBe(true);
      expect(trait.activates).toBe('vault-door');
    });

    it('should handle crank configuration', () => {
      const trait = new TurnableTrait({
        turnType: 'crank',
        turnsRequired: 50,
        turnSound: 'mechanical_crank.mp3',
        bidirectional: false,
        turnDirection: 'clockwise'
      });
      
      expect(trait.turnType).toBe('crank');
      expect(trait.turnsRequired).toBe(50);
      expect(trait.bidirectional).toBe(false);
      expect(trait.turnDirection).toBe('clockwise');
    });

    it('should handle valve configuration', () => {
      const trait = new TurnableTrait({
        turnType: 'valve',
        turnsRequired: 8,
        turnSound: 'valve_squeak.mp3',
        activates: 'steam-pipe',
        jammed: false
      });
      
      expect(trait.turnType).toBe('valve');
      expect(trait.turnsRequired).toBe(8);
      expect(trait.activates).toBe('steam-pipe');
      expect(trait.jammed).toBe(false);
    });
  });

  describe('special properties', () => {
    it('should handle spring-loaded behavior', () => {
      const trait = new TurnableTrait({
        turnType: 'knob',
        springLoaded: true,
        currentSetting: 5
      });
      
      expect(trait.springLoaded).toBe(true);
      expect(trait.currentSetting).toBe(5);
      
      // Spring-loaded would return to default when released
      // This would be handled by the action
    });

    it('should handle jammed state', () => {
      const trait = new TurnableTrait({
        turnType: 'valve',
        jammed: true
      });
      
      expect(trait.jammed).toBe(true);
      
      // Unjam
      trait.jammed = false;
      expect(trait.jammed).toBe(false);
    });

    it('should handle unidirectional turning', () => {
      const trait = new TurnableTrait({
        bidirectional: false,
        turnDirection: 'clockwise'
      });
      
      expect(trait.bidirectional).toBe(false);
      expect(trait.turnDirection).toBe('clockwise');
    });
  });

  describe('special effects', () => {
    it('should store custom effect events', () => {
      const trait = new TurnableTrait({
        effects: {
          onTurn: 'if.event.mechanism_turns',
          onComplete: 'if.event.safe_opens',
          onSettingChange: 'if.event.combination_entered'
        }
      });
      
      expect(trait.effects).toBeDefined();
      expect(trait.effects?.onTurn).toBe('if.event.mechanism_turns');
      expect(trait.effects?.onComplete).toBe('if.event.safe_opens');
      expect(trait.effects?.onSettingChange).toBe('if.event.combination_entered');
    });

    it('should handle partial effects', () => {
      const trait = new TurnableTrait({
        effects: {
          onTurn: 'if.event.knob_turns'
        }
      });
      
      expect(trait.effects?.onTurn).toBe('if.event.knob_turns');
      expect(trait.effects?.onComplete).toBeUndefined();
      expect(trait.effects?.onSettingChange).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new TurnableTrait({});
      
      expect(trait.turnType).toBe('knob');
      expect(trait.bidirectional).toBe(true);
      expect(trait.springLoaded).toBe(false);
      expect(trait.jammed).toBe(false);
      expect(trait.turnsMade).toBe(0);
    });

    it('should handle undefined options', () => {
      const trait = new TurnableTrait(undefined);
      
      expect(trait.turnType).toBe('knob');
      expect(trait.bidirectional).toBe(true);
      expect(trait.springLoaded).toBe(false);
      expect(trait.jammed).toBe(false);
      expect(trait.turnsMade).toBe(0);
    });

    it('should maintain type constant', () => {
      expect(TurnableTrait.type).toBe(TraitType.TURNABLE);
      
      const trait = new TurnableTrait();
      expect(trait.type).toBe(TraitType.TURNABLE);
      expect(trait.type).toBe(TurnableTrait.type);
    });

    it('should handle complex configurations', () => {
      const safeDial = new TurnableTrait({
        turnType: 'dial',
        settings: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
        currentSetting: 0,
        bidirectional: true,
        turnSound: 'safe_dial.mp3',
        activates: 'safe-lock',
        effects: {
          onSettingChange: 'if.event.dial_turned',
          onComplete: 'if.event.combination_correct'
        }
      });
      
      expect(safeDial.turnType).toBe('dial');
      expect(safeDial.settings?.length).toBe(10);
      expect(safeDial.currentSetting).toBe(0);
      expect(safeDial.bidirectional).toBe(true);
      expect(safeDial.activates).toBe('safe-lock');
    });
  });
});
