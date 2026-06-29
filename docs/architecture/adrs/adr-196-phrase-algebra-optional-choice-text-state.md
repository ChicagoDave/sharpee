# ADR-196: Phrase Algebra — Optional / Choice Atoms & the Text-State Store

## Status: ACCEPTED

> Accepted 2026-06-29 by David (after `/adr-review` → READY FOR IMPLEMENTATION, 15/15;
> `/devarch:plan-review` → TENSIONS ONLY, advisory). Continues the ADR-192 atom roadmap;
> realizes the two reserved **modifier** kinds (`Optional`, `Choice`, ADR-192 §2) and the
> `textState` seam declared inert in ADR-192 §3 / `if-domain` `TextStateStore`. Design
> source: `docs/work/dynamic-text/phrase-algebra-design.md` §3 (Modifiers), §8
> (Determinism); scenario source: `docs/work/dynamic-text/dynamic-text-scenarios.md`
> S9–S14. Implementation plan: `docs/work/dynamic-text/adr-196-optional-choice-plan.md`.
> Lands on `main` via `v2_adr196_optional_choice` (cut from `main` after the ADR-195 slot
> work merged), following the ADR-195 pattern.

## Date: 2026-06-29

## Terminology

- **Optional** — a phrase that renders its child **or `Empty`**, gated by a boolean the
  *producer* resolves from world state. The conditional-clause half of the old "ADR-B"
  (S9–S10), de-fanged: the branch is decided in code, never in the template string.
- **Choice** — a phrase that renders **one of several alternatives**, selected by a
  *deterministic, persistent* selector keyed to `(entityId, messageKey)`. The variation
  half of "ADR-B" (S12–S14): cycling, stopping, sticky, random, and first-time text.
- **Text-state store** — the per-`(entityId, messageKey)` counter store backing `Choice`.
  Declared inert in ADR-192 (`TextStateStore`, `EmptyTextStateStore`); this ADR makes it
  live and **persistent**. It is the **one piece of genuinely new persistent state** the
  whole phrase algebra introduces (design §8) — it must round-trip through save/restore.

## Context

`Optional`/`Choice` are the last two reserved kinds with no fields and no consumer
(`if-domain/src/phrase.ts:212–219` — `kind` only). They cover the scenarios the early
collapse made impossible (ADR-192 Context): an optional clause that appears/disappears by
state without leaving stray punctuation (S9–S10), and wording that **varies across repeated
triggers** with a position that **persists per (entity, message-key) across turns and saves**
(S12–S14). I7 expresses these as `[if]…[else]`, `[one of]…[at random]`, `[cycling]`,
`[stopping]`, `[sticky]`, `[first time]…[only]`.

The original ADR-B proposed in-string control flow (`{?…|…}`, `{#cycle|…}`). The phrase
algebra **de-fangs** it (design §3, the "crucial reframe"): `Optional`/`Choice` are phrases
**produced in code** and bound to a name the template references like any other producer.
A conditional clause is the report layer building an `Optional` named `detail`; the template
says `{detail}`, and the surrounding `Sequence`/`Slot` owns the punctuation. **All branching
stays in code; the string stays dumb.** The parser already supports this with no new syntax:
a param bound to a pre-built phrase value passes through `bindNounPhrase` untouched
(`parse-phrase-template.ts:93–102`). This ADR adds **no** `{?…}`/`{#…}` template grammar.

Two genuinely different mechanisms hide under "ADR-B", and conflating them is the trap:

1. **World-state conditional (S9–S10)** is a *read* over the current world. It needs **no
   persistence** — a producer reads state and emits the child or `Empty`. This is the same
   shape as ADR-193 state-derived adjectives, just at clause granularity.
2. **Persistent variation (S12–S14)** is a *counter* that advances per trigger and survives
   save/restore. This is the new machinery: a selector, a deterministic seed, and the
   per-`(entityId, messageKey)` store that **serializes with the world**.

This ADR keeps the two cleanly separated: `Optional` carries a resolved boolean (no store);
`Choice` is the only kind that touches `textState`.

