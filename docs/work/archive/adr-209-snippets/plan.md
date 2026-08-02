# Session Plan: ADR-209 Room-Description Snippets — platform implementation + dungeo adoption

**Created**: 2026-07-07
**Overall scope**: Implement the ADR-209 splice mechanism (author-written markers in room
prose, resolved from an author-supplied snippet map) across if-domain, world-model, stdlib,
lang-en-us, engine, and devkit; land AC-1..AC-10 as tests; then adopt the feature in dungeo
to close the scenery-unmentioned defect class the ADR was motivated by.
**Bounded contexts touched**: N/A — this project doesn't use `docs/ddd/` bounded-context
notation. Package/layer boundaries stand in for contexts: `@sharpee/if-domain` (wire
contracts), `@sharpee/world-model` (trait storage), `@sharpee/stdlib` (looking action —
scan/gate/resolve), `@sharpee/lang-en-us` (Assembler realization), `@sharpee/engine`
(load-time validation), `@sharpee/devkit` (build lint), `stories/dungeo` (adoption).
**Key domain language**: Marker (`{snippet:name}`), Snippet / SnippetEntry / SnippetMap,
Splice pass, `mentions` (presence gate), Seq phrase (in-order concatenation, no joining
punctuation).

## References consulted
- `docs/architecture/adrs/adr-209-room-description-snippets.md` — the authoritative,
  ACCEPTED spec: all 7 open questions resolved, Interface contracts fix the if-domain wire
  types and the stdlib-owns-scan/gate boundary, AC-1..AC-10 define the test surface. Header
  states implementation has not started and "requires its own go-ahead" — this plan does
  not authorize starting Phase 1.
- `docs/architecture/adrs/adr-206-game-message-param-contract.md` — render params must be
  nested under `params`, never top-level, wherever a phase emits or resolves a `messageId`
  (relevant to Phase 3/4's `{ messageId }` snippet-entry resolution and any diagnostic
  events).
- `docs/context/project-profile.md` — TypeScript strict mode, 4-file action convention,
  "language layer separation" convention (no English strings outside `lang-en-us`), and the
  Phrase-Algebra mutation-verification rule ("built the model but never rendered text" is
  an insufficient test) all bind directly on Phases 1 and 3.
- `docs/context/session-20260704-2004-main.md` (newest session by filename sort) — book/site
  work only; no open items, blockers, or deferred work that bears on this plan.
- `docs/work/dungeo-regression-cleanup/findings-20260702.md` — records the **fully-qualified
  messageId requirement** for anything routed through capability/engine dispatch, the
  **one-good-run rule** for the dungeo walkthrough chain, and the current dungeo baseline
  (106 transcripts / ~1,690 assertions, deterministically green) that Phase 6's regression
  bar must not regress below. Also confirms the original "dungeo-81" scenery audit document
  no longer exists — Phase 5 must regenerate its own findings list, not recover the old one.
- `docs/reference/core-concepts.md` — four-phase action pattern (validate/execute/report/
  blocked), behaviors-own-mutations vs actions-coordinate, `sharedData` typing discipline —
  binds Phase 3 (looking action changes).
- `docs/reference/phrase-algebra-primer.md` — the `Phrase` closed union (`kind` discriminant,
  15 members, additive-only per `phrase.ts:24-26`), the Assembler's `realize`/`realizeToRuns`
  pipeline, the Choice selector/keying/persistence contract (`(entityId, messageKey)` →
  here `(roomId, markerName)`), and the Structural Realization Mandate (ADR-202: no
  cross-node regex/re-parsing) — binds Phase 1 (Seq kind + Assembler case) and Phase 3
  (building the Seq tree, choosing selector keys).
- `packages/stdlib/CLAUDE.md` — four-phase pattern, message-ID-not-strings rule,
  `entityInfoFrom(entity)` param convention, world-state-verification testing requirement —
  binds Phase 3.
- `packages/world-model/CLAUDE.md` — root barrel discipline (every new trait field visible
  from `src/traits/room/index.ts` up through `src/index.ts`; rebuild both `dist/` and
  `dist-esm/`) and "behaviors own mutations, traits are data" — binds Phase 2.
- `packages/lang-en-us/CLAUDE.md` — all user-facing text lives here; stdlib only emits
  message IDs — binds the {messageId} resolution boundary in Phase 3/4.

## Platform-change gate (from root CLAUDE.md, not overridden by this plan)

