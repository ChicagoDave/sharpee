# Refactoring survey — umbrella assessment

**Written**: 2026-09-07, session 7f0471, on `feat/secret-letter-port`.
**Covers**: the ACCEPTED ADRs of the package-by-package refactoring survey (ADR-334 onward). Each ADR is assessed for impact, alignment, and elegance within Sharpee and Chord. This is not a review of the ADRs themselves; `adr-review` did that at 19/19 for each. Every code citation below was read this session at HEAD `dc140a48b`.
**Grows**: the survey is still running (ADR-334 to ADR-340 assessed: engine, story-loader, chord, stdlib, world-model, character, the two testing runtimes; lang-en-us and parser-en-us surveyed with no ADR, see below; more to come). Add a row to the impact table and a section under Alignment for each ADR as it is accepted; revisit the Elegance section when a new ADR introduces an ordered list.

## Verdict

The accepted decisions compose cleanly and none of them fights the Chord/IDE direction. The one finding that changes what happens next is on elegance: the survey solved the same problem three different ways, and the strongest of the three should be applied to all of them before any plan is written.

## Impact

Alignment is two-sided. Sharpee and Chord are to fit together as elegantly as possible, and neither side is favored over the other (core-concepts, "Where the work is": secondary does not mean subordinate). So each ADR is judged on the elegance it adds and where that elegance lands: on the Sharpee side, on the Chord side, or on the seam between them. A change that tidies one side while the seam stays where it was is a change to question; a change that makes one side more elegant is worth exactly as much whichever side it is.

| ADR | Package | Author-visible? | Elegance gained, and where it lands | Size moved |
|---|---|---|---|---|
| 334 | engine | No | Sharpee side: the turn's order becomes data instead of comments. On the seam: a vocabulary of stage names the runtime can cite, though nothing obliges it to. | ~1,500 lines restructured |
| 335 | story-loader | No | Both sides: the Chord runtime becomes modules that mirror the language's own clause kinds, and `use` becomes the whole extension boundary, so the language statement and the platform registry are one-to-one. | ~5,000 lines moved mechanically |
| 336 | chord | No | Chord side: a new statement kind is a compile error at every stage that has not decided on it, and pass order is data. GH #359's defect class becomes a failing test. | ~1,300 lines restructured |
| 337 | stdlib | **Yes** | The seam itself: the promise the runtime makes to authors about `on <gerund>` and the platform's mechanism become the same thing. | ~900 lines removed |
| 338 | world-model | No | Sharpee side: one world surface and no dead subsystems. The API reference the IDE ships loses a false affordance. No seam change. | ~1,400 lines removed |
| 339 | character | No | Sharpee side: each tick sub-step sits beside the subsystem it drives, and `stdlib/npc/` becomes exactly the decision layer core-concepts says it is. No seam change. | ~1,300 lines moved mechanically |
| 340 | transcript-tester, branch-tester | No | The seam: one evaluator of the claim language that a walkthrough transcript and a Chord test tree both write in, so a fix to how a state claim reads a trait reaches Dungeo's chain and the IDE's Testing tab once. The revamp inherits one contract. | ~1,100 duplicated lines removed |

Not every package the survey visits produces an ADR. `lang-en-us` was assessed and yielded a cleanup issue, GH #382 (four unreferenced message tables of about 330 lines, stale text-service comments, two unreferenced grammar types), because nothing in it constrains future sessions: no structure to decide, only dead weight to remove. That is the right outcome for the language layer, whose one job is to hold every user-facing string in one place (core-concepts), and the survey finding that it does so with no second copy is itself alignment evidence. An issue is the correct vehicle when the finding is deletion alone.

`parser-en-us` ended the same way, as GH #385 (a dead 175-line matcher that shares 88 lines with the live one, six unreferenced exports, three skipped tests). The survey's reason it needs no ADR is itself the alignment finding for this package: the standard grammar is generated from the Chord source with a freshness gate (ADR-269 D7), so the parser's seam with the language is already data with a check on it, and the parser is vocabulary-free by stated invariant. The issue also names two long methods (`entity-slot-consumer.ts` `consume` at 459 lines, `english-parser.ts` `convertGrammarMatch` at 397) as candidates for a later pass. They are the `buildEntity` shape at smaller scale, and if that pass comes it should use ADR-336 D2's answer, one builder per slot kind in a declared order, rather than a new one.

