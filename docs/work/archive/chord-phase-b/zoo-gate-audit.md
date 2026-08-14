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

## Addendum — chained walkthrough conversion (David-directed, 2026-07-12)

David: "Chained walkthrough testing is required." The wt corpus was
reworked into ONE sequential full playthrough (docs/work/zoo-chain/):

- `walkthroughs/wt-01…wt-05` are now chapters of a single chained run
  (arrival → aviary/gift shop w/ the parrot save-restore cycle →
  petting zoo at closing → keeper farewell/staff area → after-hours
  confessions), ending in the story's first-ever **perfect score
  85/85** — reachable only after the F1 platform fixes (taking
  interceptor postExecute/postReport; dispatch-action bodies + musts).
  Old wt-01-smoke / wt-04-optional / wt-05-choice-cycle are ABSORBED
  (their assertions live on inside the chapters).
- The two frozen EXCLUDED files (wt-02-slot-occupants, wt-03-slot-detail
  — the table above) moved byte-identical to `walkthroughs/excluded/`;
  still frozen, still awaiting the snippets/slot-contributor surfaces.
- **Zoo gate as of 2026-07-12**: 5 atomic files (hatch-text / scoring /
  state-assertions / timeline / ac6-trait-state, run per-file) PLUS the
  chained walkthrough (`--test --chain walkthroughs/wt-*.transcript`,
  37 assertions; the excluded/ subdir is outside the glob). Both green.
- Timeline note for future chapters: a `$restore` rewinds world state
  (sequence pointers, textState) but the ENGINE turn keeps counting, so
  turn-timed broadcasts land one command earlier after a save/restore
  pair — pinned empirically in wt-02/wt-03.
