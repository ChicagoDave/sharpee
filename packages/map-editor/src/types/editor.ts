export interface Room {
  id: string;
  name: string;
  description?: string;
  exits: Exit[];
}

export interface Exit {
  direction: string;
  destinationId: string;
  mapHint?: MapHint;
}

export interface MapHint {
  dx?: number;
  dy?: number;
  dz?: number;
}

export interface Region {
  id: string;
  name: string;
  color: string;
  anchor?: string;
  rooms: RegionRoom[];
}

export interface RegionRoom {
  roomId: string;
  x: number;
  y: number;
  z: number;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showConnections: boolean;
  gridSize: number;
}

export interface EditorLayout {
  version: number;
  storyId: string;
  regions: Region[];
  unassignedRooms: string[];
}

export interface EditorState {
  // Project
  projectPath: string | null;
  availableStories: string[];
  currentStory: string | null;

  // Room data (from story)
  rooms: Map<string, Room>;

  // Layout (editable)
  regions: Region[];
  unassignedRooms: string[];

  // UI state
  selectedRegion: string | null;
  selectedRooms: string[];
  viewState: ViewState;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}
