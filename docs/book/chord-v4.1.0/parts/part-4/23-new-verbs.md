# New verbs

The craft of Lanternhall calls its spells workings. A working is a single
spoken word: spark, mend, hush, unbind. Ansel learns one by reading its
page, and then says it to a thing. None of those four words is a command the
platform knows.

This chapter adds them. A new verb in Chord is a new action, and you declare
one with `define action`. By the end of the chapter all four workings can be
typed, each asks for its page, and each then finds that nothing answers it.
That last part is not a failure of the chapter. It is the most important
idea in it.

## Declaring an action

```chord
define action mending
  grammar
    mend the target
  the target must be reachable
  the mend page must be learned: no-such-word
  otherwise refuse nothing-to-mend
```

The head line names the action. An action's name is a gerund, the same
"-ing" word that will later appear in clause heads as `on the player
mending`. The block has no `end` line. It runs until the indentation stops.

The four lines beneath are four different kinds of line, and each gets a
section.

## The grammar

The `grammar` block lists what the player may type, one pattern to a line.
You have read patterns before, in the passage of chapter 12. They have four
devices.

| Written | Means |
| --- | --- |
| `mend` | a word the player types |
| `the target` | a **slot**: a place where the player names a thing |
| `mend or fix` | either word |
| `[the]` | a word that may be left out |

A slot is `the` followed by a name you choose. `target` is the usual name
for the one thing a verb is done to. The name matters only inside the
action, where the other lines use it to talk about whatever the player
named.

An action may have several patterns, and a pattern may have no slot at all.

```chord
define action sparking
  grammar
    spark the target
    spark
```

Now `spark lamp` and plain `spark` are both understood. The second needs a
line to say what happens when the thing is missing.

```chord
  refuse without target: working-wants-a-thing
```

```text
> spark
A working is said to something. You say it to the air, and the air has heard it all before.
```

One limit applies to every pattern you write. It may not be a command the
standard grammar already has.

```text
probe.story:37:1 error [analysis.repeats-standard-grammar] `poke :target` is already the standard `touching` grammar, so this action would take that command from it. To give a thing its own response, write `on the player touching` in that thing's block or its trait's. To add new wording, use `extend action touching`. To replace the standard action, first remove its shape with `remove from action touching`.
```

The message gives the three ways out, and chapter 25 is about the second and
third. Before you define an action, look in Appendix C for the verb. The
standard grammar is larger than most authors expect.

## What must be true of the thing named

```chord
  the target must be reachable
```

A line of this form, with no colon and no phrase, says how close the named
thing has to be. There are three words for it.

| Word | The thing must be |
| --- | --- |
| `visible` | in view |
| `reachable` | near enough to touch |
| `held` | in the player's hands |

When the thing is not there, the platform says so in its own words. Hushing
uses `visible`, because a bell at the top of a tower can be spoken to and
cannot be touched.

```text
> hush bell
You can't see any bell here.
```

That was typed in the Library. In the Bell Stair, the bell is in view.

## What must be true of the player

```chord
  the mend page must be learned: no-such-word
```

This is the `must` line of chapter 15, and it means what it meant there. It
is on the action, and not on any thing, because it concerns the person
speaking. Ansel cannot say a word that has not been read, whatever it is
said to.

```text
> mend lamp
The shape of it is there, as a name is on the tip of the tongue. The word is not.
```

An action may also carry `refuse when` lines, and statements of its own, as
a later section shows. All of its refusals and requirements stand above its
first statement.

## What an action may not ask

Here is the rule that shapes everything else. An action never asks which
thing was named.

You cannot write, in the mending action, that if the target is the lens then
the crack closes. Chord has no way to say it. If you try, with a line such
as `refuse when the target is the kettle`, the compiler refuses it by name,
as `analysis.slot-identity-test`.

The reason is the habit this book has pressed since chapter 14. What happens
to the lens belongs in the lens's block. If the mending action listed the
things it could mend, then adding a mendable thing to the story would mean
editing the action, and the facts about the lens would be in two places.

