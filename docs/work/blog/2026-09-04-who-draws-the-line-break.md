# Who draws the line break? Not the author.

A post came through Planet IF this week about wrangling line breaks in Inform 7. It is a good post, in the sense that it accurately describes what an Inform author has to do. That is what bothers me about it.

The setup is a bowl of ice cream whose description cycles through three flavors, and an every-turn rule that nags you to eat it. The output has a stray blank line between the description and the nag. The post then walks through the fixes: append a substitution to the end of the string, no change; move it into the say phrase, no change; attach it to each individual sentence, that works. Then the improvement: define a substitution that prints Unicode character 46 so that the period at the end of a sentence is not a period as far as the compiler is concerned. Then a rulebook that prints a stanza of Berryman using a substitution meant for command clarification, because that substitution happens to suppress the engine's paragraph logic and nothing else does.

The author's own line is the tell. "None of this quite feels like sitting down to write, though, does it?" No. It does not.

## Why Inform is like this

Inform 7 is built on top of Inform 6, and it kept Inform 6's output model. Text goes to the Z-machine or Glulx screen stream the moment a say phrase runs. That stream is one way. The Glk specification says it in a sentence: "A window stream cannot be read from, only written to." The Z-machine offers no way to ask where the cursor is either. So the runtime has no way to look at the screen and ask whether it is at the start of a line or whether a line was just skipped.

Graham Nelson says as much in the comment at the top of the paragraphing code in the Inform kits, and it is worth quoting because it is the whole story:

> Most users probably imagine that it's implemented by having I7 look at where the cursor currently is (at the start of a line or not) and whether a line has just been skipped. In fact, the virtual machines simply do not offer facilities like that, and so we have to use our own book-keeping. Given the huge number of ways in which text can be printed, this is a delicate business. For some years now, "spacing bugs" (those where a spurious extra skipped line appears in a paragraph break, or where, conversely, no line is skipped at all) have been the least welcome in the Inform bugs database.

The bookkeeping is two global flags. The compiler sets the first one before every say phrase, and the runtime checks it at "divide paragraph points" between rules and prints a skipped line if it is set. The sentence-ending punctuation rule is not even a runtime check. The compiler looks at the last character of the literal text in a say phrase and, if it is a full stop, an exclamation mark or a question mark, compiles in a newline. That is why the post's fix only works when the substitution sits right next to the period, and why printing the period as a character code works at all: the compiler is looking at the source string, and a character code is not a full stop.

Layout, in short, is a side effect of printing, computed from the text itself, at the moment each fragment goes out. Inform 7 put a natural-language surface on that stream without replacing the stream. Every substitution in the post is a way of poking one of those flags from inside a string, because the string is the only place an author can stand.

That design has a consequence that no amount of substitution vocabulary can fix. The prose and the layout instructions live in the same string. When the layout is wrong, you edit the prose. When you cannot edit the prose without changing what the reader sees, you disguise the prose so the engine misreads it. Printing a period as a character code is exactly that: lying to the layout engine about what you wrote.

A thirty thousand word story written this way carries hundreds of these disguises. Every one of them is a place where the author stopped writing and started negotiating.

## What Sharpee does instead

In Sharpee the story never prints anything. Actions and phrases produce text blocks during the turn, and when the turn is over the report service assembles them. Paragraphs are structure, not punctuation. A phrase is a block. A blank line inside a phrase body is a paragraph break. A single line break is a `{br}` marker. The renderer owns the margins between blocks, and the theme decides what those margins look like.

Nothing in that pipeline reads your sentences to decide where a paragraph goes. A period is a period. Here is the ice cream in Chord.

```chord
create the Lab
  a room

  A bowl of ice cream rests on the counter. {ice-cream-look}

  on every turn while the ice cream is on the counter
    phrase eat-it
  end on

create the counter
  a scenery supporter in the Lab

create the ice cream
  aka bowl
  on the counter

define phrase ice-cream-look, cycling
  It looks like delicious vanilla.
or
  Chocolate! My favorite.
or
  Strawberry with real chunks of fruit in it.
end phrase

define phrase eat-it
  You had better eat that ice cream before it melts!
end phrase
```

The description is one block. The every-turn nag is another block. The space between them is the paragraph margin, the same margin every paragraph in the story gets, and it is the same on the first turn, the fortieth, and after every flavor. There is nothing to tune because there is nothing computing it from the text.

The poem is the same idea with the other marker.

```chord
define phrase dream-song-14
  Life, friends, is boring. We must not say so.{br}
  After all, the sky flashes, the great sea yearns,{br}
  we ourselves flash and yearn,{br}
  and moreover my mother told me as a boy{br}
  (repeatingly) 'Ever to confess you're bored{br}
  means you have no
end phrase
```

Each `{br}` produces a line that stacks flush against the previous one. If the stanza needs a gap, you leave a blank line, and it is a paragraph. No rulebook, no borrowed substitution, no trailing break rule to cancel a break that appeared from somewhere else.

## A different split

The post ends with "do not accept defeat," which is a strange thing to have to say about typesetting a paragraph. An engine should not be an opponent. The reason Inform's is comes down to one decision made a long time ago: that the printing routine is where layout gets decided. That was a choice with real benefits. Building on Inform 6 gave Inform 7 the Z-machine and Glulx, every interpreter ever written for them, and twenty years of library behavior that already worked. The paragraphing flags are the price of that choice, and it is a price paid by every author, on every project, in every string.

Sharpee and Chord make a different bet. The virtual machine pattern bought portability by fixing a byte code and asking every platform to write an interpreter for it, and the price of that portability was an output model from the era of the teletype: a stream of characters with no structure the interpreter could see. The web is now the runtime that every platform already has. A story delivered to a browser inherits its portability from the browser, and it gets to deliver structure instead of characters. Sharpee's engine hands the client a list of text blocks with keys and classes, and the client lays them out with the same tools every web page uses. A paragraph is an element. The space between two paragraphs is a style. Neither of those facts has to be reconstructed from a flag after the text has already gone by.

I should be honest about where that bet still has gaps. Vorple has been putting Inform stories in a browser with real HTML and JavaScript for years, and Hugo shipped graphics and sound in its own runtime a long time before that. Both offer visual capabilities Sharpee has not tested against yet. Sharpee has sound, and it has minimal image placement, and neither is at the level those two systems reached. What Sharpee has settled first is the thing this post is about: the shape of the text. The rest is work I know is ahead.

The one place I expect an argument is this. What happens when two rules both report on the same turn, and the author meant them to be one paragraph? In Inform the answer is to reach for the run-on substitution and hope the flags cooperate. In Sharpee the answer is that two reports are two paragraphs, and if you wanted one paragraph you write one phrase. A phrase can splice another phrase into its own prose with a marker, which is exactly what the ice cream description does with its cycling flavor. The joining is done in the source, where the author can read it, not at the output, where nobody can. That is a real constraint, and I am choosing it on purpose: if two things happen independently, they are two facts, and the reader gets two paragraphs. When the author knows they belong together, the author says so once, in the text, and the engine never has to guess.

Sharpee's split is that the story says what is true and the presentation layer says how it looks. The same story renders in a terminal, in a browser, and in Chord Writer, with different themes, and the author has not written a single character of layout for any of them. When an author wants a different look, they change the theme, not the prose. When a tester pins a transcript, the text is the text; there is no whitespace to fight over.

The best argument for this is the one the post makes by accident. Authors want to sit down and write. The tool that lets them do that is the one that never asks them to hide a period.
