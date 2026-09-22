# Design note: does card+assertions survive an open story?

**Date**: 2026-09-20 · **Session**: 937338 · **Status**: EXPLORATION — nothing decided, nothing built

David opened the question: the card+assertions paradigm is right, but it loses the battle
with larger stories, or with stories that are simply open (a lot to try in each room).
This note records what the conversation established, including two places where David
corrected the proposal and the correction changed the design. It is not a plan and does
not claim a decision.

## The measurements

All figures below were produced this session by reading
`branch-stories/secret-letter/secret-letter.tests.json` (the restored file, clean after
the #497 corruption repair), with a `python3` walk over the document. Secret Letter is a
small story.

- 566 cards, of which 564 are typed turns. Max branch depth 3. All 564 turn cards carry
  authored assertions.
- 46 distinct first words. The histogram is dominated by movement and looking:
  `x` 100, `take` 62, `wait` 50, `se` 34, `s` 30, `n` 29, `ne` 21, `slide` 18, `smell` 16.
- 145 of 564 turns (26%) are pure probe verbs — `x`, `examine`, `look`, `read`, `search`,
  `smell`, `listen`, `touch`, `inventory`.
- Assertion families across those turns: `contains` on 552, `states` on 124,
  `notContains` on 55.
- 720 `contains` claims, only 378 of them distinct. `Base of the Center Post` is claimed
  27 times, `Inside the Silk Tent` 20, `Fruit Stall` 14.
- The 27 cards claiming `Base of the Center Post` carry **two** distinct full claim-sets
  between them. Sampled eight of them: every one has zero `states` claims and no prose
  claim other than the room name.

That last figure is the important one, and it is worse than redundancy. Those 27 cards are
27 arrivals at one room from 27 different points in progression, and each asserts only
that it arrived. If anything in that room varied with story state, not one of them would
notice. The document is spending its cost on the part that does not vary and leaving the
part that does uncovered.

## Why the paradigm loses at scale

Three costs, each growing in the wrong direction.

The cost of checking one fact is proportional to its depth. A card only means anything in
the state its ancestors produced, so a check in a late room replays the whole prefix.
Adding one scenery object to a late room buys a full replay for one string compare. Late
content is where the bugs are and it is the most expensive to cover.

Openness is a set, and the grammar has only *next* and *instead*. Eight nouns and six
verbs in one room is 48 mutually independent, order-free checks. `TreeCard` can express
them as a chain 48 deep, or as 48 branches each paying the prefix again. Neither is what
they are, and that mismatch is why the card count explodes.

The document grows with turns typed rather than with facts established. 342 of 720 prose
claims are restatements.

## Correction 1 — location is not a state key

Proposed and withdrawn: room-scoped or subtree-scoped invariants, so a room's name would
be claimed once where it is established rather than 27 times downstream.

David: *"a branch at a location can occur more than once since the world model state and
story progression are the deciding factors."*

This is right and it kills the idea. Two visits to one room are two situations that share
a name; what is true there is a function of world state and progression, not of the room.
Merging by location would delete real checks while looking like tidying up. The only
sound equivalence available by path is **identical command prefix at the pinned seed**,
which is what replay already rests on — that makes prefix-factoring safe and nothing else
safe by that route.

The narrow surviving exception is claims that are state-independent because they are about
the renderer rather than the world: no `undefined` in the status line, no empty output
line. Small class.

## The hash idea

David: *"the idea of a 'hash key' seems relevant here. Is there a way to build hash keys as
the story progresses and use that hash key as the branching mechanism?"*

This is the standard move for the shape of the problem — transposition tables,
explicit-state model checking — and the input already exists.

Save format v3.0.0 carries `worldSnapshot`, the verbatim `WorldModel.toJSON()`, plus
`streamStates`, the per-point RNG stream position (ADR-293 D7)
(`packages/engine/src/session/save-restore-service.ts:18-31`). That set is by construction
everything affecting the future; if it were not, restore would be broken too. So the state
key need not be invented — the save format already answered what "state" means, and every
restore tests that answer.

Mechanics worked out:

- Exclude the bookkeeping that describes the recording rather than the state: `turnCount`,
  `playTime`, `description` (`packages/core/src/types/save-data.ts:28-43`). `turnCount`
  especially — leave it in and nothing ever converges, since every state is unique by turn
  number.
- Hash the JSON before the gzip and base64 step, since fflate stamps an mtime into the
  gzip header and the compressed bytes would differ on every save of an identical state.
- Canonicalize key order. `toJSON` (`WorldModel.ts:1563`) delegates to `WorldSerializer`
  and serializes Maps in insertion order, so two equivalent worlds built in different
  orders serialize differently. A key sort at hash time is enough; no serializer change.
- **Unverified and load-bearing**: pulling `turnCount` out is only safe if fuse and daemon
  tick counters are in. A daemon firing on turn 20 makes two otherwise-identical states
  behave differently. This is the first thing to check.

The failure mode is asymmetric. Too sensitive and nothing merges, which is visible
immediately and costs nothing. Too loose and two different situations are treated as one,
which silently deletes tests thought to exist. Err sensitive.

## Two hashes, not one

The first framing conflated two jobs. They should be separate keys:

A **state hash** over the save payload answers "can I restore here instead of replaying?"
That is a performance key. It must be complete; churn merely means fewer hits.

An **observation hash** over the responses at a node answers "have I already tested this
situation?" That is a coverage key, and it is the one David's wandering case needs. A turn
counter does not change what `x dumpster` prints, so per-turn churn is irrelevant to it by
construction, and no one has to define what counts as story progress — the story answers
by what it prints.

The sound form of the observation hash is relative to a probe set: two arrivals are the
same test situation if and only if every probe run there answers identically. Mechanically
checkable, and it is exactly the guarantee a black-box suite can claim in the first place.
Its limit is that it is sound only for the probes actually run; hidden state that changes
later output slips through — a hole the suite already has, since every claim in it is an
output claim.

## Correction 2 — Sharpee tracks memory

David: *"the catch is in Sharpee we track memory so that does impact state."*

Confirmed in code, and the code also bounds it:

- `RoomTrait.visited` (`roomTrait.ts:33,128`) is set by `RoomBehavior`
  (`roomBehavior.ts:164`) behind an idempotent guard (`roomBehavior.ts:160`), so it flips
  false to true exactly once.
- `CharacterModelTrait` carries the told-record (`characterModelTrait.ts:109,257`, with
  `hasTold`/`recordTold` at 690-707) and per-pair conversation memory (line 277,
  ADR-320 D4/D6/D9), all persisted by ADR-310 D17's rule that everything the model
  remembers rides the trait.
- `examining.execute` is empty with a comment saying so — read-only by construction, with
  ADR-228 interceptors as the escape hatch.

The structural point: **memory here is monotone.** Flags go one way, records only grow,
nothing oscillates. Monotone state does not scatter the hash space — it partitions it into
a few forward-only classes. So the 27 Alley arrivals do not become 27 states; they become
first-visit and subsequent, and the subsequents converge exactly as David expected.

That turns the catch into an argument for the hash. Today all 27 cards assert the same
bare room name, so nothing distinguishes the full first-visit description from the brief
one that follows. A hand merge on the reasonable-sounding theory that it is the same room
would have dropped the first-visit text out of coverage silently. The hash refuses that
merge without being told about `visited` at all.

Where it does cost: probe purity. "Post-hash equals pre-hash means read-only" survives but
becomes a measured fact per probe rather than a guarantee per verb — `x` is read-only in
stdlib, a story interceptor can make it otherwise, and anything conversational never is.
The honest replacement for a purity guarantee is an **order-independence check**: run the
probe set forward, then reversed, from the same restore, and compare. 2N turns instead of
N, still nothing like N x prefix, and when order does matter that is a real interaction
found rather than a false merge made.

## Where this leaves the proposal

Surviving, unbuilt:

- The card stays exactly as it is for the ordered, state-advancing spine.
- A second node kind, a **probe set** hung on a card and evaluated against that card's
  state — scoped to the card, meaning the whole path, never to the room it stands in.
  Replay the prefix once and fan, turning N x prefix into prefix + N.
- Prefix-factoring, which David already found independently: ten whole playthroughs hung
  off one card become a real tree, 19 fork points become 35.
- A `stateHash` per card as an additive field with a version bump, which is what the
  document's own closed-grammar rule prescribes (`packages/branch-tester/src/tree-document.ts`,
  `TREE_DOCUMENT_VERSION = 1`).

