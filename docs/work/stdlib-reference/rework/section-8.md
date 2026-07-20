## 8. NPCs & conversation

The people a story writes, and the rougher ways a player interacts with
the world: talk, fight, eat, hide.

### 8.1 talking, asking, telling

**talk** (`if.action.talking`) — verbs `talk to/with X`, `speak to/with
X`, `chat with X`, `converse with X` (core grammar since ADR-229; story
grammar still outranks it). Not gated on being a person — talking to the
mailbox reaches the action and refuses `not_actor`, hook-visibly, so a
story can intercept even that. A bare person answers `no_response`,
which is honest: talk is shallow by design. A `conversation` object in
the actor's custom properties unlocks greeting flavor (first meeting vs.
`greets_again`, `formal_`/`casual_greeting`, `remembers_you`,
`has_topics` / `nothing_to_say`), but per-topic dialogue lives on
ask/tell's declared table instead.

**ask** (`if.action.asking`) and **tell** (`if.action.telling`) — `ask X
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

| | talk (`if.action.talking.*`) | ask / tell (`if.action.asking.*` / `if.action.telling.*`) |
|---|---|---|
| Refusals | `no_target` · `not_actor` · `too_far` (same room required) · `self` · `not_available` | `no_target` · `not_visible` · `too_far` · `not_actor` |
| Success | `no_response` · greeting flavor with `conversation` data (`first_meeting`, `greets_again`, `formal_`/`casual_greeting`, `remembers_you`, `has_topics` / `nothing_to_say`) | `unknown_topic` (ask) · `not_interested` (tell) — a topics row replaces both |
| Events | `if.event.talked` | `if.event.asked` / `if.event.ask_blocked` · `if.event.told` / `if.event.tell_blocked` |

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

**attack** (`if.action.attacking`) — verbs `attack/hit/strike/kill/
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
  attack is ineffective — and today prints nothing at all (the path
  carries a raw legacy string instead of a message ID, and the current
  build renders it as blank output — flagged).

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


> attack the deserter with the cutlass
You land a solid blow on the deserter, dealing 6 damage!
```

One `use` line buys the whole combat layer: `combatant` and `weapon`
compose with typed fields, and the attack resolves through real dice —
the transcript shows one genuine run, and the same command may instead
answer "You swing at the deserter but miss!" (outcomes vary run to run,
by policy). The blank line after `attack the barrel` is the flagged
ineffective path, verbatim.

| | attack (`if.action.attacking.*`) |
|---|---|
| Refusals | `no_target` · `self` · `violence_not_the_answer` (combatant, no interceptor) · `already_dead` |
| Success | combat narration via the `combat.*` message families (the extension's, carried by the lang layer) · `target_broke` · `target_damaged` / `target_destroyed` |
| Events | `if.event.attacked` · death/knockout and exit-revealed events after the blow text |

Interceptors: `on attacking it` on the target — a story wanting scripted
fights replaces the reply there instead of registering combat — and on
an explicitly named weapon; a story can also register its own combat
interceptor on the same trait seam (§12.4).

### 8.3 eating and drinking

**eat** (`if.action.eating`) — verbs `eat/consume/devour X`, plus
`munch` and `nibble [on] X`, gated on the `edible` trait
(`not_edible`). Liquids refuse `is_drink` ("You should drink that, not
eat it") and solids refuse drinking with `not_drinkable` — there is no
cross-routing. Food is implicitly taken first. Multi-serving food counts
down (`eaten_some`, then `eaten_all`; exhausted → `already_consumed`),
and the message honors the trait's data: `taste`
(`delicious`/`tasty`/`bland`/`awful`), a `poison` effect (message-only —
"It tastes strange…" — no mechanical harm today), `satisfiesHunger`
(`filling` / `still_hungry`). Event: `if.event.eaten`.

**drink** (`if.action.drinking`) — verbs `drink/sip/quaff/swallow/
imbibe X`, plus `drink from X` and `sip from X`. Two things are
drinkable: an edible marked liquid — in a `.story`, the `drinkable`
adjective, which composes the edible trait with the liquid flag set,
order-independent with `edible` (ratchet G1) — or a **container of
liquid** (`containsLiquid`, TypeScript territory), open if openable.
Container drinking decrements `liquidAmount` and reports
`from_container` / `empty_now`. Verb flavor: `sipped`, `quaffed`.
Event: `if.event.drunk`.

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

| | eat (`if.action.eating.*`) | drink (`if.action.drinking.*`) |
|---|---|---|
| Refusals | `no_item` · `not_edible` · `is_drink` · `already_consumed` | `no_item` · `not_drinkable` · `already_consumed` · `container_closed` |
| Success | `eaten` · `eaten_some` / `eaten_all` · taste flavor (`delicious`/`tasty`/`bland`/`awful`) · `filling` / `still_hungry` · `poisonous` | `drunk` · `sipped` / `quaffed` · `from_container` / `empty_now` |
| Events | `if.event.eaten` | `if.event.drunk` |

Interceptors: `on eating it` / `after eating it` and `on drinking it` /
`after drinking it` on the item, as above.

An emptied `containsLiquid` vessel stays nominally drinkable and keeps
saying `empty_now` (caveat, flagged). Neither shipped story exercises
eat/drink; the zoo's feeding is its own `feedable` trait.

### 8.4 hiding

**hide** (`if.action.hiding`) — position-shaped grammar: `hide
behind/under/on/in(side) X`, `duck behind/under/inside X`, `crouch
behind/under X`; bare `hide` does not parse. The target needs the
`concealment` trait (entry: §6.4) — in a `.story`, the `hiding-spot`
adjective, bare for every position or `with position <word>` to narrow
to one — and must support the position you named (`cant_hide_there`
otherwise). Success slips the player into hiding (`behind` and friends)
by marking them with a dynamic concealed state that defeats NPC sight.
Getting out is its own tiny action — `stand up`, `come out`, `unhide`,
`stop hiding` (**reveal**, `if.action.revealing`).

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

| | hide (`if.action.hiding.*`) | reveal (`if.action.revealing.*`) |
|---|---|---|
| Refusals | `nothing_to_hide` · `cant_hide_there` · `already_hidden` | `not_hidden` |
| Success | `behind` / `under` / `on` / `inside` | `revealed` |
| Events | `if.event.player_concealed` | `if.event.player_revealed` |

Interceptors: the hiding spot's `on hiding it` clauses are consulted
(the hamper above); revealing has no interceptor surface (flagged as a
minor asymmetry).

Three more honest flags. The design puts every action outside a quiet
allowlist (look, examine, wait, listen, smell, inventory, and the metas)
down as silently breaking concealment before it runs — but in the
current build that break listener is never registered, so walking,
taking, and talking do *not* actually reveal you; only the
NPC-can't-see-you half is wired (flagged). `cant_hide_there`'s current
rendering misplaces an article ("You can't hide an under …" — flagged).
And the trait's `capacity` field is dormant.

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
