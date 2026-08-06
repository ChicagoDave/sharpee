# Sharpee IDE — Go-Live TODO List

Running list of what has to be true before the IDE ships. Kept active: items get
added as David names them, and nothing here is started without his say-so.

Started 2026-08-06.

---

## Items

### 1. Publish tab

A Publish tab in the right panel, alongside Build / Play / Testing / Index /
Diagnosis.

Scope not yet defined. Related: ADR-284 makes an IFID a publishing
precondition, and the Problems panel now mints one on demand
(`StoryHeaderIFID`), so that precondition is reachable from inside the IDE.

**Status**: not started.

### 2. Integrated documentation

Author documentation surfaced inside the IDE.

Open question before any UI work: which source is canonical.
`docs/reference/chord-language.md` describes **Chord 1.4.0** while the IDE
status bar currently reports **Chord 3.0.0**, and sharpee.net is the maintained
home for author docs. That has to be settled first, or the IDE ships a
documentation surface pointed at a stale corpus.

**Status**: not started. Blocks item 4.

### 3. Transcript test create / edit / delete

Author-facing CRUD for transcript tests.

Existing pieces to build on: the Testing tab (ADR-301), `TranscriptDiscovery`,
`TranscriptHighlighter`, and the mocks in `docs/work/ide-transcript-editor/`.

Constraint: ADR-294 D4 removed the control-flow directives (`[WHILE:]`,
`[RETRY:]`, `[DO]`/`[UNTIL]`, `[IF:]`, `[ENSURES:]`, `[REQUIRES:]`,
`[NAVIGATE TO:]`) — the parser rejects each by name, so the editor must not
offer them.

**Status**: not started. Blocks item 4.

### 4. DMG package

A packaged DMG including the integrated documentation, the fernhill sample
story, and fernhill's transcript tests.

Starting points that already exist: `tools/ide/package.sh` and
`scripts/mac-release.sh` (notarization).

**Install destination**: `~/Documents/The Folly at Fernhill/` — named after
the story's title, the same shape Create Story uses, so the bundled sample is
not a special case.

**Status**: not started. Blocked by items 2 and 3 — the DMG bundles their
output.

### 5. Missing-ifid diagnostic wording

`packages/chord/src/analyzer.ts:841` still reads:

> The story has no `ifid:` — mint one with `sharpee ifid` (Treaty of Babel,
> ADR-074). Publishing requires one (ADR-284).

The IDE now offers a **Generate IFID** button on that Problems row, so telling
the author to go and run a CLI command is wrong there. Proposed replacement
drops the remedy and keeps the fact, leaving each surface to offer its own fix:

> The story has no `ifid:` — a Treaty of Babel identifier (ADR-074). Publishing
> requires one (ADR-284).

This is a `packages/` change and needs David's sign-off before it is made.

**Status**: awaiting decision.

### 6. Modal landing page

A **modal** landing page — the window an author meets on launch, before any
story is open — with three buttons:

- **Open** — open a story
- **Create Story** — scaffold a new one
- **Close Chord Writer** — quit

#### Decided

- It is **modal**.
- **The landing page replaces session restore as the launch path.** Launch
  shows the landing page; it does not silently reopen the last project.
  Instead, the last project appears *in* the modal as an entry the author can
  pick. `SessionState` still owns what a project restores once opened — tabs,
  expansion, pane visibility.
- **No `Chord/` folder. No required home folder at all.** An author keeps
  stories wherever they like, which is what source control demands and what
  Inform itself retreated to.
- **Create Story takes a title and a location** — two fields: a text box for
  the story title, and a location text box that **defaults** to
  `~/Documents/{story title}/` and is **overridable**. A per-story folder, not
  a shared parent. The bundled sample follows the same default shape:
  `~/Documents/The Folly at Fernhill/`.
- **The location field mirrors the title as it is typed, until the author
  edits the location — then mirroring is cancelled for good.** Standard
  mirror-until-touched. Implementation is a flag set the first time the author
  types into the location field, with the title's change handler skipping the
  update once it is set; the only care needed is that the mirroring write does
  not itself trip the flag.
- **The modal lists the 5 most recent projects.** Not just the last one.
  `RecentProjectsStore` already keeps 10 (`maxCount`), so the modal displays
  the first 5 of what the store holds — the store's cap does not need to
  change, and does not have to equal what the modal shows.
- **Once dismissed, it does not come back until the next app launch.** No
  summon-back shortcut; Inform's Cmd-L is deliberately not copied. This sits
  well with the app's existing
  `applicationShouldTerminateAfterLastWindowClosed` returning true: closing the
  last story window quits, so there is never a running app with no window and
  no way back to the launcher.

#### Dissolved

- The earlier "editor always opens at `~/Documents/Chord/`" rule is gone.
- With no home folder, the "offer to copy or move an out-of-folder story into
  it" question no longer exists.

#### Undecided