Withdrawn: room-scoped and subtree-scoped invariants.

Unsettled: whether the branching mechanism itself becomes the hash (tree to DAG). That
depends on a convergence number nobody has.

Caveat carried forward: this collapses duplicate work, not weak claims. A card asserting
only a room name is still weak. A state hash makes a good tripwire assertion — strongest
possible state claim, free — but it is opaque when it fails, so it belongs alongside
readable claims rather than instead of them.

## Next action

Record the hash before branching on it. The cheap first move is measurement, and it does
**not** wait on #496: the tree walker runs the whole tree through the CLI in seconds, and
the broken path is branch visits in the pane.

The run to make, with a prediction it can fail:

1. Wander without progressing the story; capture full output per room per visit.
2. Prediction: re-arrivals collapse to one observation class per room, first arrivals stand
   alone as their own class, and rooms carrying conversation are the exception.
3. From the same run, measure how much the save payload churns on a no-op turn — that says
   whether the state hash is worth anything for memoized restore.
4. Check first whether scheduler fuse and daemon tick counters are in the save payload
   (the load-bearing unknown above).

Harness constraints, so it does not cost a session: Secret Letter is an imported Chord
story, so the run goes through `./sharpee play` fed slowly rather than the bundle's
`--exec` (GH #352), and it must write nowhere near the test tree (#497).

If convergence is real, the numbers justify a tree-to-DAG change and an ADR-307 amendment.
If it is near zero, the branching idea dies cheaply and the `stateHash` field still earns
its place as a divergence localizer — re-run after a story edit and the first card whose
pre-state hash changed is where it broke, which is a better regression signal than all 720
prose claims together.

## Related

- #496 — `driveFreshBoot` fails on every branch visit; it is the same restore mechanism the
  probe fan needs, so it gates implementation but not the measurement above.
- #497 — probe runs mutate a real story's test tree.
- #499 — the per-line `intent` and prefix-factoring ruling, which this note's probe/spine
  split is a different cut at.
- ADR-307 — the tree document grammar any of this would amend.
- ADR-353 D4c — the autosave image round-trip, the existing restore door the probe fan
  would use. No new platform concept required.
