# ADR-231 Phase 1 Pins

Design decisions pinned before any code (ADR-230 Phase 1 precedent).
Status: SIGNED OFF (David, 2026-07-17 — all five pins as proposed;
PIN 2 ruled computed-on-demand over stored-at-construction). No later
phase may diverge from a signed pin silently; if a phase finds a pin
wrong, stop and re-pin.

Judged under the plan Preface lens: professional-IF fidelity and
100% Sharpee==Chord uniformity rank above implementation cost.

## PIN 1 — D1 provenance-marking shape

**Decision: `ValidationResult` gains an optional `errorQualified?:
boolean`, set at exactly two producer sites; consumers route through
one shared helper.**

- The lifecycle engine's `vetoOf()` (`lifecycle-engine.ts:165-170`) is
  the single point where an interceptor veto becomes a
  `ValidationResult` — it sets `errorQualified: true` unconditionally.
  Interceptor-originated errors are thereby marked at the engine, never
  per-action (the ADR's ruling verbatim).
- `requireCarriedOrImplicitTake` (`enhanced-context.ts`) sets
  `errorQualified: true` AND emits the fully-qualified
  `if.action.taking.fixed_in_place` — the same one discriminant covers
  helper-produced cross-action keys; no second mechanism.
- A new shared helper in the lifecycle module,
  `blockedMessageId(context, result): string`, implements the whole
  convention: `result.errorQualified ? result.error :
  `${context.action.id}.${result.error}``. Every `blocked()`
  implementation calls it instead of hand-building the id. The 8
  ad-hoc dotted-key escapes are deleted in the same sweep — the helper
  supersedes them (key shape is NOT the discriminator; provenance is).
- Why a flag + helper and not a wrapped error type: the veto shape
  `{ valid, error, params }` is a wire format crossed by story-loader
  runtime, capability behaviors, and 37 actions — a structural type
  change would touch every producer; an optional field is additive and
  the helper gives one greppable seam (and one place for the pinning
  test to target).

Consumed by: Phase 2 (all `blocked()` sites, producer fix, pinning
test asserts a bare interceptor key round-trips on wearing/giving).

## PIN 2 — D3 content-word definition + scoring function

**Decision: vocabulary is a pure on-demand derivation from the current
name — never stored — via a world-model helper; scoring is
all-query-words-must-match with tiered ranking.**

- **Content words**: the name lowercased, tokenized on whitespace,
  minus the stopword set `{the, a, an, of}`. "bag of holding" →
  {bag, holding}; "brass key" → {brass, key}; hyphenated tokens stay
  single words ("jack-in-the-box" → {jack-in-the-box}).
- **Derivation timing**: computed on demand by a pure helper
  `deriveNameVocabulary(name: string): string[]` in world-model
  (identity area), NOT written into `IdentityTrait.aliases`/
  `adjectives` at construction. Rationale: authored fields stay
  authored (no polluting `aka` data), and runtime renames can never
  leave stale derived vocabulary — the derivation is always of the
  current name. Chord-loaded and TS-authored entities are uniform by
  construction because both flow through the same helper at match
  time. Explicit `aka` aliases stay additive: each alias contributes
  its own full text (exact tier) and content words.
- **Scoring** (command-validator resolution, replacing exact-match):
  - Tier EXACT (rank 3): query text (article-stripped) equals the full
    name or a full alias, case-insensitive. Proper names survive —
    full text is tried first.
  - Tier WORDS (rank 2): **every** query content word matches a word in
    the entity's vocabulary (name words + alias words + authored
    adjectives). Score within tier = number of matched words. A query
    word matching nothing disqualifies the candidate (`x brass sword`
    never resolves to the brass key).
  - Rank: higher tier wins; within tier, more matched words win.
  - Ties (same tier + score, 2+ candidates) → the normal
    disambiguation flow; single survivor → auto-resolve.

Consumed by: Phase 6 (helper, validator scoring, loader derivation,
articles population).

## PIN 3 — D4 topic field location + type

**Decision: `topic?: { text: string; entity?: EntityId }` on BOTH
command interfaces, `EntityId` not entity reference.**

- `IParsedCommand` (`parsed-command.ts`): parser populates
  `topic.text` only (the parser never resolves entities) — placed
  alongside the existing `instrument` field, same shape precedent.
- `IValidatedCommand` (`validated-command.ts`): validator's
  entity-first attempt fills `entity` (an `EntityId`, matching
  `instrument`'s shape) or leaves it undefined for free text.
- `textSlots` and `extras` are untouched (the ADR's explicit
  constraint); asking/telling's dead `structure.extras` fallback is
  deleted in Phase 7.

Consumed by: Phase 7.

## PIN 4 — D2a factual basis, verified (planner contradiction resolved)

**Decision: the ADR's ruling stands exactly as written; the planner's
"traitFilters is live" finding was a same-name/different-type
conflation. No re-scope.**

- Verified this session by direct trace: there are TWO `traitFilters`
  fields. Rule-level `.hasTrait(slot, trait)` writes
  `SlotConstraint.traitFilters` (grammar-engine.ts:145-151) — **zero
  consumers in all of parser-en-us** (grep-verified). The scope
  resolver's check (`grammar-scope-resolver.ts:78-84`) reads
  `ScopeConstraint.traitFilters`, populated only by the
  scope-builder's `.hasTrait()` *inside* `.where()` clauses
  (scope-builder.ts:66-67) — that is part of the `.where()` mechanism
  the ADR explicitly keeps.
- Empirical confirmation stands: `enter hairpin` parses to entering
  despite no ENTERABLE trait — rule-level gates never gated.
- Phase 4 therefore deletes rule-level `.hasTrait()` (~50 grammar.ts
  call sites) + `SlotConstraint.traitFilters` plumbing with **no
  parse-behavior change**, and keeps the validate()-refusal audit as
  belt-and-braces (the gates were intended; the audit proves
  validate() covers every intended refusal). Scope-builder
  `.hasTrait()` inside `.where()` is untouched.

Consumed by: Phase 4 (plan's pre-plan finding #1 is superseded by this
pin).

## PIN 5 — D5a analyzer diagnostics + grammar production

**Decision: one parameterized diagnostic code; `starts <state>` reuses
the existing `starts` dispatch with one-token lookahead.**

- Diagnostic: a single code `analysis.starts-state-pairing`
  (ERRATA 2026-07-17: the pin originally wrote `analyze.` while
  explicitly intending to match the existing convention — the repo's
  analyzer codes are all `analysis.*`; intent honored, literal
  corrected at delivery), parameterized
  with the state word and the required trait — "`starts locked`
  requires `lockable` composed on this entity". One code, three
  pairings (locked→lockable, closed/open→openable, off/on→switchable);
  future stateful traits extend the table, not the code.
- An unknown state word after `starts` (not a recognized initializer
  and not `in`) is its own parse-time error, not a silent pass.
- Grammar production: extend the existing composition-line `starts`
  handling — lookahead one token: `starts in <place>` stays placement;
  `starts <known-state>` is the initializer clause. No new top-level
  keyword; `chord.ebnf` gains the alternative on the existing
  production.
- Load mapping: loader sets the trait's initial-value field only
  (`isLocked`/`isOpen`/`isOn`) — the shadow-state ratchet is
  untouched, state adjectives stay derivable-never-stored.

Consumed by: Phase 8 (and Phase 9 relies on `starts open`).
