# Phase 8 — Linux check: the third platform, on two architectures

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run (scouting leg)**: 2026-09-15, session e3fbf7, Ubuntu 24.04.4 LTS (`linux-arm64`) in Docker on macOS 26.6.2 (colima, `linux/aarch64`)
**Run (record leg, deliverable 4)**: 2026-09-15, session a146df, Ubuntu 24.04.5 LTS (`linux-x64`) in WSL2 on Windows 11 Pro 26200 — see [The x64 record run](#the-x64-record-run-deliverable-4) below
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/linux-door/` and `linux-pack/` on the Mac; `/root/spikes/avalonia-ide/linux-door/` and `linux-pack/` in the PC's `Ubuntu-24.04` WSL distro (both outside this repository, per the plan's evidence discipline)
**Evidence in repo**: `evidence/phase-8-linux-door.json`, `evidence/phase-8-linux-packaging.txt` (arm64); `evidence/phase-8-linux-door-x64.json`, `evidence/phase-8-linux-packaging-x64.txt`, `evidence/phase-8-linux-appimage-run-x64.txt` (x64)

**Verdict: PASS on the two questions this leg could answer, and the door result is stronger than Windows'.** Linux has a pane door reachable from application code, and it is a **custom URI scheme** — the mechanism ADR-341 D3 actually specifies and the one the shipping Mac app already uses, rather than an analogue of it. Velopack produces a working AppImage with a working delta channel. The third question needed no run at all: the toolchain gap is identical to Windows.

**This section is the arm64 scouting leg**, and nothing in it is offered as an x64 result. The x64 record run (deliverable 4) was completed on 2026-09-15 by session a146df and is recorded in its own section at the end of this document; it **confirms every finding here on x64** and adds one the arm64 leg could not: the packaged artifact runs.

## Entry state

| Pin | Phase 7 (Windows) | This run | Comparable |
| --- | --- | --- | --- |
| .NET SDK | 10.0.401 | **10.0.401** | yes — the same SDK, by accident rather than design |
| Avalonia | 12.1.2 | 12.1.2 | yes |
| Avalonia.Controls.WebView | 12.1.0 | 12.1.0 | yes |
| Velopack `vpk` | 1.2.0 | 1.2.0 | yes |
| Web engine | WebView2 153.0.4234.32 | **WebKitGTK `libwebkit2gtk-4.1` 2.52.6** | platform-specific |
| Architecture | x64 | **arm64** | **no — stated, not blurred** |

`PaneHost` and the probe both build on `linux-arm64` with **0 warnings, 0 errors**, restore in ~5 s. That is the first evidence the toolkit's cross-platform claim survives contact with a third platform.

## Question 1 — is there a pane door on Linux?

**Yes, and it is a custom URI scheme.**

The reasoning that produced "no door" on macOS in Phase 1 was Avalonia's own API surface, and Phase 7 showed on Windows that this reasoning is unsound: `WebResourceRequested` is Request-only on every backend, but the **public platform handle** hands out the native web view, after which the platform's own door can be called directly. This phase applied the identical move to GTK.

The path, every step measured (`evidence/phase-8-linux-door.json`):

```
AdapterCreated: args=WebViewAdapterEventArgs handle=Avalonia.Controls.Gtk.GtkX11WebViewAdapter
  platformHandleDescriptor  = "XID"
  IGtkWebViewPlatformHandle  implemented
  WebKitWebView              = 0xfffa89eabd50
  webkit_web_view_get_context          => 0xfffa88072270
  webkit_web_context_register_uri_scheme("sharpee-panes") returned
navigating to sharpee-panes://host/index.html  (no HttpListener in this process)
  scheme request: sharpee-panes://host/index.html
document.title   => "PHASE8-LINUX-SCHEME-OK"
location.origin  => "sharpee-panes://host"
servedRequests   => 1
```

`webkit_web_context_register_uri_scheme` is **not bound by Avalonia** — the probe P/Invokes it against `libwebkit2gtk-4.1.so.0` directly, exactly as Phase 7 QI'd to `ICoreWebView2_3` to reach `SetVirtualHostNameToFolderMapping`. The page was served from memory through `g_memory_input_stream_new_from_data`; there is no folder mapping and no socket.

**Why this is a better result than Windows'.** Windows offers a *virtual host mapping* (`https://sharpee-panes.invalid/` over a real folder) — a good door, but an analogue of the contract. Linux offers a *scheme handler*, which is what `sharpee-play://` and `sharpee-docs://` already are in the shipping Mac app. So on Linux the D3 contract is satisfiable by its own mechanism, unchanged.

One detail recorded for an implementation: `marshalPath: "direct"`. `GtkX11WebViewAdapter` does not expose the `RunOnWebView` marshaller that `GtkWebViewAdapter` carries, and calling from the UI thread worked. Whether that holds under load, or on a build where Avalonia drives its own GLib loop differently, is not established by one probe.

### A harness defect, recorded because the conclusion it produced was wrong

The first run of this probe returned **FAIL**, and the FAIL was the probe's, not Linux's. `AdapterCreated` hands out `WebViewAdapterEventArgs`, not the adapter; the probe interrogated the event-args object for `IGtkWebViewPlatformHandle`, did not find it, and wrote `"doorReachable": false`. `libwebkit2gtk` was never called and the scheme was never registered. The correction is one line — go through `args.TryGetPlatformHandle()` — and the run above is the corrected one.

It is written down rather than quietly fixed because an uncorrected version of it is precisely the failure GH #435 tracks: **a probe reporting a verdict about behaviour it never exercised.** Had that FAIL been recorded, this evaluation would have carried "Linux has no door" on the strength of a reflection query against the wrong object.

## Question 2 — `vpk` on Linux

**Velopack's Linux path works, in 1.5 seconds.** On Linux `vpk` offers exactly one bundle format — `pack` is documented as "Create a Linux .AppImage bundle from application files" — so there is no installer/portable choice to make as there is on Windows.

From a 225-entry / 111 MB self-contained `linux-arm64` publish:

| Artifact | Bytes |
| --- | --- |
| `SharpeePaneHost.AppImage` | 47,495,688 (ELF 64-bit LSB pie, ARM aarch64, static-pie) |
| `SharpeePaneHost-1.0.0-linux-full.nupkg` | 46,789,339 |
| `SharpeePaneHost-1.0.1-linux-delta.nupkg` | **118,644** |

The three platforms side by side, with the caveat that follows them:

| | macOS (Phase 5) | Windows (Phase 7) | Linux (this phase) |
| --- | --- | --- | --- |
| Full package | 99.8 MB | 51,984,680 B | 46,789,339 B |
| Delta, one-line change | 8.11 MB | 72,533 B | **118,644 B** |
| Pack time | 34.5 s | 8.4 s | **1.5 s** |
| Artifact | `.pkg` + portable zip | `Setup.exe` + portable zip | `.AppImage` |
| Signable | **no — the bundle cannot be sealed** | flag present, unexercised | not attempted |

**Read the sizes with care.** The macOS package carried the 175 MB vendored toolchain; the Windows and Linux packages carry none, because no Windows or Linux Node asset exists to vendor (question 3). The three numbers are therefore *not* like-for-like, and the two small ones will grow once a toolchain rides along. What the table does establish is that the **mechanism** works on all three and that only macOS cannot be signed.

**Two build-host prerequisites, both found by failing.** `mksquashfs` absent aborts the pack outright — an AppImage is a squashfs image, so this is structural. `zstd` absent does something worse than fail: it *succeeds*, falling back to bsdiff with Velopack's own warning that this is "a lot slower and more prone to breaking." Measured on the same delta: **122,949 B in 12,848 ms** on the fallback against **118,644 B in 1,502 ms** with zstd. A Linux build box missing zstd produces a working but degraded channel and says so only in a line of log output.

## Question 3 — the vendored toolchain on Linux

**Answered from the repository, no run required, and it is the same answer as Windows.** `tools/ide/vendor/node/` contains exactly two assets — `node-v22.23.1-darwin-arm64.tar.xz` and `node-v22.23.1-darwin-x64.tar.xz` — plus a README and SHASUMS. There is no Linux Node and no Windows Node. The shim (`vendor-toolchain.sh:298`) is `#!/bin/sh`, which Linux can at least execute, so unlike Windows the *launcher* is not the obstacle here; the missing asset is, and GH #448 sits downstream of both.

So the toolchain gap is now one gap across two platforms, and it is not an Avalonia cost — it would be identical under WPF, and it is identical under the pairing David ruled on 2026-09-15.

## What this phase did not establish

- ~~**x64.**~~ — **closed by the record run below.** Everything in *this section* is `linux-arm64`; the door question is an API-binding question that architecture does not bear on, which is why this leg was run here at all, and the packaging numbers and arch-specific build behaviour were left to the PC's `linux/amd64`. That run has now happened.
- **Signing, and running the artifact.** Nothing was signed here, and the AppImage was never executed **on arm64**. The x64 leg did execute it (see below); signing remains unattempted on both.
- **The panes themselves.** This probe served its own one-page document. The real `docs-tab` and `testing-surface` were not loaded over the scheme, and the ADR-307 round trip was not run on Linux.
- **The felt question.** Deliberately: a software-rendered Avalonia window under Xvfb on a virtualised host is a poor place to judge how a Skia-rendered app feels, and no screenshot was taken for that reason.
- **macOS.** `IAppleWKWebViewPlatformHandle.WKWebView` is public, so Phase 1's "no door" was reached by the reasoning that has now been wrong on two backends. That re-test is carried as a correction owed to `phase-1-pane-hosting.md`, not as a deliverable here — under the pairing, Avalonia does not ship on macOS and the cell does not bear on the decision.

## Integration Reality Statement (rule 13a)

**The GTK pane door and the Linux packaging path**

- **OWNED**: `Avalonia.Controls.WebView` 12.1.0's GTK backend as this repository would consume it; the `PaneHost` shell carried from Phases 1–6; Velopack `vpk` 1.2.0's Linux target; the probe's own P/Invokes.
- **EXTERNAL**: WebKitGTK 2.52.6, GLib/GIO, the AppImage runtime, Ubuntu 24.04.4 and the Docker/colima VM — none of which this repository ships.
- **REAL-PATH TEST**: `evidence/phase-8-linux-door.json` — the real `GtkX11WebViewAdapter`, the real `WebKitWebView` pointer, the real `webkit_web_context_register_uri_scheme`, a real navigation, and DOM strings read back out of the live document. `evidence/phase-8-linux-packaging.txt` — the real `vpk` producing a real AppImage and a real delta from a real self-contained publish of the actual spike shell. No stub of the web view, the bundler or the packager.
- **STUB JUSTIFICATION**: one, named. The scheme handler serves a **probe page**, not the IDE's real panes, because this leg was answering whether the door exists rather than whether the panes render through it. The panes over the scheme are owed and are listed above as not established.

---

## The x64 record run (deliverable 4)

**Run**: 2026-09-15, session a146df, on the PC.
**Verdict: PASS on all three questions, every arm64 finding confirmed on x64, plus one thing neither prior leg established — the packaged artifact runs.**

### Host, and two divergences stated rather than blurred

**Docker is not installed on this PC.** The plan's entry state assumed "Docker Desktop/WSL2 `linux/amd64`"; only the WSL2 half exists here. This run is therefore **WSL2 directly, not a container** — a real x86_64 Linux userspace on a Microsoft kernel, not a virtualised guest under colima as the arm64 leg was.

**The box's default `Ubuntu` distro (26.04 LTS) was unusable and is not what ran.** Its `gnu-coreutils` package sits in state `iHR` — half-installed, reinstall-required, stranded mid-way through Ubuntu's rust-coreutils transition — which aborts every `apt` operation before it starts. Rather than repair a distro this work does not own, a clean `Ubuntu-24.04` was installed (`wsl --install -d Ubuntu-24.04 --no-launch`). That choice does double duty: it sidesteps the broken package, **and it removes the distro as a variable**, leaving architecture as the only material difference between the two Linux columns.

| Pin | Phase 7 (Windows) | arm64 leg | **This run** | Comparable |
| --- | --- | --- | --- | --- |
| .NET SDK | 10.0.401 | 10.0.401 | **10.0.401** | yes |
| Avalonia | 12.1.2 | 12.1.2 | 12.1.2 | yes |
| Avalonia.Controls.WebView | 12.1.0 | 12.1.0 | 12.1.0 | yes |
| Velopack `vpk` | 1.2.0 | 1.2.0 | 1.2.0 | yes |
| Web engine | WebView2 153.0.4234.32 | `libwebkit2gtk-4.1` 2.52.6 | **2.52.6** (`2.52.6-0ubuntu0.24.04.1`) | yes — exact |
| Distro | Windows 11 Pro 26200 | Ubuntu 24.04.4 LTS | Ubuntu 24.04.5 LTS | one point release apart |
| Host shape | bare metal | Docker under colima | **WSL2, not a container** | stated |
| Architecture | x64 | arm64 | **x64** | **this is the point of the leg** |

`libwebkit2gtk-4.1` being **2.52.6 on both** is the load-bearing line: the door question is a question about that library's API, and both legs asked it of the same version.

### Question 1 — the door, on x64

**Yes, by the same mechanism, at the first attempt.** Full record: `evidence/phase-8-linux-door-x64.json`.

```
AdapterCreated: args=WebViewAdapterEventArgs handle=Avalonia.Controls.Gtk.GtkX11WebViewAdapter
  platformHandleDescriptor  = "XID"
  IGtkWebViewPlatformHandle  implemented
  WebKitWebView              = 0x7ddba00884a0
  webkit_web_view_get_context          => 0x7ddba007fa70
  webkit_web_context_register_uri_scheme("sharpee-panes") returned
adapter: type=WebKitGtk engine=WebKit version=2.52.6
navigating to sharpee-panes://host/index.html  (no HttpListener in this process)
  scheme request: sharpee-panes://host/index.html
document.title   => "PHASE8-LINUX-SCHEME-OK"
location.origin  => "sharpee-panes://host"
servedRequests   => 1
verdict          => PASS
```

Every field matches the arm64 record except the pointers, `rid`, `arch`, and the distro point release. `marshalPath` is `direct` on both — `GtkX11WebViewAdapter` exposes no `RunOnWebView` marshaller and calling from the UI thread worked here too.

**The probe was rebuilt, not copied.** The arm64 spike source lives only on the Mac and is outside the repository, so the x64 probe was reconstructed on this machine from the recorded path plus the committed evidence schema, using the PC's own `win-door/Program.cs` (Phase 7) and `apidump/` as templates. Before writing it, the two API members the path depends on were **confirmed by reflection against `Avalonia.Controls.WebView` 12.1.0 on this machine** rather than assumed from the arm64 record:

- `Avalonia.Platform.IGtkWebViewPlatformHandle` — `IntPtr WebKitWebView { get; }`
- `Avalonia.Controls.WebViewAdapterEventArgs` — `IPlatformHandle TryGetPlatformHandle()`

That check is the arm64 leg's recorded harness defect turned into a step: the handle is reached through `TryGetPlatformHandle()`, and a probe that interrogates the event-args object instead produces a FAIL about behaviour it never exercised (GH #435).

**Three fields the arm64 leg did not capture.** `adapterType=WebKitGtk`, `adapterEngine=WebKit`, `adapterVersion=2.52.6`, read from `NativeWebView.AdapterInfo` at runtime. The arm64 record established the WebKitGTK version from the container image; this one establishes it from the live adapter as well.

### Question 2 — `vpk` on x64

**Works, in 2.2 s.** Full measurements: `evidence/phase-8-linux-packaging-x64.txt`.

The subject is the same PaneHost the arm64 leg packed, copied from the PC's spike tree with `bin/`/`obj/` excluded and nothing else changed — it already carried `VelopackApp.Build().Run()`, so no source edit was needed to pack it. The publish produced **225 entries**, the same count as arm64.

| | arm64 | x64 |
| --- | --- | --- |
| `SharpeePaneHost.AppImage` | 47,495,688 | **49,801,720** (ELF 64-bit LSB pie, x86-64, static-pie, stripped) |
| `-1.0.0-linux-full.nupkg` | 46,789,339 | **49,119,915** |
| `-1.0.1-linux-delta.nupkg` | 118,644 | **106,944** |
| pack time | 1.5 s | **2.2 s** |
| AppImage runtime | `appimagekit-runtime-aarch64` | `appimagekit-runtime-x86_64` |

**The delta is a band, not a figure.** Two zstd packs of identical source produced 110,050 and 106,944 bytes, because the 1.0.1 full nupkg itself differed run to run (49,119,951 vs 49,119,985) — ordinary build non-determinism. Read Linux as "~107-110 KB on a one-line change" and do not diff a future number against a single one of these.

**The zstd trap reproduces on x64, at the same multiple.** With `zstd` removed from `PATH`, `vpk` still succeeds and still degrades silently to bsdiff: 110,951 bytes in a 24.11 s pack against 110,050 bytes in 2.83 s. That is 8.5x, the same multiple the arm64 leg measured (12,848 ms against 1,502 ms). `mksquashfs` was present on this host from the start, so the arm64 leg's structural finding about its absence was **not** re-derived — it is carried, not re-measured.

**One porting cost that did not materialise.** PaneHost carries `<ApplicationManifest>app.manifest</ApplicationManifest>`, a Windows-only artifact. Publishing for `linux-x64` ignores it silently — no warning, no error, no csproj edit.

### NEW — the artifact was executed

Both prior legs list "the AppImage was not executed" under what they did not establish. It executes. Log: `evidence/phase-8-linux-appimage-run-x64.txt`.

It runs **directly off FUSE with no extraction**, reaches WebKitGTK 2.52.6 through `GtkX11WebViewAdapter`, and completes its own Phase 1 probe sequence inside the packaged bundle. Two details worth keeping:

1. **The packaged app corroborates Phase 1 and this phase at once.** Its stage 1 drives Avalonia's *own* `WebResourceRequested` path and reports `navigationSucceeded=True webResourceRequestedFired=2 title= href=about:blank` — the navigation is seen, the response is not suppliable, the document is empty. That is Phase 1's "no door via Avalonia's own API", reproduced from inside a shipped artifact. The door this phase proves is the one reached *underneath* Avalonia, by direct P/Invoke, and it serves real content. The two results are complementary, not in tension.
2. **It fails at stage 2 on a spike-path defect, not a platform finding.** `DirectoryNotFoundException: /Users/david/repos/sharpee/branch-stories/fernhill/fernhill.tests.json`. `SpikePaths` branches Windows vs non-Windows and hands Linux the macOS path. Nothing this phase decides sits downstream of it.

### Question 3 — the vendored toolchain

**Confirmed from this clone, and the answer is unchanged.** `tools/ide/vendor/node/` carries exactly `node-v22.23.1-darwin-arm64.tar.xz`, `node-v22.23.1-darwin-x64.tar.xz`, a README and SHASUMS — no Linux asset and no Windows asset. The shim written by `tools/ide/vendor-toolchain.sh` is `#!/bin/sh`, which Linux executes, so on Linux the missing asset is the whole obstacle, exactly as the arm64 leg found. GH #448 sits downstream. This is one gap across two platforms and it is not an Avalonia cost.

### What the x64 leg still did not establish

- **Signing.** Nothing was signed, on either Linux architecture.
- **The update round trip.** A delta was produced and never applied.
- **The real panes.** The probe served its own one-page document; `docs-tab` and `testing-surface` were never loaded over the scheme, and the ADR-307 round trip was not run on Linux. The packaged app's attempt to reach them failed on the spike-path defect above.
- **The felt question.** Deliberately, and doubly so here: software-rendered Avalonia under Xvfb on WSL2 is a worse place to judge feel than the arm64 container was.
- **A stock Linux kernel.** WSL2's kernel is Microsoft's. Nothing measured here is kernel-sensitive as far as this leg can tell, but it was not run on a bare-metal distro and does not claim to have been.

### Integration Reality Statement (rule 13a)

**The GTK pane door and the Linux packaging path, on x64**

- **OWNED**: `Avalonia.Controls.WebView` 12.1.0's GTK backend as this repository would consume it; the `PaneHost` shell carried unchanged from Phases 1-6; Velopack `vpk` 1.2.0's Linux target; the probe's own P/Invokes; `tools/ide/vendor/node/` and `tools/ide/vendor-toolchain.sh` as read from this clone.
- **EXTERNAL**: WebKitGTK 2.52.6, GLib/GIO, the AppImage runtime and its FUSE mount, Ubuntu 24.04.5, and the WSL2 kernel — none of which this repository ships.
- **REAL-PATH TEST**: `evidence/phase-8-linux-door-x64.json` — the real `GtkX11WebViewAdapter`, the real `WebKitWebView` pointer, the real `webkit_web_context_register_uri_scheme` against `libwebkit2gtk-4.1.so.0`, a real navigation, and DOM strings read back out of the live document. `evidence/phase-8-linux-packaging-x64.txt` — the real `vpk` producing a real AppImage and a real delta from a real 225-entry self-contained publish of the actual spike shell. `evidence/phase-8-linux-appimage-run-x64.txt` — **the packaged artifact itself, executed**, which is a strictly realer path than either prior leg reached. No stub of the web view, the bundler, or the packager anywhere in this leg.
- **STUB JUSTIFICATION**: one, the same one the arm64 leg named. The scheme handler serves a **probe page**, not the IDE's real panes, because the question was whether the door exists rather than whether the panes render through it. The panes over the scheme remain owed and are listed above as not established.
