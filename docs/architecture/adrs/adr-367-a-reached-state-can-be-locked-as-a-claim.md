# ADR-367: A reached state can be locked as a claim, with its set proposed from the line that reached it

**Status**: **ACCEPTED** (David, 2026-10-13, session 326e9e: "yes", after the open questions interview resolved all four questions and `adr-review` returned 21/21 with five folds applied, none changing a decision. Written the same day on `chord-4-0`, at Phase 2 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`, the second of the two design gates the Chord 4.0 objective (`docs/objectives/chord-4-0.md`, O-1) sets. Amends ADR-365 D2, which deferred the set proposal from a played line as "a convenience to add later"; the objective pulls it forward and this record decides its shape. The open questions interview ran the same day and resolved all four (Q-1 → D5 and D6, the card pin over a `proved by` claim line; Q-2 → D7; Q-3 → D1; Q-4 → D4), so there is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. No implementation is authorized in any state, and every `packages/` change is gated on its own discussion at its plan phase (15 and 16).)

**Scope**: `packages/branch-tester` (the lock, the set proposal, the per-turn predicate floor, the pin, the broken-claim report), `packages/devkit` (the CLI gesture and the report), `packages/ide-protocol` (the card's `locks` field in the tree schema, the lock request, and the claim rows on the run-event wire), `tools/ide` (the Testing tab's lock gesture), `branch-stories/fernhill` and `branch-stories/upps` (the fixtures). **ADR-365's Scope line is amended by this record**: set proposals land in `packages/branch-tester`, not `packages/world-index`, for the reason D3 gives.

## Date: 2026-10-13

**Kind**: technical

## Parent

- **ADR-365** (claims under a necessary set). **D1** (the seven predicates), **D2** (the author owns the set), **D6** (a witness is a proposal; claims are a second denominator), **D7** (claims are a `.chord` fragment the manifest names), **D9** (claims never gate), **D10** (the runner lives in branch-tester) and **D12** (the cone trims a set) all stand and are the substrate. **D2 is amended**: the proposal from a played line is no longer "later"; it is the lock. D2's rule that a proposal is "offered as a candidate the author edits, never a source the walk reads on its own" is kept whole: the lock writes Chord the author reads, and the walk reads only what is written.
- **ADR-356** (the story is the test suite). **D4** (an ending is proved by the tree line that reached it, and the author provides the line) is the precedent D5 here generalizes: a locked claim's proof is the line it was locked from, and the walk is the search when that proof fails.
- **ADR-355** (the test tree). The lines, cards, seed and manifest the lock reads and the tree's canonical-writer gate, which the claims fragment inherits by D4.
- **ADR-357 D9** (the run-event wire). The claim rows ride it; GH #555 holds the wire field as its own discussion and is cited by Phase 16.
- **GH #584, #585** (a failed card claim should show the story's output). The breaking card's output is what D6's report shows, so both are closed by Phase 16.

## Context — measured, not assumed

### What exists

- A claims fragment is hand-written Chord (`fernhill.claims.chord`: 9 claims by `grep -c "^  claim \|^  never "`, 59 lines by `wc -l`, 2026-10-13). Every `needs` line was typed from the walkthrough by hand. UPPS has none, at six rooms.
- The runner (`packages/branch-tester/src/claims/`) walks each distinct set, returns `ClaimVerdict` with `settledBy: 'witness' | 'exhaustion' | 'budget'`, a `witness` command path when found, and `thingsInSet` / `inertInSet` from the cone. It has no memory of a previous run: a claim that held yesterday and is unproven today is reported as unproven, with the budget it hit, and nothing says what changed.
- The tree (`<story>.tests/`) records every played line at the pinned seed as cards with commands and assertions; `sharpee test` replays them, and a line that stops short of its ending fails naming the ending (ADR-356 D4). The Testing tab writes the same files (ADR-307 D6, the one-code-path contract).
- The cone (`packages/chord/src/claims-cone.ts`, `claimCone(ir, claim, set)`) says which things in a set the predicate can never depend on. It is a proposal today, printed in the unproven line and emitted as an `analysis.*` finding.
- The CLI claims tier (`packages/devkit/src/commands/test-claims.ts`) runs after the derived tier when the manifest names a fragment, and never changes the exit code.

### What the objective asks

O-1 is falsified when "a reached state cannot be locked without hand-typing its `needs` set; a locked or written claim goes unproven on a later run with the story unchanged; or an edit that breaks a claim passes `sharpee test` silently." The third falsifier is the one the runner cannot meet today even for hand-written claims: an unproven claim is not silent, but it names a budget, not a story edit, and the author is left to diff.

### The two facts the lock already has

When the author stands at a card in the Testing tab, the tool holds the world after that turn and the whole line that produced it: every room entered, every noun the parser resolved, every verb typed. The set a claim needs is a subset of that line, and the cone can say which subset. So the lock is not search; it is reading two records that exist and writing one block of Chord.

## Decision

**D1 — A lock is a gesture over a card: the author picks a fact true after that turn and the tool writes it as a claim.** The fact is one of ADR-365 D1's seven predicates as they stand (an ending; the player's room; a thing in hand, in a thing, or out of a room; a declared state; a platform flag; a clause fired; a person asked). The tool offers the facts true at the card that were **not true at boot**: the room the player is in, each thing in hand, each state and flag that changed on the line, each clause that fired, the ending if the line ended. A fact true at boot is not offered, because it is not something the line reached (David, 2026-10-13, Q-3: "a"; any other predicate remains lockable by typing it, in the tab's fact field or the CLI's argument). The claim's name is the fact as a sentence in the fragment's own idiom (`the deed is in hand`), editable before it is written.

**D2 — The set is proposed from the line and trimmed by the cone, and the author keeps or edits it before it is written.** Rooms: every room the line entered up to the card. Things: every entity a command on the line resolved to, plus every entity whose state or place changed on the line. Verbs: every command head the line typed (`turn on`, `ask`). That set is then passed through `claimCone` for the chosen predicate, and the things the cone marks inert are dropped from the proposal, with the dropped names shown so the author sees what was trimmed. The author edits the three lists in place, or keeps them; nothing is written until they do. This discharges ADR-365 D2's convenience with D2's own rule intact: the tool proposes, the author owns, the walk reads only the written set.

**D3 — The proposal lives in `packages/branch-tester`, and ADR-365's Scope is amended to say so.** The proposal needs the line (the tree, which branch-tester owns), the world after the card (the engine fork the walk already uses), and the cone (exported by `@sharpee/chord`, which branch-tester already depends on). `packages/world-index` is static derivation over the IR and has none of the first two; placing the proposal there would mean teaching it the tree. ADR-365 wrote `world-index` on the Scope line before the runner had a home; D10 later gave the runner branch-tester, and the proposal follows the runner.

**D4 — The lock writes one claim into the manifest's fragment, in Chord, through one canonical writer, and it is marked as locked by a comment only.** The written block is an ordinary `claim` with its predicate and three `needs` lines, appended before `end claims`, preceded by `## locked from <line name> at turn <n>, <date>`. If the manifest names no fragment, the lock creates `<story-id>.claims.chord` beside the story with an empty `claims` block and adds the `claims` key to the manifest (ADR-365 D7's field), so the first lock on a fresh story needs nothing set up (David, 2026-10-13, Q-4: "a"). A locked claim is not a kind: at run time it is any other claim, in the same block, under the same runner, in the same report. The comment is for the author, and the author may delete it. The fragment is written by the same byte-for-byte writer discipline the tree has (ADR-355's canonical gate), so a hand edit and a lock never fight over formatting. *(Landing note, 2026-10-20, session e28264: the comment is not written. Chord admits `##` only at the top level, outside every block (ADR-249; `parser.ts:745`), so the block cannot carry it; the card's `locks` pin is the lock's record. Whether D4 or ADR-249 moves is GH #608, David's call. The splice inserts the block before `end claims` after one blank line and moves no other byte; the fragment's own canonical gate is Phase 17's.)*

**D5 — Every tree line is a proof for every positive claim, and the lock pins its claim to the card it was locked at** (David, 2026-10-13, Q-1: "d with c floor"). Two rules, the second resting on the first.

*The floor.* A positive claim is proved by any path that reaches its state, and a played line is such a path at the pinned seed. So the claims tier evaluates each positive claim's predicate at every turn of every line the tree run replays (the run already replays them, and the engine fork the walk uses gives the world after each turn), and a claim some line reaches is **held, by that line at that turn**, with no walk. Only claims no line reaches are walked, under their written set, as today. A `never` claim is untouched: it is proved by exhaustion and nothing else, as ADR-365 D3 has it. This is ADR-356 D4's rule for endings applied to every predicate, and it is what keeps O-1's second falsifier out, since a line is a constructive proof that does not depend on the walk's depth or state budget: a claim locked from a 41-turn line can be beyond the walk and still held by the line that reached it.

*The pin.* The lock also writes the claim's name onto the card it was locked at, as a card field beside `assertions` (`locks: ["the deed is in hand"]`), through the tree's canonical writer. The tree run evaluates that predicate at that card as it evaluates any assertion. The claim's proof is therefore recorded where the tree's other proofs live, and the claims fragment stays pure statements: there is one kind of claim, and the fragment gains no grammar. A card whose `locks` names a claim the fragment no longer declares is reported at the card (`lock-unknown-claim`); a line the author deletes drops its pin, and the claim falls to the floor, held by another line or walked, which is the semantic the objective asks for: a locked claim holds until the story changes, not until the author tidies the tree.

**D6 — A pinned claim that breaks is a failed card, and the report names the claim, the card, the command and the story's output there.** When a line reaches its pinned card and the predicate is false, or breaks before it, the card fails as a card fails today, naming the claim beside its message and carrying the story's output on that turn on the run-event wire, which is GH #584 and #585's ask applied here. The claims tier then reports the claim's standing: *held, by another line* when some other line still reaches it; *held, by walk* when the walk finds it under its set, with the new witness offered to the tree as ADR-365 D6 provides; *unproven* with the budget and the cone's count as today; and for a `never`, *violated* with its witness. A claim no line pins and no line reaches is reported *not reached by any line* before its walk result, so a TDD-first claim shows the same vocabulary once a line reaches it. Nothing here gates: ADR-365 D9 stands, the exit code is untouched by claim verdicts, and the report is the burndown; the failed card itself fails the run exactly as a failed assertion does today (ADR-356 D4), which is the one place a broken lock is loud, and deliberately so. In the Testing tab the row is the failed card: the tab already renders a failed card's `actualOutput` (GH #584's note), and opening the card from a result is ADR-357 D9's `cardId` field, held by GH #555 and landed with Phase 16.

**D7 — Two surfaces, one path.** The Testing tab's lock is a control on the active card after a run or a played turn: it lists D1's offered facts, shows D2's three lists as editable chips with the trimmed names struck through, and writes on Keep. The CLI is `sharpee claim <line name> [--at <turn>] "<fact>"` (David, 2026-10-13, Q-2: "a", its own command rather than a flag on `sharpee test`, which stays a reader): it prints the proposed set and writes the claim and the pin, or prints only under `--propose`; `--at` defaults to the line's last card. Both call branch-tester's one function, so the real-path IDE test and the CLI test exercise the same code (ADR-307 D6's one-code-path contract, carried to claims). The tab's gesture is verified by the testing-surface real-path tests, never by a click-through list (`feedback_automate_ide_checks`).

