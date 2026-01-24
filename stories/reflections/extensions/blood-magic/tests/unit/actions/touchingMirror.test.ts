import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { ActionContext, Command } from '@sharpee/stdlib';
import { touchingMirrorAction } from '../../../src/actions/touchingMirror';
import { MirrorTrait } from '../../../src/traits/mirrorTrait';
import { BloodSilverTrait } from '../../../src/traits/bloodSilverTrait';
import { BloodActions } from '../../../src/actions/constants';

describe('touchingMirrorAction', () => {
  let world: World;
  let actor: Entity;
  let mirror: Entity;
  let room: Entity;
  let context: ActionContext;

  beforeEach(() => {
    world = new World();
    
    // Create test entities
    room = world.createEntity('room', 'test room');
    actor = world.createEntity('player', 'test player');
    mirror = world.createEntity('mirror', 'wall mirror');
    
    // Place entities
    actor.moveTo(room);
    mirror.moveTo(room);
    
    // Add mirror trait
    mirror.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.9,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
    
    // Create action context
    context = {
      actor,
      world,
      command: {
        verb: 'touch',
        directObject: { entity: mirror, text: 'mirror' },
        indirectObject: null,
        preposition: null
      } as Command,
      messages: {},
      scopeContext: {}
    };
  });

  describe('validate', () => {
    it('should pass validation with valid mirror', () => {
      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(true);
    });

    it('should fail when no mirror specified', () => {
      context.command.directObject = null;
      
      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_mirror');
    });

    it('should fail when object is not a mirror', () => {
      const nonMirror = world.createEntity('table', 'wooden table');
      nonMirror.moveTo(room);
      context.command.directObject = { entity: nonMirror, text: 'table' };
      
      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_mirror');
    });

    it('should fail when mirror is broken', () => {
      const trait = mirror.getTrait<MirrorTrait>('mirror')!;
      trait.state = 'broken';
      
      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('mirror_broken');
    });
  });

  describe('execute', () => {
    it('should emit touched_mirror event for normal user', () => {
      const events = touchingMirrorAction.execute(context);
      
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('blood.event.touched_mirror');
      expect(events[0].data.actorId).toBe(actor.id);
      expect(events[0].data.mirrorId).toBe(mirror.id);
      expect(events[0].data.message).toBe('touched_mirror');
    });

    it('should sense connection for Silver carrier with connected mirror', () => {
      // Add Silver blood
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      // Connect mirror
      const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror')!;
      const otherMirror = world.createEntity('mirror2', 'other mirror');
      mirrorTrait.connectedTo = otherMirror.id;
      
      const events = touchingMirrorAction.execute(context);
      
      expect(events.length).toBe(1);
      expect(events[0].data.message).toBe('silver_senses_connection');
      expect(events[0].data.connectedTo).toBe(otherMirror.id);
    });

    it('should detect no connection for Silver carrier with unconnected mirror', () => {
      // Add Silver blood
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      const events = touchingMirrorAction.execute(context);
      
      expect(events.length).toBe(1);
      expect(events[0].data.message).toBe('silver_no_connection');
    });

    it('should detect recent signatures for Silver carrier', () => {
      // Add Silver blood
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      // Add recent signature
      const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror')!;
      const otherMirror = world.createEntity('mirror2', 'other mirror');
      mirrorTrait.connectedTo = otherMirror.id;
      mirrorTrait.signatures.push({
        entityId: 'someone',
        timestamp: Date.now() - 1000, // 1 second ago
        action: 'enter'
      });
      
      const events = touchingMirrorAction.execute(context);
      
      expect(events[0].data.signatures).toBeDefined();
      expect(events[0].data.signatures.length).toBe(1);
      expect(events[0].data.signatures[0].entityId).toBe('someone');
    });

    it('should record usage in mirror signatures', () => {
      const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror')!;
      
      expect(mirrorTrait.signatures.length).toBe(0);
      
      touchingMirrorAction.execute(context);
      
      expect(mirrorTrait.signatures.length).toBe(1);
      expect(mirrorTrait.signatures[0].entityId).toBe(actor.id);
      expect(mirrorTrait.signatures[0].action).toBe('touch');
    });

    it('should record mirror use for Silver carrier', () => {
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      const silverTrait = actor.getTrait<BloodSilverTrait>('bloodSilver')!;
      
      touchingMirrorAction.execute(context);
      
      expect(silverTrait.mirrorsUsed).toContain(mirror.id);
      expect(silverTrait.lastMirrorUsed).toBe(mirror.id);
    });
  });

  describe('metadata', () => {
    it('should have correct action ID', () => {
      expect(touchingMirrorAction.id).toBe(BloodActions.TOUCHING_MIRROR);
    });

    it('should require direct object', () => {
      expect(touchingMirrorAction.metadata.requiresDirectObject).toBe(true);
    });

    it('should not require indirect object', () => {
      expect(touchingMirrorAction.metadata.requiresIndirectObject).toBe(false);
    });

    it('should have correct group', () => {
      expect(touchingMirrorAction.group).toBe('mirror_interaction');
    });
  });
});