# ADR-206: `game.message` Render-Param Contract (`params` nesting)

## Status: ACCEPTED

> Accepted 2026-06-30 by David. Fixes a **v2 phrase-migration regression**: a subset of dungeo
> `game.message` emits pass template params at the event-data top level, where the phrase-render
> path never binds them, producing runtime "param not bound" errors. Establishes the contract and
> sweeps the offenders. Surfaced only after the `packages/bootstrap` build blocker was cleared and
> the dungeo transcripts could run end-to-end.

## Date: 2026-06-30

## Terminology

- **`game.message` event** — a terminal render event carrying `{ messageId, params }` (plus
  optional handler-read fields). The engine renders `messageId` with `params` and, for some, a
  handler also reacts to it.
- **Render param** — a value a message *template* references (`You burn {the target}.` → `target`).
- **Handler-read field** — a value a registered `game.message` handler reads off the event data
  (dungeo's `exorcism-handler` reads `game.message` events), unrelated to rendering.

## Context

The v2 phrase-algebra migration (ADR-192+) rewrote message templates to phrase syntax
(`{the target}`, `{verbatim:direction}`). The engine renders a `game.message` by binding template
params from the event's **`params`** sub-object. But `ActionContext.event('game.message', …)`
(`enhanced-context.createEventInternal`) wraps whatever payload it's given, and the entity-id map
(`getEventEntities`) already claims top-level names like `target`/`instrument` from the *command* —
so a render param placed **flat** at the payload top level never reaches the parser.

Result: emits shaped `{ messageId, target }` throw `param 'target' is not bound` at render time,
while the correct shape `{ messageId, params: { target } }` binds. v1 never hit this — its old
formatter read params from the flat data and its templates were `{target}`, not `{the target}`.

A detection pass (`event('game.message', {…})` object literals lacking a `params:` key but carrying
render keys) found **20 flat emits across 11 dungeo files** — burn, answer, melt, pray, dig, ring,
break, commanding (×10), knock. Confirmed at runtime: `burn.success`, `mirror.box_rotates`,
`glacier.melt_no_flame`, `robot.takes_object`/`drops_object`.

## Decision

The `game.message` payload contract is:

```ts
context.event('game.message', {
  messageId,
  params: { /* every template-referenced render param */ },
  /* handler-read fields (if any) stay at the top level */
});
```

- **Render params MUST be nested under `params`.** They are the only place the phrase renderer binds.
- **Handler-read fields stay top-level.** dungeo's `exorcism-handler` (and any future
  `game.message` handler) reads fields off `event.data`; those must NOT move into `params`, or the
  handler breaks. So the sweep is **per-emit**: wrap only the template-referenced keys; leave the
  rest exactly where they are. This is not a blind wrap-the-whole-object change.

Sweep all 20 dungeo flat emits to this shape.

## Options considered

- **Make the render path fall back to flat (`data.params ?? data`) everywhere** — `handleGameMessage`
  already does this, but the failing path (report/domain-message resolution) does not, and a silent
  fallback masks the mismatch and collides with `getEventEntities` claiming `target`/`instrument`.
  Rejected: the explicit `params` nesting is the intended, unambiguous contract.
- **Wrap the whole payload in `params`** — simplest, but breaks the `game.message` handler that reads
  top-level fields. Rejected in favor of the per-emit render-vs-handler split.
- **Leave broken** — rejected; these are live runtime errors in the flagship game.

## Scope

**In:** the 20 flat `game.message` emits across the 11 dungeo files; a **guard** — a Vitest test that
runs a broad dungeo transcript set and asserts **zero** `[phrase] renderMessage(...) failed` lines,
so any future flat emit (dungeo or the next story) is caught at CI, not in play (the "fence" that
stops this recurring).

**Out:** the pre-existing non-phrase dungeo failures (content/navigation, combat RNG, transcript
`[NOT: …]`/missing-assertion format issues); other stories (same contract applies; sweep on demand).

## Consequences

- The five known render errors clear; NPC/action messages render their params in dungeo.
- **The bootstrap-verification gap that hid this is closed** — the guard runs the dungeo transcripts,
  so param-binding regressions surface in CI going forward.
- Author guidance: story `game.message` emits put render params under `params`; the guard enforces it.
- Handler-read `game.message` fields (exorcism) are preserved by the per-emit split.

## Acceptance Criteria

1. All 20 flat emits carry render params under `params`; handler-read fields remain top-level.
2. `burn.success`, `mirror.box_rotates`, `glacier.melt_no_flame`, `robot.takes_object`/`drops_object`
   render without `[phrase] … not bound` (verified against the dungeo transcript run).
3. The detection pass reports **0** flat `game.message` emits in dungeo.
4. Guard test: a dungeo transcript run asserts zero `renderMessage failed` lines; it fails if a flat
   emit is reintroduced.
5. dungeo suite shows no new phrase errors (RNG-driven content failures excepted per dungeo's
   CLAUDE.md); the exorcism handler still fires.

## Relationships

- Fixes a regression from the ADR-192+ phrase-algebra migration; sibling to ADR-203 (which had the
  analogous story-override rename breakage). **Reinforced by** ADR-202's "fence the invariant" pattern.

## Session

Authored 2026-06-30 (session `012562`, branch `main`) after clearing the (stale) `packages/bootstrap`
build blocker let the dungeo transcripts run and expose the flat-emit regression. v1 (old formatter,
`{target}` templates) is the reference for each message's intended render-param set.
