::: {.part-page}

# Volume V — Words {.part .unnumbered}

:::

# Extending the Grammar

A parser's whole job is to make sense of words — to take a line a player typed and
decide which action it means and what it acts on. You've already taught it a few new
words: `feed`, `photograph`, `pet`, each wired up with a couple of grammar lines in
`extendParser`. This volume is about words, and it starts where the player's words
enter the system: the **grammar**.

## How the parser matches

The parser holds a set of **patterns** — word-shapes paired with action IDs. When
the player types a line, it finds the best-matching pattern, binds the pattern's
slots to entities that are in scope (Chapter 11), and hands the result to the
engine as a command. `take lamp` matches the pattern `take :item`, binds `:item`
to the lamp in the room, and runs the taking action.

You don't touch the standard patterns — `take`, `drop`, `go`, and the rest come
wired up. What you add are patterns for *your* verbs.

## Where patterns go

Story grammar is registered in the `extendParser` hook on your story, through the
**story grammar** builder:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar
    .define('feed :thing')
    .mapsTo('zoo.action.feeding')
    .withPriority(150)
    .build();
}
```

Read that as a sentence: *define* the pattern `feed :thing`, map it *to* the
feeding action, give it a *priority*, and *build* it (which registers it). Four
calls, one pattern.

## Slots

The `:thing` in `feed :thing` is a **slot** — a placeholder the parser fills with an
entity from scope. The slot's name is how the action gets it back: a single slot
becomes the command's *direct object*, which the action reads as
`context.command.directObject?.entity` — exactly the line you saw in the feeding
action in Chapter 14. Name a slot whatever reads well; `:thing`, `:item`,
`:target`, `:animal` are all fine.

## Aliases: many patterns, one action

Players say the same thing different ways. Register a pattern for each phrasing,
all mapping to the same action:

```typescript
grammar.define('photograph :thing').mapsTo('zoo.action.photographing').withPriority(150).build();
grammar.define('photo :thing').mapsTo('zoo.action.photographing').withPriority(150).build();
grammar.define('snap :thing').mapsTo('zoo.action.photographing').withPriority(150).build();
```

Now `photograph toucan`, `photo toucan`, and `snap toucan` all reach the same verb.

## Prepositions and two slots

A pattern can carry a preposition and a second slot, for verbs that take both a
direct and an indirect object. Suppose feeding should name *both* the food and the
animal:

```typescript
grammar
  .define('feed :food to :animal')
  .mapsTo('zoo.action.feeding')
  .withPriority(150)
  .build();
```

The first slot becomes the direct object, the second (after the preposition) the
indirect object — `context.command.indirectObject?.entity` in the action. This is
the shape behind built-in commands like `unlock :door with :key` and
`put :item in :container`.

Multi-word verbs — phrasal verbs like `pick up :item` — also go through `.define`,
since the verb itself is more than one word.

## Constraining a slot

By default a slot resolves to anything the player could plausibly mean. You can
narrow it with `.where`, giving the slot a scope rule:

```typescript
grammar
  .define('feed :animal')
  .where('animal', (scope: any) => scope.touchable())
  .mapsTo('zoo.action.feeding')
  .withPriority(150)
  .build();
```

The `(scope: any)` annotation on the callback is there to satisfy the strict
`tsconfig.json` that `sharpee init` generates: `.where` accepts more than one kind
of constraint, so TypeScript can't infer the parameter's type on its own and
`noImplicitAny` flags it. Annotating it keeps the build clean.

Keep these rules **permissive** — `touchable` rather than `visible` — for the
reason from Chapter 11: let the parser resolve the noun, and let the action's
`validate` phase make the strict call about whether sight (or anything else) is
truly required. A grammar that demands full visibility forecloses perfectly good
in-the-dark commands before the action ever runs.

## Priority

Why `withPriority(150)`? When more than one pattern could match a line, the
highest-priority one wins. The standard library's patterns sit at the default
level, so giving your story patterns a priority of 150 (or higher) ensures a verb
you define takes precedence over any stdlib pattern that might otherwise catch the
same words. For brand-new verbs it rarely matters; for verbs that overlap a
standard one, it's what puts your version in charge.

> **A note on the standard grammar.** The platform defines its own verbs with an
> action-centric builder — `grammar.forAction('if.action.pushing').verbs(['push',
> 'press', 'shove']).pattern(':target')` — which generates a pattern per verb alias
> at once. As a story author you'll almost always use `.define` inside
> `extendParser` instead; `forAction` is how the library wires its built-ins.

## Key takeaway

The parser matches the player's line against **patterns** that map word-shapes to
action IDs. Add yours in `extendParser` via `parser.getStoryGrammar()`, building
each with `.define(pattern).mapsTo(actionId).withPriority(150).build()`. A `:slot`
is filled from scope and reaches the action as its direct (or, after a preposition,
indirect) object; register several patterns to give one action multiple phrasings;
constrain a slot with `.where` but keep it permissive; and use a priority of 150+ so
your verbs outrank the standard ones. Grammar decides *which* action and *what* it
acts on — the next chapter decides what the game *says* back.
