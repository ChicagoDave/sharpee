/**
 * ADR-409 compile-time surface (AC-1, AC-2): every thing, person and door
 * declares `singular` or `plural`; a bare declaration takes the locale's
 * suffix rule for the name's last word and each aka word, and is refused
 * where the rule cannot tell the other form; `plural of <singular>` and
 * `singular of <plural>` write the form. The IR carries every form with
 * its origin, and the rules are the locale's data, not chord's code.
 */

import { describe, expect, it } from 'vitest';
import { compile, otherFormOfPhrase, workOutAkaForms, STDLIB_MANIFEST } from '../src';
import type { FormRules, SingularPluralFacts } from '../src';
import type { IREntity } from '../src/ir';

const HEADER = `story
  title: Singular and Plural Forms
  authors:
    T
  id: singular-plural-forms
  story-version: 0.0.1
`;

/** A story with a hall, a playable Alex and the body's blocks; every fixture thing and door is declared singular or plural. */
const story = (body: string) => `${HEADER}
before the game starts
  change the player to Alex
end before

create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  starts in the Hall

  You.

${body}`;

/** A thing in the hall, with the given composition after `a thing, `. */
const thing = (name: string, composition: string, extra = '') => `create the ${name}
  a thing, ${composition}
${extra}  in the Hall

  It is there.
`;

function compileStory(body: string) {
  return compile(story(body));
}

/** The body's singular/plural diagnostics: the parser's and the analyzer's codes for the declaration. */
function errors(body: string) {
  return compileStory(body).diagnostics.filter(
    (d) => d.severity === 'error' && (d.code.startsWith('analysis.singular-plural-') || d.code === 'parse.singular-plural-of'),
  );
}

function entity(body: string, id: string): IREntity {
  const result = compileStory(body);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const found = result.ir.entities.find((e) => e.id === id);
  expect(found).toBeDefined();
  return found!;
}

describe('ADR-409 AC-1: the analyzer refuses what the declaration cannot say', () => {
  it('refuses a thing declared neither singular nor plural', () => {
    const found = errors(thing('lamp', 'scenery'));
    expect(found.map((d) => d.code)).toEqual(['analysis.singular-plural-missing']);
    expect(found[0].message).toContain('`lamp`: declare `singular` or `plural`');
  });

  it('refuses a door declared neither', () => {
    const body = `create the oak door
  a door

  A door.
`;
    expect(errors(body).map((d) => d.code)).toEqual(['analysis.singular-plural-missing']);
  });

  it('lets a person go undeclared, with no forms (Amendment 3)', () => {
    const body = `create Wren
  a person, proper
  in the Hall

  Wren.
`;
    expect(errors(body)).toEqual([]);
    expect(entity(body, 'wren').forms).toBeUndefined();
  });

  it('works the rule out for a person who is declared', () => {
    const body = `create the guards
  a person, plural
  in the Hall

  The guards.
`;
    expect(entity(body, 'guards').forms).toEqual({ singular: 'guard', plural: 'guards', origin: 'worked-out', aka: [] });
  });

  it('refuses a thing declared both, and one declared twice', () => {
    expect(errors(thing('lamp', 'singular, plural')).map((d) => d.code)).toEqual(['analysis.singular-plural-twice']);
    expect(errors(thing('lamp', 'singular, singular')).map((d) => d.code)).toEqual(['analysis.singular-plural-twice']);
  });

  it('refuses a conditional declaration', () => {
    const found = errors(thing('lamp', 'plural while the player is in the Hall'));
    expect(found.map((d) => d.code)).toContain('analysis.singular-plural-conditional');
  });

  it('refuses the declaration on a room and on a region', () => {
    const body = `create the Cellar
  a room, singular

  A cellar.

create the House
  a region, plural of house
`;
    expect(errors(body).map((d) => d.code)).toEqual(['analysis.singular-plural-on-place', 'analysis.singular-plural-on-place']);
  });

  it('refuses an `of` with no form', () => {
    const found = errors(thing('cacti', 'plural of'));
    expect(found.map((d) => d.code)).toEqual(['parse.singular-plural-of']);
    expect(found[0].message).toContain('`plural of <form>`');
  });

  const unsafe: ReadonlyArray<[name: string, declaration: string, fix: string]> = [
    ['shelf', 'singular', 'singular of <its plural>'],
    ['potato', 'singular', 'singular of <its plural>'],
    ['cactus', 'singular', 'singular of <its plural>'],
    ['houses', 'plural', 'plural of <its singular>'],
    ['movies', 'plural', 'plural of <its singular>'],
    ['shelves', 'plural', 'plural of <its singular>'],
    ['mice', 'plural', 'plural of <its singular>'],
  ];
  for (const [name, declaration, fix] of unsafe) {
    it(`refuses a bare \`${declaration}\` on \`${name}\`, naming the \`of\` fix`, () => {
      const found = errors(thing(name, declaration));
      expect(found.map((d) => d.code)).toEqual(['analysis.singular-plural-unsafe-ending']);
      expect(found[0].message).toBe(`\`${name}\`: write \`${fix}\` — the rule cannot tell the other form of \`${name}\`.`);
    });
  }

  it('refuses a bare declaration on a stopword name', () => {
    const found = errors(thing('pot of gold', 'singular'));
    expect(found.map((d) => d.code)).toEqual(['analysis.singular-plural-stopword-name']);
    expect(found[0].message).toContain('`pot of gold`: write `singular of <its plural>`');
  });

  it('refuses a bare declaration on a proper person', () => {
    const body = `create Wren
  a person, proper, singular
  in the Hall

  Wren.
`;
    const found = errors(body);
    expect(found.map((d) => d.code)).toEqual(['analysis.singular-plural-proper-name']);
    expect(found[0].message).toBe('`Wren` is a proper name, which gets no worked-out form — write `singular of <its plural>`.');
  });
});

