# ADR-231: Player-Surface Contract Rulings — the phrasebook verification gaps

## Status: ACCEPTED (2026-07-17 — all six open questions ruled by David via interview, session 1befbd)

## Date: 2026-07-17

> Successor to ADR-230, same pattern: the stdlib-phrasebook verification
> pass (session 907f28) surfaced seven platform gaps; session-1befbd
> investigation grounded every one in code and live runs, correcting
> three of them in the process. This ADR carries the six
> decision-bearing areas. Plain defects (wearing params, grammar
> priority bumps, article field population, dead topic-fallback code,
> doc corrections) go straight to the implementation plan, no ruling
> needed — they are recorded in Consequences.

## Context

The phrasebook (`docs/reference/stdlib-phrasebook.md`) replays 68
commands byte-identically against fixtures; producing it forced every
player-facing surface through a live loop and exposed contract holes
that unit suites never touch. Investigation findings, all verified
against code and the CLI bundle:

**Blank Chord refusals (gap 1).** A Chord `refuse <key>` compiles to an
interceptor whose `preValidate` returns the raw phrase key
(`story-loader/src/runtime.ts:392-411`); the loader registers the key
verbatim, unprefixed (`loader.ts:493-496`); the standard action's
`blocked()` then builds `${action.id}.${error}`. Exactly 8 actions
(taking, opening, closing, talking, telling, asking, digging, cutting)
grew an ad-hoc dotted-key escape; the other ~29 prefix unconditionally.
Hyphenated keys (`ring-fused`) contain no dot, so they blank even on
the 8. The renderer returns null silently for an unregistered id
(`engine/src/prose-pipeline/phrase-render.ts:63-65`) — no warning.
Both shipped examples (stdlib-reference §2 iron-ring, chord-language.md
hive-box) render blank today. The dotted-key workaround is narrower
than documented: Chord's grammar rejects dotted keys in conditional
refusals (`parser.ts:1596-1625`, `:2030-2044`), in `define phrases`
blocks (`parser.ts:1124-1127`), and in per-entity `phrase <key>:`
headers — only singular `define phrase` and statement-level
declare-and-emit accept them (ADR-230 D5 delivered those forms only).

**Cross-action key leakage (corrected gap 2).** The reported "giving to
self renders blank" is not reproducible — that path binds its params
correctly. The real repro: `give/show <non-carried scenery> to X` —
`requireCarriedOrImplicitTake` (`enhanced-context.ts:151-160`) returns
**taking's** `fixed_in_place` key, which giving/showing prefix into
`if.action.giving.fixed_in_place` — unregistered, blank. Same namespace
class as gap 1, different producer: a shared helper emitting another
action's key.

**Parse-time trait gating is dead (gap 4, escalated).**
`.hasTrait()` on a grammar slot writes `traitFilters` that no consumer
ever evaluates (`entity-slot-consumer.ts:303,378` reads only `.where()`
function constraints). Every trait gate in core grammar — entering's
ENTERABLE, climbing's CLIMBABLE — is a no-op at parse time, falsifying
the gating premise written into ADR-218 §1a comments and the grammar
file header. Compounding it, the prepositional forms (`get in :portal`
etc.) sit at the same priority 100 as taking's `get :item`, and ties
break by registration order — taking wins. Live results: `get in
sedan chair` → taking's scenery refusal; `get in strongbox` →
**silently takes the container**; `get out` / `climb out` → "can't see
any such thing."

**Multiword names resolve only by exact full text (gap 3, broadened).**
`x the brass key` fails because leading articles are swallowed into the
noun text (the `INounPhrase.articles` contract field exists but is
hardcoded empty, `english-parser.ts:857-866`) and the validator does
exact-match only. But bare `x key` **also** fails without an explicit
alias: head nouns and adjectives of multiword names contribute nothing
to matching (`command-validator.ts:643-718`), and the Chord loader
derives no vocabulary from names (`loader.ts:714`). Only the exact full
name or an `aka` alias resolves.

**Ask/tell topics are entity-resolved (gap 5).** Core grammar never
marks `:topic` as a topic slot, so it defaults to an entity slot; the
command-validator entity-resolves any `indirectObject` regardless of
the action's `requiresIndirectObject: false` and rejects free text with
"You can't see any such thing" before asking/telling ever run.
`SlotType.TOPIC` and a `TextSlotConsumer` already exist, unused by core
grammar — plus two latent defects: the parser's structure-builder has
no TOPIC branch, and asking/telling's fallback reads
`parsed.structure.extras`, a field that does not exist (dead code).

**No initial trait state in Chord (gap 6).** There is no surface to
declare an entity starts locked: `locked` is a derivable
state-adjective (never stored), composing `lockable` always starts
unlocked (`loader.ts:872-888` never passes `isLocked`), and the
shadow-state ratchet's fix-it points circularly back at `lockable`.
Adjacent inconsistency: container-kind + `openable` starts OPEN
(helpers ContainerBuilder `?? true`) while adjective-only `openable`
starts CLOSED (world-model trait `?? false`) — two construction paths,
opposite defaults, spec silent on both.

