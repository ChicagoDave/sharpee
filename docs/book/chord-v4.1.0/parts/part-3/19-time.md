# Time

A story moves in **turns**. Each command the player types is one turn, and
so far the world has held still between them. Ansel could stand in the Lodge
for a week and dusk would never come.

Four commands are exceptions. `score`, `about`, `help` and `version` are
questions put to the game and not acts in its world, and they take no turn.
Nothing in this chapter runs after one of them, and none of them is counted.

This chapter gives the story a clock. It has four parts: things that happen
every turn, timers that count a few named turns and then go off, a sequence
that runs against the turn count of the whole game, and chapters that divide
the game into named stretches.

## Every turn

A clause whose head is `on every turn` runs at the end of each turn, after
the player's command has been dealt with. It usually carries a condition, so
that it runs only while something is true.

The cistern in the Undercroft has been frozen for thirty years. A lit lamp
standing over it should thaw it. First the condition gets a name.

```chord
define condition lamplight-here: the hand lamp is lit and the hand lamp is here and the cistern is here
```

Then the cistern gets two clauses.

```chord
create the cistern
  aka ice
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running
  score thaw worth 5

  on every turn while the cistern is thawing and lamplight-here
    change the cistern to running
    move the mend page to the Undercroft
    award thaw
    phrase cistern-gives
  end on

  on every turn while the cistern is frozen and lamplight-here
    change the cistern to thawing
    phrase cistern-drips
  end on
```

A thing may have several `on every turn` clauses, and they are tried in the
order they are written. The order here is deliberate. On the first turn of
lamplight the upper clause finds the cistern `frozen` and does nothing, and
the lower clause changes it to `thawing`. On the next turn the upper clause
runs. Written the other way round, the cistern would thaw and run within a
single turn, because the first clause would set up the condition
for the second.

```text
> down
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate here.

The tower bell strikes once, and the sound goes through the stones under your feet.

Where the lamplight falls on it, the ice in the cistern begins to sweat.

> examine cistern
A stone cistern sunk in the floor, fed by a lead pipe from somewhere above.

The ice has gone dark and wet, and stands a finger's width clear of the stone all round.

The ice in the cistern breaks up all at once. A leaf of paper rides up on the meltwater and slides out onto the flags.

The tower bell tolls.

You have risen to the rank of a Second-Year.
```

The second turn shows the order of events inside a turn. The player's
command is answered first, and the cistern is still `thawing` when it is
examined. Then the every-turn clause runs and the ice goes.

Three lines in that block are not the cistern's. The lamp will not light
until the spark page has been read, and reading the page sets the bell
going, so by the time lamplight reaches the Undercroft the bell is striking
and tolling. The next section is about that. The last line is chapter 18's
rank, earned by `award thaw`. If you lit the candles on the way, you had
that rank already and the line does not appear.

The leaf of paper is the mend page, which has been offstage until now. It is
declared like the other pages, with the states `faded, legible, learned`, a
reading clause and a score of its own.

An `on every turn` clause may also be written on a region, where it runs
while the player is in one of the region's rooms, and in the story header,
where it runs wherever the player is.

## Timers

A **timer** counts a small number of turns and then goes off. In Chord a
timer does not count in numbers. You name its turns, and it steps through
the names.

When Ansel reads the first working, the Hall takes three turns to notice.

```chord
define timer waking
  creak
    Somewhere above you, old timber takes a weight it had forgotten.
  sway
    A slow draught moves through the Hall, one way and then the other.
  strike
    The tower bell strikes once, and the sound goes through the stones
    under your feet.
end timer
```

Each line under the head is the name of one turn. The text indented beneath
a name is printed on the turn the timer reaches it. A name with no text is a
silent turn.

A timer does nothing until it is started, and it is started with a
statement. The spark page starts this one, in the arm for its first
reading.

```chord
      when legible
        change the spark page to learned
        change the story to waking
        start waking
        raise workings by 1
        award first-working
        phrase spark-learned
```

On the turns that follow, the timer speaks, whatever the player is doing.

```text
> light lamp
You light the hand lamp.

Somewhere above you, old timber takes a weight it had forgotten.

> east
Cloister
A covered walk around a garth gone to nettles. The refectory is east, the library door west, and the foot of the bell stair north. Worn steps go down into the dark under the hall.

A slow draught moves through the Hall, one way and then the other.
```

