# ADR-293: Choice points and per-point streams — deterministic execution and author-reachable outcomes

## Status: ACCEPTED (2026-08-01, session 9f136f) — written from a fresh-eyes design exchange (`docs/work/rng/`), not from its predecessors. All five Open Questions resolved by interview the same day (Q-1 naming convention, Q-2 blow-point split and class sets, Q-3 occurrence indexing, Q-4 `--vary` kept and `--sweep` dropped, Q-5 trace on `ISystemEvent`), then `adr-review`ed at 14/16 with two BLOCKER and three SMALL findings, all folded. Accepted by David on the folded result. **Supersedes ADR-291 and ADR-292**, both marked SUPERSEDED IN PLACE by this acceptance — see Supersession.

**Platform change, approved in principle by this acceptance; Phase A still requires its own discussion before implementation starts** (project rule: platform changes are discussed first). Packages: `packages/core`, `packages/engine`, `packages/stdlib`, `packages/world-model`, `packages/plugins`, `packages/plugin-scheduler`, `packages/media`, `packages/character`, `packages/extensions/basic-combat`, `packages/transcript-tester`. **Story change**: `stories/dungeo`, `stories/armoured`, `stories/thealderman`, `stories/cloak-of-darkness`.

## Date: 2026-08-01

## Supersedes

**ADR-291** (one seed authority, many named streams) and **ADR-292** (testability
contract and bounded outcome search). Both were written against a substrate that had not
yet been designed, and both were amended toward this design without reaching it:
ADR-291 took four amendments and four review passes while oscillating between 12/16 and
14/16, because each pass found execution detail in a document that had specified
implementation ahead of its own foundations.

What survives from ADR-291, in substance: one master seed governs a run (D1); the
derivation from seed to stream is a frozen, versioned hash mix (D3); every stream's state
rides the save with a versioned reader (D7); `--seed`, `[SEED: N]`, and always reporting
the seed (D14); the seed is visible to authors and silent to players (D14); randomness
outside the sanctioned path is a build-visible defect (D6). What does not survive:
per-domain named streams, which this ADR replaces with per-point streams, and the
`SeedAuthority` interface shape.

What survives from ADR-292, in substance: complete testability as a checkable contract
rather than an unfalsifiable goal (D2, D15); draws must expose a finite, enumerable
outcome space (D4); outcome randomness is separated from presentation randomness (D4);
forking executes the real engine rather than modelling it (D12). What does not survive:
the draw ledger as an interface on the seed authority, bounded outcome search as the
primary author instrument, and the `@sharpee/skein` package that existed to hold it.

**The supersession takes effect on this ADR's acceptance**, not on its writing. When ADR-293
is marked ACCEPTED, ADR-291 and ADR-292 are marked **SUPERSEDED IN PLACE** with a pointer here
— the form ADR-288 already uses in this repository — and neither is implemented. While
ADR-293 remains DRAFT, ADR-291 stays ACCEPTED-but-unimplemented and ADR-292 stays DRAFT.

**Chord is deliberately out of scope**, at David's direction: if the Sharpee-level
substrate is right, the Chord form derives from it, and specifying an authoring surface
ahead of the substrate is what produced ADR-292's D11–D13. See "Deferred, not decided".

## Parent: ADR-231 D6 (stream isolation — this ADR makes it structural rather than conventional), ADR-227 (persisting a stream's seed across save/restore), ADR-224 (the deadly-room probabilistic hazard), ADR-290 (test creation as an atomic mode — DRAFT; its Acceptance 1 is unachievable until this ADR lands, which ADR-290 does not currently say), ADR-277/ADR-282 (the capture format whose `[OK: any]` default exists to dodge the problem this ADR closes), ADR-187 (`./repokit verify`, where D6's gate runs).

## Context — verified, not assumed

Every claim was read out of the working tree on 2026-07-31 or 2026-08-01.

### The primitive is good; what is missing is an owner and a name

`packages/core/src/random/seeded-random.ts` defines `SeededRandom` (LCG, glibc
constants) with `next / int / chance / pick / shuffle / getSeed / setSeed`. Two properties
matter. **State is seed**: `getSeed()` returns current internal state, which is what makes
mid-stream persistence work. **Unseeded construction reads the clock**:
`createSeededRandom()` falls through to `seed ?? Date.now()`, so every call site that omits
a seed is deterministic within a run and different across runs.

The plumbing for determinism is real and largely already threaded — `ActionContext.random`,
`TurnPluginContext.random`, `WeaponBehavior.calculateDamage(weapon, rng)`,
`AttackBehavior.attack(target, weapon, world, rng)`,
`DeadlyRoomBehavior.checkVerb(t, verb, rng?)` — and several headers already say "never
`Math.random()`". What is missing is a seed authority behind the streams, an injection
surface, a name per draw, and enforcement.

### Five independent stream owners, none reachable

| Owner | Created | Seedable from outside | Persisted |
| --- | --- | --- | --- |
| `GameEngine.random` | `game-engine.ts:306`, time-seeded | no | **no** |
| `GameEngine.actionRandom` | `game-engine.ts:309`, time-seeded | no | yes (`save-restore-service.ts:230`) |
| `SchedulerService.random` | `scheduler-service.ts:84` | constructor accepts a seed; dungeo passes none | yes |
| Chord `Evaluator.rng` | `evaluator.ts:103` | yes (`StoryLoaderOptions.seed`) | yes (world state) |
| Module-scope combat singletons | at import, time-seeded | **no** | **no** |

`GameEngine.random` feeds the deadly-room transformer (`:349`) and every turn plugin
(`:1150`), and is the one stream excluded from save/restore — so a restored save silently
re-randomizes NPC behaviour and hazard rolls while continuing action rolls exactly.

