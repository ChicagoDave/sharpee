# Session Summary: 2026-08-21 - feat/adr-321-world-index

## Goals
- Advance the Secret Letter Chord port: measure the source world, stage the playtest transcripts, and resolve the three port-scoping decisions blocking Phase 4+.
- Scaffold the story shell at David's request once Phase 4 was found blocked on external input.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Port *Jack Toresal and The Secret Letter* (Textfyre, 2009) to a native Chord story. Plan Status: ACTIVE.
- **Phases executed**: Phase 2 — "Measure the world and stage the playtest transcripts (P-2, P-3)" (Medium); Phase 3 — "Resolve the three port-scoping decisions (P-8, P-9, P-10)" (Small); plus the scaffolding half of Phase 5 (Large), pulled forward at David's request because Phase 4 is blocked.
- **Tool calls used**: 143 (state file, mid-session) / 250 budget for Phase 2 alone; Phase 3 and the Phase 5 scaffold ran within the same session on top of that.
- **Phase outcome**: Phase 2 completed on budget; Phase 3 completed on budget; Phase 5 scaffolding completed under its own budget (partial phase, by design — content is still gated).

## Completed

### Phase 2 — World inventory and transcript staging (P-2, P-3 — proposal DONE)
- New `docs/references/textfyre/secretletter/INVENTORY.md` (393 lines), everything derived from `source/story.ni` with the reproducing command beside each figure.
- ADR-322 D13's three cited figures reconciled by name: 12,635 lines CONFIRMED exactly (`grep -c '' source/story.ni` = 12635, verified 2026-08-21); ~1,192 authored response rules CONFIRMED exactly, with the derivation identified for the first time — `^Instead` 778 + `^After` 244 + `^Before` 127 + `^Check` 43 = 1192 (excludes `^Report` 15, `^Every turn` 42, `^Rule for` 201; full authored-rule count is 1,450) (verified 2026-08-21); 32 rooms **CORRECTED to 84** — the naive `grep 'is a room'` count of 32 misses five other Inform 7 declaration forms (12 market stalls, 6 stores, 4 Landings, 3 holding cells, 1 shop via `kind of room`, plus 26 rooms declared purely by map relation) and includes 3 non-declaration false positives.
- Consequence recorded: ADR-322 D13's sentence "12,635 lines over 32 rooms... will likely sweep in milliseconds" has two of three inputs wrong by 2.6x. Not load-bearing here — David ruled this port a separate effort from ADR-322, carrying neither AC-10 nor AC-11 — so it is material for whoever amends D13, not a blocker of this plan.
- Also inventoried: 84 rooms by book; 47 person declarations; 23 quip trees / 380 quips (owner-mapped by section heading; Dame Sandler's tree largest at 48); ~300 object declarations; 56 scenes (17 hint + 39 story); 11 regions; 24 kinds; 7 rotating-text tables.
- Two structural findings: (1) the source's `Book` numbers are not play order (Book 6 appears twice, Book 5 sits after Book 6, `Book 5B` is a suffix) — file order is play order, and building from the numbers would assemble the game wrong; (2) the source ships its own 17-segment walkthrough (`Book X - Walkthrough - Not for release`, line 12397) — the designers' own solution path, the most directly useful artifact for Phase 8 — plus `xyzzy`/`unxyzzy` RNG-seeding (1234/0) to pin the market and sewer sequences, a determinism precedent Chord already matches via `forces:`/`point-seed:` (ADR-293 Phase C).
- New `docs/references/textfyre/secretletter/testing/README.md` labeling all five transcripts by command count, build, and reach. SecLet-EE07.txt (1,069 commands) and SecLet-EE08.txt (767) both run complete to `*** To be continued ***`; sandlerbug.txt (470) ends on its own bug at Dame Sandler; the two 2007 files (249, 112) predate large design changes. Not-the-acceptance-gate note scoped explicitly to this port.
- Modified all five `testing/*.txt`: restored all 20 U+FFFD replacement characters lost to an earlier encoding round-trip — 8 to `©`, 12 to `é` (all `canapés`, verified against `story.ni` line 11058); 0 remaining after. Nothing else touched.
- Corrected `docs/references/textfyre/secretletter/README.md`: line counts were both one too high (12,636→12,635, 12,615→12,614 — `grep -c ''` correctly counts a final terminated line and both files end with a newline); file count 85→88 (86 from Phase 1 + 2 new documents this session). Added the character-restoration divergence entry and an inventory pointer. Updated `docs/references/README.md` index row to match.

### Phase 3 — Three port-scoping decisions (P-8, P-9, P-10 — proposal DONE)
- **P-8 (Adjacent Rooms)**: DECIDED — no platform equivalent built; authored as story content. The extension's `distant description`/`dead-end description` (101 + 41 = 142 authored texts) map onto already-real primitives: `define action` + `directions` block (ADR-267 D12, live in `stories/nautical`), ADR-173 wall adjacency (ACCEPTED, implemented), and `WorldModel.findPath` (BFS) at `packages/world-model/src/world/WorldModel.ts:1355`. Confirmed gap is real (no distant/remote-room concept anywhere in `packages/chord`, `world-model`, or `stdlib`; `looking` has no direction handling). One step left unverified, carried into Phase 5 as a spike: whether per-room text is a phrase key, a `define trait`, or a room-body field — if the story layer can't carry it, the decision reopens with an ADR precondition.
- **P-9 (ADR-323 deferred narration)**: DECIDED — port ships without it. Measured: only 18 `dramatic event` declarations in the whole 12,635-line source, referenced by 27 `current tension` reads. ADR-323 stays ACCEPTED on its own track; no port content is authored against its absence, so the port adopts it if the child ADR ships mid-port.
- **P-10 (ship target)**: DECIDED BY DAVID via AskUserQuestion — a public release, in five checkable terms: every covered chapter playable with transcript tests passing; `./repokit build secret-letter --browser` produces `dist/web/secret-letter/`; hosted at a public URL; landing page + IFID; announced.
- **Critical consequence recorded in both plan and proposal**: the current 8-phase plan does NOT reach P-10's target. Phase 8's exit state satisfies term 1 only — no phase covers art, client presentation, hosting, or the landing page. A re-plan pass is required as Phase 8 nears completion; reaching Phase 8 must not be read as the port being done. Two known constraints for that pass: `secretletter.plover.net` still serves the 2009 game (the port needs its own address), and a public release means David's name is on it, so the GenAI-out-of-real-works constraint governs everything shipped except the P-4-cleared dialogue.

### Phase 5 scaffolding half (pulled forward at David's request)
- New `branch-stories/secret-letter/` (fernhill layout, 6 files): `secret-letter.story` (one placeholder room + player, no 2009 content — Book 1 opens in The Alley, and porting Chapter 1 is what the still-closed P-4 gate governs); `secret-letter.config.json` (IFID `B4647034-34D8-40E3-B2F3-B590573387CB`, generated this session, permanent); `secret-letter.recipe.json` (empty spine, seed 1209); `secret-letter.tests.json` (2 cards, generated via `scripts/make-story-artifacts.mjs`, never hand-written); `secret-letter.world-ignore.json` (empty); `README.md` (gate, reference set, regeneration gotchas, ship target).
- Verified fresh this session (2026-08-21): `node dist/cli/sharpee.js --exec "look" --story branch-stories/secret-letter/secret-letter.story` prints title, version, credits, and the staging room on the ~3-day-stale bundle (`dist/cli/sharpee.js`, built 2026-08-18 22:50) with no rebuild needed. `./sharpee test branch-stories/secret-letter/secret-letter.story` → `1 card passing, 2 assertions passing`. `repokit`'s `resolveStoryDir`/`findChordStoryFile` resolve the directory with no registration needed anywhere (per session narrative — build-config resolution not independently re-run).
- Explicitly unverified and stated as such: `./repokit build secret-letter --browser` was not run this session — full platform build, first needed at Phase 5 proper.
- Judgment call flagged for David: credits list David Cornelson and Michael Gentry, matching the original's credited pair (a matter of record, not invention) — flagged in the story file and README for confirmation before any public release, since P-10 makes this a work with his name on it.
- Two repo gotchas documented in the scaffold README: `scripts/make-story-artifacts.mjs` writes nothing and exits 0 if both `--tests-out`/`--walkthrough-out` are omitted (hit on the first run this session); regenerating the tree silently drops hand-added assertions on the `opening` card (the script always emits it empty), so this scaffold deliberately carries none.

## Key Decisions

### 1. Adjacent Rooms ships as story content, not a platform primitive (P-8)
Every piece the 142 authored distant/dead-end texts need already exists on the platform (ADR-267 D12 directions, ADR-173 adjacency, `WorldModel.findPath`); adding a platform language surface for one story's house style is not warranted without evidence it generalizes. Revisit with its own ADR if the Phase 5 spike shows the story layer can't carry it.

### 2. ADR-323 deferred narration is out of scope for this port (P-9)
Only 18 dramatic-event declarations exist in the source; the mechanism's original justification (the non-IF middle-school reader) is exactly what the retarget removes; and blocking a content port on unbuilt platform work inverts the dependency. ADR-323 stays ACCEPTED on its own track and this decision is not a judgment on it.

### 3. Ship target is a public release, and the plan doesn't reach it yet (P-10, David)
Setting the target now — rather than leaving it implicit — surfaced a real gap: Phase 8 closes the content work but no phase covers browser build, hosting, landing page, or announcement. This is recorded as a known re-plan obligation rather than silently discovered at Phase 8's end.

## Next Phase
- **Phase 4**: "Confirm the content-authority gate (P-4)" — Tier: Small (60). Blocked on external input: David's change document covering at least Chapter 1, not produced by this plan. Status: CURRENT (since 2026-08-21).
- **Entry state for Phase 4**: David has authored the change document. Nothing in Phases 5-8 can proceed until it exists — the Phase 5 scaffold done this session is deliberately empty of chapter content pending this gate.

## Open Items

### Short Term
- Phase 4 blocked on David's change document — external input, not produced by this plan.
- `dist/cli/sharpee.js` (built 2026-08-18 22:50) is ~3 days stale; rebuild before any Phase 5+ transcript work (it handled the scaffold fine this session).
- 16 stranded DevArch event logs in `docs/context/` remain unaddressed (carried over); `./scripts/prune-devarch-runtime.sh` is the fix.
- `./repokit build secret-letter --browser` never run — first needed at Phase 5.

### Long Term
- ADR-322 D13 needs an amendment on its own track: its corpus premise is unbacked (David ruled the port a separate effort) and its room figure is now known wrong (32 → 84).
- A re-plan pass is needed as Phase 8 nears completion to cover P-10's release terms 2-5 (browser build, hosting, landing page, IFID, announcement), which no phase covers today.
- Plan Phases 7 and 8 are multi-session by design and will report as stale CURRENT phases every session per the plan's own note — not a finding to re-diagnose.
- The Phase 5 per-room-text spike (P-8) could reopen the Adjacent Rooms decision if the story layer can't carry it.

## Files Modified

**New** (3 files + directory):
- `docs/references/textfyre/secretletter/INVENTORY.md`
- `docs/references/textfyre/secretletter/testing/README.md`
- `branch-stories/secret-letter/` (6 files: `.story`, `.config.json`, `.recipe.json`, `.tests.json`, `.world-ignore.json`, `README.md`)

**Modified** (10 files):
- `.devarch/descriptor.json` — `adrLocationCheck: declined`
- `docs/proposals/secret-letter-port.md` — P-2, P-3, P-8, P-9, P-10 → DONE; Status line
- `docs/work/secret-letter-port/plan.md` — Phase 2 DONE, Phase 3 DONE, Phase 4 CURRENT + P-10 consequence note
- `docs/references/README.md` — index row
- `docs/references/textfyre/secretletter/README.md` — line counts, file count, third divergence, inventory pointer
- `docs/references/textfyre/secretletter/testing/{SecLet-EE07.txt, SecLet-EE08.txt, sandlerbug.txt, "The Secret Letter - Jacqueline - 080101.txt", "The Secret Letter r14.txt"}` — character restoration only

## Notes

**Session duration**: began 04:43 CDT; ran through Phase 2, Phase 3, and the Phase 5 scaffold in one session (143+ tool calls recorded mid-session in the state file, more logged since — a build-passed event for `make-story-artifacts.mjs` at 15:52:49Z).

**Approach**: Source-derived measurement (never transcript-derived) for the inventory, so the two records can't drift; decisions closed at the decision layer per CLAUDE.md's platform-change discussion gate, with implementation explicitly deferred; scaffold created empty and inert pending the content-authority gate rather than front-running P-4.

**Session start**: `pre-session-audit` ran and was relayed verbatim. Of two outstanding standing offers, one was resolved this session — ADR directory normalization DECLINED, `docs/architecture/adrs` stays canonical, recorded permanently in `.devarch/descriptor.json`. The other (16 stranded event logs) remains open, listed above.

**Verification gap noted for the record**: the session-start gate file (`.devarch-gate-dd5d48`) was still present when this summary was written, despite the session-start steps (audit relayed, previous session read) having clearly already run earlier in the session per the task brief. It was cleared as part of writing this summary rather than left to block the write.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A for this session's own scope. (Phase 4, entered next, is blocked on David's change document — an entry-state condition for future work, not an incompleteness of this session's Phases 2/3/5-scaffold.)
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (session complete; Phase 4 has no time estimate — it waits on external input)
- **Rollback Safety**: safe to revert — all changes are additive documentation, corpus corrections, and an inert story scaffold with no chapter content

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1's landed corpus (source `story.ni`, five playtest transcripts) was the entry state for Phase 2 and was present and complete. Phase 1's Adjacent Rooms extension source in the corpus was the entry state for Phase 3's P-8 decision and was present.
- **Prerequisites discovered**: Phase 4's entry state (David's change document) does not yet exist — discovered this session when Phase 4 was reached and found blocked, prompting the Phase 5 scaffolding-only pull-forward as the productive alternative.

