# Sharpee Design: Computer Science Foundations

This document explains the data structures and algorithms behind Sharpee's
interactive fiction engine. It is written for developers who learn best by
seeing how CS concepts appear in real, working code rather than in textbook
abstractions.

Every section names the CS concept first, then shows how Sharpee uses it.

---

## Table of Contents

1. [The World Model: Choosing the Right Data Structures](#1-the-world-model-choosing-the-right-data-structures)
2. [The SpatialIndex: A Bidirectional Hash Map](#2-the-spatialindex-a-bidirectional-hash-map)
3. [Room Connections: Directed Graph as Adjacency List](#3-room-connections-directed-graph-as-adjacency-list)
4. [Visibility: Filtered Tree Traversal](#4-visibility-filtered-tree-traversal)
5. [Scope: A Rule Engine with Indexed Lookup](#5-scope-a-rule-engine-with-indexed-lookup)
6. [The Parser Pipeline: Data Structure Transformations](#6-the-parser-pipeline-data-structure-transformations)
7. [The Grammar System: A Production Rule Engine](#7-the-grammar-system-a-production-rule-engine)
8. [Grammar Catalog](#8-grammar-catalog)

---

## 1. The World Model: Choosing the Right Data Structures

An interactive fiction world is a collection of entities (rooms, objects,
characters) connected by relationships (containment, location, direction).
The original Sharpee design discussion considered two approaches:

- **Graph database**: Every entity is a node, every relationship is an edge.
  Flexible but expensive to query and hard to constrain.
- **Immutable state tree**: Entities organized in a hierarchy with clean
  state management and fast serialization.

Sharpee chose a hybrid that uses the right structure for each job.

### The Data Structure Taxonomy

| Structure      | Access Pattern                          | Sharpee Usage                           |
|----------------|----------------------------------------|-----------------------------------------|
| **Hash Map**   | "Get X by name" — O(1)                | Entity store, trait lookup by type       |
| **Tree**       | "What's inside X?" — parent/child      | Containment, spatial model (SpatialIndex)|
| **Graph**      | "What connects to X?" — arbitrary edges| Room connections, directions             |
| **Array**      | "Do these in order" — indexed          | Trait lists, event handler chains        |
| **Set**        | "Is X a member?" — O(1) membership    | Children sets, visited tracking          |
| **Queue**      | "First in, first out"                  | Semantic event processing                |

### Why This Combination?

The most common operations in an IF engine are:

1. **Find entity by ID** — happens every turn, multiple times. Hash map: O(1).
2. **What's in this room?** — happens on every LOOK. Tree children: O(1) lookup.
3. **Where is this item?** — happens on every TAKE/DROP. Tree parent: O(1) lookup.
4. **Where does north go?** — happens on movement. Adjacency list: O(1) lookup.

A pure graph database would make operations 2 and 3 expensive (scan all edges
to find relationships of a given type). A pure tree wouldn't handle room
connections (rooms connect to siblings, not just parents and children). The
hybrid gives O(1) for all four.

### The Entity Store

```
entities: Map<string, IFEntity>

"brass-lantern" → { id: "brass-lantern", traits: [...], ... }
"living-room"   → { id: "living-room", traits: [...], ... }
"troll"         → { id: "troll", traits: [...], ... }
```

This is a **hash map** (TypeScript `Map`). Looking up any entity by its string
ID is O(1) regardless of how many entities exist. The tradeoff: it tells you
nothing about relationships between entities. That is what the SpatialIndex
and room connections handle.

---

## 2. The SpatialIndex: A Bidirectional Hash Map

**CS Concept: Bidirectional Index (Inverted Index)**

The SpatialIndex tracks who is inside what. It is the backbone of containment
in Sharpee: items inside rooms, items inside containers, items carried by the
player.

**Source**: `packages/world-model/src/world/SpatialIndex.ts`

### The Core Trick: Two Maps Pointing Opposite Directions

```typescript
class SpatialIndex {
  private parentToChildren: Map<string, Set<string>>;
  private childToParent: Map<string, string>;
}
```

The same relationship is stored twice — once in each direction:

```
childToParent                    parentToChildren
─────────────                    ────────────────
"lantern"  → "living-room"       "living-room" → { "lantern", "rug", "player" }
"rug"      → "living-room"       "player"      → { "sword", "bottle" }
"player"   → "living-room"       "bottle"      → { "water" }
"sword"    → "player"
"bottle"   → "player"
"water"    → "bottle"
```

Both questions are instant:

| Question                     | Which Map            | Cost |
|------------------------------|----------------------|------|
| "Where is the lantern?"     | `childToParent`      | O(1) |
| "What's in the living room?"| `parentToChildren`   | O(1) |

Without the bidirectional index, one of these would require scanning every
entity in the game — O(n). For a game like Dungeo with hundreds of entities,
that matters.

**Tradeoff**: Double the memory for instant lookups in both directions. For an
IF game with ~1000 entities, this is negligible — a thousand extra string
pointers.

### Why Set Instead of Array for Children

`parentToChildren` maps to a **Set**, not an Array:

| Operation                      | Array   | Set   |
|--------------------------------|---------|-------|
| "Is lantern in this room?"    | O(n) scan| O(1)  |
| "Remove lantern from room"    | O(n) find + splice | O(1) |
| "Add lantern to room"         | O(1) push | O(1) |
| "List everything in room"     | Already an array | O(n) conversion |

Sets win on the operations that happen most (membership check, removal). The
only cost is converting to an array when listing room contents, which happens
less frequently.

### The Move Operation: Enforcing the Tree Invariant

```typescript
addChild(parentId: string, childId: string): void {
    // Remove from current parent (enforces: one parent only)
    const currentParent = this.childToParent.get(childId);
    if (currentParent) {
        this.removeChild(currentParent, childId);
    }
    // Add to new parent
    this.parentToChildren.get(parentId)!.add(childId);
    this.childToParent.set(childId, parentId);
}
```

**CS Concept: Structural Invariant**

A tree guarantees that every node has exactly one parent. The `addChild`
method enforces this — before adding to the new parent, it removes from the
old one. An item can never be in two places simultaneously. The data structure
makes the illegal state unrepresentable.

This is what every TAKE, DROP, PUT IN, and PUT ON command calls under the
hood. `take lantern` → `addChild(playerId, lanternId)`. `drop lantern` →
`addChild(roomId, lanternId)`.

### Tree Traversal: Descendants and Ancestors

**CS Concept: Depth-First Traversal**

`getAllDescendants` walks down the tree recursively:

```
Living Room
├── table                    ← depth 1
│   ├── lantern              ← depth 2
│   └── newspaper            ← depth 2
├── rug                      ← depth 1
└── player                   ← depth 1
    └── sword                ← depth 2
```

The `visited` Set prevents infinite loops if a cycle is accidentally
introduced — defensive programming against corrupted state. The `maxDepth`
parameter caps traversal at 10 levels (a lantern inside a box inside a bag
inside a chest... is unlikely to nest deeper).

`getAncestors` walks up: `sword → player → living-room → (no parent, stop)`.
This is a **linked list traversal** — follow parent pointers one hop at a
time. Used for scope and visibility to determine what chain of containers an
item is nested inside.

### Serialization: Save/Restore

```typescript
toJSON(): { parentToChildren: [...], childToParent: [...] }
loadJSON(data): void  // rebuilds Maps and Sets from plain arrays
```

Maps and Sets are not directly JSON-serializable. `toJSON` converts them to
plain arrays; `loadJSON` rebuilds. This is the "clean snapshot" advantage of
the tree approach — the entire spatial state of the world reduces to a JSON
object for save games.

---

## 3. Room Connections: Directed Graph as Adjacency List

**CS Concept: Adjacency List Representation of a Directed Graph**

Room connections are the one genuinely graph-like structure in Sharpee. Unlike
the containment tree (one parent per item), rooms connect to arbitrary other
rooms via directional exits.

### The Data Structure

Each room stores its own exits as a dictionary of direction → destination:

```typescript
// RoomTrait on the "kitchen" entity
exits: {
  north: { destination: "hallway" },
  east:  { destination: "pantry", via: "pantry-door" },
}
```

**Source**: `packages/world-model/src/traits/room/roomTrait.ts`

This is an **adjacency list** — each node holds a map of its outgoing edges.
The alternative is an **adjacency matrix** (a 2D grid of all possible
connections):

| Representation      | Memory      | "Where does north go?" | "What leads to kitchen?" |
|----------------------|-------------|------------------------|--------------------------|
| **Adjacency list**   | O(edges)    | O(1) lookup            | O(all rooms) scan        |
| **Adjacency matrix** | O(rooms^2)  | O(1) lookup            | O(rooms) scan one row    |

For Dungeo with 191 rooms, a matrix would be 191 x 191 = 36,481 cells,
almost all empty. The adjacency list only stores edges that exist. This is
the right choice for **sparse graphs** — where each node connects to a small
fraction of all other nodes (typically 3-6 exits per room).

### Bidirectional Connections

```typescript
connectRooms(room1Id, room2Id, direction): void {
    const opposite = getOppositeDirection(direction);
    RoomBehavior.setExit(room1, direction, room2Id);   // kitchen.north → hallway
    RoomBehavior.setExit(room2, opposite, room1Id);     // hallway.south → kitchen
}
```

**Source**: `packages/world-model/src/world/WorldModel.ts`

This creates an **undirected edge** using two directed edges. But the system
supports one-way connections too — call `setExit` directly for a chute you
fall down but cannot climb back up. This flexibility comes free from using a
directed graph.

### Edges with Attributes

```typescript
interface IExitInfo {
  destination: string;        // which room you end up in
  via?: string;               // a door entity you must pass through
  mapHint?: IExitMapHint;     // rendering info for the auto-mapper
}
```

**CS Concept: Labeled/Weighted Edges**

The `via` field is a **conditional edge** — movement requires the door entity
to be open. The door itself is an entity in the containment tree (the player
can see it, examine it, unlock it). But it also appears as a property on a
graph edge. The entity system and the graph system reference the same thing
by ID — a clean cross-reference between two data structures.

### Graph Search: findPath

The WorldModel interface declares `findPath(fromRoomId, toRoomId): string[] | null`.
This is a **breadth-first search (BFS)** — it starts at the source room,
explores all neighbors, then all their neighbors, expanding outward until it
reaches the destination.

```
findPath("kitchen", "library")

Step 1: kitchen → neighbors: hallway, pantry
Step 2: hallway → neighbors: kitchen (visited), library ← FOUND
Path: kitchen → hallway → library
```

BFS guarantees the **shortest path** (fewest rooms). Used for NPC navigation
and hint systems.

---

## 4. Visibility: Filtered Tree Traversal

**CS Concept: Tree Traversal with Predicate Filtering**

Visibility answers the physical simulation question: given the laws of IF
physics, what can the player perceive?

**Source**: `packages/world-model/src/world/VisibilityBehavior.ts`

### Three Layered Systems

```
┌──────────────────────────────────────────────┐
│  Scope (What the parser considers)           │  ← Rule engine, indexed registry
│  "Can the player refer to this in a command?"│
├──────────────────────────────────────────────┤
│  Visibility (What the player perceives)      │  ← Tree traversal with filters
│  "Can the player see/feel/notice this?"      │
├──────────────────────────────────────────────┤
│  SpatialIndex (Where things are)             │  ← Bidirectional hash maps
│  "What contains what?"                       │
└──────────────────────────────────────────────┘
```

Each layer adds meaning on top of the one below. The SpatialIndex is pure
structure — no game logic. Visibility adds IF physics. Scope adds parser
intelligence.

### The Walk-Up Algorithm: Line of Sight

To check if the player can see the wrench, walk up the containment tree
from the wrench to the room, checking each container:

```
Can the player see the wrench?

wrench
  └── inside toolbox     ← Is toolbox a container? YES
                           Is it opaque? YES
                           Is it open? NO
                           BLOCKED — can't see inside closed opaque toolbox

Can the player see the sword?

sword
  └── carried by player  ← Is player an actor? YES
                           Actors don't block visibility
  └── in Living Room     ← Is this a room? YES — done
                           VISIBLE
```

This is a **linked list traversal with predicates** — follow parent pointers
via `SpatialIndex.getParent()`, check a condition at each hop. Each hop is
O(1). The number of hops is bounded by nesting depth (capped at 10).

### The Recursive Descent: getVisible

When the game needs to describe a room (LOOK command), `getVisible` walks
down the tree from the room:

```
Living Room
├── mailbox (visible)
│   └── leaflet — is mailbox open? YES → leaflet visible
├── glass case (visible)
│   └── jeweled egg — is case open? NO, but transparent? YES → egg visible
├── locked safe (visible)
│   └── gold coins — is safe open? NO, transparent? NO → coins NOT visible
└── player (skip self)
    └── sword (added separately as "carried items")
```

**CS Concept: Depth-First Tree Traversal with Pruning**

Closed opaque containers are **pruning points** — the recursion stops there,
avoiding unnecessary work. The `seen` Set prevents duplicate entries.

### Darkness: Changing the Traversal Rules

The darkness system does not change the containment tree. It changes the
**traversal rules**:

- **Lit room**: Normal visibility — walk the tree, check containers.
- **Dark room with no light**: Short-circuit. Only two things visible:
  1. What you are carrying (you can feel it).
  2. Lit light sources in the room (they glow).

`hasLightSource` does a full recursive search of the room, then for each
light source found, walks back up with `isAccessible` to check if the light
can "escape" its containers. A flashlight inside a closed opaque box does not
light the room.

**CS Concept: Nested Traversals** — a downward traversal (find lights) with
an upward traversal (check accessibility) at each candidate. For an IF game
with ~20 objects per room, this is negligible. For 10,000 entities in one
room, you would want a dedicated index.

---

## 5. Scope: A Rule Engine with Indexed Lookup

**CS Concept: Production Rule System with Multi-Key Indexing**

Scope determines what the parser should consider as valid targets for a
command. It overlaps with visibility but is not identical — you can see a
painting across the room, but can you take it?

**Source**: `packages/world-model/src/scope/`

### The ScopeRegistry: Triple-Indexed Rule Store

```typescript
class ScopeRegistry {
  private rules: Map<string, IScopeRule>;           // primary store
  private rulesByLocation: Map<string, Set<string>>; // location index
  private rulesByAction: Map<string, Set<string>>;   // action index
  private globalRules: Set<string>;                  // always-apply index
}
```

Three indexes over the same rule set (the same bidirectional indexing idea
as SpatialIndex, but with three dimensions):

```
rules (primary store)
────────────────────
"core.room-contents"  → { rule definition... }
"core.inventory"      → { rule definition... }
"story.magic-mirror"  → { rule definition... }

rulesByLocation (index)              rulesByAction (index)
───────────────────────              ─────────────────────
"dark-cave"  → { "story.echo" }     "taking" → { "core.touchable" }
"tower-top"  → { "story.telescope"} "looking" → { "core.visible" }

globalRules (index)
───────────────────
{ "core.room-contents", "core.inventory" }
```

When the parser asks "what can the player take right now?", the evaluator:

1. Grabs all global rules (always apply) — Set lookup: O(1)
2. Grabs rules for the current room (location-indexed) — Map lookup: O(1)
3. Filters by the current action ("taking") — Map lookup: O(1)
4. Sorts by priority — O(n log n) on a small set
5. Evaluates each rule's condition function
6. Collects all entity IDs from passing rules into a Set

This is a **mini query engine**. The indexes make steps 1-3 fast. Without
them, you would scan all rules every time — acceptable for 10 rules, slow
for 100.

### Scope Levels

The validator uses scope levels to filter candidates:

```
CARRIED   = 4   // in inventory — can manipulate freely
REACHABLE = 3   // can physically touch — required for TAKE, OPEN
VISIBLE   = 2   // can see — required for EXAMINE, LOOK AT
AWARE     = 1   // know it exists (heard, smelled) — for LISTEN, SMELL
UNAWARE   = 0   // doesn't exist to the player
```

These form an **ordered enumeration** — each level includes all levels above
it. If something is REACHABLE (3), it is also VISIBLE (2) and AWARE (1). The
filter check is a simple comparison: `entityScope >= requiredScope`.

### The ScopeEvaluator Cache

```typescript
private cache: Map<string, IScopeEvaluationResult>;
// Key: "actorId:locationId:actionId"
```

**CS Concept: Memoization**

If scope has already been computed for this actor+location+action combination,
return the cached result. The cache is invalidated after any world state
mutation (move, open, close). The key is cheap to construct and unique per
context.

---

## 6. The Parser Pipeline: Data Structure Transformations

When the player types `take brass lantern`, the input passes through a
pipeline where each stage transforms one data structure into another.

### Stage 1: Tokenization — String → Token Array

```
"take brass lantern"  →  [
  { word: "take",    normalized: "take",    position: 0 },
  { word: "brass",   normalized: "brass",   position: 1 },
  { word: "lantern", normalized: "lantern", position: 2 }
]
```

**CS Concept: Lexical Analysis (Tokenization)**

The same first step as any compiler or interpreter. Raw text becomes
structured tokens with normalized forms (lowercased, punctuation stripped)
and positional metadata.

### Stage 2: Grammar Matching — Token Array → Pattern Match Tree

The grammar engine tries each registered rule against the tokens:

```
Rule "take :item"           → match! (confidence 1.0, priority 100)
Rule "take :item from :src" → fail (no "from" token)
Rule "put :item in :dest"   → fail ("take" ≠ "put")
```

**CS Concept: Pattern Matching / Unification**

Each rule is a pattern that either unifies with the input or fails. The
engine collects all successful matches and sorts them by confidence then
priority. This is similar to how Prolog resolves queries against a knowledge
base, or how a parser generator tries grammar productions.

### Stage 3: Slot Consumption — Token Span → Entity Candidates

The matched slot `:item` needs to consume "brass lantern" and find the
actual entity. The EntitySlotConsumer:

1. Gets the scope constraint from the grammar rule (e.g., `.touchable()`)
2. Asks the world model for all touchable entities
3. Matches "brass lantern" against entity names and aliases
4. Returns candidates with confidence scores

**CS Concept: Constraint Satisfaction**

The consumer does not just match text — it checks whether the match makes
sense given world state. The entity must exist, be in scope, and satisfy
trait constraints. This is a **constraint satisfaction problem (CSP)** with
a small search space (typically 15-20 entities in a room).

### Stage 4: Parsed Command — Structured Object

```typescript
{
  action: "if.action.taking",
  directObject: {
    text: "brass lantern",
    head: "lantern",
    modifiers: ["brass"],
    candidates: ["brass lantern"]
  }
}
```

The parser's output is a structured intermediate representation — not yet
a resolved command, but no longer raw text.

### Stage 5: Validation and Disambiguation — Candidates → Resolved Entity

The command validator does definitive entity resolution:

1. **Search** by name, type, synonym, adjective — multiple hash map lookups
2. **Filter** by required scope level — tree traversal for visibility
3. **Score** candidates — weighted sum of match quality factors
4. **Disambiguate** — pick highest score or prompt the player

**Scoring factors**:

| Factor                    | Points |
|---------------------------|--------|
| Exact name match          | +10    |
| Entity type match         | +8     |
| Alias/synonym match       | +6     |
| Adjective match           | +4     |
| Each matching modifier    | +5     |
| In inventory              | +2     |
| Reachable                 | +1     |
| Visible                   | +1     |

If scores tie, the engine produces the classic IF prompt:

```
> take lantern
Which lantern do you mean, the brass lantern or the crystal lantern?
```

**CS Concept: Scoring/Ranking with Weighted Features**

This is a simplified version of the same approach used in information
retrieval (search engines) — compute a relevance score from multiple signals,
rank candidates, pick the best.

### Stage 6: Action Execution — Resolved Command → State Mutation

The action receives resolved entity IDs, executes its four-phase cycle
(validate/execute/report/blocked), and calls `SpatialIndex.addChild()` to
move entities. The cycle continues on the next turn.

### Complete Pipeline

```
"take brass lantern"
    │
    ▼  String
[Tokenize] ─── String → Array of tokens
    │
    ▼  Token[]
[Grammar Match] ─── Token[] → PatternMatch[] (sorted by confidence)
    │
    ▼  PatternMatch
[Slot Consumer] ─── Token span → Entity candidates
    │               ScopeEvaluator → SpatialIndex → VisibilityBehavior
    │
    ▼  IParsedCommand
[Validator] ─── Noun phrases → Resolved entity IDs
    │            Search (hash map) → Filter (tree traversal) → Score (sort)
    │
    ▼  Resolved command
[Action] ─── Execute → SpatialIndex.addChild() to move entities
```

Every stage is a data structure transformation. The parser never touches the
SpatialIndex directly — it goes through scope/visibility. The scope/visibility
layers never touch raw token strings. Clean boundaries, each layer speaking
its own data structure language.

---

## 7. The Grammar System: A Production Rule Engine

**CS Concept: Production Rule System (Expert System Pattern)**

The grammar system is a collection of pattern rules evaluated against input,
producing ranked matches. It is a specialized pattern-matching language — a
miniature programming language for describing what English sentences look like
and what they mean.

**Source**: `packages/parser-en-us/src/grammar.ts`, `packages/if-domain/src/grammar/`

### The GrammarRule Structure

```typescript
interface GrammarRule {
  id: string;                    // "if.action.taking#take_:item"
  pattern: string;               // "take :item"
  compiledPattern: CompiledPattern;
  slots: Map<string, SlotConstraint>;
  action: string;                // "if.action.taking"
  priority: number;              // 100
  semantics?: SemanticMapping;
}
```

A production rule says "this pattern of symbols produces this meaning." In
Sharpee: "the pattern `take :item` produces the action `if.action.taking`
with the `:item` slot filled by whatever the player typed."

### Pattern Compilation

**CS Concept: Compiled Pattern (same idea as compiled regular expressions)**

The raw pattern string is compiled into a `CompiledPattern` — an array of
`PatternToken` objects — at startup. This avoids re-parsing the pattern
string on every player command.

```
Pattern: "put :item in|into|inside :container"

Compiled:
  Index 0: { type: 'literal',    value: 'put' }
  Index 1: { type: 'slot',       value: 'item',      slotType: ENTITY }
  Index 2: { type: 'alternates', value: 'in',         alternates: ['in','into','inside'] }
  Index 3: { type: 'slot',       value: 'container',  slotType: ENTITY }
```

### Pattern Token Types

| Token Type      | Syntax             | What It Matches                    | Example              |
|-----------------|--------------------|------------------------------------|----------------------|
| **Literal**     | `put`              | Exactly that word                  | "put" and nothing else|
| **Alternates**  | `in\|into\|inside` | Any one of those words             | "into" matches       |
| **Slot**        | `:item`            | One or more words, consumed by a slot consumer | "brass lantern" |
| **Optional**    | `[carefully]`      | Zero or one occurrence             | Can be skipped       |
| **Greedy Slot** | `:message...`      | Everything until next pattern element | "hello how are you"|

### The Two Builder APIs

#### `.forAction()` — The Code Generator

```typescript
grammar
  .forAction('if.action.attacking')
  .verbs(['attack', 'kill', 'fight', 'slay', 'murder', 'hit', 'strike'])
  .pattern(':target')
  .build();
```

**CS Concept: Cartesian Product / Macro Expansion**

This single call generates seven grammar rules (one per verb). With two
patterns, it would generate fourteen. It takes a compact specification and
expands it into many rules — the same principle as macros or template
metaprogramming.

The `.directions()` variant is even more dramatic:

```typescript
grammar
  .forAction('if.action.going')
  .directions({
    'north': ['north', 'n'],
    'south': ['south', 's'],
    // ... 10 more directions
  })
  .build();
// Generates 24 rules (12 directions x 2 aliases each)
```

Each generated rule carries **semantic data** — `{ direction: 'north' }` —
so the action knows which direction was intended regardless of whether the
player typed "north" or "n".

#### `.define()` — The Explicit Form

```typescript
grammar
  .define('put :item in|into|inside :container')
  .hasTrait('container', TraitType.CONTAINER)
  .mapsTo('if.action.inserting')
  .withPriority(100)
  .build();
```

One pattern, one rule. Use `.define()` for:

- **Phrasal verbs**: "pick up :item", "put down :item" — `.forAction()`
  expects a single-word verb
- **Preposition patterns**: "put X in Y" has structure between slots
- **One-off commands**: "save", "help", "score" — no verb expansion needed

### Slot Constraints: The Filter Pipeline

**CS Concept: Predicate Chain / Filter Pipeline**

Each `:slot` can have constraints that limit which entities are valid:

```typescript
.where('target', scope => scope
  .touchable()                     // base: must be reachable
  .matching({ portable: true })    // property: must be portable
  .hasTrait(TraitType.CONTAINER)   // trait: must be a container
  .orExplicitly(['special-id'])    // always include this one
)
```

Each method narrows the candidate set:

```
All entities (~500)
  → .touchable()     → entities you can reach (~15)
  → .matching(...)   → those that are portable (~10)
  → .hasTrait(...)   → those with ContainerTrait (~2)
  → .orExplicitly()  → plus one specific entity (3)
```

This is the same pattern as `.filter().filter().filter()` on arrays, or
SQL `WHERE ... AND ... AND ...`. Each step reduces the search space.

### Slot Types and Consumers

**CS Concept: Strategy Pattern (dispatch by type)**

Different slot types are consumed by specialized consumer classes:

| Slot Type        | Consumer              | What It Matches                  |
|------------------|-----------------------|----------------------------------|
| ENTITY           | EntitySlotConsumer    | Entity names in scope            |
| INSTRUMENT       | EntitySlotConsumer    | Tool/weapon entity names         |
| TEXT             | TextSlotConsumer      | Single raw word                  |
| TEXT_GREEDY      | TextSlotConsumer      | All words until next delimiter   |
| QUOTED_TEXT      | TextSlotConsumer      | Text in double quotes            |
| TOPIC            | TextSlotConsumer      | One or more topic words          |
| NUMBER           | TypedSlotConsumer     | Digits or number words           |
| ORDINAL          | TypedSlotConsumer     | "first", "1st", "2nd"           |
| DIRECTION        | TypedSlotConsumer     | Direction vocabulary             |
| VOCABULARY       | VocabularySlotConsumer| Category-based word matching     |

The EntitySlotConsumer handles multi-object syntax automatically:

- `"all"` → `isAll: true` — every applicable entity in scope
- `"X and Y"` → `isList: true` — parsed into separate items
- `"all but X"` → `isAll: true, excluded: [X]`

### Multi-Word Entity Names: The Boundary Problem

**CS Concept: Greedy Parsing with Lookahead**

When the parser sees `put brass lantern in toolbox`, it must determine where
"brass lantern" ends and "in" begins.

The slot consumer looks ahead for the next non-slot pattern element
(`in|into|inside`) and consumes tokens **until it hits one of those
delimiters**:

```
Tokens: "brass" "lantern" "in" "toolbox"
         ^^^^^^^^^^^^^^^^^^^^^^
         Consume until "in" → item = "brass lantern"
```

For **consecutive slots** without a delimiter (`give :recipient :item`), it
tries every possible split point and picks the one where constraints are
satisfied:

```
"give troll brass lantern"

Try: recipient="troll", item="brass lantern"
  → "troll" is an Actor? YES
  → "brass lantern" is an entity? YES → match

Try: recipient="troll brass", item="lantern"
  → "troll brass" is an Actor? NO → reject
```

This is a **brute-force search over partition points** — but with only 3-4
tokens to split, the search space is trivially small.

### Priority and Confidence: Resolving Ambiguity

**CS Concept: Multi-Criteria Sorting**

When multiple rules match, the engine sorts by confidence first, then
priority:

```typescript
matches.sort((a, b) => {
  if (b.confidence !== a.confidence) return b.confidence - a.confidence;
  return b.rule.priority - a.rule.priority;
});
```

**Confidence** starts at 1.0 and decreases:

- Each skipped optional element: multiply by 0.9
- Uncertain slot consumption (partial entity match): reduced further
- Explicit `experimentalConfidence` override on the rule

**Priority** is set by the grammar author:

| Level | Usage                                        |
|-------|----------------------------------------------|
| 150+  | Story-specific patterns (override stdlib)    |
| 110   | Instrument patterns (`with :weapon`)         |
| 100   | Standard patterns (default)                  |
| 95    | Synonyms and alternatives                    |
| 90    | Single-character abbreviations               |

This creates a natural **specificity ordering** — more specific patterns
(more words matched, fewer optionals skipped, higher priority) rank higher.
Similar to CSS specificity: more specific selectors win.

### Semantic Mappings: Preserving Intent

```typescript
grammar
  .define('throw :item at|to :target')
  .withSemanticPrepositions({
    'at': 'at',   // hostile: throw AT the troll
    'to': 'to'    // friendly: throw ball TO the child
  })
  .mapsTo('if.action.throwing')
  .build();
```

The grammar captures not just structure but **intent**. The action reads
`semantics.spatialRelation` and behaves differently for "at" vs "to".

### Story Grammar Extensions

**CS Concept: Open/Closed Principle**

Stories extend grammar via `extendParser()` using the same builder API:

```typescript
extendParser(grammar: GrammarBuilder): void {
  grammar
    .define('incant :spell')
    .fromVocabulary('spell', 'incantations')
    .mapsTo('dungeo.action.incant')
    .withPriority(150)    // beats all stdlib rules
    .build();
}
```

Story rules are appended after core rules but sorted by priority, so they
are checked first. The grammar is closed for modification (core rules don't
change) but open for extension (stories add new rules).

---

## 8. Grammar Catalog

A complete reference of all grammar rules defined in
`packages/parser-en-us/src/grammar.ts`.

### `.forAction()` Rules (Verb Expansion)

Each entry generates one rule per verb listed.

| Action           | Verbs                                              | Pattern        | Constraint             | Pri |
|------------------|----------------------------------------------------|----------------|------------------------|-----|
| `looking`        | look, l                                            | *(none)*       | —                      | 100 |
| `examining`      | examine, x, inspect                                | `:target`      | —                      | 100 |
| `taking`         | take, get, grab                                    | `:item`        | —                      | 100 |
| `dropping`       | drop, discard                                      | `:item`        | —                      | 100 |
| `eating`         | eat, consume, devour                               | `:item`        | —                      | 100 |
| `drinking`       | drink, sip, quaff                                  | `:item`        | —                      | 100 |
| `reading`        | read, peruse, study                                | `:target`      | —                      | 100 |
| `inventory`      | inventory, inv, i                                  | *(none)*       | —                      | 100 |
| `pushing`        | push, press, shove, move                           | `:target`      | —                      | 100 |
| `pulling`        | pull, drag, yank                                   | `:target`      | —                      | 100 |
| `lowering`       | lower                                              | `:target`      | —                      | 100 |
| `raising`        | raise, lift                                        | `:target`      | —                      | 100 |
| `waiting`        | wait, z                                            | *(none)*       | —                      | 100 |
| `quitting`       | quit, q                                            | *(none)*       | —                      | 100 |
| `touching`       | touch, rub, feel, pat, stroke, poke, prod          | `:target`      | —                      | 100 |
| `attacking`      | attack, kill, fight, slay, murder, hit, strike     | `:target`      | —                      | 100 |
| `switching_on`   | turn, switch, flip                                 | `on :device`   | **hasTrait** SWITCHABLE| 100 |
| `switching_off`  | turn, switch, flip                                 | `off :device`  | **hasTrait** SWITCHABLE| 100 |
| `going`          | *(24 direction aliases)*                           | bare direction | **direction** semantic | 100 |

Direction aliases: north/n, south/s, east/e, west/w, northeast/ne,
northwest/nw, southeast/se, southwest/sw, up/u, down/d, in, out.

### `.define()` Rules — No Constraints

| Pattern                             | Action               | Pri | Notes             |
|-------------------------------------|----------------------|-----|-------------------|
| `look at :target`                   | examining            | 95  | phrasal verb      |
| `look [carefully] at :target`       | examining_carefully  | 96  | optional adverb   |
| `look [around]`                     | looking              | 101 | optional word     |
| `search [carefully]`                | searching            | 100 | optional adverb   |
| `search :target`                    | searching            | 100 |                   |
| `look in\|inside :target`           | searching            | 100 | alternates        |
| `look through :target`              | searching            | 100 |                   |
| `rummage in\|through :target`       | searching            | 95  | synonym           |
| `pick up :item`                     | taking               | 100 | phrasal verb      |
| `put down :item`                    | dropping             | 100 | phrasal verb      |
| `go :direction`                     | going                | 100 | where: direction  |
| `save`                              | saving               | 100 | literal           |
| `restore`                           | restoring            | 100 | literal           |
| `restart`                           | restarting           | 100 | literal           |
| `undo`                              | undoing              | 100 | literal           |
| `score`                             | scoring              | 100 | literal           |
| `version`                           | version              | 100 | literal           |
| `help`                              | help                 | 100 | literal           |
| `about`                             | about                | 100 | literal           |
| `info`                              | about                | 100 | synonym           |
| `credits`                           | about                | 100 | synonym           |
| `trace`                             | author.trace         | 100 | debug command      |
| `trace on\|off`                     | author.trace         | 100 | debug command      |
| `trace parser on\|off`              | author.trace         | 100 | debug command      |
| `trace validation on\|off`          | author.trace         | 100 | debug command      |
| `trace system on\|off`              | author.trace         | 100 | debug command      |
| `trace all on\|off`                 | author.trace         | 100 | debug command      |
| `say :message`                      | saying               | 100 | text slot         |
| `shout :message`                    | shouting             | 100 | text slot         |
| `write :message`                    | writing              | 100 | text slot         |
| `exit`                              | exiting              | 100 | bare command      |
| `get out`                           | exiting              | 100 | phrasal verb      |
| `leave`                             | exiting              | 95  | synonym           |
| `climb out`                         | exiting              | 100 | phrasal verb      |
| `disembark`                         | exiting              | 100 | bare command      |
| `alight`                            | exiting              | 95  | synonym           |
| `again`                             | again                | 100 | repeat command    |
| `g`                                 | again                | 90  | abbreviation      |

### `.define()` Rules — Trait Constraints

| Pattern                             | Action          | Constrained Slot | Trait         | Pri |
|-------------------------------------|-----------------|------------------|---------------|-----|
| `open :door`                        | opening         | door             | OPENABLE      | 100 |
| `close :door`                       | closing         | door             | OPENABLE      | 100 |
| `turn :device on`                   | switching_on    | device           | SWITCHABLE    | 100 |
| `turn :device off`                  | switching_off   | device           | SWITCHABLE    | 100 |
| `put :item in\|into\|inside :ctr`   | inserting       | ctr              | CONTAINER     | 100 |
| `insert :item in\|into :ctr`        | inserting       | ctr              | CONTAINER     | 100 |
| `put :item on\|onto :sup`           | putting         | sup              | SUPPORTER     | 100 |
| `enter :portal`                     | entering        | portal           | ENTERABLE     | 100 |
| `get in :portal`                    | entering        | portal           | ENTERABLE     | 100 |
| `get into :portal`                  | entering        | portal           | ENTERABLE     | 100 |
| `climb in :portal`                  | entering        | portal           | ENTERABLE     | 100 |
| `climb into :portal`               | entering        | portal           | ENTERABLE     | 100 |
| `go in :portal`                     | entering        | portal           | ENTERABLE     | 100 |
| `go into :portal`                   | entering        | portal           | ENTERABLE     | 100 |
| `board :vehicle`                    | entering        | vehicle          | ENTERABLE     | 100 |
| `get on :vehicle`                   | entering        | vehicle          | ENTERABLE     | 100 |
| `exit :container`                   | exiting         | container        | ENTERABLE     | 100 |
| `disembark :vehicle`               | exiting         | vehicle          | ENTERABLE     | 100 |
| `get off :vehicle`                  | exiting         | vehicle          | ENTERABLE     | 100 |
| `give :item to :recipient`         | giving          | recipient        | ACTOR         | 100 |
| `give :recipient :item`            | giving          | recipient        | ACTOR         | 95  |
| `offer :item to :recipient`        | giving          | recipient        | ACTOR         | 100 |
| `show :item to :recipient`         | showing         | recipient        | ACTOR         | 100 |
| `show :recipient :item`            | showing         | recipient        | ACTOR         | 95  |
| `tell :recipient about :topic`     | telling         | recipient        | ACTOR         | 100 |
| `ask :recipient about :topic`      | asking          | recipient        | ACTOR         | 100 |
| `say :message to :recipient`       | saying_to       | recipient        | ACTOR         | 105 |
| `whisper :message to :recipient`   | whispering      | recipient        | ACTOR         | 100 |
| `write :message on :surface`       | writing_on      | —                | —             | 105 |

### `.define()` Rules — Instrument Slots

All instrument patterns use priority 110 to beat their simpler counterparts.

| Pattern                                 | Action       | Instrument | Extra Constraint       | Pri |
|-----------------------------------------|--------------|------------|------------------------|-----|
| `take :item from :container with :tool` | taking_with  | tool       | —                      | 110 |
| `unlock :door with :key`               | unlocking    | key        | —                      | 110 |
| `open :ctr with :tool`                 | opening_with | tool       | **hasTrait** OPENABLE  | 110 |
| `cut :object with :tool`               | cutting      | tool       | —                      | 110 |
| `attack :target with :weapon`          | attacking    | weapon     | —                      | 110 |
| `kill :target with :weapon`            | attacking    | weapon     | —                      | 110 |
| `hit :target with :weapon`             | attacking    | weapon     | —                      | 110 |
| `strike :target with :weapon`          | attacking    | weapon     | —                      | 110 |
| `dig :location with :tool`             | digging      | tool       | —                      | 110 |
| `hang :item on :hook`                  | putting      | —          | —                      | 110 |
| `throw :item at :target`               | throwing     | —          | —                      | 100 |
| `throw :item to :recipient`            | throwing     | —          | —                      | 100 |

### Summary by Constraint Type

| Constraint Type        | Where Used                                    | Count |
|------------------------|-----------------------------------------------|-------|
| No constraint          | Most forAction rules, bare commands, meta      | ~85   |
| **hasTrait** OPENABLE  | open, close, open_with                        | 3     |
| **hasTrait** SWITCHABLE| turn/switch/flip on/off                       | 4     |
| **hasTrait** CONTAINER | put in, insert in                             | 2     |
| **hasTrait** SUPPORTER | put on                                        | 1     |
| **hasTrait** ENTERABLE | enter, board, get in/on, exit, disembark      | 11    |
| **hasTrait** ACTOR     | give, offer, show, tell, ask, say to, whisper | 9     |
| **instrument()**       | with :key, with :weapon, with :tool           | 9     |
| **where** (direction)  | go :direction                                 | 1     |

Trait constraints cluster around **physical interaction** (OPENABLE,
CONTAINER, ENTERABLE) and **social interaction** (ACTOR). Most action verbs
(take, drop, push, pull, eat, drink, read) have no grammar-level constraints
— their validation happens in the action's validate phase instead, which has
access to richer context.

---

## Glossary

| Term                   | Definition                                                    |
|------------------------|---------------------------------------------------------------|
| **Adjacency list**     | Graph representation where each node stores its own edges     |
| **Bidirectional index**| Storing a relationship in both directions for O(1) lookup either way |
| **BFS**                | Breadth-first search — explore all neighbors before going deeper |
| **Constraint satisfaction** | Finding values that satisfy all given constraints simultaneously |
| **Depth-first traversal** | Tree/graph traversal that goes deep before going wide       |
| **Filter pipeline**    | Chained predicates, each narrowing the candidate set          |
| **Hash map**           | Key-value store with O(1) lookup (Map, Dictionary, Object)    |
| **Inverted index**     | Mapping from values back to keys (children→parent alongside parent→children) |
| **Lexical analysis**   | Breaking raw text into structured tokens                      |
| **Memoization**        | Caching function results to avoid recomputation               |
| **Production rule**    | A pattern that maps input to output in a rule-based system    |
| **Pruning**            | Skipping branches of a search tree that cannot lead to a valid result |
| **Sparse graph**       | A graph where most possible edges do not exist                |
| **Structural invariant** | A property guaranteed by the data structure itself, not by runtime checks |
| **Tree**               | A graph where every node has exactly one parent (except the root) |
| **Unification**        | Matching a pattern against input, binding variables to matched values |
