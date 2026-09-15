# ADR-351: Chord Writer's host shape — the four-way comparison

**Status**: **DRAFT — not accepted, and acceptance is gated.** The Open Questions section below is non-empty, so under rule 11a this document cannot be marked ACCEPTED. **D2 records David's ruling of 2026-09-15** (session e3fbf7) on a requirement matrix he weighted and scored himself; it was conditional on three named things, of which **the Windows check is now met** (2026-09-14, session 6c19b3 — Q-1 resolved; see D2 and the Consequences). Two conditions remain, both David’s: the macOS bundle layout and the felt comparison. D1, D4, D5, D6 and D7 record findings that hold whichever way the conditions resolve. Written 2026-09-15, session e3fbf7, on `main`, at David's rule-11 confirmation ("yes") with his shaping instruction: *"keep the details in the research and the ADR as a summary comparison of requirements."* This document therefore carries **one line per requirement per shape** and cites the research for everything else. No implementation is authorized by this ADR in any state.

**Scope**: the shape of Chord Writer outside macOS — `tools/winide` (reserved and empty), the three web panes under `tools/ide/web/`, and the host seam each pane is reached through. `tools/ide/SharpeeIDE` is in scope only as the product surface every candidate is measured against; **this ADR proposes no change to the shipping macOS application**. No Chord change and no `packages/` change; the three platform findings in D6 are filed as issues, not decided here.

## Date: 2026-09-15

## Parent

