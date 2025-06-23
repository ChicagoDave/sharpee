# Language Plugin Base Implementation Summary

## What We've Created

### 1. **types.ts** - Comprehensive type definitions
- `IFLanguagePlugin` - Main interface extending Core's `LanguageProvider`
- `IFParserPlugin` - Parser interface for tokenization, POS tagging, and parsing
- All parser types: `Token`, `TaggedWord`, `ParsedCommand`, etc.
- Supporting types: `ActionParams`, `EventParams`, `VerbDefinition`, etc.

### 2. **if-language-plugin.ts** - Base class for language plugins
- `BaseIFLanguagePlugin` - Abstract class implementing common functionality
- Verb registration system
- Template management for actions and events
- Direction canonicalization
- Abstract methods that languages must implement

### 3. **parser-plugin.ts** - Base parser implementation
- `BaseIFParserPlugin` - Abstract class with default parsing logic
- Default tokenizer (can be overridden)
- Phrase identification (verb/noun/prepositional phrases)
- Basic grammar analysis
- Abstract methods for POS tagging and lemmatization

### 4. **index.ts** - Clean exports
- Exports all types and base classes
- Convenient enum exports

### 5. **Updated language/index.ts**
- Now exports base classes via `export * from './base'`
- Removed auto-registration of English
- Deprecated `initializeIFLanguages()`

## Next Steps

### 1. **Update lang-en-us Package Structure**
```
packages/lang-en-us/
├── package.json          # Change dependency from @sharpee/core to @sharpee/stdlib
├── tsconfig.json         # Update to reference stdlib
├── src/
│   ├── index.ts         # Export default class extending BaseIFLanguagePlugin
│   ├── english-plugin.ts # Main plugin implementation
│   ├── parser/
│   │   ├── index.ts     # Export parser extending BaseIFParserPlugin
│   │   ├── pos-tagger.ts
│   │   ├── lemmatizer.ts
│   │   └── grammar.ts
│   └── data/
│       ├── verbs.ts     # Verb definitions
│       ├── templates.ts # Message templates
│       └── words.ts     # Word lists
```

### 2. **Update Imports in lang-en-us**
All files need import updates:
```typescript
// Before
import { POSType, Token, VerbDefinition } from '@sharpee/core';

// After
import { POSType, Token, VerbDefinition } from '@sharpee/stdlib/language/base';
```

### 3. **Create the Main Plugin Class**
```typescript
// packages/lang-en-us/src/index.ts
import { BaseIFLanguagePlugin } from '@sharpee/stdlib/language/base';
import { EnglishParser } from './parser';
import { englishVerbs } from './data/verbs';
import { englishTemplates } from './data/templates';

export default class EnglishLanguagePlugin extends BaseIFLanguagePlugin {
  protected getDefaultLanguageCode() { return 'en-US'; }
  protected getDefaultLanguageName() { return 'English (US)'; }
  protected getDefaultTextDirection() { return 'ltr' as const; }
  
  protected initializeLanguageData() {
    this.registerVerbs(englishVerbs);
    this.registerActionTemplates(englishTemplates.actions);
    this.registerEventTemplates(englishTemplates.events);
    // etc...
  }
  
  createParser() {
    return new EnglishParser();
  }
  
  // Implement other abstract methods...
}
```

### 4. **Update Build Configuration**
- Remove `lang-en-us` from workspace if it's there
- Or update it to depend on stdlib
- Ensure build order: core → stdlib → lang-*

### 5. **Create Example Usage**
Show how to use the new plugin system:
```typescript
// story.ts
import { createGame } from '@sharpee/forge';
import EnglishLanguage from '@sharpee/lang-en-us';

const game = createGame({
  language: new EnglishLanguage(),
  title: "Adventure"
});
```

## Benefits of This Architecture

1. **Clean Dependencies**: Language packages only depend on StdLib
2. **True Plugins**: All languages are equal, no special cases
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Extensibility**: Easy to add new languages
5. **Modularity**: Parser can be swapped out independently
6. **Customization**: Languages can override any base behavior

## Questions to Consider

1. Should we provide a language plugin template/generator?
2. How should language plugins handle regional variants (en-US vs en-GB)?
3. Should parser plugins be separate from language plugins?
4. How do we handle fallbacks for missing translations?