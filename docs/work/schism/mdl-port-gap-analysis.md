# Dungeo Port ↔ 1981 MDL — Definitive Gap Analysis

**Date:** 2026-07-15 · **Session:** 5c4f8a (chord-foundations) · **Canon:** the 1981-07-22
Mainframe Zork MDL in `docs/internal/dungeon-81/` (David, 2026-07-15 — `patched_confusion/` =
Russotto's run-under-Confusion patch of that MDL; `original_source/` = pristine versioned
originals). The port under audit is `stories/dungeo/src/`.

## How this was produced (and why it's trustworthy this time)

Ten parallel **paired-read** auditors, each covering one MDL slice, under one non-negotiable
rule: **a gap claim requires BOTH an MDL citation (file:line) AND the specific port
searches/files that demonstrate absence.** The port was presumed faithful; "the port already
does this" was the expected default. This is the correction to the reverted cd869e audit,
which guessed at gaps from the MDL alone without opening the port. Slices: `dung.mud` ×3,
`act1`–`act4`, `melee`, the verb-vocabulary corpus (`syntax`/`parser`/`rooms`), the full
CEVENT/daemon registry, and the NPC actor layer. The vocabulary auditor additionally tested
empirically against `--play`.

**Scope note.** This extends `dungeo-completeness-matrix.md` (P23–P33) and the ADR-222 seam
catalog (DZ-1…11). It does not invent a competing primitive taxonomy — it supplies the
grounded evidence the port-derived matrix could not see, and surfaces **one candidate new
primitive shape** (the timed *window*, §3).

