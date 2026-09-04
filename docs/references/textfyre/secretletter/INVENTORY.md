# Secret Letter — world inventory, measured from the Inform 7 source

Everything below is derived from `source/story.ni` (the `inform7/trunk` variant),
**not** from the playtest transcripts and not from the design documents. Where the
design archive and the source disagree, the source is what shipped.

Measured 2026-08-21. Every figure here is reproducible with the command shown
beside it; a future session should re-run rather than trust.

This document is the build checklist for the port's Phase 8 (`docs/work/secret-letter-port/plan.md`).
It describes **the 2009 game as built**. The port is a *retarget*, not a faithful
port — what actually gets built is bounded by David's change document (P-4), and a
chapter that document does not cover is not ported no matter what this inventory says.

---

## 1. ADR-322's three figures, reconciled

`docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` D13 cites three
numbers for this game. P-2 requires each be confirmed or corrected by name so the
two records cannot drift.

| ADR-322 D13 says | Measured | Verdict |
| --- | --- | --- |
| 12,635 lines | **12,635** | **CONFIRMED, exactly** |
| ~1,192 authored response rules | **1,192** | **CONFIRMED, exactly** — and the derivation is now known |
| 32 rooms | **84** | **CORRECTED — the real count is 84, 2.6× the cited figure** |

### 12,635 lines — confirmed

```
$ grep -c '' source/story.ni
12635
```

`story-sh-1.2.ni` (the `sh-1.2` branch variant) is 12,614.

> **Correction to this corpus's own README.** `README.md` records 12,636 and 12,615.
> Both are one too high. `grep -c ''` counts every line including an unterminated
> final one, and `story.ni` does end with a newline, so 12,635 is the count.
> Fixed in the README alongside this document.

### 1,192 response rules — confirmed, and now derivable

The figure is the sum of four rule headings at column 0:

```
$ grep -cE '^Instead\b' source/story.ni   # 778
$ grep -cE '^After\b'   source/story.ni   # 244
$ grep -cE '^Before\b'  source/story.ni   # 127
$ grep -cE '^Check\b'   source/story.ni   #  43
                                          # ---- 1192
```

Exact to the unit. **What it excludes** matters for anyone re-using the number:
`Report` (15), `Every turn` (42), and `Rule for` (201) are also authored rules and
are not in it. The full authored-rule count at column 0 is **1,450**:

```
$ grep -cE '^(Instead|Before|After|Report|Check|Every turn|Rule for)\b' source/story.ni
1450
```

Neither figure counts `Understand` lines (**409**), which are grammar rather than
response, or the seven `Table of …` blocks that hold rotating response text.

### 32 rooms — corrected to 84

**Where 32 came from.** A literal `grep 'is a room'` returns 35 lines; three of
them are not declarations (a `which varies` global at line 375, and two `if …
is a room` guards at 764 and 12394). 35 − 3 = **32**. The figure is a naive
grep, and it misses every room declared by any other means.

Inform 7 lets a room be declared five ways, and this source uses all of them:

| Declaration form | Count | Example |
| --- | --- | --- |
| `X is a room` | 32 | `The Chapel is a room.` (7323) |
| `X is a market stall` (kind of shop, kind of room, line 1823) | 12 | `Grubbers Market Hat Stall is a market stall and south of …` (2509) |
| `X is a store` (kind of room, line 4259) | 6 | `The Bakers Shop is a store, northwest of Commerce Street.` (4298) |
| `X is a Landing` (kind of room, line 367) | 4 | `The Third Floor Landing is a Landing, down from the Rooftop Garden.` (9074) |
| `X is a holding cell` (kind of room, line 7643) | 3 | `Jail-Cell is a holding cell.` (7761) |
| `X is a shop` (kind of room, line 1822) | 1 | `Grubbers Market Teishas Tent is a shop, north from …` (3005) |
| `X is <direction> of/from Y` — declares by map relation, no kind stated | 26 | `The Woods are north of the Crossing.` (6863) |
| | **84** | |

**Not counted as rooms**, though they carry room-like descriptions: the three
`estatefront` facades (Black Gate Estate, Red Gate Estate, Jacobs Family Mansion)
are a **kind of door** (line 4846), not rooms; the eleven `region` declarations
group rooms and are not rooms; the cell doors and the wooden door are doors.

