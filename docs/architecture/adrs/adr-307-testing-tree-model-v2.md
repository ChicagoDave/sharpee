# ADR-307: The Testing Tree, Model v2 — The Tree Is the Model, Files Are a Projection

**Status**: ACCEPTED (2026-08-09, session fb4281 — all eight open questions
resolved by interview the same evening; `adr-review` 13/17 NEEDS WORK → four
findings folded → 17/17 READY FOR IMPLEMENTATION; accepted by David on the
re-reviewed result. Implementation awaits its own plan — nothing lands
before the cutover phase, and the supersession flips land with it.)
**Date**: 2026-08-09 (session fb4281, from the functional-logic walkthrough)
**Supersedes (when accepted)**: ADR-306's range/tick model (design §3) and its
click-through rulings 8, 13, 17 where they concern ticking; ADR-302's
`continues:`-file at-rest representation *for the Chord/IDE testing world*.
**Flip owner**: whoever lands the cutover phase flips ADR-306's and ADR-302's
status lines (SUPERSEDED in part, pointing here) and marks the walkthrough
doc's v1 sections superseded — in the same edit set as the cutover, never at
this ADR's acceptance (the superseded model still ships until then).
**Untouched**: `@sharpee/transcript-tester` and the platform's hand-authored
text transcript world — walkthroughs, unit transcripts, `--chain`, Dungeo.
That is Sharpee's own author-facing test language and it stays text.
**Companion**: `docs/work/testing/functional-logic-testing-surface-20260809.md`
(the as-built model v1 this proposal supersedes, and the walkthrough record).

---

## Context

