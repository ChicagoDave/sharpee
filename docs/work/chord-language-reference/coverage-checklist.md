# Chord Language Reference — Coverage Checklist

Every production, line-form, and author-facing rule in
`docs/reference/chord-grammar.md` (synced 2026-07-14, chord v1 locked) mapped
to exactly one section of `docs/reference/chord-language.md`. This file is the
acceptance check for "every construct explained": Phase 6 may not close while
any row is unchecked. Check a row (`[x]`) only when its section has final
prose AND a passing fixture (or expected-fail fixture for migration rows).

Section numbers refer to `docs/reference/chord-language.md`.

## Tokens, layout, and file shape

- [x] WORD / NUMBER / STRING (no escapes) / MARKER tokens — §1.2 (smoke.story)
- [x] Line orientation, spaces-only indentation (`lex.tab-indent`), block open/close table — §1.2 (smoke.story)
- [x] Error recovery (one mistake, one diagnostic; resync at `end`/top-level keyword) — §6.2
- [x] `story-file` = optional header + declarations — §1.1 (smoke.story)
- [x] Story header (`story STRING [by STRING]`, `id:`/`version:`/`blurb:` free fields) — §2.1 (world/story-header.story)
- [x] Story-scope `states-line` (D2) — §2.1 (world/story-header.story)
- [x] Story-scope `score-line` — §2.1 (mechanics in §4.5) (world/story-header.story)

## create blocks (§2 — Building your world)

- [x] `create <name>` + entity naming / ID derivation (lowercased words, article stripped) — §2.2 (world/create-basics.story)
- [x] `aka` aliases — §2.2 (world/create-basics.story)
- [x] Name resolution order (exact name → alias → unique word-subset; never a guess) — §2.2 (world/create-basics.story)
- [x] Composition line: article ⇒ kind noun, bare word ⇒ trait — §2.3 (world/composition.story)
- [x] `with` settings (last token is value; `and`-separated; article starts a multi-word entity-name value) — §2.3 (world/composition.story)
- [x] Conditional traits (`dark while <condition>`) — §2.3 (world/composition.story)
- [x] Composition-vs-prose rule (pre-blank = composition, post-blank = description) — §2.3/§2.6 (world/composition.story)
- [x] Placement: `in`/`on` + article (vs `on` + bare word = clause) — §2.4 (world/placement.story)
- [x] `starts in` — §2.4 (world/placement.story)
- [x] `wears` — §2.4 (world/placement.story)
- [x] Exits: `DIRECTION to <name>` (10-direction set) — §2.5 (world/exits.story)
- [x] Blocked exits: `DIRECTION is blocked [while <condition>]: <key>` — §2.5 (world/exits.story)
- [x] Prose paragraphs (blank line = paragraph break; create-block blank ends composition; later bare paragraphs append; lines join with single spaces) — §2.6 (world/prose-markers.story)
- [x] Markers: `{name}` must name a declared hatch/phrase key; formatter-chain forms not yet validated — §2.6 (world/prose-markers.story)
- [x] `{br}` built-in hard break; `br` reserved (`analysis.reserved-marker`) — §2.6 (world/prose-markers.story)
- [x] Entity/trait-scope `states-line`, `states, reversible:` + irreversible-change gate (`analysis.irreversible-state`, D4) — §2.7 (world/states-scores.story)
- [x] Owner-attached `score <word> worth N` (create scope) — §2.8 (world/states-scores.story)
- [x] `first time` create-block form (first-VISIT description; rooms only; `second time` etc. load errors) — §2.9 (world/first-time.story)
- [x] Per-entity `phrase` override (`phrase <key>[, STRATEGY] [while <cond>]:` + `or` variants; `detail` requires `while`; `analysis.override-gate`; `<id>.detail.2` keys analyzer-derived) — §2.10 (world/phrase-override.story)
- [x] Derived phrase keys (`<entity-id>.description`, `<entity-id>.<key>`) — §2.10 (world/phrase-override.story)

