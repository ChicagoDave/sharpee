/**
 * character-host.ts — character lines compose only on a person.
 *
 * The fourteen character line kinds (mood, feels, knows, thinks, spreads,
 * goal, influence, resists, temperament, never, protects, answers, code,
 * honor, burdened by) describe someone with an inner life; on a thing or a
 * place they would compile to nothing. The first such line on a non-person
 * block is reported once, and the character and normative builders that
 * follow skip a non-person entirely. A gate spanning line kinds, so it runs
 * ahead of the builders it governs.
 *
 * Public interface: characterHostBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-310 D3/D14 — the person-only rule for character declaration lines.
 * - ADR-318 — the normative lines join the same gate.
 */
import type { EntityLineBuilder } from './context.js';

export const characterHostBuilder: EntityLineBuilder = {
  name: 'character-host',
  requires: [],
  build(decl, entity, context) {
    const { isPerson } = entity;
    const firstCharacterLine =
      decl.moods[0] ??
      decl.feels[0] ??
      decl.knows[0] ??
      decl.thinks[0] ??
      decl.spreads[0] ??
      decl.goals[0] ??
      decl.influences[0] ??
      decl.resists[0] ??
      decl.temperaments[0] ??
      decl.nevers[0] ??
      decl.obligations[0] ??
      decl.codes[0] ??
      decl.honors[0] ??
      decl.burdens[0];
    if (firstCharacterLine && !isPerson) {
      context.diagnostics.error(
        'analysis.character-line-person-only',
        `Character declaration lines (mood, feels, knows, thinks, spreads, goal, influence, resists, temperament, never, protects, answers, code, honor, burdened by) compose only on a person — \`${decl.name.words.join(' ')}\` is not a person.`,
        firstCharacterLine.span,
      );
    }
  },
};
