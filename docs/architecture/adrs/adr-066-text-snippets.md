# ADR-066: Text Snippets Library

## Status
Proposed

## Context
Currently, each text service implementation must independently construct text for common patterns like meta-actions (about, help, credits), standard action responses (taking, dropping), and world descriptions. This leads to:
- Duplication of text construction logic across text service implementations
- Inconsistent default text patterns
- No shared foundation for standard IF conventions
- Difficulty in maintaining consistent narrative style

We need a library of reusable text construction functions that represent default text patterns for actions and other common outputs.

## Decision
Create a new package `@sharpee/text-snippets` that provides a library of default text construction functions. These snippets will:
- Sit between stdlib and text services as pure functions
- Return structured JSON with formatted text
- Provide standard IF conventions while allowing customization
- Focus initially on simple string interpolation, deferring complex linguistic features

### Package Structure
```
packages/text-snippets/
├── meta/
│   ├── about.ts        // Title, author, version, blurb
│   ├── help.ts         // Command listing, categories
│   └── credits.ts      // Contributors, acknowledgments
├── actions/
│   ├── movement/       // going, entering, exiting
│   ├── manipulation/   // taking, dropping, putting
│   └── examination/    // examining, looking, searching
├── world/
│   ├── room-description.ts
│   ├── object-listing.ts
│   └── container-contents.ts
└── conventions/
    ├── inform7/        // Inform 7 style defaults
    ├── tads/          // TADS style defaults
    └── classic/       // Zork/Infocom style
```

### Core Interfaces
```typescript
interface SnippetOutput {
  textOutput: string;           // The ready-to-display text
  metadata?: {
    style?: string;             // Which style was applied
    convention?: string;        // Which IF convention used
    truncated?: boolean;        // If output was shortened
  };
}

interface TextSnippet<TContext = any> {
  id: string;                          // 'meta.about', 'action.taking.success'
  category: SnippetCategory;           // 'meta', 'action', 'world', 'status'
  defaultTemplate: TemplateFunction;   // The default implementation
  conventions?: IFConvention[];        // ['inform7', 'tads', 'classic']
}

type TemplateFunction<TInput, TOutput = SnippetOutput> = 
  (input: TInput, options?: TemplateOptions) => TOutput;

interface TemplateOptions {
  style?: 'minimal' | 'verbose' | 'poetic';
  person?: 'first' | 'second' | 'third';
  tense?: 'past' | 'present';
}
```

### Example Implementation
```typescript
// packages/text-snippets/src/meta/about.ts
export function createAboutText(config: StoryConfig): SnippetOutput {
  const { title, author, version, releaseDate, blurb } = config;
  
  // Default IF convention (similar to Inform 7)
  const parts = [
    title && `"${title}"`,
    author && `by ${Array.isArray(author) ? author.join(', ') : author}`,
    version && `Version ${version}`,
    releaseDate && `Released ${releaseDate}`,
    blurb && `\n${blurb}`
  ].filter(Boolean);
  
  return {
    textOutput: parts.join('\n'),
    metadata: {
      convention: 'inform7'
    }
  };
}
```

### Usage Pattern
Text services would use snippets as follows:
```typescript
// In a text service
import { createAboutText } from '@sharpee/text-snippets/meta';

// Use default
const output = createAboutText(storyConfig);
const text = output.textOutput;

// Or customize
const customAbout = (config) => {
  const base = createAboutText(config);
  return {
    ...base,
    textOutput: `${base.textOutput}\n\nSpecial thanks to...`
  };
};
```

## Consequences

### Positive
- **Consistency**: Standard IF conventions available to all text services
- **Reusability**: No duplication across text service implementations
- **Flexibility**: Easy to override while keeping defaults available
- **Testability**: Snippets can be unit tested independently
- **Evolution**: Can add new conventions/styles without breaking existing code
- **Separation**: Text construction logic separated from text service implementation

### Negative
- **Additional Package**: One more package to maintain in the monorepo
- **Coordination**: Changes to snippets affect all text services
- **Abstraction**: Another layer between actions and final output

### Neutral
- Text services remain responsible for orchestration and customization
- Snippets provide defaults but don't enforce their use
- Complex linguistic features (pronouns, articles, person/tense) deferred to future phases

## Implementation Phases

### Phase 1 - Foundation
- Create package structure
- Implement basic meta-action snippets (about, help, credits)
- Simple string interpolation only
- Default to second-person present tense

### Phase 2 - Expansion
- Add common action snippets
- Support for different IF conventions
- Basic style variations (minimal, verbose, poetic)

### Phase 3 - Linguistic Enhancement (Future)
- Integration with language-specific linguistic services (see ADR-067)
- Dynamic pronoun/article resolution through linguistic interfaces
- Person/tense transformation via language-specific packages
- Full localization support

## Language Considerations
- Text snippets will remain language-agnostic by working through linguistic interfaces
- Language-specific features will be provided by packages like `@sharpee/linguistics-en-us`
- Platforms will inject the appropriate linguistic package based on parser language
- This mirrors the existing pattern of pairing parsers with languages (parser-en-us, parser-es, etc.)

## Notes
- Snippets return JSON with complete text to allow for metadata and future extensibility
- Complex linguistic features are explicitly deferred to avoid premature complexity
- Focus is on providing sensible defaults that can be easily overridden
- This approach doesn't lock us into any particular linguistic model
- Linguistic services will be language-specific packages, not globalized

## References
- ADR-052: Event-Driven Architecture
- ADR-067: Language-Specific Linguistics Architecture
- Core Concepts: Separation of concerns between stdlib/story/platform layers
- About action refactoring: Demonstrates need for standardized text construction