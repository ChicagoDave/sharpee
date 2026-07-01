# Preface {.unnumbered}

Sharpee is a parser-based interactive-fiction authoring system. You write a
story in TypeScript; Sharpee gives you a world model, a parser, a library of
standard actions, and a presentation layer, and turns your code into a playable
game you can run in a terminal, ship to the web, or host for many players at
once.

This book teaches you to author with Sharpee by building one story,
**Family Zoo**, from a single room to a complete, shippable game. It grows the
zoo one concept at a time, and every version of the code in these pages is real,
compiled, and transcript-tested.

## Two perspectives, one example

Interactive-fiction systems often keep two layers distinct: the language you
write a story in, and the language the system itself is built from. Inform 7, for
instance, lets authors write in readable natural-language syntax and drops to
Inform 6 for lower-level work, a deliberate split that makes the authoring
surface welcoming, with a deeper layer waiting when you need it.

Sharpee makes a different tradeoff: the story you write and the library you call
are the **same TypeScript**. The cost is that there's no gentle natural-language
surface to start from; you're writing code from line one. The benefit is that
there's no second language to learn when you want to see underneath. So this book
carries both perspectives over a single running example, and you can move between
them whenever you're ready:

- The **author's perspective** is the main narrative: building the zoo with
  Sharpee's traits, actions, and messages as a ready-made vocabulary.
- The **programmer's perspective** is a skippable deeper layer, the public API
  of the `@sharpee/*` library: the classes, methods, and types your author code
  is actually calling.

You can read the narrative straight through and ship a game without ever opening
the deeper layer. Or you can follow both and come away understanding the library
behind every line. The next chapter explains how to choose.