After its last named turn a timer **expires**, and a clause can wait for
that. This timer belongs to the story, so its clause goes in the story
header.

```chord
story
  title: The Relighting
  ...
  when waking expires
    change the tower bell to tolling
  end when
```

The clause opens with `when`, the timer's name and `expires`, and closes
with `end when`. The bell strikes once on the timer's last turn. On the turn
after that the timer has expired, the bell is `tolling`, and the header's
other clause begins.

```chord
  on every turn while the tower bell is tolling
    select cycling
      phrase toll-near
    or
      phrase toll-far
    or
      phrase toll-count
    end select
    raise tolls by 1
  end on
```

From that turn until something stops it, every turn ends with the bell.

```text
> wait
Time passes...

The bell tolls again, and the rooks go up off the roof.
```

Nothing in the story can stop it yet. That is what the third working is for,
and it arrives in chapter 24. Until then Lanternhall is a noisy place to
test in, which is some encouragement to get there.

It also means that from here to the end of the book, any reply quoted from
a game in which the spark page has been read ends with one more line. It
is one of the timer's three on the first three turns after the reading, and
one of the bell's three after that, until the bell is hushed. The blocks in
this book print the line that came when the block was recorded. Yours will
have a line in the same place, and which line it is depends on how many
turns you have taken since you read the page.

## More about timers

Five statements work a timer.

| Statement | What it does |
| --- | --- |
| `start waking` | begins it, and does nothing if it is already running |
| `stop waking` | holds it where it is |
| `restart waking` | sends it back to its first turn, running |
| `reset waking` | puts it back to not started |
| `interrupt waking` | makes it expire now |

A timer may belong to a thing. The head says so.

```chord
define timer fuse for the squib
  hiss
    The fuse hisses.
  spit
    The fuse spits.
  meanwhile
    phrase smoke
end timer
```

A timer that belongs to a thing is worked from that thing's block by its
bare name, and its `when fuse expires` clause is written there too. Its
named turns are spoken only where the thing is. A player who lights the fuse
and walks into the next room does not read the hiss.

The `meanwhile` block holds statements that run on every turn the timer is
running, beside the named turns. Add a chance to it, as in `meanwhile, one
chance in 3`, and it runs only on some of them.

A condition can ask about a timer: `the squib's fuse has started` and `the
squib's fuse has expired`.

Think of a timer as a countdown with a script. It is the right tool when
something has been set going and a few turns later it happens. For something
tied to the clock of the whole game, there is a different one.

## A sequence

A **sequence** is a list of steps set against the turn count of the story.
The Relighting gives Ansel one day.

```chord
define sequence the day
  at turn 50
    phrase light-turning
  30 turns later
    lose night-falls when the story is not awake
end sequence
```

The first step is anchored to a turn of the game with `at turn`. Each later
step may be anchored the same way, or set a number of turns after the one
before it with `turns later`. The statements under a step run when its turn
comes. The opening of a story is not a turn, and neither is a command such
as `score`, so turn fifty is the fiftieth command that takes a turn.

At turn fifty the player is warned.

```text
> wait
Time passes...

The light has turned. The shadows in the Hall have begun to lean east.
```

Thirty turns after that, if the Lantern is not burning, the day is over.

```text
> wait
Time passes...

Dusk comes down on Lanternhall and finds the Lantern dark. The blue flame in the porter's lodge goes yellow, and then goes out.

[The story has ended. RESTART, RESTORE or UNDO]
```

This is the third ending of The Relighting, and the first one a player can
reach in the story as it stands. They need only wait.

A deadline changes a game more than any other single thing in this chapter.
Eighty turns is generous for a walk that takes about fifty, and you should
count your own walk before you choose a number. Count it again whenever you
add a puzzle.

## Chapters

A long story falls into parts, and it is useful to be able to say which part
the player is in. The header line `use chapters` turns this on, and a
`define chapters` block lists them.

```chord
define chapters
  morning - Morning
    begins when the game starts
  afternoon - Afternoon
    The Hall has noticed you.
    begins when the story becomes waking
  dusk - Dusk
    begins when the player visits the Lantern Gallery for the first time
end chapters
```

Each chapter has a name, a hyphen and a title. The name is the one word
conditions will use. The title, and the optional line of description under
it, are for the player. Every chapter says when it begins, and there are
four ways to say it.

