# Story-Level Naval Directions (Temporary Hack)

ADR-143 was withdrawn from the platform. Until it's re-implemented properly, here's how to get naval directions working entirely at the story level.

## What You Get

- Player types `fore`, `aft`, `port`, `starboard`, `topside`, `below` (and abbreviations)
- Going action messages say "You go fore." instead of "You go north."
- Compass words (`north`, `south`, etc.) stop working
- All wiring lives in your story — zero platform changes

## 1. Grammar: Register Naval Direction Patterns

In your story's `extendParser()`, add naval words as grammar patterns that map to the going action with direction semantics.

```typescript
// src/grammar/naval-directions.ts
import { GrammarBuilder } from '@sharpee/if-domain';

export function registerNavalGrammar(grammar: GrammarBuilder): void {
  // Override the platform's compass directions with naval equivalents.
  // Each pattern maps a word to if.action.going with a direction constant.
  //
  // NOTE: The platform compass patterns (north, south, etc.) are still
  // registered at lower priority. Story patterns at priority 150+ win.
  // If you want compass words to fail completely, see section 4 below.

  const navalMap: Record<string, [string, ...string[]]> = {
    'north': ['fore', 'forward', 'bow'],
    'south': ['aft', 'back', 'stern'],
    'east':  ['starboard', 'right'],
    'west':  ['port', 'left'],
    'up':    ['topside', 'up'],
    'down':  ['below', 'below decks', 'down'],
    'in':    ['in', 'inside'],
    'out':   ['out', 'outside'],
  };

  for (const [direction, words] of Object.entries(navalMap)) {
    for (const word of words) {
      grammar
        .define(word)
        .mapsTo('if.action.going')
        .withPriority(150)
        .withDefaultSemantics({ direction })
        .build();
    }
  }

  // Abbreviations (lower priority than full words)
  const abbreviations: Record<string, string> = {
    'f': 'north',
    'a': 'south',
    'sb': 'east',
    'p': 'west',
    'ts': 'up',
    'bd': 'down',
  };

  for (const [abbr, direction] of Object.entries(abbreviations)) {
    grammar
      .define(abbr)
      .mapsTo('if.action.going')
      .withPriority(140)
      .withDefaultSemantics({ direction })
      .build();
  }

  // "go fore", "go aft", etc.
  for (const [direction, words] of Object.entries(navalMap)) {
    for (const word of words) {
      grammar
        .define(`go ${word}`)
        .mapsTo('if.action.going')
        .withPriority(150)
        .withDefaultSemantics({ direction })
        .build();
    }
  }
}
```

Wire it up:

```typescript
// In your grammar/index.ts
import { registerNavalGrammar } from './naval-directions';

export function registerAllGrammar(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  registerNavalGrammar(grammar);
  // ... other story grammar
}
```

## 2. Language: Override Going Messages

The going action's messages include a `{direction}` parameter that currently resolves to the lowercase direction constant (e.g., "north"). Override the messages to translate constants to naval words.

```typescript
// src/messages/naval-messages.ts
import { LanguageProvider } from '@sharpee/lang-en-us';

const NAVAL_NAMES: Record<string, string> = {
  'north': 'fore',
  'south': 'aft',
  'east': 'starboard',
  'west': 'port',
  'up': 'topside',
  'down': 'below decks',
  'in': 'in',
  'out': 'out',
};

function navalDirection(dir: string): string {
  return NAVAL_NAMES[dir] ?? dir;
}

export function registerNavalMessages(language: LanguageProvider): void {
  // Override going messages to use naval direction names.
  // The {direction} param arrives as lowercase constant ("north").
  // We intercept with a function message to translate it.
  language.addMessage('if.action.going.moved',
    (params: Record<string, any>) =>
      `{You} {go} ${navalDirection(params.direction)}.`
  );
  language.addMessage('if.action.going.went',
    (params: Record<string, any>) =>
      `{You} {go} ${navalDirection(params.direction)}.`
  );
  language.addMessage('if.action.going.no_exit',
    `{You} {can't} go that way.`
  );
  language.addMessage('if.action.going.nowhere_to_go',
    `{You}'ll have to say which direction to go.`
  );
}
```

Wire it up:

```typescript
// In your messages/index.ts
import { registerNavalMessages } from './naval-messages';

export function registerAllMessages(language: LanguageProvider): void {
  registerNavalMessages(language);
  // ... other story messages
}
```

## 3. Room Exits Are Unchanged

Room connections still use abstract direction constants. This is correct — the vocabulary is a presentation layer, not a storage layer.

```typescript
helpers.room('Quarterdeck')
  .connectsTo('Forecastle', 'north')    // player types FORE
  .connectsTo('Cargo Hold', 'down')     // player types BELOW
  .connectsTo('Gun Deck', 'west')       // player types PORT
  .build();
```

## 4. Optional: Block Compass Words

The platform's compass patterns register at priority 100. Your naval patterns at 150 will win when there's a match, but `north` will still parse as a going command at the platform level.

If you want compass words to produce an error instead:

```typescript
// In extendLanguage(), add a hint message
language.addMessage('story.wrong_vocabulary',
  'On the ship, you navigate by fore, aft, port, and starboard.'
);
```

Then add a story event handler that intercepts going commands with compass-only directions and blocks them. This is more work and may not be needed — if all your rooms only have exits using the 8 naval-mapped directions, compass words will just produce "You can't go that way."

## Limitations

- **No automatic vocabulary switching.** If your story has both ship and shore regions, you'll need to manage which grammar patterns are active. The story grammar doesn't support removing patterns after registration, so you'd need all patterns registered and use event handlers to block the wrong set per region.
- **Direction display in exit listings.** The `look` command's exit listing uses lowercase direction constants. You'll need to override the room description message to translate these.
- **No per-region vocabularies.** This hack is global — naval directions everywhere, or you manage the complexity yourself.

These limitations are exactly what ADR-143 was designed to solve at the platform level. When a story actually ships with naval directions, that's the signal to re-implement ADR-143 properly.
