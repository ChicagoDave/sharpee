# ADR-301: The IDE Testing Surface

**Status**: ACCEPTED (2026-08-06, session 7f4a36) — the Testing tab is a web bundle in
the IDE's `WKWebView` (D1); the branch view is Miller columns (D2) with three view modes,
each earning a shape (D3); the mode never switches itself (D4); explorer findings are
adopted as documents (D5); run-coalescing in the column layout is rejected and the trigger
that would revive it is named (D6). The *editing* interaction is deliberately not decided
here — see "The next decision".

**Date**: 2026-08-04 (placeholder, session 5113ca) · decided 2026-08-06 (session 7f4a36)
**Depends on**: ADR-300 (the model, serializer, grammar, and channel addressing), ADR-302
(the tree this surface renders), ADR-277 D1 as amended (the run-event stream it consumes)

> **Scope widened 2026-08-06.** This file was created as a placeholder titled "The
> Sharpee Transcript Editor" and decided nothing; its one job was to name the question
> that had to be answered before anything was built — *what hosts it?* That question is
> answered by D1, and the surface decisions that clustered around the answer are recorded
> here with it. The editing interaction the original title named is now the next
> decision, not this one.

> **This number was previously used for something else.** An earlier ADR-301, "The
> Opening as Addressable Channels," was deleted; all eleven of its decisions live in
> ADR-300 as D6–D16. Session notes from 2026-08-04 that cite ADR-301 mean that document,
> not this one.

---

## Context — verified, not assumed

**The question this file was created to hold.** The removed ADR-300 editor specification
assumed a standalone, CLI-hosted web tool and never settled what the CLI would serve that
interface *to*. A web UI needs a host that owns a web view; an editor needs to write
files; verification needs the engine. Nothing decided that, and this file said "do not
start building until this is answered" for two days.

**What forced the answer.** The IDE Testing wire (ADR-277 D1 as amended 2026-08-06) now
carries tree records — parentage, `unreached`, replay marking — so a view can finally
render a run. Building that view requires knowing what hosts it, so the question stopped
being deferrable.

**Where these decisions had been living.** D2's Miller-column treatment was David's call
in session f2a7e6, made against a layout study that measured three layouts at the real
Fernhill shape. **That study and its companion Testing-tab mock were published as
artifacts and deliberately never committed** (session 1707 §7). The only trace in the
repository was a parenthetical in ADR-303 D2 pointing at "the session f2a7e6 layout
mocks". On 2026-08-06 a session surveyed `docs/work/`, the ADRs and the session
summaries, found nothing, and rebuilt the branch view as a vertical indented tree — one
of the layouts the study had explicitly rejected. Recording the decisions here is the fix
for that class of loss, and ADR-303 D2's parenthetical should now cite this ADR rather
than a mock.

---

## Decision

### D1 — The Testing tab is a web bundle in the IDE's existing `WKWebView`

Not a native AppKit surface, not a standalone CLI-hosted tool, not VS Code. Reasons in
weight order:

1. **The surface was designed in HTML.** Five layout mocks and two Testing-tab studies
   exist, all authored as web pages against the IDE's own tokens. That is the strongest
   available evidence about what the surface wants to be.
2. **The pattern is proven and on disk.** The Play pane already owns a `WKWebView` served
   over a custom scheme handler (`sharpee-play://`, `PlayURLSchemeHandler`), because
   `file://` gives a null origin and breaks storage APIs.
3. **The work suits HTML.** Cards with in-place assertion editing, diffs, and document
   grids are routine in HTML and laborious in AppKit.
4. **It satisfies DEVARCH 8b instead of waiving it.** A TypeScript consumer imports
   `@sharpee/ide-protocol` **directly**. ADR-277 D1 originally required the wire be
   mirrored into Swift `Codable` structs "pinned by tests on both sides" — two files that
   can silently disagree, a language boundary being the only reason to accept it. A web
   consumer removes the mirror rather than maintaining it.

