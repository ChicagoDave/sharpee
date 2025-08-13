/**
 * Option B: Custom Handler in Trait - Detailed Design
 * 
 * This shows the complete flow from story definition to execution
 */

// ============================================
// PART 1: WORLD MODEL LAYER (Framework)
// ============================================

import { IFEntity, TraitType } from '@sharpee/world-model';
import { ActionContext, ActionResult } from '../src/actions/enhanced-types';

// Extend PushableTrait to include customHandler field
interface PushableData {
  pushType?: 'button' | 'heavy' | 'moveable';
  state?: 'default' | 'pushed' | 'activated';
  
  /**
   * ID reference to a custom handler function
   * This is just a string ID, not the function itself
   */
  customHandler?: string;  // <-- NEW FIELD
  
  // ... other existing fields
}

// ============================================
// PART 2: STORY/ENGINE LAYER
// ============================================

// Each story has a registry of custom handlers
class Story {
  private customHandlers = new Map<string, CustomHandler>();
  
  /**
   * Register a custom handler that can be referenced by entities
   */
  registerCustomHandler(
    id: string, 
    handler: (entity: IFEntity, context: ActionContext) => ActionResult
  ) {
    this.customHandlers.set(id, handler);
  }
  
  /**
   * Get a custom handler by ID
   */
  getCustomHandler(id: string) {
    return this.customHandlers.get(id);
  }
}

// ============================================
// PART 3: AUTHOR'S STORY CODE
// ============================================

const myStory = new Story();

// Step 1: Author defines their custom handler function
myStory.registerCustomHandler('revealBookshelfPassage', (entity, context) => {
  // Access the pushable trait to check/update state
  const pushable = entity.get(TraitType.PUSHABLE) as PushableTrait;
  
  // Guard: Check if already activated
  if (pushable.state === 'activated') {
    return {
      success: false,
      messageId: 'already_revealed',
      params: { book: entity.attributes.name },
      events: []
    };
  }
  
  // THE CUSTOM LOGIC: 
  // This is where the author implements their specific behavior
  
  // 1. Update the pushed object's state
  pushable.state = 'activated';
  
  // 2. Modify the world
  const library = context.world.getEntity('library');
  const bookshelf = context.world.getEntity('bookshelf');
  
  // Remove the bookshelf that was blocking the passage
  context.world.removeEntity(bookshelf.id);
  
  // Add a new exit to the room
  library.exits = {
    ...library.exits,
    north: 'secret-room'
  };
  
  // 3. Create a back-link from secret room
  const secretRoom = context.world.getEntity('secret-room');
  secretRoom.exits = {
    ...secretRoom.exits,
    south: 'library'
  };
  
  // Return the result with custom message and events
  return {
    success: true,
    messageId: 'bookshelf_slides_away',  // Author defines this message
    params: {
      book: entity.attributes.name,
      direction: 'north'
    },
    events: [
      // These events are fired for logging/UI, not for logic
      { type: 'if.event.pushed', data: { entity: entity.id } },
      { type: 'story.passage.revealed', data: { 
        from: 'library', 
        to: 'secret-room',
        trigger: entity.id 
      }}
    ]
  };
});

// Step 2: Author creates the entity with reference to the handler
const redBook = myStory.createEntity({
  id: 'red-book',
  name: 'red leather book',
  description: 'A worn red leather book on the shelf.',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      pushType: 'button',  // Will make a click sound
      state: 'default',
      customHandler: 'revealBookshelfPassage'  // <-- REFERENCE TO HANDLER
    })]
  ])
});

// Step 3: Author defines the custom message
myStory.defineMessage('bookshelf_slides_away', 
  'As you push {book}, you hear a grinding noise. The heavy bookshelf ' +
  'slides aside, revealing a passage to the {direction}!'
);

// ============================================
// PART 4: ACTION EXECUTION (Framework)
// ============================================

