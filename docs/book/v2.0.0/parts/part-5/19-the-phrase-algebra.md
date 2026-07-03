# The Phrase Algebra: Grammar in the Template, Not the Text

The last chapter left a thread hanging: when a message parameter is an *entity*,
the language layer renders its name with the right article and capitalization: "the
toucan," "a flashlight," "some feed." It does that with the **phrase algebra**: a
small grammar for the `{…}` placeholders in your templates, and a single renderer
called the **Assembler** that turns the finished result into English at the end of
the turn. This chapter pulls that thread.

## The problem with hardcoded articles

Suppose you write a template by hand:

```text
You pick up the {item}.
```

It reads fine for "the brass key," but the moment the object is a flashlight you
wanted "a flashlight," or a proper name ("you pick up Captain," no article at all),
or a mass noun ("you scatter some feed"), the baked-in "the" is wrong. English
articles depend on the noun, and you don't want a separate message for every
object. The phrase algebra moves that decision out of the literal text and into
the placeholder.

## Noun phrases and hint words

A bare placeholder like `{item}` renders the parameter as a **noun phrase**: the
noun plus whatever article fits it. To steer the article, put a **hint word**
before the parameter name, inside the braces, separated by a space:

| Template | Renders as |
|---|---|
| `{item}` | "a flashlight" — indefinite, the default |
| `{the item}` | "the flashlight" — definite |
| `{a item}` or `{an item}` | "a flashlight" — indefinite, explicitly |
| `{some item}` | "some feed" — mass nouns |
| `{capitalize the item}` | "The flashlight" — for sentence starts |

The last bare word is always the parameter name; the words before it are hints.
`{a item}` and `{an item}` mean the same thing — you're selecting *indefinite*,
and the Assembler picks the actual surface word: "a flashlight," "an owl," even
"an open crate," because it chooses *a* versus *an* over the whole rendered
phrase, adjectives included.

A name at the start of a sentence needs a capital, even though "the toucan" is
lowercase mid-sentence. That's the `capitalize` hint — and it's spelled out in
full, like every hint and prefix in this grammar. There are no abbreviations
(`cap`, `upper`) and no colon-chains (`{the:cap:item}`); that older syntax is
gone, and the parser rejects it loudly rather than guessing.

## Pass a noun phrase, not a name

A hint can only choose correctly if it knows what kind of noun it's dealing with:
is it a proper name? a mass noun? a plural? That information lives on the entity
(the `properName`, article, and noun-type fields you set on an `IdentityTrait`
back in Volume II). So when your code supplies an entity-valued parameter, don't
pass the name string — build a **NounPhrase** value with `nounPhraseFor`:

```typescript
import { nounPhraseFor } from '@sharpee/stdlib';

context.event('game.message', {
  messageId: ZooMessages.ADMIRED,
  params: { animal: nounPhraseFor(animal) },
});
```

The NounPhrase carries the entity's grammatical metadata — its number (singular,
plural, or mass), whether it's a proper name (which suppresses the article
entirely), its adjectives — and every hint and agreement feature downstream reads
it. This is the practical reason the earlier chapters were careful about
`IdentityTrait`'s fields: the phrase algebra is what finally reads them.

