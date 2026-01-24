import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { ActionContext, Command } from '@sharpee/stdlib';
import { touchingMoonAction } from '../../src/actions/touchingMoon';
import { forgettingMoonAction } from '../../src/actions/forgettingMoon';
import { BloodMoonTrait, BloodMoonBehavior } from '../../src/traits/bloodMoonTrait';

describe('Invisibility Integration', () => {
  let world: World;
  let moonCarrier: Entity;
  let normalPerson: Entity;
  let room: Entity;

  beforeEach(() => {
    world = new World();
    
    // Create room
    room = world.createEntity('room', 'A test room');
    
    // Create Moon carrier
    moonCarrier = world.createEntity('moon_carrier', 'Person with Moon blood');
    moonCarrier.addTrait('bloodMoon', {
      active: true,
      invisible: false,
      lastInvisibleTime: null
    } as BloodMoonTrait);
    moonCarrier.moveTo(room);
    
    // Create normal person
    normalPerson = world.createEntity('normal', 'Normal person');
    normalPerson.moveTo(room);
  });

  describe('Becoming invisible and visible', () => {
    it('should allow Moon carrier to become invisible', () => {
      const context: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'touch moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      // Validate
      const validation = touchingMoonAction.validate(context);
      expect(validation.valid).toBe(true);
      
      // Execute
      const events = touchingMoonAction.execute(context);
      
      // Check events
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('blood.event.became_invisible');
      expect(events[1].type).toBe('blood.event.invisibility_changed');
      expect(events[1].data.invisible).toBe(true);
      
      // Check state
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.invisible).toBe(true);
      expect(trait.lastInvisibleTime).not.toBeNull();
    });

    it('should allow invisible carrier to become visible', () => {
      // Make invisible first
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      const context: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'forget moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      // Validate
      const validation = forgettingMoonAction.validate(context);
      expect(validation.valid).toBe(true);
      
      // Execute
      const events = forgettingMoonAction.execute(context);
      
      // Check events
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('blood.event.became_visible');
      expect(events[1].type).toBe('blood.event.invisibility_changed');
      expect(events[1].data.invisible).toBe(false);
      
      // Check state
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.invisible).toBe(false);
    });

    it('should prevent becoming invisible when already invisible', () => {
      // Make invisible first
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      const context: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'touch moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = touchingMoonAction.validate(context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('already_invisible');
    });

    it('should prevent becoming visible when already visible', () => {
      const context: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'forget moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = forgettingMoonAction.validate(context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('not_invisible');
    });

    it('should prevent non-Moon carriers from using Moon abilities', () => {
      const touchContext: ActionContext = {
        actor: normalPerson,
        world,
        command: {
          verb: 'touch moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const touchValidation = touchingMoonAction.validate(touchContext);
      expect(touchValidation.valid).toBe(false);
      expect(touchValidation.error).toBe('no_moon_blood');
      
      const forgetContext: ActionContext = {
        actor: normalPerson,
        world,
        command: {
          verb: 'forget moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const forgetValidation = forgettingMoonAction.validate(forgetContext);
      expect(forgetValidation.valid).toBe(false);
      expect(forgetValidation.error).toBe('no_moon_blood');
    });

    it('should prevent using Moon abilities when blood is inactive', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = false;
      
      const context: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'touch moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = touchingMoonAction.validate(context);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('moon_blood_inactive');
    });
  });

  describe('Invisibility state management', () => {
    it('should track invisibility activation time', () => {
      const beforeTime = Date.now();
      
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.lastInvisibleTime).toBeGreaterThanOrEqual(beforeTime);
      expect(trait.lastInvisibleTime).toBeLessThanOrEqual(Date.now());
    });

    it('should make visible when deactivating Moon blood', () => {
      // Make invisible
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      // Deactivate Moon blood
      BloodMoonBehavior.deactivate(moonCarrier);
      
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.active).toBe(false);
      expect(trait.invisible).toBe(false);
    });

    it('should handle scope checks for invisibility', () => {
      // Not invisible initially
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'room')).toBe(false);
      
      // Make invisible
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      // Should be invisible in all scopes
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'room')).toBe(true);
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'global')).toBe(true);
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'custom')).toBe(true);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle rapid visibility toggling', () => {
      const touchContext: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'touch moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const forgetContext: ActionContext = {
        actor: moonCarrier,
        world,
        command: {
          verb: 'forget moon',
          directObject: null,
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      // Toggle multiple times
      for (let i = 0; i < 3; i++) {
        // Become invisible
        touchingMoonAction.execute(touchContext);
        expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(true);
        
        // Become visible
        forgettingMoonAction.execute(forgetContext);
        expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(false);
      }
      
      // State should be consistent
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.invisible).toBe(false);
      expect(trait.active).toBe(true);
    });

    it('should handle multiple Moon carriers independently', () => {
      // Create second Moon carrier
      const moonCarrier2 = world.createEntity('moon2', 'Another Moon carrier');
      moonCarrier2.addTrait('bloodMoon', {
        active: true,
        invisible: false,
        lastInvisibleTime: null
      } as BloodMoonTrait);
      
      // Make first carrier invisible
      BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      // Check states are independent
      expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(true);
      expect(BloodMoonBehavior.isInvisible(moonCarrier2)).toBe(false);
      
      // Make second carrier invisible
      BloodMoonBehavior.becomeInvisible(moonCarrier2);
      
      // Both should be invisible
      expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(true);
      expect(BloodMoonBehavior.isInvisible(moonCarrier2)).toBe(true);
      
      // Make first visible
      BloodMoonBehavior.becomeVisible(moonCarrier);
      
      // States should still be independent
      expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(false);
      expect(BloodMoonBehavior.isInvisible(moonCarrier2)).toBe(true);
    });
  });
});