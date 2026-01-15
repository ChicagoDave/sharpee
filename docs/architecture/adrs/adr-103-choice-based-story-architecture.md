# ADR-103: Choice-Based Story Architecture

## Status

Proposed

## Context

While Sharpee is primarily a parser IF platform, choice-based interactive fiction (CYOA-style) shares underlying needs: state management, branching logic, and player agency. Authors may choose to write choice-based stories without requiring players to type commands.

Existing tools like Twine have low barriers to entry but suffer at scale:

- **State spaghetti**: Flag management becomes chaotic in large stories
- **Manual testing**: Authors click through every branch to verify
- **No static analysis**: Unreachable passages, unused flags, dead ends go undetected
- **Refactoring risk**: Renaming passages or variables requires find/replace and hope
- **No type safety**: Typos in flag names cause runtime surprises
- **Poor debugging**: "Why didn't that choice appear?" is hard to answer
- **No composition**: Every author reinvents inventory, relationships, etc.

Sharpee can offer **narrative as code**: type-safe authoring, automated testing, static analysis, and reusable mechanics.

## Decision

### Two Modes: Narrative and Simulation

Choice-based stories operate in one of two modes:

| | Narrative Mode | Simulation Mode |
|---|----------------|-----------------|
| **Use case** | Pure branching narrative | Dungeon crawl with choices |
| **State** | Typed flags and counters | Full WorldModel |
| **Location** | Current passage ID | Player entity location |
| **Inventory** | `flags.hasKey` | Entity containment |
| **Transitions** | `goTo: passageId` | `action: "go north"` |

Authors choose their mode. Hybrid is possible (narrative passages + world simulation).

### Narrative State Model

```typescript
// Story defines its flag and counter types
interface MyStoryState extends NarrativeState {
  flags: {
    hasKey: boolean;
    metWizard: boolean;
    betrayedKing: boolean;
    doorUnlocked: boolean;
  };
  counters: {
    trust: number;
    gold: number;
    health: number;
  };
}

// Base interface provided by Sharpee
interface NarrativeState {
  currentPassage: PassageId;
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  visited: Set<PassageId>;
}
```

Type safety catches errors at compile time:

```typescript
// Error: 'hasKye' does not exist on type flags
if (state.flags.hasKye) { ... }
```

### Passage Definition

```typescript
interface Passage<S extends NarrativeState = NarrativeState> {
  id: PassageId;
  text: string | ((state: S) => string);
  choices: Choice<S>[];
  onEnter?: (state: S) => void;
  tags?: string[];  // for analysis grouping
}

interface Choice<S extends NarrativeState = NarrativeState> {
  phrase: string | ((state: S) => string);
  goTo: PassageId;
  condition?: (state: S) => boolean;
  effects?: (state: S) => void;
}
```

### Example Story

```typescript
import { defineNarrativeStory, passage } from '@sharpee/narrative';

interface ForestState extends NarrativeState {
  flags: {
    hasLantern: boolean;
    searchedUndergrowth: boolean;
    lanternLit: boolean;
  };
  counters: {
    courage: number;
  };
}

export const story = defineNarrativeStory<ForestState>({
  id: 'dark-forest',
  title: 'The Dark Forest',

  initialState: {
    flags: {
      hasLantern: false,
      searchedUndergrowth: false,
      lanternLit: false,
    },
    counters: {
      courage: 0,
    },
  },

  startPassage: 'crossroads',

  passages: [
    passage('crossroads', {
      text: 'You stand at a crossroads beneath a gray sky.',
      choices: [
        { phrase: "Take the forest path", goTo: 'forest_edge' },
        { phrase: "Visit the village", goTo: 'village_gate' },
      ],
    }),

    passage('forest_edge', {
      text: (s) => s.flags.lanternLit
        ? 'Your lantern casts dancing shadows among the trees.'
        : 'Darkness pools between the ancient oaks.',
      choices: [
        {
          phrase: "Light your lantern",
          goTo: 'forest_edge',
          condition: (s) => s.flags.hasLantern && !s.flags.lanternLit,
          effects: (s) => { s.flags.lanternLit = true; },
        },
        {
          phrase: "Press onward",
          goTo: 'deep_forest',
          condition: (s) => s.flags.lanternLit || s.counters.courage >= 3,
        },
        {
          phrase: "Search the undergrowth",
          goTo: 'found_lantern',
          condition: (s) => !s.flags.searchedUndergrowth,
        },
        { phrase: "Turn back", goTo: 'crossroads' },
      ],
    }),

    passage('found_lantern', {
      text: 'Beneath a rotting log, you find an old lantern.',
      onEnter: (s) => { s.flags.searchedUndergrowth = true; },
      choices: [
        {
          phrase: "Take it",
          goTo: 'forest_edge',
          effects: (s) => { s.flags.hasLantern = true; },
        },
        { phrase: "Leave it", goTo: 'forest_edge' },
      ],
    }),

    passage('deep_forest', {
      text: 'The trees close in around you...',
      choices: [
        // ...
      ],
    }),
  ],
});
```

