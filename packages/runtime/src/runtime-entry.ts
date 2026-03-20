/**
 * @sharpee/runtime - Browser Entry Point
 *
 * This file is the entry point for the esbuild IIFE bundle.
 * It exposes the full Sharpee API on window.Sharpee and starts
 * the PostMessage bridge.
 *
 * Usage:
 *   1. Load sharpee-runtime.js in an iframe
 *   2. The runtime sends 'sharpee:ready' to the parent frame
 *   3. Parent sends 'sharpee:load-story' with generated JS code
 *   4. The story code can reference window.Sharpee.* for all engine APIs
 */

// Import everything we want to expose on the global
import * as SharpeeAPI from './index';
import { SharpeeRuntimeBridge } from './bridge';

// ─── Expose API on window.Sharpee ──────────────────────────────

declare global {
  interface Window {
    Sharpee: typeof SharpeeAPI;
    SharpeeStory: import('@sharpee/engine').Story | undefined;
    SharpeeBridge: SharpeeRuntimeBridge;
  }
}

(window as any).Sharpee = SharpeeAPI;

// ─── Start the bridge ──────────────────────────────────────────

const bridge = new SharpeeRuntimeBridge();
(window as any).SharpeeBridge = bridge;
bridge.listen();
