# Phrase Algebra: Code Critique

Oct 5, 2026 · David Cornelson

The design is sound and the core idea delivers: agreement, articles and punctuation are decided late, over structure, by one authority. Six issues are worth fixing. The two that matter most are that lists flatten to strings and that some phrases carry unbound names.

## What holds up

- **The contract is language-neutral.** `Phrase` is a closed union of 16 kinds in `if-domain`. A noun phrase carries `articleType`, and the a/an/the surface exists only in the English assembler.
- **Agreement is decided late.** The article is chosen over the rendered adjectives plus noun. Verbs conjugate against their subject at realize time, including the player's narrative person.
- **Sentence and quote edges travel as metadata.** Runs carry flags for sentence start, quote open/close and owed terminal punctuation. One reconciliation pass applies them, so nothing scans finished prose to guess where a sentence began.
- **Variation is deterministic.** `Choice` selects through a PRNG seeded on entity, message key and counter. The same state gives the same text, including after save and restore.
- **Exhaustiveness is enforced.** The realizer narrows the union to `never`, with a runtime guard that names any unhandled kind.

## Findings at a glance

Severity is my judgment of how likely an author is to hit the issue and how visible the result is.

Filed Oct 5, 2026: finding 1 is #561, 2 is #562, 3 is #563, 4 is #564, 5 is #565 and 6 is #566. The capitalization bug under finding 6 is filed on its own as #567.

| # | Finding | Where | Severity |
| --- | --- | --- | --- |
| 1 | Lists, contents and slots flatten to strings, dropping decorations | `english-assembler.ts` | High |
| 2 | `Verb` and `Contents` hold names resolved against the host message | `phrase.ts`, `english-assembler.ts` | Low (latent) |
| 3 | Indefinite article is chosen by first letter plus five prefixes | `english-assembler.ts` | Medium |
| 4 | Templates are parsed and bound at render time | `parse-phrase-template.ts`, `phrase-render.ts` | Medium |
| 5 | Pronoun sets and choice picks are module-level state | `english-assembler.ts` | Medium |
| 6 | The template scanner is a regular expression | `parse-phrase-template.ts` | Low |

## Findings in detail

### 1. Lists, contents and slots flatten to strings

`renderList`, `renderContents` and `renderSlot` realize each item through `renderToString`, which keeps the text and discards the decoration stack. The combinator then emits one run carrying only its own decorations. An emphasized noun inside a list loses its emphasis.

The file header says the old formatter chain failed because its early collapse to a string lost metadata. These three paths repeat that collapse one level down.

**Suggested fix:** have the three combinators return runs, with separator runs between items, so decoration wrapping and reconciliation happen once at the top.

### 2. Some phrases carry unbound names

`Verb.subjectRef` and `Contents.containerRef` are param names. The assembler resolves them against `ctx.params` of whichever message is rendering. A phrase staged into another message's slot looks up its subject in the host's params. If the name is missing, the verb silently agrees singular third person. If the host binds the same name to something else, it agrees with the wrong subject.

This is what keeps the model short of an algebra in the strict sense: a phrase's meaning depends on where it is placed.

**Suggested fix:** resolve the reference when the tree is built, so the verb holds its subject's agreement or the subject node itself.

I inferred this from the code. I did not check whether any current slot contribution contains a `Verb`.

**Verified (Oct 5, 2026, added by Claude Code, Opus 5.5): the mechanism is real, and nothing reaches it today.** Severity lowered from High to Low (latent).

