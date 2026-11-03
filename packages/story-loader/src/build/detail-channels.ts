/**
 * detail-channels.ts — the `detail-channels` step: gated `detail` blocks.
 *
 * Compiles each entity's gated `detail` blocks. The two shipped trait
 * shapes bind their fields directly — `while it is on` →
 * `SwitchableTrait.detailWhenOn`, `while it is lit` →
 * `LightSourceTrait.detailWhenLit` (both read by world-model's
 * state-clauses registry). Any other condition joins the loader-owned
 * provider: one marker trait per owner, ONE contributor registered per
 * load (last-wins on the registry), which evaluates the gate live at
 * examine time.
 *
 * Public interface: compileDetailChannels (the `detail-channels` step),
 * ChordDetailTrait.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - Z3b / CP5' — `detail` blocks; the two shipped trait-field shapes.
 * - ADR-211, ADR-212 — the state-clause contributor lifecycle.
 */
import type { IRCondition } from '@sharpee/chord';
import {
  type ITrait,
  LightSourceTrait,
  registerClauseContributor,
  SwitchableTrait,
  TraitType,
  type WorldModel,
} from '@sharpee/world-model';
import { withLineBreaks } from '../text.js';
import type { BuildContext } from './context.js';

/**
 * Marker trait for entities carrying loader-compiled `detail` providers
 * (Z3b): the one state-clause contributor registered per load looks up the
 * owner's gated detail specs through it. Data-free — the specs live on the
 * loader (nothing serialized; re-registered every load).
 */
export class ChordDetailTrait implements ITrait {
  static readonly type = 'chord.detail';
  readonly type = ChordDetailTrait.type;
}

/**
 * The `detail-channels` step: compile each entity's gated `detail` blocks.
 * @param story the build context
 * @param world the world being built (the provider closes over it)
 */
export function compileDetailChannels(story: BuildContext, world: WorldModel): void {
  const table = story.ir.phrases.locales[story.ir.phrases.defaultLocale] ?? {};
  const providerSpecs = new Map<string, Array<{ irId: string; condition: IRCondition; text: string }>>();

  for (const irEntity of story.ir.entities) {
    const worldId = irEntity.id;
    const entity = world.getEntity(worldId);
    if (!entity) continue;
    for (let i = 1; ; i++) {
      const key = i === 1 ? `${irEntity.id}.detail` : `${irEntity.id}.detail.${i}`;
      const phrase = table[key];
      if (!phrase) break;
      if (!phrase.condition) continue; // analyzer already errored (detail-unconditional)
      const text = withLineBreaks(phrase.variants[0]?.text ?? '');
      const shape = detailTraitShape(phrase.condition, irEntity.id);
      if (shape === 'on' && entity.has(TraitType.SWITCHABLE)) {
        (entity.get(TraitType.SWITCHABLE) as SwitchableTrait).detailWhenOn = text;
      } else if (shape === 'lit' && entity.has(TraitType.LIGHT_SOURCE)) {
        (entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).detailWhenLit = text;
      } else {
        const specs = providerSpecs.get(worldId) ?? [];
        specs.push({ irId: irEntity.id, condition: phrase.condition, text });
        providerSpecs.set(worldId, specs);
      }
    }
  }

  if (providerSpecs.size === 0) return;
  for (const worldId of providerSpecs.keys()) {
    const entity = world.getEntity(worldId);
    if (entity && !entity.has(ChordDetailTrait.type)) entity.add(new ChordDetailTrait());
  }
  registerClauseContributor(ChordDetailTrait.type, (entity) => {
    const specs = providerSpecs.get(entity.id);
    if (!specs) return [];
    return specs
      .filter((spec) => story.evaluator.evalCondition(spec.condition, { world, it: spec.irId }))
      .map((spec) => spec.text);
  });
}

/**
 * The shipped trait-field shape of a `detail` gate: exactly `it is on` /
 * `it is lit` on the owner, non-negated (Z3b/CP5') — else null and the
 * loader-owned provider evaluates the condition live.
 *
 * @param cond the block's resolved gate
 * @param ownerIrId the owning entity's IR id
 * @returns 'on' | 'lit' | null
 */
function detailTraitShape(cond: IRCondition, ownerIrId: string): 'on' | 'lit' | null {
  if (cond.kind !== 'predicate' || cond.pred !== 'is' || cond.negated) return null;
  const subjectIsOwner =
    cond.subject.kind === 'it' || (cond.subject.kind === 'entity' && cond.subject.id === ownerIrId);
  if (!subjectIsOwner || cond.object.kind !== 'symbol') return null;
  if (cond.object.name === 'on') return 'on';
  if (cond.object.name === 'lit') return 'lit';
  return null;
}
