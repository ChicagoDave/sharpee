/**
 * playable.ts — the `playable` role line.
 *
 * `playable` marks a character eligible to hold the player role. Only a
 * person can, so the word on any other block is reported at the line. The
 * flag itself is identity, set when the draft is created; this builder is
 * the gate.
 *
 * Public interface: playableBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-327 D10 — `playable` replaces the player block; `a person` is the floor.
 */
import type { EntityLineBuilder } from './context.js';

export const playableBuilder: EntityLineBuilder = {
  name: 'playable',
  requires: [],
  build(decl, entity, context) {
    const { isPerson, isPlayable } = entity;
    if (isPlayable && !isPerson) {
      const comp = decl.compositions.find(
        (c) => !c.article && c.words.length === 1 && c.words[0].toLowerCase() === 'playable',
      )!;
      context.diagnostics.error(
        'analysis.playable-non-person',
        `\`playable\` marks a character who can hold the player role — \`${decl.name.words.join(' ')}\` is not \`a person\`.`,
        comp.span,
      );
    }

  },
};
