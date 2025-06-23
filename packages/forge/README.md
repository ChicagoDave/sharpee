# Sharpee Forge - The Fluent Authoring Layer

Forge is the high-level, author-friendly API for creating interactive fiction stories with Sharpee. It's designed to be approachable for non-programming authors while maintaining the full power of the underlying Sharpee core.

## Quick Start

```typescript
import { forge, US_EN } from '@sharpee/forge';

const story = forge()
  .languageSet(US_EN)
  .title("My First Story")
  .startIn("library")
  
  .room("library")
    .description("A dusty old library with towering bookshelves.")
    .item("brass-key").description("A small brass key").takeable().done()
    .exit("north", "hallway")
    .done()
  
  .room("hallway") 
    .description("A long corridor with paintings on the walls.")
    .exit("south", "library")
    .done()
  
  .build()
  .start();

// Process player commands
story.processCommand("look");
story.processCommand("take key");
story.processCommand("go north");
```

## Core Concepts

### Fluent API Design

Forge uses a fluent, chainable API that reads naturally:

- **Method chaining** - Each method returns the builder, allowing chains like `.room("id").description("text").exit("north", "hall").done()`
- **Nested building** - Create items and characters within rooms using `.item("id")` and `.character("id"`
- **Explicit completion** - Use `.done()` to finish building an entity and return to the parent builder

### Entity Types

#### Rooms/Locations
```typescript
.room("library")
  .name("Old Library")                    // Display name
  .description("A dusty library...")      // Description text
  .dark(true)                             // Make the room dark
  .exit("north", "hallway")               // Add exits
  .exits({ "east": "study", "up": "loft" }) // Add multiple exits
  .done()
```

#### Items/Things
```typescript
.item("key")
  .name("brass key")                      // Display name
  .description("A small key...")          // Description text
  .adjectives("small", "brass", "old")    // Adjectives for parsing
  .takeable()                             // Can be picked up
  .fixed()                                // Cannot be moved
  .container(false, true)                 // Container (closed, openable)
  .surface()                              // Can hold other items
  .weight(5)                              // Item weight
  .lightSource(true)                      // Provides light
  .wearable()                             // Can be worn
  .edible()                               // Can be eaten
  .done()
```

#### Characters/NPCs
```typescript
.character("librarian")
  .name("Ms. Chen")                       // Display name
  .description("A kind librarian...")     // Description text
  .friendly()                             // Disposition
  .mobile()                               // Can move around
  .greeting("Hello there!")               // Initial greeting
  .canTalkAbout("books", "We have many books...") // Conversation topics
  .conversations({                        // Multiple topics at once
    "hours": "We're open 9-5",
    "location": "This is the main library"
  })
  .done()
```

### Story Configuration

```typescript
const story = forge({
  debug: true,                            // Enable debug logging
  templates: {                            // Custom message templates
    "item_taken": "You picked up {0}.",
    "item_dropped": "You dropped {0}."
  }
})
  .languageSet(US_EN)                     // Set language
  .title("Story Title")                   // Set title
  .startIn("starting-room")               // Set starting location
  .template("custom_msg", "Hello {0}")    // Add custom template
  // ... build rooms, items, characters
  .build();                               // Create the story
```

## Examples

### Simple Two-Room Story

```typescript
import { forge, US_EN } from '@sharpee/forge';

const story = forge()
  .languageSet(US_EN)
  .title("The Garden")
  .startIn("house")
  
  .room("house")
    .description("You are inside a cozy house. A door leads to the garden.")
    .item("flashlight")
      .description("A heavy metal flashlight.")
      .lightSource(false) // Not lit initially
      .takeable()
      .done()
    .exit("out", "garden")
    .done()
  
  .room("garden")
    .description("A beautiful garden with flowers and trees. The house is to the north.")
    .dark(true) // Garden is dark at night
    .exit("in", "house")
    .done()
  
  .build();
```

### Story with NPCs and Conversation

```typescript
const story = forge()
  .languageSet(US_EN)
  .title("The Shopkeeper")
  .startIn("shop")
  
  .room("shop")
    .description("A small general store filled with various goods.")
    .character("shopkeeper")
      .name("Old Pete")
      .description("An elderly shopkeeper with a warm smile.")
      .friendly()
      .greeting("Welcome to my shop! What can I help you find?")
      .canTalkAbout("goods", "I sell a bit of everything - tools, food, supplies.")
      .canTalkAbout("town", "This town's been here for over a hundred years.")
      .canTalkAbout("weather", "Been mighty dry lately. Could use some rain.")
      .done()
    .item("apple")
      .description("A fresh, red apple.")
      .edible()
      .takeable()
      .done()
    .done()
  
  .build();
```

### Complex Story with Containers and Puzzles

