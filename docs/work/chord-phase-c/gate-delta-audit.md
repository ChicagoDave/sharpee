# Phase C P5 — Gate Delta Audit

Every intentional observable-behavior change the ownership package causes,
reconciled against the two frozen gates (Cloak 81 assertions / 9 files, Zoo
61 assertions / 7 files). Per the plan: **no frozen `.transcript` file is
edited until David signs off on that file's proposed revision individually.**
Unintentional deltas found during migration are bugs to fix, not entries
here.

Status legend: `PROPOSED` (awaiting David) · `APPROVED` · `APPLIED`.

---

## Verification method

Each entry below was verified against the actual transcript assertions and
both story forms (shipping `zoo.story` at e57c3e21, target
`packages/chord/tests/fixtures/zoo-phase-c.story`), then re-verified
empirically by running the migrated stories through the rebuilt bundle.

**Empirical results (2026-07-12, migrated stories, rebuilt bundle):**

- Cloak gate: **81/81 green, zero revisions** — the stumble migration is
  observation-identical.
- Zoo gate: **55/61** — the six failures are exactly Entry 1's six
  `out of 100` score lines (engine now prints `out of 85`; the scored
  values 0/5/15/15/20/20 all matched). timeline/state-assertions/
  hatch-text/wt-01/wt-04/wt-05 all pass unrevised — wt-04's gate-status
  sentences are byte-identical under the pure-Chord form (Entry 6 proven).
- Entry 2 confirmed live: goats bleat from turn 3 on in the Petting Zoo
  ("bleating loudly and headbutting the fence" appended to every wait).
- Entry 3 confirmed live: no departure text while the player waits in the
  Petting Zoo through closing; walking into the Main Path after hours
  shows the keeper still there and fires the farewell that same turn
  (`, once` was not consumed off-stage); the next `look` no longer lists
  him.
- Entry 4 confirmed live: `feed goats` after the turn-19 bell succeeds
  again with the full feed narration (no already-fed refusal).
