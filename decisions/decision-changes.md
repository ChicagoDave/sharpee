# Decision Changes

## Description
Track major architectural decisions that were made and later changed. Understanding why we pivoted helps avoid revisiting abandoned approaches.

## Changed Decisions

### Grammar Library Ownership (Changed)
- **Original**: Grammar library validates commands and knows about world model
- **Changed to**: Event-driven system where behaviors validate through events
- **Why**: Grammar validation tightly coupled parsing with world model state

### Story File Knowledge (Changed)
- **Original**: Story files should not know about nodes/edges of world model
- **Changed to**: Story files use traits and behaviors that abstract the graph
- **Why**: Direct graph manipulation was too low-level for authors

### Execution Flow (Changed)
- **Original**: Parser → Grammar validation → Execute routine → Update world model
- **Changed to**: Parser → Events → Behaviors → State changes → More events
- **Why**: Linear execution couldn't handle cascading effects and complex interactions

### World Model Queries (Changed)
- **Original**: Direct LINQ queries against graph structure
- **Changed to**: Query through world model API after events complete
- **Why**: Direct queries during execution could see inconsistent state

## Patterns
- Early decisions often focused on separation but were too rigid
- Evolution toward event-driven allowed better decoupling
- Author experience drove many changes (too complex → simpler abstractions)
