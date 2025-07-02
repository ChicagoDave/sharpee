# Architecture Layers

## Description
The system is organized in distinct layers that communicate through defined patterns. Events flow up, queries flow down.

## Layers
1. **Core** - Engine fundamentals (entity system, event bus)
2. **World Model** - Entities, Traits, Behaviors, and relationships
3. **Language** - Parser and grammar definitions
4. **Actions** - Commands and their event handlers
5. **Post-Processing** - Text service and output formatting

## Scenarios
- Player types "take lamp" → Parser creates TakeCommand → Handler fires events → Behaviors modify world → Text service queries final state
- Never: Text generation during action processing
- Never: Direct world model access from parser
