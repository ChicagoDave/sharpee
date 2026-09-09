/**
 * normative-lines.ts — what a person will not do: `temperament`, `never`,
 * the obligation lines, `code`, `honor`, and `burdened by`.
 *
 * A temperament binds a named definition, or synthesizes one from an inline
 * ordering or a `with` override (its name carries `@`, unreachable from
 * author words), at most one live per state. Code bundles flatten first,
 * then the bare `never` and obligation lines union in, exact duplicates
 * refused. At most one `honor` line, the full platform bundle or a named
 * subset. A burden must be a held topic, so pre-story guilt over something
 * unknown is refused at compile. A non-person block was already reported by
 * the character host gate and is skipped here.
 *
 * Public interface: normativeLinesBuilder.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-318 D3/D7 — temperament bindings and the per-state tie gate.
 * - ADR-318 D4/D5 — principles and obligations; code bundles flatten in reference order.
 * - ADR-318 D7 — one honor declaration; D8 — `burdened by` needs the topic held.
 * - ADR-310 D4 — `with` overrides fold as profile overrides do.
 */
import { CHARACTER_MANIFEST } from '../../character-manifest.js';
import type { IRHonorDecl, IRObligationEntry, IRPrincipleEntry } from '../../ir.js';
import type { Span } from '../../span.js';
import { normalizeTopic } from '../topic.js';
import type { EntityLineBuilder } from './context.js';