**Consequence for the Swift side**: `tools/ide/SharpeeIDE/Test/TestResultRecord.swift` is
retired *for the tab*. See Amendment A1 — building the tab found that it is not retired
outright.

> **Amendment A1 (2026-08-06, session 322542) — the Swift mirror survives, narrowed.**
> This decision said the mirror was retired and that deleting it was a confirmation step
> away. Implementing the tab showed that claim was too broad, and the evidence was a red
> test suite: `xcodebuild test` stood at **508 tests, 21 failures**, every one of them
> `schemaVersionMismatch(found: 2, expected: 1)`. The failures were not in the Tests
> panel. They were in **Skein replay verification** (`ReplayDriver`, ADR-299) and
> **re-bless** (`Rebless`, ADR-282 D2) — two Swift subsystems that drive a real
> `sharpee test --json` run and read its per-command results, and which have no
> TypeScript consumer to import the wire into. Deleting the mirror would have taken both
> with it.
>
> **A1.1 (same session, later).** The skein was then retired outright on David's
> confirmation (ADR-300 D1), which took `ReplayDriver` with it, leaving re-bless as the
> mirror's only consumer.
>
> **A1.2 (same session, later still) — the mirror is gone.** David retired the outline
> Test panel too. Re-bless was reachable only through that panel, so retiring the tab
> retired the feature, and with the feature went its reader: `TestResultRecord.swift`,
> `Rebless.swift`, `TestPanelModel.swift`, `RecordingSession.swift` and the panel itself
> are deleted. **Nothing in Swift decodes the run-event wire any more** — `TestRunner` is
> line transport and the tab is the only consumer, which is what D1 set out to achieve and
> A1 could not yet deliver.
>
> The cost is stated rather than buried: **re-bless does not exist right now.** ADR-282
> D2's drift lifecycle has no surface until the editing decision builds one, and it should
> be rebuilt against ADR-300's canonical TypeScript serializer rather than by restoring a
> Swift mirror of it.
>
> What D1 actually buys is narrower and still worth having: the **tab** has no Swift
> mirror in its path — it receives raw NDJSON lines and decodes them with the wire's own
> `isRunEvent` — and the mirror no longer has to track the whole wire for a panel's sake,
> only what those two consumers read. The mirror was migrated to schema 2 rather than
> deleted (`phase`, `progress`, `coverage`, `unreached`, `replayed`, `parent`,
> `totalUnreached`), and `xcodebuild test` is **521 tests, 0 failures**.
>
> The general shape of the lesson: rule 8b's fix is available to a consumer that shares
> the language. Where it does not, the mirror is the cost of the boundary, and the honest
> move is to narrow and pin it — not to declare it retired because one of its consumers
> found a better route.

Rejected: **native AppKit** — `TestPanelView` is already an `NSOutlineView`, so List mode
is nearly free there, but the document grid and the editor are not, and splitting the tab
across two UI technologies to save one of three modes is a poor trade. **CLI-hosted
standalone** — `dist/cli/sharpee.js` is a testing tool, not an authoring product; a GUI on
it serves nobody's workflow. **VS Code** — the extension already owns `.transcript` and
registers webview providers, but plain-TypeScript authoring there is not a priority, and
the platform is secondary to Chord and the IDE.

### D2 — The branch view is Miller columns, with Finder semantics

