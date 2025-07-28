/**
 * Tests for AttachedTrait
 */

import { AttachedTrait } from '../../../src/traits/attached/attachedTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('AttachedTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new AttachedTrait();
      
      expect(trait.type).toBe(TraitType.ATTACHED);
      expect(trait.attachedTo).toBeUndefined();
      expect(trait.attachmentType).toBe('stuck');
      expect(trait.detachable).toBe(false);
      expect(trait.detachForce).toBeUndefined();
      expect(trait.loose).toBe(false);
      expect(trait.detachSound).toBeUndefined();
      expect(trait.onDetach).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new AttachedTrait({
        attachedTo: 'wall-001',
        attachmentType: 'nailed',
        detachable: true,
        detachForce: 15,
        loose: true,
        detachSound: 'nail_pops.mp3',
        onDetach: {
          breaksObject: false,
          breaksAttachment: true,
          leavesResidue: true
        }
      });
      
      expect(trait.attachedTo).toBe('wall-001');
      expect(trait.attachmentType).toBe('nailed');
      expect(trait.detachable).toBe(true);
      expect(trait.detachForce).toBe(15);
      expect(trait.loose).toBe(true);
      expect(trait.detachSound).toBe('nail_pops.mp3');
      expect(trait.onDetach?.breaksObject).toBe(false);
      expect(trait.onDetach?.breaksAttachment).toBe(true);
      expect(trait.onDetach?.leavesResidue).toBe(true);
    });

    it('should handle all attachment types', () => {
      const attachmentTypes: Array<AttachedTrait['attachmentType']> = [
        'glued', 'nailed', 'screwed', 'tied', 'welded', 'magnetic', 'stuck'
      ];
      
      attachmentTypes.forEach(type => {
        const trait = new AttachedTrait({ attachmentType: type });
        expect(trait.attachmentType).toBe(type);
      });
    });
  });

  describe('attachment mechanics', () => {
    it('should track what object is attached to', () => {
      const trait = new AttachedTrait({
        attachedTo: 'bulletin-board-001',
        attachmentType: 'nailed'
      });
      
      expect(trait.attachedTo).toBe('bulletin-board-001');
      expect(trait.attachmentType).toBe('nailed');
    });

    it('should handle detachable attachments', () => {
      const trait = new AttachedTrait({
        attachmentType: 'magnetic',
        detachable: true,
        detachForce: 5
      });
      
      expect(trait.detachable).toBe(true);
      expect(trait.detachForce).toBe(5);
    });

    it('should handle permanent attachments', () => {
      const trait = new AttachedTrait({
        attachmentType: 'welded',
        detachable: false
      });
      
      expect(trait.attachmentType).toBe('welded');
      expect(trait.detachable).toBe(false);
      expect(trait.detachForce).toBeUndefined();
    });

    it('should track loose state', () => {
      const trait = new AttachedTrait({
        attachmentType: 'screwed',
        loose: true,
        detachable: true,
        detachForce: 3
      });
      
      expect(trait.loose).toBe(true);
      expect(trait.detachForce).toBe(3); // Less force needed when loose
    });
  });

  describe('entity integration', () => {
    it('should work with pullable trait', () => {
      const entity = world.createEntity('Posted Notice', 'object');
      
      entity.add(new PullableTrait({
        pullType: 'attached',
        detachesOnPull: true
      }));
      
      entity.add(new AttachedTrait({
        attachedTo: 'bulletin-board',
        attachmentType: 'nailed',
        detachable: true,
        detachForce: 10
      }));
      
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.ATTACHED)).toBe(true);
      
      const pullable = entity.getTrait(TraitType.PULLABLE) as PullableTrait;
      const attached = entity.getTrait(TraitType.ATTACHED) as AttachedTrait;
      
      expect(pullable.pullType).toBe('attached');
      expect(pullable.detachesOnPull).toBe(true);
      expect(attached.detachable).toBe(true);
    });

    it('should handle various attached objects', () => {
      const poster = world.createEntity('Movie Poster', 'object');
      poster.add(new AttachedTrait({
        attachedTo: 'wall',
        attachmentType: 'glued',
        detachable: true,
        detachForce: 8,
        onDetach: {
          breaksObject: true, // Poster tears
          leavesResidue: true // Glue remains
        }
      }));
      
      const plaque = world.createEntity('Bronze Plaque', 'object');
      plaque.add(new AttachedTrait({
        attachedTo: 'monument',
        attachmentType: 'screwed',
        detachable: false // Too secure to remove
      }));
      
      const magnet = world.createEntity('Refrigerator Magnet', 'object');
      magnet.add(new AttachedTrait({
        attachedTo: 'refrigerator',
        attachmentType: 'magnetic',
        detachable: true,
        detachForce: 1
      }));
      
      const posterTrait = poster.getTrait(TraitType.ATTACHED) as AttachedTrait;
      const plaqueTrait = plaque.getTrait(TraitType.ATTACHED) as AttachedTrait;
      const magnetTrait = magnet.getTrait(TraitType.ATTACHED) as AttachedTrait;
      
      expect(posterTrait.onDetach?.breaksObject).toBe(true);
      expect(plaqueTrait.detachable).toBe(false);
      expect(magnetTrait.detachForce).toBe(1);
    });
  });

  describe('detachment effects', () => {
    it('should handle object breaking on detach', () => {
      const trait = new AttachedTrait({
        attachmentType: 'glued',
        detachable: true,
        onDetach: {
          breaksObject: true,
          breaksAttachment: false,
          leavesResidue: true
        }
      });
      
      expect(trait.onDetach?.breaksObject).toBe(true);
      expect(trait.onDetach?.breaksAttachment).toBe(false);
      expect(trait.onDetach?.leavesResidue).toBe(true);
    });

    it('should handle attachment point breaking', () => {
      const trait = new AttachedTrait({
        attachmentType: 'nailed',
        detachable: true,
        onDetach: {
          breaksObject: false,
          breaksAttachment: true, // Damages wall
          leavesResidue: false
        }
      });
      
      expect(trait.onDetach?.breaksObject).toBe(false);
      expect(trait.onDetach?.breaksAttachment).toBe(true);
    });

    it('should handle clean detachment', () => {
      const trait = new AttachedTrait({
        attachmentType: 'magnetic',
        detachable: true,
        onDetach: {
          breaksObject: false,
          breaksAttachment: false,
          leavesResidue: false
        }
      });
      
      expect(trait.onDetach?.breaksObject).toBe(false);
      expect(trait.onDetach?.breaksAttachment).toBe(false);
      expect(trait.onDetach?.leavesResidue).toBe(false);
    });
  });

  describe('sound effects', () => {
    it('should store detach sound', () => {
      const trait = new AttachedTrait({
        attachmentType: 'tied',
        detachSound: 'rope_snap.mp3'
      });
      
      expect(trait.detachSound).toBe('rope_snap.mp3');
    });

    it('should have appropriate sounds for attachment types', () => {
      const examples = [
        { type: 'glued' as const, sound: 'sticky_tear.mp3' },
        { type: 'nailed' as const, sound: 'nail_pops.mp3' },
        { type: 'screwed' as const, sound: 'screw_strips.mp3' },
        { type: 'tied' as const, sound: 'knot_loosens.mp3' },
        { type: 'magnetic' as const, sound: 'magnet_release.mp3' }
      ];
      
      examples.forEach(({ type, sound }) => {
        const trait = new AttachedTrait({
          attachmentType: type,
          detachSound: sound
        });
        expect(trait.detachSound).toBe(sound);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new AttachedTrait({});
      
      expect(trait.attachmentType).toBe('stuck');
      expect(trait.detachable).toBe(false);
      expect(trait.loose).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new AttachedTrait(undefined);
      
      expect(trait.attachmentType).toBe('stuck');
      expect(trait.detachable).toBe(false);
      expect(trait.loose).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(AttachedTrait.type).toBe(TraitType.ATTACHED);
      
      const trait = new AttachedTrait();
      expect(trait.type).toBe(TraitType.ATTACHED);
      expect(trait.type).toBe(AttachedTrait.type);
    });

    it('should handle very strong attachment', () => {
      const trait = new AttachedTrait({
        attachmentType: 'welded',
        detachable: true, // Technically detachable
        detachForce: 100 // But requires extreme force
      });
      
      expect(trait.detachable).toBe(true);
      expect(trait.detachForce).toBe(100);
    });

    it('should handle attachment without target', () => {
      const trait = new AttachedTrait({
        attachmentType: 'glued',
        // attachedTo is undefined - just stuck to something
        detachable: true
      });
      
      expect(trait.attachedTo).toBeUndefined();
      expect(trait.attachmentType).toBe('glued');
    });

    it('should handle partial detach effects', () => {
      const trait = new AttachedTrait({
        onDetach: {
          breaksObject: true
          // Other properties undefined
        }
      });
      
      expect(trait.onDetach?.breaksObject).toBe(true);
      expect(trait.onDetach?.breaksAttachment).toBeUndefined();
      expect(trait.onDetach?.leavesResidue).toBeUndefined();
    });
  });
});
