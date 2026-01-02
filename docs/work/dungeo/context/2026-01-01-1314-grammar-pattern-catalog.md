# Grammar Pattern Catalog: Comprehensive IF Command Analysis

**Date:** 2026-01-01 13:14 CST
**Purpose:** Catalog all grammar patterns for ADR-082 expansion

## Pattern Categories

### 1. ENTITY-BASED PATTERNS (Existing)

Standard patterns that resolve slots to game entities:

```
VERB :entity                           take lamp, examine sword
VERB :entity PREP :entity              put lamp in case, give sword to troll
VERB :entity PREP :entity PREP :entity  put key on hook under mat
```

### 2. VOCABULARY-CONSTRAINED PATTERNS (ADR-082 Core)

Slots constrained to vocabulary categories without entity resolution:

#### 2.1 Adjective Slots
```
push :adjective panel                  push RED panel, push YELLOW wall
push :adjective :noun                  push MAHOGANY panel
examine :adjective :noun               examine LARGE door
```

#### 2.2 Noun Slots
```
VERB :noun                             (when noun isn't an entity)
```

#### 2.3 Direction Slots
```
go :direction                          go NORTH, go SOUTHWEST
push :entity :direction                push boulder EAST
jump :direction                        jump WEST
pace :number :direction                pace 5 NORTH
```

### 3. NUMERIC PATTERNS

#### 3.1 Integer Values
```
turn dial to :number                   turn dial to 29
set slider to :number                  set slider to 414
wait :number                           wait 30
wait :number minutes                   wait 30 MINUTES
type :number                           type 3
press :number                          press 7
```

#### 3.2 Ordinal Values
```
take :ordinal :entity                  take FIRST key
push :ordinal button                   push SECOND button
go to :ordinal floor                   go to THIRD floor
```

#### 3.3 Time Values
```
wait until :time                       wait until 10:40
set alarm to :time                     set alarm to 6:00
```

### 4. TEXT CAPTURE PATTERNS

#### 4.1 Single-Word Text (Existing TEXT slot)
```
say :text                              say XYZZY
type :text                             type PASSWORD
```

#### 4.2 Quoted Text
```
write ":text" on :entity               write "EARTH" on cube
carve ":text" on :entity               carve "Arthur Dent" on memorial
say ":text"                            say "hello there"
label :entity ":text"                  label bottle "poison"
```

#### 4.3 Greedy Text (Existing TEXT_GREEDY)
```
incant :text...                        incant DFNOBO GHIJKL
ask :entity about :text...             ask wizard about the curse
tell :entity about :text...            tell guard about the robbery
```

### 5. TOPIC/KEYWORD PATTERNS

For conversation systems:

```
ask :entity about :topic               ask WIZARD about CURSE
tell :entity about :topic              tell GUARD about ROBBERY
consult :entity on :topic              consult GUIDE on BABEL
remember :topic                        remember PORTRAIT
recall :topic                          recall REZROV
```

### 6. SPELL/RITUAL PATTERNS

Magic system commands:

```
:spell :entity                         frotz LAMP, rezrov DOOR
cast :spell on :entity                 cast FIREBALL on TROLL
learn :spell                           learn GNUSTO
gnusto :spell                          gnusto REZROV
perform :ritual                        perform FIRE-RESISTANCE SYNTHESIS
```

### 7. MULTI-ENTITY PATTERNS (ADR-080 Phase 2)

```
take all                               (isAll: true)
take all but :entity                   (excluded: [entity])
take :entity and :entity               (isList: true, items: [e1, e2])
drop everything                        (isAll: true)
put all in :entity                     (isAll on directObject)
```

### 8. DELEGATION/NPC COMMAND PATTERNS

```
:npc, :command                         ROBOT, go north
tell :npc to :command                  tell FLOYD to take lamp
ask :npc to :command                   ask GUARD to open door
Both :npc and :npc, :command           Both SENSA and AUDA, move Fred
```

### 9. LINKING/MAGIC OBJECT PATTERNS

```
link :entity to :entity                link BREAD to BRICK
reverse link :entity to :entity        reverse link SPONGE to BAUBLE
unlink :entity                         unlink TEAPOT
```

### 10. DEVICE OPERATION PATTERNS

