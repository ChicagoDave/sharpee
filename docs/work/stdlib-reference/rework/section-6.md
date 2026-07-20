## 6. Senses & examination

How the player perceives the world: the room at a glance, a thing up
close, what is hidden inside, and what things say when read.

### 6.1 looking and examining

**look** (`if.action.looking`) — bare `look`, `l`, `look around`.
Rerenders the room: name and description (a first visit prefers the
room's first-time description and marks the room visited), the "You can
see …" list (scenery excluded), and the contents of open containers and
supporters in view. In a dark room all of that collapses to `room_dark`.

**examine** (`if.action.examining`) — `examine X`, `x X`, `inspect X`,
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

| | look (`if.action.looking.*`) | examine (`if.action.examining.*`) |
|---|---|---|
| Refusals | (`room_dark` in the dark) | `no_target` · `not_visible` |
| Success | `contents_list` · `container_contents` · `surface_contents` | `examined` · `examined_self` · `examined_container` · `examined_supporter` · `examined_switchable` · `examined_readable` · `examined_wearable` · `examined_door` · `nothing_special` |
| Events | `if.event.looked` · `if.event.room.description` · `if.event.list.contents` | `if.event.examined` |

Interceptors: `on examining it` / `after examining it` on the target
(the robin in chord-language.md §2.10 rides this seam). Looking
consults no interceptor clauses — there is no entity to hang them on;
use the room's `after entering it` or an `on every turn` daemon
instead.

Brief mode is not implemented — verbose is hardcoded on, so
`room_description_brief` is unreachable.

### 6.2 searching and reading

**search** (`if.action.searching`) — `search X`, `look in/inside X`,
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

**read** (`if.action.reading`) — `read X`, `peruse X`, `study X`, gated
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
Hidden an on, you discover: a faded letter.

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

| | search (`if.action.searching.*`) | read (`if.action.reading.*`) |
|---|---|---|
| Refusals | `container_closed` | `not_readable` · `cannot_read_now` |
| Success | `found_concealed` · `container_contents` · `supporter_contents` · `empty_container` · `searched_location` · `searched_object` · `nothing_special` | `read_text` · `read_book` · `read_book_page` · `read_sign` · `read_inscription` |
| Events | `if.event.searched` | `if.event.read` |

Interceptors: `on searching it` — a false bottom that only yields to a
second, gated search is one `while` clause — and `on reading it`.

The readable trait's literacy fields (`requiresAbility`) are declared
but not enforced today.

### 6.3 listening and smelling

Both parse since ADR-230 D2: `listen`, `listen to X`, and the `hear
[X]` alias; `smell` and `sniff`, bare or with a target.

**listen** (`if.action.listening`) — with a target: a running device
reports `device_running`, a stopped one `device_off`, a container
sloshes (`liquid_sounds`) or rustles (`container_sounds`) by contents,
anything else `no_sound`. Bare `listen` scans the room: running devices
→ `active_devices`, else `silence`. No preconditions at all — a pure
flavor seam.

**smell** (`if.action.smelling`) — with a target: food and drink report
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

| | listen (`if.action.listening.*`) | smell (`if.action.smelling.*`) |
|---|---|---|
| Refusals | — | `too_far` |
| Success | `device_running` · `device_off` · `liquid_sounds` · `container_sounds` · `no_sound` · `active_devices` · `silence` | `food_scent` · `drink_scent` · `burning_scent` · `container_food_scent` · `no_particular_scent` · `smoke_detected` · `food_nearby` · `no_scent` |
| Events | `if.event.listened` / `if.event.listen_blocked` | `if.event.smelled` / `if.event.smell_blocked` |

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
`sound.audibility.heard` event with rendered prose. No story ships on
this system yet; it is the platform's eavesdropping substrate.
