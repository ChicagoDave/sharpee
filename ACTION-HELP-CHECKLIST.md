# Action Help Implementation Checklist

## Overview
Each action needs help text added to support the self-inflating help system.

## Implementation Requirements

### 1. Add to Language File
Each action's language file needs the `help` property updated with:
- `description`: Brief description of what the action does
- `examples`: Comma-separated list of example commands
- `summary`: One-line help in format "VERB/ALIASES - Description. Example: COMMAND"

### 2. Help Property Structure
```typescript
help: {
  description: 'Pick up objects and add them to your inventory.',
  examples: 'take book, get lamp, pick up the key, grab sword',
  summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
}
```

### 3. Language Provider Integration
The `EnglishLanguageProvider.getActionHelp(actionId)` method:
- Extracts verbs from the `patterns` array
- Returns structured `ActionHelp` object with:
  - `description`: From help.description
  - `verbs`: Extracted from patterns (e.g., ['TAKE', 'GET', 'PICK'])
  - `examples`: Parsed from help.examples
  - `summary`: From help.summary

## Actions Checklist

### ✅ Object Manipulation (11/11) ✓ COMPLETE
- [x] taking.ts - "TAKE/GET/PICK UP - Pick up objects. Example: TAKE LAMP"
- [x] dropping.ts - "DROP/PUT DOWN - Drop objects. Example: DROP SWORD"
- [x] examining.ts - "EXAMINE/X/LOOK AT - Look closely at objects. Example: X BOOK"
- [x] opening.ts - "OPEN - Open containers and doors. Example: OPEN DOOR"
- [x] closing.ts - "CLOSE/SHUT - Close containers and doors. Example: CLOSE BOX"
- [x] locking.ts - "LOCK - Lock things with keys. Example: LOCK DOOR WITH KEY"
- [x] unlocking.ts - "UNLOCK - Unlock things with keys. Example: UNLOCK CHEST WITH KEY"
- [x] inserting.ts - "INSERT/PUT IN - Put objects in containers. Example: PUT COIN IN SLOT"
- [x] removing.ts - "REMOVE/TAKE FROM - Take objects from containers. Example: TAKE BOOK FROM SHELF"
- [x] putting.ts - "PUT ON - Put objects on surfaces. Example: PUT VASE ON TABLE"
- [x] giving.ts - "GIVE TO - Give objects to characters. Example: GIVE FLOWER TO ALICE"
- [x] showing.ts - "SHOW TO - Show objects to characters. Example: SHOW BADGE TO GUARD"

### ✅ Movement & Navigation (5/5) ✓ COMPLETE
- [x] going.ts - "GO/N/S/E/W - Move in compass directions or to connected locations. Example: GO NORTH or N"
- [x] entering.ts - "ENTER/GET IN - Enter containers, vehicles, or furniture that can hold you. Example: ENTER CAR"
- [x] exiting.ts - "EXIT/LEAVE/GET OUT - Exit from containers, vehicles, or furniture you are inside. Example: EXIT"
- [x] climbing.ts - "CLIMB - Climb objects or move in vertical directions. Example: CLIMB LADDER"
- [x] looking.ts - "LOOK/L - Look around the current location to see what is there. Example: LOOK"

### ✅ Character Actions (7/7) ✓ COMPLETE
- [x] wearing.ts - "WEAR/PUT ON - Wear clothing or accessories that you are carrying. Example: WEAR HAT"
- [x] taking_off.ts - "TAKE OFF/REMOVE - Remove worn clothing or accessories. Example: TAKE OFF COAT"
- [x] eating.ts - "EAT - Eat edible items to satisfy hunger or gain effects. Example: EAT APPLE"
- [x] drinking.ts - "DRINK - Drink liquids to quench thirst or gain effects. Example: DRINK WATER"
- [x] touching.ts - "TOUCH/FEEL - Touch objects to discover their texture, temperature, or other tactile properties. Example: TOUCH STONE"
- [x] smelling.ts - "SMELL/SNIFF - Smell objects or detect scents in your current location. Example: SMELL FLOWER"
- [x] listening.ts - "LISTEN - Listen for sounds in the environment or from specific objects. Example: LISTEN TO RADIO"

