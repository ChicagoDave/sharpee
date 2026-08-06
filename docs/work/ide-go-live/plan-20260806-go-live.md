# Sharpee IDE — Go-Live Plan

Plan for the seven items in `todo-list.md`. Written 2026-08-06.

The list is the source of truth for *what* and *why*; this is *in what order*
and *how we know each is done*. Decisions already made are recorded there and
are not re-litigated here.

**Nothing in this plan is started without David's go-ahead per phase.**

---

## Ordering

The dependencies are real, not bureaucratic:

```
Phase 1  Modal landing page            (item 6)     no dependencies
Phase 2  Documentation audit           (item 2a)    no dependencies
Phase 3  Documentation tab             (item 2b)    needs Phase 2
Phase 4  Transcript discovery pass     (item 7.1)   no dependencies
Phase 5  Transcript editor             (item 3)     needs Phase 4
Phase 6  Transcript acceptance pass    (item 7.2)   needs Phase 5
Phase 7  Publish tab                   (item 1)     needs scoping first
Phase 8  DMG                           (item 4)     needs Phases 3 and 6
```

Phases 1, 2, 4 and 7's scoping step are independent and can run in any order or
together. Item 5 (the diagnostic wording) is a one-line change gated on a
decision, not a phase — fold it into whichever phase is running when David
rules on it.

Two orderings matter and are easy to get wrong:

- **Phase 4 precedes Phase 5.** Writing Fernhill's transcripts back by hand is
  what tells us what the editor should be. Building the editor first means
  designing from a blank page.
- **Phase 2 precedes Phase 3.** There is no point building a documentation
  surface before deciding which corpus it shows, given what Phase 2 will find.

---

## Phase 1 — Modal landing page (item 6)

**Goal.** The app launches into a modal landing page instead of silently
reopening the last project.

**Scope.**

- New modal window shown at launch: recents list (5), **Open**, **Create
  Story**, **Close Chord Writer**.
- Recents from `RecentProjectsStore` (already exists, caps at 10 — show first
  5). `SessionState.projectURL` stops being the launch path and becomes an
  entry in the list.
- Create Story: title field plus location field defaulting to
  `~/Documents/{story title}/`, mirroring the title until the author edits the
  location, then mirroring off permanently. Scaffolding is
  `StoryScaffold` (already exists); its default destination changes.
- Dismissed once, gone until next launch. No summon-back shortcut.

**Out of scope.** News / Advice / Community sections from the Inform launcher.
Sample-project listing arrives with Phase 8.

**Acceptance.**

- Launching with a saved session shows the modal, not the project.
- Picking a recent opens it, and `SessionState` still restores its tabs,
  expansion and pane visibility.
- Create Story with a title produces a story at the mirrored location; editing
  the location then editing the title again leaves the location alone.
- Closing the last story window quits (already true — confirm unchanged).
- Tests drive the real modal, not a stub, in the style of the existing
  `SnapPanesSettingTests` / `ProjectPaneCollapseTests`.

**Before starting.** Check David's IDE mock artifacts — IDE surface design
lives there.

**Open.** Sanitising the mirrored default for path-illegal characters and
length. Default-quality, not correctness, since the location is editable.

---

## Phase 2 — Documentation audit (item 2, first half)

**Goal.** Decide what the IDE's documentation *is*, before building anything
to show it. This phase produces a decision document, no UI.

**Why it is its own phase.** The corpus is large and its currency is uneven:

| Source | Size | State |
|---|---|---|
| `docs/reference/` | 8 files, ~9,530 lines | `chord-language.md` says **Chord 1.4.0**; the IDE status bar reports **Chord 3.0.0** |
| `docs/book/v2.0.0/` | 31 chapters over 8 parts | Complete and QA'd as of 2026-06-23 |
| sharpee.net | — | The maintained home for author docs |
| `packages/sharpee/docs/genai-api/` | generated | Repo-only, aimed at agents, not authors |

Shipping a documentation tab pointed at a stale corpus is worse than shipping
none: it makes the IDE authoritative about things that are no longer true.

**Scope.**

- Establish which sources the IDE ships, and at what version.
- Establish how they stay current — bundled at build time, fetched, or a
  pointer to sharpee.net. This decides whether stale docs are a release
  problem or a runtime one.
- Quantify the `chord-language.md` gap: 1.4.0 → 3.0.0 is two language
  versions. Is the fix a refresh, a regeneration, or a redirect to sharpee.net?
- Decide what an author actually needs at their desk while writing: language
  reference, stdlib reference, transcript-testing guide, and the book are four
  different jobs and may not all belong in the same surface.

**Acceptance.** A written decision covering: sources shipped, version, currency
mechanism, and what is deliberately excluded. Recorded in this directory.

**Out of scope.** Rewriting any documentation. If the audit finds the corpus
needs work, that becomes its own item on the list.

---

## Phase 3 — Documentation tab (item 2, second half)

**Goal.** Documentation reachable without leaving the IDE.

**Shape — David's call, recorded.** Another **right-panel tab**, alongside
Build / Play / Testing / Index / Diagnosis.

**Why that is cheap.** The Testing tab (ADR-301) already establishes exactly
this pattern: local web content rendered in a right-panel tab through a custom
URL scheme handler — `TestingTabViewController`, `TestingTabSchemeHandler`,
`TestingTabWebRoot`, with the bundle under `SharpeeIDE/Resources/testing-tab/`
and built by `build-testing-tab.sh`. A documentation tab is the same machinery
pointed at a different bundle, which also settles how docs get into the app for
Phase 8.

