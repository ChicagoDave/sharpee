# Concept: a Chord story creator for iPad

**Created**: 2026-09-11
**Status**: EXPLORATORY — not an ADR, not a plan, nothing scheduled. This
folder records a design conversation and the decisions taken inside it so the
idea can be picked up cold. No code exists. No Chord change is proposed; every
construct used below is already in `chord.ebnf` as of the 2026-08-29 parity
pass.
**Scope**: An iPad app in which a child builds a Chord story by dragging kinds
and traits onto a canvas, writing prose on a surface of its own, and pressing
Play. The `.story` file is the source of truth throughout.
**Bounded contexts touched**: None yet. The app is a *projection* over the
Chord language surface and the existing browser client; it introduces no
domain concepts of its own. If it proceeds, the one genuinely new concept is
the canvas layout store (see `02-architecture.md`, "Coordinates").

## Companion artefact

A design canvas of twelve annotated iPad artboards accompanies these
documents: <https://claude.ai/code/artifact/555e43da-b11e-4732-9ae6-8b7c4531d679>

Boards: a new story (blank canvas + checklist), the map, the Start Card, a
room open, phrases, on-clauses, the Chord tab, the problem sheet, Play, the
kit, the trait-drop sequence, and a generated inspector.

## Decisions taken

| # | Decision | Where |
|---|---|---|
| D1 | The `.story` text is the source of truth. The editor writes surgical inserts and replacements over ranges; it never reprints the file. | `02-architecture.md` |
| D2 | Audience is children, framed as entertainment or extra credit — a way into IF. Explicitly **not** a classroom tool. | `01-concept.md` |
| D3 | The blank canvas stays blank. No starter world, no ghost cards, no guided first run. | `01-concept.md` |
| D4 | A checklist of the absolute floor sits beside the blank page, and turns into suggestions once met. | `05-checklist-and-diagnostics.md` |
| D5 | The UI uses Chord's own vocabulary — `room`, `thing`, `person`, `playable`, `exit`, `description`, `phrase`, `on`, `score`, `award`, `randomly` — not softened equivalents. | `08-vocabulary.md` |
| D6 | The opening moment is a first-class Start Card on the canvas, not a marker on a room. | `03-interaction-model.md` |
| D7 | Card coordinates live in a `##` comment run inside the `.story` file. No sidecar. | `02-architecture.md` |
| D8 | Single-user editing. The `authors:` list is a byline and may hold several names; it is not collaboration. | `01-concept.md` |

## Open

Distribution is undecided, and it is the fork with the largest consequences.
Two shapes are on the table — a publishing server with filtering, or
export-to-iCloud only with the platform left to a potential buyer. See
`06-distribution.md`. Everything else parked is in `07-open-questions.md`.

## Documents

- `01-concept.md` — what it is, who it is for, what it is not
- `02-architecture.md` — source of truth, surgical edits, projection cards, coordinates, the Play seam
- `03-interaction-model.md` — canvas, cards, palette, drag semantics, prose, the on-clause builder
- `04-generated-ui.md` — why a trait declaration is already a UI schema
- `05-checklist-and-diagnostics.md` — the floor list, suggestions, diagnostics in plain English
- `06-distribution.md` — server vs. export, and what each commits to
- `07-open-questions.md` — parked decisions
- `08-vocabulary.md` — the Chord term → UI label table
