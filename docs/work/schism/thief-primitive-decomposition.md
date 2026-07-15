# The Thief, decomposed into generic Sharpee+TS primitives

**Discipline:** there is **no thief-specific TS** — no `ThiefBehavior`, no `robber`
anything. Every element below is a *general* platform primitive; the thief is a **Chord
composition** of them. Each primitive is proven generic by a **non-thief use**. This is
the elegance-oracle / access-not-implementation rule made concrete against the canonical
robber (`docs/internal/dungeon-81/patched_confusion/`, validated in
`thief-mdl-validation.md`). Combat is the **existing melee plugin** (access).

Status: **EXISTS** (in platform/Chord today) · **GAP** (to build, generically).

---

## 1. Markers (generic entity properties)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P1 | **`sacred` / untouchable** — an item other actors/daemons may not take or move | a bolted museum exhibit; a quest item nobody can pocket | GAP (a marker distinct from `scenery`; "not takeable *by others*") |
| P2 | **value / scored marker** — an item carries worth | anything the scoring model counts (FZ-G3) | partial (ties to scoring) |
| P3 | **transient state/flag on an entity** — `states: …` | a lamp `lit/unlit`; a gate `open/closed` | EXISTS (D8) |

## 2. Daemon movement behaviors (generic algorithms the daemon layer ships)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P4 | **`wander`** — random reachable room, optional **room-tag filter** (avoid tagged rooms) | a stray dog roaming; a drifting cloud avoiding indoor rooms | GAP |
| P5 | **`patrol <route>`** — fixed loop | the zoo keeper (FZ-G1) | GAP |
| P6 | **`pursue <target>`** — step toward an entity | a guard chasing an intruder | GAP |
| P7 | **`flee <target>`** — step away from an entity | a spooked animal | GAP |
| P8 | **`path-to <room>`** — head toward a room | any NPC going home / to a shift | GAP |
| P9 | **cadence** — act every *N*th turn | a lighthouse beam sweeping every 3 turns | partial (scheduler timing; expose to entity daemons) |

## 3. Conditions & selection (generic condition kit)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P10 | **probability condition `chance <p>`** (ratio/percentage, not just `1/N`) | weather: `chance 30%` of rain each turn; a parrot squawks `chance 60%` | **GAP** — Chord's `one chance in N` only yields `1/N` |
| P11 | **`each` / `any` / `no <open-condition>`** — select matching entities | "award endgame when `no` stray-treasure" | EXISTS (E1/E3) |
| P12 | **spatial/holder conditions** — `here`, `<X> holds it`, `it is in <room>` | "while the keeper is here" | EXISTS (Z4 + kit) |
| P13 | **combat-state conditions** — `while winning` / `while losing` (query the melee plugin) | any combatant that retreats when losing | GAP (melee-plugin surface → Chord) |
| P14 | **entity-status conditions** — `while unconscious` / `while asleep` | a sleeping dragon you can sneak past | GAP/partial |

## 4. Statements & effects (generic mutations)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P15 | **`move` / `remove` / `drop`** | any world change | EXISTS |
| P16 | **bulk "drop / move all it carries"** — a statement over everything an entity holds | a broken basket spilling its contents; an ATM dispensing all its cash | **GAP** — `each <cond>` filters the *candidate* (`it` = tested entity), but in a clause `it` = the *owner*, so "each thing *I* hold" isn't expressible; needs a bulk statement (`drop everything` / `empty into <room>`) or an owner-relative `each` |
| P17 | **temporary combat modifier** — weaken/distract for *N* turns | a stun spell; a poison; a flash-bang | GAP (melee-plugin surface → Chord) |
| P22 | **`conceal` / `reveal`** — take an entity out of / back into scope on a condition | a hidden safe behind a painting; a cloaked ship; a secret door | partial — `ConcealmentTrait`/scope EXIST (visibility audit); the add is the author-facing `conceal`/`reveal` statement + condition-gating (RC-8). *The guarded-lair "treasures vanish" is this.* |

## 5. Event hooks (generic clauses)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P18 | **verb interceptors** — `on taking it` / `on giving it` / `on throwing it at it` / `on attacking it` | give a flower to a shy NPC; throw a bone to a dog | partial (taking/attacking EXIST; **giving / throwing-at** need the D3 verb set) |
| P19 | **death / removal hook** — `on dying` (or the ADR-213 pre-removal signal) | a slain ogre dropping its club; a popped balloon | partial (ADR-213 removal signal; a clean `on dying` is the GAP) |
| P20 | **room trigger → move an entity in** — room `on entering it` + `move` | a trap that drops a portcullis; a summoned guardian | EXISTS |

