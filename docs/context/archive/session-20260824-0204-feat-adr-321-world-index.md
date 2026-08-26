# Session Summary: 2026-08-24 - feat/adr-321-world-index

## Goals
- Continue Phase 6 (Chapter 1 vertical slice, `branch-stories/secret-letter/`) past the
  8d076393 finalize: build the two-turn slide, the monkey/necklace chain, the satchel,
  and the boots per the change document's same-day rulings.
- Fold David's 2026-08-24 clothing ruling ("all clothing is scenery") back into the
  cap/cloak/boots content already built.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — "Port I7 Secret Letter to Chord."
- **Phase executed**: Phase 6 — "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (Large, 400-call budget). No phase transition this session — Phase 6 remains CURRENT; this is one more content increment within it (six increments total across yesterday evening and today, all appended to Phase 6's Progress log in `plan.md`).
- **Tool calls used**: Not tracked — `.session-state-5ec4d0.json` was retired by yesterday's finalize and this session has no state file.
- **Phase outcome**: Ran under the phase's overall budget; work continues next session (David's placeholders, TE20, and GH #311/#313/#314 gate the remainder).

## Completed

### 1. Two-turn slide (`branch-stories/secret-letter/aerial-runway.chord`, new, imported from `grubbers-market.chord`)
Cables at the Top of the Post (`slideable` trait, cloak-required with Gentry's barehanded
refusal), `define action sliding`, the mid-slide **On the Wire** room, a one-turn ride-out
clock whose expiry runs Gentry's landing block into the Fruit Stall, and `let go`
(entity-less) into the new **Behind Fruit Stall** room (its only entrance). Four
PLACEHOLDER texts are David's lines: the mid-slide reveal, the let-go drop, Behind Fruit
Stall's description, and the let-go-elsewhere refusal. Deferred to the chase + dress
increment: ride-out capture, the change/return windows, the other three cables,
`hang <garment> on cable`. Three tree branches at the Top of the Post card with `states:`
mutation assertions (let-go path, ride-out path, barehanded gate + re-slide).

### 2. Monkey + necklace (`branch-stories/secret-letter/monkey.chord`, new, imported after the runway)
The gems-stall commotion armed at `hunted` (not the literal chase state — flagged as an
interpretive reading for David: the change document's "start of the chase" wording
predates the same-day three-state split, and arming at TE20 would deadlock the chain that
produces TE20), staged at the Exotic Gems Stall. Monkey texture on the post (idle pools,
guard arms, refusals). Banana placed on display with a quiet-lift placeholder. Chain runs
end to end at seed 1209: bite → `hunted` → first stall visit → commotion → `give banana to
monkey` → necklace in inventory. **GH #313 filed**: NPC-carried items are wholly out of
player scope — necklace guards and the mercenaries' sword refusal are authored but
unreachable. Held: flee/return beat, monkey gibberish tree, kiss verb. Tree branch 7 pins
the chain with `states:` assertions.

### 3. Satchel (`branch-stories/secret-letter/secret-letter.story`)
`create the cloth satchel`, Gentry's description, carried from the first turn, plain open
container (the source's lid + auto-open conveniences net out to never-in-the-way). Held:
the "stuff into satchel" insert line (no marker surfaces the inserted item's name from an
entity clause). **GH #314 filed**: bare `take X from Y` has no grammar shape (the manifest's
only take-from shape requires a tool) and `remove <wearable> from <container>` leaves the
item worn — both land squarely on the change-behind-the-stall sequence. New tree branch
pins put/take with `states:` (the buggy remove-from path deliberately left unpinned).

### 4. Boots (`branch-stories/secret-letter/secret-letter.story`)
Worn from the first turn per the change document's escape-disguise consequence, after
running an ordered check confirming the 2009 source has no footwear object. Description is
a PLACEHOLDER (remake addition, no source text). Pinned in the satchel tree branch.

