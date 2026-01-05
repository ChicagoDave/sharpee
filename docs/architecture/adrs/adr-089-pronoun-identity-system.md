# ADR-089: Pronoun and Identity System

## Status
PROPOSED

## Context

The parser needs to resolve pronouns like "it", "him", "her", "them" to entities. A naive implementation would just track "last direct object" for "it" resolution. However, this misses broader requirements:

1. **Narrative perspective** - Stories can be written in 1st ("I"), 2nd ("You"), or 3rd ("She") person
2. **Player identity** - Authors may want players to choose or define their pronouns
3. **NPC pronouns** - "give her the book" needs to know which NPC is "her"
4. **Inclusive design** - Support for they/them and neopronouns
5. **Localization** - Other languages have different pronoun/gender systems

### Current State

- No pronoun tracking in parser
- No identity/gender traits on entities
- Messages hardcoded to 2nd person ("You can't do that")
- No way for authors to define PC or NPC pronouns

### Use Cases

**Parser Resolution:**
```
> take the lamp
Taken.
> light it          ← "it" = the lamp
You light the lamp.

> talk to Alice
Alice waves.
> give her the key  ← "her" = Alice
You give Alice the key.
```

**Narrative Perspective:**
```typescript
// 2nd person (default, Zork-style)
"You can't go that way."

// 1st person (Anchorhead-style)
"I can't go that way."

// 3rd person (some experimental IF)
"She can't go that way."
```

**Player Identity:**
```
At game start:
"What pronouns should I use for you?"
> they/them

Later:
"They pick up the sword."  // 3rd person narrative
"You pick up the sword."   // 2nd person with they/them stored for NPCs referring to PC
```

## Decision

Implement a three-part system:

1. **IdentityTrait** (world-model) - Pronouns and gender for any entity
2. **NarrativeSettings** (engine) - Story-level perspective configuration
3. **PronounContext** (parser) - Runtime tracking for "it/them" resolution

### Part 1: IdentityTrait

```typescript
// packages/world-model/src/traits/identity/IdentityTrait.ts

/**
 * Pronoun set for an entity
 */
interface PronounSet {
  /** Nominative case: "he", "she", "they", "xe" */
  subject: string;
  /** Accusative case: "him", "her", "them", "xem" */
  object: string;
  /** Possessive pronoun (standalone): "his", "hers", "theirs", "xyrs" */
  possessive: string;
  /** Possessive adjective (before noun): "his", "her", "their", "xyr" */
  possessiveAdj: string;
  /** Reflexive: "himself", "herself", "themselves", "xemself" */
  reflexive: string;
  /** Verb agreement: 'singular' or 'plural' (they takes plural verbs) */
  verbForm: 'singular' | 'plural';
}

/**
 * Standard pronoun sets - Traditional binary
 */
const PRONOUNS = {
  HE_HIM: {
    subject: 'he', object: 'him', possessive: 'his',
    possessiveAdj: 'his', reflexive: 'himself', verbForm: 'singular'
  },
  SHE_HER: {
    subject: 'she', object: 'her', possessive: 'hers',
    possessiveAdj: 'her', reflexive: 'herself', verbForm: 'singular'
  },
  IT: {
    subject: 'it', object: 'it', possessive: 'its',
    possessiveAdj: 'its', reflexive: 'itself', verbForm: 'singular'
  },

  // Gender-neutral and non-binary
  THEY_THEM: {
    subject: 'they', object: 'them', possessive: 'theirs',
    possessiveAdj: 'their', reflexive: 'themselves', verbForm: 'plural'  // "they are", not "they is"
  },

  // Common neopronouns
  XE_XEM: {
    subject: 'xe', object: 'xem', possessive: 'xyrs',
    possessiveAdj: 'xyr', reflexive: 'xemself', verbForm: 'singular'
  },
  ZE_ZIR: {
    subject: 'ze', object: 'zir', possessive: 'zirs',
    possessiveAdj: 'zir', reflexive: 'zirself', verbForm: 'singular'
  },
  ZE_HIR: {
    subject: 'ze', object: 'hir', possessive: 'hirs',
    possessiveAdj: 'hir', reflexive: 'hirself', verbForm: 'singular'
  },
  EY_EM: {
    subject: 'ey', object: 'em', possessive: 'eirs',
    possessiveAdj: 'eir', reflexive: 'emself', verbForm: 'singular'
  },
  FAE_FAER: {
    subject: 'fae', object: 'faer', possessive: 'faers',
    possessiveAdj: 'faer', reflexive: 'faerself', verbForm: 'singular'
  },
} as const;

/**
 * Standard honorifics/titles
 */
const HONORIFICS = {
  MR: 'Mr.',
  MRS: 'Mrs.',
  MS: 'Ms.',
  MX: 'Mx.',       // Gender-neutral
  MISS: 'Miss',
  DR: 'Dr.',
  PROF: 'Prof.',
  // Authors can use any string for custom titles
} as const;

/**
 * Identity trait for entities with pronouns
 */
interface IdentityTrait {
  /**
   * Pronouns for this entity. Can be:
   * - A single PronounSet (most common)
   * - An array of PronounSets for people who use multiple (e.g., he/they)
   *   First in array is "primary" for parser resolution; all are valid for reference
   */
  pronouns: PronounSet | PronounSet[];

  /**
   * Optional honorific/title: "Mr.", "Ms.", "Mx.", "Dr.", etc.
   * Used when formally addressing: "Dr. Smith", "Mx. Chen"
   */
  honorific?: string;

  /**
   * Optional semantic gender for grammatical agreement in gendered languages.
   * IMPORTANT: This is separate from pronouns and identity!
   * - A person using they/them may specify 'masculine' for French "il" agreement
   * - A person using she/her may specify 'neuter' for Finnish (no gendered pronouns)
   * - 'common' is for languages with common gender (Swedish "hen")
   */
  grammaticalGender?: 'masculine' | 'feminine' | 'neuter' | 'common';

  /**
   * Is this entity animate? Affects default pronoun resolution:
   * - animate: true → uses identity pronouns for "him/her/them"
   * - animate: false or undefined → defaults to "it"
   */
  animate?: boolean;

  /**
   * Optional self-description for disambiguation prompts.
   * If not provided, uses entity name.
   * Example: "the tall woman", "the barista", "your friend Sam"
   */
  briefDescription?: string;
}
```

