# Phase 2 record — web-pane hosting: the third host for D3's contract

**Written**: 2026-09-13, session 30faa2, on `main`. Commands run on this Mac 2026-09-13 between 01:45 and 02:02 CDT. Spike code: `/Users/david/repos/spikes/opensilver-ide/hello/` (outside the repo). Evidence in the repo under `evidence/`: `phase-2-pane-log.txt` (the app's own log of the auto run), `phase-2-fernhill.tests.written.json` (the document the surface posted back), `phase-2-testing-pane.png`, `phase-2-docs-pane.png`.

**Test story**: fernhill (`branch-stories/fernhill`), the one story David named for this evaluation (2026-09-13). Its already-built bundle `dist/web/fernhill/` was served unmodified; its `.story`, `.tests.json`, and folder were read and never written (`git status --short branch-stories/fernhill` is empty after every run). Everything the spike writes goes to `/Users/david/repos/spikes/opensilver-ide/out/`.

**Outcome: PASS.** All three panes load real bundles inside the OpenSilver Photino app over custom-scheme origins; the Testing pane completes the full ADR-307 round trip (tree document in → replay through the real client → typed turn → whole document out, written by the host); the Play pane accepts typed input; the Docs pane boots its corpus. Two-way messaging and script injection are proven. One host-shape difference from WebKit is recorded in §4, and the browser (WASM) target's gap is named in §6.

## 1. How a third host satisfies D3 — the design that was tried

The macOS app serves each pane over a custom scheme (`sharpee-play://app/…`, `sharpee-docs://app/…`) from a `WKURLSchemeHandler`, injects `WKUserScript`s (a console hook, a boot payload at document start, an asset loader at document end), and receives `window.webkit.messageHandlers.<name>.postMessage(...)` from the page. Three things replace those here, and all three are **host-neutral** — they are the OpenSilver page's own JavaScript plus a pure C# resolver, so they would be the same under MAUI Hybrid or any other OpenSilver host:

| macOS mechanism | This spike |
|---|---|
| `WKURLSchemeHandler` per scheme | `Hello/Hosting/PaneServer.cs`: `Resolve(scheme, url) → (status, contentType, bytes)`. The Photino launcher registers it with `RegisterCustomSchemeHandler("sharpee-play", …)` and `("sharpee-docs", …)` — Photino's delegate is `Stream (sender, scheme, url, out contentType)`, satisfied by a `MemoryStream` over the resolved bytes. Same reserved prefix `ide-testing-surface/` for the surface's own assets, same MIME table. |
| `WKUserScript` at document start / end | **Serve-time injection**: `index-testing.html` gets `<script>` (host shim + boot payload) inserted right after `<head>` and the asset loader before `</body>`; `index.html` (Play) gets the shim only; the docs `index.html` gets the shim and a loaded-probe. The page's own scripts have not run yet when the `<head>` script executes, which is what document-start injection guarantees. |
| `window.webkit.messageHandlers.X.postMessage(body)` → `WKScriptMessageHandler` | The shim defines the same-shaped `window.webkit.messageHandlers` object whose `postMessage` forwards `{sharpee:{handler, body}}` to the **parent frame** with `window.parent.postMessage`. `Hello/Hosting/PaneBridge.cs` installs one `message` listener on the OpenSilver page that hands `(handler, body)` to C# through `OpenSilver.Interop.ExecuteJavaScript(..., (Action<string,string>)callback)`. |
| `evaluateJavaScript` into the page | `PaneBridge.Send(iframeId, json)` posts into the iframe; the shim handles `deliver` (a turn record for the surface), `type` (a command into `#command-input` plus a synthetic Enter, exactly how the surface's own replay driver types), and `eval` (the one door in, answering on `evalResult`). |

The pane itself is an `<iframe>` inside an OpenSilver `HtmlPresenter` (`CSHTML5.Native.Html.Controls`), sized by the XAML grid row it sits in.

## 2. The auto run — from `evidence/phase-2-pane-log.txt`

`dotnet run -- --auto2` loads the Testing pane with fernhill's real tree document (31 cards, seed 42) injected, waits for the replay to settle, types one new command, then loads Play and Docs:

```
[   0.059s] pane: loading testing ← sharpee-play://app/index-testing.html
[   0.185s] pane ← turnEvents #1: {"turn":1,"command":"look","output":"Iron Gates\nThe cab is already grinding away …
   … 28 more, one per replayed line, ~16 ms apart …
[   0.702s] pane ← turnEvents #30: {"turn":30,"command":"south","output":"Iron Gates\nWrought-iron gates stand open …
[   0.717s] pane ← testingSurface: {"forkBoot":true}
[   0.717s] pane ← turnEvents #31: {"turn":31,"command":"restart", …
[   2.574s] pane ← eval: {"id":0,"result":"{\"shim\":{\"strategy\":\"assign\",\"installed\":true}, … \"surface\":\"object\",\"session\":true}"}
[  15.727s] pane ← testingSurface state #1: {"state":{"active":0,"dialogs":[],"collapsed":[]}}
[  15.736s] testing pane: replay settled — 31 turn records delivered, 1 state post(s), 0 document post(s)
[  15.737s] pane → {"type":"type","command":"inventory"}
[  15.742s] pane ← turnEvents #32: {"turn":32,"command":"inventory", …
[  15.758s] pane ← testingSurface document #1: 21412 chars → /Users/david/repos/spikes/opensilver-ide/out/fernhill.tests.json
[  15.758s] pane ← testingSurface state #2: {"state":{"active":0,"dialogs":[],"collapsed":[]}}
[  15.839s] testing pane: document posted after a typed turn (1 new record(s))
[  16.843s] pane: loading play ← sharpee-play://app/index.html
[  16.895s] pane ← turnEvents #1: {"turn":1,"command":"look", …          ← the boot look
[  16.943s] pane → {"type":"type","command":"look"}
[  17.044s] play pane: typed 'look', turn record #2 arrived
[  17.055s] pane ← eval: {"id":2,"result":9}                             ← [data-turn] anchors in the page
[  18.048s] pane: loading docs ← sharpee-docs://app/index.html
[  18.079s] pane ← docsTab: {"type":"shown","href":"/chord-writer"}
[  18.082s] pane ← docsTab: {"type":"ready"}
[  18.879s] pane ← docsTab: {"type":"loaded","title":"Sharpee — Documentation","navLinks":106,"version":"Chord 3.6.0"}
[  21.050s] auto: phase 2 done
```

Launcher stdout for the same run: **61 pane requests, all HTTP 200** (`grep '^\[pane\]' … | awk '{print $2}' | sort | uniq -c` → `61 200`), across `game.js`, the engine CSS, the story CSS, theme assets, `ide-testing-surface/surface.js` (122,545 bytes) and `surface.css`, `docs.js`, `docs-index.json` (263,344 bytes), and the pages.

**Zero document posts during replay is correct behavior, not a gap**: the surface posts the document only when `model.serialize()` differs from the injected text (`tools/ide/web/testing-surface/src/main.ts:419-422`), and a faithful replay leaves it unchanged. The typed `inventory` is what changes the tree and triggers the write.

### The written document — `evidence/phase-2-fernhill.tests.written.json`

```
original: cards=31 seed=42 story=fernhill version=1
written : cards=32 seed=42 story=fernhill version=1
new card: {"command": "inventory", "skip": true, "type": "turn"}
```

Five of the original 31 cards are not byte-identical: the surface renumbers `branch` ids on re-serialization (1→6, 2→7, …) and emits keys in its own order; content, commands, and assertions are unchanged. That is the surface's serialization, identical under the macOS host — it is not a host artifact.

### Screenshots

- `phase-2-testing-pane.png` — the surface's card UI inside the OpenSilver window after replay: the opening card with its assertion buttons (Not contains · Exact · State · Event · Channel), the `TEST RUN` column listing `opening-iron-gates`, `gravel-drive · north`, … with `not run yet`, and the Run button.
- `phase-2-docs-pane.png` — the Documentation tab inside the OpenSilver window: search field, nav (Chord Writer › Getting Started › Overview …), the "Chord Writer" page, `Chord 3.6.0` in the version slot.

## 3. Deliverable check against the plan

| Plan deliverable | Result |
|---|---|
| Play pane: the story's `dist/web/<id>/` bundle unmodified | fernhill's bundle served as built; the client booted, rendered 9 `[data-turn]` anchors, accepted a typed `look`, and posted turn records |
| At least one IDE-owned pane | Both: `testing-surface` (surface.js/css from the IDE's checked-in Resources) and `docs-tab` (106 nav links, corpus index fetched over the custom origin) |
| Two-way messaging for the Testing pane's round trip | 31 records in (replay), 1 typed turn, whole document out, state sidecar out — all through the shim → parent → C# path and back through `Send` |
| Script injection | Boot payload and asset loader injected at serve time; the eval probe confirms `__SHARPEE_TESTING_SESSION__` and the deliver shim were present before the client ran |
| Custom origin vs localhost | **Custom scheme works** on this host, including inside an iframe whose parent is Photino's `file://` page (Photino's macOS native links `WebKit.framework` and uses `setURLSchemeHandler:forURLScheme:`). Not tried: a localhost origin; unnecessary here |

## 4. One host-shape finding: `window.webkit` in a WKWebView

First run: the shim assigned `window.webkit.messageHandlers = {…}` and nothing arrived — zero turn records, and the docs probe failed with `undefined is not an object (evaluating 'window.webkit.messageHandlers.docsTab.postMessage')`. In a WKWebView the native `window.webkit.messageHandlers` is a read-only host object (Photino registers its own script message handler, so it exists), and the assignment was silently ignored. Replacing the whole `window.webkit` object works (`Object.defineProperty` threw; plain `window.webkit = {messageHandlers: …}` took — the probe reports `strategy: "assign", installed: true`).

What this says about D3: the client (`packages/platform-browser/src/turn-events.ts:156-159`, `:224`) and the surface (`main.ts:403-404`) detect the host by the **WebKit-specific shape** `window.webkit.messageHandlers.<name>`. A non-WebKit host (WebView2 on Windows, or this iframe-in-a-page host) has to counterfeit that shape. It works, but D3's host-contract module, when it is extracted, should own the post door so panes stop naming WebKit. This is the same finding the WPF spike's WebView2 case would have produced; the OpenSilver evaluation just reached it first.

## 5. Real-file tests — `Hello.Host.Tests/PaneServerTests.cs`

Against fernhill's real bundle and the IDE's real pane assets (no fixtures):

| Test | Asserts on |
|---|---|
| serves the story's index.html with the shim injected after `<head>` | 200, `text/html`, body contains the shim marker before `game.js` |
| serves index-testing.html with shim + boot session + asset loader | 200; the injected session JSON and the `ide-testing-surface/surface.js` loader both present; the original page's `__SHARPEE_AUTHOR_CHANNELS__` line preserved |
| serves the surface's own assets under the reserved prefix | `surface.js` 200 with the IDE's file length; `surface.css` `text/css` |
| serves docs index and corpus | 200 for `index.html` and `docs-index.json` |
| refuses path traversal and unknown files | 404 for `../fernhill.story`, `nope.js`, and an unknown scheme |
| `RelativePath` strips scheme/host/query | `sharpee-play://app/a/b.css?x=1#y` → `a/b.css`; bare host → `index.html` |

```
dotnet test Hello.Host.Tests
  → (recorded in the session file after the run)
```

## 6. Owned gaps and what this phase does not establish

- **Browser (WASM) target**: there is no custom-scheme origin to serve from inside a browser tab, so `LoadPane` logs the gap and does nothing there. The panes would need an HTTP origin (the dev server, or static hosting beside the app) and the same iframe + shim; the messaging half (`PaneBridge`) is already host-neutral. Owned gap, not a kill: the browser tier is ADR-191's, outside ADR-341's scope.
- **Windows**: not run. Photino hosts WebView2 there; custom schemes are Photino-registered the same way. Phase 6.
- **Not judged**: how the panes *feel* — theming, focus handling between the XAML chrome and the iframe, keyboard routing. Those belong with Phase 3/4's editor and appearance work.
- **Not built**: the Play header (status dot, Restart, theme picker) and error symbolication — plumbing rows in the parity table, not hosting questions.
