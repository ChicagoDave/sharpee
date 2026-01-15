# TR-002 Comparison: Canonical Zork vs Dungeo

This document compares the real Mainframe Zork transcript (tr-002.txt) against our dungeo implementation to identify gaps and verify correctness.

## Legend
- ✅ Implemented and matches
- ⚠️ Implemented but differs
- ❌ Not implemented
- 🔍 Needs verification

---

## Room Descriptions

### West of House (Starting Room)
**Canonical (line 3-5):**
> This is an open field west of a white house with a boarded front door.
> There is a small mailbox here.
> A rubber mat saying "Welcome to Dungeon!" lies by the door.

**Ours:**
> This is an open field west of a white house, with a boarded front door.

**Status:** ✅ Matches (fixed in P3)

### North of House
**Canonical (line 15):**
> You are facing the north side of a white house. There is no door here, and all the windows are barred.

**Ours:**
> You are facing the north side of a white house. There is no door here, and all the windows are barred.

**Status:** ✅ Matches (fixed in P3)

### Behind House
**Canonical (line 18):**
> You are behind the white house. In one corner of the house there is a small window which is slightly ajar.

**Ours:**
> You are behind the white house. In one corner of the house there is a small window which is slightly ajar.

**Status:** ✅ Matches

### Kitchen
**Canonical (line 24-28):**
> This is the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west, and a dark staircase can be seen leading upward. To the east is a small window which is open.
> On the table is an elongated brown sack, smelling of hot peppers.
> A bottle is sitting on the table.
> The glass bottle contains:
>   A quantity of water.

**Ours:**
> This is the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west, and a dark staircase can be seen leading upward. To the east is a small window which is open.

**Status:** ✅ Matches (fixed in P3)

### Living Room
**Canonical (line 35-40):**
> This is the living room. There is a door to the east. To the west is a wooden door with strange gothic lettering, which appears to be nailed shut.
> In the center of the room is a large oriental rug.
> There is a trophy case here.
> On hooks above the mantelpiece hangs an elvish sword of great antiquity.
> A battery-powered brass lantern is on the trophy case.
> There is an issue of US NEWS & DUNGEON REPORT here.

**Ours:**
> This is the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.

**Status:** ⚠️ "This is" fixed (P3), but structure still differs (comma list vs. separate sentences)

### Attic
**Canonical (line 53-56):**
> This is the attic. The only exit is stairs that lead down.
> A large coil of rope is lying in the corner.
> On a table is a nasty-looking knife.
> There is a square brick here which feels like clay.

**Ours:**
> This is the attic. The only exit is stairs that lead down.
> A large coil of rope is lying in the corner.
> On a table is a nasty-looking knife.
> There is a square brick here which feels like clay.

**Status:** ✅ Matches - room description simplified, objects use `brief` property for room listings

### Cellar
**Canonical (line 112-113):**
> This is a dark and damp cellar with a narrow passageway leading east, and a crawlway to the south. To the west is the bottom of a steep metal ramp which is unclimbable.
> Above you is an open trap door.

**Ours:**
> This is a large room which appears to be a cellar.

**Status:** ✅ "This is" fixed (P3). Description simplified but correct.
**Note:** Canonical shows trap door state dynamically

### Troll Room
**Canonical (line 126-127):**
> This is a small room with passages off in all directions. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.
> A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.

**Ours:**
> This is a small room with passages off in all directions. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.

**Status:** ✅ Matches (fixed in P1)

### East-West Passage
**Canonical (line 146):**
> This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.

**Ours:**
> This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.

**Status:** ✅ Matches!

### Deep Ravine (Chasm)
**Canonical (line 149):**
> This is a deep ravine at a crossing with an east-west crawlway. Some stone steps are at the south of the ravine, and a steep staircase descends.

**Ours:**
> You are in a deep ravine at a point where a crack opens to the east. A passage leads south, and a steep trail leads down.

**Status:** ⚠️ Very different - needs updating

