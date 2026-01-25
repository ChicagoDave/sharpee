/**
 * @sharpee/platform-browser
 *
 * Browser client infrastructure for Sharpee interactive fiction.
 * Provides reusable managers for save/restore, themes, menus, dialogs, input, and display.
 */

// Main client
export { BrowserClient } from './BrowserClient';

// Types
export type {
  BrowserClientConfig,
  BrowserClientCallbacks,
  BrowserClientInterface,
  ThemeConfig,
  StoryInfo,
  DOMElements,
  SaveSlotMeta,
  BrowserSaveData,
  MenuHandlers,
  SaveContext,
} from './types';

export { AUTOSAVE_SLOT } from './types';

// Individual managers (for advanced use)
export { ThemeManager } from './managers/ThemeManager';
export { SaveManager } from './managers/SaveManager';
export { DialogManager } from './managers/DialogManager';
export { MenuManager } from './managers/MenuManager';
export { InputManager } from './managers/InputManager';

// Display components
export { TextDisplay } from './display/TextDisplay';
export { StatusLine } from './display/StatusLine';

// Audio
export { AudioManager } from './audio/AudioManager';