- Goat + rabbit confession vignettes fire together on the closing turn
  with the player in the Petting Zoo — same-turn, witnessed, matching the
  old broadcast timing for a present player (Entry 5's equivalence claim).

New-story score arithmetic (defines sum): 5 room visits ×5 = 25, goats
fed 10 + confession 5, rabbits fed 10 + confession 5, parrot confession 5,
snake confession 5, zookeeper farewell 5, brochure read 5, map collected 5,
photo snapshot 5 → **max 85** (was 100: `pet-animal` 5 and
`collect-pressed-penny` 10 are removed; both were defined-but-never-awarded
in the shipping `.story`, so only the printed maximum changes).

---

## Entry 1 — scoring.transcript: max score 100 → 85

**Status**: APPLIED (approved by David 2026-07-12).

- **File**: `stories/friendly-zoo/tests/transcripts/scoring.transcript`
- **Assertions affected**: all six `contains "scored N out of 100"` lines.
- **Old behavior**: score reports print `out of 100` (defined-score sum
  included `pet-animal` 5 and `collect-pressed-penny` 10, neither ever
  awarded by the shipping `.story`).
- **New behavior**: prints `out of 85`. **The scored values themselves are
  unchanged** (0 / 5 / 15 / 15 / 20 / 20): the +5 steps the file observes
  come from room-visit awards and `feed` (+10), which survive 1:1 in the
  sketch; petting never awarded in the shipping `.story` form, and the
  sketch's pettable has no score either.
- **Proposed revision**: replace `out of 100` with `out of 85` on all six
  assertion lines, nothing else. Additionally (non-assertion honesty fix):
  the header description and two comments mislabel the +5 steps as
  pet awards ("pet-an-animal awards 5 once (identity dedupe)", "# First
  pet: +5", "# Petting another animal does not re-award") — they were
  already wrong against the shipping story (the +5s are the Petting
  Zoo/Aviary visit awards). Reword to describe visit awards, feed award,
  and the already-fed refusal.

## Entry 2 — timeline.transcript: goats bleat before the first feeding bell

**Status**: APPLIED (behavior + assertions approved by David 2026-07-12).

- **File**: `stories/friendly-zoo/tests/transcripts/timeline.transcript`
- **Assertions affected**: none *break* — that is the problem. Turns 3–4
  assert `contains "Time passes"` (loose), which still passes when a bleat
  line is appended.
- **Old behavior**: `restless` gated on the `feeding-time-active` flag —
  bleating impossible before the first bell at turn 11.
- **New behavior**: `states, reversible: hungry, content` starts the goats
  `hungry` (decision 5, first-declared = initial), so `restless`'s
  `on every turn while it is hungry` fires from the moment the player is in
  the Petting Zoo (turn 2 on), presence-gated per decision 10. Feeding
  flips them `content`; each feeding-time beat re-hungers them.
- **Proposed revision**: pin the new behavior positively instead of letting
  loose assertions mask it —
  - retitle the `# Turns 3-4: quiet` comment to say the goats are already
    hungry and bleating;
  - add `[OK: contains "bleating loudly and headbutting the fence"]` to the
    turn-3 and turn-4 `wait` commands;
  - keep the turn-12–14 bleat assertions exactly as they are (still true:
    goats are hungry there because this run never feeds them).
- **Sign-off asks**: (a) the behavior itself — goats audibly hungry from
  turn ~2 rather than silent until turn 11 — and (b) the added early-turn
  assertions.

## Entry 3 — keeper departure becomes witnessed-only (decision 10): coverage gap, not a break

**Status**: APPLIED (approved by David 2026-07-12).

- **File**: `stories/friendly-zoo/tests/transcripts/timeline.transcript`
  (proposed extension — see options), no existing assertion anywhere pins
  keeper departure (verified: timeline ends at turn 20 on the closed PA
  line; no other gate file reaches after-hours).
- **Old behavior**: `once after-hours` broadcast — the farewell paragraph
  printed wherever the player stood; the award was already can-see-gated.
- **New behavior**: entity daemon `on every turn while after-hours, once`
  on the zookeeper — fires only with the player present in the Main Path
  (decision 10); an unwitnessed closing leaves the clause armed (`, once`
  not consumed, no RNG drawn off-stage), so the departure fires the first
  turn the player returns to the Main Path after hours.
- **Proposed revision (Option A, recommended — keeps the gate at 7 files)**:
  extend `timeline.transcript` past turn 20, from the Petting Zoo where the
  run already sits:
  - turn 21 `wait` → `[OK: not contains "that's me done for the day"]`
    (unwitnessed: no departure text off-stage);
  - turn 22 `west` (into Main Path) → `[OK: contains "zookeeper"]` and
    `[OK: contains "that's me done for the day"]` (he is still there when
    the player arrives, and the armed clause fires that same turn — proving
    `, once` was not consumed off-stage);
  - turn 23 `look` → `[OK: not contains "zookeeper"]` (he's gone — moved
    to the Staff Parking Lot).
  Turn choreography verified empirically 2026-07-12 (see Verification
  method above).
- **Option B**: a new `keeper-departure.transcript` unit file instead
  (8th gate file; scope grows).

## Entry 4 — feeding is repeatable across bell cycles

**Status**: APPLIED (approved by David 2026-07-12).

- **File**: none currently — `scoring.transcript`'s already-fed refusal
  (feed twice between bells) survives unchanged; no file feeds after a
  subsequent bell.
- **Old behavior**: `fed: flag` one-shot — a second feeding after the
  turn-19 bell would refuse with "You've already fed them."
- **New behavior**: the turn-19 (and 27, 35) feeding-time beats
  `change the pygmy goats to hungry`, so feeding succeeds again with the
  full feed narration (the score does not re-award — identity dedupe).
- **Proposed revision**: optional pin only. If Option A in Entry 3 is
  taken, this can ride the same extension (feed goats again after the
  turn-19 bell before walking out) or be left as documented-but-unpinned.
  David's call: pin now or record as accepted coverage gap.

## Entry 5 — no-revision findings (verified file by file)

- **state-assertions.transcript**: only asserts `player.inventory` and
  "Taken" (loose). Early goat bleats append to outputs; nothing breaks. No
  revision.
- **hatch-text.transcript**: flavor cycle unchanged (`flavor`/`aside` stay
  as legitimate Sharpee-API hatches). Parrot chatter was already random
  under the old story; assertions are chatter-insensitive. No revision.
- **wt-01-smoke.transcript**: take map now awards `collected` +5 silently;
  read brochure awards as before; no score assertions in file. No revision.
- **wt-04-optional.transcript**: kept green **by construction** — the
  pure-Chord gate-status replacement (Entry 6) reproduces both exact
  sentences ("The staff gate is set into the fence." /
  "…, standing wide open.") byte-identically. No revision.
- **wt-05-choice-cycle.transcript**: flavor cycling + save/restore
  unaffected. `not contains` guards checked against parrot-chatter
  alternatives — no overlap. No revision.
- **Cloak gate (9 files, 81 assertions)**: the stumble migration
  (`when the player enters the Foyer Bar while in-darkness` → `after
  entering it while in-darkness` on the Foyer Bar, exactly the P2 fixture
  form) fires at the same observable point with the same phrase and the
  same first/third-time state changes. No observable delta expected; the
  gate re-run is the proof. No revision.
- **After-hours confession vignettes (parrot/goats/rabbits/snake)**:
  checked as the plan required — old form was already effectively
  witnessed (the `once` conditions required the player in the room), new
  entity daemons are presence-gated with the same room, text, and awards;
  goats+rabbits still fire together on the same turn (both present in the
  Petting Zoo). No gate file reaches them (timeline ends at turn 20);
  behavior-equivalent, coverage gap unchanged from before the package. No
  revision, no new coverage required by this package.

## Entry 6 — gateStatus hatch retired into pure Chord (design.md §5.6)

**Status**: not a transcript change — recorded here because it is the
mechanism that keeps wt-04 green.

- Old: `{gate-status}` marker bound via `define text gate-status from
  "./chord-extras.ts"`; the producer read `chord.flag.gate-closed` by
  string — dead key after P4 (would silently report the gate permanently
  open).
- New: the staff gate's `on examining it` emits state-conditional phrases
  via the D1 adjectives (statement `when` suffix, evaluator reads
  `OpenableTrait` live):

  ```
  on examining it
    phrase gate-look
      A sturdy metal gate with a "STAFF ONLY" sign.
    phrase gate-status-closed when it is closed
      The staff gate is set into the fence.
    phrase gate-status-open when it is open
      The staff gate is set into the fence, standing wide open.
  end on
  ```

  `gateStatus` (and its `gate-status` aliased export) is deleted from
  `chord-extras.ts`; `flavor`/`aside` remain (legitimate Sharpee-API
  hatches). No hatch module references `chord.*` keys afterward
  (migration checklist line, design.md §5.6).

---

## Sign-off record

| Entry | File | David's decision | Date |
| ----- | ---- | ---------------- | ---- |
| 1 | scoring.transcript | APPROVED (assertions + comment fix) | 2026-07-12 |
| 2 | timeline.transcript (early bleats) | APPROVED (behavior + pin) | 2026-07-12 |
| 3 | timeline.transcript extension | APPROVED — Option A | 2026-07-12 |
| 4 | recurring-feed pin | APPROVED — rides Entry 3's extension | 2026-07-12 |

**Post-application result (2026-07-12)**: Zoo gate **71/71 green** (7 files —
the original 61 assertions with the six Entry-1 revisions, plus 10 new
assertions from Entries 2-4). Cloak gate **81/81 green**, zero revisions.
Zero unresolved unintentional deltas.

**AC-6 rider (P4 status note 3, additive — a new file, not a frozen
edit)**: `ac6-trait-state.transcript` added to the Zoo suite, covering a
TRAIT-declared state transition (feedable's hungry/content) through undo
and save/restore in the CLI harness — Phase B's AC-6 files covered
occurrence counters and entity-declared states only. Final tally with it
included: Zoo **79/79 in 8 files**, Cloak **81/81**.