So an action knows three things: what the player may type, what must be true
of the player, and what to say when nothing answers. Everything else belongs
to the thing.

## When nothing answers

```chord
  otherwise refuse nothing-to-mend
```

When the player names a thing, the action asks that thing whether it has an
answer. If it has none, this line speaks.

At the end of this chapter no thing in Lanternhall has an answer to any of
the four workings. So once the page has been read, every one of them misses.

```text
> spark lamp
There is nothing in that for a flame to stand on.

Somewhere above you, old timber takes a weight it had forgotten.

> spark grimoire
There is nothing in that for a flame to stand on.

A slow draught moves through the Hall, one way and then the other.
```

The first of those is plainly wrong, and it is wrong in an instructive way.
The action is complete. The lamp has not yet been told that it answers to
sparking. Telling it is the whole of the next chapter.

A miss can name the thing the player typed. The slot's name works as a
marker.

```chord
define phrases en-US
  nothing-to-tune:
    {capitalize the target} is as well tuned as it will ever be.
```

## The four workings

Here are the other three.

```chord
define action sparking
  grammar
    spark the target
    spark
  refuse without target: working-wants-a-thing
  the target must be reachable
  the spark page must be learned: no-such-word
  otherwise refuse nothing-to-spark

define action hushing
  grammar
    hush the target
    hush
  refuse without target: working-wants-a-thing
  the target must be visible
  the hush page must be learned: no-such-word
  otherwise refuse nothing-to-hush

define action unbinding
  grammar
    unbind the target
    unbind
  refuse without target: working-wants-a-thing
  the target must be reachable
  the unbind page must be learned: no-such-word
  otherwise refuse nothing-to-unbind
```

Mending takes the same two extra lines. The four blocks are nearly
identical, and Chord offers no way to write one and stamp out four. That is
a real cost, and the answer for now is that four short blocks are easy to
read and easy to keep in step.

## A verb that only answers

Not every verb is done to a thing. Some are simply said. There is a fifth
word in this country that every child knows and that nobody at Lanternhall
ever managed to cast.

```chord
define action blessing
  grammar
    gnusto
    say gnusto
    gnusto the target
  refuse when the tower bell is tolling: gnusto-drowned
  phrase gnusto-said
```

This action has a body. After its refusals come ordinary statements, and
they run whenever the action succeeds. There is no `otherwise refuse`,
because nothing needs to answer. The action answers for itself.

```text
> gnusto
"Gnusto," you say, as everybody does, and the morning is exactly as bright as it was. It is a word about sunlight. The scholars here always said it had been a working once, somewhere over the water, and could never say what it did.
```

Use a body for a verb that is about the player or the story: praying,
singing, counting the money. An action's body may do anything a clause can
do. It may change the story's state, raise a counter or award a score, and
an action may declare a `score` line of its own. It still may not ask what
was named.

The third pattern, `gnusto the target`, lets a player try the word on a
thing. Nothing answers, and the body runs all the same.

## Verbs with a subject

Some verbs take a subject and not a thing: remember the fire, think about
home. The subject may be something that is not in the room, or not a thing
at all. A slot can be declared a **topic**, and then the action answers by
subject, with `about` lines.

```chord
define action remembering
  grammar
    remember the subject
    recall the subject
  the subject is a topic
  about "dimming":
    phrase remember-dimming
  about "gnusto":
    phrase remember-gnusto
  about Hobb:
    phrase remember-hobb
  otherwise refuse remember-nothing
```

An `about` line names a subject and holds the statements to run for it. A
subject in quotes is matched against the words the player typed. A subject
without quotes is a thing or a person in the story, matched by any of its
names.

```text
> remember dimming
You remember it as a night when every lamp in the Hall went out at once, and a morning when nobody could make one light.

> remember the dimming
You remember it as a night when every lamp in the Hall went out at once, and a morning when nobody could make one light.

> recall hobb
He confiscated a kettle from you in your second week. You have a feeling it is the same kettle.

> remember breakfast
Nothing comes. Thirty years is a long time.
```

