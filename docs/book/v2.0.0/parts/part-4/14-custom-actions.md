# Custom Actions: Teaching the Parser New Verbs

Event handlers let you react to verbs the stdlib already knows. But sometimes the
verb itself doesn't exist yet. There's no `feed` action in the standard library,
no `photograph`. When you need a brand-new verb, you write a **custom action**,
and wiring one up means touching every layer of Sharpee at once: the action
logic, the grammar that recognizes the words, and the language that holds the
text. This chapter feeds the goats and snaps photos to show all three.

Wiring an action touches several packages, so this chapter's imports span a few:

```typescript
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, EntityType } from '@sharpee/world-model';
```

The action objects below are top-level `const`s. The three registration methods
(`getCustomActions`, `extendParser`, `extendLanguage`) are members of your
`FamilyZooStory` class, alongside `initializeWorld`.

## The four-phase action

Every action, standard or custom, implements the same four-phase pattern you
met in *The Standard Actions*. A custom action is just an `Action` object with
those four methods:

```typescript
const feedAction: Action = {
  id: 'zoo.action.feeding',
  group: 'interaction',

  // Phase 1: can the action proceed?
  validate(context: ActionContext): ValidationResult {
    if (!hasRequiredItem) return { valid: false, error: 'no_feed' };
    return { valid: true };
  },

  // Phase 2: mutate the world (only runs if valid)
  execute(context: ActionContext): void {
    context.world.setStateValue('item-used', true);
  },

  // Phase 3: success events (text output)
  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('zoo.event.fed', { messageId: 'fed_goats' })];
  },

  // Phase 4: failure events (runs instead of execute/report if invalid)
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.feeding_blocked', { messageId: result.error })];
  },
};
```

The engine runs them in order: `validate()` first; if it returns `{ valid:
false }` it jumps straight to `blocked()`; otherwise it calls `execute()` then
`report()`. Validation checks, world mutation, success text, and failure text
each live in their own phase, never tangled together.

## A complete custom action: feeding

Here's the feed action in full. It confirms the player is carrying feed, that the
target is a feedable animal, and that the animal hasn't already eaten:

```typescript
const FEED_ACTION_ID = 'zoo.action.feeding';

const FeedMessages = {
  NO_FEED: 'zoo.feeding.no_feed',
  NOT_AN_ANIMAL: 'zoo.feeding.not_animal',
  ALREADY_FED: 'zoo.feeding.already_fed',
  FED_GOATS: 'zoo.feeding.fed_goats',
  FED_RABBITS: 'zoo.feeding.fed_rabbits',
  FED_GENERIC: 'zoo.feeding.fed_generic',
} as const;

const feedAction: Action = {
  id: FEED_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Player must be carrying the feed
    const inventory = context.world.getContents(context.player.id);
    const hasFeed = inventory.some(item =>
      item.get(IdentityTrait)?.aliases?.includes('feed'));
    if (!hasFeed) return { valid: false, error: FeedMessages.NO_FEED };

    // There must be a target, and it must be feedable
    if (!target) return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    const name = target.get(IdentityTrait)?.name?.toLowerCase() || '';
    const feedable = ['pygmy goats', 'rabbits'].some(a => name.includes(a));
    if (!feedable) return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };

    // Not already fed
    if (context.world.getStateValue(`fed-${target.id}`)) {
      return { valid: false, error: FeedMessages.ALREADY_FED };
    }

    // Hand the target to the later phases
    context.sharedData.feedTarget = target;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const target = context.sharedData.feedTarget as IFEntity;
    if (target) context.world.setStateValue(`fed-${target.id}`, true);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.feedTarget as IFEntity;
    const name = target?.get(IdentityTrait)?.name?.toLowerCase() || '';

    let messageId: string = FeedMessages.FED_GENERIC;
    if (name.includes('goats')) messageId = FeedMessages.FED_GOATS;
    else if (name.includes('rabbits')) messageId = FeedMessages.FED_RABBITS;

    return [context.event('zoo.event.fed', {
      messageId,
      params: { animal: target?.get(IdentityTrait)?.name || 'animal' },
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.feeding_blocked', {
      messageId: result.error || FeedMessages.NOT_AN_ANIMAL,
    })];
  },
};
```

### Passing data between phases

Notice `context.sharedData.feedTarget`. `validate()` already did the work of
finding and checking the target, so it stashes the result in `sharedData` for
`execute()` and `report()` to reuse. The principle is the point: don't recompute
the target in every phase, and don't smuggle it onto the context object itself.
One note for the future: for carrying data out of `validate()` specifically,
`sharedData` is marked `@deprecated` in favor of returning it in
`ValidationResult.data`. Both work today, and this book's examples use
`sharedData` throughout.

## A second action: photographing

`getCustomActions` and the grammar further down both reference a
`photographAction`; here it is in full. It's simpler than feeding: it checks the
player is carrying a camera, then reports a photo of whatever they aimed at.

```typescript
const PHOTOGRAPH_ACTION_ID = 'zoo.action.photographing';

const PhotoMessages = {
  NO_CAMERA: 'zoo.photo.no_camera',
  TOOK_PHOTO: 'zoo.photo.took_photo',
} as const;

const photographAction: Action = {
  id: PHOTOGRAPH_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const inventory = context.world.getContents(context.player.id);
    const hasCamera = inventory.some(item =>
      item.get(IdentityTrait)?.aliases?.includes('camera'));
    if (!hasCamera) return { valid: false, error: PhotoMessages.NO_CAMERA };

    const target = context.command.directObject?.entity;
    if (target) context.sharedData.photoTarget = target;
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // Photographs are cosmetic; nothing in the world changes.
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.photoTarget as IFEntity | undefined;
    const name = target?.get(IdentityTrait)?.name || 'the scenery';
    return [context.event('zoo.event.photographed', {
      messageId: PhotoMessages.TOOK_PHOTO,
      params: { target: name },
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.photographing_blocked', {
      messageId: result.error || PhotoMessages.NO_CAMERA,
    })];
  },
};
```