ADR-341 (Chord Writer for Windows — a native mirror; **D2** the WPF toolkit ruling, **D3** the three-web-pane host contract, **D4** two native editors over one grammar, **D5** the protocol-type generator, **D7** installer and update channel — this ADR is the evidence D2's own spike phase was ordered to produce, and D2/D3/D4 are the rulings it bears on). **Related**: ADR-280 as amended A1 (real folders at `~/Documents/<Story Title>/` — the promise that becomes tier-dependent), ADR-307 (the tree-document round trip, the strongest shared measurement across all four shapes), ADR-297 (appearance), ADR-191 (the in-browser playground — the precedent that browser-clean compile already ships), ADR-178 (the baseline package set a platform payload contains), ADR-253 D3, ADR-284 (publish).

## Context

ADR-341 D2 chose WPF for Windows and ordered a spike phase to check it. That phase ran four times, against four host shapes, over three plans and one archived spike. Each produced a parity column against the same row set and a decision record in the same frame:

| Shape | Evaluated | Records |
|---|---|---|
| Native (Swift shipping / WPF) | 2026-09-08 | `docs/work/archive/adr-341-spike/` |
| OpenSilver on Photino | 2026-09-13 | `docs/work/opensilver-ide-evaluation/` |
| Avalonia + Velopack | 2026-09-14 | `docs/work/avalonia-ide-evaluation/` |
| Pure web application (O1/O2) | 2026-09-15 | `docs/work/web-ide-evaluation/` |

**The detail lives there and is not restated here.** Each record carries its commands, versions, timings and hashes inline; each parity table carries its own host findings. What this ADR adds is the one thing no single record could hold: the four shapes side by side against the requirement list they were all judged on (`docs/work/web-chord-writer/options-20260913-web-app-shapes.md` §1, R1–R21), one cell per requirement per shape.

**Read the cells as summary verdicts, not as measurements.** A number appears only where it is the shortest honest form of the verdict. "not built" means not attempted, with the cost estimated in the source record; **void** means the requirement's *question does not arise* for that shape, which is a different statement from passing it.

### The requirements are weighted, and scored, and both are David's

A comparison that lists requirements as peers has handed the ranking to whoever reads it. Two numbers per row fix that, and David set both in session e3fbf7, 2026-09-15, going through the list one requirement at a time.

- **Importance (I)** — how much Chord Writer is diminished without the requirement. Not how hard it is to build, and not how well any shape does it. ● 4 · ◕ 3 · ◑ 2 · ◔ 1. David corrected three drafted values: **R6 up to 4**, **R12 up to 3**, **R10 down to 1**, and added **R22** after the first matrix showed the list could not answer this ADR's own question.
- **Satisfaction (the cell numbers)** — how well each shape meets it. 0 absent · 1 major gap · 2 partial · 3 good with a named gap · 4 full. Scored as **capability as evidenced** — what the shape can be relied on to do — not how much of it a spike happened to build, since the four spikes built deliberately different amounts. *Italic* marks a cell resting on inheritance or structural certainty rather than on a measurement in that shape.

**Two requirements are gates, not scores.** R22 and R20 do not add to a total: a shape that fails one is out of contention regardless of how it scores elsewhere. That is what makes the native column the reference rather than the winner — it satisfies almost everything and reaches one platform, which is the whole reason ADR-341 exists.

Rows are ordered by importance, heaviest first.

| I | # | Requirement | Native (Swift / WPF) | OpenSilver on Photino | Avalonia + Velopack | Pure web (O1/O2) |
|---|---|---|---|---|---|---|
| **gate** | R22 | **Platform reach** — Windows, macOS and Linux for the author, from one codebase | **1** — macOS only; Windows needs a second codebase that does not exist | **3** — natives for all six RIDs, plus a browser head; only macOS built and run | **3** — all three by construction; **only macOS built and run** | **4** — every platform with a browser, and nothing to install |
| **gate** | R20 | **Browser support** — a constraint, and a row only one shape has | n/a | n/a | n/a | **2** — Chromium yes, WebKit and Gecko no, checked firsthand in both directions |
| ● 4 | R1 | **Project files** — a real folder the author owns: open, list, read, write, rename, detect external change | **4** | **4** | **4** — write verified by independent read | **3** Chromium (real folder, write verified outside the browser, two dialogs for the life of a project; neither route detects external change — both poll) · **0** WebKit/Gecko, where the project sits in a store Finder, git, another editor and the author's backup cannot reach and clearing site data destroys |
| ● 4 | R2 | **Editor** — tabs, Chord highlighting at typing speed | **4** — native, tree-sitter against a grammar that does not exist | **4** — web editor, 0.92 ms | **4** — native editor over the compiler's own lexer, 7.96 ms | **4** — same lexer in the page, 0.82 ms, the fastest of the four |
| ● 4 | R3 | **Compose on edit** — IR and diagnostics with spans | **4** | **4** — 89 ms subprocess | **4** — subprocess | **4** — 11.8 ms in-page, no process to start |
| ● 4 | R5 | **Play** | **4** | **4** — custom scheme | **3** — works, but over a token-scoped loopback listener, because no scheme door exists on that backend *(macOS only: Phase 7 proved a real host-owned origin on Windows — see D3; the cell is left at 3 pending David’s rescore, per D5)* | **4** — no bundle and nothing served; sandbox posture unreviewed |
| ● 4 | R6 | **Test** — the ADR-307 tree-of-cards surface | **4** — ships | **3** — replay **under-ran**: branch lines were never fresh-booted | **4** — document correct; the replay count is explained, one extra boot unresolved | **4** — same document byte-for-byte in three engines, walker runs in-page |
| | | **weight-4 subtotal (of 20)** | 20 | **19** | **19** | **19** |
| ◕ 3 | R9 | **Publish** | **4** | **4** | **4** | **3** — proven end to end and plays from `file://`; the save is a user gesture and there is no `publish` parity check |
| ◕ 3 | R12 | **Cloud files and sync** | **4** *by delegation — the author's own sync client* | **4** *by delegation* | **4** *by delegation* | **4** Chromium *by delegation* · **0** private tier, where a cloud adapter is the only route to the author's files and none is built; iCloud has no third-party web API at all |
| ◕ 3 | R13 | **Offline** | **4** | **4** | **4** | **3** — after first load, proven by stopping the server; the testing surface and walker are not precached |
| ◑ 2 | R4 | **Build** | **4** | **4** | **4** | **3** — 0 errors in 759 ms, at 12.88 MB of wasm and an artifact 24% larger than the Node build's, unexplained |
| ◑ 2 | R7 | **World index** | **4** | **4** | **4** | **1** — not built, and whether the analyzer is reachable from a browser is unproven (the GH #463 class of question) |
| ◑ 2 | R11 | **Documentation tab** | **4** | **4** | **3** — external-link interception unverified | **3** *static assets on the page's own origin; not built* |
| ◑ 2 | R14 | **Settings and session state** | **4** | **4** *trivial* | **4** *trivial* | **3** — proven, but scoped to the **origin** rather than to the project |
| ◑ 2 | R15 | **Updates and toolchain version** | **4** — Sparkle | **2** — no proven channel | **2** — a measured delta channel (8.11 MB on a 99.8 MB app) **and a macOS bundle that cannot be sealed, so nothing was notarized** | **4** — a reload is the update; nothing to sign |
| ◑ 2 | R16 | **Media** | **4** | **2** — bare stream: `<audio>` fails, worked around with `data:` | **4** | **4** |
| ◑ 2 | R17 | **Appearance** (ADR-297) | **4** | **4** — 0.9 ms | **3** — the editor's syntax colours do not flip | **4** — 0.01 ms median |
| ◑ 2 | R19 | **Isolation** — a running story must not reach the IDE | **4** | **3** — iframes in one page | **4** | **3** — sandboxed iframe, posture unreviewed |
| ◔ 1 | R8 | **Introspection / project manifest** | **4** | **3** — needs a C# generator target | **3** — needs the same | **3** — no generator needed; the command itself is unreached |
| ◔ 1 | R10 | **Hatched TypeScript stories** | **4** | **4** | **4** | **4** — transpiled, imported, executed and bundled in the page |
| ◔ 1 | R18 | **Second window** | **4** | **3** — wired, unverified | **4** *trivial* | **2** — the cross-window channel works; the app cannot open a window on its own initiative |
| ◔ 1 | R21 | **Identity** | **4** | **4** | **4** | **2** — an origin, so clearing site data is uninstalling **and** deleting the documents |

**Weighted totals**, over the twenty scored requirements (the two gates excluded, so the columns are comparable; maximum 196):

| Shape | Weighted | | Gate R22 |
|---|---|---|---|
| Native (Swift, shipping) | **196** | 100% | **fails** — one platform |
| **Avalonia + Velopack** | **183** | 93% | passes |
| OpenSilver on Photino | **180** | 92% | passes |
| Pure web — Chromium tier | **167** | 85% | passes |
| Pure web — private tier | **143** | 73% | passes |

**Three readings, and they are the substance of this ADR.**

**The three cross-platform shapes tie on everything that matters most.** Each scores **19 of 20** across the five weight-4 requirements, and each gives up its single point somewhere different — OpenSilver on a replay that under-ran, Avalonia on a pane door it does not have, Web on files it cannot reach outside Chromium. Nothing in the heaviest band separates them. The entire 16-point spread between Avalonia and the web shape is made in the ◕ 3 and ◑ 2 bands, and more than a third of it in two cells: R7 world index (1) and R9/R13 (3 each).

**Avalonia and OpenSilver are not separated by this table at all.** 183 against 180 is inside the noise of individual cell judgments. What separates them is ADR-341 D2 and D4's own criteria — the drawing model, the platform's own menu bar, a native editor — which are rulings, not requirement rows.

**And the native column is why the gate exists.** A perfect 196 that reaches one platform is the status quo this ADR was opened to change; without R22 the matrix recommends it.

## Decision

**D1 — The comparison is complete and closed.** Four shapes, four bodies of evidence, one row set, one frame. No fifth shape is evaluated, and no shape is re-spiked to improve a column: the remaining gaps are named in their own records as owed work, not as missing evidence.

**D2 — Chord Writer is carried forward on Avalonia + Velopack: one codebase for Windows, macOS and Linux, natively rendered.** David's ruling, 2026-09-15, session e3fbf7, on the weighted matrix above: *"the Avalonia + Velopack score was as close to native as possible and still reach all three platforms."* Mechanically, that is the gate and then the total — R22 removes the native column from contention for this ADR's question, and among the shapes that clear the gate Avalonia scores highest (183/196).

The ruling is **conditional on three things the Avalonia record already named, which this ADR does not soften**: its Phase 7 on Windows, a solved macOS bundle layout, and David's felt comparison of the whole shell. The first is now **discharged**. Avalonia’s Phase 7 ran on Windows 11 x64 on 2026-09-14 (session 6c19b3; record `docs/work/avalonia-ide-evaluation/phase-7-windows-check.md`, addendum §12 of that evaluation’s decision record) and **confirmed the column, with one correction in Avalonia’s favour**: `PaneHost` builds on Windows with 0 warnings and 0 errors against the same pins; Velopack, 0-for-1 on macOS, produced `Setup.exe`, a portable zip and a working delta channel (72,533 B against a 51,984,680 B full package) in 8.4 s, with `--azureTrustedSignFile` present in `vpk` 1.2.0; and the WebView2 response-supply door **exists and was used for real** (see D3). The one genuine Windows gap found is not the toolkit but the **vendored toolchain**, which has no Windows Node asset, no Windows launcher, and GH #448 downstream — a cost identical under WPF. Still owed on this condition: a signed installer and an actual install run, both needing David’s Azure Trusted Signing identity and his machine.

Two qualifications that belong with the ruling rather than in a footnote:

1. **This table does not separate Avalonia from OpenSilver** (183 against 180, inside the noise of the cell judgments). What separates them is ADR-341 D2 and D4's own criteria — `Render(DrawingContext)` measured as WPF's contract, the platform's own menu bar, and a native editor reading the compiler's own lexer. Avalonia holds all three; OpenSilver holds none of them. The ruling therefore rests on the earlier ADR's criteria as much as on this matrix, and that is stated so a later reader does not attribute it to a three-point difference.
2. **Avalonia's lowest scored cell is a wall, not a polish gap.** R15 = 2 because `vpk` cannot seal the macOS bundle: it puts all 225 publish entries, the 175 MB toolchain included, flat into `Contents/MacOS/`, and no flag moves them. Four routes, one cause, nothing ever submitted to Apple. A shape that cannot currently produce a notarized `.app` has not proven it can ship on the platform where the product already ships.

**The pure web application is not adopted and is not discarded.** It ties the other two cross-platform shapes on every weight-4 requirement, holds the two product differentiators outright (R6, and running the tree walker in-process rather than relaying a subprocess), carries the lightest verification burden of the four — no installer, no signing identity, no bundle seal, no per-platform host door — and costs 16 weighted points, concentrated in R7 (world index, unbuilt and unproven), R9 and R13, plus the R1 fork outside Chromium. It is the standing answer if a D2 condition fails (Q-2), and its evidence is complete enough to act on without re-spiking.

**D3 — ADR-341 D2 is superseded; D4 is satisfied rather than rewritten; D1's mirror framing inverts.** D2's WPF toolkit ruling is replaced by Avalonia for the same reasons D2 gave — `Render(DrawingContext)` is WPF's drawing contract, measured on this toolkit at one `Render` per invalidation and zero while idle, so the ruling's own criterion carries over rather than being traded away. **D4 is met**: a natively-drawn editor reading the compiler's own lexer, with no C# port of the grammar written, which is what D4 was reaching for; it would be amended to name the compiler's lexer instead of tree-sitter, since ADR-182's Chord grammar has never been implemented. **D1's "native mirror of the macOS app" inverts into its opposite**: one codebase means the Mac app is not mirrored but eventually replaced, which is the most expensive consequence of this ruling and is Q-4. **D3 now answers differently per platform, and that is measured rather than feared.** Phase 7 established that Avalonia’s own `WebResourceRequestedEventArgs` is Request-only on *both* backends — so nothing about Avalonia’s surface differs — but that on Windows `NativeWebView.AdapterCreated` hands out a **public** `IWindowsWebView2PlatformHandle` carrying a live `CoreWebView2` pointer, which QIs clean for `ICoreWebView2`/`_2`/`_3`/`_22`. `ICoreWebView2_3::SetVirtualHostNameToFolderMapping` was called for real (`hr=0x0`) and served a pane from `https://sharpee-panes.invalid/` off a host-owned folder **with no `HttpListener` in the process**. macOS has no equivalent and must keep the token-scoped loopback origin. This is a gap in Avalonia’s abstraction, not in either platform; D3’s contract module is where the per-platform door belongs, and whether a shipping implementation writes that door or standardizes on loopback for uniformity is a decision **this ADR does not make**. **ADR-341 is not edited by this document while it is DRAFT.**

**D4 — The deciding requirement is R22, and it decides by elimination rather than by score.** No weight-4 requirement separates the three shapes that clear the gate: each scores 19 of 20, each giving up its point somewhere different. The decision is therefore made in the ◕ 3 and ◑ 2 bands and by ADR-341's own toolkit criteria — which is worth knowing, because it means a single correction in the heavy band would not move the outcome, while a solved macOS bundle seal (R15) or a proven world-index route in a browser (R7) would each move a column by real points. Any future reopening starts there and at R22, not at the editor or the appearance system.

**D5 — This ADR stays a summary, and it owns the weighting.** The importance values in the Context are David's ruling and live here, not in the research records, so there is one place they can be read and amended. Measurements, commands, versions, hashes and per-host findings live in the four research directories named in the Context and are cited, never copied here. An amendment that restates a measurement has made this document a second source of truth for a number, which is how the two drift.

**D6 — Three platform findings are owed under whichever shape wins, and are not part of the shape ruling**: the testing harness has no browser entry point — browser-clean logic behind node-bound barrels (**GH #463**); the testing surface and the play client both hard-code a WKWebView-shaped bridge, which every non-WKWebView host has had to supply by name, a browser included (**GH #464**); and `story-loader` statically imports four `@sharpee/ext-*` packages regardless of a story's `use` declaration (**GH #465**). ADR-341 D3's contract module should own the post door in #464's place.

**D7 — Hatched TypeScript stories are not a tier boundary, and the finding is worth ◔ 1.** The 2026-08-13 brainstorm's §6 Option 2 — "hatched stories need Chord Writer for Mac" — is answered no on the evidence: a hatch transpiles, imports, executes and bundles in the page. It is recorded because it **closes a question that was expected to constrain the shape**, not because it supports D2: at weight 1 it earns no place among the grounds. A different boundary survives and is not decided here: whether an author should *write* TypeScript in a browser.

## Consequences

- **The macOS application is on a path to being replaced, and that is the most expensive consequence here.** Avalonia's entire value is one codebase; a Skia-rendered Mac app beside a shipping AppKit one is two codebases with none of the benefit. So retiring 18,921 lines of Swift and an app that ships at 1.4.0 stops being a question that can be deferred behind a parity milestone. Q-4 is where its timing is settled; nothing in this ADR authorizes it.
- **Windows was the critical path, and two thirds of it is now walked.** Every number in the Avalonia column *was* macOS evidence about a cross-platform toolkit; Phase 7 (2026-09-14) checked the three things that could not be inferred, and resolved all three — the first two favourably, the third against. For the record, the three were: whether the **WebView2** backend supplies a response where WKWebView does not (a door that exists on one platform and not the other answers ADR-341 D3 differently per platform, which is what D3 exists to prevent); `Setup.exe` with Azure Trusted Signing; and the vendored toolchain's Windows launcher, since `bin/sharpee` is a POSIX script (with GH #448 the other Windows-side unknown). Everything else in that column is toolkit behaviour that will reproduce or not for reasons unrelated to the OS. **Outcome**: the WebView2 door **exists** and is better than the macOS fallback; `Setup.exe` and the delta channel **work** (signing and installation still unrun, both needing David); and the toolchain launcher **does not port at all** — `tools/ide/vendor/node/` ships only `darwin-arm64` and `darwin-x64` tarballs, so there is no Windows Node asset to vendor, ahead of any shim question. That last item is now the largest unpriced item between this ruling and a Windows artifact, and it is not an Avalonia cost.
- **The macOS bundle layout is unpriced work sitting between this ruling and a shippable artifact.** Velopack cannot seal the bundle it produces; a shipping implementation must post-process it — move data and `toolchain/` to `Contents/Resources`, fix probing paths, then sign per-binary so the vendored toolchain keeps the seal `vendor-toolchain.sh` gave it and `node` keeps its own entitlements. `package.sh` already does this for the shipping app; Velopack does not provide it.
- **`tools/winide` stays reserved and empty**, and the WPF and OpenSilver spikes become archived evidence rather than abandoned work.
- **The pure web evaluation's own recommendation is superseded, not withdrawn.** `docs/work/web-ide-evaluation/decision.md` recommends the web shape on its own evidence and now carries a note saying it was not adopted and why. Its evidence stands and is what makes the web shape actionable without re-spiking if a D2 condition fails.
- **Nothing here authorizes implementation**, including in ACCEPTED form. Acceptance settles the shape; a plan settles the work.

## Session

Session **e3fbf7**, 2026-09-15, on `main`. Written at David's rule-11 confirmation with his instruction to keep the detail in the research. The evidence it summarizes was produced across sessions **4a2d5f** (WPF, 2026-09-08), **5c6bba** (OpenSilver, 2026-09-13), **3b49f8** and **356d47** (Avalonia, 2026-09-14; and web Phases 0–2), **989482** (web Phases 3–6, 2026-09-15) and this one (web Phase 7). Umbrella issue **GH #438** carries the outcome of all four evaluations. Session summary: `docs/context/session-20260914-2204-main.md`.

## Open Questions

- **Q-2 — If a condition fails, is the pure web application the fallback, and at what tier?** D2 names it as the standing answer. If it is taken up, the sub-question the weighting already sharpened returns: is a Chromium-class browser an acceptable requirement of that product (R20, and R1 at ● 4), with the private-storage tier as a preview rather than a second tier — or must that tier be a full product, which R1 and an unbuilt R12 say it is not today?
- **Q-3 — The felt comparison.** Does a Skia-rendered Chord Writer feel right on this Mac? D2's third condition, and the one no amount of further spiking answers. Two screenshots exist for it and the editor window can be typed into.
- **Q-4 — When is the macOS Swift app retired, and how is ADR-341 amended?** On acceptance, is D2/D4 of that ADR amended in place or superseded in part, and does D1's mirror framing become a replacement plan with a date, a parity bar, or neither?
- **Q-5 — Is the macOS bundle layout fixable by post-processing alone?** If the executable cannot be made to probe `Contents/Resources`, or Velopack's layout is not patchable around, O6 cannot ship on macOS and collapses to "a better WPF for Windows," which is a materially smaller claim than D2 makes.
- **Q-6 — Does the requirement list need maintaining?** R22 was added because the list could not answer this ADR's own question. Whether it also wants rows for verification burden and cost to deliver — both of which separated the shapes in discussion and appear nowhere in the table — is a question about the list, not about this decision.
