# Bending the standard grammar

A player does not know which words you chose. They will type `fix lens`
where you wrote `mend`, `sit on chair` where the platform knows `enter`, and
`light lamp` where the whole point of your story is that lamps are kindled.
A story that answers "I don't understand that" to a reasonable sentence has
lost a little of the player's trust each time.

This chapter is about the grammar of actions that already exist: adding
words to them, taking words away, and moving a word from one action to
another. It is the shortest chapter in Part IV, and it has a large effect on
how a story feels to play.

## Adding words to an action

`extend action` adds patterns to an action. The action may be one of your
own.

```chord
extend action mending
  grammar
    fix or repair the target

extend action hushing
  grammar
    quiet or silence the target
```

The block names the action and holds a `grammar` block, written as in
`define action`. Now `fix`, `repair` and `mend` are one verb, with one set
of requirements and one trait answering it.

```text
> fix spectacles
You say the word and mean it. What was broken is whole, and has no memory of having been otherwise.
```

You could have written all three words in the action's own `grammar` block,
and for a new action that is often tidier. `extend action` earns its place
when the action is not yours to edit.

## Extending a standard action

Hobb's chair has been `enterable` since chapter 7, and chapter 7 had to
admit that the command for sitting in it was `enter chair`.

```text
> sit on chair
I don't understand that.
```

The standard action is called `entering`, and it can be extended like any
other.

```chord
extend action entering
  grammar
    sit on or in the portal
    sit down on or in the portal
```

```text
> sit on chair
You get into the chair.

> exit
You get out of the chair.
```

The slot is called `the portal` here because that is what the standard
entering action calls it. When you extend a standard action, use its own
slot names, so that the rest of the action knows which thing your pattern
means. Appendix C gives the patterns of every standard action, and the slot
names are there to be read off: `the item` for taking, `the target` for
lighting, `the portal` for entering.

The reply still says "get into", which is the standard message
`entering-entered`. You know from chapter 22 how to change that.

An `extend action` block adds grammar and nothing else. It cannot add a
requirement, a refusal or a statement to the action. Behaviour belongs to
things and traits, by the rule of the last two chapters, and the compiler
refuses a behaviour line in an `extend action` block.

## Taking words away

`remove from action` takes a pattern out of a standard action.

```chord
remove from action lighting
  light the target
```

The block names the action, and each line beneath is a pattern to remove,
written exactly as the standard grammar has it. The pattern must be one the
action really has. Removing a pattern that is not there is an error and not
a silent success, and the message lists the patterns the action does have.

```text
relighting.story:192:1 error [analysis.unmatched-removal-pattern] `remove from action lighting` — no standard rule matches `ignite :target`. The action's standard patterns are: `light :target`, `light :target with|using :tool`.
```

After this block, `light lamp` is not a command at all. The standard
lighting action still exists, with its other pattern, `light the target
with the tool`. It has lost only the words you named.

By itself that would make the story worse. It is one half of a move.

## Moving a word

The last chapter left a hole and a patch. `light lamp` reached the standard
lighting action, and the `wick` trait refused it with a sentence about
matches. That is a fair answer, and a better one is to let the player be
right. In this story, to light a thing is to kindle it.

```chord
remove from action lighting
  light the target

extend action kindling
  grammar
    light the target
```

The first block frees the pattern. The second gives it to kindling. Write
both. An `extend action` block is allowed to add a pattern that a standard
action also has, and the story would then have two actions claiming one
command. Removing the pattern first leaves no doubt about which you mean.

```text
> light lamp
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.
```

And before the page has been read, `light lamp` is refused by the kindling
action, in the words the story uses for a working that has not been learned.

```text
> light lamp
You reach for the word and find only the place where it was.
```

The `wick` trait keeps its `on the player lighting` clause. It now guards
the one pattern the lighting action has left.

```text
> light lamp with taper
You have no match, and you did not walk here for three days to use one. There is a word for this.
```

