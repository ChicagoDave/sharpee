# text-service disposition (post-ADR-163 R8)

**Date**: 2026-05-03
**Phase**: R8 — ADR-101 cleanup + text-service final disposition
**Plan reference**: `plan-20260502-adr-163-rewrite-master.md`

> **2026-05-10 superseded by ADR-174.** ADR-174's Phase 2 (ACCEPTED
> 2026-05-10) reverses this doc's central recommendation. The
> wire-production helpers (`renderToString`, `renderStatusLine`)
> migrated from `@sharpee/text-service` to
> `@sharpee/channel-service/src/render-to-string.ts`; all first-party
> consumers and the platform bundle now pull them from there. The
> remaining text-service importers are zifmia (hard-deferred) and
> cloak-of-darkness (deferred); both fall out of build at Phase 3.
> This doc is preserved as a transitional-state snapshot, not as a
> live recommendation. See
> `docs/work/adr-174-prose-pipeline/plan-20260510-phase2.md`.
>
> **2026-05-10 final**: ADR-174 Phase 3 (ACCEPTED 2026-05-10) deleted
> `packages/text-service/` outright. Both block-production and
> wire-production roles described below are now historical. Engine has
> its own engine-private `ITextService` (Phase 1); wire production
> ships from channel-service (Phase 2); the package itself is gone
> (Phase 3). Zifmia removed from workspace via
> `pnpm-workspace.yaml`'s `!packages/zifmia` exclude. Cloak-of-darkness
> source files left in pre-existing build-broken state (outside
> workspace; future workspace integration is the right next step).
> See `docs/work/adr-174-prose-pipeline/plan-20260510-phase3.md`.

## Summary

`@sharpee/text-service` has two roles. After R5–R7 migrated all
first-party platform consumers (CLI bundle, `@sharpee/platform-browser`)
to ADR-163 channel-driven rendering, only one role still has
first-party callers — the other is retained for downstream consumers
that have no migration path yet.

| Role | Status |
|------|--------|
| **Block-production** (events → `ITextBlock[]`) | **PERMANENT** — engine still calls `TextService.processTurn` per turn. Both `text:output` (legacy) and `channel:packet` (new) carry these blocks downstream. The `mainChannel` closure in `@sharpee/stdlib` consumes them. |
| **Wire-production** (`ITextBlock[]` → string) | **DEPRECATED for first-party platforms** — `dist/cli/sharpee.js` (R6) and `@sharpee/platform-browser` (R5-C) no longer call `renderToString`. Retained in the public API for downstream consumers (Zifmia, transcript-tester, story-author runtime). |

Removing the wire-production exports now would break consumers without
a migration path. They are deprecated, not deleted.

## Export-by-export disposition

### Block-production (KEEP)

| Export | Role | Disposition |
|--------|------|-------------|
| `ITextService` | Service interface | KEEP — engine programs against it |
| `TextService` | Service class | KEEP — engine instantiates |
| `createTextService` | Factory | KEEP — engine bootstrap |
| `filterEvents` | Pipeline stage | KEEP — internal pipeline |
| `sortEventsForProse` | Pipeline stage | KEEP |
| `getChainMetadata` | Pipeline metadata helper | KEEP |
| `createBlock` | Block assembler | KEEP |
| `extractValue` | Block assembler helper | KEEP |
| `EventHandler` (type) | Handler contract | KEEP |
| `HandlerContext` (type) | Handler contract | KEEP |
| `ChainableEventData` (type) | Handler contract | KEEP |
| `GenericEventData` (type) | Handler contract | KEEP |
| `handleRoomDescription` | Handler | KEEP |
| `handleRevealed` | Handler | KEEP |
| `handleGameMessage` | Handler | KEEP |
| `handleGenericEvent` | Handler | KEEP |
| `parseDecorations` | Decoration utility | KEEP |
| `hasDecorations` | Decoration utility | KEEP |

### Wire-production (DEPRECATED — retained for downstream consumers)

| Export | Role | Disposition | Consumers |
|--------|------|-------------|-----------|
| `renderToString` | Block list → string | DEPRECATED, KEEP | `@sharpee/transcript-tester`, `@sharpee/zifmia`, `@sharpee/bridge`, `@sharpee/runtime`, `@sharpee/sharpee` |
| `renderStatusLine` | Status line formatter | DEPRECATED, KEEP | Same set |
| `CLIRenderOptions` (type) | Render options | DEPRECATED, KEEP | Wire-production consumers |

### Re-exports (KEEP — convenience)

| Export | Source | Disposition |
|--------|--------|-------------|
| `ITextBlock` (type) | `@sharpee/text-blocks` | KEEP — re-export |
| `IDecoration` (type) | `@sharpee/text-blocks` | KEEP |
| `TextContent` (type) | `@sharpee/text-blocks` | KEEP |
| `isDecoration`, `isTextBlock` | `@sharpee/text-blocks` | KEEP |

## Current consumer matrix

```
@sharpee/text-service exports
├── PRODUCTION block-production (engine.ts)
│   └── @sharpee/engine — TextService instantiation, processTurn
├── PRODUCTION wire-production (deprecated for first-party)
│   ├── @sharpee/transcript-tester — story-loader.ts (test harness)
│   ├── @sharpee/zifmia — GameContext.tsx, ChatOverlay.tsx
│   ├── @sharpee/bridge — index.ts (story scaffolding)
│   ├── @sharpee/runtime — index.ts (story scaffolding)
│   ├── @sharpee/sharpee — src/index.ts (re-export to authors)
│   └── stories/* — author bundles still in transition
└── REMOVED first-party platforms (R5-C, R6)
    ├── ╳ scripts/bundle-entry.js (CLI bundle) — channel:packet path
    └── ╳ @sharpee/platform-browser — channel:packet path
```

## Removal milestones (not in scope for this phase)

These would require coordinated migrations:

1. **Zifmia migration to channel:packet** — biggest blocker. Zifmia's
   GameContext currently wraps the engine's events and renders via
   `renderToString` for chat history projection. Migrating it to drive
   a `Renderer` instance + observe `channel:packet` would close the
   largest first-party gap.

2. **Story-template alignment** — `packages/sharpee/templates/browser/`
   templates still reference `renderToString`; new author bundles
   generated from these templates inherit the dependency. Updating the
   templates to use `BrowserClient` (which is already channel-driven)
   eliminates this without breaking existing stories.

3. **Bridge / runtime audit** — `@sharpee/bridge` and `@sharpee/runtime`
   are scaffolding packages; specific call sites should be reviewed to
   confirm whether `renderToString` use is essential or vestigial.

After those three migrations, `renderToString` / `renderStatusLine` /
`CLIRenderOptions` could be removed in a subsequent ADR-163 phase
(post-R8, post the Zifmia migration). Until then they remain in the
public API.

## What this phase actually executed

- **`packages/text-service/src/index.ts` header** — updated to reflect
  the post-rewrite reality (block-production permanent; wire-production
  deprecated for first-party; retained for downstream).
- **No exports removed** — the deprecation is documentation-only.
- **No call-site changes** — downstream consumers continue to compile.

## References

- ADR-096 — Text Service Architecture
- ADR-163 — Channel-Service Platform
- ADR-165 — Renderer Architecture
- `docs/context/session-20260503-0417-main.md` — R5–R7 cutover work
