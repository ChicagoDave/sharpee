# Stdlib Gap Analysis for Dungeo

This document identifies what Sharpee currently supports vs. what needs to be added for a full Mainframe Zork implementation.

## Legend
- ✅ Exists and ready
- ⚠️ Exists but needs enhancement
- ❌ Missing, needs implementation

---

## Actions

### Currently Implemented (43 actions) ✅
All standard actions are complete with three-phase pattern:
- Movement: going, entering, exiting
- Manipulation: taking, dropping, putting, inserting, removing
- Interaction: opening, closing, locking, unlocking
- Combat: attacking
- Perception: looking, examining, listening, smelling, touching, searching
- Communication: talking, reading, showing, giving
- Physical: pushing, pulling, climbing, eating, drinking, wearing, taking_off
- Light: switching_on, switching_off
- Meta: inventory, help, about, scoring, saving, restoring, restarting, quitting
- Other: waiting, sleeping, throwing

### Actions Needed for Zork

| Action | Status | Notes |
|--------|--------|-------|
| DIG | ❌ | Sandy beach, rainbow area |
| WAVE | ❌ | Sceptre at rainbow |
| INFLATE/DEFLATE | ❌ | Boat mechanics |
| TIE/UNTIE | ❌ | Rope mechanics |
| RING | ❌ | Bell for exorcism |
| PRAY | ❌ | Temple altar |
| ECHO | ❌ | Loud room puzzle |
| LAUNCH | ❌ | Boat into water |
| LAND | ❌ | Boat to shore |
| MOVE | ⚠️ | Could use push/pull? Rug specifically |
| RAISE/LOWER | ❌ | Basket in shaft |
| TURN/ROTATE | ❌ | Various dials/objects |
| LIGHT/EXTINGUISH | ⚠️ | Have switching_on/off, need aliases |
| BURN | ❌ | Matches, candles → objects |
| BREAK | ⚠️ | Have attacking, need object breakage |
| CUT | ❌ | Knife actions |
| FILL | ❌ | Bottles, etc. |
| POUR | ❌ | Water, liquids |
| SAY/YELL | ❌ | "ECHO" in loud room, "ODYSSEUS" to cyclops |
| COUNT | ❌ | Leaves in Dam area |

---

## Traits

### Currently Implemented ✅
- Openable (doors, containers)
- Lockable (with key matching)
- Container (holding objects)
- Supporter (surfaces)
- Portable/Fixed (takeable vs not)
- Edible, Drinkable (consumables)
- Wearable (clothing)
- LightSource (illumination)
- Readable (text content)
- Weapon (combat)
- Breakable (destructible)

### Traits Needed for Zork

| Trait | Status | Use Case |
|-------|--------|----------|
| Flammable | ❌ | Can be lit on fire |
| Inflatable | ❌ | Boat mechanics |
| Vehicle | ❌ | Boat, basket - containment + movement |
| Diggable | ❌ | Surfaces that can be dug |
| Tiepoint | ❌ | Things rope can be tied to |
| Floatable | ❌ | Objects in water |
| Battery-powered | ❌ | Lantern fuel tracking |
| Valuable | ⚠️ | Could use scoring trait, need treasure marking |
| Climbable | ⚠️ | Tree, rope - have climbing action |
| Turnable | ❌ | Dials, knobs |
| Magical | ❌ | Sceptre, mirrors, special items |

---

## Behaviors

### Currently Implemented ✅
- Opening/Closing behaviors
- Locking/Unlocking behaviors
- Taking/Dropping behaviors
- Container behaviors
- Light source behaviors
- Combat/Weapon behaviors

### Behaviors Needed for Zork

| Behavior | Status | Use Case |
|----------|--------|----------|
| VehicleBehavior | ❌ | Enter/exit vehicle, movement while in vehicle |
| BurningBehavior | ❌ | Fuel consumption, spreading fire |
| RopeBehavior | ❌ | Tie, untie, climbing with rope |
| InflatableBehavior | ❌ | Inflate, deflate, puncture states |
| WateringBehavior | ❌ | Fill, pour, water interactions |
| DiggingBehavior | ❌ | Reveal objects by digging |

---

## Systems

### Currently Implemented ✅
- Turn tracking
- Score tracking (basic)
- Darkness/Light (PerceptionService)
- Event system
- Action validation/execution/reporting

### Systems Needed for Zork

| System | Status | Notes |
|--------|--------|-------|
| NPC AI/Movement | ❌ | Thief wandering, stealing, fighting |
| Combat System | ⚠️ | Basic attacking exists, need Zork-style combat |
| Death/Resurrection | ❌ | Reincarnation at forest |
| Carrying Capacity | ❌ | Weight/bulk limits |
| Timed Events | ❌ | Lantern dying, candles burning |
| Randomization | ❌ | Thief behavior, combat outcomes |
| Vehicle Movement | ❌ | Boat on river with current |
| Maze Generation | ⚠️ | Could hardcode, but dynamic would be nice |
| Sound Propagation | ❌ | Hearing from adjacent rooms |
| Water/Flooding | ❌ | Dam controls, reservoir |

---

## Parser Requirements

### Currently Supported ✅
- Basic verb-noun commands
- Prepositions (put X in Y)
- Multiple word object names
- Disambiguation

### Parser Enhancements Needed

| Feature | Status | Example |
|---------|--------|---------|
| Multi-command input | ❌ | "N. N. E. TAKE LAMP" |
| IT/THEM pronouns | ❌ | "TAKE IT" |
| ALL handling | ⚠️ | "TAKE ALL", "DROP ALL EXCEPT LAMP" |
| Direction abbreviations | ✅ | N, S, E, W, etc. |
| Verb synonyms | ⚠️ | "LIGHT" = "TURN ON" |
| AGAIN/G command | ❌ | Repeat last |
| OOPS correction | ❌ | Typo correction |
| Numbers | ❌ | "TURN DIAL TO 3" |

---

## Priority Implementation Order

### Phase 1: Core Missing Pieces
1. Vehicle trait/behavior (boat is central to game)
2. NPC system (thief is iconic)
3. Timed events (lantern, candles)
4. Death/resurrection

### Phase 2: Puzzle Support
1. New actions: DIG, WAVE, TIE, INFLATE, PRAY
2. Burning/flame mechanics
3. Water/liquid mechanics

### Phase 3: Polish
1. Parser enhancements (ALL, IT, AGAIN)
2. Sound propagation
3. Weight/bulk limits

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Combat complexity | High | Medium | Start simple, iterate |
| Thief AI | High | High | Simplified behavior first |
| Vehicle mechanics | Medium | High | Boat can be mostly scripted |
| Parser limitations | Medium | Medium | Workaround with synonyms |
| Performance at scale | Low | Medium | Test early with full room set |
