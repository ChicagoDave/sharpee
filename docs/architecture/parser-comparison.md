# Parser Architecture Comparison: Classic IF Systems and Sharpee

A detailed comparison of how TADS, Inform 6, Inform 7, Hugo, and Sharpee handle the journey from player input to executed action.

## Overview

All parser-based IF systems solve the same fundamental problem: transform natural language input into game actions. The solutions share common ancestry but diverge in philosophy and implementation.

```
Player Input: "put the red book on the wooden shelf"
                            ↓
              [GRAMMAR / PATTERN MATCHING]
                            ↓
              [SCOPE / ENTITY RESOLUTION]
                            ↓
              [VALIDATION / PRECONDITIONS]
                            ↓
              [EXECUTION / STATE CHANGE]
                            ↓
              [RESPONSE / OUTPUT]
```

Each system implements these stages differently. This document explores those differences without judgment—each approach reflects valid design tradeoffs.

---

## 1. Grammar Definition

How does each system define what commands look like?

### TADS 2/3

TADS uses **VerbRule** declarations that combine syntax patterns with semantic requirements:

```tads3
// TADS 3
VerbRule(PutOn)
    'put' dobjList 'on' singleIobj
    : PutOnAction
    verbPhrase = 'put/putting (what) (on what)'
;

// The grammar IS the action definition
// Verb synonyms defined separately
modify VerbRule(PutOn)
    'place' dobjList 'on' singleIobj : ;
```

**Characteristics:**
- Grammar tightly coupled to action definitions
- Verb phrases carry semantic metadata (for NPC commands, messages)
- Slot types (`dobjList`, `singleIobj`) encode cardinality
- Synonyms added via grammar inheritance/modification

### Inform 6

Inform 6 uses **Verb** directives with pattern lines:

```inform6
Verb 'put' 'place' 'drop'
    * held 'on' noun -> PutOn
    * held 'in' noun -> Insert
    * multiexcept 'on' noun -> PutOn
    * multiexcept 'in' noun -> Insert;
```

**Characteristics:**
- Compact, terse syntax (classic Infocom heritage)
- Token types define scope constraints: `held`, `noun`, `creature`, `multi`
- Multiple patterns map to same action (PutOn)
- Synonyms listed in verb header
- Grammar INCLUDES scope requirements (`held` = must be carried)

### Inform 7

Inform 7 uses **natural language** grammar definitions:

```inform7
Understand "put [things preferably held] on [something]" as putting it on.
Understand "place [things preferably held] on [something]" as putting it on.

Putting it on is an action applying to two things.
```

**Characteristics:**
- Human-readable grammar specifications
- Bracketed tokens: `[something]`, `[things]`, `[text]`
- Scope hints in token names: `preferably held`, `visible`, `touchable`
- Actions declared separately from grammar
- Multiple Understand lines for synonyms

### Hugo

Hugo uses **verb** and **xverb** declarations with grammar patterns:

```hugo
verb "put", "place"
    *                           DoVague
    * object "on" xobject       DoPutonGround
    * multi "on" xobject        DoPutAll

xverb "inventory", "i", "inv"
    *                           DoInventory
```

**Characteristics:**
- `verb` for world-affecting actions, `xverb` for meta actions
- Token types: `object`, `xobject` (indirect), `multi`, `number`, `string`
- Routines named directly in grammar (DoPutonGround)
- Concise, script-like syntax

### Sharpee

Sharpee uses a **fluent builder API** with action-centric organization:

```typescript
// Action-centric definition (preferred) - ADR-087
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .build();

// Phrasal patterns with semantic trait constraints
grammar
  .define('put :item on :supporter')
  .hasTrait('supporter', TraitType.SUPPORTER)
  .mapsTo('if.action.putting')
  .withPriority(100)
  .build();

// Container operations
grammar
  .define('put :item in|into|inside :container')
  .hasTrait('container', TraitType.CONTAINER)
  .mapsTo('if.action.inserting')
  .withPriority(100)
  .build();

// Direction slots use type constraint, not trait
grammar
  .define('go :direction')
  .where('direction', { type: 'direction' })
  .mapsTo('if.action.going')
  .withPriority(100)
  .build();
```