(David's call, session f2a7e6, against the layout study.) One column per level of the
selected path; the last column is a preview pane holding the selected node's turns; the
view auto-shifts left as you descend, so ancestors slide off rather than the window
growing. A row carries: status dot, stem, a **subtree-failure count**, a `replay` tag, its
assertion count, and a chevron when it has children.

**Why it won.** Ancestry *is* the selected path, so it needs no highlight and no lineage
palette; a 12-way fan is one scrolling column. The measured alternatives both lost on
vertical extent tracking **leaf count** rather than depth — Fernhill's 19 leaves cost the
horizontal canvas ~800px, and lineage colour would have needed 12 hues for a single
fan-out.

**The subtree-failure count is required, not decorative.** Miller shows only the selected
path, so a failure in an unexplored branch is otherwise invisible. Finder has no answer
to this because directories have no pass/fail; the count on the parent row is the fix.

### D3 — Three view modes, each earning one shape

A single global layout was the wrong question: the right layout is a function of the
**shape of the suite**, and one project holds several shapes. Finder ships four view modes
for exactly this reason.

| Mode | The shape it serves | Why |
| --- | --- | --- |
| **Column** | a fan (wide, shallow) | siblings fill one column with the preview beside them; Fernhill is 12 children off `arrival` at depth 3 |
| **List** | a chain (narrow, deep) | the whole chain is on screen in order, with your position in it plain — the thing Column gives away |
| **Documents** | peers, and adoption | a transcript is a file you commit, diff and hand to CI; this is also the only surface D5 can work on |

**List is nearly free**: `TestPanelView` is already an `NSOutlineView` two levels deep
(entries → their commands). What it lacked was a level *above* — entry-to-entry parentage
— which is exactly the `parent` field the amended wire now carries.

**The horizontal canvas does not return.** It lost on extent in the fan case, which is the
case Column and Documents both already serve. It has no shape left to be best at.

### D4 — The view mode never switches itself

Default **Column**; the choice is remembered per project; the author switches it.
Selecting the mode from the shape of the tree is tempting and rejected: a view that
rearranges itself when you add a test is a view you stop trusting. A shape/mode mismatch
may be *hinted*; it is never acted on.

### D5 — Explorer findings are adopted as documents

ADR-299 reserved `origin: author | explorer` on every node so a machine-proposed thread
could be adopted, and **nothing ever set it across nine phases** — because a badge on a
tree node cannot express "read this whole proposed path and keep it or bin it." A document
can. The explorer (ADR-131 / ADR-294 §175) emits *proposed transcript files*; they appear
in the Documents grid as a distinct group, and Accept commits the file into the suite
while Discard deletes it. That is the whole interaction.

This costs nothing now — the explorer is unbuilt — but it settles where its output lands,
and pairs with the `explore` run mode and denominator-free budgeted `progress` already in
the run-event vocabulary.

### D6 — Run-coalescing in the column layout is rejected

A deep chain in Column view shows two steps of the chain with the rest shifted off. The
considered fix was to let a run of single-child levels share one column, on the reasoning
that a column exists so you can pick among siblings and a level with one child offers no
choice. **Rejected**, because D3's List mode already serves a chain, and a switcher beats
a special case buried in a layout.

Two things this preserves. **Run-folding stays killed** — hiding a chain behind
"+ 14 more" was built and removed at David's request as the one departure from Finder,
and any revival must still hide nothing. And **the shape may never occur**: normalized
branch testing does not produce deep single-child runs. A long walkthrough splits where
state is worth hanging tests off, and a node with children is exactly where a column earns
its width; Fernhill's spine bears this out — `arrival` is 2 commands with 12 children,
`key` is 2 commands with 4. No v2 suite is deeper than 3.

**The trigger that would reopen this** is narrow and specific: a real Chord suite with a
run of **single-child** levels more than three deep. Depth alone is not the trigger — a
deep spine that branches at every joint is what Column view is for.

> Dungeo is not evidence here. Its 17 walkthroughs form a depth-17 chain, but ADR-302 D12
> keeps it on v1 **indefinitely**, the IDE never tests it, and D9 states that no branch,
> chain, or tree design is to be shaped by its corpus. A draft of the study behind this
> decision did exactly that and was rewritten.

---

## Acceptance

1. The Testing tab renders from a web bundle served over a scheme handler, importing
   `@sharpee/ide-protocol` with no Swift mirror of the wire types.
2. A real `sharpee test --tree --json` run renders live: the tree fills as nodes execute,
   replayed executions are marked and not read as duplicate turns, and the tab's
   independently recomputed totals match the reporter's authored/replayed split. (The
   story is a fixture the suite owns — see Amendment A2. Agreement with the reporter is
   the criterion; the particular story is not.)