**D8 — Verbs are proposed from the line, not trimmed by the cone.** The cone reasons over things; a verb's relevance is whether some live rule's trigger or some needed move names it, which the cone does not compute. The line's verb set is small and the author sees it. A later measurement may show a verb trim is worth having; it is not decided here.

## The gesture, as an author reads it

The CLI command, the card's `locks` field and the report lines below are **unshipped**; the claim block itself is shipped syntax (ADR-365), written by the lock rather than by hand.

Fernhill, the winning line in the tree is named `the deed`. The author plays to the Folly, opens the deed box, takes the deed, and at that card locks a fact.

```
$ sharpee claim "the deed" "the player has the deed"

Locking at turn 41 of "the deed": the player has the deed

  needs rooms: the Iron Gates, the Gravel Drive, the Fountain Court, the Boiler Shed,
               the Entrance Hall, the Kitchen, the Greenhouse, the Folly Hill, the Folly
  needs things: Tobias, the stopcock, the primer plunger, the boiler, the garden shears,
                the vine, the silver locket, the folly door, the fuse, the deed box, the deed
                (trimmed: the sherry bottle, Mrs Kettle — the deed cannot depend on them)
  needs verbs: ask, turn, push, turn on, take, prune, open, cut

Written to fernhill.claims.chord.
```

