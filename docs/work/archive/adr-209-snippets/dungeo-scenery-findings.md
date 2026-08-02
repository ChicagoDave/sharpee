# Dungeo Unmentioned-Scenery Findings (ADR-209 Phase 5)

**Date**: 2026-07-07 · **Method**: programmatic audit over the live world
(bootstrap `loadStory` → every room → scenery contents whose name/alias/head-noun
never appears in the room's `description`/`initialDescription` prose), cross-mapped
against the 13 unit-transcript assertions failing on HEAD since `8c5ddc30`
(2026-07-04, book-QA P2: scenery excluded from "You can see …" lists).

The original 81-finding audit is lost; this regenerates its intent against the
current tree. 175 rooms scanned, **24 mechanical findings**; the subset below is
prioritized by what fixes failing tests (P1), then by player-facing value (P2).

Marker syntax per ADR-209: `{snippet:name}` in the room description;
entries in `RoomTrait.snippets` (direct-trait construction — all these rooms
build traits directly). `mentions: <entityId>` gates the mention on the
entity's transitive presence in the room.

## P1 — fixes a failing unit transcript (11 findings, 9 rooms)

| # | Room | Entity | Failing transcript(s) | Proposed marker | Candidate snippet text | `mentions` gate? |
|---|------|--------|----------------------|-----------------|------------------------|------------------|
| 1 | West of House (`r01`) | small mailbox (`c01`) | implicit-take-test, navigation | `mailbox` | ` There is a small mailbox here.` | No — anchored scenery, never leaves. (Optional: add for lint coverage metadata.) |
| 2 | Living Room (`r06`) | trophy case (`c04`) | house-interior, trophy-case-scoring | `trophycase` | ` A trophy case takes up one corner of the room.` | No — fixed. |
| 3 | Living Room (`r06`) | large oriental rug (`y09`) | rug-trapdoor | `rug` | ` A large oriental rug lies in the center of the room.` | No gate; **handler mutation** on `if.event.pushed` (rug moved aside) → `', moved to one side of the room to reveal the dusty cover of a closed trap door'`-style aftermath text (Q7 pattern; set entry, never delete). |
| 4 | Tiny Room (`r0q`) | small door (`d01`) | tiny-room-puzzle | `door` | ` A small door is set in the wall.` | No — a door. |
| 5 | Flood Control Dam #3 (`r0x`) | bolt (`y0m`) | dam-puzzle | `bolt` | ` On the top of the dam sits a control booth; a large metal bolt is mounted on a panel there.` (wording to match existing prose flow) | No. |
| 6 | Maintenance Room (`r0z`) | control panel (`i0m`) + blue/yellow/brown/red buttons (`y0l`,`y0i`,`y0j`,`y0k`) | dam-puzzle ("panel"), flooding ("control panel", "blue button") | `panel` | ` On one wall is a control panel with four colored buttons: blue, yellow, brown, and red.` — one snippet covers panel + all four buttons (audit findings 8–11 collapse into this). | No. |
| 7 | Dingy Closet (`r38`) | metal cage (`i24`) | cage-puzzle | `cage` | ` A strange metal cage hangs above the center of the room.` | Yes — `mentions: <cage id>`; the cage-fall puzzle relocates/replaces it, and the mention should track presence. Verify at implementation which entity actually moves. |
| 8 | Aragain Falls (`r3o`) | rainbow (`i2c`) | wave-rainbow | `rainbow` | ` A beautiful rainbow can be seen over the falls and to the west.` | Yes — `mentions: <rainbow id>` if the wave puzzle toggles the entity's presence; if it only toggles state (solid vs not), use handler mutation for the solid wording instead. Verify at implementation. |
| 9 | Treasure Room / thief's lair | empty frame (dynamic) | frame-after-thief | `frame` | ` An empty frame hangs on the wall.` | **Neither** static form works: the frame entity is created at runtime by `melee-interceptor.ts` when the thief dies, so its id doesn't exist at init. Use the Q7 handler pattern: room ships `frame: ''` and the thief-death handler sets `snippets.frame = ' An empty frame hangs on the wall.'` (and later mutations if the frame is broken/taken — or create the frame at init instead and gate with `mentions`; implementer's choice). |

### P1 non-snippet fixes (prose already covers the entity)

| Room | Assertion | Recommendation |
|------|-----------|----------------|
| Inside Mirror (endgame) | endgame-mirror: `contains "short pole"`, `contains "mahogany panel"` | The room's (faithful Zork) prose already describes both: "Through each hole runs a wooden pole" and "The left panel is mahogany". **Retarget the transcript assertions** (e.g. `contains "mahogany"`, `contains "pole"`) — adding snippets would duplicate prose. |

### Not a scenery finding

- `troll-interactions` `drop sword → "Dropped"` failure: combat-RNG flake
  (one-good-run class), not part of this defect class. Appeared in one run of
  the suite, absent in others.

## P2 — audit findings with no failing test (candidates, implement opportunistically)

| Room | Entity | Note |
|------|--------|------|
| Attic (`r07`) | table (`y0b`) | ` A large table occupies the middle of the room.` |
| Dam Base (`r0y`) | Frigid River (`i0u`) | River prose likely intentional omission — the room name/desc context implies it. Skip unless play-testing says otherwise. |
| Grail Room (`r21`) | stone pedestal (`y0o`) | ` A stone pedestal stands at the center.` — grail sits on it; consider `{contents}`-adjacent wording carefully. |
| Glacier Room (`r2d`) | glacier (`y0q`) | Glacier melts (thrown torch) — `mentions` gate if the entity is destroyed, else handler mutation. |
| Wide Ledge (`r2i`) / Narrow Ledge (`r2j`) | hook (`y0u`/`y0t`) | ` A small hook is fixed to the wall.` |
| Dusty Room (`r2k`) | safe (`i19`), hole (`y0r`) | One snippet can cover both: ` Set in one wall is a rusty old box, and near it a small hole.` (wording from original). Safe gets blown open — handler mutation for aftermath. |
| Vault (`r2y`) / Small Room (`r30`) | north wall (`y0y`) / south wall (`y0z`) | Walls-as-scenery; prose already implies walls. Likely intentional omissions — skip. |
| Viewing Room (`r2z`) | velvet curtain (`i1m`) | ` A shimmering curtain of velvet hangs across one wall.` |
| Maze (`r3w`) | skeleton (`y10`) | ` A skeleton, probably the remains of a luckless adventurer, lies here.` (classic line) |

## Scope guards (per ADR-209 non-goals)

- No predicate functions anywhere; all state-dependence beyond presence is
  handler-driven map mutation (`snippets.x = '…'`, set to `''` rather than
  delete so load-time validation stays meaningful).
- Rooms not listed keep their prose untouched; the audit's "unmentioned" is
  not automatically "wrong" — Dam Base river and the two walls are judged
  intentional and skipped.
- `switching_on` auto-look still lists ALL contents including scenery (it
  doesn't apply the 8c5ddc30 scenery filter) — observed during Phase 3
  testing. Once P1 snippets land, that block will double-mention scenery
  (prose + list) on light-reveal. Worth aligning the auto-look block with
  looking's scenery exclusion at that point (platform change; needs its own
  nod).

## Phase 6 regression bar (from the session log)

- HEAD baseline is **13 red assertions / 12 transcripts** (scenery class) —
  NOT deterministically green. Exit: the P1 rooms' transcripts go green via
  snippets (or retargeted assertions where prose already covers), no new
  failures elsewhere, walkthrough chain passes under one-good-run.
