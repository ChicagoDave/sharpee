# ADR-215: Chord Extension-Use Surface & Combat

## Status: ACCEPTED (2026-07-14 — direction fixed by ADR-214 §5/OQ2/OQ6; designed via interview the same session; all six open questions resolved; third-party extensions deferred to a later ADR)

> Child of ADR-214 (parity). ADR-214 §5 audited the plugin/extension system;
> OQ2 resolved a top-level **`use <extension>`** declaration that admits an
> extension's published vocabulary into the catalog only when used, and OQ6
> resolved that platform extensions ship with the runtime so a story using only
> them **stays pure IR**. This ADR designs the mechanism, the vocabulary-
> contribution contract, combat, and NPC/state-machine depth. The largest child
> ADR. Reserved by name in ADR-214 §8.

## Date: 2026-07-14

## Context

The platform runs three turn plugins (priority-ordered NPC 100, state-machine 75,
scheduler 50) plus opt-in extensions like basic combat — **all TypeScript-
registered**. Chord has **no** `use`/`enable`/`register` surface (confirmed
2026-07-14: `catalog.ts` has no combat/NPC vocabulary; `person` maps to a bare
`h.actor`, no `NpcTrait`/`CombatantTrait`; only the scheduler plugin is auto-wired
by story-loader). Grounding of what an extension would expose:

- **Plugin contract** — `TurnPlugin { id, priority, onAfterAction, getState?,
  setState? }` (`packages/plugins/src/turn-plugin.ts:13-28`); `PluginRegistry.
  register` (`plugin-registry.ts:9-69`).
- **Combat** — `registerBasicCombat(world)` does
  `world.registerActionInterceptor(COMBATANT, 'if.action.attacking', …)` +
  `registerNpcCombatResolver(…)` (`extensions/basic-combat/src/index.ts:47-54`);
  consumes `CombatantTrait` (`ICombatantData`: health, maxHealth, skill,
  baseDamage, hostile, canRetaliate, dropsInventory, …) and `WeaponTrait`
  (damage, skillBonus, isBlessed, glowsNearDanger, …). `CombatService`
  resolve/apply in `combat-service.ts`.
- **NPC** — `INpcService.registerBehavior(NpcBehavior)`; standard behaviors
  `guard`, `passive`, `wanderer`, `follower`, `patrol`
  (`stdlib/src/npc/behaviors.ts`); `NpcTrait` (behaviorId, hostile, canMove,
  allowedRooms/forbiddenRooms, goals[], …). No general pathfinder (one-step
  reachability only).
- **State machine (ADR-119)** — `StateMachineRegistry.register(definition,
  bindings)`; `StateMachineDefinition { id, initialState, states }`, states with
  `onEnter`/`onExit`/`terminal`, transitions with action/event/condition triggers,
  guards, effects, and `$role` bindings (`plugin-state-machine/src/types.ts`).

ADR-214 committed to making all of this reachable from Chord via `use`.

## Decision

*Direction fixed by ADR-214 §5/OQ2/OQ6; mechanism being designed here.* This
ADR specifies:

### `use` is top-level, one per extension (resolved 2026-07-14)

A **static top-of-file** declaration, **one `use` per shipped extension** —
`use combat`, `use state-machines` — mirroring the platform's plugin/extension
packages. Each `use` (a) triggers the extension's `register*(world)` / plugin
registration at load, and (b) admits *that extension's* published vocabulary into
the composable catalog. It is static so the analyzer sees the admitted vocabulary
at compile time (no conditional/scoped `use`). No sub-feature scoping and no
coarse bundles — one subsystem per `use`.

**Exception — the NPC plugin auto-wires (Q4).** NPCs are common enough to be
**core**: the NPC plugin registers by default (as the scheduler does today) and
its behavior vocabulary is always in the catalog — there is **no `use npcs`**.
Combat and state-machine remain `use`-gated. This deliberately breaks the uniform
"one `use` per extension" rule for the common case (owner call, 2026-07-14).

