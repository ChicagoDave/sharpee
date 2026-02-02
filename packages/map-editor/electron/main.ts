import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.argv.includes('--dev');

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Sharpee Map Editor',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Sharpee Project',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const projectPath = result.filePaths[0];

  // Verify this is a Sharpee project
  const bundlePath = path.join(projectPath, 'dist', 'cli', 'sharpee.js');
  const storiesPath = path.join(projectPath, 'stories');

  if (!fs.existsSync(bundlePath)) {
    return { error: 'No dist/cli/sharpee.js found. Please build the project first.' };
  }

  if (!fs.existsSync(storiesPath)) {
    return { error: 'No stories/ folder found. Is this a Sharpee project?' };
  }

  // Find available stories
  const stories: string[] = [];
  const entries = fs.readdirSync(storiesPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Check if it has a src folder (valid story)
      const srcPath = path.join(storiesPath, entry.name, 'src');
      if (fs.existsSync(srcPath)) {
        stories.push(entry.name);
      }
    }
  }

  if (stories.length === 0) {
    return { error: 'No stories found in stories/ folder.' };
  }

  return {
    path: projectPath,
    stories,
  };
});

ipcMain.handle('story:load', async (_event, { projectPath, storyId }: { projectPath: string; storyId: string }) => {
  console.log('[story:load] Starting...', { projectPath, storyId });

  try {
    const bundlePath = path.join(projectPath, 'dist', 'cli', 'sharpee.js');
    console.log('[story:load] Bundle path:', bundlePath);

    // Check if bundle exists
    if (!fs.existsSync(bundlePath)) {
      console.log('[story:load] Bundle not found!');
      return { error: `Bundle not found at ${bundlePath}` };
    }

    // Clear require cache to get fresh bundle
    delete require.cache[require.resolve(bundlePath)];

    // Load the bundle
    console.log('[story:load] Loading bundle...');
    const bundle = require(bundlePath);
    console.log('[story:load] Bundle loaded, exports:', Object.keys(bundle).slice(0, 10));

    // Check if createEditorSession exists
    if (typeof bundle.createEditorSession !== 'function') {
      console.log('[story:load] createEditorSession not found!');
      return {
        error: 'Bundle does not export createEditorSession. Rebuild platform with: ./build.sh -s dungeo',
      };
    }

    // Initialize world for editing
    console.log('[story:load] Calling createEditorSession with projectPath:', projectPath);
    const { world } = bundle.createEditorSession(storyId, projectPath);
    console.log('[story:load] World created');

    // Extract rooms - use getAllEntities and filter by trait
    const rooms: Array<{
      id: string;
      name: string;
      description?: string;
      exits: Array<{
        direction: string;
        destinationId: string;
        mapHint?: { dx?: number; dy?: number; dz?: number };
      }>;
    }> = [];

    // Get all entities and filter for rooms
    console.log('[story:load] Getting all entities...');
    const allEntities = world.getAllEntities();
    console.log('[story:load] Found', allEntities.length, 'total entities');

    for (const entity of allEntities) {
      // Check if entity has room trait
      if (!entity.hasTrait || !entity.hasTrait('room')) {
        continue;
      }

      const roomTrait = entity.getTrait('room');
      if (!roomTrait) continue;

      const exits: Array<{
        direction: string;
        destinationId: string;
        mapHint?: { dx?: number; dy?: number; dz?: number };
      }> = [];

      const exitsData = roomTrait.exits || {};
      for (const [direction, exitInfo] of Object.entries(exitsData)) {
        const exit = exitInfo as { destination: string; mapHint?: { dx?: number; dy?: number; dz?: number } };
        exits.push({
          direction,
          destinationId: exit.destination,
          mapHint: exit.mapHint,
        });
      }

      // Get description from IdentityTrait if available
      const identityTrait = entity.getTrait ? entity.getTrait('identity') : null;
      const description = identityTrait?.description || '';

      rooms.push({
        id: entity.id,
        name: entity.name || entity.id,
        description,
        exits,
      });
    }

    console.log('[story:load] Found', rooms.length, 'rooms');
    return { storyId, rooms };
  } catch (err) {
    const error = err as Error;
    return { error: `Failed to load story: ${error.message}` };
  }
});

ipcMain.handle('layout:load', async (_event, { projectPath, storyId }: { projectPath: string; storyId: string }) => {
  const layoutPath = path.join(projectPath, 'stories', storyId, 'src', 'map-layout.editor.json');

  if (!fs.existsSync(layoutPath)) {
    return { exists: false };
  }

  try {
    const content = fs.readFileSync(layoutPath, 'utf-8');
    const layout = JSON.parse(content);
    return { exists: true, layout };
  } catch (err) {
    const error = err as Error;
    return { error: `Failed to parse layout: ${error.message}` };
  }
});

ipcMain.handle('layout:save', async (_event, { projectPath, storyId, layout }: {
  projectPath: string;
  storyId: string;
  layout: unknown;
}) => {
  const storyPath = path.join(projectPath, 'stories', storyId, 'src');
  const jsonPath = path.join(storyPath, 'map-layout.editor.json');
  const tsPath = path.join(storyPath, 'map-layout.ts');

  try {
    // Save JSON (editor working file)
    fs.writeFileSync(jsonPath, JSON.stringify(layout, null, 2));

    // Generate TypeScript
    const tsContent = generateTypeScript(layout as LayoutData);
    fs.writeFileSync(tsPath, tsContent);

    return { success: true, jsonPath, tsPath };
  } catch (err) {
    const error = err as Error;
    return { error: `Failed to save layout: ${error.message}` };
  }
});

interface RegionData {
  id: string;
  name: string;
  anchor?: string;
  rooms: Array<{ roomId: string; x: number; y: number; z: number }>;
}

interface LayoutData {
  version: number;
  storyId: string;
  regions: RegionData[];
}

function generateTypeScript(layout: LayoutData): string {
  const lines: string[] = [
    '// Generated by Sharpee Map Editor',
    '// Do not edit manually - changes will be overwritten',
    '// Source: map-layout.editor.json',
    '',
    "import type { RegionMapConfig } from '@sharpee/world-model';",
    '',
  ];

  for (const region of layout.regions) {
    const varName = region.id.replace(/-/g, '_') + 'Region';

    lines.push(`export const ${varName}: RegionMapConfig = {`);
    lines.push(`  id: '${region.id}',`);
    lines.push(`  name: '${region.name}',`);
    if (region.anchor) {
      lines.push(`  anchor: '${region.anchor}',`);
    }
    lines.push('  layout: {');

    for (const room of region.rooms) {
      const zPart = room.z !== 0 ? `, z: ${room.z}` : '';
      lines.push(`    '${room.roomId}': { x: ${room.x}, y: ${room.y}${zPart} },`);
    }

    lines.push('  },');
    lines.push('};');
    lines.push('');
  }

  // Export array of all regions
  const regionVars = layout.regions.map(r => r.id.replace(/-/g, '_') + 'Region');
  lines.push('export const mapRegions: RegionMapConfig[] = [');
  for (const varName of regionVars) {
    lines.push(`  ${varName},`);
  }
  lines.push('];');
  lines.push('');

  return lines.join('\n');
}
