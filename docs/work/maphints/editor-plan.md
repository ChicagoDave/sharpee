# Map Editor Implementation Plan

## Overview

A standalone Electron application for visually editing map region layouts. Authors open their Sharpee project, select a story, and arrange rooms into regions on a grid canvas. The editor reads room data from the compiled story bundle and saves layout data that the React client uses for map positioning.

## Goals

1. **Author-friendly**: No CLI commands, just open the app and work
2. **Full integration**: Load actual game data, not manual JSON entry
3. **Round-trip**: Read existing layouts, edit, save back
4. **Clean output**: Generate TypeScript that integrates with story source

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop shell | Electron | Native file access, single app experience |
| Renderer | React 18 | Consistent with client-react |
| State | Zustand | Simple, performant, good DevTools |
| Canvas | SVG | DOM events, CSS styling, sufficient for region-sized room counts |
| Build (renderer) | Vite | Fast dev, good React/TS support |
| Build (electron) | electron-builder | Simple config, cross-platform |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Map Editor (Electron)                                          │
├───────────────────────────┬─────────────────────────────────────┤
│  Main Process (Node)      │  Renderer Process (React)           │
│                           │                                      │
│  • Native file dialogs    │  • Zustand store                    │
│  • Load story bundle      │  • SVG canvas with drag/drop        │
│  • Extract rooms from     │  • Region sidebar                   │
│    WorldModel             │  • Room cards                       │
│  • Read/write layout      │  • Toolbar (save, export, zoom)     │
│    files                  │                                      │
│  • Watch for bundle       │                                      │
│    changes                │                                      │
└───────────────────────────┴─────────────────────────────────────┘
```

### IPC Channels

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `project:open` | R → M | - | Open native folder picker |
| `project:opened` | M → R | `{ path, stories[] }` | Return project info |
| `story:load` | R → M | `{ storyId }` | Load story bundle |
| `story:loaded` | M → R | `{ rooms[], exits[] }` | Return extracted data |
| `layout:load` | R → M | `{ storyId }` | Load existing layout |
| `layout:loaded` | M → R | `{ regions[], unassigned[] }` | Return layout data |
| `layout:save` | R → M | `{ storyId, regions[] }` | Save layout |
| `layout:saved` | M → R | `{ success, path }` | Confirm save |
| `story:changed` | M → R | `{ storyId }` | Bundle file changed |

## Package Structure

```
packages/map-editor/
├── package.json
├── tsconfig.json
├── tsconfig.node.json           # For electron/ folder
├── vite.config.ts
├── electron-builder.json
├── index.html
│
├── electron/
│   ├── main.ts                  # Electron entry, window management
│   ├── preload.ts               # Context bridge for IPC
│   └── services/
│       ├── project.ts           # Find stories in project folder
│       ├── story-loader.ts      # Load bundle, extract rooms
│       ├── layout-io.ts         # Read/write layout files
│       └── watcher.ts           # Watch bundle for changes
│
├── src/
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Main layout
│   │
│   ├── store/
│   │   ├── editor-store.ts      # Zustand store definition
│   │   └── actions.ts           # Store actions
│   │
│   ├── types/
│   │   ├── editor.ts            # EditorState, Region, etc.
│   │   ├── room.ts              # Room, Exit definitions
│   │   └── ipc.ts               # IPC message types
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx    # Main app structure
│   │   │   ├── Header.tsx       # Title bar, project info
│   │   │   └── StatusBar.tsx    # Save status, room count
│   │   │
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx      # Container
│   │   │   ├── RegionList.tsx   # Collapsible region tree
│   │   │   ├── RegionItem.tsx   # Single region with rooms
│   │   │   ├── RoomList.tsx     # Unassigned rooms panel
│   │   │   └── RoomCard.tsx     # Draggable room card
│   │   │
│   │   ├── Canvas/
│   │   │   ├── MapCanvas.tsx    # SVG container, pan/zoom
│   │   │   ├── Grid.tsx         # Background grid lines
│   │   │   ├── RoomNode.tsx     # Room box on canvas
│   │   │   ├── Connection.tsx   # Exit line between rooms
│   │   │   └── DragLayer.tsx    # Drag preview overlay
│   │   │
│   │   └── Toolbar/
│   │       ├── Toolbar.tsx      # Container
│   │       ├── FileMenu.tsx     # Open, Save, Export
│   │       ├── ViewControls.tsx # Zoom, grid toggle
│   │       └── StorySelect.tsx  # Story dropdown
│   │
│   ├── hooks/
│   │   ├── useIpc.ts            # IPC communication wrapper
│   │   ├── useDragDrop.ts       # Drag and drop logic
│   │   ├── useCanvas.ts         # Pan, zoom, coordinate transforms
│   │   └── useKeyboard.ts       # Keyboard shortcuts
│   │
│   └── utils/
│       ├── geometry.ts          # Grid math, collision detection
│       ├── export-ts.ts         # Generate TypeScript output
│       └── export-json.ts       # Generate JSON output
│
└── public/
    └── icon.png                 # App icon
