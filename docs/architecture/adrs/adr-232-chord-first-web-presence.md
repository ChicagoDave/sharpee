# ADR-232: Chord-First Web Presence — one site, author-facing front door

## Status: DRAFT (3 open questions)

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

## Open Questions

### Q-1: What is the Chord-first landing page's shape?
- **Why it matters**: it is the product's front door — hero copy,
  what the first click is (playground? language tour? phrasebook?),
  and how prominently the Platform section appears.
- **Blocks**: implementing the restructure; ADR-191 Phase 1 links.

### Q-2: Where does the stdlib reference live?
- **Why it matters**: it documents the action surface both audiences
  use, but its examples are currently mixed TS/Chord; it could stay
  shared, split into per-audience renderings, or go Chord-side with a
  TS appendix.
- **Blocks**: the Platform-section content inventory.

### Q-3: When does the restructure execute?
- **Why it matters**: ADR-231 Phase 11 re-renders several site pages;
  doing the IA restructure before it means Phase 11 renders into the
  new structure, after it means a second touch of the same pages.
- **Blocks**: sequencing against the current plan.
