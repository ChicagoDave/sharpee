# V13 — Custom Actions

## What This Version Teaches

Custom actions let you add entirely new verbs to your game. When stdlib doesn't have the verb you need, you create your own action with the four-phase pattern.

## Key Concepts

### The Action Interface

Every action implements four phases:

```typescript
const feedAction: Action = {
  id: 'zoo.action.feeding',
  group: 'interaction',

  // Phase 1: Can the action proceed?
  validate(context: ActionContext): ValidationResult {
    if (!hasRequiredItem) return { valid: false, error: 'no_item' };
    return { valid: true };
  },

  // Phase 2: Mutate the world (called only if valid)
  execute(context: ActionContext): void {
    context.world.setStateValue('item-used', true);
  },

  // Phase 3: Generate success events (text output)
  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('action.success', { messageId: 'success_msg' })];
  },

  // Phase 4: Generate failure events (called only if invalid)
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', { messageId: result.error })];
  },
};
```

### Registering Custom Actions

Return your actions from `getCustomActions()`:

```typescript
getCustomActions(): any[] {
  return [feedAction, photographAction];
}
```

### Grammar Extension

Teach the parser your new verbs in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  grammar.define('feed :thing').mapsTo('zoo.action.feeding').withPriority(150).build();
  grammar.define('photograph :thing').mapsTo('zoo.action.photographing').withPriority(150).build();
}
```

### Language Extension

Register message text in `extendLanguage()`:

```typescript
extendLanguage(language: LanguageProvider): void {
  language.addMessage('zoo.feeding.fed_goats', 'The goats eat the feed happily!');
  language.addMessage('zoo.photo.no_camera', "You don't have a camera.");
}
```

### Passing Data Between Phases

Use `context.sharedData` to pass data from validate to execute/report:

```typescript
validate(context) {
  context.sharedData.target = someEntity;
  return { valid: true };
},
execute(context) {
  const target = context.sharedData.target;
  // use target...
}
```

## Commands to Try

```
> south / east / take feed   (get the feed)
> feed goats                 (feed the goats!)
> feed goats                 (already fed)
> photograph toucan          (no camera — blocked)
> west / west / west         (go to gift shop)
> take camera                (get the camera)
> photograph postcards       (Click! Photo taken)
```

## Key Takeaways

- Custom actions need: an Action object, grammar patterns, language messages, and `getCustomActions()`
- The four phases separate concerns: validation, mutation, text output, error handling
- Grammar patterns use `:slot` for entity arguments the parser resolves
- Use `withPriority(150+)` so story patterns take precedence over stdlib
- Message IDs with `{param}` placeholders get filled by the text service
