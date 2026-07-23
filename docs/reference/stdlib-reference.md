# The Sharpee Standard Library — Author Reference

A writer-facing catalog of what Sharpee gives you for free: every standard
action a player can type, every trait you compose onto an entity, and the
runtime services (plugins and daemons) behind timed and NPC behavior. This is
the companion to the Chord language reference (`chord-language.md`): that
document teaches the language and its `define trait` / `define action` / hatch
escape hatches; this one catalogs everything already built in, so you know what
*not* to define before reaching for those hatches.

> **Status: CURRENT at Sharpee 3.2** (example-first rework 2026-07-19,
> same-day as the 3.2 currency sweep; previously content-final
> 2026-07-16, truth-refreshed 2026-07-17 after ADR-230). Every entry is
> built around a worked example: the `.story` fences are verbatim
> excerpts of committed fixtures, and every `transcript` fence is real
> engine output, replayed and byte-checked by
> `docs/work/stdlib-reference/verify.mjs` on each change. Chord
> availability per entry follows the parity audit (54/54 actions
> reachable); the platform notes that remain are still-honest gaps.

## 1. How to read this reference

### 1.1 What the standard library is

The standard library is everything Sharpee gives a story before the story
says anything: fifty-odd actions the player can attempt, forty-odd traits
an entity can be composed from, the behaviors that own their state changes,
and the runtime services (plugins, daemons, channels) underneath. A Chord
`.story` file builds directly on this vocabulary — the point of this
reference is to know what is already there, so you reach for
`define trait` / `define action` (chord-language.md §5) only when you are
genuinely adding something new.

### 1.2 How an action entry is laid out

Each action entry leads with the basics — the **verbs that actually
parse** (grounded in the parser's grammar; where a listed synonym does
not parse, the entry says so) and the **trait** that makes an entity
eligible (or "anything"). Then a worked example: *the author writes* a
small `.story` scene exercising the entry's override seams, and *the
player sees* the real transcript it produces. A compact table closes the
entry with the **message keys** you can retarget (Refusals and Success
rows) and the **events** it emits for story reactions, followed by a
one-line note on which `on`/`after` clauses the action consults.

### 1.3 Standard behavior vs. per-entity verbs

Most verbs have one canonical behavior — TAKE moves a thing to your
hands, OPEN opens it — and stdlib implements it once, for every entity.
A few verbs (LOWER, RAISE — and unbound cousins like WAVE, WIND) have no
single meaning; the platform refuses to invent one (ADR-090), and each
entity that supports the verb defines what it means. §2.7 shows the Chord
pattern in full. TURN, once of this family, now consults the entity
directly instead (§2.7). A related pair — CUT and DIG (§2.8) — gate on a
trait and validate a tool, but the outcome is likewise each entity's own.

### 1.4 Messages are IDs, not fixed text

Standard actions never speak English; they emit messages the language
layer renders, each reachable by a curated override alias
(`taking-fixed-in-place`). Per entity, you replace a moment's text with
`on`/`after` clauses carrying your own phrases (§2 opening shows the
pattern); story-wide, an `override message taking-fixed-in-place` …
`end override` block replaces the platform default everywhere (ADR-255;
chord-language.md §5.2 teaches it), and a TypeScript story can override
the messages through the language provider.

### 1.5 Intercepting standard actions

The `on <gerund> it` / `after <gerund> it` clause surface
(chord-language.md §3 owns the syntax) works on exactly the actions the
platform wires for consultation — 38 of them, fail-fast: a gerund nothing
consults is a load error, with a pointed message. Each entry here states
what gets consulted, including the multi-entity commands where both sides
are heard (give: item and recipient; lock: target then key; go: the room
left, the room entered, and the door between). Meta actions and LOOK
consult nothing — there is no entity to key on.

## 2. Manipulation

Moving things by hand: picking them up, putting them down, putting them in
and on other things, handing them over, and shoving them around. Everything
in this chapter works out of the box — the point of each entry is to tell
you what the platform already does, which trait (if any) makes an entity
eligible, and which message keys to override when you want it said
differently.

Each entry lists the action's **message keys** — the messages stdlib emits
instead of English (the `lang` layer supplies the words). Override one per
entity with an `on`/`after` clause carrying your own phrase
(chord-language.md §3), or story-wide with `override message <action>-<key>`
naming the message's curated alias (ADR-255 —
chord-language.md §5.2; a TypeScript story overrides the message through the
language provider). In transcripts and event payloads, the key is how you
recognize which moment fired. The worked example in §2.1, directly below,
shows the per-entity guard and the story-wide override side by side — the
same two seams recur all through this chapter.

### 2.1 taking and dropping

**take** (`taking`) — verbs `take`, `get`, `grab`, `acquire`,
`collect`, `pick up`, `take up` (bare `pick` is deliberately absent — it
would outmatch `pick up`); multi-object `take all`, `take all but the
lamp`, `take the key and the bottle`. Anything is takeable by default —
portability is the rule, not a trait. `scenery`, rooms, things already
carried, and carrying limits refuse; a worn item is quietly taken off
first; identity `points` awards score on the first take (treasure
scoring).

**drop** (`dropping`) — verbs `drop`, `discard`, `put down`,
`throw away`; `drop all`. The destination is wherever the player is: the
room, or the container or supporter the player is inside or on.

The author writes:

<!-- fixture: manipulation/taking-dropping.story -->
```story
create the Lamp Room
  a room

  Shelves of unlit lamps line every wall.

create the brass lantern
  aka lantern
  in the Lamp Room

  A dented brass lantern with a wire handle.

create the marble statue
  aka statue
  scenery
  in the Lamp Room

  A blank-eyed statue, far too heavy to move.

create the iron ring
  aka ring
  scenery
  in the Lamp Room

  A ring set into the floor slab.

  on taking it
    refuse ring-fused
  end on

  phrase ring-fused:
    The ring is fused to the slab; your fingers just slip off it.

create the player
  starts in the Lamp Room

override message dropping-dropped
  You set it down with care.
end override
```

The player sees:

<!-- transcript: manipulation/taking-dropping.story -->
```transcript
> take the statue
The marble statue is fixed in place.

> take the ring
The ring is fused to the slab; your fingers just slip off it.

> take the lantern
Taken.

> drop the lantern
You set it down with care.
```

Three seams in one scene: `scenery` refuses with the platform's
`fixed_in_place`, the ring's `on taking it` guard refuses with its own
phrase, and the story-wide `override message dropping-dropped` rewrites
every plain drop.

| | take (`taking-*`) | drop (`dropping-*`) |
|---|---|---|
| Refusals | `no_target` · `cant_take_self` · `already_have` · `cant_take_room` · `fixed_in_place` · `container_full` · `too_heavy` · `cannot_take` · `nothing_to_take` | `not_held` · `still_worn` (take it off first) · `container_full` · `cant_drop_here` · `nothing_to_drop` |
| Success | `taken` · `taken_from` (out of or off something) · `taken_multi` (`take all`) | `dropped` · `dropped_in` · `dropped_on` · `dropped_quietly` (glass, room drop) · `dropped_carelessly` (`discard`) · `dropped_multi` |
| Events | `taken` / `take_blocked` | `dropped` / `drop_blocked` |

Interceptors: `on taking it` / `after taking it` on the item — and
REMOVE-FROM phrasing cannot dodge a taking guard (§2.3).

### 2.2 putting and inserting

Two actions share the surface English of "put". `put X on/onto Y` (and
`hang X on Y`) is **putting** (`putting`); `put X in/into/inside Y`
and `insert X in Y` parse as **inserting** (`inserting`), which
delegates its work back into putting with the preposition forced to "in".
`place` works in both phrasings, and `move X to Y` lands in putting since
ADR-230 D4, the destination's kind deciding in versus on (the D4 ruling:
`move` is a manipulation verb, never movement — see also pushing, §2.6).
The destination decides eligibility: `on` needs a supporter, `in` needs a
container, and a closed openable container refuses. The item does not need
to be in hand — putting performs an implicit take first, and refuses with
the taking refusal if that fails (a fused-down ring cannot be put
anywhere). Because inserting delegates its report into putting, a
successful INSERT renders `putting-put-in` — override `put_in` /
`put_on` for success text in both phrasings — while inserting's *failures*
render under `inserting-<key>`.

The author writes:

<!-- fixture: manipulation/putting-inserting.story -->
```story
create the Sorting Office
  a room

  Pigeonholes and parcel shelves, floor to ceiling.

create the oak counter
  aka counter
  a supporter
  scenery
  in the Sorting Office

  A long oak counter, polished by a century of elbows.

create the outgoing pigeonhole
  aka pigeonhole
  a container
  scenery
  in the Sorting Office

  A brass-framed pigeonhole marked OUTGOING.

create the dead letters bin
  aka bin
  a container
  scenery
  in the Sorting Office

  A wire bin for letters no one will ever claim.

  on putting it
    refuse bin-sealed
  end on

  phrase bin-sealed:
    The bin is sealed under a wire grille; only the postmaster may add to it.

create the letter
  in the Sorting Office

  A letter sealed with red wax.

create the stamp
  in the Sorting Office

  A commemorative stamp, unlicked.

create the player
  starts in the Sorting Office

override message putting-put-in
  It slides in with a papery whisper.
end override
```

The player sees:

<!-- transcript: manipulation/putting-inserting.story -->
```transcript
> put the letter in the pigeonhole
(first taking the letter)

Taken.

It slides in with a papery whisper.

> insert the stamp into the pigeonhole
(first taking the stamp)

Taken.

It slides in with a papery whisper.

> insert the letter into the bin
The bin is sealed under a wire grille; only the postmaster may add to it.

> put the letter on the counter
(first taking the letter)

You take the letter from the outgoing pigeonhole.

You put the letter on the oak counter.
```

The delegation in one scene: a single `override message putting-put-in`
re-voices both phrasings, and the bin's single `on putting it`
guard catches the `insert` command too — while `put … on` renders `put_on`
untouched.

| | putting (`putting-*`) | inserting (`inserting-*`) |
|---|---|---|
| Refusals | `no_target` · `no_destination` · `cant_put_in_itself` / `cant_put_on_itself` · `already_there` · `not_container` / `not_surface` · `container_closed` · `no_room` (container) · `no_space` (supporter) | the same checks, rendered under `inserting-<key>` when the command was an INSERT |
| Success | `put_in` · `put_on` (INSERT reports through `put_in`) | — (delegates to putting) |
| Events | `put_in` / `put_on` / `put_blocked` | `insert_blocked` |

Interceptors: `on putting it` / `on inserting it` on the item or the
container — an INSERT consults `on inserting it` first, then (through the
delegation) `on putting it` on both entities, so register a given entity
under **one** of the two gerunds, not both, or it will run twice;
`on putting it` covers both phrasings, and in `put all in the case` a
container-side clause runs once per deposited item.

### 2.3 removing (taking from)

**remove X from Y** (`removing`) — take an item out of a
container or off a supporter, named source and all. Core grammar since
ADR-230: `remove X from Y`, `extract X from Y`, and `take X from Y` — the
last optionally `with/using Z`, a tool form whose named tool becomes a
consulted command entity (the old orphan `taking_with` id was retired onto
removing in the same pass). Success is semantically a take: the success
**event** is `taken`, with the source recorded in the payload.

The author writes:

<!-- fixture: manipulation/removing.story -->
```story
create the Crypt Chapel
  a room

  A low chapel of niches and candle smoke.

create the reliquary
  a container
  scenery
  in the Crypt Chapel

  A gilt reliquary, its lid long lost.

create the stone bier
  aka bier
  a supporter
  scenery
  in the Crypt Chapel

  A stone bier worn smooth at the edges.

create the ivory comb
  aka comb
  in the reliquary

  A carved ivory comb.

create the fingerbone
  aka bone
  in the reliquary

  A saint's fingerbone, brown with age.

  on taking it
    refuse bone-sacred
  end on

  phrase bone-sacred:
    The relic is not for the living to carry off.

create the linen shroud
  aka shroud
  on the stone bier

  A folded linen shroud.

create the player
  starts in the Crypt Chapel
```

The player sees:

<!-- transcript: manipulation/removing.story -->
```transcript
> remove the comb from the reliquary
You take the ivory comb from the reliquary.

> remove the shroud from the bier
You take the linen shroud from the stone bier.

> remove the fingerbone from the reliquary
The relic is not for the living to carry off.
```

Each source kind renders its own success key — and the fingerbone's
*taking* guard stops REMOVE-FROM cold: naming the source dodges nothing.

| | remove (`removing-*`) |
|---|---|
| Refusals | `no_target` · `no_source` · `already_have` · `not_in_container` / `not_on_surface` · `container_closed` · `cannot_take` (carrying capacity) · `nothing_to_remove` (`remove all from X` with nothing eligible) |
| Success | `removed_from` (a container) · `removed_from_surface` (a supporter) |
| Events | `taken` (source in the payload) |

Interceptors: the item slot consults `on removing it` and then `on taking
it`, in that order; the source consults `on removing it` only, and so does
an explicitly named tool, after item and source — as with
putting/inserting, register per entity under one gerund. Bare `remove X`
still means undressing (§5).

### 2.4 giving and showing

