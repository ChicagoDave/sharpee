# Architecture Diagram Specifications

This document contains specifications for generating architecture diagrams from the Sharpee codebase. Diagrams can be rendered using Mermaid or PlantUML.

---

## 1. Package Dependency Graph

### Mermaid Specification

```mermaid
graph TD
    subgraph "Application Layer"
        sharpee[sharpee<br/>CLI Entry]
        transcript[transcript-tester<br/>Integration Tests]
        forge[forge<br/>Story Compilation]
    end

    subgraph "Engine Layer"
        engine[engine<br/>GameEngine]
    end

    subgraph "Processing Layer"
        textservice[text-service<br/>Event → Text]
        eventproc[event-processor<br/>Event Handlers]
        stdlib[stdlib<br/>43 Actions]
        parser[parser-en-us<br/>Grammar]
    end

    subgraph "Domain Layer"
        worldmodel[world-model<br/>Entities & Traits]
        langen[lang-en-us<br/>Text Generation]
    end

    subgraph "Foundation Layer"
        core[core<br/>Events & Utils]
        ifdomain[if-domain<br/>Contracts]
        ifservices[if-services<br/>Service Interfaces]
        textblocks[text-blocks<br/>Output Types]
    end

    sharpee --> engine
    transcript --> engine
    forge --> worldmodel

    engine --> textservice
    engine --> eventproc
    engine --> stdlib
    engine --> parser

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

    worldmodel --> ifdomain
    worldmodel --> core

    langen --> ifdomain
    langen --> core

    ifdomain --> core
    ifservices --> core
```

---

## 2. Turn Cycle Sequence Diagram

### Mermaid Specification

```mermaid
sequenceDiagram
    participant P as Player
    participant E as GameEngine
    participant PR as Parser
    participant CE as CommandExecutor
    participant A as Action
    participant EP as EventProcessor
    participant S as Scheduler
    participant NPC as NPCService
    participant TS as TextService
    participant W as WorldModel

    P->>E: "take ball"

    E->>PR: parse(input)
    PR->>PR: Match grammar patterns
    PR->>PR: Resolve entities in scope
    PR-->>E: ParsedCommand {verb, objects}

    E->>CE: execute(command)

    CE->>A: validate(context)
    A->>W: Check visibility, portability
    A-->>CE: ValidationResult {valid: true}

    CE->>A: execute(context)
    A->>W: moveEntity(ball, player)
    W-->>A: success

    CE->>A: report(context)
    A-->>CE: [if.event.taken, action.success]

    CE-->>E: ActionEvents[]

    E->>EP: processEvents(events)
    EP->>EP: Run registered handlers
    EP->>W: Apply mutations
    EP-->>E: ProcessedResult {changes, reactions}

    E->>S: tick()
    S->>S: Decrement fuses, run daemons
    S-->>E: ScheduledEvents[]

    E->>NPC: runNPCTurns()
    NPC->>NPC: Each NPC decides action
    NPC-->>E: NPCEvents[]

    E->>TS: processTurn(allEvents)
    TS->>TS: Filter, sort, process
    TS-->>E: TextBlock[]

    E-->>P: Display text output
```

---

## 3. Event Processing Flow

### Mermaid Specification

```mermaid
sequenceDiagram
    participant A as Action.report()
    participant EP as EventProcessor
    participant H1 as StoryHandler
    participant H2 as EntityHandler
    participant W as WorldModel
    participant TS as TextService

    A->>EP: emit(if.event.taken)

    Note over EP: Process single event

    EP->>H1: glacierHandler(event)
    H1->>H1: Check: is torch + glacier?
    H1-->>EP: No match, no reaction

    EP->>H2: entity.on.taken?
    H2-->>EP: No handler registered

    EP->>W: Apply world changes
    W-->>EP: Changes applied

    Note over EP: Example with reaction

    A->>EP: emit(if.event.thrown, {item: torch, target: glacier})

    EP->>H1: glacierHandler(event)
    H1->>H1: Match! torch + glacier
    H1->>W: setStateValue(glacier.melted, true)
    H1->>W: setExits(room, north, volcanoView)
    H1-->>EP: reaction: if.event.glacier_melts

    EP->>EP: Process reaction event recursively
    EP->>W: Apply all changes

    EP-->>A: ProcessedResult

    Note over TS: Later in turn cycle

    TS->>TS: Filter events
    TS->>TS: Sort for narrative
    TS->>TS: Generate text
```

---

## 4. Entity Composition (Class Diagram)

### Mermaid Specification

