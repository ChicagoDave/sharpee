# Building a Flexible Interactive Fiction Engine: Extensions, Interfaces, and Semantic Grammar

*August 18, 2025*

When building an interactive fiction (IF) engine, one of the most challenging aspects is creating a system that's both powerful enough for complex stories and flexible enough to accommodate different authoring styles. Today, I want to share three interconnected architectural decisions in Sharpee that work together to create this flexibility: our extension system, interface refactoring, and semantic grammar parsing.

## The Extension Challenge

Every IF story is unique. A mystery game might need a conversation system with interrogation mechanics. A puzzle game might require complex object interactions. A fantasy adventure might implement a magic system. How do you build an engine that can support all these different needs without becoming a bloated, unmaintainable mess?

Traditional approaches often fall into two traps:
1. **The Kitchen Sink**: Include every possible feature in the core engine, making it heavy and complex
2. **The Walled Garden**: Provide limited customization points, forcing authors to work around the engine's limitations

We chose a third path: a lean core with a powerful extension system.

## Extensions as First-Class Citizens

In Sharpee, extensions aren't an afterthought—they're how the engine itself is built. Even our standard library of actions (TAKE, DROP, EXAMINE, etc.) is implemented as an extension. This dog-fooding approach ensures that story authors have the same power as engine developers.

An extension in Sharpee can:
- Add new actions and commands
- Define custom traits for entities
- Register event handlers for game events
- Provide language-specific vocabulary and messages
- Implement entirely new game mechanics

Here's what a simple extension looks like:

```typescript
export const conversationExtension: IExtension = {
  metadata: {
    id: 'conversation',
    name: 'Conversation System',
    version: '1.0.0',
    description: 'Adds dialogue and conversation mechanics'
  },
  
  traits: [
    {
      id: 'conversable',
      schema: ConversableSchema,
      implementation: ConversableTrait
    }
  ],
  
  actions: [
    {
      id: 'if.action.talking',
      pattern: 'talk to :character',
      implementation: TalkingAction
    }
  ],
  
  eventHandlers: {
    'conversation.started': handleConversationStart,
    'conversation.ended': handleConversationEnd
  }
};
```

This extension adds the ability for entities to be conversable, implements a TALK TO command, and handles conversation-related events. A story that doesn't need conversations simply doesn't load this extension.

## The Interface Refactoring Journey

As our extension system grew, we encountered a problem. We had interfaces scattered across packages with inconsistent naming. Some interfaces in our `core` package were actually implementation details. Others in our `stdlib` package were mixing contracts with implementations.

More critically, we discovered naming collisions. Both `core` and `stdlib` defined an `Action` interface, but they meant different things. The core version was a low-level execution interface, while the stdlib version was a rich, author-friendly abstraction.

This led to our I-prefix refactoring initiative. We established clear rules:
- All interfaces get an `I` prefix (following TypeScript conventions)
- Core package contains only pure interface definitions
- Implementation classes live in their respective domain packages
- Extension points are clearly marked as interfaces

The refactoring revealed our true architecture:

```
@sharpee/core (IAction, IEntity, ISemanticEvent)
    ↓
@sharpee/world-model (IWorldModel, IFEntity extends IEntity)
    ↓
@sharpee/if-domain (contracts for IF concepts)
    ↓
@sharpee/stdlib (rich implementations with scope & validation)
```

This layering allows extensions to hook in at the appropriate level. A simple extension might just use stdlib's rich interfaces. A complex extension might implement core interfaces directly for maximum control.

## Semantic Grammar: Understanding Intent

The third piece of the puzzle is semantic grammar parsing. Traditional IF parsers match patterns and extract objects:

```
Pattern: "put :item in :container"
Result: { verb: "put", directObject: item, indirectObject: container }
```

This works, but it loses information. Did the player type "carefully place," "jam," or "gently set"? These variations carry semantic meaning that can enhance the story's response.

Our semantic grammar system preserves and enriches this information:

```typescript
{
  pattern: 'put|place|jam|shove|stuff :item :container',
  semantics: {
    'put': { manner: 'normal' },
    'place': { manner: 'careful' },
    'jam': { manner: 'forceful' },
    'shove': { manner: 'forceful' },
    'stuff': { manner: 'careless' }
  }
}
```

When a player types "jam coin slot", the action receives:

```typescript
{
  actionId: 'if.action.inserting',
  directObject: coin,
  indirectObject: slot,
  semantics: {
    manner: 'forceful'
  }
}
```

Actions can now respond appropriately:

```typescript
if (semantics.manner === 'forceful') {
  return event('action.success', {
    messageId: 'inserted_forcefully',
    params: { item: coin.name }
  });
}
```

This semantic information flows through the entire system. Extensions can define their own semantic properties. Event handlers can react to how actions were performed, not just what was done.

## Bringing It All Together

These three architectural decisions reinforce each other:

1. **Extensions** need clear interfaces to hook into the engine
2. **Interfaces** need to be well-organized to support extensions
3. **Semantic grammar** provides rich information that extensions can leverage

Consider a combat extension. It can:
- Define interfaces for combat-capable entities (using our refactored interface system)
- Add semantic properties for attack manner (slash, stab, swing)
- React to these semantics in combat resolution

The result is a system where:
- The core engine remains lean and focused
- Story authors have unlimited flexibility
- The architecture stays clean and maintainable
- Player intent is preserved and understood

## Looking Forward

We're continuing to evolve these systems. Current work includes:
- Standardizing extension APIs across all packages
- Adding semantic properties for emotional tone
- Creating a marketplace for sharing extensions
- Building developer tools for extension creation

The goal isn't just to build another IF engine. It's to create a platform where story authors can focus on their narrative while having the power to implement any mechanic their story needs.

Interactive fiction is a unique medium that sits at the intersection of literature and software. Our architecture embraces both sides of that intersection—providing the structure of good software engineering while preserving the expressiveness needed for compelling storytelling.

---

*Sharpee is an open-source interactive fiction engine written in TypeScript. Learn more at [sharpee.plover.net](https://sharpee.plover.net) or contribute on [GitHub](https://github.com/sharpee/sharpee).*