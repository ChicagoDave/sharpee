# Session Summary: 2026-08-12 - feat/adr-310-character-in-chord (CDT)

## Goals
- (Stated off-plan, matching the prior session) Consolidate the notarization bisection evidence, ship a toolchain-less Chord Writer DMG, and publish it via the website.
- No ADR-310 goal was pursued this session.

## Phase Context
- **Plan**: `docs/work/character-in-chord/plan.md` — "Map the Character Model (ADR-141/142/144/145/146) into Chord."
- **Phase executed**: None. Phase 1 ("Elicit and draft the skeleton demonstration story") remains `CURRENT (since 2026-08-11)`, unchanged this session — blocked on David's story content, per the prior session's summary.
- **Tool calls used**: 214 (from `.session-state-1744e6.json`) / N/A (no phase budget consumed).
- **Phase outcome**: N/A — no plan phase was executed. This is the second consecutive session diverted entirely to Chord Writer packaging/website work (docs/context/session-20260812-0152-feat-adr-310-character-in-chord.md was the first).

## Completed

### Notarization evidence consolidation
- Wrote `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md`, pulling the bisection record out of a session summary named after an unrelated branch, where it previously lived as the only copy.
- Re-verified all submission statuses first-hand via `xcrun notarytool history` at 2026-08-12T07:13:12Z (full UUIDs, fixture zip names, creation timestamps). `history` under the `dc-notary` keychain profile reaches back only to submission `e4244248` — the five pre-bisection ids are invisible to current credentials, independent support for the old-Apple-team inference from a prior session.

### Stale ADR corrections (Chord testing)
- Claude incorrectly claimed ADR-287's fence grammar still couples the IDE to the toolchain (citing ADR-294 D9). David corrected this: verified in `packages/branch-tester/src/index.ts:9-14` that ADR-307's cutover retired the `.transcript` grammar — `<story-id>.tests.json` is the sole serialization. ADR-294 D9 governs `@sharpee/transcript-tester` (Dungeo's text world), a separate package.
- This killed a planned `ChordVersionCheck` minimum-version feature: `tree-document.ts` already refuses a too-new version by name and degrades to an empty tree (AC-4) — a stronger guard than what was proposed.
- Amended four artifacts at David's request ("amend any ADR that says the wrong thing about chord testing"): `adr-279-chord-writer-packaging.md` (D4 coupling note — explicitly says the mitigation it asked for should NOT be built), `adr-300-addressable-channels-and-canonical-transcript.md` (status line, D1, D3 scoped to the text world only), `adr-301-sharpee-transcript-editor.md` (header now names `serializeTreeDocument` and scopes to ADR-307's dependency), and `docs/work/adr-279-chord-writer-packaging/plan.md` (bisection pointer added, ADR-287 reference marked STALE).

### `package.sh --no-toolchain` mode
- Added `--dmg-from`-only adopt mode: skips exactly three toolchain gates, refuses a bundle that already has a toolchain, refuses to run without `--dmg-from` (the normal build path still hardcodes `SHARPEE_VENDOR_TOOLCHAIN=1`). Added a `warn()` helper.
- Real-path tested with three fixtures: toolchain-present bundle refused; bare bundle passes the gate then dies at codesign (expected, next stage); control run without the flag dies at the toolchain gate (expected).
- Corrected the npm package name in the copy: the `sharpee` bin ships from `@sharpee/devkit`, not `@sharpee/sharpee` (which has no bin entry). Verified `esbuild` ships `@esbuild/darwin-x64` + `darwin-arm64` as optional deps, so the global-install route is architecture-agnostic.

### Universal build attempt, reverted — second notarization trigger isolated
- Flipped `tools/ide/project.yml` `ARCHS` to `$(ARCHS_STANDARD)`; built universal (x86_64+arm64), 480 IDE tests passed, 0 failures.
- Notarization of the universal binary hung. Disambiguated with a matched pair from one export: submission `5133a8de` (x86_64+arm64) still `In Progress` past 16 minutes vs `ee8cf37e` (same bundle, `lipo -thin arm64` + re-sign) `Accepted` in ~30s and stapled — the x86_64 slice is a second, independent notarization trigger, distinct from the previously-found devkit-content trigger (arm64 Mach-Os were already exonerated in a prior session: 108MB node binary 44s, esbuild 19s).
- `ARCHS` reverted to `arm64` with this evidence recorded inline in `project.yml`. Claude's first attempt changed two variables at once (arch and build route) — the same confound the original bisection was designed to avoid; corrected to isolate arch alone.

