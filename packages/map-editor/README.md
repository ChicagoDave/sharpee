# Sharpee Map Editor

Visual region layout editor for Interactive Fiction stories.

## Development

```bash
# Install dependencies (this package is excluded from the pnpm workspace
# and has its own package-lock.json — use npm inside this directory)
npm install

# Run in development mode (Vite + Electron)
npm run dev:electron

# Build for production
npm run build:electron
```

## Requirements

Before using the editor, you must:

1. Build the Sharpee platform with a story:
   ```bash
   ./repokit build dungeo
   ```

2. The bundle exports `createEditorSession`, which the editor uses to load stories.

## Usage

1. Launch the Map Editor
2. Click **Open Project** on the welcome screen → select your Sharpee project folder
3. Select a story from the dropdown
4. Create regions and assign rooms
5. Select a region to position rooms on the canvas
6. Save to generate `map-layout.editor.json` (editor working file) and `map-layout.ts`

## Architecture

- **Electron main process**: File I/O, story loading, IPC
- **React renderer**: UI with Zustand state management
- **React Flow canvas** (`@xyflow/react`): Visual room positioning

See `docs/architecture/adrs/adr-113-map-position-hints.md` for full details.
