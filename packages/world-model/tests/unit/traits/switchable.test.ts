// tests/unit/traits/switchable.test.ts

import { SwitchableTrait } from '../../../src/traits/switchable/switchableTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

// Simple helper for switchable tests
function createTestSwitch(world: WorldModel, id: string, name: string, switchableData?: Partial<SwitchableTrait>): IFEntity {
  const entity = world.createEntity(name, 'object');
  const switchable = new SwitchableTrait(switchableData);
  entity.add(switchable);
  return entity;
}

describe('SwitchableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new SwitchableTrait();
      
      expect(trait.type).toBe(TraitType.SWITCHABLE);
      expect(trait.isOn).toBe(false);
      expect(trait.startsOn).toBe(false);
      expect(trait.powerConsumption).toBe(1);
      expect(trait.requiresPower).toBe(false);
      expect(trait.hasPower).toBe(true);
      expect(trait.autoOffTime).toBe(0);
      expect(trait.autoOffCounter).toBe(0);
      expect(trait.onMessage).toBeUndefined();
      expect(trait.offMessage).toBeUndefined();
      expect(trait.alreadyOnMessage).toBeUndefined();
      expect(trait.alreadyOffMessage).toBeUndefined();
      expect(trait.noPowerMessage).toBeUndefined();
      expect(trait.onSound).toBeUndefined();
      expect(trait.offSound).toBeUndefined();
      expect(trait.runningSound).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new SwitchableTrait({
        isOn: true,
        startsOn: true,
        powerConsumption: 5,
        requiresPower: true,
        hasPower: true,
        autoOffTime: 10,
        autoOffCounter: 5,
        onMessage: 'The machine whirs to life.',
        offMessage: 'The machine powers down.',
        alreadyOnMessage: 'It\'s already running.',
        alreadyOffMessage: 'It\'s already off.',
        noPowerMessage: 'Nothing happens - there\'s no power.',
        onSound: 'machine_start.mp3',
        offSound: 'machine_stop.mp3',
        runningSound: 'machine_hum.mp3'
      });
      
      expect(trait.isOn).toBe(true);
      expect(trait.startsOn).toBe(true);
      expect(trait.powerConsumption).toBe(5);
      expect(trait.requiresPower).toBe(true);
      expect(trait.hasPower).toBe(true);
      expect(trait.autoOffTime).toBe(10);
      expect(trait.autoOffCounter).toBe(5);
      expect(trait.onMessage).toBe('The machine whirs to life.');
      expect(trait.offMessage).toBe('The machine powers down.');
      expect(trait.alreadyOnMessage).toBe('It\'s already running.');
      expect(trait.alreadyOffMessage).toBe('It\'s already off.');
      expect(trait.noPowerMessage).toBe('Nothing happens - there\'s no power.');
      expect(trait.onSound).toBe('machine_start.mp3');
      expect(trait.offSound).toBe('machine_stop.mp3');
      expect(trait.runningSound).toBe('machine_hum.mp3');
    });

    it('should handle power requirements correctly', () => {
      const trait = new SwitchableTrait({
        startsOn: true,
        requiresPower: true,
        hasPower: false
      });
      
      // Should not be on if requires power but has none
      expect(trait.isOn).toBe(false);
      expect(trait.startsOn).toBe(true);
      expect(trait.requiresPower).toBe(true);
      expect(trait.hasPower).toBe(false);
    });

    it('should set autoOffCounter when starting on with autoOffTime', () => {
      const trait = new SwitchableTrait({
        isOn: true,
        autoOffTime: 5
      });
      
      expect(trait.autoOffTime).toBe(5);
      expect(trait.autoOffCounter).toBe(5);
    });

    it('should not set autoOffCounter when starting off', () => {
      const trait = new SwitchableTrait({
        isOn: false,
        autoOffTime: 5
      });
      
      expect(trait.autoOffTime).toBe(5);
      expect(trait.autoOffCounter).toBe(0);
    });
  });

  describe('state management', () => {
    it('should allow changing on/off state', () => {
      const trait = new SwitchableTrait();
      
      expect(trait.isOn).toBe(false);
      
      trait.isOn = true;
      expect(trait.isOn).toBe(true);
      
      trait.isOn = false;
      expect(trait.isOn).toBe(false);
    });

    it('should track power availability', () => {
      const trait = new SwitchableTrait({
        requiresPower: true,
        hasPower: true
      });
      
      expect(trait.hasPower).toBe(true);
      
      trait.hasPower = false;
      expect(trait.hasPower).toBe(false);
    });

    it('should handle auto-off counter', () => {
      const trait = new SwitchableTrait({
        autoOffTime: 3,
        autoOffCounter: 3
      });
      
      expect(trait.autoOffCounter).toBe(3);
      
      // Simulate countdown (would be done by behavior)
      trait.autoOffCounter = 2;
      expect(trait.autoOffCounter).toBe(2);
      
      trait.autoOffCounter = 1;
      expect(trait.autoOffCounter).toBe(1);
      
      trait.autoOffCounter = 0;
      expect(trait.autoOffCounter).toBe(0);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Desk Lamp', 'object');
      const trait = new SwitchableTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      expect(entity.getTrait(TraitType.SWITCHABLE)).toBe(trait);
    });

    it('should work with test fixture', () => {
      const lightSwitch = createTestSwitch(world, 'light-switch', 'Light Switch', {
        onMessage: 'Click! The lights come on.',
        offMessage: 'Click! The lights go off.'
      });
      
      expect(lightSwitch.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      
      const switchable = lightSwitch.getTrait(TraitType.SWITCHABLE) as SwitchableTrait;
      expect(switchable.onMessage).toBe('Click! The lights come on.');
      expect(switchable.offMessage).toBe('Click! The lights go off.');
    });

    it('should handle device with power requirements', () => {
      const computer = createTestSwitch(world, 'computer', 'Computer', {
        requiresPower: true,
        hasPower: true,
        powerConsumption: 10,
        onMessage: 'The computer boots up.',
        noPowerMessage: 'The computer won\'t turn on - there\'s no power.'
      });
      
      const switchable = computer.getTrait(TraitType.SWITCHABLE) as SwitchableTrait;
      expect(switchable.requiresPower).toBe(true);
      expect(switchable.powerConsumption).toBe(10);
    });
  });

  describe('message customization', () => {
    it('should store all switch-related messages', () => {
      const trait = new SwitchableTrait({
        onMessage: 'The device springs to life with a gentle hum.',
        offMessage: 'The device winds down to silence.',
        alreadyOnMessage: 'The device is already humming away.',
        alreadyOffMessage: 'The device is already silent.',
        noPowerMessage: 'You flip the switch but nothing happens - no power.'
      });
      
      expect(trait.onMessage).toBe('The device springs to life with a gentle hum.');
      expect(trait.offMessage).toBe('The device winds down to silence.');
      expect(trait.alreadyOnMessage).toBe('The device is already humming away.');
      expect(trait.alreadyOffMessage).toBe('The device is already silent.');
      expect(trait.noPowerMessage).toBe('You flip the switch but nothing happens - no power.');
    });

    it('should allow partial message customization', () => {
      const trait = new SwitchableTrait({
        onMessage: 'On!',
        offMessage: 'Off!'
        // Other messages remain undefined
      });
      
      expect(trait.onMessage).toBe('On!');
      expect(trait.offMessage).toBe('Off!');
      expect(trait.alreadyOnMessage).toBeUndefined();
      expect(trait.alreadyOffMessage).toBeUndefined();
      expect(trait.noPowerMessage).toBeUndefined();
    });
  });

  describe('sound effects', () => {
    it('should support all sound types', () => {
      const trait = new SwitchableTrait({
        onSound: 'switch_on.mp3',
        offSound: 'switch_off.mp3',
        runningSound: 'motor_running.mp3'
      });
      
      expect(trait.onSound).toBe('switch_on.mp3');
      expect(trait.offSound).toBe('switch_off.mp3');
      expect(trait.runningSound).toBe('motor_running.mp3');
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new SwitchableTrait({});
      
      expect(trait.isOn).toBe(false);
      expect(trait.startsOn).toBe(false);
      expect(trait.requiresPower).toBe(false);
      expect(trait.hasPower).toBe(true);
    });

    it('should handle undefined options', () => {
      const trait = new SwitchableTrait(undefined);
      
      expect(trait.isOn).toBe(false);
      expect(trait.startsOn).toBe(false);
      expect(trait.requiresPower).toBe(false);
      expect(trait.hasPower).toBe(true);
    });

    it('should handle device with no auto-off', () => {
      const trait = new SwitchableTrait({
        autoOffTime: 0
      });
      
      expect(trait.autoOffTime).toBe(0);
      expect(trait.autoOffCounter).toBe(0);
    });

    it('should maintain type constant', () => {
      expect(SwitchableTrait.type).toBe(TraitType.SWITCHABLE);
      
      const trait = new SwitchableTrait();
      expect(trait.type).toBe(TraitType.SWITCHABLE);
      expect(trait.type).toBe(SwitchableTrait.type);
    });
  });
});
