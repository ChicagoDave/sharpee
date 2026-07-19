# The Sharpee Standard Library — Author Reference

A writer-facing catalog of what Sharpee gives you for free: every standard
action a player can type, every trait you compose onto an entity, and the
runtime services (plugins and daemons) behind timed and NPC behavior. This is
the companion to the Chord language reference (`chord-language.md`): that
document teaches the language and its `define trait` / `define action` / hatch
escape hatches; this one catalogs everything already built in, so you know what
*not* to define before reaching for those hatches.

> **Status: CURRENT at Sharpee 3.2** (currency-swept 2026-07-19 against
> the post-ADR-242 surface; previously content-final 2026-07-16,
> truth-refreshed 2026-07-17 after ADR-230). The 2026-07-19 sweep folded
> the extension surface (ADR-215/235: `use combat`, NPC auto-wire, `use
> state-machines`), doors (ADR-234/237/238), regions and story-global
> daemons (ADR-236), topics (ADR-239), the R3 keyless key/tool forms,
> and person identity (ADR-242), with every entry's Chord availability
> stated per the parity audit (54/54 actions reachable). Examples are
> hand-written Chord syntax, compile-checked ad hoc during drafting.
> The platform notes that remain are still-honest gaps.

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

Each action entry tells you: the **verbs that actually parse** (grounded
in the parser's grammar, not the help lists — where a listed synonym does
not parse, the entry says so), the **trait** that makes an entity
eligible (or "anything"), the **checks** in the order the action makes
them and the refusal each produces, the **message keys** you can retarget,
and the **events** it emits for story reactions.

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

Standard actions never speak English; they emit message IDs
(`if.action.taking.fixed_in_place`) that the language layer renders. Per
entity, you replace a moment's text with `on`/`after` clauses carrying
your own phrases (§2 opening shows the pattern); story-wide, a `define
phrase` under the dotted ID itself (`define phrase
if.action.taking.fixed_in_place`) replaces the platform text everywhere
(ADR-230 D5; chord-language.md §5.2 teaches it), and a TypeScript story
can override the IDs through the language provider.

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

Each entry below lists the action's **message keys** — the IDs stdlib emits
instead of English (the `lang` layer supplies the words). They matter three
ways. In a `.story` file, you replace a moment's text *per entity* with an
`on`/`after` clause carrying your own phrase — a refusal key of yours
instead of the standard refusal, or a reaction that speaks after the action
commits (syntax: chord-language.md §3). Story-wide, a Chord `define phrase`
under the dotted ID itself replaces the platform text for every entity
(dotted phrase keys register whole since ADR-230 D5 — chord-language.md
§5.2), and a TypeScript story overrides the ID through the language
provider. And in transcripts and event payloads, the ID is how you
recognize which moment fired.

The per-entity pattern, which recurs all through this chapter:

```story
create the iron ring
  scenery
  in the Crypt

  A ring set into the floor slab.

  on taking it
    refuse ring-fused
  end on

  phrase ring-fused:
    The ring is fused to the slab; your fingers just slip off it.
```

### 2.1 taking and dropping

**take** (`if.action.taking`) — verbs `take`, `get`, `grab`, `acquire`,
`collect`, `pick up`, and `take up` (bare `pick` is deliberately absent —
it would outmatch `pick up`). The parser also accepts multi-object forms
inside the slot: `take all`, `take all but the lamp`, `take the key and
the bottle`.

Anything is takeable by default — portability is the rule, not a trait. What
blocks taking: the `scenery` trait (the classic "that's fixed in place"),
rooms themselves, things the player already carries, and the player's own
carrying capacity when the actor has container limits (item count or
weight). Taking something currently worn quietly takes it off first. An item
whose identity carries `points` awards score the first time it is taken
(that is how treasure scoring works).

Checks, in order: no object named → `no_target`; taking yourself →
`cant_take_self`; already carried → `already_have`; it is a room →
`cant_take_room`; it is scenery → `fixed_in_place` (or the entity's own
custom refusal); carrying limits → `container_full`, `too_heavy`, or the
generic `cannot_take`; `take all` with nothing available → `nothing_to_take`.

Success keys: `taken`, `taken_from` (when it came out of or off something),
and `taken_multi` (the compact form for `take all`). All keys prefix as
`if.action.taking.<key>`. Events: `if.event.taken` on success,
`if.event.take_blocked` when refused.

Interceptors: taking consults `on taking it` / `after taking it` clauses on
the item. Note that REMOVE-FROM phrasing cannot dodge a taking guard — see
§2.3.

**drop** (`if.action.dropping`) — verbs `drop`, `discard`, `put down`,
`throw away`, plus `drop all` and friends. The destination is wherever the
player is: the
room, or the container or supporter the player is inside or on.

Checks: not holding it → `not_held`; still wearing it → `still_worn` (worn
things must be taken off first); the enclosing container will not accept it
→ `container_full` or `cant_drop_here`; `drop all` with empty hands →
`nothing_to_drop`.

Success keys vary with where it lands and how it was said: `dropped` (a
room), `dropped_in` (a container), `dropped_on` (a supporter),
`dropped_quietly` (a room drop of something glass), `dropped_carelessly`
(the verb was `discard`), `dropped_multi`. Prefix `if.action.dropping.<key>`;
events `if.event.dropped` / `if.event.drop_blocked`.

### 2.2 putting and inserting

Two actions share the surface English of "put". `put X on/onto Y` (and
`hang X on Y`) is **putting** (`if.action.putting`); `put X in/into/inside Y`
and `insert X in Y` parse as **inserting** (`if.action.inserting`), which
delegates its work back into putting with the preposition forced to "in".
`place` works in both phrasings, and one more form lands in putting since
ADR-230 D4: `move X to Y`, with the destination's kind deciding in versus
on (the D4 ruling: `move` is a manipulation verb, never movement — see
also pushing, §2.6). An author rarely needs the distinction, with one
exception spelled out below.

The destination decides eligibility: `on` needs a supporter (`a supporter`),
`in` needs a container (`a container`). The item does not need to be in
hand — putting performs an implicit take first, and refuses with the taking
refusal if that fails (a fused-down ring cannot be put anywhere).

Checks, in plain order: no item → `no_target`; no destination →
`no_destination`; putting a thing in or on itself → `cant_put_in_itself` /
`cant_put_on_itself`; already there → `already_there`; wrong kind of
destination → `not_container` / `not_surface`; a closed openable container →
`container_closed`; out of room → `no_room` (containers) / `no_space`
(supporters).

Success renders `put_in` or `put_on` — and because inserting delegates its
report into putting, a successful INSERT also renders
`if.action.putting.put_in`, while inserting's *failures* render under
`if.action.inserting.<key>`. Override `if.action.putting.put_in` /
`put_on` for success text in both phrasings. Events: `if.event.put_in`,
`if.event.put_on`, blocked `if.event.put_blocked` / `if.event.insert_blocked`.

The exception that makes the two-action split visible: interceptor clauses.
An INSERT command consults `on inserting it` clauses first, then — through
the delegation — `on putting it` clauses as well, on both the item and the
container. Register a given entity's behavior under **one** of the two
gerunds, not both, or it will run twice. If you only care that something
went in, `on putting it` (or `after putting it`) covers both phrasings; the
trophy case works this way, and in `put all in the case` its container-side
clause runs once per deposited item.

### 2.3 removing (taking from)

**remove X from Y** (`if.action.removing`) — take an item out of a container
or off a supporter, named source and all. Core grammar since ADR-230:
`remove X from Y`, `extract X from Y`, and `take X from Y` — the last
optionally `with/using Z`, a tool form whose named tool becomes a consulted
command entity (the old orphan `taking_with` id was retired onto removing
in the same pass). Bare `remove X` still means undressing (§5).

Checks: no item → `no_target`; no source → `no_source`; already holding it →
`already_have`; not actually in/on the source → `not_in_container` /
`not_on_surface`; the source is a closed openable container →
`container_closed`; carrying capacity → `cannot_take`; `remove all from X`
with nothing eligible → `nothing_to_remove`.

Success keys: `removed_from` (a container) and `removed_from_surface` (a
supporter), prefixed `if.action.removing.<key>`. The success **event** is
`if.event.taken` — removing is semantically a take, with the source recorded
in the payload.

Interceptors: the item slot consults `on removing it` and then `on taking
it`, in that order — a taking guard (the troll's axe) cannot be bypassed by
naming the source. The source consults `on removing it` only, and so does
an explicitly named tool, after item and source. As with putting/inserting,
register per entity under one gerund.

### 2.4 giving and showing

**give** (`if.action.giving`) — `give X to Y`, `give Y X`, `offer X to Y`.
The recipient must be a person (`a person` — the actor trait); the action
enforces that in validation, so `give the sword to the door` refuses with
`not_actor` ("You can only give things to people."). Giving does an
implicit take if the item is not in hand.

The default NPC accepts anything: the item moves into their inventory and
the player sees `given`. Three data-driven wrinkles, all read from the
recipient's actor data: a capacity (item count → `inventory_full`, weight →
`too_heavy` — both phrased as the NPC declining), and a `preferences` object
whose `refuses` list blocks matching items with `not_interested`, while
`likes`/`dislikes` color acceptance as `gratefully_accepts` /
`reluctantly_accepts`.

Other checks: no item → `no_item`; no recipient → `no_recipient`; not a
person → `not_actor`; giving to yourself → `self`.

