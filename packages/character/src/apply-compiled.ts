/**
 * Apply COMPILED-STORY character data to an entity (ADR-310 Phase 3).
 *
 * The one seam between the Chord compiler's wire shape (IRCharacter,
 * words never numbers) and the character model: the story-loader calls
 * this at load (Phase 5), and the AC1 round-trip tests call it directly.
 * It drives the normalized CharacterBuilder, so the produced trait is the
 * builder's own output for the same declaration — ADR-310 Acceptance 1 by
 * construction, with word-mapping and completion defects still caught.
 *
 * Public interface: applyCompiledCharacter, CompiledCharacterContext.
 * Owner context: @sharpee/character
 */

import type {
  IFEntity,
  CognitiveProfile,
  DispositionWord,
  FactSource,
  ConfidenceWord,
  MoodModifier,
  ActCategory,
  FaceAct,
  Force,
  TemperamentDef,
} from '@sharpee/world-model';
import { MOOD_AXES, applyMoodModifier } from '@sharpee/world-model';
import type { IRCharacter, IRGoalStep, IRMoodDef, IRWordDef, IRScopeRef, IRTemperamentDef } from '@sharpee/chord';
import { conditionRequiresSelfBreaking } from '@sharpee/chord';
import { CharacterBuilder } from './character-builder.js';
import { applyCharacter, AppliedCharacter } from './apply.js';
import { VocabularyExtension } from './vocabulary-extension.js';
import type { GoalPriority, GoalStep } from './goals/goal-types.js';
import type { GoalBuilder } from './goals/builder.js';

/**
 * Story-level context for compiled character application: the custom
 * vocabulary the story's `define mood` / `define personality` lines
 * declared (StoryIR.customMoods / customPersonalities), plus the loader's
 * IR→world entity-id mapping.
 */
export interface CompiledCharacterContext {
  customMoods?: readonly IRMoodDef[];
  customPersonalities?: readonly IRWordDef[];
  /**
   * Maps a wire entity ref (IR id) to the built world entity id. The
   * LOADER owns the mapping (it is the only party holding both id
   * spaces); this seam owns the walk over every ref-bearing field.
   * Absent = identity (direct seam callers, AC1 round-trip tests).
   * Implementations should throw on an unresolvable id — an unresolved
   * ref here is rogue IR, not a story state.
   */
  resolveEntityId?: (irId: string) => string;
}

/**
 * Build the vocabulary extension for a story's custom words: each custom
 * mood anchors at its platform mood's coordinates, nudged one axis by the
 * modifier word (Option 2, David 2026-08-15) — the numbers live here, on
 * the runtime side, never in Chord.
 *
 * @param ctx - Story-level custom vocabulary
 * @returns The extension, or undefined when the story declares none
 */
function buildVocabulary(ctx?: CompiledCharacterContext): VocabularyExtension | undefined {
  if (!ctx?.customMoods?.length && !ctx?.customPersonalities?.length) return undefined;
  const ext = new VocabularyExtension();
  for (const mood of ctx.customMoods ?? []) {
    const anchor = MOOD_AXES[mood.like as keyof typeof MOOD_AXES];
    const axes = mood.but ? applyMoodModifier(anchor, mood.but as MoodModifier) : anchor;
    ext.defineMood(mood.name, axes.valence, axes.arousal);
  }
  for (const word of ctx.customPersonalities ?? []) {
    ext.definePersonality(word.name);
  }
  return ext;
}

/** IR→world entity-id mapping function (identity when no loader is involved). */
type ResolveEntityId = (irId: string) => string;

/**
 * Canonical trait-side spelling of a wire scope ref (ADR-318 D4/D7):
 * `anyone` / `a <classifier>` / the WORLD entity id — the resists-except
 * idiom. Entity refs pass through the loader's id mapping.
 */
function scopeToString(scope: IRScopeRef, resolve: ResolveEntityId): string {
  switch (scope.kind) {
    case 'anyone':
      return 'anyone';
    case 'classifier':
      return `a ${scope.value}`;
    case 'entity':
      return resolve(scope.value);
  }
}

