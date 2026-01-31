# Fluent Authoring Layer — Research & Ideas

## Motivation

Sharpee's platform layer is stable: traits, actions, capability dispatch, events, grammar, and the language layer all work well. But the **authoring experience** is low-level. A Dungeo-scale story (191 rooms) requires ~674 lines just in the entry point, plus hundreds more across region files, all doing manual entity creation, trait stacking, exit wiring, and capability registration.

A fluent layer would sit **above** the platform, making common patterns concise while keeping the full API available for advanced cases.

## Current Pain Points

### 1. Trait Stacking Verbosity
Every entity requires explicit trait construction and attachment:
```typescript
const mailbox = world.createEntity('small mailbox', EntityType.CONTAINER);
mailbox.add(new IdentityTrait({ name: 'small mailbox', aliases: ['mailbox', 'box'], description: '...', properName: false, article: 'a' }));
mailbox.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
mailbox.add(new OpenableTrait({ isOpen: false }));
mailbox.add(new SceneryTrait());
```

### 2. Manual Connection Wiring
Room exits are mutated through trait access, one direction at a time, with separate "connector" functions for cross-region links:
```typescript
const room = world.getEntity(roomIds.westOfHouse);
room.get(RoomTrait)!.exits[Direction.NORTH] = { destination: roomIds.northOfHouse };
// ... repeat for reverse direction, repeat for every connection
```

### 3. Scattered initializeWorld()
The story entry point mixes entity creation, placement, connection wiring, capability registration, event handlers, scoring setup, and NPC registration — all in one 674-line function.

### 4. State Key Strings
World state is managed via magic strings (`'dungeo.bank.roomIds'`), with no typing or discovery.

### 5. Region Boilerplate
Each region repeats the same pattern: create rooms, create objects, wire internal exits, export connector function, export IDs interface. The structure is consistent but the ceremony is high.

---

## Design Principles for the Fluent Layer

1. **Additive, not replacement.** The fluent layer produces the same WorldModel entities and traits. Authors can mix fluent and raw API freely.
2. **Declarative where possible.** Describe *what* exists; let the builder figure out *how* to wire it.
3. **Composable primitives.** Small building blocks that combine well, not a monolithic DSL.
4. **Pattern-aware.** The 124 DSLM design patterns should map naturally to fluent idioms.
5. **Type-safe.** Room IDs, trait properties, and connections should be checkable at compile time.
6. **No magic.** The fluent layer should be predictable — an author reading the code should understand what WorldModel calls it produces.
7. **Fluent gaps signal platform gaps.** If a design pattern can't be expressed fluently, the problem is usually a missing platform concept, not a missing builder method. The fluent layer is a *lens* for discovering what the platform needs.

---

## Proposed API Sketches

### Rooms & Regions

```typescript
const forest = region('forest')
  .room('clearing', r => r
    .name('Clearing')
    .aliases('forest clearing')
    .outdoor()
    .description('You are in a small clearing in a well-marked forest path.'))
  .room('forest-path', r => r
    .name('Forest Path')
    .aliases('path', 'forest')
    .outdoor()
    .dark()  // or .lit() — dark is more interesting as explicit
    .description('This is a path winding through a dimly lit forest.'))
  .connect('clearing', 'south', 'forest-path')  // bidirectional by default
  .build(world);

// Returns typed IDs: forest.ids.clearing, forest.ids.forestPath
```

**Key ideas:**
- `region()` groups rooms and their internal connections
- `.connect()` is bidirectional by default (one-way via `.connectOneWay()`)
- `.build(world)` materializes everything and returns typed ID handles
- Room builder methods map to traits: `.outdoor()` → RoomTrait config, `.dark()` → isDark

### Cross-Region Connections

```typescript
// After building regions
connect(forest.ids.clearing, 'west', house.ids.behindHouse).build(world);
```

Or declaratively within the story:

