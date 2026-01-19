# Package Dependency Graph

This diagram shows the build-time dependencies between Sharpee packages, organized by architectural layer.

## Diagram

```mermaid
graph TD
    subgraph "Application Layer"
        sharpee["<b>sharpee</b><br/>CLI Entry Point<br/><i>3 files</i>"]
        transcript["<b>transcript-tester</b><br/>Integration Tests<br/><i>9 files</i>"]
        forge["<b>forge</b><br/>Story Compilation<br/><i>12 files</i>"]
    end

    subgraph "Engine Layer"
        engine["<b>engine</b><br/>GameEngine, CommandExecutor<br/>Scheduler, Turn Management<br/><i>23 files</i>"]
    end

    subgraph "Processing Layer"
        textservice["<b>text-service</b><br/>Event → TextBlock Pipeline<br/><i>14 files</i>"]
        eventproc["<b>event-processor</b><br/>Event Handlers<br/><i>17 files</i>"]
        stdlib["<b>stdlib</b><br/>43 Standard Actions<br/>Capability Dispatch<br/><i>247 files</i>"]
        parser["<b>parser-en-us</b><br/>English Grammar<br/>Pattern Matching<br/><i>16 files</i>"]
    end

    subgraph "Domain Layer"
        worldmodel["<b>world-model</b><br/>Entities, 30+ Traits<br/>Behaviors, Services<br/><i>140 files</i>"]
        langen["<b>lang-en-us</b><br/>English Text Generation<br/>Message Templates<br/><i>70 files</i>"]
    end

    subgraph "Foundation Layer"
        core["<b>core</b><br/>Event System, Entity Model<br/>Utilities, Random<br/><i>49 files</i>"]
        ifdomain["<b>if-domain</b><br/>Domain Contracts<br/>Action, Grammar Interfaces<br/><i>21 files</i>"]
        ifservices["<b>if-services</b><br/>Service Interfaces<br/><i>2 files</i>"]
        textblocks["<b>text-blocks</b><br/>Output Structures<br/><i>3 files</i>"]
    end

    %% Application Layer dependencies
    sharpee --> engine
    transcript --> engine
    forge --> worldmodel

    %% Engine Layer dependencies
    engine --> textservice
    engine --> eventproc
    engine --> stdlib
    engine --> parser

    %% Processing Layer dependencies
    textservice --> textblocks
    textservice --> ifservices
    textservice --> ifdomain
    textservice --> core

    eventproc --> worldmodel
    eventproc --> ifdomain
    eventproc --> core

    stdlib --> worldmodel
    stdlib --> langen
    stdlib --> ifdomain
    stdlib --> ifservices
    stdlib --> core

    parser --> langen
    parser --> worldmodel
    parser --> ifdomain
    parser --> core

    %% Domain Layer dependencies
    worldmodel --> ifdomain
    worldmodel --> core

    langen --> ifdomain
    langen --> core

    %% Foundation Layer dependencies
    ifdomain --> core
    ifservices --> core

    %% Styling
    classDef appLayer fill:#e1f5fe,stroke:#01579b
    classDef engineLayer fill:#fff3e0,stroke:#e65100
    classDef procLayer fill:#f3e5f5,stroke:#7b1fa2
    classDef domainLayer fill:#e8f5e9,stroke:#2e7d32
    classDef foundLayer fill:#fce4ec,stroke:#c2185b

    class sharpee,transcript,forge appLayer
    class engine engineLayer
    class textservice,eventproc,stdlib,parser procLayer
    class worldmodel,langen domainLayer
    class core,ifdomain,ifservices,textblocks foundLayer
```

## Layer Descriptions

### Foundation Layer
Pure contracts and utilities with no platform-specific dependencies.

| Package | Purpose | External Dependencies |
|---------|---------|----------------------|
| `core` | Event system, entity interfaces, utilities | `eventemitter3` |
| `if-domain` | Domain contracts (actions, grammar, validation) | None |
| `if-services` | Runtime service interfaces | None |
| `text-blocks` | Output structure definitions | None |

### Domain Layer
Core domain logic for world representation and language.

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `world-model` | Entity system, traits, behaviors, services | `WorldModel`, `IFEntity`, 30+ traits |
| `lang-en-us` | English text generation, message templates | `LanguageProvider`, message maps |

### Processing Layer
Command processing, actions, and output generation.

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `stdlib` | 43 standard actions, capability dispatch | All IF actions, `CapabilityBehavior` |
| `parser-en-us` | English grammar, pattern matching | `Parser`, `GrammarBuilder` |
| `event-processor` | Event application, handlers | `EventProcessor`, handler registry |
| `text-service` | Event → TextBlock pipeline | `TextService` |

### Engine Layer
Orchestration and turn management.

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `engine` | Game loop, command execution, scheduler | `GameEngine`, `CommandExecutor`, `Scheduler` |

### Application Layer
Entry points and tooling.

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `sharpee` | CLI entry point, bundle | CLI commands |
| `transcript-tester` | Integration test runner | Test CLI |
| `forge` | Story compilation tools | Compiler utilities |

## Dependency Rules

### Allowed Dependencies (by layer)

| Layer | Can Depend On |
|-------|---------------|
| Application | Engine, Processing, Domain, Foundation |
| Engine | Processing, Domain, Foundation |
| Processing | Domain, Foundation |
| Domain | Foundation |
| Foundation | Nothing (except external libs) |

### Key Coupling Points

| Coupling | Reason | Assessment |
|----------|--------|------------|
| `stdlib` → `lang-en-us` | Message ID resolution | Appropriate |
| `parser` → `lang-en-us` | Vocabulary lookup | Appropriate |
| `parser` → `world-model` | Entity resolution | Appropriate |
| `eventproc` ↔ `world-model` | Bidirectional awareness | Acceptable |

## Build Order

Packages must be built in dependency order:

```
1. core
2. text-blocks, if-domain, if-services  (parallel)
3. world-model, lang-en-us              (parallel)
4. event-processor, stdlib, parser      (parallel, after 3)
5. text-service                         (after 4)
6. engine                               (after 5)
7. sharpee, transcript-tester, forge    (parallel, after 6)
```

## Package Statistics

| Package | Files | ~LOC | Primary Responsibility |
|---------|-------|------|------------------------|
| `core` | 49 | 3,500 | Event system, utilities |
| `if-domain` | 21 | 1,500 | Contracts |
| `if-services` | 2 | 200 | Service interfaces |
| `text-blocks` | 3 | 300 | Output types |
| `world-model` | 140 | 12,000 | Entities, traits |
| `lang-en-us` | 70 | 5,000 | Text generation |
| `stdlib` | 247 | 15,000 | Actions |
| `parser-en-us` | 16 | 2,500 | Grammar |
| `event-processor` | 17 | 2,000 | Event handlers |
| `text-service` | 14 | 2,000 | Text pipeline |
| `engine` | 23 | 4,000 | Orchestration |
| `sharpee` | 3 | 500 | CLI |
| `transcript-tester` | 9 | 1,500 | Testing |
| `forge` | 12 | 1,500 | Compilation |
| **Total** | **626** | **~51,500** | |

## Related ADRs

- ADR-005: Action Interface Location
- ADR-007: Actions in Standard Library
- ADR-008: Core Package as Generic Event System
- ADR-030: If-Services Package
- ADR-077: Release Build System