### Neopronoun Reference

For authors unfamiliar with neopronouns, here's a quick reference:

| Pronoun Set | Subject | Object | Possessive | Possessive Adj | Reflexive | Example Sentence |
|-------------|---------|--------|------------|----------------|-----------|------------------|
| he/him | he | him | his | his | himself | "He takes his sword." |
| she/her | she | her | hers | her | herself | "She takes her sword." |
| they/them | they | them | theirs | their | themselves | "They take their sword." |
| xe/xem | xe | xem | xyrs | xyr | xemself | "Xe takes xyr sword." |
| ze/zir | ze | zir | zirs | zir | zirself | "Ze takes zir sword." |
| ze/hir | ze | hir | hirs | hir | hirself | "Ze takes hir sword." |
| ey/em | ey | em | eirs | eir | emself | "Ey takes eir sword." |
| fae/faer | fae | faer | faers | faer | faerself | "Fae takes faer sword." |

**Custom pronouns**: Authors can create any `PronounSet` - just fill in all fields consistently.

### Multiple Pronoun Sets

Some people use multiple pronoun sets (e.g., "he/they", "she/they", "any pronouns"). The system supports this:

```typescript
// Character who uses he/they
const alex = world.createEntity('alex', 'Alex', {
  identity: {
    pronouns: [PRONOUNS.HE_HIM, PRONOUNS.THEY_THEM],  // Both valid
    animate: true,
  },
});

// Character who uses any pronouns
const jordan = world.createEntity('jordan', 'Jordan', {
  identity: {
    pronouns: [PRONOUNS.HE_HIM, PRONOUNS.SHE_HER, PRONOUNS.THEY_THEM],
    animate: true,
  },
});
```

**Parser behavior with multiple pronouns:**
- The **first** pronoun set is used for parser resolution ("give him the book" → Alex)
- All pronoun sets in the array are valid for reference
- NPCs referring to the character can rotate or use any from the list (author choice)

