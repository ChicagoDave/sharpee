# Cloak of Darkness - Forge Fluent API Sample

> ⚠️ **DRAFT DESIGN**: This is a conceptual design for the Forge fluent API. The actual implementation may differ based on community feedback and technical constraints.

This document demonstrates what the classic "Cloak of Darkness" by Roger Firth might look like using Sharpee's proposed Forge fluent API. The Forge API aims to provide a natural, readable way to create interactive fiction that reads almost like English prose.

## Complete Story Implementation

```typescript
import { forge } from '@sharpee/forge';

/**
 * Cloak of Darkness
 * 
 * A simple story demonstrating the Forge fluent API.
 * The player must hang their cloak on a hook before exploring
 * the dark bar to read a message written in sawdust.
 */
const story = forge.story('cloak-of-darkness')
  .title('Cloak of Darkness')
  .author('Roger Firth')
  .version('1.0.0')
  .description('A basic IF demonstration - hang up your cloak!')
  
  // ===== CONFIGURATION =====
  // Set up story-wide settings and initial state
  .configure(config => config
    .startingRoom('foyer')
    .maxScore(2)  // 1 point for hanging cloak, 1 for reading message
    .enableDarkness()  // Enable light/dark mechanics
    .debugMode(false)
  )
  
  // ===== STATE TRACKING =====
  // Define custom state variables for the story
  .state({
    disturbances: 0,      // Times the message has been disturbed
    messageRead: false,   // Whether player has successfully read the message
    cloakHung: false     // Whether cloak is on the hook
  })
  
  // ===== ROOMS =====
  // Define the game world geography
  
  .room('foyer')
    .name('Foyer of the Opera House')
    .description(`You are standing in a spacious hall, splendidly 
      decorated in red and gold, with glittering chandeliers overhead. 
      The entrance from the street is to the north, and there are 
      doorways south and west.`)
    .aliases('hall', 'entrance')
    .lit()  // This room has light
    .exits(exits => exits
      .north('outside')
      .south('bar')
      .west('cloakroom')
    )
    .done()  // Finish room definition
  
  .room('cloakroom')
    .name('Cloakroom')
    .description(`The walls of this small room were clearly once lined 
      with hooks, though now only one remains. The exit is a door to 
      the east.`)
    .lit()
    .exits(exits => exits
      .east('foyer')
    )
    .done()
  
  .room('bar')
    .name('Foyer Bar')
    .description(`The bar, much rougher than you'd have guessed after 
      the opulence of the foyer to the north, is completely empty. 
      There seems to be some sort of message scrawled in the sawdust 
      on the floor.`)
    .dark()  // This room has no light source
    .exits(exits => exits
      .north('foyer')
    )
    // Custom behavior when entering the dark bar
    .onEnter((actor, room) => {
      // If player is carrying the cloak (absorbs light), it's pitch dark
      if (actor.has('cloak')) {
        story.state.disturbances++;
        
        // Update the message state - the Text Service will handle
        // generating appropriate messages based on this state change
        story.find('message').disturb();
        
        // Emit semantic event that Text Service will interpret
        return story.event('stumbling_in_dark', {
          disturbances: story.state.disturbances
        });
      }
    })
    .done()
  
  .room('outside')
    .name('Outside')
    .description(`You've only just arrived, and besides, the weather 
      outside seems to be getting worse.`)
    .lit()
    .outdoor()  // Mark as outdoor location
    .exits(exits => exits
      .south('foyer')
    )
    // Prevent leaving (ends the game)
    .onEnter((actor, room) => {
      // Emit event that signals wrong direction
      story.event('wrong_exit_attempted');
      story.end(false);  // End game unsuccessfully
    })
    .done()
  
  // ===== OBJECTS =====
  // Define interactive objects in the world
  
  .object('cloak')
    .name('velvet cloak')
    .description(`A handsome cloak of velvet trimmed with satin, and 
      slightly splattered with raindrops. Its blackness is so deep that 
      it almost seems to suck light from the room.`)
    .aliases('velvet cloak', 'velvet', 'satin')
    .wearable()
    .portable()  // Can be picked up
    // The cloak absorbs light when carried
    .property('lightAbsorbing', true)
    // Start with the player carrying it
    .carriedBy('player')
    // Custom behavior when dropped
    .onDrop((object, location) => {
      if (location.is('bar') && story.state.disturbances > 0) {
        story.state.disturbances++;
        // Text Service will generate appropriate message based on event
        return story.event('cloak_dropped_on_disturbed_message');
      }
    })
    .done()
  
  .object('hook')
    .name('small brass hook')
    .description(`It's just a small brass hook, screwed to the wall.`)
    .aliases('brass hook', 'peg')
    .scenery()  // Can't be taken
    .supporter()  // Can have things placed on it
    .capacity(1)  // Can only hold one item
    .in('cloakroom')  // Located in the cloakroom
    // Custom behavior when something is hung on it
    .onReceive((object, hook) => {
      if (object.is('cloak')) {
        story.state.cloakHung = true;
        story.score(1);  // Award a point
        
        // Now the bar is lit (no cloak to absorb light)
        story.room('bar').nowLit();
        
        // Text Service will generate the success message
        return story.event('cloak_hung_on_hook');
      }
    })
    .done()
  
  .object('message')
    .name('message in the sawdust')
    .aliases('message', 'sawdust', 'floor', 'words')
    .scenery()
    .readable()
    .in('bar')
    // Dynamic description based on state
    .description(() => {
      const disturbed = story.state.disturbances;
      
      if (story.room('bar').isDark()) {
        return `In the darkness, you can't see any message.`;
      } else if (disturbed === 0) {
        return `The message, neatly marked in the sawdust, reads...`;
      } else if (disturbed < 3) {
        return `The message has been carelessly trampled, making it 
          difficult to read.`;
      } else {
        return `The message has been completely obliterated.`;
      }
    })
    // Dynamic text based on how disturbed it is
    .text(() => {
      const disturbed = story.state.disturbances;
      
      if (story.room('bar').isDark()) {
        return `It's too dark to read.`;
      } else if (disturbed === 0) {
        story.state.messageRead = true;
        story.score(1);  // Award final point
        return `*** You have won ***`;
      } else if (disturbed === 1) {
        return `** You have w*n **`;
      } else if (disturbed === 2) {
        return `* You hav w*n *`;
      } else {
        return `The message is too trampled to read.`;
      }
    })
    // Custom method to disturb the message
    .method('disturb', function() {
      this.state.disturbed = true;
    })
    .done()
  
  // ===== PLAYER =====
  // Configure the player character
  
  .player()
    .name('yourself')
    .description('As good-looking as ever.')
    .aliases('me', 'myself', 'self')
    .capacity(10)  // Can carry 10 items
    .done()
  
  // ===== CUSTOM COMMANDS =====
  // Add story-specific commands beyond the standard library
  
  .command('score')
    .pattern('score', 'points')
    .execute(() => {
      // Emit event with score data - Text Service generates the message
      return story.event('score_requested', {
        current: story.getScore(),
        maximum: story.getMaxScore(),
        messageRead: story.state.messageRead,
        cloakHung: story.state.cloakHung
      });
    })
    .done()
  
  .command('hint')
    .pattern('hint', 'help', 'hints')
    .execute(() => {
      // Text Service will generate appropriate hint based on game state
      return story.event('hint_requested', {
        cloakHung: story.state.cloakHung,
        messageRead: story.state.messageRead
      });
    })
    .done()
  
  // ===== CUSTOM RULES =====
  // Define special game mechanics
  
  .rule('darkness')
    .when((world) => {
      // Check if player is in the bar with the cloak
      const player = world.player();
      const location = player.location();
      return location.is('bar') && player.has('cloak');
    })
    .then((world) => {
      // Make the room pitch dark
      world.room('bar').makeDark();
      // Block examine action - Text Service handles the message
      world.blockAction('examine', 'darkness_blocks_examine');
    })
    .done()
  
  // ===== INTRO TEXT =====
  // Set the opening text when the game starts
  
  .intro(`
    Hurrying through the rainswept November night, you're glad to see 
    the bright lights of the Opera House. It's surprising that there 
    aren't more people about but, hey, what do you expect in a cheap 
    demo game...?
    
    CLOAK OF DARKNESS
    A basic IF demonstration by Roger Firth
    Sharpee Forge implementation
    
    Type 'help' for hints or 'score' to check progress.
  `)
  
  // ===== VICTORY CONDITIONS =====
  // Define how the game can be won
  
  .victory()
    .when(() => story.state.messageRead === true)
    .message(`
      Congratulations! You've successfully read the message in the 
      sawdust. The opera house holds no more secrets for you.
      
      *** You have won ***
    `)
    .done()
  
  // ===== BUILD =====
  // Compile the story into a playable game
  
  .build();

