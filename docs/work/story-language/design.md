# The Sharpee Story Language — Consolidated Design

**Status:** Design consolidation (2026-07-10). No implementation.
**Lineage:** `docs/work/fluent/research-ideas.md` → `docs/work/fluent/dream-cloak.md`
→ `docs/work/story-language/sketch.md` (**superseded by this document**) → givens-driven
redesign (session 2026-07-10).

The earlier sketch started from what other IF languages look like. This design starts
from Sharpee's architecture and derives the language from a set of givens. Everything
here compiles to platform mechanisms that already exist, except where explicitly
flagged as a platform discussion item (§8).

---

## 1. The Givens

The design axioms, in the order they were established:

1. **Sharpee has Traits, Behaviors, and Messages. Sharpee is composable.**
   The language's primitives are the platform's primitives. Entities are compositions
   of traits; traits are data; behaviors own logic and mutations; messages own all
   player-facing text. Kinds (room, thing, person) are trait bundles (ADR-189), not
   structural primitives.

2. **Sharpee grammar is action/verb oriented.**
   The player-facing surface is verbs mapping to action IDs (ADR-087). Actions are the
   four-phase unit. Capability dispatch (ADR-090) joins traits to actions. The language
   is a matrix of actions × traits, with behaviors at the intersections.

3. **All text must be registered in the Language Provider.**
   Prose lives inline in source as notation only; the loader registers every block
   under a message ID at story start; runtime emits IDs + params. Nothing can bypass
   the registry, because registration is what the loader *does* with prose.

4. **Behavior bodies use common structured control flow.**
   if-then-else, select blocks, iterate-through, explicit `end` terminators. Domain
   statements (`refuse`, `phrase`, `set`, `change`, `move`, `emit`, `award`, `win`,
   `lose`) inside conventional blocks — no clever clause grammar.
   *(Amended 2026-07-11, ownership package, David: "If can be dropped.")*
   **if-then-else is removed.** Validation guards are `must`-form requirements
   (`it must be hungry: already-fed`); moment conditionals are the statement
   `when` suffix (`award farewell when the player can see it`); `select` blocks
   remain the branching construct. And `change` is **gated to declared named
   states**, where the boolean gate is pattern detection, not a reserved-word
   list (David's clarification, 2026-07-11): catch any author implementing
   pos/neg states and encourage real states. Three rings — literal booleans
   (`true`/`false`/`yes`/`no`: error, no cheating); platform-shadow pairs
   (`open`/`closed` etc.: error, compose the owning trait instead); and
   negation-shaped pairs (`fed`/`unfed`, `not-X`, `un-X`, `non-X`, `X-less`:
   error with an encouraging fix-it). The principle the diagnostic teaches:
   a state names what the thing IS, never the absence of another state — the
   unfound positive name is where the domain insight lives (`fed: flag` →
   `hungry`/`content`).

5. **Counting up and down is implied — the author defines no counting mechanism at
   all.** No counters, no count queries. The syntax differentiates multiple events by
   ordinal (`first time`, `third time`), by turn (`at turn 5`, `5 turns later`), by
   occurrence-ordered selection (`select ordered`), or accumulates into **named
   ordered states** (`states: intact, trampled, obliterated`). Quantities may exist in
   *data* (capacity, weight); counting as an authored *mechanism* does not exist.

6. **Text emission is not a print statement.** It declares a semantic message,
   rendered post-turn by the text service through the phrase algebra. The keyword is
   `phrase`, not `say`. One statement per species: `set`/`change`/`move` (traits),
   `emit` (events), `phrase` (messages), `refuse` (block + explaining phrase).

7. **Selection criteria must be author- and programmer-friendly.** The failure mode
   to avoid is Inform 7's *open* English grammar (many phrasings, unpredictable
   acceptance). The countermeasure is a **closed grammar**: one canonical form per
   concept, explicit composition, small enough for a one-page reference. When
   English-ness and regularity conflict, regularity wins.
   **Meta-rule:** modifiers are adverbs — one word wherever English has one
   (`randomly`, not `at random`; `ordered`, not `in order`). A multi-word form is
   admitted only when no single word exists; no current modifier qualifies.

8. **Global true/false flags are forbidden.** (David, 2026-07-11, from the Phase B
   DDD review — docs/work/chord/ddd-review.md.) There is no global boolean
   namespace; `define flag` is removed from the language. Every fact is either
   *derived* — a condition over world state (`dark while the player has the velvet
   cloak`) — or *owned* — declared data or `states:` on the object the fact is
   about. A global boolean flattens a state machine and shadows world truth; all
   three Zoo flags (`gate-closed`, `after-hours`, `feeding-time-active`) failed
   exactly this way. Entity-owned boolean fields were initially exempted, then
   removed too (David, 2026-07-11 follow-up): the `flag` field type leaves trait
   data, replaced by **trait-declared states** — feedable's `fed: flag` was the
   `hungry`/`content` state machine in disguise (its own already-fed message said
   "contentedly full"), and it stored the wrong fact besides (one-shot feeding
   under a recurring feeding-time schedule). Booleans are gone from the language
   at every scope.
