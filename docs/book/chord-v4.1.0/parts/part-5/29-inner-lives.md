# Inner lives

<!-- PENDING (Phase 4, 2026-11-16): not taught here, because it could not be
     shown working on the in-repo CLI (GH #777): reading a platform mood after
     `change mood to` it, personality words and intensities, `thinks` and
     `define fact`, `influence` and `resists`, `cognitive-profile` and `define
     profile`, and the recency words. -->

Hobb and Tamsin Vey can now say a great deal, and what they say depends on
things: whether the bell is tolling, whether a bargain is struck, what has
been asked before. All of that is the state of the world. None of it is the
state of the person.

A person in Chord has an inside as well, and the language calls it the
**character model**. You have already written one line of it, the `mood
calm` that chapter 27 needed. This chapter covers the three parts of the
model whose effects you can see and use in a story: a mood, feelings toward
other people, and things known.

Each works the same way. A line in the person's block says how they begin.
A statement changes it. A condition reads it, and anything that takes a
condition can then depend on it: a topic row, a manner row, a clause, a
goal.

## Mood

```chord
create Hobb
  a person, proper
  pronouns he
  in the Lodge
  carries the hush page
  mood calm
```

The `mood` line gives the mood a person starts in. The platform has
thirteen mood words: `calm`, `content`, `cheerful`, `nervous`, `anxious`,
`panicked`, `angry`, `furious`, `sad`, `grieving`, `suspicious`,
`confused` and `resigned`.

A mood is read with `is`, as a state is.

```chord
define manner for Hobb
  when Hobb is calm:
    beat "He turns the kettle a quarter round on its hook, to no purpose."
    beat "He looks at the blue flame on the sill before he answers."
    beat "He takes his time, of which he has had a great deal."
  when Hobb is rattled:
    beat "He takes one hand off one ear to hear you, and puts it back."
end manner
```

In chapter 27 these two rows asked about the bell. They now ask about
Hobb, which is what a manner should be about. The bell is the reason, and
the reason is written once, somewhere else.

### A mood of your own

`rattled` is not one of the thirteen. A story may define a mood by saying
which platform mood it resembles.

```chord
define mood rattled like nervous, but darker
```

The line names the new mood and the platform mood it is `like`. It may end
with `, but` and one of four words that shift it: `restless`, `stiller`,
`darker` or `brighter`. A defined mood is used wherever a platform mood
is: on a `mood` line, after `change mood to`, and in a condition.

### Changing a mood

```chord
on every turn while the tower bell is tolling
  change mood to rattled
end on
```

`change mood to` has no person in it. It changes the mood of the person
whose block or table the statement stands in. This clause stands in Hobb's
own block, so it is Hobb who is rattled. Written in one of Tamsin's topic
rows it would change Tamsin's mood. Always write it in a person's block or
in one of that person's tables, where it has someone to belong to.

```text
> ask hobb about the bell
He takes one hand off one ear to hear you, and puts it back.

"It'll go on till it's told," Hobb shouts. "There's a word for the telling. I kept it by, in a newspaper, in case."

Hobb gives the hush page to Ansel.
```

A mood does not stay changed. Left alone, a person settles back to the
mood they began in over a few turns. That is why Hobb's clause runs on
every turn the bell tolls: it holds him rattled for as long as there is
something to be rattled by. Hush the bell, and by the time Ansel has
walked back to the Lodge he is calm again and turning his kettle.

This is worth designing around. A mood is the right tool for how someone
is taking the present moment. For a change that should last, use a
feeling, or a state.

## Feelings

A person may feel something toward another person, or toward any thing or
place in the story.

```chord
feels wary of Ansel
```

Hobb's block has that line, and so has Tamsin Vey's, with a `mood
suspicious` above it.

There are eight words, and they run from worst to best: `despises`,
`hates`, `dislikes`, `wary of`, `neutral`, `likes`, `trusts` and `devoted
to`. Two of them end in a preposition. After the other six, write `toward`
before the name: `feels trusts toward Ansel`.

A feeling is read with the same words.

```chord
about "last night", "that night", "master":
  refuse when Hobb feels wary of Ansel: hobb-not-to-strangers
  phrase hobb-on-last-night when dimming was discussed
```

Hobb's best story now has two locks on it. The player must have asked
about the Dimming, as before, and Hobb must not be wary of the person
asking.

```text
> ask hobb about last night
Hobb looks at you for a while, narrowly, as a man looks at small print. "That's not a thing I tell to people I can't see," he says.
```

The refusal is the hint. Hobb has been looking for his spectacles since
the spring, and chapter 24 made them something Ansel can mend.

### Changing a feeling

```chord
on every turn while Hobb wears the spectacles, once
  change feeling toward Ansel to trusts
end on
```

This clause is in Hobb's block too.

`change feeling toward <someone> to <word>` follows the rule of `change
mood to`: the feeling changed is that of the person whose block the
statement stands in. Unlike a mood, a feeling stays where it is put.

```text
> give spectacles to hobb
Hobb hooks them over his ears and looks at you properly for the first time. "Ansel," he says, after a while. "You were always late."

> talk to hobb
He turns the kettle a quarter round on its hook, to no purpose.

"Still here," says Hobb, of one of you.

> ask hobb about last night
He looks at the blue flame on the sill before he answers.

Hobb is quiet for some time. "Somebody had to put the Lantern out," he says. "It was guttering. The Master said a dead light was worse than none. He didn't say who." He looks at his hands.
```

Tamsin's feeling changes in the row that strikes the bargain.

```chord
define exchange the-price for Tamsin Vey
  answer "yes", "agreed", "done", "you have my word":
    phrase tamsin-shakes
    change Tamsin Vey to bound
    change feeling toward Ansel to likes
    Tamsin Vey gives the unbind page to Ansel
```

And one of her topic rows has two answers, chosen by it.

```chord
about "magic", "craft":
  phrase tamsin-on-magic when Tamsin Vey feels wary of Ansel
  phrase tamsin-on-magic-warmer when Tamsin Vey feels likes toward Ansel
```

```text
> ask tamsin about magic
"My mother kept a stall by this gate. The day it went out, so did the custom. Now you tell me it's coming back, and I am to be glad." She is not, particularly.
```

```text
> ask tamsin about magic
"I'll tell you what I never told the old man. The night it went out, my mother's scales would not weigh true, and she laughed. She said it was the first honest day's trade she ever did." Tamsin Vey looks at the page in your hand. "Light your lamp. I would like to see if she was right."
```

The two phrases in that row carry conditions, and chapter 28 said that a
row's conditions must not overlap. Two different feelings toward the same
person never do, and the compiler knows it.

A state would have done this job. Tamsin already has `free` and `bound`,
and the second phrase could have asked whether she is bound. The feeling is
better for two reasons. It says what you mean, so that the row still reads
correctly when a second way of winning her round is added. And it is a
scale and not a switch: a story can move a person from `wary of` to
`neutral` to `likes` in three steps, and write a row for each.

## What a person knows

```chord
knows the-last-night, witnessed, certain
```

A `knows` line in a person's block says that the person holds a piece of knowledge when the story starts. The knowledge is a name of your choosing, a single hyphenated
word, and it stands for the thing known. It does not need to be declared
anywhere else.

Two more words follow it. The first is how the person came by it, and is
required: `witnessed`, `told`, `inferred`, `assumed` or `hallucinated`. The
second is how sure they are: `uncertain`, `suspects`, `believes` or
`certain`.

A condition reads it with `knows`.

```chord
phrase hobb-keeps-it when Hobb knows the-last-night
```

By itself that is a flag, and a state would serve. The value of naming
knowledge is that the names are shared. Two people can know the same thing,
and a row in one person's table can ask what another person knows.

### Telling one another

Knowledge also moves. A `spreads` line says what a person passes on, and
to whom.

```chord
create Nell
  a person, proper
  in the Yard
  mood calm
  knows theft, witnessed, certain
  spreads theft to anyone

  Nell.

create Tom
  a person, proper
  in the Yard
  mood calm
  spreads nothing

  Tom.
```

`spreads` is followed by the things spread, then `to` and an audience:
`anyone`, `trusted` or `allied`. Several things are joined with `and`.
When two people who each have a `spreads` line are in a room together, the
platform has each tell the other what their line allows. Tom's line is
`spreads nothing`. He passes nothing on, and the line is what makes him
someone who can be told.

```text
> wait
Time passes...

You hear: "Nell mentions something to Tom."
```

From that turn `Tom knows theft` is true, and anything gated on it opens.
The player, standing in the Yard, is told only that something was said.
In another room the player would be told nothing, and Tom would know all
the same.

That is rumour, in two lines a person. A fact witnessed in the kitchen can
reach the drawing room by way of whoever walks between them, and what the
people there will say to the player changes as it arrives.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-29` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file. Add the
`define mood` line at the top of the story. Give Hobb his `feels` and `knows`
lines and the two `on every turn` clauses, and change his manner rows to read
his mood. Give Tamsin Vey her `mood` and `feels` lines, add the `change
feeling` line to her exchange, and split her row about magic in two.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Ask Hobb about the Dimming and then about last night. Then play on until
you have mended his spectacles, give them to him, and ask again.

::: under-the-hood
**Under the Hood: the character model** · Story IR `character`

Every line of this chapter is recorded under one key of the person's
entity in the compiled IR, `character`. It holds `mood`, a `feels` list
with one entry for each person or thing felt about, and a `knows` list in
which each entry carries its source and its confidence. The goals of
chapter 26 are in the same place. The platform builds one model for each
person from that key when the story loads, and it is the model's own clock
that brings a mood back to where it began.
:::

::: from-another-system
**From another system: feelings as relations**

Neither manual describes a built-in model of mood or feeling. In Inform
10 the usual tool is a relation: a sentence declares that it "relates"
people to people, another gives it a verb, and after that a sentence with
the verb is a condition like any other. The TADS 3 documentation suggests
a property on the actor, tested where a response should depend on the
character's frame of mind. Chord's `feels` is a relation of the Inform
kind that the language already knows about, with a fixed scale of eight
values where Inform's would be yours to define.
:::

## What you have so far

Hobb is rattled while the bell tolls and calm when it stops, and his
manner follows his mood. He is wary of a stranger and trusts a returned
student, and the difference is a pair of spectacles. Tamsin Vey warms to
someone who has kept a bargain with her, and says so in her own way.
