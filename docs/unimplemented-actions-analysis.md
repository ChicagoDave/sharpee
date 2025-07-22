# Unimplemented Actions Analysis

## Currently Implemented Standard Actions (7)

Based on the `standardActions` export:
1. **looking** (`if.action.looking`) - Look around current location
2. **inventory** (`if.action.inventory`) - Check what player is carrying
3. **taking** (`if.action.taking`) - Pick up objects
4. **dropping** (`if.action.dropping`) - Drop carried objects
5. **examining** (`if.action.examining`) - Look at objects closely
6. **opening** (`if.action.opening`) - Open containers/doors
7. **going** (`if.action.going`) - Move in directions

## Unimplemented Actions from Language Provider

The language provider (`@sharpee/lang-en-us`) defines verbs for these actions that are NOT implemented:

### Movement Actions
- **entering** (`if.action.entering`) - "enter", "go in", "go into"
- **exiting** (`if.action.exiting`) - "exit", "leave", "go out", "get out"
- **climbing** (`if.action.climbing`) - "climb", "scale", "ascend"

### Observation Actions
- **searching** (`if.action.searching`) - "search", "find", "locate"
- **listening** (`if.action.listening`) - "listen", "hear"
- **smelling** (`if.action.smelling`) - "smell", "sniff"
- **touching** (`if.action.touching`) - "touch", "feel"

### Object Manipulation
- **putting** (`if.action.putting`) - "put", "place", "put in", "put on"
- **inserting** (`if.action.inserting`) - "insert", "insert into"
- **closing** (`if.action.closing`) - "close", "shut", "cover"
- **locking** (`if.action.locking`) - "lock", "secure"
- **unlocking** (`if.action.unlocking`) - "unlock", "unsecure"

### Device Actions
- **switching_on** (`if.action.switching_on`) - "switch on", "turn on", "activate", "start"
- **switching_off** (`if.action.switching_off`) - "switch off", "turn off", "deactivate", "stop"
- **pushing** (`if.action.pushing`) - "push", "press", "shove"
- **pulling** (`if.action.pulling`) - "pull", "tug", "drag"
- **turning** (`if.action.turning`) - "turn", "rotate", "twist"
- **using** (`if.action.using`) - "use", "utilize", "employ"

### Social Actions
- **giving** (`if.action.giving`) - "give", "hand", "offer"
- **showing** (`if.action.showing`) - "show", "display", "present"
- **throwing** (`if.action.throwing`) - "throw", "toss", "hurl"
- **attacking** (`if.action.attacking`) - "attack", "hit", "strike", "fight", "kill"
- **talking** (`if.action.talking`) - "talk", "speak", "converse", "chat", "talk to"
- **asking** (`if.action.asking`) - "ask", "inquire", "question"
- **telling** (`if.action.telling`) - "tell", "inform", "say"
- **answering** (`if.action.answering`) - "answer", "respond", "reply"

### Wearable Actions
- **wearing** (`if.action.wearing`) - "wear", "put on", "don", "equip"
- **taking_off** (`if.action.taking_off`) - "remove", "take off", "doff", "unequip"

### Consumption Actions
- **eating** (`if.action.eating`) - "eat", "consume", "devour"
- **drinking** (`if.action.drinking`) - "drink", "sip", "swallow", "quaff"

### Meta Commands
- **waiting** (`if.action.waiting`) - "wait", "z"
- **saving** (`if.action.saving`) - "save", "save game"
- **restoring** (`if.action.restoring`) - "restore", "load", "load game", "restore game"
- **quitting** (`if.action.quitting`) - "quit", "q", "exit game"
- **help** (`if.action.help`) - "help", "?", "commands"
- **about** (`if.action.about`) - "about", "info", "credits"
- **scoring** (`if.action.scoring`) - "score", "points"

## Summary

- **Implemented**: 7 actions
- **Unimplemented**: 37 actions (defined in language provider but not in stdlib)

This explains why tests using verbs like "wait", "score", etc. are failing - these verbs are recognized by the parser (from the language provider) but there's no corresponding action implementation in the standard library.

## Test Implications

Tests that use these unimplemented verbs will fail at the validation stage with "Unknown action" because:
1. Parser finds the verb (e.g., "wait" → `if.action.waiting`)
2. Validator looks for action with ID `if.action.waiting` in the registry
3. Action not found → validation fails

To fix tests, either:
1. Implement the missing actions
2. Use only implemented verbs in tests
3. Mock/stub the missing actions for testing
