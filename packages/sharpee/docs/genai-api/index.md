# Sharpee API Reference

Auto-generated from `.d.ts` declarations. AI coding assistants should read these files instead of exploring the codebase when writing code against the Sharpee platform.

Generated for Sharpee 5.0.1

## Quick Start

**Building a story?** Read in this order:
1. `engine.md` — `Story` interface, lifecycle methods
2. `world-model.md` — `WorldModel`, `IFEntity`, all traits
3. `stdlib.md` — standard actions, validation
4. `parser.md` — grammar extension for story-specific commands
5. `plugins.md` — NPC, scheduler, state machine
6. `character.md` — NPC/character authoring
7. `authoring.md` — fluent entity builder + EntityQuery helpers
8. `presentation.md` — browser web client, channels, media/audio
9. `tooling.md` — build/CLI and transcript testing

**Working on platform code?** Also read:
- `core.md` — base types, query system
- `if-domain.md` — domain events, contracts
- `event-processor.md` — event sequencing

## Files

| File | Package(s) | Description |
|------|-----------|-------------|
| [core.md](core.md) | @sharpee/core | Base types, query system, platform events, entity interfaces, debug utilities. (30 files, ~2725 lines) |
| [if-domain.md](if-domain.md) | @sharpee/if-domain | Domain events, contracts, grammar system, language/parser provider interfaces. (23 files, ~3528 lines) |
| [world-model.md](world-model.md) | @sharpee/world-model | Entity system (IFEntity), WorldModel, all traits, capability dispatch, scope, annotations. (122 files, ~10017 lines) |
| [engine.md](engine.md) | @sharpee/engine | GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary. (39 files, ~3757 lines) |
| [stdlib.md](stdlib.md) | @sharpee/stdlib | All 43 standard actions, validation, scope builders, NPC support, combat, action chains. (48 files, ~4658 lines) |
| [parser.md](parser.md) | @sharpee/parser-en-us | English parser, grammar patterns, story grammar extension API. (4 files, ~438 lines) |
| [lang.md](lang.md) | @sharpee/lang-en-us | English language provider, message resolution, formatters. (17 files, ~2677 lines) |
| [plugins.md](plugins.md) | Plugins | Plugin system, NPC plugin, scheduler (daemons/fuses), state machine. (13 files, ~986 lines) |
| [text.md](text.md) | Text System | Text blocks, decorations, rendering. (3 files, ~275 lines) |
| [if-services.md](if-services.md) | @sharpee/if-services | Runtime service interfaces (perception). (1 files, ~101 lines) |
| [event-processor.md](event-processor.md) | @sharpee/event-processor | Event sequencing and effect processing. (6 files, ~366 lines) |
| [combat.md](combat.md) | @sharpee/ext-basic-combat | Basic combat extension — attack/defend mechanics. (5 files, ~283 lines) |
| [character.md](character.md) | @sharpee/character | NPC/character authoring — builders, applyCharacter, character model. (45 files, ~4093 lines) |
| [authoring.md](authoring.md) | Authoring Helpers | Fluent entity-builder DSL (helpers) and the EntityQuery API (queries). (7 files, ~792 lines) |
| [presentation.md](presentation.md) | Presentation | Browser web client, channel renderers, and media/audio. (26 files, ~2744 lines) |
| [tooling.md](tooling.md) | Tooling | Build/CLI orchestration (devkit) and the transcript test engine. (18 files, ~1811 lines) |
