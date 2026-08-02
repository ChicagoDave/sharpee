# Session Plan: Implement ADR-215 (Chord Extension-Use Surface & Combat)

**Created**: 2026-07-14
**Overall scope**: Land W6 of the Chord parity roadmap — the `use <extension>` declaration, the static vocabulary-manifest mechanism (+ conformance test), the runtime-bundled trusted registry (pure-IR preserved), combat (`use combat`: `combatant`/`weapon` adjectives with `with`-stats, `attack`), NPC as core auto-wired vocabulary (`guard`/`passive`/`wanderer`/`follower`/`patrol`), state-machine depth under `use state-machines` (full ADR-119 model), and the three-part extension contribution surface (world registration + vocabulary + browser channel renderers) that ADR-216/W7 depends on. **This is the largest workstream in the roadmap (XL).**
**Bounded contexts touched**: Chord composable vocabulary/analyzer (`packages/chord`), story loading (`packages/story-loader`), the trusted-extension registry (new, story-loader or a small new package), world model (combat/NPC/state-machine traits **already exist** — this workstream exposes them, does not add or change them), stdlib (NPC behavior library, already exists), extensions (`packages/extensions/basic-combat`, already exists), and the ADR-210 grammar ratchet.
**Key domain language**: extension-use surface, vocabulary manifest, trusted runtime-bundled registry, pure-IR profile / hasHatches (ADR-210); combatant / weapon / attack (basic-combat); NPC behavior vocabulary — guard/passive/wanderer/follower/patrol; state machine — state, transition, guard, effect, onEnter/onExit, terminal, `$role` binding (ADR-119); composable vocabulary / parity gap (ADR-214).

## CRITICAL FRAMING — access, not implementation

Combat, NPC, and state machines are **already-implemented platform systems** (`registerBasicCombat`, `INpcService.registerBehavior`, `StateMachineRegistry`). This workstream does **not** reimplement any of that logic. It builds the Chord **surface that exposes** it: the `use` declaration, per-extension vocabulary manifests (data describing what words map to what already-registered traits), loader wiring that calls the extension's existing `register*(world)`, and catalog admission gated on `use`. Any phase that starts writing combat resolution logic, pathfinding, or state-transition execution from scratch is a scope error — stop and check against the grounding below before proceeding.

## Prerequisites / entry gate (read before starting any phase)

This is a **plan-ahead** — written now so the design is captured while fresh, but **not to be started** until its entry conditions are met. Per CLAUDE.md, all of this is platform work (`packages/chord`, `packages/story-loader`, `packages/world-model`, `packages/stdlib`, `packages/extensions`) and requires David's **explicit go-ahead before any code**, separate from ADR-215 being ACCEPTED.

