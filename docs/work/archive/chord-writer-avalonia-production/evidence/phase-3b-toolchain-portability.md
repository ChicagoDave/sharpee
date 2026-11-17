# Phase 3b — Toolchain portability (Windows and Linux vendoring, the launcher)

**Date**: 2026-09-16 · **Sessions**: f78d91, 9dd6ac · **Status**: CURRENT — not DONE

Phase 3b is the half of the Phase 3 split that needs vendored bytes and
non-macOS machine time. Everything below was measured or executed; nothing is
inferred from vendor documentation. The phase stays CURRENT because its exit
state names a REAL-PATH TEST on real Windows and Linux hardware, and that has
not run — see [What is not verified](#what-is-not-verified), which is the part
of this record that matters most.

## The ruling this phase was built on

**David, 2026-09-16: cross-assemble from macOS, defer Authenticode signing to
the Windows box.** That removed the premise behind the estimate's "second
assembler" conclusion — the estimate assumed the assembler would run *on*
Windows — so `vendor-toolchain.sh` became target-aware instead of being
duplicated. Steps 1, 2, 2.5, 4 and 4.5 stay shared; only the target-varying
parts branch (rule 7: one reason to change).

## Vendored runtimes

| Asset | Size | Checksum |
|---|---|---|
| `tools/ide/vendor/node/node-v22.23.1-win-x64.zip` | 35.7 MB | `shasum -a 256 -c` against `SHASUMS256.txt` → `OK` |
| `tools/ide/vendor/node/node-v22.23.1-linux-x64.tar.xz` | 31.1 MB | same → `OK` |

Git growth is **+66.7 MB** against the plan's ~55 MB estimate; the Windows zip
is larger than the plan assumed. `linux-arm64` is out of this pass (David,
2026-09-16).

## One layout, platform-specific leaf

The assembler writes the same directory shape for every target and varies only
the filename (`vendor-toolchain.sh:24-31`):

| Target | Shim | Runtime |
|---|---|---|
| darwin, linux | `bin/sharpee` | `node/bin/node` |
| win32 | `bin/sharpee.cmd` | `node/bin/node.exe` |

Windows gets `node/bin/node.exe` even though the official zip puts `node.exe` at
the distribution root, so the launcher, the seal scan, and PaneHost each differ
by a filename rather than by a path structure.

## Measured findings

- **esbuild is the only native binary in the entire devkit closure.** A scan of
  the deployed tree found 1 Mach-O and 0 `.node` files; every other dependency
  (`fflate` plus workspace packages) is pure JS. Cross-assembly risk is bounded
  to node + esbuild.
- **`@esbuild/win32-x64` ships `esbuild.exe` at the package root with no `bin/`**
  (verified by unpacking 0.27.2); `@esbuild/linux-x64` keeps `bin/esbuild`.
  esbuild resolves the Windows binary at `lib/main.js:1641-1642` via
  `require.resolve('@esbuild/win32-x64/esbuild.exe')`. The pre-existing graft's
  `[ -x .../package/bin/esbuild ]` precondition and its `file | grep x86_64`
  arch assertion were both darwin-shaped and would have failed on Windows for
  two independent reasons (PE32+ reports `x86-64` with a hyphen; ELF likewise).
- **Windows cannot ship the symlinked closure, and `cp -RL` is not the fix.**
  Naive dereference measured **523 MB against the symlinked 69 MB**, because
  pnpm's `.pnpm` store deduplicates and every consumer symlink expands to its
  own copy. pnpm's own `--config.node-linker=hoisted` reproduces **69 MB with 3
  residual symlinks** (all `node_modules/.bin`, all internal), and simplifies
  the graft to one `rm -rf` plus one `cp -R` instead of store surgery.
- **Ordering is load-bearing.** The deploy root's `@sharpee/devkit` self-link
  reads directly from the live checkout. Hoisting or dereferencing before the
  seal-prune step would ship the developer's working tree inside the toolchain —
  the exact failure step 4.5 exists to prevent. The script sequences the prune
  first.

## Cross-assembly runs

Both executed on the macOS build host, exit 0, then independently re-verified
against the assembled trees:

| Target | Size | Verification |
|---|---|---|
| linux-x64 | 190M | node is `ELF 64-bit LSB executable, x86-64`; esbuild is `ELF 64-bit LSB executable, x86-64, statically linked`; zero darwin `@esbuild` directories remain; the graft re-pointed 2 consumer links |
| win32-x64 | 154M | `node/bin/node.exe` and the grafted `esbuild.exe` are both `PE32+ executable (console) x86-64, for MS Windows`; `bin/` contains only `sharpee.cmd`; `find -type l` over the whole tree returns 0 |

Argument-guard checks (`--target bogus`, `--arch arm64 --target linux`) were
reported as correctly refused; not independently re-run.

## PaneHost's platform-shaped toolchain resolution

`tools/ide/PaneHost/Hosting/NativeHostServices.cs` hard-coded `bin/sharpee` and
`node/bin/node`. It now resolves through `ShimLeaf`/`NodeLeaf`, matching the
layout table above.

**The path fix alone would have shipped broken.** `Process.Start` with
`UseShellExecute = false` cannot start a batch file — `CreateProcess` rejects a
`.cmd` as "not a valid Win32 application" — so resolving `bin\sharpee.cmd`
correctly would have handed `RunAsync` a path it provably cannot spawn.
`RunAsync` now routes a batch shim through `%ComSpec%` with `/d /s /v:off /c`,
and refuses any argument containing `"` or `%`, because neither survives a
`cmd /c` command line intact and silently running a different command is worse
than failing. That is a spawn concern, so it lives in the spawn path;
`ToolchainShim` keeps naming the file that actually exists.

`tools/ide/PaneHost.Tests/HostCapabilityTests.cs` asserts the resolved paths by
platform leaf rather than by the POSIX names, so it tests whichever target was
assembled for the machine running it.

## Darwin regression run — executed

The shipping macOS path was edited by the target-aware rewrite, so it was
re-run end to end:

```
bash tools/ide/vendor-toolchain.sh <scratch>/darwin-regression
→ target darwin · Node 22.23.1 darwin-arm64 · devkit 5.4.1
→ seal verified — every symlink resolves inside the toolchain
→ Signing vendored binaries: 2 signed (Developer ID, hardened runtime, timestamped)
vendor-toolchain: OK (darwin/arm64) — 177M
```

Then the rule 13a real-path tests against that staged toolchain, with the
dedicated `OpenSilver Capability Check` Documents fixture (never a real story):

```
dotnet test PaneHost.Tests/PaneHost.Tests.csproj
Passed! - Failed: 0, Passed: 24, Skipped: 0, Total: 24, Duration: 3 s
```

Nothing is stubbed in that run: the real vendored `sharpee` shim, the real
vendored `node`, real processes, a real Documents folder. The fixture path
contains a space, so argument passing is exercised rather than assumed.

## What is not verified

**The Windows and Linux toolchains have never been executed.** Everything above
is cross-assembly evidence — the right bytes in the right places, checked on a
macOS host with `file -b`, symlink counts, and checksums. None of it
demonstrates that either toolchain *runs*.

Specifically unexercised:

- `compose`/`build` from the vendored, network-free toolchain on real Windows
  and real Linux machines — the phase's stated exit state, the same three checks
  Phases 7/8 ran on macOS (`node --version`, `compose --json` exit 0, a streamed
  `build`).
- PaneHost's batch-shim spawn path. `NeedsCommandProcessor` returns false on
  every non-Windows host, so the `cmd.exe` routing and its argument refusal are
  unreachable from macOS. The 24 passing tests above say nothing about it.
- Whether pnpm's junctions on Windows survive the seal's symlink-escape scan.
  Node reports junctions through `isSymbolicLink()`, so this *may* hold — the
  estimate flagged it as a probe, not an assumption, and it remains one.

Per rule 13a a stub cannot substitute for any of these, and the GH #435
recurrence risk is exactly the failure mode a stub would reintroduce: a green
report that exercised nothing. This needs David's time on both machines, which
was named up front as a phase cost rather than discovered late.
