/**
 * sailing.ts — the `use sailing` registry entry.
 *
 * No moment of its own yet: a sailing word written without the `use` line
 * is refused by validateIR before any world is built, and the entry holds
 * the extension's place in the registry's order. The runtime parts are not
 * here: the loader lowers a
 * `sailing` block and `sails:` onto the vehicle's open model and `wind:`
 * onto the expanse, and the vehicle machine plays them.
 *
 * Public interface: SAILING_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-375 D1 — `use sailing` turns the extension on; it builds on `use expanses`.
 * - ADR-375 D4, D5, D7 — the wind, the sailing block and sails this entry gates.
 */
import type { ExtensionRegistration } from '../extension-registry.js';

export const SAILING_EXTENSION: ExtensionRegistration = {};
