# ADR-078: Magic Paper Puzzle (Thief's Painting)

## Status

Draft

## Context

Dungeo needs additional puzzles to reach the ~616 point target. This ADR proposes a new 34-point puzzle involving a hidden painting by the Thief and a lethal temple ritual.

**The Story**: The Thief is secretly an artist. He painted a masterpiece but hid it away, leaving only an empty frame on the wall in the Treasure Room. On the back of the frame, he carved a cryptic message with his knife: *"Only devotion can reveal my location."*

The puzzle requires the player to:
1. **Kill the Thief** (prerequisite - frame only appears after his death)
2. Find the empty frame in Treasure Room and read the clue on its back
3. Break the frame and take a piece (with the carved message)
4. Discover the Temple Prayer Room with its trapped basin
5. Disarm the basin (or die trying)
6. Bless the water via prayer
7. Drop the frame piece in the blessed basin
8. Interpret the hollow voice's hint to find the painting

This is a late-game puzzle combining combat, exploration, object manipulation, and survival.

## Decision

### New Room: Temple Prayer Room

**Location**: East of Temple Dead End 2 (through a narrow crack)

```
Temple Dead End 1 (E of Ancient Chasm)
    ↓ N
Temple Dead End 2 ──E──> Basin Room [NEW]
    ↓ N                    (through narrow crack)
Temple Small Cave → Rocky Shore
```

**Connection**: Temple Dead End 2 remains a dead end visually, but examining the room reveals: "A narrow crack is visible in the east wall."

- `GO EAST` from Temple Dead End 2 → Basin Room
- `GO WEST` from Basin Room → Temple Dead End 2

**Room description**: "This is clearly a room of spiritual darkness. An aura of suffering pervades the room, centered on a carved basin of gargoyles and snakes."

**Basin description**: "The basin is filled with what can only be described as a mystical fog."

**The Trap**: The basin is guarded by an angry spirit. Interacting with the basin or fog before burning incense triggers death.

**Death message**: "An angry spirit envelops the room and howls, 'Usurper! You have no rights here!'"

### Disarming the Basin

The trap must be disarmed before the basin can be used safely.

**Mechanism: Burn Incense**

The room contains (or player brings) incense. Burning it appeases the temple guardians.

**On burning incense**: "The prevailing 'evil' within the room seems to be pressed back, but not disappear."

The basin is now safe to interact with (state: disarmed).

**Incense duration**: Burns for **3 turns only**, then is consumed. Player must:
1. BURN INCENSE (turn 1)
2. PRAY (turn 2)
3. DROP FRAME PIECE IN BASIN (turn 3)

If incense burns out before completing the ritual, it's gone - **softlock potential**. This makes the puzzle **Nasty** on the Zarf scale. Player must have frame piece ready before lighting incense.

**On incense expiring**: "The incense sputters out. The evil presence returns with a vengeance."
(Basin returns to armed state)