**Characteristics:**
- TypeScript fluent API with IDE autocompletion
- Action ID is the organizing principle (not the verb)
- Verb synonyms declared once per action via `.verbs([...])`
- `.hasTrait()` declares semantic constraints (entity must have trait)
- **NO scope/visibility in grammar** — scope resolved at runtime by action
- Grammar defines SYNTAX + semantic constraints only
- Comments explicitly note: "Scope handled by action validation"

### Comparison Table: Grammar

| Aspect | TADS 3 | Inform 6 | Inform 7 | Hugo | Sharpee |
|--------|--------|----------|----------|------|---------|
| Syntax style | VerbRule classes | Verb directives | Natural language | verb declarations | Fluent builder API |
| Synonym handling | Inheritance | Verb header list | Multiple Understand | Verb header list | `.verbs([...])` array |
| Scope in grammar | Implied by slot types | Token types (held/noun) | Token hints | object/xobject | None (action validates) |
| Semantic constraints | Slot types | Token types | Token descriptions | Slot types | `.hasTrait()` |
| Multi-object | dobjList/multiexcept | multi/multiexcept | [things] | multi | Handled by parser |
| Action binding | VerbRule → Action | Pattern → routine | Understand → action | Pattern → routine | Pattern → action ID |

---

## 2. Parsing and Tokenization

How does each system break apart player input?

### TADS 3

TADS has a sophisticated **tokenizer** and **grammar parser**:

```
Input: "put the red book on shelf"
         ↓
Tokenizer: ["put", "the", "red", "book", "on", "shelf"]
         ↓
Grammar Parser: Match against VerbRules
         ↓
Best Match: VerbRule(PutOn) with dobj="red book", iobj="shelf"
```

**Key features:**
- Built-in tokenizer handles contractions, abbreviations
- Grammar is a true parser (can backtrack)
- Disambiguation happens during parsing
- Returns structured parse tree with action + objects

### Inform 6

Inform 6 uses a **two-pass** parser:

```
Input: "put red book on shelf"
         ↓
Pass 1: Tokenize into dictionary words
         ↓
Pass 2: Match verb patterns, consume tokens left-to-right
         ↓
Match: Verb 'put' pattern "held 'on' noun"
         ↓
Scope Check: Is "red book" held? Is "shelf" in scope?
```

**Key features:**
- Dictionary-based tokenization (words must be in game dictionary)
- Left-to-right pattern matching (no backtracking)
- Scope checking integrated into parsing
- Parser decides entity resolution during parse

### Inform 7

Inform 7 compiles to Inform 6, but adds:

```
Input: "put the red book on the shelf"
         ↓
Understanding Phase: Match against Understand patterns
         ↓
Disambiguation: "Which do you mean, the red book or the red apple?"
         ↓
Action Creation: Create "putting red book on shelf" action
```

**Key features:**
- Same underlying I6 parser, but abstracted
- Richer disambiguation ("Did you mean...")
- Actions are first-class objects (can be stored, examined)
- "Deciding the scope" activity for custom scope rules

### Hugo

Hugo uses a **simple token-based** parser:

```
Input: "put book on shelf"
         ↓
Tokenize: Split on spaces, look up in dictionary
         ↓
VerbRoutine: Match verb, call FindObject for each slot
         ↓
Object Resolution: Search rooms, containers, inventory
```

**Key features:**
- Straightforward, predictable parsing
- FindObject routine handles scope
- Less sophisticated disambiguation
- Fast and efficient for simple games

### Sharpee

Sharpee uses a **multi-phase** approach:

```
Input: "put the red book on the wooden shelf"
         ↓
Phase 1 - Tokenization:
  tokens: [{text: "put", ...}, {text: "the", ...}, ...]
  Each token gets vocabulary candidates (verb? preposition? noun?)
         ↓
Phase 2 - Pattern Matching (Grammar Engine):
  Try patterns by priority
  Match: "put :item on :supporter"
  Slots: item="the red book", supporter="the wooden shelf"
         ↓
Phase 3 - Output (Parser):
  IParsedCommand {
    action: 'if.action.putting_on',
    directObject: { text: 'the red book', entity: null },
    indirectObject: { text: 'the wooden shelf', entity: null }
  }
```

**Key features:**
- Entities NOT resolved during parsing (text only)
- Pattern matching is priority-ordered (story patterns > stdlib)
- Confidence scoring for ambiguous matches
- Parser output is intermediate representation (IR)

### Comparison Table: Parsing

| Aspect | TADS 3 | Inform 6 | Inform 7 | Hugo | Sharpee |
|--------|--------|----------|----------|------|---------|
| Tokenization | Built-in sophisticated | Dictionary-based | I6-based | Dictionary-based | Vocabulary registry |
| Pattern matching | Full grammar parser | Left-to-right | I6-based + rules | Left-to-right | Priority-ordered |
| Backtracking | Yes | No | Limited | No | No (by design) |
| Entity resolution | During parse | During parse | During parse | During parse | After parse (separate) |
| Output type | Parse tree + objects | Populated globals | Action object | Populated globals | IParsedCommand (IR) |

---

## 3. Scope and Entity Resolution

How does each system determine what the player can interact with?

### TADS 3

TADS 3 has a **comprehensive scope model**:

```tads3
// Scope is determined by sensory context
class Thing: object
    canSee(obj) { ... }
    canHear(obj) { ... }
    canSmell(obj) { ... }
    canReach(obj) { ... }

// Resolvers determine valid objects
class Resolver: object
    filterAmbiguous(lst) { ... }
    filterPossessive(lst) { ... }
```

**Key features:**
- Multi-sensory scope (see, hear, smell, reach)
- Resolver classes for different contexts
- Disambiguation through resolver filtering
- Scope is property of actor (NPCs have their own scope)

### Inform 6

Inform 6 uses **scope routines** and **token types**:

```inform6
! Token types define scope requirements
! held   = in inventory
! noun   = in scope (visible/touchable)
! creature = animate beings
! multi  = multiple objects

! Custom scope via scope_stage
[ InScope actor;
    PlaceInScope(lamp);  ! Always visible
    if (location == dark_room) {
        PlaceInScope(grue);  ! Only in this room
    }
];
```

**Key features:**
- Scope types in grammar (held, noun, etc.)
- `InScope` hook for dynamic scope
- Darkness handling built-in
- Scope is global state during parsing

### Inform 7

Inform 7 abstracts scope through **activities**:

```inform7
Definition: A thing is visible if the player can see it.
Definition: A thing is touchable if the player can touch it.

Before deciding the scope of the player when in darkness:
    place the glowing orb in scope.

The carrying capacity of the player is 7.
```

**Key features:**
- Declarative visibility/touchability definitions
- "Deciding the scope" activity for customization
- Reaching inside rules for containers
- Abstracted but still fundamentally I6 scope

### Hugo

Hugo uses **FindObject** and **scope flags**:

```hugo
! FindObject searches in order:
! 1. Held objects
! 2. Room contents
! 3. Objects in open containers

routine FindObject(obj, objloc)
{
    if Contains(player, obj) return true
    if Contains(location, obj) return true
    if obj in something && IsOpen(something) return true
    return false
}
```

**Key features:**
- Procedural scope checking
- Explicit search order
- Simple, predictable rules
- Game author controls via routine overrides

### Sharpee

Sharpee uses a **dedicated ScopeResolver** with **scope levels**:

