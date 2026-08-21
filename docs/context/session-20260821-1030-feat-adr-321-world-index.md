# Session Summary: 2026-08-21 - feat/adr-321-world-index (2026-08-21 02:23 CDT)

## Goals
- Scope and stand up a long-term effort to port *The Secret Letter* (Textfyre, 2009) to Chord.
- Land its reference corpus under a hard pre-staging name gate.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — retarget-port *Jack Toresal and The Secret Letter* into a native Chord story at `branch-stories/secret-letter/`; ten ACCEPTED proposal items (P-1..P-10).
- **Phase executed**: Phase 1 — "Land the reference corpus with the pre-staging name gate" (Large)
- **Tool calls used**: 100 / 400
- **Phase outcome**: Completed under budget

## Completed

### Session grounding and framing
- Pre-session audit run and relayed verbatim: `dist/cli/sharpee.js` ~2 days stale (built 2026-08-18 22:50 vs. `packages/` commits through `e0fabe1b` on 2026-08-20); 16 stranded DevArch event logs in `docs/context/`; ADRs split across 4 directories, normalization offered and unanswered.
- David: recent ADR work was "monkeying around," Chord is stable, the last build "a bit of a mess" — reframed the session around scoping a Secret Letter port as a long-term endeavor in `branch-stories/`.
- Verified `define conversation` is real, not aspirational: Chord parser/IR/analyzer in `packages/chord/src`, thread runtime at `packages/character/src/conversation/`, load-through test `packages/story-loader/tests/adr-320-phase10-threads.test.ts`.
- Located `~/repos/SecretLetter2026` — an OpenSilver/.NET re-host of the 2009 Glulx build, live at secretletter.plover.net, holding only compiled `.ulx` files, no I7 source. A Chord port is the third incarnation.

### Proposal and plan
- Wrote `docs/proposals/secret-letter-port.md` via `/devarch:proposal` — P-1 through P-10.
- Ran `/devarch:proposal-review`: 2 CONTRADICTION, 1 DECISION-IN-DISGUISE, 2 DUPLICATE/OVERLAP, 3 TENSION. Headline contradiction: ADR-322 D13 names Secret Letter as the state-space sweep's validation corpus precisely because of the original's deliberate linear spine and non-IF middle-school invariant — exactly what a retarget removes — and D13 never states how I7 source reaches a sweep that reads only Chord IR. David ruled the port a separate effort from ADR-322, dissolving both blockers. All ten items ACCEPTED.
- Ran `session-planner`: `docs/work/secret-letter-port/plan.md`, 8 phases; `.current-plan` pointer set (no supersession — pointer was previously absent).
- Ran `/devarch:plan-review`: 2 CONTRADICTION + 4 TENSION. Blocking findings: (a) Phase 1's gate as originally drafted enforced only one of the two standing person-level name constraints, and (b) Phase 4 closed P-4 before its "Done when" could be true. Both fixed, plus all four advisories; the Phase 1 tightening was propagated back into the proposal's P-1 "Done when" so plan and proposal can't drift.

### Phase 1 executed — reference corpus landed (P-1)
- Shallow-cloned `ChicagoDave/textfyre` (~800 MB, the whole company archive) to scratchpad, scoped to the Secret Letter subset.
- **Two-name gate run before any staging**, per the plan-review fix. The dead name was present in both `story.ni` variants — a changelog line and a runtime credits line the shipped 2009 game printed to players — plus two extension files and an I7 author *directory* name (Inform turns author names into paths). This vindicates plan-review finding (a): the original single-name gate would have committed a dead name.
- The excluded programmer: 122 occurrences in each `story.ni` variant, 2 in each of 14 Detail Design documents, 2 inside `msproject/SecretLetter.xls`.
- A probe beyond the literal gate caught the excluded person's initials used as a code-comment signature (2 occurrences) — invisible to a name-level pass.
- Forced constraint discovered: a name embedded in a legacy `.doc`/`.xls` binary cannot be substituted or verified, so those files could not land in binary form at all. `design/` holds converted text instead (which also dropped ~32 MB of near-identical revisions). This is a reusable rule for any future binary-bearing corpus, not a one-off preference.
- David's scope calls: `games/shadow` dropped (a different game; he located the correct source elsewhere); the full I7 Extensions library kept whole for later Inform reading.
- Landed at `docs/references/textfyre/secretletter/` with a `README.md` recording both divergences; `docs/references/README.md` index updated. File count and size independently re-checked this session: `find ... -type f | wc -l` = 86, `du -sh` = 8.5M (2026-08-21, after the last edit to the corpus — fresh). Both gated names verified zero repository-wide before staging per the corpus README's own recorded verification (content and paths, text and binary-converted) — cited here as evidence rather than reproduced, per the standing name-exclusion constraint.
- Incidental: `story.ni` is 12,636 lines, confirming ADR-322's 12,635 figure (a P-2 data point).

