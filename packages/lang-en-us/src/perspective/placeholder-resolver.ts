/**
 * Perspective Placeholder Resolver
 *
 * ADR-089 Phase D: Resolves perspective-aware placeholders in messages.
 *
 * Placeholders:
 * - {You} / {you} - Subject pronoun ("I", "You", "She")
 * - {Your} / {your} - Possessive adjective ("My", "Your", "Her")
 * - {Yours} / {yours} - Possessive pronoun ("Mine", "Yours", "Hers")
 * - {Yourself} / {yourself} - Reflexive ("Myself", "Yourself", "Herself")
 * - {You're} / {you're} - Contraction ("I'm", "You're", "She's")
 * - {verb} - Conjugated verb (e.g., {take} -> "take" or "takes")
 */

/**
 * Pronoun set for an entity (matches world-model PronounSet)
 *
 * Defined locally to avoid lang-en-us depending on world-model.
 * Engine should pass player pronouns when setting narrative context.
 */
export interface PronounSet {
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
 * Standard pronoun sets (matches world-model PRONOUNS)
 */
export const PRONOUNS = {
  HE_HIM: {
    subject: 'he', object: 'him', possessive: 'his',
    possessiveAdj: 'his', reflexive: 'himself', verbForm: 'singular' as const
  },
  SHE_HER: {
    subject: 'she', object: 'her', possessive: 'hers',
    possessiveAdj: 'her', reflexive: 'herself', verbForm: 'singular' as const
  },
  THEY_THEM: {
    subject: 'they', object: 'them', possessive: 'theirs',
    possessiveAdj: 'their', reflexive: 'themselves', verbForm: 'plural' as const
  },
} as const;

/**
 * Narrative perspective
 */
export type Perspective = '1st' | '2nd' | '3rd';

/**
 * Narrative settings for placeholder resolution
 */
export interface NarrativeContext {
  perspective: Perspective;
  playerPronouns?: PronounSet;
}

/**
 * Default narrative context (2nd person)
 */
export const DEFAULT_NARRATIVE_CONTEXT: NarrativeContext = {
  perspective: '2nd',
};

/**
 * The context whose conjugation is the 3rd-person-singular surface — the form
 * the phrase algebra's `Verb` atom takes as its lemma (ADR-199 §1). Used to
 * rewrite a bare perspective verb into a subject-agreeing `{verb:…}` atom.
 */
export const THIRD_SINGULAR_CONTEXT: NarrativeContext = {
  perspective: '3rd',
  playerPronouns: { subject: 'she', object: 'her', possessive: 'hers', possessiveAdj: 'her', reflexive: 'herself', verbForm: 'singular' },
};

/**
 * Common irregular verbs and their conjugations
 * Format: { base: [1st/2nd person, 3rd singular, 3rd plural] }
 */
const IRREGULAR_VERBS: Record<string, [string, string, string]> = {
  'be': ['are', 'is', 'are'],
  'have': ['have', 'has', 'have'],
  'do': ['do', 'does', 'do'],
  'go': ['go', 'goes', 'go'],
  'can': ["can", "can", "can"],
  "can't": ["can't", "can't", "can't"],
  'cannot': ['cannot', 'cannot', 'cannot'],
  'will': ['will', 'will', 'will'],
  "won't": ["won't", "won't", "won't"],
  'would': ['would', 'would', 'would'],
  "wouldn't": ["wouldn't", "wouldn't", "wouldn't"],
  'could': ['could', 'could', 'could'],
  "couldn't": ["couldn't", "couldn't", "couldn't"],
  'should': ['should', 'should', 'should'],
  "shouldn't": ["shouldn't", "shouldn't", "shouldn't"],
  'must': ['must', 'must', 'must'],
  "mustn't": ["mustn't", "mustn't", "mustn't"],
  'may': ['may', 'may', 'may'],
  'might': ['might', 'might', 'might'],
};

/**
 * Subject pronouns by perspective
 */
function getSubjectPronoun(context: NarrativeContext): string {
  switch (context.perspective) {
    case '1st':
      return 'I';
    case '2nd':
      return 'You';
    case '3rd':
      const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
      // Capitalize first letter
      return pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1);
  }
}

/**
 * Possessive adjectives by perspective ("my", "your", "her")
 */
function getPossessiveAdjective(context: NarrativeContext): string {
  switch (context.perspective) {
    case '1st':
      return 'my';
    case '2nd':
      return 'your';
    case '3rd':
      const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
      return pronouns.possessiveAdj;
  }
}

/**
 * Possessive pronouns by perspective ("mine", "yours", "hers")
 */
function getPossessivePronoun(context: NarrativeContext): string {
  switch (context.perspective) {
    case '1st':
      return 'mine';
    case '2nd':
      return 'yours';
    case '3rd':
      const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
      return pronouns.possessive;
  }
}

/**
 * Reflexive pronouns by perspective ("myself", "yourself", "herself")
 */
function getReflexivePronoun(context: NarrativeContext): string {
  switch (context.perspective) {
    case '1st':
      return 'myself';
    case '2nd':
      return 'yourself';
    case '3rd':
      const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
      return pronouns.reflexive;
  }
}

