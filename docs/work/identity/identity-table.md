# Identity System Reference (ADR-089)

Quick reference for the pronoun and identity system implemented in `@sharpee/world-model`.

## Pronoun Sets

Available via `PRONOUNS` constant from `@sharpee/world-model`:

| Key | Subj | Obj | Poss | Adj | Refl | Verb |
|-----|------|-----|------|-----|------|------|
| `HE_HIM` | he | him | his | his | himself | sing |
| `SHE_HER` | she | her | hers | her | herself | sing |
| `THEY_THEM` | they | them | theirs | their | themselves | plur |
| `XE_XEM` | xe | xem | xyrs | xyr | xemself | sing |
| `ZE_ZIR` | ze | zir | zirs | zir | zirself | sing |
| `ZE_HIR` | ze | hir | hirs | hir | hirself | sing |
| `EY_EM` | ey | em | eirs | eir | emself | sing |
| `FAE_FAER` | fae | faer | faers | faer | faerself | sing |

**Legend**: Subj=Subject, Obj=Object, Poss=Possessive, Adj=Possessive Adjective, Refl=Reflexive, Verb=Verb Form (sing=singular, plur=plural)

**Note**: Singular "they" uses plural verb forms ("they are", not "they is").

## Honorifics

Available via `HONORIFICS` constant:

| Key | Value | Usage |
|-----|-------|-------|
| `MR` | Mr. | Mr. Smith |
| `MRS` | Mrs. | Mrs. Smith |
| `MS` | Ms. | Ms. Smith |
| `MX` | Mx. | Mx. Smith (gender-neutral) |
| `MISS` | Miss | Miss Smith |
| `DR` | Dr. | Dr. Smith |
| `PROF` | Prof. | Prof. Smith |

## Grammatical Gender

For localization in gendered languages. **Separate from pronouns!**

| Value | Use Case | Languages |
|-------|----------|-----------|
| `masculine` | Male grammatical agreement | French "il", German "er", Spanish "él" |
| `feminine` | Female grammatical agreement | French "elle", German "sie", Spanish "ella" |
| `neuter` | Neuter grammatical agreement | German "es", Swedish default |
| `common` | Common gender | Swedish "hen", Dutch common gender |

## Grammatical Number (Inanimate Objects)

For entities without `ActorTrait`:

| Value | Pronoun | Example |
|-------|---------|---------|
| `singular` (default) | it | "Take **it**" (the lamp) |
| `plural` | them | "Take **them**" (the coins) |

## Usage Examples

```typescript
import { ActorTrait, PRONOUNS, HONORIFICS } from '@sharpee/world-model';

// NPC with she/her pronouns
const alice = new ActorTrait({
  pronouns: PRONOUNS.SHE_HER,
  honorific: HONORIFICS.DR,
  briefDescription: 'the scientist'
});

// NPC with he/they pronouns (multiple sets)
const alex = new ActorTrait({
  pronouns: [PRONOUNS.HE_HIM, PRONOUNS.THEY_THEM]
});

// Get primary pronouns (first in array)
alex.getPrimaryPronouns();  // Returns HE_HIM

// Custom neopronouns
const custom = new ActorTrait({
  pronouns: {
    subject: 'ne',
    object: 'nem',
    possessive: 'nes',
    possessiveAdj: 'nes',
    reflexive: 'nemself',
    verbForm: 'singular'
  }
});
```

## Message Placeholders (Phase D)

Available in message templates for perspective-aware rendering:

| Placeholder | 1st | 2nd | 3rd (she) | 3rd (they) |
|-------------|-----|-----|-----------|------------|
| `{You}` | I | You | She | They |
| `{you}` | i | you | she | they |
| `{Your}` | My | Your | Her | Their |
| `{your}` | my | your | her | their |
| `{Yourself}` | Myself | Yourself | Herself | Themselves |
| `{yourself}` | myself | yourself | herself | themselves |
| `{You're}` | I'm | You're | She's | They're |
| `{verb}` | take | take | takes | take |

**Example:**
```typescript
// Message template
"{You} {can't} take {yourself}."

// 2nd person: "You can't take yourself."
// 1st person: "I can't take myself."
// 3rd person (she): "She can't take herself."
```

## Story Configuration

```typescript
// stories/my-story/src/index.ts
export const storyConfig: StoryConfig = {
  id: 'my-story',
  title: 'My Story',
  // Optional - defaults to 2nd person
  narrative: {
    perspective: '1st',  // or '3rd'
    playerPronouns: PRONOUNS.SHE_HER,  // for 3rd person
  },
};
```

## Related Files

- ADR: `docs/architecture/adrs/adr-089-pronoun-identity-system.md`
- ActorTrait: `packages/world-model/src/traits/actor/actorTrait.ts`
- NarrativeSettings: `packages/engine/src/narrative/narrative-settings.ts`
- Pronoun Context: `packages/parser-en-us/src/pronoun-context.ts`
- Placeholder Resolver: `packages/lang-en-us/src/perspective/placeholder-resolver.ts`

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Expand pronoun system (world-model) | Done |
| B | Pronoun context in parser | Done |
| C | NarrativeSettings (engine) | Done |
| D | Message placeholders (lang-en-us) | Done |
| E | Advanced verb conjugation | Future |
