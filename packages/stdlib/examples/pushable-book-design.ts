/**
 * Design for Author-Defined Action Logic
 * 
 * Problem: Authors need to attach custom logic to specific entity+action combinations
 * Solution: A hook system that works with the existing trait/action architecture
 */

import { IFEntity, PushableTrait, TraitType } from '@sharpee/world-model';
import { ActionContext, ActionResult } from '../src/actions/enhanced-types';

/**
 * PROPOSED DESIGN:
 * 
 * 1. Add a 'customHandler' field to traits
 * 2. Actions check for and execute custom handlers
 * 3. Custom handlers are registered separately from entity data
 */

// Step 1: Extend PushableTrait to include customHandler
interface ExtendedPushableData {
  // ... existing fields ...
  
  /**
   * ID of a custom handler function for this specific pushable
   * This allows authors to define unique behavior per entity
   */
  customHandler?: string;
}

// Step 2: Author registers custom handlers in their story
class StoryCustomHandlers {
  private handlers = new Map<string, (entity: IFEntity, context: ActionContext) => ActionResult>();
  
  register(id: string, handler: (entity: IFEntity, context: ActionContext) => ActionResult) {
    this.handlers.set(id, handler);
  }
  
  get(id: string) {
    return this.handlers.get(id);
  }
}

// Step 3: In the story definition
const story = {
  customHandlers: new StoryCustomHandlers()
};

// Author registers their custom handler
story.customHandlers.register('revealBookshelfPassage', (entity, context) => {
  const pushable = entity.get(TraitType.PUSHABLE) as PushableTrait;
  
  // Check state
  if (pushable.state === 'activated') {
    return {
      success: false,
      messageId: 'already_revealed',
      params: {},
      events: []
    };
  }
  
  // Perform custom logic
  pushable.state = 'activated';
  
  // Modify world
  const library = context.world.getEntity('library');
  library.exits.north = 'secret-room';
  context.world.removeEntity('bookshelf');
  
  return {
    success: true,
    messageId: 'bookshelf_slides',
    params: { book: entity.name },
    events: [
      { type: 'passage.revealed', data: { exit: 'north' } }
    ]
  };
});

// Step 4: Create the red book with custom handler reference
const redBook = {
  id: 'red-book',
  name: 'red leather book',
  traits: new Map([
    [TraitType.PUSHABLE, new PushableTrait({
      pushType: 'button',
      customHandler: 'revealBookshelfPassage'  // <-- Reference to custom handler
    })]
  ])
};

// Step 5: Modified pushing action
function pushingActionExecute(context: ActionContext): SemanticEvent[] {
  const target = context.command.directObject?.entity;
  const pushable = target.get(TraitType.PUSHABLE) as PushableTrait;
  
  // Check for custom handler FIRST
  if (pushable.customHandler) {
    const handler = context.story.customHandlers.get(pushable.customHandler);
    if (handler) {
      const result = handler(target, context);
      return convertToEvents(result, context);
    }
  }
  
  // Then check for ActionBehaviors (button, lever, etc.)
  const behavior = behaviorRegistry.find(target, 'pushing');
  if (behavior) {
    const result = behavior.execute(target, context);
    return convertToEvents(result, context);
  }
  
  // Finally, default behavior
  return [context.event('action.success', {
    actionId: 'pushing',
    messageId: 'pushed',
    params: { object: target.name }
  })];
}

/**
 * EXECUTION FLOW:
 * 
 * 1. Player types: "push red book"
 * 2. Pushing action validates (book is pushable, in reach, etc.)
 * 3. Pushing action executes:
 *    a. Sees customHandler: 'revealBookshelfPassage'
 *    b. Looks up handler in story.customHandlers
 *    c. Executes the custom handler
 *    d. Returns custom result
 * 4. Events are emitted, message is shown
 * 
 * BENEFITS:
 * - Clean separation of data (traits) and logic (handlers)
 * - Authors have full control over custom behavior
 * - ActionBehaviors still handle common patterns
 * - Can be serialized (just save the handler ID, not the function)
 * - Type-safe with TypeScript
 * 
 * HIERARCHY:
 * 1. Custom handlers (most specific)
 * 2. ActionBehaviors (common patterns)
 * 3. Default action behavior (fallback)
 */