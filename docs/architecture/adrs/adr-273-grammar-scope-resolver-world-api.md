# ADR-273: GrammarScopeResolver calls a WorldModel API that does not exist

## Status: ACCEPTED (2026-07-25) — defect ADR, split out of ADR-271's implementation by owner ruling. ADR-271's acceptance items 1 and 6 (parse-time gating demonstrated by transcript; fernhill/friendly-zoo suites green) are **blocked on this ADR**. Q-1 ruled (build real reachability — D4); Q-2 ruled (define action page via ADR-272 — D5). Reviewed at acceptance: 14/14 READY; the review's one SMALL finding (one-definition discipline for `ScopeEvaluator`'s touchable stub) folded into D4 before the flip.

**IMPLEMENTED (closing marker 2026-07-27, session 834109).** The fix landed as `f929ea60`
(ReachabilityBehavior; GrammarScopeResolver on the real WorldModel API) with the genai-api
regeneration `56f4f6f5`; ADR-271's acceptance items 1 and 6 unblocked and discharged — the fernhill
and friendly-zoo transcript suites have been green since, through the Chord 2.x arc and the ADR-276
census migration. Recorded at the ADR-266 umbrella's close.

## Parent: raised by ADR-271 (whose Consequences reserved exactly this: latent defects on the scope-gating path are "raised, not silently absorbed"). Relates to ADR-266 (umbrella), ADR-231 D2a (`.where()` is the one parse-time gating mechanism — the mechanism this defect disables), ADR-088 (slot-consumer registry, the call path into the resolver), ADR-230 (grammar reachability).

## Date: 2026-07-25

## Context

### How it surfaced

ADR-271 Phases 1–3 wired the Chord compiler's scope constraints through to `.where()` on the story
grammar (loader emission verified 380/380 against a real `GrammarEngine`). The first end-to-end run —
the fernhill unit transcript suite — failed 15 of 593 tests, every failure a scope-constrained Chord
command (`prune`, `wind`, `feed`) answered with the parser's *"You can't see any such thing."*, even
with the target present and touchable (`feed smoke` holding the kipper, the cat right there; two
`take the silver locket` failures are cascades of an earlier blocked `prune`).

A minimal probe story (`pet goat`, goat in the same room, `the animal must be reachable`) reproduced
it, and `PARSER_DEBUG=true` showed the mechanism:

```
Evaluating constraints for slot text: "goat"
Found 0 matching entities for "goat"
  Scope base: touchable, filters: 0
  Entities in touchable scope: 0
```

### The defect

`GrammarScopeResolver` (`packages/parser-en-us/src/grammar-scope-resolver.ts:116-162`) resolves its
scope bases by calling:

| resolver calls | on WorldModel there is |
| --- | --- |
| `world.getVisibleEntities(actorId, currentLocation)` | **nothing** — real method is `getVisible(observerId)` |
| `world.getTouchableEntities(actorId, currentLocation)` | **nothing** — no reachability computation exists at all |
| `world.getCarriedEntities(actorId)` | **nothing** — real method is `getCarriedAndWorn(holderId)` |
| `world.getNearbyEntities(actorId, currentLocation)` | **nothing** |
| `world.getAllEntities()` | `getAllEntities()` — the one real call |

Every missing method is behind a defensive guard (`if (!context.world?.getTouchableEntities) return
[]`), so the resolver **fails closed and silent**: zero candidates, confidence 0.0, the rule never
matches, and the player gets a parse error for a perfectly resolvable command. The file's own header
says it "delegates to WorldModel methods (getVisibleEntities, getTouchableEntities, etc.)" — methods
that were never there. The class was written against an imagined API, and nothing ever noticed
because the standard grammar has zero `.where()` call sites (by design — stdlib refuses on scope in
`validate()`, ADR-231 D2a); the path had no production consumer until ADR-271's wiring became its
first.

This is the ADR-235 D2 class one layer down: a *platform mechanism* that compiles, ships, and cannot
work.

### The semantic gap underneath

