# Phase 5 — Transcript editor: scope

Written 2026-08-08, session acc261. Input: `phase-5-editor-requirements.md`
(R1–R11, derived from Phase 4's friction log). Host decided by ADR-301 D1;
the *editing interaction* is what ADR-301 left as "the next decision" and is
what this document settles.

---

## 1. The shape

**The editor is the Testing tab's document view, grown a probe.** Not a new
surface, not a new tab, not a new window.

That follows from R1 and from what is already on disk. R1's finding is that
authoring friction is *discovery*, not typing — "the editor has to be a probe
first and a text editor second." The Testing tab already runs the story, already
owns the tree, and already opens a node as a document listing its turns. What it
lacks is the story's actual words on a passing turn, and any way to write back.

So the arc is short: **make the document view show what the game said, then make
it writable.** Everything in R2–R10 hangs off those two.

### What that looks like

A document is a column of **turn cards**, one per command, in file order:

```
  ┌────────────────────────────────────────────────┐
  │ 12   > open the deed box                 turn 7│
  │                                                │
  │      The lid gives with a soft complaint of    │   ← exact output,
  │      old hinges. Inside: a folded deed.        │     selectable
  │                                                │
  │      [OK: contains "folded deed"]           ✎  │   ← the assertion
  └────────────────────────────────────────────────┘
```

Select a span of the output → the editor offers the assertion forms that span
admits (R2's table) and writes one. Nothing about quoting, fencing or `end text`
reaches the author. A read-only source pane beside the cards shows exactly what
the serializer will write (ADR-301's surviving idea; it is also how the author
learns the format, per R8).

### Three rules the shape has to keep

1. **One parser, one serializer.** The tab imports `parseTranscript` and
   `serializeTranscript` from **`@sharpee/branch-tester`** *directly* — the same
   move ADR-301 D1 made for the wire, for the same reason (DEVARCH 8b). A second
   transcript writer in Swift or in the page is the drift this repo has already
   paid for once.

   > **Corrected 2026-08-08.** This first named `@sharpee/transcript-tester`,
   > which is the wrong package. There are **two** transcript parsers, and the
   > one the IDE runs is branch-tester's: `sharpee test --tree` loads
   > `@sharpee/branch-tester` (`packages/devkit/src/commands/test-tree.ts:53`)
   > while the flat runner loads transcript-tester's. They do not implement the
   > same grammar — transcript-tester knows only two `[CHANNEL:]` forms
   > (`contains`, `not contains`) and warns `Unknown assertion format:
   > [CHANNEL: clock, is absent]`, **returning null**, which drops the assertion.
   > Had the tab imported that one, opening `channels.transcript` and saving it
   > would have silently deleted three assertions. Found by round-tripping the
   > corpus before building on it, not by reading (2026-08-08).
2. **Removed grammar is unreachable by construction.** No free-text assertion
   field. The palette is generated from the parser (R8), so ADR-294 D4's removed
   directives cannot be typed.
3. **The editor never claims what it cannot substantiate** (R10). A suggested
   assertion is a claim about the story.

---

## 2. Slices

Ordered so each one ships something usable and each is independently testable.
Slices 1–3 have no platform dependency. Slices 4–5 do, and say so.

### Slice 1 — The probe: actual output on every turn

R1's "see exactly what the game said," and the foundation for everything after.

- The IDE's run passes `--capture-output`, so `actualOutput` rides every executed
  command, not only failures. The flag already exists on `sharpee test`
  (`packages/devkit/src/commands/test.ts:89`) and the wire already declares the
  field (`run-events.ts` `CommandResultEvent.actualOutput`).
- The document view renders that output on passing turns, as the assertable
  string — the bytes an assertion will match, not a rendering of them.
- Cost of the capture is real (a green tree run stops being cheap text), so it is
  scoped to the tab's own run, not made the CLI default.

**Acceptance.** Open a document for a passing node in the real tab and read the
story's real prose off the rendered page. Real-path, in the style of
`TestingTabRealPathTests`.

**Size**: small. One Swift argument, one render branch, one test.

#### Done — 2026-08-08, session acc261

`TestRunner.runTests` now spawns `--tree --capture-output --json`; the document
view renders the story's words on every executed turn while the preview stays a
glance (`views.ts` `turnRow(…, showOutput)`); a turn that printed nothing says so
rather than rendering an empty box, because a silent turn is a finding and R10 is
the case where merging the two steers an author into pinning a bug.

The argument list moved into `TestRunner.treeRunArguments(storyPath:)` and the
real-path suite now builds its command from it. That mattered: the suite had been
spawning a **hand-written** argument list, so the tab could have rendered output
under test and never in the app.

- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 424 tests, with 0 failures (0 unexpected) in
  39.219` (2026-08-08). 423 before; the new one is
  `testADocumentShowsTheStorysWordsOnPassingTurnsAndThePreviewStillDoesNot`.
- Negative control, same day: with `--capture-output` removed from
  `treeRunArguments`, that test fails
  `XCTAssertEqual failed: ("0") is not equal to ("16")` and the unwrap of a
  passing turn's output fails. The assertions discriminate; they are not
  satisfiable by any rendering that lacks the capture.
- `node build.mjs` + `npx vitest run` in `tools/ide/web/testing-tab` →
  `12 passed`, bundle 28.8kb.

The assertion is on the *bytes*, not on "some text appeared": it reads the turn
whose transcript asserts `contains "worn bald in the middle"` and requires that
exact fragment on the rendered page — R1's "the output shown is the assertable
string."

### Slice 2 — Editing: promote a selection, write the file

The half that makes it an editor.

#### Round-trip probe — run first, 2026-08-08

Slice 2 rests entirely on "parse it, edit the model, re-emit the whole file,"
which is `serializeTranscript`'s own stated model. So that was measured before
anything was built, over all 37 transcripts in `branch-stories/fernhill` and the
frozen fixture:

| | branch-tester (the IDE's parser) | transcript-tester |
| --- | --- | --- |
| byte-identical after round-trip | **27** | 7 |
| reformatted, but a stable fixed point | 10 | 30 |
| not a fixed point | 0 | 0 |
| threw / dropped an assertion | 0 | **3 dropped** (`[CHANNEL: …, is absent]`) |

`parse → serialize → parse → serialize` is a fixed point for every file, so the
rewrite happens once and never churns. The ten reformats are small — 2 to 15
changed lines, not the near-total rewrites a naïve line count first suggested
(one inserted line shifts every line after it).

**What the rewrite costs the author**, in severity order:

1. **Comment indentation is destroyed, at parse time.**
   `parser.ts:327` is `trimmed.slice(1).trim()`, so `#     > look` and `# > look`
   are the same comment and no serializer can tell them apart. Indented comment
   blocks are how an author pastes a captured failure into a file; after one save
   the paste is unreadable. This is the one that matters.
2. **A comment between a command's assertions migrates above the command.**
   `serializer.ts:247` states the model plainly — a block is a command, its
   assertions, and the comments written immediately *above* it. `channels.transcript`
   has two comment lines explaining a `[CHANNEL:]` assertion and sitting between
   it and the earlier assertions; after a save they read as an introduction to the
   next command instead. Semantically identical, and wrong to a reader.
3. **An empty `#` becomes `# `** (`serializer.ts:294`), so every re-save adds
   trailing whitespace.
4. **Long header values re-wrap.** Cosmetic and unavoidable: a parsed header is a
   map, so where the author broke the line is not recorded. Fine.

(1) and (3) are defects against the serializer's own promise that saving never
costs the author "something they had typed"; (2) is a designed limitation.

**Fixed 2026-08-08 on David's go-ahead** (a `packages/branch-tester` change):

- `parser.ts` — comment text now keeps the author's indentation. A new
  `commentBody` consumes exactly one leading space, because the serializer writes
  exactly one back, and drops trailing whitespace, which is never meaningful.
- `serializer.ts` — an empty comment is written `#`, not `# `.
- `parser.ts` — the dead `path` import and `TranscriptHeader` type import are
  gone; the tab's `tsc --noEmit` is clean.

Result over the same 37 files: **28 byte-identical** (was 27), and every
remaining reformat is one of the three benign kinds — header re-wrap, the
comment-between-assertions move, a normalized blank line. The pasted-block
flattening and the trailing-space churn are gone.

Evidence, 2026-08-08:
- `pnpm --filter '@sharpee/branch-tester' test` → `363 passed` (28 files), with
  three new cases in `tests/serializer-roundtrip.test.ts` including a pasted
  comment block that round-trips byte-for-byte.
- `pnpm --filter '@sharpee/devkit' test` → `153 passed | 1 skipped`.
- `node packages/devkit/dist/cli.js test branch-stories/fernhill/fernhill.story --tree`
  → `15 passed`, `196 commands (161 authored + 35 replayed)` — identical to the
  Phase 4 baseline.
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `Executed 425 tests, with 0 failures`.
- `npx tsc --noEmit` at the repo root → exit 0.

(2), the comment-between-assertions move, is **kept and pinned by a test** rather
than fixed: the serializer's block model has no place for it, and the source face
previews it. That is the decision, not an oversight.

Two of the tab's own unit tests had used the `#` → `# ` defect as their worked
example of a reformat, so fixing the defect turned them green-for-the-wrong-reason
into red. They were rewritten against normalizations that are staying (command
spacing, header re-wrap) — a defect used as a fixture is a defect that argues
against its own removal.

Meanwhile this is the argument for ADR-301's "the generated source is visible":
the source pane is not decoration, it is the **preview of the rewrite**, and it
is what stops a normalizing save from being a surprise. Build it in 2a.

- Bundle `parseTranscript` / `serializeTranscript` into the tab. `parseTranscript`
  is already pure (`fs` is confined to `parseTranscriptFile`), so this is a build
  question, not a refactor.
- Host gains `readTranscript(file)` and `writeTranscript(file, text)`; the write
  fans out through the one owner ADR-290 D7 names, so the project tree and the
  tab both see it.
- Selecting output offers R2's four forms, chosen from the span:
  one line, no double quote → `[OK: contains "…"]`; multi-line or quoted →
  `[OK: contains]` + `text` block; whole response → `[OK]` + block; world state →
  `[STATE:]` (slice 3).
- Editing a command, reordering, and deleting a turn.
- The source pane shows what will be written, before it is written.

**Acceptance.** Promote a selection in the tab; the `.transcript` on disk gains
that assertion; re-running the suite is green. Nothing this repo owns is stubbed.

**Size**: the largest slice. Split on contact, into 2a/2b/2c below.

#### 2a — Read the file, and show what a save would cost. Done 2026-08-08

The foundation and the safety rail, before anything writes.

- `src/grammar.ts` is the tab's only door to the transcript grammar: it bundles
  `parseTranscript`, `validateTranscript` and `serializeTranscript` from
  **`@sharpee/branch-tester`'s source**, aliased in `build.mjs`, `tsconfig.json`
  and `vitest.config.ts` alike — so what the bundle carries, what the type-checker
  checks and what the unit tests drive are one file, exactly as the wire already
  is. `fs`/`path` resolve to `src/no-filesystem.ts`, whose stubs throw by name;
  esbuild tree-shakes them out entirely, since `parseTranscriptFile` is unused.
- The host seam gained one round trip: the page posts `requestSource(file)`, the
  host answers `source(file, text)` or `sourceFailed(file, message)`. Asking at
  open time rather than caching a copy from discovery is deliberate — the author
  also edits transcripts in the editor pane, and a cached copy would show a file
  that no longer exists.
- `TranscriptSourceProvider` does the reading, and serves a request **only** for a
  path in the story's discovered set. Its own type rather than a method on
  `TestController` for a reason the suite proved (below).
- A document now has two faces, `Cards | Source`, in the same segmented control
  the mode switcher uses. Source shows the file and, above it, what a save would
  do to it.

**The hazard this slice actually found.** `parseTranscript` does **not** throw on
text it cannot read — it returns a transcript with no commands, which serializes
to a three-line husk. A save guarded by `try/catch` would therefore have reported
"this reformats 5 lines" and then **deleted the author's file**. Caught by a unit
test written to assert the opposite, which failed. The guard is now
`validateTranscript` — the same function `sharpee test` refuses a transcript
with — so the editor and the runner agree on what a valid file is by construction.
`saveOutlook` returns `clean | reformats | unsound`, and `unsound` carries the
runner's own reasons and offers no generated text at all.

**The second harness gap.** The real-path suite constructs its own tab and runner,
so `onRequestSource` was unwired and the source pane sat at "Reading the file…"
forever — four red assertions. The fix was not to hand the test a file-reading
closure: that would prove the page renders text, never that the IDE supplies any.
`TranscriptSourceProvider` exists so both sides drive one reader. This is the
second time in two slices that the suite was found spawning its own version of a
production path (the first was `treeRunArguments`).

- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 425 tests, with 0 failures (0 unexpected) in
  40.611` (2026-08-08). New file needed `xcodegen generate` first — XcodeGen
  enumerates `sources:` at generate time.
- `npx vitest run` in `tools/ide/web/testing-tab` → `20 passed` (8 new in
  `tests/grammar.test.ts`). Bundle 28.8kb → 67.7kb.
- The real-path assertion pins the grammar as well as the surface: the frozen
  `concealment.transcript` round-trips **byte-identically** under branch-tester
  and **reformats by two lines** under transcript-tester (measured 2026-08-08),
  so the notice cannot read "byte-for-byte" unless the page holds the parser the
  run uses.

The tab's `tsc --noEmit` surfaced two dead imports in
`packages/branch-tester/src/parser.ts` — a consequence of type-checking the
platform source it now bundles. Removed with the other platform fixes above.

#### 2b — Promote a selection to an assertion. Done 2026-08-08

Select what the story said; the assertion lands in the file.

- `src/promote.ts` owns R2's rule and nothing else: given the output and the
  span, it picks the form and builds the assertion. One line without a double
  quote → `[OK: contains "…"]`; a span that crosses a line or carries a quote →
  `[OK: contains]` + a `text` block; the whole response → `[OK]` + a block. The
  author never meets the quote rule, the fence spelling, or `end text`.
- `grammar.addAssertion` finds the command by **source line** — the identity the
  wire and the parsed file already agree on. Matching command text would attach
  the assertion to the wrong turn in any transcript that runs `look` twice, which
  is most of them. It refuses an unsound file and a line with no command, rather
  than producing a file that quietly dropped the edit.
- The seam gained `writeTranscript(file, text)` out and `saved`/`saveFailed` back.
  `TranscriptSourceProvider.write` does the writing, atomically, behind the same
  discovered-set boundary as the read, and `TestController` announces the change
  through `reloadFromDisk` — ADR-290 D7's rule that a write into the project has
  one owner for who else observes it. Without that, a transcript open in an editor
  window still shows the old text, and saving it puts the assertion back.
- The draft is held **out of the surface** until the host confirms. Showing it
  first would tell the author an assertion had landed while the file said
  otherwise, and the source face is the one place that must never disagree with
  disk.
- After a successful write the cards carry a note: the run below predates this
  edit. This is scope §4's open question 2, answered the honest way rather than by
  re-running silently.

**A selection dragged across two turns earns nothing.** It is not a claim about
either command, and asserting half of what was dragged over would be the editor
making a claim the author did not — R10, in the smallest possible case.

**One real fix came out of testing.** The page read the span from
`selection.toString()`, which WebKit returns empty for an unfocused web view
while still holding the range. It now reads `range.toString()`, which is
authoritative in both cases — more correct in the app, and the reason the gesture
is reachable from a test at all.

Evidence, 2026-08-08:
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 427 tests, with 0 failures (0 unexpected) in
  46.093`.
- `npx vitest run` in the tab → `33 passed` (12 new in `tests/promote.test.ts`).
- The end-to-end is real-path and self-proving: it selects `bald` inside the
  phrase `concealment.transcript` already asserts, clicks the offer, reads the
  file **back off disk**, and then **re-runs the real suite** and requires zero
  failures. A promoted assertion that were not true would fail there. The fixture
  is restored in a `defer`, so a crash between write and assert leaves nothing
  edited — confirmed clean by `git status` afterwards.

##### What `mutation-verification` caught, and the defect in it

Run on the write path because this is the first code in the phase that touches an
author's files. It reported the TypeScript side clean and raised three things on
the mutation path — all fair, and one of them a real defect rather than a test gap:

- **`TestController.writeTranscript` announced every write, landed or not**, and
  announced it at the **raw wire path** rather than the resolved one. So a refused
  write asked the editor to reload a document that had not changed — and for a path
  outside the suite, at a location `TranscriptSourceProvider` had just declined to
  touch. `write` now returns the URL it wrote (nil when nothing changed) and the
  announcement is gated on it.
- **Both refusal branches were untested** — the path-outside-the-suite guard and a
  write that throws. These are the `REJECTS WHEN` lines of this slice's own
  Behavior Statement, written and then not tested, which is exactly the gap rule 13
  says to close. Now `SharpeeIDETests/TranscriptSourceProviderTests.swift`: real
  files in a real temp directory, asserting on **the file** rather than on what the
  tab was told, since a refusal that still wrote would report identically either
  way. One positive case sits alongside them, because a guard that refused
  everything would satisfy every refusal test.
  > Worth recording: the obvious way to write the failing-write test — make the
  > *file* read-only — proves nothing. The write is atomic, so it lands a temp file
  > and renames; renaming needs the **directory**. A read-only file is replaced
  > happily.
- **The page's `onSaveFailed` branch was unverified**, the branch that exists so
  the source face can never disagree with disk. Now driven through the real
  surface: the provider is pointed at an empty suite so the real guard refuses,
  and the test asserts the note says so, the file is untouched, and the source
  face still shows disk rather than the draft the page built.

`Executed 433 tests, with 0 failures` after the fix and the three additions
(2026-08-08), up from 427.

#### 2c — Add a command, delete a turn. Done 2026-08-08

This is what closes R1's loop. Until now the tab could only assert about commands
already in the file; an author could not write a transcript in it at all.

- A command field at the foot of the document appends `> command` + `[SKIP]`.
  That is not a placeholder: `[SKIP]` already means "run it, assert nothing"
  (ADR-294 D2), so a new command executes, the next run shows what the story
  said, and selecting that output is the assertion. **Adding a command and
  asserting about it are two gestures, never one** — an author is never asked to
  predict output.
- `✕` on a turn removes the command and everything asserted about it. They go
  together because they are one thing in the file and one thing to an author: a
  command with only its assertions removed still runs, still consumes a turn, and
  still shifts every turn-indexed beat beneath it.
- The three edits now share one path (`applyEdit`), so "build the whole file, hold
  it out of sight, ask the host to write it" exists once.
- The command field's text lives on the surface, not in the DOM: a live run
  rebuilds the document on every event, and a field whose contents were only in
  the element would be erased mid-word. Focus and caret are restored too.

**The defect found while wiring it, which would have been silent and green.**
The runner short-circuits on `[SKIP]`: a command carrying both `[SKIP]` and
`[OK: contains "…"]` **passes without ever evaluating the `[OK]`**. Appending a
promoted assertion to a draft command would therefore have written an assertion
that was dead on arrival *and* green — the worst possible pair, because nothing
downstream would ever complain. `addAssertion` now replaces a `[SKIP]` rather
than joining it, which is also exactly what R1 means by "`[SKIP]` is the draft
state and promoting-to-assertion is the edit". `[TODO]` short-circuits
identically but means something an editor has no business resolving on the
author's behalf, so an assertion added to a `[TODO]` command is refused with the
reason.

Two of 2b's own tests had encoded the old behaviour (`[SKIP]` surviving beside
the assertion) and went red — the same shape as the `# ` case earlier: a defect
used as a fixture argues against its own removal.

Evidence, 2026-08-08:
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 435 tests, with 0 failures (0 unexpected) in
  58.015`.
- `npx vitest run` in the tab → `41 passed`.
- The acceptance case is the whole loop, real-path: type `inventory` into the
  field, run, read the story's real response off the rendered card, select a word
  **from what it actually printed**, promote it, and run again requiring zero
  failures. That is Phase 6's gesture, executed once, without leaving the tab.
- Deleting a turn is likewise proved by re-running: the command and its assertion
  are both gone from the file, and the suite the file leaves behind still passes.
- Fixtures restored by `defer` and confirmed unmodified by `git status`.

#### 2d — Undo. Done 2026-08-08

Every edit writes immediately, so the way back had to exist before anything else
in this family is safe to use in anger. Undo covers all three edits at once,
which is why it came before per-assertion removal.

- A stack of the file's text as it was before each confirmed edit, offered on the
  edit note where the author learns the edit happened. `Undo (2)` when there is
  more than one step.
- **Pushed on confirmation, never on attempt.** A write that was refused must not
  leave a way back to a state the file was never in. The stack records
  departures, not intentions.
- Undo goes through the same write path, the same outlook and the same reporting
  as any other edit — it is an edit, including in what happens when its own write
  is refused.
- The stack is dropped when the author leaves the document: it holds one file's
  history, and restoring it into another would write one file's text over
  another's.

Evidence, 2026-08-08:
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 437 tests, with 0 failures (0 unexpected) in
  63.752`.
- Two commands added, then undone one at a time: the first undo removes only the
  second command, and the second returns the file **byte-for-byte** to what the
  author started with. Byte-for-byte is the assertion that matters — every edit
  re-emits the whole file, so an undo restoring "the same transcript" without the
  same *text* would normalize the author's file as the price of changing their
  mind.
- A refused write offers no Undo at all, asserted through the real guard.

#### 2e — A turn's claims, and taking one back. Done 2026-08-08

The cards showed the run's verdict but never the file's claims, so an author
could see that a turn passed without seeing what it asserted — and promotion
could add an assertion with no way to remove it short of deleting the whole turn.

- Each turn now lists what the file asserts about it, **in the serializer's own
  words**. This is R8's "the palette is the documentation" arriving by the back
  door: for most authors this is where they will learn what a transcript can
  express, so it has to read exactly as the file reads.
- `✕` on a claim removes that one. Removing the **last** one leaves `[SKIP]`
  behind rather than a bare command: a command with no assertions is legal
  grammar (the golden tier's shape) but fails at run time with a named error in a
  transcript with no recording, so "remove the only claim" would otherwise turn a
  green file red for a reason the author did not choose.
- `[SKIP]` and `[TODO]` are drawn as halting, with the reason. A command carrying
  either has everything after it silently unevaluated, and a list that showed
  them as equals would misreport what the suite checks — the same defect as 2c's,
  now visible instead of merely avoided.
- **Claims are hidden between an edit and the next run.** They are joined to
  turns by source line and an edit moves lines, so showing them anyway would put
  one command's assertions under another's output. Hiding says the same thing the
  edit note already says in words.

**The platform change this needed, made on David's go-ahead**:
`serializeAssertionTag` is now exported from `@sharpee/branch-tester`
(`serializer.ts` + the barrel). An editing tool has to show an author what a
single assertion says, one at a time, and the only honest answer is the line the
serializer writes; deriving it in the page would put a second spelling of the
grammar beside the first.

Evidence, 2026-08-08:
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 439 tests, with 0 failures (0 unexpected) in
  69.596`.
- `npx vitest run` in the tab → `48 passed`.
- `pnpm --filter '@sharpee/branch-tester' test` → `363 passed`;
  `pnpm --filter '@sharpee/devkit' test` → passing;
  `node packages/devkit/dist/cli.js test branch-stories/fernhill/fernhill.story --tree`
  → `15 passed`, `196 commands (161 authored + 35 replayed)`, unchanged from the
  Phase 4 baseline; `npx tsc --noEmit` at the repo root → clean.
- The real-path case reads the tag `[OK: contains "worn bald in the middle"]` off
  the rendered card, removes it, checks the file has `> examine the doormat` +
  `[SKIP]`, and re-runs the real suite requiring zero failures. A second case
  proves the claims disappear the moment an edit lands.

**Still not done, and named rather than implied**: editing a command's text in
place. Delete-and-re-add covers it today at the cost of losing the command's
assertions, which is the right trade only for a typo in a command that has none.

#### 2f — Retype a command in place. Done 2026-08-08

The named remainder above, closed. A pencil on the document-face card opens a
field prefilled with the command's text; Enter or **Change** writes it, Escape
or **Keep** abandons it. The command's assertions stay attached — deliberately,
even though the new wording may print something they no longer match: the next
run is what says so, on the surface built to say it, rather than the editor
guessing which claims survive a rewording. Retyping a command to exactly what
it already says writes nothing — a non-edit must not normalize the file or
stamp a "run again" note for a change that never happened.

**The hazard this slice found in its NEIGHBOURS, and closed for all of them.**
The cards address commands by the source line of the LAST RUN, and a structural
edit between runs (a deleted turn) shifts every later command up — so a second
line-addressed edit could silently land on a *different* command that now
occupies the stale line. Claims are hidden between edit and run for exactly
this reason, but `✕` and promotion stayed live. The guard is cheap because the
card also knows the command's *text*: `commandAt` (grammar.ts) now verifies
line and text agree and refuses with both spellings in the message
("…the file has changed since this run. Run again, then edit."). Promote,
delete and retype all pass the card's `turn.input` through it. Line-only
callers are unaffected — the parameter is optional, because not every caller
has a card in hand.

Mechanics worth keeping: the retype draft lives on the surface, not in the DOM
(the document rebuilds on every run event — a field whose contents were only
in the element would be erased mid-word, the same reasoning as the add bar);
Escape in the field cancels the retype with `stopPropagation`, so the global
listener that closes the document never sees it; the pencil's glyph is CSS
`::before` content, deliberately — text inside the button would join `.cmd`'s
textContent, which other code and the real-path suite match as the command's
identity.

**What `mutation-verification` caught, closed the same day.** Two branches of
the ACTION (not the grammar, whose refusals the unit suite pins) were untested
end-to-end: the same-text no-op and a refusal reached through the real field.
Now one real-path case (`testARetypeToTheSameTextOrToBlankWritesNothing`)
drives both through the rendered gesture: confirming the prefilled field
untouched leaves the file's bytes identical, renders no edit note and offers
no undo; a blank retype leaves the bytes identical and names its reason. It
also flagged a decision worth making out loud: a refused retype CLOSES the
field, discarding what was typed. Kept, deliberately — it matches promote's
refusal shape, a blank draft loses nothing, and the stale-line refusal's
remedy is "run again", not resubmit.

Evidence, 2026-08-08:
- `npx vitest run` in the tab → `64 passed` (6 new: the editCommand suite and
  the targeting-guard suite, which pins the refusal for edit, delete and
  promote alike).
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 454 tests, with 0 failures (0 unexpected)`
  (452 at session start; +1 rewording real-path, +1 refusals real-path).
- The real-path case (`testEditingACommandInPlaceKeepsItsAssertionsAndTheSuiteStillPasses`)
  rewords `examine the doormat` to `examine doormat` through the rendered
  pencil-field-Change gesture, reads the file off disk — the claim
  `[OK: contains "worn bald in the middle"]` sits attached to the NEW wording,
  the old wording is gone — and re-runs the real suite requiring zero failures.
  Premise probed before the suite: the reworded command passes in the frozen
  fixture (`22 passed`, devkit CLI, 2026-08-08). Fixture restored, `git status`
  clean.
- `npx tsc --noEmit` at the repo root → clean.

### Slice 3 — Files and the tree: new, delete, `continues:`

R5 and R9.

#### 3a — Branch and Trash. Done 2026-08-08

- **Branch** from the open document: the author types a name, and that is all
  they type. The editor writes `continues:` (R5 — the field is load-bearing and
  documented nowhere an author reads, and a tree run flat "fails as a large
  number of ordinary-looking test failures"), and the host chooses the path
  (ADR-290 D8 — `tests/transcripts/`, slugged the way the corpus already reads:
  `The Vine, Again!` → `the-vine-again.transcript`). An existing file is never
  overwritten; two branches with the same name is an ordinary mistake and losing
  the first to it would not be.
- A new transcript carries **no placeholder command**. The author's first command
  should be their own, not one they have to notice and delete. It is therefore
  *unsound* until they add one — which the source face says plainly, and which
  `addCommand` is specifically allowed to fix. That exception is narrow and named:
  `Transcript has no commands` is the only problem an edit may be performed in
  order to resolve.
- **Trash**, not delete: the file goes to the Finder's Trash. The in-editor undo
  stack covers a file's contents; the only honest undo for a file's *existence*
  is the one the operating system already has. Two deliberate clicks on top of
  that.
- **A parent cannot be trashed.** Removing a node others `continue:` from would
  orphan them, and they would fail as a wall of ordinary-looking errors rather
  than as the one thing that went wrong. The refusal names the count.

**A gap re-opened, and recorded rather than papered over.** A newly created
transcript appears in the Testing tab immediately but **not in the sidebar** until
the project is reopened. That is precisely the bug ADR-290 D7 exists for, and its
fix — `refreshProjectTree()` — went with the outline Test panel (ADR-301 A1.2).
Nothing in the app rebuilds the Project pane after a write today, so restoring
that observer is its own change: `MainWindowController.loadProject` needs a
rebuilt `Project` plus the pane's current expansion, and inventing that wiring
from inside the Testing tab is how one surface ends up owning another's refresh.
Noted in `TestController.rediscover`.

> **Closed 2026-08-08 (same session as 3b/3c).** `refreshProjectTree()` is
> restored at the window (`MainWindowController` → `MainSplitViewController`):
> rescan from disk, rebuild the pane, re-apply the author's expansion —
> folders by URL, **group rows by kind**. The group half did not exist:
> `expandedFolderURLs` deliberately skips group rows (session restore's
> open-by-default ruling), so a bare refresh would have snapped "Transcript
> Tests" shut over the very file the author just created. `expandedGroupKinds`
> is the refresh path's own snapshot; session restore is unchanged. The
> announcement is `TestController.rediscover` (create, trash) plus a
> recording run's exit (`runLandsFiles` — a `.golden` landed; an ordinary run
> refreshes nothing, because a rebuild costs the author their sidebar
> selection for no file change). Proven end to end by
> `ProjectTreeRefreshTests.testATranscriptCreatedThroughTheTabAppearsInTheSidebarWithExpansionKept`:
> a create through the tab's real seam lands the file, and the rendered
> Project outline shows `the-probe.transcript` with the group still open —
> `Executed 457 tests, with 0 failures` (2026-08-08).

Evidence, 2026-08-08:
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 449 tests, with 0 failures (0 unexpected) in
  75.168`.
- `npx vitest run` in the tab → `54 passed`.
- Real-path: typing `The vine again` into the branch field produces
  `tests/transcripts/the-vine-again.transcript` on disk carrying
  `continues: concealment`, `title:`, `story: fernhill` and no command at all.
  Trashing `key` (four children) is refused and the host is never asked; trashing
  a leaf takes two clicks and asks for that file and no other.
- `TranscriptSourceProviderTests` covers the refusals and the slug directly, in a
  real temporary directory.

#### Still to come in slice 3

- Inherited state at the top of a document: where the file starts from
  (location, inventory, turn count), so a branch is legible without holding its
  ancestors in your head. **Needs the world — open question 1.**
- `[STATE:]` offered from the world rather than from the text (R3). **Needs the
  world — open question 1.**

#### 3c — Reparenting. Done 2026-08-08

The affordance the Trash refusal already promised ("…or reparent them"). A
picker in the file bar, beside Branch: the author picks a parent — or "nothing
— make it a root" — and clicks Reparent; the editor writes `continues:`
(R5's field, picked and never typed) through the same write path as every
other edit, so undo, claims-hidden and the "run again" note all apply
unchanged.

- **The exclusions are by construction, not refusal-after-the-fact**
  (`model.reparentCandidates`): what the picker never offers, the author can
  never write. Never the file itself, never its own descendants (a cycle),
  never a file whose run reached the story's ending (its children die — the
  same fact that disables branching from one), never the current parent
  (re-picking it is not an edit). The exclusions are as good as the tree the
  run proved; a cycle past that knowledge is the runner's own named error on
  the next run, not a silent wrong write. Grammar refuses the one cycle it
  can see alone (self-parent).
- **The consequence rides the confirmation**: "It now runs from a different
  history — its turn numbers and its assertions may no longer hold" (subtree
  counted when it has descendants). Mechanically, `applyEdit` grew a general
  carried `warning` — R4's turn-count text moved onto it verbatim, and a
  reparent supplies its own; either way the warning lands only when the write
  does.
- **The real-path test pins the warning as a demonstrated fact, not prose**:
  reparenting `concealment` under `key` goes red on the next run — `search
  the doormat` finds no key, because key's branch already took it. Probed
  first at the CLI (21 passed, 1 failed, 2026-08-08), then pinned through
  the rendered control: `#tally-fail` is exactly `1` after the gesture.

Evidence, 2026-08-08:
- `npx vitest run` in the tab → `73 passed` (4 reparent grammar cases, 2
  candidate-exclusion cases).
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 456 tests, with 0 failures (0 unexpected)`.
- The real-path case (`testReparentingRewritesContinuesAndTheNextRunShowsTheNewHistory`)
  reads the picker's exclusions off key's rendered document (no `key`, none of
  its four descendants, no `arrival`), reparents concealment through the
  control, reads `continues: key` off disk, reads "different history" off the
  confirmation, and re-runs to exactly one failure. Fixture restored by
  `defer`; `git status` clean.
- `npx tsc --noEmit` at the repo root → clean.

#### 3b — Endings mark the file terminal (R9). Done 2026-08-08

The run is the evidence: a command that executes after the story ends errors as
**exactly** `Engine is not running` — the runner normalizes the stopped-engine
capture to that string in one place, and `model.storyEnd` matches it exactly,
never as a prose heuristic (`STORY_OVER_ERROR`; if the runner renames it, the
real-path test goes red rather than the marking silently vanishing). The split
is at the first such error: the turn before it is the ender, everything from it
on is the dead tail.

What the document face does with the fact:

- The ender is badged **"The story ends here."**; dead turns are muted and say
  "The story had already ended — this command could not run" — dead commands
  are not failures to diagnose, and rendering them at full strength invites
  debugging them one by one (F22's wall of red, on one surface).
- **The append bar gives way** to a terminal note naming the ender and R9's
  affordance: "To explore another path, branch a new transcript from
  ⟨parent⟩." — which is exactly how fuse-cut/fuse-lose are shaped (the ending
  lives in a leaf; exploration branches from the shared parent). When the
  story ended before the file's first command, the note says the ending is an
  ancestor's.
- **Branching FROM a terminal file is refused at the gesture** (field and
  button disabled, the placeholder says why): a child replays its ancestry,
  ending included, so every command in it would die — refusing here beats
  discovering it as a wall of red on the child's first run.
- The dead turns keep their `✕`: trimming the tail is the edit the marking
  exists to invite.

**Honest limit, named**: a file whose LAST command ends the story cleanly (the
frozen `fuse-lose` as shipped) emits no wire signal at all, so it is not
marked — R10, the editor never claims what it cannot substantiate. Marking the
clean case needs the wire to carry "the story ended this turn", a
`packages/ide-protocol` + emitter change: flagged for David, not assumed.

Evidence, 2026-08-08:
- `npx vitest run` in the tab → `67 passed` (3 new: no-ending runs including
  ordinary failures stay null; ender/dead split at the first stopped-engine
  error; ending-before-first-command has a null ender).
- `xcodebuild test -scheme SharpeeIDE -destination 'platform=macOS'` →
  `** TEST SUCCEEDED **`, `Executed 455 tests, with 0 failures (0 unexpected)`.
- The real-path case (`testAStoryEndingMarksTheFileTerminalAndTheDeadTailCanBeTrimmed`)
  stages R9's discovery moment — appends a command past `fuse-lose`'s ending,
  runs the real suite — and reads all four affordances off the rendered page
  (dead marking, ender badge on the third `> wait`, terminal note naming
  `arrival`, disabled branch field), then trims the dead command through its
  `✕` and re-runs to zero failures. Fixture restored by `defer`; `git status`
  clean.
- `npx tsc --noEmit` at the repo root → clean.

### Slice 4 — Turn budget (R4) — **needs a wire field**

R4 is the highest-value correctness item and the one convention that exists
nowhere in writing: a parent's command count is a hidden input to every
descendant's turn numbers. Showing the turn beside each command, and warning when
an edit moves a scheduled beat in a descendant, is what stops a green suite going
red for unrelated reasons.

The tab cannot compute it. `score` and `inventory` do not advance the turn while
a *refused* action does — engine knowledge, not text knowledge. So
`CommandResultEvent` needs a `turn` field.

**That is a `packages/` change** (`@sharpee/ide-protocol` + the emitter) and per
CLAUDE.md waits on David. Flagged here rather than assumed.

#### Done — 2026-08-08, session 648342, on David's go-ahead

- **Wire**: `CommandResultEvent.turn` (optional; schema stays v2 — additive) +
  guard. `turn` = the engine turn the command executed as, read off bootstrap's
  `lastTurnResult` — INSIDE the try around `executeCommand`, because a wrapper
  that threw would leave the previous command's record in place, and a stale
  turn on a crashed command is a lie (found by `mutation-verification`, which
  also flagged five untested emission branches; all closed in
  `turn-field.test.ts`, 8 cases). Absent when nothing executed, never guessed.
- **Emitters**: both tiers of branch-tester's runner; `RunEventStream` carries
  the field structurally. Real path: fernhill tree run under
  `--capture-output --json` → **196/196** command-results carry `turn`, run
  green, baseline unchanged.
- **Tab**: a `turn N` column on document-face cards only — the preview stays a
  glance. Meta commands repeat their number; the title says why. The R4 fact is
  pinned real-path: a child document's FIRST turn is > 1, because its numbers
  inherit its ancestors' command count.
- **The warning**: an edit that changes the file's command count, in a file
  others `continues:` from, appends the blast radius to the write confirmation
  ("…4 transcripts continue from it, and every turn-scheduled beat in them now
  falls on a different command."). Counts read through the runner's own parser;
  a half-parsed file yields NO warning rather than a guessed one
  (`commandCount` → null on parseErrors — an unclosed block can swallow the
  commands after it). Real-path: parent add warns with the fixture's true
  count; the same edit in a leaf carries no warning.

### Slice 5 — Goldens as a mode (R6) — **blocked on #239**

"Record this file as a golden" as a visible action, with per-command accept on
re-record. `--bless` exists on the platform bundle and on `transcript-tester`'s
CLI and is **absent from `packages/devkit`**, which is the binary the IDE drives.
Also missing there: `--watch` (ADR-294 D14), `--vary`, `--search`.

Until #239 lands, the editor has no honest way to offer the mode. Issues
#192/#193/#194 are the same wall hit from the UI side, and ADR-290's D5–D8 are
the surviving design for it.

#### The port, and what it actually took — 2026-08-08, on David's go-ahead

`--bless` is now on `sharpee test` (flat, chain, tree), plus `--bless-file
<path>` (tree only, repeatable). Two seams surfaced by reading before building:

1. **Tree × golden was unplumbed.** The golden tier judged a node by its
   DECLARED config, but a tree child inherits seed and channels from its root
   (ADR-302 D8) and declares none — so blessing or replaying any child errored
   "must pin a seed", and `--bless --tree` only ever worked on roots. Fixed
   with `RunnerOptions.resolvedConfig`: the tree runner hands `runTranscript`
   the node's effective config, which only the golden tier's checks read.
   A child's recording carries the root's session seed and replays only
   through the tree — D7's chain-member semantics, falling out for free.
   Declared-keyed behaviour (instruments, reseeds) deliberately unchanged.
2. **Replays never bless.** A replayed execution exists to rebuild a sibling's
   state; under global bless it now runs in REPLAY mode against the recording
   its authored execution just wrote — reproducibility verified for free.

Also fixed en route: devkit's chain path never passed `chain: true` to the
runner, so chain-member goldens were refused with the message that says to use
`--chain` — while `--chain` was exactly what was running.

#### 5a — Record and re-record from the document view. Done 2026-08-08

- The file bar gains **Record golden…** (or **Re-record golden…** when a
  recording exists), two acts like Trash — a first record starts a whole suite
  run, and a re-record overwrites the baseline every future run is judged
  against. Disabled mid-run: recording IS a run.
- The gesture runs the real suite with `--bless-file <file>`
  (`TestRunner.treeRunArguments(storyPath:blessFile:)`) — the whole tree,
  because the file needs its ancestry executed to reach its state. The stream
  fills the tab like any run.
- **Tier is a filesystem fact the host reports** (`TranscriptDiscovery.goldens`,
  re-sent after every run exit): the page never infers tier from run output.
  The document's meta row names the tier; the record offer switches label.
- The record tooltip carries the D2 consequence out loud: once a recording
  exists, the file's per-command assertions stop being evaluated — the
  recording is the assertion.
- Real-path (`testRecordingAGoldenRunsTheSuiteAndTheSurfaceFlipsToTheGoldenTier`):
  two clicks on `concealment` — a CHILD, inheriting arrival's `seed: 42`, so
  the resolvedConfig seam is what makes it possible at all — run the real CLI,
  land `concealment.golden` on disk, keep the run green, and flip the surface
  to Re-record + tier badge via the production disk scan.

#### 5b — per-command accept on re-record: NOT built, and why

The R6 sentence's second half. Two constraints found before building it:

1. **A spliced recording is unsound.** A recording is one deterministic run.
   "Keep command 3's old output, take command 4's new one" produces a file no
   run ever emitted, and its next replay fails — so per-command accept cannot
   mean per-command MERGE. It can only mean a per-command REVIEW of the whole
   re-record (walk the diff, then accept all or keep the old recording).
2. **The wire does not carry the diff.** A golden replay stops at the first
   divergence and `CommandResultEvent` carries `error` + `actualOutput`, not
   the recorded-vs-actual pair per command. A review surface needs either a
   "replay past divergence, carrying diffs" runner mode or the tab reading the
   `.golden` and re-implementing the normalization contract page-side — the
   second is the drift this phase keeps refusing.

Decision deferred to David with this scope note: the honest 5b is a runner
mode + a wire addition, which is its own platform conversation.

---

## 3. What this does not do

- **Play-authoring.** ADR-290/ADR-301 both carry "promoting a played session is
  the reason to build an editor at all." It is not in this scope, because R1's
  evidence says the probe *is* that idea in its cheapest form: `[SKIP]` is
  already "run this, assert nothing," so a probe run is a valid transcript and
  promotion is the edit. Whether the Play pane also feeds the editor is a
  separate decision, and `sharpee play` is broken for scripted input anyway
  (#240).
- **The removed re-bless flow.** ADR-301 A1.2 deleted it. Slice 5 rebuilds it
  against the canonical TypeScript serializer, not by restoring a Swift mirror.
- **Documentation.** Plan item 9 owns the transcript-testing rewrite; #246 owns
  the sharpee.net gap. The palette makes the editor *a* teacher, not the docs.

---

## 4. Open questions

1. **Where the world state for `[STATE:]` comes from (R3).** The run-event wire
   carries text, not world. Offering state assertions from the world means either
   a new event or a separate introspection call. Deferred to slice 3, named now.
2. **Does an edit invalidate the run in view?** The cards show the last run's
   output; editing a command makes that output stale for every turn after it. The
   honest options are re-run on edit (R1's "cheap enough to do after every line")
   or mark downstream turns stale. Decided when slice 2 has something to try.
3. **ADR.** ADR-301's "next decision" is this document's §1. It should become an
   ADR — or an ADR-301 amendment — once slices 1–2 have proved the shape. Writing
   it before building would be the guess Phase 4 exists to avoid.

---

## 5. Acceptance for the phase

Phase 6 is the real acceptance: Fernhill's transcripts written again, through the
editor, without dropping to a text editor or a terminal. Per-slice acceptance
above is the gate for moving to the next slice, not for the phase.