```typescript
enum ScopeLevel {
  UNAWARE = 0,    // Doesn't know it exists
  AWARE = 1,      // Knows it exists (heard, smelled)
  VISIBLE = 2,    // Can see it
  REACHABLE = 3,  // Can touch it
  CARRIED = 4     // In inventory
}

// Resolution happens AFTER parsing
class CommandValidator {
  resolveNounPhrase(noun: INounPhrase, world: WorldModel) {
    // 1. Find entities matching noun text
    const candidates = world.findEntitiesByName(noun.head);

    // 2. Filter by adjectives
    const matching = candidates.filter(e =>
      this.adjectivesMatch(e, noun.adjectives)
    );

    // 3. Check scope for each candidate
    const inScope = matching.filter(e =>
      scopeResolver.getScope(actor, e) >= ScopeLevel.VISIBLE
    );

    // 4. Disambiguate
    return this.disambiguate(inScope, noun);
  }
}
```

**Key features:**
- Scope is **numeric level**, not boolean
- Resolution is **separate phase** after parsing
- ScopeResolver handles all perception logic:
  - Darkness (need light source)
  - Container blocking (closed containers)
  - Distance (same room, adjacent room)
- Actions specify **required scope level**
- Adjective filtering is explicit step

### Comparison Table: Scope

| Aspect | TADS 3 | Inform 6 | Inform 7 | Hugo | Sharpee |
|--------|--------|----------|----------|------|---------|
| Scope model | Multi-sensory | Token types | Activities | FindObject | Scope levels (0-4) |
| When resolved | During parsing | During parsing | During parsing | During parsing | After parsing |
| Customization | Resolver classes | InScope hook | Deciding scope | Routine override | ScopeResolver |
| Darkness | Built-in | Built-in | Built-in | Manual | Built-in |
| NPC scope | Per-actor | Limited | Per-actor | Limited | Per-actor |

---

## 4. Action Validation and Execution

How does each system check preconditions and apply state changes?

### TADS 3

TADS 3 uses **action methods** with **implicit preconditions**:

```tads3
class PutOnAction: TIAction
    // Preconditions checked automatically
    preCond = [touchObj, objVisible]

    // Verify phase - soft checks
    verifyDobjPutOn() {
        if (!isDraggable) illogical('{I} {can\'t} move that.');
    }

    // Check phase - hard checks
    checkDobjPutOn() {
        if (getWeight > supporter.maxWeight)
            failCheck(tooHeavyMsg);
    }

    // Action phase - mutation
    actionDobjPutOn() {
        moveInto(gIobj);  // gIobj = indirect object
        say('Done.');
    }
;
```

**Phases:**
1. **PreCond** - Automatic implicit actions (take if not held)
2. **Verify** - Soft checks (illogical suggestions)
3. **Check** - Hard preconditions (fail = block action)
4. **Action** - State mutation + output

**Key features:**
- Implicit actions (auto-take before put)
- Verify vs Check distinction (suggestion vs error)
- Preconditions are object properties
- Failure messages in check phase

### Inform 6

Inform 6 uses **before/after** rules:

```inform6
[ PutOnSub;
    ! Parser has already checked scope
    if (noun notin player) {
        print "You need to pick that up first.^";
        rtrue;
    }
    if (second hasnt supporter) {
        print "That's not a surface.^";
        rtrue;
    }
    move noun to second;
    print "You put ", (the) noun, " on ", (the) second, ".^";
];

! Objects can intercept
Object -> table "wooden table"
    with before [;
        PutOn: if (children(self) >= 5) {
            print "The table is full.^";
            rtrue;
        }
    ];
```

**Key features:**
- Single routine per action (PutOnSub)
- Objects intercept via `before` and `after`
- Return true to block, false to continue
- No formal phase separation

### Inform 7

Inform 7 uses **rulebooks** with **explicit phases**:

```inform7
Before putting something on something:
    if the noun is not carried, try taking the noun.

Check putting something on something:
    if the second noun is not a supporter:
        say "[The second noun] isn't a surface." instead.

Carry out putting something on something:
    now the noun is on the second noun.

Report putting something on something:
    say "You put [the noun] on [the second noun]."
```

