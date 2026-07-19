# Presentation

Browser web client, channel renderers, and media/audio.

---

## @sharpee/platform-browser

### BrowserClient

```typescript
/**
 * BrowserClient - Main orchestrator for browser-based IF games
 *
 * Wires together all managers (save, theme, dialog, menu, input, display)
 * and provides a simple API for story entry points.
 */
import type { GameEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import type { ISaveRestoreHooks } from '@sharpee/core';
import type { ClientCapabilities } from '@sharpee/if-domain';
import { type IRenderer } from '@sharpee/channel-service';
import type { BrowserClientConfig, BrowserClientInterface, DOMElements } from './types';
import { AudioManager } from './audio/AudioManager';
/**
 * Default `ClientCapabilities` profile for the browser surface — full
 * graphical capabilities so every standard + media channel appears in
 * the per-client manifest. Authors override per `BrowserClientConfig.
 * clientCapabilities` for specialized surfaces (text-only kiosks, etc.).
 */
export declare const BROWSER_CAPABILITIES: ClientCapabilities;
export declare class BrowserClient implements BrowserClientInterface {
    private config;
    private themeManager;
    private saveManager;
    private dialogManager;
    private menuManager;
    private inputManager;
    private textDisplay;
    private statusLine;
    private audioManager;
    private engine;
    private world;
    private currentTurn;
    private currentScore;
    private turnOffset;
    /**
     * The `ISaveData` produced by the engine for the in-flight save
     * request. Set by `onSaveRequested` while the save dialog is open;
     * cleared in the hook's `finally`. Reused by `performSave` so the
     * persisted blob matches what the engine actually serialized for
     * this request, not whatever the world looked like by the time the
     * dialog returned.
     */
    private pendingEngineSave;
    private elements;
    /**
     * ADR-165 channel renderer host. Constructed in `connectEngine()`
     * to drive the visible DOM via channel:manifest / channel:packet
     * (R5-C — primary rendering path).
     */
    private channelRenderer?;
    private channelLayout?;
    constructor(config: BrowserClientConfig);
    /**
     * Initialize the browser client with DOM elements.
     * Call after DOMContentLoaded.
     */
    initialize(elements: DOMElements): void;
    /**
     * Connect to game engine and set up event handlers.
     * Call after creating the engine.
     */
    connectEngine(engine: GameEngine, world: WorldModel): void;
    /**
     * Append a platform-signal message to the main slot. Mirrors the
     * `mainChannelRenderer`'s DOM shape (`<p class="main-entry">` with
     * `pre-line` whitespace) plus a `system-message` class for theme
     * styling. Used for save/restore feedback strings that aren't
     * routed through the engine's text-service block production.
     *
     * Falls back to no-op if the channel layout hasn't been initialized
     * (engine not yet started).
     */
    private appendSystemMessage;
    /**
     * Build the ADR-165 channel renderer wired to the host page's
     * existing DOM elements (R5-C cutover).
     *
     * The host page provides three slots directly (`textContent`,
     * `statusLocation`, `statusScore`, `commandInput`). The remaining
     * slots needed by the platform-default renderers (notify, media,
     * meta, separate prompt label, separate turn element) are mounted
     * as hidden children of the existing main window.
     *
     * Score / turn override: the host page typically has a single
     * combined `Score: X | Turns: Y` element. After
     * `registerDefaultBrowserRenderers` we replace the platform-default
     * `score` and `turn` renderers with composites that update the
     * combined element. Stories that supply two separate elements get
     * the platform default by overriding back.
     *
     * Hotspot commands route through `engine.executeTurn` so UI
     * gestures synthesize typed-equivalent commands per ADR-163 §10.
     *
     * Auto-save migrates here from the legacy `text:output` listener:
     * `channel:packet` fires on every turn boundary (including idle
     * turns), so this is the single dependable signal.
     */
    private setupChannelRenderer;
    /**
     * Build a `BrowserDefaultLayout` from the existing host elements,
     * synthesizing hidden children for slots the host page doesn't
     * provide. Lets the platform-default renderers run against the
     * same DOM the legacy path used.
     */
    private adaptHostLayout;
    /**
     * True when channel-debug logging is enabled. Three opt-in paths
     * (any one is sufficient):
     *  1. `BrowserClientConfig.debugChannels: true`
     *  2. URL query string `?debug-channels=1` (or any truthy value)
     *  3. `localStorage['sharpee-debug-channels']` set to a truthy value
     *
     * Lets authors flip on/off without rebuilding — useful when
     * inspecting an installed bundle's per-turn channel emissions.
     */
    private shouldDebugChannels;
    /**
     * Render the combined `Score: X | Turns: Y` string into the host
     * page's combined status element. The host's traditional layout
     * uses one element; the score and turn channel renderers feed this
     * function rather than writing directly.
     */
    private renderCombinedStatus;
    /**
     * Start the game (check for autosave, show initial look)
     */
    start(): Promise<void>;
    /**
     * Execute a command
     */
    executeCommand(command: string): Promise<void>;
    /**
     * Get ISaveRestoreHooks for engine registration
     */
    getSaveRestoreHooks(): ISaveRestoreHooks;
    private handleSave;
    private handleRestore;
    /**
     * Show the restore dialog, load the envelope, apply the engine save,
     * and update browser-side UI. Returns true on success, false if the
     * user cancelled or no save was found. Used by both the menu path
     * and the engine-event hook path so they share identical timing.
     *
     * The order is deliberate: the engine save is applied to the world
     * BEFORE any UI update so that {@link updateStatusLine} (which reads
     * the player's containing room from the world) sees the post-restore
     * state.
     */
    private runRestoreDialog;
    private handleRestart;
    private handleQuit;
    displayText(text: string): void;
    displayCommand(command: string): void;
    clearScreen(): void;
    getWorld(): WorldModel;
    getCurrentTurn(): number;
    getCurrentScore(): number;
    /**
     * The ADR-165 channel renderer this client drives. Stories register
     * additional renderers (typically for story-defined channels like
     * `ambient:<id>` or custom event channels) by calling
     * `renderer.registerRenderer(...)` on the returned instance.
     *
     * Available after `connectEngine()` returns and before
     * `start()` is called — that window is when the default platform
     * renderers are registered but no `channel:packet` has fired yet.
     * Throws if called before `connectEngine()` (the renderer doesn't
     * exist yet).
     */
    getChannelRenderer(): IRenderer;
    /**
     * The shared `AudioManager` instance the platform-default audio
     * renderers (`sound`, `music`, `ambient:*`) delegate to. Stories
     * registering a custom `ambient:<id>` renderer pass this instance
     * to `createAmbientChannelRenderer(audio, id)` so playback shares
     * one Web Audio context.
     */
    getAudioManager(): AudioManager;
    /**
     * Call into the engine's save serializer. The engine produces a
     * complete `ISaveData` carrying the world's full runtime state via
     * the gzipped `worldSnapshot` field. Used by every save path
     * (interactive, autosave, startup).
     *
     * The cast bypasses the engine's `private` modifier on this method;
     * the platform-browser host needs both interactive (hook-driven) and
     * non-interactive (autosave / startup-restore) save paths, and the
     * public hook flow only covers the interactive case. Mirrors the
     * pattern used by the engine's own test suite.
     */
    private engineCreateSave;
    /** Apply an engine save to the live world via `WorldModel.loadJSON`. */
    private engineApplySave;
    private performSave;
    private getSaveContext;
    private updateStatusLine;
    private syncScoreFromWorld;
}
```

### types

```typescript
/**
 * Types and interfaces for @sharpee/platform-browser
 */
import type { ISaveData } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
/**
 * Theme configuration
 */
export interface ThemeConfig {
    /** Theme identifier (used in data-theme attribute) */
    id: string;
    /** Display name for menu */
    name: string;
}
/**
 * Story metadata for display
 */
export interface StoryInfo {
    /** Game title */
    title: string;
    /** Game description */
    description?: string;
    /** Author(s) */
    authors: string | string[];
    /** Who ported/implemented the game */
    portedBy?: string;
    /** Story version */
    version: string;
    /** Engine version */
    engineVersion: string;
    /** Build date string */
    buildDate: string;
}
/**
 * Story-specific callbacks for customizing behavior. Reserved for
 * future hooks; the Phase 4 retirement of `handleStoryEvent`
 * (channel-io-event-retirement) leaves this interface empty.
 *
 * Stories that need to react to engine signals should define
 * `IOChannel`s via `Story.registerChannels` and register browser-side
 * renderers in their entry point — channels are the universal UI
 * surface (per ADR-163 and the project's channel-IO commitment).
 *
 * `getHelpText` / `getAboutText` are accepted by `BrowserClientConfig`
 * via index signatures on the consuming menus and dialogs; they are
 * not declared here yet — that surface still ships ad-hoc and is a
 * separate cleanup target.
 */
export interface BrowserClientCallbacks {
}
/**
 * Interface for BrowserClient that callbacks receive
 */
export interface BrowserClientInterface {
    displayText(text: string): void;
    displayCommand(command: string): void;
    clearScreen(): void;
    getWorld(): WorldModel;
    getCurrentTurn(): number;
    getCurrentScore(): number;
}
/**
 * Configuration for BrowserClient
 */
export interface BrowserClientConfig {
    /** Storage key prefix for localStorage (e.g., "dungeo-") */
    storagePrefix: string;
    /** Default theme identifier */
    defaultTheme: string;
    /** Available themes with display names */
    themes: ThemeConfig[];
    /** Auto-save after each turn (default: true) */
    autoSave?: boolean;
    /** Story metadata for display */
    storyInfo: StoryInfo;
    /** Story-specific callbacks */
    callbacks?: BrowserClientCallbacks;
    /**
     * Client capabilities passed to `engine.start({ capabilities })`.
     * Defaults to `BROWSER_CAPABILITIES` (full graphical profile) when
     * omitted. Authors override per surface — e.g., a text-only kiosk
     * mode that suppresses media channels.
     */
    clientCapabilities?: import('@sharpee/if-domain').ClientCapabilities;
    /**
     * Log every `channel:packet` payload to the browser console for
     * debugging. Each turn emits one `console.log('[channel:packet
     * turn=X]', payload)` line; DevTools renders the payload as an
     * expandable JSON tree.
     *
     * Off by default. Authors can also enable at runtime without
     * rebuilding via either:
     *  - URL query: `?debug-channels=1`
     *  - localStorage: `localStorage.setItem('sharpee-debug-channels', '1')`
     * Any of the three (config flag, query, localStorage) turns it on.
     */
    debugChannels?: boolean;
}
/**
 * DOM element references passed to managers
 */
