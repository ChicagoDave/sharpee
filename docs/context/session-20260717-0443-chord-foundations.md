# Session Summary: 2026-07-17 04:43 — chord-foundations (session 1befbd)

## Goals
- Work through the 7 platform gaps surfaced by phrasebook verification (session 907f28): verify each against real code, triage ADR-worthy vs plain defects, and proceed per David's rulings.

## Key decisions
- Triage (David): ADR-230-style split — one successor ADR for the 6 decision areas, plain defects straight to the plan.
- **ADR-231 drafted + all 6 open questions ruled by David via /devarch:adr-interview** (`docs/architecture/adrs/adr-231-player-surface-contract-rulings.md`): D1 provenance pass-through (interceptor errors = fully-qualified ids, never prefixed; dotted keys at ALL Chord key sites; fixed_in_place leak fixed at producing helper; renderer dev-warning on unregistered ids). D2 `.hasTrait()` DELETED (parse by syntax, refuse by validate; `.where()` remains) + literal-before-slot specificity as general confidence rule. D3 word-level name vocabulary derived at world-model identity construction + scored validator matching (head-noun heuristic rejected as fidelity ceiling). D4 first-class `{ text, entity? }` topic field, entity-first resolution with text fallback. D5 generic `starts <state>` composition clause (ratchet-safe initializer reuse of state adjectives); D5b closed default wins, builder.openable() pre-add removed. D6 dedicated engine-owned action RNG stream via ActionContext.random, seed persisted across save/restore.
- David restated the ruling lens mid-interview: "full 100% alignment and high fidelity parser/grammar system" — recorded in memory (sharpee-chord-parity-goal rider); rulings ranked by fidelity + uniformity, not blast radius.

## Work log
- Pre-session audit clean (tsc clean, all committed, no blockers).
- 4 parallel investigators grounded all 7 gaps in real code. Key corrections/escalations vs the original list:
  - Gap 1 (blank Chord refusals): exactly 8 actions have the dotted-key escape, ~29 prefix unconditionally; hyphenated keys blank even on the 8; dotted keys rejected in conditional refusals AND `define phrases` block AND per-entity `phrase key:`. Root cause = unruled namespace contract (ADR-229 R1 rendering-side counterpart).
  - Gap 2: wearing not_wearable/already_wearing/cant_wear_that = mechanical missing params (wearing.ts:110/123/125). "giving self" NOT reproducible — real repro is cross-action key leak (`requireCarriedOrImplicitTake` returns taking's `fixed_in_place`, giving/showing prefix it → blank) = instance of gap 1.
  - Gap 3: validation-stage miss, not parse; bare `x key` also fails without alias (head nouns of multiword names unmatchable); `articles` contract field exists but hardcoded empty.
  - Gap 4: `get in strongbox` silently TAKES the container (tie at priority 100, registration order); `climb out` same class; BONUS: `.hasTrait()` grammar constraints are a parse-time no-op platform-wide (falsifies ADR-218 §1a comments).
  - Gap 5: grammar never marks `:topic` → command-validator entity-resolves it pre-action; SlotType.TOPIC + TextSlotConsumer exist unused; 2 latent defects (no TOPIC structure-mapping branch; asking/telling extras fallback reads nonexistent field).
  - Gap 6: no initial-locked surface at all (state-adjective ratchet blocks workarounds); container-kind+openable starts OPEN (helpers `?? true`) vs adjective-only CLOSED (world-model `?? false`).
  - Gap 7: throwing 6 sites + attacking (WeaponBehavior damage/crit) + inventory variant-pick; ActionContext exposes no RNG at all — contract change needed.

## Interview + review
- ADR-231 flipped DRAFT → ACCEPTED (all 6 questions ruled); adr-review: 14/16, READY FOR IMPLEMENTATION. Two FAILs converted to plan pins (provenance shape, topic field location/type, content-word + scoring definition) + three named rejection tests (D5a pairing, D4 free-text non-rejection, D6 restore-determinism); staleness in Decision intro/Consequences fixed post-review.

## Plan + Phase 1 (same session)
- session-planner wrote docs/work/player-surface-contracts/plan.md (11 phases; .current-plan updated); plan-review clean, 1 advisory tension (Phase 10 must re-verify troll-family flake signature). David's design-lens preface added to the plan.
- Planner's "D2a traitFilters is live" contradiction RESOLVED by direct trace: two same-named fields — rule-level SlotConstraint.traitFilters has zero consumers (dead, ADR basis stands); scope-builder ScopeConstraint.traitFilters inside .where() is the live one, kept.
- Planner scope corrections: D1b dotted keys = 4 chord parser call sites (Small); D4 TextSlotConsumer already wired (Phase 7 narrower).
- ADR-231 + session summary committed 0e533129 (local).
- **Phase 1 COMPLETE**: pins.md written + all 5 pins signed off (David): PIN 1 errorQualified flag + shared blockedMessageId() helper; PIN 2 computed-on-demand vocabulary, stopwords {the,a,an,of}, exact>all-words-match tiered scoring; PIN 3 topic {text, entity?: EntityId} on both interfaces; PIN 4 D2a basis verified, no re-scope; PIN 5 single analyze.starts-state-pairing diagnostic + starts-dispatch lookahead.

## Open items
- Plan not yet written (session-planner next); plain-defect list rides in ADR-231 Consequences.
- Parked (unchanged from 907f28): chain RNG-death flake investigation; vitest src-alias-vs-dist oddity; version bump to unblock repokit verify; dungeo dig→platform consolidation.