The lang-en-us assembler is the best-behaved randomness in the system and is **not** RNG:
`random`/`sticky` message variation is a deterministic `hash(salt + counter)`
(`english-assembler.ts:20,552`) with counters persisted through the `TEXT_STATE`
capability. It needs nothing from this ADR.

### The four module singletons are the worst case, and two of them are the flake

`stories/dungeo/src/interceptors/melee-interceptor.ts:47` and
`stories/dungeo/src/combat/melee-npc-attack.ts:45` construct `SeededRandom` at module load
with no seed. `melee-npc-attack.ts` *receives* an injected `SeededRandom` at `:109`, names
it `_random`, and overrides it with the module singleton at `:116` — the determinism seam
exists and is bypassed at the one place dungeo combat rolls. Its own test file documents
this. `packages/extensions/basic-combat` carries the same pattern twice.

Both dungeo singletons carry a header comment explaining that a per-attack
`createSeededRandom()` produced identical rolls inside one `Date.now()` millisecond — a
workaround that documents the absence of a seed authority in as many words.

Consequences: combat is non-reproducible regardless of any future seed flag; combat state
does not round-trip through save/restore; and **two engine instances in one process share
these streams**, which is why test suites and zifmia perturb each other.

### Gameplay dice outside any stream

`round-room-handler.ts:62` (which exit), `bat-handler.ts:75` (which room), `carousel-handler.ts:42`
(destination), `dungeon-master-trivia.ts:115` (opening question) in dungeo; plus
`stories/armoured/src/combat/combat-utils.ts:83`, `stories/thealderman/src/randomization.ts:43`,
and `stories/cloak-of-darkness/src/index.ts:524`. All are handler or daemon code where a
stream is available or one wiring step away — the grue handler and forest daemon in the
same directories already do it correctly.

`packages/media/src/audio/audio-registry.ts:205-215` draws three `Math.random()` values and
**bakes them into a semantic event**: `createTypedEvent('audio.sfx', { src, volume, rate, duck })`.
They enter the event source and serialize. Audio is inside the determinism boundary, not
outside it — a fresh-eyes assessment initially placed it outside, and the code settled it.

### Silent fallbacks and no injection surface

`random ?? createSeededRandom()` appears at `engine/src/action-context-factory.ts:82`,
`stdlib/src/actions/enhanced-context.ts:60`, and `save-restore-service.ts:301` (restore of a
save with no `actionRngSeed` reseeds from the clock). A missed wiring never fails loudly.

`EngineConfig` (`engine/src/types.ts:226`) has no seed field. There is no `--seed` flag
anywhere. `packages/transcript-tester/src` contains zero occurrences of "seed": its answer
to randomness is behavioural, with the navigator retrying up to 50 times
(`navigator.ts:18`) and walkthroughs carrying surplus attack commands. The harness fights
randomness instead of controlling it.

### The type-level symptom

`packages/character/src/tick-phases.ts:57` declares its context field as `random: unknown`.
A package that carries a draw context and, having no nameable type within its dependency
reach, typed it away. It is the clearest evidence that the missing piece is a *type in the
right package*, not a mechanism.

### Nobody can import engine

Verified `@sharpee/*` dependency sets. `world-model`: core, if-domain. `stdlib`: core,
if-domain, if-services, lang-en-us, text-blocks, world-model. `plugin-scheduler`: core,
world-model, plugins. `plugin-npc`: core, world-model, plugins, stdlib. `media`: core.
`character`: core. **No drawing package depends on `@sharpee/engine`, and the direction is
deliberate** — engine depends on stdlib, not the reverse. Any type these packages must
name lives in core or nowhere.

### The clock population, for scoping only

Beyond ~32 sites building ids as `` `${Date.now()}_${Math.random()}` `` (30 in
`packages/**/src`, 2 in `stories/dungeo`), a full sweep found ~49 further id sites carrying
a clock and no randomness at all, and `ISemanticEvent.timestamp` as a **required** field
(`core/src/events/types.ts:22`) stamped at 184 sites tree-wide and serialized into the save
(`save-restore-service.ts:333,383`). None of it renders. This bounds D13.

---

## Decisions

### D1. One master seed; a run is a function of it and its declared instruments

A single master seed governs a session. Given the same master seed and command sequence, a
story produces the same rendered output.

Two instruments may condition a run, and both are explicit:

```
run = f(masterSeed, forceTable, pointSeedOverrides)
```

`forceTable` (D8) replaces outcomes and is a testing instrument. `pointSeedOverrides` (D11)
changes where a single point's stream starts and leaves every draw real. Absent both, a run
is a pure seeded replay.

The master seed comes from one of four sources, in this precedence:

```
(--seed N | --vary)  →  [SEED: N]  →  EngineConfig.seed  →  the clock
```

**`--seed` and `--vary` are mutually exclusive and passing both is a hard error**, not an
ordered win. They are two explicit, contradictory instructions, and silently preferring one is
the same disease as last-wins force keys, which D9 rejects for the same reason. `--vary`
occupies the same precedence slot because its job (D14) is to override a pinned `[SEED:]`
header with one fresh seed.

**A published game is unaffected**: with no seed given, the clock is read exactly once at the
top and play is as varied as today.

### D2. Declaration is the capability to draw

`definePoint(name, opts?)` returns a handle. The draw API accepts **only handles**. Gameplay
code in stories, stdlib, world-model, plugins, and extensions never sees a bare
`SeededRandom`.

The one exception is internal and deliberate: a point's own `sample` callback (D8) receives
*that point's* stream, because the draw already went through the handle that produced it. No
other route to a bare `SeededRandom` exists in gameplay code, and D6 gates its construction.