export interface DOMElements {
    statusLocation: HTMLElement | null;
    statusScore: HTMLElement | null;
    textContent: HTMLElement | null;
    mainWindow: HTMLElement | null;
    commandInput: HTMLInputElement | null;
    saveDialog: HTMLDialogElement | null;
    restoreDialog: HTMLDialogElement | null;
    startupDialog: HTMLDialogElement | null;
    saveNameInput: HTMLInputElement | null;
    saveSlotsListEl: HTMLElement | null;
    restoreSlotsListEl: HTMLElement | null;
    noSavesMessage: HTMLElement | null;
    startupSaveInfo: HTMLElement | null;
    menuBar: HTMLElement | null;
}
/**
 * Save slot metadata (stored in index)
 */
export interface SaveSlotMeta {
    name: string;
    timestamp: number;
    turnCount: number;
    location: string;
}
/**
 * Browser-specific save envelope.
 *
 * Wraps the engine's `ISaveData` (which carries the full world state via
 * the gzipped `worldSnapshot` field, post the platform-wide save/restore
 * fix) with browser-only metadata that the engine doesn't model:
 * the rendered transcript HTML and the visible status the user picked
 * the slot by.
 *
 * v4.0.0: cutover from the v3.0.0-delta in-house serializer (which
 * silently dropped score, capabilities, world state values,
 * relationships, and ID counters). The whole envelope is lz-string
 * compressed before writing to localStorage to keep storage compact
 * even though the engine's worldSnapshot is already gzipped — the
 * compression compounds on the surrounding JSON.
 */
export interface BrowserSaveEnvelope {
    /** Envelope format version. Distinct from the engine's save version. */
    envelopeVersion: '4.0.0';
    /** Unix timestamp when the envelope was written. */
    timestamp: number;
    /** Engine save data — the canonical world state. */
    engineSave: ISaveData;
    /** Score at save time, captured for the index display. */
    score: number;
    /** Compressed HTML transcript (innerHTML of #text-content). */
    transcriptHtml?: string;
}
/**
 * Context for save operations
 */
export interface SaveContext {
    turnCount: number;
    score: number;
    transcriptHtml: string;
}
/**
 * Menu action handlers
 */
export interface MenuHandlers {
    onSave: () => Promise<void>;
    onRestore: () => Promise<void>;
    onRestart: () => Promise<void>;
    onQuit: () => void;
    onThemeSelect: (theme: string) => void;
    onHelp: () => void;
    onAbout: () => void;
}
/**
 * Dialog elements subset (native HTML <dialog> per ADR-170)
 */
export interface DialogElements {
    saveDialog: HTMLDialogElement | null;
    restoreDialog: HTMLDialogElement | null;
    startupDialog: HTMLDialogElement | null;
    saveNameInput: HTMLInputElement | null;
    saveSlotsListEl: HTMLElement | null;
    restoreSlotsListEl: HTMLElement | null;
    noSavesMessage: HTMLElement | null;
    startupSaveInfo: HTMLElement | null;
}
/**
 * Display elements subset
 */
export interface DisplayElements {
    textContent: HTMLElement | null;
    mainWindow: HTMLElement | null;
}
/**
 * Status elements subset
 */
export interface StatusElements {
    statusLocation: HTMLElement | null;
    statusScore: HTMLElement | null;
}
/**
 * Autosave slot name constant
 */
export declare const AUTOSAVE_SLOT = "autosave";
```

### managers/ThemeManager

```typescript
/**
 * ThemeManager - handles theme switching and persistence
 */
import type { ThemeConfig } from '../types';
export interface ThemeManagerConfig {
    /** localStorage key for theme persistence */
    storageKey: string;
    /** Available themes */
    themes: ThemeConfig[];
    /** Default theme if none saved */
    defaultTheme: string;
}
export declare class ThemeManager {
    private storageKey;
    private themes;
    private defaultTheme;
    constructor(config: ThemeManagerConfig);
    /**
     * Apply saved theme immediately (call before DOM ready).
     * This is a static method to be called as IIFE at module load time
     * to prevent flash of default theme.
     *
     * @example
     * // In browser-entry.ts, call immediately:
     * ThemeManager.applyEarlyTheme('dungeo-theme');
     */
    static applyEarlyTheme(storageKey: string): void;
    /**
     * Get saved theme from localStorage
     */
    getSavedTheme(): string;
    /**
     * Save theme to localStorage
     */
    saveTheme(theme: string): void;
    /**
     * Apply a theme to the document and update menu checkmarks
     */
    applyTheme(theme: string): void;
    /**
     * Update theme option checkmarks in the menu. Per ADR-170, the
     * theme picker uses `.sharpee-menu-option[data-theme]` items and the
     * `--checked` state modifier marks the active selection.
     */
    updateMenuCheckmarks(activeTheme: string): void;
    /**
     * Get the available themes
     */
    getThemes(): ThemeConfig[];
    /**
     * Get the default theme
     */
    getDefaultTheme(): string;
}
```

### managers/SaveManager

```typescript
/**
 * `SaveManager` — wraps the engine's `ISaveData` for localStorage
 * persistence and exposes a small UI surface (save index, autosave,
 * transcript decompression).
 *
 * Public interface: {@link SaveManager} class.
 *
 * Bounded context: `@sharpee/platform-browser` host. The host registers
 * `ISaveRestoreHooks` with the engine; on save the engine produces a
 * complete `ISaveData` and the platform wraps it in a
 * {@link BrowserSaveEnvelope}; on restore the platform unwraps the
 * envelope and returns the engine save back to the engine, which
 * applies it via `WorldModel.loadJSON`.
 *
 * History: v3.0.0-delta of this manager implemented its own
 * locations + traits serializer that silently dropped score,
 * capabilities, world state values, relationships, and ID counters.
 * v4.0.0 (this version) routes through the engine's save/restore
 * service and is therefore feature-complete by construction. The save
 * format bumped from `'3.0.0-delta'` → envelope `'4.0.0'`; old slots
 * are rejected.
 */
import type { ISaveData } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import type { BrowserSaveEnvelope, SaveContext, SaveSlotMeta } from '../types';
export interface SaveManagerConfig {
    /** Storage key prefix (e.g., "dungeo-") */
    storagePrefix: string;
    /** WorldModel reference — used only for UI helpers (current location). */
    world: WorldModel;
    /** Callback when state changes (for UI updates) */
    onStateChange?: () => void;
}
export declare class SaveManager {
    private storagePrefix;
    private indexKey;
    private savePrefix;
    private world;
    private onStateChange?;
    constructor(config: SaveManagerConfig);
    /**
     * Walk localStorage for entries under this manager's `savePrefix` and
     * delete any whose envelope is not the current `ENVELOPE_VERSION`.
     * Prunes corresponding index entries.
     *
     * Treats malformed payloads (not lz-string compressed, not JSON, no
     * `envelopeVersion`) as obsolete and deletes them — better than
     * leaving unreadable bytes consuming quota.
     *
     * Idempotent: a second call after a clean-up is a no-op (every
     * remaining entry will pass the version check).
     */
    private cleanupObsoleteSaves;
    /** Get list of all saved games from index. */
    getSaveIndex(): SaveSlotMeta[];
    /** Update save index with new/updated slot. */
    updateSaveIndex(meta: SaveSlotMeta): void;
    /** Get current player's containing-room name, or 'Unknown'. */
    getCurrentLocation(): string;
    /** Generate a suggested save name based on current state. */
    generateSaveName(turnCount: number): string;
    /** Sanitize a user-provided save name for use as a storage key. */
    sanitizeSaveName(name: string): string;
    /**
     * Wrap an engine save in an envelope and persist it to localStorage.
     *
     * @param slotName - already-sanitized slot key.
     * @param engineSave - the canonical save produced by the engine
     *   (`ISaveData`). Carries the full world state via
     *   `engineState.worldSnapshot`.
     * @param context - browser-only context for UI display: turn count
     *   for the slot meta, score for the envelope, transcript HTML to
     *   restore the visible scrollback.
     */
    performSave(slotName: string, engineSave: ISaveData, context: SaveContext, _silent?: boolean): {
        success: boolean;
        error?: string;
    };
    /**
     * Persist an autosave to the dedicated autosave slot. Same envelope
     * shape as {@link performSave}; only the slot key differs.
     */
    performAutoSave(engineSave: ISaveData, context: SaveContext): void;
    /**
     * Load and decompress an envelope from localStorage. Returns `null`
     * for unknown slots, malformed payloads, or wrong-version envelopes.
     * v3.0.0-delta saves are not migrated — they were known-broken.
     */
    loadEnvelope(slotName: string): BrowserSaveEnvelope | null;
    /** Convenience: load the autosave envelope. */
    loadAutosaveEnvelope(): BrowserSaveEnvelope | null;
    /** Decompress transcript HTML from an envelope. */
    decompressTranscript(compressedHtml: string): string;
    /**
     * Sync localStorage saves to world `sharedData` so stdlib actions
     * know saves exist (used by the `restoring` action's listing).
     */
    syncSavesToWorld(): void;
    /** Clear the autosave slot (used on restart). */
    clearAutosave(): void;
    /**
     * Return the most recent save (by timestamp), or `null` if none. Used
     * by the startup dialog to offer a "continue last game" affordance.
     */
    checkForSavedGame(): SaveSlotMeta | null;
    /** Return user-visible saves (everything but the autosave slot). */
    getUserSaves(): SaveSlotMeta[];
}
```

### managers/DialogManager

```typescript
/**
 * DialogManager - handles modal dialogs (save, restore, startup).
 *
 * Per ADR-170, dialogs are native HTML <dialog> elements. Visibility
 * is controlled by `showModal()` / `close()`; ESC and backdrop-click
 * are handled by the browser. The manager attaches a `close` event
 * listener on each dialog so that any close (button, ESC, backdrop)
 * resolves the pending promise consistently. Buttons set the dialog's
 * `returnValue` before closing to communicate intent.
 */
