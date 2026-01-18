# Session Summary: 2026-01-18 - dungeo

## Status: Completed

## Goals
- Fix ISSUE-007: Template placeholder {are} not resolved in inventory messages
- Fix ISSUE-008: Disambiguation doesn't list candidate options

## Completed

### ISSUE-007: Template Placeholder Resolution

**Problem**: Inventory command showed "You {are} carrying:" instead of "You are carrying:"

**Root Cause**: Templates used conjugated form `{are}` but TextService's placeholder resolver only recognizes base verb forms like `{be}` for conjugation.

**Solution**: Changed all 6 occurrences of `{are}` to `{be}` in inventory message templates:
- `inventory.empty` - "You {be} empty-handed."
- `inventory.carrying` - "You {be} carrying:"
- `inventory.wearing` - "You {be} wearing:"
- `inventory.score` - "Your score {be} ..."

**Files Modified**:
- `packages/lang-en-us/src/actions/inventory.ts` - Changed 6 template placeholders

**Test Coverage**:
- Created `stories/dungeo/tests/transcripts/inventory-message.transcript` - Verifies "You are carrying:" appears correctly

### ISSUE-008: Disambiguation Options Not Listed

**Problem**: Ambiguous commands showed "Which do you mean?" without listing the candidate entities.

**Root Cause**: CommandExecutor threw generic Error on validation failure, losing structured candidate data. TextService only saw error string and couldn't extract candidates.

**Solution**: Implemented full platform events flow per `docs/design/disambiguation-via-platform-events.md`:

1. **CommandExecutor** (Phase 1):
   - Detects `AMBIGUOUS_ENTITY` validation error
   - Emits `client.query` event with `QuerySource.DISAMBIGUATION`
   - Includes structured candidates array: `[{id, name, description}]`
   - Returns early with `needsInput: true` flag instead of throwing

2. **TextService** (Phase 2):
   - New `handleClientQuery()` method handles `client.query` events
   - New `formatCandidateList()` formats candidates as natural language:
     - 2 items: "the X or the Y"
     - 3+ items: "the X, the Y, or the Z"
   - Resolves message template with `{options}` placeholder

3. **Language Provider** (Phase 3):
   - Added `core.disambiguation_prompt` message: "Which do you mean: {options}?"

4. **Type System**:
   - Added `needsInput?: boolean` flag to `TurnResult` type
   - Signals client to wait for additional user input

**Files Modified**:
- `packages/engine/src/command-executor.ts` - Emit client.query for AMBIGUOUS_ENTITY
- `packages/engine/src/types.ts` - Add needsInput flag to TurnResult
- `packages/text-service/src/text-service.ts` - Add handleClientQuery() and formatCandidateList()
- `packages/lang-en-us/src/language-provider.ts` - Add disambiguation_prompt message

**Test Coverage**:
- Created `stories/dungeo/tests/transcripts/disambiguation.transcript` - Uses GDT to get both skeleton key and small key, then "drop key" triggers: "Which do you mean: the small key or the skeleton key?"

**Documentation**:
- Created `docs/work/disambiguate/implementation-plan.md` - Full 4-phase implementation plan with code examples

## Key Decisions

### 1. Use Base Verb Forms in Templates

**Decision**: All template placeholders must use base verb forms (`{be}`, `{have}`, `{go}`) not conjugated forms (`{are}`, `{has}`, `{goes}`).

**Rationale**: TextService's placeholder resolver conjugates base forms based on grammatical person/number. Using pre-conjugated forms bypasses this system and breaks when perspective changes (first/second/third person).

**Implications**:
- All existing templates need auditing for conjugated forms
- Template authors must use base forms
- Documentation should clarify this requirement

### 2. Platform Events Flow for Disambiguation

**Decision**: Use `client.query` events instead of throwing errors or emitting `command.failed` events.

**Rationale**:
- Preserves structured candidate data through event system
- Allows TextService to format options naturally
- Follows existing platform event patterns (QuerySource, QueryType enums)
- Enables future interactive disambiguation (player selects from numbered list)

**Implications**:
- CommandExecutor doesn't throw on AMBIGUOUS_ENTITY
- Returns early with `needsInput: true` flag
- Client must handle disambiguation flow (not yet implemented)
- Query state management needed for full interactive flow

