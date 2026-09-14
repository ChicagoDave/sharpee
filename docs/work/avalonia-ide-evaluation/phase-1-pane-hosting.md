# Phase 1 — NativeWebView pane hosting: the kill phase

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64), Avalonia 12.1.2 / `Avalonia.Controls.WebView` 12.1.0
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/pane/` (outside this repository)
**Evidence in repo**: `evidence/phase-1-probe-log.txt` (the run log quoted below), `evidence/phase-1-fernhill.tests.written.json` (the document the surface posted back)

**Verdict: PASS on the fallback shape, FAIL on the mechanism the plan hoped for.**
O6 cannot answer ADR-341 D3 the way the macOS app and the OpenSilver/Photino host answer it — there is no custom-scheme or response-supply door on this backend at all. It answers D3 over a token-scoped loopback origin, which carries every pane, both messaging directions, and the full ADR-307 round trip. One behaviour differs from the OpenSilver host and is **not explained**: §5.

## 1. The three routes, in the plan's order

### (a) Supply a response from `WebResourceRequested` — **FAIL**

The event fires. It cannot be answered. Reflected against the loaded assembly at run time, and printed by the probe itself so the claim is not a reading of documentation:

```
[   0.256s] WebResourceRequestedEventArgs public members: .ctor, Request
[   0.256s] WebViewWebResourceRequest public members: .ctor, Headers, Method, ToString, Uri
```

`Request` is a `WebViewWebResourceRequest` carrying `Uri`, `Method` and `Headers`. There is no
`Response`, no `SetResponse`, no deferral, no `Handled` flag. The event is **observation only**.

Navigating a custom scheme confirms the consequence end to end:

```
[   0.489s] nav started: sharpee-play://app/index-testing.html
[   4.310s] custom scheme: navigationSucceeded=False webResourceRequestedFired=1 title= href=about:blank
```

### (b) A custom scheme or virtual-host mapping — **FAIL on macOS**

The options document read `SetResponse`, `AddWebResourceRequestedFilter`,
`SetVirtualHostNameToFolderMapping` and a `customScheme` string out of the assembly and recorded
them as evidence the plumbing exists. Reflecting over **all 900 types** in
`Avalonia.Controls.WebView.dll`, public and non-public, every one of those names resolves to an
internal **Windows** COM interop declaration:

```
<Avalonia_Controls_Win_WebView1_Interop_IWebViewControlWebResourceRequestedEventArgs>…  (public type: False)
    [public] Method Void …IWebViewControlWebResourceRequestedEventArgs.SetResponse(IntPtr)
<Avalonia_Controls_Win_WebView2_Interop_ICoreWebView2_10>…  (public type: False)
    [public] Method Int32 …ICoreWebView2_10.AddWebResourceRequestedFilter(String, Int32)
    [public] Method Void  …ICoreWebView2_3.SetVirtualHostNameToFolderMapping(String, String, Int32)
```

These are the CsWinRT-generated bindings for WebView1/WebView2 — Windows-only, internal, and not
reachable through `NativeWebView`'s public surface on any platform.

On the macOS side the picture is simpler still. Searching the `Macios` namespace for any
scheme-handler or configuration hook returns exactly one binding:

```
Avalonia.Controls.Macios.Interop.WebKit.WKWebViewConfiguration
    Method Void AddScriptMessageHandler(WKScriptMessageHandler, NSString)
```

`setURLSchemeHandler:forURLScheme:` — the API the shipping Mac app's `PlayURLSchemeHandler` and
`DocsTabSchemeHandler` are built on — **is not bound at all**. And it cannot be reached through the
raw handle either: `IAppleWKWebViewPlatformHandle.WKWebView` hands back the live `WKWebView`
(`WKWebView=0x71531f000` in the log), but WebKit requires scheme handlers to be registered on the
`WKWebViewConfiguration` *before* the view is constructed, and `EnvironmentRequested` — the one
pre-construction hook — exposes only `ApplicationNameForUserAgent`, `DataStoreIdentifier`,
`LimitsNavigationsToAppBoundDomains`, `NonPersistentDataStore`, `ScriptHandlerMessageName` and
`UpgradeKnownHostsToHTTPS`. No configuration object, so no place to put a handler.

### (c) A token-scoped loopback origin — **PASS**

`LocalOrigin` binds the first free port in 49700–49739 and serves `PaneServer`'s bytes behind a
per-run token in the first path segment. Everything loads:

```
[   4.334s] origin: http://127.0.0.1:49700/<token>/  (token 2eed9e5b…)
[   4.355s] origin: untokened request → 403
  origin ← sharpee-play/index-testing.html              → 200 (37931 bytes)
  origin ← sharpee-play/game.js                         → 200 (1548133 bytes)
  origin ← sharpee-play/ide-testing-surface/surface.js  → 200 (122545 bytes)
  origin ← sharpee-play/ide-testing-surface/surface.css → 200 (16075 bytes)
