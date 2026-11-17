# Endgame Mechanics - Extracted from FORTRAN Source

## Inside Mirror State Variables

From `dparam.for`:
```fortran
COMMON /FINDEX/ MDIR,MLOC,POLEUF
```

| Variable | Meaning | Values |
|----------|---------|--------|
| MDIR | Mirror direction | 0=N, 45=NE, 90=E, 135=SE, 180=S, 225=SW, 270=W, 315=NW |
| MLOC | Mirror location | MRA(161), MRB(162), MRC(163), MRD(165), MRG(164)=danger |
| POLEUF | Pole state | 0=lowered, 1=on floor, 2=raised |

## Mirror Room Layout

```
Hallway Groove (A through D, with G as guardian room):

    MRA(161) --- MRB(162) --- MRC(163) --- MRD(165)
                    |
                  MRG(164) [Guardian room - deadly!]
```

## Wall Objects

From `dparam.for`:
```fortran
PARAMETER (YLWAL=159)   ! yellow wall (side panel)
PARAMETER (RDWAL=161)   ! red wall (side panel)
PARAMETER (PINDR=164)   ! pine door (end wall - opens)
! mahogany wall = other end wall (moves box)
```

---

## Short Pole (O41) - objects.for:1569-1595

### RAISE (RAISEW)
```fortran
IF(POLEUF.EQ.2) I=750           ! already up - message 750
POLEUF=2                         ! pole is raised
```

### LOWER/PUSH (LOWERW/PUSHW)
```fortran
IF(POLEUF.EQ.0) -> "can't do it"           ! already lowered
IF(MOD(MDIR,180).EQ.0) ->                  ! mirror is N-S oriented
    POLEUF=0, "into channel"               ! message 752
ELSE IF(MDIR.EQ.270 AND MLOC.EQ.MRB) ->    ! specific position
    POLEUF=0, "into hole"                  ! message 753
ELSE ->
    POLEUF=1, "falls to floor"             ! message 754 or 755
```

---

## Side Panels (O125) - objects.for:570-591

### PUSH panel (rotation)

**Precondition**: POLEUF ≠ 0 (pole must be up or on floor)

If pole is lowered (POLEUF=0):
- If mirror N-S: "won't budge" (msg 732)
- Otherwise: "won't budge" (msg 731)

If pole is up:
```fortran
I=831                                    ! rotate left/right
IF((PRSO.EQ.RDWAL).OR.(PRSO.EQ.YLWAL)) I=830  ! opposite direction
MDIR=MOD(MDIR+45+(270*(I-830)),360)      ! calculate new direction
```

**Rotation formula**:
- Red/Yellow wall (I=830): `MDIR = (MDIR + 45 + 0) % 360` = rotate 45° clockwise
- Other panels (I=831): `MDIR = (MDIR + 45 + 270) % 360` = rotate 45° counter-clockwise

---

## End Walls (O126) - objects.for:593-641

### PUSH pine wall (PINDR) - opens door
```fortran
IF in view of guardian room -> death (msg 737)
ELSE -> door opens for 5 turns (CTICK(CEVPIN)=5)
```

Guardian room visibility check:
```fortran
((MLOC.EQ.MRC).AND.(MDIR.EQ.180)).OR.    ! at C facing south
((MLOC.EQ.MRD).AND.(MDIR.EQ.0)).OR.      ! at D facing north
(MLOC.EQ.MRG)                             ! in guardian room
```

### PUSH mahogany wall - moves box

**Precondition**: MDIR must be N-S (0 or 180)
- If not N-S: "won't budge" (msg 735)

Movement:
```fortran
NLOC=MLOC-1                   ! new location if facing south (MDIR=180)
IF(MDIR.EQ.0) NLOC=MLOC+1     ! new location if facing north (MDIR=0)
IF NLOC out of bounds (not A-D) -> "reached end" (msg 738)
```

Movement feedback:
```fortran
I=699 (south) or 695 (north)  ! direction indicator
J=739 (smooth) or 740 (wobbles if pole up)
MLOC=NLOC
```

**Danger entering MRG (guardian room)**:
- If POLEUF ≠ 0: death (msg 741) - "pole up, gdn sees"
- If door open: death (msg 744)
- If mirrors broken: death (msg 742)

---

## Trivia System

