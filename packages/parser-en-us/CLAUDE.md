# parser-en-us — Claude Instructions

> Scoped to `packages/parser-en-us/`. See the root `CLAUDE.md` for project-wide policy.

## Parser vs Language Layer

**Parser owns grammar, language layer owns text.**

| Package        | Owns                | Examples                                            |
| -------------- | ------------------- | --------------------------------------------------- |
| `parser-en-us` | Grammar patterns    | `grammar/standard-en-us.story`: the standard grammar (Chord source) |
| `lang-en-us`   | Messages, help text | `searching.ts`: error messages, action descriptions |

## The Standard Grammar Is Chord (ADR-269)

**`src/grammar.ts` is GENERATED — never edit it.** The standard grammar's
editable source is `grammar/standard-en-us.story` (a Chord *grammar file*:
`grammar "standard-en-us"` header, `define action` grammar surfaces only).

- To change standard grammar: edit the `.story` file, run `./repokit grammar`,
  and commit both files. `./repokit grammar --check` (run by `repokit verify`
  and a repokit test) fails on drift between them.
- `define action <name>` in the grammar file binds `if.action.<name>` — an
  unknown name is a build error with a did-you-mean (D10).
- **Definition order is semantic** (ADR-268): earlier definition wins remaining
  ties. The `## ORDER IS LOAD-BEARING` comments mark the orderings that decide
  real collisions — don't reorder blocks or lines casually.
- The platform-side exception rules (`?` → help, the `trace …` family →
  `author.trace`) live in `src/platform-grammar.ts` (hand-maintained; ruled
  exceptions — punctuation Chord can't lex, and author/debug tooling). Three
  patterns covering twelve phrasings; `tests/platform-grammar.test.ts` pins the
  accepted and rejected language.
- Patterns in `lang-en-us` action files are for documentation/help, not parsing.
- Stories can extend grammar for story-specific commands via `extendParser()`.

## Grammar Patterns (ADR-382)

A grammar rule reaches the engine as **structured parts** (`PatternElement[]`
from `@sharpee/if-domain`). There are two entries, and both end in the same
compiled pattern:

- **`grammar.rule(spec)`** takes the parts directly — action, parts, display
  text, per-rule defaults, per-slot types and constraints, and an optional
  gate. The Chord loader and the generated `src/grammar.ts` register through
  it, and no text is parsed.
- **`grammar.define(text)`** is the text front end for TypeScript stories.
  `EnglishPatternCompiler.parse` turns the text into parts once, at the
  definition, and refuses malformed brackets and multi-word optionals
  (`[look at]`) with `PatternSyntaxError`.

```typescript
// One rule per line; verb aliases are separate rules
grammar
  .define('push :target')
  .where('target', (scope) => scope.touchable())
  .mapsTo('if.action.pushing')
  .build();

grammar
  .define('pick up :item')
  .mapsTo('if.action.taking')
  .build();
```

A slot's configuration (`.where()`, `.instrument()`, …) has to name a slot the
pattern carries. A name the pattern lacks throws at build. Nothing reads
`rule.pattern` back as a pattern: it is display text only.

### Seats (ADR-383)

Every entity slot carries a **seat**, `direct` or `indirect`, set on its
compiled slot at build. The parser puts each noun in the command by its seat,
and failure messages ask by it ("What do you want to give?" is the missing
`direct` seat). Nothing guesses a seat from a slot's name or its position in
the parser.

- **The default is positional, and lives in if-domain.** With nothing
  declared, the first entity slot is `direct` and the second `indirect`;
  optional slots count. Instrument, topic, text and other typed slots take no
  seat.
- **Declare a seat for an indirect-first line**: `.seat(name, seat)` beside
  `.instrument(name)`, or `slots[name].seat` in a `rule(spec)`.

  ```typescript
  grammar
    .define('hand :recipient :item')
    .seat('item', 'direct')
    .mapsTo('if.action.giving')
    .build();
  ```

  A seat on a non-entity slot, two slots in one seat, or a third entity slot
  throws at build and registers nothing.
- **Chord seats by name.** An action's slot name keeps one seat across all
  its lines (`hand the recipient the item` seats like `give the item to the
  recipient`), and the generated `src/grammar.ts` writes every seat out.
- **The verb and preposition are the literals the rule matched**, not
  vocabulary tags: the verb phrase is the input those literals consumed
  before the first slot (`examine light` has the verb `examine`), and the
  preposition is the input between the two seats.

## Story Grammar Extension

Stories extend grammar in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Literal patterns for story-specific verbs
  grammar
    .define('turn switch')
    .mapsTo(TURN_SWITCH_ACTION_ID)
    .build();

  // Patterns with slots
  grammar
    .define('say :arg')
    .mapsTo(SAY_ACTION_ID)
    .build();
}
```

**Key points**:

- Use `.define()` for literal patterns or phrasal verbs.
- Story grammar automatically outranks the standard grammar: `getStoryGrammar()`
  registers rules at the story tier (ADR-268 — there is no numeric priority;
  resolution is tier → literal specificity → definition order, and a skipped
  optional word costs a rule nothing, ADR-384 D1).
- Definition order is semantic: when two story patterns tie on specificity,
  the one defined earlier wins. Don't reorder grammar lines casually.
- The standard grammar registers through `rule(spec)` (generated); TS stories use `.define()`.
- **Removing standard rules (ADR-270, ADR-382 D6)**:
  `grammar.removeRules(actionId, rule => …)` removes the standard-tier rules of
  that action the test accepts and returns the count (0 = no match — check it;
  the call never throws). Chord's loader passes `samePatternShape(rule.parts, …)`
  from `@sharpee/chord`. Chord stories spell the same thing as
  `remove from action <name>` / `extend action <name>` blocks.
