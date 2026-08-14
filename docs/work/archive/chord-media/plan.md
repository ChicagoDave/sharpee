# Session Plan: Implement ADR-216 (Chord Emit Payload & Media) — Workstream W7

**Created**: 2026-07-14
**Overall scope**: Give Chord's `emit` a data payload and layer typed media sugar,
declared assets, an author-checkable `client has <capability>` predicate, and
custom-channel *declaration* on top of it — the last of the seven ADR-214
parity workstreams (W7). The channel system and its media renderers **already
exist** (`if-domain` channels, `stdlib` standard+media channels,
`platform-browser` renderers); this workstream exposes them to Chord authors,
it does not rebuild them. The one genuinely new declarative surface is
custom-channel declaration (a data projection); a *novel renderer* for a
custom channel is platform/extension territory (W6/ADR-215), not this
workstream's to build.
**Bounded contexts touched**: Chord composable vocabulary and IR
(`packages/chord`), story loading / emit-and-channel wiring
(`packages/story-loader`), grammar (possibly `packages/parser-en-us`), and —
for the one W6-gated phase only — the browser channel-renderer registry
(`packages/platform-browser`, via ADR-215's extension contribution surface).
No `stdlib`/`world-model` behavior changes; the media channels and browser
renderers this workstream drives are already built.
**Key domain language**: payloaded `emit`, media sugar, declared asset,
`client has` capability predicate, custom channel (declarative projection),
channel renderer, capability gating, pure IR / `hasHatches` (ADR-210 AC-4).

## Entry gate (read before starting any phase)

This entire plan is **platform work** under CLAUDE.md's discussion gate
(`packages/chord`, `packages/story-loader`, possibly `packages/parser-en-us`,
and — Phase 4 only — `packages/platform-browser`). ADR-216 itself *is* the
design discussion; it does not substitute for the separate go-ahead CLAUDE.md
requires before touching `packages/`. **Do not begin Phase 1 (or any later
phase) until David gives explicit sign-off to implement this specific
workstream.** The planner writes phases; it does not authorize starting them.
As of this plan's creation, David's go-ahead has **not** been given even for
W1 (`docs/context/session-20260714-2047-chord-foundations.md` — "Open Items:
Short Term"), so this plan is written ahead of any implementation.

**Prerequisite state (hard edge, per the roadmap's dependency graph):**
- **W1 (ADR-218 foundations) must be BUILT**, not merely planned, before
  Phase 1 starts — it introduces the grammar-ratchet mechanics and loader
  patterns (trait-switch arms, fixture-and-ratchet-entry discipline) every
  phase below extends. `docs/work/chord-foundations/plan.md` is the W1 plan;
  read it for context, **do not modify it** — it is out of scope here.
- **W6 (ADR-215 extensions) is only a *partial* dependency.** Per the
  roadmap's "Soft / none" note: W7's core — payloaded `emit`, media sugar,
  declared assets, `client has`, and custom-channel *declaration* reusing a
  built-in renderer — needs only W1 and can land before W6 exists. Only the
  **novel-renderer custom-channel** path needs W6's three-part extension
  contribution surface (ADR-215 "An extension's contribution surface", part
  3: `Story.registerChannels` channel+renderer pairs). That dependency is
  isolated to Phase 4 below, sequenced last and explicitly gated on W6 being
  built. Phases 1–3 proceed on W1 alone.

Standing constraints across every phase (CLAUDE.md):
- Never auto-retry a failed build or test — report and wait for explicit
  instruction.
- Never delete files without confirmation.
- Build via `./repokit build`; test fixtures via the bundle:
  `node dist/cli/sharpee.js --test <fixture>.story` (never the slow
  per-package path).
- Every vocabulary/syntax change is a dated entry in
  `docs/architecture/chord-grammar-changes.md` **before** the implementation
  that depends on it (ADR-210 ratchet discipline) — write the ratchet entry,
  then code against it, not the reverse.
- Fixture `.story` files live under `docs/work/chord-media/fixtures/`,
  following the compiled-fixture pattern chord-foundations and
  chord-language-reference established — not hand-verified-only prose.

## References consulted
- `docs/architecture/adrs/adr-216-chord-emit-payload-and-media.md` — the
  ACCEPTED design this plan implements: payloaded `emit` (`with <field>
  <value>`, no `=`, matching the trait/`create` data grammar), full media
  sugar, declared assets with `define`-subject pure-IR discrimination,
  `client has` capability predicate, custom-channel declaration with the
  renderer caveat, AC-1..AC-4.
- `docs/architecture/adrs/adr-214-chord-platform-parity.md` §6/OQ3 — the
  audited gap this ADR closes ("every media/audio/image channel is
  unreachable... `emit` has no payload"); §8 places W7 last in the "foundations
  first" roadmap, after ADR-215.
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — the W6
  dependency: "An extension's contribution surface" part 3 (channel +
  renderer registration via `Story.registerChannels`) is the only mechanism
  Phase 4's novel-renderer custom channel rides; parts 1–2 (world registration,
  vocabulary manifest) are not needed by this plan.
- `docs/architecture/adrs/adr-210-story-language.md` (and its ratchet log
  `docs/architecture/chord-grammar-changes.md`) — every vocabulary/syntax
  change below (nested `with`-data, sugar statements, `define`, `client has`,
  custom-channel declaration) is a dated, owner-approved ratchet entry,
  precedent-formatted on the existing log; AC-4's pure-IR/`hasHatches` check
  is refined, not replaced, by this plan's `define`-subject discrimination.
- `docs/architecture/adrs/adr-163-channel-service-platform.md` and
  `docs/architecture/adrs/adr-165-renderer-architecture.md` — the existing
  channel system this plan exposes: `IOChannel{id,contentType,mode,emit,
  gatedBy?,produce}`, `IChannelRegistry.add`, capability gating via
  `ChannelService.isGatedOut`. Confirms nothing here is a channel-system
  redesign.
- `docs/work/chord-parity/roadmap.md` — sequences W7 last, states the W1 hard
  edge and the W6 partial-dependency (renderer-only), and names the nested
  `with`-data grammar extension as "the heaviest grammar change, a shared
  primitive."
- `docs/work/stdlib-reference/chord-availability-audit.md` Part 4 — the
  parity scoreboard row this plan flips ("Browser emits: text only... all
  audio/image/media channels; `emit` has no payload").
- `docs/context/session-20260714-2047-chord-foundations.md` — most recent
  prior session's Open Items: David's go-ahead is not yet given even for W1;
  confirms this plan is written ahead of any implementation permission.
- `docs/context/project-profile.md` — confirms `packages/chord`,
  `packages/story-loader`, `packages/platform-browser` locations, TypeScript
  strict-mode conventions, and the bundle-based transcript-test workflow this
  plan's fixtures use.

## Phases

### Phase 1: Payloaded `emit` — nested `with`-data grammar
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: The load-bearing primitive all later phases and all media
  sugar lower onto. Currently `emit <event-words> [when <cond>]`
  (`packages/chord/src/ast.ts:533-539`) has no payload; the analyzer joins
  words to a type string with no data (`analyzer.ts:1167-1168`); the runtime
  hard-codes `events.push(this.rawEvent(stmt.event, {}))`
  (`packages/story-loader/src/runtime.ts:916-917`) — `data` is always `{}`.
  This phase replaces that hard-code with real payload wiring.
- **Entry state**: W1 (ADR-218 foundations) is built. David's go-ahead for
  this workstream has been given (Entry gate above).
- **Deliverable**:
  - One dated ratchet entry in `docs/architecture/chord-grammar-changes.md`,
    written before the code, specifying `emit <type> with <field> <value>,
    …` — the `with <field> <value>` form matches the existing trait/`create`
    data grammar (no `=`; this **supersedes** ADR-214 OQ3's `with <field> =
    <value>` sketch — note the supersession explicitly in the entry), and
    values are full nested structures: literals, value-expressions
    (world-state reads), arrays (`[ … ]`), and nested objects (`{ <field>
    <value>, … }`).
  - `packages/chord/src/ast.ts`: extend the `emit` statement node with an
    optional payload (a data-expression tree reusing whatever node shape the
    trait/`create` data grammar already uses — grep it before inventing a
    parallel shape).
  - Grammar/parser changes for the payload syntax (`packages/chord` parser,
    and `packages/parser-en-us` only if the story-language tokenizer lives
    there rather than in `packages/chord`) — confirm which package owns
    Chord's own lexer/parser before touching `parser-en-us`.
  - `packages/chord/src/analyzer.ts`: analyze the payload (type-check
    value-expressions against known world-state reads; validate array/object
    nesting) alongside the existing event-word-joining logic.
  - `packages/story-loader/src/runtime.ts:916-917`: replace the hard-coded
    `{}` with the compiled payload, evaluated against the current dispatch
    context at emit time (same evaluation context sugar/values already use
    elsewhere in the runtime).
  - One fixture `.story`: `emit media.sound.play with src "chime.ogg", bus
    "sfx"` plus a second emit exercising a nested object and an array field
    (e.g. an image-hotspot-shaped payload) to prove the full nested grammar,
    not just flat fields.
- **Exit state**: The fixture compiles and runs via
  `node dist/cli/sharpee.js --test <fixture>.story` after `./repokit build`;
  the emitted event's `data` is asserted (not just "didn't throw") to carry
  the literal, nested-object, and array fields exactly as written. This is
  AC-1 from ADR-216. The audit's "Browser emits" row (Part 4) flips its
  payload sub-clause to reachable. `cloak.story`/`zoo.story` compile
  unchanged (no existing story uses `emit` payloads yet, so this is additive).
- **Status**: CURRENT

### Phase 2: Media sugar + declared assets
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Ergonomic statements over Phase 1's payloaded `emit`,
  covering the full existing media-channel surface — `play sound <asset>`,
  `play music <asset> [looping]` / `stop music`, `show image <asset> [in
  <layer>]` / `hide image`, `play ambient <asset>` / `stop ambient`,
  `transition <…>`, `clear` — plus `define sound|image|music <name> from
  "<file>"` declared assets referenced by name. No new renderers or
  channels: every sugar statement lowers to an existing `media.*` event
  already consumed by `stdlib/src/channels/media.ts` and rendered by
  `platform-browser/src/channels/*.ts`.
- **Entry state**: Phase 1 complete — payloaded `emit` compiles and the
  runtime evaluates nested payloads correctly (proven by Phase 1's fixture).
- **Deliverable**:
  - Dated ratchet entries (one per sugar form, or grouped if the log's
    convention allows a single dated entry covering a release of related
    forms — follow whatever precedent chord-foundations' Phase 1/2 entries
    set) for: the nine sugar statements above, and the three `define
    sound|image|music … from "<file>"` forms. Written before the code.
  - `packages/chord`: parser/AST nodes for each sugar statement and for
    `define sound|image|music`; analyzer validation that a `play
    sound|music|ambient <name>` / `show image <name>` reference names a
    previously `define`d asset of the matching kind — an unresolved or
    kind-mismatched reference is a `LoadError` (AC-2's "typo'd asset name is
    a load error").
  - `packages/story-loader`: lowering from each sugar AST node to the
    corresponding `media.*` event with its required `data` fields (`sound`→
    `src`,`bus`; `music`→`src`,`loop`,...; `image`→`src`,`layer`,`alt`?; etc.
    — cross-check exact field names against
    `stdlib/src/channels/media.ts` and `platform-browser/src/channels/
    image.ts:78` before wiring, since the browser renderers enforce these
    field names today); an asset manifest/table mapping declared names to
    their file paths, consulted at lowering time.
  - **The `define`-subject pure-IR discrimination** (ADR-216, refining
    ADR-210 AC-4): the `hasHatches` check must key off the `define`
    subject — `define sound|image|music … from "<file>"` is a **data**
    reference (does NOT set `hasHatches`); this phase does not yet need the
    `action|behavior|text` code-hatch branch (that already exists per
    ADR-210 AC-4) but must confirm the asset-`define` path is additive to
    that existing switch, not a parallel check.
  - Fixture `.story` files: one declaring `define sound chime from
    "audio/chime.ogg"` + `define image map from "img/map.png"` (+ one
    `define music`), driving `play sound chime`, `show image map in
    background`, `play music <name> looping` / `stop music`, `play ambient
    <name>` / `stop ambient`, `transition …`, and `clear`; one rejection
    fixture referencing an undeclared or misspelled asset name (asserts the
    `LoadError`).
- **Exit state**: All fixtures compile and run via the bundle; the
  positive fixture's emitted events are asserted against each targeted
  channel's expected `data` shape (not just "the story loaded"). The
  rejection fixture fails to load with the expected error. All fixtures'
  `hasHatches` is `false` (asset `define` is confirmed non-hatch). This is
  AC-2 from ADR-216. The audit's media/sound/image/music/ambient rows flip
  to reachable. `cloak`/`zoo` compile unchanged.
- **Status**: PENDING

### Phase 3: `client has` capability predicate + custom-channel declaration
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Two independent additive surfaces bundled into one phase
  since both are small relative to Phases 1–2 and neither depends on the
  other: (a) an author-checkable `client has <capability>` predicate for
  `when`/conditions, reading the live `ClientCapabilities` flags
  (`if-domain/src/channels/types.ts:115-146`) at evaluation time without
  changing the platform's existing silent gating; (b) custom-channel
  **declaration** — a named channel with `contentType`, `mode`
  (`replace`/`append`/`event`), optional `gatedBy`, and a produce rule
  projecting `data` from named event types — restricted in this phase to
  channels whose data shape **reuses a built-in renderer** (no novel
  renderer; that's Phase 4, gated on W6).
- **Entry state**: Phase 2 complete (sugar/assets proven; this phase's
  `client has` fallback fixture emits sugar statements from Phase 2 as its
  capable-client branch).
- **Deliverable**:
  - Two dated ratchet entries: `client has <capability>` predicate grammar
    (capability names enumerated from `ClientCapabilities`: `images`,
    `sound`, `music`, `animations`, `transitions`, `layers`, `speech`,
    `splitPane`, …); custom-channel declaration grammar (`contentType`,
    `mode`, optional `gatedBy`, produce-rule shape).
  - `packages/chord`: parser/AST for `client has <capability>` as a
    predicate usable anywhere `when`/conditions are (grep the existing
    condition-predicate grammar and extend it, not fork a parallel
    conditional path); parser/AST for the custom-channel declaration form.
  - `packages/story-loader`: evaluate `client has` against the live client's
    `ClientCapabilities` at condition-evaluation time (read-only check — do
    **not** touch `ChannelService.isGatedOut`'s existing silent-gating
    behavior, per ADR-216's explicit note that this predicate is
    author-visible degradation, not a platform gating change); register a
    declared custom channel via `IChannelRegistry.add` at load time,
    validating its produce-rule's projected data shape matches a built-in
    renderer's expected shape (reuse-check) — an unmatched shape with no
    extension-registered renderer available is a load error in this phase
    (the novel-renderer path is explicitly out of scope until Phase 4/W6).
  - Fixture `.story` files: a `when client has sound: play sound "roar" /
    otherwise: <text fallback>` fixture, run twice — once against a
    sound-capable `ClientCapabilities` set (asserts the `media.sound.play`
    event fires) and once against a text-only set (asserts the fallback text
    event fires instead, and no `media.*` event fires); a custom-channel
    declaration fixture whose produce rule projects data matching an
    existing built-in channel's shape (e.g. mirroring the `sound` or `image`
    channel's shape under a new channel id), asserting the channel renders
    via the reused built-in renderer.
- **Exit state**: Both `client has` fixture runs pass with the asserted
  branch-specific event; this is AC-3 from ADR-216. The custom-channel
  fixture is `hasHatches: false` and loads/renders via the reused built-in
  renderer; combined with Phase 1–2's fixtures this satisfies AC-4's
  "emit/sugar/assets/a declared custom channel... is `hasHatches: false` and
  browser-loadable" for the built-in-renderer-reuse case. `cloak`/`zoo`
  compile unchanged.
- **Status**: PENDING

### Phase 4: [W6-GATED] Novel-renderer custom channel + workstream closure
- **Tier**: Small
- **Budget**: 150 tool calls
- **Domain focus**: The one piece of ADR-216 that genuinely depends on W6
  (ADR-215): a custom channel whose data shape does **not** match any
  built-in renderer, displayed via a renderer contributed by a trusted
  platform extension (ADR-215 "An extension's contribution surface" part 3:
  `Story.registerChannels` channel+renderer pairs). ADR-216 declares the
  channel (a data projection); ADR-215 is where the novel renderer comes
  from — this phase is the consumer wiring, not a duplicate of W6's
  registration mechanism. Also closes out the workstream: full ADR-216
  AC-1..AC-4 sweep, ratchet-log consistency check, and audit finalization.
- **Entry state**: Phases 1–3 complete. **W6 (ADR-215) is built** — its
  extension contribution surface (`Story.registerChannels`) exists and at
  least one trusted extension registers a channel+renderer pair through it.
  Do not start this phase on the assumption W6 "will land soon" — verify the
  surface actually exists before writing against it.
- **Deliverable**:
  - Confirm (do not re-design) that Phase 3's custom-channel declaration
    grammar, when its produce rule projects a data shape matching no
    built-in renderer, resolves its renderer by looking up a
    W6-extension-registered channel+renderer pair instead of erroring —
    this is a small resolution-order change to Phase 3's load-time check,
    not new declaration grammar.
  - One fixture `.story`: declares a custom channel whose data shape is
    genuinely novel (does not match `sound`/`image`/`music`/`main`/etc.),
    exercised alongside a `use <extension>` (W6 surface) that registers the
    matching renderer; asserts the channel renders via the
    extension-contributed renderer, not a built-in one.
  - Full AC-1..AC-4 sweep across every fixture from Phases 1–4: re-run all
    fixtures via the bundle in one pass to catch cross-phase catalog/grammar
    collisions Phases 1–3 individually missed; confirm every fixture's
    `hasHatches` is `false` except where a fixture deliberately exercises a
    code hatch (none should, per ADR-216's scope).
  - Confirm every dated ratchet entry from Phases 1–4 is present and
    precedent-formatted in `docs/architecture/chord-grammar-changes.md`.
  - Update `docs/work/stdlib-reference/chord-availability-audit.md`'s Part 4
    section and parity scoreboard: flip the remaining "Browser emits" rows
    (payload, full media sugar, custom channels including novel-renderer) to
    reachable; this closes the audit's Part 4 entirely.
  - Re-run `cloak.story` and `zoo.story` once at the end (not per-phase) to
    catch any cross-workstream collision.
- **Exit state**: The novel-renderer fixture passes and is asserted against
  the extension-contributed renderer specifically (not a built-in
  fallback). All Phases 1–4 fixtures still pass together. The audit's Part 4
  is fully green. `cloak`/`zoo` compile unchanged. This closes W7 and — per
  the roadmap — closes the full seven-workstream ADR-214 parity effort
  ("100% Sharpee == 100% Chord").
- **Status**: PENDING — gated on W6 (ADR-215) being built; do not start until
  that surface exists, independent of this workstream's own go-ahead.

## Notes for the implementer

- Phases 1–3 need only W1 built and can proceed even if W6 (ADR-215) has not
  started — do not block Phase 1/2/3 on W6's status. Phase 4 is the sole
  W6-dependent phase; if W6 lands after Phases 1–3 are done, this plan can
  sit with Phase 4 PENDING indefinitely without re-planning.
- The `with <field> <value>` grammar in Phase 1 is explicitly the same data
  grammar as trait/`create` (`lockable with key`) extended to nested
  values — grep and reuse that existing grammar's node shapes rather than
  inventing a parallel payload syntax. This is the plan's single highest-risk
  phase per the roadmap ("the heaviest grammar change, a shared primitive").
- Do not fold ADR-217 (timers), remaining ADR-219/220 (liquids/doors) scope,
  or any other workstream into this plan — each has (or will have) its own
  `docs/work/<slug>/plan.md`.
- If any phase discovers the channel/renderer grounding cited above
  (`IOChannel` shape, required `data` fields, `ChannelService.isGatedOut`)
  has drifted from what ADR-216 assumed, stop and discuss — that is a
  platform-model surprise, not a doc-fixup, and changes the ADR's own
  premise.
