# ADR-116: Prompt-to-Playable (Conversational Story Development)

## Status: Proposed

## Context

Interactive Fiction authoring has a high barrier to entry. Even with modern tools like Inform 7, authors must learn a domain-specific language, understand IF conventions, and translate their creative vision into implementation details.

Sharpee's potential differentiator isn't technical capability (parser IF is well-established) but **development velocity** - how quickly an author can go from idea to playable game.

This ADR proposes a conversational AI-assisted workflow that:

1. Guides authors through structured specification development
2. Generates playable Sharpee code from specifications
3. Supports iterative refinement through document management

## Decision

Create a CLI toolset (`sharpee spec`) that combines conversational AI assistance with structured document management to enable rapid story development.

### Core Workflow

```
Idea → Conversation → Structured Spec → Code Generation → Playable Game
           ↑                 ↓
           └── Refinement ───┘
```

### The Specification as Intermediate Representation

The existing `docs/templates/story-spec-template.md` serves as the intermediate format between creative vision and executable code. It provides:

- **Part 1: World Bible** - Genre, tone, setting, world-building
- **Part 2: Characters** - PC, NPCs, dialogue tables
- **Part 3: Synopsis** - Story structure, chapters
- **Part 4: Geography** - World map, regions
- **Part 5: Chapter Design** - Rooms, objects, events, commands
- **Part 6: Puzzles** - Solutions, failures, hints
- **Part 7: Technical Notes** - Custom actions, mechanics

This structure is detailed enough for code generation while remaining human-readable and editable.

### Command Interface

```bash
# Initialize a new story specification
sharpee spec init "The Lighthouse"

# Continue conversational development
sharpee spec develop lighthouse

# Compile spec to playable story
sharpee spec compile lighthouse --output stories/lighthouse

# Play the generated story immediately
sharpee spec play lighthouse

# Document management
sharpee spec versions lighthouse           # List versions
sharpee spec branch lighthouse "alt-ending"  # Create branch
sharpee spec merge lighthouse alt-ending   # Merge branch
sharpee spec lock lighthouse --section "Part 1"  # Lock section
```

---

## Part 1: Conversational Development

### AI-Guided Spec Building

The `sharpee spec develop` command starts an interactive session where the LLM guides the author through specification development:

```
$ sharpee spec develop lighthouse

Resuming "The Lighthouse" (v0.3, last edited 2 hours ago)

Current progress:
  ✓ Part 1: World Bible (complete)
  ✓ Part 2: Characters (complete)
  ◐ Part 3: Synopsis (in progress - Act 2 incomplete)
  ○ Part 4: Geography (not started)
  ○ Part 5: Chapter Design (not started)
  ○ Part 6: Puzzles (not started)
  ○ Part 7: Technical Notes (not started)

Last session ended at: Part 3 - Act 2 obstacles

> Let's continue with Act 2. You mentioned the keeper discovers
> the oil reservoir is empty. What obstacles prevent simply
> getting more oil?

Author: The supply shed is locked and the key is missing. Also
        there's a storm so he can't go outside safely.

> Good - two layered obstacles. Let me update the synopsis:
>
> **Act 2 Obstacles:**
> - Supply shed is locked (key puzzle)
> - Storm prevents outdoor travel (environmental constraint)
>
> For the key - where should it be hidden? Some options:
> 1. Previous keeper had it - now it's in his personal effects
> 2. It fell through a crack in the floorboards
> 3. A scavenging bird took it (visible in nest through window)
>
> Or describe your own idea.

Author: Option 1 - the previous keeper. There should be some
        mystery about what happened to him.

> Interesting - this adds backstory depth. Should we:
> A) Keep it ambiguous (atmospheric mystery)
> B) Reveal a dark truth (horror element)
> C) Make it relevant to the main puzzle (integrated design)

Author: C - maybe he tried something desperate when the light
        failed before
```

### Conversation Modes

**Guided Mode** (default): LLM follows template structure, asks targeted questions, offers options.

**Freeform Mode**: Author describes freely, LLM extracts and organizes into spec sections.

```bash
sharpee spec develop lighthouse --mode freeform
```

**Section Focus**: Work on a specific section only.

```bash
sharpee spec develop lighthouse --section "Part 6: Puzzles"
```

### AI Capabilities

The LLM assistant provides:

- **Structure guidance**: Knows what each spec section needs
- **IF expertise**: Understands parser conventions, puzzle design patterns, pacing
- **Consistency checking**: Flags contradictions (key in two places, unreachable rooms)
- **Structural suggestions**: Offers puzzle patterns, room layouts, NPC archetypes
- **Gap identification**: "Part 5 references a 'rusty key' not defined in objects"
- **Code generation**: Converts author-written spec into Sharpee TypeScript

### AI Limitations (By Design)

**The AI must NOT generate player-facing content.** This is a core design constraint enforced through DSLM training.

The author writes:
- All room descriptions
- All object descriptions
- All NPC dialogue and topic responses
- All puzzle designs and solutions
- All custom command responses
- All failure/success messages

The AI may:
- Ask questions to elicit this content
- Offer structural patterns ("this could be a lock-and-key puzzle")
- Identify missing content ("Lamp Room has no description yet")
- Suggest where content is needed ("NPC has no response for ASK ABOUT STORM")

The AI must NOT:
- Draft prose for the author to "approve"
- Generate room descriptions from keywords
- Write NPC dialogue
- Create puzzle solutions

**Rationale**: Interactive Fiction is a literary form. The author's voice, puzzle design, and creative choices are the game. AI-generated content produces homogeneous, soulless experiences. Sharpee enables authors - it doesn't replace them.

**DSLM Training Implication**: The domain-specific language model must be trained to recognize player-facing content requests and redirect to questions rather than generation. When asked "write a description for the kitchen," it should respond with "What atmosphere are you going for? What details should the player notice first?"

---

## Part 2: Document Management

### Version Control

Every significant change creates a version. Versions are lightweight snapshots within the spec file.

```bash
$ sharpee spec versions lighthouse

v0.1  2026-01-20 14:30  Initial concept
v0.2  2026-01-20 16:45  Completed World Bible
v0.3  2026-01-21 10:00  Added NPC: Previous Keeper (ghost?)
v0.4  2026-01-21 11:30  Part 4: Geography complete
v0.5  2026-01-22 09:00  [current] Puzzle design - key sequence

$ sharpee spec diff lighthouse v0.3 v0.5
```

**Version triggers:**
- End of conversation session (auto-save)
- Explicit `sharpee spec commit lighthouse -m "message"`
- Before any destructive operation (branch, merge, revert)

### Branching

Branches allow exploring alternative directions without losing the main spec.

```bash
# Create a branch to explore a darker tone
$ sharpee spec branch lighthouse "horror-variant"
Created branch 'horror-variant' from v0.5

$ sharpee spec develop lighthouse --branch horror-variant

# Later, compare branches
$ sharpee spec diff lighthouse main horror-variant

# Merge if the experiment worked
$ sharpee spec merge lighthouse horror-variant
# or abandon it
$ sharpee spec branch --delete lighthouse horror-variant
```

**Use cases for branches:**
- Alternative endings
- Tone experiments (comedic vs serious version)
- Puzzle redesigns
- "What if" explorations

### Research Spikes

Spikes are temporary investigation documents attached to a spec. They capture ideas, research, and experiments that may or may not make it into the main spec.

```bash
# Create a spike to research lighthouse mechanics
$ sharpee spec spike lighthouse "fresnel-lens-research"

# Spikes are freeform markdown with optional AI assistance
$ sharpee spec spike-edit lighthouse fresnel-lens-research

# Promote spike content to main spec
$ sharpee spec spike-promote lighthouse fresnel-lens-research --to "Part 7"

# Or archive it
$ sharpee spec spike-archive lighthouse fresnel-lens-research
```

**Spike structure:**
```markdown
# Spike: fresnel-lens-research
Created: 2026-01-22
Status: Active
Related sections: Part 5 (Lamp Room), Part 6 (Relight Puzzle)

## Notes

Fresnel lenses work by... [research notes]

## Ideas

- Could make rotating the lens part of the puzzle
- Different colored filters for signals?

## Rejected

- Lens shattering (too destructive, no recovery)
```

### Section Locking

Lock completed sections to prevent accidental changes during later development.

