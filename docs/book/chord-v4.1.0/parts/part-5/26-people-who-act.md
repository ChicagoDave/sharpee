::: {.part-page}

# Part V. People {.part .unnumbered}

:::

# People who act

Hobb has been in the Lodge since chapter 6. He is `a person`, he is
`proper`, and he has a description and a sentence of his own in the room.
In every way that matters to the player he is furniture. He never moves,
he never does anything, and the only verb he answers is `give`.

This chapter makes people do things. It covers four tools, in rising order
of effort: the `pronouns` line, which lets your prose refer to a person
correctly; the stock behaviours, which move a person about with one word;
the acting statement, which has a person perform one action when you say
so; and the `goal` block, which gives a person a plan to carry out on their
own turns.

## Pronouns

A person takes one line that a thing does not.

```chord
create Hobb
  a person, proper
  pronouns he
  in the Lodge
```

The `pronouns` line names a pronoun set. Four are standard: `he`, `she`,
`it` and `they`. The line is allowed only in a person's block.

What the line buys you is a marker. Chapter 20 showed that a phrase can
take a parameter and print it with `{the who}`. Once a person has been
named in a phrase, `{pronoun:subject}` prints the right pronoun for
whoever that was.

```chord
define phrases en-US
  own-business:
    {the who} does not stop for you. {capitalize pronoun:subject} has
    {pronoun:possessive} own day to get through.
```

One phrase now serves anybody. The person is passed in where the phrase is
used.

```chord
after the player examining
  phrase own-business with who = Tamsin Vey
end after
```

```text
> examine tamsin
A broad woman in a leather apron, with a pry bar through her belt and brass filings in the creases of her hands. She has the look of someone adding you up.

Tamsin Vey does not stop for you. She has her own day to get through.
```

A pronoun marker refers to the person most recently mentioned in the same
phrase, which is why `{the who}` comes first. There are five cases, and
each has a marker.

| Marker | For `he` | For `she` | For `it` | For `they` |
| --- | --- | --- | --- | --- |
| `{pronoun:subject}` | he | she | it | they |
| `{pronoun:object}` | him | her | it | them |
| `{pronoun:possessive}` | his | her | its | their |
| `{pronoun:possessive-pronoun}` | his | hers | its | theirs |
| `{pronoun:reflexive}` | himself | herself | itself | themselves |

Put `capitalize` in front of a marker that begins a sentence. A person with
no `pronouns` line is spoken of as `it`, or as `they` if the person is
`plural`.

### A set of your own

If the four standard sets do not suit a character, define a fifth.

```chord
define pronouns ey
  subject ey
  object em
  possessive eir
  possessive-pronoun eirs
  reflexive emself
end pronouns

create Sam
  a person, proper
  pronouns ey
  in the Yard
```

The block names the set and gives all five cases, one to a line, in any
order. Leaving one out is an error. The name may not be one of the four
standard names.

```text
> examine sam
Sam.

Sam looks back. Ey folds eir arms and keeps the moment to emself.
```

The Relighting does not need a set of its own. Hobb is `he`, Tamsin Vey is
`she`, and the third person in this chapter is `it`.

## The stock behaviours

The quickest way to make a person move is one word on the kind line. The
platform ships five behaviours, and each is a word you compose exactly as
you compose `wearable` or `openable`.

The Relighting has a creature for the simplest of them: a scrap of
returning magic that takes a liking to Ansel.

```chord
create the wisp
  aka light
  a person, follower
  pronouns it

  A scrap of light the size of a thumbnail, the same blue as the lamp
  flame. It keeps a little behind your shoulder, where a dog would.
```

A `follower` goes where the player goes. The wisp has no placement line,
so it begins the game nowhere, and the hand lamp brings it on the first
time the lamp is sparked.

```chord
after the player sparking, once
  move the wisp here
  phrase wisp-arrives
end after
```