Phases 1–4 touch `packages/` (if-domain, world-model, stdlib, lang-en-us, engine, devkit).
Root `CLAUDE.md`: *"Platform changes require discussion first... must be discussed with the
user before implementation."* ADR-209's own header says the same: *"Not yet implemented; no
implementation is planned until the draft is reviewed and accepted"* — it has since been
accepted, but implementation itself still needs its own explicit go-ahead. **This plan is
not that go-ahead.** Phase 5–6 (dungeo, a `stories/` change) may proceed autonomously once
the platform feature exists and works, per the same policy.

## Phases

### Phase 1: if-domain Snippet wire types + Seq phrase kind + Assembler realization
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `@sharpee/if-domain` (wire contracts), `@sharpee/lang-en-us` (Assembler)
- **Entry state**: ADR-209 accepted (done). No prior snippet code exists.
- **Deliverable**:
  - `SnippetText`, `SnippetEntry`, `SnippetMap` types added to `@sharpee/if-domain`
    (co-located per the wire-type-sharing rule — consumed by world-model, stdlib, and
    lang-en-us), matching the ADR's Interface contracts block verbatim.
  - A decision, made and recorded first: does the existing `PhraseList` (`kind:'list'`)
    with no conjunction already realize as honest in-order concatenation with **no**
    joining punctuation? If yes, reuse it and skip adding `Seq`; if no (e.g. `PhraseList`
    always inserts a serial-comma/conjunction seam), add the new `Seq` phrase kind
    (`{ kind: 'seq', parts: Phrase[] }`) as one new union member per `phrase.ts:24-26`'s
    additive-extension rule, plus its `isSeq` type guard.
  - One new Assembler case in `realizeToRuns` (`english-assembler.ts`) that concatenates
    `Seq.parts` in order with no separator, respecting the Structural Realization Mandate
    (ADR-202: token/run-local only, no cross-node regex).
  - A shared, pure marker-extraction helper (e.g. `extractSnippetMarkers(text: string):
    string[]`) placed in `@sharpee/if-domain` so both the engine (load-time validation,
    Phase 4) and stdlib (render-time scan, Phase 3) import one implementation instead of
    duplicating the `{snippet:name}` regex.
  - Unit tests: type guards, Assembler concatenation (parts = mix of `Verbatim`/`Literal`/
    `Choice`, output byte-exact, `Empty` absorbed), marker-extraction helper (no markers,
    one marker, duplicate marker, malformed brace).
- **Exit state**: `pnpm --filter '@sharpee/if-domain' test` and
  `pnpm --filter '@sharpee/lang-en-us' test` green. `Seq` (or the `PhraseList` reuse
  decision) is documented in a short comment in `phrase.ts` explaining the choice, so
  Phase 3 doesn't re-litigate it.
- **Critical files**: `packages/if-domain/src/phrase.ts`,
  `packages/lang-en-us/src/assembler/english-assembler.ts`,
  `packages/if-domain/tests/`, `packages/lang-en-us/tests/assembler/`.
- **Status**: CURRENT

### Phase 2: world-model RoomTrait.snippets storage + builder sugar
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `@sharpee/world-model` (RoomTrait data)
- **Entry state**: Phase 1's `SnippetMap` type exists and is importable from `@sharpee/if-domain`.
- **Deliverable**:
  - `RoomTrait.snippets?: SnippetMap` field, alongside the existing ADR-107
    `descriptionMessageId` / `initialDescription` fields.
  - `room().snippets(map)` builder sugar matching how `initialDescription` landed.
  - Field must be reachable by **direct-trait construction** (no builder) — this is a hard
    ADR-209 requirement (resolved Q2) because dungeo (Phase 6) authors traits directly, not
    through the builder.
  - Root barrel discipline followed: export path from
    `src/traits/room/index.ts` → `src/traits/index.ts` → `src/index.ts`.
  - World serialization: `snippets` round-trips through save/load like any other trait
    field (no new capability needed — it's plain data, not persisted counters; counters
    live in the existing `TEXT_STATE` capability per Phase 1/3).
  - Unit tests: trait construction (both builder and direct), serialization round-trip,
    default-undefined case (room with no snippet map behaves identically to today —
    covers part of AC-7).
- **Exit state**: `pnpm --filter '@sharpee/world-model' test` green;
  `npx madge --circular packages/world-model/src/index.ts` clean (per package CLAUDE.md
  circular-dependency caution when touching the root barrel).
- **Critical files**: `packages/world-model/src/traits/room/room-trait.ts` (or equivalent),
  `packages/world-model/src/traits/room/index.ts`, `packages/world-model/src/traits/index.ts`,
  `packages/world-model/src/index.ts`, `packages/world-model/src/entities/builders/room-builder.ts`
  (or wherever `room()` sugar lives — confirm exact path at phase start).
- **Status**: PENDING

