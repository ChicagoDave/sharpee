# ADR-271: Chord grammar compiler pass-through and defects

## Status: ACCEPTED (2026-07-25) — first child of ADR-266 (D14). Ships **first and independently**: none of its work depends on direction (iv), and its three defects harm Chord authors today. Carries the umbrella's D10 (compiler pass-through), D11 (dropped scope constraint + analyzer validation), and D13 (`define verb`). Inherited Q-10 was resolved by owner ruling (2026-07-25, interview): narrow the docs (D4). No open questions remain.

## Parent: ADR-266 (umbrella — grammar definition parity). Relates to ADR-087 (action-centric grammar; the `.forAction()` shape D3 emits), ADR-084 (`getStoryGrammar()` returns the full builder — the surface this ADR finally uses), ADR-231 D2a (`.where()` scope constraints are the one parse-time gating mechanism), ADR-235 D2 (the "compiles but cannot work" class both defects belong to), ADR-254 (label keys, incidental), ADR-257 (Chord language version — **not** bumped here, see D1), ADR-270 (the alteration model whose arrival shapes Q-10).

## Date: 2026-07-25

## Context

ADR-266 established that the Chord→grammar compiler discards what the language already says, and that
two author-facing surfaces are defective right now. This child fixes the wiring and the defects. No new
Chord syntax is involved anywhere in this ADR — every construct concerned already parses.

### Defect 1 — the taught scope constraint is silently discarded (D11)

`the animal must be reachable` — taught with a worked example on the published `define action` page —
travels the whole pipeline and is read by nothing:

| stage | what happens | where |
| --- | --- | --- |
| parse | captured as `{slot, requirement}` | `packages/chord/src/parser.ts:2438-2456` |
| analyze | only the **slot name** is checked (`slots.has(constraint.slot)`); the requirement word is never validated | `packages/chord/src/analyzer.ts:1242-1250` |
| IR | carried as `IRActionDef.constraints` | `packages/chord/src/ir.ts:461` |
| load | **no consumer** — `extendParser` never reads the field | `packages/story-loader/src/loader.ts:1102-1137` |

The page states the parser enforces it (*"a precondition on a slot the parser enforces during
resolution"*). It does not. Five constraint lines exist in shipped stories today — `fernhill` (3:
`creature`, `target` ×2) and `friendly-zoo` (2: `animal`) — all no-ops.

Because the requirement word is unvalidated, `the animal must be purple` also parses, analyzes, and
loads without a murmur. The parser's own error hint already gestures at a set — *"Expected a
requirement word (reachable, visible, …)"* (`parser.ts:2452`) — but no set exists anywhere.

### Defect 2 — emission is a flattened fraction of what the builder accepts

