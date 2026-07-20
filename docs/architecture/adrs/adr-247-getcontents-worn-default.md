# ADR-247: `getContents()` includes worn items by default (opt-out, not opt-in)

## Status: DRAFT (Open Questions pending — do not implement the broad flip until ACCEPTED)

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
items. Callers that genuinely want worn items excluded pass an explicit
opt-out (`{ includeWorn: false }` — or a renamed positive option if the
interview prefers, e.g. `{ heldOnly: true }`).

The flip is **not a mechanical rename**: every one of the 64 call sites gets
individually audited (does it want everything, held-only, or doesn't-matter),
with the audit table recorded alongside this ADR before the change lands.

## Consequences

- `inventory.ts`'s explicit `includeWorn: true` becomes redundant and is
  removed in the same change (kept until then — it documents the bug).
- Any call site relying on the old filtered default without saying so would
  silently change behavior — hence the per-site audit requirement above.
- `ContentsOptions.includeWorn` (opt-in) becomes an opt-out surface; its
  naming is an open question below.
- Future query defaults follow the same principle: return everything, filter
  by explicit request (matches "portable by default").

## Session

Drafted in session 18953c (2026-07-20, autonomous overnight sweep) per plan
Phase 5 step 2. The narrow fix (step 1) and the rehydration fix (step 5) are
already landed and tested in that session; the broad flip (step 4) is gated
on this ADR reaching ACCEPTED.

## Open Questions

1. **Option naming for the opt-out.** Keep `includeWorn: false` (boolean flip
   of the existing option, no new vocabulary) or introduce a positive-named
   option (`heldOnly: true`) and deprecate `includeWorn` entirely? The
   project's no-double-negative surface preference suggests the positive
   name, but this is an internal API, not Chord syntax.
2. **Does any call site legitimately keep the filtered view?** The audit must
   answer per-site; if the answer is "none," should the opt-out option exist
   at all, or should held-only callers filter explicitly at the call site
   (`.filter(e => !isWornBy(e, holder))` via a behavior helper)?
3. **ClothingTrait parity.** The current filter checks both `WearableTrait`
   and `ClothingTrait`. Does ClothingTrait still exist as a separate surface
   worth preserving in whatever replaces the filter, or is it legacy to fold
   in during the same audit?