## 6. Melee plugin surface (access — expose the existing plugin to Chord)

| # | Primitive (generic) | Non-thief use | Status |
|---|---|---|---|
| P21 | **`use melee`** — combatant stats, an authored **melee message set**, engage, the winning-query (P13), the strength-modifier (P17), unconscious/revive states (P14) | any fightable NPC — troll, guard, dragon | EXISTS (plugin) + GAP (its Chord surface) |

---

## The thief as pure composition (no thief-specific element)

```
use daemon
use melee

# selection criteria — E3 needs NAMED open conditions (the predicate lives here,
# not inline on `each`). `it` = the candidate being tested.
define condition loose-valuable:  it is a valuable and it is not sacred and it is here
define condition player-valuable: it is a valuable and it is not sacred and the player holds it

create the thief
  a person
  states: prowling, cornered                     # P3
  combatant with strength 5, melee robber-lines  # P21 (stats + authored message set)

  on every turn while prowling                   # daemon tick + bare owner-state (RC-1)
    wander avoiding sacred rooms                  # P4 (+ room-tag filter)
    each loose-valuable                           # P11 — block form; `the match` = each item
      move the match to it                        # P15   (rob the room)
    end each
    each player-valuable
      move the match to it when chance 75%         # P15 + P10   (rob the adventurer)
    end each

  on every turn while it is in the Treasure Room  # P12
    empty into the Treasure Room                   # P16 — deposit loot
    each loose-valuable                            # P11 — guard the hoard
      conceal the match                            # P22 — treasures "vanish"
    end each

  on every turn while losing                      # P13 (bare status — RC-1)
    flee the player                               # P7
    change it to prowling

  on giving it while the match is a valuable       # P18 + P11
    weaken it for 1 turn                           # P17 (engrossed = a combat modifier)
    phrase admires-gift

  on attacking it                                 # P18 (EXISTS)
    change it to cornered

  on dying                                        # P19
    drop everything                               # P16 — booty remains
    reveal everything here                        # P22 — the hoard reappears

  on taking it: refuse cant-take                  # P18 (EXISTS)
```

Every line resolves to a **P#** general primitive. Note the `each` blocks use **named
conditions + `end each`** (no inline `→`, no inline `that is here`); the two "all it
carries" lines are the **bulk P16 statement**, not `each` (see the P16 gap). Swap the
phrases and markers and the *same* primitives build a patrolling guard, a beggar, a
shopkeeper's cat.

---

## The GAP list = the generic primitives to build (ADR-223 children B/D)

Stated with **zero** thief in them:

- **Movement daemon behaviors** — `wander` (room-tag filter), `patrol`, `pursue`, `flee`,
  `path-to`, + entity-level `cadence`. (P4–P9; FZ-G1 generalized.) — *child B primitive,
  child D Chord verb.*
- **Ratio/percentage probability condition** — `chance <p>` alongside `one chance in N`.
  (P10.) — *a Chord condition-kit add (RNG stays as-is, only the expression changes).*
- **An untouchable/`sacred` marker** — an item others may not move/take. (P1.)
- **Bulk "all it carries" statement** — `drop everything` / `empty into <room>` (or an
  owner-relative `each held`), since a global `each <condition>` filters the candidate,
  not "what the owner holds". (P16.)
- **`conceal` / `reveal`** — take an entity out of / back into scope on a condition (the
  guarded-lair "treasures vanish" is the canonical use). Platform concealment exists
  (`ConcealmentTrait`/scope); the author-facing verb + condition-gating is the add. (P22.)
- **Melee-plugin → Chord surface** — combat-state conditions (`while winning/losing`,
  `while unconscious`), a temporary combat modifier, an authored melee message set, and
  `engage`. (P13, P14, P17, P21.)
- **Verb interceptors `on giving it` / `on throwing it at it`** and a **`on dying`** hook.
  (P18, P19.)
- **Value/scored marker** wiring for `each valuable` selection. (P2; ties to FZ-G3.)

That is the whole of it. None is "thief work"; each is a reusable platform primitive that
happens to let Chord compose the canonical robber — and a hundred other automata — with no
bespoke TS.
