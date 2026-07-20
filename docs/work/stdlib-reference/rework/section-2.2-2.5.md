### 2.2 putting and inserting

Two actions share the surface English of "put". `put X on/onto Y` (and
`hang X on Y`) is **putting** (`if.action.putting`); `put X in/into/inside Y`
and `insert X in Y` parse as **inserting** (`if.action.inserting`), which
delegates its work back into putting with the preposition forced to "in".
`place` works in both phrasings, and `move X to Y` lands in putting since
ADR-230 D4, the destination's kind deciding in versus on (the D4 ruling:
`move` is a manipulation verb, never movement — see also pushing, §2.6).
The destination decides eligibility: `on` needs a supporter, `in` needs a
container, and a closed openable container refuses. The item does not need
to be in hand — putting performs an implicit take first, and refuses with
the taking refusal if that fails (a fused-down ring cannot be put
anywhere). Because inserting delegates its report into putting, a
successful INSERT renders `if.action.putting.put_in` — override `put_in` /
`put_on` for success text in both phrasings — while inserting's *failures*
render under `if.action.inserting.<key>`.

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

define phrase if.action.putting.put_in
  It slides in with a papery whisper.
end phrase
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

The delegation in one scene: a single `define phrase` under putting's
`put_in` re-voices both phrasings, and the bin's single `on putting it`
guard catches the `insert` command too — while `put … on` renders `put_on`
untouched.

| | putting (`if.action.putting.*`) | inserting (`if.action.inserting.*`) |
|---|---|---|
| Refusals | `no_target` · `no_destination` · `cant_put_in_itself` / `cant_put_on_itself` · `already_there` · `not_container` / `not_surface` · `container_closed` · `no_room` (container) · `no_space` (supporter) | the same checks, rendered under `if.action.inserting.<key>` when the command was an INSERT |
| Success | `put_in` · `put_on` (INSERT reports through `put_in`) | — (delegates to putting) |
| Events | `if.event.put_in` / `if.event.put_on` / `if.event.put_blocked` | `if.event.insert_blocked` |

Interceptors: `on putting it` / `on inserting it` on the item or the
container — an INSERT consults `on inserting it` first, then (through the
delegation) `on putting it` on both entities, so register a given entity
under **one** of the two gerunds, not both, or it will run twice;
`on putting it` covers both phrasings, and in `put all in the case` a
container-side clause runs once per deposited item.

### 2.3 removing (taking from)

**remove X from Y** (`if.action.removing`) — take an item out of a
container or off a supporter, named source and all. Core grammar since
ADR-230: `remove X from Y`, `extract X from Y`, and `take X from Y` — the
last optionally `with/using Z`, a tool form whose named tool becomes a
consulted command entity (the old orphan `taking_with` id was retired onto
removing in the same pass). Success is semantically a take: the success
**event** is `if.event.taken`, with the source recorded in the payload.

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

| | remove (`if.action.removing.*`) |
|---|---|
| Refusals | `no_target` · `no_source` · `already_have` · `not_in_container` / `not_on_surface` · `container_closed` · `cannot_take` (carrying capacity) · `nothing_to_remove` (`remove all from X` with nothing eligible) |
| Success | `removed_from` (a container) · `removed_from_surface` (a supporter) |
| Events | `if.event.taken` (source in the payload) |

Interceptors: the item slot consults `on removing it` and then `on taking
it`, in that order; the source consults `on removing it` only, and so does
an explicitly named tool, after item and source — as with
putting/inserting, register per entity under one gerund. Bare `remove X`
still means undressing (§5).

### 2.4 giving and showing

**give** (`if.action.giving`) — `give X to Y`, `give Y X`, `offer X to Y`.
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

**show** (`if.action.showing`) — `show X to Y`, `show Y X`. Purely social:
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
`if.action.giving` on the recipient, which takes over the whole exchange.

| | give (`if.action.giving.*`) | show (`if.action.showing.*`) |
|---|---|---|
| Refusals | `no_item` · `no_recipient` · `not_actor` · `self` · `not_holding` · `recipient_not_visible` · `recipient_not_reachable` · `inventory_full` / `too_heavy` (capacity, phrased as declining) · `not_interested` (`preferences.refuses`) | `no_item` · `no_viewer` · `not_actor` · `self` · `not_carrying` · `viewer_not_visible` · `viewer_too_far` |
| Success | `given` · `gratefully_accepts` / `reluctantly_accepts` (likes/dislikes) · `accepts` and `refuses` exist for story use — stdlib itself never picks them | `shown` · `wearing_shown` (worn item) · `reactions` matches: `viewer_recognizes` · `viewer_impressed` · `viewer_unimpressed` · `viewer_examines` · fallback `viewer_nods` |
| Events | `if.event.given` / `if.event.give_blocked` | `if.event.shown` / `if.event.show_blocked` |

Interceptors: `on giving it` / `after giving it` and `on showing it` /
`after showing it`, on the item or on the recipient/viewer.

### 2.5 throwing

**throw** (`if.action.throwing`) — `throw X at Y` and `throw X to Y`, with
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
`if.event.item_destroyed` event (`cause: 'thrown'`).

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

| | throw (`if.action.throwing.*`) |
|---|---|
| Refusals | `no_item` · `not_holding` · `target_not_visible` · `target_not_here` · `no_exit` · `too_heavy` (over 10 kg) · `self` |
| Outcomes | `hits_target` · `misses_target` · `target_ducks` · `target_catches` · `target_angry` · `lands_on` · `lands_in` · `bounces_off` · `breaks_against` · `breaks_on_impact` · `fragile_breaks` · `thrown_down` · `thrown_gently` · `sails_through` |
| Events | `if.event.thrown` (`throwType`, `hit`, `willBreak`, `finalLocation` in the payload — enough for a story reaction to know exactly what happened) / `if.event.throw_blocked` · `if.event.item_destroyed` (`cause: 'thrown'`) |

Interceptors: both the item and the target are consulted (`on throwing it`
on either) — a glacier can react to being hit in the same command as an
explosive reacts to being thrown; a capability behavior registered for
`if.action.throwing` on the target takes over the whole throw.
