# ADR-290: Test creation is an atomic mode, not a toggle over free play

## Status: DRAFT (2026-07-29, session 47d0be) — open questions unresolved; do not implement

## Date: 2026-07-29

## Parent: ADR-282 (play-to-test — the feature this reconsiders; its D1/D2/D3/D4 gestures survive, its *flow* does not), ADR-277 (integrated testing + transcript recording — the machinery underneath), ADR-280 (project model — the folders tests land in), ADR-163/ADR-170 (channels and the framework-free client — why the blessed mark is the client's job), ADR-284 (`sharpee publish` — where the menu option lands).

## Context — verified, not assumed

ADR-282 shipped through Phase 4 and every acceptance criterion passed. The
feature is implemented and, in David's words, "it's unclear how anyone would
use it." The findings below come from reading the shipped code on 2026-07-29,
not from the ADR text.

- **A recording begun mid-play produces a test that cannot pass.**
  `RecordingSession.start()`
  (`tools/ide/SharpeeIDE/Test/RecordingSession.swift:98`) clears `turns` and
  sets `isRecording`. It does **not** restart the story. An author who plays
  40 turns, presses Record, plays 3 more, blesses one and saves gets a
  transcript of 3 commands which the runner replays **against a fresh world** —
  where the blessed response cannot reproduce, because the state that produced
  it took 40 turns to reach. Nothing warns, and the file is written. This is a
  correctness hole, not a usability wart: the IDE silently authors failing
  tests.
- **Bless is dead until Record, and the UI never says why.**
  `canBlessLatestTurn` (`RecordingSession.swift:159`) requires `isRecording`,
  so `PlayHeaderView` renders the button disabled with the tooltip "Vouch for
  this turn's response (⇧⌘B)" — which explains what it does and never why it
  cannot. An author playing their story sees a permanently grey button and no
  path to making it live.
- **Selection silently changes the assertion's meaning.**
  `toggleBlessOnLatestTurn(rawSelection:)` routes through
  `RecordedTurn.fragment(selected:)`: with a selection the turn serializes as
  `[OK: contains "…"]`, without one as verbatim `[OK]`. The button reads
  "Bless" either way. Compounding it, selection in the Play pane **never
  worked at all** until 2026-07-29 — `InputManager`'s document-click handler
  refocused the command input, collapsing the selection a drag had just made
  (fixed; ADR-282 second amendment).
- **A saved test was invisible until the project was reopened.**
  `writeRecording` announces via `onTranscriptRecorded`
  (`PlayViewController.swift:435`), wired in `AppDelegate.swift` to
  `testController?.attach(storyFile:)` — the Tests panel only. Nothing
  re-scanned the file tree. Fixed 2026-07-29 (`refreshProjectTree`), recorded
  here because it names the class of gap: the write path had no owner for
  "what else observes this directory."
- **Restart does not restart.** `PlayViewController.restart()` (line 209) is
  `webView.reloadFromOrigin()` and nothing else. The client's autosave
  restore-on-start then replays the previous world. The codebase already knows
  this hazard: `invalidateForSourceChange()` clears `localStorage` first and
  documents it as "the playground-autosave failure mode." Restart skips that
  step. It also leaves the recording session and the Bless/Checkpoint
  affordances untouched.
- **The Play pane serves the full standalone client**, `dist/web/<story>/
  index.html` (`WebBundle.swift:26`), whose menu markup lives in
  `packages/devkit/templates/browser/index.html` — a File/Settings/Help menu
  bar plus save/restore dialogs, competing with the IDE's native menus.
  Structurally the client already tolerates its absence: `menuBar` is
  `HTMLElement | null` (`platform-browser/src/types.ts:148`) and `MenuManager`
  wires every element with `?.`.
- **Blessed state is visible only on the header button** ("Blessed ✓",
  `PlayHeaderView.swift:132`). Nothing marks *which* turn carries the vouch,
  and with the gesture always targeting `latestTurnIndex` the author has no
  confirmation they blessed the turn they meant.

