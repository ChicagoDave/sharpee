# ADR-113: Map Position Hints

## Status: Accepted (Phase 1 Implemented)

## Context

The React client's auto-generated exploration map positions rooms on a 2D grid based on compass directions traveled. This works well for simple maps but breaks down when:

1. **Non-Euclidean connections**: Going N→E→W doesn't return to the start (e.g., Behind House → Kitchen is west, but Kitchen isn't at North of House's position)
2. **Interior spaces**: Entering a building through a window shouldn't place the interior room at the same grid position as an exterior room
3. **Complex topology**: Caves, mazes, and multi-level areas often have irregular connections

The current algorithm uses collision detection and perpendicular offset, but this can result in unintuitive room placements that don't match the author's intended layout.

## Decision

Allow story authors to provide **map position hints** that guide the auto-mapper. Hints are optional - the algorithm falls back to direction-based positioning when no hints are present.

### Hint Types

#### 1. Exit-Level Hints (Relative Positioning)

Specify offset from the source room for a particular exit:

```typescript
// In room definition
exits: {
  west: {
    destination: 'kitchen',
    mapHint: { dx: -1, dy: 1 }  // left and down (Kitchen is interior/below)
  }
}
```

This tells the mapper: "When the player goes west through this exit, place the destination 1 left and 1 down from this room."

#### 2. Room-Level Hints (Absolute Positioning)

Specify fixed grid coordinates for rooms within a region:

```typescript
// In region definition
export const houseInteriorLayout: MapLayout = {
  'kitchen': { x: 0, y: 2 },
  'living-room': { x: 1, y: 2 },
  'attic': { x: 0, y: 1, z: 1 },
  'cellar': { x: 0, y: 2, z: -1 }
};
```

Absolute hints take precedence over relative hints and direction-based positioning.

#### 3. Region Anchoring

When entering a new region, specify where it anchors relative to the entry point:

```typescript
export const undergroundRegion: RegionMapConfig = {
  anchor: 'cellar-entrance',  // First room entered becomes anchor
  layout: {
    'cellar-entrance': { x: 0, y: 0, z: 0 },  // Relative to anchor
    'cellar-north': { x: 0, y: -1, z: 0 },
    'cellar-east': { x: 1, y: 0, z: 0 }
  }
};
```

### Data Flow

```
Player moves → Check exit mapHint → Check room layout hint → Fall back to direction algorithm
```

### Schema

```typescript
interface ExitMapHint {
  dx?: number;  // Grid offset X (-1 = west, +1 = east)
  dy?: number;  // Grid offset Y (-1 = north, +1 = south)
  dz?: number;  // Grid offset Z (-1 = down, +1 = up)
}

interface MapLayout {
  [roomId: string]: {
    x: number;
    y: number;
    z?: number;
  };
}

interface RegionMapConfig {
  anchor: string;  // Room ID that anchors the region
  layout: MapLayout;
}
```

## Map Region Editor

A web-based visual tool for authors to define regions and arrange room positions. The editor outputs the map hint data structures described above.

### Core Concepts

#### Regions

A **region** is a named group of rooms that share a coordinate space:

```typescript
interface MapRegion {
  id: string;                    // e.g., 'house-interior', 'great-underground'
  name: string;                  // Display name: "House Interior"
  rooms: string[];               // Room IDs in this region
  anchor?: string;               // Room that connects to outside regions
  layout: MapLayout;             // Position data (editor output)
}
```

