# Session Summary: 2026-07-16 22:51 — chord-foundations (session 907f28)

## Goals
- Decide how to action the fix-after backlog from session 4685f3 (recurring grammar-reachability gaps + adjacent defects).

## Key decisions
- ADR-first split (David): one successor ADR for the decision-bearing items; plain defects (loader `with key` drop, pulling/restarting lang drift, dead message IDs, chord-language.md death section) go straight to the plan, no ADR.
- **ADR-230 drafted** (DRAFT, 5 open questions): `docs/architecture/adrs/adr-230-grammar-reachability-completion.md` — reachability pinning gate (D1), mechanical grammar for locking/removing/listening/smelling/sleeping + keyless unlock (D2), orphan-id dispositions (D3), verbs.ts synonym policy (D4), dotted-phrase-key ruling (D5).

## Work log
- Recap presented; pre-session audit clean (stdlib-reference work already committed at 21f938be; tsc clean; audit flagged grammar-reachability as recurring-unactioned across 2 sessions).
- Spot-verified gap inventory against grammar.ts before pinning it in the ADR (no patterns for the 5 actions; orphan ids at grammar.ts:46/535/543; unlock keyed-only at :524).

## Interview + review (same session)
- All 5 open questions ruled by David via /devarch:adr-interview: Q1 pattern table as proposed (+bare sniff); Q2 carefully→examining remap, opening gains author-configurable tool slot (R2 precedent), cutting = real action + CuttableTrait (lockable-key-mirroring tool config); Q3 promote ALL verbs.ts synonyms to grammar (plan must deliver verb→id mapping table); Q4 fix phrase parser to EBNF (dotted keys register whole; resolution-path wiring in scope); Q5 gate = stdlib unit test.
- ADR-230 flipped DRAFT → ACCEPTED; adr-review ran: 11/13, READY FOR IMPLEMENTATION. Review's real catch (cutting success semantics unspecified) ruled by David post-review: cutting action performs no mutation; each cuttable DO registers its own cut implementation (ADR-090 dispatch); unregistered cuttable = authoring error, load-time where possible.
- Plan must pin before code: trait tool-field shapes, parser-en-us pattern→id export signature, Chord cuttable clause syntax.

## Plan + Phase 1 (2026-07-17, same session continued)
- session-planner wrote docs/work/grammar-reachability/plan.md (10 phases; .current-plan updated); plan-review clean, 2 advisory tensions folded into Phase 5 (fully-qualified capability-effect ids, root-barrel discipline).
- Planner research findings: D5 resolution path already wired (Phase 8 = truncation fix only); loader `with key` = 3 bugs incl. requiredKey/keyId typo in 3 TS builder sites; too_heavy is live (off cleanup list); turning/using/answering = orphan verb constants.
- Phase 1 COMPLETE: pins.md written + signed off. Rulings: PIN 1 getReachableActionIds() export; PIN 2 toolId/toolIds only (no master/auto clones), shared Openable+Cuttable; PIN 3 cuttable-with-tool syntax + loader post-load unimplemented-cuttable check; PIN 4 full verb table; turning/using/answering DEFERRED (Phase 6 design sketches); find/locate removed ("recall" idea parked); move → pushing/putting patterns, leaves going; PIN 4b patterns arrays get one-time manual reconciliation in Phase 6; PIN 5 gate lands early with staged exceptions.

## Phase 2 (2026-07-17) — COMPLETE
- `EnglishParser.getReachableActionIds()` (parser-en-us) + reachability gate in `lifecycle-registry.test.ts`: registry⊆grammar direction (2 permanent + 5 temporary exceptions), orphan inverse (13 documented), two staleness self-cleaning tests, keyless-unlock pin. 10/10 green first run; parser-en-us tsc clean. Uncommitted.
- **DISCOVERY (pins.md A1, needs David)**: 10 orphan grammar ids beyond the ADR's 3 — asking/telling (actions parked in `removed/`, ext-conversation is a stub), saying/saying_to/shouting/whispering, writing/writing_on, digging, taking_with. All parse today and fail at runtime.

## Phase 3 (2026-07-17) — COMPLETE
- A1 ruled: folded into Phase 6 sketches (conversation/writing/tool-verb families).
- 6 D2 grammar additions (lock bare+keyed, keyless unlock, remove-from @110, listen/listen-to, smell/sniff bare+target, sleep) + D3a remap (`look [carefully] at` → examining). Gate temporary list now empty; gate 10/10; walkthrough chain 951/951 clean; all 8 forms live-verified against the bundle; 1 obsolete parser test updated; parser-en-us 252 + stdlib 1474 green. Uncommitted (with Phase 2).

## Open items
- Phase 4 (D3b opening tool slot) awaiting David's go.
- Phases 2+3 uncommitted.
