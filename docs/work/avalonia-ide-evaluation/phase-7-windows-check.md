# Phase 7 — Windows check

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 6c19b3, Windows 11 Pro 10.0.26200 (x64)
**Spike code**: `C:\Users\David\spikes\avalonia-ide\` (outside this repository, per the plan's evidence discipline)
**Verdict**: **PASS — the macOS column is confirmed, with one material correction that improves it.**

Phases 0–6 measured a cross-platform toolkit on one platform. This phase re-ran the three things the transfer note named as not inferable from macOS. All three are answered. The correction is on question 1 and it changes an ADR-341 ruling, so it is stated first.

## Entry state

| Pin (transfer note) | macOS runs | This run | Comparable |
| --- | --- | --- | --- |
| .NET SDK | 10.0.300 | **10.0.401** | yes — same band, see deviation below |
| Avalonia | 12.1.2 | 12.1.2 | yes |
| Avalonia.Controls.WebView | 12.1.0 | 12.1.0 | yes |
| Avalonia.AvaloniaEdit | 12.0.0 | 12.0.0 | yes |
| Velopack `vpk` | 1.2.0 | 1.2.0 | yes |
| WebView2 Evergreen runtime | n/a | **153.0.4234.32** | Windows-only |

**Deviation, recorded not waved through**: the SDK is 10.0.401, not the pinned 10.0.300. 10.0.300 is not installed on this machine and no `global.json` pins it. Both are .NET 10 SDKs building the same `net10.0` target framework against identically-pinned packages, so the comparison holds; a future run wanting byte-exact parity should install 10.0.300.

`PaneHost` built on Windows with **0 warnings, 0 errors** against those pins — the first evidence that the toolkit's own cross-platform claim survives contact with the second platform.

## Question 1 — does the WebView2 backend supply a response where WKWebView does not?

**Yes. The door exists on Windows, it is reachable from application code, and it was used end to end.** This is the phase's headline, because Phase 1 on macOS found no such door and fell back to a token-scoped loopback HTTP origin, which is the single point Avalonia gives up on R5 in ADR-351's matrix.

### What is the same on both platforms

Avalonia's own API is Request-only on Windows exactly as on macOS. From the re-run of Phase 1's probe (`evidence/phase-7-panehost-rerun-log.txt`):

```
adapter: type=WebView2 engine=Blink version=153.0.4234.32
WebResourceRequestedEventArgs public members: .ctor, Request
WebViewWebResourceRequest public members: .ctor, Headers, Method, ToString, Uri
custom scheme: navigationSucceeded=False webResourceRequestedFired=0 title="" href="about:blank"
```

So the **custom-scheme** route fails identically on both platforms, and Avalonia's `WebResourceRequested` event hands out no response, no deferral and no `Handled` on either. Anyone reading only Avalonia's surface would conclude, correctly, that there is no door — which is what the macOS phase concluded.

### What is different

The package ships **one cross-platform assembly** (`lib/net10.0/Avalonia.Controls.WebView.dll`, no RID-specific `runtimes/`), so the difference is not in the assembly. It is in what the underlying native object offers and in whether Avalonia hands it over. On Windows it does, through **public** API:

- `NativeWebView.AdapterCreated` carries `WebViewAdapterEventArgs.TryGetPlatformHandle()`.
- That returns `Avalonia.Controls.Win.WebView2.WebView2HwndAdapter`, which implements the **public** `Avalonia.Platform.IWindowsWebView2PlatformHandle`.
- That interface exposes `CoreWebView2` and `CoreWebView2Controller` as raw `IntPtr`.

**A correction to an intermediate reading in this session**: `NativeWebView.TryGetPlatformHandle()` returned `null` in the Phase 1 re-run, which momentarily looked like "no handle on Windows either." It is a timing artifact — the re-run asks at `OnLoaded`, before the adapter is created. Asked after the window opens, the same call returns the handle. Both readings are in the evidence; the later one is correct.

`QueryInterface` on the live pointer (`evidence/phase-7-windows-door.txt`):

```
AdapterCreated: handleType=Avalonia.Controls.Win.WebView2.WebView2HwndAdapter descriptor=HWND
  IWindowsWebView2PlatformHandle: CoreWebView2=0x10f000120000 Controller=0x10f000110308
  QI ICoreWebView2      hr=0x00000000 => SUPPORTED
  QI ICoreWebView2_2    hr=0x00000000 => SUPPORTED
  QI ICoreWebView2_3    hr=0x00000000 => SUPPORTED
  QI ICoreWebView2_22   hr=0x00000000 => SUPPORTED