This is the right order in which to think about any standard verb that your
story changes the meaning of. First decide what the player will type. Then
make sure every reasonable way of typing it arrives at the same action.

## What to add

Play your story as someone who has never seen the source, or better, watch
someone else play it. Each time a sensible command is not understood, write
it down. Most of the entries on that list are one line in an `extend action`
block.

A few habits help.

Add the plain word beside the coloured one. Your verb is `kindle`, and the
player's is `light`. Your verb is `unbind`, and theirs may be `open`. The
Relighting does not give `open` to unbinding, because the grille has no door
in it and "open grille" deserves the standard refusal, but it is the kind of
question to ask of every working.

Add the prepositions people actually use. `sit on`, `sit in` and `sit down
on` are one pattern each, or one pattern with `or` in it.

Do not add a synonym that means something else elsewhere in the story. If
`ring` is a noun in your game, think before making it a verb.

And do not take away a standard pattern merely because your story has no
use for it. A command that is understood and politely refused is better than
one that is not understood.

## A file for the grammar

The synonym blocks are not part of the story's design. They are a list that
grows with testing, and they can live in a file of their own.

```chord
import "synonyms"
```

This is the `import` line of chapter 22, and the file it names is
`synonyms.chord`, beside the story.

```chord
## Plain words for the workings, and a way to sit down. This file is a
## fragment: The Relighting imports it, and it is not a story by itself.

extend action mending
  grammar
    fix or repair the target

extend action hushing
  grammar
    quiet or silence the target

extend action entering
  grammar
    sit on or in the portal
    sit down on or in the portal
```

The blocks are read as though they stood in the story at the line where the
`import` is. The Relighting keeps the `light` move in the main file, because
that one is a decision about what the story means, and puts the rest in the
fragment.

The standard grammar is itself a file of this kind, written in the same
`define action` blocks you learned in chapter 23. Appendix C prints it in
full. Reading it is the quickest way to learn what your players can already
say.

## Build and try it

Add the `remove from action` block, the `extend action kindling` block and
the `import` line near the workings. Create `synonyms.chord` beside the
story with the three blocks above. Both files are in the companion folder
`chapter-25`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Play the winning walk once more with the plain words: `light lamp`, `quiet
bell`, `fix spectacles`, `repair lens`.

```text
> quiet bell
You say the word up into the dark of the tower. The bell swings twice more without a sound, and hangs still.
```

::: under-the-hood
**Under the Hood: two lists** · Story IR `grammarRemovals`, `grammarExtensions`

The compiled IR records these blocks in two lists. `grammarRemovals` has one
entry, for lighting, holding the pattern that was taken away.
`grammarExtensions` has four, for kindling, mending, hushing and entering,
and it does not say which file they came from. When the story loads, the
platform starts from the standard grammar, removes the first list, and adds
the second and your own actions. The parser that reads the player's command
never sees your source. It sees one grammar, which is the standard one as
your story has bent it.
:::

::: from-another-system
**From another system: Understand lines**

In Inform 10 the same three jobs are done by "Understand" sentences:
"Understand 'fix [something]' as mending" adds a pattern, and "Understand
the command 'light' as something new" clears a verb so that you can assign
it again. In TADS 3 you add a `VerbRule` for the new wording, or use
`modify VerbRule` to change an existing one. Chord's two blocks correspond
closely to the two Inform forms. The difference is that Chord removes one
pattern at a time, where Inform's "as something new" clears every use of the
word.
:::

## What you have so far

That is Part IV, and with it the game has its centre. The Relighting has
four workings that can be typed three or four ways each, things that answer
them through traits, prose that varies and belongs to its speakers, and a
standard library that has been taught this story's manners. A player can
win it, lose it two ways, or run out of day.

What Lanternhall does not have is anybody in it. Hobb stands in his doorway
and says a word about sunlight when you come in, and he cannot be asked a
single question. Part V is about people.
