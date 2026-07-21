# Session Summary: 2026-07-20 05:44 UTC - chord-foundations (session 18953c)

## Goals
- Execute `docs/work/platform-issue-sweep/plan.md` autonomously overnight (David's directive: "do any phase that does not require my attention; hold all questions until I return tomorrow").
- In scope: Phases 1–4, 6–9 in full; Phase 5 steps 1 (narrow `includeWorn:true` fix), 2 (draft ADR-0247, DRAFT status — interview question HELD for David), and 5 (rehydration investigation); Phase 10 verification sweep over whatever landed.
- Out of scope (needs David): Phase 5's ADR interview/acceptance and broad `getContents()` default flip; any phase whose investigation surfaces a materially different fix than the plan describes (stop and record instead).

## Phase Context
- **Plan**: `docs/work/platform-issue-sweep/plan.md` (10 phases; Phase 1 CURRENT at session start).
- **Questions policy this session**: NO ntfy/GitHub questions — all questions accumulate in "Held Questions for David" below.

## Held Questions for David
1. **ADR-0247 interview** (rule 11a): drafted with 3 Open Questions (opt-out naming; whether any call site keeps the filtered view; ClothingTrait parity). Broad `getContents` flip gated until ACCEPTED. Interview offer made in-conversation (~07:15 UTC).
2. **Descriptionless `EXAMINE ME`** residual (Phase 3a): the "just a" fallback doesn't fit the player noun; self-examination with no description still renders blank. Needs a wording ruling.
3. **Scope ratifications** (David saw these in-conversation while awake, no objection so far): Phase 1 also converted `container_contents`/`supporter_contents` item params to PhraseLists; Phase 3 did the same for examining's contents params.

## Completed
- **Phase 1 COMPLETE** — per-shape concealment/hiding message IDs; `getLocationPreposition` deleted; PhraseList item params; 10 render-assertion tests.
- **Phase 2 COMPLETE** — shared visibility definition in `VisibilityBehavior` (`isConcealed` + `isListable` + public `getVisibleContents`); scope-resolver delegates; LOOK/EXAMINE contents filtered; 14 new tests.
- **Phase 3 COMPLETE** — (a) `default_description` fallback ("The pebble is just a pebble."); (b) `createEventInternal` pass-through unification w/ inline emit audit; (c) attack reason codes + tightened heuristic + author-prose inline routing + consumer audit.
- **Phase 4 COMPLETE** — `climb_nowhere` honest refusal (validate consults `canMoveEntity`); `ClimbableTrait.destination` honored; invariant throw.
- **Phase 5 PARTIAL** — narrow `includeWorn:true` inventory fix; ADR-0247 DRAFT; rehydration bug CONFIRMED+FIXED platform-wide (`rehydrateTrait` + leaf-module hook, circular-dep count kept at baseline 9). Steps 3-4 await David.
- Details per phase: `docs/work/platform-issue-sweep/plan.md` status lines.

## Key Decisions
- Trait rehydration fixed via registry + leaf-module hook (NOT a direct if-entity→implementations import — madge showed 9→28 circular chains; hook keeps 9).
- Author trait prose (attack damageMessage etc.) routes as inline `message` (pipeline fallback renders verbatim) — was silently blank under both old and naive-tightened heuristics.
- Wall keeps its `nothing_special` fallback (working, tested); the new fallback covers the silent variants.

## Next Phase
- **RESUMED on David's "continue" (~14:50 UTC)** after the earlier stop + /devarch:finalize (commit `c372b3be` pushed).
- **Phase 6 completed** (except the paused restart repair): 10 verbs.ts entries added (true builder-derived gap set included `lowering`/`raising` beyond the 8 from the mapsTo-grep), exception-free `grammar-vocabulary-sync` test (parser-en-us, 273 green), CLAUDE.md clarifying paragraph with the verified comma-chaining framing.
- **Phase 7 COMPLETE**: genuine-success gating — engine computes `success && !blocked/failed-events` into TurnPluginActionResult; `EvaluationContext.actionSucceeded` strict `=== true` gate on action triggers; event triggers skip blocked/failed events. 3 new tests + harness updates; story-loader 297 + engine 513 green.
- **Phase 8 COMPLETE**: all five compile gates (door-plain-mirror analyzer gate + loader backstop; bare-verb grammar for ALL define-actions + `cant`→`scope.out_of_scope` default, which previously THREW a LoadError; 2 collectInlineTexts sites; parse.refuse-order fix-it; analysis.deadly-while-unsupported). 9 chord tests + 2 story-loader tests; chord 398 + story-loader 299 green; author-guide line added.
- **Phase 9 COMPLETE**: item #4 framing recorded in ADR-246 companion scope; item #12 row in chord-availability-audit.md.
- **Phase 10 COMPLETE**: build green; banner v3.2.0 verified; friendly-zoo bare pet/feed verified; verify.mjs re-captured + green (§6.2 RESOLVED — "Hidden on the loose floorboard…"; attack-barrel line speaks; deadly-while in expect-fail manifest); cookbook 17/17 + chord-language 50/50 green; **dungeo chain 902/902**; all 8 package suites green + type-clean.
- **Phase 10 surfaced + fixed one regression from Phase 6's dropping-scope widening**: "drop book" disambiguation (black book in hand vs guidebook on floor) — fixed with new declarative `ActionMetadata.preferredScope` (dropping=CARRIED) + `resolveAmbiguity` heuristic + 3 validator tests. **Platform surface addition — needs David's ratification.**
- **New platform issue held for David**: dungeo BATCH transcript runs (`--test *.transcript`, many engines in one process) are nondeterministic — proven PRE-EXISTING via pristine 395eb3e9 worktree (68/71 failures across two identical baseline runs, combat-death "Engine is not running" cascades; baseline chain green). Likely per-engine time seeding. Solo runs + chain are the reliable gates today.
- Also pre-existing, held: chord-language verify-traceability has 2 drifts (doors.story, use-extensions.story), identical on committed baseline.
- Still awaiting David: restart repair ruling (Q4), ADR-0247 interview (Q1), EXAMINE ME wording (Q2), preferredScope ratification (Q6), batch-RNG issue (Q7).

## Held Questions for David (updated at stop)
4. **Restart on the Chord path** (Phase 6): diagnosis overturned — it parses fine; the engine's restart story-reload crashes (`assignRoom: room 'r01' not found` on fernhill) and renders as "I don't understand that." Fixing means touching the engine's Chord-path restart/reload flow — materially different from the planned verbs-entry fix. How do you want to proceed?
5. **Cross-check test framing** (Phase 6): verb vocabulary proved load-bearing for comma-chaining/word-lookup, NOT for parsing grammar literals. Proposed: add verbs.ts entries for all 8 unrepresented grammar actions + an exception-free sync test. OK?

## Open Items
- Carried from prior sessions: `rework/` intermediates + `BRIEF.md` keep-or-clean call; ADR-245/246 design companions.

## Files Modified
- (in progress)

---

## Session Metadata
- **Status**: SWEEP COMPLETE (resumed after David's "continue"). Phases 1-4, 6 (minus paused restart repair), 7, 8, 9, 10 COMPLETE; Phase 5 partial-as-planned (steps 3-4 gated on ADR-0247). Post-resume work uncommitted (pre-stop work is commit `c372b3be`).
- **Blockers/held**: 7 items await David — restart repair ruling; ADR-0247 interview; EXAMINE ME wording; preferredScope ratification; batch-RNG platform issue (pre-existing, newly proven); verify-traceability drift (pre-existing); Phase 1/3 PhraseList scope ratifications (seen in-conversation, no objection).
- **Test state at completion**: core 158, world-model 1405, stdlib 1558, lang-en-us 429, parser-en-us 273, engine 513, chord 398, story-loader 299 — all green + type-clean; verify.mjs/cookbook/chord-language harnesses green; dungeo chain 902/902; madge circulars at baseline 9.
- **Rollback safety**: post-resume changes uncommitted on `chord-foundations` atop `c372b3be`.
