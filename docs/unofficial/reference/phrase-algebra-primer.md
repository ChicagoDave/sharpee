# The Phrase Algebra — Primer

**Audience:** platform + story developers (and future Claude sessions) who need to
understand how Sharpee turns events into user-facing text.
**Status:** as-built reference for the v2 pipeline (ADR-192 … ADR-206).
**Rule of thumb:** where an ADR and the code disagree, **the code is authoritative** —
this primer cites code (`file:line`) throughout for that reason.

> One-line mental model: **text is not a string with embedded formatters; it is a tree
> of typed `Phrase` values that defer realization, rendered by one Assembler at end of
> turn.** All branching stays in code; templates stay dumb.

---

## 1. Why it exists (the root cause it fixes)

The old system rendered a placeholder through a **formatter chain**
(`(string|number|EntityInfo|EntityInfo[]) => string`) that **collapsed to a bare string
after the first formatter.** Once `{the:item}` became `"the cabinet"`, an enclosing
phrase could no longer agree an article over it, count/group it with siblings,
pronoun-reference it later, compose it with another clause, or vary it conditionally.
Every text bug was a symptom of *realizing to string too early*.

The fix, stated once: **defer realization.** A `Phrase` carries the grammatical metadata
its neighbors need (number, person, article type, leading sound, referable id, …), and a
single per-locale **Assembler** walks the finished tree post-turn and is the *sole
authority* for article, agreement, punctuation, whitespace, reference, and case.

Design north-star: `docs/work/dynamic-text/phrase-algebra-design.md`. Foundational ADR:
`docs/architecture/adrs/adr-192-phrase-algebra-phrase-model-assembler-core.md`.

---

## 2. The `Phrase` data model

A `Phrase` is an immutable, composable, **language-neutral** value (no locale strings)
defined in `packages/if-domain/src/phrase.ts`. It is a **closed discriminated union keyed
by `kind`** (`phrase.ts:299-314`), extended additively — a new feature is *one new union
member + one Assembler case + one parser branch*, never a rewrite (`phrase.ts:24-26`).

The union has **15 members** (ADR-192 describes only the first 5; the rest were added by
ADRs 193–201):

```ts
export type Phrase =
  | Literal | NounPhrase | PhraseList | Sequence | Empty   // ADR-192 foundation
  | Verb          // ADR-199
  | Pronoun       // ADR-197
  | Numeral       // ADR-198  (kind: 'number')
  | Verbatim      // ADR-200
  | Contents      // ADR-194
  | Slot          // ADR-195
  | Optional | Choice   // ADR-196
  | Sentence | Quote;   // ADR-201
```

**Discriminant ≠ type name** in three cases (a common trip-up): `Numeral` has
`kind:'number'` (`phrase.ts:165`), `PhraseList` has `kind:'list'` (`:97`), `Sequence` has
`kind:'seq'` (`:104`). Type guards `isLiteral … isQuote` exist for every member
(`phrase.ts:498-570`).

### The agreement surface

`PhraseBase` (`phrase.ts:41-44`) carries only `decorations?: IDecoration[]`. The literal
article string is **deliberately absent** (file invariant, `phrase.ts:14-18`): a phrase
carries the language-neutral `articleType` *selector*; the Assembler computes the a/an/the
surface. The richest metadata lives on **`NounPhrase`** (`phrase.ts:64-93`):

| Field | Purpose |
|---|---|
| `name: string` | base noun |
| `adjectives?: string[]` | static + state-derived (ADR-193) |
| `number: 'singular'\|'plural'\|'mass'` | verb agreement, pluralization |
| `person?: 'first'\|'second'\|'third'` | verb agreement; unset ⇒ third |
| `properName?: boolean` | suppresses article |
| `articleType: 'indefinite'\|'definite'\|'some'\|'none'` | a/an · the · some · ∅ selector |
| `pluralForm?: string` | author override for irregular plural |
| `referableId?: EntityId` | last-mentioned tracking → `{pronoun:…}` |
| `pronounSet?: string` | gendered / neopronoun reference |
| `capitalize?: boolean` | `{capitalize …}` hint |

`Empty` (`phrase.ts:109-111`) is the only member with no `PhraseBase` — it realizes to
`""` and is **absorbed** by every combinator (no dangling comma/space). It is the
punctuation-safe "else" branch.