```mermaid
classDiagram
    class IEntity {
        +string id
        +string type
        +string displayName
        +Map~string,ITrait~ traits
        +EventHandlerMap on
        +add(trait: ITrait)
        +get(traitType: string): ITrait
        +has(traitType: string): boolean
    }

    class ITrait {
        <<interface>>
        +string type
    }

    class ContainerTrait {
        +type = "container"
        +number capacity
        +boolean isOpen
    }

    class OpenableTrait {
        +type = "openable"
        +boolean isOpen
    }

    class LockableTrait {
        +type = "lockable"
        +boolean isLocked
        +string keyId
    }

    class SwitchableTrait {
        +type = "switchable"
        +boolean isOn
    }

    class LightSourceTrait {
        +type = "lightSource"
        +number brightness
    }

    class SceneryTrait {
        +type = "scenery"
    }

    class ActorTrait {
        +type = "actor"
    }

    class NpcTrait {
        +type = "npc"
        +NpcBehavior behavior
        +string hostility
        +string[] allowedRooms
    }

    class CapabilityBehavior {
        <<interface>>
        +validate()
        +execute()
        +report()
        +blocked()
    }

    class BasketElevatorTrait {
        +type = "dungeo.basket_elevator"
        +capabilities = [lowering, raising]
        +string position
        +string topRoomId
        +string bottomRoomId
    }

    IEntity "1" *-- "many" ITrait : contains
    ITrait <|-- ContainerTrait
    ITrait <|-- OpenableTrait
    ITrait <|-- LockableTrait
    ITrait <|-- SwitchableTrait
    ITrait <|-- LightSourceTrait
    ITrait <|-- SceneryTrait
    ITrait <|-- ActorTrait
    ITrait <|-- NpcTrait
    ITrait <|-- BasketElevatorTrait

    BasketElevatorTrait ..> CapabilityBehavior : registered behavior
```

---

## 5. Capability Dispatch Flow

### Mermaid Specification

```mermaid
sequenceDiagram
    participant P as Parser
    participant CE as CommandExecutor
    participant CD as CapabilityDispatch
    participant T as BasketElevatorTrait
    participant B as BasketLoweringBehavior
    participant W as WorldModel

    P->>CE: ParsedCommand {verb: "lower", target: basket}

    CE->>CD: findCapability(basket, "if.action.lowering")
    CD->>T: Check capabilities array
    T-->>CD: ["if.action.lowering", "if.action.raising"]
    CD-->>CE: BasketElevatorTrait found

    CE->>CD: dispatchCapability(trait, behavior, context)

    CD->>B: validate(entity, world, actor, sharedData)
    B->>T: Check position === "top"
    T-->>B: position = "top"
    B-->>CD: {valid: true}

    CD->>B: execute(entity, world, actor, sharedData)
    B->>W: moveEntity(player, bottomRoom)
    B->>T: position = "bottom"
    B-->>CD: sharedData populated

    CD->>B: report(entity, world, actor, sharedData)
    B-->>CD: [if.event.lowering {from, to}]

    CD-->>CE: CapabilityResult
    CE-->>P: ActionEvents[]
```

---

## 6. Text Service Pipeline

### Mermaid Specification

```mermaid
flowchart TD
    subgraph Input
        E[Raw Events from Turn]
    end

    subgraph "Filter Stage"
        F1{Is system event?}
        F2{Is debug event?}
        F3[Pass through]
    end

    subgraph "Sort Stage (ADR-094)"
        S1[Room descriptions first]
        S2[Action success/failure]
        S3[Entity reveals]
        S4[Generic messages]
    end

    subgraph "Process Stage"
        P1[handleRoomDescription]
        P2[handleActionSuccess]
        P3[handleActionFailure]
        P4[handleEntityReveal]
        P5[handleGenericEvent]
    end

    subgraph "Assemble Stage"
        A1[Create TextBlock]
        A2[Add decorations]
        A3[Apply formatting]
    end

    subgraph Output
        O[TextBlock array]
    end

    E --> F1
    F1 -->|Yes| X[Discard]
    F1 -->|No| F2
    F2 -->|Yes| X
    F2 -->|No| F3

    F3 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> S4

    S4 --> P1
    S4 --> P2
    S4 --> P3
    S4 --> P4
    S4 --> P5

    P1 --> A1
    P2 --> A1
    P3 --> A1
    P4 --> A1
    P5 --> A1

    A1 --> A2
    A2 --> A3
    A3 --> O
```

---

## 7. Save/Restore Flow (Browser)

