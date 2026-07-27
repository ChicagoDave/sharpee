# ADR-266: Grammar definition parity — Sharpee and Chord

## Status: ACCEPTED (2026-07-25) — **supersedes ADR-265**, and is **widened twice** past it. The ask was to see how the grammar would be defined in Chord; auditing that exposed a Chord grammar surface materially narrower than Sharpee's, a compiler that discards what Chord already says, a taught construct enforced nowhere, a documented surface whose own published example fails to load, and no way for an author to modify standard grammar at all. Measured against the Inform 7 bar the feedback invoked — extend, alter, order — Chord has none of the three. **Owner direction 2026-07-25: option (iv) — the readable Chord grammar becomes the editable source, not a reference.** The standard grammar's Chord form is loadable and author-modifiable, as I7's Standard Rules are; actions stay TypeScript. This reverses ADR-265's reference-only stance entirely and converts Gap 2's missing constructs from a backlog into a prerequisite. ADR-265's generated set is replaced in full. **Umbrella ADR** (owner ruling, same session): the direction and constraints live here; the work lands in six named children, ADR-267 through ADR-272 (D14). Per project convention an umbrella is never implemented directly — **accepting this ADR authorizes no code**; it fixes the direction, the boundary (D8), the required-construct set (D12′), the slot spelling (D15), and the allocation of acceptance to children. Each child must be written and accepted before its phase begins. Acceptance carries no Open Questions (all devolved, D14). Reviewed at acceptance: 15/15, READY as an umbrella.

**CLOSED 2026-07-27 (session 834109) — the programme is complete.** All six children reached their
terminal state: **ADR-267** IMPLEMENTED (2026-07-25, session 2d5bc7 — four landing groups whole;
reserved-surface audit PASS; gap report empty), **ADR-268** IMPLEMENTED (2026-07-26, session b88ed7 —
confidence → tier → specificity → definition order), **ADR-269** IMPLEMENTED (2026-07-26, session
f9e069 — the standard grammar is Chord source, 422-rule equivalence verified, freshness-gated
generation), **ADR-270** IMPLEMENTED (2026-07-26, session 0ea0e5 — `extend action` / `remove from
action`; `define verb` removed), **ADR-271** complete (Phases 1–3 landed session b52717; its blocked
acceptance items 1 and 6 discharged by the split-out **ADR-273** reachability fix — fernhill and
friendly-zoo suites green since), **ADR-272** IMPLEMENTED (2026-07-26 — umbrella items 16/17
discharged). The programme also produced two spin-offs beyond the roster: ADR-273 (the
`GrammarScopeResolver` reachability defect) and ADR-275 (the directions runtime slice — entity-less
dispatch + semantic word binding). The seventeen-item acceptance set above is discharged as tagged.
The I7 bar the feedback invoked — **extend, alter, order** — is met on all three. The interim
language bumps consolidated to public **Chord 2.0.0** (ADR-257 second recorded exception).
Afterlife: ADR-269 D7's freshness-gated generation became ADR-276's stdlib-manifest mechanism, the
Chord standard-grammar source now also feeds the manifest's grammar-shapes slice, and ADR-270's
load-time alteration errors were migrated to compile diagnostics by ADR-276 (story-first resolution
order preserved). Current as of Sharpee 4.1.0 / Chord 2.1.0.

## Parent: supersedes ADR-265 (same author feedback, `docs/feedback/intfiction-20260724.txt`, Nathaniel Lindell). Serves the Sharpee↔Chord parity goal. Relates to ADR-087 (action-centric grammar — the `forAction` shape at the centre of this), ADR-084 (removed the story-grammar wrapper; the reason `extendParser` is already at full capability), ADR-088 (grammar engine refactor), ADR-054 (semantic grammar), ADR-230 (grammar reachability), ADR-231 D2a (parse-time gating; `.hasTrait()` removal), ADR-210/ADR-218 (Chord `define action` + `grammar` block), ADR-215 (extensions add grammar), ADR-235 D2 (the "compiles but cannot work" class this ADR finds another member of), ADR-257 (Chord language version — bumped by any construct promoted from the gap list), `docs/architecture/chord-grammar-changes.md` (where such a promotion is approved), ADR-258 (the IDE), ADR-255/ADR-090/ADR-052 (the change mechanisms ADR-265 catalogued).

## Date: 2026-07-25

## Context

### What was asked

> *"it's not readily apparent how to change existing logic or sequence of play that the library
> defines, nor do we have the library in readable Chord form."*

Clarified by the owner (2026-07-25): the request is to see **how all the grammar would be defined in
Chord, not Sharpee**. An author who writes Chord wants to read the standard verbs — `take`,
`put … in …`, `look at …` — in the notation they themselves use to add verbs.

### What ADR-265 built instead

ADR-265 read "the library" as the stdlib **actions** and specified a projection of ADR-228
`ActionLifecycleDescriptor` metadata plus `*-messages.ts` ids. The generated result is 56 `.story`
files in `docs/reference/stdlib-chord/`. In each one the grammar appears as a comment —
`## Verbs   : take, get, pick up, grab, acquire, collect` — the body is a message-alias table and an
emitted-event list (also comments), and the only executable Chord is a `create the Void` room and a
`create the player` stub, present so the file parses as a story.

The one thing asked for is the one thing rendered as prose. The scaffolding exists to satisfy ADR-265
D2's "it compiles but refuses to run," a constraint invented for an artifact nobody wanted.

### Sharpee's grammar-definition capability

`packages/parser-en-us/src/grammar.ts` (1125 lines, `defineGrammar(GrammarBuilder)`) is the standard
grammar's *instance*, not the capability. Grammar is defined at three layers, in two builder shapes,
over a large slot/semantics API.

**Layers.**

| layer | how | where |
| --- | --- | --- |
| standard grammar | `defineGrammar(grammar)` | `parser-en-us/src/grammar.ts` |
| story grammar | `extendParser(parser)` → `parser.getStoryGrammar()` | any TS story (`stories/thealderman/src/index.ts`) |
| Chord-authored grammar | `define action`, compiled to story-grammar rules at priority 150 / bare-verb 140 | `story-loader/src/loader.ts:1122,1134` |

**Shapes.** Grammar is defined **by action** as well as by pattern. `ActionGrammarBuilder` (ADR-087,
`if-domain/src/grammar/grammar-builder.ts:332-416`) is the action-centric form: `.forAction(id)` then
`.verbs([…])`, `.pattern(…)` / `.patterns([…])`, `.directions({…})`, `.where(slot, scope)`,
`.slotType(slot, type)`, `.withPriority(n)`, `.withDefaultSemantics({…})`. `PatternBuilder`
(`.define(pattern).mapsTo(id)`) is the pattern-centric form, kept for phrasal verbs and complex
patterns.

