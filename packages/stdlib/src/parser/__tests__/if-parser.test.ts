/**
 * Tests for IF-specific parser
 * Now using the new language system with story.languageSet(US_EN)
 */

import { createIFParser, IFParser, ScopeContext } from '../if-parser';
import { createStory, US_EN } from '../../index';
import { IFParserConfig, GrammarPattern } from '../if-parser-types';
import { Entity } from '../../world-model/types';
import { getLanguageInstance } from '../../languages/registry';

describe('IF Parser', () => {
  let parser: IFParser;
  let entities: Map<string, Entity>;
  let scope: ScopeContext;

  beforeEach(() => {
    const languageInstance = getLanguageInstance(US_EN);
    parser = createIFParser(languageInstance.getParserConfig());
    
    // Add language-specific patterns
    languageInstance.getGrammarPatterns().forEach(pattern => {
      parser.addGrammar(pattern);
    });

    // Set up test entities
    entities = new Map([
      ['brass-key', {
        id: 'brass-key',
        type: 'item',
        attributes: {
          name: 'key',
          adjectives: ['brass', 'small'],
          takeable: true
        },
        relationships: {}
      }],
      ['iron-key', {
        id: 'iron-key',
        type: 'item',
        attributes: {
          name: 'key',
          adjectives: ['iron', 'rusty'],
          takeable: true
        },
        relationships: {}
      }],
      ['wooden-door', {
        id: 'wooden-door',
        type: 'door',
        attributes: {
          name: 'door',
          adjectives: ['wooden', 'sturdy'],
          openable: true,
          open: false,
          lockable: true,
          locked: true
        },
        relationships: {}
      }],
      ['red-box', {
        id: 'red-box',
        type: 'container',
        attributes: {
          name: 'box',
          adjectives: ['red', 'small'],
          openable: true,
          open: false
        },
        relationships: {}
      }]
    ]);

    // Set up scope
    scope = {
      visible: new Set(['brass-key', 'iron-key', 'wooden-door', 'red-box']),
      reachable: new Set(['brass-key', 'iron-key', 'wooden-door', 'red-box']),
      known: new Set(['brass-key', 'iron-key', 'wooden-door', 'red-box']),
      recentlyMentioned: []
    };
  });

  const getEntity = (id: string) => entities.get(id);

  describe('New Language System Integration', () => {
    it('should work with story.languageSet(US_EN) API', () => {
      // Demonstrate the new author-centric API
      const story = createStory().languageSet(US_EN);
      const storyParser = story.getParser();
      
      expect(storyParser).toBeDefined();
      expect(story.getLanguage()?.definition.code).toBe(US_EN);
      
      // Test that the story-created parser works the same as the direct parser
      const result = storyParser.parse('take brass key', scope, getEntity);
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].action).toBe('taking');
    });

    it('should provide message formatting through story', () => {
      const story = createStory().languageSet(US_EN);
      const message = story.getMessage('CANT_TAKE', 'the key');
      expect(message).toBe("You can't take the key.");
    });
  });

  describe('Basic commands', () => {
    it('should parse simple take command', () => {
      const result = parser.parse('take brass key', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].action).toBe('taking');
      expect(result.commands[0].noun).toHaveLength(1);
      expect(result.commands[0].noun![0].entity.id).toBe('brass-key');
    });

    it('should parse examine command', () => {
      const result = parser.parse('x door', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('examining');
      expect(result.commands[0].noun![0].entity.id).toBe('wooden-door');
    });

    it('should parse inventory command', () => {
      const result = parser.parse('i', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('inventory');
      expect(result.commands[0].noun).toBeUndefined();
    });
  });

  describe('Disambiguation', () => {
    it('should request disambiguation for ambiguous objects', () => {
      const result = parser.parse('take key', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.needsDisambiguation).toBeDefined();
      expect(result.needsDisambiguation!.options).toHaveLength(2);
      expect(result.needsDisambiguation!.prompt).toBe('Which do you mean?');
    });

    it('should not disambiguate when adjective makes it clear', () => {
      const result = parser.parse('take iron key', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.needsDisambiguation).toBeUndefined();
      expect(result.commands[0].noun![0].entity.id).toBe('iron-key');
    });
  });

  describe('Two-object commands', () => {
    it('should parse put X in Y command', () => {
      const result = parser.parse('put brass key in red box', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('inserting');
      expect(result.commands[0].noun![0].entity.id).toBe('brass-key');
      expect(result.commands[0].second![0].entity.id).toBe('red-box');
      expect(result.commands[0].preposition).toBe('in');
    });

    it('should parse unlock X with Y command', () => {
      const result = parser.parse('unlock door with brass key', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('unlocking');
      expect(result.commands[0].noun![0].entity.id).toBe('wooden-door');
      expect(result.commands[0].second![0].entity.id).toBe('brass-key');
    });
  });

  describe('Movement commands', () => {
    it('should parse directional movement', () => {
      const result = parser.parse('go north', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('going');
      expect(result.commands[0].noun).toBeDefined();
    });

    it('should parse abbreviated directions', () => {
      const result = parser.parse('n', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].action).toBe('going');
    });
  });

  describe('Error handling', () => {
    it('should handle unknown commands', () => {
      const result = parser.parse('frobnicate the widget', scope, getEntity);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("I don't understand that command.");
    });

    it('should handle missing objects', () => {
      const result = parser.parse('take sword', scope, getEntity);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('I don\'t see any "sword" here.');
    });
  });

  describe('Pronoun handling', () => {
    it('should resolve "it" to recently mentioned object', () => {
      scope.recentlyMentioned = ['brass-key'];
      const result = parser.parse('take it', scope, getEntity);
      
      expect(result.success).toBe(true);
      expect(result.commands[0].noun![0].entity.id).toBe('brass-key');
      expect(result.commands[0].noun![0].matchType).toBe('pronoun');
    });
  });
});
