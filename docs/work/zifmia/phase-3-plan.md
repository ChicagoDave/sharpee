# Zifmia Phase 3 Implementation Plan

## Build Order

Files are ordered by dependency — each step only depends on prior steps.

### Step 1: TranscriptEntry annotation field
**Modify** `packages/zifmia/src/types/game-state.ts`
- Add optional `annotation` field to `TranscriptEntry`
- No other changes to reducer or state

### Step 2: StorageProvider interface + browser implementation
**Create** `packages/zifmia/src/storage/storage-provider.ts`
- `StorageProvider` interface (async methods: listSlots, save, restore, deleteSlot, autoSave, loadAutoSave)
- `SaveSlotInfo` type

**Create** `packages/zifmia/src/storage/browser-storage-provider.ts`
- localStorage with story-scoped keys: `zifmia-{storyId}-save-{slot}`, `zifmia-{storyId}-saves-index`
- lz-string compression for save data
- Add `lz-string` to `packages/zifmia/package.json`

**Create** `packages/zifmia/src/storage/index.ts` — barrel

### Step 3: Save/restore integration
**Create** `packages/zifmia/src/runner/save-integration.ts`
- `SaveData` type: locations, traits, transcript (TranscriptEntry[]), turnCount, score, timestamp
- `SaveRestoreManager` class:
  - Constructor takes WorldModel ref + storyId
  - `captureBaseline()` — snapshot initial world state after initializeWorld
  - `captureState(transcript, turnCount, score)` — delta capture (locations + traits that differ from baseline) + transcript
  - `restoreState(data)` — apply locations + traits back to world, return transcript entries
- Delta logic follows SaveManager pattern: iterate `world.getAllEntities()`, compare locations/traits against baseline

### Step 4: Transcript export
**Create** `packages/zifmia/src/runner/transcript-export.ts`
- `exportTranscriptMarkdown(entries, storyTitle?)` — full readable transcript with `>` command prompts, output text, annotations as bracketed notes
- `exportWalkthrough(entries)` — commands only in `.transcript` format, annotations as `# ` comments
- `downloadFile(content, filename, mimeType)` — trigger browser download via blob URL + click

### Step 5: Save/Restore dialogs
**Create** `packages/zifmia/src/runner/SaveDialog.tsx`
- Modal overlay with name input, existing slots list, Save/Cancel
- Takes `storageProvider`, `storyId`, `onSave(slotName)`, `onCancel`

**Create** `packages/zifmia/src/runner/RestoreDialog.tsx`
- Modal overlay with slot list (name, date, turn, location), Restore/Delete/Cancel
- Takes `storageProvider`, `storyId`, `onRestore(slotName)`, `onCancel`

### Step 6: GameShell + MenuBar updates
**Modify** `packages/zifmia/src/components/GameShell.tsx`
- Add props: `storyTitle`, `onSave`, `onRestore`, `onQuit`, `onExportTranscript`, `onExportWalkthrough`, `onThemeChange`
- Render `<MenuBar>` with these callbacks

**Modify** `packages/zifmia/src/components/menu/MenuBar.tsx`
- Add `onExportTranscript` and `onExportWalkthrough` props
- Add "Save Transcript…" and "Export Walkthrough…" items to File menu

### Step 7: ZifmiaRunner — wire everything
**Modify** `packages/zifmia/src/runner/index.tsx`
- Accept `bundleData?: ArrayBuffer` as alternative to `bundleUrl`
- Accept `onClose?: () => void` callback
- After engine boots: create `SaveRestoreManager`, create `BrowserStorageProvider`, capture baseline
- Manage dialog state (showSaveDialog, showRestoreDialog)
- Wire callbacks: onSave → show SaveDialog → captureState → storageProvider.save; onRestore → show RestoreDialog → storageProvider.restore → restoreState; onQuit → autoSave → onClose
- Wire export callbacks: onExportTranscript/onExportWalkthrough → get transcript from GameContext → export functions → downloadFile
- Auto-save after each turn (subscribe to engine events)
- Pass all callbacks through to GameShell

### Step 8: Story Library + runner entry
**Create** `packages/zifmia/src/runner/StoryLibrary.tsx`
- File picker (`<input type="file" accept=".sharpee">`)
- URL text input
- Drag-and-drop zone
- Recent stories list from localStorage `zifmia-recent-stories`
- Each entry: title, author, storyId, lastPlayed, source ('file'|'url'), url?
- Actions: Play, Continue (if autosave exists — check via StorageProvider), Remove

**Modify** `packages/zifmia/src/runner/runner-entry.tsx`
- State machine: library | loading | playing | error
- `?bundle=` param → skip to loading
- Library renders StoryLibrary; on select → set bundleUrl or bundleData → loading
- Loading/playing renders ZifmiaRunner; onClose → back to library
- Error shows message + "Back to Library" button

### Step 9: Package exports
**Modify** `packages/zifmia/src/index.ts` — export storage module
**Add** `lz-string` to `packages/zifmia/package.json` dependencies

## Verification

1. `./build.sh --runner -s dungeo` — builds without errors
2. Serve `dist/runner/` with `npx serve dist/runner`
3. Open `http://localhost:3000` — should show Story Library
4. Open `http://localhost:3000?bundle=dungeo.sharpee` — should load game directly
5. File picker: select a `.sharpee` file → game loads
6. In-game: File → Save Game → enter name → save succeeds
7. File → Restore Game → select slot → game state restored with transcript
8. File → Save Transcript → downloads `.md` file with full session
9. File → Export Walkthrough → downloads `.transcript` file with commands
10. File → Quit → returns to Story Library, recent stories list updated