Two latent bugs the scenarios doc surfaced (S14) fold in: `RoomTrait.initialDescription` is
stored but never rendered by `visited` state, and `looking-data.ts:103` hardcodes
`firstVisit = true` with a TODO. The room first-visit wiring is the near-term fix the design
attached to this ADR (design §11, item 5).

## Decision

### 1. The `Optional` kind (language-neutral, if-domain) — world-state conditional

```ts
interface Optional extends PhraseBase {
  kind: 'optional';
  child: Phrase;       // realized when `present` is true
  present: boolean;    // resolved by the PRODUCER from world state (no realize-time read)
}
```

The producer that builds the `Optional` evaluates the predicate (a pure world read) and
sets `present`. Realization is trivial and **stateless**: `present ? realize(child) : Empty`.
`present: false` realizes to `Empty`, which the enclosing `Sequence`/`List`/`Slot` absorbs —
no dangling comma or whitespace (ADR-192 AC-6 parity). This is the punctuation-safety
invariant of S10.

> **Why a resolved boolean, not a closure.** Every other kind is pure data; carrying a
> predicate function would make a phrase value un-uniform and tempt realize-time world
> reads. Producers already run with `ctx` at tree-build time and see the same post-action
> world the Assembler would — so resolving `present` in the producer is lossless and keeps
> the kind serial-clean. A bare producer returning `child | Empty` is the equivalent
> low-ceremony path; `Optional` exists so a template can bind a **named** conditional and
> the tree stays declarative for inspection/test. (Resolved alternative; see Options.)

### 2. The `Choice` kind (language-neutral, if-domain) — persistent variation

```ts
interface Choice extends PhraseBase {
  kind: 'choice';
  alternatives: Phrase[];                 // ≥ 1; an alternative MAY be Empty (once-only)
  selector: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
  entityId: EntityId;                     // the entity the variation is keyed to
  messageKey: string;                     // stable per-choice-site key (with entityId → store key)
}
```

`Choice` is the **only** kind that reads/writes `ctx.textState`. The Assembler selects an
alternative using the stored number for `(entityId, messageKey)`, realizes it, and advances
the store. Selector semantics (mapping I7):

| selector | I7 | selection from stored `n` | advance |
|----------|-----|---------------------------|---------|
| `cycling` | `[cycling]` | `i = n % len` (wraps) | `n+1` |
| `stopping` | `[stopping]` | `i = min(n, len-1)` (sticks on last) | `n+1` |
| `firstTime` | `[first time]…[only]` | `i = n === 0 ? 0 : 1` (`len ≤ 2`; `alt[1]` may be `Empty` for once-only) | `min(n+1, 1)` |
| `random` | `[at random]` | seeded PRNG over `[0,len)` from `seed(entityId, messageKey, n)` | `n+1` |
| `sticky` | `[sticky]` | first emit: seeded pick, **persist chosen index**; after: replay it | sentinel-encoded (below) |

**Stored-number encoding (Assembler-private).** For `cycling`/`stopping`/`firstTime`/`random`
the stored number is a **trigger count**. For `sticky` it is the **chosen index + 1**
(sentinel `0`/`undefined` = "not yet chosen"); on first emit the Assembler does a seeded pick
and writes `index + 1`, and every later emit reads it back. One `number` slot covers all five
selectors; the Assembler owns the interpretation, the store stays a dumb `number` map.

### 3. Determinism (the non-negotiable, design §8)

Realization stays a pure function of `(tree, world, ctx)` **given the `textState`
snapshot** (ADR-192 §7): identical inputs *including the current counter value* yield
identical output. The counter advance is the single, **declared** state transition the
`textState` seam exists for — not a hidden side effect. Concretely:

- **No clock, no `Math.random`.** `random`/`sticky` selection uses a small deterministic
  PRNG (`mulberry32`) seeded from a stable hash of `entityId + '\0' + messageKey + '\0' + n`.
  Same counter → same "random" pick, so replay and restore reproduce byte-identically.
- **Advance is once per `Choice` node realized.** Rendering happens exactly once per turn
  in `ProsePipeline.processTurn`; the counter advances there and only there.
