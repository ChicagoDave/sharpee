/**
 * @sharpee/bridge
 *
 * Native engine bridge for Sharpee (ADR-135).
 * Runs as a Node.js subprocess, communicating with a native host
 * via newline-delimited JSON over stdin/stdout.
 *
 * The Sharpee API surface (engine, world-model, stdlib, plugins, …)
 * is shared with `@sharpee/runtime` via
 * `@sharpee/sharpee/runtime-surface`. This file adds only the
 * stdin/stdout-transport-specific exports.
 */

// ─── Protocol (the stdin/stdout contract) ────────────────────────
export * from './protocol.js';

// ─── Bridge ──────────────────────────────────────────────────────
export { NativeEngineBridge } from './bridge.js';

// ─── Shared engine API surface ───────────────────────────────────
export * from '@sharpee/sharpee/runtime-surface';