Read across the table, the survey is balanced: 334, 338, and 339 are Sharpee-side elegance, 336 is Chord-side, 335, 337, and 340 are the seam. None of them is worth more for being on one side. ADR-337 is the only accepted decision that can move rendered text. ADR-338 is mostly deletion, and deletion is the cheapest kind of refactor: its cost is one confirmation and one compile. ADR-334 is the highest-ceremony change in the set, which is a fact about cost, not about value.

## Alignment

### ADR-337 closes a promise Chord already makes

The runtime's dead-clause diagnostic decides whether `on taking it` can ever fire by consulting `interceptorConsultingActionIds`, which is derived from the descriptor table (`packages/story-loader/src/runtime.ts:704`; the set at `packages/stdlib/src/actions/lifecycle/registry.ts:143`). Today that promise is one step ahead of the mechanism: a descriptor exists for `answering`, so the diagnostic says the clause will fire, but the action never calls the post-validate hook (ADR-337 Context). After D1 the table and the mechanism are the same thing. This is the best example in the set of a platform change making the seam simpler in exactly the sense core-concepts asks for.

### The refusal-order change lands on Chord authors, not on Dungeo

In `going`, three refusals speak before the hook can run (`packages/stdlib/src/actions/standard/going/going.ts:266`, `:280`, `:297`; the hook at `:305-306`). The first is structural: the destination slot cannot be resolved without a direction, so the interceptor surface does not exist yet. That suggests the criterion for `earlyRefusal` is "the slot resolver could not resolve", not a per-action opt-out. Naming it that way keeps the descriptor honest and the exception list short.

The three Chord test trees catch the corpus, but a fourth Chord story with a room-level `on going` guard and no exit in that direction will read differently after D1. That is the one author-facing content change across the accepted ADRs and it needs a line in the Chord release notes when it ships.

### The engine seams do not collide

The executor sits under the execution stage (`packages/engine/src/game-engine.ts:1226` calls `commandExecutor.execute`; `runPhases` at `packages/engine/src/command-executor.ts:425`), so ADR-337 D1 and ADR-334 D1 are independent edits that share only the engine test suite. NPC acts route through the same `runPhases` (`command-executor.ts:414`), so the uniform hook order applies to actors for free, which ADR-328 D1/D2 intended.

### One sequencing dependency

ADR-336 D1 edits the statement switch at `runtime.ts:4168`, which ADR-335 D1 moves into `runtime/statements.ts`. Land 336 D1 first; it is already flagged as a standalone one-phase plan (ADR-336 D7).

### Three generated artifacts under one gate

ADR-335 D4's alias derivation joins the ADR-276 manifests and the grammar file under `./repokit verify`. Same shape, same check, no new idiom.

### ADR-338 touches Chord at one line, and that line is unchanged

Chord placement goes through the author view's bypass: the loader constructs `new AuthorModel(world.getDataStore(), world)` once for pass 2 and calls its `moveEntity` for every `in` / `on` / `starts in` placement (`packages/story-loader/src/loader.ts:489-497`). D1 keeps both bypass bodies verbatim and forwards everything else to the live world, so a Chord story boots through the same path with the same result. Chord itself knows nothing of `TraitType` (no import under `packages/chord/src`); the generated manifest reads only the character vocabulary from world-model (`tools/repokit/src/commands/manifest.ts:182`, `:304`). D4's registration pin is therefore a world-model concern with no Chord-side twin, and that is correct: the Chord-visible surface of a trait is the loader's `buildEntity` mapping, which D4 does not and should not cover.

### The construction-site count is seven, not four, and three are Dungeo

The ADR's Context counts four `new AuthorModel(...)` sites (the loader and three helpers builders). There are three more, all in Dungeo: `stories/dungeo/src/regions/frigid-river.ts:434`, `round-room.ts:76`, `volcano.ts:359`, each placing a treasure in a closed container. D1 says "the four construction sites become `createAuthorModel(world)`", and the Scope line does not list `stories/dungeo`. Dungeo must keep working (it is the walkthrough chain that AC-4 relies on), so the plan either edits those three files, which is a scope change, or keeps `new AuthorModel(dataStore, world)` as a working spelling. The second is the smaller move and costs nothing: a JavaScript constructor may return an object, so the class constructor can return the proxy and the factory becomes a convenience. That also preserves the one author-facing mention in the API reference (`packages/sharpee/docs/genai-api/authoring.md:239`, the helpers' `skipValidation` doc) without a doc edit. This is a fact the plan needs, not a defect in the decision.

### The author model has a third bypass D1 does not list