**Why this matters beyond bookkeeping.** ADR-322 D13 argues Secret Letter is *not*
the performance sample because it is "12,635 lines over 32 rooms with a linear
spine [that] will likely sweep in milliseconds." Two of the three inputs to that
sentence are wrong by a factor of 2.6. The conclusion may well still hold — a
linear spine dominates room count for state-space purposes — but it now rests on
84 rooms, and D13 does not say that. This corpus is a separate effort from ADR-322
(David, 2026-08-21) and does not carry AC-10 or AC-11, so nothing here is
load-bearing for that ADR; the correction is recorded so that whoever amends D13
has the real number.

---

## 2. Rooms — 84, by book

The source's own `Book` headings are the chapter spine. Room names below are the
`printed name` where one is set, otherwise the internal name.

| Book | Rooms | |
| --- | ---: | --- |
| 1 — Prologue | 2 | The Alley, Outer Market Roof |
| 2 — Grubber's Market | 16 | Northwest Junction, Grocery Stall, Fruit Stall, Eastern Junction, Hat Stall, Leather Stall, Weapons Stall, Exotic Gems Stall, Herb Stall, Rope Stall, Candlemaker's Stall, Pottery Stall, Outside the Silk Tent, Inside the Silk Tent, Center Post (base), Top of the Post |
| 3 — Commerce Street | 5 | Commerce Street, Bakery, Butcher's Shop, Armory, East Commerce Street |
| 4 — Lord's Market | 4 | Lord's Market, Royal Tunic (clothier), Sandler & Sons (jeweler), Chorus Brothers (moneylender) |
| 6 — Meeting Bobby | 2 | Back Alley, Entrance to Maiden House |
| 5 — Maiden House | 6 | Hallway, Dormitory, Kitchen, Privy, Laundry, Behind Maiden House |
| 5B — Journey with Bobby | 12 | Market Square (night), Lord's Road, Pasture, Stream Crossing, The Woods, Clearing, Underneath the Fountain, Tunnel End, Chapel, Lower Bailey, Upper Bailey, Guardhouse |
| 6 — Jail | 5 | Jailhouse, Jail-Cell, Jail-Cell-2, Jail-Cell-3, Drain Room |
| 7 — The Sewers | 2 | Sewer, Access Tunnel |
| 8 — Black Gate Estate | 15 | Closed Alleyway, Rooftop, Rooftop Edge, Balcony, Patio, Rooftop Garden, Third Floor Landing, Music Room, Audience Area, Third Floor Balcony, Supply Closet, Second Floor Landing, Living Room, Master Bedroom, Library |
| 10 — Raid on Maiden House | 1 | Secret Closet |
| 11 — Red Gate Estate | 10 | Entrance Hall, Dining Hall, Kitchen, Great Hall, Cellar, Second Floor Landing, Office, Third Floor Landing, Master Bedroom, Bathroom |
| 12 — Ball | 3 | Southern Gate, Foyer, Ballroom |
| 13 — The Baron | 1 | War Room |
| | **84** | |

Books 9 (Bobby's Execution) and W/X/JAL declare no rooms of their own.

### The book numbering is not play order — a real trap

The source's `Book` numbers are **wrong and duplicated**, and reading them as a
sequence will build the game out of order:

- **`Book 6` appears twice** — "Meeting Bobby" at line 5603 and "Jail" at 7597.
- **`Book 5` (Maiden House, 5804) comes *after* `Book 6` (Meeting Bobby, 5603)** in
  the file, and Maiden House is indeed reached after meeting Bobby in play.
- **`Book 5B`** (Journey with Bobby, 6550) is a suffix, not a number.
- Within books, `Part` numbers repeat and skip freely (Book 2 has two `Part 2`s and
  two `Part 19`s; Book 11 has `Part 3` and `Part 3A`).

**File order is play order. Book numbers are not.** Use the table above, which is
in file order.

### Eleven regions

`Open-Air Market`, `Market Perimeter` (inside it), `The Tunnels`, `Greater Lord's
Keep`, `Lord's Keep`, `Prison Region`, `Sewers Region`, `Rooftops Region`, `Black
Gate Estate Region`, `Red Gate Estate region`, `occasionally crowded place`.

```
$ grep -nE 'is a region' source/story.ni
```

---

## 3. NPCs — 47 declared people, plus one animal

Named, conversable characters are marked **●**. The rest are scenery crowds,
guards, and generic stallkeepers.

**Grubber's Market** — ● Teisha (silk tent); ten generic stallkeepers (grocer,
fruit, hat, leather, weaponsmith, gems, herbalist, rope dealer, candlemaker,
pottery); the conspicuous shopper; group of mercenaries; mercenary captain;
wandering mercenaries; chasing mercenaries; **the monkey** (the source's only
`animal`, line 3841).

