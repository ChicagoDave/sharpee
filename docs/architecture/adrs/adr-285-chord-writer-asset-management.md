# ADR-285: Chord Writer asset management — images and audio as first-class citizens

## Status: ACCEPTED (2026-07-28, session fda0f0 — David's accept-all after the full-family review; remaining questions deferred as non-blocking)

## Date: 2026-07-27

## Parent: ADR-280 (project model — the Assets artifact this manages), ADR-216 (Chord declared media — ACCEPTED and implemented), ADR-138 (audio subsystem), ADR-163 (channels).

## Context — verified, not assumed

- **The media pipeline is complete end-to-end, today**: Chord declares
  assets (`define sound|image|music <name> from "<file>"`, ADR-216) and
  plays/shows them via typed sugar (`play sound`, `play music [looping]`,
  `show image <asset> [in <layer>]`, `play ambient`, …), lowering onto
  payloaded `media.*` channel emits (`packages/chord/src/ast.ts`); the
  browser client renders them (`packages/platform-browser/src/channels/
  image.ts`, `channels/audio.ts`, the `sharpee-media` slot); the devkit
  browser build copies author assets into the artifact.
- **Asset names are typo-checked at compile** (ADR-216: sugar statements
  reference declared assets by name, checked at analysis).
- **The IDE has no asset surface at all**: writers hand-place files and
  hand-write `define` lines with no preview, no import flow, and no view
  of what is declared vs what is on disk.

So this ADR is **IDE + devkit surface over an existing platform
pipeline** — no engine/client seam; the devkit compose surface grows one
check (D2's missing-file detection — nothing detects it today: the
analyzer checks names only, filesystem-free, and the build copies
`assets/` wholesale).

## Decision

### D1 — The Assets group is an asset manager, not a folder listing

ADR-280's Assets artifact group shows each asset with type-appropriate
presentation: image thumbnails, audio entries with inline play. Import
(menu or drag-in) copies the file into `assets/` — the project stays a
plain portable folder (ADR-280 D2 discipline).

### D2 — The view reconciles disk against declarations

The asset manager shows both directions of drift:

- a file in `assets/` with no `define` → undeclared (present, unusable
  from Chord);
- a `define … from "<file>"` whose file is missing → broken declaration.

Both states are visible in the Assets group and surfaced through the
existing Problems machinery, so the writer's mental model is "the app
knows my assets," not "two lists I diff by hand." **The missing-file
check runs in devkit's compose path** (post-compile, over the IR's
declared assets), emitting into the same diagnostics stream Problems
already consumes — chord's analyzer stays filesystem-free. Where the
inserted `define` line lands in the `.story` (D3) is settled at
implementation with the same one-home discipline.

### D3 — Import can declare

Importing an asset offers to write the `define` line (kind inferred from
file type, name from filename, author-editable before insert). The writer
lands one keystroke from `play sound <name>` working. Declaration
insertion is a convenience over the Chord source — the source stays the
single truth; the manager never maintains a parallel manifest.

## Acceptance

1. Dropping a PNG and an MP3 into the Assets group copies them into
   `assets/`, shows thumbnail/playable entries, and (accepted prompt)
   inserts correct `define image` / `define sound` lines that compile.
2. Deleting an asset file behind a `define` puts the broken declaration
   in Problems; an undeclared file shows as undeclared in the view.
3. A story publishing (ADR-284) with managed assets plays its sound and
   shows its image in the published artifact — pipeline exercised
   end-to-end from import to publish.

## Consequences

- The IDE gains file-type presentation (thumbnailing, audio preview) —
  AppKit-native capabilities, no new dependencies expected.
- Kind inference (Q-1) couples the import flow to the platform's
  supported formats; the mapping must live in one place the IDE reads,
  not be duplicated in Swift.

## Deferred questions (non-blocking, ruled at implementation)

### Q-1: Which formats, and who says so?
- **Why it matters**: the browser client plays what browsers play; the
  import flow should accept exactly that set and reject the rest with a
  clear message. Needs a single source of truth for supported
  image/audio formats (platform-declared, IDE-consumed).
- **Blocks**: D3's kind inference; import validation.

### Q-2: Drag-into-editor?
- **Why it matters**: dragging an asset from the manager into the Chord
  editor could insert the play/show sugar at the cursor — high-delight,
  but needs a ruling on what it inserts where.
- **Blocks**: nothing — additive on D1–D3.

## Session

Drafted 2026-07-27, session fda0f0, after verifying the ADR-216 pipeline
end-to-end (`docs/context/session-20260727-2100-main.md`).
