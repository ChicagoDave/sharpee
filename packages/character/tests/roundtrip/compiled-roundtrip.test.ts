/**
 * compiled-roundtrip.test.ts — ADR-310 Acceptance 1: for every descriptive
 * construct, Chord source in, CharacterModelTrait out, equal to the trait
 * the normalized builder produces for the same declaration. Exercises the
 * real seam (applyCompiledCharacter — the same function the Phase 5 loader
 * calls), never a re-implementation.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { StoryIR } from '@sharpee/chord';
import {
  WorldModel,
  CharacterModelTrait,
  MOOD_AXES,
  applyMoodModifier,
} from '@sharpee/world-model';
import {
  CharacterBuilder,
  applyCharacter,
  applyCompiledCharacter,
  VocabularyExtension,
  COGNITIVE_PRESETS,
  type AppliedCharacter,
} from '../../src/index.js';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const SOURCE =
  HEADER +
  'define mood haunted like grieving, but restless\n' +
  'define personality watchful\n\n' +
  'define fact the killer\n  Greta, the Colonel, nobody\nend fact\n\n' +
  'define phrase colonel-acts\n  He acts.\nend phrase\n\n' +
  'define phrase colonel-says\n  He speaks.\nend phrase\n\n' +
  'define phrase menace-seen\n  He looms.\nend phrase\n\n' +
  'define phrase menace-resisted\n  The look slides off.\nend phrase\n\n' +
  'define phrase menace-lifted\n  The pressure eases.\nend phrase\n\n' +
  'create the Kitchen\n  a room\n\n  A kitchen.\n\n' +
  'create the player\n\n  Me.\n\n' +
  'create the kitchen knife\n  in the Kitchen\n\n  A knife.\n\n' +
  'create Greta\n' +
  '  a person, proper\n' +
  '\n' +
  '  influence seduction, passive, proximity\n' +
  '    makes mood confused\n' +
  '  end influence\n' +
  '\n' +
  '  A woman.\n\n' +
  'create the Colonel\n' +
  '  a person, proper, very watchful, cruel\n' +
  '  mood haunted\n' +
  '  feels wary of the player\n' +
  '  feels devoted to Greta\n' +
  '  knows the murder, told, suspects\n' +
  '  thinks the killer is Greta, certain, witnessed\n' +
  '  cognitive-profile braced with coherence focused\n' +
  '  spreads the murder to anyone, except Greta\n' +
  '\n' +
  '  goal flee, high\n' +
  '    active when the player is here\n' +
  '    seek the kitchen knife in the Kitchen\n' +
  '    wait for the player is here\n' +
  '    move to the Kitchen\n' +
  '    act colonel-acts\n' +
  '    say colonel-says to Greta\n' +
  '    give the kitchen knife to Greta\n' +
  '    drop the kitchen knife in the Kitchen\n' +
  '  end goal\n' +
  '\n' +
  '  influence menace, active, targeted\n' +
  '    clouds focus\n' +
  '    makes mood nervous\n' +
  '    makes threat threatened\n' +
  '    phrase menace-seen on witnessed\n' +
  '    phrase menace-resisted on resisted\n' +
  '    phrase menace-lifted on expired\n' +
  '  end influence\n' +
  '\n' +
  '  resists seduction, except from a woman\n' +
  '\n' +
  '  A man.\n';

/** Apply a compiled IR entity's character block to a fresh world entity. */
function applyIR(ir: StoryIR, entityId: string): AppliedCharacter {
  const world = new WorldModel();
  const npc = world.createEntity('Npc', 'actor');
  const entity = ir.entities.find((e) => e.id === entityId)!;
  return applyCompiledCharacter(npc, entity.character!, {
    customMoods: ir.customMoods,
    customPersonalities: ir.customPersonalities,
  });
}

/** Hand-build the SAME declaration through the normalized builder. */
function applyBuilt(build: (b: CharacterBuilder) => CharacterBuilder): AppliedCharacter {
  const world = new WorldModel();
  const npc = world.createEntity('Npc', 'actor');
  return applyCharacter(npc, build(new CharacterBuilder(npc.id)).compile());
}