1. **W1 (ADR-218 foundations) must be BUILT first.** W1 establishes the catalog-adjective mechanics, the loader trait-switch pattern, the grammar-ratchet discipline, and the `with <field> <value>` data-authoring pattern that this plan's combat stats reuse. W1's plan (`docs/work/chord-foundations/plan.md`, **do not modify**) is itself not yet started as of this writing (its Phase 1 is CURRENT, gated on David's go-ahead per its own session summary). **Do not begin any phase of this plan before W1 is built.**
2. **This plan does not need W3/W4/W5** (liquids, doors, timers) — the roadmap marks W6 as independent of those chains, needing only W1's ratchet/catalog infra.
3. **W7 (ADR-216 emit/media) depends on this plan.** This workstream establishes the vocabulary-manifest mechanism, the `use`/trusted-registry infrastructure, and the renderer-contribution surface that W7's custom-channel renderers ride. Phase 5 below is the piece W7 specifically waits on.
4. **Per-workstream go-ahead**, not a blanket one. Completing W1 does not authorize starting this plan — David must separately authorize W6 implementation.

Standing constraints across every phase (CLAUDE.md):
- Never auto-retry a failed build or test — report and wait for explicit instruction.
- Never delete files without confirmation.
- Build via `./repokit build`; test fixtures via the bundle: `node dist/cli/sharpee.js --test <fixture>.story` (never the slow per-package path).
- Every vocabulary/syntax change is a dated entry in `docs/architecture/chord-grammar-changes.md` **before** the implementation that depends on it (ADR-210 ratchet discipline).
- Third-party/author-supplied extensions are explicitly **out of scope** — deferred to a later ADR (ADR-215 §Scope). Do not design for it; the trusted registry is closed and compiled-in.

## Grounding (confirmed 2026-07-14, cite exact locations when implementing)

- **Plugins**: `TurnPlugin { id, priority, onAfterAction, getState?, setState? }` (`packages/plugins/src/turn-plugin.ts:13-28`); `PluginRegistry.register` (`plugin-registry.ts`); priorities NPC 100 / state-machine 75 / scheduler 50 (scheduler already auto-wired today by `packages/story-loader/src/loader.ts:425-441` — the precedent this plan's NPC auto-wiring and `use` registry both follow).
- **Combat**: `registerBasicCombat(world)` → `world.registerActionInterceptor(COMBATANT, 'if.action.attacking', …)` + `registerNpcCombatResolver(…)` (`packages/extensions/basic-combat/src/index.ts:47-54`). `CombatantTrait` (`ICombatantData`: health/maxHealth/skill/baseDamage/hostile/canRetaliate/dropsInventory/…, `packages/world-model/src/traits/combatant/`), `WeaponTrait` (damage/skillBonus/isBlessed/glowsNearDanger/…, `packages/world-model/src/traits/weapon/`). Both traits already exist — no world-model change.
- **NPC**: `INpcService.registerBehavior`; standard behaviors `guard`/`passive`/`wanderer`/`follower`/`patrol` (`packages/stdlib/src/npc/behaviors.ts`); `NpcTrait` (behaviorId/hostile/canMove/allowedRooms/forbiddenRooms/goals). NpcPlugin priority 100, already registers today only for stories that wire it manually via TS.
- **State machines**: `StateMachineRegistry.register(definition, bindings)`; `StateMachineDefinition {id, initialState, states}`, states with onEnter/onExit/terminal, transitions (action/event/condition triggers), guards, effects, `$role` bindings (`packages/plugin-state-machine/src/types.ts`). Chord today reaches only a partial slice via `states:`/`select on`/`change` (ratchet entries D2/D4, 2026-07-11).
- **Chord today**: no `use`/`enable` surface at all — `packages/chord/src/catalog.ts` has no combat/NPC vocabulary; `person` maps to a bare `h.actor` (no `NpcTrait`/`CombatantTrait`); only the scheduler plugin is auto-wired by the loader. This is the exact gap ADR-214 §5 audited and ADR-215 closes.

## References consulted
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — the ACCEPTED design this plan implements: `use` mechanism, static manifest contract, combat spelling, NPC/SM depth, trusted registry, three-part contribution surface, third-party extensions deferred.
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` §5/§8 — parent umbrella; §5 is the audited plugin/extension gap this ADR closes (OQ2 `use`, OQ6 pure-IR trust boundary); §8 fixes W6 as step 5 of "foundations first," after catalog/door/dispatch/timer workstreams.
- `docs/architecture/adrs/adr-119-state-machines.md` — the full state-machine model (states, transitions, triggers, guards, effects, onEnter/onExit, terminal, `$role` bindings) Phase 4 below extends Chord's partial surface to reach; status PROPOSED in the doc header but the design is already implemented and registered via `@sharpee/plugin-state-machine` per ADR-215's grounding — this plan exposes the existing runtime, it does not resolve ADR-119's own open questions (parallel machines, hierarchical states, programmatic guards/effects are out of scope here; only the declarative model ADR-215 names is exposed).
- `docs/work/chord-parity/roadmap.md` — sequences W6 after W1/W2 (needs only W1's ratchet/catalog infra), independent of W3/W4/W5, and as W7's hard prerequisite for custom-channel renderers; names W6's five internal concerns (use surface, manifest+conformance, combat, NPC, state-machine depth, trusted registry, three-part contribution surface).
- `docs/work/chord-foundations/plan.md` — W1's plan (read only, not modified); this plan's Phase 1 entry state assumes W1's Phases 1-4 are BUILT (catalog-adjective + loader trait-switch + ratchet mechanics + `with`-data pattern all proven there).
- `docs/architecture/adrs/adr-210-story-language.md` — the pure-IR profile / `hasHatches` discrimination (AC-4) that ADR-215 refines: `use <platform-extension>` is declarative enablement of trusted runtime-bundled code, categorically distinct from `define … from` author hatches, and must not set the hatch flag.
- `docs/architecture/chord-grammar-changes.md` — the ratchet log's existing format and precedent entries (e.g. D2/D4 state-adjective and story-state entries this plan's Phase 4 extends); every new `use`/manifest/combat/NPC/SM spelling in this plan follows this log's dated-entry convention.
- `docs/architecture/adrs/adr-216-chord-emit-payload-and-media.md` — the downstream consumer: ADR-216 designs custom-channel *declaration* but explicitly defers the channel's *renderer* to a trusted extension registered under this ADR's three-part contribution surface (Phase 5 below is what unblocks it).
- `docs/work/stdlib-reference/chord-availability-audit.md` — the parity scoreboard; §8 "NPCs, conversation & combat" names the exact gap rows (`attacking`, `a person` NPC/combatant/character-model gaps) this plan's phases flip to reachable.
- `docs/context/project-profile.md` — confirms TypeScript strict-mode conventions, the 4-file stdlib action convention, and `packages/extensions/*`/`packages/plugin-state-machine`/`packages/plugin-npc` as live, maintained packages this plan's phases touch.

## Phases

### Phase 1: `use` declaration, trusted registry, and vocabulary-manifest mechanism (infra)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Extension-contribution bounded context — the mechanism every later phase builds on. No combat/NPC/SM logic is written here; this phase only builds the pipe.
- **Entry state**: W1 (ADR-218) is BUILT. David's explicit go-ahead for this plan's implementation has been given.
- **Deliverable**:
  - Ratchet entry (dated, before code): the `use <extension>` top-level declaration — static, top-of-file, one per shipped extension, no conditional/scoped `use`, no sub-feature scoping or bundles; note the NPC exception (auto-wired core vocabulary, no `use npcs` — detailed in Phase 3).
  - `packages/chord`: parser/AST support for `use <name>` (parses before `create`/`define` lines); a `VocabularyManifest` data type (kind nouns, trait adjectives with typed `with`-data field declarations, verbs, state words, each with its intended trait mapping — data only, no executable code); analyzer logic that merges a `use`d extension's manifest into the composable catalog at compile time, keeping the analyzer platform-free (it reads manifest data, never executes extension code).
  - `packages/story-loader` (or a small new package if the trust boundary is cleaner there — decide against ADR-215's "runtime-bundled" framing, not story-loader convenience): the **trusted runtime-bundled registry** mapping each fixed `use` name to its bundled `register*(world)` — `combat → registerBasicCombat` as the first (and, this phase, only) entry. `use` resolves only against this fixed compiled-in set; an unknown name (`use foo`) is a load error.
  - Reusable **manifest-conformance test harness** (a co-located test pattern any extension's manifest can be checked against): asserts every adjective/field a manifest declares maps to a trait/property the extension's `register*` actually registers. Proven in this phase with combat's manifest kept intentionally minimal (e.g. just the `combatant` adjective, no stat fields yet — full combat vocabulary is Phase 2's deliverable, not this phase's).
  - Pure-IR wiring: confirm `use combat` does **not** set `hasHatches: true` — the loader's hatch-detection keys on the `define … from` subject, not on `use`, so no code change should be needed there; write a test that pins this rather than assuming it.
- **Exit state**: A fixture `use combat` story loads, `registerBasicCombat` demonstrably ran against the world (assert the interceptor/resolver is registered — not that combat resolves, that's Phase 2), and produces `hasHatches: false`. A fixture with `use foo` (unknown extension) is a load error. A fixture with the minimal `combatant` adjective present without `use combat` is a load error (AC-2 gating proven at the mechanism level). The conformance-test harness runs against combat's minimal manifest and passes. `cloak`/`zoo` still compile unchanged.
- **Status**: CURRENT

### Phase 2: Combat vocabulary and wiring (`use combat`) — full manifest, AC-1/AC-2
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Combat bounded context — expose `CombatantTrait`/`WeaponTrait`/`registerBasicCombat`'s existing interceptor through full Chord vocabulary. No combat resolution logic is written; `CombatService.resolve/apply` (`combat-service.ts`) is untouched.
- **Entry state**: Phase 1 complete — `use combat` mechanism proven, minimal manifest merges, registry wired.
- **Deliverable**:
  - Ratchet entries (dated, before code): `combatant` and `weapon` as trait adjectives (like `openable`) applied on a `create` line; numeric stats via the existing `with <field> <value>` grammar (`create the troll, person, combatant with health 20, skill 40`; `create the sword, weapon with damage 5, skill-bonus 2`); the `attack` verb/interceptor opt-in.
  - Expand combat's manifest to its full field set: `combatant` → health/maxHealth/skill/baseDamage/hostile/canRetaliate/dropsInventory (mapping to `ICombatantData`); `weapon` → damage/skillBonus/isBlessed/glowsNearDanger (mapping to `WeaponTrait`'s fields). Manifest declares each field's type so the analyzer validates `with`-data at compile time.
  - `packages/story-loader` trait-switch arms composing `CombatantTrait`/`WeaponTrait` from the manifest-declared `with`-fields, following the pattern Phase 1 and W1 established.
  - Manifest-conformance test (full version, superseding Phase 1's minimal proof): asserts every field declared for `combatant`/`weapon` in the manifest exists on the real `ICombatantData`/`WeaponTrait` the extension registers — closes the drift risk named in ADR-215.
  - AC-1 fixture: `use combat` + a `combatant` NPC (`with health`/`skill`) + a `weapon` resolves a real attack via the basic-combat interceptor (assert the interceptor actually fired and mutated health/state — not just that the command was accepted).
  - AC-2 rejection fixtures: `combatant`/`weapon` are load errors **without** `use combat`; valid **with** it.
- **Exit state**: AC-1 and AC-2 fixtures pass via the bundle. The audit's `attacking`/combat rows (`docs/work/stdlib-reference/chord-availability-audit.md` §8) flip to ✅ reachable. `cloak`/`zoo` still compile unchanged.
- **Status**: PENDING

### Phase 3: NPC core vocabulary (auto-wired, no `use`) — AC-4
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: NPC bounded context — core, always-on vocabulary (the deliberate exception to "one `use` per extension"). `INpcService.registerBehavior` and the five standard behaviors already exist; this phase exposes them, plus makes the NPC plugin auto-wire like the scheduler does today.
- **Entry state**: Phase 1 complete (registry/loader-wiring pattern proven) — this phase does **not** depend on Phase 2 (combat) and could run in parallel with it if resourcing allowed, since NPC auto-wiring bypasses the `use` gate entirely.
- **Deliverable**:
  - Ratchet entry (dated, before code): the NPC plugin auto-wires by default (no `use npcs`), mirroring the scheduler's existing auto-wire at `packages/story-loader/src/loader.ts:425-441`; `person` composes an `NpcTrait` when any NPC-behavior adjective is present.
  - Ratchet entries for the behavior vocabulary as trait-adjective forms with `with`-data params: `guard`, `passive`, `wanderer with move-chance <n>`, `follower`, `patrol route [<Room>, <Room>, …]` — each a trait adjective composing `NpcTrait.behaviorId` plus its param fields (`hostile`, `canMove`, `allowedRooms`/`forbiddenRooms`, `goals`) via the same `with`-data pattern.
  - `packages/story-loader`: unconditional NPC-plugin registration at load (no gate check); trait-switch arms for the five behavior adjectives + `NpcTrait` data fields.
  - Manifest note: since NPC is core (not `use`-gated), its vocabulary is admitted to the catalog unconditionally — this phase documents that this is a deliberate, permanent exception (not a manifest merge), distinct from the `use`-gated manifest mechanism Phase 1/2 built.
  - AC-4 fixture: an NPC `guard`/`patrol` fixture runs with **no `use`** declaration anywhere in the story.
- **Exit state**: The fixture passes via the bundle with zero `use` lines. Existing `cloak`/`zoo` stories still compile unchanged even though the NPC plugin now always registers (additivity — assert no behavior change for stories with no `NpcTrait` entities). The audit's NPC-depth rows (§8, `a person` NPCTrait/combatant/character-model gap) flip to ✅ reachable for the behavior-library portion.
- **Status**: PENDING

### Phase 4: State-machine depth (`use state-machines`)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: State-machine bounded context (ADR-119) — extend Chord's existing partial surface (`states:` + `select on` + `change`, ratchet entries D2/D4) to the full declarative model: `onEnter`/`onExit` effects, `terminal` states, named persistent machines, and `$role` bindings. `StateMachineRegistry`/`StateMachineDefinition` already exist and are unmodified; this phase generates definitions + bindings from Chord IR and registers them.
- **Entry state**: Phase 1 complete (`use` mechanism, trusted registry pattern). Independent of Phases 2/3 — could run before or after either.
- **Deliverable**:
  - Ratchet entries (dated, before code, each a specific spelling — ADR-215 leaves exact syntax to this implementation): `use state-machines` gating the extended surface; an `on entering <state>`/`on leaving <state>` (or equivalent) clause form compiling to `onEnter`/`onExit` effects on the existing `states:` block; a `terminal` marker on a declared state; a named/persistent machine form (beyond the current single-machine-per-entity `states:` shape) with `$role`-style bindings to other declared entities (mirroring `StateMachineDefinition`'s `bindings` map).
  - `packages/chord`: IR nodes for onEnter/onExit effect lists, terminal flag, named-machine declaration, role-binding references.
  - `packages/story-loader`: compile these IR nodes into a real `StateMachineDefinition` + `bindings` map and call `StateMachineRegistry.register` — reusing the existing runtime unmodified.
  - Manifest entry for `use state-machines` (even though the *base* `states:`/`select on`/`change` surface stays core/unconditional per the existing D2/D4 ratchet entries — only the **extended** ADR-119 depth is gated behind `use state-machines`; state this split explicitly in the ratchet entry to avoid ambiguity with the pre-existing core surface).
  - Fixture: a named machine with at least one `onEnter` effect, one `onExit` effect, a `terminal` state, and a `$role`-bound reference to a second entity (e.g. a door bound as `$door` the way ADR-119's tiny-room example does) — reachable only under `use state-machines`.
- **Exit state**: The fixture passes via the bundle: entering/leaving states fire their effects, the terminal state blocks further transitions, and the role-bound entity resolves correctly. Without `use state-machines`, the extended forms (onEnter/onExit/terminal/named-machine/role-binding syntax) are load errors — the pre-existing core `states:`/`select on`/`change` surface remains available unconditionally. `cloak`/`zoo` still compile unchanged.
- **Status**: PENDING

### Phase 5: Three-part extension contribution surface — channel renderers (unblocks W7)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Formalizes the general contract every trusted extension follows: (1) world registration, (2) Chord vocabulary manifest, (3) browser channel renderers via the channel registry (`Story.registerChannels`). Parts 1/2 are exercised by Phases 1-4 (combat, NPC, state-machines); this phase adds part 3 — the piece none of the prior phases needed but ADR-216/W7's custom channels do.
- **Entry state**: Phase 1 complete (trusted registry + manifest mechanism). Combat/state-machines (Phases 2/4) provide two real `register*(world)` call sites this phase can extend, but neither ships a novel browser channel of its own — this phase proves the *mechanism* generically rather than shipping a user-visible new channel.
- **Deliverable**:
  - Extend the trusted registry's per-extension registration contract (Phase 1) so an extension may optionally register **channel + renderer** pairs against the channel registry (`Story.registerChannels`) at `use` time, alongside its `register*(world)` call and vocabulary manifest.
  - A minimal proof extension (or an addition to combat/state-machines' existing registration, whichever is the smaller diff) that registers one channel + renderer pair purely to demonstrate and test the mechanism end-to-end — this is scaffolding to prove the surface, not a new authored feature; do not invent new gameplay-facing channels here (that is ADR-216/W7's job).
  - Document the three-part contract (in the ratchet log's rationale column or an adjacent design note) so W7's custom-channel work has a concrete, tested extension point to register renderers against.
  - A test asserting: (a) a `use`d extension's renderer is present in the browser-loadable profile, (b) a story that does not `use` the extension does not see the channel/renderer, (c) `hasHatches: false` is preserved (renderer code ships with the runtime, not as author TS).
- **Exit state**: The proof channel+renderer registers and deregisters correctly with its owning extension's `use` state; pure-IR preserved; this phase's test suite is the concrete reference W7 cites when it registers its first real custom-channel renderer. `cloak`/`zoo` unchanged.
- **Status**: PENDING

### Phase 6: Cross-cutting closure — AC-1..AC-4 sweep and audit finalization
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: Governance and verification across Phases 1-5 — no new feature surface.
- **Entry state**: Phases 1-5 complete; fixtures exist for `use` mechanism/rejection, combat AC-1/AC-2, NPC AC-4, state-machine depth, and the renderer-contribution proof.
- **Deliverable**:
  - AC-3 pure-IR sweep: confirm every fixture using `use combat` / `use state-machines` produces `hasHatches: false` and loads in the browser/hosted profile; confirm `use foo` (unknown) is a load error across a fresh check (not just Phase 1's original test).
  - AC-4 additivity regression: `cloak.story` and `zoo.story` both still compile unchanged after all five prior phases (run once at the end to catch any cross-phase catalog collision — e.g. Phase 3's unconditional NPC auto-wire interacting with Phase 2's combat manifest merge).
  - Confirm every ratchet entry from Phases 1-5 (`use`, `combatant`/`weapon`/`attack`, NPC auto-wire + five behavior adjectives, state-machine extended forms, the three-part contribution note) is present, dated, and formatted consistent with the existing log.
  - Update `chord-availability-audit.md`'s parity scoreboard: flip the `attacking`/combat rows and the NPC/character-model rows (§8) to ✅ reachable, and note the manifest-mechanism + trusted-registry infrastructure as now available for future extensions.
  - Explicit hand-off note for W7: point at Phase 5's channel/renderer test as the reference W7 extends when it registers ADR-216's first real custom-channel renderer.
- **Exit state**: The audit's scoreboard reads correctly against all newly-flipped rows; no stray hatch usage; `cloak`/`zoo` green. This closes ADR-215 as fully implemented against ADR-214's umbrella AC-1..AC-4, and hands a concrete, tested extension point to W7.
- **Status**: PENDING

## Notes for the implementer

- **Scope discipline**: every phase above composes existing traits/behaviors/registries (`CombatantTrait`, `WeaponTrait`, `NpcTrait`, the five NPC behaviors, `StateMachineRegistry`) through Chord surface + loader wiring. If any phase finds itself writing new combat-resolution math, new pathfinding, or a new state-transition engine, stop — that is out of scope and likely means the grounding above is stale (a platform-model surprise, not a Chord-surface task).
- **Third-party extensions are explicitly out of scope** for this entire plan (ADR-215 §Scope) — do not generalize the trusted registry to accept externally-supplied paths or dynamic registration; it stays a fixed, compiled-in set.
- **Phase ordering flexibility**: Phase 1 is a hard prerequisite for Phases 2, 4, and 5. Phase 3 (NPC) only needs Phase 1's loader-wiring pattern and is otherwise independent of Phases 2/4 — it may be resequenced earlier or run in parallel with Phase 2 if useful. Phase 5 should follow Phase 2 and/or Phase 4 so it has at least one real `register*` call site to extend, even though its proof channel is scaffolding.
- **W7 is waiting on Phase 5**, not on this whole plan's completion in practice — but per the roadmap, do not start W7 planning until this plan is at least through Phase 5, since W7's custom-channel renderer design should be written against a tested, not speculative, contribution surface.
- Fixture `.story` files should live under `docs/work/chord-extensions/fixtures/`, following the compiled-fixture pattern established by `docs/work/chord-foundations/fixtures/` and `docs/work/chord-language-reference/`.
- If any phase discovers that `CombatantTrait`/`WeaponTrait`/`NpcTrait`/`StateMachineRegistry`'s actual shape does not match this plan's grounding (confirmed 2026-07-14), stop and discuss — the ADR's premise may be stale, which is a design question, not an implementation detail to paper over.
