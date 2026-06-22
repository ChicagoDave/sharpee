# @sharpee/lang-en-us

English (US) language plugin for the Sharpee Interactive Fiction engine.

## Installation

```bash
npm install @sharpee/lang-en-us
```

## Usage

### In a Story

```typescript
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Register with the engine during story setup
const languageProvider = new EnglishLanguageProvider();
```

In most cases you don't construct this directly — the build toolchain and
clients select it automatically when a story's config sets `language: 'en-US'`,
passing it to the engine alongside the matching parser.

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

This package implements the `ParserLanguageProvider` contract from `@sharpee/if-domain`:

- `EnglishLanguageProvider` provides verbs, words, message templates, and the
  formatter chain (ADR-095/ADR-158).
- The matching grammar/parser lives in the companion `@sharpee/parser-en-us` package.

## Extending

You can extend the English language provider for regional variants or custom
games — override message templates and add verbs/words in the subclass:

```typescript
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

class BritishEnglishProvider extends EnglishLanguageProvider {
  readonly languageCode = 'en-GB';
  readonly languageName = 'English (UK)';

  // Override or add templates, verbs, and words as needed.
}
```

## Data Exports

The package exports its data for customization:

- `englishWords` - Word lists (articles, prepositions, etc.)
- `irregularPlurals` - Irregular plural mappings
- `abbreviations` - Common abbreviations
- `directionMap`, `cardinalNumbers`, `ordinalNumbers` - Movement and number vocabulary

## License

MIT
