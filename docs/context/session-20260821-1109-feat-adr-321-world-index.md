# Session Summary: 2026-08-21 11:09 CDT - feat/adr-321-world-index

## Goals
- Capture David's stated vision for the Secret Letter remake into a durable document.
- Create a scale watch list for the port, at David's request, after he flagged it as the largest Chord implementation to date.
- File four Chord Writer feature requests David described in conversation.
- Fold the vision's consequences into the existing plan.

## Phase Context
- **Plan**: Port *Jack Toresal and The Secret Letter* (Textfyre, 2009) to Chord — `docs/work/secret-letter-port/plan.md`.
- **Phase executed**: None completed. Phase 4 — "Confirm the content-authority gate (P-4)" (Tier: Small, budget 60) was CURRENT at session start and remains CURRENT, still blocked on external input (David's change document, not yet authored).
- **Tool calls used**: 90 / 60 (Phase 4's own budget — but no phase work against Phase 4 occurred; the session's actual work was documentation and plan restructuring, not tracked against a single phase budget).
- **Phase outcome**: Not applicable — this session did not advance Phase 4 or any other phase. It produced supporting documents (watch-list.md, vision.md) and restructured the plan itself (8 phases → 11) in response to vision.md's consequences. No P-n proposal item was closed.

## Completed

### 1. Scale watch list (`docs/work/secret-letter-port/watch-list.md`, new, 166 lines)
Seven entries (W-1..W-7) on what to watch as SL becomes the platform's largest Chord story:
- **W-1 Diagnostic file attribution — verified broken.** Read `packages/chord/src/index.ts:112` (`resolveImports`): only PARSE-stage fragment diagnostics get the `[<name>.chord]` prefix. After splicing (ADR-251 D4), spliced declarations carry fragment-relative spans, and `Span` (`packages/chord/src/span.ts:12`) has no file field, so analyzer diagnostics in an imported fragment report a fragment-relative line with no file identity. Flagged as a platform change needing discussion and likely an ADR-251 D6 amendment — explicitly not to be fixed during the port.
- **W-2** `import` has compiler coverage (`packages/chord/tests/import.test.ts`, 6 tests) and zero author coverage — `find stories branch-stories -name '*.chord'` returns nothing; no `.story` in the repo uses `import`.
- **W-3** compile-time curve to track per chapter milestone.
- **W-4** world-index gets its first real corpus at scale, with an explicit caveat this port is NOT ADR-322's validation corpus (David's ruling) — any observations are a courtesy only.
- **W-5** flat-only imports (ADR-251 D5) against 84 rooms.
- **W-6** phrasebook arbitration by spliced position — a silent failure mode with no diagnostic.
- **W-7** conversation scale at 23 trees / 380 quips.
Measured baseline: largest existing Chord story is `branch-stories/fernhill/fernhill.story` at 1,155 lines (thealderman 938, ides-of-march 921, zoo 793); SL is estimated at 4,000-8,000 Chord lines (~5x fernhill) — the doc flags this as an estimate pending a measured per-chapter rate.

### 2. Four Chord Writer feature requests filed on GitHub
Filed via `gh issue create`, all labeled `enhancement`: **#281** (click a phrase name to edit its test inline/modal), **#282** (hover a phrase name to preview its definition), **#283** (hold a modifier to reveal phrase names as their text, release to revert), **#284** (a ninth right-panel tab, "Read," showing a live read model of the source). Cross-linked with a comment on #281 naming all three as one seam, and a comment on #283 noting #284 may be the better answer and explaining why #283 was left open rather than closed. Grounding checked before filing: no click-a-symbol affordance exists in the source editor today (`MainWindow.swift`'s only `NSClickGestureRecognizer` is at line 1820, on a pill); the right panel already registers eight tabs (`RightPanelViewController.swift:87-94`), so #284 adds a ninth sibling, not new architecture. Recorded design obstacle across #282/#283/#284: a `define phrase` may carry multiple `or` variants under a strategy (`randomly`/`cycling`/`stopping`/`sticky`/`first-time`), an optional `while` gate, and phrasebook arbitration by spliced position (`packages/chord/chord.ebnf:424`) — so "the definition" of a phrase is often not one thing.

### 3. Vision capture (`docs/work/secret-letter-port/vision.md`, new, 297 lines)
David gave his vision for the remake across roughly 10 conversational turns; this document captures it — it is explicitly NOT the Phase 4 change document, which remains David's to write, and Phase 4 stays gated on that separate artifact. Convention used: unmarked = David's vision, `[source]` = a finding from the 2009 `story.ni` with line number, `[open]` = unresolved.