export const normativeLinesBuilder: EntityLineBuilder = {
  name: 'normative-lines',
  requires: ['character-host', 'character-lines'],
  build(decl, entity, context) {
    if (!entity.isPerson) return;
    const { id, knows, temperaments, principles, obligations, burdenedBy } = entity;
    let honor: IRHonorDecl | undefined;
    // ADR-318 D3/D7: temperament bindings. Named defs resolve; inline
    // orderings and `with` overrides synthesize defs (`@` in the name —
    // unreachable from author kebab words, so no collision with `define
    // temperament` names). At most one binding live per state (the tie
    // gate D3 names, same shape as D16's phrasebook tie).
    let synthesized = 0;
    for (const t of decl.temperaments) {
      let defName: string;
      if (t.name !== null) {
        const base = context.temperamentDefs.get(t.name);
        if (!base) {
          context.diagnostics.error(
            'analysis.unknown-temperament',
            `No \`define temperament\` named \`${t.name}\`${context.suggestText(t.name, [...context.temperamentDefs.keys()].filter((n) => !n.includes('@')))}.`,
            t.span,
          );
          continue;
        }
        if (t.pairs.length === 0) {
          defName = t.name;
        } else {
          // `with` overrides fold as in ADR-310 D4: an override replaces
          // any base pair over the same two forces, and adds otherwise.
          const overrides = context.resolveForcePairs(t.pairs, `this \`${t.name}\` override`);
          const folded = base.pairs.filter(([a, b]) => !overrides.some(([c, d]) => (a === c && b === d) || (a === d && b === c)));
          folded.push(...overrides);
          defName = `${id}@temperament-${++synthesized}`;
          context.temperamentDefs.set(defName, { name: defName, pairs: folded, span: t.span });
        }
      } else {
        const pairs = context.resolveForcePairs(t.pairs, 'this temperament');
        if (pairs.length === 0) continue; // every pair errored above
        defName = `${id}@temperament-${++synthesized}`;
        context.temperamentDefs.set(defName, { name: defName, pairs, span: t.span });
      }
      if (t.while) {
        const states = context.byId.get(id)?.states ?? [];
        if (!states.includes(t.while.word)) {
          context.diagnostics.error(
            'analysis.temperament-unknown-state',
            `\`${t.while.word}\` is not a declared state of \`${decl.name.words.join(' ')}\` — a temperament binds to a word from the entity's \`states:\` line.`,
            t.while.span,
          );
          continue;
        }
      }
      const clash = temperaments.find((e) => (e.while ?? null) === (t.while?.word ?? null));
      if (clash) {
        context.diagnostics.error(
          'analysis.temperament-tie',
          t.while
            ? `Two temperaments bound to \`${t.while.word}\` — at most one may be live per state; give each its own state.`
            : `This block already has an unconditional \`temperament\` line — at most one may be live; bind one to a state with \`while <state>\`.`,
          t.span,
        );
        continue;
      }
      temperaments.push({ name: defName, ...(t.while ? { while: t.while.word } : {}), span: t.span });
    }
    // ADR-318 D4/D5: principles and obligations — `code` bundles flatten
    // first (in reference order), then the bare lines union in. An exact
    // duplicate (category + scope + except) is dead weight, refused.
    const principleKey = (p: IRPrincipleEntry) =>
      JSON.stringify({ category: p.category, scope: p.scope ?? null, except: p.except ?? null });
    const obligationKey = (o: IRObligationEntry) => JSON.stringify({ kind: o.kind, scope: o.scope ?? null });
    const addPrinciple = (p: IRPrincipleEntry, span: Span): void => {
      if (principles.some((e) => principleKey(e) === principleKey(p))) {
        context.diagnostics.error(
          'analysis.principle-duplicate',
          `This block already holds \`never ${context.categorySurface(p.category)}\`${p.scope || p.except ? ' with the same scope' : ''}.`,
          span,
        );
        return;
      }
      principles.push({ ...p, span });
    };
    const addObligation = (o: IRObligationEntry, span: Span): void => {
      if (obligations.some((e) => obligationKey(e) === obligationKey(o))) {
        context.diagnostics.error('analysis.obligation-duplicate', `This block already holds \`${o.kind}\` with the same scope.`, span);
        return;
      }
      obligations.push({ ...o, span });
    };
    for (const ref of decl.codes) {
      const bundle = context.codes.get(ref.name);
      if (!bundle) {
        context.diagnostics.error(
          'analysis.unknown-code',
          `No \`define code\` named \`${ref.name}\`${context.suggestText(ref.name, [...context.codes.keys()])}.`,
          ref.span,
        );
        continue;
      }
      for (const p of bundle.principles) addPrinciple(p, ref.span);
      for (const o of bundle.obligations) addObligation(o, ref.span);
    }
    for (const n of decl.nevers) {
      const p = context.resolveNeverLine(n);
      if (p) addPrinciple(p, n.span);
    }
    for (const o of decl.obligations) {
      const r = context.resolveObligationLine(o);
      if (r) addObligation(r, o.span);
    }
    // ADR-318 D7: at most one honor declaration; the full platform
    // bundle for `honor before`, the named bundle's subset otherwise.
    for (const h of decl.honors) {
      if (honor !== undefined) {
        context.diagnostics.error('analysis.honor-duplicate', 'This block already has an `honor` line.', h.span);
        continue;
      }
      let faceActs: string[];
      if (h.name !== null) {
        const bundle = context.honorDefs.get(h.name);
        if (!bundle) {
          context.diagnostics.error(
            'analysis.unknown-honor',
            `No \`define honor\` named \`${h.name}\`${context.suggestText(h.name, [...context.honorDefs.keys()])}.`,
            h.span,
          );
          continue;
        }
        faceActs = [...bundle];
      } else {
        faceActs = [...CHARACTER_MANIFEST.faceActs];
      }
      const scope = context.resolveScopeRefDecl(h.scope);
      if (scope === null) continue;
      const except = h.except.map((e) => context.resolveEntityId(e)).filter((eid): eid is string => eid !== null);
      honor = { scope, except, faceActs, span: h.span };
    }
    // ADR-318 D8: `burdened by` seeds — the topic must be HELD (a
    // compile check: pre-story guilt over something the character does
    // not know is unexpressable, refused rather than silently inert).
    for (const b of decl.burdens) {
      const topic = normalizeTopic(b.topic.words.join(' '));
      if (!knows.some((k) => k.topic === topic)) {
        context.diagnostics.error(
          'analysis.burdened-unheld',
          `\`burdened by ${b.topic.words.join(' ')}\` needs the topic held — add \`knows ${b.topic.words.join(' ')}, <source>\` to this block.`,
          b.span,
        );
        continue;
      }
      if (burdenedBy.includes(topic)) {
        context.diagnostics.error('analysis.burdened-duplicate', `This block is already \`burdened by ${topic}\`.`, b.span);
        continue;
      }
      burdenedBy.push(topic);
    }
    entity.honor = honor;
  },
};
