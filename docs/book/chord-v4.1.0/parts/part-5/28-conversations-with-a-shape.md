# Conversations with a shape

A topic table answers questions one at a time, and each answer is complete
in itself. Most of what characters say in a game can be written that way.
Some of it cannot. A bargain has an order: what is for sale, then the
price, then yes or no. The person selling asks the last question, and
waits.

This chapter adds three blocks that give a conversation an order. A
**conversation** is a subject that a person takes forward a step at a time.
An **exchange** is a question the person puts to the player, with the
answers it accepts. An **initiative** block lets a person speak without
being asked. The chapter then returns to the topic table for three small
things a row can do once conversations have a memory.

The Relighting uses all of it for one purpose. Tamsin Vey has the unbind
page, and she will part with it for a promise.

```chord
create Tamsin Vey
  aka salvager, woman
  a person, proper, passive with announces-movement true
  pronouns she
  in the Refectory
  carries the unbind page
  states: free, bound
```

The page is no longer under the refectory candles. Her two states record
whether the bargain has been struck.

## A thread

```chord
define conversation the-bargain for Tamsin Vey
  about "page", "grille", "stair", "ward"
  beat:
    phrase tamsin-has-it
  beat:
    phrase tamsin-names-price
    then asks the-price
  on parting:
    phrase tamsin-parting
  on resuming:
    phrase tamsin-resuming
  conclusion:
    phrase tamsin-settled
end conversation
```

A conversation has a name and an owner. The Chord word for what it
describes is a **thread**: one subject, carried forward in order.

The `about` line gives the subjects that belong to the thread, written as
a topic row's are. The player does not need to know the thread exists.
They ask about the page, or the grille, or the stair, and each such
question moves the thread on by one `beat`.

```text
> ask tamsin about the page
"I have a page that came out of a wall with a bracket," says Tamsin Vey. "It was blank on Tuesday. It is not blank now. I am told that is your sort of thing."
```

A beat's body is statements, as a topic row's is. The beats are taken in
the order written. A beat may be held back with a condition, written
`beat, when <condition>:`, and the thread then waits at that beat until the
condition holds.

The thread is Tamsin's as much as the player's. If the player stays with
her and lets a turn pass without a word, she takes the next beat herself.
After the reply above, a `wait` is answered with her price, exactly as a
second question about the page would be. A player who wanders off the
subject and comes back may find that a beat was spent while they were
quiet.

### Leaving a thread and coming back

The topic table is still there while a thread is under way. If the player
asks about something else, the table answers, and the thread's `on
parting` row is added.

```text
> ask tamsin about the porter
"He pretends not to see me and I pretend to be quiet. It has worked for eleven years."

"The page will keep," says Tamsin Vey. "So will I."
```

When the player comes back to one of the thread's subjects, the `on
resuming` row answers. It is the person picking the subject up, and it does
not use a beat.

```text
> ask tamsin about the stair
"The page. Yes. I thought we would come back to it."

> ask tamsin about the page
"Here is my price. Lantern lit or Lantern dark, the brass in the closed wings stays mine to take. Your word on it. Yes or no?"
```

Both rows are optional. A thread without them is simply left and taken up
again without comment.

## A question

The second beat ends with `then asks the-price`. That statement opens an
exchange.

```chord
define exchange the-price for Tamsin Vey
  answer "yes", "agreed", "done", "you have my word":
    phrase tamsin-shakes
    change Tamsin Vey to bound
    Tamsin Vey gives the unbind page to Ansel
  answer "no", "never":
    phrase tamsin-shrugs
end exchange
```

An exchange holds answers only. The question itself is whatever the person
said in the row that opened it. That keeps a question and the place it is
asked together, and lets two rows open the same exchange with different
words.

While an exchange is open the player may answer with the bare word.

```text
> yes
She spits on her palm, thinks better of it, and holds out the page instead. "Done is done. I have never gone back on one yet."

Tamsin Vey gives the unbind page to Ansel.

