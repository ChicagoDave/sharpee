# OpenSilver for Chord Writer — the evaluation's decision record

**This is a recommendation, not a decision.** ADR-341 D2's toolkit ruling (WPF, David, 2026-09-12) stands until David rules otherwise. What this record adds is evidence that did not exist when D2 was resolved, a per-control comparison against the WPF spike, and a recommendation with its grounds in weighted order and the counter-case written out. The decision is David's, and §7 names what he is being asked to rule on.

**Written**: 2026-09-13, session 5c6bba, on `main`. **Sources**: `plan.md`, `phase-0-prerequisites.md` through `phase-4-shell-and-appearance.md`, `parity-table.md` (this directory), and `docs/work/archive/adr-341-spike/decision.md` (the WPF record). Spike code outside the repository at `/Users/david/repos/spikes/opensilver-ide/`. All Phase 0–4 evidence was gathered 2026-09-13 between 01:10 and 08:39 CDT (session 30faa2) on this Mac; the host test suite was re-run for this record at 16:13 CDT the same day:

```
dotnet test Hello.Host.Tests/Hello.Host.Tests.csproj
  → Passed!  - Failed: 0, Passed: 15, Skipped: 0, Total: 15, Duration: 2 s
```

**What was evaluated**: OpenSilver 3.3.3 (XAML + C#) under its `OpenSilver.Photino` desktop host — a native .NET 10 process, a native OS window, the XAML rendered as DOM inside the OS web view (WKWebView here, WebView2 on Windows). Not Tauri, not Electron, not the browser (WASM) target, which was built once in Phase 0 and then left alone because it cannot spawn a process or read a project folder. **Windows has not run** (plan Phase 6, pending machine time); every result below is macOS evidence about a cross-platform host.

---

## 1. Per-control results — the WPF spike against the OpenSilver spike

The WPF column is copied from `adr-341-spike/decision.md` §1. Both spikes used a 1755-line story file for the editor measurement; the two measurements are different work (§3) and the row says so.

| Spike item | WPF (2026-09-12) | OpenSilver on Photino (2026-09-13) | Discriminates? |
| --- | --- | --- | --- |
| **Native capability: subprocess with streamed stdout, real `Documents\<Story Title>\`, vendored Node** | Native by construction (not spiked; MSIX check proved it under packaging) | **PASS** — `System.Diagnostics.Process` and `System.IO`, the identical calls: `compose --json` exit 0 in 89 ms, `build` 106 lines streamed with distinct timestamps, Documents write → independent read → MATCH, vendored `node --version` → `v22.23.1`. Nine real-path tests, no stubs. | **No — level.** The capability question that opened this evaluation is closed. |
| **Editor — external tokenizer** | PASS — AvalonEdit + tree-sitter through `IHighlighter` | **PASS** — CodeMirror 6 in an `HtmlPresenter` iframe, tokens from the **compiler's own lexer** (`packages/chord/src/lexer.ts`, bundled) | No — both drive a real external tokenizer. **Kind differs**: native control vs hosted web editor (§3). |
| Editor — highlight correctness | PASS (both palettes) | PASS (both palettes, screenshots) | No |
| Style pass, 1755-line file | 14.8–15.9 ms per keystroke (tree-sitter parse + whole-document query) | **0.92 ms per pass** (lexer + decoration build); 1.09 ms per typed character all-in | **Not comparable** — different highlighter. Fair conclusion only: the macOS app's actual highlighter has a ~1 ms like-for-like counterpart here. |
| Editor — programmatic undoable replace, span select and scroll-to, gutter, wrap | PASS | PASS — replace then undo restores the exact pre-edit hash; `select` 897:8–897:30; gutter per visual line; wrap live | No |
| Editor — felt | Declined by David | **Open** — three hands-on passes produced functional notes (dividers, menu, Index, open gesture, viewers, badges, Build tab, Test Run, audio), none about typing feel. Not inferred either way. | Not measured on either side |
| **Custom drawing** (tab strip, tab bar, World map) | PASS — **immediate mode**, `OnRender` + `DrawingContext` | PASS — **retained composition**: `Border`/`Grid`/`TextBlock`/`Shapes` rendered to DOM/SVG; no `OnRender`, no `DrawingContext`. Port cost measured: tab strip 150 lines, tab bar 90, World map 170, project pane 90. `HtmlPresenter` + `<canvas>` available as an immediate-mode escape hatch (unused). | **Yes — WPF**, on the ground David named. Magnitude now measured rather than predicted. |
| **Appearance, ADR-297 tokens, live flip** | PASS — free via `{DynamicResource}` | **PASS — free**: one `SolidColorBrush` per token, `Color` mutated, DOM rail `rgb(220,224,232)` → `rgb(22,23,29)` with no rebuild, `Apply()` 0.9 ms; System tracks `matchMedia` live | No — level (both free; different mechanism) |
| Title bar follows appearance | FAIL without `DwmSetWindowAttribute` | Not attempted — Photino exposes no title-bar API; the title lives in an in-content band | No — both need OS-specific work or a different shape |
| **Web-pane hosting** (D3's three panes) | PASS — WebView2 resource hook, one WebView2 per pane | **PASS** — iframes over Photino custom schemes; Play, Testing (full ADR-307 round trip + Run), Docs (106 nav links) all from unmodified checked-in assets; 61 requests, all 200 | No on capability. **Shape differs**: iframes in one page need a pointer-events drag guard and a shim that counterfeits `window.webkit.messageHandlers` (Phase 2 §4, Phase 4 §5a) |
| Project tree | PASS (WPF `TreeView`) | **partial** — grouped list, no expand/collapse or keyboard navigation (OpenSilver has a `TreeView`, not used) | Not measured to the same depth |
| Menu bar | Stock `Menu` | **Hand-built** — OpenSilver 3.3.3 ships no `Menu` control; Photino no native menu | **Yes — WPF** (minor, one-time) |
| Threading model | `DispatcherSynchronizationContext` | **No `SynchronizationContext`**: code after `await` resumes off the UI thread; every UI touch through `Dispatcher.BeginInvoke` (Phase 4 §5d, a real bug found and fixed) | Yes — WPF (a discipline, not a blocker) |
| Media over the pane origin | WebView2 hook can answer `Range` | Photino's scheme delegate returns a bare stream: `<audio>` fails; worked around with `data:` URLs | Yes — WPF (a shipping host needs a range-capable local origin) |
| Working set | 105 MB | Not measured | Not measured |
| Project scaffolding | `dotnet new wpf` | `dotnet new opensilverapp --usePhotino`; two-second desktop build; `wasm-tools` workload only for the browser target | No |
| **Platforms reached by the one codebase** | Windows | **Windows, macOS, Linux** (Photino natives for all six RIDs, built and run on macOS here) **and the browser** (built and run, panes need an HTTP origin) | **Yes — OpenSilver**, and it is the only row where the discrimination is strategic rather than a control-level cost |

**Read the table honestly.** Every control-level row that discriminates favours WPF, and each of those is a bounded cost the spike measured or fixed inside one session. The one row that favours OpenSilver is not a control; it is what the codebase reaches. That is the whole shape of this decision.

## 2. The question D2 actually asks, and what the evidence did to it

D2 rejected *"not Electron, not Tauri, not a web application in a window"* on the ground that *"the macOS app proved that a native shell around web panes is the right shape."* Three separate rulings hide in that sentence, and the evaluation bears on each differently.

**(a) The capability ruling — a native process that spawns, reads, and vendors.** Closed in OpenSilver's favour. Phase 1 proved the Photino host does these with the same .NET calls WPF would use, with no bridge, no IPC, no Rust. Everything GH #438's b79c97 comment feared about WASM is true of the browser target and false of the desktop host.

**(b) The toolkit ruling — WPF's drawing model over WinUI 3's.** Confirmed *against* OpenSilver. Phase 4 built the four custom surfaces and found exactly what `adr-341-spike/decision.md` caveat 2 predicted: retained composition, WinUI 3's side of the line. What the phase adds is the magnitude — layout code transliterated line for line, only the draw method became element construction, ~500 lines across four surfaces — and the two compensations: the theme flip is free because retained elements hold brush references, and the DOM offers a `<canvas>` escape hatch WinUI 3 does not.

**(c) The shape ruling — native rendering, not web rendering.** An OpenSilver desktop app is a native process and a native window whose entire UI, chrome included, is DOM in a web view. It is not Electron (no bundled Chromium, no Node in the shell) and not Tauri (no Rust, logic in C# not JS), but it *is* web-rendered. As first written, this record treated that as the one question the evidence could not settle.

**David, 2026-09-13 (session 5c6bba), on reading this record**: *"So I made the 'no web' call in relation to building a React app because I thought Chord Writer would be 'too much' for a web app. I think we can reevaluate that concern now."* That relocates the ruling. D2's "not a web application in a window" was recorded as a shape principle; its origin was a **capacity** concern — that a web UI could not carry the whole of Chord Writer — raised against the 2026-08-13 brainstorm's React shell. A capacity concern is exactly what Phase 4 tested: the whole shell ran web-rendered (chrome, menu bar, project pane, editor, all eight right-panel tabs, the World map, the live theme flip, compose-on-edit, a test run through the real toolchain), and the costs that surfaced were host plumbing (threading, drag across iframes, audio ranges), not capacity. The concern is answered, not sidestepped.

Two consequences follow, and the second is the larger one. First, the shape objection to OpenSilver is retired; what remains against it in §1 are bounded control-level costs. Second, **the retired ground was never OpenSilver-specific** — it was D2's ground against a TypeScript web shell too. Retiring it does not by itself revive that route (OpenSilver keeps C# and XAML, carries the team's Secret Letter experience, and needs no bridge for subprocesses), but it means the field is now three shapes, not two: native (Swift today, WPF as ruled), OpenSilver (native host, web-rendered XAML), and a pure web application. **David's direction, same session: spike the pure web application and evaluate it against the other two.** That evaluation has its own plan; §4's recommendation is therefore held, not withdrawn, until the third candidate has evidence of the same kind as the first two.

## 3. Three things the evaluation found that ADR-341 did not anticipate

**The editor is a hosted web editor, and it is the strongest control in the record.** D4 specifies two *native* editors consuming one tree-sitter grammar. The OpenSilver shell's editor is CodeMirror 6 in an iframe — the shape D3 reserves WebView2 for panes to avoid — and it out-measured both native spikes while reusing the **compiler's own lexer** rather than a hand-written port. Today Chord's syntax is defined in the compiler and again in `ChordLexer.swift`; a web editor bundling `packages/chord/src/lexer.ts` defines it once, which is what D4's "one grammar" was reaching for by way of tree-sitter (still unimplemented since 2026-06-19). Under OpenSilver, D4 would be rewritten, not satisfied. That is a real alignment gain (platform and language fitting together, `docs/core-concepts`) bought at the price of a native editor.

**D3's host contract becomes JavaScript, implemented once.** Under WPF, D3's contract is implemented natively twice (a `WKURLSchemeHandler` and a WebView2 hook). Under OpenSilver the host side is a pure C# resolver plus a page-level JavaScript shim that would be the same under any OpenSilver host. The finding that both the client and the surface detect their host by the WebKit-specific `window.webkit.messageHandlers` shape (Phase 2 §4) applies to the WPF path too and belongs in D3's module whichever way this goes.

**The toolchain, not the toolkit, is where the shipping risk was.** `sharpee build` through the sealed vendored toolchain fails for any story outside the repository — a Chord Writer packaging defect (GH #457, open) that the macOS app would hit the same way. The evaluation found it because Phase 1 refused to stub the toolchain.

## 4. Recommendation

**Recommend OpenSilver on Photino for the Windows shell, superseding ADR-341 D2's toolkit and shape rulings — conditional on Phase 6 passing on Windows — and keep the Swift macOS app as the reference implementation until the Windows shell reaches parity, with the macOS replacement decided then on a felt comparison, not now.**

Grounds, in order of weight:

1. **One codebase instead of two, and D1's cost line disappears.** ADR-341's Consequences name the cost of a mirror plainly: *"a second native codebase for the shell, editor, project tree, and subprocess plumbing, held to parity by a table and by tests."* The macOS app is 18,921 lines of Swift; WPF commits the project to writing and then maintaining a second one of similar size, forever, and every future feature lands twice. OpenSilver's shell reaches Windows, macOS, and Linux from one project (Phase 0 built and ran it on macOS; Photino ships natives for all three), and the same XAML runs in the browser. For a one-developer product whose stated primacy is the IDE, "designed once, lands once" is the largest single lever in the record, and it is the only row in §1 that is strategic rather than a bounded cost.
2. **Capability parity is total and unbridged.** The reason the b79c97 comment doubted OpenSilver — no subprocess, no project folder, no vendored Node — is false of the desktop host. Phase 1's nine real-path tests exercise the real shim, the real Node, the real Documents folder through the same two .NET namespaces WPF would use. Nothing about the shape costs a capability.
3. **Every product mechanism that was tested works, and the two that ADR-297 and ADR-307 make load-bearing work well.** The live appearance flip is one property write per token, measured at the DOM. The Testing tab completes the full tree-document round trip and runs the tree through the real `sharpee test`. Of eighteen spike-flagged rows, nine PASS, two PASS on hosting, six partial with named gaps, one in a different shape, none failed.
4. **The drawing-model cost David named is real and now measured as bounded.** Four custom surfaces, about 500 lines, layout transliterated, only the draw methods rewritten as element trees; and the compensations — free theme flip, a `<canvas>` escape hatch — are not available on WinUI 3, so caveat 2 lands softer here than it would have there.
5. **The team has shipped on it.** Secret Letter runs OpenSilver in production (GH #439 closed: a Silverlight 3 migration, so it proves the toolchain and the team's hands, not WPF portability — which is exactly the claim being made here). OpenSilver is MIT, pushed 2026-09-12, actively developed.

The condition is not decoration. **Windows is the target platform and has not run.** Photino hosting WebView2, the custom-scheme registration under WebView2, the vendored toolchain's Windows launcher (the shim is a POSIX script — Phase 1 §6), and MSIX or an installer around a self-contained Photino publish are all untested. Phase 6 exists for this; the recommendation is void if it fails on capability.

## 5. The strongest case against that recommendation

**It gives up the shape D2 chose, on the platform where a native app already ships.** The macOS app is real AppKit: `NSTextView`, `NSOutlineView`, `drawRect:`. Replacing it — even "eventually" — with a web-rendered UI in a WKWebView is a downgrade in kind on the one platform where Chord Writer already exists at 1.4.0, whatever the measurements say. Ground 1's "one codebase" only pays out if the macOS app is retired, and retiring it is the highest-stakes step in the whole proposal. That is why the recommendation defers it to a felt comparison rather than folding it in.

**The drawing model David named as deciding is lost.** He chose WPF because `drawRect:` maps onto `OnRender`. OpenSilver has no `OnRender`. The bounded-cost argument in ground 4 is about the four surfaces built so far; the macOS app has more custom-drawn views (the ruler, the candidate cards, the findings table) and every one of them becomes composition. If David's ruling was about *how he wants to write controls* rather than about cost, ground 4 does not answer it.

**The host is thin and a version behind.** `OpenSilver.Photino` 3.3.3 pins `Photino.NET` 3.2.3 (net6–net8 assets) while Photino's own line is 4.x; `photino.NET` was last pushed 2026-03-26 (1336★) and `photino.Native` the same day (181★). The evaluation hit four host limits in one session — no `SynchronizationContext`, no `Range` support in the scheme delegate, no menu, no title-bar API — each worked around, each a sign of a host that is a window and a web view and not much else. WPF's host is Windows.

**Iframes in one page are a weaker pane shape than a web view per pane.** The drag guard and the counterfeit `window.webkit` shape both exist because the panes share a document with the chrome. They work; they are the kind of thing that keeps working until a browser update changes focus or pointer semantics.

**The felt judgment is open on the editor, and the editor was D2's first-ordered spike.** Measured PASS is not the exit state Phase 3 asked for.

**Two cross-platform XAML toolkits render natively and were not evaluated.** The single-codebase argument in ground 1 is not unique to OpenSilver. **Avalonia** (MIT, 31,499★, pushed 2026-09-12) is XAML for Windows, macOS, Linux, and the browser with **its own Skia renderer** — no web view, an immediate-mode `Render(DrawingContext)` in WPF's idiom, and `AvaloniaEdit`, a port of the very AvalonEdit the WPF spike used. **Uno Platform** (Apache-2.0, 10,052★, pushed 2026-09-13) is WinUI-lineage on Skia for desktop. Neither was in scope (the plan evaluated OpenSilver because David raised it and has shipped on it), and nothing here is evidence about them beyond the health check above. But if what is attractive in §4 is *one codebase* and what is unattractive in §5 is *web rendering*, Avalonia is the candidate that offers the first without the second, and an honest record says so rather than letting OpenSilver win a cross-platform argument by default.

## 6. What would change the recommendation

- **If David rules that a web-rendered shell is unacceptable for Chord Writer** — on any platform, or on macOS specifically — WPF stands for Windows, and the evaluation's value is the record: capability parity proven, the shape question answered "no" on product grounds rather than assumed. ADR-341 is then *confirmed*, not superseded, and the confirmation is worth recording (§7).
- **If the single-codebase argument is the one that lands but the web rendering is not** — Avalonia is the next spike, scoped like this one (host capability first, then the four surfaces and the editor), before any ADR is written. That would be a third evaluation, not a continuation of this one.
- **If Phase 6 finds a Windows capability gap** — WebView2 under Photino, the scheme handler, or the toolchain launcher — the recommendation is void at that gap, and the record states the kill.
- **If the felt editor comparison comes back "web widget"** — the editor is the one control on the parity table an author lives in. A native-editor requirement inside an OpenSilver shell is possible (an OpenSilver `TextBox` is not it; a Monaco or CodeMirror page is the realistic route, which is what was built) and would reopen D4 either way.

## 7. What David is asked to rule on — as posed, and as it stands after his reading

As posed on 2026-09-13, three rulings in the order they gate each other:

1. **Shape**: is a native process and native window with a web-rendered UI an acceptable shape for Chord Writer's shell?
2. **Windows first, macOS later**: proceed with OpenSilver on Photino for `tools/winide` after Phase 6, keeping the Swift app as reference until parity, and decide the macOS replacement then on a felt comparison? Or decide the macOS question now?
3. **ADR-worthy (rule 11)**: either outcome constrains future sessions — superseding D2's shape and toolkit rulings, rewriting D4 (one web editor over the compiler's lexer) and D3 (a JavaScript host side), and adding platforms to Scope; or formally confirming WPF by recording why a passing OpenSilver evaluation did not overturn it. ADR-341 itself is not edited by this plan either way.

**As it stands** (David's reading, §2(c), same day): ruling 1's ground is retired — the "no web" call was a capacity concern about a React shell, and Phase 4 answered it. Rulings 2 and 3 are **deferred, not answered**: a third candidate, a pure web application, is to be spiked and evaluated against native and OpenSilver first. The ADR question returns when all three have evidence; any ADR then written covers the three-way decision, not the two-way one this record was scoped to. Nothing in ADR-341 changes in the meantime.

## 8. Dependency health at write time (2026-09-13, `gh api`)

| Repository | Stars | Last push | License | Read |
| --- | --- | --- | --- | --- |
| `OpenSilver/OpenSilver` | 1267 | 2026-09-12 | MIT (per NuGet package) | Active; 3.3.3 is the current release; `Menu` exists on master, not in 3.3.3 |
| `tryphotino/photino.NET` | 1336 | 2026-03-26 | Apache-2.0 | ~6 months quiet; `OpenSilver.Photino` pins 3.2.3 against a 4.x line |
| `tryphotino/photino.Native` | 181 | 2026-03-26 | Apache-2.0 | Latest release v4.0.22 (2025-01-23); the thinnest link in the chain |
| `AvaloniaUI/Avalonia` | 31499 | 2026-09-12 | MIT | Health check only — not evaluated (§5) |
| `unoplatform/uno` | 10052 | 2026-09-13 | Apache-2.0 | Health check only — not evaluated (§5) |
| `TreeSitter.DotNet` (GH #440) | 35★, pushed 2026-01-22 | — | — | **Not load-bearing under OpenSilver**: the editor runs in the web view, so the binding that would apply is `web-tree-sitter`. #440's concern is specific to the native-shell route. |

## 9. Owed regardless of the ruling

- **GH #457** (vendored toolchain cannot build an out-of-repo story) — a Chord Writer defect, open, platform change, discuss first.
- **GH #458** (the orphaned `~/Documents/OpenSilver Capability Check/` fixture) — David's disposition.
- **Phase 6** — the Windows run; its addendum folds back into this record.
- **D3's contract module** should own the post door so panes stop naming `window.webkit` — true under WPF, OpenSilver, or anything else.
- **The felt editor session** (`dotnet run --no-build -- --pane editor` from `Hello.Photino/`, then type in the 1755-line file) — the one Phase 3 exit-state item still open.