- Only the template parser builds a `Verb` or `Contents` (`parse-phrase-template.ts:147`, `:269`). The parser rejects a verb whose subject is not in the params it was given (`:144`), and those are the params the render context carries (`phrase-render.ts:147`). A verb parsed from a message always finds its subject in that message.
- Every slot producer contributes a `Literal` or a `Choice` of `Literal`s: Chord `present` lines (`story-loader/src/loader.ts:1286`), examine's detail clauses (`examining.ts:122`), the room handler's detail clauses (`room.ts:158`) and the zoo tutorial's slot entries. Nothing calls `registerSlotContributor`.
- The open path is a phrase-valued param. `bindNounPhrase` and `{verbatim:}` insert a bound `Phrase` as-is (`parse-phrase-template.ts:98`, `:171`), so a `Verb` nested inside one would resolve against the host's params. No producer passes such a tree today.

The finding becomes live the first time a slot contribution or a phrase param carries a parsed template.

### 3. Indefinite article is chosen by first letter

`indefiniteArticle` checks five prefixes (`hour`, `honest`, `heir`, `uni`, `one`) and otherwise picks "an" before a vowel letter. Because the article agrees over adjectives too, ordinary inventory text reaches the gaps:

| Input head | Output | Should be |
| --- | --- | --- |
| used key | an used key | a used key |
| useful tool | an useful tool | a useful tool |
| ewer | an ewer | a ewer |
| European coin | an European coin | a European coin |
| unidentified object | a unidentified object | an unidentified object |
| honor guard | a honor guard | an honor guard |

**Suggested fix:** a wider exception table, plus an author override on `NounPhrase`. The phrase already has `pluralForm` for irregular plurals and nothing equivalent for the article.

### 4. Templates are parsed and bound at render time

`parsePhraseTemplate(template, params)` binds param values while it parses. An unbound param or a bad kind prefix throws `PhraseParseError` in the middle of a turn. `renderViaPhrase` catches it, logs a console warning and falls back to inline text. An authoring typo therefore shows up only when that message fires during play, and only in the console.

**Suggested fix:** split the step in two. Parse the template once into an unbound tree and validate it at load against the params the message declares. Bind values at render.

I did not check whether Chord validates templates at compile time or whether `language-provider.ts` caches parsed trees.

**Verified (Oct 5, 2026, added by Claude Code, Opus 5.5): confirmed, and the gap is wider than stated.**

- Nothing is cached. `renderTemplate` runs the perspective pass and `parsePhraseTemplate` on every render (`language-provider.ts:335`). The catch, warning and inline fallback are in `renderViaPhrase` (`phrase-render.ts:166`).
- The only load-time template check is `validateRoomSnippets`, which covers `{snippet:}` markers and nothing else.
- Chord's `checkPhraseMarkers` rejects a bare `{marker}` that names nothing, but skips every variant written in template form: any marker with a capital, a space or a colon, such as `{the item}`, `{verb:is item}` or `{You}` (`chord/src/analyzer.ts:7708`, "Full chain validation lands with the AC-9 contract"). Those are the forms where an unbound param or a bad kind prefix occurs. Its diagnostic spans the whole phrase, not the token.
- TypeScript-authored templates in stdlib and lang-en-us have no check at all.

The parse-once step would close all three gaps.

### 5. Module-level state in the assembler

`registeredPronounSets` is a module-level map. Two stories loaded in one process share it, and a set name registered by both resolves to whichever registered last. That matters for a multi-story server and for test isolation.

`activeChoicePicks` is a module-level variable scoped by `try`/`finally`. It is safe while realization stays synchronous. Separately, `Choice` advances its counter on every realize, so any extra render of the same tree changes what the player sees next.

**Suggested fix:** hold pronoun sets on the assembler instance or the render context, and thread the pick map through the pass.

### 6. The template scanner is a regular expression

Placeholders are found with `/\{([^}]*)\}/g`, and each placeholder body is then split with `split(/\s+/)` in eight places. The pattern has no notion of structure, so malformed templates pass through without complaint:

| Template | What the pattern captures | Result |
| --- | --- | --- |
| `Take {the item` | nothing | The whole string renders as literal text, brace included |
| `a {{literal}} brace` | `{literal` | Treated as a placeholder named `{literal`, which fails as an unbound param |
| `x {a {b} c} y` | `a {b` | Nesting is cut at the first `}` and the remainder leaks into the text |

