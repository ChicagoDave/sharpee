/**
 * PushableTrait with Handler - Full Example
 * 
 * This shows how custom handlers can be part of the trait itself,
 * maintaining our composition-based model.
 */

// ============================================
// PART 1: TRAIT DEFINITION (Framework)
// ============================================

import { Trait, TraitType } from '@sharpee/world-model';
import { ActionContext } from '../src/actions/enhanced-types';

/**
 * Result returned by custom handlers
 */
interface HandlerResult {
  success: boolean;
  messageId: string;
  params?: Record<string, any>;
  events?: Array<{ type: string; data: any }>;
}

/**
 * Extended PushableTrait with optional handler
 */
interface PushableData {
  // Optional custom handler function
  onPush?: (context: ActionContext) => HandlerResult;
  
  // Simple tracking (optional)
  pushCount?: number;
}

class PushableTrait implements Trait, PushableData {
  static readonly type = TraitType.PUSHABLE;
  readonly type = TraitType.PUSHABLE;
  
  onPush?: (context: ActionContext) => HandlerResult;
  pushCount: number;
  
  constructor(data: PushableData = {}) {
    this.onPush = data.onPush;
    this.pushCount = data.pushCount ?? 0;
  }
}

// ============================================
// PART 2: PUSHING ACTION (Framework)
// ============================================

function pushingActionExecute(context: ActionContext): SemanticEvent[] {
  const target = context.command.directObject?.entity;
  if (!target) {
    return [context.event('action.error', { 
      actionId: 'pushing',
      messageId: 'no_target' 
    })];
  }
  
  // Check if pushable
  const pushable = target.get(TraitType.PUSHABLE) as PushableTrait;
  if (!pushable) {
    return [context.event('action.error', {
      actionId: 'pushing',
      messageId: 'not_pushable',
      params: { object: target.attributes.name }
    })];
  }
  
  // PRIORITY 1: Check for custom handler in trait
  if (pushable.onPush) {
    try {
      const result = pushable.onPush(context);
      
      // Update push count if successful
      if (result.success) {
        pushable.pushCount++;
      }
      
      // Convert result to events
      const events: SemanticEvent[] = [];
      
      // Add custom events if any
      if (result.events) {
        result.events.forEach(evt => {
          events.push(context.event(evt.type, evt.data));
        });
      }
      
      // Add the action result event
      events.push(context.event(
        result.success ? 'action.success' : 'action.error',
        {
          actionId: 'pushing',
          messageId: result.messageId,
          params: result.params || {}
        }
      ));
      
      return events;
    } catch (error) {
      console.error('Error in custom push handler:', error);
      // Fall through to default behavior
    }
  }
  
  // PRIORITY 2: Check for ActionBehaviors (ButtonPushBehavior, etc.)
  const behavior = behaviorRegistry.find(target, 'pushing');
  if (behavior) {
    const result = behavior.execute(target, context);
    pushable.pushCount++;
    return convertToEvents(result, context);
  }
  
  // PRIORITY 3: Default push behavior
  pushable.pushCount++;
  
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
// PART 3: AUTHOR'S STORY CODE
// ============================================

import { Story, IFEntity } from '@sharpee/engine';

const story = new Story({
  title: "The Secret Library",
  author: "Test Author"
});

// Create rooms
const library = story.createRoom({
  id: 'library',
  name: 'Library',
  description: 'A dusty library with tall bookshelves.',
  exits: {
    south: 'hallway'
    // north exit is hidden by bookshelf
  }
});

const secretRoom = story.createRoom({
  id: 'secret-room',
  name: 'Secret Chamber',
  description: 'A hidden chamber with ancient artifacts.'
});

// Create the bookshelf (openable/closeable)
const bookshelf = story.createEntity({
  id: 'bookshelf',
  name: 'ornate bookshelf',
  description: 'An ornate bookshelf that covers the entire north wall.',
  location: 'library',
  traits: new Map([
    [TraitType.OPENABLE, {
      isOpen: false,
      openMessage: 'bookshelf_swings_open',
      closeMessage: 'bookshelf_swings_shut',
      concealsExit: { direction: 'north', to: 'secret-room' }
    }],
    [TraitType.SCENERY, {}],  // Can't be taken
    [TraitType.FIXED, {}]      // Can't be moved
  ])
});

// Create the red book with custom push handler
const redBook = story.createEntity({
  id: 'red-book',
  name: 'red leather book',
  description: 'A red leather book that seems oddly prominent on the shelf.',
  location: 'library',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      // THE CUSTOM HANDLER - defined inline with the trait
      onPush: (context) => {
        // Get the bookshelf
        const bookshelf = context.world.getEntity('bookshelf');
        const openable = bookshelf.get(TraitType.OPENABLE);
        
        // Check if already open
        if (openable.isOpen) {
          return {
            success: false,
            messageId: 'bookshelf_already_open',
            params: { bookshelf: bookshelf.attributes.name }
          };
        }
        
        // Open the bookshelf
        openable.isOpen = true;
        
        // Add the exit to the room
        const library = context.world.getEntity('library');
        library.exits = {
          ...library.exits,
          north: 'secret-room'
        };
        
        // Add return exit
        const secretRoom = context.world.getEntity('secret-room');
        secretRoom.exits = {
          ...secretRoom.exits,
          south: 'library'
        };
        
        // Return success with events
        return {
          success: true,
          messageId: 'bookshelf_swings_open',
          params: {
            book: redBook.attributes.name,
            bookshelf: bookshelf.attributes.name,
            direction: 'north'
          },
          events: [
            { 
              type: 'if.event.opened', 
              data: { 
                entity: bookshelf.id,
                trigger: redBook.id 
              }
            },
            {
              type: 'story.passage.revealed',
              data: {
                from: 'library',
                to: 'secret-room',
                direction: 'north'
              }
            }
          ]
        };
      }
    })]
  ])
});

