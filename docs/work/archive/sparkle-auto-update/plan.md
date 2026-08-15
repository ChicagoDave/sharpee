# Session Plan: Implement Sparkle 2 auto-update for Chord Writer (ADR-279 D7)

**Created**: 2026-08-15
**Plan Status**: DONE (closed 2026-08-15 — David confirmed the plan complete; served-appcast checks verified live, see Phase 4)
**Overall scope**: Ship full Sparkle 2 auto-update in Chord Writer (`tools/ide/`) per ADR-279 D7 — EdDSA-signed update archives, an appcast hosted on sharpee.net pointing at GitHub Releases assets, app-side framework embedding with a "Check for Updates…" menu item and scheduled checks, and a `package.sh` release pipeline that produces and publishes it — gated on fixing the `Contents/Frameworks` codesign gap that currently blocks even the non-Sparkle 1.0.1 release, since Sparkle's own framework and embedded XPC services land in exactly that unsigned corner of the bundle.
**Bounded contexts touched**: N/A — infrastructure/tooling (macOS app packaging, code signing, release scripting, static site hosting; no domain behavior change). Per the DDD-applicability check, this plan is framed in plain technical terms throughout.
**Key domain language**: N/A

**Relationship to the existing ADR-279 plan** — `docs/work/adr-279-chord-writer-packaging/plan.md` covers all of D1-D7 and is not superseded by this plan. Its **Phase 3** (packaging script) is `Status: CURRENT` and already implements most of `package.sh`'s archive/sign/notarize/DMG pipeline; its own text does not yet mention the `Contents/Frameworks` signing gap (that finding was logged later, as a 2026-08-13 amendment to ADR-279 D4 itself, dated after that plan's Phase 3 status was last written). Its **Phase 4** ("Distribution and Sparkle auto-update (D6/D7)") is `Status: PENDING` and is a four-paragraph stub covering the same ground this plan decomposes in full detail, including facts that plan predates (the 1.0.1 notarization block, the exact `Contents/Frameworks` root cause, the "no installed user has an update path yet" consequence). **This plan is the detailed decomposition of that stub.** Recommend to the plan owner: once this plan is approved, mark the old plan's Phase 4 `Superseded by: docs/work/sparkle-auto-update/plan.md` rather than running both — flagged in the report back to the user, not resolved here (rule 18b: only the user disposes of an outgoing phase, and Phase 3/4 there are not DONE).

**Consequence to hold in view (per the task brief, not a problem to solve here)**: 1.0.0 and 1.0.1 both shipped without Sparkle. The first Sparkle-carrying build is the earliest version any installed user can ever receive an update *for* — every install that predates it is permanently stranded on manual re-download. This is a one-time fact of the version history, not a defect this plan fixes.

**Backward-compatibility note (the one place it binds in this repo)**: the appcast XML schema and the EdDSA public key baked into `Info.plist` (`SUPublicEDKey`) cannot change for already-installed Sparkle-enabled users without breaking their update path. Get the key pair and the appcast shape right before the first Sparkle release ships — there is no do-over that doesn't strand that cohort too.