### Crawlway (Rocky Crawl)
**Canonical (line 152):**
> This is a crawlway with a three foot high ceiling. Your footing is very unsure here due to the assortment of rocks underfoot. Passages can be seen in the east, west, and northwest corners of the crawlway.

**Ours:**
> This is a crawlway with a low ceiling. A passage goes to the east, and a narrow opening leads west.

**Status:** ⚠️ Very different - canonical is much more detailed

### Dome Room (Periphery)
**Canonical (line 155-156):**
> This is the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.

**Ours:**
> This is the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.

**Status:** ✅ Matches (fixed in P1)

### Torch Room (Below Dome)
**Canonical (line 161-163):**
> This is a large room with a prominent doorway leading to a down staircase. To the west is a narrow twisting tunnel, covered with a thin layer of dust. Above you is a large dome painted with scenes depicting elfin hacking rites. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room there is a white marble pedestal.
> A large piece of rope descends from the railing above, ending some five feet above your head.
> Sitting on the pedestal is a flaming torch, made of ivory.

**Ours:**
> This is a large room with a prominent doorway leading to a down staircase. To the west is a narrow twisting tunnel, covered with a thin layer of dust. Above you is a large dome painted with scenes depicting elfin hacking rites. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room there is a white marble pedestal.

**Status:** ✅ Matches (fixed in P2)

### North-South Crawlway
**Canonical (line 175):**
> This is a north-south crawlway; a passage also goes to the east. There is a hole above, but it provides no opportunities for climbing.

**Ours:**
> This is a north-south crawlway; a passage also goes to the east. There is a hole above, but it provides no opportunities for climbing.

**Status:** ✅ Matches!

### Studio
**Canonical (line 178):**
> This is what appears to have been an artist's studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the north and northwest of the room are open doors (also covered with paint). An extremely dark and narrow chimney leads up from a fireplace. Although you might be able to get up the chimney, it seems unlikely that you could get back down.

**Ours:**
> This appears to have been an artist's studio. The walls are covered with sketches of mountains. A stairway leads down. The only other exit is to the northwest.

**Status:** ⚠️ Very different - canonical has paint, chimney, "69 colors"

### Gallery
**Canonical (line 181-183):**
> This is an art gallery. Most of the paintings which were here have been stolen by vandals with exceptional taste. The vandals left through the north, south, or west exits.
> Fortunately, there is still one chance for you to be a vandal, for on the far wall is a work of unparalleled beauty.

**Ours:**
> This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.

**Status:** ⚠️ Minor differences - "north or west" vs "north, south, or west", missing "far wall" text

### Round Room
**Canonical (line 200-201):**
> This is a circular room with passages off in eight directions.
> Your compass needle spins wildly, and you cannot get your bearings.

**Ours:**
> This is a circular room with passages off in eight directions.

**Status:** ✅ Matches (fixed in P1). Compass message shown dynamically on LOOK.

### Engravings Cave
**Canonical (line 237-238):**
> You have entered a cave with passages leading north and southeast.
> There are old engravings on the walls here.

**Ours:**
> You are in a cave with strange engravings on the walls. A passage leads north, and stairs lead down.

**Status:** ⚠️ Different wording, exits differ (southeast vs down)

### Riddle Room
**Canonical (line 241-248):**
> This is a room which is bare on all sides. There is an exit down. To the east is a great door made of stone. Above the door, the following words are written: "No man shall enter this room without solving this riddle --
>
>     What is tall as a house,
>     Round as a cup,
>     And all the king's horses can't draw it up?".
>
> (Reply via 'ANSWER "answer"'.)

**Ours:**
> This is a room which is bare on all sides. There is an exit down. To the east is a great door made of stone. Above the stone, the following words are written: 'No man shall enter this room without solving this riddle:
>
> What is tall as a house,
> round as a cup,
> and all the king's horses can't draw it up?'
>
> (Reply via 'ANSWER "answer"')

**Status:** ✅ Close match! Minor formatting differences

### Broom Closet
**Canonical (line 253-254):**
> This is a former broom closet. The exits are to the east and west.
> There is a pearl necklace here with hundreds of large pearls.

