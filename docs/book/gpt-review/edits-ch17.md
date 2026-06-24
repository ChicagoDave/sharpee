# Ch 17 — Extending the Grammar: edit proposals

Mostly em-dash removal. The prose is already plain and well-paced, so I left the
working sentences alone rather than manufacture changes. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: A parser's whole job is to make sense of words — to take a line a player typed and decide which action it means and what it acts on.
NEW: A parser's whole job is to make sense of words: to take a line a player typed and decide which action it means and what it acts on.

### 2. "How the parser matches" — emdash
OLD: The parser holds a set of **patterns** — word-shapes paired with action IDs.
NEW: The parser holds a set of **patterns**, which are word-shapes paired with action IDs.

### 3. "Where patterns go" — emdash
OLD: You don't touch the standard patterns — `take`, `drop`, `go`, and the rest come wired up.
NEW: You don't touch the standard patterns. `take`, `drop`, `go`, and the rest come wired up.

### 4. "Slots" — emdash
OLD: The `:thing` in `feed :thing` is a **slot** — a placeholder the parser fills with an entity from scope.
NEW: The `:thing` in `feed :thing` is a **slot**, a placeholder the parser fills with an entity from scope.

### 5. "Slots" — emdash
OLD: which the action reads as `context.command.directObject?.entity` — exactly the line you saw in the feeding action in Chapter 14.
NEW: which the action reads as `context.command.directObject?.entity`, exactly the line you saw in the feeding action in Chapter 14.

### 6. "Prepositions and two slots" — emdash
OLD: The first slot becomes the direct object, the second (after the preposition) the indirect object — `context.command.indirectObject?.entity` in the action.
NEW: The first slot becomes the direct object, the second (after the preposition) the indirect object, which is `context.command.indirectObject?.entity` in the action.

### 7. "Prepositions and two slots" — emdash (two)
OLD: Multi-word verbs — phrasal verbs like `pick up :item` — also go through `.define`, since the verb itself is more than one word.
NEW: Multi-word verbs, phrasal verbs like `pick up :item`, also go through `.define`, since the verb itself is more than one word.

### 8. "Constraining a slot" — emdash
OLD: Keep these rules **permissive** — `touchable` rather than `visible` — for the reason from Chapter 11: let the parser resolve the noun, and let the action's `validate` phase make the strict call about whether sight (or anything else) is truly required.
NEW: Keep these rules **permissive**, `touchable` rather than `visible`, for the reason from Chapter 11: let the parser resolve the noun, and let the action's `validate` phase make the strict call about whether sight (or anything else) is truly required.

### 9. "A note on the standard grammar" box — emdash
OLD: The platform defines its own verbs with an action-centric builder — `grammar.forAction('if.action.pushing').verbs(['push', 'press', 'shove']).pattern(':target')` — which generates a pattern per verb alias at once.
NEW: The platform defines its own verbs with an action-centric builder, `grammar.forAction('if.action.pushing').verbs(['push', 'press', 'shove']).pattern(':target')`, which generates a pattern per verb alias at once.

### 10. Key takeaway — emdash
OLD: Grammar decides *which* action and *what* it acts on — the next chapter decides what the game *says* back.
NEW: Grammar decides *which* action and *what* it acts on. The next chapter decides what the game *says* back.
