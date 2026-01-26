import { contextBridge, ipcRenderer } from 'electron';

export interface ProjectOpenResult {
  path?: string;
  stories?: string[];
  error?: string;
}

export interface StoryLoadResult {
  storyId?: string;
  rooms?: Array<{
    id: string;
    name: string;
    exits: Array<{
      direction: string;
      destinationId: string;
      mapHint?: { dx?: number; dy?: number; dz?: number };
    }>;
  }>;
  error?: string;
}

export interface LayoutLoadResult {
  exists: boolean;
  layout?: unknown;
  error?: string;
}

export interface LayoutSaveResult {
  success?: boolean;
  jsonPath?: string;
  tsPath?: string;
  error?: string;
}

const api = {
  // Project operations
  openProject: (): Promise<ProjectOpenResult | null> => {
    console.log('[preload] openProject called');
    return ipcRenderer.invoke('project:open');
  },

  // Story operations
  loadStory: (projectPath: string, storyId: string): Promise<StoryLoadResult> => {
    console.log('[preload] loadStory called:', projectPath, storyId);
    return ipcRenderer.invoke('story:load', { projectPath, storyId });
  },

  // Layout operations
  loadLayout: (projectPath: string, storyId: string): Promise<LayoutLoadResult> => {
    return ipcRenderer.invoke('layout:load', { projectPath, storyId });
  },

  saveLayout: (projectPath: string, storyId: string, layout: unknown): Promise<LayoutSaveResult> => {
    return ipcRenderer.invoke('layout:save', { projectPath, storyId, layout });
  },
};

contextBridge.exposeInMainWorld('mapEditorApi', api);

// Type declaration for renderer
declare global {
  interface Window {
    mapEditorApi: typeof api;
  }
}
