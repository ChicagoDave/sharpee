# ADR-157: ActionInterceptor.postReport Returns InterceptorReportResult

## Status: PROPOSAL

## Date: 2026-04-24

## Relates to

- **ADR-118** (Action Interceptors) — this ADR refines the `postReport` return type without changing the rest of the interceptor contract.
- **ADR-106** (Domain Events as Override) — the override semantic this ADR makes explicit was, in the entity-`on` era, an implicit shape rule applied by `event-processor.invokeEntityHandlers()`. ADR-106 documented that rule for story-level handlers; this ADR applies the same idea to interceptor `postReport`, with the intent declared in the type system rather than inferred from an `Effect[]`'s shape.
- **ADR-097** (Domain Events Carry messageId) — this ADR depends on the property that domain events carry their narration messageId on `data.messageId`; "override the primary message" means rewriting that field on the action's emitted event.
- **GitHub #102** — the bug that surfaced this gap (rug push double-rendering).

## Context

`ActionInterceptor.postReport` originally returned `CapabilityEffect[]`. Two semantically different intents collapsed onto that shape:

1. **Override the standard message** of the action's primary domain event. Example: rug push reveals trap door — the rug-reveal text should *replace* `pushing.pushed_nudged` so the player sees one line, not two.
2. **Emit additional events alongside** the standard ones. Example: ghost ritual completion narrates two consecutive `game.message` lines that should both render.

Pre-cleanup, the OLD entity-`on` handler system encoded this distinction implicitly. `event-processor.invokeEntityHandlers()` (`packages/event-processor/src/processor.ts:269-326`) consumed a *single* `game.message` reaction as an override on the original event's `messageId` and filtered it out of the reactions list; multiple `game.message` reactions were a hard error. The shape of the return value carried the intent: one game.message = override, none = no-op, two+ = error.

ISSUE-068's audit migrated the rug `on['if.event.pushed']` handler to `RugPushInterceptor` and kept the same return type (`CapabilityEffect[]`), but the interceptor invocation path is the action's `report()` phase — *not* `invokeEntityHandlers`. The override branch never fires for interceptor effects, so what was an override in the old system became a side-emission in the new one. The user sees both messages rendered.

Live evidence (post-cleanup) — `> move rug` in the Living Room renders:

```
You give large oriental rug a push, but it doesn't move far.
Moving the rug reveals a trap door.
```

Pre-cleanup, only the second line rendered.

The walkthrough chain didn't catch this regression because the rug-trapdoor unit transcript asserted only `[OK: contains "Moving the rug reveals a trap door"]` — a substring match passes whether the message renders alone or alongside other text.

The same class of audit miss can recur for any interceptor whose OLD `on` handler returned a single `game.message` reaction. We currently have at least three confirmed cases (rug push, glacier melt, inflatable boat puncture) and one with composite intent (melee — message override + death-narration emit).

## Decision

The `ActionInterceptor.postReport` return type changes from `CapabilityEffect[]` to a discriminated structure that names the intent:

```typescript
interface InterceptorReportResult {
  /** Override the primary domain event's messageId (and optional params/text). */
  override?: {
    messageId: string;
    params?: Record<string, unknown>;
    /** Pre-rendered text fallback, used when messageId has no language template. */
    text?: string;
  };

  /** Emit additional events alongside the action's standard events. */
  emit?: CapabilityEffect[];
}
```

Both fields are optional and independent. Returning `{}` is the no-op case. Returning both `override` and `emit` is supported (e.g., melee combat overrides the standard "you attacked" message AND emits death narration).

A single canonical helper applies the result:

```typescript
function applyInterceptorReportResult(
  events: ISemanticEvent[],
  primaryEventType: string,
  result: InterceptorReportResult,
  eventFactory: (type: string, data: Record<string, any>) => ISemanticEvent
): void
```

