# parser-en-us — Claude Instructions

> Scoped to `packages/parser-en-us/`. See the root `CLAUDE.md` for project-wide policy.

## Parser vs Language Layer

**Parser owns grammar, language layer owns text.**

| Package        | Owns                | Examples                                            |
| -------------- | ------------------- | --------------------------------------------------- |
| `parser-en-us` | Grammar patterns    | `grammar.ts`: verb patterns, slot constraints       |
| `lang-en-us`   | Messages, help text | `searching.ts`: error messages, action descriptions |

- Add new command patterns to `src/grammar.ts`.
- Patterns in `lang-en-us` action files are for documentation/help, not parsing.
- Stories can extend grammar for story-specific commands via `extendParser()`.

## Grammar Patterns (ADR-087)

Use the **action-centric** `.forAction()` API for standard verb patterns:

```typescript
// Preferred: action-centric with verb aliases
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', (scope) => scope.touchable())
  .build();
// Generates: push :target, press :target, shove :target, move :target

// Direction commands with aliases
grammar
  .forAction('if.action.going')
  .directions({
    north: ['north', 'n'],
    south: ['south', 's'],
    // ...
  })
  .build();
```

Use `.define()` only for:

- **Phrasal verbs**: `pick up :item`, `put down :item`
- **Complex patterns**: `unlock :door with :key`
- **Story-specific commands**: `incant :word`

```typescript
// Phrasal verb — can't use forAction because verb has space
grammar
  .define('pick up :item')
  .where('item', (scope) => scope.visible().matching({ portable: true }))
  .mapsTo('if.action.taking')
  .build();
```

## Story Grammar Extension

Stories extend grammar in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Literal patterns for story-specific verbs
  grammar
    .define('turn switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .withPriority(150)
    .build();

  // Patterns with slots
  grammar
    .define('say :arg')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(150)
    .build();
}
```

**Key points**:

- Use `.define()` for literal patterns or phrasal verbs.
- Higher priority (150+) for story-specific patterns.
- Stdlib grammar uses `.forAction()` — stories usually don't need this.