### Automated Testing

Narrative tests use a transcript-like format:

```
# tests/lantern-path.narrative-test

# Test: Player finds and uses lantern to proceed

> start
@ crossroads

> "Take the forest path"
@ forest_edge
? !hasLantern
? !lanternLit

> "Search the undergrowth"
@ found_lantern

> "Take it"
@ forest_edge
? hasLantern
? searchedUndergrowth

> "Light your lantern"
@ forest_edge
? lanternLit

> "Press onward"
@ deep_forest
```

Test syntax:

| Syntax | Meaning |
|--------|---------|
| `> "choice text"` | Select choice with this phrase |
| `@ passage_id` | Assert current passage |
| `? flagName` | Assert flag is true |
| `? !flagName` | Assert flag is false |
| `? counter >= N` | Assert counter value |
| `# comment` | Ignored |

Run tests:

```bash
$ sharpee test-narrative stories/dark-forest

Running 12 narrative tests...
  ✓ lantern-path.narrative-test (5 steps)
  ✓ courage-path.narrative-test (8 steps)
  ✓ village-betrayal.narrative-test (12 steps)
  ✗ secret-ending.narrative-test
    Step 4: Expected @ hidden_cave, got @ forest_edge
    Choice "Find the hidden path" not available
    State: { hasMap: false, ... }

11/12 tests passed
```

### Static Analysis

Analyze story structure at build time:

```bash
$ sharpee analyze stories/dark-forest

Passages: 24
Choices: 67
Flags: 12
Counters: 3

WARNINGS:

  Unreachable passages (no incoming paths):
    - secret_ending_2
    - unused_passage

  Dead ends (no outgoing choices):
    - forgotten_cave
    - bad_ending_3 (intentional? add 'ending' tag to suppress)

  Unused flags:
    - 'foundMap' is set in found_map but never checked

  Impossible conditions:
    - deep_forest: choice "Use magic" requires hasMagic
      but hasMagic is never set to true

  Circular paths without state change:
    - crossroads -> forest_edge -> crossroads
      (may cause player confusion)

FLAG DEPENDENCY GRAPH:

  hasLantern:
    Set in: found_lantern (choice: "Take it")
    Checked in: forest_edge (2 choices), dark_cave (1 choice)

  courage >= 3:
    Incremented in: brave_act, helped_stranger, faced_fear
    Checked in: forest_edge, final_confrontation

COVERAGE ANALYSIS:

  Passages reachable from start: 22/24 (91.7%)
  Flags exercised by tests: 10/12 (83.3%)
  Choice paths covered by tests: 45/67 (67.2%)

  Untested paths:
    - village_gate -> "Bribe the guard" -> inside_village
    - dark_cave -> "Light torch" -> revealed_treasure
```

### Reachability Queries

```bash
$ sharpee reach stories/dark-forest --from start --to secret_ending

Shortest path (4 steps):
  start -> crossroads
  "Take the forest path" -> forest_edge
  "Search the undergrowth" -> found_lantern
  "Take it" -> forest_edge
  "Press onward" -> deep_forest
  ... (requires: lanternLit OR courage >= 3)

All paths to secret_ending: 3 found
  Path 1: 6 steps (via lantern)
  Path 2: 8 steps (via courage)
  Path 3: 12 steps (via village betrayal)
```

