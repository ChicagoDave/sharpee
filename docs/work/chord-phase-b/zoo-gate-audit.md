# Zoo Golden-Gate Audit — AC-2 Category Coverage (Phase 1)

Audit of `stories/friendly-zoo/tests/transcripts/` (3 files) +
`walkthroughs/` (5 files) against the six AC-2 categories, 2026-07-11.
The underlying SYSTEMS all exist in `src/` (events.ts: PA daemon,
feeding-time fuse, goat-bleating daemon, victory daemon, after-hours
daemons; scoring.ts; characters.ts parrot swap; dynamic-text.ts producers)
— the question is what the TRANSCRIPTS exercise.

| AC-2 category | Covered by existing suite? | Where |
|---|---|---|
| Custom actions (pet/feed) | ✓ | pet in 5 files; feed in wt-01, state-assertions |
| Capability dispatch | ✓ (implicitly, via pet/feed) | same files |
| NPC behaviors (parrot chatty swap) | ~partial | wt-05 (choice-cycle phrases); no after-hours candid swap |
| Scheduler (PA sequence, feeding time, goat bleating) | **✗ none** | no transcript waits through the timeline |
| Scoring | **✗ none** | no transcript asserts score |
| Hatch (`define text`) | **✗ none** (expected) | dynamic-text producers never asserted as hatch output |

## Consequence for the frozen gate (strategy: freeze existing + augment)

The "one hatch transcript" augmentation is not enough — three categories are
untested. Augmentation set before freezing:

1. **`timeline.transcript`** — waits through the PA closing sequence
   (closing-3/-2/-1/closed), feeding time + goat bleating, and the
   after-hours transition (zookeeper leaves; parrot goes candid). Covers
   scheduler + the NPC swap in one file.
2. **`scoring.transcript`** — room-visit and pet/feed awards, `score`
   command assertions, award-once semantics.
3. **`hatch-text.transcript`** — asserts output that can only come from a
   `dynamic-text.ts` producer (the `define text ... from` hatch in
   zoo.story).

Existing 8 transcripts + these 3 = the frozen AC-2 gate (David-approved
strategy, adapted per this audit; authored against the TS story first so
they are behavior-parity proofs, Phase A precedent).

**Status 2026-07-11 (Phase 7): AUGMENTATION AUTHORED AND VERIFIED.** The
three transcripts exist (timeline / scoring / hatch-text — named exactly
that) and pass against the TS story along with the existing suite: 53
assertions across the 6 tests/transcripts files + 34 across the 5
walkthroughs (walkthroughs run UNCHAINED — they are standalone probes).
Total gate corpus: 87 assertions, 11 files. Notes discovered while
authoring: feeding-time fuse fires at turn 11 then every 8 (19, 27, …);
goat bleats render on the three turns after feeding time only inside the
Petting Zoo; entering the Aviary awards VISIT_AVIARY (+5) — the scoring
transcript encodes it; parrot examination cycles three flavor lines
deterministically (the Choice producer the hatch transcript pins).
Frozen as of this note — fixed until green against zoo.story, never
edited to make it pass.

## Gate scope decision — 4 files excluded (David-approved, 2026-07-11)

Running the frozen corpus against zoo.story left 9 failing assertions,
all confined to 4 files, and every one traces to a host-shell
phrase-algebra feature the Chord language does not yet expose (not to a
Chord runtime defect):

| Excluded file | Failing assertions | Missing Chord surface |
|---|---|---|
| `tests/transcripts/entrance-initial-description.transcript` | 1 | `initialDescription` (first-look vs revisit text) |
| `tests/transcripts/room-snippets.transcript` | 3 | ADR-209 room description snippets |
| `walkthroughs/wt-02-slot-occupants.transcript` | 3 | ADR-195 slot contributors (occupant lines in room description) |
| `walkthroughs/wt-03-slot-detail.transcript` | 2 | ADR-195 slot contributors (detail variants) |

Decision: exclude these 4 files from the Chord AC-2 gate and carry the
three missing surfaces (initialDescription, snippets, slot contributors)
as **Phase C grammar backlog**. The files themselves stay frozen and in
the repo — they rejoin the gate the moment the grammar grows the feature.

**Chord AC-2 gate as shipped: 7 files, 61 assertions, 61 passing**
(hatch-text / scoring / state-assertions / timeline + wt-01 / wt-04 /
wt-05). The 4 excluded files carry the corpus's other 26 assertions —
17 of those pass too; the 9 failures above are the corpus's only
failures.
