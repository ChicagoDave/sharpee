# Phase 1 record — native host capability check (the kill phase)

**Written**: 2026-09-13, session 30faa2, on `main`. Every command below was run on this Mac on 2026-09-13 between 01:30 and 01:43 CDT. Spike code: `/Users/david/repos/spikes/opensilver-ide/hello/` (outside the repo). Evidence in the repo: `evidence/phase-1-capability-log.txt` (the app's own log of the run) and `evidence/phase-1-photino-capability-check.png`.

**Outcome: PASS.** Under the `OpenSilver.Photino` desktop host, XAML code-behind spawns the real `sharpee` CLI with incrementally streamed stdout and stderr, reads and writes a real `~/Documents/<Story Title>/` folder, and locates and runs the vendored Node runtime — all through `System.Diagnostics.Process` and `System.IO`, the same primitives WPF would use. The same source compiles unchanged for the browser target, where a runtime-selected implementation refuses every call. Phases 2–4 may proceed.

One platform defect surfaced along the way and is filed as **GH #457**; it is a toolchain packaging gap, not an OpenSilver limit, and it does not affect the pass (details in §5).

## 1. Setup: the real toolchain, the real folder

**Toolchain.** The macOS app's own vendoring script was run into a staging directory so the spike consumes the exact shape Chord Writer ships (`toolchain/bin/sharpee`, `toolchain/node/bin/node`, `toolchain/devkit/`):

```
bash tools/ide/vendor-toolchain.sh /Users/david/repos/spikes/opensilver-ide/toolchain-staging
  → seal verified — every symlink resolves inside the toolchain
  → 2 signed (Developer ID, hardened runtime, timestamped)
  → vendor-toolchain: OK — 175M at .../toolchain-staging/toolchain
ln -sfn .../toolchain-staging/toolchain  Hello.Photino/bin/Debug/net10.0/osx-arm64/toolchain
```

The Photino launcher resolves it as `Path.Combine(AppContext.BaseDirectory, "toolchain")` — beside the executable, as it would sit inside a bundle.

**Story folder.** A dedicated fixture (never a real story — project rule), created by hand under Documents in current Chord syntax: `~/Documents/OpenSilver Capability Check/opensilver-capability-check.story` (a room, a playable person, a `before the game starts` block) plus the `opensilver-capability-check.config.json` sidecar with the IFID. The sealed shim composes it gate-clean:

```
toolchain/bin/sharpee compose ".../opensilver-capability-check.story" --json | head -c 300
  → {"schemaVersion":2,"diagnostics":[],"ir":{"format":"story language 4","languageVersion":"3.6.0","meta":{"title":"OpenSilver Capability Check", ...
```

Observed in passing, not acted on: `~/Documents/Aliens in Amberville/aliens-in-amberville.story` uses `authors: <name>` inline and `create the player`, both of which the current compiler rejects (`parse.header-inline-list`, `parse.removed-create-player`). A real Documents story no longer composes with the current toolchain.

## 2. The host seam

Three files in the shared OpenSilver project `Hello/Hosting/`, compiled into **both** targets:

- `IHostServices` — `IsNative`, `Describe()`, `DocumentsDirectory`, `ToolchainShim`, `ToolchainNode`, `RunAsync(executable, args, cwd, onStdoutLine, onStderrLine, ct)`, `ReadAllText`, `WriteAllText`; and `HostServices.Current`, defaulting by `OperatingSystem.IsBrowser()`.
- `NativeHostServices` — `ProcessStartInfo` with both streams redirected, `OutputDataReceived`/`ErrorDataReceived` delivering each line as it arrives, `BeginOutputReadLine`, `WaitForExitAsync`, cancellation → `Kill(entireProcessTree: true)`; `File.ReadAllText`/`File.WriteAllText`; toolchain paths returned only when the files exist.
- `BrowserHostServices` — every capability throws `PlatformNotSupportedException` naming the browser target; the path properties are null.

The Photino launcher installs the native one before the app starts:

```csharp
var toolchainRoot = Path.Combine(AppContext.BaseDirectory, "toolchain");
HostServices.Current = new NativeHostServices(Directory.Exists(toolchainRoot) ? toolchainRoot : null);
```

**Does the browser target still compile?** Yes, with the identical source — the seam is a runtime swap, not a compile-time fork:

```
dotnet build Hello.Photino/Hello.Photino.csproj  → Build succeeded. 0 Error(s)  (0.78 s)
dotnet build Hello.Browser/Hello.Browser.csproj  → Build succeeded. 0 Error(s)  (2.15 s)
```

(`<Nullable>enable</Nullable>` was added to `Hello.csproj` to clear CS8632 warnings; nothing else changed for the browser.)

## 3. The in-app run (deliverables a, b, c together)

`MainPage.xaml` carries five buttons (Host info, Compose, Build, Write + read file, Vendored node --version) over a timestamped log that appends each line through one dispatcher queue as it arrives. Launching with `--auto` runs every check on load and writes the log beside the story. From `evidence/phase-1-capability-log.txt`:

```
[   0.048s] native host — .NET 10.0.8 on macOS 26.6.2 (Arm64); pid 35892
[   0.051s] IsNative=True
[   0.051s] Documents=/Users/david/Documents
[   0.051s] Story folder=/Users/david/Documents/OpenSilver Capability Check
[   0.051s] Toolchain shim=.../Hello.Photino/bin/Debug/net10.0/osx-arm64/toolchain/bin/sharpee
[   0.051s] Toolchain node=.../Hello.Photino/bin/Debug/net10.0/osx-arm64/toolchain/node/bin/node
[   0.054s] wrote /Users/david/Documents/OpenSilver Capability Check/capability-check.txt
[   0.054s] read back: written by the OpenSilver spike at 2026-09-13T01:42:15.0575710-05:00
[   0.054s] round trip: MATCH
[   0.054s] story file: 402 chars, first line "story"
[   0.055s] $ node --version
[   0.129s]   out| v22.23.1
[   0.132s] exit 0, 1 lines, 77 ms
[   0.133s] $ sharpee compose .../opensilver-capability-check.story --json
[   0.233s]   out| {"schemaVersion":2,"diagnostics":[],"ir":{"format":"story language 4", ... (2467 chars)
[   0.233s] exit 0, 1 lines, 89 ms
[   0.233s] $ sharpee build .../opensilver-capability-check.story
[   0.313s]   out| 🔨 Building browser bundle
[   0.3xxs]   out|   ✓ Validated opensilver-capability-check.story (gate-clean) ...
[   0.3xxs]   out|   ✓ Story IR → dist/opensilver-capability-check.ir.json
[   0.3xxs]   out|   Bundling game.js...
[   0.3xxs]   err| ✘ [ERROR] Could not resolve "@sharpee/character"      ← GH #457, §5
[   0.426s] exit 1, 106 lines, 177 ms
[   0.429s] auto mode: done
```

| Deliverable | Result |
|---|---|
| (a) `Process.Start` of the real `sharpee compose --json`, stdout streamed | exit 0, gate-clean IR, 89 ms; `build` streamed 106 lines over 177 ms with distinct arrival timestamps |
| (b) read and write inside the real `~/Documents/<Story Title>/` | write → independent read back → MATCH; the real `.story` read through the host |
| (c) vendored Node located and executed from beside the app | `v22.23.1`, the version `vendor-toolchain.sh` pins |

Screenshot `evidence/phase-1-photino-capability-check.png`: the Photino window with the button row and the streamed log.

A wrinkle worth one line: the first two runs logged an `exit` line *before* the last output line, because the completion continuation ran inline on a pool thread while line callbacks were queued to the dispatcher. Routing every log write through `Dispatcher.BeginInvoke` (one FIFO queue) fixed the order. Delivery was always incremental; only the log's ordering was wrong, and the tests below assert the delivery timing independently of the UI.

## 4. Real-path tests (rule 13a) — `Hello.Host.Tests`

A plain xunit `net10.0` project that source-links the three `Hosting/*.cs` files (no OpenSilver runtime, same code under test). Nothing is stubbed: the real shim, the real vendored `node`, the real Documents folder.

```
dotnet test Hello.Host.Tests/Hello.Host.Tests.csproj
  → Passed!  - Failed: 0, Passed: 9, Skipped: 0, Total: 9, Duration: 1 s
```

| Test | Asserts on |
|---|---|
| `Toolchain_paths_resolve_only_when_the_files_exist` | real paths under the staging root exist; null for a null root and for a missing root |
| `Vendored_node_runs_and_reports_the_vendored_version` | exit 0, stdout exactly `v22.23.1`, stderr empty |
| `Compose_json_through_the_sealed_shim_returns_gate_clean_ir_for_the_real_story` | exit 0, one stdout line, parsed JSON: `schemaVersion` 2, zero diagnostics, `ir.meta.title` |
| `Compose_of_a_missing_story_exits_nonzero_and_reports_on_stderr` | non-zero exit, stderr non-empty |
| `Stdout_lines_arrive_while_the_process_is_still_running` | three `node -e` ticks 400 ms apart: first-to-third spread ≥ 600 ms and first-to-exit ≥ 600 ms (lines are not batched at exit) |
| `Cancellation_kills_the_process_and_throws` | `OperationCanceledException`; `ps -axo command` no longer lists the sentinel script |
| `Write_then_read_in_the_real_Documents_story_folder` | `File.Exists` and an independent `File.ReadAllText` see the written content; the real `.story` starts with `story` |
| `Write_into_a_missing_directory_is_refused` | `DirectoryNotFoundException`; no file created |
| `BrowserHostServicesTests.Every_capability_is_refused_with_PlatformNotSupported` | `IsNative` false, null paths, `PlatformNotSupportedException` from all three calls |

Grading (rule 13): every assertion is on process exit codes, delivered lines, on-disk state, or a specific exception — GREEN.

## 5. Platform finding: GH #457 — the vendored toolchain cannot `build`

`sharpee build` through the sealed shim fails at esbuild: `Could not resolve "@sharpee/character"` … `The module "./dist-esm/index.js" was not found`. The vendored copy of `@sharpee/character` holds only `dist`, `package.json`, `README.md`, while `packages/character/dist-esm/` exists in the repo. Cause: `packages/character/package.json` has `"files": ["dist"]` beside `"exports": { ".": { "import": "./dist-esm/index.js" } }`, and `vendor-toolchain.sh`'s `pnpm deploy --prod --legacy` copies per `files`. Six more packages share the shape (`bootstrap`, `bridge`, `runtime`, `sharpee` with `["dist"]`; `branch-tester`, `transcript-tester` with `[]`); `character` is the one that breaks story builds today because `story-loader`'s ESM runtime imports it.

This is not an OpenSilver or Photino limitation: the app spawned `build`, streamed all 106 lines, and reported the real exit code. It is the macOS app's own toolchain packaging, and it would break Chord Writer's Build the same way. Filed as GH #457 with two candidate fixes, not fixed here (platform change; discuss first).

## 6. What this phase does and does not establish

- **Established**: the ADR-341 Context's native-only capabilities — subprocess spawn with streaming, real project folders, vendored Node — are ordinary .NET calls under the Photino host, with no bridge. The capability half of the "capability parity" framing is closed.
- **Not established**: anything about UI. Phase 0's finding stands — the XAML renders as DOM inside WKWebView/WebView2 — and the phases that judge the editor, the panes, the custom-drawn surfaces, and the live theme flip are where OpenSilver is actually tested against the macOS app.
- **Not touched**: Windows (Phase 6). On Windows the same code runs `sharpee.cmd`-free — the shim is a POSIX script, so the Windows toolchain needs its own launcher (a `.cmd` or a direct `node.exe devkit/dist/cli.js` invocation); ADR-341 D6 already names a Windows counterpart of `vendor-toolchain.sh`. GH #448's `execFileSync('npm'/'npx')` calls inside devkit are the other Windows-side unknown.