**API surface, and how much of it the standard grammar uses.** The builder is far larger than
`grammar.ts` exercises — typed slots (`text`, `instrument`, `number`, `ordinal`, `time`, `direction`,
`manner`, `adjective`, `noun`, `quotedText`, `topic`, `fromVocabulary`), semantic mappings
(`withSemanticVerbs` / `Prepositions` / `Directions` / `withDefaultSemantics`), and a `ScopeBuilder`
for `.where()` (`visible`, `touchable`, `carried`, `nearby`, `matching`, `kind`, `hasTrait`,
`orExplicitly`, `orRule`):

| form | call sites in `grammar.ts` |
| --- | --- |
| `.define(…).mapsTo(…)` | 154 |
| `.forAction(…)` (action-centric) | 28 |
| `.withPriority(n)` | 150 |
| `.instrument(slot)` | 10 |
| `.topic(slot)` | 5 |
| `.withDefaultSemantics({…})` | 2 |
| `.directions({…})` | 1 |
| `.where(…)`, `.slotType(…)`, `.patterns([…])`, every other typed slot, all `withSemantic*` | 0 |

**These are call sites, not rules — do not size the work from them.** Several sit inside loops and
`.forAction()` registers a verbs × patterns cross-product. Measured against a real `EnglishGrammarEngine`
(`defineGrammar` → `getRules()`, 2026-07-25):

```
TOTAL REGISTERED RULES: 422        distinct actions: 56
rules with semantics:   154        rules with a typed slot: 15
rules with alternation:  19        rules with optional:      3
priority histogram: {90:37, 95:12, 96:1, 100:316, 101:1, 105:41, 110:14}
```

Two sizing errors in earlier drafts of this ADR follow from the confusion, and both are corrected in
D12′: semantic defaults are **154 rules, not 2** (one call site generates the 120-rule going ×
direction cross-product), and priority affects **106 deviating rules, not 150** (316 of 422 sit at the
default 100). Full detail in `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md`.

### `extendParser` is already at 100% — the gap is entirely Chord-side

A first reading of the parity problem assumed the TypeScript story surface was itself reduced and
needed raising. It is not. `Story.extendParser?(parser: Parser)` (`engine/src/story.ts:223`) receives
the real parser, and `getStoryGrammar(): GrammarBuilder` (`english-parser.ts:1183`) returns the builder
directly — its doc comment is explicit: *"ADR-084: Returns the grammar builder directly instead of a
wrapper, giving stories full access to all PatternBuilder methods."* ADR-084 removed the narrowing
wrapper. A TS story author has exactly the surface `defineGrammar` has.

(The narrowed type at `story-loader/src/loader.ts:1104` is not a restriction — it is a local structural
cast declaring only the three methods the Chord compiler itself calls, to keep story-loader's
dependency surface small.)

So parity is a Chord-side question, and it splits in two.

### Gap 1 — the compiler drops what Chord already says

The Chord→grammar compiler emits only `.define(text).mapsTo(id).withPriority(150|140)`
(`loader.ts:1122,1134`). It never calls `.forAction()`, never types a slot, never passes a scope
constraint through. Closing this needs **no new Chord syntax**: the words already exist in the
language and the builder already accepts them. Only the wiring is missing.

**The sharpest instance is a live defect.** `the animal must be reachable` — the scope constraint
taught on the `define action` page — is never enforced anywhere:

| stage | what happens | where |
| --- | --- | --- |
| parse | constraint captured | `chord/src/parser.ts:2233,2262,2293` |
| analyze | **only** the slot name is checked to exist; the requirement word (`reachable`, `visible`, `held`) is never validated against any set | `chord/src/analyzer.ts:1242-1249` |
| IR | carried as `constraints: Array<{slot, requirement}>` | `chord/src/ir.ts:461` |
| load | **no consumer** — story-loader never reads the field | — |

The author-facing documentation states the opposite. The `define action` page says the constraint is
*"a precondition on a slot the parser enforces during resolution."* The parser never receives it.
A construct that parses, validates, reaches the IR, and is silently discarded is precisely the class
ADR-235 D2 removed the behavior hatch for — *"a form that compiles but cannot work is the exact class
the never-guess gates exist to kill."*

### Gap 2 — the language surface is narrower than the builder

Chord's `PatternPart` is `{ kind: 'word' } | { kind: 'slot' }` and nothing else
(`chord/src/ast.ts:666-668`); the `define action` block carries pattern lines, `the <slot> must be
<requirement>`, refusal lines, scores, body, and phrases — no priority, no typing, no semantics, no
alternation, no optionals. Measured against the standard grammar:

Measured in **registered rules** (422 total), not call sites — see the counting note above:

| Sharpee construct | example | rules | Chord form |
| --- | --- | --- | --- |
| semantic defaults | `.withDefaultSemantics({direction})` | **154** | none |
| direction map | `.directions({north:['north','n'],…})` | **120** (subset of above) | one pattern line per alias |
| explicit priority | `.withPriority(95)` | **106** deviating (316 at default) | none |
| alternation | `look in\|inside :target` | 19 | none |
| typed slots | `.instrument('with')`, `.topic('subject')` | 15 | untyped slot only |
| optional words | `look [carefully] at :target` | 3 | none |
| greedy slot | `:message...` | (ADR-080 raw-text slots) | none |
| verb-list shorthand | `.verbs(['examine','x','inspect',…])` | — | one pattern line per verb — **no change needed** |

Closing any of these **is** a language change — EBNF, `chord-grammar-changes.md` approval, ADR-257
version bump. Under (iv) they are required rather than optional; D12′ carries the disposition.

The encouraging half: `.forAction(id).verbs([…]).pattern(':target')` and Chord's `define action` +
`grammar` block are the same idea — *an action owns its patterns*. The two languages already agree on
the organizing concept; they disagree on detail. That is what makes a readable rendering possible at
all, rather than a transliteration.

### Gap 3 — a Chord author cannot modify the standard grammar

