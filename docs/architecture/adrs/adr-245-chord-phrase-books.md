# ADR-245: Chord phrasebooks — named, predicated phrase collections

## Status: ACCEPTED (2026-07-19 — all six open questions ruled by David via interview, session 7692ef: fallback below story overrides; any-key partial coverage; predicate-driven activation, first-match in declaration order, derived not stored; in-story block + `use` distribution; person-orthogonal via `{You}` realization; named "phrasebook" with the docs cookbook renaming. adr-review 9/15 same-session: coherent as a decision record; all FAILs are the deliberate stop-at-intent — implementation gated on a design-level companion, see Decision closing.)

## Date: 2026-07-19

## Parent: phrase algebra family (ADRs 192–206, text rendering) and ADR-230 D5 (dotted-key `define phrase` overrides). Siblings: ADR-243 (story-person, DRAFT — narration person/tense is adjacent surface), ADR-215/235 (extension surface — the `use <name>` distribution precedent), ADR-158 (formatter chain, lang-layer override point).

## Context

David, reviewing the Phase 13 stdlib work (2026-07-19, session 7692ef):
"I think the phrases need something 'more'. I'm thinking phrase books and
if we go there, we could have swappable phrase books."

Today's phrase surface has exactly two seams, both per-key:

- **Per-entity**: `phrase <key>:` in a `create` block (cycling variants,
  `while` conditionals, the `detail` channel), and `on`/`after` clauses
  carrying `refuse <key>` / `phrase <key>`.
- **Story-wide**: `define phrase` / `define phrases` — including under a
  platform dotted ID (`define phrase if.action.dropping.dropped`), which
  replaces the platform text globally (ADR-230 D5).

There is no grouping construct. A story that wants a coherent narrative
voice — terse, verbose, noir, fairy-tale — must scatter hundreds of
individual overrides, and nothing can change voice at runtime (an
unreliable narrator, a POV shift) or be shared between stories as one
artifact.

A phrase book is the missing unit: a **named, cohesive collection of
phrase definitions** treated as one artifact. Once it is a named unit,
two capabilities follow naturally:

- **Swappable at runtime**: the active book is story state; if it lives
  in world state it inherits undo/save coverage for free (the same
  property Chord sequences exploit — progress in world state).
  *(Superseded by Q-3's ruling: activity is derived by predicate at
  render time, never stored — which keeps the undo/save property and
  drops the state entirely.)*
- **Distributable**: `use <book>` in the ADR-215/235 extension-surface
  pattern — community-shareable voices.

Most of the machinery already exists: a book is largely sugar over sets
of `define phrase` overrides. The genuinely new platform piece is
**arbitration** — several books may define the same key, so the same
dotted ID needs competing definitions plus an active-book selector,
where today a dotted-key `define phrase` simply replaces text once.

## Decision

Chord gains a first-class named phrase collection — the **phrasebook**
(ruled Q-6, David 2026-07-19: the runtime construct owns the name; the
docs cookbook section renames) — that:

1. groups phrase definitions into one named artifact — **any key: platform
   dotted IDs and story-defined keys alike, partial coverage always legal**
   (ruled Q-2, David 2026-07-19); uncovered keys fall through per Q-1.
   Distribution books will naturally stick to platform IDs; a
   story-shipped book may re-voice the story's own keys (the
   unreliable-narrator case). No completeness claim exists — a book
   promises nothing about coverage;
2. can be activated for a story, with the fallback chain **per-entity
   phrase → story `define phrase` → active book → platform default**
   (ruled Q-1, David 2026-07-19): the story's explicit text always wins
   over the book — a book is the story's default voice, and swapping
   books never changes text the author wrote themselves;
3. **lives by predicates** (ruled Q-3, David 2026-07-19): a book carries
   a condition, and whichever book's predicate holds at render time IS
   the active voice — there is no imperative swap statement and no
   stored "active book" state. Activity is derived from world state
   (the ADR-240 live-derived-state family), so undo/save correctness is
   automatic. Arbitration: **first match in declaration order**, per
   key — books are checked in the order the story declares them, the
   first whose predicate holds and covers the key supplies it, and
   anything unresolved falls through per Q-1. A predicate-less book
   means `always` — the base voice, naturally declared last;
4. is **fully orthogonal to ADR-243 story-person** (ruled Q-5, David
   2026-07-19): a book carries voice only and must be written
   person-neutral via the `{You}` realization slots, rendering
   correctly under whatever person the story declares. No mismatch
   case exists; a declared-person diagnostic may come later as an
   amendment if community books prove person-dependent;
5. is declared **both ways** (ruled Q-4, David 2026-07-19): a
   first-class in-story `define … book` block with its predicate in the
   header (per Q-3), and a packaged form arriving via `use <name>` in
   the ADR-215/235 extension pattern — the story binds the predicate at
   the `use` site, and a used book with no binding is `always` (base
   voice). One construct, two sources.

This ADR records the ruled intent, not a design. **Implementation
requires a follow-up design-level companion** — an amendment here or a
child ADR at plan time — specifying the block grammar, IR and registry
shapes, the affected-module list, `use <unknown book>` rejection
behavior, acceptance criteria, and tests (a concrete unreliable-narrator
E2E scenario is the obvious spine), plus David's explicit go-ahead per
the platform-change gate. Nothing may be built from this ADR alone.

## Consequences

- The phrase-rendering path gains exactly one lookup layer, between the
  story's `define phrase` table and the platform default (Q-1 ruling).
  Per-entity phrases keep absolute priority; story overrides shadow the
  book key-by-key — a book author cannot assume their text renders for
  any key the story customized.
- A registry of competing definitions per key replaces today's
  replace-once semantics for book-owned keys — a platform change
  (engine/lang seam), gated on this ADR's acceptance and David's
  explicit go-ahead.
- Rendering evaluates book predicates at render time (Q-3): voice can
  shift mid-turn if a predicate's inputs change between two rendered
  messages in the same turn — an observable property implementations
  and docs must state, not hide.
- The stdlib reference's per-entry message-key tables become the
  authoring index for book coverage — the example-first rework (Phase
  13) makes each key's stock rendering visible, which is what a book
  author re-voices.
- **Docs rename sweep required** (Q-6): the runtime construct owns
  "phrasebook", so the docs cookbook surface renames —
  `docs/reference/stdlib-phrasebook.md`, `docs/work/stdlib-phrasebook/`
  tooling references, and the site's `/chord/phrasebook` section (nav
  label, routes, and the ~14 cross-links added in Phase 7). The new
  docs name (e.g. "Cookbook" or "Examples") is picked when that sweep
  executes; the sweep must land before or with the first phrasebook
  implementation so the term is never ambiguous in shipped docs.

## Session

session 7692ef, 2026-07-19
(`docs/context/session-20260719-2147-chord-foundations.md`) — raised by
David immediately after the Phase 13 finalize; ADR drafted at his
direction with the interview started the same session.