/**
 * Map compiled `define temperament` defs (plus the compiler's synthesized
 * inline/override defs) to the arbiter's registry shape — the loader hands
 * the result to ArbiterContext.temperamentDefs at load (ADR-318 D3).
 *
 * @param defs - StoryIR.temperaments
 * @returns name → TemperamentDef record
 */
export function temperamentDefsFrom(defs: readonly IRTemperamentDef[]): Record<string, TemperamentDef> {
  const out: Record<string, TemperamentDef> = {};
  for (const def of defs) {
    out[def.name] = { name: def.name, pairs: def.pairs.map(([a, b]) => [a, b] as [Force, Force]) };
  }
  return out;
}

/** Map one compiled goal step to the builder-native GoalStep shape (entity refs through the loader's id mapping). */
function mapGoalStep(step: IRGoalStep, resolve: ResolveEntityId): GoalStep {
  switch (step.kind) {
    case 'seek':
      return { type: 'seek', target: resolve(step.target), ...(step.in !== undefined ? { from: resolve(step.in) } : {}) };
    case 'acquire':
      return { type: 'acquire', target: resolve(step.target) };
    case 'wait-for':
      // The structured condition rides `conditionCompiled` in IR terms —
      // the story oracle evaluates it, so its refs stay IR ids; the
      // string surface stays empty.
      return { type: 'waitFor', conditions: [], conditionCompiled: step.condition };
    case 'move-to':
      return { type: 'moveTo', target: resolve(step.target) };
    case 'act':
      return { type: 'act', messageId: step.phraseKey };
    case 'say':
      return { type: 'say', messageId: step.phraseKey, ...(step.target !== undefined ? { target: resolve(step.target) } : {}) };
    case 'give':
      return { type: 'give', item: resolve(step.item), target: resolve(step.target) };
    case 'drop':
      return { type: 'drop', item: resolve(step.item), ...(step.in !== undefined ? { location: resolve(step.in) } : {}) };
  }
}

/**
 * Apply compiled-story character data to an entity: builds the
 * CharacterModelTrait via the normalized builder and attaches it,
 * returning the same shape applyCharacter returns (trait, service
 * configs, mood-decay baseline).
 *
 * @param entity - The NPC entity to apply the character model to
 * @param data - The entity's compiled character block (IREntity.character)
 * @param ctx - Story-level custom vocabulary, if any
 * @returns The trait and compiled behavior configuration
 */