"That is the page dealt with," says Tamsin Vey, "one way or the other."
```

Each `answer` row lists the replies it accepts, and the matching rule is
the topic table's: the whole reply, never a guess. `say yes` and `answer
yes` do the same as the bare word. A reply that no row accepts leaves the
question standing.

```text
> say maybe
Tamsin Vey waits for an answer to the question.
```

The player is not trapped by an open question. They may ask about another
subject and the table answers, or walk away. The question is still open
when they turn back to it.

`then asks` may be written `then invites` when the person is making an
offer and not asking a question. The two open an exchange in the same way.
Either is allowed in a thread's rows and in a topic row, and it opens an
exchange belonging to the same person.

## The conclusion

A thread ends with its `conclusion` row. Every thread has exactly one, and
it runs once, after the last beat. Where the last beat opens an exchange,
the conclusion runs when the exchange has been answered. You saw it close
the transcript above.

Tamsin's conclusion runs whichever way the player answers. If the answer
was no, the thread is over all the same.

```text
> no
"Then I have a page and you have a grille." She does not sound offended. "Ask me the price again when the stair matters more."

"That is the page dealt with," says Tamsin Vey, "one way or the other."
```

A concluded thread no longer answers. Ask about the page now and Tamsin
has nothing to add.

```text
> ask tamsin about the page
Tamsin Vey gives that some thought, and gives it back.
```

That is the right behaviour for a thread, and it would be a dead end for
the player, who has refused once and may think better of it at the foot of
a sealed stair. So the bargain has a second way in.

## A way back

A thread's name is something a condition can test.

```chord
define topics for Tamsin Vey
  about "price", "bargain":
    refuse when Tamsin Vey is bound: tamsin-already-dealt
    refuse when the-bargain is not concluded: tamsin-no-price-yet
    phrase tamsin-names-price
    then asks the-price
```

`the-bargain is concluded` is true once the thread's conclusion has run.
This row is in the ordinary topic table. Before the thread has run its
course it refuses, because Tamsin has not yet said there is anything to
buy. Afterwards it states the price again and opens the same exchange.

```text
> ask tamsin about the price
"A price for what? You haven't said what you want."

Tamsin Vey turns over a heap of door furniture on the end of a table, and puts two hinges in her apron.
```

A refusal does not begin a conversation, so nothing holds Tamsin, and
chapter 26's `rounds` takes its next step on the same turn. On the turn
after that she walks out, as she did before this chapter.

```text
> ask tamsin about the price
"Here is my price. Lantern lit or Lantern dark, the brass in the closed wings stays mine to take. Your word on it. Yes or no?"

> agreed
She spits on her palm, thinks better of it, and holds out the page instead. "Done is done. I have never gone back on one yet."

Tamsin Vey gives the unbind page to Ansel.
```

And when the bargain is struck, the same row closes the matter.

```text
> ask tamsin about the price
"We have dealt, you and I. I don't sell a thing twice."
```

This is the shape to copy for any conversation that the player can get
wrong: a thread that tells it in order once, and a plain topic row, gated
on the thread being concluded, that lets the player return to its
question.

## What a table can remember

Three things in a topic row depend on what has been said before.

### How many times

A row may answer differently the second time.

```chord
about "brass", "salvage", "hinges":
  phrase tamsin-on-brass when asked once
  phrase tamsin-on-brass-again when asked again
  phrase tamsin-on-brass-enough when asked many times
```

```text
> ask tamsin about brass
"Door furniture, mostly. Lamp brackets. Nobody was using them."

> ask tamsin about brass
"Brass. It is yellow and it sells. I said."
```

`asked once`, `asked again` and `asked many times` are conditions that
read how often this player has raised this row with this person. The third
holds from the third asking onward.

A row whose phrases carry conditions must not leave two of them true at
once. The compiler checks, and it will not accept a pair it cannot prove
apart.

### What has been discussed

A subject's name, written bare, can be tested with `was discussed`.

```chord
about "last night", "that night", "master":
  phrase hobb-on-last-night when dimming was discussed
```

Hobb will not speak of the night the Lantern was put out until the player
has asked him about the Dimming. Before that, the row has nothing to say,
and the stock answer is given.

```text
> ask hobb about last night
Hobb gives that some thought, and gives it back.

> ask hobb about the dimming
He looks at the blue flame on the sill before he answers.

"Went out like a pipe," says Hobb. "No bang. The Master stood in the court with his hand up for an hour and nothing came to it."