```

## Data Model

### Editor State (Zustand)

```typescript
interface EditorState {
  // Project
  projectPath: string | null;
  availableStories: string[];
  currentStory: string | null;

  // Room data (from story)
  rooms: Map<string, Room>;

  // Layout (editable)
  regions: Region[];
  unassignedRooms: string[];  // Room IDs not yet in a region

  // UI state
  selectedRegion: string | null;
  selectedRooms: string[];    // Multi-select
  viewState: ViewState;
  isDirty: boolean;
}

interface Room {
  id: string;
  name: string;
  exits: Exit[];
}

interface Exit {
  direction: string;
  destinationId: string;
  mapHint?: { dx?: number; dy?: number; dz?: number };
}

interface Region {
  id: string;
  name: string;
  color: string;
  anchor?: string;           // Room that connects to other regions
  rooms: RegionRoom[];
}

interface RegionRoom {
  roomId: string;
  x: number;
  y: number;
  z: number;
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showConnections: boolean;
  gridSize: number;
}
```

## File Formats

### Editor Working File

`stories/{story}/src/map-layout.editor.json`

This is the editor's source of truth. Contains full editor state including visual metadata.

```json
{
  "version": 1,
  "storyId": "dungeo",
  "regions": [
    {
      "id": "surface",
      "name": "Surface",
      "color": "#4a9eff",
      "anchor": "west-of-house",
      "rooms": [
        { "roomId": "west-of-house", "x": 0, "y": 0, "z": 0 },
        { "roomId": "north-of-house", "x": 1, "y": 0, "z": 0 },
        { "roomId": "behind-house", "x": 2, "y": 0, "z": 0 }
      ]
    },
    {
      "id": "house-interior",
      "name": "House Interior",
      "color": "#ff9f4a",
      "anchor": "kitchen",
      "rooms": [
        { "roomId": "kitchen", "x": 0, "y": 0, "z": 0 },
        { "roomId": "living-room", "x": 1, "y": 0, "z": 0 },
        { "roomId": "attic", "x": 0, "y": -1, "z": 1 }
      ]
    }
  ],
  "unassignedRooms": ["cellar", "maze-1", "maze-2"]
}
```

### Generated TypeScript

`stories/{story}/src/map-layout.ts`

Generated from editor JSON. Consumed by React client.

```typescript
// Generated by Sharpee Map Editor
// Do not edit manually - changes will be overwritten
// Source: map-layout.editor.json

import type { RegionMapConfig } from '@sharpee/world-model';

export const surfaceRegion: RegionMapConfig = {
  id: 'surface',
  name: 'Surface',
  anchor: 'west-of-house',
  layout: {
    'west-of-house': { x: 0, y: 0, z: 0 },
    'north-of-house': { x: 1, y: 0, z: 0 },
    'behind-house': { x: 2, y: 0, z: 0 },
  }
};

export const houseInteriorRegion: RegionMapConfig = {
  id: 'house-interior',
  name: 'House Interior',
  anchor: 'kitchen',
  layout: {
    'kitchen': { x: 0, y: 0, z: 0 },
    'living-room': { x: 1, y: 0, z: 0 },
    'attic': { x: 0, y: -1, z: 1 },
  }
};