3. A deliberately broken interior node renders **one** failure plus a blocked count, with
   its blocked descendants present and marked `unreached` — never absent, never red.
4. A subtree failure off the selected path is visible as a count on the parent row.
5. All three modes render the same selection, and switching modes preserves it.
6. Double-clicking a node in any mode opens its document: every turn with its source line,
   and click-through to `file:line`.
7. `xcodebuild test` green — the only gate, since there is no CI.

**Met 2026-08-06 (session 322542)**, by `SharpeeIDETests/TestingTabRealPathTests.swift` —
a rule-13a suite in which nothing this repository owns is stubbed: the bundle under test is
the one shipped in the app, served by the real scheme handler into a real `WKWebView`,
rendering a real `sharpee test --tree --json` run of a real story (originally
`branch-stories/fernhill`; a frozen snapshot of it since Amendment A2) driven through the
real `TestRunner`, with every assertion read off the **rendered page**.
Per criterion: **1** the page reports `location.protocol === "sharpee-test:"` and carries
the wire's own guard; **2** the tab recomputes `552` / `518 authored · 34 replayed` from
the stream and agrees with the reporter, with replayed executions tagged and `arrival`
still showing its 2 turns once; **3** a deliberately broken `key` (an interior node with
four children) renders exactly `1` failure with its descendants present and classed
`unreached`, never `failed`; **4** `arrival` carries the badge `1` for the failure beneath
it; **5** all three panes render and `key` stays selected across every switch; **6**
double-clicking `concealment` lists all 16 turns and clicking the first line number
reaches the host as `concealment.transcript:12`; **7** the whole suite at **521 tests, 0
failures** (from a 508/21 baseline — see Amendment A1).

> **Amendment A2 (2026-08-07, session a9d8ca) — the acceptance story is a fixture the suite
> owns, not the author's.**
> Acceptance was recorded against `branch-stories/fernhill` itself. That coupled this ADR's
> evidence to a live author story, and go-live Phase 8's plan
> (`docs/work/ide-go-live/plan-20260806-go-live.md`, Phase 4) moves all 22 of Fernhill's
> transcripts out of the story and rewrites them from scratch — which would have taken the
> suite with it, twice: once when the files vanish, and again when the rewrite lands a
> different tree shape than the pinned constants (`552` / `518 + 34`, 22 nodes, 5 roots,
> `arrival` 2 commands, `concealment` 16 turns at line 12).
>
> The suite now runs against `tools/ide/test-fixtures/fernhill-frozen/` — a frozen snapshot
> of Fernhill taken 2026-08-07, holding only `fernhill.story` and `tests/` (23 files, 124K;
> `assets/`, `browser/` and `dist/` are unnecessary for a `--tree` run, verified by running
> it). Because the snapshot is frozen, every assertion above remained valid **unchanged** —
> the numbers in this section still describe exactly what runs.
>
> Two things this also fixed. The broken-interior-node test writes a corrupted
> `key.transcript` and restores it in a `defer`; it now mutates the fixture rather than the
> author's story, so a crash between the two cannot damage real work. And the fixture sits
> outside `tools/ide/project.yml`'s `sources: - path: SharpeeIDETests`, so XcodeGen never
> enumerates it and no build-phase exclusion was needed.
>
> Evidence: `xcodebuild test -only-testing:SharpeeIDETests/TestingTabRealPathTests` →
> `** TEST SUCCEEDED **`, `Executed 7 tests, with 0 failures`, 2026-08-07. The fixture's own
> run: `node packages/devkit/dist/cli.js test fernhill.story --tree` → exit 0, `22 passed`,
> `552 commands (518 authored + 34 replayed)`.
>
> **Criterion 2 was reworded accordingly**: agreement between the tab's recomputed totals
> and the reporter is the acceptance property. Naming a story there was always incidental.

---

## Consequences

- **ADR-277 D1's Swift-mirror requirement is retired** by D1 *for the tab*; see Amendment
  A1 for what survives. Its record stream was already superseded by the run-event stream
  in the same session.