// Export for use with Sharpee runtime
export default story;
```

## Text Service Integration

**Important Architecture Note**: In Sharpee, actions and event handlers don't generate text directly. Instead, they emit semantic events that the Text Service interprets to generate appropriate messages. This separation allows for:

- **Localization**: Different languages can interpret the same events
- **Customization**: Authors can override default messages
- **Consistency**: All text generation follows the same patterns
- **Testing**: Events can be tested without text generation

### Example: Event-Driven Text Generation

```typescript
// Instead of this (direct text):
.onEnter(() => {
  story.print("You enter the dark room.");  // ❌ Don't do this
})

// Do this (semantic event):
.onEnter(() => {
  return story.event('entered_dark_room');  // ✅ Text Service handles it
})
```

The Text Service would have templates like:
```typescript
textService.template('entered_dark_room', 
  "You stumble into the darkness, unable to see anything.");
```

## Key Features of the Forge API

### 1. **Fluent Interface**
Every method returns the builder, allowing natural chaining:
```typescript
story.room('library')
  .name('Library')
  .description('Dusty books line the walls.')
  .lit()
  .done()
```

### 2. **Declarative Syntax**
Define what the world is, not how to build it:
```typescript
.object('sword')
  .name('silver sword')
  .portable()
  .weapon()
  .damage(10)
