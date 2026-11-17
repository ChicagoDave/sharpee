# IFWiki `Sharpee` page — wikitext as captured 2026-08-14

Source of record for the update guide in `sharpee-page.md`. Do not edit — this
is the "before" snapshot. ifwiki.org is behind a Cloudflare managed challenge
that 403s non-browser clients, so this capture cannot be refreshed
automatically; re-paste by hand if the live page changes.

```mediawiki
{{Software infobox
|Type=Authoring system
|Style=Parser
|Multimedia=Color, Graphics, Sound
|Developer=David Cornelson
|Home page=http://sharpee.net/
|Download=https://www.sharpee.net/chord-writer/download
|Format=Other
|System=Windows, macOS, Linux
|Version=5.0.0
|Date=2026-08-13
|Status=Stable
}}
Sharpee is a parser-based interactive fiction authoring platform built in Typescript by [[David Cornelson]]. It provides a modern, extensible architecture for creating text adventures with optional rich media support.

= Architecture =

== Sharpee is organized as a monorepo of composable packages: ==

* Engine — Turn cycle, command execution, event dispatch, plugin architecture
* World Model — Entity system with traits and behaviors for modeling game objects, rooms, and actors
* Standard Library (stdlib) — 43 standard IF actions (take, drop, open, lock, go, look, etc.) following a four-phase pattern: validate, execute, report, blocked
* Parser — Grammar-based command parsing with verb aliases, slot constraints, and story-extensible patterns
* Language Layer — All user-facing text is separated from logic via message IDs, enabling localization (currently English)
* Platform Browser — Classic IF web client with menus, save/restore, and theme support
* [[Zifmia]] — Story runner built on React, supporting both classic text and rich media (inline illustrations, custom themes, audio). Named after the Enchanter-trilogy spell for summoning.

== Key Features ==

* Trait and behavior system — Entities are composed of traits (data) and behaviors (logic), avoiding deep inheritance hierarchies
* Capability dispatch — Verbs with entity-specific semantics (turn, wave, lower) are handled by trait-registered behaviors, not monolithic action handlers
* Event-driven — Actions emit semantic events; clients, story handlers, and daemons react independently
* NPC system — Autonomous NPCs with behavior scripts, scheduled actions, and daemon/fuse support for timed events
* Language separation — Engine and stdlib never emit English strings; all prose flows through a pluggable language layer
* Story-extensible — Stories add custom actions, grammar patterns, traits, and behaviors without modifying the platform

== Distribution ==

Sharpee packages are published to npm under the @sharpee scope. Stories compile to .sharpee bundle files (zip archives containing story code, metadata, optional assets and themes) that run in the [[Zifmia]] story runner — a lightweight desktop app (via [https://v2.tauri.app/ Tauri]) or web-hosted player. Authors distribute story files; players install one runner.

== Current Status ==

Active development. The platform is being dog-fooded with a full implementation of 1981 Mainframe Zork (191 rooms, ~616 points).

== Roadmap ==

* Forge will be a custom trained small language model specifically for Sharpee. It will enable authors to develop a specification that Forge knows how to translate to a Sharpee story.
{{software navbox}}
```