9. **Stickiness: all behaviors belong to "something."** (David, 2026-07-11 —
   promoted from the Phase B DDD review.) Behavior sticks to the data it operates
   on — foundational DDD. Not just state: rules, reactions, and schedules attach
   to the object they are about. A rule about entering the Aviary lives on the
   Aviary, not in a floating `when` block; a vignette about the goats lives on the
   goats. The story itself is an object — declared `states:` and data on the story
   header — and is the sanctioned home ("cheat" location) for genuinely
   story-scoped behavior: schedules, phases, endings, vocabulary. Type
   definitions (`define trait`, `define action`) are unaffected: they declare
   *kinds* of something, and their clauses are sticky to whatever composes them.
   Together with given 8 this deletes Chord's unsticky half (floating `when`/
   `once`/`every` rules, global flags, orphan phrase keys) rather than adding a
   construct — the sticky forms (on-clauses, trait clauses, per-entity phrases)
   already exist and are the language at its best.

---

## 2. Language Overview

A `.story` file contains declarations of the three species plus the constructs that
bind them:

Declarations are verb-led, and the verb names the compile target: **`create`**
(authorial) instantiates into the **world model**; **`define`** (programmatic)
declares into **registries**. Temporal rules (`when`/`once`/`every`) were already
verb-led and stay bare.

| Declaration | Introduces | Compiles to |
|---|---|---|
| `story "..." by "..."` + header fields | metadata | `StoryConfig` |
| `create <name>` | entity = name + composed kind/traits | `createEntity` + traits (kind nouns are ADR-189 default-trait bundles) |
| `define trait X` | data + phrases + `on` behavior clauses | trait registration + capability behaviors / interceptors |
| `define action X` | grammar patterns, scope, generic refusals, standard mutation, responses | `Action` (four-phase) + parser grammar |
| `define phrase X` | registered text; may carry variants and strategies | Language Provider registration; producers for variants |
| `define phrases <locale>` | a block of keyed templates | bulk registration (localizable form) |
| `define condition X: <cond>` | a named condition | reusable predicate |
| `define verb X or Y means <pattern>` | vocabulary mapping | `CustomVocabulary` / story grammar |
| `when <event-header> ... end when` | a story rule | EventProcessor handler |
| `once <cond>` / `every N turns [, N times]` / `define sequence` | temporal rules | scheduler daemons / fuses (chained) |
| `define flag X starts <v>` / value declarations | typed story state | namespaced world state |
| `states: a, b, c` (on an entity) | ordered states | state-machine plugin / trait enum |
| `define text X from "./mod.ts"` | escape hatch | named TS export bound at load |

`define phrase` declaring and bare `phrase` emitting resolves the earlier
declaration/emission overload. `create` blocks are dedent-terminated (properties
and prose only); `define` blocks carry control flow and keep explicit `end`
terminators.

### 2.1 Entities are compositions

```
create the brass hook
  aka hook, peg
  scenery, a supporter with capacity 1
  in the Cloakroom

  It's just a small brass hook, screwed to the wall.
```

The first bare indented paragraph is the description (registered as a phrase, per
given 3). Composition lines follow one grammatical rule: **kind bundles are nouns
and take an article** (`a room`, `a supporter`, `a person`); **traits are
adjectives and don't** (`wearable`, `scenery`). No kind noun means a plain thing.
Configuration rides on `with`, settings joined by `and` — `a supporter with
capacity 1`, `a container with max items 5 and max weight 20` — never
parenthesized config.
This keeps kinds unprivileged (given 1) — they are composition terms, not header
syntax. `in`/`on`/`wears` lines are placement. Conditional composition
(`chatty while not after-hours`) is flagged in §8.

### 2.2 Traits carry data, phrases, and behavior clauses

```
define trait lockable
  data
    locked: flag
    key: entity

  phrases en-US
    locked: "{capitalize the item} {verb:is item} locked."

  on opening it, before openable
    if locked then
      refuse locked
    end if
  end on
end trait
```

- `on <action> it` — clause binds when the trait is on the **target**.
- `on <action> anything as the <role>` — clause binds by **role** (e.g. the
  container capacity check binds when the trait is on the *taker*). Roles are
  declared by the action (target, actor/taker, instrument).
- `before X` / `after X` — explicit ordering between traits contributing to the
  same action; declaration order otherwise.

### 2.3 Actions own grammar and coordination

```
define action taking
  grammar
    take :item
    get :item
    pick up :item
    grab :item
    take all            → each reachable item not already held
    take all but :exceptions
  the item must be reachable

  refuse without item: no-target
  refuse when the item is you: cant-take-self
  refuse when you already hold the item: already-have
  refuse when the item is a room: cant-take-room
  otherwise refuse cannot-take

  move the item to you
  award the item's points, once

  emit taken
  if the previous location is a container or a supporter then
    phrase taken-from
  else
    phrase taken
  end if
```

