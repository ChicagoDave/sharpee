# Work Summary — The Sharpee Book: Volumes VII–VIII, appendices, web build, polish

**Date:** 2026-06-21
**Branch:** main
**Target:** `docs/book/` (The Sharpee Author and Developer Manual)
**Source:** reconstructed from `docs/context/raw-context-20260621.txt` (full session transcript)
**Plan:** `docs/work/book/plan-20260620-sharpee-author-book.md`

## Goal

Finish the remaining book content (Volume VII Presentation, Volume VIII Shipping), add
reference appendices, and produce a browsable web build — then polish per a reviewer pass.
One continuous session spanning content authoring, a platform-API verification arc, a
settled architecture question, and a web-navigation build-out.

## What was done (chronological)

### 1. Volume VII — Presentation (ch25–27)
Wrote the three remaining Presentation chapters, grounded against verified APIs:
- **ch25 — The Web Client & Framework-Free UI**: `BrowserClient` lifecycle
  (`initialize`/`connectEngine`/`start`), the manifest+packet rendering path, commands
  flowing back via `engine.executeTurn`, why no framework (native `<dialog>`, `.sharpee-*`
  classes, `--modifier` state), renderer override via `getChannelRenderer().registerRenderer`,
  built-in save/restore/autosave/theming.
- **ch26 — Decoration, Theming & the Status Line**: `[name:content]` → `sharpee-`-prefixed
  spans, the namespace rule, component-vocabulary theming + `data-theme` flip, the status line
  as `location`/`score`/`turn` channels.
- **ch27 — Media & Audio**: media as capability-gated channels, the audio event vocabulary,
  Web Audio fades + first-keystroke unlock, the `AudioRegistry`.
- Committed `ac06e57d`. Book renders clean to HTML/EPUB/PDF.

### 2. Volume VIII — Shipping (ch28–32)
Wrote all five Shipping chapters against the v17 Family Zoo tutorial:
- **ch28 — The Multi-File Story** (carries the Volume VIII divider, Tennyson "Ulysses" epigraph)
- **ch29 — Transcript Testing & Walkthroughs** (unit vs walkthrough `--chain`, assertions, GOAL/IF/WHILE/NAVIGATE TO)
- **ch30 — Saving & Restoring** (`ISaveData`/`worldSnapshot`; the one author task is transient
  out-of-world state via `getRunnerState`/`restoreRunnerState`; browser envelope + autosave; versioned)
- **ch31 — Building & Publishing** (`sharpee build` → `.sharpee`; `init-browser` → static `dist/web/`)
- **ch32 — Multi-User with Zifmia** (multi-user vs multi-player/MPIF; per-user Renderer over
  WebSocket; rooms/join codes/turn lease; stateless server; room-owned saves; single Docker image).
  Grounded in ADR-175.
- Committed `d92b6527`. Decision recorded in plan: build v18 as a separate unit *after* VIII,
  teach VIII against v17.

### 3. Family Zoo v18 — presentation demo + Volume VII retrofit
Per David's "if we need a v18, propose it" → verify-first decision:
- Built `tutorials/familyzoo/src/v18/` (copy of v17 + `presentation.ts`): custom `zoo.ambience`
  channel, `AudioRegistry` atmospheres, room-entry media handler, feed/shutter SFX, after-hours
  music; `zoo-sunny` theme; `@sharpee/media` dep. Committed `69142679`.
- **Verify-first finding:** the canonical wired media path is **`media.*` events**
  (`media.sound.play`/`media.music.play`/`media.ambient.play`/`media.image.show`), **not** the
  `audio.*` / `AudioRegistry.cue()` vocabulary ch27 originally taught. `image:background` is driven
  by `media.image.show {layer:'background'}`. Story theme CSS = `browser/<id>.css` (author override,
  loaded last). Rewrote ch27 to match; retrofitted ch24 and ch26.
- Validated: tsc clean; `--browser` build clean; headless 5-turn run emits the channels with no exceptions.
- **Two platform issues filed:** #146 (CLI `--story` + `@sharpee/helpers` module boundary),
  #147 (in-repo `--browser` doesn't copy `browser/<id>.css`).

### 4. Appendices A–E
- **A — Architecture Map**: hand-written layer-model reference.
- **B/C/D — exhaustive, generated** (David's choice): B = 67 actions + phrasing; C = 40 traits;
  D = 808 message IDs in 82 groups. Extracted by a throwaway script introspecting the built
  platform (`IFActions`, `TraitType`, live `LanguageProvider.messages`) → static markdown. Script not kept.
- **E — Grammar Reference** (added this session): exhaustive 118 core grammar rules
  (pattern → action, priority, trait constraint) + a pattern-syntax/priority primer. Extracted by
  feeding a **recording-mock `GrammarBuilder`** to `parser-en-us`'s `defineGrammar` (no fragile
  source parsing). Committed `ba00311b`.
- **Drift note:** B/C/D/E are static snapshots — regenerate by re-introspecting the platform when refreshing.

### 5. Umbrella / import-path question — SETTLED and banked
David: "I'd like to avoid this conversation going forward; I believe we decided not to re-export
everything in the umbrella." Investigation confirmed the rationale:
- ADR-081 originally wanted `@sharpee/sharpee` to "re-export everything."
- **ADR-178 (Story Runtime Baseline) superseded that:** the ~17 named sub-packages are the import
  contract, validated against `@sharpee/story-runtime-baseline`; the umbrella is *not* in that list.
  Completing the umbrella would re-introduce exactly the drift ADR-178 eliminates.
- ADR-180 nailed the umbrella's role: authoring-time SDK (one install, pulls the closure, ships
  genai-api docs) — **not** the import surface.