- **Idempotency caveat (known limitation, non-blocking):** two `Choice` nodes sharing one
  `(entityId, messageKey)` in the *same* rendered turn advance the counter twice. Authors
  give distinct `messageKey`s per choice site (the same discipline ADR-195 §3 documents for
  `'detail'` slot keys). Documented; a per-node de-dupe is a follow-on if it bites.

### 4. The text-state store — persistent, serializes with the world

Replace the no-op `EmptyTextStateStore` (`engine/src/prose-pipeline/render-context.ts:93`)
with a `WorldTextStateStore` adapter backed by a new world capability:

```ts
// world-model StandardCapabilities
TEXT_STATE: 'textState'
// capability data shape: { [entityId: string]: { [messageKey: string]: number } }
```

The store reads/writes that capability through the existing `TextStateStore.get/set`
interface. **Persistence falls out for free:** capabilities are already in
`WorldModel.getSerializableState()` (`WorldModel.ts:994`) and round-trip through
`toJSON`/`loadJSON`. No new serialization path; no schema migration for existing stories
(absent capability ⇒ empty store ⇒ every `Choice` starts at `n = 0`).

**Layer boundary held.** The `Assembler` (lang-en-us) only ever calls `ctx.textState.get/set`
— the same declared seam it already receives. The *store implementation* and the capability
live in engine/world-model. No locale logic crosses into the store; no world-model coupling
enters lang. This mirrors ADR-195's split (lang owns join grammar, engine owns the store).

> **Purity tension, surfaced.** `render-context.ts`'s header says "nothing here mutates
> world state," yet advancing the counter writes a capability. This is the *declared*
> exception ADR-192 §7 reserved: `textState` is the explicit, serializable home for the one
> mutation realize is allowed. The mutation is deterministic and confined to the counter
> map — it never touches entities, relationships, or spatial state. The render-context
> header is updated to name `textState` as the sole sanctioned write.

### 5. How `Optional`/`Choice` are staged (producers, not parser)

No parser route is added. A producer builds the phrase and binds it to a template param:

- **Optional:** the report/action layer reads world state, builds
  `{ kind:'optional', child, present }`, binds it to `params.detail`; the template says
  `{detail}`. `bindNounPhrase` passes the pre-built phrase through untouched
  (`parse-phrase-template.ts:96–102`).
- **Choice:** the producer builds `{ kind:'choice', alternatives, selector, entityId,
  messageKey }`, binds it to a param, template references it by name.

This is the design's "de-fanged" guarantee made literal: **branching lives in code, the
string stays dumb** (design §3). `parsePhraseTemplate` still **rejects** any `{?…}`/`{#…}`
in-string control-flow attempt the same way it rejects the legacy `:`-chain (ADR-192 AC-8).

### 6. Consumers / proof (Friendly Zoo + the room first-visit bugfix)

Friendly Zoo is the v2 testing target (per the slot work). Three proofs:

- **C1 — `Optional` (S9–S10):** an examine clause in Friendly Zoo gated on a world-state
  predicate (e.g. an enclosure described differently when its gate is open), proving
  appear/disappear with clean punctuation at 0 and 1.
- **C2 — `Choice` persistent (S12–S14):** a Friendly Zoo line that varies across repeated
  triggers — e.g. a `cycling` flavor line on a repeatable action, and a `firstTime` aside —
  proven by a transcript that **triggers, saves, restores, and re-triggers**, asserting the
  counter resumed (not reset). This is the load-bearing round-trip test for the store.
- **Bugfix — room first-visit (S14):** wire `looking-data.ts` `firstVisit` from
  `RoomTrait.visited` (delete the hardcoded `true`, `:103`/`:301`) and render
  `RoomTrait.initialDescription` on first visit. `RoomTrait.visited` already persists in the
  entity, so this is a **world-read** consumer (`Optional`-shaped), *not* a `textState`
  consumer — kept separate to show the two mechanisms don't conflate.

## Options considered

