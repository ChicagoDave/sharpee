# @sharpee/text-services

Text formatting and output services for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/text-services
```

## Overview

Handles text generation and formatting:

- **Text Service** - Converts semantic events to prose
- **Message Formatting** - Variable substitution and pluralization
- **Output Buffering** - Collects and formats game output

## Usage

```typescript
import { TextService } from '@sharpee/text-services';

const textService = new TextService(languageProvider);

// Convert events to text
const output = textService.render(events);
```

## Related Packages

- [@sharpee/lang-en-us](https://www.npmjs.com/package/@sharpee/lang-en-us) - English language pack
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
