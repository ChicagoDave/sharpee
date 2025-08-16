import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { ActionContext, Command } from '@sharpee/stdlib';
import { enteringMirrorAction } from '../../src/actions/enteringMirror';
import { connectingMirrorsAction } from '../../src/actions/connectingMirrors';
import { MirrorTrait, MirrorBehavior } from '../../src/traits/mirrorTrait';
import { BloodSilverTrait } from '../../src/traits/bloodSilverTrait';

describe('Mirror Travel Integration', () => {
  let world: World;
  let player: Entity;
  let bathroom: Entity;
  let hallway: Entity;
  let attic: Entity;
  let bathroomMirror: Entity;
  let hallwayMirror: Entity;
  let atticMirror: Entity;

  beforeEach(() => {
    world = new World();
    
    // Create rooms
    bathroom = world.createEntity('bathroom', 'A small bathroom');
    hallway = world.createEntity('hallway', 'A long hallway');
    attic = world.createEntity('attic', 'A dusty attic');
    
    // Create player with Silver blood
    player = world.createEntity('player', 'The player');
    player.addTrait('bloodSilver', {
      active: true,
      mirrorsUsed: [],
      lastMirrorUsed: null
    } as BloodSilverTrait);
    player.moveTo(bathroom);
    
    // Create mirrors
    bathroomMirror = world.createEntity('bathroom_mirror', 'A bathroom mirror');
    bathroomMirror.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.9,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
    bathroomMirror.moveTo(bathroom);
    
    hallwayMirror = world.createEntity('hallway_mirror', 'A hallway mirror');
    hallwayMirror.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.8,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
    hallwayMirror.moveTo(hallway);
    
    atticMirror = world.createEntity('attic_mirror', 'An attic mirror');
    atticMirror.addTrait('mirror', {
      orientation: 'ceiling',
      state: 'normal',
      quality: 0.5,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
    atticMirror.moveTo(attic);
  });

  describe('Connecting and traveling through mirrors', () => {
    it('should connect two mirrors and allow travel', () => {
      // Connect bathroom and hallway mirrors
      const connectContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'connect',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: { entity: hallwayMirror, text: 'hallway mirror' },
          preposition: 'to'
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      // Validate and execute connection
      const connectValidation = connectingMirrorsAction.validate(connectContext);
      expect(connectValidation.valid).toBe(true);
      
      const connectEvents = connectingMirrorsAction.execute(connectContext);
      expect(connectEvents[0].type).toBe('blood.event.mirrors_connected');
      
      // Verify connection
      const bathroomTrait = bathroomMirror.getTrait<MirrorTrait>('mirror')!;
      const hallwayTrait = hallwayMirror.getTrait<MirrorTrait>('mirror')!;
      expect(bathroomTrait.connectedTo).toBe(hallwayMirror.id);
      expect(hallwayTrait.connectedTo).toBe(bathroomMirror.id);
      
      // Now travel through the mirror
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      // Validate and execute travel
      const enterValidation = enteringMirrorAction.validate(enterContext);
      expect(enterValidation.valid).toBe(true);
      
      const enterEvents = enteringMirrorAction.execute(enterContext);
      expect(enterEvents[0].type).toBe('blood.event.entered_mirror');
      expect(enterEvents[1].type).toBe('blood.event.arrived_through_mirror');
      expect(enterEvents[2].type).toBe('blood.event.mirror_ripple');
      
      // Verify player moved
      expect(player.getContainer()?.id).toBe(hallway.id);
    });

    it('should handle ceiling mirror with different arrival message', () => {
      // Connect bathroom and attic mirrors
      MirrorBehavior.connectMirrors(bathroomMirror, atticMirror, player);
      
      // Travel to attic
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const enterEvents = enteringMirrorAction.execute(enterContext);
      
      // Should have special message for ceiling mirror
      expect(enterEvents[1].data.message).toBe('fell_from_ceiling_mirror');
      expect(player.getContainer()?.id).toBe(attic.id);
    });

    it('should replace existing connections', () => {
      // First connection
      MirrorBehavior.connectMirrors(bathroomMirror, hallwayMirror, player);
      
      // Replace with new connection
      const connectContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'connect',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: { entity: atticMirror, text: 'attic mirror' },
          preposition: 'to'
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const connectEvents = connectingMirrorsAction.execute(connectContext);
      
      // Should indicate replacement
      expect(connectEvents[0].data.message).toBe('connection_replaced');
      expect(connectEvents[0].data.replacedConnections).toBeDefined();
      
      // Should emit connection broken event
      expect(connectEvents.some(e => e.type === 'blood.event.connection_broken')).toBe(true);
      
      // Verify new connection
      const bathroomTrait = bathroomMirror.getTrait<MirrorTrait>('mirror')!;
      expect(bathroomTrait.connectedTo).toBe(atticMirror.id);
    });

    it('should prevent travel through broken mirrors', () => {
      // Connect mirrors
      MirrorBehavior.connectMirrors(bathroomMirror, hallwayMirror, player);
      
      // Break the mirror
      const bathroomTrait = bathroomMirror.getTrait<MirrorTrait>('mirror')!;
      bathroomTrait.state = 'broken';
      
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = enteringMirrorAction.validate(enterContext);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('mirror_broken');
    });

    it('should track signatures and ripples', () => {
      // Create another Silver carrier
      const otherPlayer = world.createEntity('other', 'Another player');
      otherPlayer.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [bathroomMirror.id], // Has used this mirror before
        lastMirrorUsed: bathroomMirror.id
      } as BloodSilverTrait);
      
      // Connect and travel
      MirrorBehavior.connectMirrors(bathroomMirror, hallwayMirror, player);
      
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      enteringMirrorAction.execute(enterContext);
      
      // Check signatures were recorded
      const bathroomTrait = bathroomMirror.getTrait<MirrorTrait>('mirror')!;
      const hallwayTrait = hallwayMirror.getTrait<MirrorTrait>('mirror')!;
      
      expect(bathroomTrait.signatures.some(s => s.entityId === player.id && s.action === 'enter')).toBe(true);
      expect(hallwayTrait.signatures.some(s => s.entityId === player.id && s.action === 'enter')).toBe(true);
      
      // Check Silver carrier's mirror list was updated
      const silverTrait = player.getTrait<BloodSilverTrait>('bloodSilver')!;
      expect(silverTrait.mirrorsUsed).toContain(bathroomMirror.id);
      expect(silverTrait.mirrorsUsed).toContain(hallwayMirror.id);
    });
  });

  describe('Mirror state constraints', () => {
    it('should prevent entry through face-down mirrors', () => {
      MirrorBehavior.connectMirrors(bathroomMirror, hallwayMirror, player);
      
      const bathroomTrait = bathroomMirror.getTrait<MirrorTrait>('mirror')!;
      bathroomTrait.state = 'face-down';
      
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = enteringMirrorAction.validate(enterContext);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('mirror_face_down');
    });

    it('should prevent entry through unconnected mirrors', () => {
      const enterContext: ActionContext = {
        actor: player,
        world,
        command: {
          verb: 'enter',
          directObject: { entity: bathroomMirror, text: 'bathroom mirror' },
          indirectObject: null,
          preposition: null
        } as Command,
        messages: {},
        scopeContext: {}
      };
      
      const validation = enteringMirrorAction.validate(enterContext);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('mirror_not_connected');
    });
  });
});