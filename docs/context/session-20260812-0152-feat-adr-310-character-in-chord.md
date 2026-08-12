# Session Summary: 2026-08-12 - feat/adr-310-character-in-chord (CDT)

## Goals
- Resolve the Chord Writer notarization blocker carried over from the prior session (submission e4244248, In Progress 4h40m+, no verdict).
- Diagnose why toolchain-bearing app bundles never return a notarization verdict, via controlled fixture bisection.
- Harden `tools/ide/package.sh` with a `--dmg-from` adoption path and fix the signing-identity ambiguity bug.

## Phase Context
- **Plan**: `docs/work/character-in-chord/plan.md` — "Map the Character Model (ADR-141/142/144/145/146) into Chord" (ADR-310).
- **Phase executed**: None. No ADR-310 plan work happened this session — David's story content (setting, fact graph, title) is still the Phase 1 blocker. This entire session was Chord Writer packaging/notarization work, orthogonal to the plan.
- **Tool calls used**: 134 (session state `.session-state-d406a4.json`).
- **Phase outcome**: N/A — no plan phase touched.

## Completed

### Thread 1 — notarization resolved via Xcode; prior session's team-mismatch theory disproved
- Prior submission e4244248 (package.sh CLI path, toolchain-bearing) is still In Progress at 4h40m+ and has never returned a verdict.
- `notarytool history` surfaced a different, already-Accepted submission: 8cddb5ae "Chord Writer.zip" (02:59 UTC), from David's Xcode Distribute App export of archive `SharpeeIDE 8-11-26, 9.58 PM.xcarchive`. David exported it to `tools/ide/release/Chord Writer.app`.
- Verified the export: `stapler validate` passes; CDHash 99e285ac matches the accepted ticket exactly; TeamIdentifier RSNGKW5LNH; `spctl -a -t exec` reports `accepted / source=Notarized Developer ID`. The day-long notarization blocker is cleared for this artifact.
- Corrected the prior session's conclusion: it attributed the hang to a team mismatch (app signed by 54CCCRZJ3X, submitted under RSNGKW5LNH) and predicted a re-submission under the correct team would return in under an hour. That prediction failed — e4244248 already carries the correct cert and is still hung 4h40m+ in. The credential bug was real but was never the cause of the delay.
- Found the exported app is not shippable: `Contents/Resources/toolchain` is absent entirely. `project.yml:99` gates vendoring on `SHARPEE_VENDOR_TOOLCHAIN=1`, which Xcode's Distribute App UI never sets, so the post-build script silently skipped it. Chord Writer without its third tier cannot build a story on a machine lacking a global `sharpee`.
- Also established the Xcode path can never produce a shippable app on its own: nothing in the Xcode target signs the Mach-O binaries the post-build script drops into Resources, and the vendored node needs its own entitlements — this is exactly what `package.sh` step 5 exists for.