### DMG delivered
- Full chain run end-to-end for the first time: archive → Developer ID export → notarize app → staple → DMG → notarize DMG → staple.
- Final artifact: `tools/ide/release/ChordWriter-1.0.0.dmg`, 9,929,857 bytes, sha256 `c8b8473274a31a9035bf98ef709e41948dbcc464214c44a680bd08b2536462c6`, arm64, toolchain-less, Gatekeeper-accepted (submission `1513b801`).

### DMG script fixes
- `tools/ide/dmg/assemble-dmg.sh` now removes `.fseventsd` before detach.
- Claude also replaced the Applications-folder Finder alias with a symlink, theorizing the alias broke drag-install. David tested — the alias worked. Reverted to the alias, with a comment recording that drag-install onto the alias is verified working, to stop a future re-break. Net script change is comments plus the `.fseventsd` fix only.

### Website rewrite and dead-anchor fix
- `download/content.mdx` and `chord-writer/content.mdx` restructured into explicit "Temporary installation instructions" / "Future state" sections at David's request — the old copy claimed "no npm install" and that the app "brings its own" Node, which was false for the toolchain-less interim. Also rewrote the "If macOS refuses to open it" section, which promised a Gatekeeper malware warning a stapled build will not produce and coached "Open Anyway" as the normal path.
- Found and fixed a site-wide dead-anchor bug: no `rehype-slug` meant MDX headings carried no `id` at all, so every in-page anchor across the site was dead, including a pre-existing `[Fernhill sample](#the-folly-at-fernhill)` link. Added `rehype-slug` to `next.config.ts`'s `rehypePlugins`. Verified ids generate and all hrefs resolve; `pnpm build` passed clean at 2026-08-12T08:49:22Z and again at 08:50:21Z (after the last content.mdx edit at 08:50:12Z) — `docs/context/.devarch-events-1744e6.jsonl`.

## Key Decisions

### 1. Kill the planned ChordVersionCheck feature
`tree-document.ts`'s existing too-new-version refusal (AC-4) is a stronger guard than the proposed feature, and the coupling concern that motivated it was based on a stale reading of ADR-294 D9 (Dungeo's text-world transcript tester, not Chord's JSON-tree serialization). Four ADRs were amended to stop repeating the stale claim rather than build a redundant mitigation.

### 2. Isolate one variable at a time when bisecting notarization
The universal-build attempt initially changed both architecture and build route simultaneously, reproducing the exact confound the original bisection was designed against. Corrected by re-testing arch alone via `lipo -thin`, which cleanly isolated the x86_64 slice as an independent trigger. Recorded as a decision because the same mistake is now visible twice across sessions and should not repeat a third time.

### 3. Restore the Finder alias in assemble-dmg.sh
Claude's untested theory (alias breaks drag-install) was wrong; David's direct test overruled it. The alias is restored with an inline comment recording the verified-working state, so a future session does not re-attempt the same unverified fix.

## Next Phase
- **Phase 1**: "Elicit and draft the skeleton demonstration story (D14)" — Small tier, ~100 tool-call budget. Blocked on David's story content per CLAUDE.md's "never invent story content" rule; unchanged this session.
- **Entry state**: ADR-310 is ACCEPTED, no grammar work started. Same blocker as the prior session — this and the previous session are both entirely off-plan.

## Open Items

### Short Term
- The DMG 404s on both `www.sharpee.net` and `sharpee.net` from `~/repos/sharpee/website/public/downloads/ChordWriter-1.0.0.dmg` on plover, despite the byte count (9,929,857) confirming the correct file is present — the Fernhill zip serves 206 from the same directory. `next.config.ts` sets no `output` mode; diagnosis points to the running Next server not serving that working directory, or needing a restart. Needs server-side action David must perform.
- `notarization-bisection.md` does not yet contain today's DMG sequence: the SIGBUS orphan/recovery, and the `8287cbd9` vs `1513b801` non-determinism pair.
- `package.sh` should recover an orphaned submission by matching artifact name in `notarytool history` rather than requiring `.notarize-state` to be hand-written — needed twice now across sessions.
- Submission `5133a8de` (universal/x86_64) was still `In Progress` at session end — the only live probe of the x86_64 trigger; its eventual outcome hasn't been captured.
- AC3 (Gatekeeper check on a clean machine) and AC6 (install + Cmd-B smoke test) remain unverified.

