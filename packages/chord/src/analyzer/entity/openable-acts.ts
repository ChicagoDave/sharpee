/**
 * openable-acts.ts — the block's `opens when unlocked` and `closes when
 * switched off` lines: what an openable thing does on its own when the
 * player unlocks it or switches it off, lowered by the loader to its
 * openable trait's two flags. The builder refuses a second line of either
 * kind and keeps the first. Which blocks may carry a line is not decided
 * here: it is a fact of the finished IR, so `validateIR` owns it.
 *
 * Public interface: openableActsBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-392 D4 — the two lines and the IR flags they set.
 * - ADR-389 D4 — the IR's invariants have one home, `validateIR`.
 */
import type { OpenableActDecl } from '../../ast.js';
import type { EntityLineBuilder } from './context.js';

/** The spelling of each line, for the duplicate's message. */
const FORMS: Readonly<Record<OpenableActDecl['kind'], string>> = {
  'opens-when-unlocked': 'opens when unlocked',
  'closes-when-switched-off': 'closes when switched off',
};

export const openableActsBuilder: EntityLineBuilder = {
  name: 'openable-acts',
  requires: [],
  build(decl, entity, context) {
    const first = new Map<OpenableActDecl['kind'], OpenableActDecl>();
    for (const act of decl.openableActs) {
      const earlier = first.get(act.kind);
      if (earlier) {
        const code = act.kind === 'opens-when-unlocked' ? 'analysis.opens-when-duplicate' : 'analysis.closes-when-duplicate';
        context.diagnostics.error(
          code,
          `\`${decl.name.words.join(' ')}\` already says it ${FORMS[act.kind]} (line ${earlier.span.line}).`,
          act.span,
        );
        continue;
      }
      first.set(act.kind, act);
    }
    if (first.has('opens-when-unlocked')) entity.opensWhenUnlocked = true;
    if (first.has('closes-when-switched-off')) entity.closesWhenSwitchedOff = true;
  },
};
