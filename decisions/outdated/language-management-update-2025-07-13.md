# Language Management Architecture Update

Date: 2025-07-13

## Summary

Updated the language management architecture to simplify how stories and engines handle languages and parsers. The GameEngine now automatically loads language providers and parsers based on convention, eliminating the need for manual registration in most cases.

## Key Changes

### 1. GameEngine Updates
- Added `setLanguage(languageCode: string)` method
- Added `getParser()` and `getLanguageProvider()` methods
- Engine automatically loads parser packages using convention
- `setStory()` now uses story's language configuration

### 2. CommandExecutor Updates
- Now requires `parser` parameter in constructor
- No longer creates its own BasicParser
- Updated factory function signature

### 3. Package Conventions
- Language providers: `@sharpee/lang-{language-code}`
- Parsers: `@sharpee/parser-{language-code}`
- Dynamic imports load packages on demand

## Updated ADRs

### ADR-026: Language-Specific Parser Architecture
- Status: Proposed → Accepted - Implemented
- Added implementation details
- Updated examples to show current usage

### ADR-027: Parser Package Architecture  
- Added note about ADR-028 simplification
- Updated examples to show automatic loading
- Marked manual registration as "rarely needed"

### ADR-028: Simplified Story Language Management (New)
- Documents the new automatic language loading
- Shows migration from manual to automatic setup
- Explains convention-based package naming

## Migration Impact

### Before
```typescript
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { ParserFactory } from '@sharpee/stdlib';

// Manual setup
ParserFactory.registerParser('en-US', EnglishParser);
const languageProvider = new EnglishLanguageProvider();
const parser = ParserFactory.createParser('en-US', languageProvider);
const engine = new GameEngine(world, player, config, languageProvider);
```

### After
```typescript
// Automatic setup
const engine = new GameEngine(world, player, config);
await engine.setLanguage('en-US'); // Everything loaded automatically!

// Or via story config
await engine.setStory(story); // Uses story.config.language
```

## Test Updates

### CommandExecutor Tests
- Import EnglishParser for testing
- Create parser using ParserFactory
- Pass parser to CommandExecutor constructor

### Engine Tests
- Most tests unaffected (use high-level APIs)
- Integration tests work without changes
- Language loading is handled by engine

## Benefits

1. **Simpler API**: Just `setLanguage()` or story config
2. **Convention over Configuration**: Predictable package names
3. **Automatic Loading**: No manual imports or registration
4. **Backward Compatible**: ParserFactory still works
5. **Better Encapsulation**: Complexity hidden in engine

## Next Steps

1. ✅ Update all affected ADRs
2. ✅ Fix CommandExecutor tests
3. ✅ Create migration documentation
4. Run full test suite to verify
5. Consider deprecating direct ParserFactory usage in stories
