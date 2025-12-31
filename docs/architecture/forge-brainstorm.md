# Forge: Fluid Authoring Layer for Sharpee

**Status**: Brainstorm (pre-ADR)
**Date**: 2025-12-30

## Overview

Forge is a proposed high-level authoring layer that sits on top of stdlib. It should make common patterns easy while preserving access to the full power of stdlib when needed.

**Design Principle**: Forge is *optional sugar*, not a replacement. Authors who want fine control should reach down to stdlib. Forge compiles to stdlib calls.

## Insights from Dungeo Port

### What Works Well in stdlib (Keep As-Is)

- **Three-phase action pattern** (validate/execute/report) - Clean separation of concerns
- **Behaviors owning mutations** - Clear responsibility boundaries
- **Trait composition** - Flexible entity capabilities
- **Semantic events → language layer** - Proper i18n architecture
- **Region organization** - Natural grouping of related content

### Pain Points Forge Should Address

#### 1. Verbose Room Creation

**Current (stdlib)**:
```typescript
export function createLibrary(world: WorldModel): IFEntity {
  const room = world.createEntity('library');
  world.addTrait(room, 'Room');
  world.setProperty(room, 'name', 'Library');
  world.setProperty(room, 'description', 'Dust covers everything...');
  world.addBehavior(room, 'dark');
  return room;
}
```

**Proposed (Forge)**:
```typescript
Forge.room('library', {
  name: 'Library',
  description: 'Dust covers everything...',
  dark: true
});
```

#### 2. Tedious Connections

**Current**:
```typescript
world.setProperty(narrowLedge, 'exits', { east: 'library' });
world.setProperty(library, 'exits', { west: 'narrow-ledge' });
```

**Proposed**:
```typescript
Forge.connect(narrowLedge).east(library);  // Auto-reciprocal
// or
Forge.region('volcano', {
  connections: {
    'narrow-ledge': { east: 'library' },
    // west auto-generated
  }
});
```

#### 3. Object Archetypes

Common patterns that could be factory functions:

```typescript
// Treasures (takeable, has point values)
Forge.treasure('gold-coin', {
  name: 'gold coin',
  points: { take: 10, case: 5 },
  description: 'A shiny gold coin.'
});

// Containers
Forge.container('chest', {
  name: 'wooden chest',
  openable: true,
  lockable: true,
  keyId: 'brass-key',
  capacity: 5
});

// Light sources
Forge.lightSource('lantern', {
  name: 'brass lantern',
  fuel: 300,  // turns
  description: { lit: '...glowing...', unlit: '...dark...' }
});

// Doors (two-sided by default)
Forge.door('oak-door', {
  between: ['hallway', 'chamber'],
  lockable: true,
  keyId: 'iron-key'
});
```

#### 4. Custom Puzzle State

The Royal Puzzle needed ~450 lines of grid state management outside the entity system. Forge might need first-class puzzle primitives:

```typescript
Forge.puzzle('royal-puzzle', {
  type: 'sliding-grid',
  size: [8, 8],
  blocks: {
    marble: { movable: false },
    sandstone: { movable: true },
    ladder: { movable: true, id: 'ladder' },
    card: { movable: true, id: 'card', takeable: true }
  },
  initialState: [...],
  winCondition: (state) => state.ladder.position === 10
});
```

Or a more general state machine:

```typescript
Forge.stateMachine('dam-controls', {
  states: ['closed', 'opening', 'open', 'closing'],
  initial: 'closed',
  transitions: {
    'closed -> opening': { trigger: 'turn-bolt', duration: 3 },
    'opening -> open': { auto: true },
    'open -> closing': { trigger: 'turn-bolt', duration: 3 },
    'closing -> closed': { auto: true }
  },
  effects: {
    'open': () => world.flood('reservoir')
  }
});
```

#### 5. Story-Specific Actions

**Current**: Requires action.ts, types.ts, index.ts, grammar registration (~100+ lines)

