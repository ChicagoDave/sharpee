# Reacting to the player: on and after

Every command a player types becomes an **action**: taking, opening,
reading, pulling. Chapter 9 called these the standard actions, and so far
they have done all the work. The player types `take kettle` and the taking
action takes the kettle.

A **clause** is how a thing gets a say in that. It is a small block inside a
`create` block that names an action and holds the lines to run when the
player does that action to this thing. There are two kinds. An `on` clause
runs before the action and can stop it or speak in its place. An `after`
clause runs once the action has succeeded and adds to it.

## A thing that says no

Hobb's kettle has been sitting in the Lodge since chapter 6, and any player
could walk off with it. It belongs to Hobb, and Hobb is four feet away.

```chord
create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.

  on the player taking while Hobb is here
    refuse kettle-is-hobbs
  end on
```

Read the first line of the clause as a sentence: on the player taking, while
Hobb is here. The word after `the player` is a **gerund**, the "-ing" form of
a verb, and it names the action. The clause belongs to the kettle because it
is written in the kettle's block, so it concerns the player taking the
kettle and nothing else.

The line inside is a statement. `refuse` stops the action and prints a
phrase, and the phrase goes in the `define phrases` block with the others.

```chord
define phrases en-US
  kettle-is-hobbs:
    Hobb does not look round. "That's mine," he says.
```

The clause closes with `end on`.

```text
> take kettle
Hobb does not look round. "That's mine," he says.
```

The kettle is still on the floor of the Lodge. The taking action never ran.

## Where a clause lives

A clause is written on the thing it is about. This is the most important
habit in Chord, and the language holds you to it. There is no place in a
story file for a rule that says "when the player takes the kettle". There is
only the kettle, and what the kettle does about being taken.

The gain shows as a story grows. Everything that can happen to the kettle is
in the kettle's block, and to find out why the grille will not move you read
the grille.

## Speaking in the action's place

An `on` clause does not have to refuse. If it prints a phrase and lets the
action go on, the phrase replaces what the action would have said.

The kindle page was `readable with text` in the last chapter, and reading it
printed the standard sentence followed by that text. Take the text away and
give the page a clause.

```chord
create the kindle page
  aka first page, leaf
  a thing, readable
  on the reading desk
  states: legible, learned

  A leaf that has worked loose from the grimoire. The ink on it is
  complete.

  on the player reading
    change the kindle page to learned
    phrase kindle-learned
  end on
```

```chord
define phrases en-US
  kindle-learned:
    You read the line once, and it reads you back. The word for waking a
    flame settles into the place it left thirty years ago, as if it had
    only stepped out.
```

The clause has two statements. The first is the `change` you met in the last
chapter, now in a place where it runs during play. The second, `phrase`,
prints a piece of text.

```text
> read page
(first taking the kindle page)

You take the kindle page from the reading desk.

You read the line once, and it reads you back. The word for waking a flame settles into the place it left thirty years ago, as if it had only stepped out.
```

The page's state is now `learned`. Something in Lanternhall has changed
because of what the player did, for the first time.

## Adding to an action: after

An `after` clause leaves the action alone and speaks once it is done. The
bell rope is `pullable`, and pulling it prints the standard sentence. The
rope then adds its own.

```chord
create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair

  A rope as thick as your wrist, coming down out of the dark.

  after the player pulling
    phrase rope-nothing
  end after
```

```text
> pull rope
You pull the bell rope.

Nothing answers. The bell has not been rung in thirty years and sees no reason to start for you.
```

Both lines are printed, the action's first and the clause's second. An
`after` clause closes with `end after`.

Because it runs when the action has already happened, an `after` clause
cannot refuse. If you write `refuse` in one, the compiler explains:

```text
probe.story:23:5 error [parse.react-refusal] Refusals (`refuse`, `must`) cannot appear in an `after` clause — reactions run after the action succeeded. Use an `on` clause to intercept.
```

The choice between the two is the choice between those two sentences. Use
`on` when the thing should prevent the action or tell it differently. Use
`after` when the action should happen as usual and the thing has something
to add.

## Several actions, one clause

The grille cannot be taken, pushed or pulled, and it says the same thing to
all three. A clause head may list gerunds, separated by commas.

```chord
create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair
  states: standing, lifted

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.

  on the player taking, pushing, pulling
    refuse grille-fixed
  end on
```

```text
> push grille
It does not so much as rattle.

> pull grille
It does not so much as rattle.
```

A list is a shorthand for one clause per gerund, each with the same lines.
It is not a way to have two clauses for one action. A thing takes one `on`
clause and one `after` clause for each gerund, and a second is an error:

```text
probe.story:26:17 error [analysis.duplicate-clause] A `on taking` clause is already declared on lamp at line 22 — a second one would silently mask it. Merge the bodies (or split intercept/react across `on`/`after`).
```