**NPC dialogue generation** (future consideration):
```typescript
// Story can configure how NPCs refer to multi-pronoun characters
world.setIdentityOptions({
  multiPronounBehavior: 'first' | 'rotate' | 'random',
});
```

**Usage in stories:**

```typescript
// NPC with she/her pronouns
const alice = world.createEntity('alice', 'Alice', {
  identity: { pronouns: PRONOUNS.SHE_HER, animate: true },
  // ...
});

// NPC with they/them pronouns
const sam = world.createEntity('sam', 'Sam', {
  identity: { pronouns: PRONOUNS.THEY_THEM, animate: true },
  // ...
});

// Inanimate object (defaults to "it")
const lamp = world.createEntity('lamp', 'brass lamp', {
  // No identity trait = defaults to IT pronouns
});

// Player character
const player = world.createEntity('player', 'yourself', {
  identity: { pronouns: PRONOUNS.THEY_THEM, animate: true },
  actor: { isPlayer: true },
});
```

### Part 2: NarrativeSettings

**Approved model**: Set narrative perspective via `StoryConfig` at story definition time. This is immutable after game start.

```typescript
// stories/my-story/src/index.ts
export const storyConfig: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  author: 'Author Name',

  // Optional - defaults to '2nd' if omitted
  narrative: {
    perspective: '1st',  // Only specify if NOT using 2nd person
  },
};
```

**Default**: 2nd person ("You take the lamp") - the standard IF convention. Authors only need to specify `narrative.perspective` for 1st or 3rd person stories.

**Interface definition:**

```typescript
// packages/engine/src/narrative/narrative-settings.ts

type Perspective = '1st' | '2nd' | '3rd';
type Tense = 'present' | 'past';  // Future consideration

interface NarrativeSettings {
  /**
   * Narrative perspective for player actions
   * - '1st': "I take the lamp" (rare, Anchorhead)
   * - '2nd': "You take the lamp" (default, Zork)
   * - '3rd': "She takes the lamp" (experimental)
   */
  perspective: Perspective;

  /**
   * For 3rd person: which pronoun set to use for the PC
   * Derived from player entity's IdentityTrait if not specified
   */
  playerPronouns?: PronounSet;
}

// Default settings
const DEFAULT_NARRATIVE: NarrativeSettings = {
  perspective: '2nd',
};
```

**Impact on lang layer:**

Messages would use placeholders that the text service resolves:

```typescript
// packages/lang-en-us/src/actions/taking.ts
const messages = {
  'if.action.taking.success': '{You} {take} {the:target}.',
  'if.action.taking.tooHeavy': '{You} {can't} lift {the:target}.',
};

// Resolution based on perspective:
// 2nd person: "You take the lamp."
// 1st person: "I take the lamp."
// 3rd person (she/her): "She takes the lamp."
```

The `{You}` placeholder resolves based on perspective:
- 1st: "I"
- 2nd: "You"
- 3rd: player's subject pronoun

The `{take}` placeholder conjugates based on perspective/number:
- 1st/2nd: "take"
- 3rd singular: "takes"
- 3rd plural (they): "take"

### Part 3: PronounContext (Parser)

```typescript
// packages/parser-en-us/src/pronoun-context.ts

interface EntityReference {
  entityId: string;
  text: string;         // How player referred to it ("the lamp")
  turnNumber: number;   // When it was set
}

interface PronounContext {
  // Inanimate singular - last direct object that's not animate
  it: EntityReference | null;

  // Plural - last list, "all" result, or plural entity
  them: EntityReference[] | null;

  // Animate by pronoun - keyed by object pronoun
  // "him" → entity using he/him
  // "her" → entity using she/her
  // Note: "them" for animate singular handled specially
  animateByPronoun: Map<string, EntityReference>;

  // Last successful command (for "again"/"g")
  lastCommand: IParsedCommand | null;
}
```

**Resolution logic:**

```typescript
resolvePronouns(token: string, context: PronounContext, world: WorldModel): EntityReference[] | null {
  switch (token.toLowerCase()) {
    case 'it':
      return context.it ? [context.it] : null;

    case 'them':
      // Could be plural OR singular they/them
      if (context.them) return context.them;
      const themEntity = context.animateByPronoun.get('them');
      return themEntity ? [themEntity] : null;

    case 'him':
      const himEntity = context.animateByPronoun.get('him');
      return himEntity ? [himEntity] : null;

    case 'her':
      const herEntity = context.animateByPronoun.get('her');
      return herEntity ? [herEntity] : null;

    default:
      return null;
  }
}
```

