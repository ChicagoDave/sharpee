# ADR-136: Context-Driven Action Menus

## Status

Deferred

Implementation exists on branch `adr-136-context-actions` (all 7 phases complete and working).
Deferred because the feature needs a concrete game and UX vision to drive it — the
technology works but there is no active use case. Available for anyone who brings a
game project that wants context-driven action menus.

## Date

2026-03-28

## Context

GitHub Issue #63 requests GUI support — specifically, a system where the client
can derive and present available parser actions from world state. The user
describes "context-sensitive command buttons" generated from the current room,
visible objects, inventory, NPCs, and available verbs. This is not a graphical
presentation layer (ADR-101) or a pure choice-based system (ADR-103) — it is a
parser game with an optional action surface that exposes valid commands through
a GUI without requiring the author to hand-build custom UI for every story.

The reference point is [Gruescript](https://versificator.itch.io/gruescript),
where the interface surfaces actions from context rather than requiring typed
input.

### What Already Exists

Sharpee has the infrastructure to compute available actions but no API to
surface them:

| System | What it provides | Gap |
|--------|-----------------|-----|
| Grammar rules with `.hasTrait()` | Declares which verbs require which traits | No reverse query: "given this entity, what verbs apply?" |
| Scope resolvers | What's visible/reachable/carried | No aggregation across entities + verbs |
| Trait system | Entity capabilities | No introspection: "what can I do with this?" |
| Bridge protocol (ADR-135) | Structured output to clients | No `actions` message type |
| Annotation system (ADR-124) | Extensible presentation metadata | No `action-hint` kind |
| ADR-103 `ChoiceProvider` | Designed for generating choices from world state | Not implemented |

### Design Question

How should the engine expose available actions to the client?

**Option A: Engine auto-computes all valid actions** — The engine iterates
every entity in scope against every grammar rule, runs trait checks, and
returns a complete action menu each turn.

**Option B: Author annotates entities with action hints** — The story author
declares which actions to surface on which entities, using the annotation
system (ADR-124).

**Option C: Hybrid — auto-compute with author overrides** — The engine
generates a baseline action set from grammar/trait/scope intersection, and
authors can add, remove, or customize entries via annotations.

## Decision

We will implement **Option C: Hybrid auto-compute with author overrides**.

### Rationale

1. **Zero-config baseline**: Any parser game gets a working action menu with
   no author effort. Clients can display "Examine lamp", "Take key", "Go
   north" from grammar rules + scope + traits alone.
2. **Author control**: Authors can suppress actions that technically work but
   are red herrings, promote puzzle-relevant actions, add custom labels, or
   reorder by priority.
3. **Gruescript parity**: Matches the requested model where the interface
   surfaces actions from context, not from explicit authoring.
4. **Incremental adoption**: Text-only clients ignore the action menu. GUI
   clients render it. Authors opt in to customization only when needed.

## Architecture

### The ContextAction Type

```typescript
/**
 * A single action available in the current context.
 * Produced by the engine, consumed by the client for rendering.
 */
interface ContextAction {
  /** The full command text, ready to submit (e.g. "take brass lantern") */
  command: string;

  /** The action ID (e.g. "if.action.taking") */
  actionId: string;

  /** Human-readable verb label (e.g. "Take") */
  verb: string;

  /** Target entity ID, if any */
  targetId?: string;

  /** Target display name (e.g. "brass lantern") */
  targetName?: string;

  /** Instrument entity ID, if any (e.g. key for "unlock door with key") */
  instrumentId?: string;

  /** Instrument display name */
  instrumentName?: string;

  /** Scope level of the target: "carried", "reachable", "visible", "aware" */
  scope?: 'carried' | 'reachable' | 'visible' | 'aware';

  /** Category for client grouping */
  category: 'movement' | 'interaction' | 'inventory' | 'communication'
          | 'combat' | 'meta' | 'story';

  /** Display priority — higher appears first (default 100) */
  priority?: number;

  /** Author-provided custom label (overrides auto-generated) */
  label?: string;

  /** Whether this action is from auto-compute (true) or author annotation */
  auto: boolean;
}
```

### Auto-Compute: Grammar × Scope × Traits

The engine computes available actions each turn by intersecting three systems:

```
For each entity E in scope:
  For each grammar rule R:
    If R has a trait constraint:
      Does E have that trait? → yes: include
    If R has no trait constraint:
      Is R a verb that applies to any entity? → yes: include
    If R is intransitive (no :target slot):
      Include as a global action (e.g. "look", "inventory", "wait")
    Filter by scope level: R requires touchable but E is only visible? → exclude
```

This produces a raw action list. The engine then:

1. **Deduplicates**: "take lamp" and "get lamp" collapse to one entry (same
   action ID + same target).
2. **Categorizes**: Movement verbs → `movement`, take/drop → `inventory`,
   give/show/tell → `communication`, attack → `combat`, etc.
3. **Sorts**: By category, then by priority, then alphabetically.
4. **Caps**: Maximum actions per entity (default 8) and total (default 40)
   to prevent overwhelming the UI.

#### Direction Actions

Room exits are a special case. For each exit on the current room's
`RoomTrait`:

```typescript
{ command: "north", actionId: "if.action.going",
  verb: "Go", targetName: "north", category: "movement" }
```

If the exit has a `via` entity (a door), and that door is closed, the action
is still included but marked with a `blocked` flag so the client can render
it as disabled or with a lock icon.

#### Intransitive Actions

Always-available commands that take no arguments:

```typescript
{ command: "look", actionId: "if.action.looking",
  verb: "Look", category: "interaction", auto: true }
{ command: "inventory", actionId: "if.action.inventory",
  verb: "Inventory", category: "inventory", auto: true }
{ command: "wait", actionId: "if.action.waiting",
  verb: "Wait", category: "meta", auto: true }
```

### Author Overrides via Annotations (ADR-124)

Authors use the existing annotation system to customize the action menu:

```typescript
// Promote a specific action with a custom label
door.annotate('action-hint', {
  id: 'unlock-door',
  data: {
    command: 'unlock door with skeleton key',
    label: 'Unlock the door',
    priority: 200,     // Appear first
    category: 'interaction',
  },
  condition: {
    trait: 'lockable',
    property: 'isLocked',
    value: true,
    // Only show "Unlock" when the door is locked
  },
});

// Suppress an auto-computed action
lamp.annotate('action-suppress', {
  id: 'suppress-eat-lamp',
  data: {
    actionId: 'if.action.eating',
    // Don't suggest "Eat lamp" even though no grammar constraint prevents it
  },
});
```

**New annotation kinds**:

| Kind | Purpose | Data fields |
|------|---------|-------------|
| `action-hint` | Add or customize an action entry | `command`, `label?`, `priority?`, `category?` |
| `action-suppress` | Remove an auto-computed action | `actionId` |

Both support the existing `condition` mechanism — hints appear/disappear
based on trait state.

### Bridge Protocol Extension

Add a new outbound message type to ADR-135:

```typescript
/** Available actions this turn, sent after status. */
interface ActionsMessage {
  readonly type: 'actions';
  /** Available actions, sorted by category then priority */
  readonly actions: ReadonlyArray<ContextAction>;
}
```

The bridge sends this after the status message (which marks end-of-turn).
Clients that don't understand `actions` messages ignore them.

Updated turn flush order: blocks → events → status → actions.

### Client Rendering

Clients are free to render actions however they choose. Recommended patterns:

**Sidebar panel**: Group by category with section headers (Movement,
Interaction, Inventory, Communication). Each action is a clickable button
that submits the `command` text as if the player typed it.

**Contextual popover**: Click/tap an entity in the room description to see
its available actions. Requires the client to map entity names in text to
entity IDs (entity text decoration from ADR-133 enables this).

**Hybrid input**: Action buttons coexist with the text input. Clicking a
button fills the command line (for review/editing) or submits directly
(configurable per client).

**Keyboard shortcuts**: Clients may assign numbered shortcuts to high-priority
actions (1-9). Movement directions get arrow keys.

### Capability Negotiation

Extend `ClientCapabilities` (ADR-101) with:

```typescript
interface ClientCapabilities {
  // ... existing fields ...

  /** Client wants context-driven action menus */
  actionMenu: boolean;

  /** Maximum actions the client can display */
  maxActions?: number;
}
```

If `actionMenu` is false (text-only clients), the engine skips the
computation entirely — zero overhead for parser purists.

### Story-Specific Actions

Story-defined actions (e.g., Dungeo's SAY, INCANT, RING) are included in
the auto-compute if they register grammar rules. The grammar system already
captures story-specific patterns via `extendParser()`. Any story verb with
a grammar rule and an entity in scope will appear automatically.

For story actions that are contextually important (puzzle verbs), authors
should add `action-hint` annotations with elevated priority so they surface
prominently.

## Examples

### Basic Room

Player enters the Living Room. The engine auto-computes:

```json
{ "type": "actions", "actions": [
  { "command": "north",     "verb": "Go",      "targetName": "north",    "category": "movement", "auto": true },
  { "command": "west",      "verb": "Go",      "targetName": "west",     "category": "movement", "auto": true },
  { "command": "down",      "verb": "Go",      "targetName": "down",     "category": "movement", "auto": true },
  { "command": "examine rug",    "verb": "Examine", "targetName": "rug",       "category": "interaction", "auto": true },
  { "command": "take lantern",   "verb": "Take",    "targetName": "brass lantern", "category": "inventory", "auto": true },
  { "command": "open trapdoor",  "verb": "Open",    "targetName": "trap door",  "category": "interaction", "auto": true },
  { "command": "look",      "verb": "Look",     "category": "interaction", "auto": true },
  { "command": "inventory",  "verb": "Inventory", "category": "inventory", "auto": true }
]}
```

### Author-Customized Puzzle

The coal machine puzzle. Author adds an annotation:

```typescript
machine.annotate('action-hint', {
  id: 'turn-switch',
  data: {
    command: 'turn switch',
    label: 'Activate the machine',
    priority: 200,
    category: 'interaction',
  },
  condition: {
    trait: 'container',
    property: 'hasItems',
    value: true,
    // Only show when something is in the machine
  },
});
```

The auto-computed actions for the machine (examine, put X in machine) still
appear, but the puzzle action is promoted to the top.

### NPC Interaction

Troll is visible. Auto-computed:

```json
[
  { "command": "examine troll", "verb": "Examine",  "category": "interaction" },
  { "command": "attack troll",  "verb": "Attack",   "category": "combat" },
  { "command": "give X to troll", "verb": "Give",   "category": "communication" }
]
```

The "give" action appears because the troll has `ActorTrait`. The client
shows it as a template ("Give ___ to troll") that expands to inventory
selection.

## Implementation Plan

### Phase 1: Core API (Engine)

- Implement `ActionMenuComputer` — iterates grammar rules × scoped entities
- Wire into the turn cycle, gated on client capability
- Add `ContextAction` type to `@sharpee/core`
- Add `action-hint` and `action-suppress` annotation kinds

### Phase 2: Bridge + Protocol

- Add `ActionsMessage` to bridge protocol
- Bridge sends actions after status in `flushTurn()`
- Add `actionMenu` to `ClientCapabilities`

### Phase 3: Reference Client

- Add action sidebar to browser client
- Group by category, clickable to submit
- Movement actions as direction buttons
- Toggle: show/hide action panel

### Phase 4: Refinement

- Template actions for two-argument commands ("Give ___ to troll")
- Entity text decoration (ADR-133) integration for contextual popovers
- Keyboard shortcuts
- Author tooling: preview action menu in transcript tester

## Consequences

### Positive

- Any Sharpee game gets an action menu with zero author effort
- Parser games become accessible to players unfamiliar with IF conventions
- Hybrid parser + point-and-click experiences are possible
- Authors retain full control via annotations
- Text-only clients are completely unaffected
- Leverages existing infrastructure (grammar, scope, traits, annotations)

### Negative

- Action computation adds per-turn overhead (mitigated by capability gate)
- Large scope (many entities × many verbs) could produce overwhelming menus
  (mitigated by caps and dedup)
- Two-argument commands ("put X in Y") require template UX in the client
- Authors may need to suppress irrelevant auto-computed actions for polish

### Neutral

- Terminal client ignores action messages
- Does not replace the parser — actions submit commands through the same
  pipeline as typed input
- Compatible with ADR-101 (graphical media) and ADR-103 (choice-based) —
  all three can coexist

## Alternatives Considered

### Option A: Engine Auto-Compute Only

No author overrides — engine computes everything from grammar/traits/scope.

- **Pros**: Zero author effort, fully automatic
- **Cons**: No way to suppress irrelevant actions, no custom labels, no
  puzzle promotion. "Eat lamp" appears if no grammar constraint prevents it.
- **Rejected**: Automatic is a good baseline but polish requires author input.

### Option B: Author Annotation Only

Authors explicitly declare every action hint. No auto-compute.

- **Pros**: Full author control, no irrelevant suggestions
- **Cons**: Requires author effort for every entity. Most parser games would
  get no benefit without extensive annotation work.
- **Rejected**: Contradicts the request for "generic" context-driven actions.

## References

- [GitHub Issue #63](https://github.com/ChicagoDave/sharpee/issues/63) —
  GUI support request
- ADR-090: Entity-Centric Action Dispatch — trait-based routing
- ADR-101: Graphical Client Architecture — media events
- ADR-103: Choice-Based Story Architecture — `ChoiceProvider` concept
- ADR-124: Entity Annotations — extensible presentation metadata
- ADR-133: Structured Text Output — entity text decoration
- ADR-135: Native Engine Bridge Protocol — client communication
- [Gruescript](https://versificator.itch.io/gruescript) — reference for
  context-driven action UI
