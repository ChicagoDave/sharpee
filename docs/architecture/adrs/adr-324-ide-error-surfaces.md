# ADR-324: IDE error surfaces — one surface per error kind

**Status**: **PROPOSED** (2026-08-22, session 0ebe30). Carries Open Questions, so it is
DRAFT until they resolve. Acceptance does not authorize implementation; the implementing
work is tracked as GitHub issues named in Acceptance.

**IDE change.** Expected surfaces: `tools/ide/SharpeeIDE/Build/` (the bottom panel and its
two residents), `tools/ide/SharpeeIDE/Play/` (the right panel's tab strip and the Diagnosis
view), `tools/ide/SharpeeIDE/Editor/` (in-editor diagnostics), `tools/ide/SharpeeIDE/Compose/`
(the Problems list moves, it does not change shape). No `packages/` change; nothing in the
compiler, the engine, or the wire is touched.

**Date**: 2026-08-22 (session 0ebe30)
**Related**: [ADR-258 D5](adr-258-ide-chord-authoring-environment.md) (Problems is fed by
structured Chord diagnostics over `compose --json` — this ADR moves *where* that list is
shown and changes nothing about what feeds it), [ADR-259 D2](adr-259-chord-browser-build-hatch-modules.md)
(hatch modules are bundled into the browser play build — the one author-controlled route to
a runtime fault), [ADR-297](adr-297-ide-appearance.md) (IDE appearance),
[ADR-321](adr-321-world-index.md) (the World tab, which is heading behind a feature flag —
GH #292 — and needs the same dynamic tab strip this ADR needs)
**Issues**: GH #296 (Diagnosis has one feeder), GH #297 (remove the bottom panel and its
hammer), GH #292 (feature flags — shares the dynamic tab strip)

## Context

The IDE has **four** error surfaces for **two** kinds of error, and each kind is split
across a list and a detail view that live in different docks. Read at `tools/ide` on
2026-08-22:

**Compile-time — compose diagnostics.** `sharpee compose --json` runs continuously as the
author types.

| Surface | What it shows | Where |
| --- | --- | --- |
| **Problems** | severity, stable code, message, `file:line`, click-to-span | bottom panel |
| **Editor underline + gutter flag** | *location only* — no text, no click, no hover | the source |
| **Build tab** | raw streamed stdout/stderr, only on an explicit Build | right panel |

**Runtime — faults from a story playing in the Play surface.** Captured from the page's
`console.error`, `window.onerror`, and unhandled promise rejections
(`PlayViewController.swift:35-52`), symbolicated back to story source where the frames map.

| Surface | What it shows | Where |
| --- | --- | --- |
| **Game Errors** | the list of symbolicated faults | bottom panel |
| **Diagnosis** | the explanation of **one** fault, selected from that list | right panel |

Three facts make this worth deciding rather than tidying.

**The underline cannot name itself, and the code knows it.** `setDiagnostics`
(`EditorViewController.swift:413-431`) adds an underline attribute and a gutter flag. There
is no `mouseDown`, no tooltip, no popover anywhere in the Editor folder — the only
`mouseDown` is the tab bar's. `handleComposeOutcome` compensates by force-revealing the
bottom panel on the clean → not-clean edge, with this comment (`MainWindow.swift:629-634`):

> the panel is collapsed by default, so a diagnostic could underline the editor while the
> only surface that NAMES it stayed hidden — the author saw a coloured squiggle and no text
> anywhere.

That is a workaround for a missing capability, and it makes the bottom panel load-bearing
for a reason that has nothing to do with the bottom panel.

**Diagnosis is a permanent tab for an event a Chord author cannot easily cause.** Its only
feeder is a Play-surface fault. A pure-Chord story essentially cannot produce one: the
analyzer name-checks the story at compile time, so what would be a runtime crash in a
hand-written game is a compose diagnostic here. The author-controlled route is a **hatch
module** that throws (ADR-259 D2 bundles hatches into the play build); the other routes are
an engine bug and a broken bundle. David, 2026-08-22: *"I have never seen a runtime error
and wouldn't know how to create one."* A tab nobody can fill is a tab nobody can learn.

**The Build tab and Problems are two renderings of one failure.** Build shows the compiler's
raw output when the author runs a build; Problems shows the same failure as structured rows,
continuously. Neither is wrong; having them in different docks is.

## Decision

### D1 — Two kinds, named

The IDE recognizes exactly two kinds of error, and the vocabulary is fixed:

- A **compose diagnostic** is anything the Chord compiler can derive from source. It has a
  severity, a stable code, and a span. It is the author's mistake, and it is the normal case.
- A **runtime fault** is an uncaught error, a rejected promise, or a `console.error` from a
  story running in the Play surface. It usually means a hatch module threw or the platform
  broke. It is **not** the normal case, and it is rarely the author's mistake.

Every surface below owns one kind. No surface shows both.

### D2 — The Build tab owns compile-time

The Problems list moves into the right panel's Build tab, beside the raw build output it
already duplicates. Build becomes "what happened when I compiled": the structured, clickable
list of compose diagnostics, and the raw log.

Nothing about the list changes — same records from `compose --json`, same severity/code/
message/site columns, same click-to-span. ADR-258 D5 is unaffected in substance; only the
surface's location moves.

### D3 — An underline must be able to name itself

In-editor diagnostics stop being location-only:

