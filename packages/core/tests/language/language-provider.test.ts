// packages/core/tests/language/language-provider.test.ts

import { 
  LanguageProvider,
  getLanguageRegistry,
  createDefaultLanguageProvider,
  DefaultLanguageProviderFactory,
  StandardTemplateKey,
  VerbDefinition
} from '../../src/language';

describe('Language Provider System', () => {
  // Reset registry before each test
  beforeEach(() => {
    // Clear the registry by re-registering only the default provider
    const registry = getLanguageRegistry();
    
    // Remove all existing providers
    registry.getRegisteredLanguages().forEach(lang => {
      // We can't actually remove providers, but we can overwrite them
      registry.registerLanguage(lang, new DefaultLanguageProviderFactory());
    });
    
    // Register default again to ensure clean state
    registry.registerLanguage('default', new DefaultLanguageProviderFactory());
    registry.setLanguage('default');
  });
  
  describe('DefaultLanguageProvider', () => {
    let provider: LanguageProvider;
    
    beforeEach(() => {
      provider = createDefaultLanguageProvider();
    });
    
    test('should provide basic templates', () => {
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
    
    test('should allow adding custom templates', () => {
      provider.setTemplate('CUSTOM_TEMPLATE', 'This is a custom template with {0}.');
      const formatted = provider.formatMessage('CUSTOM_TEMPLATE', 'parameters');
      expect(formatted).toBe('This is a custom template with parameters.');
    });
    
    test('should have basic verbs defined', () => {
      const verbs = provider.getVerbs();
      expect(verbs.size).toBeGreaterThan(0);
      expect(verbs.has('look')).toBeTruthy();
      expect(verbs.has('take')).toBeTruthy();
    });
    
    test('should identify verbs correctly', () => {
      expect(provider.isVerb('look')).toBeTruthy();
      expect(provider.isVerb('examine')).toBeTruthy(); // Synonym
      expect(provider.isVerb('nonexistentverb')).toBeFalsy();
    });
    
    test('should get canonical verbs', () => {
      expect(provider.getCanonicalVerb('look')).toBe('look');
      expect(provider.getCanonicalVerb('examine')).toBe('look'); // Maps synonym to canonical
      expect(provider.getCanonicalVerb('nonexistentverb')).toBeUndefined();
    });
    
    test('should allow adding custom verbs', () => {
      const customVerbs: Record<string, VerbDefinition> = {
        'teleport': {
          canonical: 'teleport',
          synonyms: ['warp', 'beam'],
          description: 'Magically transport to a location',
          category: 'magic',
          requiresDirectObject: true
        }
      };
      
      provider.addVerbs(customVerbs);
      
      // Check the verb was added
      expect(provider.isVerb('teleport')).toBeTruthy();
      expect(provider.isVerb('warp')).toBeTruthy();
      
      // Check synonyms map to the canonical verb
      expect(provider.getCanonicalVerb('warp')).toBe('teleport');
      
      // Check the verb definition
      const verbs = provider.getVerbs();
      const teleport = verbs.get('teleport');
      expect(teleport).toBeDefined();
      expect(teleport?.category).toBe('magic');
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
  
  describe('LanguageRegistry', () => {
    let registry = getLanguageRegistry();
    
    test('should register language providers', () => {
      const factory = new DefaultLanguageProviderFactory();
      registry.registerLanguage('test-lang', factory);
      
      expect(registry.hasLanguage('test-lang')).toBeTruthy();
      expect(registry.getRegisteredLanguages()).toContain('test-lang');
    });
    
    test('should activate a registered language', () => {
      const factory = new DefaultLanguageProviderFactory();
      registry.registerLanguage('test-lang', factory);
      
      const result = registry.setLanguage('test-lang');
      expect(result).toBeTruthy();
      expect(registry.getActiveLanguage()).toBe('test-lang');
    });
    
    test('should fail to activate an unregistered language', () => {
      const result = registry.setLanguage('nonexistent-lang');
      expect(result).toBeFalsy();
    });
    
    test('should get the active provider', () => {
      const factory = new DefaultLanguageProviderFactory();
      registry.registerLanguage('test-lang', factory);
      registry.setLanguage('test-lang');
      
      const provider = registry.getProvider();
      expect(provider).toBeDefined();
      expect(provider?.isVerb('look')).toBeTruthy();
    });
    
    test('should normalize language codes to lowercase', () => {
      const factory = new DefaultLanguageProviderFactory();
      registry.registerLanguage('Test-Lang-UPPER', factory);
      
      expect(registry.hasLanguage('test-lang-upper')).toBeTruthy();
      
      const result = registry.setLanguage('TEST-LANG-upper');
      expect(result).toBeTruthy();
      expect(registry.getActiveLanguage()).toBe('test-lang-upper');
    });
  });
});
