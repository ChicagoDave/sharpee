# Text and logic layout diagrams

Two reference diagrams, both drawn from code in-tree on 2026-08-19.
Hard-wrapped at 78 columns.

1. [Turn output ordering](#1-turn-output-ordering) — ADR-296 (within-turn
   order) feeding ADR-300 D8/D9 (channels and the default client's flush).
2. [Traits and composition](#2-traits-and-composition) — the entity/trait/
   behavior split and where inheritance is still used.
3. [An action applying to two things](#3-an-action-applying-to-two-things)
   — the Inform 7 comparison, traced through throwing.

---

## 1. Turn output ordering

### A. Order within one turn

`sortEventsForProse` — `packages/engine/src/prose-pipeline/stages/sort.ts`

```
turn events
  │
  ├─ lifecycle first ──► game.started / starting / loading /
  │                      loaded / initialized
  │                      (banner rides here — contract rule 4)
  │
  └─ then transactions, in occurrence order (rule 3)
       txn:{turn}:action ─► txn:{turn}:plugin:{id}, priority order
       an ABSENT _transactionId never groups — not even with
       another absent one (D1, closes GH #208 structurally)

     inside one transaction — the slot frame (D2/D3):

       ┌ implicit-take fixture ─► if.event.implicit_take (always 1st)
       │
       ├ beforeRoomDescription ─► _narrativeSlot stamped, opt-in
       │
       ├ ANCHOR CLUSTER ────────► if.event.room.description
       │                          + if.event.list.contents…
       │                          (skips if.event.illustrated)
       │
       ├ afterRoomDescription ──► chained phrases — DEFAULT slot
       │
       ├ …unstamped events keep emission position (rule 1)…
       │
       └ afterEverything ───────► transaction-final

     no anchor (TAKE, blocked move)? the frame collapses around
     the primary report event = first event carrying data.messageId
```

### B. Blocks → channels → the default client

ADR-300 D8/D9

```
block key (CORE_BLOCK_KEYS)  channel id
───────────────────────────  ──────────────────────────────────────
room.name                ──► room-name
room.description         ──► room-description
room.contents            ──► room-contents
action.result            ──► action-result
action.blocked           ──► action-blocked
error                    ──► error
game.message             ──► game-message
game.banner              ──► banner  (BANNER_KEYS; record-valued:
                                      title, storyVersion,
                                      platformVersion, credits[],
                                      tail[])
status.room|score|turns  ──► location / score / turn  (world state,
                                                       not prose)
prompt                   ──► prompt

routing table: packages/stdlib/src/channels/keys.ts

       ┌──────────────────────────────────────────────────┐
 all 7 │ preferred-layout   (mode: replace, emit: always) │
  ────►│ ["room-name","room-description","room-contents", │
       │  "game-message", …]                              │
       │ one entry per prose entry emitted, in block order│
       └──────────────────────────────────────────────────┘

default client — packages/platform-browser/src/channels/prose.ts

  prose renderers BUFFER (never append on arrival)
        │
        ▼
  preferred-layout arrives LAST ─► composeProse(payload)
        walks the layout list, taking each named channel's
        NEXT unconsumed entry; a repeated id means that channel
        emitted twice, and its cursor advances
        │
        ▼
  joinProseEntries: blank line between entries,
                    single \n when entry.tight
        │
        ▼
  one <p class="main-entry prose-{channel}"> per entry
```

### Trip-wires

`preferred-layout` **must** be registered after the prose channels
(stdlib's `STANDARD_CHANNELS` does, pinned by a test) or the flush fires
against an empty buffer.

`main` no longer exists, so a new surface that ignores `preferred-layout`
renders in manifest order — wrong the moment an action result precedes a
room name.

`messageId` is not an ordering key. It does two jobs: it marks an event
as phrase-bearing (the anchor-less collapse point in A), and it is the
ADR-296 D4 partition — a `game.message` against a trigger that already
has a `messageId` stays an ADR-106 override rendering at the trigger's
position; against a messageless trigger it becomes a standalone,
slot-placed phrase.

---

## 2. Traits and composition

Grounded in `packages/world-model/src/`.

### A. The shape: one entity class, a trait map

```
IFEntity  ── the ONLY entity class (no Room/Door/Container subclasses)
  │
  ├─ id, type
  └─ traits: Map<TraitType, ITrait>
       │
       ├─ 'container' ─► ContainerTrait  { capacity, isTransparent,
       │                                   enterable, allowedTypes… }
       ├─ 'openable'  ─► OpenableTrait   { isOpen, … }
       ├─ 'lockable'  ─► LockableTrait   { isLocked, keyId, … }
       └─ 'identity'  ─► IdentityTrait   { name, description, … }

  API: has / hasAll / hasAny / get / add / remove / getTraits

a locked chest is not a subclass of anything —
  entity.add(new ContainerTrait())
        .add(new OpenableTrait())
        .add(new LockableTrait())
        .add(new IdentityTrait())

what inheritance would have forced instead:
  Item
   └ Container
      └ OpenableContainer
         └ LockableOpenableContainer
              …and a lockable DOOR needs those same three from a
              different root, so the tree forks or duplicates
```

### B. Data / logic / coordination — the three-layer split

```
DATA                     LOGIC                    COORDINATION
───────────────────      ─────────────────────    ──────────────────
ContainerTrait           ContainerBehavior        taking action
implements ITrait        extends Behavior         (stdlib)
static readonly type     static requiredTraits    validate / execute
readonly type              = [CONTAINER]          / report / blocked
                         static methods only
fields only —            OWNS every mutation      owns NO mutation;
NO methods               to ContainerTrait        calls behaviors and
                         returns result objects   emits events
                         (IAddItemResult…)

  traits/container/containerTrait.ts     ← data
  traits/container/containerBehavior.ts  ← logic (co-located)
  behaviors/behavior.ts                  ← the shared base
```

`Behavior` gives subclasses only `require()` (throws on missing trait),
`optional()`, `validateEntity()`, `getMissingTraits()` — trait access
helpers, not domain logic.

### C. Dispatch: how an action finds the right trait

```
trait declares what it answers for (ADR-090):

  class TrollAxeTrait implements ITrait {
    static readonly capabilities = ['if.action.taking']
    static readonly interceptors = [ … ]        ← ADR-118
  }

action asks, before running its standard logic:

  findTraitWithCapability(entity, IFActions.TAKING)
        │
        └─► walks entity.traits.values()
            reads trait.constructor.capabilities
            first match wins → undefined means "no claim,
            run the standard path"

  world-model/src/capabilities/capability-helpers.ts
  also: hasCapability(entity, actionId)

so a story adds a verb-blocking behaviour by adding a TRAIT,
never by subclassing or patching the action
```

### D. Where inheritance is used on purpose — two places

```
Behavior (abstract)          ← 21 subclasses in world-model.
                               Shares trait-access helpers only;
                               no domain state, no overridden logic.

WallEntity extends IFEntity  ← exactly 1, ADR-173. A wall is a
                               two-room adjacency with per-side data
                               keyed by the room you see it from —
                               structure a trait map can't express.
                               Authors never construct it; they call
                               WorldModel.createWall.
```

### E. The registration cost of composition

A new trait must be exported at three barrel levels or you get a runtime
`"X is not a constructor"`:

```
traits/<your-trait>/index.ts  ─►  traits/index.ts  ─►  src/index.ts
                                  then rebuild dist/ AND dist-esm/
```

The trade the architecture is making: composition moves the cost from
*design time* (getting a hierarchy right before you know the game) to
*registration time* (three barrel lines, mechanical, caught by a loud
runtime error). The `is*` convenience getters on `IFEntity`
(`isContainer`, `isLockable`, `isOpen`…) are sugar over `traits.has()` —
they read like a type test but never imply a class.

---

## 3. An action applying to two things

Inform 7 declares a two-noun action in one place:

```
Throwing it at is an action applying to two things.
Understand "throw [something] at [something]" as throwing it at.
Check throwing it at: ...
Carry out throwing it at: ...
Report throwing it at: ...
```

Sharpee splits that across five layers, each owned by a different
package. Traced end to end for `throw bottle at troll`.

### A. The pipeline

```
> throw bottle at troll
   │
   ▼
GRAMMAR — packages/parser-en-us/src/grammar.ts
   grammar.define("throw :item at :target")
          .mapsTo("if.action.throwing").build()

   the "Understand" line. 9 patterns map to this one action:
   throw/toss/hurl × (bare | at :target | to :recipient)
   │
   ▼
PARSER — packages/parser-en-us/src/english-parser.ts
   slot → object assignment, by POSITION not by name:

     slot position 0  ──►  directObject     (:item   = "bottle")
     slot position 1  ──►  indirectObject   (:target = "troll")
     .instrument("x") ──►  instrument slot, never becomes an object
     anything further ──►  extras{}  (throwing reads extras.direction)

   a handful of patterns are named special cases ahead of the
   positional rule (give/show recipient-first, :item from :container)
   │
   ▼
VALIDATOR — packages/stdlib/src/validation/command-validator.ts
   resolves each noun phrase to an entity at that SLOT'S scope level,
   read from the action's own metadata
   │
   ▼
ACTION metadata — this is "applying to two things"
   metadata: {
     requiresDirectObject:   true,
     requiresIndirectObject: true,
     directObjectScope:   ScopeLevel.REACHABLE, // allows implicit take
     indirectObjectScope: ScopeLevel.VISIBLE    // throw at what you
   }                                            // cannot reach
```

The two slots carry **different** scope levels — the thing you throw
must be reachable (so `throw bottle at troll` can implicitly take the
bottle off the floor), the thing you throw at need only be visible.
One I7-style "applying to two things" cannot say that; two independent
slot declarations can.

### B. Check / Carry out / Report → the four phases

```
Inform 7                   Sharpee (ADR-051)
────────────────────────   ────────────────────────────────────────
Check throwing it at       validate(ctx): ValidationResult
                             reads BOTH slots; returns
                             { valid: false, error: 'target_not_here',
                               params: { target } }

Carry out throwing it at   execute(ctx): void
                             mutates the world, fills sharedData
                             (throwType, willBreak, finalLocation…)

Report throwing it at      report(ctx): ISemanticEvent[]
                             emits if.event.thrown carrying
                             messageId `if.action.throwing.thrown_at`

Instead of throwing…       blocked(ctx): runs when validate failed
```

`validate` is where "two things" becomes conditional rather than
structural: `item` is required (`no_item` otherwise), while `target` is
optional — absent it, the action falls through to a directional throw
(`extras.direction`) or a general one. So the same action id serves
`throw bottle at troll`, `throw bottle north`, and `throw bottle`.

### C. Where a story hooks in — without touching the action

```
1. CAPABILITY DISPATCH (ADR-090)  — the target claims the verb
     findTraitWithCapability(target, IFActions.THROWING)
     → the trait's behavior runs execute AND report instead

2. INTERCEPTOR LIFECYCLE (ADR-228) — both slots are consulted
     throwingLifecycle.slots:
       ┌ 'item'   ──► ctx.command.directObject?.entity
       └ 'target' ──► ctx.command.indirectObject?.entity
     each seeded with { itemId, itemName, targetId, targetName },
     direct object FIRST (D3-B order). Not a single winner: an
     explosive can react to being thrown AND a glacier can react
     to being hit, in the same command.
     hooks: preValidate / postValidate / postExecute / postReport
            / onBlocked

3. EVENT HANDLERS (ADR-052) — react to if.event.thrown after the fact
```

### D. Text

The action declares 24 message ids in `requiredMessages` (`thrown_at`,
`hits_target`, `misses_target`, `bounces_off`, `target_ducks`,
`target_catches`, `breaks_against`…). It never writes a sentence —
`report` puts `if.action.throwing.<id>` plus params on the event, and
`@sharpee/lang-en-us` renders it.

### E. The count

One I7 declaration ≈ five Sharpee edit sites:

```
parser-en-us/src/grammar.ts              the patterns
stdlib/src/actions/constants.ts          the action id
stdlib/…/throwing/throwing.ts            metadata + four phases
stdlib/…/throwing/throwing-events.ts     the event payload types
lang-en-us                               every message id
```

That is the cost. What it buys: per-slot scope, per-slot interceptors,
a typed event payload other systems can read, and text that lives in
one locale package rather than inside the rule that fired it.