export const mapRegions: RegionMapConfig[] = [
  surfaceRegion,
  houseInteriorRegion,
];
```

## Room Extraction

The main process loads the story bundle and extracts room data:

```typescript
// electron/services/story-loader.ts

export async function loadStory(projectPath: string, storyId: string): Promise<StoryData> {
  const bundlePath = path.join(projectPath, 'dist', 'sharpee.js');

  // Clear require cache to get fresh bundle
  delete require.cache[require.resolve(bundlePath)];

  const bundle = require(bundlePath);

  // Initialize world for editing (no game loop)
  const { world } = bundle.createEditorSession(storyId);

  // Extract all rooms
  const rooms: Room[] = [];

  for (const entity of world.getEntitiesWithTrait('room')) {
    const roomTrait = entity.getTrait('room');

    rooms.push({
      id: entity.id,
      name: entity.name || entity.id,
      exits: Object.entries(roomTrait.exits).map(([dir, exit]) => ({
        direction: dir,
        destinationId: exit.destination,
        mapHint: exit.mapHint,
      })),
    });
  }

  return { storyId, rooms };
}
```

**Note**: This requires adding a `createEditorSession` export to the bundle that initializes the world without starting the game.

## UI Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Sharpee Map Editor                              dungeo ▼    [Save]     │
├────────────────────┬────────────────────────────────────────────────────┤
│                    │                                                     │
│  REGIONS           │      ┌────────┐      ┌────────┐                    │
│  ──────────────    │      │ West   │──────│ North  │                    │
│  ▼ Surface (3)     │      │ of     │      │ of     │──────┐             │
│    ○ West of House │      │ House  │      │ House  │      │             │
│    ○ North of House│      └────────┘      └────────┘      │             │
│    ○ Behind House  │           │                          │             │
│                    │           │                    ┌─────┴──┐          │
│  ▶ House (3)       │           │                    │ Behind │          │
│                    │      ┌────┴───┐                │ House  │          │
│  + New Region      │      │        │                └────────┘          │
│                    │      │ Kitchen├────┐                               │
│  ──────────────    │      │        │    │                               │
│  UNASSIGNED (12)   │      └────────┘    │                               │
│    ○ Cellar        │                ┌───┴────┐                          │
│    ○ Maze 1        │                │ Living │                          │
│    ○ Maze 2        │                │ Room   │                          │
│    ○ Maze 3        │                └────────┘                          │
│    ...             │                                                     │
│                    │                                                     │
│                    │  [+] [-] [Grid ✓] [Connections ✓]    Zoom: 100%    │
└────────────────────┴────────────────────────────────────────────────────┘
```

## User Workflows

### First Time Setup

1. Build story: `./build.sh -s dungeo` (terminal, one time)
2. Launch Map Editor
3. **File → Open Project** → select sharpee folder
4. Story dropdown shows "dungeo"
5. Select dungeo → all rooms appear in "Unassigned" panel
6. Create region "Surface", drag relevant rooms in
7. Select "Surface" region → canvas becomes active
8. Drag rooms to position on grid
9. Connections auto-draw based on exit data
10. **File → Save** → creates `map-layout.editor.json` and `map-layout.ts`

### Editing Existing Layout

1. Launch Map Editor
2. Open project (or recent project auto-loads)
3. Select story → existing regions load from `map-layout.editor.json`
4. Make edits
5. Save

### After Adding New Rooms

1. Rebuild story: `./build.sh -s dungeo`
2. Map Editor detects change (or user clicks Refresh)
3. New rooms appear in "Unassigned" panel
4. Drag to appropriate regions

## Implementation Phases

### Phase 1: Scaffold & Basic UI ✓ COMPLETE

- [x] Create package.json with Electron + Vite + React
- [x] Set up Electron main process with window management
- [x] Set up preload script with IPC bridge
- [x] Create basic React app with placeholder components
- [x] Implement project open dialog
- [x] Display story dropdown

**Deliverable**: App opens, can select project folder, shows story list