**Excluded (per canon ruling):** the gnome (David's intentional drop). **Confirmed, not
re-derived:** the six known fidelity findings from the completeness matrix (cyclops
feed/thirst, coal-basket weight gate, river auto-drift, mirror teleport collapse, exorcism
ordering, endgame condition-gated victory).

---

# Section 1 — MDL Missing-Features Audit

Findings grouped by mechanic family, most structurally significant first. Verdicts:
**MISSING** (absent), **DIVERGENT** (present but behaves differently), **PARTIAL** (core
present, surrounding behavior absent). Every row is paired (MDL cite ↔ port evidence) in the
auditor records folded into `session-20260715-1330-chord-foundations.md`; representative
cites shown.

## 1A. Death traps & treasure-ruin actions (the port's largest thematic gap)

Zork's texture is that *almost anything can kill you or ruin a treasure*. The port
implements the puzzle-critical deaths but dropped most of the punitive/easter-egg ones.

| Feature | MDL | Port | Verdict |
|---|---|---|---|
| **Rusty knife** — take-with-sword blue pulse; attack with it → death (knife turns on wielder) | act1.mud:339-352 | plain item "useless as a weapon", no trait | **MISSING** |
| **Black book burn** → "Wrong, cretin!… pile of dust" (death); open/close special lines | act1.mud:1846-1857 | ReadableTrait only, no Burnable | **MISSING** |
| **Bodies desecration** — mung/burn → spawns head-on-pole in LLD2, death, toggles room desc | act1.mud:1835-1844 | "bodies" object + mechanic absent | **MISSING** |
| **Painting mung** → "worthless piece of canvas", OTVAL→0 (permanent treasure ruin) | act1.mud:1859-1866 | plain treasure, no destroy path | **MISSING** |
| **Skeleton curse** — disturb bones → all room+carried valuables teleport to Land of the Dead | act1.mud:354-366 | plain scenery; trivia *about* it is ported, curse is not | **MISSING** |
| **Leaf-pile burn while carried** → death ("neighbors put you out"); also grate-reveal gating | act1.mud:257-274 | plain scenery, grating ungated | **PARTIAL** |
| **Brush teeth with putty** → respiratory-failure death | act1.mud:1463-1478 | no BRUSH verb | **MISSING** |
| **Flask of poison** (Pool Room) — drink/open → poison death | dung.mud:4786-4796, act3.mud:148 | flask object absent | **MISSING** |
| **Wave stick while ON the rainbow** → dissolve, fall to death | act2.mud:196-200 | waving there just toggles the rainbow | **MISSING** |
| **Barrel + GERONIMO** — ride barrel over the falls → death; interior "Geronimo!" etch | act2.mud:214-225, 375-379 | bare enterable container, verb absent | **MISSING** |
| **5th dig** at the beach → hole collapses, death, statue reburied | act2.mud:349-363 | over-dig → "nothing here" | **PARTIAL** |
| **Guardians of Zork** — walk/attack/box-wobble/broken-mirror/pine-door-in-view → death | act4.mud:272-615 | prose in a room desc; unconditional S exit walks past | **MISSING** |
| **Machine Room electrocution** — player pushes any button → "fried to a crisp"; zoom+flip spin-death | act3.mud:167-227 | only triangular button; push → polite "too small for your finger" | **MISSING/DIVERGENT** |
| **Cyclops wrath** — attack/provoke → escalates → eaten after ~5 turns (CYCIN clock) | act1.mud:924-983 | attacks route to generic melee | **MISSING** |
| **Attack self** → "Is suicide painless?" death | melee.mud:186-189 | stdlib refusal | **DIVERGENT** |
| **kick bucket / kill self / play <villain>** → death easter eggs | act3.mud:46-51,295-305,1386-95 | absent | **MISSING** |

## 1B. Timed-window pressure (a distinct shape — see §3 candidate primitive)

The port has *fuses* (lantern, candles, flood, brochure) but systematically dropped MDL's
*deadline windows*: armed on a trigger, fire a consequence (death/reset) after N turns
**unless** cancelled.

| Window | MDL | Port | Verdict |
|---|---|---|---|
| **Bank vault alarm** (SCLIN 6) — in the Vault when the pass expires → alarm death | act3.mud:461-491, dung.mud:611-615 | bank daemon only blocks exits while carrying treasure | **MISSING** |
| **Mirror-door** (MRINT 7) — button opens mirror 7 turns then "swings shut", button pops | act4.mud:475-487 | `stoneButtonPressed` permanent, no window, **no consumer of the flag at all** | **MISSING/PARTIAL** |
| **Pine-door** (PININ 5) — auto-closes 5 turns after pushed | act4.mud:568-607 | mirror-box reworked; no timer | **DIVERGENT** |
| **Quiz re-ask** (INQIN 2) — booming voice repeats the question every 2 turns | act4.mud:694-747 | knock re-shows instead | **PARTIAL** |
| **Exorcism windows** (XBIN 6 / XCIN 3) + **hot bell** (XBHIN 20, untakeable/burns/water-cools) + candle-drop side-effect | act1.mud:536-606 | three booleans, no timers, no HBELL object | **MISSING** (beyond the known ordering item) |
| **Match lifecycle** (MATIN 2) — 5-match count, 2-turn burn, is a real light source | act1.mud:1901-18, dung.mud:5110 | IdentityTrait+Readable only; `light-action` never checks the tool is lit → candles light off a cold matchbook | **MISSING** |
| **Slide rope-grip** (SLDIN, weight-scaled) — rope-to-timber gate + grip timer | act3.mud:1179-1362 | slide freely walkable both ways; no tie mechanic | **MISSING** |

## 1C. Object transform / spawn / conceal (P23 / P22)

| Feature | MDL | Port | Verdict |
|---|---|---|---|
| **Machine puzzle** — needs screwdriver + lid closed; non-coal → gunk (crumbles to dust); reusable | act2.mud:102-158 | coal→diamond only; no screwdriver/lid check; one-shot; no gunk | **PARTIAL** (3 of 4 rules gone) |
| **Pot of gold** — invisible until rainbow solidified | act2.mud:186-192 | visible at world-build **and reachable overland via Canyon Bottom** → puzzle bypass | **MISSING** |
| **Round-room steel box** — Stradivarius invisible until triangular-button "dull thump" | act3.mud:217-227 | box+violin visible from start | **DIVERGENT** |
| **Library decoy books** — 3 GREEK-TO-ME decoys make the stamp a search puzzle | dung.mud:2810-17 | port hands you the right book | **PARTIAL** |
| **Up-a-tree drop physics** + broken-egg/broken-canary pair on forced open | act3.mud:546-633 | thief-open path present; drop physics + broken pair absent | **MISSING** |
| **Alice-cake flask** + magnified-icing reading (read icing through flask/bottle) | act3.mud:79-165 | cakes carry static icing names → magnifier riddle bypassed; flask absent | **PARTIAL** |
| **Boat puncture** — punctured boat won't inflate; PLUG with putty repairs | act2.mud:227-241 | puncture only changes description; re-inflates immediately; no putty | **PARTIAL** |
| **Maintenance flood** — tube-of-gunk → putty → seal leak (permanent stop) | act1.mud:751-763, dung.mud:5862 | flood is escape-or-drown only; blue button "jammed"; no tube/leak object | **MISSING** |

## 1D. Conditional exits / carried-object gates (P25 / ADR-220)

| Gate | MDL | Port | Verdict |
|---|---|---|---|
| **Coffin transport** — 6 exits blocked while carrying the gold coffin | dung.mud:1953-2079 | unconditional; `volcano.ts:232` = `// TODO: implement coffin check` | **MISSING** |
| **White-cliffs deflate gate** — can't carry inflated boat down the narrow path | dung.mud:2596-2605, act2.mud:177-180 | WCB1↔WCB2 unconditional | **MISSING** |
| **House→forest exits** — West-of-House→W, South-of-House→S open to forest | dung.mud:1587-1609 | both omitted | **MISSING** |
| **Rainbow one-sided** — walkable only when solidified, both ends | (CEXIT both ends) | End-of-Rainbow→W unconditional | **DIVERGENT** |
| **Forest self-loops** — 5-room getting-lost trap | dung.mud:1678-1737 | 4 linear paths (poss. intentional redesign) | **DIVERGENT** |

## 1E. Light & darkness (P26 / P27)

| Feature | MDL | Port | Verdict |
|---|---|---|---|
| **Lantern budget** — 350 + staged warning table = 464 turns, 5 warnings | dung.mud:4955, act1.mud:1874 | 330 total, 2 thresholds | **DIVERGENT** |
| **Candle budget** — 50 + 35 warning stages = 85 turns | dung.mud:5231, act1.mud:1897 | 50 total, warnings at 15/5 | **DIVERGENT** |
| **Cave2 windy blowout** — carried lit candles blow out on entry (PROB 50-80) | act1.mud:1981-92 | absent | **MISSING** |
| **Sooty-room stove** — lights the room (RLIGHTBIT), untakeable, a flame source | dung.mud:6459, act3.mud:1364 | no stove; room is **dark** | **MISSING** |
| **Gallery self-lit** (RLIGHTBIT) | dung.mud:1799-1807 | dark (createRoom default) | **DIVERGENT** |
| **Torch turn-off** → "You burn your hand…" (stays lit) | act1.mud:409-411 | effect preserved, message generic | **DIVERGENT** |

## 1F. NPC / actor behavior (→ ADR-223 / FZ-P1)

| Feature | MDL | Port | Verdict |
|---|---|---|---|
| **No unified actor layer** — one VILLAINS table + ACTORBIT/OACTOR drives generic HELLO/TELL/melee | dung.mud:6502, act1.mud:1561 | bespoke per-NPC behaviors, no shared interaction seam | **architectural** |
| **Cyclops invulnerability** — attack → "ignores injury with a shrug"; poke/take/tie flavor | act1.mud:962-972 | `CombatantTrait({health:30})`, killable villain | **DIVERGENT** |
| **Generic HELLO** — villain-bow, hello-sailor easter egg, schizophrenic non-actor line | act1.mud:1561-81 | single `hello troll` mapping | **PARTIAL** |
| **Give-to-robot / destroy-robot** — robot carries gifts; can be wrecked (strands carousel) | act3.mud:307-322 | neither; robot has no receiving/combat | **MISSING** |
| **Robot command flavor** — eat/drink "no mouth", read "vision not acute" | act3.mud:285-293 | collapsed to generic "stupid robot" | **PARTIAL** |
| **Thief sacred-room avoidance** (RSACREDBIT confines thief underground) | dung.mud (surface rooms) | no sacred concept; thief wanders unfiltered | **MISSING** |
| **Dead spirit mode** — walking-dead player state + pray-at-altar resurrection | act3.mud:1455-1504 | FORTRAN −10/2-death model (see §1I) | **MISSING** |
| **Spirits attack-response** — "How can you attack a spirit with material objects?" | act1.mud:632-638 | no attackable spirit entity | **MISSING** |
| **Bat drop set** — MDL scatters within the coal mine (9 rooms) | dung.mud:470-479, act2.mud:42-54 | scatters across the whole underground | **DIVERGENT** |
| **Dungeon Master flavor** — death-on-attack, catch-up-follow, cell refusal | act4.mud:764-860 | follow/stay/dial present; flavor absent | **PARTIAL** |

## 1G. Teleport / multi-room puzzles (P24 / P33)

| Puzzle | MDL | Port | Verdict |
|---|---|---|---|
| **Bank of Zork** — entry-direction sets 4-way curtain destination + SCOL wall-chain retarget; vault-alarm death | act3.mud:377-491, dung.mud:3040-3106 | fixed 2-state wall toggle; alarm = carry-treasure exit block | **DIVERGENT** |
| **Mirror-box transport** — slides between hallway-segment rooms, corridor-blocking, timed door windows | act4.mud:114-637 | position int inside one room → box is **optional** | **DIVERGENT** |
| **Prison-cell rotation** — 8 cells, contents-swap, DM-operates-while-you're-in-cell-4 co-op | act4.mud:873-1048 | single room + visibility toggle, solvable solo | **DIVERGENT** |
| **Palantir** — look into a sphere → view the room of the next sphere in the chain | act3.mud:1062-1095 | spheres present; look-in absent | **MISSING** |
| **TEMPLE/TREASURE verbs** — Temple↔Treasure-Room teleport shortcut | act1.mud:1422-1432 | absent (`xyzzy`/`echo`/`ulysses` present) | **MISSING** |
| **Wishing well** — make-a-wish (destroys coins) + throw-into-well relocation | act3.mud:1397-1416 | absent | **MISSING** |
| **Royal Puzzle steel-door branch** — card-slot alternate exit + entrance-blocking wall | act3.mud:713-914 | grid math present; door/slot/block branch absent | **MISSING** |

## 1H. Verbs & parser (mostly platform-level — see §3)

**Missing meta/utility verbs:** `OOPS`, `FIND`/`WHERE IS`, `TIME`, `VERBOSE`/`BRIEF`/
`SUPERBRIEF` (stdlib meta-registry *reserves* the IDs but no grammar defines them),
`SCRIPT`/`UNSCRIPT`, `TAKE VALUABLES`/`POSSESSIONS`, `?`→help. **Missing content verbs:**
`COUNT` (the 69,105-leaves gag), `PLAY` (violin worthless-trap), `SHAKE` (spoils the buoy
"something inside" hint), `SWIM`, `BRUSH`, `GERONIMO`, joke verbs (CHOMP/FROBOZZ/WIN/YELL/
climb). **Parser shape gaps:** postposed particles (`pick mat up`, `put mat down` both fail
today), `take everything` (lang-en-us declares `allWords:['all','everything','every']` but
the entity-slot-consumer hardcodes `'all'` — declared synonyms are dead config), classic
`ROBOT, GO EAST` comma-address (grammar can't start with a slot; `tell robot to X` works),
missing-object orphaning (`take` → "Take what?" → answer completes). **Present/faithful:**
AGAIN/g, THEN-chaining, all/except/and, pronouns (richer than MDL), implicit take,
ROOM/RNAME/OBJECTS/DIAGNOSE, BOARD/DISEMBARK, quoted SAY.

## 1I. FORTRAN-lineage divergences (confirm keep-or-restore)

The port repeatedly follows the later **FORTRAN "Dungeon"** where it differs from the 1981
MDL — usually with a code comment saying so. Under the canon ruling these are **divergences
from canon**, but they look deliberate; each wants a conscious keep-or-restore call rather
than a silent fix.

| Subsystem | MDL canon | Port (FORTRAN) |
|---|---|---|
| Death model | walking-dead spirit + resurrect | −10 pts, 2 deaths → game over |
| Lantern fuel | 464 (350 + warnings) | 330 |
| Endgame/crypt trigger | score-gated wraith herald (EGHER 15) + endgame flag | darkness + wait, `setMaxScore(616)` unwatched |
| Crypt geometry | separate Crypt room + door epitaph | folded into Tomb (port comment wrongly says MDL has no separate crypt) |
| Trivia | 15-question pool, 3 drawn | 8 questions, +3 mod 8 |
| INCANT | one-shot username cipher | ENCRYP challenge-response |

## 1J. Scoring

- **Rank tables MISSING** — MDL's Beginner→…→Wizard main ladder and the endgame
  Cheater→Dungeon Master ladder (rooms.mud:862-879) fall through to the generic stdlib
  `computeRank` (Novice/Amateur/Proficient/Expert/Master).
- **Score-gated endgame entry MISSING** — §1B/§1I; `setMaxScore(616)` exists, nothing
  watches it.
- **FDOOR/BDOOR label question** — the two scoring systems (main RVAL vs endgame milestones)
  attach 15/20 to different rooms; both sum to 100 but one mapping looks shifted one room.
  Flagged for a data check, not yet a confirmed bug.

## 1K. Faithful subsystems (surprising confirmations — the port is strong here)

The **melee engine** is near-perfect (tables, strengths troll 2/thief 5/cyclops 10000,
best-weapon table, wound model, cure daemon, diagnose). Also faithful: full **maze graph**
edge-for-edge, **LOAD/weight** system (platform-enforced incl. nested), explosion-chain
constants, flooding levels, brochure mail-order, cage-poison + robot-crush death, balloon
timing, sword-glow, thief/fight demons, all room-entry RVAL values, treasure point values,
trapdoor slam, chimney load-gate, echo→platinum-bar, glacier melt-death, Sinbad/Odysseus
flee, the **Royal Puzzle grid math itself** (movement, orthogonal-clearance, push, ladder).

---

# Section 2 — Alignment Reconciliation (IF-Native / non-IF)

The striking result: **almost every gap is IF-native**, and **the audit produces no new
primitive family** beyond the DZ-1…11 catalog — it supplies overwhelming evidence for it,
plus **one candidate new shape** (2A-★). The IF/non-IF line (= the Chord-primitive / hatch
line, ADR-222 §3) falls exactly where the completeness matrix predicted: only the Royal
Puzzle solver and INCANT cipher are non-IF, and both are already present/hatched.

## 2A. IF-native → Chord primitives (maps onto the existing catalog)

| Gap family (Section 1) | Primitive | Status |
|---|---|---|
| 1A death traps | **DZ-6 (P28) conditional death** — location+verb-allowlist, item×state×room, provoked | catalog entry exists; audit is its evidence base |
| 1A treasure-ruin (painting, violin) | **DZ-9 (P32) scoring variants** — negative/zeroing award | extends FZ-G3 |
| 1B timed windows | **★ candidate NEW: "timed window"** — arm-on-trigger → deadline consequence unless cancelled; distinct from the existing fuse (a fuse has no cancel-condition and no *window* semantics). Covers vault alarm, mirror/pine door, exorcism, match, grip. | **NEW — propose as DZ-12**, or a documented composition of scheduler + DZ-6 |
| 1C transform/conceal | **DZ-1 (P23) entity transform/spawn** + **P22 conceal/reveal** | catalog entries exist |
| 1D conditional exits | **DZ-3 (P25) runtime exit mutation** + ADR-220 carried-object gate | ROADMAP-extend |
| 1E light/darkness | **DZ-4 (P26) light fuel** + **DZ-5 (P27) darkness** + a room-light-source (stove/gallery) | catalog + a small "room lit by an entity" note |
| 1F NPC/actor | **DZ-7 (P29) commandable NPC** + **DZ-8 (P30) actor-conditioned verb** — but the cyclops and the missing generic HELLO/TELL are really the **ADR-223 four-layer** refactor, §3 | ROADMAP + ADR-223 |
| 1G teleport/multi-room | **DZ-2 (P24) teleport actor** + **DZ-10 (P33) vehicle** (mirror-box, prison-cell) | catalog entries exist |
| 1H content verbs | Chord `define action` (COUNT, PLAY, SHAKE, SWIM, GERONIMO) | EXISTS — story-authorable |
| 1J rank tables | **DZ-9 (P32)** goal/rank ladders | extends FZ-G3 |

## 2B. non-IF → hatch (`define … from`), by design

| Gap | Why non-IF | Home |
|---|---|---|
| Royal Puzzle steel-door/entrance-block branch | same spatial-algorithm puzzle as the (present) grid | **HATCH** — extend the existing TS handler, not a Chord primitive |
| INCANT cipher | cryptography | **HATCH** (already present as FORTRAN ENCRYP) |
| Palantir remote-view | renders another room's description on demand — a *view*, arguably IF-native (it's "look", extended) | **IF-native leaning** — a `reveal-view` primitive, but low priority; flag for David |

## 2C. Platform-level (neither story-Chord nor hatch — the Sharpee surface itself)

1H's meta-verbs and parser shapes are **not** story content — they belong to
`packages/stdlib` and `packages/parser-en-us`. They are Section 3 material: closing them
makes *every* story (and both authoring surfaces) better. This is the ADR-222 elegance-parity
mechanism pointing at the platform, not at Dungeo.

---

# Section 3 — Architecture Impact Statement (one-way ratchet)

Per ADR-222/214: close a seam by promoting the elegant pattern to a first-class Sharpee
primitive, so the canon TS **and** Chord both express it cleanly, and existing zoo/dungeo
code stays valid or needs only mechanical migration. The audit points at **five** platform
seams, in priority order.

### S-1 — The four-layer NPC refactor (ADR-223) is now over-determined
The NPC auditor's core finding — **no unified actor layer**, and the **cyclops mis-modeled
as a killable combatant** when MDL makes him invulnerable-with-flavor — is exactly the
AGENT / AUTOMATION / CREATURE-STATE / PERSONHOOD disentangling ADR-223 already proposes. The
generic HELLO/TELL/give machinery fell through *because* there is no shared actor-interaction
seam to host it. **Impact:** ADR-223 is the highest-leverage platform work the audit
surfaces; the cyclops is a clean creature-state test case (alive/conscious/hostile ≠
combatant). Ratchet: base kind `person`/`animal` + automation layer, per the existing
grounded blast-radius (~13 modules, 85+ files).

### S-2 — A first-class "timed window" scheduler surface (candidate DZ-12)
The port has fuses but no *window*: "arm on trigger → after N turns fire a consequence unless
a cancel-condition is met." MDL uses this everywhere (vault alarm, mirror/pine doors,
exorcism, match, slide grip). Today the port hand-rolls each (or drops it — note
`stoneButtonPressed` has *no consumer*). **Impact:** promote a `SchedulerService` window
primitive + a Chord surface (`after N turns, unless <cond>: <consequence>`). Closes ~7
Dungeo gaps at once and is generic (a bomb timer, a parking meter). **Proposal:** log as
DZ-12 + a ratchet candidate; needs David's ruling on whether it's a new primitive or a
documented scheduler+DZ-6 composition.