Keys under `if.action.giving.`: the errors above plus `not_holding`,
`recipient_not_visible`, `recipient_not_reachable`, and success `given`,
`accepts`, `gratefully_accepts`, `reluctantly_accepts` (`refuses` and
`accepts` exist for story use — stdlib itself never picks them). Events:
`if.event.given` / `if.event.give_blocked`.

For richer behavior than the preference lists — a guard who takes the bribe
and opens the gate — put an `on giving it` / `after giving it` clause on the
item or the recipient, or (the Sharpee Way) register a capability behavior
for `if.action.giving` on the recipient, which takes over the whole
transaction.

**show** (`if.action.showing`) — `show X to Y`, `show Y X`. Purely social:
nothing moves, nothing changes hands. The viewer must be a person in the
same room (`viewer_too_far` otherwise). The item is implicitly taken if
needed.

The default reaction is `shown` — or `wearing_shown` when the item is
currently worn. A viewer with a `reactions` object in its actor data reacts
by item-name match: `viewer_recognizes`, `viewer_impressed`,
`viewer_unimpressed`, `viewer_examines`, falling back to `viewer_nods`.
(The modern replacement for `reactions` is an interceptor clause on the
viewer — `on showing it` — which can do anything.) Errors: `no_item`,
`no_viewer`, `not_actor`, `self`, `not_carrying`, `viewer_not_visible`,
`viewer_too_far`. Events: `if.event.shown` / `if.event.show_blocked`.

### 2.5 throwing

**throw** (`if.action.throwing`) — `throw X at Y` and `throw X to Y`, with
`toss` and `hurl` in both forms. (The
action also implements bare and directional throws — `throw the rock`,
`throw the rock north` — but no core grammar reaches them today; a story
must add those patterns itself.) The item is implicitly taken if needed;
the target must be in the same room; anything heavier than 10 kg refuses
with `too_heavy`.

What happens next is probabilistic — document-worthy behavior, not a bug,
and per project policy the dice are never disabled. The platform infers
fragility from the item's name and description (glass, crystal, bottle,
vase, china, porcelain, "delicate", "fragile"). Throwing **at a person**:
about a 70% hit — a nimble target may duck (`target_ducks`), a catcher may
catch (`target_catches`, and then they hold it), a hit lands `hits_target`
and annoys them (`target_angry`); a fragile item that hits usually breaks
(`breaks_against`). Throwing **at anything else**: about a 90% hit; the item
lands on a supporter (`lands_on`), in an open container (`lands_in`),
bounces off a closed one (`bounces_off`), and fragile items usually break.
A broken item is removed from play entirely, with an
`if.event.item_destroyed` event (`cause: 'thrown'`).

Keys under `if.action.throwing.` — errors: `no_item`, `not_holding`,
`target_not_visible`, `target_not_here`, `no_exit`, `too_heavy`, `self`;
outcomes: `hits_target`, `misses_target`, `target_ducks`, `target_catches`,
`target_angry`, `lands_on`, `lands_in`, `bounces_off`, `breaks_against`,
`breaks_on_impact`, `fragile_breaks`, `thrown_down`, `thrown_gently`,
`sails_through`. Events: `if.event.thrown` (with `throwType`, `hit`,
`willBreak`, `finalLocation` in the payload — enough for a story reaction
to know exactly what happened) and `if.event.throw_blocked`.

Interceptors: both the item and the target are consulted (`on throwing it`
on either) — a glacier can react to being hit in the same command as an
explosive reacts to being thrown. A capability behavior registered for
`if.action.throwing` on the target takes over the whole throw.

### 2.6 pushing, pulling, touching

**push** (`if.action.pushing`) — `push`, `press`, `shove`, `move`, and the
directional form `move X <direction>` (ADR-230 D4 ruling: `move` is
manipulation, never movement — the direction rides the same channel as
`push X north`). Needs the
`pushable` trait; pushing anything else gets `fixed_in_place` (scenery) or
`pushing_does_nothing`. What pushing *does* depends on the trait's
`pushType`:

- `button` — the one genuinely stateful push: if the entity is also
  `switchable`, pushing toggles it (`button_clicks` when it is a button,
  `switch_toggled` otherwise); a non-switchable button just clicks
  (`button_pushed`).
- `heavy` — needs a direction to budge (`pushed_with_effort`), refuses
  without one (`wont_budge`).
- `moveable` — slides when pushed with a direction (`pushed_direction`, or
  `reveals_passage` when the trait says it hides something), gets nudged
  without one (`pushed_nudged`).

One honest caveat: outside the button toggle, stdlib **narrates** movement
but does not relocate anything — "pushed north" is a message and an
`if.event.pushed` event carrying the direction, and the story reacts to
that event (or an `after pushing it` clause) to actually change the world.
That is deliberate: which wall opens is puzzle logic, not platform logic.

**pull** (`if.action.pulling`) — `pull`, `drag`, `yank`, `tug`. Needs
`pullable`. A successful pull sets the trait's state to `pulled` (a second
PULL refuses with `already_pulled`) and bumps its `pullCount`; a worn item
refuses with `worn`. Everything a pull *means* — the lever opens the
sluice — is story logic reacting to `if.event.pulled` or written as an
`on pulling it` / `after pulling it` clause.

**touch** (`if.action.touching`) — `touch`, `feel`, `rub`, `pat`, `stroke`,
`poke`, `prod`. No trait needed, no state changed. The reply is inferred
from what the thing is: a lit light source `feels_hot`, a running device
`feels_warm` (or `device_vibrating`), wearables `feels_soft`, doors
`feels_smooth`, containers and supporters `feels_hard` (a container with
drink in it sloshes — `liquid_container`), drinkables `feels_wet`, scenery
`immovable_object`; otherwise the verb itself answers (`poked`, `patted`,
`stroked`, `touched_gently`, `touched`). All under `if.action.touching.`;
event `if.event.touched`. Touching is a favorite for `on touching it`
clauses — a probe with no side effects the story can hang flavor on.

### 2.7 lowering and raising (per-entity verbs)

`lower :target` and `raise`/`lift :target` parse out of the box, but these
verbs have **no standard behavior at all** — lowering the basket, the
drawbridge, and your voice are three different mutations, so the platform
refuses to invent one (ADR-090). Unhandled, the player sees
`if.action.lowering.cant_lower_that` — "You can't lower that." — and
`cant_raise_that` for raising.

