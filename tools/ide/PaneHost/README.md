# PaneHost — the Avalonia desktop head

The cross-platform Chord Writer shell: one codebase for Windows, macOS and Linux, natively
rendered by Avalonia's own Skia renderer. It lives beside `SharpeeIDE/` (the shipping Swift
app) for the duration of the parity period, and shares the three web panes under
`tools/ide/web/` unchanged.

Ported into the repository 2026-09-16 from the evaluation spike at
`/Users/david/repos/spikes/avalonia-ide/pane/`, with no capability added beyond what that
spike proved. The shape ruling is ADR-351 D2; the plan is
`docs/work/chord-writer-avalonia-production/plan.md`.

## Pinned versions

These are the versions Phases 7 and 8 of the evaluation validated on Windows and Linux.
Changing one is a decision, not an upgrade chore.

| | Version |
| --- | --- |
| .NET SDK | 10.0.300 |
| Avalonia | 12.1.2 |
| `Avalonia.Controls.WebView` | 12.1.0 |
| `Avalonia.AvaloniaEdit` | 12.0.0 |
| `vpk` (Velopack) | 1.2.0 |

## The build gate is local, and deliberately so

This project is **not** built by `./repokit`, `tsf` or `turbo`, and **not** wired into CI.
Per CLAUDE.md, the publishing workflow is the one CI exception this project makes; everything
else is a local guard or a documented manual step. So the gate is two commands you run:

```bash
export DOTNET_ROOT=/opt/homebrew/Cellar/dotnet/10.0.300/libexec   # vpk and dotnet both need this
dotnet build tools/ide/PaneHost.sln
dotnet test  tools/ide/PaneHost.Tests/PaneHost.Tests.csproj
```

`DOTNET_ROOT` is **not** set in a fresh shell on this machine. Without it, `dotnet` fails with
`You must install .NET to run this application` — a misleading error, since .NET 10.0.300 is
installed at `/opt/homebrew/bin/dotnet`.

## The editor's lexer bridge

The editor colours Chord by running the **real compiler lexer** (`packages/chord/src/lexer.ts`)
as a Node service over NDJSON — there is no C# port of the grammar, which is what ADR-341 D4
was reaching for. Build it before running the editor:

```bash
node tools/ide/editor-bridge/build.mjs     # → editor-bridge/dist/lexer-server.js
```

It bundles from `packages/chord/src` **from source**, the way the testing surface does, so a
grammar change reaches the editor on the next bridge build with nothing to keep in sync.

## Machine-local dependencies

No source file names a developer's home directory. Paths resolve through
`PaneHost/Hosting/RepoPaths.cs`, which finds the repository root by walking up for
`pnpm-workspace.yaml`. Four dependencies cannot live in the repository and are named by
environment variable instead:

| Variable | What it points at | Required by |
| --- | --- | --- |
| `SHARPEE_IDE_TOOLCHAIN` | a `toolchain/` directory as `vendor-toolchain.sh` produces (~175 MB) | the capability tests; the editor falls back to PATH `node` |
| `SHARPEE_IDE_CAPABILITY_FIXTURE` | a dedicated Documents story folder — **never a real story**, the tests write into it | the capability tests |
| `SHARPEE_IDE_CAPABILITY_STORY` | that fixture's `.story` file | the capability tests |
| `SHARPEE_IDE_WORLD_INDEX` | a world-index JSON for the map surface | optional — the map draws empty and logs why |

Two more are overrides rather than requirements: `SHARPEE_REPO` (skip root discovery) and
`SHARPEE_IDE_DEV_OUT` (where probe logs land; defaults to
`~/Library/Caches/net.sharpee.panehost/dev`, never inside the repository).

**The capability tests fail loudly when a variable is unset — they do not skip.** A skipped
real-path test reports green without exercising anything, which is the GH #435 pattern. Rule
13a applies here in full: these drive the real vendored `sharpee` shim, the real vendored
`node`, a real Documents folder and real processes, with nothing stubbed.

## What is not here yet

- **Generated C# protocol types.** ADR-341 D5 requires the `@sharpee/ide-protocol` types to be
  emitted by a generator rather than hand-mirrored, and that generator **does not exist yet** —
  its first target is Swift and its first consumer is `SharpeeIDE`, which D5 sequences before
  any second-shell code. This project therefore references no protocol types at all, which is
  the correct state: a hand-written C# mirror is the defect DevArch rule 8b exists to prevent,
  not a shortcut to take while waiting. See the plan's Phase 2 note.
- Everything from the plan's Phase 3 onward: the Windows and Linux toolchain assets, the
  per-platform pane door as a contract module, the macOS relocation recipe in real release
  tooling, and shell parity with the Swift app.