The go-live click-throughs (2026-08-09, rounds 4a–4i) kept converging on the
same pressure: the surface treated transcript **files as identities** — stems
to maintain, rename, cascade, and detach — while every ruling David made
pushed inclusion earlier and boundaries later ("a range is a file from its
first tick", "sequential ticks extend one transcript", "unticked play never
persists", "`continues:` only at branch starts"). Walking the assembled logic
surfaced the underlying inversion, in David's words: *"We're using file names
too literally. They should be a result of the tree, not the other way around.
It's literally a serialize-deserialize concept."* Three further steps followed
in the same conversation: the tree serializes better as JSON than as a text
grammar (branch-tester's format is the IDE's artifact, not the hand-author
language — that is transcript-tester's); the branch hierarchy in the JSON
makes `continues:` meaningless; and with inclusion universal, the checkboxes
have no remaining job — *"when you enter a new command, the tree is just
updated."*

## Decision

### D1 — The tree is the model; files are a projection

The Testing tab holds one **test tree** per story: the branch hierarchy of
played turns, each carrying its assertions. Loading testing for a story
**deserializes** the persisted tree into the tab; every change **serializes
it back out fresh**. Nothing maintains file identities: no renames, no
`previousName` cascade, no per-segment write tracking. (Write mechanics may
still diff-and-touch only changed bytes — that is an optimization, not a
model property.)

### D2 — The canonical serialization is one JSON document

**Resolved (Q-1, David 2026-08-09): JSON is confirmed** — total lossless
round-trip beats grammar legibility for an IDE-owned artifact, with
transcript-tester keeping the platform's hand-authored text world regardless.
**Resolved (Q-2, David 2026-08-09): the document is `<story-id>.tests.json`,
beside the `.story` file at the project root — and the `tests/` folder goes
away** (it held nothing else once transcripts stopped being loose files).
Runner discovery keys off the story id it already knows. Schema: Q-3. The
document contains the hierarchy
explicitly — nodes with commands, per-turn claims, fork structure, sibling
order, the pinned seed. Consequences:

- **`continues:` ceases to exist.** It was the encoding of parentage forced
  by flat text files; hierarchy is now structure. The runner's
  run-parent-once-children-continue behavior derives from the tree shape
  unchanged.
- **Stems and the naming scheme cease to exist.** Names survive only as
  derived display labels (run column rows, failure citations) — the
  `opening-<room>` / route-label idea lives on as labeling, with no
  mechanical weight and no collision machinery. **Resolved (Q-8, David
  2026-08-09): derived labels only** — the main line labels from its
  opening (`opening-iron-gates`), branches from fork room + command
  (`fountain-court · east`); nothing persisted, no rename affordance (an
  optional `label` field remains a purely additive possibility later).
- **The detach/diverged class ceases to exist.** There is no claim grammar
  for a hand edit to fall outside of.
- Open questions A ("why the numbers") and B (`continues:` removal) from the
  walkthrough are **deleted, not answered**.

**Resolved (Q-3, David 2026-08-09): the schema is card-recursive** (David's
`docs/work/testing/sample.json`, normalized): top level carries `version` (1,
reader refuses newer), `story`, `seed`, and `cards`. A card is
`{ type: opening|boot|turn, command?, assertions?, skip?, branches? }` —
the opening carries no command; the boot look is its own card. **The fork
lives ON the card branched from**: `branches: [{ branch: <stable id>,
cards: [...] }]`, recursively — no positional indices; the hierarchy is the
position, and the main line's continuation is the parent's remaining cards.
Sibling order is array order; the `branch` id exists so the sidecar can
reference active/collapsed lineages stably. Assertions are the authored
families only (`contains`, `notContains`, `exact`, `states`, `events`,
`channels` as `{id, contains|is}`, plus `noDefaults`); policy defaults
synthesize live from the `.story` header through the same code path as the
surface. Serialization is deterministic (sorted keys, stable order).

### D3 — The Testing tab is always recording; the checkboxes go

Playing in the Testing tab **is** writing the suite: every typed command
updates the tree, which serializes. There are no ticks, no ranges, no
open/closed recordings, no rail. The Play tab remains the place to play
without recording. Cards keep their real jobs: the turn's prose, its
assertion list (green, deletable), and the Branch gesture.

### D4 — The tree is a script; edits are repairs validated by replay

**(Amended by Q-7's resolution, David 2026-08-09.)** The tree is a command
script with claims — its meaning comes from replaying it against the
CURRENT story. Recorded state is never the truth; it is re-derivable at any
time. Consequences:

- **Story edits create seams, not corruption.** A content change shows as
  failed assertions at the seam. A structural change (location added or
  removed on a recorded path) is repaired by **splicing a turn in or out**;
  mid-path splices are legitimate precisely because the next whole-path
  replay re-derives every downstream card against the current story, and
  claims that no longer hold surface as failures. (Splice gesture surfaces
  are design-phase chrome, not recorded here.)
- **`[SKIP]` demotion** — a turn that runs and asserts nothing (unchanged).
- **Tail-cut** — discard this turn and everything after it, branches
  included; today's branch-delete is the sibling-scoped case.
- **Restart has no meaning in the Testing tab** — the session IS a replay
  of the tree; there is nothing a restart would express that replaying does
  not already mean.

**Resolved (Q-4, David 2026-08-09): tail-cut is a hover ✕ on the card**,
armed-then-confirmed like the branch chip's ✕ — one destruction idiom: chip
✕ = tail-cut scoped to a sibling; card ✕ = tail-cut on the viewed line
("delete this turn and everything after it, branches too"). A tail-cut
changes what was played, so it clears the ⌘Z stack rather than joining it —
the same rule fork, chip-delete, and fence follow.

### D5 — Branching is unchanged mechanically

Fresh boot + deterministic replay at the pinned seed; suppressed prefix,
alternate typed live; the viewed lineage is the live lineage; dialogs
auto-drive from recorded outcomes. All of it now operates on and records into
pure tree structure. Branch runs, blocked-by-ancestor reporting, and
seed-pinned-at-root carry over.

### D6 — The runner consumes the tree

`sharpee test --tree` (branch-tester) deserializes and walks the same JSON
document the tab writes — the one-code-path contract tightens rather than
breaks. After cutover, branch-tester's transcript parser, serializer, and
claim grammar retire. **Resolved (Q-5, David 2026-08-09): no text export** —
the Testing tab is the human view and deterministic JSON is the diff. If an
export ever exists it would be **HTML documentation** of the suite, and it
is low priority, out of this ADR's scope. `transcript-tester` and its text
format are untouched.

### D7 — The sidecar shrinks to session ephemera

The tree document carries everything reproducible: commands, structure,
claims, seed. The Application Support sidecar keeps only what the tree
cannot: view state (active lineage, collapse) and save/restore dialog
outcomes. The replay script derives from the tree. The suite-scoped
persistence rulings (ADR-306 rulings 11) become trivially true — there is no
unticked play to scope away.

### D8 — Cutover, not migration

Per the project's no-backward-compatibility stance: Chord stories' existing
`tests/*.transcript` suites cut over one-shot. **Resolved (Q-6, David
2026-08-09): clean start, no import** — the cutover removes `tests/`; any
suite worth keeping is re-played into the tree (replay makes that cheap),
and the retiring parser dies with nothing depending on it.

## Affected

- `packages/branch-tester` — tree-document deserializer/walker in; transcript
  parser, serializer, and claim grammar out; run-event stream relabeled to
  derived labels.
- `packages/devkit` — `test-tree` command discovers `<story-id>.tests.json`;
  `tests/` directory discovery retires.
- `tools/ide/web/testing-surface` — model becomes the tree (cards-recursive);
  ticks/ranges/extension/naming/rename/detach code retires; serializer,
  tail-cut, splice, follow-the-tree session driver in.
- `tools/ide/SharpeeIDE` — `TestingSessionStore` shrinks to view state +
  dialog outcomes; `TestingSurfaceViewController`'s write bridge targets the
  single document.
- Test suites — branch-tester vitest, surface vitest, and the IDE real-path
  suites rebuild around the tree document.
- `docs/work/testing/functional-logic-testing-surface-20260809.md` — v1
  sections gain superseded markers at cutover (see Flip owner).

## Acceptance Criteria

- **AC-1 (round-trip)**: serialize → deserialize is the identity on the tree
  for the resolved schema, verified byte-for-byte on the serialized form.
- **AC-2 (one document, two consumers)**: the tab and `sharpee test --tree`
  consume the same `<story-id>.tests.json`; a suite authored in the tab runs
  green in the CLI with identical labels and failure citations.
- **AC-3 (edits replay whole)**: tail-cut, splice-in/out, and branch each
  followed by a whole-path replay yield exactly the specified tree, with
  seams surfacing as failed assertions — never as corruption or lost nodes.
- **AC-4 (degradation)**: a document with a newer `version` is refused with
  a named message; a malformed document degrades to a fresh tree without
  error (the sidecar corruption rule, carried over).
- **AC-5 (cutover completeness)**: after cutover no `tests/` directory is
  created or read, and no transcript-grammar code remains in branch-tester
  (`transcript-tester` untouched, verified by its suite).

## End-to-End Scenario

Play fernhill in the Testing tab: three norths land as cards (opening, boot,
turns). `<story-id>.tests.json` exists after the first turn and matches the
resolved schema. Branch from turn 2 with `east` — the document gains a
`branches` entry on that card with the alternative's own cards. Tail-cut the
main line's turn 3 — the card and its descendants leave the document. Close
and reopen the project: the tree deserializes and replays to the identical
board (AC-1 through the real driver). Run: the column shows
`opening-iron-gates` and `gravel-drive · east` rows with PASS and turn
counts; edit a room description in the story, rebuild, Run again — the seam
shows as that turn's failed contains, nothing else changes.

## Consequences

- A large share of the v1 machinery — the range model, tick semantics,
  extension rules, naming, rename cascade, detach tracking, `continues:`
  composition, and their tests — is deleted rather than maintained. Much of
  it was built or reworked earlier this same day; the walkthrough exists
  precisely because iterating per-symptom kept relocating the same underlying
  tension instead of resolving it.
- What survives intact: the replay driver and its determinism contract,
  assertions-in-cards with default synthesis and the platform's opening-claim
  evaluation (bootstrap/branch-tester fixes), the run column's stream fold,
  undo over authoring state, the IDE shell behaviors (geometry, launch
  toggle, policy re-read).
- branch-tester's public shape changes substantially (tree document in,
  transcript grammar out) — platform work requiring its own plan and phases,
  with the fixture/real-path test suites rebuilt around the tree document.

## Session

2026-08-09, session fb4281 — proposed during the functional-logic walkthrough
that followed click-through rounds 4a–4i; written up at David's direction
("write up model v2 and this is probably a new ADR or Proposal"). Not to be
implemented before acceptance.
