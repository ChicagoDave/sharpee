# Sharpee Map Editor

Visual region layout editor for Interactive Fiction stories.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode (Vite + Electron)
pnpm dev:electron

# Build for production
pnpm build:electron
```

## Requirements

Before using the editor, you must:

1. Build the Sharpee platform with a story:
   ```bash
   ./build.sh -s dungeo
   ```

2. The bundle must export `createEditorSession` (platform change required).

## Usage

1. Launch the Map Editor
2. **File → Open Project** → select your Sharpee project folder
3. Select a story from the dropdown
4. Create regions and assign rooms
5. Select a region to position rooms on the canvas
6. Save to generate `map-layout.ts`

## Architecture

- **Electron main process**: File I/O, story loading, IPC
- **React renderer**: UI with Zustand state management
- **SVG canvas**: Visual room positioning

See `docs/work/maphints/editor-plan.md` for full details.