**Proposed**:
```typescript
Forge.action('push-wall', {
  grammar: 'push :direction wall',
  validate: (ctx) => {
    if (!ctx.inPuzzle) return { valid: false, reason: 'not-in-puzzle' };
    return { valid: true };
  },
  execute: (ctx) => {
    puzzleState.push(ctx.direction);
    return [{ type: 'wall-pushed', direction: ctx.direction }];
  }
});
```

#### 6. Declarative Handlers

**Current**:
```typescript
export const puzzleHandler: EventHandler = {
  id: 'royal-puzzle-entry',
  eventTypes: ['action.going.after'],
  priority: 100,
  handle: (event, context) => {
    if (event.data?.destination === 'room-in-puzzle') {
      // ... lots of code
    }
  }
};
```

**Proposed**:
```typescript
Forge.on('enter', 'room-in-puzzle', (ctx) => {
  ctx.emit('puzzle-entered');
  ctx.setPlayerPosition(puzzleState.entry);
});

Forge.intercept('go', 'room-in-puzzle', (ctx, direction) => {
  // Override movement with puzzle logic
  return puzzleState.move(direction);
});
```

## Architecture Questions

### 1. Compilation vs Runtime

**Option A**: Forge DSL compiles to stdlib calls at build time
- Pro: No runtime overhead, full type checking
- Con: Less dynamic, harder to debug

**Option B**: Forge is runtime factories that call stdlib
- Pro: Easier debugging, more dynamic
- Con: Slight overhead, two mental models

**Leaning toward B** - runtime factories are simpler and the overhead is negligible for IF.

### 2. Configuration Format

Should Forge support declarative config files (YAML/JSON) in addition to TypeScript?

```yaml
# rooms.yaml
library:
  name: Library
  description: Dust covers everything...
  dark: true
  exits:
    west: narrow-ledge
```

Pro: Non-programmers could author content
Con: Loses type safety, IDE support, complex logic

**Maybe later** - Start with TypeScript API, add declarative format if there's demand.

### 3. Escape Hatches

Critical: Authors must be able to drop down to stdlib when Forge is limiting.

```typescript
const room = Forge.room('library', { ... });

// Escape hatch: access underlying entity
world.addBehavior(room.entity, 'custom-behavior');

// Or mix Forge and stdlib freely
const customRoom = world.createEntity('special');
Forge.connect(room).north(customRoom);
```

### 4. Message ID Generation

Currently manual: `'action.opening.cant-open'`

Could Forge auto-generate from context?
```typescript
Forge.action('frob', {
  validate: (ctx) => {
    if (!ctx.target.frobbable) {
      return ctx.fail('not-frobbable');  // Auto: 'action.frob.not-frobbable'
    }
  }
});
```

## Potential Package Structure

```
packages/
  forge/
    src/
      room.ts        # Forge.room()
      object.ts      # Forge.treasure(), .container(), etc.
      connection.ts  # Forge.connect()
      action.ts      # Forge.action()
      handler.ts     # Forge.on(), .intercept()
      puzzle.ts      # Forge.puzzle(), .stateMachine()
      index.ts       # Main Forge namespace
```

## Open Questions

1. **Naming**: Is "Forge" the right name? Alternatives: Anvil, Mold, Clay, Draft
2. **Scope**: Should Forge include NPC authoring patterns?
3. **Validation**: How much should Forge validate at creation time vs runtime?
4. **Documentation**: Should Forge generate documentation from definitions?
5. **Testing**: Can Forge provide test helpers? `Forge.test('room').canEnter().hasObject('coin')`

## Next Steps

1. Finish Dungeo port - gather more pain points
2. Write ADR for Forge architecture decisions
3. Prototype core factories (room, treasure, connect)
4. Evaluate ergonomics on a small example
5. Iterate based on usage

## Alternative: AI-Assisted Authoring

Instead of building an abstraction layer, lean into AI-assisted authoring where Claude Code (or similar) helps authors write stdlib code directly.

### The Case For This Approach

