/**
 * exits.ts — the block's exit lines: `<direction> to <room>`, the passage
 * line, `is blocked`, `is deadly`, and the room-wide `deadly:` marker.
 *
 * Exit targets and `through` doors resolve like any entity reference; an
 * unresolved one is the standard unknown-entity error and leaves '' so the
 * door graph check skips what is already reported. A passage is one-way by
 * construction, so a `, one-way` on its line is refused with the fix-it to
 * remove it; a blocked or deadly line naming a passage must name one the
 * room declares, by any of its forms, and lowers under the passage's
 * canonical key. An exit line's `while` lowers to its condition and its
 * `admits` to the list the vehicle builder's resolver reads. Blocked lines
 * on one direction compose in declaration order, so a line after a
 * condition-less one can never fire and is reported as unreachable. The
 * conditional deadly exit is not wired and is refused here rather than at
 * load. Every phrase key an exit line names is required to exist. Whether
 * the block is a room at all is the host gate's question.
 *
 * A region's exit-table rows lower through the same `lowerExit` once every
 * entity is built (the analyzer's `applyExitTables`); a row carries no
 * tails, so it passes no tail resolvers.
 *
 * Public interface: exitsBuilder, lowerExit(), passageKeyOfForm().
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-234 D1 — `through the <door>` resolves as an entity reference.
 * - ADR-227 — deadly exits and the `deadly:` room marker.
 * - ADR-378 D1, D3, D6 — the passage line, `while` and `admits` on an exit line.
 * - GH #315 — the unreachable blocked-line warning.
 * - Platform-issue-sweep Phase 8 #15d — `is deadly while` fails at compile.
 */
import type { ConditionNode, ExitDecl, NameRef } from '../../ast.js';
import type { IRCondition, IRExit } from '../../ir.js';
import type { EntityLineBuilder } from './context.js';
import { resolveAdmitsWord } from './vehicle.js';

/** The key prefix a passage exit carries (ADR-378 D1): `passage:<first form, hyphenated>`. */
export const PASSAGE_KEY_PREFIX = 'passage:';

/**
 * The passage key one written form would name: lowercased, words hyphenated.
 * @param form the words as written
 */
export function passageKeyOfForm(form: string): string {
  return `${PASSAGE_KEY_PREFIX}${form.toLowerCase().split(' ').join('-')}`;
}

/** The resolvers an exit line's tails need; absent on a table row, which carries none. */
export interface ExitTailResolvers {
  resolveCondition: (condition: ConditionNode) => IRCondition;
  resolveAdmits: (ref: NameRef) => string | null;
}

/**
 * Lower one parsed exit to the IR — the one lowering for a room's exit
 * lines, a passage line and a region's exit-table rows (ADR-360 D3), so
 * they cannot drift.
 * @param e the parsed exit
 * @param resolve entity-name resolution (reports an unresolved name)
 * @param tails the `while` and `admits` resolvers (ADR-378); omitted on a table row
 * @returns the IR exit; '' marks an unresolved destination or door
 */
export function lowerExit(e: ExitDecl, resolve: (ref: NameRef) => string | null, tails?: ExitTailResolvers): IRExit {
  const admits = tails && e.admits
    ? e.admits.map((ref) => tails.resolveAdmits(ref)).filter((w): w is string => w !== null).filter((w, i, all) => all.indexOf(w) === i)
    : undefined;
  return {
    direction: e.direction,
    ...(e.passage ? { passage: e.passage } : {}),
    // ADR-366 D7: `to outside` names no entity — the loader resolves it to
    // the containing vehicle's room on each use. Whether the room is aboard
    // a vehicle at all is the vehicle builder's gate.
    to: e.toOutside ? '' : (resolve(e.to) ?? ''),
    via: e.via ? (resolve(e.via) ?? '') : null,
    // A passage is one-way by construction (ADR-378 D1): the loader infers
    // no reverse from its key, so the flag is never written for it.
    ...(e.oneWay && !e.passage ? { oneWay: true as const } : {}),
    ...(e.toOutside ? { toOutside: true as const } : {}),
    ...(tails && e.condition ? { condition: tails.resolveCondition(e.condition) } : {}),
    ...(admits ? { admits } : {}),
    span: e.span,
  };
}

export const exitsBuilder: EntityLineBuilder = {
  name: 'exits',
  requires: [],
  build(decl, entity, context) {
    const { scope } = entity;
    const tails: ExitTailResolvers = {
      resolveCondition: (condition) => context.resolveCondition(condition, scope),
      resolveAdmits: (ref) => resolveAdmitsWord(ref, context),
    };
    entity.exits = decl.exits.map((e) => lowerExit(e, (ref) => context.resolveEntityId(ref), tails));
    for (const e of decl.exits) {
      if (e.passage && e.oneWay) {
        context.diagnostics.error(
          'analysis.passage-one-way',
          `A passage is one-way by construction — there is no opposite of \`${e.passage[0]}\`, so no reverse is ever inferred. Remove \`, one-way\`.`,
          e.span,
        );
      }
    }
    // ADR-378 D1: a blocked or deadly line names a passage by any of its
    // forms and lowers under the passage's canonical key.
    const passages = decl.exits.filter((e) => e.passage);
    const passageKeyOf = (written: string, span: typeof decl.span): string => {
      if (!written.startsWith(PASSAGE_KEY_PREFIX)) return written;
      const declared = passages.find((p) => p.passage!.some((form) => passageKeyOfForm(form) === written));
      if (declared) return declared.direction;
      const form = written.slice(PASSAGE_KEY_PREFIX.length).split('-').join(' ');
      context.diagnostics.error(
        'analysis.passage-unknown',
        `\`${entity.name}\` declares no passage \`${form}\`${
          passages.length > 0 ? ` — its passages are ${passages.map((p) => `\`${p.passage![0]}\``).join(', ')}` : ''
        }. A blocked or deadly passage line names a passage the room declares, by any of its forms.`,
        span,
      );
      return written;
    };
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
        direction: passageKeyOf(b.direction, b.span),
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
        direction: passageKeyOf(d.direction, d.span),
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