**Phases:**
1. **Before** - Pre-processing, implicit actions
2. **Instead** - Replace default behavior entirely
3. **Check** - Preconditions (stop if failed)
4. **Carry out** - State mutation
5. **After** - Post-mutation, before report
6. **Report** - Generate output

**Key features:**
- Explicit named phases
- "Instead" for complete override
- Rules can be ordered (first/last)
- Natural language syntax

### Hugo

Hugo uses **action routines** with **informal checks**:

```hugo
routine DoPutOn
{
    if not Contains(player, object)
    {
        "You need to be carrying that."
        return false
    }
    if xobject is not supporter
    {
        "That's not a surface."
        return false
    }
    move object to xobject
    print "You put "; The(object); " on "; The(xobject); "."
    return true
}
```

**Key features:**
- Single routine per action
- Checks and execution interleaved
- Return true/false for success
- Straightforward procedural style

### Sharpee

Sharpee uses a **strict four-phase pattern**:

```typescript
const puttingOnAction: Action = {
  id: 'if.action.putting_on',

  // Phase 1: VALIDATE - Check preconditions (no mutations)
  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject!.entity!;
    const supporter = context.command.indirectObject!.entity!;

    // Scope check
    if (!context.canReach(item)) {
      return { valid: false, error: 'cant_reach', params: { item: item.name } };
    }

    // Trait check
    if (!supporter.has(TraitType.SUPPORTER)) {
      return { valid: false, error: 'not_a_surface', params: { target: supporter.name } };
    }

    // Capacity check
    const capacity = supporter.get(TraitType.SUPPORTER)!.capacity;
    if (getChildCount(supporter) >= capacity) {
      return { valid: false, error: 'supporter_full', params: { target: supporter.name } };
    }

    return { valid: true };
  },

  // Phase 2: EXECUTE - Apply mutations (no output)
  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const supporter = context.command.indirectObject!.entity!;

    // Capture pre-mutation state
    context.sharedData.previousLocation = context.world.getLocation(item.id);

    // THE MUTATION
    context.world.moveEntity(item.id, supporter.id);
  },

  // Phase 3: REPORT - Generate success events (read-only)
  report(context: ActionContext): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const supporter = context.command.indirectObject!.entity!;

    return [
      context.event('if.event.put_on', {
        item: item.name,
        itemId: item.id,
        supporter: supporter.name,
        supporterId: supporter.id,
        previousLocation: context.sharedData.previousLocation
      }),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: 'put_on',
        params: { item: item.name, supporter: supporter.name }
      })
    ];
  },

  // Phase 4: BLOCKED - Generate error events (on validation failure)
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        actionId: context.action.id,
        messageId: result.error,
        params: result.params
      })
    ];
  }
};
```

**Phases:**
1. **Validate** - Preconditions only, no mutations, returns pass/fail
2. **Execute** - Mutations only, no events
3. **Report** - Success events (semantic, not text)
4. **Blocked** - Error events (called instead of execute+report)

**Key features:**
- Strict separation: mutations in execute, events in report
- Events carry message IDs, not English text
- Language layer converts IDs to prose
- `sharedData` for inter-phase communication
- Validation result passed to blocked phase
- Multi-object support built into pattern

### Comparison Table: Action Execution

| Aspect | TADS 3 | Inform 6 | Inform 7 | Hugo | Sharpee |
|--------|--------|----------|----------|------|---------|
| Phases | PreCond/Verify/Check/Action | before/action/after | Before/Instead/Check/Carry out/After/Report | Single routine | Validate/Execute/Report/Blocked |
| Implicit actions | Built-in (preCond) | Manual | Before rules | Manual | Via event handlers |
| Mutation location | Action phase | In routine | Carry out | In routine | Execute only |
| Output location | In action | In routine | Report | In routine | Report (as events) |
| Override mechanism | Object methods | before blocks | Instead rules | Routine override | Entity event handlers |

---

## 5. Output and Response

How does each system generate player-facing text?

### TADS 3

