# Plan: The Sharpee Book

**Date:** 2026-06-20
**Status:** IN PROGRESS — Phase 1 COMPLETE (2026-06-20); Phase 2 is next
**Work target:** `docs/work/book/`
**Canonical output:** `docs/book/`

## Goal

Produce *The Sharpee Book* — a single, integrated-progressive manual that teaches interactive-fiction
authoring with Sharpee and, in the same breath, shows the public library API (the classes and methods)
behind it. One canonical markdown source generates **web (HTML), EPUB (ebook), and PDF (print)**.

The book carries **two perspectives over one running example** (the **Family Zoo**, which already
exists as a 17-step tutorial with working, tested code):

- **Author's perspective** — *using* Sharpee. The main narrative: build the zoo with the stdlib's
  traits, actions, and messages as a ready-made vocabulary.
- **Programmer's perspective** — the **public API surface** of the compiled `@sharpee/*` npm library:
  the classes, methods, and types an author calls (documented in `packages/sharpee/docs/genai-api/`).
  Signatures only — **never implementation bodies, internal logic, or monorepo `src/`**.

Because both perspectives are the **same TypeScript**, one zoo example carries both — the author sees
what to write, the programmer sees the classes and methods behind it. Inform and TADS can't do this: their two
perspectives are literally different languages, so they ship separate books and authors fall off a
cliff crossing over.

## Non-Goals

- **Extensions and platform pull requests are a separate future book.** Writing custom
  traits/actions/grammar as shippable extensions, and contributing to the platform itself, are out of
  scope here — along with the ADR decision-rationale that audience needs.
- **No ADR references in this book.** ADRs are platform-internal. The programmer layer anchors to the
  compiled npm library's public API, not decision records.
- **Never show internal platform code.** The programmer layer shows only the public **classes, methods,
  and types** (signatures) of the installed `@sharpee/*` packages — never implementation bodies,
  internal logic, or `packages/*/src/*.ts`, which authors don't have.
- Not the archived "Building Complex Software using GenAI" book (`docs/_archived/book/`) — a different
  book about David's process.
- Not a rewrite of the Family Zoo *story code* — `tutorials/familyzoo/src/v01…v17` is the ground truth
  the prose describes. Code changes only if a chapter exposes a genuine defect.
- No CI/GitHub Actions. The render pipeline is a local script.

## Locked Decisions

| Decision | Choice |
| --- | --- |
| Organizing model | Integrated-progressive — one continuous narrative |
| Two perspectives | Author (using Sharpee) + Programmer (the public library API — classes & methods) |
| Programmer layer source | Public API surface of `@sharpee/*` (genai-api) — signatures only, **no implementation bodies**, **no ADR citations**, **no monorepo `src/`** |
| Extensions / platform PRs | Carved out to a separate future book |
| Running example | Family Zoo (the existing 17-step tutorial spine) |
| Source of truth | One canonical markdown set → generates web + EPUB + PDF |
| Duplication | Retire the triple-copy (per-version `.md`, `tutorial.md`, hand-authored site HTML) |
| Process | Full plan first, then implement |

## Structure: how the two perspectives coexist

("Path" is reserved for API/import paths, not reading order — the two reads are **tracks**.)

**One spine, two depths.** The author narrative is the body of every chapter — readable straight
through to ship a story. The programmer's perspective is a consistent, *skippable* deep layer:
**"Under the Hood"** sections/asides that show the `@sharpee/*` library API behind the author's code.

The front matter defines two **reading tracks**:
- **Author's Track** — the narrative body; skip the Under-the-Hood layer.
- **Programmer's Track** — the narrative plus every Under-the-Hood section, read as a guided tour of
  the public library API.