There is also no way to write a literal brace.

**Replacement: three small pieces, no patterns**

1. **A scanner** that walks the template one character at a time and returns pieces: text or placeholder, each with its start offset. It treats a doubled brace as a literal brace, and raises `PhraseParseError` for an unclosed `{` or a stray `}`.
2. **A tokenizer** for the placeholder body that walks characters and emits words and the `:` separator, each with an offset. This replaces the eight `split` calls and the `indexOf(':')` slicing.
3. **A dispatch table** from kind prefix to parse function, replacing the `if` chain in `parsePlaceholder`. `KIND_PREFIXES` already exists for this and is empty.

A sketch of the scanner, untested:

```ts
type Piece =
  | { kind: 'text'; text: string; start: number }
  | { kind: 'placeholder'; body: string; start: number };

function scanTemplate(template: string): Piece[] {
  const pieces: Piece[] = [];
  let text = '';
  let textStart = 0;
  let i = 0;

  const flush = () => {
    if (text.length > 0) pieces.push({ kind: 'text', text, start: textStart });
    text = '';
  };
  const append = (ch: string, at: number) => {
    if (text.length === 0) textStart = at;
    text += ch;
  };

  while (i < template.length) {
    const ch = template[i];
    if ((ch === '{' || ch === '}') && template[i + 1] === ch) {
      append(ch, i); // doubled brace is a literal brace
      i += 2;
    } else if (ch === '{') {
      flush();
      const close = template.indexOf('}', i + 1);
      if (close < 0) throw new PhraseParseError(template.slice(i), template, 'unclosed {');
      pieces.push({ kind: 'placeholder', body: template.slice(i + 1, close), start: i });
      i = close + 1;
    } else if (ch === '}') {
      throw new PhraseParseError('}', template, 'stray }');
    } else {
      append(ch, i);
      i += 1;
    }
  }
  flush();
  return pieces;
}
```

The doubled-brace escape is my choice, and a backslash would work as well. Doubling is safe to adopt because `{{` already fails today.

The offsets are the real gain. Every error can name a column, which is what an editor needs to underline the exact token. It also makes the parse-once step in finding 4 straightforward, because the scanner needs no params.

**The same habit in the assembler**

The realizer uses patterns for work that is also a character walk:

| Function | Pattern use | Walk instead |
| --- | --- | --- |
| `capitalizeSentenceStart` | `search(/[a-z]/i)` for the first letter | Step to the first character whose upper and lower case differ |
| `collapseWhitespace` | `/\s+/g`, `/^ /`, `/ $/`, `/\s$/` | One pass with a previous-was-space flag, which the function already tracks |
| `splitRunsOnNewlines` | `split(/(\n+)/)` and `/^\n+$/` | Count consecutive newlines while walking |
| `regularPluralVerb` | `/(?:ss\|zz\|x\|ch\|sh)es$/` | `endsWith` over a list of suffixes |

The first one is a live bug. The class `[a-z]` is ASCII only, so the helper skips an accented first letter and capitalizes the next one. I ran it: `Émile nods` becomes `ÉMile nods` and `élan` becomes `éLan`. It also skips digits, so `3 coins` becomes `3 Coins`.

## Scope

This is a read-through of four files in the `sharpee` repo on `main` at commit `1d842b3f5`. No tests were run. The only code executed was the capitalization helper and the placeholder pattern, copied out and run on the inputs shown in finding 6.

| File | Role |
| --- | --- |
| `packages/if-domain/src/phrase.ts` | The `Phrase` union, render context and `Assembler` contract |
| `packages/lang-en-us/src/assembler/english-assembler.ts` | English realization |
| `packages/lang-en-us/src/parser/parse-phrase-template.ts` | Template parser |
| `packages/engine/src/prose-pipeline/phrase-render.ts` | Engine bridge from message id to realized blocks |
