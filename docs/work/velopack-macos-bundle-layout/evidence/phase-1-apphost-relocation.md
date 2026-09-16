# Phase 1 — Can the AppHost be pointed at a relocated `Contents/Resources` payload

**Run**: 2026-09-16, session f65b30, Darwin 25.6.0 arm64, .NET SDK 10.0.300 at
`/opt/homebrew/bin/dotnet`, `vpk` 1.2.0 at `~/.dotnet/tools/vpk`.
`DOTNET_ROOT=/opt/homebrew/Cellar/dotnet/10.0.300/libexec` — not set in a fresh shell, exported
for every `vpk`/`dotnet` invocation below.

**Answer to sub-question 1: YES.** Attempt (a) succeeded. Nothing about the AppHost's app-root
lookup is fixed to its own directory; the field that decides it is writable, and a 25-line script
writes it.

---

## Step 0 — no `vpk` version has grown a macOS layout option

`phase-5-velopack-packaging.md` §6.1 states the fix as a disjunction and §7 records that only
1.2.0 was tried. The first disjunct is now closed.

| | Version | Published | `bundle` / `pack` layout option |
| --- | --- | --- | --- |
| Installed | 1.2.0 | 2026-06-03 | none |
| Newest stable on NuGet | 1.2.0 | 2026-06-03 | none |
| Newest prerelease | 1.2.110-ge826545 | 2026-07-16 | none |

The prerelease was installed to a scratch `--tool-path` and its `bundle -H` / `pack -H` option sets
compared against 1.2.0's: identical, with no flag that places a file outside `Contents/MacOS`.
Upstream tracks no such request either — a repository search for `Contents/MacOS` returns 8 issues,
none of them asking for a layout option.

**So Q-5's literal wording and D2's actual condition do not diverge on this ground.** Phase 4 still
reports them separately, but step 0 did not force them apart.

### Velopack already does this move, for one file

Upstream PR velopack/velopack#705 (merged 2025-08-17) moved `sq.version` to
`Contents/Resources/sq.version` and symlinked it from `MacOS/`, because a text file in `MacOS`
carries its signature in an extended attribute that `.nupkg` packaging drops. That fix is live in
1.2.0 — the packed bundle on disk has `sq.version -> ../Resources/sq.version`. The relocate-and-
symlink shape is therefore one Velopack's own updater already tolerates, which is a prior worth
carrying into Phase 2.

### The flat directory is smaller than "225 entries" suggests

Of the 225 entries in `Contents/MacOS`, 202 are `.dll` and 16 are `.dylib` — code, and Phase 5's
`presign.sh` signed all of them without complaint. The unsignable residue is four things:
`PaneHost.deps.json`, `PaneHost.runtimeconfig.json`, the `zh-Hans/` satellite directory, and
`toolchain/` (175 MB). Phase 5 routes (c) and (d) both died naming `PaneHost.runtimeconfig.json`
specifically, and `presign.sh` only matches `*.dll`, `*.dylib`, `*.so` and executables — so the
two loose JSON files were never signed at all.

## Step 0b — baseline against the unmodified bundle

`out/verify/Chord Writer (Avalonia spike).app/Contents/MacOS/PaneHost --shell`, exit 0, full probe:
project pane 8 files, world map 13 rooms / 12 connections, editor 1180 lines / **5279 tokens**,
drawing model, ADR-297 live flip, native menu, `shell: done`.
Recorded at `phase1-step0b-baseline-unmodified.txt`; substantively identical to the Phase 4 log.

**GH #457 did not fire.** The editor lexer service produced the same 5279 tokens as the Phase 4
record, so the confound the plan named as a risk to attribution is absent from this baseline.

### What this probe does and does not establish

`pane/PaneHost/Shell/ShellWindow.axaml.cs:34-38` hard-codes every asset the probe touches as an
absolute path **outside** the bundle — the story folder, the world index,
`editor/dist/lexer-server.js`, and `VendoredNode`, which points at
`/Users/david/repos/spikes/opensilver-ide/toolchain-staging/toolchain/node/bin/node`. The probe
never reads `Contents/MacOS/toolchain`.

So the shell probe is a real launch check for the AppHost and its 202 managed assemblies — which is
sub-question 1, the load-bearing one — and it is **not** evidence about the relocated toolchain.
That leg was checked separately below rather than allowed to ride on the probe's green.

## The relocation

`relocate.sh` (now at `/Users/david/repos/spikes/avalonia-ide/relocate.sh`) moved **222 entries**
from `Contents/MacOS` to `Contents/Resources`, leaving:

```
PaneHost                            the AppHost
UpdateMac                           Velopack's updater
sq.version -> ../Resources/sq.version   upstream #705's symlink
```

Both are Mach-O executables and signable in place; the third is a symlink, which needs no signature.
This is the shape `tools/ide/package.sh` already produces for the shipping Swift app.

**The toolchain seal survived, and could not have failed.** `MacOS` and `Resources` are both direct
children of `Contents`, so the move does not change the toolchain's depth and its relative symlinks
stay valid by construction. Checked anyway with `package.sh`'s own seal scan lifted verbatim
(`seal-check.sh`): 236 symlinks, none escaping, none dangling. The plan's worry — that
`vendor-toolchain.sh`'s header records a seal that "held by accident of directory depth" — does not
bite on a same-depth move. It would bite on a move to a different depth.

## Attempt (a) — repoint the AppHost's embedded app-path

