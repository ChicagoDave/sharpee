# Assessment: Missing Search Patterns in Core Grammar

**Date**: 2025-12-28
**Issue**: "search mailbox" and "look in mailbox" commands not recognized
**Status**: RESOLVED

## Problem

Commands like "search mailbox" and "look in mailbox" failed to parse. The `core-grammar.ts` only defined `search [carefully]` (intransitive) but was missing transitive variants.

## Architecture Note

- `parser-en-us` owns English grammar → `core-grammar.ts`
- `lang-en-us` owns English text output → messages, help text
- Stories can extend grammar for story-specific commands

Patterns in `lang-en-us` (e.g., `searchingLanguage.patterns`) are for documentation/help text, not parser grammar.

## What Was Missing

| Command | Was | Now |
|---------|-----|-----|
| `search` (no target) | Works | Works |
| `search mailbox` | Failed | Works |
| `look in mailbox` | Failed | Works |
| `look inside mailbox` | Failed | Works |
| `look through mailbox` | Failed | Works |
| `rummage in/through mailbox` | Failed | Works |

## Resolution

Added patterns to `packages/parser-en-us/src/core-grammar.ts`:

```typescript
grammar.define('search :target')
  .where('target', (scope: ScopeBuilder) => scope.visible())
  .mapsTo('if.action.searching')
  .build();

grammar.define('look in|inside :target')
  .where('target', (scope: ScopeBuilder) => scope.visible())
  .mapsTo('if.action.searching')
  .build();

grammar.define('look through :target')
  .where('target', (scope: ScopeBuilder) => scope.visible())
  .mapsTo('if.action.searching')
  .build();

grammar.define('rummage in|through :target')
  .where('target', (scope: ScopeBuilder) => scope.visible())
  .mapsTo('if.action.searching')
  .build();
```

All transcript tests pass (38/38).
