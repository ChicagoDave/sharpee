# ADR-232: Chord-First Web Presence — one site, author-facing front door

## Status: DRAFT (2 open questions — Q-2 resolved 2026-07-19; Q-1 partially ruled)

## Date: 2026-07-17

## Context

The website (`site/`, one GitHub Pages deploy, one custom domain via
CNAME) is titled "Sharpee — Interactive Fiction Authoring" and is
TypeScript-first throughout: the book (three formats), the nine-part
Family Zoo TS tutorial, `getting-started.html` (devkit/TS), the stdlib
reference and phrasebook, with Chord present as two pages (`chord.html`,
`chord-reference.html`) inside that world.

That pairing now misleads the primary audience. Chord is the
author-facing product (ADR-210: interpreter-primary; the 100%
Sharpee==Chord parity goal makes it a *complete* authoring surface),
and the amended ADR-191 playground puts a Chord-default "Play It Now"
on this same site. An author who wants to write games in Chord must
today navigate a front door that speaks TypeScript; David (2026-07-17):
keeping the two interests paired "will likely confuse authors that want
to focus on Chord."

A hard split (second Pages deploy + domain for Chord) was considered
and rejected for now: it doubles chrome/deploy/maintenance and forces
immediate content-ownership rulings for surfaces both audiences need
(phrasebook, stdlib reference). A neutral two-track front door was
rejected as keeping the confusing pairing, merely labeled.

## Decision

**One site, restructured Chord-first (ruled by David, 2026-07-17).**

- The landing page and primary navigation address the *author*: Chord —
  the language page, the Chord reference, the stdlib phrasebook, the
  playground (ADR-191, Chord-default tab), and Chord tutorials as they
  exist.
- Sharpee platform content — the book, the Family Zoo TS tutorial,
  getting-started/devkit, stdlib reference (TS API framing), API docs —
  moves under an explicitly labeled **Platform** section of the same
  site: present, linked, never the front door.
- One repo, one Pages deploy, one domain; `pages.yml` unchanged in
  mechanism. The Chord-first IA is a content/nav restructure, not an
  infra change.
- The door stays open for a future dedicated Chord domain: nothing in
  this restructure may hard-code cross-section URLs in a way that would
  make a later split (ADR-worthy then) harder.

## Consequences

- Every future doc/tutorial/playground lands Chord-side by default;
  platform-facing material goes to the Platform section deliberately.
- The site re-render pipeline (chord-language/stdlib-reference/
  phrasebook page generation) needs nav/IA updates; the ADR-231 plan's
  Phase 11 doc pass should not fight this — sequence the restructure
  after Phase 11's truth refresh or fold the nav change into it.
- The book remains the platform-side deep-dive; its landing links
  reposition under Platform.
- SEO/permalinks: existing page URLs should keep working (redirect stubs
  or stable filenames) — incoming links from the book and posts predate
  the restructure.

## Session

Session 1befbd (2026-07-17, chord-foundations). Raised by David during
the ADR-231 implementation run, same session as the ADR-191 dual-mode
playground amendment; shape ruled from three options.

## Owner plan recorded (2026-07-18, session 1e7652 — David's stated direction for the rebuild; the Open Questions below are interviewed within this frame)

- **Tear down GitHub Pages.** The current static `site/` deployment is
  going away, not being reshuffled — no incremental IA work on it.
- **Rebuild in React or similar, deployed on David's Linux server.**
  Astro is ruled out from experience ("I pretty much hate it" — the
  repo's abandoned `website/` tree). Whether any CMS layer sits behind
  the app is undecided and secondary.
- **One common NAV control; distinct Chord and Sharpee sections**, each
  with getting-started and a tutorial upfront (Chord track: getting
  started → the Fernhill tutorial → chord reference/phrasebook;
  Sharpee/platform track: getting started → the TS tutorials →
  stdlib/API reference). The existing content maps onto both tracks
  with no new authoring beyond the two getting-started pages.
- Platform note for the rebuild: everything Sharpee ships to the web is
  a static artifact or bundled client-side app (playable
  `build --browser` pages, the ADR-191 playground — the Chord compiler
  runs client-side), so the app can mount them as pages/islands; the
  server also opens the door to zifmia multi-user play later.
- **The playground needs a bundler, not a framework**: it is a
  client-side app (editor + in-browser compiler + client) that any site
  shell, custom CMS included, can mount as a page/island. The site
  system's real job is weaving it through the content (try-it buttons
  on tutorial code blocks, pre-loaded reference examples).