**Incense Location**: In the maze, near the rusty knife (skeleton's possessions).

Perhaps the skeleton was a devotee who never made it to the temple, or died trying to return. The incense and rusty knife are found together - rewards maze exploration.

**Requirements**:
- Incense item
- Fire source (matches, lit lamp, or torch) to light it
- Be in the Prayer Room

**Thematic fit**:
- Incense = devotion, prayer, ritual purification
- Smoke appeases spirits/guardians
- Requires forethought (bring fire source)

### Empty Frame (Treasure Room)

An ornate but empty picture frame. **Only appears after the Thief is killed.**

The Thief was secretly protecting his artistic legacy. Upon his death, the frame appears in the Treasure Room - perhaps it was among his hidden possessions, or he had concealed it with his roguish skills.

**Appearance trigger**:
```typescript
// On Thief death event
'npc.thief.killed': (event, world) => {
  const frame = createEmptyFrame();
  world.addEntity(frame, 'treasure-room');
  // No announcement - player discovers it on next visit
}
```

**Properties**:
- Scenery (initially not takeable)
- Examinable: "An ornate gilded frame, but strangely empty. It looks like it once held a painting."
- Can be turned/flipped to see back: "Carved into the back of the frame with a knife: 'Only devotion can reveal my location.'"
- **Breakable**: Player can `BREAK FRAME` to get a piece

**Grammar**:
- `examine frame` / `look at frame`
- `turn frame` / `flip frame` / `look behind frame` → reveals clue
- `break frame` / `smash frame` / `destroy frame` → get frame piece

**After breaking**: "The frame splinters. You pick up a chunk of the gilded wood - the piece with the carved message."

### Frame Piece

A chunk of the broken frame with the Thief's carved message.

**Properties**:
- Portable item
- Examinable: "A piece of gilded frame. On the back, carved with a knife: 'Only devotion can reveal my location.'"
- Consumed when dropped in blessed water

### Thief's Canvas

The hidden treasure - a rolled up canvas painted by the Thief.

**Properties**:
- Treasure (34 points total)
- Initially doesn't exist in the world
- Spawned in Studio or Gallery by successful ritual
- **Short description**: "a rolled up canvas"
- **Examine**: "The thief apparently had a superior artistic streak, for this is one of the greatest creations in all of Zork. It is a faithful rendering of The Implementors, the mythical Gods remembered by all inhabitants."

**Lore note**: The Implementors are the mythical god-like beings who created Zork's world (a meta-reference to the MIT developers: Marc Blank, Dave Lebling, Bruce Daniels, and Tim Anderson). Even the Thief, it seems, held them in reverence.

### Mechanics

#### 1. Breaking the Frame

The frame in Treasure Room responds to BREAK/SMASH/DESTROY:

```typescript
// Frame behavior on attack/break
'action.attacking.validate': (event, world) => {
  // Allow breaking with bare hands or any weapon
  return { valid: true };
}

'action.attacking.execute': (event, world) => {
  // Destroy frame, create frame piece
  world.destroyEntity('empty-frame');
  const piece = createFramePiece();
  world.addEntity(piece, 'treasure-room');

  return [{
    type: 'game.message',
    data: {
      messageId: 'dungeo.frame.broken',
      // "The frame splinters. You pick up a chunk of the gilded wood..."
    }
  }];
}
```

#### 2. Blessing the Water

**Option A: Prayer Command**
Player must `PRAY` while in the Temple Prayer Room. This blesses the water.

**Option B: Holy Item**
Player must have/use a holy item (candles from Altar? bell?).

**Option C: Sequence**
Combination - light candles, then pray.

> **Decision needed**: Which blessing mechanic fits best with existing Dungeo lore?

#### 3. Paper + Basin Interaction

When player drops magic paper with writing into blessed basin:

```typescript
// Handler on basin detects paper drop
'container.itemAdded': (event, world) => {
  const paper = world.getEntity(event.data.itemId);
  if (!isMagicPaper(paper)) return [];

  const basinBlessed = world.getStateValue('temple-basin.blessed');
  if (!basinBlessed) {
    return [{ type: 'game.message', data: {
      messageId: 'dungeo.basin.not_blessed'
    }}];
  }

  const writtenText = paper.state?.writtenText;
  if (!writtenText) {
    return [{ type: 'game.message', data: {
      messageId: 'dungeo.basin.blank_paper'
    }}];
  }

  // Attempt to summon treasure
  return summonTreasure(writtenText, world);
}
```

#### 4. Dropping Items in Basin

After incense is lit (basin disarmed), player can interact with basin.

**Dropping wrong item**: "The angry spirit laughs, 'As we said, you have no rights here!'"
(Item is destroyed but player survives - a warning, not death)

**Dropping frame piece (success)**:
"The angry spirit becomes the ghost of the thief in adventurer robes and says, 'Well done my friend. You are nearing the end game. Look to the Gallery for your reward.'"

The frame piece is consumed, canvas spawns in Gallery, 10 points awarded.

Note: The Thief's ghost appearing in adventurer robes suggests he was once an adventurer himself - and the "end game" line is a subtle Marvel reference.

#### 5. Canvas Location

The canvas always appears in the **Gallery** (or Studio as fallback). Both are:
- Naturally lit (no lamp needed)
- Art-themed (thematically appropriate)
- Easily accessible from surface

```typescript
function spawnCanvas(world: WorldModel): void {
  const canvas = createThiefsCanvas();

  // Prefer Gallery, fall back to Studio
  const targetRoom = world.getEntity('gallery') ? 'gallery' : 'studio';
  world.addEntity(canvas, targetRoom);
}
```

#### 6. The Thief's Ghost

The ghost gives a direct hint: "Look to the Gallery for your reward."

No cryptic hollow voice needed - the Thief himself tells you where to go. This is more personal and ties back to his character.

### Scoring

| Action | Points |
|--------|--------|
| Revealing the painting (ritual success) | 10 |
| Taking the painting | 10 |
| Placing painting in trophy case | 14 |
| **Total** | **34** |

Note: The frame piece is consumed in the ritual, so the painting can only be revealed once per game.

### Hidden Max Points System

The canvas is a secret treasure that doesn't appear in the normal point total. This creates narrative mystery and rewards completionists.

**Design:**
- Max points displays as **616** until the Thief is killed
- First SCORE check after Thief's death displays: *"The death of the thief seems to alter reality in some subtle way..."*
- Max points then displays as **650** (616 + 34 for canvas)
- This message appears only once per game

**New Rank: Master of Secrets**

A special rank that can only be achieved after the Thief is killed and the canvas is obtained:

| Rank | Threshold | Condition |
|------|-----------|-----------|
| Adventurer | 200 | - |
| Master | 300 | - |
| Wizard | 400 | - |
| **Master of Secrets** | **500** | **Thief dead + canvas obtained** |
| Master Adventurer | 500 | Standard path (thief alive or no canvas) |

Players who collect the canvas achieve "Master of Secrets" at 500 points *before* reaching "Master Adventurer" through normal progression. This rewards the extra effort of the ghost ritual puzzle.

**Implementation:**
```typescript
// In DungeoScoringService
getMaxScore(): number {
  const thiefDead = this.world.getStateValue('thief.killed');
  return thiefDead ? 650 : 616;
}

getRank(): string {
  const score = this.getScore();
  const thiefDead = this.world.getStateValue('thief.killed');
  const hasCanvas = this.hasAchievement('canvas-revealed');

  // Master of Secrets: 500+ points AND thief dead AND canvas obtained
  if (score >= 500 && thiefDead && hasCanvas) {
    return 'Master of Secrets';
  }
  // Fall through to normal rank calculation
  return super.getRank();
}
```

## Implementation

### Phase 1: Infrastructure

1. Add Temple Prayer Room to temple region (N of Temple Small Cave)
2. Add empty frame to Treasure Room (scenery, with flip/turn handler)
3. Add breakable behavior to frame → creates frame piece
4. Add basin object with armed/disarmed/blessed states
5. Create thief's painting entity template (spawned by ritual)

### Phase 2: Basin Trap & Disarming

6. Create incense object (location TBD)
7. Implement death handler for armed basin (drop anything, pray, touch water)
8. Implement BURN INCENSE to disarm basin
9. State tracking: armed → disarmed → blessed
10. Warning messages when examining basin/carvings

### Phase 3: Blessing & Ritual

11. Implement PRAY action (or extend existing)
12. Basin blessing triggered by prayer (only when disarmed!)
13. Implement basin drop handler (detects frame piece + blessed water)
14. Spawn canvas in Gallery
15. Hollow voice message

### Phase 4: Scoring & Polish

16. Wire up 10 pts for ritual, 10 pts for taking, 14 pts for trophy case
17. Transcript tests for full puzzle flow (including death cases)
18. Edge cases (already revealed, armed basin, unblessed basin)
19. Messages in lang-en-us

## Open Questions

None - all major design decisions resolved.

## Resolved

- **Treasure**: "a rolled up canvas" - portrait of the Implementors
- **Location**: Always Gallery (or Studio fallback) - lit, art-themed
- **Lethality**: Yes - improper use of basin kills the player
- **Key item**: Frame piece (break the frame), not magic paper
- **No WRITE action needed**: Frame itself carries the message
- **Gate**: Frame only appears after Thief is killed (late-game puzzle)
- **Disarm**: Burn incense (requires fire source)
- **Incense location**: Maze, with skeleton/rusty knife
- **Warning**: Room description ("spiritual darkness", "aura of suffering") warns player
- **Hint**: Thief's ghost gives direct hint to Gallery (not cryptic hollow voice)
- **Connection**: Temple Dead End 2 E→Basin Room (narrow crack in wall), Basin Room W→Dead End 2
- **Incense duration**: 3 turns only - softlock if wasted
- **Zarf rating**: Nasty (can softlock without immediate warning)

## Consequences

### Positive

- Adds original puzzle content unique to Dungeo (not from mainframe Zork)
- Deepens Thief characterization (he's an artist, not just a villain)
- Multi-step puzzle rewards exploration and deduction
- Empty frame + knife message creates mystery and anticipation
- "Hollow voice" callback maintains Zork's temple atmosphere
- **Lethal trap adds real stakes** - classic Zork difficulty
- Rewards careful players who read descriptions and examine things
- Simpler than WRITE mechanic - just break frame and use the piece

### Negative

- Adds complexity (PRAY action, trap states, disarm mechanic)
- Random room placement means hint interpretation is crucial
- Player might never find the frame or think to break it
- Death trap could frustrate modern players (but that's Zork!)

### Risks

- Save/restore with dynamically spawned painting
- Trap must have fair warning - carvings should hint at danger
- Breaking frame is destructive - player can't undo it

## Alternatives Considered

### A: Fixed Painting Location
Painting always appears in same room. Simpler, but loses the hollow voice mystery.

### B: Painting Already in World (Hidden)
Thief hid it somewhere specific. Loses the ritual mechanic and temple connection.

### C: Frame Contains Invisible Painting
Revealed by magic words. Simpler but less interesting than the basin ritual.

## References

- ADR-076: Scoring System (treasure points)
- ADR-071: Daemons and Fuses (could use for delayed appearance)
- Zork temple area atmosphere and "hollow voice" messages
- Frobozz Magic brand theming (Paper Company joins Lantern, Boat, etc.)
- Thief NPC characterization (adding artistic depth)
