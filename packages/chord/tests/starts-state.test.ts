/**
 * starts-state.test.ts — ADR-231 D5a: the `starts <state>` initializer
 * clause on composition lines. `starts in <place>` stays placement (one-
 * token lookahead on the `starts` word Chord already owns); a known state
 * word (locked/unlocked/closed/open/off/on) is an initializer lowered to
 * `IREntity.startsStates`; an unknown word after `starts` is its own parse
 * error (`parse.starts-state`); an initializer whose paired trait is not
 * composed is the analyzer's load-time error (`analysis.starts-state-pairing`).
 * REAL-PATH: every case drives a Chord source string through the actual
 * parse → analyze pipeline (`compile`), never a hand-built AST fixture.
 */
import { describe, expect, it } from 'vitest';
import { compile, parse, CreateDecl } from '../src';

const story = (safeLines: string, extra = '') => `story "Starts" by "T"
  id: starts
  version: 0.0.1

create the Vault
  a room

  A vault.

create the safe
${safeLines}
  in the Vault

  A safe.

create the player
  starts in the Vault

  You.

create the brass key

  A small brass key.
${extra}`;

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('starts <state> parses through composition (ADR-231 D5a)', () => {
  const source = story('  a container, openable, lockable with key the brass key, starts locked');

  it('parses the flagship composition line into AST startsStates', () => {
    const result = parse(source);
    expect(result.diagnostics).toEqual([]);
    const safe = result.ast.declarations.find(
      (d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'safe',
    )!;
    expect(safe.startsStates).toMatchObject([{ kind: 'starts-state', state: 'locked' }]);
    // The initializer clause is NOT a composition item — kinds/traits are untouched.
    expect(safe.compositions.map((c) => c.words.join(' '))).toEqual(['container', 'openable', 'lockable']);
  });

  it('lowers to IREntity.startsStates through the real compile pipeline', () => {
    const result = compile(source);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const safe = result.ir.entities.find((e) => e.id === 'safe')!;
    expect(safe.startsStates).toEqual(['locked']);
    expect(safe.traits.map((t) => t.name)).toEqual(['openable', 'lockable']);
  });

  it('accepts several initializers across composition lines', () => {
    const result = compile(story('  a container, openable, starts closed\n  switchable, starts on'));
    expect(result.diagnostics).toEqual([]);
    const safe = result.ir.entities.find((e) => e.id === 'safe')!;
    expect(safe.startsStates).toEqual(['closed', 'on']);
  });

  it('leaves `starts in <place>` placement untouched', () => {
    const result = compile(story('  a container'));
    expect(result.diagnostics).toEqual([]);
    const player = result.ir.entities.find((e) => e.id === 'player')!;
    expect(player.placement).toMatchObject({ relation: 'starts-in', place: 'vault' });
    expect(player.startsStates).toEqual([]);
  });
});

describe('analysis.starts-state-pairing (THE ADR-named rejection gate)', () => {
  it('starts locked without lockable composed fails to load', () => {
    const result = compile(story('  a container, openable, starts locked'));
    expect(result.ok).toBe(false);
    const pairing = result.diagnostics.find((d) => d.code === 'analysis.starts-state-pairing')!;
    expect(pairing).toBeDefined();
    expect(pairing.severity).toBe('error');
    expect(pairing.message).toBe('`starts locked` requires `lockable` composed on this entity.');
  });

  it('starts closed / starts open require openable', () => {
    expect(errorCodes(story('  a container, starts closed'))).toContain('analysis.starts-state-pairing');
    expect(errorCodes(story('  a container, starts open'))).toContain('analysis.starts-state-pairing');
  });

  it('starts off / starts on require switchable', () => {
    expect(errorCodes(story('  a container, starts off'))).toContain('analysis.starts-state-pairing');
    expect(errorCodes(story('  a container, starts on'))).toContain('analysis.starts-state-pairing');
  });

  it('starts unlocked pairs with lockable, same table row as locked', () => {
    const bad = compile(story('  a container, starts unlocked'));
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.map((d) => d.code)).toContain('analysis.starts-state-pairing');
    const good = compile(story('  a container, openable, lockable with key the brass key, starts unlocked'));
    expect(good.diagnostics).toEqual([]);
    expect(good.ir.entities.find((e) => e.id === 'safe')!.startsStates).toEqual(['unlocked']);
  });
});

describe('parse.starts-state (unknown word after starts)', () => {
  it('an unknown state word is its own parse error, not a silent pass', () => {
    const result = compile(story('  a container, starts ajar'));
    expect(result.ok).toBe(false);
    const err = result.diagnostics.find((d) => d.code === 'parse.starts-state')!;
    expect(err).toBeDefined();
    expect(err.message).toContain('`ajar` is not a state `starts` can initialize');
    // Never lowered: the bad word reaches neither startsStates nor the traits.
    expect(result.diagnostics.map((d) => d.code)).not.toContain('analysis.starts-state-pairing');
  });

  it('a bare `starts` with nothing after it errors', () => {
    expect(errorCodes(story('  a container, starts'))).toContain('parse.starts-state');
  });

  it('`starts in` cannot ride a composition list', () => {
    expect(errorCodes(story('  a container, starts in the Vault'))).toContain('parse.starts-state');
  });
});