- How the mirrored default is sanitised, at implementation time rather than
  now: a title may hold characters a path cannot (`/`, `:`) or be very long,
  and mirroring means that shows up in the location field per keystroke rather
  than once. Editing the location both fixes it and stops the mirroring, so
  this stays a default-quality problem rather than a correctness one.

#### Reference model: the Inform 7 launcher

David's model. Its structure, for the parts worth mirroring:

- Product name, tagline, and artwork across the top.
- **News** — dated items from the IFTF (IFComp entry and judging windows).
- **Open a Recent Item** — recent projects, plus a plain `Open...`.
- **Create New** — Project, Extension, and a documentation export.
- **Open a Sample Project** — named samples annotated by size ("a small
  project", "a medium project"), plus a browse-for-more link.
- **Advice** and **Community** — link lists (getting started, keyboard
  shortcuts, folder structure, credits; forum, IFDB, IFWiki, competitions).
- Footer line telling the author how to summon or dismiss the launcher.

Note that Inform's launcher lists **recent items**, not the contents of a
folder — it is location-agnostic by construction. That is the design this item
has landed on.

Note also the sample-project section: it is the same job item 4's bundled
fernhill would do here.

#### Existing pieces

- `SharpeeIDE/Persistence/RecentProjectsStore.swift` — already tracks recents,
  capped at 10; the modal shows the first 5.
- `SharpeeIDE/Persistence/SessionState.swift` — `projectURL` becomes the "last
  project" the modal offers rather than the launch path.
- `SharpeeIDE/Workspace/StoryScaffold.swift` — already scaffolds a story,
  which is what **Create Story** needs; its default destination becomes
  `~/Documents/{story-name}/`.

#### Before building

- Check David's IDE mock artifacts first — IDE surface design lives there, not
  in the repo.
- Links to item 4: the DMG installs fernhill and its transcript tests to
  `~/Documents/The Folly at Fernhill/`, matching the Create Story default. The modal must
  surface it on a fresh install, where there is no last project and no
  recents — the job Inform's "Open a Sample Project" section does.

**Status**: not started.

### 7. Rewrite Fernhill's transcript tests as a user would

Remove Fernhill's existing transcript tests and write them again from scratch,
working as an author inside the IDE rather than as a developer in a terminal.

This runs in **two passes**, and the first one comes *before* item 3:

1. **Discovery.** Write the tests back with the tooling as it stands today and
   pay attention to what hurts. What an author reaches for, what they have to
   look up, what they get wrong — that is what tells us what the editor looks
   like. Designing item 3 from a blank page instead would be guessing.
2. **Acceptance.** Once the editor exists, write them again through it. A
   test-authoring surface cannot be judged against tests that already exist;
   the only honest measure is whether someone can sit down and produce them
   through the UI. If writing them back is painful, item 3 is not done,
   whatever its own tests say.

It also produces the artefact item 4 ships: the transcript tests that travel
with Fernhill in the DMG.

#### What exists today

22 transcripts in `branch-stories/fernhill/tests/transcripts/` — arrival,
compass, containers, concealment, doors, key, machine, npcs, smoke, restart,
timeline, fuse, frost-seal, cellar-dark, dawn-lose, the-long-night,
phrasebooks, recorded, e-group, tool-gates, and others.

#### How they are preserved

Nothing is deleted. The 22 transcripts **move** to
`docs/work/ide-go-live/fernhill-transcripts-baseline/`, out of
`branch-stories/fernhill/` entirely.

Out of the story folder, not merely renamed inside it, for two reasons: the
story has to genuinely have no tests for the exercise to be real, and item 4's
DMG ships what is in the story folder — a stashed copy sitting there would
travel with it.

Consequences of the move, to expect rather than be surprised by:

- Fernhill has no transcript tests until pass 1 rewrites them. Anything that
  runs them is running nothing in the meantime.
- Only historical session summaries and archived plans reference the old
  paths; no build script, config, or CI job does. Nothing breaks.

#### Before moving anything

- **Explicit go-ahead required.** Nothing moves without David saying so at the
  time.
- The move keeps them readable side by side as the coverage benchmark. But for
  pass 1 to mean anything
  the originals must **not** be read first: reading all 22 turns the exercise
  into transcription and destroys the signal. Play the story, work out what
  needs testing, write the tests — *then* diff against the originals. What was
  missed is the finding, and it is the part that says most about what the
  editor should prompt for.
- Honest caveat on the exercise: whoever does pass 1 already knows the
  codebase, so their blind spots are not a real author's. It surfaces friction,
  not ignorance.
- Constraint carried from item 3: ADR-294 D4 removed the control-flow
  directives, so a rewrite must not reintroduce them.
- Combat sequences are exact pinned-seed counts, not padding; a rewrite has to
  re-derive them (`--exec` probing, or the `forces:`/`point-seed:` header
  fields from ADR-293 Phase C) rather than guess.

**Status**: not started. Pass 1 feeds item 3's design and should precede it;
pass 2 gates item 3 and blocks item 4.

---

## Adding to the list

More items are expected. Append them here with the same shape: what it is, what
it touches, what it blocks or is blocked by, and its status.
