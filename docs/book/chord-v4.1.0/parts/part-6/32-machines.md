::: {.part-page}

# Part VI. Larger machinery {.part .unnumbered}

:::

# Machines

A thing with states, from chapter 13, changes when a clause on that thing
says `change`. That is the right tool for a page that is faded, legible or
learned, where one action moves one thing one step.

Some mechanisms are not like that. A lock with a sequence, a lift with
floors, a ritual in four parts: each has a state of its own that belongs to
no single thing, and what the player does to one part depends on where the
whole has got to. You can build these from states and clauses, and by the
third state the logic is spread across six blocks and nobody can see it.

A **machine** gathers that logic into one block. It lists the states, and
under each state the things that move the machine out of it. This chapter
builds one: the shutters of the Great Lantern, which have to be cranked
open before a flame in the Lantern can be seen by anybody.

## The parts

A machine is not a thing. It has no description and the player cannot
refer to it. It watches things, so the things come first.

```chord
create the shutter
  aka shutters, leaves
  a thing, scenery
  in the Lantern Gallery
  states: closed-round, drawn

  A shutter of brass leaves that closes round the Lantern like a bud,
  worked by a crank on the drum.

  phrase detail while the shutter is closed-round:
    The leaves are shut, and green where they overlap.

  phrase detail while the shutter is drawn:
    The leaves are folded back all the way round.

create the shutter crank
  aka crank, handle
  a thing, scenery
  in the Lantern Gallery

  An iron crank on the side of the drum, with a wooden grip worn to the
  shape of a hand that is not yours.
```

The shutter has two states because the player can see two conditions of
it. The crank has no states and no clauses. Everything it does, the machine
will say.

## The machine

```chord
define machine shutter-gear
  role crank is the shutter crank
  starts shut

  state shut
    when turning the crank: half

  state half
    on enter
      phrase shutters-shift
    end on
    when turning the crank while the lens is in the Great Lantern: drawn
    when pushing the crank: shut
    on exit
      phrase gear-ticks
    end on

  state drawn, terminal
    on enter
      change the shutter to drawn
      phrase shutters-open
    end on
end machine
```

`define machine` is a top-level block with a name. Machines need no `use`
line. Read the body in three parts.

A `role` line gives a short name to a thing the machine watches. `role
crank is the shutter crank` lets the rest of the block say `the crank`. A
machine may have several roles, and it may also name things directly.

The `starts` line names the state the machine begins in.

Each `state` block is one state, and its lines say what happens there.
These states are the machine's own. They are separate from the shutter's
`closed-round` and `drawn`, and a machine may have more states than
anything the player can see. This one has three where the shutter has two,
because the gear has a half-way notch at which the leaves have not really
opened.

## Moving between states

A `when` line is a transition. It names a trigger, then a colon, then the
state to go to.

```chord
when turning the crank: half
```

The trigger here is an action on a role: the gerund of chapter 14 and the
thing it is done to. While the machine is in the state `shut`, turning the
crank moves it to `half`. In any other state this line is not in force.

```text
> turn crank
You turn the shutter crank.

Something inside the drum takes up the slack. The leaves of the shutter part by a hand's breadth all the way round, and stop.
```

The first line of the reply is the platform's. A thing that a machine
watches for turning becomes a thing that can be turned, and the standard
action reports it. The crank needed no trait word.

A transition may carry a guard, written with `while`.

```chord
when turning the crank while the lens is in the Great Lantern: drawn
```

The gear is interlocked with the lens seat. With the seat empty, the crank
still goes round, and the machine stays where it is.

```text
> turn crank
You turn the shutter crank.
```

A state may have several ways out. From `half` the machine also goes back.

```chord
when pushing the crank: shut
```

```text
> push crank
You push the shutter crank.

The pawl ticks over one tooth.
```

A trigger may also be a plain condition, with no action in it. `when the
cistern is running: flooded` moves a machine as soon as the condition
becomes true, whatever the player was doing. The platform looks at such a
line on every turn while the machine is in that state.

## Entering and leaving

A state may have an `on enter` block and an `on exit` block. Each holds
statements, as a clause does, and each runs when the machine arrives in the
state or leaves it, by whichever transition.

The state `half` has both. Its `on enter` printed the leaves parting, and
its `on exit` is the pawl. That is why the pawl ticked when the crank was pushed: the machine left
`half`. It ticks again on the way to `drawn`.

```text
> turn crank
You turn the shutter crank.

The pawl ticks over one tooth.

The crank runs free, and the shutters fold back all the way round, like a flower that has made up its mind.
```

Put prose and effects in `on enter` and `on exit`, and keep the `when`
lines for the map of the machine. The benefit comes when a state gains a
second way in. Its consequences are written once, on the state, and both
ways in get them.

Inside a machine there is no `it`. A machine belongs to the story and not
to a thing, so every statement names what it acts on.

## Telling the world

The player cannot see a machine, and a clause on a thing does not ask a
machine what state it is in. A machine makes itself felt by changing
things.

```chord
state drawn, terminal
  on enter
    change the shutter to drawn
    phrase shutters-open
  end on
```

Arriving at `drawn` writes the shutter's own state. Everything else in the
story reads the shutter, in the ordinary way. The description's `phrase
detail` lines read it. So does the Lantern.

```chord
define trait lens-seat
  on the player kindling
    the lens must be in the Great Lantern: lantern-empty
    the shutter must be drawn: lantern-shuttered
  end on
end trait
```

```text
> kindle lantern
The shutters are closed round it. A flame in there would light the inside of a brass bud, and nothing else.
```

This is the division of labour to aim for. The machine owns the sequence.
A thing owns a state the player can see. The rest of the story depends on
the thing and never needs to know a machine exists.

`terminal` after a state's name says the machine stops there. Once the
shutters are drawn the crank turns freely and nothing more happens.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-32` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print. This is the first chapter of Part
VI, and the copy's `story-version` is `0.6.0`. To make the changes by hand
instead, work from this list and take the rest from that file: add the
shutter and the crank to the Lantern Gallery, the machine near the top of the
story, the second `must` line to the `lens-seat` trait, and four phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

The last room of the winning walk now takes a little longer. Turn the
crank once before the lens is seated and once after, and try to kindle the
Lantern in between.

::: under-the-hood
**Under the Hood: the state machine** · Story IR `machines`

The compiled IR has a top-level `machines` list. Each machine carries its
roles, its starting state, and for each state its transitions and its
enter and exit bodies. A transition's trigger is recorded as one of a few
kinds: an action with the entity it is done to, or a condition. The
platform's state-machine plugin holds the current state of each machine,
moves it when a trigger in that state fires, and runs the exit body of the
state it leaves and the enter body of the state it reaches.
:::

::: from-another-system
**From another system: states and scenes**

Inform 10 has no construct called a machine. Its nearest tools are a kind
of value for the states ("The shutter-gear is a kind of value. The
shutter-gears are shut, half and drawn") with rules that test and set it,
and scenes, which begin and end on conditions and can run rules when they
do. Chord's block differs in putting every transition of a mechanism in
one place, grouped by the state it leaves.
:::

## What you have so far

The Great Lantern is now a mechanism in three parts: a lens in a seat,
shutters drawn back by a crank, and a word. The interlock means the lens
must be seated before the shutters will open fully, and the shutters must
be open before the word will take. A player who arrives on the roof with a
mended lens has perhaps six commands still to find.

The lens itself is as wide as a cartwheel, and so far Ansel has carried it
up the tower stair under one arm. The next chapter has an opinion about
that.