- Multi-object commands are **grammar cardinality** (`take all → each …`); the
  engine owns expansion, per-item validate/execute, and the multi response format.
- Each action declares its **context values** (`the item`, `the taker`,
  `the previous location`) — enumerable and completable.
- The action is the refusal owner of last resort; traits contribute the rest.

### 2.4 Behavior bodies (given 4)

Statements: `refuse <phrase> [with <param> = <value>]`, `phrase <phrase>`,
`emit <event>`, `set <field> to <value>`, `change <entity> to <state>`,
`move <entity> to <place>`, `award`, `win [<phrase>]`, `lose [<phrase>]`.

Blocks: `if <cond> then … else … end if`, `select on <value> … end select`,
`select <strategy> … or … end select`, `iterate through each <description> …
end iterate`, ordinal blocks (`first time`, `third time`) inside rules.

### 2.5 No counting (givens 5–6)

Four number-free forms cover what counters did:

```
when the player enters the Foyer Bar while in-darkness
  phrase stumble
  first time
    change the message to trampled       ← ordinal blocks
  third time
    change the message to obliterated
end when
```

```
states: intact, trampled, obliterated    ← ordered states carry accumulation
```

```
define sequence closing time
  at turn 5
    phrase zoo.pa.closing-3 …
  5 turns later                          ← timeline chaining
    phrase zoo.pa.closing-2 …
end sequence
```

```
select ordered                            ← occurrence-ordered alternatives
  …
or
  …
end select
```

### 2.6 Phrases (givens 3 + 6)

```
define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
end phrase
```

