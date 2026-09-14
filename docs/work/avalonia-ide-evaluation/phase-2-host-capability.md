# Phase 2 — Subprocess, folder, and vendored Node

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64), .NET SDK 10.0.300 / runtime 10.0.8
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/pane/PaneHost/Hosting/` and `…/PaneHost.Tests/HostCapabilityTests.cs` (outside this repository)

**Verdict: PASS, first run, nothing surprising — which is the finding.** An Avalonia desktop head is a
plain .NET process, so ADR-341's native-only capabilities (subprocess spawn with streamed output,
real `~/Documents/<Story Title>/` folders, a vendored Node beside the app) are `System.Diagnostics.Process`
and `System.IO` calls with no bridge, no broker, and no Avalonia-specific code. The goal framing said
"expected trivial… but recorded, not assumed"; this is the record.

GH #457 recurs, unchanged and unfixed (§4).

## 1. What was reused rather than rebuilt

- **The toolchain**: the OpenSilver spike's staged copy at
  `/Users/david/repos/spikes/opensilver-ide/toolchain-staging/toolchain` (175 MB, `bin/sharpee`
  785 bytes, `node/bin/node` 112,274,208 bytes), consumed in place rather than re-vendored, as the
  plan permits.
- **The fixture story**: `~/Documents/OpenSilver Capability Check/opensilver-capability-check.story`,
  the dedicated Documents fixture the OpenSilver phase created — never a real story. This is the
  directory GH #458 tracks the disposition of; it is read here, not adopted, and this phase does not
  change its disposition question.

## 2. The seam

Three files under `PaneHost/Hosting/`, the same shape the OpenSilver spike used so Phase 6 compares
two hosts rather than two designs:

- `IHostServices` — `IsNative`, `Describe()`, `DocumentsDirectory`, `ToolchainShim`, `ToolchainNode`,
  `RunAsync(executable, args, cwd, onStdoutLine, onStderrLine, ct)`, `ReadAllText`, `WriteAllText`;
  `HostServices.Current` defaults by `OperatingSystem.IsBrowser()`.
- `NativeHostServices` — `ProcessStartInfo` with both pipes redirected,
  `OutputDataReceived`/`ErrorDataReceived` per line, `BeginOutputReadLine`, `WaitForExitAsync`,
  cancellation → `Kill(entireProcessTree: true)`; `File.ReadAllText`/`File.WriteAllText`; toolchain
  paths returned only when the files exist.
- `BrowserHostServices` — every capability throws `PlatformNotSupportedException` naming the browser
  head; the path properties are null.

**Not one line of it references Avalonia.** That is worth stating plainly, because it is the
substance of O6's capability claim: where OpenSilver needed a desktop host (Photino) to escape the
browser sandbox and get these primitives back, Avalonia's desktop head never left .NET in the first
place.

## 3. The nine real-path tests

`PaneHost.Tests` — the real vendored shim, the real vendored `node`, the real Documents folder, real
processes. No stub of any of them.

```
dotnet test
Passed!  - Failed:     0, Passed:    20, Skipped:     0, Total:    20, Duration: 2 s
```

(20 = Phase 1's 11 pane-hosting tests plus these 9.)

| Test | Asserts on |
|---|---|
| `toolchain_paths_resolve_only_when_the_files_exist` | real paths under the staging root exist; null for a missing root and for a null root; `IsNative`, `Describe()` |
| `vendored_node_runs_and_reports_the_vendored_version` | exit 0, stdout exactly `v22.23.1`, stderr empty |
| `compose_json_through_the_sealed_shim_returns_gate_clean_ir_for_the_real_story` | exit 0, one stdout line, parsed JSON: `schemaVersion` 2, **zero diagnostics**, non-empty `ir.meta.title` |
| `compose_of_a_missing_story_exits_nonzero_and_reports_on_stderr` | non-zero exit, stderr non-empty |
| `stdout_lines_arrive_while_the_process_is_still_running` | three `node -e` ticks 400 ms apart: first-to-third spread ≥ 600 ms **and** first-to-exit ≥ 600 ms — lines are not batched at exit |
| `cancellation_kills_the_process_and_throws` | `OperationCanceledException`; `/bin/ps -axo command` no longer lists the run's sentinel string |
| `write_then_read_in_the_real_documents_story_folder` | `File.Exists` and an **independent** `File.ReadAllText` see the written bytes; `DocumentsDirectory` is `/Users/david/Documents`; the fixture `.story` starts with `story` |
| `write_into_a_missing_directory_is_refused` | `DirectoryNotFoundException`; no file created |
| `every_capability_is_refused_with_platform_not_supported` | `IsNative` false, three null paths, `PlatformNotSupportedException` from all three calls |

Grading (rule 13): every assertion is on a process exit code, on delivered-line timing, on on-disk
state read back independently, or on a specific exception type — GREEN. No assertion is on a return
value alone, and none is a "did not throw".

**The browser refusal is tested as a class, not as a running head.** No Avalonia WebAssembly head was
built. That is a smaller omission here than the equivalent would have been for OpenSilver: OpenSilver's
whole premise is one codebase reaching the browser *and* the desktop, so its browser target had to
compile and refuse; Avalonia's value proposition is one codebase across desktop OSes, and its browser
head is optional for this product. Recorded as scope, not as a pass.

## 4. GH #457 recurs — recorded, not fixed

The plan says this phase does not fix the vendored-toolchain packaging gap if it recurs. It recurs,
identically, through the same sealed shim on 2026-09-14:

```
  ✓ Validated opensilver-capability-check.story (gate-clean) — source not shipped
  ✓ Story IR → dist/opensilver-capability-check.ir.json
  ✓ Embedded the compiled story IR into the bundle
✘ [ERROR] Could not resolve "@sharpee/character"
  The module "./dist-esm/index.js" was not found on the file system:
Error: esbuild bundling failed.
```

Everything up to bundling succeeds; the failure is `@sharpee/character` shipping only `dist` while
its `exports["."].import` promises `dist-esm`. Unchanged from the OpenSilver Phase 1 finding, and
unchanged in cause: it is the macOS app's own toolchain packaging, not a host limitation — this host
spawned the build, streamed its output, and reported the real exit code, which is exactly what a
correct host does with a broken dependency. Not fixed here (platform change; discuss first).

## 5. What this phase does not establish

- **Windows.** The shim is a POSIX script; a Windows head needs its own launcher, and GH #448's
  `execFileSync('npm'/'npx')` calls inside devkit remain the other Windows-side unknown. Phase 7.
- **A running browser head** (§3).
- **The app-bundle layout.** The toolchain is resolved from a staging directory here, not from inside
  a packaged `.app`. Whether `vpk pack` carries it correctly, with the seal intact, is Phase 5's
  question.
