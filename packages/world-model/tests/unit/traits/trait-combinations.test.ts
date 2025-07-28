/**
 * Tests for trait combinations
 */

import { WorldModel } from '../../../src/world/WorldModel';
import { TraitType } from '../../../src/traits/trait-types';
import { PushableTrait } from '../../../src/traits/pushable/pushableTrait';
import { ButtonTrait } from '../../../src/traits/button/buttonTrait';
import { SwitchableTrait } from '../../../src/traits/switchable/switchableTrait';
import { TurnableTrait } from '../../../src/traits/turnable/turnableTrait';
import { DialTrait } from '../../../src/traits/dial/dialTrait';
import { ValveTrait } from '../../../src/traits/valve/valveTrait';
import { FragileTrait } from '../../../src/traits/fragile/fragileTrait';
import { BreakableTrait } from '../../../src/traits/breakable/breakableTrait';
import { MoveableSceneryTrait } from '../../../src/traits/moveable-scenery/moveableSceneryTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';

describe('Trait Combinations', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('PUSHABLE + BUTTON + SWITCHABLE', () => {
    it('should create a functional light switch', () => {
      const entity = world.createEntity('Light Switch', 'object');
      
      entity.add(new PushableTrait({
        pushType: 'button',
        repeatable: true,
        pushSound: 'switch_click.mp3'
      }));
      
      entity.add(new ButtonTrait({
        shape: 'rectangular',
        size: 'small',
        latching: true
      }));
      
      entity.add(new SwitchableTrait({
        isOn: false,
        startsOn: false
      }));
      
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(entity.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      
      const pushable = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      const button = entity.getTrait(TraitType.BUTTON) as ButtonTrait;
      const switchable = entity.getTrait(TraitType.SWITCHABLE) as SwitchableTrait;
      
      expect(pushable.pushType).toBe('button');
      expect(button.latching).toBe(true);
      expect(switchable.isOn).toBe(false);
    });

    it('should create an elevator call button', () => {
      const entity = world.createEntity('Elevator Button', 'object');
      
      entity.add(new PushableTrait({
        pushType: 'button',
        activates: 'elevator-system',
        repeatable: true
      }));
      
      entity.add(new ButtonTrait({
        shape: 'round',
        size: 'medium',
        material: 'metal',
        label: '▲',
        latching: false
      }));
      
      entity.add(new SwitchableTrait({
        isOn: false,
        startsOn: false,
        autoOffTime: 1  // Momentary behavior - turns off after 1 turn
      }));
      
      const button = entity.getTrait(TraitType.BUTTON) as ButtonTrait;
      const switchable = entity.getTrait(TraitType.SWITCHABLE) as SwitchableTrait;
      
      expect(button.label).toBe('▲');
      expect(button.latching).toBe(false);
      expect(switchable.autoOffTime).toBe(1);  // Momentary behavior
    });
  });

  describe('TURNABLE + DIAL/VALVE', () => {
    it('should create a safe combination dial', () => {
      const entity = world.createEntity('Safe Dial', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'dial',
        settings: Array.from({length: 100}, (_, i) => i),
        currentSetting: 0,
        bidirectional: true,
        turnSound: 'safe_click.mp3',
        activates: 'safe-lock'
      }));
      
      entity.add(new DialTrait({
        numbered: true,
        hasTickMarks: true,
        tickCount: 100,
        continuous: false,
        displayType: 'analog'
      }));
      
      const turnable = entity.getTrait(TraitType.TURNABLE) as TurnableTrait;
      const dial = entity.getTrait(TraitType.DIAL) as DialTrait;
      
      expect(turnable.turnType).toBe('dial');
      expect(dial.numbered).toBe(true);
      expect(dial.tickCount).toBe(100);
    });

    it('should create a water valve', () => {
      const entity = world.createEntity('Main Water Valve', 'object');
      
      entity.add(new TurnableTrait({
        turnType: 'valve',
        turnsRequired: 8,
        bidirectional: true,
        turnSound: 'valve_squeak.mp3',
        activates: 'water-system'
      }));
      
      entity.add(new ValveTrait({
        valveType: 'gate',
        state: 'closed',
        controlsFlow: 'water',
        pressure: 'high',
        hasGauge: true
      }));
      
      const turnable = entity.getTrait(TraitType.TURNABLE) as TurnableTrait;
      const valve = entity.getTrait(TraitType.VALVE) as ValveTrait;
      
      expect(turnable.turnType).toBe('valve');
      expect(valve.controlsFlow).toBe('water');
      expect(valve.state).toBe('closed');
    });
  });

  describe('MOVEABLE_SCENERY + PUSHABLE/PULLABLE', () => {
    it('should create a heavy boulder that can be pushed', () => {
      const entity = world.createEntity('Ancient Boulder', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'immense',
        revealsWhenMoved: true,
        reveals: 'hidden-entrance',
        blocksExits: true,
        blockedExits: ['north'],
        moveSound: 'boulder_grind.mp3',
        requiresMultiplePeople: true,
        peopleRequired: 3
      }));
      
      entity.add(new PushableTrait({
        pushType: 'heavy',
        pushDirection: 'north',
        requiresStrength: 60,
        maxPushes: 1,
        revealsPassage: true
      }));
      
      const moveable = entity.getTrait(TraitType.MOVEABLE_SCENERY) as MoveableSceneryTrait;
      const pushable = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      
      expect(moveable.weightClass).toBe('immense');
      expect(moveable.requiresMultiplePeople).toBe(true);
      expect(pushable.requiresStrength).toBe(60);
    });

    it('should create a crate that can be pushed and pulled', () => {
      const entity = world.createEntity('Supply Crate', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'medium',
        moveSound: 'crate_scrape.mp3'
      }));
      
      entity.add(new PushableTrait({
        pushType: 'moveable',
        pushDirection: 'any',
        requiresStrength: 20
      }));
      
      entity.add(new PullableTrait({
        pullType: 'heavy',
        requiresStrength: 20
      }));
      
      expect(entity.hasTrait(TraitType.MOVEABLE_SCENERY)).toBe(true);
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
    });
  });

  describe('FRAGILE + BREAKABLE', () => {
    it('should create a reinforced glass window', () => {
      const entity = world.createEntity('Reinforced Window', 'object');
      
      // Fragile for accidental breaks
      entity.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 8, // Higher threshold - reinforced
        breakSound: 'reinforced_glass_shatter.mp3',
        sharpFragments: true,
        breaksInto: ['glass-shard-001', 'glass-shard-002', 'glass-shard-003']
      }));
      
      // Breakable for deliberate breaking
      entity.add(new BreakableTrait({
        breakMethod: 'force',
        strengthRequired: 40,
        hitsToBreak: 3,
        breakSound: 'reinforced_glass_shatter.mp3'
      }));
      
      const fragile = entity.getTrait(TraitType.FRAGILE) as FragileTrait;
      const breakable = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(fragile.breakThreshold).toBe(8);
      expect(fragile.sharpFragments).toBe(true);
      expect(breakable.hitsToBreak).toBe(3);
    });
  });

  describe('Complex combinations', () => {
    it('should create an emergency alarm system', () => {
      const entity = world.createEntity('Fire Alarm', 'object');
      
      // Visual traits
      entity.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 3,
        breakSound: 'glass_break.mp3',
        triggersOnBreak: 'fire-alarm',
        breakMessage: 'alarm_glass_breaks'
      }));
      
      // Interaction traits
      entity.add(new PushableTrait({
        pushType: 'button',
        activates: 'fire-alarm',
        repeatable: false,
        maxPushes: 1
      }));
      
      entity.add(new ButtonTrait({
        color: 'red',
        size: 'large',
        shape: 'square',
        label: 'FIRE',
        material: 'plastic'
      }));
      
      entity.add(new SwitchableTrait({
        isOn: false,
        startsOn: false
      }));
      
      expect(entity.hasTrait(TraitType.FRAGILE)).toBe(true);
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(entity.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      
      const fragile = entity.getTrait(TraitType.FRAGILE) as FragileTrait;
      const pushable = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      
      expect(fragile.triggersOnBreak).toBe('fire-alarm');
      expect(pushable.activates).toBe('fire-alarm');
    });

    it('should create a complex control panel', () => {
      const powerButton = world.createEntity('Power Button', 'object');
      powerButton.add(new PushableTrait({ pushType: 'button', activates: 'main-power' }));
      powerButton.add(new ButtonTrait({ color: 'green', label: 'POWER', latching: true }));
      powerButton.add(new SwitchableTrait({ isOn: false }));
      
      const volumeDial = world.createEntity('Volume Control', 'object');
      volumeDial.add(new TurnableTrait({ 
        turnType: 'dial', 
        minValue: 0, 
        maxValue: 100, 
        currentSetting: 50 
      }));
      volumeDial.add(new DialTrait({ numbered: true, units: 'dB' }));
      
      const emergencyStop = world.createEntity('Emergency Stop', 'object');
      emergencyStop.add(new PushableTrait({ 
        pushType: 'button', 
        activates: 'emergency-shutdown' 
      }));
      emergencyStop.add(new ButtonTrait({ 
        color: 'red', 
        size: 'large', 
        label: 'STOP',
        shape: 'round'
      }));
      emergencyStop.add(new FragileTrait({
        fragileMaterial: 'glass',
        breakThreshold: 5,
        triggersOnBreak: 'emergency-shutdown'
      }));
      
      // Verify all entities have their expected traits
      expect(powerButton.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(powerButton.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(powerButton.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      
      expect(volumeDial.hasTrait(TraitType.TURNABLE)).toBe(true);
      expect(volumeDial.hasTrait(TraitType.DIAL)).toBe(true);
      
      expect(emergencyStop.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(emergencyStop.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(emergencyStop.hasTrait(TraitType.FRAGILE)).toBe(true);
    });
  });

  describe('Edge case combinations', () => {
    it('should handle entities with many traits', () => {
      const entity = world.createEntity('Complex Device', 'object');
      
      // Add many compatible traits
      entity.add(new PushableTrait({ pushType: 'button' }));
      entity.add(new ButtonTrait({ color: 'blue' }));
      entity.add(new SwitchableTrait({ isOn: false }));
      entity.add(new FragileTrait({ fragileMaterial: 'glass' }));
      entity.add(new BreakableTrait({ breakMethod: 'force' }));
      
      // Verify all traits are present
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(entity.hasTrait(TraitType.SWITCHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.FRAGILE)).toBe(true);
      expect(entity.hasTrait(TraitType.BREAKABLE)).toBe(true);
    });

    it('should handle trait updates', () => {
      const entity = world.createEntity('Adjustable Device', 'object');
      
      const turnable = new TurnableTrait({ currentSetting: 0 });
      entity.add(turnable);
      
      expect(turnable.currentSetting).toBe(0);
      
      // Simulate turning
      turnable.currentSetting = 50;
      expect(turnable.currentSetting).toBe(50);
      
      // Verify trait is still attached
      const retrieved = entity.getTrait(TraitType.TURNABLE) as TurnableTrait;
      expect(retrieved.currentSetting).toBe(50);
    });
  });
});
