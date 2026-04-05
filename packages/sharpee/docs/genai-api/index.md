# Sharpee API Reference

Auto-generated from `.d.ts` declarations. AI coding assistants should read these files instead of exploring the codebase when writing code against the Sharpee platform.

Generated: 2026-04-05 04:12:38 UTC

## Quick Start

**Building a story?** Read in this order:
1. `engine.md` — `Story` interface, lifecycle methods
2. `world-model.md` — `WorldModel`, `IFEntity`, all traits
3. `stdlib.md` — standard actions, validation
4. `parser.md` — grammar extension for story-specific commands
5. `plugins.md` — NPC, scheduler, state machine

**Working on platform code?** Also read:
- `core.md` — base types, query system
- `if-domain.md` — domain events, contracts
- `event-processor.md` — event sequencing

## Files

| File | Package(s) | Description |
|------|-----------|-------------|
| [core.md](core.md) | @sharpee/core | Base types, query system, platform events, entity interfaces, debug utilities. (25 files, ~2439 lines) |
| [if-domain.md](if-domain.md) | @sharpee/if-domain | Domain events, contracts, grammar system, language/parser provider interfaces. (17 files, ~2251 lines) |
| [world-model.md](world-model.md) | @sharpee/world-model | Entity system (IFEntity), WorldModel, all traits, capability dispatch, scope, annotations. (88 files, ~7003 lines) |
| [engine.md](engine.md) | @sharpee/engine | GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary. (12 files, ~1556 lines) |
| [stdlib.md](stdlib.md) | @sharpee/stdlib | All 43 standard actions, validation, scope builders, NPC support, combat, action chains. (34 files, ~3207 lines) |
| [parser.md](parser.md) | @sharpee/parser-en-us | English parser, grammar patterns, story grammar extension API. (4 files, ~414 lines) |
| [lang.md](lang.md) | @sharpee/lang-en-us | English language provider, message resolution, formatters. (13 files, ~2369 lines) |
| [plugins.md](plugins.md) | Plugins | Plugin system, NPC plugin, scheduler (daemons/fuses), state machine. (12 files, ~569 lines) |
| [text.md](text.md) | Text System | Text blocks, decorations, text service, rendering. (13 files, ~640 lines) |
| [if-services.md](if-services.md) | @sharpee/if-services | Runtime service interfaces (perception). (1 files, ~78 lines) |
| [event-processor.md](event-processor.md) | @sharpee/event-processor | Event sequencing and effect processing. (6 files, ~366 lines) |
| [combat.md](combat.md) | @sharpee/ext-basic-combat | Basic combat extension — attack/defend mechanics. (5 files, ~254 lines) |
