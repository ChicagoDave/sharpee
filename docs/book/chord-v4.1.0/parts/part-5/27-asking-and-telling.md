# Asking and telling

The oldest way to talk to a character in interactive fiction is to ask
about a subject: `ask hobb about the bell`. It has lasted because it is
honest about what the game can do. The player names a subject, the
character has something to say about it or has not, and nobody has to
pretend the program understands English.

Chord's form of it is a table. Each person has one, and each row of the
table is a subject and what follows from raising it. This chapter writes
the tables for Hobb and for Tamsin Vey, gives a book a table of its own,
and then adds the two things that make a table sound like a person: a
greeting and a manner.

## A table of topics

```chord
define topics for Hobb
  about "dimming":
    phrase hobb-on-dimming
  about "lantern", "great lantern", "light":
    phrase hobb-on-lantern
  about "tamsin", "tamsin vey", "vey", "salvager":
    phrase hobb-on-tamsin
  about "gnusto":
    phrase hobb-on-gnusto
end topics
```

The block is a top-level declaration, like `define action`. It names the
person it belongs to, and a person may have only one. Each row begins
`about`, gives its subject, and ends with a colon. The body beneath is a
list of statements, and a row with one statement may carry it on the same
line.

A quoted subject is matched against what the player typed after `about`.
The match is of the whole subject and is never a guess: "lantern" answers
`ask hobb about lantern` and does not answer `ask hobb about lanterns`.
Give a row every spelling a player might reasonably use, separated by
commas.

```text
> ask hobb about the dimming
He looks at the blue flame on the sill before he answers.

"Went out like a pipe," says Hobb. "No bang. The Master stood in the court with his hand up for an hour and nothing came to it."

> ask hobb about tamsin
He takes his time, of which he has had a great deal.

"Vey? Takes the brass and leaves the hinges. I let her. Brass doesn't keep the rain out." He considers. "Her word's good. It's all of her that is."
```

The sentence above each answer is one of three that Hobb's manner takes in
turn, which a later section of this chapter explains. Which of the three
you see depends on how many answers he has given in your game, so in this
chapter and the three after it, that sentence in your play will often be
a different one of the three from the one the page shows.

Each answer has a sentence in front of it that is not in the phrase. That
is Hobb's manner, and this chapter comes to it below.

The player's article is dropped before the match, so "dimming" answers
both `about dimming` and `about the dimming`. For the same reason you write
a subject once, without its article. Writing it both ways is an error.

```text
probe.story:23:9 error [analysis.duplicate-topic] "rain" is already declared in this table (line 23) — aliases included, a topic answers in one place.
```

`tell hobb about gnusto` reaches the same table as `ask hobb about gnusto`.
A subject has one row, and the row answers either verb.

### A thing as a subject

A row may name a thing in the story in place of a quoted word.

```chord
about the kettle:
  phrase hobb-on-kettle
```

```text
> ask hobb about the kettle
He turns the kettle a quarter round on its hook, to no purpose.

"Mine," says Hobb.
```

A row of this kind answers when the player's words name that thing, by any
of its names, and the thing is there to be named. The kettle is in the
Lodge with Hobb, so the row works. It is the right form for something the
player can point at.

It is the wrong form for a subject that is somewhere else. Tamsin Vey is in
the Refectory, and a row written `about Tamsin Vey` in Hobb's table would
not answer a player standing in the Lodge. That is why Hobb's row about her
is quoted, with her names spelled out. People are asked about in their
absence more often than not, so quote them.

A row cannot be both. If a table has a row for the thing, a quoted row
spelling the thing's name is an error.

```text
probe.story:31:9 error [analysis.topic-entity-collision] "bucket" collides with `bucket` — that entity is already an entity-tier row of this table, and the quoted spelling would shadow its quiet entity resolution. Remove one.
```

### What a row can do

A row's body is statements, and they are the statements of chapter 15. A
row can refuse, change a state, award a score, or have its owner act.

```chord
about "bell", "tolling", "noise":
  refuse when the tower bell is unrung: hobb-what-bell
  phrase hobb-on-bell
  Hobb gives the hush page to Ansel when Hobb has the hush page
```

