# Person/Daemon split — code examples (Sharpee TS + Chord)

**Status:** illustrative design sketches for ADR-223. **Nothing here is implemented.**
The TS traits (`HealthTrait`, `AnimalTrait`) and the merged daemon model are *proposed*.
Layer names are locked (2026-07-15): **AGENT / DAEMON / HEALTH / PERSONHOOD**.

## The four layers

| Layer | Home (proposed) | Holds |
|---|---|---|
| AGENT | `ActorTrait` (exists) | takes turns, inventory, pronouns, `isPlayer`; sight/scope |
| DAEMON | one merged daemon model (`NpcService`/`NpcBehavior` **+** `SchedulerPlugin`) | a behavior/routine the system runs each turn + typed state; attaches to a **person, animal, machine, or the world** |
| HEALTH | `HealthTrait` (new, **opt-in**) | `health`; alive/dead derive from it; **required by `CombatantTrait`/`DestructibleTrait`** — a plain actor is alive *without* it |
| PERSONHOOD | `CharacterModelTrait` (exists, re-homed under AGENT) | personality, mood, **disposition (incl. hostility)**, knowledge, conversation |

They **compose independently** — each entity picks exactly the layers it needs, no
fused `NpcTrait`. **DAEMON is subject-agnostic** (the environment's PA/weather is a
world daemon; the zookeeper's patrol is an entity daemon — same model). **Alive is the
default** for an actor/animal — `HealthTrait` is **opt-in, required only by combat/
damage**; most NPCs never carry it. **Hostility is disposition** (personhood), not
health. Where health *is* present it's the single source combat + the turn loop read,
so the old sync bug can't recur.

---

## 1. Zookeeper — AGENT + DAEMON(patrol) + HEALTH

*A human who patrols. No personhood, no combat.*

### TS — before (fused `NpcTrait`)
```ts
const zookeeper = actor('zookeeper')
  .addTrait(new NpcTrait({           // ← one trait doing four jobs
    behaviorId: KEEPER_PATROL_ID,    //   daemon
    canMove: true,                   //   daemon
    announcesMovement: true,         //   daemon
    isAlive: true, isConscious: true //   health (also the turn-gate)
  }))
  .in(mainPath).build();
```

### TS — after (explicit layers)
```ts
const zookeeper = actor('zookeeper')                       // AGENT (alive by default)
  .aliases('keeper', 'sam')
  .add(new Daemon({                                        // DAEMON (entity daemon)
    behaviorId: 'zoo-keeper-patrol',
    canMove: true, announcesMovement: true,
  }))
  .in(mainPath).build();
// No HealthTrait — Sam isn't a combatant; he's alive by default.

// behavior registered on the merged daemon system (was NpcService + scheduler):
daemons.registerBehavior(createPatrol({ route: [mainPath, pettingZoo, aviary], loop: true }));
```
*Turn-eligibility = has a daemon **and** is alive (default true; only a `HealthTrait` can make it false).*

### Chord — proposed
```
use daemon                          # opts the story into the daemon layer (FZ-G1 / child D)

create the zookeeper
  a person                          # AGENT
  aka keeper, sam
  in the Main Path

  patrols the Main Path, the Petting Zoo, the Aviary   # DAEMON (entity daemon)
  # health: alive is the default; nothing to write
```

---

## 2. Parrot — ANIMAL + DAEMON(chatter/swap) + HEALTH

*A bird (not a person) that chatters and swaps behavior after hours. Daemon on an animal.*

### TS — after
```ts
const parrot = object('parrot')
  .add(new AnimalTrait({ carryable: false }))              // ANIMAL (FZ-X1; alive by default)
  .add(new Daemon({ behaviorId: 'zoo-parrot' }))           // DAEMON (no movement)
  .in(aviary).build();
// No HealthTrait — not a combatant.

daemons.setBehavior(parrot, 'zoo-parrot-after-hours');     // swap — same handle, new routine
```
*The daemon attaches to an **animal**, not a `person`. The environment's PA daemon and
this parrot daemon are the same model, different subjects.*

### Chord — proposed
```
create the parrot
  an animal                         # ANIMAL kind/adjective (FZ-X1)
  in the Aviary

  chatty while not after-hours      # a daemon expressed as a trait clause
  candid while after-hours          # the "behavior swap" as a declarative state split
```

---

## 3. Thief — the canonical automated NPC, **designed purely in Chord**

*The thief is the elegance-oracle test for the daemon layer: it must be authorable
end-to-end from a `.story` file, not a hand-coded TS behavior. Its state machine is the
**implementation** (pure Chord); its movement is **access** (platform algorithms).*

### Chord — the whole thief (proposed)
```
use daemon
use combat

define condition loose-treasure: it is a treasure and it is here   # "treasure" = story marker

create the thief
  a person
  aka robber
  states: lurking, stalking, fleeing      # the phase machine  (D8 states — EXISTS)
  combatant with skill 70                  # combat stats via `use combat` (access)

  on every turn while it is lurking        # per-phase daemon  (on-every-turn — EXISTS)
    wanders                                # ← movement behavior  (DAEMON primitive — GAP)
    each loose-treasure                    # picks up treasures it finds  (E3 each + Z4 here — EXISTS)
      move the match to it
    end each
    change it to stalking when the player is here

  on every turn while it is stalking
    pursues the player                     # ← movement behavior
    when it is with the player
      steal a treasure from the player     # steal effect (select + move)
      change it to fleeing
    change it to lurking when the player is gone

  on every turn while it is fleeing
    returns to the Treasure Room           # ← movement behavior (path home)

  on attacking it                          # react to attack  (interceptor — EXISTS)
    change it to stalking
```

### What this proves
- **~80% is already Chord:** `states` (D8), `on every turn while <state>`, `change it to
  <state>` + `when` (D7), `on attacking it`, `use combat`. Even **collecting treasures
  while it roams** is pure Chord — `each loose-treasure` (E3) + `here` (Z4) + `move`. The
  thief's *decisions* are declarative, no TS. (`treasure` is a story marker — an adjective
  or trait; ties to the scoring model, FZ-G3.)