**give** (`giving`) — `give X to Y`, `give Y X`, `offer X to Y`.
The recipient must be a person (`a person` — the actor trait), so
`give the sword to the door` refuses with `not_actor` ("You can only give
things to people."). Giving does an implicit take if the item is not in
hand. The default NPC accepts anything: the item moves into their
inventory and the player sees `given`. Three data-driven wrinkles read
from the recipient's actor data: an item-count capacity (`inventory_full`)
and a weight capacity (`too_heavy`), both phrased as the NPC declining,
and a `preferences` object whose `refuses` list blocks matching items with
`not_interested` while `likes`/`dislikes` color acceptance as
`gratefully_accepts` / `reluctantly_accepts`.

**show** (`showing`) — `show X to Y`, `show Y X`. Purely social:
nothing moves, nothing changes hands. The viewer must be a person in the
same room (`viewer_too_far` otherwise); the item is implicitly taken if
needed. The default reaction is `shown` — or `wearing_shown` when the item
is currently worn — and a viewer with a `reactions` object in its actor
data reacts by item-name match (the modern replacement for `reactions` is
an `on showing it` clause on the viewer, which can do anything).

The author writes:

<!-- fixture: manipulation/giving-showing.story -->
```story
create the Ferry Dock
  a room

  A weathered dock; the ferry rocks at its mooring.

create the ferryman
  a person
  in the Ferry Dock

  A stooped ferryman, palm out, endlessly patient.

  after giving it
    phrase fare-paid
      The ferryman bites the token, nods, and pockets it.
  end after

  on showing it
    phrase ferryman-appraises
      The ferryman leans in, squints, and names a price you pretend not to hear.
  end on

create the bone token
  aka token

  A ferry token carved from bone.

create the silver locket
  aka locket

  Your mother's locket. It does not leave your neck.

  on giving it
    refuse locket-keepsake
  end on

  phrase locket-keepsake:
    You close your fist around the locket; some things are not for trade.

create the player
  starts in the Ferry Dock
  carries the bone token
  carries the silver locket
```

The player sees:

<!-- transcript: manipulation/giving-showing.story -->
```transcript
> give the locket to the ferryman
You close your fist around the locket; some things are not for trade.

> show the locket to the ferryman
The ferryman leans in, squints, and names a price you pretend not to hear.

> give the token to the ferryman
You give the bone token to the ferryman.

The ferryman bites the token, nods, and pockets it.
```

Both sides of the transaction are consulted: the locket's item-side guard
vetoes the trade, the ferryman's `after giving it` reacts once it commits,
and his `on showing it` replaces the flat `shown` line entirely. For a
transaction richer still — a guard who takes the bribe and opens the
gate — the Sharpee Way is a capability behavior registered for
`giving` on the recipient, which takes over the whole exchange.

| | give (`giving-*`) | show (`showing-*`) |
|---|---|---|
| Refusals | `no_item` · `no_recipient` · `not_actor` · `self` · `not_holding` · `recipient_not_visible` · `recipient_not_reachable` · `inventory_full` / `too_heavy` (capacity, phrased as declining) · `not_interested` (`preferences.refuses`) | `no_item` · `no_viewer` · `not_actor` · `self` · `not_carrying` · `viewer_not_visible` · `viewer_too_far` |
| Success | `given` · `gratefully_accepts` / `reluctantly_accepts` (likes/dislikes) · `accepts` and `refuses` exist for story use — stdlib itself never picks them | `shown` · `wearing_shown` (worn item) · `reactions` matches: `viewer_recognizes` · `viewer_impressed` · `viewer_unimpressed` · `viewer_examines` · fallback `viewer_nods` |
| Events | `given` / `give_blocked` | `shown` / `show_blocked` |

Interceptors: `on giving it` / `after giving it` and `on showing it` /
`after showing it`, on the item or on the recipient/viewer.

### 2.5 throwing

**throw** (`throwing`) — `throw X at Y` and `throw X to Y`, with
`toss` and `hurl` in both forms. (The action also implements bare and
directional throws — `throw the rock`, `throw the rock north` — but no
core grammar reaches them today; a story must add those patterns itself.)
The item is implicitly taken if needed; the target must be in the same
room; anything heavier than 10 kg refuses with `too_heavy`.

What happens next is probabilistic — document-worthy behavior, not a bug,
and per project policy the dice are never disabled. The platform infers
fragility from the item's name and description (glass, crystal, bottle,
vase, china, porcelain, "delicate", "fragile"). Throwing **at a person**:
about a 70% hit — a nimble target may duck (`target_ducks`), a catcher may
catch (`target_catches`, and then they hold it), a hit lands `hits_target`
and annoys them (`target_angry`); a fragile item that hits usually breaks
(`breaks_against`). Throwing **at anything else**: about a 90% hit; the
item lands on a supporter (`lands_on`), in an open container (`lands_in`),
bounces off a closed one (`bounces_off`), and fragile items usually break.
A broken item is removed from play entirely, with an
`item_destroyed` event (`cause: 'thrown'`).

The author writes:

<!-- fixture: manipulation/throwing.story -->
```story
create the Taproom
  a room

  A low-beamed taproom, all smoke and sawdust.

create the stone hearth
  aka hearth
  scenery
  in the Taproom

  A soot-blackened stone hearth.

create the gilt mirror
  aka mirror
  scenery
  in the Taproom

  The landlord's prized gilt mirror, hung above the bar.

  on throwing it
    refuse mirror-luck
  end on

  phrase mirror-luck:
    Seven years' bad luck, and the landlord watching? You lower your arm.

create the green bottle
  aka bottle

  An empty green glass bottle.

create the player
  starts in the Taproom
  carries the green bottle
```

The player sees (one genuine run — the second command rolls live dice):

<!-- transcript: manipulation/throwing.story -->
```transcript
> throw the bottle at the mirror
Seven years' bad luck, and the landlord watching? You lower your arm.

> throw the bottle at the hearth
The green bottle smashes against the stone hearth!
```

The mirror's target-side guard is deterministic; the hearth throw is not —
the same command can also miss, or hit without breaking. This run's
"bottle" name made the item fragile, and the smash removed it from play.

| | throw (`throwing-*`) |
|---|---|
| Refusals | `no_item` · `not_holding` · `target_not_visible` · `target_not_here` · `no_exit` · `too_heavy` (over 10 kg) · `self` |
| Outcomes | `hits_target` · `misses_target` · `target_ducks` · `target_catches` · `target_angry` · `lands_on` · `lands_in` · `bounces_off` · `breaks_against` · `breaks_on_impact` · `fragile_breaks` · `thrown_down` · `thrown_gently` · `sails_through` |
| Events | `thrown` (`throwType`, `hit`, `willBreak`, `finalLocation` in the payload — enough for a story reaction to know exactly what happened) / `throw_blocked` · `item_destroyed` (`cause: 'thrown'`) |

Interceptors: both the item and the target are consulted (`on throwing it`
on either) — a glacier can react to being hit in the same command as an
explosive reacts to being thrown; a capability behavior registered for
`throwing` on the target takes over the whole throw.

### 2.6 pushing, pulling, touching

**push** (`pushing`) — verbs `push`, `press`, `shove`, `move`,
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
`pushed` (it carries the direction) or an `after pushing it`
clause to actually change the world; which wall opens is puzzle logic, not
platform logic. One honest gap: from a `.story` file, bare `pushable`
composes the default button configuration — selecting `heavy` or
`moveable` is TypeScript territory today.

**pull** (`pulling`) — verbs `pull`, `drag`, `yank`, `tug`.
Needs `pullable`. A successful pull sets the trait's state to `pulled` (a
second pull refuses `already_pulled`) and bumps its `pullCount`; a worn
item refuses `worn`. Everything a pull *means* — the lever opens the
sluice — is story logic reacting to `pulled` or written as an
`on pulling it` / `after pulling it` clause.

**touch** (`touching`) — verbs `touch`, `feel`, `rub`, `pat`,
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

| | push (`pushing-*`) | pull (`pulling-*`) | touch (`touching-*`) |
|---|---|---|---|
| Refusals | `no_target` · `fixed_in_place` · `pushing_does_nothing` · `wont_budge` (heavy, no direction) · `wearing_it` · `too_heavy` | `no_target` · `cant_pull_that` · `already_pulled` · `worn` | `no_target` (touch refuses almost nothing) |
| Success | `button_pushed` · `button_clicks` · `switch_toggled` · `pushed_with_effort` · `pushed_direction` · `reveals_passage` · `pushed_nudged` | `pulled` · `nothing_happens` | `feels_hot` · `feels_warm` · `device_vibrating` · `feels_soft` · `feels_smooth` · `feels_hard` · `liquid_container` · `feels_wet` · `feels_normal` · `immovable_object` · `touched` · `touched_gently` · `poked` · `prodded` · `patted` · `stroked` |
| Events | `pushed` | `pulled` | `touched` / `touch_blocked` |

Interceptors: `on`/`after pushing it`, `pulling it`, `touching it` on the
target. Touching, with no state of its own, is a favorite probe to hang
flavor on (`on touching it`) — listening plays the same role for sound
(§6.3).

### 2.7 lowering and raising (per-entity verbs)

`lower :target` and `raise`/`lift :target` parse out of the box, but these
verbs have **no standard behavior at all** — lowering the basket, the
drawbridge, and your voice are three different mutations, so the platform
refuses to invent one (ADR-090). Unhandled, the player sees the refusal
`lowering-cant-lower-that` (`cant_raise_that` for raising) and
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

| | lower (`lowering-*`) | raise (`raising-*`) |
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
registered for `lowering` (the Sharpee Way — how Dungeo's basket
works).

TURN left this family on its own terms: `turn`/`rotate`/`twist X` still
parse (just below the switching phrasal forms, so `turn lamp on` still
switches, §7.1) and the unhandled refusal is still
`turning-cant-turn-that`, but turning now wears cutting's dual
surface without the trait gate (§2.8) — an `on turning it` clause directly
on the entity is consulted (turning is one of the 38 wired actions), or a
TypeScript capability behavior for `turning` takes the whole
turn; no eligibility trait, no define-action scaffolding needed. WAVE and
WIND — the other classic per-entity verbs — still have no binding at all:
no grammar, no action; a story wanting them defines the whole verb with
`define action`, exactly as above.

### 2.8 cutting and digging

Two tool verbs with one design (ADR-230 D3c): the platform action gates
eligibility and validates the tool; the *outcome* belongs to the entity.
**cut** (`cutting`) parses bare — `cut X` (also `slice`,
`chop`) — and tooled as `cut X with/using Y` (the tooled form outranks
when a tool is named); **dig** (`digging`) likewise as `dig X`
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

| | cut (`cutting-*`) | dig (`digging-*`) |
|---|---|---|
| Refusals | `no_target` · `not_cuttable` · `no_tool` · `tool_not_held` · `wrong_tool` · `cant_cut` | `no_target` · `not_diggable` · `no_tool` · `tool_not_held` · `wrong_tool` · `cant_dig` |
| Success | `cut` (the generic stub — the entity's own text renders over it) | `dug` (same) |
| Events | `cut` / `cut_blocked` | `dug` / `dug_blocked` |

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
`effects`) as data for story handlers reacting to `pulled`.

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

## 3. Movement

Getting an actor from place to place: rooms and their exits, things you can
get inside or on top of, and things you can climb.

### 3.1 going

**go** (`going`) — `go north`, `walk`/`run`/`head`/`travel
north`, or just the direction (the synonym forms and a fixed
`go <direction>` rule landed with ADR-230 D4). Twelve direction words
parse: `north`/`n`, `south`/`s`, `east`/`e`, `west`/`w`,
`northeast`/`ne`, `northwest`/`nw`, `southeast`/`se`, `southwest`/`sw`,
`up`/`u`, `down`/`d`, plus `in`/`inside` and `out`/`outside`.

Exits are room data — the direction lines of a room's `create` block,
including blocked and conditionally blocked exits (chord-language.md
§2.5 owns that syntax) and deadly exits (§9.2 here). A blocked exit
refuses with `movement_blocked` and speaks the story's own phrase — and
a direction can be blocked without leading anywhere, which is how "the
hedge is too thick" works. An exit may route through a door (§4.3),
which refuses while locked (`door_locked`) or closed (`door_closed`).
Darkness gates seeing, not moving: walking into a dark room succeeds
and only the arrival description is lost, replaced by `too_dark`
(light rules: §6.1; anything worse than not-seeing — a grue — is death
machinery, §9). Vehicles change whose feet move — one line in §3.4,
TypeScript-only today.

The author writes:

<!-- fixture: movement/going.story -->
```story
create the Walled Garden
  a room
  north to the Potting Shed through the green door
  east to the Grotto
  south is blocked: wall-too-high

  Espaliered pears line the old brick walls.

create the green door
  a door
  aka door

  A green door in the north wall, painted and peeling.

  on going it
    refuse when the player holds the wheelbarrow: barrow-too-wide
  end on

  phrase barrow-too-wide:
    The wheelbarrow jams in the doorway. You back out again.

create the Potting Shed
  a room

  Clay pots on every shelf, and the smell of compost.

  after entering it, once
    phrase shed-memory
      You spent a whole summer in here once, pricking out seedlings.
  end after

create the Grotto
  a room, dark
  west to the Walled Garden

  Dripping stone and ferns nobody planted.

create the wheelbarrow
  aka barrow
  in the Walled Garden

  A wooden wheelbarrow, wider than it needs to be.

create the player
  starts in the Walled Garden

define phrases en-US
  wall-too-high:
    The south wall is twelve feet of smooth brick. Not without a ladder.
```

The player sees:

<!-- transcript: movement/going.story -->
```transcript
> south
The south wall is twelve feet of smooth brick. Not without a ladder.

> east
It is pitch dark. You are likely to be eaten by a grue.

> west
Walled Garden
Espaliered pears line the old brick walls.

You can see a wheelbarrow here.

> north
The green door is closed.

> open the green door
You open the green door.

> take the wheelbarrow
Taken.

> north
The wheelbarrow jams in the doorway. You back out again.

> drop the wheelbarrow
Dropped.

> north
Potting Shed
Clay pots on every shelf, and the smell of compost.

You spent a whole summer in here once, pricking out seedlings.
```

One walk covers the seams: the blocked wall speaks the story's phrase,
the dark Grotto lets you in but shows you nothing, the closed door
refuses, the door's own `on going it` guard vetoes the wheelbarrow, and
the shed's `after entering it, once` greets the first arrival.