### Question Selection
```fortran
QUESNO=RND(8)                  ! random 0-7
```

Questions are at messages 771-778 (RSPEAK(770+QUESNO))

### Answer Matching

From `verbs.for`:
```fortran
DATA ANSWER/0,6,1,6,2,5,3,5,4,3,4,6,4,7,
1    4,5,5,5,5,4,5,8,6,11,7,4,7,6/

DATA ANSSTR/'TEMPLEFOREST30003FLASKRUBFONDLECARRESS
1    TOUCHBONESBODYSKELETONRUSTY KNIFENONENOWHERE'/
```

Decoded (question, answer):

| Q# | Primary Answer | Alternates |
|----|----------------|------------|
| 0 | TEMPLE | - |
| 1 | FOREST | - |
| 2 | 30003 | - |
| 3 | FLASK | - |
| 4 | RUB | FONDLE, CARRESS, TOUCH |
| 5 | BONES | BODY, SKELETON |
| 6 | RUSTY KNIFE | - |
| 7 | NONE | NOWHERE |

### Question Topics (inferred from answers)

| Q# | Likely Question | Answer |
|----|-----------------|--------|
| 0 | "How do you get to the thief's lair?" | TEMPLE |
| 1 | "Where do you end up from the altar?" | FOREST |
| 2 | "What is the value of the zorkmid treasures?" | 30003 |
| 3 | "How do you read the cakes?" | FLASK |
| 4 | "What is useful to do with the mirror?" | RUB |
| 5 | "What offends the ghosts?" | SKELETON/BONES |
| 6 | "What item is haunted?" | RUSTY KNIFE |
| 7 | "Is 'hello sailor' useful?" | NONE |

### Answer Logic
```fortran
CORRCT=0, NQATT=0              ! correct answers, wrong attempts
! On correct answer:
CORRCT=CORRCT+1
IF(CORRCT.GE.3) -> quiz over, door opens
ELSE -> next question: QUESNO=MOD(QUESNO+3,8)

! On wrong answer:
NQATT=NQATT+1
IF(NQATT.GE.5) -> all over, lose
ELSE -> try again (messages 801-804)
```

---

## Parapet Dial System

From `objects.for:1688-1699`:

### Dial Button (O48)
```fortran
IF CDOOR open -> close it (msg 810)
IF(LCELL.EQ.PNUMB) RETURN      ! no change needed

! Relocate objects between cells and hyperspace
DO I=1,OLNT
  IF in CELL and not door -> move to LCELL*HFACTR (hyperspace)
  IF in PNUMB*HFACTR -> move to CELL
LCELL=PNUMB                     ! new cell in position
```

### Cell 4 Special
Cell 4 has bronze door (ODOOR) leading to Treasury.

When LCELL=4, the bronze door is visible in Prison Cell.

---

## Inside Mirror Room Description (R46)

From `rooms.for:553-571`:
```fortran
CALL RSPEAK(688)               ! base description

! Pole description based on state:
! Cases 1,2: MDIR=270 & MLOC=MRB -> pole in hole (690) or up (691)
! Cases 3,4: MDIR N-S -> pole in channel (692) or up (693)
! Case 5: pole is up (689)

! Arrow direction:
CALL RSPSUB(694,695+(MDIR/45)) ! direction messages 695-702
```

Arrow direction messages:
- 695 = North
- 696 = NE
- 697 = East
- 698 = SE
- 699 = South
- 700 = SW
- 701 = West
- 702 = NW

---

## Initial State

Need to find initial values. Likely:
- MLOC = MRA (starting position)
- MDIR = 0 or 90 (initial orientation)
- POLEUF = 2 (pole raised initially)

---

## Solution Sequence (from walkthrough)

1. **Enter** - "go in" from Hallway
2. **lift short pole** - POLEUF=2 (enable rotation)
3. **push red panel** x2 - rotate to N-S alignment (MDIR=0 or 180)
4. **lower short pole** - POLEUF=0 (into channel, lock orientation)
5. **push mahogany panel** x3 - move along groove (MLOC changes)
6. **lift short pole** - POLEUF=2
7. **push red panel** x4 - reorient
8. **lower short pole** - POLEUF=0
9. **push pine panel** - opens door
10. **n** - exit to Dungeon Entrance