### Mermaid Specification

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Browser UI
    participant E as GameEngine
    participant H as SaveRestoreHooks
    participant LS as localStorage
    participant W as WorldModel

    Note over U,W: SAVE FLOW

    U->>UI: Click Save or type "save"
    UI->>E: executeTurn("save")
    E->>H: onSaveRequested()

    H->>UI: showSaveDialog()
    UI-->>U: Display save slots
    U->>UI: Enter name, click Save

    H->>W: captureWorldState()
    W-->>H: {locations, traits}

    H->>LS: setItem("dungeo-save-{name}", data)
    H->>LS: updateSaveIndex(meta)

    H-->>E: Save complete
    E-->>UI: Display "[Game saved]"

    Note over U,W: RESTORE FLOW

    U->>UI: Type "restore"
    UI->>E: executeTurn("restore")
    E->>H: onRestoreRequested()

    H->>UI: showRestoreDialog()
    H->>LS: getSaveIndex()
    LS-->>H: SaveSlotMeta[]
    UI-->>U: Display available saves

    U->>UI: Select slot, click Restore

    H->>LS: getItem("dungeo-save-{name}")
    LS-->>H: BrowserSaveData

    H->>W: restoreWorldState(data)
    W->>W: Restore locations
    W->>W: Restore trait data

    H->>E: executeTurn("look")
    E-->>UI: Display current room

    Note over U,W: AUTO-SAVE (per turn)

    E->>H: performAutoSave()
    H->>W: captureWorldState()
    H->>LS: setItem("dungeo-save-autosave", data)
```

---

## 8. Grammar Resolution Flowchart

### Mermaid Specification

```mermaid
flowchart TD
    subgraph Input
        I[Player Input: "put ball in box"]
    end

    subgraph Tokenization
        T1[Tokenize input]
        T2[Normalize: lowercase, strip articles]
    end

    subgraph "Pattern Matching"
        P1{Match against patterns}
        P2[Pattern: "put :item in :container"]
        P3[Pattern: "put :item on :surface"]
        P4[Pattern: "put down :item"]
    end

    subgraph "Slot Resolution"
        S1[Resolve :item in scope]
        S2[Resolve :container in scope]
        S3{Entities found?}
    end

    subgraph "Constraint Checking"
        C1{Item is portable?}
        C2{Container visible?}
        C3{Container is open?}
    end

    subgraph "Disambiguation"
        D1{Multiple matches?}
        D2[Score by proximity]
        D3[Score by recent use]
        D4{Still ambiguous?}
        D5[Ask player]
    end

    subgraph Output
        O1[ParsedCommand]
        O2[ParseError]
    end

    I --> T1
    T1 --> T2
    T2 --> P1

    P1 --> P2
    P1 --> P3
    P1 --> P4

    P2 -->|Best match| S1
    S1 --> S2
    S2 --> S3

    S3 -->|Yes| C1
    S3 -->|No| O2

    C1 -->|Yes| C2
    C1 -->|No| O2

    C2 -->|Yes| C3
    C2 -->|No| O2

    C3 -->|Yes| D1
    C3 -->|No| O2

    D1 -->|No| O1
    D1 -->|Yes| D2
    D2 --> D3
    D3 --> D4

    D4 -->|No| O1
    D4 -->|Yes| D5
    D5 --> O1
```

---

## 9. Four-Phase Action Pattern

### Mermaid Specification

```mermaid
stateDiagram-v2
    [*] --> Validate

    Validate --> Execute: valid = true
    Validate --> Blocked: valid = false

    Execute --> Report: success
    Execute --> Blocked: error

    Report --> [*]: events emitted
    Blocked --> [*]: error events emitted

    state Validate {
        [*] --> CheckScope
        CheckScope --> CheckPortable
        CheckPortable --> CheckContainer
        CheckContainer --> ReturnResult
    }

    state Execute {
        [*] --> SetSharedData
        SetSharedData --> MutateWorld
        MutateWorld --> RecordChanges
    }

    state Report {
        [*] --> CreateDomainEvent
        CreateDomainEvent --> CreateSuccessEvent
        CreateSuccessEvent --> ReturnEvents
    }

    state Blocked {
        [*] --> GetErrorType
        GetErrorType --> CreateBlockedEvent
        CreateBlockedEvent --> ReturnBlockedEvents
    }
```

---

## Usage Notes

### Rendering with Mermaid

1. **VS Code**: Install Mermaid Preview extension
2. **GitHub**: Mermaid diagrams render automatically in markdown
3. **CLI**: Use `mmdc` (Mermaid CLI) to generate PNG/SVG:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   mmdc -i diagram.md -o diagram.png
   ```

### Rendering with PlantUML

Convert Mermaid to PlantUML using online converters or rewrite manually. PlantUML offers more control over layout but requires Java.

### Embedding in Documentation

For architecture documentation, prefer:
- SVG output for scalability
- PNG for compatibility
- Live Mermaid for GitHub markdown

---

## Diagram Maintenance

When updating diagrams:
1. Verify against current codebase
2. Update version date in diagram title
3. Cross-reference with ADRs
4. Include in architecture review updates
