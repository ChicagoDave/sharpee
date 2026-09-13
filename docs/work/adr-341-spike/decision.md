# ADR-341 D2 — the toolkit decision record

**DECISION: WPF.** David, 2026-09-12, session `89f9e0` — **"wpf, agreed on the drawing
model"**. Both toolkits passed their spikes, so D2's mechanical rule did not resolve the
choice; David broke the tie, and the reason he named is §2's first ground: **AppKit's
`drawRect:` maps onto WPF's `OnRender`/`DrawingContext`, while WinUI 3 turns every drawn
mark into a retained element — a cost paid on every custom surface in the parity table
rather than once.** Recorded as his ruling, not inferred from the evidence.

**Written**: 2026-09-12, session `89f9e0`, on `main`.
**Sources**: `assumption-checks.md`, `wpf-spike.md`, `winui3-spike.md`,
`msix-packaging-check.md`, `parity-table.md`. Spike code under `tools/spikes/adr-341/`.

D2's rule is *"the toolkit whose spikes pass is the toolkit, and the record is the
reason, so the choice is never re-litigated from toolkit marketing."* It did not
anticipate both passing. This plan's Phase 6 text covers that case: *"if both pass, or
both partially fail, the record states that explicitly and names what broke the tie
(David's call, recorded as his, not inferred)."*

---

## 1. Per-control results

| Spike item | WPF | WinUI 3 | Discriminates? |
| --- | --- | --- | --- |
| **Editor — external tokenizer (D4)** | **PASS** — AvalonEdit via `IHighlighter` / `DocumentColorizingTransformer` | **PASS** — WinUIEdit via Scintilla container lexing (`SetILexer`/`StartStyling`/`SetStyling`) | **No — level** |
| Editor — highlight correctness | PASS (screenshot, both palettes) | PASS (screenshot, both palettes) | No |
| Style pass, same 1755-line file | 14.8 – 15.9 ms | 13.5 – 15.4 ms | **No — level** |
| **Custom drawing** (tab strip, World map) | PASS — immediate mode, `OnRender` + `DrawingContext` | PASS — **retained composition**, `Canvas` + `Shapes`, no `OnRender` equivalent | **Yes — WPF** |
| **Appearance, ADR-297 tokens** | PASS — pixel-exact both palettes; live flip free via `{DynamicResource}` | PASS at startup; **live flip needs rebuilding visuals** (no `Freeze`, no re-resolve on assignment) | **Yes — WPF** |
| Title bar follows appearance | FAIL without `DwmSetWindowAttribute` | FAIL without `AppWindow.TitleBar` work | **No — both** |
| Working set, comparable content | **105 MB** | **152 MB** | **Yes — WPF** |
| Project scaffolding | `dotnet new wpf` | hand-written `.csproj` (App SDK ships no CLI templates) | Yes — WPF (minor) |
| WebView2 pane hosting | PASS | not re-run — identical control, Phase 2 proved the hook | No |
| Project tree | PASS | not built (narrowed scope) | Not measured |

**Read the last two rows honestly.** Phase 4's scope was deliberately narrowed after
Phase 3 showed that building the sixth control teaches nothing about the toolkit. The
consequence is that the WinUI 3 record is thinner, and `winui3-spike.md` carries an
explicit warning that *"the WinUI 3 one felt raw"* is a fact about how much was built,
not about WinUI 3. **No felt assessment exists for either toolkit** — David declined
WPF's and WinUI 3 never had one — so at least the absence is symmetric.

## 2. The decision — **WPF** (David, 2026-09-12)

**Ruled: WPF.** David's words: *"wpf, agreed on the drawing model"* — endorsing ground 1
below as the deciding one. The recommendation and its counter-case are kept as written,
unedited, so a future reader can see what the choice was made against rather than only
what it was made for.

D2's mechanical rule does not resolve this: every spike passed on both toolkits. The
editor question — the one D2 ordered spiked *first*, and the one Phase 2's table implied
would decide it — came back **level**, and that is the single most important result of
the whole phase. D4 is satisfiable either way.

### What the evidence supports, stated as a recommendation and not as a finding

**My recommendation is WPF**, on three grounds, in order of weight:

1. **The drawing model matches what is being mirrored.** The macOS app is AppKit with
   many custom-drawn views (the World map, the tab strip, the line-number ruler, the
   candidate cards). AppKit's `drawRect:` maps almost line-for-line onto WPF's
   `OnRender`/`DrawingContext`. WinUI 3 has no equivalent: every drawn mark becomes a
   retained element with a layout pass, or you add Win2D. D1 says a feature is designed
   once and lands twice — this is a cost multiplier applied to **every custom surface in
   the parity table**, not a one-time difference.
2. **ADR-297 D2 requires the appearance change to apply *immediately*.** That is a
   product requirement already accepted, not a preference. WPF gives it for free through
   `{DynamicResource}`; WinUI 3 requires rebuilding the visuals that consume the tokens.
3. **The editor control's maturity.** AvalonEdit is MIT with 17.4M downloads against
   `WinUIEdit` 0.0.5-prerelease, whose own README says *"not production ready. Breaking
   API changes are very likely at this stage."* Chord Writer is a shipping product
   (1.4.0); its Windows mirror should not be the first serious consumer of a pre-1.0
   control with one maintainer.

Memory (105 vs 152 MB) and scaffolding friction point the same way but are not load
bearing.

### The strongest case against that recommendation

**WinUI 3 is where Microsoft is going, and WPF is explicitly maintenance-grade.**
`microsoft/WindowsAppSDK` was pushed the day of this check; AvalonEdit's upstream has not
been pushed in **282 days**. Choosing WPF is choosing a stable platform whose editor
component may be unmaintained, over an evolving platform whose editor component is
immature. Those are different risks, not one better and one worse.

**The mitigation that makes the recommendation defensible**: AvalonEdit has an active
downstream consumer (`RoslynPad`, 2814★, pushed 10 days ago) shipping its own
AvalonEdit-based editor package, and Actipro's commercial `SyntaxEditor` (26.1.0,
published 2026-09-04) is a supported fallback that also takes custom lexers. WinUIEdit
has no comparable fallback that is still a *native* editor — the alternatives are Monaco
in a WebView2, which conflicts with D4 and with D3's reservation of WebView2 for the
three panes.

