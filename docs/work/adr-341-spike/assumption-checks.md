# ADR-341 D2 spike — Phase 2 assumption checks

Evidence for the assumptions ADR-341 names in its Context and decisions. Each check
records the command, the result, and the date, per the repository's evidence rule.

**Two assumptions, not three.** The third — that the vendored x64 Node runs acceptably
under Windows-on-ARM emulation — was **withdrawn** on 2026-09-11 (session `89f9e0`,
David: "we indefinitely deferred ARM on Windows") when ADR-341 D6 was amended to defer
Windows on ARM indefinitely. It is not an open gap and must not be reported as one:
D6 as amended asserts nothing about ARM for it to be a gap in.

**Environment for every check below**: Windows 11 Pro 10.0.26100, AMD64, .NET SDK
10.0.401, WebView2 Evergreen runtime 153.0.4234.32, Visual Studio Community 2026
18.10.12201.205. Provisioned and recorded in `plan.md` Phase 0.

---

## Assumption 1 — a .NET tree-sitter binding exists and loads a grammar

**ADR-341's wording** (Context): "Tree-sitter is a C library with a Swift binding; a
.NET binding exists as an assumption here and is verified in the D2 spike phase."

### Result: **PASS**, on all four sub-checks, 2026-09-11.

The binding exists, ships win-x64 natives, parses, exposes the query API a highlighter
is built from, loads a grammar from an arbitrary path, and reparses fast enough that
per-keystroke highlighting is not a design constraint.

### Candidate survey (NuGet, queried 2026-09-11)