The camera it looks for is an ordinary item. Add it to the gift shop (the room
from Chapter 13) in `initializeWorld`:

```typescript
const camera = world.createEntity('disposable camera', EntityType.ITEM);
camera.add(new IdentityTrait({
  name: 'disposable camera',
  description: 'A cheap yellow disposable camera with "ZOO MEMORIES" on the side.',
  aliases: ['camera', 'disposable camera'],
  article: 'a',
}));
world.moveEntity(camera.id, giftShop.id);
```

## Telling the engine: getCustomActions

An `Action` object does nothing until the engine knows about it. Return your
actions from `getCustomActions()` on the story:

```typescript
getCustomActions(): any[] {
  return [feedAction, photographAction];
}
```

## Teaching the parser: extendParser

The engine now *has* the action, but the parser still doesn't recognize the word
"feed." Map verb patterns to your action IDs in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar.define('feed :thing')
    .mapsTo(FEED_ACTION_ID).withPriority(150).build();

  grammar.define('photograph :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
  grammar.define('photo :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
  grammar.define('snap :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
}
```

A `:slot` (here `:thing`) is an argument the parser resolves to an entity. You
can register several patterns for the same action; `photo` and `snap` are
aliases for `photograph`. Use `withPriority(150)` (or higher) so your story
patterns win over any stdlib defaults. Grammar gets its own chapter in Volume V;
this is the minimum to make a custom verb fire.

## Supplying the text: extendLanguage

The action returns *message IDs*, not sentences. Register the actual text in
`extendLanguage()`:

```typescript
extendLanguage(language: LanguageProvider): void {
  // Feed action: every FeedMessages id needs text, or the player sees raw ids.
  language.addMessage(FeedMessages.NO_FEED,
    "You don't have any animal feed.");
  language.addMessage(FeedMessages.NOT_AN_ANIMAL,
    "That's not something you can feed.");
  language.addMessage(FeedMessages.ALREADY_FED,
    "You've already fed them. They look contentedly full.");
  language.addMessage(FeedMessages.FED_GOATS,
    'You scatter some feed on the ground. The pygmy goats rush over, ' +
    'bleating excitedly, and devour the corn and pellets in seconds.');
  language.addMessage(FeedMessages.FED_RABBITS,
    'You sprinkle some pellets near the rabbits. They hop over cautiously, ' +
    'then munch away happily, their little noses twitching.');
  language.addMessage(FeedMessages.FED_GENERIC,
    'You offer some feed. The animal eats it gratefully.');

  // Photograph action.
  language.addMessage(PhotoMessages.NO_CAMERA,
    "You don't have a camera. There's one in the gift shop.");
  language.addMessage(PhotoMessages.TOOK_PHOTO,
    "Click! You snap a photo of {the target}. That one's going on the fridge.");
}
```

A `{param}` placeholder in the text is filled from the `params` object the action
passed, so `params: { target: name }` substitutes into `{the target}`. The `the`
in the placeholder asks for the definite article, as Volume V explains. Keeping text
out of the action and in the language layer is what lets a story be translated or
re-voiced without touching its logic.

> **The mistake everyone makes once:** wiring up only part of the chain. A custom
> verb needs *all three* registrations: the action from `getCustomActions()`,
> the pattern from `extendParser()`, and the message text from
> `extendLanguage()`. Miss the grammar and the parser says it doesn't understand;
> miss the language and the player sees a raw message ID like
> `zoo.feeding.fed_goats`.

## Try it

```
> south                     Main Path
> east                      Petting Zoo
> take feed                 Get the bag of feed
> feed goats                The goats eat happily
> feed goats                "You've already fed them."
> photograph goats          "You don't have a camera." (blocked)
> west                      Main Path
> west                      Aviary
> west                      Gift Shop
> take camera               Grab the camera
> photograph press          Click! Photo taken
```

## Test it

A custom verb has three registrations to forget, so test all of its moods:
works, refuses politely, and blocks without the camera. Add
`tests/transcripts/custom-actions.transcript`:

```text
title: Custom actions
story: familyzoo
description: Feed and photograph are real verbs

---

> south
[OK: contains "Main Path"]

> east
[OK: contains "Petting Zoo"]

> take feed
[OK: contains "Taken"]

> feed goats
[OK: contains "devour"]

> feed goats
[OK: contains "already fed"]

> photograph goats
[OK: contains "don't have a camera"]

> west
[OK: contains "Main Path"]

> west
[OK: contains "Aviary"]

> west
[OK: contains "Gift Shop"]

> take camera
[OK: contains "Taken"]

> photograph press
[OK: contains "Click!"]
```

## Key takeaway

A custom action is an `Action` object with four phases. **Validate** checks
whether the action can run. If it can, **execute** changes the world model as
directed and **report** adds an event message to the turn's output; if it can't,
**blocked** produces the failure message instead. Wiring it up takes three
registrations: the action, its parser pattern, its language text. The object
`context.sharedData` carries results between phases. Miss any one registration and
the verb won't work.