### Thread 2 — `package.sh --dmg-from` implemented (uncommitted)
- Added `--dmg-from <app>`: adopts an app already signed, notarized, and stapled elsewhere (an Xcode export or a prior `package.sh` run), verifies it, stages it, then runs DMG → sign → notarize → staple → checksum, replacing steps 2-7. Refuses `--rebuild` / `--skip-platform-build` / `--no-notarize` as contradictions.
- The flag verifies rather than trusts: it refused today's Xcode export at the toolchain gate (see Thread 1). Gates checked: bundle version vs `project.yml`, sealed toolchain present, `codesign --verify --deep --strict`, TeamIdentifier == EXPECTED_TEAM, hardened runtime on app and node, node entitlements (`allow-jit` present, `get-task-allow` absent), stapled ticket present.
- Refactored four previously-inline assertions (in steps 3/4/6) into shared functions — `assert_sealed_toolchain`, `assert_hardened`, `assert_node_entitlements`, `assert_signing_team`, `assert_bundle_version` — so the build path and the new adopt path cannot drift apart.
- `--dmg-from` drops `APP_SUBMISSION` from the notarization ledger, since that submission belongs to bytes the flag will never staple.
- Separate fix in the same file: identity resolution now filters signing-identity candidates by `EXPECTED_TEAM` *before* declaring ambiguity. With two certs in the keychain (old 54CCCRZJ3X, new RSNGKW5LNH, old one valid until 2027-02-01), the previous code refused to choose and demanded `SIGN_IDENTITY` on every run — two certs from different teams was never actually ambiguous.
- Real-path tested (no stubs): `--dmg-from` against the real Xcode export died at the toolchain gate as designed; a fixture chain of signed copies separately exercised a half-assembled toolchain, an escaping symlink, a tampered bundle (sealed-resource-invalid), and a fully-signed fixture that passed version/seal/verify/team/hardened/entitlements and terminated exactly at the stapled-ticket check. Flag conflicts, missing value, missing path, and non-`.app` inputs were all rejected as expected. The same-path staging guard (prevents `rm -rf` of the source) was verified against real inputs.
- Not tested: the happy-path end-to-end run (needs a toolchain-bearing app that is *also* already notarized — none exists yet). Build-path steps 2-6 were deliberately not re-run after the refactor, because staging does `rm -rf release/Chord Writer.app`, which currently holds David's only notarized artifact.

