# Session Summary: 2026-08-13 - feat/adr-312-cli-test-recording

## Goals
- Multi-ADR review of ADR-313 and ADR-314 before either can start its open-questions interview.
- Resolve the Chord Writer notarization blocker (ADR-279) that had defeated four prior sessions of bisection.

## Phase Context
- **Plan**: docs/work/adr-312-cli-test-recording/plan.md — "Implement ADR-312 — Recording Tests from the Command Line" (goal now stale; ADR-312 was retired last session and replaced by ADR-313/314, per the plan's own header).
- **Phase executed**: None. Phase 1 ("Relocate record-time assertion synthesis…") remains `CURRENT (since 2026-08-12)`, unchanged this session — its blocker (ADR-313/314 open questions) is the reason Half 1 happened, but the review added open questions rather than closing them.
- **Tool calls used**: 263 (session-state field; not tied to a phase budget since no phase executed).
- **Phase outcome**: Not applicable — this session's two halves (ADR review, ADR-279 notarization) both sit outside the plan's phase breakdown.

## Completed

### ADR-313 / ADR-314 multi-ADR review
- Ran `/devarch:adr-review` in multi-ADR mode. Verdicts: ADR-313 BLOCKED (10/14), ADR-314 NEEDS WORK (6/13). 5 blockers + 6 smaller findings, all folded in.
- ADR-314 fixes: stale Q-id back-references (D3/D9/D10 cited deleted questions; D5 cited Q-8 for what is now Q-7); `WorldModel.evaluateScope(actorId)` has no per-room entry point (`WorldModel.ts:1611-1620`), so D4/D9's central mechanism doesn't exist as described — new Q-9 added; D5 self-contradiction (lemmatize listed portable while assigned to `NLTagger.lemma`) resolved and the "computed identically on every platform" guarantee withdrawn; the cited "ADR-306 D4" does not exist — that boundary belongs to ADR-305 and ADR-306 only records it superseded — citation replaced with ADR-306's post-go-live ruling 1; missing Implementation row for D10's required Chord IR prose reader added, plus AC-12/AC-13.
- ADR-313 fixes: notarization claim re-cited from ADR-279 D4's amendment (wrong source) to `tools/ide/project.yml:140-156`; new Q-7 (write-lock recovery); Q-4 sharpened; Q-6 deferred to be decided jointly with ADR-314 Q-2; AC-5 marked macOS-gated; AC-8 now shares a no-write helper with ADR-314 AC-11.
- 15 code citations verified by grep during review; 1 was wrong and corrected.
- Result: ADR-313 now carries 7 open questions, ADR-314 now 9. Both remain **DRAFT** — neither interview has started (rule 11a).

### Chord Writer notarization root cause (ADR-279)
- ~20 submissions across 5 rounds this session; full ledger at `docs/work/adr-279-chord-writer-packaging/fixtures/RESULTS.md`.
- **The finding**: Apple's notary intermittently stalls, independent of content. A byte-identical archive (SHA-256 `43a3bddb…76d`) submitted twice: `359b004e` In Progress at 10h+, `f0c04838` Accepted in 72s (`RESULTS.md:40-41`). This falsifies the 2026-08-12 bisection's "content-borne, layout-independent" conclusion and its eight exonerated properties.
- Deletion behavior measured directly: 7 of 8 hung submissions deleted between `16:22:37Z` and `17:42:41Z` (`RESULTS.md:111-113`) — earliest observed deletion 10h42m after creation, not the previously recorded 21-26h, and not age-ordered (`R-toolchain`, created `05:59:10Z`, survived while `N-control`, created `05:40:32Z`, was deleted — `RESULTS.md:120-130`).
- Confirmed the prior day's 7 hung submissions were deleted, not completed, killing the "slow queue, patience is the fix" hypothesis.
- **Shipped**: `ChordWriter-1.0.0.dmg`, 56MB, toolchain-bearing, signed, notarized, stapled; Gatekeeper reported accepting it (`source=Notarized Developer ID`) — reported by the session, no command-output or event-log corroboration captured this pass (see Status). First toolchain-bearing build ever to ship. Route: Xcode archive with `SHARPEE_VENDOR_TOOLCHAIN=1` → Distribute App → `package.sh --dmg-from`.

### Documentation and tooling accompanying the notarization work
- `tools/ide/vendor-toolchain.sh`: step 4.6 added, reverted, then restored corrected. Signs every vendored Mach-O (Developer ID, hardened runtime, timestamp); `node` gets `bundled-node.entitlements`. Needed because Xcode's Distribute App does not sign `Contents/Resources` payloads and refuses the archive ("esbuild must be rebuilt with support for the Hardened Runtime"); `package.sh`'s own signing loop only runs on its own build path, not Xcode's.
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md`: amendment rewritten twice. INTERIM's premise falsified, no code defect existed in July's design, `--no-toolchain` retained with changed rationale, §5a's Intel/universal conclusion flagged unsafe/untested — a single matched pair is exactly the shape now known to occur by chance.
- `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md`: superseded header added — conclusions void, underlying data (ledger, Invalid-in-113s behavior, nested-archive descent, deletion timing) stands.
- `website/src/app/chord-writer/{content,download}.mdx`: rewritten to the self-contained flow. A `STAGE` build passed at `15:59:28Z` (event log), but `content.mdx` received two further edits afterward (`16:11:58Z`, `16:12:21Z`) with no subsequent build event — the "tsc + next build clean" claim does not cover the file's final content (see Status). `tools/ide/SharpeeIDE/Resources/docs-tab/*` was regenerated by that build.
- New scratch/working material: `fixtures/` (`make-fixtures.sh`, `make-archive-fixtures.sh`, `make-discriminator-fixtures.sh`, `make-signed-fixtures.sh`, `RESULTS.md`, `.gitignore`), `forum-post-draft.md`, `dts-incident-draft.md`.

## Key Decisions

### 1. Apple's notary is now treated as intermittently unreliable, not deterministic on content
This retires four prior sessions' worth of bisection conclusions as void. The only design that has produced a falsifiable result in five sessions of trying is a matched pair of byte-identical submissions at staggered times — cohort comparison against intermittent infrastructure cannot separate signal from noise.

### 2. `vendor-toolchain.sh`, not `package.sh`, is now the single signing point for the Xcode-archive route
Xcode's Distribute App doesn't sign `Contents/Resources` payloads, so signing has to happen before the archive is handed to Xcode rather than in `package.sh`'s own loop, which never runs on that path.

### 3. This session's four retracted claims are recorded, not smoothed over
In sequence: (1) "content-borne" trigger; (2) "name-borne," based on believing ZipCrypto made `G-encrypted` opaque — it doesn't, it publishes the central directory; (3) "encryption/size exonerated," based on fixtures that had been early-gate rejected ("no signed executables or bundles") and never reached the stage that stalls — a fixture-design defect introduced by stripping the Mach-O; (4) ad-hoc-signed esbuild identified as the app's root cause and written into an ADR plus a `vendor-toolchain.sh` step, when `package.sh` already signed it generically — that `Invalid` was an artifact of a bare-zip fixture bypassing `package.sh`. Common thread: comparing cohorts submitted at different times against intermittent infrastructure.

## Next Phase
- **Phase 1** (unchanged): "Relocate record-time assertion synthesis into `@sharpee/branch-tester`…" — still `CURRENT (since 2026-08-12)`, blocked on ADR-313 and ADR-314 leaving DRAFT.
- **Entry state to resume Phase 1**: both ADR-313's (7 questions) and ADR-314's (9 questions) open-questions interviews (rule 11a) complete, both ADRs flipped ACCEPTED.
- This session did not advance the plan; it revised the shape of the blocker rather than removing it.

## Open Items

### Short Term
- Apple Developer Forums thread 841846 posted (public, 15 views, no replies); account can post but not reply to peers — email support pending.
- DTS incident draft ready at `docs/work/adr-279-chord-writer-packaging/dts-incident-draft.md`, unfiled.
- Intel/universal re-test — untested and cheap; should run before any further arch-specific claims.
- DMG not yet uploaded to plover (user pulling it there directly).
- AC3 (Gatekeeper check on a clean, unrelated Mac) and AC6 (install + Cmd-B smoke test) deferred.
- Start ADR-313 and ADR-314 open-questions interviews (rule 11a) — both still DRAFT.

### Long Term
- Re-plan the ADR-312-successor CLI-recording work once ADR-313/314 are ACCEPTED.
- The 115 ADR-reference-in-error-message instances flagged in the prior session remain unswept.

## Files Modified

**ADR review** (2 files):
- `docs/architecture/adrs/adr-313-tree-second-serialization.md` - 5 blocker fixes + smaller findings folded in; now 7 open questions
- `docs/architecture/adrs/adr-314-content-coverage-reports.md` - 5 blocker fixes + smaller findings folded in; now 9 open questions

**Notarization / ADR-279** (3 files + 1 new directory):
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` - amendment rewritten twice; INTERIM premise falsified, §5a flagged unsafe
- `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md` - superseded header, conclusions voided, data retained
- `tools/ide/vendor-toolchain.sh` - step 4.6 added/reverted/restored: signs vendored Mach-O binaries for the Xcode-archive route
- `docs/work/adr-279-chord-writer-packaging/fixtures/` (new) - `RESULTS.md` ledger + 4 fixture-generation scripts + `.gitignore`

**Website** (2 files, regenerates 3 IDE doc-tab resources):
- `website/src/app/chord-writer/content.mdx` - rewritten to self-contained flow
- `website/src/app/chord-writer/download/content.mdx` - rewritten to self-contained flow
- `tools/ide/SharpeeIDE/Resources/docs-tab/{docs-index.json,pages/chord-writer.html,pages/chord-writer__download.html}` - regenerated by the website build

**Untracked drafts** (2 files):
- `docs/work/adr-279-chord-writer-packaging/forum-post-draft.md` - Apple Developer Forums thread 841846 source
- `docs/work/adr-279-chord-writer-packaging/dts-incident-draft.md` - DTS incident report, unfiled

## Notes

**Session duration**: event log spans 01:15Z to 18:04Z (last edit); treat as a bounding span, not continuous effort — the session had two distinct, separately-scoped halves.

**Approach**: Half 1 ran the `adr-review` skill in multi-ADR mode specifically to catch cross-ADR seam issues (the ADR-306 boundary confusion, the shared no-write helper) that per-ADR review misses. Half 2 abandoned the prior sessions' cohort-bisection method in favor of matched-pair submission (identical bytes, staggered times) — the only design capable of separating "content causes this" from "infrastructure is flaky."

**`scripts/clodpod.sh`** is a pre-existing, deliberately untracked file (per `project_clodpod_tart_vm`), unrelated to this session — it is not in the session-state `files` array and should not be staged. The `/private/tmp/.../scratchpad/poll-*.sh` and `watch-hung.sh` scripts in the `files` array are ephemeral polling loops used while waiting on notarization submissions this session; they live outside the repo and are not part of the deliverable.

---

## Session Metadata

- **Status**: COMPLETE (unverified: website tsc/next-build freshness after the final mdx edits; Gatekeeper `spctl` acceptance on the shipped DMG)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are docs/ADR/website content plus one signing-script addition; no `packages/` source touched this session.

## Dependency/Prerequisite Check

- **Prerequisites met**: `tools/ide/vendor-toolchain.sh` output was available to regenerate fixture payloads for the matched-pair test.
- **Prerequisites discovered**: the 2026-08-12 bisection's fixture set could not be reproduced — its generation scripts were never preserved — forcing this session to rebuild a fixture pipeline (`fixtures/make-*.sh`) from scratch before the matched-pair test could run.

## Architectural Decisions

- ADR-313, ADR-314: reviewed via `/devarch:adr-review` multi-ADR mode; both remain DRAFT with expanded Open Questions (7 and 9). No ADR promoted to ACCEPTED this session.
- ADR-279: amendment rewritten twice — the INTERIM section's "content-borne, layout-independent" trigger premise is retracted; §5a's Intel/universal conclusion is flagged unsafe/untested rather than removed, since its single-matched-pair test is exactly the shape now known to produce spurious results by chance alone.
- Pattern applied: matched-pair experimental design (byte-identical submissions, staggered submission times) replacing cohort comparison — the only method across 5 sessions of notarization work to produce a falsifiable result.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/vendor-toolchain.sh` (adds a codesign step over vendored binaries).
- Tests verify actual state mutations (not just events): N/A — no automated test harness exists for the signing script. Verification was the real Xcode-archive → notarization → stapled-DMG pipeline itself (Gatekeeper `source=Notarized Developer ID`), reported by the session but not corroborated by the event log or an inline command output this pass.
- If NO: a future session should capture the `spctl -a -vvv` (or equivalent Gatekeeper) command and its output, dated, inline in the summary rather than narrating the result.

## Recurrence Check

- Similar to past issue? YES — `session-20260812-1944-feat-adr-312-cli-test-recording.md`'s `pattern-recurrence-detector` run already flagged "Notarization pipeline root-cause churn — 4 sessions (2232, 1540, 0152, 0703)" before this session ran. This session adds a 5th prior root-cause claim (ad-hoc-signed esbuild) that was made and retracted within the same session, extending the pattern to 5 sessions — but is also the session where the pattern finally broke, via matched-pair design rather than another round of cohort inference.
- If YES: re-run `pattern-recurrence-detector` (rule 19) given this session's own four sequential retracted claims.

## Test Coverage Delta

- Tests added: 0 (no automated test suite changed this session)
- Tests passing before: N/A → after: N/A — event log records 2 `kind:"build"` rows only (ESB toolchain build at `04:53:58Z`, website STAGE build at `15:59:28Z`, `docs/context/.devarch-events-73a646.jsonl`); no `kind:"test"` rows this session.
- Known untested areas: the shipped DMG's Gatekeeper acceptance and the website mdx build's final state (post-`16:12:21Z` edits) are both reported by the session narrative with no corroborating event-log or command-output evidence captured this pass.

---

**Progressive update**: Session completed 2026-08-13 13:06

---

## Post-session verification — 2026-08-13 (appended)

The two acceptance criteria this summary and the `pattern-recurrence-detector`
run both flagged as `[reported, unverified]` are now verified inline, on the
installed DMG rather than the build tree.

**AC6 — ⌘B works with no global toolchain.** David installed the shipped DMG and
confirmed the build succeeds. Verified that no global install could have
satisfied it, so the resolution genuinely fell to tier 3 (ADR-279 D4's bundled
toolchain):

```
$ which sharpee
sharpee not found
$ npm ls -g @sharpee/devkit --depth=0
└── (empty)
$ "/Applications/Chord Writer.app/Contents/Resources/toolchain/bin/sharpee" --version
Sharpee 5.0.0 · Chord 3.0.0
```

This is the first time ADR-279 D4's premise has held end to end: a machine with
no Node, no npm and no CLI builds a story straight off the DMG.

**AC3 — Gatekeeper.** `package.sh`'s own assessment during the release run:

```
/Users/david/repos/sharpee/tools/ide/release/ChordWriter-1.0.0.dmg: accepted
source=Notarized Developer ID
origin=Developer ID Application: David Cornelson (RSNGKW5LNH)
```

Still outstanding: acceptance on a Mac that never built this one — the assessment
above ran on the build machine.

**Installed artifact**, `/Applications/Chord Writer.app`: 177M, `arm64`,
`toolchain: present`, `stapler validate` passes, `Identifier=net.sharpee.chord-writer`,
`TeamIdentifier=RSNGKW5LNH`.

**§5a falsified — the x86_64 notarization trigger is not real.** A universal
(`x86_64 arm64`) build was archived, signed, and submitted
(`975d1c21-68bd-400a-a591-14818bb4b425`, 18:23:00Z): **Accepted in ~103
seconds**. The 2026-08-12 conclusion rested on a single matched pair 14 minutes
apart, which is exactly the coin-flip this session showed that evidence to be.
Intel remains unshippable for a different and real reason — only
`node-v22.23.1-darwin-arm64.tar.xz` is vendored, so an x86_64 slice would ship
with no toolchain behind its Build button. David's direction: **separate
per-arch installers** rather than a universal binary. `@esbuild/darwin-x64@0.27.2`
is already in `pnpm-lock.yaml`, so the x64 closure is resolvable.

**A packaging bug found while diagnosing duplicate app icons**: `package.sh`
does not detach the disk image it mounts during DMG assembly. Four volumes
(`Chord Writer 1.0.0`, ` 1`, ` 2`, ` 3`) were left mounted across today's runs,
each registering with Launch Services as another copy of the app — one of which
presents as an installer rather than the installed app. Detaching them resolved
it. The leak is in the assembly path, not in the DMG.