```text
> light lamp
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

Something small and blue comes loose from the flame and hangs in the air beside it, undecided. Then it decides.

Somewhere above you, old timber takes a weight it had forgotten.

> east
Cloister
A covered walk around a garth gone to nettles. The refectory is east, the library door west, and the foot of the bell stair north. Worn steps go down into the dark under the hall.

A slow draught moves through the Hall, one way and then the other.

The wisp follows you.
```

The line "The wisp follows you." is the platform's. From here to the end
of the game the wisp is in the room with Ansel, and the room lists it.

A person needs the word `person`. The wisp is not much of a person, but it
moves by itself and will later hear things, and those are what the kind is
for.

### The five words

| Word | What the person does |
| --- | --- |
| `follower` | Goes where the player goes, arriving on the same turn. |
| `wanderer` | Moves to a neighbouring room at random. |
| `patrol` | Walks a fixed route of rooms. |
| `guard` | Stays where it is, and says so when the player walks in. |
| `passive` | Stays where it is and does nothing. |

A behaviour word takes settings, written with `with` and joined by `and`,
as the settings of chapter 9 were.

```chord
create the cat
  a person, wanderer with move-chance 50 and allowed-rooms [the Yard, the Shed]
  in the Yard

  A grey cat.

create the watchman
  a person, patrol with route [the Yard, the Shed] and loop true and wait-turns 1 and announces-movement true
  pronouns he
  in the Yard

  A watchman.
```

A list of rooms is written in square brackets, with commas. A setting that
is true or false takes the word `true` or `false`.

| Setting | On | Meaning |
| --- | --- | --- |
| `move-chance` | `wanderer` | The chance of moving each turn, as a number from 0 to 100. |
| `route` | `patrol` | The rooms to walk, in order. |
| `loop` | `patrol` | Whether to begin the route again at its end. |
| `wait-turns` | `patrol` | How many turns to stand in each room. |
| `allowed-rooms` | all five | The only rooms the person may enter. |
| `forbidden-rooms` | all five | Rooms the person may never enter. |
| `can-move` | all five | Set to `false`, it holds the person still. |
| `announces-movement` | all five | Whether the player is told of comings and goings. |

The last one matters more than it looks. Without it a person who moves is
simply in the room or not in it, and the player learns of the move from the
room's list. With it, the platform reports each move the player can see.

```text
> look
Yard
A yard.

You can see a watchman here.

The watchman leaves to the north.
```

Two of the behaviours speak when the player arrives. A wanderer "notices
you", and a guard "blocks your way!". The guard's line is only a line: the
player has already walked in. A guard that really stops someone is a
blocked exit, which is chapter 12.

## Having a person do something

The stock behaviours move people. To have a person *do* something, write a
sentence with the person as its subject.

```chord
on every turn while the oak press is open and the library key is not in the oak press
  Hobb closes the oak press
end on
```

`Hobb closes the oak press` is the **acting statement**. It begins with a
person's name, and the rest is a command exactly as a player would type it,
with the verb in the third person. When the statement runs, Hobb performs
the closing action. It is the same action the player's `close press`
reaches, with the same checks, and the platform reports it.

```text
> take key
You take the library key from the oak press.

Hobb closes the oak press.

> open press
You open the oak press, which is empty.

Hobb closes the oak press.
```

Hobb is a porter. He has spent thirty years shutting things that other
people left open, and now the story says so in one line.

Three rules govern the statement.

The words after the name must be a command the story understands. Any
standard action will do, and so will an action of your own from chapter 23:
`Hobb opens the oak press`, `Nell takes the coin from the box`. A verb that
no grammar has is an error when you build.

The person performs the action and does not merely have its result. This
is the difference between `move` and acting, and it is worth a moment.
`move the library key to Hobb` puts the key in his hands by decree, from
anywhere, with no report. An acting statement has the person do the thing
as a player would, under the action's own checks, and the platform tells
the player it was done.

The statement is not for the player, whose actions are the player's to
type.

```text
probe.story:23:5 error [analysis.act-player-actor] `the player takes the bucket` — the player cannot be made to act; an acting statement names a character. Write the character's own name, or use `move` for an authorial change.
```