### Vocabulary contribution — a static data manifest (resolved 2026-07-14)

Each extension ships a **static, declarative vocabulary manifest** (data: the
kind nouns, trait adjectives, verbs, and state words it adds, with their intended
trait mappings). The compiler **reads the manifest** for each `use`d extension and
merges its words into the composable catalog — so the analyzer stays
**platform-free** (it consumes data, never executes extension code, preserving
the browser-safe boundary `catalog.ts` protects). Consequences:

- **Names vs mappings split** (mirrors today's `catalog.ts` names vs
  `story-loader` mappings): the manifest declares the *words* the analyzer admits;
  the *adjective→trait composition* is implemented on the loader/platform side
  when the extension is registered.
- **Conformance test** closes the drift risk: a co-located test asserts each
  manifest matches the extension's actual trait/behavior registrations (every
  declared adjective maps to a real trait the extension registers).
- **Third-party-friendly**: an extension adds vocabulary by shipping a manifest
  alongside its code — no compiler rebuild.
- Each manifest's admitted words are auditable for the ADR-210 ratchet.

### Combat spelling — adjectives with `with`-stats (resolved 2026-07-14)

`combatant` and `weapon` are **trait adjectives** (like `openable`), applied on a
`create` line. Numeric stats use the **existing `with <field> <value>` data
grammar** (as `lockable with key`, supporter capacity): `create the troll,
person, combatant with health 20, skill 40`; `create the sword, weapon with
damage 5, skill-bonus 2`. The extension's **manifest declares which data fields
each adjective accepts** (and their types), so the analyzer validates the `with`
fields. This generalizes to any extension: a contributed trait adjective may
carry typed data fields, declared in the manifest — the pattern for authoring
non-boolean trait state in Chord.

### NPC & state-machine depth (resolved 2026-07-14)

- **NPC behaviors are authorable vocabulary.** The standard library —
  `guard`, `passive`, `wanderer`, `follower`, `patrol` — becomes trait-adjective
  vocabulary with their params via the `with`/data grammar: `person, guard`;
  `person, wanderer with move-chance 50`; `person, patrol route [Hall, Study,
  Hall]`. The full behavior library is reachable declaratively (it is core
  vocabulary, since the NPC plugin auto-wires); custom per-turn logic still uses
  `on every turn` (compiles to a daemon). NPC numeric/data fields (hostile,
  canMove, allowedRooms) follow the same `with`-data pattern.
- **State machines**: the full ADR-119 depth — `onEnter`/`onExit` effects,
  `terminal` states, named machines, and `$role` bindings — is reachable under
  **`use state-machines`**. **Gating scope (pinned 2026-07-14):** `use
  state-machines` gates **only the new ADR-119 depth**; Chord's **existing core
  `states:` + `select on` + `change` surface stays unconditional** (no `use`
  required) exactly as it works in shipped stories. This is deliberate — gating
  the existing surface would be a **breaking change** to stories already using
  `states:`. So a story writes `states:`/`select`/`change` with no `use`; adding
  `use state-machines` only *admits the additional depth* on top. Exact spellings
  for the depth land as ratchet entries under this ADR.

### Trusted registry — runtime-bundled (resolved 2026-07-14)

A **registry compiled into the runtime** maps each `use` name to its bundled
`register*(world)` (e.g. `combat → registerBasicCombat`, `state-machines →
registerStateMachines`). `use` resolves **only** against this fixed set; an
unknown name is a **load error**. Because every enable-able extension ships with
the runtime and no author TypeScript crosses the boundary, a `use`-only story
**stays pure IR** (browser/hosted-runnable) — cleanly distinct from a
`define … from "./mine.ts"` author hatch (which remains impure per ADR-210 AC-4).
This is the concrete form of ADR-214 OQ6.

### Loader mapping

