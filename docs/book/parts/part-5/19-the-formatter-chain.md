# The Formatter Chain: Grammar in the Template, Not the Text

The last chapter left a thread hanging: when a message parameter is an *entity*,
the language layer renders its name with the right article and capitalization: "the
toucan," "a flashlight," "Some feed." It does that with the **formatter chain**, a
small grammar inside your message templates. This short chapter pulls that thread.

## The problem with hardcoded articles

Suppose you write a template by hand:

```text
You pick up the {item}.
```

It reads fine for "the brass key," but the moment the object is a flashlight you
wanted "a flashlight," or a proper name ("you pick up Captain," no article at all),
or a mass noun ("you scatter some feed"), the baked-in "the" is wrong. English
articles depend on the noun, and you don't want a separate message for every
object. The formatter chain moves that decision out of the literal text and into a
**formatter**.

## Formatter syntax

Inside a template, a placeholder can name a formatter before the parameter,
separated by a colon: `{formatter:param}`. The **article formatters** pick the
correct word for you:

```text
You pick up {the:item}.       → You pick up the brass key.
You scatter {some:item}.      → You scatter some feed.
There is {a:item} here.       → There is a flashlight here.
```

`{a:item}` even chooses *a* versus *an* by the word that follows: "a flashlight,"
"an owl." The full set of article formatters is `a` / `an`, `the`, `some` (for mass
nouns), and `your`.

## Why pass the entity, not its name

An article formatter can only choose correctly if it knows what kind of noun it's
dealing with: is it a proper name? a mass noun? a plural? That information lives on
the entity (the `properName`, article, and noun-type fields you set on an
`IdentityTrait` back in Volume II). So when an action supplies a parameter that the
template will article-format, it passes the **entity's information**, not a bare
string. Hand the formatter a plain string and it can only guess from spelling;
hand it the entity and it knows that "Captain" takes no article and "feed" takes
"some."

This is the practical reason the earlier chapters were careful about
`IdentityTrait`'s `properName` and `article` fields: the formatter chain is what
finally reads them.

## Capitalization and other text formatters

Articles aren't the only thing that varies by position. A name at the start of a
sentence needs a capital, even though "the toucan" is lowercase mid-sentence.
That's another formatter, and formatters **chain**: list several, separated by
colons, and they apply in turn:

```text
{the:cap:item} blocks your way.   → The toucan blocks your way.
```

`{the:cap:item}` builds "the toucan" and then capitalizes it. The text formatters
are `cap` (capitalize the first letter), `upper`, `lower`, and `title`.

## Verb agreement

A verb has to agree with its subject: "the toucan **is** fixed in place," but "the
pygmy goats **are** fixed in place." Rather than hardcode `is`, a template keys a
**verb formatter** to the same entity:

```text
{the:cap:item} {is:item} fixed in place.
→ The toucan is fixed in place.        (singular)
→ The pygmy goats are fixed in place.  (plural)
```

`{is:item}` emits "is" or "are" depending on the entity's number, the same
`grammaticalNumber: 'plural'` flag you set back in Chapter 5 (or `.plural()` on the
`object()` builder). The companions `{was:item}` (was/were) and `{has:item}`
(has/have) work the same way. An entity with no number metadata is treated as
singular, so existing singular objects read exactly as before. This is why marking
plural-named scenery matters: the platform's standard messages already use these
formatters, so one flag on the entity keeps every generated line grammatical.

## Lists

The chain also handles collections. `{list:items}` turns an array of entities into a
natural English list. It gives each one its article, groups identical items into
counts, and joins them with commas and a final "and":

```text
You see {list:items} here.
→ You see a goat, two rabbits, and a parrot here.
```

One formatter does all of it: the articles ("a goat"), the grouping ("two rabbits"),
and the join. Use `{the-list:items}` for the definite form ("the goat, the rabbit,
and the parrot"), and `{count:items}` for a bare quantity ("three coins"). The serial
(Oxford) comma is on by default, and a story can turn it off.

## Key takeaway

The formatter chain keeps English grammar in the template's placeholders, not your
literal text. Article formatters (`{a:item}`, `{the:item}`) pick the right word
from the entity's own metadata, which is why you pass the *entity*, not a bare
name. Text formatters like `{cap:…}` handle capitalization, and you chain them with
colons to stack more than one on a value, as in `{the:cap:item}`. Write one
message, and it reads correctly for every object it's ever handed. With grammar,
language, and formatting covered, the words side of Sharpee is complete.
