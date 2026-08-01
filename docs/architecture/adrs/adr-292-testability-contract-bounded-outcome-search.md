# ADR-292: The testability contract and bounded outcome search

## Status: SUPERSEDED IN PLACE by [ADR-293](adr-293-choice-points-per-point-streams.md) (2026-08-01, session 9f136f) — **do not implement.** Never accepted; nothing here was built. ADR-293 carries forward, in substance: complete testability as a checkable contract rather than an unfalsifiable goal, draws exposing a finite enumerable outcome space, outcome randomness separated from presentation randomness, and forking that executes the real engine rather than modelling it. What it replaces: the draw ledger as an interface on the seed authority, bounded outcome search as the *primary* author instrument (ADR-293 makes forcing primary and search a first-firing fallback, on this ADR's own measurement of ≈623 nodes/second), and the `@sharpee/skein` package that existed to hold the searcher. The Chord surface here (D11–D13) is deliberately **not** carried forward — see ADR-293's "Deferred, not decided": specifying an authoring surface ahead of the substrate is what these decisions did wrong.

## Historical status: DRAFT (2026-07-31, session 8a8dd0) — all five Open Questions resolved by interview (Q-1 by measurement, Q-2/Q-4/Q-5 by ruling, Q-3 by ruling); awaiting review and the acceptance decision. **Platform change** (`packages/core`, `packages/engine`, `packages/chord`, `packages/parser-en-us`, `packages/stdlib`, `packages/transcript-tester`, and a new `packages/skein`) and **story change** (`stories/dungeo`), neither approved yet.