### Thread 3 — the notarization hang: 15 experimental submissions, 8 hypotheses falsified
- Ran a controlled bisection against the question "why do toolchain-bearing bundles never complete notarization?" Every fixture was a real signed `.app` submitted through package.sh's exact CLI path (`ditto -c -k --keepParent` + `notarytool submit`).
- Two clean cohorts, nothing in between. Pre-registered decision rule: still In Progress at 10 minutes = hung cohort.
  - **Cleared in 19-113 seconds** (Accepted): 1b2b8f16 toolchain-less control (31s, exonerates the CLI channel), f04cd149 108MB Node runtime/0 symlinks (44s, exonerates bytes), a978eb1f 9.9MB esbuild binary (19s, exonerates the binaries), 53173b72 11,001 stub files/113 dirs (110s, exonerates file count), f8dfe5da same stubs under a dir named `node_modules` (108s, exonerates that name), d8c49bbf same stubs under `node_modules/@scope/` (~110s, exonerates @-prefixed dirs), 807e177b same stubs at depth 8 (~110s, exonerates depth), 1f5e101f same stubs in 1,103 dirs (107s, exonerates directory count).
  - **Hung, no verdict ever**: e4244248 the real toolchain app (4h40m+), f991e71b devkit-half (poller timed out at 90 min), add60df0 pruned devkit (dist-esm/*.d.ts/*.map stripped, 0 dangling symlinks), 52a2dc5b dereferenced symlinks (0 symlinks, 213MB — exonerates symlinks), c177000f 11,001 stub files in devkit's `.pnpm`-style deep layout (the one stub fixture that hung), 62ff0500 real closure flattened out of `.pnpm` (flattening alone is not sufficient), 55302a17 entire closure zipped as one `devkit.zip` (archiving does not circumvent the hang).
  - **Invalid, in 113 seconds** — the only non-Accepted verdict all session: 9a8edeb8 zipped attempt with an unsigned esbuild nested inside `devkit.zip`; the log named the exact path three times. This proves Apple's notary descends into nested archives — a zip inside a zip is not opaque, every Mach-O inside still needs full signing (matches electron-builder#4637).
- State of the diagnosis: every fixture containing real devkit content hung, across every layout tried (as-built, pruned, dereferenced, flattened, archived); 5 of 6 stub fixtures cleared. The exception is `shape` (real-content-shaped stubs), whose two untested properties are a dot-prefixed directory (`.pnpm`) and `+` characters in directory names — a likely separate second trigger that cost three hypotheses by making earlier fixtures look wrongly exonerating.
- Key inference: when Apple's notary has something to say, it says it in under two minutes — proven by the 113-second Invalid verdict naming three exact paths. Every documented failure mode produces a fast, specific rejection. Our hangs produce nothing — no verdict, no log. David's read: an Apple-side content queue, possibly resolving on its own in a day, is the surviving explanation.
- Checked David-supplied domain-knowledge failure modes, all locally clean: no foreign-platform binaries (darwin-arm64 only, no linux-x64/win32 esbuild — vscode#130158 mode doesn't apply), 0 case collisions, 0 `com.apple.cs.*` xattrs, and a case-sensitive-APFS disk image test where `codesign --verify --deep --strict` passed identically on both filesystems (excludes that class).
- One real (but not causal) violation found: toolchain executables live in `Contents/Resources/toolchain` rather than `Contents/MacOS` or a Helpers directory, contrary to Apple's bundle-layout guidance (signature fragility via xattrs stripped by zip/dmg packaging). ADR-279 D4 chose Resources without weighing this.
- Measurements worth keeping: vendored toolchain is 165MB / 7,911 files / 764 dirs / 222 symlinks / only 2 Mach-O binaries (node 108MB, esbuild 9.9MB). 6,436 of 7,911 files (81%, 35MB) are `dist-esm` + `*.d.ts` + `*.map`, which the CJS shim never opens — devkit has zero genuine dynamic `import()` (all `import(` occurrences are `typeof import(...)`), so pruning them from the vendored bundle is safe (not in-repo, where vitest reads `dist-esm`). Pruning leaves 0 dangling symlinks, so package.sh's seal scan would still pass.
- Also: `xcrun notarytool submit` SIGBUS'd (Bus error: 10) four times this session, always *after* the upload succeeded and an id was returned. package.sh's header currently claims the crash is "always inside the wait and never the submit" — that sentence is now falsified by this session's evidence and should be corrected, since the never-wait design leans on it.

## Key Decisions

### 1. Team-mismatch is retired as the notarization-hang explanation
The prior session's root cause (wrong signing team) is disproven by e4244248's continued hang under the correct credentials; the design going forward treats the hang as unexplained pending Apple, not as a local signing bug.

### 2. `--dmg-from` adopts rather than re-signs
Rather than re-running the full build+sign+notarize pipeline when a Distribute-App export already exists, package.sh can now verify and adopt it — but the toolchain-vendoring gap in the Xcode path means adoption alone will keep failing until Xcode's post-build script is made to set `SHARPEE_VENDOR_TOOLCHAIN=1` (not done this session).

## Next Phase
No active plan phase — this session was entirely off-plan packaging work. ADR-310 Phase 1 remains blocked on David's story content (setting, fact graph, title); Phase 2 still needs the ADR-102 amendment/flip and the registration-location ruling.

## Open Items

### Short Term
- `tools/ide/package.sh` is uncommitted (318 insertions, 91 deletions per `git diff --stat`). Nothing else in the working tree changed except the deliberately-untracked `scripts/clodpod.sh` (do not stage or delete it).
- `release/.notarize-state` still carries `APP_SUBMISSION=e4244248` (a dead id) — a plain `./package.sh` would resume polling it forever; `--rebuild` discards the ledger.
- The exported app in `tools/ide/release/` is notarized+stapled but has no toolchain — do not ship it.
- Recommended fix not implemented: move toolchain executables out of `Contents/Resources` per Apple's bundle-layout rules.

### Long Term
- Apple Feedback report not filed. Evidence is unusually strong: 15 controlled submissions, matched fixtures differing by one property each, 8 falsified hypotheses with timings, 7 submission ids that never completed vs. 9 that cleared in under two minutes.
- The `shape` fixture's untested variables (`.pnpm`-style dot-prefixed dirs, `+` characters in dir names) are a likely second trigger and remain unisolated.
- Carried: ADR-308 testing-navigation interview not started.

## Files Modified

**Packaging** (1 file):
- `tools/ide/package.sh` - added `--dmg-from` adoption path, extracted shared assertion functions, fixed team-filtered identity resolution.

## Notes

**Session duration**: ~2h50m (2026-08-11 22:58 CDT start, running to ~2026-08-12 01:50 CDT).

**Approach**: Controlled fixture bisection (single-variable changes between submissions, pre-registered 10-minute hung/cleared decision rule) rather than incremental guessing against a multi-hour feedback loop.

**Scratchpad**: fixture and poller scripts live at `/private/tmp/claude-501/-Users-david-repos-sharpee/ce911e65-45ce-43b1-8fbd-0d54f16889db/scratchpad` (ephemeral, not durable) — the submission ids recorded above in Thread 3 are the durable record.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Notarization Reality — toolchain-bearing app bundles submitted through package.sh's real CLI path never return a notarization verdict (7 submissions hung from 12 min to 4h40m+, none resolved); root cause is unisolated beyond "contains real devkit content, independent of layout."
- **Blocker Category**: Build / Toolchain
- **Estimated Remaining**: ~2-4 hours across 1-2 sessions — isolate the `.pnpm`/`+`-character second trigger, decide on the Apple Feedback filing, wire `SHARPEE_VENDOR_TOOLCHAIN=1` into the Xcode post-build path, and land a genuine happy-path `--dmg-from` run once a toolchain-bearing app clears notarization.
- **Rollback Safety**: safe to revert — `tools/ide/package.sh` changes are uncommitted and isolated to one file; no build/test infrastructure or story content touched.

## Dependency/Prerequisite Check

- **Prerequisites met**: working `notarytool`/`codesign`/`stapler` CLI access, two valid Developer ID certs in keychain (54CCCRZJ3X expiring 2027-02-01, RSNGKW5LNH current), an Xcode-produced signed archive to cross-check against the CLI path.
- **Prerequisites discovered**: `SHARPEE_VENDOR_TOOLCHAIN=1` is required for Xcode's Distribute App export to bundle the toolchain, and nothing currently sets it in that path — this was previously unknown and blocks any Xcode-originated app from being shippable as-is.

## Architectural Decisions

- ADR-279 D4 (toolchain executables under `Contents/Resources`): this session found the placement contradicts Apple's bundle-layout guidance and is a plausible (not proven) contributor to signature fragility, but no ADR amendment was written this session.
- None else this session — no ADR was written or amended.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/package.sh` (signs, notarizes, and packages the Chord Writer app — filesystem and code-signature mutations).
- Tests verify actual state mutations (not just events): YES (evidence: real-path fixture chain in Thread 2 — `codesign --verify --deep --strict`, `assert_sealed_toolchain`, `assert_signing_team`, `assert_hardened`, `assert_node_entitlements`, and stapled-ticket checks run against actual signed `.app` copies, with the half-assembled-toolchain, escaping-symlink, and tampered-bundle fixtures each failing at the correct gate and the fully-signed fixture passing through to the stapled-ticket check; timestamps 2026-08-12 04:29-06:49 UTC per `.devarch-events-d406a4.jsonl`, all after the corresponding edits).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — `docs/context/session-20260811-1540-adr-310-character-in-chord.md` (the immediately prior session), which carried the same notarization hang forward and mis-attributed it to a team mismatch. This session disproved that root cause and replaced it with an unresolved "real devkit content, layout-independent" finding.
- Consider a one-time audit of: whether other package.sh-adjacent scripts (e.g. any zifmia or web-client packaging paths) make similar unverified root-cause claims in their header comments, since the falsified "always inside the wait" SIGBUS claim shows that pattern already occurred once.

## Test Coverage Delta

- Tests added: 0 (no unit test suite changes; verification this session was real-path fixture testing against actual `codesign`/`notarytool`/`stapler`, not a test framework).
- Tests passing before: N/A → after: N/A — no test suite run this session (evidence: no test/build rows in `.devarch-events-d406a4.jsonl`; only edit/agent/session-start events present).
- Known untested areas: the `--dmg-from` happy path end-to-end (no toolchain-bearing, already-notarized app exists yet to exercise it); build-path steps 2-6 not re-run after the shared-assertion-function refactor.

---

**Progressive update**: Session completed 2026-08-12 01:52