### Rule 18a applied
- P-1 flipped PLANNED -> DONE in `docs/proposals/secret-letter-port.md`.
- Plan Phase 1 marked DONE (2026-08-21); Phase 2 advanced to CURRENT (since 2026-08-21). Plan Status remains ACTIVE (more non-terminal phases remain).

## Key Decisions

### 1. Reference corpus lands in-repo under a hard pre-staging gate
`docs/references/textfyre/secretletter/` mirrors the relationship `docs/references/dungeon-81/` has to Dungeo. Making the excluded-name substitution a gate run *before* staging (rather than a cleanup pass after) is what caught the dead name and the initials signature.

### 2. Retarget, not faithful port
David documents story changes separately; that document (P-4) is the port's content authority for anything structural. A chapter it doesn't cover is not ported.

### 3. Binary source documents cannot pass a name gate
Legacy `.doc`/`.xls` files carrying a gated name cannot be substituted or verified in binary form, so a corpus subject to the gate lands as converted text instead. This is a forced consequence of the gate, not a formatting preference, and applies to any future corpus under the same constraint.

### 4. The port is a separate effort from ADR-322
It is not D13's validation corpus and carries neither AC-10 nor AC-11 (David, 2026-08-21). This dissolved both proposal-review blockers; ADR-322 D13's corpus premise is now unbacked and needs its own amendment, tracked as an open item below rather than folded into this plan.

## Next Phase
- **Phase 2**: "Measure the world and stage the playtest transcripts" (P-2, P-3) — write an I7-source-derived inventory (rooms, objects, NPCs, scenes, chapters, puzzles, chapter map) confirming or correcting ADR-322's three figures by name, and convert the five playtest transcripts to readable reference form.
- **Tier**: Medium (250 tool-call budget)
- **Entry state**: Phase 1's corpus and clean playtest transcripts already landed under `docs/references/textfyre/secretletter/`.

## Open Items

### Short Term
- Stale CLI bundle: run `./repokit build dungeo` before any transcript-test phase (Phase 5 onward).
- ADR directory normalization: audit asked, David has not answered.

### Long Term
- ADR-322 D13's corpus premise is now unbacked and needs an amendment on its own track — it named Secret Letter as the state-space sweep's validation corpus for reasons the retarget removes, and never specified how I7 source would reach a Chord-IR-only sweep.
- 16 stranded DevArch event logs in `docs/context/` — needs the SessionEnd archival hook to run or a manual prune.
- Plan Phases 7 and 8 are declared multi-session by design (per the plan's own notes) and will report as stale CURRENT phases every session going forward — not a finding to re-diagnose.

## Files Modified

**New** (4):
- `docs/proposals/secret-letter-port.md` - P-1..P-10, all ACCEPTED; P-1 now DONE.
- `docs/work/secret-letter-port/plan.md` - 8-phase plan; Phase 1 DONE, Phase 2 CURRENT.
- `docs/context/.current-plan` - points at the new plan (pointer was previously unset).
- `docs/references/textfyre/secretletter/` - reference corpus, 86 files / 8.5 MB, with README.

**Modified** (1):
- `docs/references/README.md` - index row for the new corpus.

## Notes

**Session duration**: ~2 hours (02:23-04:38 CDT).

**Approach**: Facilitated intake (`/devarch:proposal`) followed by adversarial review (`proposal-review`, `plan-review`) before any corpus file touched disk, then a literal pre-staging grep gate executed and independently re-verified rather than assumed clean.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (plan continues at Phase 2; this session's scope is closed)
- **Rollback Safety**: safe to revert — all changes are new/additive docs and reference material, one single-line index addition to an existing file.

## Dependency/Prerequisite Check

- **Prerequisites met**: `ChicagoDave/textfyre` archive reachable for shallow clone; `~/repos/SecretLetter2026` available to confirm no I7 source exists there; `define conversation` primitives confirmed real in `packages/chord/src` and `packages/character/src/conversation/` before the proposal cited them.
- **Prerequisites discovered**: David's Chapter-1 change document (P-4) does not yet exist — it gates Phase 4 and is external input, not produced by this plan.

## Architectural Decisions

- No ADR written or amended this session.
- ADR-322 D13's corpus-premise gap identified but deliberately not resolved here — flagged as a separate future amendment (see Open Items), per David's ruling that this port does not serve D13.
- Pattern applied: two-name pre-staging gate before any corpus commit, generalized as a reusable rule for binary source documents (Key Decision 3).

## Mutation Audit

- Files with state-changing logic modified: none — this session is documentation, reference-corpus staging, and planning only; no application source files were touched.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — no blocker was hit this session, and the name-gate discipline is a first application of the pattern to this corpus, not a repeat of a prior incident.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A -> after: N/A — no tests run or modified this session (event log for 7d2ec9 shows agent-completion rows only, no test/build events).
- Known untested areas: N/A — no code shipped this session. The stale `dist/cli/sharpee.js` bundle remains an open item for Phase 5 onward, when transcript tests first run against `branch-stories/secret-letter/`.

---

**Progressive update**: Session completed 2026-08-21 04:44 CDT