The consequence is the point of the decision: **the catalog is complete by construction.**
A draw cannot exist without a declaration, so "which points never fired" is
`catalog − fired`, computed without a static scan, a lint rule, or a registration
convention that can be forgotten.

Implicit registration — first use registers the name — is rejected. It reads as cheaper and
silently destroys the never-fired column, which is the column that answers the author's
actual question.

Declarations are one line at module scope, static, immutable, idempotent, registered as a
side effect of import, and snapshotted by the engine at story start.

**The naming convention** (ruled by David, 2026-08-01): **dotted segments, the first of
which is the story or package id, with every token spelled out and no abbreviations.**

```
dungeo.thief.steal          dungeo.melee.blow.hero
stdlib.throwing.breaks      basic-combat.blow
```

Uniqueness rides on story and package ids already being unique, so no further namespacing
is required. ADR-291's `story:<id>/` and `ext:<pkg>/` sigils are **not** carried forward:
they existed to let a refusal table reject unnamespaced names, and this ADR has no such
refusal — a name is either a declared point or it does not exist (D2). A separate kind
segment (`story.dungeo.…`, `platform.stdlib.…`) was also rejected: it buys collision safety
only against a story named after a platform package, and lengthens every name in every
trace line and coverage row to do it.

The convention is load-bearing beyond style. Names are author-typed inside directives
(`[FORCE: dungeo.thief.steal=yes]`), so a single separator and no abbreviations is what
keeps them writable from memory; and per D7 a name is a persistent identifier, so the
convention wants to be settled before the first declaration lands rather than after.

### D3. Every point owns its stream, derived from its name

`streamState = mix(masterSeed, pointName)`, computed lazily on first draw and cached. The mix
is FNV-1a over the name, folded into the master seed, and is a **compatibility surface**:
it carries a `SEED_DERIVATION_VERSION` constant and is pinned by a test holding hardcoded
expected values. Ordinal or additive derivation is rejected — core's LCG produces visibly
correlated sequences from nearby seeds, which would couple the very points this decision
keeps independent.

Two properties follow, and both are load-bearing:

- **Derivation is order-independent.** A point's stream depends on its name and the master
  seed, never on registration or first-draw order.
- **Draw-count coupling becomes internal to a point.** No other point can observe how many
  draws a point consumed, because no other point reads its stream. This is what makes
  zero-draw forcing (D8) coherent, and it is why per-domain streams were rejected: on a
  shared `combat` stream, adding one thief draw shifts every troll outcome, which is the
  same failure one level down.

Cost, measured for dungeo: ~25–30 gameplay points plus a handful of plain draws, so **≤ ~40
u32 entries**, a few hundred bytes, one hash per point per session. There is no meaningful
cost argument against per-point granularity.

Dynamic instances are parameterized names — `npc.wander:<entityId>` — bounded by entity
count and still lazily derived.

### D4. Two tiers: choice points and plain draws

Not every draw is a coverage point.

- A **choice point** declares outcome classes. It is traced, counted in coverage, and
  forceable.
- A **plain draw** declares only a name. It is seeded and traced, but has no classes and no
  coverage row.

Audio pitch jitter is the canonical plain draw: a continuous cosmetic value with no
enumerable classes, which nobody play-tests exhaustively. Message-variant picks are the
other case.

This replaces the idea of a declared-exempt list. **Everything is on a stream**; only
class-bearing points participate in coverage. Nothing is outside the determinism boundary,
which is what the audio finding above forces.

### D5. The interface lives in core; the instance lives in engine

`ChoicePoint`, `definePoint`, the catalog, the `RandomService` interface, and the
trace/coverage report types all live in **`packages/core`**. Engine owns the sole
implementation: stream derivation and cache, force-table lookup, trace, coverage counters,
and stream-state persistence.

This is forced by the dependency facts in Context, not chosen for taste. Every drawing
package can import core; none can import engine. Putting the interface in engine would leave
stdlib — which owns roughly eight points — unable to name the type it must accept, and would
push world-model behaviours back onto bare `SeededRandom`, reopening the catalog gap D2
closes.

Core gains types and an inert catalog. No state that draws, no new dependency edge.

### D6. Construction of randomness is gated; module-scope randomness is retired

> `createSeededRandom` may be called only by `RandomService`'s implementation in engine, by
> test fixtures, and by the Chord evaluator until it folds in. All other gameplay code draws
> exclusively through a `ChoicePoint` handle.

The rule governs **construction**, not parameter passing. A behaviour may keep accepting a
`SeededRandom` parameter — `WeaponBehavior.calculateDamage(weapon, rng)` is called inside a
`resolve()` sample callback, so the draw already went through a handle upstream and the
behaviour is drawing on the point's own stream. Construction is what creates
catalog-invisible draws.

The four module-scope singletons are deleted. The workaround they existed for — identical
rolls inside one clock millisecond — disappears once streams derive from a seed rather than
the clock.

**Enforcement is two greps in `./repokit verify`**: fail on `createSeededRandom(` outside
`packages/engine/src/`, `packages/core/src/random/`, `packages/story-loader/src/`, and test
globs; fail on `Math.random` outside the same allowlist. Local guard, no CI, no new
infrastructure.

### D7. Stream states ride the save, behind a versioned reader

The save carries one map `{ pointName → streamState }`, containing only points that have
drawn. It replaces today's patchwork — `actionRngSeed` yes, master stream no, scheduler
separately, Chord in world state.

Restore reseeds every known point and reseeds unknown or missing names from the master seed.
**This ships with a version reader, not a hard break**: a pre-ADR save carrying
`actionRngSeed` alone maps onto the corresponding point and reseeds the rest.

