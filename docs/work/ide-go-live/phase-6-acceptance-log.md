# Phase 6 — Transcript acceptance pass log

Go-live plan: `docs/work/ide-go-live/plan-20260806-go-live.md` Phase 6.
Started 2026-08-08, session c29681, branch `feat/ide-go-live-phases-1-3`.

**The exercise.** Phase 4's exercise, repeated with the editor as the writing
surface: Fernhill's suite (15 transcripts as of Phase 4's rewrite) is produced
again, this time entirely through the Testing tab — create, write, assert,
record, run — without dropping to a text editor or a terminal. This file
records every drop-out (any moment the UI could not do it and a text editor or
terminal was reached for), plus friction in Phase 4's sense: what had to be
looked up, what was got wrong, what was tedious.

**Acceptance rule** (verbatim from the plan): "They can be produced through
the UI without dropping to a text editor or a terminal. If that is painful,
Phase 5 is not done, whatever its own tests say. The resulting suite is what
Phase 8 ships."

**Baseline.** The pre-exercise suite state is pinned by commit `0546de1f`
(161 passing via `sharpee test --tree`). Staging (David's call, 2026-08-08):
the 15 transcripts were `git mv`ed to
`docs/work/ide-go-live/fernhill-transcripts-phase6-baseline/`, leaving
`branch-stories/fernhill/tests/transcripts/` empty — the tab starts the way a
fresh author's does, and the rewrite happens without reading the originals
(Phase 4's no-peeking rule carries over).

---

## Drop-outs

### D1 — There is no way to create the first transcript

Reported by David within minutes of opening the tab over the emptied suite:
"I'm not seeing any UX to create tests." Confirmed in source: the tab's only
create affordance is the "Branch from this transcript…" field in the file bar
of an **open** transcript (`views.ts` `fileBar`), and `newBranch` requires
`surface.opened` and always writes `continues:` (`main.ts`). So an empty suite
is a dead end — nothing exists to open, so the one create entry point never
renders — and even a populated suite has no direct way to create a new *root*
transcript (branch-then-promote is the only route). The wire below is complete
and tested (`createTranscript` → `created`/`createFailed`; `newTranscript()`
accepts a missing `continuesFrom`); the gap is purely the missing surface.

Phase 5's slice 3 ("new, delete, `continues:`") implemented "new" only as
branch-from-open. The exercise caught it on the first gesture.

## Drop-outs (continued)

### D2 — The just-created transcript cannot be given its first command

Reported by David right after D1's fix ("I see no way to add a command
either — I played the game and tried reload — nothing"). Root cause is a
contradiction inside the tab: `saveOutlook` classifies a zero-command file
`unsound` (via `validateTranscript`'s "Transcript has no commands"), and
`commandBar` disables itself on `unsound` — placeholder "The test run would
refuse this file — fix it in the editor first", which for an empty file is
circular: the fix IS the first command, and `addCommand` was deliberately
written to accept exactly this file (`editable(text, file, true)` — "this is
the edit that fixes it — so that one problem is not a bar here"). The
designed loop create → add first command → run was unreachable end to end.
Fix: `SaveOutlook` gains a first-class `empty` kind (parses, zero commands,
otherwise valid); the add bar enables on it; the source face says "no
commands yet" instead of the unsound refusal.

## Friction

### F2 — Adding a command gives no visible result (batch, David, 2026-08-08)

"Adding a command shows no feedback unless I rebuild and come back to the
testing tab." Cards are RUN turns; an authored-but-unrun command renders
nothing — the only signal is the edit-note line at the bottom ("Wrote >
north — run again to see it evaluated"), which went unnoticed. The
invisibility caused a double-add: two `> north` commands, hence two cards
after the next run. **Built on David's direction** (same day): authored
commands beyond the run render as cards immediately — [NEW] badge, warn-color
left edge, guidance naming the next step; assertions written since the run
show at once as orange `claim fresh` chips ("new — not tested until the next
run"), tracked by the editor at write time (keyed by command input, so line
shifts can't misattach them), while STALE claims stay hidden exactly as
before. Placeholder [SKIP] is presented as guidance, not as a claim.

### F3 — Selecting card text is impossible: the render race kills the drag

David: "they just turn light blue until the mouse click is completed. No
card can be selected... I would guess I should be able to select parts or
all of the text in the card to change SKIP to CONTAINS." The guess IS the
design (R8: select output → promote bar offers `[OK: contains "…"]`) — and
it is broken with a real mouse: `installSelectionWatcher` re-renders the
document when the pending promotion changes, and `renderDocument` starts
with `view.replaceChildren()`, which destroys the very selection being
dragged. Mid-drag: selectionchange → render → nodes replaced → selection
collapses. The Swift real-path promote test passes because it drives the
selection synthetically (range set + promote read before interaction
matters) — a gap between the driven path and the human one. Fix direction:
selection changes must never rebuild the turns subtree; patch the promote
bar in place.

### F4 — [SKIP] reads as an un-changeable default

The two-gesture design (a command executes first, the author asserts on
what it actually said) is invisible: nothing says "run it, then select the
output you care about." Compounded by F3 — the second gesture is broken —
and by F2 — the first gesture shows nothing.

### F5 — File-bar vocabulary is opaque

"Branch From/Branch/the drop-down that contains 'A root' is opaque; Record
Golden is meaningless to me or a new user." Copy/discoverability: the
reparent picker and branch field assume the tree mental model is already
held; "golden" is runner vocabulary (ADR-294) surfaced raw.

### F6 — Trash works but says nothing the author notices

"Trash seems to do nothing after its confirmation." It worked —
begin.transcript went to the macOS Trash (suite dir empty, 15:22). The
signals were a one-line status ("Moved begin to the Trash.") and the
document closing back to browse. Feedback needs to be unmissable.

### F7 — Play and Testing want to be on screen together

David: writing transcripts means replaying the story to see what it says —
but Play and Testing are both right-panel tabs, so the loop is tab-flipping.
His sketch: tapping the Testing tab puts the PLAY surface in the left pane
(over the editor), with an explicit "Exit Testing" action restoring the
normal layout — a modal testing workspace rather than Inform's
any-tab-in-any-pane. Tracked as a design item (#252); not built mid-phase.

### F8 — Auto-assertion policy on command add

David: a Testing settings choice for what adding a command asserts
automatically — room description / room name + room description / all
emitted text from the command / "let me decide" (today's behavior, the
[SKIP] placeholder). Sharpened 2026-08-08: "all emitted text" means any
ORDERED emission — before text, room name, description, list contents, NPC
activity — asserted in order, all of them; the menu is really "which
emissions get asserted." Note the mechanics: the output a policy would assert on
does not exist until the command first RUNS, so the policy is really "on a
NEW command's first run, auto-write which assertion?" — contains(room name)
and location can come from the world capture (R3), all-emitted-text is the
golden tier's per-command shape. Product surface (testing intelligence,
ADR-294 family). Tracked as #253; not built mid-phase.

### F9 — Create transcripts by selecting played commands

David: the Play pane should grow a left-margin selection surface — play the
story, select the commands that made the moment, **Create Transcript**, and
the auto-assertion rule (#253) runs over them. "This would make transcript
test creation stupid easy." Tracked as #254 with the design points (seed
pinning, mid-session prefixes, meta commands); composes with #252's testing
workspace and #253's policy.

### F1 — Running the just-created empty transcript kills the whole run

The editor's own happy path walks into it: create `begin` (D1's new bar),
press Run Tests before typing the first command — the tab shows FAILED 1,
`error — Transcript has no commands`, and the red status "The test run ended
without completing its stream." The empty file is *deliberate* (a new
transcript carries no placeholder command; the first is the author's), so the
suite's designed starting state is one the runner treats as a stream-ending
error rather than one failed node. Diagnosed (CLI repro, scratch story with one empty + one good transcript):
the stream itself completes (`run-end`, exit 2) but **nothing runs** — the
good transcript never executes. `validateTranscript` (branch-tester
parser.ts) lumps "Transcript has no commands" in with real parse errors, and
`test-tree.ts` treats any validation error on any file as the D11 all-or-
nothing gate ("N transcript(s) failed to parse — nothing ran"). D11's
principle is right for structural defects (cycles, missing parents, real
parse errors) — but an empty transcript is not structural: it is a no-op
node (zero commands contribute nothing to a child's replay), and it is the
editor's own designed starting state. Secondary tab defect: the red banner
says "ended without completing its stream" even though `run-end` arrived —
the wording should be reserved for a stream that actually truncated.
**Ruled and built** (David: "skipped is fine", 2026-08-08): empty
transcripts run as `skipped` end to end. Wire: `transcript-end` gains status
`skipped` (guard + test). Runner: `tree-runner` skips zero-command nodes
without booting or blocking children (a replay visit contributes its zero
commands silently); `NodeRunOutcome` and `TreeObserver.onNodeSkipped` carry
it; the report line reads "N skipped (no commands yet)" and the summary
never counts a skip as a failure. Gates: both parse gates (devkit
`test-tree`, branch-tester CLI) exempt zero-commands-as-sole-problem; any
other defect keeps D11. Tab: `skipped` node status, warn-colored hollow dot,
result line "skipped — no commands yet; open it and add the first one".
Evidence: branch-tester 398, transcript-tester 267, ide-protocol 45, devkit
test-json 19, tab 87 — all passing; CLI repro (empty `begin` + passing
`good`): begin `skipped`, good `passed`, exit 0, report "1 passed, 1 skipped
(no commands yet)"; `tsc --noEmit` clean; all four packages rebuilt dist +
dist-esm; tab bundle rebuilt.