```

### 3. **Smart Defaults**
Common patterns are built-in:
- Objects are automatically placed in scope
- Standard verbs work without configuration
- Darkness handling is automatic with `.dark()` and `.lit()`

### 4. **Event Handlers**
Natural places to add custom logic:
```typescript
.onEnter((actor, room) => { /* custom logic */ })
.onTake((object, actor) => { /* custom logic */ })
.onDrop((object, location) => { /* custom logic */ })
```

### 5. **Dynamic Properties**
Descriptions and properties can be functions:
```typescript
.description(() => {
  return story.state.disturbances > 0 
    ? 'The message is disturbed.'
    : 'The message is clear.';
})
```

### 6. **State Management**
Built-in state tracking:
```typescript
.state({
  questComplete: false,
  score: 0
})
```

### 7. **Custom Commands**
Easy to add story-specific commands:
```typescript
.command('xyzzy')
  .pattern('xyzzy', 'plugh')
  .execute(() => story.print('Nothing happens.'))
```

## Comparison with Traditional Approach

### Traditional (Current Implementation)
```typescript
const cloak = world.createEntity('velvet cloak', EntityType.ITEM);
cloak.add(new IdentityTrait({
  name: 'velvet cloak',
  description: 'A handsome cloak...',
  aliases: ['cloak', 'velvet cloak']
}));
cloak.add(new WearableTrait());
cloak.add(new PortableTrait());
```

### Forge API
```typescript
.object('cloak')
  .name('velvet cloak')  
  .description('A handsome cloak...')
  .aliases('cloak', 'velvet cloak')
  .wearable()
  .portable()
```

## Benefits for Authors

1. **Readable** - The code reads like a story outline
2. **Concise** - Less boilerplate, more story
3. **Discoverable** - IDE autocomplete guides you
4. **Flexible** - Drop down to low-level APIs when needed
5. **Testable** - Built-in test helpers for story validation

## Next Steps

This is a conceptual design. The actual Forge API would need:

1. **Implementation** of the builder pattern
2. **Integration** with existing Sharpee systems
3. **Validation** of story structure at build time
4. **Optimization** for runtime performance
5. **Documentation** with more examples
6. **Community feedback** on the API design

## Community Questions

We'd love feedback on:

- Is this syntax intuitive for IF authors?
- What patterns from other IF systems should we support?
- Should we support YAML/JSON definitions as an alternative?
- What helper methods would make authoring easier?
- How can we make debugging stories easier?

---

*This is a draft proposal for the Sharpee Forge API. Join the discussion at intfiction.org!*