# Session Plan: Intel (x86_64) support for Chord Writer, as separate per-arch installers

**Created**: 2026-08-13
**Plan Status**: DONE (2026-08-13) — all three phases shipped. Both installers
are signed, notarized, stapled and live on sharpee.net:
`ChordWriter-1.0.0-arm64.dmg` (56M) and `ChordWriter-1.0.0-x86_64.dmg` (59M),
both verified serving 200.
**Overall scope**: Give Chord Writer a shippable x86_64 build alongside the
existing arm64 one, each carrying only its own arch's bundled toolchain
(~56MB per DMG, not a universal binary). Extend `vendor-toolchain.sh` to
vendor a Node runtime and devkit/esbuild closure per arch, make
`tools/ide/project.yml`'s `ARCHS` pin overridable at build time instead of
hardcoded, teach `package.sh` to name and produce a DMG per arch, run the
Xcode-archive → Distribute App → `package.sh --dmg-from` release route for
x86_64 end to end, verify what Rosetta can verify, and update the download
page and stale documentation to match.
**Bounded contexts touched**: N/A — infrastructure/tooling (build pipeline,
packaging script, and a marketing/download page). No new domain concepts are
introduced; DDD framing does not apply per session-planner's own "When DDD
Does NOT Apply" test (deployment plumbing is the first listed case).
**Key domain language**: N/A (tooling). Existing vocabulary carried through
unchanged: bundled toolchain, seal (vendor-toolchain.sh's symlink-escape
invariant), Developer ID signing, notarization/staple, the Xcode-archive
release route.