- Strategies (shared verbatim with the phrase algebra's Choice atoms):
  `randomly`, `cycling`, `ordered` (sticks on last), `once`.
- Condition-varied phrases (`when the message is intact … / when trampled …`)
  compile to conditional producers (ADR-196). **Dividing rule:** branches that
  differ only in wording are one phrase with variants; branches that differ in
  effect are behavior control flow.
- Templates use the existing lang-en-us formatter chain verbatim
  (`{You} {open} {the item}`, `{verb:is item}`), and params ship as EntityInfo
  automatically (ADR-158 becomes compiler-enforced).
- Prose block form (`phrase <id>` + indented bare text) exists because IF prose is
  saturated with quotation marks. **The prose block is the ONLY phrase-text form**
  (grammar log 2026-07-10 — the quoted/bare same-line forms were removed; quotes
  remain for header strings and hatch paths). A blank line inside a prose block is
  a paragraph break; `{br}` is the built-in hard line break; `define phrase X,
  verbatim` preserves whitespace exactly. §3.1 amended accordingly.
- Inline prose anywhere is declare-and-emit sugar: it registers under a derived ID.
- Two authoring modes, one IR: stdlib uses keys + `phrases <locale>` blocks
  (localizable); story authors may inline (compiler derives keys, registers in the
  story's default locale).
- Attribution (ADR-203): `phrase X from <speaker>` reserved for NPC speech.

### 2.7 The selector grammar (given 7) — the closed kit

**Subjects:** `the <name>`, `it`, role names, possessive access (`the message's
state`, `its body part` — one form; no "the state of the message").

**Predicates** (one spelling each):

| Form | Meaning |
|---|---|
| `is <state/value>` / `is not` | equality |
| `is a <kind/trait>` | classification |
| `is in <place>` | location |
| `holds <thing>` / `has <thing>` | direct / transitive containment |
| `holds <n> or more <description>` | set cardinality |
| `wears <thing>` | worn relation |
| `can see` / `can reach <thing>` | scope queries |
| `is over / is under / is at least / is at most <n>` | comparison |
| `one chance in <n>` | randomness |

**Composition:** `and`, `or`, `not`, parentheses. Nothing implied by commas.

**Quantifiers:** `any / no / each <description>`, description =
`<trait or kind> [in <place>] [where <condition>]`; the found entity binds to
`the match`; `each` is the binder inside `where` filters.

**Quantities:** field access + `plus` / `minus` + comparators.

**Event headers:** fixed frame `when <actor> <verbs> <target> [while <condition>]`.
All qualifiers ride on one connective (`while`); what follows is the condition
grammar again.

**Named conditions:** `condition in-darkness: the player's location is dark` —
idiom is declared, not parsed. Same move as phrases: the grammar stays closed;
authors mint vocabulary.

**Parameter passing:** `with <param> = <value>` — the one form for feeding phrase
templates (`refuse hands-full with other item = the match`).

Because every predicate derives from declarations (trait fields, states, context
values, relations), valid completions at any cursor position are computable — the
LSP can offer `intact / trampled / obliterated` after `the message is `. This is the
structural advantage over I7: discoverability and diagnostics fall out of closure.

---

## 3. Reference Examples (final form)

### 3.1 Cloak of Darkness — complete

```
story "Cloak of Darkness" by "Roger Firth (Sharpee implementation)"
  id: cloak-of-darkness
  version: 1.0.0
  blurb: A basic IF demonstration - hang up your cloak!

define condition in-darkness: the player's location is dark

create the Foyer of the Opera House
  a room
  aka foyer, hall, entrance
  west to the Cloakroom
  south to the Foyer Bar
  north is blocked: cant-leave

  You are standing in a spacious hall, splendidly decorated in red and
  gold, with glittering chandeliers overhead. The entrance from the
  street is to the north, and there are doorways south and west.

create the Cloakroom
  a room
  aka cloakroom

  The walls of this small room were clearly once lined with hooks,
  though now only one remains. The exit is a door to the east.

create the Foyer Bar
  a room, dark while the player has the velvet cloak
  aka bar

  The bar, much rougher than you'd have guessed after the opulence of
  the foyer to the north, is completely empty. There seems to be some
  sort of message scrawled in the sawdust on the floor.

create the player
  starts in the Foyer of the Opera House
  wears the velvet cloak

  As good-looking as ever.

create the velvet cloak
  aka cloak
  wearable

  A handsome cloak, of velvet trimmed with satin, and slightly
  splattered with raindrops. Its blackness is so deep that it almost
  seems to suck light from the room.

create the brass hook
  aka hook, peg
  scenery, a supporter with capacity 1
  in the Cloakroom

  It's just a small brass hook, screwed to the wall.

create the message in the sawdust
  aka message, sawdust, floor, writing
  scenery
  in the Foyer Bar
  states: intact, trampled, obliterated

  on reading it
    select on its state
      when intact
        phrase message-intact
        win
      when trampled
        phrase message-trampled
      when obliterated
        phrase message-obliterated
        lose
    end select
  end on

when the player enters the Foyer Bar while in-darkness
  phrase stumble
  first time
    change the message to trampled
  third time
    change the message to obliterated
end when

define verb hang or hook means put (something) on (something)

define phrases en-US
  cant-leave:
    You've only just arrived, and besides, the weather outside seems
    to be getting worse.
  stumble:
    Blundering around in the dark isn't a good idea!
  message-intact:
    The message, neatly marked in the sawdust, reads... You have won!
  message-trampled:
    You can just make out: {garbled}
  message-obliterated:
    The message has been trampled beyond recognition. You have lost!

define text garbled from "./extras.ts"
```

Baselines: the shipped TS implementation is 785 lines; the dream-cloak fluent-TS
form was ~90. This is comparable in length to the fluent form while carrying its
prose inline and requiring no toolchain.

### 3.2 stdlib traits — openable, wearable, container capacity

```
define trait openable
  data
    open: flag, starts false

  phrases en-US
    already-open: "{capitalize the item} {verb:is item} already open."
    opened:       "{You} {open} {the item}."
    opened-empty: "{You} {open} {the container}, which is empty."

  on opening it
    if open then
      refuse already-open
    end if
    set open to true
    emit opened
    if it is a container and it holds nothing then
      phrase opened-empty
    else
      phrase opened
    end if
  end on
end trait

define trait wearable
  data
    worn: flag, starts false
    body part: optional name

  phrases en-US
    already-wearing: "{You're} already wearing {the item}."
    hands-full:      "{You} {can't} wear {the item} while wearing {the other item}."
    worn:            "{You} {put on} {the item}."

  on wearing it
    if worn then
      refuse already-wearing
    end if
    if the actor wears any item where its body part is the item's body part then
      refuse hands-full with other item = the match
    end if
    set worn to true
    emit worn
    phrase worn
  end on
end trait

define trait container
  data
    max items: optional number
    max weight: optional number

  phrases en-US
    container-full: "{You're} carrying too much already."
    too-heavy:      "Your load is too heavy. You will have to leave something behind."

  on taking anything as the taker
    if the taker holds max items or more items where each is not worn then
      refuse container-full
    end if
    if the taker's total weight plus the item's weight is over max weight then
      refuse too-heavy
    end if
  end on
end trait
```

If pushed to its conclusion, stdlib's standard actions and traits become
expressible in the language itself; platform and story authoring differ in
privilege, not in kind.

### 3.3 Friendly Zoo — NPC chatter, timeline, phase flip

```
define trait chatty
  on every turn while the player can see it and one chance in 2
    phrase parrot-chatter
  end on
end trait

define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
end phrase

define flag after-hours starts false

define sequence closing time
  at turn 5
    phrase zoo.pa.closing-3
      *DING DONG* "Attention visitors! The Willowbrook Family Zoo will be
      closing in three hours. Please make sure to visit all exhibits before
      closing time!"
  5 turns later
    phrase zoo.pa.closing-2
      *DING DONG* "Attention visitors! Two hours until closing. Don't forget
      to stop by the gift shop for souvenirs!"
  5 turns later
    phrase zoo.pa.closing-1
      *DING DONG* "Attention visitors! One hour until closing. Please begin
      making your way toward the exit."
  5 turns later
    phrase zoo.pa.closed
      *DING DONG* "The Willowbrook Family Zoo is now closed. Thank you for
      visiting! We hope to see you again soon!"
    set after-hours to true
end sequence

once after-hours
  move Sam the zookeeper offstage
  phrase zoo.after-hours.keeper-leaves
    Sam the zookeeper checks her watch, waves goodnight to the animals,
    and lets herself out through the staff gate.
end once

create the parrot
  a person
  in the Aviary
  chatty while not after-hours
  candid while after-hours
```

Accounting for the PA feature: ~45 lines across three files today (daemon factory
with runner-state persistence, message-ID constant map, addMessage calls, plugin
registration, magic-string flag) → the `sequence` block above, in one place.

### 3.4 Friendly Zoo — custom actions (petting, feeding)

The zoo's author-defined dispatch verbs — today ~120 lines of TS (capability
behavior + dispatch-lookup action + message maps + `fed-${id}` state keys).

```
define action petting
  grammar
    pet :animal
    pat :animal
  the animal must be reachable
  refuse without animal: pet-what
  otherwise refuse cant-pet

  phrases en-US
    pet-what: "Pet what?"
    cant-pet: "{capitalize the animal} {verb:isn't animal} the sort of thing you can pet."

define action feeding
  grammar
    feed :animal
  the animal must be reachable
  refuse without animal: feed-what
  otherwise refuse not-hungry

  phrases en-US
    feed-what:  "Feed what?"
    not-hungry: "{capitalize the animal} {verb:doesn't animal} want feeding."

define trait pettable
  data
    kind: one of goats, rabbits, parrot, snake

  phrases en-US
    pet-goats:   "The pygmy goats crowd around, bleating happily as you scratch behind their ears."
    pet-rabbits: "Biscuit and Marmalade twitch their noses and lean into your hand. Soft!"
    pet-parrot:  "The parrot tilts its head and lets you smooth its feathers, watching you sideways."
    glass-way:   "You press your hand to the glass. The snake regards you coolly from the other side."

  on petting it
    if kind is snake then
      refuse glass-way
    end if
    emit petted
    select on kind
      when goats
        phrase pet-goats
      when rabbits
        phrase pet-rabbits
      when parrot
        phrase pet-parrot
    end select
  end on
end trait

define trait feedable
  data
    food: entity
    fed: flag, starts false

  phrases en-US
    no-food:     "You have nothing {the animal} would want to eat."
    already-fed: "{capitalize the animal} {verb:has animal} had quite enough already."
    fed:         "{capitalize the animal} eagerly gobbles up the feed."

  on feeding it
    if not (the actor has its food) then
      refuse no-food
    end if
    if fed then
      refuse already-fed
    end if
    set fed to true
    emit fed
    phrase fed
  end on
end trait

create the pygmy goats
  aka goats
  plural
  in the Petting Zoo
  pettable with kind goats
  feedable with food the handful of feed
  phrase fed: "The goats butt each other out of the way to get at the feed. Happy chaos."

define score pet-an-animal worth 5
define score feed-the-goats worth 10
define score feed-the-rabbits worth 10

when the player pets anything
  award pet-an-animal
end when

when the player feeds the pygmy goats
  award feed-the-goats
end when

when the player feeds the rabbits
  award feed-the-rabbits
end when
```

Notes established by this example:

- **Grammar slot names are the context values.** `feed :animal` is why conditions
  and phrases reference `the animal` throughout the action and its traits.
- **`otherwise refuse <phrase>`** is the canonical last-resort form: it compiles to
  the dispatch-miss case (no trait claimed the action on this target).
- **Scoring lives in story rules, not traits** — an improvement over the shipped
  TS: `pettable`/`feedable` stay story-agnostic; the story attaches point values by
  reacting to `petted`/`fed` events. Scores dedupe by identity (ADR-129), so
  "once" is automatic.
- **`define score X worth N`** declares score identities (replaces
  ScoreIds/ScorePoints constant maps); `award <score>` is the statement.
- **Per-entity phrase override** (`phrase fed: "…"` in a create block) overrides a
  trait's phrase for that entity via an entity-scoped registration the renderer
  prefers — the generalization of scenery's per-entity cant-take message. Lets a
  trait ship generic prose while each entity sounds like itself.
- `pettable`/`feedable` clauses compile to **CapabilityBehaviors** (dispatch verbs
  with mutations); the actions register story grammar per ADR-087.

---

## 4. Compile-To Mapping

| Language construct | Platform mechanism | Exists today? |
|---|---|---|
| entity declarations, trait adjectives | `createEntity` + trait instances (ADR-140 helpers vocabulary, ADR-189 defaults) | yes |
| exits / `is blocked:` | `connectRooms`, `RoomTrait.blockedExits` | yes |
| trait `on <action> it` — refusal-only, standard-semantics action | **ActionInterceptor** (ADR-118/208), per-world registration | yes |
| trait `on <action>` with mutations, dispatch verb | **CapabilityBehavior** (ADR-090), per-world registration | yes |
| `action` declarations | four-phase `Action` + parser grammar (ADR-087) | yes |
| `refuse` / mutations / `phrase`+`emit` | validate+blocked / execute / report phases | yes |
| `when <event-header>` rules | EventProcessor handlers (ADR-052/075) | yes |
| `phrase` declarations & templates | Language Provider registration; formatter chain (ADR-158); dual-mode (ADR-107) | yes |
| phrase strategies / condition variants | phrase-algebra Choice / conditional producers (ADR-192/196) | yes |
| `sequence` / `every` / `once` / `after N turns` | plugin-scheduler daemons & fuses (chained), derived IDs | yes |
| `states:` + `change X to <state>` | plugin-state-machine / trait enum | yes |
| ordinals, `ordered` positions, `once` | loader-materialized occurrence counters in world state (invisible to authors) | loader-internal |
| `flag` / value declarations | namespaced world state, typed at load | yes (sugar) |
| `dark while <cond>` (derived property) | turn-end rule recomputing the trait field | needs decision (§8) |
| `win` / `lose` | `story.victory`/`story.defeat` events + completion state | convention today (§8) |
| `chatty while <cond>` (conditional composition) | NPC behavior swap exists; generalized form does not | platform discussion (§8) |
| `define text X from "./mod.ts"` | named TS export implementing a producer/handler interface | contract to define (§5.6) |

---

## 5. Technical Implementation Overview — Transpiling / Compiling Mechanisms

### 5.1 Pipeline

```
.story source
   │  lex + parse            (indentation-aware, block keywords, prose blocks)
   ▼
AST with source spans
   │  resolve                (symbol tables: entities, traits, phrases, states,
   │                          conditions, actions, context values; article stripping)
   ▼
   │  analyze                (closed-grammar predicate checks, type checks,
   │                          phrase coverage, role binding, phase-order rule)
   ▼
Story IR  ── serializable JSON, nodes carry source spans ──┐
   │                                                        │
   ├─► Backend A: runtime loader (interpreter)              ├─► introspection
   └─► Backend B: TypeScript emitter ("eject")              │    manifest (ADR-184)
                                                            └─► message extraction
                                                                 (localization table)
```

The **IR is the product**; the syntax, the fluent TS layer, IDE forms, and LLM
generation are frontends; the loader, the emitter, and the manifest are backends.

### 5.2 Parsing

- **Indentation-sensitive, keyword-blocked grammar.** Blocks open with a keyword
  line and close with `end <keyword>`; prose blocks are indentation-delimited bare
  text. Explicit terminators give line-accurate error recovery — after an error the
  parser resynchronizes at the next `end` or top-level keyword and keeps going, so
  one mistake yields one diagnostic, not fifty.
- **Two-pass name resolution.** Pass 1 collects declarations (entities, traits,
  phrases, states, conditions, actions and their context values, TS hatches). Pass 2
  resolves references with article stripping ("the velvet cloak" → `velvet cloak`).
  Ambiguity is a **compile error with a rename suggestion**, never a guess.
- **Prose is opaque to the parser** except for `{…}` markers, which are validated
  against the formatter chain, snippet names, and declared producers.
- The lexer/parser needs no platform dependency — it can run in a browser
  (playground) or in the devkit.

### 5.3 Semantic analysis (load-time gates)

All of these fail the *load*, not the play-through:

1. **Phrase coverage** — every phrase key referenced by `refuse`/`phrase`/blocked
   exits must resolve in the active locale. This is stdlib's `requiredMessages`
   made structural.
2. **Closed-grammar checks** — unknown predicate → error naming the nearest valid
   ones; state names checked against the entity's `states:`; context values checked
   against the action's declaration; `the match` only legal after a quantifier.
3. **Role binding** — `as the <role>` must name a role the action declares.
4. **Phase-order rule** — within an `on` block, `refuse` statements must precede
   the first mutation (`set`/`change`/`move`). This single syntactic rule is what makes
   four-phase compilation (§5.4) a static transform instead of a runtime guess. The
   compiler reports "refusal after mutation — move the check above `set open`"
   rather than silently producing a behavior that mutates before validating.
5. **Marker validation** — `{garbled}` must be a declared producer (hatch or
   phrase); `{snippet:x}` must resolve to a snippet map entry.

### 5.4 Compiling `on` blocks to the four-phase pattern

Each `on` block is statically partitioned by the phase-order rule:

- Leading conditional `refuse` statements → **validate** (returning
  `{valid:false, error:<phrase-key>, params}`) and **blocked** (emitting the
  standard `*_blocked` event with the fully-qualified message ID).
- Mutations (`set`, `change`, `move`, `award`) → **execute**, delegating to the
  trait's world-model behavior where one exists (`OpenableBehavior.open`), else
  direct trait-field writes through the world model.
- `phrase` and `emit` statements (and any conditionals that only select among
  them) → **report**, emitting domain events with `messageId` + EntityInfo params
  exactly as stdlib does (ADR-097/158).

Registration target follows the stdlib decision tree, automated:

- Trait clause on a **standard-semantics** action (the action declares its own
  mutation, e.g. taking): compiled clauses become an **ActionInterceptor**
  (`preValidate` from refusals, `onBlocked` for custom refusal phrasing).
- Trait clause with **mutations** on a dispatch verb: a **CapabilityBehavior**,
  registered per-world (ADR-207/208 idempotent binding maps).
- `before X` / `after X` orders the per-action chain; declaration order otherwise.

The author never chooses interceptor vs. behavior; the CLAUDE.md decision tree
becomes a compiler rule.

### 5.5 Backend A — the runtime loader (primary)

A new package (working name `@sharpee/story-loader`) exporting a generic `Story`
implementation constructed from IR:

- **World building:** entities, traits, placement, exits — the ADR-140 helpers
  vocabulary, called directly.
- **Behavior clauses:** the four-phase objects from §5.4, with condition and
  statement bodies executed by an **AST-walking expression evaluator** — no `eval`,
  no TS compiler at runtime. The evaluator implements exactly the closed selector
  grammar plus the statement set; iteration is over world collections and bounded
  per turn. This keeps pure-IR stories fully sandboxable (the hosted/multi-user
  profile can refuse TS hatches and run untrusted stories as data).
- **Phrases:** templates registered with the Language Provider; strategy and
  condition-variant phrases registered as Choice / conditional producers.
- **Temporal constructs:** `sequence` steps become fuses each arming the next;
  `every` becomes a daemon; `once <cond>` a daemon that retires after firing.
  IDs derive from declaration path.
- **Occurrence tracking:** the compiler enumerates every construct whose semantics
  need occurrence state (ordinal blocks, `ordered` positions, `once`, sequence
  progress) and assigns each a stable ID; the loader materializes
  exactly those counters in namespaced world state. Save/restore/undo are free
  because it *is* world state. Nothing unqueried is ever tracked; no history scans.
- **Derived properties:** `dark while <cond>` compiles to a turn-end rule that
  re-evaluates the condition and writes the trait field (pending §8 decision on a
  first-class mechanism).
- **Source maps:** IR nodes carry `.story` file/line spans; runtime errors,
  diagnostics, and transcript failures report story-source locations.

**Determinism note:** `randomly` and `one chance in <n>` route through the
engine's seeded RNG service so transcript testing and undo/replay behave.

### 5.6 The TS escape hatch contract

`define text garbled from "./extras.ts"` (later: `define action X from …`,
`define behavior X from …`):

- The module is ordinary TypeScript compiled by the author's toolchain (devkit
  standalone build), exporting named implementations of small documented
  interfaces (producer, handler, action).
