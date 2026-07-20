## 12. Plugins & daemons

The runtime services behind timed and NPC behavior — what a Chord
`define sequence` or `on every turn` clause (chord-language.md §4.8, §3)
actually runs on top of.

### 12.1 Turn plugins and priority

After each *successful* player action — never after a failed one, and
never after a meta command — the registered turn plugins run in
descending priority, and their events join the same turn's output: an
NPC's move and a fuse's explosion read as part of the turn that caused
them. Each plugin sees the world, the turn, the player, the action's
result, and the engine's seeded randomness; plugin state rides in saves.

| Plugin | Priority | A Chord story has it | A TypeScript story has it |
|---|---|---|---|
| NPC behavior (§12.3) | 100 | always — NPCs are core vocabulary, no opt-in (ADR-215) | when the story registers it |
| State machines (§12.3) | 75 | with `use state-machines` in the header | when the story registers it |
| Scene evaluation (§11.1) | 60 | always on (engine level) | always on (engine level) |
| Scheduler (§12.2) | 50 | exactly when at least one daemon compiled | when the story registers it |

Only the scene evaluator is always on at the engine level; a TypeScript
story registers the rest itself (Dungeo registers all three).

### 12.2 The scheduler: daemons and fuses

The temporal substrate. A **daemon** runs every tick — optionally gated
by a condition, optionally once. A **fuse** counts down and fires:
turns, an optional per-turn tick condition (turns can refuse to count),
repeat, cancellation with cleanup, entity binding (auto-cleanup when the
entity goes away), and mid-flight adjustment. Fuses are a
TypeScript-only surface — Chord never touches fuses at all; the
imperative timer verbs (cancel a sequence, "in 3 turns", periodic
timers, reschedule) remain the audited Chord gaps (designed in ADR-217,
not yet built).

A `define sequence` (chord-language.md §4.8) compiles to **one daemon**
whose step pointer lives in namespaced world state — which is why
sequence progress survives save, restore, and undo with no author
effort. It arms its steps strictly in order: `at turn N` against the
wall clock, `N turns later` against the previous step's firing,
`when <owner> becomes <state>` against the state value.

The author writes:

<!-- fixture: plugins/sequence.story -->
```story
story "The Scullery" by "ref"
  id: plugins-sequence
  version: 0.0.1
  states: quiet, boiling

create the Scullery
  a room

  A stone-flagged scullery, a kettle already over the flame.

create the kettle
  scenery
  in the Scullery

  A copper kettle, beginning to warm.

create the player
  starts in the Scullery

define sequence kettle coming to the boil
  at turn 2
    phrase kettle-murmur
      The kettle begins to murmur on the range.
  2 turns later
    phrase kettle-boils
      The kettle reaches a rolling boil.
    change the story to boiling
end sequence

define sequence steam
  when the story becomes boiling
    phrase steam-note
      Steam fogs the little window over the sink.
end sequence
```

The player sees:

<!-- transcript: plugins/sequence.story -->
```transcript
> wait
Time passes...

The kettle begins to murmur on the range.

> wait
Time passes...

> wait
Time passes...

The kettle reaches a rolling boil.

Steam fogs the little window over the sink.

> wait
Time passes...
```

The opening look is turn 1, so `at turn 2` lands on the first `wait`;
and the second sequence's `when the story becomes boiling` step fires in
the very turn the first sequence changes the state.

An `on every turn [while …][, once]` clause (chord-language.md §3)
becomes one daemon per clause. Owned by an entity, a trait, or a
region, it is **presence-gated**: off-stage the clause neither fires,
rolls dice, nor consumes its `once` (for a region, "present" means
anywhere in a member room, nesting included). Hosted in the story
header's own body it is the story's clause — one daemon, **no gate**: a
background clock that ticks wherever the player is (weather, off-stage
simulation; ADR-236).

The author writes:

<!-- fixture: plugins/daemons.story -->
```story
story "The Lighthouse" by "ref"
  id: plugins-daemons
  version: 0.0.1

  on every turn
    phrase tide-works
  end on

create the Jetty
  a room
  north to the Lamp Room

  A stone jetty slick with spray.

create the Lamp Room
  a room
  south to the Jetty

  Glass on every side, the great lamp turning overhead.

create the Lighthouse
  a region
  containing the Lamp Room

  on every turn
    phrase lamp-hum
      The lamp's clockwork hums up through the floor.
  end on

create the brass clock
  aka clock
  scenery
  in the Lamp Room

  A ship's clock bolted beside the door.

  on every turn
    phrase clock-ticks
      The brass clock ticks once, heavily.
  end on

create the player
  starts in the Jetty

define phrase tide-works
  Out past the bar, the tide keeps working at the rocks.
end phrase
```

The player sees:

<!-- transcript: plugins/daemons.story -->
```transcript
> wait
Time passes...

Out past the bar, the tide keeps working at the rocks.

> north
Lamp Room
Glass on every side, the great lamp turning overhead.

The lamp's clockwork hums up through the floor.

The brass clock ticks once, heavily.

Out past the bar, the tide keeps working at the rocks.

> wait
Time passes...

The lamp's clockwork hums up through the floor.

The brass clock ticks once, heavily.

Out past the bar, the tide keeps working at the rocks.
```

Three daemons, one gate: on the Jetty only the story-global tide
speaks; one move north and the region's daemon and the clock's
presence-gated daemon join it in the same turn's output.

### 12.3 The NPC and state-machine plugins

**The NPC plugin** (priority 100) walks every entity with the `npc`
trait, dispatches to the behavior its `behaviorId` names, and executes
what comes back — attacks, emotes, movement (with `npc.moved` events
and witnessed variants a story can narrate). It also fires enter/leave
hooks when the player's action moved them — the greeting-guard
pattern. Built-ins: `guard` (stationary, attacks the visible player
when hostile), `passive`, and factory-made wanderers, followers, and
patrol routes; stories register richer behaviors. A Chord story gets
all of this without opting in — NPCs are core: `a person, a guard` (or
`passive`, `wanderer with move-chance 50`, `follower`, `patrol with
route [ … ]`) composes the built-ins directly, with `with`-fields for
movement permissions, routes, and chances. Configuration lives on the
trait (§8.5); the deep-NPC layers (character model, lucidity) tick
here too.

The author writes:

<!-- fixture: plugins/patrol.story -->
```story
create the Orchard
  a room
  east to the Cider House

  Apple trees in crooked rows.

create the Cider House
  a room
  west to the Orchard

  Presses, barrels, and the sweet reek of last year's crop.

create Mairead
  aka warden
  a person, proper, patrol with route [the Orchard, the Cider House]
  pronouns she
  in the Orchard

  The orchard warden, mid-round.

create the player
  starts in the Orchard
```

The player sees:

<!-- transcript: plugins/patrol.story -->
```transcript
> look
Orchard
Apple trees in crooked rows.

You can see Mairead here.

> wait
Time passes...

> look
Orchard
Apple trees in crooked rows.

> wait
Time passes...

> look
Orchard
Apple trees in crooked rows.

You can see Mairead here.
```

Mairead walks her two-room route on the plugin's turns — silently by
default: the plugin emits the `npc.moved` events, and narrating them
(or not) is the story's choice.

**The state-machine plugin** (priority 75) evaluates declarative
machines — states, guarded transitions triggered by actions, events,
or conditions, enter/exit effects, terminal states — at most one
transition per machine per turn. A Chord story reaches it by opting
in: `use state-machines` in the story header, then `define machine` —
the full depth, with Chord conditions as guards and Chord bodies as
effects; `define machine` without the `use` line is a compile error.

The author writes:

<!-- fixture: plugins/machine.story -->
```story
story "The Ferry" by "ref"
  id: plugins-machine
  version: 0.0.1
  states: waiting, signaled
  use state-machines

create the Slipway
  a room

  A cobbled slipway running down into grey water.

create the capstan
  in the Slipway

  A tarred capstan wound with ferry rope.

  on turning it
    phrase capstan-turns
      You lean into the capstan and it comes round, pawls clacking.
  end on

create the signal cord
  aka cord
  scenery, pullable
  in the Slipway

  A cord for ringing the bell on the far bank.

  on pulling it
    change the story to signaled
    phrase cord-rings
      Far across the water, a bell answers the cord.
  end on

create the player
  starts in the Slipway

define machine ferry
  role capstan is the capstan
  starts moored

  state moored
    when turning the capstan: casting-off

  state casting-off
    on enter
      phrase rope-pays-out
    end on
    when signaled: underway

  state underway, terminal
    on enter
      phrase ferry-underway
    end on
end machine

define phrase rope-pays-out
  The rope pays out and the ferry noses off the far bank.
end phrase

define phrase ferry-underway
  The ferry is underway, beating slowly toward you.
end phrase
```

The player sees:

<!-- transcript: plugins/machine.story -->
```transcript
> turn the capstan
You lean into the capstan and it comes round, pawls clacking.

The rope pays out and the ferry noses off the far bank.

> pull the cord
Far across the water, a bell answers the cord.

The ferry is underway, beating slowly toward you.
```

Two trigger kinds in two turns: the action trigger fires the turn the
capstan turns (the `on turning it` clause makes the turn succeed — §2.7
— and the transition's `on enter` speaks in the same turn's output),
and the condition trigger fires the turn the cord's clause moves the
story to `signaled`.

And worth being precise about: **Chord's `states:`/`change`/`select on`
still do not use it.** Chord states are plain world-state values with a
forward-march ratchet (`reversible` opts out) — the *effect* of a
simple state machine without the plugin's machinery (no enter/exit
effects, no terminal states, no multi-machine registry). Dungeo's
death-penalty policy (§9.1's veto) is a real state machine; the cloak's
states are Chord world-state.

### 12.4 Extensions: basic combat as a worked example

The combat extension shows what "a plugin built on the standard layers"
means: it invents nothing. One call in a TypeScript story's world setup
registers an interceptor on the `combatant` trait for the attacking
action — the exact seam §8.2 documents — plus an NPC-side resolver for
retaliation. From there, everything it touches is standard: hit chance
from `combatant.skill` vs the defender's (clamped 10–95%, weapon
`skillBonus` on top), damage through the `health` trait's behavior,
death and inventory-dropping through the standard death machinery (§9),
narration through the `combat.*` message families the lang layer already
carries. Its dice are seeded but its own stream — combat outcomes vary
run to run, by policy.

A story wanting different combat registers its own interceptor on the
same seam instead (Dungeo's melee does). And the boundary the audit
once flagged is closed (ADR-215): a Chord story reaches all of this
with one header line — `use combat` — which runs the same registration
call at load. With it, `combatant` and `weapon` join the composable
catalog with their typed fields (`skill`, `base-damage`, `hostile`,
weapon `damage` and `skill-bonus`, …), and `health`/`max-health` land
on the health trait like everywhere else (§8.5, §9.3). The `use` line
resolves against a fixed, trusted, runtime-bundled registry — an
unknown name is a load error, and a `use`-only story stays pure IR.
Third-party extensions remain a deferred design.

## Appendix: related references

- **`chord-language.md`** — the `.story` language itself: syntax, clause
  semantics, `define` forms, tooling. Read it to *write*; read this
  reference to know what is already built.
- **`chord-grammar.md`** / **`chord.ebnf`** — the formal grammar, for
  tool authors and the terminally curious.
- **`packages/sharpee/docs/genai-api/`** — the generated TypeScript API
  reference, for the Sharpee Way: trait classes, behaviors, world-model
  and engine interfaces. Where this document says "TypeScript-only,"
  that is where the types live.
- **The parity audit** (`docs/work/stdlib-reference/
  chord-availability-audit.md`) — the current map of what is reachable
  from each Way and the roadmap for closing the gaps flagged throughout
  this reference.
