# Sharpee - A parser-based IF platform in C#/.NET Core

I started working on this project a few years ago as a learning exercise. I wanted to understand all of the moving parts of a parser-based IF platform. This led to iteratively building parsers, world models, standard libraries, grammar definitions, turn loops, and event handlers.

When ChatGPT-4 was released, I started to take it slightly more seriously, but still slowly because there were limitations of my time, ChatGPT-4's capabilities and prompt-limits (original you got 25 prompts before being put on timeout).

A few months ago, Anthropic released Claude Opus 3, a competitor to ChatGPT4. I tested it out and switched my paid subscription immediately. It also hallucinates at times, but it's super fast and I prefer its response style. Now I'm working with Anthropic projects, Claude Sonnet 3.5, and a template for always refreshing the prompt.

More detailed discussions will occur at https://sharpee.plover.net/.

I also talk in a limited fashion on intfiction.org. It's no secret that the IF community is a herd of cats, especially when it comes to people building new systems. There's very little patience.

## Design Choices

### World Model
The world model has its first version completed. It's built on an in-memory bidirectional graph data structure with a pub/sub state change event handler built in. Unit tests have it functioning as expected (for now). I've added Event Handling so we can add a Rules Engine in the future.

## IFWorldModel
This sits between the Standard Library and an author's Story file and the lower level World Model (data store).

### Standard Library
This is the standard IF "stuff".

#### Story
A Fluent class that implements an author's custom game artifacts and map.

### Grammar Library
A fluent class that defines accepted input sentence structures.

### Text Service
The Text Service will be called at the end of the turn loop, interrogate the world model and event log to determine what to emit.

#### Open design discussion

### Language Library (english as the default)
The Language library is a set of known constants that allow the platform to understand input and emit automated portions of text properly. It's values are used throughout the Standard Library and in the Grammar Library.

#### Open design discussion
##### Naming conventions
The naming convention may change to lang-en-US.cs to signify which language file to use when compiling a story.

## Licensing

This project's grammar system is inspired by and partially derived from the Inform 6 grammar library.

Original work copyright: Graham Nelson 1993-2004 and David Griffith 2012-2024

This project is licensed under the Artistic License 2.0. The full text of the license can be found in the COPYING file in the project root.

The original Inform 6 library can be found at: https://gitlab.com/DavidGriffith/inform6lib/