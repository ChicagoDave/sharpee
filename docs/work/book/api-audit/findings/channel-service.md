# Findings — @sharpee/channel-service

## Author-relevance
Extension-facing / platform-internal, with a thin author-facing slice. The book's Part VII uses the **consumer-side** types it defines: `Renderer` (host class) and the `ChannelRenderer` plug-in contract are what every custom UI surface implements; `IRenderer` is the interface authors program against. `ChannelService` (the producer) is platform-internal (engine wires it). The wire/channel *types* are merely re-exported from `@sharpee/if-domain` — `if-domain` is their canonical home, so the book should cite them there, not here.

## Naming
Clean and well-disciplined. Notes:
- The `I`-prefix is used inconsistently across the surface — `IChannelRegistry`, `IOChannel`, `IRenderer` carry it, but `ChannelService`, `ChannelRenderer`, `Decoder`, `ChannelStateStore` do not. The aliasing in `renderer/index.d.ts` (`export type { Renderer as IRenderer }`) shows the tension: there is both a `Renderer` **interface** and a `Renderer` **class**, disambiguated only by re-exporting the interface as `IRenderer`. That dual-`Renderer` is the single biggest naming hazard for the book.
- `PROTOCOL_VERSION` const SCREAMING_CASE — consistent with codebase.
- `CLIRenderOptions` — the TSDoc itself flags the name is misleading ("not CLI-specific in practice"); a vestigial name from its `text-service` origin.
- Fallback sink types (`FallbackOutputSink`, `FallbackWarningSink`) — clear.

## Should-be-internal
- `BuildInput` — input to `ChannelService.build`, only the engine calls it. Producer-side; not author-facing.
- `createJsonTreeFallbackFactory`, `FallbackOutputSink`, `FallbackWarningSink` — debug-fallback plumbing; a renderer host rarely overrides these. Borderline-internal.
- `flattenContent` / `renderToString` / `renderStatusLine` / `CLIRenderOptions` — flattening helpers consumed by transcript tooling and dev scripts; useful but utility-tier, not core author API.
- `DecoderState` / `Decoder` / `createDecoder` — only multi-user/remote transport consumers need the bootstrap-order decoder; single-bundle stories never touch it.

## API shape
- `BuildInput.world: unknown` — `unknown` in a public signature (documented: if-domain cannot import `IWorldModel`, closures cast at the boundary). Honest but loose.
- `ChannelStateStore` is `{ [channelId: string]: unknown | unknown[] | undefined }` — `unknown` index map; the renderer reads, dispatcher writes. Acceptable for a generic store but offers no type help to authors.
- `ChannelRenderer.onValue(value: unknown, channel: ChannelDefinition)` — `value` is `unknown` because mode determines its shape (replace=scalar, append=array, event=payload). Documented thoroughly but forces casts in every concrete renderer.
- `SlotHandle = unknown` — opaque-by-design; hosts narrow to `HTMLElement`. Intentional, well-documented.
- Duplicate concept: the `Renderer` interface and `Renderer` class describe the same contract twice (the class `implements RendererInterface`). The book must pick one to teach against.

## Documentation (TSDoc)
Outstanding — essentially 100% of public symbols documented, with extensive ADR cross-references, lifecycle contracts, and per-mode emission tables (`ChannelService.build`, `Renderer.applyCmgt`/`applyTurnPacket`, `ChannelRenderer` hooks). Among the best-documented packages in the audit. No notable undocumented symbols.

## Book highlights
- `Renderer` class + `createRenderer` + the `IRenderer` interface — the consumer-side host every custom UI drives (`registerRenderer`, `registerSlot`, `getSlot`, `onCommand`, `emitCommand`, `applyCmgt`, `applyTurnPacket`).
- `ChannelRenderer` interface — the per-channel plug-in contract authors implement (`onValue` required; `onClear`/`onCmgt`/`onDestroy` optional). Central to "write a custom channel renderer."
- `ChannelStateStore` / `SlotHandle` — the renderer's state + slot model.
- `flattenContent`, `renderToString`, `renderStatusLine` — display-flattening utilities for CLI/transcript/chat surfaces.
- `Decoder` / `createDecoder` / `DecoderState` — bootstrap-order enforcement for multi-user transport (advanced chapter).
- Note for the book: cite the wire/channel *types* (`IOChannel`, `TurnPacket`, `CmgtPacket`, `ClientCapabilities`, etc.) from `@sharpee/if-domain`, their canonical home.
