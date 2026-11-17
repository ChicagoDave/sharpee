# Story Index Refactoring Analysis

## Overview

`stories/dungeo/src/index.ts` is ~2460 lines containing the entire DUNGEON story implementation. This document analyzes what could be extracted vs what must remain DUNGEON-specific.

**Related**: ADR-108 (Player Character System) defines the architecture for player creation and switching.

## Current Structure (After Phase 3)

| Section | Lines | Description |
|---------|-------|-------------|
| Imports | ~70 | Dependencies from engine, stdlib, regions, NPCs |
| Config | ~12 | StoryConfig definition |
| Class declaration | ~25 | DungeoStory class with region ID fields |
| `initializeWorld()` | ~240 | Room creation, connections, objects, handlers |
| `initializeMirrorRoomHandler()` | ~40 | Mirror puzzle setup (private) |
| `createPlayer()` | ~75 | Player entity creation |
| `extendParser()` | **3 lines** | Delegates to `grammar/` modules |
| `extendLanguage()` | **3 lines** | Delegates to `messages/` modules |
| `getCustomActions()` | ~3 | Returns action array |
| `initialize()` | ~3 | Empty |
| `isComplete()` | ~3 | Returns false |
| `onEngineReady()` | **~25 lines** | Delegates to `orchestration/` modules |

**Total**: ~595 lines (down from ~2460, 76% reduction)

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

### 5. Engine Ready Handlers (~270 lines) → Extracted to `orchestration/`

Command transformers, scheduler registrations, NPC registrations, event handlers. This orchestration ties story-specific systems together.

**Extracted to** `src/orchestration/`:
```
src/orchestration/
├── index.ts                  # Config types + initializeOrchestration()
├── command-transformers.ts   # GDT, puzzles, death, movement restrictions
├── scheduler-setup.ts        # Daemons, fuses, timed events
├── puzzle-handlers.ts        # Laser puzzle, Inside Mirror
├── npc-setup.ts              # Thief, Cyclops, Troll, Dungeon Master
└── event-handlers.ts         # Scoring, achievements, death penalty
```

Then `onEngineReady()` becomes:
```typescript
onEngineReady(engine: GameEngine): void {
  initializeOrchestration(engine, this.world, {
    whiteHouseIds: this.whiteHouseIds,
    // ... all region IDs ...
  }, this.scoringProcessor, this.scoringService);
}
```

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

### Phase 2: Split Messages (Story Change) ✅ COMPLETE

Messages extracted to `src/messages/` folder (2026-01-21):

| File | Lines | Content |
|------|-------|---------|
| `index.ts` | 50 | Exports + `registerAllMessages()` |
| `npc-messages.ts` | 180 | Troll, Thief, Cyclops, Robot, Dungeon Master |
| `scheduler-messages.ts` | 120 | Lantern, candles, dam, flooding, balloon |
| `action-messages.ts` | 350 | SAY, RING, BREAK, BURN, WAVE, DIG, POUR, etc. |
| `puzzle-messages.ts` | 130 | Royal puzzle, mirror, exorcism, laser, endgame |
| `object-messages.ts` | 80 | Window, rug, trophy case, glacier, boat |
| **Total** | 910 | |

**Result**: `extendLanguage()` reduced from ~630 lines to 3 lines:
```typescript
extendLanguage(language: LanguageProvider): void {
  registerAllMessages(language);
}
```

### Phase 3: Split Orchestration (Story Change) ✅ COMPLETE

Engine orchestration extracted to `src/orchestration/` folder (2026-01-21):

| File | Lines | Content |
|------|-------|---------|
| `index.ts` | 120 | Config types + `initializeOrchestration()` |
| `command-transformers.ts` | 100 | GDT, puzzles, death, movement restrictions |
| `scheduler-setup.ts` | 120 | Daemons, fuses, bat, exorcism, troll recovery |
| `puzzle-handlers.ts` | 45 | Laser puzzle, Inside Mirror |
| `npc-setup.ts` | 55 | Thief, Cyclops, Troll, Dungeon Master |
| `event-handlers.ts` | 110 | Scoring, achievements, death penalty |
| **Total** | 550 | |