## Decisions

### D1. Test creation is an atomic mode, not a toggle over free play

Entering is a single deliberate act with two exits: save, or discard. Record
as a switch that can be flipped at any point over an ongoing session is
withdrawn.

This is the decision the rest follow from. It is chosen for correctness before
usability: a transcript replays from turn zero, so a capture that does not
begin at turn zero is not a test. Making capture coextensive with a mode that
starts fresh renders the broken-transcript case **unrepresentable** rather than
discouraged.

### D2. Entering the mode restarts the story to a clean world

Including the `localStorage` clear that `restart()` currently omits, so the
client's autosave cannot replay a stale world into turn one of the capture.

### D3. Restart inside the mode restarts story and capture together

They are one object once D1 holds, so one gesture governs both. Outside the
mode, restart only clears and reloads the pane. This retires the question of
what a mid-recording restart does to captured turns — there is no longer a
state in which that is ambiguous.

### D4. Leaving the mode is explicit: Save Test, or Discard

Discard is the only destructive exit and is now a deliberate act rather than a
side effect of some other gesture. Save writes the transcript (single file, or
a chain when checkpoints are present, per ADR-282 D3/D4) and refreshes both the
Tests panel and the project tree.

### D5. The blessed mark is rendered by the client, on instruction from the IDE

The IDE tells the play surface which turns carry a vouch; the client renders
the mark with its own `sharpee-`-prefixed classes.

Rejected alternatives: **injecting** DOM or CSS from Swift (cheapest, but
abandons ADR-282's no-injection stance and puts IDE-authored markup inside a
page the author owns), and an **AppKit overlay** above the web view (no
platform change, but it must track scroll offset and text reflow and will
drift out of registration). D5 is the only option consistent with the client
being author-customizable and with the decoration model — an author restyles
the mark like any other decoration.

### D6. The client's menu becomes optional at build/publish time

One mechanism, two consumers: the IDE always builds the menu-less variant; a
publishing author chooses. Rejected: an IDE-special `index.html`, which would
fork the template and drift.

**Consequence that must not be silent**: `Save`, `Restore`, `Restart` and
`Quit` are reachable *only* from that menu (`MenuManager`'s `menu-save`,
`menu-restore`, `menu-restart`, `menu-quit`). Menu-less is correct for the IDE,
which has native equivalents. For a published game it means no save/restore UI
at all unless the author supplies one, so the publish option must say so where
the choice is made.

### D7. A write into the project has one owner for "who else observes this"

The saved-test-invisible bug was not a missing call; it was a missing owner.
Any path that writes into the open project announces once, and the announcement
fans out to every observer — Tests panel and project tree today.

## Acceptance

1. Entering test-creation from a story played to an arbitrary depth produces a
   transcript whose first captured command executes against a fresh world —
   pinned by asserting the saved transcript replays green under the runner,
   not by asserting the mode was entered.
2. A saved test appears in the sidebar without reopening the project.
3. A blessed turn is visibly marked in the play surface, and the mark
   identifies *which* turn.
4. A story built for the IDE renders no in-page menu bar; a story published
   with the menu option on still does.
5. Discard leaves no `.transcript` behind and no panel told to re-scan.

## Consequences

- **ADR-282's flow is superseded; its gestures are not.** Per-turn bless,
  selection-as-fragment, checkpoint-splits-a-chain, the serialization
  (`assertionLines(for:)`), the zero-bless refusal and the re-bless failure
  view all stand as built. What changes is when capture starts, what bounds it,
  and what the author sees.
- **Two further `packages/` changes are implied** (D5's mark, D6's optional
  menu), on top of the two ADR-282 authorized and the one its second amendment
  added. That accumulation is why this is a new ADR rather than a third
  amendment.
- **Record-as-a-toggle disappears from the header**, which is a visible change
  to a shipped surface.
- The correctness hole in Context means **transcripts recorded before this
  lands may be silently unreplayable**. Whether existing recordings are
  audited is Q6.