The written block:

```chord
  ## locked from "the deed" at turn 41, 2026-10-13
  claim the deed is in hand
    the player has the deed
    needs rooms: the Iron Gates, the Gravel Drive, the Fountain Court, the Boiler Shed, the Entrance Hall, the Kitchen, the Greenhouse, the Folly Hill, the Folly
    needs things: Tobias, the stopcock, the primer plunger, the boiler, the garden shears, the vine, the silver locket, the folly door, the fuse, the deed box, the deed
    needs verbs: ask, turn, push, turn on, take, prune, open, cut
```

And on the card at turn 41 of "the deed", in the tree's own file:

```json
{ "command": "take deed", "id": "k3m9...", "type": "turn",
  "assertions": { "contains": ["Taken."] },
  "locks": ["the deed is in hand"] }
```

The next `sharpee test`, story unchanged:

```
claims: 10 held of 10 declared
  the deed is in hand — held, by "the deed" at turn 41
```

After an edit that locks the deed box behind a key the Folly no longer holds:

```
"the deed" — FAILED at turn 39, `open deed box`:
    The deed box is locked.
  lock "the deed is in hand" at turn 41 not reached

claims: 9 held of 10 declared
  the deed is in hand — not reached by any line; walked its set:
    unproven after 500,000 states (11 things; 0 inert)
```

