### 2.6 pushing, pulling, touching

**push** (`if.action.pushing`) — verbs `push`, `press`, `shove`, `move`,
plus the directional form `move X <direction>` (ADR-230 D4 ruling: `move`
is manipulation, never movement — the direction rides into the pushing
action, not going). Needs the `pushable` trait; pushing anything else gets
`fixed_in_place` (scenery) or `pushing_does_nothing`. The trait's
`pushType` picks the behavior: `button` — the one genuinely stateful push
(if the entity is also `switchable`, pushing toggles it — `button_clicks`
when it is a button, `switch_toggled` otherwise; a non-switchable button
just clicks, `button_pushed`); `heavy` — needs a direction to budge
(`pushed_with_effort`), refuses without one (`wont_budge`); `moveable` —
slides when pushed with a direction (`pushed_direction`, or
`reveals_passage` when the trait says it hides something), gets nudged
without one (`pushed_nudged`). Outside the button toggle, stdlib
**narrates** movement but relocates nothing — the story reacts to
`if.event.pushed` (it carries the direction) or an `after pushing it`
clause to actually change the world; which wall opens is puzzle logic, not
platform logic. One honest gap: from a `.story` file, bare `pushable`
composes the default button configuration — selecting `heavy` or
`moveable` is TypeScript territory today.

**pull** (`if.action.pulling`) — verbs `pull`, `drag`, `yank`, `tug`.
Needs `pullable`. A successful pull sets the trait's state to `pulled` (a
second pull refuses `already_pulled`) and bumps its `pullCount`; a worn
item refuses `worn`. Everything a pull *means* — the lever opens the
sluice — is story logic reacting to `if.event.pulled` or written as an
`on pulling it` / `after pulling it` clause.

**touch** (`if.action.touching`) — verbs `touch`, `feel`, `rub`, `pat`,
`stroke`, `poke`, `prod`. No trait needed, no state changed; the reply is
inferred from what the thing is — a lit light source `feels_hot`, a
running device `feels_warm` (or `device_vibrating`), wearables
`feels_soft`, doors `feels_smooth`, containers and supporters `feels_hard`
(a container with drink in it sloshes — `liquid_container`), drinkables
`feels_wet`, scenery `immovable_object` — otherwise the verb itself
answers (`poked`, `patted`, `stroked`, `touched_gently`, `touched`).

The author writes:

<!-- fixture: manipulation/pushing-pulling-touching.story -->
```story
create the Signal Box
  a room

  A cramped cabin of levers and brass above the junction.

create the signal lever
  aka lever
  pullable
  scenery
  in the Signal Box

  A tall iron lever, worn bright at the grip.

  after pulling it
    phrase lever-thrown
  end after

  phrase lever-thrown:
    Somewhere down the line, the semaphore arm clanks to clear.

create the brass button
  aka button
  pushable
  scenery
  in the Signal Box

  A brass button labelled BELL.

create the iron stove
  aka stove
  scenery
  in the Signal Box

  A squat iron stove, cold since spring.

create the stationmaster's cap
  aka cap
  wearable
  in the Signal Box

  A red wool cap with a shiny peak.

create the player
  starts in the Signal Box
```

The player sees:

<!-- transcript: manipulation/pushing-pulling-touching.story -->
```transcript
> push the stove
The iron stove is fixed in place.

> move the button north
You push the brass button.

> pull the lever
You pull the signal lever.

Somewhere down the line, the semaphore arm clanks to clear.

> pull the lever
The signal lever has already been pulled.

> touch the cap
The stationmaster's cap feels soft.

> touch the stove
The iron stove is solid and immovable.
```

The platform owns everything stateful here — the scenery refusal, the
button push under `move`'s manipulation channel, the `already_pulled`
gate, the wool and iron inferences — and the one line that changes
anything beyond the signal box is the story's `after pulling it` reaction.