## References consulted
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` — D7 (Sparkle 2, full auto-update, appcast on sharpee.net / archives on GitHub Releases, EdDSA signing, D3-class private key handling, `package.sh` gains the release steps, app-side framework + menu item + scheduled checks); Acceptance 7 (real download → EdDSA verify → relaunch); Consequences (Sparkle adds the framework to the signing surface, an EdDSA private key to the secret set, and a deployment coupling to sharpee.net); the 2026-08-13 D4 amendment documenting the exact `Contents/Frameworks` signing gap (`libswift_Concurrency.dylib`, no Developer ID cert, no secure timestamp, both slices) that this plan's Phase 1 fixes, and the finding that `codesign --verify --deep --strict` passes on it anyway because it checks *a* valid signature, not *ours*.
- `docs/work/adr-279-chord-writer-packaging/plan.md` — the sibling plan this one decomposes Phase 4 of; also the source of the `package.sh` Phase 3 implementation state (inside-out signing of the bundled toolchain only, credentials already provisioned — Developer ID cert `54CCCRZJ3X`, notary profile `dc-notary`) that this plan's Phase 1 and Phase 3 build directly on top of.
- `docs/context/project-profile.md` — confirms the Swift/XCTest/XcodeGen stack for `tools/ide/SharpeeIDE` (`project.yml` generates the Xcode project; `SharpeeIDETests` is the test target), the two-CLI split (`repokit` stays Node-only and IDE-ignorant — this plan's `package.sh` work stays in `tools/ide/`, not repokit), and that the IDE has no macOS CI — every phase here self-verifies locally, no CI packaging step to lean on.
- `docs/context/session-20260814-2218-main.md` — most recent session; establishes the "assert the artifact, not the exit code" convention now standard in this repo's deploy scripting (`website/deploy.sh`'s Fernhill fix), which Phase 3 and Phase 4 below both follow for the appcast-generation and appcast-publish steps; also confirms `website/deploy.sh`'s final step needs `sudo` and David runs it himself, which sets the human/automation boundary for Phase 4's publish step.

## Phases

### Phase 6 (demoted from Phase 1, 2026-08-15): Fix `package.sh`'s `Contents/Frameworks` codesign gap
- **Tier**: Medium
- **Budget**: 250
- **DEMOTED — the prerequisite premise was false.** This phase was written as the hard
  prerequisite for Sparkle on the reasoning that Sparkle's framework and XPC services land
  in the one part of the bundle `package.sh` never signs, and that the gap was blocking the
  1.0.1 release. Both halves turned out to be wrong, verified 2026-08-15 against the shipped
  bundle in `tools/ide/release/Chord Writer.app`:

  ```
  $ codesign -dvvv "Chord Writer.app/Contents/Frameworks/libswift_Concurrency.dylib"
  Authority=Developer ID Application: David Cornelson (RSNGKW5LNH)
  Timestamp=Aug 14, 2026 at 10:46:24 PM
  TeamIdentifier=RSNGKW5LNH
  ```

  The dylib carries a correct Developer ID signature with a secure timestamp, one second
  ahead of the outer app's (22:46:25) — correct inside-out signing. 1.0.1 shipped and is
  live (`sharpee.net/chord-writer/download` → 200, serving `ChordWriter-1.0.1-arm64.dmg`
  and `-x86_64.dmg`).

  The gap is real but confined to `package.sh`'s **own** build-and-sign path, which the
  release flow does not use: releases run `xcodebuild archive` → Xcode Distribute App →
  `package.sh --dmg-from`, and `--dmg-from` skips the entire build-and-sign block
  (`package.sh:875`). Xcode's Distribute App re-signs embedded frameworks, which is what
  produced the signature above and what will sign `Sparkle.framework` too. Worth fixing so
  the standalone path stops being a trap, but it gates nothing.

- **RE-PROMOTED AND DONE, same day.** The demotion reasoned correctly from a false premise of
  its own: *given that releases go through Xcode's Distribute App*, the gap is inert. Phase 3's
  real-path test broke that premise — closing it needs a stapled Sparkle-carrying app, and
  producing one through `package.sh`'s own path means `package.sh` must sign
  `Contents/Frameworks` itself. The archive is built with `CODE_SIGN_IDENTITY:
  "Apple Development"`, so `Sparkle.framework` would otherwise reach Apple carrying a
  development signature. Fixed 2026-08-15 as part of Phase 3:
  - The signing step now enumerates nested code bundles (`*.xpc`, `*.app`, `*.framework`) and
    loose Mach-Os under `Contents/Frameworks`, **sorted deepest-first** so a nested bundle is
    never signed after its container (which would invalidate the container). Sparkle's layout
    is not hardcoded — that is a detail of a dependency, not a fact about this bundle.
  - Verification now runs `assert_signing_team` on every nested item. `codesign --verify
    --deep --strict` is explicitly not sufficient: it checks that nested code carries *a*
    valid signature, not *ours*, which is exactly how a development-signed
    `libswift_Concurrency.dylib` passed locally and was then rejected by Apple.

  **Lesson worth keeping**: the demotion was well-evidenced and still wrong within hours. The
  evidence answered "is this gap blocking the path releases currently take?" — a narrower
  question than "is this gap blocking?", and the difference only surfaced when the path changed.

  **Three bugs in the fix itself, and only one was loud** (2026-08-15). The first release run
  after writing it died at the signing step; fixing that revealed two more that would have
  shipped silently:

  | # | Bug | How it announced itself |
  |---|---|---|
  | 1 | bash 3.2 mis-parses a comment inside `<( )` — the word `Sparkle's` has an apostrophe, read as an opening quote | Loud. `bad substitution: no closing ')'`. `bash -n` accepts it; only running fails |
  | 2 | The `.app/` exclusion matched the **absolute** path, which contains `Chord Writer.app/`, so every file in the bundle was excluded and no loose Mach-O was ever signed | Silent. `libswift_Concurrency.dylib` — the file Apple actually rejected — would have gone unsigned again |
  | 3 | Excluding `.framework` contents dropped Sparkle's `Autoupdate`. A framework signature covers its own binary and resources, not a sibling executable | Silent. Autoupdate would have reached Apple with Xcode's development signature |

  Bugs 2 and 3 share a shape: a plausible rule ("contents of a bundle are sealed by their
  container") applied one level too broadly. Neither is visible in a syntax check or a diff
  review — both were found only by running the enumeration and reading the resulting list
  against the real bundle. Anything that decides *what gets signed* should be printed and read,
  not reasoned about.

  Verified enumeration, deepest-first, against a real Sparkle-carrying bundle under
  `/bin/bash` 3.2:

  ```
  Sparkle.framework/Versions/B/XPCServices/Installer.xpc
  Sparkle.framework/Versions/B/XPCServices/Downloader.xpc
  Sparkle.framework/Versions/B/Updater.app
  Sparkle.framework/Versions/B/Sparkle
  Sparkle.framework/Versions/B/Autoupdate
  Sparkle.framework
  libswift_Concurrency.dylib
  ```

  **Process note**: the first run was launched as `package.sh | tail -120`, so the pipeline
  reported `tail`'s exit code and a dead build was notified as success. Redirect, never pipe,
  when the exit code is the thing being judged.
- **Entry state**: `package.sh`'s nested-signing loop re-signs `$BUNDLED_TC` (the vendored toolchain) but never enumerates `Contents/Frameworks`; the only route that has ever produced a shippable DMG is `xcodebuild archive` → Xcode's Distribute App → Direct Distribution → `package.sh --dmg-from`, because Xcode's Distribute App re-signs embedded frameworks and `package.sh`'s own path does not. 1.0.1 is blocked on this today (Apple rejected the notarization submission naming `libswift_Concurrency.dylib` specifically). No Sparkle code exists yet — this phase touches only `package.sh` and its verification steps.
- **Deliverable**: Extend `package.sh`'s existing nested-signing loop to walk every Mach-O under `Contents/Frameworks` (not just `$BUNDLED_TC`) and re-sign each with the Developer ID Application identity, matching the entitlements discipline the toolchain loop already uses (splitting node's own entitlements from everything else). Add a verification step that asserts the Team ID on every nested Mach-O by parsing `codesign -dvvv` output for `Authority=Developer ID Application: David Cornelson (54CCCRZJ3X)` — not just `codesign --verify --deep --strict` exit status, which the ADR amendment already proved passes on an unsigned-by-us dylib because it only checks that *a* valid signature is present.
- **Exit state**: `package.sh` run end-to-end on its own path (no Xcode Distribute App step) produces a bundle whose `Contents/Frameworks` entries all carry the correct Developer ID signature, verified by the new Team-ID-asserting check.
- **REAL-PATH TEST (rule 13a — no stub)**: submit a `package.sh`-only-built (not Xcode-Distribute-App-built) archive for real notarization via `notarytool submit` against the already-provisioned `dc-notary` profile. Must return Accepted — this is the same submission path that previously came back Invalid on `libswift_Concurrency.dylib`, so an Accepted verdict here is the actual proof, not a local-only signature check.
- **Acceptance criteria covered**: none — this is hygiene on a non-release code path. Closes the
  standalone-`package.sh` trap so that path stops differing silently from the shipping path.
