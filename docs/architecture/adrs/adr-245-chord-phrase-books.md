# ADR-245: Chord phrasebooks — named, predicated phrase collections

## Status: ACCEPTED (2026-07-19 — all six open questions ruled by David via interview, session 7692ef: fallback below story overrides; any-key partial coverage; predicate-driven activation, first-match in declaration order, derived not stored; in-story block + `use` distribution; person-orthogonal via `{You}` realization; named "phrasebook" with the docs cookbook renaming. adr-review 9/15 same-session: coherent as a decision record; all FAILs are the deliberate stop-at-intent — implementation gated on a design-level companion, see Decision closing. Amended 2026-07-20, session 171837: proposed language example added at David's ask — entries are ordinary story phrase definitions in a `define phrasebook … end phrasebook` block; `import phrasebook <file>` for author file organization; `use phrasebook <name> [while …]` distribution spelling; single kebab book names; variant state per (book, key); generalized `import` parked for its own ADR. Illustrative for grammar detail — the design companion owns final grammar/IR.)

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

## Proposed language example (amendment 2026-07-20 — illustrative)

David's ask before implementation (session 171837): show the proposed
Chord surface in the ADR. Shape corrected by David same session: **a
phrasebook's entries are ordinary story phrase definitions, written
exactly the way phrases are defined today** — the book adds only the
grouping and the gate predicate. It is not a platform-message override
pack; dotted message IDs are not the motivating shape (whether they
remain *legal* inside a book — Q-2 recorded "any key" — is for the
design companion to re-confirm with David). This section is binding for
*feel*, not for grammar — the companion owns final grammar, IR shapes,
and diagnostics.

```story
define phrasebook winter while the season is winter
  cold-returns, first-time:
    The cold finds you the moment you step out, and means it.
  or
    The cold again, familiar now.

  hearth-call, cycling:
    Somewhere behind you, the fire is still lit.
  or
    The house holds its warmth like a grudge.
end phrasebook

define phrasebook springtime
  cold-returns:
    A last thread of chill, already giving up.
end phrasebook
```

A consuming clause is unchanged — `phrase cold-returns` in an `on`
block, or a `{cold-returns}` marker in prose. Which text renders is
decided at render time by the books' predicates.

What each ruled decision looks like here:

- **The block (D1)** — `define phrasebook <name> [while <condition>] …
  end phrasebook`, the `define … end` family. Entries are today's
  phrase definitions verbatim: `<key>[, strategy]:` with `or` variants,
  all five strategies available (`first-time` above is the "novelty
  then routine" selector, §4.2).
- **Predicates, not swaps (D3)** — `winter` is the voice exactly while
  `the season is winter` holds (an ordinary §3.4 condition; derived at
  render time, nothing stored). `springtime` is predicate-less:
  `always` — the base voice, naturally declared last. Arbitration is
  first match in declaration order, **per key**: in winter,
  `cold-returns` comes from `winter`; otherwise from `springtime`.
  `hearth-call` is covered only by `winter`, so off-season it falls
  through per Q-1 — per key, never per book.
- **The fallback chain (D2)** — a story-wide `define phrase
  cold-returns` (outside any book) would beat both books, always; a
  per-entity `phrase …:` override beats even that. Swapping voices
  never touches text the author wrote at those levels.
- **`use phrasebook` distribution (D5; spelling ruled 2026-07-20)** — a
  packaged voice arrives in the story header as

  ```story
  use phrasebook candlewick-gothic while the player holds the locket
  ```

  binding the predicate at the `use` site; without `while` it means
  `always`. The `phrasebook` sub-word disambiguates the registry from
  plain `use <extension>` (whose strict one-word grammar is untouched)
  and mirrors `import phrasebook`. **A story may stack any number of
  `use phrasebook` lines with varying predicates** (verified with
  David, 2026-07-20):

  ```story
  use phrasebook candlewick-gothic while the player holds the locket
  use phrasebook fever-dream while the player is poisoned
  use phrasebook plain-country
  ```

  Ordering rule: all books — `use`d and `define`d alike — arbitrate in
  order of appearance in the story file, first match per key; a
  predicate-less book is the base voice.
- **`import phrasebook` (David, 2026-07-20, session 171837)** — the
  author's file-organization axis, distinct from `use` distribution:

  ```story
  import phrasebook "winter-voice.story"
  ```

  pulls a file of the author's own `define phrasebook` blocks into the
  story source, as if declared at the import site — which is also what
  gives an imported book its position in the arbitration order. The
  file is part of the story project, so its predicates may reference
  story entities and states freely (unlike a `use`-distributed book,
  which binds its predicate at the `use` site). Filename/extension
  conventions and resolution rules are the companion's to pin.
- **Person-orthogonal (D4)** — book text uses realization slots
  (`{You}` family) where it speaks of the player, rendering under
  whatever person the story declares (ADR-243).

Two further syntax rulings (David, 2026-07-20, from the workability
review against `packages/chord/src/parser.ts`):

- **Book names are single kebab-case words** (`winter`,
  `candlewick-gothic`) — the same form as extension names. This
  sidesteps any multi-word-name-vs-`while` boundary question in the
  block header, since `while` is already a structural word.
- **Variant state is per (book, key)**: `cycling`/`first-time`/`sticky`
  firing counters belong to the *entry*, not the bare key. When
  `winter` and `springtime` both define `cold-returns`, each carries
  its own save-persistent counter — a springtime render never consumes
  winter's "first time." The competing-definitions registry and the
  save shape must key variant state accordingly.

Details the companion must pin: entry-level `while` disallowed inside a
book (the book's predicate is the gate — same rule as §2.10's
`analysis.override-gate`); `use phrasebook <unknown>` rejection
behavior; `import` filename/resolution rules; and the Q-2 dotted-key
question above.

**Parked (David, 2026-07-20): generalized `import`.** Once `import
phrasebook <file>` exists, `import <file>` for *any* story source —
rooms, people, sequences split across files — is the obvious
generalization ("import might be used for any file name — might need to
think that through"). That is a multi-file story-source decision with
its own questions (what a fragment file may contain, ordering across
files, diagnostics spanning files, how `sharpee compose` and the
browser's compile-at-boot handle multiple sources) and is deliberately
NOT decided here — it wants its own ADR when taken up. Nothing in the
phrasebook design may foreclose it: the companion should shape `import
phrasebook` so the keyword generalizes rather than becoming a one-off.

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