## Open Questions

1. **Naming.** "Bless" is Inform/IF-testing vocabulary; an author will not
   decode it from a button. Does the gesture keep the name, and does the mode
   get one of its own ("New Test from Play"? "Record Test"?)
2. **Fragment visibility.** A bless with a selection asserts `contains`; without
   one it asserts the whole response. How does the author see which they are
   about to make — and which they made?
3. **What the mark looks like.** Gutter icon, background tint, inline badge?
   D5 fixes who renders it, not what it is.
4. **Publish default.** Does the menu option default on or off, and when off,
   what (if anything) replaces save/restore for a published game?
5. **Entry preconditions.** Does entering the mode require a current build, or
   force one? A capture against a stale bundle has the same class of problem
   D1 closes.
6. **Existing recordings.** Are transcripts recorded under the old flow
   audited for the mid-play-start defect, or left alone?

## Tracked work

The findings this ADR was drafted from are filed individually, so triage happens
in GitHub rather than against ADR prose. Each cites this ADR for its design; this
ADR is where the decisions live, not a substitute for the issues.

| Issue | Covers | Decisions |
| --- | --- | --- |
| [#192](https://github.com/ChicagoDave/sharpee/issues/192) | Mid-play recording writes an unreplayable transcript — the correctness bug | D1, D2 |
| [#193](https://github.com/ChicagoDave/sharpee/issues/193) | Undiscoverable flow: Bless dead until Record; selection silently changes the assertion | D1; Q1, Q2 |
| [#194](https://github.com/ChicagoDave/sharpee/issues/194) | Blessed turns unmarked in the Play panel | D5; Q3 |
| [#195](https://github.com/ChicagoDave/sharpee/issues/195) | Restart does not clear the pane — autosave replays the old world | D2, D3 |
| [#196](https://github.com/ChicagoDave/sharpee/issues/196) | Menu-less client for the IDE; menu as a publish option | D6; Q4 |

**Not filed**: the saved-test-invisible bug (D7's motivating case) was fixed in the
same session it was found — `refreshProjectTree()` in `MainWindow.swift`, called
from the `onRecorded` closure in `AppDelegate.swift`. It is recorded in Context
because it names the class of gap D7 addresses, not because it is outstanding.

## Related parked work

Two issues parked from session aaa5bb (2026-07-28) sit on the same authoring
surface and are blocked for the same reason this ADR exists — design owed
before code. Listed here so the Chord Writer UX work is visible in one place;
neither is in this ADR's scope and neither should be folded into it.

- **[#187](https://github.com/ChicagoDave/sharpee/issues/187) — Chord story
  block: `title:`/`authors:` fields, and the missing IFID (ADR-074
  regression).** Needs its own **language** ADR: a breaking grammar change
  touching `packages/chord/src/ast.ts`, every story in the repo, the devkit
  template, the book, and sharpee.net. Two contact points with this ADR's D6:
  `sharpee publish` (ADR-284) is the same surface the menu option lands on, and
  the issue asks whether publish should *require* an IFID — a published game
  with no stable identifier and no save UI is a combination worth deciding
  deliberately rather than by accident.
- **[#188](https://github.com/ChicagoDave/sharpee/issues/188) — Chord Writer
  window title shows the story title, centered.** Depends on #187: the title is
  currently a positional literal inside the story block, so until it is a field
  the IDE must compile or introspect to learn it. Also a reversal of a ruling
  made the same day (commit `9a028c05` reduced the title to the product name),
  and ADR-279 D1 owns app identity — so it belongs as an amendment there, not
  as a silent code change.

Neither blocks this ADR, and this ADR blocks neither.

## Session

Drafted 2026-07-29, session 47d0be, after David reported the shipped feature
as unusable ("the bless feature is implemented, but it's unclear how anyone
would use it") and ruled the redesign design-first. The atomicity framing is
David's ("the test creation tool has to be more atomic"); the correctness
argument for it was found while verifying that framing against
`RecordingSession.start()`.