**Evidence**: The Dungeo port itself. We've written 150+ rooms, dozens of objects, custom actions, handlers - all using stdlib directly with Claude Code assistance. The "pain points" listed above weren't actually painful because AI handled the boilerplate.

**What AI-Assisted Gets You**:

1. **No new layer to maintain** - stdlib is the API, period
2. **Full power from day one** - no "escape hatch" problem
3. **Teaches as it goes** - author learns stdlib patterns naturally
4. **Handles edge cases** - AI writes custom code, not shoehorned into DSL
5. **Adapts to style** - author prefers verbose? terse? AI matches
6. **Refactors, tests, documents** - AI does the boring parts
7. **Uses existing tooling** - TypeScript, VS Code, git all work

**What Forge Would Get You That AI Doesn't**:

1. **Offline/local authoring** - no API dependency
2. **Reproducibility** - same DSL input = same output
3. **Constrained creativity** - DSL guides toward good patterns
4. **Non-programmer friendly** - YAML easier than "talk to AI"
5. **Faster iteration** - no round-trip to AI for small changes

### Hybrid: AI-First, Extract Later

Perhaps the right approach:

1. **Phase 1**: AI helps authors write stdlib directly (what we're doing now)
2. **Phase 2**: As patterns emerge in real stories, extract helpers organically
3. **Phase 3**: Forge becomes the *extracted* patterns, not speculative design

This inverts the usual approach. Instead of designing Forge upfront, we:
- Write more stories with AI assistance
- Notice what AI keeps generating
- Extract those patterns into reusable code
- Forge emerges from actual usage

### AI Authoring Experience Sketch

```
Author: I need a dark library with a purple book containing a stamp

Claude: I'll create the library room and objects.

[Creates library.ts with Room trait, dark behavior]
[Creates purple-book.ts with Container trait, readable]
[Creates stamp.ts with Takeable trait, treasure points]
[Connects to region, exports properly]

The library is dark - player will need a light source.
The book is a container so LOOK IN BOOK will work.
The stamp is worth 14 points (9 take + 5 trophy case).

Want me to add any special behavior? Maybe the book
has a description that changes after taking the stamp?
```

### Tooling for AI-Assisted Authoring

If we go this route, we'd want:

1. **CLAUDE.md patterns** - Document stdlib patterns AI should follow
2. **Example corpus** - Well-commented example stories for AI context
3. **Validation scripts** - Catch AI mistakes early (`pnpm typecheck`, tests)
4. **Transcript testing** - Verify story works as intended
5. **Prompt templates** - "Create a room", "Add a puzzle", "Make an NPC"

We're already building most of this for Dungeo. The CLAUDE.md, region organization, transcript testing - it's AI authoring infrastructure.

### Cost/Access Considerations

- Claude API costs for authoring sessions
- Authors need Anthropic account or hosted solution
- Could Sharpee offer a "story authoring" mode with bundled AI?
- Local models (llama, etc.) as fallback?

### The Meta Question

Is Sharpee's value prop:
- **A)** "A well-designed IF engine" (stdlib is the product)
- **B)** "The easiest way to write parser IF" (authoring experience is the product)

If A: stdlib + good docs is enough
If B: AI-assisted might be the killer feature, not a DSL

## Recommendation

**Pursue AI-assisted authoring as the primary direction.**

The original goal was a well-designed IF engine. But with Opus 4.5's capabilities, the optimal direction is likely: **stdlib + AI = the authoring experience**.

### Why This Makes Sense Now

1. **Proven by Dungeo** - 150+ rooms, complex puzzles, custom actions - all authored with Claude Code assistance
2. **Model capability** - Opus 4.5 understands IF conventions, stdlib patterns, and author intent
3. **Lower barrier** - Authors describe what they want; AI writes idiomatic code
4. **No abstraction tax** - Skip the DSL design/maintenance entirely
5. **Emergent patterns** - If helpers are needed, they emerge from real usage

### Product Vision Sketch