**Updating context after successful parse:**

```typescript
updatePronounContext(command: IParsedCommand, context: PronounContext, world: WorldModel): void {
  const target = command.directObject;
  if (!target) return;

  const entity = world.getEntity(target.entityId);
  if (!entity) return;

  const identity = entity.get<IdentityTrait>('identity');
  const ref: EntityReference = {
    entityId: entity.id,
    text: target.text,
    turnNumber: world.getTurnNumber(),
  };

  if (!identity?.animate) {
    // Inanimate → "it"
    context.it = ref;
  } else {
    // Animate → store by object pronoun
    const objectPronoun = identity.pronouns.object;
    context.animateByPronoun.set(objectPronoun, ref);

    // Also update "it" for animate objects (some players say "pet it")
    // But animateByPronoun takes precedence in resolution
  }

  // Handle lists
  if (command.directObject?.isList && command.directObject.items) {
    context.them = command.directObject.items.map(item => ({
      entityId: item.entityId,
      text: item.text,
      turnNumber: world.getTurnNumber(),
    }));
  }
}
```

## Verb Conjugation and Singular They

English verb conjugation depends on grammatical number, not gender. The `verbForm` field in `PronounSet` handles this:

```typescript
// Singular pronouns: "he takes", "she walks", "xe runs"
{ verbForm: 'singular' }  → verb + 's' in 3rd person present

// Plural pronouns: "they take", "they walk", "they run"
{ verbForm: 'plural' }    → base verb in 3rd person present
```

**Important**: Singular "they" uses **plural verb forms**:
- "They **are** here" (not "they is")
- "They **take** the sword" (not "they takes")
- "**Are** they coming?" (not "is they")

This is standard English grammar - singular "they" has been used for centuries and always takes plural verbs.

### Conjugation Implementation

```typescript
// Simple conjugation for 3rd person present tense
function conjugate(verb: string, pronounSet: PronounSet): string {
  if (pronounSet.verbForm === 'plural') {
    return verb;  // "they take"
  }
  // Singular: add 's' (simplified - real impl handles irregulars)
  return verb + 's';  // "he takes"
}

// "To be" special case
function conjugateToBe(pronounSet: PronounSet): string {
  return pronounSet.verbForm === 'plural' ? 'are' : 'is';
}
```

## NPC-to-NPC and NPC-to-PC References

When NPCs speak about other characters (including the player), they need to use correct pronouns. The system provides helpers:

```typescript
// In lang layer or story code
function describeAction(actor: IFEntity, target: IFEntity, verb: string): string {
  const actorIdentity = actor.get<IdentityTrait>('identity');
  const targetIdentity = target.get<IdentityTrait>('identity');

  const actorPronoun = getPrimaryPronoun(actorIdentity);  // First in array
  const targetPronoun = getPrimaryPronoun(targetIdentity);

  // "She gives him the book" or "They give them the book"
  return `${actorPronoun.subject} ${conjugate(verb, actorPronoun)} ${targetPronoun.object} the book.`;
}
```

**NPC dialogue about the player:**

```typescript
// Story can configure how NPCs refer to the PC
// Option 1: Use PC's pronouns in 3rd person
"The guard looks at you. 'They seem trustworthy,' he mutters."

// Option 2: Use "you" even in reported speech (more natural)
"The guard looks at you. 'You seem trustworthy,' he says."
```

**Guidance for authors:**
- In 2nd person narrative, NPCs can use "you" when addressing the player
- When NPCs talk *about* the player to others, use the player's pronouns
- When NPCs talk about other NPCs, always use that NPC's pronouns

## Localization and Cultural Considerations

### Languages with Grammatical Gender

Many languages have grammatical gender unrelated to personal identity:

