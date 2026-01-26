import { create } from 'zustand';
import type { EditorState, Room, Region, ViewState } from '../types/editor';

const DEFAULT_VIEW_STATE: ViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showConnections: true,
  gridSize: 80,
};

const REGION_COLORS = [
  '#4a9eff', // blue
  '#ff9f4a', // orange
  '#4aff9f', // green
  '#ff4a9f', // pink
  '#9f4aff', // purple
  '#ffff4a', // yellow
  '#4affff', // cyan
  '#ff4a4a', // red
];

interface EditorActions {
  // Project actions
  setProject: (path: string, stories: string[]) => void;
  clearProject: () => void;

  // Story actions
  setStory: (storyId: string) => void;
  setRooms: (rooms: Room[]) => void;

  // Region actions
  createRegion: (name: string) => void;
  deleteRegion: (regionId: string) => void;
  renameRegion: (regionId: string, name: string) => void;
  setRegionAnchor: (regionId: string, roomId: string | undefined) => void;
  selectRegion: (regionId: string | null) => void;

  // Room assignment
  assignRoomToRegion: (roomId: string, regionId: string, x?: number, y?: number) => void;
  unassignRoom: (roomId: string) => void;
  moveRoom: (roomId: string, x: number, y: number, z?: number) => void;

  // Selection
  selectRoom: (roomId: string, multi?: boolean) => void;
  clearSelection: () => void;

  // View
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleConnections: () => void;

  // Layout persistence
  loadLayout: (regions: Region[], unassignedRooms: string[]) => void;
  markDirty: () => void;
  markClean: () => void;

  // Status
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  // Initial state
  projectPath: null,
  availableStories: [],
  currentStory: null,
  rooms: new Map(),
  regions: [],
  unassignedRooms: [],
  selectedRegion: null,
  selectedRooms: [],
  viewState: DEFAULT_VIEW_STATE,
  isDirty: false,
  isLoading: false,
  error: null,

  // Project actions
  setProject: (path, stories) => set({
    projectPath: path,
    availableStories: stories,
    currentStory: null,
    rooms: new Map(),
    regions: [],
    unassignedRooms: [],
    selectedRegion: null,
    selectedRooms: [],
    isDirty: false,
    error: null,
  }),

  clearProject: () => set({
    projectPath: null,
    availableStories: [],
    currentStory: null,
    rooms: new Map(),
    regions: [],
    unassignedRooms: [],
    selectedRegion: null,
    selectedRooms: [],
    isDirty: false,
    error: null,
  }),

  // Story actions
  setStory: (storyId) => set({
    currentStory: storyId,
    rooms: new Map(),
    regions: [],
    unassignedRooms: [],
    selectedRegion: null,
    selectedRooms: [],
    isDirty: false,
  }),

  setRooms: (rooms) => {
    const roomMap = new Map<string, Room>();
    const unassigned: string[] = [];

    for (const room of rooms) {
      roomMap.set(room.id, room);
      unassigned.push(room.id);
    }

    set({
      rooms: roomMap,
      unassignedRooms: unassigned,
    });
  },

  // Region actions
  createRegion: (name) => {
    const { regions } = get();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const color = REGION_COLORS[regions.length % REGION_COLORS.length];

    set({
      regions: [...regions, { id, name, color, rooms: [] }],
      selectedRegion: id,
      isDirty: true,
    });
  },

  deleteRegion: (regionId) => {
    const { regions, unassignedRooms } = get();
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    // Move rooms back to unassigned
    const roomIds = region.rooms.map(r => r.roomId);

    set({
      regions: regions.filter(r => r.id !== regionId),
      unassignedRooms: [...unassignedRooms, ...roomIds],
      selectedRegion: null,
      isDirty: true,
    });
  },

  renameRegion: (regionId, name) => {
    const { regions } = get();
    set({
      regions: regions.map(r => r.id === regionId ? { ...r, name } : r),
      isDirty: true,
    });
  },

  setRegionAnchor: (regionId, roomId) => {
    const { regions } = get();
    set({
      regions: regions.map(r => r.id === regionId ? { ...r, anchor: roomId } : r),
      isDirty: true,
    });
  },

  selectRegion: (regionId) => set({
    selectedRegion: regionId,
    selectedRooms: [],
  }),

  // Room assignment
  assignRoomToRegion: (roomId, regionId, x = 0, y = 0) => {
    const { regions, unassignedRooms } = get();
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    // Remove from current location (unassigned or another region)
    const newUnassigned = unassignedRooms.filter(id => id !== roomId);
    const newRegions = regions.map(r => ({
      ...r,
      rooms: r.rooms.filter(room => room.roomId !== roomId),
    }));

    // Add to target region at specified position
    const targetRegion = newRegions.find(r => r.id === regionId)!;
    targetRegion.rooms.push({
      roomId,
      x,
      y,
      z: 0,
    });

    set({
      regions: newRegions,
      unassignedRooms: newUnassigned,
      isDirty: true,
    });
  },

  unassignRoom: (roomId) => {
    const { regions, unassignedRooms } = get();

    set({
      regions: regions.map(r => ({
        ...r,
        rooms: r.rooms.filter(room => room.roomId !== roomId),
      })),
      unassignedRooms: [...unassignedRooms, roomId],
      isDirty: true,
    });
  },

  moveRoom: (roomId, x, y, z = 0) => {
    const { regions } = get();

    set({
      regions: regions.map(r => ({
        ...r,
        rooms: r.rooms.map(room =>
          room.roomId === roomId ? { ...room, x, y, z } : room
        ),
      })),
      isDirty: true,
    });
  },

  // Selection
  selectRoom: (roomId, multi = false) => {
    const { selectedRooms } = get();

    if (multi) {
      if (selectedRooms.includes(roomId)) {
        set({ selectedRooms: selectedRooms.filter(id => id !== roomId) });
      } else {
        set({ selectedRooms: [...selectedRooms, roomId] });
      }
    } else {
      set({ selectedRooms: [roomId] });
    }
  },

  clearSelection: () => set({ selectedRooms: [] }),

  // View
  setZoom: (zoom) => set(state => ({
    viewState: { ...state.viewState, zoom: Math.max(0.25, Math.min(2, zoom)) },
  })),

  setPan: (x, y) => set(state => ({
    viewState: { ...state.viewState, panX: x, panY: y },
  })),

  toggleGrid: () => set(state => ({
    viewState: { ...state.viewState, showGrid: !state.viewState.showGrid },
  })),

  toggleConnections: () => set(state => ({
    viewState: { ...state.viewState, showConnections: !state.viewState.showConnections },
  })),

  // Layout persistence
  loadLayout: (regions, unassignedRooms) => {
    set({
      regions,
      unassignedRooms,
      isDirty: false,
    });
  },

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  // Status
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