### What would change the recommendation

- If the Windows app should look like a **modern Windows 11 app** rather than a mirror of
  the macOS one, D1's premise weakens and WinUI 3's Fluent defaults start earning their
  cost. **That is a product question for David, not an engineering one**, and it is the
  most likely reason to overrule the above.
- If a felt comparison is wanted, the only honest way to get one is to bring the WinUI 3
  build up to the WPF build's level and use both. That is roughly another session's work
  and should be a deliberate decision, not inferred from two records of unequal depth.

## 2a. Two rulings David added when taking the decision (2026-09-12)

### "I would build custom controls if we need them"

Followed by: *"WPF is mature and writing C#/XAML custom controls should be workable."*

Both are David's, and together they are the reasoning behind the ruling rather than a
footnote to it: the choice rests on the **toolkit's** maturity and on custom controls
being a normal thing to write in it — not on which third-party components happen to
exist today.

This **changes the weight of ground 3**, and in WPF's favour rather than against it.

Ground 3 treated editor-control maturity as a reason to prefer WPF, and §5 names
AvalonEdit's 282-day-quiet upstream as the one real concern on that side. If building a
custom control is acceptable when needed, that concern is much smaller: the failure mode
is not "the Windows editor becomes impossible" but "the Windows editor costs more."

It also removes an asymmetry the record had. WinUIEdit's `0.0.5-prerelease` status was
weighed as risk partly because it has **no native fallback** — only Monaco in a WebView2,
which conflicts with D4. Under this ruling both toolkits have the same fallback, which
is to write the control. WPF still wins ground 3, but on cost rather than on viability.

**What does not change**: grounds 1 and 2, which are about the toolkit itself rather
than about what is available for it. A custom control on WinUI 3 is still composed from
retained elements, and ADR-297's live flip is still manual there. The deciding ground
David named is untouched.

### "Possibly support OpenSilver"

