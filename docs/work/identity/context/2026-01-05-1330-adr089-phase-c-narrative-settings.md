# Work Summary: ADR-089 Phase C - NarrativeSettings in Engine

**Date**: 2026-01-05 13:30
**Duration**: ~30 minutes
**Feature/Area**: Engine, Narrative Settings, Pronoun Context Wiring
**Branch**: identity

## Objective

Implement ADR-089 Phase C - Add NarrativeSettings to the engine and wire pronoun context updates into command execution.

## What Was Accomplished

### 1. Created NarrativeSettings Module

New file: `packages/engine/src/narrative/narrative-settings.ts`

**Types:**
- `Perspective`: '1st' | '2nd' | '3rd'
- `Tense`: 'present' | 'past' (future consideration)
- `NarrativeSettings`: Full settings interface with perspective, playerPronouns, tense
- `NarrativeConfig`: Story-level config (subset that authors specify)

**Constants:**
- `DEFAULT_NARRATIVE_SETTINGS`: 2nd person present tense (Zork-style default)

**Functions:**
- `buildNarrativeSettings(config?)`: Build full settings from optional config

### 2. Added narrative Field to StoryConfig

Modified: `packages/engine/src/story.ts`

Stories can now specify narrative settings:
```typescript
export const storyConfig: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  // Optional - defaults to 2nd person if omitted
  narrative: {
    perspective: '1st',  // Anchorhead-style
  },
};
```

### 3. Wired NarrativeSettings into GameEngine

Modified: `packages/engine/src/game-engine.ts`

- Added `narrativeSettings: NarrativeSettings` property
- Initialize with defaults in constructor
- Read from story config in `setStory()`
- Added `getNarrativeSettings()` getter

### 4. Wired Pronoun Context Updates

Modified: `packages/engine/src/game-engine.ts`

**After successful command execution:**
```typescript
// In executeTurn(), after updateCommandHistory()
if (this.parser && 'updatePronounContext' in this.parser && result.parsedCommand) {
  (this.parser as any).updatePronounContext(result.parsedCommand, turn);
}
```

**On game restart:**
```typescript
// In processPlatformOperations(), RESTART_REQUESTED case
if (this.parser && 'resetPronounContext' in this.parser) {
  (this.parser as any).resetPronounContext();
}
```

**On save restore:**
```typescript
// In loadSaveData()
if (this.parser && 'resetPronounContext' in this.parser) {
  (this.parser as any).resetPronounContext();
}
```

### 5. Updated Engine Exports

Modified: `packages/engine/src/index.ts`

Added export for narrative module:
```typescript
export * from './narrative';
```

## Files Changed

- `packages/engine/src/narrative/narrative-settings.ts` (new, ~85 lines)
- `packages/engine/src/narrative/index.ts` (new, ~10 lines)
- `packages/engine/src/story.ts` (+15 lines)
- `packages/engine/src/game-engine.ts` (+25 lines)
- `packages/engine/src/index.ts` (+3 lines)

## Design Decisions

1. **Method existence check pattern** - Used `'methodName' in parser` pattern (already used elsewhere in game-engine.ts) rather than modifying the Parser interface in if-domain. This avoids platform changes requiring discussion.

2. **Reset on restore/restart** - Pronoun context is reset on save restore and game restart because old entity references may not be valid in the new state.

3. **Non-meta commands only** - Pronoun context is only updated for non-meta commands (like "look", "inventory" are meta). Meta commands don't advance turns or affect pronoun tracking.

## Next Steps (ADR-089)

1. [ ] Phase D: Message Placeholders (lang-en-us) - {You}, {take} placeholders
2. [ ] Phase E: Verb Conjugation - For 3rd person singular

## Integration Notes

Pronoun resolution now works end-to-end:

```
> take the brass lantern
Taken.

> examine it          ← "it" resolves to brass-lantern
The lamp is shiny.

> talk to alice
Alice waves.

> give her the key    ← "her" resolves to alice (if she uses she/her)
```

For 1st/3rd person narratives, stories now specify:
```typescript
// In story config
narrative: { perspective: '1st' }  // "I take the lamp"
narrative: { perspective: '3rd' }  // "She takes the lamp"
```

The text service (Phase D) will use `engine.getNarrativeSettings()` to resolve placeholders.