It also cannot stand in an `on the player …` clause, which runs before an
action and exists to permit or refuse it. Write it in an `after` clause, in
`on every turn`, in a `when` clause, or in the conversation rows of the
next two chapters. A `when` suffix is allowed, as on most statements.

## Goals

An acting statement is one action at a moment you choose. A person who
goes somewhere, does three things in order and then stops needs a plan, and
a plan is a `goal` block.

The Relighting's second person is a salvager.

```chord
create Tamsin Vey
  aka salvager, woman
  a person, proper, passive with announces-movement true
  pronouns she
  in the Refectory

  A broad woman in a leather apron, with a pry bar through her belt and
  brass filings in the creases of her hands. She has the look of someone
  adding you up.

  goal rounds, low
    wait for Ansel is in the Refectory
    act tamsin-sorts
    move to the Cloister
    act tamsin-measures
    move to the Refectory
  end goal
```

A goal has a name and a priority, and its body is a list of steps. The
person takes one step on each turn, after the player's own command. This
goal waits until Ansel walks in, and then Tamsin goes about her business
with an audience.

```text
> east
Refectory
Three long tables, each with its row of candles, and a hearth you could stable a horse in. The benches are stacked against the wall, where someone left them for the holidays. The cloister is back to the west.

You can see Tamsin Vey here.

> examine tamsin
A broad woman in a leather apron, with a pry bar through her belt and brass filings in the creases of her hands. She has the look of someone adding you up.

Tamsin Vey does not stop for you. She has her own day to get through.

Tamsin Vey turns over a heap of door furniture on the end of a table, and puts two hinges in her apron.

> wait
You wait. The Hall has had thirty years of practice and is better at it than you are.

Tamsin Vey leaves to the west.
```

The line "Tamsin Vey leaves to the west." is there because of
`announces-movement`. That is the reason she is `passive`: the word gives
her no movement of its own, and it is a place to hang the setting.

### The steps

| Step | What the person does |
| --- | --- |
| `move to the <room>` | Walks to the room, one room a turn. |
| `seek the <thing>` | Walks toward a thing or a person, one room a turn. |
| `wait for <condition>` | Stays on this step until the condition holds. |
| `act <phrase>` | Prints the phrase, if the player is there to see. |
| `say <phrase>` | Prints the phrase as something said. `say <phrase> to <person>` names the hearer. |
| `acquire the <thing>` | Waits until the thing is in the room, then takes it. |
| `give the <thing> to <person>` | Hands it over, waiting if the other person is not there. |
| `drop the <thing>` | Puts it down. |
| a command | Performs that action, as the acting statement does. |

The last row is the general one. Any command the story understands may be
a step, written without the person's name, since the goal's owner is the
one acting: `open the box`, `go east`, `push the iron grille`. If the action
is refused, the person tries again on the next turn.

A step has no `when` suffix. A step that must wait for something is
preceded by a `wait for` step.

Here is a small complete plan, from a story of two rooms.

```chord
create Nell
  a person, proper
  pronouns she
  in the Yard

  Nell.

  goal fetch, high
    active when Pat is in the Shed
    move to the Shed
    open the box
    take the coin from the box
    act nell-bites
    wait for Pat is in the Yard
    seek Pat
    say nell-done to Pat
  end goal
```

```text
> look
Shed
A shed.

You can see a box and Nell here.

Nell opens the box.

In the box you see a coin.

> look
Shed
A shed.

You can see a box and Nell here.

In the box you see a coin.

Nell takes the coin from the box.

> look
Shed
A shed.

You can see a box and Nell here.

Nell bites the coin.
```

`acquire` takes a thing that is lying loose in the room. For a thing inside
something, write the command, as Nell's plan does.

A person's steps happen whether or not the player is watching. Phrases
printed by `act` and `say` are seen only by a player in the same room, and
a goal that runs to its end in an empty room has still run. A goal is
finished when its last step is done, and it does not begin again.

### When a goal is active

A goal may carry one `active when` line. The goal is considered only while
its condition holds.

