/**
 * starts.ts — the block's `starts <state>` initializers.
 *
 * Each initializer needs its paired trait composed on the same entity
 * (`starts locked` needs `lockable`; `starts closed`/`open`, `openable`;
 * `starts off`/`on`, `switchable`). The pairing table is the one place a
 * future stateful trait extends; a mismatch is reported, never a silent
 * no-op. Reads the traits the compositions builder wrote.
 *
 * Public interface: startsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-231 D5a — the pairing gate and STARTS_STATE_PAIRINGS.
 */
import { STARTS_STATE_PAIRINGS } from '../../catalog.js';
import type { EntityLineBuilder } from './context.js';

export const startsBuilder: EntityLineBuilder = {
  name: 'starts',
  requires: ['compositions'],
  build(decl, entity, context) {
    const { traits, startsStates } = entity;
    // ADR-231 D5a pairing gate: each `starts <state>` initializer requires
    // its paired trait composed on the same entity (`starts locked` needs
    // `lockable`, `starts closed`/`open` need `openable`, `starts off`/`on`
    // need `switchable`). Table-driven — STARTS_STATE_PAIRINGS is the one
    // place future stateful traits extend. Mismatch = load-time error, never
    // a silent no-op.
    for (const s of decl.startsStates) {
      const requiredTrait = STARTS_STATE_PAIRINGS.get(s.state);
      if (!requiredTrait) continue; // parser already rejected the word
      if (!traits.some((t) => t.name === requiredTrait)) {
        context.diagnostics.error(
          'analysis.starts-state-pairing',
          `\`starts ${s.state}\` requires \`${requiredTrait}\` composed on this entity.`,
          s.span,
        );
        continue;
      }
      startsStates.push(s.state);
    }

  },
};