- The loader binds exports to declared names at story init; a missing or
  mis-typed export is a load error.
- **Profiles:** the browser playground and hosted multi-user run **pure-IR
  stories only** (hatches refused at load); standalone authors with the devkit
  get the full seam. The seam is nominal and narrow by design.

### 5.7 Backend B — the TypeScript emitter ("eject")

`sharpee eject` walks the IR and emits fluent-layer TypeScript (the dream-cloak
vocabulary — which survives as the emitter target and the loader's internal API,
not as a separately-marketed authoring product). One-way door, clearly labeled,
for stories that outgrow the language. Because both backends consume the same IR,
eject-then-verify can run the same transcripts against both forms.

### 5.8 Interpreter vs. transpiler — why interpreter-primary

1. **No-toolchain authoring:** a `.story` file needs a browser tab, not
   node+npm+tsc+devkit. The ADR-191 playground becomes type-left/play-right,
   fully client-side.
2. **Sandboxed hosting:** pure IR is data; zifmia can host untrusted stories
   without executing author code.
3. **Validatable LLM generation (ADR-116):** a closed language with schema-derived
   vocabulary can be parsed, name-resolved, and transcript-tested before a human
   reads it.
4. **Platform evolution under stable stories:** `.story` files are data; the
   loader absorbs platform API changes.

