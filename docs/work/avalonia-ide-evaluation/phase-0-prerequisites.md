# Phase 0 — Prerequisites, dependency health, and scaffold

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64)
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/hello/Hello/` (outside this repository, per the plan's evidence discipline)
**Verdict**: PASS — all six deliverables met. Two findings correct premises the plan carried in from the options document.

## 1. Dependency health, re-checked at phase-run time

`gh api` per repository, 2026-09-14 (the plan required a re-check rather than copying the 2026-09-13 numbers forward):

| Repository | Stars | Last push | License | Archived | Latest release tag | Released |
| --- | --- | --- | --- | --- | --- | --- |
| `AvaloniaUI/Avalonia` | 31,501 | 2026-09-14T09:36:04Z | MIT | no | `12.1.2` | 2026-09-02 |
| `AvaloniaUI/AvaloniaEdit` | 1,131 | 2026-08-28T11:43:15Z | MIT | no | `11.4.1` | 2026-02-05 |
| `velopack/velopack` | 2,328 | 2026-09-13T21:12:37Z | MIT | no | `1.2.0` | 2026-06-03 |

All three are actively maintained, MIT, unarchived. Avalonia was pushed to within hours of this check.

NuGet package versions (`api.nuget.org` flat container, same date):

| Package | Newest stable | Note |
| --- | --- | --- |
| `Avalonia` | 12.1.2 | matches the GitHub release |
| `Avalonia.Templates` | 12.1.2 | |
| `Avalonia.Controls.WebView` | 12.1.0 | the version the plan named; no 12.1.1/12.1.2 build of it exists |
| `Avalonia.AvaloniaEdit` | **12.0.0** | published 2026-04-08 — see finding A |
| `vpk` | 1.2.0 stable (1.2.110-ge826545 prerelease) | |

### Finding A — the AvaloniaEdit lag is a release-tag artifact, not a package one

The plan's Phase 0 domain focus and its open-questions list both carry the options
document's premise that "AvaloniaEdit 11.4.1 predates Avalonia 12.1.2 by several months"
and that Avalonia-12 compatibility is therefore a watch item. That premise came from the
GitHub *release tag*, which is indeed still 11.4.1.

The NuGet package is not on that tag. `Avalonia.AvaloniaEdit` **12.0.0** shipped
2026-04-08, and its nuspec declares:

```
<group targetFramework="net8.0">
  <dependency id="Avalonia" version="12.0.0" exclude="Build,Analyzers" />
</group>
<group targetFramework="net10.0">
  <dependency id="Avalonia" version="12.0.0" exclude="Build,Analyzers" />
</group>
```

A `net10.0` target group and a floor (not a pin) of Avalonia 12.0.0, which 12.1.2
satisfies. The compatibility gate the plan flagged is therefore closed by construction,
and confirmed empirically in §4 below. **Phase 3 does not inherit an
"AvaloniaEdit may not load" risk**; whether it is the right editor route is still Phase 3's
question, but it is not a version-conflict question.

## 2. Toolchain and templates

```
$ dotnet --version
10.0.300
$ dotnet --list-runtimes
Microsoft.AspNetCore.App 10.0.8 [/opt/homebrew/Cellar/dotnet/10.0.300/libexec/shared/Microsoft.AspNetCore.App]
Microsoft.NETCore.App 10.0.8 [/opt/homebrew/Cellar/dotnet/10.0.300/libexec/shared/Microsoft.NETCore.App]
```

Homebrew-installed .NET, one SDK, one runtime band. No Avalonia templates were present
before this phase (`dotnet new list avalonia` returned nothing).

```
$ dotnet new install Avalonia.Templates::12.1.2
$ dotnet new uninstall        # listing form
   Avalonia.Templates
      Version: 12.1.2
```

Templates available afterward: `avalonia.app`, `avalonia.mvvm`, `avalonia.xplat`.

**The version combination later phases reuse**:

| Component | Version |
| --- | --- |
| .NET SDK | 10.0.300 (runtime 10.0.8) |
| Target framework | `net10.0` |
| RID | osx-arm64 (Apple silicon; not pinned in the csproj) |
| `Avalonia.Templates` | 12.1.2 |
| `Avalonia`, `Avalonia.Desktop`, `Avalonia.Themes.Fluent`, `Avalonia.Fonts.Inter` | 12.1.2 |
| `Avalonia.Controls.WebView` | 12.1.0 |
| `Avalonia.AvaloniaEdit` | 12.0.0 |
| `vpk` | 1.2.0 |

## 3. Hello window

```
$ dotnet new avalonia.app -o Hello -n Hello
The template "Avalonia .NET App" was created successfully.
Restore succeeded.
$ dotnet build -v q --nologo
Build succeeded.
    0 Warning(s)
    0 Error(s)