### S-3 — Parser ergonomics in `parser-en-us` (postposed particles, comma-address)
`pick mat up` / `put mat down` fail; `ROBOT, GO EAST` can't be expressed because a grammar
pattern can't start with a slot. **Impact:** these are `parser-en-us` grammar-engine limits,
not story gaps — closing them is pure platform ratchet (every story gains the phrasings).
Comma-address specifically blocks the canonical Zork actor-command form and ties to S-1.

### S-4 — Meta-verb layer in `stdlib` (VERBOSE/BRIEF/OOPS/FIND/TIME/SCRIPT)
stdlib's meta-registry already **reserves** `verbose`/`brief`/`superbrief`/`transcript` IDs
but no grammar defines them — a half-built seam. `OOPS` and `FIND` are absent entirely.
**Impact:** these are standard IF meta-commands every story wants; they belong in stdlib +
parser core, not re-authored per story. Low blast radius, high polish payoff.

### S-5 — `lang-en-us` `allWords` is dead config (a latent bug + seam)
`allWords:['all','everything','every']` is declared but the entity-slot-consumer hardcodes
`'all'`, so `take everything` fails. **Impact:** wire the consumer to the declared synonym
list — a one-line correctness fix that also removes a Chord/TS elegance gap. Also fold the
three incidental port bugs (below) — they're not canon gaps but they're real.

