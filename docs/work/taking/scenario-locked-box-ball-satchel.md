# Scenario: Locked Box, Ball, and Satchel

## Setup
- Player is in a room
- Room contains a closed, locked box
- Box contains a ball (not visible yet)
- Player is wearing a satchel

## Command Sequence and Events

---

### 1. Player opens the box (FAILS - it's locked)

**Command**: `open box`
**Action**: opening

**Events**:
```typescript
// Validation fails - box is locked
action.error {
  actionId: "opening",
  messageId: "locked",
  params: {
    container: "box"
  }
}
```

**Text Service**:
```typescript
// Looks up message template
languageProvider.getMessage("opening.locked") 
// OR falls back to
languageProvider.getMessage("locked")
// Returns: "It seems to be locked."
```

**Output**: "It seems to be locked."

---

### 2. Player unlocks the box (assuming they have the key)

**Command**: `unlock box with key`
**Action**: unlocking

**Events**:
```typescript
// World layer (proposed)
world.entity.changed {
  entityId: "box",
  trait: "lockable",
  property: "locked",
  oldValue: true,
  newValue: false
}

// Action layer
if.event.unlocked {
  container: "box",
  key: "key",
  containerSnapshot: {...},
  keySnapshot: {...}
}

action.success {
  actionId: "unlocking",
  messageId: "unlocked",
  params: {
    container: "box"
  }
}
```

**Text Service**:
```typescript
getMessage("unlocking.unlocked", {container: "box"})
// Returns: "You unlock the {container}."
// After substitution: "You unlock the box."
```

**Output**: "You unlock the box."

---

### 3. Player opens the box

**Command**: `open box`
**Action**: opening

**Events**:
```typescript
// World layer
world.entity.changed {
  entityId: "box",
  trait: "openable",
  property: "isOpen",
  oldValue: false,
  newValue: true
}

// Action layer
if.event.opened {
  container: "box",
  containerSnapshot: {...},
  revealedContents: ["ball"]  // Now visible!
}

action.success {
  actionId: "opening",
  messageId: "opened_revealing",  // or just "opened"
  params: {
    container: "box",
    contents: "a ball"
  }
}
```

**Text Service**:
```typescript
getMessage("opening.opened_revealing", {
  container: "box",
  contents: "a ball"
})
// Returns: "You open the {container}, revealing {contents}."
// After substitution: "You open the box, revealing a ball."
```

**Output**: "You open the box, revealing a ball."

---

### 4. Player takes the ball

**Command**: `take ball`
**Action**: taking

**Events**:
```typescript
// World layer
world.entity.moved {
  entityId: "ball",
  fromLocation: "box",
  toLocation: "player",
  fromContainer: true,
  toActor: true
}

// Action layer  
if.event.taken {
  item: "ball",
  itemSnapshot: {...},
  actorSnapshot: {...},
  fromContainer: true,
  container: "box"
}

action.success {
  actionId: "taking",
  messageId: "taken_from",
  params: {
    item: "ball",
    container: "box"
  }
}
```

**Text Service**:
```typescript
getMessage("taking.taken_from", {
  item: "ball",
  container: "box"
})
// Returns: "You take {item} from {container}."
// After substitution: "You take the ball from the box."
```

**Output**: "You take the ball from the box."

---

### 5. Player puts ball in satchel

**Command**: `put ball in satchel`
**Action**: putting (or inserting)

**Events**:
```typescript
// World layer
world.entity.moved {
  entityId: "ball",
  fromLocation: "player",
  toLocation: "satchel",
  fromActor: true,
  toContainer: true
}

// Action layer
if.event.put {
  item: "ball",
  container: "satchel",
  itemSnapshot: {...},
  containerSnapshot: {...}
}

action.success {
  actionId: "putting",
  messageId: "put_in",
  params: {
    item: "ball",
    container: "satchel"
  }
}
```

**Text Service**:
```typescript
getMessage("putting.put_in", {
  item: "ball",
  container: "satchel"
})
// Returns: "You put {item} in {container}."
// After substitution: "You put the ball in the satchel."
```

**Output**: "You put the ball in the satchel."

---

## Complete Event Stream

### World Events (Factual)
1. `world.entity.changed` - box.locked: true → false
2. `world.entity.changed` - box.isOpen: false → true
3. `world.entity.moved` - ball: box → player
4. `world.entity.moved` - ball: player → satchel

### Action Events (Semantic)
1. `action.error` - can't open locked box
2. `if.event.unlocked` + `action.success` - unlocked box
3. `if.event.opened` + `action.success` - opened box
4. `if.event.taken` + `action.success` - took ball
5. `if.event.put` + `action.success` - put ball in satchel

### Text Construction Pattern

```typescript
class TextService {
  handleActionSuccess(event: ActionSuccessEvent) {
    // 1. Try action-specific message
    let template = getMessage(`${event.actionId}.${event.messageId}`);
    
    // 2. Fall back to general message
    if (!template) {
      template = getMessage(event.messageId);
    }
    
    // 3. Substitute parameters
    const text = substitute(template, event.params);
    
    // 4. Output
    return text;
  }
  
  substitute(template: string, params: Record<string, any>): string {
    // Replace {key} with params[key]
    return template.replace(/{(\w+)}/g, (match, key) => {
      // Handle articles (a/an), capitalization, etc.
      return formatValue(params[key]);
    });
  }
}
```

---

## Observations

1. **Rich Events Enable Rich Text**: 
   - Knowing the ball came FROM the box allows "You take the ball from the box"
   - Without that context, we'd just get "Taken."

2. **World Events for Systems**:
   - Witness system tracks that ball moved
   - Scope system updates visibility
   - But text service uses action events

3. **Message Selection**:
   - `taken` vs `taken_from` based on context
   - `opened` vs `opened_revealing` based on contents
   - Falls back gracefully if specific message not found

4. **Context Without Pollution**:
   - Each action knows its context at execution time
   - World.moveEntity returns where things moved from
   - No need to pollute context object

5. **Layered Information**:
   - World: "entity X moved from Y to Z"
   - Action: "player TOOK X from Y"
   - Text: "You take the ball from the box."