# Creating a Language Implementation

This guide walks through creating a new language implementation for Sharpee. A complete language requires two packages: a **language provider** (text, messages, vocabulary) and a **parser** (command understanding). The English implementation (`lang-en-us` + `parser-en-us`) is the reference — this guide explains the architecture so you can build one for another language.

## Architecture Overview

Sharpee's language layer is split across four concerns:

```
┌─────────────────────────────────────────────────────────┐
│ Engine / stdlib / world-model                           │
│ (language-agnostic — never contains localized strings)  │
│ Emits semantic events with message IDs, not text.       │
└──────────────┬────────────────────────┬─────────────────┘
               │                        │
   ┌───────────▼──────────┐  ┌─────────▼────────────┐
   │ @sharpee/lang-{code} │  │ @sharpee/parser-{code}│
   │                      │  │                       │
   │ Messages & text      │  │ Command parsing       │
   │ Verb vocabulary      │  │ Grammar engine        │
   │ Formatters           │  │ Tokenization          │
   │ Articles, plurals    │  │ Slot consumers        │
   │ Perspective system   │  │ Pronoun resolution    │
   └──────────────────────┘  └───────────────────────┘
```

The engine emits events like `if.action.taking.taken` with parameters `{item: "brass lantern"}`. The language provider resolves that to "Taken." (English) or "Tomado." (Spanish) or "取った。" (Japanese). The parser does the reverse — takes player input like "take lamp" and produces a structured command the engine can execute.

### The Iron Rule

**No localized strings in engine, stdlib, or world-model.** Actions emit message IDs. The language provider resolves them to text. The parser converts text to commands. If you find yourself putting language-specific logic in an action, you're in the wrong layer. See ADR-038.

## Package Structure

You need two packages. Use IETF language tags for naming:

```
packages/
  lang-es/                    # Spanish language provider
    src/
      language-provider.ts    # Implements ParserLanguageProvider
      data/
        verbs.ts              # Verb definitions (tomar, mirar, ir, ...)
        words.ts              # Articles, prepositions, abbreviations
        messages.ts           # Parser error messages
      actions/
        index.ts              # Re-exports all action language files
        taking.ts             # Messages for the taking action
        looking.ts            # Messages for the looking action
        ...                   # One file per stdlib action
      formatters/
        article.ts            # Indefinite/definite article logic
        list.ts               # List formatting ("a, b y c")
        text.ts               # General text utilities
      npc/
        index.ts              # NPC-related messages
      perspective/
        index.ts              # Perspective placeholders ({Tú}, {usted})
      grammar.ts              # Grammar pattern definitions
      index.ts                # Package exports
    package.json
    tsconfig.json

  parser-es/                  # Spanish parser
    src/
      spanish-parser.ts       # Implements Parser interface
      grammar.ts              # Grammar engine
      slot-consumers/         # Entity/text/vocabulary resolution
      direction-mappings.ts   # norte→NORTH, sur→SOUTH, ...
      pronoun-context.ts      # él, ella, eso, ...
      index.ts                # Package exports
    package.json
    tsconfig.json
```

## Step 1: Create the Language Provider

The language provider implements `ParserLanguageProvider` from `@sharpee/if-domain`. This interface extends `LanguageProvider` (text/messaging) with parser-specific vocabulary methods.

### Required methods from LanguageProvider

```typescript
interface LanguageProvider {
  readonly languageCode: string;          // e.g., 'es'

  // Message resolution
  getActionPatterns(actionId: string): string[] | undefined;
  getMessage(messageId: string, params?: Record<string, any>): string;
  hasMessage(messageId: string): boolean;

  // Optional
  getActionHelp?(actionId: string): ActionHelp | undefined;
  getSupportedActions?(): string[];
}
```

### Required methods from ParserLanguageProvider

