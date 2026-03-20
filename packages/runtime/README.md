# @sharpee/runtime

Headless Sharpee engine for embedding interactive fiction in any web page. The runtime runs inside an iframe and communicates with your page via `postMessage` — you control the UI, it runs the game.

> **Status: Draft — Incomplete and Untested**
>
> This README was written alongside the initial implementation and has not been validated against real integration. The Lantern IDE work revealed gaps in the protocol, story loading, and output handling documented here. Treat code examples as illustrative, not copy-paste ready. The protocol reference may be out of date.

## Quick Start

### 1. Build the runtime

```bash
./build.sh --runtime
```

This produces `dist/runtime/sharpee-runtime.js` (~745K minified).

### 2. Host the files

Copy these to your web server:

```
your-site/
  sharpee/
    sharpee-runtime.js
    runtime-frame.html
```

`runtime-frame.html` is a minimal page that loads the runtime bundle:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <script src="./sharpee-runtime.js"></script>
</body>
</html>
```

### 3. Add the iframe to your page

```html
<iframe id="sharpee-runtime" src="/sharpee/runtime-frame.html"
        style="display:none" sandbox="allow-scripts"></iframe>
```

The iframe is invisible — it's a headless engine, not a UI.

### 4. Write the integration code

```javascript
const frame = document.getElementById('sharpee-runtime');

// Listen for messages from the runtime
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type || !msg.type.startsWith('sharpee:')) return;

  switch (msg.type) {
    case 'sharpee:ready':
      console.log('Runtime ready, version:', msg.version);
      loadStory();
      break;

    case 'sharpee:story-loaded':
      console.log('Story loaded:', msg.title);
      frame.contentWindow.postMessage({ type: 'sharpee:start' }, '*');
      break;

    case 'sharpee:output':
      // msg.blocks is an array of structured text blocks
      renderOutput(msg.blocks);
      break;

    case 'sharpee:status':
      updateStatusBar(msg.location, msg.score, msg.turns);
      break;

    case 'sharpee:error':
      console.error(`[${msg.category}]`, msg.message);
      break;
  }
});

// Send a player command
function sendCommand(text) {
  frame.contentWindow.postMessage({ type: 'sharpee:command', text }, '*');
}
```

## Writing Story Code for the Runtime

Story code runs inside the iframe where `window.Sharpee` exposes the full engine API. The code must set `window.SharpeeStory` to a Story object.

### Minimal story

```javascript
const { WorldModel, EntityType, IdentityTrait, RoomTrait, ActorTrait } = window.Sharpee;

window.SharpeeStory = {
  config: {
    id: 'my-story',
    title: 'My First Story',
    author: 'Your Name',
    version: '1.0.0',
  },

  createPlayer(world) {
    const player = world.createEntity('player', 'actor');
    player.add(new IdentityTrait({ name: 'yourself' }));
    player.add(new ActorTrait());
    return player;
  },

  initializeWorld(world) {
    // Create a room
    const room = world.createEntity('start', 'room');
    room.add(new IdentityTrait({
      name: 'Living Room',
      description: 'A cozy room with a fireplace. A door leads north.',
    }));
    room.add(new RoomTrait());

    // Create an object
    const key = world.createEntity('brass-key', 'object');
    key.add(new IdentityTrait({
      name: 'brass key',
      description: 'A small brass key with an ornate handle.',
    }));
    world.moveEntity(key.id, room.id);

    // Place player
    const player = world.getPlayer();
    world.moveEntity(player.id, room.id);
  },
};
```

### Compiling an existing Sharpee story for the runtime

If you have a Sharpee story project (like those in `stories/`), you can bundle it for the runtime using esbuild:

```bash
# Bundle the story as a self-contained JS file that sets window.SharpeeStory
npx esbuild stories/my-story/src/index.ts \
  --bundle --platform=browser --format=iife \
  --global-name=__story \
  --outfile=dist/my-story-runtime.js \
  --footer:js="window.SharpeeStory = __story.story || __story.default;" \
  --external:@sharpee/*
```

Key points:
- `--external:@sharpee/*` excludes engine code (the runtime already has it)
- The `--footer` line wires the story's default export to `window.SharpeeStory`
- The output is a small JS file containing only your story's rooms, objects, and logic

Then load it:

```javascript
function loadStory() {
  // Fetch the compiled story
  fetch('/stories/my-story-runtime.js')
    .then(r => r.text())
    .then(code => {
      frame.contentWindow.postMessage({
        type: 'sharpee:load-story',
        code: code,
      }, '*');
    });
}
```

### Inline story code

For simple stories or dynamically generated content, send the code directly:

```javascript
frame.contentWindow.postMessage({
  type: 'sharpee:load-story',
  code: `
    const { IdentityTrait, RoomTrait, ActorTrait } = window.Sharpee;
    window.SharpeeStory = {
      config: { id: 'inline', title: 'Inline Story', author: 'Me', version: '1.0.0' },
      createPlayer(world) { /* ... */ },
      initializeWorld(world) { /* ... */ },
    };
  `,
}, '*');
```

## Rendering Output

The runtime sends structured text blocks, not plain strings. Each block has a `key` (channel) and `content` (array of strings and decorations).

### Block keys

