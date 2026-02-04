# Sharpee Architecture - Simplified

```
┌──────────────────────────────────────┐
│         STORIES & GAMES              │
│     (Cloak of Darkness, etc.)        │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│        PLATFORM PACKAGES             │
│    (CLI, Web, Discord, Custom)       │
│   [Parser + Language + Platform]     │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│           EXTENSIONS                 │
│   (Lighting, Magic, Combat, etc.)    │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│        STANDARD LIBRARY              │
│   (Actions, Traits, Behaviors)       │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│         LANGUAGE LAYER               │
│     Parser + Language Provider       │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│          WORLD MODEL                 │
│    (Entities, Traits, Space)         │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼─────────────────────┐
│          CORE ENGINE                 │
│   (Events, Commands, Turns)          │
└──────────────────────────────────────┘

Build-time: Static dependencies ↑
Runtime: Dynamic extensions →
```