A parameter bound to a plain string still works: it's wrapped as an ordinary
singular noun, so `{the target}` bound to `"toucan"` renders "the toucan." That's
fine for quick cases like Chapter 18's photo message. But it means a bare
`{target}` bound to a string defaults to *indefinite* — "a toucan" — and worse,
a whole sentence bound as a string gets an article stuck on the front ("a You
hear footsteps…"). Prose that should pass through untouched needs `{verbatim:…}`,
below. A number or boolean bound bare is inserted as-is — you get "42," not
"a 42."

## One renderer, at the end of the turn

Nothing renders text mid-action. Your action emits events; the templates and
their parameters are gathered; and after the turn completes, the **Assembler**
walks the whole result and produces the words. The Assembler is the single
authority for articles, verb agreement, list punctuation, whitespace,
capitalization, and pronoun reference — no template or action second-guesses it.
For you as an author this has one practical consequence: you supply *structure*
(phrases, hints, parameters), and the grammar comes out right everywhere, or you
fix it in one place.

## Verb agreement

A verb has to agree with its subject: "the toucan **is** fixed in place," but "the
pygmy goats **are** fixed in place." Rather than hardcode `is`, a template uses the
`verb:` prefix and names the parameter to agree with. This is a real template from
the standard library:

```text
{capitalize the item} {verb:is item} fixed in place.
→ The toucan is fixed in place.        (singular)
→ The pygmy goats are fixed in place.  (plural)
```

`{verb:is item}` says: render the verb *is*, agreed with the `item` parameter.
You write the verb in its ordinary third-person-singular form — `is`, `has`,
`opens`, `refuses` — and the Assembler conjugates: "the door opens" but "the
doors open." Irregular verbs (is/are, was/were, has/have, does/do…) are built
in, and regular verbs are conjugated by rule, so any verb works. The parameter
after the verb is an *agreement pointer only* — it is never rendered there, so
you still write the subject where it belongs in the sentence.

The number comes from the entity's `grammaticalNumber: 'plural'` flag, the one
you set back in Chapter 5 (or `.plural()` on the `object()` builder). An entity
with no number metadata is treated as singular. This is why marking plural-named
scenery matters: the platform's standard messages already use verb agreement, so
one flag on the entity keeps every generated line grammatical. And when the
subject is the player, the verb takes the story's narrative person instead:
"you are," not "you is."

## Lists

Collections get the same treatment. When your code has several entities to
mention, it binds a **list of noun phrases** as one parameter:

```typescript
params: {
  items: {
    kind: 'list' as const,
    conj: 'and' as const,
    items: visible.map(e => nounPhraseFor(e)),
  },
}
```

and the template references it like any other parameter:

```text
You can see {items} here.
→ You can see a goat, two rabbits, and a parrot here.
```

The Assembler gives each item its article, groups identical items into counts
("two rabbits"), and joins the result with commas and a final conjunction. A list
of more than one also agrees as plural if a `{verb:…}` points at it. The serial
(Oxford) comma is on by default; a story that prefers "a, b and c" can call
`language.setSerialComma(false)` in `extendLanguage`.

Two relatives of the list are worth knowing:

- `{contents:box}` renders a container's **current contents** as a grouped list,
  read live from the world when the text is rendered — "In the box you see a coin
  and two gems." Your template supplies the preposition; `{contents:box or}`
  joins with "or"; an empty container renders "nothing."
- `{number:coins}` renders a numeric parameter: "7" by default,
  `{number:coins words}` for "seven," `{number:floor ordinal}` for "3rd."

## Pronouns

`{pronoun:…}` renders a pronoun that refers back to the **last-mentioned** thing:

```text
You snap a photo of {the target}. {capitalize pronoun:subject} looks unimpressed.
→ You snap a photo of the toucan. It looks unimpressed.
```

The cases are `subject`, `object`, `possessive`, `possessive-pronoun`, and
`reflexive`. The Assembler tracks every noun phrase it renders, so the pronoun
agrees in number and gender with whatever was mentioned last — "they" for the
goats, "she" for an NPC with a pronoun set on her identity. With nothing to refer
to, it falls back to "it" rather than failing.

## Verbatim: text that must pass through untouched

Some parameters aren't nouns at all: a direction, a name used as a vocative, a
line of pre-written prose. Wrap those in `{verbatim:…}`:

```text
You can go {verbatim:direction} from here.
```

Without it, the parser would treat the bound string as a noun and article it —
"a north," "a Aragorn." `{verbatim:text}` passes the value through byte-for-byte;
even internal spacing and line breaks survive. The platform's own room
description template is built on `{verbatim:description}` — your room prose is
already written; nothing should touch it.

> **Slots — an advanced aside.** That same room template ends with `{slot:here}`,
> a named **slot**: an open append-point that other code can contribute sentences
> to during the turn ("The zookeeper is here."), joined under one punctuation
> authority when the text renders. Slots are how presence lines and similar
> contributions compose without the contributors knowing about each other.
> Most stories never need to define one; if you do, the mechanism is
> `engine.registerSlotContributor` — see the platform reference.

## Branching stays in code

You may have noticed what the template grammar *doesn't* have: no conditionals,
no alternation, no random variation. That's deliberate. Templates stay dumb;
**all branching happens in your code**, which builds a phrase value and binds it
as a parameter like any other.

For a clause that appears only when something is true, build an `Optional` — its
condition is resolved by *your code*, from world state, at the moment you emit:

```typescript
import type { Choice, Literal, Optional } from '@sharpee/if-domain';
import { OpenableBehavior } from '@sharpee/world-model';

const lit = (text: string): Literal => ({ kind: 'literal', text });

const openClause: Optional = {
  kind: 'optional',
  child: lit(', standing wide open'),
  present: OpenableBehavior.isOpen(gate),
};

context.event('game.message', {
  messageId: ZooMessages.GATE_STATUS,
  params: { openClause },
});
```

with the template `The staff gate is set into the fence{openClause}.` When
`present` is false the clause vanishes — along with its comma, absorbed cleanly
rather than dangling.

For text that *varies*, build a `Choice`:

```typescript
const parrotLine: Choice = {
  kind: 'choice',
  selector: 'cycling',
  alternatives: [
    lit('The parrot whistles a jaunty tune.'),
    lit('The parrot rasps, "Pretty bird! Pretty bird!"'),
    lit('The parrot preens one wing, ignoring you.'),
  ],
  entityId: parrot.id,
  messageKey: 'parrot-flavor',
};
```

The selectors are `cycling` (round-robin), `stopping` (advance, then stick on the
last), `firstTime` (first alternative once, the second ever after), `random`
(seeded, never `Math.random`), and `sticky` (pick once, replay forever). Each
Choice keys its progress to `(entityId, messageKey)`, and that counter is saved
with the game — so variation is deterministic, replays identically in transcript
tests, and survives save/restore. Give independent Choices distinct
`messageKey`s so they advance independently.

## Where the parameters go: nest them under `params`

One contract to burn in: when you emit an event, everything the template will
render **must be nested under `params`** — not spread at the top level of the
event data:

```typescript
// CORRECT — render params nested under params
context.event('game.message', {
  messageId: ZooMessages.PHOTO,
  params: { target: nounPhraseFor(target) },
});

// WRONG — target at the top level; the template can't see it
context.event('game.message', {
  messageId: ZooMessages.PHOTO,
  target: nounPhraseFor(target),
});
```

Top-level fields are for your own event handlers to read; `params` is what the
renderer binds into the template. Get it wrong and the template's `{the target}`
has nothing bound to it — which brings us to what happens then.

## Mistakes fail loudly

The old formatter systems of the IF world tended to fail silently — a typo'd
placeholder just printed nothing, and you found out from a puzzled tester. The
phrase algebra takes the opposite stance: **template errors throw, synchronously,
when the template is parsed**, with a `PhraseParseError` naming the offending
token. You'll hit it immediately in your first playthrough or transcript test,
not weeks later.

What the parser rejects:

- **Legacy colon chains** — `{the:item}`, `{the:cap:item}`: "`'the'` is not a
  known kind prefix — legacy ':' chains are not supported." The pre-2.0 formatter
  syntax is a deliberate clean break, not a quiet deprecation.
- **Unknown hint words** — `{teh item}`: "'teh' is not a recognized hint."
- **Unbound parameters** — a template referencing `{the target}` when the event
  supplied no `target` (the top-level-vs-`params` mistake above lands here).

One nuance: a message rendered at end of turn degrades gracefully rather than
crashing the game — the failure is logged as
`[phrase] renderMessage("your.message.id") failed: …` and the message falls back
or goes blank for that turn. Treat that log line as a broken build: it always
means a template or its parameters are wrong.

## Key takeaway

The phrase algebra keeps English grammar in the template's placeholders, not your
literal text. Hint words (`{the item}`, `{some item}`, `{capitalize the item}`)
pick articles from the entity's own metadata, which is why you bind
`nounPhraseFor(entity)`, not a name string. `{verb:is item}` agrees verbs with
their subjects; lists, `{contents:…}`, and `{number:…}` handle collections and
counts; `{pronoun:subject}` refers back to the last thing mentioned; and
`{verbatim:…}` protects prose that must pass through untouched. Branching and
variation never go in the string — build `Optional` and `Choice` values in code
and bind them as parameters. Nest render parameters under `params`, and trust the
loud errors: a bad template announces itself at parse time. Write one message,
and it reads correctly for every object it's ever handed. With grammar, language,
and formatting covered, the words side of Sharpee is complete.
