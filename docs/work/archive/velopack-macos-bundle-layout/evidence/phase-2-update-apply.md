# Phase 2 — Does Velopack's update-apply path survive the relocated layout

**Run**: 2026-09-16, session f65b30, Darwin 25.6.0 arm64, `vpk` 1.2.0, .NET SDK 10.0.300.
No keychain, no Developer ID, no interactive prompt — every signature below is **ad-hoc** (`-`).

**Answer to sub-question 2: YES, unassisted — with one condition the plan did not anticipate.**
The relocated layout survives the apply path with no post-apply hook, because the relocation moves
to *before* `vpk pack` and the layout is therefore baked into the package. The condition is that the
**signature must also be in the package**: an apply from a package built out of an unsigned `.app`
leaves the installed bundle unsealed.

---

## Entry-state fork, resolved empirically

The plan required establishing rather than assuming whether the apply path runs against an unsigned
bundle, because `phase-5-velopack-packaging.md` §7 and `parity-table.md:109` both say update
application "wants a release feed and a signed app," and a NO would have moved Phase 2 after Phase 3.

**It runs unsigned.** The 1.0.0 → 1.0.1 round trip below was driven end to end against a bundle with
no Developer ID signature and no bundle seal, and reported
`Package version 1.0.1 applied successfully.` **Phase 2 therefore stays where the plan put it** and
carries no keychain dependency. The §7 sentence is true of the *`UpdateManager` + release feed*
route, not of the apply path itself.

Driving `UpdateMac` directly is the real path, not a stub: velopack/velopack#185's stack trace shows
`Velopack.UpdateExe.Apply` doing `Process.Start(.../Contents/MacOS/UpdateMac)`. Its CLI is
`UpdateMac apply [--norestart] [--waitPid PID] [--rootDir PATH] -p <FILE>`.

## The finding that reshapes the phase: `vpk pack` accepts a pre-built `.app`

Phase 5's `.nupkg` carries `lib/app/Contents/...` — the whole bundle tree, exactly as `vpk` built it.
So a relocation applied *after* `vpk pack` would be undone by the first update, because the package
would still hold the flat layout. That is the failure mode the plan predicted.

But `vpk pack` detects a `--packDir` that is already a `.app` and passes its `Contents/` tree
through. Probed with a 3-file throwaway bundle:

```
packDir:  Tiny.app/Contents/MacOS/tinyapp
          Tiny.app/Contents/Resources/payload.txt

nupkg:    lib/app/Contents/MacOS/tinyapp
          lib/app/Contents/MacOS/sq.version.__symlink     (added by vpk)
          lib/app/Contents/MacOS/UpdateMac                (added by vpk)
          lib/app/Contents/Resources/payload.txt          ← stayed in Resources
          lib/app/Contents/Resources/sq.version           (added by vpk)
```

Nothing was flattened into `MacOS`. **So the relocation belongs before the pack, not after**, and
the question "does Velopack's writer reconstitute a flat layout on update" does not arise — the
package never contains a flat layout to reconstitute. The post-apply hook the plan named as "the
only mitigation shape worth checking" is not needed.

Also learned here: `vpk` stores symlinks in the package as `<name>.__symlink` marker files and
materialises them on extract. That is how the 235 toolchain symlinks travel.

### One failed attempt, recorded

The first full-scale pack was fed the *already-packed* Phase 1 bundle and died in 6 s:

```
[FTL] Junction / symlink path already exists and overwrite parameter is false.
  at Velopack.Util.SymbolicLink.Create(...)            lib-csharp/Util/SymbolicLink.cs:29
  at OsxPackCommandRunner.PreprocessPackDir(...)       vpk/Velopack.Packaging.Unix/Commands/OsxPackCommandRunner.cs:62
```

`PreprocessPackDir` creates `Contents/MacOS/sq.version -> ../Resources/sq.version` with
`overwrite: false`, and that symlink was already present from the Phase 5 pack. This is a property of
re-packing a packed bundle, not of the approach. It did not mutate the input and produced no output.
**`vpk pack` must be given a freshly-arranged `.app`, never one it has already processed.**

## The pipeline that works

`build-relocated-app.sh` (in the spike directory) arranges `out/publish` into the target shape:
`Contents/MacOS/PaneHost` alone; the other 222 entries into `Contents/Resources`; `createdump` and
`PaneHost.pdb` excluded to match `vpk`'s own defaults; the AppHost patched to
`../Resources/PaneHost.dll`. Seal scan clean, bundle runs, full shell probe green — then packed:

| | Size | Pack time |
|---|---|---|
| `1.0.0-osx-full.nupkg` | 99,908,968 | 28.4 s |
| `1.0.1-osx-delta.nupkg` | 8,274,247 | 31.2 s |
| `1.0.2-osx-delta.nupkg` | 8,971,348 | 32.5 s |

