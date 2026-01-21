# Story Index Refactoring Analysis

## Overview

`stories/dungeo/src/index.ts` is ~2460 lines containing the entire DUNGEON story implementation. This document analyzes what could be extracted vs what must remain DUNGEON-specific.

**Related**: ADR-108 (Player Character System) defines the architecture for player creation and switching.

## Current Structure (After Phase 1)

| Section | Lines | Description |
|---------|-------|-------------|
| Imports | 1-108 | Dependencies from engine, stdlib, regions, NPCs, grammar |
| Config | 110-122 | StoryConfig definition |
| Class declaration | 124-149 | DungeoStory class with region ID fields |
| `initializeWorld()` | 154-394 | Room creation, connections, objects, handlers |
| `initializeMirrorRoomHandler()` | 400-440 | Mirror puzzle setup (private) |
| `createPlayer()` | 445-521 | Player entity creation |
| `extendParser()` | 523-529 | **3 lines** - delegates to grammar modules |
| `extendLanguage()` | 531-1162 | Message registration (~630 lines) |
| `getCustomActions()` | 1167-1169 | Returns action array |
| `initialize()` | 1174-1176 | Empty |
| `isComplete()` | 1181-1184 | Returns false |
| `onEngineReady()` | 1190-1458 | Transformers, scheduler, NPCs, handlers (~270 lines) |

**Total**: 1468 lines (down from ~2460)

## Platform Infrastructure (ADR-108)

### Player Creation via Factory

ADR-108 defines `createDefaultPlayer()` in stdlib with `PlayerTrait`:

```typescript
// stdlib provides the factory
import { createDefaultPlayer, secondPersonPronouns } from '@sharpee/stdlib';

// DUNGEON uses it with customization
createPlayer(world: WorldModel): IFEntity {
  const player = createDefaultPlayer(world, {
    id: 'yourself',
    name: 'Adventurer',
    description: 'A brave adventurer, ready to explore the Great Underground Empire.',
    pronouns: secondPersonPronouns,
    startLocation: this.westOfHouseId,
  });

  // Add DUNGEON-specific traits
  player.add(new CombatantTrait({
    health: 100,
    maxHealth: 100,
    skill: 50,
    baseDamage: 1,
    armor: 0,
    hostile: false,
    canRetaliate: false
  }));

  return player;
}
```

**Benefits**:
- Default works out-of-the-box for simple stories
- Stories customize via options (name, pronouns, description)
- Stories add game-specific traits (combat, magic, etc.)
- Supports mid-game player switching (Reflections-style multi-protagonist)

### Scoring Infrastructure (Future Consideration)

Basic scoring setup is somewhat boilerplate but varies enough between games that extraction isn't prioritized. Current DUNGEON implementation:

```typescript
world.registerCapability(StandardCapabilities.SCORING, {
  initialData: {
    scoreValue: 0,
    maxScore: 616,
    moves: 0,
    deaths: 0,
    achievements: [],
    scoredTreasures: []
  }
});

this.scoringService = new DungeoScoringService(world);
this.scoringProcessor = new ScoringEventProcessor(this.scoringService, world)
  .enableDynamicTreasures('trophy case');
```

**Future**: A `ScoringConfig` pattern could be added to stdlib if multiple stories need similar scoring systems. Lower priority than player creation (ADR-108).

## DUNGEON-Specific (Must Remain)

### 1. Story Configuration

```typescript
export const config: StoryConfig = {
  id: "dungeon",
  title: "DUNGEON",
  author: "Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling",
  // ...
};
```

Every story defines its own config. Keep in story.

### 2. World Initialization

191 rooms across 15 regions, specific connections, object placements, puzzle initializations. Entirely game-specific.

### 3. Grammar Patterns (~1000 lines)

All puzzle-specific: GDT, SAY, RING, BREAK, BURN, PRAY, INCANT, LIFT, LOWER, PUSH, DIG, WIND, POUR, FILL, etc.

**Recommendation**: Split into separate files by feature:

```
src/grammar/
├── index.ts              # Re-exports all
├── gdt-grammar.ts        # GDT debugging commands
├── speech-grammar.ts     # SAY, ANSWER patterns
├── puzzle-grammar.ts     # PUSH WALL, SET DIAL, etc.
├── boat-grammar.ts       # INFLATE, DEFLATE, LAUNCH, BOARD
├── combat-grammar.ts     # DIAGNOSE, RING, BREAK
└── ...
```