### 5.9 Verification strategy

- **Golden gate:** the interpreted `cloak.story` must pass the cloak-of-darkness
  golden transcripts unmodified (two documented divergences: blocked
  north exit replaces the Outside room; canonical re-darkening when the cloak is
  retrieved). Transcript tests are behavior-parity proofs; the harness exists.
  (Amended 2026-07-10: no `.transcript` suite existed for cloak — the golden
  suite is authored in Phase A against the hand-written story, then frozen.)
- **Second gate:** friendly-zoo in `.story` form against its transcript suite —
  this exercises actions, dispatch, scheduler, NPC behaviors, scoring, and the
  hatch seam.
- Parser/analyzer get conventional unit suites (fixture files → expected
  IR/diagnostics); the evaluator gets table-driven predicate tests.

### 5.10 Packaging, tooling, versioning

- **Format stamp:** every file begins parsing under a declared
  `story language 1` version (implied for v1; required field in the story header
  from the first public release). Published `.story` files make grammar changes
  breaking changes; the stamp is the migration hook.
- **Bundle:** the `.sharpee` bundle carries the IR (and optionally the source);
  the introspection manifest (ADR-184) is generated from the same IR.
- **Message extraction:** `sharpee extract-messages` emits the ID → template
  table from the IR for translators; a translation is a file that re-registers
  the same IDs.