```chord
goal the-grille, high
  active when the tower bell is tolling
  move to the Bell Stair
  say tamsin-at-the-grille
  push the iron grille
  act tamsin-tries-the-bar
end goal
```

Tamsin now has two goals. The priority, which is one of `critical`, `high`,
`medium` and `low`, decides between goals that are active at once. While
the Hall sleeps only `rounds` is active. When the bell begins to toll,
`the-grille` becomes active and outranks it, and Tamsin leaves whatever she
was doing and walks to the foot of the tower. She takes a step a turn, so
what you see depends on when you follow. This is the view two turns after
she comes through the Cloister.

```text
> north
Bell Stair
The foot of the tower. A stair winds up around the well where the bell rope hangs. The cloister is south. An iron grille stands across its third step.

You can see Tamsin Vey here.

The tower bell tolls.

The wisp follows you.

Tamsin Vey runs a thumb down one bar of the grille and looks at the thumb. "That," she says, "was not here on Tuesday."

> wait
You wait.

The bell tolls again, and the rooks go up off the roof.

Tamsin Vey pushes the iron grille.

> wait
You wait. The Hall has had thirty years of practice and is better at it than you are.

The bell tolls. You have stopped counting.

Tamsin Vey sets her pry bar to the foot of the grille and leans. The bar bends. The grille does not notice.
```

The middle line is the platform's report of a real push. The grille's own
clause from chapter 14 says `on the player taking, pushing, pulling`, and
it concerns the player only, so Tamsin's push goes through to the standard
action and its standard result.

That is the whole of a second character's morning in fourteen lines, and
none of it is a clause on a thing. A goal belongs to the person who has it.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-26` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. This is the first chapter
of Part V, and the copy's `story-version` is `0.5.0`. To make the changes by
hand instead, work from this list and take the rest from that file: add
`pronouns he` to Hobb, add the `on every turn` clause to the oak press and
the `after the player sparking, once` clause to the hand lamp, create Tamsin
Vey and the wisp near Hobb, and add their six phrases to the phrases block.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk to the Refectory and wait a turn or two, then follow Tamsin into the
Cloister. Read the spark page, light the lamp, and wait in the Cloister
for the bell. Tamsin comes through on her way to the tower. Wait two turns
more and then go north, and the Bell Stair reads as it does above. Go
sooner or later and the same lines come on other turns.

```text
> wait
You wait.

The tower bell tolls.

Tamsin Vey enters from the east.
```

::: under-the-hood
**Under the Hood: behaviours and plans** · Story IR `traits`, `character.goals`

In the compiled IR a behaviour word is one more entry in a person's
`traits` list, beside `proper`, with its settings in a `config` list:
Tamsin has `passive` there with `announces-movement`. The platform turns
each into an NPC behaviour that is consulted once a turn. A person's goals
are recorded under `character.goals`, each with its `priority`, its
`activeWhen` condition and its `steps`. A command step such as `push the
iron grille` is stored with the action it resolved to (`pushing`) and the
pattern it matched (`push :target`), which is why a misspelt command in a
goal is a build error and not a silent failure at turn forty. When an NPC
acts, it runs the same standard action a player's command runs.
:::

::: from-another-system
**From another system: actors acting**

In Inform 10 an action can be tried by another person, with a phrase such
as "try Hobb closing the oak press", and the action is then subject to the
usual action machinery. A person's routine can be written as "Every turn"
rules. In TADS 3 a non-player character's goals are `AgendaItem` objects,
each with an `isReady` condition and an `invokeItem` method that is called
when the item is carried out. A Chord goal is nearest to a TADS agenda
item, with the difference that its body is a list of steps taken one a turn
and not a method.
:::

## What you have so far

Lanternhall has three people in it besides Ansel. Hobb shuts his press
behind you. Tamsin Vey sorts her brass, measures a bracket in the Cloister,
and goes to the grille when the bell starts. A wisp follows the lamp.

None of them can be spoken to.

```text
> talk to hobb
Hobb doesn't respond.
```

The next chapter gives them something to say.
