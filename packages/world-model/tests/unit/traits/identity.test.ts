// packages/world-model/tests/unit/traits/identity.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { TraitType } from '../../../src/traits/trait-types';

// Simple helper for identity trait tests
function createTestEntity(name: string): IFEntity {
  const entity = new IFEntity('test-' + name.replace(/\s+/g, '-'), 'object');
  const identity = new IdentityTrait();
  identity.name = name;
  entity.add(identity);
  return entity;
}

describe('IdentityTrait', () => {
  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new IdentityTrait();
      
      expect(trait.type).toBe(TraitType.IDENTITY);
      expect(trait.name).toBe('');
      expect(trait.description).toBe('');
      expect(trait.aliases).toEqual([]);
      expect(trait.properName).toBe(false);
      expect(trait.article).toBe('a');
      expect(trait.concealed).toBe(false);
      expect(trait.brief).toBeUndefined();
      expect(trait.weight).toBeUndefined();
      expect(trait.volume).toBeUndefined();
      expect(trait.size).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new IdentityTrait({
        name: 'golden key',
        description: 'A small golden key with intricate engravings.',
        aliases: ['key', 'gold key'],
        brief: 'a golden key',
        article: 'a',
        weight: 0.05,
        size: 'tiny'
      });
      
      expect(trait.name).toBe('golden key');
      expect(trait.description).toBe('A small golden key with intricate engravings.');
      expect(trait.aliases).toEqual(['key', 'gold key']);
      expect(trait.brief).toBe('a golden key');
      expect(trait.article).toBe('a');
      expect(trait.weight).toBe(0.05);
      expect(trait.size).toBe('tiny');
    });
  });

  describe('article handling', () => {
    it('should handle "a" article', () => {
      const entity = createTestEntity('sword');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'a';
      
      expect(trait.article).toBe('a');
    });

    it('should handle "an" article', () => {
      const entity = createTestEntity('apple');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'an';
      
      expect(trait.article).toBe('an');
    });

    it('should handle "the" article', () => {
      const entity = createTestEntity('Excalibur');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'the';
      
      expect(trait.article).toBe('the');
    });

    it('should handle "some" article for plural/mass nouns', () => {
      const entity = createTestEntity('water');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'some';
      
      expect(trait.article).toBe('some');
    });

    it('should handle empty article for proper names', () => {
      const entity = createTestEntity('John');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = '';
      trait.properName = true;
      
      expect(trait.article).toBe('');
      expect(trait.properName).toBe(true);
    });
  });

  describe('aliases', () => {
    it('should start with empty aliases', () => {
      const trait = new IdentityTrait();
      expect(trait.aliases).toEqual([]);
    });

    it('should store multiple aliases', () => {
      const entity = createTestEntity('wooden chest');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.aliases = ['chest', 'box', 'container', 'wooden box'];
      
      expect(trait.aliases).toHaveLength(4);
      expect(trait.aliases).toContain('chest');
      expect(trait.aliases).toContain('wooden box');
    });
  });

  describe('descriptions', () => {
    it('should handle full description', () => {
      const entity = createTestEntity('ancient tome');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.description = 'An ancient leather-bound tome filled with arcane knowledge. The pages are yellowed with age.';
      
      expect(trait.description).toContain('ancient leather-bound tome');
      expect(trait.description).toContain('yellowed with age');
    });

    it('should handle brief description separately', () => {
      const entity = createTestEntity('glowing orb');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.description = 'The orb pulses with an inner light, casting dancing shadows on the walls.';
      trait.brief = 'a glowing orb (providing light)';
      
      expect(trait.description).toContain('pulses with an inner light');
      expect(trait.brief).toBe('a glowing orb (providing light)');
    });

    it('should allow empty descriptions', () => {
      const entity = createTestEntity('thing');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      
      expect(trait.description).toBe('');
      expect(trait.brief).toBeUndefined();
    });
  });

  describe('concealment', () => {
    it('should default to not concealed', () => {
      const trait = new IdentityTrait();
      expect(trait.concealed).toBe(false);
    });

    it('should handle concealed objects', () => {
      const entity = createTestEntity('hidden compartment');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.concealed = true;
      
      expect(trait.concealed).toBe(true);
    });
  });

  describe('physical properties', () => {
    it('should handle weight', () => {
      const entity = createTestEntity('iron sword');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.weight = 2.5; // kg
      
      expect(trait.weight).toBe(2.5);
    });

    it('should handle volume', () => {
      const entity = createTestEntity('water bottle');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.volume = 0.5; // liters
      
      expect(trait.volume).toBe(0.5);
    });

    it('should handle size categories', () => {
      const sizes: Array<'tiny' | 'small' | 'medium' | 'large' | 'huge'> = 
        ['tiny', 'small', 'medium', 'large', 'huge'];
      
      sizes.forEach(size => {
        const entity = createTestEntity(`${size} object`);
        const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
        trait.size = size;
        
        expect(trait.size).toBe(size);
      });
    });

    it('should allow undefined physical properties', () => {
      const entity = createTestEntity('abstract concept');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      
      expect(trait.weight).toBeUndefined();
      expect(trait.volume).toBeUndefined();
      expect(trait.size).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = new IFEntity('test-1', 'object');
      const trait = new IdentityTrait({
        name: 'mysterious artifact',
        description: 'An artifact of unknown origin.'
      });
      
      entity.add(trait);
      
      expect(entity.has(TraitType.IDENTITY)).toBe(true);
      const retrievedTrait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      expect(retrievedTrait.name).toBe('mysterious artifact');
    });

    it('should replace existing identity trait', () => {
      const entity = createTestEntity('original name');
      const newTrait = new IdentityTrait({
        name: 'new name',
        description: 'new description'
      });
      
      entity.add(newTrait);
      
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      expect(trait.name).toBe('new name');
      expect(trait.description).toBe('new description');
    });
  });

  describe('special cases', () => {
    it('should handle proper names correctly', () => {
      const entity = createTestEntity('Alice');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.properName = true;
      trait.article = '';
      
      expect(trait.properName).toBe(true);
      expect(trait.article).toBe('');
    });

    it('should handle mass nouns', () => {
      const entity = createTestEntity('sand');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'some';
      
      expect(trait.article).toBe('some');
    });

    it('should handle unique items', () => {
      const entity = createTestEntity('Holy Grail');
      const trait = entity.get(TraitType.IDENTITY) as IdentityTrait;
      trait.article = 'the';
      trait.properName = false; // Not a proper name, but unique
      
      expect(trait.article).toBe('the');
      expect(trait.properName).toBe(false);
    });
  });
});
