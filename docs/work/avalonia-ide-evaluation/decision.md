# Avalonia + Velopack for Chord Writer — the evaluation's decision record

**This is a recommendation, not a decision.** ADR-341 D2's toolkit ruling (WPF, David, 2026-09-12) stands until David rules otherwise, and the OpenSilver record's own recommendation is held rather than withdrawn. What this record adds is a third body of evidence, a per-control comparison across all three spikes, and a recommendation with its grounds in weighted order and the counter-case written out. The decision is David's, and §9 names what he is being asked to rule on.

**Written**: 2026-09-14, session 3b49f8, on `main`. **Sources**: `plan.md`, `phase-0-prerequisites.md` through `phase-5-velopack-packaging.md`, `parity-table.md` (this directory), `docs/work/opensilver-ide-evaluation/decision.md` (the OpenSilver record), `docs/work/archive/adr-341-spike/decision.md` (the WPF record), and `docs/work/web-chord-writer/options-20260913-web-app-shapes.md` §6 (the judging frame). Spike code outside the repository at `/Users/david/repos/spikes/avalonia-ide/`. All Phase 0–5 evidence was gathered 2026-09-14 between 04:51 and 06:11 CDT (session 356d47) on this Mac:

```
dotnet test          (pane/PaneHost.Tests)
  → Passed!  - Failed: 0, Passed: 20, Skipped: 0, Total: 20, Duration: 2 s
```

