/**
 * @sharpee/platform-browser
 *
 * Browser client infrastructure for Sharpee interactive fiction.
 * Provides reusable managers for save/restore, themes, menus, dialogs, input, and display.
 */

// Main client
export { BrowserClient, BROWSER_CAPABILITIES } from './BrowserClient.js';

// Types
export type {
  BrowserClientConfig,
  BrowserClientCallbacks,
  BrowserClientInterface,
  ThemeConfig,
  StoryInfo,
  DOMElements,
  SaveSlotMeta,
  BrowserSaveEnvelope,
  MenuHandlers,
  SaveContext,
} from './types.js';

export { AUTOSAVE_SLOT } from './types.js';

// Individual managers (for advanced use)
export { ThemeManager } from './managers/ThemeManager.js';
export { SaveManager } from './managers/SaveManager.js';
export { DialogManager } from './managers/DialogManager.js';
export { MenuManager } from './managers/MenuManager.js';
export { InputManager } from './managers/InputManager.js';

// Display components
export { TextDisplay } from './display/TextDisplay.js';
export { StatusLine } from './display/StatusLine.js';

// Audio
export { AudioManager } from './audio/AudioManager.js';

// ADR-165 channel renderers + default layout
export * from './channels/index.js';
