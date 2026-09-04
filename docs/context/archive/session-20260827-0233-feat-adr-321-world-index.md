# Session Summary: 2026-08-27 - feat/adr-321-world-index (2026-08-27 02:33 CDT)

## Goals
- Close ADR-327 Phase 5 (paper trail: ADR supersession flips, `chord-grammar-changes.md`, closing regression).
- Discover and correctly scope the reference-documentation half Phase 5 had mis-measured, split it into its own plan, and execute that plan to completion.

## Phase Context
- **Plan**: `docs/work/chord-reference-adr-327/plan.md` — "Migrate the Chord reference documentation to ADR-327 (explicit references)." Plan Status: DONE.
- **Phase executed**: All five phases of the new plan, in one session — Phase 1 "Build the REAL-PATH verification harness" through Phase 5 "Full-corpus verification, IDE docs-tab rebuild, and close-out." Also closed Phase 5 of the prior plan, `docs/work/adr-327-explicit-references/plan.md` (paper-trail half only).
- **Tool calls used**: 322 / 250 budget (state file `phase: 1`, `phaseName: "Build the REAL-PATH verification harness"` — stale relative to actual progress; the session ran all five phases in one continuous pass and never advanced the state file's phase pointer).
- **Phase outcome**: Ran over the stated Phase-1 budget by scope (the state file tracked only Phase 1's budget; the session absorbed all five phases). Both plans reached DONE.

## Completed

### ADR-327 Phase 5 (paper trail) — closed
- ADR-325 D3h: both examples amended to the landed corpus shape — `create the player` block rewritten to D10 form (`create Jack` / `a person` / `playable` + `before the game starts`), and `when the player moves, while it is approaching` rewritten to `while the wandering mercenaries is approaching`, matched against `branch-stories/secret-letter/mercenaries.chord:173` rather than the plan's shorthand. `restart waiting` kept bare (ADR-325 D3c's owner-first timer form, untouched by ADR-327 D2).
- ADR-264: struck `raise its suspicion by 5` from D2, and — beyond ADR-327's named scope — also from the D4/`set` target list and D3's conditions, since striking D2 alone left the ADR self-contradictory two sections later.
- ADR-328 D7: confirmed already flipped in session 8ae644; nothing owed.
- `chord-grammar-changes.md`: D9/D10 row's Decision cell updated from "chord half landed" to record the Phase 4 corpus cutover and its gate numbers.
- `packages/chord/src/version.ts` 4.0.0 entry (D1-D4, D6, D8, D9, D10, story language 3→4) and the EBNF pin (`tests/language-version.test.ts`) verified complete.
- Closing regression, all green: repo `tsc --noEmit`; chord 1064, story-loader 637, stdlib 1637, engine 637, world-model 1492, bootstrap 52, devkit 172, world-index 169, character 567, platform-browser 143 (up from Phase 4's 138 — five tests added, not a regression); Dungeo walkthrough chain 952 passing / 17 transcripts.

### Scope finding and plan split
- Phase 5's reference-surface half was measured in the outgoing plan as "10 doc files." Actual measurement this session: ~185-187 removed-spelling sites across ~82-83 files, entirely within `website/src/app/chord/**/content.mdx` and `website/src/app/learn/**/content.mdx` (`docs/book/` has zero chord fences; `docs/reference/` does not exist). The reference documented **none** of ADR-327's landed constructs (`playable`, `before the game starts`, `change the player to`, actor-explicit heads all had zero occurrences).
- David ruled: split into its own plan. Rule 18b disposition asked and answered as "still live" — the outgoing plan (`docs/work/adr-327-explicit-references/plan.md`) was stamped `Superseded by: docs/work/chord-reference-adr-327/plan.md`, its Phase 5 left DONE with the scope-finding note, its Phase 6 (D7, non-player actors) left PENDING and blocked on an ADR-328 plan that does not yet exist.
- `session-planner` wrote `docs/work/chord-reference-adr-327/plan.md`; `docs/context/.current-plan` repointed to it.
- ADR-327's own Consequences and Acceptance item 4 amended: the two reference surfaces it had named ("the book," `docs/reference`) don't exist as claimed; corrected to name the actual surface (sharpee.net's Chord reference / `website/src/app/**/content.mdx`, which the IDE docs-tab also ships from).

### /devarch:plan-review on the new plan
Ran before execution; two blocking findings, both fixed in-plan:
- **CONTRADICTION**: the landing page `website/src/app/chord/content.mdx` (first page a reader hits, 1 removed-spelling site) fell outside every phase's glob. Added to Phase 2.
- **STALE ADR**: ADR-327 named two reference surfaces ("the book," `docs/reference`) that carry nothing. Fixed on the ADR side (Consequences + Acceptance item 4).
One advisory TENSION left open as a Phase 1 design question (below): a second verification instrument alongside ADR-272 D6's existing `docs-examples-load.test.ts`.

### New plan execution (all five phases DONE)
- **Phase 1**: `packages/story-loader/tests/docs-adr-327-spelling.test.ts` — a compiler-driven ratchet gate over the corpus (all six ADR-327 diagnostic codes fire at `compile()` given only a story header; design settled by direct probing). Resolved the TENSION finding as "stands beside, with a reason," recorded under ADR-272 D6: `docs-examples-load.test.ts` needs a fence to fully load and so excludes ten pages via `KNOWN_PARTIAL_PAGES`, which includes the `define-trait`/`define-condition` carrier pages that D8 deliberately keeps `it`/`its` in — the new spelling gate covers exactly the surface the load-test cannot. Baseline: 161 diagnostics across 78 files.
- **Phase 2**: guide-section spelling sweep (161→114 diagnostics), plus net-new authoring: `guide/behavior/on-and-after` gained three new sections, and a new page `guide/world/the-player-role` was authored (`content.mdx` + `page.tsx` + a `nav.ts` row) covering `playable`, `before the game starts`, and `change the player to`. All eight diagnostic codes the new page cites were verified against `packages/chord/src` for exact prefix match.
- **Phase 3**: stdlib + cookbook sections (114→21 diagnostics), 51 `create the player` blocks rewritten to D10 shape. Discovered a second surface the diagnostic gate does not see: **prose**, not fences — 100 clause-head references plus 4 others across 46 files teaching removed syntax outside code blocks. Swept by hand; the spelling gate extended with a second, prose-scanning suite.
- **Phase 4**: fernhill tutorial (20 sites) and the migration guide (`guide/tooling/migrating-from-removed-constructs`, which gained 3 new ADR-327 rows and had two real bugs fixed — including one spot where the guide's own recommended replacement was itself removed syntax). Diagnostic corpus reached 0.
- **Phase 5**: a shipped-bundle scan turned up 4 more real sites, caused by flaws in the session's own sweep patterns — start-anchored regex missed mid-span constructs (six real sites had survived an earlier "clean" run) and a literal-space separator missed a line-wrapped span. `repokit grammar --check` green. IDE docs-tab rebuilt (160 pages, including the new `the-player-role` page).

### `next build` — reclassified, not skipped
Fails locally: `website/node_modules/next` is a dangling symlink into a root pnpm store entry that no longer exists. Root `pnpm install` cannot repair it because `website/` is not listed in `pnpm-workspace.yaml`; the tree was linked by pnpm on 2026-08-12 while the committed lockfile is npm's `package-lock.json`. This was never the real gate — the site builds on plover via `website/deploy.sh`, which runs `npm ci` inside `website/`. Left unrepaired; two fixes lead to different setups (add `website` to the pnpm workspace vs. keep it npm-managed), left as the owner's call.

### Playground examples — a surface no instrument covered
`website/deploy.sh` named it. `website/src/app/playground/examples.ts` holds four Chord programs as TypeScript string literals, invisible to both the fence-scanning diagnostic gate and the prose sweep. `node scripts/playground-examples-check.mjs` found 4 of 4 failed to compile, including the starter example a first-time visitor lands on. Causes: ADR-327 spellings (`create the player`, `on <gerund> it`) plus pre-existing ADR-298 drift (`parse.header-inline-list`). All four fixed; script now reports 4/4 compiling clean.

### Housekeeping
- Added machine-readable `**Plan Status**:` fields to `docs/work/adr-294-rebuild/plan.md` (ACTIVE) and `docs/work/zoo-chain/plan.md` (DONE) — a finding `pre-session-audit` had flagged for 5 consecutive sessions. zoo-chain intentionally not archived (owner's call, not this session's).
- Corrected a stale plan-pointer note left in the outgoing ADR-327 plan (it described `.current-plan` as still naming a different, older plan; verified against the pointer directly and fixed).

## Key Decisions

### 1. Split Phase 5 into its own plan rather than absorbing the reference sweep into ADR-327's plan
The measured scope (185 sites / 82 files, plus four net-new constructs never documented) was an order of magnitude past the original "10 doc files" estimate and is documentation authoring, not the tail of a code landing. David's ruling; disposed per rule 18b as "still live" (outgoing plan stamped `Superseded by:`, left resumable at its Phase 6).

### 2. New spelling-gate test stands beside ADR-272 D6's existing load-test rather than widening it
`docs-examples-load.test.ts` enforces full-fence loadability and therefore must exclude partial-snippet pages (`KNOWN_PARTIAL_PAGES`), which are exactly the D8 carrier pages the new gate needs to check. One instrument can't do both jobs at once; recorded under ADR-272 D6 as a deliberate second instrument, not drift.

### 3. Playground examples and prose references required separate ad hoc sweeps, not just the fence-scanning gate
Two real-content surfaces (TS string literals, and prose outside fences) were structurally invisible to the diagnostic-code gate built in Phase 1. Both were found only by an out-of-plan check (`deploy.sh` naming the playground path) and by grep during the stdlib sweep, not by the instrument itself — worth remembering as a gap class if a future language-migration project reuses this gate.

## Next Phase
- **Phase 6** of `docs/work/adr-327-explicit-references/plan.md`: "D7 — non-player actors fire their own heads." Status: PENDING, blocked on an ADR-328 plan that does not yet exist (David has not asked for `session-planner` to write it).
- `docs/work/chord-reference-adr-327/plan.md` is fully DONE — no next phase there.
- **Entry state for Phase 6**: requires ADR-328 D1/D2's `(action, actorId)` execution entry landed first (a 49-file `context.player` → command-actor rewrite), independent of anything in this session.

## Open Items

### Short Term
- `next build` / website install mismatch (dangling `next` symlink, npm lockfile vs. pnpm-linked tree, `website/` outside `pnpm-workspace.yaml`) — owner to choose between adding `website` to the pnpm workspace or keeping it npm-managed via `deploy.sh`.
- Nothing committed this session — ~190 files changed sit in the working tree.

### Long Term
- ADR-327 Phase 6 (D7, non-player actors) remains blocked on an ADR-328 plan that does not exist yet.
- `docs/work/zoo-chain/plan.md` is terminal (DONE) but not archived — rule 18b would move it to `docs/work/archive/` when acted on.

## Files Modified

**ADRs / architecture docs** (5 files):
- `docs/architecture/adrs/adr-264-chord-numeric-counters.md` - struck dead `raise its suspicion by 5` spelling from D2, D3, D4
- `docs/architecture/adrs/adr-272-grammar-documentation-surfaces.md` - recorded the second verification instrument under D6
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` - D3h examples rewritten to landed corpus shape
- `docs/architecture/adrs/adr-327-explicit-references.md` - Consequences + Acceptance item 4 corrected to name the real reference surface
- `docs/architecture/chord-grammar-changes.md` - D9/D10 row finalized with Phase 4 cutover + gate numbers

**Plans** (4 files, 1 new directory):
- `docs/work/adr-327-explicit-references/plan.md` - Phase 5 marked DONE with scope-finding note; superseded stamp; pointer-note correction
- `docs/work/chord-reference-adr-327/plan.md` - new plan, all 5 phases DONE
- `docs/work/adr-294-rebuild/plan.md` - added machine-readable Plan Status field
- `docs/work/zoo-chain/plan.md` - added machine-readable Plan Status field (DONE)
- `docs/context/.current-plan` - repointed to the new plan

**Verification harness** (1 new file):
- `packages/story-loader/tests/docs-adr-327-spelling.test.ts` - compiler-driven ratchet gate, fence + prose suites

**Website content** (91 files under `website/src`):
- `website/src/app/chord/guide/**` (31), `chord/stdlib/**` (31), `chord/cookbook/**` (16), `learn/fernhill/**` (8), plus `chord/content.mdx`, `chord/reference`, `chord/getting-started`, `nav.ts`, and `playground/examples.ts`
- New page: `website/src/app/chord/guide/world/the-player-role/` (content.mdx + page.tsx)

**IDE docs-tab** (88 files under `tools/ide/SharpeeIDE/Resources/docs-tab`):
- Rebuilt output (160 pages) reflecting all content changes plus the new `the-player-role` page

## Notes

**Session duration**: started 02:33 CDT; event log spans 02:33 to 23:48 (~21 hours wall-clock), but with a ~7-hour gap between the last logged event at 16:51 CDT and the next at 23:45 CDT — active tool-call density (322 calls, all logged events) suggests most of that gap was time away rather than continuous work; flagging per the user's own time-awareness preference rather than asserting either reading as fact.

**Approach**: measure-first on the reference surface (regex census before touching a single file), instrument-first on verification (built the spelling gate before sweeping, per rule 13a's REAL-PATH discipline), sweep by section in an order that let scope surprises (prose, playground) surface incrementally rather than all at once.

**Corrections made to earlier claims within this session** (kept for the record, per the session's own retrospective):
- Phase 1's initial blind-spot count was reported as "2 sites in 1 fence"; the true figure was 27 across 16 files. Cause: the classification rule required zero ADR-327 hits, which under-reported by 20 fences.
- A probe suggested `define manner` was a third D8 carrier scope; it is not — the probe was malformed (missing `end manner`).
- A script run was reported complete when it had actually exited early on an assertion, before a planned regex widening was applied; caught by a negative test, not by re-reading the run output.

**Gap not covered by this session's process, worth flagging for future language-migration work**: the diagnostic gate scans fences only; prose references and non-`.mdx` string-literal code (the playground) were both found by out-of-band checks (a script named in `deploy.sh`, and manual grep during the stdlib sweep), not by the instrument built to catch exactly this class of drift.

---

## Session Metadata

- **Status**: COMPLETE (unverified: exact final gate counts — "spelling gate 322 passing," "story-loader 959," "chord 1064," "playground examples 4/4," "Dungeo chain 952/17" — the session event log (`docs/context/.devarch-events-a3a4af.jsonl`) confirms a "Build passed" event at 2026-08-27T23:45:07Z running `tsc --noEmit` plus a story-loader command, after the session's last file edit, which corroborates "tsc --noEmit clean" and that the final story-loader run was green; the log's `detail` field is truncated to ~70 chars so it does not carry the specific pass counts, and the chord/stdlib/engine/world-model/Dungeo-chain package suites have no corresponding logged event at all, so those specific numbers rest on the session's own report; see Test Coverage Delta)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing committed or pushed this session; ~190 files sit in the working tree.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-327 Phases 1-4 (prior sessions) landed the actor-explicit head reform in code and the corpus before this session's reference-doc work began; ADR-272 D6's `docs-examples-load.test.ts` pattern existed as a precedent to extend.
- **Prerequisites discovered**: none newly blocking — the true prerequisite gap (ADR-328's D2 execution entry, for ADR-327 Phase 6) was already known from the prior session and remains open.

## Architectural Decisions

- ADR-327: Consequences and Acceptance item 4 amended to name the actual reference surface (sharpee.net's Chord reference under `website/src/app/**/content.mdx`, also the IDE docs-tab's source) in place of the two surfaces originally named that don't exist ("the book," `docs/reference`).
- ADR-272 D6: recorded the new spelling-gate test as a deliberate second verification instrument alongside `docs-examples-load.test.ts`, with the reason (fragment-tolerance vs. full-load enforcement are different jobs over the same corpus).
- ADR-325 D3h and ADR-264 D2/D3/D4: hand-edited (amend-after-code) to match the landed ADR-327 spelling; both ADRs remain ACCEPTED, this was not a re-interview.
- Pattern applied: ADR-327's own Phase 4 migration mechanism (each `it`/`its` resolves statically to its enclosing block's owner) reused verbatim for doc-prose rewrites in Phases 2-4 of the new plan.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/tests/docs-adr-327-spelling.test.ts` (new test file — a verification harness, not application state-mutating logic).
- Tests verify actual state mutations (not just events): N/A — this session's code change is a test/verification harness over documentation content, not a side-effect-bearing production function; rule 12's Behavior Statement discipline does not apply to a diagnostic-scanning test file.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — `docs/context/session-20260827-0211-feat-adr-321-world-index.md` (previous session) flagged `docs/work/adr-294-rebuild/plan.md` and `docs/work/zoo-chain/plan.md` as missing machine-readable Plan Status fields; `pre-session-audit` had raised this for 5 consecutive sessions before it was fixed in this session's housekeeping pass.
- Consider a one-time audit of whether other plans under `docs/work/` are similarly missing the `**Plan Status**` field, to close this recurrence class rather than fixing it plan-by-plan as flagged.

## Test Coverage Delta

- Tests added: 1 new test file (`docs-adr-327-spelling.test.ts`) with two suites (fence-scanning + prose-scanning); exact assertion count [reported by session, unverified — the event log's truncated `detail` field does not carry pass counts].
- Tests passing before: 0 (new file) → after: "spelling gate 322 passing (161 fence + 161 prose); story-loader 959; chord 1064; playground examples 4/4; Dungeo chain 952/17" [reported by session, unverified]. **Partially corroborated**: event log row at 2026-08-27T23:45:07Z (`kind: build, msg: "Build passed"`, detail beginning `./node_modules/.bin/tsc --noEmit && echo "TSC CLEAN"; pnpm --filter '@sharpee/st...`), timestamped after the session's last recorded file edit — confirms `tsc --noEmit` clean and that the final story-loader run passed, but the log does not carry the specific numeric counts quoted above.
- Known untested areas: `SharpeeIDETests` (Swift/XCTest) remains deferred per the prior plan's Phase 4 note, unrelated to this session's scope.

---

**Progressive update**: Session completed 2026-08-27 (local time per `startedLocal`; end time not separately stamped).
