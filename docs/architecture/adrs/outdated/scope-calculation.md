# Scope Calculation

## Description
Scope determines what objects are available for the current command. It starts from the player's location and expands through visibility rules and custom additions. Must be fully calculated before command validation.

## Calculation Order
1. **Base Scope** - Player's current room
2. **Room Contents** - All objects in the room
3. **Container Rules** - Open containers reveal contents, closed containers hide them
4. **Supporter Rules** - Objects on supporters are visible
5. **Custom Additions** - Room.addToScope() can add remote objects
6. **Recursive Expansion** - Each added object can add more via its own addToScope()
7. **Player Inventory** - Always in scope

## Scenarios
- Player in kitchen → Scope includes kitchen, table, apple on table
- Closed box on table → Box in scope, contents are not
- Open box on table → Box in scope, contents ARE in scope
- Glass booth in room → booth.addToScope() adds objects visible through glass
- Control room → room.addToScope() adds reactor in distant room (visible through window)
- Darkness → Scope limited to carried light sources and self
- Never: Execute commands on out-of-scope objects
- Never: Scope changes during command execution
- Never: Skip scope calculation for "optimization"
