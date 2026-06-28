# ADR-195: Phrase Algebra — Slot Atom & the Contribution Channel

## Status: ACCEPTED

> Accepted 2026-06-28 by David (after `/devarch:adr-review` → READY FOR IMPLEMENTATION, 15/15;
> six contract-precision fixes applied). Continues the ADR-192 atom roadmap; realizes the
> reserved `Slot` kind (ADR-192 §2) and the `contribute(slotKey, phrase, opts)` seam. Driven by
> the Friendly Zoo target scenarios in `docs/work/dynamic-text/adr-195-slot-zoo-targets.md`;
> implementation plan in `docs/work/dynamic-text/adr-195-slot-plan.md`. Lands on `main` via
> `v2_adr195_slot`.

## Date: 2026-06-28

## Terminology

- **Slot** — an **open, named append target** in a phrase tree (`{slot:here}`) that stays
  open until the turn's text finalizes. Multiple independent sources `contribute` clause-level
  content to it during the turn, **without knowing about each other**; at realize time the
  slot collects them, orders them deterministically, and joins them under **one** punctuation
  authority. The slot owns the lead-in/connective grammar; a contribution is bare content.
- **Contribution channel** — the `RenderContext.contribute(slotKey, phrase, opts)` seam plus
  the turn-scoped store it writes to. Declared inert in ADR-192; this ADR makes it live.

## Context

`Slot` is the last reserved kind with no consumer and the heaviest open design — the S-append
scenario (`dynamic-text-scenarios.md`): an author declares a hole that **several** independent
contributors (traits, NPCs, daemons) fill, joined cleanly regardless of count, order, or
source. Today Sharpee has no append model — each message is an independent block
(`assemble.ts`); a second contributor cannot tack a clause onto another producer's sentence, so
this is forced into action code that pre-computes the whole sentence and selects one messageId.

The seam is already declared (`RenderContext.contribute`, `SlotContributionOptions.order`, the
`Slot` stub, the parser `slot:` route) and currently **drops contributions**
(`engine/prose-pipeline/render-context.ts`). What's missing: the `Slot` fields, a real
turn-scoped store, and the Assembler case that drains and joins.

The hard fork is **when a contributor runs**:

- **Realize-time** contributors hold a `RenderContext` (they run as part of building a message's
  phrase tree). Friendly Zoo S1 (room occupants) and S2 (object detail clauses) are here.
- **Turn-time** contributors are daemons / NPC behaviors firing during action execution with
  **no** `RenderContext` (the Verb case-B wall). Friendly Zoo S4 (PA/ambient) is here; the
  design doc routes it through the ADR-163 channel.

This ADR builds the **realize-time** core and **defers** the turn-time channel, named so the
core does not preclude it. (Resolves §6.1 of the targets doc.)

## Decision

### 1. The `Slot` kind (language-neutral, if-domain)

```ts
interface Slot extends PhraseBase {
  kind: 'slot';
  slotKey: string;                 // the contribution channel name
  mode?: 'sentence' | 'clause';    // join grammar; default 'sentence'
  conj?: 'and' | 'or';             // final connective for 'clause' mode; default 'and'
}
```

`mode` is the join grammar (§6.2):

- **`sentence`** (default) — contributions are independent sentences, joined with a sentence
  break after the stem's terminator. *S1 occupants, S3 asides:* `"… birdsong. Sam is here. A
  parrot eyes you."`
- **`clause`** — contributions are clauses in one sentence, joined by the **punctuation
  authority** exactly like `PhraseList` (serial comma + final `conj`), inserted **before** the
  stem's terminator. *S2 object detail:* `"A radio, humming, its battery light blinking red."`;
  the cabinet example `"A cabinet, which is open, containing a key, and glowing faintly."`

A contribution is a **bare** `Phrase` (clause/sentence content only). The slot supplies every
comma, "and", and sentence break — the contributor never does (§6.2, the S-append load-bearing
rule). Keeping one authority over the connectives is what makes the punctuation correct for any
count.

### 2. The contribution channel (engine RenderContext runtime)

Replace the no-op `contribute` in `render-context.ts` with a **turn-scoped** store (§6.4): one
store per turn, shared across every message realized that turn, so a contribution staged while
building one message is visible when the slot realizes (it is the per-turn factory's job — the
factory already binds seams per turn).

`RenderContext` (if-domain) already declares the **write** side (`contribute`). It gains the
**read** side the Assembler needs — **optional**, matching ADR-194's optional-seam precedent
(`nounPhraseFor?`) so existing `RenderContext` builders and test stubs keep compiling unedited:

```ts
interface RenderContext {
  // … existing: world, params, settings, narrative, reference, textState
  contribute(slotKey: string, phrase: Phrase, opts?: SlotContributionOptions): void;  // write (ADR-192)
  slotContributions?(slotKey: string): Phrase[];  // read — ordered by (order, insertion); ADR-195. Optional.
}

// engine store captured by createRenderContextFactory
interface SlotContribution { phrase: Phrase; order: number; seq: number }
// contribute(key, phrase, opts): push { phrase, order: opts?.order ?? 0, seq: next++ }
// slotContributions(key): the key's contributions, sorted by (order asc, seq asc)
```

`slotContributions` is a **peek, not a drain** (resolves §6.3 idempotency): it does not consume
the store, so two `{slot:key}` nodes sharing a key both see the same contributions and repeated
reads are stable. The store is cleared **between turns**, never by a read. Optional so a
context that never wired it (world-less stubs) needs no edit; the Assembler reads it as
`ctx.slotContributions?.(key) ?? []`, so an absent accessor yields no contributions — a slot in
such a context simply realizes `Empty`.

**Ordering (§6.3):** primary key `order` ascending; tie-break by `seq` — monotonic insertion
order. Insertion order is deterministic (producers and contributor registries run in a fixed
traversal/registration order), so output is stable across save/replay. No `Date.now`/random.

**Persistence:** the store is **turn-scoped and rebuilt every turn** from deterministic
contribution; it is never serialized. Save/restore happens between turns when the store is
empty, so "stable across save/restore" (AC-5) means contributors re-run deterministically after
restore — not that the store is persisted.

### 3. How contributions are staged (the render-loop contributor hook)

A realize-time contributor must hold a `RenderContext` and run **before** the host message
realizes. The engine builds the per-turn `RenderContext` factory inside `ProsePipeline.processTurn`
and realizes messages sequentially (`pipeline.ts`); there is today **no** seam where a contributor
can stage content into that turn's store. The first cut adds exactly one, deliberately minimal:

- **Slot-contributor hook (engine).** `ProsePipeline` accepts registered
  `SlotContributor = (ctx: RenderContext) => void`. At the top of `processTurn` — after the
  per-turn factory is built, **before** the event→render loop — each contributor runs once against
  a turn `RenderContext` (`makeRenderContext({})`, whose `contribute` writes the shared per-turn
  store). The store is then populated for every message realized later in the loop. Contributors
  run in registration order (deterministic; feeds the `(order, insertion)` tie-break, §6.3).
- **Story registration.** Stories register via the existing `onEngineReady` hook
  (`engine.registerSlotContributor(fn)`) — **no new `Story` method**. The contributor reads the
  live world (player's room → occupants for `'here'`; in-scope describable objects → state clauses
  for `'detail'`) and calls `ctx.contribute(key, phrase)`.