## References consulted
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` — D4's amendment history is the constraint surface this plan operates inside: per-arch installers only (universal builds cannot embed a per-arch-correct bundled toolchain, D4's original reason 1), the deployment target stays 11.0, and the 2026-08-13 lifted-INTERIM note already records that §5a's arm64-only conclusion "rests on a single matched pair... Intel support may not be blocked at all" and names re-testing as "the cheapest open question in this file" — this plan is exactly that re-test, now further confirmed by this session's own matched-pair result (submission `975d1c21`, Accepted ~103s). The ADR also names the standing release route (`xcodebuild archive` with `SHARPEE_VENDOR_TOOLCHAIN=1` → Xcode Distribute App → `package.sh --dmg-from`) as the one to use, because `package.sh`'s own build path has an unfixed `Contents/Frameworks/` signing gap.
- `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md` — superseded-in-its-conclusions notice: every cohort comparison in the document (including §5a's arm64-only finding) is confounded by the notary's now-known intermittency, so a *single* clean submission proves less than it looks like — this plan's Phase 2 verification step treats one Accepted result as encouraging, not as the same-strength evidence a matched pair would be, and budgets for a resubmit if a stall occurs (first response to a stall past ~15 minutes is "resubmit," per the ADR).
- `docs/context/project-profile.md` — Tech Stack / CI-CD: "no CI/config diffs since 2026-08-02," release packaging is a deliberately manual, scripted-but-local gate (no macOS CI exists) — this plan does not add a CI phase. Also: pnpm 10.13.1 workspace conventions govern how the x64 esbuild closure is pulled into `vendor-toolchain.sh`'s `pnpm deploy` step.
- `docs/context/session-20260813-1306-feat-adr-312-cli-test-recording.md` — most recent session; Open Items named "Intel/universal re-test — untested and cheap; should run before any further arch-specific claims" (now run, per this session's brief — the trigger is falsified) and "DMG not yet uploaded to plover" / "AC3 (Gatekeeper check on a clean, unrelated Mac) and AC6 (install + Cmd-B smoke test) deferred" — Phase 2 and Phase 3 below pick these up rather than re-discovering them. Its Key Decision #1 ("Apple's notary is now treated as intermittently unreliable, not deterministic on content") is why Phase 2 does not treat a single Accepted submission as closing the notarization question outright.
- `docs/proposals/docs-consolidation.md` — templated, P-1 through P-8 ACCEPTED and not yet PLANNED. All eight are `docs/` reorganization work, orthogonal to Chord Writer packaging. None cited; none implemented by this plan.

**Supersession note.** This plan replaces
`docs/work/adr-312-cli-test-recording/plan.md` as the active plan. That plan
was disposed under rule 18b as "still live" before this pointer moved — it is
stamped `Superseded by: docs/work/chord-writer-intel/plan.md` and remains
resumable at its own Phase 1. Do not modify it further from this plan.

**Testing constraint — decide explicitly, don't infer.** David has no Intel
Mac. `arch -x86_64` under Rosetta on Apple silicon can run the x64 app, node,
and esbuild binaries — enough to catch packaging errors (missing slice, wrong
esbuild optional-dep, entitlements, library validation) but not genuine
Intel-native behavior (real x64 codegen paths, x64-specific crashes). Phase 2
below runs every Rosetta check available and surfaces the result to David
explicitly before the x86_64 DMG is called shippable — this plan does not
pre-decide "Rosetta-verified is sufficient."

**Branch.** This work lands on a branch cut from `main`, not on
`feat/adr-312-cli-test-recording`. `tools/ide/` has diverged: `main` carries
`assemble-dmg.sh`'s stranded-volume sweep (`d77e0c81`) and the feature branch
does not, and Phase 2 touches `package.sh` and the DMG path directly. The
feature branch holds the ADR-313/314 review work, which is unrelated to
packaging and is not a dependency of any phase here.

## Phases

### Phase 1: Vendor the x86_64 toolchain — **DONE** (2026-08-13, commit 56a7280a)
- **Outcome**: `--arch arm64|x86_64` defaulting to the build host; darwin-x64
  Node vendored with checksums refreshed from nodejs.org; esbuild grafted per
  target arch, fetched and verified against `pnpm-lock.yaml`'s integrity hash.
  Blocking gate cleared — both runtimes are `minos 11.0`. The `.stamp` concern
  was already handled by existing code, as the plan suspected.
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (tooling) — `tools/ide/vendor-toolchain.sh`, `tools/ide/vendor/node/`
- **Entry state**: arm64-only vendoring works as today (`vendor-toolchain.sh <resources-dir>` hardcodes `NODE_ARCH="darwin-arm64"`); `@esbuild/darwin-x64@0.27.2` is already resolvable in `pnpm-lock.yaml`, but `pnpm deploy` resolves optional platform deps for the host arch, so an x64 closure needs an explicit push (pnpm's `supportedArchitectures` config, or an equivalent override) rather than falling out for free.
- **Deliverable**: `vendor-toolchain.sh` takes an arch parameter (arm64 | x86_64) instead of a hardcoded constant; `tools/ide/vendor/node/` gains the `node-v22.23.1-darwin-x64.tar.xz` official tarball plus an updated `SHASUMS256.txt` (never hand-edited — refreshed from nodejs.org per the script's own existing rule); the `pnpm deploy` step for `@sharpee/devkit` and `@sharpee/platform-browser` is made to resolve the **x64** esbuild optional dependency when assembling the x64 toolchain, on an Apple-silicon build host; both toolchains can be assembled side by side into separate staging dirs without cross-contaminating each other's `.stamp` fingerprint or seal; step 4.5 (seal enforcement) and step 4.6 (Developer ID signing) both pass unmodified for the x64 assembly, since neither is arch-specific logic today.
- **Exit state**: a clean-checkout run of `vendor-toolchain.sh <dir> --arch x86_64` (or equivalent flag) produces a sealed, signed x64 toolchain whose `node/bin/node` and the deployed esbuild binary both execute under `arch -x86_64` Rosetta on the arm64 build machine; the existing arm64 path is unchanged in behavior and output.
- **GATE CLEARED 2026-08-13 — `minos 11.0`.** Checked ahead of the phase, on the
  real tarball rather than by inference:

  ```
  $ curl -sSL -o n.tar.xz https://nodejs.org/dist/v22.23.1/node-v22.23.1-darwin-x64.tar.xz
  $ tar -xf n.tar.xz node-v22.23.1-darwin-x64/bin/node
  $ otool -l node-v22.23.1-darwin-x64/bin/node | grep -A4 LC_BUILD_VERSION
        cmd LC_BUILD_VERSION
    cmdsize 32
   platform 1
      minos 11.0
        sdk 15.0
  ```

  Same floor as the arm64 runtime, so `project.yml`'s "the vendored node is minos
  11.0 too, so the toolchain reaches as far as the app does" holds for x64
  unchanged, and the deployment-target decision needs no revisiting. The gate
  below is kept as the standing rule for any future runtime bump.

- **BLOCKING GATE — verify the x64 node's minimum OS before anything else.**
  `project.yml:158-162` records the invariant "the deployment target is 11.0...
  The vendored node is minos 11.0 too, so the toolchain reaches as far as the app
  does." That was established for the **arm64** node and does not transfer. Run
  `otool -l <x64 node>/bin/node | grep -A3 LC_BUILD_VERSION` and confirm
  `minos ≤ 11.0`. **If it is higher, stop** — shipping would claim macOS 11
  support with a toolchain that cannot run there, which is precisely the failure
  that comment exists to prevent, and it reopens the deployment-target decision
  (David's "v11 for both", 2026-08-13) rather than being worked around.
- **Already done, verify rather than implement**: `.stamp` cross-contamination is
  a non-issue — `vendor-toolchain.sh:97` already reads
  `FINGERPRINT="node=${NODE_VERSION}-${NODE_ARCH} devkit=${DEVKIT_VERSION}"`, so
  arch is in the fingerprint today. Confirm side-by-side assembly, do not build it.

### Phase 2: Per-arch build, sign, notarize, and package — **DONE** (2026-08-13, commits 06b8dde1, 0fa9e09c)
- **Outcome**: `package.sh --arch`, per-arch DMG naming, `ARCHS` and
  `SHARPEE_TOOLCHAIN_ARCH` passed together. `assert_arch_agreement` added after
  an x86_64 archive carrying an arm64 toolchain passed every other gate.
  Uncovered two fixes stranded on `feat/adr-312-cli-test-recording` and missing
  from `main` — `--dmg-from` and the `RSNGKW5LNH` team pin — both now on `main`.
- **Testing question, answered**: Rosetta-verified accepted for v1 (David).
  Evidence: correct slices and teams throughout, and a full `sharpee build` of
  fernhill through the bundled x64 toolchain. Genuine Intel hardware remains
  unavailable and untested.
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A (tooling) — `tools/ide/project.yml`, `tools/ide/package.sh`, the Xcode-archive release route
- **Entry state**: Phase 1's x64 toolchain assembles and its binaries run under Rosetta. `project.yml` pins `ARCHS: arm64` unconditionally, with a rationale comment whose reason 2 (a universal build cannot be notarized) is now falsified — a universal build submitted 2026-08-13 (`975d1c21-68bd-400a-a591-14818bb4b425`) was Accepted in ~103 seconds — and whose reason 1 (no x64 toolchain vendored) Phase 1 just resolved. `package.sh` names its output `ChordWriter-<version>.dmg` with no arch component.
- **Deliverable**: `project.yml`'s `ARCHS: arm64` becomes an overridable build-time setting (e.g. `xcodebuild ARCHS=x86_64 ONLY_ACTIVE_ARCH=NO ...` for a release archive, dev-loop default unchanged) rather than a hardcoded pin; the stale rationale comment is rewritten to state plainly that separate per-arch installers are the shipped shape (David's decision — not a universal binary), each carrying only its own arch's vendored toolchain, deployment target 11.0 for both arches (David's decision, 2026-08-13). `package.sh` gains arch-aware DMG naming (`ChordWriter-<version>-arm64.dmg`, `ChordWriter-<version>-x86_64.dmg`) and wires the arch through to `vendor-toolchain.sh`. The full working release route — `xcodebuild archive` with `SHARPEE_VENDOR_TOOLCHAIN=1` and the arch override → Xcode Distribute App → Direct Distribution → `package.sh --dmg-from` — is run end to end for x86_64, producing a notarized, stapled `ChordWriter-1.0.0-x86_64.dmg`. Verification, all via Rosetta (no Intel Mac available): `spctl --assess --type open --context context:primary-signature` on the DMG/app; app launch; a Cmd-B-equivalent build exercising the bundled x64 toolchain end to end (ADR-279 Acceptance 6's check, for the x64 arm).
- **Exit state**: a stapled `ChordWriter-1.0.0-x86_64.dmg` exists, passes Gatekeeper assessment and a Rosetta-driven smoke build. The Rosetta-vs-genuine-Intel testing-constraint question (see plan header) has been put to David explicitly, with the concrete evidence this phase produced, and his answer — Rosetta-verified sufficient for v1, or hold for real hardware — is recorded before this phase is called done. The arm64 build and its existing DMG output are unaffected (regression check: `ChordWriter-1.0.0-arm64.dmg` still builds and still notarizes).
- **Do not break the live download while renaming.** The deployed page links
  `/downloads/ChordWriter-1.0.0.dmg` (`download/content.mdx:14`) and Phase 3 is
  what updates it. Renaming the arm64 output to `-arm64` in Phase 2 without
  touching plover leaves the live link 404ing in the gap. Either leave the
  existing unsuffixed file in place on plover until Phase 3 lands, or ship
  Phases 2 and 3 together.

### Phase 3: Distribution and documentation cleanup — **DONE** (2026-08-13, commits 810f383d, e11875ba)
- **Outcome**: two-arch download tiles shipped and deployed; both DMGs live on
  plover. ADR-279's §5a bullet rewritten from "unsafe and untested" to
  falsified-and-shipped when the notarization record landed on `main`.
- **Carried forward, not blocking**: ADR-313's Context still argues test
  authoring is Apple-silicon-only. That ADR is DRAFT on the tabled
  `feat/adr-312-cli-test-recording` branch, so the note belongs with whatever
  revives it rather than here.
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (tooling/docs) — `website/src/app/chord-writer/download/content.mdx`, ADR-279, ADR-313
- **Entry state**: Phase 2 produced a shippable (per David's Phase 2 sign-off) `ChordWriter-1.0.0-x86_64.dmg`. The download page has a single download button and a single "Apple silicon Mac, macOS 11 or later" callout; the DMG lives at `website/public/downloads/` on plover, served by Apache (not nginx).
- **Deliverable**: `content.mdx` becomes a two-arch choice (Apple silicon / Intel), each with its own download link and a corrected callout (both target macOS 11.0+, per Phase 2's decision to keep one deployment target for both arches); `ChordWriter-1.0.0-x86_64.dmg` uploaded to plover's `website/public/downloads/` alongside the existing arm64 DMG, site redeployed. Documentation cleanup: **three** files get dated notes, not two. (a) `docs/work/adr-279-chord-writer-packaging/notarization-bisection.md` — **§5a lives here, not in ADR-279**; retire its x86_64-trigger conclusion outright and correct the superseded header, which currently says the Intel conclusion is "unsafe and untested" and is now wrong in the other direction: it was tested (submission `975d1c21-68bd-400a-a591-14818bb4b425`, Accepted ~103s) and falsified. (b) ADR-279 gets a short dated note recording that Intel support shipped as separate per-arch installers (not universal), and that the `project.yml` rationale comment §5a justified is retired; ADR-313's Context section (which argues test authoring is Apple-silicon-only, per its own text: "the only way to have a test is to own an Apple silicon Mac") gets a short staleness flag pointing at this ADR-279 amendment, since Intel Mac authors are no longer excluded from the class of machine that can build Chord Writer — full reconciliation of ADR-313's own content is out of scope for this plan.
- **Exit state**: both DMGs are live and downloadable from sharpee.net's Chord Writer download page with an accurate callout; ADR-279 and ADR-313 no longer carry unresolved-Intel language stated as current fact.