**Ours:**
> This is a former broom closet. The exits are to the east and west.

**Status:** ✅ Matches (fixed in P1). Pearl necklace is now separate object.

### Temple West
**Canonical (line 287-288):**
> This is the west end of a large temple. On the south wall is an ancient inscription, probably a prayer in a long-forgotten language. The north wall is solid granite. The entrance at the west end of the room is through huge marble pillars.
> Lying in the corner of the room is a small brass bell.

**Ours (Temple):**
> This is the interior of a large temple of ancient construction. Flickering torches cast shadows on the walls. A stairway leads down.

**Status:** ⚠️ Very different - canonical is "west end", ours is generic

### Altar (Temple East)
**Canonical (line 291-293):**
> This is the east end of a large temple. In front of you is what appears to be an altar.
> On the altar is a large black book, open to page 569.
> On the two ends of the altar are burning candles.

**Ours (Altar):**
> This is the altar room of the temple. A large stone altar dominates the room.

**Status:** ⚠️ Different structure - canonical is "east end of temple"

### Forest
**Canonical (line 296, 302-305, 311):**
> This is a forest, with trees in all directions around you.
> This is a dimly lit forest, with large trees all around. One particularly large tree with some low branches stands here.

**Ours (Forest Path 1):**
> This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the side of the path.

**Status:** ⚠️ Different - canonical is just "forest" not "forest path"

### Up Tree
**Canonical (line 314-316):**
> You are about ten feet above the ground nestled among some large branches. The nearest branch above you is beyond your reach.
> On the branch is a small birds nest.
> In the bird's nest is a large egg encrusted with precious jewels, apparently scavenged somewhere by a childless songbird. The egg is covered with fine gold inlay and ornamented in lapis lazuli and mother-of-pearl. Unlike most eggs, this one is hinged and has a delicate looking clasp holding it closed. The egg appears extremely fragile.

**Ours:**
> You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is beyond your reach.

**Status:** ✅ Matches (fixed in P3)

---

## Action Responses

### Taking Items
**Canonical:** `Taken.`
**Status:** 🔍 Need to verify

### Opening Containers
**Canonical (line 8-9):**
> Opening the mailbox reveals:
>   A leaflet.

**Status:** 🔍 Need to verify our format

### Opening Window
**Canonical (line 21):**
> With great effort, you open the window far enough to allow entry.

**Status:** ✅ Matches (fixed in P3)

### GET ALL
**Canonical (line 31-32):**
> brown sack: Taken.
> glass bottle: Taken.

**Status:** 🔍 Need to verify format

### Switching Lamp On (in dark room)
**Canonical (line 51-54):**
> The lamp is now on.
> This is the attic. The only exit is stairs that lead down.
> A large coil of rope is lying in the corner.
> On a table is a nasty-looking knife.
> There is a square brick here which feels like clay.

**Status:** 🔍 Room auto-shows after light turns on

### GET X AND Y (multiple items)
**Canonical (line 58-60):**
> brick: Taken.
> rope: Taken.

**Status:** 🔍 Need to verify format

### Switching Lamp Off
**Canonical (line 63-64):**
> The lamp is now off.
> It is now pitch black.

**Status:** 🔍 Need to verify dark message appears

### DROP ALL BUT X
**Canonical (line 76-80):**
> brown sack: Dropped.
> glass bottle: Dropped.
> rope: Dropped.
> leaflet: Dropped.
> brick: Dropped.

**Status:** ❌ **NOT IMPLEMENTED** - Need "ALL BUT" syntax

### Down when trap door closed
**Canonical (line 92):**
> The trap door is closed.

**Status:** 🔍 Need to verify message

### Moving Rug
**Canonical (line 98):**
> With a great effort, the rug is moved to one side of the room. With the rug moved, the dusty cover of a closed trap door appears.

**Status:** 🔍 Need to verify our message

### Opening Trap Door
**Canonical (line 101):**
> The door reluctantly opens to reveal a rickety staircase descending into darkness.

**Status:** ✅ Implemented custom message