### Incidental port bugs (not canon gaps; fix independently)
1. `gas-room-handler.ts:144-159` — leftover `console.error` fires on **every** parsed command.
2. `troll-daemon.ts` wake path leaves `meleeVillainUnconscious=true` + negative strength →
   next attack auto-kills an *awake* troll and he can't fight back.
3. `scheduler-setup.ts:129` — the bat drop pool includes the endgame **Narrow Corridor**,
   letting the bat teleport a mid-game player into endgame geography.
4. `balloon-daemon.ts:137-148` — crash pushes a player-died event even when the player isn't
   aboard.
5. `melee.ts:229-235` — stagger→lose-weapon rolls with no weapon check → cosmetic false
   "weapon knocked to the floor" against the unarmed cyclops.

---

# Bottom line

The port is **mechanically strong on the puzzle-critical spine** (melee, maze, weight,
scoring values, the hard set-pieces) and **thin on Zork's punitive/flavor texture** — death
traps, treasure-ruin, timed-window pressure, generic actor interactions, and the meta-verb
layer. Nothing found is a *new* Chord-primitive family: the IF/non-IF line holds, and the
DZ-1…11 catalog absorbs everything except **one candidate new shape (the timed window,
S-2/DZ-12)**. The heaviest platform lever is **ADR-223** (S-1), now independently confirmed
by the cyclops mis-modeling. Four smaller platform seams (S-2…S-5) are pure one-way-ratchet
wins that improve every story, not just Dungeo.

**Decisions this report needs from David:**
1. **§1I FORTRAN-lineage** — keep or restore, per subsystem (death model, lamp fuel, crypt,
   trivia, INCANT).
2. **S-2 timed window** — new primitive (DZ-12) or documented scheduler+DZ-6 composition?
3. **Forest self-loops (§1D)** — intentional map redesign, or restore the getting-lost trap?
4. Priority ordering across S-1…S-5 (ADR-223 is the obvious first, but it's the largest).