This is the **realize-time** path: the contributor holds a `RenderContext` and runs at render, not
during the turn — so it needs **no** ADR-163 channel. Both first-cut scenarios use it: S1 stages
occupant `NounPhrase`s to `'here'`; S2 stages trait clauses to `'detail'`. The trait-keyed
**clause-contributor registry** (mirroring ADR-193's `getStateAdjectives` hook) remains the
deferred *ergonomic* layer that removes the per-trait boilerplate from the story's contributor —
**not** required for AC-8 (§Scope, Out).

> **Known first-cut limitation:** `'detail'` is a single shared key, so if two objects are
> described in one turn their `'detail'` contributions collide. Acceptable for the first cut
> (examine targets one object/turn); a per-entity key scheme (`detail:<entityId>`) is the
> follow-on if multi-object description in one turn becomes real.

### 4. Realization (the Assembler `Slot` case)

1. `ctx.slotContributions?.(slot.slotKey) ?? []` → ordered contributions (peek, §2; absent
   accessor → no contributions); realize each to its surface, **absorbing `Empty`** (a
   contribution that renders to nothing leaves no connective — ADR-192 AC-6).
2. Zero surviving contributions → the slot realizes to **`Empty`**: stem + terminator stay
   clean, no dangling space or connective (§6.5). This is the 0-contribution invariant.
3. `mode: 'sentence'` → join with a sentence break, placed after the stem's terminator.
   `mode: 'clause'` → join through the **punctuation authority** (serial comma + final `conj`),
   placed before the stem's terminator.

The Assembler stays the sole punctuation authority (ADR-192 §4); `Slot` adds a join site, not a
second punctuation owner.

### 5. Authoring surface (parser)

`{slot:here}` → `Slot { slotKey: 'here' }`. Trailing bare hints are additive: `{slot:detail
clause}` → `mode: 'clause'`; `{slot:detail clause or}` → `conj: 'or'`. Unknown slot key is **not**
a parse error (a slot with no contributions is valid and common — it renders `Empty`); this
differs from `Verb`/`Contents`, whose param **must** bind at parse time (ADR-192 AC-11).

## Options considered

- **Turn-time channel in this ADR** (daemons contribute mid-turn) — rejected for the first cut:
  it needs the ADR-163 channel and a contributor with no RenderContext (S4). Building it now is
  speculative; deferred until the PA/ambient feature drives its shape. Named in Scope so the
  core does not preclude it.
- **Contributor carries its own connective** (slot just concatenates) — rejected: returns
  punctuation authority to N contributors, the exact failure ADR-192 removes. Bare-clause +
  slot-owned connective keeps it correct for any count (S-append).
- **Slot as a `PhraseList` the producer pre-builds** — rejected: that is eager and single-source
  (it *is* `PhraseList`); `Slot` exists precisely for **open, multi-source, deferred** assembly.
  S1/S2 contributors are independent and unknown to the stem's producer.
- **Message-scoped store** — rejected: S4 (and cross-message appends generally) attach to another
  message's output; turn-scoped is required and matches the per-turn factory.

## Scope

**In:** the `Slot` fields + the optional `slotContributions` read accessor on `RenderContext`
(`if-domain/src/phrase.ts`); the turn-scoped contribution store **and the render-loop
slot-contributor hook** (`SlotContributor` + `registerSlotContributor`, invoked at the top of
`processTurn`) in the engine prose pipeline (`engine/src/prose-pipeline/render-context.ts`,
`pipeline.ts`; registration via the existing `onEngineReady`); ordering (`order` then insertion);
the `{slot:…}` parse rule with `mode`/`conj` hints
(`lang-en-us/src/parser/parse-phrase-template.ts`); the Assembler `Slot` case — peek,
`Empty`-absorb, sentence/clause join (`lang-en-us/src/assembler/english-assembler.ts`). Proven
by Friendly Zoo **S1 + S2** (transcripts) and assembler unit tests.

**Out:** the **turn-time contribution channel** (S4 — daemons/behaviors without a RenderContext;
sits on ADR-163) — named, deferred. The **clause-contributor registry** (§3, S2's mechanism) as a
shipped world-model API — a thin follow-on; ADR-195 ships the channel it would use. Nested slots;
slot-to-slot contribution.

## Consequences

- Closes the last reserved combinator's everyday case; gives Sharpee a real append/contribution
  model (the S-append gap). Friendly Zoo becomes the live consumer.
- The `contribute` seam goes from inert to live, **turn-scoped**. Existing world-less stubs are
  unaffected (they still drop contributions; nothing contributes in those paths).
- **Boundary held:** `if-domain` gains only data fields on `Slot`; all join grammar lives in the
  Assembler (lang-en-us). No locale logic crosses the line.
- **Determinism preserved (ADR-192 AC-9):** ordering is `(order, insertion)`, both deterministic;
  no clock/random. Identical turn → identical output.
- The turn-time channel remains future work; until it lands, daemon-driven appends (S4) keep
  rendering as separate narrated blocks — no regression, just not yet folded.

## Acceptance Criteria

1. `{slot:here}` with two contributions (`sentence` mode) → stem + two sentences joined with a
   space; order follows `(order, insertion)`.
2. `{slot:detail clause}` with two contributions → `"… , c1, and c2."` (serial comma + final
   `and`, before the terminator); `conj: 'or'` → final `or`.
3. **Zero contributions** → the slot renders to `Empty`: stem + terminator clean, no dangling
   space, comma, or connective (ADR-192 AC-6 parity).
4. A contribution that realizes to `Empty` is absorbed (no connective for it).
5. **Determinism:** identical `(tree, contributions, ctx)` → byte-identical output across runs;
   `order` ties break by insertion, stable across save/restore.
6. **Turn-scoped:** a contribution staged while building message A is visible when message A's
   slot realizes within the same turn; cleared between turns.
7. Boundary/parse: no locale strings in `if-domain`; `{slot:key}` with no contributions is **not**
   a parse error.
8. **Consumer (Friendly Zoo):** S1 (occupants) and S2 (object detail) render correctly through the
   pipeline as transcripts.
9. **Orphan / malformed:** a contribution to a `slotKey` with no matching `{slot:key}` node in the
   turn's tree is **silently dropped** (no throw); a `{slot}` with no key is a **parse error**
   (`PhraseParseError`), unlike a valid-but-unfilled `{slot:key}` (AC-3, AC-7).

## Relationships

- **Follow-on of** ADR-192 (reserved `Slot` kind + `contribute` seam). Reuses the ADR-194
  entity→`NounPhrase` bridge when a contribution is an entity; parallels ADR-193's contributor-hook
  shape for the §3 clause registry. The deferred turn-time channel relates to **ADR-163**. Sibling
  of 194/197/198/199/200.
- **Consumer / driver:** `docs/work/dynamic-text/adr-195-slot-zoo-targets.md` (Friendly Zoo S1–S4).

## Session

- Drafted and accepted in session 753ede (2026-06-28), after porting `stories/friendly-zoo` as
  the v2 testing target and fixing the plural-name double-pluralization (ADR-192 contract
  clarification). The sixth reserved kind to move toward realization; `Optional`/`Choice`
  (ADR-196) remain.