/**
 * "To be" contraction by perspective ("I'm", "You're", "She's")
 */
function getToBeContraction(context: NarrativeContext): string {
  switch (context.perspective) {
    case '1st':
      return "I'm";
    case '2nd':
      return "You're";
    case '3rd':
      const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
      const subject = pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1);
      // "They're" for plural, "She's/He's" for singular
      return pronouns.verbForm === 'plural' ? `${subject}'re` : `${subject}'s`;
  }
}

/**
 * Conjugate a verb based on perspective
 *
 * @param verb Base form of verb (e.g., "take", "open")
 * @param context Narrative context
 * @returns Conjugated verb
 */
export function conjugateVerb(verb: string, context: NarrativeContext): string {
  const lowerVerb = verb.toLowerCase();

  // 1st and 2nd person always use base form
  if (context.perspective === '1st' || context.perspective === '2nd') {
    // Check for irregular verbs
    if (IRREGULAR_VERBS[lowerVerb]) {
      return IRREGULAR_VERBS[lowerVerb][0];
    }
    return verb;
  }

  // 3rd person - check verb form (singular vs plural)
  const pronouns = context.playerPronouns || PRONOUNS.THEY_THEM;
  const isPlural = pronouns.verbForm === 'plural';

  // Check for irregular verbs
  if (IRREGULAR_VERBS[lowerVerb]) {
    return isPlural ? IRREGULAR_VERBS[lowerVerb][2] : IRREGULAR_VERBS[lowerVerb][1];
  }

  // Plural uses base form (they take)
  if (isPlural) {
    return verb;
  }

  // Singular 3rd person - add 's' or 'es'
  return addThirdPersonS(verb);
}

/**
 * Add third person singular 's' to a verb
 */
function addThirdPersonS(verb: string): string {
  const lower = verb.toLowerCase();

  // Verbs ending in -s, -sh, -ch, -x, -z, -o add -es
  if (lower.endsWith('s') || lower.endsWith('sh') || lower.endsWith('ch') ||
      lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('o')) {
    return verb + 'es';
  }

  // Verbs ending in consonant + y: change y to ies
  if (lower.endsWith('y') && lower.length > 1) {
    const secondLast = lower[lower.length - 2];
    if (!['a', 'e', 'i', 'o', 'u'].includes(secondLast)) {
      return verb.slice(0, -1) + 'ies';
    }
  }

  // Default: add 's'
  return verb + 's';
}

/**
 * Resolve perspective placeholders in a message
 *
 * Placeholders:
 * - {You} / {you} - Subject pronoun
 * - {Your} / {your} - Possessive adjective
 * - {Yours} / {yours} - Possessive pronoun
 * - {Yourself} / {yourself} - Reflexive
 * - {You're} / {you're} - Contraction
 * - {verb} - Any verb in curly braces gets conjugated
 *
 * @param message Message with placeholders
 * @param context Narrative context
 * @returns Message with resolved placeholders
 */
