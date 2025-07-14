# Doors and Rooms Architecture

## Status: INCOMPLETE - Missing Original Design Conversation

## What We Know From Other Decisions

### Room Design (from various files)
- Rooms are entities in the graph (nodes)
- Rooms use graph edges for relationships, not internal storage
- Room contents determined by graph queries
- Rooms can use addToScope() for custom visibility

### Exit Design (from batch reviews)
- Exits are edges between room nodes
- Bidirectional edges created automatically (reverse connections)
- Edge types use relation properties: "exit"/"entrance"
- Exits can be:
  - Hidden
  - Blocked (with reason)
  - Associated with doors
  - Unidirectional or bidirectional

### Door Design (from batch 12, file 112)
- Door class connects two Rooms
- First room required, second can be added later or null (opens to wall)
- Door as first-class object in graph model
- Doors can be:
  - Opened/closed (OpenableTrait)
  - Locked/unlocked (LockableTrait)
  - Connected (both sides open/close together)

### Implementation Details (from action code)
- Doors stored as entity IDs on exits
- Movement checks door state before allowing passage
- Connected doors synchronize state changes

## Missing Information

The user mentioned a conversation that:
1. Started with "scenarios"
2. Led to a "firm design" for doors and rooms

This conversation likely contains:
- Specific scenarios that drove the design
- Design decisions about door/room relationships
- Edge cases and how they're handled
- The rationale for the current architecture

## Questions Needing Answers

1. How are one-way doors handled?
2. Can a door connect more than two rooms?
3. How are secret doors implemented?
4. What about doors that lead to different rooms based on state?
5. How do we handle doors within rooms (like closet doors)?
6. What about exits without doors (archways, paths)?

## Current Understanding

Based on the code and scattered references:
- Exits are edges with optional door entities
- Doors are separate entities that can be manipulated
- Rooms don't store their exits directly (graph does)
- Bidirectional connections are the default