TADS 3 uses **embedded text** and **message objects**:

```tads3
// Embedded in action
actionDobjTake() {
    "You pick up <<theName>>. ";
}

// Or via message objects
playerActionMessages: MessageHelper
    takeMsg = '{I} {take} {the dobj}. '
    alreadyHaveMsg = '{I} already {have} that. '
;
```

**Key features:**
- Template strings with placeholders
- Conjugation for perspective ({I}, {take})
- Message objects for i18n potential
- Text typically in action code

### Inform 6

Inform 6 uses **print statements** with **library messages**:

```inform6
[ PutOnSub;
    ! Direct printing
    print "You put ", (the) noun, " on ", (the) second, ".^";
];

! Or library messages
Object LibraryMessages
    with before [;
        PutOn: print "You put ", (the) noun, " on ", (the) second, ".^";
    ];
```

**Key features:**
- Direct print in routines
- Library message override for customization
- (the), (a), (The) for article handling
- ^caret for newlines

### Inform 7

Inform 7 uses **say phrases** with **text substitutions**:

```inform7
Report putting something on something:
    say "You put [the noun] on [the second noun]."

! Custom responses
Report taking the crystal ball:
    say "The ball pulses with inner light as you lift it."
```

**Key features:**
- Natural language say phrases
- Text substitutions [the noun], [a thing]
- Adaptive text (he/she/they)
- Unicode support

### Hugo

Hugo uses **print statements**:

```hugo
routine DoPutOn
{
    print "You put "; The(object); " on "; The(xobject); "."
}
```

**Key features:**
- Procedural print statements
- The(), Art() for articles
- Simple string concatenation
- Straightforward control

### Sharpee

Sharpee uses **semantic events** → **language layer**:

```typescript
// In action (report phase)
report(context): ISemanticEvent[] {
  return [
    context.event('action.success', {
      messageId: 'put_on',
      params: { item: 'book', supporter: 'table' }
    })
  ];
}

// In language layer (lang-en-us)
const puttingOnMessages = {
  put_on: (p) => `You put ${p.item} on ${p.supporter}.`,
  not_a_surface: (p) => `${p.target} isn't a surface.`,
  supporter_full: (p) => `There's no room on ${p.target}.`,
};
```

**Key features:**
- Complete separation: actions emit IDs, language layer emits text
- Enables true i18n (lang-es-mx, lang-de-de)
- Parameters passed to message functions
- Perspective handling in language layer
- Events can be intercepted/modified before rendering

### Comparison Table: Output

| Aspect | TADS 3 | Inform 6 | Inform 7 | Hugo | Sharpee |
|--------|--------|----------|----------|------|---------|
| Text location | In actions or messages | In routines | Say phrases | In routines | Language layer only |
| Substitution | Template strings | Print macros | [brackets] | Print calls | Function params |
| i18n support | Message objects | Library override | Limited | Limited | First-class (message IDs) |
| Article handling | {the}, {a} | (the), (a) | [the], [a] | The(), Art() | In language layer |

---

## 6. What Sharpee Kept vs. Modernized

### Kept from Classic Systems

| Concept | Origin | Sharpee Implementation |
|---------|--------|------------------------|
| Pattern-based grammar | All systems | Grammar builder with pattern matching |
| Scope concept | All systems | ScopeResolver with visibility/reachability |
| Action phases | Inform 7, TADS 3 | Four-phase pattern (validate/execute/report/blocked) |
| Trait/attribute system | All systems (has/hasnt) | TypeScript traits with behaviors |
| Multi-object commands | All systems (multi/all) | Built-in "all", "and", "except" handling |
| Implicit actions | TADS 3 preCond | Event handlers can trigger implicit takes |
| Object interception | Inform before/after | Entity event handlers |

### Modernized

| Concept | Classic Approach | Sharpee Approach |
|---------|------------------|------------------|
| Grammar binding | Grammar → routine | Grammar → action ID → action handler |
| Scope resolution | During parsing | After parsing (separate phase) |
| Text generation | In action code | Separate language layer (message IDs) |
| State management | Global variables | WorldModel with typed entities |
| Type safety | Runtime only | TypeScript compile-time checks |
| Action organization | Per-verb files | Grouped by semantic category |
| Extension points | Object methods, rule ordering | Event handlers, capability dispatch |
| Multi-object | Grammar-level (multi token) | Parser-level then action-level |
| Configuration | Compile flags | Runtime dependency injection |

### Key Philosophical Shifts

1. **Separation of Concerns**
   - Classic: Grammar, scope, action, and text often intermingled
   - Sharpee: Each concern in its own layer with clean interfaces

2. **Event-Driven Architecture**
   - Classic: Actions produce output directly
   - Sharpee: Actions produce events; language layer produces text

3. **Typed Everything**
   - Classic: Dynamic typing, runtime discovery
   - Sharpee: TypeScript types, compile-time validation

4. **Action as First-Class**
   - Classic: Actions tied to grammar patterns
   - Sharpee: Actions are independent handlers, grammar just routes to them

5. **Internationalization as Core**
   - Classic: Afterthought, message object hacks
   - Sharpee: Message IDs from day one, language layer separation

---

## 7. Pipeline Diagram Comparison

### Classic Model (Inform 6 style)

```
Input: "put book on table"
         ↓
