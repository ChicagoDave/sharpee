/**
 * character-declarations.test.ts — ADR-310 Phase 3: the character model's
 * Chord surface. D2 personality adjectives on `create`: routing into
 * `IREntity.character` (words as written, never trait composition), the D7
 * no-model-no-change guarantee, and every D2 diagnostic.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors: N\n  id: t\n  story-version: 0.0.1\n\n';

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

  it('personality on the player is analysis.personality-player', () => {
    const errors = errorsOf('create the player\n  a person, honest\n\n  Me.\n');
    expect(errors.filter((e) => e.code === 'analysis.personality-player')).toHaveLength(1);
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
    'create the player\n\n  Me.\n\n' +
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
      'create the player\n\n  Me.\n\ncreate Tobias\n  a person\n  mood calm\n  mood nervous\n  feels wary of the player\n  feels trusts toward the player\n  knows the murder, witnessed\n  knows the murder, told\n\n  A man.\n',
    );
    expect(errors.filter((e) => e.code === 'analysis.mood-duplicate')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.feels-duplicate')).toHaveLength(1);
    expect(errors.filter((e) => e.code === 'analysis.knows-duplicate')).toHaveLength(1);
  });

  it('character lines on a non-person and on the player each gate', () => {
    expect(
      errorsOf('create the Lantern\n  mood calm\n\n  A lantern.\n').filter(
        (e) => e.code === 'analysis.character-line-person-only',
      ),
    ).toHaveLength(1);
    expect(
      errorsOf('create the player\n  a person\n  mood calm\n\n  Me.\n').filter(
        (e) => e.code === 'analysis.character-line-player',
      ),
    ).toHaveLength(1);
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
    '  on attacking it\n' +
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

  it('`change it to <state>` keeps its state reading', () => {
    const result = compileStory(
      'create the Kettle\n  states: cold, hot\n\n  on taking it\n    change it to hot\n  end on\n\n  A kettle.\n',
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
    'create the player\n\n  Me.\n\n' +
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
        '  on attacking it\n' +
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
        'create the Kitchen\n  a room\n\n  A kitchen.\n\n' +
        'create the kitchen knife\n  in the Kitchen\n\n  A knife.\n\n' +
        'create the player\n\n  Me.\n\n' +
        'create Colonel Mustard\n' +
        '  a person, proper, cruel\n' +
        '  in the Kitchen\n' +
        '  knows the player suspects me, inferred\n' +
        '\n' +
        '  goal eliminate-player, critical\n' +
        '    active when it is in the Kitchen\n' +
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