Restore fallbacks must never read the clock when a master seed is set.

**Point names are persistent identifiers.** Renaming one orphans its saved stream state, so
a rename is a save-affecting change of the same class as a trait schema change.

### D8. Forcing operates on classes and consumes zero draws

A point is a function `stream → (class, value)`. A force replaces the function's result.

1. Forces name **declared outcome classes**, never draw indices or seeds.
2. **A forced firing consumes zero draws.** The only state perturbed is that point's own
   later sequence. Cross-point desynchronization is impossible, by D3.
3. Alignment with the *unforced* run is explicitly not promised. A forced run is
   reproducible and exact under `f(masterSeed, forceTable)`; it is a conditioned run, and
   anyone needing an unconditioned replay uses a recorded seed or D11 instead.
4. "Consume the same number of draws the unforced path would have" is rejected: the count
   is branch-dependent and unknowable without running the sample, at which point nothing was
   forced.

Multi-draw points are handled by wrapping the point's randomness in one
`resolve(point, sample, materialize)` call. `sample(draw)` runs the real logic with any
number of internal draws — the table lookup *and* the conditional follow-up roll in dungeo's
`resolveBlow` are **one point, not two**. `materialize(class)` produces a deterministic
representative value without drawing.

The cost of forcing is exactly this: **every forceable point must be able to construct a
representative outcome per class.** For dungeo's shapes it is trivial.

Deterministic short-circuits sit *outside* the point and draw nothing — so a force does not
fire when a short-circuit returns first, which combined with D9 turns "force KILLED on an
already-dead defender" into a loud failure rather than a lie.

**A forced class runs one representative row.** Coverage therefore reports class coverage,
not row coverage; row-level coverage, if ever wanted, comes from natural draws only.

### D9. Force semantics: loud when unfired, session state when saved

- **Unfired forces fail loudly.** In transcripts, a force that has not fired by the end is a
  hard error of the same severity as a failed `[ENSURES:]`. In interactive play it is an
  end-of-session report line, because an author may force a point and wander off — that is
  exploration, not a failed test.
- **Modes**: `once` (transcript default) must fire exactly once; zero or duplicate is an
  error. `sticky` (play default) applies on every reach, may fire zero-to-many times, count
  reported.
- **Composition**: the force table is keyed by point name plus optional occurrence index
  (`dungeo.thief.steal#3`). Duplicate keys in one transcript are a **load error**, not
  last-wins. A force wins at its point; the seed governs everything else, including that
  point's other unforced firings. Every firing, forced or drawn, lands in the trace with its
  provenance.
- **Occurrence indexing ships in Phase C** (ruled by David, 2026-08-01), rather than waiting
  for a demonstrated need — D10 supplied one. `dungeo.melee.blow.villain → KILLED` is
  reachable only through the wound spiral, so filling that coverage row means forcing the
  early blows to `SERIOUS_WOUND` and letting a later firing **draw naturally** against the
  now-degraded tables. Without the index the alternatives are forcing `KILLED` outright,
  which bypasses the tables and proves nothing about the spiral that makes it reachable, or
  hunting for a seed. Some notion of key identity is required by the duplicate-key load error
  above in any case, so the index is an extension of machinery Phase C already needs rather
  than a mechanism of its own.
- **Forces are session state, never save state.** A save that behaves differently because of
  an invisible embedded override table is a debugging trap. Saves carry stream states only.
  Within a live session a restore keeps the session's force table; across sessions the
  transcript is the durable record and reapplies it.

### D10. Split a point when the same class carries different consequences, or when a row must stay legible

The ruling is `dungeo.melee.blow.hero`, `dungeo.melee.blow.villain`, and
`dungeo.melee.blow.vsUnconscious` as separate points over shared tables, rather than one
point with per-context class sets.

**The justification is asymmetric consequences, not asymmetric class sets** (ruled by David,
2026-08-01, after reading the tables). An earlier draft claimed the reachable class sets
differ by party. They do not: both parties call `getResultTable(att, def)` with the roles
swapped, so the label sets match exactly. What differs is a code fact about what the *same
label does*:

- **`UNCONSCIOUS` negates defender strength only when the hero attacks.** `melee.ts:246-252`
  sets `newDefenderStrength = -def` under `if (isHeroAttacking)`, while
  `defenderUnconscious = true` is set unconditionally. The same class produces a different
  world-state transition depending on who threw the blow.
- **The `def < 0` auto-kill short-circuit (`melee.ts:197`) exists only downstream of hero
  blows**, because only hero blows can create the negative strength it fires on.

A choice point should name one outcome-space *with its consequences*. Hero blow and villain
blow are two such spaces wearing shared tables, so this is two declarations over one
implementation — the combat math stays single-sourced and identical for every combatant.

The second leg is report legibility. `villain.blow → KILLED` is **player death**, the single
highest-value coverage row in the game; merged into one point it hides behind the player
killing things constantly. The split is how that importance gets encoded without touching the
math: player death gets its own named row, its own forceable handle, and its own never-fired
alarm, for one declaration line.

`vsUnconscious` splits on the original grounds and keeps them — every outcome remaps to
`HESITATE` or `SITTING_DUCK`, so its class set genuinely differs.

**Both blow points declare the full seven classes** — `MISSED`, `STAGGER`, `LOSE_WEAPON`,
`LIGHT_WOUND`, `SERIOUS_WOUND`, `UNCONSCIOUS`, `KILLED` — with one gating fact recorded
because it shapes what a coverage report can mean:

> `UNCONSCIOUS` and `KILLED` appear only in the `DEF1` windows (defender strength 1) and
> `DEF2B` (strength 2, stronger attacker). All five `DEF3` tables — defender strength above
> 2 — contain neither; the worst single-blow outcome against a healthy defender is
> `SERIOUS_WOUND`. So a full-strength combatant cannot be table-killed in one blow, and
> `villain.blow → KILLED` is reachable only through the wound spiral, where accumulated
> wounds drive effective strength down into `DEF2`/`DEF1` territory.

That row therefore fills only via a multi-blow sequence, or a force-prefix of wounds under
D8. It filling at all is evidence the death spiral itself was exercised — which is the kind
of thing D15's report should make visible rather than mysterious.

### D11. A per-point seed override is the pure-replay instrument

`[POINT-SEED: dungeo.thief.steal=n]` changes where one point's stream starts and leaves every
draw real. The run stays a seeded replay under `(masterSeed, pointSeedOverrides)` — the draw
genuinely happens, the actual code path executes, and no outcome is substituted.

This is the middle rung between forcing and whole-run search, and it exists because
regression baselines want the real path while exploration wants speed.

### D12. Search is a first-firing instrument with a measured budget

Whole-run seed search executes the real engine and never models it. Its cost is measured, not
estimated: against a real loaded dungeo world, snapshot 436 KiB, `toJSON()` p50 0.91 ms,
`loadJSON()` p50 0.69 ms, round trip **1.60 ms**, i.e. **≈623 nodes/second**, flat under play.
A melee depth-2 search costs ~26 ms; a thief ten-turn exploration is ~27 minutes; twenty turns
is unbounded in practice. The bottleneck is branching factor, not serialization.

So search is not the primary author instrument. It is:

- **A first-firing instrument.** Searching one point's stream for a desired natural outcome
  is ~1/p tries for the point's *first* firing, where the stream position is fixed and only
  the outcome varies.
- **Not a general one.** For a later firing, varying the seed changes early outcomes, which
  change world state, which changes whether and when the point fires again. The firing
  schedule is not invariant, so the estimate degrades by an amount that is a property of
  story logic — high where outcomes feed back into the schedule (the thief steals, which
  changes inventory, which changes later steal opportunities), low where they do not (the
  round room's exit barely affects re-entry).

**Searchability is measured per use, never declared.** The tool carries a try budget on the
order of ten times the class's inverse probability, and reports tries-spent on success or
budget-exhausted on failure. A declared "cheaply searchable" flag is rejected for the reason
such declarations rot: it is a property of story logic, is not statically checkable, and a
wrong flag fails as a silent long search — the same class of bug as the unfired force.

**Force-prefix then search-last** recovers some nth-firing cases: occurrence-indexed forces
consume zero draws, so forcing firings `#1..#n-1` pins both their schedule contribution and
the stream position of the nth, restoring ~1/p for a natural draw at the target. The run is
conditioned, so it is not a pure-replay artifact; it composes from D8 and D11 rather than
being a mechanism of its own.

### D13. The acceptance bar is byte-identical rendered text

Three artifacts, only one of which is a bar:

| Artifact | Status | Requires |
| --- | --- | --- |
| byte-identical **rendered transcript text** | **the gate** | this ADR; nothing from the clock population |
| byte-identical **event streams / save blobs** | **deferred** | id counters plus a timestamp policy |
| turn-outcome equivalence | dropped as a category | subsumed by the first |

The clock population does not render: event ids and timestamps never appear in prose output.

**Evidence, run 2026-08-01** — recorded inline because this claim gates the scope split, and
an earlier draft asserted it on inherited testimony rather than a check. `grep` for
`.timestamp` over `lang-en-us/src`, `text-blocks/src`, and `channel-service/src` returns
**zero hits**; no message template or formatter interpolates an event id. Timestamps exist in
event *data* (`save-restore-service.ts:218,235,333` and the quit/restart handlers stamp
`Date.now()`), but nothing in the formatting chain reads those fields. The only `.id` uses in
`engine/src/prose-pipeline/pipeline.ts` are `:152`, `:163`, and `:194` — entity ids used for
room-scope filtering, never emitted as text, and deterministic anyway since they follow
story-init creation order. The one constructible residual, a save confirmation echoing a
generated filename, does not arise in the corpus: walkthroughs save through authored tester
directives (`$restore wt-01` and `$save wt-02` at `wt-02-bank-puzzle.transcript:7,13`), so
those names are written by the author, not generated.

**AC-1 is self-verifying on this point**, which is why the premise was only ever load-bearing
for *scoping* rather than for correctness: a leaking id or timestamp differs between two runs
and fails the diff. The defect in asserting it without a check was stating as established
something that had merely been repeated.
So byte-identical rendered text is reachable without touching any of the ~49 clock-only id
sites or the 184 `timestamp` stamps, and it is strictly stronger than turn-outcome
equivalence at the same cost.

Byte-identical event streams become a separate optional track ("golden event logs"), not an
acceptance bar for normalization. Nothing consumes it today — zifmia does not key on engine
event ids (no `event.id` usage in `tools/zifmia/src`).

### D14. The seed is injectable, always reported, and silent to players

`--seed N` on the CLI in play and test modes; `[SEED: N]` as a transcript directive in the
shape the format already uses for `[OK:]` and `[ENSURES:]`; `EngineConfig.seed`. In a chain,
only the first transcript's `[SEED:]` is honoured — the chain is one session — and a
`[SEED:]` on a later member is a loud parse error.

**Every run reports the seed it used, including when it came from the clock**, and every
failure carries the seed that produced it. A variation run that finds a defect it cannot name
the seed for has produced noise rather than a finding.

Author surfaces show the seed automatically (`--play` at startup, the IDE Play pane); an
author/debug meta command reports it on demand; a published game shows nothing unless the
author opts in. The point is the bug-report path: one number plus a command list reproduces
the session.

**The regression suite pins its seeds, and `--vary` is the sanctioned way off the pin**
(ruled by David, 2026-08-01). These are two halves of one decision and neither stands alone:

- **The `wt-*` walkthrough transcripts carry `[SEED:]` headers.** Determinism by default for
  the regression suite is what Phase A exists to deliver, and Acceptance 2 already assumes it.
- **`--vary` overrides those pinned seeds with one fresh seed and reports it.** That operation
  cannot be expressed by omitting a flag — omitting a flag honours the pin. It is the only
  sanctioned way to run the pinned suite off-baseline.

Without the pin, `--vary` would be indistinguishable from the seedless default and should be
dropped. With it, `--vary` is the deliberate replacement for today's "run flakey walkthroughs
twice" policy, which exists precisely because one sequence hides what another reveals. A
pinned suite is stable and **permanently single-sequence**; D15's coverage report enumerates
classes but surfaces no *ordering* interaction nobody identified in advance, and `--vary` is
the cheap sampler for that residue. Because D14 already mandates seed reporting in every mode,
anything it finds arrives reproducible — variance converted from flake into evidence. Dropped,
that sampling does not disappear; it degrades into hand-editing seed numbers, which means it
stops happening.

**`--sweep N` is dropped** (ruled the same day). ADR-291 D9 made it a first-class mode; its
unique deliverable is per-seed attribution and aggregation over N sessions, which is real
support surface, while its interim substitute is a shell loop over `--seed`. It is worth
building only once a `--vary` failure or a dungeo coverage run demonstrates that an
unidentified interaction cluster actually exists (D15). It layers cleanly onto `--vary` later.

### D15. Coverage is the author-facing answer, and it is linear

The author question — "did my testing reach every point where randomization occurs" — is
answered by a coverage report over a run or a chain: which points fired, which never fired
(`catalog − fired`, per D2), and which declared classes of each point were never observed.

**Outcome coverage, not path coverage.** The target is each class of each point observed at
least once: `Σ classes-per-point`, roughly 60–80 cases for dungeo. Path coverage — every
combination across a run — is effectively infinite and nobody needs it.

Numeric ranges collapse into the classes the code branches on. A damage roll `int(1,6)` is not
six outcomes; it is miss / hit / kill / critical. This is the largest single de-explosion step
and it is why D4 requires classes rather than ranges.

Points on different streams cannot interact through randomness (D3), so their combinations are
not worth enumerating. The only combinations worth testing are within a deliberately
identified interaction cluster, and dungeo does not appear to have one.

**The report is an aggregation over D16's trace stream, not a separate mechanism** (ruled by
David, 2026-08-01). Coverage counters consume the same `ISystemEvent` trace the GDT verb and
the IDE read, so there is one producer and several consumers rather than a bespoke report
format each surface has to parse.