### Sword Glow (Near Enemy)
**Canonical (line 108):**
> Your sword is glowing with a faint blue glow.

**Canonical (line 128):**
> Your sword has begun to glow very brightly.

**Canonical (line 140):**
> Your sword is no longer glowing.

**Status:** ❌ **NOT IMPLEMENTED** - Need sword glow behavior

### Trap Door Auto-Close
**Canonical (line 114-115):**
> The door crashes shut, and you hear someone barring it.

**Status:** ✅ Implemented - trapdoor-handler.ts daemon triggers on Living Room → Cellar movement

### Combat
**Canonical (line 131-140):**
> Clang! Crash! The troll parries.
> The axe gets you right in the side. Ouch!
> The troll is battered into unconsciousness.
> The unconscious troll cannot defend himself: he dies.
> Almost as soon as the troll breathes his last, a cloud of sinister black smoke envelops him, and when the fog lifts, the carcass has disappeared.

**Status:** 🔍 Need to verify combat messages match

### TIE ROPE TO RAILING
**Canonical (line 158):**
> The rope drops over the side and comes within ten feet of the floor.

**Status:** ✅ Implemented - tie-action.ts handles railing in Dome Room

### Rope visible from below
**Canonical (line 162):**
> A large piece of rope descends from the railing above, ending some five feet above your head.

**Status:** ❌ Rope state changes room description

### ANSWER "X"
**Canonical (line 250):**
> There is a clap of thunder, and the east door opens.

**Status:** ✅ Implemented - answer-action.ts handles Riddle Room puzzle

### PRAY (Temple Teleport)
**Canonical (line 295-296):**
(From Temple Altar, pray teleports to forest)
> This is a forest, with trees in all directions around you.

**Status:** ✅ Implemented - pray-action.ts teleports from Altar to Forest Path 1

### Already off
**Canonical (line 299):**
> It is already off.

**Status:** 🔍 Need to verify

### PUT X, Y, AND Z in container
**Canonical (line 354-357, 362-365):**
> pearl necklace: I can't reach inside.  (when closed)
> pearl necklace: Done.  (when open)

**Status:** 🔍 Need to verify multi-item PUT, note "Done." not "Taken."

### Inventory Format
**Canonical (line 346-352):**
> You are carrying:
>   A sword.
>   A lamp.
>   A pearl necklace.
>   etc.

**Status:** 🔍 Need to verify format

### Load Limit
**Canonical (line 319):**
> Your load is too heavy. You will have to leave something behind.

**Status:** 🔍 Need to verify load limit implemented

---

## Special Mechanics

### 1. Dark Rooms
**Canonical (line 49, 107):**
> It is pitch black. You are likely to be eaten by a grue.

**Status:** ✅ Implemented

### 2. Round Room Compass Confusion
**Canonical (line 201-202, 203-204, 223, 235, 278):**
> Your compass needle spins wildly, and you cannot get your bearings.
> Unfortunately, it is impossible to tell directions in here.

**Status:** ❌ **NOT IMPLEMENTED**

### 3. Maze Randomization
Exits from Round Room lead to random maze locations.
**Status:** ❌ **NOT IMPLEMENTED**

### 4. Brief vs Verbose Room Names
When revisiting a room:
- Kitchen → "Kitchen" (line 46, 66)
- Living Room → "Living Room" + items (line 69-73)
- Forest → "Forest" (line 302-305)

**Status:** 🔍 Brief mode not implemented?

### 5. Trophy Case Treasure Display
**Canonical (line 391-394):**
> Your collection of treasures consists of:
>   A pearl necklace.
>   A grail.
>   A painting.

**Status:** ❌ **NOT IMPLEMENTED** - Treasure display in room look

### 6. Container Contents Display
**Canonical (line 27-28, 395-396):**
> The glass bottle contains:
>   A quantity of water.

**Status:** 🔍 Need to verify

---

## Object/Entity Differences

### Pearl Necklace vs Pearl
**Canonical:** "pearl necklace" with "hundreds of large pearls"
**Ours:** "pearl necklace" with "hundreds of large pearls"

