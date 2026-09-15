# Phase 8 — Linux check: the third platform, in a container

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-15, session e3fbf7, Ubuntu 24.04.4 LTS (`linux-arm64`) in Docker on macOS 26.6.2 (colima, `linux/aarch64`)
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/linux-door/` and `linux-pack/` (outside this repository, per the plan's evidence discipline)
**Evidence in repo**: `evidence/phase-8-linux-door.json`, `evidence/phase-8-linux-packaging.txt`

**Verdict: PASS on the two questions this leg could answer, and the door result is stronger than Windows'.** Linux has a pane door reachable from application code, and it is a **custom URI scheme** — the mechanism ADR-341 D3 actually specifies and the one the shipping Mac app already uses, rather than an analogue of it. Velopack produces a working AppImage with a working delta channel. The third question needed no run at all: the toolchain gap is identical to Windows.

**This is the arm64 scouting leg.** The x64 record run on the PC is still owed (deliverable 4), and nothing here is offered as an x64 result.

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

- **x64.** Everything here is `linux-arm64`. The door question is an API-binding question that architecture does not bear on, which is why this leg was run here at all; the packaging numbers and any arch-specific build behaviour need the PC's `linux/amd64`.
- **Signing, and running the artifact.** The AppImage was never executed and nothing was signed.
- **The panes themselves.** This probe served its own one-page document. The real `docs-tab` and `testing-surface` were not loaded over the scheme, and the ADR-307 round trip was not run on Linux.
- **The felt question.** Deliberately: a software-rendered Avalonia window under Xvfb on a virtualised host is a poor place to judge how a Skia-rendered app feels, and no screenshot was taken for that reason.
- **macOS.** `IAppleWKWebViewPlatformHandle.WKWebView` is public, so Phase 1's "no door" was reached by the reasoning that has now been wrong on two backends. That re-test is carried as a correction owed to `phase-1-pane-hosting.md`, not as a deliverable here — under the pairing, Avalonia does not ship on macOS and the cell does not bear on the decision.

## Integration Reality Statement (rule 13a)

**The GTK pane door and the Linux packaging path**

- **OWNED**: `Avalonia.Controls.WebView` 12.1.0's GTK backend as this repository would consume it; the `PaneHost` shell carried from Phases 1–6; Velopack `vpk` 1.2.0's Linux target; the probe's own P/Invokes.
- **EXTERNAL**: WebKitGTK 2.52.6, GLib/GIO, the AppImage runtime, Ubuntu 24.04.4 and the Docker/colima VM — none of which this repository ships.
- **REAL-PATH TEST**: `evidence/phase-8-linux-door.json` — the real `GtkX11WebViewAdapter`, the real `WebKitWebView` pointer, the real `webkit_web_context_register_uri_scheme`, a real navigation, and DOM strings read back out of the live document. `evidence/phase-8-linux-packaging.txt` — the real `vpk` producing a real AppImage and a real delta from a real self-contained publish of the actual spike shell. No stub of the web view, the bundler or the packager.
- **STUB JUSTIFICATION**: one, named. The scheme handler serves a **probe page**, not the IDE's real panes, because this leg was answering whether the door exists rather than whether the panes render through it. The panes over the scheme are owed and are listed above as not established.