Its surfaces:

- **A summary always prints at end of run** — points fired, points never fired, classes
  unobserved. The never-fired count is worthless if it has to be asked for; being noticed is
  the entire value of that column.
- **The full per-point breakdown writes to `--output-dir`** when one is given, alongside the
  timestamped results the runner already writes there.
- **In-game, the GDT debug verb family** surfaces the live trace (D16).

**Coverage aggregates across a chain, not per transcript.** This falls out of D14 rather than
being a separate ruling: a `--chain` run is one session with one engine, one world, and one
trace stream, so it produces one report. Per-transcript attribution — which file first fired a
class — belongs *inside* that report rather than splitting it, because coverage is a property
of the suite and not of any one file.

An IDE panel is the better long-term home for "classes never seen" as a persistent view rather
than a per-run artifact. It is deliberately **not** decided here: it is Swift-side work in a
component ADR-290 is reshaping, ADR-290 is DRAFT with six open questions, and nothing in this
ADR should acquire that dependency. Once trace is on a channel, the panel is a consumer like
any other.

### D16. Trace is per-turn and names provenance

A per-turn log of `(point, class, value, provenance, draws-consumed)` answers "what did the
RNG decide this turn?" during play-testing. Provenance distinguishes drawn from forced, and
records the force's mode and occurrence index.

**Trace is emitted as `ISystemEvent`** (ruled by David, 2026-08-01), on the source already
threaded through `command-executor.ts:97` and `game-engine.ts` as
`IGenericEventSource<ISystemEvent>`, at `severity: 'debug'`. Three properties make this the
right channel rather than a bespoke one:

- **It is live.** No new plumbing, no new source, no new wiring through the turn cycle.
- **It does not serialize.** System events are a separate source from the semantic stream, so
  trace stays out of the save — which D7 requires, since the save carries stream states and
  nothing else.
- **It makes every surface a consumer.** The CLI summary, the `--output-dir` artifact, the
  GDT verb family, and any future IDE panel read one stream instead of each parsing a format.

**Trace emission is off by default.** It is enabled by the transcript runner, the IDE, and
the `--play` author surface; **a published game emits none.** Coverage counters (D15) follow
the same gate, since they consume this stream.

Two reasons, and the second is the one that makes it a rule rather than a tuning knob.
Per-draw emission on every turn is overhead a shipped game should not carry. And a published
game quietly recording a per-draw trace of a player's session is an artifact nobody asked for
— adjacent to a privacy concern, and squarely against D14's stance that the machinery is
silent to players.

`IDebugEvent` (`core/src/debug/types.ts`) was considered and rejected for now — see Tracked
work.