> ask hobb about last night
He takes his time, of which he has had a great deal.

Hobb is quiet for some time. "Somebody had to put the Lantern out," he says. "It was guttering. The Master said a dead light was worse than none. He didn't say who." He looks at his hands.
```

The subject is named by the first spelling of its row, without quotes. The
test is kept for each pair of people, so what Ansel has discussed with
Hobb is not what Ansel has discussed with Tamsin.

This one condition does a great deal. A table whose rows open one another
in this way has an order that the player discovers by asking, and the
author never has to draw it.

### Sending a subject elsewhere

```chord
about "brackets", "door furniture":
  deflect to "brass"
```

`deflect to` answers this row with another row of the same table. It is
for the subject that is really a different subject, and it keeps you from
writing one answer twice.

## Speaking first

Everything so far waits for the player. An `initiative` block gives a
person lines to say unprompted.

```chord
define initiative for Tamsin Vey
  on silence, when Tamsin Vey is free:
    phrase tamsin-fills-silence
end initiative
```

A row begins with an occasion. `on silence` is the occasion when a
conversation is open and the player has let a turn or two go by without
saying anything. A thread comes first. While the bargain has a beat to
give, a silent turn gets the beat, as the section on threads said. The
silence row speaks in a conversation that has no thread under way, such as
the one a question about brass opens.

```text
> ask tamsin about brass
"Door furniture, mostly. Lamp brackets. Nobody was using them."

> wait
You wait. The Hall has had thirty years of practice and is better at it than you are.

> wait
You wait. Somewhere a shutter knocks, twice, and thinks better of it.

Tamsin Vey sorts hinges into sizes while she waits for you to say something. There are more sizes than you would have thought.
```

An occasion may be narrowed with a comma and a `when`, as this one is.
Once Tamsin is bound she has what she wanted, and she lets a silence be.

Use initiative sparingly. A character who speaks into every pause is
tiring, and a single line that appears when the player hesitates in the
middle of a bargain is worth more than a paragraph of description.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-28` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file: give Tamsin
Vey the `carries` and `states` lines, take the `move the unbind page here`
line out of the candles, and add her greetings, the conversation, the
exchange and the initiative block, and the new rows in both topic tables.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Go to the Refectory and ask Tamsin about the page twice, then answer her.
Play it again and refuse, and find the way back.

The bargain can be struck before the bell has rung, and the page read as
soon as the spark page has been. It does not open the stair early. The
ward still refuses while the bell is unrung or tolling, as it has since
chapter 24.

::: under-the-hood
**Under the Hood: scenes** · Story IR `conversations`, `exchanges`, `initiative`

The platform calls an open conversation between two people a scene. It
opens when the player first addresses the person and closes when the
player says goodbye or leaves. The compiled IR records a person's threads,
exchanges and initiative rows beside the `topics`, `greetings` and
`manner` of the last chapter, and at each turn of a scene the platform
decides which of them answers: an open exchange first, then a live thread,
then the topic table. The standard action behind a bare `yes` is
`answering`, and the platform offers a bare reply to an open exchange
before it tries to read the reply as a command, which is why `yes` works
with no verb.
:::

::: from-another-system
**From another system: conversation nodes**

*Writing with Inform* describes no built-in structure for a conversation
that proceeds in order. It shows tables with topic columns, and a variable
that remembers the current question. TADS 3 has a structure very close to
Chord's: a `ConvNode` is a point in a conversation, and `YesTopic` and
`NoTopic` objects placed in it answer yes and no while the character waits
for a reply. A Chord exchange corresponds to a `ConvNode`, and its `answer`
rows to the topic objects inside one. A TADS 3 character begins a
conversation unprompted through an `InitiateTopic` or an agenda item.
:::

## What you have so far

The fourth page has a price. Tamsin Vey tells the player what she has,
names what she wants for it, asks, and holds the question open until it is
answered. A refusal can be mended. Hobb's table has a row that opens only
after another has been heard.

Both of them now say a good deal, and neither of them yet feels anything.
Tamsin's promise is a state with two values, and Hobb's fondness for a
returning student exists only in the prose. The next two chapters give
people an inside.