- **`Optional` carries a predicate closure `(ctx) => boolean`** — rejected: a function in a
  phrase value breaks the all-data uniformity of the union and invites realize-time world
  reads. Producer resolves `present`; the kind stays serial-clean (§1).
- **Merge `Optional` into `Choice` (a 2-alternative choice with an `Empty` branch)** —
  rejected: world-state conditionals have **no counter**; forcing them through the persistent
  store would write meaningless trigger counts to the save file for every conditional clause.
  Keep `Optional` storeless.
- **In-string control flow (`{?A|B}`, `{#cycle|…}`)** — rejected: the original ADR-B sin;
  contradicts the standing rule that logic lives in code and templates stay dumb (ADR-192
  Context, design §3). The parser actively rejects it (AC-8 parity).
- **Persist `Choice` state in a dedicated `textState` field on serializable state** (peer of
  `relationships`/`idCounters`) instead of a capability — viable, but a capability needs zero
  new serialization plumbing (`getSerializableState` already includes `capabilities`) and
  gives an absent-⇒-empty default for old saves. Capability chosen (§4).
- **Persist the full shuffle permutation for `shuffle`** — rejected: a permutation is
  derivable from `seed(entityId, messageKey, n)`, so a single `number` suffices; `shuffle`
  folds into `random` over a seeded order. (No separate `shuffle` selector in the first cut.)

## Scope

**In:**
- `Optional` fields (`child`, `present`) + `Choice` fields (`alternatives`, `selector`,
  `entityId`, `messageKey`) in `if-domain/src/phrase.ts`.
- The Assembler `Optional` case (gate → child|Empty) and `Choice` case (seeded select +
  counter advance, `Empty`-absorbing) in `lang-en-us/src/assembler/english-assembler.ts`.
- The deterministic `mulberry32` seed helper (lang-en-us, Assembler-internal).
- `WorldTextStateStore` replacing `EmptyTextStateStore` in
  `engine/src/prose-pipeline/render-context.ts`; the `TEXT_STATE` capability in
  `world-model` (`StandardCapabilities` + registration).
- Friendly Zoo consumers **C1 + C2** (transcripts, incl. the save/restore round-trip), and
  the **room first-visit bugfix** (`stdlib/.../looking`, `world-model` `RoomTrait` wiring).
- Assembler unit tests for all five selectors + `Optional`.

**Out:**
- A trait-keyed **clause-contributor ergonomic layer** for conditionals (parallels the
  ADR-195 §3 deferred registry) — producers stage `Optional`/`Choice` directly for now.
- A `shuffle` selector distinct from seeded `random` (folded; §Options).
- Per-node within-turn de-dupe of shared `messageKey` (documented limitation, §3).
- Any in-string conditional/variation grammar — explicitly never (§5).

## Consequences

- Closes the last two reserved modifier kinds; S9–S14 land on the phrase algebra. The atom
  roadmap (ADR-192 §2) has only `Verb`/`Numeral`/`Pronoun`/`Verbatim` siblings remaining,
  each already drafted (197–200).
- **The text-state store goes from inert to live and persistent** — the single new piece of
  saved state the algebra adds. It round-trips through the existing capability serialization;
  old saves default to empty (every `Choice` at `n=0`). No migration.
- **Determinism preserved (ADR-192 AC-9):** seeded selection + persisted counter ⇒ replay and
  restore reproduce byte-identically; no clock/random.
- **Boundary held:** `if-domain` gains only data fields; selection/seed grammar lives in the
  Assembler; the store lives in engine/world-model. No locale logic crosses the line.
- Fixes the half-wired room first-visit bug (S14) as a side effect — `initialDescription`
  finally renders, the `looking-data.ts` TODO is closed.
- **`render-context.ts` purity note updated:** `textState` is named as the one sanctioned
  realize-time write; everything else stays read-only.

## Acceptance Criteria

1. **Optional present:** `Optional { present: true }` renders its child in place, article
   and punctuation agreeing as if the child were inline.
2. **Optional absent:** `Optional { present: false }` renders `Empty`; an enclosing
   `Sequence`/`List`/`Slot` leaves **no** dangling comma, connective, or whitespace
   (ADR-192 AC-6 parity).