D1 names two bypasses (`createEntity`, `moveEntity`) and three helpers as the only members the view overrides; everything else forwards to the live world. The current class has one more override with author-model semantics: `canMoveEntity` always returns `true` (`packages/world-model/src/world/AuthorModel.ts:197`, "AuthorModel always allows moves"), where the world's own version validates (`WorldModel.ts:1181`). Under D1 as written the view would forward to the validating version, and any caller asking the author model whether a placement is allowed would get a different answer than today. No caller was found in the loader, the helpers, or Dungeo (`grep` across `packages/story-loader/src`, `packages/helpers/src`, `stories/dungeo/src`, 2026-09-08), so the change is almost certainly unobserved. The plan still decides it in one line: either `canMoveEntity` joins the override list, keeping the author model's promise that a move never fails, or it is deleted deliberately with a note that the view now reports the world's answer. Leaving it to the forwarding default would be the one behavior change in D1 that nobody chose. (David, 2026-09-08: add this to the plan.)

### ADR-338 D3 and ADR-339 D2 point the same way

D3 records the character-model trait as the one stateful object whose mutators live on the trait by design. ADR-339 D2 moves the two stdlib callers of those mutators, `lucidity-decay.ts` and `character-observer.ts`, into `packages/character`. The two decisions are consistent: 338 says the model is one object, 339 brings the object's per-turn drivers home to it. The ADR-310 D17 amendment paragraph that 338 D3 orders should name the tick's sub-steps as the mutators' callers, so the exception is recorded once with both halves. That means 338 D3 lands after 339 D2.

### ADR-339 moves with the dependency arrow, not against it

`@sharpee/character` depends on `@sharpee/stdlib` and `@sharpee/chord` (`packages/character/package.json`); `stdlib` does not depend on `character`. D2 moves two modules from the upstream package to the downstream one, which is the direction dependencies already flow, so no cycle appears and no package boundary is crossed in the wrong direction. The one external consumer of the tick is the loader, which registers the phase once at engine-ready (`packages/story-loader/src/loader.ts:1140`); its import is one of the names D4 keeps, so Chord stories boot unchanged. Chord's character-model lines (ADR-310) compile to IR that `apply-compiled.ts` consumes, and nothing in 339 touches that path. The nets are right: `secret-letter` and `ides-of-march` carry character-model lines and exercise the tick; `fernhill` does not and proves nothing else moved; Dungeo has no character-model NPCs and is correctly excluded.

### Three nested ordered lists

After 334 and 339 land, a turn is a list of stages (`TURN_STAGES`), one stage is the actor tick whose plugins run in `TURN_BANDS` order, and the character phase inside that tick is a list of sub-steps (`CHARACTER_TICK_SUB_STEPS`). Each level is pinned by its own test, and each level's list is opaque to the level above. That is the survey's shape applied consistently down three levels, and it is why a future "where in the turn does X run" question has a three-part answer instead of a 426-line read.

### ADR-338 D2 and ADR-337 D1 edit the same engine file

D2 retargets `IParser` imports in `packages/engine/src/command-executor.ts` (`:21`, `:143`, `:162`); ADR-337 D1 adds the lifecycle hook sequence to the same file's `runPhases`. The overlap is an import block against a method body, so it merges trivially in either order. Noted so neither plan is surprised.

### ADR-340 reverses a ruling it does not name

ADR-340 amends ADR-307's "untouched" line. The ruling it actually reverses is ADR-302 D15 (`adr-302-*.md:452-456`): branch-tester is "a full copy with no shared code … not a subpath of `@sharpee/transcript-tester` and **not a dependent of it**". D1 makes it a dependent. That is the right call, and D15's own amendment already narrowed the freeze to "the harness's grammar and runtime semantics", which D2 and D5 honor, so nothing in 340 breaks the freeze's purpose. But D15's rationale is recorded in three places the plan must touch, and the ADR names none of them: ADR-302 D15 itself, the build-order comment in `tools/repokit/src/repo.ts:54-59` ("a full copy of the transcript harness, not a fork … nothing in the CLI graph imports it"), and the synthesis engine's header (`packages/branch-tester/src/auto-assertion.ts:8-10`: transcript-tester "keeps its full copy per ADR-302 D15; that copy is frozen and cannot drift because it never moves"). The last sentence is the premise 340's Context measured to be false. The plan should carry the D15 amendment note beside the ADR-307 one, and rewrite both comments in the same phase.

### The synthesis engine is the duplicate the IDE reaches, and 340 leaves it duplicated