```
turn 42  dungeo.thief.steal          yes                (forced, once #1)
turn 42  dungeo.melee.blow.villain   STAGGER            (drawn, 2 draws)
turn 43  dungeo.roundRoom.exit       'engravings-cave'  (drawn, 1 draw, 8 candidates)
```

The GDT debug verb family in dungeo is the natural surface for this in-game.

---

## Implementation

### The API

```ts
// @sharpee/core — static metadata and types only; no state that draws
export interface ChoicePoint<C extends string = string> {
  readonly name: string;            // 'dungeo.melee.blow.hero'
  readonly classes?: readonly C[];  // absent ⇒ plain draw (D4)
}

export function definePoint<C extends string>(
  name: string, opts?: { classes: readonly C[] }
): ChoicePoint<C>;                  // registers in the immutable catalog; idempotent

export interface RandomService {
  chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean;
  int(p: ChoicePoint, min: number, max: number): number;
  pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T;
  resolve<C extends string, R>(
    p: ChoicePoint<C>,
    sample: (draw: SeededRandom) => { cls: C; value: R },  // real path, N internal draws
    materialize: (forced: C) => R                          // forced path, zero draws
  ): { cls: C; value: R };
}
```

Engine owns the sole implementation and threads it through `ActionContext`,
`TurnPluginContext`, the scheduler tick context, and the NPC context, replacing
`SeededRandom` in all four.

### Touchpoints

**core** — `random/` gains `ChoicePoint`, `definePoint`, the catalog, the `RandomService`
interface, `SEED_DERIVATION_VERSION`, the FNV-1a mix, and the trace/coverage report types.

**engine** — the `RandomService` implementation; `game-engine.ts:306,309` replaced by
master-seed-derived streams; `EngineConfig.seed`; `action-context-factory.ts:82` fallback
removed; `save-restore-service.ts:230,299,301` replaced by the `{pointName → streamState}`
map plus the versioned reader.

**stdlib** — `enhanced-context.ts:60` fallback removed; ~8 point declarations (throwing ×5,
inventory variant pick, npc move, npc exit).

**world-model** — `deadlyRoomBehavior.ts`, `weaponBehavior.ts`, `behaviors/attack.ts` keep
`SeededRandom` parameters per D6; no new dependency.

**plugins / plugin-scheduler / plugin-npc** — `TurnPluginContext.random` and the tick context
retyped to `RandomService` from core.

**media** — `audio-registry.ts:205-215` moves to plain draws (D4).

**character** — `tick-phases.ts:57` `random: unknown` becomes `RandomService`.

**extensions/basic-combat** — both module singletons deleted.

**stories/dungeo** — both module singletons deleted; `melee-npc-attack.ts:116` honours the
parameter it already receives at `:109`; the four gameplay `Math.random()` handlers onto
points; ~22 draw call sites; ~30 declaration lines.

**stories/armoured, thealderman, cloak-of-darkness** — one gameplay `Math.random()` each.

**transcript-tester** — `--seed`, `[SEED:]`, `[FORCE:]`, `[POINT-SEED:]`, seed reporting in
all modes, coverage report output.

**Measured blast radius**: ~14 platform draw call sites plus ~22 in dungeo plus 7 in other
stories plus 3 audio ≈ **45 call sites**, plus ~30 declaration lines. Wide, shallow, and
under no compatibility constraint.

### Phases

Each is independently landable and verified against the existing walkthrough chain.

- **Phase A — the substrate.** Kill the four singletons, honour injected RNG, introduce
  `definePoint`/`RandomService`, per-point streams, unified stream-state persistence,
  `--seed`, `[SEED:]`, seed echoed in all test output. **The flake dies here or nowhere** —
  deleting the singletons alone does not fix it, because combat then lands on a stream that
  is still clock-seeded per run.
- **Phase B — story cleanup.** Round room, bat, carousel, trivia, audio, and the three other
  stories onto points. Mechanical once the service exists.
- **Phase C — classes, coverage, forcing.** `[FORCE:]`, `[POINT-SEED:]`, the coverage report,
  the trace surface, the search budget.
- **Phase D — retire the workarounds.** Navigator retry loop, surplus attack commands, and
  the run-flakey-walkthroughs-twice policy.

## Acceptance

1. The same master seed and command sequence produce **byte-identical rendered output**
   across two separate processes, asserted by spawning the bundle twice and diffing.
2. The dungeo walkthrough chain, run repeatedly at a pinned seed, produces an identical total
   test count and identical results every time.
3. Adding a **new** point leaves every existing point's draw sequence unchanged — recorded,
   point added, re-recorded.
4. Save → restore → continue matches an unbroken run for **every** point that has drawn, not
   only the action stream.
5. A pre-ADR save carrying `actionRngSeed` alone restores without error, its action point
   continuing exactly and the rest reseeding from the master seed.
6. `./repokit verify` fails when `createSeededRandom(` or `Math.random` is introduced outside
   the D6 allowlist, asserted by introducing one of each and observing two failures, and by
   confirming the gate stays green over tests, tools, and dist.
7. A gameplay draw cannot be written without a declaration — asserted by type, not by
   convention: the draw API accepts no bare `SeededRandom`.
8. The coverage report over the full walkthrough chain enumerates every declared dungeo point,
   distinguishes never-fired from fired, and lists unobserved classes per point.
9. A `[FORCE:]` transcript exercises a class the natural chain never reaches, and an unfired
   `once` force fails the run. **Occurrence indexing is asserted against its motivating
   case**: forcing `dungeo.melee.blow.villain#1..#2` to `SERIOUS_WOUND` and letting a later
   firing draw naturally fills the `KILLED` row with trace provenance reading `drawn`, not
   `forced`.
