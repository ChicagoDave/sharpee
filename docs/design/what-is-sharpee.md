# What is Sharpee?

Sharpee is a modern platform for creating parser-based interactive fiction, built entirely in TypeScript.

## What is Parser IF?

Interactive fiction is a form of storytelling where you play by typing commands in natural language. Instead of clicking buttons or selecting from menus, you type what you want to do:

> **go north**
> **take the brass lantern**
> **open the trapdoor**
> **put the jeweled egg in the trophy case**

The game understands your words, figures out what you mean, and describes what happens next. It's part puzzle game, part novel, part conversation with a world that reacts to everything you do.

Parser IF has a long history stretching back to the 1970s — Colossal Cave Adventure, Zork, the Infocom catalog — but the form is very much alive. Modern authors continue to push it in new directions, from literary experiments to intricate puzzle worlds.

## Why Sharpee?

Classic IF development tools were built decades ago. They work, but they carry the weight of their era — custom languages, limited tooling, and architectures that resist modern development practices.

Sharpee takes a different approach. It's built from the ground up in 
TypeScript, designed around composable traits, modern technical architecture, and a clean separation between game logic and natural language. Authors write in a real programming language with real tooling — type checking, IDE support, package management, testing frameworks.

The engine handles the hard parts: parsing natural language commands, managing a rich world model of objects and their relationships, coordinating complex multi-phase actions, and keeping NPCs acting autonomously. Authors focus on crafting their world and story.

Sharpee ships with standard actions, a full English parser and support 
for other language implementations, support for darkness and sensory 
restrictions, timed events, container logic, and everything else you'd 
expect from a mature IF platform. It runs in the browser and on the 
desktop via the Zifmia game runner.

It's currently in beta, being battle-tested against one of the most 
complex text adventures ever made: a full port of Mainframe Zork's 
Great Underground Empire with several new stories in the works 
by Sharpee's creator, David Cornelson.
