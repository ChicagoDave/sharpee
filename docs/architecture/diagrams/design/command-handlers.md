Let's create a more detailed checklist for command handlers that captures the full range of standard interactive fiction verbs. This will help track progress and ensure we have comprehensive coverage for the standard library.

## Updated Command Handler Checklist

### 1. Core Command System
- [x] Command router implementation
- [x] Base command handler class
- [x] Command execution hooks
- [x] Command validation framework

### 2. Navigation Handlers
- [ ] **Movement Handler**
  - [ ] Cardinal directions (N, S, E, W, NE, NW, SE, SW)
  - [ ] Vertical movement (Up, Down)
  - [ ] In/Out movement
  - [ ] Enter/Exit specific locations
  - [ ] Custom movement verbs (Go To)
  - [ ] Path finding for known routes
  
- [ ] **Door Handler**
  - [ ] Open/Close doors
  - [ ] Lock/Unlock doors with keys
  - [ ] Handle secret/hidden doors

### 3. Object Interaction Handlers
- [x] **Look/Examine Handler**
  - [x] Look around (no object)
  - [x] Examine specific objects
  - [x] Describe containers and their contents
  - [x] List exits

- [ ] **Inventory Management Handlers**
  - [ ] **Take/Get Handler**
    - [ ] Basic taking of objects
    - [ ] Taking from containers
    - [ ] Taking multiple objects
    - [ ] Taking all
    - [ ] Handle weight/volume limitations
  
  - [ ] **Drop Handler**
    - [ ] Basic dropping of objects
    - [ ] Dropping multiple objects
    - [ ] Dropping all
  
  - [ ] **Inventory Handler**
    - [ ] List inventory
    - [ ] Categorize items
    - [ ] Show item details

- [ ] **Container Handlers**
  - [ ] **Put/Place Handler**
    - [ ] Put items in containers
    - [ ] Put items on surfaces
    - [ ] Handle container capacity
  
  - [ ] **Open/Close Handler**
    - [ ] Open containers
    - [ ] Close containers
    - [ ] Handle locked containers

- [ ] **Manipulation Handlers**
  - [ ] **Push/Pull Handler**
    - [ ] Move objects
    - [ ] Activate mechanisms
  
  - [ ] **Turn/Rotate Handler**
    - [ ] Turn objects
    - [ ] Turn devices on/off
  
  - [ ] **Use Handler**
    - [ ] Use objects on their own
    - [ ] Use objects with other objects

### 4. Communication Handlers
- [ ] **Talk/Speak Handler**
  - [ ] Basic conversation
  - [ ] Topic-based dialogue
  - [ ] ASK/TELL conversation model
  
- [ ] **Show/Give Handler**
  - [ ] Show objects to NPCs
  - [ ] Give objects to NPCs
  - [ ] Handle NPC responses

### 5. Information Handlers
- [ ] **Help Handler**
  - [ ] General help
  - [ ] Context-sensitive help
  - [ ] Command syntax help
  
- [ ] **Hint Handler**
  - [ ] Progression-based hints
  - [ ] Object-specific hints

### 6. Meta Handlers
- [ ] **Save/Load Handler**
  - [ ] Save game state
  - [ ] Load game state
  - [ ] List saved games
  
- [ ] **Undo/Redo Handler**
  - [ ] Undo last command
  - [ ] Redo previously undone command
  
- [ ] **Quit/Restart Handler**
  - [ ] Quit game
  - [ ] Restart game
  
- [ ] **Settings Handler**
  - [ ] Adjust game settings
  - [ ] Toggle features

### 7. Special Action Handlers
- [ ] **Searching Handler**
  - [ ] Search locations/objects
  - [ ] Find hidden items
  
- [ ] **Reading Handler**
  - [ ] Read documents/inscriptions
  - [ ] Handle books/scrolls
  
- [ ] **Eating/Drinking Handler**
  - [ ] Consume food/drinks
  - [ ] Handle effects

### 8. Specialized Handlers (for Reflections)
- [ ] **Mirror Ability Handler**
  - [ ] Connect mirrors
  - [ ] Travel through mirrors
  
- [ ] **Other Ability Handlers**
  - [ ] Earth ability
  - [ ] Moon ability
  - [ ] Light ability

### 9. Fallback & Not Understood Handlers
- [ ] **Default Handler**
  - [ ] Handle common but unimplemented verbs
  - [ ] Provide helpful responses
  
- [ ] **Not Understood Handler**
  - [ ] Provide helpful error messages
  - [ ] Suggest similar commands

This detailed checklist provides a comprehensive roadmap for implementing the standard command handlers. Each handler category represents a group of related commands that would likely share implementation details and game logic.

For implementation, I'd recommend prioritizing the most common handlers first:
1. Navigation (Movement)
2. Object Interaction (Take/Drop/Inventory)
3. Container Manipulation (Open/Close/Put)
4. Meta Commands (Save/Load/Quit)

Then move to the more specialized handlers as needed for specific story implementations.