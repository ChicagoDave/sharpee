# Work Summary: ADR-089 Phase B - Pronoun Context in Parser

**Date**: 2026-01-05 12:30
**Duration**: ~45 minutes
**Feature/Area**: Parser, Pronoun Resolution
**Branch**: identity

## Objective

Implement ADR-089 Phase B - Create PronounContext in parser for "it", "him", "her", "them" resolution.

## What Was Accomplished

### 1. Created pronoun-context.ts Module

New file: `packages/parser-en-us/src/pronoun-context.ts`

**Interfaces:**
- `EntityReference` - Tracks entity ID, text, and turn number
- `PronounContext` - Holds `it`, `them`, `animateByPronoun` Map, `lastCommand`

**Constants:**
- `RECOGNIZED_PRONOUNS` - Array of supported pronouns (it, them, him, her, xem, zir, hir, em, faer)
- `INANIMATE_IT` / `INANIMATE_THEM` - PronounSet constants for objects without ActorTrait

**Functions:**
- `isRecognizedPronoun()` - Check if a word is a pronoun
- `setPronounContextManager()` / `getPronounContextManager()` - Module-level accessor for slot consumers

**PronounContextManager class:**
- `resolve(pronoun)` - Resolve pronoun to EntityReference(s)
- `updateFromCommand(command, world, turnNumber)` - Update context after successful parse
- `registerEntity(entityId, text, world, turnNumber)` - Manual entity registration
- `reset()` - Clear all pronoun references
- `getLastCommand()` - For "again"/"g" support

### 2. Updated EntitySlotConsumer for Pronoun Resolution

Modified: `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts`

- Added check for pronouns before standard entity resolution
- New `tryResolvePronoun()` method uses PronounContextManager
- If pronoun resolves → returns SlotMatch with entityId and text from original reference
- If pronoun doesn't resolve → falls through to standard entity resolution
- Handles both single entity (it, him, her) and multiple (them for lists)

### 3. Wired PronounContext into EnglishParser

Modified: `packages/parser-en-us/src/english-parser.ts`

**New property:**
- `pronounContext: PronounContextManager` - Owned by parser instance

**New methods:**
- `updatePronounContext(command, turnNumber)` - Called after successful parse
- `registerPronounEntity(entityId, text, turnNumber)` - Manual registration
- `resetPronounContext()` - Called on game restart
- `getLastCommand()` - For "again" support
- `getPronounContextManager()` - For testing/debugging

### 4. Updated Parser Exports

Modified: `packages/parser-en-us/src/index.ts`

Exports:
- Types: `EntityReference`, `PronounContext`, `RecognizedPronoun`
- Values: `PronounContextManager`, `isRecognizedPronoun`, `RECOGNIZED_PRONOUNS`, `INANIMATE_IT`, `INANIMATE_THEM`

### 5. Added Tests

New file: `packages/parser-en-us/tests/pronoun-context.test.ts`

19 tests covering:
- `isRecognizedPronoun()` - Standard pronouns, neopronouns, case-insensitivity
- `INANIMATE_IT/THEM` constants
- `PronounContextManager.resolve()` - All pronoun types
- `PronounContextManager.reset()`
- `PronounContextManager.registerEntity()` - Inanimate, actors, multiple pronoun sets
- Last command storage for "again" support

## Files Changed

- `packages/parser-en-us/src/pronoun-context.ts` (new, ~380 lines)
- `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` (+80 lines)
- `packages/parser-en-us/src/english-parser.ts` (+55 lines)
- `packages/parser-en-us/src/index.ts` (+10 lines)
- `packages/parser-en-us/tests/pronoun-context.test.ts` (new, ~280 lines)

## Design Decisions

1. **Module-level accessor pattern** - Used `setPronounContextManager()` / `getPronounContextManager()` to avoid modifying if-domain's GrammarContext (which would be a platform change requiring discussion).

2. **Fallthrough on unresolved pronouns** - If a pronoun can't be resolved (no context yet), the parser falls through to standard entity resolution. This handles edge cases gracefully.

3. **Extended SlotMatch properties** - Added `entityId`, `resolvedText`, `isPronoun` as extended properties using type intersection rather than modifying the if-domain SlotMatch interface.

4. **Plural "them" priority** - When resolving "them", inanimate plural takes priority over singular they/them animate. This matches classic IF behavior.

## Next Steps (ADR-089)

1. [ ] Phase C: NarrativeSettings (engine) - Story-level perspective configuration
2. [ ] Phase D: Message Placeholders (lang-en-us) - {You}, {take} placeholders
3. [ ] Phase E: Verb Conjugation - For 3rd person singular

## Integration Notes

For the engine to use pronoun resolution:
1. After successful command execution, call `parser.updatePronounContext(command, turnNumber)`
2. On game restart, call `parser.resetPronounContext()`
3. For "again" command, call `parser.getLastCommand()`

The pronoun context will then automatically resolve pronouns in subsequent commands.