- **Status**: DONE — closed 2026-08-15 (re-promoted and completed same day as Phase 3's
  real-path test forced it; see the "RE-PROMOTED AND DONE" note above for the three bugs found
  and fixed, and ADR-279 Amendment A3 for the recorded rationale). `package.sh`-only builds of
  1.1.0 and 1.2.0 both notarized Accepted with `Contents/Frameworks` signed on `package.sh`'s
  own path, no Xcode Distribute App step involved.

### Phase 1 (was Phase 2): EdDSA key generation + Sparkle 2 framework embedding (app side, D7)
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: 1.0.1 is shipped and live. `Contents/Frameworks` is signed correctly on the
  release path by Xcode's Distribute App (evidence in the demoted phase below), so
  `Sparkle.framework` inherits that same correct treatment and nothing gates this phase.
  **Pin Sparkle >= 2.9.5** — the 2026-08-02 release completes a security fix from 2.9.2 for
  symlink handling during patching. The Swift Package Manager distribution is a first-class
  release asset, so XcodeGen can take it as a package dependency rather than a vendored binary.
- **Deliverable**:
  - Generate the Sparkle EdDSA key pair using Sparkle's own `generate_keys` tool. Private key goes to environment/keychain per D3-class secret handling (**open question below**: exact storage mechanism). Public key is committed to the app via `SUPublicEDKey` in `Info.plist`/`project.yml` — this is not a secret, it ships in every binary by design.
  - Add Sparkle 2 as a dependency in `tools/ide/project.yml` (Swift Package Manager reference, resolved by XcodeGen) and confirm the generated Xcode project embeds `Sparkle.framework` plus its bundled `Autoupdate`/`Updater.app`/XPC services correctly.
  - `SUFeedURL` in `Info.plist` pointing at the sharpee.net appcast path (**open question below**: exact path — Phase 4 owns actually serving it, this phase only needs the URL string decided).
  - "Check for Updates…" menu item wired to `SPUStandardUpdaterController`, plus Sparkle's standard scheduled background check interval.
