# @sharpee/parser-en-us

English (US) parser for the Sharpee Interactive Fiction Platform.

## Installation

```bash
pnpm add @sharpee/parser-en-us
```

## Usage

```typescript
import { EnglishParser } from '@sharpee/parser-en-us';
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Register the parser
ParserFactory.registerParser('en-US', EnglishParser);

// Create language provider
const language = new EnglishLanguageProvider();

// Create parser instance
const parser = ParserFactory.createParser('en-US', language);

// Parse commands
const result = parser.parse('take the red ball');
if (result.success) {
  console.log(result.value.action); // 'if.action.taking'
  console.log(result.value.structure.directObject?.text); // 'the red ball'
}
```

## Features

### Compound Verbs
- "look at" → examining
- "pick up" → taking  
- "put down" → dropping
- "turn on/off" → switching on/off

### Rich Information Preservation
- Articles preserved: "the", "a", "an"
- Modifiers tracked: "red", "small", "wooden"
- Position information for all tokens
- Original text reconstructible

### Grammar Patterns
- `VERB_ONLY`: "look", "wait"
- `VERB_NOUN`: "take ball", "examine mirror"
- `VERB_PREP_NOUN`: "look at painting"
- `VERB_NOUN_PREP_NOUN`: "put ball in box"
- `DIRECTION_ONLY`: "north", "n"

### Abbreviations
- Verb abbreviations: "x" → "examine", "l" → "look"
- Direction abbreviations: "n" → "north", "se" → "southeast"

## Parsed Command Structure

```typescript
interface ParsedCommand {
  rawInput: string;
  tokens: Token[];
  structure: {
    verb: VerbPhrase;
    directObject?: NounPhrase;
    preposition?: PrepPhrase;
    indirectObject?: NounPhrase;
  };
  pattern: string;
  confidence: number;
  action: string;
}
```

### Example Output

Input: "put the small key in the wooden box"

```json
{
  "action": "if.action.putting",
  "structure": {
    "verb": {
      "text": "put",
      "head": "put"
    },
    "directObject": {
      "text": "the small key",
      "head": "key",
      "articles": ["the"],
      "modifiers": ["small"],
      "candidates": ["key"]
    },
    "preposition": {
      "text": "in"
    },
    "indirectObject": {
      "text": "the wooden box",
      "head": "box",
      "articles": ["the"],
      "modifiers": ["wooden"],
      "candidates": ["box"]
    }
  },
  "pattern": "VERB_NOUN_PREP_NOUN",
  "confidence": 0.7
}
```

## English-Specific Features

- **SVO Word Order**: Subject-Verb-Object parsing
- **Articles**: "the", "a", "an" handling
- **Determiners**: "all", "every", "some"
- **Compound Prepositions**: Multi-word verb phrases
- **Flexible Adjective Placement**: "red ball" or "ball that is red"

## License

MIT
