# Proposal: story-ts — Design Signals from the Canonical TS Zoo

**Status**: REVIEWED (proposal-review 2026-07-14: no contradictions; ADR-129 status corrected; P-7 Done-when folds in ADR-119 resolution; advisory tensions noted on P-4/P-5)
**Origin**: conversation — David's canonical-surfaces principle (2026-07-14): "even dropping to raw TS in a Sharpee-TS story is a design signal"; items inventoried from `stories/friendly-zoo/src/` against zoo.story's declarative twins
**Date**: 2026-07-14
**Session**: e0dfc3

Nothing here is planned or scheduled; per the standing rule, raw-TS drops
are raised as design signals, never silently bridged. Location note: this
proposal lives at `docs/work/story-ts/proposal.md` by David's explicit
instruction (not `docs/proposals/`).

**Source principle** (David, 2026-07-14): the TS zoo story
(`stories/friendly-zoo/src/`) is the CANONICAL Sharpee implementation, and
*"even dropping to raw TS in a Sharpee-TS story is a design signal."*
Wherever the canonical story writes imperative TS to express something
story-shaped, that is grounds to consider a platform design change. The
precedent is the presence closure: hand-rolled `registerSlotContributor`
TS became ADR-212's declarative `registerSlotEntry`, and the raw TS
disappeared.

**Method**: every raw-TS site in the TS zoo was inventoried against how
`zoo.story` (the Chord implementation of the same game) expresses the same
behavior. Where Chord is declarative and TS is imperative, the gap is an
item below. Sites that are ALREADY declarative on both surfaces (the pins
`SnippetMap`, `registerSlotEntry` presence entries, ADR-196 dynamic-text
Choice/Optional, `createPatrolBehavior`) are listed at the end as the
target shape, not as items.

Each item names: the raw-TS site, the Chord/zoo.story equivalent, the
candidate platform surface, and an assertable outcome. Outcomes are
deliberately "decision made", not "feature built" — most items are
ADR-sized and platform-owned (CLAUDE.md platform-change rule applies).

---

## P-1 — Capability-dispatch boilerplate for story verbs

- **Status**: PROPOSED
- **Raw TS**: `index.ts:110-175` — `pettingAction` re-implements the
  ADR-090 dispatch plumbing by hand (~70 lines): find trait with
  capability, look up behavior, thread `CapabilitySharedData` through
  validate/execute/report, map `CapabilityEffect[]` to events. The
  behavior itself (`pettingBehavior`) is 20 lines of real content.
- **Chord**: `define action petting` + `define trait pettable` with
  per-owner `phrase petted:` overrides — zero plumbing.
- **Candidate surface**: a stdlib factory that owns the plumbing once —
  "story verb that dispatches to a trait capability" as one call (the
  legacy `createCapabilityDispatchAction` exists but is documented as
  legacy with the short-key hazard; either rehabilitate it per current
  messageId rules or replace it).
- **Done when**: David decides — rehabilitate/replace the factory (ADR) or
  won't-do. Assertable: `pettingAction` in the canonical story shrinks to
  behavior content plus one factory call, or the item is closed won't-do.

## P-2 — Name-string targeting in the feed action

- **Status**: PROPOSED
- **Raw TS**: `index.ts:185-230` — `feedAction.validate` targets animals
  by `name.includes('pygmy goats')` and checks inventory by alias string
  (`aliases.includes('feed')`); fed-state lives in ad-hoc keys
  (`fed-${target.id}`).
- **Chord**: the `feedable` trait declares `states: hungry, fed` and the
  action requires `it must be a feedable` / `it must be hungry` — typed
  targeting, declared state, D4-checked transitions.
- **Candidate surface**: none new — this is canonical-story hygiene using
  existing traits (a `FeedableTrait` with declared state), PLUS one real
  gap: TS has no ergonomic "must be" requirement kit; validate() is raw
  conditionals by construction.
