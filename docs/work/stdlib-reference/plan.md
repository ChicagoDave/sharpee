# Session Plan: Standard Library Reference (author-facing documentation)

**Created**: 2026-07-14
**Overall scope**: Write an author-facing narrative reference for Sharpee's standard library — the 49 standard actions, 38 traits (and their behaviors), and the runtime plugins/daemons a Chord author builds on — framed entirely through the Chord `.story` surface (verbs, trait composition names, message-key overrides), not the TypeScript API. Companion to the just-completed Chord language reference (`docs/reference/chord-language.md`, ADR-210): that document teaches the language and its `define trait`/`define action`/hatch escape hatches; this document catalogs everything already built in, so an author knows what NOT to `define` before reaching for those escape hatches. Deliverables: `docs/reference/stdlib-reference.md` and `site/stdlib-reference.html`, rendered and linked exactly as `chord-language.md`/`site/chord-reference.html` were.
**Bounded contexts touched**: N/A — documentation-only work; no domain behavior changes, and the project has no `docs/ddd/notation.yaml` (DDD decomposition does not apply per the planner's own rules). Domain-accurate terminology is still drawn directly from ADR-090's capability-dispatch vocabulary and each trait/action's actual TypeScript names throughout.
**Key domain language**: standard action, trait, behavior, capability dispatch, message key, phrase override, daemon/fuse, turn plugin — the vocabulary is the subject matter of this deliverable, not incidental to it.

## References consulted
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` — the capability-dispatch decision tree (stdlib action + trait for "same mutation for every entity" verbs like TAKE/OPEN/PUT, vs. capability dispatch for "different mutation per entity" verbs like LOWER/TURN/WAVE, vs. a full story action for verbs stdlib doesn't have at all). This doc's job is the first branch only — catalog what stdlib already covers — so an author can tell, before writing `define trait`/`define action`, whether the standard library already has the verb. Verbs with no single canonical behavior (LOWER, TURN, WAVE, WIND) must be documented as "story-defined per entity," not given an invented default behavior.
- `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` and `docs/architecture/adrs/adr-208-interceptor-registry-engine-owned.md` — confirm capability behaviors and action interceptors are engine-owned, per-world, TypeScript-registered constructs (`world.registerCapabilityBehavior(...)` / `world.registerActionInterceptor(...)` inside a story's `initializeWorld()`). These are platform-internal mechanisms, not Chord syntax — this plan's phases document only the *observable* effect (a message key an author can override, a precondition an author can see) never the TS registration API itself.
- `docs/architecture/adrs/adr-051-action-behaviors.md` — Status: **Superseded by ADR-052**. The old switch-statement "action behaviors" pattern it describes must not be presented as current architecture; the doc's framing of "preconditions checked" and "message keys emitted" per action must match the current validate/execute/report/blocked four-phase pattern (ADR-051's successor lineage, per `packages/stdlib/CLAUDE.md`), described loosely enough for authors (no phase-name jargon) but factually consistent with it.
- `packages/stdlib/CLAUDE.md` — the canonical ADR-090 decision tree and the verb table distinguishing "standard semantics" (TAKE, DROP, OPEN/CLOSE, LOCK/UNLOCK, PUT IN/ON, ENTER/EXIT, SWITCH ON/OFF) from "capability dispatch" verbs (LOWER, RAISE/LIFT, TURN, WAVE, WIND). Source of truth for which of the 49 actions get a full canonical-behavior writeup vs. a "this verb's meaning is defined per-entity by the story" note. Also the source of the language-layer rule this doc must itself follow in reverse: stdlib emits message IDs, not English — so every action's documented "message keys" section must show the ID an author overrides via `phrase`, never invented English text as if it were the platform default.
- `packages/world-model/CLAUDE.md` — traits are data, behaviors own mutations and live in `src/behaviors/` (not embedded in trait classes); confirms the doc's per-trait sections should separate "data fields" from "behavior" as the goal's own instruction already specifies, matching the actual code split. Root-barrel-discipline and circular-dependency notes are package-maintenance detail, out of scope for the author-facing doc.
- `docs/context/project-profile.md` — confirms `pnpm`/TypeScript/Vitest conventions and that `site/` is the plain-HTML publishing surface built separately from `docs/book`; the Publishing domain's mutation signature ("claiming a chapter fix without re-running its walkthrough transcript" is the insufficient case) is the same failure mode this plan's optional compile-check harness (Phase 9) exists to prevent for `.story` example snippets.
- `docs/context/session-20260714-1133-main.md` (most recent session) — confirms the sibling `chord-language-reference` plan finished all 7 phases (verified against `git log`: Phases 1–3, 4–5, and 6–7/site-render are each a separate committed session), `site/chord-reference.html` is live, and `docs/context/.current-plan` currently still points at that finished plan — this plan's write corrects the pointer to the new work.
- `docs/work/chord-language-reference/plan.md` (read in full) — the proven 7-phase template this plan explicitly mirrors per the goal's own instruction: outline/checklist/harness-scaffold phase first, content phases with one fixture per example and a documented expected-fail-fixture manifest convention, a dedicated final verification-sweep phase, and a site-render phase last that transcribes (via a committed converter script, not hand-typing) rather than hand-duplicates the markdown.
- `docs/reference/chord-language.md` (read in full) — the prose style/conventions to match: plain-language task order, a `> Status:` banner, `<!-- fixture: path.story -->` citation comments preceding verified code blocks, em-dashes allowed, no invented syntax in examples. Its own §5 (`define condition`/`define phrase`/`define verb`/`define trait`/`define action`/hatches) is this new document's sibling "how to extend it yourself" chapter — this plan's chapters cross-link to chord-language.md §5 rather than re-explaining the `define` mechanism.
- `packages/sharpee/docs/genai-api/stdlib.md`, `world-model.md`, `plugins.md` — the existing auto-generated `.d.ts` dump this new doc must complement, not duplicate (per the goal). Confirmed genai-api's own action count is stale ("All 43 standard actions" vs. the 49 action directories present on disk today) — worth a one-line footnote in Phase 1's checklist, not a fix; genai-api is owned by `packages/sharpee/CLAUDE.md`, out of this plan's write surface. `plugins.md` also confirms the turn-plugin priority order used in Phase 8 (NPC behaviour 100, state machines 75, scheduler 50) directly from its header doc comment.
- `packages/parser-en-us/src/grammar.ts` (existence confirmed via grep for `if.action.taking`) — the actual default verb→action binding table. This, not the action's directory/file name, is the grounding source Phase 1 must read in full to enumerate each action's real bound verb(s) (some actions bind multiple surface verbs, e.g. TAKE/GET).
- No `docs/proposals/` directory exists in this repository — no accepted proposal items to plan from.
- No `docs/ddd/notation.yaml` or `docs/ddd/notation/` directory exists — confirms the DDD-does-not-apply branch for this planning pass.

## Phases

### Phase 1: Outline, coverage checklist, verb-table grounding, and harness decision
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: the full standard-library surface (49 actions, 38 traits, plugin/daemon services), reorganized from source-directory order into author-task order.
- **Entry state**: `chord-language.md` and its site page are content-final (confirmed complete, all 7 phases, this session); `packages/parser-en-us/src/grammar.ts` and every action/trait directory available to read.
- **Deliverable**:
  1. `docs/work/stdlib-reference/coverage-checklist.md` — every one of the 49 action directories under `packages/stdlib/src/actions/standard/` and every one of the 38 trait directories under `packages/world-model/src/traits/` mapped to exactly one planned chapter/section below, plus a row per plugin/daemon service (`packages/plugins`, `packages/plugin-scheduler`, `packages/plugin-npc`, `packages/plugin-state-machine`, `packages/extensions/basic-combat`). For each action row, record its real bound verb(s) read from `parser-en-us/src/grammar.ts` (not guessed from the directory name) and whether ADR-090/`stdlib/CLAUDE.md` classifies it as "standard semantics" (full canonical writeup) or a capability-dispatch verb with no single stdlib behavior (documented as "per-entity, story-defined" — LOWER, RAISE/LIFT, TURN, WAVE, WIND and any others the table reveals). No action, trait, or plugin service may be left unmapped.
  2. `docs/reference/stdlib-reference.md` skeleton — headers only, one-line placeholders, organized by author task per the goal's own grouping:
     - **Manipulation**: taking, dropping, putting, inserting, giving, showing, throwing, pushing, pulling, touching, lowering, raising.
     - **Movement**: going, entering, exiting, climbing.
     - **Containers & openables**: opening, closing, locking, unlocking.
     - **Wearing**: wearing, taking_off.
     - **Senses & examination**: examining, looking, searching, reading, listening, smelling.
     - **Devices**: switching_on, switching_off.
     - **NPCs & conversation**: talking, attacking, eating, drinking, hiding.
     - **Meta/system**: about, help, inventory, scoring, saving, restoring, quitting, restarting, version, again, undoing, waiting, sleeping.
     - **Traits catalog**: all 38 traits, grouped to mirror the action chapters above plus a "structural/authoring traits" group for traits with no 1:1 verb (region, scene, story-info, identity, obstructor-protocol, equipped, open-inventory, moveable-scenery, attached, concealment, acoustic, listener, breakable, destructible, button).
     - **Plugins & daemons**: turn-plugin/plugin-registry, scheduler-service (daemons/fuses), NPC turn plugin, state-machine plugin, the combat extension as a worked "how a plugin extends stdlib" example.
  3. **Compile-check harness decision** — **DECIDED: DROPPED** (owner, 2026-07-14, at plan-review: "Start, prose only — no harness"). No `verify-examples.mjs`, no `fixtures/`, no manifest; **Phase 9 is removed from this plan**. All "fixture under `.../fixtures/...`" and "if the harness is adopted" language in Phases 2–8 is void — examples are hand-written real-syntax `.story` snippets, verified only by ad-hoc reading (the author explicitly chose editorial control over an automated drift/compile guard). During drafting, a snippet may still be sanity-compiled ad-hoc against `@sharpee/chord` to avoid publishing broken syntax, but no committed harness or fixture results are produced.
- **Exit state**: checklist complete with every action/trait/plugin-service row mapped and no unmapped item; skeleton committed with every section header in place; harness-adoption decision recorded (DROPPED) in the checklist file's header.
- **Status**: COMPLETE (2026-07-14) — `coverage-checklist.md` maps all 49 action dirs + 38 trait dirs + 5 plugin/extension services (92 rows), each with grounded verbs and standard-vs-dispatch classification; a scripted cross-check confirms zero unmapped action/trait dirs. Verb grounding read from BOTH `parser-en-us/src/grammar.ts` (56 pattern bindings incl. multi-slot forms) and `lang-en-us/src/data/verbs.ts` (47 verb-vocabulary entries) — neither alone is complete; the 7 dirs with no grammar.ts pattern (climbing/locking/listening/smelling/talking/sleeping/removing) get their verbs from verbs.ts. `stdlib-reference.md` skeleton written (§1–§11 + appendix, chord-language.md conventions + SKELETON banner). Harness DROPPED per owner. Findings for content phases: only `lowering`/`raising` are dispatch verbs in-scope; `hiding` has no default verb binding (confirm in §8); grammar binds extra conversation IDs (asking/telling/saying/etc.) with no action dir — out of the 49-dir spine.

### Phase 2: Manipulation actions and their traits
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: the actions an author reaches for to move things around by hand — taking, dropping, putting, inserting, giving, showing, throwing, pushing, pulling, touching, lowering, raising — and the traits that make an entity eligible for them.
- **Entry state**: Phase 1 skeleton, checklist, and harness decision exist; Manipulation rows identified in the checklist.
- **Deliverable**: For each manipulation action — **note (Phase 1 finding): the family has 13 actions, not 12; `removing` (take X from container/surface) was added to this chapter** — the verb(s) it binds (per Phase 1's grammar+verbs.ts reading), what it does in plain language, which trait(s) an entity needs to be eligible (or "none — portable by default" per `world-model/CLAUDE.md`), the states/preconditions it checks (e.g. "the target must not already be held," "the target's container must be open"), and its message keys with a worked `phrase` override example. Capability-dispatch verbs in this family (LOWER, RAISE) get the "per-entity, story-defined" treatment instead of an invented canonical behavior, with a short pointer to `chord-language.md`'s `on`/`after` clause chapter for how a story would bind entity-specific behavior. Accompanying trait sections for `container`, `supporter`, `pushable`, `pullable`, `moveable-scenery`, `attached` (data fields, states, behavior, composition name as used in a `create` block's `with` line). Examples are hand-written real Chord syntax (harness dropped) — sanity-check them ad-hoc against `@sharpee/chord` during drafting.
- **Exit state**: Manipulation chapter and its trait sections complete in `stdlib-reference.md`; checklist rows for this phase checked off.
- **Status**: PENDING

### Phase 3: Movement, containers & openables actions and their traits
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: getting an actor from place to place, and getting things open — going, entering, exiting, climbing, opening, closing, locking, unlocking.
- **Entry state**: Phase 2 complete (this chapter may reference the `container` trait already documented there rather than re-explaining it).
- **Deliverable**: Same per-action treatment as Phase 2 for these 8 actions, plus trait sections for `exit`, `door`, `room`, `enterable`, `climbable`, `vehicle`, `region`, `scene`, `openable`, `lockable` — including how `door` composes both `openable` and `lockable` and how `exit`/blocked-exit guards relate to Chord's own blocked-exit syntax (cross-link to `chord-language.md` §2, do not re-explain the Chord-side syntax here). Fixtures under `fixtures/movement/` if the harness is adopted.
- **Exit state**: Movement and Containers & openables chapters complete; checklist rows checked off.
- **Status**: PENDING

### Phase 4: Wearing, senses & examination actions and their traits
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: what an author uses to describe how things look, sound, and feel, and how they're worn — wearing, taking_off, examining, looking, searching, reading, listening, smelling.
- **Entry state**: Phase 3 complete.
- **Deliverable**: Same per-action treatment for these 8 actions, plus trait sections for `wearable`, `clothing`, `equipped`, `open-inventory`, `readable`, `scenery`, `concealment`, `acoustic`, `listener`, `identity`, `story-info`. Cross-link to `chord-language.md`'s `first time` room-description and per-entity `phrase` override sections where an examine/look message is the same message-key mechanism already documented there. Fixtures under `fixtures/senses/` if adopted.
- **Exit state**: Wearing and Senses & examination chapters complete; checklist rows checked off.
- **Status**: PENDING

### Phase 5: Devices, NPCs, conversation & combat actions and their traits
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: switches an author flips, and the actors an author writes — switching_on, switching_off, talking, attacking, eating, drinking, hiding.
- **Entry state**: Phase 4 complete.
- **Deliverable**: Same per-action treatment for these 7 actions, plus trait sections for `switchable`, `light-source`, `button`, `breakable`, `destructible`, `actor`, `npc`, `character-model`, `combatant`, `weapon`, `edible`. Combat's non-determinism (per the "never turn off randomness" project policy) is documented as observable behavior only — do not propose seeding or disabling it to make an example deterministic; use a fixed setup and note the outcome varies. Fixtures under `fixtures/devices-npc/` if adopted (combat examples may need the expected-fail/variable-outcome manifest convention extended — decide here, consistent with Phase 1's convention).
- **Exit state**: Devices and NPCs & conversation chapters complete; checklist rows checked off.
- **Status**: PENDING

### Phase 6: Meta/system actions
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: the actions every story gets for free with no trait requirements — about, help, inventory, scoring, saving, restoring, quitting, restarting, version, again, undoing, waiting, sleeping.
- **Entry state**: Phase 5 complete (or may run independently — this chapter has no trait dependencies on prior phases; ordered last among action chapters only to keep trait-heavy families together).
- **Deliverable**: A lighter per-action treatment (no trait section needed — these bind to no trait) for all 13 meta actions: verb(s), what it does, any story-level configuration it reads (e.g. `about`/`help` text sources, `score` owners per `chord-language.md` §4.5), message keys. Fixtures under `fixtures/meta/` if adopted.
- **Exit state**: Meta/system chapter complete; checklist rows checked off; every action-family chapter in `stdlib-reference.md` is now content-complete.
- **Status**: PENDING

### Phase 7: Traits catalog — systematic completeness pass
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: the traits catalog as its own reference surface — a Chord author composing `with a container, openable` in a `create` block needs a place to look up a trait directly, not just find it embedded inside whichever action chapter mentioned it first.
- **Entry state**: Phases 2–6 complete — every trait tied to an action family already has a drafted section from its owning phase.
- **Deliverable**: A systematic catalog pass over all 38 traits: verify every trait documented in Phases 2–6 has a complete, self-contained entry (composition name, data fields, states, behavior) reachable from the catalog's own index, not only from within an action chapter; write entries for the remaining "structural/authoring" traits with no 1:1 verb (region, scene, story-info, identity, obstructor-protocol) that no prior phase covered. Cross-link every entry back to the action chapter(s) that use it.
- **Exit state**: `coverage-checklist.md`'s trait rows are all checked off; the Traits catalog section in `stdlib-reference.md` is complete and internally consistent with the action chapters (no trait documented twice with diverging descriptions).
- **Status**: PENDING

### Phase 8: Plugins & daemons chapter
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: the runtime services behind timed and NPC behavior — what a Chord author's `define sequence` (already documented in `chord-language.md` §4.7) actually runs on top of.
- **Entry state**: Phase 7 complete.
- **Deliverable**: A Plugins & daemons chapter covering: the turn-plugin concept (`packages/plugins` — runs once per successful player action, priority-ordered: NPC behavior 100, state machines 75, scheduler 50, per `genai-api/plugins.md`'s own doc comment); the scheduler service (`packages/plugin-scheduler` — daemons/fuses, what a `define sequence` step-anchor compiles to at runtime); the NPC turn plugin (`packages/plugin-npc`); the state-machine plugin (`packages/plugin-state-machine`); and the combat extension (`packages/extensions/basic-combat`) as a worked example of a plugin built on top of the standard trait/behavior/action layers rather than replacing them. Framing stays author-level: what an author observes and configures (e.g. sequence timing, NPC turn behavior), not the TS plugin-registration API.
- **Exit state**: Plugins & daemons chapter complete; `coverage-checklist.md`'s plugin-service rows checked off; `stdlib-reference.md` has no remaining unmapped checklist row.
- **Status**: PENDING

### Phase 9: Full compile-check verification sweep — DROPPED
- **Status**: DROPPED (owner decision 2026-07-14, "prose only — no harness"). The example-verification harness is not adopted; there is no compile-check sweep. Documented `.story` snippets are hand-written real syntax, sanity-checked ad-hoc during drafting but not fixture-backed. Renumber nothing: the final phase remains "Phase 10: Site render and linking."

### Phase 10: Site render and linking
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: publishing the reference to `site/`, matching `site/chord-reference.html`'s conventions exactly.
- **Entry state**: Phase 8 complete (Phase 9 too, if adopted) — `docs/reference/stdlib-reference.md` is content-final.
- **Deliverable**: `site/stdlib-reference.html`, rendered by a committed converter script following `docs/work/chord-language-reference/render-site.mjs`'s pattern (adapted, not hand-copied) so the site page cannot drift from the markdown source — not hand-transcribed. `site/chord.html`'s "Reference" list and `site/components.js`'s sidebar each gain a link to the new page, placed consistently with how `chord-reference.html` was added to both (per this session's confirmed state: first in the Reference list, flat sidebar entry). An HTML tag-balance check (the Python `html.parser` check used for the Chord site page) passes on all touched site files.
- **Exit state**: `site/stdlib-reference.html` live, linked from `site/chord.html` and the shared sidebar; content coverage spot-checked against `stdlib-reference.md`.
- **Status**: PENDING

## Notes for the implementer

- No package under `packages/` is modified by any phase — `docs/`, `site/`, and the doc-scoped fixtures/scripts under `docs/work/stdlib-reference/` are the only write surfaces, so CLAUDE.md's platform-change discussion gate does not apply to this plan. If a phase discovers it needs a fixture change inside `packages/chord/tests/fixtures/` or a genuine platform defect, stop and discuss — that crosses into a platform-package change.
- Never auto-retry a failed build (CLAUDE.md) — Phase 9 (if adopted) draws the same line `chord-language-reference`'s Phase 6 drew: ordinary example-content iteration is fine, a suspected platform defect is not something to work around silently.
- Capability-dispatch verbs (LOWER, RAISE/LIFT, TURN, WAVE, WIND, and any others Phase 1's grammar-table read reveals) get a "per-entity, story-defined" note, never an invented default behavior — there isn't one; that's the entire point of ADR-090's second branch.
- Combat and other RNG-driven actions: never propose seeding or disabling story randomness to make a doc example deterministic (project policy) — document the observable range of outcomes instead.
- Keep `docs/reference/chord-language.md`, `docs/reference/chord-grammar.md`, and `docs/reference/chord.ebnf` untouched — this plan adds a new companion document; it does not edit the Chord references, only cross-links to them.
- `packages/sharpee/docs/genai-api/{stdlib,world-model,plugins}.md` stay untouched — they're auto-generated and owned by `packages/sharpee/CLAUDE.md`; if their staleness (e.g. the "43 standard actions" count) becomes a real problem, that's a separate conversation with the owner, not a fixup inside this plan.
