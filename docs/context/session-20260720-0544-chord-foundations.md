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
- **Session STOPPED on David's request (~07:21 UTC) mid-Phase 6.** Phase 6 is PARTIAL — see the plan's Phase 6 status block for the precise resume state (banner ✅, again-after-drop ✅, RESTARTING vocab ✅, restart-repair PAUSED on David's ruling, cross-check test + CLAUDE.md line not started).
- Remaining when work resumes: finish Phase 6 (pending David's restart ruling), Phases 7, 8, 9, then 10 (verification sweep last).
- **Working tree is UNCOMMITTED** (~40 modified/new files across world-model, stdlib, lang-en-us, parser tests, repokit, docs). All targeted suites green at stop time; no full cross-package build run yet (that's Phase 10). David: say the word and I'll commit (or run /fin).

## Held Questions for David (updated at stop)
4. **Restart on the Chord path** (Phase 6): diagnosis overturned — it parses fine; the engine's restart story-reload crashes (`assignRoom: room 'r01' not found` on fernhill) and renders as "I don't understand that." Fixing means touching the engine's Chord-path restart/reload flow — materially different from the planned verbs-entry fix. How do you want to proceed?
5. **Cross-check test framing** (Phase 6): verb vocabulary proved load-bearing for comma-chaining/word-lookup, NOT for parsing grammar literals. Proposed: add verbs.ts entries for all 8 unrepresented grammar actions + an exception-free sync test. OK?

## Open Items
- Carried from prior sessions: `rework/` intermediates + `BRIEF.md` keep-or-clean call; ADR-245/246 design companions.

## Files Modified
- (in progress)

---

## Session Metadata
- **Status**: STOPPED BY DAVID mid-Phase 6 (Phases 1-4 COMPLETE, 5 PARTIAL-as-planned, 6 PARTIAL; 7-10 not started). Work saved, uncommitted.
- **Blocker** (if any): Phase 6 restart repair awaits David's ruling (diagnosis overturned — engine Chord-path reload bug, not vocabulary); ADR-0247 interview offer open.
- **Test state at stop**: world-model 1405 ✓, stdlib 1555 ✓ (+dropping 25 ✓ after scope change), lang-en-us 429 ✓; type-clean: world-model, stdlib, lang-en-us; repokit rebuilt ✓; madge circulars at baseline 9.
- **Rollback safety**: all changes uncommitted on `chord-foundations`; `git stash`/`git checkout -- .` reverts cleanly (new files listed under Untracked).