- **ADR-303 D2's parenthetical** on Miller columns should cite this ADR instead of the
  session f2a7e6 mocks.
- **`tools/ide/SharpeeIDE/Skein/`** (12 Swift files) was superseded and is now **removed**
  (2026-08-06, on David's confirmation — see ADR-300 D1 for scope and for what survived).
  `TestResultRecord.swift` is **not** superseded — Amendment A1/A1.1.
- **The tab needs a build step** — TypeScript compiled and bundled into the app's
  resources — which the IDE does not have today. That is new build surface, not just new
  UI. *Built 2026-08-06*: `tools/ide/web/testing-tab/build.mjs` (one esbuild pass, aliased
  at the wire's SOURCE so `dist-esm` staleness cannot reach the tab), run from a pre-build
  script on every `xcodebuild`. Its output is committed, unusually for build output,
  because XcodeGen resolves the folder reference at generate time and a gitignored folder
  would silently produce an app with no Testing tab.
- **The Test panel is still on screen.** The tab ships the *reading* half; the outline
  panel still owns ADR-282 D2's re-bless, which the editing decision covers and this one
  does not. Both are fed from one run — the panel by the mirror, the tab by raw lines.
  Retiring the panel waits on the editing surface, not on this ADR. That retirement now
  carries the Swift mirror with it (A1.1), which makes the editing decision the last thing
  standing between this repository and a single decoder for the run-event wire.
- **Design decisions made in artifacts must be folded into an ADR.** The Context section
  records what it cost when they were not.

---

## The next decision — the editing interaction

Deliberately out of scope. This ADR decides the tab; how a transcript is *edited* in it is
the next decision, and these ideas from ADR-299 survive as design for it:

- **Play authors the transcript.** Writing one by hand means typing commands blind and
  pasting expected output; promoting a played session is the genuinely valuable idea and
  the reason to build an editor at all.
- **Card per turn**, carrying command, expected output, actual output, and verdict —
  verdict as tint, plain when unblessed, green when blessed.
- **`contains` by selection, not by typing.** Select text in the actual output and the
  editor writes `[OK: contains "…"]`. Accepting a whole response with nothing selected
  writes `[OK]` plus a literal block. This is the default gesture because the `contains`
  family is 92.6% of all assertions in the corpus.
- **A `[GOAL:]` section is a unit** — created and deleted whole, so no gesture leaves an
  orphan.
- **Removed grammar is unreachable by construction** — no free-text mode that could type a
  form the grammar no longer accepts.
- **Drift is re-bless**: locate the block a command owns, replace only its content, and
  refuse to widen a `contains` claim.
- **The generated source is visible** — a read-only pane showing exactly what ADR-300's
  serializer will write, beside the cards.

---

## Session

Placeholder created in session 5113ca (2026-08-04, branch `main`) when the earlier
ADR-300's editor program was dismantled and its channel/transcript decisions consolidated
into the new ADR-300. Two numbers were reused in that consolidation: this file took 301
from the deleted "Opening as Addressable Channels," and the 302 number informally reserved
during session 088e3e for dissolving `main` is unused — that work is ADR-300 D8.

Decided in session 7f4a36 (2026-08-06, branch `feat/adr-300-302-channels-branch-tester`),
after the run-event spine (ADR-277 D1 amendment, plan
`docs/work/ide-testing-wire/plan-20260806-run-event-spine.md`, Phases 1–4) made a
renderable tree available. Under David's standing directive of 2026-08-05 that for the IDE
and the platform API everything is on the table and ADR imperatives do not bind the work,
this ADR's own "do not start building until this is answered" was treated as a question to
answer rather than a gate to wait behind.

Working mocks, committed rather than left as artifact URLs:
`docs/work/ide-testing-wire/testing-tab-mock.html` (all three modes over the real 22-node
Fernhill suite and its 518 authored turns, with document open),
`branch-view-modes.html` (D3/D5), `miller-columns-deep-chain.html` (D6).