describe('ADR-310 Acceptance 1 — round-trip per construct', () => {
  const result = compile(SOURCE);
  const ir = result.ir;

  it('the fixture story compiles clean', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  const compiled = applyIR(ir, 'colonel');
  const trait = compiled.trait;

  it('D2/D5: personality (custom word, intensity) matches the builder', () => {
    const built = applyBuilt((b) => {
      const ext = new VocabularyExtension();
      ext.definePersonality('watchful');
      return b.withVocabulary(ext).personality('very watchful', 'cruel');
    });
    expect(trait.personality).toEqual(built.trait.personality);
    expect(trait.personality['watchful']).toBeCloseTo(0.8);
    expect(trait.personality['cruel']).toBeCloseTo(0.6);
  });

  it('D3/D5: the custom mood lands at grieving nudged restless, same as the builder', () => {
    const axes = applyMoodModifier(MOOD_AXES['grieving'], 'restless');
    expect(trait.moodValence).toBeCloseTo(axes.valence);
    expect(trait.moodArousal).toBeCloseTo(axes.arousal);
    expect(compiled.baselineMood).toEqual({ valence: trait.moodValence, arousal: trait.moodArousal });

    const built = applyBuilt((b) => {
      const ext = new VocabularyExtension();
      ext.defineMood('haunted', axes.valence, axes.arousal);
      return b.withVocabulary(ext).mood('haunted');
    });
    expect(trait.moodValence).toBeCloseTo(built.trait.moodValence);
    expect(trait.moodArousal).toBeCloseTo(built.trait.moodArousal);
  });

  it('D3: feels lines become the dispositions record, word midpoints intact', () => {
    const built = applyBuilt((b) => b.dispositionToward('player', 'wary of').dispositionToward('greta', 'devoted to'));
    expect(trait.dispositions).toEqual(built.trait.dispositions);
    expect(trait.dispositions['player']).toBe(-30);
    expect(trait.dispositions['greta']).toBe(90);
  });

  it('D3: knows carries the real source and confidence (not the witnessed-boolean collapse)', () => {
    const built = applyBuilt((b) => b.knows('murder', { source: 'told', confidence: 'suspects' }));
    expect(trait.knowledge).toEqual(built.trait.knowledge);
    expect(trait.knowledge['murder']).toMatchObject({ source: 'told', confidence: 'suspects' });
  });

  it('D14: thinks becomes a valued belief against the fact id', () => {
    const built = applyBuilt((b) => b.thinks('killer', 'greta', { confidence: 'certain', source: 'witnessed' }));
    expect(trait.factBeliefs).toEqual(built.trait.factBeliefs);
    expect(trait.factBeliefs['killer']).toMatchObject({ value: 'greta', confidence: 'certain', source: 'witnessed' });
  });

  it('D4/D5: the profile completes from the preset with the override, kebab→camel', () => {
    const built = applyBuilt((b) => b.cognitiveProfile({ ...COGNITIVE_PRESETS['braced'], coherence: 'focused' }));
    expect(trait.cognitiveProfile).toEqual(built.trait.cognitiveProfile);
    expect(trait.cognitiveProfile).toEqual({
      perception: 'filtered',
      beliefFormation: 'rigid',
      coherence: 'focused',
      lucidity: 'episodic',
      selfModel: 'uncertain',
    });
  });

  it('D10: spreads becomes the propagation profile (chatty implied, listing is selectivity)', () => {
    const built = applyBuilt((b) =>
      b.propagation({ tendency: 'chatty', audience: 'anyone', spreads: ['murder'], excludes: ['greta'] }),
    );
    expect(compiled.propagationProfile).toEqual(built.propagationProfile);
    expect(compiled.propagationProfile).toEqual({
      tendency: 'chatty',
      audience: 'anyone',
      spreads: ['murder'],
      excludes: ['greta'],
    });
  });

  it('D10: spreads nothing is mute', () => {
    const muteResult = compile(HEADER + 'create the Butler\n  a person\n  spreads nothing\n\n  Him.\n');
    const applied = applyIR(muteResult.ir, 'butler');
    expect(applied.propagationProfile).toEqual({ tendency: 'mute' });
  });

  it('D8: the goal def carries priority, ordered steps, and the compiled activation condition', () => {
    const irGoal = ir.entities.find((e) => e.id === 'colonel')!.character!.goals[0];
    const waitStep = irGoal.steps[1];
    expect(waitStep.kind).toBe('wait-for');

    expect(compiled.goalDefs).toHaveLength(1);
    const goal = compiled.goalDefs![0];
    expect(goal).toMatchObject({ id: 'flee', priority: 'high', mode: 'sequential', activatesWhen: [] });
    expect(goal.steps).toEqual([
      { type: 'seek', target: 'kitchen-knife', from: 'kitchen' },
      {
        type: 'waitFor',
        conditions: [],
        conditionCompiled: (waitStep as { condition: unknown }).condition,
      },
      { type: 'moveTo', target: 'kitchen' },
      { type: 'act', messageId: 'colonel-acts' },
      { type: 'say', messageId: 'colonel-says', target: 'greta' },
      { type: 'give', item: 'kitchen-knife', target: 'greta' },
      { type: 'drop', item: 'kitchen-knife', location: 'kitchen' },
    ]);
    expect(goal.activeWhenCompiled).toEqual(irGoal.activeWhen);
    expect(goal.activeWhenCompiled).toMatchObject({ kind: 'predicate', pred: 'is-here' });
  });

  it('D9: the influence def matches the builder, duration defaulted by mode', () => {
    const built = applyBuilt((b) => {
      b.influence('menace')
        .mode('active')
        .range('targeted')
        .effect({ focus: 'clouded', mood: 'nervous', threat: 'threatened' })
        .duration('momentary')
        .witnessed('menace-seen')
        .resisted('menace-resisted')
        .expired('menace-lifted')
        .done();
      return b;
    });
    expect(compiled.influenceDefs).toEqual(built.influenceDefs);
  });

  it('D9: resists carries the canonical classifier except-string', () => {
    const built = applyBuilt((b) => b.resistsInfluence('seduction', { except: ['from a woman'] }));
    expect(compiled.resistanceDefs).toEqual(built.resistanceDefs);
  });

  it('the trait attaches to the entity like any applyCharacter result', () => {
    const world = new WorldModel();
    const npc = world.createEntity('Npc', 'actor');
    const entity = ir.entities.find((e) => e.id === 'greta')!;
    const applied = applyCompiledCharacter(npc, entity.character!, {});
    expect(npc.get('characterModel')).toBe(applied.trait);
    expect(applied.trait).toBeInstanceOf(CharacterModelTrait);
  });
});
