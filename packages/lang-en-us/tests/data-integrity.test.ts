/**
 * @file data-integrity.test.ts
 * @description Tests for data consistency and completeness
 */

import { englishVerbs, IFActions } from '../src/data/verbs';
import { englishWords, irregularPlurals, abbreviations } from '../src/data/words';
import { failureMessages, systemMessages } from '../src/data/messages';
import { englishTemplates } from '../src/data/templates';
import { IFEvents, eventMessages } from '../src/data/events';

describe('Data Integrity', () => {
  describe('Verb Definitions', () => {
    it('should have unique action IDs', () => {
      const actionIds = englishVerbs.map(v => v.action);
      const uniqueIds = [...new Set(actionIds)];
      expect(actionIds.length).toBe(uniqueIds.length);
    });

    it('should use valid action ID format', () => {
      englishVerbs.forEach(verbDef => {
        expect(verbDef.action).toMatch(/^if\.action\.[a-z_]+$/);
      });
    });

    it('should have consistent requiresObject and allowsIndirectObject flags', () => {
      englishVerbs.forEach(verbDef => {
        if (verbDef.allowsIndirectObject) {
          // If it allows indirect object, it must require direct object
          expect(verbDef.requiresObject).toBe(true);
        }
      });
    });

    it('should have non-empty verb lists', () => {
      englishVerbs.forEach(verbDef => {
        expect(verbDef.verbs.length).toBeGreaterThan(0);
        verbDef.verbs.forEach(verb => {
          expect(verb.trim()).toBeTruthy();
        });
      });
    });

    it('should have lowercase verbs', () => {
      englishVerbs.forEach(verbDef => {
        verbDef.verbs.forEach(verb => {
          expect(verb).toBe(verb.toLowerCase());
        });
      });
    });

    it('should have all IFActions values used', () => {
      const definedActionIds = englishVerbs.map(v => v.action);
      const actionValues = Object.values(IFActions);
      
      actionValues.forEach(actionId => {
        expect(definedActionIds).toContain(actionId);
      });
    });
  });

  describe('Word Lists', () => {
    it('should have no duplicates within each list', () => {
      Object.entries(englishWords).forEach(([listName, words]) => {
        if (Array.isArray(words)) {
          const uniqueWords = [...new Set(words)];
          expect(words.length).toBe(uniqueWords.length);
        }
      });
    });

    it('should have lowercase words', () => {
      Object.entries(englishWords).forEach(([listName, words]) => {
        if (Array.isArray(words)) {
          words.forEach(word => {
            expect(word).toBe(word.toLowerCase());
          });
        }
      });
    });

    it('should have mutually exclusive word categories', () => {
      const { articles, prepositions, pronouns, conjunctions } = englishWords;
      
      // Articles shouldn't appear in other lists
      articles.forEach(article => {
        expect(prepositions).not.toContain(article);
        expect(pronouns).not.toContain(article);
        expect(conjunctions).not.toContain(article);
      });
      
      // Prepositions shouldn't be pronouns or conjunctions
      prepositions.forEach(prep => {
        expect(pronouns).not.toContain(prep);
        expect(conjunctions).not.toContain(prep);
      });
    });

    it('should have complete number words', () => {
      const expectedCardinals = ['zero', 'one', 'two', 'three', 'four', 'five', 
                                 'six', 'seven', 'eight', 'nine', 'ten'];
      const expectedOrdinals = ['first', 'second', 'third', 'fourth', 'fifth',
                               'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
      
      expectedCardinals.forEach(num => {
        expect(englishWords.numberWords).toContain(num);
      });
      
      expectedOrdinals.forEach(num => {
        expect(englishWords.numberWords).toContain(num);
      });
    });
  });

  describe('Irregular Plurals', () => {
    it('should have valid plural to singular mappings', () => {
      irregularPlurals.forEach((singular, plural) => {
        expect(singular).toBeTruthy();
        expect(plural).toBeTruthy();
        expect(singular).not.toBe(plural);
        expect(singular).toBe(singular.toLowerCase());
        expect(plural).toBe(plural.toLowerCase());
      });
    });

    it('should have common irregular plurals', () => {
      const expectedPairs = [
        ['children', 'child'],
        ['people', 'person'],
        ['men', 'man'],
        ['women', 'woman'],
        ['mice', 'mouse'],
        ['feet', 'foot']
      ];
      
      expectedPairs.forEach(([plural, singular]) => {
        expect(irregularPlurals.get(plural)).toBe(singular);
      });
    });

    it('should have unique singular forms', () => {
      const singulars = Array.from(irregularPlurals.values());
      const uniqueSingulars = [...new Set(singulars)];
      expect(singulars.length).toBe(uniqueSingulars.length);
    });
  });

  describe('Abbreviations', () => {
    it('should have valid abbreviation mappings', () => {
      abbreviations.forEach((expansion, abbrev) => {
        expect(abbrev).toBeTruthy();
        expect(expansion).toBeTruthy();
        expect(abbrev).toBe(abbrev.toLowerCase());
        expect(expansion).toBe(expansion.toLowerCase());
      });
    });

    it('should have single or double character abbreviations', () => {
      abbreviations.forEach((expansion, abbrev) => {
        expect(abbrev.length).toBeGreaterThanOrEqual(1);
        expect(abbrev.length).toBeLessThanOrEqual(2);
      });
    });

    it('should have unique expansions', () => {
      const expansions = Array.from(abbreviations.values());
      const uniqueExpansions = [...new Set(expansions)];
      expect(expansions.length).toBe(uniqueExpansions.length);
    });
  });

  describe('Message Templates', () => {
    it('should have valid placeholder syntax', () => {
      const templateRegex = /\{[a-zA-Z_]+(?::[a-zA-Z_]+)?\}/g;
      
      Object.values(englishTemplates.actions).forEach(template => {
        const placeholders = template.match(templateRegex) || [];
        placeholders.forEach(placeholder => {
          // Valid formats: {item}, {item:cap}, {name}
          expect(placeholder).toMatch(/^\{[a-zA-Z_]+(?::[a-zA-Z_]+)?\}$/);
        });
      });
    });

    it('should have consistent placeholder names', () => {
      const placeholderNames = new Set<string>();
      
      Object.values(englishTemplates.actions).forEach(template => {
        const matches = template.match(/\{([a-zA-Z_]+)(?::[a-zA-Z_]+)?\}/g) || [];
        matches.forEach(match => {
          // Extract just the placeholder name, not modifiers
          const name = match.replace(/\{([a-zA-Z_]+)(?::[a-zA-Z_]+)?\}/, '$1');
          placeholderNames.add(name);
        });
      });
      
      // Common placeholders should exist
      expect(placeholderNames).toContain('item');
      expect(placeholderNames).toContain('target');
      expect(placeholderNames).toContain('container');
    });

    it('should have action templates following naming convention', () => {
      Object.keys(englishTemplates.actions).forEach(key => {
        // Format: action.phase.descriptor or action.descriptor
        expect(key).toMatch(/^[a-z_]+\.[a-z_]+(?:\.[a-z_]+)?$/);
      });
    });

    it('should have templates for common actions', () => {
      const actionKeys = Object.keys(englishTemplates.actions);
      
      // Check for basic actions
      const expectedActions = ['taking', 'dropping', 'opening', 'closing', 'examining', 'looking'];
      expectedActions.forEach(action => {
        const hasAction = actionKeys.some(key => key.startsWith(action + '.'));
        expect(hasAction).toBe(true);
      });
    });
  });

  describe('Event Messages', () => {
    it('should have valid event type values', () => {
      const eventTypes = Object.values(IFEvents);
      eventTypes.forEach(eventType => {
        expect(eventType).toMatch(/^[a-z_]+$/);
      });
    });

    it('should have messages for common events', () => {
      const criticalEvents = [
        IFEvents.ITEM_TAKEN,
        IFEvents.ITEM_DROPPED,
        IFEvents.CONTAINER_OPENED,
        IFEvents.CONTAINER_CLOSED,
        IFEvents.GAME_STARTED,
        IFEvents.GAME_ENDED
      ];
      
      criticalEvents.forEach(event => {
        expect(eventMessages[event]).toBeDefined();
      });
    });

    it('should have valid placeholder syntax in event messages', () => {
      Object.values(eventMessages).forEach(message => {
        if (message) {
          const placeholders = message.match(/\{[a-zA-Z_]+\}/g) || [];
          placeholders.forEach(placeholder => {
            expect(placeholder).toMatch(/^\{[a-zA-Z_]+\}$/);
          });
        }
      });
    });
  });

  describe('Failure Messages', () => {
    it('should have messages for all failure reasons', () => {
      Object.values(failureMessages).forEach(message => {
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });

    it('should have proper sentence formatting', () => {
      Object.values(failureMessages).forEach(message => {
        // Should start with capital or "You"
        expect(message).toMatch(/^[A-Z]|^You/);
        // Should end with punctuation
        expect(message).toMatch(/[.!?]$/);
      });
    });

    it('should not have placeholder syntax', () => {
      Object.values(failureMessages).forEach(message => {
        // Failure messages should be static, no placeholders
        expect(message).not.toMatch(/\{[^}]+\}/);
      });
    });
  });

  describe('System Messages', () => {
    it('should have all required system messages', () => {
      const requiredMessages = [
        'inventoryEmpty',
        'inventoryHeader',
        'saveSuccess',
        'saveFailed',
        'restoreSuccess',
        'restoreFailed',
        'unknownVerb',
        'ok',
        'done'
      ];
      
      requiredMessages.forEach(msgKey => {
        expect((systemMessages as any)[msgKey]).toBeDefined();
        expect((systemMessages as any)[msgKey]).toBeTruthy();
      });
    });

    it('should have valid placeholders in system messages', () => {
      Object.values(systemMessages).forEach(message => {
        const placeholders = message.match(/\{[a-zA-Z_]+\}/g) || [];
        placeholders.forEach(placeholder => {
          expect(placeholder).toMatch(/^\{[a-zA-Z_]+\}$/);
        });
      });
    });
  });
});
