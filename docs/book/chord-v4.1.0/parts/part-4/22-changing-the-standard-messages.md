# Changing the standard messages

Most of what a player reads in a small story was not written by its author.
"Taken." "Time passes..." "You open the oak press." Those sentences come
with the standard actions, and they are plain on purpose, so that they fit
anywhere. This chapter is about making them fit here.

It also covers the phrasebook, which is the tool for the opposite problem:
text of your own that should be said one way at one time and another way
later.

## Finding a message

Every standard message has an **alias**, a hyphenated name made of the
action and the message. The `sharpee` command will list them all.

```shell
sharpee messages
```

The list is long, 885 messages at this edition, and it is printed as data
for a program to read. Each entry looks like this.

```text
{"id":"if.action.taking.taken","alias":"taking-taken","template":"Taken."}
```

The `alias` is what you will write. The `template` is the text the platform
prints, and reading it tells you whether you have found the right message.
Appendix F is this list, sorted by action, and it is the place to look
things up. To find a message without the appendix, send the list to a file
and search the file for a few words of what the game printed.

## Overriding one message

Walk into the Undercroft without a light and the platform says this.

```text
> down
It is pitch dark. You are likely to be eaten by a grue.
```

It is a famous sentence, and it belongs to another country. Nothing lives in
the dark under Lanternhall. Searching the list for "grue" finds the alias.

```text
{"id":"if.action.going.too_dark","alias":"going-too-dark","template":"It is pitch dark. {You} {be} likely to be eaten by a grue."}
```

An override is a block at the top level of the file.

```chord
override message going-too-dark
  You are at the foot of the steps, in the dark, and that is all you
  can say for certain. You were a student here, and you remember what
  the Undercroft does to shins.
end override
```

It opens with `override message` and the alias, holds the new text, and
closes with `end override`.

```text
> down
You are at the foot of the steps, in the dark, and that is all you can say for certain. You were a student here, and you remember what the Undercroft does to shins.
```

If you mistype an alias, the compiler knows the list as well as you do.

```text
probe.story:7:1 error [analysis.unknown-message-alias] `taking-takn` is not a standard-action message alias — did you mean `taking-taken`?.
```

## An override is a phrase

The body of an override is the body of a `define phrase` block, and the head
line takes the same additions. So a standard message may have variants and a
strategy.

```chord
override message waiting-time-passes, cycling
  You wait. The Hall has had thirty years of practice and is better at
  it than you are.
or
  You wait. Somewhere a shutter knocks, twice, and thinks better of it.
or
  You wait.
end override
```

```text
> wait
You wait. The Hall has had thirty years of practice and is better at it than you are.

> wait
You wait. Somewhere a shutter knocks, twice, and thinks better of it.

> wait
You wait.
```

Waiting is a good message to spend this on. A player in a game with a clock
will wait often, and "Time passes..." thirty times is thirty reminders that
they are playing a program.

## Several at once

When you are replacing a number of messages with one plain text each, a
single block holds them all.

```chord
override messages en-US
  taking-taken:
    You take it.
  looking-room-dark:
    It is dark, and the dark here is old and has no interest in you.
```

This is the list form, the counterpart of `define phrases`. It names its
language, and each entry is an alias, a colon and one paragraph. An entry
here cannot have variants. A message that needs them gets a block of its
own.

```text
> take lamp
You take it.
```

## The markers in a template

Many templates have markers in them.

```text
{"id":"if.action.lighting.lit","alias":"lighting-lit","template":"{You} {light} {the target}."}
{"id":"if.action.taking.taken_from","alias":"taking-taken-from","template":"{You} {take} {the item} from {the container}."}
```

`{You}` is the player, capitalised because it opens the sentence. `{light}`
and `{take}` are verbs, written so that they will agree with whoever is
acting. `{the target}` and `{the item}` are the things in the command, by
the names the action gives them, and they are the same kind of marker as
`{the thing}` in chapter 20.

Your override may use the markers its template uses.

```chord
override message taking-taken-from
  {You} {take} {the item} out of {the container}.
end override
```

Use them whenever the message is about a thing. An override that says "You
take the key out of the press" in so many words will say it of the lamp as
well. And keep to the markers the template shows. Each message is given the
values it needs and no others, so a marker borrowed from a different message
has nothing to fill it.

## How much to override

A new author either leaves every standard message alone or sets out to
replace all 885. Neither is right.

Replace the messages your players will see most: taking, dropping, waiting,
the two darkness messages, the refusal for a direction with no exit. Replace
any message whose tone is wrong for your story, as the grue was. Then stop,
play the game through, and replace what still jars. A story usually settles
at a few dozen overrides, and the rest of the list goes unread because the
player never does the thing that prints it.

Before you override a message to change what one thing says, ask whether
that thing should say it. The kettle's refusal is a clause on the kettle,
and `taking-taken` was left alone for it. An override changes a sentence
everywhere. A clause changes it for one thing.