### Phase 3: stdlib looking action — snippet scan/gate/resolve pass
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `@sharpee/stdlib` (looking action) — this is the ADR's designated
  scan/gate boundary; the Assembler stays world-blind.
- **Entry state**: Phase 1 (`Seq`/wire types + Assembler case) and Phase 2 (`RoomTrait.snippets`)
  both land and pass their own test suites.
- **Deliverable** (per ADR "Boundary resolution" section):
  - The looking action's report/data-build path splits `description` and
    `initialDescription` text at `{snippet:name}` markers (using Phase 1's shared
    extraction helper), only when the room has a `snippets` map (AC-7: no map → pure
    `{verbatim:description}`, unchanged).
  - Each marker resolves to its `SnippetEntry`: string (verbatim every render), string[]
    (short form, default selector `cycling` — ADR resolution Q3), `SnippetText &
    { mentions }`, or the long `{ selector, texts, mentions }` form.
  - Presence gate: a snippet with `mentions: <entityRef>` renders only while that entity is
    present via **transitive containment in the room** (ADR resolution Q9 — "here" scope
    semantics, however deeply nested); gated-out or empty-string entries render as nothing,
    never an error (AC-4).
  - `{ messageId }` texts resolve through the language provider interface at this stage,
    not later (AC-10); unknown ids follow the platform's existing missing-message fallback
    (see phrase-algebra-primer §6/§12 for the existing failure-mode contract — don't invent
    a new one).
  - Duplicate markers in one description resolve **once** per render — same resolved text
    at both sites, one counter advance (AC-8).
  - `description` and `initialDescription` **share entries and counters** — a marker used
    in both draws from the same snippet entry and the same Choice selector counter (AC-9).
  - Choice nodes are keyed `(roomId, markerName)` — a **new keyspace** alongside the
    existing `(entityId, messageKey)` convention; document the convention inline to avoid
    future collisions (ADR Consequences section flags this explicitly).
  - Render-time graceful degradation: an unbound marker (map mutated at runtime by a
    handler after load-time validation passed) splices nothing and logs
    `[snippet] room "<id>": marker '<name>' has no entry` — never throws mid-turn.
  - The resolved `Seq` is bound as the `description` param exactly as
    `if.room.description_body` (`{verbatim:description}{slot:here}`) already expects — the
    template shape doesn't change, only the param's value becomes composite.
  - Unit tests (owning-package, per the ADR's test-derivation rule): AC-4 (presence gate,
    entity taken/destroyed/moved and returning), AC-7 (no-map passthrough), AC-8 (duplicate
    marker single resolve), AC-9 (shared entries/counters across description/initialDescription),
    AC-10 (messageId resolution + unknown-id fallback), plus a render-time unbound-marker
    graceful-log test.