```typescript
story.connections([
  [forest.ids.clearing, 'west', house.ids.behindHouse],
  [forest.ids.forestPath, 'north', house.ids.northOfHouse],
  [cellar.ids.entrance, 'up', house.ids.livingRoom, { oneWay: true }],
]);
```

### Objects

```typescript
const sword = object('elvish sword')
  .aliases('sword', 'blade', 'elvish blade')
  .adjectives('elvish', 'beautiful')
  .description('There is a beautiful elvish sword here.')
  .portable()
  .weapon({ damage: 3 })
  .in(forest.ids.clearing)
  .build(world);

const mailbox = object('small mailbox')
  .aliases('mailbox', 'box')
  .description('It\'s a small mailbox.')
  .scenery()
  .container({ maxItems: 5 })
  .openable({ startOpen: false })
  .in(house.ids.westOfHouse)
  .build(world);
```

**Key ideas:**
- `.portable()` is the default (no trait needed — Sharpee's architecture already assumes portability). `.scenery()` opts out.
- `.container()`, `.openable()`, `.lockable()` chain trait configuration
- `.in(roomId)` places the object
- `.build(world)` creates the entity and returns an ID handle

### Containers with Contents

```typescript
const mailbox = object('small mailbox')
  .scenery()
  .container({ maxItems: 5 })
  .openable({ startOpen: false })
  .containing(
    object('leaflet').readable('...')
  )
  .in(house.ids.westOfHouse)
  .build(world);  // Uses AuthorModel internally to bypass closed-container check
```

### NPCs

```typescript
const thief = npc('thief')
  .name('seedy-looking thief')
  .aliases('thief', 'robber')
  .description('A seedy-looking individual with a large bag.')
  .hostile(false)
  .mobile({ forbiddenRooms: [templeId, altarId] })
  .combatant({ strength: 5, health: 10 })
  .behavior('thief', thiefBehavior)
  .in(treasureRoom)
  .build(world);
```

### Doors & Conditional Exits

Doors and gated connections are a very common pattern (DP-001 Lock and Key, DP-102 Gated Regions):

```typescript
const door = door('wooden door')
  .between(hallway, 'north', chamber)
  .lockable({ keyId: brassKey.id })
  .startLocked()
  .startClosed()
  .build(world);

// Conditional gate (no physical door entity)
gate(forest.ids.clearing, 'down', underground.ids.grating)
  .blockedWhen(() => !world.getStateValue('grating.open'))
  .blockedMessage('The grating is locked.')
  .build(world);
```

### Timed Events — Fuses & Daemons (DP-071, DP-400)

```typescript
// One-shot delayed event
fuse('bomb-timer', 20)
  .onExpiry(() => {
    emitEvent('dungeo.event.bomb_explodes');
  })
  .build(world);

// Recurring event
daemon('lantern-drain', 1)
  .every(1)  // every turn
  .while(() => lantern.isOn())
  .onTick(() => {
    lantern.fuel--;
    if (lantern.fuel <= 0) emitEvent('dungeo.event.lantern_dies');
  })
  .build(world);
```

### Patrol Routes (DP-202)

```typescript
npc('guard')
  .patrol([
    { room: gatehouse, pause: 3 },
    { room: courtyard, pause: 1 },
    { room: tower, pause: 5 },
  ])
  .build(world);
```

### State Machines (DP-006)

```typescript
stateMachine('floodgate')
  .states('closed', 'partial', 'open')
  .initial('closed')
  .transition('closed', 'partial', { on: 'turn', message: 'gate.now_partial' })
  .transition('partial', 'open', { on: 'turn', message: 'gate.now_open' })
  .transition('open', 'closed', { on: 'turn', message: 'gate.now_closed' })
  .attachTo(gateEntity)
  .respondTo('if.action.turning')
  .build(world);
```

### Scoring (DP-504)

```typescript
scoring()
  .maxScore(616)
  .onFirstVisit([
    [cellar.ids.treasureRoom, 25],
    [underground.ids.temple, 10],
  ])
  .onFirstTake([
    [sword.id, 10],
    [chalice.id, 15],
  ])
  .onPutInTrophyCase(treasureValues)  // map of item → points
  .ranks([
    [0, 'Beginner'],
    [100, 'Amateur Adventurer'],
    [350, 'Experienced Adventurer'],
    [600, 'Master Adventurer'],
  ])
  .build(world);
```

### Custom Actions

```typescript
action('dungeo.action.say')
  .group('communication')
  .grammar('say :arg')
  .grammar('speak :arg')
  .priority(150)
  .validate(ctx => {
    const text = ctx.argument('arg');
    if (!text) return ctx.block('say.nothing_to_say');
    ctx.share('text', text);
    return ctx.pass();
  })
  .execute(ctx => { /* mutations */ })
  .report(ctx => ctx.message('say.echo', { text: ctx.shared('text') }))
  .blocked(ctx => ctx.message(ctx.error))
  .build();
```

### Conversation (DP-600–605) — REQUIRES PLATFORM WORK

```typescript
// ASK/TELL topic model (DP-600)
conversation(sage)
  .topic('treasure', 'sage.ask_treasure')
  .topic('map', 'sage.ask_map', { requires: 'treasure', reveals: ['location'] })
  .topic('location', 'sage.ask_location', { requires: 'map' })
  .tellTopic('password', 'sage.told_password', {
    onDiscussed: () => world.setStateValue('sage.knows_password', true)
  })
  .defaultResponse('sage.shrugs')
  .build(world);

// Menu dialogue (DP-601)
dialogue(sage)
  .node('greeting', 'sage.greeting', [
    { label: 'Ask about the treasure', next: 'treasure' },
    { label: 'Ask about the map', next: 'map', requires: 'treasure' },
    { label: 'Say goodbye', next: null },
  ])
  .node('treasure', 'sage.treasure_info', { onEnter: markDiscussed('treasure') }, [
    { label: 'Where is it?', next: 'location' },
    { label: 'Back', next: 'greeting' },
  ])
  .build(world);

// Mood (DP-603)
npc('guard')
  .mood('trust', { initial: 50, min: 0, max: 100 })
  .mood('fear', { initial: 0, decay: 2 })
  .build(world);

// Keyword listener (DP-602) — e.g., cyclops responds to "odysseus"
keywords(cyclops)
  .on('odysseus', 'cyclops.correct_answer', { priority: 10,
    onMatch: () => world.setStateValue('cyclops.defeated', true) })
  .on('nobody', 'cyclops.amused', { priority: 5 })
  .default('cyclops.wrong_answer')
  .build(world);
```

**Note:** All of these require platform traits and services that don't exist yet (ConversationTrait, DialogueTrait, MoodTrait, KeywordListenerTrait, parser mode switching). The fluent sketches above show what the *authoring experience* should feel like; the platform work comes first.

### Vehicles (DP-121, DP-312) — REQUIRES PLATFORM WORK

```typescript
const boat = object('magic boat')
  .aliases('boat', 'vessel')
  .description('A sturdy wooden boat.')
  .enterable()
  .vehicle({ terrain: 'water', playerControlled: true })
  .in(riverBank)
  .build(world);
```

**Note:** Requires VehicleTrait and engine-level movement intercept. Without platform support, every vehicle is a bespoke event handler hack.

### Messages (Language Layer)

```typescript
messages('dungeo.say', {
  'nothing_to_say': 'You need to say something.',
  'echo': (data) => `"${data.text}" echoes through the chamber.`,
  'riddle_correct': 'There is a loud rumble as the stone door swings open!',
});
```

---

## Mapping Design Patterns to Fluent Primitives

The 124 DSLM design patterns cluster around these fluent building blocks:

| Fluent Primitive | Patterns Served | Count |
|---|---|---|
| `region()` + `room()` + `connect()` | Geography (DP-1XX): hubs, gates, mazes, layers, portals, vehicles | 22 |
| `object()` + trait chains | Objects (DP-3XX): containers, keys, treasures, readables, vehicles, currency, enchantables | 15 |
| `npc()` + `.behavior()` + `.patrol()` | NPCs (DP-2XX): followers, traders, antagonists, guards | 23 |
| `conversation()` + `.topics()` + `.menu()` | Conversation (DP-6XX): ASK/TELL, menus, keywords, mood, state | 6 |
| `door()` + `gate()` + conditional exits | Puzzles (DP-001, DP-102): locks, gated regions, disguise checks | ~6 |
| `stateMachine()` | Puzzles (DP-006, DP-005): state machines, sequences | ~4 |
| `fuse()` + `daemon()` | Puzzles + Narrative (DP-008, DP-009, DP-400): timing, ticking clocks | ~5 |
| `scoring()` | Structure (DP-504): scoring systems | 1 |
| `action()` + `.grammar()` | Custom verbs across all categories | cross-cutting |
| `messages()` | All categories (language layer) | cross-cutting |
| Event handlers (keep raw API) | Complex puzzles, narrative branching, meta-mechanics | ~20 |

**Coverage breakdown:**
- **~90 patterns** expressible fluently today (assuming platform gaps filled)
- **~15 patterns** need new platform concepts first (conversation, vehicles, currency — see Platform Gaps above)
- **~19 patterns** inherently story-specific, best served by raw API + event handlers (DP-407 unreliable narrator, DP-412 non-linear chronology, DP-415 moral choice, DP-507 meta-mechanics, etc.)

**Key insight:** The fluent layer can't outrun the platform. Conversation is the biggest example — no amount of builder sugar helps if there's no ConversationTrait, no topic tables, no parser mode switching. The fluent design process is valuable precisely because it surfaces these gaps early.

---

## Platform Gaps Revealed by Fluent Analysis

Attempting to express the 124 DSLM design patterns fluently reveals places where the **platform itself** is missing concepts. These aren't fluent layer problems — they need new traits, services, or engine features before any builder can wrap them.

### 1. Conversation System (DP-600–605)

**Gap:** No platform-level conversation support. Stories must build topic tables, keyword matching, menu dialogue, mood tracking, and conversation state from scratch using ad-hoc traits and world state strings.

**Platform needs:**
- `ConversationTrait` — topic tables (ASK/TELL), conditions, unlocks
- `DialogueTrait` — menu-based dialogue tree nodes with options and branching
- `KeywordListenerTrait` — keyword → response maps with priority
- `MoodTrait` — named axes (trust, fear, respect) with numeric values and decay
- `ConversationStateService` — tracks discussed topics, visit counts, per-NPC history
- Parser mode switching for menu dialogue (number input during conversation)
- Engine support for "conversation mode" turn handling

**Impact:** 6 conversation patterns + DP-021 (dialogue puzzle) + DP-200 (information source) + DP-205 (gatekeeper) + DP-214 (relationship-tracked) all benefit. This is the single largest gap — conversation is the most common NPC interaction in parser IF and currently has zero platform support.

### 2. Vehicle System (DP-121, DP-312)

**Gap:** No concept of a mobile container whose location changes and carries its contents. The engine assumes the player walks between rooms; there's no "player is inside X, X moves to room Y" path.

**Platform needs:**
- `VehicleTrait` — terrain type, valid stops, fuel, player-controlled vs automated
- Engine intercept for movement while inside a vehicle (move vehicle, not player)
- ContainerTrait already supports `enterable`, but movement semantics are missing
- Room description delegation (describe room from vehicle's perspective)

**Impact:** Boats, carts, elevators, balloons — very common in classic IF (Zork's magic boat, Enchanter's balloon). Without this, every vehicle is a one-off hack.

### 3. Currency / Trade System (DP-313, DP-203)

**Gap:** No numeric value on items and no trade transaction mechanics. The trader NPC pattern (DP-203) exists but has no platform support for pricing, purchasing, or currency tracking.

**Platform needs:**
- `CurrencyTrait` — value, denomination
- Trade action or capability behavior for BUY/SELL verbs
- Abstract currency tracking (world state counter vs physical coins)
- Price display in EXAMINE output

**Impact:** Moderate — many games don't have economies. But when they do, the current approach is entirely custom.

### 4. Enchantment / Spell System (DP-314, DP-008)

**Gap:** No platform concept for objects that gain or change properties through magical actions. Transformation (DP-008) is a puzzle pattern but the *object type* that receives transformations has no trait support.

**Platform needs:**
- `EnchantableTrait` — valid enchantments, current state, charges
- Spell/ritual action pattern (CAST X ON Y, ENCHANT Y WITH X)
- Property modification semantics (enchantment changes IdentityTrait description, adds capabilities)

**Impact:** Essential for fantasy IF (Enchanter trilogy, Hadean Lands). Low priority for realistic fiction.

### 5. Inventory Capacity Enforcement (DP-023)

**Gap:** `ActorTrait` has a `carryCapacity` field but the taking action's validate phase may not enforce it consistently. Weight/volume tracking across nested containers is not automatic.

**Platform needs:**
- Verify taking action checks `carryCapacity.maxItems` and `maxWeight`
- Recursive weight calculation for nested containers
- Standard "you're carrying too much" message in lang-en-us
- ContainerTrait capacity enforcement on INSERT

**Impact:** Classic IF mechanic. May already partially work — needs audit.

### 6. Adaptive / Meta Systems (DP-507, DP-509)

**Gap:** No engine hooks for meta-commands (UNDO, SAVE, RESTORE) as game events. The engine treats these as system operations invisible to the story.

**Platform needs:**
- Emit events on SAVE, RESTORE, UNDO, RESTART (opt-in, story can listen)
- Turn counter / failure counter accessible to story code
- Hint request tracking

**Impact:** Niche but powerful. Spider and Web, Save the Date, Undertale-style meta-awareness.

### 7. Verbose/Brief Mode (DP-510)

**Gap:** No platform-level room description mode. Stories can't easily switch between verbose (describe every visit) and brief (describe only first visit) without custom logic.

**Platform needs:**
- Player preference for description mode (verbose/brief/superbrief)
- Room visit tracking (already exists via scoring? needs verification)
- Description rendering respects mode setting
- Standard VERBOSE/BRIEF/SUPERBRIEF commands

**Impact:** Basic IF convention. Should be platform, not story code.

### Priority Order

| Gap | Priority | Reason |
|-----|----------|--------|
| Conversation system | **High** | Most common NPC interaction, 10+ patterns affected |
| Verbose/brief mode | **High** | Basic IF convention, trivial to implement |
| Inventory enforcement | **High** | May already work — needs audit, small fix if not |
| Vehicle system | **Medium** | Common in classic IF, complex to implement |
| Currency/trade | **Low** | Niche, only a few patterns need it |
| Enchantment system | **Low** | Genre-specific (fantasy) |
| Meta-event hooks | **Low** | Niche, experimental |

---

## What NOT to Fluent-ify

Some things should stay as raw API:

1. **Complex puzzle logic.** Multi-entity interactions with custom validation are better as explicit code than a constrained DSL.
2. **Narrative branching.** Multiple endings (DP-403) and moral choices (DP-416) need real code, not builder patterns.
3. **Custom traits.** Defining new trait types with unique properties is a platform-level concern.
4. **Event handler bodies.** The code inside event handlers is arbitrary — a builder can't abstract that.

The fluent layer should make the **common 80%** concise and leave the **interesting 20%** to real TypeScript.

---

## Implementation Considerations

### Where Does It Live?

**Option A: New package `@sharpee/fluent`**
- Clean separation from platform
- Story imports both `@sharpee/world-model` and `@sharpee/fluent`
- Can evolve independently

**Option B: Extension methods on WorldModel**
- No new package
- `world.room(...)` instead of `room(...).build(world)`
- Tighter coupling

**Recommendation: Option A.** The fluent layer is a convenience library, not a platform change. It should import platform types but not modify them. Stories opt in by importing from `@sharpee/fluent`.

### Build-Time vs. Runtime

The fluent builders run at **story initialization time** (inside `initializeWorld()`). They produce standard WorldModel entities. There is no runtime overhead — once built, the fluent layer is not involved in gameplay.

### Migration Path

Authors can adopt incrementally:
1. Use `region()` for new regions, keep existing ones as-is
2. Use `object()` for new items
3. Convert regions one at a time
4. The fluent layer and raw API coexist in the same `initializeWorld()`

### Type Safety

Room and object builders should return **typed ID handles**, not strings:

```typescript
const forest = region('forest')
  .room('clearing', ...)
  .room('path', ...)
  .build(world);

// forest.ids is typed as { clearing: string; path: string }
// Misspelling 'clearng' is a compile error
```

This is achievable with TypeScript's template literal types and builder pattern generics, though the implementation is non-trivial.

---

## Open Questions

1. **How far should grammar integration go?** Should `action().grammar()` register grammar automatically, or should grammar stay in `extendParser()` for visibility?

2. **Should regions own their objects?** The current pattern separates room creation from object placement. The fluent layer could inline objects into rooms (`.containing()`) or keep them separate. Both have merits.

3. **AuthorModel transparency.** Placing items in closed containers requires AuthorModel. Should the fluent layer use it automatically (convenient but hides the bypass), or require explicit opt-in?

4. **Validation at build time.** Should `.build()` validate connections (no dangling room IDs, no one-way dead ends)? This catches errors early but adds complexity.

5. **DSLM integration.** The DSLM model generates TypeScript code. Should it target the fluent API (more concise output) or the raw API (more explicit, less abstraction to learn)? Fluent API seems like the better target for generated code.

6. **Story-level vs. platform-level.** Some patterns (scoring, hints) feel like they could be platform features rather than fluent sugar. Where's the line?

7. **Conversation system scope.** The conversation gap is the largest. Should we build a full conversation engine (ASK/TELL + menu + keywords + mood + state) as a platform package, or start with ASK/TELL only and iterate?

8. **Vehicle scope.** Vehicles need engine-level movement interception. Is this a plugin (like plugin-npc, plugin-scheduler) or core engine?

---

## Next Steps

### Track 1: Fluent Layer (no platform changes needed)
1. **Prototype `region()` + `room()` + `connect()`** — highest boilerplate reduction
2. **Prototype `object()` with trait chains** — second-highest value
3. **Convert one Dungeo region** to validate the API feel
4. **Iterate on type safety** — ensure typed IDs work with TypeScript inference
5. **Write an ADR** once the API shape stabilizes

### Track 2: Platform Gaps (required for full pattern coverage)
1. **Audit inventory enforcement** — verify carrying capacity is checked in taking action validate phase; fix if not (quick win)
2. **Add verbose/brief mode** — player preference + room visit tracking + VERBOSE/BRIEF commands (quick win)
3. **Design conversation system** — ADR for ConversationTrait, DialogueTrait, MoodTrait, parser mode switching. This is the biggest gap and needs careful design before implementation.
4. **Design vehicle system** — ADR for VehicleTrait, engine movement intercept. Medium complexity.
5. **Meta-event hooks** — emit events on SAVE/RESTORE/UNDO. Low priority but easy.

### Track 3: DSLM Integration
1. **Evaluate DSLM targeting** — can the model generate fluent code more reliably than raw API?
2. **Update DSLM training data strategy** — pattern implementations should target fluent API
3. **Conversation patterns in training data** — once platform + fluent layer exist, generate spec-to-code pairs for DP-600–605
