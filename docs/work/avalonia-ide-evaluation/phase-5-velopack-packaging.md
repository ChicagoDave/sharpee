# Phase 5 — Velopack packaging on macOS

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64), `vpk` 1.2.0, .NET SDK 10.0.300
**Spike output**: `/Users/david/repos/spikes/avalonia-ide/out/` (outside this repository)
**Evidence in repo**: `evidence/phase-5-packaged-app.png`

**Verdict: packaging PASS, updates PASS, signing FAIL, notarization not reachable.**

Velopack packages this app correctly and its delta channel is genuinely good — **8.11 MB** to move a
99.8 MB app from 1.0.0 to 1.0.1. But `vpk` **cannot code-sign the result on macOS**, and the cause is
structural rather than a missing flag: its bundler puts the entire publish output flat into
`Contents/MacOS/`, data files and the 175 MB vendored toolchain included, and `codesign` refuses to
seal a bundle shaped that way. Four routes were tried; all four hit the same wall. Because an
unsealed bundle cannot be notarized, **the notarization question this plan most wanted answered —
`vpk --notaryProfile` versus the project's `notary-submit.py` REST route — is still open for this
shape.** Nothing was submitted to Apple.

## 1. Packaging — PASS

```
dotnet publish -c Release -r osx-arm64 --self-contained    → 109 MB
+ the vendored toolchain copied in                          → 284 MB
vpk pack -u ChordWriterAvaloniaSpike -v 1.0.0 -p publish -e PaneHost --runtime osx-arm64
  Finished in 00:00:34.5745090
```

| Artifact | Size |
|---|---|
| `ChordWriterAvaloniaSpike-1.0.0-osx-full.nupkg` | 99,829,165 bytes |
| `ChordWriterAvaloniaSpike-osx-Portable.zip` | 102,255,120 bytes |
| `ChordWriterAvaloniaSpike-osx-Setup.pkg` | 95,396,296 bytes |

**The toolchain rides inside the bundle and works from there**, which is the thing that mattered:

```
verify/Chord Writer (Avalonia spike).app/Contents/MacOS/toolchain   175M
verify/…/Contents/MacOS/toolchain/node/bin/node --version           v22.23.1
```

## 2. Install and launch — PASS

The packaged `.app` was extracted from the portable zip and launched. It ran the whole Phase 4 shell
from inside the bundle — the project pane over fernhill's real folder, the World map from real
analyzer output, the editor through the vendored-Node lexer service, and the drawing-model probe:

```
[   0.340s] project pane: 8 file(s) from the real story folder
[   0.349s] world map: 13 rooms, 12 connections (3 with doors), 2 levels, 1 displaced
[   0.716s] editor: fernhill.story — 1180 lines, 5279 tokens
[   6.411s]   RightTabs: 1 Render(DrawingContext) call(s) after first layout
```

Evidence: `evidence/phase-5-packaged-app.png`.

## 3. The delta update channel — PASS, and this is Velopack's strongest row

A one-byte change to `PaneHost.runtimeconfig.json`, then `vpk pack -v 1.0.1`:

```
Creating delta for 1.0.0 -> 1.0.1 with 8 parallel threads.
Delta processed 9986 files. 0003 patched, 9983 unchanged, 0000 new, 0013 removed
Complete: Building delta 1.0.0 -> 1.0.1      (5.5 s of a 37.7 s pack)

ChordWriterAvaloniaSpike-1.0.1-osx-delta.nupkg    8,114,592 bytes
ChordWriterAvaloniaSpike-1.0.1-osx-full.nupkg    99,829,166 bytes
```

**8.1 MB against 99.8 MB.** For an app whose weight is a 175 MB vendored Node toolchain that changes
only when the toolchain is re-vendored, that ratio is the point of the whole option: a story-language
fix ships as an 8 MB download rather than a 100 MB one. This is the concrete D7 answer the
evaluation track has been missing, and it is a good one.

(8 MB for a one-byte change is Velopack's chunking granularity, not a per-byte delta. The useful
reading is the ratio, not the absolute.)

## 4. Signing — FAIL, four routes, one cause

Identity: `Developer ID Application: David Cornelson (RSNGKW5LNH)` — team `RSNGKW5LNH`, the one
`tools/ide/package.sh` uses (`EXPECTED_TEAM`).

**(a) `--signAppIdentity` alone.** `vpk` runs `codesign … --deep`:

```
codesign … --deep "Chord Writer (Avalonia spike).app"
  bundle format unrecognized, invalid, or unsuitable
  In subcomponent: …/Contents/MacOS/toolchain/devkit/node_modules/.pnpm
```

`--deep` walks into the vendored devkit's pnpm store — 72 entries, 235 symlinks across the toolchain
— and finds directories that are not signable bundles.