- **Exit state**: `pnpm --filter '@sharpee/stdlib' test looking` green; a room with a
  snippet map renders correctly end-to-end when driven with a hand-built `RoomTrait` and
  world (no engine/devkit involvement needed yet — that's Phase 4).
- **Critical files**: `packages/stdlib/src/actions/standard/looking/looking.ts`,
  `looking-data.ts`, `looking-events.ts`, `looking-messages.ts`,
  `packages/stdlib/src/utils/noun-phrase.ts` (or new `snippet-resolver.ts` utility file —
  confirm the right home; a dedicated `packages/stdlib/src/actions/standard/looking/snippet-resolver.ts`
  is a reasonable split given size), `packages/stdlib/tests/`.
- **Status**: PENDING

### Phase 4: engine load-time validation, devkit build lint, end-to-end verification
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `@sharpee/engine` (story-load validation), `@sharpee/devkit`
  (build-time lint), plus the first full vertical-slice test of the feature.
- **Entry state**: Phase 3's scan/gate/resolve pass is unit-green; a room with a snippet
  map can render correctly when driven directly (no story load path yet).
- **Deliverable**:
  - Engine: after `initializeWorld` returns, scan every snippet-bearing room's
    `description` and `initialDescription` (via Phase 1's shared marker-extraction helper)
    and synchronously fail story load, naming room and marker, for any marker with no
    snippet entry (AC-5) — same posture as `PhraseParseError`.
  - devkit: a build lint **warning** (not an error — ADR resolution Q4) naming room and
    entry when a snippet entry's marker appears in neither description text.
  - One story-level transcript exercising AC-1, AC-2, AC-3, AC-4, AC-8, AC-9 end-to-end,
    added to a lightweight existing test story (pick one with minimal regression surface —
    e.g. `concealment-test` or `cloak-of-darkness`, not `dungeo`; confirm the best fit at
    phase start) or a small new fixture room within one:
    - AC-1: byte-exact first-visit render (default `cycling` picks first entry).
    - AC-2: repeated `look` advances `cycling` in declaration order and wraps; a `random`
      snippet replays identically within the same transcript run.
    - AC-3: `$save` mid-cycle, `$restore`, cycle continues where it left off.
    - AC-4: presence gate — take/destroy/move the `mentions` entity, confirm the snippet
      stops rendering, confirm it resumes if the entity returns.
    - AC-8: duplicate marker in one description.
    - AC-9: initialDescription (first visit) then description (second visit) share the
      cycling counter.
  - Unit test (engine): AC-5 load-time failure, naming room and marker in the error.
  - Unit/build test (devkit): AC-6 lint warning, naming room and entry.
- **Exit state**: `./repokit build` succeeds with the lint warning visible for a
  deliberately-planted unused-entry fixture (then removed/asserted-on, not left in);
  `node dist/cli/sharpee.js --test <the new transcript>` passes; `pnpm --filter
  '@sharpee/engine' test` and `pnpm --filter '@sharpee/devkit' test` green. All 10
  acceptance criteria (AC-1..AC-10) now have a passing test somewhere in the suite —
  cross-check against Phases 1–4's test lists before closing this phase.
- **Critical files**: `packages/engine/src/game-engine.ts` (or wherever `initializeWorld`
  orchestration lives — confirm exact hook point at phase start),
  `packages/devkit/src/build/` (lint pass location — confirm at phase start), the chosen
  test story's `src/index.ts` and a new `tests/transcripts/adr-209-snippets.transcript`.
- **Status**: PENDING

### Phase 5: Dungeo scenery audit — regenerate the unmentioned-scenery findings
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `stories/dungeo` (audit only, no code changes)
- **Entry state**: Phases 1–4 complete; the snippet feature works end-to-end and is merged
  (or at minimum stable on a branch dungeo can build against). Platform-change discussion
  for Phases 1–4 has already happened per the gate above — this phase is story-side and
  does not re-trigger that gate.
- **Deliverable**: A findings document (`docs/work/adr-209-snippets/dungeo-scenery-findings.md`)
  identifying dungeo rooms where prose quietly omits interactable scenery (the defect class
  the original, now-lost, 81-finding audit documented — do not attempt to recover that
  file; regenerate independently). For each finding: room id, the unmentioned scenery
  entity, a proposed marker name and 1-2 candidate snippet texts, and whether `mentions`
  gating applies (entity can be taken/destroyed/moved). Scope to findings that are clean
  fits for the splice mechanism — skip anything that would need `mentions` gating rules the
  ADR explicitly rejected (predicate functions, non-presence conditions) and note it
  instead as future event-handler work.
- **Exit state**: Findings document reviewed and prioritized (which rooms to tackle in
  Phase 6 — full 81-item parity is not required; a representative, high-value subset is
  acceptable and should be called out as such).
- **Critical files**: `stories/dungeo/src/rooms/**` (read-only survey),
  `docs/work/adr-209-snippets/dungeo-scenery-findings.md` (new).
- **Status**: PENDING

### Phase 6: Dungeo adoption — implement snippets across the findings list
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: `stories/dungeo` (direct-trait room construction)
- **Entry state**: Phase 5's findings document exists and is prioritized.
- **Deliverable**: For each prioritized finding, add `snippets` to the room's
  **direct-trait-constructed** `RoomTrait` (per Phase 2's requirement that the field be
  reachable without the builder) with the marker spliced into `description` and/or
  `initialDescription`, using `mentions` gating wherever the entity can leave the room.
  Follow the fully-qualified-messageId convention from
  `docs/work/dungeo-regression-cleanup/findings-20260702.md` if any snippet resolution
  touches capability-dispatched messageIds (unlikely here, but check).
- **Exit state (regression bar, explicit per the task)**:
  - `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript` —
    deterministically green (matches or exceeds the current 106-transcript /
    ~1,690-assertion baseline; new snippet-touched rooms get their own assertions).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
    passes under the **one-good-run rule** (a single fully-passing chain run is the
    baseline; residual MDL-RNG flakes in thief/combat are not regressions).
  - Build via `./repokit build dungeo` (never ad-hoc `pnpm build`).
  - No build-fail-fix-rebuild looping — if a build or test fails, stop and report per root
    `CLAUDE.md`'s MAJOR DIRECTIONS; do not auto-retry.
- **Critical files**: the specific `stories/dungeo/src/**` room files named in Phase 5's
  findings document (enumerate exactly once that document exists — do not guess room names
  now), `stories/dungeo/tests/transcripts/*.transcript`,
  `stories/dungeo/walkthroughs/wt-*.transcript`.
- **Status**: PENDING
