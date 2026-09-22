# Explorer spike — what a state-space walk actually costs

**Date**: 2026-09-22 (session a33939, branch `explorer-prototype`)
**Prompted by**: David — "we have a graph of all possibilities with likely
actions/commands discernable", and the testing UX being "too mechanical".
**Subject**: ADR-294 **D20** ("the explorer — bounded exhaustive play"), unbuilt.
**Artifact**: `tools/explorer-probe/explore.js` — a spike, not a product. No
`packages/` code was changed.

## What was built

A breadth-first walker over a story's reachable state space, using only public
surfaces: `loadAuthorGame` to boot, and the engine's save/restore hooks as the
fork primitive — the same pattern `transcript-tester/src/search.ts` already
uses for ADR-293 D12's outcome search. Candidate commands are generated from
room exits plus each in-scope entity's traits (the trait is the affordance).

Deliberately **not** included, so every number below is a LOWER bound: no
outcome forcing at choice points, no conversation topics, no multi-object
commands beyond a capped put-in/put-on.

## Finding 1 — the fork primitive is sound and fast

Save and restore round-trip **byte-identically**: a full snapshot diff after
save → command → restore shows no differing key. Save costs ~4ms, restore
~2ms. Throughput is **859 commands/sec** on fernhill and **346–369/sec** on
secret-letter, consistent with the ~640/sec ADR-353 measured for the tree
runner. Nothing here is the bottleneck.

## Finding 2 — D20's proposed dedup does not work, at all

D20 says "a hash of the canonical snapshot deduplicates states". Measured on
fernhill with exactly that rule: **1.0025 new states per command** — every
single command yields a state never seen before, so dedup never fires once and
the walk is a pure exponential tree.

The snapshot embeds bookkeeping that advances every turn regardless of what
happened. Five independent carriers were found, each sufficient on its own to
destroy dedup, and each found by measurement rather than by reading code:

| Carrier | What it is | Found on |
|---|---|---|
| `capabilities.commandHistory` | the command log — and it carries wall-clock timestamps, so it is not even stable run-to-run | fernhill |
| `capabilities.textState` | Chord's prose-variation cycling counters | fernhill |
| `state.chord.rng` | the Chord evaluator's RNG stream | fernhill |
| `state.chord.occurrence.*` | occurrence counters ("the third time you enter") | fernhill |
| `state.character.turn` | the character tick's turn counter | **secret-letter only** — fernhill never exercises it |

That last row is the one that matters for the product. Two stories produced
two different blocklists, and the fifth carrier was invisible until a story
with NPCs ran. **A hand-maintained blocklist is the wrong shape**: the engine
needs to be able to answer "what is the game state, as distinct from history,
presentation and bookkeeping", and today it cannot. That capability is the
real prerequisite for D20, and it does not exist.

## Finding 3 — what remains is genuine combinatorics, and it is object placement

With the bookkeeping stripped, fernhill (9 rooms):

| State identity | States | Commands | Time | Outcome |
|---|---:|---:|---:|---|
| object placement counted | 34,654 | 207,607 | 240s | **did not finish**, 19,609 queued, depth 12 |
| object placement ignored | **174** | 2,282 | **2.6s** | **exhausted**, all 9 rooms, depth 21 |

Same story, same generator, same engine. A **200× difference**, and the
difference between non-terminating and instant. The explosion is *where you
left things*, not story progress.

Ignoring placement is deliberately **unsound** — it cannot see "the door won't
unlock because the key is in the cellar". It is measured here to size the
problem, not proposed as the rule.

## Finding 4 — parallelism is the wrong lever

Sustained branching factor per depth level: **~2.4×** on fernhill, **5.4–6.3×**
on secret-letter.

Extra depth bought by throwing cores at it, at secret-letter's 6.3×:

| Cores | Extra depth levels |
|---:|---:|
| 8 | 1.1 |
| 64 | 2.3 |

secret-letter reached depth 6 in 240 seconds. Sixty-four cores would take it to
depth eight. A walkthrough is 50–200 moves. Parallelism multiplies; the problem
exponentiates, and no affordable multiple closes that gap. The identity rule in
Finding 3 closed a 200× gap for free, on one story, in one line of projection.

Where parallelism *would* pay: branching per declared outcome class via
`materialize` (ADR-293 Phase C) multiplies the space by a constant per choice
point. That is a constant-factor problem, which is what cores are for.

## Finding 5 — it finds real defects immediately

secret-letter, during the walk: `renderMessage("stall-lift-quietly")` fails
with `param 'item' is not bound` — an authored phrase whose template never
renders. No hand-written test had reached it.

It fired **10,021 times** across the walk, for **one** underlying defect. A
findings surface must fold by defect, never report occurrences — which is the
same "a map, not a log" point the UX discussion started from.

## Finding 6 — the space is a PRODUCT of independent dimensions, not a graph