**Files created:**
- `packages/map-editor/package.json`
- `packages/map-editor/electron/main.ts`
- `packages/map-editor/electron/preload.ts`
- `packages/map-editor/src/App.tsx`
- `packages/map-editor/src/components/` (Header, Sidebar, Canvas, WelcomeScreen)
- `packages/map-editor/src/store/editor-store.ts`
- `packages/map-editor/src/types/editor.ts`

### Phase 2: Room Loading

- [ ] Add `createEditorSession` export to bundle **(platform change required)**
- [x] Implement story-loader service (in electron/main.ts)
- [x] Extract rooms and exits from WorldModel
- [x] Display rooms in Unassigned panel
- [x] Show room cards with name and exit count

**Deliverable**: Selecting a story shows all its rooms

**Blocker**: Requires platform to export `createEditorSession` function

### Phase 3: Region Management ✓ COMPLETE

- [x] Implement Zustand store
- [x] Create/rename/delete regions
- [x] Drag rooms between regions and unassigned
- [x] Persist region membership
- [x] Collapsible region tree in sidebar

**Deliverable**: Can organize rooms into regions

### Phase 4: Canvas & Positioning (partial)

- [x] SVG canvas with pan and zoom (basic)
- [x] Grid background (pattern defined)
- [x] Room nodes on canvas (basic rendering)
- [ ] Drag to position rooms on canvas
- [ ] Snap to grid
- [ ] Draw connection lines between exits

**Deliverable**: Can visually arrange rooms on grid

### Phase 5: Persistence ✓ COMPLETE

- [x] Save layout to JSON
- [x] Load layout from JSON
- [x] Generate TypeScript export
- [x] Dirty state tracking
- [ ] Save confirmation on close

**Deliverable**: Full round-trip editing

### Phase 6: Polish

- [ ] Keyboard shortcuts (Delete, Ctrl+S, etc.)
- [ ] Multi-select rooms
- [ ] Undo/redo
- [ ] File watcher for bundle changes
- [ ] Recent projects
- [ ] App icon and packaging

**Deliverable**: Production-ready editor

## Platform Changes Required

### Bundle Export

Add to `packages/engine/src/index.ts` (or appropriate location):

```typescript
export function createEditorSession(storyId: string): { world: WorldModel } {
  const story = getStory(storyId);
  const world = new WorldModel();
  story.initializeWorld(world);
  return { world };
}
```

### RegionMapConfig Type

Add to `packages/world-model/src/types/`:

```typescript
export interface RegionMapConfig {
  id: string;
  name: string;
  anchor?: string;
  layout: {
    [roomId: string]: { x: number; y: number; z?: number };
  };
}
```

### Client Integration (Phase 2 of ADR-113)

The React client needs to consume `mapRegions` export and use it for positioning. This is separate from the editor work.

## Open Questions

1. **Multi-level visualization**: Support z-axis with layer tabs, or defer to later phase?
   - Recommendation: Defer. Most regions are single-level. Add later if needed.

2. **Connection editing**: Allow manual connection overrides, or purely derive from exits?
   - Recommendation: Derive from exits only. Manual connections diverge from truth.

3. **Anchor visualization**: How to show anchor rooms and region boundaries?
   - Recommendation: Highlight anchor with icon, show region name in corner of canvas.

4. **Partial layouts**: What if layout only covers some rooms in a region?
   - Recommendation: Unpositioned rooms stack at origin, author drags to place.

## Success Criteria

1. Author can open project and see all story rooms
2. Author can create regions and assign rooms
3. Author can visually position rooms on grid canvas
4. Connections are drawn automatically from exit data
5. Layout persists across sessions
6. Generated TypeScript integrates with React client
7. Packaged as standalone app (Windows, Mac, Linux)

## References

- ADR-113: Map Position Hints (full specification)
- Phase 1 implementation: `docs/context/session-20260124-1046-maphints.md`
- React client map hook: `packages/client-react/src/hooks/useMap.ts`
- Existing map panel: `packages/client-react/src/components/panels/MapPanel.tsx`
