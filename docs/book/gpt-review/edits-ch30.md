# Ch 30 — Saving & Restoring: edit proposals

The prose is clean; this pass is em-dash removal. Each entry: location, reason,
OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: The happy answer is the theme of this whole book: mostly, you don't — the architecture already did it.
NEW: The happy answer is the theme of this whole book: mostly, you don't, because the architecture already did it.

### 2. "State lives in the world" — emdash
OLD: When the engine saves, it serializes the *entire* world into a single `ISaveData` — a complete snapshot, carried in a compressed `worldSnapshot`.
NEW: When the engine saves, it serializes the *entire* world into a single `ISaveData`, a complete snapshot carried in a compressed `worldSnapshot`.

### 3. "The one thing you must save yourself" — emdash
OLD: That's the rule: **any state you hold outside the world — a counter in a closure, a flag on a daemon — you must surface through these hooks, or it won't survive a save.**
NEW: That's the rule: **any state you hold outside the world (a counter in a closure, a flag on a daemon) you must surface through these hooks, or it won't survive a save.**

### 4. "How the browser persists a save" — emdash
OLD: a save is wrapped in a `BrowserSaveEnvelope` — the engine snapshot plus a little browser-only metadata (the visible score, the scrollback transcript) — and written to `localStorage`.
NEW: a save is wrapped in a `BrowserSaveEnvelope`, the engine snapshot plus a little browser-only metadata (the visible score, the scrollback transcript), and written to `localStorage`.

### 5. "How the browser persists a save" — emdash
OLD: the client unwraps the envelope and hands the engine snapshot back, and the engine rebuilds the world from it — which is why the post-restore status line and score are correct without the client recomputing anything.
NEW: the client unwraps the envelope and hands the engine snapshot back, and the engine rebuilds the world from it, which is why the post-restore status line and score are correct without the client recomputing anything.

### 6. "Save formats change with a version" — emdash
OLD: The envelope carries a version field precisely so that a future change to the format can be *read* rather than silently misinterpreted — a newer client can recognize an older save and refuse or adapt instead of loading garbage.
NEW: The envelope carries a version field precisely so that a future change to the format can be *read* rather than silently misinterpreted: a newer client can recognize an older save and refuse or adapt instead of loading garbage.