Regions allow:
- Independent coordinate systems (underground doesn't overlap surface)
- Logical grouping for large games
- Anchor points for connecting regions

#### Editor Workflow

```
1. Import room data    →  Load rooms and exits from story
2. Define regions      →  Group rooms into named regions
3. Arrange visually    →  Drag rooms on grid canvas
4. Export hints        →  Generate TypeScript/JSON for story
```

### Editor Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  Map Region Editor                                    [Import] [Export] │
├──────────────┬──────────────────────────────────────────────────────┤
│  REGIONS     │                                                      │
│  ─────────── │      ┌──────┐                                        │
│  ▼ Surface   │      │West  │                                        │
│    □ West of │      │of    │──────┌──────┐                          │
│    □ North of│      │House │      │North │                          │
│    □ Behind  │      └──────┘      │of    │──────┌──────┐            │
│              │           │        │House │      │Behind│            │
│  ▼ House     │           │        └──────┘      │House │            │
│    □ Kitchen │           │                      └──────┘            │
│    □ Living  │      ┌────┴─┐                         │              │
│    □ Attic   │      │      │                         │ (window)     │
│              │      │Kitchen├─────┌──────┐           │              │
│  + New Region│      │      │      │Living│      ┌────┴─┐            │
│              │      └──────┘      │Room  │      │      │            │
│  ─────────── │                    └──────┘      │Kitchen            │
│  UNASSIGNED  │                                  │      │            │
│    □ Cellar  │                                  └──────┘            │
│    □ Maze 1  │                                                      │
│              │  [Grid: 20px] [Snap: On] [Show Exits: On]            │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Editor Features

#### Room Management
- **Import**: Load room definitions from story source or running game
- **Region assignment**: Drag rooms into region groups in sidebar
- **Multi-select**: Shift+click to select multiple rooms for batch operations

#### Visual Canvas
- **Drag-and-drop**: Position rooms on infinite grid canvas
- **Snap-to-grid**: Configurable grid size (default 1 unit = standard room spacing)
- **Exit visualization**: Show connections as lines between rooms
- **Exit stubs**: Display available exits that lead outside current region
- **Zoom/pan**: Navigate large maps

#### Connection Editing
- **Auto-detect**: Infer connections from room exit definitions
- **Manual override**: Add visual-only connections for non-standard exits
- **Anchor marking**: Designate entry points between regions

#### Export Options

**TypeScript (recommended)**:
```typescript
// Generated by Map Region Editor
// Source: stories/dungeo/map-layout.editor.json

export const surfaceRegion: RegionMapConfig = {
  id: 'surface',
  name: 'Surface',
  anchor: 'west-of-house',
  layout: {
    'west-of-house': { x: 0, y: 0 },
    'north-of-house': { x: 1, y: 0 },
    'behind-house': { x: 2, y: 0 },
  }
};

export const houseInteriorRegion: RegionMapConfig = {
  id: 'house-interior',
  name: 'House Interior',
  anchor: 'kitchen',
  anchorOffset: { x: 2, y: 1 },  // Position relative to behind-house
  layout: {
    'kitchen': { x: 0, y: 0 },
    'living-room': { x: 1, y: 0 },
    'attic': { x: 0, y: -1, z: 1 },
  }
};

export const mapRegions = [surfaceRegion, houseInteriorRegion];
```

**JSON (for external tools)**:
```json
{
  "version": 1,
  "regions": [
    {
      "id": "surface",
      "name": "Surface",
      "anchor": "west-of-house",
      "layout": {
        "west-of-house": { "x": 0, "y": 0 },
        "north-of-house": { "x": 1, "y": 0 }
      }
    }
  ]
}
```

### Editor Data Format

The editor saves its working state (including visual metadata) separately from the export:

```typescript
interface EditorState {
  version: number;
  storyId: string;
  regions: EditorRegion[];
  unassignedRooms: string[];
  viewState: {
    zoom: number;
    panX: number;
    panY: number;
    activeRegion: string | null;
  };
}

interface EditorRegion extends MapRegion {
  // Visual metadata (not exported to hints)
  color?: string;           // Region highlight color
  collapsed?: boolean;      // Sidebar collapse state
  notes?: string;           // Author notes
}
```

### Integration Points

#### Import Sources

1. **Story source files**: Parse TypeScript room definitions
2. **Running game**: Connect to dev server, extract room data via events
3. **Transcript replay**: Build map by replaying a walkthrough transcript
4. **Existing hints**: Load previous editor output for refinement

#### Export Targets

1. **Story region file**: `stories/{story}/src/map-layout.ts`
2. **Story metadata**: Include in story's `getMetadata()` export
3. **Client bundle**: Embed in React client build

### Implementation Phases

#### Phase 1: Exit Hints (Story-Side)

1. Add optional `mapHint` field to exit definitions in `IExitInfo`
2. Include `mapHint` in `if.event.actor_moved` event data
3. Update React client's `useMap` hook to use hints when present

#### Phase 2: Room Layout (Story-Side)

1. Add `mapLayout` export option for regions
2. Pass layout data to client via game metadata or dedicated event
3. Client applies absolute positions for rooms with layout entries

#### Phase 3: Basic Editor

1. Standalone HTML/JS tool (no build required)
2. Manual room entry or JSON import
3. Drag-and-drop grid canvas
4. Export to TypeScript/JSON

#### Phase 4: Story Integration

1. Import room data from story source files
2. Connect to running dev server for live room data
3. Export directly to story's map-layout.ts

#### Phase 5: Advanced Features

1. Multi-level (z-axis) visualization with layer tabs
2. Transcript replay to auto-build initial layout
3. Diff view showing changes from last export
4. Undo/redo history

## Consequences

### Positive

- Authors can define intuitive map layouts for complex areas
- Interior spaces, caves, and mazes render correctly
- Gradual adoption - hints are optional enhancements
- No changes required for simple compass-grid maps
- Visual editor eliminates manual coordinate calculation
- Region grouping helps manage large games (100+ rooms)

### Negative

- Editor is additional tooling to build and maintain
- Two sources of truth (hints vs actual connections) could diverge
- Authors must re-export after room changes

### Neutral

- Existing maps continue to work with direction-based algorithm
- Hints can be added incrementally as problems are discovered
- Editor state file is separate from exported hints (can be regenerated)

## Alternatives Considered

### Force-Directed Graph Layout

Automatically compute positions using physics simulation (nodes repel, edges attract). Rejected because:
- Positions would shift as map grows, disorienting player
- Computationally expensive
- No author control over layout

### Fixed World Map

Require all room positions to be authored. Rejected because:
- High authoring burden
- Loses benefits of auto-discovery
- Overkill for simple maps

### Separate Map File

Store map layout in a separate JSON file. Rejected because:
- Separates map from room definitions
- Additional file to maintain
- Harder to keep in sync

## References

- Auto-mapper implementation: `packages/client-react/src/hooks/useMap.ts`
- Exit definitions: `packages/world-model/src/traits/room-trait.ts`
- Map panel: `packages/client-react/src/components/panels/MapPanel.tsx`
- Map design experiments: `docs/design/react-map.html`
- Region editor (future): `tools/map-editor/index.html`