- For `override`: the helper finds the event with `type === primaryEventType` and copies `messageId`, `params` (if set), and `text` (if set) onto its `data`. If no such event exists in the array, the helper logs a warning and continues — the override is a no-op rather than a hard error, since some actions only emit their primary message-bearing event in subset-paths (e.g., `going` only emits `if.event.went` on dark/blocked transitions).
- For `emit`: each `CapabilityEffect` is converted to an `ISemanticEvent` via the factory and appended to `events`.

Every four-phase action that calls `interceptor.postReport` (`pushing`, `entering`, `switching_on`, `putting`, `going`, `throwing`, `attacking`, `dropping`) invokes the helper. The action declares the primary event type at the call site (e.g., `'if.event.pushed'` for pushing, `'if.event.put_in'` or `'if.event.put_on'` for putting depending on preposition).

## Consequences

**Constraints this places on future work:**

- New interceptors must declare `override` vs `emit` intent at the type level. Returning `[createEffect('game.message', ...)]` no longer compiles.
- New four-phase actions that adopt interceptors must call `applyInterceptorReportResult` with their primary event type. Manually appending interceptor effects to `events` reintroduces the bug.
- The override `text` field must be preserved when a future interceptor needs to flow pre-rendered strings through the text-service's inline-text fallback. Removing `text` would silently break the melee combat narration.

**Things this enables:**

- A reader of an interceptor's `postReport` immediately sees the intent. `{ override: {...} }` and `{ emit: [...] }` are self-documenting.
- The double-rendering bug class is mechanically prevented: an interceptor that wants to replace the standard message can't accidentally end up emitting it alongside.
- Multiple-override conflict is structurally impossible per result (a single `override` field, not an array).
- Future ADR-106-style improvements to the override semantic apply uniformly to interceptors and story handlers via the shared helper.

**What this does not change:**

- Story-level event handlers registered via `world.registerEventHandler` (ADR-106): they continue to use `Effect[]` and the `event-processor.invokeEntityHandlers()` override path. That path is correct and untouched.
- The other interceptor hooks (`preValidate`, `postValidate`, `postExecute`, `onBlocked`): unchanged. Only `postReport` migrates.
- The `CapabilityEffect` type itself: still used inside `emit` arrays.

**Migration cost (one-time):**

- 8 stdlib action call sites updated.
- 6 Dungeo interceptors with `postReport` migrated. Per-interceptor judgment recorded in the ISSUE-074 plan: 4 override (rug, glacier, inflatable, melee), 2 emit (receptacle, ghost ritual), 1 hybrid (melee — both override and emit).
- Regression tightened on `tests/transcripts/rug-trapdoor.transcript` with `[OK: not contains "doesn't move far"]` to lock in single-rendering on first push.

## Audit Lesson

When migrating an entity-`on` handler to a capability or interceptor pattern, the audit must **enumerate every kind of effect the handler emits**, not just the state the handler mutates. ISSUE-068's plan categorized the rug pushed handler as "Capability behavior on PushableTrait for `if.action.pushing`" without naming the side-channel responsibility (single-`game.message`-as-override). The structural type signature `Effect[]` carries the intent; `CapabilityEffect[]` does not.

Recommended migration discipline (candidate for CLAUDE.md amendment):

> When migrating an entity `on` handler to a capability behavior or action interceptor, document for each handler:
>
> - **What state it mutates** (world entities, traits, attributes).
> - **What events it emits, and what semantic each carries** (override vs append; single message vs multi-line narration; side-effect events vs message reactions).
> - **What the dispatch layer did with those emissions** in the old system (consumed as override, forwarded to text-service, processed as reactions, etc.).
>
> Migrate each responsibility explicitly. If the new pattern has no equivalent for one of them, flag the gap before committing — silently dropping a side-channel responsibility is the failure mode this discipline prevents.

## Session

This ADR was produced in the session following GH #102, on branch `issue-074-interceptor-postreport-override`. The implementation plan is `docs/work/interceptor-contract/plan-20260424-postreport-override.md`.