The AppHost carries a zero-padded field holding the managed entry assembly's path relative to the
AppHost's own directory. In this binary it sits at file offset **66088**, holding `PaneHost.dll`.
(The `c3ab8ff13720e8ad9047dd39466b3c89` placeholder literal also appears, at 42990, but in the
string constant pool — it is not the live field.)

```
$ patch-apphost.py .../Contents/MacOS/PaneHost "../Resources/PaneHost.dll"
patched offset 66088: 'PaneHost.dll' -> '../Resources/PaneHost.dll'
```

Then ad-hoc re-signed, because patching invalidates the signature and arm64 macOS will not execute a
Mach-O whose signature does not match. Note that `codesign` on a bundle's **main executable path**
resolves upward and signs the whole bundle; to sign the file alone it must be copied out, signed,
and copied back.

**Result — the relocated bundle runs, and runs identically:**

```
[   0.295s] project pane: 8 file(s) from the real story folder
[   0.302s] world map: 13 rooms, 12 connections (3 with doors), 2 levels, 1 displaced
[   0.478s] editor: fernhill.story — 1180 lines, 5279 tokens
...
[   2.482s] shell: done                                                    exit 0
```

Diffed against the baseline with timestamps stripped, the only two differing lines are embedded
wall-clock durations (98.68 → 98.54 ms; 0.07 → 0.09 ms). Every substantive line is identical.
Recorded at `phase1-attempt-a-relocated.txt`.

So hostfxr, given the repointed field, resolved the app root to `Contents/Resources` and found
`PaneHost.deps.json`, `PaneHost.runtimeconfig.json`, `libhostfxr.dylib`, `libcoreclr.dylib` and all
202 managed assemblies there. Self-contained hostfxr resolution follows the app path, not the
executable's directory.

### Negative control

The same relocated bundle with the **unpatched** AppHost restored:

```
The application to execute does not exist:
  '.../Contents/MacOS/PaneHost.dll'.
```

The patch is load-bearing; the relocation alone is not enough, and nothing else in the run could
account for the success.

### The toolchain leg, checked directly

The shell probe never reads the bundled toolchain (above), so it was exercised on its own:

```
$ .../Contents/Resources/toolchain/node/bin/node --version
v22.23.1
$ .../Contents/Resources/toolchain/bin/sharpee --version
Sharpee 5.4.1 · Chord 3.6.0
```

The shim resolves `root` from `dirname $0`, so it is depth-independent by construction — relocation
cannot break it. Both ran from the relocated path.

## The layout is now acceptable to `codesign` — structurally

This was not in Phase 1's deliverable, which defers signing to Phase 3. It is recorded here because
it needs **no keychain, no identity and no interactive prompt** (ad-hoc signing), so it stays inside
Phase 1's stated "no interactive/keychain dependency" constraint, and because it tests the thing the
relocation exists to fix rather than only the thing it might have broken.

`UpdateMac` ad-hoc signed, then the bundle sealed with **one `codesign` call, no `--deep`, and no
pre-signing of the 202 managed assemblies**:

```
$ codesign -f -s - "Chord Writer (Avalonia spike).app"
  ...: replacing existing signature                                       exit 0

$ codesign --verify --deep --strict --verbose=2 "Chord Writer (Avalonia spike).app"
  ...: valid on disk
  ...: satisfies its Designated Requirement                               exit 0

$ codesign -dvv "Chord Writer (Avalonia spike).app"
  Sealed Resources version=2 rules=13 files=9984
```

Phase 5's final state was `code has no resources but signature indicates they must be present` on
both `--verify --strict` and `spctl` — **the bundle seal did not exist**. It exists now, over 9984
sealed resource files. `--deep` also no longer chokes on the vendored devkit's pnpm store, because
the toolchain is sealed as a resource rather than walked as nested code. The bundle still launches
and completes the full shell probe after sealing.

**What this does not establish**, and must not be read as establishing: Developer ID signing, the
hardened runtime, `node`'s own entitlement set, `spctl --assess` (which an ad-hoc signature cannot
pass, for identity reasons unrelated to layout), and notarization. All four remain Phase 3's, and
Phase 3's Integration Reality Statement still requires one real submission to Apple.

## Exit state

- **Sub-question 1 is answered YES**, by route (a). Routes (b) — a thin native launcher — and (c) —
  a documented structural dead end — were not needed and were not tried.
- **The recipe**: move everything out of `Contents/MacOS` except the AppHost, `UpdateMac` and the
  `sq.version` symlink; write the AppHost's embedded app-path field to `../Resources/<name>.dll`;
  re-sign. Three steps, two short scripts, no Velopack cooperation required.
- **Cost of the post-processing step** — the thing Phase 5 called "unpriced work of unknown size":
  `relocate.sh` is 20 lines and `patch-apphost.py` is 25. The SDK ships the assembly that writes
  this field in the first place (`Microsoft.NET.HostModel.dll`, in `sdk/10.0.300/`), so a production
  implementation could call `HostWriter` rather than write the bytes itself — untested here, and
  the package's last broadly-published NuGet version is a 5.0.0 preview, so treat it as an
  SDK-internal assembly rather than a public API.

## Open for the next phase

Phase 2's entry state turns on a question its own entry text says must be established rather than
assumed: whether Velopack's update-apply path runs against an unsigned bundle. Two upstream issues
are worth reading first — velopack/velopack#185 ("OSX App can't update itself when installed") and
#204 ("[macOS]: Fails to update due to files already existing") — neither of which was consulted in
this phase.
