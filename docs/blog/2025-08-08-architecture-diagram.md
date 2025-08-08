# Sharpee's New Layered Architecture

*Companion diagram for "The Dynamic Refactoring Journey" blog post*

## Dependency Flow (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────┐
│                      STORIES / GAMES                        │
│                                                             │
│  • Cloak of Darkness  • Your Custom Story  • Examples       │
│                                                             │
│  Dependencies: Platform Package + Extensions                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM PACKAGES                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   CLI    │  │   Web    │  │ Discord  │  │  Custom  │     │
│  │ Platform │  │ Platform │  │ Platform │  │ Platform │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  Each includes: Parser + Language + Platform Code           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        EXTENSIONS                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Lighting │  │  Magic   │  │  Combat  │  │  Custom  │     │
│  │   Ext    │  │   Ext    │  │   Ext    │  │   Ext    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  Optional packages that add new capabilities                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    STANDARD LIBRARY                         │
│                                                             │
│  • Core Actions (take, drop, look, examine, go)             │
│  • Navigation & Movement                                    │
│  • Container & Surface Behaviors                            │
│  • Save/Restore/Undo                                        │
│  • Standard Traits & Behaviors                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LANGUAGE LAYER                           │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │   Parser (en-US)    │  │  Language Provider  │           │
│  │                     │  │      (en-US)        │           │
│  │ • Tokenization      │  │ • Messages          │           │
│  │ • Grammar           │  │ • Patterns          │           │
│  │ • Validation        │  │ • Help Text         │           │
│  └─────────────────────┘  └─────────────────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      WORLD MODEL                            │
│                                                             │
│  • Entity System (Rooms, Items, Actors)                     │
│  • Trait System (Container, Wearable, Lockable)             │
│  • Spatial Relationships                                    │
│  • State Management                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      CORE ENGINE                            │
│                                                             │
│  • Event System & Event Source                              │
│  • Command Executor                                         │
│  • Turn Management                                          │
│  • Query System                                             │
│  • Capability System                                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Changes from Dynamic Loading

### Before (Dynamic)
```
Story → Runtime loads Parser/Language → Unpredictable
         ↓
    Tests fail randomly
```

### After (Static)
```
Platform Package → Includes Parser/Language → Predictable
         ↓
    Tests pass consistently
```

## Extension Points

Each layer provides specific extension capabilities:

- **Core Engine**: New event types, capabilities
- **World Model**: Custom traits, behaviors
- **Language Layer**: Vocabulary, patterns, messages via extension methods
- **Standard Library**: Override default actions
- **Extensions**: Add domain-specific features
- **Platform Packages**: Platform-specific UI and I/O
- **Stories**: Combine all layers into experiences

## Build-Time vs Runtime

```
BUILD TIME (Static)
├── Platform chooses parser/language
├── Extensions are bundled
└── Type checking ensures compatibility

RUNTIME (Dynamic Extensions)
├── Stories can add vocabulary
├── Extensions can register new patterns
└── But core dependencies are fixed
```

This architecture gives us the best of both worlds: predictable builds with flexible runtime extension.