**Sharpee Studio** (or similar):
- Web app or Electron wrapper
- Chat interface for authoring ("I need a dark library with a book")
- Live preview of the story
- AI writes/modifies code in the background
- Author can view/edit code directly if desired
- Version control built-in

Or simpler: **Sharpee + Claude Code** as the recommended workflow:
- Author clones story template
- Uses Claude Code (or Cursor) to build story
- CLAUDE.md provides stdlib patterns
- Transcript tests verify correctness

### Story Specification Template

Even with AI-assisted authoring, you need to know what you're building. A good spec template is essential - it becomes the primary input to the AI.

**What a spec should capture** (based on Textfyre's Klockwerk format):

### Part 1: World Bible

1. **Header**
   - Title, series, episode
   - Team (designer, writer, programmers, testers)
   - Modification history

2. **World Building**
   - Setting (time, place, atmosphere)
   - Society (people, social structure, titles)
   - Religion/philosophy
   - Technology/magic level
   - Physics (if non-standard)
   - Currency
   - Expressions/slang (world-specific vocabulary)

3. **Pre-Story Context**
   - What happened before the game begins
   - Recent history relevant to plot

4. **Characters**
   - **PC**: Background, personality, starting inventory, motivation
   - **Major NPCs**: Description, role in story, key interactions
   - **Minor NPCs**: Brief descriptions, limited interactions

### Part 2: Screenplay

5. **Synopsis**
   - Chapter-by-chapter narrative summary
   - Each chapter has:
     - **Object**: What the player is trying to achieve
     - **Obstacle**: What's in their way

### Part 3: Design (per chapter)

6. **Chapter Structure**
   - **Map**: Visual layout of this chapter's area
   - **Rundown**:
     - Timing (turn-based events)
     - NPC patrol routes
     - Puzzle flow summary
     - Win/exit conditions
   - **Design**: Room-by-room specifications

7. **Room Specification**
   ```
   Room: [Name]
   Description: [Actual prose text]

   Object: [Name]
     Description: [Examine text]
     Command [action]: [Response text]
     Command [action when condition]: [Alternative response]
     Note: [Implementation notes]

   Event [trigger condition]:
     [Event text and effects]
   ```

8. **NPC Specification**
   - Patrol route (if mobile)
   - Topic table (ASK ABOUT responses)
   - State changes (before/after events)

### The "Screenplay" Insight

Textfyre's approach: **the writer writes ALL the prose**. Every room description, every command response, every event. The implementer's job is "just" to make the words appear at the right time.

This is ideal for AI-assisted authoring:
- Author provides the screenplay (prose, responses, logic)
- AI implements the mechanics (code, traits, handlers)

### Spec Format Comparison

| Format | Pros | Cons |
|--------|------|------|
| Word doc | Rich formatting, familiar | No version control, hard to parse |
| Markdown | Git-friendly, AI-readable | Less visual, no tables |
| Structured YAML | Machine-parseable | Tedious to write, less prose-friendly |

**Recommendation**: Markdown with clear heading conventions. AI can parse it; authors can write it naturally.

**Workflow**:
```
Author writes spec → AI reads spec → AI implements iteratively → Author tests/refines
```

The spec is living documentation - updated as the game evolves.

### Next Steps

1. Finish Dungeo - validates the approach end-to-end
2. Create IF story specification template (Markdown)
3. Write comprehensive CLAUDE.md patterns for story authoring
4. Create a "story template" repo with good examples
5. Document the AI-assisted workflow for other authors
6. Evaluate whether a dedicated app adds value over Claude Code

### Forge's New Role

Forge becomes a small utility library, not an abstraction layer:
- Extracted helpers for patterns AI struggles with
- Convenience functions that emerged from real stories
- Optional, not required

The authoring experience IS the AI. Sharpee's job is to be a clean, well-documented stdlib that AI can work with effectively.

## References

- Inform 7's natural language approach (too far?)
- Dialog's declarative style
- TADS 3's templates
- Twine's passage-based model
- Cursor/Claude Code as development paradigm