### Long Term
- Intel support is gated on resolving the x86_64 notarization trigger, not on any build setting — do not re-attempt a universal build until that trigger is understood.
- ADR-308 testing-navigation interview still not started (carried from prior sessions).

## Files Modified

**ADRs** (3 files):
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` - D4 coupling note corrected; says the mitigation it asked for should not be built
- `docs/architecture/adrs/adr-300-addressable-channels-and-canonical-transcript.md` - status line, D1, D3 scoped to the text world only
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` - header scoped to ADR-307 dependency; names `serializeTreeDocument`

**Work docs** (2 files):
- `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md` - new; consolidated evidence, first-hand re-verified
- `docs/work/adr-279-chord-writer-packaging/plan.md` - bisection pointer added; ADR-287 reference marked STALE

**IDE/packaging** (3 files):
- `tools/ide/package.sh` - `--no-toolchain` adopt mode, `warn()` helper, corrected npm package name
- `tools/ide/project.yml` - `ARCHS` flipped to universal then reverted to `arm64`, with the x86_64-trigger evidence recorded inline
- `tools/ide/dmg/assemble-dmg.sh` - `.fseventsd` removal before detach; Applications alias restored with a verified-working comment

**Website** (3 files):
- `website/next.config.ts` - added `rehype-slug` to `rehypePlugins`, fixing site-wide dead in-page anchors
- `website/src/app/chord-writer/content.mdx` - "If macOS refuses to open it" rewritten to match a stapled build's actual behavior
- `website/src/app/chord-writer/download/content.mdx` - restructured into "Temporary installation instructions" / "Future state" sections

**Generated (side effect of MDX edits)**: `tools/ide/SharpeeIDE/Resources/docs-tab/*`, `website/public/search-index.json` — the IDE bundles the same MDX source.

**Uncommitted, untracked, out of scope**: `scripts/clodpod.sh` — David's Tart VM script (deliberately untracked, not from this session's work; do not stage).

## Notes

**Session duration**: ~1h47m (2026-08-12T07:03 UTC start / 02:03 CDT to ~03:50 CDT).

**Approach**: Continuation of the prior session's (d406a4) off-plan Chord Writer packaging push — evidence consolidation, then a sequence of real-path build/notarize/package attempts on the actual toolchain, each result folded back into ADRs and scripts rather than left as a one-off finding.

**Self-verification gap**: no `.session-template.md` exists in `docs/context/` in this repository; this summary follows the full-form template embedded in the work-summary-writer agent definition instead.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Packaging / Deployment — the correct, stapled DMG is uploaded to plover but 404s on both site domains; publication requires a server-side fix David must perform (working directory or process restart), not a code change.
- **Blocker Category**: Deploy
- **Estimated Remaining**: ~1 session, contingent on David's server-side diagnosis — the packaging/notarization work itself is done; only publication remains.
- **Rollback Safety**: safe to revert — no packages/ code touched, all changes are in tools/ide, website, and docs.

## Dependency/Prerequisite Check

- **Prerequisites met**: Apple Developer ID signing identity, `dc-notary` keychain profile, working `xcrun notarytool`/`stapler` toolchain, esbuild optional-deps verified architecture-agnostic.
- **Prerequisites discovered**: A working Next.js server process on plover with the correct working directory/static-serving configuration was assumed but is not actually confirmed working for this content path — discovered as this session's blocker.

## Architectural Decisions