This row is how the third working now reaches the player. Until this
chapter the hush page lay on a shelf in the stacks. It has moved into
Hobb's keeping.

```chord
create Hobb
  a person, proper
  pronouns he
  in the Lodge
  carries the hush page
  mood calm
```

Ask him before the bell has rung, and the row refuses.

```text
> ask hobb about the bell
"Bell hasn't rung in thirty years," says Hobb. "Ask me again when it does."
```

Ask him when the Hall is ringing with it, and he answers, and then acts.

```text
> ask hobb about the bell
He takes one hand off one ear to hear you, and puts it back.

"It'll go on till it's told," Hobb shouts. "There's a word for the telling. I kept it by, in a newspaper, in case."

Hobb gives the hush page to Ansel.

The bell tolls again, and the rooks go up off the roof.
```

The last line of the row is the acting statement of chapter 26, with a
`when` suffix so that he hands the page over once. Ask a second time and
he says his piece again and has nothing to give.

### A subject nobody has

A subject with no row gets the platform's stock answer.

```text
> ask hobb about the weather
Hobb says, "I don't know anything about that."
```

That line is a standard message, and its alias is `asking-unknown-topic`.
Chapter 22 showed how to replace one. The Relighting adds it to the
`override messages` block it already has.

```chord
override messages en-US
  asking-unknown-topic:
    {capitalize the target} gives that some thought, and gives it back.
```

```text
> ask hobb about the weather
Hobb gives that some thought, and gives it back.
```

The override serves every person in the story. A table has no `otherwise`
row of its own.

`ask hobb for the kettle` is a different action from asking about a
subject. It is a request for a thing, and with nothing written for it the
platform answers "Hobb doesn't seem inclined to hand over the kettle."

## Looking things up

A topic table may also belong to a thing that is `readable`. The player
does not ask a book. The player consults it.

```chord
define topics for the grimoire
  about "gnusto":
    phrase grimoire-on-gnusto
  about "spark", "sparking", "flame":
    phrase grimoire-on-spark
end topics
```

```text
> consult grimoire about gnusto
You turn to the margin again. The note is all there is: came over the water as a working, meaning lost. Whoever wrote it underlined "lost" twice.

> look up cheese in grimoire
You find nothing about that in the grimoire.
```

The standard grammar has three ways of saying it: `consult the grimoire
about gnusto`, `look up gnusto in the grimoire`, and `read about gnusto in
the grimoire`. The table is written exactly as a person's is. A directory,
a ledger, a dictionary and an index are all this one construct.

## Greetings

A question that has a row is answered at once. Something has to happen
when the player opens a conversation with no such question: `talk to
hobb`, or a first question he has no row for. That is a greeting.

```chord
define greetings for Hobb
  first time:
    phrase hobb-greets
  on return:
    phrase hobb-greets-again
end greetings
```

```text
> talk to hobb
He turns the kettle a quarter round on its hook, to no purpose.

"It's you," says Hobb. He does not say which you.
```

The `first time` row is used once. After the player has said `goodbye`, or
has walked away and come back, the next opening uses the `on return` row.

```text
> goodbye
You say goodbye to Hobb.

> talk to hobb
He looks at the blue flame on the sill before he answers.

"Still here," says Hobb, of one of you.
```

`on return` may be narrowed by how long the player was gone: `on return,
again so soon`, `on return, after a while`, and `on return, after days`. A
plain `on return` covers whichever of those you have not written.

A person with no greetings block has nothing to say to `talk to`, and the
platform answers "Tamsin Vey doesn't respond." Tamsin has a table and no
greeting, and that suits her for now.

### A person who is being talked to stays

While a conversation is open, the person in it does not go on with a goal.
Tamsin Vey, asked about her brass in the Refectory, answers, and does not
turn to her heap of door furniture as she did in the last chapter. She
takes her rounds up again when the player has left her.

### The line a greeting needs

Greetings, and the manner below, belong to a fuller model of a person than
a topic table needs. A person who has either block must also have at least
one line of that model in their own block. Chapter 29 is about those
lines. Until then, one is enough, and the plainest is a mood.

