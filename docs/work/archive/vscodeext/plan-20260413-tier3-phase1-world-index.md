# VS Code Extension — Tier 3, Phase 1: World Index WebviewPanel

**Created**: 2026-04-13
**Overall scope**: Replace the tree-based World Explorer with a WebviewPanel that renders an HTML World Index page — rooms grouped by region, with exit analysis and contained entity listings. This is the first of 6 planned reference panels.
**Bounded contexts touched**: N/A — VS Code extension tooling only
**Key domain language**: N/A

---

## Background

The current World Explorer is a `TreeDataProvider` registered as a sidebar view (`sharpee.worldExplorer`). It works for small stories but does not scale to large ones like Dungeo (191 rooms). The Tier 3 plan (plan-20260414-tier3-reference-panels.md) calls for replacing the tree with webview-based HTML reference panels, modeled on the Inform IDE's Index pages.

Phase 1 replaces the tree with the **World Index** panel. Later phases add Entity Index, Actions Index, Traits Index, Behaviors Index, and Language Index.

---

## Phases

### Phase 1: Replace tree view with World Index WebviewPanel
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A — VS Code extension tooling
- **Entry state**:
  - `tools/vscode-ext/src/world-explorer.ts` has the `WorldExplorerProvider` tree implementation
  - `tools/vscode-ext/src/extension.ts` registers it as `sharpee.worldExplorer` sidebar view
  - `tools/vscode-ext/package.json` declares the `viewsContainers` / `views` / `commands` for the tree
  - `--world-json` CLI output includes `rooms`, `regions`, `entities`, `npcs`, `scenes`
  - Data shapes (`WorldRoom`, `WorldRegion`, `WorldEntity`) are fully typed in world-explorer.ts
- **Deliverable**:
  - `tools/vscode-ext/src/world-explorer.ts` — rewritten as a `WorldIndexPanel` class (WebviewPanel, not TreeDataProvider). Retains the CLI fetch logic and data types. Builds a self-contained HTML string.
  - `tools/vscode-ext/src/extension.ts` — updated registration: tree view registration replaced with command that opens/reveals the webview panel; `SharpeeCompletionProvider` continues to receive world data.
  - `tools/vscode-ext/package.json` — `views` entry removed (no more sidebar tree); Activity Bar icon and `sharpee.refreshWorldExplorer` command retained.
  - HTML World Index page featuring:
    - Rooms grouped by region (flat list if no regions)
    - Per-room: name, ID, dark indicator, exits list with direction and destination name, entities contained in that room
    - Dead-end highlight (rooms with exactly 1 exit)
    - One-way exit highlight (exits where the destination has no return exit back)
    - Click-to-navigate (room name links trigger `workbench.action.quickOpen` with the room name)
    - VS Code theme integration via `--vscode-editor-background`, `--vscode-foreground`, `--vscode-list-hoverBackground`, and related CSS variables
    - All CSS and JS inline in the HTML string (no external resources, satisfies VS Code webview CSP)
    - Empty/error state: friendly message when no world data is available
- **Exit state**:
  - Clicking the Sharpee Activity Bar icon and then the "Refresh World Explorer" button (or running `sharpee.refreshWorldExplorer`) opens/updates the webview panel
  - The panel renders a readable World Index using VS Code theme colors
  - Entity autocomplete (`SharpeeCompletionProvider`) still works — it receives `WorldData` from the same fetch
  - Extension builds cleanly with `pnpm build` in `tools/vscode-ext/`
  - No tree view registration remains in extension.ts or package.json
- **Status**: CURRENT

---

## Implementation Notes

### What changes