- No new ADR written this session. Four existing ADRs (279, 300, 301) plus the ADR-279 work plan were amended to remove stale claims about Chord testing coupling — see Key Decisions #1.
- Pattern applied: ADR-0019-style evidence discipline — every notarization claim in `notarization-bisection.md` is tied to a first-hand `xcrun notarytool history` re-verification with timestamps and full submission UUIDs, not carried forward from memory of prior sessions.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/package.sh` (`--no-toolchain` gate logic), `tools/ide/dmg/assemble-dmg.sh` (`.fseventsd` removal, alias restoration).
- Tests verify actual state mutations (not just events): N/A — these are packaging/build shell scripts, not application code with a unit-test harness; verification was via real-path fixture runs (three `package.sh` fixtures: toolchain-present refused, bare bundle passes gate, control refused without flag) and the end-to-end DMG chain producing a Gatekeeper-accepted artifact (submission `1513b801`).
- If NO: N/A — real-path fixture/artifact verification is the applicable bar for shell packaging scripts per rule 13a, and it was met.

## Recurrence Check

- Similar to past issue? YES — notarization/packaging is now the recurring blocker across four consecutive sessions (this session, `session-20260812-0152-feat-adr-310-character-in-chord.md`, and the two sessions referenced within `notarization-bisection.md` before that). Each session has advanced the bisection (old-team credentials, devkit-content trigger, now the x86_64-arch trigger and a DMG-level non-determinism signal) without reaching a fully green, published state.
- If YES: Consider a one-time audit of the notarization pipeline itself — specifically the `notarytool submit` SIGBUS pattern (confirmed twice now, orphaning submissions before the ledger is written) and the unexplained non-determinism between `8287cbd9` (hung 21+ min) and `1513b801` (accepted in <30s) despite identical script and content-affecting inputs.

## Test Coverage Delta

- Tests added: 0 (no test files touched; this was packaging/docs/website work).
- Tests passing before: N/A → after: N/A. Related evidence: IDE test suite run once during the universal-build attempt — 480 passed, 0 failed [reported by session, unverified — no corroborating event-log row found for this specific run]. Website `pnpm build` passed twice, corroborated: 2026-08-12T08:49:22Z and 08:49:50Z/08:50:21Z (after the last relevant edit at 08:50:12Z) — `docs/context/.devarch-events-1744e6.jsonl`.
- Known untested areas: AC3 (Gatekeeper on a clean, non-dev machine) and AC6 (install + Cmd-B smoke test) remain unverified per Open Items.

---

## Addendum — post-finalize work (2026-08-12 04:00-05:00 CDT)

The session above was a mid-session finalize (commit-remote pushed `dc435214` at 08:59 UTC / 03:59 CDT). The session continued after that push; this addendum covers everything that followed. The session event log (`docs/context/.devarch-events-1744e6.jsonl`) ends at the finalize commit, so evidence for this addendum is either verified directly in this closing pass (noted inline) or carries the `[reported by session, unverified]` marker per ADR-0019.

### Analytics dashboard — started, then stopped

David asked for a page to view site analytics. Established the existing collector shape by reading code: `website/src/app/api/p/route.ts` (POST-only collector), append-only JSONL at `SHARPEE_ANALYTICS_DIR` (`/var/lib/sharpee-analytics`), record shape `{ts, day, type, asset, vid, sid, path, ref, lang, tz, sw, sh, vw, vh, browser, os, device, iph}`, files named `events-YYYY-MM.jsonl`, IPs hashed with a daily-rotating salt. No dashboard route and no query tool exist. Loaded the `dataviz` skill and read the site's color tokens in preparation. David interrupted to say pull the main branch first — **the dashboard was never built.**

Noted in passing: the inline beacon fires a `download` event on any `/downloads/` click, so clicks on the then-broken DMG link (see below) were logged as downloads that actually 404'd — a latent data-quality wrinkle in any future dashboard's download-count metric.

### Merged origin/main — duplicate fix, better anchor solution

Merged `origin/main` (commit `5b8cb511`). A parallel session had independently pushed `56275bbe` "fix(website): Chord Writer pages promised a toolchain the DMG doesn't carry" — fixing the same two Chord Writer copy bugs this session had already fixed pre-finalize. Conflicts landed in both `chord-writer/content.mdx` files and `search-index.json`.

Their `prose.tsx` anchor fix was better than this session's `rehype-slug` approach: they derive heading ids directly in `ProseH2`/`ProseH3` and fixed `ProseLink`, which had been routing `#anchor` hrefs through `next/link` (treating the fragment as a route) — a bug this session's `rehype-slug` addition would not have caught, since it only supplied missing ids and never touched link routing.

Resolution: took main's framing (tightened `Callout`, "What you need" list, terminal-section wording), layered David's requested Temporary/Future-State split and the Gatekeeper-section rewrite on top, and dropped main's duplicate pre-download install block. **Removed this session's `rehype-slug` addition entirely** — `next.config.ts` reverted with a comment pointing at `prose.tsx` as the actual fix (verified present at line 48 in this closing pass), and the `rehype-slug` dependency uninstalled (verified absent from `website/package.json`). Also dropped the Intel-support paragraph, following main's deletion.

### Verified the deploy

`ChordWriter-1.0.0.dmg` now serves 206 `application/octet-stream` on `www.sharpee.net` — the 404 noted as this session's blocker before the finalize is resolved. The live copy carries `npm install -g @sharpee/devkit` and no longer claims the app "brings its own" toolchain or "asks nothing else."

### Fixed stale Chord testing docs

