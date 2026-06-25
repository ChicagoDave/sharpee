# Em-dash review — Chapter 25: The Web Client

Source: `docs/book/parts/part-7/25-the-web-client.md`

### 1. Intro paragraph, "The last chapter ended with a promise" (line 5) — prose
OLD:
The last chapter ended with a promise: a channel emits *data*, and something on the
other side decides how it looks. That something is the **client**. This chapter
walks through Sharpee's reference browser client — how it connects to the engine,
turns turn packets into a living page, and why it's built from plain HTML and CSS
instead of a framework.

NEW:
The last chapter ended with a promise: a channel emits *data*, and something on the
other side decides how it looks. That something is the **client**. This chapter
walks through Sharpee's reference browser client: how it connects to the engine,
turns turn packets into a living page, and why it's built from plain HTML and CSS
instead of a framework.

### 2. "That's the whole rendering path" paragraph (line 65) — prose
OLD:
That's the whole rendering path. At startup the engine emits one **manifest** (the
capability-filtered list of channels this client gets); thereafter it emits one
**packet per turn**. The renderer dispatches each channel in the packet to the
`ChannelRenderer` registered for it: the `main` channel's renderer appends prose,
the `location` renderer rewrites the status line, the `score` renderer updates the
score. There is no second path — prose and status and media all arrive the same way.

NEW:
That's the whole rendering path. At startup the engine emits one **manifest** (the
capability-filtered list of channels this client gets); thereafter it emits one
**packet per turn**. The renderer dispatches each channel in the packet to the
`ChannelRenderer` registered for it: the `main` channel's renderer appends prose,
the `location` renderer rewrites the status line, the `score` renderer updates the
score. There is no second path. Prose and status and media all arrive the same way.

### 3. "Rendering is only half a loop" paragraph (line 75) — prose
OLD:
Rendering is only half a loop; the player has to type. The input box feeds commands
to `engine.executeTurn(command)`, and the engine runs a turn — which produces the
next packet, which the renderer paints. UI *gestures* close the same loop: when a
clickable hotspot or a menu item fires, it synthesizes the equivalent typed command
and runs it through `executeTurn`, so a click and a typed verb are indistinguishable
to the engine. The menu's **Help** and **About** entries, for instance, are wired
straight to `engine.executeTurn('help')` and `engine.executeTurn('about')`.

NEW:
Rendering is only half a loop; the player has to type. The input box feeds commands
to `engine.executeTurn(command)`, and the engine runs a turn, which produces the
next packet, which the renderer paints. UI *gestures* close the same loop: when a
clickable hotspot or a menu item fires, it synthesizes the equivalent typed command
and runs it through `executeTurn`, so a click and a typed verb are indistinguishable
to the engine. The menu's **Help** and **About** entries, for instance, are wired
straight to `engine.executeTurn('help')` and `engine.executeTurn('about')`.

### 4. Section heading "Save, restore, and theme" (line 153) — heading
OLD:
## Save, restore, and theme — for free

NEW:
## Save, restore, and theme: for free