**Scope.**

- New tab in `RightPanelViewController` (tab strip is `TabStripView`).
- Render the corpus Phase 2 chose, via the Testing-tab scheme-handler pattern.
- Navigation within the docs; search if the corpus warrants it.

**Acceptance.**

- The tab renders the chosen corpus offline, with no network dependency.
- Tab selection, theming and font preferences behave like the existing tabs.
- The docs bundle is produced by the build, not committed by hand, mirroring
  `build-testing-tab.sh`.

**Dependencies.** Phase 2.

---

## Phase 4 — Transcript discovery pass (item 7, pass 1)

**Goal.** Find out what writing transcript tests is actually like, so Phase 5
is designed from evidence rather than imagination.

**Scope.**

1. Move Fernhill's 22 transcripts from
   `branch-stories/fernhill/tests/transcripts/` to
   `docs/work/ide-go-live/fernhill-transcripts-baseline/`. Moved, never
   deleted. Out of the story folder entirely so the story genuinely has no
   tests and Phase 8's DMG cannot ship a stashed copy.
2. Write the tests again from scratch, working as an author.
3. Keep a friction log: what was reached for, what had to be looked up, what
   was got wrong, what was tedious.
4. Only then diff against the baseline. **What was missed is the finding.**

**Method — the part that is easy to ruin.** Do not read the moved originals
before writing. Reading all 22 turns the exercise into transcription and
destroys the signal.

**Honest caveat.** Whoever does this knows the codebase, so it surfaces
friction, not ignorance. It will not simulate a first-time author.

**Constraints.** ADR-294 D4 removed the control-flow directives — a rewrite
must not reintroduce them. Combat sequences are exact pinned-seed counts,
re-derived by `--exec` probing or the `forces:` / `point-seed:` header fields
(ADR-293 Phase C), never guessed.

**Acceptance.** Fernhill has a working transcript suite again, plus a friction
log and a coverage diff against the baseline. The friction log is the
deliverable that matters — it is Phase 5's input.

**Known consequence.** Between step 1 and step 2 completing, Fernhill has no
transcript tests. Checked: only historical session summaries and archived plans
reference the old paths; no build script, config or CI job does.

**Before starting.** Explicit go-ahead from David for the move.

---

## Phase 5 — Transcript editor (item 3)

**Goal.** Create, edit and delete transcript tests from inside the IDE.

**Scope.** Driven by Phase 4's friction log — the specific affordances are
deliberately not fixed here, because fixing them now would be the guess this
ordering exists to avoid.

**Existing pieces.** The Testing tab (ADR-301), `TranscriptDiscovery`,
`TranscriptHighlighter`, and the mocks in `docs/work/ide-transcript-editor/`.

**Constraint.** ADR-294 D4's removed directives must not be offered by the UI.
The parser rejects each by name.

**Acceptance.** Phase 6.

**Dependencies.** Phase 4.

---

## Phase 6 — Transcript acceptance pass (item 7, pass 2)

**Goal.** Prove the editor by using it.

**Scope.** Write Fernhill's transcripts again, through the editor this time.

**Acceptance.** They can be produced through the UI without dropping to a text
editor or a terminal. If that is painful, Phase 5 is not done, whatever its own
tests say. The resulting suite is what Phase 8 ships.

**Dependencies.** Phase 5.

---

## Phase 7 — Publish tab (item 1)

**Goal.** Publishing reachable from the IDE.

**Scope is not yet defined and this phase cannot start without it.** The
scoping step is small and can happen any time:

- What "publish" means here — produce a distributable, upload somewhere,
  register an IFID, generate an iFiction record, or some subset.
- ADR-284 makes an IFID a publishing precondition. That precondition is now
  reachable in-IDE: the Problems panel mints one on demand
  (`StoryHeaderIFID`), so a Publish tab can rely on it rather than reimplement
  it.
- Relationship to `./sharpee publish` in devkit — does the tab drive it, or is
  it a separate path?

**Acceptance.** Defined once scope is.

---

## Phase 8 — DMG (item 4)

**Goal.** A distributable Chord Writer that arrives with documentation and a
working sample story.

**Scope.**

- Package the app with `tools/ide/package.sh`, notarised via
  `scripts/mac-release.sh`.
- Bundle the documentation from Phase 3.
- Install Fernhill and its transcript tests to
  `~/Documents/The Folly at Fernhill/` — the same shape Create Story uses, so
  the sample is not a special case.
- The landing page must surface it on a fresh install, where there is no last
  project and no recents. This is the job Inform's "Open a Sample Project"
  section does, and it is the one piece of Phase 1 deliberately deferred to
  here.

**Acceptance.** On a machine that has never run Chord Writer: install, launch,
see the modal offering Fernhill, open it, read the docs in the right panel,
run its transcript tests, and play it.

**Dependencies.** Phases 3 and 6.

---

## Item 5 — Missing-ifid diagnostic wording

Not a phase. `packages/chord/src/analyzer.ts:841` still tells authors to run
`sharpee ifid`, which is wrong now that Problems has a **Generate IFID**
button. Proposed replacement is in `todo-list.md`. A `packages/` change, so it
waits on David's sign-off, then folds into whatever phase is running.

---

## What this plan does not cover

Items David has not raised. The list is explicitly open and expected to grow;
when it does, this plan gets a phase rather than a footnote.