| Package | Latest | Published | Verdict |
| --- | --- | --- | --- |
| **`TreeSitter.DotNet`** | 1.3.0 | **2026-01-22** | **Chosen.** MIT, ~193k downloads, [mariusgreuel/tree-sitter-dotnet-bindings](https://github.com/mariusgreuel/tree-sitter-dotnet-bindings). Zero package dependencies. |
| `CycoDevTreeSitter` | 1.4.0 | 2026-07-28 | A fork of the above, *newer than upstream*, ~279 downloads. Noted, not chosen — see "watch item" below. |
| `TreeSitterLanguagePack` | 1.10.9 | 2026-06-24 | 306 pre-compiled grammars. Not needed: the chosen binding bundles its own. |
| `TreeSitter.Bindings` | 0.4.0 | 2025-06-24 | Rejected — version ordering is incoherent on the feed (`0.0.0-alpha.0.75` published after `0.4.0`). |
| `TreeSitterSharp`, `tree-sitter` | 0.5.0 / 0.4.19 | **2023-11** | Rejected — dormant ~3 years. |

Health check per the project's "verify active maintenance before recommending"
convention: `TreeSitter.DotNet` has shipped six versions across 2025-05 → 2026-01, is
MIT, and is the only candidate combining recency, adoption, and a working repository
link.

### Package contents (the check that actually decided it)

```
runtimes/ : linux-arm, linux-arm64, linux-x64, linux-x86,
            osx-arm64, osx-x64, win-arm64, win-x64, win-x86
lib/      : netstandard2.0
deps      : none
size      : 50.9 MB
```

**`win-x64` ships**, and the grammars ride in the same package — 30 grammar DLLs land
in the build output, so there is no second package and no build step to get a working
parser. `netstandard2.0` means the binding is consumable from WPF and WinUI 3 alike,
which matters because Phases 3 and 4 both need it.

### The check itself

`tools/spikes/adr-341/treesitter-check/` — `dotnet build -c Release` (exit 0, no
errors), `dotnet run -c Release`. Output, 2026-09-11:

| Sub-check | Result |
| --- | --- |
| **1. Load by name, parse** | PASS — `typescript` grammar, ABI 14, 383 symbols, 5870 states; a TS interface parsed to a correct S-expression with `hasError: False`. |
| **2. Query API** | PASS — a 4-pattern highlight query returned **6 captures** with correct capture names and byte ranges (`@type.name`, `@property` ×2, `@string` ×2, `@type.builtin`). |
| **3. Load from an arbitrary path** | PASS — `new Language(<dll path>, "tree_sitter_json")` loaded and parsed. |
| **4. Incremental reparse** | PASS — cold parse **0.057 ms**; incremental reparse **0.001 ms** each over 100 iterations. |

### Three findings worth carrying forward

**Sub-check 3 is the one that matters for ADR-182, and it needed a correction to get
right.** The two-argument `Language(string, string)` ctor takes a library path and a
**C entry point**, not a friendly name: passing `"json"` fails with
`EntryPointNotFoundException: Could not find entry point 'json' in library`, while
`"tree_sitter_json"` succeeds. This is recorded because it is the exact route ADR-182's
Chord grammar will take — a DLL this package has never heard of, loaded by path — and
the first failure looks like "the binding cannot load external grammars" when it is
actually a naming convention. It can.

**`Language.Name` returns `<null>`** for grammars loaded either way, while
`AbiVersion`, `Symbols` and `StateCount` are all populated. Cosmetic, but a spike that
identifies a loaded grammar by `Name` will think it failed.

~~**Reparse cost is not a design constraint.** At 1 µs per incremental reparse, a
highlighter can run on every keystroke without a debounce, an idle timer, or a
background thread. D4's "mirroring the AppKit editor's behavior" therefore does not
inherit a performance problem from this layer — whatever editor feel Phases 3 and 4
measure will be the *control's* doing, not the parser's.~~

**CORRECTED 2026-09-11 by Phase 3, same session.** The 1 µs figure is real but it was
measured on a **four-line document**, and the conclusion drawn from it does not
generalise. Phase 3 wired the same binding into a real editor over a **1755-line**
repository file and measured **14.8–15.9 ms per keystroke** — a full 60 fps frame.

The parser is not the cost. Re-running the highlight query over the whole tree and
rebuilding the span list on every change is O(document), not O(edit), and that is where
the time goes. The corrected statement: **tree-sitter parses fast enough; a naive
whole-document query does not** — in either toolkit, which is why `wpf-spike.md` carries
it forward as a measurement Phase 4 must repeat on the same file rather than as a WPF
finding. The fix (query the changed range or the visible viewport and splice the span
list) is ordinary editor engineering, not a toolkit limitation.

Recorded as a strikethrough rather than a silent edit because the original was quoted
into `plan.md`'s Phase 2 outcome, and a benchmark that measured the wrong thing is worth
seeing as a mistake rather than finding the record quietly improved.

### Watch item, not a decision

`CycoDevTreeSitter` is a fork of the chosen package published six months more recently
(2026-07-28 vs 2026-01-22), describing itself as "extended with additional" features.
If `TreeSitter.DotNet` is still at 1.3.0 when the Windows editor is built for real, the
fork is worth a second look — a binding whose upstream has gone quiet is the kind of
dependency this project has a convention about. Recorded so the question is asked then
rather than rediscovered.

### What this does **not** establish

The Chord grammar itself. ADR-182 is accepted and unimplemented, and D4 sequences it
into the Swift app *before* the Windows editor consumes it. What this check proves is
that when that grammar exists as a compiled native library, the .NET side can load and
query it. Compiling a tree-sitter grammar to a Windows DLL is a separate step this
check did not perform.

---

## Assumption 2 — WebView2's resource-request hook can satisfy the D3 host contract

**ADR-341's wording** (D3): "that `WebView2`'s resource-request hook can satisfy it is
an assumption verified in the D2 spike phase."

### Result: **PASS**, on all four sub-checks, 2026-09-11.

`CoreWebView2.AddWebResourceRequestedFilter` + the `WebResourceRequested` event is a
working counterpart to `WKURLSchemeHandler`. It serves a pane directory over a custom
origin, resolves the pane's relative URLs against that origin, answers a request
entirely from memory, and keeps `localStorage` across a process restart.

### The check itself

`tools/spikes/adr-341/webview2-check/` — a WPF host (WPF because it is the fastest
toolkit to scaffold; this check is toolkit-agnostic, since WPF and WinUI 3 host the
same `WebView2` control). `Microsoft.Web.WebView2` **1.0.4191.47**, published
2026-08-28 — health-checked per the project's convention and actively maintained
(a `1.0.4255-prerelease` shipped 2026-09-11, the day of this check).

`dotnet build -c Release` (exit 0, 0 warnings), then the executable run twice against
a **fixed** user data folder, `%TEMP%\adr341-webview2-check-udf`, deleted before pass 1
so the cold start is real. WebView2 runtime reported at 153.0.4234.32, matching the
Evergreen version Phase 0 found preinstalled.

The pane is served at `https://pane.chordwriter.invalid/` — a made-up origin on the
reserved `.invalid` TLD, so no request can escape to a real host.

| Sub-check | What it proves | Result |
| --- | --- | --- |
| **(a) Directory served over a custom origin** | The hook fired for **all four** requests (`/index.html`, `/style.css`, `/app.js`, `/api/subprocess-result.json`); the document reported `origin: "https://pane.chordwriter.invalid"`. | PASS |
| **(b) Relative URLs resolve** | `index.html` references `./style.css` and `./app.js` with no base tag. Both resolved against the custom origin *and applied* — the probe reads the computed colour back rather than trusting that a request went out. | PASS |
| **(c) A response answered from memory** | `fetch('./api/subprocess-result.json')` was satisfied from a `MemoryStream` the host built inline, never touching disk, and the JSON round-tripped intact. | PASS |
| **(d) `localStorage` persists across a process restart** | Pass 1 (cold) reported `priorValue: null` and wrote a value. Pass 2, **a new process**, reported `priorValue: "written-by-pass-1"`. | PASS |

### Why (c) and (d) were tested beyond the ADR's literal wording

D3's Context names two properties the `WKURLSchemeHandler`s guarantee today —
`localStorage` persistence and relative-URL resolution — and those are (b) and (d).
Two additions earn their place:

**(c) is the other half of D3's own contract sentence.** D3 says a host both *serves
the pane's files* and *answers the pane's requests for files and subprocess results*.
A hook that can only stream files off disk would satisfy half the contract and fail
the half that carries build output, test results, and the introspection manifest back
to a pane. It does not: a response can be synthesised in the handler.

**(d) was tested across a process restart, not merely within one run.** Within a single
run, `localStorage` working proves almost nothing — the interesting failure is a
browser treating a synthetic origin as ephemeral and discarding its storage when the
process exits, which is exactly what an author would experience as "the Testing pane
forgot my settings again." It requires a fixed user data folder; a per-run temp folder
would have produced a green result that meant nothing.

### Findings worth carrying forward

**The custom origin must be a real-looking HTTPS origin, and that is a feature.**
Serving over `https://<host>.invalid` puts the pane in a secure context, which is what
makes `localStorage` (and `crypto.subtle`, service workers, and the rest) available at
all. This is the same reason the macOS app serves its panes over a custom scheme rather
than `file://`.

**The filter is registered per-origin and fires for every context.** One
`AddWebResourceRequestedFilter($"{Origin}/*", CoreWebView2WebResourceContext.All)` call
covered the document, the stylesheet, the script, and an XHR — so the D3 host contract
does not need a separate registration per resource kind. A narrower
`CoreWebView2WebResourceContext` would be the optimisation, not the requirement.

**A 404 path exists and is explicit.** `CreateWebResourceResponse(null, 404, ...)` is
the "the host has no such file" answer, which the contract will need for a pane asking
after something the project does not contain.

**Harness defect worth recording, because it is not a WebView2 fact.** The first run
died with `InvalidOperationException: The calling thread must be STA`. C# top-level
statements generate a `Main` with no `[STAThread]`, and WPF requires one; the fix is an
explicit entry point, not anything about the hook. Recorded because the stack trace
points at `WebView2..ctor` and reads like a WebView2 hosting problem.

### What this does **not** establish

That the two IDE-owned panes (`docs-tab`, `testing-surface`) run unmodified under this
host. This check served a purpose-built three-file pane, not a real Vite build with its
module graph, asset hashing, and dynamic imports. Loading an actual pane build is
Phases 3 and 4's third spike item, and it is the one that would surface a `file://`
assumption or an absolute-path reference baked into a bundle.

---

## Editor-control candidates — named and health-checked

Phase 2's second deliverable. ADR-341's Context names the candidate ecosystems
generally ("WPF's is mature; WinUI 3's is a Scintilla port that calls itself early work
in progress, a Win2D control, and Monaco hosted in `WebView2`") and this plan requires
naming specific candidates and verifying maintenance rather than assuming it.

**The screening question is D4, not feature count.** D4 requires both editors consume
ADR-182's tree-sitter grammar, so a control is only a candidate if it can be **driven by
an external tokenizer** — its own built-in syntax definitions are irrelevant, and a
control that can *only* highlight from its own definition format would put a third
definition of Chord's syntax in the tree, which is the outcome D4 exists to prevent.

### WPF

| Candidate | Latest | Published | Repo activity | External tokenizer? |
| --- | --- | --- | --- | --- |
| **`AvalonEdit`** | 6.3.1.120 | 2025-04-12 | 2081★, last push **2025-12-04** (282 d) | **Yes — verified** |
| `RoslynPad.Editor.Windows` | 5.0.0 | 2026-05-21 | 2814★, last push **2026-09-01** (10 d) | Inherits AvalonEdit's |
| `ActiproSoftware.Controls.WPF.SyntaxEditor` | 26.1.0 | **2026-09-04** | commercial, 832k downloads | Custom lexers supported |
| `AvalonEditB` | 2.4.0 | 2024-09-11 | fork | Inherits, but staler than upstream |

**AvalonEdit's external-tokenizer support was verified by reflection on the shipped
assembly, not from documentation or recall.** Two public extension points exist:

- `ICSharpCode.AvalonEdit.Highlighting.IHighlighter` — a public interface whose
  `HighlightLine(int)` returns a `HighlightedLine`. Implementing it drives colouring
  from *any* source; the `.xshd` syntax definitions are one implementation of this
  interface, not a privileged path. `HighlightingColorizer` accepts an `IHighlighter`.
- `ICSharpCode.AvalonEdit.Rendering.DocumentColorizingTransformer` — the simpler
  per-line route, for a highlighter that can answer "what spans on this line" directly,
  which is exactly the shape of a tree-sitter query result.

Target frameworks are `net462`, `net6.0-windows7.0`, `net8.0-windows7.0` — **no
`net10.0` target**, which is fine (forward-compatible) but is the kind of thing that
looks alarming in a build log and is recorded here so it is not investigated twice.

**On AvalonEdit being quiet.** 282 days since the last push, on a 2081★ MIT project with
17.4M downloads and 117 open issues. This is the one health concern in the WPF column,
and it is mitigated rather than dismissed: `RoslynPad` is an actively maintained
(10 days) 2814★ consumer that ships its own AvalonEdit-based editor package, so the
component has a live downstream maintainer even while upstream is slow. Actipro's
SyntaxEditor, published a week before this check, is the paid fallback if that stops
being true.

### WinUI 3

| Candidate | Latest | Published | Repo activity | Native editor? |
| --- | --- | --- | --- | --- |
| **`WinUIEdit`** (Scintilla port) | **0.0.5-prerelease** | 2026-07-03 | 218★, last push 2026-07-03 (70 d) | Yes |
| `WinUI.Monaco` | 1.1.52.120 | 2025-05-13 | 23★, last push **2026-09-11** (0 d) | **No — Monaco in WebView2** |
| `MonacoEditor.WinUI3` | 0.5.0-monaco.0.55.1 | 2026-04-10 | 2★, last push 2026-07-27 | **No — Monaco in WebView2** |
| `CodeEditorControl_WinUI` (Win2D) | — | — | **not on NuGet**; repo not found at the searched path | Yes |

**ADR-341's characterization of the Scintilla port is verified and still true.**
WinUIEdit's own README, read out of the shipped 0.0.5 package: *"This is an early
work-in-progress code editor control… This control is currently not production ready.
Breaking API changes are very likely at this stage."* The ADR wrote that in 2026-09
from the same self-description; 14 months of releases have not changed it, and the
package is still on a `0.0.x` prerelease.

On the merits it is otherwise promising: it ships `win-x64`, `win-arm64` and `win-x86`
natives plus a WinMD, and its README states the full Scintilla API is reachable *"via
the `SendMessage` method"*. ~~**So an external tokenizer is possible**, but through a raw
message interface rather than a typed extension point.~~

**CORRECTED 2026-09-11 by Phase 4, same session.** An external tokenizer is possible
**through typed methods**, not a raw message interface. Reading the shipped `.winmd`
shows the whole Scintilla surface projected as WinRT — **1003 public members** —
including `SetILexer`, `StartStyling`, `SetStyling`, `StyleSetFore` and `StyleClearAll`.
`SendMessage` is the escape hatch, not the route. The original claim was inferred from
the README rather than measured, which is exactly the failure `docs/core-concepts`
warns about: a claim built from an adjacent fact instead of from the thing itself.

This matters because the asymmetry the table below draws — a typed extension point on
WPF against raw messages on WinUI 3 — **does not exist**. Phase 4 drove tree-sitter
captures into WinUIEdit and got correct highlighting at the same speed as WPF.

### The asymmetry this surfaces — a finding, not a decision

WPF has a **mature, free, externally-tokenizable native editor control available
today**. WinUI 3's only genuinely native option self-declares as not production ready
with breaking changes likely, and its two better-maintained alternatives are **Monaco
hosted in WebView2 — which is not a native editor at all**, and would put the Windows
editor in a web view while D4 says "The Windows editor is native to its toolkit"
(and while D3 reserves WebView2 for the three *panes*, deliberately not the editor).

That is a real, measured asymmetry in the single control D2 orders spiked **first**,
and Phase 6 should weigh it. It is recorded here as evidence and nothing more:
**D2 rules that the toolkit whose spikes pass is the toolkit**, and no spike has been
built yet. A candidate that reads badly on paper and performs well in Phase 4 beats
this table; that is the entire reason D2 orders spikes instead of argument.

### What Phases 3 and 4 build against

- **Phase 3 (WPF)**: `AvalonEdit` 6.3.1.120, highlighting driven through `IHighlighter`
  or `DocumentColorizingTransformer` from `TreeSitter.DotNet` query captures.
- **Phase 4 (WinUI 3)**: `WinUIEdit` 0.0.5-prerelease as the native candidate, styled
  through the Scintilla message API. If it fails, `WinUI.Monaco` is the fallback the
  phase records — explicitly flagged as a D4 conflict rather than an equivalent result,
  so that "the editor worked" never silently means "the editor was a web view."
