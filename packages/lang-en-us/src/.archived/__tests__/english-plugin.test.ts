/**
 * @file English Language Plugin Tests
 */

import EnglishLanguage from '../index';
import { IFActions } from '@sharpee/stdlib/constants';

describe('EnglishLanguagePlugin', () => {
  let language: EnglishLanguage;
  
  beforeEach(() => {
    language = new EnglishLanguage();
  });
  
  describe('Basic Properties', () => {
    it('should have correct language code', () => {
      expect(language.getLanguageCode()).toBe('en-US');
    });
    
    it('should have correct language name', () => {
      expect(language.getLanguageName()).toBe('English (US)');
    });
    
    it('should have LTR text direction', () => {
      expect(language.getTextDirection()).toBe('ltr');
    });
  });
  
  describe('Verb Mappings', () => {
    it('should map common verbs to actions', () => {
      expect(language.getActionForVerb('take')).toBe(IFActions.TAKING);
      expect(language.getActionForVerb('get')).toBe(IFActions.TAKING);
      expect(language.getActionForVerb('drop')).toBe(IFActions.DROPPING);
      expect(language.getActionForVerb('look')).toBe(IFActions.LOOKING);
      expect(language.getActionForVerb('examine')).toBe(IFActions.EXAMINING);
    });
    
    it('should return verbs for actions', () => {
      const takingVerbs = language.getVerbsForAction(IFActions.TAKING);
      expect(takingVerbs).toContain('take');
      expect(takingVerbs).toContain('get');
      expect(takingVerbs).toContain('grab');
    });
  });
  
  describe('Parser', () => {
    it('should create a parser', () => {
      const parser = language.createParser();
      expect(parser).toBeDefined();
      expect(parser.tokenize).toBeDefined();
      expect(parser.lemmatize).toBeDefined();
    });
    
    it('should tokenize simple commands', () => {
      const parser = language.createParser();
      const tokens = parser.tokenize('take the red ball');
      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('take');
      expect(tokens[1].value).toBe('the');
      expect(tokens[2].value).toBe('red');
      expect(tokens[3].value).toBe('ball');
    });
    
    it('should lemmatize words', () => {
      const parser = language.createParser();
      expect(parser.lemmatize('taking')).toBe('take');
      expect(parser.lemmatize('boxes')).toBe('box');
      expect(parser.lemmatize('children')).toBe('child');
    });
  });
  
  describe('Formatting', () => {
    it('should format lists', () => {
      expect(language.formatList([])).toBe('');
      expect(language.formatList(['apple'])).toBe('apple');
      expect(language.formatList(['apple', 'banana'])).toBe('apple and banana');
      expect(language.formatList(['apple', 'banana', 'orange'])).toBe('apple, banana, and orange');
    });
    
    it('should format item names with articles', () => {
      expect(language.formatItemName('ball')).toBe('a ball');
      expect(language.formatItemName('apple')).toBe('an apple');
      expect(language.formatItemName('ball', { definite: true })).toBe('the ball');
      expect(language.formatItemName('balls', { plural: true })).toBe('balls');
      expect(language.formatItemName('Bob', { proper: true })).toBe('Bob');
    });
    
    it('should format directions', () => {
      expect(language.formatDirection('north')).toBe('to the north');
      expect(language.formatDirection('up')).toBe('upward');
      expect(language.formatDirection('in')).toBe('inside');
    });
  });
  
  describe('Message Formatting', () => {
    it('should format action messages', () => {
      const msg = language.formatActionMessage(
        IFActions.TAKING,
        'report',
        'success',
        { item: 'the key' }
      );
      expect(msg).toBe('You take the key.');
    });
    
    it('should format messages with modifiers', () => {
      const msg = language.formatMessage(
        '{item:cap} is too heavy.',
        { item: 'the boulder' }
      );
      expect(msg).toBe('The boulder is too heavy.');
    });
  });
});
