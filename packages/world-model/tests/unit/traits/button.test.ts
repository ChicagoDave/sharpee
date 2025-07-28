/**
 * Tests for ButtonTrait
 */

import { ButtonTrait } from '../../../src/traits/button/buttonTrait';
import { PushableTrait } from '../../../src/traits/pushable/pushableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('ButtonTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new ButtonTrait();
      
      expect(trait.type).toBe(TraitType.BUTTON);
      expect(trait.latching).toBe(false);
      expect(trait.color).toBeUndefined();
      expect(trait.size).toBeUndefined();
      expect(trait.shape).toBeUndefined();
      expect(trait.material).toBeUndefined();
      expect(trait.label).toBeUndefined();
      expect(trait.pressed).toBe(false);
    });

    it('should create trait with provided data', () => {
      const trait = new ButtonTrait({
        latching: true,
        color: 'red',
        size: 'large',
        shape: 'round',
        material: 'metal',
        label: 'EMERGENCY',
        pressed: true
      });
      
      expect(trait.latching).toBe(true);
      expect(trait.color).toBe('red');
      expect(trait.size).toBe('large');
      expect(trait.shape).toBe('round');
      expect(trait.material).toBe('metal');
      expect(trait.label).toBe('EMERGENCY');
      expect(trait.pressed).toBe(true);
    });

    it('should handle all button sizes', () => {
      const tinyButton = new ButtonTrait({ size: 'tiny' });
      expect(tinyButton.size).toBe('tiny');
      
      const smallButton = new ButtonTrait({ size: 'small' });
      expect(smallButton.size).toBe('small');
      
      const mediumButton = new ButtonTrait({ size: 'medium' });
      expect(mediumButton.size).toBe('medium');
      
      const largeButton = new ButtonTrait({ size: 'large' });
      expect(largeButton.size).toBe('large');
    });

    it('should handle all button shapes', () => {
      const roundButton = new ButtonTrait({ shape: 'round' });
      expect(roundButton.shape).toBe('round');
      
      const squareButton = new ButtonTrait({ shape: 'square' });
      expect(squareButton.shape).toBe('square');
      
      const rectangularButton = new ButtonTrait({ shape: 'rectangular' });
      expect(rectangularButton.shape).toBe('rectangular');
      
      const ovalButton = new ButtonTrait({ shape: 'oval' });
      expect(ovalButton.shape).toBe('oval');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Red Button', 'object');
      const trait = new ButtonTrait({ color: 'red' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.BUTTON)).toBe(true);
      expect(entity.getTrait(TraitType.BUTTON)).toBe(trait);
    });

    it('should work with PushableTrait', () => {
      const entity = world.createEntity('Emergency Button', 'object');
      
      const pushableTrait = new PushableTrait({
        pushType: 'button',
        activates: 'alarm-system'
      });
      
      const buttonTrait = new ButtonTrait({
        color: 'red',
        size: 'large',
        label: 'EMERGENCY',
        latching: false
      });
      
      entity.add(pushableTrait);
      entity.add(buttonTrait);
      
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.BUTTON)).toBe(true);
      
      const retrievedPushable = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      const retrievedButton = entity.getTrait(TraitType.BUTTON) as ButtonTrait;
      
      expect(retrievedPushable.pushType).toBe('button');
      expect(retrievedPushable.activates).toBe('alarm-system');
      expect(retrievedButton.color).toBe('red');
      expect(retrievedButton.label).toBe('EMERGENCY');
    });
  });

  describe('button types', () => {
    it('should handle momentary button', () => {
      const trait = new ButtonTrait({
        latching: false,
        pressed: false
      });
      
      expect(trait.latching).toBe(false);
      
      // Simulate press
      trait.pressed = true;
      expect(trait.pressed).toBe(true);
      
      // Simulate release (would be handled by action)
      trait.pressed = false;
      expect(trait.pressed).toBe(false);
    });

    it('should handle latching button', () => {
      const trait = new ButtonTrait({
        latching: true,
        pressed: false
      });
      
      expect(trait.latching).toBe(true);
      
      // Simulate press - stays pressed
      trait.pressed = true;
      expect(trait.pressed).toBe(true);
      
      // Would stay pressed until pressed again
      expect(trait.pressed).toBe(true);
    });
  });

  describe('descriptive properties', () => {
    it('should store button appearance', () => {
      const trait = new ButtonTrait({
        color: 'green',
        size: 'small',
        shape: 'square',
        material: 'plastic'
      });
      
      expect(trait.color).toBe('green');
      expect(trait.size).toBe('small');
      expect(trait.shape).toBe('square');
      expect(trait.material).toBe('plastic');
    });

    it('should handle labeled buttons', () => {
      const powerButton = new ButtonTrait({ label: 'POWER' });
      expect(powerButton.label).toBe('POWER');
      
      const startButton = new ButtonTrait({ label: 'START' });
      expect(startButton.label).toBe('START');
      
      const unlabeledButton = new ButtonTrait({});
      expect(unlabeledButton.label).toBeUndefined();
    });

    it('should handle various button materials', () => {
      const metalButton = new ButtonTrait({ material: 'metal' });
      expect(metalButton.material).toBe('metal');
      
      const plasticButton = new ButtonTrait({ material: 'plastic' });
      expect(plasticButton.material).toBe('plastic');
      
      const glassButton = new ButtonTrait({ material: 'glass' });
      expect(glassButton.material).toBe('glass');
      
      const woodButton = new ButtonTrait({ material: 'wood' });
      expect(woodButton.material).toBe('wood');
    });
  });

  describe('button states', () => {
    it('should track pressed state', () => {
      const trait = new ButtonTrait();
      
      expect(trait.pressed).toBe(false);
      
      trait.pressed = true;
      expect(trait.pressed).toBe(true);
      
      trait.pressed = false;
      expect(trait.pressed).toBe(false);
    });

    it('should initialize with pressed state', () => {
      const pressedButton = new ButtonTrait({ pressed: true });
      expect(pressedButton.pressed).toBe(true);
      
      const unpressedButton = new ButtonTrait({ pressed: false });
      expect(unpressedButton.pressed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new ButtonTrait({});
      
      expect(trait.latching).toBe(false);
      expect(trait.pressed).toBe(false);
      expect(trait.color).toBeUndefined();
      expect(trait.size).toBeUndefined();
    });

    it('should handle undefined options', () => {
      const trait = new ButtonTrait(undefined);
      
      expect(trait.latching).toBe(false);
      expect(trait.pressed).toBe(false);
      expect(trait.color).toBeUndefined();
      expect(trait.size).toBeUndefined();
    });

    it('should maintain type constant', () => {
      expect(ButtonTrait.type).toBe(TraitType.BUTTON);
      
      const trait = new ButtonTrait();
      expect(trait.type).toBe(TraitType.BUTTON);
      expect(trait.type).toBe(ButtonTrait.type);
    });

    it('should handle complex button configurations', () => {
      const complexButton = new ButtonTrait({
        latching: true,
        color: 'blue',
        size: 'medium',
        shape: 'oval',
        material: 'chrome',
        label: 'ACTIVATE',
        pressed: false
      });
      
      expect(complexButton.latching).toBe(true);
      expect(complexButton.color).toBe('blue');
      expect(complexButton.size).toBe('medium');
      expect(complexButton.shape).toBe('oval');
      expect(complexButton.material).toBe('chrome');
      expect(complexButton.label).toBe('ACTIVATE');
      expect(complexButton.pressed).toBe(false);
    });
  });

  describe('button combinations', () => {
    it('should create emergency stop button', () => {
      const entity = world.createEntity('Emergency Stop', 'object');
      
      entity.add(new PushableTrait({
        pushType: 'button',
        activates: 'machinery-shutdown',
        repeatable: true,
        pushSound: 'emergency_button.mp3'
      }));
      
      entity.add(new ButtonTrait({
        color: 'red',
        size: 'large',
        shape: 'round',
        label: 'EMERGENCY STOP',
        material: 'metal',
        latching: true
      }));
      
      const pushable = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      const button = entity.getTrait(TraitType.BUTTON) as ButtonTrait;
      
      expect(pushable.activates).toBe('machinery-shutdown');
      expect(button.color).toBe('red');
      expect(button.label).toBe('EMERGENCY STOP');
      expect(button.latching).toBe(true);
    });

    it('should create elevator call button', () => {
      const entity = world.createEntity('Call Button', 'object');
      
      entity.add(new PushableTrait({
        pushType: 'button',
        activates: 'elevator-call',
        repeatable: true
      }));
      
      entity.add(new ButtonTrait({
        shape: 'round',
        size: 'small',
        material: 'plastic',
        label: '▲'
      }));
      
      const button = entity.getTrait(TraitType.BUTTON) as ButtonTrait;
      expect(button.label).toBe('▲');
      expect(button.shape).toBe('round');
    });
  });
});
