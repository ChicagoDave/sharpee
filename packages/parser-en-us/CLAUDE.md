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

## Grammar Patterns (ADR-087)

Use the **action-centric** `.forAction()` API for standard verb patterns:

```typescript
// Preferred: action-centric with verb aliases
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', (scope) => scope.touchable())
  .build();
// Generates: push :target, press :target, shove :target, move :target

// Direction commands with aliases
grammar
  .forAction('if.action.going')
  .directions({
    north: ['north', 'n'],
    south: ['south', 's'],
    // ...
  })
  .build();
```

Use `.define()` only for:

- **Phrasal verbs**: `pick up :item`, `put down :item`
- **Complex patterns**: `unlock :door with :key`
- **Story-specific commands**: `incant :word`

```typescript
// Phrasal verb — can't use forAction because verb has space
grammar
  .define('pick up :item')
  .where('item', (scope) => scope.visible().matching({ portable: true }))
  .mapsTo('if.action.taking')
  .build();
```

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
  resolution is confidence → tier → literal specificity → definition order).
- Definition order is semantic: when two story patterns tie on specificity,
  the one defined earlier wins. Don't reorder grammar lines casually.
- Stdlib grammar uses `.forAction()` — stories usually don't need this.
- **Removing standard rules (ADR-270)**: `grammar.removeRules(actionId, pattern)`
  removes a standard-tier rule by shape and returns the count (0 = no match —
  check it; the call never throws). Chord stories spell the same thing as
  `remove from action <name>` / `extend action <name>` blocks.
