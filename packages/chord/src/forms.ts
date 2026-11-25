/**
 * forms.ts — working out a name's other form, its plural from its singular
 * or its singular from its plural, by a locale's suffix rules (ADR-409 D2).
 *
 * The rules are data: the story's locale declares them (`StdlibLocaleFacts.
 * formRules`, carried from the language by `./repokit manifest`), so this
 * module holds no English and a new locale brings its own rules. They are
 * applied to one word, a phrase's last word, and never to a phrase with a
 * stopword inside it (`pot of gold`), whose head is not its last word.
 * Nothing here reads a word list: an ending the rules mark unsafe has no
 * worked-out form, and the author writes it with `of` (D3).
 *
 * Public interface: SingularOrPlural, SingularPluralFacts, NoFormReason,
 * otherFormOfWord(), otherFormOfPhrase(), workOutAkaForms().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { FormRewrite, FormRules } from './stdlib-manifest.js';

/** What a thing or door is declared, and a person may be: `singular` or `plural` (ADR-409 D1). */
export type SingularOrPlural = 'singular' | 'plural';

/** What the rules read from a locale: its suffix rules and its name stopwords. */
export interface SingularPluralFacts {
  readonly formRules: FormRules;
  readonly nameStopwords: readonly string[];
}

/**
 * The first rewrite whose ending (and preceding letter, when it names one)
 * the word matches.
 * @param lower the word, lowercased
 * @param rewrites the rewrites, tried in order
 */
function firstRewrite(lower: string, rewrites: readonly FormRewrite[]): FormRewrite | null {
  for (const rewrite of rewrites) {
    if (!lower.endsWith(rewrite.ending)) continue;
    if (rewrite.after) {
      const before = lower.charAt(lower.length - rewrite.ending.length - 1);
      if (before === '' || !rewrite.after.includes(before)) continue;
    }
    if (rewrite.drop > 0 && rewrite.drop >= lower.length) continue; // a rewrite never empties the word
    return rewrite;
  }
  return null;
}

/**
 * One word's other form by the rules: its plural when it is singular, its
 * singular when it is plural; null when its ending is unsafe or no rewrite
 * applies.
 * @param word the word as written
 * @param declared whether the word is written singular or plural
 * @param rules the locale's suffix rules
 * @returns the other form, keeping the word's own letters, or null
 */
export function otherFormOfWord(word: string, declared: SingularOrPlural, rules: FormRules): string | null {
  if (word.length === 0) return null;
  const lower = word.toLowerCase();
  const unsafe = declared === 'singular' ? rules.unsafeSingularEndings : rules.unsafePluralEndings;
  if (unsafe.some((ending) => lower.endsWith(ending))) return null;
  const rewrite = firstRewrite(lower, declared === 'singular' ? rules.toPlural : rules.toSingular);
  if (!rewrite) return null;
  const form = word.slice(0, word.length - rewrite.drop) + rewrite.add;
  return form.length > 0 && form.toLowerCase() !== lower ? form : null;
}

/** Why a phrase has no worked-out form. */
export type NoFormReason = 'unsafe-ending' | 'stopword-inside';

/**
 * A phrase's other form: its last word rewritten, the rest as written. A
 * phrase with any of the locale's name stopwords in it has its head
 * elsewhere, so the rules do not touch it.
 * @param phrase the name or aka phrase as written
 * @param declared whether the phrase is written singular or plural
 * @param facts the locale's rules and stopwords
 * @returns the form, or the reason there is none
 */
export function otherFormOfPhrase(
  phrase: string,
  declared: SingularOrPlural,
  facts: SingularPluralFacts,
): { form: string } | { reason: NoFormReason } {
  const words = phrase.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return { reason: 'unsafe-ending' };
  if (words.some((w) => facts.nameStopwords.includes(w.toLowerCase()))) return { reason: 'stopword-inside' };
  const last = otherFormOfWord(words[words.length - 1], declared, facts.formRules);
  if (last === null) return { reason: 'unsafe-ending' };
  return { form: [...words.slice(0, -1), last].join(' ') };
}

/**
 * The worked-out other forms of an entity's aka words (ADR-409 D2): each aka
 * phrase with a safe ending and no stopword inside gets one, unless it is a
 * form the entity already writes. The rest answer only as written.
 * @param aka the aka phrases as written
 * @param declared whether the entity is declared singular or plural
 * @param written every phrase the entity already writes (name, its written form, aka)
 * @param facts the locale's rules and stopwords
 */
export function workOutAkaForms(
  aka: readonly string[],
  declared: SingularOrPlural,
  written: readonly string[],
  facts: SingularPluralFacts,
): { word: string; form: string }[] {
  const taken = new Set(written.map((w) => w.toLowerCase()));
  const out: { word: string; form: string }[] = [];
  for (const word of aka) {
    const result = otherFormOfPhrase(word, declared, facts);
    if (!('form' in result) || taken.has(result.form.toLowerCase())) continue;
    taken.add(result.form.toLowerCase());
    out.push({ word, form: result.form });
  }
  return out;
}