## on / after clauses (§3 — Giving things behavior)

- [x] `on <verb> it` (intercept) vs `after <verb> it` (react) — §3.1 (behavior/on-after.story)
- [x] `refuse`/`refuse when`/`must` illegal in `after` bodies (`parse.react-refusal`, D3) — §3.1 (behavior/on-after.story)
- [x] Matching terminator (`end on` / `end after`) — §3.1 (behavior/on-after.story)
- [x] Clause verbs are single raw words (gerund; event verb or dispatch-action; `EVENT_VERBS` catalog, growth = grammar change) — §3.2 (behavior/clause-forms.story)
- [x] Role binding: `<verb> anything as the <word>` — §3.2 (behavior/clause-forms.story)
- [x] `every turn` (`on` only; `parse.after-every-turn`) — §3.2 (behavior/clause-forms.story)
- [x] Owner-scoped narration (D11): entity-owned every-turn fires only in owner's presence — §3.2 (behavior/clause-forms.story)
- [x] `while <condition>` gate on every clause form — §3.3 (behavior/clause-forms.story)
- [x] `, once` modifier (one lifetime firing, D5) — §3.3 (behavior/clause-forms.story)
- [x] `, before <trait>` / `, after <trait>` ordering — §3.3 (behavior/ordering.story)

## Conditions (§3.4)

- [x] Precedence `or` < `and` < `not`; parentheses — §3.4 (behavior/conditions.story)
- [x] `one chance in N` — §3.4 (behavior/conditions.story)
- [x] `any <name>` / `no <name>` quantifiers (standalone-word rule; open-condition requirement, `analysis.closed-condition-selection` / `analysis.unknown-condition`) — §3.4 (behavior/quantifiers.story, behavior/closed-condition.story expected-fail)
- [x] Bare word = named-condition/state ref (only when standalone) — §3.4 (behavior/clause-forms.story `while dusk`)
- [x] `is [not] a/an <kind>` (is-a) — §3.4 (behavior/conditions.story)
- [x] `is [not] in <name>` (is-in) — §3.4 (behavior/conditions.story)
- [x] `is [not] here` (Z4 deictic; entity subjects only, `analysis.here-subject`) — §3.4 (behavior/conditions.story)
- [x] `is [not] <value>` + state adjectives closed catalog (D1: open/closed/locked/unlocked/on/off/worn/lit) — §3.4 (behavior/conditions.story)
- [x] Declared owner states as bare refs / `is <word>` objects (analyzer-resolved) — §3.4 (behavior/conditions.story)
- [x] `has` / `holds` / `wears` — §3.4 (behavior/conditions.story)
- [x] `can see` / `can reach` — §3.4 (behavior/conditions.story)
- [x] Value expressions: NUMBER, STRING, `its <field>`, `<name>'s <field>`, bare words — §3.4 (behavior/statements.story `its tally`)
- [x] Noun-phrase stop words (`is has holds wears can and or then to while with`) — §3.4 (behavior/conditions.story)
- [x] Unknown-value gate (nearest-valid suggestion) — §3.4/§6.2 (behavior/closed-condition.story)

## Requirements and refusals (§3.5–3.6)

