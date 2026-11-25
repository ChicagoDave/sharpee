/**
 * singular-plural.ts — the block's `singular` or `plural` declaration and the
 * forms it gives the name and the aka words.
 *
 * Every thing and door is declared `singular` or `plural`, once and
 * unconditionally; a room or region is declared neither, and a person may
 * be declared or not (Amendment 3) — an undeclared person has no forms. A bare declaration
 * takes the locale's suffix rule for the name's last word, and is refused
 * where the rule cannot tell the other form (an unsafe ending, a stopword
 * inside the name, a proper person's name); `plural of <singular>` /
 * `singular of <plural>` writes the form instead. Each aka word with a safe
 * ending gets its other form by the same rule, and one with an unsafe ending
 * answers only as written. The forms are written into the draft once, here;
 * the runtime works nothing out.
 *
 * Public interface: singularPluralBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-409 D1 — the declaration on every thing and door; not rooms or regions.
 * - ADR-409 Amendment 3 — a person need not be declared.
 * - ADR-409 D2 — the suffix rules, unsafe endings, stopword names, proper people.
 * - ADR-409 D3 — `of <form>`, always allowed as an override.
 */
import type { CompositionItem } from '../../ast.js';
import { otherFormOfPhrase, workOutAkaForms, type SingularOrPlural } from '../../forms.js';
import type { EntityLineBuilder } from './context.js';

/**
 * The kinds that are places: named by movement and `look`, never declared
 * singular or plural. An expanse (ADR-376 D2) is a bounded space with
 * coordinates, a place as a room is.
 */
const PLACE_KINDS: ReadonlySet<string> = new Set(['room', 'region', 'expanse']);

/** The bare word of a composition, lowercased, when it is a single word with no article. */
function bareWord(comp: CompositionItem): string | null {
  return !comp.article && comp.words.length === 1 ? comp.words[0].toLowerCase() : null;
}

/** The form a written `of` gives: the plural of a singular thing, the singular of a plural one. */
function otherOf(declared: SingularOrPlural): SingularOrPlural {
  return declared === 'singular' ? 'plural' : 'singular';
}

export const singularPluralBuilder: EntityLineBuilder = {
  name: 'singular-plural',
  requires: ['compositions'],
  build(decl, entity, context) {
    const { diagnostics, singularPluralFacts } = context;
    const name = entity.name;
    const declarations = decl.compositions.filter((c) => {
      const word = bareWord(c);
      return word === 'singular' || word === 'plural';
    });
    const kinds = entity.kinds.map((k) => k.name);

    if (kinds.some((k) => PLACE_KINDS.has(k))) {
      for (const d of declarations) {
        diagnostics.error(
          'analysis.singular-plural-on-place',
          `\`${name}\` is a place — rooms and regions are not declared \`singular\` or \`plural\`; remove \`${d.words[0]}\`.`,
          d.span,
        );
      }
      return;
    }
    // A block with no kind is refused by its own gate; there is nothing to declare.
    if (kinds.length === 0) return;

    // Amendment 3: a person need not be declared; undeclared, it has no forms.
    if (declarations.length === 0 && entity.isPerson) return;
    if (declarations.length === 0) {
      diagnostics.error(
        'analysis.singular-plural-missing',
        `\`${name}\`: declare \`singular\` or \`plural\` — every thing and door says whether its name is written singular or plural.`,
        decl.name.span,
      );
      return;
    }
    if (declarations.length > 1) {
      diagnostics.error(
        'analysis.singular-plural-twice',
        `\`${name}\` is declared \`${declarations[0].words[0]}\` already — a name is singular or plural, not both; keep one declaration.`,
        declarations[1].span,
      );
      return;
    }

    const declaration = declarations[0];
    const declared = bareWord(declaration) as SingularOrPlural;
    if (declaration.condition) {
      diagnostics.error(
        'analysis.singular-plural-conditional',
        `Singular or plural is not conditional — \`${declared} while …\` is not supported; \`${name}\` is ${declared} or it is not.`,
        declaration.span,
      );
      return;
    }

    const written = declaration.config.find((c) => c.key.join(' ') === 'of');
    const isProperPerson = entity.isPerson && decl.compositions.some((c) => bareWord(c) === 'proper');
    let other: { form: string; origin: 'written' | 'worked-out' };
    // An `of` with no form was refused by the parser (`parse.singular-plural-of`).
    if (written && written.value === '') return;
    if (written) {
      other = { form: written.value, origin: 'written' };
    } else if (isProperPerson) {
      diagnostics.error(
        'analysis.singular-plural-proper-name',
        `\`${name}\` is a proper name, which gets no worked-out form — write \`${declared} of <its ${otherOf(declared)}>\`.`,
        declaration.span,
      );
      return;
    } else {
      const result = otherFormOfPhrase(name, declared, singularPluralFacts);
      if ('reason' in result) {
        const lastWord = name.split(/\s+/).pop() ?? name;
        diagnostics.error(
          result.reason === 'stopword-inside' ? 'analysis.singular-plural-stopword-name' : 'analysis.singular-plural-unsafe-ending',
          result.reason === 'stopword-inside'
            ? `\`${name}\`: write \`${declared} of <its ${otherOf(declared)}>\` — a name with a small word inside it has its head before its last word, so the rule cannot tell its other form.`
            : `\`${name}\`: write \`${declared} of <its ${otherOf(declared)}>\` — the rule cannot tell the other form of \`${lastWord}\`.`,
          declaration.span,
        );
        return;
      }
      other = { form: result.form, origin: 'worked-out' };
    }

    // A proper person answers only to what the author wrote (ADR-409 D2).
    const aka = isProperPerson ? [] : workOutAkaForms(entity.aka, declared, [name, other.form, ...entity.aka], singularPluralFacts);
    // Both forms are filled; the name is the declared one (ADR-409 Amendment 2).
    entity.forms = {
      singular: declared === 'singular' ? name : other.form,
      plural: declared === 'plural' ? name : other.form,
      origin: other.origin,
      aka,
    };
  },
};
