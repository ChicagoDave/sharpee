# ADR-067: Language-Specific Linguistics Architecture

## Status
Proposed

## Context
Interactive fiction needs sophisticated linguistic processing to generate natural-sounding text. This includes:
- Pronoun resolution (he/she/it/they)
- Article selection (a/an/the)
- Verb conjugation based on person and tense
- Gender agreement (especially important in languages like Spanish, French)
- Plurality handling
- Person perspective (first/second/third)

These linguistic rules are inherently language-specific and cannot be generalized across all languages. What works for English will not work for Spanish, French, or other languages.

Currently, we have language-specific parsers (`parser-en-us`, potential `parser-es`, etc.) but no corresponding linguistic services for text generation.

## Decision
Create language-specific linguistics packages that provide linguistic services for text generation. The architecture will consist of:
1. A core package defining interfaces and language-agnostic types
2. Language-specific implementations for each supported language
3. Integration with text-snippets through dependency injection

### Package Structure

```
packages/
├── linguistics-core/                    # Language-agnostic interfaces and types
│   ├── interfaces/
│   │   ├── pronoun-resolver.ts        # IPronounResolver interface
│   │   ├── article-handler.ts         # IArticleHandler interface
│   │   ├── conjugation.ts             # IConjugation interface
│   │   └── linguistics-service.ts     # Main service interface
│   ├── types/
│   │   ├── gender.ts                  # Gender enum/types
│   │   ├── plurality.ts               # Singular/plural types
│   │   ├── person.ts                  # First/second/third person
│   │   └── tense.ts                   # Past/present/future
│   └── index.ts                       # Public API exports
│
├── linguistics-en-us/                  # English (US) implementation
│   ├── pronouns/
│   │   ├── subject.ts                 # I, you, he, she, it, they
│   │   ├── object.ts                  # me, you, him, her, it, them
│   │   ├── possessive.ts              # my, your, his, her, its, their
│   │   └── reflexive.ts               # myself, yourself, himself, etc.
│   ├── articles/
│   │   ├── definite.ts                # the
│   │   ├── indefinite.ts              # a/an logic
│   │   └── demonstrative.ts           # this, that, these, those
│   ├── conjugation/
│   │   ├── regular.ts                 # Standard verb conjugation
│   │   ├── irregular.ts               # be, have, do, etc.
│   │   └── tense-rules.ts             # Tense-specific rules
│   ├── conventions/
│   │   └── if-standard.ts             # Standard IF text conventions
│   └── en-us-linguistics.ts           # Main service implementation
│
├── linguistics-es/                     # Spanish implementation (future)
│   ├── pronouns/
│   │   ├── subject.ts                 # yo, tú, él, ella, etc.
│   │   └── gender-agreement.ts        # Gender matching logic
│   ├── articles/
│   │   ├── definite.ts                # el, la, los, las
│   │   └── indefinite.ts              # un, una, unos, unas
│   ├── conjugation/
│   │   └── verb-forms.ts              # Complex Spanish conjugation
│   ├── gender-agreement/
│   │   └── adjective-agreement.ts     # Adjective gender/number matching
│   └── es-linguistics.ts              # Main service implementation
│
└── text-snippets/                      # Uses linguistics through interfaces
    └── (depends on linguistics-core only)
```

### Core Interfaces

```typescript
// linguistics-core/interfaces/linguistics-service.ts
export interface ILinguisticsService {
  pronouns: IPronounResolver;
  articles: IArticleHandler;
  conjugation: IConjugation;
  
  // Composite operations
  describeEntity(entity: Entity, options?: DescriptionOptions): string;
  listItems(items: Entity[], options?: ListOptions): string;
}

// linguistics-core/interfaces/pronoun-resolver.ts
export interface IPronounResolver {
  subject(entity: Entity, person: Person): string;
  object(entity: Entity, person: Person): string;
  possessive(entity: Entity, person: Person): string;
  reflexive(entity: Entity, person: Person): string;
}

// linguistics-core/interfaces/article-handler.ts
export interface IArticleHandler {
  definite(noun: string, entity?: Entity): string;
  indefinite(noun: string, entity?: Entity): string;
  withArticle(noun: string, articleType: ArticleType, entity?: Entity): string;
}

// linguistics-core/interfaces/conjugation.ts
export interface IConjugation {
  conjugate(verb: string, subject: Entity | Person, tense: Tense): string;
  participle(verb: string, type: 'present' | 'past'): string;
  gerund(verb: string): string;
}
```

### Integration Pattern

```typescript
// Platform/story initialization
import { EnglishLinguistics } from '@sharpee/linguistics-en-us';
import { TextService } from '@sharpee/text-service';
import { createTextSnippets } from '@sharpee/text-snippets';

const linguistics = new EnglishLinguistics();
const snippets = createTextSnippets(linguistics);
const textService = new TextService(snippets, linguistics);

// Text snippet using linguistics
// packages/text-snippets/src/actions/taking.ts
export function createTakingText(
  entity: Entity,
  linguistics: ILinguisticsService
): SnippetOutput {
  const article = linguistics.articles.indefinite(entity.name, entity);
  const pronoun = linguistics.pronouns.object(entity, Person.Second);
  
  return {
    textOutput: `You take ${article} ${entity.name}.`,
    metadata: {
      convention: 'standard'
    }
  };
}
```

## Consequences

### Positive
- **Language Independence**: Each language gets its own package with appropriate rules
- **Consistency**: Linguistic rules applied consistently across all text generation
- **Extensibility**: New languages can be added without modifying core interfaces
- **Type Safety**: Interfaces ensure all implementations provide required functionality
- **Testability**: Each linguistic package can be thoroughly tested in isolation
- **Reusability**: Linguistic services can be used by any text generation component

### Negative
- **Complexity**: Additional packages and abstractions to maintain
- **Coordination**: Changes to core interfaces affect all language implementations
- **Learning Curve**: Contributors need to understand the linguistic architecture
- **Package Proliferation**: Each language needs its own package

### Neutral
- Platforms must explicitly choose and inject linguistic packages
- Text snippets remain language-agnostic through interfaces
- Parser and linguistics packages are paired but independent

## Implementation Strategy

### Phase 1 - Core Infrastructure
1. Create `linguistics-core` with basic interfaces
2. Implement `linguistics-en-us` with essential features
3. Update text-snippets to use linguistic interfaces

### Phase 2 - English Completion
1. Full pronoun system implementation
2. Complete article handling (a/an logic)
3. Basic verb conjugation for common verbs
4. Standard IF text conventions

### Phase 3 - Additional Languages
1. Implement `linguistics-es` for Spanish
2. Add support for gender agreement
3. Handle complex conjugation patterns
4. Implement language-specific conventions

## Language Pairing
Each supported language will have paired packages:
- `parser-en-us` ↔ `linguistics-en-us`
- `parser-es` ↔ `linguistics-es`
- `parser-fr` ↔ `linguistics-fr`

Platforms will inject matched pairs to ensure consistency between input parsing and output generation.

## Notes
- This architecture mirrors the existing language-specific parser pattern
- Linguistic services are injected, not imported directly by text snippets
- Complex features like context-aware pronouns can evolve within each package
- The core package defines contracts, not implementations

## References
- ADR-066: Text Snippets Library
- Existing parser architecture (parser-en-us pattern)
- Standard IF conventions from Inform 7, TADS, and classical games