**Result**: `onEngineReady()` reduced from ~270 lines to ~25 lines:
```typescript
onEngineReady(engine: GameEngine): void {
  initializeOrchestration(engine, this.world, { ... }, scoringProcessor, scoringService);
}
```

### Phase 4: Implement ADR-108 Player Factory (Platform Change)

Implement `createDefaultPlayer()` in stdlib per ADR-108:
- `PlayerTrait` with name, description, pronouns, isPlayerControlled
- Pronoun presets (secondPerson, thirdPersonFeminine, etc.)
- Factory function with sensible defaults
- `world.setCurrentPlayer()` / `getCurrentPlayer()` methods

### Phase 5: Update DUNGEON to Use Player Factory

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

### After Phase 2 (actual):

| File | Before | After |
|------|--------|-------|
| `index.ts` | 1468 lines | ~840 lines |
| `grammar/*.ts` (8 files) | 1208 lines | 1208 lines |
| `messages/*.ts` (6 files) | N/A | 910 lines total |
| **Total** | 2676 lines | ~2958 lines |

### After Phase 3 (actual):

| File | Before | After |
|------|--------|-------|
| `index.ts` | ~840 lines | ~595 lines |
| `grammar/*.ts` (8 files) | 1208 lines | 1208 lines |
| `messages/*.ts` (6 files) | 910 lines | 910 lines |
| `orchestration/*.ts` (6 files) | N/A | 550 lines total |
| **Total** | ~2958 lines | ~3263 lines |

Line count increases due to boilerplate, but code is now:
- **Organized by feature** - easier to find/modify specific grammar, messages, or orchestration
- **Navigable** - index.ts becomes a readable ~600 line orchestration file
- **Testable in isolation** - each module can have unit tests
- **Template for future stories** - establishes canonical Sharpee story structure

## Priority

1. **Phase 1 (Grammar split)**: ✅ COMPLETE (2026-01-21)
2. **Phase 2 (Messages split)**: ✅ COMPLETE (2026-01-21)
3. **Phase 3 (Orchestration split)**: ✅ COMPLETE (2026-01-21) - Validated with build + transcript tests
4. **Phase 4 (ADR-108 Player Factory)**: Medium - Platform change, benefits all stories
5. **Phase 5 (Use Player Factory)**: Low - After platform work complete

## Notes

- ~~Grammar split can be done incrementally (one feature at a time)~~ ✅ Done
- ~~Messages split is straightforward - just moving `addMessage()` calls~~ ✅ Done
- ~~Orchestration split requires importing region types for type compatibility~~ ✅ Done
- **Lesson learned (Phase 2)**: When extracting messages, check for duplicates across modules (e.g., `TrollMessages` vs `TrollCapabilityMessages` vs `DungeoSchedulerMessages`)
- **Lesson learned (Phase 3)**: Use actual region types (e.g., `ForestRoomIds`) in config interfaces for type safety rather than generic `Record<string, string>`
- ADR-108 implementation unlocks multi-protagonist stories (Reflections)
- Player factory is optional for DUNGEON but enables future flexibility

## Canonical Story Structure

Phases 1-3 establish the **canonical Sharpee story template**:

```
stories/{story}/src/
├── index.ts              # Story class, config, lifecycle (~600 lines)
├── grammar/              # Parser extensions (Phase 1)
│   ├── index.ts          # registerAllGrammar()
│   └── *.ts              # Feature-specific patterns
├── messages/             # Language extensions (Phase 2)
│   ├── index.ts          # registerAllMessages()
│   └── *.ts              # Feature-specific messages
├── orchestration/        # Engine registrations (Phase 3)
│   ├── index.ts          # initializeOrchestration()
│   ├── command-transformers.ts
│   ├── scheduler-setup.ts
│   ├── puzzle-handlers.ts
│   ├── npc-setup.ts
│   └── event-handlers.ts
├── regions/              # Room definitions by area
├── npcs/                 # NPC entities and behaviors
├── actions/              # Story-specific actions
├── handlers/             # Event handlers, puzzle logic
└── scheduler/            # Daemon/fuse definitions
```

New stories can follow this structure for consistent organization.

## Related

- **ADR-108**: Player Character System - defines player creation architecture
- **ADR-070**: NPC System - PC↔NPC transitions for multi-protagonist