| | go (`going-*`) |
|---|---|
| Refusals | `no_direction` · `not_in_room` (in a vehicle, not a room) · `no_exits` · `no_exit_that_way` · `movement_blocked` (the story's blocked phrase) · `door_locked` · `door_closed` · `destination_not_found` |
| Success | `moved` · `moved_to` · `first_visit` · `too_dark` (you arrived; you just can't see) |
| Events | `actor_exited` / `actor_moved` / `actor_entered`, plus `region_exited` / `region_entered` on region crossings — what `after going` clauses and daemons key off |

Interceptors: going consults three parties in order — the room being
left (`on going it`), the room being entered (its clauses bind as
`entering_room` conditions — this is how a room refuses entry rather
than refusing exit), and the door being passed through (`on going it`
on the door, as the green door shows). First refusal wins. Regions can
react to the crossing events on their own blocks — `after entering it`
/ `after leaving it` (§3.4).

### 3.2 entering and exiting

**enter** (`entering`) — `enter X`, `get in/into X`, `climb
in/into X`, `go in/into X`, `board X`, `get on X`. One gate: the target
needs the `enterable` trait — anything else refuses with
`not_enterable` (checked in the action: parse by syntax, refuse by
world, since ADR-231). A closed openable refuses with
`container_closed`; already inside → `already_inside`. The trait's one
setting, its preposition, decides whether you are *in* the bathtub or
*on* the park bench (`entered` vs `entered_on`); `on` is a TypeScript
setting today (§3.4). There is no occupancy limit — `too_full` is
reserved but never fires.

**exit** (`exiting`) — bare `exit`, `leave`, `get out`, `go
out`, `climb out`, `disembark`, `alight`. A named target parses too —
`exit the chair` — and naming something you aren't inside refuses with
`not_in_that` (ADR-231). EXIT undoes an ENTER: out of the container,
off the supporter. Standing in a plain room refuses with
`already_outside` — leaving rooms is GO's job. A closed openable
container refuses with `container_closed`: you can shut yourself in.

The author writes:

<!-- fixture: movement/entering-exiting.story -->
```story
create the Laundry
  a room

  Copper tubs, drying racks, and a mangle with an evil reputation.

create the laundry chest
  aka chest
  a container, enterable, openable, starts open
  in the Laundry

  A wicker chest big enough to hide in.

create the mangle
  scenery
  in the Laundry

  Two iron rollers and a crank. Keep your fingers clear.

create the player
  starts in the Laundry
```

The player sees:

<!-- transcript: movement/entering-exiting.story -->
```transcript
> enter the mangle
You can't enter the mangle.

> get into the chest
You get into the laundry chest.

> close the chest
You close the laundry chest.

> exit
The laundry chest is closed.

> open the chest
You open the laundry chest.

Inside the laundry chest you see yourself.

> exit
You get out of the laundry chest.

> exit the chest
But you aren't in the laundry chest.

> exit
You're not inside anything.
```

One trait draws the line — the mangle turns you away, the chest lets
you in — and the composed openable makes the lid real: closed, it holds
you until you open it from the inside (revealing, honestly, yourself).

| | enter (`entering-*`) | exit (`exiting-*`) |
|---|---|---|
| Refusals | `not_enterable` · `container_closed` · `already_inside` (`too_full` reserved, never fires) | `already_outside` · `not_in_that` · `container_closed` (shut in) · `nowhere_to_go` |
| Success | `entered` · `entered_on` (`on`-preposition supporters) | `exited` · `exited_from` |
| Events | `entered` | `exited` |

Cross-references: `climb into X` is entering and `climb out` is exiting
(§3.3); the `enterable` trait and the vehicle trait that rides on it
are in §3.4.

### 3.3 climbing

**climb** (`climbing`) — `climb X`, `climb up/down X`,
`scale`, `ascend`, `descend X`, all gated on the `climbable` trait
(`climb into the basket` is entering; `climb out` is exiting, §3.2).
Climbing something puts you *on* it — the same place putting yourself
on an enterable supporter gets you; an unclimbable target refuses with
`not_climbable`, being already up there with `already_there`.

The author writes:

<!-- fixture: movement/climbing.story -->
```story
create the Orchard Corner
  a room

  One great pear tree leans over the garden wall here.

create the pear tree
  aka tree
  a supporter, climbable
  scenery
  in the Orchard Corner

  Low branches all the way up, practically a ladder.

  after climbing it
    phrase over-the-wall
      From up here you can see clear over the wall into the lane.
  end after

create the garden wall
  aka wall
  scenery
  in the Orchard Corner

  Twelve feet of smooth brick, no handholds.

create the player
  starts in the Orchard Corner
```

The player sees:

<!-- transcript: movement/climbing.story -->
```transcript
> climb the wall
You can't climb the garden wall.

> climb the tree
You climb onto the pear tree.

From up here you can see clear over the wall into the lane.

> climb the tree
You're already on the pear tree.

> climb out
You get out of the pear tree.
```

The supporter composed alongside `climbable` is what makes the perch
real — somewhere to actually be, so the second climb can refuse and
`climb out` has something to leave; with bare `climbable` alone the
climb speaks success but the player never leaves the room floor
(nothing can hold them).

| | climb (`climbing-*`) |
|---|---|
| Refusals | `no_target` · `not_climbable` · `already_there` · `cant_go_that_way` (directional, off-vertical) — `too_high`/`too_dangerous` reserved |
| Success | `climbed_onto` (object) · `climbed_up` / `climbed_down` (directional) |
| Events | `climbed`, plus `entered` (object) or `moved` (directional) |

Interceptors: `after climbing it` on the target — the pear tree's
comment above, and how a cliff would teleport (below). Two honest
footnotes: the action also implements directional climbing — `climb up`
meaning "take the up exit" — but no core grammar reaches it today (bare
`up`/`down` parse as going, which is usually what you want; a story
adding `climb up` as grammar gets room-exit climbing for free); and the
trait's `destination`/`direction` fields are unread by the standard
action — climbing never teleports you to a destination room, so put an
`after climbing it` clause on the cliff if you want that
(`blockedMessage`/`successMessage` are likewise story data).

### 3.4 Movement traits

**room** (`a room` — kind noun). The place actors stand. Everything a
room does in a `.story` file happens in its `create` block: direction
lines, doors (`north to the Potting Shed through the green door` —
§4.3 has the door story), and blocked exits (chord-language.md §2.5);
`dark` / `dark while <condition>` (§2.3 there); a `first time` arrival
description (§2.9 there); `deadly:` (§9.2 here); states, scores, and
`on`/`after` clauses — including `after entering it`, the room-arrival
reaction the Potting Shed uses in §3.1's example.

**enterable** (`enterable` — adjective). Marks a thing the player can
get inside or on top of — the laundry chest in §3.2 composes it with
`a container, openable` so the lid is real. Composes with defaults
(preposition `in`); the `on` preposition — benches, roofs — is a
TypeScript setting today. First documented here: no story in the repo
uses it yet.

**climbable** (`climbable` — adjective). Marks a thing the CLIMB family
accepts. Defaults only from Chord (`canClimb: true`); compose a
supporter alongside it to give the climber somewhere to be (§3.3's
pear tree); the trait's `destination`/`direction`/message fields are
story-handler data (§3.3).

**exit** (trait). A passage *entity* — the "xyzzy" magic word, a tunnel
that is a thing in its own right. A room exit can route `via` such an
entity (or via a door), and pathfinding resolves it; going checks a via
entity only for open/locked state. No standard action reads the trait's
richer fields (aliases, visibility, bidirectionality) today, and it has
no Chord surface — treat it as Sharpee-Way plumbing.

**vehicle** (trait — TypeScript-only, no Chord surface). Rides on top of
`enterable`: the trait's `blocksWalkingMovement` (default true) is what
makes GO say "you're in something" instead of walking; set it false and
GO moves the vehicle itself along the room's exits, passengers and all
(`movesWithContents`). `positionRooms`/`currentPosition` track
multi-stop vehicles (the Dungeo basket's counterweight shape);
`isOperational` and `requiresExitBeforeLeaving` are read by vehicle
helpers for story use.

**region** (`a region` — kind noun, since ADR-236). A named room group,
authored region-side: `containing the Drive, the Hall` lists members
(additive — regions nest by containing each other), `after entering it`
/ `after leaving it` react to boundary crossings (`leaving` exists only
here), and an `on every turn` clause on the region block is a region
daemon, firing while the player is anywhere in a member room. The
`region_entered`/`region_exited` events going emits (§3.1) are what
these bind to. Full entry in §11.1.

**scene** — a structural trait with no Chord surface and no verb;
cataloged in §11.

## 4. Containers & openables

Getting things open, and locked. The traits here — `openable`, `lockable` —
compose freely onto containers, doors, and plain things, and the four
actions read them uniformly.

### 4.1 opening and closing

**open** (`opening`) — verbs `open`, `open up`, `unwrap`,
`uncover` (synonym forms: ADR-230 D4). Only an `openable` opens — anything
else refuses `not_openable` — and lock state gates opening (`locked`);
unlocking is its own step (§4.2). `open X with Y` is still opening
(ADR-230 D3b, no separate action), the named tool a consulted command
entity; an openable can require a tool exactly as a lockable names a key —
`openable with the crowbar` in Chord, `toolId` in TypeScript — refusing
`no_tool` / `tool_not_held` / `wrong_tool`, while an openable with no
requirement ignores an offered tool. A non-empty container's contents are
announced by a separate, replaceable piece: the `opened-revealed` chain
(ADR-094) reacts to `opened` and emits `revealed`; a story that wants a
different reveal — or none — replaces it with a `define chain
opened-revealed from "./reveal.ts"` **hatch** (an author-supplied TS
handler) rather than touching the action. Declaring the hatch makes the
story TypeScript-bearing (no longer browser-pure) — the boundary for
reaching platform internals like chains.

**close** (`closing`) — verbs `close`, `shut`, `cover`. Refuses
`not_closable`, `already_closed`, and `prevents_closing` — the last both
for one-way openables (`canClose: false`) and for an obstacle named in
`closeRequirements`. Lock state is not checked; closing never locks.

The author writes:

<!-- fixture: openables/opening-closing.story -->
```story
create the Galley
  a room

  A cramped ship's kitchen, all brass and old smoke.

create the anvil
  scenery
  in the Galley

  A blacksmith's anvil, out of place at sea.

create the biscuit tin
  aka tin
  a container, openable
  in the Galley

  A dented tin with a warped lid.

  on closing it
    refuse tin-warped
  end on

  phrase tin-warped:
    The lid is warped; it will not seat again.

create the sea chest
  aka chest
  a container, openable
  in the Galley

  A low sea chest, banded in iron.

create the tin whistle
  aka whistle
  in the sea chest

  A tin whistle on a loop of cord.

create the player
  starts in the Galley

override message closing-closed
  You swing it shut.
end override
```

The player sees:

<!-- transcript: openables/opening-closing.story -->
```transcript
> open the anvil
The anvil can't be opened.

> open the biscuit tin
You open the biscuit tin, which is empty.

> close the biscuit tin
The lid is warped; it will not seat again.

> open the sea chest
You open the sea chest.

Inside the sea chest you see tin whistle.

> close the sea chest
You swing it shut.
```

Three seams and the chain in one scene: the anvil refuses with the
platform's `not_openable`, the tin's `on closing it` guard speaks its own
refusal, the story-wide `override message closing-closed` rewrites every plain close — and
the sea chest's contents line is the `opened-revealed` chain at work.

| | open (`opening-*`) | close (`closing-*`) |
|---|---|---|
| Refusals | `no_target` · `not_openable` · `already_open` · `locked` · `no_tool` · `tool_not_held` · `wrong_tool` | `not_closable` · `already_closed` · `prevents_closing` |
| Success | `opened` · `its_empty` (a container opens onto nothing) | `closed` |
| Events | `opened`, then `revealed` via the chain | `closed` (rich payload: door/container flags, contents count) |

Interceptors: `on opening it` / `on closing it` on the target — the
humming hive box in chord-language.md §3.1 is exactly this seam — and
opening consults an explicitly named tool after the target (target →
tool, the same ordering discipline as lock-and-key, §4.2).

Gaps: the several-tools list `toolIds` is TypeScript today; the trait's
`autoLock` field exists but is inert — closing never locks (flagged, §4.3).

### 4.2 locking and unlocking

**lock** (`locking`) and **unlock** (`unlocking`) —
every form is core grammar since ADR-230 D2: `lock X`, `lock X with/using
Y`, keyless `unlock X`, `unlock X with/using Y`, plus the `secure` /
`unsecure` aliases (D4). Both operate on the `lockable` trait. A lock
either names its key — `lockable with the iron key` in Chord,
`keyId`/`keyIds` in TypeScript — or is keyless and turns freely, which
makes the keyless forms safe by construction: a keyed lock still asks
`no_key` when no key is named. The key rules, shared by both actions: a
named key you are not holding refuses `key_not_held`; the wrong key
refuses `wrong_key`. Locking additionally requires the thing be closed
first (`not_closed`), and both refuse the redundant case (`already_locked`
/ `already_unlocked`). One quirk worth knowing: on a *keyless* lock a
named object is neither required nor checked — `lock the box with the
herring` succeeds and even says `locked_with`.

The author writes:

<!-- fixture: openables/locking-unlocking.story -->
```story
create the Vestry
  a room

  Vestments on pegs, and a deep stone niche.

create the reliquary
  a container, openable, lockable with the bone key, starts locked
  in the Vestry

  A silver reliquary, older than the church around it.

create the knucklebone
  in the reliquary

  A saint's knucklebone, brown with age.

create the bone key
  aka key

  A key carved from a bird's hollow bone.

  on locking it
    refuse key-never-seals
  end on

  phrase key-never-seals:
    The bone key turns only one way; it opens, it never seals.

create the player
  starts in the Vestry
  carries the bone key
```

The player sees:

<!-- transcript: openables/locking-unlocking.story -->
```transcript
> open the reliquary
The reliquary is locked.

> unlock the reliquary
What do you want to unlock it with?

> unlock the reliquary with the bone key
You unlock the reliquary with the bone key.

> open the reliquary
You open the reliquary.

Inside the reliquary you see knucklebone.

> close the reliquary
You close the reliquary.

> lock the reliquary with the bone key
The bone key turns only one way; it opens, it never seals.
```

The keyless UNLOCK asks rather than fails, lock state gates opening until
the key turns, and the last command is ADR-229's ordering made visible:
each action consults the **target first, then the key** — the reliquary
has nothing to say, so the bone key's own `on locking it` clause vetoes
its use (and note the key contract resolved even though the bone key is
declared *after* the reliquary — forward references are legal).

| | lock (`locking-*`) | unlock (`unlocking-*`) |
|---|---|---|
| Refusals | `not_lockable` · `no_key` · `key_not_held` · `wrong_key` · `not_closed` · `already_locked` | `not_lockable` · `no_key` · `key_not_held` · `wrong_key` · `already_unlocked` |
| Success | `locked` · `locked_with` | `unlocked` · `unlocked_with` |
| Events | `locked` / `lock_blocked` | `unlocked` / `unlock_blocked` (key, sound, and container/door flags in the payload) |

Interceptors (ADR-229): target first, then the key, each side's clause
seeing the other's identity in its context — and only an *explicitly
named* key is consulted; a key the platform infers is not a command
entity.

Gaps: the several-keys list `keyIds` is TypeScript today.

### 4.3 Openable, lockable, and door

**openable** (`openable` — adjective). Two states, open and closed, owned
by the platform; `startsOpen` defaults to closed, and from Chord the
adjective composes closed with `starts open` on the composition line
seeding it open (ADR-231; chord-language.md §2.11). A required tool
composes too — `openable with the crowbar` (§4.1). The biscuit tin and
sea chest of §4.1 are this trait at work. The remaining settings —
`canClose: false` (one-way openable), `closeRequirements` (a named
obstacle), `openSound`/`closeSound` (ride along in events),
`open/closedDescription` (swap description text) — are TypeScript
territory today.

**lockable** (`lockable`, optionally `with the <key>` — adjective).
Locked/unlocked state — starts unlocked everywhere except on a door,
where a lockable door starts locked until the author says `starts
unlocked` (ADR-234's one kind-scoped default); Chord also seeds `starts
locked` on any composition line (ADR-231), as the reliquary of §4.2 does.
The key contract: `with the <key>` in Chord (`keyId` in TypeScript;
several keys via `keyIds`, TypeScript only), and a lock without keys is a
latch anyone can turn. `lockSound` / `unlockSound` decorate the events.
Two declared fields are inert today — `autoLock` (relock-on-close is
implemented but never invoked) and `acceptsMasterKey` (never read) —
don't build a puzzle on them; flagged.

**door** (`a door` — kind noun, since ADR-234). A door is an entity that
*is* the connection — but the connection is written on the room's exit
line, not the door's block: `down to the Cellar through the cellar door`.
The reverse exit is inferred (opposite direction, no far-room line
needed; a mirrored line is legal but must agree exactly), and the door
block itself is pure declaration — `a door` composes scenery and openable
automatically, starting closed (`starts open` overrides) and, when
lockable, locked (`starts unlocked` overrides). The loader wires
everything through the one platform path (`connectRooms` with a door id,
ADR-237), so going refuses `door_closed` / `door_locked` (§3.1) with no
story code at all, and the door answers from both of its rooms —
ADR-238's two-sided presence, without leaking the far room.

The author writes:

<!-- fixture: openables/cellar-door.story -->
```story
create the Landing
  a room
  down to the Cellar through the cellar door

  A stone landing at the top of a worn stair.

create the Cellar
  a room

  Casks and cobwebs, and a smell of wet earth.

create the cellar door
  a door, lockable with the iron key

  Oak planks strapped with iron, set flush in the floor.

create the iron key
  aka key

  A heavy iron key, cold in the hand.

create the player
  starts in the Landing
  carries the iron key
```

The player sees:

<!-- transcript: openables/cellar-door.story -->
```transcript
> down
The cellar door is locked.

> unlock the cellar door with the iron key
You unlock the cellar door with the iron key.

> down
The cellar door is closed.

> open the cellar door
You open the cellar door.

> down
Cellar
Casks and cobwebs, and a smell of wet earth.

> close the cellar door
You close the cellar door.
```

One exit line and one declaration buy the whole protocol: the lockable
door starts locked by the kind-scoped default, going refuses
`door_locked` then `door_closed` with no story code, the standard
lock-and-key actions work on the door itself, and the final command
closes the same door from its far side — two-sided presence.

`through` never creates a door, and the compiler refuses what it can't
answer — a declared door no exit line connects, a placement line on a
door block (its location IS its room pair), `through` naming a non-door,
conflicting room pairs — each with its own diagnostic.

Gaps: under the trait, `room1`, `room2`, `bidirectional` — one-way doors
(`bidirectional: false`, traversing room1 → room2 only) are
TypeScript-only, and the `, one-way` exit-line modifier is reserved but a
parse error today.

## 5. Wearing

Putting clothes on and taking them off. One trait — `wearable` — powers the
whole family, and this family's grammar is complete: every verb the help
lists actually parses.

### 5.1 wearing and taking_off

**wear** (`wearing`) — verbs `wear X`, `don X`, `equip X`,
`put on X` (the phrasal form outranks generic `put`). Needs the `wearable`
trait (`not_wearable` otherwise). You don't have to be holding it — wearing
performs an implicit take first, refusing with the take's own refusal if
that fails. The conflict rules key on the trait's body part and layer: you
cannot put a garment on *under* something already worn over it — but
because every wearable defaults to the same layer, default-built garments
never conflict and simply stack (the §5.2 quirk). Already wearing it →
`already_wearing`. Success sets the worn state and says `worn`; event
`worn` carries `bodyPart` and `layer` in the payload.

**take off** (`taking_off`) — verbs `take off X`, `take X off`,
`remove X`, `doff X`, `unequip X`. (Yes — bare `remove X` means undressing,
which is why take-from-container needed its own action, §2.3.) Refuses when
the thing is not worn by you (`not_wearing`), when a higher layer is worn
over it (`prevents_removal`), and when the garment is cursed
(`cant_remove`) — all validate-phase since ADR-229, so a refused removal
never half-happens. Success clears the worn state (`removed`); the item
stays in inventory.

A `wears` line on an actor starts the story dressed (load error unless the
item is `wearable`), and `worn`/`unworn` are live state predicates —
`while the cloak is worn` is story logic.

The author writes:

<!-- fixture: wearing/wearing-taking-off.story -->
```story
create the Vestry
  a room

  Robes and vestments hang from a row of pegs.

create the woolen tunic
  aka tunic
  wearable

  A plain tunic, scratchy but warm.

create the brocade vest
  aka vest
  wearable
  in the Vestry

  A stiff vest sewn with gold thread.

create the iron torc
  aka torc
  wearable
  in the Vestry

  A ring of black iron, hinged like a shackle.

  on taking_off it
    refuse torc-stuck
  end on

  phrase torc-stuck:
    The torc's hinge has seized; it will not open.

create the player
  starts in the Vestry
  wears the woolen tunic
```

The player sees:

<!-- transcript: wearing/wearing-taking-off.story -->
```transcript
> wear the vest
(first taking the brocade vest)

Taken.

You put on the brocade vest.

> take off the tunic
You take off the woolen tunic.

> wear the torc
(first taking the iron torc)

Taken.

You put on the iron torc.

> take off the torc
The torc's hinge has seized; it will not open.
```

Three seams in one scene: `wears` starts the player dressed in the tunic,
the default layers let the vest stack straight over it and the tunic slide
out from underneath (the §5.2 quirk, live), and the torc's `on taking_off
it` guard is a cursed garment in one clause.

| | wear (`wearing-*`) | take off (`taking-off-*`) |
|---|---|---|
| Refusals | `no_target` · `not_wearable` · `not_held` · `already_wearing` · `cant_wear_that` · `hands_full` (worn under a higher layer) | `no_target` · `not_wearing` · `prevents_removal` (higher layer on top) · `cant_remove` (cursed) |
| Success | `worn` | `removed` (the item stays in inventory) |
| Events | `worn` / `wear_blocked` | `removed` / `take_off_blocked` |

Interceptors: `on wearing it` / `on taking_off it` on the garment — a cloak
that reacts to being donned is one clause on the cloak.

### 5.2 Wearing traits

**wearable** (`wearable` — adjective). The one live trait here. Fields
stdlib actually reads: the worn state (`worn`, `wornBy`), `bodyPart`
(default `torso`) and `layer` (default 1) for the conflict rules, plus the
undeclared `cursed` property the removal check probes. The layer-default
quirk: because `layer` defaults to 1, the "same body part, no layers"
conflict branch is unreachable, and garments built with the defaults never
conflict at all — that is why the vest in §5.1 goes on over the worn tunic
and the tunic comes off from underneath it. Set explicit layers (TypeScript
today) and the layering rules engage: `hands_full` on wear,
`prevents_removal` on removal. Several declared fields are dormant (`slot`,
`blocksSlots`, `wearableOver`, `canRemove`, `weight`, `bulk`, the message
overrides) — don't build on them yet.

**clothing** (trait — dormant, and a gotcha). Duplicates the wearable
fields and adds material/style/condition, but **no action reads it** — and
because it is a *different* trait type, an item composed with only
`clothing` fails wearing's `wearable` check and cannot be put on. Use
`wearable` and keep fabric flavor in descriptions.

**equipped** (trait — combat-adjacent). Equipment slots and stat modifiers;
the wearing actions ignore it — `equip` the verb is just a synonym for wear
— and its one live consumer is combat's weapon selection (§8.2).
TypeScript-only.

**open-inventory** (trait — a scope marker, no fields). Composed onto an
NPC, it makes what they carry *reachable*, not just visible — the
difference between admiring the guard's key ring and being able to take it
(§2.1) or use it in a lock (§4.2). TypeScript-only today.

## 6. Senses & examination

How the player perceives the world: the room at a glance, a thing up
close, what is hidden inside, and what things say when read.

### 6.1 looking and examining

**look** (`looking`) — bare `look`, `l`, `look around`.
Rerenders the room: name and description (a first visit prefers the
room's first-time description and marks the room visited), the "You can
see …" list (scenery excluded), and the contents of open containers and
supporters in view. In a dark room all of that collapses to `room_dark`.

**examine** (`examining`) — `examine X`, `x X`, `inspect X`,
`check`/`view`/`observe X` (ADR-230 D4), `look at X`, and `look
[carefully] at X` — the adverb adds nothing; the separate
`examining_carefully` id it used to parse to is gone (ADR-230 D3a).
Needs only visibility, not reach. The reply is the entity's description;
an open container or supporter adds a contents line, and a live
**detail** sentence can ride on the end of the description — Chord's
gated `phrase detail while <condition>:` override (chord-language.md
§2.10) is exactly that seam. The message key is trait-aware, first
match wins: `examined_container`, `examined_supporter`,
`examined_switchable`, `examined_readable`, `examined_wearable`,
`examined_door` — otherwise plain `examined`.

The author writes:

<!-- fixture: senses/looking-examining.story -->
```story
create the Observatory
  a room

  A domed room of cold air and colder brass.

create the brass telescope
  aka telescope
  scenery, switchable
  in the Observatory

  A long brass telescope aimed at the slot in the dome.

  phrase detail while it is on:
    Its clockwork drive ticks as it tracks the sky.

create the star chart
  aka chart
  in the Observatory

  A chart of the northern constellations.

create the player
  starts in the Observatory
```

The player sees:

<!-- transcript: senses/looking-examining.story -->
```transcript
> look
Observatory
A domed room of cold air and colder brass.

You can see a star chart here.

> examine the telescope
A long brass telescope aimed at the slot in the dome.

> turn on the telescope
The brass telescope hums to life.

> examine the telescope
A long brass telescope aimed at the slot in the dome. Its clockwork drive ticks as it tracks the sky.
```

The scenery telescope stays out of the "You can see …" list but
examines fine, and the `detail while` phrase appends its sentence to
the description only while the condition holds.

| | look (`looking-*`) | examine (`examining-*`) |
|---|---|---|
| Refusals | (`room_dark` in the dark) | `no_target` · `not_visible` |
| Success | `contents_list` · `container_contents` · `surface_contents` | `examined` · `examined_self` · `examined_container` · `examined_supporter` · `examined_switchable` · `examined_readable` · `examined_wearable` · `examined_door` · `nothing_special` |
| Events | `looked` · `room-description` · `list-contents` | `examined` |

Interceptors: `on examining it` / `after examining it` on the target
(the robin in chord-language.md §2.10 rides this seam). Looking
consults no interceptor clauses — there is no entity to hang them on;
use the room's `after entering it` or an `on every turn` daemon
instead.

Brief mode is not implemented — verbose is hardcoded on, so
`room_description_brief` is unreachable.

### 6.2 searching and reading

**search** (`searching`) — `search X`, `look in/inside X`,
`look through X`, `rummage in/through X`, or bare `search` for the room
(`find`/`locate` were removed from the vocabulary in ADR-230 —
searching is the wrong semantics for them). A closed openable container
refuses `container_closed`; otherwise searching reports contents — and
it is the action that **reveals hidden items**: a thing whose identity
is marked `concealed` (in Chord, the `concealed` adjective on the
composition line) is invisible to the parser until a search finds it,
permanently reveals it, and announces `found_concealed`. This
hidden-*item* flag is not the `concealment` trait (§6.4), which is
about hiding *actors*.

**read** (`reading`) — `read X`, `peruse X`, `study X`, gated
on the `readable` trait (`not_readable`: "There's nothing written on
it"). Portable reading matter is implicitly taken first; scenery —
signs, inscriptions — reads in place. The text comes from the trait:
`text` (in Chord, `readable with text ...`), or a page of `pageContent`
for multi-page books, and the message key follows `readableType`:
`read_text`, `read_book` / `read_book_page` (with page numbers),
`read_sign`, `read_inscription`. A readable can be switched off
(`isReadable: false` + `cannotReadMessage` → `cannot_read_now`) —
glowing runes that only read when lit. Reading marks `hasBeenRead`
(story logic can gate on it).

The author writes:

<!-- fixture: senses/searching-reading.story -->
```story
create the Attic
  a room

  Dust, rafters, and one bar of grey light.

create the loose floorboard
  aka floorboard, board
  scenery, a supporter
  in the Attic

  One board sits a little proud of its neighbors.

create the faded letter
  aka letter
  concealed
  readable with text "My dear Edmund - the deed went to the county bank."
  on the loose floorboard

  A single page in browned ink.

create the beam inscription
  aka inscription
  scenery
  readable with text "T.W. + E.W. 1893"
  in the Attic

  Letters cut into the lowest rafter.

create the player
  starts in the Attic
```

The player sees:

<!-- transcript: senses/searching-reading.story -->
```transcript
> take the letter
You can't see any such thing.

> search the floorboard
Hidden on the loose floorboard, you discover: a faded letter.

> read the letter
(first taking the faded letter)

You take the faded letter from the loose floorboard.

The faded letter reads:
My dear Edmund - the deed went to the county bank.

> read the floorboard
There's nothing written on the loose floorboard.

> read the inscription
The beam inscription reads:
T.W. + E.W. 1893
```

Until the search, the concealed letter is invisible even to the parser;
once revealed, reading takes the portable letter first, while the
scenery inscription reads in place.

| | search (`searching-*`) | read (`reading-*`) |
|---|---|---|
| Refusals | `container_closed` | `not_readable` · `cannot_read_now` |
| Success | `found_concealed_in_container` / `found_concealed_on_supporter` / `found_concealed_here` · `container_contents` · `supporter_contents` · `empty_container` · `searched_location` · `searched_object` · `nothing_special` | `read_text` · `read_book` · `read_book_page` · `read_sign` · `read_inscription` |
| Events | `searched` | `read` |

Interceptors: `on searching it` — a false bottom that only yields to a
second, gated search is one `while` clause — and `on reading it`.

The readable trait's literacy fields (`requiresAbility`) are declared
but not enforced today.

### 6.3 listening and smelling

Both parse since ADR-230 D2: `listen`, `listen to X`, and the `hear
[X]` alias; `smell` and `sniff`, bare or with a target.

**listen** (`listening`) — with a target: a running device
reports `device_running`, a stopped one `device_off`, a container
sloshes (`liquid_sounds`) or rustles (`container_sounds`) by contents,
anything else `no_sound`. Bare `listen` scans the room: running devices
→ `active_devices`, else `silence`. No preconditions at all — a pure
flavor seam.

**smell** (`smelling`) — with a target: food and drink report
`food_scent`/`drink_scent`, a lit light source `burning_scent`, an open
container with food inside `container_food_scent`, else
`no_particular_scent`; a target in another room refuses `too_far`. Bare
`smell`: smoke first (`smoke_detected`), then food (`food_nearby`),
else `no_scent`.

The author writes:

<!-- fixture: senses/listening-smelling.story -->
```story
create the Chapel
  a room

  Candle smoke and old stone.

create the pipe organ
  aka organ
  scenery
  in the Chapel

  A pipe organ that fills the far wall.

  on listening it
    phrase organ-breath
  end on

  phrase organ-breath:
    Air sighs through the pipes, a chord not quite sounding.

create the player
  starts in the Chapel
```

The player sees:

<!-- transcript: senses/listening-smelling.story -->
```transcript
> listen
You hear nothing out of the ordinary.

> listen to the organ
Air sighs through the pipes, a chord not quite sounding.

> smell the organ
The pipe organ has no particular smell.

> smell
You don't smell anything unusual.
```

The organ's `on listening it` phrase replaces the stock miss entirely;
where no clause answers, the platform's own misses are honest rather
than errors.

| | listen (`listening-*`) | smell (`smelling-*`) |
|---|---|---|
| Refusals | — | `too_far` |
| Success | `device_running` · `device_off` · `liquid_sounds` · `container_sounds` · `no_sound` · `active_devices` · `silence` | `food_scent` · `drink_scent` · `burning_scent` · `container_food_scent` · `no_particular_scent` · `smoke_detected` · `food_nearby` · `no_scent` |
| Events | `listened` / `listen_blocked` | `smelled` / `smell_blocked` |

Interceptors: like touching (§2.6), both are favorites for `on
listening it` / `on smelling it` clauses.

Separately from this action pair, the platform has a real **sound
propagation** system (the acoustic traits, §6.4): engine-level,
per-turn, event-driven — sounds travel through walls by acoustic cost
and reach listener entities. The listening *action* does not read it;
the two meet in story logic, not in stdlib.

### 6.4 Senses traits

**readable** (`readable`, optionally `with text "…"` — adjective). The
text itself, plus `readableType` (text/book/sign/inscription — picks
the message key), page fields for books (`pageContent`, `currentPage`,
`pages`), the `isReadable`/`cannotReadMessage` gate, and `hasBeenRead`.
From Chord only `text` is settable; pages and types are TypeScript. The
letter and inscription in §6.2 are both this trait.

**scenery** (`scenery` — adjective). Fixed in place: blocks taking with
`fixed_in_place` or its own `cantTakeMessage` (§2.1), drops out of "You
can see …" lists while remaining examinable (the telescope in §6.1),
and reads in place rather than being picked up (§6.2). Two more fields,
`mentioned` and `visible`, fine-tune listing and visibility —
TypeScript-only settings.

**concealment** (trait — for hiding *actors*, ADR-148). Declares an
entity as a hiding spot: which positions it supports (behind, under,
on, inside), how good the cover is, how many can hide there. The hiding
action (§8.4) validates against it and marks the hider with a dynamic
concealed-state trait whose visibility behavior makes them unseeable —
story-overridable. Composable as the `hiding-spot` adjective — bare it
supports every position, `with position <word>` narrows to one; hidden
*items* use the identity `concealed` flag instead (§6.2).

**acoustic** (trait, TypeScript-only, ADR-172/173). Sits on walls and
rates how sound crosses them: thin / default / thick / soundproof, with
a dampener variant for tapestries and peepholes.

**listener** (trait, TypeScript-only, ADR-172/173). Marks an entity as
receiving propagated sounds — the engine attaches it to the player
automatically; each delivered sound arrives as a
`sound-audibility-heard` event with rendered prose. No story ships on
this system yet; it is the platform's eavesdropping substrate.

## 7. Devices

Things that turn on and off — and the lights among them, which are how a
story pushes back the dark rooms of §3.1.

### 7.1 switching_on and switching_off

**switch on** (`switching_on`) — verbs `turn on X`, `switch on
X`, `flip on X`, the bare transitives `activate X`, `start X`, `power on
X` (ADR-230 D4), and the reversed `turn X on` — only `turn` gets the
reversed form; `switch X on` does not parse. All forms check the
`switchable` trait in validation (bare `turn X` with no on/off is the
separate per-entity turning verb, §2.7). Turning on a device that is
also a `light-source` lights it — and if that banishes darkness in the
player's room, the action follows with an automatic LOOK, so the newly
visible room describes itself before the switch-on message lands.

**switch off** (`switching_off`) — verbs `turn off X`, `switch
off X`, `flip off X`, `deactivate X`, `stop X`, `power off X`, and the
reversed `turn X off`. Turning the sole light off says `light_off` ("…
plunging the area into darkness") and leaves the player in §3.1's
dark-room world.

The author writes:

<!-- fixture: devices/switching-on-off.story -->
```story
create the Darkroom
  a room
  dark

  Developing trays line the counter, and finished prints hang from a
  wire overhead.

create the safelight
  aka lamp
  switchable, light-source
  in the Darkroom

  A red-globed safelight with a spring clamp.

  phrase detail while it is lit:
    Its red glow pools over the developing trays.

create the enlarger
  switchable
  scenery
  in the Darkroom

  A photographic enlarger on a steel column.

  on switching_on it
    refuse enlarger-unplugged
  end on

  phrase enlarger-unplugged:
    The enlarger's plug dangles loose behind the counter.

create the ventilation fan
  aka fan
  switchable, starts on
  scenery
  in the Darkroom

  A boxy ventilation fan set into the wall.

create the player
  starts in the Darkroom
  carries the safelight
```

The player sees:

<!-- transcript: devices/switching-on-off.story -->
```transcript
> look
It's pitch dark, and you can't see a thing.

> turn the safelight on
Darkroom
Developing trays line the counter, and finished prints hang from a wire overhead.

The safelight switches on, banishing the darkness.

> examine the safelight
A red-globed safelight with a spring clamp. Its red glow pools over the developing trays.

> switch on the enlarger
The enlarger's plug dangles loose behind the counter.

> stop the fan
The ventilation fan powers down with a soft whir.

> turn off the safelight
You switch off the safelight, plunging the area into darkness.
```

Four seams in one scene: illumination triggers the automatic LOOK (room
text first, then `illuminates_darkness`), the lit safelight's examine
picks up its `detail while it is lit` sentence, the enlarger's `on
switching_on it` guard refuses with its own phrase, and the `starts on`
fan goes down to the bare `stop` synonym.

| | switch on (`switching-on-*`) | switch off (`switching-off-*`) |
|---|---|---|
| Refusals | `not_switchable` · `already_on` · `no_power` (declared power requirement) | `not_switchable` · `already_off` |
| Success | `switched_on` · `light_on` · `illuminates_darkness` (dark room, after the automatic LOOK) · `with_sound` (trait's on sound) · `device_humming` | `switched_off` · `light_off` (sole light out) · `light_off_still_lit` (other lit lights share the room) · `silence_falls` (a running hum stops) · `device_stops` |
| Events | `switched_on` / `switch_on_blocked` | `switched_off` / `switch_off_blocked` |

The success key is chosen by what the device is — light, sound, flavor,
or plain — and event payloads carry light, sound, power, and timer facts
for story reactions. Interceptors: `on switching_on it` / `on
switching_off it` on the device — the enlarger above.

In Chord, `on`/`off` and `lit` work as state predicates (`while the
flashlight is on`, `while the lantern is lit`) — and declaring your own
on/off state pair on a switchable gets a fix-it telling you to compose
the trait instead. One subtlety: `is lit` reads the stored flag
strictly, so a light that has never been switched counts as not-lit in
Chord conditions even where the platform's own default would call it lit
— switch it once and the two agree.

### 7.2 Device traits

**switchable** (`switchable` — adjective). The on/off state — Chord
composes it off by default; `starts on` seeds it running (ADR-231;
chord-language.md §2.11), the §7.1 fan — plus a power model
(`requiresPower`, `hasPower`, `powerConsumption` — the `no_power`
refusal), on/off/running sounds (fed into the sound message keys and
event payloads), swap-in `onDescription`/`offDescription` text, and
`detailWhenOn` — the appended examine sentence, exactly what Chord's
`phrase detail while it is on:` lowers to (the zoo's radio and
flashlight both use it). Dormant today: the auto-off timer
(`autoOffTime` is honored at switch-on but nothing ticks the countdown)
and the per-trait message overrides (`onMessage`/`alreadyOnMessage`/…) —
flagged.

**light-source** (`light-source` — adjective). Makes a switchable shed
light: `isLit` (managed by the switching actions), `brightness`,
`litDescription`/`unlitDescription`, and `detailWhenLit` — Chord's
`phrase detail while it is lit:`, the safelight's examine line in §7.1.
The fuel model (`fuelRemaining` — empty refuses to light; `maxFuel`,
consumption rate) is dormant on the consumption side: nothing burns fuel
per turn today, so a lantern only runs out if story logic decrements it.
The zoo flashlight — `light-source, switchable` — is the shipped
example.

**button** (trait — TypeScript-only, and mostly decorative). Descriptive
fields (color, size, shape, label, `latching`); its one live effect is
in *pushing* (§2.6): a pushable button that is also switchable toggles,
and the BUTTON trait upgrades the message to `button_clicks`. Worth
knowing: pushing's toggle flips the switch state but — unlike the
switching actions — does not light or extinguish an attached light
source, so wire light-buttons through `after pushing it` story logic
(flagged as an inconsistency).

## 8. NPCs & conversation

The people a story writes, and the rougher ways a player interacts with
the world: talk, fight, eat, hide.

### 8.1 talking, asking, telling

**talk** (`talking`) — verbs `talk to/with X`, `speak to/with
X`, `chat with X`, `converse with X` (core grammar since ADR-229; story
grammar still outranks it). Not gated on being a person — talking to the
mailbox reaches the action and refuses `not_actor`, hook-visibly, so a
story can intercept even that. A bare person answers `no_response`,
which is honest: talk is shallow by design. A `conversation` object in
the actor's custom properties unlocks greeting flavor (first meeting vs.
`greets_again`, `formal_`/`casual_greeting`, `remembers_you`,
`has_topics` / `nothing_to_say`), but per-topic dialogue lives on
ask/tell's declared table instead.

**ask** (`asking`) and **tell** (`telling`) — `ask X
about Y` (also `question X about Y`, `inquire of X about Y`) and `tell X
about Y` (also `inform X about Y`); a non-person recipient refuses
`not_actor`. The topic is a first-class free-text slot (ADR-231),
resolved entity-first: a topic naming something in scope carries that
entity along, any other wording flows through as plain text, and a topic
is never scope-rejected. Bare, both actions validate the social
preconditions, mutate nothing, and report a default — asking's
`unknown_topic`, telling's `not_interested`. Real per-topic dialogue is
a declared Chord table (ADR-239): `define topics for <person> … end
topics`, one block per person, one table serving ask AND tell. Entity
rows (`about the great lamp:`) ride the platform's quiet topic-entity
resolution and are checked first; quoted rows (`about "the storm", "the
weather":`) match free text, with comma-separated aliases; a response is
a one-line statement or an indented body (`it` binds the person).
Matching is normalized whole-topic lookup — case-insensitive,
article-stripped, never fuzzy. On a hit the row fully owns the reply;
the person's `on asking it` / `on telling it` clause is the catch-all,
firing only on a miss; with neither, the stdlib defaults speak.

The author writes:

<!-- fixture: npcs/topics.story -->
```story
create the Lantern Gallery
  a room

  The top of the lighthouse, all glass and brass.

create the great lamp
  aka lamp
  scenery
  in the Lantern Gallery

  A first-order lens taller than a man.

create the keeper
  a person
  in the Lantern Gallery

  The keeper polishes the lens without looking up.

  on asking it
    phrase keeper-shrug
  end on

define topics for the keeper
  about the great lamp: phrase keeper-lamp
  about "the storm", "the weather":
    phrase keeper-storm
end topics

create the player
  starts in the Lantern Gallery

define phrases en-US
  keeper-lamp:
    "Eighty years that lens has burned," the keeper says. "It will
    outlast us both."
  keeper-storm:
    "Glass is falling," she says. "You'll want to be off the rock by
    dark."
  keeper-shrug:
    The keeper shrugs. "Lamp and weather. That's all I know."
```

The player sees:

<!-- transcript: npcs/topics.story -->
```transcript
> talk to the lamp
You can only talk to people.

> talk to the keeper
The keeper doesn't respond.

> ask the keeper about the lamp
"Eighty years that lens has burned," the keeper says. "It will outlast us both."

> ask the keeper about the weather
"Glass is falling," she says. "You'll want to be off the rock by dark."

> tell the keeper about the storm
"Glass is falling," she says. "You'll want to be off the rock by dark."

> ask the keeper about the tide
The keeper shrugs. "Lamp and weather. That's all I know."
```

The whole dispatch order in one scene: `not_actor` for a non-person, the
honest `no_response` on bare talk, the entity row riding scope
resolution, the quoted row answering either alias for ask and tell
alike, and the `on asking it` catch-all speaking only on a miss.

| | talk (`talking-*`) | ask / tell (`asking-*` / `telling-*`) |
|---|---|---|
| Refusals | `no_target` · `not_actor` · `too_far` (same room required) · `self` · `not_available` | `no_target` · `not_visible` · `too_far` · `not_actor` |
| Success | `no_response` · greeting flavor with `conversation` data (`first_meeting`, `greets_again`, `formal_`/`casual_greeting`, `remembers_you`, `has_topics` / `nothing_to_say`) | `unknown_topic` (ask) · `not_interested` (tell) — a topics row replaces both |
| Events | `talked` | `asked` / `ask_blocked` · `told` / `tell_blocked` |

Interceptors: `on talking it` on the person is talk's override seam —
the canonical TypeScript rendition is Dungeo's troll, whose `preValidate`
vetoes with its own message when he is out cold and whose `postReport`
**overrides** the core reply with GROWLS when he isn't (swap the standard
message, keep the event); the zoo's characters skip talking entirely and
speak through every-turn daemons (§12), also a legitimate pattern. The
topic reaches interceptor data (`topic`, `topicEntityId`) via the
lifecycle seed, for `while` conditions and TypeScript hooks.

Gone the other way in the ADR-239 pass: the `say X [to Y]`, `shout`, and
`whisper X to Y` patterns were **removed**, as was the `write X [on Y]`
family — their action ids had no implementations (they parsed, then
runtime-failed in every story); both return with real
conversation/writing systems, and story-grammar verbs (Dungeo's SAY) are
unaffected.

### 8.2 attacking and combat

**attack** (`attacking`) — verbs `attack/hit/strike/kill/
fight/slay/murder/break/smash/destroy X` (the last three landed with
ADR-230 D4), plus `attack/hit/strike/kill X with/using Y` (the weapon
form skips fight/slay/murder). An explicitly named weapon is implicitly
taken if needed, and is a consulted command entity — a cursed sword's
`on attacking it` clause fires; a weapon *inferred* from inventory is
not. What happens depends on the target:

- **A combatant** (the `combatant` trait) refuses
  `violence_not_the_answer` unless a combat interceptor is registered —
  real combat *is* the interceptor (normally the basic-combat extension,
  §12.4), and since ADR-215 a `.story` registers it itself: `use combat`
  in the story header wires the extension at load, no TypeScript, pure
  IR preserved. The interceptor's post-execute hook is contractually the
  combat resolution: it rolls the dice (seeded, in the extension —
  outcomes vary run to run and stay that way per project policy),
  damages through the `health` trait (§9.3), and hands stdlib the result
  to narrate. Kills emit death events (§9); a dead target refuses
  `already_dead`.
- **A breakable** (one-hit) or **destructible** (hit-pointed) thing
  genuinely breaks — `target_broke`, or `target_damaged` /
  `target_destroyed` across multiple blows, honoring armor,
  weapon-required, and wrong-weapon-type rules, with `transformTo`
  (shards replace the vase) and `revealExit` support.
- **Anything else, including a plain person without `combatant`**: the
  attack is ineffective and says so — the world model reports a reason
  code (`no_effect`, `requires_weapon`, `wrong_weapon_type`,
  `invulnerable`) and the lang layer renders the matching refusal
  (`attack_ineffective` and friends).

The author writes:

<!-- fixture: npcs/combat.story -->
```story
story "Guard Post" by "stdlib reference"
  id: ref-combat
  version: 0.0.1
  use combat

create the Guard Post
  a room

  A narrow stone room smelling of oil and rust.

create the rusty cutlass
  aka cutlass
  weapon with damage 5 and skill-bonus 2
  in the Guard Post

  Rust has not improved its edge, but it still has one.

create the deserter
  a person, combatant with health 8 and skill 30
  in the Guard Post

  A gaunt deserter with a wary eye on the door.

create the water barrel
  aka barrel
  scenery
  in the Guard Post

  A barrel of stale drinking water.

create the player
  starts in the Guard Post
```

The player sees:

<!-- transcript: npcs/combat.story -->
```transcript
> take the cutlass
Taken.

> attack the barrel
Your attack has no effect on the water barrel.

> attack the deserter with the cutlass
You land a solid blow on the deserter, dealing 6 damage!
```

One `use` line buys the whole combat layer: `combatant` and `weapon`
compose with typed fields, and the attack resolves through real dice —
the transcript shows one genuine run, and the same command may instead
answer "You swing at the deserter but miss!" (outcomes vary run to run,
by policy). The barrel line is the ineffective path speaking its
`attack_ineffective` refusal.

| | attack (`attacking-*`) |
|---|---|
| Refusals | `no_target` · `self` · `violence_not_the_answer` (combatant, no interceptor) · `already_dead` |
| Success | combat narration via the `combat.*` message families (the extension's, carried by the lang layer) · `target_broke` · `target_damaged` / `target_destroyed` |
| Events | `attacked` · death/knockout and exit-revealed events after the blow text |

Interceptors: `on attacking it` on the target — a story wanting scripted
fights replaces the reply there instead of registering combat — and on
an explicitly named weapon; a story can also register its own combat
interceptor on the same trait seam (§12.4).

### 8.3 eating and drinking

**eat** (`eating`) — verbs `eat/consume/devour X`, plus
`munch` and `nibble [on] X`, gated on the `edible` trait
(`not_edible`). Liquids refuse `is_drink` ("You should drink that, not
eat it") and solids refuse drinking with `not_drinkable` — there is no
cross-routing. Food is implicitly taken first. Multi-serving food counts
down (`eaten_some`, then `eaten_all`; exhausted → `already_consumed`),
and the message honors the trait's data: `taste`
(`delicious`/`tasty`/`bland`/`awful`), a `poison` effect (message-only —
"It tastes strange…" — no mechanical harm today), `satisfiesHunger`
(`filling` / `still_hungry`). Event: `eaten`.

**drink** (`drinking`) — verbs `drink/sip/quaff/swallow/
imbibe X`, plus `drink from X` and `sip from X`. Two things are
drinkable: an edible marked liquid — in a `.story`, the `drinkable`
adjective, which composes the edible trait with the liquid flag set,
order-independent with `edible` (ratchet G1) — or a **container of
liquid** (`containsLiquid`, TypeScript territory), open if openable.
Container drinking decrements `liquidAmount` and reports
`from_container` / `empty_now`. Verb flavor: `sipped`, `quaffed`.
Event: `drunk`.

The author writes:

<!-- fixture: npcs/eating-drinking.story -->
```story
create the Pantry
  a room

  Stone shelves, cool air, the smell of apples.

create the bramley apple
  aka apple
  edible
  in the Pantry

  A knobbly green cooking apple.

create the elderflower cordial
  aka cordial
  drinkable
  in the Pantry

  Pale gold in a stoppered bottle.

create the ship's biscuit
  aka biscuit
  edible
  in the Pantry

  Dense enough to drive nails.

  after eating it
    remove it
  end after

create the player
  starts in the Pantry
```

The player sees:

<!-- transcript: npcs/eating-drinking.story -->
```transcript
> eat the cordial
You should drink the elderflower cordial, not eat it.

> drink the apple
That's not something you can drink.

> eat the apple
(first taking the bramley apple)

Taken.

You eat the bramley apple.

> eat the apple
There's nothing left of the bramley apple to eat.

> eat the biscuit
(first taking the ship's biscuit)

Taken.

You eat the ship's biscuit.

> inventory
You are carrying:

a bramley apple

> drink the cordial
You drink the elderflower cordial.

> sip the cordial
There's nothing left to drink.
```

The cross-refusals, the implicit take, and the honest caveat as a pair:
**eating never removes the item** — the fully eaten apple stays in
inventory at zero servings — and the biscuit's `after eating it` →
`remove it` clause is the one-line remedy.

| | eat (`eating-*`) | drink (`drinking-*`) |
|---|---|---|
| Refusals | `no_item` · `not_edible` · `is_drink` · `already_consumed` | `no_item` · `not_drinkable` · `already_consumed` · `container_closed` |
| Success | `eaten` · `eaten_some` / `eaten_all` · taste flavor (`delicious`/`tasty`/`bland`/`awful`) · `filling` / `still_hungry` · `poisonous` | `drunk` · `sipped` / `quaffed` · `from_container` / `empty_now` |
| Events | `eaten` | `drunk` |

Interceptors: `on eating it` / `after eating it` and `on drinking it` /
`after drinking it` on the item, as above.

An emptied `containsLiquid` vessel stays nominally drinkable and keeps
saying `empty_now` (caveat, flagged). Neither shipped story exercises
eat/drink; the zoo's feeding is its own `feedable` trait.

### 8.4 hiding

**hide** (`hiding`) — position-shaped grammar: `hide
behind/under/on/in(side) X`, `duck behind/under/inside X`, `crouch
behind/under X`; bare `hide` does not parse. The target needs the
`concealment` trait (entry: §6.4) — in a `.story`, the `hiding-spot`
adjective, bare for every position or `with position <word>` to narrow
to one — and must support the position you named (`cant_hide_there`
otherwise). Success slips the player into hiding (`behind` and friends)
by marking them with a dynamic concealed state that defeats NPC sight.
Getting out is its own tiny action — `stand up`, `come out`, `unhide`,
`stop hiding` (**reveal**, `revealing`).

The author writes:

<!-- fixture: npcs/hiding.story -->
```story
create the Curio Shop
  a room

  Shelves of dubious antiques.

create the velvet curtain
  aka curtain
  scenery
  hiding-spot with position behind
  in the Curio Shop

  A moth-eaten curtain across the back doorway.

create the wicker hamper
  aka hamper
  scenery
  hiding-spot
  in the Curio Shop

  A hamper big enough for a person, currently full of crockery.

  on hiding it
    refuse hamper-crockery
  end on

  phrase hamper-crockery:
    You lift the lid; the hamper is packed with crockery. No room for
    you.

create the player
  starts in the Curio Shop
```

The player sees:

<!-- transcript: npcs/hiding.story -->
```transcript
> hide in the hamper
You lift the lid; the hamper is packed with crockery. No room for you.

> hide behind the curtain
You slip behind the velvet curtain.

> hide behind the curtain
You're already hidden.

> come out
You come out of hiding.

> come out
You're not hiding.
```

Two spots, two seams: the hamper's `on hiding it` guard refuses with its
own phrase, the curtain accepts exactly the position its adjective
declared, and the reveal action closes the loop with its own
`not_hidden` refusal when you try it standing in the open.

| | hide (`hiding-*`) | reveal (`revealing-*`) |
|---|---|---|
| Refusals | `nothing_to_hide` · `cant_hide_there_behind` / `_under` / `_on` / `_inside` (per-position) · `already_hidden` | `not_hidden` |
| Success | `behind` / `under` / `on` / `inside` | `revealed` |
| Events | `player_concealed` | `player_revealed` |

Interceptors: the hiding spot's `on hiding it` clauses are consulted
(the hamper above); revealing has no interceptor surface (flagged as a
minor asymmetry).

Two more honest flags. The design puts every action outside a quiet
allowlist (look, examine, wait, listen, smell, inventory, and the metas)
down as silently breaking concealment before it runs — but in the
current build that break listener is never registered, so walking,
taking, and talking do *not* actually reveal you; only the
NPC-can't-see-you half is wired (flagged; deliberately parked — the real
design is per-sense, recorded in ADR-246's companion scope). And the
trait's `capacity` field is dormant.

### 8.5 NPC & combat traits

**actor** (`a person` — kind noun). What makes something a *someone*:
pronouns (they/them default), an optional carrying capacity (the giving
refusals, §2.4), disambiguation text, and a `customProperties` bag that
conversation (§8.1) and giving preferences (§2.4) read. In Chord,
`a person` composes exactly this (plus identity) — the keeper in §8.1's
scene is the whole recipe. Everything richer is layered on top.

**npc** (trait; Chord via the core behavior adjectives — `a person, a
guard`, or `passive`, `wanderer with move-chance 50`, `follower`,
`patrol with route [ … ]`, always available, no `use` line — or
TypeScript). The platform's NPC bookkeeping: hostility flag, movement
permissions (`canMove`, allowed/forbidden rooms — in Chord, `can-move`,
`allowed-rooms`, `forbidden-rooms`), announced-movement messages, a
behavior id for the NPC turn plugin, and
conversation-state/knowledge/goals bags. Life-state does *not* live
here — that moved to `health` (ADR-226). Neither talking nor attacking
reads it; it belongs to the NPC plugin layer, and the multi-turn
behaviors it names (a guard attacking, wanderers wandering, patrols
patrolling) are §12.3's territory.

**character-model** (trait — TypeScript-only). The deep-NPC option:
personality, disposition, mood, threat assessment, beliefs and goals —
the substrate of the character-knowledge systems. Pointer only here; it
rides alongside `npc` and is consumed by its own subsystem, not by
standard actions.

**combatant** (trait; Chord under `use combat` — the deserter in §8.2's
scene, `a person, combatant with health 8 and skill 30`; `hostile true`
and friends compose the same way — or TypeScript). Combat *stats* —
skill, base damage, armor, retaliation and inventory-drop flags — and,
since ADR-226, nothing else: health, consciousness, and death live on
the required `health` trait, and `health`/`max-health` on the
composition line quietly route there (the loader attaches it for you).
To stdlib its mere presence means "combat handles this"; the stats are
the extension's business (§12.4).

**weapon** (trait; Chord under `use combat` — the cutlass in §8.2's
scene, `weapon with damage 5 and skill-bonus 2`, plus
`is-blessed`/`glows-near-danger`; durability fields are
TypeScript-only). `damage` drives best-weapon inference, plus type and
the blessed/glowing flags. Prefer equipping (§5.2) to make a weapon the
inferred choice; name it explicitly to make it a consulted command
entity.

**edible** (`edible` — adjective; a liquid composes as `drinkable`,
§8.3's cordial). `servings`, `liquid` (the eat/drink router), `taste`,
`effects`, `satisfiesHunger`/`satisfiesThirst`. The behavior-side extras
(`remainsType`, `consumeMessage`) are dormant in the stdlib path. One
type wrinkle: the drink-taste vocabulary (`refreshing`, `bitter`,
`sweet`, `strong`) isn't in the trait's declared taste union — it works
via raw data (flagged).

**breakable** and **destructible** (traits — TypeScript-only). Read by
*attacking* only (§8.2 — throwing's fragility is name-keyword inference,
not these). `breakable` is one field, `broken`; `destructible` is the
hit-point model (armor, weapon requirements, `transformTo`,
`revealExit`).

## 9. Death

Killing the player. Death is not `lose`: `lose` (chord-language.md §4.6)
ends the game with an ending event, while the constructs here run the
platform's death machinery — a died event, a story-visible veto window,
and then the defeat ending. chord-language.md §4.7 teaches the same
constructs from the author's side; this chapter carries the machinery
detail.

### 9.1 kill the player

**kill the player** (statement, peer to `win` and `lose`) — forms `kill
the player`, `kill the player <phrase-key>`, optional `when <condition>`
suffix; legal anywhere statements go: `on` and `after` clauses (entity or
trait), `on every turn [while …]` daemons, `define action` bodies, inside
`select` and `each` blocks. The phrase key is the death text (define it
like any phrase) and doubles as the recorded cause; a bare `kill the
player` records the cause `killed` and shows only the platform's ending
text.

The machinery, in order: the death text speaks, the platform's
`player-died` event fires, and at end of turn the engine
re-checks the player's actual life state — that re-check, not the event,
is the final word. A story policy that revives the player during the turn
(Dungeo's death-penalty machinery works this way) vetoes the ending;
otherwise the game ends in defeat (`game-lost`, the `death` and `endgame`
channels). Because the decision waits for end of turn, statements after
the `kill` in the same body still run. There is no built-in "restart or
undo?" prompt — that is client/story territory.

The author writes:

<!-- fixture: death/kill-player.story -->
```story
create the Generator Room
  a room

  Pipes and cables hum along every wall.

create the bare wire
  aka wire
  scenery
  in the Generator Room
  states: live, dead

  A stripped cable sags from the ceiling conduit.

  on touching it
    kill the player shock-death when it is live
    phrase wire-cold when it is dead
  end on

create the breaker lever
  aka lever, breaker
  scenery
  pullable
  in the Generator Room

  A heavy knife-switch bolted beside the door.

  on pulling it
    change the bare wire to dead
    phrase breaker-thrown
  end on

create the player
  starts in the Generator Room

define phrases en-US
  shock-death:
    The current takes you before you can let go.
  wire-cold:
    Cold and inert. The breaker did its job.
  breaker-thrown:
    The breaker slams over and the hum dies with it.
```

The player who touches the wire straight away sees the death text and
nothing after it — the game has ended in defeat:

<!-- transcript: death/kill-player.story -->
```transcript
> touch the wire
The current takes you before you can let go.
```

The player who throws the breaker first (a fresh game) lives:

<!-- transcript: death/kill-player.story -->
```transcript
> pull the lever
The breaker slams over and the hum dies with it.

> touch the wire
Cold and inert. The breaker did its job.
```

The `when` suffix is the whole gate — live wire, the `kill` fires; dead
wire, it is skipped. Note the second `when` on `phrase wire-cold`:
statements after a `kill` still run, so follow-up text must gate itself
off the fatal case.

### 9.2 Deadly exits and deadly rooms

**`<direction> is deadly: <phrase>`** marks one fatal direction,
mirroring `is blocked:`. The fatal direction is deliberately not an exit
at all — typing `north` (or `n`) never runs the going action: the command
is rewritten before validation into the internal death action (§9.3), so
the player sees the death text and nothing else, no movement prose, no
refusal.

**`deadly: <phrase>`** on a room is the rarer, harsher form: every verb
except a safe allowlist — look and examine by default — is fatal,
including objectless ones like WAIT and INVENTORY that no per-entity
clause could catch. In TypeScript the underlying trait adds two more
dials: `safeVerbs` (verb names or full action ids, matched tolerantly)
and `chance` (0–1) for probabilistic hazards à la grue — rolled on the
engine's seeded RNG, and a survived roll simply lets the verb run
normally, with no message. Neither dial is expressible from Chord today.

The author writes:

<!-- fixture: death/deadly-places.story -->
```story
create the Basalt Ledge
  a room
  down to the Steam Vault
  north is deadly: geyser-death

  Black rock, slick with spray. The geyser mutters somewhere north;
  a crevice drops away underfoot.

create the Steam Vault
  a room
  deadly: steam-death

  Scalding fog, wall to wall. There is no air to spare in here.

create the player
  starts in the Basalt Ledge

define phrases en-US
  geyser-death:
    The geyser chooses that moment. The column of boiling water makes
    the question of footing irrelevant.
  steam-death:
    The steam finds your lungs.
```

The player who walks north sees no movement prose and no refusal — only
the death text:

<!-- transcript: death/deadly-places.story -->
```transcript
> north
The geyser chooses that moment. The column of boiling water makes the question of footing irrelevant.
```

The player who climbs down (a fresh game) arrives safely — looking is on
the allowlist — and dies to the first verb that is not:

<!-- transcript: death/deadly-places.story -->
```transcript
> down
Steam Vault
Scalding fog, wall to wall. There is no air to spare in here.

> look
Steam Vault
Scalding fog, wall to wall. There is no air to spare in here.

> inventory
The steam finds your lungs.
```

The deadly exit killed without going ever running; the deadly room let
LOOK repeat but made INVENTORY — an objectless verb no `on` clause could
catch — fatal.

One gap: the conditional form `is deadly while <condition>:` parses but
is not wired yet, and the compiler says so —

<!-- fixture: death/deadly-while.story -->
```story
create the Dam Top
  a room
  states: holding, burst
  east is deadly while it is burst: flood-death

  The dam hums underfoot.
```

— fails to compile with `analysis.deadly-while-unsupported`: the
conditional deadly exit is post-scope. Use an unconditional `is deadly:`
or an `on going` clause with `kill the player when <condition>` — the
suggested clause is §9.1's pattern. (This gate moved from a load-time
refusal to a compile diagnostic in the 2026-07-20 platform sweep, so the
fixture harness pins it by code.)

### 9.3 Death traits and internals

**deadly-room** (trait; authored via `deadly:` above, or in TypeScript
for `safeVerbs`/`chance`). Fields: `cause` (defaults to the phrase key
from Chord, `'hazard'` in TS), `messageId`, `safeVerbs`, `chance`. The
Steam Vault in §9.2 is this trait's Chord surface.

**health** (trait — Chord-reachable only through combat: under `use
combat`, `combatant with health 20 and max-health 30` seeds it,
auto-attached; there is no standalone `health` adjective). The single
life-state model (ADR-226): `health`/`maxHealth`, a consciousness
threshold, an `asleep` flag, and the terminal `dead`/`causeOfDeath` pair;
the behavior owns `takeDamage`/`heal`/`kill` and the derived
`isAlive`/`isConscious`. Entities without it are simply alive — it is
opt-in, and the platform attaches one to the player lazily the first time
something kills them. Combat (§8.2) damages through it.

**deadly-room-death** (internal action — no grammar, never typed). The
redirect target both deadly forms rewrite commands into: it validates
unconditionally ("death is inevitable once redirected"), calls the
platform death sink, and reports the died event. Interceptors never see
it. One wire-shape nuance for event listeners: on this path the death
text rides the died event's `messageId`; on the `kill the player` path
the text is a separate phrase event and the died event carries only the
cause — same visible result, different payloads:

| | `kill the player` (§9.1) | deadly exit / deadly room (§9.2) |
|---|---|---|
| Refusals | none — a statement, not an action; the `when` suffix is the only gate | none — the redirect validates unconditionally, and interceptors never see it |
| Death text | the phrase key, spoken as a separate phrase event | the phrase key, riding `player-died`'s `messageId` |
| Events | `player-died` (carries only the cause) | `player-died` (carries cause and `messageId`) |
| Ending | `game-lost` on the `death` and `endgame` channels — unless a story policy revives the player inside the veto window | same |

No shipped `.story` uses these constructs yet; the live production use of
the same machinery is Dungeo's Aragain Falls (a TypeScript transformer on
the identical seam — `falls-deadly-exit.transcript` pins the behavior),
plus its gas, grue, and poison deaths through `killPlayer`.

## 10. Meta & system actions

The actions every story gets for free — no traits, no eligibility, and
(deliberately) no interceptor surface: there is no entity to hang an
`on`/`after` clause on, so none of these consult one. One small fixture
serves the whole chapter — a story header, a room, and a single scored
item:

<!-- fixture: meta/long-watch.story -->
```story
story "The Long Watch" by "Sharpee Docs"
  id: stdlib-ref-meta
  version: 1.2.0
  blurb: One night in a lighthouse, told a turn at a time.
  score found-the-flare worth 10

create the Lamp Gallery
  a room

  The top of the lighthouse, glass on every side.

create the signal flare
  aka flare
  in the Lamp Gallery

  A stubby red signal flare, sealed in wax paper.

  after taking it
    award found-the-flare
  end after

create the player
  starts in the Lamp Gallery
```

### 10.1 Information: about, help, inventory, scoring, version

**about** (`about`, `info`, `credits`) renders the story's own
metadata — for a Chord story, simply the header: title, author,
`version:` and `blurb:` flow straight through (the platform materializes
them into the story-info trait, §11.1). A TypeScript story can add
credits, ported-by, and build fields. One overridable message:
`about-success`.

**version** (`version`) prints a one-line story stamp (title and
version) plus the engine's own version line.

**help** (`help`, `?`, `commands`) renders the platform's general help;
a first-time asker gets `first_time`. Topic help (`help movement`) is
implemented in the action but unreachable — the core pattern takes no
topic slot (flagged, with `save <name>` in the same boat).

**inventory** (`inventory`, `inv`, `i`) splits what you carry from what
you wear; empty hands pick a random empty-message variant. The
abbreviations set a `brief` flag in the event for clients that care.
Burden/weight messages exist but are dormant.

**score** (`score`, `points`) reads the platform score ledger — exactly
where Chord's `score <name> worth N` / `award <name>` system deposits
(chord-language.md §2.8, §4.5): max score is summed from the declared
worths at load, awards are idempotent, and SCORE works with zero extra
setup. Ranks fall back to a computed ladder (Novice → Master); a story
can override rank, moves, and achievements through the scoring
capability (TypeScript today). `no_scoring` covers score-free stories.

The player sees:

<!-- transcript: meta/long-watch.story -->
```transcript
> about
The Long Watch
Version 1.2.0
By Sharpee Docs

One night in a lighthouse, told a turn at a time.

> score
You have scored 0 out of 10, earning you the rank of a Novice.

> take the flare
Taken.

> score
You have achieved a perfect score of 10 points!

> inventory
You are carrying:

a signal flare
```

The header alone powers ABOUT, its one `score … worth` line set the
maximum, and the flare's `award` flipped SCORE from Novice to
perfect — no scoring setup beyond those two lines.

| | Refusals | Renders |
|---|---|---|
| **about** (`about-*`) | — | `success` (title, version, author, blurb in one message) |
| **help** (`help-*`) | — | `general` · `first_time` (first ask) · `unknown_topic` (topic help — unreachable) |
| **inventory** (`inventory-*`) | — | `carrying` · `wearing` · `carrying_and_wearing`, with `holding_list` / `worn_list` lines; empty hands: one of `empty` · `inventory_empty` · `nothing_at_all` · `hands_empty` · `pockets_empty`, at random |
| **score** (`scoring-*`) | `no_scoring` | `score_with_rank` · `perfect_score` (at max) |

One honest gap: the `wearing` / `carrying_and_wearing` renders are
currently unreachable — worn items go missing from INVENTORY's listing
(they reappear only after an `undo` rebuilds the world). A platform fix
is pending; until then the transcript above shows carried items only.

### 10.2 Saving state: saving, restoring, restarting, quitting

These four are signals, not implementations: each emits a platform
event that the engine processes after the turn through
client-registered hooks — the client owns persistence and the
confirmation UI. Verbs that parse: `save`/`save game`,
`restore`/`load`/`load game`/`restore game`, `quit`/`q`/`exit game`,
`restart`. Named saves are dormant (no slot in the grammar). Quit asks
for confirmation through a client query — but with no client hook
registered it auto-confirms and stops; restart computes whether
confirmation is warranted (unsaved progress, more than a few moves) and
leaves honoring it to the hook.

The player sees (in a client that registers no hooks, like the bare
test harness — the signal side is all there is):

<!-- transcript: meta/long-watch.story -->
```transcript
> save
Save failed.

> restore
No saved games found.
```

"Save failed." is the engine reporting an unhandled
`platform-save-requested`; a real client's hook would have completed
it. Quit and restart print nothing of their own here for the same
reason.

| | Refusals | Platform event |
|---|---|---|
| **save** | `save_not_allowed` · `save_in_progress` · `invalid_save_name` | `platform-save-requested` |
| **restore** | `restore_not_allowed` · `no_saves` | `platform-restore-requested` |
| **restart** | — | `platform-restart-requested` |
| **quit** | — | `platform-quit-requested` |

### 10.3 Turns and undo: waiting, sleeping, again, undoing

**wait** (`wait`, `z`) is the canonical "let a turn pass": a full,
snapshot-taking, daemon-ticking turn in which nothing else happens —
N waits let N rounds of scheduled behavior (§12.2) play out. One
message, `time_passes` (the lang file's twelve wait variants are dead
inventory — flagged). Stories react to `waited`, or gate
things on turns passing.

**sleep** (`sleep`, `nap`, `doze`, `rest`, `slumber` — all five parse
since ADR-230 D2/D4). Flavor-only: one message (`slept`), no turns
skipped beyond its own, no health interaction — give it story meaning
with story logic if a story needs real sleep. `z` remains a wait.

**again** (`again`, `g`) re-runs the last successful non-meta command by
re-parsing its original text — so the repeat is honest: it can fail
where the original succeeded if the world changed. Meta commands (undo,
save, again itself) never enter history, so they can't be repeated;
`nothing_to_repeat` covers an empty history.

**undo** (`undo`) rolls back one full-world snapshot, taken before
every substantive turn (looks, examines, inventory, and the metas don't
burn a slot). Depth is an engine setting, default 10; consecutive undos
work to that depth. There is no per-story undo veto, and no
undo-after-death — once the defeat ending lands the game has stopped
(§9.1's veto window is the story's chance).

The player sees:

<!-- transcript: meta/long-watch.story -->
```transcript
> wait
Time passes...

> sleep
You sleep for a while.

> take the flare
Taken.

> again
You already have the signal flare.

> undo
Previous turn undone.

> undo
Previous turn undone.

> score
You have scored 0 out of 10, earning you the rank of a Novice.
```

AGAIN's repeat is honest — the re-parsed take refuses where the
original succeeded — and two UNDOs peel back first that failed repeat,
then the take itself, the score award reverting with it. For Chord
stories, everything the language tracks — states, occurrence counters,
`once` flags, sequence progress, awards — lives in world state, so undo
(and save/restore) cover it with no author effort (ADR-210 AC-6,
transcript-pinned).

| | Refusals | Success |
|---|---|---|
| **wait** (`waiting-*`) | — | `time_passes` (event `waited`) |
| **sleep** (`sleeping-*`) | — | `slept` |
| **again** (`again-*`) | `nothing_to_repeat` | renders whatever the repeated command renders |
| **undo** (`undoing-*`) | `nothing_to_undo` · `undo_failed` | `undo_success` |

## 11. Traits catalog

Every trait in the platform, in one lookup. Full entries live in the
chapter that owns each trait's verbs — this index says what each one is,
how a `.story` composes it (or that it can't, yet), and where the entry
is. The four structural traits no verb owns get their full entries in
§11.1.

| Trait | In Chord | One line | Entry |
|---|---|---|---|
| `container` | `a container` (+ `with max items/weight N`) | holds things inside | §2.9 |
| `supporter` | `a supporter` (+ `with capacity N`) | holds things on top | §2.9 |
| `pushable` | `pushable` | eligible for PUSH; pushType picks behavior | §2.9 |
| `pullable` | `pullable` | eligible for PULL; state + count mutate | §2.9 |
| `cuttable` | `cuttable` (+ `with the <entity>`) | eligible for CUT; outcome is the entity's own implementation | §2.9 |
| `diggable` | `diggable` (+ `with the <entity>`) | eligible for DIG; same contract as cuttable | §2.9 |
| `moveable-scenery` | — | dormant (nothing reads it) | §2.9 |
| `attached` | — | dormant (nothing reads it) | §2.9 |
| `room` | `a room` | a place; exits, darkness, first-visit text | §3.4 |
| `exit` | — | passage entity a room exit routes via | §3.4 |
| `enterable` | `enterable` | can be gotten into / onto | §3.4 |
| `climbable` | `climbable` | eligible for CLIMB | §3.4 |
| `vehicle` | — | enterable that moves with its passengers | §3.4 |
| `openable` | `openable` (+ `with the <entity>`) | open/closed state | §4.3 |
| `lockable` | `lockable` (+ `with the <key>`) | locked/unlocked + key contract | §4.3 |
| `door` | `a door` + an exit's `through the <door>` tail | an entity that *is* the connection between two rooms | §4.3 |
| `wearable` | `wearable` | can be worn; body part + layer rules | §5.2 |
| `clothing` | — | dormant — and not wearable by itself | §5.2 |
| `equipped` | — | equipment slots/stats; read by combat | §5.2 |
| `open-inventory` | — | NPC's carried items become reachable | §5.2 |
| `readable` | `readable` (+ `with text …`) | text, pages, read-gate | §6.4 |
| `scenery` | `scenery` | fixed in place, unlisted | §6.4 |
| `concealment` | `hiding-spot` (+ `with position <word>`) | a hiding spot for actors | §6.4 |
| `acoustic` | — | wall sound-cost tier (engine sound system) | §6.4 |
| `listener` | — | receives propagated sounds | §6.4 |
| `switchable` | `switchable` | on/off, power, sounds | §7.2 |
| `light-source` | `light-source` | sheds light when lit; fuel model | §7.2 |
| `button` | — | descriptive; upgrades a push to a click | §7.2 |
| `actor` | `a person` | a someone: pronouns, capacity, custom bags | §8.5 |
| `npc` | `guard`/`passive`/`wanderer`/`follower`/`patrol` (core; plugin auto-wires) | NPC bookkeeping for the NPC plugin | §8.5 |
| `character-model` | — | deep NPC internals (personality, beliefs) | §8.5 |
| `combatant` | `combatant` (+ stats config; needs `use combat`) | combat stats; presence routes ATTACK to combat | §8.5 |
| `weapon` | `weapon` (+ `with damage N …`; needs `use combat`) | damage, type, durability | §8.5 |
| `edible` | `edible` / `drinkable` (liquid) | food/drink data; servings, liquid flag | §8.5 |
| `breakable` | — | one-hit breakage (via ATTACK) | §8.5 |
| `destructible` | — | hit-pointed destruction (via ATTACK) | §8.5 |
| `deadly-room` | `deadly: <phrase>` | every non-safe verb kills | §9.3 |
| `health` | via `combatant with health N` (`use combat`) | the life-state model (attached lazily) | §9.3 |
| `identity` | implicit in every `create` (+ `proper`, `pronouns` on persons) | name, aliases, article, pronouns, description | §11.1 |
| `region` | `a region` (+ `containing …`) | groups rooms; crossing emits events | §11.1 |
| `scene` | — | begin/end narrative phases, engine-evaluated each turn | §11.1 |
| `story-info` | the story header | title/author/version for ABOUT | §11.1 |

### 11.1 Structural & authoring traits

**identity** — every entity's who-am-I, composed implicitly by every
`create` block: the name, `aka` aliases, and description land here, along
with the article/proper-name machinery the sentence assembler uses,
grammatical number, the narration's pronoun set, disambiguation
adjectives, and optional weight/volume/size. From Chord: name, aliases,
description, `plural`, `concealed`, and on persons `proper` and
`pronouns` (ADR-242); the rest is TypeScript.

The author writes:

<!-- fixture: traits/identity.story -->
```story
create the Gatehouse
  a room

  A stone gatehouse with an iron-barred window.

create Tobias
  aka groundskeeper
  a person, proper
  pronouns he
  in the Gatehouse

  A weathered man with a ring of keys.

create the zookeeper
  a person
  in the Gatehouse

  Someone in a canvas apron, name unknown.

create the iron gates
  aka gates
  plural
  scenery
  in the Gatehouse

  Twin gates of black iron, shut fast.

create the player
  starts in the Gatehouse
```

The player sees:

<!-- transcript: traits/identity.story -->
```transcript
> look
Gatehouse
A stone gatehouse with an iron-barred window.

You can see Tobias and a zookeeper here.

> take the gates
The iron gates are fixed in place.

> take tobias
You can't take Tobias.

> take the zookeeper
You can't take the zookeeper.
```

One word each way: `proper` (person-only) renders Tobias bare-named in
the room listing and in refusals while the unmarked zookeeper keeps an
article, and `plural` sets grammatical number so every message agrees —
the gates "are" fixed in place where §2.1's statue "is".

The rest of the trait in one-liners:

- `pronouns he` (or `she`, `it`, `they`, or a `define pronouns` named
  set — chord-language.md §5.9) names a person's narration pronoun set;
  absent means the by-number fallback ("it"/"they") — nothing is
  inferred from a name.
- `concealed` marks a hidden item that searching reveals and announces
  (§6.2).
- `points` awards score on the first take, deduped per entity (§2.1) —
  TypeScript-only today; Chord's `score … worth N` lines are the
  separate named-award system.
- The create-line article is never read for identity: `create the
  zookeeper` and `create a zookeeper` load identically.

**region** (`a region` — kind noun, since ADR-236) — groups rooms into
areas: a room carries a region id, regions nest by containing each
other, and going emits `region_exited` / `region_entered` per
crossed boundary (§3.1). Everything is authored region-side: `containing`
lists members (additive across lines), `after entering it` / `after
leaving it` react to boundary crossings (`leaving` exists only on region
blocks), and an `on every turn` clause on the region block is a region
daemon, firing only while the player is in a member room (the daemon
machinery is §12's).

The author writes:

<!-- fixture: traits/region.story -->
```story
create the Grounds
  a region
  containing the Orchard, the Apiary

  after entering it
    phrase under-the-boughs
  end after

  after leaving it
    phrase back-on-the-road
  end after

  on every turn
    phrase bees-drone
  end on

  phrase under-the-boughs:
    You pass under the boughs; the air turns sweet with windfall.

  phrase back-on-the-road:
    The orchard smell fades behind you.

  phrase bees-drone:
    Bees drone somewhere among the trees.
```

The player sees (starting outside the region, walking east through it
and back):

<!-- transcript: traits/region.story -->
```transcript
> east
Orchard
Apple trees in ragged rows.

Bees drone somewhere among the trees.

You pass under the boughs; the air turns sweet with windfall.

> east
Apiary
White hives stand in the grass.

Bees drone somewhere among the trees.

> west
Orchard
Apple trees in ragged rows.

Bees drone somewhere among the trees.

> west
Gatehouse
A stone gatehouse at the edge of the grounds.

The orchard smell fades behind you.
```

Boundary reactions fire only on crossings — the Orchard-to-Apiary move
inside the region says nothing extra — while the daemon speaks in every
member room and falls silent the turn you leave. One honest gap: the
trait's ambient-sound/smell fields are declared but nothing reads them
yet (dormant).

**scene** — narrative phases with a lifecycle: a scene waits, begins
when its registered begin-condition fires, counts its active turns, and
ends (or recurs) on its end-condition — evaluated every turn by an
always-on engine plugin, emitting `scene_began` /
`scene_ended` plus any registered reaction messages. The conditions are
code (closures registered on the world, re-register after restore); the
trait's state persists. TypeScript-only — no Chord surface.

**story-info** — the story's masthead on an invisible system entity:
title, author, version, description, plus build metadata (build date,
engine/client versions, ported-by, credits). ABOUT and VERSION read it
(§10.1); the info channels and save metadata consume it. A Chord story
never touches it directly — the header (`story "…" by "…"`, `version:`,
`blurb:`) flows through and the engine materializes the trait.

One neighbor in the traits directory is not a trait at all:
**obstructor-protocol** (ADR-173) is a query-helper module for walls — a
wall side may name an `obstructedBy` entity, and capability consumers
(today the sound system's acoustic dampening, ADR-172) ask at query time
whether that obstructor is still in the room, so pushing the bookcase
aside lifts the obstruction with no bookkeeping. TypeScript plumbing
only — no Chord surface, no verb.

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
what comes back — attacks, emotes, movement (with `npc-moved` events
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
default: the plugin emits the `npc-moved` events, and narrating them
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