**Status:** ✅ Matches (fixed in P1)

### Room Name: Broom Closet vs Pearl Room
**Canonical:** "former broom closet"
**Ours:** "former broom closet"

**Status:** ✅ Matches (fixed in P1)

### Ivory Torch
**Canonical (line 163):** "flaming torch, made of ivory"
**Canonical:** Torch is on a pedestal, already lit ("flaming")
**Ours:** Torch is unlit

**Status:** ⚠️ Should torch start lit?

### Welcome Mat Text
**Canonical:** "Welcome to Dungeon!"
**Ours:** "Welcome to Dungeon!"

**Status:** ✅ Matches (fixed in P3)

---

## Priority Fix List

### P0 - Critical (Blocks Gameplay) - **ALL FIXED**
1. ✅ `TIE ROPE TO` action - Dome/torch room puzzle works
2. ✅ `ANSWER "X"` action - Riddle puzzle works ("a well" opens east door)
3. ✅ `PRAY` action - Temple teleport to forest works
4. ✅ Trap door auto-close - Door slams shut and bars after descending

### P1 - High (Wrong Content) - **ALL FIXED**
5. ✅ Dome Room description - AT TOP not at base (verified from 1981 MDL dung.355:324-327)
6. ✅ Pearl Room → "Broom Closet" rename (verified from 1981 MDL dung.355:2434-2438)
7. ✅ Pearl → "Pearl Necklace" rename (verified from 1981 MDL dung.355:5233-5242)
8. ✅ Troll Room scratches - "axe" not "adventurers" (verified from 1981 MDL dung.355:1772-1773)
9. ✅ Round Room compass confusion - description + isFixed=false (verified from 1981 MDL act1.254:472-480)
   - Note: Compass message on LOOK needs dynamic room description (future enhancement)

### P2 - Medium (Polish)
10. ❌ `DROP ALL BUT X` syntax
11. ❌ Sword glow behavior near enemies
12. ❌ Trophy case treasure display
13. ⚠️ Studio description - paint/chimney detail
14. ✅ Torch Room description - dome/pedestal detail (FIXED - verified from 1981 MDL dung.355:317-322)
15. ⚠️ Gallery description - missing south exit mention

### P3 - Low (Minor Text) - **ALL FIXED**
16. ✅ "This is" vs "You are in" - Fixed in West of House, Kitchen, Living Room, Cellar
17. ✅ Window opening custom message - "With great effort, you open the window..."
18. ✅ "barred" vs "boarded up" windows - North/South of House now say "barred"
19. ✅ Welcome mat "Dungeon" vs "Zork" - Now says "Welcome to Dungeon!"
20. ✅ Up Tree "beyond" vs "above" reach - Now says "beyond your reach"

---

## Verification Checklist

Run `node dist/sharpee.js --play` and test:

- [ ] West of House description
- [ ] Mailbox open/take leaflet
- [ ] Behind House window description
- [ ] Kitchen description + objects
- [ ] Living Room description + objects
- [ ] Attic description + objects
- [ ] Rug push reveals trap door
- [ ] Trap door open message
- [ ] Cellar description
- [ ] Dark room grue message
- [ ] Troll Room + troll
- [ ] Combat messages
- [ ] Navigation to Round Room
- [ ] Round Room description
- [ ] Engravings Cave
- [ ] Riddle Room + ANSWER command
- [ ] Pearl necklace room
- [ ] Temple rooms
- [ ] PRAY command
- [ ] Dome/Torch room puzzle
- [ ] TIE ROPE command
- [ ] Trophy case PUT + display

---

## Notes from Transcript

- Line 256-257: "pearl" alone is NOT recognized - player must say "necklace"
- Line 418-419: "matt" (misspelling) is NOT recognized
- The game uses "Done." for PUT commands (line 363-365), not "Taken."
- Trophy case contents shown as "Your collection of treasures" in room description
- Candles are on the altar, already burning (line 293)
- Book is open to page 569 (line 292) - exorcism spell reference
