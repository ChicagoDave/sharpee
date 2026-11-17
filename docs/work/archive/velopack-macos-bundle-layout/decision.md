# ADR-351 Q-5 — is the macOS bundle layout fixable by post-processing alone?

**Answer: yes, and the stronger condition behind the question is also yes.** A Velopack-produced macOS `.app` can be rearranged so the payload lives in `Contents/Resources`, and the resulting bundle signs, seals, updates, notarizes, staples and passes Gatekeeper. Apple accepted it on the first submission.

**This record does not edit ADR-351.** Folding this answer back into Q-5 and re-reading D2 in its light is David's call. What this gives him is a settled answer with the evidence under it, so that re-reading does not have to re-derive anything.

**Written**: 2026-09-16, session e923d3, on `main`. **Plan**: `plan.md` (this directory), Phases 1-4. **Evidence**: `evidence/phase-1-apphost-relocation.md`, `evidence/phase-2-update-apply.md`, `evidence/phase3-signing-pre-notarization.txt`, and the raw command logs beside them. Spike code and bundles outside the repository at `/Users/david/repos/spikes/avalonia-ide/`, per the plan's scope rule. Toolchain: `vpk` 1.2.0 on .NET 10.0.300, Xcode 26.4's `codesign`/`spctl`/`stapler`, `tools/ide/notary-submit.py`.

---

## 1. The recipe

Two scripts and one ordering constraint. Nothing else.

```
relocate.sh          move the payload from Contents/MacOS to Contents/Resources   (20 lines)
patch-apphost.py     rewrite the AppHost's embedded app-path field                (25 lines)
vpk pack --packDir <relocated .app> --signAppIdentity "Developer ID Application: …"
```

The AppHost stores the path it loads at a fixed offset in the binary — offset **66088** in this one, holding `PaneHost.dll`, patched to `../Resources/PaneHost.dll` (`evidence/phase-1-apphost-relocation.md:97-103`). `relocate.sh` moved **222 entries**, leaving `Contents/MacOS` holding only `PaneHost`, `UpdateMac`, and the `sq.version` symlink upstream velopack/velopack#705 already puts there (`:75-81`).

**The ordering constraint is the one non-obvious part.** The relocation must happen *before* `vpk pack`, not after. `vpk pack` accepts a pre-built `.app` as `--packDir` and passes its `Contents/` tree through unchanged, so the `.nupkg` then carries the relocated layout natively and no post-apply hook is needed (`evidence/phase-2-update-apply.md:36-50`). Feeding `vpk` an already-packed relocated bundle instead collides on `sq.version` inside `OsxPackCommandRunner.PreprocessPackDir`, which creates that symlink with `overwrite: false` (`:65-68`).

So "post-processing" here means post-processing the `publish` output on the way into `vpk`, and Phase 1 separately proved the harder version — post-processing `vpk`'s own finished output — also works.

## 2. The three sub-questions

**Sub-question 1 — can the AppHost be pointed at a relocated payload at all? YES.** The patched bundle runs identically to the unmodified baseline (only two embedded wall-clock timings differ). The negative control makes the patch load-bearing rather than incidental: the *unpatched* AppHost on the relocated layout fails with `The application to execute does not exist: …/Contents/MacOS/PaneHost.dll`. Ad-hoc sealing of the whole relocated bundle succeeds with **no `--deep` flag needed** — `Sealed Resources version=2 rules=13 files=9984`, and `codesign --verify --deep --strict --verbose=2` reports `valid on disk` and `satisfies its Designated Requirement`. Phase 5's terminal state on this route, *"code has no resources but signature indicates they must be present"*, does not recur. Record: `evidence/phase-1-apphost-relocation.md`.

**Sub-question 2 — does Velopack's update-apply path survive it? YES.** A full round trip through the real `UpdateMac apply`: delta reconstruction in 4.45s, 235 symlinks recreated, layout intact, seal scan clean, app and bundled toolchain both running. The relocation costs nothing measurable — full package 99,908,968 bytes and delta 8,274,247 at 28.4s pack time, against the flat-layout baseline's 99,829,165 / 8,114,592 at 34.5s. One condition found and closed: applying a package built from an *unsigned* app destroys the bundle seal, reproducing Phase 5's prior failure exactly; packing with `--signAppIdentity` puts `_CodeSignature` inside the `.nupkg` and the installed bundle stays sealed, verified both post-apply and on a fresh install from the same package (`Sealed Resources … files=9985` both times, so determinism rather than a one-off pass). Record: `evidence/phase-2-update-apply.md`.