The Context lists `synthesizePolicyAssertions` among what is "only in transcript-tester". It is defined in both packages: `packages/transcript-tester/src/runner.ts:1097` and `packages/branch-tester/src/auto-assertion.ts:130`. The branch-tester copy is the one the IDE bundles into the browser: the testing surface's build reaches into branch-tester's source by path alias for exactly three files, `auto-assertion.ts`, `types.ts`, and `tree-document.ts`, with `platform: 'browser'` (`tools/ide/web/testing-surface/build.mjs:27-50`). Its own header says "a second spelling of the synthesis is drift". Under D2 as written, the golden tier's spelling stays in transcript-tester and the IDE's spelling stays in branch-tester, so the one duplicate the IDE depends on is the one the ADR does not merge. This is a fact for the plan's first phase, whose per-function diff will find it: synthesis belongs in the core.

### The core should be browser-safe, and it costs nothing to make it so

That finding sets a constraint the ADR does not state. Seven of transcript-tester's fifteen modules import `fs` or `path` (`cli`, `golden`, `reporter`, `parser`, `story-loader`, `runner`, `watch`), and branch-tester's `types.ts` is pure (one type import from core). The functions D1 shares are pure by construction, so the `assertion-core` module can carry no Node import, and then the IDE's build can alias it the same way it aliases the three branch-tester files today. The tree runs themselves are not in the browser: the IDE shells out to `sharpee test --tree` (`tools/ide/SharpeeIDE/Test/TestRunner.swift:113`), so the runner's Node imports never mattered. But the synthesis does run in the browser, and the testing-UX revamp that 340 is sequenced ahead of will want the evaluator there too. A browser-safe core serves both. The type moves reach the browser as well: whatever `branch-tester/src/types.ts` re-exports from transcript-tester must be `export type`, or the browser bundle tries to resolve a package whose barrel imports `fs`.

### Build order and the consumer closure already point the right way

The repokit build list is explicit and already has transcript-tester before branch-tester (`tools/repokit/src/repo.ts:53`, `:60`). Transcript-tester is in the npm consumer closure and branch-tester deliberately is not, so a dependency from the second to the first adds nothing the closure must carry. The dependency arrow D1 draws is the one the build and the publish already assume.

## Elegance

### The same shape appears six times, at three strengths

`TURN_STAGES` and `META_STAGES` (334), the thirteen-section bind order (335), `ENTITY_LINE_BUILDERS` and `ANALYSIS_PASSES` (336), and the executor's hook sequence (337) are all "an ordered list of named steps pinned by a test", extending ADR-332's `TURN_BANDS` (`packages/plugins/src/turn-bands.ts`). They are not the same design:

- ADR-336 D3 declares each pass's `requires` and lets the test derive the order check. The dependency is data.
- ADR-334 D1 pins the order by name and moves the "why" into stage headers. The dependency is prose again, which is the complaint ADR-334's own Context opened with.
- ADR-335 D1 preserves bind order "verbatim" and pins nothing. AC-1 checks that modules exist, not that they register in order.
- ADR-340 D3 is a fourth shape: a structural test with a pinned fixture of function names that must not be redefined in branch-tester. It guards against re-copying, which is the failure that actually happened, so it is the right test even though it is neither an order pin nor a compiler proof.
- ADR-339 D3 is the 334 form again: `{ name, run }` pinned by name, with the header's contract sentence ("scenes run last because they consume the propagation and goal sub-steps' same-turn output") moved onto the array as a doc comment. The dependency is real and already visible in the code: five of the seven sub-steps read or write a shared `surface` accumulator (`packages/character/src/tick-phases.ts:418-424`), and two do not. A `requires` list would state exactly that, per sub-step, instead of restating it in prose.

The `requires` form is strictly stronger and costs about the same. Applying it to `TURN_STAGES`, to the bind order, and to `CHARACTER_TICK_SUB_STEPS` is a one-line amendment to each ADR, and it means a future stage, section, or sub-step names what it must follow instead of where it sits.

Chord cannot share code with the engine: `packages/chord/package.json` has no runtime dependencies at all and the package must stay browser-safe (ADR-210). So this is a shared idiom and test shape, not a shared module. That is the right outcome.

### Each ADR asserts its invariant instead of documenting it