```bash
# Lock the World Bible - it's finalized
$ sharpee spec lock lighthouse --section "Part 1"
Locked: Part 1: World Bible

# Attempting to modify shows warning
$ sharpee spec develop lighthouse --section "Part 1"
Warning: Part 1 is locked. Unlock with:
  sharpee spec unlock lighthouse --section "Part 1"
Continue anyway? [y/N]

# View lock status
$ sharpee spec status lighthouse
Part 1: World Bible       [LOCKED]
Part 2: Characters        [LOCKED]
Part 3: Synopsis          [open]
Part 4: Geography         [open]
Part 5: Chapter Design    [open]
Part 6: Puzzles           [open]
Part 7: Technical Notes   [open]
```

**Lock types:**
- **Soft lock**: Warning before edit (default)
- **Hard lock**: Requires explicit unlock command
- **Dependency lock**: Auto-locks when downstream sections reference it

---

## Part 3: Code Generation

### Compilation Pipeline

```
Spec (Markdown) → Parser → Semantic Model → Code Generator → TypeScript
```

#### Parser

Extracts structured data from markdown spec:

```typescript
interface ParsedSpec {
  metadata: StoryMetadata;
  worldBible: WorldBible;
  characters: Character[];
  synopsis: Synopsis;
  geography: Geography;
  chapters: Chapter[];
  puzzles: Puzzle[];
  technicalNotes: TechnicalNotes;
}
```

#### Semantic Model

Validates and connects parsed elements:

- Resolves room connections (names → IDs)
- Links objects to locations
- Connects puzzle steps to required objects
- Validates NPC topic tables reference known entities
- Ensures all referenced items exist

#### Code Generator

Produces Sharpee TypeScript:

```
stories/{story}/
├── src/
│   ├── {story}-story.ts          # Main story loader
│   ├── regions/
│   │   ├── {region}/
│   │   │   ├── index.ts
│   │   │   ├── rooms/
│   │   │   │   └── {room}.ts     # One file per room
│   │   │   └── objects/
│   │   │       └── index.ts
│   ├── npcs/
│   │   └── {npc}/
│   │       ├── entity.ts
│   │       ├── behavior.ts
│   │       └── messages.ts
│   ├── puzzles/
│   │   └── {puzzle}.ts           # Event handlers, custom logic
│   └── actions/
│       └── {action}/             # Story-specific actions
├── {story}.spec.md               # Source specification
└── package.json
```

### Generation Modes

**Scaffold Mode** (default): Generates complete structure, leaves `// TODO` markers for complex logic.

```bash
sharpee spec compile lighthouse
```

**Playable Mode**: Generates complete, runnable code. May simplify complex puzzles.

```bash
sharpee spec compile lighthouse --playable
```

**Incremental Mode**: Only regenerates changed sections.

```bash
sharpee spec compile lighthouse --incremental
```

### Compile Output Example

From spec section:

```markdown
#### Lamp Room

**Exits**: D: Spiral Staircase
**Light**: Dark (until lamp is lit)

**Description**:
> The lamp room is cramped and cold. The great Fresnel lens
> dominates the space, its glass panels dark and lifeless.
> Through the windows, you can see the storm-tossed sea and,
> distantly, the lights of an approaching ship.

**Objects**:

##### Fresnel Lens

**Traits**: Device, Scenery
**Initial State**: Off

**Commands**:

| Action | Condition | Response |
|--------|-----------|----------|
| EXAMINE | | The lens is magnificent but cold. Without oil, it cannot be lit. |
| LIGHT | no oil | You have no fuel for the lamp. |
| LIGHT | has oil | You pour the oil into the reservoir and strike a match... |
```

Generates:

```typescript
// stories/lighthouse/src/regions/tower/rooms/lamp-room.ts

export function createLampRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('lamp-room', 'room');

  room.addTrait(RoomTrait, {
    name: 'Lamp Room',
    description: `The lamp room is cramped and cold. The great Fresnel lens
dominates the space, its glass panels dark and lifeless.
Through the windows, you can see the storm-tossed sea and,
distantly, the lights of an approaching ship.`,
    inherentlyDark: true,
  });

  // Fresnel Lens
  const lens = world.createEntity('fresnel-lens', 'object');
  lens.addTrait(SceneryTrait);
  lens.addTrait(DeviceTrait, { isOn: false });
  lens.addTrait(ExaminableTrait, {
    description: 'The lens is magnificent but cold. Without oil, it cannot be lit.',
  });
  world.moveEntity(lens.id, room.id);

  return room;
}
```

