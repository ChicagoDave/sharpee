/**
 * @sharpee/runtime
 *
 * Headless Sharpee engine runtime for embedding in iframes.
 * Communicates with the parent frame (Lantern IDE) via postMessage.
 *
 * The Sharpee API surface (engine, world-model, stdlib, plugins, …)
 * is shared with `@sharpee/bridge` via
 * `@sharpee/sharpee/runtime-surface`. This file adds only the
 * postMessage-transport-specific exports.
 */

// ─── Protocol (the postMessage contract) ──────────────────────────
export * from './protocol.js';

// ─── Bridge ───────────────────────────────────────────────────────
export { SharpeeRuntimeBridge } from './bridge.js';

// ─── Shared engine API surface ────────────────────────────────────
export * from '@sharpee/sharpee/runtime-surface';
