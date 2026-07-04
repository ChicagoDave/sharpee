# The Language Layer: Messages & Message IDs

Chapter 3 promised that **actions emit events, not text**, that the words the
player reads are produced later, somewhere else. This is that somewhere else. The
**language layer** is the single place every user-facing string lives, and the
bridge between an action's intent and the sentence the player sees is a **message
ID**.

## Intent here, words there

When the feeding action succeeds, it doesn't say "You scatter some feed." It emits
an event carrying a *message ID* and some parameters:

```typescript
context.event('zoo.event.photographed', {
  messageId: 'zoo.photo.took_photo',
  params: { target: name },
});
```

`zoo.photo.took_photo` is not text. It's a name for a piece of text. At the end of
the turn, the engine's prose pipeline takes that ID to the language layer and asks:
*what does this say, in this language, with these parameters?* The answer is what
prints.

The standard library works exactly the same way. Every built-in verb emits IDs
like `if.action.taking.taken`; the English language package maps each to its
prose. Nothing in the engine, stdlib, or world model ever hardcodes a sentence. It
all flows through IDs.

## Registering your text

You met the registration side back in *Custom Actions*. A story supplies text for
its IDs in the `extendLanguage` hook, with `addMessage(id, template)`:

```typescript
extendLanguage(language: LanguageProvider): void {
  language.addMessage('zoo.feeding.fed_goats',
    'You scatter some feed on the ground. The pygmy goats ' +
    'rush over, bleating excitedly, and devour the corn and ' +
    'pellets in seconds.');

  language.addMessage('zoo.photo.took_photo',
    "Click! You snap a photo of {the target}. That one's " +
    "going on the fridge.");
}
```

Each call ties one ID to one template. When the engine later looks up
`zoo.feeding.fed_goats`, it finds this string and renders it.

## Parameters

A template can carry **placeholders** in curly braces, filled from the `params` the
event supplied. The photograph action passed `params: { target: name }`, and the
template's `{the target}` is where that value lands. The `the` before the
parameter name asks for the definite article, so photographing the toucan reads
"Click! You snap a photo of the toucan." Placeholders are how one message adapts to
many situations without a separate string for each.

(There's more to placeholders than plain substitution: hint words like that `the`,
and when a parameter is an *entity*, the language layer renders its name with the
right article and capitalization: "the toucan," "a flashlight," "some feed." That
machinery is the **phrase algebra**, the template grammar and the Assembler that
renders it, and it's the whole of the next chapter.)

## Naming message IDs

IDs are just strings, but a consistent scheme keeps them legible. The convention:

- Built-in messages use the `if.*` namespace, as in `if.action.taking.taken`.
- Your story's messages take a story prefix, such as `zoo.feeding.fed_goats`,
  `zoo.photo.no_camera`.

A descriptive, namespaced ID reads almost like documentation at the call site, and
keeps your messages from colliding with the platform's.

## Why route everything through IDs

The indirection buys real things, all of which come from keeping text in one
layer instead of scattered through logic:

- **Translation.** A French language package maps the same IDs to French prose; the
  story's code never changes.
- **Restyling.** Terse or florid, second person or third: swap the templates, keep
  the behavior.
- **Consistency.** Every "you can't see that" reads the same because it's one
  string, registered once.
- **Overrides.** Supplying your own text for an existing ID replaces what the
  player sees there, a way to reskin a standard response in your story's voice
  without touching the action behind it.

Wherever your story produces player-facing words, whether in actions or in the
event handlers from Chapter 13, prefer a message ID over an inline string, so the
text stays in the layer built to hold it.

## Key takeaway

All user-facing text lives in the language layer or in your story; code refers to
messages by **ID**, never a literal string. Actions emit an ID plus `params`, and
the prose pipeline resolves it to a template at turn end. Registering text means
`addMessage` in `extendLanguage`, namespacing your IDs beside the platform's, and
reusing an ID to override a standard message. That separation keeps intent in the
code and the words in the language layer, and it is what makes a Sharpee story
translatable, restyleable, and consistent.
