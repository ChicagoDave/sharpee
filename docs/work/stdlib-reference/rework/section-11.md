## 11. Traits catalog

Every trait in the platform, in one lookup. Full entries live in the
chapter that owns each trait's verbs — this index says what each one is,
how a `.story` composes it (or that it can't, yet), and where the entry
is. The four structural traits no verb owns get their full entries in
§11.1.

| Trait | In Chord | One line | Entry |
|---|---|---|---|
| `container` | `a container` (+ `with max items/weight N`) | holds things inside | §2.9 |
| `supporter` | `a supporter` (+ `with capacity N`) | holds things on top | §2.9 |
| `pushable` | `pushable` | eligible for PUSH; pushType picks behavior | §2.9 |
| `pullable` | `pullable` | eligible for PULL; state + count mutate | §2.9 |
| `cuttable` | `cuttable` (+ `with tool <entity>`) | eligible for CUT; outcome is the entity's own implementation | §2.9 |
| `diggable` | `diggable` (+ `with tool <entity>`) | eligible for DIG; same contract as cuttable | §2.9 |
| `moveable-scenery` | — | dormant (nothing reads it) | §2.9 |
| `attached` | — | dormant (nothing reads it) | §2.9 |
| `room` | `a room` | a place; exits, darkness, first-visit text | §3.4 |
| `exit` | — | passage entity a room exit routes via | §3.4 |
| `enterable` | `enterable` | can be gotten into / onto | §3.4 |
| `climbable` | `climbable` | eligible for CLIMB | §3.4 |
| `vehicle` | — | enterable that moves with its passengers | §3.4 |
| `openable` | `openable` (+ `with tool <entity>`) | open/closed state | §4.3 |
| `lockable` | `lockable` (+ `with the <key>`) | locked/unlocked + key contract | §4.3 |
| `door` | `a door` + an exit's `through the <door>` tail | an entity that *is* the connection between two rooms | §4.3 |
| `wearable` | `wearable` | can be worn; body part + layer rules | §5.2 |
| `clothing` | — | dormant — and not wearable by itself | §5.2 |
| `equipped` | — | equipment slots/stats; read by combat | §5.2 |
| `open-inventory` | — | NPC's carried items become reachable | §5.2 |
| `readable` | `readable` (+ `with text …`) | text, pages, read-gate | §6.4 |
| `scenery` | `scenery` | fixed in place, unlisted | §6.4 |
| `concealment` | `hiding-spot` (+ `with position <word>`) | a hiding spot for actors | §6.4 |
| `acoustic` | — | wall sound-cost tier (engine sound system) | §6.4 |
| `listener` | — | receives propagated sounds | §6.4 |
| `switchable` | `switchable` | on/off, power, sounds | §7.2 |
| `light-source` | `light-source` | sheds light when lit; fuel model | §7.2 |
| `button` | — | descriptive; upgrades a push to a click | §7.2 |
| `actor` | `a person` | a someone: pronouns, capacity, custom bags | §8.5 |
| `npc` | `guard`/`passive`/`wanderer`/`follower`/`patrol` (core; plugin auto-wires) | NPC bookkeeping for the NPC plugin | §8.5 |
| `character-model` | — | deep NPC internals (personality, beliefs) | §8.5 |
| `combatant` | `combatant` (+ stats config; needs `use combat`) | combat stats; presence routes ATTACK to combat | §8.5 |
| `weapon` | `weapon` (+ `with damage N …`; needs `use combat`) | damage, type, durability | §8.5 |
| `edible` | `edible` / `drinkable` (liquid) | food/drink data; servings, liquid flag | §8.5 |
| `breakable` | — | one-hit breakage (via ATTACK) | §8.5 |
| `destructible` | — | hit-pointed destruction (via ATTACK) | §8.5 |
| `deadly-room` | `deadly: <phrase>` | every non-safe verb kills | §9.3 |
| `health` | via `combatant with health N` (`use combat`) | the life-state model (attached lazily) | §9.3 |
| `identity` | implicit in every `create` (+ `proper`, `pronouns` on persons) | name, aliases, article, pronouns, description | §11.1 |
| `region` | `a region` (+ `containing …`) | groups rooms; crossing emits events | §11.1 |
| `scene` | — | begin/end narrative phases, engine-evaluated each turn | §11.1 |
| `story-info` | the story header | title/author/version for ABOUT | §11.1 |

### 11.1 Structural & authoring traits

**identity** — every entity's who-am-I, composed implicitly by every
`create` block: the name, `aka` aliases, and description land here, along
with the article/proper-name machinery the sentence assembler uses,
grammatical number, the narration's pronoun set, disambiguation
adjectives, and optional weight/volume/size. From Chord: name, aliases,
description, `plural`, `concealed`, and on persons `proper` and
`pronouns` (ADR-242); the rest is TypeScript.

The author writes:

<!-- fixture: traits/identity.story -->
```story
create the Gatehouse
  a room

  A stone gatehouse with an iron-barred window.

create Tobias
  aka groundskeeper
  a person, proper
  pronouns he
  in the Gatehouse

  A weathered man with a ring of keys.

create the zookeeper
  a person
  in the Gatehouse

  Someone in a canvas apron, name unknown.

create the iron gates
  aka gates
  plural
  scenery
  in the Gatehouse

  Twin gates of black iron, shut fast.

create the player
  starts in the Gatehouse
```

The player sees:

<!-- transcript: traits/identity.story -->
```transcript
> look
Gatehouse
A stone gatehouse with an iron-barred window.

You can see Tobias and a zookeeper here.

> take the gates
The iron gates are fixed in place.

> take tobias
You can't take Tobias.

> take the zookeeper
You can't take the zookeeper.
```

One word each way: `proper` (person-only) renders Tobias bare-named in
the room listing and in refusals while the unmarked zookeeper keeps an
article, and `plural` sets grammatical number so every message agrees —
the gates "are" fixed in place where §2.1's statue "is".

The rest of the trait in one-liners:

- `pronouns he` (or `she`, `it`, `they`, or a `define pronouns` named
  set — chord-language.md §5.9) names a person's narration pronoun set;
  absent means the by-number fallback ("it"/"they") — nothing is
  inferred from a name.
- `concealed` marks a hidden item that searching reveals and announces
  (§6.2).
- `points` awards score on the first take, deduped per entity (§2.1) —
  TypeScript-only today; Chord's `score … worth N` lines are the
  separate named-award system.
- The create-line article is never read for identity: `create the
  zookeeper` and `create a zookeeper` load identically.

**region** (`a region` — kind noun, since ADR-236) — groups rooms into
areas: a room carries a region id, regions nest by containing each
other, and going emits `if.event.region_exited` / `region_entered` per
crossed boundary (§3.1). Everything is authored region-side: `containing`
lists members (additive across lines), `after entering it` / `after
leaving it` react to boundary crossings (`leaving` exists only on region
blocks), and an `on every turn` clause on the region block is a region
daemon, firing only while the player is in a member room (the daemon
machinery is §12's).

The author writes:

<!-- fixture: traits/region.story -->
```story
create the Grounds
  a region
  containing the Orchard, the Apiary

  after entering it
    phrase under-the-boughs
  end after

  after leaving it
    phrase back-on-the-road
  end after

  on every turn
    phrase bees-drone
  end on

  phrase under-the-boughs:
    You pass under the boughs; the air turns sweet with windfall.

  phrase back-on-the-road:
    The orchard smell fades behind you.

  phrase bees-drone:
    Bees drone somewhere among the trees.
```

The player sees (starting outside the region, walking east through it
and back):

<!-- transcript: traits/region.story -->
```transcript
> east
Orchard
Apple trees in ragged rows.

Bees drone somewhere among the trees.

You pass under the boughs; the air turns sweet with windfall.

> east
Apiary
White hives stand in the grass.

Bees drone somewhere among the trees.

> west
Orchard
Apple trees in ragged rows.

Bees drone somewhere among the trees.

> west
Gatehouse
A stone gatehouse at the edge of the grounds.

The orchard smell fades behind you.
```

Boundary reactions fire only on crossings — the Orchard-to-Apiary move
inside the region says nothing extra — while the daemon speaks in every
member room and falls silent the turn you leave. One honest gap: the
trait's ambient-sound/smell fields are declared but nothing reads them
yet (dormant).

**scene** — narrative phases with a lifecycle: a scene waits, begins
when its registered begin-condition fires, counts its active turns, and
ends (or recurs) on its end-condition — evaluated every turn by an
always-on engine plugin, emitting `if.event.scene_began` /
`scene_ended` plus any registered reaction messages. The conditions are
code (closures registered on the world, re-register after restore); the
trait's state persists. TypeScript-only — no Chord surface.

**story-info** — the story's masthead on an invisible system entity:
title, author, version, description, plus build metadata (build date,
engine/client versions, ported-by, credits). ABOUT and VERSION read it
(§10.1); the info channels and save metadata consume it. A Chord story
never touches it directly — the header (`story "…" by "…"`, `version:`,
`blurb:`) flows through and the engine materializes the trait.

One neighbor in the traits directory is not a trait at all:
**obstructor-protocol** (ADR-173) is a query-helper module for walls — a
wall side may name an `obstructedBy` entity, and capability consumers
(today the sound system's acoustic dampening, ADR-172) ask at query time
whether that obstructor is still in the room, so pushing the bookcase
aside lifts the obstruction with no bookkeeping. TypeScript plumbing
only — no Chord surface, no verb.