| | push (`if.action.pushing.*`) | pull (`if.action.pulling.*`) | touch (`if.action.touching.*`) |
|---|---|---|---|
| Refusals | `no_target` · `fixed_in_place` · `pushing_does_nothing` · `wont_budge` (heavy, no direction) · `wearing_it` · `too_heavy` | `no_target` · `cant_pull_that` · `already_pulled` · `worn` | `no_target` (touch refuses almost nothing) |
| Success | `button_pushed` · `button_clicks` · `switch_toggled` · `pushed_with_effort` · `pushed_direction` · `reveals_passage` · `pushed_nudged` | `pulled` · `nothing_happens` | `feels_hot` · `feels_warm` · `device_vibrating` · `feels_soft` · `feels_smooth` · `feels_hard` · `liquid_container` · `feels_wet` · `feels_normal` · `immovable_object` · `touched` · `touched_gently` · `poked` · `prodded` · `patted` · `stroked` |
| Events | `if.event.pushed` | `if.event.pulled` | `if.event.touched` / `if.event.touch_blocked` |

Interceptors: `on`/`after pushing it`, `pulling it`, `touching it` on the
target. Touching, with no state of its own, is a favorite probe to hang
flavor on (`on touching it`) — listening plays the same role for sound
(§6.3).

### 2.7 lowering and raising (per-entity verbs)

`lower :target` and `raise`/`lift :target` parse out of the box, but these
verbs have **no standard behavior at all** — lowering the basket, the
drawbridge, and your voice are three different mutations, so the platform
refuses to invent one (ADR-090). Unhandled, the player sees the refusal
`if.action.lowering.cant_lower_that` (`cant_raise_that` for raising) and
nothing else. Never expect a default here; there is none.

Giving an entity real lower/raise behavior from a `.story` file is the
dispatch-action pattern (the same one behind the friendly zoo's `pet` and
`feed`): a `define action` owns the verb and its misses, and a trait's
`on <verb>ing it` clause carries each entity's behavior.

The author writes:

<!-- fixture: manipulation/lowering-windlass.story -->
```story
define action lowering
  grammar
    lower :target
  the target must be reachable
  refuse without target: lower-what
  otherwise refuse cant-lower

  phrases en-US
    lower-what:
      Lower what?
    cant-lower:
      That isn't something you can lower.

define trait windlass-basket
  states, reversible: raised, lowered

  phrases en-US
    basket-lowered:
      The windlass creaks as the basket descends into the shaft.
    already-down:
      The basket is already at the bottom.

  on lowering it
    it must be raised: already-down
    change it to lowered
    phrase basket-lowered
  end on
end trait

create the Well Head
  a room

  A stone rim, a windlass, and a long drop.

create the wicker basket
  aka basket
  windlass-basket
  scenery
  in the Well Head

  A wicker basket on a rope, riding at the rim.

create the windlass crank
  aka crank
  scenery
  in the Well Head

  A worn oak crank, polished smooth by many hands.

create the player
  starts in the Well Head
```

The player sees:

<!-- transcript: manipulation/lowering-windlass.story -->
```transcript
> lower the crank
That isn't something you can lower.

> lower the basket
The windlass creaks as the basket descends into the shaft.

> lower the basket
The basket is already at the bottom.

> raise the basket
You can't raise the wicker basket.
```

Every line but the last is the story's — the action's `otherwise refuse`
miss, the trait's state guard and mutation — and the last line is the
platform's entire contribution to this verb family: `cant_raise_that`.

| | lower (`if.action.lowering.*`) | raise (`if.action.raising.*`) |
|---|---|---|
| Refusals | `no_target` · `cant_lower_that` (the only standard keys) | `no_target` · `cant_raise_that` |
| Success | none — your dispatch action's and trait's phrases speak | none |
| Events | none standard — a registered behavior emits its own | none standard |

Three boundaries to know. The fall-through is well-defined (ADR-229): a
clause gated out by `while` or a consumed `, once` simply sits out, and
the command falls through to the action body, the next trait, and finally
the `otherwise refuse` miss. An `on lowering it` clause directly on an
*entity* is a load error with a pointed message — these verbs never
consult entity-level interceptors; the trait/action pattern above is the
way. And from TypeScript the equivalent is a capability behavior
registered for `if.action.lowering` (the Sharpee Way — how Dungeo's basket
works).

