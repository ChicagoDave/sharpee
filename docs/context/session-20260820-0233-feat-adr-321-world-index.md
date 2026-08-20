# Session Summary: 2026-08-20 - feat/adr-321-world-index (2026-08-20 02:33 CDT)

## Goals
- Write ADR-321 Amendments 2 and 3 into the ADR document (carried over from session b983d6).

## Progress

### Finding: the amendments were already written
Commit `60756a59` had already added both amendment sections to
`docs/architecture/adrs/adr-321-world-index.md` (Amendment 2 at the "say where, say which,
say why" heading, Amendment 3 at "the list acts"). The previous session's summary recorded
them as unwritten because it was composed before that commit landed. The real work was
therefore four structural defects in the already-written sections, not authoring them.

### Fixed
1. **D-number collision.** Amendment 1 already owned D15 (background-thread placement);
   Amendments 2 and 3 opened a second D15 and ran to D25. Renumbered to D16–D26. Verified
   no source file cites ADR-321 D15–D25 (only D1–D12 and D11a appear in code comments), so
   the renumber touched only the ADR and `docs/work/world-index/plan.md` Phase 9.
2. **Orphaned `## Session` body.** The amendments had been inserted between the `## Session`
   heading and its paragraphs, leaving the heading empty and the original session narrative
   stranded at the end of the file, where it read as Amendment 3's. Moved back under its
   heading; added a paragraph recording the amendment sessions.
3. **Incomplete `**Amended**` header.** Only Amendment 1 was recorded. Added header entries
   for Amendments 2 and 3 with their D and AC ranges and the `world-index/3` wire bump.
4. **No acceptance criteria for either amendment,** though Amendment 1 has its own
   subsection. Added `### Acceptance for this amendment` to both: AC-17..AC-21 (Amendment 2)
   and AC-22..AC-27 (Amendment 3), each grounded in a test that exists today. Corrected the
   main Acceptance section's pointer note, which said "AC-10 through AC-13 are Amendment 1's"
   when Amendment 1 runs to AC-16.

### Evidence
- `pnpm --filter '@sharpee/world-index' test:ci` at 02:33 local: 10 files passed,
  **159 passing, 1 skipped (160)**. The previous session's Blocker (4 stale corpus pins) is
  resolved — the re-pins landed with the commits.
- No source files changed this session; the diff is two markdown files.

## D13 — the unnamed-tool finding (Phase 8's last item)

### The measurement changed the design
The ADR drafted D13 as "Fernhill has 11" — but that figure is the phrase extractor's own
reading, which AC-13 explicitly forbids shipping. Measured against all three corpus stories:

| Reading | Fernhill | Alderman | Ides |
|---|---|---|---|
| No edge resolves to it (the ADR's figure, re-measured) | 16 | 7 | 3 |
| + absent from a direct search of ALL prose (AC-13 as drafted) | 0 | 0 | 0 |
| + self-prose excluded, room listing excluded (**shipped**) | **1** | 0 | 0 |

Two guards were needed and neither is in the ADR as drafted:
1. **A thing's own passages do not count.** Almost every thing has a description that names
   it, which is why the drafted rule reports zero everywhere. A description only readable by
   someone who can already refer to the thing announces nothing.
2. **The room listing is not prose.** `looking` lists non-scenery things directly in a room,
   so `crowbar`, `furnace-poker` and `tobias` are announced by the platform whatever the
   prose says. Reporting them would report the platform as an authoring hole.

What survives is Fernhill's `doormat`: scenery (so the listing skips it), named by no passage
but its own. Same posture as D26/Undescribed — a class that fires often on a clean story is
one nobody trusts when it fires on a dirty one.

### Shipped
- `packages/world-index/src/unnamed.ts` (new) — `deriveUnnamedTools`, both guards.
- `tokenizeProse` extracted from `extractNounPhrases` so the finding and the extractor read
  the same words (the D16 hyphen rule applies to both).
- Wire `world-index/3` → `world-index/4`: new required top-level `unnamedTools`. Deliberately
  NOT in `reach.findingCount` — Fernhill stays AC-1 clean.
- Swift: `WorldUnnamedTool`, decoded and rendered as a Reach-view section
  ("Nothing tells the player these exist"), with the progression case saying what it costs.
- Tests: `packages/world-index/tests/unnamed.test.ts` (8), two new IDE tests. `cli.test.ts`'s
  future-schema sentinel bumped to `world-index/5` (it named `/4`, now current).

### Evidence (run 2026-08-20 02:51–02:56 local)
- `pnpm --filter '@sharpee/world-index' test:ci`: **167 passing, 1 skipped** (11 files).
- `pnpm --filter '@sharpee/devkit' test:ci`: **171 passing, 1 skipped**.
- `xcodebuild test -only-testing:SharpeeIDETests -derivedDataPath ./DerivedData`: **560
  passing, 1 failure** — `EditorExternalChangeTests.testWatcherSurvivesAtomicReplaceChains`,
  a file-watcher timeout in a file this session did not touch. Not investigated.
- `npx tsf build --package @sharpee/world-index` for both `local` and `esm` targets, before
  the CLI real-path tests were run.

## Open Items
- **Room-listing guard — settled (David, 2026-08-20)**: asked under rule 11 whether "the
  platform announces some things, so prose need not" warranted its own decision entry.
  Ruling: no, it stays inside D13's implementation record. Do not re-raise.
- `EditorExternalChangeTests.testWatcherSurvivesAtomicReplaceChains` failing — unrelated,
  uninvestigated.
- Carried from last session, still unanswered: delete `WorldFindingExplanation.swift` (dead
  code)? Delete the stray `tools/ide/non-physical-nouns.tsv` duplicate?
- Pre-session audit raised again: 16 stranded event logs in `docs/context/`, and ADRs split
  across 4 directories with no `adrLocationCheck` key in `.devarch/descriptor.json`.
- Nothing is committed yet — this enrichment pass ran before the commit.

## Files Modified

**ADR + plan** (2 files):
- `docs/architecture/adrs/adr-321-world-index.md` - D-number renumber (D16-D26), `## Session`
  body reattached, `**Amended**` header completed for all three amendments, AC-17..AC-27 added
- `docs/work/world-index/plan.md` - Phase 9 D-range updated to match the renumber; Phase 8
  flipped to DONE

**world-index package** (5 files, 2 new):
- `packages/world-index/src/unnamed.ts` (new) - `deriveUnnamedTools`, D13's two guards
- `packages/world-index/tests/unnamed.test.ts` (new) - 8 tests, including the AC-13
  non-finding cases (`winding-key`, `crowbar`)
- `packages/world-index/src/incomplete.ts` - `tokenizeProse` extracted out of
  `extractNounPhrases` so the finding and the extractor share tokenization
- `packages/world-index/src/document.ts` - wires `unnamedTools` into the built document
- `packages/world-index/src/index.ts` - wire bump `world-index/3` -> `world-index/4`,
  `unnamedTools` as a new required top-level field

**devkit** (1 file):
- `packages/devkit/src/commands/world-index.test.ts` - schema pin bumped to `world-index/4`

**IDE (Swift)** (4 files):
- `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` - new `WorldUnnamedTool` decode type
- `tools/ide/SharpeeIDE/World/WorldReachView.swift` - new Reach-view section; `rows(for:)`
  and `headline(for:)` signatures extended to take `unnamedTools`
- `tools/ide/SharpeeIDE/World/WorldView.swift` - wires the new section in
- `tools/ide/SharpeeIDETests/WorldIndexTests.swift` - 2 new tests; future-schema sentinel
  bumped to `world-index/5`

## Session Metadata
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — nothing committed yet; working tree only

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 8's entry state (Phase 6 rendering confirmed, ADR-321 Amendment
  1 accepted, David's approval for both the `packages/world-index` and `tools/ide` sides) —
  all already satisfied entering this session. D13's own stated prerequisite (D14/D12/D11
  shipped first, so the finding rides real roles) was met within this session, in order.
- **Prerequisites discovered**: none — the tsf dist rebuild for both `local` and `esm` targets
  before the CLI real-path tests is standard practice (ADR project note), not a new dependency.

## Architectural Decisions
- ADR-321 D13 (unnamed-tool finding): shipped with two guards not present in the drafted ADR
  language — a thing's own passages don't count as naming it, and the room listing is not
  prose (it comes from `looking`, not the story's authored text). Both are now written into
  the ADR's D13 section, not left as undocumented implementation detail.
- Room-listing guard raised under rule 11 as possibly ADR-worthy; David ruled no separate
  entry — it stays inside D13's implementation record (see Open Items).
- D13 is deliberately Reach-adjacent, not a Reach finding: excluded from
  `reach.findingCount` so Fernhill stays AC-1 clean. This is a wire-contract decision, not
  incidental.
- Wire `world-index/3` -> `world-index/4`: `unnamedTools` is a new required top-level field:
  the IDE's schema-version guard rejects unknown/future schemas by design (Amendment 1's
  `world-index/2` decision, reused here without change).

## Mutation Audit
- Files with state-changing logic modified: `packages/world-index/src/unnamed.ts` (new
  finding derivation), `packages/world-index/src/document.ts` (wires the finding into the
  built document), `packages/world-index/src/incomplete.ts` (shared tokenization extraction).
- Tests verify actual state mutations (not just events): YES (evidence:
  `packages/world-index/tests/unnamed.test.ts`, read directly during this enrichment pass —
  `expect(unnamed(fernhill)).toEqual([{ id: 'doormat', ... }])` asserts the finding's actual
  output shape and content, not a call count or a non-throw; two further cases assert
  NON-findings by name on `winding-key` and `crowbar`, which is a state assertion in the
  negative). Corroborated further by the fresh `test:ci` run below (167 passing / 1 skipped),
  timestamped after every file edit in the working tree.

## Recurrence Check
- Similar to past issue? YES — `docs/context/session-20260819-2257-feat-adr-321-world-index.md`
  and the session before it. Both shipped a session-end "final passing count" for
  `@sharpee/world-index` that a fresh re-run at write time contradicted (144 -> 155/4 failed,
  then a claimed 159 that was itself stale). This session breaks the pattern rather than
  repeating it: the counts recorded above (167 passing / 1 skipped) were re-run fresh at
  02:51-02:56, at write time, and the one real failure found elsewhere (the IDE's
  `EditorExternalChangeTests` case) is reported rather than smoothed into a claimed clean run.
  Two occurrences is still a pattern worth a one-time process fix — the prior session already
  recommended deciding a re-pin policy for IDE-editable fixture stories; that recommendation
  stands, unaddressed.

## Test Coverage Delta
- Tests added: 8 (`packages/world-index/tests/unnamed.test.ts`) + 2
  (`tools/ide/SharpeeIDETests/WorldIndexTests.swift`) = 10.
- Tests passing before: world-index 159/1 skipped (this session's own earlier re-pin
  confirmation, 02:33 local) -> after: **167 passing, 1 skipped** (evidence:
  `pnpm --filter '@sharpee/world-index' test:ci`, run 2026-08-20 02:51-02:56 local, postdates
  every source edit this session made).
  devkit: 171 passing, 1 skipped, unchanged in count (evidence: same run window,
  `pnpm --filter '@sharpee/devkit' test:ci`).
  IDE: 561 executed, **560 passing, 1 failure** (evidence:
  `xcodebuild test -scheme SharpeeIDE -only-testing:SharpeeIDETests -derivedDataPath
  ./DerivedData`, same run window) — the failure is
  `EditorExternalChangeTests.testWatcherSurvivesAtomicReplaceChains`, a file-watcher timeout in
  a file this session did not touch, not investigated, and not a regression this session
  introduced.
- Known untested areas: `EditorExternalChangeTests.testWatcherSurvivesAtomicReplaceChains`'s
  underlying flake/bug is uninvestigated and thus effectively untested-for-cause.