```typescript
interface ParserLanguageProvider extends LanguageProvider {
  // Vocabulary
  getVerbs(): VerbVocabulary[];
  getDirections(): DirectionVocabulary[];
  getSpecialVocabulary(): SpecialVocabulary;
  getPrepositions(): string[];
  getDeterminers(): string[];
  getConjunctions(): string[];
  getNumbers(): string[];
  getGrammarPatterns(): LanguageGrammarPattern[];
  getCommonAdjectives(): string[];
  getCommonNouns(): string[];

  // Text processing
  lemmatize(word: string): string;
  expandAbbreviation(abbreviation: string): string | null;
  formatList(items: string[], conjunction: 'and' | 'or'): string;
  getIndefiniteArticle(noun: string): string;
  pluralize(noun: string): string;
  isIgnoreWord(word: string): boolean;
  getEntityName(entity: any): string;
}
```

### Vocabulary types

```typescript
// Verb → action mapping
interface VerbVocabulary {
  actionId: string;       // 'if.action.taking'
  verbs: string[];        // ['tomar', 'coger', 'agarrar']
  prepositions?: string[];
}

// Direction words
interface DirectionVocabulary {
  direction: string;      // 'NORTH'
  words: string[];        // ['norte']
  abbreviations?: string[]; // ['n']
}

// Pronouns, articles, etc.
interface SpecialVocabulary {
  pronouns: string[];     // ['él', 'ella', 'eso', 'ello']
  allWords: string[];     // ['todo', 'todos', 'todas']
  exceptWords: string[];  // ['excepto', 'menos', 'salvo']
}
```

### Action messages

Each stdlib action needs a language file. These provide the text the player sees:

```typescript
// lang-es/src/actions/taking.ts
export const takingLanguage = {
  actionId: 'if.action.taking',

  // Patterns shown in help text (not used for parsing — that's the parser's job)
  patterns: [
    'tomar [algo]',
    'coger [algo]',
    'agarrar [algo]',
  ],

  // Messages keyed by message ID suffix
  messages: {
    'no_target': "¿Tomar qué?",
    'already_have': "{You} ya {have} {item}.",
    'fixed_in_place': "{item} está fijo en su lugar.",
    'taken': "Tomado.",
    'taken_from': "{You} {take} {item} de {container}.",
  },

  help: {
    description: 'Recoger objetos y añadirlos al inventario.',
    examples: 'tomar libro, coger lámpara, agarrar espada',
    summary: 'TOMAR/COGER - Recoger objetos. Ejemplo: TOMAR LÁMPARA'
  }
};
```

**Perspective placeholders**: Messages use `{You}`, `{take}`, `{have}`, `{yourself}`, etc. These are resolved by the perspective system based on narrative settings (2nd person, 1st person, etc.). Your language provider must implement a perspective resolver for your language's pronoun/conjugation system.

### The 43 stdlib actions that need messages

Every language must provide messages for all standard actions:

about, attacking, climbing, closing, drinking, dropping, eating, entering, examining, exiting, giving, going, help, inserting, inventory, listening, locking, looking, lowering, opening, pulling, pushing, putting, quitting, raising, reading, removing, restarting, restoring, saving, scoring, searching, showing, sleeping, smelling, switching_on, switching_off, taking, taking_off, talking, throwing, touching, unlocking, waiting, wearing

## Step 2: Create the Parser

The parser takes player input text and produces a `ValidatedCommand` that the engine can execute. It must implement the `Parser` interface.

### What the parser does

1. **Tokenize** — split input into tokens (language-specific: Japanese has no spaces, German has compound words)
2. **Match grammar patterns** — find which verb pattern the input matches
3. **Resolve slots** — identify which entities the player is referring to
4. **Produce a ValidatedCommand** — action ID + resolved entity references

### Language-specific concerns