The author reads the line, the command, the story's own output, and the claim it carried, and knows which edit did it.

## Acceptance Criteria

1. **AC-1 (D1, D2, Phase 15).** On fernhill and on UPPS, a lock from a CLI-driven line writes a claim whose `needs` is never typed; the written fragment compiles and the claim holds on the next run. **REAL-PATH** through `sharpee claim` and `sharpee test`. **MET 2026-10-20 (session e28264; the plan's Phase 16, renumbered from 15 on 2026-10-16):** `./sharpee claim hpjuaufx "the deed box is open" --at 22 branch-stories/fernhill/fernhill.story` appended the claim to `fernhill.claims.chord` and pinned card `mawc61yb`; `./sharpee claim a366titn "the player is in the Kraken Landing" --at 160 branch-stories/upps/upps.story` created `upps.claims.chord`, added the manifest key, and pinned card `t1500031`. Both `sharpee test` reruns: `HELD … — by line …`, the lock `held there`, trees green (fernhill 86 cards / 106 assertions, UPPS 244 / 358). Pinned by `packages/devkit/tests/claim-command.test.ts` and `test-claims.test.ts` (fernhill real path).
2. **AC-2 (D2, Phase 15).** The proposed things equal the line's resolved entities plus changed entities, minus the cone's inert set, asserted on a line where the cone trims at least one thing (fernhill's `the sherry bottle` on the deed claim). **MET 2026-10-20:** the fernhill lock printed `(trimmed: the sherry bottle, Mrs Kettle — the claim cannot depend on them)`; `packages/branch-tester/tests/claim-lock.test.ts` pins the rule on the claim-bits fixture (the note trimmed for a room claim, kept for a flag claim naming it). On UPPS the cone trims nothing, because the outer hatch's `vehicle-at` condition widens it to every set thing (GH #609).
3. **AC-3 (D5, Phase 15).** A locked claim on an unchanged story is held by its line, with no walk run, asserted on the run's report (*held, by line*) and on the walk count; a TDD-first claim with no pin that some line reaches is held the same way (the floor), and one no line reaches is walked. **MET 2026-10-20:** fernhill's `sharpee test` now runs 4 walks instead of 8 and the claims tier takes about 1 s instead of about 100 s: six positive claims are held by lines (victory at turn 29 of the main line among them), the two `never`s and the two claims no line reaches are walked and say `not reached by any line`. UPPS: `claims: 1 of 1 held`, `0 walks`. `packages/branch-tester/tests/claim-floor.test.ts` pins floor, pin outcomes (held, not held, unknown claim) and the fold into the runner.
3a. **AC-3a (D5, Phase 15).** A claim locked from a line deeper than the walk's budget reaches is held by the line, asserted with a walk budget set below the line's depth. **MET 2026-10-20:** `claim-floor.test.ts` holds both positive claims by line at `maxDepth: 0`, where the walk cannot leave the root; UPPS's lock at turn 160 is past any walk (the candidate generator emits no `wait`, `board` or `set`).
4. **AC-4 (D6, Phase 16).** A deliberate breaking edit to a scratch copy of UPPS makes `sharpee test` report the claim, the turn, the command and the story's output at the break; the run exits 1 because the pinned card failed (ADR-356 D4), and the claim's own verdict line contributes nothing to that code (ADR-365 D9), asserted by a second edit that leaves every card green and makes the same claim unproven by walk, where the exit is 0.
5. **AC-5 (D4, Phase 16).** A lock on a story with no fragment creates the fragment and the manifest key, and a second lock appends to the same block; the fragment passes the canonical-writer gate. **PART MET 2026-10-20 (the plan's Phase 16):** creation, the manifest key, and the append are pinned by `claim-command.test.ts`; a second lock under a name the fragment already declares is refused before anything is written. The fragment's canonical-writer gate does not exist yet and stays with Phase 17.
6. **AC-6 (D7, Phase 16).** The testing-surface real-path test locks a claim from the tab and reads the written block; the tab and the CLI produce byte-identical fragments for the same lock.

## Consequences

- **ADR-365 D2 is amended** from "conveniences to add later" to "the lock, D1 and D2 here"; its Scope line moves set proposals to `packages/branch-tester` (D3). Both edits are made in place with a dated note by the session that flips this record ACCEPTED, in the same commit; until then ADR-365 reads as written and this record reads DRAFT.
- **Chord does not change.** The claims fragment keeps ADR-365's grammar exactly; the lock writes into it and the comment is the only mark.
- **The tree document gains one optional card field, `locks`** (a list of claim names), in `ide-protocol`'s tree schema and the canonical writer, under ADR-355's version gate; whether the tree version bumps is decided at Phase 16 from what the gate requires.
- **The runner gains the floor and the pin**: predicates evaluated over every replayed turn before any walk, and a report vocabulary of *held, by line*, *held, by another line*, *held, by walk*, *not reached by any line*. The run-event wire gains the claim rows GH #555 holds, and a card's failure message carries the lock it broke; Phase 16 lands them with the Testing tab.
- **The tree and the claims fragment become one test suite in two files**: lines prove, claims state what the lines prove, and a line that breaks names the claims it carried. ADR-356 D4's ending proof is a locked ending claim in all but name; whether to write it as one is not decided here.
- **UPPS gains its claims fragment through locks, at its room commits**, which is O-1's cadence.

## Session

Session 326e9e, 2026-10-13, on `chord-4-0`, at Phase 2 of the Chord 4.0 plan, written in the same turn as ADR-366 after David's "proceed". The fernhill example uses the fragment and tree as they stand today; the reported numbers in it are illustrative of the report's shape, not measured, and are marked unshipped above.
