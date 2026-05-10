/**
 * @sharpee/channel-service
 *
 * Channel-I/O wire producer for Sharpee surfaces (ADR-163,
 * closure-per-channel model — 2026-05-02 rewrite + 2026-05-03 refinement).
 *
 * Owner context: platform package — runs in-process wherever the engine
 * runs (Node CLI, multi-user server, browser zifmia, platform-browser).
 *
 * Public interface:
 *
 * - **`ChannelService`** — concrete runtime class. Constructor takes an
 *   `IChannelRegistry` plus the client's `ClientCapabilities`.
 *   - `buildManifest()` returns a `CmgtPacket` (capability-filtered).
 *   - `build({ world, events, blocks, turn })` walks the registry,
 *     calls each `IOChannel.produce`, and returns a `TurnPacket`.
 * - **Channel + wire types** are re-exported from `@sharpee/if-domain`
 *   for caller convenience. `if-domain` is the single canonical home
 *   for these contracts (CLAUDE.md rule 7b).
 * - **Wire decoder** ships here (`createDecoder`, `Decoder`,
 *   `DecoderState`) for clients that receive packets and need
 *   bootstrap-order enforcement.
 * - **`flattenContent`** utility for projecting `TextContent` arrays
 *   to plain strings (used by closures and renderers).
 *
 * Standard channel definitions (`main`, `prompt`, `score`, `turn`,
 * `location`, media channels, etc.) live in `@sharpee/stdlib` per
 * ADR-163 §7, §14. This package is domain-agnostic — it does not know
 * what `scoring` means or what `room.name` means.
 *
 * @see ADR-163 — Channel-Service Platform
 * @see ADR-165 — Renderer Architecture (consumer side)
 */

export { ChannelService, PROTOCOL_VERSION } from './channel-service';
export type { BuildInput } from './channel-service';

export type {
  IOChannel,
  IChannelRegistry,
  ChannelProduceContext,
  ChannelContentType,
  ChannelMode,
  ChannelEmitPolicy,
  ClientCapabilities,
  CapabilityFlag,
  ChannelDefinition,
  HelloPacket,
  CmgtPacket,
  TurnPacket,
  CommandPacket,
  WirePacket,
} from '@sharpee/if-domain';

export { createDecoder, type Decoder, type DecoderState } from './wire';

export { flattenContent } from './utils/flatten';

// Display flatteners (ADR-174 Phase 2 — `renderToString` / `renderStatusLine`
// migrated here from `@sharpee/text-service` per OQ-1 resolution).
// Used by transcript tooling, dev scripts, and chat overlays that need a
// single string projection of an `ITextBlock[]`. `flattenContent` (above)
// is the lower-level helper used inside producer closures; `renderToString`
// adds smart block-joining, ANSI translation, and status-block filtering.
export { renderToString, renderStatusLine } from './render-to-string';
export type { CLIRenderOptions } from './render-to-string';

// Consumer-side renderer (ADR-165) — see ./renderer.
export {
  Renderer,
  createRenderer,
  createJsonTreeFallbackFactory,
  type RendererOptions,
  type FallbackOutputSink,
  type FallbackWarningSink,
} from './renderer';
export type {
  ChannelRenderer,
  IRenderer,
  ChannelStateStore,
  SlotHandle,
} from './renderer';
