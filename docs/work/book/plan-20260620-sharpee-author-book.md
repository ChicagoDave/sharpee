# Plan: The Sharpee Book

**Date:** 2026-06-20
**Status:** IN PROGRESS — Phase 1 COMPLETE (2026-06-20); Phase 2 spine migration COMPLETE (2026-06-20); Phase 3 (Under-the-Hood layer) is next
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
what to write, the programmer sees the classes and methods behind it. This is a deliberate tradeoff:
systems like Inform 7 keep a welcoming natural-language authoring surface separate from a lower-level
implementation layer (Inform 6), which often means separate docs for the two audiences. Sharpee gives
up that gentle on-ramp — you write code from line one — in exchange for a single language across both
layers, so one book can carry both perspectives without a hand-off.

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

### Volume I — Getting Started
1. Installing Sharpee & the `./sharpee` CLI **[have: getting-started, build-system]**
2. Your first room (zoo v01) **[have: v01]**
3. The play loop & how a turn works **[have/new: core-concepts]**

### Volume II — Building a World
4. Rooms & navigation (v02) **[have]**
5. Scenery & portable objects (v03–v04) **[have]**
6. Containers & supporters (v05) **[have]**
7. Openable things, locked doors & keys (v06–v07) **[have]**
8. Light & dark (v08) **[have]**
9. The map & regions **[have: regions guide]**

### Volume III — Making It Interactive
10. The standard actions & the four-phase model (validate/execute/report/blocked) **[have: core-concepts; new framing]**
11. Scope & visibility **[new: core-concepts + parser]**
12. Readable objects & switchable devices (v09–v10) **[have]**

### Volume IV — Custom Behavior
13. Event handlers (v12) **[have]**
14. Custom actions (v13) **[have]**
15. Capability dispatch (v14) **[have]**
16. Custom traits & behaviors **[have: world-model patterns; new framing]**

### Volume V — Words
17. Extending the grammar **[have: parser-en-us guide; new]**
18. The language layer — messages & message IDs **[have: lang-en-us, event-handlers; new framing]**
19. The formatter chain **[new]**

### Volume VI — Living Worlds
20. Non-player characters (v11) **[have]**
21. Scenes **[have: scenes guide]**
22. Turns, timed events & daemons (v15) **[have]**
23. Scoring & endgame (v16) **[have]**

### Volume VII — Presentation **(largest gap)**
24. Channels — the universal UI surface **[new]**
25. The web client & framework-free UI **[new]**
26. Decoration, theming & the status line **[new: + system-css-theme work]**
27. Media & audio **[have: audio-enablement guide]**

### Volume VIII — Shipping **(gap)**
28. Putting it all together — the multi-file story (v17) **[have: zoo-17 HTML only]**
29. Transcript testing & walkthroughs **[have: transcript-testing guide]**
30. Saving & restoring **[new: + save-restore work]**
31. Building & publishing — single-player browser **[have: build-system, npm-publish]**
32. Multi-user with Zifmia **[have: zifmia docs]**

### Appendices ✅ COMPLETE (2026-06-21)
- A — Architecture map (the layer model from CLAUDE.md) — **done**, hand-written.
- B — Action catalog — **done**, exhaustive (67 actions + player phrasing), extracted from
  `IFActions` + the language provider's patterns.
- C — Trait catalog — **done**, exhaustive (40 traits + descriptions), extracted from `TraitType`.
- D — Message-ID reference — **done**, exhaustive (808 messages in 82 groups, ID + default text),
  extracted from a live `LanguageProvider`.
- **Method:** B/C/D generated by a throwaway extraction script run against the built platform
  (introspected `LanguageProvider.messages`, `IFActions`, `TraitType`) → static markdown tables.
  Script not kept (David chose static exhaustive tables, not a reusable generator). **Drift note:**
  these will go stale as the platform adds actions/traits/messages; regenerate by re-introspecting
  the platform when refreshing.

**Open question:** do Volumes VII–VIII get new zoo versions (v18+) to demonstrate presentation &
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

### Phase 2 — Migrate the existing spine (Volumes I–VI) — IN PROGRESS
- Decisions (David, 2026-06-20): **outline regrouping** (merge v03+v04, v06+v07, v09+v10); new
  chapters get **brief stubs now**. Migration base: the rich per-version `.md`; fold in `tutorial.md`
  "Common mistake" callouts; reconcile every code block against `familyzoo/src/v*.ts`.
- **Batch 1 done (2026-06-20):** full 23-chapter Volume I–VI skeleton scaffolded (6 volume dividers,
  unnumbered; 10 new-chapter stubs; placeholders for pending migrations). `book.yaml` carries the full
  ordering. **Exemplar migrated chapter: ch4 Rooms & Navigation (v02)** — code reconciled against
  `v02.ts`, renders clean in all three formats. v01 chapter (ch2) carries the seed Under-the-Hood
  boxes; remaining chapters get their UtH layer in Phase 3.
