/**
 * @file Pronoun Context Tests
 * @description Unit tests for pronoun resolution (ADR-089 Phase B)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PronounContextManager,
  isRecognizedPronoun,
  RECOGNIZED_PRONOUNS,
  INANIMATE_IT,
  INANIMATE_THEM
} from '../src/pronoun-context';
import { PRONOUNS } from '@sharpee/world-model';

describe('PronounContext', () => {
  describe('isRecognizedPronoun', () => {
    it('should recognize standard object pronouns', () => {
      expect(isRecognizedPronoun('it')).toBe(true);
      expect(isRecognizedPronoun('them')).toBe(true);
      expect(isRecognizedPronoun('him')).toBe(true);
      expect(isRecognizedPronoun('her')).toBe(true);
    });

    it('should recognize neopronouns', () => {
      expect(isRecognizedPronoun('xem')).toBe(true);
      expect(isRecognizedPronoun('zir')).toBe(true);
      expect(isRecognizedPronoun('hir')).toBe(true);
      expect(isRecognizedPronoun('em')).toBe(true);
      expect(isRecognizedPronoun('faer')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isRecognizedPronoun('IT')).toBe(true);
      expect(isRecognizedPronoun('Him')).toBe(true);
      expect(isRecognizedPronoun('THEM')).toBe(true);
    });

    it('should not recognize non-pronoun words', () => {
      expect(isRecognizedPronoun('lamp')).toBe(false);
      expect(isRecognizedPronoun('take')).toBe(false);
      expect(isRecognizedPronoun('the')).toBe(false);
    });
  });

  describe('INANIMATE pronoun sets', () => {
    it('should have correct INANIMATE_IT values', () => {
      expect(INANIMATE_IT.subject).toBe('it');
      expect(INANIMATE_IT.object).toBe('it');
      expect(INANIMATE_IT.possessive).toBe('its');
      expect(INANIMATE_IT.reflexive).toBe('itself');
      expect(INANIMATE_IT.verbForm).toBe('singular');
    });

    it('should have correct INANIMATE_THEM values', () => {
      expect(INANIMATE_THEM.subject).toBe('they');
      expect(INANIMATE_THEM.object).toBe('them');
      expect(INANIMATE_THEM.possessive).toBe('theirs');
      expect(INANIMATE_THEM.reflexive).toBe('themselves');
      expect(INANIMATE_THEM.verbForm).toBe('plural');
    });
  });

  describe('PronounContextManager', () => {
    let manager: PronounContextManager;

    beforeEach(() => {
      manager = new PronounContextManager();
    });

    describe('resolve', () => {
      it('should return null when no context is set', () => {
        expect(manager.resolve('it')).toBeNull();
        expect(manager.resolve('him')).toBeNull();
        expect(manager.resolve('her')).toBeNull();
        expect(manager.resolve('them')).toBeNull();
      });

      it('should resolve "it" to inanimate singular entity', () => {
        // Simulate world model with simple entity
        const mockWorld = {
          getEntity: (id: string) => ({
            id,
            get: (trait: string) => {
              if (trait === 'actor') return null;
              if (trait === 'identity') return { grammaticalNumber: 'singular' };
              return null;
            }
          }),
          findEntityByName: () => null
        };

        // Manually set context for testing
        const context = manager.getContext() as any;
        context.it = { entityId: 'lamp', text: 'the lamp', turnNumber: 1 };

        const result = manager.resolve('it');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].entityId).toBe('lamp');
        expect(result![0].text).toBe('the lamp');
      });

      it('should resolve "him" to he/him actor', () => {
        const context = manager.getContext() as any;
        context.animateByPronoun.set('him', {
          entityId: 'bob',
          text: 'Bob',
          turnNumber: 1
        });

        const result = manager.resolve('him');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].entityId).toBe('bob');
      });

      it('should resolve "her" to she/her actor', () => {
        const context = manager.getContext() as any;
        context.animateByPronoun.set('her', {
          entityId: 'alice',
          text: 'Alice',
          turnNumber: 1
        });

        const result = manager.resolve('her');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].entityId).toBe('alice');
      });

      it('should resolve "them" to plural inanimate first', () => {
        const context = manager.getContext() as any;
        context.them = [
          { entityId: 'coin1', text: 'gold coin', turnNumber: 1 },
          { entityId: 'coin2', text: 'silver coin', turnNumber: 1 }
        ];

        const result = manager.resolve('them');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
      });

      it('should resolve "them" to they/them actor when no plural', () => {
        const context = manager.getContext() as any;
        context.animateByPronoun.set('them', {
          entityId: 'sam',
          text: 'Sam',
          turnNumber: 1
        });

        const result = manager.resolve('them');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].entityId).toBe('sam');
      });

      it('should resolve neopronouns', () => {
        const context = manager.getContext() as any;
        context.animateByPronoun.set('xem', {
          entityId: 'alex',
          text: 'Alex',
          turnNumber: 1
        });

        const result = manager.resolve('xem');
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].entityId).toBe('alex');
      });
    });

    describe('reset', () => {
      it('should clear all pronoun references', () => {
        const context = manager.getContext() as any;
        context.it = { entityId: 'lamp', text: 'lamp', turnNumber: 1 };
        context.animateByPronoun.set('him', { entityId: 'bob', text: 'Bob', turnNumber: 1 });

        manager.reset();

        expect(manager.resolve('it')).toBeNull();
        expect(manager.resolve('him')).toBeNull();
      });
    });

    describe('registerEntity', () => {
      it('should register inanimate entity for "it"', () => {
        const mockWorld = {
          getEntity: (id: string) => ({
            id,
            get: (trait: string) => {
              if (trait === 'actor') return null;
              if (trait === 'identity') return { grammaticalNumber: 'singular' };
              return null;
            }
          })
        };

        manager.registerEntity('lamp', 'the lamp', mockWorld, 1);

        const result = manager.resolve('it');
        expect(result).not.toBeNull();
        expect(result![0].entityId).toBe('lamp');
      });

      it('should register plural inanimate for "them"', () => {
        const mockWorld = {
          getEntity: (id: string) => ({
            id,
            get: (trait: string) => {
              if (trait === 'actor') return null;
              if (trait === 'identity') return { grammaticalNumber: 'plural' };
              return null;
            }
          })
        };

        manager.registerEntity('coins', 'gold coins', mockWorld, 1);

        const result = manager.resolve('them');
        expect(result).not.toBeNull();
        expect(result![0].entityId).toBe('coins');
      });

      it('should register actor by their object pronoun', () => {
        const mockWorld = {
          getEntity: (id: string) => ({
            id,
            get: (trait: string) => {
              if (trait === 'actor') {
                return { pronouns: PRONOUNS.SHE_HER };
              }
              return null;
            }
          })
        };

        manager.registerEntity('alice', 'Alice', mockWorld, 1);

        const result = manager.resolve('her');
        expect(result).not.toBeNull();
        expect(result![0].entityId).toBe('alice');
      });

      it('should register all pronouns for actor with multiple pronoun sets', () => {
        const mockWorld = {
          getEntity: (id: string) => ({
            id,
            get: (trait: string) => {
              if (trait === 'actor') {
                // He/they pronouns
                return { pronouns: [PRONOUNS.HE_HIM, PRONOUNS.THEY_THEM] };
              }
              return null;
            }
          })
        };

        manager.registerEntity('alex', 'Alex', mockWorld, 1);

        // Should resolve both "him" and "them" to Alex
        const himResult = manager.resolve('him');
        expect(himResult).not.toBeNull();
        expect(himResult![0].entityId).toBe('alex');

        const themResult = manager.resolve('them');
        expect(themResult).not.toBeNull();
        expect(themResult![0].entityId).toBe('alex');
      });
    });

    describe('lastCommand', () => {
      it('should store last command for "again" support', () => {
        const mockCommand = {
          rawInput: 'take lamp',
          action: 'if.action.taking',
          structure: {}
        } as any;

        const mockWorld = { getEntity: () => null };

        manager.updateFromCommand(mockCommand, mockWorld, 1);

        expect(manager.getLastCommand()).toBe(mockCommand);
      });
    });
  });
});