- **Editor tooling:** TextMate grammar for highlighting (cheap); LSP for
  completion/diagnostics/go-to-definition (the payoff of the closed grammar —
  completions are computed from declarations, not heuristics). The one-page
  grammar reference is generated from the same predicate/keyword tables the
  parser uses, so docs cannot drift from the implementation.
- **Diagnostics budget:** error messages are the product. Budget more effort for
  them than for the parser. Target register: "I don't know which 'hook' you mean
  on line 41 — you have 'brass hook' and 'hook rug'."

### 5.11 Suggested implementation phasing

1. **Phase A — Cloak-complete core:** lexer/parser/IR, loader subset (entities,
   traits-as-composition, phrases, `when` rules, states, ordinals, blocked exits,
   `win`/`lose`), seeded RNG. Gate: cloak transcripts green.
2. **Phase B — Zoo-complete:** `action`/`trait` declarations with four-phase
   compilation, role binding, scheduler constructs, phrase strategies/variants,
   hatch contract. Gate: zoo transcripts green.
3. **Phase C — Tooling:** diagnostics polish, TextMate grammar, LSP, message
   extraction, playground integration.
4. **Phase D — Emitter:** `sharpee eject`, dual-backend transcript verification.

---

## 6. What Structural Enforcement Buys

A recurring pattern worth naming: disciplines that are conventions in TS become
*the only expressible thing* in the language.