- **Exit state**: `xcodegen` + `xcodebuild` (the existing dev-loop, ADR-279 Acceptance 5's standing gate) still builds green with Sparkle embedded; "Check for Updates…" is present and does not crash the app when invoked against a placeholder/unreachable feed URL (no real appcast exists yet at this point in the plan).
- **Acceptance criteria covered**: app-side half of D7's "standard Sparkle integration" bullet. Standing Acceptance 5 applies (`SharpeeIDETests` stays green).
- **External prerequisites before this phase can start**: none blocking. The public key and feed
  URL are baked into every shipped binary, but nothing ships until Phase 4, so both are freely
  changeable until then. Working defaults taken 2026-08-15 (David to correct before first ship):
  appcast at `https://sharpee.net/downloads/chord-writer/appcast.xml`; private key in the login
  keychain, matching the `dc-notary` notarytool-profile precedent.
- **Status**: DONE — closed 2026-08-15. Verified on this machine, not inferred:
  - `xcodegen generate` + `xcodebuild ... build` → `** BUILD SUCCEEDED **` with the Sparkle
    package resolved as the project's first SPM dependency.
  - The built bundle embeds the framework *and* every out-of-process helper —
    `Contents/Frameworks/Sparkle.framework/Versions/B/` carries `Autoupdate`, `Updater.app`,
    `XPCServices/Downloader.xpc` and `XPCServices/Installer.xpc`.
  - `Info.plist` in the built app carries `SUFeedURL`
    (`https://sharpee.net/downloads/chord-writer/appcast.xml`), `SUPublicEDKey`
    (`Z8/cDMk7BW5vRz8p3HZCQL0Wgi6fVG2wpSRP1uQNt0A=`), `SUEnableAutomaticChecks` (true) and
    `SUScheduledCheckInterval` (86400).
  - EdDSA key pair generated by Sparkle's own `generate_keys`; private key in the login
    keychain (`generate_keys -p` previously reported "No existing signing key found", so this
    is the first and only key). Never written to the repo.
  - `xcodebuild test`: **490 tests, 0 failures** (was 482; 8 added in `SparkleIntegrationTests`).
  - Unplanned live corroboration: during the test run Sparkle's scheduled check fired for real
    and logged `A network error occurred while downloading
    https://sharpee.net/downloads/chord-writer/appcast.xml. not found (404)`. The 404 is the
    expected state — Phase 4 has not published the appcast yet — but it proves the updater
    started, read the feed URL out of the bundle, and made a real request. The wiring is live,
    not merely compiled.

### Phase 3: `package.sh` release pipeline — archive, EdDSA-sign, appcast entry (D7 pipeline)
- **Tier**: Large
- **Budget**: 400
- **Entry state**: Phase 1 done (package.sh signs correctly) and Phase 2 done (the app itself carries Sparkle, the public key, and a real `SUFeedURL`). The existing `package.sh` archive/sign/notarize/DMG/checksum pipeline (ADR-279 Phase 3 of the sibling plan) already exists and produces a notarized, stapled artifact.
- **Deliverable**:
  - `package.sh` gains a release step that: builds the update archive in the format decided by the open question below (DMG vs. ZIP), signs it with Sparkle's `sign_update` tool using the private key resolved from the environment/keychain (never written to the repo or the script), and computes the file size Sparkle's appcast schema requires alongside the signature.
  - `package.sh` gains an appcast-entry step: generate or append a new `<item>` to a local `appcast.xml` staging file — version, the GitHub Release asset URL (`chord-writer-v<version>` tag per D6), the EdDSA signature attribute, minimum system version. Write to a local staging path first; do not publish inside this phase (that's Phase 4's job) — follow the repo's now-standard "assert the artifact, not the exit code" pattern (`website/deploy.sh`'s Fernhill precedent) by asserting the generated `appcast.xml` fragment parses as valid XML and round-trips through Sparkle's own `sign_update -v` verification before the step reports success.
  - GitHub Releases tagging/upload step: create or update the `chord-writer-v<version>` tag, upload the DMG/ZIP + checksum as release assets (D6).