Then `extendParser()` becomes:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  registerGDTGrammar(grammar);
  registerSpeechGrammar(grammar);
  registerPuzzleGrammar(grammar);
  registerBoatGrammar(grammar);
  // ...
}
```

### 4. Language Messages (~630 lines)

All game-specific messages. Same recommendation - split by feature:

```
src/messages/
├── index.ts              # Re-exports all
├── npc-messages.ts       # Thief, Cyclops, Troll, Robot, DM
├── puzzle-messages.ts    # Royal puzzle, mirror, laser, etc.
├── scheduler-messages.ts # Lantern, candles, dam, flooding
├── combat-messages.ts    # Death, diagnose, wounds
└── ...
```

Then `extendLanguage()` becomes:

```typescript
extendLanguage(language: LanguageProvider): void {
  registerNPCMessages(language);
  registerPuzzleMessages(language);
  registerSchedulerMessages(language);
  registerCombatMessages(language);
  // ...
}
```

### 5. Engine Ready Handlers (~270 lines)

Command transformers, scheduler registrations, NPC registrations, event handlers. This is orchestration that ties story-specific systems together. Keep in story but consider grouping registrations by subsystem.

## Recommended Refactoring Plan

### Phase 1: Split Grammar (Story Change) ✅ COMPLETE

Grammar patterns extracted to `src/grammar/` folder (2026-01-21):

| File | Lines | Content |
|------|-------|---------|
| `index.ts` | 54 | Exports + `registerAllGrammar()` |
| `gdt-grammar.ts` | 90 | GDT debug commands |
| `speech-grammar.ts` | 147 | SAY, COMMANDING, KNOCK, ANSWER |
| `puzzle-grammar.ts` | 462 | Walls, panels, poles, dials, machines, tiny room, dig, send |
| `ritual-grammar.ts` | 132 | BREAK, BURN, PRAY, INCANT, WAVE, RING, WIND |
| `liquid-grammar.ts` | 167 | POUR, FILL, LIGHT with tool, TIE, UNTIE |
| `boat-grammar.ts` | 103 | INFLATE, DEFLATE, BOARD, LAUNCH |
| `utility-grammar.ts` | 53 | DIAGNOSE, ROOM, RNAME, OBJECTS |
| **Total** | 1208 | |

**Result**: `extendParser()` reduced from ~1000 lines to 3 lines:
```typescript
extendParser(parser: Parser): void {
  registerAllGrammar(parser);
}
```

### Phase 2: Split Messages (Story Change)

Move messages to `src/messages/` folder:
- ~10 files organized by feature
- `index.ts` exports registration functions
- `extendLanguage()` imports and calls them

```
src/messages/
├── index.ts              # Re-exports all + registerAllMessages()
├── npc-messages.ts       # Thief, Cyclops, Troll, Robot, DM
├── puzzle-messages.ts    # Royal puzzle, mirror, laser, etc.
├── scheduler-messages.ts # Lantern, candles, dam, flooding
├── combat-messages.ts    # Death, diagnose, wounds
├── action-messages.ts    # Custom action result overrides
└── object-messages.ts    # Object-specific descriptions
```

### Phase 3: Implement ADR-108 Player Factory (Platform Change)

Implement `createDefaultPlayer()` in stdlib per ADR-108:
- `PlayerTrait` with name, description, pronouns, isPlayerControlled
- Pronoun presets (secondPerson, thirdPersonFeminine, etc.)
- Factory function with sensible defaults
- `world.setCurrentPlayer()` / `getCurrentPlayer()` methods

### Phase 4: Update DUNGEON to Use Player Factory

```typescript
// stories/dungeo/src/index.ts (after ADR-108 implementation)
import { createDefaultPlayer, secondPersonPronouns } from '@sharpee/stdlib';
import { registerAllGrammar } from './grammar';
import { registerAllMessages } from './messages';

export class DungeoStory implements Story {
  // ...

  createPlayer(world: WorldModel): IFEntity {
    const player = createDefaultPlayer(world, {
      id: 'yourself',
      name: 'Adventurer',
      description: 'A brave adventurer, ready to explore the Great Underground Empire.',
      pronouns: secondPersonPronouns,
      startLocation: this.westOfHouseId,
    });

    // DUNGEON-specific: combat system
    player.add(new CombatantTrait({ ... }));

    return player;
  }

  extendParser(parser: Parser): void {
    registerAllGrammar(parser.getStoryGrammar());
  }

  extendLanguage(language: LanguageProvider): void {
    registerAllMessages(language);
  }

  // ...
}
```

## File Size Impact

### After Phase 1 (actual):

| File | Before | After |
|------|--------|-------|
| `index.ts` | ~2460 lines | 1468 lines |
| `grammar/*.ts` (8 files) | N/A | 1208 lines total |
| **Subtotal** | ~2460 lines | 2676 lines |

### After Phase 2 (projected):

| File | Before | After |
|------|--------|-------|
| `index.ts` | 1468 lines | ~800 lines |
| `grammar/*.ts` | 1208 lines | 1208 lines |
| `messages/*.ts` (~6 files) | N/A | ~700 lines total |
| **Total** | 2676 lines | ~2700 lines |

Line count slightly increases due to boilerplate, but code is now:
- **Organized by feature** - easier to find/modify specific grammar or messages
- **Navigable** - index.ts becomes a readable orchestration file
- **Testable in isolation** - grammar and messages can have unit tests

## Priority

1. **Phase 1 (Grammar split)**: ✅ COMPLETE (2026-01-21)
2. **Phase 2 (Messages split)**: High - Story-only, straightforward extraction
3. **Phase 3 (ADR-108 Player Factory)**: Medium - Platform change, benefits all stories
4. **Phase 4 (Use Player Factory)**: Low - After platform work complete

## Notes

- Grammar split can be done incrementally (one feature at a time)
- Messages split is straightforward - just moving `addMessage()` calls
- ADR-108 implementation unlocks multi-protagonist stories (Reflections)
- Player factory is optional for DUNGEON but enables future flexibility

## Related

- **ADR-108**: Player Character System - defines player creation architecture
- **ADR-070**: NPC System - PC↔NPC transitions for multi-protagonist