```
turn :entity on                        turn LAMP on
turn on :entity                        turn on LAMP
turn :entity off                       turn off FLASHLIGHT
switch :entity on/off                  switch DEVICE on
flip :entity                           flip SWITCH
press :entity                          press BUTTON
push :entity                           push LEVER
pull :entity                           pull CHAIN
```

### 11. INSTRUMENT PATTERNS (ADR-080)

```
VERB :entity with :instrument          unlock DOOR with KEY
cut :entity with :instrument           cut ROPE with KNIFE
light :entity with :instrument         light CANDLE with MATCH
hit :entity with :instrument           hit TROLL with SWORD
turn :entity with :instrument          turn BOLT with WRENCH
fill :entity with :instrument          fill JAR with WATER
pour :entity on :entity                pour WATER on FIRE
```

### 12. SCOPED OBSERVATION PATTERNS

```
look through :entity                   look through WINDOW
look through :entity at :entity        look through BINOCULARS at SHELTER
look in :entity                        look in BASKET
look under :entity                     look under BED
look behind :entity                    look behind CURTAIN
search :entity                         search CRATES
```

### 13. CONVERSATION PATTERNS

```
ask :entity about :topic               ask GUARD about KEY
tell :entity about :topic              tell WIZARD about CURSE
show :entity to :entity                show SWORD to MERCHANT
give :entity to :entity                give GOLD to BEGGAR
hello                                  (greeting)
goodbye                                (farewell)
yes / no                               (response)
agree / disagree                       (stance)
nothing                                (silence)
subject                                (change topic)
```

### 14. META/KNOWLEDGE PATTERNS

```
recall                                 (list all knowledge)
recall :category                       recall RITUALS, recall FORMULAS
recall :specific                       recall GNUSTO
facts / formulas / rituals             (category shortcuts)
places / doors / things                (world state)
go to :location                        go to KITCHEN (fast travel)
find :entity                           find LAMP (locate and travel)
```

### 15. MODE/STATE PATTERNS

```
record                                 (start recording)
record off                             (stop recording)
go to sim mode                         (enter simulation)
verbose / brief / superbrief           (description mode)
```

### 16. WORDPLAY PATTERNS (Nord and Bert)

Literal idiom execution:
```
make a mountain out of :entity         make a mountain out of MOLEHILL
swallow your pride                     (literal consumption)
give :entity a lobotomy                give BOB a lobotomy
turn the other cheek                   (literal action)
```

## Slot Types Required

Based on this catalog, the grammar system needs these slot types:

| Slot Type | Description | Example |
|-----------|-------------|---------|
| ENTITY | Resolves to game entity | take :lamp |
| TEXT | Single word, raw capture | say :password |
| TEXT_GREEDY | Multiple words until delimiter | ask about :topic... |
| QUOTED_TEXT | Text in quotes | write ":message" on cube |
| NUMBER | Integer value | turn dial to :n |
| ORDINAL | First, second, third... | take :ord key |
| TIME | Time expression (10:40) | wait until :time |
| DIRECTION | Cardinal/ordinal direction | go :dir |
| ADJECTIVE | Vocabulary-constrained adj | push :color panel |
| NOUN | Vocabulary-constrained noun | push red :surface |
| TOPIC | Conversation topic (fuzzy) | ask about :topic |
| SPELL | Spell name from vocabulary | cast :spell |
| INSTRUMENT | Entity marked as tool | cut with :tool |
| COMMAND | Embedded command | tell robot to :cmd |

## Grammar Builder Methods Required

```typescript
interface PatternBuilder {
  // Existing
  text(slot: string): PatternBuilder;
  instrument(slot: string): PatternBuilder;
  where(slot: string, constraint: Constraint): PatternBuilder;

  // NEW: Vocabulary-constrained slots
  adjective(slot: string): PatternBuilder;
  noun(slot: string): PatternBuilder;
  direction(slot: string): PatternBuilder;

  // NEW: Typed value slots
  number(slot: string): PatternBuilder;
  ordinal(slot: string): PatternBuilder;
  time(slot: string): PatternBuilder;

  // NEW: Special slots
  quotedText(slot: string): PatternBuilder;
  topic(slot: string): PatternBuilder;
  spell(slot: string): PatternBuilder;
}
```
