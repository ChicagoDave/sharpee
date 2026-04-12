# Sharpee API Reference

Complete type-level API documentation for the Sharpee interactive fiction platform, auto-generated from TypeScript declarations.

## Where to Start

**Building a story?** Read in this order:

1. [engine.md](engine.md) — `Story` interface, lifecycle methods
2. [world-model.md](world-model.md) — `WorldModel`, `IFEntity`, all traits
3. [stdlib.md](stdlib.md) — standard actions, validation
4. [parser.md](parser.md) — grammar extension for story-specific commands
5. [plugins.md](plugins.md) — NPC, scheduler, state machine

**Working on platform code?** Also read:

- [core.md](core.md) — base types, query system
- [if-domain.md](if-domain.md) — domain events, contracts
- [event-processor.md](event-processor.md) — event sequencing

## All Packages

| File | Package | Description |
|------|---------|-------------|
| [core.md](core.md) | @sharpee/core | Base types, query system, platform events, entity interfaces |
| [if-domain.md](if-domain.md) | @sharpee/if-domain | Domain events, contracts, grammar system |
| [world-model.md](world-model.md) | @sharpee/world-model | Entity system, WorldModel, all traits, capability dispatch |
| [engine.md](engine.md) | @sharpee/engine | GameEngine, Story interface, turn cycle, command executor |
| [stdlib.md](stdlib.md) | @sharpee/stdlib | All 43 standard actions, validation, scope builders |
| [parser.md](parser.md) | @sharpee/parser-en-us | English parser, grammar patterns, story grammar extension |
| [lang.md](lang.md) | @sharpee/lang-en-us | English language output, message registry |
| [plugins.md](plugins.md) | @sharpee/plugin-npc, scheduler, state-machine | NPC behaviors, timed events, puzzle orchestration |
| [text.md](text.md) | @sharpee/text-blocks, text-service | Structured text output, rendering |
| [combat.md](combat.md) | @sharpee/ext-basic-combat | Generic skill-based combat extension |
| [event-processor.md](event-processor.md) | @sharpee/event-processor | Event sequencing and application |
| [if-services.md](if-services.md) | @sharpee/if-services | Runtime service interfaces |
