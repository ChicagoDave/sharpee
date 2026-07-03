# The Web Client: A Framework-Free UI

The last chapter ended with a promise: a channel emits *data*, and something on the
other side decides how it looks. That something is the **client**. This chapter
walks through Sharpee's reference browser client, including: how it connects to the engine,
turns turn packets into a living page, and why it's built from plain HTML and CSS
instead of a framework.

## What the client is responsible for

The engine produces signals; it knows nothing about screens. The browser client,
`@sharpee/platform-browser`, is the piece that owns the page: it holds the DOM, runs
the input box, draws the menus and save dialogs, and, most importantly, receives
each turn packet and paints it. Everything visible is the client's job. The engine
never reaches for an element; it only emits channels.

The orchestrator is `BrowserClient`. A story's browser entry point creates one,
hands it the page's elements, connects the engine, and starts:

```typescript
import { STORY_VERSION, ENGINE_VERSION, BUILD_DATE } from './version.js';

const client = new BrowserClient({
  storagePrefix: 'familyzoo-',
  defaultTheme: 'zoo-sunny',            // the theme applied on first load / restore
  // The clickable theme menu is generated at build time from your package.json
  // `sharpee.themes` (Chapter 26); this array is metadata the generator fills in.
  themes: [
    { id: 'zoo-sunny', name: 'Zoo Sunny' },
    { id: 'modern-dark', name: 'Modern Dark' },
    { id: 'paper', name: 'Paper' },
  ],
  storyInfo: {
    title: 'Family Zoo',
    authors: 'You',
    version: STORY_VERSION,        // all three stamped into './version.js'
    engineVersion: ENGINE_VERSION, // by `sharpee build`
    buildDate: BUILD_DATE,
  },
});

client.initialize(elements);          // page elements (after DOMContentLoaded)
client.connectEngine(engine, world);  // wire the engine
await client.start();                 // boot, restore autosave, first look
```

You rarely write this by hand. `sharpee init-browser` scaffolds the entry point
once, and `sharpee build --browser` regenerates the host page around it on each
build; the build stops with an error if `src/browser-entry.ts` is missing. But
knowing the three calls demystifies what the bundle is doing: `initialize` learns
the DOM, `connectEngine` subscribes to the engine, and `start` runs the opening
turn.

## How a turn reaches the screen

Inside `connectEngine`, the client builds a **renderer** (the consumer-side host
from the previous chapter) and subscribes to exactly two engine signals:

```typescript
engine.on('channel:manifest', (cmgt) => renderer.applyCmgt(cmgt));
engine.on('channel:packet',  (packet) => renderer.applyTurnPacket(packet));
```

That's the whole rendering path. At startup the engine emits one **manifest** (the
capability-filtered list of channels this client gets); thereafter it emits one
**packet per turn**. The renderer dispatches each channel in the packet to the
`ChannelRenderer` registered for it: the `main` channel's renderer appends prose,
the `location` renderer rewrites the status line, the `score` renderer updates the
score. There is no second path. Prose and status and media all arrive the same way.

The client registers a full set of platform-default renderers in one call,
`registerDefaultBrowserRenderers`, which covers `main`, `prompt`, `location`,
`score`, `turn`, the notification channels, and the static media channels. The
`ambient:*` renderers are not among them; the story registers those itself, as the
Media chapter shows. Those defaults are what give you a working page with zero
rendering code.

## Commands flow back the same way

Rendering is only half a loop; the player has to type. The input box feeds commands
to `engine.executeTurn(command)`, and the engine runs a turn, which produces the
next packet, which the renderer paints. UI *gestures* close the same loop: when a
clickable hotspot or a menu item fires, it synthesizes the equivalent typed command
and runs it through `executeTurn`, so a click and a typed verb are indistinguishable
to the engine. The menu's **Help** and **About** entries, for instance, are wired
straight to `engine.executeTurn('help')` and `engine.executeTurn('about')`.

## Why no framework

Open the reference client and you will not find React, Vue, or a web-component
library. The UI is plain HTML elements styled by CSS classes. Dialogs are native
`<dialog>` elements opened with `showModal()`; the menu bar is a `<nav>` with
`.sharpee-menu-bar-item` rows; the prose window is a scrolling `<div>`. State that
*would* be component props lives instead in `--modifier` classes and standard ARIA
attributes: an open menu carries `--open` and `aria-expanded`, a checked theme
carries `--checked`.

The framework-free build is deliberate: a framework would put a runtime
between the author and the page and impose its own idioms for overriding a view.
Sharpee's bet is the opposite: the page is just HTML and CSS, so an author restyles
it with CSS and replaces a renderer with a function. There is no framework API to learn.

## Overriding a renderer

Because each channel maps to one registered renderer, customizing the UI is
*re-registering*. After the platform defaults are in place, available from
`connectEngine` onward, a story grabs the renderer and registers its own. There are
two cases, and they differ in one way: whether the channel already has a place on the
page.

**Replacing an existing channel's renderer.** A standard channel like `score`
already renders into a platform element, the status line. To change *how* it looks,
re-register against the same id and write into that same element. Registration is
last-write-wins, so your renderer simply replaces the platform's for that channel,
without touching any other:

```typescript
const renderer = client.getChannelRenderer();
renderer.registerRenderer('score', {
  onValue: (value) => {
    const { current } = value as { current: number };
    const el = document.getElementById('score-turns'); // the platform status element
    if (el) el.textContent = `★ ${current}`;
  },
});
```

You're not adding anything to the page. The score element is already there; you're
only changing what gets written into it.

**Rendering a channel you invented.** A channel you created in `registerChannels`
(the `zoo.ambience` channel from the last chapter) has no place on the page yet. The
platform doesn't know it exists, so left alone its value falls to the renderer's
JSON-tree fallback. Its renderer therefore makes its own element the first time it
runs and reuses it after. This is exactly how the platform's built-in renderers
work: they create DOM nodes and append them into the page's containers. Create once,
reuse thereafter:

```typescript
renderer.registerRenderer('zoo.ambience', {
  onValue: (value) => {
    const main = document.getElementById('main-window'); // a stable platform container
    if (!main) return;
    let line = document.getElementById('zoo-ambience');
    if (!line) {
      line = document.createElement('div');
      line.id = 'zoo-ambience';
      main.prepend(line); // a mood line above the prose
    }
    line.textContent = String(value ?? '');
  },
});
```

The renderer owns the element, so nothing needs to be added to the host page and it
survives every rebuild. Style it from your override stylesheet (Chapter 26) by its
id or a class you give it.

## Save, restore, and theme: for free

The client ships the surrounding chrome too. Saving routes the engine's complete
`ISaveData` into a browser envelope persisted in `localStorage`; an **autosave**
piggy-backs on the per-turn packet, so every turn boundary is captured without any
story code. Restore unwraps the envelope and hands the save back to the engine,
which rebuilds the world. Theme switching is one attribute flip on the document, the
subject of the next chapter. All of it is configured through `BrowserClientConfig`;
none of it is something you implement.

## Key takeaway

The web client owns the page; the engine only emits channels. `BrowserClient` wires
them with three calls and drives the screen from just two signals (one manifest,
then one packet per turn) dispatched to per-channel renderers, with commands flowing
back through `engine.executeTurn`. Because the UI is framework-free, you customize it
the web-native way: restyle with CSS, or replace a view by re-registering a
`ChannelRenderer`; save, restore, and theming come built in. With data flowing to a
rendered page, the next two chapters turn to *how it looks*: decoration and theming,
then media and audio.
