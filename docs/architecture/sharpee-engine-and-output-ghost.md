# Sharpee Engine and Output Architecture

This is the companion document to [Sharpee's Computer Science Engine Rundown](sharpee-computer-science-ghost.md) (also posted on [intfiction.org](https://www.intfiction.org/t/the-computer-science-behind-sharpee-a-data-structures-walkthrough/73523)). That document covered the data structures and algorithms underneath — the world model, spatial index, visibility, scope, parser, and grammar system. It ended where the parser produces a resolved command.

This document picks up there. It traces a player's command from the moment the parser finishes all the way to text appearing on screen. Along the way it covers the engine's turn cycle, the four-phase action pattern, capability dispatch, the event system, the text service pipeline, perspective-aware language rendering, the bridge protocol, and client rendering.

Same format as before: CS concept first, then how Sharpee uses it.

---

## The Engine Turn Cycle: An Orchestration Pipeline

**CS Concept: Pipeline with Side Effects and Sequential Dependencies**

The previous post ended with the parser producing a structured `IParsedCommand`. But parsing is just step one. The engine orchestrates a ten-phase pipeline that transforms that parsed command into world state changes, semantic events, English prose, and finally pixels or characters on the player's screen.

```
Player input
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Input validation          ← Guard: null/undefined check  │
│  2. Parse + meta-command check ← Early exit for SCORE, HELP  │
│  3. Command execution         ← Four-phase action pattern    │
│  4. Event enrichment          ← Add turn/player/location     │
│  5. Perception filtering      ← What can the player see?     │
│  6. Command history + pronouns ← "it"/"them" tracking        │
│  7. Plugin ticks              ← NPCs, schedulers, daemons    │
│  8. Platform operations       ← Save, restore, undo          │
│  9. Text service              ← Events → English prose       │
│ 10. Turn completion           ← Victory check, cleanup       │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
TurnResult { events, blocks, success }
```

### Why This Ordering Matters

The pipeline has **sequential dependencies**. Events from phase 3 feed into phase 4 (enrichment), which feeds into phase 5 (perception filtering). Perception-filtered events are what plugins see in phase 7. Text rendering in phase 9 must come after platform operations in phase 8 (a restore operation replaces the entire world state before any text is generated).

The ordering is not arbitrary — it is a topological sort of data dependencies.

### The Two Command Paths

**CS Concept: Early Return / Short-Circuit Evaluation**

```
Player types "score"
    │
    ├── Parser identifies action: if.action.scoring
    │   └── MetaCommandRegistry.isMeta("if.action.scoring")? YES
    │       └── Route to executeMetaCommand()
    │           ├── No undo snapshot
    │           ├── No turn increment
    │           ├── No NPC ticks
    │           └── Return immediately
    │
Player types "take sword"
    │
    ├── Parser identifies action: if.action.taking
    │   └── MetaCommandRegistry.isMeta("if.action.taking")? NO
    │       └── Fall through to full executeTurn() pipeline
    │           ├── Undo snapshot created
    │           ├── Full four-phase action execution
    │           ├── Turn incremented
    │           ├── NPCs tick
    │           └── Return with events + blocks
```

Meta-commands (SCORE, HELP, VERSION, ABOUT, SAVE, RESTORE, UNDO, AGAIN) are information queries or platform operations — they do not change the game world. They bypass the turn machinery entirely: no undo snapshots, no turn counter increment, no NPC activity. This is not just an optimization; it is semantically correct. Typing "score" should not cause the thief to move or a fuse to tick.

---

## The Four-Phase Action Pattern: Structured Command Processing

**CS Concept: Template Method / Staged Pipeline with Shared State**

Every action in Sharpee follows the same four-phase structure:

```
Command arrives
    │
    ▼
┌─────────────────────────────┐
│  1. VALIDATE                │  "Can this happen?"
│     ← Check scope, traits   │  Returns: { valid, error, params }
│     ← Check game rules      │
│     ← Check interceptors    │
└─────────────┬───────────────┘
              │
     ┌────────┴────────┐
     │ valid?          │
     ▼ YES             ▼ NO
┌──────────┐    ┌──────────┐
│ 2. EXEC  │    │ 4. BLOCK │
│  Mutate  │    │  Explain │
│  world   │    │  why not │
└────┬─────┘    └────┬─────┘
     ▼               ▼
┌──────────┐    (returns error
│ 3. REPORT│     events)
│  Success │
│  events  │
└──────────┘
```

### Phase 1: Validate — Pure Predicate Logic

**CS Concept: Predicate Chain with Short-Circuit Evaluation**

Validate is a chain of checks that returns on first failure:

```typescript
// From the Taking action
validate(context: ActionContext): ValidationResult {
  // 1. Entity interceptor (story-specific blocks like "white-hot axe")
  // 2. Scope check: can the player reach this item?
  // 3. Identity check: not self, not a room
  // 4. State check: not already carrying it
  // 5. Trait check: not scenery (fixed in place)
  // 6. Capacity check: not overloaded
  return { valid: true };
}
```

Each check has access to the full world state but does not mutate it. Validate is functionally pure — given the same world state and command, it always returns the same result. This makes it safe to retry (important for implicit inference, discussed below).

**Tradeoff**: Running all these checks on every command has a cost, but the cost is tiny — a handful of hash map lookups and trait checks. The benefit is that invalid actions never reach the execute phase, which means the world state cannot be corrupted by a half-executed invalid command.

### Phase 2: Execute — The Single Point of Mutation

```typescript
execute(context: ActionContext): void {
  // Capture state before mutation (for reporting)
  const previousLocation = context.world.getLocation(noun.id);

  // THE MUTATION: move item from room/container to player's inventory
  context.world.moveEntity(noun.id, actor.id);
}
```

Execute returns `void` in the new pattern. It performs exactly one thing: the state change. No text generation, no event creation, no side effects beyond the mutation itself.

**Why separate execute from report?** Consider what happens if you generate the success message inside execute:

```
// BAD: event says "Taken" but what if moveEntity fails?
execute() {
  events.push(successEvent);   // ← Report before mutation
  world.moveEntity(id, actor); // ← If this throws, event is wrong
}
```

Separating execute from report means the success message is only generated after the mutation succeeds. If execute throws, the report phase never runs. The system cannot lie about what happened.

### Phase 3: Report — Event Generation

```typescript
report(context: ActionContext): ISemanticEvent[] {
  // World state has already changed — report what happened
  return [context.event('if.event.taken', {
    messageId: 'if.action.taking.taken',
    params: { item: noun.name, container: container?.name }
  })];
}
```

Report reads the (now-mutated) world state and generates semantic events. These events carry a `messageId` — a symbolic name for the message — not English text. The actual prose is resolved later by the language layer.

**CS Concept: Semantic Events (Domain Events)**

Events are named facts about what happened, not instructions for what to display. `if.event.taken` means "something was taken." How that renders — "Taken." in English, or "Pris." in French — is decided elsewhere. This separation is the foundation of Sharpee's language layer independence.

### Phase 4: Blocked — Structured Error Handling

```typescript
blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
  return [context.event('if.event.taken', {
    blocked: true,
    messageId: `if.action.taking.${result.error}`,
    params: result.params
  })];
}
```

Blocked receives the validation failure and generates events explaining why the command failed. This is not an exception — it is a normal execution path. In interactive fiction, failed commands are part of the gameplay experience ("That's fixed in place." is a message the player needs to see, not an error to be caught and ignored).

### SharedData: Inter-Phase Communication Without Mutation

**CS Concept: Thread-Local Storage / Context Object**

The four phases sometimes need to pass information forward. Validate might detect a condition that changes how report formats its message. Rather than mutating a global or polluting the action context, phases communicate through `sharedData`:

```
┌───────────┐   sharedData   ┌──────────┐   sharedData   ┌──────────┐
│ VALIDATE  │ ─────────────► │ EXECUTE  │ ─────────────► │ REPORT   │
│           │  inferenceUsed │          │  prevLocation  │          │
│           │  interceptor   │          │  wasWorn       │          │
└───────────┘                └──────────┘                └──────────┘
```

SharedData is a plain dictionary (`Record<string, any>`) scoped to a single action invocation. It is created fresh for each command and discarded after the turn completes. This avoids cross-turn pollution while allowing clean data flow between phases.

### ActionContext: The Unified Execution Environment

**CS Concept: Facade**

Every phase receives the same `ActionContext` — a single object that provides access to everything an action needs:

```
ActionContext
├── world          ← WorldModel (read and write)
├── player         ← Current actor entity
├── currentLocation ← Actor's room
├── command        ← Validated command with resolved entities
├── sharedData     ← Inter-phase communication
├── canSee(entity) ← Scope queries
├── canReach(entity)
├── requireScope(entity, level) ← Scope validation
├── event(type, data) ← Event factory
└── validationResult  ← Data from validate phase
```

The `event()` factory method automatically injects common context — actor ID, location, target entity, turn number — into every event. This eliminates a class of bugs where actions forget to include standard fields.

---

## Capability Dispatch: Entity-Owned Behavior

**CS Concept: Strategy Pattern with Dynamic Resolution**

The standard four-phase pattern handles verbs with universal semantics — TAKE always moves an item to inventory, OPEN always changes `isOpen` to true. But some verbs mean different things depending on the target entity:

| Command | Standard Semantics | Entity-Specific Meaning |
|---------|-------------------|------------------------|
| `lower basket` | — | Move basket elevator down |
| `turn wheel` | — | Rotate flood control wheel |
| `wave sceptre` | — | Create rainbow bridge |
| `take axe` | Move to inventory | Blocked: axe is white-hot |

Capability dispatch lets entities intercept standard actions and handle them with custom logic. The entity's **trait** declares which actions it responds to, and a **behavior** provides the four-phase implementation.

### The Resolution Pipeline

```
Command: "lower basket"
    │
    ▼
CommandExecutor.execute()
    │
    ├── Find action: if.action.lowering
    ├── Find entities: [basket]
    │
    ├── checkCapabilityDispatchMulti("if.action.lowering", [basket])
    │   │
    │   ├── basket.traits → find BasketElevatorTrait
    │   │   └── capabilities: ["if.action.lowering", "if.action.raising"]
    │   │       └── MATCH for "if.action.lowering"
    │   │
    │   ├── getBehaviorBinding(BasketElevatorTrait, "if.action.lowering")
    │   │   └── Returns: { behavior: BasketLoweringBehavior, priority: 100 }
    │   │
    │   └── Returns: { shouldDispatch: true, behavior, trait, entity }
    │
    └── Use BasketLoweringBehavior instead of stdlib lowering action
        ├── validate() → Can the basket go lower?
        ├── execute()  → Move basket to bottom, move contained items
        ├── report()   → "The basket descends into the shaft."
        └── blocked()  → "The basket is already at the bottom."
```

### Multi-Entity Resolution

**CS Concept: Conflict Resolution with Priority Ordering**

When multiple entities claim the same capability, the system must decide which one wins. Four resolution modes handle this:

```
Resolution Modes:
┌─────────────────┬──────────────────────────────────────────────┐
│ first-wins      │ Highest priority entity handles everything   │
│ highest-priority│ Same as first-wins (explicit naming)         │
│ any-blocks      │ All validate; first failure blocks           │
│ all-must-pass   │ All validate; all must succeed               │
└─────────────────┴──────────────────────────────────────────────┘
```

Claims are sorted by priority (highest first), then the resolution mode determines whether one entity or all entities participate in validation:

```
"take axe" with troll alive

Claims collected:
  1. TrollAxeTrait claims "if.action.taking" at priority 100
     → Has registered TrollAxeBlockingBehavior

Resolution: first-wins (default)
  → Only TrollAxeTrait's behavior validates
  → validate() returns { valid: false, error: "white_hot" }
  → blocked() returns "The troll's axe is white-hot. You can't take it."
```

The stdlib's taking action never runs. The entity's behavior completely replaces it for this specific entity. For any other item, capability dispatch finds no claims and the stdlib action handles it normally.

---

## The Event System: Facts, Not Instructions

**CS Concept: Event Sourcing / Observer Pattern with Processing Pipeline**

Actions produce **semantic events** — named, structured records of what happened. These events flow through a multi-stage processing pipeline:

```
Action emits events
    │
    ▼
┌─────────────────────┐
│ Event Processor      │  Process events against world state
│  └─ Entity handlers  │  ← Story handlers react (ADR-052)
│     └─ Reactions     │  ← Handlers can produce more events
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Event Enrichment     │  Add turn, playerId, locationId
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Perception Filter    │  Remove events player can't perceive
└──────────┬──────────┘
           │
           ▼
  Enriched, filtered events
```

### The Event Structure

```typescript
{
  id: "evt_12_1711729384",         // Unique ID
  type: "if.event.taken",          // Semantic type (past tense = fact)
  timestamp: 1711729384000,        // When it happened
  entities: {                      // What was involved
    actor: "player",
    target: "brass-lantern"
  },
  data: {                          // Domain-specific payload
    messageId: "if.action.taking.taken",
    params: { item: "brass lantern" }
  }
}
```

**Naming Convention**: Event types use past-tense verbs because they represent facts. `if.event.taken` means "this was taken" — it has already happened. Compare with commands, which use imperative verbs: "take lantern." This distinction prevents a subtle bug: if event names used imperative mood, it would be unclear whether the event represents intent or outcome.

### Entity Handlers: Reactive Logic

**CS Concept: Observer Pattern with Chain Processing**

Stories register handlers that react to events:

```typescript
// In story's initializeWorld():
world.registerEventHandler('if.event.put_in', (event, world) => {
  if (event.data.targetId === machineId && event.data.itemId === coalId) {
    // Coal was put in the machine — update machine state
    // Can return new events (reactions)
  }
});
```

The event processor collects reactions from handlers and feeds them back through the pipeline. This enables **chain reactions** — putting coal in the machine might trigger an event that another handler reacts to. A depth limit (10 levels) prevents infinite loops.

### Perception Filtering: Information Hiding

**CS Concept: Information Filter / Access Control**

Not all events should reach the player. If an NPC moves in a distant room, the player should not see "The thief moves north." The perception service filters events by what the player can perceive:

```
Events before filtering:
  ✓ if.event.taken (player took something — always visible)
  ✓ if.event.npc_moved (thief moved in same room — visible)
  ✗ if.event.npc_moved (troll patrolling distant corridor — filtered)
  ✓ if.event.door_opened (door in adjacent room — audible)
```

The filter checks event entities against the player's visibility and awareness scope. Events involving entities the player cannot perceive are silently dropped. This is the same scope system from the first post, applied to events rather than commands.

---

## The Text Service: Events to English Prose

**CS Concept: Stateless Transformer Pipeline**

The text service converts semantic events into structured text blocks. It is **stateless** — no memory between turns, no side effects, pure transformation: events in, blocks out.

```
Semantic Events
    │
    ▼
┌────────────────────────────────────────────┐
│  Stage 1: FILTER                           │
│  Remove system.* and platform.* events     │
│  (internal bookkeeping, not player-facing) │
├────────────────────────────────────────────┤
│  Stage 2: SORT                             │
│  Order for prose flow:                     │
│    game lifecycle → implicit actions →     │
│    room descriptions → action results →    │
│    consequences (by chain depth)           │
├────────────────────────────────────────────┤
│  Stage 3: ROUTE                            │
│  Dispatch each event to a handler:         │
│    game.started → handleGameStarted()      │
│    if.event.room.description → handleRoom()│
│    domain event with messageId → resolve   │
│    game.message → handleGameMessage()      │
├────────────────────────────────────────────┤
│  Stage 4: ASSEMBLE                         │
│  Create ITextBlock with semantic key       │
│  and decorated content                     │
└────────────────────────────────────────────┘
    │
    ▼
ITextBlock[]
```

### Event Routing

Domain events carry `messageId` directly (ADR-097):

```
Event: { type: "if.event.taken", data: { messageId: "if.action.taking.taken", params: { item: "sword" } } }
  ↓
Text service sees messageId on domain event
  ↓
Language provider resolves: "Taken."
  ↓
Block: { key: "action.result", content: ["Taken."] }
```

Every action and behavior in the codebase uses this pattern — the report phase emits a domain event with a semantically meaningful type (like `if.event.taken` or `dungeo.event.poured`) carrying `messageId` and `params` embedded directly. The text service resolves the message through the language provider in a single step. There is one routing path, no legacy fallbacks.

### Text Blocks: Semantic Structure, Not Raw Strings

**CS Concept: Abstract Syntax Tree for Prose**

The text service does not produce strings. It produces `ITextBlock` — structured objects with a semantic key and a content tree:

```typescript
{
  key: "room.name",
  content: ["West of House"]
}

{
  key: "room.description",
  content: [
    "You are standing in an open field west of a white house, with a boarded front door. ",
    "There is ",
    { type: "item", content: ["a small mailbox"] },
    " here."
  ]
}

{
  key: "action.result",
  content: ["Taken."]
}
```

The `key` field tells the client *what kind of text this is*:

| Key | Meaning | CLI Rendering | Browser Rendering |
|-----|---------|---------------|-------------------|
| `room.name` | Room title | Bold text | Heading element |
| `room.description` | Room prose | Normal text | Paragraph |
| `action.result` | Success message | Normal text | Paragraph |
| `action.blocked` | Failure message | Normal text | Paragraph |
| `status.room` | Status bar: location | Status line | Status bar div |
| `status.score` | Status bar: score | Status line | Status bar div |
| `game.banner` | Opening banner | Centered text | Banner div |

### Decorations: Semantic Markup

**CS Concept: Tree with Typed Nodes (like an HTML DOM)**

Content can contain **decorations** — typed wrappers that carry semantic meaning:

```
"You can see [item:a brass lantern] and [npc:a troll] here."

Parsed into:
[
  "You can see ",
  { type: "item", content: ["a brass lantern"] },
  " and ",
  { type: "npc", content: ["a troll"] },
  " here."
]
```

Decoration types are semantic, not presentational:

| Type | Meaning | CLI Color | Browser CSS |
|------|---------|-----------|-------------|
| `item` | Game object | Cyan | `.decoration-item` |
| `room` | Room name | Yellow | `.decoration-room` |
| `npc` | Character | Magenta | `.decoration-npc` |
| `em` | Emphasis | Italic | `<em>` |
| `strong` | Strong | Bold | `<strong>` |
| `command` | Player input | Green | `.decoration-command` |
| `direction` | Compass direction | White | `.decoration-direction` |

The CLI renderer maps these to ANSI escape codes. The browser renderer maps them to CSS classes. A screen reader could map them to voice changes. The text service does not know or care — it produces the tree, clients interpret it.

---

## The Language Layer: Message Resolution

**CS Concept: Template Engine with Dictionary Lookup**

The language layer sits between the text service (which has message IDs) and the output (which needs English text). It is a three-stage transformer:

```
Message ID + params
    │
    ▼
┌──────────────────────────────────────┐
│  Stage 1: Dictionary Lookup          │
│  "if.action.taking.taken" → "Taken." │
│  "if.action.taking.taken_from"       │
│    → "{You} {take} {item} from       │
│       {the:container}."              │
├──────────────────────────────────────┤
│  Stage 2: Perspective Resolution     │
│  {You} → "You" (2nd person)         │
│  {take} → "take" (2nd person)       │
│  {You} → "She" (3rd person)         │
│  {take} → "takes" (3rd person)      │
├──────────────────────────────────────┤
│  Stage 3: Formatter Application      │
│  {the:container} → "the toolbox"     │
│  {a:item} → "a brass lantern"       │
│  {list:items} → "a sword, an axe,   │
│     and a lantern"                   │
└──────────────────────────────────────┘
    │
    ▼
"You take a brass lantern from the toolbox."
```

### Stage 1: The Message Dictionary

**CS Concept: Hash Map with Namespace Keys**

Messages are registered as a flat hash map with dotted keys:

```
Messages Map:
  "if.action.taking.taken"         → "Taken."
  "if.action.taking.taken_from"    → "{You} {take} {item} from {the:container}."
  "if.action.taking.already_have"  → "{You} already {have} {item}."
  "if.action.taking.fixed_in_place" → "That's fixed in place."
  "if.action.taking.cant_take_self" → "{You} {have} better things to do."
  "if.action.opening.opened"       → "Opened."
  "if.action.opening.already_open" → "That's already open."
  "core.entity_not_found"          → "You can't see any such thing."
  "core.disambiguation_prompt"     → "Which do you mean: {options}?"
```

Each action registers its messages through a language definition file in `lang-en-us`:

```typescript
// packages/lang-en-us/src/actions/taking.ts
export const takingLanguage = {
  actionId: 'if.action.taking',
  messages: {
    'taken': "Taken.",
    'taken_from': "{You} {take} {item} from {the:container}.",
    'already_have': "{You} already {have} {item}.",
    // ...
  }
};
```

The language provider concatenates `actionId + "." + messageKey` to form the lookup key. This namespacing prevents collisions — `taken` alone would be ambiguous, but `if.action.taking.taken` is unique.

### Stage 2: Perspective Resolution

**CS Concept: Template Variable Substitution with Grammatical Rules**

Sharpee supports three narrative perspectives — first, second, and third person — from the same message templates:

```
Template: "{You} {take} {the:item}."

2nd person (default):  "You take the sword."
1st person:            "I take the sword."
3rd person (she/her):  "She takes the sword."
3rd person (they/them): "They take the sword."
```

The perspective resolver handles:

- **Subject pronouns**: `{You}` → "I" / "You" / "She" / "He" / "They"
- **Possessive adjectives**: `{Your}` → "My" / "Your" / "Her" / "His" / "Their"
- **Verb conjugation**: `{take}` → "take" / "take" / "takes" / "take"

Verb conjugation follows English rules — third person singular adds "-s" or "-es", with an irregular verb table for common exceptions (be, have, do, can). First and second person always use the base form.

**Tradeoff**: Running regex substitution on every message has a cost. But messages are short (typically under 100 characters) and the regex is simple. The alternative — storing separate messages for each perspective — would triple the dictionary size and create a maintenance burden.

### Stage 3: Formatters

**CS Concept: Composable String Transformers**

Formatters are named functions applied via curly-brace syntax:

```
{a:item}      → Article selection: "a sword" or "an axe"
{the:item}    → Definite article: "the sword"
{list:items}  → Oxford comma list: "a sword, an axe, and a knife"
{cap:text}    → Capitalize first letter
```

Formatters compose: `{cap:a:item}` first applies the article formatter, then capitalizes the result: "A sword."

The formatter registry is a hash map from formatter name to transformer function. Stories and language packs can register custom formatters without modifying the core.

---

## The Bridge: Subprocess Communication Protocol

**CS Concept: Message-Passing IPC (Inter-Process Communication)**

The bridge enables external hosts — GUI applications, web servers, game platforms — to drive the Sharpee engine as a subprocess. The host spawns a Node.js process running the bridge; they communicate via newline-delimited JSON over stdin/stdout.

```
┌─────────────┐     stdin (JSON lines)      ┌──────────────────┐
│             │ ──────────────────────────► │                  │
│   HOST      │                             │  BRIDGE          │
│  (Zifmia,   │ ◄────────────────────────── │  (Node.js        │
│   GUI app)  │     stdout (JSON lines)     │   subprocess)    │
│             │                             │                  │
└─────────────┘                             │  ┌────────────┐  │
                                            │  │ GameEngine │  │
                                            │  │ TextService│  │
                                            │  │ WorldModel │  │
                                            │  └────────────┘  │
                                            └──────────────────┘
```

### Protocol Lifecycle

```
Host                               Bridge
  │                                  │
  │  ◄── { type: "ready", version }  │   Bridge starts, sends ready
  │                                  │
  │  { method: "start", bundle } ──► │   Host requests game start
  │                                  │   Bridge loads story, creates engine
  │  ◄── { type: "blocks", [...] }   │   Opening room description
  │  ◄── { type: "events", [...] }   │   Domain events
  │  ◄── { type: "status", ... }     │   Location + turn number
  │                                  │
  │  { method: "command", "go n" } ► │   Player command
  │                                  │   Engine executes turn
  │  ◄── { type: "blocks", [...] }   │   Response text
  │  ◄── { type: "events", [...] }   │   Domain events
  │  ◄── { type: "status", ... }     │   Updated status
  │                                  │
  │  { method: "quit" } ────────►    │
  │  ◄── { type: "bye" }            │   Clean shutdown
  │                                  │
```

### Turn Atomicity: The Flush Protocol

**CS Concept: Transactional Output with Ordered Messages**

Each turn produces up to three messages, always in the same order:

1. **Blocks** — the structured text output
2. **Events** — domain events for the host's own logic
3. **Status** — location and turn number (marks end of turn)

The bridge accumulates blocks and events during `executeTurn()`, then flushes them atomically after the turn completes:

```typescript
private flushTurn(): void {
  // 1. Blocks
  if (this.pendingBlocks.length > 0) {
    this.send({ type: 'blocks', blocks: this.pendingBlocks });
  }
  // 2. Events
  if (this.pendingEvents.length > 0) {
    this.send({ type: 'events', events: this.pendingEvents });
  }
  // 3. Status (always sent — marks end of turn)
  this.sendStatus();

  this.clearAccumulators();
}
```

The status message acts as a **sentinel** — when the host receives it, it knows the turn is complete and it can accept the next player command. Without this ordering guarantee, the host could process events before blocks arrive, or display text from one turn mixed with events from the next.

### Command Queue: Sequential Processing

**CS Concept: Producer-Consumer Queue**

Commands from the host are enqueued and processed one at a time. Even if the host sends multiple commands rapidly, the bridge processes them sequentially:

```
Command queue: ["go north", "take lantern", "look"]

Processing:
  1. Dequeue "go north"     → executeTurn → flushTurn → done
  2. Dequeue "take lantern" → executeTurn → flushTurn → done
  3. Dequeue "look"         → executeTurn → flushTurn → done
```

This prevents race conditions where two turns might try to mutate the world simultaneously. Interactive fiction is inherently sequential — events in one turn depend on the state left by the previous turn.

### Event Filtering: Not Everything Crosses the Bridge

The bridge only forwards events that start with `if.event.` or `platform.`. Story-specific events (`dungeo.event.*`, `zoo.event.*`) and internal events (`system.*`, `action.error`) stay inside the engine — they are implementation details or story internals, not protocol messages the host needs.

---

## Client Rendering: The Last Mile

**CS Concept: Adapter Pattern — Same Data, Different Output**

The same `ITextBlock[]` reaches every client. Each client renders it differently:

```
ITextBlock[] ──┬── CLI Renderer ──────► Terminal text with ANSI colors
               │
               ├── Browser Client ────► DOM elements with CSS classes
               │
               └── Bridge → Host ─────► JSON for external rendering
```

### CLI Rendering: Blocks to Terminal Text

The CLI renderer converts blocks to a string with optional ANSI color codes:

```
Input blocks:
  { key: "room.name", content: ["West of House"] }
  { key: "room.description", content: ["You are standing in an open field..."] }
  { key: "action.result", content: ["Taken."] }

Output (plain):
  West of House
  You are standing in an open field...

  Taken.

Output (ANSI):
  \033[1mWest of House\033[0m
  You are standing in an open field...

  Taken.
```

**Smart Joining**: Blocks with the same key get a single newline between them. Blocks with different keys get a double newline. This produces natural paragraph spacing without hardcoding it into the text.

**Decoration Rendering**: Each decoration type maps to an ANSI escape code:

```
item      → Cyan     (objects stand out from prose)
room      → Yellow   (locations are prominent)
npc       → Magenta  (characters are distinct)
command   → Green    (player input echoes differently)
em        → Italic
strong    → Bold
```

When ANSI is disabled (piping to a file, for example), decorations fall back to markdown-style markers: `*emphasis*`, `**strong**`.

### Browser Rendering: Blocks to DOM

The browser client uses a **manager pattern** — each concern is handled by a specialized subsystem:

```
BrowserClient
├── TextDisplay       ← Renders blocks as DOM paragraphs
├── StatusLine        ← Updates status bar (location, score, turns)
├── InputManager      ← Handles text input, command history, focus
├── ThemeManager      ← CSS variable switching between themes
├── SaveManager       ← Auto-save, save/restore dialogs
├── DialogManager     ← Modal dialogs for disambiguation, prompts
├── MenuManager       ← Menu bar for game controls
└── AudioManager      ← Beeps for errors, score changes
```

Text rendering is straightforward: split the rendered string on double newlines to get paragraphs, create a `<p>` element for each, append to the scrolling text container, scroll to bottom:

```typescript
displayText(text: string): void {
  const paragraphs = text.split(/\n\n+/);
  for (const para of paragraphs) {
    const p = document.createElement('p');
    p.style.whiteSpace = 'pre-line';
    p.textContent = para.trim();
    this.textContent.appendChild(p);
  }
  this.scrollToBottom();
}
```

The browser client wires everything together through engine events:

```
Engine.on('text:output') → TextDisplay.displayText()
Engine.on('event')       → Score tracking, save/restore, audio cues
Engine.on('turn:complete') → Status line update, auto-save
```

---

## Complete Data Flow: "take brass lantern"

Here is the full journey of a single command through every layer:

```
Player types: "take brass lantern"
    │
    │  ┌─────────────── COVERED IN PART 1 ──────────────────┐
    ▼  │                                                      │
[Tokenize] → ["take", "brass", "lantern"]                    │
    ▼                                                         │
[Grammar Match] → "take :item" matches (confidence 1.0)      │
    ▼                                                         │
[Slot Consumer] → "brass lantern" → entity: brass-lantern    │
    ▼                                                         │
[Validator] → resolve entity ID, check scope                 │
    ▼  │                                                      │
    │  └──────────────────────────────────────────────────────┘
    │
    │  ┌─────────────── COVERED IN THIS POST ────────────────┐
    ▼  │                                                      │
[Capability Check] → No trait claims if.action.taking         │
    ▼                  for brass-lantern → use stdlib action   │
    │                                                         │
[Validate] → Scope: REACHABLE ✓                               │
    │         Not self ✓                                       │
    │         Not already carrying ✓                           │
    │         Not scenery ✓                                    │
    │         Not over capacity ✓                               │
    │         Returns: { valid: true }                         │
    ▼                                                          │
[Execute] → world.moveEntity("brass-lantern", "player")       │
    │        SpatialIndex updates:                             │
    │          childToParent: "brass-lantern" → "player"       │
    │          parentToChildren: "living-room" removes it      │
    │          parentToChildren: "player" adds it              │
    ▼                                                          │
[Report] → context.event("if.event.taken", {                  │
    │         messageId: "if.action.taking.taken",             │
    │         params: { item: "brass lantern" }                │
    │       })                                                 │
    ▼                                                          │
[Event Processor] → Entity handlers checked → no reactions     │
    ▼                                                          │
[Event Enrichment] → Add turn: 3, playerId, locationId        │
    ▼                                                          │
[Perception Filter] → Player action → always visible → pass   │
    ▼                                                          │
[Plugin Ticks] → NPC plugin: thief moves                      │
    │             Scheduler plugin: lantern fuse ticks         │
    ▼                                                          │
[Text Service]                                                │
    │  Filter: pass (not system/platform)                     │
    │  Sort: action result first, then NPC movement           │
    │  Route: domain event with messageId                     │
    │    → languageProvider.getMessage(                        │
    │        "if.action.taking.taken",                         │
    │        { item: "brass lantern" }                         │
    │      )                                                   │
    │                                                          │
    │  [Language Provider]                                     │
    │    Dictionary: "if.action.taking.taken" → "Taken."       │
    │    Perspective: no placeholders → skip                   │
    │    Formatters: no formatters → skip                      │
    │    Result: "Taken."                                      │
    │                                                          │
    │  Assemble: { key: "action.result", content: ["Taken."] } │
    ▼                                                          │
[Turn Complete] → victory check: no → continue                │
    │  └──────────────────────────────────────────────────────┘
    │
    │  ┌─────────────── CLIENT RENDERING ────────────────────┐
    ▼  │                                                      │
[CLI]    renderToString(blocks) → "Taken.\n"                   │
         print to terminal                                    │
                                                               │
[Browser] textDisplay.displayText("Taken.")                    │
          → <p>Taken.</p> appended to #textContent             │
          → scrollToBottom()                                   │
                                                               │
[Bridge]  flushTurn()                                          │
          → send { type: "blocks", blocks: [...] }             │
          → send { type: "events", events: [...] }             │
          → send { type: "status", location: "...", turn: 3 }  │
    │  └──────────────────────────────────────────────────────┘
    ▼
Player sees: "Taken."
```

From keystroke to rendered text: tokenize → grammar match → slot consumption → entity resolution → capability check → validate → execute → report → event processing → enrichment → perception filter → plugin ticks → text service → language resolution → block assembly → client rendering.

Sixteen stages. Each one a clean data transformation with defined inputs and outputs. No stage knows about the stages above or below it. The parser does not know how text is rendered. The language layer does not know how entities are resolved. The bridge does not know how the world model stores containment.

---

## Design Philosophy: IF-Specific, By Choice

The patterns in this document — and in the first post — are shaped by the constraints of parser-based interactive fiction. They are deliberate choices for this domain, not universal architectural recommendations.

### What IF demands

Interactive fiction is **turn-based**, **single-player**, **text-primary**, and **parser-driven**. These constraints make certain patterns natural:

- **Sequential pipeline over concurrent processing.** A turn is atomic — the player acts, the world reacts, text is rendered. There is no parallelism to exploit and no race conditions to prevent (beyond the bridge's command queue, which enforces sequentiality for external hosts). A DAG scheduler or middleware composition system would add flexibility the domain does not need.

- **Four-phase actions over transaction logs.** Validate-execute-report-blocked is a simplified CQRS pattern. A full event-sourced system with replay and projection would be architecturally purer, but IF games do not need audit trails or temporal queries — they need undo (which Sharpee handles with state snapshots, not event replay).

- **Stateless text service over incremental rendering.** Each turn produces a complete text output from scratch. There is no diffing, no partial updates, no retained state between turns. This is correct for IF — every turn's output is self-contained prose, not a delta against previous state.

- **Regex-based template resolution over compiled templates.** The language layer resolves `{You} {take} {the:item}` via string replacement on every call. An AST-based template compiler (like ICU MessageFormat) would eliminate runtime regex overhead, but IF messages are short (under 100 characters typically) and produced a few times per turn. The regex cost is unmeasurable.

### What IF does not demand (yet)

Some capabilities exist in the architecture but are not yet exercised by any shipping story:

- **Text decorations.** The `ITextBlock` content tree supports semantic decorations (`[item:the brass key]`, `[npc:the guard]`) that clients can render with styling, hover states, or interactivity. The CLI renderer maps these to ANSI color codes. The browser client currently flattens blocks to plain text — the decoration data is produced but not consumed on the web. This gap exists because the only production story (Dungeo) is a port of a 1981 terminal game that has no need for styled inline content. The first story written from scratch for the platform will be the natural driver for browser-side decoration rendering.

- **Multi-perspective output.** The language layer supports first, second, and third person narrative from the same message templates. Dungeo uses second person exclusively. The perspective system is tested but not battle-tested across a full game in first or third person.

- **Custom formatters.** The formatter registry is extensible — stories can register domain-specific formatters. No story has needed this yet.

### Tradeoffs acknowledged

- **SharedData is untyped.** Inter-phase communication uses `Record<string, any>` — the weakest type in the system. A discriminated union or typed result object would catch bugs at compile time. In practice, each action's sharedData is written and consumed in the same file, so the blast radius of a type error is small. The cost of typing it properly is high (every action would need a unique SharedData type parameter), and the benefit is low given the typical scope.

- **The engine pipeline is hardcoded.** Ten phases in a fixed order, not a composable middleware chain. This means adding a new phase requires editing the engine's `executeTurn()` method. For a system where the pipeline has been stable since early 2025, this is the right tradeoff — the cost of a plugin architecture for a pipeline that changes once or twice a year would not pay for itself.

- **Capability dispatch has four resolution modes, but only two are used.** `first-wins` and `any-blocks` are exercised by Dungeo's puzzles. `highest-priority` (an alias for `first-wins`) and `all-must-pass` exist for completeness but have no production consumers. They are small enough to carry without maintenance burden, but they are speculative.

### The bottom line

These patterns are right-sized for interactive fiction. A real-time multiplayer game would need concurrent event processing, incremental rendering, and delta-based state synchronization. A CRPG with complex combat would need a richer action model with interrupts and reactions. Sharpee does not need those things, and it does not pay for them.

The architecture is stable, the patterns are well-understood, and the codebase has been validated by porting a 191-room game with 38 puzzles. Where gaps exist (decoration rendering, multi-perspective, custom formatters), they are waiting for their first real consumer, not blocked by architectural limitations.

---

## Glossary (Additions)

| Term | Definition |
|------|------------|
| **Action context** | Facade object providing all four phases access to world, command, scope, and shared data |
| **Capability dispatch** | Strategy pattern where entity traits intercept and handle standard actions with custom behavior |
| **Domain event** | Named, structured record of something that happened — facts, not instructions |
| **Event enrichment** | Adding contextual metadata (turn, player, location) to raw events |
| **Formatter** | Named string transformer applied via `{name:value}` syntax in message templates |
| **ITextBlock** | Structured text unit with a semantic key and a content tree of strings and decorations |
| **Message ID** | Dotted key (`if.action.taking.taken`) mapping to localized text in the language dictionary |
| **Meta-command** | Command that queries state without changing it (SCORE, HELP) — bypasses turn machinery |
| **Perception filter** | Removes events the player cannot perceive based on spatial awareness |
| **Sentinel message** | The status message that marks the end of a turn in the bridge protocol |
| **SharedData** | Per-invocation dictionary for passing data between action phases |
| **Text decoration** | Typed wrapper in content trees carrying semantic meaning (item, npc, room) |
| **Text service** | Stateless transformer pipeline: semantic events → structured text blocks |
| **Turn atomicity** | Guarantee that blocks, events, and status for one turn are sent together before the next turn begins |