David: "the transcript docs weren't updated in the Chord portion of the website." `website/src/app/chord/getting-started/compose-and-run/content.mdx` taught the retired workflow end-to-end — a `tests/` directory of `.transcript` files, `[OK: contains "…"]` grammar, `--chain`, invented runner output. Every element in it fails by name against `packages/devkit/src/commands/test.ts:59-75`. Rewrote as the tree-document model, using real runner strings pulled from `test-tree-document.test.ts` (`Tree document: … (seed 42, 2 line(s))`, `✓ opening-den`, `4 cards passing, 5 assertions passing`), plus a `Callout` for readers arriving with `.transcript` expectations. States plainly that tests cannot be hand-written — they are recorded in the Testing tab. Also corrected the stale `sharpee test` usage line in `website/src/app/chord/getting-started/install/content.mdx`.

Audited roughly 35 other "transcript" hits across `/chord/`: they use the word for sample play output displayed on the page, a different sense, and are correct as-is. The one `.transcript` filename referenced (stdlib/death/traits) is a Dungeo fixture and is correct.

**Found but not fixed** (platform code, needs David's go-ahead): `packages/devkit/src/cli.ts:49-50` still advertises `[transcripts…]` and `--chain` and calls them "transcript tests" — the CLI's own `--help` output instructs users toward forms the CLI itself rejects.

### New Core Concepts directive

At David's instruction, added a new subsection "Never rely on ADRs for architecture — read the code" to `docs/core-concepts/README.md` under "Where the work is" (verified present at line 16 in this closing pass). It names four ways ADRs go stale and carries both of this session's own errors as worked examples: (a) quoting ADR-294 D9 to wrongly conclude the IDE still used fence-grammar transcripts, when `packages/branch-tester/src/index.ts:9-14` shows ADR-307 retired that grammar; (b) describing a side-by-side "blessing" gesture in the tree model that does not exist. Both were caught by David, not by Claude. Root cause named in the directive: reasoning about the current system in a retired paradigm's vocabulary.

### ADR-312 written and accepted

Wrote and got accepted `docs/architecture/adrs/adr-312-recording-tests-from-the-command-line.md` (new file, verified present), "Recording Tests from the Command Line — a Second Writer, One Model." Status line reads `ACCEPTED (2026-08-12, session 1744e6)` (verified directly).

Origin: fixing the stale Chord docs above exposed that the CLI has no way to author a test — `sharpee test` only replays a document the IDE wrote, and `play.ts` has no record/bless/capture path. Since Chord Writer is arm64-macOS-only and cannot be built universal (this session's own pre-finalize notarization finding), test authoring is gated on owning Apple silicon.

Nine decisions, key ones: **D1** the tab becomes *a* recorder, not *the* recorder (amends ADR-307). **D2** per-element assertions only, never a whole-output blob — this reverses a Claude proposal to default to `exact`; David corrected it. **D3** one spelling of synthesis: calls `synthesizePolicyAssertions`, never re-implements it. **D5** the command list is a committed artifact — newline-delimited text, `<name>.list.txt` in the project root. **D6** there is no "blessing" step in the tree model. **D7** IDE and CLI agree *contractually* (David's word). **D8** reconcile divergence by whole-line replace with author-chosen direction — David reversed an earlier merge-based instinct here ("merge might be more than we can take on"). **D9** `sharpee record` ships as a peer command so `sharpee test` stays read-only.

Interview: all four Open Questions resolved via `/devarch:adr-interview`; Q-2 was dissolved by D8 rather than directly answered.

`adr-review` pass: 11/18 NEEDS WORK → four gaps closed (an Implementation section, D8's six enumerated steps, a worked example, list-naming clarification) → 18/18 READY FOR IMPLEMENTATION → accepted by David. The Status line records the provenance caveat that this review was self-administered (same session, no independent pass).

Enumerating D8's six steps surfaced a hole the review itself missed: a tab-recorded line had no way to acquire a `.list.txt`, contradicting D5. Fixed by adding a four-way branch to step 2.

ADR-307's recorder language was deliberately **not** flipped this session — ADR-307's own precedent is that supersession language changes land at the cutover, not at the amending ADR's acceptance.

### Code facts established by reading (per the new directive)

- `packages/branch-tester/src/tree-walker.ts:79-85` — the walker clears the auto-assertion policy; a document run "evaluates exactly what the document says and assumes nothing" — a bare card is a failure. A recorder must therefore persist claims; there is no live-synthesis fallback on the tree path.
- `packages/branch-tester/src/tree-document.ts:72` is stale — its comment describes `TreeCard.assertions` as "policy defaults synthesize live, never persist," which is retired v2 behavior. The live-synthesis call actually lives at `runner.ts:858`, inside `runTranscript` (the ADR-294 assertion-tier path) — a different runner entirely. **Not fixed** — this is `packages/`, needs David's go-ahead.
- `TreeAssertions` has six positive families and no way to represent a deliberately deleted claim; the grammar is closed and `TREE_DOCUMENT_VERSION = 1`.
- `packages/branch-tester/src/auto-assertion.ts` is the shared synthesis engine; `DEFAULT_AUTO_ASSERTION_POLICY = 'room-name-and-description'`.

### Addendum — Files touched

**Website** (merge resolution + doc fixes, beyond the pre-finalize list): `website/src/app/chord-writer/content.mdx`, `website/src/app/chord-writer/download/content.mdx` (merge-resolved with main), `website/next.config.ts` (rehype-slug reverted), `website/src/app/chord/getting-started/compose-and-run/content.mdx` (rewritten for the tree-document model), `website/src/app/chord/getting-started/install/content.mdx` (stale `sharpee test` line fixed), `website/public/search-index.json` (generated, merge side-effect).

**Docs**: `docs/core-concepts/README.md` (new "read the code, not ADRs" subsection).

**New ADR**: `docs/architecture/adrs/adr-312-recording-tests-from-the-command-line.md`.

### Addendum — Open Items (supersedes the Open Items section above)

The pre-finalize Open Items are resolved as follows: the DMG-404 item is **resolved** (verified serving 206 in this closing pass). `notarization-bisection.md` still lacks today's DMG sequence — carried forward unchanged. AC3/AC6 verification — status unchanged, still outstanding.

New items from the addendum:

- Analytics dashboard page — not built; David asked to pull main first, then the session moved to the merge/doc-fix/ADR-312 work instead.
- `packages/devkit/src/cli.ts:49-50` stale `--help` text (`[transcripts…]`, `--chain`, "transcript tests") — needs David's go-ahead; now scoped into ADR-312's implementation.
- `packages/branch-tester/src/tree-document.ts:72` stale comment describing retired live-synthesis behavior — needs David's go-ahead.
- ADR-312 implementation awaits its own plan; ADR-307's recorder-language flip is owed by whoever lands that implementation.
- Submission `5133a8de` (universal build) was still `In Progress` at pre-finalize checkpoint and never returned a verdict — still the only live probe of the x86_64 notarization trigger; unresolved.
- `notarization-bisection.md` still lacks today's DMG sequence (the SIGBUS orphan + hand-recovery, and the `8287cbd9` vs `1513b801` pair that weakens the content-determinism assumption).
- Branch name no longer describes contents: `feat/adr-310-character-in-chord` carries zero ADR-310 work this session or last; ADR-310 Phase 1 remains blocked on David's story content.
- Carried: ADR-308 testing-navigation interview still not started.

## Session Metadata (whole session, supersedes the metadata block above)

- **Status**: INCOMPLETE
- **Blocker**: None single-item — multiple independent threads left open (analytics dashboard unbuilt; two stale-doc items in `packages/` awaiting go-ahead; ADR-312 has no implementation plan yet; x86_64 notarization trigger unresolved). None of these block the branch from being safely left as-is.
- **Blocker Category**: Other: multi-thread carryover (see Open Items)
- **Estimated Remaining**: ~1-2 sessions — ADR-312 implementation is its own multi-session effort once planned; the doc/CLI fixes are each small once David authorizes touching `packages/`.
- **Rollback Safety**: safe to revert — no `packages/` source touched this session (ADR-312 is a proposal document, not code); all addendum changes are in `website/`, `docs/`, and the merge from main.

## Recurrence Check (addendum note)

The "reasoning from a retired paradigm's vocabulary instead of reading the code" error (see Core Concepts directive above) occurred **twice** in this single session: once pre-finalize (the ADR-294 D9 / fence-grammar misreading, already logged in the base summary's Key Decisions #1) and once in the post-finalize compose-and-run doc rewrite (describing a non-existent "blessing" gesture). Two occurrences in one session, on top of the notarization-blocker recurrence already noted in the base summary's Recurrence Check, is what prompted writing the new directive rather than treating it as a one-off correction.

---

**Progressive update**: Session completed 2026-08-12 05:00 CDT (addendum to the 03:50 CDT mid-session finalize)
