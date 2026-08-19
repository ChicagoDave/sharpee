# Session Plan: Per-architecture restructure of Chord Writer release tooling

**Created**: 2026-08-18
**Plan Status**: DONE (2026-08-18)
**Overall scope**: Restructure `tools/ide/package.sh` and `tools/ide/release-all.sh` so each
architecture slice (`arm64`, `x86_64`) is fully self-contained under `release/<arch>/` —
notarization ledger, staged app, DMG, checksums, and Sparkle payload — eliminating the
shared-root-state hazard (Defect A). Independently, fix `package.sh` so an artifact's shipped
architecture is derived from the artifact itself rather than the build host or an optional flag
(Defect B), which is the actual cause of the 2026-08-18 mislabeled-DMG incident and is not fixed
by the directory split alone. A live release (Chord Writer 1.3.0) is mid-flight and is closed out
first, on unmodified tooling, before either fix lands.
**Bounded contexts touched**: N/A — infrastructure/tooling (macOS signing/notarization pipeline
in `tools/ide/`). No domain model applies; phases are named in plain technical terms per the
DDD-does-not-apply carve-out.
**Key domain language**: N/A

## References consulted
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` — D3 draws the ownership boundary this plan must not cross: every signing/notarization gate belongs in `package.sh`; `release-all.sh` is a driver only (Amendment A3 states this explicitly for the per-arch appcast work this restructure extends). `--dmg-from` exists specifically to *re-verify, never trust* a foreign bundle — the arch-provenance fix (Defect B) must follow that same posture, not add a shortcut that trusts a flag or the host.
- `docs/context/project-profile.md` — `tools/ide` is Mac-only Swift/bash tooling deliberately kept outside `repokit` (Node-only, IDE-ignorant); no platform-package change is implied by this work, so the CLAUDE.md "platform changes require discussion first" gate does not apply here.
- `docs/context/session-20260818-0336-fix-ci-esm-target.md` — records the exact live state this plan must reconcile with: Chord Writer 1.3.0 is mid-release, submission `4af2103f-9985-467f-8a00-37517357abb1` (the mislabeled DMG) is the open item, and the session's own §12 already names the shared-ledger sequencing hazard as the reason Intel had to wait for ARM to fully clear — this plan's Defect A is that hazard's structural fix.

## Phases

### Phase 1: Close out Chord Writer 1.3.0 on unmodified tooling
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — release operations, no code change
- **Entry state**: ARM and Intel `.app` bundles are notarized and stapled (`Chord Writer ARM 20260818.app`, `Chord Writer x86 20260818.app`, both in `tools/ide/release/`). The ARM Sparkle payload (`ChordWriter-1.3.0-arm64.zip`, `appcast-arm64.xml`, one delta) is valid and complete under `release/sparkle/arm64/`. `ChordWriter-1.3.0-arm64.dmg` is wrong (contains the x86_64 app). `.notarize-state` holds a stale `DMG_SUBMISSION` for the mislabeled DMG.
- **Deliverable**: 1.3.0 shipped end to end using today's `package.sh`/`release-all.sh` exactly as they stand — no code touched in this phase. Steps: discard the stale ledger entry (`4af2103f-9985-467f-8a00-37517357abb1` is never stapled to anything — it is simply abandoned, not cancelled, Apple has no cancel API), rebuild and notarize a correct `ChordWriter-1.3.0-arm64.dmg` from the real ARM app, build and notarize `ChordWriter-1.3.0-x86_64.dmg` via `package.sh --dmg-from "tools/ide/release/Chord Writer x86 20260818.app"`, collect both slices' artifacts, upload to plover per the `release/1.2.0/UPLOAD.md` pattern, bump the website's version strings and real DMG sizes, deploy.
- **Exit state**: `sharpee.net/downloads/` serves correct arm64 and x86_64 1.3.0 DMGs and appcasts; both feeds return 200; website shows 1.3.0. `release/.notarize-state` is cleared. This is the last release this plan runs through the unmodified, shared-root-state pipeline — nothing about Defects A or B is fixed yet, and that is deliberate: the surgery in Phases 2-4 should not be rehearsed for the first time against a live release already in flight.
- **Why this ordering rather than shipping 1.3.0 on the new tooling**: the restructure changes where `package.sh` reads and writes its ledger and staged app (Phase 3) and changes how it resolves an artifact's architecture (Phase 2). 1.3.0 already has real, valid, hard-won state sitting at the *old* paths (a stapled ARM app, a complete ARM Sparkle payload with a real delta). Cutting 1.3.0 over to new code mid-release would mean either migrating that state by hand under time pressure or discarding and re-earning it — both riskier than finishing on the tooling that produced it. The restructure gets its own first real release in Phase 4, on tooling that has already been exercised.
- **Status**: DONE (2026-08-18) — but NOT as written. The phase's deliverable was "1.3.0 shipped end to end using today's package.sh/release-all.sh exactly as they stand". That is what did not happen: two attempts on the unmodified tooling both hit Defect B, the second overwriting the arm64 Sparkle archive with Intel bytes. David then ruled the artifacts disposable ("I don't care about any of the existing build artifacts - I want this process repaired and working - that's the priority"), so 1.3.0 was rebuilt on the REPAIRED pipeline in Phase 4 instead. The phase's GOAL (1.3.0 built, notarized, stapled, collected) is met; its premise — that finishing on the old tooling was the safer route — was wrong, and is recorded here rather than quietly dropped. Originally DEFERRED — reordered 2026-08-18 on David's ruling ("I don't care about any of the existing build artifacts - I want this process repaired and working - that's the priority"). Phase 1 tried twice and hit Defect B both times, the second time destroying the arm64 Sparkle archive it was meant to protect. Artifacts are now disposable; the fixed pipeline rebuilds them. Runs after Phase 3.

### Phase 2: Fix Defect B — derive shipped architecture from the artifact, not the host
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A
- **Entry state**: Phase 1 done — 1.3.0 shipped, `.notarize-state` clear, no release in flight. `package.sh` line ~610 defaults `ARCH` to `uname -m` and never compares the resolved `ARCH_SLUG` against the actual bytes of the artifact it packages, for either the build path or `--dmg-from`. `assert_arch_agreement` (line ~396) only compares the app binary's arch against its own bundled node's arch — never against `ARCH_SLUG`/`DMG_NAME`.
- **Deliverable**:
  1. For `--dmg-from`: resolve `ARCH_SLUG` from `lipo -archs "$adopted/Contents/MacOS/Chord Writer"` unconditionally — never from `--arch` or the host. If `--arch` was also passed, assert it agrees with the derived value and `die` with the mismatch spelled out (both the flag's value and the binary's real arch) rather than silently preferring one. This is the exact fix for the 2026-08-18 incident: `--dmg-from` on an Intel app, run on an Apple Silicon host, must refuse rather than name the DMG `arm64`.
  2. For the build path: after `xcodebuild archive`, add a defense-in-depth assertion that the produced app's actual arch (`lipo -archs`) matches the `ARCH_SLUG` that was passed as `ARCHS=` — closes the loop even though `ARCHS` is already passed explicitly, per the same "trust nothing, verify everything" posture `--dmg-from` already uses.
  3. Update the script's header comment and the `--arch`/`--dmg-from` doc block to state the new rule: arch is a property of the bytes, asserted, never inferred.
- **Exit state**: `package.sh --dmg-from <path>` names its DMG and stages its directory from the artifact's real architecture in every case; a mismatched `--arch` flag is a hard refusal, not a hint.
- **Real-path test (rule 13a)**: this defect fires before any network call — `ARCH_SLUG` is computed, asserted, and used to name the DMG entirely locally. Reproduce the actual incident against the real, already-signed-and-stapled 1.3.0 `.app` bundles still sitting in `tools/ide/release/` (do not delete them in Phase 1): run `package.sh --dmg-from "tools/ide/release/Chord Writer x86 20260818.app"` on this arm64 machine and confirm the fixed script now `die`s naming the mismatch, where the unfixed script silently proceeded to build `ChordWriter-<version>-arm64.dmg` around an x86_64 app. This is a real run of the production script against real artifacts — not a stub — and it costs zero notarization round-trips because the fix acts before step 7 (Notarizing the app) is ever reached. No OWNED-dependency stub is used; STUB JUSTIFICATION: none needed.
- **Scope grew during implementation**: the RESUME path needed the same derivation and was not in the phase text — a bare `package.sh` resume took the host arch and overwrote the arm64 Sparkle archive with Intel bytes (2026-08-18, the second incident). Implemented precedence: adopted app -> staged app -> `--arch` -> host (build path only). `--arch` was also absent from `USAGE` despite being the only defense against this class; added. `lipo` added to the required-tools check.
- **Status**: DONE (2026-08-18) — real-path tested against the actual signed/stapled 1.3.0 `.app` bundles, zero notarization spent (the check fires before any submission). `--dmg-from <Intel app>` with no flag on an arm64 host now reads `x86_64` where it silently read `arm64`; both `--arch` mismatch directions hard-refuse naming the flag value and the bundle's real arch; a bare resume with an x86_64 staged app on an arm64 host reads `x86_64`. Build path also asserts the archive matches the requested `ARCHS=`.

### Phase 3: Fix Defect A — restructure `release/` into self-contained per-arch slices
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A
- **Entry state**: Phase 2 done — arch is now authoritatively derived from artifacts. `package.sh` still keeps one shared `RELEASE_DIR="$IDE_DIR/release"`, one `STATE_FILE="$RELEASE_DIR/.notarize-state"` with arch-agnostic keys (`APP_SUBMISSION`/`DMG_SUBMISSION`), and one `STAGED_APP="$RELEASE_DIR/Chord Writer.app"`, computed *before* `ARCH_SLUG` exists (line ~222-223 vs. line ~610-616). `release/sparkle/<arch>/` is already arch-scoped; the ledger and staged app are the only holdouts. `release-all.sh` carries a cross-arch ledger guard (lines ~99-114) in the driver specifically because the ledger is shared — calling `package.sh` directly bypasses that guard entirely.
- **Deliverable**:
  1. Reorder `package.sh`: move version + `ARCH`/`ARCH_SLUG` resolution (currently line ~601-616) up before the "Notarization state" section (currently line ~211-233), since the state paths now depend on the arch.
  2. Introduce `ARCH_RELEASE_DIR="$RELEASE_DIR/$ARCH_SLUG"`. Repoint `STATE_FILE`, `STAGED_APP`, `DMG_PATH`, and the checksum file under it. `DMG_NAME` itself is unchanged (`ChordWriter-<version>-<arch>.dmg`) — only its containing directory moves; the served filename is a hard constraint (SUFeedURL is compiled into every shipped binary) and this restructure only touches internal layout.
  3. `sparkle/make-update.sh` currently builds its own `<release-dir>/sparkle/<arch-slug>/` — written for the old shared-root call where `<release-dir>` carried no arch. Passing it the new `$ARCH_RELEASE_DIR` unchanged would nest the arch twice (`release/arm64/sparkle/arm64/`). Change the call site to pass `$ARCH_RELEASE_DIR` and change `make-update.sh` to write directly to `<release-dir>/sparkle/` (drop its own arch subfolder — the caller's directory already carries the arch). Final home: `release/<arch>/sparkle/appcast-<arch>.xml`, `release/<arch>/sparkle/ChordWriter-<version>-<arch>.zip` (+ `.sha256`, + any delta files) — one level, not two. Update `make-update.sh`'s header doc (`Writes into <release-dir>/sparkle/<arch-slug>/:`) to match.
  4. Update `release-all.sh`: `STATE`/staged-app paths become per-arch (`$RELEASE_DIR/$arch/.notarize-state`, `$RELEASE_DIR/$arch/Chord Writer.app`), `wait_for_submission` reads the arch-specific ledger, `build_arch`'s `dmg=` and appcast-existence check move to `$RELEASE_DIR/$arch/ChordWriter-$VERSION-$arch.dmg` and `$RELEASE_DIR/$arch/sparkle/appcast-$arch.xml`, and the artifact-collection step's `cp` calls read from those same per-arch paths instead of the shared root. Retire the cross-arch ledger guard (lines ~99-114) — it exists solely because one ledger could belong to the wrong slice, which is now structurally impossible; replace with nothing, or with a narrower "the expected slice's own ledger is internally consistent" check if implementation turns up a reason to keep one. Record the reasoning either way in the script's comment, since this is exactly the kind of guard whose removal needs a stated reason next to it.
  5. Verify `.gitignore` needs no change: `tools/ide/.gitignore`'s `release/` entry already recursively ignores everything under any new subdirectory (`git check-ignore` verified this against hypothetical `release/arm64/...` paths during planning) — note this in the commit rather than adding a redundant rule.
  6. Update `package.sh`'s and `release-all.sh`'s header comments (both currently document the old shared-root layout) to describe the new per-arch layout.
- **Exit state**: A fresh `package.sh --arch arm64` and a fresh `package.sh --arch x86_64` run never read or write a path the other touches, at any stage from ledger through Sparkle payload. `release-all.sh` collects both slices into `release/<version>/` exactly as before (the collection step's *output* shape — server-mirrored `downloads/` — does not change; only where it reads *from* changes).
- **Real-path test (rule 13a)**: run `package.sh --arch arm64 --no-notarize` and `package.sh --arch x86_64 --no-notarize` back to back on this machine. This exercises the real build, real `xcodegen`/`xcodebuild archive`, real codesign and seal-scan gates — everything through step 6 — and confirms each writes its ledger and stages its app under its own `release/<arch>/`, with neither run's files appearing under the other's directory. `--no-notarize` is the script's own built-in rehearsal mode (not a stub introduced by this plan) and stops before any network call, so this proves the directory isolation for every stage that does not require Apple. **What this phase's test does NOT prove**, and is not claimed to: the DMG-assembly, DMG-notarization, and Sparkle-payload placement under `release/<arch>/sparkle/` — those stages only run after a real notarization accept, and manufacturing one purely to test a directory path would be exactly the "gratuitous resubmission" the constraints rule out. That proof is Phase 4's job, as the first real release the new layout ships.
- **Status**: DONE (2026-08-18) — verified by two real `--no-notarize` builds: `release/arm64/Chord Writer.app` is arm64, `release/x86_64/Chord Writer.app` is x86_64, neither slice wrote to the other or to `release/` root. `.gitignore` confirmed to need no change (`git check-ignore -v` resolves both new paths to `tools/ide/.gitignore:18:release/`). The resume scan cannot mistake `1.2.0/`, `sparkle/` or a stray `.app` for a slice — it requires both a ledger and a staged app.

### Phase 4: First real release through the restructured pipeline
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A
- **Entry state**: Phase 3 done and its `--no-notarize` rehearsal passed for both arches. This phase requires an actual version bump David is ready to ship (whatever the next real Chord Writer version is) — it is gated on that, not on elapsed time.
- **Deliverable**: `release-all.sh` run end to end for both architectures on the restructured pipeline: real notarization submissions for both apps and both DMGs, real Sparkle payloads written to `release/<arch>/sparkle/`, real collection into `release/<version>/downloads/` mirroring the server, real upload and website deploy. This is the genuine integration test for Defect A — the one this plan's earlier phases explicitly deferred rather than faked.
- **Exit state**: A real Chord Writer version is live on `sharpee.net`, built entirely through `release/<arch>/`-isolated tooling, with both slices' ledgers, staged apps, DMGs, and Sparkle payloads never having touched a shared path at any point in the run.
- **Real-path test (rule 13a)**: the release itself. OWNED dependencies (notarytool submission, DMG assembly, Sparkle payload signing, the website's deploy step) are all exercised for real, against production infrastructure, because this phase's deliverable *is* a shipped release. No stub is possible or appropriate here.
- **Status**: DONE (2026-08-18) — Chord Writer 1.3.0 built end to end through the restructured pipeline via `./tools/ide/release-all.sh`, with NO Xcode at any point (see the amendment below). Both slices verified: app/bundled-node arch agreement (arm64/arm64, x86_64/x86_64), `SUFeedURL` correctly per-arch, 1.3.0/build 5, Gatekeeper `accepted, source=Notarized Developer ID` on both DMGs. Sparkle payload landed one level deep (`release/<arch>/sparkle/`), confirming the double-nesting this plan predicted was avoided. Collected to `tools/ide/release/1.3.0/` — six served files plus CHECKSUMS.txt and UPLOAD.md.
- **Follow-on gaps found and fixed while running it**: `release-all.sh` had no way to re-assemble `release/<version>/` once both slices finished (completing a slice CLEARS its ledger, so a re-run started a fresh build instead of collecting) — added `--collect-only`. The Sparkle success message still printed the old `release/sparkle/<arch>/` path. The generated `UPLOAD.md` named `david@plover.net`; the correct user is `dave@plover.net`.
- **Not done here, and not code**: uploading the six files to plover, bumping the website version strings to 1.3.0 (real sizes: arm64 59M, x86_64 60M), and `./website/deploy.sh --no-pull`. Release operations, carried forward outside this plan.

## Amendment 2026-08-18 — Xcode Organizer is not required and should not be used

David: "please look at tools/ide/direct-dist.md - I should not have to run the distribution from xcode".

He is right, and the evidence is in this plan's own Phase 3 test log. `package.sh`'s build
path already signs the app and every nested binary with Developer ID
(`7 items under Contents/Frameworks signed with Developer ID`, team RSNGKW5LNH,
hardened runtime, node entitlements), and its step 7 submits the app to the notary.
A bare `package.sh --arch <arch>` therefore performs archive -> sign -> notarize ->
staple -> DMG -> notarize -> staple -> Sparkle with no Xcode UI at any point.
`direct-dist.md`'s `xcodebuild -exportArchive -exportOptionsPlist (method: developer-id)`
route is not needed either — package.sh reaches the same signed state without an
export step, because it archives ad-hoc and re-signs with Developer ID itself.

`--dmg-from` exists FOR the Xcode route. Using it is what pulled in Organizer and
its XPC distribution helper, which produced five orphaned notary submissions
(NSCocoaErrorDomain 4097, helper died mid-upload leaving a submission id with no
payload) and both cross-arch corruption incidents on 2026-08-18. The route to
prefer is the CLI one.

The one real constraint behind the submit-and-exit design stands and is narrower
than "use Xcode": `notarytool submit --wait` Bus-errored on this machine 4 of 4
attempts (2026-08-10/11), always inside the wait, never the submit — hence
`release-all.sh` polling and resuming rather than blocking. Note a `--wait` call
succeeded on 2026-08-18, so that may have aged out; worth re-testing before
relying on it.

## Open question — not decided by this plan, flagged for David

`tools/ide/dmg/assemble-dmg.sh` mounts every DMG under the volume name `"Chord Writer <version>"`
(no arch in it) and its stale-mount sweep (lines ~113-136) only clears *this* run's own stranded
volumes from earlier runs, not a genuinely concurrent run's in-flight mount. Today `release-all.sh`
builds architectures **sequentially**, so this is not live risk yet — but the per-arch directory
split in Phase 3 is the thing that would make true parallel builds (two terminals, two arches, at
once) sensible for the first time, and if that is ever done, two DMG assemblies sharing one volume
name could have one detach the other's in-flight mount. Making the volume name arch-distinct
(`"Chord Writer <version> (arm64)"`) closes it, but the volume name is what an author sees when
they double-click the DMG — that is a product/branding call, not a tooling one, and this plan does
not make it. If David wants parallel `release-all.sh` runs, this needs a decision before Phase 4;
otherwise it can sit as a documented constraint (sequential-only) indefinitely.
