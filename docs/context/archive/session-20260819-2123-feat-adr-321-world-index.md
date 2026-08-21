# Session Summary: 2026-08-19 - feat/adr-321-world-index

## Goals
- Continue ADR-321 Amendment 1 (Phase 8): complete D12 (mention roles) and D11 (IDE POS re-heading, ungated chunking) on top of D10/D14, already done in a prior session.
- Side task: write three reference diagrams (turn output ordering, traits/composition, an action applying to two things) to `docs/work/diagrams/text-logic.md`.

## Phase Context
- **Plan**: `docs/work/world-index/plan.md` — "Implement ADR-321 — The World Index (Map, Reach, Incomplete)"
- **Phase executed**: Phase 8 — "Amendment 1 — response prose, POS re-heading, and mention roles" (Large tier)
- **Tool calls used**: 168 (from `.session-state-51dd32.json`; the state file's `budget`/`tier`/`phaseName` fields were not populated this session — the plan records the phase's own budget as 400)
- **Phase outcome**: Partially completed. D12 and D11 are DONE this session (D10 and D14 were already done in an earlier session, per the plan's outcome bullets dated the same day but from commits before this session started). D13 (unnamed-tool finding) remains, now unblocked.

## Completed

### Roles (D12) — `packages/world-index/src/roles.ts`
- New `roleTable(ir, reach)` and `deriveRoles(ir, reach, edges)`; `isPortableByDefault` added to `loader-semantics.ts`; `IncompleteResult` gains `edges: MentionEdge[]`; wire gains a top-level `roles` table.
- Four IR facts confirmed against compiled corpus stories before writing any code (the plan's phase-entry checklist): no `takeable` row exists — portability is default-on, `scenery` withdraws it; affordances can live on the trait *declaration*, not the entity (`case-clock`/`windable`); `binding: 'every-turn'` is the non-player discriminator; `kinds` is a separate array from `traits`.
- The corpus forced one correction: places and the player can never be tools — `grounds`/`house`/`iron-gates` initially came back as tools because rooms answer `on entering`. Adding the guard moved 13 Fernhill edges from tool to atmosphere.
- Pin: Fernhill 26 tool / 7 progression-info / 43 atmosphere-info of 76 edges; The Alderman 7/0/18 of 25; Ides of March 41/0/20 of 61.
- Deliberate D11a contract change: roles are published for *every* declared entity, not just edged ones — Chord Writer's D11 chunking edges phrases the analyzer never resolved (The Alderman's six proper-named `accusable` suspects appear in no analyzer edge at all).

### POS re-heading + ungated chunking (D11) — `tools/ide/SharpeeIDE/World/WorldProseChunker.swift`
- Analyzer publishes two new wire surfaces plus a third the IDE reads: `vocabulary` (both `wordsOf` and `exactForms` tiers), `prose` (every passage once — 21 of Fernhill's 124 were previously invisible to the IDE), `filters` (the shared head filters).
- IDE: new `WorldProseChunker.swift` (NLTagger chunking, re-heading, resolution, classification); `WorldIndexDocument.swift` decodes all four surfaces; `WorldIncompleteView` renders the merged, role-ranked reading.
- Two ADR gaps resolved while implementing: ranking routes through the passage's owner, because roles cannot rank no-object candidates (they name nothing); the IDE list is a UNION with the analyzer's findings, never a replacement — required because NLTagger tags `shroud` and `well` as adverbs in real Fernhill prose, and a tagger-only reading would silently drop real findings.
- Measured, Fernhill: CLI 23/14/136 = 173 candidates → IDE 52/22/359 = 433 (+260); +54 new resolved edges naming 26 entities. Both actuals land below the ADR's predictions (+445 candidates, +98 edges), because the shipped chunker applies the published head filters the ADR's own probe didn't.
- AC-11a is satisfied in direction, not by pinned counts — deliberately, since the counts depend on Apple's NLTagger and a macOS update would otherwise read as a Sharpee regression.

### Deadlock bug — found and fixed (had shipped in Phase 6)
- David surfaced it via a crash log at `docs/context/test-error.txt`: SIGTRAP in `WorldIndexTests.analyzeReal`, 61s after launch.
- Root cause: `WorldIndexRunner` read the child's stdout inside `terminationHandler`, so once the analyzer filled the ~64KB pipe, the child blocked on the write, never exited, and the handler never ran. Invisible until now because the document's size crossed the pipe buffer: 55,460 bytes at Phase 6, 83,594 after D12, 120,193 after D11.
- Fix: drain both pipes while the child runs, the pattern `IntrospectionRunner` and `ComposeRunner` already used. Their two duplicate private `DataBuffer` copies are extracted to one shared `tools/ide/SharpeeIDE/Build/DataBuffer.swift`.
- Regression test asserts the document still EXCEEDS a pipe buffer, so the guard reports if it stops guarding.
- The test helper `analyzeReal` force-unwrapped after its wait, so a hang crashed the whole test process instead of failing one test — now unwraps.

### Side task — reference diagrams
- `docs/work/diagrams/text-logic.md`: three diagrams at 78 columns — turn output ordering (ADR-296 slot frame + ADR-300 D8/D9 channels and the default client's `composeProse` flush), traits/composition vs. inheritance in `packages/world-model`, and "an action applying to two things" (the Inform 7 comparison, traced through throwing).

## Key Decisions

### 1. Roles published for every declared entity, not just edged ones (D11a amendment)
D11a's original `deriveRoles(ir, reach, edges)` signature can't serve the IDE: under D11, Chord Writer chunks phrases the analyzer's article-gated extractor never resolved, so it would hold edges the analyzer never made and have to re-implement the role rule in Swift. Publishing the full table keeps one derivation, one answer.

### 2. IDE candidate list is a union, never a replacement
NLTagger mistags real Fernhill nouns (`shroud`, `well`) as adverbs; trusting the tagger alone would silently delete findings the analyzer already made. The union makes AC-16 (IDE list ⊇ CLI list) hold by construction rather than by argument.

### 3. Places and the player can never be tools (D12 guard)
Rooms and regions answer `on entering` the same way every player-fired affordance does, and the player is portable by default with nothing to withdraw it. Without the guard, the role split misclassified 13 Fernhill edges (`grounds`, `house`, `iron-gates`) as tools.

## Next Phase
- Phase 8 remains **CURRENT** — D13 (unnamed-tool finding) is the one remaining deliverable, now unblocked: its previously inflated count of 11 should come down now that D11 improved recall.
- Tier: Large (400 tool-call budget per the plan); 168 tool calls used this session went toward D12 and D11.
- Entry state for D13: implement last, per the plan's own ordering — it needs D14's progression chain (already done) and D11's improved recall (done this session) to make its claim ("no prose names this thing") meaningful rather than an artifact of the old article-gated extractor.
- Separately and independently: Phase 6 (IDE World tab render) is still **AWAITING CONFIRMATION** from David — it gates Phase 7's deletion of `tools/vscode-ext/src/world-explorer.ts`. Not touched this session.

## Open Items

### Short Term
- D13 (unnamed-tool finding) — the last Phase 8 deliverable.
- Phase 6 still awaiting David's hands-on render confirmation (blocks Phase 7's deletion).

### Long Term
- 16 stranded event logs in `docs/context/` — flagged by the pre-session audit, still unanswered by David.
- The ADR-location normalization prompt — flagged by the pre-session audit, still unanswered by David.
- `docs/context/test-error.txt` is David's untracked crash log that surfaced the deadlock bug this session — keep it, do not delete.

## Files Modified

**packages/world-index** (7 files):
- `src/roles.ts` — new: `roleTable`, `deriveRoles` (D12)
- `src/loader-semantics.ts` — `isPortableByDefault`
- `src/incomplete.ts` — `IncompleteResult.edges: MentionEdge[]`
- `src/document.ts` — wire gains `roles`, `vocabulary`, `prose`, `filters` surfaces
- `src/vocabulary.ts` — `exactForms` tier
- `src/index.ts` — barrel updates
- `tests/roles.test.ts` (new), `tests/vocabulary.test.ts` (new), `tests/loader-semantics.test.ts` (updated)

**tools/ide/SharpeeIDE/World** (4 files):
- `WorldProseChunker.swift` — new: NLTagger chunking, re-heading, resolution, classification
- `WorldIndexDocument.swift` — decodes the four published surfaces
- `WorldIndexRunner.swift` — deadlock fix, drains both pipes while the child runs
- `WorldIncompleteView.swift` — renders the merged, role-ranked reading

**tools/ide/SharpeeIDE/Build** (1 file):
- `DataBuffer.swift` — new: shared pipe-draining buffer, extracted from `ComposeRunner`/`IntrospectionRunner`

**tools/ide** (2 files, incidental to the bug fix):
- `Compose/ComposeRunner.swift`, `Project/IntrospectionRunner.swift` — de-duplicated onto the shared `DataBuffer`

**tools/ide/SharpeeIDETests** (1 file):
- `WorldIndexTests.swift` — regression test (document exceeds pipe buffer), `analyzeReal` unwrap fix

**Docs / plan** (3 files, 1 new):
- `docs/architecture/adrs/adr-321-world-index.md` — amended with measured D11/D12 outcomes against the ADR's own predictions
- `docs/work/world-index/plan.md` — D12/D11 outcome bullets and pins recorded
- `docs/work/diagrams/text-logic.md` — new, side task, three reference diagrams

## Notes

**Session duration**: ~1.4 hours (21:23–22:46 CDT).

**Approach**: Corpus-first. The phase-entry checklist reads compiled IR facts before writing derivation code, which is what caught the places/player-as-tools misclassification and the trait-declaration affordance case (`case-clock`) before either shipped as a bug.

**Self-inflicted error, recorded for the record**: mid-session, a `git checkout` on `packages/world-index/src/incomplete.ts`, intended to revert a mutation-test edit, instead reverted the whole D12 change because the file was tracked. Re-applied and re-verified against the mutation checks below.

**All of this session's work is uncommitted.** No commits landed in session 51dd32 — everything above is a working-tree diff on top of `ea40bdee`, the last commit, which was made in a prior session before 51dd32 started at 21:23 CDT.

**Evidence-accounting gap**: the session's event log (`.devarch-events-51dd32.jsonl`) records generic `Build passed` rows for `pnpm --filter '@sharpee/world-index' test:ci` (2026-08-19 22:10:00 CDT) and `pnpm --filter '@sharpee/devkit' test:ci` (22:12:15 CDT), but not the specific pass counts, and the world-index row predates `incomplete.ts`/`document.ts`'s final edits (22:18:01 CDT) — stale relative to D12's final state. The `xcodebuild test` run (525 passing) and `npx tsc --noEmit` have no corresponding event-log row at all. See Test Coverage Delta below for how each count is marked.

**Housekeeping**: the session-start gate file (`docs/context/.devarch-gate-51dd32`) was still present at session end — the earlier steps (previous-session recap, pre-session-audit) had run per the event log, but the gate was never explicitly cleared. Cleared it as part of closing out this summary.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Phase 8's D13 (unnamed-tool finding) not yet started. Separately, Phase 6 (World tab render) remains AWAITING CONFIRMATION from David, which gates Phase 7's deletion of `world-explorer.ts`.
- **Blocker Category**: Other: phase not finished / awaiting user confirmation
- **Estimated Remaining**: ~1 session (~1-2 hours) for D13. The Phase 6 → Phase 7 handoff is gated on David's confirmation, not estimable in engineering time.
- **Rollback Safety**: safe to revert — all of this session's work is uncommitted in the working tree; nothing was committed or pushed this session.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 6 (IDE World tab, JSON wire contract) was complete and code-reviewed before this session; D14 (progression chain) and D10 (response prose) were done in an earlier session and available as direct inputs to D12 and D11.
- **Prerequisites discovered**: none new.

## Architectural Decisions

- ADR-321 Amendment 1 (D11, D12) amended in place this session with measured-vs-predicted tables (candidates +260 vs. predicted +445; edges +54 vs. predicted +98) and the four-surface wire contract (`vocabulary`, `prose`, `filters`, `roles`). The amendment itself was accepted before this session; this session recorded outcomes against it.
- Pattern applied: "union, never replacement" for two independent derivations of the same reading (analyzer + IDE chunker) — each side real-path tested against its own corpus/subprocess, per DEVARCH rule 13a.
- Pattern applied: shared subprocess pipe-draining utility (`DataBuffer.swift`) after finding the same private implementation duplicated across two runners already — one reason to change, per DEVARCH rule 7.

## Mutation Audit

- Files with state-changing logic modified: `packages/world-index/src/roles.ts` (new derivation), `src/incomplete.ts` (`edges` field), `tools/ide/SharpeeIDE/World/WorldIndexRunner.swift` (pipe draining), `tools/ide/SharpeeIDE/Build/DataBuffer.swift` (new).
- Tests verify actual state mutations (not just events): YES [reported by session, unverified] — three mutation checks on D12 are described in the session narrative (blinding trait-declared affordances fails the case-clock test and the pin; dropping the place/player guard fails three tests; discarding resolved edges fails three tests), but the session's event log has no `mutation`-kind row corroborating them, so the specific results are testimony, not a logged run.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES, within this session's own arc — the pipe-buffer deadlock pattern (reading stdout inside `terminationHandler` instead of draining while the child runs) was already present and already fixed in `IntrospectionRunner` and `ComposeRunner` *before* this session. `WorldIndexRunner` shipped in Phase 6 without picking up that fix, so this is a third occurrence of the same bug class in `tools/ide/SharpeeIDE`'s subprocess runners, not a new class of bug. Worth a one-time audit of any remaining subprocess runner for the same read-in-terminationHandler shape.

## Test Coverage Delta

- Tests added: world-index +17 (127 → 144, 1 skipped both before/after); devkit +4 (167 → 171, 1 skipped both); IDE suite +8 (517 → 525, 0 failures both).
- Tests passing before → after:
  - world-index: 127 passed/1 skipped → 144 passed/1 skipped. Evidence: event log records a passing `pnpm --filter '@sharpee/world-index' test:ci` run at 2026-08-19 22:10:00 CDT, but `incomplete.ts` and `document.ts` were edited afterward (22:18:01 CDT) — the logged pass is **stale** relative to D12's final state. The specific count (144) is [reported by session, unverified].
  - devkit: 167 passed/1 skipped → 171 passed/1 skipped. Evidence: event log records a passing `pnpm --filter '@sharpee/devkit' test:ci` run at 22:12:15 CDT with no devkit source files touched this session (fresh by file-edit criteria), but the log records pass/fail only, not the count — the specific number (171) is [reported by session, unverified].
  - IDE suite: 517 passed/0 failures → 525 passed/0 failures. No corresponding event-log row exists for `xcodebuild test` this session — [reported by session, unverified].
  - `npx tsc --noEmit` exit 0 — no corresponding event-log row — [reported by session, unverified].
- Known untested areas: D13 (unnamed-tool finding) not yet implemented; the Map view's collision/direction-skew path still has no corpus behind it (carried forward from Phase 5/6 — every real Chord map is a tree).

---

**Progressive update**: Session completed 2026-08-19 22:46