### 5. Clothing ruling and rework (David, 2026-08-24, recorded verbatim in the change document, "Clothing is the look, not objects")
David: "all clothing is scenery and not directly removable.. we use CHANGE OUTFIT or SWITCH
HATS or WEAR DRESS and the player's look changes with those actions." Reworked cap/cloak/
boots to match: a single `clothing-stays` refusal PLACEHOLDER on taking and taking-off,
with the cloak's take-refusal worn-gated (post-slide it lies at the landing and must stay
retrievable). The cap's wired wear/take-off reactions were removed; Gentry's two lines
(`story.ni:1402`/`:1414`) are kept aside in a comment as SWITCH HATS candidates. Tree
branches re-derived in step: the barehanded slide gate now earns its state by riding out
and re-climbing without the cloak (rather than by taking the cloak off); the satchel and
kick-texture branches pin the clothing refusals instead of cap manipulation; banana in/out
of the satchel covers the container path.

### Change document — other 2026-08-23 evening rulings recorded (conversation, not build)
Also folded into `change-document.md` this session's source material: the two-turn slide
design itself (turn one ends mid-air revealing the Behind Fruit Stall option; not letting
go completes the slide on turn two into the source's unchanged knock-over ending, caught,
escape forfeited), the Behind Fruit Stall geography and the concrete one-turn change / one-
turn return window, and both timing rulings — identification fires at the Fruit Stall one
turn after the return, and a second turn behind the stall moves the mercenaries to the
Fruit Stall so stepping out is an immediate catch (build reading pending confirmation:
"caught" maps to the standing grab posture, break-free still possible, not a bespoke hard
ending).

### Tests
`./sharpee test branch-stories/secret-letter` run after every increment; re-run fresh for
this summary (2026-08-24): **155 cards passing, 198 assertions passing** (666 commands, 154
authored + 512 replayed) — up from 102 cards / 118 assertions at yesterday's 8d076393
commit. No `packages/` code touched this session; no platform tests affected.

## Key Decisions
- **Monkey commotion arms at `hunted`, not literal chase state** — flagged, not finalized;
  TE20-arming would deadlock the chain that produces TE20 (see #313 area, `monkey.chord`
  header).
- **Clothing is scenery, not inventory (David, 2026-08-24)** — cap/cloak/boots refuse direct
  take/wear/take-off; CHANGE OUTFIT / SWITCH HATS / WEAR DRESS (arriving with the escape
  build) are the only way the look changes. Recorded verbatim in the change document.
- **"Caught" build reading proposed, not confirmed** — mapped to the standing grab posture
  (capture clock running, break-free possible) rather than a bespoke hard ending; needs
  David's confirmation before the escape sequence is built.

## Next Phase
Phase 6 stays CURRENT — no phase transition this session. The buildable-without-content
queue is empty as of the fifth increment (boots survey): remaining Phase 6 work now waits
on David's lines (PLACEHOLDER texts, TE20), his rulings (monkey arming, gates, the
caught-mapping confirm), or platform fixes (#311 noisy theft, #313 NPC-carried items, #314
take-from grammar). No PENDING phase advances until Phase 6 exits.

## Open Items

### Short Term
- ~Eight PLACEHOLDER texts are David's lines, on hold (he is remote): mid-slide reveal,
  let-go drop, Behind Fruit Stall description, let-go-elsewhere refusal, banana lift,
  necklace wear-refusal, `clothing-stays` refusal, boots description.
- Rulings pending David's confirmation: monkey-arming reading (`hunted` vs. literal chase),
  market gates (open-gate behavior, conditional description, locked-refusal texts), the
  "caught" = standing-grab-posture mapping, and the mid-slide let-go shape's build reading.
- GH #311 (noisy theft / random-adjacent-room move) — blocked on David's platform decision,
  gates the Commerce Street east exit.
- GH #313 (NPC-carried items out of player scope) and #314 (bare take-from grammar;
  remove-from-container leaves item worn) — both gate the change-behind-the-stall sequence.