┌────────────────────────────────────────┐
│  PARSER                                │
│  • Tokenize                            │
│  • Match grammar                       │
│  • Resolve entities (scope check)      │
│  • Populate noun/second globals        │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  ACTION ROUTINE                        │
│  • Check preconditions                 │
│  • Apply mutations                     │
│  • Generate output                     │
│  (all interleaved in one routine)      │
└────────────────────────────────────────┘
         ↓
Output: "You put the book on the table."
```

### Sharpee Model

```
Input: "put the red book on the wooden table"
         ↓
┌────────────────────────────────────────┐
│  PARSER (parser-en-us)                 │
│  • Tokenize                            │
│  • Match grammar patterns              │
│  • Output: IParsedCommand              │
│    (action ID + text slots, NO entities)│
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  VALIDATOR (stdlib)                    │
│  • Resolve entities from text          │
│  • Check scope (ScopeResolver)         │
│  • Disambiguate (adjectives, recency)  │
│  • Output: ValidatedCommand            │
│    (action ID + resolved entities)     │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  ACTION EXECUTOR (engine)              │
│  • Look up action handler              │
│  • Call validate() - preconditions     │
│    ├── Pass? → execute() + report()    │
│    └── Fail? → blocked()               │
│  • Output: ISemanticEvent[]            │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  EVENT PROCESSOR (engine)              │
│  • Call entity handlers                │
│  • Generate reaction events            │
│  • Sequence all events                 │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  LANGUAGE LAYER (lang-en-us)           │
│  • Map message IDs → prose             │
│  • Apply perspective                   │
│  • Format parameters                   │
│  • Output: final text                  │
└────────────────────────────────────────┘
         ↓
Output: "You put the red book on the wooden table."
```

---

## 8. Summary

Each system reflects its era and design goals:

- **TADS 3**: Most sophisticated classic system, OOP-based, multi-sensory scope, verify/check distinction
- **Inform 6**: Compact and efficient, Infocom heritage, tight grammar-scope coupling
- **Inform 7**: Natural language paradigm, explicit rulebook phases, accessible to non-programmers
- **Hugo**: Practical and straightforward, clear procedural model, good balance of power/simplicity
- **Sharpee**: Modern TypeScript, strict layer separation, event-driven, i18n-first, type-safe

Sharpee borrows liberally from all four systems while pushing toward:
- Stronger typing
- Cleaner separation of concerns
- First-class internationalization
- Event-driven extensibility

The core insight remains the same across all systems: **transform natural language into structured commands, validate them against world state, execute them, and report the results**. The differences lie in where boundaries are drawn and how flexibility is provided.