### 3. Natural Language Candidate Formatting

**Decision**: Format candidates as comma-separated list with "or" before final item: "the X, the Y, or the Z"

**Rationale**:
- More natural than numbered lists for 2-3 candidates
- Matches traditional IF disambiguation style
- Works with current linear output model
- Extensible to interactive selection later

**Implications**:
- TextService owns formatting logic (language-specific)
- Message templates use `{options}` placeholder
- Future: Could support both styles (natural vs numbered)

## Open Items

### Short Term
- None - both issues resolved and tests passing

### Long Term
- **Interactive Disambiguation**: Implement full query/response flow where player can select by number, name, or distinguishing adjective
- **Query State Management**: Track pending queries in engine for multi-turn interactions
- **Template Audit**: Search codebase for other conjugated forms in templates (`{has}`, `{goes}`, etc.)
- **Contextual Descriptions**: Show location hints in disambiguation: "the key (carried)" vs "the key (on table)"

## Files Modified

**Engine** (2 files):
- `packages/engine/src/command-executor.ts` - Emit client.query for AMBIGUOUS_ENTITY, return early with needsInput flag
- `packages/engine/src/types.ts` - Add needsInput?: boolean to TurnResult type

**Text Service** (1 file):
- `packages/text-service/src/text-service.ts` - Add handleClientQuery(), formatCandidateList(), register handler

**Language Layer** (2 files):
- `packages/lang-en-us/src/actions/inventory.ts` - Change 6 occurrences of {are} to {be}
- `packages/lang-en-us/src/language-provider.ts` - Add core.disambiguation_prompt message

**Tests** (2 files):
- `stories/dungeo/tests/transcripts/inventory-message.transcript` - New test for ISSUE-007
- `stories/dungeo/tests/transcripts/disambiguation.transcript` - New test for ISSUE-008

**Documentation** (3 files):
- `docs/work/disambiguate/implementation-plan.md` - New implementation plan
- `docs/work/issues/issues-list.md` - Updated with resolution notes
- `docs/context/.work-log.txt` - Updated issue tracking

## Architectural Notes

### Event System for User Interaction

This implementation demonstrates how Sharpee's event system handles user interaction patterns:

1. **Validation errors** can be semantic (need more info) not just failures
2. **client.query events** carry structured data through TextService to client
3. **TurnResult.needsInput flag** signals client to await additional input
4. **Language layer** owns all formatting (candidate lists, error messages)

This pattern extends to other interactive scenarios:
- Yes/no confirmations (restart, restore)
- Menu selections (GDT commands, help topics)
- Multi-word inputs (SAY, INCANT)

### Template Placeholder System

The placeholder system conjugates verbs based on grammatical context:

```typescript
// Template: "You {be} carrying:"
// First person → "You are carrying:"
// Third person → "He is carrying:"

// Template: "You {have} {items}"
// First person → "You have a key"
// Third person → "She has a key"
```

**Key insight**: Templates are data, not code. The resolver applies linguistic rules at render time based on perspective, tense, and number.

### Capability Dispatch vs Event Handling

Disambiguation demonstrates when NOT to use capability dispatch:
- **Not capability-based**: AMBIGUOUS_ENTITY is a parser/validation concern, not entity behavior
- **Not action-specific**: Any command with ambiguous entity references triggers this
- **Event-driven**: TextService handles generic `client.query` events for all query types

Contrast with entity-specific behaviors (LOWER basket vs LOWER mirror-pole) which DO use capability dispatch.

## Notes

**Session duration**: ~2 hours

**Approach**:
- Started with ISSUE-007 (simpler template fix)
- Moved to ISSUE-008 (platform event flow implementation)
- Followed existing implementation plan from design doc
- Created comprehensive tests for both issues
- All changes committed and merged to main branch

**Build Process**:
- Used `./scripts/build-all-dungeo.sh --skip engine` for incremental builds
- Used `./scripts/fast-transcript-test.sh` for rapid test iteration
- All transcript tests passing

**Commit Hash**: a0ff83f9eba5671ff50e71795bf763b9663cda31

---

**Progressive update**: Session completed 2026-01-18 01:37