- **Volume divider pages (2026-06-20 → 2026-06-21):** each volume divider is a `::: part-page` div
  (the `part-` CSS names are kept as internal hooks). **Terminology:** book divisions are **Volumes**
  (I–VIII), not Parts — reader-facing label only; the `part-N/` folders and `.part-page`/`.part` classes
  are unchanged. **Decoration deferred (2026-06-21):** the Sharpee **sword artwork** that sat above each
  heading was pulled; all decoration (sword, chapter ornaments, title art) is parked for one holistic
  end-of-book pass. **Epigraphs:** every divider now carries a **public-domain poem** — I Kipling
  "If—", II Dickinson "I dwell in Possibility –", III Markham "Outwitted", IV Henley "Invictus",
  V Carroll "Jabberwocky" (excerpt), VI Shakespeare "All the world's a stage" (excerpt). Only PD works
  used (an in-copyright Hirshfield poem was caught and rejected). Volumes VII–VIII still need epigraphs.
  - **Layout:** poem dividers carry a `.has-poem` class — top-aligned (not `100vh` flex-centered) so a
    long poem can never silently clip its overflow, and sized to fit one page. PDF page margins tightened
    to `0.5in 0.6in`; chapter/section headings reduced (h1 1.5 / h2 1.2 / h3 1.05rem).
  - **Build gotcha (still applies):** weasyprint can't decode pandoc's base64 data-URI images, so the
    PDF build is two-step (pandoc HTML at book root → weasyprint resolves `assets/` on disk).
- **Batch 2 done (2026-06-20):** **Volume II fully migrated** — ch5 Scenery & Portable Objects
  (v03+v04), ch6 Containers & Supporters (v05), ch7 Openable, Locked Doors & Keys (v06+v07),
  ch8 Light & Dark (v08). All code reconciled against `v0{3..8}.ts`; "Common mistake" callouts from
  `tutorial.md` folded in as blockquote asides; renders clean in HTML/EPUB/PDF. ch9 (The map &
  regions) remains a new-framing stub (no version migration).
- **Batch 3 done (2026-06-20):** final 6 migration chapters migrated — ch12 Readable Objects &
  Switchable Devices (v09+v10), ch13 Event Handlers (v12), ch14 Custom Actions (v13), ch15 Capability
  Dispatch (v14), ch20 Non-Player Characters (v11), ch22 Turns, Timed Events & Daemons (v15), ch23
  Scoring & Endgame (v16). All code reconciled against `v0{9..16}.ts`; "Common mistake" callouts from
  `tutorial.md` folded in as blockquote asides; volume dividers (Volumes IV/VI) and ornaments preserved.
  Renders clean in HTML/EPUB/PDF; no "pending migration" stubs remain in `parts/`.
  - **Drift corrected against source (4 places):** chain handlers use a custom event type
    (`zoo.event.goats_react`), NOT `game.message` (which the processor consumes as an override) — the
    per-version docs showed the wrong pattern; v14 uses ONE unified `pettingBehavior` dispatching on
    `animalKind` (registry allows one behavior per trait+capability) and a hand-written dispatch action,
    not separate per-animal behaviors with `condition` nor `createCapabilityDispatchAction()` (mentioned
    as the stdlib shortcut). Scheduler daemon/fuse events DO use `game.message` + `narrate: true` (the
    correct form for scheduler output) — chapter notes the context difference.
- For each of the 17 steps, pick the richest of the three existing copies as the base; reconcile every
  code sample against the actual `v*.ts` ground truth; normalize into canonical chapters.
- **Acceptance:** ✅ every Volume I–VI chapter present (ch9, ch10, ch11, ch16, ch17, ch18, ch19, ch21 are
  new-framing stubs with no version migration); migrated code blocks match their `familyzoo/src`
  version; book renders clean in all three formats.

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

### Phase 5 — Volume VII Presentation **[new writing]** ✅ COMPLETE (2026-06-21)
- Channels, web client, decoration/theming/status, media/audio. Fold in `audio-enablement`.
- Resolve the v18+ vs teach-against-v17 question.
- **Acceptance:** four chapters drafted; code samples compile against current platform.
- **Done (2026-06-21, session 70b555):** all four Volume VII chapters written in full —
  ch24 Channels (prior session), ch25 The Web Client & Framework-Free UI, ch26 Decoration,
  Theming & the Status Line, ch27 Media & Audio. Grounded in verified `@sharpee/platform-browser`
  (`BrowserClient`, `registerDefaultBrowserRenderers`), `@sharpee/channel-service`
  (`Renderer`/`ChannelRenderer`, manifest+packet flow), and `@sharpee/media`
  (`AudioRegistry`, audio events) APIs from `genai-api/presentation.md`, plus ADR-170
  (component theming), ADR-174 (decoration `[name:content]` → `sharpee-` spans), ADR-169
  (Web Audio fades). Book renders clean to HTML/EPUB/PDF.