| Language | Key challenges |
|----------|---------------|
| English | SVO order, compound verbs ("pick up"), articles |
| Spanish | Flexible word order (SVO/VSO/VOS), gender agreement, reflexive pronouns |
| German | V2 word order, separable verbs ("aufmachen"), case system, compound nouns |
| Japanese | SOV order, particles (を、に、で), no spaces, no articles |
| French | SVO order, elision (l'épée), gender, partitive articles |
| Arabic | VSO default, right-to-left, root-based morphology |

### Grammar patterns

The parser uses a grammar engine to match input against patterns. Patterns are registered via the `GrammarBuilder` API:

```typescript
// In your parser's grammar setup
grammar
  .forAction('if.action.taking')
  .verbs(['tomar', 'coger', 'agarrar'])
  .pattern(':target')
  .where('target', (scope) => scope.visible())
  .build();

grammar
  .forAction('if.action.going')
  .directions({
    north: ['norte', 'n'],
    south: ['sur', 's'],
    east: ['este', 'e'],
    west: ['oeste', 'o'],
  })
  .build();
```

## Step 3: Package Configuration

### package.json (language)

```json
{
  "name": "@sharpee/lang-es",
  "version": "0.9.92-beta",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@sharpee/if-domain": "workspace:*"
  }
}
```

### package.json (parser)

```json
{
  "name": "@sharpee/parser-es",
  "version": "0.9.92-beta",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@sharpee/if-domain": "workspace:*",
    "@sharpee/lang-es": "workspace:*"
  }
}
```

### tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Register in pnpm workspace

Add to `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  # ... existing entries
```

### Register in build.sh

Add to the `PACKAGES` array in `build_platform()`:

```bash
"@sharpee/lang-es:lang-es"
"@sharpee/parser-es:parser-es"
```

Place them after `parser-en-us` in the dependency order.

## Step 4: Wire It Up

### In a story

```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { SpanishParser } from '@sharpee/parser-es';
import { SpanishLanguageProvider } from '@sharpee/lang-es';

const world = new WorldModel();
const player = story.createPlayer(world);
const language = new SpanishLanguageProvider();
const parser = new SpanishParser(language);

const engine = new GameEngine({ world, player, parser, language });
engine.setStory(story);
engine.start();
```

### In the runtime (Lantern)

The `@sharpee/runtime` bridge currently hardcodes `EnglishParser` and `EnglishLanguageProvider`. To support other languages, you'd either:

1. Build a separate runtime bundle per language
2. Modify the bridge to accept a language parameter in `sharpee:start`

## Testing Strategy

### Unit test the language provider

- Every action message ID resolves to non-empty text
- Perspective placeholders resolve correctly for all narrative modes
- `formatList` produces grammatically correct output
- `pluralize` handles regular and irregular forms
- `getIndefiniteArticle` returns the correct article (gender-sensitive for many languages)

### Unit test the parser

- Each verb form parses to the correct action ID
- Direction words resolve correctly
- Pronouns resolve to the last referenced entity
- Compound commands parse correctly
- Edge cases: empty input, unknown words, ambiguous references

### Transcript tests

Write transcript files in your language:

```
# tests/transcripts/basic-es.transcript
> mirar
[EXPECT: room.description]

> tomar lámpara
[EXPECT: action.result]

> inventario
[EXPECT: action.result]
```

## Reference

### Related ADRs

- **ADR-026**: Language-specific parser architecture (why parsers are per-language)
- **ADR-027**: Parser package architecture (naming, structure)
- **ADR-028**: Simplified language management (engine auto-loading)
- **ADR-037**: ParserLanguageProvider interface (the full contract)
- **ADR-038**: Language-agnostic actions (what stays out of language code)
- **ADR-087**: Action-centric grammar (the grammar pattern API)
- **ADR-089**: Narrative perspective system (1st/2nd/3rd person)
- **ADR-093**: i18n entity vocabulary (future direction)

### Reference implementation

The English implementation is the canonical reference:

- Language provider: `packages/lang-en-us/src/language-provider.ts`
- Action messages: `packages/lang-en-us/src/actions/` (one file per action)
- Verb definitions: `packages/lang-en-us/src/data/verbs.ts`
- Word lists: `packages/lang-en-us/src/data/words.ts`
- Formatters: `packages/lang-en-us/src/formatters/`
- Parser: `packages/parser-en-us/src/english-parser.ts`
- Grammar engine: `packages/parser-en-us/src/english-grammar-engine.ts`
- Slot consumers: `packages/parser-en-us/src/slot-consumers/`

### API reference

Full type signatures are in `packages/sharpee/docs/genai-api/`:

- `if-domain.md` — `LanguageProvider`, `ParserLanguageProvider`, `Parser`, vocabulary types
- `lang.md` — English implementation details
- `parser.md` — English parser details