| Key | What it contains |
|-----|-----------------|
| `room.name` | Current room title |
| `room.description` | Room description text |
| `room.contents` | Items visible in the room |
| `action.result` | Result of the player's action |
| `action.blocked` | Why an action failed |
| `game.banner` | Opening game banner |
| `game.message` | Story-generated messages |
| `status.room` | Current location (status bar) |
| `status.score` | Score (status bar) |
| `status.turns` | Turn count (status bar) |
| `error` | System errors |

### Content structure

Content is an array of strings and decoration objects:

```javascript
// Plain text
{ key: 'action.result', content: ['You take the brass key.'] }

// Decorated content
{
  key: 'room.description',
  content: [
    'A cozy room with a ',
    { type: 'item', content: ['brass lantern'] },
    ' on the table.'
  ]
}
```

Decoration types: `em` (italic), `strong` (bold), `item`, `room`, `npc`, `command`, `direction`.

### Rendering example

```javascript
function renderOutput(blocks) {
  for (const block of blocks) {
    // Skip status blocks — use sharpee:status message instead
    if (block.key.startsWith('status.')) continue;

    const text = renderContent(block.content);
    const div = document.createElement('div');
    div.className = 'sharpee-' + block.key.replace('.', '-');
    div.innerHTML = text;
    outputEl.appendChild(div);
  }
  outputEl.scrollTop = outputEl.scrollHeight;
}

function renderContent(content) {
  return content.map(item => {
    if (typeof item === 'string') return escapeHtml(item);
    // Decoration — wrap in a span
    const inner = renderContent(item.content);
    return `<span class="sharpee-${item.type}">${inner}</span>`;
  }).join('');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

## PostMessage Protocol Reference

All messages are prefixed with `sharpee:` to avoid collisions with other postMessage traffic.

### Your Page → Runtime

| Message | Fields | Description |
|---------|--------|-------------|
| `sharpee:load-story` | `code: string` | Eval story JS code |
| `sharpee:start` | — | Start the engine (after load-story) |
| `sharpee:command` | `text: string` | Send a player command |
| `sharpee:restart` | — | Restart from scratch |
| `sharpee:save` | — | Request save data |
| `sharpee:restore` | `data: string` | Restore from save data |

### Runtime → Your Page

| Message | Fields | Description |
|---------|--------|-------------|
| `sharpee:ready` | `version: string` | Runtime loaded and listening |
| `sharpee:story-loaded` | `title, author` | Story code accepted |
| `sharpee:started` | — | Engine running |
| `sharpee:output` | `blocks: ITextBlock[]` | Text output from a turn |
| `sharpee:status` | `location, score?, turns?` | Status bar update |
| `sharpee:save-data` | `data: string` | Serialized save (opaque) |
| `sharpee:restored` | — | Restore succeeded |
| `sharpee:error` | `category, message, stack?` | Something went wrong |

### Lifecycle sequence

```
  Your Page                          Runtime (iframe)
  ─────────                          ─────────────────
                                     ← sharpee:ready
  sharpee:load-story {code} →
                                     ← sharpee:story-loaded
  sharpee:start →
                                     ← sharpee:started
                                     ← sharpee:output (opening turn)
                                     ← sharpee:status
  sharpee:command {text} →
                                     ← sharpee:output
                                     ← sharpee:status
  ...
```

## Save / Restore

Save data is an opaque JSON string. Store it however you want (localStorage, server, IndexedDB) and send it back to restore:

```javascript
let savedGame = null;

window.addEventListener('message', (event) => {
  if (event.data.type === 'sharpee:save-data') {
    savedGame = event.data.data;
    localStorage.setItem('my-game-save', savedGame);
  }
});

// Save
frame.contentWindow.postMessage({ type: 'sharpee:save' }, '*');

// Restore
const save = localStorage.getItem('my-game-save');
if (save) {
  frame.contentWindow.postMessage({ type: 'sharpee:restore', data: save }, '*');
}
```

## Available API on window.Sharpee

Story code running inside the runtime has access to the full Sharpee engine API via `window.Sharpee`. Key exports:

**Engine**: `GameEngine`, `Story`, `StoryConfig`, `StoryWithEvents`

**World Model**: `WorldModel`, `IFEntity`, `EntityType`, `AuthorModel`

**Traits**: `IdentityTrait`, `RoomTrait`, `ContainerTrait`, `OpenableTrait`, `LockableTrait`, `ReadableTrait`, `LightSourceTrait`, `ExitTrait`, `SceneryTrait`, `SupporterTrait`, `SwitchableTrait`, `WearableTrait`, `EdibleTrait`, `DoorTrait`, `ActorTrait`, `VehicleTrait`, `ButtonTrait`, `PullableTrait`, `PushableTrait`, `NpcTrait`, `ClimbableTrait`, `AttachedTrait`, `MoveableSceneryTrait`, `ClothingTrait`

**Capabilities**: `registerCapabilityBehavior`, `CapabilityBehavior`, `findTraitWithCapability`

**Plugins**: `NpcPlugin`, `SchedulerPlugin`, `StateMachinePlugin`, `PluginRegistry`

For the full API reference, see `packages/sharpee/docs/genai-api/`.

## Test Harness

The build includes a test harness at `dist/runtime/test-harness.html`. Open it in a browser (via a local server) to interactively test the postMessage bridge with a built-in minimal story.

```bash
./build.sh --runtime
npx serve dist/runtime
# Open http://localhost:3000/test-harness.html
```
