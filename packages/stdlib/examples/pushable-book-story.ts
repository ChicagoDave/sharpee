/**
 * Example: Pushable Book that Reveals Secret Passage
 * 
 * This demonstrates how an author would implement custom push logic
 * for a specific object in their story.
 */

import { IFEntity, PushableTrait, TraitType } from '@sharpee/world-model';
import { Story } from '@sharpee/engine';

// Define the story
const story = new Story({
  title: "The Secret Library",
  author: "Test Author"
});

// Create the library room
const library = story.createRoom({
  id: 'library',
  name: 'Library',
  description: 'An old library with floor-to-ceiling bookshelves.',
  exits: {
    south: 'hallway'
    // Note: 'north' exit will be revealed later
  }
});

// Create the secret room (initially not connected)
const secretRoom = story.createRoom({
  id: 'secret-room',
  name: 'Secret Chamber',
  description: 'A hidden chamber filled with ancient artifacts.'
});

// Create the special red book
const redBook = story.createEntity({
  id: 'red-book',
  name: 'red leather book',
  description: 'A worn red leather book that seems oddly prominent on the shelf.',
  location: 'library',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      pushType: 'button',  // Uses button behavior for the click sound
      repeatable: false,   // Can only be pushed once
      state: 'default',
      // This is where we attach our custom logic identifier
      customAction: 'revealSecretPassage'  // <-- KEY: Custom action ID
    })]
  ])
});

// Create the bookshelf (initially blocking the north exit)
const bookshelf = story.createEntity({
  id: 'bookshelf',
  name: 'heavy bookshelf',
  description: 'A massive oak bookshelf covering the north wall.',
  location: 'library',
  traits: new Map([
    [TraitType.SCENERY, {}],  // Can't be taken
    [TraitType.FIXED, {}]      // Can't be moved normally
  ])
});

/**
 * OPTION 1: Entity-based handler
 * Attach custom logic directly to the entity
 */
redBook.onPush = (context) => {
  // Check if already pushed
  const pushable = redBook.get(TraitType.PUSHABLE) as PushableTrait;
  if (pushable.state === 'activated') {
    return {
      success: false,
      messageId: 'already_revealed',
      params: {}
    };
  }

  // Update state
  pushable.state = 'activated';
  
  // Move the bookshelf (or remove it)
  context.world.remove(bookshelf.id);
  
  // Add the new exit
  library.exits.north = 'secret-room';
  secretRoom.exits.south = 'library';
  
  return {
    success: true,
    messageId: 'bookshelf_slides_away',
    params: {
      book: redBook.name,
      direction: 'north'
    },
    events: [
      { type: 'passage.revealed', data: { from: 'library', to: 'secret-room' } },
      { type: 'object.removed', data: { object: 'bookshelf' } }
    ]
  };
};

/**
 * OPTION 2: Action interceptor pattern
 * Register a handler that intercepts push actions on this specific entity
 */
story.registerActionHandler('pushing', 'red-book', (context) => {
  const pushable = redBook.get(TraitType.PUSHABLE) as PushableTrait;
  
  if (pushable.state === 'activated') {
    return {
      success: false,
      messageId: 'already_revealed'
    };
  }

  // Custom logic here
  pushable.state = 'activated';
  context.world.remove('bookshelf');
  library.addExit('north', 'secret-room');
  
  return {
    success: true,
    messageId: 'bookshelf_slides_away',
    params: { book: 'red book', direction: 'north' }
  };
});

/**
 * OPTION 3: Trait-based custom action system
 * The PushableTrait has a customAction field that the pushing action checks
 */
class CustomActions {
  static revealSecretPassage(entity: IFEntity, context: ActionContext) {
    const pushable = entity.get(TraitType.PUSHABLE) as PushableTrait;
    
    if (pushable.state === 'activated') {
      return {
        success: false,
        messageId: 'already_revealed',
        params: {}
      };
    }

    // The actual logic
    pushable.state = 'activated';
    
    // Modify world state
    const library = context.world.getEntity('library');
    const bookshelf = context.world.getEntity('bookshelf');
    
    // Remove bookshelf
    context.world.remove(bookshelf.id);
    
    // Add exit
    library.exits = { ...library.exits, north: 'secret-room' };
    
    return {
      success: true,
      messageId: 'bookshelf_slides_away',
      params: {
        book: entity.name,
        direction: 'north'
      },
      events: [
        { type: 'passage.revealed', data: { from: 'library', to: 'secret-room' } }
      ]
    };
  }
}

/**
 * Then in the pushing action implementation:
 */
function pushingActionExecute(context: ActionContext) {
  const target = context.command.directObject?.entity;
  const pushable = target.get(TraitType.PUSHABLE) as PushableTrait;
  
  // Check for custom action first
  if (pushable.customAction) {
    const customHandler = CustomActions[pushable.customAction];
    if (customHandler) {
      const result = customHandler(target, context);
      return convertToEvents(result, context);
    }
  }
  
  // Otherwise fall back to standard behaviors
  const behavior = behaviorRegistry.find(target, 'pushing');
  if (behavior) {
    return behavior.execute(target, context);
  }
  
  // Default push behavior
  return [context.event('action.success', {
    actionId: 'pushing',
    messageId: 'pushed',
    params: { object: target.name }
  })];
}

// Messages the author would define
story.defineMessages({
  'bookshelf_slides_away': 'As you push the {book}, you hear a grinding sound. The bookshelf slides aside, revealing a passage to the {direction}!',
  'already_revealed': 'The secret passage has already been revealed.'
});

/**
 * ANALYSIS:
 * 
 * Option 1 (Entity.onPush): 
 * - Pro: Direct, intuitive for authors
 * - Con: Mixes logic into entity definition
 * 
 * Option 2 (Action Interceptors):
 * - Pro: Separates custom logic from entity definition
 * - Con: Another registration system to manage
 * 
 * Option 3 (customAction field):
 * - Pro: Data-driven, can be serialized
 * - Pro: Clear separation of data and logic
 * - Con: Requires a registry of custom actions
 * 
 * The key insight: We need a way for authors to attach custom logic
 * to specific entity+action combinations. The ActionBehavior system
 * handles common patterns, but custom logic needs a different mechanism.
 */