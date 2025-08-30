# Why EntryTrait is Unnecessary Complexity

## The Fundamental Insight

You're absolutely right - in IF, the player is ALWAYS in a location (room/container/supporter). The entering/exiting actions are about **moving between locations**, not about some special "entry" property.

---

## The Real IF Model

### What Actually Happens

```
Living Room (ROOM)
  Closet (CONTAINER, enterable=true)
  Chair (SUPPORTER, enterable=true)
  Box (CONTAINER, enterable=false)

> enter closet
You are now in: Closet (which is in: Living Room)

> exit
You are now in: Living Room

> sit on chair  // This is just "enter chair" with flavor
You are now on: Chair (which is in: Living Room)
```

### The Truth About IF Locations

**EVERY location in IF is one of:**
1. **Room** - Top-level location
2. **Container** (enterable) - A location inside something else
3. **Supporter** (enterable) - A location on top of something else

That's it. No special "entry" concept needed.

---

## Why EntryTrait is Bad Design

### Current Over-Engineered Approach

```typescript
interface EntryTrait {
  canEnter: boolean;
  occupants: string[];
  maxOccupants?: number;
  enterMessage?: string;
  exitMessage?: string;
  preposition?: 'in' | 'on';
  posture?: string;
  // ... more complexity
}
```

### What We Actually Need

```typescript
interface Container {
  enterable: boolean;  // That's it!
  // Maybe:
  capacity?: number;   // For size/weight limits
}

interface Supporter {
  enterable: boolean;  // That's it!
}
```

---

## The Simplified Model

### Entering Logic

```typescript
function canEnter(target: Entity): boolean {
  // Rooms cannot be entered (you go to them)
  if (target.type === 'ROOM') return false;
  
  // Containers can be entered if marked enterable
  if (target.has(TraitType.CONTAINER)) {
    return target.get(TraitType.CONTAINER).enterable;
  }
  
  // Supporters can be entered if marked enterable
  if (target.has(TraitType.SUPPORTER)) {
    return target.get(TraitType.SUPPORTER).enterable;
  }
  
  return false;
}
```

### Exiting Logic

```typescript
function canExit(actor: Entity): boolean {
  const location = world.getLocation(actor);
  // Can exit if not in a room
  return location.type !== 'ROOM';
}
```

---

## What EntryTrait Was Trying to Solve (Badly)

### 1. Occupancy Tracking
**EntryTrait approach**: Maintain separate occupants list
```typescript
entryTrait.occupants = ['player', 'npc1'];
```

**Better approach**: Use world model
```typescript
world.getContents(container.id).filter(e => e.type === 'ACTOR');
```

### 2. Custom Messages
**EntryTrait approach**: Store in trait
```typescript
entryTrait.enterMessage = "You squeeze into the phone booth.";
```

**Better approach**: Event handlers
```typescript
container.on('enter', (actor) => {
  return "You squeeze into the phone booth.";
});
```

### 3. Posture
**EntryTrait approach**: Store in trait
```typescript
entryTrait.posture = 'sitting';
```

**Better approach**: Supporter property
```typescript
chair.supporter.forcedPosture = 'sitting';
```

---

## The Damage EntryTrait Causes

### 1. Redundant State
```typescript
// Same information in multiple places
entryTrait.occupants = ['player'];
world.location['player'] = 'container';
// Which is truth?
```

### 2. Unnecessary Behaviors
```typescript
EntryBehavior.enter();  // Why?
EntryBehavior.exit();   // Just use world.moveEntity()!
```

### 3. Complex Validation
```typescript
// Current mess:
if (target.has(TraitType.ENTRY)) {
  if (!EntryBehavior.canEnter(target, actor)) {
    const reason = EntryBehavior.getBlockedReason(target, actor);
    // ... 50 lines of complex logic
  }
}

// Should be:
if (target.has(TraitType.CONTAINER) && target.container.enterable) {
  world.moveEntity(actor, target);
}
```

---

## The Correct IF Model

### Spatial Hierarchy
```
World
  └── Room (Garden)
      ├── Container (Shed) [enterable=true]
      │   └── Actor (Player) ← "in the shed"
      └── Supporter (Bench) [enterable=true]
          └── Actor (NPC) ← "on the bench"
```

### Movement Commands
- **GO [direction]** - Move between rooms
- **ENTER [container/supporter]** - Move into/onto something
- **EXIT** - Move to parent location
- **GET IN/ON** - Synonyms for ENTER
- **GET OUT/OFF** - Synonyms for EXIT

### That's All!

No special traits, no complex behaviors, just:
1. Check if target is enterable container/supporter
2. Move actor to target (or parent for exit)
3. Generate appropriate messages

---

## Recommendation: Delete EntryTrait

### Remove
- `EntryTrait` interface
- `EntryBehavior` class
- All the complex validation
- Redundant occupants tracking

### Keep/Add
- `container.enterable: boolean`
- `supporter.enterable: boolean`
- Use `world.moveEntity()` for ALL movement
- Use `world.getContents()` for occupancy

### Result
- 200+ lines of code removed
- No redundant state
- Simpler mental model
- Easier to debug
- More IF-authentic

---

## The IF Wisdom

Classic IF games (Zork, Infocom, etc.) got this right:
- Locations are just nodes in a graph
- Containers and supporters ARE locations when enterable
- No special "entry" concept needed
- Movement is just changing parent node

We've been over-engineering what Infocom solved in the 1980s with simple parent-child relationships.

**The real model is beautifully simple:**
```
Everything is somewhere.
Some things can contain other things.
The player moves between containers.
```

That's it. That's all IF needs.