# Phase 0 record — prerequisites, desktop-host identification, scaffold, #439

**Written**: 2026-09-13, session 30faa2, on `main`. Every command below was run on this Mac (Apple Silicon, macOS 26, Xcode 26.4) on 2026-09-13 between 01:10 and 01:21 CDT. The spike lives outside the repo at `/Users/david/repos/spikes/opensilver-ide/hello/`; only this record and the two screenshots under `evidence/` live in the repo.

**Outcome**: Phase 0 exit state reached. OpenSilver 3.3.3 builds and runs on the .NET 10.0.300 SDK for both the browser (WebAssembly) target and a .NET-native desktop host (Photino), with no .NET 8/9 install. The desktop host is named below, not assumed. #439 is closed.

## 1. Toolchain: OpenSilver 3.3.3 on .NET 10 — works, no side-by-side SDK needed

All three OpenSilver runtime packages ship a `net10.0` lib target. Read from the NuGet nuspecs (`api.nuget.org/v3-flatcontainer/<pkg>/3.3.3/<pkg>.nuspec`):

| Package | 3.3.3 lib targets | Dependencies of note |
|---|---|---|
| `OpenSilver` | net8.0, net9.0, net10.0 | — |
| `OpenSilver.Photino` | net8.0, net9.0, net10.0 | `Photino.NET` 3.2.3 |
| `OpenSilver.MauiHybrid` | net8.0, net9.0, net10.0 | — (MAUI workload supplies the host) |
| `OpenSilver.WebAssembly` | (Blazor WASM SDK project) | `Microsoft.AspNetCore.Components.WebAssembly` 10.0.0 |

The template's default target framework is `net10.0` (`dotnet new opensilverapp --help`: `-ta, --targetFramework ... must be net8.0, net9.0 or net10.0 ... Default: net10.0`). SecretLetter2026's `global.json` pin to 8.0.0 is that project's choice, not an OpenSilver requirement.

Installs performed (both reversible):

```
dotnet new install OpenSilver.Templates
  → Success: OpenSilver.Templates@3.3.3 installed the following templates:
    opensilverapp, opensilverbusinessapp, opensilverlib

dotnet workload install wasm-tools --skip-sign-check
  → Successfully installed workload(s) wasm-tools.
dotnet workload list
  → wasm-tools   10.0.111/10.0.100   SDK 10.0.300
```

The `wasm-tools` workload is required only by the browser target; without it the browser build fails with `NETSDK1147: To build this project, the following workloads must be installed: wasm-tools`. The Photino desktop target needs no workload.

## 2. The .NET-native desktop host: Photino, with MAUI Hybrid as the alternative

OpenSilver's own template offers exactly two desktop launchers, and both were scaffolded so the choice is made from real project files rather than package names:

```
dotnet new opensilverapp -n Hello -o hello --usePhotino --mauiPlatforms macos windows --targetFramework net10.0
```

