# Sharpee

[![npm](https://img.shields.io/npm/v/@sharpee/sharpee/latest?label=npm&color=orange)](https://www.npmjs.com/package/@sharpee/sharpee)

A parser-based Interactive Fiction authoring platform built in TypeScript.

## Quick Start

```bash
npx @sharpee/sharpee init my-adventure
cd my-adventure
npm install
```

Build and play:

```bash
npx @sharpee/sharpee build
open dist/web/index.html
```

All CLI commands work via `npx @sharpee/sharpee <command>`:

| Command | What it does |
|---------|-------------|
| `npx @sharpee/sharpee init <name>` | Create a new story project |
| `npx @sharpee/sharpee init-browser` | Add browser client to existing project |
| `npx @sharpee/sharpee build` | Build `.sharpee` bundle + browser client |
| `npx @sharpee/sharpee build-browser` | Build browser client only |
| `npx @sharpee/sharpee ifid` | Generate or validate an IFID |

## What's Included

`@sharpee/sharpee` is the umbrella package — one install gives you everything. All 29 packages are published individually on npm under the `@sharpee` scope.

| Package | Description |
|---------|-------------|
| `@sharpee/bridge` | PostMessage bridge for iframe embedding |
| `@sharpee/character` | NPC behavior chain: character model, conversation, goals, influence, propagation |
| `@sharpee/core` | Event system, types, utilities |
| `@sharpee/engine` | Game engine, turn cycle, command execution |
| `@sharpee/event-processor` | Applies semantic events to the world model |
| `@sharpee/ext-basic-combat` | Generic skill-based combat extension |
| `@sharpee/ext-testing` | Debug and testing tools (`/debug`, `/trace`, `$teleport`) |
| `@sharpee/helpers` | Fluent entity builders (`world.helpers()`) |
| `@sharpee/if-domain` | Core domain model and contracts |
| `@sharpee/if-services` | Runtime service interfaces |
| `@sharpee/lang-en-us` | English language output |
| `@sharpee/media` | Audio event types, AudioRegistry, and capability negotiation |
| `@sharpee/parser-en-us` | English natural language parser |
| `@sharpee/platform-browser` | Browser client infrastructure |
| `@sharpee/plugin-npc` | NPC behaviors and autonomous turn processing |
| `@sharpee/plugin-scheduler` | Daemons and fuses (timed events) |
| `@sharpee/plugin-state-machine` | Declarative puzzle and narrative orchestration |
| `@sharpee/plugins` | Plugin contracts for engine extensibility |
| `@sharpee/runtime` | Headless engine for iframe embedding |
| `@sharpee/sharpee` | Umbrella package (re-exports everything) |
| `@sharpee/stdlib` | 49 standard IF actions (take, drop, open, lock, etc.) |
| `@sharpee/text-blocks` | Structured text output interfaces |
| `@sharpee/text-service` | Text rendering and status line |
| `@sharpee/transcript-tester` | Transcript-based testing framework |
| `@sharpee/world-model` | Entity system with traits and behaviors |
| `@sharpee/zifmia` | Zifmia desktop client integration |

## Features

- **Event-Driven Architecture** — Immutable semantic events for all state changes
- **Natural Language Parser** — Complex player commands with slot constraints
- **Rich World Model** — Entities with traits, behaviors, and relationships
- **48 Standard Actions** — take, drop, open, close, lock, unlock, wear, eat, drink, attack, and more
- **Four-Phase Action Pattern** — Consistent validate/execute/report/blocked flow
- **Capability Dispatch** — Entity-specific handling for generic verbs
- **Entity Helpers** — Fluent builder API for rooms, objects, containers, doors, actors
- **NPC Behavior Chain** — Character model with psychology, constraint-based conversation, goal pursuit, information propagation, and NPC-to-NPC influence
- **Direction Vocabularies** — Location-relative directions (compass, naval, minimal, or custom)
- **Audio System** — Typed audio events, AudioRegistry, procedural sound, atmosphere builder
- **Daemons & Fuses** — Timed events and background processes
- **Perception System** — Darkness, blindness, and sensory restrictions
- **Language Layer Separation** — All text output goes through localizable message IDs
- **Multi-Client Architecture** — Same story runs in CLI, browser, React, and Zifmia desktop
- **Full TypeScript** — Strict typing throughout

## Creating a Story

```typescript
import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity, Direction } from '@sharpee/world-model';
import '@sharpee/helpers';

export const config: StoryConfig = {
  id: 'my-adventure',
  title: 'My Adventure',
  author: 'Your Name',
  version: '1.0.0',
};

export class MyStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    const { room, object } = world.helpers();

    const start = room('Starting Room')
      .description('A simple room with a lamp on the floor.')
      .build();

    object('brass lamp')
      .description('A well-polished brass lamp.')
      .in(start)
      .build();

    const player = world.getPlayer();
    world.moveEntity(player!.id, start.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    const { actor } = world.helpers();

    return actor('yourself')
      .description('As good-looking as ever.')
      .aliases('self', 'me')
      .properName()
      .inventory({ maxItems: 10 })
      .build();
  }
}

export const story = new MyStory();
export default story;
```

See the [Getting Started](https://sharpee.net/docs/getting-started/installation/) guide for a complete walkthrough.

## Entity Helpers

`world.helpers()` returns fluent builders for common entity types:

```typescript
import '@sharpee/helpers';

const { room, object, container, actor, door } = world.helpers();

// Rooms
const cave = room('Dark Cave').description('A damp cave.').dark().build();

// Objects with custom traits
const note = object('crumpled note')
  .description('A crumpled piece of paper.')
  .addTrait(new ReadableTrait({ text: 'The code is 4-7-2.' }))
  .in(cave)
  .build();

// Containers
const chest = container('wooden chest')
  .openable({ isOpen: false })
  .lockable({ isLocked: true, keyId: key.id })
  .in(cave)
  .build();

// Items in closed containers (bypasses validation)
object('gold coin').skipValidation().in(chest).build();

// Doors between rooms
door('iron door')
  .between(cave, hallway, Direction.NORTH)
  .openable({ isOpen: false })
  .build();
```

## Architecture

```
+-----------------------------------------------+
|              Your Story                       |
+--------------------+--------------------------+
| stdlib (actions)   | lang-en-us (messages)    |
| plugins (npc,      | parser-en-us (grammar)   |
|  scheduler, state) |                          |
+--------------------+--------------------------+
| engine | world-model | helpers | text-service |
+-----------------------------------------------+
| if-domain | if-services | event-processor     |
+-----------------------------------------------+
| core (events, types) | media (audio types)   |
+-----------------------------------------------+
```

### Key Principles

1. **Actions emit semantic events, not text** — The language layer converts message IDs to prose
2. **Behaviors own mutations** — Actions coordinate, behaviors perform state changes
3. **Traits compose entity capabilities** — Add container, lockable, wearable, etc.
4. **Parser scope is permissive** — Actions decide if visibility is truly required

## Zifmia Desktop Runner

[Zifmia](https://sharpee.net/downloads/) is the Tauri-based desktop app for playing `.sharpee` story bundles. Features include save/restore with modal dialogs, font preferences, auto-save/restore, theme support, and story illustrations.

## Standard Actions

**Movement**: going, entering, exiting, climbing
**Manipulation**: taking, dropping, putting, inserting, removing, giving, throwing
**Containers/Doors**: opening, closing, locking, unlocking
**Examination**: looking, examining, searching, reading
**Interaction**: talking, showing, attacking
**Devices**: switching on/off, pushing, pulling, raising, lowering
**Wearables**: wearing, taking off
**Consumables**: eating, drinking
**Senses**: touching, smelling, listening
**Meta**: inventory, score, help, save, restore, restart, quit, undo, again, wait, about, version, sleep

## Repository Development

```bash
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
pnpm install

# Build everything
./build.sh -s dungeo

# Run tests
pnpm test

# Run specific package tests
pnpm --filter '@sharpee/stdlib' test

# Run story transcript tests
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript
```

## Example Stories

| Story | Status | Description |
|-------|--------|-------------|
| `dungeo` | Complete | Mainframe Zork implementation (~191 rooms, 650 points + 100 endgame) |
| `familyzoo` | Complete | Progressive tutorial — 17 versions teaching Sharpee concepts |
| `entropy` | In progress | Original sci-fi story with audio system |

## Roadmap

Sharpee is actively developed. These are the open [Architecture Decision Records](./docs/architecture/adrs/) representing planned future work.

### Recently Implemented

- **NPC Behavior Chain** (ADR-141, 142, 144, 145, 146) — Character psychology, conversation, goal pursuit, information propagation, NPC influence
- **Direction Vocabularies** (ADR-143) — Location-relative directions (compass, naval, minimal, custom)
- **Audio System** (ADR-138) — SFX, music, ambient, procedural audio, AudioRegistry
- **Entity Helpers** (ADR-140) — Fluent builder API for story setup
- **Action Interceptors** (ADR-118) — Story-level hooks on standard actions

### Accepted (Implementation Planned)

- **Screen Reader Accessibility** (ADR-100) — ARIA support for the Zifmia client
- **Speech Accessibility** (ADR-139) — TTS/STT for blind and motor-impaired players
- **Equivalent Objects** (ADR-147) — Identical object groups, numeric commands, trade/sell/barter

### Proposed

| Area | ADR | Description |
|------|-----|-------------|
| Story Paradigms | ADR-083 | Spirit PC — Non-physical player character support |
| Story Paradigms | ADR-102 | Dialogue Extension — NPC conversation systems (ASK/TELL, menus) |
| Story Paradigms | ADR-103 | Choice-Based Stories — CYOA-style with parser hybrid |
| World Model | ADR-020 | Clothing and Pockets — Container hierarchy for wearable items |
| Clients | ADR-098 | Terminal Client — CLI-based game client |
| Clients | ADR-099 | GLK Client — Standard IF interpreter protocol |
| Clients | ADR-122 | Rich Media and Story Styling — Embedded media in output |
| Zifmia | ADR-125 | Panel and Windowing System — Multi-panel desktop client |
| Zifmia | ADR-128 | Walkthrough Panel — In-client walkthrough display |
| Zifmia | ADR-130 | Story Installers — Split runner from author packaging tool |
| Author Tools | ADR-115 | Map Export CLI — Export story maps from code |
| Author Tools | ADR-116 | Prompt-to-Playable — AI-assisted story development |
| Author Tools | ADR-131 | Automated World Explorer — Regression test generator |
| Engine | ADR-127 | Location-Scoped Interceptors — Room-tied action interceptors |

See the full [ADR index](./docs/architecture/adrs/README.md) for all 152 architecture decisions.

## License

MIT License — Copyright 2025-2026 David Cornelson

## Links

- [Website](https://sharpee.net)
- [npm Package](https://www.npmjs.com/package/@sharpee/sharpee)
- [Documentation](https://sharpee.net/docs/)
- [Downloads (Zifmia)](https://sharpee.net/downloads/)
- [Issue Tracker](https://github.com/ChicagoDave/sharpee/issues)