Vision recorded (David's, not Claude's invention):
- Jack is a transgender girl; the 2009 disguised-girl premise is retargeted, not replaced.
- A new coda after the rescue: a Vedd prayer circle in which Jack is physically transformed into her real body.
- The 2009 ending's "capture" was actually a rescue, per unwritten sequel plans David and Michael Gentry laid out.
- World rules: gender identity in Miradania is spiritual, carrying no negative connotation, but gender is still a real social construct people react to; a "talent" for seeing past the physical runs through random people, not bloodlines; people with the talent see Jack as Jacq.
- Maiden House rewrite: the maidens see Jack as a boy except Shannon, who has the sight; Theresa and Fiona lack it and are mostly dismissive of children generally.
- Structural redesign: Grubber's Market "always just worked" (open, pressured) while the rest of the game puts the player on rails; the market model becomes the template for the whole game, with a push/quiet/push/Maiden-House/push/pull/pull/push-pull-quiet pacing spine.
- Fidelity license: "literally no one bought SL and few played it — we're safe" — no fan-expectation constraint; the source is a quarry, not a specification.
- Open TODO: the endgame fight scene is "A MESS," David does not know how to fix it, and may have Gentry's notes to dig for.

Source findings surfaced during the dialogue and recorded with line numbers (the session's main analytical contribution — the 2009 source repeatedly already supports the vision without invention): Jack's existing interiority already writes a girl performing boyhood (`story.ni:1408`, `3025`, `1469`); the Vedd appear exactly once in 12,635 lines, in the sequel-title line (`story.ni:12224`); an existing Library with unreadable bookshelves (`9367`, plot-wired at `1278`); Jack's body already modeled as an object with a deflecting description (`1436-1444`); an existing become-Jacqueline mirror scene staged by Shannon after a bath (`10574`, `5119`, `5053`); Teisha "guessed it the very first time," "you look... almost royal" (`3110`); Dame Sandler's "for some reason" affinity (`5236`); Bobby's fear that being known "would certainly stop inviting you along on his exploits" (`5652`) — the social-construct mechanic already on the page as a fear, not an actuality; Shannon uniquely says "Miss Jacqueline" (`SH1`, `SH7`, `SH13`) against Theresa's bare-name sneer (`5860`) and Fiona's maternal use (`6170`, `6188`); Fiona holds the political secret as tutor (`FI20`, `FI28`, `9733`) while Shannon holds the sight; the market's pressure is a mobile pursuer with states oblivious→approaching→grabbing→nearby (`1875-1878`, `1563-1564`, `1728-1729`); the rails show in the game's own 17-scene hint chain (`1065-1087`) and 155 movement-intercepting rules; the endgame runs off a hand-patched script list `{FOSS0, FOSS1, FOSS2, FOSS5, FOSS6, ...}` with FOSS3/FOSS4 absent (`11911`), the Skirmish boundary defined as a position inside that list (`12076`) with two force-empty escape hatches (`12090`, `12199`).

Two `[open]` items were resolved mid-session by David (Shannon has the sight; the dress scene stands and is strengthened by it). Remaining open: the Vedd foreshadow mechanism, what supplies pressure outside a chase, the endgame fight solution, and whether the Gentry sequel notes exist in readable form (asked, unanswered).

### 4. Plan restructured (`docs/work/secret-letter-port/plan.md`, modified)
Ran `session-planner` to fold vision.md §8's consequences in. Result: 11 phases, up from 8; Phases 1-4 preserved character-for-character. New phases added: Phase 5 (decide the Vedd foreshadow, PENDING), Phase 9 (design a fix for the endgame fight, blocked on Gentry's notes, structured like Phase 4, PENDING), Phase 11 (author the coda, PENDING). Old Phase 8 became Phase 10, reworded from "port the remaining chapters and world" to name three folded kinds of work — ported material, the Maiden House rewrite, and the structural redesign. Per-NPC perception folded into Phases 7 and 8 as a standing rule across 23 trees / 380 quips. Both previously-protected gaps survived the restructure: P-10's uncovered release terms (browser build, hosting, landing page, IFID, announcement have no phase) and the unrun P-8 per-room-text spike (now carried into Phase 6). Two pointer lines were added to plan.md's header referencing watch-list.md and vision.md.

## Key Decisions

### 1. vision.md is a capture, not the P-4 authority document
David's stated vision is recorded verbatim/attributed in vision.md, but Phase 4 remains explicitly gated on a separate change document David has not yet authored. This distinction is stated in both vision.md's own preamble and in plan.md's pointer line, to prevent a future session from treating the capture as satisfying the gate.