import type { DialogElements, SaveSlotMeta } from '../types';
import type { SaveManager } from './SaveManager';
export interface DialogManagerConfig {
    elements: DialogElements;
    saveManager: SaveManager;
    onDialogOpen?: () => void;
    onDialogClose?: () => void;
    generateSaveName: () => string;
    sanitizeSaveName: (name: string) => string;
    performSave: (slotName: string) => void;
}
export declare class DialogManager {
    private elements;
    private saveManager;
    private onDialogOpen?;
    private onDialogClose?;
    private generateSaveName;
    private sanitizeSaveName;
    private performSave;
    private _isDialogOpen;
    private selectedSaveSlot;
    private pendingSaveResolve;
    private pendingRestoreResolve;
    private pendingStartupResolve;
    constructor(config: DialogManagerConfig);
    isDialogOpen(): boolean;
    showSaveDialog(): Promise<boolean>;
    showRestoreDialog(): Promise<string | null>;
    showStartupDialog(meta: SaveSlotMeta): Promise<boolean>;
    /**
     * Build a save-slot row element with click and keyboard wiring.
     */
    private populateSaveSlotsList;
    private selectSaveSlot;
    setupHandlers(): void;
}
```

### managers/MenuManager

```typescript
/**
 * MenuManager - handles menu bar interactions.
 *
 * Queries DOM by stable ids for individual controls and by .sharpee-*
 * classes for generic affordances (per ADR-170 component contract).
 * State is expressed via the `--open` modifier on .sharpee-menu-bar-item
 * and the native `aria-expanded` attribute on the trigger button.
 */
import type { MenuHandlers } from '../types';
export interface MenuManagerConfig {
    menuBar: HTMLElement | null;
    handlers: MenuHandlers;
}
export declare class MenuManager {
    private handlers;
    constructor(config: MenuManagerConfig);
    /**
     * Close every open menu and clear all aria-expanded flags.
     */
    closeAllMenus(): void;
    /**
     * Toggle the menu owned by the given trigger button. The trigger's
     * parent .sharpee-menu-bar-item carries the --open state modifier
     * that theme CSS reacts to.
     */
    toggleMenu(triggerEl: HTMLElement): void;
    setupHandlers(): void;
}
```

### managers/InputManager

```typescript
/**
 * InputManager - handles command input and history navigation
 */
export interface InputManagerConfig {
    /** Command input element */
    commandInput: HTMLInputElement | null;
    /** Callback to execute a command */
    onCommand: (command: string) => Promise<void>;
    /** Check if dialog is open (to prevent input) */
    isDialogOpen: () => boolean;
}
export declare class InputManager {
    private commandInput;
    private onCommand;
    private isDialogOpen;
    private commandHistory;
    private historyIndex;
    constructor(config: InputManagerConfig);
    /**
     * Set up input event handlers
     */
    setupHandlers(): void;
    /**
     * Handle command submission
     */
    private handleSubmit;
    /**
     * Navigate command history
     */
    navigateHistory(direction: number): void;
    /**
     * Clear the input field
     */
    clearInput(): void;
    /**
     * Focus the input field
     */
    focus(): void;
    /**
     * Disable the input field
     */
    disable(): void;
    /**
     * Enable the input field
     */
    enable(): void;
    /**
     * Set the command prompt text displayed before the input field
     */
    setPrompt(text: string): void;
    /**
     * Get the command history
     */
    getHistory(): string[];
}
```

### display/TextDisplay

```typescript
/**
 * TextDisplay - handles text output to the main window
 */
import type { DisplayElements } from '../types';
export declare class TextDisplay {
    private textContent;
    private mainWindow;
    constructor(elements: DisplayElements);
    /**
     * Display text in the main window.
     *
     * `\n\n+` separates paragraphs (each gets a normal `<p>`); single
     * `\n` within a paragraph creates continuation lines, each rendered
     * as a `<p class="main-entry main-entry--tight">` so the inter-line
     * margin collapses to match the legacy `pre-line` visual. This is
     * the platform-browser counterpart of `engine`'s `createBlocks`.
     */
    displayText(text: string): void;
    /**
     * Display command echo (user input)
     */
    displayCommand(command: string): void;
    /**
     * Clear the screen
     */
    clearScreen(): void;
    /**
     * Scroll main window to bottom
     */
    scrollToBottom(): void;
    /**
     * Get the current transcript HTML (for save)
     */
    getHTML(): string;
    /**
     * Set the transcript HTML (for restore)
     */
    setHTML(html: string): void;
}
```

### display/StatusLine

```typescript
/**
 * StatusLine - handles the status bar display (location, score, turns)
 */
import type { StatusElements } from '../types';
export declare class StatusLine {
    private statusLocation;
    private statusScore;
    constructor(elements: StatusElements);
    /**
     * Update the status line with location, score, and turns
     */
    update(location: string, score: number, turns: number): void;
    /**
     * Set the location display
     */
    setLocation(location: string): void;
    /**
     * Set the score and turns display
     */
    setScoreTurns(score: number, turns: number): void;
}
```

### audio/AudioManager

```typescript
/**
 * AudioManager — handles all audio playback for the browser client.
 *
 * Public interface: unlock(), handleAudioEvent(), dispose().
 * Manages ambient loops and music tracks via the Web Audio API
 * (per-stream MediaElementAudioSourceNode -> GainNode graph) with
 * sample-accurate fade-in / fade-out / cross-fade. SFX uses a bare
 * HTMLAudioElement and is exempt from fades by design (ADR-169).
 *
 * If the browser cannot create an AudioContext, the manager falls
 * back to instant-gain mode: audio still plays via HTMLAudioElement,
 * fade ramps are skipped.
 *
 * Owner context: @sharpee/platform-browser
 */
export declare class AudioManager {
    private ambientChannels;
    private musicTrack;
    private outgoingStreams;
    private audioContext;
    private instantGainMode;
    private unlocked;
    private pendingEvents;
    /**
     * Unlock audio playback. Must be called from a user gesture handler
     * (keydown, click) so the browser allows AudioContext.resume() and
     * Audio.play(). Constructs the AudioContext lazily on first call.
     */
    unlock(): Promise<void>;
    /**
     * Handle an audio event from the engine's event pipeline.
     * Queues events until audio is unlocked by a user gesture.
     *
     * @param event - Object with `type` and `data` fields.
     */
    handleAudioEvent(event: {
        type: string;
        data: any;
    }): void;
    /**
     * Tear down all audio resources. Cuts audio without ramping —
     * dispose is the explicit teardown path. Safe to call before
     * unlock(): the AudioContext close is null-guarded.
     */
    dispose(): void;
    private playAmbient;
    private stopAmbient;
    private stopAllAmbient;
    private playMusic;
    private stopMusic;
    private playSfx;
    /**
     * Construct a new stream: HTMLAudioElement + (optionally) Web Audio
     * graph + fade-in ramp. Returns null only on truly unrecoverable
     * failure (no src). In all other cases returns an ActiveStream,
     * possibly in instant-gain mode (graph nodes null).
     */
    private startStream;
    /**
     * Begin a fade-out on `stream` and schedule its teardown after the
     * fade completes. The stream is moved into `outgoingStreams` until
     * teardown fires.
     */
    private startFadeOut;
    /**
     * Schedule a fade-in ramp from 0 to target on the gain node.
     * Anchors at 0 with setValueAtTime so the ramp has a defined start.
     */
    private scheduleFadeIn;
    /**
     * Tear down a stream's graph + element synchronously, no ramping.
     * Used by dispose() and at the tail of fade-out timers.
     */
    private teardownStreamInstant;
    /**
     * Validate a fade-duration value from event payload.
     * Returns the value in ms, or undefined if invalid (callers fall
     * back to defaults). Per ADR-169: negative, NaN, non-finite, and
     * Infinity are all invalid; 0 is honored (instant cut).
     */
    private validateFadeMs;
}
```

### channels

```typescript
/**
 * @sharpee/platform-browser/channels — public surface.
 *
 * Owner context: browser default. Exposes per-channel renderer
 * builders, the default layout helper, and the
 * `registerDefaultBrowserRenderers` convenience that wires all
 * platform-default `ChannelRenderer`s onto a `Renderer` instance in
 * one call.
 *
 * Stories that override individual renderers re-register against the
 * same channel id after this helper runs (last-write-wins per ADR-165
 * §3). Stories that replace the entire layout skip
 * `mountDefaultLayout` and `registerDefaultBrowserRenderers` and
 * instead call `Renderer.registerSlot(name, handle)` + their own
 * channel-renderer registrations.
 *
 * @see ADR-165 — Renderer Architecture — §7, §8
 */
import type { IRenderer } from '@sharpee/channel-service';
import { createMainChannelRenderer } from './main';
import { createPromptChannelRenderer } from './prompt';
import { createLocationChannelRenderer, createScoreChannelRenderer, createTurnChannelRenderer } from './status';
import { createInfoChannelRenderer, createIfidChannelRenderer } from './info';
import { createDeathChannelRenderer, createEndgameChannelRenderer, createScoreNotifyChannelRenderer } from './notify';
import { createImageChannelRenderer, createImagePreloadChannelRenderer } from './image';
import { createSoundChannelRenderer, createMusicChannelRenderer, type AudioManagerLike } from './audio';
import { createAnimationChannelRenderer, createAnimateChannelRenderer, createTransitionChannelRenderer, createLayoutChannelRenderer, createClearChannelRenderer } from './animation';
import { createLifecycleChannelRenderer, type LifecycleChannelRendererOptions } from './lifecycle';
import { mountDefaultLayout, type BrowserDefaultLayout } from './layout';
export { createMainChannelRenderer, createPromptChannelRenderer, createLocationChannelRenderer, createScoreChannelRenderer, createTurnChannelRenderer, createInfoChannelRenderer, createIfidChannelRenderer, createDeathChannelRenderer, createEndgameChannelRenderer, createScoreNotifyChannelRenderer, createImageChannelRenderer, createImagePreloadChannelRenderer, createSoundChannelRenderer, createMusicChannelRenderer, createAnimationChannelRenderer, createAnimateChannelRenderer, createTransitionChannelRenderer, createLayoutChannelRenderer, createClearChannelRenderer, createLifecycleChannelRenderer, mountDefaultLayout, };
export type { BrowserDefaultLayout, AudioManagerLike, LifecycleChannelRendererOptions };
export { createAmbientChannelRenderer } from './audio';
export { createGenericPanelRenderer } from './panel';
export { renderTextContent, flattenTextContent } from './text-content';
/**
 * Options for {@link registerDefaultBrowserRenderers}.
 */
