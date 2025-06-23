// packages/lang-en-us/tests/english-provider.test.ts

import { 
  EnglishLanguageProvider, 
  createEnglishLanguageProvider,
  CustomizableEnglishProvider,
  createCustomizableEnglishProvider
} from '../src';
import { StandardTemplateKey, VerbCategory } from '@sharpee/core';

describe('EnglishLanguageProvider', () => {
  let provider: EnglishLanguageProvider;
  
  beforeEach(() => {
    provider = createEnglishLanguageProvider();
  });
  
  test('should provide standard templates', () => {
    expect(provider.getTemplate(StandardTemplateKey.TAKE_SUCCESS)).toBe('You take {0}.');
    expect(provider.getTemplate(StandardTemplateKey.DROP_SUCCESS)).toBe('You drop {0}.');
  });
  
  test('should format messages with parameters', () => {
    const formatted = provider.formatMessage(StandardTemplateKey.TAKE_SUCCESS, 'the book');
    expect(formatted).toBe('You take the book.');
  });
  
  test('should handle missing templates', () => {
    const formatted = provider.formatMessage('NONEXISTENT_TEMPLATE', 'test');
    expect(formatted).toContain('MISSING TEMPLATE');
  });
  
  test('should have verb definitions organized by categories', () => {
    const verbs = provider.getVerbs();
    
    // Check for some common verbs
    expect(verbs.has('look')).toBeTruthy();
    expect(verbs.has('take')).toBeTruthy();
    expect(verbs.has('go')).toBeTruthy();
    expect(verbs.has('inventory')).toBeTruthy();
    
    // Check for some verb properties
    const lookVerb = verbs.get('look');
    expect(lookVerb?.category).toBe(VerbCategory.OBSERVATION);
    expect(lookVerb?.synonyms).toContain('examine');
    
    const takeVerb = verbs.get('take');
    expect(takeVerb?.category).toBe(VerbCategory.MANIPULATION);
    expect(takeVerb?.requiresDirectObject).toBe(true);
  });
  
  test('should identify verbs correctly', () => {
    expect(provider.isVerb('look')).toBeTruthy();
    expect(provider.isVerb('examine')).toBeTruthy(); // Synonym
    expect(provider.isVerb('x')).toBeTruthy(); // Common abbreviation
    expect(provider.isVerb('nonexistentverb')).toBeFalsy();
  });
  
  test('should get canonical verbs', () => {
    expect(provider.getCanonicalVerb('look')).toBe('look');
    expect(provider.getCanonicalVerb('examine')).toBe('look'); // Maps synonym to canonical
    expect(provider.getCanonicalVerb('x')).toBe('look'); // Maps abbreviation to canonical
    expect(provider.getCanonicalVerb('nonexistentverb')).toBeUndefined();
  });
  
  test('should format lists correctly', () => {
    const items = ['apple', 'banana', 'orange'];
    const formatted = provider.formatList(
      StandardTemplateKey.INVENTORY_HEADER,
      StandardTemplateKey.INVENTORY_ITEM,
      [],
      items
    );
    
    expect(formatted).toContain('You are carrying:');
    expect(formatted).toContain('- apple');
    expect(formatted).toContain('- banana');
    expect(formatted).toContain('- orange');
  });
});

describe('CustomizableEnglishProvider', () => {
  let provider: CustomizableEnglishProvider;
  
  beforeEach(() => {
    provider = createCustomizableEnglishProvider();
  });
  
  test('should allow overriding templates', () => {
    const originalTemplate = provider.getTemplate(StandardTemplateKey.TAKE_SUCCESS);
    expect(originalTemplate).toBe('You take {0}.');
    
    // Override the template
    provider.setTemplate(StandardTemplateKey.TAKE_SUCCESS, 'You carefully pick up {0}.');
    
    // Check the new template
    const newTemplate = provider.getTemplate(StandardTemplateKey.TAKE_SUCCESS);
    expect(newTemplate).toBe('You carefully pick up {0}.');
    
    // Verify other templates are unchanged
    expect(provider.getTemplate(StandardTemplateKey.DROP_SUCCESS)).toBe('You drop {0}.');
  });
  
  test('should allow adding custom verbs', () => {
    // Add a custom verb
    provider.addVerbs({
      'teleport': {
        canonical: 'teleport',
        synonyms: ['warp', 'beam', 'transport'],
        description: 'Teleport to a location',
        category: VerbCategory.MOVEMENT,
        requiresDirectObject: true
      }
    });
    
    // Check the verb was added
    expect(provider.isVerb('teleport')).toBeTruthy();
    expect(provider.isVerb('warp')).toBeTruthy();
    expect(provider.getCanonicalVerb('beam')).toBe('teleport');
    
    // Verify existing verbs still work
    expect(provider.isVerb('look')).toBeTruthy();
    expect(provider.getCanonicalVerb('examine')).toBe('look');
  });
  
  test('should track custom templates and verbs separately', () => {
    // Add custom templates and verbs
    provider.setTemplate('CUSTOM_TEMPLATE', 'This is a custom template.');
    provider.addVerbs({
      'custom_verb': {
        canonical: 'custom_verb',
        synonyms: ['cv'],
        description: 'A custom verb',
        category: VerbCategory.META
      }
    });
    
    // Check custom collections
    const customTemplates = provider.getCustomTemplates();
    expect(customTemplates.size).toBe(1);
    expect(customTemplates.get('CUSTOM_TEMPLATE')).toBe('This is a custom template.');
    
    const customVerbs = provider.getCustomVerbs();
    expect(customVerbs.size).toBe(1);
    expect(customVerbs.has('custom_verb')).toBeTruthy();
    
    // Clear custom collections
    provider.clearCustomTemplates();
    provider.clearCustomVerbs();
    
    // Verify collections are empty
    expect(provider.getCustomTemplates().size).toBe(0);
    expect(provider.getCustomVerbs().size).toBe(0);
    
    // Verify standard templates and verbs still work
    expect(provider.getTemplate(StandardTemplateKey.TAKE_SUCCESS)).toBe('You take {0}.');
    expect(provider.isVerb('look')).toBeTruthy();
  });
});
