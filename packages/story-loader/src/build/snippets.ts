/**
 * snippets.ts — description markers and phrase text (Z2, ADR-211).
 *
 * A `{key}` marker in an entity's description prose splices a snippet at
 * render. This module compiles the markers onto the platform's snippet
 * storage per entity — the host map entries and the gates — and owns the
 * marker predicate and the template rewrite the language registration
 * applies to the same texts, so the two always agree. The default-locale
 * text of a phrase key is read here too; it is the one read every caller
 * of a phrase's text shares.
 *
 * Invariants:
 * - Per-entity compile is atomic: a LoadError leaves the host untouched,
 *   never partially populated.
 * - `snippetMarkerTest` is the one marker predicate; the template rewrite
 *   and the map compile both use it.
 *
 * Public interface: compileDescriptionSnippets, snippetMarkerTest,
 * snippetMarkersIn, rewriteSnippetMarkers, phraseText.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-211 — description markers and their `while` gates; ADR-209 — the
 *   snippet storage and `mentions`.
 * - ADR-333 D1a — the trait carries the key; the text lives in the IR.
 * - GH #364 — every described entity, room or not.
 */
import type { IRCondition, IREntity, StoryIR } from '@sharpee/chord';
import type { SnippetEntry, SnippetMap } from '@sharpee/if-domain';
import { registerSnippetGate } from '@sharpee/stdlib';
import { IdentityTrait, IFEntity, RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { requireEntity } from '../identity.js';
import { STRATEGY_SELECTOR } from '../runtime.js';
import { withLineBreaks } from '../text.js';
import type { BuildContext } from './context.js';

/**
 * Z2 (ADR-211): compile `{key}` strategy-phrase markers in this entity's
 * description prose onto ADR-209 storage. ATOMIC per entity: every
 * rewrite/entry/gate is computed first and applied only when the whole
 * entity compiled clean — a LoadError leaves it untouched, never
 * partial. Markers rewrite to `{snippet:key}`; variants populate the
 * host's snippet map — `RoomTrait.snippets` for a room, and
 * `IdentityTrait.snippets` for every other described entity (GH #364:
 * the examined handler splices exactly as the room handler does) —
 * (`nothing` → `''`, strategy → selector via the Z5 table; a
 * single-variant plain phrase compiles to a plain string entry); the
 * phrase's `while` gate compiles — on a ROOM host a presence condition
 * on the marker's own room (`is here` / `is in <this room>`, non-negated)
 * becomes `mentions`; anything else, and every gate on a non-room host,
 * registers on the ADR-211 gate seam keyed `(hostId, marker)` (stdlib
 * `registerSnippetGate` — in-memory, nothing serialized, re-registered
 * every story load). The resolver's `mentions` check is containment in
 * the host room, which only a room host can answer, so a non-room host
 * evaluates `is here` live through the gate instead. Both description
 * texts share one entry per marker (Z1/ADR-211 Q6: shared entries +
 * counters).
 *
 * @param world the world being built (gate thunks close over it)
 * @param irEntity the entity's IR entity (presence-gate room identity)
 * @param entity the built entity
 */
export function compileDescriptionSnippets(story: BuildContext, world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
  const table = story.ir.phrases.locales[story.ir.phrases.defaultLocale] ?? {};
  const roomTrait = entity.get(TraitType.ROOM) as RoomTrait | undefined;
  const identityTrait = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  const host: { snippets?: SnippetMap } | undefined = roomTrait ?? identityTrait;
  if (!host) return;

  // ADR-333 D1a: the texts are read from the IR — the trait carries only
  // the keys, and the marker rewrite lives on the registered template
  // (extendLanguage). This pass owns the map entries and the gates.
  const texts: string[] = [irEntity.descriptionKey, irEntity.initialDescriptionKey]
    .filter((k): k is string => typeof k === 'string')
    .map((k) => phraseText(story.ir, k));
  const isMarker = snippetMarkerTest(story.ir);

  // Compute phase — nothing is applied until every marker compiled.
  const entries = new Map<string, SnippetEntry>();
  const gates: Array<() => void> = [];
  for (const text of texts) {
    for (const marker of snippetMarkersIn(text, isMarker)) {
      if (entries.has(marker)) continue;
      const phrase = table[marker];
      if (phrase.verbatim) {
        // The analyzer already errors here (analysis.verbatim-marker);
        // this is the loader's defensive half of the same contract.
        throw new LoadError(
          `\`{${marker}}\` in \`${irEntity.name}\` names a verbatim phrase — verbatim text cannot splice at a description marker.`,
          phrase.span,
        );
      }

      const variantTexts = phrase.variants.map((v) => (v.text === 'nothing' ? '' : withLineBreaks(v.text)));
      let mentions: string | undefined;
      if (phrase.condition) {
        const subject = roomTrait ? presenceSubject(phrase.condition, irEntity.id) : null;
        if (subject) {
          mentions = requireEntity(world, subject, irEntity).id;
        } else {
          const condition = phrase.condition;
          gates.push(() =>
            registerSnippetGate(entity.id, marker, () => story.evaluator.evalCondition(condition, { world })),
          );
        }
      }

      const selector = phrase.strategy ? STRATEGY_SELECTOR[phrase.strategy] : undefined;
      let entry: SnippetEntry;
      if (!selector && variantTexts.length === 1) {
        // Single-variant plain phrase → plain string entry, never a Choice.
        entry = mentions ? { text: variantTexts[0], mentions } : variantTexts[0];
      } else {
        entry = {
          // A plain multi-variant phrase takes ADR-209's short-form
          // default (cycling); strategy phrases carry their Z5 selector.
          selector: selector ?? 'cycling',
          texts: variantTexts,
          ...(mentions !== undefined ? { mentions } : {}),
        };
      }
      entries.set(marker, entry);
    }
  }
  if (entries.size === 0) return;

  // Apply phase — populate the host's map, register the gates.
  host.snippets = { ...(host.snippets ?? {}), ...Object.fromEntries(entries) };
  for (const register of gates) register();
}

/**
 * The Z2 marker predicate: `{name}` in a description splices a snippet
 * when `name` is a declared phrase other than the `{br}` line break.
 * One definition, shared by the template rewrite
 * (extendLanguage) and the map compile (compileDescriptionSnippets); a
 * verbatim phrase passes here and is refused by the compile with its
 * LoadError.
 * @param ir the compiled story
 */
export function snippetMarkerTest(ir: StoryIR): (marker: string) => boolean {
  const table = ir.phrases.locales[ir.phrases.defaultLocale] ?? {};
  return (marker) => marker !== 'br' && table[marker] !== undefined;
}

/**
 * Resolved default-locale text for a phrase key (single-variant read).
 * @param ir the compiled story
 * @param key the phrase key
 * @throws LoadError when the IR carries no such phrase
 */
export function phraseText(ir: StoryIR, key: string): string {
  const phrase = ir.phrases.locales[ir.phrases.defaultLocale]?.[key];
  if (!phrase) {
    throw new LoadError(`Phrase \`${key}\` is missing from the IR — the compiler gate should have caught this.`);
  }
  return withLineBreaks(phrase.variants[0]?.text ?? '');
}

/**
 * The presence-gate subject when `cond` is `<entity> is here` or
 * `<entity> is in <this room>` (non-negated) — the two forms that compile to
 * ADR-209 `mentions` at a marker site (Z2/AC-4/AC-11). Null for anything
 * else (those register on the gate seam instead).
 *
 * @param cond the phrase's resolved header gate
 * @param roomIrId the IR id of the room whose description hosts the marker
 * @returns the subject's IR entity id, or null
 */
function presenceSubject(cond: IRCondition, roomIrId: string): string | null {
  if (cond.kind !== 'predicate' || cond.negated || cond.subject.kind !== 'entity') return null;
  if (cond.pred === 'is-here') return cond.subject.id;
  if (cond.pred === 'is-in' && cond.object.kind === 'entity' && cond.object.id === roomIrId) {
    return cond.subject.id;
  }
  return null;
}

/** Candidate `{name}` markers in a description text. */
const DESCRIPTION_MARKER = /\{([a-z][a-z0-9-]*)\}/g;

/**
 * The snippet markers a description text carries (Z2, ADR-211): every
 * `{name}` the predicate accepts, deduplicated, in first-appearance order.
 */
export function snippetMarkersIn(text: string, isMarker: (marker: string) => boolean): string[] {
  const seen: string[] = [];
  for (const match of text.matchAll(DESCRIPTION_MARKER)) {
    const marker = match[1];
    if (isMarker(marker) && !seen.includes(marker)) seen.push(marker);
  }
  return seen;
}

/**
 * Rewrite each accepted `{name}` marker in a description template to the
 * platform's `{snippet:name}` form (ADR-209) — the registered text the room
 * and examined handlers splice at render.
 */
export function rewriteSnippetMarkers(template: string, isMarker: (marker: string) => boolean): string {
  let rewritten = template;
  for (const marker of snippetMarkersIn(template, isMarker)) {
    rewritten = rewritten.split(`{${marker}}`).join(`{snippet:${marker}}`);
  }
  return rewritten;
}
