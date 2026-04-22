# Multiuser Browser Client — Tech Stack

Companion to `overview.md`. Records the technical decisions, the alternatives considered, and the reasoning. Locked 2026-04-22.

---

## Framework — React 18

- Match house style. `packages/zifmia` is React 18/19; its GameShell, menu, overlays, status, and transcript components are a working precedent.
- Lets us cherry-pick Zifmia's `themes.css` and any transferable pure-UI components instead of reimplementing.

## Theming — All 4 Zifmia themes + per-user picker

Ship with all four Zifmia themes from day one: **classic-light**, **modern-dark**, **retro-terminal**, **paper**. Port the CSS variables out of `packages/zifmia/src/styles/themes.css` into the client's own `styles/themes.css` — no live dependency on Zifmia.

- **Scope**: global per-user preference. One theme choice applies to the landing page and every room the user visits. No per-room theming — would fragment muscle memory and adds state for no win.
- **Persistence**: localStorage key `sharpee.theme` = `classic-light | modern-dark | retro-terminal | paper`. Read at app boot; default to `modern-dark` if absent.
- **UI affordance**: small theme-picker button in the app header (landing and room). Icon + current-theme label; click opens a compact dropdown with the four options. Selecting one swaps `document.documentElement` `data-theme` attribute and writes localStorage.
- **No server involvement**: themes are entirely client-side. Server never sees the preference.

**Alternatives considered and rejected:**
- **Svelte / Preact / Solid** — all defensible on technical merit (smaller bundles, simpler reactivity), but a framework split in the repo adds cognitive overhead for no concrete win. React is working for Zifmia; use it.
- **Vanilla JS + template strings** — the lock-on-typing live-preview + tabbed room view is complex enough that structured components are worth the framework tax.

## Location — `tools/server/client/`

Not `packages/multiuser-client/`, not a fork of `packages/zifmia`, not an extension of `packages/platform-browser`.

- `pnpm-workspace.yaml` covers `packages/*` but **not** `tools/*`. `tools/server/` already runs as a standalone npm project (the Dockerfile confirms this — `npm install` inside `tools/server`).
- `packages/` is for reusable Sharpee libraries (engine, stdlib, world-model, zifmia, map-editor). This client is product-coupled to this one server — shares its WebSocket protocol, its auth model, its lifecycle. It is a tool, not a library.
- Co-locating client and server in `tools/server/` makes the Dockerfile straightforward and keeps protocol changes visible across both halves of the same commit.

**Directory layout:**
```
tools/server/
├── src/              # (existing) Node server
├── tests/            # (existing) server tests
├── migrations/       # (existing) SQL migrations
├── client/           # NEW
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/    # Landing, Room
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles/   # themes.css (cherry-picked from zifmia)
│   └── dist/         # built output (gitignored)
├── package.json      # (existing) server
├── Dockerfile        # (existing; extended to build client)
└── docker-compose.yml
```

`tools/server/client/package.json` is its own npm project. `cd tools/server/client && npm install` is its own tree. This keeps the client's frontend dependencies from polluting the server's `node_modules`.

## Hosting — Served by the Node server

The Node server adds static-file middleware that serves `tools/server/client/dist/` for all non-API paths.

**Routing split:**
- `/api/*` — server JSON routes (existing)
- `/ws/*` — WebSocket upgrade (existing)
- `/r/:code` — server-resolved join-code deep link (existing behavior preserved; returns the SPA with the code available for the modal to pre-fill)
- `/*` — everything else → serve the SPA's `index.html` (client-side router takes over)

**Implementation sketch:**
Add a `serveStatic` middleware in the server (Express-like; we use plain Node + `ws` today so it may be a thin custom handler). Serve `index.html` for any path that doesn't match `/api`, `/ws`, or `/r`.

**Closes the current `/` → 404 gap** in one move.

**Alternative considered and rejected:**
- **Separate static hosting (CDN or another nginx site)** — adds a deployment surface and raises CORS issues on `/api` and `/ws`. No upside at this scale. Deferred indefinitely.

## Dev Loop

**Development:**
- `cd tools/server/client && npm run dev` starts Vite on `localhost:5173`.
- `vite.config.ts` has a proxy:
  ```ts
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws':  { target: 'ws://localhost:8080', ws: true },
      '/r':   'http://localhost:8080',
    }
  }
  ```
- Server runs normally via `docker compose up` (or `npm run dev` on the server for faster iteration if a non-Docker dev mode gets added).
- Changes to the client hot-reload via Vite. Changes to the server require `docker compose up` restart (unchanged from today).

