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
**Flips landed**: 2026-08-10, session ed3730, with the cutover — ADR-306 and
ADR-302 flipped as specified; ADR-305 flipped to SUPERSEDED outright (play IS
recording — nothing to promote); the transcript grammar, its parser/
serializer/rename cascade, the v1 tree runner, and `tests/` discovery are
deleted from `@sharpee/branch-tester` and `@sharpee/devkit`. The Phase 5
rulings (record-time synthesis, default policy, count-free rows) are amended
inline in D2, D3, and the End-to-End Scenario.
**Untouched**: `@sharpee/transcript-tester` and the platform's hand-authored
text transcript world — walkthroughs, unit transcripts, `--chain`, Dungeo.
That is Sharpee's own author-facing test language and it stays text.
*(Note, 2026-09-08, ADR-340 D1: transcript-tester now exports the assertion
core — the claim evaluator and per-command execution — that this package's
runner imports; its grammar, golden tier, and CLI are unchanged.)*
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
reference active/collapsed lineages stably. Assertions are the recorded
families (`contains`, `notContains`, `exact`, `states`, `events`,
`channels` as `{id, contains|is}`, plus explicit `skip`). **Amended
2026-08-10 (David's rulings, cutover session): the JSON is the source of
truth for all testing elements.** Policy defaults do NOT synthesize live at
run time — the tab synthesizes under the effective policy when a turn LANDS
and persists the result into the card (record-time synthesis; a claim-less
non-skip card is filled, never overwritten). A document run evaluates
exactly what the JSON says; a bare card is the tier-boundary failure.
`noDefaults` left the schema (closed grammar — narrowing is plain removal).
Serialization is deterministic (sorted keys, stable order).

**Addendum — the `states` family's string grammar (2026-09-03, session 89ce13,
GH #355 ruled by David).** A `states` entry is one string, parsed only by
`evaluateStateExpression` in `packages/branch-tester/src/runner.ts` (no other
document spells this grammar; this paragraph is its reference). Forms, tried
in order: `story.state = <state>` / `!=` (the story's phase); `<entity>.<property>
= <value>` / `!=` and `<entity>.<collection> contains <item>` / `not-contains`
(the head is everything before the last dot ahead of the property — a
multi-word name with spaces, a kebab-case Chord IR id, an alias, or a world
id all resolve, GH #375, 2026-09-06; it was a single word until then;
`location`, `contents`/`inventory`, or a plain
property); and the Chord-spelled form `[the] <name> is <state>` / `is not
<state>`, which reads a Chord entity's own `states:` value (`chord.state.<ir-id>`,
reached through the IR-id attribute the loader stamps on every entity it
creates) and accepts the story's own spelling of the name — spaces, aliases —
with `the story is <state>` reading the phase. The family's shape in the
schema is unchanged; the Testing tab's `states` field is free text.

> **Note (2026-09-30, session fd3ed7 — written by the plan phase that landed ADR-355 D1-D5 and D7, `docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md` Phase 4, as ADR-355 D6 requires).** "The canonical serialization is one JSON document" no longer holds: ADR-355 segments the tree at rest. The Q-2 resolution is half kept. The artifact is still named after the story and still sits beside the `.story` file, but it is now a directory, `<story-id>.tests/`, not the file `<story-id>.tests.json`. Inside it, `manifest.json` holds `version` (now 3), `story` and `seed`, and each run of cards between fork points is one segment file named by its id. D1's "the tree is the model; files are a projection" is the part of this decision that survives, and it is what makes segmentation expressible. The card-recursive schema (Q-3) is still the in-memory shape; a fork's `branch` id is now the branch's segment `id`, and every card carries a minted `id` (ADR-355 D7).
>
> **Note on Q-8 (same session, same owner).** Half of Q-8 is retired. "Nothing persisted" no longer holds, because ADR-355 D5 persists an opaque 8-character id on every segment, and a line is identified by its segments' ids. "Derived labels only" stands unchanged: run column rows and failure citations still show the derived label, and no rename affordance is added, since the id is not something an author names.

### D3 — The Testing tab is always recording; the checkboxes go

Playing in the Testing tab **is** writing the suite: every typed command
updates the tree, which serializes. There are no ticks, no ranges, no
open/closed recordings, no rail. The Play tab remains the place to play
without recording. Cards keep their real jobs: the turn's prose, its
assertion list (green, deletable), and the Branch gesture. **Amended
2026-08-10: recording includes the claims** — the landing turn's synthesized
assertions (and the opening's channel claims from the boot captures) persist
into the document at record time; "synthesize live, never persist" is
reversed by the same source-of-truth ruling amended into D2. The effective
policy when a story declares none is the platform default
(`room-name-and-description`, one constant in branch-tester); the Test menu
names it "Default (Room Name and Description)".

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

**Amendment 2026-09-27 (GH #540) — the document's seed is the engine's seed.** "Pinned seed" here always meant the document's `seed` field: `sharpee test --tree` replays at it and at nothing else. The IDE hosts, though, booted the Testing tab's live engine at the IDE's fixed play seed (ADR-305 D1) whatever the loaded document pinned, so a story whose document pinned another seed (secret-letter, 1209) recorded every card at one seed and replayed them at another — two different plays of the same commands for anything chance-dependent, and the document could not say which it recorded. Both hosts (macOS and Avalonia) now read the loaded document's `seed` and boot the engine at it; the fixed play seed is the pin of a fresh tree only. The surface states the invariant where the two values meet: a document pinned at a seed the engine did not boot at is refused by name and write-locked, the treatment a newer-version document already gets (AC-4).

**Amendment 2026-11-12 (David, session a64f6a; engine-test-performance plan, Phase 4) — a branch line starts from a restore, not a replay.** This amends D5's "Fresh boot + deterministic replay" for `sharpee test`, and ADR-302 D17's rule for the tree walker and the derived tier.

*What changes.* `sharpee test` boots one game per run of a tree, not one per line. The main line runs from that boot. As a line runs, the walker captures the engine's save at each card a branch forks from, and a branch line begins by restoring its fork's save on the same engine. The derived tier starts each derived row the same way, from the save at the card it derives from. "Fresh boot + deterministic replay at the pinned seed" now describes the main line and the lines listed under "What still replays".

*What does not change.* The document's seed is still the engine's seed. Saves are held in memory for the length of one run and dropped at its end; none is written to disk, read from disk, or carried to another run. So D4 stands: recorded state is never the truth, because every save a line starts from was produced earlier in the same run, by the current story, from the root. A fork at or after an END STATE card, or after an execution error, is blocked exactly as before. The Testing tab's own live engine is not touched by this amendment; it still replays.

*ADR-302 D17's two reasons, answered.* D17 chose re-execution for two reasons. The first was the hook collision (GH #227): registering save hooks dropped the restart hook. That was closed the same day D17 was written, when `registerSaveRestoreHooks` became a merge. The second was the general one: "restoring made the save format a correctness dependency of the harness: anything a save fails to serialize diverges silently in every child." That reason is still true, and this amendment does not argue with it. It answers it with a guard that did not exist then: the per-fork equivalence mode (`node scripts/perf/survey-test-run.mjs --equivalence <story>`), which at every fork plays one game by replay and another by save, play-on and restore, and compares the world and the rendered blocks of every following turn. On 2026-11-12 it found one real gap of exactly the kind D17 feared (a save taken before a story's first random draw carried no cursor; fixed in `packages/story-loader/src/evaluator.ts`), and after the fix it reported Secret Letter 105 of 105 forks equivalent, orchard 3 of 3, ferry 1 of 1. D17 measured the cost of re-execution at 6.2% on Fernhill. On Secret Letter the survey measured prefix replay at 46% of the run, which is the shape D17 named as the one it would lose to.

*What still replays.* A save does not carry the engine's undo history: undo snapshots are cleared by every restore. A branch line whose own cards type `undo` could reach back across its fork, so that line is not restored. It boots fresh and replays its prefix, as every line did before. The replay driver therefore stays in the walker, for the main line and for these lines.

*The Consequences line* ("what survives intact: the replay driver and its determinism contract"). The determinism contract is kept whole: one seed, one result, run to run. The replay driver is kept and now covers the main line and the lines that type `undo`.

*AC-3 ("edits replay whole").* Still holds. After a tail-cut, a splice or a new branch, every line's path is executed from the root in the same run, once, by the line itself and its ancestors. What changed is that a shared prefix is executed once and not once per descendant.

*The reproducibility error.* The walker's "replay of X failed where the owning line succeeded — the tree is not reproducible at this seed" can no longer occur on a restored line, because nothing is replayed there to disagree. It remains for the lines that still replay. What stands in its place for restored lines is the equivalence mode, run on demand. It gates nothing; a restore the engine refuses is reported on the line as an error naming the fork.

*ADR-348's checklist.* A fork restore replaces the world under a live harness, so each view held outside the world is named here and either re-derived or declared:

| View | Where | After a restore |
|---|---|---|
| The engine's phase | `GameEngine` | Re-derived by the engine itself in `loadSaveData` (`derivePhaseFromEnding`). The walker adds nothing. |
| `lastOutput`, `lastEvents`, `lastTurnResult`, `lastChannels`, `lastChannelValues`, `lastError` | bootstrap's loaded game | Stale: they describe the last turn of the line that ran before. The walker clears them at the restore, so a line's first card cannot read another line's turn. |
| `capturedChannels`, `bootChannelValues` | bootstrap's loaded game | Facts of the boot, not of the world. One boot serves the run, so they are right as they stand. |
| `autoAssertionPolicy` | bootstrap's loaded game | Set once per game by the walker (cleared); unchanged by a restore. |
| The plugin registry's states | bootstrap's loaded game | Carried by the engine's save and restored with it. |
| The room note and the line label | the walker | Read from the world after the restore, as they are read after a replay. |
| The turn number passed to `onCard` | the walker | Counted from the document (`prefixTurns`), never from the game. Unchanged. |

*The fork save's type.* `captureSave` returned `unknown`. It returns the engine's save data type, and the walker holds fork saves as that type.

*An author's own save and restore cards.* The walker's fork hooks are registered for the moment of a capture or a restore and removed after it, so a line that types `save` or `restore` later meets the story's own hooks. A test covers it.

*The run report* (David's ruling, same session). The closing line reads `N commands (A authored + R replayed), F restored at a fork`, shown when R or F is above zero. R is the prefix commands of the lines that still replay. The line observer's `onLineStart` keeps `replayedCommands` (0 for a restored line) and gains `restored`; the run result gains `forkRestores`.

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
`opening-iron-gates` and `gravel-drive · east` rows with PASS — count-free
(amended 2026-08-10, David: "turns have no meaning unless the author gives
them meaning"; the tally counts cards and assertions instead, and every
assertion's verdict shows in the run detail); edit a room description in the
story, rebuild, Run again — the seam shows as that turn's failed contains,
nothing else changes.

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