`place` mode barely helped secret-letter (12,098 → 10,536 states, still depth
6), so placement could not be its driver the way it was fernhill's. Profiling
the identity's components over 4,000 discovered states says otherwise, and
says why:

| Component | Distinct values across 4,000 states |
|---|---:|
| `loc` (containment) | **3,102** |
| `state` (Chord story state) | 254 |
| `flags` (stateful traits) | 27 |
| `state.chord.state.pear` | 2 |
| `state.chord.state.lime` | 2 |
| `state.chord.state.knife` | 2 |
| …and ~17 more wares, each | 2 |

Containment IS the driver on secret-letter too. `place` mode failed to collapse
it because **the story mirrors placement into its own state**: Chord tracks a
per-ware binary (`chord.state.<ware>`), so stripping containment leaves the
identical information in `state`. Roughly twenty market wares, each
independently takeable, is 2^20 combinations — and breadth-first search
enumerates the product.

This is the finding that matters most, and it is not a dedup problem. Taking
the pear does not interact with taking the lime. The space is a **product of
mostly-independent dimensions**, and exhaustive search spends all of its
budget crossing dimensions that never interact.

The established answer to a product of independent dimensions is not graph
search and not more cores — it is **combinatorial coverage**: cover all
*pairs* of dimension values rather than all combinations. Twenty binaries go
from 1,048,576 combinations to on the order of tens of cases for pairwise
coverage, and interaction bugs — which is what IF defects are — live in pairs
and triples, not in twenty-way conjunctions.

So the shape of a tractable explorer is:

1. **Factor** the state into dimensions, from the story's own declarations
   (each `chord.state.<thing>`, each room, each declared story state).
2. **Search exhaustively** over the *dependent* structure — rooms, doors,
   puzzle chains, declared rule preconditions — which is small and is where
   reachability questions live.
3. **Cover combinatorially** over the independent dimensions, rather than
   crossing them.

None of step 3 is measured here. It is the next spike, and it is a different
algorithm from the one this spike built.

## Finding 7 — the factored identity works, and it is derivable from the IR

`tools/explorer-probe/dimensions.js` derives a story's load-bearing state
dimensions from its compiled Story IR. The rule: **a dimension is load-bearing
when some rule READS it.** A state that is written but never tested cannot
change what the story does, so it cannot distinguish two worlds.

Getting this right required distinguishing reads from writes. Matching on bare
state *names* marks everything, because `trading`/`blocked` are shared
vocabulary across forty entities rather than one entity's private enum. The
read shapes, measured from the IR:

```
state read   {kind:'predicate', pred:'is', subject:{kind:'entity',id},
              object:{kind:'symbol', name}}
story state  {kind:'story-state', state:'hunted'}
placement    pred 'is-in' | 'is-here' | 'has'
state write  {kind:'change', entity:{kind:'entity',id}, state:'loose'}
exit gate    entity.exits[].via  -- see the soundness note below
```

What it derives:

| | fernhill | secret-letter |
|---|---:|---:|
| entities in IR | 65 | 158 |
| declared state dimensions | 8 | 40 |
| **load-bearing** | **7** | **13** |
| inert (nothing reads them) | 1 | **27** |
| full product | 2.30e3 | **7.42e12** |
| load-bearing product | 1.15e3 | **5.53e4** |

secret-letter's 27 inert dimensions are exactly the market wares — apple,
pear, lime, loaf, cheese, jerky, four wax candles, clay pot/urn/jar and the
rest. Nothing branches on them. fernhill, a tight puzzle story, has just one
inert dimension, which is the right answer for a story where almost
everything matters.

### The walk, with the factored identity

| Story | identity | states | time | outcome |
|---|---|---:|---:|---|
| fernhill | `play` | 34,654+ | 240s | never finished, depth 12 |
| fernhill | `declared` | **325** | **3.9s** | **exhausted, all 9 rooms** |
| secret-letter | `play` | 15,131 | 300s | never finished, depth 6 |
| secret-letter | `declared` | **360** | **27.8s** | **exhausted, all 18 rooms, depth 16** |

secret-letter's entire reachable space, under 400 states, in under half a
minute — against a walk that had not left depth 6 after five minutes.

### The soundness check that earned its keep

The first `declared` run of fernhill reached **8 rooms where the coarser modes
reached 9**. The Pantry had gone missing.

Cause: the Kitchen reaches the Pantry `north ... via pantry-door`, and no
condition names that door. So the door's openable state was outside the
identity, the opened world deduped against the closed one, and `north` was
never explored from the opened state. **An unsound identity does not announce
itself — it silently deletes part of the story.**

Adding `exits[].via` to the derivation restored the ninth room (139 → 325
states, still 3.9s). This is the argument for the walk reporting room and
ending counts: they are the cheap external check on an identity rule that is
otherwise unfalsifiable from the inside.

It is also the reason the derivation errs toward inclusion: a spurious
dimension costs states, a missed one costs truth.

