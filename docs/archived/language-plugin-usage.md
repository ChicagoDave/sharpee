# Using the Language Plugin System

## Example: Creating a Story with English Language

```typescript
// Import the Story class and the English language plugin
import { createStory } from '@sharpee/stdlib';
import EnglishLanguagePlugin from '@sharpee/lang-en-us';

// Create a new story with the English language plugin
const story = createStory({
  title: 'My Adventure',
  language: new EnglishLanguagePlugin()
});

// Or set the language after creation
const story2 = createStory({ title: 'Another Adventure' });
story2.languageSet(new EnglishLanguagePlugin());

// The language plugin provides:
// - Verb mappings for all actions
// - Message templates for responses
// - Parser with POS tagging and lemmatization
// - Proper article handling
// - Direction canonicalization

// Process player input through the full pipeline
const events = await story.processInput('take the lamp');
// Returns semantic events that can be formatted into text

// Access language features directly
const lang = story.getLanguage();
if (lang) {
  // Format a list
  console.log(lang.formatList(['apple', 'banana', 'orange']));
  // Output: "apple, banana, and orange"
  
  // Format an item name with article
  console.log(lang.formatItemName('key', { indefinite: true }));
  // Output: "a key"
  
  // Get verbs for an action
  console.log(lang.getVerbsForAction('taking'));
  // Output: ['take', 'get', 'grab', 'pick up']
}
```

## Architecture Benefits

1. **True Plugin System**: Languages are now completely separate packages
2. **No Core Dependencies**: Language plugins only depend on stdlib
3. **Extensible**: Easy to add new languages by implementing the base classes
4. **Type Safe**: Full TypeScript support with proper interfaces
5. **Customizable**: Can override any aspect of language handling

## Creating Custom Languages

To create a new language plugin:

```typescript
import { BaseIFLanguagePlugin, IFParserPlugin } from '@sharpee/stdlib/language/base';

export class MyLanguagePlugin extends BaseIFLanguagePlugin {
  protected getDefaultLanguageCode() { return 'my-LANG'; }
  protected getDefaultLanguageName() { return 'My Language'; }
  protected getDefaultTextDirection() { return 'ltr' as const; }
  
  protected initializeLanguageData() {
    // Register verbs, templates, directions, etc.
    this.registerVerbs([
      { action: 'taking', verbs: ['take', 'get'] }
    ]);
  }
  
  createParser(): IFParserPlugin {
    return new MyLanguageParser();
  }
  
  // Implement required methods
  formatList(items: string[]): string { /* ... */ }
  formatItemName(name: string, options?: any): string { /* ... */ }
  // etc.
}
```
