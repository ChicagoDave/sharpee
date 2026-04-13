/**
 * World Index reference panel for Sharpee stories.
 *
 * Builds a styled HTML page showing all rooms with their exits,
 * contained entities, and NPCs. Rooms are sorted alphabetically
 * (region grouping deferred until region metadata is available).
 * Entity traits are visually tagged as platform or story-defined.
 *
 * Public interface: buildWorldIndexHtml()
 * Owner: tools/vscode-ext
 */

import { PanelData, TaggedRoom, TaggedEntity, TaggedNpc, TaggedTrait } from './panel-data-loader';

/** Panel ID used by the panel manager. */
export const WORLD_INDEX_PANEL_ID = 'sharpee.worldIndex';

/**
 * Builds the full HTML document for the World Index panel.
 *
 * @param data - Tagged world data from PanelDataLoader
 * @returns Complete HTML string for the webview
 */
export function buildWorldIndexHtml(data: PanelData): string {
  const sortedRooms = [...data.rooms].sort((a, b) => a.name.localeCompare(b.name));

  const roomCards = sortedRooms.map(room => renderRoomCard(room, data)).join('\n');

  const stats = buildStats(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Index — ${escHtml(data.storyId)}</title>
  <style>${CSS}</style>
</head>
<body>
  <header class="panel-header">
    <h1>World Index</h1>
    <p class="subtitle">${escHtml(data.storyId)} &mdash; ${data.rooms.length} rooms, ${data.entities.length} entities, ${data.npcs.length} NPCs</p>
    <div class="legend">
      <span class="badge platform">platform trait</span>
      <span class="badge story">story trait</span>
      <span class="dark-indicator">&#9790; dark room</span>
    </div>
  </header>

  <section class="stats-bar">
    ${stats}
  </section>

  <section class="search-bar">
    <input type="text" id="search" placeholder="Filter rooms..." autocomplete="off" />
  </section>

  <main class="room-grid">
    ${roomCards}
  </main>

  <script>${JS}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Room card rendering
// ---------------------------------------------------------------------------

/**
 * Renders a single room card with exits, contents, and NPCs.
 */
function renderRoomCard(room: TaggedRoom, data: PanelData): string {
  const darkClass = room.isDark ? ' dark' : '';
  const darkIcon = room.isDark ? '<span class="dark-indicator" title="Dark room">&#9790;</span>' : '';

  const exits = renderExits(room);
  const contents = renderContents(room.contents);
  const npcs = renderNpcs(room.npcs);

  const contentCount = room.contents.length + room.npcs.length;
  const contentBadge = contentCount > 0 ? `<span class="count-badge">${contentCount}</span>` : '';

  return `<article class="room-card${darkClass}" data-name="${escAttr(room.name.toLowerCase())}">
  <div class="room-header">
    <h2>${escHtml(room.name)} ${darkIcon} ${contentBadge}</h2>
    <code class="room-id">${escHtml(room.id)}</code>
  </div>
  ${exits}
  ${contents}
  ${npcs}
</article>`;
}

/**
 * Renders the exit list for a room.
 */
function renderExits(room: TaggedRoom): string {
  const exitEntries = Object.entries(room.exits);
  if (exitEntries.length === 0) {
    return '<div class="exits"><span class="muted">No exits</span></div>';
  }

  const items = exitEntries
    .map(([dir, dest]) => `<span class="exit"><span class="exit-dir">${escHtml(dir)}</span> &rarr; ${escHtml(dest.name)}</span>`)
    .join('');

  return `<div class="exits">${items}</div>`;
}

/**
 * Renders the entity contents list for a room.
 */
function renderContents(entities: TaggedEntity[]): string {
  if (entities.length === 0) return '';

  const items = entities
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => {
      const traits = renderTraitBadges(e.traits);
      return `<li><span class="entity-name">${escHtml(e.name)}</span> <code>${escHtml(e.id)}</code>${traits}</li>`;
    })
    .join('');

  return `<div class="contents">
  <h3>Contents</h3>
  <ul>${items}</ul>
</div>`;
}

/**
 * Renders the NPC list for a room.
 */
function renderNpcs(npcs: TaggedNpc[]): string {
  if (npcs.length === 0) return '';

  const items = npcs
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(n => {
      const traits = renderTraitBadges(n.traits);
      const behavior = n.behaviorId ? ` <span class="behavior-tag">${escHtml(n.behaviorId)}</span>` : '';
      return `<li><span class="npc-name">${escHtml(n.name)}</span> <code>${escHtml(n.id)}</code>${behavior}${traits}</li>`;
    })
    .join('');

  return `<div class="npcs">
  <h3>NPCs</h3>
  <ul>${items}</ul>
</div>`;
}

/**
 * Renders trait badges with platform/story visual distinction.
 */
function renderTraitBadges(traits: TaggedTrait[]): string {
  if (traits.length === 0) return '';

  // Skip identity and room — they're noise in a room listing
  const visible = traits.filter(t => t.type !== 'identity' && t.type !== 'room' && t.type !== 'actor');
  if (visible.length === 0) return '';

  const badges = visible
    .map(t => `<span class="badge ${t.origin}">${escHtml(t.type)}</span>`)
    .join('');

  return `<span class="trait-badges">${badges}</span>`;
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

/**
 * Builds the stats summary bar.
 */
function buildStats(data: PanelData): string {
  const darkRooms = data.rooms.filter(r => r.isDark).length;
  const deadEnds = data.rooms.filter(r => Object.keys(r.exits).length <= 1).length;
  const emptyRooms = data.rooms.filter(r => r.contents.length === 0 && r.npcs.length === 0).length;
  const storyTraitEntities = data.entities.filter(e => e.hasCustomTraits).length;

  return `<span class="stat"><strong>${darkRooms}</strong> dark rooms</span>
<span class="stat"><strong>${deadEnds}</strong> dead ends</span>
<span class="stat"><strong>${emptyRooms}</strong> empty rooms</span>
<span class="stat"><strong>${storyTraitEntities}</strong> entities with custom traits</span>`;
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Embedded CSS
// ---------------------------------------------------------------------------

const CSS = `
:root {
  --bg: var(--vscode-editor-background);
  --fg: var(--vscode-editor-foreground);
  --card-bg: var(--vscode-editorWidget-background, #1e1e1e);
  --card-border: var(--vscode-editorWidget-border, #333);
  --accent: var(--vscode-textLink-foreground, #4fc1ff);
  --muted: var(--vscode-descriptionForeground, #888);
  --badge-platform-bg: var(--vscode-badge-background, #333);
  --badge-platform-fg: var(--vscode-badge-foreground, #ccc);
  --badge-story-bg: #2d5a27;
  --badge-story-fg: #a8e6a3;
  --dark-room-bg: #2a1f1f;
  --dark-room-border: #5a3030;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--vscode-font-family, system-ui, sans-serif);
  font-size: var(--vscode-font-size, 13px);
  color: var(--fg);
  background: var(--bg);
  padding: 16px;
  line-height: 1.5;
}

.panel-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
}

.panel-header h1 {
  font-size: 1.4em;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle { color: var(--muted); }

.legend {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 0.85em;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  font-size: 0.9em;
}

.stat strong { color: var(--accent); }

.search-bar {
  margin-bottom: 16px;
}

.search-bar input {
  width: 100%;
  max-width: 400px;
  padding: 6px 10px;
  background: var(--card-bg);
  color: var(--fg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  font-size: 0.95em;
  outline: none;
}

.search-bar input:focus {
  border-color: var(--accent);
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

.room-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 12px;
}

.room-card.dark {
  background: var(--dark-room-bg);
  border-color: var(--dark-room-border);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.room-header h2 {
  font-size: 1em;
  font-weight: 600;
}

.room-id {
  font-size: 0.8em;
  color: var(--muted);
}

.dark-indicator {
  color: #c89b3c;
  font-size: 0.9em;
}

.count-badge {
  display: inline-block;
  background: var(--accent);
  color: #000;
  font-size: 0.7em;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  vertical-align: middle;
  margin-left: 4px;
}

.exits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.exit {
  font-size: 0.85em;
  color: var(--muted);
}

.exit-dir {
  color: var(--accent);
  font-weight: 600;
  text-transform: lowercase;
}

.contents, .npcs { margin-top: 8px; }

.contents h3, .npcs h3 {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin-bottom: 4px;
}

.contents ul, .npcs ul {
  list-style: none;
  padding: 0;
}

.contents li, .npcs li {
  font-size: 0.9em;
  padding: 2px 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.entity-name { font-weight: 500; }
.npc-name { font-weight: 600; color: var(--accent); }

.contents code, .npcs code {
  font-size: 0.8em;
  color: var(--muted);
}

.behavior-tag {
  font-size: 0.75em;
  color: #c586c0;
  font-style: italic;
}

.trait-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-left: 4px;
}

.badge {
  display: inline-block;
  font-size: 0.7em;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
}

.badge.platform {
  background: var(--badge-platform-bg);
  color: var(--badge-platform-fg);
}

.badge.story {
  background: var(--badge-story-bg);
  color: var(--badge-story-fg);
}

.muted { color: var(--muted); font-style: italic; }

.hidden { display: none !important; }
`;

// ---------------------------------------------------------------------------
// Embedded JS (runs inside the webview)
// ---------------------------------------------------------------------------

const JS = `
(function() {
  const input = document.getElementById('search');
  const cards = document.querySelectorAll('.room-card');

  input.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    cards.forEach(function(card) {
      if (!query || card.getAttribute('data-name').includes(query)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
})();
`;
