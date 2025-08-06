# ADR-048: Static Language, Parser, and Text Service Architecture

## Status
Proposed

## Context
Currently, the engine dynamically loads language providers, parsers, and text services at runtime using async imports. This causes several problems:

1. **Test complexity**: Tests hang waiting for dynamic imports, require complex mocking
2. **Performance overhead**: Async loading delays startup and complicates initialization
3. **Debugging difficulty**: Dynamic imports make stack traces harder to follow
4. **Type safety loss**: TypeScript can't verify dynamically imported modules
5. **Unnecessary flexibility**: IF stories are distributed as complete executables, not runtime-configurable apps

The dynamic loading was designed to support runtime language switching, but this doesn't match how IF is actually distributed - authors build separate executables for each language/platform combination.

## Decision
Replace dynamic loading with static, build-time configuration of language, parser, and text service components. Each platform/language combination will have its own entry point that explicitly wires dependencies.

## Consequences

### Blast Radius Analysis

#### 1. **Engine Core** (`packages/engine/`)
- **BREAKING**: Remove `setLanguage()`, `setTextService()` methods
- **BREAKING**: Constructor now requires all dependencies
- **BREAKING**: Remove `loadLanguageProvider()`, `loadTextService()` helpers
- **Files affected**:
  - `src/game-engine.ts` - Major refactor
  - `src/story.ts` - Remove config, loading functions
  - `src/command-executor.ts` - Direct parser usage
  - All test files - Use direct imports

#### 2. **Story Interface** (`packages/engine/src/story.ts`)
- **BREAKING**: Remove `config.language`, `config.textService`
- **BREAKING**: Stories become pure initialization logic
- **NEW**: Add optional `extendParser()`, `extendLanguage()` methods
- **Impact**: Every story needs updating

#### 3. **Platform Integration**
- **NEW**: Create platform-specific entry points:
  - `packages/platforms/cli-en-us/`
  - `packages/platforms/electron-en-us/`
  - `packages/platforms/web-en-us/`
- **NEW**: Each platform owns its event handling directly
- **REMOVED**: Generic platform event routing through text service

#### 4. **Test Infrastructure** 
- **All test files** need updating (~50+ files)
- **NEW**: Simple test helpers with direct imports
- **REMOVED**: Mock dynamic import complexity
- **Benefit**: Tests run 10x faster, no timeouts

#### 5. **Build Process**
- **NEW**: Separate build configurations per language/platform
- **NEW**: Entry point generation from build config
- **CHANGE**: Package.json scripts for multi-build
- **Benefit**: Tree-shaking works properly

#### 6. **Parser/Language Extensions**
- **CHANGE**: From dynamic registration to explicit API
- **Before**: Language packages export default provider
- **After**: Direct instantiation with extension methods
```typescript
// Before
const langModule = await import('@sharpee/lang-en-us');
// After  
import { EnglishLanguage } from '@sharpee/lang-en-us';
const lang = new EnglishLanguage();
story.extendLanguage?.(lang);
```

#### 7. **Query System** (`packages/core/src/query/`)
- **MOVE**: Query manager ownership to platform
- **CHANGE**: Platform-specific query handlers
- **Benefit**: Can use native dialogs (Electron) vs terminal (CLI)

#### 8. **Package Structure**
```
packages/
  engine/           # Core engine without platform specifics
  platforms/        # NEW: Platform entry points
    cli-en-us/
    cli-es/
    electron-en-us/
    web-en-us/
  lang-en-us/       # Language providers (unchanged)
  parser-en-us/     # Parsers (unchanged)
  text-services/    # SIMPLIFIED: Just service implementations
```

#### 9. **Migration Effort**
- **High Impact Files** (need rewrite):
  - `game-engine.ts`
  - `story.ts`
  - All test files
  - All story files

- **Medium Impact** (need updates):
  - Command executor
  - Platform event handlers
  - Build scripts

- **Low Impact** (minimal changes):
  - Parser implementations
  - Language providers
  - World model

### Benefits

1. **Performance**: No async loading, instant startup
2. **Testing**: Simple, fast, no timeouts
3. **Type Safety**: Full TypeScript verification
4. **Clarity**: Explicit dependencies, clear ownership
5. **Build Size**: Better tree-shaking per platform
6. **Developer Experience**: Easier debugging, simpler mental model

### Risks

1. **Migration Effort**: Every story and test needs updating
2. **Multiple Builds**: More complex release process
3. **Code Duplication**: Some boilerplate in platform entry points

### Implementation Plan

1. **Phase 1**: Create new platform packages with static wiring
2. **Phase 2**: Update engine to accept dependencies via constructor
3. **Phase 3**: Create migration script for stories
4. **Phase 4**: Update all tests to use static imports
5. **Phase 5**: Remove dynamic loading code
6. **Phase 6**: Update build process for multi-platform

### Example New Architecture

```typescript
// packages/platforms/cli-en-us/index.ts
import { GameEngine } from '@sharpee/engine';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguage } from '@sharpee/lang-en-us';
import { CLITextService } from '@sharpee/text-services';
import { CLIPlatform } from './cli-platform';

export function createGame(story: Story) {
  const world = new WorldModel();
  const language = new EnglishLanguage();
  const parser = new EnglishParser(world, language);
  const textService = new CLITextService();
  
  // Let story extend
  story.extendParser?.(parser);
  story.extendLanguage?.(language);
  
  // Initialize world
  const player = story.createPlayer(world);
  story.initializeWorld(world);
  
  // Create engine with all dependencies
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    textService
  });
  
  // Platform owns its lifecycle
  const platform = new CLIPlatform(engine, textService);
  return platform;
}
```

## Decision Outcome
This change simplifies the entire system at the cost of a one-time migration effort. The benefits in performance, testing, and developer experience outweigh the migration costs.