The article is dropped before matching, so `"dimming"` answers both of the
first two commands. Write each subject once, without "the". A quoted line
may list several spellings with commas between them, as in `about "dimming",
"night"`.

This does not break the rule about asking what was named. The rule is about
things in the world, which have blocks of their own to answer in. A subject
has no block. The `about` lines are where its answer lives.

You will meet `about` lines again in chapter 27, where they are what a
person says when asked about something. An action with a topic is the same
machinery pointed at the player's own head.

## Other kinds of slot

Two more lines describe a slot.

`the words takes the rest of the line` makes a slot swallow everything the
player types after the verb. It is for writing, saying and naming.

```chord
define action scrawling
  grammar
    scrawl the words
  the words takes the rest of the line
  phrase scrawled
```

The text is available to a phrase as `{verbatim:words}`.

```text
> scrawl hello there world
[scrawled: hello there world]
```

`the tool is an instrument` marks a second slot as the thing the action is
done with, as in a pattern `tune the target with the tool`. The standard
grammar uses it for keys, weapons and tools.

## A verb that comes and goes

An action's head may carry a condition. The verb then exists only while the
condition holds.

```chord
define action shouting while the tower bell is tolling
  grammar
    shout
  phrase shout-lost
```

Before the bell begins, the story does not know the word.

```text
> shout
I don't understand that.
```

Once it is tolling:

```text
> shout
You shout. The bell tolls through the middle of it.
```

This is stronger than a refusal. A refused verb tells the player that the
command exists. A verb that is not understood tells them nothing. Use it
when the existence of the command would itself give something away, and
otherwise prefer a `refuse when` with a sentence that helps. The Relighting
does not use this action. It is here as an example.

## Why a thing cannot simply answer

You may already have tried the obvious thing: an `on the player mending`
clause in the lens's block, like the `on the player reading` clause on each
page.

```text
probe.story:19:17 error [analysis.story-action-on-clause] `on the player thumping` in `drum`'s block would never run: `thumping` is this story's own action, and it runs a thing's `after` clauses and the `on` clauses of its traits, never a thing's own `on` clause. To react once the action succeeds, write `after the player thumping`. To refuse or answer in the action's place, move the clause into a trait and give `drum` that trait.
```

For a standard action, a thing's own `on` clause is how it answers. For an
action you define, the answer comes from a **trait**. The message says what
to do, and the next chapter does it.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-23` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file: add the four
working actions, the `blessing` action and the `remembering` action near the
top of the file, and add their eleven phrases.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Try each working before and after its page. The lamp still lights with the
standard `light lamp`, as it has since chapter 15. Spark is a word now, and
has nothing to work on.

::: under-the-hood
**Under the Hood: an action is data** · Story IR `actions`

In the compiled IR the sparking action is an entry of plain data. It has a
`name`, and then its `patterns`, each a run of words and slots; its
`constraints`, which are the `must be reachable` lines; its `musts`, each a
condition and a phrase key; its `refusals`, which are the `refuse` lines;
`otherwise`, which holds the phrase key of the `otherwise refuse` line;
`scores`, which is empty for this action; and its `body`. A last field,
`span`, records where in the file the action was written. There is no code
in it. The platform has one piece of
machinery that runs any action described this way, and that machinery is
what looks for an answer on the thing and falls back to your `otherwise
refuse` line.
:::

::: from-another-system
**From another system: new actions**

In Inform 10 you write "Mending is an action applying to one touchable
thing" and "Understand 'mend [something]' as mending", and then rules say
what it does, including rules that name particular things. In TADS 3 you
define the action with `DefineTAction` and a `VerbRule`, and each object
answers in its `dobjFor(Mend)` block. Chord follows the TADS division more
strictly than TADS does. The action holds grammar and what is true of the
player, the thing holds the response, and the compiler will not let either
do the other's work.
:::

## What you have so far

The story understands four workings, one old word about sunlight, and
Ansel's memory. It knows who may say each working, and how near the thing
must be. It does not yet know what any working does. That knowledge belongs
to the lamp, the lens, the bell and the grille, and the next chapter gives
it to them.
