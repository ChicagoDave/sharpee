# Sharpee API Reference

Auto-generated from `.d.ts` declarations. AI coding assistants should read these files instead of exploring the codebase when writing code against the Sharpee platform.

Generated: 2026-07-11 16:38:07 UTC

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
| [core.md](core.md) | @sharpee/core | Base types, query system, platform events, entity interfaces, debug utilities. (25 files, ~2412 lines) |
| [if-domain.md](if-domain.md) | @sharpee/if-domain | Domain events, contracts, grammar system, language/parser provider interfaces. (23 files, ~3401 lines) |
| [world-model.md](world-model.md) | @sharpee/world-model | Entity system (IFEntity), WorldModel, all traits, capability dispatch, scope, annotations. (100 files, ~8080 lines) |
| [engine.md](engine.md) | @sharpee/engine | GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary. (16 files, ~2062 lines) |
| [stdlib.md](stdlib.md) | @sharpee/stdlib | All 43 standard actions, validation, scope builders, NPC support, combat, action chains. (39 files, ~3754 lines) |
| [parser.md](parser.md) | @sharpee/parser-en-us | English parser, grammar patterns, story grammar extension API. (4 files, ~407 lines) |
| [lang.md](lang.md) | @sharpee/lang-en-us | English language provider, message resolution, formatters. (17 files, ~2574 lines) |
| [plugins.md](plugins.md) | Plugins | Plugin system, NPC plugin, scheduler (daemons/fuses), state machine. (12 files, ~801 lines) |
| [text.md](text.md) | Text System | Text blocks, decorations, rendering. (3 files, ~275 lines) |
| [if-services.md](if-services.md) | @sharpee/if-services | Runtime service interfaces (perception). (1 files, ~101 lines) |
| [event-processor.md](event-processor.md) | @sharpee/event-processor | Event sequencing and effect processing. (6 files, ~366 lines) |
| [combat.md](combat.md) | @sharpee/ext-basic-combat | Basic combat extension — attack/defend mechanics. (5 files, ~261 lines) |
| [character.md](character.md) | @sharpee/character | NPC/character authoring — builders, applyCharacter, character model. (31 files, ~3134 lines) |
| [authoring.md](authoring.md) | Authoring Helpers | Fluent entity-builder DSL (helpers) and the EntityQuery API (queries). (7 files, ~788 lines) |
| [presentation.md](presentation.md) | Presentation | Browser web client, channel renderers, and media/audio. (23 files, ~2298 lines) |
| [tooling.md](tooling.md) | Tooling | Build/CLI orchestration (devkit) and the transcript test engine. (9 files, ~532 lines) |
