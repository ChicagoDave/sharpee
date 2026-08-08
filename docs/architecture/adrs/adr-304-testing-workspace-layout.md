# ADR-304: The Testing Workspace — a Modal Play-Left Layout

**Status**: ACCEPTED (2026-08-08, session c29681) — selecting the Testing tab enters a
testing workspace: the Play surface takes over the left pane and the Testing tab holds
the right (D1); the workspace is modal, with one entrance and one unmissable exit,
deliberately rejecting Inform's any-tab-in-any-pane (D2); the running story survives
entry and exit — the Play web view is reparented, never reloaded (D3); the editor's
state is restored on exit (D4).

**Date**: 2026-08-08 (session c29681)
**Depends on**: ADR-301 (the Testing tab this workspace hosts), ADR-252 (the browser
bundle the Play pane serves)
**Origin**: go-live Phase 6 acceptance pass (phase-6 log F7; proposal
`phase-6-fallout` P-5). David: "when you tap the Testing Tab, the Play Tab takes over
the left pane and add some kind of Exit Testing action to put the IDE back to its
normal state."

---

## Context

Writing a transcript is a loop between *playing the story* and *editing the test*:
the author plays to see what the story says, then asserts on it. In the current
layout, Play and Testing are both right-panel tabs, so the loop is constant
tab-flipping — the Phase 6 acceptance pass hit this within the first hour of real
use. Inform 7 solves it by allowing every tab in both panes; David has rejected that
shape explicitly ("I've never liked that"): a fully general pane system makes every
layout a per-user accident, and no layout ever *means* anything.

Two facts about the existing architecture shape the solution. The left pane is
MainWindow-managed and already hosts exactly one primary surface (the editor). The
Play pane is a child view controller around a `WKWebView` served over a custom
scheme; an `NSView` can be reparented without the web view reloading, so the running
story can move between panes alive.

## Decision

- **D1 — Selecting the Testing tab enters the testing workspace.** The Play surface
  moves to the left pane (where the editor normally sits); Testing occupies the
  right panel. The two surfaces of the authoring loop are on screen together.

- **D2 — The workspace is modal, with one entrance and one exit.** The entrance is
  the Testing tab itself; the exit is an explicit, unmissable **Exit Testing**
  affordance that restores the normal editor layout. There is no general
  tab-to-any-pane mechanism, and none should be added later as a "generalization"
  of this — the modality is the point: the layout always means "I am testing."

- **D3 — The running story survives entry and exit.** The Play web view is
  reparented, never torn down or reloaded, in both directions. An author who has
  played twenty turns into a scene and taps Testing keeps those twenty turns.

- **D4 — The editor's state is restored on exit.** The open document, cursor, and
  scroll position return exactly as they were. Entering the workspace must not cost
  the author their place in the source.

## Consequences

- MainWindow owns a second layout state, and every future pane/tab feature must
  answer "what does this do in the testing workspace?" — one extra case, never a
  combinatorial pane matrix (that is what D2 forecloses).
- The Play header's own controls (Play after build, reload) travel with the pane;
  their behavior inside the workspace is implementation detail, but they may not be
  silently dropped.
- The play-selection transcript flow (proposal P-7 / issue 254) composes with this
  layout — select on the left, transcript appears on the right — and should be
  designed against the workspace, not the tabbed layout.
- Rejected alternative, recorded so it stays rejected: Inform-style any-tab-in-any-
  pane. Revisiting it requires superseding this ADR, not extending it.

## Session

Decided 2026-08-08, session c29681, during the go-live Phase 6 acceptance pass
(transcripts written through the editor for the first time). Recorded from David's
directive shape; the invariants (D3, D4) name what would make the feature feel
broken if violated.
