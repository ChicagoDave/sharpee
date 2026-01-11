# Scope Scenarios for Parser Validation

These scenarios test the visibility/reachability distinction to ensure the parser handles all cases correctly.

## Scope Matrix

|                   | Visible                    | Not Visible                 |
| ----------------- | -------------------------- | --------------------------- |
| **Reachable**     | Normal case                | Dark room, closed container |
| **Not Reachable** | Across chasm, behind glass | Doesn't exist in scope      |

---

## Scenario 1: Soccer Ball Across the Pitch

**Setup**: Player is at one end of a soccer pitch. Ball is at the far end.

**State**:

- Ball is VISIBLE (can see it across the field)
- Ball is NOT REACHABLE (too far away)

**Commands & Expected Responses**:

```
> look at ball
You see a soccer ball at the far end of the pitch.

> take ball
The ball is too far away to reach.

> kick ball
The ball is too far away to kick.
```

**Parser Behavior**:

1. "look at ball" - EXAMINE requires VISIBLE scope → succeeds
2. "take ball" - TAKE requires REACHABLE scope → finds ball (visible) but fails reachability check
3. "kick ball" - KICK requires REACHABLE scope → same failure

---

## Scenario 2: Kitten in Closed Box

**Setup**: Player is next to a closed cardboard box. A kitten is inside.

**State**:

- Kitten is NOT VISIBLE (box is opaque and closed)
- Kitten is REACHABLE (can reach into box blindly)

**Commands & Expected Responses**:

```
> look in box
The box is closed.

> open box
You open the cardboard box, revealing a kitten inside.

> pet kitten
(before opening) You can't see any kitten here.
(after opening) You pet the kitten. It purrs contentedly.

> feel around in box
(before opening) You feel something soft and furry moving inside the box.
```

**Parser Behavior**:

1. Before opening: kitten not in visible scope, most commands fail
2. "feel around" - special action that uses REACHABLE without VISIBLE
3. After opening: kitten becomes visible, normal commands work

**Design Question**: How do we handle "feel" or "fumble" actions that work on reachable-but-not-visible entities?

'if.events.felt' + data + message

---

## Scenario 3: Key in Locked Glass Display Case

**Setup**: Museum room with a glass display case containing an antique key.

**State**:

- Key is VISIBLE (glass is transparent)
- Key is NOT REACHABLE (case is locked)

**Commands & Expected Responses**:

```
> examine key
An ornate brass key, probably centuries old.

> take key
The key is inside the locked display case.

> break case
You smash the glass! Alarms blare. The key is now reachable.

> unlock case with lockpick
You carefully pick the lock. The case swings open.
```

**Parser Behavior**:

1. EXAMINE works (visible)
2. TAKE fails with contextual message about the barrier
3. Breaking/unlocking changes reachability state

---

## Scenario 4: Rope in Dark Cellar

**Setup**: Player is in a pitch-dark cellar. A rope hangs from the ceiling.

**State**:

- Rope is NOT VISIBLE (no light)
- Rope is REACHABLE (it's right there, player just can't see)

**Commands & Expected Responses**:

```
> look
It's pitch dark. You can't see a thing.

> take rope
You fumble around in the darkness and find nothing.
(OR: You need to be able to see what you're taking.)

> feel around
You reach out in the darkness and feel... a rope hanging from above!

> take rope
(after feeling) You grab the rope you found earlier.

> turn on lantern
The cellar is illuminated. You can see a rope hanging from the ceiling.

> take rope
(with light) You take the rope.
```

**Parser Behavior**:

1. Without light, visible scope is empty
2. "feel around" or similar discovers reachable items
3. Discovered items might go into a "known but not visible" state
4. With light, normal visibility rules apply

**Design Question**: Should there be a "discovered" or "known" state for items found by touch?

Good question, but do we make this systemic or author-driven? This sounds like a puzzle but it could just be a natural world thing. We also have the perception service that probably should handle this.

---

## Scenario 5: Apple Held by NPC

**Setup**: A farmer is holding an apple.

**State**:

- Apple is VISIBLE (you can see the farmer holding it)
- Apple is NOT REACHABLE (it's in someone else's possession)

**Commands & Expected Responses**:

```
> examine apple
The farmer is holding a ripe red apple.

> take apple
That belongs to the farmer. Perhaps you could ask for it?

> ask farmer for apple
"Sure, here you go," says the farmer, handing you the apple.

> take apple
(after receiving) You already have the apple.
```

**Parser Behavior**:

1. EXAMINE works (visible)
2. TAKE fails - item is held by another actor
3. Social action (ASK FOR) can transfer ownership
4. Reachability changes after transfer

---

## Scenario 6: Book on High Shelf

**Setup**: Library with a book on a high shelf, out of reach.

**State**:

- Book is VISIBLE (can see it up there)
- Book is NOT REACHABLE (too high)

**Commands & Expected Responses**:

```
> examine book
You see a dusty tome on the top shelf, well out of reach.

> take book
The book is too high to reach.

> climb shelf
The shelf wobbles dangerously. You'd better not.

> stand on chair
You stand on the chair, bringing the top shelf within reach.

> take book
(while on chair) You take the dusty tome.
```

**Parser Behavior**:

1. EXAMINE works (visible)
2. TAKE fails - contextual message about height
3. Standing on something changes player's reach
4. Reachability is recalculated based on player state

---

## Scenario 7: Fish in Aquarium

**Setup**: Large aquarium with fish swimming inside.

**State**:

- Fish is VISIBLE (through glass)
- Fish is NOT REACHABLE (underwater, behind glass)

**Commands & Expected Responses**:

```
> look at fish
A colorful tropical fish swims lazily in the aquarium.

> take fish
You can't reach the fish through the aquarium glass.

> put hand in aquarium
You reach into the water but the fish darts away.

> catch fish with net
You scoop up the fish with the net.
```

**Parser Behavior**:

1. EXAMINE works
2. TAKE fails - barrier (glass + water)
3. Some actions might partially work (hand in water)
4. Tool use (net) can overcome the barrier

---

## Scenario 8: Voice from Adjacent Room

**Setup**: Player hears someone talking in the next room.

**State**:

- Person is NOT VISIBLE (in another room)
- Person is NOT REACHABLE (in another room)
- Person is AUDIBLE (can hear them)

**Commands & Expected Responses**:

```
> listen
You hear someone talking in the next room.

> examine person
You can't see anyone here.

> talk to person
There's no one here to talk to. The voice is coming from the north.

> shout hello
"Hello!" you call out. The talking stops. "Who's there?" replies a voice.
```

**Parser Behavior**:

1. LISTEN uses AUDIBLE scope (different from visible/reachable)
2. EXAMINE/TALK fail - person not in visible scope
3. SHOUT might work across rooms (special case)

**Design Question**: Do we need an AUDIBLE scope level?

We did this in Shadow in the Cathedral when Wren has to put a glass against a door to hear the Cardinal and Shadowy Figure speak.

---

## Scenario 9: Item in Player's Pocket (NPC Perspective)

**Setup**: Player has a key in their pocket. An NPC wants to know if player has a key.

**State** (from NPC's perspective):

- Key is NOT VISIBLE to NPC (in player's pocket)
- Key is NOT REACHABLE by NPC (player's possession)

**Commands & Expected Responses**:

```
> show key to guard
You show the guard your key. "Ah, you may pass," he says.

(NPC trying to take):
The guard reaches for your pocket but you step back.
```

**Parser Behavior**:

1. Player's inventory is visible to player, not to NPCs
2. SHOW action makes item temporarily "visible" to target
3. NPCs can't TAKE from player inventory without special circumstances

---

## Scenario 10: Treasure Behind Waterfall

**Setup**: A glittering treasure is visible through a waterfall.

**State**:

- Treasure is VISIBLE (can see the glitter through water)
- Treasure is PARTIALLY REACHABLE (can reach through, but water is obstacle)

**Commands & Expected Responses**:

```
> examine treasure
Through the cascading water, you glimpse something glittering.

> take treasure
You reach through the waterfall but the force of the water pushes your arm back.

> go through waterfall
You steel yourself and push through the waterfall, emerging in a hidden cave.

> take treasure
You pick up the glittering treasure.
```

**Parser Behavior**:

1. EXAMINE works (partial visibility)
2. TAKE fails - obstacle (not a hard barrier, but still blocks)
3. Movement action overcomes obstacle
4. After moving, normal reachability applies

---

## Summary of Scope Considerations

### Scope Levels Needed

1. **VISIBLE** - Can see the entity
2. **REACHABLE** - Can physically touch/interact
3. **CARRIED** - In actor's inventory
4. **AUDIBLE** - Can hear (maybe future feature)

### Barriers That Affect Scope

- **Distance** (across pitch, high shelf)
- **Containers** (closed box, locked case)
- **Transparency** (glass - visible but not reachable)
- **Opacity** (cardboard - reachable but not visible when closed)
- **Darkness** (no light - nothing visible)
- **Possession** (held by NPC)
- **Obstacles** (waterfall, bars, grate)

### Failure Message Requirements

The parser needs contextual failure messages:

- "The X is too far away."
- "The X is inside the locked Y."
- "You can't see any X here." (not visible)
- "You don't have the X." (not carried)
- "That belongs to the Y." (NPC possession)
- "The X is out of reach." (generic reachability)

### Edge Cases to Handle

1. **Discovered items** - Found by touch in darkness, now "known"
2. **Partial visibility** - Through water, fog, dirty glass
3. **Changing reachability** - Standing on chair, using tools
4. **Multi-entity interactions** - "unlock case with key" (key must be carried, case must be reachable)

---

## Open Questions

1. Should "feel around" / "fumble" bypass visibility requirements?

As long as the directObject is reachable, yes.

2. Do we need a "discovered/known" state separate from visible?

Use perception service, but I'd say yes. (could go either way System vs Author, but I think we can build this in)

3. Should AUDIBLE be a scope level, or handled differently?

Yes. But lower priority for now.

4. How do tools affect reachability? (net catches fish, pole retrieves item)

We might need an "awareness" scope.

5. How does player position affect reach? (standing on chair, climbing)

Author sets scope. Say there's a box on a shelf.

> take box
> You can't reach the top shelf.

> stand on chair
> Standing on the chair brings the top shelf into reach.

author: box.setInScope(box);

> take box
> Taken.