> *Open (recommend #1):* this "one spine, two depths + two tracks" is model #1 plus a touch of #2.
> Alternatives considered: #2 (programmer perspective as its own interleaved numbered chapters), #3
> (two parts under one cover). Confirm before Phase 1.

## Current State (what already exists)

Three parallel, drifting copies of the same lessons:

1. **Per-version markdown** — `tutorials/familyzoo/docs/v01…v16.md`.
2. **Assembled tutorial** — `tutorials/familyzoo/docs/tutorial.md` (459 lines, V1–V16; a book draft
   already).
3. **Site HTML** — `site/zoo-01…17.html` (hand-authored; includes a 17th step with **no** markdown
   source).

Plus working, transcript-tested code for every version: `tutorials/familyzoo/src/v01.ts … v17/`.
Drift already present: markdown says "16 versions"; HTML has 17.

Reusable material to fold in:
- `docs/guides/` — `audio-enablement`, `transcript-testing`, `build-system`, `npm-publish`,
  `creating-stories`, `event-handlers`, `scenes`, `regions`, `entity-queries`,
  `creating-a-language-implementation`, `project-structure`.
- `docs/reference/` — `core-concepts`, `character-model`.
- `packages/sharpee/docs/genai-api/` — auto-generated public-API reference (from the shipped `.d.ts`).
  This is the substance of the programmer layer **and** the source for the appendix catalogs.

## Target Architecture

### Source layout (`docs/book/`)

```
docs/book/
  book.yaml              # Pandoc metadata: title, author, parts, chapter order
  frontmatter/
    00-preface.md
    01-how-to-read.md    # reading tracks, the Under-the-Hood legend, how the zoo grows
  parts/
    part-1/ … part-8/    # chapters as NN-slug.md
  appendices/
    a-architecture-map.md
    b-action-catalog.md  # generated from stdlib + genai-api
    c-trait-catalog.md   # generated from world-model + genai-api
    d-message-ids.md     # generated from lang-en-us
  assets/                # diagrams, shared images
  styles/
    print.css            # PDF/print styling
    epub.css             # ebook styling
  build/                 # gitignored render outputs (epub/pdf/html)
```

### Toolchain

- **Pandoc** renders markdown → EPUB + PDF + HTML.
- PDF engine chosen in Phase 1 (lean: `weasyprint`, CSS-driven, so print and web share styling).
- Render driver: a local script (`scripts/build-book.sh` or a `devkit book` subcommand — decided in
  Phase 1). No CI.

### Under-the-Hood (programmer-layer) convention

Asides are **blockquote-based** so they survive all three renderers, and show the **public API surface**
(classes, methods, types) the author just used — never implementation bodies, no ADR line, no
monorepo `src/`:

```markdown
> **Under the Hood — `ContainerTrait`** (`@sharpee/world-model`)
> ```typescript
> class ContainerTrait { constructor(options?: ContainerOptions); capacity?: number; }
> // ContainerBehavior.addItem(world, container, item): AddItemResult
> ```
> The `putting` action calls `ContainerBehavior.addItem(...)` to place an item in the enclosure.
```

`styles/print.css` and `styles/epub.css` give this blockquote variant a boxed treatment. A legend in
`01-how-to-read.md` explains the marker.

**Drift handling (decide in Phase 3, lean: (a)):** quoted API goes stale as packages change. Options:
(a) **excerpt-and-verify** — the render step checks each quoted signature still matches the shipped
`.d.ts` / genai-api (most robust, fits "single source, no drift"); (b) reference the API symbol and
quote sparingly; (c) periodic manual re-sync. All verify against the **compiled library**, not repo
source.

### Site generation

The canonical markdown generates the site pages — `site/zoo-*.html` (or new `site/book-*.html`) become
**generated artifacts**. Hand-authored zoo HTML is retired (Phase 7, pending confirmation; not
deleted without sign-off).

## Book Outline (Parts → existing assets → gaps)

Legend: **[have]** = content exists to adapt · **[new]** = must be written. Every chapter that
touches platform machinery gets at least one Under-the-Hood section anchored to real source.

### Front matter
- Preface — what Sharpee is, the two perspectives, why integrated-progressive **[new, short]**
- How to read this book — reading tracks, the Under-the-Hood legend, how the zoo grows **[new, short]**

### Part I — Getting Started
1. Installing Sharpee & the `./sharpee` CLI **[have: getting-started, build-system]**
2. Your first room (zoo v01) **[have: v01]**
3. The play loop & how a turn works **[have/new: core-concepts]**

### Part II — Building a World
4. Rooms & navigation (v02) **[have]**
5. Scenery & portable objects (v03–v04) **[have]**
6. Containers & supporters (v05) **[have]**
7. Openable things, locked doors & keys (v06–v07) **[have]**
8. Light & dark (v08) **[have]**
9. The map & regions **[have: regions guide]**

### Part III — Making It Interactive
10. The standard actions & the four-phase model (validate/execute/report/blocked) **[have: core-concepts; new framing]**
11. Scope & visibility **[new: core-concepts + parser]**
12. Readable objects & switchable devices (v09–v10) **[have]**

### Part IV — Custom Behavior
13. Event handlers (v12) **[have]**
14. Custom actions (v13) **[have]**
15. Capability dispatch (v14) **[have]**
16. Custom traits & behaviors **[have: world-model patterns; new framing]**

### Part V — Words
17. Extending the grammar **[have: parser-en-us guide; new]**
18. The language layer — messages & message IDs **[have: lang-en-us, event-handlers; new framing]**
19. The formatter chain **[new]**

### Part VI — Living Worlds
20. Non-player characters (v11) **[have]**
21. Scenes **[have: scenes guide]**
22. Turns, timed events & daemons (v15) **[have]**
23. Scoring & endgame (v16) **[have]**

### Part VII — Presentation **(largest gap)**
24. Channels — the universal UI surface **[new]**
25. The web client & framework-free UI **[new]**
26. Decoration, theming & the status line **[new: + system-css-theme work]**
27. Media & audio **[have: audio-enablement guide]**

### Part VIII — Shipping **(gap)**
28. Putting it all together — the multi-file story (v17) **[have: zoo-17 HTML only]**
29. Transcript testing & walkthroughs **[have: transcript-testing guide]**
30. Saving & restoring **[new: + save-restore work]**
31. Building & publishing — single-player browser **[have: build-system, npm-publish]**
32. Multi-user with Zifmia **[have: zifmia docs]**

### Appendices
- A — Architecture map (the layer model from CLAUDE.md) **[have]**
- B — Action catalog **[generated from the `@sharpee/stdlib` public API / genai-api]**
- C — Trait catalog **[generated from the `@sharpee/world-model` public API / genai-api]**
- D — Message-ID reference **[generated from the `@sharpee/lang-en-us` public surface]**

**Open question:** do Parts VII–VIII get new zoo versions (v18+) to demonstrate presentation &
shipping against the running story, or are they taught against v17? Lean: teach against v17; add small
standalone snippets where a full new version isn't warranted. Confirm in Phase 5.

## Phases (session-sized)

Each phase is one deliverable with an acceptance check. No phase ships without its check passing.

### Phase 1 — Pipeline & scaffold ✅ COMPLETE (2026-06-20)
- ✅ Created `docs/book/` skeleton, `book.yaml` (pandoc defaults file with chapter
  order), `styles/` (book.css + print.css + epub.css), `scripts/build-book.sh`,
  `.gitignore` for `build/`.
- ✅ PDF engine: **WeasyPrint** (CSS-driven; print and web share `book.css`).
  Reading-tracks model: **#1** (one spine, two depths — confirmed by David).
- ✅ Rendered stub (preface + how-to-read + migrated v01 chapter) to
  **HTML + EPUB + PDF**, all from `book.yaml`.
- ✅ Under-the-Hood aside is a pandoc fenced div `::: under-the-hood` →
  `<div class="under-the-hood">`, boxed in all three outputs. (Chosen over
  blockquote for reliable CSS targeting; all outputs route through pandoc→HTML.)
- **Acceptance:** ✅ three outputs render from one source; box visually confirmed
  in PDF, present with CSS in HTML and EPUB.
- **Toolchain installed:** `pandoc 3.10`, `weasyprint 69.0` (via brew).

### Phase 2 — Migrate the existing spine (Parts I–VI) — IN PROGRESS
- Decisions (David, 2026-06-20): **outline regrouping** (merge v03+v04, v06+v07, v09+v10); new
  chapters get **brief stubs now**. Migration base: the rich per-version `.md`; fold in `tutorial.md`
  "Common mistake" callouts; reconcile every code block against `familyzoo/src/v*.ts`.
- **Batch 1 done (2026-06-20):** full 23-chapter Part I–VI skeleton scaffolded (6 part dividers,
  unnumbered; 10 new-chapter stubs; placeholders for pending migrations). `book.yaml` carries the full
  ordering. **Exemplar migrated chapter: ch4 Rooms & Navigation (v02)** — code reconciled against
  `v02.ts`, renders clean in all three formats. v01 chapter (ch2) carries the seed Under-the-Hood
  boxes; remaining chapters get their UtH layer in Phase 3.
- **Part title pages (2026-06-20):** each part divider is a `::: part-page` div — Sharpee **sword
  artwork** (reused from `docs/internal/images/sharpee-logo.png` → `docs/book/assets/sharpee-sword.png`)
  centered above the part heading, with a ~100-word lorem-ipsum **blurb placeholder** (David to write
  real blurbs). PDF centers the page vertically (flex + `100vh`).
  - **Build gotcha (fixed):** weasyprint can't decode pandoc's base64 data-URI images, so the PDF build
    is two-step (pandoc HTML at book root → weasyprint resolves `assets/` on disk). Also, the generic
    `.part-page p` blurb rule collapsed the percentage-width sword to zero in weasyprint; excluded the
    image's paragraph via `.part-page p:has(.part-sword)`.
- **Remaining batches:** migrate v03–v04, v05, v06–v07, v08 (Part II); v09–v10 (Part III);
  v12, v13, v14 (Part IV); v11, v15, v16 (Part VI) — 10 chapters.
- For each of the 17 steps, pick the richest of the three existing copies as the base; reconcile every
  code sample against the actual `v*.ts` ground truth; normalize into canonical chapters.
- **Acceptance:** every Part I–VI chapter present; each code block matches its `familyzoo/src`
  version; book renders clean.

### Phase 3 — Under-the-Hood (programmer) layer
- Add API-anchored Under-the-Hood sections through the migrated chapters, citing `@sharpee/*` public
  APIs/types (genai-api) — no monorepo `src/`.
- Decide and implement drift handling ((a) excerpt-and-verify is the lean).
- **Acceptance:** every chapter touching platform machinery has an Under-the-Hood section; quoted API
  matches the shipped library (verified by the chosen mechanism).

### Phase 4 — Front matter & appendices
- Write preface + how-to-read (incl. the two reading tracks). Build appendices A–D (B/C/D generated
  from genai-api/stdlib/world-model/lang).
- **Acceptance:** appendices generated and cross-linked; preface explains the reading tracks and the
  Under-the-Hood legend.

### Phase 5 — Part VII Presentation **[new writing]**
- Channels, web client, decoration/theming/status, media/audio. Fold in `audio-enablement`.
- Resolve the v18+ vs teach-against-v17 question.
- **Acceptance:** four chapters drafted; code samples compile against current platform.

### Phase 6 — Part VIII Shipping **[new writing]**
- v17 multi-file chapter, transcript testing, save/restore, build & publish, multi-user Zifmia.
- **Acceptance:** five chapters drafted; build/test commands verified against the real `./sharpee`.

### Phase 7 — Site integration & duplication retirement
- Generate the site pages from canonical source; wire into the site build.
- Retire the triple-copy sources (per-version `.md`, `tutorial.md`, hand-authored zoo HTML) **pending
  explicit confirmation** — flagged, not auto-deleted.
- **Acceptance:** site renders from generated pages; David confirms before any deletion.

### Phase 8 — Review & proof
- Full read-through; fix cross-links; proof EPUB on a reader and PDF in print layout; compile-check
  all code samples against the familyzoo build.
- **Acceptance:** clean EPUB + PDF + HTML; no broken links; samples compile.

## Open Questions

**Resolved in Phase 1:**
1. ✅ **Reading-tracks model** — **#1** (one spine, two depths). Confirmed by David.
4. ✅ **PDF engine** — **WeasyPrint** (CSS-driven). Confirmed by David.

**Still open (carried to their phases):**
2. **Drift handling** for quoted API — (a) excerpt-and-verify against `.d.ts`/genai-api / (b) ref by
   API symbol / (c) manual re-sync. Lean: (a). → decide in Phase 3.
3. **Parts VII–VIII coverage** — new zoo versions (v18+) vs teach-against-v17. Lean: v17. → Phase 5.

## Definition of Done

One canonical `docs/book/` source renders to EPUB + PDF + HTML; covers Parts I–VIII + appendices;
carries both perspectives over the zoo spine; every Under-the-Hood section is anchored to (and
verified against) the compiled `@sharpee/*` library API; all code samples compile against the Family
Zoo build; the
site is generated from the same source; the old triple-copy is retired with sign-off; ADRs and
extension/PR material are left to the separate future book.