Supporting contracts in `phrase.ts`: `RenderWorld` (`:324`, with the optional
`nounPhraseFor?` bridge), `LocaleSettings` (`:343` — `serialComma`, quote glyphs),
`NarrativeAgreement` (`:365` — narrative `person` + `playerId`), `ReferenceContext`
(`:390` — `lastMentioned()`/`note()`), `TextStateStore` (`:402`), `RenderContext`
(`:432`), and `PhraseProducer = (ctx: RenderContext) => Phrase` (`:469`).

---

## 3. The template authoring grammar

Templates are strings with `{…}` holes, parsed by `parsePhraseTemplate(template,
params)` (`packages/lang-en-us/src/parser/parse-phrase-template.ts:395`). Literal spans
between placeholders become `Literal`s; the whole thing becomes a `Sequence` (or the bare
phrase if there's only one). **A `:` inside `{…}` marks a *kind head*.**

### NounPhrase — the unprefixed default

A bare param reference is a NounPhrase. Leading **hint** words tune it; the **last bare
token is the param name**:

| Template | Renders |
|---|---|
| `{item}` | the entity's noun phrase (default `indefinite`) |
| `{the item}` | definite article |
| `{a item}` / `{an item}` | indefinite |
| `{some item}` | mass/some |
| `{capitalize the item}` | + sentence-start capitalization |

Article hints: `the→definite`, `a/an→indefinite`, `some→some`
(`parse-phrase-template.ts:43-48`). A number/boolean value bound with no hint becomes a
`Literal` (`String(value)`) to avoid "a 42" (`:106-108`).

### Non-noun kinds — `kind:` prefixes (always spelled in full)

| Template | Kind | Notes |
|---|---|---|
| `{verb:is target}` · `{verb:opens door}` | Verb | lemma + subject param to agree with |
| `{pronoun:object}` · `{capitalize pronoun:subject}` | Pronoun | case; referent = last-mentioned |
| `{number:coins}` · `{number:coins words}` | Numeral | format `digits`(default)`/words/ordinal` |
| `{verbatim:name}` | Verbatim | opaque, whitespace-exempt |
| `{contents:box}` · `{contents:box or}` | Contents | direct contents as a list |
| `{slot:detail}` · `{slot:detail clause or}` | Slot | open append target |
| `{quote:line}` · `{quote:line !}` | Quote | quoted utterance (usually emitted, not authored) |

All kind prefixes and hint words are **spelled in full** — `pronoun`, `number`,
`capitalize`, `verbatim`, `contents`, `slot` — never abbreviated.

### What the parser rejects (all at **parse time**, never a silent realize-time `Empty`)

- Legacy `:`-chains: `{cap:the:item}` → `'cap' is not a known kind prefix — legacy ':'
  chains are not supported` (`:348-354`). This is the deliberate clean break — old syntax
  errors loudly rather than rotting.
- Unknown hint word → `'X' is not a recognized hint` (`:375`).
- Unbound param → `param 'X' is not bound` (`:379`). (Note: a param bound to `undefined`
  still passes the `name in params` check.)
- `{sentence:…}` → explicit error; `Sentence` is emitted by message *structure*, not
  authored (`:341-347`).
- `capitalize` prefix is valid **only** on a bare NounPhrase head and on `{pronoun:…}`;
  every other kind rejects it.
- No `?`, `|`, `#` control-flow glyphs exist — branching/variation are code-side
  producers (see §4.4/§4.5).

Errors throw `PhraseParseError` (`:68-80`), carrying `offendingToken`, `template`,
`reason`.

---

## 4. The atom / combinator / modifier catalog

Every kind is data-only in `if-domain`; every English surface lives in the Assembler
(`packages/lang-en-us/src/assembler/english-assembler.ts`, `realize` at `:875`, recursive
core `realizeToRuns` at `:630`).

### 4.1 NounPhrase + state-derived adjectives (ADR-193)

`{the box}` renders "the open wooden box" when a producer opts into **state adjectives**.
Adjectives are contributed live from traits:

- Registry: `packages/world-model/src/state-adjectives.ts` —
  `registerAdjectiveContributor(traitType, (entity)=>string[])` (`:36`),
  `getStateAdjectives(entity)` (`:47`). Defaults: `OPENABLE→['open']` when open,
  `LOCKABLE→['locked']` when locked (`:57-65`).
- Opt-in: `nounPhraseFor(entity, ctx?, { stateAdjectives: true })`
  (`packages/stdlib/src/utils/noun-phrase.ts:48`) prepends state adjectives to the static
  `IdentityTrait.adjectives` (`:96`). Default **false**, so describe-actions (examine,
  contents) opt in but ordinary mentions don't say "open the open box".

The Assembler agrees the article over the *rendered head including adjectives*
(`headWithAdjectives` `:153`, `indefiniteArticle` `:102`) — so "an **open** cabinet" falls
out for free.

### 4.2 Contents (ADR-194) — combinator

`{contents:box}` reads the container's **direct contents from the live world at realize
time** and renders them as a grouped list; `{contents:box or}` uses "or"
(`phrase.ts:187-193`). Realized by `renderContents` (`english-assembler.ts:348`), which
maps each child through the `RenderWorld.nounPhraseFor` bridge (wired in the engine's
`createRenderWorld`, delegating to stdlib) and calls the shared list authority. Empty
container or missing bridge → `"nothing"`, never throws. First cut: direct contents only,
no recursion; the template supplies the preposition
(`"In {the box} you see {contents:box}."`).

### 4.3 Slot (ADR-195) — open contribution channel

`{slot:here}` is a **named append target** many producers write to during a turn without
knowing about each other; joined once at realize time under a single punctuation
authority (`phrase.ts:208-216`). Two modes: `sentence` (default — independent sentences)
and `clause` (`{slot:detail clause}` — serial-comma + final conj). The key is **not** a
param; an unfilled slot renders empty. A keyless `{slot:}` is a parse error.

- Write: `ctx.contribute(slotKey, phrase, { order })` (`phrase.ts:446`).
- Read (peek, not drain): `ctx.slotContributions?.(slotKey)` (`phrase.ts:458`), ordered
  `(order asc, insertion asc)`.
- Runtime store: `TurnSlotStore`
  (`packages/engine/src/prose-pipeline/render-context.ts:185`) — one per turn, shared
  across all messages that turn; never serialized (rebuilt each turn).
- Realize-time hook: register a `SlotContributor` via `engine.registerSlotContributor(fn)`
  (`game-engine.ts:1767`), run at the top of `processTurn` (`pipeline.ts:126-131`).
- Live example: Friendly Zoo room-occupant presence clauses
  (`stories/friendly-zoo/src/index.ts:334-347`).

Gotcha: `detail` is a single shared key in the first cut — two objects described in one
turn collide. Orphan contributions (no matching `{slot:key}`) are silently dropped.

### 4.4 Optional (ADR-196) — modifier, storeless

Renders its `child` **or `Empty`**, gated by a boolean the **producer** resolved from
world state — the branch is decided in code (`phrase.ts:226-232`, `present` read at
build time, not realize time). No template syntax. Built by a code-side producer and
bound to a normal param the template references by name:

```ts
// stories/friendly-zoo/src/dynamic-text.ts
optional(OpenableBehavior.isOpen(gate), lit(', standing wide open'))  // bound as {openClause}
```

Absent → absorbed like `Empty` (no dangling comma). Deliberately **storeless** — kept
separate from `Choice` so world-state conditionals never write counters to the save file.

### 4.5 Choice (ADR-196) — modifier + persistent text-state

Renders **one of** `alternatives` by a deterministic, persistent selector keyed to
`(entityId, messageKey)` — the **only** kind that reads/writes `ctx.textState`
(`phrase.ts:241-258`). No template syntax; producer-built and bound by name. Selectors
(`selectChoice`, `english-assembler.ts:530`):

- `cycling` — `alt[n % len]`, advance.
- `stopping` — advance but stick on the last.
- `firstTime` — first alternative once, then the second thereafter.
- `random` — seeded pick (not `Math.random`).
- `sticky` — pick once, then always replay the same one.

Determinism: seeded via FNV-1a + mulberry32 from `(entityId, messageKey, counter)`
(`english-assembler.ts:498-518`) — replay/restore reproduce byte-identically. Persistence:
the `TEXT_STATE` world capability (`world-model/src/world/capabilities.ts:46`), shape
`{ [entityId]: { [messageKey]: number } }`, round-trips with the save automatically; old
saves with no `textState` default every Choice to n=0. Use **distinct `messageKey`s** for
independent cyclers (two Choice nodes sharing a key in one turn advance the counter
twice).

### 4.6 Pronoun (ADR-197) — atom + last-mentioned reference

`{pronoun:subject|object|possessive|possessive-pronoun|reflexive}` renders a pronoun
agreeing in case × number × gender with the **last-mentioned** referent
(`phrase.ts:147-157`). The Assembler records every realized `NounPhrase` that carries a
`referableId` into `ctx.reference` (`noteReference`, `english-assembler.ts:403`), and
`renderPronoun` (`:432`) reads `lastMentioned()`. Gender from explicit `pronounSet` else
by number. Graceful default with no antecedent → neuter singular ("it"/"its"/"itself"),
no throw. `{capitalize pronoun:subject}` forces a leading capital.

### 4.7 Numeral (ADR-198) — atom

`{number:coins}` → "7"; `{number:coins words}` → "seven"; `{number:floor ordinal}` →
"3rd" (`phrase.ts:164-170`). Spellers in `packages/lang-en-us/src/number-words.ts`:
`numberToWords` (British "and": "one hundred and five"), `ordinalString` (11–13
exception). `NaN` → `""` (authoring error, not a crash). Note: the 1–10 `countWord` used
for list count-grouping ("two goats") is a *separate* speller — don't conflate them.

### 4.8 Verb (ADR-199) — atom + subject agreement

`{verb:is target}` → "is"/"are"; `{verb:opens door}` → "opens"/"open"
(`phrase.ts:124-132`). `lemma` is the 3rd-person-singular surface the author types;
`subjectRef` names the param whose phrase the verb agrees with — it is an **agreement
pointer only**, never rendered. `subjectAgreement` (`english-assembler.ts:220`) reads the
subject's number/person (a `PhraseList` of >1 present items agrees plural). `conjugateVerb`
(`:240`) uses an `IRREGULAR_VERBS` table (is/was/has/does/goes + the `-ie` set
dies/lies/ties/vies) else `regularPluralVerb` (`:198`). The player subject takes narrative
person via `ctx.narrative.playerId`/`.person` ("you are"). ADR-204 refined
`regularPluralVerb` so `-se/-ze` stems (refuse, freeze) aren't over-stripped.

### 4.9 Verbatim (ADR-200) — atom

`{verbatim:npcName}` renders a bound scalar as opaque pass-through text, **exempt from
whitespace collapse** — the home for names, directions, free text, ASCII banners
(`phrase.ts:177-181`). Without it the parser would wrap a bare string as an indefinite
NounPhrase ("a north", "a Aragorn"). Byte-for-byte; internal spaces/newlines survive.

### 4.10 Sentence & Quote (ADR-201) — emitted, not authored

`Sentence` (`phrase.ts:267`) owns leading-capital + terminal punctuation; `Quote`
(`:282`) owns quote glyphs (from `LocaleSettings`), first-word capital, terminal-punct
*inside* the closing quote (`."`), and signals an owed attributive comma. Authored via
`{quote:line}`; `{sentence:…}` is rejected — sentence structure comes from message
structure. See §8.

---

## 5. The Assembler (the keystone)

`EnglishAssembler` (`english-assembler.ts:862`) is the **sole authority** for six
cross-cutting concerns. Its `realize(tree, ctx)` (`:875`) is **pure given the `textState`
snapshot** — no clocks, no `Math.random`; the *only* sanctioned state mutation is a
`Choice` advancing its counter (`:18-22`).

Pipeline order inside `realize`:

1. `realizeToRuns(tree, ctx)` (`:630`) — recursive walk → flat `Run[]`, each carrying
   text, a `verbatim` flag, a decoration stack, and ADR-201 edge metadata
   (`sentenceInitial`, `capEligible`, `quoteOpen/Close`, `ownsTrailingPunct`).
2. `reconciliationPass` (`:765`) — one walk that resolves capitalization and terminal
   punctuation **from run metadata only** (never by scanning prose — see §7).
3. `splitRunsOnNewlines` (`:837`) — lifts `\n` to block boundaries.
4. `collapseWhitespace` (`:448`) + `runsToContent` (`:788`) → `ITextBlock[]`.

The six authorities:

| Authority | Owns | Code |
|---|---|---|
| **Article** | a/an/the/some/∅ over the rendered head (incl. adjectives), silent-h, "a university" | `articleSurface` `:98`, `indefiniteArticle` `:102` |
| **Agreement** | verb number/person, pluralization; **no double-pluralization** (intrinsic-plural names render as-is) | `nounSurface` `:147`, `conjugateVerb` `:240` |
| **Punctuation** | serial comma, final and/or, empty-list → "nothing", `Empty`-absorption | `joinParts` `:281`, `renderList` `:300` |
| **Whitespace** | collapse + paragraph breaks; `Verbatim`/`whitespace:'verbatim'` exempt | `collapseWhitespace` `:448` |
| **Reference** | last-mentioned tracking → `Pronoun` | `noteReference` `:403`, `renderPronoun` `:432` |
| **Case** | sentence-start capitalization | `capitalizeSentenceStart` `:485` (a glyph helper — structure decides *which* fragment) |

Output: `ITextBlock[]` keyed `ACTION_RESULT` by default; the report layer re-keys per
channel.

---

## 6. The emission pipeline (event → text)

Entry: `ProsePipeline.processTurn` (`packages/engine/src/prose-pipeline/pipeline.ts:98`)
— **Filter** (drop `system.*`/`platform.*`) → **Sort** (ADR-094 chain order) → **Route**
→ **Assemble**. Routing (`routeToHandler`, `:148`) order is load-bearing:

1. **messageId path first** — `tryProcessDomainEventMessage(event, context)` runs for
   **every event that has `data.messageId`**, regardless of type (ADR-097). If it returns
   non-null, routing stops. **This captures `game.message` too.**
2. **Type-keyed handlers** — only if step 1 returned null: `game.started`,
   room description, `game.message` (`handleGameMessage`), revealed, help/about,
   audibility, implicit_take, command.failed, client.query.
3. **Generic catch-all** — `handleGenericEvent` (the `if.event.*` / story-event path).

### The messageId resolution path

`tryProcessDomainEventMessage` (`handlers/domain-message.ts:42`):

```ts
if (phraseAvailable(context)) {
  const blocks = renderViaPhrase(context, data.messageId, data.params ?? {}, blockKey);
  return blocks ?? inlineFallback();   // fallback ONLY if renderViaPhrase returned null
}
```

`renderViaPhrase` (`phrase-render.ts:54`):

- Returns **`null` only when `getTemplate(messageId) === undefined`** (id not registered)
  — the signal to use inline fallback (`:63`).
- Otherwise renders the template; on a throw (unbound param, bad syntax) it logs
  `[phrase] renderMessage("<id>") failed: <msg>` and returns null (`:88`).

`inlineFallback` (`domain-message.ts:68`) renders `data.message ?? data.text` if it's a
non-empty string, else null (routing then falls through). Header note: `if.event.*` carry
a messageId "for semantic association, not for text rendering" — a bare one with no
inline text renders nothing by design.

### `game.message` vs `if.event.*` param binding — the ADR-206 contract

Three distinct binding shapes exist, and the **first-match order** matters:

| Path | Handler | Param binding |
|---|---|---|
| messageId path (runs first, catches `game.message` too) | `tryProcessDomainEventMessage` | **`data.params` only** (`domain-message.ts:82`) |
| `game.message` type handler (fall-through) | `handleGameMessage` | `data.params ?? data` (`generic.ts:40`) |
| `if.event.*` / unknown (fall-through) | `handleGenericEvent` | `data` (flat = params) (`generic.ts:85`) |

Because the messageId path runs first and binds **only `data.params`**, a `game.message`
emitted **flat** (`{ messageId, target }`, render param at top level) → `renderViaPhrase(id,
{}, …)` → template `You burn {the target}.` → `target` unbound → **throws** → logs the
`[phrase] renderMessage … failed` line → inline fallback finds no text → **falls through**
to `handleGameMessage`, which re-binds `data.params ?? data` and recovers. Visible symptom:
the logged failure line and a wasted double render; for any path with no recovering
fall-through, **blank output**.

**The contract (ADR-206):** render params **MUST be nested under `params`**;
handler-read fields (e.g. dungeo exorcism `fuseId`) stay top-level.

```ts
// CORRECT
context.event('game.message', { messageId: BurnMessages.BURN_SUCCESS, params: { target: name } })
// WRONG — target at top level throws under the messageId path
context.event('game.message', { messageId: BurnMessages.BURN_SUCCESS, target: name })
```

The ADR-206 fence (still to be written) is a transcript-run guard asserting **zero**
`[phrase] renderMessage … failed` lines.

---

## 7. The Structural Realization Mandate (ADR-202)

**Mandate:** text is produced by realizing a typed `Phrase` AST. The Assembler MAY inspect
a node's **own realized surface** for a bounded, token-local rule (indefinite article over
the rendered head; capitalizing a fragment's first glyph; verb morphology over a lemma).
It **MUST NOT** pattern-match across the concatenated output to recover *structure*
(sentence boundaries, quote nesting, clause membership) and **MUST NOT re-parse the
output**. Crisp line: *inspecting this node's text to apply this node's rule = allowed;
reading the neighbours'/whole output's text to infer structure = forbidden.* Structure
travels forward as `Run` edge metadata and is resolved in one reconciliation pass.

Permitted-helper allowlist: `regularPluralVerb`, `capitalizeSentenceStart`,
`indefiniteArticle`, `collapseWhitespace`, `splitRunsOnNewlines` — each token/run-local or
whitespace-only. `capitalizeSentenceStart` is explicitly **demoted** from sentence-start
authority to a glyph helper; which fragment starts a sentence is decided by structure.

**The gate is a CI test, not a runtime check** —
`packages/lang-en-us/tests/assembler/structural-mandate.test.ts`. It parses the real
`english-assembler.ts` via the TypeScript AST, finds every regex literal, `new RegExp`,
and `.replace(...)`, maps each to its enclosing function, and **fails the build** if any
sits outside the allowlist (ADR-202 AC-1 ≡ ADR-201 AC-6, one gate). It self-checks
(asserts findings > 0; plants a forbidden pattern to prove the scanner bites). The runtime
`[phrase] … failed` warn is a *separate*, unrelated safety net (param-binding, not
structure).

---

## 8. Dialogue, speech & speaker attribution (ADR-201 / ADR-203)

A dialogue tag ("The merchant says, '…'") is **composition, not a new kind**: a sequence
of `[subject NounPhrase|Pronoun, Verb(speech-lemma), Quote]` (ADR-201). The stdlib
`talking`/`asking`/`telling`/`answering` catalogs replaced literal `says` with
`{verb:says <speaker>}` so the verb agrees with speaker number/person.

**ADR-203** promotes NPC attribution from `npcName: string` to a **`speaker` param that is
a `NounPhrase`** produced by `nounPhraseFor(npc)` at emit time — so a plural/collective NPC
("the triplet acrobats") renders "…**say**", not "…says". This was an atomic cross-package
rename (core query type, all emitters, both template files
`packages/lang-en-us/src/npc/{npc,conversation}.ts`); a missed emitter leaves an
unresolved param → blank attribution. Templates now read
`{capitalize the speaker} {verb:LEMMA speaker}, "…"`. Story overrides of platform
`npc.*` messages must use `{capitalize the speaker}`, **not** the old `{verbatim:npcName}`
(this was the regression fixed in commit `3823c931`).

---

## 9. The decoration / inline-markup layer

Separate from the phrase layer and applied **after** messageId resolution. `[name:content]`
bracket markup (ADR-174/183) is parsed by `parseDecorations`
(`packages/engine/src/prose-pipeline/decorations/parser.ts:37`) into a `TextContent[]`
tree of strings + `IDecoration`s. Forgiving: unclosed `[` → literal; `[name content]` with
no colon → literal unless a void macro (`br`/`p`); `[:content]` → children inlined.
`resolveClassName` (`decorations/resolver.ts:30`) prefixes platform names with `sharpee-`.
The frozen platform vocabulary lives in `decorations/platform-vocabulary.ts` — switches
(`em`/`strong`), IF classifiers (`item`/`npc`/`room`/`direction`/`command`/`quote`),
color/size/font, layout macros (`br`/`p`/`indent`/`center`/`right`). Note: `quote` here is
a decoration *classifier*, distinct from the ADR-201 `Quote` phrase kind.

---

## 10. Determinism & persistence

Sharpee saves and transcript tests must replay identically:

- `Choice` selectors seed from deterministic `(entityId, messageKey, counter)` state,
  never `Math.random()`/`Date.now()`.
- `Slot` contributions order by `(order, insertion)`; the slot store is per-turn, never
  serialized.
- The **text-state store** (per-`(entityId, messageKey)` counters) is the one genuinely
  new persistent state — it round-trips with the world via the `TEXT_STATE` capability.
- `Assembler.realize` is pure given the `textState` snapshot.

---

## 11. Authoring cookbook

**Register a template** (story): in your catalog registrar,
`language.addMessage('my.message.id', 'You {verb:push door} {the door}.')`. Platform
action templates load from per-action `messages` objects
(`language-provider.ts:loadActionMessages`). `getTemplate(id)` returns the raw string or
`undefined`.

**Emit a `game.message`** with render params **nested**:

```ts
context.event('game.message', { messageId: MyMessages.SUCCESS, params: { target: name } })
```

**Emit inline text with no template** — omit `messageId` and pass `text` (or `message`);
the messageId path is skipped and `handleGameMessage`'s `data.text ?? data.message` tail
renders it:

```ts
createEffect('game.message', { text: 'A cloud of black smoke envelops the carcass.' })
```

**Open a slot**: put `{slot:here}` in a template; register a `SlotContributor` via
`engine.registerSlotContributor(fn)` that calls `ctx.contribute('here', phrase, {order})`.

**Conditional / varying clause**: build an `Optional`/`Choice` in a code-side producer,
bind it to a param, reference it as `{clauseName}`. Never put branching in the string.

**Entity params carry NounPhrases, not strings** (ADR-158): build them with
`nounPhraseFor(entity)` so agreement/article/pronoun work downstream.

---

## 12. Failure modes & gotchas (read this before debugging blank text)

1. **Empty-string template shadows the inline fallback.** Registering an id as `''`
   (`language.addMessage(ID, '')`) makes `getTemplate(id)` return `''` — **not
   `undefined`** — so `renderViaPhrase` renders a blank block and returns non-null, and
   the `blocks ?? inlineFallback()` short-circuit **never calls the fallback**. An event's
   pre-rendered `text` is silently discarded → **blank output**. This was the dungeo melee
   bug (§13). Fix: don't register ids you intend to fall back for, or give them a real
   `{verbatim:text}` template.
2. **Flat `game.message` params throw under the messageId path** (§6, ADR-206). Symptom:
   `[phrase] renderMessage(...) failed` in logs; recovers only if a fall-through handler
   re-binds. Nest under `params`.
3. **Raw `text` on an event with a *resolvable* messageId is ignored** — the template
   renders instead. Raw `text` only surfaces via `inlineFallback`, i.e. when the id is
   unregistered or `renderMessage` threw.
4. **`[phrase] renderMessage("<id>") failed`** is the observable signal of a param-binding
   mismatch or bad template; the turn degrades to inline fallback rather than aborting.
5. **Discriminant ≠ type name**: `Numeral`=`'number'`, `PhraseList`=`'list'`,
   `Sequence`=`'seq'`.
6. **`{the villain}` is not `{villain}`.** A regex like `/\{villain\}/g` does not match
   `{the villain}` — the token survives literally. (Real bug in
   `stories/dungeo/src/combat/melee-messages.ts:383`.)
7. Parse errors are **synchronous at parse time** — you never get a silent realize-time
   `Empty` from a bad template.

---

## 13. Case study — dungeo melee renders blank

**Symptom:** `> attack troll with sword` → *"Error: blank output — command produced no
visible text."*

**The chain is correct up to rendering.** The melee interceptor
(`stories/dungeo/src/interceptors/melee-interceptor.ts`) computes a pre-rendered blow
string and, in `postReport` (`:475`), returns
`override: { messageId: 'dungeo.melee.hero_attack', text: message }`. The attacking action
(`packages/stdlib/src/actions/standard/attacking/attacking.ts`) emits `if.event.attacked`
with that messageId, and `applyInterceptorReportResult` copies `text` onto it. The final
event genuinely carries
`{ messageId:'dungeo.melee.hero_attack', params:{target,weapon}, text:"Your swing misses
{the villain} by an inch." }`.

**Root cause:** `stories/dungeo/src/messages/npc-messages.ts:227-232` registers the melee
ids as **empty-string templates**:

```ts
language.addMessage(MeleeMessages.HERO_ATTACK, '');     // 'dungeo.melee.hero_attack'
language.addMessage(MeleeMessages.VILLAIN_ATTACK, '');
```

The author's intent was to let these ids fall through to the inline-`text` fallback. But
under the phrase system `getTemplate('dungeo.melee.hero_attack')` now returns `''` (not
`undefined`), so `renderViaPhrase`'s `=== undefined` guard is false — it renders the empty
template to a blank (non-null) block, and `blocks ?? inlineFallback()` keeps the blank.
The pre-rendered combat prose in `data.text` is discarded. **Gotcha #1 above.**

**Secondary bug:** `getHeroAttackMessage` (`melee-messages.ts:383`) does
`msg.replace(/\{villain\}/g, name)`, which substitutes `{villain}` but **not**
`{the villain}` — so ~half the hero-attack variants would show the literal `{the villain}`
even once blank rendering is fixed. `villainName` is the bare lowercase key ("troll"), so
`{the villain}` should map to "the troll".

**Fix options (story-level, no platform change):**
1. **Minimal:** stop registering the four dynamic melee ids (delete the empty-string
   registrations for `HERO_ATTACK`, `VILLAIN_ATTACK`, `BACKUP_WEAPON`, `VILLAIN_DISARMED`).
   `getTemplate` returns `undefined`, `renderViaPhrase` returns null, and `inlineFallback`
   renders `data.text`. Matches the author's stated intent.
2. **Phrase-native:** register `'{verbatim:text}'` templates and pass the prose as
   `params.text` — keeps combat text inside the phrase pipeline.
3. Emit the combat text with **no `messageId`** (only `text`), so the messageId path is
   skipped entirely.

Plus: fix `melee-messages.ts` to also replace `{the villain}` (→ "the <villain>").

---

## 14. Where each piece lives (layering)

| Layer | Owns |
|---|---|
| `@sharpee/if-domain` | the `Phrase` kinds, `PhraseProducer`, `RenderContext` — language-neutral contracts (`src/phrase.ts`) |
| `world-model` | trait adjective contributors (`src/state-adjectives.ts`), `EntityInfo`→NounPhrase data, `TEXT_STATE` capability |
| `lang-en-us` | the parser (`src/parser/parse-phrase-template.ts`), the Assembler (`src/assembler/english-assembler.ts`), number/verb tables, the message catalog (`src/language-provider.ts`) |
| `engine` | the prose pipeline (`src/prose-pipeline/`) — routing, handlers, render-context, slot store, decorations; runs the Assembler |
| `stdlib` | action templates; `nounPhraseFor` producer; slot/param binding |
| `story` | authored templates & overrides; custom producers; slot contributors; `game.message` emits |

---

## 15. ADR index

| ADR | Topic |
|---|---|
| 192 | Phrase model & Assembler core (foundation) |
| 193 | State-derived adjectives (NounPhrase + AdjectiveContributor) |
| 194 | Contents combinator |
| 195 | Slot combinator / contribution channel |
| 196 | Optional / Choice + text-state store |
| 197 | Pronoun atom + last-mentioned context |
| 198 | Numeral atom |
| 199 | Verb atom + subject agreement |
| 200 | Verbatim atom |
| 201 | Dialogue / speech emission (Sentence, Quote, `{quote:}`, `{capitalize pronoun:}`) |
| 202 | Structural Realization Mandate (the CI gate) |
| 203 | NPC attribution speaker agreement (`npcName`→`speaker` NounPhrase) |
| 204 | Verb pluralization `-se/-ze` stem refinement |
| 205 | (REJECTED) catalog-wide subject-verb agreement |
| 206 | `game.message` param contract (nest under `params`) |
