/**
 * clauses.ts — the block's clause lines: `on`, `every turn`, `when <timer>
 * expires`, and `when <entity> moves`.
 *
 * Each clause lowers in the entity's own scope (`it` is this entity) with
 * the entity id as its owner key. Duplicate `on` heads are refused before
 * lowering; timer and move clauses are written only when the block has any,
 * so a block without them never carries the key.
 *
 * Public interface: clausesBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-325 D3e/D3h — `when <timer> expires` and `when <entity> moves`.
 */
import type { EntityLineBuilder } from './context.js';

export const clausesBuilder: EntityLineBuilder = {
  name: 'clauses',
  requires: [],
  build(decl, entity, context) {
    const { id, scope } = entity;
    entity.onClauses = context
      .checkDuplicateClauses(decl.onClauses, decl.name.words.join(' ').toLowerCase())
      .map((c, i) => context.buildOnClause(c, scope, id, i));
    if (decl.timerClauses.length > 0) {
      entity.timerClauses = decl.timerClauses.map((c, i) => context.buildTimerClause(c, scope, id, i));
    }
    if (decl.moveClauses.length > 0) {
      entity.moveClauses = decl.moveClauses.map((c, i) => context.buildMoveClause(c, scope, id, i));
    }
  },
};
