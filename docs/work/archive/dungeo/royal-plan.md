# Royal Puzzle Fix Plan

## Context

Previous session research (session-20260217-0030-main.md) compared our royal puzzle implementation against the MDL source (`dung.mud`, `act3.199`) and found the card detection logic is fundamentally wrong. Our code checks adjacency to a `-3` grid cell at position 33 (which we misnamed `CARD_BLOCK`). MDL places the card entity at `CPOBJS[37]` (1-based = position 36, 0-based) and makes it available when the player **stands at** that position, not when adjacent to position 33. The `-3` value is actually "bad ladder" (a wall type that can be pushed but not successfully climbed).

The walkthrough (wt-14) also uses GDT cheating (`pz exit`) to skip the full solution. Walkthroughs should use the real puzzle solution.

## Steps

### Step 1: Fix constants in `royal-puzzle.ts`

- Rename `CARD_BLOCK = -3` to `BAD_LADDER = -3`
- Add `CARD_POSITION = 36` constant (0-based index where card appears per MDL `CPOBJS[37]`)
- Update the grid comment on row 4 from "card block at 33" to "bad ladder at 33, sandstone at 36"

### Step 2: Fix card detection in `royal-puzzle.ts`

- **Rename** `isAdjacentToCard()` → `isAtCardPosition()`: simply return `!state.cardTaken && state.playerPos === CARD_POSITION`
- **Simplify** `takeCard()`: just `state.cardTaken = true` — no grid modification needed (the `-3` bad ladder is unrelated to the card)
- **Update** `getPuzzleDescription()`:
  - Replace adjacency-based card description with position-based
  - At position 36: "The center of the floor here is noticeably depressed." (matches MDL CPWHERE)
  - If card not taken AND at position 36: "Nestled in the depression is an engraved gold card."
- **Export** `BAD_LADDER` and `CARD_POSITION` (for GDT command)

### Step 3: Fix puzzle handler in `puzzle-handler.ts`

- Update import: `isAtCardPosition` instead of `isAdjacentToCard`
- Update `handleTakeCard()`: use `isAtCardPosition(state)` instead of `isAdjacentToCard(state)`
- Update command transformer: use `isAtCardPosition(state)` for TAKE CARD gate

### Step 4: Update action comments

- `puzzle-take-card-action.ts`: Update comment from "adjacent" to "at card position"
- `puzzle-take-card-blocked-action.ts`: Update message text — player isn't close enough (not about "reaching" a wall)

### Step 5: Update GDT `pz.ts`

- Import `BAD_LADDER` instead of `CARD_BLOCK` (or use literal `-3`)
- Update `displayState()`: change `case -3: char = 'C'` label — maybe `'B'` for Bad ladder, or keep `'C'` but update comment
- Update `CARD` subcommand: just set `cardTaken = true` without grid modification

### Step 6: Update messages in `puzzle-messages.ts`

- `TAKE_CARD` message: "Taken." (matches MDL's terse style for taking objects) or keep current message but change "wall" to "depression in the floor"

### Step 7: Rewrite `wt-14-royal-puzzle.transcript`

Replace the current walkthrough with the canonical solution path. The solution navigates:
1. Entry at position 9
2. Navigate to position 36 via pushes (verified path: push east wall, south, southwest, push south wall, east, east, push south wall, north, north, east, push south wall → at position 36)
3. Take card
4. Navigate back repositioning ladder to position 10 via ~36 more push/move commands
5. Exit UP from position 9

The full path needs to be verified by stepping through each move against the grid. I'll use `--play` mode to validate the path interactively, then write the transcript.

Remove all GDT commands (`gdt`, `pz exit`, `ex`) from the walkthrough.

### Step 8: Build and test

1. `./build.sh -s dungeo`
2. `node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-14-royal-puzzle.transcript`
3. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`

## Files Modified

| File | Change |
|------|--------|
| `stories/dungeo/src/regions/royal-puzzle.ts` | Constants, detection functions, description |
| `stories/dungeo/src/handlers/royal-puzzle/puzzle-handler.ts` | Imports, handler, transformer |
| `stories/dungeo/src/actions/puzzle-take-card/puzzle-take-card-action.ts` | Comment only |
| `stories/dungeo/src/actions/puzzle-take-card-blocked/puzzle-take-card-blocked-action.ts` | Message text |
| `stories/dungeo/src/actions/gdt/commands/pz.ts` | BAD_LADDER rename, no grid modification |
| `stories/dungeo/src/messages/puzzle-messages.ts` | TAKE_CARD message wording |
| `stories/dungeo/walkthroughs/wt-14-royal-puzzle.transcript` | Full rewrite with canonical solution |

## Not in this plan (future work)

- **CPOBJS dual-array**: MDL tracks per-position objects — we use simplified position check
- **Second exit**: Slot at position 51, steel door, card insertion (CPSLT/CPDOR)
- **Side Room**: CPOUT room with conditional east exit
- **Bad ladder climbing**: Position 33 should give "hit your head" message on CLIMB
- **Thief movement**: Change from random wandering to fixed room-list cycling

## Verification

1. Build: `./build.sh -s dungeo`
2. Interactive validation: `node dist/cli/sharpee.js --play` — navigate through puzzle manually
3. Single walkthrough: `node dist/cli/sharpee.js --test stories/dungeo/walkthroughs/wt-14-royal-puzzle.transcript`
4. Full chain: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
