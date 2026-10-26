# ADR-377: State machines are core: `define machine` needs no `use` line

**Status**: **ACCEPTED** (David, 2026-10-17, session 32f84f: "fix and accept", after the four-record `adr-review` of ADR-366, 375, 376 and this record returned READY WITH CLARIFICATIONS with two findings here, both folded: D4's corpus list gained the two files it missed and Scope gained `packages/world-index`; AC-1's third clause now measures the core registration with a Chord fixture, since Dungeo never enters the loader. ADR-215 stamped in the same change). History: written DRAFT the same day, session 95606b (David: "we should merge state machine usage into the base system", then "at some point, we don't need to hold to older ADRs and can supersede them"). No open questions. Lands as Slice 0 of Chord 4.0 plan Phase 11.

**Scope**: `packages/chord` (the `state-machines` manifest, the analyzer's gate, `chord.ebnf`), `packages/story-loader` (the extension registry and the core plugin registration), `packages/plugin-state-machine` (the vehicle phase, ADR-366 D5e), `packages/world-index` (one test source writes the line), the stories and fixtures that write `use state-machines`, `website/src/app/chord`

## Date: 2026-10-17

**Kind**: technical

## Supersedes

- **ADR-215**, in part: the sentence "Combat and state-machine remain `use`-gated" in its Q4 exception, and the "State machines" bullet that gates the ADR-119 depth behind `use state-machines`. Everything else in ADR-215 stands: `use` is top-level and one per extension, manifests are static data, the trusted registry is runtime-bundled, combat stays gated. **ADR-215's status line is stamped by this record at its acceptance**, and this record's author does the stamping.

## Context

ADR-215 made NPCs core on 2026-07-14 because they are common, and left state machines gated because the ADR-119 depth (`define machine`, `onEnter`/`onExit`, terminal states, role bindings) was new and opt-in. Since then the machine became the shape of a platform mechanism: ADR-366 D5e makes every moving vehicle's motion a built-in state machine, ticked by the state-machine turn plugin, in the base vehicle that has no `use` line (D12). Today that plugin is registered only by the `state-machines` extension's `installFromIR`, only under `use state-machines`, only when a story has a `define machine` (`packages/story-loader/src/extensions/state-machines.ts:123-135`). A base mechanism cannot depend on a gate the author may not have opened. The choice was to install the plugin a second way for vehicles, or to make the machine core; David chose core.

## Decision

**D1 — The state-machines vocabulary is core, as NPCs are** (ADR-215 Q4's exception, now covering two libraries). `STATE_MACHINES_MANIFEST` carries `core: true`. `define machine` and the whole ADR-119 depth compile with no `use` line. `use state-machines` is `analysis.extension-core`, the shipped diagnostic ("vocabulary is core — it is always available; remove the `use` line", `packages/chord/src/analyzer.ts:1066-1072`). The analyzer's gate on `define machine` is removed, and `chord.ebnf`'s `use-plain-line` note names state machines with npc as core.

**D2 — One `StateMachinePlugin` per story, registered by the loader's core path.** `state-machines` leaves `EXTENSION_REGISTRY` (`packages/story-loader/src/extension-registry.ts:175`), with its `gatedConstruct` backstop. The loader registers the plugin for every story beside the NPC service and the scheduler, and registers the story's lowered machines on it (the body of today's `installFromIR`, moved, unchanged). Its priority stays `TURN_BANDS.platformPhases.floor + 40` (ADR-366 D5e). An empty plugin does nothing per turn.

**D3 — The vehicle machine is a phase of that plugin.** ADR-366 D5e's host is this plugin; the vehicle stepping functions (ADR-366 D5e, Phase 11) run in it after the story's machines each turn. No second turn host is added.

**D4 — The corpus drops the line.** Every story and fixture that writes `use state-machines` has it removed in the same change: `branch-stories/fernhill/fernhill.story`, `branch-stories/ides-of-march/ides-of-march.story`, `stories/character-acceptance/chord/p10-threads.story`, `packages/chord/tests/fixtures/drawbridge.story`, `packages/chord/tests/fixtures/gatehouse.story`, `docs/work/stdlib-reference/fixtures/plugins/machine.story`, `tools/explorer-probe/fixtures/declared-state-fixture/declared-state-fixture.story`, `tools/ide/test-fixtures/fernhill-frozen/fernhill.story`, `packages/chord/tests/phrasebooks.test.ts`, `packages/world-index/tests/branches.test.ts`, and the chord and story-loader test sources that build the line (`compile-gate-sweep`, `state-machine`, `extension-install`, `adr-332-turn-bands`, `event-id-map-machine`, `gatehouse`, `state-machine-depth`; measured 2026-10-17 by `grep -rln "use state-machines"` over `*.story` and `*.ts`, 23 files, the rest being the chord compiler's own sources and this manifest). Tests that asserted the gate (`packages/chord/tests/compile-gate-sweep.test.ts`, `state-machine.test.ts`, `packages/story-loader/tests/extension-install.test.ts`) assert the core behavior instead. The website's `use` guide, grammar reference and two plugin pages change, and the IDE docs tab regenerates from them.

## The language, as an author reads it

Shipped syntax, minus one line:

```chord
create the portcullis
  a thing, scenery
  in the Gatehouse
  states: raised, lowered

define machine the gate
  states raised, lowered
  start lowered
  lowered to raised when the player pulling the chain
end machine
```

What was `use state-machines` at the top of the file is gone, and writing it is an error that says so.

## Acceptance Criteria

1. **AC-1 (D1, D2).** The gatehouse fixture compiles and plays with no `use` line, its machine advancing at the same turn as before; `use state-machines` in a fixture is `analysis.extension-core`; a Chord fixture with no machine loads with `sharpee.plugin.state-machine` in the engine's plugin registry, asserted by a story-loader unit test (Dungeo is TypeScript and never enters the loader's core path, so the chain cannot witness this); the Dungeo chain is unchanged, as a regression check only. **REAL-PATH** through the assembled engine.
2. **AC-2 (D4).** fernhill and ides-of-march compile and their pinned transcripts pass with the line removed.

## Consequences

- **The `use` set shrinks** to `combat`, `scoring`, `hunger`, `chapters`, and the vehicle extensions to come (ADR-366 D12).
- **ADR-215 is amended by stamp**, not rewritten: its status line gains "superseded in part by ADR-377", and its Q4 paragraph and State machines bullet gain a one-line note pointing here. ADR-366 D5e gains one sentence: the plugin is core.
- **ADR-119's depth is reachable everywhere.** Any story may write a machine; nothing about machines themselves changes.
- **Plan Phase 11, Slice 0.** The vehicle front end builds on this.

## Session

Session 95606b, 2026-10-17, on `chord-4-0`, during the Phase 11 proposal. David's two rulings came while reviewing `docs/work/archive/chord-4-0/phase-11-vehicle-front-end-proposal.md`, whose Finding 1 this record resolves.
