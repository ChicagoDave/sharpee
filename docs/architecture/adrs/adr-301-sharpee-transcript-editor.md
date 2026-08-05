# ADR-301: The Sharpee Transcript Editor

**Status**: TBD — not decided, not scheduled
**Date**: 2026-08-04 (placeholder, session 5113ca)
**Depends on**: ADR-300 (the model, serializer, grammar, and channel addressing)

> **This number was previously used for something else.** An earlier ADR-301,
> "The Opening as Addressable Channels," was deleted; all eleven of its
> decisions live in ADR-300 as D6–D16. Session notes from 2026-08-04 that cite
> ADR-301 mean that document, not this one.

---

## Purpose of this file

An editor for `.transcript` files is wanted but not decided. This ADR exists to
hold the design ideas that are worth keeping and to name the question that has
to be answered before anything is built. It decides nothing.

An earlier ADR-300 specified such an editor in full — a standalone, CLI-hosted,
framework-free web tool. That specification was removed rather than archived,
because its central premise did not survive examination (see Open Question
below). What follows is the part that was worth keeping.

---

## Design ideas worth keeping

These originate in ADR-299 and survived its supersession as *design*, not as
implementation. The Swift that implemented some of them does not travel.

- **Play authors the transcript.** Writing a transcript by hand means typing
  commands blind and pasting expected output. Playing the story and promoting
  the session into a transcript is the genuinely valuable idea, and the reason
  to build an editor at all.
- **Card per turn.** A turn reads as a card carrying its command, expected
  output, actual output, and verdict — verdict as tint, plain when unblessed,
  green when blessed.
- **A column per transcript file**, not per tree path.
- **`contains` by selection, not by typing.** Run the turn, select text in the
  actual output, and the editor writes `[OK: contains "…"]` with the selection.
  Accepting the whole response with nothing selected writes `[OK]` plus a
  literal block. This is the default gesture because the `contains` family is
  92.6% of all assertions in the corpus.
- **A `[GOAL:]` section is a unit.** It is created and deleted whole, so no
  gesture can leave an orphaned `[GOAL:]` or `[END GOAL]`.
- **Removed grammar is unreachable by construction** — no free-text mode that
  could type a form the grammar no longer accepts.
- **Drift is re-bless.** When a run fails because the story legitimately
  changed, re-blessing locates the block a command owns and replaces only its
  content, and refuses to widen a `contains` claim.
- **The generated source is visible.** A read-only pane shows exactly what
  ADR-300's serializer will write, beside the cards.

---

## Open Question — what hosts it?

**This is the question that must be answered first.** The removed specification
assumed a standalone CLI-hosted web tool and never settled what the CLI would
serve that interface *to*. A web UI needs a host that owns a web view; an editor
needs to write files; and verification needs the engine. Nothing decided that.

What is known:

- The macOS IDE owns a `WKWebView` and serves its web bundle over a custom
  scheme handler (`sharpee-play://`), no HTTP server involved — because
  `file://` gives a null origin and breaks `localStorage`. That pattern works
  and is on disk.
- `dist/cli/sharpee.js` is a testing tool, not an authoring product. A GUI on it
  serves nobody's actual workflow.
- The VS Code extension already registers webview providers, owns `.transcript`
  as a language, and discovers every transcript in a workspace — but
  plain-TypeScript authoring in VS Code is **not** a current priority.
- The platform is secondary to Chord and the IDE. An editor that does not serve
  those is hard to justify.

Do not start building until this is answered.

---

## Session

Placeholder created in session 5113ca (2026-08-04, branch `main`) when the
earlier ADR-300's editor program was dismantled and its channel/transcript
decisions consolidated into the new ADR-300. Two numbers were reused in that
consolidation: this file took 301 from the deleted "Opening as Addressable
Channels," and the 302 number informally reserved during session 088e3e for
dissolving `main` is unused — that work is ADR-300 D8.