TURN left this family on its own terms: `turn`/`rotate`/`twist X` still
parse (just below the switching phrasal forms, so `turn lamp on` still
switches, §7.1) and the unhandled refusal is still
`if.action.turning.cant_turn_that`, but turning now wears cutting's dual
surface without the trait gate (§2.8) — an `on turning it` clause directly
on the entity is consulted (turning is one of the 38 wired actions), or a
TypeScript capability behavior for `if.action.turning` takes the whole
turn; no eligibility trait, no define-action scaffolding needed. WAVE and
WIND — the other classic per-entity verbs — still have no binding at all:
no grammar, no action; a story wanting them defines the whole verb with
`define action`, exactly as above.

### 2.8 cutting and digging

Two tool verbs with one design (ADR-230 D3c): the platform action gates
eligibility and validates the tool; the *outcome* belongs to the entity.
**cut** (`if.action.cutting`) parses bare — `cut X` (also `slice`,
`chop`) — and tooled as `cut X with/using Y` (the tooled form outranks
when a tool is named); **dig** (`if.action.digging`) likewise as `dig X`
and `dig X with/using Y`. Eligibility is a trait — `cuttable` /
`diggable` — and the tool contract mirrors the lockable key contract
exactly: the trait names its implement (`cuttable with the billhook`;
`toolId`/`toolIds` in TypeScript), forward references legal. A trait with
no tool configured accepts any attempt. Checks, in order: no such trait →
`not_cuttable` / `not_diggable`; a declared requirement with no tool
named → `no_tool`; a named tool not in hand → `tool_not_held`; the wrong
one → `wrong_tool`.

The stdlib action then performs **no mutation of its own**. What a cut or
dig does — bramble into a gap, earth yielding a tin — is the entity's
registered implementation, and it is *required*: exactly one per entity,
either an `on cutting it` / `on digging it` clause (the entity's own or a
composed trait's) or a capability behavior for the action id (TypeScript,
ADR-090). Zero or two is a load error, never a silent runtime no-op
("… is cuttable but registers no cutting implementation").

The author writes:

<!-- fixture: manipulation/cutting-digging.story -->
```story
create the Kitchen Garden
  a room

  Bean rows, bramble, and one freshly turned seedbed.

create the bramble
  aka briar
  cuttable with the billhook
  scenery
  in the Kitchen Garden
  states: overgrown, cleared

  A wall of thorns swallowing the back fence.

  on cutting it
    change it to cleared
    phrase bramble-cleared
  end on

create the billhook

  A short curved blade on an ash handle.

create the trowel

  A hand trowel, good for nothing woody.

create the seedbed
  aka bed, soil
  diggable
  scenery
  in the Kitchen Garden

  A patch of dark earth, recently disturbed.

  on digging it, once
    move the seed tin to the Kitchen Garden
    phrase tin-unearthed
  end on

create the seed tin
  aka tin

  A rusted biscuit tin, rattling faintly.

create the player
  starts in the Kitchen Garden
  carries the trowel
  carries the billhook

define phrases en-US
  bramble-cleared:
    The billhook hacks a gap through the thorns; the back fence shows through.
  tin-unearthed:
    A few trowelfuls down you strike metal, and lever out a rusted seed tin.
```

The player sees:

<!-- transcript: manipulation/cutting-digging.story -->
```transcript
> cut the bramble
You need something to cut the bramble with.

> cut the bramble with the trowel
The trowel won't cut the bramble.

> cut the bramble with the billhook
The billhook hacks a gap through the thorns; the back fence shows through.

> dig the seedbed
A few trowelfuls down you strike metal, and lever out a rusted seed tin.

> dig the seedbed
You dig the seedbed.

> take the tin
Taken.
```

The platform ran every check — the declared implement missing from a bare
cut, the wrong tool, the winning tool — and mutated nothing itself; both
outcomes are the entities' own clauses, and the second dig, its `, once`
spent, falls through to the generic `dug` stub.