### Long Term
- TE20 rewrite is the next big content step once the above clear.
- Standing item from session 55eedf: should topic ASKS share the wary-stallkeeper gate?

## Files Modified
- `branch-stories/secret-letter/aerial-runway.chord` (new) — two-turn slide, On the Wire,
  Behind Fruit Stall, `let go`.
- `branch-stories/secret-letter/monkey.chord` (new) — commotion, monkey texture, banana,
  necklace trade.
- `branch-stories/secret-letter/secret-letter.story` — satchel, boots, cap wear/take-off
  reactions removed, `clothing-stays` refusal added to cap/cloak/boots.
- `branch-stories/secret-letter/grubbers-market.chord` — imports for the new files.
- `branch-stories/secret-letter/secret-letter.tests.json` — tree branches for all five
  increments (append-only, 455 insertions).
- `docs/work/secret-letter-port/change-document.md` — clothing ruling, slide/timing
  amendments recorded verbatim.
- `docs/work/secret-letter-port/plan.md` — Phase 6 Progress log entries for all six
  increments (second/third from 2026-08-23, fourth–sixth from 2026-08-24).

## Notes
- Session picks up directly from `docs/context/session-20260823-1842-...md`'s progressive
  updates ("post-commit increment" onward) — that file's tail is the primary record of this
  work's narrative; this summary consolidates it for a fresh session start.
- All work is story-level (`branch-stories/secret-letter/`) plus documentation; no
  `packages/` code changed, consistent with rule "Platform changes require discussion
  first" — none was needed.
- Session duration: ~7 hours across the 2026-08-23 evening increments and the 2026-08-24
  morning increments (per the progressive-update timestamps in the prior session file and
  the plan.md progress log).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Rollback Safety**: safe to revert — story-only changes (`branch-stories/secret-letter/`)
  plus documentation; no `packages/` code touched. Tree branches for all five increments
  must revert with the story files (they pin the new behaviors).

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4 (change document) covers Chapter 1 through today's
  amendments; Phase 5 (Vedd-foreshadow, seeded) settled and not implicated this session;
  ADR-325 platform primitives (#305–#310) already landed per prior sessions.
- **Prerequisites discovered**: none new — the gaps found this session (#312, #313, #314)
  are platform-seam filings, not blockers to the increments they were found in.

## Architectural Decisions

- None this session. No ADR written or amended (ADR-325 was amended in the prior,
  8d076393-committed session, not this one).

## Mutation Audit

- Files with state-changing logic modified: `aerial-runway.chord` (slide/let-go actions,
  region landing, clock expiry), `monkey.chord` (commotion arming, banana/necklace trade),
  `secret-letter.story` (satchel container, clothing refusal reactions).
- Tests verify actual state mutations (not just events): YES (evidence: `./sharpee test
  branch-stories/secret-letter` — 155 cards passing, 198 assertions passing, run
  2026-08-24 for this summary, after the session's last edit; tree branches use `states:`
  assertions on room/entity state, not event-presence checks, per the pattern established
  in the prior session's branches 5–7).

## Recurrence Check

- Similar to past issue? NO — no new recurring pattern surfaced this session. (The `##`-
  comment-in-create-block parse gate recurrence was noted in the prior session file, not
  this one.)

## Test Coverage Delta

- Tests added: 5 new tree branches (slide × 3, monkey chain × 1, satchel/boots/clothing
  rework × 1, reworked in place for the clothing ruling).
- Tests passing before: 155/198 was reached progressively across the session; the
  session-start baseline (yesterday's 8d076393 commit) was 102 cards / 118 assertions →
  155 cards / 198 assertions now (evidence: `./sharpee test branch-stories/secret-letter`,
  run 2026-08-24, fresh after all edits — 666 commands, 154 authored + 512 replayed).
- Known untested areas: the buggy `remove <wearable> from <container>` path (deliberately
  left unpinned pending #314); ride-out capture, change/return windows, and the other three
  cables (deferred content, not yet built).

---

**Progressive update**: Session completed 2026-08-24 02:04
