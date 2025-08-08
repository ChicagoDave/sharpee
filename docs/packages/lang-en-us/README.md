# @sharpee/lang-en-us

English (US) language plugin for the Sharpee Interactive Fiction engine.

## Installation

```bash
npm install @sharpee/lang-en-us
```

## Usage

### In a Story

```typescript
import { createGame } from '@sharpee/forge';
import EnglishLanguage from '@sharpee/lang-en-us';

const game = createGame({
  title: 'My Adventure',
  language: new EnglishLanguage(),
  // ... other configuration
});
```

### With Custom Configuration

```typescript
import { EnglishLanguagePlugin } from '@sharpee/lang-en-us';

const language = new EnglishLanguagePlugin({
  // Custom templates
  customTemplates: {
    'taking.report.success': 'You grab {item} with gusto!'
  },
  
  // Additional verb mappings
  customVerbs: [{
    action: IFActions.TAKING,
    verbs: ['snatch', 'yoink']
  }]
});
```

## Features

- Complete verb mappings for all standard IF actions
- Full English parser with:
  - Tokenization
  - Part-of-speech tagging
  - Lemmatization (word normalization)
  - Grammar analysis
  - Compound verb handling
- Message templates for all actions and events
- Proper article handling (a/an/the)
- Pluralization support
- Direction abbreviations (n/s/e/w)

## Architecture

This package is a plugin for `@sharpee/stdlib` and extends the base language classes:

- `EnglishLanguagePlugin` extends `BaseIFLanguagePlugin`
- `EnglishParser` extends `BaseIFParserPlugin`

## Extending

You can extend the English language plugin for regional variants or custom games:

```typescript
import { EnglishLanguagePlugin } from '@sharpee/lang-en-us';

class BritishEnglishPlugin extends EnglishLanguagePlugin {
  protected getDefaultLanguageCode() {
    return 'en-GB';
  }
  
  protected getDefaultLanguageName() {
    return 'English (UK)';
  }
  
  protected initializeLanguageData() {
    super.initializeLanguageData();
    
    // Add British spellings
    this.registerActionTemplates({
      'examining.report.basic': 'You examine {item} and see its colour is {color}.'
    });
  }
}
```

## Data Exports

The package exports its data for customization:

- `englishVerbs` - All verb definitions
- `englishTemplates` - All message templates
- `englishWords` - Word lists (articles, prepositions, etc.)
- `irregularPlurals` - Irregular plural mappings
- `abbreviations` - Common abbreviations

## License

MIT