| Discipline | TS today | In the language |
|---|---|---|
| all text through Language Provider | convention; `data.text` cheats exist | prose blocks *are* registrations |
| message-ID ↔ emit-site sync | hand-maintained constant maps | IDs derived; coverage checked at load |
| EntityInfo params (ADR-158) | reviewer-enforced | only thing the compiler emits |
| daemon state persistence | `getRunnerState`/`restoreRunnerState` plumbing | declared/implied state is world state |
| no magic state strings | `setStateValue('zoo.after_hours', …)` + casts | declared flags, type-checked at load |
| capability dispatch vs. workaround | decision tree in CLAUDE.md | compiler rule |
| fully-qualified capability messageIds | 2026-07-02 P1 regression class | ID derivation makes short keys inexpressible |

## 7. Open Questions — RESOLVED (David, 2026-07-10; see ADR-210)

1. **Name:** **Chord**, with `sharpee compose` as the CLI command (`.story`
   extension stands; Compose-as-name and Madrigal were considered).
2. **Books:** split into two — an author book teaching Chord, a developer
   book (TS platform/extension work) seeded from the v2 book. Author book
   begins after Phase B + playground.
3. **stdlib self-hosting:** **100% — the end state.** Declaration bindings ship
   as transitional scaffolding (Phases A–B); stdlib's source of truth migrates
   to Chord declarations after Phase B, with prose sourced from
   `lang-{locale}` per the platform-text guard.
4. **Kinds catalog / default player:** drafted and approved in `prereqs.md`
   (ADR-210 Platform Prerequisite 5).
5. **Grammar governance:** owner approval, logged per addition in
   `docs/architecture/chord-grammar-changes.md`; experimental tier deferred
   until outside authors exist.

## 8. Flagged Platform Discussion Items

Per the platform-changes rule, these need explicit discussion before any
implementation:

1. **Derived properties** (`dark while <cond>`): recommend the sugar-only
   turn-end-rule compilation first; a first-class dependency-tracked mechanism is
   a separate ADR if staleness ever bites.
2. **Conditional trait composition** (`chatty while not after-hours`): NPC
   behavior swap machinery exists; generalized runtime trait add/remove does not.
   Fallback that works today: one trait branching internally on the flag.
3. **First-class endings** (`win`/`lose`): today a per-story convention
   (`story.victory` + `isComplete`); worth a small platform blessing.
4. **The event-selector / context-value contract:** the map from language verbs
   (`enters`, `reads`, `the previous location`) to `if.event.*` types and payload
   shapes must be generated or verified against stdlib's actual emissions — this
   contract is the language's real coupling surface and its growth edge.
