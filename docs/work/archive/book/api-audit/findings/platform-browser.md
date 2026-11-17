# Findings — @sharpee/platform-browser

## Author-relevance
Author-facing (web client). The book's Part VII uses this directly: `BrowserClient` is the story entry-point orchestrator, the `./channels/*` renderer builders + `registerDefaultBrowserRenderers` are the theming/customization surface, `ThemeManager`/`AudioManager` are the per-channel UI knobs. This is the canonical "ship my story to the browser" package.

## Naming
Mostly clean and spelled-out. Concrete strengths: `registerDefaultBrowserRenderers`, `createMainChannelRenderer`, `BrowserSaveEnvelope`, `mountDefaultLayout`. Concerns:
- `AUTOSAVE_SLOT` / `BROWSER_CAPABILITIES` are SCREAMING_CASE consts — consistent with the wider codebase convention.
- `AudioManagerLike` / `BrowserClientInterface` use two different "structural-shape" suffixes (`-Like` vs `-Interface`) for the same idea (a duck-typed/abstract shape). Inconsistent.
- `DOMElements` vs `DialogElements`/`DisplayElements`/`StatusElements` — `DOMElements` is the superset, the others are subsets; the naming doesn't signal the subset relationship.
- No abbreviations beyond the standard `DOM`, `HTML*`, `IFID`.

## Should-be-internal
- `DialogElements`, `DisplayElements`, `StatusElements`, `DOMElements` — internal manager wiring shapes (raw nullable HTMLElement bags). An author wires the page, not these. Only `DOMElements` is even passed to `BrowserClient.initialize`; the three subsets are pure manager-constructor plumbing.
- `ThemeManagerConfig`, `SaveManagerConfig`, `DialogManagerConfig`, `MenuManagerConfig`, `InputManagerConfig` — config types for managers that `BrowserClient` constructs internally. Exported because the manager classes are exported, but the manager classes themselves are arguably internal (an author uses `BrowserClient`, not `DialogManager` directly).
- `BrowserClientCallbacks` — documented in its own TSDoc as an empty, reserved-for-future, soon-to-be-removed interface. Currently an empty `{}` on the public surface.
- `SaveContext` / `SaveSlotMeta` / `BrowserSaveEnvelope` — leak the save-persistence internals; likely only `SaveManager` consumers need them.

## API shape
- `AudioManager.handleAudioEvent(event: { type: string; data: any })` — `any` in a public signature. The narrower `AudioManagerLike.handleAudioEvent` (in `./channels`) uses `data: unknown` for the same method — a duplicate concept with diverging strictness (`any` vs `unknown`).
- `SaveManager.performSave(...)` returns an inline anonymous `{ success: boolean; error?: string }` rather than a named `SaveResult` type.
- `SlotHandle` (re-exported transitively via channel-service) is `unknown`; browser renderers narrow it to `HTMLElement` informally — no browser-specific typed alias.
- `StoryInfo.authors: string | string[]` while `BrowserClientConfig`/info-channel speak of singular `author` — minor duplicate-concept friction between `StoryInfo.authors` and the info renderer's `data-author`.
- Channel renderer builders are consistently shaped (`create<Name>ChannelRenderer(slot, opts?) => ChannelRenderer`), good. `createTransitionChannelRenderer`/`createLayoutChannelRenderer`/`createClearChannelRenderer` take `root` while siblings take `slot` — minor param-name inconsistency, same type.

## Documentation (TSDoc)
Excellent — roughly 90%+ of public symbols carry doc comments, many with `@example`, `@see ADR-xxx`, and behavioral contracts (e.g. `lifecycle.ts`, `BrowserClient` methods, `SaveManager` history notes). Notable gaps: `StatusLine`, `TextDisplay`, `MenuManager`, `InputManager` member methods are thinly documented (file headers only); `BrowserClientInterface` members are undocumented one-liners.

## Book highlights
- `BrowserClient` (constructor, `initialize`, `connectEngine`, `start`, `getChannelRenderer`, `getAudioManager`) — the entry-point class every browser story uses.
- `BROWSER_CAPABILITIES`, `BrowserClientConfig.clientCapabilities` — capability profiles / text-only kiosk override story.
- `registerDefaultBrowserRenderers` + the full `./channels` builder family (`createMainChannelRenderer`, `createLocation/Score/TurnChannelRenderer`, image/audio/animation renderers) — the "override one channel's rendering" chapter.
- `mountDefaultLayout` / `BrowserDefaultLayout` — the slot-table layout model (ADR-165 §7).
- `AudioManager` + `createAmbientChannelRenderer` — audio-customization chapter.
- `ThemeManager` (incl. `applyEarlyTheme`) — theming chapter.
- `renderTextContent` / `flattenTextContent` (`./channels/text-content`) — decoration→DOM projection (ADR-174).
