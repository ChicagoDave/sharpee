# Zifmia Phase 3: Runner Application Shell

## Objective

Transform the runner entry point from a single-bundle URL launcher into a standalone application with story library, save/restore, and session management.

## Current State (after Phase 2)

- `runner-entry.tsx` reads `?bundle=` param and renders `<ZifmiaRunner>` or a placeholder message
- `ZifmiaRunner` fetches, extracts, imports, and bootstraps a story — but has no save/restore
- `MenuBar` has `onSave`/`onRestore`/`onQuit` callback props but nothing wires them
- `platform-browser/SaveManager` has full delta-save implementation (localStorage + lz-string) but is vanilla JS, tightly coupled to `WorldModel` instance and DOM dialogs
- No story library, no file picker, no recent-stories persistence

## Deliverables

1. **StorageProvider interface** — abstract save/restore for browser (localStorage) and future Tauri (filesystem)
2. **Browser StorageProvider** — wraps existing SaveManager delta-save logic in the new interface
3. **Story Library UI** — open/manage stories, persist recents
4. **Runner app shell** — state machine: library ↔ loading ↔ playing ↔ error
5. **Save/restore wiring** — connect StorageProvider to MenuBar callbacks and engine

## Implementation

### 3.1 StorageProvider Interface

**File**: `packages/zifmia/src/storage/storage-provider.ts`

```typescript
export interface SaveSlotInfo {
  name: string;
  timestamp: number;
  turnCount: number;
  location: string;       // room name at time of save
  storyId: string;
}

export interface StorageProvider {
  /** List all save slots for a story */
  listSlots(storyId: string): Promise<SaveSlotInfo[]>;

  /** Save game state to a named slot */
  save(storyId: string, slotName: string, data: unknown): Promise<void>;

  /** Load game state from a named slot */
  restore(storyId: string, slotName: string): Promise<unknown>;

  /** Delete a save slot */
  deleteSlot(storyId: string, slotName: string): Promise<void>;

  /** Auto-save (special slot) */
  autoSave(storyId: string, data: unknown): Promise<void>;

  /** Load auto-save if it exists */
  loadAutoSave(storyId: string): Promise<unknown | null>;
}
```

All methods are async to support both localStorage (sync, wrapped) and Tauri IPC (async).

**File**: `packages/zifmia/src/storage/index.ts` — barrel export

### 3.2 Browser StorageProvider

**File**: `packages/zifmia/src/storage/browser-storage-provider.ts`

Adapts the delta-save approach from `platform-browser/SaveManager`:

- Uses `localStorage` with story-scoped key prefix: `zifmia-{storyId}-save-{slot}`
- Save index per story: `zifmia-{storyId}-saves-index`
- Compresses save data with `lz-string` (already a dependency of platform-browser)
- Does **not** own world-state capture — that responsibility stays with the caller (runner or engine integration layer)

Key difference from SaveManager: the `StorageProvider` is a pure storage abstraction. It stores/retrieves opaque save data blobs. The **caller** is responsible for capturing world state (entity locations, traits, transcript) and restoring it. This keeps StorageProvider testable and platform-agnostic.

### 3.3 Save/Restore Integration

**File**: `packages/zifmia/src/runner/save-integration.ts`

Bridge between StorageProvider and the running game:

```typescript
export interface SaveRestoreManager {
  captureState(): SaveData;
  restoreState(data: SaveData): void;
  getStoryId(): string;
}
```