Each `use <name>` → the loader looks up `<name>` in the trusted registry and
calls its bundled registration against the world at load; the matching manifest's
vocabulary is merged into the catalog at compile time. NPC (auto-wired) registers
unconditionally.

### An extension's contribution surface (three parts)

A trusted extension may contribute **all three** of the following at `use` time —
the full contract a bundled extension registers:

1. **World registration** — its `register*(world)` (interceptors, resolvers,
   plugins), e.g. `registerBasicCombat(world)`.
2. **Chord vocabulary** — its static manifest (kind nouns / trait adjectives with
   typed `with`-fields / verbs / state words), merged into the catalog only when
   used.
3. **Browser channel renderers** — an extension may register **channel +
   renderer** pairs with the channel registry (the `Story.registerChannels`
   surface), so a custom channel declared in Chord (ADR-216) has a renderer to
   display it. This closes the ADR-216 renderer caveat: a novel renderer ships
   *here*, in a trusted extension, keeping the story pure IR — it is not author
   code. (ADR-216 declares the *channel* as a data projection; ADR-215 is where a
   novel *renderer* for it comes from.)

All three ship with the runtime (trusted registry), so a `use`-only story stays
pure IR regardless of which parts an extension exercises.

### Scope — platform extensions only (resolved 2026-07-14)

ADR-215 designs `use` for **platform-bundled extensions only** (the trusted
runtime registry). **Third-party / author-supplied extensions** — which reopen
the author-code/pure-IR trust boundary — are **deferred to their own later ADR**.
This keeps ADR-215 focused and the pure-IR guarantee (Q5) clean.

## Consequences

- Chord gains a `use <extension>` surface, closing ADR-214 §5's load-bearing gap:
  combat (`use combat`), state machines (`use state-machines`), and full NPC depth
  (core/auto-wired) all become reachable — combat goes from entirely unreachable
  to authorable.
- The **static-manifest** mechanism keeps the analyzer platform-free; extension
  vocabulary is data, auditable for the ratchet, and third-party-ready even though
  third-party `use` is deferred.
- The **runtime-bundled trusted registry** preserves pure IR for `use`-only
  stories (browser/hosted-runnable), the concrete form of ADR-214 OQ6 and a
  refinement of ADR-210 AC-4.
- NPC auto-wiring makes NPCs core (no `use npcs`), a deliberate exception to the
  one-`use`-per-extension rule for the common case.
- Extension trait adjectives carrying typed `with`-data fields (declared in the
  manifest) becomes the general pattern for non-boolean trait state in Chord.

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4. Concretely:

- **AC-1 — combat reachable.** A `use combat` fixture with a `combatant` NPC (`with
  health`/`skill`) and a `weapon` resolves a real attack via the basic-combat
  interceptor; the audit's combat rows flip to reachable.
- **AC-2 — vocabulary gating.** `combatant`/`weapon` are load errors **without**
  `use combat` and valid **with** it (analyzer admits manifest vocab only when
  used); a manifest-conformance test asserts every declared adjective maps to a
  real registered trait.
- **AC-3 — pure IR preserved.** A `use combat` / `use state-machines` story
  produces `hasHatches: false` and loads in the browser/hosted profile (guards
  ADR-214 OQ6 / ADR-210 AC-4); an unknown `use foo` is a load error.
- **AC-4 — NPC + additivity.** An NPC `guard`/`patrol` fixture runs without any
  `use`; existing stories (cloak, zoo) compile unchanged.

## Session

Session ae2a61 (2026-07-14) — created as a grounded stub for the ADR-214 §8
roadmap, then designed via interview the same session (6 open questions resolved).
Parent: ADR-214 §5/OQ2/OQ6. Related: ADR-210 (grammar ratchet + pure-IR AC-4),
ADR-119 (state machines), ADR-090 (capability dispatch). The largest child ADR;
third-party extensions deferred to a later ADR.