| File | Change |
|------|--------|
| `src/world-explorer.ts` | Replace `WorldExplorerProvider extends TreeDataProvider` with `WorldIndexPanel` class. Keep `WorldData` types, `REFRESH_WORLD_COMMAND`, `runCli`, `fetchWorldData`. Add `buildHtml(data)` method. |
| `src/extension.ts` | Remove `createTreeView`. Register `REFRESH_WORLD_COMMAND` to call `WorldIndexPanel.open()`. Pass `getWorldData()` to `SharpeeCompletionProvider` as before. |
| `package.json` | Remove the `views` entry under `sharpee-explorer`. Keep `viewsContainers` (Activity Bar icon), `commands` (`sharpee.refreshWorldExplorer`), and `menus` entry. |

### What does NOT change

- `SharpeeCompletionProvider` — it reads `worldExplorer.getWorldData()`. The new `WorldIndexPanel` must expose the same `getWorldData(): WorldData | null` method.
- `onBuildDone` callback — it calls `worldExplorer.refresh()`. The new class must expose a `refresh(): Promise<void>` method.
- CLI fetch logic — `runCli`, `fetchWorldData`, JSON trimming logic — move as-is into the new class.
- `WorldData`, `WorldRoom`, `WorldRegion`, `WorldEntity`, `WorldNpc`, `WorldScene` type interfaces — move as-is, remain exported.
- `REFRESH_WORLD_COMMAND` export — keep the same string constant.

### WebviewPanel lifecycle

VS Code WebviewPanels are not sidebar-resident — they open as editor tabs. The standard pattern for "singleton panel" is:

```typescript
static currentPanel: WorldIndexPanel | undefined;

static open(context: vscode.ExtensionContext): WorldIndexPanel {
  if (WorldIndexPanel.currentPanel) {
    WorldIndexPanel.currentPanel._panel.reveal();
    return WorldIndexPanel.currentPanel;
  }
  const panel = vscode.window.createWebviewPanel(
    'sharpee.worldIndex',
    'Sharpee: World Index',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true },
  );
  WorldIndexPanel.currentPanel = new WorldIndexPanel(panel, context);
  return WorldIndexPanel.currentPanel;
}
```

On dispose, set `WorldIndexPanel.currentPanel = undefined`.

### HTML structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    /* Use VS Code CSS variables */
    body { background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    .region { margin-bottom: 2em; }
    .room { ... }
    .dead-end { border-left: 3px solid var(--vscode-editorWarning-foreground); }
    .one-way-exit { color: var(--vscode-editorWarning-foreground); }
    .dark-room::after { content: " 🌑"; }  /* or use text label */
  </style>
</head>
<body>
  <!-- Rooms grouped by region -->
  <!-- Each room: name (clickable), ID, dark indicator, exits, entities -->
</body>
<script>
  // postMessage to extension for click-to-navigate
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('[data-room-name]').forEach(el => {
    el.addEventListener('click', () => {
      vscode.postMessage({ type: 'navigate', roomName: el.dataset.roomName });
    });
  });
</script>
</html>
```

Click-to-navigate requires message passing (webview → extension). The extension listens on `panel.webview.onDidReceiveMessage` and calls `vscode.commands.executeCommand('workbench.action.quickOpen', roomName)`.

### Dead-end and one-way exit detection

Both are computed during `buildHtml`:

```
Dead end: room.exits has exactly 1 entry
One-way exit: exit destination's exits do not include a direction pointing back to the source room
```

One-way detection requires a room-by-id lookup. Build `Map<string, WorldRoom>` from rooms array before rendering.

### Activity Bar icon with no tree view

When the `views` entry is removed from `package.json`, clicking the Activity Bar icon will do nothing useful unless there is at least one view registered, OR the icon triggers a command. The cleanest approach: keep a minimal placeholder view entry with `"type": "webview"` pointing to the panel, or simply remove the tree view but keep the Activity Bar command visible in the Command Palette. The refresh command (`sharpee.refreshWorldExplorer`) will open the panel when invoked.

If VS Code requires at least one view in the container to show the Activity Bar icon, a stub empty view can be registered. Confirm behavior during implementation.