describe('ADR-409 AC-2: the analyzer writes every form into the IR with its origin', () => {
  const workedOut: ReadonlyArray<[name: string, declaration: string, form: string]> = [
    ['candles', 'plural', 'candle'],
    ['jar', 'singular', 'jars'],
    ['box', 'singular', 'boxes'],
    ['berry', 'singular', 'berries'],
    ['bee smoker', 'singular', 'bee smokers'],
    ['key', 'singular', 'keys'],
  ];
  for (const [name, declaration, form] of workedOut) {
    it(`works out \`${form}\` for a bare-\`${declaration}\` \`${name}\``, () => {
      const found = entity(thing(name, declaration), name.replace(/ /g, '-'));
      const [singular, plural] = declaration === 'singular' ? [name, form] : [form, name];
      expect(found.forms).toEqual({ singular, plural, origin: 'worked-out', aka: [] });
    });
  }

  it('works out an aka word\'s other form: `aka prickets` answers to `pricket`', () => {
    const found = entity(thing('candles', 'scenery, plural', '  aka prickets\n'), 'candles');
    expect(found.forms).toEqual({ singular: 'candle', plural: 'candles', origin: 'worked-out', aka: [{ word: 'prickets', form: 'pricket' }] });
  });

  it('marks a written `of` form as written', () => {
    const cacti = entity(thing('cacti', 'scenery, plural of cactus', '  aka succulents\n'), 'cacti');
    expect(cacti.forms).toEqual({ singular: 'cactus', plural: 'cacti', origin: 'written', aka: [{ word: 'succulents', form: 'succulent' }] });
    const mouse = entity(thing('mouse', 'singular of mice'), 'mouse');
    expect(mouse.forms).toEqual({ singular: 'mouse', plural: 'mice', origin: 'written', aka: [] });
  });

  it('gives an unsafe aka word, and an aka word with a stopword inside it, no form', () => {
    const found = entity(thing('coins', 'plural', '  aka bag of coins, shelves, crocks\n'), 'coins');
    expect(found.forms).toEqual({ singular: 'coin', plural: 'coins', origin: 'worked-out', aka: [{ word: 'crocks', form: 'crock' }] });
  });

  it('works out no aka form the entity already writes', () => {
    const found = entity(thing('jars', 'scenery, plural', '  aka jar, crocks\n'), 'jars');
    expect(found.forms).toEqual({ singular: 'jar', plural: 'jars', origin: 'worked-out', aka: [{ word: 'crocks', form: 'crock' }] });
  });

  it('gives a proper person only the written form', () => {
    const body = `create Wren
  a person, proper, singular of Wrens
  aka the herbalist
  in the Hall

  Wren.
`;
    const found = entity(body, 'wren');
    expect(found.forms).toEqual({ singular: 'Wren', plural: 'Wrens', origin: 'written', aka: [] });
  });

  it('writes no forms on a room', () => {
    const found = entity('', 'hall');
    expect(found.forms).toBeUndefined();
  });

  it('reads the rules from the locale facts, not from code', () => {
    const english: SingularPluralFacts = {
      formRules: STDLIB_MANIFEST.locales['en-US'].formRules,
      nameStopwords: STDLIB_MANIFEST.locales['en-US'].nameStopwords,
    };
    expect(otherFormOfPhrase('candles', 'plural', english)).toEqual({ form: 'candle' });

    // A test locale whose plurals take `-en` and whose stopword is `von`.
    const testRules: FormRules = {
      toPlural: [{ ending: '', drop: 0, add: 'en' }],
      toSingular: [{ ending: 'en', drop: 2, add: '' }],
      unsafeSingularEndings: ['e'],
      unsafePluralEndings: [],
    };
    const testLocale: SingularPluralFacts = { formRules: testRules, nameStopwords: ['von'] };
    expect(otherFormOfPhrase('ox', 'singular', testLocale)).toEqual({ form: 'oxen' });
    expect(otherFormOfPhrase('oxen', 'plural', testLocale)).toEqual({ form: 'ox' });
    expect(otherFormOfPhrase('candle', 'singular', testLocale)).toEqual({ reason: 'unsafe-ending' });
    expect(otherFormOfPhrase('candles', 'plural', testLocale)).toEqual({ reason: 'unsafe-ending' });
    expect(otherFormOfPhrase('pot of gold', 'singular', testLocale)).toEqual({ form: 'pot of golden' });
    expect(otherFormOfPhrase('haus von gold', 'singular', testLocale)).toEqual({ reason: 'stopword-inside' });
    expect(workOutAkaForms(['box'], 'singular', ['box'], testLocale)).toEqual([{ word: 'box', form: 'boxen' }]);
  });
});