| Language | System | Notes |
|----------|--------|-------|
| French | M/F | Nouns have gender; "la table" (F), "le livre" (M) |
| German | M/F/N | Three genders; adjective agreement required |
| Spanish | M/F | Gender-neutral "e" ending gaining acceptance ("elle") |
| Swedish | Common/Neuter | Personal pronoun "hen" is gender-neutral |
| Finnish | None | No gendered pronouns at all ("hän" = he/she/they) |
| Japanese | None | Pronouns rarely used; context-dependent |

**Design decision**: `grammaticalGender` is separate from `pronouns`:

```typescript
// A non-binary character in a French IF game
const character = world.createEntity('char', 'Alex', {
  identity: {
    pronouns: PRONOUNS.THEY_THEM,      // English: they/them
    grammaticalGender: 'masculine',     // French: "il" for verb agreement
    // Or use 'neuter' if the story uses "iel" (French neo-pronoun)
  },
});
```

### Neo-pronouns in Other Languages

Some languages are developing neo-pronouns:

| Language | Neo-pronoun | Notes |
|----------|-------------|-------|
| French | iel, ael | Blend of il/elle |
| Spanish | elle | Gender-neutral -e ending |
| Swedish | hen | Now official, widely used |
| German | xier, sier | Various proposals, none dominant |
| Portuguese | elu | Gender-neutral variant |

The system supports these via custom `PronounSet` definitions in locale-specific lang packages.

### Locale-Specific PronounSet Extensions

```typescript
// packages/lang-fr-fr/src/pronouns.ts
const PRONOUNS_FR = {
  IL: { subject: 'il', object: 'le', possessive: 'le sien', ... },
  ELLE: { subject: 'elle', object: 'la', possessive: 'la sienne', ... },
  IEL: { subject: 'iel', object: 'læ', possessive: 'le sien', ... },  // Neo-pronoun
};
```

### "Neutral" Languages

For languages without gendered pronouns (Finnish, Estonian, Turkish, Hungarian, etc.):
- The `PronounSet` still works, just with one standard option
- `grammaticalGender` may still matter for adjective agreement in some cases
- The architecture doesn't assume English-centric binary

## Consequences Outside Dungeo

### For All Stories

1. **Default behavior unchanged** - Stories that don't set identity traits get current behavior (2nd person, "it" for objects)

2. **Opt-in complexity** - Authors only engage with pronouns/perspective if they want non-default behavior

3. **Player identity choice** - Stories CAN offer pronoun selection at start, but don't have to

### For Lang Layer

1. **Message templates** - Would need `{You}`, `{you}`, `{Your}` placeholders
   - Can be done incrementally - existing hardcoded messages still work
   - New/updated messages can use placeholders

2. **Verb conjugation** - `{take}` vs `{takes}` based on perspective
   - Requires conjugation table or library
   - Only needed for 3rd person singular

3. **Localization impact** - Other languages have:
   - Grammatical gender (French: "la lampe" vs "le livre")
   - Different pronoun systems
   - This design separates `grammaticalGender` from `pronouns` to support this

### For Parser

1. **Scope queries** - Need to find entities by pronoun
   - "give him the book" → find animate entities using he/him in scope
   - If multiple matches → disambiguation

2. **Ambiguity** - "give her the book" with two she/her NPCs present
   - Use existing disambiguation system (Phase 2)
   - Score by recency (most recently mentioned)

### For Engine

1. **Text service changes** - Needs to resolve `{You}` placeholders
   - Access to NarrativeSettings
   - Access to player entity's IdentityTrait

2. **Turn context** - PronounContext lives in parser, updated each turn

### For Clients

1. **Pronoun selection UI** - Optional story feature
   - Story emits event: `if.event.identity.prompt`
   - Client shows UI for selection
   - Player response updates player entity

## Implementation Phases

### Phase A: IdentityTrait (world-model)
- Add IdentityTrait with PronounSet
- Add standard pronoun constants
- Default "it" pronouns for entities without trait
- **No breaking changes** - purely additive

### Phase B: PronounContext (parser)
- Add pronoun tracking after successful parse
- Resolve "it" to last inanimate direct object
- Resolve "him/her/them" to animate entities by pronoun
- **Enables**: "take lamp. light it"

### Phase C: NarrativeSettings (engine)
- Add NarrativeSettings to engine config
- Default to 2nd person
- **No message changes yet** - just infrastructure

