/**
 * exits.ts — the block's exit lines: `<direction> to <room>`, `is blocked`,
 * `is deadly`, and the room-wide `deadly:` marker.
 *
 * Exit targets and `through` doors resolve like any entity reference; an
 * unresolved one is the standard unknown-entity error and leaves '' so the
 * door graph check skips what is already reported. Blocked lines on one
 * direction compose in declaration order, so a line after a condition-less
 * one can never fire and is reported as unreachable. The conditional deadly
 * exit is not wired and is refused here rather than at load. Every phrase
 * key an exit line names is required to exist. Whether the block is a room
 * at all is the host gate's question.
 *
 * Public interface: exitsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-234 D1 — `through the <door>` resolves as an entity reference.
 * - ADR-227 — deadly exits and the `deadly:` room marker.
 * - GH #315 — the unreachable blocked-line warning.
 * - Platform-issue-sweep Phase 8 #15d — `is deadly while` fails at compile.
 */
import type { EntityLineBuilder } from './context.js';

export const exitsBuilder: EntityLineBuilder = {
  name: 'exits',
  requires: [],
  build(decl, entity, context) {
    const { scope } = entity;
    entity.exits = decl.exits.map((e) => ({
      direction: e.direction,
      to: context.resolveEntityId(e.to) ?? '',
      via: e.via ? (context.resolveEntityId(e.via) ?? '') : null,
      ...(e.oneWay ? { oneWay: true as const } : {}),
      span: e.span,
    }));
    entity.blockedExits = decl.blockedExits.map((b, i) => {
      context.requirePhrase(b.phraseKey, b.span);
      // The first line whose condition holds supplies the refusal, and a
      // condition-less line always holds — so anything after one on the same
      // direction is dead, and says so at compile time.
      const shadowedBy = decl.blockedExits.findIndex(
        (earlier, j) => j < i && earlier.direction === b.direction && !earlier.condition,
      );
      if (shadowedBy !== -1) {
        context.diagnostics.warning(
          'analysis.blocked-exit-unreachable',
          `This \`${b.direction} is blocked\` line can never fire: the condition-less \`${b.direction} is blocked\` line above it always supplies the refusal first. Blocked lines compose in declaration order — put the condition-less fallback last.`,
          b.span,
        );
      }
      return {
        direction: b.direction,
        phraseKey: b.phraseKey,
        condition: b.condition ? context.resolveCondition(b.condition, scope) : null,
        span: b.span,
      };
    });
    entity.deadlyExits = decl.deadlyExits.map((d) => {
      context.requirePhrase(d.phraseKey, d.span);
      // The conditional form is post-scope; the loader keeps a defensive
      // throw as the backstop, but the author reads it here as a diagnostic.
      if (d.condition !== null) {
        context.diagnostics.error(
          'analysis.deadly-while-unsupported',
          '`is deadly while <condition>` is not wired yet — the conditional deadly exit is post-scope. Use an unconditional `is deadly:` or an `on going` clause with `kill the player when <condition>`.',
          d.span,
        );
      }
      return {
        direction: d.direction,
        phraseKey: d.phraseKey,
        condition: d.condition ? context.resolveCondition(d.condition, scope) : null,
        span: d.span,
      };
    });
    if (decl.deadly) {
      context.requirePhrase(decl.deadly.phraseKey, decl.deadly.span);
      entity.deadly = { phraseKey: decl.deadly.phraseKey, span: decl.deadly.span };
    } else {
      entity.deadly = null;
    }
  },
};