Rendering the standard grammar readable invites the obvious next question, and it is the *first* clause
of the original feedback ("not readily apparent how to change existing logic … that the library
defines"): having read it, can the author change it? Three sub-cases, verified by execution against
`dist/cli/sharpee.js` on 2026-07-25:

**(a) Shadow a whole verb — yes, and it is the recommended path.** A `define action lowering` registers
`lower :x` at priority 150, outranking core's 100. The loader's dead-gerund diagnostic recommends
exactly this (`docs/work/stdlib-reference/chord-availability-audit.md:79` — *"story grammar @150 shadows
core verb"*). **But the shadow maps to `chord.action.lowering`, a different action id.** The author
inherits none of stdlib's behavior: changing an action's grammar costs them its implementation. There is
no way to keep stdlib `taking` and merely alter the verbs that reach it.

**(b) Alias a new verb onto an existing stdlib action — effectively no.** `define verb <word> means
<pattern>` exists for precisely this and is a Phase A stub (`loader.ts:2263-2282`): a hardcoded
`KNOWN = { 'put on': 'PUT_ON' }` and a required slot count of 2. Everything else throws `LoadError`.
The author-facing page teaches it as general — *"maps it onto an existing action's pattern"* — and its
**second published example fails to load**:

| example on `guide/vocabulary/define-verb` | result |
| --- | --- |
| `define verb hang or hook means put (something) on (something)` | works — `hang jacket on peg` → *"You put the jacket on the peg."* |
| `define verb sniff means smell (something)` | `LoadError: define verb sniff maps to smell, which the Phase A loader cannot register.` |

**(c) Remove or narrow a standard rule — no surface at all.** `GrammarBuilder` exposes only `clear()`
(`grammar-builder.ts:325`), which wipes every rule including the standard grammar, and the loader's
narrowed cast does not hand it to Chord. There is no per-rule removal in the engine. An author cannot
drop `get` as a synonym for `take`, cannot remove a pattern, cannot reorder.

So a Chord author can **add** grammar and **outrank** grammar, but cannot **modify** or **remove** it.
ADR-265's D4 answered the "how do I change it" question with `override message`, interceptors, and
event handlers — all of which change *behavior*. None of them change *grammar*. That half of the
original feedback has, until now, gone unanswered.

### The Inform 7 precedent — the bar the feedback is measured against

The author who raised this writes Inform 7, and named it as the comparison ("one of the things that
makes Inform 7 so popular and accessible"). Owner statement of the I7 model, 2026-07-25:

> *"In Inform, the author can add grammar that extends the stdlib. If the author wants to alter the
> stdlib, they edit the internal import file that has the stdlib grammar defs. Inform 7 allows you to
> change everything, order definitions, and actions are 100% malleable."*

Two distinct levels, plus ordering:

| I7 capability | mechanism | Chord today |
| --- | --- | --- |
| **extend** — new verb onto an existing standard action | `Understand "snag [something]" as taking` | Gap 3(b) — `define verb` supports one hardcoded mapping |
| **alter** — change the standard grammar itself | edit the Standard Rules source, which ships readable and editable | Gap 3(c) — no surface; no per-rule removal exists in the engine |
| **order** — control which definition wins | explicit rule ordering / listing before | Gap 2 — priority has no Chord notation at all |

The alteration row is the one that reached back into this ADR's own decisions. In I7, "the library in
readable form" and "the thing you edit to change the library" are **the same artifact**. This ADR's
earlier drafts made them deliberately different — the Chord rendering was reference-only, marked, and
refused by the loader.

That was a defensible call while the rendering was documentation. Against the I7 bar it is the central
design question, and it is not the question ADR-265 thought it was answering. **D1 resolves it in I7's
favour**; the reference-only stance is reversed in D6.

The objection ADR-265 raised against "stdlib in Chord" (option B — layering inversion, four-phase
plumbing dragged into the author language) does not apply here: what moves is grammar, and per D8
grammar definitions are dual-surface while traits and behaviors are not. A loadable Chord grammar naming
`if.action.taking` moves no implementation anywhere.

The ordering row settled priority's status: I7 authors control definition order, so priority is
author-facing information, not an engine detail to be omitted (D12′, and ADR-268's brief).

## Decision

### D1 — The standard grammar's Chord form is the editable source (option iv)

The Inform 7 model is adopted: **the readable form and the editable form are one artifact.** The
standard grammar exists as Chord, it loads, and an author can alter it — the same relationship an I7
author has with the Standard Rules. It is not a reference, not a projection, and not marked
reference-only.

This is coherent because **grammar is separable from the rest of stdlib in the way behavior is not.**
Grammar is a declaration table mapping patterns to action ids. A Chord file mapping `take :item` to
`if.action.taking` moves no implementation anywhere — the four-phase lifecycle, interceptor ordering,
and ADR-228 slot consultation that made ADR-265 reject "stdlib in Chord" all live in the actions, which
stay TypeScript. What ADR-265 rejected as option B was *stdlib actions* in Chord. This is not that.

Consequences that ripple through the rest of this ADR, stated once here:

- **Gap 2 becomes a prerequisite, not a backlog.** A Chord grammar that cannot express 19 alternations,
  15 typed slots, and 154 semantic defaults cannot be the source those rules load from. Governed
  deferral is replaced by D12′: the constructs are *required*, and D5's gap report is the work list.
- **The reference-only apparatus is deleted, not relaxed.** D6 inverts: the artifact must parse, must
  load, and the loader must *accept* it. ADR-265's marker, loader refusal, and missing-marker build
  error all go.
- **The drift check inverts.** Nothing can drift from `grammar.ts` once `grammar.ts` is no longer the
  source. D7 retires it; the source-of-truth migration is Q-12, ADR-269's.
- **Priority becomes author-facing.** I7 authors order definitions; ordering is part of the bar, so
  Chord needs a notation for it (ADR-268).

### D1a — The three gaps are now sequenced work, not findings

Gap 1 (compiler drops what Chord says), Gap 2 (language surface narrower than the builder), and Gap 3
(author cannot modify standard grammar) stop being an audit and become the implementation path. Gap 2
gates D1; Gap 3(b)/(c) are *answered by* D1 — once the grammar is editable Chord, "add a synonym to
`taking`" is editing a line, and `define verb`'s hardcoded `KNOWN` table (D13) is largely obviated.

### D2 — The ADR-265 set is replaced in full

`docs/reference/stdlib-chord/` (56 `.story` files + `README.md`) and
`scripts/generate-stdlib-chord.js` are retired. Nothing from the old set is salvaged. *Deletion is a
separate step taken at implementation time with explicit confirmation — this ADR records the decision,
not the `rm`.*

### D3 — The migration generator reads the grammar rule table, at both builder shapes

The generator that produces the initial Chord source (D7) reads the rules registered by `defineGrammar`
through the `GrammarBuilder` / `GrammarEngine` (`if-domain/src/grammar/`) — not ADR-228 descriptors and
not `*-messages.ts`. Until the migration completes, the source of truth for "what grammar exists" is the
grammar itself; afterwards it is the Chord file (D1).

It must capture **both** definition shapes, not just the flattened output. A rule authored as
`.forAction(id).verbs(['examine','x','inspect',…]).pattern(':target')` becomes one Chord `define action`
with a grammar block of one line per verb — preserving the action-centric grouping, because that
grouping is what maps cleanly onto Chord. Emitting only the post-expansion pattern list would lose it.
Slot typing, semantic defaults, scope constraints, and priority are read from each rule; any the target
syntax cannot yet carry are counted in D5's gap report rather than dropped.

### D3a — Both halves are delivered, in two different homes

| half | content | home |
| --- | --- | --- |
| **capability** | what grammar definition can express — pattern lines, `:slot`s, `→` cardinality, scope constraints, refusal ladder, plus the Sharpee builder surface behind it | the existing **`define action` page**, `website/src/app/chord/guide/vocabulary/define-action/` |
| **instances** | the standard library's grammar, action by action, as `define action` blocks | the **standard library section**, `website/src/app/chord/stdlib/` |

The capability half is prose-plus-examples, hand-maintained like the rest of the vocabulary guide.

The instances half is **derived from the Chord grammar source**, not from `grammar.ts` — after ADR-269
the source *is* Chord, so the stdlib page renders the shipped grammar rather than a translation of it.
There is no drift check in the ADR-265 sense (D7 retired it); what replaces it is simple derivation from
the one artifact that exists. Before ADR-269 lands there is nothing to derive from, which is why ADR-272
sequences last.

The `define action` page **already exists** (56 lines) and teaches the Chord side well: a worked
`petting` example covering `grammar`/`:slot`/`→` cardinality, `must be reachable`, `score`, the three
refusal forms, body statements, and the embedded `phrases` block, then a line-by-line reading and the
action-plus-trait relationship. What it lacks is the capability framing — what grammar definition can
express beyond that example. This is an expansion of a good page, not a new one. **Its claim that the
parser enforces `must be reachable` must be corrected or made true (D11) before anything else on that
page is edited.**

### D3b — The capability page is Chord-only

The expansion is written **entirely in Chord terms**. The page does not name `extendParser`,
`GrammarBuilder`, priority values, or the three-layer picture, and does not position `define action` as
an equivalent of anything in TypeScript. An author reading it learns what Chord grammar definition can
express, full stop — the same voice the page already uses when it relates `define action` to
`define trait` without naming stdlib internals.

This means the Gap 2 table is **not** author-facing. It lives in this ADR and in D5's gap report, as
input to language decisions (D12) — not as a "here is what Chord can't do" section on a page meant to
teach the language. Relating Chord to the platform is a separate, optional artifact if a need for one
ever appears; no such artifact is specified here.

### D4 — The output is real Chord an author could have written

The emitted source uses the `define action` / `grammar` block notation (`chord.ebnf:399-408`, as amended
by D15 and ADR-267). Since it *is* the shipped grammar under (iv), "reads as Chord an author could
plausibly have written" is not a stylistic preference — it is the artifact an author will open and edit
(ADR-270). Machine-shaped output that happens to parse fails this.

### D5 — The gap report is a migration instrument, not an output annotation

Under (iv) a rule Chord cannot express is a rule that **cannot load** — so there is no such thing as a
gap marker in the shipped source. Annotating output was the reference-era design and is deleted with the
rest of it (D6).

What survives is the **gap report**: the generator, run against today's `grammar.ts`, enumerates every
rule whose constructs Chord does not yet have, with counts by construct. It is the work list that D12′
turns into required language changes, and the completion test for them — when the report is empty, the
Chord source can express the standard grammar and the migration can proceed. Parity is *counted*, not
asserted.

Its two sections stay distinct: rules the standard grammar has that Chord cannot write (blocking), and
builder capabilities nothing currently exercises (not blocking) — so "Chord lacks a word for this" is
never confused with "the standard grammar never needed it."

**Consequence:** the report's lifetime is the migration's. Once ADR-269 lands, `grammar.ts` is no longer
the source and there is nothing left to compare against; the generator and its report retire together
(D7).

### D6 — The artifact loads (reverses ADR-265)

The standard grammar's Chord form **must parse and must load**. ADR-265's entire reference-only
apparatus is deleted, not relaxed: no `reference-only:` flag, no banner marker, no loader refusal, no
missing-marker build error, no `create the Void` scaffolding. The loader's job changes from refusing
this artifact to consuming it.

Grammar files are not stories and must not need story scaffolding to be valid — a standard-grammar
Chord file declares grammar and nothing else. Whether that is a distinct file kind with its own
top-level form, or a `.story` containing only `define action` blocks, is Q-13.

### D7 — Generation is a migration step, not a standing pipeline

The generator (D3) still runs, but its role changes: it produces the *initial* Chord grammar from
today's `grammar.ts` so the migration is mechanical rather than hand-transcribed. Once the Chord form
is the source, there is nothing for a drift check to compare — the direction of truth has reversed.
What replaces it (delete `grammar.ts`, or keep it generated *from* Chord for the TS build) is Q-12.

### D8 — The boundary: grammar definitions ↔ traits and behaviors

The line this ADR and every child rests on, in the owner's words (2026-07-25):

> **grammar defs (Chord or Sharpee) ↔ Traits/Behaviors (Sharpee)**

Read precisely:

- **Grammar definitions are dual-surface.** Patterns, verbs, slots, slot typing, ordering, and scope
  constraints may be authored in **either** Chord or TypeScript. Neither is privileged; a Chord grammar
  def and a `GrammarBuilder` call are two spellings of the same thing. This is what makes (iv)
  coherent — the standard grammar moving to Chord is a change of spelling, not of layer.
- **Traits and behaviors are Sharpee-only.** The trait system, behaviors, capability dispatch
  (ADR-090), and the four-phase action lifecycle stay TypeScript. Nothing in this ADR family moves any
  of it, and no Chord construct introduced by a child may define a trait or a behavior.

**Backward compatibility — the story-grammar layer is untouched.** Only the *standard* grammar migrates.
`Story.extendParser(parser)` and `parser.getStoryGrammar(): GrammarBuilder` keep their current
signatures and full capability (ADR-084); an existing TypeScript story that registers grammar continues
to work unchanged, and Chord-authored `define action` grammar keeps compiling to the same story-grammar
layer. What changes is where the *standard* rules come from, not how a story adds its own. ADR-269 must
verify this rather than assume it — the existing TS stories (`stories/thealderman`, the devkit fixture)
are the regression set.

An earlier draft framed this as "grammar is a declaration table, not behavior," and worried at two
edges — `.where()` scope constraints (parse-time gating) and typed slots (`.instrument()`, `.topic()`,
which change how a slot resolves). Under the correct line neither is an edge case: **both are grammar
definitions**, so both are authorable in either surface. The declaration-table framing was drawing the
line in the wrong place — at "does it do anything," rather than at "what kind of thing is it."

**Reference is not definition.** A grammar def may *name* a trait as a scope filter —
`ScopeBuilder.hasTrait(traitType)` and `.matching({portable: true})` do exactly that — without defining
it. Naming a trait from grammar stays on the grammar side of the line; defining one does not. Any child
introducing a Chord scope-constraint surface must preserve that asymmetry: Chord grammar may filter on
a trait, and may never declare one.

### D9 — The instances half slots into the existing standard-library reference

`website/src/app/chord/stdlib/reference/content.mdx` (1513 lines) already documents every standard
action with its verbs in the heading, group/slots/emitted events, the message-alias table, and a
"Change it" line — **the entire payload ADR-265 generated into 56 `.story` files already exists here as
web pages.** So the instances half is an *addition to* these entries — a `define action` grammar block
per action, derived from the shipped Chord source (D3a) — not a new parallel artifact. Existing content
stays.

### D10 — The compiler passes through everything Chord already expresses

`story-loader`'s Chord→grammar path must stop discarding what the language already says. At minimum:

- **Scope constraints** reach `.where(slot, scope)` with the `ScopeBuilder` predicate the requirement
  word names (`reachable` → `touchable()`, `visible` → `visible()`, `held` → `carried()`), or, if a
  requirement has no builder counterpart, fail at compile with a named diagnostic rather than parsing
  into silence.
- **Action-centric emission**: a Chord `define action` with multiple grammar lines is one action owning
  its patterns — the `.forAction()` shape — not N unrelated `.define()` calls.

No new Chord syntax is involved. This is wiring the language's existing words to the builder that has
always accepted them.

### D11 — The dropped scope constraint is a defect, fixed under this ADR

`IRActionDef.constraints` is populated and never read. Both halves are wrong and both are in scope
here: the constraint must take effect, **and** the analyzer must validate the requirement word against
the closed set of supported predicates instead of accepting any word (`analyzer.ts:1242` checks only
the slot name). Until it takes effect, the `define action` page's claim that the parser enforces it is
false and must not be repeated.

### D12′ — Gap 2's constructs are required, and gate D1

Under (iv) the Gap 2 table is no longer a shortlist to consider — it is the set of constructs Chord
**must** gain before the standard grammar can be expressed in it at all. Every one still goes through
`docs/architecture/chord-grammar-changes.md` with owner approval and an ADR-257 bump; what changes is
that deferring one now means the migration cannot complete, not that a reference reads less well.

Minimum set, sized by **registered rules** (422 total) rather than call sites:

| construct | rules | why it is load-bearing |
| --- | --- | --- |
| semantic defaults | **154** | carries `direction` to going and `position` to hiding via `extras`; without it `go north` cannot tell the action which way |
| direction map | **120** (subset of above) | the going × direction cross-product; pairs with semantic defaults to collapse 120 rules into ~12 lines |
| ordering | **106** deviating | the I7 "order definitions" bar; 316 of 422 sit at the default, so most rules need no notation at all |
| alternation | 19 | `look in\|inside :target` cannot be split without changing rule count and ordering behavior |
| typed slots | 15 | narrowed to two types — `instrument` (10) and `topic` (5); the other nine are unused |
| optional words | 3 | `look [carefully] at :target` |
| greedy slot | (ADR-080) | raw-text slots; missing from earlier drafts entirely |
| ~~verb-list shorthand~~ | — | **dropped** — Chord's one-line-per-verb longhand needs no language change and reads better |

Two corrections against earlier drafts, both from the call-site error above: semantic defaults were
listed smallest and possibly droppable when they are the **largest and non-negotiable**, and verb-list
shorthand was listed required when it needs nothing. `docs/work/grammar-parity/` carries the analysis.

**Design note binding ADR-267:** semantic defaults and the direction map must be designed *together*.
120 of the 154 semantic-default rules are the same cross-product, and one `directions` block carrying
aliases and their semantic direction collapses all of them. Designed separately, the win is missed.

Q-8 becomes an ordering question over required work rather than a promote/defer question.

### D13 — `define verb` is a defect: the docs promise a capability the loader does not have

`define verb` either becomes general — mapping any documented pattern onto the stdlib action that
already implements it — or its documentation stops promising that it does. Shipping a page whose second
example is a hard `LoadError` is not a third option. The `KNOWN = { 'put on': 'PUT_ON' }` table is the
same "compiles but cannot work" class as D11's dropped constraint (ADR-235 D2), one layer up: here it
does not even compile, it dies at load, after the author followed the documentation exactly.

Which resolution — implement it generally, or narrow the documentation to what works — is ADR-271's
Q-10, though D14's sequencing note recommends narrowing: the general version needs a verb→action-id
resolution path Chord does not currently have (`PUT_ON` is a hardcoded stdlib constant, not derived from
an action name), and (iv) makes that path redundant once grammar is editable.

### D14 — This is an umbrella ADR; the work lands in named children

Per the project's ADR-first convention, an umbrella records the direction and constraints and is
**never implemented directly** — each child carries its own design, open questions, and acceptance.
This ADR owns: the (iv) direction (D1), the actions-stay-TypeScript boundary (D8), Gap 2 as a
prerequisite rather than a backlog (D12′), and the sequencing below. Everything else devolves.

**Child roster** (numbers reserved; each to be written before its phase begins):

| child | scope | carries |
| --- | --- | --- |
| **ADR-267 — Chord grammar pattern constructs** | slot spelling (D15, ruled — lands here), alternation, optional words, greedy slot, typed slots, semantic defaults + direction map (designed together) | Q-8 (ordering of the construct work) |
| **ADR-268 — Chord grammar rule ordering** | the seventh and largest construct: how 150 `.withPriority(n)` rules are expressed — numeric, relational, or specificity-with-override | Q-7 |
| **ADR-269 — The standard grammar as Chord source** | file kind, load path, `grammar.ts`'s fate, migration equivalence, startup cost | Q-12, Q-13, Q-16 |
| **ADR-270 — The author alteration model** | edit-vs-override, removal semantics for a standard verb, upgrade behavior | Q-14, Gap 3(c) |
| **ADR-271 — Chord grammar compiler pass-through and defects** | D10 (scope constraints reach `.where()`, action-centric emission), D11 (dropped constraint + analyzer validation), D13 (`define verb`) | Q-10 |
| **ADR-272 — Grammar documentation surfaces** | D3a/D3b capability page, D9 stdlib section grammar blocks, the docs-examples-load test | Q-5 |

**Sequencing.** ADR-271 ships **first and independently**: its three defects are live
today, harm authors now, and require none of (iv). It is also the only child that can land before the
language work without rework. ADR-267/268 follow — Chord cannot host the standard grammar until it can
express it. ADR-269 then performs the migration, ADR-270 makes it alterable, ADR-272 documents the
result. ADR-272's capability-page content is written against whatever 267/268 land, so it cannot
precede them.

The one ordering risk worth naming: ADR-271 fixes `define verb` (D13), and ADR-270's override model may
obviate it (once grammar is editable, aliasing is editing a line). ADR-271 should therefore resolve D13
by the cheaper route — narrowing the documentation to what works — and leave general aliasing to
ADR-270, rather than building a verb→action-id resolution path that (iv) makes redundant.

### D15 — Chord slots are written `the <name>` (owner ruling, 2026-07-25)

The first construct decision under this umbrella, ruled directly because it fixes the spelling of every
other pattern construct the children design.

Chord today marks a slot **two different ways**: `define verb` uses parens
(`pattern = { WORD | "(" WORD ")" }`, `chord.ebnf:372`) and `define action`'s grammar block uses a colon
(`pattern-line = ( WORD | ":" WORD )+`, `chord.ebnf:408`). The colon form is imported — it is Sharpee's
pattern-string syntax carried into `define action`, and the only place in Chord where a leading colon
means anything. Within a single block the same slot appears three ways: `pet :animal`,
`the animal must be reachable`, `refuse without animal:`.

**Ruled: the definite article.** Slots in patterns are written `the <name>`; the colon and the parens
are both removed, and the two constructs converge on one production.

```chord
define action petting
  grammar
    pet the animal
    pat the animal
  the animal must be reachable
  refuse without animal: pet-what
```

Three spellings collapse to one. Parens were rejected: they would have unified `define verb` and
`define action` while leaving the pattern spelling different from how the same slot is named on every
other line of the block.

Notes binding ADR-267, which lands this: the slot *name* stays bare where it is already bare
(`refuse without`, phrase interpolation) — `the animal` is the spelling **in a pattern**, not a rename;
the EBNF change is a *simplification* (two productions become one), not an addition; and a **literal
`the` in a pattern becomes unwriteable**, which must be confirmed harmless against all 422 rules before
implementation rather than assumed. The `chord-grammar-changes.md` row and ADR-257 bump are owed with
ADR-267.

**Consequence — the slot-name namespace becomes author-visible.** The standard grammar uses **17
distinct slot names** across its 422 rules: `target` (112), `item` (62), `recipient` (17), `device`
(14), `container` (10), `door` (8), `portal` (7), `topic` (5), `tool` (4), `weapon` (4), `vehicle` (4),
`key` (2), `supporter` (2), `hook`, `object`, `location`, `destination` (1 each). Nine are names a story
would plausibly give a real object.

D15 does **not** create a naming conflict — slot and entity names already shared the `the <name>`
referring syntax (`the animal must be reachable` is today's Chord), and D15 changes only the *pattern*
spelling, not resolution. Verified behavior (`analyzer.ts:3149-3193`), stated so no child re-derives it:

- **Slots are scoped; there is no external conflict.** `scope.slots` is per-action and `null` outside an
  action or trait clause, so story-level code never consults slot names.
- **Slots shadow entities, single-word only.** The slot wins (`:3156`, before `resolveEntityId`), but
  only for single-word references (`:3155`) — `the brass key` never reaches the slot path.
- **The shadow is silent.** No diagnostic exists for it.

So ADR-267's obligation is narrow: decide whether the silent shadow warrants a warning (slot-first
resolution itself is correct and should not change), and publish the 17 names on the `define action`
page. An author-facing escape hatch — renaming entities to `target-thing` and the like — was considered
and is **not** needed, given the scoping and single-word limits.

Secondary effect: this improves the odds for spelling alternation as `or`
(`look in or inside the target`). Bare `or` was previously ambiguous against a literal `or`; with slots
marked by `the`, pattern-line structure is clearer, and `or` already means alternation in
`define verb hang or hook`. ADR-267 should test that spelling first.

## Acceptance — allocated to children

An umbrella is never implemented directly (D14), so it cannot itself be "accepted" by test. What follows
is the **full acceptance set for the programme**, each item tagged with the child that owes it. A child
is not ACCEPTED until its tagged items pass. The umbrella is accepted when the direction, boundary, and
allocation below are agreed — not when any of these pass.

**ADR-271 — compiler pass-through and defects** (ships first, independent of (iv))

1. **A Chord story whose `define action` declares `the <slot> must be <requirement>` is parse-time gated
   by it** — a transcript test shows a command refused for scope that previously resolved. *(D10, D11)*
2. **An unsupported requirement word is a compile error** with a named diagnostic and a fix-it listing
   the supported predicates — not a silently accepted no-op. *(D11)*
3. The Chord compiler emits action-centric grammar (`.forAction()`) for multi-pattern actions, and a
   test asserts the emitted rule **shape**, not just that the verbs parse. *(D10)*
4. **No published Chord example fails to load.** Every code sample on the `define verb` and
   `define action` pages loads and runs — verified by a test that executes the documentation's examples,
   not by review. (`define verb sniff means smell (something)` is the current counter-example.) *(D13)*
5. `define verb`'s documentation and implementation agree: either the general capability exists, or the
   page describes only what works and names the limit. *(D13, Q-10)*

**ADR-267 / ADR-268 — Chord language constructs**

6. Chord expresses every construct the standard grammar uses (D12′). The completion test is D5's gap
   report reaching **empty** against all 422 rules — no rule requires an approximation.
7. Slots are written `the <name>`; `define verb`'s parens and `define action`'s colon are both gone, and
   the two EBNF productions have converged. No rule in the 422 requires a literal `the`. *(D15)*
8. Each construct landed carries its own `chord-grammar-changes.md` row and ADR-257 bump. *(D12′)*

**ADR-269 — the standard grammar as Chord source**

9. The initial Chord grammar is produced from `grammar.ts` mechanically, and verified **equivalent**:
   every rule the TS builder registers is registered by the Chord source — compared against the measured
   baseline of **422 rules across 56 actions**, by count and shape, not by eyeball.
10. **The Chord form loads and drives the parser.** A stock story with no custom grammar parses every
    command it parses today, verified by the existing transcript suites passing unchanged.
11. Existing TypeScript stories are unaffected: `extendParser` / `getStoryGrammar` keep their signatures
    and capability, and `stories/thealderman` plus the devkit fixture pass unchanged. *(D8)*
12. No **action** implementation moves into Chord: every `if.action.*` remains TypeScript, and the Chord
    grammar names action ids without defining behavior. *(D8)*
13. No reference-only marker, loader refusal, or missing-marker build error exists anywhere; ADR-265's
    enforcement design is gone rather than disabled. *(D6)*
14. `docs/reference/stdlib-chord/` and `scripts/generate-stdlib-chord.js` are gone; no reference to them
    remains in docs or build scripts. *(D2)*

**ADR-270 — the author alteration model**

15. **An author can alter the standard grammar and see the alteration take effect** — a transcript test
    in which a story removes a standard verb, adds a synonym to a standard action, and reorders two
    competing rules, each observably changing what parses. This is the I7 bar made assertable.

**ADR-272 — documentation surfaces**

16. The `define action` page gains the capability framing, written in Chord terms only — no
    `extendParser`, no `GrammarBuilder`, no priority values, no Sharpee-comparison section. Its worked
    example and line-by-line reading are kept, and the 17 standard slot names are published. *(D3b, D15)*
17. Every standard action's entry in `stdlib/reference/content.mdx` carries its `define action` grammar
    block, derived from the shipped Chord source; nothing existing is removed. *(D9)*

## Consequences

**Gained.** The artifact the author asked for, in the notation authors write. A counted, per-construct
parity measurement between Chord's grammar surface and Sharpee's builder — evidence for language
decisions instead of speculation. Two live defects surfaced and closed: a taught Chord construct that
compiled to nothing now takes effect with unsupported requirement words rejected at compile (D11), and
a documented surface whose own published example fails to load stops being both (D13). And an honest
answer to the first clause of the original feedback — what a Chord author can and cannot change about
the standard grammar — which no artifact has previously stated.

**Lost / cost.** This is now a substantial platform program, not a documentation task. Seven Chord
language constructs (D12′), each an EBNF change with an ADR-257 bump; a loader that consumes grammar
rather than refusing it; a source-of-truth migration for `parser-en-us`'s central file (Q-12); a new
file kind (Q-13); an override model (Q-14). Standard grammar becomes load-time data, with whatever
startup cost that carries. ADR-265's generator and 56-file output are discarded, and so is most of the
enforcement design this ADR's own earlier draft retained from it. Risk concentrates in one place: the
standard grammar is the thing every story depends on, so the migration's equivalence check (Acceptance
5) is the load-bearing test of the whole effort.

**Rejected.** Keeping ADR-265's set. Reference-only status for the Chord grammar (its own earlier
draft's D6 — reversed by owner direction toward the I7 model). Raising `extendParser` — investigated and
found already at full capability (ADR-084), so there is nothing to raise. The three alternatives to (iv)
considered when Gap 3 was ruled: leaving shadowing as the only answer, making shadowing inherit stdlib
behavior, and adding explicit grammar-editing constructs — all rejected in favor of (iv), which subsumes
what they were reaching for.

**Discovered while siting the two halves (2026-07-25).** `stdlib/reference/content.mdx` already publishes
everything ADR-265's 56 files contained. ADR-265 did not merely answer the wrong question; it
regenerated existing documentation into a second format and wrapped it in a fake story. This makes D2's
replacement lossless — nothing in the retired set is unique to it.

**Not addressed.** Whether any Gap 2 construct *should* be added to Chord (Q-8 shortlists; the ruling is
separate). Extension grammar (ADR-215). Whether the standard grammar should itself start using the
builder capabilities it leaves unused.

## Devolved Questions — held for the children

*The umbrella has no Open Questions section: every question raised under it is resolved or devolved, so
it carries no open decisions of its own.*

> **Devolved to children (D14).** These were raised and refined under this ADR and are carried, verbatim
> in intent, by the child that owns them. They are **not** open questions of the umbrella and do not
> block its acceptance: Q-5 → ADR-272 · Q-7 → ADR-268 · Q-8 → ADR-267 · Q-10 → ADR-271 ·
> Q-12, Q-13, Q-16 → ADR-269 · Q-14 → ADR-270. Each child must restate its inherited questions in its
> own Open Questions section before that child can be ACCEPTED. Their text is retained below until the
> children are written, so nothing is lost in the hand-off.

### Q-5: How does the derived grammar block reach the standard-library page?
- **Why it matters**: D9 puts derived content inside hand-maintained MDX (`stdlib/reference/content.mdx`,
  1513 lines). After ADR-269 the content is derived from the shipped Chord grammar — so the question is
  purely mechanical: a fenced region the tooling owns, per-action fragments the MDX imports, or a
  separate derived page the stdlib section links to. The third abandons D9's "in place."
- **Blocks**: ADR-272's output mechanism. Note this is no longer a drift-check question — D7 retired the
  drift check, and derivation from a single source cannot drift.

### Q-7: What notation does Chord get for ordering?
- **Why it matters**: priority is author-facing, because "order definitions" is part of the I7 bar D1
  adopts. But `.withPriority(n)` is a bare integer, and transcribing raw numbers into Chord would import
  an engine detail as author syntax. Only **106 of 422 rules deviate** from the default, so most need no
  notation at all. I7 orders by *relation* ("listed
  before"), not by number. Options: numeric priority as-is; relational ordering between named rules;
  or implicit ordering by specificity with an explicit override only where needed.
- **Blocks**: D12′'s priority row — 106 deviating rules, and the construct most likely to make or break
  readability of the migrated source. The 37 rules at priority 90 are abbreviations (`n`, `x`, `i`),
  *shorter* than what they outrank, so pure token-count specificity would order them backwards.

### Q-8: In what order do D12′'s required constructs land?
- **Why it matters**: D12′ makes all of them required — the promote/defer question is closed — but they
  differ in size and coupling, and ADR-267 has to sequence them. Semantic defaults (154 rules) and the
  direction map (120, a subset) must be designed together or the collapse is missed. Typed slots (15)
  narrow to two types. Alternation (19), optional words (3), and the greedy slot are small and
  independent. Slot spelling (D15) is ruled and lands first because it fixes the others' spelling.
  Ordering (106 deviating rules) is ADR-268's, not ADR-267's.
- **Blocks**: ADR-267's phase order; whether the semantic-defaults/direction-map pairing is preserved.

### Q-10: How is `define verb` resolved — implement generally, or narrow the docs?
- **Why it matters**: D13 forbids the status quo but does not pick. Implementing it generally needs a
  verb→action-id resolution path Chord lacks (`PUT_ON` is a hardcoded stdlib constant; there is no
  derivation from an action name), plus a decision about what happens when the named pattern does not
  exist in the standard grammar. Narrowing the docs is cheap and honest but leaves Gap 3(b) open, which
  means the only way to reuse a stdlib action under a new verb stays "you can't."
- **Blocks**: D13's resolution; whether Gap 3(b) closes under this ADR or is deferred.

### Q-12: Does `grammar.ts` survive the migration, and in what form?
- **Why it matters**: once Chord is the source, `grammar.ts` is either deleted (the parser loads Chord
  grammar at startup), kept but *generated from* Chord at build time (the TS build keeps a compiled
  artifact, no runtime Chord parse), or kept as a fallback. This is the load-path and startup-cost
  decision: parsing the standard grammar as Chord on every game boot is real work the bundle does not
  do today. It also decides whether `parser-en-us` gains a dependency on the Chord compiler.
- **Blocks**: D7's replacement; the build pipeline; startup performance.

### Q-13: What file kind is a standard-grammar Chord file?
- **Why it matters**: D6 says grammar files must not need story scaffolding. Is the standard grammar a
  `.story` containing only `define action` blocks, a distinct file kind with its own top-level form
  (`grammar "standard" …`), or a new `.chord`-class artifact? Affects the EBNF, the loader's entry
  points, and how an author's *override* file is distinguished from the base.
- **Blocks**: D6's second paragraph; the EBNF change; ADR-257's version bump scope.

### Q-14: How does an author's alteration compose with the base — edit, or override?
- **Why it matters**: I7 has both (edit the Standard Rules; or write your own definitions that win).
  Editing a shipped file is fragile across upgrades; an override layer keeps the base pristine but needs
  removal semantics (Gap 3(c) — how do you *delete* a standard verb from an override file?). This is the
  single most consequential unresolved design point under (iv), and it is what "alter the stdlib" will
  actually mean in practice for a Chord author.
- **Blocks**: Acceptance 4b; Gap 3(c)'s resolution; the shape of the author-facing story.

### Q-16: What about locales other than en-US?
- **Why it matters**: `grammar.ts` is `parser-en-us`. If the standard grammar becomes Chord, either each
  locale ships its own Chord grammar file (and Chord's keywords are English while its content is not),
  or the mechanism is en-US-only and other locales keep the TS path — a split that would undo the
  single-source property (iv) is adopted for.
- **Blocks**: whether (iv) generalizes or is an en-US-specific decision; interacts with Q-12.


## Session

Session of 2026-07-25 (75452d). ADR-265 was read back in full, its generated artifact inspected, and
the owner corrected the premise three times, each correction widening the scope.

**First**: the request was for the **grammar** in Chord, not the stdlib actions — which changed the
generator's source, the output notation, the scope (parser-en-us, not stdlib), and the deliverable's
value. Ruling: supersede ADR-265, replace the whole set.

**Second**: grammar can be defined **by action**, not only by pattern, so treating `grammar.ts` as "the
grammar capability" undercounted it. Added the three definition layers, both builder shapes, and the
typed-slot / semantics / scope API the standard grammar mostly leaves unused. A draft claim that
Chord's `must be reachable` had no Sharpee counterpart was wrong and was corrected —
`ScopeBuilder.touchable()` is that counterpart.

**Third**: the owner expected `extendParser` to be raised to 100% of the grammar capability.
Investigation showed it is *already* there (ADR-084 removed the narrowing wrapper), which relocated the
entire parity gap to the Chord side and split it in two — a compiler that discards what Chord already
says, and a language surface narrower than the builder. Tracing the first turned up a live defect:
`the animal must be reachable` parses, analyzes, reaches the IR, and is read by nothing, while the
author-facing page states the parser enforces it. Ruling: *"widen — it's all about grammar and Chord
parity."* The ADR was renamed from `adr-266-standard-grammar-readable-chord-form.md` accordingly, and
D10/D11 make it a platform-change ADR rather than a documentation one.

**Fourth**: *"can a Chord author replace existing stdlib grammar?"* — asked once the rendering's shape
settled, and the answer turned out to be the first clause of the original feedback, still unanswered.
Verified by execution rather than code reading (`--exec` against `dist/cli/sharpee.js`): shadowing works
but redirects to a different action id, so re-grammaring a standard action costs its implementation;
`define verb` — the surface for reusing a stdlib action under a new verb — supports exactly one
hardcoded mapping, and the **second example on its own published documentation page fails to load**.
Nothing anywhere can remove or narrow a standard rule. This became Gap 3, D13, and Q-10/Q-11.

**Fifth**: the owner supplied the Inform 7 model as the bar — extend in-language, alter by editing the
stdlib grammar defs, order definitions, actions fully malleable — and then ruled **(iv) is the
direction**. That converted the ADR from "render the grammar readable and measure the gap" into "the
readable Chord grammar *is* the source." Its own D6 (reference-only), D7 (drift check), and D12
(governed deferral) were reversed in the same pass; Gap 2 became a prerequisite; Q-3 and Q-6 resolved as
consequences (it must parse; priority is author-facing). The decisive observation that made (iv)
coherent rather than a re-run of ADR-265's rejected option B: **grammar is a declaration table, not
behavior** — a Chord file naming `if.action.taking` moves no lifecycle, interceptor, or slot-consultation
machinery into the author language, because all of it lives in the action, which stays TypeScript.

**Sixth**: ruled an **umbrella with children**. Six children reserved (ADR-267 through ADR-272), the
remaining open questions devolved to their owners, and one kept here — Q-15, the "grammar is a declaration table,
not behavior" boundary, because every child inherits it as a premise. Sequencing puts ADR-271 (the three
live defects) first and independent of (iv), since it helps authors now and needs none of the language
work.

**Seventh**: the owner drew the boundary — **grammar defs (Chord or Sharpee) ↔ Traits/Behaviors
(Sharpee)** — replacing the draft's "declaration table, not behavior" framing. The correction is
substantive, not cosmetic: the draft line was drawn at *does it do anything*, which made `.where()`
scope constraints and typed slots look like edge cases needing adjudication; the correct line is drawn
at *what kind of thing is it*, under which both are plainly grammar definitions and neither is an edge
at all. It also states the property that makes (iv) coherent — grammar definitions are **dual-surface**,
Chord and Sharpee equally, so migrating the standard grammar to Chord changes spelling, not layer. D8
was rewritten around it and Q-15 dissolved.

**Eighth**: with the umbrella settled, the owner asked for a complete detailing of both surfaces before
nailing it down — written to `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md`. Producing it
turned up a **counting error** running through every earlier draft: the Gap 2 and D12′ tables were sized
from *call sites in `grammar.ts`*, not registered rules. Measured against a real engine, the standard
grammar is **422 rules across 56 actions**, and two entries were badly wrong — semantic defaults are 154
rules (not 2) and are how `direction`/`position` reach the going and hiding actions, so the draft's
"possibly droppable" was backwards; priority affects 106 deviating rules (not 150), since 316 sit at the
default. Verb-list shorthand dropped out of the required set entirely, the greedy slot was found missing
from it, and semantic defaults + direction map turned out to be the same 120-rule cross-product and must
be designed together.

The owner then ruled the first construct directly — **slots are written `the <name>`** (D15) — after
observing Chord does not need the colon. That surfaced an existing internal inconsistency: `define verb`
already spelled slots with parens while `define action` used a colon, so Chord carried two notations for
one concept, three counting how the same slot is named elsewhere in the block.

**Method note.** Three of this session's four corrections were premise errors made from one-sided code
reads — the ADR-265 misread, treating `grammar.ts` as the whole capability, and assuming `extendParser`
was reduced. A fourth near-miss (claiming the `define action` page did not exist) came from searching two
of three plausible directories. Gap 3's findings were therefore established by running the loader in
both directions — the working example and the failing one — before being written down.
