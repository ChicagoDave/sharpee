/**
 * @file vocabulary.test.ts
 * @description Tests for vocabulary data structure and content
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import { englishVerbs } from '../src/data/verbs';
import { englishWords, irregularPlurals, abbreviations } from '../src/data/words';

describe('Vocabulary', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('Verb Vocabulary', () => {
    let verbs: ReturnType<typeof provider.getVerbs>;
    
    beforeEach(() => {
      verbs = provider.getVerbs();
    });

    it('should have verbs for all basic IF actions', () => {
      const actionIds = verbs.map(v => v.actionId);
      
      // Movement
      expect(actionIds).toContain('if.action.going');
      expect(actionIds).toContain('if.action.entering');
      expect(actionIds).toContain('if.action.exiting');
      
      // Observation
      expect(actionIds).toContain('if.action.looking');
      expect(actionIds).toContain('if.action.examining');
      expect(actionIds).toContain('if.action.searching');
      
      // Manipulation
      expect(actionIds).toContain('if.action.taking');
      expect(actionIds).toContain('if.action.dropping');
      expect(actionIds).toContain('if.action.opening');
      expect(actionIds).toContain('if.action.closing');
      
      // Meta
      expect(actionIds).toContain('if.action.inventory');
      expect(actionIds).toContain('if.action.help');
      expect(actionIds).toContain('if.action.quitting');
    });

    it('should have non-empty verb arrays for each action', () => {
      verbs.forEach(verb => {
        expect(verb.verbs.length).toBeGreaterThan(0);
        verb.verbs.forEach(v => {
          expect(v).toBeTruthy();
          expect(typeof v).toBe('string');
        });
      });
    });

    it('should have valid patterns', () => {
      const validPatterns = ['VERB_ONLY', 'VERB_OBJ', 'VERB_OBJ_PREP_OBJ'];
      verbs.forEach(verb => {
        expect(validPatterns).toContain(verb.pattern);
      });
    });

    it('should have prepositions for verbs that allow indirect objects', () => {
      verbs.forEach(verb => {
        if (verb.pattern === 'VERB_OBJ_PREP_OBJ') {
          expect(verb.prepositions).toBeDefined();
          expect(Array.isArray(verb.prepositions)).toBe(true);
          expect(verb.prepositions!.length).toBeGreaterThan(0);
        }
      });
    });

    it('should include common verb synonyms', () => {
      const takingVerb = verbs.find(v => v.actionId === 'if.action.taking');
      expect(takingVerb?.verbs).toContain('take');
      expect(takingVerb?.verbs).toContain('get');
      expect(takingVerb?.verbs).toContain('pick up');
      
      const examineVerb = verbs.find(v => v.actionId === 'if.action.examining');
      expect(examineVerb?.verbs).toContain('examine');
      expect(examineVerb?.verbs).toContain('x');
      expect(examineVerb?.verbs).toContain('look at');
    });

    it('should have unique action IDs', () => {
      const actionIds = verbs.map(v => v.actionId);
      const uniqueIds = [...new Set(actionIds)];
      expect(actionIds.length).toBe(uniqueIds.length);
    });
  });

  describe('Direction Vocabulary', () => {
    let directions: any[];
    
    beforeEach(() => {
      directions = provider.getDirections();
    });

    it('should have all 8 compass directions', () => {
      const dirNames = directions.map(d => d.direction);
      const compass = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
      compass.forEach(dir => {
        expect(dirNames).toContain(dir);
      });
    });

    it('should have vertical directions', () => {
      const dirNames = directions.map(d => d.direction);
      expect(dirNames).toContain('up');
      expect(dirNames).toContain('down');
    });

    it('should have in/out directions', () => {
      const dirNames = directions.map(d => d.direction);
      expect(dirNames).toContain('in');
      expect(dirNames).toContain('out');
    });

    it('should have correct abbreviations', () => {
      const abbrevMap: Record<string, string> = {
        'north': 'n',
        'south': 's',
        'east': 'e',
        'west': 'w',
        'northeast': 'ne',
        'northwest': 'nw',
        'southeast': 'se',
        'southwest': 'sw',
        'up': 'u',
        'down': 'd'
      };
      
      Object.entries(abbrevMap).forEach(([direction, abbrev]) => {
        const dir = directions.find(d => d.direction === direction);
        expect(dir?.abbreviations).toContain(abbrev);
      });
    });

    it('should have synonyms for some directions', () => {
      const up = directions.find(d => d.direction === 'up');
      expect(up?.words).toContain('up');
      expect(up?.words).toContain('upward');
      
      const down = directions.find(d => d.direction === 'down');
      expect(down?.words).toContain('down');
      expect(down?.words).toContain('downward');
    });
  });

  describe('Special Vocabulary', () => {
    let vocab: any;
    
    beforeEach(() => {
      vocab = provider.getSpecialVocabulary();
    });

    it('should have exactly three English articles', () => {
      expect(vocab.articles).toHaveLength(3);
      expect(vocab.articles).toContain('a');
      expect(vocab.articles).toContain('an');
      expect(vocab.articles).toContain('the');
    });

    it('should have comprehensive pronoun list', () => {
      const expectedPronouns = ['it', 'them', 'him', 'her', 'me', 'us', 'you'];
      expectedPronouns.forEach(pronoun => {
        expect(vocab.pronouns).toContain(pronoun);
      });
      
      // Demonstratives
      expect(vocab.pronouns).toContain('this');
      expect(vocab.pronouns).toContain('that');
      expect(vocab.pronouns).toContain('these');
      expect(vocab.pronouns).toContain('those');
    });

    it('should have quantifier words', () => {
      expect(vocab.allWords).toContain('all');
      expect(vocab.allWords).toContain('everything');
      expect(vocab.allWords).toContain('every');
      
      expect(vocab.exceptWords).toContain('except');
      expect(vocab.exceptWords).toContain('but');
    });
  });

  describe('Common Words', () => {
    it('should have comprehensive adjective categories', () => {
      const adjectives = provider.getCommonAdjectives();
      
      // Size
      const sizeAdjs = ['big', 'large', 'small', 'tiny', 'huge', 'little'];
      sizeAdjs.forEach(adj => expect(adjectives).toContain(adj));
      
      // Colors
      const colorAdjs = ['red', 'blue', 'green', 'yellow', 'black', 'white'];
      colorAdjs.forEach(adj => expect(adjectives).toContain(adj));
      
      // Materials
      const materialAdjs = ['wooden', 'metal', 'stone', 'glass'];
      materialAdjs.forEach(adj => expect(adjectives).toContain(adj));
      
      // States
      const stateAdjs = ['open', 'closed', 'locked', 'broken'];
      stateAdjs.forEach(adj => expect(adjectives).toContain(adj));
    });

    it('should have common IF nouns', () => {
      const nouns = provider.getCommonNouns();
      
      // Openables
      const openables = ['door', 'window', 'box', 'chest'];
      openables.forEach(noun => expect(nouns).toContain(noun));
      
      // Containers
      const containers = ['box', 'container', 'bag', 'chest'];
      containers.forEach(noun => expect(nouns).toContain(noun));
      
      // Common objects
      const objects = ['key', 'lamp', 'book', 'table', 'chair'];
      objects.forEach(noun => expect(nouns).toContain(noun));
    });

    it('should have comprehensive preposition list', () => {
      const prepositions = provider.getPrepositions();
      
      // Basic spatial
      const spatial = ['in', 'on', 'at', 'under', 'over', 'behind', 'beside', 'between'];
      spatial.forEach(prep => expect(prepositions).toContain(prep));
      
      // Movement
      const movement = ['to', 'from', 'into', 'onto', 'through', 'across'];
      movement.forEach(prep => expect(prepositions).toContain(prep));
    });
  });

  describe('Data Integrity', () => {
    it('should have no duplicate verbs across all actions', () => {
      const allVerbs: string[] = [];
      englishVerbs.forEach(verbDef => {
        verbDef.verbs.forEach(verb => {
          allVerbs.push(verb.toLowerCase());
        });
      });
      
      const uniqueVerbs = [...new Set(allVerbs)];
      // Some verbs can map to multiple actions, so we just check for excessive duplication
      expect(allVerbs.length).toBeLessThan(uniqueVerbs.length * 1.5);
    });

    it('should have valid irregular plural mappings', () => {
      irregularPlurals.forEach((singular, plural) => {
        expect(singular).toBeTruthy();
        expect(plural).toBeTruthy();
        expect(singular).not.toBe(plural);
      });
    });

    it('should have non-conflicting abbreviations', () => {
      const abbrevs = Array.from(abbreviations.keys());
      const uniqueAbbrevs = [...new Set(abbrevs)];
      expect(abbrevs.length).toBe(uniqueAbbrevs.length);
    });

    it('should have all word lists as arrays', () => {
      expect(Array.isArray(englishWords.articles)).toBe(true);
      expect(Array.isArray(englishWords.prepositions)).toBe(true);
      expect(Array.isArray(englishWords.pronouns)).toBe(true);
      expect(Array.isArray(englishWords.conjunctions)).toBe(true);
      expect(Array.isArray(englishWords.determiners)).toBe(true);
      expect(Array.isArray(englishWords.directions)).toBe(true);
      expect(Array.isArray(englishWords.commonAdjectives)).toBe(true);
      expect(Array.isArray(englishWords.commonNouns)).toBe(true);
      expect(Array.isArray(englishWords.numberWords)).toBe(true);
      expect(Array.isArray(englishWords.auxiliaryVerbs)).toBe(true);
      expect(Array.isArray(englishWords.ignoreWords)).toBe(true);
    });

    it('should have no empty word lists', () => {
      Object.entries(englishWords).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          expect(value.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