produced four projects: `Hello` (the shared XAML/C# app, `OpenSilver` 3.3.3), `Hello.Browser` (Blazor WASM SDK, `OpenSilver.WebAssembly` 3.3.3), `Hello.Photino` (`OpenSilver.Photino` 3.3.3, plain `Microsoft.NET.Sdk` console `Exe`, `SelfContained` + `PublishSingleFile`), and `Hello.MauiHybrid` (`Microsoft.NET.Sdk.Razor`, `UseMaui`, target `net10.0-maccatalyst`, plus `net10.0-windows10.0.19041.0` when built on Windows).

**Identified host: `OpenSilver.Photino`.** Reasons, each from something read or run this session:

- **It is a plain .NET process.** `Hello.Photino/Program.cs` is a console `Main` that builds a `PhotinoWindow`, calls `.ConfigureOpenSilver<App>()`, loads `wwwroot/index.html`, and blocks on `WaitForClose()`. C# runs on the native .NET 10 runtime in that process, so `System.Diagnostics.Process` and `System.IO` are ordinary calls. This is the property Phase 1 gates on.
- **It runs on all three desktop OSes from one project.** `~/.nuget/packages/photino.native/3.2.3/runtimes/` contains `linux-arm64 linux-x64 osx-arm64 osx-x64 win-arm64 win-x64`. On macOS the native library is a real AppKit window: `otool -L Photino.Native.dylib` links `/System/Library/Frameworks/AppKit.framework` and `/System/Library/Frameworks/WebKit.framework`. On Windows it hosts WebView2 (Photino's documented design; not run here — Phase 6).
- **No workload, no Xcode dependency, two-second build.** Against MAUI Hybrid, which on macOS is **Mac Catalyst** (`net10.0-maccatalyst`), requires the `maui-maccatalyst` workload (`dotnet workload search maui` lists `maui`, `maui-desktop`, `maui-maccatalyst`, `maui-windows`), and on Windows is a WinUI 3 app hosting a `BlazorWebView`. Mac Catalyst is an iOS-derived runtime layer, not native AppKit, which for a future macOS mirror would be a step away from the current Swift app rather than toward it.

**MAUI Hybrid is recorded, not rejected.** It was scaffolded and its csproj read; it was not built (the workload was not installed this phase). If Phase 6 finds Photino's WebView2 hosting on Windows wanting, MAUI Hybrid on `net10.0-windows` is the fallback and its cost is the workload install plus a WinUI 3 shell.

**`OpenSilver.Simulator`** (SecretLetter2026's `SecretLetter.Simulator`, `net8.0-windows`, `WinExe`) is OpenSilver's dev-time simulator, Windows-only. Not a shipping host; not used.

### The fact that matters most for ADR-341 D2

**In every OpenSilver desktop host, the XAML is rendered as HTML DOM inside the OS web view.** `Hello.Photino/wwwroot/index.html` is a page with a single `<div id="opensilver-root">` and a `photino.js` script; OpenSilver's runtime builds the DOM for every XAML element inside that div, and Photino shows it in a WKWebView (macOS) or WebView2 (Windows). What is native is the window, the process, and the C# logic. What is not native is the rendering of every control, including any custom-drawn surface.

So the shape is: **native .NET process, native OS window, web-rendered UI.** ADR-341 D2 rejected "not Electron, not Tauri, not a web application in a window." An OpenSilver desktop app is not Electron (no bundled Chromium, no Node) and not Tauri (no Rust, no JS bridge for logic), but its UI *is* a web application in a window. Phase 5's decision record has to weigh that against D2's ground for the ruling ("the macOS app proved that a native shell around web panes is the right shape") rather than let it pass as a technicality. Phase 4 (custom-drawn surfaces, live theme flip) is where it will be felt.

### Dependency health (checked 2026-09-13 via `gh api`)

| Repo | Stars | Last push | License | Note |
|---|---|---|---|---|
| `OpenSilver/OpenSilver` | 1267 | 2026-09-12 | MIT (per package) | active, pushed the day before this check |
| `tryphotino/photino.NET` | 1335 | 2026-03-26 | Apache-2.0 | ~6 months quiet |
| `tryphotino/photino.Native` | 181 | 2026-03-26 | Apache-2.0 | latest release v4.0.22, 2025-01-23 |

**Stale pairing to carry forward**: `OpenSilver.Photino` 3.3.3 pins `Photino.NET` **3.2.3**, whose nuspec targets net6.0–net8.0 only, while Photino's own line is at 4.x. It ran fine under net10.0 here (the net8.0 assets load), but the OpenSilver side of the pairing is a version behind its host library. Not a blocker; a thing Phase 5 should name.

## 3. Hello world on both targets — evidence

### Desktop (Photino) — `evidence/phase-0-photino-hello.png`

```
cd ~/repos/spikes/opensilver-ide/hello
dotnet build Hello.Photino/Hello.Photino.csproj -nologo -v q
  → Build succeeded.  40 Warning(s)  0 Error(s)  Time Elapsed 00:00:02.32
  (warnings: NU1903 on System.Security.Cryptography.Xml 8.0.2, pulled transitively — noted, not addressed)
dotnet run --no-build           # from Hello.Photino/, in the background for 12 s
  → Photino.NET: "Photino".SetTitle(Hello) ... SetResizable(False) ... SetLogVerbosity(0)
  → process alive after 12 s: yes
screencapture -x photino-hello.png   # cropped to the window
```

A native macOS window titled "Hello" with the XAML `TextBlock` "Hello, World!" rendered at the 32,32 margin `MainPage.xaml` specifies. Output landed in `bin/Debug/net10.0/osx-arm64/` (RID-specific because the template sets `SelfContained`). One stderr line from AppKit (`NSMapGet ... map table argument is NULL`) at launch; cosmetic, window unaffected.

### Browser (WebAssembly) — `evidence/phase-0-browser-hello.png`

```
dotnet build Hello.Browser/Hello.Browser.csproj -nologo -v q
  → Build succeeded.  40 Warning(s)  0 Error(s)  Time Elapsed 00:00:12.95
dotnet run --no-build --no-launch-profile --urls http://localhost:55592   # from Hello.Browser/, background
  → Now listening on: http://localhost:55592
curl -s -o /dev/null -w "status=%{http_code} bytes=%{size_download}\n" http://localhost:55592/
  → status=200 bytes=2725
curl ... http://localhost:55592/_framework/dotnet.native.wasm
  → status=200 bytes=14748212
curl ... http://localhost:55592/_framework/blazor.boot.json
  → status=404 bytes=0        # observed; the .NET 10 Blazor loader did not need it — the page booted
open http://localhost:55592/ ; screencapture -x   # Safari, cropped to the tab
```

Safari at `localhost` rendering "Hello, World!" from the same `MainPage.xaml`, served by the Blazor dev server with a 14.7 MB debug `dotnet.native.wasm`. (A published, trimmed build will be smaller; size is not a Phase 0 question.)

## 4. GH #439 closed

Closed 2026-09-13 with the evidence from `~/repos/SecretLetter2026/claude-rundown.md`: the re-host is a migration of the 2009 **Silverlight 3** application (Textfyre.UI, Textfyre.VM, SecretLetter; ~28,000 C# lines, ~45 XAML files; `DefineSilverlight=true` still set in the migrated csproj files) to OpenSilver 3.3.3 — OpenSilver in its designed sweet spot, not a WPF port. Consequence recorded on the issue: Secret Letter's precedent speaks to OpenSilver's viability and the team's hands-on experience, not to WPF-to-OpenSilver portability; Chord Writer would be this project's first greenfield OpenSilver XAML consumer.

## Version combination for later phases to reuse

- .NET SDK **10.0.300** (Homebrew, `/opt/homebrew/Cellar/dotnet/10.0.300`), workload `wasm-tools` 10.0.111
- OpenSilver **3.3.3** across `OpenSilver`, `OpenSilver.WebAssembly`, `OpenSilver.Photino`, `OpenSilver.Templates`
- `Photino.NET` 3.2.3 / `Photino.Native` 3.2.3 (as pinned by `OpenSilver.Photino`)
- Target framework `net10.0` everywhere; MAUI Hybrid launcher present but unbuilt
- NuGet sources: nuget.org plus the template-generated `NuGet.Config` entry for `https://www.myget.org/F/opensilver/api/v3/index.json` (all packages above resolved from nuget.org; the MyGet feed is OpenSilver's preview channel)

## Not done, deliberately

- MAUI Hybrid launcher not built (workload not installed) — recorded as the fallback host above.
- Windows not touched — Phase 6.
- The `NU1903` advisory on `System.Security.Cryptography.Xml` 8.0.2 (transitive, eight advisories) is a spike-hygiene item, not an evaluation finding.
