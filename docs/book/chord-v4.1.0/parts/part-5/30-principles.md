# Principles

<!-- PENDING (Phase 4, 2026-11-16): this chapter teaches what was shown
     working: a confided fact, `never betrays a confidence` and its `except`,
     `answers honestly`, and `temperament`. Not taught, because no observable
     effect was found (GH #777): the other six `never` acts, `protects`,
     `honor … before` and `define honor`, `burdened by`, and `define topic … as`.
     `code` and `define code`, `define temperament` and `temperament … while`
     compile and were not run. -->

In the last chapter Hobb kept one story back from a stranger. The row that
kept it back said so in as many words.

```chord
about "last night", "that night", "master":
  refuse when Hobb feels wary of Ansel: hobb-not-to-strangers
  phrase hobb-on-last-night when dimming was discussed
```

That works, and it is the author deciding. The row knows that this
question is delicate, knows which feeling matters, and has a refusal
written for the case. A character with twenty things to keep quiet about
needs twenty such lines, and each is a place to get the rule slightly
different.

Chord lets you say the rule once, about the person. Hobb does not betray a
confidence. What he was told in confidence is marked as such where he
knows it. Whether he tells is then worked out by the platform each time he
is asked, from what he holds to and how he feels about the person asking.
This chapter is about the lines that say what a person holds to.

## Something told in confidence

A `knows` line may end with one more word.

```chord
knows night, told, certain, confided
```

`confided` says the knowledge was given in trust. It changes nothing by
itself. A person with no principles tells a confided thing as readily as
any other.

The name matters here in a way it did not in the last chapter. The
platform connects a fact to a topic row by name: the fact is `night`, and
the row that speaks of it must have `night` as one of its spellings.

```chord
about "night", "last night", "that night", "master":
  phrase hobb-on-last-night when dimming was discussed
```

The row has lost its `refuse` line. It now says only what Hobb would say,
and when the subject may come up at all. Whether he says it is no longer
the row's business.

## A thing a person will not do

```chord
never betrays a confidence
```

A `never` line goes in the person's block. It names an act the person
holds it wrong to commit. There are seven: `betrays a confidence`, `lies`,
`harms`, `steals`, `breaks a promise`, `abandons` and `trespasses`. Write
the act in the third person, as it reads after the person's name.

With that line, a question that would have Hobb reveal a confided thing
meets his principle, and the principle wins.

```text
> ask hobb about last night
Hobb gives that some thought, and gives it back.
```

Nothing in the row refused. The platform judged that answering would be
the forbidden act, and withheld the row. What the player reads is the
story's line for a subject a person has nothing to say about, the one The
Relighting overrode in chapter 27. From outside, a kept confidence and
plain ignorance look the same, which is the point of keeping one.

A principle may have an exception, written after a comma.

```chord
never betrays a confidence, except Ansel
```

The exception names a person, or a kind of person such as `a servant`, or
`anyone`. A person with this line tells Ansel and no one else.

## What decides between principles

One rule and no exceptions gives a character who never tells. People are
more interesting when two things they hold to pull against each other, and
Chord has a word for how a person settles that.

The platform recognises five forces that can move a person: `fear`,
`desire`, `duty`, `honor` and `love`. A principle is a duty. A feeling of
trust or devotion toward someone is love. When two forces disagree about
an act, the stronger one wins, unless the person has a `temperament` line
that ranks them.

```chord
temperament love over duty
```

A temperament is one or more pairs, each `<force> over <force>`, joined
with `and`. This one says that where love and duty collide, love decides.

Here is Hobb in full.

```chord
create Hobb
  a person, proper
  pronouns he
  in the Lodge
  carries the hush page
  mood calm
  feels wary of Ansel
  knows night, told, certain, confided
  never betrays a confidence
  temperament love over duty
```

While he is wary of Ansel there is no love in the question, and duty is
unopposed. He keeps the confidence, as above. Then the spectacles are
given, mended or not, and the clause from the last chapter changes his feeling
to `trusts`.

```text
> give spectacles to hobb
You give the spectacles to Hobb.

Hobb hooks them over his ears and looks at you properly for the first time. "Ansel," he says, after a while. "You were always late."

> ask hobb about last night
He takes his time, of which he has had a great deal.

Hobb is quiet for some time. "Somebody had to put the Lantern out," he says. "It was guttering. The Master said a dead light was worse than none. He didn't say who." He looks at his hands.
```

Nothing in the row changed between those two answers. The row never
mentioned trust. Hobb told because he is a man who puts a person he trusts
above a rule he was given, and the story said so in one line of his block.

The puzzle is the one the last chapter had, and the player solves it the
same way. What has changed is where the rule lives. Give Hobb a second
confidence tomorrow, with a row of its own, and it is kept and given up on
exactly the same terms, with nothing more to write.

## Honesty

A second line of the same family pulls the other way.

```chord
answers honestly
```

A person who `answers honestly` holds it a duty to answer what they are
asked. Alone, with no `never` line, it changes little: such a person tells
a confided thing to whoever asks.

Its use is in the collision. A person with both lines has two duties, one
forbidding the answer and one requiring it, and a temperament ranks forces
and not two duties against each other. The platform's answer to that is
the human one. The person evades.

```chord
create Cy
  a person, proper
  in the Yard
  mood calm
  knows secret, told, certain, confided
  never betrays a confidence
  answers honestly

  Cy.
```

```text
> ask cy about secret
Cy says, "I don't know anything about that."
```

And a feeling can close a mouth as well as open one. A person who
`answers honestly` and has no rule against telling still keeps a
confidence from someone they hate.

## What the lines add up to

Seven people were each told the same secret in confidence, and each was
asked for it by the player. This is what they did.

| The person's lines | Asked, they |
| --- | --- |
| no principle | tell |
| `never betrays a confidence` | keep it |
| `never betrays a confidence, except` the asker | tell |
| `never betrays a confidence`, `temperament love over duty`, and devoted to the asker | tell |
| `answers honestly` | tell |
| `answers honestly`, and hates the asker | keep it |
| `never betrays a confidence` and `answers honestly` | evade |

Read down the table and you have a small cast: the gossip, the vault, the
confidant, the friend, the honest witness, the enemy, and the person in a
bind. Each is two or three lines.

Principles of this kind are worth their cost when a story has several
people and several secrets. For one secret and one keeper, the last
chapter's `refuse when` is shorter and says what you mean. The gain comes
with the second secret, and with the first time you change a character's
mind about someone and find that everything they would and would not tell
has moved with it.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-30` over your own
file. It is the story with this chapter's changes made, and it holds the row
about Hobb's spectacles, which the chapter did not print. To make the changes
by hand instead, work from this list and take the rest from that file. Change
Hobb's `knows` line and add the two lines beneath it. Take the `refuse` line
out of his row about the last night and give the row the spelling `night`.
Add a row about his spectacles, so that the player has something to go on.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Ask Hobb about the Dimming, then about the last night, then about his
spectacles.

```text
> ask hobb about spectacles
He turns the kettle a quarter round on its hook, to no purpose.

"Lost them in the spring," says Hobb. "Since then a face is a face. There are things I was told that I don't tell to a face."
```

::: under-the-hood
**Under the Hood: the arbiter** · Story IR `character.principles`, `character.temperaments`

The compiled IR records a person's `never` lines under
`character.principles` and the temperament under `character.temperaments`,
beside the `knows` entry that carries the `confided` mark. When a topic
row is about to answer, the platform checks whether any spelling of the
row names a fact its owner holds in confidence. If one does, it weighs the
forces for and against answering: each principle, the person's feeling
toward the asker, and the temperament's ranking. A verdict to refuse or to
evade withholds the row, and nothing in the row runs.
:::

::: from-another-system
**From another system: knowledge and reticence**

Neither manual describes a model of what a character will and will not
reveal. The TADS 3 documentation says of its conversation system that the
library does not use any sort of knowledge model for non-player
characters, and suggests an `isActive` test on a topic to model a
character's frame of mind. That is the approach of this chapter's first
example, the `refuse when` on a row. Chord's principles are a layer above
it, in which the test is derived from lines about the person.
:::

## What you have so far

Hobb keeps what he was told in confidence, from anyone he does not trust,
because of who he is and not because a row says so. The game plays as it
did. Its porter has become someone who could keep a second secret without
being taught how.