**Revised in draft** (same session, after David's note that this ADR set "must align with the elegance requirement for both Sharpee and Chord" and that "we may want to add the TEST command in the client to work just like Inform 7"). The first draft's author surface was transcript directives carrying qualified stream names and raw draw indices — ceremony that Chord exists to remove. D11–D13 replace it, D3 and D8 are revised, and Q-2 resolves into Chord's existing `condition` construct.

## Date: 2026-07-31

## Parent: ADR-291 (the seed authority — this ADR consumes it and extends `SeedAuthority` with a draw ledger; ADR-291's D4 turns out to be a prerequisite, not bookkeeping), ADR-290 (test creation as an atomic mode — DRAFT; this ADR supplies the branching model its Skein comparison implied but never had), ADR-277/ADR-282 (the IDE capture format whose `[OK: any]` default exists because outcomes were not selectable), ADR-231 D6 (stream isolation, preserved).

## Context — measured, not assumed

Everything below was counted out of the working tree on 2026-07-31.

### The author requirement this serves

Stated by David, 2026-07-31: *"I would want to be able to list all possible
randomized outcomes and create game plays to that point."* The worked example was
four Troll scenarios — troll kills player unarmed, with sword, with knife; player
kills troll with sword — and the framing that followed: *"melee was meant as an
example"*, and *"if we have to rearchitect melee or any other aspect of dungeo, I'm
okay with that — the goal is now complete testability."*

ADR-291 does not deliver this and cannot. A pinned seed reproduces **a** run; it does
not select **which** run. Reaching a named outcome through seeds means searching for
one, and the seed that produces "troll kills player holding a knife" encodes an entire
multi-round arc — it is invalidated by any change to the combat tables, the strength
math, or the *number of draws* taken along the way. `[SEED: 48291]` also does not say
what it tests, so the link between a test's name and its mechanism goes unverified.

### The enabling fact

Every `SeededRandom` method except one has a finite, knowable domain at the moment it
is called. Census over all non-test source:

| Method | Sites | Domain at call time |
| --- | ---: | --- |
| `.chance(p)` | 22 | 2 |
| `.pick(array)` | 13 | `array.length` |
| `.int(min, max)` | 8 | `max − min + 1` |
| `.shuffle(array)` | 0 | `n!` |
| `.next()` | **1** | unbounded float |

**43 of 44 draw sites are already finite choice points.** The lone exception is
`stories/dungeo/src/scheduler/forest-daemon.ts:42` — `ctx.random.next() * totalWeight`
— a weighted pick expressed as a float multiply.

This is what makes outcome enumeration a feature rather than an aspiration: a
playthrough is not a line, it is a tree, and every branch point is countable.

### Dungeo's actual randomness surface

~25 gameplay draws across 14 systems (excluding 2 id-generation sites):

| System | Draws | Enumerable? | Reachable today? |
| --- | ---: | --- | --- |
| Thief (`npcs/thief/thief-behavior.ts`) | 9 | yes — `chance` / `pick(exits)` | yes |
| Melee outcome (`combat/melee.ts:213,232`) | 2 | yes — 9-slot table, `chance` | **no** — module singleton |
| Melee villain decision (`melee.ts:449,450`) | 2 | **partition problem** | **no** — module singleton |
| Melee message variant (`melee-npc-attack.ts:221`, `melee-interceptor.ts:473`) | 2 | *presentation, not outcome* | **no** — module singleton |
| Round Room carousel (`handlers/round-room-handler.ts:62`) | 1 | yes — 8 exits | **no** — `Math.random()` |
| Bat (`handlers/bat-handler.ts:75`) | 1 | yes — n rooms | **no** — `Math.random()` |
| Low Room / magnet (`handlers/carousel-handler.ts:42`) | 1 | yes — 2 | **no** — `Math.random()` |
| DM trivia (`npcs/dungeon-master/dungeon-master-trivia.ts:115`) | 1 | yes — 8 | **no** — `Math.random()` |
| Troll axe (`npcs/troll/troll-behavior.ts:75`) | 1 | yes — `chance(0.75)` | yes |
| Troll daemon recovery (`scheduler/troll-daemon.ts:96`) | 1 | **partition problem** | yes |
| Cyclops (`npcs/cyclops/cyclops-behavior.ts:55`) | 1 | yes — `chance(0.15)` | yes |
| Grue (`handlers/grue-handler.ts:150`) | 1 | yes — `chance(0.25)` | yes |
| Forest ambience (`scheduler/forest-daemon.ts:102`) | 1 | yes — `chance(0.15)` | yes |
| Forest song (`scheduler/forest-daemon.ts:42`) | 1 | **unbounded `.next()`** | yes |

Four distinct defects, only one of which ADR-291 addresses:

1. **Reachability** — 10 of 25 draws cannot be reached from outside (6 behind melee's
   two module singletons, 4 behind raw `Math.random()`). ADR-291 D5/D6 covers this.
2. **Partition** — 3 draws are `int(1, 100) <= p`: a 100-wide domain concealing a
   two-way choice.
3. **Unbounded** — 1 draw returns a raw float.
4. **Outcome vs. presentation** — 2 draws select a message variant, not an outcome.

### Melee is the easy case; the thief is the real one

`resolveBlow` (`combat/melee.ts:177`) is a pure function —
`(att, def, isHeroAttacking, isTargetUnconscious, random) → BlowResult` — with no
mutation and no I/O. Its randomness is one `int()` against a 9-slot table plus one
`chance(0.25)`. The table is selected deterministically from strengths.

Worked: an unarmed player at score 0 has `fightStrength` 2; the troll's
`villainStrength` is 2. `getResultTable(2, 2)` returns `DEF2_RES[1]` — nine slots
holding four distinct outcomes (MISSED ×3, STAGGER ×2, LIGHT_WOUND ×3, UNCONSCIOUS ×1)
and **no KILLED**. Death arrives on the second blow, two ways: UNCONSCIOUS then any
non-STAGGER result becomes SITTING_DUCK (`melee.ts:222,255-258`), ≈8.6%; or
LIGHT_WOUND drops the hero to strength 1, whose table `DEF1_RES[1]` holds KILLED in 2
of 9 slots, ≈7.4%. The whole depth-2 tree is sixteen distinct-outcome branches.

The thief is the opposite. Nine draw sites — `chance(0.33)` to move, `pick(exits)`
where, `chance(0.4)` to steal, `chance(0.5)` which treasure, `chance(0.2)`, and four
more `pick(exits)` across lair and endgame paths — firing 2–4 times per turn for the
whole game. Its tree is not large; it is unbounded. Dungeo's own `CLAUDE.md` already
instructs authors to "run the chain twice before blaming a code change" because of it.

**This is why the ambition needs one constraint to be buildable.** Enumerating a
decision point is always cheap. Enumerating a game is never possible.

### The elegance requirement is a constraint, not a preference

Stated by David, 2026-07-31: this ADR set "must align with the elegance requirement
for both Sharpee and Chord."

Chord is a natural-language declarative surface. A real story reads:

```
create the Foyer Bar
  a room, dark while the player has the velvet cloak
  aka bar

  after entering it while in-darkness
    phrase stumble
```

No braces, no symbols, no qualified identifiers, no indices. Measured against that,
this ADR's first draft failed on four counts, and each failure is recorded here
because the correction is a decision below rather than a wording pass:

| First draft | Why it fails |
| --- | --- |
| `[DRAWS: story:dungeo/melee = 8, 3]` | index `8` says no more than `[SEED: 48291]` does — the exact charge D8 levels at seeds |
| `story:dungeo/` written by hand | the story id is declared once at the top of a `.story` file; making the author repeat it is ceremony the compiler should absorb |
| stream `kind` declared per draw | a per-draw classification tax on every author |
| transcript directives as the authoring surface | tests live in a separate file format from the story they test |

Chord also already contains the construct this ADR needs for predicates —
`define condition in-darkness: the player's location is dark`, consumed as
`while in-darkness`. Inventing a second predicate language beside it would be the
inelegance the requirement exists to prevent.

### The platform already has an author meta-command pattern

`packages/parser-en-us/src/platform-grammar.ts:47` defines
`grammar.define('trace [on|off]').mapsTo('author.trace')`, implemented at
`stdlib/src/actions/author/trace.ts`. Author/debug verbs are bare words routed through
platform grammar to an `author.*` action — no sigil, no separate dispatch path.

A `test` command has a home that already exists. It does not need a new concept.

### Fork cost — measured, 2026-07-31

Q-1 asked whether snapshot/restore is fast enough to search with. It was measured
against a real loaded dungeo world rather than estimated: `WorldModel.toJSON()` /
`loadJSON()`, 200 iterations each, at game start and after 15 real commands.

| | at game start | after 15 turns |
| --- | --- | --- |
| snapshot size | 436.4 KiB | 438.7 KiB |
| `toJSON()` p50 | 0.91 ms | 0.82 ms |
| `loadJSON()` p50 | 0.69 ms | 0.64 ms |
| **round trip p50** | **1.60 ms** | **1.45 ms** |

Cost is flat under play — fifteen turns moved the snapshot by 2 KiB. **≈623 nodes per
second**, and the restore path is already proven in production: the transcript runner
uses `world.loadJSON()` for its RETRY restore today
(`packages/bootstrap/src/index.ts:68`).

Extrapolated to the searches this ADR names:

| Search | Nodes | Cost |
| --- | ---: | --- |
| melee depth-2 (the Troll case) | 16 | **26 ms** |
| melee depth-3 | 64 | **103 ms** |
| thief, 10 turns @ branch 4 | ~10⁶ | 27 minutes |
| thief, 20 turns @ branch 4 | ~10¹² | ~51 years |

The cost splits along the line D7 already draws. **`FOUND` is cheap** — a directed
search stops at the first satisfying path, and every scenario this ADR names is
milliseconds. **`EXHAUSTED` is the expensive result**, because proving unreachability
means walking the whole tree at the horizon.

Two conclusions that belong in the record rather than being rediscovered:

- **The bottleneck is the branching factor, not serialization.** Q-1 proposed
  structural sharing or copy-on-write as the fallback if snapshots were slow. At
  1.6 ms they are not: a cheaper snapshot buys ~2×, while bounding the horizon buys
  orders of magnitude. Optimizing the snapshot would be optimizing the wrong thing.
- **Depth-first traversal roughly halves the cost.** DFS snapshots only at branch
  points on the current path — depth-many live snapshots, about 1.3 MiB at depth 3 —
  and pays one `loadJSON` per backtrack rather than a round trip per node, giving
  ≈1,400 nodes/s. Not measured; derived from the per-operation figures above.

### One detail that rules out modelling

At `melee.ts:248`, UNCONSCIOUS sets the defender's strength negative only
`if (isHeroAttacking)`. When the troll attacks the hero that line does not fire, so
the automatic kill at `:197` (`def < 0`) is unreachable in that direction and death
arrives through SITTING_DUCK instead. Reading the outcome tables alone gets this
wrong.

Any enumerator that reimplements the rules in order to enumerate them will drift from
the rules it is enumerating, and will drift silently.

---

## Decisions

### D1. Complete testability is a contract a story satisfies or fails

"Complete testability" as a goal is unfalsifiable. As a contract it is checkable. A
story is **testable** when all six hold:

| # | Property | Checkable by |
| --- | --- | --- |
| T1 | All randomness flows through the seed authority — no module singletons, no `Math.random()` | static gate (ADR-291 D6) |
| T2 | Every draw **has** a finite outcome partition, because it uses the primitive that matches it (D2) | static gate |
| T3 | Outcome randomness and presentation randomness are on separate streams (D3) | Chord: by construction. TypeScript: static gate |
| T4 | State that determines an outcome is settable from a test | audit |
| T5 | Fork and restore are faithful — every stream restores, not only `actions` | ADR-291 D4, Acceptance 4 |
| T6 | Every stream **labels its values** — outcome and presentation alike (D8, D15) | static gate (labelled API used) + runtime refusal (D8) |

T2 says *has*, not *declares*, deliberately. D2's ruling is that a partition follows
from the primitive a draw uses; a declaration would be a second statement that could
disagree with the first, and nothing would catch the disagreement.

T6 exists because labels are load-bearing in three places — D8's pins, D15's coverage
reports, and the refusal in Acceptance 6b — and a requirement the ADR rests on belongs
in the contract rather than being implied by the decisions that consume it.

**Two properties are not enforced the same way on both authoring surfaces, and the
column says so rather than implying a uniform gate.**

T3 cannot fail in Chord: D3 has the compiler infer stream kind from the construct, so
separation holds by construction and there is nothing for a gate to reject. In a
TypeScript story a stream is acquired by hand, so a message pick can land on an outcome
stream and a gate must catch it. The harder case is the one that matters — **dungeo is
TypeScript and is the acceptance corpus.**

T6 is only half static. A gate can verify that a draw went through a labelled API; it
cannot verify that every value that API yields has a name at runtime. D8 already
supplies the other half — the ledger refuses an unlabelled draw and names the stream —
so the property is enforced end to end by two mechanisms rather than one, and neither
alone is sufficient.

Dungeo satisfies T4 and partially T3 today; it fails T1, T2, and T6 at the sites tabled
above, and T5 is a platform gap ADR-291 closes.

The contract is the spine of this ADR. Everything below exists to make one of the six
properties true or to consume them.

### D2. A draw uses the primitive that matches its outcome partition

`random.int(1, 100) <= 25` is **exactly** `random.chance(0.25)` — both consume one
`next()`, and `floor(next()·100)+1 ≤ 25` ⟺ `next() < 0.25`. The distribution, the
draw count, and the stream position are all identical.

So the partition problem is not a missing declaration mechanism. It is a wrong
primitive. The rule:

- **binary outcome** → `chance(p)`
- **selection from a set** → `pick(array)`
- **`int(min, max)`** only when every value in the range is behaviourally distinct
- **`next()`** is not a draw primitive; a weighted pick is expressed as `pick` over a
  weighted set
- **`shuffle(array)`** is not a draw primitive either. Its domain is `n!` — finite, and
  useless: a 5-element shuffle branches 120 ways, none of them nameable under T6. There
  are zero call sites today (see the census), and the gate keeps it that way. Code that
  wants a shuffled order draws it as a sequence of `pick`s, each of which is a labelled
  branch point.

This was preferred over adding a partition-declaration API because a declaration can
disagree with the code it annotates, and nothing would catch the disagreement. A
primitive cannot.

**Fidelity is preserved.** Dungeo's `CLAUDE.md` commits to "adhering to all timers,
counters, and randomization logic" from the MDL source. Rewriting `int(1,100) <= 25`
as `chance(0.25)` changes neither the distribution nor the number of draws consumed,
so the MDL sequence is unaffected. This is a transcription correction, not a rules
change.

Affected: `melee.ts:449,450`, `scheduler/troll-daemon.ts:96`,
`scheduler/forest-daemon.ts:42`.

### D3. Outcome streams and presentation streams are separate, and the tree branches only on outcome

`melee-npc-attack.ts:221` and `melee-interceptor.ts:473` pass
`(arr) => random.pick(arr)` into message lookup. Those draws select a phrasing. They
do not change what happens.

**Kind is inferred, not declared** (revised in draft, elegance). Asking an author to
classify every draw is the per-draw tax D11 exists to remove. Instead:

- A draw whose result selects a **message, phrase, or media asset** is `presentation`.
  In Chord this is structural — those constructs are distinguishable in the IR, so the
  compiler assigns the kind. In a TypeScript story, a stream acquired through the
  message/phrase helpers carries it.
- **Everything else defaults to `outcome`**, which is the safe default: a
  misclassified outcome stream over-branches a search, while a misclassified
  presentation stream would silently hide reachable states.
- An explicit override exists for the case inference gets wrong, and is expected to be
  rare enough to be worth reading when it appears.

Streams are therefore of one of two **kinds**:

| Kind | Example | Enumerated? |
| --- | --- | --- |
| `outcome` | `story:dungeo/melee`, `story:dungeo/thief` | yes — the tree branches here |
| `presentation` | `story:dungeo/melee-messages`, `audio` | no — held fixed during search |

Without the split, one behavioural outcome with *k* phrasings fans out into *k*
identical-outcome branches. The tree multiplies and none of the new branches assert
anything. With it, a search over melee explores four outcomes rather than four times
the message-variant count.

During a search, presentation streams are pinned to the root seed and do not advance
per branch, so two branches differing only in outcome are textually comparable.

**This does not conflict with D15's presentation pinning.** A `rolling` clause naming a
presentation variant governs **replay**, where there is no tree; a search holds
presentation fixed because branching on phrasing produces no new behaviour. The two
never operate at the same time.

The `audio` stream ADR-291 D6 introduced is `presentation` under this rule. It stays
deterministic — ADR-291's reasoning is untouched — but it never branches a tree.

### D4. The authority records every draw

`SeedAuthority` gains a ledger. Each draw appends one entry:

```ts
interface DrawRecord {
  stream: string;          // 'story:dungeo/melee'
  kind: 'outcome' | 'presentation';
  method: 'chance' | 'pick' | 'int';
  domain: number;          // 2, array.length, max-min+1
  chosen: number;          // index into the domain
  label: string;           // the chosen value's name — required by T6
  turn: number;            // engine turn at the time of the draw
}

interface SeedAuthority {
  // …ADR-291 D2a members unchanged…
  /** Draws taken this session, in order. */
  ledger(): readonly DrawRecord[];
  /** Begin recording; no-op when already recording. */
  record(on: boolean): void;
}
```

Recording is **off by default** and enabled by the runner, the IDE, and the searcher.
A published game never records.

`domain` and `chosen` are what make a tree walkable: at any ledger entry, the
unexplored siblings are exactly the other `domain − 1` values.

### D5. A playthrough is a tree; a node is (world state, ledger prefix)

A **node** is an engine state reachable by a command sequence and a draw sequence. A
**branch** is one unexplored value at the most recent `outcome`-kind draw.

Two nodes are the same node when their world state and ledger prefix match. The tree
is finite only under a declared horizon (D7).

**The searcher does not deduplicate convergent nodes, and that is a deliberate v1
choice.** Two draw paths can reach identical world state — three MISSED results and one
MISSED differ in ledger prefix but not in world — and merging them would enlarge what a
fixed node budget can prove.

It is declined because at the depths this ADR targets the win is small: a depth-2 melee
tree has sixteen leaves and almost no convergence, so bookkeeping would cost more than
it saves. The reason is *scale*, not difficulty — a digest over the serialized state
would make node identity cheap whenever it becomes worth having.

The trade reverses with depth, and the signal is specific: a search returning
`TRUNCATED` where merging would have reached `EXHAUSTED` means dedup has become the
difference between a proof and a shrug. Recorded so the choice stays visible rather
than being mistaken for an oversight.

### D6. Enumeration at a decision point is always available

Independent of any search: at any draw the runner can report the domain, the
distribution across it, and the distinct outcomes by name — labels are required by T6,
so enumeration never has to fall back to indices.

For a melee blow that yields:

```
story:dungeo/melee  int(0,8)  → 9 slots, 4 distinct outcomes
  MISSED        3/9
  STAGGER       2/9
  LIGHT_WOUND   3/9
  UNCONSCIOUS   1/9
```

This is a read of the declared domain, not a search. It costs nothing and answers
"what can happen here" — the first half of the author requirement — without executing
a single branch.

### D7. Search is bounded, and the horizon is declared

A search takes a **predicate** and a **horizon**, and returns a path or a reason it
found none. The surface is D11's `seeking` clause; this decision fixes the model, not
the syntax:

```
seeking player-dead within 5 blows
seeking thief-has-coffin within 20 turns
```

The predicate is a declared condition (D11, and the resolution of Q-2). The horizon is
expressed in draws, blows, or turns and is **mandatory** — there is no unbounded search
mode. A default exists for interactive use but is always reported.

Three outcomes, and they are distinct results, not one boolean:

| Result | Meaning |
| --- | --- |
| `FOUND` | a path satisfying the predicate, with its draw sequence |
| `EXHAUSTED` | the whole tree within the horizon was walked; the outcome is **unreachable** at this horizon |
| `TRUNCATED` | the horizon or node budget was hit first; reachability is **unknown** |

Collapsing `EXHAUSTED` and `TRUNCATED` into "not found" would be the defect this ADR
most needs to avoid. `EXHAUSTED` is a provable negative — "the troll cannot kill a
full-health player on the first blow" is a fact worth asserting in a test.
`TRUNCATED` is an admission of ignorance. A search that cannot tell you which one it
hit has told you nothing.

**The horizon is what makes `EXHAUSTED` purchasable** (added after the fork-cost
measurement). At ≈623 nodes/s, a ten-second exhaustive proof covers roughly **6,000
nodes — about depth 6 at branch factor 4**. That is the practical ceiling on provable
unreachability, and it is a property of the tree rather than of the snapshot
implementation.

So the horizon is not merely a guard against runaway search. It is the parameter that
decides whether a negative result is a proof or a shrug. Acceptance 4 — proving the
troll cannot kill on the first blow — is a four-node proof and costs about 6 ms.

Implementations should traverse **depth-first**, which pays one restore per backtrack
instead of a round trip per node.

### D8. A found path pins named outcomes, never indices or seeds

A `FOUND` result converts to something that replays without searching. It names the
**outcomes**, not the slots that produced them:

```
rolling unconscious, sitting-duck
```

and never:

```
[DRAWS: story:dungeo/melee = 8, 3]      ← rejected (elegance)
```

The first draft used indices, which repeats precisely the charge this decision levels
at seeds: `8` tells a reader no more than `48291` does. An index also binds to a
table's *layout* — reorder `DEF2_RES[1]` without changing its distribution and every
pinned index silently means something else, while every pinned name still means what
it says.

This requires draw labels to be **first-class rather than optional**. A `pick` over a
labelled set, or an `int` over a table whose entries carry names, records the name
alongside the index (D4's `DrawRecord` gains `label?: string`). Where no label exists
the index is recorded and the pin is refused with a message naming the unlabelled
stream — an unlabelled stream is a **T6** contract violation, not a fallback.

**Labels are required on presentation streams too**, not only outcome streams (D15) —
message coverage reports name variants, and a coverage report full of indices would be
unreadable in exactly the way this decision exists to prevent.

**Pinning composes with seeding by scope**: `[SEED: N]` (ADR-291 D8) governs every
stream not pinned; a `rolling` clause governs the stream it names. A seed pins the
whole session and breaks when any unrelated draw is added upstream; an outcome pin
binds one stream and survives changes elsewhere.

### D9. Forking executes the real engine; it never models it

A branch is produced by snapshotting engine state, replaying with a different draw
value, and restoring — using `WorldModel.toJSON()`/`loadJSON()`
(`WorldModel.ts:1386,1391`) and `SaveRestoreService` for engine-side state.

No enumerator reimplements a story's rules. The `isHeroAttacking` asymmetry above is
the standing example of why: the tables say one thing, the code does another, and only
the code is authoritative.

This is a real-path requirement in the sense of rule 13a — the searcher drives
production code, and a stub of the engine would silently reclassify every reachability
claim as unverified.

### D10. The contract binds in-repo stories at build time

**T1, T2, T3, and T6** are statically checkable and join ADR-291 D6's gate over
`packages/**/src` and `stories/**/src`. **T4 and T5** are audited, not gated — T4
because "settable from a test" is a judgement about a story's shape, and T5 because it
is a platform property ADR-291's Acceptance 4 already proves once for everyone.

For an author's own project the contract is documentation, not a gate — consistent
with ADR-291 D1 leaving authored randomness alone. What an author gets is the
*feature*: a story that satisfies the contract can be enumerated and searched, and one
that does not, cannot. That is a stronger incentive than a build failure.

**The contract carries no version constant** (resolved by interview; Q-4).

A version exists so a *reader* can interpret an *artifact* written by an older
*writer*. The save format needs one because the file outlives the code that wrote it.
`SEED_DERIVATION_VERSION` (ADR-291 D2) needs one because a transcript pins a number
that a changed derivation would silently reinterpret.

The contract is not an artifact. It is a predicate evaluated against source that is
present, in front of the checker, at the moment of the check. There is nothing to read
forward — the gate applies today's rules to today's code and answers yes or no.
Versioning it would be artifact-compatibility machinery guarding something that emits
no artifact, and adding T6 is therefore a one-shot cutover: the rule lands and the
in-repo stories are fixed in the same commit.

The condition that would change this is derivable rather than memorized: **if the
contract ever emits something that is read later** — a compliance stamp in a published
story, a "testable at vN" marker in the IR — then *that artifact* needs a version. The
contract still would not.

Audited against this ADR: D10's gate is a build step and emits nothing; D15's coverage
is a report rather than a record; D8's `rolling` pins do outlive their run, but pin by
**label**, and D8 already governs label stability — renaming an outcome breaks its pins
loudly. Nothing here needs a version.

### D11. A test is declared in the story, beside what it tests

The authoring surface is the story source. In Chord:

```
define condition player-dead: the player is dead

test troll-kills-unarmed
  with "attack troll / attack troll"
  seeking player-dead within 5 blows

test troll-kills-with-sword
  with "attack troll / attack troll"
  holding the elvish sword
  seeking player-dead within 8 blows

test troll-dies
  with "attack troll / attack troll / attack troll"
  holding the elvish sword
  rolling serious-wound, killed
  expects the troll is dead
```

Four clauses, each already idiomatic somewhere in Chord:

| Clause | Precedent |
| --- | --- |
| `with "…"` | Inform 7's `Test me with "…"`; the command list is a string of `/`-separated inputs |
| `holding the …` | I7's `holding the lamp`; Chord already writes `wears the velvet cloak` |
| `seeking <condition> within N <unit>` | `define condition` / `while in-darkness` supply the predicate half (D7's horizon supplies the rest) |
| `rolling <outcome>, <outcome>` | D8's outcome pin |
| `expects <condition>` | a terminal assertion, same condition vocabulary |

**Predicates are Chord conditions — no second predicate language is introduced.**
`define condition player-dead: the player is dead` already exists and is already
consumed as `while in-darkness`; inventing a parallel grammar beside it is exactly the
inelegance the requirement exists to prevent.

One constraint follows and must be enforced rather than assumed: a condition used by
`while` is evaluated at a single point, whereas a `seeking` predicate is evaluated at
**every node** of a search. Conditions must therefore be **side-effect-free** to appear
in a `seeking` or `expects` clause. Chord conditions are declarative expressions and
already satisfy this; `chord/src/analyzer.ts` should check it at the clause rather than
trust it.

**Stream names are unqualified in source.** An author writes `melee`; the compiler
prefixes `story:<id>/` from the `id:` already declared at the top of the file. This
**amends ADR-291 D2a**, whose refusal table rejects "an empty or unnamespaced
extension/story name" — that refusal is correct for the runtime interface and wrong
for authored source, so it must fire on the resolved name, never on what the author
typed.

TypeScript stories (dungeo among them) get the equivalent as a declaration API rather
than syntax. The Chord form is the one the elegance requirement governs; the
TypeScript form must be no worse than the transcripts it replaces.

**`.transcript` files remain the interchange and regression format.** ADR-291 D8's
`[SEED: N]`, ADR-287's fenced payloads, and the dungeo walkthrough chain all continue
unchanged — this decision adds a source-level surface, it does not retire the file
format. A source-declared test can *export* to a transcript; a transcript is not
required to have come from one.

### D12. `test` is a platform meta-command, in the client, as in Inform 7

```
> test troll-kills-unarmed
```

runs the named test from the current session, echoing each command as it executes —
the Inform 7 behaviour.

It follows the existing author-verb pattern exactly:
`platform-grammar.ts` gains `grammar.define('test [name]').mapsTo('author.test')`
beside the `trace` family at `:47`, implemented at `stdlib/src/actions/author/test.ts`
beside `trace.ts`. No sigil, no new dispatch path, no new concept.

`test` with no argument lists the story's declared tests. Availability follows ADR-291
D10's rule for author surfaces: present in `--play` and the IDE, absent from a
published game unless the author opts in.

**That opt-in governs the command only.** Whether the test *declarations* reach a
compiled artifact is a separate, independently settable choice (D16) — so a tester
build can carry both, a public build neither, and the incoherent middle (a command with
nothing to run) is reachable only if an author asks for it explicitly.

This is what makes the feature *authoring* rather than *CI*. An author who wonders
whether the troll can kill an unarmed player types one word and watches it happen,
rather than composing a transcript, leaving the client, and running a CLI.

### D13. One declaration, three consumers

The same `test` block is read by three surfaces, and none of them owns a private
format:

| Consumer | Uses it as |
| --- | --- |
| the client (D12) | an interactive replay |
| the runner | a regression test in a suite |
| the searcher (D6, D7) | a seek with a declared horizon |

A `seeking` clause searches when run by the searcher and replays its found path when
run by the other two — which is why D8's pin must be part of the same block rather
than a separate artifact. Resolving a seek **writes the `rolling` clause back into the
source**, in the shape ADR-290's blessing model implies: search once, pin forever,
and the pin is legible.

### D14. The searcher is its own package; the client replays but never searches

**`@sharpee/skein`** — a new package depending on `engine`, consumed by
`transcript-tester`, the `author.test` action's runner-side counterpart, and the IDE.
It owns the outcome tree (D5), enumeration (D6), bounded search (D7), and the
fork/restore traversal (D9).

**The client replays; it does not search.** This is forced, not chosen: `engine`
depends on `stdlib` and stdlib does not depend on engine (verified 2026-07-31,
`packages/stdlib/package.json`), so `stdlib/src/actions/author/test.ts` structurally
cannot fork engine state. It does not need to — replaying a `rolling` pin is the
ordinary turn cycle with draws pre-selected, which stdlib can already do.

This matches Inform 7, where `TEST` replays a script and never searches. D13's three
consumers are unaffected: the client consumes the **pinned** form, the searcher
**produces** it, and both read the same declaration.

Rejected alternatives:

- **`packages/engine`** — everything above it could search, but the engine would have
  to know what a predicate and a horizon are. Engine owns execution; it should not own
  intent.
- **`packages/transcript-tester`** — no new package, but the IDE would depend on the
  *test runner* to offer an authoring feature, and searching would be unavailable to
  anything not running transcripts. The dependency points the wrong way.

The name follows ADR-290's lineage: the tree of playthroughs is what Inform 7 calls a
skein, and it is where ADR-290's successor will store threads. Searching is what one
does to a skein, so the artifact rather than the verb names the package.

New-package registration is a known six-point checklist in this repo
(`ts-forge.config.json`, the `sharpee` package's `package.json`, its `index.ts`, its
`tsconfig.json`, the build script, and the root `package.json`).

### D15. Presentation streams are enumerated flatly, and coverage is a first-class report

D3 holds presentation streams fixed during search so the tree does not multiply by
phrasing count. That is right for search and leaves a real authoring question
unanswered: *have I ever shown the player every variant I wrote?*

Both halves fall out of mechanisms already decided, so this adds no new machinery:

**Coverage is a query over D4's ledger.** Presentation draws are already recorded with
`stream`, `domain`, `chosen`, and (per D8) `label`. Tallying distinct `chosen` values
per presentation stream across a run or a whole suite yields:

```
story:dungeo/melee-messages   4 of 7 variants seen
  unseen: troll-miss-glancing, troll-miss-wild, troll-stagger-recover
```

This is a report, not a search mode. It costs a pass over the ledger.

**Forcing an unseen variant is D8's pin, pointed at a presentation stream.** `rolling`
names outcomes by label regardless of stream kind, so an author can reach a specific
phrasing and assert on it without a new directive.

Coverage is therefore *actionable* rather than merely observable: the report names what
was never shown, and the pin reaches it.

**Consequence for D8's labels**: they are required on presentation streams too, not
only outcome streams. Every message-variant call site needs its variants labelled —
the same sites D3 already rewrites, so this lands in that edit rather than a second
pass over the tree.

**This does not reintroduce branching.** Coverage reads the ledger of runs that
happened; it never forks. D3's rule that the outcome tree branches only on `outcome`
streams is untouched.

### D16. What ships is the author's choice, per build

`test` blocks are **author-controlled at publish**, not stripped by a fixed rule
(ruled by David, 2026-07-31: "author chooses what ships — could be to testers or to
the public").

The dev/publish binary this ADR first assumed is wrong because publication is not one
audience. A **tester** build may legitimately carry the story's tests, so a tester can
run them in the field and report which failed. A **public** build should not — an
`expects` clause names a puzzle solution and a `seeking` clause names a death
condition, and neither belongs in an artifact a player can unpack.

Coupling test inclusion to D12's command opt-in was rejected for the same reason: it
would have forced those two audiences into one switch, and an author would have had to
choose between shipping testers a runnable suite and shipping the public a clean build.

Source distribution is a separate matter and needs no rule. An author handing someone
a `.story` file hands over tests, because that is source. This decision governs only
the compiled artifact.

**This is the second feature to need the same control**, and that is worth naming
before it sprawls: ADR-291 D10 already rules the session seed "silent in a published
game unless the author opts in." Two per-feature opt-ins are a coincidence; three would
be a missing concept. A **build profile** — an author-declared audience that governs
seed visibility, test inclusion, author verbs, and whatever comes next — is the shape
this is converging on.

This ADR deliberately does **not** define that mechanism. It rules that test inclusion
is author-controlled, and records that the next feature needing an audience-dependent
switch should unify the three rather than add a fourth flag.

---

## Implementation touchpoints

**Core**
- `core/src/random/seeded-random.ts` — `DrawRecord`, ledger members on `SeedAuthority`
  (D4); stream `kind` on registration (D3)

**Engine**
- the authority instance records when enabled (D4)
- fork/restore helper over `WorldModel.toJSON()`/`loadJSON()` + `SaveRestoreService` (D9)

**`@sharpee/skein` — new package (D14)**
- the outcome tree (D5), decision-point enumeration (D6), bounded depth-first search
  (D7), fork/restore traversal (D9)
- depends on `engine`; consumed by `transcript-tester` and the IDE
- six registration points per repo convention: `ts-forge.config.json`,
  `packages/sharpee/package.json`, `packages/sharpee/src/index.ts`,
  `packages/sharpee/tsconfig.json`, the build script, root `package.json`

**Chord — the authoring surface (D11)**
- `chord/src/lexer.ts`, `parser.ts`, `ast.ts` — the `test` block and its `with` /
  `holding` / `seeking` / `rolling` / `expects` clauses
- `chord/src/analyzer.ts` — resolve unqualified stream names against the story `id:`;
  resolve `seeking`/`expects` against declared `condition`s; infer stream kind (D3)
- `chord/src/ir.ts` — test declarations reach the IR so all three consumers read one
  shape (D13)

**Client / meta-command (D12)**
- `parser-en-us/src/platform-grammar.ts:47` — `test [name]` → `author.test`, beside
  the `trace` family
- `stdlib/src/actions/author/test.ts` — new, mirroring `trace.ts`

**Runner**
- `packages/transcript-tester` — `FOUND` / `EXHAUSTED` / `TRUNCATED` reporting (D7);
  transcript export of a source-declared test (D11)
- decision-point enumeration output (D6)

**Publish path — what ships (D16)**

The audience selection is one concept; the *omission mechanism* differs by authoring
surface, and both must be specified because dungeo — the acceptance corpus — is on the
harder one.

- `packages/devkit` — the author-facing build (`./sharpee`, ADR-187) gains the audience
  selection. One flag, both surfaces
- `tools/repokit` — the in-repo equivalent for workspace stories
- **Chord stories**: `chord/src/ir.ts` emits or omits test declarations per audience.
  Omission happens at IR emission, so a stripped artifact never contained them rather
  than containing and hiding them
- **TypeScript stories**: there is no IR to omit from, so the mechanism is bundle-time
  exclusion. Test declarations live in a module the bundler drops for a public build —
  which requires them to sit in **their own module**, reachable only through a
  registration the build can sever, rather than being interleaved with story code that
  must ship. That is a constraint on how a TypeScript story is *organised*, not just on
  how it is built, and it is the one place D16 reaches back into story structure

Both paths satisfy the same test: unpacking a public artifact finds no `expects` clause
and no `seeking` predicate.

**Stories — dungeo**
- `combat/melee.ts:449,450`, `scheduler/troll-daemon.ts:96` — `int(1,100) <= p` → `chance(p)` (D2)
- `scheduler/forest-daemon.ts:42` — `next() * totalWeight` → weighted `pick` (D2)
- `melee-npc-attack.ts:221`, `melee-interceptor.ts:473` — message picks move to a
  `presentation` stream (D3)
- the 10 unreachable draws are ADR-291's work, not this ADR's

---

## Acceptance

**Surfaces**: criteria naming `stories/dungeo` exercise the **TypeScript** path;
criteria naming a Chord story exercise the **Chord** path. Where a mechanism differs by
surface (D16's omission, T3's enforcement) the criterion says so. Passing on one
surface never implies the other.

1. Every draw in `stories/dungeo` appears in the ledger with a correct `domain` and
   `chosen`, verified by replaying a transcript and checking the ledger length against
   a hand-counted expectation. **Depends on ADR-291 landing first** — 10 of dungeo's 25
   draws are unreachable until D5/D6 there retire the singletons and the
   `Math.random()` calls, and until then this criterion can only be asserted over the
   reachable 15.
2. Decision-point enumeration at a troll blow reports 9 slots and 4 distinct outcomes
   with the weights above (D6) — asserted against `DEF2_RES[1]`, not a snapshot.
3. `seeking player-dead within 3 blows` against an unarmed score-0 player facing the
   troll returns `FOUND` with a 2-blow path.
4. The same seek at `within 1 blow` returns **`EXHAUSTED`**, not `TRUNCATED` — proving
   the troll cannot kill on the first blow, and proving the two results are
   distinguishable.
5. A `FOUND` path written back as a `rolling` clause replays to the same outcome in a
   fresh process, with no search (D8, D13).
6. A `rolling` pin still replays after an unrelated new stream is registered — the
   property a `[SEED:]` pin does not have.
6a. Reordering a table's entries **without changing its distribution** leaves every
   `rolling` pin valid — the property an index pin does not have. Asserted by
   permuting `DEF2_RES[1]` in a fixture and re-running.
6b. A `rolling` pin naming an outcome on an **unlabelled** stream is refused with a
   message naming that stream, rather than falling back to an index (D8).
7. Adding a message variant to a `presentation` stream changes no branch count in any
   search (D3).
8. A search over the thief at a 20-turn horizon returns `TRUNCATED` rather than
   running unbounded, and reports the node budget it hit.
9. The gate fails a story that introduces `int(1, 100) <= p`, raw `next()`, or
   `shuffle()` — each a T2 violation, asserted separately so a single passing case
   cannot mask the others (D2, D10).
9a. The gate fails a story whose stream leaves any value **unlabelled** — a T6
   violation, distinct from T2's partition rule and from D3's inferred kind, which is
   never author-declared and so can never be "wrong" in this sense (D8, D15, D10).
10. The searcher's fork path is asserted to drive the real engine — a test that
    changes story rules and observes the search result change without the searcher
    being modified (D9).
11. A Chord story declaring `test troll-dies` compiles, and the **same declaration**
    is reachable from the client (`> test troll-dies`), the runner, and the searcher —
    asserted by exercising all three against one source block, not by three separate
    fixtures (D11, D13).
12. An author writes `rolling killed` with an **unqualified** stream name and the
    compiler resolves it against the story's `id:`; the runtime refusal for an
    unnamespaced name (ADR-291 D2a) fires on the resolved name and never on authored
    source (D11).
13. `> test` with no argument lists the story's declared tests; `> test <name>` echoes
    each command as it executes, matching Inform 7's behaviour (D12).
14. `test` is absent from a published-game run unless opted in, consistent with
    ADR-291 D10 (D12).
15. Resolving a `seeking` clause writes a `rolling` clause back into the source, and
    the re-run consumes the pin instead of searching (D13).
16. A message-variant draw is classified `presentation` by the compiler **without an
    author annotation**, and an unclassifiable draw defaults to `outcome` (D3).
17. A coverage report over a completed suite names, per presentation stream, the
    variants seen and the variants **never** seen, by label rather than index (D15).
18. A `rolling` pin naming a presentation variant reaches that variant, and the
    coverage report then shows it as seen — asserted end to end, so the report and the
    pin are proven to agree (D15).
19. Running a coverage report forks nothing: the search node count for an identical
    suite is unchanged whether or not coverage is collected (D15, D3).
20. A build declared for testers carries its `test` blocks and a build declared for the
    public does not — from **one** story source, with no source edit between them
    (D16). Asserted by unpacking both artifacts, not by reading build configuration,
    and asserted **on both authoring surfaces**: a Chord story (IR omission) and a
    TypeScript story (bundle-time exclusion). One passing surface does not carry the
    other, and dungeo is on the TypeScript path.
21. Test inclusion and D12's command opt-in are **independently** settable, so a
    tester build can carry a runnable suite while a public build carries neither
    (D16) — the coupling this decision rejected.

---

## Consequences

- **ADR-291's D4 is promoted from bookkeeping to prerequisite.** Fork-and-rewind with
  today's asymmetric persistence would silently re-randomize the NPC and hazard
  streams, making every branch below a fork wrong in a way that still looks like a
  valid playthrough.
- **ADR-291 Effort A becomes the gating dependency** and Effort B (byte-identical
  saves) becomes clearly optional — nothing here needs it.
- **`[OK: any]` can retire as a default** (ADR-277 D5). With outcomes selectable,
  verbatim assertion is the natural default rather than an aspiration.
- **ADR-290's Skein gains its missing axis.** I7's skein branches on player commands;
  this branches on draws. The two compose into the space a player can actually
  experience.
- **Every message-variant call site in every story changes shape** (D3). This is the
  widest mechanical consequence and it reaches stories beyond dungeo.
- **Some outcomes will be proven unreachable**, and some of those will be surprises.
  `EXHAUSTED` results are findings about the design, not test failures.
- **Search cost is measured and is not a blocker** (Q-1, resolved). 1.6 ms per
  fork/restore, ≈623 nodes/s. `FOUND` on the scenarios this ADR names costs
  milliseconds. What is bounded is `EXHAUSTED`: provable unreachability reaches about
  6,000 nodes in ten seconds, roughly depth 6 at branch factor 4.
- **A new package enters the tree** (D14) with the six registration points that
  implies. `@sharpee/skein` is also where ADR-290's successor will live, so the cost is
  shared rather than borne by this ADR alone.
- **The client can never search** (D14), because `engine` → `stdlib` and not the
  reverse. If a future author surface wants in-client search, it needs an event-driven
  path out to the engine rather than a direct call — worth knowing before someone
  tries.
- **Chord gains a `test` block** (D11) — the language's first construct that is about
  the story rather than in it. That is a genuine widening of what Chord is for, and it
  should be a deliberate choice rather than a side effect of this ADR.
- **Outcome labels become part of a story's contract** (D8). Renaming a melee outcome
  breaks every pin naming it — which is correct and legible, where renaming was
  previously invisible because pins held indices.
- **Every message variant must be labelled** (D8, D15). This is the widest small cost
  in the ADR: it touches every message-variant call site in every story, though it
  lands in the same edit D3 already requires there.
- **Message coverage becomes measurable** (D15), which it has never been. Expect the
  first report on a mature story to name variants written years ago and never once
  shown to a player.
- **ADR-291 D2a is amended** (D11): its unnamespaced-name refusal fires on resolved
  names, never on authored source.
- **Tests move into the story file**, so they travel with any source an author
  distributes. What reaches a *compiled artifact* is the author's per-build choice
  (D16), which lets a tester build carry a runnable suite while a public build does
  not.
- **A build-profile concept is emerging and is not yet defined** (D16). Seed
  visibility (ADR-291 D10) and test inclusion now both need an author-declared
  audience. The third such feature should unify them rather than add another flag.
- **A TypeScript story's tests must live in their own module** (D16), so a public build
  can drop them at bundle time. Chord has no such constraint — its IR emitter simply
  omits them. This is the only place the ADR reaches back into how a story is
  organised rather than how it is built.
- **`trace` gains a sibling.** The author-verb family at `platform-grammar.ts:47` is
  currently one command; `test` makes it a family, and the next author verb will look
  to these two for the pattern.

---

## Tracked work

None filed. If the dungeo contract violations are filed, they should cite T1/T2/T3/T6 and
name the sites in the Context table rather than the systems.

## Session

Drafted 2026-07-31, session 8a8dd0, immediately after the ADR-291 determinism
inventory (`docs/work/adr-291-seed-authority/determinism-inventory-20260731.md`).

The path here was three reframings, each from David. First, that dungeo should have
been ADR-291's test rather than its afterthought — which produced the inventory.
Second, that the author-side requirement is enumerating outcomes and generating plays
to reach them, not reproducing runs — which showed a pinned seed cannot deliver it.
Third, that melee was only an example and the goal is complete testability — which
turned a combat-shaped answer into the contract in D1.

The Troll walkthrough in Context was computed from `melee-tables.ts` and verified
against `resolveBlow`, including the `isHeroAttacking` asymmetry that a
tables-only reading gets wrong. That asymmetry is why D9 exists.

All five open questions were resolved by interview in the same session. Q-1 was settled
by **measurement rather than argument** — 1.6 ms per fork/restore against a real dungeo
world, which moved the constraint off serialization and onto the branching factor, and
produced D7's `EXHAUSTED` ceiling. Q-2 and Q-4 both resolved by finding the question to
be a category error: Chord already had a predicate language, and a contract that emits
no artifact needs no version. Q-3 and Q-5 were rulings, and Q-5 overturned the draft's
recommendation — the dev/publish binary this ADR assumed collapses two audiences,
because a build for testers and a build for the public are not the same artifact.

A fourth reframing arrived after the first draft: the ADR set "must align with the
elegance requirement for both Sharpee and Chord," and "we may want to add the TEST
command in the client to work just like Inform 7." Reading `cloak.story` against the
draft's own syntax settled it immediately — `[DRAWS: story:dungeo/melee = 8, 3]` beside
`a room, dark while the player has the velvet cloak` is not a near miss. D11–D13 are
that correction, and two of them turned out to need no new mechanism at all: Chord's
`condition` already supplies D7's predicates, and `platform-grammar.ts:47`'s `trace`
already supplies D12's command shape. The elegance constraint did not add work here —
it removed two inventions.
