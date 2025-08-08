# Text Service Separation

## Description
Text generation is completely separate from game logic and runs after all world model changes are complete.

## Design
- **Post-Turn Only** - Text service runs after all events processed
- **Query-Based** - Pulls state from world model to fill templates
- **Multi-Language** - Templates can be swapped for different languages
- **No Logic** - Text service never makes game decisions

## Scenarios
- All events fire → World model reaches final state → Text service queries → Messages generated
- Template: "[actor] takes [object]" → Queries actor.name and object.name
- Never: Text generated during event handling
- Never: Game logic in templates