Phase 5's flat-layout numbers for comparison: 99,829,165 full, 8,114,592 delta, 34.5 s.
**The relocation costs nothing measurable in package size or pack time.**

The 1.0.0 nupkg's `lib/app/Contents/MacOS` holds exactly `PaneHost`, `sq.version.__symlink` and
`UpdateMac`; `Resources` holds 224 entries. The relocated layout is in the package.

## The round trip

**Delta reconstruction** — `UpdateMac patch --old <1.0.0 full> --delta <1.0.1 delta> --output <full>`,
4.45 s. The log shows it operating on `lib/app/Contents/Resources/update-marker.txt` and
`lib/app/Contents/Resources/sq.version.zsdiff`: the delta engine is a file-tree differ with **no
layout assumptions at all**.

**Apply** — `UpdateMac apply --norestart --rootDir <app> -p <reconstructed full>`, against the
portable-zip install of 1.0.0:

```
Creating symlink '.../Contents/Resources/toolchain/devkit/node_modules/@sharpee/...' -> '../.pnpm/...'
   ... 235 of these ...
Replacing bundle at ".../ChordWriterAvaloniaSpike.app"
Bundle extracted successfully
Package version 1.0.1 applied successfully.
```

Post-apply state:

| Check | Result |
|---|---|
| `Contents/MacOS` | `PaneHost`, `sq.version` symlink, `UpdateMac` — **unchanged** |
| `Contents/Resources` | 225 entries (224 + the new `update-marker.txt`) |
| `sq.version` | `<version>1.0.1</version>` |
| Toolchain seal | no escaping, no dangling symlinks |
| App launches | full shell probe, `shell: done`, exit 0 |
| Bundled toolchain | `sharpee --version` → `Sharpee 5.4.1 · Chord 3.6.0` |

## The condition: the signature must be in the package

Sealing the installed 1.0.0 ad-hoc (`Sealed Resources version=2 rules=13 files=9985`,
`--verify --deep --strict` PASS) and then applying the 1.0.1 package **destroyed the seal**:

```
code has no resources but signature indicates they must be present
```

— Phase 5's exact error. The apply replaces the bundle wholesale from the package, and that package
was built from an unsigned `.app`, so no `_CodeSignature/` came back. This is the same class of
problem upstream PR #705 solved for one file, at bundle scale: **an update is only as signed as the
package it came from.**

The fix is the normal Velopack pipeline. Packing with `--signAppIdentity "-"` (ad-hoc, no keychain):

- `vpk`'s own **`codesign --deep` step succeeded** — the step that was Phase 5's route (a) failure,
  `bundle format unrecognized, invalid, or unsuitable / In subcomponent: .../toolchain/devkit/node_modules/.pnpm`.
  With the toolchain in `Resources` it is sealed as a resource rather than walked as nested code.
- The resulting `.nupkg` contains **`lib/app/Contents/_CodeSignature`**.
- A fresh install from the signed portable zip passes `codesign --verify --deep --strict` and reports
  `Sealed Resources version=2 rules=13 files=9985`.
- **Applying that signed package leaves the installed bundle sealed**: `--verify --deep --strict`
  PASS, `Sealed Resources version=2 rules=13 files=9985`, and it still runs the full shell probe.

So the update channel preserves the bundle seal, provided signing happens at pack time — which is
what `--signAppIdentity` is for, and what a real build would do anyway.

## Exit state

- **Sub-question 2: YES, unassisted.** No post-apply hook, no re-relocation after update. The layout
  and the seal both survive because both are in the package.
- **The recipe gains one ordering constraint**: relocate → `vpk pack --signAppIdentity <identity>`.
  Relocating after the pack would work once and be undone by the first update.
- **`vpk`'s deep-sign is no longer a wall.** Phase 5 concluded per-binary signing was required
  because `--deep` choked on the pnpm store. On the relocated layout `--deep` succeeds, so
  `presign.sh` and `--signDisableDeep` may not be needed at all. Phase 3 should test the plain
  `--signAppIdentity` route *before* reproducing `package.sh`'s per-binary approach.

## What this does not establish

- **Developer ID rather than ad-hoc.** Every signature here is ad-hoc. The *mechanism* is proven;
  the identity is not. `spctl --assess` cannot pass an ad-hoc signature, for identity reasons that
  have nothing to do with layout.
- **Hardened runtime and entitlements.** `vpk`'s deep sign used its default entitlements. The
  vendored `node` still needs `bundled-node.entitlements` (`allow-jit`, no `get-task-allow`), and
  whether `--signEntitlements` can express the app-vs-node split is untested.
- **Notarization.** Nothing has been submitted to Apple.
- **The `.pkg` installer.** Still unsigned; §6.3's missing `Developer ID Installer` certificate is
  unchanged by anything here.
- **Update over a Developer-ID-signed install**, as Gatekeeper would see it.