Recorded as a live consideration, **not decided here** — ADR-341's Scope explicitly
leaves the browser tier alone (ADR-191 is the in-browser playground, and the
2026-08-13 brainstorm's §12 stands for the browser tier only).

Health-checked 2026-09-12: `OpenSilver` **3.3.3**, published 2026-01-15, MIT, 50
versions, ~111k downloads, repository pushed **1 day** ago, 1266★. Actively developed,
not a dormant project.

**And it is not hypothetical here — David has already shipped a product on it.**
Evidence he supplied: <https://secretletter.plover.net/>, the restored *Jack Toresal and
The Secret Letter* (Textfyre, 2009; story David Cornelson, writing Michael Gentry,
sketches Erika Swanson). The page states the restoration runs on **OpenSilver in the
browser** and **Tauri for native desktop packaging**, and ships browser, `.msi`, `.dmg`,
`.deb` and AppImage builds.

The Windows artifact was inspected directly (`Secret Letter_1.8.0_x64_en-US.msi`,
56.1 MB, dated 2026-03-13, SHA-256 `70BBA106…`): a **WiX-authored MSI** containing a
single self-contained 60.8 MB `secret-letter.exe` — confirmed Tauri by its embedded
`tauri`, `wry`, `rustc` and `cargo` strings — rendering through **WebView2**, publisher
`textfyre`. No vendored Node in the payload.

**What that evidence does and does not establish for this decision:**

- **It makes the OpenSilver option a known quantity rather than a bet.** The toolchain
  works, it is in production, and the team has hands-on experience with it. That lowers
  the risk of the "keep an OpenSilver target reachable" question below.
- **It independently corroborates Phase 2's assumption 2 in production**: WebView2 was
  already the rendering surface of a shipped Sharpee-adjacent Windows product, not only
  of a spike.
- **It is proven prior art for D7's "conventional installer" candidate.** A WiX MSI
  already ships for a Windows product of David's. It says nothing about the *update
  channel*, which is D7's actual point of difference.
- **It does not bear on the vendored-toolchain cost.** This is a *story runtime*, which
  needs no Node; Chord Writer vendors Node because it **builds** stories. Reading
  "a Windows Sharpee artifact is 56 MB" against ADR-341's 171/187 MB figure would be
  comparing a published story to an IDE.
- **It is not a counter-argument to D2's rejection of Tauri.** D2 rejects Tauri *for the
  IDE shell*, on the grounds that a native shell around web panes is the proven shape.
  A story runtime is a different product with different requirements, and this artifact
  is one.
- **Lineage caveat, open**: Secret Letter originated as a 2009 Textfyre title, and
  OpenSilver's designed use case is restoring **Silverlight** XAML. If the restoration
  descends from Silverlight source, it demonstrates OpenSilver in its sweet spot rather
  than demonstrating that a **WPF** codebase ports to it — which is the question caveat 1
  below actually turns on. **Not verified here; David knows the answer.**

**Why it points the same way as the decision**: OpenSilver is XAML-lineage and compiles
XAML + C# to WebAssembly, so a WPF-shaped codebase is closer to it than a WinUI 3 one is
— which makes the WPF ruling cheaper to extend to a browser tier later, if that is ever
wanted.

**Three caveats, because the record should not oversell this:**

1. **OpenSilver is not a WPF drop-in.** Its compatibility lineage is Silverlight XAML,
   with WPF support growing rather than complete. "A WPF app also runs on the web" is not
   what it offers, and planning as if it were would repeat the pattern
   `docs/core-concepts` warns about — building a claim from an adjacent fact.
2. **The very thing that decided WPF is the least portable part.** Ground 1 is
   immediate-mode `OnRender`/`DrawingContext` drawing, used here for the tab strip and
   the World map. Custom drawing against a WPF `DrawingContext` is exactly the surface
   least likely to port cleanly to a WebAssembly XAML runtime. If OpenSilver ever
   becomes a real target, the custom-drawn controls are the work item, not the free part.
3. **The web-tier argument is not one-sided, and the record should say so.** The
   WinUI-lineage equivalent is **Uno Platform** (Apache-2.0, **10,048★**, pushed the day
   of this check) — substantially larger and more active than OpenSilver. Had a browser
   tier been weighed as a primary criterion, it would not obviously have favoured WPF.
   It was not weighed at all, because ADR-341 scopes the browser tier out; noting it here
   keeps a future reader from inferring that WPF won a web-portability argument it never
   had.

**Possibly ADR-worthy, and not written**: whether Chord Writer's Windows codebase should
be structured so an OpenSilver target stays reachable is a decision that would constrain
future sessions — it shapes how much logic may sit behind `OnRender`, and whether the
shell keeps a portable core. Raised for David; no ADR opened on it in this session.

**The shipped Secret Letter restoration raises the value of asking that question now
rather than later.** Structuring for portability is cheap at the start of a codebase and
expensive once the custom-drawn controls exist — and the custom-drawn controls are
precisely what ground 1 commits this project to building. If an OpenSilver target is
ever wanted, the decision point is before `tools/winide` has content, not after.

## 3. Assumption results (Phase 2, carried verbatim)

**Assumption 1 — a .NET tree-sitter binding exists and loads a grammar: PASS.**
`TreeSitter.DotNet` 1.3.0 ships `win-x64` natives plus 30 grammars in one package, zero
dependencies, `netstandard2.0` so both toolkits consume it. Loads by name and by
arbitrary path (the ADR-182 / Chord route), and the query API returns correct captures
with byte ranges.

**Assumption 2 — WebView2's resource-request hook can satisfy the D3 host contract:
PASS.** `AddWebResourceRequestedFilter` + `WebResourceRequested` serves a pane directory
over a custom HTTPS origin, resolves and applies relative URLs, answers a request
entirely from memory (the subprocess-results half of D3), and persists `localStorage`
across a process restart.

**Assumption 3 — vendored x64 Node under Windows-on-ARM emulation: WITHDRAWN, not
unverified.** ADR-341 D6 was amended 2026-09-11 (David: *"we indefinitely deferred ARM on
Windows"*) to defer Windows on ARM indefinitely; the ADR now asserts nothing about ARM,
so there is no assumption to check. **This must not be reported as an open gap.**

**Two corrections the spikes made to their own earlier records**, both struck through in
`assumption-checks.md` rather than silently edited:

- The 1 µs reparse figure was measured on a **four-line document**. The real cost is
  **~15 ms** on a 1755-line file, in *both* toolkits — the O(document) highlight query
  in the harness, not the parser and not either editor.
- WinUIEdit's styling was described as reachable only "through a raw message interface".
  It is **typed** — 1003 WinRT members projected from Scintilla. That claim had been
  inferred from the README instead of measured.

## 4. D7 MSIX result (Phase 5, carried verbatim) — **evidence, not a decision**

**MSIX is viable. Both checks PASS under a real signed package installed to
`C:\Program Files\WindowsApps`** (`IsDevelopmentMode: False`), not a developer loose
registration.

- **(a)** A real vendored `node-v22.23.1-win-x64` (83 MB) executed from inside the
  packaged install location: exit 0, `v22.23.1`/`x64`. No shim, no copy-to-temp.
- **(b)** `Documents\<Story Title>\` written and read with **no redirection**, and a
  sentinel written by the packaged app was read back by an ordinary **non-packaged**
  process. `runFullTrust` buys this; no `documentsLibrary`, no `broadFileSystemAccess`.

**D7's choice between MSIX-with-appinstaller and a conventional installer plus an
appcast updater is the later shell plan's, not this record's.** What this establishes is
only that MSIX does not disqualify itself on packaging or filesystem grounds. The update
channel — D7's actual point of difference — was **not** tested, nor was Azure Trusted
Signing (run 3 used a locally-trusted self-signed certificate) or Store submission.

**One finding for the shell plan**: under packaging a child process's cwd is
`C:\windows\system32`, where the unpackaged baseline inherited the project directory.
The macOS app has **seven** subprocess sites; each must set `WorkingDirectory`
explicitly rather than inherit it.

## 5. Dependency health, re-confirmed at decision time (2026-09-12)

| Dependency | Latest | Published | Repo last push | Read |
| --- | --- | --- | --- | --- |
| `AvalonEdit` | 6.3.1.120 | 2025-04-12 (**517 d**) | 2025-12-04 (**282 d**), 2081★ | **The one real concern on the WPF side.** Mitigated by RoslynPad (2814★, 10 d) and Actipro as a paid fallback. |
| `WinUIEdit` | **0.0.5-prerelease** | 2026-07-03 (70 d) | 2026-07-03 (70 d), 218★ | Active but pre-1.0, self-declared unstable, single maintainer. **The one real concern on the WinUI 3 side.** |
| `Microsoft.WindowsAppSDK` | 2.4.0 stable (2.4.1-experimental) | 2026-08-25 | **2026-09-11 (0 d)**, 4681★ | Healthy and actively developed. Note ADR-341's Context records "1.8 stable, 2.0 preview" — that snapshot has aged. |
| `Microsoft.Web.WebView2` | 1.0.4191.47 stable (1.0.4255-pre) | 2026-09-11 | — | Healthy. Used identically by both. |
| `TreeSitter.DotNet` | 1.3.0 | 2026-01-22 (232 d) | 2026-01-22 (232 d), **35★** | **A shared risk, not a discriminator.** Load-bearing for D4 on *both* toolkits, with one maintainer and 35 stars. `CycoDevTreeSitter` is a fork published more recently (2026-07-28). Worth watching whichever toolkit is chosen. |

The `TreeSitter.DotNet` row deserves attention independent of this decision: D4's
one-grammar rule rests on it for both native shells, and it is the least-supported
dependency in the set.

## 6. The ADR-154 note

ADR-341's Consequences assign this phase a one-line note beside ADR-154's deferral bullet
(`adr-154-sharpee-ide.md:150`). **Written 2026-09-12** — and it is independent of the open
tie above: ADR-154 deferred *Electron vs Tauri vs native*, and ADR-341 D2 already closes
that as **native C# on .NET** for Windows regardless of which toolkit wins. No other
ADR's Status changes, per ADR-341's own Consequences.

## 7. What is still owed when the tie is broken

1. Record David's choice and his reason here, as his.
2. Delete the losing spike from `tools/spikes/adr-341/`, keeping this record.
3. ADR-341 D2 is then closed on evidence, and D8's order moves to its next step —
   **ADR-182 in the Swift app**, which must exist before a second editor consumes it.