**Production build:**
- `cd tools/server/client && npm run build` → `tools/server/client/dist/` (gitignored).
- Dockerfile adds a client-builder stage: `WORKDIR /build/tools/server/client && RUN npm ci && RUN npm run build`, then the runtime stage COPYs `/build/tools/server/client/dist` to `/app/public`.

**Repo build script (`./build.sh`):**
- Add a `-c multiuser` option or similar that builds the client into its `dist/`. Primarily useful for local previewing without docker.

## Architecture Layers (inside the client)

```
App (router)
├── pages/Landing      — fetches GET /api/stories + GET /api/rooms (NEW), renders lists
├── pages/Room         — full room UI, owns the WebSocket
├── components/        — PassCodeModal, CreateRoomModal, StoriesList, ActiveRoomsList,
│                         Transcript, CommandInput (lock-on-typing), ChatPanel, DmPanel,
│                         RECIndicator, ParticipantRoster, RoomSettings, etc.
├── hooks/useWebSocket — connect, reconnect with token, send/receive discriminated messages
├── hooks/useRoomState — reducer over ServerMsg → local RoomState
├── storage/token      — localStorage read/write, scoped to room URL
└── types/             — mirror of server ClientMsg/ServerMsg types (shared shape, TS-only)
```

**Type-sharing between client and server:**
The message-protocol types in `tools/server/src/ws/types.ts` (or wherever they live) should be imported directly by the client to prevent drift. Since both live under `tools/server/`, the client's `tsconfig.json` can reference the server's types via a relative path — no package-publish step needed.

## Data / State

- **localStorage**: durable session token per room URL (ADR-153 Decision 5). Scope per-hostname-and-room.
- **No client-side persistence of transcript or room state.** On reconnect, server's `welcome` returns a `RoomSnapshot` and the client re-derives its view — authoritative source is always the server.
- **No global state library** in v0.1 unless complexity demands it. React's built-in `useReducer` + context for the room-state reducer is plenty. Escalate to Zustand or Jotai only if we hit friction.

## Protocols

- **HTTP/JSON** for `/api/*` (`GET /api/stories`, `GET /api/rooms` NEW, `POST /api/rooms`, `GET /r/:code`).
- **WebSocket** for `/ws/:room_id` — protocol fully typed in ADR-153 (`ClientMsg`, `ServerMsg`). No additional framing; JSON over text frames.

## Testing

- **Unit**: component and hook tests via Vitest + React Testing Library.
- **Integration**: not in v0.1 scope beyond manual two-browser smoke on `play.sharpee.net`. Playwright / end-to-end automation is a post-MVP add.
- **Type check**: `tsc --noEmit` in CI, same as server.

## Build Considerations

- Bundler: **Vite** (default React + TS template; zero-config is fine).
- Output targets: modern browsers only (ADR-153 Decision 13 — desktop/laptop, modern browsers). Vite's default `esnext` target is appropriate.
- Code splitting: not required in v0.1. Single bundle is fine for a two-page app.
- Env vars: any runtime config (CAPTCHA site key, etc.) — the server injects into the page via a server-rendered `<script>` tag at `/`, avoiding hardcoded secrets in the bundle. Client reads `window.__SHARPEE_CONFIG__` or similar at boot.

## Operational Considerations

- **Version coupling**: the client's `dist/` is baked into the Docker image, so client and server versions are always matched. Upgrade = new image. No client-old-server or server-old-client skew to worry about.
- **Cache-busting**: Vite generates content-hashed filenames by default. `index.html` should be served with `Cache-Control: no-cache`; hashed assets get far-future immutable caching.
- **TLS**: handled by apache2 + certbot on `play.sharpee.net` (already deployed per `deployment.md`). Client is origin-local so no cross-origin concerns.

---

## Summary

| Decision | Choice | Why |
|---|---|---|
| Framework | React 18 | House style (Zifmia), proven, lets us reuse themes |
| Theming | All 4 Zifmia themes + per-user picker in header | User preference; persisted in localStorage; global scope (not per-room) |
| Location | `tools/server/client/` | Product-coupled to server; workspace isn't meant for this |
| Hosting | Node server serves `dist/` | One process, one deploy, no CORS, closes `/` → 404 |
| Dev loop | Vite dev + proxy to `:8080` | Standard React DX, server unchanged |
| Types | Import server's WS types directly | Zero drift, same repo, no publish step |
| State | `useReducer` + context | Complexity doesn't yet justify a global store |
| Build | Vite, single bundle | Two-page app doesn't need splitting in v0.1 |

All locked 2026-04-22. Ready for MVP scope decisions.