Fixing the method names exposes a second, real question: **the platform has no parse-time
reachability computation.** World-model's own `ScopeEvaluator` punts —
`getTouchableEntities(context)` is implemented as *"For now, touchable = visible"*
(`packages/world-model/src/scope/scope-evaluator.ts:226-230`). Actual reachability logic (containers,
distance, worn-by-others) lives in stdlib's validation phase, per the four-phase split. So `the
animal must be reachable` can gate, today, on **visibility** at best — which diverges from IF
convention in the dark-room case (you can touch what you cannot see), and fernhill has a
`cellar-dark` transcript exercising darkness.

### What already works

`WorldModel`'s real surface is sufficient for a faithful mapping of three of the five bases:
`getVisible(observerId)` (physical sight — light, containers), `getInScope(observerId)` (parser
reference scope: room + carried + scope rules), `getCarriedAndWorn(holderId)`, `getAllEntities()`.
Name matching in the resolver is article-safe (slot text arrives normalized). The constraint
*delivery* path — loader → `.where()` → slot consumer → resolver — is verified working by ADR-271's
emission tests; only the resolver's world calls are fiction.

## Decision

*(Q-1 ruled 2026-07-25: build real reachability. The fix spans world-model, stdlib, and
parser-en-us; WorldModel is not widened with adapter methods — it gains the real operation.)*

### D1 — The resolver adapts to the world, not the reverse

`GrammarScopeResolver` is rewritten against `WorldModel`'s real surface. The alternative — adding
`getTouchableEntities(actorId, currentLocation)`-shaped methods to `WorldModel` — is rejected:
dependencies flow inward, and the domain does not grow adapter methods to rescue a consumer written
against an API that never existed.

### D2 — Base mapping

| scope base | resolves via |
| --- | --- |
| `visible` | `world.getVisible(actorId)` |
| `touchable` | `world.getReachable(actorId)` — **new, D4** (owner ruling on Q-1: build real reachability) |
| `carried` | `world.getCarriedAndWorn(actorId)` — carried and worn both count as held |
| `all` | `world.getAllEntities()` |
| `nearby` | falls back to `visible` (as today's code intends), until a real notion exists |

### D3 — Failing closed stays, but not silently

A missing world or a base that cannot be computed still yields zero candidates (a parse-time gate
must not guess), but the resolver logs/marks the degradation instead of burying it — the exact
failure mode this defect demonstrates must not be reproducible silently.

### D4 — Reachability graduates to world-model (Q-1, ruled 2026-07-25)

Reachability becomes a world-model behavior, the sibling of `VisibilityBehavior` — closing an
existing sibling-op asymmetry: stdlib's `ScopeResolver.canSee` already *delegates* to
`world.canSee` ("VisibilityBehavior via WorldModel for canonical visibility logic",
`stdlib/src/scope/scope-resolver.ts:96-102`), while its `canReach` (`:107-164`) implements
reachability locally. The logic graduates; the platform gets ONE reachability definition.

- **`ReachabilityBehavior`** in `world-model/src/world/`, alongside `VisibilityBehavior`.
- **`WorldModel` gains `canReach(observerId, targetId)` and `getReachable(observerId)`**, mirroring
  `canSee`/`getVisible`.
- **Semantics ported unchanged from stdlib's `canReach`** — the platform's only existing
  reachability definition: carried items reachable; same immediate location reachable; on a
  supporter reachable; inside an open container reachable (closed blocks, transparent or not);
  another actor's inventory blocked unless `OpenInventoryTrait`; and the existing
  **sight precondition is retained** (`canReach` requires `canSee` first — today's platform stance).
  This ADR ports, it does not re-legislate: any future change to a rule (e.g. touch-in-the-dark)
  is then a one-place change in world-model, taking parse gate and validate phase with it together.
- **stdlib's `ScopeResolver.canReach` delegates to `world.canReach`**, exactly as its `canSee`
  already delegates — same shape, no behavior change, and its suite is the regression proof.
- **One definition discipline**: `ScopeEvaluator.getTouchableEntities` (the rule-based scope
  system's "touchable = visible for now" stub, `scope-evaluator.ts:226-230`) either delegates to
  `ReachabilityBehavior` or gains a comment naming it superseded for physical reachability — a
  second live `touchable` definition inside world-model would hand the next consumer the same class
  of confusion this ADR fixes.
- The parse-time `touchable` base (D2) reads `world.getReachable(actorId)` — so `the animal must be
  reachable` gates on the same semantics stdlib's validate phase uses. No parse/validate divergence.

### D5 — The author-facing semantics statement lands on the `define action` page via ADR-272 (Q-2, ruled 2026-07-25)

`must be reachable` now has semantics an author will hit (same place or open containers; closed
glass blocks; another creature's possessions blocked; sight required, so darkness refuses).
**ADR-272 inherits the obligation** to state this in one or two example-led lines when it does the
`define action` page's capability expansion. Nothing is owed to the page under this ADR.

## Acceptance

1. The ADR-271 probe passes: a Chord story with `the animal must be reachable` and the animal in
   reach parses and dispatches; the same command with the animal absent or out of scope is refused.
2. ADR-271's blocked acceptance items unblock: the fernhill (593) and friendly-zoo transcript suites
   pass, with every remaining diff individually reviewed.
3. A parser-en-us unit test exercises each scope base against a real `WorldModel` instance —
   visible, carried, all, and touchable — asserting on returned entity sets, not merely "no throw."
4. The resolver's header comment names the real WorldModel methods it calls.
5. `ReachabilityBehavior` unit tests in world-model assert the ported rules on real world state:
   closed transparent container = visible but NOT reachable; carried = reachable; another actor's
   inventory blocked without `OpenInventoryTrait`, allowed with it; open container contents
   reachable. *(D4)*
6. stdlib's `ScopeResolver.canReach` delegates to `world.canReach` and the stdlib suite passes
   unchanged — the delegation is behavior-preserving. *(D4)*

## Consequences

**Gained.** Parse-time scope gating works for the first time; ADR-271's D2 becomes real end-to-end.
The `.where()` mechanism ADR-231 D2a designates is actually usable by stories and (later) by the
migrated standard grammar (ADR-269), which will lean on it far harder.

**Cost.** Three packages: world-model (new `ReachabilityBehavior` + two `WorldModel` methods),
stdlib (delegation swap in `ScopeResolver.canReach`), parser-en-us (resolver rewrite). The ported
sight-precondition means `must be reachable` refuses in darkness — today's platform stance, now
observable at parse time (Q-2 records where that is stated for authors). Until this lands, ADR-271
cannot close.

**Rejected.** Widening `WorldModel` with the resolver's imagined methods (D1). Silently keeping the
fail-closed guards (D3). `touchable` = `getVisible()`-for-now and `touchable` = `getInScope()` —
both considered and declined in Q-1's ruling in favor of the real computation; both would have
created a parse/validate semantic divergence the migration (ADR-269) would inherit.

## Session

Session of 2026-07-25 (b52717). Found during ADR-271 Phase 4 (regression verification): 15/593
fernhill failures, all one root cause. Diagnosed via probe story + `PARSER_DEBUG` before any code was
touched; owner ruled (option 3) to split the fix into this ADR rather than absorb it into ADR-271 or
patch inline. ADR-271 Phases 1–3 remain landed and green at package level; its Phase 4/5 disposition
is recorded in `docs/work/grammar-parity/plan.md`.

Both questions resolved through the open-questions interview, same session. **Q-1: build real
reachability** (the largest option, over `getVisible`-for-now and `getInScope`) — folded as D4 after
verifying stdlib's `ScopeResolver.canReach` already holds the platform's one real reachability
implementation and spotting the sibling-op asymmetry (its `canSee` delegates to world-model; its
`canReach` never graduated). **Q-2: the `define action` page via ADR-272** — folded as D5; ADR-272
inherits the one-line semantics obligation.

**D2 addendum (2026-09-03, GH #312, publish-readiness plan Phase 5).** The parse-time `visible` and `touchable` bases include the acting entity — you can always see and reach yourself — added by the grammar scope resolver (`withActor`), not by `world.getVisible`/`getReachable`, which enumerate *others* and feed "all" expansions. This is parity with the command validator, where the player is resolvable at every tier (ISSUE #154), so a `must be reachable` slot binds `me`/`myself`/`self` exactly as stdlib's `attack me` does. D4's reachability rules are untouched; GH #313 opted a holder's inventory in through the Chord `open-inventory` trait adjective (`OpenInventoryTrait`), with `taking` resolving at VISIBLE so its validate — and an author's refusal — is reached.