- **Done when**: David decides whether a TS-side requirement/predicate kit
  (mirroring Chord's `must` contracts) is ADR-worthy, and whether the
  canonical story gets the trait-targeting cleanup regardless.

## P-3 — Scoring event chains are data pretending to be code

- **Status**: PROPOSED
- **Raw TS**: `index.ts:409-441` — three `chainEvent` handlers award
  scores: room-visit (a `ROOM_SCORE_MAP` name→scoreId table walked on
  every `actor_moved`), take-the-map, read-the-brochure. Each is an
  imperative handler whose entire content is `(event, entity) → award`.
- **Chord**: `score visit worth 5` on the room + `after entering it →
  award visit` — owner-attached scores (D12), one line each.
- **Candidate surface**: owner-attached score declarations for TS
  entities (score rides the entity/trait, awarded on a named event) —
  the ADR-212 "data in, prose out" shape applied to scoring: data in,
  points out.
- **Done when**: ADR raised or won't-do. Assertable: the three chains in
  the canonical story become declarations, or the item closes.

## P-4 — The penny press: entity transformation inline in a handler

- **Status**: PROPOSED
- **Raw TS**: `index.ts:449-460` — the `put_in` chain removes the penny,
  `createEntity`s the pressed penny inline (IdentityTrait literal in
  handler code), moves it to the player, awards, and emits inline text.
- **Platform precedent**: `DestructibleBehavior.transformTo` already
  owns remove-and-replace; ADR-213 made removal observable. The gap is a
  story-facing "transform X into Y (pre-authored) on event E" surface —
  the replacement entity authored declaratively, not minted in handler
  code.
- **Done when**: David decides whether transform-on-event is ADR-worthy
  (it is also the dungeo trunk/coffin family's shape) or the press stays
  the canonical example of a raw chain handler. Review note: coordinate
  with the open `DestructibleBehavior.transformTo` transcript-coverage
  gap flagged in the chord-212-213-seams plan — adjacent, different
  scope; neither blocks the other.

## P-5 — Timed content: hand-rolled daemons vs the sequence kit

- **Status**: PROPOSED
- **Raw TS**: `events.ts` — the PA countdown daemon keeps its own
  `announcementCount` in runner state with a `turn % 5` schedule; the
  goat-bleating daemon runs a small state machine over
  `zoo.feeding_time_active`/`zoo.bleat_turns_remaining` state keys; the
  feeding-time fuse and victory daemon are further hand assemblies.
- **Chord**: `define sequence closing time` — wall-clock steps, `N turns
  later` relative steps, `when <owner> becomes <state>` anchors, all
  progression in world state with zero runner-state plumbing; plus
  `on every turn while …, once`.
- **Candidate surface**: a TS-side sequence builder mirroring the D10
  step kit (the loader's `buildSchedulerDaemons` already compiles
  sequences to daemons — the same compilation could back a TS authoring
  API), and a `once`-gated every-turn helper.
- **Done when**: ADR raised or won't-do. Assertable: the PA countdown in
  the canonical story becomes a sequence declaration. Review note: the
  ADR must engage ADR-123's recorded rejection rationale ("factory
  functions + serialization hooks is simpler and sufficient") — a
  data→daemon compiler is a different shape than the rejected class
  hierarchy, and `buildSchedulerDaemons` has since proven it, but the
  argument belongs in the ADR; the goat-state-machine half also touches
  ADR-119 (see P-7).

## P-6 — Runtime behavior swap via stateful daemon closure

- **Status**: PROPOSED
- **Raw TS**: `index.ts:382-402` — the parrot's after-hours personality
  swap is a daemon holding a `behaviorSwapped` closure flag with
  hand-written `getRunnerState`/`restoreRunnerState`, calling
  `npcService.removeBehavior`/`registerBehavior`.
- **Chord**: `chatty while not after-hours` / `candid while after-hours`
  — conditional trait composition; the platform re-evaluates, nothing is
  swapped imperatively and nothing needs save/restore plumbing.
- **Candidate surface**: condition-gated NPC behaviors (or conditional
  trait composition exposed to TS) — register both behaviors with their
  conditions and let the platform arbitrate.
- **Done when**: ADR raised or won't-do. Assertable: the swap daemon and
  its runner-state boilerplate disappear from the canonical story.

## P-7 — Stringly ad-hoc world state vs declared state sets

- **Status**: PROPOSED
- **Raw TS**: scattered `get/setStateValue` keys — `zoo.after_hours`,
  `goats-fed`, `fed-${id}`, `zoo.feeding_time_active`,
  `zoo.bleat_turns_remaining` — untyped, undeclared, unvalidated.
- **Chord**: story `states: open, after-hours` (D2) and entity/trait
  state sets with forward-march checking (D4); conditions reference them
  by name and typos are load errors.
- **Candidate surface**: declared state sets for TS stories (story
  phases + entity states as first-class declarations rather than raw
  state-value keys).
- **Done when**: ADR raised or won't-do — and the ADR, if raised, MUST
  explicitly accept, amend, or supersede **ADR-119 (State Machines,
  PROPOSED since 2026-01)**, which already stakes out declarative
  state/flow territory (ADR-123's decision matrix still routes to it):
  one decision record, not two. Cross-cuts P-2/P-5/P-6 — if those land,
  most of these keys disappear as a side effect; triage together.

---

## Already at the target shape (no items)

- Presence lines: `registerSlotEntry` data rows (ADR-212) — the pattern
  this proposal wants everywhere.
- Gift-shop pins: hand-written `SnippetMap` data (ADR-209/211), including
  the `mentions` gate — kept deliberately as the TS-surface exercise
  (David, 2026-07-14).
- Dynamic text C1/C2: ADR-196 phrase-system consumers.
- Keeper patrol: `createPatrolBehavior` — a platform helper, not raw TS.

## Notes

- Per-item work is platform work (`packages/`): discussion first, ADRs
  per the standing rule, no implementation from this document.
- The canonical story is the acceptance surface for every item: "the raw
  TS disappears from the TS zoo" is each item's done-signal, mirroring
  how ADR-212 retired the presence closure.
- Items are ordered by how loud the signal is (plumbing volume ×
  how declarative the Chord twin already is), not by implementation
  order.