```chord
mood calm
```

Leave it out and the story compiles, and then fails when it is loaded.

```text
Error loading story: `Nell` declares conversation blocks but no character model — scenes need a modeled owner. (line 16)
```

A topic table alone does not need the line. Tamsin already has the model,
because a goal is part of it.

## Manner

A character who answers every question in one flat paragraph is a
reference book. People do something before they speak.

```chord
define manner for Hobb
  when the tower bell is not tolling:
    beat "He turns the kettle a quarter round on its hook, to no purpose."
    beat "He looks at the blue flame on the sill before he answers."
    beat "He takes his time, of which he has had a great deal."
  when the tower bell is tolling:
    beat "He takes one hand off one ear to hear you, and puts it back."
end manner
```

A manner is a set of rows, each a condition and one or more beats. A beat
is a quoted sentence. When the person greets the player or answers from
their table, the platform takes the next beat from a row whose condition
holds and prints it as a paragraph of its own, ahead of the line.

The beats of a row are used in turn, so Hobb's three come round one after
another and no answer has the beat of the one before it. You have already
seen all three in the transcripts above. A row with
one beat prints that beat every time, which is right for a man with his
hands over his ears.

A beat is not printed before a refusal or before the stock answer for an
unknown subject. Those are not the person speaking in their own voice.

The value of the block is that it is separate from the answers. Hobb has
five rows in his table and may have fifteen by the end of the book. None
of their phrases needs to mention the kettle.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-27` over your own
file. It is the story with this chapter's changes made, and it holds the
topic tables, the greetings and the phrases that the chapter did not print in
full. To make the changes by hand instead, work from this list and take the
rest from that file. Add `carries the hush page` and `mood calm` to Hobb, and
take the hush page's `in the Stack 3` line away. Add the greetings, the
manner and the three topic tables near the people, the one line to `override
messages`, and the new phrases to the phrases block. The story's day is also
longer from this chapter on, since conversation takes turns: the sequence's
first step is `at turn 70` and its second `40 turns later`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Ask Hobb about everything in his table, and about something that is not.
Then play on until the bell is tolling, come back to the Lodge, and ask him
about the bell.

```text
> read hush page
The third working is hardly a word at all. It is the breath you take before one.

The bell tolls. You have stopped counting.
```

::: under-the-hood
**Under the Hood: where the table goes** · Story IR `topics`, `greetings`, `manner`, `character`

In the compiled IR a topic table is the `topics` list of the entity that
owns it, whether that is a person or a book. Each row has a `filter` and a
`body`. A quoted row's filter is of kind `text`, with a `primary` spelling
and its `aliases`; the body is the same list of statements a clause has.
A person's `greetings` and `manner` are two more keys on the entity, and
the `mood calm` line appears under `character`, the key that also holds
the goals of chapter 26. The standard actions `asking`, `telling` and
`consulting` each take the player's words after `about` as a topic, and
all three look the topic up in the owner's one table.
:::

::: from-another-system
**From another system: asking about**

Inform 10 has the actions of asking someone about something and telling
someone about something, and an author answers them with rules such as
"Instead of asking Hobb about 'bell'", or with a table that has a topic
column. TADS 3 gives each character a set of topic objects: `AskTopic`,
`TellTopic` and `AskTellTopic` for subjects, `DefaultAskTellTopic` for a
subject that has no response, `HelloTopic` and `ByeTopic` for greetings
and partings, and `ConsultTopic` for a book. A Chord topic table is close
to the TADS arrangement, written as rows of one block where TADS has an
object for each.
:::

## What you have so far

Hobb can be asked about the Dimming, the Lantern, Tamsin Vey, his kettle,
the word gnusto and the bell, and when the bell is tolling he gives up the
page that quiets it. Tamsin answers three questions. The grimoire can be
consulted. The game can still be won, and the walk to the win now goes by
way of the Lodge.

What a table cannot do is hold a thread. Every question stands alone, and
Hobb has no way to ask the player anything. A bargain needs both, and the
unbind page is waiting for one.