export function applyCompiledCharacter(
  entity: IFEntity,
  data: IRCharacter,
  ctx?: CompiledCharacterContext,
): AppliedCharacter {
  const builder = new CharacterBuilder(entity.id);
  const resolve: ResolveEntityId = ctx?.resolveEntityId ?? ((irId) => irId);

  const vocabulary = buildVocabulary(ctx);
  if (vocabulary) builder.withVocabulary(vocabulary);

  if (data.personality.length > 0) {
    builder.personality(...data.personality.map((p) => (p.intensity !== undefined ? `${p.intensity} ${p.trait}` : p.trait)));
  }
  if (data.mood !== undefined) builder.mood(data.mood);
  for (const f of data.feels) {
    builder.dispositionToward(resolve(f.target), f.disposition as DispositionWord);
  }
  for (const k of data.knows) {
    builder.knows(k.topic, {
      source: k.source as FactSource,
      ...(k.confidence !== undefined ? { confidence: k.confidence as ConfidenceWord } : {}),
      ...(k.confided ? { confided: true } : {}),
    });
  }
  for (const t of data.thinks) {
    builder.thinks(t.factId, t.value, {
      ...(t.confidence !== undefined ? { confidence: t.confidence as ConfidenceWord } : {}),
      ...(t.source !== undefined ? { source: t.source as FactSource } : {}),
    });
  }
  if (data.profile !== undefined) {
    // Kebab (Chord) → camelCase (TS) — same concept, each surface's own
    // convention (ADR-310 D11a). The compiler emitted a COMPLETE profile.
    builder.cognitiveProfile({
      perception: data.profile['perception'],
      beliefFormation: data.profile['belief-formation'],
      coherence: data.profile['coherence'],
      lucidity: data.profile['lucidity'],
      selfModel: data.profile['self-model'],
    } as CognitiveProfile);
  }
  if (data.spreads !== undefined) {
    if (data.spreads.kind === 'nothing') {
      builder.propagation({ tendency: 'mute' });
    } else {
      builder.propagation({
        tendency: 'chatty',
        audience: data.spreads.to as 'trusted' | 'anyone' | 'allied',
        ...(data.spreads.topics.length > 0 ? { spreads: [...data.spreads.topics] } : {}),
        ...(data.spreads.except.length > 0 ? { excludes: data.spreads.except.map(resolve) } : {}),
      });
    }
  }
  for (const g of data.goals) {
    // goal(id) without a numeric priority always returns the GoalBuilder.
    const gb = builder.goal(g.id) as GoalBuilder<CharacterBuilder>;
    gb.priority(g.priority as GoalPriority)
      .mode('sequential')
      .pursues(g.steps.map((s) => mapGoalStep(s, resolve)));
    if (g.activeWhen !== null) {
      gb.activeWhenCompiled(g.activeWhen);
      // Seam-2 ruling (2026-08-16): a goal provably gated on the owner's
      // own `breaking` band is a conscience outlet — completing it
      // discharges. The gate IS the marker; no authored surface.
      if (conditionRequiresSelfBreaking(g.activeWhen)) gb.discharges();
    }
    gb.done();
  }
  for (const inf of data.influences) {
    const ib = builder
      .influence(inf.name)
      .mode(inf.mode as 'passive' | 'active')
      .range(inf.range as 'proximity' | 'targeted' | 'room')
      .effect({ ...inf.effect })
      // Duration defaults by mode (ADR-146): passive clears when the
      // influencer leaves; active lasts the turn.
      .duration(inf.mode === 'active' ? 'momentary' : 'while present');
    if (inf.witnessed !== undefined) ib.witnessed(inf.witnessed);
    if (inf.resisted !== undefined) ib.resisted(inf.resisted);
    ib.done();
  }
  for (const r of data.resists) {
    builder.resistsInfluence(r.influence, r.exceptFrom !== undefined
      ? {
          // Canonical except-predicate spellings the runtime interprets:
          // `from a <classifier>` / `from <world-entity-id>`.
          except: [r.exceptFrom.kind === 'classifier' ? `from a ${r.exceptFrom.value}` : `from ${resolve(r.exceptFrom.value)}`],
        }
      : undefined);
  }

  // Normative layer (ADR-318). Scopes and excepts canonicalize to the
  // resists-except string idiom; the runtime interprets them at the
  // arbitration seam (Phases 5-6), never here.
  for (const t of data.temperaments) {
    builder.temperament(t.name, t.while !== undefined ? { while: t.while } : undefined);
  }
  for (const p of data.principles) {
    builder.never(p.category as ActCategory, {
      ...(p.scope !== undefined ? { scope: scopeToString(p.scope, resolve) } : {}),
      ...(p.except !== undefined
        ? { except: p.except.kind === 'protect' ? `to protect ${scopeToString(p.except.scope, resolve)}` : scopeToString(p.except.scope, resolve) }
        : {}),
    });
  }
  for (const o of data.obligations) {
    if (o.kind === 'protects') builder.protects(scopeToString(o.scope!, resolve));
    else builder.answersHonestly();
  }
  if (data.honor !== undefined) {
    builder.honor(scopeToString(data.honor.scope, resolve), {
      faceActs: data.honor.faceActs as FaceAct[],
      ...(data.honor.except.length > 0 ? { except: data.honor.except.map(resolve) } : {}),
    });
  }
  for (const topic of data.burdenedBy) {
    builder.burdenedBy(topic);
  }

  return applyCharacter(entity, builder.compile());
}
