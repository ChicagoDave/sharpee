# Implementation Plan: Game Started Banner Event

## Summary

Move the opening banner text from hardcoded `browser-entry.ts` to the language layer via the existing `game.started` event.

**Key finding**: The engine already emits `game.started` with story metadata. We just need text-service to handle it.

## Current State

1. **Engine already emits** `game.started` in `game-engine.ts:381-386`:
   ```typescript
   const startedEvent = createGameStartedEvent({
     id: this.story?.config.id,
     title: this.context.metadata.title,
     author: this.context.metadata.author,
     version: this.context.metadata.version
   }, this.sessionStartTime);
   ```

2. **Text-service** doesn't have a handler for this event - it falls through to generic handling

3. **browser-entry.ts** hardcodes banner in `displayTitle()` - architecture violation

## Implementation

### 1. Text Service Handler (NEW FILE)

`packages/text-service/src/handlers/game.ts`:

```typescript
import { ISemanticEvent } from '@sharpee/core';
import { ITextBlock, createBlock } from '@sharpee/text-blocks';
import { HandlerContext } from './types';

export function handleGameStarted(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const story = event.data?.story || event.data?.payload?.story;
  if (!story) return [];

  const message = context.languageProvider?.getMessage('game.started.banner', {
    title: story.title || 'Unknown',
    author: story.author || 'Unknown',
    version: story.version || '1.0.0'
  });

  if (!message || message === 'game.started.banner') {
    return []; // No template registered
  }

  return [createBlock('game.banner', message)];
}
```

### 2. Text Service Routing

`packages/text-service/src/text-service.ts` - add case:

```typescript
case 'game.started':
  return handleGameStarted(event, context);
```

### 3. Block Key

`packages/text-blocks/src/types.ts` - add to CORE_BLOCK_KEYS:

```typescript
GAME_BANNER: 'game.banner',
```

### 4. Language Provider Default

`packages/lang-en-us/src/language-provider.ts` - in loadCoreMessages():

```typescript
this.messages.set('game.started.banner',
  '{title}\n{description}\n\nType HELP for instructions, ABOUT for credits.'
);
```

### 5. Story Customization

`stories/dungeo/src/index.ts` - in extendLanguage():

```typescript
language.addMessage('game.started.banner',
  `{title}
{description}
By {author}
Ported by {portedBy}

Sharpee v{engineVersion} | Game v{version}

Type HELP for instructions, ABOUT for credits.`
);
```

### 6. Browser Entry Cleanup

`stories/dungeo/src/browser-entry.ts`:
- Remove `displayTitle()` function
- Remove constants: `GAME_TITLE`, `GAME_DESCRIPTION`, `GAME_AUTHORS`, `PORTED_BY`
- Remove `displayTitle()` call from `start()`
- Keep `getTitleInfo()` for ABOUT command (or move that to language layer too)

## Event Flow

```
engine.start()
    → createGameStartedEvent() with story metadata
    → text-service.processTurn()
    → handleGameStarted() produces ITextBlock
    → renderToString()
    → emit('text:output', bannerText)
    → browser-entry displays banner
```

## Files to Modify

| Package | File | Change |
|---------|------|--------|
| text-service | `src/handlers/game.ts` | NEW - handler |
| text-service | `src/handlers/index.ts` | Export handler |
| text-service | `src/text-service.ts` | Route to handler |
| text-blocks | `src/types.ts` | Add block key |
| lang-en-us | `src/language-provider.ts` | Add default message |
| dungeo | `src/index.ts` | Custom banner in extendLanguage() |
| dungeo | `src/browser-entry.ts` | Remove hardcoded banner |

## Notes

- No engine changes needed - event already exists
- Stories customize via `extendLanguage()` - standard pattern
- ABOUT command may need similar treatment (separate task)