### Phase D: Message Placeholders (lang-en-us)
- Add placeholder resolution to text service
- Update high-frequency messages first
- Gradual migration of remaining messages
- **Enables**: 1st and 3rd person narratives

### Phase E: Verb Conjugation
- Add conjugation for 3rd person singular
- Only needed if story uses 3rd person perspective
- Can use library or simple lookup table

## Alternatives Considered

### 1. Simple "it" tracking only

Just track last object for "it" resolution, ignore gender/perspective.

**Rejected because:**
- Misses "give her the book" use case
- Would need to redesign later for perspective support
- Leaves accessibility/inclusivity on the table

### 2. Gender enum instead of PronounSet

Use `gender: 'male' | 'female' | 'nonbinary'` and derive pronouns.

**Rejected because:**
- Conflates identity with pronouns (not all nonbinary people use they/them)
- Doesn't support neopronouns
- Assumes English pronoun mapping

### 3. Perspective in lang layer only

Handle perspective entirely in message templates.

**Rejected because:**
- Parser still needs pronoun resolution
- Engine needs to know perspective for text service
- Would duplicate logic

## Open Questions

1. **Pronoun selection timing** - Should this be at game start, or changeable mid-game?
   - Recommendation: Changeable via story action, but most stories set at start
   - Some players may want to change pronouns mid-game (exploring identity)

2. **Multiple animate entities with same pronouns** - How to disambiguate?
   - Recommendation: Use recency + disambiguation system from Phase 2

3. **"Myself"/"yourself" for PC** - Special case?
   - Recommendation: Yes, PC reflexive pronoun handled specially in 2nd person

4. **Animal pronouns** - Is a dog "it" or "him/her"?
   - Recommendation: Author choice via IdentityTrait. Default to "it" for non-actor animate.
   - Named pets often get gendered pronouns; wild animals often "it"

5. **Verb conjugation library** - Build or import?
   - Recommendation: Simple lookup for common verbs, can expand later
   - Consider: https://github.com/plurals/pluralize or similar

6. **Parser recognition of neopronouns** - Should "give xem the book" work?
   - Recommendation: Yes, register all object pronouns from entities in scope
   - Parser needs access to PronounSet definitions at parse time

7. **Pronoun in room descriptions** - "You see Alice. She is here."
   - Recommendation: Use author-set `briefDescription` or fall back to name
   - Pronouns can appear in auto-generated "is here" text

8. **Deadnaming/misgendering protection** - Should system prevent this?
   - Recommendation: Engine uses current IdentityTrait; no history access
   - Story authors responsible for NPC dialogue respecting identities

9. **Player pronoun UI** - Standard component or story-specific?
   - Recommendation: Provide default event + CLI/web component
   - Stories can override with custom UI

10. **Multiple pronouns in parser** - "give him the book" when target uses he/they?
    - Recommendation: Match any pronoun in the array, resolve to entity
    - First pronoun in array for system-generated text

## Testing Considerations

When testing pronoun implementation:

1. **Singular they with plural verbs** - "They are here", not "They is here"
2. **Possessive vs possessive adjective** - "That's theirs" vs "their sword"
3. **Multiple pronoun sets** - Both "him" and "them" resolve to same entity
4. **Neo-pronouns in parser** - "give xem the book" finds xe/xem entity
5. **Honorific + name** - "Dr. Smith", "Mx. Chen" render correctly
6. **Cross-NPC reference** - NPC A talks about NPC B using B's pronouns

## References

- ADR-087: Action-Centric Grammar
- ADR-088: Slot Consumer Refactor
- Inform 7: Chapter 3.17 (Men, women and animals)
- Inform 7: Chapter 14.1 (Tense and narrative viewpoint)
- Emily Short on pronouns: https://emshort.blog/
- GLAAD Media Reference Guide: https://glaad.org/reference
- Neopronoun.org: https://neopronoun.org/ (pronoun reference)
- Pronoun Island: https://pronoun.is/ (test your pronouns)
- Wikipedia: Singular They: https://en.wikipedia.org/wiki/Singular_they
- Swedish "hen": https://en.wikipedia.org/wiki/Hen_(pronoun)