`extendParser` emits exactly `.define(text).mapsTo(id).withPriority(150|140).build()` through a
narrowed structural cast that declares only those three methods (`loader.ts:1103-1107`). It never
calls `.forAction()` (ADR-087's action-centric shape), never attaches `.where()`, never types a slot.
A `define action` with four grammar lines becomes four unrelated pattern rules that happen to share an
action id.

The engine side has been ready the whole time: `PatternBuilder.where()` and the `ScopeBuilder`
predicates exist (`packages/if-domain/src/grammar/grammar-builder.ts:135, 77-92`), and
`packages/parser-en-us/src/grammar-scope-resolver.ts` evaluates `touchable`/`carried`/`visible` bases
at match time. The standard grammar has zero `.where()` call sites, and that is by design, not a gap:
stdlib actions refuse on scope in `validate()` (four-phase pattern), while `.where()` is the
parse-time gating mechanism for authored grammar (ADR-231 D2a — the builder's own doc comment draws
this line). The consequence for this ADR is simply that Chord stories will be the scope-gating
path's first production consumer, so the acceptance transcript test doubles as its first
end-to-end probe.

One shape fact constrains D3: `forAction()` is sugar — its `build()` flattens verbs × pattern-templates
into `.define()` calls (`if-domain/src/grammar/grammar-engine.ts:344-415`), and **patterns without
verbs emit nothing** (`:346` requires both lists non-empty). Chord grammar lines are *complete*
patterns (`pet :animal` — verb included), so they do not fit the verbs × templates cross-product as-is.

### Defect 3 — `define verb`'s published page promises a capability the loader does not have (D13)

`toVocabularyVerb` (`loader.ts:2263-2282`) is a Phase A stub: a hardcoded
`KNOWN = { 'put on': 'PUT_ON' }` and a required slot count of 2; everything else throws `LoadError`.
The published page (`website/src/app/chord/guide/vocabulary/define-verb/content.mdx`) teaches it as
general — and its **second example fails to load**, verified by execution (ADR-266):

| example on the page | result |
| --- | --- |
| `define verb hang or hook means put (something) on (something)` | works (this is `cloak.story:82`) |
| `define verb sniff means smell (something)` | `LoadError` |

## Decision

### D1 — A closed requirement-word set, defined once, consumed twice

The scope-constraint requirement words become a closed set owned by the **chord package** and exported
as a single constant:

| requirement word | ScopeBuilder predicate |
| --- | --- |
| `reachable` | `.touchable()` |
| `visible` | `.visible()` |
| `held` | `.carried()` |

- **The analyzer validates against it** (D11's second half): an unsupported word is a compile
  **error** — new diagnostic `analysis.unknown-requirement`, message naming the offending word and
  listing the supported set, with the usual did-you-mean suggestion. `the animal must be purple` stops
  loading into silence.
- **The loader maps over it exhaustively**: the requirement→predicate switch carries a `never` check,
  so adding a word to the set without a loader mapping is a type error, not a silent gap. The two
  consumers cannot drift because there is one table.
- The parser hint at `parser.ts:2452` is rewritten to enumerate the actual set.

**No EBNF change, no ADR-257 bump, no `chord-grammar-changes.md` row.** The production is already
`"the" WORD "must" "be" WORD` (`docs/reference/chord.ebnf:400`); the requirement word stays
syntactically a WORD, and D1 defines its semantic domain — enforcement of a taught construct, not new
syntax. `nearby` has a 1:1 predicate but is excluded: no usage, no documentation; adding it later is
one table row.

### D2 — Constraints reach the parser (D10 first bullet, D11 first half)

For every `define action`, each `the <slot> must be <requirement>` line becomes
`.where(slot, scope => scope.<predicate>())` on **every emitted rule of that action that carries the
slot**. Bare-verb prefix rules (priority 140) carry no slot and take no constraint — the
`refuse without` arm already owns the no-target case.

This makes the `define action` page's enforcement claim **true**, which is the resolution ADR-266 D3a
requires before that page is otherwise edited. No docs correction is needed; the code rises to the
docs.

### D3 — Action-centric emission via a complete-line method on `ActionGrammarBuilder` (D10 second bullet)

`ActionGrammarBuilder` (if-domain) gains one additive method:

```typescript
/** A complete pattern line, verb included (e.g. 'pet :animal'). Not crossed with verbs(). */
fullPattern(pattern: string): ActionGrammarBuilder;
```

`build()` emits full-pattern lines with the action's shared configuration (`.where()` constraints,
priority, and — when ADR-267 lands them — typed slots and semantic defaults) applied to each, with no
verb cross-product. The loader then emits one `forAction('chord.action.<name>')` per `define action`:
its grammar lines as `fullPattern()` calls at priority 150, constraints attached once at the action
level, and the bare-verb prefix rules as today at 140. The narrowed structural cast at
`loader.ts:1103-1107` is retired in favor of the real `GrammarBuilder` surface — the reason for the
narrow cast ("only the three methods the compiler calls") disappears when the compiler grows up to the
builder.

Since `forAction().build()` flattens to registered `GrammarRule`s, the acceptance test asserts the
**registered rule set's shape**: one shared action id across a multi-pattern action, `.where()`
constraints present on the correct slots of every slotted rule, priorities 150/140 — not merely that
the verbs parse.

**Rejected — verb-factoring heuristic**: splitting each Chord line into verb + template to fit
`verbs() × patterns()` requires knowing where the verb ends (`pick up :item`), which is English
knowledge the loader must not own.
**Rejected — status quo per-line `.define()` with per-rule `.where()`**: satisfies D2 alone, but
leaves no action-level seam; each ADR-267 construct (semantic defaults, typed slots — all
action-scoped in Chord) would re-implement per-line attachment. ADR-269's loader consumes the same
path for the standard grammar; the seam is built once, here.

### D4 — `define verb`: the documentation narrows to what works (Q-10, ruled 2026-07-25)

*Owner ruling via the open-questions interview: the docs narrow — the umbrella D14's recommended
route. General aliasing is not built here; ADR-270's alteration model makes it redundant.*

The published page is rewritten to describe exactly the Phase A capability and no more:

- The `hang or hook means put (something) on (something)` example stays (it works, and ships in
  `cloak.story`).
- The `sniff means smell (something)` example is **removed**.
- The page names the limit plainly: Phase A maps onto the two-slot prepositional `put … on …` pattern
  only; for a genuinely new verb, use `define action`.
- A forward note: general aliasing onto standard actions arrives with the grammar-parity program
  (ADR-270's alteration model — once the standard grammar is editable Chord, aliasing is editing a
  line), which is also why no verb→action-id resolution path is built here.

The loader implementation is untouched except its `LoadError` message, which gains the same "what
Phase A supports" sentence the page now carries — docs and implementation state the same limit in the
same words (acceptance 5).

### D5 — The docs-examples-load test

A story-loader test reads the two published pages' ` ```chord ` fences from the repo
(`website/src/app/chord/guide/vocabulary/define-verb/content.mdx` and
`…/define-action/content.mdx`), wraps each fence in a minimal story harness (story header, one room,
player — the scaffolding a fence legitimately omits), and asserts every fence **loads**. It reads the
MDX at test time, so a future edit that breaks an example fails CI rather than a reader.

Ordering: the test lands in the same change as D4 — against the current page it correctly fails on
the `sniff` fence, which is the defect made assertable. Scope is these two pages; the general
documentation surface belongs to ADR-272 (Q-5).

### D6 — Regression scope: the five live constraint lines change behavior by design

Wiring D2 converts five shipped no-op lines into real parse-time gates (`fernhill` ×3,
`friendly-zoo` ×2). The existing transcript suites for both stories are the regression gate. A
walkthrough command newly refused by scope is **reviewed, not silently accommodated** — one such
demonstration is exactly what acceptance 1 requires; an unexpected one is a finding to surface, per
the no-get-it-done rule. The suites run before and after; diffs are read, not batch-accepted.

## Acceptance

Restated from ADR-266's allocation, made concrete:

1. **A Chord story whose `define action` declares `the <slot> must be <requirement>` is parse-time
   gated by it** — a transcript test shows a command refused for scope that previously resolved.
   *(D2)*
2. **An unsupported requirement word is a compile error** — `analysis.unknown-requirement`, naming the
   word and listing the supported set — not a silently accepted no-op. *(D1)*
3. The compiler emits action-centric grammar for multi-pattern actions, and a test asserts the
   **registered rule shape** (shared action id, constraints on the correct slots of every slotted
   rule, priorities 150/140) — not just that the verbs parse. *(D3)*
4. **No published Chord example on the `define verb` and `define action` pages fails to load** —
   verified by the docs-examples-load test executing the fences, not by review. *(D5)*
5. `define verb`'s documentation and implementation agree: the page describes only what works and
   names the limit, and the `LoadError` names the same limit. *(D4)*
6. The `fernhill` and `friendly-zoo` transcript suites pass after the wiring, with any behavior
   changes individually reviewed. *(D6)*

## Consequences

**Gained.** A taught construct takes effect and its false documentation claim becomes true without
editing the page. Nonsense requirement words become compile errors with a fix-it. The action-level
emission seam that ADR-267's constructs and ADR-269's standard-grammar loading both need exists once.
A published page stops teaching an example that dies at load, and a CI test keeps both pages honest
from now on.

**Lost / cost.** One additive if-domain builder method (`fullPattern()`) — a platform change, though
small and shaped by an existing interface. Five shipped constraint lines change runtime behavior;
two stories' transcripts must be re-verified. The scope-gating engine path gains its first production
consumer (stdlib deliberately refuses in `validate()` instead, ADR-231 D2a); if that path turns out
to have latent defects, this ADR owns triaging them (fixing them may exceed this ADR's scope and
would be raised, not silently absorbed).

**Rejected.** Building the general `define verb` capability (a verb→action-id resolution path Chord
lacks, made redundant by ADR-270 — per the umbrella's sequencing note). The verb-factoring heuristic
and the status-quo flat emission (D3). Adding `nearby` to the requirement set speculatively (D1).

## Session

Session of 2026-07-25 (b52717). Written directly from ADR-266's allocation after re-verifying every
cited code fact against source: the parse→analyze→IR→dropped pipeline, the narrowed loader cast, the
`forAction()` flattening (and its patterns-require-verbs behavior, which shaped D3), the
`ScopeBuilder`/`grammar-scope-resolver` readiness, the zero `.where()` call sites in the standard
grammar, the five live constraint lines in shipped stories, and the two documentation pages.

One framing correction from the owner during review: zero `.where()` usage in the standard grammar is
the design (stdlib refuses on scope in `validate()`; `.where()` is the parse-time gating surface for
authored grammar, ADR-231 D2a), not a latent-risk smell — the Context and Consequences were reworded
accordingly. Q-10 was then resolved through the open-questions interview: **narrow the docs** (D4),
leaving general aliasing to ADR-270.

**Implementation addendum (2026-07-25, same session).** Phases 1–3 landed and green at package level
(chord 545/545, if-domain 95/95, story-loader 380/380). Phase 4's first end-to-end run then confirmed
the risk this ADR named: the scope-gating path's first production consumer found it broken —
`GrammarScopeResolver` calls a WorldModel API that has never existed and fails closed to zero
candidates, so every `.where()`-gated command dies with a parse error (15/593 fernhill failures, one
root cause). Owner ruling: the fix is split out as **ADR-273**, and this ADR's acceptance items 1
and 6 are **blocked on it**. Items 2 and 3 are discharged; items 4 and 5 (docs, Phase 5) are
independent of the defect.