```typescript
// stories/lighthouse/src/puzzles/light-the-lamp.ts

export function registerLampPuzzle(world: WorldModel): void {
  // Custom LIGHT action handler for the lens
  world.registerEventHandler('if.event.before_switching_on', (event, world) => {
    if (event.data.targetId !== 'fresnel-lens') return;

    const player = world.getPlayer();
    const hasOil = world.isCarrying(player.id, 'oil-can');

    if (!hasOil) {
      return {
        prevented: true,
        message: 'lighthouse.msg.no_oil'
      };
    }

    // TODO: Implement successful lighting sequence
    // - Consume oil
    // - Light the lamp
    // - Trigger victory sequence
  });
}
```

### Round-Trip Editing

Generated code can be edited manually. Re-compilation preserves manual edits in marked sections:

```typescript
// GENERATED - Do not edit above this line

// CUSTOM - Your code here (preserved on regeneration)
function customLightingSequence() {
  // Manual implementation
}

// GENERATED - Do not edit below this line
```

---

## Part 4: Instant Play

### Play Before Committing

The `spec play` command compiles and runs without writing files:

```bash
$ sharpee spec play lighthouse

Compiling lighthouse spec...
  ✓ 12 rooms
  ✓ 23 objects
  ✓ 3 NPCs
  ✓ 5 puzzles (2 simplified - missing detail)

Starting "The Lighthouse"...

> look
Keeper's Quarters
You stand in the small, sparse quarters...

> _
```

**Simplified puzzles**: When spec lacks implementation detail, the compiler creates passable versions:

```markdown
## Lock Puzzle (spec)
**Required Items**: rusty key
**Solution**:
1. Find key in previous keeper's effects
2. Unlock supply shed
```

Generates working (if simple) implementation:
- Key exists in specified location
- Lock responds to key
- Missing: custom messages, failure states, hints

### Hot Reload During Play

Edit the spec while playing; changes apply on next room entry:

```bash
$ sharpee spec play lighthouse --watch

# In another terminal:
$ sharpee spec develop lighthouse
# Make changes to room descriptions...

# Back in play session:
> north
[Reloading... 1 room updated]
Spiral Staircase
[New description appears]
```

---

## Part 5: Storage Format

### Spec File Structure

Specs are enhanced Markdown with YAML frontmatter for metadata:

```markdown
---
id: lighthouse
title: The Lighthouse
version: 0.5
created: 2026-01-20
modified: 2026-01-24
author: Dave Cornelson
branches:
  - main (current)
  - horror-variant
locked:
  - "Part 1: World Bible"
  - "Part 2: Characters"
---

# The Lighthouse

**Series**: Standalone
**Version**: Draft 0.5
...
```

### Version Storage

Versions stored in a hidden section at end of file:

```markdown
<!-- SPEC_VERSIONS
v0.1|2026-01-20T14:30:00|Initial concept|sha256:abc123...
v0.2|2026-01-20T16:45:00|Completed World Bible|sha256:def456...
v0.3|2026-01-21T10:00:00|Added ghost NPC|sha256:789abc...
-->
```

Full version content stored in `.spec-versions/` directory alongside spec file:

```
stories/lighthouse/
├── lighthouse.spec.md
├── .spec-versions/
│   ├── v0.1.md
│   ├── v0.2.md
│   └── v0.3.md
├── .spec-branches/
│   └── horror-variant.md
└── .spec-spikes/
    ├── fresnel-lens-research.md
    └── archived/
        └── ...
```

---

## Implementation Phases

### Phase 1: Spec Parser & Validator

1. Markdown parser for story-spec-template format
2. Semantic validation (references resolve, no orphans)
3. `sharpee spec validate` command
4. Error reporting with line numbers

### Phase 2: Basic Code Generation

1. Room generation from Part 5
2. Object generation with traits
3. Connection setup from exits
4. Basic story loader scaffold
5. `sharpee spec compile` command

### Phase 3: Document Management

1. Version tracking (frontmatter + hidden section)
2. `sharpee spec versions/diff/revert` commands
3. Branching and merging
4. Section locking

### Phase 4: Conversational Development

1. LLM integration (Claude API or local model)
2. `sharpee spec develop` interactive mode
3. Guided and freeform conversation modes
4. Spec modification from conversation

### Phase 5: Advanced Generation