- The Fernhill tutorial (8 chapters, `docs/tutorials/fernhill/`) is
  written as site-agnostic markdown, deliberately parked for this redo
  (tutorial plan Phase 9, David's hold ruling).

## Amendment — decisions executed in practice (2026-07-19, sessions b381db + c331a9; signed off by David 2026-07-19, session c331a9)

This amendment records what has since been *done* under the Owner plan's
frame. It resolves none of the Open Questions below (Q-1..Q-3 remain
open); the ADR stays DRAFT.

- **Framework ruled and scaffolded: Next.js 16 App Router** (David,
  2026-07-19; options weighed: React Router 7, Vite SPA, Docusaurus;
  Astro excluded by standing ruling). This supersedes the Owner plan's
  "React or similar" placeholder. `website/` is npm-managed and outside
  the pnpm workspace (lockstep isolation); `website/AGENTS.md` requires
  consulting the bundled Next docs (`node_modules/next/dist/docs/`)
  before using any convention.
- **GitHub Pages teardown executed** (commit 8693f54e): the old
  `website/`, `site/`, and `web-save/` trees are archived to
  `docs/_archive/`; the CNAME leaving `site/` is the intended teardown.
  The Consequences section's Pages/`pages.yml`/SEO-permalink text
  describes the superseded static site — deployment target is now
  David's Linux server (mechanics deferred, his infrastructure).
- **Shell ruled and shipped: WF-B (left rail)** from four wireframe
  candidates: top bar + hierarchical rail + mobile drawer
  (`site-shell.tsx`), one nav model (`nav.ts` — rail, breadcrumbs, and
  the within-section prev/next pager all derive from it; this realizes
  the Owner plan's "one common NAV control"), and a `DocPage` content
  frame. **No on-page TOC** (David, 2026-07-19) — headings carry page
  structure.
- **Generated-palette pipeline shipped**: `docs/design/
  generate-sharpee-design.mjs` computes ramps + light/dark role systems
  from David's Coolors seeds and emits `sharpee-palette.css`, copied to
  `website/src/app/palette.css`. Colors are never hand-edited
  downstream; the generator is the single source of truth.
- **Version strings on the site are plain `X.Y.Z`** — no `-beta` suffix
  (David, 2026-07-19; the npm `beta` dist-tag is a separate concern).
- **Content pipeline pinned (2026-07-19, session c331a9): `@next/mdx`
  with imported `.mdx` content files.** Routes stay `.tsx` files that
  wrap a colocated `.mdx` in `DocPage` (imports, not MDX file-routing —
  no `pageExtensions` change), so the nav model and breadcrumbs stay
  authoritative. A global element map (`src/mdx-components.tsx`) styles
  markdown through shared primitives (`src/components/prose.tsx`:
  `CodeBlock`, `Callout`, headings/links/lists/tables, nav-derived
  pager). `/style-guide` (unlisted) exercises the whole pipeline and is
  the authoring reference. Rationale: the Fernhill chapters and most
  upcoming content already exist as markdown; hand-converting prose to
  JSX per page invites drift, while this Next version documents the
  import pattern first-class.

## Open Questions

### Q-1: What is the Chord-first landing page's shape?
- **Why it matters**: it is the product's front door — hero copy,
  what the first click is (playground? language tour? phrasebook?),
  and how prominently the Platform section appears.
- **Blocks**: implementing the restructure; ADR-191 Phase 1 links.
- **Partially ruled (David, 2026-07-19, session c331a9)**: the Home
  landing page describes BOTH products — Sharpee (TypeScript) and
  Chord (an IF Modeling Language). Still open within Q-1: the first
  click and the relative prominence/ordering of the two descriptions.

### Q-2: Where does the stdlib reference live? — RESOLVED
- **Why it mattered**: it documents the action surface both audiences
  use, but its examples are currently mixed TS/Chord; it could stay
  shared, split into per-audience renderings, or go Chord-side with a
  TS appendix.
- **RESOLVED (David, 2026-07-19, session c331a9)**: **Chord-side.** It
  is the *Chord Standard Library reference*, framed through the Chord
  surface (verbs, trait adjectives, message-key overrides) exactly as
  the paused `docs/work/stdlib-reference/plan.md` already framed it —
  that plan's framing stands, retargeted from the archived `site/` to
  the Next.js site. The TypeScript API view remains the genai-api
  reference shipped in the npm package.

### Q-3: When does the restructure execute?
- **Why it matters**: ADR-231 Phase 11 re-renders several site pages;
  doing the IA restructure before it means Phase 11 renders into the
  new structure, after it means a second touch of the same pages.
- **Blocks**: sequencing against the current plan.