**(b) `--signDisableDeep true`**, the option `vpk`'s own warning points at:

```
  code object is not signed at all
  In subcomponent: …/Contents/MacOS/Avalonia.Remote.Protocol.dll
```

It requires the payload pre-signed, which it was not.

**(c) Pre-sign the payload, then `--signDisableDeep`.** 221 payload files signed with the Developer ID
identity and the hardened runtime, the vendored toolchain deliberately left alone (re-signing it
would break the seal `vendor-toolchain.sh` verified):

```
presign: 221 payload file(s) signed, 18 toolchain file(s) left as vendored   (23.8 s)
  code object is not signed at all
  In subcomponent: …/Contents/MacOS/PaneHost.runtimeconfig.json
```

**(d) Sign the packed bundle by hand, bottom-up.** 220 files inside the built `.app`, then the outer
bundle:

```
presign: 220 payload file(s) signed, 18 toolchain file(s) left as vendored
codesign --force --sign … "Chord Writer (Avalonia spike).app"
  code object is not signed at all
  In subcomponent: …/Contents/MacOS/PaneHost.runtimeconfig.json
```

### The cause

`Contents/MacOS/` holds **225 entries**. Apple's rule is that this directory carries the main
executable and code; everything else belongs in `Contents/Resources`. Velopack's macOS bundler puts
the whole publish directory there — `PaneHost.deps.json`, `PaneHost.runtimeconfig.json`,
`sq.version`, the satellite-culture directories, and the 175 MB `toolchain/`. `codesign` treats each
as a nested code object, finds it unsignable, and refuses to seal the bundle. **No combination of
`vpk`'s signing flags can move a file out of `Contents/MacOS`**, so no combination of them can fix it.

The contrast is instructive: the shipping IDE puts its toolchain at `Contents/Resources/toolchain`
(named in `bundled-node.entitlements`' own header), which is exactly the layout `codesign` wants.

Final state of the built bundle:

```
codesign -dvvv …                → Authority=Developer ID Application: David Cornelson (RSNGKW5LNH)
codesign --verify --strict …    → code has no resources but signature indicates they must be present
spctl --assess --type execute … → code has no resources but signature indicates they must be present
```

The main executable carries a valid Developer ID signature; the **bundle seal does not exist**, so
Gatekeeper rejects it. Signed-looking, not signed.

**The `.pkg` cannot be signed either**, for an unrelated and simpler reason: `security find-identity`
shows no `Developer ID Installer` certificate on this machine, only Application ones. The shipping
IDE ships a `.dmg` signed with the Application identity, so this has never been needed before.

## 5. Notarization — not reachable, nothing submitted

Notarization requires a sealed bundle. Since §4 could not produce one, neither
`vpk --notaryProfile dc-notary` nor the project's `notary-submit.py` REST route was exercised, and
**no artifact was uploaded to Apple**. The `dc-notary` keychain profile is present and working
(`xcrun notarytool history --keychain-profile dc-notary` returns submission history), so the
credentials are not the blocker — the bundle is.

This leaves the plan's explicitly-carried notarization risk **unresolved for O6**: whether `vpk`'s
`notarytool` invocation hits the same upload crash the project memory records, and whether the REST
fallback would have to be wired in, are both still open. They become answerable only once the layout
problem is solved.

## 6. What a real implementation would have to do

Stated as findings, not as a plan — this phase does not fix anything:

1. **Get the payload out of `Contents/MacOS`.** Either Velopack grows a layout option, or the build
   post-processes the bundle (move data and `toolchain/` to `Contents/Resources`, fix the
   executable's probing paths) before signing. That post-processing step is unpriced work Velopack
   does not provide, and it is the honest cost to put against O6's packaging row.
2. **Sign per-binary, not `--deep`.** The vendored toolchain must keep the signature and seal
   `vendor-toolchain.sh` gave it, and `node` needs its own entitlement set
   (`tools/ide/bundled-node.entitlements`) rather than the app's. `vpk`'s one-shot deep sign cannot
   express that distinction; `package.sh` already does.
3. **Decide the installer shape.** No `Developer ID Installer` certificate exists; either one is
   obtained for the `.pkg` path, or the `.dmg` shape the IDE already ships stays.

## 7. What this phase does not establish

- **Notarization, on either route** (§5).
- **Windows packaging.** `vpk` on Windows produces `Setup.exe` with a different signing story
  entirely (D7's Azure Trusted Signing ruling). Phase 7.
- **Update *application*.** The delta package was built and measured; an installed 1.0.0 was not
  stepped up to 1.0.1 through Velopack's updater, because that path wants a release feed and a
  signed app.
- **Whether the layout problem is Velopack-version-specific.** Only 1.2.0 was tried.