## Finding 8 — brute force cannot answer reachability, and this is the number that proves it

The zero-endings result had two candidate causes: broken ending detection, or a
command generator that cannot express what endings need. Detection was fine —
replaying fernhill's `WALKTHROUGH.txt` gives
`world.storyEnding = {kind:"victory",turn:30,messageId:"fernhill-saved"}`.

The generator was the gap, and closing it took three more derivations, each one
found by a walk silently failing:

| Missing | Symptom | Derivation added |
|---|---|---|
| exit gates | the Pantry disappeared | `exits[].via` names a door whose open state gates a room |
| declared verbs / topics | no ending at all | `ir.actions` patterns; `entity.topics` filters; `onClauses[].action` (fernhill's stopcock is only `scenery` yet carries `on turning`) |
| required instruments | only ever died to the fuse | a trait config naming an entity (`cuttable "garden shears"`, `openable "silver locket"`) declares a needed tool, whose PLACEMENT is load-bearing |

Each fix was correct. Each made the space bigger:

| fernhill, factored identity | states | time | outcome |
|---|---:|---:|---|
| initial | 174 | 2.6s | exhausted, 9 rooms |
| + exit gates | 325 | 3.9s | exhausted, 9 rooms |
| + declared verbs and topics | 864 | 32.6s | exhausted, 10 rooms |
| + declared instruments | 5,715 | 217s | exhausted, 12 rooms, defeat only |
| + instrument placement | **23,163** | **900s** | **budget exhausted**, 5,561 queued, defeat only |

**715,903 commands, fifteen minutes, and it never found a 29-command winning
path that is written down in the repository.** The sound version of brute force
costs what the naive version cost, and still cannot answer the one question the
whole idea rests on.

The reason is structural, not a budget problem. Breadth-first search reaches
depth *d* only after enumerating everything shallower, and fernhill's victory
sits at depth 29 behind a branching factor of roughly 5-10 once the generator
is complete enough to express the solution. No hardware and no parallelism
reaches depth 29 that way. **Ending reachability is not a search-budget
problem; it is the wrong algorithm.**

### What this implies (raised by David from Claude Desktop, 2026-09-22)

Reachability is a planning problem: export preconditions and effects, run
BFS/A* or a real planner, and ask "is there a path to ending E", getting a
yes/no and a witness trace without enumerating the verb x object x room
product at all.

One premise needs correcting, and the correction is favourable. Sharpee's
standard actions are NOT declarative — `validate()` is arbitrary TypeScript, so
no STRIPS operator can be lifted out of stdlib. But **the Chord layer is**, and
that is where the interesting preconditions live: the IR carries condition
trees as literal predicates and rule bodies as effect statements
(`change` / `move` / `win`). The missing piece is a one-time effect table for
the ~57 standard actions — platform semantics, stable across stories.

**The tension to respect**: ADR-293 D12 superseded ADR-292 partly on the
grounds that search "executes the real engine rather than modelling it", and a
STRIPS export is exactly a model of the engine. The resolution that keeps D12
intact: **plan against the model, verify against the engine.** The planner only
proposes; replaying its witness trace through the real engine is what makes the
answer true, and a plan the engine refuses is itself a finding — the model and
the engine disagree, and one of them is wrong.

**What planning will not give you.** GH #504 — a phrase that fails to render
with an unbound param — was found by executing 10,021 paths, and no
precondition model would ever surface it. Crashes, unhandled error events and
runtime softlocks need execution. So the shape is two instruments: planning for
"can you get there", execution for "what breaks on the way". The walk built
here is adequate for the second and was never going to be adequate for the
first.

## What this says about the product

An explorer is viable, but not as *exhaustive* play. The reachable-state count
of even a nine-room story is astronomical when every object placement is a
coordinate, and that is a fact about IF, not about this engine.

The tractable version abstracts, and Chord is what makes the abstraction
derivable rather than authored: **an object named in a rule's condition is
load-bearing and belongs in the state identity; an object carrying only a
description does not.** The story already declares which is which.

So the state-identity rule is the product decision, not an implementation
detail. It decides whether the explorer answers in five seconds or never.

## Open, not decided here

1. The significance set — derived from rule conditions, or author-declarable?
2. Occurrence counters are real game state and also explosive. In or out?
3. Does the engine grow a canonical "game state" projection, and who owns it?
4. Goal-directed search (toward endings, unvisited rooms, unfired points)
   instead of breadth-first — likely the real shape, unmeasured here.
5. Pairwise/combinatorial coverage over the independent dimensions of
   Finding 6, and how dimensions are identified from the Story IR.

## Reproducing

```
node tools/explorer-probe/explore.js branch-stories/fernhill/fernhill.story \
  --hash place --max-states 200000 --max-seconds 150
```

`--hash full|coarse|play|place` selects the identity rule; the four are the
measurement.