### 2. This port is not ADR-322's validation corpus
Restated in watch-list.md per David's earlier ruling (recorded in a prior session): observations about world-index scale from this port are a courtesy note only, never evidence for or against ADR-322 D13.

## Next Phase
- **Phase 4**: "Confirm the content-authority gate (P-4)" — still CURRENT, still blocked on David authoring the change document (external input, not produced by this or any plan work).
- **Tier**: Small (60 tool-call budget).
- **Entry state**: Unchanged from before this session — David has not yet produced the change document. Nothing in Phases 5-11 that depends on chapter authorization can proceed until it exists.

## Open Items

### Short Term
- David's answer is still awaited on the planner's flagged judgment call: whether the Maiden House rewrite deserved its own phase rather than being folded into Phases 8 and 10.
- `/devarch:plan-review` was recommended by the planner's handoff and has not been run against the restructured plan.
- `dist/cli/sharpee.js` remains stale (built 2026-08-18); not rebuilt this session; still an open item for Phase 6 onward.

### Long Term
- Phase 5's Vedd-foreshadow decision, Phase 9's endgame-fight design (blocked on possibly-nonexistent Gentry notes), and Phase 11's coda authoring are all new PENDING phases with no committed timeline.
- W-1 (diagnostic file attribution) is a verified platform defect flagged for discussion, not scheduled.

## Files Modified

**New** (2 files):
- `docs/work/secret-letter-port/watch-list.md` - scale watch list, 7 entries (W-1..W-7), 166 lines
- `docs/work/secret-letter-port/vision.md` - capture of David's remake vision plus source findings, 297 lines

**Modified** (1 file):
- `docs/work/secret-letter-port/plan.md` - restructured 8 phases to 11, folding vision.md's consequences

**Not files**: GitHub issues #281, #282, #283, #284 and three cross-linking issue comments.

## Notes

**Session duration**: not tracked precisely; session state records start at 2026-08-21 11:09 CDT.

**Approach**: Conversational capture (vision.md) cross-checked against the 2009 source rather than invented; scale analysis grounded in measured line counts rather than guesses; plan restructuring delegated to `session-planner` per DEVARCH rule 5, with its judgment call relayed to David rather than resolved silently.

**Gap**: the state file's `files` array lists only `plan.md` — this session's shell-heredoc writes of watch-list.md and vision.md were not hook-tracked. This summary's file list was assembled from the task brief and verified against the filesystem (`wc -l` on all three files), not from the state file.

---

## Session Metadata

- **Status**: COMPLETE — for this session's own scope (watch-list.md, vision.md, four GitHub issues, plan restructure). Phase 4 of the plan remains blocked on David's change document; that is an entry-state condition carried forward, not an incompleteness of this session.
- **Blocker** (if any): N/A — no blocker was hit in this session's own work. Phase 4's external-input block predates this session and is unchanged by it.
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (session COMPLETE)
- **Rollback Safety**: safe to revert — no code, no commits made this session as of writing.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1-3 corpus and decisions (already DONE prior to this session) supplied the source line numbers and figures vision.md cites.
- **Prerequisites discovered**: None new. Phase 4's dependency on David's change document was already known; this session did not discover a new prerequisite.

## Architectural Decisions

- None this session. No ADR was written, modified, or applied. W-1's diagnostic-attribution finding is flagged as *needing* a future ADR-251 D6 amendment but no ADR work was done here.

## Mutation Audit

- N/A — no code was written or modified this session; all output was documentation (watch-list.md, vision.md, plan.md) and GitHub issues.

## Recurrence Check

- YES — `docs/context/session-20260821-0443-feat-adr-321-world-index.md` (the prior session) records: "the session-start gate file (`.devarch-gate-dd5d48`) was still present when this summary was written, despite the session-start steps... having clearly already run earlier in the session." This session's gate file, `.devarch-gate-efe8a2`, exhibited the identical problem and had to be cleared mid-task by the session-planner agent. That is two consecutive sessions with the same gate-lingering defect.
- Consider a one-time audit of the SessionStart gate-clear step (DEVARCH rule 4a) to find why the gate file is not being removed at the point the rule specifies.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A (no test run this session)
- Known untested areas: No test changes this session. The stale `dist/cli/sharpee.js` bundle (built 2026-08-18) was not rebuilt.

---

**Progressive update**: Session completed 2026-08-21 (time not separately tracked)
