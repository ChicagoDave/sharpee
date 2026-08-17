# Session Summary: 2026-08-16 - feat/ide-explain-npc-turn

## Goals
- Close Phase 7 (final phase) of the ADR-310/318 character implementation plan.
- File the ADR-319 (Flashbacks) roadmap issue at David's request.
- (Second half) File GitHub issues #268/#269 from thealderman-port expressiveness flags.
- (Second half) Merge prior-art research on conversation/dialogue systems, then author and accept ADR-320.

## Phase Context
- **Plan**: `docs/work/adr-310/plan.md` — "Acceptance closure: diagnostics completeness, isolation, cost regression, whole-platform regression, IDE surface" (ADR-310 character-model-in-Chord + ADR-318 normative character layer).
- **Phase executed**: Phase 7 — "Acceptance closure — diagnostics completeness, isolation, cost regression, whole-platform regression, IDE surface" (Medium tier).
- **Tool calls used**: 91 / 250.
- **Phase outcome**: Completed under budget. Plan Status → DONE (all seven phases DONE, both ADRs' Acceptance sections discharged per `acceptance-audit.md`); plan archived to `docs/work/archive/adr-310/`; `.current-plan` pointer released.
- **Second half**: with the ADR-310/318 plan closed, the session continued into conversation/dialogue-system research. A `session-planner` research plan (`docs/work/npc-agency-conversation-research/plan.md`) was written and reviewed, then abandoned mid-session per David's explicit redirect (merge prior art first; go ADR-first, not plan-first). The rest of the session produced ADR-320 (authored, interviewed, reviewed, accepted) with no plan cycle wrapping it. Note: `docs/context/.session-state-02073f.json` was retired by the earlier finalize's cleanup that produced this summary's first half — the second half is reconstructed from conversation record rather than the state file.

## Completed

### ADR-319 roadmap issue
Filed https://github.com/ChicagoDave/sharpee/issues/267, "Feature roadmap: ADR-319 Flashbacks", labeled `enhancement` + `ADR`, summarizing D1–D5, the ephemeral-vs-persistent spectrum, and next steps (open-questions interview at Q10 → ACCEPTED → plan).

### Phase 7 closure — click-to-assert round trip
- Built a fresh Debug Chord Writer via `xcodebuild` (no prior build carried the explain-NPC-turn panel; only build was Aug 15 pre-panel). Verified `devkit`/`platform-browser` dists fresh and the `ts-character-assert` marker present in the built app before handing off for live verification.
- Closed the prior session's mutation-audit gap: added "click-to-assert character fragments persist through the document round trip (ADR-318 D11)" to `tools/ide/web/testing-surface/tests/model.test.ts` — asserts fragments survive `model.addChannel({id:'character',contains})` → serialize → deserialize, including byte-stability. Testing-surface suite went 75 → 76 passing (event log: "8 passed 76 passed", 2026-08-17T02:03:20Z, after the model.test.ts edit at 02:03:10Z). `tsc --noEmit` clean.
- Added the discoverability hint David requested: a `[SKIP]` card whose turn carried character rows now renders "assert from the NPC panel →" (clickable, opens the panel) — `cards.ts` `renderAssertions` + `.ts-skip-npc-hint` in `surface.css`. Presentational only; `compose.ts` untouched so document claims stay verbatim. Bundle rebuilt into `SharpeeIDE/Resources`; Debug app rebuilt and marker-reverified; testing-surface suite re-confirmed 76 passing (event log 02:24:18Z).
- David verified LIVE in the built app (screenshot, 2026-08-16 21:26 CDT): asserted Viola's `pressure_deposit` line from the panel; claim persisted as a `character` channel `contains` claim with fragments `"kind":"character.author.pressure_deposit"`, `"npcId":"a05"`, `"feed":"pin:killer"`; re-run PASS — 4 cards passing, 9 assertions passing. This was Phase 7's sole remaining exit criterion.
- `plan.md` Phase 7 marked DONE with that evidence inline; Plan Status set to DONE; archived via `plan-archive.sh` to `docs/work/archive/adr-310/`; `.current-plan` released (event log: build passed 02:29:15Z — `pnpm --filter @sharpee/repokit build` + `./repokit manifest --check`).

### Stale-path sweep after archive
Repointed `docs/work/adr-310/` → `docs/work/archive/adr-310/` in `packages/character/src/tick-phases.ts`, `packages/chord/src/character-manifest.ts`, `packages/world-model/src/traits/character-model/character-vocabulary.ts`, `tools/repokit/src/commands/manifest.ts` (the generator emitting two of those headers), plus ADR-310, ADR-318, ADR-145, `docs/roadmap/roadmap-002.md`, `website/src/lib/roadmap-data.json`. Repokit rebuilt; `./repokit manifest --check` green. Session summaries and dist artifacts deliberately left untouched (history/regenerable).

### GitHub issues filed from thealderman-port expressiveness flags
- #268 "Chord surface follow-up" — umbrella issue for four gaps where the thealderman port expressed something in TypeScript that Chord syntax cannot yet express; labeled `enhancement` + `ADR`.
- #269 "Goal turn-count waits blocked on ADR-316" — specific blocker flagged during the port; labeled `enhancement` + `ADR`.
Both filed at David's explicit request.

### Conversation-system research: redirect from plan-first to ADR-first
David redirected the research effort mid-session: merge the two existing prior-art documents before doing anything else, and start with an ADR rather than a plan.
- The `session-planner` research plan (`docs/work/npc-agency-conversation-research/plan.md`, created this session and reviewed by `plan-review` with 1 CONTRADICTION + 1 TENSION finding) was marked **ABANDONED** per David's ruling and archived to `docs/work/archive/npc-agency-conversation-research/`; `.current-plan` released a second time this session.
- Wrote `docs/work/adr-320-conversation/prior-art.md` — a merged reference unioning `docs/work/lantern-brainstorm/conversation-systems-survey.md` (April 2026, pre-Chord) and `docs/work/archive/adr-310/prior-art.md` (Aug 14, pass 1) — the two were produced blind to each other. Re-graded the April survey's six field gaps against ADR-310/318: two closed by Sharpee already (per-character knowledge enforcement; trackable unreliable narration via the lie ledger), two half-closed, two still open (conversation memory with narrative relevance; hybrid input with NPC agency).

### ADR-320 authored, interviewed, reviewed, and accepted
Wrote `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md`, "Conversation and Complex Dialogue — The Other Side of NPC Agency," with an initial frame (D1–D3) and 10 open questions. Ran a full `/devarch:adr-interview` with David the same session, resolving all 10 into D4–D13:
- **D4** conversation-is-a-scene + exchange points — a back-and-forth loop; scenes are openable by participants, by initiative, or by any witnessed world event (David's "shadow passing the window" example); memory and initiative become scene obligations; the stranded ADR-142 lifecycle machinery (`packages/character/src/conversation/lifecycle.ts`) survives as the runtime skeleton.
- **D5** manner layer — delivery is declared once; content rows always win over manner. David: "this is genius."
- **D6** time lapse as conversational state — recency words read off ledger turn stamps, absence words trigger at boundaries, one clock seam. David: "we def need a way for time lapse to impact conversations."
- **D7** initiative is a personality trait affected by circumstances (David's phrasing) — one interview edit was rejected by David mid-fold and rewritten to add the circumstances clause.
- **D8** conversational agency is world-bounded; silence is the inalienable move. David's handcuffed-to-a-chair example.
- **D9** threading = a discussed-ness predicate plus a subject-change occasion.
- **D10** multi-party conversation: floor allocation by disposition with ensemble reactions; interruption resolved by strength-vs-motivation; NPC↔NPC scenes are visible propagation.
- **D11** player utterances are witnessed claims. David: "as with everything about NPCs, the PC's actions are witnessed."
- **D12** presentation is agnostic; exchanges advertise their available responses as wire data. David: "all of it."
- **D13** demonstration story: a Shakespeare-era theatre company, rehearsal through performance (David's premise) — a new vehicle, not thealderman. Reflections was named but deliberately held back (David is holding it for a potential competition entry); `project_reflections_story.md` memory file updated to reflect that.
- **Q10** resolved ADR-142 as **SUPERSEDED by ADR-320** — the Status stamp was written into `docs/architecture/adrs/adr-142-conversation-system.md`.

`adr-review` then ran on ADR-320 per the interview's own contract and scored 13/17 with four findings: missing Implementation section; the contracts-first-deliverables sentence absent; missing Acceptance section; and a citation discrepancy (the draft cited "ADR-310 D12 as amended," claiming a Best-of-Three amendment that was never actually folded into ADR-310). All four were addressed: the citation was fixed to cite D12-as-written plus prior-art F1; an Implementation section was added (9 packages touched, 2 deliberately left untouched); the TS-contracts-first deliverable discipline was written in; and an Acceptance section with 13 criteria was added. Re-scored 17/17.

ADR-320 was then flipped to **ACCEPTED** with David's explicit approval. No implementation was authorized this session — the implementation plan (TS contracts first, theatre-story player task specified before mechanism) is the named next step.

## Key Decisions

### 1. `tsf build --npm` regression leg stays retired
Confirmed per David's 2026-08-16 ruling: npm-publish builds run in CI, `tsf` is a version-bump tool only. Phase 7's original plan text listed this as a gate; closure proceeded without it.

### 2. Skip-hint is presentational, not a document mutation
The "assert from the NPC panel →" hint on `[SKIP]` cards changes only `cards.ts` rendering; `compose.ts` (which builds document claims) was deliberately left untouched so the auto-assertion policy (room-name-and-description channels only; dialogue prose not auto-pinned, since it's volatile under the character model) stays intact.

### 3. Research proceeds ADR-first, not plan-first
David overrode the in-progress `session-planner` research plan mid-session: merge the existing prior-art documents first, then write an ADR — do not plan the research itself. The plan was marked ABANDONED and archived rather than reused or amended.

### 4. ADR-320 accepted; ADR-142 superseded
ADR-320 codifies conversation and complex dialogue as the counterpart to ADR-310/318's NPC agency work, resolving 10 open questions (D4–D13) through a full interview with David and passing `adr-review` at 17/17 after four findings were addressed. ADR-142 (the prior conversation-system ADR) is now formally superseded by it. No implementation was authorized — writing the ADR and reaching ACCEPTED was the full scope of this half of the session.

### 5. Reflections held for a competition entry
David named Reflections (3 actors, iMessage UI, rotating PC — the motivating story for ADR-319 persistent parallel storylines) as ADR-320's demonstration-story candidate, then held it back, favoring a new Shakespeare-era theatre company vehicle instead. He's holding Reflections for a possible competition entry. The `project_reflections_story` memory note was updated to record this.

## Next Phase
The ADR-310/318 plan itself is complete — no successor phase in that plan. The conversation-research plan that followed was abandoned rather than completed (see Key Decision 3). The concrete next step, stated by David at ADR-320's acceptance, is an **implementation plan** for ADR-320: TS contracts first, with the theatre-story player task specified before the underlying mechanism is built. No plan has been written for this yet.

## Open Items

### Short Term
- Commit the ADR-320 batch (in progress via this finalize).
- Write the ADR-320 implementation plan — TS contracts first, theatre-story player task specified before the mechanism.
- ADR-319 open-questions interview — still pending; David indicated starting at Q10 (not started this session; superseded in priority by ADR-320 work).

### Long Term
- Recurring deferred audit findings (flagged again this session by `pre-session-audit`, not newly discovered, unchanged in the second half): 23 stranded event logs; two stale plans (`adr-280-chord-writer-project-model`, `live-derived-state`); the 4-way ADR-location split. All still await deliberate disposition.

## Files Modified

**ADR-310/318 closure** (5 files):
- `docs/work/adr-310/plan.md` (now `docs/work/archive/adr-310/plan.md`) - Phase 7 marked DONE with evidence; Plan Status → DONE.
- `tools/ide/web/testing-surface/tests/model.test.ts` - new round-trip persistence test (ADR-318 D11).
- `tools/ide/web/testing-surface/src/cards.ts` - `[SKIP]`→NPC-panel discoverability hint.
- `tools/ide/web/testing-surface/src/surface.css` - `.ts-skip-npc-hint` styling.
- `tools/ide/SharpeeIDE/Resources/testing-surface/{surface.css,surface.js}` - rebuilt bundle output.

**Stale-path sweep** (7 files):
- `packages/character/src/tick-phases.ts`, `packages/chord/src/character-manifest.ts`, `packages/world-model/src/traits/character-model/character-vocabulary.ts`, `tools/repokit/src/commands/manifest.ts`, `docs/architecture/adrs/adr-145-npc-goal-pursuit.md`, `docs/architecture/adrs/adr-310-character-model-in-chord.md`, `docs/architecture/adrs/adr-318-normative-character-layer.md` - repointed `docs/work/adr-310/` → `docs/work/archive/adr-310/`.
- `docs/roadmap/roadmap-002.md`, `website/src/lib/roadmap-data.json` - same repoint.

**Session lifecycle** (2 files):
- `docs/context/project-profile.md` - refreshed by `dev-context-detector` (character arc now dominant domain; platform 5.0.1 / Chord 3.0.0).
- `docs/context/.current-plan` - deleted (pointer released on plan closure).

**Author-recorded artifact** (1 file):
- `stories/thealderman/chord/thealderman.tests.json` - David's app-recorded character assertion from the live verification run (s→south edit, removed skipped ask-viola card, added the recorded `character` channel claim).

**ADR-320 batch — second half** (new/changed, 5 items):
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` - new; authored, interviewed (D4–D13), reviewed (17/17), ACCEPTED.
- `docs/architecture/adrs/adr-142-conversation-system.md` - Status stamped SUPERSEDED by ADR-320 (Q10).
- `docs/work/adr-320-conversation/prior-art.md` - new; merged prior-art reference (April survey + Aug 14 pass 1).
- `docs/work/npc-agency-conversation-research/` → moved to `docs/work/archive/npc-agency-conversation-research/` - research plan marked ABANDONED and archived per David's redirect.
- `docs/context/.current-plan` - released a second time this session (after the abandoned research plan).

## Notes

**Session duration**: full session ~2026-08-16 20:56 CDT through late evening; first half (Phase 7 closure) ran ~1.5 hours to 21:31 CDT, then continued substantially into the ADR-320 research, authoring, interview, and review work covered here.

**Approach — first half**: Session-start lifecycle (recap, pre-session-audit, dev-context-detector) surfaced only recurring/deferred findings, no new blockers. Main work was closing the last exit criterion of a seven-phase plan via a live human verification pass in a freshly built Debug app, plus a mutation-audit gap closure and a small UX addition requested mid-session. Finished with an ADR-location stale-path sweep triggered by the plan archive move.

**Approach — second half**: Filed two follow-up GitHub issues from expressiveness gaps found during the thealderman port, then began conversation-system research. David redirected that research from a session-planner-driven plan to an ADR-first approach mid-stream — the in-progress research plan was abandoned rather than adapted. The resulting ADR-320 was authored, taken through a full open-questions interview (10 questions → D4–D13), reviewed twice (13/17 then 17/17 after four findings were addressed), and accepted, all in a single continuous pass with no implementation started.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (ADR-320 batch was uncommitted as of writing this update, being staged via this finalize; the two archive moves — `docs/work/adr-310/` and `docs/work/npc-agency-conversation-research/` — are git renames, reversible)

## Dependency/Prerequisite Check

- **Prerequisites met**: fresh `devkit`/`platform-browser` dists for the Debug Chord Writer build; testing-surface bundle rebuild pipeline; `plan-archive.sh` script (used twice this session — once for the ADR-310 plan, once for the abandoned research plan); two pre-existing prior-art documents available to merge (April survey, Aug 14 pass 1) for the ADR-320 groundwork.
- **Prerequisites discovered**: none — no existing app build carried the explain-NPC-turn panel, so a fresh Debug build was required before David could verify live (not a blocker, just a precondition surfaced early in the session).

## Architectural Decisions

- ADR-310 (character-model-in-Chord) and ADR-318 (normative character layer): both Acceptance sections discharged this session per `acceptance-audit.md`; no new ADR content written for either.
- Pattern applied: capability dispatch / author-channel wire (ADR-310/318) — click-to-assert persistence exercised through the real document round trip, not a mock.
- `tsf build --npm` regression leg formally dropped as a Phase 7 gate per David's standing ruling (2026-08-16) that tsf is a version-bump tool, not a regression harness.
- **ADR-320** "Conversation and Complex Dialogue — The Other Side of NPC Agency" written, interviewed (D4–D13), reviewed (13/17 → 17/17), and **ACCEPTED** this session. Governs conversation-as-scene, manner-layer delivery, time-lapse-as-conversational-state, initiative-as-personality-trait, world-bounded agency with silence as the inalienable move, threading, multi-party floor allocation, witnessed player utterances, presentation-agnostic wire data, and the theatre-company demonstration story.
- **ADR-142** (prior conversation-system ADR) formally superseded by ADR-320; Status stamp applied.
- Research-plan-first approach for the conversation-system work was abandoned mid-session per David's explicit ruling in favor of an ADR-first approach (Key Decision 3).

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/web/testing-surface/src/cards.ts` (rendering only, no state mutation — see Key Decision 2), `tools/ide/web/testing-surface/tests/model.test.ts` (test file, not source).
- Second half: no source files with state-changing logic were modified — the ADR-320 work was documentation/decision-record authoring only (ADR text, prior-art merge, plan disposition, issue filing). N/A for mutation auditing purposes.
- Tests verify actual state mutations (not just events): YES (evidence: testing-surface suite "8 passed 76 passed" at 2026-08-17T02:03:20Z, and re-confirmed "76 passed" at 2026-08-17T02:24:18Z after the cards.ts/surface.css edits — both timestamps post-date the edits they cover). The new test asserts on the deserialized document's persisted channel claim fragments, not on return values or events alone.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — the 23 stranded event logs, two stale plans, and 4-way ADR-location split are the same recurring findings `pre-session-audit` has flagged across prior sessions (per this session's audit output); no new pattern introduced. Unchanged across both halves of this session.
- If YES: Consider the deliberate disposition pass on those three items that has been deferred across multiple sessions — not undertaken this session.

## Test Coverage Delta

- Tests added: 1 (`model.test.ts` — click-to-assert round-trip persistence, ADR-318 D11). None added in the second half — ADR-320 work was documentation-only, no code changed.
- Tests passing before: 75 → after: 76 (evidence: event log rows at 2026-08-17T02:03:20Z and 02:24:18Z, both post-dating the relevant edits).
- Known untested areas: none newly identified this session. ADR-320's implementation (not started) will need its own test derivation once the TS contracts are written.

---

**Progressive update**: Session completed 2026-08-16, second-half continuation covering GitHub issues #268/#269, the abandoned conversation-research plan, the merged prior-art reference, and ADR-320 (authored, interviewed D4–D13, reviewed 17/17, ACCEPTED). First half committed under a457902d; this update extends the summary to cover the remainder of the session ahead of the current commit.
