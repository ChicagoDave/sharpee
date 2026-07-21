# ADR-247: `getContents()` includes worn items by default (opt-out, not opt-in)

## Status: ACCEPTED + IMPLEMENTED (2026-07-20 accepted, session 17e36e — all three Open Questions resolved via interview. Amended 2026-07-21, session 99aee6: Q2's full-census audit clause SUPERSEDED by David's ruling — targeted actor-scoped audit instead; see Decision. IMPLEMENTED 2026-07-21, session 99aee6, on David's go-ahead: filter deleted, getCarriedAndWorn added, includeWorn + ClothingTrait removed, 60-site audit at docs/work/adr-247-getcontents-worn-default/audit.md; all package suites + dungeo chain + fernhill green, --browser build clean.)

## Date: 2026-07-20

## Parent: platform-issue-sweep plan Phase 5 (`docs/work/platform-issue-sweep/plan.md`), from David's 2026-07-20 triage of issue #8 (worn items invisible to INVENTORY). Related: `packages/world-model/CLAUDE.md` (items are portable by default), ADR-189 (default-trait registry — the "a type keeps the behavior its name promises" principle this extends to a query default).

## Context

`WorldModel.getContents()` filters worn items OUT unless the caller passes
`{ includeWorn: true }` (`WorldModel.ts:979-988`, checking both
`WearableTrait.isWorn` and `ClothingTrait.isWorn`). That default inverts the
platform's own conventions:

- **World-model's stated principle is inclusion by default** — items are
  portable by default; entities appear unless something excludes them. A
  container's contents ARE its contents; "worn" is a state, not a location.
- **Callers assume they receive everything.** `inventory.ts` called it
  optionless and then split worn/held from the result — so `wear vest` →
  `inventory` printed "You aren't carrying anything." (reproduced live,
  session e5911b; fixed narrowly this session with an explicit
  `includeWorn: true` at that call site).
- **The filter itself was silently broken across save/restore/undo** until
  this session: it reads the `isWorn` prototype getter, which raw-JSON trait
  rehydration lost (fixed — `rehydrateTrait` in
  `packages/world-model/src/traits/implementations.ts`, wired through the
  `entities/trait-rehydrator.ts` leaf seam). That the platform ran for months
  with the filter randomly inert post-restore, without visible complaints
  beyond issue #8, is itself evidence few call sites genuinely depend on the
  filtered default.

A census (2026-07-20, non-test source) counts **64 `getContents(` call
sites** across packages/. Known-interesting groups:

- `VisibilityBehavior` passes `includeWorn: true` explicitly where it matters
  (worn light sources must illuminate; `getVisibleContents` keeps it).
- Scope/visibility paths want worn items visible (an NPC's worn cloak is
  visible on them).
- `inventory.ts` now opts in explicitly (narrow fix, this session).
- Some listing paths (e.g. LOOK's `openContainerContents`) list container
  contents where worn items cannot occur (containers don't wear things) —
  the default is irrelevant there.
- The rare "held-only" semantics (weight/burden calculations? drop-all?)
  are the candidates for a genuine explicit opt-OUT.

## Decision

Flip the default: `getContents()` returns ALL direct contents including worn
items — **unconditionally, with no filter option** (Q1 resolved 2026-07-20).
`ContentsOptions.includeWorn` is deleted. Callers that need the carried/worn
split use a new WorldModel partition method instead of filtering:

```typescript
// One call, two lists (David's ruling: "the usual thinking is you'd have
// one call that returns two lists: carried and worn")
const { carried, worn } = world.getCarriedAndWorn(actorId);

// inventory: prints both lists; burden: uses .carried only
// everyone else: getContents() — no options, returns everything
```

Partition signature: `getCarriedAndWorn(holderId: string): { carried:
IFEntity[]; worn: IFEntity[] }` — a partition of the holder's direct
contents by worn state; for holders with no wearables, `worn` is empty.

The audit also covers `getAllContents()` (WorldModel.ts:1087), whose
`includeWorn` plumbing and always-include-when-recursing special case are
deleted with the option.

**Audit scope (amended 2026-07-21, superseding Q2's full-census clause):**
the original ruling mandated a per-site audit of the full census — then
counted at 64 sites; re-grounding at implementation time found the real
count is **176 non-test sites across 102 files**, and the census-table
approach was re-examined. David's amendment ruling: the exhaustive table
is risk-aversion the test surface has outgrown. Worn state exists only on
actors, so the flip is a no-op by construction for every room/container/
supporter holder — the sites that can change behavior are the
**actor/player-scoped `getContents` calls**, and only THOSE get the
committed per-site audit (does it want everything, held-only →
`getCarriedAndWorn().carried`, or doesn't-matter). The remaining sites
are covered by the regression surface (per-package suites, the dungeo
walkthrough chain, the transcript batches) rather than a table. No call
site retains a filtered view either way — the option is deleted, not
defaulted (that half of Q2 stands).

## Consequences

- `inventory.ts`'s explicit `includeWorn: true` becomes redundant and is
  removed in the same change (kept until then — it documents the bug);
  inventory migrates to `getCarriedAndWorn()`, which also replaces its
  hand-rolled worn/held split of the flat result.
- Any call site relying on the old filtered default without saying so would
  silently change behavior — hence the actor-scoped audit above (only
  actor holders can carry worn state, so only those sites can change).
- `ContentsOptions.includeWorn` is deleted outright — no opt-out surface
  replaces it. Held-only semantics are expressed via
  `getCarriedAndWorn().carried`, worn-only via `.worn`.
- Future query defaults follow the same principle: return everything, filter
  by explicit request (matches "portable by default").
- **ClothingTrait is deleted** in the same audit/flip change (Q3 resolved
  2026-07-20 — David confirmed deletion). It duplicated `IWearableData` as a
  separate trait type with nothing outside world-model using it (stories: one
  string case in dungeo's GDT debug command). The worn-check in
  `getCarriedAndWorn()` — and everywhere else — becomes WearableTrait-only.
  Clothing extras (material/style/damageable/condition) return later as
  WearableTrait data if ever needed. Deletion touches: world-model barrels,
  `implementations.ts` rehydration table, `all-traits.ts`, the GDT `do.ts`
  case, and the trait file itself.

## Acceptance Criteria

- The **actor-scoped** audit table (amended scope, 2026-07-21) is committed
  alongside this ADR before the flip lands, classifying every actor/player
  `getContents` site (everything / held-only → `.carried` /
  doesn't-matter); non-actor sites are covered by the full regression
  surface, not tabulated.
- `ContentsOptions.includeWorn` and `ClothingTrait` no longer exist anywhere
  in the codebase (source, barrels, rehydration table, GDT `do.ts` case).
- New tests: a worn item appears in LOOK/EXAMINE contents where visibility
  says it should; `getCarriedAndWorn()` partitions correctly; the partition
  survives save/restore (rehydrated `isWorn`).
- All package suites green + type-clean.

## Session

Drafted in session 18953c (2026-07-20, autonomous overnight sweep) per plan
Phase 5 step 2. The narrow fix (step 1) and the rehydration fix (step 5) are
already landed and tested in that session; the broad flip (step 4) is gated
on this ADR reaching ACCEPTED.