| | cut (`if.action.cutting.*`) | dig (`if.action.digging.*`) |
|---|---|---|
| Refusals | `no_target` · `not_cuttable` · `no_tool` · `tool_not_held` · `wrong_tool` · `cant_cut` | `no_target` · `not_diggable` · `no_tool` · `tool_not_held` · `wrong_tool` · `cant_dig` |
| Success | `cut` (the generic stub — the entity's own text renders over it) | `dug` (same) |
| Events | `if.event.cut` / `if.event.cut_blocked` | `if.event.dug` / `if.event.dug_blocked` |

Interceptors: `on cutting it` / `on digging it` *are* the implementation
here, consulted target first, then an explicitly named tool — a cursed
knife can veto the cut. Composing `cuttable`/`diggable` obliges the
entity to register exactly one implementation (§2.9).

### 2.9 Manipulation traits

**container** (`a container` — a kind noun, so it takes the article).
Holds things inside; composes on one line with `openable`, `lockable`,
and `scenery` (`a container, openable, scenery`) — the putting example
(§2.2) shows one in play. Settings: `with max items N` and `with max
weight N` limit capacity; capacity counts what is directly inside, and a
container "bears the weight" of nested contents rather than passing it
up. Read by putting, inserting, removing, searching, opening/closing,
dropping, throwing, and looking. Data fields beyond Chord's reach today
(TypeScript territory): `isTransparent` (contents visible while closed),
`allowedTypes`/`excludedTypes`, and the liquid fields (`containsLiquid`,
`liquidType`, `liquidAmount` — see drinking, §8.3).

**supporter** (`a supporter`). Holds things on top — see the putting
example (§2.2). Setting: `with capacity N` — the number of items it holds
(the Cloak of Darkness brass hook is `a supporter with capacity 1`).
Unlike containers, a supporter's weight math includes nested contents
recursively. Read by putting, removing, climbing, dropping, and looking.

**pushable** (`pushable`). Makes an entity eligible for pushing — the
signal-box button (§2.6) is this trait, bare. Its `pushType` — `button`
(default), `heavy`, `moveable` — selects the behavior described in §2.6;
from Chord, bare `pushable` composes the default button configuration
(`heavy`/`moveable` are TypeScript territory today). Beyond `pushType`,
`revealsPassage`, and `pushSound`, the trait's fields (`activates`,
`maxPushes`, `pushDirection`, `effects`) are data for *your* event
handlers, not behavior stdlib enforces.

**pullable** (`pullable`). Makes an entity eligible for pulling — the
signal lever (§2.6). Stdlib mutates two fields — `state` (→ `'pulled'`,
which is what gates `already_pulled`) and `pullCount` — and carries the
rest (`pullType`, `activates`, `linkedTo`, `detachesOnPull`, `maxPulls`,
`effects`) as data for story handlers reacting to `if.event.pulled`.

**cuttable** (`cuttable`, optionally `with the <tool entity>` —
adjective). Makes an entity eligible for cutting — the bramble (§2.8) —
and carries the tool contract mirroring lockable's keys: `toolId` (one
tool — what Chord's `with` sets), `toolIds` (several, TypeScript), with
`CuttableBehavior`'s `requiresTool`/`canCutWith` predicates. Composing it
obliges the entity to register exactly one cut implementation — the load
check enforces it.

**diggable** (`diggable`, optionally `with the <tool entity>`). The same
shape for digging — the seedbed (§2.8): `toolId`/`toolIds`,
`DiggableBehavior.requiresTool`/`canDigWith`, and the same
one-implementation rule.

**moveable-scenery** — dormant today (no action reads it, no behavior
class, not composable from Chord): a sketched heavy-thing vocabulary
(weight class, blocked exits, reveals-when-moved) — not the way to build
a boulder puzzle right now; use `pushable`/`pullable` plus story logic.

**attached** — dormant on the same terms: a sketched attachment
vocabulary (glued/nailed/tied, detachable, detach force); watch the ADRs
for when these two wake up.