- **Exit state**: given a built, signed, notarized DMG from the existing pipeline, `package.sh` produces a correctly-formed, EdDSA-signature-verified appcast XML fragment referencing a real GitHub Release asset — entirely mechanical, no manual XML editing.
- **REAL-PATH TEST (rule 13a — no stub)**: run the new release steps for real against a real (non-production, see open question below on whether this targets a throwaway tag) GitHub Release, and verify the generated appcast entry's signature with Sparkle's own verification tool against the actual uploaded archive bytes — not a hand-constructed test fixture standing in for the archive.
- **Acceptance criteria covered**: the scripting half of D7's pipeline bullet, and the D6 GitHub Releases/tagging mechanic (no standalone numbered AC — verified here by confirming a real tagged release with real assets exists). Standing Acceptance 5 applies.
- **External prerequisites**: RESOLVED — the EdDSA key pair is generated and in the login
  keychain, and `sign_update` was confirmed to reach it (2026-08-15), so the hard blocker this
  phase carried is closed.
- **Status**: DONE — closed 2026-08-15. GitHub Releases tagging is withdrawn from this phase's
  deliverable by ADR-279 Amendment A2 (2026-08-15): sharpee.net serves artifacts directly,
  files exist only on the plover server, and there is no `chord-writer-v<version>` tag. Per-arch
  appcasts were added per Amendment A3 (Sparkle has no architecture filter). Written and verified:
  - `tools/ide/fetch-sparkle-tools.sh` — fetches Sparkle 2.9.5 pinned by version **and**
    sha256, extracting `sign_update`, `generate_appcast`, `generate_keys` into a gitignored
    `.sparkle-tools/`. Both branches exercised: clean install, idempotent re-run, and a forced
    checksum mismatch that refuses to extract (exit 1).
  - `tools/ide/sparkle/make-update.sh` — builds the ZIP from the stapled app, asserts the
    signature and notarization ticket survive an archive round trip, then runs
    `generate_appcast` per architecture.
  - `tools/ide/sparkle/update-realpath-test.sh` — drives the above against a real stapled app,
    verifying the appcast's signature against the archive's actual bytes with Sparkle's own
    verifier, and that the app's compiled-in `SUFeedURL` matches the feed generated. One bug
    found and fixed: the test initially passed the EdDSA signature into `sign_update`'s `-s`
    slot, which is the private-key argument — a checker error, not a release error.
  - `package.sh` step 10 calls `make-update.sh`; `release-all.sh` added as an unattended
    both-architecture driver that polls notarization and collects an upload folder.
  - 1.1.0 (`CFBundleVersion` 3) built and fully notarized on both slices but never
    published — superseded before release by the `LSMinimumSystemVersion` fix below.
  - **1.2.0** (`CFBundleVersion` 4) shipped: notarization Accepted for app and DMG on both
    architectures, Gatekeeper `source=Notarized Developer ID` on both DMGs, appcast signatures
    verified against real archive bytes with Sparkle's own verifier. Artifacts collected to
    `tools/ide/release/1.2.0/` (6 files + `CHECKSUMS.txt` + `UPLOAD.md`), not yet uploaded
    (Phase 4).
  - Incidental fix folded in: `LSMinimumSystemVersion` had read 26.0 since the IDE's first
    commit while every binary is minos 11.0 (verified with `otool` on the app, vendored node,
    and Sparkle) — Launch Services would refuse to start the app on macOS 11-25, and Sparkle
    propagated the false floor into the appcast as an update gate. Fixed to 11.0 in three
    places plus a new `assert_minimum_system_version` guard in `package.sh`.
  - Notarization infrastructure: `xcrun notarytool submit` crashed mid-call (exit 138) three
    times tonight, each time after Apple accepted the upload but before returning a submission
    id — a recurrence of 4 prior occurrences already documented in `package.sh`'s own header.
    `notarize_artifact` now recovers the submission id from notarytool history when submit
    returns none; two submissions were manually recovered this way before the fix landed.