- **Resolution:** authors import from named baseline sub-packages (book already teaches this). Don't
  complete the umbrella. The only loose end is the `sharpee init` template's headline-type import
  (a devkit-template cleanup, separate from the book).
- Banked to memory `project_umbrella_no_reexport.md` so it won't be re-raised.

### 6. Phase 7 scoped — book web build (parked, nothing live touched)
- Found **two sites**: live `./site/` (GitHub Pages, `sharpee.net`, hand-authored, has `zoo-*.html`)
  and a newer Astro `./website/` (not live). The zoo tutorial is triple-copied: per-version
  `tutorials/familyzoo/docs/v*.md` + `tutorial.md`, `site/zoo-*.html`, and the book (now canonical).
- **David's direction:** leave `/site` and `/website` alone, delete nothing; just build the book out
  under `docs/book/web/` and park it.
- Added a **`web` target** to `scripts/build-book.sh` → pandoc `chunkedhtml` multi-page site
  (~50 pages, one per chapter/volume/appendix). Output gitignored (`docs/book/web/`); only the script
  + `.gitignore` line are tracked.

### 7. Web navigation — iterative fixes (driven by David's testing)
- **Unstyled cover/index:** chunkedhtml links `styles/book.css` relatively but neither embeds nor
  copies it; `--embed-resources` doesn't inline CSS here. Fix: copy `book.css` into `web/styles/`
  (and `art/*.jpg` into `web/art/` for the cover). Committed `87e1c610`.
- **No real navigation off the index:** wrote `scripts/book-web-nav.cjs` — a post-processor driven by
  pandoc's `sitemap.json` that injects a persistent left sidebar (collapsible volumes → chapters via
  native `<details>`, no JS) + a bottom Prev/Next bar into every page. Committed `1c027c0b`.
- **"Chapter links don't work":** volume `<summary>` was wrapped in an `<a>`, so a collapsed volume
  navigated away instead of expanding — chapters unreachable from the index. Made `<summary>` a plain
  toggle. Committed `f05bd0bc`.
- **"Body stays on the title page":** `--include-before-body` injected the title/copyright page into
  *every* chunk. Strip those blocks from all pages except `index.html`. Committed `08a7d550`.
- **"We lose the volume title page with the blurb":** re-added each volume divider (title + epigraph)
  as a distinct italic **"Overview"** sidebar item under its volume. Committed `9e975acc`.

### 8. gpt-review pass → reader self-selection
- David added `docs/book/gpt-review/review-1.md` (a "naive reader" review). Main critique: the book
  undersells how programmer-oriented Sharpee is and doesn't help readers self-select.
- Added a **"What kind of reader are you?"** routing table to `How to Read This Book` (four reader
  types → starting point) + an up-front line that Sharpee is TypeScript-from-Chapter-1. Committed `2c38867f`.
- Did **not** rename TOC chapters (review point #3) — accurate as-is, riskier, better discussed.

### 9. Introduction scaffold (uncommitted at session end)
- Created `docs/book/frontmatter/01-introduction.md` (scaffold + suggested beats for David to write
  in his voice), renamed `01-how-to-read.md` → `02-how-to-read.md`, wired `book.yaml`.
- Reading order now: Preface → Introduction → How to Read This Book → Volume I.

## Key decisions
- **Umbrella import-path: closed permanently** — named baseline sub-packages are the contract
  (ADR-178); don't complete the umbrella; banked to memory.
- **Book web build is parked**, not integrated — `/site` and `/website` untouched, no duplication
  sources deleted (gated on David's explicit confirmation).
- **Reference appendices are static snapshots**, not a kept generator (David's choice).
- **v18 teaches Volume VII presentation**; v17 still teaches Volume VIII.

## Files / artifacts
- New chapters: `parts/part-7/25..27`, `parts/part-8/28..32`.
- Appendices: `backmatter/appendix-a..e`.
- v18 source: `tutorials/familyzoo/src/v18/` (incl. `presentation.ts`).
- Build tooling: `scripts/build-book.sh` (`web` target), `scripts/book-web-nav.cjs`, `.gitignore`
  (`docs/book/web/`).
- Front matter: `frontmatter/01-introduction.md` (scaffold), `02-how-to-read.md` (routing table),
  `book.yaml` wiring.
- Plan: `plan-20260620-sharpee-author-book.md` (Phase 5/6/6b complete; Phase 7 scoped); v18 sub-plan
  archived to `docs/work/book/archive/`.

## Verification
- Book renders clean to HTML/EPUB/PDF throughout (only pre-existing `user-select`/`overflow-x` CSS warnings).
- Web build: ~50 pages, styled cover/index, working sidebar + Prev/Next, verified by HTTP (all 200s).
- v18: tsc clean, `--browser` clean, headless 5-turn run emits expected channels.

## Open / next
- **Uncommitted at session end:** `frontmatter/01-introduction.md` (scaffold), the
  `01→02-how-to-read.md` rename, the `book.yaml` line, plus `book.yaml`/`gpt-review/`/this raw context.
  David writes the Introduction prose, then commits.
- **Phase 7 deferred decisions (David's calls):** where the book-web lives long-term (`/site` vs
  Astro `/website` vs standalone); retiring the triple-copy tutorial sources (gated on explicit
  confirmation); reconciling the two sites.
- Devkit cleanup: `sharpee init` template should drop the umbrella headline-type import for sub-packages.

## Platform issues filed
- #146 — CLI `--story` + `@sharpee/helpers` module boundary.
- #147 — in-repo `--browser` doesn't copy `browser/<id>.css`.