**Actions have no seeded RNG (gap 7).** `ActionContext` exposes no RNG;
throwing rolls raw `Math.random` at 6 sites, attacking does so
transitively through `WeaponBehavior.calculateDamage` (damage + crit),
inventory uses it for message variety. The engine owns a seeded stream
(passed to turn plugins and the deadly-room transformer) but never
persists its seed; the scheduler and basic-combat each own separate
streams (scheduler persists its seed across save/restore).

## Decision

Six decision areas, all ruled by David 2026-07-17 (interview, session
1befbd).

### D1: Refusal-key namespace contract — provenance pass-through (ruled by David, 2026-07-17)

**An interceptor-originated error is a fully-qualified message id and
is never prefixed.** The lifecycle engine — not each action — marks
provenance on the error as it crosses from interceptor consultation
into the blocked path; `blocked()` implementations stop qualifying
interceptor errors entirely. Bare Chord keys (`ring-fused`,
`bees-disturbed`) then resolve because the loader already registers
them verbatim; hyphenated keys work; the shipped bare-key syntax is
correct as written. The 8 ad-hoc dotted-key escapes become dead
branches and are removed with the prefix sites. Action-internal
validation errors (not interceptor-originated) keep today's
`${action.id}.${error}` convention — provenance is the discriminator,
not key shape.

Riders, same ruling:

- **Dotted keys extend to ALL Chord key sites** — conditional refusals
  (`refuse when`/`refuse without`, `must … : key`), `define phrases`
  blocks, and per-entity `phrase <key>:` headers accept dotted keys,
  honoring the EBNF's `phrase-key = WORD { "." WORD }` everywhere and
  finishing what ADR-230 D5 started (delivery covered only the two
  statement forms). `chord.ebnf` and chord-language.md align.
- **The cross-action `fixed_in_place` leak is fixed at the producing
  helper**: `requireCarriedOrImplicitTake` emits taking's key as a
  fully-qualified id (it is taking's refusal, whatever action invoked
  the helper), so giving/showing render taking's message instead of
  prefixing it into their own unregistered namespace.
- **Silent blanks end**: the renderer's unregistered-id null path gains
  a dev-mode warning, and the pinning suite asserts a bare interceptor
  key round-trips to rendered text on an action that formerly always
  prefixed (wearing or giving).

### D2: Parse-time gating and pattern specificity (ruled by David, 2026-07-17)

**D2a — `.hasTrait()` is deleted.** Parse by syntax, refuse by world:
the action's `validate()` owns trait-based refusal (today's ungated
`enter hairpin` → "You can't enter the hairpin" is the correct
behavior, not a bug). The dead `traitFilters` plumbing is removed from
the grammar builder and rule storage; `.where()` function constraints
remain the one parse-time gating mechanism for rules that genuinely
need it. ADR-218 §1a's comments and the grammar file header are
corrected to stop claiming parse-time trait gating. This also removes
the fallback trap by construction — a syntactically-matching rule
always wins its parse and refuses in-action; it never silently falls
through to a less specific rule that takes the container.

**D2b — literal-before-slot specificity becomes a general confidence
rule.** A rule whose literal tokens consume words outranks a rule
whose unconstrained slot swallows the same words (`get in :portal`
beats `get :item` for "get in basket" structurally, not by curation).
Per-rule priority remains as an explicit override on top. The ~10
mechanical priority bumps land as defect fixes regardless; the
confidence rule is the durable part that makes the class unable to
recur. Because it re-scores many parses subtly, delivery requires the
full dungeo walkthrough chain (one good run = baseline), the unit
transcripts, and the parser suite before it merges.

### D3: Word-level name vocabulary with scored matching (ruled by David, 2026-07-17)

Ruled against the north star — 100% Sharpee↔Chord alignment and a
high-fidelity parser — not minimal blast radius. **Every content word
of an entity's name is matchable vocabulary**, derived once at
world-model identity construction (shared helper), so Chord-loaded and
TS-authored entities behave identically by construction. The
head-noun-heuristic alternative was rejected as a fidelity ceiling
(last-word-is-head mis-derives "bag of holding"-class names). The
validator **scores** candidates instead of exact-matching: exact full
text beats more-matched-words beats fewer; ties trigger normal
disambiguation rather than silent misses. `x key`, `x brass key`, and
`x bag` (of holding) all resolve with zero authoring; explicit `aka`
stays additive; article handling (populate the existing
`INounPhrase.articles` field, strip before matching, full-text first
so proper names survive) rides as the defect fix it always was.
Story-wide behavior change is accepted: entities sharing a word now
disambiguate where they previously missed — that is the correct IF
behavior, verified via the walkthrough chain and unit transcripts.

### D4: First-class topic field, entity-first resolution (ruled by David, 2026-07-17)