## Architectural Decisions

- No new ADRs written or amended this session. ADR-322 D13 was measured against (two of three cited figures corrected) but not itself edited — recorded as follow-up work for whoever amends it, per this session's finding above.
- Pattern applied: fernhill layout (`.story` + config/recipe/tests/world-ignore) reused verbatim for the new scaffold, per `docs/context/project-profile.md` convention.
- ADR-267 D12 (`define action` + `directions` block), ADR-173 (wall adjacency), and ADR-293 Phase C (`forces:`/`point-seed:` determinism) were each identified as pre-existing platform support relevant to future phases, not implemented this session.

## Mutation Audit

- N/A — this session's work is documentation staging, measurement, and a story-content scaffold with no chapter logic; no side-effect functions were written or modified.

## Recurrence Check

- NO — no prior session flagged a similar corpus-measurement discrepancy or scoping-decision pattern for this plan; this is the plan's first Phase 2/3 pass.

## Test Coverage Delta

- Tests added: 1 test card / 2 assertions (`secret-letter.tests.json`, generated via `scripts/make-story-artifacts.mjs`, boot-only).
- Tests passing before: 0 (story did not exist) → after: 1 card passing, 2 assertions passing (evidence: `./sharpee test branch-stories/secret-letter/secret-letter.story` run 2026-08-21, output `✓ opening-staging-room` / `1 card passing, 2 assertions passing` — re-run fresh during summary writing, after all session edits, output identical to session narrative). Boot/load path also independently re-verified: `node dist/cli/sharpee.js --exec "look" --story branch-stories/secret-letter/secret-letter.story` printed title, credits, and staging-room description matching the session's account.
- Known untested areas: no chapter content exists yet to test; Phase 5 proper adds Chapter 1's transcript coverage. Corpus-derived figures in `INVENTORY.md` (12,635 lines, 1,192 response rules) spot-checked directly against `source/story.ni` this session and confirmed exact.

---

**Progressive update**: Session completed 2026-08-21 15:56 (approx, from last event-log entry)
