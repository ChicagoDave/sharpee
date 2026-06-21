# Preface {.unnumbered}

Sharpee is a parser-based interactive-fiction authoring system. You write a
story in TypeScript; Sharpee gives you a world model, a parser, a library of
standard actions, and a presentation layer, and turns your code into a playable
game you can run in a terminal, ship to the web, or host for many players at
once.

This book teaches you to author with Sharpee by building one story — the
**Family Zoo** — from a single room to a complete, shippable game. It grows the
zoo one concept at a time, and every version of the code in these pages is real,
compiled, and transcript-tested.

## Two perspectives, one example

Most authoring systems make you choose. You can read the *author's* book — how
to use the system — or the *programmer's* book — what the system is made of. The
two are written in different languages, shipped as different volumes, and the
moment you need to cross from one to the other you fall off a cliff.

Sharpee has no such cliff, because both perspectives are the **same
TypeScript**. So this book carries both over a single running example:

- The **author's perspective** is the main narrative: building the zoo with
  Sharpee's traits, actions, and messages as a ready-made vocabulary.
- The **programmer's perspective** is a skippable deeper layer — the public API
  of the `@sharpee/*` library: the classes, methods, and types your author code
  is actually calling.

You can read the narrative straight through and ship a game without ever opening
the deeper layer. Or you can follow both and come away understanding the library
behind every line. The next chapter explains how to choose.
