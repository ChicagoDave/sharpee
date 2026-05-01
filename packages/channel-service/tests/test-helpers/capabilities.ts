/**
 * Test helpers for `ClientCapabilities` shapes used across Phase 2 tests.
 */

import type { ClientCapabilities } from '../../src/wire';

/**
 * A fully-graphical client — every boolean capability set to `true`.
 * Used by AC-3, AC-6, AC-12 where every media channel should appear
 * in the manifest and every media event should route successfully.
 */
export const FULL_CAPABILITIES: ClientCapabilities = {
  text: true,
  images: true,
  animations: true,
  video: true,
  sound: true,
  music: true,
  speech: true,
  splitPane: true,
  statusBar: true,
  sidebar: true,
  clickableText: true,
  clickableImage: true,
  dragDrop: true,
  transitions: true,
  layers: true,
  customFonts: true,
};

/**
 * Pure-text CLI capabilities — text only, no media. Used for filtering
 * comparison tests and to verify that the platform standard set still
 * functions on a minimal-capability surface.
 */
export const TEXT_ONLY_CAPABILITIES: ClientCapabilities = {
  text: true,
  images: false,
  animations: false,
  video: false,
  sound: false,
  music: false,
  speech: false,
  splitPane: false,
  statusBar: false,
  sidebar: false,
  clickableText: false,
  clickableImage: false,
  dragDrop: false,
  transitions: false,
  layers: false,
  customFonts: false,
};
