# ADR-280: Chord Writer project model — typed artifacts, a default home, devkit-owned scaffolding

## Status: ACCEPTED (2026-07-28, session fda0f0 — David's accept-all after the full-family review; remaining questions deferred as non-blocking)

## Date: 2026-07-27

## Parent: ADR-279 (Chord Writer packaging — the shipped app this model onboards writers into), ADR-258 (Chord authoring environment), ADR-277 (integrated testing — consumes the walkthrough/transcript folders this model names).

## Context — verified, not assumed

- **The sidebar today is a file list.** A new story appears listed but
  unopened (David hit this 2026-07-27 creating `aspect-of-god` — the
  trigger for this ADR family). The view exposes the filesystem, not the
  story project.
- **Scaffolding already lives in devkit**: `sharpee init <name>` creates a
  Chord-first story project from `packages/devkit/templates/story-chord/`
  (`packages/devkit/src/standalone/init.ts`; Chord-first ruled 2026-07-18).
  The IDE currently scaffolds its own new story independently — two owners
  of "what a project is."
- **The test toolchain already binds folder names**: ADR-277's test panel
  and the CLI consume `walkthroughs/wt-*.transcript` and
  `tests/transcripts/*.transcript`.
- **The web client is author-customizable by standing ruling** (platform
  ships UI defaults; authors override per story) — but the override surface
  has no named home in a story project today.
- **David's new story landed in `~/repos/ifstories/`** — a developer's
  choice; writers need a default they never have to think about.

## Decision

### D1 — The sidebar is a typed artifact view, open at the bottom

The project view presents a story project as its **typed artifacts**, not a
directory listing:

- **Story** — the `.story` file (and any Chord includes)
- **Walkthroughs** — `walkthroughs/`
- **Transcript Tests** — `tests/transcripts/`
- **Assets** — `assets/`
- **Web Template** — the story's `<storyId>.templates` layout file
  (ADR-286's template DSL), plus the `browser/` escape hatches (the
  `<storyId>.css` styling override; raw `index.html` under `use html`).
  The group shows these **wherever they sit on disk** — the `.templates`
  file lives beside the `.story` file, the escapes in `browser/`: groups
  are typed lenses, not folder mirrors.

The view is **open, not strict** (David's ruling): files that match no
artifact type still appear (an "Other" group), never hidden and never
deleted. The typed groups are a lens over the real folder, not a cage.

### D2 — The default project home is `~/Documents/Chord`

New Story defaults to `~/Documents/Chord/<story-name>/`. Writers never
confront a path picker unless they ask for one (a standard "choose
location" affordance remains available). The app owns the default; the
folder stays a plain, portable story project — nothing app-private in it.

### D3 — devkit owns scaffolding; the IDE calls it

**One owner of "what a project is": `sharpee init`** (David's ruling). The
devkit scaffold grows to the full artifact set — story, seeded
`walkthroughs/`, seeded `tests/transcripts/`, `assets/`, and the Web
Template — and Chord Writer's New Story invokes `sharpee init` (via the
ADR-279 D4 resolved toolchain) rather than scaffolding in Swift. Seeds are
**seeded, not empty** (David's ruling): each folder demonstrates its
artifact type so the feature teaches itself.

### D4 — New Story opens the story

After scaffolding, the story file opens in the editor — the writer lands
with a cursor, not a listing. (The current listed-but-unopened behavior is
the file-list mindset showing through.)

## Acceptance

1. New Story in a fresh install creates `~/Documents/Chord/<name>/` with
   story, seeded walkthrough, seeded transcript test, assets, and Web
   Template — and the story is open in the editor when the sheet closes.
2. The scaffold is produced by `sharpee init` (a test pins that the IDE
   invokes the CLI, not a parallel Swift scaffold).
3. The seeded walkthrough and transcript test pass under
   `sharpee test` unmodified.
4. A file dropped into the project folder that matches no artifact type
   appears in the view (open-view ruling) — a test pins this.
5. The typed groups map onto the exact folder names ADR-277's test panel
   consumes; the test panel finds the seeded tests with no configuration.
6. Rejections: New Story into a name that collides with an existing
   folder refuses with the path shown — never overwrites; a mid-scaffold
   `sharpee init` failure surfaces its error in the sheet and no
   half-scaffold is left opened as a project.

## Consequences

- The IDE's existing new-story scaffold is retired in favor of the CLI
  call — the IDE gains a hard dependency on a resolved toolchain for
  project creation (acceptable: ADR-279 D4 guarantees one).
- `sharpee init` templates gain seeded test/walkthrough/web-template
  content; template content is authored by David (standing ruling: Claude
  does not invent story content).
- The Web Template seed is the default `standard` template expressed in
  the layout syntax (ADR-286 D1) — the platform default made visible and
  editable, a friendly few-line `.templates` file rather than copied
  HTML.

## Deferred questions (non-blocking, ruled at implementation)

### Q-1: What greets a first launch with no story?
- **Why it matters**: the zero-state (welcome pane with New/Open/recents/
  example vs. plain empty window) is the first thing every writer sees.
  Note: a notarized app's first write into `~/Documents` raises the
  one-time macOS Documents-consent prompt mid-New-Story — the zero-state
  design should make that moment unsurprising.
- **Blocks**: onboarding implementation start; nothing in D1–D4.

### Q-2: What exactly do the seeds contain?
- **Why it matters**: seeded content teaches; David authors it (no
  invented story content). Needs his walkthrough/test/starter-story text.
  Constraint from ADR-282 D4: the seeded walkthrough must be
  `wt-01-*`-named — the walkthroughs directory is the chain, and recorded
  segments append after the highest `wt-NN`. Constraint from ADR-286:
  the Web Template seed is a `.templates` file containing a `standard`
  block.
- **Blocks**: D3's template content; Acceptance 3.

### Q-3: Reveal in Finder?
- **Why it matters**: the typed view hides paths; terminal-curious authors
  and the book's CLI workflow need an escape hatch to the real folder.
- **Blocks**: nothing — additive menu item.

## Session

Drafted 2026-07-27, session fda0f0, from David's first-install walk and
the project-model conversation (`docs/context/session-20260727-2100-main.md`).
