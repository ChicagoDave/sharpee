# Sharpee Architecture Decisions - Batch 31

## File: 2025-05-25-13-31-42.json
**Topic**: Resolving Missing Module Error in IF Parser Test

### Decision: Workspace Configuration Issue

**Context**: Test failing with "Cannot find module '@sharpee/lang-en-us'" error.

**Decision**: 
Identified that the `lang-en-us` package was not included in the workspace configuration, causing import failures in tests.

**Fixes Applied**:
1. Added `packages/lang-en-us` to workspaces array in package.json
2. Added TypeScript path mappings for `@sharpee/lang-en-us`
3. Updated Jest configuration with moduleNameMapping
4. Fixed imports to use relative paths as temporary solution

**Rationale**: Proper workspace configuration is essential for monorepo package resolution.

### Decision: Language Parser Provider Architecture

**Context**: Review of the English parser provider implementation.

**Decision**: 
The English parser provider implements the `LanguageParserProvider` interface with:
- `getParserConfig()` - Returns parser configuration including articles, pronouns, directions, scoring
- `getGrammarPatterns()` - Returns language-specific grammar patterns
- `getSynonyms()` - Provides word synonym mappings

**Rationale**: This design allows language-specific parsing rules while maintaining a common interface.

### Decision: IF Parser Grammar Patterns

**Context**: The IF parser needs comprehensive grammar patterns for various commands.

**Decision**: 
Implemented extensive grammar patterns including:
- **Conversation**: ask about, tell about, say to
- **Object manipulation**: take from, put on, unlock with
- **Movement**: enter, exit, climb
- **Sensory**: listen, smell, taste
- **Container operations**: search, empty
- **Meta commands**: save, restore, quit, help

**Rationale**: Comprehensive patterns provide a rich command vocabulary for IF games.

### Decision: Parser Test Strategy

**Context**: Tests trying to import from unbuilt package.

**Decision**: 
Multiple approaches considered:
1. Build the lang-en-us package before testing
2. Use relative imports (temporary fix chosen)
3. Create mock provider for testing

**Rationale**: Relative imports provide immediate fix while proper build pipeline is established.

### Decision: Scoring Configuration

**Context**: Parser needs to score entity matches for disambiguation.

**Decision**: 
Implemented scoring system with weights:
- exactMatch: 100
- partialMatch: 50
- synonymMatch: 75
- adjectiveMatch: 25
- visibleBonus: 20
- reachableBonus: 30
- recentlyMentionedBonus: 40
- pronounPenalty: -20

**Rationale**: Weighted scoring allows intelligent disambiguation based on context and match quality.

### Decision: Synonym System

**Context**: Natural language requires understanding word synonyms.

**Decision**: 
Implemented synonym groups for:
- Objects (container/box/crate, door/entrance/exit)
- Materials (gold/golden, wood/wooden)
- Sizes (small/tiny/little, large/big/huge)
- States (open/opened, closed/shut, lit/burning)

**Rationale**: Synonym support makes the parser more flexible and natural for players.

## Technical Issues Resolved

1. **Missing package in workspace** - Added to workspace configuration
2. **TypeScript path resolution** - Added path mappings
3. **Jest module resolution** - Updated Jest config (with formatting issues)
4. **Import path issues** - Used relative imports as workaround

## Recommendations

The comprehensive solution involved:
1. Update workspace configuration
2. Add TypeScript path mappings
3. Configure Jest module name mapping
4. Build lang-en-us package
5. Run tests with proper linking

This highlights the complexity of monorepo setup and the importance of proper build pipelines.

## Next Review File
- [ ] 2025-05-25-13-40-51.json
