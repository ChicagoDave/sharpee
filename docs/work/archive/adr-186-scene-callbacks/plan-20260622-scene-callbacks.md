# Plan: ADR-186 Scene Lifecycle Callbacks (#151)

**Date**: 2026-06-22
**ADR**: [ADR-186](../../architecture/adrs/adr-186-lifecycle-transitions-first-class-callbacks.md) (ACCEPTED)
**Resolves**: GitHub #151 (scene `scene_began`/`scene_ended` never reach handlers)
**Status**: CODE COMPLETE — world-model + engine + tests + book done; platform dist
rebuild + republish + book-HTML regen remain (user-managed)

## Progress (2026-06-22)

- [x] Step 1 — world-model types (`SceneEventContext`/`SceneReaction`/`SceneCallback`;
      `onBegin?`/`onEnd?` on `SceneOptions` + `SceneConditions`)
- [x] Step 2 — `createScene` stores callbacks in `sceneConditions`
- [x] Step 3 — root-barrel exports (`world/index.ts`; `src/index.ts` is `export *`)
- [x] Step 4 — `SceneEvaluationPlugin` invokes callbacks, translates to `game.message`,
      try/catch parity, monotonic id, no `Date.now()` (also dropped from the existing
      facts: `timestamp: 0` sentinel, normalizer backfills)
- [x] Tests — 10 new (7 plugin-level + 3 end-to-end through `ProsePipeline`); engine
      436 pass, world-model 1284 pass
- [x] `tsf build --npm` clean for both packages; new types verified in staged `.d.ts`
- [x] Step 6 — book Ch.21 §21.4 rewritten to callback form; key-takeaway updated
- [ ] Platform dist/dist-esm rebuild (`./sharpee build`) — user-managed
- [ ] Republish `@sharpee/world-model` + `@sharpee/engine` (version bumps) — user-managed
- [ ] Regenerate `docs/book/web/21-scenes.html` from markdown (book build) — user-managed
- [ ] Naive book end-to-end re-verify (builds against published pkgs) — post-republish


## Scope

Implement typed scene reaction callbacks (`onBegin`/`onEnd`) owned by the scene
definition and invoked by `SceneEvaluationPlugin`, returning player-visible prose via
`game.message`. #150 (NPC room-entry/exit) is already done; this plan covers the scene
half only, plus the Ch.21 §21.4 book rewrite.

**Out of scope**: routing plugin events through the registered-handler bus (explicitly
rejected in the ADR); the broader `Date.now()`-in-event-id cleanup across
`npc-service`/`turn-event-processor` (separate task — this plan only avoids introducing
new `Date.now()` use).

## Affected packages

| Package | Change | Platform? |
| --- | --- | --- |
| `@sharpee/world-model` | `SceneEventContext`/`SceneReaction`/`SceneCallback` types; `SceneOptions`+`SceneConditions` fields; `createScene` stores callbacks; root-barrel exports | YES |
| `@sharpee/engine` | `SceneEvaluationPlugin` invokes callbacks, translates reactions to `game.message` | YES |
| `docs/book` | Ch.21 §21.4 rewrite to callback form | no |

Both platform packages — needs user approval before edits land.

## Steps (the ADR's four-step update contract — perform together)

### 1. world-model types (`packages/world-model/src/world/WorldModel.ts`)
- Add `SceneEventContext` (`world`, `sceneId`, `sceneName`, `turn`, `totalTurns?`).
- Add `SceneReaction = { text: string } | { messageId: string; params? }`.
- Add `SceneCallback = (ctx) => SceneReaction[] | SceneReaction | void`.
- Add `onBegin?`/`onEnd?` to **both** `SceneOptions` and `SceneConditions`.

### 2. createScene stores the callbacks (`WorldModel.createScene`, ~line 1483)
- Copy `options.onBegin`/`options.onEnd` into the `sceneConditions.set(id, {...})`
  entry alongside `begin`/`end`. (This is the silent-failure guard — without it the
  plugin never sees the callbacks.)
- `AuthorModel.createScene` delegates — no change.

### 3. Root-barrel exports (root barrel discipline)
- Export the three new types from `world/index.ts` → `src/index.ts`.