export function resolvePerspectivePlaceholders(
  message: string,
  context: NarrativeContext = DEFAULT_NARRATIVE_CONTEXT,
  params?: Record<string, unknown>
): string {
  // Subject pronoun
  message = message.replace(/\{You\}/g, getSubjectPronoun(context));
  message = message.replace(/\{you\}/g, getSubjectPronoun(context).toLowerCase());

  // Possessive adjective
  message = message.replace(/\{Your\}/g, capitalize(getPossessiveAdjective(context)));
  message = message.replace(/\{your\}/g, getPossessiveAdjective(context));

  // Possessive pronoun
  message = message.replace(/\{Yours\}/g, capitalize(getPossessivePronoun(context)));
  message = message.replace(/\{yours\}/g, getPossessivePronoun(context));

  // Reflexive
  message = message.replace(/\{Yourself\}/g, capitalize(getReflexivePronoun(context)));
  message = message.replace(/\{yourself\}/g, getReflexivePronoun(context));

  // Contraction
  message = message.replace(/\{You're\}/g, getToBeContraction(context));
  message = message.replace(/\{you're\}/g, getToBeContraction(context).toLowerCase());

  // Verb conjugation - match {verbname} patterns
  // Skip known non-verb placeholders
  const nonVerbPlaceholders = new Set([
    'item', 'target', 'container', 'direction', 'destination',
    'surface', 'key', 'door', 'actor', 'recipient', 'object',
    'room', 'count', 'score', 'turns', 'reason', 'message',
    'the', 'a', 'an', 'text', 'description', 'name'
  ]);

  message = message.replace(/\{([a-z][a-z']*)\}/gi, (match, verb) => {
    if (!isBareVerb(verb, params)) {
      return match; // a param or non-verb word — regular substitution / the parser
    }
    const conjugated = conjugateVerb(verb, context);
    // Preserve original capitalization pattern
    return verb[0] === verb[0].toUpperCase() ? capitalize(conjugated) : conjugated;
  });

  return message;
}

/**
 * Rewrite the `{You}` placeholder family and every bare perspective verb into
 * phrase-algebra forms anchored on the acting entity (ADR-328 D4), for a
 * message whose actor is NOT the player. The caller decides that (it knows the
 * narrative's player id); this function only rewrites. The rewritten template
 * renders through the Assembler, which agrees each verb with the actor's
 * number and person (ADR-199 §4 B) and applies the definite article — so
 * `{You} {take} {the item}.` becomes "The thief takes the lamp." for a unique
 * NPC, "Jack takes the lamp." for a proper-named one, and "The mercenaries take
 * the lamp." for a plural one.
 *
 * Forms: `{You}`/`{you}` → the actor as subject/object; `{Your}`/`{your}` (and
 * `{Yours}`/`{yours}`) → the actor's possessive (`'s`); `{You're}`/`{you're}` →
 * the actor + an agreeing "is"; `{Yourself}`/`{yourself}` → a reflexive pronoun
 * of the last-mentioned referent (ADR-197 — the actor, once named); a bare
 * `{verb}` → `{verb:<3rd-singular lemma> <actor>}`.
 *
 * @param message the template text
 * @param params the bound params (bare words that are params are left alone)
 * @param actorKey the param key the actor's NounPhrase is bound under
 * @returns the rewritten template, ready for `parsePhraseTemplate`
 */
export function expandActorPlaceholders(
  message: string,
  params: Record<string, unknown>,
  actorKey: string,
): string {
  const subject = `{the ${actorKey}}`;
  const subjectCap = `{capitalize the ${actorKey}}`;
  const is = `{verb:is ${actorKey}}`;

  // Longer forms first so `{You}` never eats the head of `{You're}`/`{Yourself}`.
  message = message
    .replace(/\{You're\}/g, `${subjectCap} ${is}`)
    .replace(/\{you're\}/g, `${subject} ${is}`)
    .replace(/\{Yourself\}/g, '{capitalize pronoun:reflexive}')
    .replace(/\{yourself\}/g, '{pronoun:reflexive}')
    .replace(/\{Yours\}/g, `${subjectCap}'s`)
    .replace(/\{yours\}/g, `${subject}'s`)
    .replace(/\{Your\}/g, `${subjectCap}'s`)
    .replace(/\{your\}/g, `${subject}'s`)
    .replace(/\{You\}/g, subjectCap)
    .replace(/\{you\}/g, subject);

  // Bare perspective verbs become subject-agreeing Verb atoms. The lemma the
  // atom wants is the 3rd-singular surface (ADR-199 §1), which the 3rd-person
  // conjugation already produces — irregulars ("be" → "is") included.
  return message.replace(/\{([a-z][a-z']*)\}/gi, (match, verb) => {
    if (!isBareVerb(verb, params)) return match;
    return `{verb:${conjugateVerb(verb, THIRD_SINGULAR_CONTEXT).toLowerCase()} ${actorKey}}`;
  });
}

/**
 * Whether a bare `{word}` is a perspective verb to conjugate rather than a param
 * or a reserved non-verb name. With params known (the phrase path), any bare
 * word that is not bound is a verb — story and action verbs need no central
 * registration; without params, a fixed pattern list decides.
 */
function isBareVerb(verb: string, params?: Record<string, unknown>): boolean {
  const lowerVerb = verb.toLowerCase();
  if (nonVerbPlaceholders.has(lowerVerb)) return false;
  if (params) {
    return !(verb in params || lowerVerb in params);
  }
  return verbPatterns.some((pattern) => pattern.test(lowerVerb));
}

/** Placeholder names that are never verbs, even when no params are known. */
const nonVerbPlaceholders = new Set([
  'item', 'target', 'container', 'direction', 'destination',
  'surface', 'key', 'door', 'actor', 'recipient', 'object',
  'room', 'count', 'score', 'turns', 'reason', 'message',
  'the', 'a', 'an', 'text', 'description', 'name'
]);

/** Verb shapes recognized when no params are known (the legacy string path). */
const verbPatterns = [
  /^(take|get|drop|put|open|close|lock|unlock|give|show|wear|remove)$/i,
  /^(eat|drink|touch|smell|listen|look|examine|search|read|attack)$/i,
  /^(push|pull|turn|switch|climb|enter|exit|go|wait|sleep|wake)$/i,
  /^(lift|carry|hold|throw|catch|break|fix|use|try|need|want)$/i,
  /^(see|hear|feel|find|know|think|say|tell|ask|answer)$/i,
  /^(be|have|do|can|can't|will|won't|would|could|should|must|may|might)$/i,
  /^[a-z]+'t$/i, // Contractions like "can't", "don't"
  // Additional verbs for action templates
  /^(respond|greet|introduce|swing|graze|land|punch|kick|smash|destroy|strike)$/i,
  /^(quaff|gulp|sip|nibble|taste|devour|munch|doze|fall|enjoy)$/i,
  /^(sniff|detect|discover|insert|adjust|lower|raise|tug|drag|press)$/i,
  /^(inform|grow|toss|poke|prod|pat|stroke|crank|rotate|spin)$/i,
  /^(toggle|apply|activate|greet|acknowledge)$/i,
];

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
