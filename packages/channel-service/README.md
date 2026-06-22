# @sharpee/channel-service

Universal channel-I/O wire producer for Sharpee surfaces (ADR-163).

## Installation

```bash
npm install @sharpee/channel-service
```

## Overview

- **Channels are the universal UI surface** (ADR-163) - channels carry all story-to-UI signals (text, status, media, layout) over a single packet stream; transport sits under channels.
- **`ChannelService`** - the in-process producer. It walks an `IChannelRegistry`, invokes each channel's `produce`, and emits wire packets. It runs wherever the engine runs (Node CLI, multi-user server, browser).
- **Capability-filtered manifest** - `buildManifest()` returns a `CmgtPacket` tailored to the client's `ClientCapabilities`; `build(...)` returns a per-turn `TurnPacket`.
- **Wire decoder** - `createDecoder` / `Decoder` enforce bootstrap ordering on the consuming side.
- **Consumer-side renderer** (ADR-165) - `Renderer` / `createRenderer` route decoded packets to per-channel renderers.
- **Domain-agnostic** - standard channel definitions (`main`, `prompt`, `score`, etc.) live in `@sharpee/stdlib`; channel and wire types are re-exported from `@sharpee/if-domain`, their canonical home.

## Usage

```typescript
import {
  ChannelService,
  createDecoder,
  createRenderer,
  renderToString,
  flattenContent,
  type IChannelRegistry,
  type ClientCapabilities,
  type TurnPacket,
} from '@sharpee/channel-service';

// Producer side (runs with the engine)
const service = new ChannelService(registry, capabilities);
const manifest = service.buildManifest();              // CmgtPacket
const packet: TurnPacket = service.build({ world, events, blocks, turn });

// Consumer side — decode, then render to channel surfaces
const decoder = createDecoder();
const decoded = decoder.decode(packet);
const renderer = createRenderer({ /* channel renderers */ });
renderer.apply(decoded);

// CLI / tooling — project an ITextBlock[] to a single string
const text = renderToString(blocks);
```

## Key Exports

| Export | Side | Description |
|--------|------|-------------|
| `ChannelService`, `PROTOCOL_VERSION` | producer | Builds the manifest and per-turn packets |
| `createDecoder`, `Decoder`, `DecoderState` | consumer | Decodes the wire stream with bootstrap-order enforcement |
| `Renderer`, `createRenderer`, `createJsonTreeFallbackFactory` | consumer | Routes packets to per-channel renderers (ADR-165) |
| `renderToString`, `renderStatusLine` | tooling | Single-string projection of an `ITextBlock[]` |
| `flattenContent` | shared | Projects `TextContent` arrays to plain strings |
| `IOChannel`, `IChannelRegistry`, `ClientCapabilities`, `TurnPacket`, `CmgtPacket`, `HelloPacket`, `CommandPacket`, `WirePacket` | types | Channel and wire contracts (re-exported from `@sharpee/if-domain`) |

## Related Packages

- [@sharpee/if-domain](https://www.npmjs.com/package/@sharpee/if-domain) - Canonical channel and wire types
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard channel definitions
- [@sharpee/text-blocks](https://www.npmjs.com/package/@sharpee/text-blocks) - `ITextBlock` / `IDecoration` interfaces
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