[  30.364s] origin served: 23 request(s) total    (22 × 200, 1 × 403)
```

This is fernhill's real built bundle and the IDE's real checked-in pane assets — no fixture, no
copy, no stub.

## 2. Messaging, both directions

**Page → host** works through the WebKit-shaped door, with the handler name pinned by the host
rather than guessed: `AppleWKWebViewEnvironmentRequestedEventArgs.ScriptHandlerMessageName` is set
to `sharpeeAvaloniaHost` before the view exists, and the injected shim captures that native handler
*before* replacing `window.webkit` with its own counterfeit.

```
[   0.105s]   ScriptHandlerMessageName := sharpeeAvaloniaHost; EnableDevTools := true; NonPersistentDataStore := true
[  16.364s] testing pane: shim={"via":"webkit.messageHandlers.sharpeeAvaloniaHost","strategy":"assign","installed":true}
```

`strategy: "assign"` reproduces the OpenSilver host's finding exactly: `Object.defineProperty` on
`window.webkit` throws in a WKWebView, plain assignment takes. The finding is the host-shape one
already on record — the client (`packages/platform-browser/src/turn-events.ts:158-159`, `:224-225`)
and the surface detect the host by the WebKit-specific `window.webkit.messageHandlers.<name>` shape,
so every non-WebKit host must counterfeit it. Avalonia on macOS happens to *be* WebKit, which is why
the native handler survives underneath the counterfeit and the shim needs no bridge of its own.

**Host → page** works through `NativeWebView.InvokeScript`. The probe types a command with it and
the client answers with a turn record:

```
[  16.367s] host → page: type 'inventory' → typed
[  20.338s] after typed turn: 275 turn record(s), document posted=True
```

## 3. The ADR-307 round trip — complete

fernhill's real tree document (31 cards, seed 42) is injected as the boot session, replayed through
the real client, one new command is typed, and the surface posts the whole document back, which the
host writes outside the repository:

```
[  16.337s] pane ← testingSurface document: 21412 chars
[  20.338s] document: cards 31 → 32, seed 42, story fernhill,
            written to /Users/david/repos/spikes/avalonia-ide/out/fernhill.tests.json