When a thing needs to answer one action in more than one way, it does so
inside one clause. Chapter 17 shows how.

## The other thing in the command

Some actions involve two things. The player gives the spectacles to Hobb, or
puts the lens in the Lantern. A clause on one of them may name the other, and
then it runs only for that pairing.

```chord
create the spectacles
  aka glasses
  a thing, plural, concealed
  in the Lodge

  Wire spectacles with one arm mended in thread. Hobb has been looking
  for them since the spring.

  after the player giving to Hobb
    phrase spectacles-given
  end after
```

```text
> give spectacles to hobb
You give the spectacles to Hobb.

Hobb hooks them over his ears and looks at you properly for the first time. "Ansel," he says, after a while. "You were always late."
```

The words `to Hobb` are the **counterpart**. Giving the spectacles to anyone
else would not run the clause. The lens has one of the same kind, for the
day it reaches the roof:

```chord
  after the player inserting in the Great Lantern
    phrase lens-seated
  end after
```

Two gerunds are easy to confuse here. `putting` is putting a thing on a
supporter, and `inserting` is putting a thing in a container. The Great
Lantern is a container, so the lens is inserted. Appendix C lists every
standard action with its gerund.

A `settable` thing has a tail of a different kind. Its clause may name the
position being chosen, and then it runs for that position only.

```chord
  on the player setting to high
    phrase dial-high
  end on
```

```text
> set dial to high
The needle swings over to high, and something below you starts to hum.
```

## Conditions and once

A clause head may end with `while` and a condition, as the kettle's does.
The clause then runs only when the condition is true. If Hobb ever leaves
the Lodge, the kettle can be taken.

A head may also end with a comma and the word `once`. The clause then runs
one time in the whole story and never again.

```chord
create the Library, a room
  in the Hall

  The reading room of Lanternhall, with its desks in rows and its
  galleries of shelves. The stacks run back to the north, out of the
  light. The cloister is east.

  after the player entering, once
    phrase library-ink
  end after
```

```text
> west
Library
The reading room of Lanternhall, with its desks in rows and its galleries of shelves. The stacks run back to the north, out of the light. The cloister is east.

On the reading desk you see a grimoire and a kindle page.

There is a smell in here that was not here thirty years ago, or was here and you had forgotten it. It is wet ink.
```

This clause is on a room, and on a room the gerund `entering` means the
player's arrival there. On anything else it means the player getting into
the thing, as with Hobb's chair.

## Clauses about the person

Every clause so far has been about something done to the thing that owns
it. A person's block may also hold a clause about what that person does. The
head then has no actor, only the gerund.

```chord
create Ansel
  a person, proper
  playable
  starts in the Lodge
  carries the wax taper
  wears the travelling coat

  You were a student here once, for a term. You have the same hands and
  not much else.

  after eating
    phrase cake-eaten
  end after
```

This runs after Ansel eats anything at all. The only food in Lanternhall is
Hobb's cake.

```text
> eat cake
You eat some of the seed cake.

It tastes of caraway, and of being nineteen.
```

A head with no actor is allowed only in a person's block. The actor in the
other heads does not have to be the player, either. `after Hobb taking`
would be a clause about Hobb taking the thing, and it waits for chapter 26,
where people act by themselves.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-14` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the phrases from that file: add the
clauses to the kettle, the spectacles, the Library, the kindle page, the bell
rope, the grille, the lens and Ansel, add their eight phrases, and remove
`with text` and its string from the kindle page.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Find the spectacles first. They are `concealed`, so the command is `search`.

```text
> search
Hidden here, you discover: spectacles.

> take spectacles
Taken.
```

::: under-the-hood
**Under the Hood: the phases of an action** · `if.action.taking`

A standard action runs in phases. It first checks whether it may happen,
then changes the world, then reports what it did. An `on` clause is
consulted at the start, before the check, which is why it can refuse and why
a phrase it prints stands in for the report. An `after` clause runs when the
report is already written. `sharpee test` lists every clause it found by
owner and gerund, such as "kettle · on taking", and that list is a quick way
to see what your story has attached to which action.
:::

::: from-another-system
**From another system: rules about actions**

Inform 10 gives you rulebooks that sit around every action: Instead, Before,
Check, Carry out, After and Report rules, each of which may name the object
it applies to. TADS 3 puts the handling on the object, in `dobjFor` blocks
with `verify`, `check` and `action` methods. Chord is closer to the second.
It has two hooks where Inform has six, and it will not let you write either
of them anywhere but on the thing concerned.
:::

## What you have so far

Lanternhall answers back. A kettle refuses, a page teaches, a rope and a
room add a sentence, and the porter knows your name. Each of those clauses
holds one or two statements, and you have met three statements in all:
`refuse`, `phrase` and `change`. The next chapter is about the rest.
