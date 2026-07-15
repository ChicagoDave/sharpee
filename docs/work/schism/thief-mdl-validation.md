# Chord thief — validated against the original MDL (Dungeon-81)

**Source:** the 1981 Dungeon MDL in-repo at `docs/internal/dungeon-81/patched_confusion/`
— daemon `ROBBER` + handler `ROBBER-FUNCTION` (`act1.mud:1062-1420`), THIEF object +
`THIEF-MELEE` + descriptions (`dung.mud`), melee engine (`melee.mud`), robbing helpers
(`util.mud`).

**Purpose:** does the daemon model + Chord kit actually capture the *canonical* thief, or
was the pure-Chord sketch (`code-examples.md §3`) wishful? Verdict: **the sketch was too
optimistic** — combat is genuinely "access" (the existing **melee plugin**), but the
*daemon* behavior surfaces a concrete, bounded set of new requirements below.

Legend: **COVERED** (my sketch already) · **CHORD** (expressible with existing kit) ·
**GAP** (needs a daemon primitive or Chord-expressiveness add) · **PLUGIN** (the melee
plugin — access, not reimplemented).

---

## A. Combat = the melee plugin (access) — not reimplemented

The whole `THIEF-MELEE` array (`dung.mud:1031-1081`) — 9 result classes × multiple lines
(miss / knock-unconscious / kill / light- & serious-wound / stagger / disarm / hesitate /
sitting-duck) — plus the shared result-selection tables (`DEF1..DEF3`) and the
strength/initiative math (`melee.mud`) are **the existing melee plugin's** concern. The
thief just supplies: **stats** (`OSTRENGTH 5`, best-weapon = knife) and its **melee
message set** (the `THIEF-MELEE` lines, authored as the thief's plugin data). So in Chord:
`use melee` + `combatant with strength 5` + an authored melee-message block. **PLUGIN** —
no Chord combat logic. This is the "access, not implementation" rule doing its job.

The melee-adjacent hooks the *daemon* still owns (below): initiative to *join* a fight
(`1ST?` `PROB 20 75`), **fleeing when not `WINNING?`**, unconscious/revive narration,
and the **engrossed strength-cap** (`VILLAIN-STRENGTH` caps him at 2 the round after a
gift, `melee.mud:156-159`).

---

## B. Daemon behavior — MDL branch → Chord expressibility

| # | MDL behavior (trigger, prob) | Chord | Note / requirement |
|---|---|---|---|
| 1 | **Wander** room-to-room every *other* tick, skipping sacred/endgame/non-land rooms (`act1.mud:1233-1247`) | **GAP** | movement primitive `wanders` **+ room-filtering** ("avoiding sacred/endgame rooms") **+ every-other-turn cadence** |
| 2 | **Appear**, leaning against the wall (`PROB 30`, `1107-1115`) | **GAP** | needs an *arbitrary probability* (30%), not just `one chance in N`; + a "become present/announced" concept (Z3 `present`/`entered` channels get close) |
| 3 | **Rob the room** it's in (`ROB-ROOM`, `PROB 75`/`100`) — takes visible, takeable, **non-sacred** items (`util.mud:116-130`) | **CHORD + GAP** | `each loose-treasure → move` (COVERED) **but** needs a **`sacred`/untouchable marker** (some items can't be stolen) and, in the maze, value-0 items too |
| 4 | **Rob the adventurer** — strip all positive-value non-sacred carried items (`ROB-ADV`, `util.mud:104-112`) | **CHORD + GAP** | `each [treasure the player holds and not sacred] → move to it`; same `sacred` marker + a "the player holds it" condition |
| 5 | **Deposit** loot in the lair (Treasure Room), **open the egg** (`1079-1100`) | **CHORD** | `on every turn while it is in the Treasure Room: each [carried treasure] → move the match to the Treasure Room`; egg-open = an effect |
| 6 | **Flee** a fight when losing (`WINNING?`, `1116-1126`) | **GAP** | requires **querying melee-plugin state** ("am I winning?") from a daemon clause, then `change`/leave |
| 7 | **Initiative** to join a fight (`1ST?`, `PROB 20 75`) | **GAP** | arbitrary probability + a melee-plugin "engage" action |
| 8 | **Drop worthless cruft** while wandering (`PROB 30 70`, `1248-1259`) | **CHORD** | `each [worthless carried] → drop when [prob]` (pending arbitrary-prob) |
| 9 | **Leave having taken nothing / took something** variants (`PROB 30`, `1128-1165`) | **CHORD** | conditional phrases on whether a steal occurred; needs "did I take anything this turn" state |
| 10 | **Steal from a seen room in the maze**, musing aloud (`PROB 40` then `PROB 60 80`, `1196-1213`) | **CHORD** | nested probabilities + a broadcast phrase ("off in the distance…") |

## C. Interaction handler (`ROBBER-FUNCTION`) — player-initiated

