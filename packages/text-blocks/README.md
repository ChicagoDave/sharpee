# @sharpee/text-blocks

Pure interfaces for structured text output (`ITextBlock`, `IDecoration`) on the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/text-blocks
```

## Overview

- **Types only** - TypeScript interfaces and type guards with no runtime dependencies.
- **`ITextBlock`** - a unit of structured output carrying a semantic `key` (its channel) and `content`.
- **`IDecoration`** - decorated content with a fully-resolved CSS class name; per ADR-174 the bracket form `[name:content]` resolves to a `sharpee-`-prefixed class (platform vocabulary) or a bare author class, with no inline styles and no semantic HTML on the wire.
- **`TextContent`** - either a plain string or an `IDecoration`, nestable for rich content.
- These interfaces are the contract between the engine prose pipeline (which produces `ITextBlock[]`) and the renderers that route blocks by key to UI regions.

## Usage

```typescript
import {
  ITextBlock,
  IDecoration,
  TextContent,
  CORE_BLOCK_KEYS,
  isDecoration,
  isStatusBlock,
  extractPlainText,
} from '@sharpee/text-blocks';

// A decorated item name (resolved from `[item:brass lantern]`)
const item: IDecoration = {
  className: 'sharpee-item',
  content: ['brass lantern'],
};

// An action-result block mixing plain text and decoration
const block: ITextBlock = {
  key: CORE_BLOCK_KEYS.ACTION_RESULT,
  content: ['You take the ', item, '.'],
};

// Route and inspect blocks
if (isStatusBlock(block)) {
  // send to the status bar
}

const plain = extractPlainText(block.content); // "You take the brass lantern."
```

## Key Exports

| Export | Description |
|--------|-------------|
| `ITextBlock` | A block of output with a semantic `key` and `content` array |
| `IDecoration` | Decorated content with a resolved `className` (ADR-174) |
| `TextContent` | `string \| IDecoration` |
| `CORE_BLOCK_KEYS` | Platform-defined block keys (`room.name`, `action.result`, etc.) |
| `BLOCK_KEY_PREFIXES` | Routing prefixes (`status.`, `room.`, `action.`) |
| `isDecoration`, `isTextBlock`, `isStatusBlock`, `isRoomBlock`, `isActionBlock`, `hasKeyPrefix` | Type guards |
| `extractPlainText` | Flatten content to a plain string |

## Related Packages

- [@sharpee/channel-service](https://www.npmjs.com/package/@sharpee/channel-service) - Carries blocks over channels
- [@sharpee/core](https://www.npmjs.com/package/@sharpee/core) - Core types and event system
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
