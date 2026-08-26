# Phase 1 shape — Chord grammar reform (ADR-327 D1–D4, D6, D8)

Written 2026-08-25 (session e4250f) before any edit to `packages/chord`, per the plan's
Entry state. Every "today" claim below cites a file and line read this session.

## What exists today

- A clause head is parsed by `parseOnClause` (`packages/chord/src/parser.ts:5322-5411`):
  `on|after <gerund>` then exactly one of `it` (binding `'it'`), `anything as the <role>`
  (`'role'`), `every turn` (`'every-turn'`), or — for `going` only — nothing (`'self'`,
  `parser.ts:5361-5364`). Anything else is `parse.on-target`.
- `OnClause.binding: 'it' | 'role' | 'every-turn' | 'self'` (`ast.ts:1251`); the IR carries
  the same enum (`ir.ts:854`). `'it'` means *the block's owner is the action's object* — the
  loader never reads `binding === 'it'` (grep of `packages/story-loader/src`, 2026-08-25:
  reads are `'every-turn'`, `'self'`, `'role'` only); `world-index/src/roles.ts:108` reads
  only `!== 'every-turn'`.
- The only actor-in-head precedent is `when <entity> moves` (`parser.ts:1375-1399`): the
  mover is a `ValueExpr` parsed with `moves` as the stop word, lowered by `buildMoveClause`
  (`analyzer.ts:6754-6767`) to `IRValue` `{kind:'player'}` | `{kind:'entity', id}` with
  `analysis.move-clause-mover` for anything else. That is the shape to reuse.
- Body `it`: the parser emits a `NameRef` `{words:['it']}` (and `its <field>` as a
  possessive on that ref, `parser.ts:7407-7411`); the analyzer's `resolveRefValue`
  (`analyzer.ts:6605-6609`) returns `{kind:'it'}`, erroring only in story-owned scope
  (`analysis.story-clause-it`, `reportStoryClauseIt`). `it` binds to `scope.owner`
  (`analyzer.ts:5899`, `6200`, `6221`); in a `define trait` body `scope.owner` is `null`
  and `ownStates` carries the trait's visible states (`buildTrait`, `analyzer.ts:2504-2516`)
  — so D8's carrier semantics are *already* how trait bodies work. D2 is a restriction,
  not a new binding.
- The going-specific gates: `checkGoingBinding` (`analyzer.ts:5583-5602`) —
  `analysis.going-self-owner` (bare `on going` outside the player block) and
  `analysis.going-player-it` (`on going it` inside it).
- Scene heads (D4) never reach `parseOnClause`: `on parting|resuming|refusing` are rows of
  `define conversation` (`parser.ts:5272-5286`), `on leaving` is a scene head
  (`parser.ts:4689-4692`). Untouched by construction.
- Corpus head shapes (grep 2026-08-25, `branch-stories` + `stories`): 33 distinct
  `on|after <gerund> it` heads, all single-token gerunds (hyphenated `letting-go` is one
  token); zero role heads in stories (2 in package tests); bare heads are `going` only.
  Fix-its are message text — there is no structured fix-it field (`diagnostics.ts`).
- Version pin: `CHORD_LANGUAGE_VERSION` 3.4.0 (`src/version.ts`), pinned to
  `packages/chord/chord.ebnf`'s sha256 in `tests/language-version.test.ts:58-60`;
  4 golden snapshots carry `languageVersion`. `IR_FORMAT = 'story language 2'` (`ir.ts:20`).

## The grammar after Phase 1

```ebnf
on-clause    = ( "on" | "after" ) head [ "while" condition ] { "," clause-modifier } NL
               >>> { statement } "end" ( "on" | "after" ) NL ;
head         = actor gerund [ "anything" "as" "the" WORD ]   (* explicit actor — D1 *)
             | gerund [ "anything" "as" "the" WORD ]         (* bare — own actor block only *)
             | "every" "turn" ;                              (* `on` only, unchanged *)
actor        = "the" "player"                                 (* the ROLE, resolved at fire time *)
             | name ;                                         (* an actor entity: `Jack`, `the wandering mercenaries` *)
gerund       = WORD ;                                         (* last head word before while / , / EOL / anything *)
```

The corpus, before and after (the Grocery Stall from `secret-letter`, the sword from the ADR):

