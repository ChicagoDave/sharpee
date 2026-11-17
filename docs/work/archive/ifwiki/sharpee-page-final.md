# IFWiki `Sharpee` page — assembled replacement wikitext

Every change from `sharpee-page.md` applied. Two items are deliberately left at
their current values and marked with inline comments: the infobox `Date` and
macOS minimum (§1), and the Roadmap (§9). Strip the `<!-- -->` comments before
saving, or leave them — MediaWiki does not render them.

Diff against `sharpee-page-current.md` before pasting if the live page has
moved since 2026-08-14.

```mediawiki
{{Software infobox
|Type=Authoring system
|Style=Parser
|Multimedia=Color, Graphics, Sound
|Developer=David Cornelson
|Home page=http://sharpee.net/
|Download=https://www.sharpee.net/chord-writer/download
|Format=Other
|System=Windows, macOS, Linux (runtime); macOS (Chord Writer)
|Version=5.0.0
|Date=2026-08-13
|Status=Stable
}}
<!-- Date: confirm this is the 5.0.0 release date; most recent commit is 2026-08-14 -->
Sharpee is a parser-based interactive fiction authoring platform created by
[[David Cornelson]]. Stories are written in '''[[Chord]]''', a purpose-built
authoring language, and run on a TypeScript engine that supports classic text
play as well as optional rich media. Authors who want direct access to the
platform can write TypeScript against the engine packages instead.

== Chord ==

Stories are written in '''[[Chord]]''', a declarative authoring language built
for Sharpee. A Chord story is a single <code>.story</code> file describing rooms,
objects, and behavior in near-English prose, compiled by the Sharpee toolchain.
See the [[Chord]] page for the language itself.

== Architecture ==

=== Authoring ===

* '''[[Chord]]''' — The story authoring language and its compiler: lexer, parser, semantic analysis, and structured diagnostics. A story is a plain <code>.story</code> file with no package manifest and no build configuration.
* '''Chord Writer''' — Native macOS authoring application. In-process syntax highlighting, a Problems pane fed live by the compiler, and one-step Build and Play to a browser bundle.

=== Runtime ===

Sharpee is organized as a monorepo of composable packages:

* '''Engine''' — Turn cycle, command execution, event dispatch, plugin architecture
* '''World Model''' — Entity system with traits and behaviors for modeling game objects, rooms, and actors
* '''Standard Library (stdlib)''' — 45 world actions (take, drop, open, lock, go, look, etc.) plus 11 meta commands (save, restore, undo, again, score, help), each following a four-phase pattern: validate, execute, report, blocked
* '''Parser''' — Grammar-based command parsing with verb aliases, slot constraints, and story-extensible patterns
* '''Language Layer''' — All user-facing text is separated from logic via message IDs, enabling localization (currently English)
* '''Channels''' — Every story-to-interface signal (prose, status, media, layout) travels as structured data over named channels, so a client renders the story rather than the story printing to a client
* '''Platform Browser''' — Classic IF web client with menus, save/restore, and theme support, built on channels and customizable per story
* '''Extensions''' — Optional systems an author opts into: scoring, hunger, basic combat, conversation, and a testing extension

== Key Features ==

* Chord authoring language — Stories are written in a declarative language designed for IF rather than in a general-purpose programming language; the compiler reports errors in terms of the story, not the runtime
* Trait and behavior system — Entities are composed of traits (data) and behaviors (logic), avoiding deep inheritance hierarchies
* Capability dispatch — Verbs with entity-specific semantics (turn, wave, lower) are handled by trait-registered behaviors, not monolithic action handlers
* Event-driven — Actions emit semantic events; clients, story handlers, and daemons react independently
* Channel-based interface — Stories emit structured data on named channels rather than printing text, so the same story drives a terminal, a browser client, or an author's custom interface
* NPC system — Autonomous NPCs with behavior scripts, scheduled actions, and daemon/fuse support for timed events
* Language separation — Engine and stdlib never emit English strings; all prose flows through a pluggable language layer
* Story-extensible — Stories add custom actions, grammar patterns, traits, and behaviors without modifying the platform

== Distribution ==

Sharpee packages are published to npm under the <code>@sharpee</code> scope, and
Chord Writer bundles the toolchain so authors never need an npm step. A story
builds to a self-contained browser bundle — HTML, JavaScript, and any assets in
one directory — which the author hosts or distributes directly. Players need
only a web browser; there is no separate interpreter to install.

== Current Status ==

Active development, currently focused on the Chord language and Chord Writer.
The platform is dog-fooded with a full implementation of 1981 Mainframe Zork
(172 rooms across 15 regions; 616 points in the main game plus 100 in the
endgame), and with a set of smaller example stories including a Chord
implementation of ''Cloak of Darkness''.

== Roadmap ==

<!-- Unverifiable from the repo — docs/work/forge/ no longer exists. Confirm or revise. -->
* Forge will be a custom trained small language model specifically for Sharpee. It will enable authors to develop a specification that Forge knows how to translate to a Sharpee story.
{{software navbox}}
```
