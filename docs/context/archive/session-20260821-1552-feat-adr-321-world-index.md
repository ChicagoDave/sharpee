# Session Summary: 2026-08-21 - feat/adr-321-world-index

## Goals
- Dispose of the orphaned `branch-stories/tree-npm-fixture/` delete list (David's authorization, pending from a prior session).
- Advance Secret Letter port Phase 5 (Vedd foreshadow) and capture David's direction on its mechanism.
- Resolve whether Claude writes prose for the port.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Port *Jack Toresal and The Secret Letter* (Textfyre, 2009) to Chord, 11 phases.
- **Phase executed**: Phase 4 — "Confirm the content-authority gate (P-4)" (Small, budget 60) stayed CURRENT all session; Phase 5 — "Decide the Vedd foreshadow (vision.md §2)" (Small) was completed and closed to DONE.
- **Tool calls used**: 105 / 60 (state file `toolCalls: 105`, task narrative logged 102+ — both are the same overrun).
- **Phase outcome**: Ran over budget. Phase 4 itself did not advance (still blocked on David's change document); the overrun bought direction-setting and decision capture (Phase 5 closure, the content-authority reversal, and the deletion cleanup), not Phase 4 execution.

## Completed

### Orphaned branch deleted (`branch-stories/tree-npm-fixture/`)
- Deleted at David's explicit authorization, the delete list having been posted in a prior session and awaited his decision.
- Verified first: not a pnpm workspace member, 0 `.tests.json` files (branch-tester cannot run it), referenced only by 4 docs (1 session summary + 3 plans — two SUPERSEDED, one COMPLETE with all five phases of `docs/work/ide-testing-wire/plan-20260806-run-event-spine.md` done, so citations are historical evidence, not live dependencies).
- `git rm -r` of 6 tracked files plus `rm -rf` of untracked `dist/`.
- Verification: `pnpm --filter '@sharpee/branch-tester' test` — build passed (event-log row `2026-08-21T20:55:54Z`, timestamped after the `git rm` at `20:55:46Z`); reported result 87 passing, 0 failures, 6 files [reported by session, unverified — the event log records pass/fail status, not the numeric breakdown].

### Phase 5 — Vedd foreshadow, DECIDED and closed DONE
- David chose the seeded branch, refined twice in-session: first captured as per-character content beats ("every character has some offhand wavy spiritual thing about the Vedd"), then corrected to an **idiom layer** — Vedd idioms woven through the whole population's speech, modeled on *The Shadow in the Cathedral*'s machinery sayings.
- Starting set: Teisha, Widow Shannon, Bobby, Dame Sandler — 95 of the source's 380 quips.
- David supplied Vedd theology: the essence of truth, peeling away life's layers to reveal true nature; mysterious, well respected, believed lost for centuries. Recorded as the remake's own premise (Jack's true nature under a surface; §3c's talent as seeing past the physical; the coda as the literal peeling-away) — upgrading the idiom layer from flavor to foreshadowing carried in diction.
- David ruled the world's properties **axiomatic**: no Vedd origin story, cosmology, history, doctrine, or lore document — dissolving (not answering) the open question of whether the talent is a Vedd remnant, and generalizing the existing no-magic-system ruling to foreclose exposition too. Two derived constraints: no character explains; the coda does not justify itself.
- Recorded in `docs/work/secret-letter-port/vision.md` §2, which now carries the full Vedd treatment; `plan.md` Phase 5 status line carries the whole decision trail.

### Shadow in the Cathedral staged as reference-only source
- David staged `docs/references/textfyre/shadow/source/story.ni` (22,301 lines, 1.3 MB); first copy was 0 bytes, he re-saved.
- Applied the corpus two-name gate from `../secretletter/README.md`: 62 occurrences of the excluded Textfyre programmer's name (identical "G. <name>" changelog form; confirmed no in-game character shares it) replaced with the Voldemort form; 1 dead-name occurrence in the FyreVM credit at `story.ni:106` corrected to Tara McGrew.
- Verified 0 repository-wide hits for both names afterward; line count unchanged at 22,301.
- Wrote `docs/references/textfyre/shadow/README.md` recording provenance and the gate application.

### Idiom technique verified against the source
- `vision.md` §2 now cites line numbers: idiom substitution is the trick (`story.ni:750`, "I know all the hymns by gear"); it lives in narration and response text, not only NPC dialogue (750 is a response message), widening the port technique to Toresal's 1,192 response rules alongside its 380 quips; clockwork is the state religion, not the local industry (`story.ni:3108`, "sanctified by the clockwork") — the exact structural parallel to the Vedd.
- Calibration correction recorded: machinery vocabulary is dense (machine 286, brass 198, gear 170 occurrences) but nearly all literal — genuine idiom substitutions are only a handful across 22,301 lines, so the technique is seasoning, not saturation.

### Success condition and sequel note recorded
- David's stated success condition: "it would be awesome if people did play this version and there was a call for a Vedd backstory." Recorded as intent, not a work item.
- Noted the 2009 game's closing line already names the sequel *The Miradania Chronicles, Part 2: Jacqueline Toresal and the Trials of the Vedd* (`story.ni:12224`) — such a call would be demand for the Part 2 that was never written.

### Content-authority reversal (P-4)
- David raised the reception problem himself: this is a public release (P-10), and a credit line reading "additional content produced by Claude in Michael Gentry's voice (by permission)" would read as a machine wearing a living author's style.
- Ruled: "you're the guide and I will provide content." Claude now writes no prose for this port — role is structural (Chord conversion, analysis, measurement).
- Operative line recorded explicitly: carrying Gentry's existing sentences forward into beats is conversion, in scope; generating new sentences in his style is authoring, out of scope.
- Withdrawn in 4 places: `plan.md` Phase 4/5 status text, `docs/proposals/secret-letter-port.md` P-4, `vision.md`, and Claude's persistent memory (`feedback_secret_letter_content_authority.md` rewritten, `MEMORY.md` index line updated).

### Remaining-prose measurement (sizing the withdrawal's cost)
- Against `docs/references/textfyre/secretletter/source/story.ni`: 380 quip declarations (333 plain + 47 transitional, reconciling with `INVENTORY.md:209`); 317 quips carry display text; 20,573 words of Gentry display-text prose (~82 pages at 250 w/p), which carries forward structurally rather than being rewritten; 37 quips name "Jacqueline" (the per-NPC perception rewrite surface); 55 Maiden House quips.
- Conclusion recorded in `vision.md` §6: new writing is bounded (Vedd idioms, coda, 37 perception-touched quips, whatever the change document adds), so the withdrawal is cheap.

## Key Decisions

### 1. Vedd is an idiom layer in diction, not per-character content beats
Corrects the session's own first capture. Density follows *Shadow*'s model: a handful of true substitutions, not saturation. Ripples into Phases 7/8 (dialogue rewrite) rather than room text, and pulls Chapter 1 (Phase 6) into scope for the register.

### 2. World properties are axiomatic — no Vedd exposition, ever
Forecloses an entire category of future work (lore docs, origin ADRs, cosmology) before it could be proposed. Prevents the coda (Phase 11) from being authored as a system that justifies itself.

### 3. Gentry's-voice prose clearance withdrawn
The single largest scope change of the session. Reverses the 2026-08-21 clearance one day after it was granted; restores consistency with David's standing GenAI-out-of-real-works default. Claude's role for the remainder of this plan is structural only — conversion, not authoring.

## Next Phase
- **Phase 4** (current) remains blocked on external input — David's change document is not produced by this plan — so no phase advances past it. Phase 5's closure does not release Phase 4; Phases 6, 8, and 10 each still need the change document's section-by-section authorization before they can start.
- **Phase 6**: "Chapter 1 vertical slice in `branch-stories/secret-letter/` (P-5)" (Large) is the next PENDING phase once Phase 4 clears — entry state now includes carrying the Vedd idiom register into Chapter 1's dialogue, per Phase 5's ripple note.
- **Tier**: Large.

## Open Items

### Short Term
- Phase 4 still blocked on David's change document (external input).
- 7 stranded `.devarch-events-*.jsonl` logs in `docs/context/` — `prune-devarch-runtime.sh` not run this session.
- `CLAUDE.md` shows modified in the working tree but was NOT edited by this session — flagging, not claiming.

### Long Term
- `vision.md` §7's open question (whether Michael Gentry's endgame-fight notes exist in readable form, Phase 9) — its value rose this session now that Claude cannot author a replacement scene itself; resolving it earlier now matters more.

## Files Modified

**Plan/proposal/vision** (3 files):
- `docs/work/secret-letter-port/vision.md` - Vedd treatment expanded in §2; new §6 authorship-split subsection added
- `docs/work/secret-letter-port/plan.md` - Phase 5 marked DONE with full decision trail; Phase 4 content-authority text updated; Phases 6, 8, 10, 11 entry states folded through
- `docs/proposals/secret-letter-port.md` - P-4 clearance text rewritten to record the withdrawal

**Reference corpus** (new, untracked):
- `docs/references/textfyre/shadow/source/story.ni` - Staged, gated (2 names corrected)
- `docs/references/textfyre/shadow/README.md` - New, provenance and gate record

**Cleanup** (6 files deleted):
- `branch-stories/tree-npm-fixture/package.json`, `tsconfig.json`, `src/index.ts`, `tests/transcripts/{gallery,lamp,spine}.transcript` - Orphaned fixture removed at David's authorization

**Outside repo**:
- Claude persistent memory: `feedback_secret_letter_content_authority.md` rewritten, `MEMORY.md` index line updated

**Not this session** (flagged, not claimed):
- `CLAUDE.md` shows as modified in the working tree; this session did not touch it.

## Notes

**Session duration**: ~13 hours (2026-08-21 15:52 CDT through past midnight into 2026-08-22).

**Approach**: Direction-setting and decision capture with David in conversation — no code, no Chord authoring. Two verification passes grounded the decisions against source material rather than taking them on description alone: the corpus two-name gate was re-run against the newly staged *Shadow* source, and the idiom technique was checked against `story.ni` line citations before being generalized into the port's approach.

---

## Session Metadata

- **Status**: COMPLETE — the writer's one unverified claim was re-run at finalize and reproduced exactly: `pnpm --filter '@sharpee/branch-tester' test` -> **Test Files 6 passed (6), Tests 87 passed (87)**, 0 failures (re-run 2026-08-22 00:54 CDT, after the tree-npm-fixture deletion).
- **Blocker** (if any): N/A — Phase 4's block on David's change document is a carried-forward, pre-existing blocker, not one newly hit this session.
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Status is COMPLETE; Phase 4 remains externally blocked, not incomplete work)
- **Rollback Safety**: safe to revert — no packages/ or platform code touched; all changes are docs, plan/proposal text, a deleted orphaned fixture, and a new reference-corpus directory.

## Dependency/Prerequisite Check

- **Prerequisites met**: David's explicit delete authorization for `branch-stories/tree-npm-fixture/` (posted prior session); David's Vedd theology and mechanism direction; David's staged *Shadow* source file.
- **Prerequisites discovered**: None — Phase 4's blocking prerequisite (the change document) was already known, not newly discovered.

## Architectural Decisions

- None this session — no ADR was written or amended. The content-authority reversal is a proposal/plan-level decision (P-4), not a platform ADR.

## Mutation Audit

N/A — session was documentation, decision-capture, and a single file-deletion cleanup; no side-effect source code was written or modified.

## Recurrence Check

- Similar to past issue? NO — the content-authority withdrawal is a first occurrence for this port; no prior session recorded a Gentry-voice clearance being granted and then reversed.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: not measured this session → after: 87 passing, 0 failures, 6 files [reported by session, unverified] (evidence: event-log `Build passed` row at `2026-08-21T20:55:54Z`, timestamped after the `git rm` at `20:55:46Z` — status only, not the numeric breakdown)
- Known untested areas: N/A — no code changed this session.

---

**Progressive update**: Session completed 2026-08-22 00:00 (past midnight, session started 2026-08-21 15:52 CDT)
