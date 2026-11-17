# ISSUE-074: ActionInterceptor.postReport Conflates Override and Emit

**Branch**: `issue-074-interceptor-postreport-override`
**GitHub**: [#102](https://github.com/ChicagoDave/sharpee/issues/102)
**Scope**: Platform — `world-model` (ActionInterceptor contract), `stdlib` (every four-phase action that calls `interceptor.postReport`), `dungeo` (every existing interceptor with a `postReport`)
**Risk**: Medium — breaking type change on `ActionInterceptor.postReport`, but the migration is mechanical and the new contract is structurally narrower than the old one (each call site can decide override-vs-emit at compile time).

## Problem

`ActionInterceptor.postReport` returns `CapabilityEffect[]`. Two semantically different intents collapse onto that one shape:

1. **Override the standard message** of the action's primary domain event. Example: `RugPushInterceptor` wants the rug-reveal message to *replace* the generic `pushing.pushed_nudged` text, so the player sees only one line.
2. **Emit additional events alongside** the standard ones. Example: `GhostRitualDroppingInterceptor` returns two `game.message` effects that should both render in narration order.

The OLD entity-`on` system encoded this distinction implicitly via `event-processor.invokeEntityHandlers()` (`packages/event-processor/src/processor.ts:269-326`, ADR-106): a single `game.message` reaction was *consumed* as an override on the original event's `messageId` and filtered out of the reactions list; multiple `game.message` reactions were a hard error. ISSUE-068's plan (`docs/work/issues/plans/issue-068-plan.md:46`) migrated rug-pushed to a capability-pattern interceptor without flagging that the OLD handler relied on this override behavior. Since `postReport` returns get *appended* by the action's `report()` phase rather than passed through `invokeEntityHandlers`, the override branch never fires for interceptor effects.

### Live evidence

In Dungeo, `move rug` in the Living Room:

```
> move rug
You give large oriental rug a push, but it doesn't move far.
Moving the rug reveals a trap door.
```

Browser console shows two events reaching the text service:
- `if.event.pushed{messageId: "if.action.pushing.pushed_nudged"}`
- `game.message{messageId: "dungeo.rug.moved.reveal_trapdoor"}`

Both render. In MDL Zork and pre-cleanup Sharpee, only the rug-reveal text rendered — the rug `on` handler's single `game.message` reaction overrode the action's standard message.

### Why no test caught it

`tests/transcripts/rug-trapdoor.transcript:30` asserts `[OK: contains "Moving the rug reveals a trap door"]`. That passes whether the message renders alone or alongside other text. `wt-01-get-torch-early.transcript` is even looser (`[OK: contains "trap door"]`). No transcript pins exact post-push output, so the duplicate rendering is invisible to the regression baseline.

### Audit lesson worth recording

When migrating an entity `on` handler, identify **side-channel semantics** like message overrides. The substitution `Effect[]` ↔ `CapabilityEffect[]` is not purely structural — the old system had override semantics in the dispatch layer. ISSUE-068 categorized two handlers (rug push, trapdoor open) by their state-mutation responsibility and missed their message-emission responsibility. ADR-worthy if the methodology rule needs reinforcement; at minimum a CLAUDE.md addendum to the migration discipline.

## Proper fix

Make the contract explicit. Replace `postReport`'s return type with a discriminated structure:

```typescript
interface InterceptorReportResult {
  /** Override the primary domain event's messageId (and optionally params).
   *  At most one override per turn — multiple interceptors returning override
   *  is a hard error mirroring ADR-106's "multiple game.message reactions" rule. */
  override?: { messageId: string; params?: Record<string, unknown> };

  /** Emit additional events alongside the action's standard events. */
  emit?: CapabilityEffect[];
}
```

Each four-phase action's `report()` phase calls a shared helper:

```typescript
applyInterceptorReportResult(
  events: ISemanticEvent[],
  primaryEventType: string,
  result: InterceptorReportResult,
  context: ActionContext
): void
```

The helper:
- Looks up the primary event in `events` by type.
- If `result.override`, copies `messageId` and optional `params` onto the primary event's `data`.
- If `result.emit`, converts each `CapabilityEffect` to an `ISemanticEvent` via `context.event(...)` and pushes onto `events`.
- Logs an error if `override` is present but the primary event isn't in `events` (defensive).

### Why this is the proper fix

- The contract compiles to the intent. A reader of `RugPushInterceptor.postReport` sees `{ override: {...} }` and knows what happens.
- Override semantics live in **one** code path (the helper), invoked from each action site.
- Multiple-override is a structural error per call (one `override` field per result); cross-interceptor multi-override is detectable in the helper.
- The same shape works for every action: `pushing`, `opening`, `closing`, `throwing`, `putting`, `entering`, `going`, `taking`, `dropping`, `attacking`, `switching_on`.
- No story-side hidden conventions about returning a particular event type.

## Phases

### Phase 1 — Contract change in world-model

**Tier**: Small
**Budget**: 100 tool calls

- Add `InterceptorReportResult` interface to `packages/world-model/src/capabilities/action-interceptor.ts`.
- Change `ActionInterceptor.postReport`'s return type from `CapabilityEffect[]` to `InterceptorReportResult`.
- Update the JSDoc example for `postReport` to show both override and emit forms.
- Add `applyInterceptorReportResult` helper to `packages/world-model/src/capabilities/` (or in a new file `interceptor-helpers.ts`), and re-export from `packages/world-model/src/capabilities/index.ts`.
- Update `packages/world-model/tests/` to cover the helper: override-only, emit-only, both, neither, missing primary event.

**Exit state**: World-model exports the new contract and helper. Stdlib will not yet compile (it still expects `CapabilityEffect[]` from postReport callers) — Phase 2 fixes that.

### Phase 2 — Update all four-phase action sites

**Tier**: Medium
**Budget**: 250 tool calls

Files (from `grep "interceptor.postReport\|interceptor?.postReport" packages/stdlib/src/`):
- `packages/stdlib/src/actions/standard/pushing/pushing.ts:329-339`
- `packages/stdlib/src/actions/standard/pulling/pulling.ts` (if it has the same pattern — verify)
- `packages/stdlib/src/actions/standard/opening/opening.ts` (verify — opening uses interceptors per `safe-opening-interceptor.ts`)
- `packages/stdlib/src/actions/standard/closing/closing.ts`
- `packages/stdlib/src/actions/standard/taking/taking.ts`
- `packages/stdlib/src/actions/standard/putting/putting.ts`
- `packages/stdlib/src/actions/standard/dropping/dropping.ts`
- `packages/stdlib/src/actions/standard/throwing/throwing.ts`
- `packages/stdlib/src/actions/standard/entering/entering.ts`
- `packages/stdlib/src/actions/standard/going/going.ts`
- `packages/stdlib/src/actions/standard/attacking/attacking.ts`
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts`

In each, replace:

```typescript
if (interceptor?.postReport) {
  const additionalEffects = interceptor.postReport(...);
  for (const effect of additionalEffects) {
    events.push(context.event(effect.type, effect.payload));
  }
}
```

with:

```typescript
if (interceptor?.postReport) {
  const result = interceptor.postReport(target, context.world, context.player.id, interceptorData);
  applyInterceptorReportResult(events, '<primary event type>', result, context);
}
```

The `<primary event type>` is the action's domain event — `'if.event.pushed'`, `'if.event.opened'`, `'if.event.taken'`, etc.

If the action has both source and destination interceptors (e.g., `going` may have separate source-room and destination-room interceptors), both calls go through the same helper.

**Exit state**: Stdlib compiles. All postReport call sites use the helper. Existing interceptors haven't been migrated yet, so they return `InterceptorReportResult`-shaped values that won't compile — that's Phase 3.

### Phase 3 — Migrate every existing interceptor's postReport

**Tier**: Medium
**Budget**: 250 tool calls

Files (from `grep -l "postReport" stories/dungeo/src/interceptors/`):

| File | Likely intent | Action |
|------|---------------|--------|
| `rug-push-interceptor.ts` | **override** | Single rug-reveal message; replaces `pushing.pushed_nudged` |
| `glacier-throwing-interceptor.ts` | **override** | Single melt message replaces standard throw text |
| `receptacle-putting-interceptor.ts` | **override** | Inflation narration replaces standard put text |
| `inflatable-entering-interceptor.ts` | **override** | Puncture narration replaces standard enter text |
| `ghost-ritual-dropping-interceptor.ts` | **emit** | Two game.messages render in sequence (ghost appears, canvas spawns) — *not* an override |
| `melee-interceptor.ts` | **emit + override?** | Combat is multi-message; needs case-by-case read |

Each `postReport`'s return statement migrates from `[createEffect('game.message', {...})]` (or empty) to either:

- `return { override: { messageId, params } }` for single-message-replaces-standard, or
- `return { emit: [createEffect(...), createEffect(...)] }` for multi-event side-channels, or
- `return { override: {...}, emit: [...] }` if both, or
- `return {}` for the no-effect case.

For each migration, **read the OLD entity `on` handler** if it still exists in git history (or the migration commit) to confirm whether the original returned a single `game.message` (= override intent) or multiple events (= emit intent). The history is the source of truth for the original intent.

**Exit state**: All interceptors compile. Tests pass. Living `move rug` shows only the rug-reveal text, not double-rendered.

### Phase 4 — Tests and ADR

**Tier**: Small
**Budget**: 150 tool calls

- Add a strict regression transcript: `stories/dungeo/tests/transcripts/rug-push-message.transcript` that pins the **exact** output of `> move rug` (full string match, not contains) so duplicate rendering is detected immediately.
- Tighten `tests/transcripts/rug-trapdoor.transcript:30` from `[OK: contains "Moving the rug reveals a trap door"]` to a stricter assertion that fails if the standard pushed text also appears.
- Walkthrough chain runs end-to-end without regression.
- Add ADR `docs/architecture/adrs/adr-NNN-interceptor-report-result.md` documenting the override-vs-emit contract and the audit lesson.
- Update CLAUDE.md or methodology docs with: "When migrating an entity `on` handler, enumerate every event the handler emits, not just the state it mutates. Side-channel semantics like message overrides survive only if explicitly preserved."

**Exit state**: Regression baseline catches duplicate-rendering on rug push. Override-vs-emit contract documented as ADR. Methodology rule recorded.

### Phase 5 — Optional: similar audit on remaining migrations

**Tier**: Variable
**Budget**: TBD after Phase 4

Re-audit ISSUE-068's other migrations (troll given/thrown, troll knocked-out, demo statues/books) to confirm none of them silently lost override semantics like the rug did. This is preventive; do only if Phase 4 surfaces evidence the rug case wasn't unique.

## Risks and rollback

- **Breaking type change**: `ActionInterceptor.postReport`'s return type goes from `CapabilityEffect[]` to `InterceptorReportResult`. Any external consumer (none currently — internal API) would need to update. Inside this repo, the migration is the work.
- **Mis-categorization risk**: Phase 3 requires per-interceptor intent judgment. Misreading "this should be override" as "this should be emit" reintroduces the duplicate-rendering bug for that interceptor; misreading the other way silently drops a side-effect event. Mitigation: cross-check against pre-cleanup git history for each interceptor, and rely on Phase 4's strict-output transcripts to catch override misreads.
- **Rollback**: Each phase is a single commit. Reverting Phase 1 alone is meaningless (stdlib won't compile); revert as a 3-commit unit (Phase 1+2+3) if needed. Phase 4 is additive.

## Acceptance criteria

- AC-1: `ActionInterceptor.postReport` returns `InterceptorReportResult`. The old `CapabilityEffect[]` shape is no longer accepted by the type system.
- AC-2: All four-phase action sites in `packages/stdlib/src/actions/standard/` use `applyInterceptorReportResult` with their primary domain event type.
- AC-3: All Dungeo interceptors with a `postReport` return `InterceptorReportResult`. None return `CapabilityEffect[]`.
- AC-4: `> move rug` in the Living Room produces **exactly** one line of output text: "Moving the rug reveals a trap door." (or whatever the rug's override messageId resolves to). The pushed_nudged text does not appear.
- AC-5: Walkthrough chain (`stories/dungeo/walkthroughs/wt-*.transcript`) passes end-to-end with no behavior changes outside the rug-push and other override interceptors.
- AC-6: A new strict-output transcript test asserts AC-4 directly and would fail if duplicate rendering returned.
- AC-7: An ADR documents the contract and audit lesson.

## Out of scope

- The trapdoor's missing rich open-message (`"The door reluctantly opens to reveal a rickety staircase descending into darkness."`). That's a separate ISSUE-068 audit miss (the trapdoor `on` handler had two responsibilities — description update + custom message — and only the description part was migrated). Track as a follow-up issue once this fix is in.
- Generalizing the override semantic to story-level event handlers registered via `world.registerEventHandler`. The existing `processor.invokeEntityHandlers()` override path handles those correctly. No change needed there.
- The receptacle/balloon and inflatable puncture interceptors' override-or-emit calls — Phase 3 will resolve these per-interceptor; if any case is genuinely ambiguous, raise it for discussion before committing the migration.
