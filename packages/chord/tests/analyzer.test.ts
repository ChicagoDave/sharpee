/**
 * analyzer.test.ts — resolution, the six AC-3 load-time gates, and the
 * versioned Story IR (ownership grammar, 2026-07-11).
 *
 * The gate tests assert the exact diagnostic code, the `.story` line
 * number, and the suggestion text — that trio IS the AC-3 contract.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, IR_FORMAT } from '../src';

function compileFixture(name: string) {
  return compile(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

describe('cloak.story IR', () => {
  const result = compileFixture('cloak.story');
  const ir = result.ir;

  it('compiles with zero diagnostics', () => {
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('stamps the IR format version', () => {
    expect(ir.format).toBe('story language 1');
    expect(ir.format).toBe(IR_FORMAT);
  });

  it('carries the story metadata and an empty story state machine', () => {
    expect(ir.meta).toEqual({
      title: 'Cloak of Darkness',
      author: 'Roger Firth (Sharpee implementation)',
      fields: {
        id: 'cloak-of-darkness',
        version: '1.0.0',
        blurb: 'A basic IF demonstration - hang up your cloak!',
      },
    });
    expect(ir.story).toEqual({ states: [], reversible: false, onClauses: [] });
  });

  it('resolves entities to canonical IDs', () => {
    expect(ir.entities.map((e) => e.id)).toEqual([
      'foyer-of-the-opera-house',
      'cloakroom',
      'foyer-bar',
      'player',
      'velvet-cloak',
      'brass-hook',
      'message-in-the-sawdust',
    ]);
    expect(ir.entities[3].isPlayer).toBe(true);
  });

  it('resolves exits and placement to entity IDs', () => {
    const foyer = ir.entities[0];
    expect(foyer.exits).toMatchObject([
      { direction: 'west', to: 'cloakroom' },
      { direction: 'south', to: 'foyer-bar' },
    ]);
    expect(foyer.blockedExits).toMatchObject([{ direction: 'north', phraseKey: 'cant-leave' }]);
    const hook = ir.entities[5];
    expect(hook.placement).toMatchObject({ relation: 'in', place: 'cloakroom' });
    const player = ir.entities[3];
    expect(player.placement).toMatchObject({ relation: 'starts-in', place: 'foyer-of-the-opera-house' });
    expect(player.wears).toEqual(['velvet-cloak']);
  });

  it('splits kinds from traits and resolves the dark-while condition', () => {
    const bar = ir.entities[2];
    expect(bar.kinds).toMatchObject([{ name: 'room' }]);
    expect(bar.traits).toMatchObject([
      {
        name: 'dark',
        condition: {
          kind: 'predicate',
          pred: 'has',
          subject: { kind: 'player' },
          object: { kind: 'entity', id: 'velvet-cloak' },
        },
      },
    ]);
    const hook = ir.entities[5];
    expect(hook.kinds).toMatchObject([{ name: 'supporter', config: [{ key: 'capacity', value: '1', valueKind: 'number' }] }]);
    expect(hook.traits).toMatchObject([{ name: 'scenery' }]);
  });

  it('registers descriptions as derived phrase keys', () => {
    const table = ir.phrases.locales['en-US'];
    expect(ir.entities[0].descriptionKey).toBe('foyer-of-the-opera-house.description');
    expect(table['foyer-of-the-opera-house.description'].variants[0].text).toContain('spacious hall');
    expect(table['velvet-cloak.description'].variants[0].text).toContain('handsome cloak');
    // The message has no description paragraph of its own.
    expect(ir.entities[6].descriptionKey).toBeNull();
  });

  it('keeps the authored phrase table with markers', () => {
    const table = ir.phrases.locales['en-US'];
    expect(Object.keys(table)).toEqual(
      expect.arrayContaining(['cant-leave', 'stumble', 'message-intact', 'message-trampled', 'message-obliterated']),
    );
    expect(table['message-trampled'].variants[0].markers).toEqual(['garbled']);
    expect(ir.phrases.defaultLocale).toBe('en-US');
  });

  it('resolves the bar stumble reaction as an owner after-clause (no floating rules)', () => {
    expect('rules' in ir).toBe(false); // legacy array removed (Phase C P4)
    const bar = ir.entities[2];
    expect(bar.onClauses).toHaveLength(1);
    const clause = bar.onClauses[0];
    expect(clause).toMatchObject({
      clauseKind: 'after',
      action: 'entering',
      binding: 'it',
      once: false,
      routing: 'interceptor',
    });
    expect(clause.condition).toEqual({ kind: 'condition', name: 'in-darkness' });
    expect(clause.body).toMatchObject([
      { kind: 'phrase', phraseKey: 'stumble' },
      { kind: 'ordinal', ordinal: 1, body: [{ kind: 'change', entity: { kind: 'entity', id: 'message-in-the-sawdust' }, state: 'trampled' }] },
      { kind: 'ordinal', ordinal: 3, body: [{ kind: 'change', entity: { kind: 'entity', id: 'message-in-the-sawdust' }, state: 'obliterated' }] },
    ]);
  });

  it('resolves the on-reading select against the owner states', () => {
    const message = ir.entities[6];
    expect(message.onClauses).toHaveLength(1);
    expect(message.onClauses[0].clauseKind).toBe('on');
    const select = message.onClauses[0].body[0];
    expect(select).toMatchObject({
      kind: 'select-on',
      subject: { kind: 'field', base: { kind: 'it' }, field: 'state' },
    });
  });

  it('resolves the named in-darkness condition', () => {
    expect(ir.conditions).toMatchObject([
      {
        name: 'in-darkness',
        condition: {
          kind: 'predicate',
          pred: 'is',
          subject: { kind: 'field', base: { kind: 'player' }, field: 'location' },
          object: { kind: 'symbol', name: 'dark' },
        },
      },
    ]);
  });

  it('carries the verb definition and the hatch', () => {
    expect(ir.verbs).toMatchObject([{ verbs: ['hang', 'hook'] }]);
    expect(ir.hatches).toMatchObject([{ name: 'garbled', modulePath: './extras.ts' }]);
  });

  it('carries no legacy floating-rule arrays (removed in Phase C P4)', () => {
    expect('flags' in ir).toBe(false);
    expect('onceRules' in ir).toBe(false);
    expect('everyRules' in ir).toBe(false);
  });

  it('round-trips through JSON without loss', () => {
    expect(JSON.parse(JSON.stringify(ir))).toEqual(ir);
  });

  it('matches the golden IR snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});

describe('ac5-random.story IR', () => {
  const result = compileFixture('ac5-random.story');

  it('compiles with zero diagnostics', () => {
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps the randomly strategy and the chance clause condition', () => {
    const table = result.ir.phrases.locales['en-US'];
    expect(table['crossing-mutter']).toMatchObject({ strategy: 'randomly' });
    expect(table['crossing-mutter'].variants).toHaveLength(3);
    const west = result.ir.entities.find((e) => e.id === 'west-room')!;
    expect(west.onClauses).toHaveLength(2);
    expect(west.onClauses[1].clauseKind).toBe('after');
    expect(west.onClauses[1].condition).toEqual({ kind: 'chance', n: 3 });
  });
});

describe('AC-3 load-time gates — exact code, line, and suggestion', () => {
  it('gate: missing phrase key', () => {
    const result = compileFixture('gates/missing-phrase.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.missing-phrase');
    expect(errors[0].span.line).toBe(11);
    expect(errors[0].message).toContain('nonexistent-key');
    expect(result.ok).toBe(false);
  });

  it('gate: unknown predicate value, with nearest-valid suggestion', () => {
    const result = compileFixture('gates/unknown-value.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unknown-value');
    expect(errors[0].span.line).toBe(10);
    expect(errors[0].message).toContain('did you mean `intact`?');
  });

  it('gate: undeclared state in change, with suggestion', () => {
    const result = compileFixture('gates/undeclared-state.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.undeclared-state');
    expect(errors[0].span.line).toBe(11);
    expect(errors[0].message).toContain('smashed');
    expect(errors[0].message).toContain('message');
  });

  it('gate: ambiguous entity reference, with rename suggestion', () => {
    const result = compileFixture('gates/ambiguous-ref.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.ambiguous-reference');
    expect(errors[0].span.line).toBe(11);
    expect(errors[0].message).toContain('brass hook');
    expect(errors[0].message).toContain('iron hook');
    expect(errors[0].message).toContain('rename');
  });

  it('gate: refusal after mutation (phase-order rule)', () => {
    const result = compileFixture('gates/refusal-after-mutation.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
    expect(errors[0].span.line).toBe(10);
    expect(errors[0].message).toContain('move the check above');
  });

  it('gate: unbound marker in phrase text', () => {
    const result = compileFixture('gates/unbound-marker.story');
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unbound-marker');
    expect(errors[0].message).toContain('{gremlin}');
    expect(errors[0].message).toContain('spooky');
  });
});