**Sub-question 3 — does it sign and notarize end to end? YES.** The plain `--signAppIdentity` route worked on the first attempt: `vpk`'s own recursive `codesign --deep` step finished in 2s, which is precisely the route that failed against the pnpm store in Phase 5. No presign pass, no `--signDisableDeep`, no per-binary loop — so `tools/ide/package.sh`'s `sign_macho` approach, which the plan named as the reference implementation to reproduce, turned out not to be needed for this bundle. Developer ID Application: David Cornelson (RSNGKW5LNH), hardened runtime on the bundle and all 20 Mach-O binaries, 20/20 Developer-ID signed. Notarization submission `cbcd0706-f65c-4f13-9460-e9be833044ca`: **Accepted**, first submission, no orphan. Stapled, and `spctl --assess --type execute -vv` then reports `accepted` / `source=Notarized Developer ID` — the exact inversion of the pre-notarization `rejected` / `Unnotarized Developer ID` that was the correct state to be in at that moment. Seal and bundled toolchain both survive stapling; the toolchain still answers `Sharpee 5.4.1 · Chord 3.6.0` from inside the notarized bundle. Record: `evidence/phase3-signing-pre-notarization.txt`.

Also settled, because the plan required this phase to answer it rather than inherit it: the artifact shape is the **`.app` zip** (`ditto -c -k --sequesterRsrc --keepParent`), with the `.dmg` wrapper the shipping IDE already uses needing only the Application identity in hand. The missing Developer ID Installer certificate that `phase-5-velopack-packaging.md` §6.3 records never became a dependency, because the `.pkg` path is not on this route.

## 3. Two answers, stated separately

The plan required these to be given separately, because they can diverge and the consequence language attaches to only one of them.

**(i) Q-5 as literally worded — is the layout fixable by post-processing *alone*? YES.** No `vpk` version has a macOS layout option: Phase 1 step 0 checked the installed 1.2.0 and a prerelease (1.2.110-ge826545) on a scratch tool-path and found identical `bundle`/`pack` option sets, with no upstream issue asking for one (`evidence/phase-1-apphost-relocation.md:14-28`). The fix is therefore entirely outside Velopack — 45 lines of shell and Python, no fork, no patched dependency, no upstream change waited on.

**(ii) The condition D2 actually rests on — is there a solved macOS bundle layout by any route? YES.** Same answer here, reached the same way, and carried further than (i) strictly needs: through the update-apply path and through Apple's notary service to a stapled bundle that Gatekeeper accepts.

The divergence the plan warned about — a `vpk` layout option would make (i) NO and (ii) YES — did not materialize. There is no option; there is a recipe.

## 4. What this licenses, and what it does not

**ADR-351's catastrophic consequence language does not attach.** Q-5 states that if the layout cannot be fixed, *"O6 cannot ship on macOS and collapses to 'a better WPF for Windows,' which is a materially smaller claim than D2 makes."* That clause is conditioned on (ii) being NO. (ii) is YES, so the clause is discharged: nothing in this record supports quoting it, and the macOS half of D2's claim survives this question intact.

**What this record does not say.** It does not say O6 is the right shape — that is ADR-341 D3 and the Avalonia evaluation's recommendation, neither of which this work touches. It does not price the *shipping* integration of the recipe into `tools/ide/` (this was a spike bundle, `ChordWriterAvaloniaSpike`, not Chord Writer). It says nothing about the x86_64 slice, which was signed and notarized separately in past releases and is not exercised here. And it answers Q-5 only: Q-2, Q-3, Q-4 and Q-6 are untouched.

## 5. Cost, now priced

GH #462 item (1) recorded this step as **unpriced**. It is now priced: two scripts totalling 45 lines, one ordering constraint (relocate before pack), and no measurable packaging or update overhead. That is the whole bill. The `--signAppIdentity` discovery actually *removes* anticipated cost — the plan budgeted for reproducing `package.sh`'s per-binary signing against the relocated payload, and that proved unnecessary.

## 6. Owed, and not closed here

- **GH #462** items (2) replay over-run, (3) editor light palette, (4) localStorage persistence across restart — untouched by this plan. Item (1) is answered above.
- **GH #474** — the Phase 4 shell probe reads every asset from absolute paths outside the bundle (`pane/PaneHost/Shell/ShellWindow.axaml.cs:34-38`), so it is a launch check and not evidence about the bundled toolchain. Filed during Phase 1; Phase 1 wrote its own ad-hoc toolchain check rather than trusting it.
- **A process finding worth more than its size.** Phase 3 blocked a session on the App Store Connect Issuer UUID, recorded as living "only in the `dc-notary` keychain profile." It was in this repository the whole time — `docs/work/archive/adr-279-chord-writer-packaging/plan.md:95`, with the key path and key id beside it — and the keychain was never the route at all: notarytool stores that profile in the data-protection keychain, which the `security` CLI cannot read (`security dump-keychain | grep -i notary` is empty). Grep the repository before recording a credential as absent.

## 7. What David is being asked to rule on

Nothing, to proceed. This answers a question; it does not need a decision to stand.

One follow-up is his and is deliberately left undone: **ADR-351's Q-5 still reads as open**, and whether that entry is struck, answered in place, or folded into D2's reasoning is an ADR edit this record does not make.