export interface RegisterDefaultBrowserRenderersOptions {
    /**
     * `AudioManager`-shaped instance the audio renderers delegate to.
     * Pass the same instance the rest of the browser client uses so
     * legacy `audio.*` events and channel-driven sound/music share
     * one playback context.
     */
    audio: AudioManagerLike;
    /**
     * Optional callback invoked after every entry the main channel
     * renderer appends. The browser client uses it to scroll the prose
     * window to the bottom.
     */
    onMainAfterAppend?(slot: HTMLElement): void;
    /**
     * Optional hotspot-click handler for image channels. When a
     * hotspot is clicked the renderer calls this with the hotspot's
     * `command` field — the browser client routes it through
     * `Renderer.emitCommand` so the engine sees a typed command.
     */
    onHotspotCommand?(command: string): void;
    /**
     * Wiring for the `lifecycle` channel renderer. Pass the browser
     * client's `appendSystemMessage` and a refresh callback (typically
     * `renderCombinedStatus`) so save/restore signals project to the
     * same DOM regions the legacy raw-event path used. Omit to skip
     * registering a lifecycle renderer (CLI / test scenarios).
     */
    lifecycle?: LifecycleChannelRendererOptions;
}
/**
 * Register every platform-default browser channel renderer against
 * the supplied `Renderer`. Slots from `layout` are also registered
 * via `Renderer.registerSlot(name, handle)` so stories can resolve
 * platform-default slot names by `getSlot`.
 *
 * Standard channels: `main`, `prompt`, `location`, `score`, `turn`,
 * `info`, `ifid`, `death`, `endgame`, `score_notify`.
 *
 * Media channels: `image:background`, `image:main`, `image:overlay`,
 * `image:preload`, `sound`, `music`, `animation`, `animate`,
 * `transition`, `layout`, `clear`.
 *
 * Stories override any of these by calling
 * `renderer.registerRenderer(channelId, ...)` AFTER this helper
 * (last-write-wins per ADR-165 §3).
 */
export declare function registerDefaultBrowserRenderers(renderer: IRenderer, layout: BrowserDefaultLayout, opts: RegisterDefaultBrowserRenderersOptions): void;
```

## @sharpee/channel-service

### channel-service

```typescript
/**
 * @sharpee/channel-service — `ChannelService` class.
 *
 * Owner context: platform package — runs in-process wherever the engine
 * runs (Node CLI, multi-user server, browser zifmia, platform-browser).
 *
 * Public interface (per ADR-163 §6, §13, §14):
 *
 * - `ChannelService` — concrete runtime. Constructor takes an
 *   `IChannelRegistry` plus the client's `ClientCapabilities`.
 *   - `buildManifest()` — returns a `CmgtPacket` listing the
 *     capability-filtered channel definitions.
 *   - `build({ world, events, blocks, turn })` — walks the registry,
 *     calls each `IOChannel.produce` closure, applies mode + emit-policy
 *     semantics, and returns a `TurnPacket`.
 *
 * Lifecycle (ADR-163 §13): instances are cheap. A new session (engine
 * restart, story switch, RESTART command) creates a fresh
 * `ChannelService`. There is no global session state — `prevValues`
 * lives on the instance.
 *
 * Bootstrap-order invariants (engine-enforced, not service-enforced):
 * the engine emits `channel:manifest` before any `channel:packet`
 * because it calls `buildManifest()` once during `start()` before
 * entering the turn loop. This service does not throw on
 * out-of-order calls; engineers reading the engine code can trace the
 * order from the engine's startup sequence.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §11, §13, §14
 * @see ADR-165 — Renderer Architecture (consumer side)
 */