| Trigger | Begins when |
| --- | --- |
| `the game starts` | at the beginning, and exactly one chapter must say this |
| `the story becomes waking` | a thing, or the story, reaches a state |
| `waking expires` | a timer goes off |
| `the player visits the Lodge for the first time` | the player first arrives in a room |

In the terminal a new chapter prints nothing. The title and description are
sent to the page the player sees, and chapter 37 shows what a browser does
with them. What a chapter gives you here is three conditions: `during
morning`, `before dusk` and `after morning`.

```chord
create the blue flame
  aka pilot flame, sill
  a thing, scenery
  in the Lodge

  Hobb's own lamp, which has burned yellow on that sill for as long as
  anyone has kept count. The flame is blue this morning, and does not
  flicker.

  after the player examining
    phrase flame-morning when during morning
    phrase flame-later when after morning
  end after
```

```text
> examine blue flame
Hobb's own lamp, which has burned yellow on that sill for as long as anyone has kept count. The flame is blue this morning, and does not flicker.

It is early yet. The flame has the whole day to make up its mind.
```

Come back after reading the page and the flame says something else.

```text
> examine blue flame
Hobb's own lamp, which has burned yellow on that sill for as long as anyone has kept count. The flame is blue this morning, and does not flicker.

It is taller than it was this morning, and it leans toward the Hall.

The bell tolls. You have stopped counting.
```

A clause head may use the short form `during morning` where it would
otherwise say `while`, as in `after the player examining during morning`.

Chapters and story states overlap, and The Relighting uses both on purpose.
A state is something clauses change. A chapter begins by itself when its
trigger comes true, and it never goes back. Use chapters for the large
movements of the plot and states for the facts.

## When something moves

One more clause waits for an event. A clause that opens `when Hobb moves`
runs after that person has changed rooms. Nobody in Lanternhall moves by
themselves yet, so it waits for chapter 26, where people do. It concerns
people arriving. Picking a thing up and carrying it is not a move in this
sense.

## Build and try it

This is the largest change so far. Copy `relighting.story` from the companion
folder `chapter-19` over your own file. It is the story with this chapter's
changes made, and it holds the mend page, the fourth rank and the phrases,
which the chapter did not print. To make the changes by hand instead, work
from this list and take the rest from that file. Add to the header: `use
chapters`, the `on every turn` clause and the `when waking expires` clause,
and lengthen the rank ladder to four ranks ending at 35. At the top level add
`define counter tolls`, the timer, the sequence, the chapters and the
`lamplight-here` condition. Add the mend page, the cistern's score and two
clauses, the `start waking` line, and the clause on the blue flame. There
are eleven new phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Play through the reading of the page and down to the Undercroft with the
lamp lit, and watch three things run at once: the timer counting, the
cistern thawing, and the bell beginning. Read the mend page the thaw sets
free, and ask for the score.

```text
> score
You have scored 15 out of 35, earning you the rank of a Second-Year.
```

No bell line follows it, though the bell is tolling: `score` takes no turn.

::: under-the-hood
**Under the Hood: who is listening** · Story IR `timers`, `sequences`

The compiled IR lists the timer with its named turns as an ordered list of
states, and the sequence with each step's timing. Look at the sequence's
`narration` field: it says `broadcast`. Text printed by the story's own
clauses and by a sequence reaches the player wherever they are. Text from a
thing's every-turn clause is tied to the thing, which is why the timer that
wakes the Hall belongs to the story and not to the bell.
:::

::: from-another-system
**From another system: scheduled events**

Inform 10 has "Every turn" rules and timed rules of the form "the bell tolls
in three turns from now", and it has scenes, which begin and end on
conditions. TADS 3 has `Daemon` and `Fuse` objects. Chord's `on every turn`
is the every-turn rule and the daemon, and its chapters are a simpler cousin
of scenes: they begin on a trigger, they come in a fixed order, and they do
not end except by the next one beginning. The timer is the odd one out. It
counts named turns where a fuse counts a number.
:::

## What you have so far

That is Part III. Lanternhall has states, clauses, conditions, a score,
three endings and a clock. A player can read the first working, light the
lamp, thaw the cistern, find all four pages, and run out of day.

What they read while doing it is still rough. Every refusal is one fixed
sentence, the standard messages are the platform's and not this story's, and
"Time passes..." is not how Lanternhall would put it. Part IV is about
words.