10. A forced firing consumes zero draws — asserted by comparing a forced run's trace against
    the same seed unforced, and showing every *other* point's sequence identical.
11. `[POINT-SEED:]` reproduces a specific natural outcome with the draw genuinely taken —
    asserted by trace provenance reading `drawn`, not `forced`.
12. Every run reports its seed, including clock-derived runs, and a failure names the seed
    that produced it; feeding that seed back through `--seed` reproduces the failure.
13. **Rejections**, each a named failure rather than a fallback: a non-integer or
    out-of-range seed from any entry point; a `[SEED:]` on a non-first chain member; duplicate
    force keys in one transcript; a forced class not declared on the point; a `[FORCE:]`
    naming an unknown point; **`--seed` and `--vary` passed together** (D1).
14. **Trace and coverage are silent in a published game** — asserted by running a published
    build and observing no system events at `severity: 'debug'` from the randomness subsystem,
    not by inspecting the flag that gates them.

## Consequences

- **The walkthrough flake gets a named cause and a fix**, and the run-twice policy retires.
- **`[OK: any]` can stop being the default** (ADR-277 D5). With outcomes reproducible and
  selectable, verbatim assertion becomes the natural default.
- **The navigator's 50-attempt retry loop becomes dead weight** and surplus attack commands
  come out of walkthroughs.
- **Every gameplay draw call site changes shape** — ~45 of them. This is the widest mechanical
  consequence and it reaches every story, not only dungeo.
- **Some classes will be provably unreached**, and some of those will be surprises. An empty
  coverage row is a finding about the design, not a test failure.
- **ADR-290's Acceptance 1 becomes achievable.** It requires a saved transcript to replay
  green, which is not possible today; ADR-290 does not currently record that it depends on
  this work.
- **Two engine instances in one process stop perturbing each other**, which matters for test
  suites and zifmia independently of seeding.
- **`SeededRandom` becomes an internal primitive.** It stays public in core for behaviour
  parameters and test fixtures, but constructing one becomes a gated act.

## Deferred, not decided

- **The Chord form.** Deliberately unspecified, at David's direction: if the substrate is
  right, the Chord surface derives from it. Chord's randomness constructs are already named
  and located in the compiler, which is why point names, classes, and coverage metadata look
  derivable there without an author writing any of them — but that is an observation, not a
  decision, and specifying it ahead of a working substrate is what produced ADR-292's D11–D13.
- **Golden event logs** (D13's second artifact): id counters plus a timestamp policy.
  Triggered only if byte-identical event streams ever become a requirement. The population is
  enumerated in `docs/work/adr-291-seed-authority/determinism-inventory-20260731.md` §7–§9.
  If taken up, the id scheme should be a per-engine monotonic sequence (`evt-<seq>`) rather
  than turn-keyed, since nine id sites sit in `english-parser.ts` and may have no turn context.
- **A required wall-clock `timestamp` on every semantic event is a design smell independent of
  randomness.** Turn number is the honest timebase for IF semantics; wall-clock belongs in save
  metadata and platform events. Its own discussion, off this critical path.
- **The Chord evaluator's stream** stays as it is — already seedable and persisted — and folds
  into the point model only when the Chord form is taken up.

## Tracked work

**The `IDebugEvent` tier is dead and should be cleaned up separately** (found 2026-08-01
while choosing D16's channel; not this ADR's work). `core/src/debug/types.ts` defines
`IDebugEvent`, `IDebugContext`, `DebugEventCallback`, and `DebugEventTypes`, and the barrel
exports them (`core/src/index.ts:29`) — but a sweep of `packages/*/src`, `stories/*/src`, and
`tools/*/src` finds **zero emitters and zero consumers**. Its `subsystem` union is also stale:
it names `'text-service'`, a package deleted entirely under ADR-174.

It was the better-shaped candidate for D16 on paper — `subsystem` + `type` + `data`, gated by
`IDebugContext.enabled`, which mirrors this ADR's recording-off-by-default. It lost because
adopting it would mean widening a closed union and repairing stale members as a side effect of
shipping randomness work, while `ISystemEvent` is already wired and already excluded from the
save. Either delete the tier or give it a real customer; deciding that is out of scope here
and should be filed on its own.

## Session

Written 2026-08-01, session 9f136f, from a three-round design exchange recorded in
`docs/work/rng/` (`fable-assessment.md`, `fable-followup.md`,
`fable-followup-response.md`, `fable-followup-2.md`, `fable-followup-2-response.md`).

The exchange was commissioned because ADR-291 had stopped converging: four amendments and
four review passes oscillating between 12/16 and 14/16, with each pass finding roughly two
new blockers. The diagnosis was that the ADR specified implementation ahead of a substrate
that had never been designed, so amendments folded new insight backward into an ACCEPTED
document instead of forward into the design.

A fresh-eyes assessment read from code alone, without the ADRs, independently reproduced
nearly all of ADR-291's diagnosis — the four module singletons, the seven gameplay
`Math.random()` sites, the silent fallbacks, the unpersisted master stream, draw-order
coupling, and the id-counter treatment. That convergence is why the diagnosis is treated as
settled here. Where it diverged, it was better: per-point streams rather than per-domain,
forcing rather than search as the primary author instrument, and declaration-as-capability
rather than implicit registration.

Three findings moved in the other direction and are folded above: the audio jitter is inside
the determinism boundary because `resolvePool` bakes its values into an event
(`audio-registry.ts:205-215`); `RandomService` must sit in core because no drawing package
can import engine; and per-point search is a first-firing instrument, not a general one.

David's ruling that Chord stay out of scope shaped the result: the substrate is designed on
its own terms, and the Chord form is expected to fall out of it rather than being specified
alongside it.