```chord
create the sword
  on taking it                      # today
    refuse sword-not-for-you
  end on

create the sword
  on the player taking              # Phase 1
    refuse sword-not-for-you
  end on

create the Grocery Stall
  after entering it, while the stall is blocked        # today (`it` = the stall, the object)
    phrase keeper-yells
    move the player to a random adjacent room          # the mover was always named — `move it` would move the stall
  end after

  after the player entering, while the stall is blocked   # Phase 1
    phrase keeper-yells
    move the player to a random adjacent room
  end after

create Jack
  a person
  on going while the wandering mercenaries is aggressive   # unchanged — own-block bare head
    refuse merc-held
  end on
```

## Mechanism

### Parser (`parseOnClause`)
1. Collect head word tokens after `on|after` up to the first of `while`, a comma, EOL, or
   `anything`. Zero words → `parse.on-head`. `every turn` short-circuits as today.
2. The **last** collected word is the gerund; the words before it are the actor. No gerund-set
   lookup in the parser — the parser is syntactic and cannot see `define action` names in
   other files. (This is D3's *effect* — the gerund is matched, never guessed — without the
   set; see the D3 note under Decisions.)
3. Actor words → `ValueExpr` via the same path `parseMoveClause` uses (article + words), or
   `null` when there are none (bare head). Binding stays `'self'` for bare, `'role'` when the
   `anything as the <role>` tail follows, else the owner-is-object binding (renamed — below).
4. If the last word is `it` → `parse.removed-head-it`, fix-it quoting the explicit spelling:
   ``` `on taking it` is no longer a form — name who acts: `on the player taking` (or the actor's name). ```
   The rest of the clause still parses so one migration line yields one error.
5. `parse.on-target` is retired (its only remaining case is covered by 1 and 4).

### AST / IR
- `OnClause.actor: ValueExpr | null`; `IROnClause.actor: IRValue | null` — `{kind:'player'}`
  for the role, `{kind:'entity', id}` for a named actor, `null` for `'self'`/`'every-turn'`.
- Rename the binding value `'it'` → `'object'` in both AST and IR (the word leaves the
  language; the IR should not keep it as a name). Loader and world-index do not read the
  value, so the rename is chord-internal plus tests. `IR_FORMAT` → `'story language 3'`
  (new required field).

### Analyzer
- **Head actor** (`buildOnClause`): resolve `clause.actor` like `buildMoveClause` does.
  - Not `player`/`entity` → `analysis.head-actor` ("`on <words> <gerund>` — the words before
    the action must name who acts: `the player` or a character").
  - Resolves to an entity that is not an actor (a room, a thing) → `analysis.head-actor`
    ("`the Chapel` cannot act — a head names the player or a character").
  - Resolves to the **block's own owner** → `analysis.head-actor-is-owner`, fix-it: "in
    `Jack`'s own block the subject is Jack — write bare `on going`". This generalizes
    `analysis.going-player-it`, which is retired.
  - Unresolved name whose last word could be the gerund (author wrote `on the mercenaries`
    and forgot the verb, or `on taking` outside an actor block) → the same
    `analysis.head-actor` message carries the D3 hint: "if `<last word>` is the action, name
    the actor before it".
- **Bare head** outside an actor's own block (owner is not the player or a person, or the
  clause sits in a `define trait` body) → `analysis.head-bare-outside-actor`, fix-it naming
  the explicit form. Generalizes `analysis.going-self-owner`, which is retired.
- **D2** in `resolveRefValue`: `it` (and therefore `its …`) outside a `define trait` body →
  `analysis.it-removed`, fix-it quoting the owner: "`change it to open` — `it` is no longer
  a form; name the owner: `change the gate to open`". The analyzer knows the owner symbol
  statically (`scope.owner`), so every fix-it is exact. `Scope` gains `inTrait: boolean`
  (set in `buildTrait`); inside a trait body `it` lowers to `{kind:'it'}` exactly as today
  (D8). Story-owned scope keeps `analysis.story-clause-it`.
- **D4**: nothing to do — scene heads never reach this path (cited above); an assertion test
  pins that `on resuming:` etc. still parse.
- Gerund validation: unchanged — `routing` already classifies against `actionSlots`; the
  loader resolves the gerund story-first then stdlib (`ir.ts:1103` comment). Phase 1 adds no
  gerund-set gate in the analyzer either.