| # | MDL (trigger) | Chord | Note |
|---|---|---|---|
| 11 | **Attacked** → retrieve stiletto, engage (`FGHT?`, `1264-1270`) | **CHORD** | `on attacking it` (interceptor exists) |
| 12 | **Given/thrown a valuable** → **engrossed**, strength-capped next round (`1356-1359`) | **GAP** | `on giving it`/`on throwing it at it` + set a state + **melee strength modifier for one round** (plugin interaction) |
| 13 | Given a **worthless** item → pockets & thanks (`1360-1362`) | **CHORD** | value-conditional `on giving it` |
| 14 | Given the **lit bomb/brick** → refuses, insults (`1350-1352`) | **CHORD** | conditional on the item |
| 15 | **Knife thrown**, `PROB 10 0` → frightened, flees, bag spills (`1320-1329`) | **GAP** | `on throwing it at it` + arbitrary prob + drop-bag effect |
| 16 | **Knocked unconscious** (`OUT!`) / **revives** (`IN!`) (`1298-1311`) | **GAP** | reacting to melee-plugin unconscious/revive transitions from Chord |
| 17 | **Killed** → drops booty; in lair, treasures reappear (`DEAD!`, `1274-1294`) | **GAP** | a **death hook** (`on dying`?) that drops carried items; death-fog is PLUGIN |
| 18 | **Take the thief** → "Once you got him, what would you do with him?" (`1363-1365`) | **CHORD** | `on taking it → refuse` |
| 19 | Enter his **lair** → he rushes to defend; guards the chalice; treasures vanish (`1387-1420`) | **CHORD** | room `on entering it` + `on taking` guards |

---

## D. Phrases — all authorable, but there are ~30

Every narration line (§3 of the extraction) is an ordinary Chord **phrase**: the two
descriptions (conscious/unconscious), appearance, the four "wandered through / robbed you
blind / found nothing / lean-and-hungry" variants, "left you in the dark", the maze
"off in the distance… wonder what this fine X is doing here", "you notice the X vanished",
"dropped a few items he found valueless", retrieve-stiletto, the give/engross/thank/refuse
set, the knife-throw pair, unconscious-greeting, revive, take-refusal, lair-defense,
treasures-vanish, and death. **No phrase is a gap** — but the thief is a *big* authored
text object (≈30 phrases), several **gated on transient per-turn facts** ("did I steal
this turn", "am I on-stage", "is the room now dark"). The MELEE lines (§4) are **plugin
data**, authored as the thief's melee message set.

---

## E. What this validation actually surfaces (the honest correction)

My earlier claim — *"the thief is ~85% pure Chord; the only gap is movement primitives"* —
was **too optimistic**. Against the real thief, the picture is:

- **Combat: fully access** (the melee plugin). ✅ genuinely not Chord's problem.
- **The daemon layer + Chord need a concrete capability set** the sketch glossed:
  1. **Movement primitives with constraints** — `wanders (avoiding <rooms>)`, `pursues`,
     `flees`, `returns to <room>`, + an **every-other-turn** cadence. (FZ-G1 generalized.)
  2. **Arbitrary probabilities** — the thief runs on `PROB 30/40/60/70/75/80/90/10 0`.
     Chord's `one chance in N` gives only `1/N`; **percentage/ratio chance is a gap.**
  3. **A `sacred`/untouchable marker** — rob-logic excludes sacred/no-desc items and the
     once-owned egg; robbing valuables needs "not sacred".
  4. **Selection over held/roomed valuables** — `each [treasure the player holds]` /
     `each [treasure here]` (E3 + conditions + a treasure/value marker; ties to FZ-G3
     scoring).
  5. **Querying + nudging melee-plugin state from a daemon** — `WINNING?` (flee-decision),
     unconscious/revive reactions, the **engrossed one-round strength cap**.
  6. **Player-interaction hooks** — `on giving it` / `on throwing it at it` (value-
     conditional), and a **death hook** (drop booty).
  7. **Transient per-turn state** — "did I steal this turn", "am I announced/on-stage" —
     small daemon-local flags feeding conditional phrases.

None of these is combat (that's the plugin). All of them are **daemon-layer + Chord-
surface** work — a bounded but real list, and exactly the kind of thing ADR-223's child B
(daemon) and child D (Chord surface) must deliver for AC-7 ("the thief is pure Chord") to
be honestly true. The thief is the right acceptance test precisely because it demands all
seven.

---

## F. Bottom line

- **AC-7 stands, with teeth:** the thief *can* be pure Chord — its combat via the melee
  plugin (access), its behavior via daemon primitives + Chord's states/each/conditions/
  phrases — **but only after** the seven-item capability set above lands. It is not "just
  movement primitives."
- **Fidelity note:** the MDL thief is a **probabilistic per-turn daemon**, not the clean
  3-state machine the sketch drew. A faithful Chord thief is closer to per-turn
  probabilistic branches (appear / rob / do-nothing / wander-and-rob / deposit) than to
  `lurking→stalking→fleeing`. The state machine is a legitimate *redesign*, but if the goal
  is canon fidelity, the probabilistic daemon is what to reproduce — which makes
  **arbitrary probabilities (gap #2) load-bearing.**