```

The written document (`evidence/phase-1-fernhill.tests.written.json`):

```
original: cards=31 seed=42 story=fernhill version=1
written : cards=32 seed=42 story=fernhill version=1
new card: {"command": "inventory", "skip": true, "type": "turn"}
```

Five of the original 31 cards are not byte-identical — the surface's own re-serialization
(branch-id renumbering, key order), identical to what the OpenSilver host produced and unchanged by
the host. **Zero document posts during replay is correct**, not a gap: the surface posts only when
`model.serialize()` differs from the injected text
(`tools/ide/web/testing-surface/src/main.ts:419-422`), and a faithful replay leaves it unchanged.

`localStorage` survives navigation within the session (`localStorage across navigation=kept`).
**Not tested: survival across an app restart**, which the plan also asks for — the probe closes the
window at the end of its run and does not relaunch. Recorded as owed, not as passed.

`git status --short branch-stories/fernhill` is empty after every run.

## 4. Three host obligations this phase discovered

Each of these is something the Avalonia host must do that the plan did not anticipate, and each cost
a run to find.

1. **`NonPersistentDataStore` must be set.** Avalonia's WKWebView defaults to a persistent data
   store; the shipping Mac app uses a non-persistent one. Without it the client's autosave survives
   between launches and the next boot restores a game the pane was never given.

2. **Removing `AudioContext` is not enough to silence a pane.** The macOS host's boot script drops
   `AudioContext` because the client awaits `resume()` on every command and WebKit only resolves
   that after a real user gesture. But the bundle's ambience also plays through media elements: an
   early run fetched `night-wind.wav` twenty-odd times and played it aloud over a replay.
   `HTMLMediaElement.prototype.play` and `window.Audio` have to be stubbed as well. Request count
   with the stubs in place: 23, against 93 without.

3. **Write the tree document without a BOM.** .NET's `Encoding.UTF8` emits one, and a BOM'd
   `<story-id>.tests.json` is rejected by strict JSON parsers on the way back in. `new
   UTF8Encoding(false)`.

## 5. One difference from the OpenSilver host, unexplained

The replay **over-runs**. Against the same document, the same surface build and the same relay
design, the OpenSilver host saw 31 turn records and one `forkBoot`; this host sees **274 records and
12 `forkBoot`s** before the surface settles, replaying the line roughly nine times.

```
OpenSilver (2026-09-13): 31 turn records, 1 forkBoot, settled at 15.7s
Avalonia   (2026-09-14): 274 turn records, 12 forkBoots, settled at 7.1s
```

What was ruled out, each by direct check rather than by reasoning:

- **Relay ordering** — serializing the relay behind a queue and awaiting each `InvokeScript` changed
  the numbers not at all (274 both ways).
- **The boot payload** — byte-compatible with the OpenSilver host's (`story`, `seed`, `document`);
  the surface reports `sessionDocChars: 21327` and `surfaceIsReal: true`.
- **Persistent state between runs** — the numbers are identical with `NonPersistentDataStore` on and
  off, and identical run to run.
- **Double delivery from the client** — the client only *posts* records
  (`packages/platform-browser/src/turn-events.ts`); it never calls
  `window.__sharpeeTestingSurface.deliver` itself, so the host relay is the only delivery path.

**The end state is nonetheless correct**: the settled document is the right document, 31 → 32 cards
with the right new card. The path there is not, and Phase 6's decision record must not claim replay
parity with the other hosts on the strength of the final document alone. This is the first thing to
resume on if Phase 1 is reopened.

## 6. Real-path tests (rule 13a)

`PaneHost.Tests` — every test reads fernhill's real bundle and the IDE's real pane assets, and the
origin tests drive a real `HttpListener` over real HTTP:

| Test | Asserts on |
|---|---|
| serves the player's index with the shim injected after `<head>` | 200, `text/html`, shim present *before* `game.js` |
| serves the testing page with shim, boot session and asset loader | `__SHARPEE_TESTING_SESSION__`, `"seed":42`, both surface assets, the page's own `command-input` preserved |
| serves the surface's own assets under the reserved prefix | `surface.js` 200 at the IDE file's exact byte length; `surface.css` `text/css` |
| serves the docs page and its corpus index | 200 for both; corpus > 100 KB |
| refuses traversal, unknown files and unknown schemes | 404 for `../../fernhill.story`, `nope.js`, an unknown scheme |
| `RelativePath` strips scheme, host and query | three cases |
| serves the real bundle over real HTTP and records each request | live listener: 200s, `__SHARPEE_TESTING_SESSION__` in the served body, two log entries |
| refuses a request without this run's token | 403 + `forbidden` for a wrong token and for a bare path; every logged request 403 |
| two origins bind different ports and reject each other's tokens | distinct ports, cross-token request 403 |

```
dotnet test
Passed!  - Failed:     0, Passed:    11, Skipped:     0, Total:    11, Duration: 42 ms
```

One defect was found by these tests and fixed: `HttpListener` disposes itself when `Start()` fails,
so the port-scan loop threw `ObjectDisposedException` on its second attempt instead of trying the
next port. Each attempt now constructs its own listener.

## 7. What this phase does not establish

- **Windows.** Only the WKWebView backend was exercised. Whether `WebResourceRequested` behaves
  differently on the WebView2 backend — where the COM interop above *does* expose
  `AddWebResourceRequestedFilter` and `SetVirtualHostNameToFolderMapping` internally — is Phase 7's
  question, and it matters: a Windows-only response-supply door would mean D3 is answered one way on
  Windows and another on macOS, which is precisely the split ADR-341 D3 exists to prevent.
- **`localStorage` across an app restart** (§3).
- **A screenshot of the panes.** The probe closes its window when the run ends; the panes' rendering
  is evidenced by the run log (`anchors=1005` on the testing page, `693` on the play page, the docs
  tab's `navLinks: 106` and `Chord 3.6.0`) rather than by an image.
- **How the panes feel** — focus handling between XAML chrome and the web view, keyboard routing,
  theming. Phase 4.