- **Hover** over an underlined span shows the diagnostic's message.
- **Click** shows the message together with its stable code.

The underline is a locator; the message is the content. An author must be able to read what
is wrong without leaving the source. This is the capability the auto-reveal in
`handleComposeOutcome` exists to substitute for, and it retires that workaround.

### D4 — Diagnosis becomes the runtime surface, list and all

The Diagnosis tab takes the Game Errors list as its own: the list of runtime faults on top,
the selected fault's explanation below it. `ErrorDiagnosisView`'s content — translated title,
how-to-fix, clickable frames, original error — is kept as-is; it gains the list that gives it
context.

The tab's name must say what it holds rather than what it does to it. "Diagnosis" describes
the view's behaviour; the author needs to know it is where a *running story's* faults appear.

### D5 — The bottom dock is removed

With Problems in Build and Game Errors in Diagnosis, the bottom panel has no residents.
Removed: `BottomPanelViewController`, the rail's hammer button and its `onBuildToggle` /
`rail.build` identifier, the bottom split item, and its divider-persistence and collapse
state.

### D6 — A runtime fault must be producible on demand

The IDE ships a way to cause one. A fixture story with a hatch that throws, kept beside the
IDE's other test fixtures, so the runtime surface can be exercised, demonstrated, and
regression-tested without waiting for the platform to break.

This is a decision and not a nicety: a surface no one can trigger is a surface no one can
verify, and D4 rebuilds that surface.

### D7 — The invariant

**Every error is readable where it is discovered.** A surface may not be the only namer of
something another surface shows without text. Concretely: the editor shows a diagnostic, so
the editor must be able to say what it is (D3); Diagnosis explains a fault, so it must carry
the list that fault came from (D4).

This is the rule the current arrangement breaks, and the reason the fix is a consolidation
rather than three independent cleanups.

## Non-goals

- **Not a redesign of the diagnostic text.** Severity, codes, messages, and the translator's
  Sharpee-speak are unchanged.
- **Not a change to compose scheduling.** When compose runs, and how often, is untouched.
- **Not a quick-fix system.** D3 shows a message; it does not offer to apply a change.
- **Not a change to what the compiler reports.** No `packages/` work is in scope.

## Consequences

**The right panel's tab strip must become dynamic.** GH #292 needs the same thing for
flag-gated tabs (the World tab). Whichever lands first builds it; the other consumes it.

**Removing the bottom dock is a session-restore change.** Its divider position and collapse
state are persisted; the removal has to drop that state without corrupting the rest of a
restored layout.

**ADR-258 D5's surface moves.** Its decision — Problems is fed by structured Chord
diagnostics over `compose --json` — stands unchanged in substance. **Flip owner and trigger**:
whoever accepts this ADR amends ADR-258 D5 in the same commit, noting that the list's location
moved to the Build tab by ADR-324 D2. An unowned flip is how Status lines in this corpus
became untrustworthy; this ADR does not add another.

**The auto-reveal in `handleComposeOutcome` is retired by D3**, not merely relocated. Once an
underline can name itself, force-opening a panel on the clean → not-clean edge is no longer
compensating for anything.

**Tests move with the surfaces.** The bottom panel's tests, the rail-button tests, and any
test asserting Problems' location need to follow rather than be deleted.

## Acceptance

- **AC-1** — Compose diagnostics appear in exactly one list, in the Build tab, with severity,
  code, message, site, and click-to-span behaviour unchanged from the current Problems tab.
- **AC-2** — Hovering an underlined span in the editor shows that diagnostic's message;
  clicking shows the message and its stable code.
- **AC-3** — With the editor showing a diagnostic and every panel collapsed, the author can
  read what is wrong without opening another surface. (D7, measured against the failure the
  `handleComposeOutcome` comment describes.)
- **AC-4** — The runtime surface shows the list of faults and the selected fault's
  explanation together, and its tab name identifies it as the running story's faults.
- **AC-5** — `BottomPanelViewController`, the hammer rail button, and the bottom split item
  are gone, and a restored session that recorded a bottom-panel layout still restores cleanly.
- **AC-6** — A fixture story with a throwing hatch exists, and playing it produces a fault in
  the runtime surface with at least one frame symbolicated back to story source.
- **AC-7** — No surface shows both kinds (D1), and no test asserts on a surface that no longer
  exists.

## Open Questions

- **Q-1** — How does the Build tab hold two things at once: a split (list above, log below), a
  segmented control, or a sub-tab strip like Index's sections?
- **Q-2** — What is the runtime tab called? "Game Errors" names the content; "Diagnosis" names
  the view; neither says *running story* on its own.
- **Q-3** — Does the compose-diagnostic list survive at all once D3 lands, or do the editor's
  hover/click plus the raw build log cover it? (David's read on 2026-08-22 is that the bottom
  panel "does show a good message", which argues for keeping the list.)
- **Q-4** — D3 says hover shows the message and click shows message-plus-code. Is the click
  target a popover the author dismisses, or a transient like the hover?
- **Q-5** — Where does the throwing-hatch fixture live — `tools/ide/test-fixtures/`, or a
  `branch-stories/` entry that the IDE's tests point at?

## Session

Session 0ebe30 (2026-08-22), branch `feat/adr-321-world-index`. Written from a reading of
`tools/ide` on that date, prompted by David's observation that three surfaces compete to
report errors and that Diagnosis has never shown him anything.