### Phase 4: sharpee.net appcast hosting (site-side)
- **Tier**: Small
- **Budget**: 100
- **Entry state**: Phase 3 done — a real, EdDSA-verified appcast XML fragment can be generated locally. The appcast URL path was already decided in Phase 2 (baked into the shipped `SUFeedURL`), so this phase serves exactly that path, not a path chosen fresh.
- **Deliverable**: sharpee.net (Next.js behind Apache, `website/`) serves `appcast.xml` at the URL Phase 2 baked in. Wire the publish step into `website/deploy.sh` following the same artifact-existence-assertion pattern the Fernhill fix established: assert the published `appcast.xml` is actually present and parses at the served URL after deploy, not just that the deploy script exited 0. Consistent with the repo's established human/automation boundary, the final `sudo`/service-restart step is David's to run (`website/deploy.sh`'s existing precedent) — this phase delivers the scripted, asserted publish step up to that point, not an autonomous production push.
- **Exit state**: `curl https://sharpee.net/<appcast-path>` (the exact path from Phase 2) returns the real appcast XML with a valid EdDSA signature on its `<item>`.
- **Acceptance criteria covered**: the hosting half of D6/D7 (no standalone numbered AC — verified by the curl check above).
- **External prerequisites before this phase can start**: none beyond Phase 3's output and David's availability for the final deploy step (same pattern as every other sharpee.net publish in this repo).
- **Status**: DONE — closed 2026-08-15. 1.2.0's artifacts were uploaded to plover and the site
  redeployed (David's manual step). Verified from this machine 2026-08-15:
  `https://sharpee.net/downloads/chord-writer/appcast-arm64.xml` → 200,
  `https://sharpee.net/downloads/chord-writer/appcast-x86_64.xml` → 200,
  `https://sharpee.net/downloads/ChordWriter-1.2.0-arm64.zip` → 200 (per-arch feeds per
  ADR-279 Amendment A3; the original single-feed path from Phase 2's working default is
  superseded and intentionally 404s).

### Phase 5: End-to-end real-path proof (Acceptance 7)
- **Tier**: Medium
- **Budget**: 250
- **Entry state**: Phases 1-4 all done: `package.sh` signs correctly, the app carries Sparkle + the real feed URL, the release pipeline produces a real EdDSA-signed archive and appcast entry, and sharpee.net serves it.
- **Deliverable**: Because the first Sparkle-carrying build is the earliest version with any update path (see the plan-level consequence note), this real-path test needs two Sparkle-enabled builds, not one — there is no pre-Sparkle version to update *from* that Sparkle itself can ever reach. Install build N (Sparkle-enabled, `SUFeedURL` pointed at a staging appcast URL to avoid a public dry-run release — a local HTTP server or a non-production sharpee.net path, David's choice), then publish build N+1 for real through the full Phase 3/4 pipeline, point the staging appcast at it, trigger "Check for Updates…" on the installed N build, and let it run unassisted.
- **REAL-PATH TEST (rule 13a — no stub, this phase exists only to be one)**: confirm, against the real Sparkle.framework binary and the real published archive, that the app downloads the update, EdDSA-verifies it (Sparkle's own verification, not a bypassed/mocked check), and relaunches at N+1. A test that points Sparkle at a local static feed file only proves the integration compiles — it does not satisfy Acceptance 7, which names the download → verify → relaunch sequence explicitly.
- **Exit state**: Acceptance Criterion 7 satisfied and documented with evidence (submission IDs, before/after version numbers, Sparkle's verification log output). Once this passes against a staging appcast, a final confirmation against the real production sharpee.net appcast (Phase 4's actual hosting path) is the ship gate for declaring D7 complete — a staging pass alone does not close this phase.
- **Also absorbed here** (`mutation-verification`, 2026-08-15): no test ever *calls*
  `UpdateController.checkForUpdates()` — the Phase 1 tests assert bundle and configuration
  state around it, never invocation. Deliberately deferred to this phase rather than fixed in
  Phase 1: with no appcast published, a test that invokes it starts a real session that ends
  in a modal error alert, which risks hanging the suite on a dialog no test can dismiss. Here
  a controlled feed exists and that alert is itself assertable. This phase must therefore
  cover the three REJECTS WHEN conditions (feed unreachable or malformed, signature fails to
  verify, nothing newer than the running version) alongside the success path.
- **Acceptance criteria covered**: Acceptance 7 in full.
- **External prerequisites before this phase can start**: a second, currently-nonexistent Chord Writer version to publish as "N+1" — coordinate with whatever version-numbering decision comes out of the open questions below, since this phase needs two real version bumps, not one.
- **Status**: DONE — closed 2026-08-15 on David's confirmation that the plan is complete
  (the end-to-end update was exercised outside this session; no evidence log was captured
  here, so Acceptance 7's artifacts — submission IDs, before/after versions, Sparkle
  verification log — are recorded as [reported by David], with the live per-arch feeds and
  update ZIPs verified served (200) from this machine 2026-08-15).

## Open Questions (David's decision — not resolved by this plan)

1. **Appcast URL path on sharpee.net.** E.g. `sharpee.net/downloads/chord-writer/appcast.xml` vs. some other path. Baked into every shipped binary's `SUFeedURL` in Phase 2 — cannot change later without stranding that release line.
2. **EdDSA private-key storage.** Environment variable on the build Mac, a keychain item (matching the existing `notarytool` keychain-profile precedent), or a file outside the repo like the notary API key's `~/.appstoreconnect/private_keys/` precedent. D3-class secret; must never enter the repo.
3. **First Sparkle-carrying version number.** 1.0.2, 1.1.0, or something else — affects the DMG filename, the `CFBundleShortVersionString`, and the GitHub Release tag Phase 3 creates.
4. **Release archive format for the Sparkle payload: DMG or ZIP.** Sparkle conventionally prefers a ZIP of the `.app` (enables its binary-delta update path); a DMG works but forgoes deltas unless paired with Sparkle's own DMG-plus-inner-archive convention. Affects Phase 3's archive-generation step and Phase 5's real-path test.
5. **Whether Phase 5's staging real-path test targets a throwaway/pre-release GitHub tag or the real `chord-writer-v<version>` line**, to decide whether a public "dry-run" release is acceptable or must stay off GitHub's public release list entirely.