### Phase 6 — Volume VIII Shipping **[new writing]** ✅ COMPLETE (2026-06-21)
- v17 multi-file chapter, transcript testing, save/restore, build & publish, multi-user Zifmia.
- **Acceptance:** five chapters drafted; build/test commands verified against the real `./sharpee`.
- **Done (2026-06-21, session 70b555):** all five Volume VIII chapters written in full —
  ch28 The Multi-File Story (v17 organization + after-hours act), ch29 Transcript Testing &
  Walkthroughs, ch30 Saving & Restoring, ch31 Building & Publishing (single-player browser),
  ch32 Multi-User with Zifmia. Volume VIII divider on ch28 carries a public-domain Tennyson
  "Ulysses" (1842) epigraph. Grounded in `tutorials/familyzoo/src/v17/`, the transcript-testing
  / build-system / npm-publish guides, the BrowserClient save path, and ADR-175 (Zifmia v1 =
  room-scoped "watching IF together", shared single PC, NOT MPIF). Book renders clean to HTML/EPUB/PDF.

### Phase 6b — v18 "Family Zoo: Sights & Sounds" ✅ COMPLETE (2026-06-21) — see plan-20260621-familyzoo-v18.md
- **Decision (David, 2026-06-21):** Volume VIII teaches against v17 (no new version needed for
  shipping mechanics). Volume VII (Presentation) IS the gap — v17 has zero presentation features,
  so ch24/26/27 currently teach against platform defaults + snippets, never the running zoo. Build
  a **v18** that adds *only* presentation concerns and retrofit Volume VII to teach against it.
- **Scope:** `tutorials/familyzoo/src/v18/` built on v17, adding: a custom `zoo.ambience` mood-line
  `IOChannel` + story renderer (ch24/25); an `AudioRegistry` (aviary/nocturnal atmospheres, feed &
  shutter SFX, an after-hours music swap keyed to `zoo.after_hours`) (ch27); `image:background` per
  area + one story-shipped theme `zoo-sunny` (ch26/27). Placeholder asset paths — teach the wiring,
  note authors supply their own audio/image files.
- **Then:** weave concrete "in v18…" examples back into the already-written ch24, ch26, ch27.
- **Acceptance:** v18 compiles & plays; Volume VII chapters reference v18 concretely; book renders clean.

### Phase 7 — Site integration & duplication retirement **[SCOPED 2026-06-21]**

**Investigation findings (2026-06-21, session 70b555):**
- **Two sites exist.** `./site/` is the live GitHub Pages site (CNAME `sharpee.net`) — hand-authored
  static HTML incl. `zoo-01..17.html` + `family-zoo.html`. `./website/` is a newer Astro site
  ("website2", not live) with structured `docs/tutorials/` (`family-zoo.mdx`, `cloak-of-darkness.mdx`),
  fed by `copy-to-website.sh` (dungeo browser build + .sharpee download).
- **The duplication ("triple copy") of the zoo tutorial:** (1) `tutorials/familyzoo/docs/v01..v16.md`
  + `tutorial.md` (per-version markdown); (2) `site/zoo-*.html` + `site/family-zoo.html` (hand HTML);
  (3) the book (`docs/book/`) — now the canonical source that supersedes both.

**David's direction (2026-06-21):** Do NOT touch the live `/site` yet, and don't delete any
duplication sources. First just build the book out as a web target under `docs/book/web/` and park
it until we decide what to do with it (integrate into `/site` vs `/website` vs standalone).

**Done (2026-06-21):** added a `web` target to `scripts/build-book.sh` (`build-book.sh web`) →
multi-page chunked-HTML site (50 pages, sidebar nav, one page per chapter/volume/appendix) at
`docs/book/web/`, generated from the same canonical source. Output gitignored (mirrors `build/`);
view with `open docs/book/web/index.html` or a static server.

**Deferred (needs David's decision later):**
- Where the book-web lives long-term (serve from `/site`, fold into the Astro `/website`, or standalone).
- Retiring the triple-copy sources (per-version `.md`, `tutorial.md`, `site/zoo-*.html`) — **deletion
  gated on explicit confirmation**; flagged, not auto-deleted.
- Reconciling the two sites (`/site` legacy vs `/website` Astro) — out of book scope; David's call.

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
3. **Volumes VII–VIII coverage** — new zoo versions (v18+) vs teach-against-v17. Lean: v17. → Phase 5.

## Definition of Done

One canonical `docs/book/` source renders to EPUB + PDF + HTML; covers Volumes I–VIII + appendices;
carries both perspectives over the zoo spine; every Under-the-Hood section is anchored to (and
verified against) the compiled `@sharpee/*` library API; all code samples compile against the Family
Zoo build; the
site is generated from the same source; the old triple-copy is retired with sign-off; ADRs and
extension/PR material are left to the separate future book.