1. NPC generation with topic tables
2. Puzzle event handler generation
3. Custom action generation
4. Round-trip editing preservation

### Phase 6: Instant Play

1. In-memory compilation
2. `sharpee spec play` command
3. Watch mode with hot reload
4. Simplified puzzle fallbacks

### Phase 7: Research Spikes

1. Spike creation and management
2. Spike-to-section promotion
3. Archival system

---

## Consequences

### Positive

- **Lower barrier to entry**: Authors focus on creative work, not implementation
- **Structured output**: Spec template ensures completeness
- **Immediate feedback**: Play generated games instantly
- **Iterative refinement**: Edit spec, replay, repeat
- **Version safety**: Never lose work, explore freely with branches
- **Separation of concerns**: Creative work (spec) vs implementation (generated code)
- **Author remains author**: AI assists structure, never writes player-facing content
- **Authentic voice**: Every word the player reads came from the author

### Negative

- **LLM dependency**: Requires API access or local model for conversation mode
- **Generation limits**: Complex puzzles may need manual code
- **Spec-code drift**: Manual edits may conflict with regeneration
- **Learning curve**: Authors must understand spec structure (though AI helps)
- **No "magic button"**: Authors must write all prose themselves (this is intentional, but some may want full generation)

### Neutral

- **Spec becomes source of truth**: Authors work in Markdown, not TypeScript
- **Generated code is readable**: Can transition to manual development if needed
- **Template is opinionated**: May not suit all story types

---

## Alternatives Considered

### Direct Natural Language to Code

Skip the spec, generate code directly from conversation. Rejected because:
- No intermediate artifact for review
- Harder to make targeted edits
- Can't version "the idea" separate from implementation
- Loss of creative control

### Visual Authoring Tool

GUI-based story builder. Rejected because:
- High development effort
- Competes with existing tools (Inform IDE, Quest)
- Conversation is more natural for creative work

### Extend Existing Tool (Inform 7, etc.)

Add AI assistance to established platforms. Rejected because:
- Locked into their paradigms
- Sharpee's TypeScript architecture offers different tradeoffs
- Want to demonstrate Sharpee's unique value

---

## Appendix: DSLM Training Considerations

The conversational assistant requires a domain-specific language model (DSLM) trained with specific behavioral constraints.

### Training Objectives

**Promote:**
- Asking clarifying questions about creative intent
- Offering structural patterns ("three-act structure", "hub-and-spoke geography")
- Identifying gaps and inconsistencies in the spec
- Explaining IF conventions and tradeoffs
- Generating implementation code from author-written spec

**Suppress:**
- Generating prose when asked ("write a description for...")
- Completing partial descriptions
- Suggesting specific word choices for player-facing text
- "Improving" author-written prose
- Offering to draft dialogue

### Training Data

**Include:**
- IF design theory (craft of IF, puzzle design patterns)
- Sharpee architecture and API documentation
- Story-spec-template structure and semantics
- Example completed specs (with clear author attribution)
- Code generation examples (spec section → TypeScript)

**Exclude:**
- Large corpora of IF prose (to prevent style imitation)
- "Creative writing assistant" training patterns
- Prose completion/continuation examples

### Redirect Patterns

When author requests content generation, redirect to questions:

| Author says | Model responds |
|-------------|----------------|
| "Write a description for the cellar" | "What's the first thing the player should notice? What atmosphere - damp and forgotten, or actively threatening?" |
| "What should the ghost say?" | "What does the ghost want the player to understand? Is it hostile, helpful, or indifferent?" |
| "Come up with a puzzle for the locked door" | "What resources does the player have at this point? Should this be an early-game easy puzzle or a late-game challenge?" |

### Model Options

1. **Fine-tuned small model**: Train a 7B-13B parameter model specifically for this task
2. **RAG + system prompt**: Use larger model with retrieval-augmented generation and strict system constraints
3. **Hybrid**: Fine-tuned model for structure, larger model for code generation

The fine-tuned approach offers better constraint enforcement but requires training infrastructure. RAG is faster to deploy but may have more "leakage" into prose generation.

---

## References

- Story spec template: `docs/templates/story-spec-template.md`
- Textfyre development process (historical)
- Story structure: `stories/dungeo/` (reference implementation)
- Language layer: ADR-001, packages/lang-en-us