## Phrasebooks

Now the opposite problem. Two of the story's own refusals should change once
the Hall begins to wake. While it sleeps, the grille "does not so much as
rattle". Once it is waking, the iron should feel alive. The same goes for
Hobb and his kettle.

You could put a `when` suffix on every `refuse`, except that `refuse` does
not take one. You could split each key in two and choose between them in
every clause that uses them. A **phrasebook** does it without touching a
clause.

A phrasebook is a named set of phrases with one condition on the whole set.

```chord
define phrasebook hall-waking while the story is not asleep
  kettle-is-hobbs:
    "Still mine," says Hobb, with his eye on the ceiling.
  grille-fixed:
    It hums under your hand, very faintly, like a rail with a train a
    long way off. It does not move.
end phrasebook

define phrasebook hall-asleep
  kettle-is-hobbs:
    Hobb does not look round. "That's mine," he says.
  grille-fixed:
    It does not so much as rattle.
end phrasebook
```

The two books hold the same keys. When a clause asks for `grille-fixed`, the
story looks through the phrasebooks in the order they appear in the file and
takes the entry from the first book whose condition holds. A book with no
`while` always holds, so it is the book of last resort.

```text
> push grille
It does not so much as rattle.
```

After the kindle page has been read:

```text
> push grille
It hums under your hand, very faintly, like a rail with a train a long way off. It does not move.

The tower bell strikes once, and the sound goes through the stones under your feet.
```

The grille's clause still says `refuse grille-fixed`, as it has since
chapter 14.

Three rules keep phrasebooks working.

**Order decides.** Put the conditional books first and the book with no
condition last. If `hall-asleep` stood first it would always be chosen,
since it always holds, and the waking book would never be reached.

**A key lives in the books or outside them.** A key declared by `define
phrases` or `define phrase` always wins over a phrasebook. When you move a
key into phrasebooks, take its entry out of the `define phrases` block.

**Books are for your keys.** An entry in a phrasebook does not change a
standard message. Those are changed by `override message`, and an override
has no condition.

An entry may have variants and a strategy, written as in the list form with
the strategy after the key: `kettle-is-hobbs, cycling:` and then the
variants with `or` between them. What it may not have is a `while` of its
own. The condition belongs to the book.

## When to reach for a phrasebook

A phrasebook is the right tool when a mood shifts and several pieces of text
should shift with it: before and after the storm, sober and drunk, the Hall
asleep and the Hall awake. One line turns the whole set over.

It is the wrong tool for a single thing in a single state, which is a
`detail` phrase or a `select on`. And it is easy to overuse. Each book you
add is another place a reader has to look to find out what a key says. Two
or three books is a design. Ten is a puzzle.

## Phrases in a file of their own

A story's text can outgrow one file. Phrasebooks may be kept in a second
file and brought in with one line.

```chord
import "books"
```

The name in quotes is a file beside the story, `books.chord`. The extension
is left off. That file holds `define phrasebook` blocks and comments and
nothing else, and it is not a story by itself: it has no header and cannot
be built alone. Its books take their place in the order at the point where
the `import` line stands.

A project has one `.story` file. Everything else it imports is a `.chord`
file, and you will meet a second use for one in chapter 25.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-22` over your own
file. It is the story with this chapter's changes made. To make the changes
by hand instead, work from this list and take the rest from that file: add
the override for `going-too-dark`, the override for `waiting-time-passes`,
the `override messages` block and the two phrasebooks, and remove
`kettle-is-hobbs` and `grille-fixed` from the `define phrases` block.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Go down into the Undercroft without the lamp, and look.

```text
> look
It is dark, and the dark here is old and has no interest in you.
```

::: under-the-hood
**Under the Hood: ids and aliases** · `if.action.going.too_dark`

Each line of `sharpee messages` has an `id` beside the alias. The id is the
platform's own name for the message, and it shows how the platform is
arranged: `if.action`, then the action, then the message. The alias is the
same name made safe for Chord, where a key may not contain a dot. In the
compiled IR your overrides are stored under `messageOverrides` by alias, and
your phrasebooks under `phrasebooks`, each with its condition and its
entries.
:::

::: from-another-system
**From another system: library messages**

Inform 10 keeps its standard replies as lettered "responses" attached to
rules, and you change one with a sentence such as: The can't take yourself
rule response (A) is "...". TADS 3 keeps them in message objects,
`playerActionMessages` and its relatives, which you modify. Chord's aliases
are the same idea with names in place of rule letters. Neither system has a
construct quite like the phrasebook. In both you would test a condition
inside the message itself.
:::

## What you have so far

Lanternhall speaks with one voice. Its darkness is its own, waiting has
three things to say, and the Hall sounds different once it has begun to
wake. Every command a player can type is still one the platform supplied,
though, and this is a story about four words that are not in any standard
list. The next chapter adds verbs.