// In pushing.ts - the modified execute function
function pushingActionExecute(context: ActionContext): SemanticEvent[] {
  const target = context.command.directObject?.entity;
  if (!target) {
    return [/* error */];
  }
  
  const pushable = target.get(TraitType.PUSHABLE) as PushableTrait;
  if (!pushable) {
    return [/* not pushable error */];
  }
  
  // PRIORITY 1: Check for custom handler
  if (pushable.customHandler) {
    // Get the handler from the story's registry
    const handler = context.story.getCustomHandler(pushable.customHandler);
    
    if (handler) {
      // Execute the custom handler
      const result = handler(target, context);
      
      // Convert the result to events
      return convertToEvents(result, context);
    }
    
    // If handler ID is invalid, log warning and continue
    console.warn(`Custom handler '${pushable.customHandler}' not found`);
  }
  
  // PRIORITY 2: Check for ActionBehaviors (ButtonPushBehavior, etc.)
  const behavior = behaviorRegistry.find(target, 'pushing');
  if (behavior) {
    const result = behavior.execute(target, context);
    return convertToEvents(result, context);
  }
  
  // PRIORITY 3: Default push behavior
  pushable.state = 'pushed';
  pushable.pushCount = (pushable.pushCount || 0) + 1;
  
  return [
    context.event('if.event.pushed', {
      entity: target.id,
      pushCount: pushable.pushCount
    }),
    context.event('action.success', {
      actionId: 'pushing',
      messageId: 'pushed_default',
      params: { object: target.attributes.name }
    })
  ];
}

// ============================================
// PART 5: RUNTIME EXECUTION FLOW
// ============================================

/**
 * When player types: "push red book"
 * 
 * 1. Parser identifies: action=push, directObject=red-book
 * 
 * 2. Pushing action validate():
 *    - Is red book pushable? Yes (has PUSHABLE trait)
 *    - Is it reachable? Yes
 *    - Return valid: true
 * 
 * 3. Pushing action execute():
 *    - Get red-book entity
 *    - Get PUSHABLE trait
 *    - See customHandler: 'revealBookshelfPassage'
 *    - Look up handler in story.customHandlers
 *    - Execute handler(red-book, context)
 *    - Handler:
 *      - Updates book state to 'activated'
 *      - Removes bookshelf entity
 *      - Adds north exit to library
 *      - Returns success with 'bookshelf_slides_away' message
 *    - Convert result to events
 *    - Return events
 * 
 * 4. Engine processes events:
 *    - Fire 'if.event.pushed' (for logging/UI)
 *    - Fire 'story.passage.revealed' (for logging/UI)
 *    - Display message: "As you push red leather book, you hear..."
 * 
 * 5. Next turn:
 *    - Player can now "go north" to secret room
 */

// ============================================
// PART 6: KEY BENEFITS
// ============================================

/**
 * 1. SEPARATION OF CONCERNS:
 *    - Entity data (traits) only contains handler ID
 *    - Logic lives in registered functions
 *    - Can serialize/save just the ID
 * 
 * 2. AUTHOR CONTROL:
 *    - Full access to world model in handler
 *    - Can modify any aspect of game state
 *    - Synchronous execution (no async callbacks)
 * 
 * 3. FALLBACK CHAIN:
 *    - Custom handlers (most specific)
 *    - ActionBehaviors (common patterns)  
 *    - Default behavior (generic)
 * 
 * 4. TYPE SAFETY:
 *    - Handlers have typed parameters
 *    - Return type is enforced
 *    - IDE autocomplete works
 * 
 * 5. TESTABILITY:
 *    - Handlers can be unit tested
 *    - Can mock the context
 *    - Can verify world state changes
 */

// ============================================
// PART 7: WHAT THIS REPLACES
// ============================================

/**
 * This approach replaces the need for:
 * 
 * ❌ Event subscriptions (story.on('if.event.pushed', ...))
 * ❌ Complex state machines
 * ❌ Polling/checking state each turn
 * ❌ Hardcoding special cases in actions
 * 
 * Instead, we have:
 * ✅ Direct, synchronous execution
 * ✅ Clear execution priority
 * ✅ Author-defined logic that runs as part of the action
 * ✅ Events still fired for UI/logging (but not for game logic)
 */