- [x] `must` line shape (opens lowercase `the`/`it`/`its`; legal as action line + body statement; never in `after`) — §3.5 (behavior/must-refuse.story)
- [x] `must be a/an <kind>` — §3.5 (behavior/must-refuse.story)
- [x] `must be in <name>` — §3.5 (behavior/must-refuse.story)
- [x] `must be any <condition>` (membership; the condition's `it` binds to the subject) — §3.5 (behavior/must-refuse.story, behavior/quantifiers.story)
- [x] `must be <value>` — §3.5 (behavior/must-refuse.story)
- [x] `must have/hold/wear <name>` — §3.5 (behavior/must-refuse.story)
- [x] `must see/reach <name>` — §3.5 (behavior/must-refuse.story)
- [x] `must not` / `must be no` are errors (`parse.must-negative`); prohibitions are `refuse when` — §3.5 (side-by-side) (behavior/must-refuse.story)
- [x] `refuse <phrase-key> {param}` — §3.6 (behavior/must-refuse.story)
- [x] `refuse when <condition>: <key>` (+ `analysis.negated-requirement` on `refuse when not …`) — §3.6 (behavior/must-refuse.story)

## Statements (§3.7–3.8)

- [x] `phrase <key> {param}` + dotted phrase keys — §3.7 (behavior/statements.story)
- [x] `with <words> = <value>` params — §3.7 (behavior/statements.story)
- [x] Declare-and-emit inline prose (deeper-indented block; statement-vs-prose disambiguation rule) — §3.7 (behavior/on-after.story)
- [x] `emit <word> {word}` — §3.7 (behavior/statements.story)
- [x] `set <value-expr> to <value-expr>` — §3.7 (behavior/statements.story)
- [x] `change <name> to <state>` (incl. `the story`) — §3.7 (behavior/statements.story, world/story-header.story)
- [x] `move <name> to <name>` — §3.7 (behavior/statements.story, behavior/quantifiers.story)
- [x] `remove <name>` (Z6: out of play permanently; no `to`; never the player, `analysis.remove-player`) — §3.7 (behavior/statements.story)
- [x] `award {token} [, once]` — §3.7 (mechanics in §4.5) (behavior/statements.story)
- [x] Statement-final `when` suffix (D7; legal on phrase/emit/change/move/remove/award/win/lose; NOT set or bare refuse; homonym with select-arm `when`) — §3.8 (behavior/statements.story)

## Branching, iteration, progression (§4)

- [x] `select on <value-expr>` + `when <word>` arms — §4.1 (flow/select-on.story)
- [x] `select <STRATEGY>` + `or`-separated bodies — §4.2 (flow/select-strategy.story)
- [x] STRATEGY set: randomly / cycling / stopping / sticky / first-time (Z5, mirrors Choice selectors) — §4.2 (flow/select-strategy.story)
- [x] Ordinal blocks `first`…`tenth time` (statement position; distinguish from §2.9 create-block form) — §4.3 (flow/ordinals.story)
- [x] `each <condition-name> … end each` (E3; statement-position legality follows host; never top-level; `parse.each-*` errors) — §4.4 (flow/each.story)
- [x] `the match` binder (innermost; `it` stays the clause owner; `analysis.match-outside-each`; `match` reserved, `analysis.reserved-name`; enumeration in declaration order) — §4.4 (flow/each.story)
- [x] Nested `each` — §4.4 (flow/each.story)
- [x] Score identities owner-scoped at all four owners (story/create/trait/action) + award dedupe (ADR-129) — §4.5 (flow/scoring.story)
- [x] `win [word]` / `lose [word]` — §4.6 (flow/endings.story)
- [x] `define sequence <name…>` + steps — §4.7 (flow/sequence.story)
- [x] Step anchor `at turn N` — §4.7 (flow/sequence.story)
- [x] Step anchor `N turns later` — §4.7 (flow/sequence.story)
- [x] Step anchor `when <name> becomes <state>` (D10) — §4.7 (flow/sequence.story)

## define family (§5)

- [x] `define condition <name>: <condition>` (open vs closed conditions) — §5.1 (define/condition.story)
- [x] `define phrase <name>[, STRATEGY|verbatim] [while <cond>]` + `or` variants + `end phrase` (CP1') — §5.2 (define/phrase.story)
- [x] `verbatim` mode (line structure preserved; no strategies/variants) — §5.2 (define/phrase.story)
- [x] `define phrases <locale>` + `key:` prose entries (dedent-terminated, no `end phrases`; same-line forms removed) — §5.3 (define/phrases.story)
- [x] `define verb <w> {or <w>} means <pattern>` + `(something)` slots — §5.4 (define/verb.story)
- [x] `define text <name> from "<module>"` (text hatch; `br` reserved) — §5.5 (define/hatches.story)
- [x] `define action|behavior <name> from "<module>"` (hatch kinds; TS stub shown, binding out of harness scope — documented limitation) — §5.6 (define/hatches.story)
- [x] `define trait` block + `end trait` — §5.7 (define/trait.story)
- [x] Trait `data` fields (`entity`/`number`/`name`/`one of`, `optional`, `, starts`) — §5.7 (define/trait.story)
- [x] Trait-scope `states-line` (D8) + cross-trait `analysis.state-collision` — §5.7 (define/trait.story)
- [x] Trait-scope `score-line` (D12) — §5.7 (define/trait.story)
- [x] Trait `phrases <locale>` block — §5.7 (define/trait.story)
- [x] Trait `on`-clauses — §5.7 (define/trait.story)
- [x] `define action` block (dedent-terminated) — §5.8 (define/action.story)
- [x] Action `grammar` patterns + `:word` slots + `→` cardinality — §5.8 (define/action.story)
- [x] Scope constraint line `the <slot> must be <word>` (no colon) — §5.8 (define/action.story `the animal must be reachable`)
- [x] Action `must`-line / `score`-line / body statements — §5.8 (define/action.story)
- [x] `refuse without <word>: <key>` — §5.8 (define/action.story)
- [x] `refuse when <condition>: <key>` (action line) — §5.8 (define/action.story)
- [x] `otherwise refuse <key>` (dispatch miss) — §5.8 (define/action.story)
- [x] Action `phrases <locale>` block — §5.8 (define/action.story)

## Tooling, diagnostics, migration (§6)

- [x] `sharpee compose <file> [--check] [-o <ir.json>]` — exit codes 0/1/2, stdout carries IR only — §6.1
- [x] Diagnostic anatomy: `<file>:<line>:<col> <severity> [<code>] <message>` — §6.2
- [x] Load-time-gate philosophy (atomic load; `ok` gates IR) — §6.2
- [x] Analyzer gates tour: boolean/shadow/negated-state (D9), state-collision (D8), irreversible-state (D4), negated-requirement (D6), open-condition-truth, here-subject, remove-player, override-gate, reserved-marker/name — §6.2
- [x] Removed: top-level `when` rules → owner-attached `on`/`after` (`parse.removed-when`) — §6.3 (migration/removed-when.story)
- [x] Removed: top-level `once <condition>` → `, once` modifier (`parse.removed-once`) — §6.3 (migration/removed-once.story)
- [x] Removed: `every N turns` → `define sequence` / every-turn clauses (`parse.removed-every`) — §6.3 (migration/removed-every.story)
- [x] Removed: `define flag` → owner states / derived conditions (`parse.removed-flag`) — §6.3 (migration/removed-flag.story)
- [x] Removed: `flag` trait-field type → trait `states` (`parse.removed-flag-field`) — §6.3 (migration/removed-flag-field.story)
- [x] Removed: `if`/`else`/`end if` → `must` guards, `when` suffix, `select` (`parse.removed-if`) — §6.3 (migration/removed-if.story)
- [x] Removed: top-level `define score` → owner-attached `score … worth N` (`parse.removed-score`) — §6.3 (migration/removed-score.story)
- [x] Retired: `ordered`/`once` strategy adverbs → `stopping`/`first-time` (load errors with fix-its) — §6.3 (migration/retired-ordered.story)
- [x] Lexing note: lone `"` is prose punctuation (multi-line dialogue) — §2.6 (world/prose-markers.story)

## Fixture ↔ doc traceability (Phase 6 gate)

- Every checked row cites at least one fixture under
  `docs/work/chord-language-reference/fixtures/`; every fixture is cited by at
  least one doc code block (`<!-- fixture: <relpath> -->` marker convention,
  see `verify-examples.mjs` header).