### 4. SceneEvaluationPlugin (`packages/engine/src/scene-evaluation-plugin.ts`)
- After pushing the `scene_began` fact: build `SceneEventContext` (no `totalTurns`),
  invoke `conds.onBegin`, translate reactions, append.
- After pushing the `scene_ended` fact: build context with
  `totalTurns: <activeTurns before reset>`, invoke `conds.onEnd`, translate, append.
- Translation helper: normalize (`undefined`→`[]`, single→`[it]`), map each reaction
  to a `game.message` event (`{text}`→`data.text`; `{messageId,params}`→
  `data.messageId`+`data.params`), `id: \`scene-${++eventCounter}\``, **no
  `timestamp`** (normalizer backfills).
- Wrap each callback in `try/catch` with parity to the existing `begin`/`end` guards:
  swallow throws, transition still completes, no reaction events emitted.

### 5. Rebuild platform
- `./sharpee build` (world-model + engine; both `dist/` and `dist-esm/` per barrel
  discipline). Use `--skip` to resume if needed.

### 6. Book rewrite (`docs/book/parts/part-6/21-scenes.md`)
- Replace the `registerEventHandler('if.event.scene_began', …)` example (lines ~62–83)
  with the `onBegin`/`onEnd` callback form colocated in `createScene`.
- Update the §"Key takeaway" line referencing the handlers.

## Tests (from ADR — write before declaring done)

End-to-end (engine, real `WorldModel` + `SceneEvaluationPlugin` + **prose pipeline +
languageProvider** — the plugin returns events but does not render; tests must assert
on the *rendered block list*, not the raw `game.message` event, or they re-create the
silent-output weakness ADR-186 fixes):
1. **Visible begin reaction** — `onBegin: () => ({ text })`; assert rendered block
   contains the text AND turn events include `if.event.scene_began`.
2. **Visible end reaction + totalTurns** — scene active K turns; assert
   `ctx.totalTurns === K` and end text renders.
3. **messageId reaction** — `onBegin: () => ({ messageId })`; assert lang-resolved
   string renders.
4. **State-only beat** — `onBegin` returns `void`; assert `scene_began` still fires,
   no extra prose block.

Boundary:
5. **Recurring re-fire** — recurring scene cycles `waiting→active→waiting`; `onBegin`
   fires each activation.
6. **Facts stay silent** — scene with no callbacks; assert `scene_began`/`scene_ended`
   produce no text block.

Negative:
7. **Throwing callback** — `onBegin` throws; assert scene still transitions to
   `active`, no reaction event, turn completes.

Test location: engine package (alongside existing scene-evaluation tests if present;
otherwise new `scene-evaluation-plugin.test.ts`). Verify with
`pnpm --filter '@sharpee/engine' test`.

## Acceptance criteria (ADR §Acceptance criteria)

- [ ] Three new types exported from `@sharpee/world-model` root barrel; no `any` on the
      scene author path.
- [ ] `SceneOptions`/`SceneConditions` carry `onBegin?`/`onEnd?`; `createScene` stores
      them.
- [ ] `onBegin` returning `{ text }` produces visible prose the turn begin first holds;
      same for `onEnd`.
- [ ] `scene_began`/`scene_ended` still emitted as facts, absent from prose output.
- [ ] Recurring scene re-fires `onBegin`; `onEnd` gets correct `totalTurns`.
- [ ] Throwing callback does not abort transition, emits no reaction events.
- [ ] Ch.21 §21.4 rewritten; `registerEventHandler` scene example removed.
- [ ] 7 tests above pass; `tsf build --npm` clean (publishable-package regression).

## Risks / notes

- **Root barrel miss** → runtime "not a constructor"/missing-export. Update all three
  barrel levels and rebuild both `dist/`+`dist-esm/`.
- **Save/restore**: callbacks are non-serializable closures like `begin`/`end`;
  re-registered via `createScene` after restore. No save-format change.
- **No `Date.now()`** in new event construction (deterministic-replay rationale in ADR
  boundary contract).
- Naive book test was the original surfacing path for #151; re-run it after the build
  to confirm the Ch.21 example works end-to-end.