Time Elapsed 00:00:01.34
```

The scaffold targets `net10.0` out of the box — no retargeting needed on a .NET 10-only
machine.

## 4. NativeWebView and AvaloniaEdit in the same window

Both packages added to the scaffold and the window rebuilt:

```
$ dotnet add package Avalonia.Controls.WebView --version 12.1.0
$ dotnet add package Avalonia.AvaloniaEdit --version 12.0.0
info : Package 'Avalonia.AvaloniaEdit' is compatible with all the specified frameworks
$ dotnet build -v q --nologo
Build succeeded.
    0 Warning(s)
    0 Error(s)
Time Elapsed 00:00:00.79
```

Zero warnings — no version-conflict or downgrade warning from NuGet for AvaloniaEdit 12.0.0
against Avalonia 12.1.2, which is the build half of finding A.

XAML shape that compiled and ran:

- `NativeWebView` resolves from the **default** `https://github.com/avaloniaui` xmlns — the
  control's CLR namespace is `Avalonia.Controls` (confirmed against the assembly:
  `Avalonia.Controls.NativeWebView`), so no `xmlns:` prefix is needed for it.
- AvaloniaEdit needs a prefix (`xmlns:edit="using:AvaloniaEdit"`, control
  `edit:TextEditor`) **and** its theme merged into `App.axaml`:
  `<StyleInclude Source="avares://AvaloniaEdit/Themes/Fluent/AvaloniaEdit.xaml" />`.
  Without the style include the control instantiates but renders unstyled.

Running app, both surfaces live in one window:

- Left pane: `TextEditor` rendering a placeholder buffer with line numbers, Menlo 13,
  word-wrap off.
- Right pane: `NativeWebView` on the WKWebView backend displaying an inline document
  loaded through `NavigateToString`. The window title is set from the load result and
  read **"Avalonia spike — Phase 0 scaffold — NativeWebView OK"**, i.e. the navigation
  call did not throw.

Evidence: `evidence/phase-0-scaffold.png` (screencapture, 2026-09-14 04:55 CDT).

This is the *initialization* gate only. Whether the host can **supply responses** to the
web view's requests — O6's kill question — is untouched here and belongs to Phase 1;
`NavigateToString` proves nothing about `WebResourceRequested`.

## 5. Velopack CLI

```
$ dotnet tool install -g vpk
Tool 'vpk' (version '1.2.0') was successfully installed.
$ /Users/david/.dotnet/tools/vpk --version
You must install .NET to run this application.
App: /Users/david/.dotnet/tools/vpk
Architecture: arm64
App host version: 10.0.8
```

### Finding B — `vpk` needs `DOTNET_ROOT` set explicitly on this machine

The tool's apphost cannot find the runtime on its own because .NET is installed by
Homebrew at `/opt/homebrew/Cellar/dotnet/10.0.300/libexec` rather than at a location the
apphost probes. Setting `DOTNET_ROOT` fixes it:

```
$ env DOTNET_ROOT=/opt/homebrew/Cellar/dotnet/10.0.300/libexec /Users/david/.dotnet/tools/vpk --help
Description:
  Velopack CLI 1.2.0, for distributing applications.
Commands:
  bundle    Creates a macOS .app bundle from a folder containing application files.
  pack      Converts application files into a release and installer.
  download  ...
  upload    ...
```

`vpk 1.2.0` is installed and functional. **Phase 5 must carry this env prefix** on every
`vpk` invocation, or set `DOTNET_ROOT` in its shell, otherwise every packaging command
fails with what looks like a missing-.NET error on a machine that has .NET. Noted here so
Phase 5 does not spend budget rediscovering it.

`vpk --version` is not a supported flag — the version appears in `--help`'s description
line. The `bundle` command's presence confirms the macOS `.app` path Phase 5 needs exists
in this version.

## 6. Exit state

The plan's exit condition — "a working Avalonia scaffold builds and runs on this machine
with `NativeWebView` initializing and AvaloniaEdit loading without a version conflict" — is
met, with no fallback taken and no deliverable deferred. Phase 1 may start.

Two premises the plan carried in are corrected rather than confirmed: AvaloniaEdit's
Avalonia-12 compatibility is a settled fact (finding A), and `vpk` on this machine is
`DOTNET_ROOT`-dependent (finding B).

Nothing under `branch-stories/fernhill` was read or written by this phase; the test story
first comes into play in Phase 1.
