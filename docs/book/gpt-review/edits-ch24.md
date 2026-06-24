# Ch 24 — Channels: edit proposals

Almost entirely em-dash removal. The prose is clear and well-paced, so I left it
alone except where a dash had to go. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: A running story shows far more — where you are, your score, the turn count, a command prompt, and, in a rich client, images and sound.
NEW: A running story shows far more: where you are, your score, the turn count, a command prompt, and, in a rich client, images and sound.

### 2. Opening paragraph — emdash
OLD: Through **channels** — the foundation this whole volume builds on.
NEW: Through **channels**, the foundation this whole volume builds on.

### 3. "One surface for everything" — emdash
OLD: The key idea is that *everything* the player perceives travels over a channel — not just the prose.
NEW: The key idea is that *everything* the player perceives travels over a channel, not just the prose.

### 4. "One surface for everything" — emdash
OLD: One mechanism carries it all — which is why channels are called the universal UI surface.
NEW: One mechanism carries it all, which is why channels are called the universal UI surface.

### 5. "A turn produces a packet" — emdash
OLD: and assembles the answers into a **turn packet** — the set of channels that emitted, each with its value.
NEW: and assembles the answers into a **turn packet**: the set of channels that emitted, each with its value.

### 6. "The channels you get for free" — emdash
OLD: fed by the same world and events the rest of your story already produces — you wire none of them:
NEW: fed by the same world and events the rest of your story already produces. You wire none of them:

### 7. "Capability negotiation" — emdash
OLD: the engine replies with a **manifest** listing the channels available to *that* client — a text-only terminal simply never sees the media channels.
NEW: the engine replies with a **manifest** listing the channels available to *that* client; a text-only terminal simply never sees the media channels.

### 8. "Capability negotiation" — emdash
OLD: As an author you rarely touch this; it's the machinery that lets one story serve a bare terminal and a graphical browser from exactly the same code.
NEW: As an author you rarely touch this. It's the machinery that lets one story serve a bare terminal and a graphical browser from exactly the same code.

### 9. "Defining your own channel" — emdash
OLD: When your story has a UI signal the standard channels don't cover — an ambient mood line, a custom HUD value, a trigger for a story-specific overlay — you define your own **`IOChannel`** in the `registerChannels` hook.
NEW: When your story has a UI signal the standard channels don't cover, such as an ambient mood line, a custom HUD value, or a trigger for a story-specific overlay, you define your own **`IOChannel`** in the `registerChannels` hook.

### 10. After the produce code — emdash
OLD: on a `sparse` `replace` channel, `undefined` means *"no change this turn"* — **not** *"clear the line."*
NEW: on a `sparse` `replace` channel, `undefined` means *"no change this turn,"* **not** *"clear the line."*

### 11. After the produce code — emdash
OLD: To actually blank the line you must emit a *different* value — here, the empty string `''` — which is a real transition the renderer paints as blank
NEW: To actually blank the line you must emit a *different* value, here the empty string `''`, which is a real transition the renderer paints as blank

### 12. "a channel emits data" paragraph — emdash
OLD: Crucially, a channel emits **data** — text, a number, JSON — never UI.
NEW: Crucially, a channel emits **data** (text, a number, JSON), never UI.

### 13. Family Zoo paragraph — emdash
OLD: Family Zoo v18 ships exactly this `zoo.ambience` channel — a one-line mood description for each area — and its browser entry registers a renderer that creates a dedicated page element and paints the line into it.
NEW: Family Zoo v18 ships exactly this `zoo.ambience` channel, a one-line mood description for each area, and its browser entry registers a renderer that creates a dedicated page element and paints the line into it.