### ✅ Communication (4/4) ✓ COMPLETE
- [x] talking.ts - "TALK TO - Start a conversation with another character. Example: TALK TO MERCHANT"
- [x] asking.ts - "ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE"
- [x] telling.ts - "TELL ABOUT - Tell characters about topics or give them information. Example: TELL ALICE ABOUT KEY"
- [x] answering.ts - "ANSWER/SAY - Answer questions that have been asked of you. Example: SAY YES"

### ✅ Combat & Physical (5/5) ✓ COMPLETE
- [x] attacking.ts - "ATTACK/HIT/FIGHT - Attack creatures or attempt to break objects. Example: ATTACK TROLL"
- [x] throwing.ts - "THROW AT - Throw objects at targets, in directions, or just drop them forcefully. Example: THROW ROCK AT WINDOW"
- [x] pushing.ts - "PUSH/PRESS - Push objects, press buttons, or move heavy items. Example: PUSH BUTTON"
- [x] pulling.ts - "PULL/DRAG - Pull objects, levers, cords, or drag heavy items. Example: PULL LEVER"
- [x] turning.ts - "TURN/ROTATE - Turn dials, knobs, wheels, cranks, or keys to operate mechanisms. Example: TURN DIAL TO 5"

### ✅ Device Interaction (3/3) ✓ COMPLETE
- [x] switching_on.ts - "TURN ON/SWITCH ON - Turn on devices, lights, and other switchable objects. Example: TURN ON LAMP"
- [x] switching_off.ts - "TURN OFF/SWITCH OFF - Turn off devices, lights, and other switchable objects. Example: TURN OFF RADIO"
- [x] using.ts - "USE/OPERATE - Use objects in various ways, or use one object with another. Example: USE KEY ON DOOR"

### ✅ Information & Meta (7/7) ✓ COMPLETE
- [x] inventory.ts - "INVENTORY/I - Check what you are carrying and wearing. Example: I"
- [x] scoring.ts - "SCORE - Display your current score and game progress. Example: SCORE"
- [x] help.ts - "HELP - Get help on game commands and topics. Example: HELP MOVEMENT"
- [x] about.ts - "ABOUT/INFO - Display information about the game, including credits and version. Example: ABOUT"
- [x] saving.ts - "SAVE - Save your current game progress. Example: SAVE"
- [x] restoring.ts - "RESTORE/LOAD - Restore a previously saved game. Example: RESTORE"
- [x] quitting.ts - "QUIT/EXIT - Quit the game. You will be asked to confirm. Example: QUIT"

### ✅ Exploration (1/1) ✓ COMPLETE
- [x] searching.ts - "SEARCH/LOOK IN - Search objects or locations for hidden items or additional details. Example: SEARCH DESK"

### ✅ Miscellaneous (2/2) ✓ COMPLETE
- [x] waiting.ts - "WAIT/Z - Wait for time to pass without doing anything. Example: Z"
- [x] sleeping.ts - "SLEEP/NAP - Sleep or take a nap to pass time. Example: SLEEP"

## Implementation Example

```typescript
// In lang-en-us/src/actions/taking.ts:
export const takingLanguage = {
  actionId: 'if.action.taking',
  
  patterns: [
    'take [something]',
    'get [something]',
    'pick up [something]',
    'grab [something]'
  ],
  
  messages: {
    'taken': 'Taken.',
    // ... other action messages
  },
  
  help: {
    description: 'Pick up objects and add them to your inventory.',
    examples: 'take book, get lamp, pick up the key, grab sword',
    summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
  }
};

// Usage in help action:
const helpInfo = languageProvider.getActionHelp('if.action.taking');
// Returns:
// {
//   description: 'Pick up objects and add them to your inventory.',
//   verbs: ['TAKE', 'GET', 'PICK', 'GRAB'],
//   examples: ['take book', 'get lamp', 'pick up the key', 'grab sword'],
//   summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
// }
```

## Progress
- Total actions: 46
- Help implemented: 46
- Remaining: 0

✅ **ALL ACTIONS COMPLETE!**