### State Debugging

Interactive debugging to understand choice availability:

```bash
$ sharpee debug stories/dark-forest --interactive

[crossroads] > "Take the forest path"
[forest_edge]

State: { hasLantern: false, lanternLit: false, courage: 1 }

Available choices:
  ✓ "Search the undergrowth"
  ✗ "Press onward"
  ✗ "Light your lantern"
  ✓ "Turn back"

> :why "Press onward"
Condition: (s) => s.flags.lanternLit || s.counters.courage >= 3
Current values:
  lanternLit = false (need: true)
  courage = 1 (need: >= 3)
Resolution: Set lanternLit OR increase courage by 2

> :set courage 3
courage = 3

> :choices
Available choices:
  ✓ "Search the undergrowth"
  ✓ "Press onward"          <- now available
  ✗ "Light your lantern"
  ✓ "Turn back"
```

### Reusable Mechanics (Future)

Package common narrative patterns:

```typescript
import { InventoryMechanic } from '@sharpee/narrative-inventory';
import { RelationshipMechanic } from '@sharpee/narrative-relationships';

export const story = defineNarrativeStory({
  // ...
  mechanics: [
    InventoryMechanic({
      maxItems: 5,
      itemChoiceText: (item) => `Use ${item}`,
    }),
    RelationshipMechanic({
      characters: ['wizard', 'king', 'thief'],
      scale: [-100, 100],
    }),
  ],
});

// Adds to state:
// state.inventory: string[]
// state.relationships: { wizard: number, king: number, thief: number }

// Adds standard choices:
// "Check inventory" (shows items)
// "Drop [item]" (when holding items)
```

### Simulation Mode

For dungeon crawls with choice presentation, stories use the full world model:

```typescript
export const story = defineSimulationStory({
  id: 'choice-dungeon',
  title: 'Dungeon of Choices',
  mode: 'choice-simulation',

  initializeWorld(world: WorldModel) {
    // Same as parser IF - create rooms, objects, NPCs
  },

  choiceProvider: new DungeonChoiceProvider(),
});

class DungeonChoiceProvider implements ChoiceProvider {
  getChoices(world: WorldModel, locationId: EntityId): Choice[] {
    const choices: Choice[] = [];

    // Generate from exits
    for (const exit of getExits(world, locationId)) {
      choices.push({
        phrase: `Go ${exit.direction}`,
        action: `go ${exit.direction}`,
      });
    }

    // Generate from visible objects
    for (const obj of getVisibleObjects(world, locationId)) {
      choices.push({
        phrase: `Examine the ${obj.name}`,
        action: `examine ${obj.name}`,
      });
      if (isPortable(obj)) {
        choices.push({
          phrase: `Take the ${obj.name}`,
          action: `take ${obj.name}`,
        });
      }
    }

    return choices;
  }
}
```

Simulation mode reuses parser for action resolution, enabling the same testing infrastructure.

## Consequences

### Positive

- Type safety catches flag typos at compile time
- Automated testing enables CI/CD for narrative
- Static analysis finds structural problems before players do
- Debugging tools explain "why can't I choose this?"
- Reusable mechanics reduce boilerplate
- Same testing patterns as parser IF (transcripts)
- Version control friendly (TypeScript files diff cleanly)

### Negative

- Higher barrier to entry than Twine (requires TypeScript)
- No visual passage editor (code-first approach)
- Authors must learn Sharpee's patterns

### Neutral

- Two modes (narrative/simulation) adds concepts but enables flexibility
- Analysis tooling requires investment to build

## Future Work

- Visual passage graph generator (from code, not as authoring tool)
- IDE integration (hover to see flag dependencies, go-to-passage)
- Coverage reporting in CI
- Narrative-specific language layer (for localization)
- Mechanic packages (inventory, relationships, time, etc.)

## References

- Twine (visual choice-based IF)
- Ink (Inkle's narrative scripting language)
- ADR-073: Transcript Testing
- ADR-102: Dialogue Extension Architecture
