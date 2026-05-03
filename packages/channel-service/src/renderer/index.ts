/**
 * @sharpee/channel-service/renderer — public surface.
 *
 * Owner context: consumer-side dispatcher. Re-exports the `Renderer`
 * host, the `ChannelRenderer` plug-in contract, and the small helpers
 * needed by concrete renderer hosts (browser, CLI, multi-user web
 * client) per ADR-165 §1, §2, §3, §5, §7.
 */

export type {
  ChannelRenderer,
  Renderer as IRenderer,
  ChannelStateStore,
  SlotHandle,
} from './types';

export { Renderer, createRenderer, type RendererOptions } from './renderer';

export {
  createJsonTreeFallbackFactory,
  type FallbackOutputSink,
  type FallbackWarningSink,
} from './json-tree-fallback';
