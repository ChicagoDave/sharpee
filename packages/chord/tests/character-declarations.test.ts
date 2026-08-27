/**
 * character-declarations.test.ts — ADR-310 Phase 3: the character model's
 * Chord surface. D2 personality adjectives on `create`: routing into
 * `IREntity.character` (words as written, never trait composition), the D7
 * no-model-no-change guarantee, and every D2 diagnostic.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER =
  'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n' +
  // ADR-327 D10: every story names its player.
  'create Alex\n  a person\n  playable\n\nbefore the game starts\n  change the player to Alex\nend before\n\n';

function compileStory(body: string) {
  return compile(HEADER + body);
}

function errorsOf(body: string) {
  return compileStory(body).diagnostics.filter((d) => d.severity === 'error');
}

describe('D2 — personality adjectives compile into character data', () => {
  it('routes bare and intensity-qualified adjectives into character.personality, in order', () => {
    const result = compileStory(
      'create Tobias\n  a person, very honest, loyal, cowardly\n\n  A man.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character?.personality.map((p) => ({ trait: p.trait, intensity: p.intensity }))).toEqual([
      { trait: 'honest', intensity: 'very' },
      { trait: 'loyal', intensity: undefined },
      { trait: 'cowardly', intensity: undefined },
    ]);
  });

  it('consumed personality words never reach trait composition (the no-parser-vocabulary rule)', () => {
    const result = compileStory('create Tobias\n  a person, guard, cowardly\n\n  A man.\n');
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.traits.map((t) => t.name)).toEqual(['guard']);
    expect(tobias.character?.personality.map((p) => p.trait)).toEqual(['cowardly']);
  });

  it('D7: a person with no character construct carries no character block', () => {
    const result = compileStory('create Tobias\n  a person, proper\n\n  A man.\n');
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character).toBeUndefined();
    expect('character' in tobias).toBe(false);
  });

  it('a story-defined trait shadows its personality reading', () => {
    const result = compileStory(
      'define trait honest\n  states: shiny, dull\nend trait\n\ncreate Tobias\n  a person, honest\n\n  A man.\n',
    );
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.traits.map((t) => t.name)).toEqual(['honest']);
    expect(tobias.character).toBeUndefined();
  });
});

describe('D2 — diagnostics', () => {
  it('an intensity-led unknown word is analysis.unknown-personality-word naming the vocabulary', () => {
    const errors = errorsOf('create Tobias\n  a person, very honets\n\n  A man.\n');
    const unknown = errors.filter((e) => e.code === 'analysis.unknown-personality-word');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('honest');
    expect(errors.every((e) => e.code !== 'analysis.trait-not-declared')).toBe(true);
  });

  it('a bare unknown adjective keeps the generic unknown-trait error', () => {
    const errors = errorsOf('create Tobias\n  a person, honets\n\n  A man.\n');
    expect(errors.some((e) => e.code === 'analysis.trait-not-declared')).toBe(true);
  });

  it('personality on a non-person is analysis.personality-person-only', () => {
    const errors = errorsOf('create the Lantern\n  honest\n\n  A lantern.\n');
    const personOnly = errors.filter((e) => e.code === 'analysis.personality-person-only');
    expect(personOnly).toHaveLength(1);
    expect(errors.every((e) => e.code !== 'analysis.trait-not-declared')).toBe(true);
  });

  // ADR-327 D10: the player block is gone, and with it the gate that said the
  // player carries no character model. A `playable` character is a person like
  // any other — the model drives them for as long as they are not the PC (D9).
  it('personality composes on a playable character', () => {
    const errors = errorsOf('create Robin\n  playable\n  a person, honest\n\n  Me.\n');
    expect(errors).toEqual([]);
  });

  it('`with` config on a personality adjective is analysis.personality-config', () => {
    const errors = errorsOf('create Tobias\n  a person, honest with x 2\n\n  A man.\n');
    expect(errors.filter((e) => e.code === 'analysis.personality-config')).toHaveLength(1);
  });

  it('a conditional personality adjective is analysis.personality-conditional', () => {
    const errors = errorsOf('create Tobias\n  a person, honest while Tobias is here\n\n  A man.\n');
    expect(errors.filter((e) => e.code === 'analysis.personality-conditional')).toHaveLength(1);
  });

  it('the same trait twice is analysis.personality-duplicate', () => {
    const errors = errorsOf('create Tobias\n  a person, honest, very honest\n\n  A man.\n');
    expect(errors.filter((e) => e.code === 'analysis.personality-duplicate')).toHaveLength(1);
  });
});

describe('D3 — mood, feels, knows declarations', () => {
  const TOBIAS =
    'create Robin\n  a person\n  playable\n\n  Me.\n\n' +
    'create Tobias\n' +
    '  a person, very honest, cowardly\n' +
    '  mood nervous\n' +
    '  feels wary of the player\n' +
    '  feels devoted to Greta\n' +
    '  knows the murder, witnessed\n' +
    '  knows the hidden will, told, suspects\n' +
    '\n' +
    '  A man.\n' +
    '\n' +
    'create Greta\n' +
    '  a person, proper\n' +
    '\n' +
    '  A woman.\n';

  it('compiles the full declaration set into the character block', () => {
    const result = compileStory(TOBIAS);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character?.mood).toBe('nervous');
    expect(tobias.character?.feels.map((f) => ({ disposition: f.disposition, target: f.target }))).toEqual([
      { disposition: 'wary of', target: 'player' },
      { disposition: 'devoted to', target: 'greta' },
    ]);
    expect(tobias.character?.knows.map((k) => ({ topic: k.topic, source: k.source, confidence: k.confidence }))).toEqual([
      { topic: 'murder', source: 'witnessed', confidence: undefined },
      { topic: 'hidden will', source: 'told', confidence: 'suspects' },
    ]);
  });

  it('a mood line alone opts the person into a character block', () => {
    const result = compileStory('create Tobias\n  a person\n  mood calm\n\n  A man.\n');
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character?.mood).toBe('calm');
    expect(tobias.character?.personality).toEqual([]);
  });

  it('`feels neutral toward Tobias` reaches a bare proper-name target', () => {
    const result = compileStory(
      'create Tobias\n  a person, proper\n\n  A man.\n\ncreate Greta\n  a person\n  feels neutral toward Tobias\n\n  A woman.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const greta = result.ir.entities.find((e) => e.id === 'greta')!;
    expect(greta.character?.feels).toMatchObject([{ disposition: 'neutral', target: 'tobias' }]);
  });

  it('unknown mood and disposition words name the vocabulary', () => {
    const errors = errorsOf(
      'create Tobias\n  a person\n  mood grumpy\n  feels smitten toward the player\n\n  A man.\n',
    );
    const moodErr = errors.filter((e) => e.code === 'analysis.unknown-mood-word');
    expect(moodErr).toHaveLength(1);
    expect(moodErr[0].message).toContain('nervous');
    expect(errors.filter((e) => e.code === 'analysis.unknown-disposition-word')).toHaveLength(1);
  });

  it('knows slots classify order-free; unknown and duplicate slots error', () => {
    const okay = compileStory('create Tobias\n  a person\n  knows the murder, suspects, told\n\n  A man.\n');
    const tobias = okay.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character?.knows[0]).toMatchObject({ topic: 'murder', source: 'told', confidence: 'suspects' });

    expect(
      errorsOf('create Tobias\n  a person\n  knows the murder, witnessed, told\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.knows-slot-duplicate',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create Tobias\n  a person\n  knows the murder, firmly\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.unknown-knows-slot',
      ),
    ).toHaveLength(1);
  });

  it('knows without a source is analysis.knows-missing-source', () => {
    const errors = errorsOf('create Tobias\n  a person\n  knows the murder\n\n  A man.\n');
    expect(errors.filter((e) => e.code === 'analysis.knows-missing-source')).toHaveLength(1);
  });

  it('duplicate mood line, feels target, and knows topic each error once', () => {
    const errors = errorsOf(
      'create Robin\n  a person\n  playable\n\n  Me.\n\ncreate Tobias\n  a person\n  mood calm\n  mood nervous\n  feels wary of the player\n  feels trusts toward the player\n  knows the murder, witnessed\n  knows the murder, told\n\n  A man.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.mood-duplicate')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.feels-duplicate')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.knows-duplicate')).toHaveLength(1);
  });

  it('character lines gate on a non-person, and compose on a playable character', () => {
    expect(
      errorsOf('create the Lantern\n  mood calm\n\n  A lantern.\n').filter(
        (e) => e.code === 'analysis.character-line-person-only',
      ),
    ).toHaveLength(1);
    // ADR-327 D10: no `analysis.character-line-player` — see above.
    expect(
      errorsOf('create Robin\n  playable\n  a person\n  mood calm\n\n  Me.\n'),
    ).toEqual([]);
  });
});

describe('D3 — change mood / change feeling transitions', () => {
  const STORY =
    'create the Hall\n  a room\n\n  A hall.\n\n' +
    'create Tobias\n' +
    '  a person\n' +
    '  in the Hall\n' +
    '  mood calm\n' +
    '\n' +
    '  on the player attacking\n' +
    '    change mood to panicked\n' +
    '    change feeling toward the player to wary of\n' +
    '  end on\n' +
    '\n' +
    '  A man.\n';

  it('compiles both transition statements into the on-clause body', () => {
    const result = compileStory(STORY);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    const body = tobias.onClauses[0].body;
    expect(body[0]).toMatchObject({ kind: 'change-mood', mood: 'panicked' });
    // `the player` resolves to the IRValue player kind, like every other
    // statement site (`move it to the player`).
    expect(body[1]).toMatchObject({
      kind: 'change-feeling',
      target: { kind: 'player' },
      disposition: 'wary of',
    });
  });

  it('unknown words in transitions are compile errors', () => {
    const bad = STORY.replace('to panicked', 'to jubilant').replace('to wary of', 'to smitten with');
    const errors = errorsOf(bad);
    expect(errors.some((e) => e.code === 'analysis.unknown-mood-word')).toBe(true);
    expect(errors.some((e) => e.code === 'analysis.unknown-disposition-word')).toBe(true);
  });

  it('`change the Kettle to <state>` keeps its state reading', () => {
    const result = compileStory(
      'create the Kettle\n  states: cold, hot\n\n  on the player taking\n    change the Kettle to hot\n  end on\n\n  A kettle.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});

describe('D14 — define fact and thinks', () => {
  const WORLD =
    'define fact the killer\n  the Colonel, the Butler, nobody\nend fact\n\n' +
    'create the Colonel\n  a person, proper\n\n  Him.\n\n' +
    'create the Butler\n  a person, proper\n\n  Him too.\n\n';

  it('compiles the fact set (entity values as IDs, bare words as literals) and the thinks entry', () => {
    const result = compileStory(
      WORLD + 'create the Cook\n  a person\n  thinks the killer is the Butler, suspects, told\n\n  Her.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.facts).toEqual([
      expect.objectContaining({ id: 'killer', name: 'killer', article: 'the', values: ['colonel', 'butler', 'nobody'] }),
    ]);
    const cook = result.ir.entities.find((e) => e.id === 'cook')!;
    expect(cook.character?.thinks).toMatchObject([
      { factId: 'killer', value: 'butler', confidence: 'suspects', source: 'told' },
    ]);
  });

  it('two characters can hold different values of the same fact', () => {
    const result = compileStory(
      WORLD +
        'create the Cook\n  a person\n  thinks the killer is the Butler, suspects\n\n  Her.\n\n' +
        'create the Maid\n  a person\n  thinks the killer is the Colonel, certain\n\n  Her too.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const value = (id: string) => result.ir.entities.find((e) => e.id === id)!.character!.thinks[0].value;
    expect(value('cook')).toBe('butler');
    expect(value('maid')).toBe('colonel');
  });

  it('a story with no facts carries no facts field', () => {
    const result = compileStory('create Tobias\n  a person\n\n  A man.\n');
    expect('facts' in result.ir).toBe(false);
  });

  it('a value outside the declared set is analysis.unknown-fact-value naming the set', () => {
    const errors = errorsOf(
      WORLD +
        'create the Maid\n  a person\n\n  Her.\n\n' +
        'create the Cook\n  a person\n  thinks the killer is the Maid\n\n  Her.\n',
    );
    const bad = errors.filter((e) => e.code === 'analysis.unknown-fact-value');
    expect(bad).toHaveLength(1);
    expect(bad[0].message).toContain('nobody');
  });

  it('an undeclared fact is analysis.unknown-fact with a suggestion', () => {
    const errors = errorsOf(
      WORLD + 'create the Cook\n  a person\n  thinks the kiler is the Butler\n\n  Her.\n',
    );
    const bad = errors.filter((e) => e.code === 'analysis.unknown-fact');
    expect(bad).toHaveLength(1);
    expect(bad[0].message).toContain('killer');
  });

  it('a theory-of-mind attempt is its own diagnostic, on knows and thinks alike', () => {
    const errors = errorsOf(
      WORLD +
        'create the Cook\n  a person\n  thinks the Maid thinks the killer is the Butler\n\n  Her.\n\n' +
        'create the Maid\n  a person\n  knows the Cook believes the Colonel did it, told\n\n  Her too.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.theory-of-mind')).toHaveLength(2);
    expect(errors.every((e) => e.code !== 'analysis.unknown-fact')).toBe(true);
  });

  it('duplicate fact names, empty and duplicate value sets each error', () => {
    expect(
      errorsOf('define fact the killer\n  nobody\nend fact\n\ndefine fact the killer\n  nobody\nend fact\n').filter(
        (e) => e.code === 'analysis.duplicate-fact',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('define fact the killer\nend fact\n').filter((e) => e.code === 'analysis.fact-empty'),
    ).toHaveLength(1);
    expect(
      errorsOf('define fact the killer\n  nobody, nobody\nend fact\n').filter(
        (e) => e.code === 'analysis.fact-value-duplicate',
      ),
    ).toHaveLength(1);
  });

  it('a second belief about the same fact is analysis.thinks-duplicate', () => {
    const errors = errorsOf(
      WORLD +
        'create the Cook\n  a person\n  thinks the killer is the Butler\n  thinks the killer is nobody\n\n  Her.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.thinks-duplicate')).toHaveLength(1);
  });
});

describe('D13 — entity-scoped predicates and D16 phrasebook specificity', () => {
  const WORLD =
    'create Robin\n  a person\n  playable\n\n  Me.\n\n' +
    'create the Colonel\n  a person, proper\n  mood calm\n  knows the murder, witnessed\n\n  Him.\n\n';

  it('mood words, feels, and knows all gate a per-line `when`', () => {
    const result = compileStory(
      WORLD +
        'define phrase colonel-terse when the Colonel is panicked\n  "What."\nend phrase\n\n' +
        'define phrase colonel-warm when the Colonel feels trusts toward the player\n  He smiles.\nend phrase\n\n' +
        'define phrase colonel-knowing when the Colonel knows the murder\n  He looks away.\nend phrase\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('feels and knows predicates lower to their IR condition kinds', () => {
    const result = compileStory(
      WORLD +
        'define condition colonel-trusting: the Colonel feels trusts toward the player\n' +
        'define condition colonel-aware: the Colonel knows the murder\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const byName = Object.fromEntries(result.ir.conditions.map((c) => [c.name, c.condition]));
    expect(byName['colonel-trusting']).toMatchObject({
      kind: 'feels',
      subject: { kind: 'entity', id: 'colonel' },
      disposition: 'trusts',
      target: { kind: 'player' },
    });
    expect(byName['colonel-aware']).toMatchObject({
      kind: 'knows-topic',
      subject: { kind: 'entity', id: 'colonel' },
      topic: 'murder',
    });
  });

  it('a character-scoped phrasebook is stamped; a story-scoped one is not', () => {
    const result = compileStory(
      WORLD +
        'define phrasebook mustard-cornered while the Colonel is panicked\n  greeting:\n    "What."\nend phrasebook\n\n' +
        'define phrasebook plain-voice\n  greeting:\n    Hello.\nend phrasebook\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const cornered = result.ir.phrasebooks.find((b) => b.name === 'mustard-cornered')!;
    expect(cornered.specificity).toBe('character');
    const plain = result.ir.phrasebooks.find((b) => b.name === 'plain-voice')!;
    expect(plain.specificity).toBeUndefined();
  });

  it('D16: two books gating the same speaker ambiguously are analysis.phrasebook-tie', () => {
    const errors = errorsOf(
      WORLD +
        'define phrasebook cornered while the Colonel is panicked\n  greeting:\n    "What."\nend phrasebook\n\n' +
        'define phrasebook warm while the Colonel feels trusts toward the player\n  greeting:\n    He smiles.\nend phrasebook\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.phrasebook-tie')).toHaveLength(1);
  });

  it('D16: two books on the same subject with different moods are exclusive and pass', () => {
    const result = compileStory(
      WORLD +
        'define phrasebook cornered while the Colonel is panicked\n  greeting:\n    "What."\nend phrasebook\n\n' +
        'define phrasebook sunny while the Colonel is cheerful\n  greeting:\n    He beams.\nend phrasebook\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('an entity state shadowing a mood word keeps its state reading', () => {
    const result = compileStory(
      'create the Kettle\n  states: calm, boiling\n\n  A kettle.\n\n' +
        'define phrasebook kettle-voice while the Kettle is calm\n  greeting:\n    It sits.\nend phrasebook\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const book = result.ir.phrasebooks.find((b) => b.name === 'kettle-voice')!;
    expect(book.specificity).toBeUndefined();
  });
});

describe('D4/D5 — cognitive profiles', () => {
  it('a named define profile completes from clear-headed and applies to an entity', () => {
    const result = compileStory(
      'define profile hollowed\n  perception filtered\n  coherence drifting\nend profile\n\n' +
        'create Iris\n  a person\n  cognitive-profile hollowed\n\n  Her.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const iris = result.ir.entities.find((e) => e.id === 'iris')!;
    expect(iris.character?.profile).toEqual({
      'perception': 'filtered',
      'belief-formation': 'flexible',
      'coherence': 'drifting',
      'lucidity': 'stable',
      'self-model': 'intact',
    });
  });

  it('a preset with manifest-form overrides completes at compile time', () => {
    const result = compileStory(
      'create the Sergeant\n  a person, stubborn\n  cognitive-profile clear-headed with coherence drifting and perception filtered\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const sergeant = result.ir.entities.find((e) => e.id === 'sergeant')!;
    expect(sergeant.character?.profile).toMatchObject({
      'perception': 'filtered',
      'coherence': 'drifting',
      'lucidity': 'stable',
    });
    expect(sergeant.character?.personality.map((p) => p.trait)).toEqual(['stubborn']);
  });

  it('unknown profile, dimension, and value each get their own diagnostic', () => {
    const errors = errorsOf(
      'create Iris\n  a person\n  cognitive-profile hollowed\n\n  Her.\n\n' +
        'create Tom\n  a person\n  cognitive-profile braced with vibes drifting\n\n  Him.\n\n' +
        'create Ann\n  a person\n  cognitive-profile braced with coherence wobbly\n\n  Her too.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.unknown-profile')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-dimension')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-dimension-value')).toHaveLength(1);
  });

  it('a define profile shadowing a preset name is refused', () => {
    const errors = errorsOf('define profile braced\n  coherence drifting\nend profile\n');
    expect(errors.filter((e) => e.code === 'analysis.profile-shadows-preset')).toHaveLength(1);
  });

  it('a second cognitive-profile line is analysis.profile-duplicate', () => {
    const errors = errorsOf(
      'create Iris\n  a person\n  cognitive-profile braced\n  cognitive-profile fogged\n\n  Her.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.profile-duplicate')).toHaveLength(1);
  });

  it('bad rows inside define profile diagnose without killing the block', () => {
    const errors = errorsOf(
      'define profile odd\n  vibes drifting\n  coherence wobbly\n  coherence drifting\n  coherence drifting\nend profile\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.unknown-dimension')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-dimension-value')).toHaveLength(1);
    // Rows 3 and 4 both re-set `coherence` after row 2 claimed it — one
    // diagnostic per offending row.
    expect(errors.filter((e) => e.code === 'analysis.profile-row-duplicate')).toHaveLength(2);
  });
});

describe('D5 — custom vocabulary (Option 2)', () => {
  it('define mood and define personality join the vocabulary everywhere', () => {
    const result = compileStory(
      'define mood haunted like grieving, but restless\n' +
        'define personality watchful\n\n' +
        'create Iris\n' +
        '  a person, very watchful\n' +
        '  mood haunted\n' +
        '\n' +
        '  on the player attacking\n' +
        '    change mood to haunted\n' +
        '  end on\n' +
        '\n' +
        '  Her.\n\n' +
        'define phrasebook iris-haunted while Iris is haunted\n  greeting:\n    She stares.\nend phrasebook\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.customMoods).toMatchObject([{ name: 'haunted', like: 'grieving', but: 'restless' }]);
    expect(result.ir.customPersonalities).toMatchObject([{ name: 'watchful' }]);
    const iris = result.ir.entities.find((e) => e.id === 'iris')!;
    expect(iris.character?.mood).toBe('haunted');
    expect(iris.character?.personality).toMatchObject([{ trait: 'watchful', intensity: 'very' }]);
    expect(result.ir.phrasebooks.find((b) => b.name === 'iris-haunted')?.specificity).toBe('character');
  });

  it('a bare anchor (no modifier) compiles without a but field', () => {
    const result = compileStory('define mood wistful like sad\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.customMoods).toMatchObject([{ name: 'wistful', like: 'sad' }]);
    expect('but' in result.ir.customMoods![0]).toBe(false);
  });

  it('shadowing, bad anchors, and bad modifiers each get their own diagnostic', () => {
    expect(
      errorsOf('define mood calm like sad\n').filter((e) => e.code === 'analysis.mood-shadows-platform'),
    ).toHaveLength(1);
    expect(
      errorsOf('define personality honest\n').filter((e) => e.code === 'analysis.personality-shadows-platform'),
    ).toHaveLength(1);
    expect(
      errorsOf('define personality guard\n').filter((e) => e.code === 'analysis.personality-shadows-trait'),
    ).toHaveLength(1);
    expect(
      errorsOf('define mood haunted like haunting\n').filter((e) => e.code === 'analysis.unknown-mood-word'),
    ).toHaveLength(1);
    expect(
      errorsOf('define mood haunted like grieving, but louder\n').filter(
        (e) => e.code === 'analysis.unknown-mood-modifier',
      ),
    ).toHaveLength(1);
    // A custom mood cannot anchor another custom mood.
    expect(
      errorsOf('define mood haunted like grieving\ndefine mood spectral like haunted\n').filter(
        (e) => e.code === 'analysis.unknown-mood-word',
      ),
    ).toHaveLength(1);
  });
});

describe('D10 — spreads propagation lines', () => {
  it('`spreads nothing` compiles to the nothing form', () => {
    const result = compileStory('create the Butler\n  a person\n  spreads nothing\n\n  Him.\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const butler = result.ir.entities.find((e) => e.id === 'butler')!;
    expect(butler.character?.spreads).toMatchObject({ kind: 'nothing' });
  });

  it('the full form carries normalized topics, the audience, and resolved excepts', () => {
    const result = compileStory(
      'create the Colonel\n  a person, proper\n\n  Him.\n\n' +
        'create the Maid\n  a person\n  spreads gossip chatty to trusted, except the Colonel\n\n  Her.\n\n' +
        'create the Cook\n  a person\n  spreads the murder and the weapon to anyone\n\n  Her too.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const maid = result.ir.entities.find((e) => e.id === 'maid')!;
    expect(maid.character?.spreads).toMatchObject({
      kind: 'spreads',
      topics: ['gossip'],
      to: 'trusted',
      except: ['colonel'],
    });
    const cook = result.ir.entities.find((e) => e.id === 'cook')!;
    expect(cook.character?.spreads).toMatchObject({
      kind: 'spreads',
      topics: ['murder', 'weapon'],
      to: 'anyone',
      except: [],
    });
  });

  it('an empty topic list (spreads everything held) compiles', () => {
    const result = compileStory('create the Maid\n  a person\n  spreads chatty to trusted\n\n  Her.\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const maid = result.ir.entities.find((e) => e.id === 'maid')!;
    expect(maid.character?.spreads).toMatchObject({ kind: 'spreads', topics: [], to: 'trusted' });
  });

  it('D8/D9 goal, influence, and resists declarations compile into character data', () => {
    const result = compileStory(
      'define phrase mustard-attacks-player\n  He lunges.\nend phrase\n\n' +
        'define phrase ginger-brushes-against\n  She brushes past.\nend phrase\n\n' +
        'define phrase ginger-brushes-against-no-effect\n  Nothing happens.\nend phrase\n\n' +
        'define phrase ginger-moves-off\n  The air clears.\nend phrase\n\n' +
        'create the Kitchen\n  a room\n\n  A kitchen.\n\n' +
        'create the kitchen knife\n  in the Kitchen\n\n  A knife.\n\n' +
        'create Robin\n  a person\n  playable\n\n  Me.\n\n' +
        'create Colonel Mustard\n' +
        '  a person, proper, cruel\n' +
        '  in the Kitchen\n' +
        '  knows the player suspects me, inferred\n' +
        '\n' +
        '  goal eliminate-player, critical\n' +
        '    active when Colonel Mustard is in the Kitchen\n' +
        '    seek the kitchen knife in the Kitchen\n' +
        '    wait for the player is here\n' +
        '    act mustard-attacks-player\n' +
        '  end goal\n' +
        '\n' +
        '  A man.\n\n' +
        'create Ginger\n' +
        '  a person, proper\n' +
        '  in the Kitchen\n' +
        '\n' +
        '  influence seduction, passive, proximity\n' +
        '    clouds focus\n' +
        '    makes mood confused\n' +
        '    phrase ginger-brushes-against on witnessed\n' +
        '    phrase ginger-brushes-against-no-effect on resisted\n' +
        '    phrase ginger-moves-off on expired\n' +
        '  end influence\n' +
        '\n' +
        '  A woman.\n\n' +
        'create Margaret\n' +
        '  a person, proper\n' +
        '  in the Kitchen\n' +
        '  resists seduction, except from a woman\n' +
        '\n' +
        '  Another woman.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const mustard = result.ir.entities.find((e) => e.id === 'colonel-mustard')!;
    expect(mustard.character?.goals).toHaveLength(1);
    const goal = mustard.character!.goals[0];
    expect(goal).toMatchObject({ id: 'eliminate-player', priority: 'critical' });
    expect(goal.activeWhen).not.toBeNull();
    expect(goal.steps).toMatchObject([
      { kind: 'seek', target: 'kitchen-knife', in: 'kitchen' },
      { kind: 'wait-for' },
      { kind: 'act', phraseKey: 'mustard-attacks-player' },
    ]);

    const ginger = result.ir.entities.find((e) => e.id === 'ginger')!;
    expect(ginger.character?.influences).toMatchObject([
      {
        name: 'seduction',
        mode: 'passive',
        range: 'proximity',
        effect: { focus: 'clouded', mood: 'confused' },
        witnessed: 'ginger-brushes-against',
        resisted: 'ginger-brushes-against-no-effect',
        expired: 'ginger-moves-off',
      },
    ]);

    const margaret = result.ir.entities.find((e) => e.id === 'margaret')!;
    expect(margaret.character?.resists).toMatchObject([
      { influence: 'seduction', exceptFrom: { kind: 'classifier', value: 'woman' } },
    ]);
  });

  it('goal and influence diagnostics: unknown priority, unknown slot, unknown effect word, dead resists', () => {
    const errors = errorsOf(
      'create Tobias\n  a person\n\n' +
        '  goal flee, urgent\n    move to Tobias\n  end goal\n\n' +
        '  influence menace, loudly\n    clouds focus\n  end influence\n\n' +
        '  influence sulk, passive, proximity\n    makes mood grumpy\n  end influence\n\n' +
        '  resists charm\n\n' +
        '  A man.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.unknown-priority')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-influence-slot')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-influence-effect-word')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.unknown-influence')).toHaveLength(1);
  });

  it('a duplicate expired phrase arm errors like the witnessed/resisted duplicates', () => {
    const errors = errorsOf(
      'define phrase air-clears\n  The air clears.\nend phrase\n\n' +
        'define phrase air-clears-again\n  Again.\nend phrase\n\n' +
        'create Tobias\n  a person\n\n' +
        '  influence menace, passive, proximity\n' +
        '    makes mood nervous\n' +
        '    phrase air-clears on expired\n' +
        '    phrase air-clears-again on expired\n' +
        '  end influence\n\n' +
        '  A man.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.influence-effect-duplicate')).toHaveLength(1);
  });

  it('an unclosed goal block and an unknown step verb each error', () => {
    expect(
      errorsOf('create Tobias\n  a person\n\n  goal flee, low\n    move to Tobias\n\n  A man.\n').filter(
        (e) => e.code === 'parse.goal-end',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create Tobias\n  a person\n\n  goal flee, low\n    wander around\n  end goal\n\n  A man.\n').filter(
        (e) => e.code === 'parse.goal-step',
      ),
    ).toHaveLength(1);
  });

  it('`mute`, an unknown audience, and a duplicate line each error', () => {
    expect(
      errorsOf('create the Butler\n  a person\n  spreads mute to trusted\n\n  Him.\n').filter(
        (e) => e.code === 'parse.spreads-tendency',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create the Maid\n  a person\n  spreads gossip to everybody\n\n  Her.\n').filter(
        (e) => e.code === 'analysis.unknown-audience',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create the Maid\n  a person\n  spreads nothing\n  spreads gossip to anyone\n\n  Her.\n').filter(
        (e) => e.code === 'analysis.spreads-duplicate',
      ),
    ).toHaveLength(1);
  });
});

describe('ADR-318 D3/D7 — temperaments', () => {
  it('a named def reaches StoryIR.temperaments and the binding references it', () => {
    const result = compileStory(
      'define temperament steadfast\n  duty over fear\n  duty over desire\nend temperament\n\ncreate Tobias\n  a person\n  temperament steadfast\n\n  A man.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.temperaments?.map((t) => ({ name: t.name, pairs: t.pairs }))).toEqual([
      { name: 'steadfast', pairs: [['duty', 'fear'], ['duty', 'desire']] },
    ]);
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character?.temperaments.map((b) => ({ name: b.name, while: b.while }))).toEqual([
      { name: 'steadfast', while: undefined },
    ]);
  });

  it('state-bound bindings carry their `while` state (the Witness shape)', () => {
    const result = compileStory(
      'define temperament timid\n  fear over duty\nend temperament\n\ndefine temperament steadfast\n  duty over fear\nend temperament\n\ncreate the Witness\n  a person\n  states: cowed, resolute\n  temperament timid while cowed\n  temperament steadfast while resolute\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const witness = result.ir.entities.find((e) => e.id === 'witness')!;
    expect(witness.character?.temperaments.map((b) => ({ name: b.name, while: b.while }))).toEqual([
      { name: 'timid', while: 'cowed' },
      { name: 'steadfast', while: 'resolute' },
    ]);
  });

  it('an inline ordering synthesizes an @-named def (the Colonel shape)', () => {
    const result = compileStory(
      'create the Colonel\n  a person\n  temperament honor over fear and honor over duty\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const colonel = result.ir.entities.find((e) => e.id === 'colonel')!;
    expect(colonel.character?.temperaments).toHaveLength(1);
    const defName = colonel.character!.temperaments[0].name;
    expect(defName).toBe('colonel@temperament-1');
    expect(result.ir.temperaments?.find((t) => t.name === defName)?.pairs).toEqual([
      ['honor', 'fear'],
      ['honor', 'duty'],
    ]);
  });

  it('`with` overrides fold onto the named base as a synthesized def', () => {
    const result = compileStory(
      'define temperament steadfast\n  duty over fear\n  duty over desire\nend temperament\n\ncreate Tobias\n  a person\n  temperament steadfast with fear over duty\n\n  A man.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    const defName = tobias.character!.temperaments[0].name;
    expect(defName).toBe('tobias@temperament-1');
    // The override replaces the base's (duty, fear) pair and keeps the rest.
    expect(result.ir.temperaments?.find((t) => t.name === defName)?.pairs).toEqual([
      ['duty', 'desire'],
      ['fear', 'duty'],
    ]);
    // The base def still ships untouched.
    expect(result.ir.temperaments?.find((t) => t.name === 'steadfast')?.pairs).toEqual([
      ['duty', 'fear'],
      ['duty', 'desire'],
    ]);
  });

  it('a temperament-only block still creates the character (D7 presence)', () => {
    const result = compileStory('create Tobias\n  a person\n  temperament duty over fear\n\n  A man.\n');
    const tobias = result.ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.character).toBeDefined();
    expect(tobias.character?.personality).toEqual([]);
  });

  it('an unknown force errors with the vocabulary and a suggestion', () => {
    const errors = errorsOf(
      'define temperament brave\n  duty over feer\nend temperament\n\ncreate Tobias\n  a person\n  temperament brave\n\n  A man.\n',
    );
    const unknown = errors.filter((e) => e.code === 'analysis.unknown-force');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('fear');
  });

  it('a self-pair and a reversed duplicate each error', () => {
    expect(
      errorsOf('define temperament odd\n  duty over duty\nend temperament\n').filter(
        (e) => e.code === 'analysis.temperament-self-pair',
      ),
    ).toHaveLength(1);
    const reversed = errorsOf(
      'define temperament torn\n  duty over fear\n  fear over duty\nend temperament\n',
    ).filter((e) => e.code === 'analysis.temperament-pair-duplicate');
    expect(reversed).toHaveLength(1);
    expect(reversed[0].message).toContain('contradicts');
  });

  it('a duplicate def name and an unknown reference each error', () => {
    expect(
      errorsOf(
        'define temperament brave\n  duty over fear\nend temperament\n\ndefine temperament brave\n  honor over fear\nend temperament\n',
      ).filter((e) => e.code === 'analysis.duplicate-temperament'),
    ).toHaveLength(1);
    const unknown = errorsOf(
      'define temperament steadfast\n  duty over fear\nend temperament\n\ncreate Tobias\n  a person\n  temperament stedfast\n\n  A man.\n',
    ).filter((e) => e.code === 'analysis.unknown-temperament');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('steadfast');
  });

  it('a `while` state the entity never declares errors', () => {
    expect(
      errorsOf(
        'define temperament timid\n  fear over duty\nend temperament\n\ncreate Tobias\n  a person\n  states: calm-state, angry-state\n  temperament timid while cowed\n\n  A man.\n',
      ).filter((e) => e.code === 'analysis.temperament-unknown-state'),
    ).toHaveLength(1);
  });

  it('two bindings live for the same state — and two unconditional — are ties', () => {
    const sameState = errorsOf(
      'define temperament timid\n  fear over duty\nend temperament\n\ndefine temperament brave\n  duty over fear\nend temperament\n\ncreate Tobias\n  a person\n  states: cowed, free\n  temperament timid while cowed\n  temperament brave while cowed\n\n  A man.\n',
    ).filter((e) => e.code === 'analysis.temperament-tie');
    expect(sameState).toHaveLength(1);
    const unconditional = errorsOf(
      'create Tobias\n  a person\n  temperament duty over fear\n  temperament honor over fear\n\n  A man.\n',
    ).filter((e) => e.code === 'analysis.temperament-tie');
    expect(unconditional).toHaveLength(1);
  });

  it('temperament gates on a non-person, and composes on a playable character', () => {
    expect(
      errorsOf('create the Lantern\n  temperament duty over fear\n\n  A lantern.\n').filter(
        (e) => e.code === 'analysis.character-line-person-only',
      ),
    ).toHaveLength(1);
    // ADR-327 D10: no `analysis.character-line-player` — the role is not a block.
    expect(errorsOf('create Robin\n  playable\n  a person\n  temperament duty over fear\n\n  Me.\n')).toEqual([]);
  });

  it('an empty define block and a malformed pair line each error at parse', () => {
    expect(
      errorsOf('define temperament hollow\nend temperament\n').filter((e) => e.code === 'parse.temperament-empty'),
    ).toHaveLength(1);
    expect(
      errorsOf('define temperament odd\n  duty above fear\nend temperament\n').filter(
        (e) => e.code === 'parse.temperament-pair',
      ),
    ).toHaveLength(1);
  });
});

describe('ADR-318 D4/D5 — principles, obligations, codes', () => {
  it('never-lines land as infinitive categories; scope and except resolve (the Housekeeper shape)', () => {
    const result = compileStory(
      'create the Children\n  a person\n\n  Them.\n\ncreate the Housekeeper\n  a person, very loyal\n  never lies, except to protect the Children\n  protects the Children\n\n  Her.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const hk = result.ir.entities.find((e) => e.id === 'housekeeper')!;
    expect(hk.character?.principles.map((p) => ({ category: p.category, except: p.except }))).toEqual([
      { category: 'lie', except: { kind: 'protect', scope: { kind: 'entity', value: 'children' } } },
    ]);
    expect(hk.character?.obligations).toMatchObject([{ kind: 'protects', scope: { kind: 'entity', value: 'children' } }]);
  });

  it('multi-word categories longest-match their third-person surface', () => {
    const result = compileStory(
      'create the Witness\n  a person\n  never betrays a confidence\n  never breaks a promise\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const witness = result.ir.entities.find((e) => e.id === 'witness')!;
    expect(witness.character?.principles.map((p) => p.category)).toEqual(['betray a confidence', 'break a promise']);
  });

  it('harms takes anyone/classifier/entity scopes; a plain except is the object carve-out', () => {
    const result = compileStory(
      'create the Duke\n  a person\n\n  Him.\n\ncreate the Bodyguard\n  a person\n  never harms a servant\n  never abandons the Duke\n  never steals, except the Duke\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const guard = result.ir.entities.find((e) => e.id === 'bodyguard')!;
    expect(guard.character?.principles).toMatchObject([
      { category: 'harm', scope: { kind: 'classifier', value: 'servant' } },
      { category: 'abandon', scope: { kind: 'entity', value: 'duke' } },
      { category: 'steal', except: { kind: 'object', scope: { kind: 'entity', value: 'duke' } } },
    ]);
  });

  it('`answers honestly` is its own obligation word', () => {
    const result = compileStory('create the Vicar\n  a person\n  answers honestly\n\n  Him.\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const vicar = result.ir.entities.find((e) => e.id === 'vicar')!;
    expect(vicar.character?.obligations).toMatchObject([{ kind: 'answers honestly' }]);
    expect(vicar.character?.principles).toEqual([]);
  });

  it('a code flattens before bare lines and never reaches the wire', () => {
    const result = compileStory(
      'define code servants-code\n  never betrays a confidence\n  never steals\n  protects the Household\nend code\n\ncreate the Household\n  a person\n\n  Them.\n\ncreate the Butler\n  a person\n  code servants-code\n  never lies\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const butler = result.ir.entities.find((e) => e.id === 'butler')!;
    expect(butler.character?.principles.map((p) => p.category)).toEqual(['betray a confidence', 'steal', 'lie']);
    expect(butler.character?.obligations).toMatchObject([{ kind: 'protects', scope: { kind: 'entity', value: 'household' } }]);
    expect(JSON.stringify(result.ir).includes('servants-code')).toBe(false);
  });

  it('an unknown category surface errors with the third-person vocabulary', () => {
    const errors = errorsOf('create Tobias\n  a person\n  never gossips\n\n  A man.\n');
    const unknown = errors.filter((e) => e.code === 'analysis.unknown-act-category');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('betrays a confidence');
    expect(unknown[0].message).toContain('trespasses');
  });

  it('scope on a scopeless category errors', () => {
    expect(
      errorsOf('create the Duke\n  a person\n\n  Him.\n\ncreate Tobias\n  a person\n  never lies the Duke\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.principle-scope',
      ),
    ).toHaveLength(1);
  });

  it('an unknown code, a duplicate code, and duplicate lines each error', () => {
    expect(
      errorsOf('create Tobias\n  a person\n  code servants-code\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.unknown-code',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf(
        'define code oath\n  never lies\nend code\n\ndefine code oath\n  never steals\nend code\n',
      ).filter((e) => e.code === 'analysis.duplicate-code'),
    ).toHaveLength(1);
    expect(
      errorsOf(
        'define code oath\n  never lies\nend code\n\ncreate Tobias\n  a person\n  code oath\n  never lies\n\n  A man.\n',
      ).filter((e) => e.code === 'analysis.principle-duplicate'),
    ).toHaveLength(1);
    expect(
      errorsOf('create Tobias\n  a person\n  answers honestly\n  answers honestly\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.obligation-duplicate',
      ),
    ).toHaveLength(1);
  });

  it('principle lines on a non-person gate; an empty or malformed code block errors at parse', () => {
    expect(
      errorsOf('create the Lantern\n  never lies\n\n  A lantern.\n').filter(
        (e) => e.code === 'analysis.character-line-person-only',
      ),
    ).toHaveLength(1);
    expect(errorsOf('define code hollow\nend code\n').filter((e) => e.code === 'parse.code-empty')).toHaveLength(1);
    expect(
      errorsOf('define code odd\n  goal flee, low\nend code\n').filter((e) => e.code === 'parse.code-line'),
    ).toHaveLength(1);
  });
});

describe('ADR-318 D7 — honor', () => {
  it('`honor before <scope>` binds the full platform bundle (the Colonel shape)', () => {
    const result = compileStory(
      'create the Regiment\n  a person\n\n  Them.\n\ncreate the Colonel\n  a person, vain\n  honor before the Regiment\n  temperament honor over fear\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const colonel = result.ir.entities.find((e) => e.id === 'colonel')!;
    expect(colonel.character?.honor).toMatchObject({
      scope: { kind: 'entity', value: 'regiment' },
      except: [],
      faceActs: ['backs down', 'shows fear', 'admits fault', 'pleads', 'accepts insult', 'caught lying'],
    });
  });

  it('a named bundle binds its subset; the def never reaches the wire; except lists entities', () => {
    const result = compileStory(
      'define honor soldiers-honor\n  backs down\n  shows fear\nend honor\n\ncreate the Duke\n  a person\n\n  Him.\n\ncreate the Sergeant\n  a person\n  honor soldiers-honor before anyone, except the Duke\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const sergeant = result.ir.entities.find((e) => e.id === 'sergeant')!;
    expect(sergeant.character?.honor).toMatchObject({
      scope: { kind: 'anyone' },
      except: ['duke'],
      faceActs: ['backs down', 'shows fear'],
    });
    expect(JSON.stringify(result.ir).includes('soldiers-honor')).toBe(false);
  });

  it('a classifier scope resolves (`honor before a servant`)', () => {
    const result = compileStory('create the Master\n  a person\n  honor before a servant\n\n  Him.\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const master = result.ir.entities.find((e) => e.id === 'master')!;
    expect(master.character?.honor?.scope).toEqual({ kind: 'classifier', value: 'servant' });
  });

  it('an unknown face-act, a duplicate face-act, and a duplicate bundle each error', () => {
    const unknown = errorsOf('define honor odd\n  faints\nend honor\n').filter(
      (e) => e.code === 'analysis.unknown-face-act',
    );
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('backs down');
    expect(
      errorsOf('define honor odd\n  backs down\n  backs down\nend honor\n').filter(
        (e) => e.code === 'analysis.face-act-duplicate',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('define honor odd\n  pleads\nend honor\n\ndefine honor odd\n  backs down\nend honor\n').filter(
        (e) => e.code === 'analysis.duplicate-honor',
      ),
    ).toHaveLength(1);
  });

  it('an unknown bundle reference and a second honor line each error', () => {
    const unknown = errorsOf(
      'define honor soldiers-honor\n  backs down\nend honor\n\ncreate Tobias\n  a person\n  honor soldier-honor before anyone\n\n  A man.\n',
    ).filter((e) => e.code === 'analysis.unknown-honor');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('soldiers-honor');
    expect(
      errorsOf('create Tobias\n  a person\n  honor before anyone\n  honor before anyone\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.honor-duplicate',
      ),
    ).toHaveLength(1);
  });

  it('honor on a non-person gates; a missing `before` and an empty bundle error at parse', () => {
    expect(
      errorsOf('create the Lantern\n  honor before anyone\n\n  A lantern.\n').filter(
        (e) => e.code === 'analysis.character-line-person-only',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create Tobias\n  a person\n  honor the Regiment\n\n  A man.\n').filter(
        (e) => e.code === 'parse.honor-before',
      ),
    ).toHaveLength(1);
    expect(errorsOf('define honor hollow\nend honor\n').filter((e) => e.code === 'parse.honor-empty')).toHaveLength(1);
  });
});

describe('ADR-318 D8/D4 — burdened by, confided, band predicates', () => {
  it('`confided` rides the knows comma slot (the Witness shape)', () => {
    const result = compileStory(
      'create the Witness\n  a person\n  knows the secret, witnessed, confided\n  never betrays a confidence\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const witness = result.ir.entities.find((e) => e.id === 'witness')!;
    expect(witness.character?.knows).toMatchObject([{ topic: 'secret', source: 'witnessed', confided: true }]);
  });

  it('`burdened by` a held topic lands; slot order stays free', () => {
    const result = compileStory(
      'create the Penitent\n  a person\n  knows the accident, confided, witnessed\n  burdened by the accident\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const penitent = result.ir.entities.find((e) => e.id === 'penitent')!;
    expect(penitent.character?.burdenedBy).toEqual(['accident']);
    expect(penitent.character?.knows[0]).toMatchObject({ confided: true, source: 'witnessed' });
  });

  it('band words gate conditions and goal activation (`active when the Penitent is breaking`)', () => {
    const result = compileStory(
      'create the Chapel\n  a room\n\n  A chapel.\n\ncreate the Penitent\n  a person\n  knows the accident, witnessed\n  burdened by the accident\n  goal confess, critical\n    active when the Penitent is breaking\n    move to the Chapel\n  end goal\n\n  Him.\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const penitent = result.ir.entities.find((e) => e.id === 'penitent')!;
    const goal = penitent.character?.goals[0];
    expect(goal?.activeWhen).toMatchObject({ kind: 'predicate', pred: 'is', object: { kind: 'symbol', name: 'breaking' } });
  });

  it('two character-scoped books split on different band words are provably exclusive (D16)', () => {
    const result = compileStory(
      'create the Steward\n  a person\n  knows the crime, witnessed\n\n  Him.\n\ndefine phrasebook steward-calm while the Steward is clear\n  greeting: Fine day.\nend phrasebook\n\ndefine phrasebook steward-strained while the Steward is burdened\n  greeting: What do you want.\nend phrasebook\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrasebooks.map((b) => b.specificity)).toEqual(['character', 'character']);
  });

  it('`burdened by` an unheld topic and a duplicate each error', () => {
    const unheld = errorsOf('create Tobias\n  a person\n  burdened by the accident\n\n  A man.\n').filter(
      (e) => e.code === 'analysis.burdened-unheld',
    );
    expect(unheld).toHaveLength(1);
    expect(unheld[0].message).toContain('knows');
    expect(
      errorsOf(
        'create Tobias\n  a person\n  knows the accident, witnessed\n  burdened by the accident\n  burdened by the accident\n\n  A man.\n',
      ).filter((e) => e.code === 'analysis.burdened-duplicate'),
    ).toHaveLength(1);
  });

  it('`confided` on a thinks line and a duplicate confided each error', () => {
    expect(
      errorsOf(
        'define fact the killer\n  the Master, nobody\nend fact\n\ncreate the Master\n  a person\n\n  Him.\n\ncreate Tobias\n  a person\n  thinks the killer is nobody, confided\n\n  A man.\n',
      ).filter((e) => e.code === 'analysis.unknown-thinks-slot'),
    ).toHaveLength(1);
    expect(
      errorsOf('create Tobias\n  a person\n  knows the secret, witnessed, confided, confided\n\n  A man.\n').filter(
        (e) => e.code === 'analysis.knows-slot-duplicate',
      ),
    ).toHaveLength(1);
  });

  it('a malformed burdened line errors at parse', () => {
    expect(
      errorsOf('create Tobias\n  a person\n  burdened with guilt\n\n  A man.\n').filter(
        (e) => e.code === 'parse.burdened-by',
      ),
    ).toHaveLength(1);
  });
});

describe('ADR-318 D9/D12a — claims tags and witnessed-act aliases', () => {
  const STEWARD_FACTS =
    'define fact the killer\n  the Master, nobody\nend fact\n\ncreate the Master\n  a person\n\n  Him.\n\n';

  it('a claims tag lands on the phrase with the canonical value (the Steward shape)', () => {
    const result = compileStory(
      STEWARD_FACTS +
        'define phrase steward-truth, claims the killer is the Master\n  He did it.\nend phrase\n\ndefine phrase steward-alibi, claims the killer is nobody\n  No one did.\nend phrase\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const phrases = result.ir.phrases.locales['en-US'];
    expect(phrases['steward-truth'].claims).toEqual({ factId: 'killer', value: 'master' });
    expect(phrases['steward-alibi'].claims).toEqual({ factId: 'killer', value: 'nobody' });
  });

  it('claims composes with a strategy slot; a line without the tag carries nothing', () => {
    const result = compileStory(
      STEWARD_FACTS +
        'define phrase steward-dodge, cycling, claims the killer is nobody\n  Not me.\n  or\n  Ask another.\nend phrase\n\ndefine phrase steward-weather\n  Fine day.\nend phrase\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const phrases = result.ir.phrases.locales['en-US'];
    expect(phrases['steward-dodge'].strategy).toBe('cycling');
    expect(phrases['steward-dodge'].claims).toEqual({ factId: 'killer', value: 'nobody' });
    expect(phrases['steward-weather'].claims).toBeUndefined();
  });

  it('a claims value outside the fact set and an unknown fact each error', () => {
    const outside = errorsOf(
      STEWARD_FACTS + 'define phrase steward-wild, claims the killer is somebody\n  Them!\nend phrase\n',
    );
    expect(outside.filter((e) => e.code === 'analysis.unknown-claim-value')).toHaveLength(1);
    expect(
      errorsOf('define phrase p, claims the weapon is a knife\n  A knife.\nend phrase\n').filter(
        (e) => e.code === 'analysis.unknown-fact',
      ),
    ).toHaveLength(1);
  });

  it('a witnessed face-act aliases at story level (the Colonel shape)', () => {
    const result = compileStory(
      'create the Colonel\n  a person\n\n  Him.\n\ndefine topic the Colonel backs down as the-colonels-shame\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.witnessedTopics).toEqual([
      expect.objectContaining({ actor: 'colonel', act: 'backs down', alias: 'the-colonels-shame' }),
    ]);
  });

  it('an act-category surface aliases with the infinitive on the wire', () => {
    const result = compileStory(
      'create the Steward\n  a person\n\n  Him.\n\ndefine topic the Steward breaks a promise as the-broken-oath\n',
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.witnessedTopics?.[0]).toMatchObject({ actor: 'steward', act: 'break a promise' });
  });

  it('no detectable act, a duplicate alias, and a second alias for a pair each error', () => {
    const noAct = errorsOf(
      'create the Colonel\n  a person\n\n  Him.\n\ndefine topic the Colonel sneezes as the-sneeze\n',
    ).filter((e) => e.code === 'analysis.unknown-witnessed-act');
    expect(noAct).toHaveLength(1);
    expect(noAct[0].message).toContain('backs down');
    expect(
      errorsOf(
        'create the Colonel\n  a person\n\n  Him.\n\ndefine topic the Colonel backs down as shame\ndefine topic the Colonel pleads as shame\n',
      ).filter((e) => e.code === 'analysis.duplicate-witnessed-alias'),
    ).toHaveLength(1);
    expect(
      errorsOf(
        'create the Colonel\n  a person\n\n  Him.\n\ndefine topic the Colonel backs down as shame\ndefine topic the Colonel backs down as disgrace\n',
      ).filter((e) => e.code === 'analysis.witnessed-duplicate'),
    ).toHaveLength(1);
  });

  it('a malformed alias line errors at parse; no declarations leaves the field absent', () => {
    expect(
      errorsOf('create the Colonel\n  a person\n\n  Him.\n\ndefine topic the Colonel backs down\n').filter(
        (e) => e.code === 'parse.topic-alias',
      ),
    ).toHaveLength(1);
    const bare = compileStory('create Tobias\n  a person\n\n  A man.\n');
    expect('witnessedTopics' in bare.ir).toBe(false);
  });
});

describe('ADR-318 D8 — unknown band word in a predicate', () => {
  it('a near-band typo errors with the band words in the offered vocabulary', () => {
    const errors = errorsOf(
      'create Tobias\n  a person\n  knows the accident, witnessed\n  goal confess, low\n    active when Tobias is burdned\n    move to Tobias\n  end goal\n\n  A man.\n',
    );
    const unknown = errors.filter((e) => e.code === 'analysis.unknown-value');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('burdened');
  });
});