**What was evaluated**: Avalonia 12.1.2 (XAML + C#) on .NET 10.0.300, with `Avalonia.Controls.WebView` 12.1.0, `Avalonia.AvaloniaEdit` 12.0.0 and Velopack `vpk` 1.2.0 — a plain .NET process and a native window whose entire UI is drawn by Avalonia's own Skia renderer. No web view carries any part of the chrome; web views appear only as the three D3 panes, where the shipping Mac app also uses them. **Windows has not run** (plan Phase 7, pending machine time). Every result below is macOS evidence about a cross-platform toolkit, and the Windows column of this record is **pending**, exactly as the OpenSilver record carried its own Phase 6 as a stated condition rather than waiting on it.

---

## 1. Per-control results — three spikes side by side

The WPF and OpenSilver columns are copied from `opensilver-ide-evaluation/decision.md` §1 unchanged. The Avalonia column is this evaluation's. All three editor measurements are on the same 1755-line story file, and they are not the same work — §3 says why.

| Spike item | WPF (2026-09-12) | OpenSilver on Photino (2026-09-13) | Avalonia (2026-09-14) | Discriminates? |
| --- | --- | --- | --- | --- |
| **Native capability: subprocess with streamed stdout, real `Documents\<Story Title>\`, vendored Node** | Native by construction (not spiked; MSIX check proved it under packaging) | **PASS** — `System.Diagnostics.Process` and `System.IO`, the identical calls: `compose --json` exit 0 in 89 ms, `build` 106 lines streamed with distinct timestamps, Documents write → independent read → MATCH, vendored `node --version` → `v22.23.1`. Nine real-path tests, no stubs. | **PASS, first run, in code that names Avalonia nowhere** — the same nine real-path tests: vendored `node` → `v22.23.1` with stderr empty; `compose --json` → `schemaVersion` 2, zero diagnostics, non-empty `ir.meta.title`; streamed lines proven non-batched (≥ 600 ms spread across three ticks *and* first-to-exit); cancellation proven by `OperationCanceledException` **and** `ps` no longer listing the sentinel; Documents write → independent read → MATCH; missing-directory write refused with `DirectoryNotFoundException`. Then proven again **from inside the packaged `.app`**. | **No — level, and now three-way.** The capability question that opened this track is closed for every shape. |
| **Editor — external tokenizer** | PASS — AvalonEdit + tree-sitter through `IHighlighter` | **PASS** — CodeMirror 6 in an `HtmlPresenter` iframe, tokens from the **compiler's own lexer** (`packages/chord/src/lexer.ts`, bundled) | **PASS** — AvaloniaEdit's `TextEditor`, **natively drawn**, tokens from the **compiler's own lexer** over an NDJSON service under the vendored Node (the `@sharpee/bridge` idiom, ADR-135). No C# port written. | **Yes — Avalonia.** It is the only shape that is *both* a native editor and driven by the real grammar. WPF is native with tree-sitter; OpenSilver has the real grammar in a web editor. |
| Editor — highlight correctness | PASS (both palettes) | PASS (both palettes, screenshots) | PASS (dark; `evidence/phase-3-editor.png`). **The light palette is a known gap** — `ChordColorizer` holds its own brush constants instead of the theme tokens, so syntax colours do not flip. A spike wiring gap, not a framework limit. | Slightly — OpenSilver/WPF proved both palettes; this proved one and named the one-edit fix |
| Style pass, 1755-line file | 14.8–15.9 ms per keystroke (tree-sitter parse + whole-document query) | **0.92 ms per pass** (lexer + decoration build); 1.09 ms per typed character all-in | **7.96 ms per pass**; **7.41 ms per typed character** all-in (median 7.50, p90 9.77). Attributed: **0.49 ms is the lexer**, 3.93 ms an unoptimized JSON bridge, 3.86 ms an unoptimized whole-document C# index rebuild — AvaloniaEdit's own drawing is nowhere in the number. | **Against WPF: yes, Avalonia** — half the cost, and carrying the real grammar rather than tree-sitter. **Against OpenSilver: not comparable as a verdict** — the 7 ms gap is transport and indexing, both deliberately left naive, not rendering. |
| Editor — programmatic undoable replace, span select and scroll-to, gutter, wrap | PASS | PASS — replace then undo restores the exact pre-edit hash; `select` 897:8–897:30; gutter per visual line; wrap live | PASS — replace then `Undo()` restores the exact pre-edit hash (`72cd60f0` MATCH); `select` 897:8–897:30 → the identical text; `ShowLineNumbers` with two margins; `WordWrap` live, no reload | No — all three |
| Editor — felt | Declined by David | **Open** — three hands-on passes produced functional notes, none about typing feel | **Open, and it is the one that matters most here** — the plan reserves it to David explicitly and it is not inferable from 7.41 ms. The window exists and can be typed into. | Not measured on any side |
| **Custom drawing** (tab strip, tab bar, World map, project pane) | PASS — **immediate mode**, `OnRender` + `DrawingContext` | PASS — **retained composition**: `Border`/`Grid`/`TextBlock`/`Shapes` rendered to DOM/SVG; no `OnRender`. ~500 lines across four surfaces. `HtmlPresenter` + `<canvas>` as an unused escape hatch | **PASS — immediate mode, WPF's contract, measured rather than read off documentation.** One `Render` per invalidation and never more; **zero** while idle over eight frame waits; re-entered on invalidation at all, which a retained tree cannot do. **453 lines across four surfaces and their base** — the same order as OpenSilver's ~500, but `WorldMapView.Draw` is `WorldMapView.swift`'s `draw(_:)` transliterated rather than re-architected. | **Yes — WPF *and* Avalonia, against OpenSilver.** This is the ground David named in D2, and it is the row where the two native-rendering shapes separate from the web-rendered one. |
| **Appearance, ADR-297 tokens, live flip** | PASS — free via `{DynamicResource}` | **PASS — free**: one `SolidColorBrush` per token, `Color` mutated, DOM rail `rgb(220,224,232)` → `rgb(22,23,29)` with no rebuild, `Apply()` 0.9 ms | **PASS — free, and verified at the pixel**: 22 tokens, `Apply` **0.06 ms**, `RightTabs pixel(200,20)` `#DCE0E8` → `#16171D` read off an offscreen `RenderTargetBitmap`, with **zero `Render` calls**. | No — level; **and see §2**, because the OpenSilver record predicted this row would cost immediate mode a re-record per surface, and it does not. |
| Title bar follows appearance | FAIL without `DwmSetWindowAttribute` | Not attempted — Photino exposes no title-bar API; the title lives in an in-content band | Not attempted; the title lives in the same in-content band. Unlike Photino, **the record does not establish whether a transparent-titlebar route exists** — it was simply not tried. | No — all three need OS-specific work or a different shape |
| **Web-pane hosting** (D3's three panes) | PASS — WebView2 resource hook, one WebView2 per pane | **PASS** — iframes over Photino custom schemes; Play, Testing (full ADR-307 round trip + Run), Docs (106 nav links) all from unmodified checked-in assets; 61 requests, all 200 | **PASS on outcome, FAIL on the mechanism.** There is no response-supply and no scheme-handler door on the macOS backend at all: `WebResourceRequestedEventArgs` carries `Request` only; `SetResponse`/`AddWebResourceRequestedFilter`/`SetVirtualHostNameToFolderMapping` are internal Windows COM interop across all 900 assembly types; `setURLSchemeHandler:forURLScheme:` is unbound. Answered instead over a **token-scoped loopback origin** (`http://127.0.0.1:49700/<token>/`): all three panes unmodified, 22 × 200 + 1 × 403, full ADR-307 round trip, 31 → 32 cards. | **Yes — WPF and OpenSilver**, on the door. One web view per pane is a better shape than OpenSilver's iframes-in-one-page; a loopback origin is a worse door than either custom-scheme route. §4. |
| Project tree | PASS (WPF `TreeView`) | **partial** — grouped list, no expand/collapse or keyboard navigation (OpenSilver has a `TreeView`, not used) | **partial** — the same five typed groups, **drawn** rather than composed: a painted list, no expand/collapse, no keyboard navigation, no Assets recursion. Avalonia ships a `TreeView`; not used. | Not measured to the same depth on any side |
| Menu bar | Stock `Menu` | **Hand-built** — OpenSilver 3.3.3 ships no `Menu` control; Photino no native menu | **`NativeMenu` in the real macOS menu bar** — File (⌘N, ⌘O, ⌘S) and Story (⌘B, ⌘U), two of seven menus built, the mechanism the platform's own | **Yes — WPF and Avalonia**, against OpenSilver |
| Threading model | `DispatcherSynchronizationContext` | **No `SynchronizationContext`**: code after `await` resumes off the UI thread; every UI touch through `Dispatcher.BeginInvoke` (a real bug found and fixed) | **Not probed as such.** The one threading fact on record: rendering happens on the render thread, so a counter read synchronously reads a frame that has not been presented — the first drawing-model probe read all zeros for exactly that reason (Phase 4 §2). | Not established for Avalonia; do not read the blank as a pass |
| Media over the pane origin | WebView2 hook can answer `Range` | Photino's scheme delegate returns a bare stream: `<audio>` fails; worked around with `data:` URLs | **Works — and had to be suppressed.** The origin is a real `HttpListener` over real HTTP, and fernhill's ambience played aloud over it until `HTMLMediaElement.prototype.play` and `window.Audio` were stubbed alongside `AudioContext` (23 requests with the stubs, 93 without). `Range` is an implementation choice here, not a host limit. | **Yes — Avalonia**, over OpenSilver |
| **Packaging, signing, and the update channel** *(new row; D7's question, spiked only for WPF before)* | MSIX + appinstaller checked under packaging; the D7 choice left open | **Not re-checked under Photino** — a self-contained single-file publish exists, nothing beyond it | **Split: the update channel is the best result in the record, the signing is the worst.** `vpk pack` produces a 99.8 MB full package, a portable zip and a `Setup.pkg` in 34.5 s, with the toolchain riding inside the bundle and running from there; a **1.0.0 → 1.0.1 delta is 8.11 MB**. But `vpk` **cannot seal the macOS bundle**: its bundler puts the whole publish output — data files and the 175 MB toolchain — flat into `Contents/MacOS/`, which `codesign` refuses, and **no `vpk` flag can move a file out of that directory**. Four signing routes, one wall. Notarization never reachable; nothing submitted to Apple. | **Yes — both ways.** Velopack wins the channel outright and loses the seal outright. §5. |
| Working set | 105 MB | Not measured | Not measured | Not measured |
| Project scaffolding | `dotnet new wpf` | `dotnet new opensilverapp --usePhotino`; two-second desktop build; `wasm-tools` workload only for the browser target | `dotnet new install Avalonia.Templates::12.1.2` then `dotnet new avalonia.app`; `net10.0` out of the box, `Build succeeded. 0 Warning(s) 0 Error(s)` in 1.34 s, and 0.79 s again with both WebView and AvaloniaEdit added | No |
| **Platforms reached by the one codebase** | Windows | **Windows, macOS, Linux** (Photino natives for all six RIDs, built and run on macOS here) **and the browser** (built and run, panes need an HTTP origin) | **Windows, macOS, Linux** by the toolkit's construction — **only macOS was built and run here**. No browser head was built (optional for this product; §6). | **Tie — OpenSilver and Avalonia**, against WPF. This is the row the whole track turns on, and the two cross-platform shapes now both hold it. |

**Read the table honestly.** The OpenSilver record's summary was that every control-level row that discriminates favoured WPF, and the one row that favoured OpenSilver was strategic. That is no longer the shape of it. Avalonia holds the strategic row **and** the control-level rows — drawing model, native menu, native editor, media — and adds one the other two did not have: a measured cross-platform update channel. What it does not hold is D3's door, the macOS bundle seal, and anything at all on Windows.

## 2. A prediction the OpenSilver record got wrong, corrected

`opensilver-ide-evaluation/decision.md` reasoned that retained composition buys the ADR-297 flip for free while immediate mode pays for it — that under WPF "the same flip means invalidating every `OnRender` surface." **That is wrong for Avalonia, and the correction matters because it removes the one cost that was supposed to offset the drawing-model win.**

Avalonia gets both. `Apply(22 tokens)` mutates one shared `SolidColorBrush.Color` per token in 0.06 ms, the pixels change (`#DCE0E8` → `#16171D`, read off an offscreen bitmap), and the drawn surfaces record **zero** `Render` calls. The recorded draw operations hold the brush **by reference**, so the compositor re-reads the colour without re-entering `Draw`. Immediate-mode recording and a free theme flip are not in tension the way that record assumed.

The correction is stated here rather than carried forward silently because the earlier reasoning would otherwise survive into any ADR written from these records.

## 3. The editor, and what "one grammar" costs on each shape

All three spikes measured a whole-document style pass on the same 1755-line file, and the three numbers measure three different things:

- **WPF, 14.8–15.9 ms** — tree-sitter parse plus a whole-document query, against a Chord grammar **that does not exist** (ADR-182 unimplemented since 2026-06-19).
- **OpenSilver, 0.92 ms** — the compiler's own lexer bundled into the page, in-process with the editor.
- **Avalonia, 7.96 ms** — the same compiler lexer, out-of-process under the vendored Node, of which **0.49 ms is the lexer**, 3.93 ms is JSON over a pipe and 3.86 ms is a C# index rebuild that walks every one of 8,545 tokens on every keystroke.

Both of Avalonia's costs are transport and bookkeeping, both were left naive so the number would be comparable in kind, and both are the first things a real implementation would attack (a binary frame; re-indexing only the changed line range). The honest statement for an ADR is *not* "AvaloniaEdit is eight times slower than CodeMirror" — AvaloniaEdit's drawing does not appear in the measurement at all.

What the row actually settles is ADR-341 D4. D4 specifies two *native* editors consuming one tree-sitter grammar. The OpenSilver shell satisfied "one grammar" by giving up "native". **Avalonia satisfies both**: a natively-drawn editor reading the compiler's own lexer, with no C# port of the grammar written. The qualification, stated plainly: the 41-word keyword list and 15-word property list live in `ChordColorizer` as they do in `SyntaxHighlighter.swift` — a third copy of a *display* list, not a third definition of the grammar. D4 would still be rewritten (one editor, one codebase, the compiler's lexer rather than tree-sitter), but rewritten toward what it was reaching for rather than away from it.

## 4. The kill question, answered both ways

The plan's kill question was whether `WebResourceRequested` lets the host supply a response — D3's contract. **The answer is no, and the answer is more definite than "undocumented".** Reflection over the loaded assembly at run time, printed by the probe itself: `WebResourceRequestedEventArgs` exposes `Request` and nothing else; `WebViewWebResourceRequest` exposes `Uri`, `Method`, `Headers`. No response, no deferral, no `Handled`. The four promising strings the options document found resolve, across all 900 types in the assembly, to internal **Windows** COM interop for WebView1/WebView2. On the macOS side `setURLSchemeHandler:forURLScheme:` is not bound at all, and `EnvironmentRequested` — the one pre-construction hook — exposes no configuration object to attach a handler to. Navigating `sharpee-play://` fails outright.

So O6 answers D3 over a **token-scoped loopback origin**, and it works completely: all three panes from their unmodified checked-in locations, both messaging directions (page → host through the *real* WebKit handler, captured before the shim counterfeits `window.webkit`; host → page through `InvokeScript`), and the full ADR-307 round trip writing a 32-card document back out.

Three things follow, and they should not be blurred together.

**A loopback origin is a genuinely weaker door than a custom scheme.** It binds a port, it needs a per-run token to keep other local processes out (proven: untokened requests get 403, and two origins reject each other's tokens), and it is a network listener on the author's machine where the other two shapes have none.

**It is also, in one respect, a better one.** It is real HTTP, so `Range` and media just work — which is exactly where Photino's bare-stream delegate failed. The evaluation discovered this by having fernhill's ambience play aloud over it.

**Windows could split the answer, and that is the risk to carry.** The COM interop that exists internally is WebView2's. If the WebView2 backend does expose a response-supply door where WKWebView does not, D3 is answered one way on Windows and another on macOS — which is precisely the outcome D3 exists to prevent. Phase 7 settles it.

## 5. Packaging: the best row and the worst row are the same row

> **Superseded in part by §13 (2026-09-16).** The worst row is gone: the bundle seals, signs, notarizes and staples, and Apple accepted it. The diagnosis below is intact — the verdict, the unpriced cost, and the open notarization question are not. Read §13 before quoting this section.

Velopack's delta channel is the concrete D7 answer this track has been missing. An 8.11 MB delta against a 99.8 MB application means a story-language fix ships as an 8 MB download for an app whose weight is a vendored Node toolchain that changes only when it is re-vendored. One channel, three OSes, deltas, and Azure Trusted Signing by flag on Windows (D7's signing ruling) — untested there, but that is what D7 asked for.

And it cannot sign the macOS bundle. Not for want of a flag: `vpk`'s bundler puts all 225 entries of the publish output — `PaneHost.deps.json`, `runtimeconfig.json`, satellite cultures, and the 175 MB `toolchain/` — flat into `Contents/MacOS/`, where Apple's rule says only the executable and code belong. `codesign` treats each as a nested code object, finds them unsignable, and refuses to seal. `--deep` dies in the vendored devkit's pnpm store (72 entries, 235 symlinks); `--signDisableDeep` wants a pre-signed payload; pre-signing 221 files still dies on `runtimeconfig.json`; hand-signing the packed bundle bottom-up dies in the same place. The end state is an executable carrying a valid Developer ID signature inside a bundle with no seal — signed-looking, not signed, and rejected by Gatekeeper.

**The honest cost to put against O6's packaging row is a bundle post-processing step Velopack does not provide**: move data and `toolchain/` to `Contents/Resources` (the layout the shipping IDE already uses and `bundled-node.entitlements` already names), fix the executable's probing paths, then sign per-binary so the vendored toolchain keeps the seal `vendor-toolchain.sh` gave it and `node` keeps its own entitlements. That is real work of unknown size, and it sits between this evaluation and a shippable macOS artifact. Because nothing could be sealed, **the notarization question the plan carried explicitly — `vpk --notaryProfile` versus this project's `notary-submit.py` REST route — is still open, and nothing was submitted to Apple.** — *Both clauses are now closed (§13): the route is `notary-submit.py`, and submission `cbcd0706-f65c-4f13-9460-e9be833044ca` was Accepted on the first attempt. The per-binary signing this paragraph prices turned out to be unnecessary.*

## 6. The four-way frame, filled

`options-20260913-web-app-shapes.md` §6's dimension table, with the Avalonia column now carrying evidence rather than expectation. **Bold** marks a cell this evaluation changed from what that table predicted.

| Dimension | Native (Swift / WPF) | OpenSilver on Photino | Web (O1/O2) — **still unspiked** | Avalonia + Velopack (O6) |
|---|---|---|---|---|
| Codebases to reach Win + mac + Linux | three (or two, Linux out of scope) | one | one, plus nothing to install | one — **macOS built and run; Windows and Linux not** |
| Author's files | real folder | real folder | real folder in Chromium; otherwise not | real folder — **proven: Documents write → independent read → MATCH, refusal case included** |
| Toolchain shipped | 165 MB vendored Node per arch | same | none (esbuild-wasm ~10 MB, lazy) | same — **175 MB, proven riding inside the packaged `.app` and running from there** |
| Install and update | app + Sparkle / installer + channel | same, minus a proven Windows path | a URL | **Velopack, measured: 99.8 MB full, 8.11 MB delta, `.pkg` + portable zip in 34.5 s — and the macOS bundle cannot be sealed, so nothing is notarized** |
| Rendering | native | DOM in a web view | DOM in the browser | Skia, the app's own controls — **no web view in the chrome, confirmed across the whole shell** |
| Drawing model | `drawRect:` / `OnRender` | retained elements | DOM | **`Render(DrawingContext)`, measured as WPF's contract: 1 per invalidation, 0 idle** |
| Editor | native control, hand-written lexer or tree-sitter | web editor over the compiler's lexer | same as OpenSilver | **native control over the compiler's own lexer — both, and the only shape that has both** |
| Web panes | WKWebView / WebView2 per pane | iframes in one page | the page itself | **`NativeWebView` per pane — but no response-supply door on macOS; served over a token-scoped loopback origin** |
| Offline | always | always | after first load (PWA) | always |
| Browser matrix | — | — | a product decision | — (**no browser head built; optional for this product**) |
| Hatched stories | full | full | wasm transpile or a tier boundary | full |
| macOS app | stays | stays until parity, then a felt call | a third product, or replaces | **rewritten from day one — unchanged, and now with two screenshots to judge it by** |
| Where the deciding risk sits | second codebase forever | thin host, unproven on Windows | folder access outside Chromium; "web app" expectations | **the macOS bundle seal, Windows entirely, and whether a Skia-rendered Mac app is acceptable** — the pane-hosting risk is resolved, not by the mechanism but by a working substitute |

## 7. Recommendation

**Recommend Avalonia + Velopack as the shape to carry forward for Chord Writer — one codebase for Windows, macOS and Linux, natively rendered — conditional on three things that are not decoration: Phase 7 on Windows, a solved macOS bundle layout, and David's felt comparison of the whole shell, which for this shape is not deferrable. Between the three shapes that now have evidence, this is the recommendation; against the pure web application, which still has none, it is provisional.**

Grounds, in order of weight:

1. **It is the first shape that holds the strategic row and the control-level rows at the same time.** The OpenSilver record's whole shape was "one codebase, at the price of web rendering and the drawing model David named." Avalonia removes the price. One codebase reaches three desktop OSes; `Render(DrawingContext)` is measured as WPF's contract, not read off documentation; `WorldMapView.Draw` is the Swift `draw(_:)` transliterated, so the macOS app's many `drawRect:` surfaces port rather than being re-architected; the menu bar is the platform's own. The counter-case the OpenSilver record wrote against itself — *"if what is attractive is one codebase and what is unattractive is web rendering, Avalonia is the candidate that offers the first without the second"* — has now been tested and holds.
2. **The editor answers D4 rather than rewriting around it.** A natively-drawn editor reading the compiler's own lexer, no C# port of the grammar, with the two costs separating it from CodeMirror attributed to an unoptimized pipe and an unoptimized index rather than to rendering. This is the alignment obligation `docs/core-concepts` names — platform and language fitting together — satisfied without giving up the native control.
3. **Capability parity is total, unbridged, and proven from inside the shipped bundle.** Twenty real-path tests with no stubs, in host code that does not reference Avalonia anywhere; then the whole shell run again out of the packaged `.app` with the sealed toolchain working from `Contents/MacOS/toolchain`. Where OpenSilver needed a desktop host to escape the browser sandbox and get these primitives back, Avalonia's desktop head never left .NET.
4. **Velopack gives D7 a real answer on three OSes at once.** An 8.11 MB delta against a 99.8 MB app, one channel, Azure Trusted Signing by flag on Windows. D7's open choice was MSIX-with-appinstaller versus a conventional installer plus an updater; this is the second option, measured, and on macOS it would replace Sparkle.
5. **Dependency health is the best of the three shapes.** Avalonia 31,501★ MIT pushed within hours of the check; AvaloniaEdit MIT with a `net10.0` NuGet package that builds clean against 12.1.2 (the release-tag lag was an artifact); Velopack 2,328★ MIT pushed the day before. Against OpenSilver's chain, whose thinnest link (`photino.Native`, 181★) had been quiet six months.

**The conditions, stated as conditions.** Windows is the target platform and has not run — the WebView2 backend, `Setup.exe` with Trusted Signing, and the vendored toolchain's Windows launcher (the shim is a POSIX script) are all untested, and a Windows-only response-supply door would split D3's answer by platform. The macOS bundle cannot currently be sealed or notarized, and the fix is unpriced work outside Velopack. *(Both conditions have since been discharged: Windows in §12, the bundle layout in §13. **The felt comparison is the only one of the three still outstanding.**)* And the felt comparison is not a nicety here: Avalonia's value is one codebase, which means the AppKit app is rewritten from day one, so "does a Skia-rendered Chord Writer feel right on this Mac" is load-bearing in a way it was not for a Windows-only shape.

## 8. The strongest case against that recommendation

**The Mac app is rewritten from day one, and this is the most expensive sentence in the record.** OpenSilver at least allowed "keep the Swift app as reference until parity, decide later on a felt comparison." Avalonia's entire value proposition is one codebase; a Skia-rendered Mac app beside a shipping AppKit one is two codebases with none of the benefit. So the highest-stakes step — retiring 18,921 lines of Swift and an app that ships at 1.4.0 — is not deferrable the way it was last week. If David is not prepared to answer that question now, the recommendation is not actionable now.

**The macOS packaging wall is real, structural, and unpriced.** Four routes, one cause, no flag that fixes it. Everything else in this record was measured to a number; this one ends in "a bundle post-processing step of unknown size." A shape that cannot currently produce a notarized `.app` has not proven it can ship on the platform where the product already ships.

**D3's door is worse than both other shapes', and it is a listener on the author's machine.** A token-scoped loopback origin is a workaround, however well it works. The token discipline is proven, but "the IDE opens a local HTTP port" is a different security conversation from "the IDE registers a custom scheme," and it is one the other two shapes never have to have.

**The replay over-run is unexplained, and it is in the ADR-307 path.** 274 turn records and 12 `forkBoot`s where OpenSilver saw 31 and 1 — same document, same surface, with relay ordering, boot payload, persisted state and client double-delivery each ruled out. The final document is correct; nobody knows why the path is not. That is an unknown sitting inside the Testing surface, which is a product differentiator, not a side feature.

**The shell is thinner than the OpenSilver spike's, so the columns are not equally far along.** Four right-panel tabs against eight; no Index, no Reach, no Incomplete, no compose scheduler, no test relay, no auto-indent. None of those look hard on this toolkit and several have their primitives already proven — but "looks like the remaining work is ordinary" is an estimate, and the OpenSilver column earned its cells.

**Windows is zero percent of this evidence.** Every number is macOS. The OpenSilver record carried the same gap and it was fair to call it a condition there; it is the same size gap here.

**And the fourth shape still has no spike.** David's direction on 2026-09-13 was to evaluate a pure web application against the others. It answers a different question — "can a browser be the IDE," with nothing installed — and nothing in this record bears on it. Recommending Avalonia over native and OpenSilver is supported; recommending it over O1/O2 is not, because O1/O2 has no evidence to be recommended over.

## 9. What would change the recommendation

- **If Phase 7 finds a Windows capability gap** — a WebView2 response-supply door that makes D3's answer platform-dependent, a toolchain launcher that cannot be made to work, or a `Setup.exe` signing failure — the recommendation is void at that gap and the record states the kill.
- **If the macOS bundle layout turns out to need more than post-processing** — if the executable cannot be made to probe `Contents/Resources`, or Velopack's layout is not patchable around — then O6 cannot ship on macOS, and it collapses to "a better WPF for Windows," which is a much smaller claim.
- **If the felt comparison of the whole shell comes back wrong** — this is the one condition no amount of further spiking answers. Two screenshots exist for exactly this (`evidence/phase-4-shell-dark.png`, `phase-4-shell-light.png`), and the editor can be typed into.
- **If the pure web application spikes well** — the field is four shapes, not three, and this record's §7 is explicitly provisional against it.
- **If David rules that the macOS app is not to be replaced at all** — O6 loses its reason to exist over WPF, and the decision returns to WPF-versus-OpenSilver for Windows, where the OpenSilver record already stands.

## 10. Dependency health at write time (2026-09-14, `gh api` and `api.nuget.org`)

| Repository / package | Stars | Last push | Latest | License | Read |
| --- | --- | --- | --- | --- | --- |
| `AvaloniaUI/Avalonia` | 31,501 | 2026-09-14T09:36:04Z | 12.1.2 (2026-09-02) | MIT | Active; pushed within hours of the check |
| `AvaloniaUI/AvaloniaEdit` | 1,131 | 2026-08-28T11:43:15Z | tag 11.4.1; **NuGet `Avalonia.AvaloniaEdit` 12.0.0** (2026-04-08) | MIT | The release-tag lag is an artifact: 12.0.0 declares a `net10.0` group and a floor of Avalonia 12.0.0, and builds clean against 12.1.2 with zero warnings |
| `velopack/velopack` | 2,328 | 2026-09-13T21:12:37Z | 1.2.0 (2026-06-03) | MIT | Active. Only 1.2.0 was tried; whether the macOS layout problem is version-specific is untested |
| `Avalonia.Controls.WebView` (NuGet) | — | — | 12.1.0 | MIT (nuspec) | No 12.1.1/12.1.2 build exists; this is the version the evaluation ran |
| Avalonia commercial tiers | — | — | — | — | Free MIT framework covers everything used here; the Pro tier's Rich Text Editor, Tree Data Grid and Markdown Viewer are not required |

## 11. Owed regardless of the ruling

- **Phase 7** — the Windows run, for this shape and in principle for all of them; its addendum folds back into this record. **DONE — §12.**
- **The macOS bundle layout** — the post-processing step §5 describes, before any O6 artifact can be notarized. Unpriced. **DONE and priced — §13**: two scripts, 45 lines, one ordering constraint, and a notarized artifact Apple accepted. What replaces it on this list is narrower: the `tools/ide/` integration, the x86_64 slice, and GH #474.
- **The replay over-run** (Phase 1 §5) — first thing to resume on if Phase 1 reopens.
- **The editor's light palette** — `ChordColorizer` should read `ThemeTokens` rather than its own brush constants. One edit, and the light screenshot shows why.
- **`localStorage` across an app restart** — asked for by the plan, not exercised; the probe closes its window and does not relaunch.
- **GH #457** (vendored toolchain cannot build an out-of-repo story) — recurred identically here; a Chord Writer defect, open, platform change, discuss first.
- **GH #458** (the orphaned `~/Documents/OpenSilver Capability Check/` fixture) — read by Phase 2, not adopted; David's disposition, unchanged.
- **D3's contract module should own the post door** so panes stop naming `window.webkit` — true under every shape evaluated, and load-bearing under this one.
- **The felt sessions** — the whole shell against the shipping Mac app, and typing in the editor window. Both are David's, and §7's first condition is one of them.

---

## 12. Phase 7 addendum — confirmed on Windows, with one correction

**Added 2026-09-14, session 6c19b3.** Full record and evidence: `phase-7-windows-check.md`.
This is the "confirmed on Windows" addendum §11 said Phase 7 owed this record.

**The column confirms.** `PaneHost` built on Windows 11 (x64) with 0 warnings and 0 errors
against the same pins — Avalonia 12.1.2, `Avalonia.Controls.WebView` 12.1.0,
`Avalonia.AvaloniaEdit` 12.0.0, `vpk` 1.2.0 — on .NET SDK 10.0.401 rather than the pinned
10.0.300 (recorded as a deviation, not waved through). The WebView2 backend reports
`type=WebView2 engine=Blink version=153.0.4234.32`.

**The correction is in Avalonia's favour, and it moves an ADR-341 ruling.** §5 of this
record concluded from Phase 1 that there is no response-supply or custom-scheme door and
that the panes must be served over a token-scoped loopback origin. That conclusion is
**correct for macOS and wrong for Windows**:

- Avalonia's *own* API is Request-only on both platforms — the custom-scheme navigation
  fails identically here, so nothing about Avalonia's surface changed.
- But `NativeWebView.AdapterCreated` hands out a **public** `IWindowsWebView2PlatformHandle`
  carrying a live `CoreWebView2` pointer, which `QueryInterface`s clean for `ICoreWebView2`,
  `_2`, `_3` and `_22`.
- `ICoreWebView2_3::SetVirtualHostNameToFolderMapping` was **called for real** (`hr=0x0`) and
  a pane was served from `https://sharpee-panes.invalid/index.html` off a host-owned folder,
  **with no `HttpListener` in the process**.

So the loopback fallback is a macOS necessity, not an O6 necessity. Windows gets a stable,
port-free, token-free origin. **ADR-341 D3 therefore answers differently per platform**,
which is the specific outcome D3 exists to prevent — and it is a gap in Avalonia's
abstraction rather than in either platform. Whether a shipping implementation writes the
per-platform door behind one seam or standardizes on loopback for uniformity is a decision
this addendum does not make; D3's contract module is where it belongs.

**Velopack inverts too.** 0-for-1 on macOS (§5: the bundle cannot be sealed) becomes 1-for-1
here: `Setup.exe` at 56,446,248 bytes, a portable zip, a full nupkg, all in 8.4 seconds, and
a **working delta channel** — 72,533 bytes against a 51,984,680-byte full package.
`--azureTrustedSignFile` exists in `vpk` 1.2.0 and the code-sign step runs as its own phase.
Still owed: an actually-signed build (needs David's Azure Trusted Signing identity) and an
actual install run. Also learned: `vpk` hard-refuses to pack an app whose `Main` does not
call `VelopackApp.Build().Run()`, verified by assembly inspection.

**The real Windows gap is the toolchain, not the toolkit.** `tools/ide/vendor-toolchain.sh:298`
writes `bin/sharpee` as `#!/bin/sh`; the shim requires `$root/node/bin/node`
(`vendor-toolchain.sh:311`), a POSIX layout Windows Node does not use; and
`tools/ide/vendor/node/` holds only `darwin-arm64` and `darwin-x64` tarballs, so **there is
no Windows Node asset to vendor at all**. GH #448 sits downstream. This work is unpriced, on
the critical path, and would be identical under WPF — it is not an Avalonia cost.

**Not established here**: the play and testing panes (fernhill's browser bundle has never
been built on this clone, which is entangled with the toolchain gap above — the docs pane
did complete its round trip, 200 with 106 nav links and 3 posts), a signed installer, and any
install run.

---

## 13. Packaging addendum — the macOS bundle is sealed, signed, notarized and accepted

**Added 2026-09-16, session e923d3.** Full record: `docs/work/velopack-macos-bundle-layout/decision.md`,
over `evidence/phase-1-apphost-relocation.md`, `evidence/phase-2-update-apply.md` and
`evidence/phase3-signing-pre-notarization.txt` in that directory. This addendum exists because
**§5 and §11 of this record are now wrong in the reader's hands**: §5 concludes signing FAIL with
notarization unreachable, and §11 carries the bundle layout as "Unpriced." Both were accurate when
written and neither is accurate now.

**§5's diagnosis was right and its verdict is superseded.** The cause it identified — Velopack's
macOS bundler puts all 225 publish entries, the 175 MB toolchain included, flat into
`Contents/MacOS/`, and no `vpk` flag moves them — held up under direct re-test, and so did the
finding that no `vpk` version has grown a layout option (1.2.0 and prerelease 1.2.110-ge826545
carry identical `bundle`/`pack` option sets, with no upstream issue asking for one). What §5 was
missing was not a flag but a **fifth route**: the four it tried all patch `vpk`'s finished output,
and the one that works rearranges the payload **before** `vpk pack`.

**The recipe, in full.** `relocate.sh` (20 lines) moves the payload to `Contents/Resources`,
leaving `Contents/MacOS` holding only `PaneHost`, `UpdateMac` and the `sq.version` symlink that
upstream velopack/velopack#705 already puts there. `patch-apphost.py` (25 lines) rewrites the
AppHost's embedded app-path field — a fixed offset in the binary, 66088 in this one — from
`PaneHost.dll` to `../Resources/PaneHost.dll`. Then `vpk pack --packDir <the relocated .app>
--signAppIdentity <identity>`. The ordering is the load-bearing part: `vpk pack` accepts a
pre-built `.app` and passes its `Contents/` tree through unchanged, so the `.nupkg` carries the
relocated layout natively and no post-apply hook is needed, whereas feeding it an already-packed
relocated bundle collides on `sq.version` inside `OsxPackCommandRunner.PreprocessPackDir`, which
creates that symlink with `overwrite: false`.

Phase 1 also proved the harder version — post-processing `vpk`'s own finished output — works, with
a negative control that makes the AppHost patch load-bearing rather than incidental: the unpatched
binary on the relocated layout fails with `The application to execute does not exist:
…/Contents/MacOS/PaneHost.dll`.

**The seal holds without `--deep`**, which is the specific thing §5 could not get: `Sealed
Resources version=2 rules=13 files=9984` on the ad-hoc pass, `codesign --verify --deep --strict
--verbose=2` reporting `valid on disk` and `satisfies its Designated Requirement`. §5's terminal
error — *"code has no resources but signature indicates they must be present"* — does not recur.

**Velopack's update path survives the relocation at no measurable cost.** A full round trip
through the real `UpdateMac apply`: delta reconstruction in 4.45 s, 235 symlinks recreated, layout
intact, seal scan clean, app and bundled toolchain both running afterwards. Full package
99,908,968 bytes and delta 8,274,247 at 28.4 s pack time, against §5's flat-layout baseline of
99,829,165 / 8,114,592 at 34.5 s. One condition found and closed: applying a package built from an
**unsigned** app destroys the seal, which reproduces §5's failure exactly; packing with
`--signAppIdentity` puts `_CodeSignature` inside the `.nupkg` and the installed bundle stays
sealed, verified both post-apply and on a fresh install from the same package.

**The signing surprise is that the expensive plan was unnecessary.** The work budgeted for
reproducing `tools/ide/package.sh`'s per-binary approach (`sign_macho`, `assert_hardened`,
`assert_node_entitlements`) against the relocated payload. It was not needed: `vpk`'s own recursive
`codesign --deep` step finished in **2 seconds** on the relocated payload — precisely the route
that failed on the pnpm store in §5 — so there is no presign pass, no `--signDisableDeep`, and no
per-binary loop in the recipe. Developer ID Application: David Cornelson (RSNGKW5LNH), hardened
runtime on the bundle and all 20 Mach-O binaries, 20/20 Developer-ID signed. `vpk`'s default .NET
entitlement set also turns out to be byte-for-byte the five keys in
`tools/ide/bundled-node.entitlements`, so the app-versus-node entitlement split `package.sh` exists
to express is not needed for this bundle.

**Apple accepted it on the first submission.** Submitted through `tools/ide/notary-submit.py`
(the REST single-PUT route; `notarytool` crashes on upload on this machine): `Successfully uploaded
file`, id `cbcd0706-f65c-4f13-9460-e9be833044ca`, **Accepted**. Stapled, `stapler validate` clean,
and `spctl --assess --type execute -vv` reporting `accepted` / `source=Notarized Developer ID` /
`origin=Developer ID Application: David Cornelson (RSNGKW5LNH)` — against the pre-notarization
`rejected` / `Unnotarized Developer ID`, which was the correct state to be in at that moment. The
seal survives stapling and the bundled toolchain still answers `Sharpee 5.4.1 · Chord 3.6.0` from
inside the notarized bundle. Artifact shape: the `.app` zip, so §5's missing Developer ID Installer
certificate never became a dependency — the `.pkg` path is not on this route.

**So R15 is the row that moved.** §5's own framing was that packaging held the best row and the
worst row simultaneously; the worst half is gone. ADR-351's D2 had three conditions and this
discharges the second, leaving only the felt comparison. **The R15 score of 2 is David's and is
left as he set it** — this addendum reports that the evidence under it changed and says nothing
about what the cell should read, the same treatment the Phase 8 Linux evidence gets against R22.

**Still owed, and the list is shorter but not empty:**

- **The shipping integration is unpriced.** Everything above ran against `ChordWriterAvaloniaSpike`,
  a spike bundle. Folding the recipe into `tools/ide/` is real work that has not been scoped.
- **The x86_64 slice is unexercised.** Past releases signed and notarized it separately; nothing
  here touches it.
- **GH #474** — the Phase 4 shell probe reads every asset from absolute paths outside the bundle
  (`pane/PaneHost/Shell/ShellWindow.axaml.cs:34-38`), so it is a launch check and not evidence
  about the bundled toolchain. Filed during this work; Phase 1 wrote its own check rather than
  trusting it.
- **This record still has no Phase 8 addendum.** §12 folded Windows back in; the Linux check
  (2026-09-15, both architectures) never got the same treatment, and its evidence lives only in
  `phase-8-linux-check.md` and ADR-351's Consequences. Naming that here rather than filling it
  silently — a Linux addendum is a separate piece of writing with its own record to read.
- **A process finding that cost a session.** Phase 3 blocked on the App Store Connect Issuer UUID,
  recorded as living "only in the `dc-notary` keychain profile." It was committed in this
  repository the whole time, at `docs/work/archive/adr-279-chord-writer-packaging/plan.md:95`, and
  the keychain was never the route at all: notarytool stores that profile in the data-protection
  keychain, which the `security` CLI cannot read. Grep the repository before recording a credential
  as absent.