import type { IChannelRegistry, ClientCapabilities, CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Wire-protocol version emitted in every CMGT manifest. Bumped on
 * breaking shape changes to packet kinds or `ChannelDefinition` fields.
 * Additive channels do not bump version.
 */
export declare const PROTOCOL_VERSION = 1;
/**
 * Input to {@link ChannelService.build}.
 *
 * `world` is typed `unknown` here for consistency with
 * `ChannelProduceContext` (if-domain cannot import `IWorldModel`).
 * Engine call sites pass an `IWorldModel`; closures cast at the
 * boundary.
 */
export interface BuildInput {
    readonly world: unknown;
    readonly events: readonly ISemanticEvent[];
    readonly blocks: readonly ITextBlock[];
    /** Monotonic turn count supplied by the engine. Used for `turn_id`. */
    readonly turn: number;
}
/**
 * The channel-service runtime.
 *
 * One instance per session. Composes a channel registry (typically
 * `@sharpee/stdlib`'s `channelRegistry`) with the negotiated client
 * capabilities. Holds per-channel previous-value state for sparse-emit
 * change detection and `always`-mode replace re-emission.
 */
export declare class ChannelService {
    private readonly registry;
    private readonly capabilities;
    /**
     * Per-channel previous emitted value. Replace-mode channels store the
     * latest emitted value (used both for sparse change detection and for
     * `always`-mode idle-turn re-emission). Append-mode channels store the
     * total accumulated entry count (for diagnostics; the renderer owns
     * accumulation per ADR-165 §5). Event-mode channels do not consult
     * prevValue.
     */
    private readonly prevValues;
    constructor(registry: IChannelRegistry, capabilities: ClientCapabilities);
    /**
     * Build the per-client CMGT manifest (ADR-163 §11).
     *
     * Walks every registered channel. Capability-gated channels
     * (`IOChannel.gatedBy`) are filtered out when the named capability is
     * not declared `true` for this client. Returns a fresh manifest each
     * call; safe to invoke multiple times (the engine calls it once
     * during `start()`).
     */
    buildManifest(): CmgtPacket;
    /**
     * Build the turn packet for the turn just executed (ADR-163 §1, §5).
     *
     * For each registered, non-gated channel:
     *  1. Builds a {@link ChannelProduceContext} with the channel's
     *     `prevValue` from this instance's cache.
     *  2. Calls `channel.produce(ctx)`.
     *  3. Applies mode + emit-policy semantics to the return value to
     *     decide whether the channel appears in this turn's payload and
     *     what value it carries.
     *  4. Updates the per-channel `prevValue` cache.
     *
     * Returns a `TurnPacket` whose `payload` contains only the channels
     * that emitted this turn. Sparse channels stay quiet on no-change;
     * always channels appear every turn.
     */
    build(input: BuildInput): TurnPacket;
    /**
     * True if the channel's `gatedBy` flag is set and the client did not
     * declare that capability as `true`. Gated-out channels appear neither
     * in the manifest nor in turn packets.
     */
    private isGatedOut;
    /**
     * Apply mode + emit-policy semantics to a closure's return value.
     *
     * Mutates `payload` (sets `payload[channel.id]` if the channel
     * emits) and `this.prevValues` (records the new value for sparse
     * compare and idle re-emission).
     *
     * Mode semantics (ADR-163 §4, §6):
     *
     *  - `replace`:
     *     * `undefined` — `always` re-emits prevValue (idle turn);
     *       `sparse` skips.
     *     * `null` — emit `null` (hide / stop signal); cache `null`.
     *     * value — `always` emits unconditionally; `sparse` emits only
     *       on change. Cache the new value.
     *
     *  - `append`:
     *     * `undefined` — skip (no new entries this turn).
     *     * `null` — treated as "no new entries"; skip.
     *     * scalar — wrapped into a single-element array (closure
     *       convenience: `produce: () => 'line'` works without `[]`).
     *     * array (possibly empty) — `always` emits the array as-is;
     *       `sparse` emits only when non-empty. The renderer owns
     *       accumulation per ADR-165 §5.
     *
     *  - `event`:
     *     * `undefined` / `null` — skip (event channels emit only on
     *       fire). Emit policy is informative only — `event` mode is
     *       inherently sparse.
     *     * value — emit the value (transient signal).
     *
     * The closure return type `T | T[] | undefined | null` allows append
     * mode to return entries directly while replace and event return a
     * scalar. Append's scalar-as-shortcut is documented above.
     */
    private applyEmission;
}
```

### wire/decoder

```typescript
/**
 * @sharpee/channel-service/wire — client-side decoder
 *
 * Owner context: wire-protocol module. A small state machine the
 * consumer feeds incoming packets through. Enforces the ordering
 * invariants from ADR-163 §11 / AC-11:
 *
 *   1. The first server-bound packet a consumer accepts is `cmgt`.
 *   2. `turn` packets are accepted only after `cmgt`.
 *   3. `hello` and `command` are not server-bound — receiving one is a
 *      protocol error.
 *
 * The decoder does NOT render — it only validates ordering and exposes
 * the negotiated manifest. Renderer dispatch is the consumer's
 * concern (per ADR-165).
 *
 * @see ADR-163 §11 — bootstrap order invariants
 */
import type { CmgtPacket, TurnPacket, WirePacket } from '@sharpee/if-domain';
/**
 * State exposed by the decoder after each `ingest` call.
 *
 * - `'awaiting-cmgt'` — initial state. Consumer has dispatched a hello
 *   and is awaiting the server's CMGT manifest.
 * - `'live'` — CMGT received; turn packets are now accepted.
 * - `'error'` — protocol violation. The decoder does not recover; the
 *   consumer must drop the connection (or, in single-bundle, surface
 *   the error and reset the producer).
 */
export type DecoderState = {
    readonly status: 'awaiting-cmgt';
} | {
    readonly status: 'live';
    readonly cmgt: CmgtPacket;
} | {
    readonly status: 'error';
    readonly reason: string;
};
/**
 * Decoder handle. The consumer reads `state` after each `ingest`.
 * `lastTurn` is set when a turn is accepted and cleared when the
 * decoder transitions to `error`.
 */
export interface Decoder {
    readonly state: DecoderState;
    /**
     * Most recently accepted `turn` packet, or `null` if none has been
     * accepted in the current session. Reset on every `ingest`.
     */
    readonly lastTurn: TurnPacket | null;
    /**
     * Feed a packet to the decoder. After this returns, `state` reflects
     * the new state. Returns the same handle for chaining.
     */
    ingest(packet: WirePacket): Decoder;
}
/**
 * Create a fresh client-side decoder in the `awaiting-cmgt` state.
 */
export declare function createDecoder(): Decoder;
```

### utils/flatten

```typescript
/**
 * @sharpee/channel-service/utils — text-content flattening helper.
 *
 * Owner context: platform package. Small utility used by consumers
 * (renderers, debug logs, custom extractors) that need to project an
 * `ITextBlock`'s decorated content tree into a plain string.
 *
 * Public interface:
 *  - `flattenContent(content)` — recursive concat of string nodes,
 *    stripping decoration wrappers (preserving their inner content).
 *
 * Originally lived inside `platform-rules.ts`; extracted here as part
 * of the ADR-163 R1 rewrite (rule machinery removed; this helper kept
 * because consumers may still want a one-liner string projection).
 *
 * @see ADR-163 — Channel-Service Platform — §6, §14
 */
import type { TextContent } from '@sharpee/text-blocks';
/**
 * Flatten a `TextContent` array to a plain string.
 *
 * Recursively concatenates string nodes and strips decoration wrappers
 * (preserving their inner content). Side-effect-free; safe to call
 * inside producer closures.
 */
export declare function flattenContent(content: ReadonlyArray<TextContent>): string;
```

### render-to-string

```typescript
/**
 * `renderToString` and `renderStatusLine` — flatten an `ITextBlock[]`
 * to a single display string.
 *
 * Owner context: `@sharpee/channel-service`. Block-flattening helpers
 * consumed by transcript tooling, chat overlays, and dev scripts.
 * Channel-service is downstream of engine and upstream of clients —
 * the right dependency position for a helper that walks ITextBlock[]
 * for display.
 *
 * Public interface:
 *  - `renderToString(blocks, options?)` — flatten blocks to a joined
 *    string with smart separators between same-key vs different-key
 *    block transitions. Decorations translate to ANSI codes when
 *    `options.ansi === true`, or to bracket-stripped plain text
 *    otherwise.
 *  - `renderStatusLine(blocks, options?)` — render `status.*` blocks
 *    to a single pipe-separated line for status-bar display.
 *  - `CLIRenderOptions` — option shape (ansi, blockSeparator,
 *    colors, includeStatus). Name preserved from the prior
 *    `@sharpee/text-service` home; not CLI-specific in practice
 *    (zifmia uses `renderToString` for browser chat bubbles).
 *
 * Ported from `@sharpee/text-service/src/cli-renderer.ts` per ADR-174
 * Phase 2 (OQ-1 resolution, 2026-05-10). The original file remains
 * compilable in text-service through Phase 2 for zifmia's sake; Phase
 * 3 deletes the package.
 *
 * @see ADR-174 — Decoration Architecture and Engine-Internal Prose Pipeline
 * @see ADR-163 — Channel-Service Platform
 */
import type { ITextBlock } from '@sharpee/text-blocks';
/**
 * CLI render options
 */
export interface CLIRenderOptions {
    /** Enable ANSI color codes (default: false) */
    ansi?: boolean;
    /** Separator between blocks (default: '\n\n') */
    blockSeparator?: string;
    /** Story-defined color mappings */
    colors?: Record<string, string>;
    /** Include status blocks in output (default: false) */
    includeStatus?: boolean;
}
/**
 * Render `ITextBlock[]` to string for display.
 *
 * Uses smart joining: single newline between consecutive blocks of the
 * same key, double newline (or `options.blockSeparator`) between blocks
 * of different keys. This keeps related output together (e.g., multiple
 * "Taken." messages) while separating distinct sections.
 *
 * @example
 * const output = renderToString(blocks, { ansi: true });
 * console.log(output);
 */
export declare function renderToString(blocks: ITextBlock[], options?: CLIRenderOptions): string;
/**
 * Render status blocks to a single line (for status bar display).
 *
 * @example
 * const status = renderStatusLine(blocks);
 * // "West of House | Score: 0 | Turns: 1"
 */
export declare function renderStatusLine(blocks: ITextBlock[], options?: CLIRenderOptions): string;
```

### renderer/types

```typescript
/**
 * @sharpee/channel-service/renderer — consumer-side type contracts.
 *
 * Owner context: consumer side of channel-I/O. Defines the
 * `ChannelRenderer` plug-in shape, the `Renderer` host that drives
 * packets into renderers, and the small `SlotHandle` abstraction the
 * default layouts use to address output regions.
 *
 * Public interface (per ADR-165 §1, §2, §5, §7):
 *  - `ChannelRenderer` — per-channel rendering contract; only
 *    `onValue` is required.
 *  - `Renderer` — top-level host the consumer drives.
 *  - `ChannelStateStore` — in-memory state per channel id (replace
 *    keeps latest, append accumulates, event has no entry).
 *  - `SlotHandle` — opaque handle the default layouts use; concrete
 *    consumers narrow to `HTMLElement` (DOM), terminal region (CLI),
 *    or whatever their output medium uses.
 *
 * No implementation lives here. Pure types so renderer-host packages
 * (browser, CLI, multi-user) and channel-renderer authors share a
 * single contract.
 *
 * @see ADR-165 — Renderer Architecture
 */
import type { ChannelDefinition, CmgtPacket, CommandPacket, TurnPacket } from '@sharpee/if-domain';
/**
 * Per-channel rendering logic (ADR-165 §1).
 *
 * A `ChannelRenderer` is registered against a channel id via
 * `Renderer.registerRenderer(channelId, renderer)`. The dispatcher
 * invokes `onValue` once per emission of that channel in a turn
 * packet; optional hooks fire on lifecycle transitions.
 *
 * The interface is deliberately small. Cross-channel logic (a
 * status-bar renderer reading both `location` and `score`) lives in
 * the host module, not inside individual `ChannelRenderer` instances.
 */
export interface ChannelRenderer {
    /**
     * Required. Called once per emission of this channel in a turn
     * packet. The shape of `value` mirrors the channel's mode:
     *
     *  - **replace-mode** — the latest scalar value (or `null` for
     *    hide / stop signals per ADR-163 §6).
     *  - **append-mode** — an array of new entries this turn (per
     *    ADR-163 §5; the renderer accumulates across turns).
     *  - **event-mode** — the event payload.
     *
     * `channel` is the manifest entry — useful for renderers that
     * decide formatting based on `contentType`.
     */
    onValue(value: unknown, channel: ChannelDefinition): void;
    /**
     * Optional. Append-mode only. Invoked by the dispatcher when a
     * `clear` event with a matching `target` arrives. The renderer
     * is responsible for clearing its rendered output (DOM container,
     * terminal region). The state store is reset by the dispatcher
     * before this hook fires.
     */
    onClear?(target: string): void;
    /**
     * Optional. Invoked when CMGT is applied. Use for one-time setup
     * (DOM scaffolding, asset preload, audio context init). NOT for
     * state restoration — that comes via `applyTurnPacket` replays.
     *
     * On the first `applyCmgt` of a `Renderer`'s lifetime this is the
     * only setup hook called. On subsequent invocations, `onDestroy`
     * is called first, then `onCmgt` is called again to set up a
     * fresh session.
     */
    onCmgt?(channel: ChannelDefinition, manifest: CmgtPacket): void;
    /**
     * Optional. Invoked when a fresh `applyCmgt` is about to reset
     * this `Renderer`. Releases resources allocated in `onCmgt` (Web
     * Audio context, IntersectionObserver, etc.). Symmetric with
     * `onCmgt`. Not called when the host platform itself is shutting
     * down (process exit, page unload) — the platform handles that.
     */
    onDestroy?(): void;
}
/**
 * Channel state store shape (ADR-165 §5).
 *
 * Replace channels store the latest scalar (or `null`); append
 * channels store an accumulated `unknown[]`; event channels and
 * never-emitted channels have no entry.
 *
 * The dispatcher owns mutation. Renderers read; they do not write.
 */
export interface ChannelStateStore {
    [channelId: string]: unknown | unknown[] | undefined;
}
/**
 * Opaque handle to a layout slot (ADR-165 §7).
 *
 * Concrete renderer hosts narrow to their output medium:
 *  - browser: `HTMLElement`
 *  - CLI: a small `{ write, clear }` adapter
 *  - canvas: a draw-group reference
 *
 * The `Renderer` itself is medium-agnostic — it stores and returns
 * whatever the host registers.
 */
export type SlotHandle = unknown;
/**
 * Top-level renderer handle the consumer drives (ADR-165 §2).
 *
 * One instance per session. The consumer:
 *  1. Constructs a `Renderer`.
 *  2. Calls `registerRenderer(channelId, renderer)` for each
 *     channel it wants to display (platform defaults register
 *     during platform boot; stories register during story init).
 *  3. Calls `applyCmgt(cmgt)` once when the engine emits the
 *     manifest.
 *  4. Calls `applyTurnPacket(packet)` per turn the engine emits.
 *  5. Subscribes to `onCommand(handler)` to feed commands back.
 */
export interface Renderer {
    /**
     * Apply a CMGT packet (ADR-165 §4).
     *
     * On second-and-subsequent invocations:
     *   1. Runs `onDestroy` for every renderer in the prior manifest.
     *   2. Resets every channel state store.
     *   3. Updates the current manifest.
     *   4. Runs `onCmgt` for every renderer in the new manifest, in
     *      manifest order.
     *
     * On the first invocation, step 1 is skipped.
     */
    applyCmgt(packet: CmgtPacket): void;
    /**
     * Dispatch a turn packet (ADR-165 §4). Iterates the current
     * manifest in registration order; for each manifest entry that
     * has a payload value, updates the state store and invokes the
     * registered renderer's `onValue`. `clear` events trigger the
     * append-channel truncation path.
     *
     * Synchronous: every dispatched callback completes before the
     * call returns.
     */
    applyTurnPacket(packet: TurnPacket): void;
    /**
     * Register a `ChannelRenderer` against a channel id. Last-write-
     * wins per ADR-165 §3 — re-registering with the same id replaces
     * the prior renderer. Platform-default renderers register first;
     * story overrides replace them.
     */
    registerRenderer(channelId: string, renderer: ChannelRenderer): void;
    /**
     * Register a renderer FACTORY for a channel-id prefix (ADR-241 D4).
     * When a manifest channel has no exact-id renderer, the longest
     * matching registered prefix builds one lazily (cached per id, per
     * manifest). The empty prefix `''` matches every channel — the
     * consumer's generic default. Exact-id registrations always win;
     * the JSON-tree fallback remains the last resort when no factory
     * matches.
     */
    registerRendererFactory(prefix: string, factory: (channelId: string) => ChannelRenderer): void;
    /**
     * Subscribe to `CommandPacket`s emitted by channel renderers.
     * The consumer's host loop pumps these back to the engine.
     * Multiple subscribers all receive each emission.
     */
    onCommand(handler: (cmd: CommandPacket) => void): void;
    /**
     * Emit a `CommandPacket`. Channel renderers call this when a UI
     * gesture (hotspot click, drag-drop, custom widget) should
     * advance the engine (ADR-163 §10).
     */
    emitCommand(text: string): void;
    /**
     * Register a slot (ADR-165 §7). Stories that replace the
     * platform-default layout call this for each region of their
     * custom layout.
     */
    registerSlot(name: string, handle: SlotHandle): void;
    /**
     * Resolve a slot handle, or `null` if the slot is not registered.
     */
    getSlot(name: string): SlotHandle | null;
    /**
     * Snapshot of the channel state store for testing and AC-7
     * (re-emission identity round-trip). Returns a deep-cloned copy;
     * the caller may mutate freely.
     */
    getStateSnapshot(): ChannelStateStore;
}
```

### renderer/renderer

```typescript
/**
 * @sharpee/channel-service/renderer — `Renderer` host implementation.
 *
 * Owner context: consumer-side dispatcher. Drives `CmgtPacket` and
 * `TurnPacket` instances into registered `ChannelRenderer` plug-ins,
 * holds the channel state store, and pumps commands back to the
 * engine.
 *
 * Public interface (per ADR-165 §2, §3, §4, §5, §7):
 *  - `Renderer` class implementing the same-named interface.
 *  - `createRenderer(opts)` factory for ergonomic instantiation.
 *
 * @see ADR-165 — Renderer Architecture
 */
import type { CmgtPacket, CommandPacket, TurnPacket } from '@sharpee/if-domain';
import type { ChannelRenderer, ChannelStateStore, Renderer as RendererInterface, SlotHandle } from './types';
import { type FallbackOutputSink, type FallbackWarningSink } from './json-tree-fallback';
/**
 * Optional construction options for the `Renderer`.
 */
export interface RendererOptions {
    /**
     * Sink for warnings (unrendered channels, payload keys not in the
     * manifest). Defaults to `console.warn`.
     */
    warn?: (message: string) => void;
    /**
     * Sink for unhandled-channel JSON-tree output. Defaults to
     * `console.log` — concrete consumers redirect to their debug surface.
     */
    fallbackOutput?: FallbackOutputSink;
    /**
     * Override the warning sink the fallback uses. Defaults to
     * `opts.warn ?? console.warn`. Exposed as a separate option so
     * tests can record fallback warnings independently of dispatch
     * warnings.
     */
    fallbackWarn?: FallbackWarningSink;
}
/**
 * Concrete `Renderer` host (ADR-165 §2).
 *
 * One instance per session. Holds:
 *  - the registered `ChannelRenderer`s (last-write-wins per channel id),
 *  - the channel state store (replace-latest, append-accumulating,
 *    event-no-entry — ADR-165 §5),
 *  - the slot handles (`getSlot` / `registerSlot` per §7),
 *  - the current `CmgtPacket` (so `onValue` can pass the matching
 *    `ChannelDefinition` to the renderer),
 *  - the command-handler subscriber list.
 *
 * No DOM, no transport, no engine. Concrete consumers compose this
 * with their host platform.
 */
export declare class Renderer implements RendererInterface {
    private renderers;
    private rendererFactories;
    private factoryRenderers;
    private fallbackRenderers;
    private state;
    private slots;
    private commandHandlers;
    private currentManifest?;
    private readonly warn;
    private readonly buildFallback;
    constructor(opts?: RendererOptions);
    /**
     * Register a `ChannelRenderer` (ADR-165 §3). Last-write-wins —
     * re-registering replaces the prior renderer for that id.
     */
    registerRenderer(channelId: string, renderer: ChannelRenderer): void;
    /**
     * Register a renderer factory for a channel-id prefix (ADR-241 D4).
     * Longest matching prefix wins; `''` is the match-all default.
     * Instances are built lazily per channel id and cached until the
     * next manifest (their `onDestroy` runs with everyone else's).
     */
    registerRendererFactory(prefix: string, factory: (channelId: string) => ChannelRenderer): void;
    /**
     * Register a slot (ADR-165 §7). Stories that replace the
     * platform-default layout call this for each region.
     */
    registerSlot(name: string, handle: SlotHandle): void;
    /**
     * Resolve a slot handle, or `null` if not registered.
     */
    getSlot(name: string): SlotHandle | null;
    /**
     * Subscribe to commands emitted by channel renderers.
     */
    onCommand(handler: (cmd: CommandPacket) => void): void;
    /**
     * Emit a command from a `ChannelRenderer` (UI-gesture origin).
     * All registered handlers receive the packet synchronously.
     */
    emitCommand(text: string): void;
    /**
     * Apply a CMGT packet (ADR-165 §4 lifecycle).
     *
     *  1. If a prior manifest exists, run `onDestroy` for each of its
     *     renderers (in registration order for determinism).
     *  2. Reset the state store.
     *  3. Update the current manifest.
     *  4. Run `onCmgt` for each new-manifest renderer in registration
     *     order.
     */
    applyCmgt(packet: CmgtPacket): void;
    /**
     * Dispatch a turn packet (ADR-165 §4 dispatch contract).
     *
     * Iterates the current manifest in registration order. For each
     * manifest entry that has a payload value, updates the state
     * store per mode and invokes `onValue`. Handles the `clear`
     * channel specially — empties append-mode state stores and fires
     * `onClear` hooks.
     */
    applyTurnPacket(packet: TurnPacket): void;
    /**
     * Snapshot of the channel state store (deep-cloned) — for tests
     * and ADR-163 AC-12 round-trip.
     */
    getStateSnapshot(): ChannelStateStore;
    /**
     * Update the state store per mode and invoke the renderer's
     * `onValue`.
     */
    private applyChannelValue;
    /**
     * Handle a `clear` channel emission (ADR-165 §4 step 2).
     *
     * `value.target` (when set) names a specific append-mode channel
     * to clear; an empty / missing target clears every append-mode
     * channel currently registered in the manifest.
     */
    private handleClear;
    /**
     * Resolve the renderer for a channel id: exact registration first
     * (last-write-wins, so story overrides beat every default), then
     * the longest matching registered factory prefix (ADR-241 D4 —
     * instances lazily built and cached per id), then the JSON-tree
     * fallback (cached so the one-time warning fires once per channel
     * id, not once per emission).
     */
    private resolveRenderer;
}
/**
 * Convenience factory for `new Renderer(opts)`.
 */
export declare function createRenderer(opts?: RendererOptions): Renderer;
```

### renderer/json-tree-fallback

```typescript
/**
 * @sharpee/channel-service/renderer — generic JSON-tree fallback.
 *
 * Owner context: consumer-side dispatcher. Per ADR-165 §3, a channel
 * id that appears in the CMGT manifest but has no registered
 * `ChannelRenderer` falls back to a generic JSON-tree view. This
 * keeps unknown story channels visible-and-debuggable rather than
 * silently dropped.
 *
 * The fallback this module ships logs a one-time warning per channel
 * id and writes a JSON-stringified line to the console. Concrete
 * platform consumers (browser, CLI) override the warning sink and
 * the rendering surface — for now the default is enough to satisfy
 * AC-3.
 *
 * @see ADR-165 — Renderer Architecture — §3, AC-3
 */
import type { ChannelRenderer } from './types';
/**
 * Sink for warnings emitted by the fallback. Defaults to
 * `console.warn`. Tests inject a recording sink; concrete platform
 * consumers can route to a logger.
 */
export type FallbackWarningSink = (message: string) => void;
/**
 * Sink for the rendered JSON-tree output. Defaults to `console.log`.
 * Concrete consumers redirect to a debug pane or stdout.
 */
export type FallbackOutputSink = (channelId: string, json: string) => void;
/**
 * Construct a JSON-tree fallback renderer factory.
 *
 * The returned function builds a `ChannelRenderer` for a specific
 * channel id; the dispatcher caches one per unrendered id so the
 * "one-time warning" behavior is preserved across emissions.
 *
 * @param warn — sink for the one-time warning. Default `console.warn`.
 * @param output — sink for the rendered JSON line. Default
 *   `console.log`.
 */
export declare function createJsonTreeFallbackFactory(opts?: {
    warn?: FallbackWarningSink;
    output?: FallbackOutputSink;
}): (channelId: string) => ChannelRenderer;
```

## @sharpee/media

### audio/types

```typescript
/**
 * Common audio primitive types for the Sharpee media subsystem.
 *
 * Public interface: Type aliases used throughout all audio event interfaces,
 * the AudioRegistry, and capability negotiation.
 *
 * Owner context: @sharpee/media (ADR-138)
 */
/** Volume level: 0.0 (silent) to 1.0 (full) */
export type Volume = number;
/** Duration in milliseconds */
export type DurationMs = number;
/** Stereo pan: -1.0 (hard left) to 1.0 (hard right), 0.0 = center */
export type StereoPan = number;
/** Playback rate: 1.0 = normal, 0.5 = half speed, 2.0 = double speed */
export type PlaybackRate = number;
/** Asset path relative to the story's assets/audio/ directory */
export type AudioAssetPath = string;
/** Named ambient channel identifier (e.g., 'wind', 'machinery', 'dripping') */
export type AmbientChannel = string;
/** Ducking priority: 0 (none) to 3 (aggressive). See AudioSfxEvent.duck. */
export type DuckPriority = 0 | 1 | 2 | 3;
/**
 * Audio mix target — identifies where an effect or volume change applies.
 * - 'master': affects all audio output
 * - 'sfx': affects all sound effects
 * - 'music': affects the music track
 * - 'ambient:{channel}': affects a specific ambient channel
 */
export type AudioTarget = 'master' | 'sfx' | 'music' | `ambient:${string}`;
/** Effect types that map to Web Audio API nodes */
export type AudioEffectType = 'reverb' | 'lowpass' | 'highpass' | 'distortion' | 'delay';
/** Audio file formats */
export type AudioFormat = 'mp3' | 'ogg' | 'wav' | 'aac' | 'opus' | 'webm';
/**
 * Built-in recipe names that clients SHOULD support.
 * Stories may use any string — unknown recipes are silently skipped.
 */
export type BuiltinRecipeName = 'beep' | 'alert' | 'sweep-up' | 'sweep-down' | 'static' | 'hum';
/** Recipe name: built-in or story-defined */
export type ProceduralRecipeName = BuiltinRecipeName | (string & {});
```

### audio/events

```typescript
/**
 * Audio event interfaces for the Sharpee media subsystem.
 *
 * Public interface: All audio event shapes, the AudioEvent discriminated
 * union, and the isAudioEvent() type guard.
 *
 * Owner context: @sharpee/media (ADR-138). These events flow through the
 * engine's event pipeline unchanged — clients that support audio render
 * them; others ignore them.
 */
import type { Volume, DurationMs, StereoPan, PlaybackRate, AudioAssetPath, AmbientChannel, DuckPriority, AudioTarget, AudioEffectType, ProceduralRecipeName } from './types';
/**
 * Base interface for all audio events.
 * Audio events flow through the engine's event pipeline unchanged.
 * Clients that support audio render them; others ignore them.
 */
export interface AudioEventBase {
    readonly type: string;
}
/**
 * Play a sound effect.
 *
 * Use cases: door opening, item pickup, skin activation, weapon fire,
 * system alert, puzzle solve chime.
 */
export interface AudioSfxEvent extends AudioEventBase {
    readonly type: 'audio.sfx';
    /** Audio file path (relative to assets/audio/) */
    readonly src: AudioAssetPath;
    /** Playback volume. Default: 1.0 */
    readonly volume?: Volume;
    /** Playback speed. Default: 1.0 */
    readonly rate?: PlaybackRate;
    /** Stereo position. Default: 0.0 (center) */
    readonly pan?: StereoPan;
    /**
     * Ducking priority. Higher values duck lower-priority audio.
     * When this SFX fires, ambient and music temporarily reduce volume
     * so the SFX cuts through the mix. Default: 0 (no ducking).
     *
     * Suggested values:
     * - 0: ambient/background SFX (no ducking)
     * - 1: normal gameplay SFX (subtle duck)
     * - 2: important feedback (moderate duck)
     * - 3: critical alerts, combat hits (aggressive duck)
     */
    readonly duck?: DuckPriority;
}
/**
 * Start playing a music track, or crossfade to a new one.
 * If music is already playing, the current track fades out while
 * the new one fades in over the fadeIn duration.
 *
 * Use cases: exploration theme, tension/combat music, victory stinger.
 */
export interface AudioMusicPlayEvent extends AudioEventBase {
    readonly type: 'audio.music.play';
    /** Audio file path (relative to assets/audio/) */
    readonly src: AudioAssetPath;
    /** Playback volume. Default: 0.5 */
    readonly volume?: Volume;
    /** Fade-in duration. Default: 1000ms */
    readonly fadeIn?: DurationMs;
    /** Whether to loop the track. Default: true */
    readonly loop?: boolean;
}
/**
 * Stop the current music track.
 */
export interface AudioMusicStopEvent extends AudioEventBase {
    readonly type: 'audio.music.stop';
    /** Fade-out duration. Default: 1000ms */
    readonly fadeOut?: DurationMs;
}
/**
 * Start or replace an ambient channel.
 *
 * Use cases: wind, rain, cave dripping, engine hum, distant explosions,
 * electrical buzz, crowd murmur.
 */
export interface AudioAmbientPlayEvent extends AudioEventBase {
    readonly type: 'audio.ambient.play';
    /** Audio file path (relative to assets/audio/) */
    readonly src: AudioAssetPath;
    /** Named channel. Reusing a channel name replaces the current source. */
    readonly channel: AmbientChannel;
    /** Playback volume. Default: 0.3 */
    readonly volume?: Volume;
    /** Fade-in duration. Default: 2000ms */
    readonly fadeIn?: DurationMs;
    /** Whether to loop. Default: true */
    readonly loop?: boolean;
}
/**
 * Stop a single ambient channel.
 */
export interface AudioAmbientStopEvent extends AudioEventBase {
    readonly type: 'audio.ambient.stop';
    /** Channel to stop */
    readonly channel: AmbientChannel;
    /** Fade-out duration. Default: 2000ms */
    readonly fadeOut?: DurationMs;
}
/**
 * Stop all ambient channels at once (e.g., on scene change).
 */
export interface AudioAmbientStopAllEvent extends AudioEventBase {
    readonly type: 'audio.ambient.stop_all';
    /** Fade-out duration for all channels. Default: 1000ms */
    readonly fadeOut?: DurationMs;
}
/**
 * Play a procedural sound from a named recipe.
 *
 * Recipes are registered by the client, not defined by the story.
 * The story says *what* conceptual sound it wants; the client decides
 * how to synthesize it. Clients without procedural support can map
 * recipe names to fallback audio files, or skip the event.
 *
 * Use cases: system beeps, alerts, electrical hum, static bursts,
 * tonal feedback for puzzle state.
 */
export interface AudioProceduralEvent extends AudioEventBase {
    readonly type: 'audio.procedural';
    /** Named recipe identifier */
    readonly recipe: ProceduralRecipeName;
    /** Recipe-specific parameters (override recipe defaults) */
    readonly params?: Readonly<Record<string, number>>;
    /** Playback volume. Default: 1.0 */
    readonly volume?: Volume;
    /** Duration override. Uses recipe default if omitted. */
    readonly duration?: DurationMs;
    /** Ducking priority. See AudioSfxEvent.duck. Default: 0 */
    readonly duck?: DuckPriority;
}
/**
 * Apply an audio effect to a mix target.
 *
 * Use cases: reverb in caves, muffled sound behind walls,
 * distortion during damage, lowpass for flashback sequences.
 */
export interface AudioEffectEvent extends AudioEventBase {
    readonly type: 'audio.effect';
    /** Which part of the audio mix to affect */
    readonly target: AudioTarget;
    /** Effect to apply */
    readonly effect: AudioEffectType;
    /** Effect-specific parameters */
    readonly params: Readonly<Record<string, number>>;
    /** Transition time to reach new effect state. Default: 0 (instant) */
    readonly transition?: DurationMs;
}
/**
 * Remove all effects from a mix target.
 */
export interface AudioEffectClearEvent extends AudioEventBase {
    readonly type: 'audio.effect.clear';
    /** Which part of the audio mix to clear effects from */
    readonly target: AudioTarget;
    /** Transition time to remove effects. Default: 0 (instant) */
    readonly transition?: DurationMs;
}
/**
 * Union of all audio events. Clients switch on the `type` discriminant.
 */
export type AudioEvent = AudioSfxEvent | AudioMusicPlayEvent | AudioMusicStopEvent | AudioAmbientPlayEvent | AudioAmbientStopEvent | AudioAmbientStopAllEvent | AudioProceduralEvent | AudioEffectEvent | AudioEffectClearEvent;
/**
 * Returns true if the event is any audio event.
 *
 * @param event - Any object with a `type` string field
 * @returns Type predicate narrowing to AudioEvent
 */
export declare function isAudioEvent(event: {
    type: string;
}): event is AudioEvent;
```

### audio/capabilities

```typescript
/**
 * Audio capability negotiation and player preference types.
 *
 * Public interface: AudioCapabilities (declared by clients at session start)
 * and AudioPreferences (player settings persisted by clients).
 *
 * Owner context: @sharpee/media (ADR-138)
 */
import type { Volume, AudioFormat } from './types';
/**
 * Audio capabilities declared by the client at session start.
 * Stories can check these before emitting audio events to avoid
 * sending events the client cannot render.
 */
export interface AudioCapabilities {
    /** Can play sound effects (AudioSfxEvent) */
    readonly sfx: boolean;
    /** Can play background music (AudioMusicPlayEvent/StopEvent) */
    readonly music: boolean;
    /** Can layer ambient channels (AudioAmbientPlayEvent/StopEvent) */
    readonly ambient: boolean;
    /** Can synthesize procedural sounds (AudioProceduralEvent) */
    readonly procedural: boolean;
    /** Can apply audio effects (AudioEffectEvent) */
    readonly effects: boolean;
    /** Maximum simultaneous audio sources. 0 = unlimited. */
    readonly maxChannels?: number;
    /** Supported audio file formats */
    readonly formats: readonly AudioFormat[];
}
/**
 * Player audio preferences, persisted to localStorage by the client.
 * Player settings override story-specified volumes.
 */
export interface AudioPreferences {
    /** Master audio enabled/disabled */
    enabled: boolean;
    /** Master volume (multiplied against all event volumes). Default: 1.0 */
    masterVolume: Volume;
    /** Per-category volume multipliers */
    sfxVolume: Volume;
    musicVolume: Volume;
    ambientVolume: Volume;
    /** Per-category mute toggles (independent of volume) */
    sfxMuted: boolean;
    musicMuted: boolean;
    ambientMuted: boolean;
}
```

### audio/registry-merge

```typescript
/**
 * EventDataRegistry declaration merging for audio events.
 *
 * Public interface: Nine *Data interfaces and the declaration merging
 * block that extends @sharpee/core's EventDataRegistry with audio event
 * keys. Importing this module (or any re-export of it) activates
 * compile-time type checking for createTypedEvent('audio.*', ...).
 *
 * Owner context: @sharpee/media (ADR-138)
 */
import type { AudioAssetPath, Volume, DurationMs, StereoPan, PlaybackRate, AmbientChannel, DuckPriority, AudioTarget, AudioEffectType, ProceduralRecipeName } from './types';
/** Data for audio.sfx events */
export interface AudioSfxData {
    readonly src: AudioAssetPath;
    readonly volume?: Volume;
    readonly rate?: PlaybackRate;
    readonly pan?: StereoPan;
    readonly duck?: DuckPriority;
}
/** Data for audio.music.play events */
export interface AudioMusicPlayData {
    readonly src: AudioAssetPath;
    readonly volume?: Volume;
    readonly fadeIn?: DurationMs;
    readonly loop?: boolean;
}
/** Data for audio.music.stop events */
export interface AudioMusicStopData {
    readonly fadeOut?: DurationMs;
}
/** Data for audio.ambient.play events */
export interface AudioAmbientPlayData {
    readonly src: AudioAssetPath;
    readonly channel: AmbientChannel;
    readonly volume?: Volume;
    readonly fadeIn?: DurationMs;
    readonly loop?: boolean;
}
/** Data for audio.ambient.stop events */
export interface AudioAmbientStopData {
    readonly channel: AmbientChannel;
    readonly fadeOut?: DurationMs;
}
/** Data for audio.ambient.stop_all events */
export interface AudioAmbientStopAllData {
    readonly fadeOut?: DurationMs;
}
/** Data for audio.procedural events */
export interface AudioProceduralData {
    readonly recipe: ProceduralRecipeName;
    readonly params?: Readonly<Record<string, number>>;
    readonly volume?: Volume;
    readonly duration?: DurationMs;
    readonly duck?: DuckPriority;
}
/** Data for audio.effect events */
export interface AudioEffectData {
    readonly target: AudioTarget;
    readonly effect: AudioEffectType;
    readonly params: Readonly<Record<string, number>>;
    readonly transition?: DurationMs;
}
/** Data for audio.effect.clear events */
export interface AudioEffectClearData {
    readonly target: AudioTarget;
    readonly transition?: DurationMs;
}
declare module '@sharpee/core' {
    interface EventDataRegistry {
        'audio.sfx': AudioSfxData;
        'audio.music.play': AudioMusicPlayData;
        'audio.music.stop': AudioMusicStopData;
        'audio.ambient.play': AudioAmbientPlayData;
        'audio.ambient.stop': AudioAmbientStopData;
        'audio.ambient.stop_all': AudioAmbientStopAllData;
        'audio.procedural': AudioProceduralData;
        'audio.effect': AudioEffectData;
        'audio.effect.clear': AudioEffectClearData;
    }
}
```

### audio/audio-registry

```typescript
/**
 * AudioRegistry — central registration system for all audio in a story.
 *
 * Public interface: AudioCue, VariationPool, DuckingConfig, RoomAtmosphere,
 * AtmosphereBuilder, and AudioRegistry class. Stories create one AudioRegistry
 * in initializeWorld() and populate it with cues, pools, and atmospheres.
 * Actions and handlers reference registered names only — never raw audio
 * parameters.
 *
 * Owner context: @sharpee/media (ADR-138)
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { AudioAssetPath, AmbientChannel, Volume, DurationMs, DuckPriority, AudioEffectType, AudioTarget } from './types';
import './registry-merge';
/**
 * An audio cue factory — returns a fresh event each invocation.
 * Factories (not constants) because each call needs a unique event id/timestamp.
 */
export type AudioCue = () => ISemanticEvent;
/**
 * A variation pool — multiple audio files for the same logical sound.
 * The registry picks one at random each time and applies jitter to
 * prevent repetition fatigue.
 */
export interface VariationPool {
    /** Audio files to choose from (at least one required) */
    readonly sources: readonly AudioAssetPath[];
    /** Base volume before jitter. Default: 1.0 */
    readonly volume?: Volume;
    /** Random volume jitter range: +/-jitter. e.g., 0.1 means volume varies +/-10%. Default: 0 */
    readonly volumeJitter?: number;
    /** Random pitch jitter range: +/-jitter applied to playback rate. e.g., 0.05 means +/-5%. Default: 0 */
    readonly pitchJitter?: number;
    /** Ducking priority. Default: 0 */
    readonly duck?: DuckPriority;
}
/**
 * Ducking configuration — how the client reduces background audio
 * when a high-priority sound fires.
 */
export interface DuckingConfig {
    /** Volume multiplier applied to ducked audio (0.0-1.0). Default: 0.3 */
    readonly duckVolume: Volume;
    /** How quickly ducked audio fades down (ms). Default: 100 */
    readonly attackMs: DurationMs;
    /** How quickly ducked audio recovers after the SFX ends (ms). Default: 500 */
    readonly releaseMs: DurationMs;
    /**
     * Which categories get ducked. Default: ['music', 'ambient']
     * SFX never duck other SFX.
     */
    readonly targets: readonly ('music' | 'ambient')[];
}
/**
 * Atmosphere definition for a room or region.
 * Describes the ambient soundscape, optional music track, and optional effect.
 */
export interface RoomAtmosphere {
    readonly ambient: ReadonlyArray<{
        readonly src: AudioAssetPath;
        readonly channel: AmbientChannel;
        readonly volume: Volume;
    }>;
    readonly music?: {
        readonly src: AudioAssetPath;
        readonly volume: Volume;
    };
    readonly effect?: {
        readonly effect: AudioEffectType;
        readonly target: AudioTarget;
        readonly params: Readonly<Record<string, number>>;
    };
}
/** Default fade durations for atmosphere transitions */
export interface FadeDefaults {
    /** Ambient channel fade-in duration (ms). Default: 2000 */
    readonly ambientIn: DurationMs;
    /** Ambient channel fade-out duration (ms). Default: 2000 */
    readonly ambientOut: DurationMs;
    /** Music track fade-in duration (ms). Default: 1000 */
    readonly musicIn: DurationMs;
    /** Audio effect transition duration (ms). Default: 2000 */
    readonly effectTransition: DurationMs;
}
/**
 * Central registry for all audio in a story.
 * Stories populate this during initializeWorld(). Actions and handlers
 * reference registered names — never raw audio parameters.
 *
 * @example
 * ```typescript
 * const audio = new AudioRegistry();
 *
 * // Register a simple cue
 * audio.registerCue('skin.activate', () =>
 *   createTypedEvent('audio.sfx', { src: 'sfx/skin-activate.mp3', volume: 0.8 })
 * );
 *
 * // Register a variation pool (multiple files, random selection + jitter)
 * audio.registerPool('footstep.metal', {
 *   sources: ['sfx/step-metal-1.mp3', 'sfx/step-metal-2.mp3', 'sfx/step-metal-3.mp3'],
 *   volume: 0.6,
 *   volumeJitter: 0.1,
 *   pitchJitter: 0.05,
 * });
 *
 * // Register a room atmosphere using the fluent builder
 * audio.atmosphere('entropy.room.bridge')
 *   .ambient('ambient/ship-hum.mp3', 'environment', 0.3)
 *   .ambient('ambient/console-beeps.mp3', 'machinery', 0.15)
 *   .music('music/bridge-theme.mp3', 0.4)
 *   .effect('lowpass', 'ambient:environment', { frequency: 2000, q: 1 })
 *   .build();
 *
 * // In an action or handler — just use the name
 * const events = audio.cue('skin.activate');
 * ```
 */
export declare class AudioRegistry {
    private cues;
    private pools;
    private atmospheres;
    private fadeDefaultValues;
    private duckingConfig;
    /**
     * Register a named audio cue (single sound, full control).
     *
     * @param name - Unique cue identifier (e.g., 'skin.activate', 'door.open')
     * @param cue - Factory function that returns a fresh ISemanticEvent
     */
    registerCue(name: string, cue: AudioCue): void;
    /**
     * Register a variation pool — multiple files for one logical sound.
     * When fired, the registry picks a random source and applies jitter.
     *
     * @param name - Unique pool identifier (e.g., 'footstep.metal')
     * @param pool - Pool configuration with sources and jitter parameters
     */
    registerPool(name: string, pool: VariationPool): void;
    /**
     * Fire a registered cue or pool by name. Returns empty array if not registered.
     *
     * Resolution order:
     * 1. Check cues (exact factory)
     * 2. Check pools (random selection + jitter -> AudioSfxEvent)
     * 3. Return [] (silent degradation)
     *
     * @param name - Registered cue or pool name
     * @returns Array of events to emit (empty if name is not registered)
     */
    cue(name: string): ISemanticEvent[];
    private resolvePool;
    /**
     * Override the default ducking behavior.
     *
     * @param config - Partial ducking configuration to merge with defaults
     */
    setDucking(config: Partial<DuckingConfig>): void;
    /**
     * Get the current ducking configuration.
     *
     * @returns Read-only ducking config
     */
    getDucking(): Readonly<DuckingConfig>;
    /**
     * Register a room atmosphere by room ID (raw object).
     *
     * @param roomId - Entity ID of the room
     * @param atmosphere - Complete atmosphere definition
     */
    registerAtmosphere(roomId: string, atmosphere: RoomAtmosphere): void;
    /**
     * Start a fluent atmosphere builder for a room.
     *
     * @param roomId - Entity ID of the room
     * @returns AtmosphereBuilder instance — call .build() to register
     */
    atmosphere(roomId: string): AtmosphereBuilder;
    /**
     * Get the registered atmosphere for a room.
     *
     * @param roomId - Entity ID of the room
     * @returns The atmosphere definition, or undefined if none registered
     */
    getAtmosphere(roomId: string): RoomAtmosphere | undefined;
    /**
     * Override default fade durations (ms).
     *
     * @param defaults - Partial fade defaults to merge
     */
    setFadeDefaults(defaults: Partial<FadeDefaults>): void;
    /**
     * Get the current fade defaults.
     *
     * @returns Read-only fade defaults
     */
    getFadeDefaults(): Readonly<FadeDefaults>;
}
/**
 * Fluent builder for room atmospheres.
 * Avoids verbose JSON object literals in registration code.
 *
 * @example
 * ```typescript
 * registry.atmosphere('entropy.room.bridge')
 *   .ambient('ambient/ship-hum.mp3', 'environment', 0.3)
 *   .music('music/bridge-theme.mp3', 0.4)
 *   .build();
 * ```
 */
export declare class AtmosphereBuilder {
    private registry;
    private roomId;
    private _ambient;
    private _music;
    private _effect;
    constructor(registry: AudioRegistry, roomId: string);
    /**
     * Add an ambient channel to the atmosphere.
     *
     * @param src - Audio file path
     * @param channel - Named channel identifier
     * @param volume - Playback volume (0.0-1.0)
     * @returns this (for chaining)
     */
    ambient(src: AudioAssetPath, channel: AmbientChannel, volume: Volume): this;
    /**
     * Set the music track for the atmosphere.
     *
     * @param src - Audio file path
     * @param volume - Playback volume (0.0-1.0)
     * @returns this (for chaining)
     */
    music(src: AudioAssetPath, volume: Volume): this;
    /**
     * Set an audio effect for the atmosphere.
     *
     * @param effect - Effect type (e.g., 'reverb', 'lowpass')
     * @param target - Mix target to apply the effect to
     * @param params - Effect-specific parameters
     * @returns this (for chaining)
     */
    effect(effect: AudioEffectType, target: AudioTarget, params: Record<string, number>): this;
    /**
     * Register the atmosphere with the registry.
     */
    build(): void;
}
```
