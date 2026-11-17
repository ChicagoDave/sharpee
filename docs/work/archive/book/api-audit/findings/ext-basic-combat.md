# Findings — @sharpee/ext-basic-combat

## Author-relevance
Author-facing opt-in extension (documented in genai-api as combat.md). The book would cite the one-call setup (`registerBasicCombat()`), the `CombatService` API (`resolveAttack`/`canAttack`/`calculateHitChance`/`getHealthStatus`), the `CombatMessages` ID table, and the pattern note that stories with custom combat register their own interceptor/resolver instead.

## Naming
Clean. Verb-first functions (`registerBasicCombat`, `createCombatService`, `applyCombatResult`, `getHealthStatusMessageId`). Types are clear nouns (`CombatContext`, `CombatResult`, `CombatValidation`, `HealthStatus`, `CombatMessageId`). `I`-prefix used only on `ICombatService` (matches the core/world-model convention; the rest of the package has no interfaces needing it). No abbreviations. `ApplyCombatResultInfo` is a slightly awkward name (the return type of `applyCombatResult`) but unambiguous. `BasicCombatInterceptor` / `basicNpcResolver` casing correctly signals const-singleton vs value.

## Should-be-internal
None obvious — this is a tight, intentional surface. `BasicCombatInterceptor` and `basicNpcResolver` are the two registration values stories may need if they wire combat manually rather than via `registerBasicCombat()`, so their export is justified. `ApplyCombatResultInfo` is borderline (only ever a return type) but harmless.

## API shape
Strong and well-typed — the cleanest of the four packages.
- Param ordering consistent (`applyCombatResult(target, result, world)`, `CombatContext` bundles attacker/target/weapon/world/random).
- All functions have explicit return types.
- `any` is absent; the only loose types are the deliberate message payloads `messageData: Record<string, unknown>` on `CombatResult`/`CombatValidation` (correct for variant message data).
- `calculateHitChance(attackerSkill, defenderSkill, weaponBonus)` is three positional `number`s — mildly error-prone (easy to swap attacker/defender), but documented (base 50%, ±1%/point, clamped 10-95%).
- `CombatResult` exposes `messageId: string` (plain string) while a `CombatMessageId` literal-union type exists in the same package — a missed opportunity to tighten the field to the union.
- `BasicCombatInterceptor: ActionInterceptor` and `basicNpcResolver: NpcCombatResolver` lean on cross-package types (`@sharpee/world-model`, `@sharpee/stdlib`); their real contract (the sharedData keys `attackResult`/`combatResult`/`usedCombatService`) is only in prose comments, not the type.

## Documentation (TSDoc)
Excellent — roughly 95-100% documented. Module header with a worked `@example`, every interface field has a doc comment, every method on `CombatService` documents its algorithm. ADR-072 cited. The interceptor/resolver consts document their sharedData side effects in prose.

## Book highlights
- `registerBasicCombat()` — the one-liner enable; the index.d.ts `@example` is book-ready, plus the "don't call this if you register your own combat" caveat.
- `CombatService` / `createCombatService` / `ICombatService` — the resolution API: `resolveAttack(CombatContext): CombatResult`, `canAttack`, `calculateHitChance` (the 50%-base ±1%/point clamp-10-95 formula is worth quoting), `getHealthStatus`.
- `CombatResult` / `CombatContext` — the I/O shapes for a combat turn.
- `CombatMessages` + `CombatMessageId` + `getHealthStatusMessageId` / `HealthStatus` — the semantic message-ID table the language layer renders (book example of the message-ID indirection pattern).
- `applyCombatResult` — applying damage/death/inventory-drop to the world (returns dropped item IDs).
- `BasicCombatInterceptor` / `basicNpcResolver` — for stories wiring combat manually (capability-dispatch interceptor + NPC resolver).