### Paper trail in this phase
`chord.ebnf` rows above; `docs/architecture/chord-grammar-changes.md` row;
`CHORD_LANGUAGE_VERSION` 3.4.0 → **4.0.0** with the version.ts note (ADR-257 D2 major: a
syntax existing stories relied on stops parsing); `language-version.test.ts` pin re-recorded;
4 snapshots re-recorded on `languageVersion` and `format`.

## Rulings (David, 2026-08-26, session 1f4b9f)

All four recommendations accepted:

- **Q1 → (ii).** The bare head generalizes to any gerund: `on taking` in an actor's own
  block means *the owner taking anything*. Phase 1 parses it with binding `'self'`; firing for
  non-`going` self clauses is Phase 2 runtime work.
- **Q2 → yes.** Role heads take the explicit actor: `on the player feeding anything as the food`.
- **Q3 → analyzer.** Body `it`/`its` outside a trait body is `analysis.it-removed` with the
  owner-named fix-it; head-position `it` stays `parse.removed-head-it`.
- **Q4 → yes.** Binding value `'it'` → `'object'` in AST and IR; `IR_FORMAT` → `'story language 3'`.

The "anyone" flag stands as recorded — ADR-328's plan, not Phase 1.

## Decisions for David (each with the recommendation) — as posed 2026-08-25

**Q1 — Does the bare head generalize beyond `going`?** Today only `going` has a bare form.
D1 says "inside an actor's own create block the bare head stays — `on going`, `after going`"
and "the subject of a block is its owner". Two readings:

- (i) `going` only, as today. `on taking` bare in Jack's block is `analysis.head-bare-outside-actor`.
- (ii) Any gerund: `on taking` in Jack's block = *Jack taking anything*. This is the only
  spelling for "the owner acting on anything" — the explicit form `on the player taking` in
  the player's own block means the player being taken (owner binds the object, ADR-327
  Non-goals). Firing for non-`going` self clauses is Phase 2 runtime work (actor = owner,
  no object filter).

**Recommend (ii)** — it is what D1's rule says when read uniformly, and (i) leaves an
un-sayable sentence. Phase 1 cost is nil (binding `'self'` already exists); the runtime half
is Phase 2's.

**Q2 — Role heads keep their tail?** `on feeding anything as the food` → `on the player
feeding anything as the food`. Zero corpus occurrences, two in package tests.
**Recommend yes** — one head rule, no second exception.

**Q3 — Where the D2 `it` error lives.** D6 says "named parse errors". The parser could reject
body `it` by keyword, but only the analyzer knows the owner's name for the fix-it
(`change the gate to open`), and it already owns `analysis.story-clause-it`.
**Recommend analyzer** (`analysis.it-removed`); the head-position `it` stays a parse error
(`parse.removed-head-it`) because there the fix-it is generic.

**Q4 — `'it'` → `'object'` rename in AST/IR + `IR_FORMAT` bump.** Cosmetic but permanent;
touches chord tests and snapshots only. **Recommend yes**, in this phase, since the format
bumps anyway for the new `actor` field.

**Flag, not a question — the "anyone" gap.** Migrating `on taking it` to `on the player
taking` is behavior-preserving today (only the player acts) but narrows under ADR-328: an
author who wants "whoever takes the sword" has no spelling, and ADR-327's Non-goals forbid a
new deictic here. This belongs to ADR-328's plan, not Phase 1; recording it so it is not
lost.

## Tests (Acceptance item 1, all in `packages/chord/tests/`)
- Heads: single-object, two-object (`on the player giving` on a thing with `to`-slot action),
  hyphenated gerund (`letting-go`), `define action` gerund, role tail; each asserts the
  emitted `actor` IRValue and `binding` — never "parsed without throwing" (project-profile
  mutation bar).
- Each removed spelling: `on <gerund> it`, `change it`, `move it`, `while it is`, `when it
  is`, `its <field>`, `reset its <timer>`, `raise its <counter>` → its named code and a
  fix-it that contains the owner's name.
- Own-block: bare head in the player block, in a person block, in a room block (error), in
  a trait body (error); explicit head naming the owner (error).
- D8: `it`/`its` in a trait body in condition, statement, and possessive positions lower to
  `{kind:'it'}`; the identical lines one block out are `analysis.it-removed`.
- D4: `on resuming:` / `on leaving` unchanged (pinned by exclusion).
- Version pin and snapshots re-recorded; `pnpm --filter '@sharpee/chord' run test:ci` green.
  Existing chord tests with old spellings (50 files) migrate in this phase — they are chord's
  own fixtures, not corpus.