**The parsed/validated command gains a first-class typed topic field —
`{ text, entity? }`** — the documented contract for ask/tell and any
future conversation grammar; `textSlots` and `extras` stay what they
are. **Resolution is entity-first with text fallback**: a topic naming
an in-scope entity carries that entity (interceptors and a future
conversation system key on it); anything else flows through as free
text — a topic is never scope-rejected. Delivery: the 5 ask/tell
grammar rules are marked `.topic()`, the parser's structure-builder
gains the TOPIC branch that populates the field, the command-validator
stops entity-rejecting topic slots, and asking/telling read the real
field (their dead `structure.extras` fallback dies with the defect
list). `unknown_topic` renders the topic text verbatim for free-text
topics.

### D5: `starts <state>` initial-state clause; closed default (ruled by David, 2026-07-17)

**D5a — Chord gains a generic `starts <state>` composition clause**:
`a container, openable, lockable with key the brass key, starts
locked`. It reuses the `starts` word Chord already owns (`starts in`
placement) and the derivable state-adjective names (`locked`, `closed`,
`open`, `off`, `on`, …) as *initializers* — the ratchet given
("state adjectives are derivable, never stored") survives intact:
`starts locked` sets the trait's initial value; the adjective is never
stored story state. One surface for every stateful platform trait,
present and future — the per-trait config alternative was rejected as
non-generalizing. The analyzer enforces pairing (`starts locked`
requires `lockable` composed, `starts closed/open` requires
`openable`, `starts off/on` requires `switchable`); the loader maps
each to trait data (`isLocked`, `isOpen`, …). Grammar growth is
owner-gated: this ruling IS the owner approval; a
`chord-grammar-changes.md` ratchet entry, EBNF alignment, and
chord-language.md spec text land with delivery.

**D5b — closed wins.** The world-model trait's default (`startsOpen ??
false`) is authoritative everywhere; the loader's `builder.openable()`
pre-add is removed (the lockable Phase 9a pattern) and the helpers
ContainerBuilder's `?? true` is aligned to the trait. Matches IF
convention (containers closed unless declared open). Every `a
container, openable` story flips open→closed: delivery includes a
fixture/transcript sweep, and `starts open` (D5a) is the author's
explicit escape.

### D6: Dedicated persisted action stream (ruled by David, 2026-07-17)

**The engine owns a new dedicated seeded stream for actions** — the
established per-subsystem pattern (scheduler, basic-combat, Chord
evaluator) — **exposed as `ActionContext.random`, with its seed
persisted across save/restore** (scheduler precedent; ADR-227 AC-2
precedent for persistence). Sharing the turn-plugin stream was
rejected: interleaved draws would let any new plugin shift every
subsequent action roll. Post-restore action outcomes become
deterministic with an unbroken run. Plumbing: engine
action-context-factory threads the stream into context creation.
Day-one consumers: throwing's 6 `Math.random` sites,
`WeaponBehavior.calculateDamage` (rng injected as a parameter, the
deadly-room precedent — world-model stays engine-free), and
inventory's message-variant pick. Routing only — story-level RNG
policy is untouched (never seed/disable story randomness).

## Consequences

- The two shipped-doc blanks (stdlib-reference §2 iron-ring,
  chord-language.md hive-box) become correct as written under D1's
  pass-through; both docs, the phrasebook, and the site re-render
  afterward.
- D1's ruling is the actual completion of ADR-229 R1: refusals became
  hook-visible there; they become render-reliable here.
- D2a deletes a platform-wide dead API; ADR-218 §1a's comments get
  corrected to match reality.
- **The implementation plan's pin phase must pin before code** (ADR-230
  Phase 1 precedent): the provenance-marking shape (D1), the topic
  field's exact location and type (D4), the "content word" definition
  and candidate-scoring function (D3) — and must name rejection tests
  for D5a analyzer pairing, D4 free-text non-rejection, and D6
  restore-determinism.
- D5 grows Chord grammar (owner-gated) and D5b changes existing story
  behavior; both need spec text in chord-language.md, which is silent
  on initial state today.
- D6 is an ActionContext contract change touching engine
  action-context-factory plumbing.
- **Plain defects recorded for the plan, no ruling needed:** wearing
  `not_wearable`/`already_wearing`/`cant_wear_that` missing params
  (wearing.ts:110/123/125, taking-off pattern); ~10 grammar priority
  bumps (the file's own header mandates 100+ for semantic rules);
  populate `INounPhrase.articles` + article-stripped resolution
  fallback; parser TOPIC structure branch + asking/telling dead
  `structure.extras` fallback; renderer dev-warning on unregistered
  ids; inventory `Math.random` (rides with D6).
- Verification: new grammar/priority changes get the dungeo walkthrough
  chain (one good run = baseline) plus unit transcripts; every ruling
  that lands grows the pinning suites, phrasebook verify stays 68/68.

## Session

Session 1befbd (2026-07-17, chord-foundations). Gap list produced by
the phrasebook verification pass (session 907f28); grounded by four
parallel code investigations this session before drafting.

