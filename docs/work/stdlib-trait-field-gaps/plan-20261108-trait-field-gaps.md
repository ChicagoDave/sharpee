# Session Plan: Close GH #664 — stdlib actions read trait fields their traits do not declare

**Created**: 2026-11-08
**Plan Status**: ACTIVE
**Overall scope**: Fix all eight rows of #664 (none deleted, per David's 2026-11-08 ruling: every row is an IF standard action). Five rows realign the action to a field the trait already declares; three rows (wearable body-part/layer, openable auto-open/auto-close, smell/sound levels) get new declared fields plus Chord syntax. One dedicated Chord test story with a branch-tester tree exercises all eight, the 15 #664-commented test sites lose their workaround, and #664 closes.
**Bounded contexts touched**: stdlib actions and scope (`packages/stdlib`), world-model traits (`packages/world-model`), story-loader trait routes and adjectives (`packages/story-loader`), Chord language catalog (`packages/chord`)
**Key domain language**: trait field, capability dispatch, wearable layer/body part, openable auto-open/auto-close, scent/sound level
**Platform note**: Phases 2-4 change `packages/`. Per CLAUDE.md these are discussed first; Phase 1 ends in David's decision and plan approval is the discussion for Phase 2's already-specified realignments.

## References consulted
- `docs/architecture/adrs/adr-346-traits-do-not-police-completeness.md` — D1: traits accept partials and constructors do not police; new fields are optional with defaults, no constructor throws.
- `docs/architecture/adrs/adr-321-world-index.md` — D4 as cited in the ruling; any entity-scan or index added for sensory lookup must go through the world index, not a fresh scan.
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` — capability dispatch; extend existing trait/behavior patterns, no ad-hoc properties.
- `docs/architecture/adrs/adr-374-backdrop-night-vision-listener.md` — D9: `lit`/`unlit` trait adjectives are the precedent for Chord trait adjectives (STARTS_STATE pairing in entity.ts and catalog.ts).
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — CharacterModelTrait conversation system; bears on whether the customProperties.conversation path in talking is legacy (reported, not decided).
- `docs/core-concepts/README.md` — two-sided alignment of platform and language; runtime tests of a Chord feature belong in a branch-tester tree (`<story-id>.tests/`), not a transcript.
- `docs/work/typecheck-gate-audit/plan-20261107-stdlib-test-typecheck.md` — plan model; its Phase 1 note records giving/talking fallbacks now dead and the scope-resolver `customProperties` read.
- GH #664 body and two comments — the row table and the 15 test sites (typed intersections, each with a comment pointing at #664).
- Product ADRs not consulted (no Scope intersection): none found with a Scope line.

## Rows (reference table)
| # | Reader | Undeclared read | Declared home / fix |
| --- | --- | --- | --- |
| 1 | `packages/stdlib/src/actions/standard/switching-shared.ts:38` | radius / intensity | LightSourceTrait `brightness` (`packages/world-model/src/traits/light-source/lightSourceTrait.ts:18`) |
| 2 | `packages/stdlib/src/actions/standard/touching/touching.ts:181` | isDrink | EdibleTrait `liquid` (set by story-loader `drinkable`) |
| 3 | `packages/stdlib/src/actions/standard/wearable-shared.ts:201` | cursed | WearableTrait `canRemove` |
| 4 | `packages/stdlib/src/actions/standard/giving/giving.ts:194` | inventoryLimit, bare preferences | ActorTrait `capacity`, `customProperties` |
| 5 | `packages/stdlib/src/actions/standard/talking/talking.ts:177` | bare conversation | customProperties.conversation |
| 6 | `packages/stdlib/src/actions/standard/wearable-shared.ts:53` | conflict gated on layer undefined (constructor defaults layer to 1, so unreachable) | same bodyPart and same layer conflicts; new Chord syntax |
| 7 | `packages/stdlib/src/actions/standard/switching_off/switching_off.ts:201`, `packages/stdlib/src/actions/standard/unlocking/unlocking.ts:232` | autoCloseOnOff, autoOpenOnUnlock | declare on OpenableTrait; new Chord adjectives |
| 8 | `packages/stdlib/src/scope/scope-resolver.ts:140` | IdentityTrait customProperties loud/smelly/verySmelly | declared scent and sound levels; new Chord adjectives |

## Phases

### Phase 1: Chord seam survey and syntax options for David's decision (no implementation)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chord/Sharpee alignment at trait adjectives; wearable, openable, and sensory (scent/sound) traits
- **Entry state**: Plan approved; no `packages/` edits yet.
- **Deliverable**: A decision document `docs/work/stdlib-trait-field-gaps/options-20261108-chord-syntax.md` (new) with, per row 6, 7, 8, a full real Chord story block under each option (unshipped syntax marked), drawn from the shipped `lit`/`unlit` precedent. Also: (a) the scent/sound home question named for David (fields on IdentityTrait beside weight/volume/size vs a new sensory trait; PerceptionService extension points listed); (b) row 4 seam answer: whether story-loader/Chord can today set an NPC's `capacity` or customProperties.preferences, and the Chord syntax if not; (c) row 5 note: whether customProperties.conversation is legacy relative to ADR-320's CharacterModelTrait, reported not decided; (d) whether the scent/sound home and trait-adjective syntax are ADR-worthy (noted, not written).
- **Files**: `docs/work/stdlib-trait-field-gaps/options-20261108-chord-syntax.md` (new)
- **Exit state**: David has ruled on the three syntax questions, the sensory home, and row 4/5 seams; the rulings are recorded at the top of the options document.
- **Demonstration**: Open the options document and read one Chord block per option for each of rows 6, 7, 8; David's ruling lines are present.
- **Demonstrated**: 2026-11-08 15:25. `docs/work/stdlib-trait-field-gaps/options-20261108-chord-syntax.md` carries a Chord block per option for rows 6 (A, B, C and the layering A-i/A-ii/A-iii), 7 (A, C, D) and 8 (`smelly`/`loud`), plus rows 3, 4, 5 and 1; the Rulings table is filled, every row ruled as recommended by David's "proceed" (R1a pair, R1 A, R2 A-iii, R3 yes, R4 C, R5 A, R6 now, R7 none, R8 none, R9 separate issue, R10 one ADR before Phase 3). Beyond the plan's scope, a proof of concept of R1a was built at David's request and is committed with this phase: `WearableTrait.placement` pair replaces `bodyPart`/`layer` (the old constructor defaulted both, so the naive fix would have made every two Chord wearables collide); wearable-shared's conflict, removal and `canRemove` rules read it; 19 files. world-model `tsc` exit 0 and 106 files / 1690 tests passing; stdlib source and test `tsc` exit 0 and 150 files / 1917 tests passing (2 added); mutation-verification: source clean, five golden refusal tests gained post-refusal state assertions, re-run 44 passing. [reported by session, unverified: the event log has no passing-test row after the last edit to the wearing and taking_off golden tests (15:25 local); its last test rows (15:20 local) predate that edit]
- **Status**: DONE

### Phase 2: Realign five actions to declared fields (rows 1-5) and clear their test comments
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: stdlib standard actions switching, touching, wearing/taking off, giving, talking
- **Entry state**: Phase 1 rulings recorded (rows 4 and 5 seam answers in particular).
- **Deliverable**: Casts removed with no `as any`, `unknown`, or intersection workaround: switching-shared reads `brightness`; touching reads `liquid`; wearable-shared's removal restriction reads `!canRemove`; giving drops the `inventoryLimit` and bare `preferences` fallbacks; talking drops the bare `conversation` fallback. Golden fixtures for these rows use declared fields; the matching #664 comments are removed.
- **Files**: `packages/stdlib/src/actions/standard/`, `packages/stdlib/tests/`
- **Exit state**: Rows 1-5 have no undeclared read in `packages/stdlib/src`; their golden tests assert real behavior (cursed ring via `canRemove: false`, liquid touch, preference refusal).
- **Demonstration**: Run the stdlib typecheck script (exit 0, includes test tsconfig) and the stdlib vitest suite; both green. Grep of `packages/stdlib/src` for the five field names returns no cast read.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: Declare the new fields and make the behaviors reachable (rows 6, 7, 8)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: WearableTrait (same bodyPart and layer conflict), OpenableTrait (auto-open on unlock, auto-close on switch off), scent and sound levels (home per Phase 1 ruling)
- **Entry state**: Phase 1 rulings on the sensory home recorded; Phase 2 green.
- **Deliverable**: `autoCloseOnOff` and `autoOpenOnUnlock` declared on IOpenableData and OpenableTrait (optional, ADR-346); the body-part conflict fires on same bodyPart and same layer while different layers stack; scent and sound levels declared at the ruled home and read by scope-resolver and the smelling/listening paths without `customProperties`; world-model barrels and dist updated if a trait is added. `willAutoOpen` on UnlockedEventData confirmed declared. Golden tests for each new behavior; the remaining #664-commented sites (body-part conflict wearables, auto-open, loud and smelly fixtures) lose their comments and intersections.
- **Files**: `packages/world-model/src/traits/`, `packages/stdlib/src/actions/standard/`, `packages/stdlib/src/scope/`, `packages/stdlib/tests/`
- **Exit state**: No undeclared read remains in `packages/stdlib/src`; zero `#664` comments left in `packages/stdlib/tests`; the conflict path is reachable from a normal constructor.
- **Demonstration**: the stdlib typecheck script and test green, the world-model suite green, and a grep for "664" under `packages/stdlib` returns nothing.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Chord syntax and story-loader routes for the new fields
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chord language catalog and story-loader trait adjectives (ADR-374 D9 precedent)
- **Entry state**: Phase 3 green; Phase 1 syntax ruling.
- **Deliverable**: Ruled syntax parsed in `packages/chord/src/catalog.ts` and `packages/chord/src/parser.ts` as needed, mapped in `packages/story-loader/src/build/trait-routes.ts` and `packages/story-loader/src/build/entity.ts`; the NPC capacity/preferences seam from Phase 1 closed if a gap was found; alias catalog regenerated with `./repokit aliases` (never hand-edited); chord and story-loader unit tests for each construct.
- **Files**: `packages/chord/src/`, `packages/story-loader/src/build/`
- **Exit state**: Every field added in Phase 3 is settable from Chord source, and an author can express each row's scenario.
- **Demonstration**: `./repokit build` succeeds; chord and story-loader test suites green; a parse of the Phase 1 example blocks yields the expected IR.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Dedicated Chord test story with branch-tester tree, close #664
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Test story exercising all eight standard actions end to end
- **Entry state**: Phases 2-4 green and built.
- **Deliverable**: New story `stories/trait-field-test/trait-field-test.story` (new) and tree `stories/trait-field-test/trait-field-test.tests/` (new), plus workspace registration if stories are listed. Scenarios: two hats on one head refused; auto-open on unlock; auto-close on switch off; cursed, unremovable ring; smelly cheese in a closed box; loud bell heard from the next room; liquid texture on touch; NPC refusing a gift by preference; talking to an NPC with and without conversation; light source switched on/off by brightness. No real story is modified.
- **Files**: `stories/trait-field-test/` (new)
- **Exit state**: Tree walks green under branch-tester with all eight rows covered; #664 closed with the evidence inline.
- **Demonstration**: Run the tree through `./sharpee test` and observe all branches passing; stdlib, world-model, chord, and story-loader suites green; the issue view for 664 shows closed.
- **Demonstrated**: 
- **Status**: PENDING