**Commerce Street** — ● Germaise the Baker; ● Old Man Holstenoffer (butcher);
● Olgan Minor (armorer).

**Lord's Market** — ● the clothier; ● Pieter (Sandler's guard, later bodyguard);
● Dame Sandler; ● the Chorus Brothers (plural-named, one conversational unit);
servants.

**Maiden House** — ● Widow Theresa; ● Widow Fiona; ● Widow Shannon; the orphans.

**Bobby** — ● declared at line 5635, present across Books 6, 5B, 9 and 13.

**Jail** — ● Jacobs (declared as "the prisoner", line 7930, improper-named until
introduced); ● Olmer (declared as "a bald headed man", line 8304, improper-named
until named); a skinny man.

**Black Gate Estate** — ● the Butler; ● Baron Fossville; ● Hester Rudup.

**Lord's Keep / Ball** — patrolling Lords Guards; Lords Guards checking invites; a
strings quartet; waiters; several mercenaries; and eight **ballgoers** (a kind of
person, line 11194): ● Jacobs the Elder, ● the Queen, ● the Princess, ● the Duke
of Inhyron, ● the Duchess of Inhyron, ● the Baron of Amhyron, ● the Earl of Bresa,
● the Prince of Gravesal.

The player is Jack Toresal — declared through `The player …` property lines
(1361, 1369, 1393) rather than as a named person object. Book JAL ("Jacqueline's
Section", line 12475) is marked *not for release*.

```
$ grep -nE '^(The |A |An |Some )?[A-Za-z][A-Za-z0-9'\''\- ]{0,45} (is|are) [^.]*\b(a man|a woman|a person|people|a stallkeeper|ballgoer|male|female)\b' source/story.ni
```

---

## 4. Conversations — 23 quip trees, 380 quips

This is the port's largest single body of work (plan Phases 6 and 7). Every
conversation is a menu-driven **quip tree**: quips are declared with a `menu text`
(what the player may choose) and a `display text` (what is said), wired together
by `response of` edges.

| Totals | | Command |
| --- | ---: | --- |
| quip declarations | 380 | `grep -cE '\bis an? [a-z-]*\s*quip\b'` |
| — of which `transitional quip` | 47 | `grep -c 'is a transitional quip'` |
| `menu text` lines | 298 | `grep -c 'menu text'` |
| `display text` lines | 401 | `grep -c 'display text'` |
| `response of` edges | 307 | `grep -c 'response of'` |
| `start conversation with` entry points | 40 | `grep -c 'start conversation with'` |

Quips are named by a per-conversation prefix, which is how the 23 trees separate:

| Prefix | Quips | Whose conversation | First at |
| --- | ---: | --- | ---: |
| `ST` | 9 | generic stallkeepers (shared by all ten) | 1884 |
| `TE` | 22 | Teisha | 3176 |
| `MONKEY` | 4 | the monkey | 3952 |
| `GE` | 19 | Germaise the Baker | 4390 |
| `HO` | 24 | Old Man Holstenoffer | 4421 |
| `OM` | 8 | Olgan Minor | 4763 |
| `CL` | 6 | the clothier | 5127 |
| `DS` | 48 | Dame Sandler — **the largest tree** | 5291 |
| `CB` | 8 | Chorus Brothers | 5484 |
| `BO` | 30 | Bobby | 5698 |
| `TH` | 11 | Widow Theresa | 5870 |
| `FI` | 31 | Widow Fiona | 6170 |
| `SH` | 16 | Widow Shannon | 6444 |
| `JA` | 30 | Jacobs (in jail) | 7964 |
| `OL` | 11 | Olmer | 8322 |
| `PI` | 12 | Pieter | 10826 |
| `JE` | 19 | Jacobs the Elder (at the ball) | 11266 |
| `PR` | 16 | the Princess | 11393 |
| `IN` | 16 | Duke & Duchess of Inhyron | 11487 |
| `AM` | 18 | Baron of Amhyron | 11611 |
| `BR` | 12 | Earl of Bresa | 11737 |
| `GR` | 7 | Prince of Gravesal | 11831 |
| `TRIG` | 1 | a trigger stub, not a conversation | 1452 |
| | **378** | (2 further quips are declared off-prefix) | |

**The Queen has no tree of her own** — she is a ballgoer with a description and no
quip cluster; her material sits inside `PR`.

**Three conversation models are visible in this source, and only one shipped.**
The Textfyre `Quips` extension is the shipped one. The archive also carries an
unused `Conversation Topics` extension (`extensions/Textfyre/Conversation Topics`),
commented out in the source. Chord's beat-thread model is a third model again —
which is why plan Phase 6 calls the mapping a **rewrite**, not a translation.

---

## 5. Objects — ~300 declarations

Object counting in Inform 7 is inherently approximate: one line can declare four
objects (`The northwest cable, the southwest cable, the northeast cable and the
southeast cable are cables and here.`), and property lines look like declarations.
The figure below counts **declaration lines**, and is a floor rather than an exact
object count.

```
$ grep -nE '^(The |A |An |Some )?[A-Za-z][A-Za-z0-9'\''\- ]{0,45} (is|are) (a |an |some )?[^.]*\b(scenery|backdrop|container|supporter|door|thing|wearable|merchandise|portable|fixed in place|part of|display|weapon|food|fruit|leatherware|silkware|hatstand|storage bin|cable|glyph|musical instrument|storefront|gate|player'\''s holdall|closed|open|locked|lockable)\b' source/story.ni \
  | grep -vE ':(Instead|Before|After|Check|Report|Every|Rule|Understand|To |Definition|Table|Carry|First|Last|This is)' \
  | grep -vE 'is an action|is a kind of' | wc -l
300
```

Spot-checked at 1-in-25: 14 of 15 sampled lines were genuine object declarations.

By category (`grep -c`, overlapping — an object can be scenery *and* a container):
scenery **68** + plural `are scenery` **54**; backdrops **18** + `are a backdrop`
**12**; doors **14**; supporters **11**; containers **10**; bare `is a thing`
**10**; merchandise **5**; wearable **4**; fixed in place **3**.

**24 kinds** are defined (`grep -nE 'is a kind of'`), of which the load-bearing
ones for the port are: `stall display` and its six subkinds (food stall display,
storage bin, hatstand, candle display, waxy display, pottery display), `pointy
thing` → `cable` and `glyph` (both encode a direction — the market cables and the
sewer symbols share one mechanism), `weapon`, `storefront`, `estatefront`,
`cell door`, `viewing window`, `musical instrument`, `gate`.

**Seven tables** hold rotating text: overheard mercenary utterances (1798),
landing locations (3830), Chasing Mercenary descriptions (4169), overheard
guardhouse conversation (7553), Jacobs's frustrated mutterings (8243), Butler's
dialogue (9565), widows meeting mercenaries (9968).

---

## 6. Scenes — 56

**17 are hint scenes** (lines 1065–1097), one per chapter, driving the FyreVM hint
channel: Grubbers, Commerce Street, Mulling, Maiden House, Nighttime, Lord's Keep,
Escaping Jail, Escaping Sewer, Rooftop, Search, Hanging, Raid, Red Gate, Preparing,
Dancing, Confrontation, Skirmish.

**39 are story scenes**, and these are the actual chapter spine — the linear chain
ADR-322 D13 describes:

Trouble in Grubbers · Eavesdropping on Soldiers · Avoiding Soldiers · Monkey
business · Final chase · Tent Escape · Pole Escape · Chase from Pole · Pole Problem
· Pole Destruction · Market Escape · Getting changed · Meeting Bobby · Bobby's
adventure · Creeping to Lord's Keep · Returning from Lord's Keep · Escaping Jail ·
Bobby's Voice · Jacobs's lockpicking attempt · Picking a Lock · Jacobs's Deception ·
Discussion of Drainage · Escape Through The Sewer · A New Morning · The Search ·
Bobby's Hanging · Bedside Consolation · Raid on Maiden House · The Banging · Hidden
in the closet · Leaving Maiden House · Shannon's company · The Bodyguard scene ·
Journey to the Ball · High Society · Brief respite · Brief Encounter · Confronting
the Baron · The Skirmish

```
$ grep -oE '^[A-Za-z][A-Za-z0-9'\''\- ]{0,40} is a scene\b' source/story.ni | wc -l
56
```

---

## 7. Puzzles, and the canonical solution path

**The source ships its own walkthrough.** `Book X - Walkthrough - Not for release`
(line 12397) holds 17 named `test` segments that chain into a complete playthrough.
This is the designers' own solution path, not a reconstruction, and it is the
single most useful artifact in the corpus for the port.

The spine, in order — `test walk1` → `test walk2` → `test walk3`:

| Segment | Covers | Puzzle content |
| --- | --- | --- |
| `test intro` | Book 1 | Climb to the roof, eavesdrop on the mercenaries, get down |
| `test market` | Book 2 | **Banana → monkey → necklace → Teisha → silk cloak**; escape by sliding down the northeast cable using the gray cloak |
| `test meeting` | Books 6/5 | Meet Bobby (menu conversation), Maiden House, sleep, out through the privy window |
| `test adventure` | Book 5B | Night journey to Lord's Keep; listen at the arrow slit |
| `test jail` | Book 6 (Jail) | **Search straw → wire → unlock cell door → unlock north door → lift grate** |
| `test sewers` | Book 7 | Navigate by sewer glyphs |
| `test rooftops` | Book 8 | Climb the gutter, cross the rooftops |
| `test blackgate` | Book 8 | **Turn winch → drop chandelier → get letter** |
| `test hanging` | Book 9 | Bobby's execution (largely non-interactive) |
| `test maidens` | Book 10 | The raid; hide in the secret closet; leave by the window |
| `test redgate` | Book 11 | **Climb wall → unlock with key → break furniture → wood → boiler → bath → dress** |
| `test sandler` | Book 12 | Dame Sandler conversation (the 48-quip tree) → take brooch |
| `test moneylender` | Book 12 | Show letter to the Chorus Brothers |
| `test clothier` | Book 12 | Buy ballgown |
| `test armory` | Book 12 | Buy dagger |
| `test ballgoing` | Book 12 | **Search underbrush → press bolt → search wall → pull brick → pull lever** (the secret passage into the Keep) |
| `test socializing` | Book 12 | Work the room: eight ballgoer conversations in a required order |
| `test warroom` | Book 13 | **Attack Fossville → cut ropes** |

Two of the designers' own puzzle diagrams survive in `diagrams/`: `Grubbers Market
Puzzle.vsd` and `Orphan Map.vsd`.

**A determinism hook already exists.** `Section Y - Fixing the sewers` (line 12440)
defines `xyzzy` / `unxyzzy` as out-of-world actions that seed the RNG to `1234` and
back to `0`. The walkthrough uses them to pin the market and sewer sequences. Chord
has its own seed pinning (`forces:` / `point-seed:`, ADR-293 Phase C), so this is a
precedent to match rather than port.

---

## 8. What the port has to build, in one line each

| Book | Rooms | Conversations | Notable |
| --- | ---: | --- | --- |
| 1 Prologue | 2 | — | Scripted eavesdrop; sets the whole plot |
| 2 Grubber's Market | 16 | `ST` (×10 stalls), `TE`, `MONKEY` | The market is a dense 12-stall grid; the chase scenes (6 of the 39 story scenes) all live here |
| 3 Commerce Street | 5 | `GE`, `HO`, `OM` | Three shopkeepers, three trees |
| 4 Lord's Market | 4 | `CL`, `DS`, `CB` | `DS` is the largest tree in the game |
| 6 Meeting Bobby | 2 | `BO` | |
| 5 Maiden House | 6 | `TH`, `FI`, `SH` | Three widows |
| 5B Journey with Bobby | 12 | — | The longest room run with no conversation |
| 6 Jail | 5 | `JA`, `OL` | |
| 7 Sewers | 2 | — | Glyph navigation |
| 8 Black Gate Estate | 15 | — (Butler dialogue is a table) | Second-largest room block |
| 9 Bobby's Execution | 0 | — | Cutscene |
| 10 Raid on Maiden House | 1 | — | |
| 11 Red Gate Estate | 10 | — | |
| 12 Ball | 3 | `PI`, `JE`, `PR`, `IN`, `AM`, `BR`, `GR` | Seven trees in three rooms — conversation-dense, room-sparse |
| 13 The Baron | 1 | — | |

---

## 9. Method and limits

- Everything is measured from `source/story.ni`. `story-sh-1.2.ni` differs by 21
  lines and was not separately inventoried.
- Counts come from `grep`/`python3` over the text, not from compiling the source —
  no Inform 7 toolchain was run. Room and NPC lists were assembled by extraction
  and then read by eye; object counts are declaration-line counts and are stated
  as approximate above.
- The design documents in `design/` and the dialogue tables in `dialogue/` were
  **not** consulted for any figure here. Where they describe content the source
  does not implement, the source wins.
