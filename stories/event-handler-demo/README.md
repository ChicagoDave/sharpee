# Event Handler Demo Stories

This directory contains example stories demonstrating the event handler system in Sharpee.

## Stories

### 1. Bookshelf Puzzle (`bookshelf-puzzle.ts`)

**Demonstrates: Entity-level event handlers**

A classic hidden passage puzzle where pushing the correct book opens a secret bookshelf. This story shows how individual entities can have their own event handlers that respond to player actions.

Key features:
- Different books trigger different responses when pushed
- The red book opens the bookshelf revealing a secret passage
- Shows how to modify game state in response to events
- Demonstrates the use of helper functions for simple responses

**Solution**: Push the red book to open the bookshelf, go north, take the golden artifact.

### 2. Three Statues Puzzle (`three-statues-puzzle.ts`)

**Demonstrates: Story-level event handlers (daemons)**

A temple puzzle where you must push three statues into position to open a massive door. This story shows how story-level handlers can track complex game state across multiple entities.

Key features:
- Story-level handler tracks which statues have been pushed
- Individual statue handlers provide unique feedback
- Puzzle completion triggers door opening
- Shows progress tracking (1 of 3, 2 of 3, etc.)

**Solution**: Push all three statues (warrior, scholar, thief) in any order to open the door, go north, take the Sacred Relic.

## Running the Stories

To run these stories with the Sharpee CLI:

```bash
# Build the stories first
pnpm build

# Run the bookshelf puzzle
sharpee play stories/event-handler-demo/bookshelf-puzzle.js

# Run the three statues puzzle  
sharpee play stories/event-handler-demo/three-statues-puzzle.js
```

## Key Concepts Demonstrated

### Entity-Level Handlers

```typescript
entity.on = {
  'if.event.pushed': (event) => {
    // React to being pushed
    return [/* events */];
  }
};
```

### Story-Level Handlers

```typescript
class MyStory extends StoryWithEvents {
  constructor() {
    super(config);
    
    this.on('if.event.pushed', (event) => {
      // React to any push event in the game
      return [/* events */];
    });
  }
}
```

### Helper Functions

```typescript
import { createMessageHandler } from '@sharpee/stdlib';

entity.on = {
  'if.event.examined': createMessageHandler('A detailed description.')
};
```

## Learning Path

1. **Start with Bookshelf Puzzle** - Learn how entity handlers work
2. **Move to Three Statues** - Understand story-level handlers
3. **Combine Both** - Create your own puzzles using both types

## Creating Your Own Puzzles

Use these stories as templates for your own event-driven puzzles:

1. Copy one of the example files
2. Modify the entities and handlers
3. Test your puzzle logic
4. Add complexity as needed

## Common Patterns

### Toggle Switch
```typescript
switch.on = {
  'if.event.pushed': (event) => {
    const switchable = switch.get('SWITCHABLE');
    if (switchable) {
      switchable.isOn = !switchable.isOn;
      return [/* message about state change */];
    }
  }
};
```

### Progressive Unlocking
```typescript
private progress = 0;

this.on('if.event.pushed', (event) => {
  this.progress++;
  if (this.progress >= requiredSteps) {
    // Unlock something
  }
});
```

### Conditional Response
```typescript
entity.on = {
  'if.event.examined': (event) => {
    if (someCondition) {
      return [/* one response */];
    } else {
      return [/* different response */];
    }
  }
};
```

## Tips

- Always provide feedback to the player
- Check trait existence before using them
- Use story-level handlers for multi-entity puzzles
- Test edge cases (pushing already-pushed items, etc.)
- Consider using helper functions for common patterns

## Further Reading

See `/docs/guides/event-handlers.md` for the complete event handler guide.