- **The real gap is MOVEMENT behaviors** — `wanders` / `pursues the player` /
  `returns to <room>` (+ patrol/flee). This is **FZ-G1's patrol generalized**: the
  platform provides the movement *algorithms* as daemon primitives; Chord *attaches* them
  and drives the decisions. That set — wander / patrol / pursue / flee / path-to — is the
  daemon layer's core Chord-surface deliverable.

### TS — the platform side (what Chord rests on; **not** how you author a thief)
```ts
// The daemon layer ships reusable movement behaviors as primitives:
daemons.movement = { wander, patrol, pursue, flee, pathTo };
// The Chord `wanders` clause compiles to daemons.movement.wander on the entity's daemon.
// Story authors never hand-write onTurn AI — the Chord block above IS the whole thief.
```
*Contrast today:* dungeo's thief is a ~300-line TS `NpcBehavior` + a `customProperties`
state machine. Under the split its decisions become Chord `states` + turn-clauses, its
movement becomes platform primitives, and nothing is bespoke per story.

---

## 4. Ross (an Alderman suspect) — AGENT + PERSONHOOD, **no daemon**

*A stationary conversational character. PERSONHOOD without a DAEMON — the case that proves
the layers are orthogonal. This is The Alderman's shape (child C's validation target).*

### TS — after (personhood re-homed under AGENT)
```ts
const ross = actor('Ross')                                 // AGENT (alive by default)
  .add(characterModel()                                    // PERSONHOOD (on the agent, no NpcTrait)
    .personality('guarded')
    .disposition('player', 'wary')                         // disposition = where hostility lives too
    .knows(fact('mayor-in-the-study', { confidence: 'certain' }))
    .conversation(
      topic('the-night')
        .when(playerHasEvidence('torn-letter')).tell('…alright, I saw him leave…')
        .otherwise().lie('…I was home all evening.'))
    .build())
  .build();
// NO Daemon — Ross never acts on his own; personhood ticks via the character driver.
```

### Chord — proposed (personhood surface, child C/D)
```
create Ross
  a person
  personality guarded
  disposition toward the player: wary
  knows "the mayor was in the study"

  conversation
    topic the-night
      when the player has the torn letter:
        tell "…alright, I saw him leave…"
      otherwise:
        lie "…I was home all evening."
```

---

## What the set demonstrates

- **Independent composition:** zookeeper (agent+daemon), parrot (animal+daemon), thief
  (agent+daemon+combat+health), Ross (agent+personhood). No fused `NpcTrait`; **only the
  thief carries `HealthTrait`** — because only it can be damaged.
- **Daemon ≠ personhood ≠ health:** the parrot has a daemon with no personhood; Ross has
  personhood with no daemon; the environment (PA/weather) has a daemon with no agent at
  all — same model. **Alive is the default; health is opt-in.**
- **One health source:** where health exists (combatants/destructibles), combat and the
  turn loop read the same `HealthTrait`; the sync bug can't recur.
- **Hostility is disposition** (personhood), not a health flag.
- **Chord parity is the acceptance gate:** every "after" has a proposed `.story` form;
  where it doesn't read cleanly yet, that's child-D work — and per ADR-222, if it *can't*
  be made clean, the TS shape is wrong.
- **Open in these sketches (ADR-223):** orphaned-plumbing fate (Q-1), observation pipeline
  (Q-2), typed daemon state shape (Q-3), child sequencing (Q-4), consciousness/`asleep`
  (Q-5).