Giving an entity real lower/raise behavior from a `.story` file is the
dispatch-action pattern (the same one behind the zoo's `pet` and `feed`):
a `define action` owns the verb, and a trait's `on <verb>ing it` clause
carries each entity's behavior. The friendly-zoo source is the canonical
worked example; adapted to lowering:

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
```

Compose `windlass-basket` onto the basket and `lower basket` does the real
thing; `lower` on anything else falls to the action's `otherwise refuse`.
The fall-through is well-defined (ADR-229): a clause gated out by `while`
or a consumed `, once` simply sits out, and the command falls through to
the action body, the next trait, and finally the `otherwise refuse` miss.
Two boundaries to know: an `on lowering it` clause directly on an *entity*
is a load error with a pointed message (these verbs never consult
entity-level interceptors — the trait/action pattern above is the way),
and from TypeScript the equivalent is a capability behavior registered for
`if.action.lowering` (the Sharpee Way, how Dungeo's basket works). TURN
left this family on its own terms: `turn`/`rotate`/`twist X` still parse
(just below the switching phrasal forms, so `turn lamp on` still switches,
§7.1) and the unhandled refusal is still `if.action.turning.cant_turn_that`,
but turning now wears cutting's dual surface without the trait gate (§2.8)
— an `on turning it` clause directly on the entity is consulted (turning is
one of the 38 wired actions), or a TypeScript capability behavior for
`if.action.turning` takes the whole turn; no eligibility trait, no
define-action scaffolding needed. WAVE and WIND — the other classic
per-entity verbs — still have no binding at all: no grammar, no action. A
story wanting them defines the whole verb with `define action`, exactly as
above.

### 2.8 cutting and digging

Two tool verbs with one design (ADR-230 D3c): the platform action gates
eligibility and validates the tool; the *outcome* belongs to the entity.
**cut** (`if.action.cutting`) parses bare — `cut X` (also `slice`,
`chop`) — and tooled as `cut X with/using Y` (the tooled form outranks
when a tool is named); **dig** (`if.action.digging`) likewise as `dig X`
and `dig X with/using Y`. Eligibility is a trait —
`cuttable` / `diggable` — and the tool contract mirrors the lockable key
contract exactly: `with tool <entity>` in Chord (`toolId`/`toolIds` in
TypeScript) declares what works, forward references legal. A trait with
no tool configured accepts any attempt. Checks, in order: no such trait →
`not_cuttable` / `not_diggable`; a declared requirement with no tool
named → `no_tool`; a named tool not in hand → `tool_not_held`; the wrong
one → `wrong_tool`.

The stdlib action then performs **no mutation of its own**. What a cut or
dig does — rope into pieces, sand yielding a scarab — is the entity's
registered implementation, and it is *required*: exactly one per entity,
either an `on cutting it` / `on digging it` clause (Chord — the entity's
own or a composed trait's) or a capability behavior for the action id
(TypeScript, ADR-090). Zero or two is a load error, never a silent
runtime no-op ("… is cuttable but registers no cutting implementation").
Success renders the entity's own text over the generic `cut` / `dug`
stub; events `if.event.cut` / `if.event.dug`, blocked forms
`if.event.cut_blocked` / `dug_blocked`. Interceptors consult the target
first, then an explicitly named tool — a cursed knife can veto the cut.

### 2.9 Manipulation traits

**container** (`a container` — a kind noun, so it takes the article).
Holds things inside. Composes on one line with `openable`, `lockable`, and
`scenery` (`a container, openable, scenery`). Settings: `with max items N`
and `with max weight N` limit capacity. Data fields beyond Chord's reach
today (TypeScript territory): `isTransparent` (contents visible while
closed), `allowedTypes`/`excludedTypes`, and the liquid fields
(`containsLiquid`, `liquidType`, `liquidAmount` — see drinking, §8.3).
Capacity counts what is directly inside; a container "bears the weight" of
nested contents rather than passing it up. Read by putting, inserting,
removing, searching, opening/closing, dropping, throwing, and looking.

**supporter** (`a supporter`). Holds things on top. Setting: `with
capacity N` — the number of items it holds (the Cloak of Darkness brass
hook is `a supporter with capacity 1`). Unlike containers, a supporter's
weight math includes nested contents recursively. Read by putting,
removing, climbing, dropping, and looking.

**pushable** (`pushable`). Makes an entity eligible for pushing, and its
`pushType` — `button` (default), `heavy`, `moveable` — selects the behavior
described in §2.6. The trait carries more fields for story handlers to
read (`revealsPassage`, `pushSound`, `activates`, `maxPushes`,
`pushDirection`, `effects`); apart from `pushType`, `revealsPassage`, and
`pushSound`, stdlib treats them as data for *your* event handlers, not
behavior it enforces.

**pullable** (`pullable`). Makes an entity eligible for pulling. Stdlib
mutates two fields — `state` (→ `'pulled'`, which is what gates
`already_pulled`) and `pullCount` — and carries the rest (`pullType`,
`activates`, `linkedTo`, `detachesOnPull`, `maxPulls`, `effects`) as data
for story handlers reacting to `if.event.pulled`.

**cuttable** (`cuttable`, optionally `with tool <entity>` — adjective).
Makes an entity eligible for cutting (§2.8) and carries the tool contract
mirroring lockable's keys: `toolId` (one tool — what Chord's `with tool`
sets), `toolIds` (several, TypeScript), with `CuttableBehavior`'s
`requiresTool`/`canCutWith` predicates. Composing it obliges the entity to
register exactly one cut implementation — the load check enforces it.

**diggable** (`diggable`, optionally `with tool <entity>` — adjective).
The same shape for digging: `toolId`/`toolIds`,
`DiggableBehavior.requiresTool`/`canDigWith`, and the same
one-implementation rule (§2.8).

**moveable-scenery** and **attached** — two traits in the catalog that are
**dormant today**: no standard action reads either, they have no behavior
classes, and neither is composable from Chord. `moveable-scenery` sketches
a heavy-thing vocabulary (weight class, blocked exits, reveals-when-moved);
`attached` sketches attachment (glued/nailed/tied, detachable, detach
force). They are listed here so you know they are *not* the way to build a
boulder puzzle right now — use `pushable`/`pullable` plus story logic, and
watch the ADRs for when these wake up.

## 3. Movement

Getting an actor from place to place: rooms and their exits, things you can
get inside or on top of, and things you can climb.

### 3.1 going

**go** (`if.action.going`) — `go north`, `walk`/`run`/`head`/`travel
north` (the synonym forms landed with ADR-230 D4, which also fixed a
long-broken `go <direction>` rule — `go north` itself parses reliably
now), or just the direction. Twelve
direction words parse, ten of them compass-and-vertical (`north`/`n`,
`south`/`s`, `east`/`e`, `west`/`w`, `northeast`/`ne`, `northwest`/`nw`,
`southeast`/`se`, `southwest`/`sw`, `up`/`u`, `down`/`d`) plus `in`/`inside`
and `out`/`outside`.

Exits are room data — in a `.story` file they are the direction lines of a
room's `create` block, including blocked and conditionally blocked exits
(chord-language.md §2.5 owns that syntax) and deadly exits (§9.2 here).
What going checks, in order: you must actually be in a room (see the
vehicle note below) → `not_in_room`; a blocked exit refuses with
`movement_blocked`, speaking the story's own blocked phrase — and a
direction can be blocked without leading anywhere, which is how "the hedge
is too thick" works; no exit that way → `no_exit_that_way` (or `no_exits`
in a room with none at all); a door in the way that is locked →
`door_locked`, closed → `door_closed`; a destination that fails to resolve
→ `destination_not_found`.

Darkness does not stop movement. Walking into a dark room succeeds — what
you lose is the arrival description, replaced by `too_dark`. Whether a room
is dark comes from its light requirement (`dark`, or the live `dark while
<condition>` form) weighed against light sources present; looking has the
same rule (§6.1). Anything worse than not-seeing — a grue — is death
machinery (§9), not the going action.

Vehicles change whose feet move: in an enterable vehicle that blocks
walking (the default), GO refuses with `not_in_room` ("you're in the
basket, not the room"); in one configured to move with its passenger, GO
moves the **vehicle**, carrying everyone aboard. See the vehicle trait in
§3.4 — TypeScript-only today.

Message keys under `if.action.going.`: `no_direction`, `not_in_room`,
`no_exits`, `no_exit_that_way`, `movement_blocked`, `door_closed`,
`door_locked`, `destination_not_found`, plus the arrival keys `moved`,
`moved_to`, `first_visit`, `too_dark`. Success emits a small parade of
events — `if.event.actor_exited`, `if.event.actor_moved`,
`if.event.actor_entered`, region crossings (`if.event.region_exited` /
`region_entered`), then the new room's description — which is what `after
going` clauses and daemons key off. Regions can also react to those
crossings themselves — `after entering it` / `after leaving it` on the
region's own block (§3.4).

Interceptors: going consults three parties in order — the room being left
(`on going it`), the room being entered (its clauses bind as
`entering_room` conditions — this is how a room refuses entry rather than
refusing exit), and the door being passed through. First refusal wins.

### 3.2 entering and exiting

**enter** (`if.action.entering`) — `enter X`, `get in/into X`, `climb
in/into X`, `go in/into X`, `board X`, `get on X`. One gate: the target
needs the `enterable` trait — anything else refuses with
`not_enterable` (checked in the action: parse by syntax, refuse by
world, since ADR-231). A closed openable refuses with
`container_closed`; already inside → `already_inside`. The trait's one
setting, its preposition, decides whether you are *in* the bathtub or *on*
the park bench (`entered` vs `entered_on`). There is no occupancy limit
today (`too_full` is reserved but never fires). Events: `if.event.entered`.

**exit** (`if.action.exiting`) — bare `exit`, `leave`, `get out`, `go
out`, `climb out`, `disembark`, `alight` (a named target parses too —
`exit the chair` — and the action honors it: naming something you aren't
inside refuses `not_in_that`, since ADR-231). It undoes an ENTER: out of the
container, off the supporter. Standing in a plain room refuses with
`already_outside` — leaving rooms is GO's job. A closed openable container
refuses with `container_closed` (you can shut yourself in). Keys:
`exited`, `exited_from`, `nowhere_to_go`, `already_outside`,
`not_in_that`, `container_closed`; event `if.event.exited`.

### 3.3 climbing

**climb** (`if.action.climbing`) — `climb X`, `climb up/down X`, `scale`,
`ascend`, `descend X`, all gated on the `climbable` trait (`climb into the
basket` is entering; `climb out` is exiting). Climbing something puts you
*on* it — the same place putting yourself on an enterable supporter gets
you; an unclimbable target refuses with `not_climbable`, being already up
there with `already_there`.

The action also implements directional climbing — `climb up` meaning "take
the up exit" — but no core grammar reaches it today (bare `up`/`down`
parse as going, which is usually what you want); a story adding `climb up`
as grammar gets room-exit climbing for free, refusing off-vertical
directions with `cant_go_that_way`.

Two honest footnotes: the trait carries `destination` and `direction`
fields the standard action does not consume yet (climbing an object never
teleports you to a destination room — put an `after climbing it` clause on
the cliff if you want that), and `blockedMessage`/`successMessage` are
likewise data for story use. Keys: `no_target`, `not_climbable`,
`cant_go_that_way`, `already_there`, `climbed_up`, `climbed_down`,
`climbed_onto` (`too_high`/`too_dangerous` reserved). Events:
`if.event.climbed`, plus `if.event.moved` (directional) or
`if.event.entered` (object).

### 3.4 Movement traits

**room** (`a room` — kind noun). The place actors stand. Everything a
room does in a `.story` file happens in its `create` block: direction
lines and blocked exits (chord-language.md §2.5), `dark` / `dark while
<condition>` (§2.3 there), a `first time` arrival description (§2.9
there), `deadly:` (§9.2 here), states, scores, and `on`/`after` clauses —
including `after entering it`, the room-arrival reaction the Cloak of
Darkness bar uses. Room exits may also route through a door — `down to
the Cellar through the cellar door` — which is where
`door_closed`/`door_locked` in §3.1 come from; §4.3 has the door story.

**enterable** (`enterable` — adjective). Marks a thing the player can get
inside or on top of. Composes with defaults (preposition `in`); the `on`
preposition — benches, roofs — is a TypeScript setting today. First
documented here: no story in the repo uses it yet.

**climbable** (`climbable` — adjective). Marks a thing the CLIMB family
accepts. Defaults only from Chord (`canClimb: true`); the trait's
`destination`/`direction`/message fields are story-handler data (§3.3).

**exit** (trait). A passage *entity* — the "xyzzy" magic word, a tunnel
that is a thing in its own right. A room exit can route `via` such an
entity (or via a door), and pathfinding resolves it; going checks a via
entity only for open/locked state. No standard action reads the trait's
richer fields (aliases, visibility, bidirectionality) today, and it has
no Chord surface — treat it as Sharpee-Way plumbing.

**vehicle** (trait — TypeScript-only, no Chord surface). Rides on top of
`enterable`: the trait's `blocksWalkingMovement` (default true) is what
makes GO say "you're in something" instead of walking; set it false and GO
moves the vehicle itself along the room's exits, passengers and all
(`movesWithContents`). `positionRooms`/`currentPosition` track multi-stop
vehicles (the Dungeo basket's counterweight shape); `isOperational` and
`requiresExitBeforeLeaving` are read by vehicle helpers for story use.

**region** (`a region` — kind noun, since ADR-236). A named room group,
authored region-side: `containing the Drive, the Hall` lists members
(additive — regions nest by containing each other), `after entering it` /
`after leaving it` react to boundary crossings (`leaving` exists only
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

**open** (`if.action.opening`) and **close** (`if.action.closing`) — the
verbs: `open`, `unwrap`, `uncover`, and `open up` all open; `close`,
`shut`, and `cover` all close (the synonym forms landed with ADR-230 D4).
Every form checks the `openable` trait in validation, so `open the
boulder` refuses with `not_openable` ("The boulder can't be opened.").

`open X with Y` maps to opening too (ADR-230 D3b — no separate action),
with the named tool as a consulted command entity. An openable can
declare a required tool exactly as a lockable declares a key —
`toolId` on the trait; in Chord, `openable with the crowbar`, the same
keyless `with` shape as a lockable's key (the several-tools list
`toolIds` is TypeScript today) — refusing `no_tool`/`tool_not_held`/
`wrong_tool`; an openable with no tool requirement ignores an offered
tool exactly as a keyless lockable ignores keyless LOCK.

Opening refuses when there is nothing openable named (`no_target`,
`not_openable`), when it is already open (`already_open`), and when the
thing is locked (`locked`) — lock state gates opening, and unlocking is
its own step. Success says `opened`, or `its_empty` when a container opens
onto nothing. A non-empty container's contents are then announced by a
separate, replaceable piece: the `stdlib.chain.opened-revealed` chain
handler reacts to the `if.event.opened` event and emits `if.event.revealed`
("Inside the small mailbox you see a leaflet."). A story that wants a
different reveal — or none — replaces that chain by its key rather than
touching the action.

Closing refuses `not_closable`, `already_closed`, and `prevents_closing` —
the last both for one-way openables (`canClose: false`) and for an
obstacle named in the trait's `closeRequirements`. Lock state is not
checked; closing never locks (the trait's `autoLock` field exists but is
inert today — flagged). Success: `closed`, event `if.event.closed` with a
rich payload (door/container flags, contents count) for story reactions.

Both actions consult the target's `on opening it` / `on closing it`
clauses — the humming hive box in chord-language.md §3.1 is exactly this
seam — and opening consults an explicitly named tool after the target
(target → tool, the same ordering discipline as lock-and-key).

### 4.2 locking and unlocking

**lock** (`if.action.locking`) and **unlock** (`if.action.unlocking`)
operate on the `lockable` trait. Every form parses since ADR-230 D2:
`lock X`, `lock X with/using Y`, keyless `unlock X`, `unlock X with/using
Y`, plus the `secure`/`unsecure` aliases (D4). The keyless forms are safe
by construction — a keyed lock still refuses `no_key` when no key is
named. A lock either requires a key — it names one (`with the <key>` in
Chord — `lockable with the iron key`; `keyId`/`keyIds` in TypeScript) —
or it is keyless and turns freely. The key rules, shared by both actions: a
keyed lock with no key named asks `no_key` ("What do you want to unlock it
with?"); a named key you are not holding refuses `key_not_held`; the wrong
key refuses `wrong_key`. Locking additionally requires the thing be closed
first (`not_closed`), and both refuse the redundant case
(`already_locked` / `already_unlocked`). One quirk worth knowing: on a
*keyless* lock, a named object is neither required nor checked — `lock the
box with the herring` succeeds and even says `locked_with`.

Success keys: `locked` / `locked_with`, `unlocked` / `unlocked_with`;
events `if.event.locked` / `if.event.unlocked` (key, sound, and
container/door flags in the payload), blocked forms
`if.event.lock_blocked` / `unlock_blocked`.

Interceptors (ADR-229): both actions consult the **target first, then the
key** — so a cursed key can veto its own use (`on unlocking it` on the
key), and each side's clause sees the other's identity in its context.
Only an *explicitly named* key is consulted; a key the platform infers is
not a command entity. In Chord, composition is one line — the zoo's
`scenery, openable, lockable with the staff keycard` is the shipped
example — and the key name resolves to its entity wherever in the story
that entity is declared (forward references are legal; the
container-kind key-drop bug the first draft flagged here is fixed).

### 4.3 Openable, lockable, and door

**openable** (`openable` — adjective). Two states, open and closed, owned
by the platform (`startsOpen` defaults to closed). Beyond the state:
`canClose: false` makes a one-way openable, `closeRequirements` names an
obstacle, `openSound`/`closeSound` ride along in events, and
`open/closedDescription` swap description text. From Chord the adjective
composes closed; `starts open` on the composition line seeds it open
(ADR-231; chord-language.md §2.11), and a required tool composes too
(`openable with the crowbar`, §4.1). The remaining settings — `canClose`,
`closeRequirements`, sounds, description swaps — are TypeScript territory
today.

**lockable** (`lockable`, optionally `with the <key>` — adjective).
Locked/unlocked state (starts unlocked everywhere except on a door,
where a lockable door starts locked until the author says `starts
unlocked` — ADR-234's one kind-scoped default; Chord also seeds `starts
locked` on any composition line, ADR-231) plus the key contract: `keyId`
(one key), `keyIds` (several, TypeScript). A lock without keys is a latch anyone can turn. `lockSound` /
`unlockSound` decorate the events. Two declared fields are inert today —
`autoLock` (relock-on-close is implemented but never invoked) and
`acceptsMasterKey` (never read) — don't build a puzzle on them; flagged.

**door** (`a door` — kind noun, since ADR-234). A door is an entity that
*is* the connection — but in a `.story` file the connection is written on
the room's exit line, not the door's block: `down to the Cellar through
the cellar door`. The reverse exit is inferred (opposite direction, no
far-room line needed; a mirrored line is legal but must agree exactly).
The door block itself is pure declaration — `a door, lockable with the
tarnished key`, a description, clauses — and `a door` composes scenery
and openable automatically, starting closed (`starts open` overrides)
and, when lockable, locked (`starts unlocked` overrides — the platform's
one kind-scoped default). `through` never creates a door, and the
compiler refuses what it can't answer: a declared door no exit line
connects, a placement line on a door block (its location IS its room
pair), `through` naming a non-door, conflicting room pairs — each with
its own diagnostic. The loader wires everything through the one platform
path (`connectRooms` with a door id, ADR-237); going then refuses
`door_closed`/`door_locked` (§3.1) with no story code at all, and the
door answers from both of its rooms — ADR-238's two-sided presence,
without leaking the far room. Under the trait: `room1`, `room2`,
`bidirectional` — one-way doors (`bidirectional: false`, traversing
room1 → room2 only) are TypeScript-only, and the `, one-way` exit-line
modifier is reserved but a parse error today.

## 5. Wearing

Putting clothes on and taking them off. One trait — `wearable` — powers the
whole family, and this family's grammar is complete: every verb the help
lists actually parses.

### 5.1 wearing and taking_off

**wear** (`if.action.wearing`) — `wear X`, `don X`, `equip X`, `put on X`
(the phrasal form outranks generic `put`). Needs the `wearable` trait
(`not_wearable` otherwise). You don't have to be holding it — wearing
performs an implicit take first, refusing with the take's own refusal if
that fails. Then the conflict rules, both keyed on the trait's body part:
something already worn in the same place refuses (in practice as
`hands_full` — see the layer note below), and you cannot put a layer on
*under* something already worn over it. Already wearing it →
`already_wearing`.

Success sets the worn state and says `worn` ("You put on the velvet
cloak."); event `if.event.worn` with `bodyPart` and `layer` in the payload.
Keys under `if.action.wearing.`: `no_target`, `not_wearable`, `not_held`,
`already_wearing`, `cant_wear_that`, `hands_full`, `worn`.

**take off** (`if.action.taking_off`) — `take off X`, `take X off`,
`remove X`, `doff X`, `unequip X`. (Yes — bare `remove X` means undressing,
which is why take-from-container needed its own action, §2.3.) Refuses when
the thing is not worn by you (`not_wearing`), when a higher layer is worn
over it (`prevents_removal` — "You'll need to take off the tabard first."),
and when the garment is cursed (`cant_remove`). Both cursed-ness and the
folded conflict checks are validate-phase since ADR-229 — a refused removal
never half-happens. Success clears the worn state, `removed`, event
`if.event.removed`; the item stays in inventory.

Both actions consult the garment's own clauses (`on wearing it` /
`on taking_off it`) — a cloak that reacts to being donned is one clause on
the cloak. The Cloak of Darkness player starts dressed the Chord way:

```story
create the player
  starts in the Foyer of the Opera House
  wears the velvet cloak

create the velvet cloak
  aka cloak
  wearable
```

A `wears` line requires the item be `wearable` (load error otherwise), and
`worn`/`unworn` work as state predicates in conditions — `while the cloak
is worn` is live story logic.

### 5.2 Wearing traits

**wearable** (`wearable` — adjective). The one live trait here. Fields
stdlib actually reads: the worn state (`worn`, `wornBy`), `bodyPart`
(default `torso`) and `layer` (default 1) for the conflict rules, plus the
undeclared `cursed` property the removal check probes. A quirk to know
when building layered outfits in TypeScript: because `layer` defaults to 1,
the "same body part, no layers" conflict branch is effectively unreachable
and conflicts report as `hands_full` — set explicit layers and the layering
rules do what you expect. Several declared fields are dormant today
(`slot`, `blocksSlots`, `wearableOver`, `canRemove`, `weight`, `bulk`, the
message overrides) — the behavior has TODOs for them; don't build on them
yet.

**clothing** (trait — dormant, and a gotcha). A separate trait type that
duplicates the wearable fields and adds material/style/condition. **No
action reads it**, and because it is a *different* trait type, an item
composed with only `clothing` fails wearing's `wearable` check — it cannot
be put on. Until it wakes up, use `wearable` and keep fabric flavor in
descriptions.

**equipped** (trait — combat-adjacent). Equipment slots and stat modifiers
(weapon/armor/shield/…, attack/defense). The wearing actions ignore it —
`equip` the verb is just a synonym for wear — and its one live consumer is
combat's weapon selection (§8.2). TypeScript-only.

**open-inventory** (trait — a scope marker, no fields). Composed onto an
NPC, it makes what they carry *reachable*, not just visible — the
difference between admiring the guard's key ring and being able to take it
(§2.1) or use it in a lock (§4.2). TypeScript-only today.

## 6. Senses & examination

How the player perceives the world: the room at a glance, a thing up
close, what is hidden inside, and what things say when read.

### 6.1 looking and examining

**look** (`if.action.looking`) — bare `look`, `l`, `look around`. Rerenders
the room: name and description (a first visit prefers the room's
first-time description and marks the room visited), the "You can see …"
list (`contents_list` — scenery excluded, though an open scenery
container's contents still show), and the contents of open containers and
supporters in view. In a dark room all of that collapses to `room_dark`.
Two footnotes: brief mode is not implemented (verbose is hardcoded on, so
`room_description_brief` is unreachable), and looking is the one sensory
action that consults no interceptor clauses — there is no entity to hang
them on; use the room's `after entering it` or an `on every turn` daemon
instead.

**examine** (`if.action.examining`) — `examine X`, `x X`, `inspect X`,
`check`/`view`/`observe X` (ADR-230 D4), `look at X`, and `look
[carefully] at X` — the adverb adds nothing; the separate
`examining_carefully` id it used to parse to is gone (ADR-230 D3a).
Needs only visibility, not reach. The reply is the
entity's description plus one trait-aware tail, first match wins:
containers report open/closed (an open one lists contents), then
supporters, switchables (on/off), readables with text, wearables (worn or
not), doors (locked state) — otherwise plain `examined`, or
`nothing_special` for a descriptionless thing. A live detail sentence can
ride on the end: Chord's gated `phrase detail while <condition>:` override
(chord-language.md §2.10) is exactly that seam, and switchable/lit things
have built-in detail slots. Keys under `if.action.examining.`:
`examined`, `examined_self`, `examined_container`, `examined_supporter`,
`examined_switchable`, `examined_readable`, `examined_wearable`,
`examined_door`, `nothing_special`, `no_target`. Event:
`if.event.examined`; the target's `on examining it` clauses are consulted
(the robin in chord-language.md §2.10 rides the sibling watching seam the
zoo defines).

### 6.2 searching and reading

**search** (`if.action.searching`) — `search X`, `look in/inside X`, `look
through X`, `rummage in/through X`, or bare `search` for the room
(`find`/`locate` were removed from the help vocabulary in ADR-230 — any
alias would be too story-specific, and searching is the wrong semantics).
A closed openable container
refuses `container_closed`; otherwise searching reports contents
(`container_contents`, `supporter_contents`, `empty_container`,
`searched_location`, `searched_object`, `nothing_special`) — and it is
the action that **reveals hidden items**: a thing whose identity is marked
`concealed` (in Chord, the `concealed` adjective on the composition
line) does not appear in look or contents lists until a search
finds it, permanently reveals it, and announces `found_concealed` ("Hidden
inside, you discover: …"). Note this hidden-*item* mechanism is the
identity flag, not the `concealment` trait (§6.4), which is about hiding
*actors*. Event `if.event.searched`; the target's `on searching it`
clauses are consulted — a false bottom that only yields to a second,
gated search is one `while` clause.

**read** (`if.action.reading`) — `read X`, `peruse X`, `study X`, gated on
the `readable` trait (`not_readable`: "There's nothing written on it").
Portable reading matter is implicitly taken first; scenery — signs,
inscriptions — reads in place. The text comes from the trait: `text` (in
Chord, `readable with text ...`), or a page of `pageContent` for
multi-page books. The message key follows `readableType`: `read_text`,
`read_book` / `read_book_page` (with page numbers), `read_sign`,
`read_inscription`. A readable can be switched off (`isReadable: false` +
`cannotReadMessage` → `cannot_read_now`) — glowing runes that only read
when lit. Reading marks `hasBeenRead` (story logic can gate on it); the
trait's literacy fields (`requiresAbility`) are declared but not enforced
today. Event `if.event.read`; `on reading it` clauses consulted.

### 6.3 listening and smelling

Both parse since ADR-230 D2: `listen`, `listen to X`, and the `hear [X]`
alias; `smell` and `sniff`, bare or with a target.

**listen** (`if.action.listening`) — with a target: a running device
reports `device_running`, a stopped one `device_off`, a container sloshes
(`liquid_sounds`) or rustles (`container_sounds`) by contents, anything
else `no_sound`. Bare `listen` scans the room: running devices →
`active_devices`, else `silence`. No preconditions at all — a pure flavor
seam, and like touching (§2.6) a favorite for `on listening it` clauses.

**smell** (`if.action.smelling`) — with a target: food and drink report
`food_scent`/`drink_scent`, a lit light source `burning_scent`, an open
container with food inside `container_food_scent`, else
`no_particular_scent`; a target in another room refuses `too_far`. Bare
`smell`: smoke first (`smoke_detected`), then food (`food_nearby`), else
`no_scent`.

Separately from this action pair, the platform has a real **sound
propagation** system (the acoustic traits below): engine-level, per-turn,
event-driven — sounds travel through walls by acoustic cost and reach
listener entities. The listening *action* does not read it; the two meet
in story logic, not in stdlib.

### 6.4 Senses traits

**readable** (`readable`, optionally `with text ...` — adjective). The
text itself, plus `readableType` (text/book/sign/inscription — picks the
message key), page fields for books (`pageContent`, `currentPage`,
`pages`), the `isReadable`/`cannotReadMessage` gate, and `hasBeenRead`.
From Chord only `text` is settable; pages and types are TypeScript.

**scenery** (`scenery` — adjective). Fixed in place: blocks taking with
`fixed_in_place` or its own `cantTakeMessage` (§2.1), drops out of "You
can see …" lists while remaining examinable, and reads in place rather
than being picked up (§6.2). Two more fields, `mentioned` and `visible`,
fine-tune listing and visibility — TypeScript-only settings.

**concealment** (trait — for hiding *actors*, ADR-148). Declares an
entity as a hiding spot: which positions it supports (behind, under, on,
inside), how good the cover is, how many can hide there. The hiding
action (§8.4) validates against it and marks the hider with a dynamic
concealed-state trait whose visibility behavior makes them unseeable —
story-overridable. Composable as the `hiding-spot` adjective — bare it
supports every position, `with position <word>` narrows to one; hidden
*items* use the identity `concealed` flag instead (§6.2).

**acoustic** and **listener** (traits — the sound-propagation pair,
ADR-172/173, TypeScript-only). `acoustic` sits on walls and rates how
sound crosses them (thin / default / thick / soundproof, with a dampener
variant for tapestries and peepholes); `listener` marks an entity as
receiving propagated sounds — the engine attaches it to the player
automatically, and each delivered sound arrives as a
`sound.audibility.heard` event with rendered prose. No story ships on
this system yet; it is the platform's eavesdropping substrate (character
knowledge propagation builds on it).

## 7. Devices

Things that turn on and off — and the lights among them, which are how a
story pushes back the dark rooms of §3.1.

### 7.1 switching_on and switching_off

**switch on / switch off** (`if.action.switching_on` /
`if.action.switching_off`) — `turn on X`, `switch on X`, `flip on X`, and
the reversed `turn X on` / `turn X off` (only `turn` gets the reversed
form — `switch X on` does not parse). The bare transitive synonyms landed
with ADR-230 D4: `activate`/`start`/`power on X` switch on,
`deactivate`/`stop`/`power off X` switch off. All forms check the
`switchable` trait in validation. (Bare `turn X` with no on/off is the
separate per-entity turning verb, §2.7.)

Switching on refuses `not_switchable`, `already_on`, and `no_power` (for
devices that declare a power requirement); off refuses `already_off`.
Turning on a device that is also a `light-source` lights it — and if that
banishes darkness in the player's room, the action follows with an
automatic LOOK, so the newly visible room describes itself
(`illuminates_darkness`, then the room text). Turning the sole light off
says `light_off` ("… plunging the area into darkness") and leaves the
player in §3.1's dark-room world.

The success message is chosen by what the device is: light keys
(`illuminates_darkness`, `light_on`, `light_off`, `light_off_still_lit` —
picked by whether other lit lights share the room), sound keys
(`with_sound` using the trait's on/off sound, `silence_falls` when a
running hum stops), device flavor (`device_humming`, `device_stops`), and
plain `switched_on` / `switched_off`. Events: `if.event.switched_on` /
`switched_off`, payloads carrying light, sound, power, and timer facts
for story reactions; blocked forms `switch_on_blocked` /
`switch_off_blocked`. Both actions consult the device's `on switching_on
it` / `on switching_off it` clauses.

In Chord, `on`/`off` and `lit` work as state predicates (`while the
flashlight is on`, `while the lantern is lit`) — and declaring your own
on/off state pair on a switchable gets a fix-it telling you to compose
the trait instead. One subtlety: `is lit` reads the stored flag strictly,
so a light that has never been switched counts as not-lit in Chord
conditions even where the platform's own default would call it lit —
switch it once and the two agree.

### 7.2 Device traits

**switchable** (`switchable` — adjective). The on/off state plus:
`startsOn`, a power model (`requiresPower`, `hasPower`,
`powerConsumption` — the no_power refusal), on/off/running sounds (fed
into the sound message keys and event payloads), swap-in
`on/offDescription` text, and `detailWhenOn` — the appended examine
sentence, which is exactly what Chord's `phrase detail while it is on:`
lowers to (the zoo's radio and flashlight both use it). Dormant today:
the auto-off timer (`autoOffTime` is honored at switch-on but nothing
ticks the countdown) and the per-trait message overrides
(`onMessage`/`alreadyOnMessage`/…) — flagged. Chord composes the
adjective off by default; `starts on` seeds it running (ADR-231;
chord-language.md §2.11).

**light-source** (`light-source` — adjective). Makes a switchable shed
light: `isLit` (managed by the switching actions), `brightness`,
`litDescription`/`unlitDescription`, `detailWhenLit` (Chord: `phrase
detail while it is lit:`), and a fuel model (`fuelRemaining` — empty
refuses to light; `maxFuel`, consumption rate) whose *consumption* is
dormant: nothing burns fuel per turn today, so a lantern only runs out if
story logic decrements it. The zoo flashlight — `light-source,
switchable` — is the shipped example.

**button** (trait — TypeScript-only, and mostly decorative). Descriptive
fields (color, size, shape, label, `latching`); its one live effect is in
*pushing* (§2.6): a pushable button that is also switchable toggles, and
the BUTTON trait upgrades the message to `button_clicks`. Worth knowing:
pushing's toggle flips the switch state but — unlike the switching
actions — does not light or extinguish an attached light source, so wire
light-buttons through `after pushing it` story logic (flagged as an
inconsistency).

## 8. NPCs & conversation

The people a story writes, and the rougher ways a player interacts with
the world: talk, fight, eat, hide.

### 8.1 talking, asking, telling

**talk** (`if.action.talking`) — `talk to/with X`, `speak to/with X`,
`chat with X`, `converse with X` (core grammar since ADR-229; story
grammar still outranks it). Not gated on being a person: talking to the
mailbox reaches the action and refuses with
`not_actor` — hook-visibly, so a story can intercept even that. Other
refusals: `too_far` (same room required), `self`, and `not_available`
(a conversation marked unavailable).

A bare person answers `no_response` ("The zookeeper doesn't respond.") —
which is honest: stdlib's built-in conversation is shallow. A
`conversation` object in the actor's custom properties unlocks greeting
flavor (first meeting vs. `greets_again`, `formal_`/`casual_greeting`,
`remembers_you`, `has_topics` / `nothing_to_say`), but real dialogue on
*talk* is story territory: an `on talking it` clause, or an interceptor
— per-topic dialogue lives on ask/tell's declared table instead (below);
talk itself stays shallow by design. The
canonical example is Dungeo's troll — `preValidate` vetoes with its own
message when the troll is out cold, and `postReport` **overrides** the
core reply with GROWLS when he isn't. That override seam (swap the
standard message, keep the event) is available to any talk target. The
zoo's characters skip talking entirely and speak through every-turn
daemons — also a legitimate pattern. Event: `if.event.talked`.

**ask** (`if.action.asking`) and **tell** (`if.action.telling`) — `ask X
about Y` (also `question X about Y`, `inquire of X about Y`) and `tell X
about Y` (also `inform X about Y`); a non-person recipient refuses
`not_actor`. The topic is a first-class free-text slot (ADR-231),
resolved entity-first: a topic naming something in scope carries that
entity along for story handlers, and any other wording flows through as
plain text — a topic is never scope-rejected. In stdlib the actions stay
deliberately minimal: each validates the social preconditions
(`no_target`, `not_visible`, `too_far`, `not_actor`), mutates nothing,
and reports a default — asking's `unknown_topic` ("I don't know anything
about that.") and telling's `not_interested` ("… doesn't seem
interested."). Since ADR-239, though, real per-topic dialogue is a
declared Chord table: `define topics for <person> … end topics`, one
block per person. Entity rows (`about the locket: <response>`) ride the
platform's quiet topic-entity resolution and are checked first; quoted
rows (`about "the fire", "the blaze": <response>`) match free text, with
comma-separated aliases; a response is a one-line statement or an
indented body (`it` binds the person). Matching is normalized
whole-topic lookup — case-insensitive, article-stripped, never fuzzy.
One table serves ask AND tell. On a hit the row fully owns the reply;
the person's `on asking it` / `on telling it` clause is the catch-all,
firing only on a miss; with neither, the stdlib defaults above speak.
The topic also reaches interceptor data (`topic`, `topicEntityId`)
via the lifecycle seed, for `while` conditions and TypeScript hooks.

The rest of the old conversation grammar went the other way in the same
pass: `say X [to Y]`, `shout`, and `whisper X to Y` patterns were
**removed** (their action ids had no implementations — they parsed and
then runtime-failed in every story), as was the `write X [on Y]` family.
Both return with real conversation/writing systems; story-grammar verbs
(Dungeo's SAY) are unaffected.

### 8.2 attacking and combat

**attack** (`if.action.attacking`) — `attack/hit/strike/kill/fight/slay/
murder/break/smash/destroy X` (the last three landed with ADR-230 D4),
plus `attack/hit/strike/kill X with/using Y` (the weapon form
skips fight/slay/murder). An explicitly named weapon is implicitly taken if
needed, and is a consulted command entity — a cursed sword's `on
attacking it` clause fires; a weapon *inferred* from inventory is not.

What happens depends on the target:

- **A combatant** (the `combatant` trait): stdlib refuses with
  `violence_not_the_answer` unless a combat interceptor is registered —
  real combat *is* the interceptor (normally the basic-combat extension,
  §12.4), and since ADR-215 a `.story` registers it itself: `use combat`
  in the story header wires the extension at load, no TypeScript, pure
  IR preserved. The interceptor's post-execute hook is contractually
  the combat resolution:
  it rolls the dice (seeded, in the extension — outcomes vary run to run
  and stay that way per project policy), damages through the health
  trait, and hands stdlib the result to narrate. Kills emit death events;
  a dead target refuses `already_dead`.
- **A breakable** (one-hit) or **destructible** (hit-pointed) thing:
  attacking genuinely breaks it — `target_broke`, or `target_damaged` /
  `target_destroyed` across multiple blows, honoring armor,
  weapon-required, and wrong-weapon-type rules, with `transformTo`
  (shards replace the vase) and `revealExit` support.
- **Anything else, including a plain person without `combatant`**: the
  attack is ineffective. (Today this path leaks a raw legacy string as
  its message rather than a proper ID — readable, but flagged.)

Events: `if.event.attacked`, plus death/knockout and exit-revealed events
after the blow text. The lang layer also carries the `combat.*` message
families the extension renders.

### 8.3 eating and drinking

**eat** (`if.action.eating`) — `eat/consume/devour X`, plus `munch` and
`nibble [on] X`, gated on the
`edible` trait in validation (`not_edible`). Liquids refuse with
`is_drink` ("You should drink that, not eat it") and vice versa — there
is no cross-routing. Food is implicitly taken first. Multi-serving food
counts down (`eaten_some`, then `eaten_all`; exhausted → 
`already_consumed`), and the message honors the trait's data: `taste`
(`delicious`/`tasty`/`bland`/`awful`), a `poison` effect (message-only —
"It tastes strange…" — no mechanical harm today), `satisfiesHunger`
(`filling` / `still_hungry`). One honest caveat: **eating never removes
the item** — a fully consumed apple stays in inventory at zero servings;
remove it with an `after eating it` clause if you care. Event:
`if.event.eaten`.

**drink** (`if.action.drinking`) — `drink/sip/quaff/swallow/imbibe X`,
plus `drink from X` and `sip from X`. Two things are drinkable: an edible
marked
liquid, or a **container of liquid** (`containsLiquid`), open if
openable. Container drinking decrements `liquidAmount` and reports
`from_container` / `empty_now`; an emptied vessel stays nominally
drinkable and keeps saying `empty_now` (caveat, flagged). Verb flavor:
`sipped`, `quaffed`. Event: `if.event.drunk`.

> **Closed since the first draft:** a `.story` marks a liquid with the
> `drinkable` adjective — it composes the edible trait with the liquid
> flag set, order-independent with `edible` (ratchet G1). The
> container-of-liquid path (`containsLiquid`, `liquidAmount`) remains
> TypeScript territory. Neither shipped story exercises eat/drink; the
> zoo's feeding is its own `feedable` trait.

### 8.4 hiding

**hide** (`if.action.hiding`) — position-shaped grammar: `hide
behind/under/on/in(side) X`, `duck behind/under/inside X`, `crouch
behind/under X`. Bare `hide` does not parse. The target needs the
`concealment` trait and must support the position you named
(`cant_hide_there` otherwise); success slips the player into hiding
(`if.action.hiding.behind` and friends) by marking them with a dynamic
concealed state that defeats NPC sight. Getting out is its own tiny
action — `stand up`, `come out`, `unhide`, `stop hiding`
(`if.action.revealing`, `revealed`) — but almost anything blows your
cover first: any action outside a quiet allowlist (look, examine, wait,
listen, smell, inventory, and the metas) silently breaks concealment
before it runs. Walking, taking, and talking all reveal you. Events:
`if.event.player_concealed` / `player_revealed`. The hiding spot's `on
hiding it` clauses are consulted; revealing has no interceptor surface
(flagged as a minor asymmetry), and the trait's `capacity` field is
dormant.

### 8.5 NPC & combat traits

**actor** (`a person` — kind noun). What makes something a *someone*:
pronouns (they/them default), an optional carrying capacity (the giving
refusals, §2.4), disambiguation text, and a `customProperties` bag that
conversation (§8.1) and giving preferences (§2.4) read. In Chord,
`a person` composes exactly this (plus identity); everything richer is
layered on top.

**npc** (trait; Chord via the core behavior adjectives — `guard`,
`passive`, `wanderer with move-chance 50`, `follower`, `patrol with
route [ … ]`, always available, no `use` line — or TypeScript). The
platform's NPC bookkeeping: hostility flag, movement permissions
(`canMove`, allowed/forbidden rooms — in Chord, `can-move`,
`allowed-rooms`, `forbidden-rooms`), announced-movement messages, a
behavior id for the NPC turn plugin (§12.3), and
conversation-state/knowledge/goals bags. Life-state
does *not* live here — that moved to `health` (ADR-226). Neither talking
nor attacking reads it; it belongs to the NPC plugin layer.

**character-model** (trait — TypeScript-only). The deep-NPC option:
personality, disposition, mood, threat assessment, beliefs and goals —
the substrate of the character-knowledge systems. Pointer only here; it
rides alongside `npc` and is consumed by its own subsystem, not by
standard actions.

**combatant** (trait; Chord under `use combat` — `a person, combatant
with health 20 and skill 40 and hostile true` — or TypeScript). Combat
*stats* — skill, base damage, armor, retaliation and inventory-drop
flags — and, since ADR-226, nothing else: health, consciousness, and
death live on the required `health` trait, and `health`/`max-health` on
the composition line quietly route there (the loader attaches it for
you). To stdlib its mere presence means "combat handles this"; the
stats are the extension's business (§12.4).

**weapon** (trait; Chord under `use combat` — `weapon with damage 5 and
skill-bonus 2`, plus `is-blessed`/`glows-near-danger`; durability fields
are TypeScript-only). `damage` (drives best-weapon
inference), type, blessed/glowing flags, durability fields. Prefer
equipping (§5.2) to make a weapon the inferred choice; name it explicitly
to make it a consulted command entity.

**edible** (`edible` — adjective; a liquid composes as `drinkable`,
§8.3). `servings`, `liquid` (the eat/drink router), `taste`, `effects`,
`satisfiesHunger`/`satisfiesThirst`. The behavior-side extras
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

```story
kill the player
kill the player falls-death
kill the player gas-explosion when the candle is lit
```

A statement, peer to `win` and `lose`, legal anywhere statements go: `on`
and `after` clauses (entity or trait), `on every turn [while …]` daemons,
`define action` bodies, inside `select` and `each` blocks. The phrase key
is the death text (define it like any phrase) and doubles as the recorded
cause; a bare `kill the player` records the cause `killed` and shows only
the platform's ending text. The `when` suffix gates it like any statement.

What happens next, in order: the death text speaks, the platform's
`if.event.player.died` event fires, and at end of turn the engine
re-checks the player's actual life state — that re-check, not the event,
is the final word. A story policy that revives the player during the turn
(Dungeo's death-penalty machinery works this way) vetoes the ending;
otherwise the game ends in defeat (`game.lost`, the `death` and `endgame`
channels). There is no built-in "restart or undo?" prompt — that is
client/story territory.

### 9.2 Deadly exits and deadly rooms

The common case is one fatal direction — the falls:

```story
create Aragain Falls
  a room
  west to the Rocky Shore
  south is deadly: falls-death

  The roar of the water is everything.
```

`<direction> is deadly: <phrase>` mirrors `is blocked:`. The fatal
direction is deliberately not an exit at all — typing `south` (or `s`)
never runs the going action: the command is rewritten before validation
into the internal death action, so the player sees the death text and
nothing else, no movement prose, no refusal. The conditional form
`is deadly while <condition>:` parses but is not wired yet (a load error
tells you so); the live equivalent is an `on going it` clause with
`kill the player when <condition>`.

The rarer, harsher form marks the whole room:

```story
create Over the Falls
  a room
  deadly: over-falls-death

  You are over the falls. This was a mistake.
```

`deadly: <phrase>` means every verb except a safe allowlist — look and
examine by default — is fatal, including objectless ones like WAIT and
INVENTORY that no per-entity clause could catch. In TypeScript the
underlying trait adds two more dials: `safeVerbs` (verb names or full
action ids, matched tolerantly) and `chance` (0–1) for probabilistic
hazards à la grue — rolled on the engine's seeded RNG, and a survived
roll simply lets the verb run normally, with no message. `chance` is not
expressible from Chord today.

### 9.3 Death traits and internals

**deadly-room** (trait; authored via `deadly:` above, or in TypeScript
for `safeVerbs`/`chance`). Fields: `cause` (defaults to the phrase key
from Chord, `'hazard'` in TS), `messageId`, `safeVerbs`, `chance`.

**health** (trait — Chord-reachable only through combat: under `use
combat`, `combatant with health 20 and max-health 30` seeds it,
auto-attached; there is no standalone `health` adjective). The single
life-state model (ADR-226): `health`/`maxHealth`, a consciousness
threshold, an
`asleep` flag, and the terminal `dead`/`causeOfDeath` pair; the behavior
owns `takeDamage`/`heal`/`kill` and the derived `isAlive`/`isConscious`.
Entities without it are simply alive — it is opt-in, and the platform
attaches one to the player lazily the first time something kills them.
Combat (§8.2) damages through it.

**deadly-room-death** (internal action — no grammar, never typed). The
redirect target both deadly forms rewrite commands into: it validates
unconditionally ("death is inevitable once redirected"), calls the
platform death sink, and reports the died event. Interceptors never see
it. One wire-shape nuance for event listeners: on this path the death
text rides the died event's `messageId`; on the `kill the player` path
the text is a separate phrase event and the died event carries only the
cause — same visible result, different payloads.

No shipped `.story` uses these constructs yet; the live production use of
the same machinery is Dungeo's Aragain Falls (a TypeScript transformer on
the identical seam — `falls-deadly-exit.transcript` pins the behavior),
plus its gas, grue, and poison deaths through `killPlayer`.

The author-side syntax for all three constructs is now taught in
chord-language.md §4.7; this chapter remains the reference for the
machinery underneath.

## 10. Meta & system actions

The actions every story gets for free — no traits, no eligibility, and
(deliberately) no interceptor surface: there is no entity to hang a
clause on, so none of these consult `on`/`after` clauses.

### 10.1 Information: about, help, inventory, scoring, version

**about** (`about`, `info`, `credits`) and **version** (`version`) render
the story's own metadata — which, for a Chord story, is simply the
header: `story "Title" by "Author"` with `version:` and `blurb:` flow
straight through (the platform materializes them into the story-info
trait, §11.1). A TypeScript story can add credits, ported-by, and build
fields. About emits a single overridable message,
`if.action.about.success`.

**help** (`help`, `?`, `commands`). Renders the platform's general help;
a first-time asker gets `first_time`. Topic help (`help movement`) is
implemented in the action but unreachable — the core pattern takes no
topic slot (flagged, with `save <name>` in the same boat).

**inventory** (`inventory`, `inv`, `i`). Splits what you carry from what
you wear (`carrying`, `wearing`, `carrying_and_wearing`, plus the
`holding_list`/`worn_list` lines); empty hands pick a random empty-message
variant. The abbreviations set a `brief` flag in the event for clients
that care. Burden/weight messages exist but are dormant.

**score** (`score`, `points`). Reads the platform score
ledger — which is exactly where Chord's `score <name> worth N` /
`award <name>` system deposits (chord-language.md §2.8, §4.5): max score
is summed from the declared worths at load, awards are idempotent, and
SCORE works with zero extra setup. Ranks fall back to a computed ladder
(Novice → Master); a story can override rank, moves, and achievements
through the scoring capability (TypeScript today). `no_scoring` covers
score-free stories.

### 10.2 Saving state: saving, restoring, restarting, quitting

These four are signals, not implementations: each emits a platform event
(`platform.save_requested`, `restore_requested`, `restart_requested`,
`quit_requested`) that the engine processes after the turn through
client-registered hooks — the client owns persistence and confirmation
UI. Verbs that parse: `save`/`save game`, `restore`/`load`/`load game`/
`restore game`, `quit`/`q`/`exit game`, `restart`. Named saves are
dormant (no slot in the grammar). Quit asks for confirmation through a
client query — but with no client hook registered it auto-confirms and
stops; restart computes whether confirmation is warranted (unsaved
progress, more than a few moves) and leaves honoring it to the hook.
Saving can refuse (`save_not_allowed`, `save_in_progress`,
`invalid_save_name`); restoring can refuse (`restore_not_allowed`,
`no_saves`).

### 10.3 Turns and undo: waiting, sleeping, again, undoing

**wait** (`wait`, `z`) is the canonical "let a turn pass": a full,
snapshot-taking, daemon-ticking turn in which nothing else happens —
N waits let N rounds of scheduled behavior (§12.2) play out. One message,
`time_passes` (the lang file's twelve wait variants are dead inventory —
flagged). Stories react to `if.event.waited`, or gate things on turns
passing.

**sleep** (`sleep`, `nap`, `doze`, `rest`, `slumber` — all five parse
since ADR-230 D2/D4). Flavor-only: no turns skipped beyond its own, no
health interaction — give it story meaning with story logic if a story
needs real sleep. `z` remains a wait.

**again** (`again`, `g`) re-runs the last successful non-meta command by
re-parsing its original text — so the repeat is honest: it can fail where
the original succeeded if the world changed. Meta commands (undo, save,
again itself) never enter history, so they can't be repeated;
`nothing_to_repeat` covers an empty history.

**undo** (`undo`) rolls back one full-world snapshot, taken before every
substantive turn (looks, examines, inventory, and the metas don't burn a
slot). Depth is an engine setting, default 10; consecutive undos work to
that depth. There is no per-story undo veto, and no undo-after-death —
once the defeat ending lands the game has stopped (§9.1's veto window is
the story's chance). For Chord stories, everything the language tracks —
states, occurrence counters, `once` flags, sequence progress — lives in
world state, so undo (and save/restore) cover it with no author effort
(ADR-210 AC-6, transcript-pinned).

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
| `cuttable` | `cuttable` (+ `with tool <entity>`) | eligible for CUT; outcome is the entity's own implementation | §2.9 |
| `diggable` | `diggable` (+ `with tool <entity>`) | eligible for DIG; same contract as cuttable | §2.9 |
| `moveable-scenery` | — | dormant (nothing reads it) | §2.9 |
| `attached` | — | dormant (nothing reads it) | §2.9 |
| `room` | `a room` | a place; exits, darkness, first-visit text | §3.4 |
| `exit` | — | passage entity a room exit routes via | §3.4 |
| `enterable` | `enterable` | can be gotten into / onto | §3.4 |
| `climbable` | `climbable` | eligible for CLIMB | §3.4 |
| `vehicle` | — | enterable that moves with its passengers | §3.4 |
| `openable` | `openable` (+ `with tool <entity>`) | open/closed state | §4.3 |
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
`create` block: the name, `aka` aliases, and description all land here,
along with the article/proper-name machinery the sentence assembler uses
(`properName` suppresses the article — the Chord player is proper, and
any person can be with the person-only `proper` adjective, ADR-242),
grammatical number (Chord's `plural` adjective sets it), the narration's
pronoun set (`pronounSet` — a person's `pronouns he/she/it/they` body
line, or a `define pronouns` named set for anything beyond the built-in
four; absent means the by-number fallback, "it"), disambiguation
adjectives, and three fields other chapters lean on: `concealed` (the
hidden-item flag searching reveals, §6.2), `points` (score on first take,
§2.1 — deduped per entity), and optional weight/volume/size. From Chord:
name, aliases, description, `plural`, `concealed`, and on persons
`proper` and `pronouns`; the rest is TypeScript.

**region** — groups rooms into areas: a room carries a region id, regions
nest, and going emits `region_exited`/`region_entered` events per crossed
boundary (§3.1) — the platform hook for area-scoped music, weather, or
prose. The trait's ambient-sound/smell fields are declared but nothing
reads them yet (dormant). In Chord (ADR-236): `a region` with
`containing` member lists (additive; regions nest by containing each
other), plus `after entering it` / `after leaving it` boundary reactions
and region-owned `on every turn` daemons — the full story is in §3.4.

**scene** — narrative phases with a lifecycle: a scene waits, begins when
its registered begin-condition fires, counts its active turns, and ends
(or recurs) on its end-condition — evaluated every turn by an always-on
engine plugin, emitting `if.event.scene_began` / `scene_ended` plus any
registered reaction messages. The conditions are code (closures
registered on the world, re-register after restore); the trait's state
persists. TypeScript-only.

**story-info** — the story's masthead on an invisible system entity:
title, author, version, description, plus build metadata (build date,
engine/client versions, ported-by, credits). ABOUT and VERSION read it
(§10.1), the info channels and save metadata consume it. A Chord story
never touches it directly — the header (`story "…" by "…"`, `version:`,
`blurb:`) flows through and the engine materializes the trait.

## 12. Plugins & daemons

The runtime services behind timed and NPC behavior — what a Chord
`define sequence` or `on every turn` clause (chord-language.md §4.8, §3)
actually runs on top of.

### 12.1 Turn plugins and priority

After each *successful* player action — never after a failed one, and
never after a meta command — the registered turn plugins run in
descending priority: **NPC behavior (100), state machines (75), scene
evaluation (60), the scheduler (50)**. Their events join the same turn's
output, so an NPC's move and a fuse's explosion read as part of the turn
that caused them. Each plugin sees the world, the turn, the player, the
action's result, and the engine's seeded randomness; plugin state rides
in saves.

Only the scene evaluator (§11.1) is always on at the engine level. A
TypeScript story registers the plugins it uses (Dungeo registers all
three). A Chord story gets the NPC plugin **unconditionally** — NPCs
are core vocabulary, no opt-in (ADR-215) — the scheduler exactly when
it compiled at least one daemon, and the state-machine plugin when the
story header declares `use state-machines` (§12.3).

### 12.2 The scheduler: daemons and fuses

The temporal substrate. A **daemon** runs every tick — optionally gated
by a condition, optionally once. A **fuse** counts down and fires:
turns, an optional per-turn tick condition (turns can refuse to count),
repeat, cancellation with cleanup, entity binding (auto-cleanup when the
entity goes away), and mid-flight adjustment.

What Chord compiles to, precisely: a `define sequence` becomes **one
daemon** whose step pointer lives in namespaced world state — which is
why sequence progress survives save, restore, and undo with no author
effort — arming its steps strictly in order (`at turn N` against the
wall clock, `N turns later` against the previous step's firing,
`when <owner> becomes <state>` against the state value). An `on every
turn [while …][, once]` clause becomes one daemon per clause. Owned by
an entity, a trait, or a region, it is **presence-gated**: off-stage the
clause neither fires, rolls dice, nor consumes its `once` (for a
region, "present" means anywhere in a member room, nesting included).
Hosted in the story header's own body it is the story's clause —
one daemon, **no gate**: a background clock that ticks wherever the
player is (weather, off-stage simulation; ADR-236). Chord never touches
fuses at all — the imperative timer verbs (cancel a sequence, "in 3
turns", periodic timers, reschedule) remain the audited Chord gaps
(designed in ADR-217, not yet built).

### 12.3 The NPC and state-machine plugins

**The NPC plugin** (priority 100) walks every entity with the `npc`
trait, dispatches to the behavior its `behaviorId` names, and executes
what comes back — attacks, emotes, movement (with `npc.moved` events and
witnessed variants a story can narrate). It also fires enter/leave hooks
when the player's action moved them — the greeting-guard pattern.
Built-ins: `guard` (stationary, attacks the visible player when
hostile), `passive`, and factory-made wanderers, followers, and patrol
routes; stories register richer behaviors. A Chord story gets all of
this without opting in — NPCs are core: `a person, a guard` (or
`passive`, `wanderer with move-chance 50`, `follower`, `patrol with
route [ … ]`) composes the built-ins directly, with `with`-fields for
movement permissions, routes, and chances. Configuration lives on the
trait (§8.5); the deep-NPC layers (character model, lucidity) tick here
too.

**The state-machine plugin** (priority 75) evaluates declarative
machines — states, guarded transitions triggered by actions, events, or
conditions, enter/exit effects, terminal states — at most one transition
per machine per turn. A Chord story reaches it by opting in: `use
state-machines` in the story header, then `define machine` — the full
depth (roles, enter/exit effects, terminal states, guarded transitions),
with Chord conditions as guards and Chord bodies as effects; `define
machine` without the `use` line is a compile error. And worth being
precise about: **Chord's `states:`/`change`/`select on` still do not
use it.** Chord
states are plain world-state values with a forward-march ratchet
(`reversible` opts out) — the *effect* of a simple state machine without
the plugin's machinery (no enter/exit effects, no terminal states, no
multi-machine registry). Dungeo's death-penalty policy (§9.1's veto) is
a real state machine; the cloak's states are Chord world-state.

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