// Create a normal book for comparison (no custom handler)
const blueBook = story.createEntity({
  id: 'blue-book',
  name: 'blue cloth book',
  description: 'A blue book about sailing.',
  location: 'library',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      // No custom handler - will use default push behavior
    })]
  ])
});

// Create a button with ActionBehavior (not custom handler)
const button = story.createEntity({
  id: 'stone-button',
  name: 'stone button',
  description: 'A stone button set into the wall.',
  location: 'library',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      // No custom handler - ButtonPushBehavior will handle it
    })],
    [TraitType.SWITCHABLE, {
      isOn: false,
      activates: 'hidden-light'
    }]
  ])
});

// Define custom messages
story.defineMessages({
  'bookshelf_swings_open': 
    'As you push {book}, you hear a click. {bookshelf} swings open, revealing a passage to the {direction}!',
  
  'bookshelf_already_open': 
    '{bookshelf} is already open.',
  
  'pushed_default': 
    'You push {object}.'
});

// ============================================
// PART 4: RUNTIME EXECUTION
// ============================================

/**
 * Scenario 1: Player pushes red book
 * 
 * > push red book
 * 
 * 1. Pushing action executes
 * 2. Gets PushableTrait from red-book
 * 3. Finds pushable.onPush function
 * 4. Executes the custom handler:
 *    - Opens bookshelf
 *    - Adds north exit
 *    - Returns success
 * 5. Display: "As you push red leather book, you hear a click. 
 *             The ornate bookshelf swings open, revealing a passage to the north!"
 * 
 * > go north
 * [Player moves to secret chamber]
 */

/**
 * Scenario 2: Player pushes blue book
 * 
 * > push blue book
 * 
 * 1. Pushing action executes
 * 2. Gets PushableTrait from blue-book
 * 3. No onPush function found
 * 4. No matching ActionBehavior
 * 5. Uses default push behavior
 * 6. Display: "You push blue cloth book."
 */

/**
 * Scenario 3: Player pushes button
 * 
 * > push stone button
 * 
 * 1. Pushing action executes
 * 2. Gets PushableTrait from stone-button
 * 3. No onPush function found
 * 4. ButtonPushBehavior matches (has SWITCHABLE trait)
 * 5. ButtonPushBehavior executes:
 *    - Toggles switch state
 *    - Activates hidden-light
 * 6. Display: "Click! The stone button depresses and a hidden light turns on."
 */

// ============================================
// PART 5: ADVANTAGES OF THIS APPROACH
// ============================================

/**
 * 1. SELF-CONTAINED:
 *    The red book's custom behavior is defined right with the book.
 *    No need to register handlers elsewhere.
 * 
 * 2. COMPOSITION-BASED:
 *    Any entity can be pushable with custom logic, regardless of "type".
 *    A door, book, statue, or anything can have push behavior.
 * 
 * 3. CLEAR PRIORITY:
 *    - Custom handler (if exists)
 *    - ActionBehavior (if matches)
 *    - Default behavior
 * 
 * 4. TYPE-SAFE:
 *    The handler is typed as part of PushableTrait.
 *    No casting or type guards needed.
 * 
 * 5. SERIALIZATION:
 *    Problem: Functions can't be serialized
 *    Solution: Could store handler as string ID that maps to function
 *    OR: Accept that custom handlers are code, not data
 */

// ============================================
// PART 6: POTENTIAL ISSUES
// ============================================

/**
 * ISSUE 1: Serialization
 * Functions can't be JSON serialized for save games.
 * 
 * SOLUTION A: Store handler ID instead
 * ```typescript
 * traits: new Map([
 *   [TraitType.PUSHABLE, {
 *     handlerId: 'revealBookshelf'  // String ID
 *   }]
 * ])
 * ```
 * 
 * SOLUTION B: Rebuild handlers on load
 * Save game stores state, code rebuilds handlers
 * 
 * 
 * ISSUE 2: Author Convenience
 * Writing inline functions might be verbose.
 * 
 * SOLUTION: Helper functions
 * ```typescript
 * const revealExit = (exitDir: string, to: string) => {
 *   return (context) => {
 *     // Reusable logic for revealing exits
 *   };
 * };
 * 
 * traits: new Map([
 *   [TraitType.PUSHABLE, {
 *     onPush: revealExit('north', 'secret-room')
 *   }]
 * ])
 * ```
 */