/**
 * identity.ts — the block's `proper` and `pronouns` lines.
 *
 * `proper` composes on any block — a place, a shop, an institution is a name
 * as much as a person is — but never conditionally: identity is not turn
 * state, and `proper while …` is reported here so the author reads the
 * specific reason. `pronouns <word>` is a person line, at most one, and the
 * word must be one of the standard four or a `define pronouns` set; no
 * default is injected when the line is absent.
 *
 * Public interface: identityBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-242 D1 as extended by GH #342 — `proper` on any block, unconditional.
 * - ADR-242 D5 and Q-2 — `pronouns`, person-only, no injected default.
 */
import { PRONOUN_WORDS } from '../../catalog.js';
import type { EntityLineBuilder } from './context.js';

export const identityBuilder: EntityLineBuilder = {
  name: 'identity',
  requires: [],
  build(decl, entity, context) {
    const { isPerson } = entity;
    // ADR-242 D1 as extended by GH #342 (David, 2026-08-30): `proper`
    // composes on ANY create block — a place-as-scenery, a shop, an
    // institution is a name as much as a person is. The person-only gate
    // is retired; the unconditional gate stays (identity is not turn
    // state), an analyzer diagnostic so the author reads the specific
    // reason, not the loader's generic conditional-composition error.
    for (const comp of decl.compositions) {
      if (comp.article || comp.words.join(' ').toLowerCase() !== 'proper') continue;
      if (comp.condition) {
        context.diagnostics.error(
          'analysis.proper-conditional',
          'Identity is not conditional — `proper while …` is not supported; a name is proper or it is not.',
          comp.span,
        );
      }
    }

    // ADR-242 D5: `pronouns <word>` — person-only, at most one line, and
    // the word resolves against the standard four or a `define pronouns`
    // set (never guessed; nearest-match suggestion on a miss, ruled Q-2:
    // no default is injected when the line is absent).
    let pronouns: string | undefined;
    if (decl.pronouns.length > 0) {
      if (!isPerson) {
        context.diagnostics.error(
          'analysis.pronouns-person-only',
          `\`pronouns\` is a person line — \`${decl.name.words.join(' ')}\` is not a person.`,
          decl.pronouns[0].span,
        );
      }
      for (const extra of decl.pronouns.slice(1)) {
        context.diagnostics.error('analysis.pronouns-duplicate', 'This `create` block already has a `pronouns` line.', extra.span);
      }
      const word = decl.pronouns[0].word;
      if (PRONOUN_WORDS.has(word) || context.pronounSetDecls.has(word)) {
        if (isPerson) pronouns = word;
      } else {
        const known = [...PRONOUN_WORDS, ...context.pronounSetDecls.keys()];
        context.diagnostics.error(
          'analysis.unknown-pronouns',
          `\`${word}\` is not a pronoun set — the standard sets are ${[...PRONOUN_WORDS].map((w) => `\`${w}\``).join(', ')}, plus any \`define pronouns\` set${context.suggestText(word, known)}.`,
          decl.pronouns[0].span,
        );
      }
    }

    entity.pronouns = pronouns;
  },
};