- `captureState()` — snapshots world entity locations + trait data (reuses SaveManager's delta logic)
- `restoreState()` — applies snapshot back to world (reuses SaveManager's restore logic)
- Requires `WorldModel` reference (passed when game boots)
- Baseline captured after `initializeWorld()` for delta saves

This is the layer that calls `StorageProvider.save()` with the captured data, and calls `StorageProvider.restore()` then applies it to the world.

### 3.4 Story Library UI

**File**: `packages/zifmia/src/runner/StoryLibrary.tsx`

A React component shown when no story is loaded (the "home screen").

**Features**:
- **Open Story** button → `<input type="file" accept=".sharpee">` for local file
- **URL input** — paste a bundle URL (for hosted stories)
- **Recent Stories** list — persisted in `localStorage` key `zifmia-recent-stories`
  - Each entry: `{ title, author, storyId, lastPlayed, source: 'file' | 'url', url?: string }`
  - "Play" / "Continue" (if auto-save exists) / "Remove" actions
  - Sorted by `lastPlayed` descending
- **Drop zone** — drag-and-drop `.sharpee` file onto the library

**Styling**: Uses existing theme CSS. Minimal, clean layout. No external dependencies.

**Data flow**:
- File picker → `FileReader.readAsArrayBuffer()` → pass to `loadBundle()`
- URL input → pass URL to `<ZifmiaRunner bundleUrl={url}>`
- File drop → same as file picker path

For file-based bundles, the runner needs a slightly different path than URL-based: it already has the `ArrayBuffer`, so `ZifmiaRunner` needs to accept either `bundleUrl: string` or `bundleData: ArrayBuffer`.

### 3.5 Runner App Shell

**File**: Modify `packages/zifmia/src/runner/runner-entry.tsx`

Replace the current `?bundle=` single-path with a state machine:

```
States:
  library  — StoryLibrary shown (no story loaded)
  loading  — ZifmiaRunner loading a bundle
  playing  — game active, save/restore available
  error    — load failed, show error + "Back to Library" button

Transitions:
  library → loading   (user selects story)
  loading → playing   (bundle loaded successfully)
  loading → error     (load failed)
  playing → library   (user quits / closes story)
  error   → library   (user clicks back)
```

The `?bundle=` query param still works — if present, skip library and go straight to loading. This preserves the Phase 2 direct-link behavior.

### 3.6 Wire MenuBar Callbacks

**Modify**: `packages/zifmia/src/runner/index.tsx` (ZifmiaRunner)

Currently renders `<GameShell>` without save/restore props. After Phase 3:

- Create `SaveRestoreManager` after engine boots (with world reference)
- Create `BrowserStorageProvider` instance
- Pass callbacks to `<GameShell>`:
  - `onSave` → show save dialog (slot name input), call `saveRestoreManager.captureState()` → `storageProvider.save()`
  - `onRestore` → show restore dialog (slot list), call `storageProvider.restore()` → `saveRestoreManager.restoreState()`
  - `onQuit` → auto-save, call `onClose()` callback to return to library

This requires `GameShell` to pass these through to `MenuBar`. Check if it already does — if not, thread the props through.

### 3.7 Save/Restore Dialogs

**File**: `packages/zifmia/src/runner/SaveDialog.tsx` and `RestoreDialog.tsx`

React modal components (replacing platform-browser's DOM-based `DialogManager`):

**SaveDialog**:
- Text input for save name (auto-suggested from location + turn)
- Existing saves list (overwrite warning)
- Save / Cancel buttons

**RestoreDialog**:
- List of save slots with metadata (name, date, turn, location)
- Restore / Delete / Cancel buttons

Both use `StorageProvider` for data and render as modal overlays.

## Files Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/storage/storage-provider.ts` | StorageProvider interface |
| Create | `src/storage/browser-storage-provider.ts` | localStorage implementation |
| Create | `src/storage/index.ts` | Barrel export |
| Create | `src/runner/save-integration.ts` | World state capture/restore bridge |
| Create | `src/runner/StoryLibrary.tsx` | Story picker / recent stories UI |
| Create | `src/runner/SaveDialog.tsx` | Save game modal |
| Create | `src/runner/RestoreDialog.tsx` | Restore game modal |
| Modify | `src/runner/runner-entry.tsx` | App shell state machine |
| Modify | `src/runner/index.tsx` | Wire save/restore into ZifmiaRunner |
| Modify | `src/components/GameShell.tsx` | Thread save/restore/quit props to MenuBar |

All paths relative to `packages/zifmia/`.

## Dependencies

- `lz-string` — already used by platform-browser, add to zifmia's `package.json`
- No new external dependencies

## Resolved Questions

1. **`ZifmiaRunner` accepts `ArrayBuffer` directly.** Add `bundleData?: ArrayBuffer` as an alternative to `bundleUrl`. File-picker and drag-drop paths pass the buffer directly; URL paths fetch first then pass the buffer. Avoids round-tripping through a blob URL.

2. **Write save/restore properly.** Design `save-integration.ts` as clean, well-structured code. Reuse types and patterns from `platform-browser/SaveManager` where appropriate, but this is its own module — not a copy-paste job or thin wrapper. The delta-save approach (baseline + changed entities) is the right design; implement it cleanly against `WorldModel`.

3. **Transcripts are persisted in saves.** Transcripts serve three use cases:
   - **Restore full play state** — player loads a save and sees their complete session history, including play-tester annotations (ADR-109 `$bug`, `$note`, `#` comments)
   - **Download transcript** — export session as a file for review, bug reporting, or sharing
   - **Create walkthroughs** — export command sequences suitable for transcript testing

   **Save format**: `TranscriptEntry[]` serialized as JSON, compressed with lz-string. This preserves structured data (turn numbers, timestamps, commands vs output, annotation types) rather than flattening to HTML. The React runner already uses `TranscriptEntry[]` in state — saves store the same structure.

   **Export formats** (File menu actions):
   - **Full transcript** — rendered text with commands, output, and annotations. Downloadable as `.txt` or `.md`.
   - **Walkthrough export** — commands only, in `.transcript` format compatible with the transcript tester. Annotations exported as `#` comments.

### 3.8 Transcript Export

**File**: `packages/zifmia/src/runner/transcript-export.ts`

Utility functions for the two export formats:

```typescript
/** Full session transcript as markdown */
export function exportTranscriptMarkdown(entries: TranscriptEntry[]): string;

/** Commands-only walkthrough in .transcript format */
export function exportWalkthrough(entries: TranscriptEntry[]): string;
```

Wire into MenuBar via File menu: "Save Transcript…" and "Export Walkthrough…" trigger browser download of the generated file.

**TranscriptEntry expansion**: The current `TranscriptEntry` type needs an optional `annotation` field to carry ADR-109 play-tester interjections:

```typescript
export interface TranscriptEntry {
  id: string;
  turn: number;
  command?: string;
  text: string;
  timestamp: number;
  /** ADR-109 play-tester annotation (if this entry is an annotation) */
  annotation?: {
    type: 'comment' | 'bug' | 'note' | 'confusing' | 'expected' | 'bookmark';
    text: string;
  };
}
```

Annotations are first-class transcript entries — they appear inline in the session history, persist in saves, and export correctly in both formats.

## Files Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/storage/storage-provider.ts` | StorageProvider interface |
| Create | `src/storage/browser-storage-provider.ts` | localStorage implementation |
| Create | `src/storage/index.ts` | Barrel export |
| Create | `src/runner/save-integration.ts` | World state capture/restore (delta saves) |
| Create | `src/runner/transcript-export.ts` | Transcript markdown + walkthrough export |
| Create | `src/runner/StoryLibrary.tsx` | Story picker / recent stories UI |
| Create | `src/runner/SaveDialog.tsx` | Save game modal |
| Create | `src/runner/RestoreDialog.tsx` | Restore game modal |
| Modify | `src/runner/runner-entry.tsx` | App shell state machine |
| Modify | `src/runner/index.tsx` | Wire save/restore + accept ArrayBuffer |
| Modify | `src/types/game-state.ts` | Add annotation field to TranscriptEntry |
| Modify | `src/components/GameShell.tsx` | Thread save/restore/quit/export props to MenuBar |
| Modify | `src/components/menu/MenuBar.tsx` | Add transcript export menu items |

All paths relative to `packages/zifmia/`.

## Dependencies

- `lz-string` — already used by platform-browser, add to zifmia's `package.json`
- No new external dependencies

## Non-Goals (Phase 3)

- Tauri StorageProvider implementation (Phase 6)
- Asset serving / illustration rendering (Phase 4)
- Story CSS scoping (Phase 5)
- Cloud saves or sync
- Story catalog / remote browsing