3. **Choice cycling:** repeated realization with `selector:'cycling'` over N alternatives
   yields `alt[0], alt[1], … alt[N-1], alt[0], …` across triggers; the counter advances by 1
   each realize.
4. **Choice stopping:** `selector:'stopping'` advances to the last alternative and **sticks**
   there on every subsequent trigger.
5. **Choice firstTime / once-only:** `selector:'firstTime'` renders `alt[0]` the first time
   and `alt[1]` after; with `alt[1] = Empty` it renders once then nothing (S14).
6. **Choice random determinism:** `selector:'random'` with a fixed `(entityId, messageKey,
   counter)` produces an identical pick across repeated runs; no `Math.random`/`Date.now`.
7. **Choice sticky:** `selector:'sticky'` picks once and replays the **same** alternative on
   every later trigger; the chosen index persists.
8. **Persistence / save-restore:** a `Choice` triggered K times, then `save`→`restore`→
   triggered again, resumes from counter K (not 0). Proven by a Friendly Zoo transcript.
9. **Old-save default:** a save with no `textState` capability restores cleanly; every
   `Choice` starts at counter 0 (no crash, no migration).
10. **Boundary:** `if-domain` `Optional`/`Choice` carry **no** locale strings or selection
    logic; all selection/seeding lives in the lang-en-us Assembler; the store lives in
    engine/world-model.
11. **No in-string control flow:** a template containing `{?…}` or `{#…}` raises
    `PhraseParseError` at parse time (ADR-192 AC-8 parity); branching is only ever a bound,
    code-built `Optional`/`Choice` param.
12. **Room first-visit (bugfix):** a room with `initialDescription` shows it on first entry
    and the standard description on re-entry; `looking-data.ts` no longer hardcodes
    `firstVisit`.
13. **Consumer (Friendly Zoo):** C1 (`Optional`) and C2 (`Choice`, incl. the save/restore
    round-trip) render correctly through the pipeline as transcripts.

## Open questions (non-blocking)

- **Within-turn shared-key advance (§3).** Two `Choice` nodes with the same `(entityId,
  messageKey)` in one rendered turn advance the counter twice. First cut documents the
  distinct-key discipline; a peek-then-single-advance pass (mirroring ADR-195's
  peek-not-drain) is the follow-on if real authoring hits it. Does not block the contract.
- **Preview / non-advancing renders.** Any path that re-renders a turn for preview (not the
  canonical `processTurn`) must use a read-only `textState` view so counters don't
  double-advance. The canonical pipeline renders once/turn, so this is latent until such a
  path exists. Resolve when a preview renderer is built.
- **`messageKey` authoring ergonomics.** Producers currently hand-author `messageKey`s; a
  derived-from-messageId convention (or the deferred trait-keyed registry) would remove the
  collision footgun. Non-blocking; the contract works with explicit keys.

## Relationships

- **Follow-on of** ADR-192 (reserved `Optional`/`Choice` kinds + the `textState` seam,
  `TextStateStore`/`EmptyTextStateStore`). Sibling of ADR-193/194/195/197/198/199/200.
- **Parallels** ADR-195: a declared-inert seam (`contribute` there, `textState` here) made
  live; the lang/engine boundary split is identical (lang owns grammar, engine owns the
  store).
- **Reuses** the ADR-193 producer-hook shape for `Optional` clause production; the
  `Empty`-absorption rule from ADR-192 AC-6 for punctuation safety.
- **Closes scenarios** S9–S10 (`Optional`), S12–S14 (`Choice` + store); folds the room
  first-visit latent bug (design §11 / scenarios "Surfaced issues").
- **Consumer / driver:** `stories/friendly-zoo` (C1 + C2 transcripts).

## Session

- Drafted in session b09711 (2026-06-29) as the next atom after ADR-195 (Slot) shipped.
  The seventh reserved kind set to move toward realization; with it, only the independent
  `Verb`/`Numeral`/`Pronoun`/`Verbatim` atoms (ADRs 197–200) remain on the ADR-192 roadmap.
