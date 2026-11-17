# RNG Normalization — Response to Follow-up (round 3)

**Date:** 2026-08-01
**Re:** `fable-followup-2.md`

Short back. F1 confirmed as proposed, with the sweep behind it and the raw-`SeededRandom`
rule stated. F2: no to metadata — with one refinement that makes the simple rule slightly
less restrictive than it first appears.

---

## F1 — confirmed: interface and `definePoint` in core, instance in engine

The proposed fix is right and is the same seam `SeededRandom` already sits on. Amended
§6.0: **`ChoicePoint`, `definePoint`, the catalog, and the `RandomService` interface all
live in `core`; engine owns the sole implementation** (stream derivation + cache, force
table, trace, coverage counters, stream-state persistence) and threads it through the
four contexts. Core gains types and an inert catalog — no state that draws, no new
dependency edge.

### The sweep (per your caveat, done properly rather than from five rows)

Packages whose `src/` references `SeededRandom` today: `core`, `engine`, `stdlib`,
`world-model`, `plugins`, `plugin-scheduler`, `ext-basic-combat`, `story-loader` (Chord,
out of scope). Crossed against each package.json's `@sharpee/*` dependencies:

| Package | Deps include engine? | Draws / carries draw contexts | After F1 |
|---|---|---|---|
| `world-model` | no | deadly-room, weapon, attack behaviors take `rng` params | types `RandomService` (or keeps `SeededRandom` params — see rule below) from core ✓ |
| `stdlib` | no | ~8 points + `ActionContext.random` | core import ✓ |
| `plugins` | no | `TurnPluginContext.random` type | core import ✓ |
| `plugin-scheduler` | no | tick-context RNG, daemons/fuses | core import ✓ |
| `plugin-npc` | no | passes `ctx.random` through (type flows from `plugins`) | no change needed |
| `ext-basic-combat` | no | module singletons (die in Phase A) + params | core import ✓ |
| `media` | no (deps: core only) | audio draws (post-correction) | core import ✓ |
| `character` | no | **`tick-phases.ts:57` types its context field `random: unknown`** | becomes `RandomService` from core |
| `event-processor` | no | **does not draw** — see correction below | n/a |
| `plugin-state-machine`, `hunger`, `if-domain`, `if-services` | no | carry no draws today | n/a |
| `transcript-tester` | **yes** | harness (seed/force directives, reports) | engine import is fine and intended |

Two facts the sweep surfaced:

1. **Correction to F1's table:** `event-processor` does not draw. Its only hit is
   ID-generation `Math.random` (`effect-processor.ts:245`, the deferred ID track) and a
   commented-out block in `observation-handlers.ts:27`. Row can be dropped from the
   consumer list.
2. **`character/tick-phases.ts:57` — `random: unknown`** — is F1's disease already
   manifest: a package that carries a draw context and, lacking a nameable type in reach,
   typed it away entirely. It's the strongest single piece of evidence for the fix; after
   F1 it becomes `RandomService` with no dependency change (`character` already depends
   on core).

So: **no drawing package can import engine, every drawing package can import core**, and
nothing else needs to move. The `sample` callback's `SeededRandom` parameter is
core-resident, as you noted. Coverage/trace **report types** should also sit in core
(they're inert shapes; transcript-tester could reach them via engine, but story-side
tooling shouldn't need engine to *read* a report).

### The raw-`SeededRandom` rule (one sentence, then its enforcement)

> **`createSeededRandom` may be called only by `RandomService`'s implementation in
> engine, by test fixtures, and by the Chord evaluator until it folds in; all other
> gameplay code draws exclusively through a `ChoicePoint` handle on the service.**

Behavior *parameters* (`WeaponBehavior.calculateDamage(weapon, rng)`) may keep accepting
`SeededRandom` — that is the same pattern as `resolve()`'s `sample` callback: the draw
already went through a handle upstream, and the behavior receives the point's stream.
The rule governs *construction*, which is what creates catalog-invisible draws.
Enforcement, per the no-CI preference: a grep gate in `./repokit verify` — fail on
`createSeededRandom(` outside `packages/engine/src/`, `packages/core/src/random/`,
`packages/story-loader/src/`, and test-file globs; plus the existing gate idea for
`Math.random` outside the same allowlist. Two greps, zero infrastructure.

---

## F2 — no metadata; the honest rule, plus one refinement

**No** — don't record searchability as declared point metadata, for the reason such
declarations rot: whether a point's outcomes feed back into its own firing schedule is a
property of *story logic*, not of the point, it isn't statically checkable, and a wrong
"cheaply searchable" flag fails as a silent 27-minute search. A declared promise nobody
can verify is the same class of bug as the unfired force.

Adopt the honest rule, with the failure mode handled by the tool instead of the catalog:

1. **Rule:** per-point seed search is a first-firing instrument; nth-firing targets are
   forcing territory.
2. **The search tool carries a try budget** (default on the order of 10× the class's
   inverse probability) and reports tries-spent on success and budget-exhausted on
   failure. Searchability is thereby *measured per use*, never declared — a feedback-heavy
   point simply exhausts its budget quickly and visibly, which is the report the author
   needed anyway.
3. **Refinement that recovers some nth-firing cases:** occurrence-indexed forces consume
   zero draws, so forcing firings `#1..#n-1` pins both the schedule contribution of those
   outcomes *and* the stream position of the nth firing — restoring the 1/p estimate for
   a natural draw at the target. The run is conditioned (forces present), so it's no
   longer the pure-replay artifact §5.3 wanted from search; but when the goal is "the
   *target* draw must be real" (e.g., exercising the actual table path), force-prefix +
   search-last is a legitimate middle rung. Worth a paragraph in Phase C's design, not a
   mechanism of its own — it composes from pieces already specified.

§5.3 stands corrected to say the 1/p estimate applies to first firings, with (3) as the
stated extension and forcing as the default beyond that.

---

## Minor notes — all three confirmed, one number added

- **Class coverage ≠ row coverage:** correct and now stated: *a forced class runs one
  representative row; coverage reports class coverage; row-level coverage, if ever
  wanted, comes from natural draws only.*
- **Rename reseeds:** correct and now stated: *point names are persistent identifiers;
  renaming one orphans its saved stream state (old key ignored, new key reseeds from
  master) — a rename is a save-affecting change, same class as a trait schema change.*
- **Blast radius, measured:** ~14 platform draw call sites (stdlib, world-model,
  plugins, scheduler, basic-combat) + ~22 in Dungeo + 7 raw `Math.random` gameplay sites
  in other stories + 3 audio = **~45 call sites** total, plus ~30 declaration lines.
  Wide, shallow, no compatibility constraint — Phase A scope confirmed knowingly.

With F1 amended as above, §6 is buildable as written; Phase A can be scoped against it.