The runtime header rewrite (335 D2), the `never` defaults (336 D1), the hook-sequence test (337 D1), the stage test (334 D2), the proxy view (338 D1, where "all other methods delegate" becomes structurally true rather than a header's promise) the sub-step order test (339 D3), and the no-redefinition test (340 D3) all follow DevArch rule 6. That consistency is the survey's real achievement and it holds across all seven.

### The proxy is the right primitive, and the reason is worth recording

ADR-338 D1 is the only decision in the survey that replaces a compile-time structure (89 hand-written delegations) with a runtime one (a `Proxy` whose `get` trap binds every member to the live world). Two facts make it sound rather than clever. `WorldModel` has no JavaScript private fields (`grep -c '^\s*#' WorldModel.ts` → 0), so bound methods reach every field through the real instance. And the obvious lighter alternative, `Object.create(world)` with five overrides, is unsound: a method writing `this.field` would land on the derived object and shadow the world's own field on the next read. The proxy forwards writes to the one instance. No `instanceof WorldModel` or `instanceof AuthorModel` check exists in any package, so the proxy's target being the world is invisible to callers. The plan's header for `AuthorModel.ts` should say why `Object.create` was not used, or the next reader will "simplify" it.

One refinement to the trap, decided for the plan (David, 2026-09-08). D1 says the trap forwards every member "bound to the live world"; read literally that is a `bind` on every property read, allocating a fresh bound function each time an author calls through the view. The plan binds once per member per view and caches the result, so the steady-state cost is one `Map` lookup per call and the first call to each member pays the bind:

```ts
export function createAuthorModel(world: WorldModel): AuthorModel {
  const overrides = authorOverrides(world);   // the bypasses and helpers D1 names, plus canMoveEntity if the plan keeps it
  const bound = new Map<PropertyKey, unknown>();
  return new Proxy(world, {
    get(target, key, receiver) {
      if (key in overrides) return overrides[key];
      const hit = bound.get(key);
      if (hit !== undefined) return hit;
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== 'function') return value;
      const member = value.bind(target);
      bound.set(key, member);
      return member;
    },
  }) as AuthorModel;
}
```

Only functions are cached. A non-function member is read through to the live world on every access, so the view never holds a stale copy of world state, which is the property D1 exists to guarantee. The trap remains the whole mechanism: the cache does not reopen the `Object.create` question above, and the header still records why that alternative was rejected. This is a plan-level detail, not an amendment to ADR-338 D1.

### D4 pins one thing the compiler already proves and one it cannot

`TRAIT_IMPLEMENTATIONS` is declared `Record<TraitType, ITraitConstructor>` (`packages/world-model/src/traits/implementations.ts:85`), and `TraitType` is a `const` object (`trait-types.ts:10`), so a `TraitType` key missing from the map is already a compile error. That is ADR-336 D1's idiom, already in place here. The half of the five-place checklist the compiler cannot see is the two barrels, which is exactly the half the project memory records as the trap ("both barrels + rebuild dist and dist-esm"). D4's test earns its place for the barrel exports and the class-reports-its-type check; the implementations-entry assertion duplicates `tsc` and can be dropped from the test when the plan writes it. The ADR's Context ("no test asserts the whole set agrees") is true of tests and false of types.

### Headers keep what the code does and which ADR decided it as separate concerns

Every ADR in the survey moves prose into headers: 334 D1 puts the "why an order holds" into stage headers, 336 D2 keeps "the ADR that added each line kind" in the builder's header, 339 D3 moves the tick's contract sentence onto the array, and every new module gets a rule-9 header under this repository's `documentationStandard: always`. So the six plans will write or rewrite well over a hundred headers, and the shape of those headers is a decision worth making once, now.

The shape today interleaves the two concerns. The tick's header (`packages/character/src/tick-phases.ts:1-11`) reads: *"The character-model NPC tick phase (ADR-144, 145, 146; ADR-310 D15/D17). One tick-phase registration running ordered sub-steps: decay → observe → influence → propagation → goals → scenes → arrival reactions (GH #353) (ADR-320 Phase 8). (Arbiter bookkeeping arrives with ADR-318's arbiter.) Ordering between sub-steps is a contract … (docs/work/archive/adr-310/contracts.md §2)."* Seven references sit inside four sentences of logic. A reader who wants to know what the phase does has to step over each one; a reader who wants the provenance has to pick it out of the prose. Neither reader is served, and the same interleaving is what made `executeTurn`'s 426 lines and `buildEntity`'s 920 hard to read in the first place: the ADR citations were the comments.

The convention the plans should apply: a header states the logic first, in plain sentences with no citations, and then carries its references in a separate block, one line per decision, each naming what that decision fixed in this file. In rule-9 terms the header has four parts, not three: purpose, public interface, owner context, and references. The same header, in that shape:

```
/**
 * The character-model NPC tick phase.
 *
 * One tick-phase registration running ordered sub-steps: decay, observe,
 * influence, propagation, goals, scenes, arrival reactions. Ordering is a
 * contract, which is why this is one registration rather than several:
 * scenes run last because they consume the propagation and goal sub-steps'
 * same-turn output. All mutable state rides CharacterModelTrait; the
 * registry below holds only authored configuration.
 *
 * Public interface: createCharacterModelPhase, registerCharacterModelPhase,
 *   CharacterPhaseRegistry, CharacterPhaseConfig, CHARACTER_MODEL_PHASE_NAME.
 * Owner context: @sharpee/character
 *
 * References:
 *   ADR-310 D15/D17 — one registration with ordered sub-steps; state on the trait.
 *   ADR-144/145/146 — the propagation, goal, and influence subsystems the sub-steps drive.
 *   ADR-320 Phase 8, GH #353 — arrival reactions, the seventh sub-step.
 *   ADR-318 — arbiter bookkeeping.
 *   docs/work/archive/adr-310/contracts.md §2 — the ordering contract.
 */
```

The reader who wants the mechanism stops at the owner line. The reader who wants provenance skips to the block. Method headers follow the same rule at smaller scale: the summary line and parameters carry no citation, and a trailing `Reference: ADR-nnn Dm` line carries it when one applies. Inline comments inside a body cite an ADR only where the code would otherwise look wrong (a deliberate ordering, a deliberate omission), and even then the sentence says what the code does before it says who decided it.

This costs nothing the plans are not already paying, because every header they touch is being rewritten anyway, and it gives the survey a second consistent idiom beside the ordered list: one for how order is expressed in code, one for how a file explains itself.

David's ruling (2026-09-07): this is not architecture, so it is not an ADR. It is a code documentation sweep across all of the code, covering file, class, and method headers alike, recorded as `docs/proposals/code-documentation-sweep.md` (eight items, all accepted) and filed as GH #384. The survey plans apply the convention to every header they touch; the sweep covers the rest and finishes the survey's packages after their plans land.

## Recommended order of the plans

By cost and risk, not by side. Neither Sharpee nor Chord is favored, so the order puts the cheapest compile-time changes first, the one phase that can move text where its diff can be read alone, and the large mechanical moves after:

1. ADR-336 D1 as its own one-phase plan (compile-time only, a day).
2. ADR-338 D2 and D4 (deletions after confirmation, one test; the cheapest phases in the survey).
3. ADR-339 (the lightest plan in the set: seven mechanical moves with the dependency arrow, one test).
4. ADR-337 (the seam change; the one output diff to read line by line).
5. ADR-335 (largest move, mechanical).
6. ADR-338 D1 and D3 (the proxy view and the recorded exception), after 339 so the ADR-310 D17 amendment names the sub-steps as the mutators' callers.
7. ADR-340 (the two testing runtimes; sequenced before the testing-UX revamp, and its first phase is a read-only per-function diff that can start any time).
8. ADR-334 (highest ceremony; the engine's turn runner is the widest blast radius in the set).
9. ADR-336 D2/D3 can interleave anywhere after D1.

Before any of them: amend ADR-334 D1, ADR-335 D1, and ADR-339 D3 to carry `requires` on their lists, and write the header convention above into each plan so every rewritten header follows it.

## Open

- The survey has covered ten packages: seven ADRs (340 covers the two testing runtimes) and two issue-only cleanups (`lang-en-us` GH #382, `parser-en-us` GH #385).
- ADR-340's plan needs three facts from above: the ADR-302 D15 amendment and its two code comments, the synthesis engine as the IDE-reached duplicate, and the browser-safe constraint on the core. Whichever comes next gets a row, an Alignment section, and an Elegance check against the ordered-list idiom, or a line in the Impact section if it ends as an issue.
- Whether `earlyRefusal` should be named for slot-resolution failure (above) is a question for ADR-337's plan, not an amendment this document makes.
- ADR-338's plan needs the seven-site count and a decision on whether `new AuthorModel(dataStore, world)` stays a working spelling (above); this document recommends it does. It also carries two items added 2026-09-08 at David's direction: the `canMoveEntity` override is decided in one line (keep it or delete it with a note, never left to the forwarding default), and the proxy's `get` trap binds each member once per view and caches it (the snippet above).
