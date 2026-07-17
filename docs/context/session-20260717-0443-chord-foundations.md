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

## Phase 2 (D1a) — implementation complete, verification green
- Core seam: errorQualified on both ValidationResult interfaces; vetoOf marks all interceptor vetoes; shared blockedMessageId() helper (lifecycle barrel); multi-object propagates provenance, reportBlocked callback now takes ValidationResult.
- Sweep (4 parallel agents + reconciliation): all ~45 standard actions route blocked() through the helper; 8 dotted escapes deleted; capability wraps (factory/digging/cutting) mark errorQualified only when the behavior supplied a key; requireCarriedOrImplicitTake emits qualified taking key + NounPhrase params; wearing params fixed; blank-blocked warning at domain-message no-fallback path (not renderViaPhrase — routine inline-fallback events must stay silent).
- DISCOVERY 1: scope.* keys (requireScope) were unregistered in lang-en-us — every scope refusal reaching blocked() rendered blank on ALL paths (pre-existing). Fixed: 5 scope.* core templates + errorQualified at getScopeError.
- DISCOVERY 2: per-entity `phrase <key>:` + `refuse <key>` NEVER rendered on any action — per-entity phrases register entity-scoped (`<irId>.<key>`) but findRefusal returned bare keys. Fixed: runtime resolvePhraseKey mirrors phraseEvent's override rule. This was the actual remaining blocker for the shipped iron-ring example.
- Latent defects fixed by sweep: multi-object all-fail dropped provenance; inserting delegation double-prefixed putting-interceptor vetoes.
- Verification: tsc clean; stdlib 1503 green (incl. new adr-231-provenance.test.ts, 8 GREEN-graded pins; 5 obsolete assertions updated); engine 509; lang 405; story-loader 166; phrasebook 68/68; BOTH shipped examples render live (iron-ring, hive-box); chain 873/873 clean on run 2 (run 1 = known pre-existing ~50% grue-death flake, wt-12, no thief/lamp signature, cascade-only failures).

## Phase 3 (D1b) — COMPLETE (committed 42cb9f8d)
- Dotted keys at 8 chord parser sites (broader than the 4-site estimate: + must-lines, otherwise-refuse, per-entity phrase headers, define-phrase refactor); 7 EBNF site productions aligned. chord 245/245, story-loader 168/168.
- **NEEDS DAVID RULING**: blocked/deadly EXIT phrase keys still single-token (parser ~605/631, chord.ebnf line 92 deliberately says WORD) — exits weren't in ADR-231 D1's enumerated key sites; 10-minute follow-up if "ALL key sites" is meant literally.

## Phase 4 (D2a) — implementation COMPLETE, verification in progress
- Audit: 12/13 formerly-'gated' actions have validate() refusals; **exiting DEFECT (pre-existing): targeted forms ignore the direct object** (`exit hairpin` in a basket exits the basket) — needs David ruling, not fixed.
- Deleted: 49 grammar.ts sites + 1 dungeo boat-grammar site + both builder impls + SlotConstraint.traitFilters; scope-builder .hasTrait/.where untouched. ADR-218 §1a correction appended; grammar header rewritten. PIN 4 held: zero parse-behavior change, all suites green untouched (if-domain 90, parser 248, stdlib 1505).
- REGRESSION found+fixed during verification (actually Phase 2 fallout — unit transcripts weren't in Phase 2's gate): SceneryTrait cantTakeMessage (authored story id) double-qualified → frame-after-thief blank. Producer marked errorQualified (taking.ts); regression pin added (provenance suite now 11). Third producer class: trait-configured message ids.
- Chain 873/873 clean; phrasebook 68/68; frame/cyclops/grue transcripts clean individually. Troll-family: all 6 transcripts achieved clean runs (one-good-run); recovery ~40% clean rate, all failures = accepted signature (villain_attack kill → cascade; verified live: unarmed GDT-teleport setup, "Conquering his fears..."). 
- ATTRIBUTION CAUTION: first baseline comparison was BOGUS (worktree install failed silently → MODULE_NOT_FOUND counted as passes; "baseline 10/10" and "troll doesn't attack in baseline" both artifacts). Proper baseline build running; flake-rate attribution (pre-existing vs ADR-231-worsened) pending its result.

## Phase 5 (D2b) + rulings — COMPLETE (e2a1bbda, 2f3b7fdd)
- literalSpecificity metric + full ordering (confidence > priority > specificity > registration) incl. fixing english-parser's re-sort that DROPPED priority (pre-existing ordering bug); 11 bumps 100→105. `get in strongbox` → entering refusal, `get out`/`climb out` fixed. Chain clean FIRST run; phrasebook 68/68 byte-identical; parser 255.
- David rulings executed: exit blocked/deadly dotted keys (parser both sites + EBNF; "ALL key sites" now literal); exiting target-aware (not_in_that/not_on_that, 3 state-asserting tests) — Phase 4 audit defect closed.
- Suites after both: stdlib 1509, lang 407, chord 246, story-loader 168; chain one good run (re-run; first = death flake).

## ADR-191 amendment (dc3b49bb)
- David ruled: playground is dual-mode, Chord default. Chord tab = Phase 1 MVP (no wasm — chord compiler + loader in-page, phrasebook fixtures as example library); TS esbuild-wasm design retained as later-phase tab. Status stays PROPOSED (implementation is separate future work, not in the ADR-231 plan).

## Open items
- Plan not yet written (session-planner next); plain-defect list rides in ADR-231 Consequences.
- Parked (unchanged from 907f28): chain RNG-death flake investigation; vitest src-alias-vs-dist oddity; version bump to unblock repokit verify; dungeo dig→platform consolidation.