```typescript
const story = forge()
  .languageSet(US_EN)
  .title("The Locked Desk")
  .startIn("office")
  
  .room("office")
    .description("A cluttered office with papers scattered about.")
    .item("desk")
      .name("mahogany desk")
      .description("An elegant desk with several drawers. One appears to be locked.")
      .container(false, true) // Closed, but can be opened
      .fixed()
      .done()
    .item("key")
      .name("small key")
      .description("A small brass key.")
      .adjectives("small", "brass")
      .takeable()
      .hidden() // Start hidden, perhaps revealed by examining something else
      .done()
    .exit("out", "hallway")
    .done()
  
  .room("hallway")
    .description("A carpeted hallway with doors leading to various rooms.")
    .exit("office", "office")
    .done()
  
  .build();
```

## Advanced Features

### Custom Templates

You can customize the text output of the game by providing templates:

```typescript
const story = forge({
  templates: {
    "look_room": "You are in {0}. {1}",
    "item_taken": "You carefully pick up {0}.",
    "item_not_here": "You don't see {0} here.",
    "cant_go_that_way": "You can't go that direction."
  }
})
// ... rest of story
```

### Debug Mode

Enable debug mode to see detailed logging:

```typescript
const story = forge({ debug: true })
// ... build story
```

This will log:
- Story creation events
- Command processing
- Turn counting
- Parse results
- Error details

### Story Control

Once you have a built story, you can:

```typescript
const story = buildYourStory().build();

// Start the story
story.start();

// Process commands
const result = story.processCommand("look around");
const result2 = story.processCommand("take the key");

// Get story information
console.log(story.getTitle());        // Get the title
console.log(story.getTurnCount());    // Get current turn number
console.log(story.isStarted());       // Check if started

// Save/Load (planned feature)
const saveData = story.save();        // Save current state
story.load(saveData);                 // Restore state

// Access underlying systems if needed
const coreStory = story.getCoreStory(); // Get core Story instance
```

## Best Practices

### For Authors

1. **Start Simple** - Begin with just a few rooms and basic items
2. **Use Descriptive IDs** - Use IDs like "brass-key" instead of "item1"
3. **Chain Thoughtfully** - Break long chains at logical points for readability
4. **Test Early** - Build and test your story incrementally
5. **Use Comments** - Document complex interactions and puzzles

### Code Organization

```typescript
// Group related rooms together
const story = forge()
  .languageSet(US_EN)
  .title("My Story")
  .startIn("start")
  
  // First area - the house
  .room("living-room")
    .description("...")
    .exit("kitchen", "kitchen")
    .done()
    
  .room("kitchen")
    .description("...")
    .exit("living-room", "living-room")
    .done()
  
  // Second area - the garden
  .room("garden")
    .description("...")
    // ... etc
```

### Item Design

- Use **adjectives** to help parsing: `.adjectives("red", "leather", "bound")`
- Set appropriate **weights** for realism: `.weight(2)`
- Consider **container hierarchies**: items inside other items
- Use **fixed()** for furniture and **takeable()** for portable items

### Character Design

- Give characters **distinct personalities** through descriptions and conversations
- Use **greeting()** for first impressions
- Plan **conversation topics** that advance the story or provide hints
- Consider making some characters **mobile()** to create dynamic encounters

## Integration with Core

Forge is a layer on top of Sharpee's core systems:

- **Story Class** - Wraps the core Story class with fluent API
- **World Model** - Creates IF entities in the core world model
- **Language System** - Uses the core language and parser systems
- **Event System** - Leverages core events and channels

You can access these underlying systems when needed:

```typescript
const forgeStory = buildYourStory().build();
const coreStory = forgeStory.getCoreStory();
const world = coreStory.getWorld();
const parser = coreStory.getParser();
```

## API Reference

### Main Classes

- **`forge(config?)`** - Create a new Forge builder
- **`Forge`** - The main builder class with fluent methods  
- **`ForgeStory`** - A built story ready for execution
- **`LocationBuilder`** - Builder for rooms/locations
- **`ItemBuilder`** - Builder for items/things
- **`CharacterBuilder`** - Builder for characters/NPCs

### Builder Methods

All builders support:
- `.name(string)` - Set display name
- `.description(string)` - Set description text
- `.visible(boolean)` - Set visibility
- `.hidden(boolean)` - Set hidden state
- `.attribute(key, value)` - Set custom attribute
- `.done()` - Return to parent builder

See the examples above for entity-specific methods.

## Future Enhancements

Planned features for future versions:

- **Save/Load System** - Complete save game functionality
- **Event Handlers** - Custom code for special interactions
- **Rule System** - Declarative rules for game behavior
- **Scene Management** - Higher-level story structure
- **Debugging Tools** - Enhanced development aids
- **Plugin System** - Extensions and custom entity types

## Contributing

To contribute to Forge development:

1. Follow the existing fluent API patterns
2. Ensure all methods return appropriate builder instances for chaining
3. Add comprehensive tests for new features
4. Update examples and documentation
5. Consider the author experience - keep it simple and readable

The goal is to make interactive fiction authoring accessible to non-programmers while preserving the power and flexibility of the underlying Sharpee engine.