```

`ICoreWebView2` owns `add_WebResourceRequested` / `AddWebResourceRequestedFilter` with full response supply; `ICoreWebView2_3` owns `SetVirtualHostNameToFolderMapping`. Both are `internal` inside Avalonia, so Avalonia's own interop types cannot be used — but they do not need to be, because the pointer is public and the interfaces are standard WebView2 COM.

### The real-path test (rule 13a)

An interface being present is not the same as a call working, so the door was **used**, not just detected. Vtable slot numbers were read from Avalonia's own generated interop (`SetVirtualHostNameToFolderMapping_71`) rather than guessed, and called through a function pointer:

```
SetVirtualHostNameToFolderMapping("sharpee-panes.invalid",
                                 "C:/Users/David/spikes/avalonia-ide/out/vhost", ALLOW)
    => hr=0x00000000
navigating to https://sharpee-panes.invalid/index.html  (no HttpListener in this process)
nav completed: WebViewNavigationCompletedEventArgs
document.title   => "PHASE7-VIRTUAL-HOST-OK"
location.origin  => "https://sharpee-panes.invalid"
marker           => "PHASE7-VIRTUAL-HOST-OK"
h1 text          => "served from the host's own folder"
```

Real `NativeWebView`, real WebView2 runtime, real bytes off disk, real navigation, and **no `HttpListener` anywhere in the process**. No stub, no injection, no override.

### What this means for ADR-341 D3

D3 put the three panes behind one host contract so the host door would not answer differently per platform. It does answer differently:

| | macOS (WKWebView) | Windows (WebView2) |
| --- | --- | --- |
| Custom scheme | absent | absent |
| Response supply via Avalonia's event | absent | absent |
| Host-controlled origin | **token-scoped loopback `HttpListener`** | **`SetVirtualHostNameToFolderMapping`, no listener** |
| Origin the pane sees | `http://127.0.0.1:<port>/<token>/…` | `https://sharpee-panes.invalid/…` — stable, no port, no token |

This is a **gap in Avalonia's abstraction, not in the platform**: both backends can serve host-owned bytes, but only the Windows one can do it without a socket. A shipping implementation either writes the per-platform door behind one internal seam (and ADR-341 D3's contract module is where that belongs), or accepts the loopback origin on both for uniformity and gives up the better Windows behaviour deliberately. **That is a decision, and this phase does not make it.**

## Question 2 — `Setup.exe` via `vpk`, with the Azure Trusted Signing flag

**Velopack's Windows path works, and it is the opposite of its macOS result.** On macOS `vpk` could not seal the bundle at all: 225 publish entries, toolchain included, went flat into `Contents/MacOS/`, nothing was ever submitted to Apple, and that is why ADR-351 scores Avalonia R15 = 2 and calls it "a wall, not a polish gap."

On Windows, from a 227-entry / 209 MB self-contained `win-x64` publish:

```
Verified VelopackApp.Run() in 'System.Void PaneHost.Program::Main(System.String)'.
Shortcuts: Desktop,StartMenuRoot
Starting: Code-sign application
No signing parameters provided, 224 file(s) will not be signed.
Setup bundle created 'SharpeePaneHost-win-Setup.exe'.
Finished in 00:00:08.3720259.
```

Artifacts produced, in 8.4 seconds:

| Artifact | Bytes |
| --- | --- |
| `SharpeePaneHost-win-Setup.exe` | 56,446,248 |
| `SharpeePaneHost-win-Portable.zip` | 51,983,707 |
| `SharpeePaneHost-1.0.0-full.nupkg` | 51,984,680 |

**The delta channel works.** A second pack at 1.0.1 over a one-line source change produced `SharpeePaneHost-1.0.1-delta.nupkg` at **72,533 bytes** against a 51,984,680-byte full package — the same mechanism the macOS record measured at 8.11 MB on a 99.8 MB app, confirmed working on the platform that can actually ship it.

**The signing flag is real**: `vpk pack --azureTrustedSignFile <PATH>` exists in 1.2.0, and the code-sign step runs as its own phase, reporting the 224 unsigned files rather than skipping silently. ADR-341 D7's ruling is therefore mechanically supported.

**Not established, and both need David**: no signed build was produced — Azure Trusted Signing needs his identity and a `metadata.json` this session does not have — and the `Setup.exe` was **not executed**, so installation, shortcut creation and the update round trip are built-but-unrun. Neither is a toolkit question; both are credential and machine-state questions.

One packaging change was required and is worth carrying into any implementation: `vpk` refuses to pack an app that does not call `VelopackApp.Build().Run()` in `Main`, and verifies it by inspecting the assembly. It is a hard gate, not a warning.

## Question 3 — the vendored toolchain's Windows launcher

**It does not port, and the blocker is earlier than the shim.** Three findings, each from the repository rather than from inference:

1. **The shim is POSIX by construction.** `tools/ide/vendor-toolchain.sh:298` writes `bin/sharpee` as a `#!/bin/sh` script. Windows has no native exec path for it.
2. **Its layout assumption is POSIX too.** The shim requires `$root/node/bin/node` (`vendor-toolchain.sh:311`) and seals the CLI by exporting `NODE_PATH` and `PATH`. The Windows Node distribution puts `node.exe` at the distribution root, not at `bin/node`, so the path check fails before the seal is even attempted.
3. **There is no Windows Node to vendor.** `tools/ide/vendor/node/` contains exactly two assets — `node-v22.23.1-darwin-arm64.tar.xz` and `node-v22.23.1-darwin-x64.tar.xz`. No `win-x64` tarball exists in the repository, so the toolchain is macOS-only by construction and not merely by shim.

A Windows implementation therefore needs its own vendored Node asset, its own launcher (a `.cmd` shim, or the host spawning `node.exe` directly and setting the environment itself), and the sealing invariant re-expressed for that launcher. **GH #448** — devkit spawning `npm`/`npx` through `execFileSync` in production source — sits downstream of all of this and blocks the toolchain being *useful* on Windows even once it launches.

This is unpriced work, on the critical path for a Windows Chord Writer, and it is not an Avalonia question — it would be identical under WPF.

## What this phase did not establish

- **The play and testing panes were not exercised.** The loopback re-run served `sharpee-docs` at 200 (106 nav links, "Chord 3.6.0", 3 posts — the docs pane round trip works on Windows) but returned **404 for `sharpee-play`**, because `branch-stories/fernhill/dist/web/fernhill` is a build output this clone has never produced. That is a missing artifact on this machine, **not** a Windows finding, and it is entangled with question 3: producing it needs the toolchain that does not launch here.
- **No signed `Setup.exe`, and no install run** (question 2 above).
- **The felt comparison is untouched** — that is ADR-351 Q-3 and needs David, not a phase.

## Verdict

The Avalonia column **confirms on Windows**, and the one correction found makes it better rather than worse: the pane-hosting mechanism Phase 1 had to fall back to on macOS is unnecessary on Windows, where a host-owned origin is available with no socket at all. Velopack, 0-for-1 on macOS, is 1-for-1 here. The genuine Windows-side gap is not the toolkit at all — it is the vendored toolchain, which has no Windows asset, no Windows launcher, and a known downstream defect in devkit.
