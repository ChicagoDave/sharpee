/**
 * ac3-cloak-sweep.test.ts — ADR-210 AC-3 final sweep (Phase 6): all six
 * load-time-gate diagnostic classes fire with correct `.story` line numbers
 * against the REAL cloak.story text (one surgical mutation per class), not
 * just the Phase 3 synthetic negatives in fixtures/gates/.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const CLOAK = readFileSync(join(__dirname, 'fixtures', 'cloak.story'), 'utf8');

/** Compile a mutated cloak.story and return its error diagnostics. */
function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('AC-3 sweep: gates fire on cloak.story-shaped sources', () => {
  it('missing phrase key (blocked exit)', () => {
    // Line 13: `north is blocked: cant-leave` → an undeclared key.
    const errors = errorsOf(CLOAK.replace('north is blocked: cant-leave', 'north is blocked: cant-flee'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.missing-phrase');
    expect(errors[0].span.line).toBe(13);
  });

  it('unknown predicate value, with suggestion (named condition)', () => {
    // Line 6: `... location is dark` → a misspelled trait predicate in the
    // in-darkness condition. (A misspelled select-on branch classifies as
    // undeclared-state — that class is covered below.)
    const errors = errorsOf(CLOAK.replace("the player's location is dark", "the player's location is darkk"));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unknown-value');
    expect(errors[0].span.line).toBe(6);
    expect(errors[0].message).toContain('did you mean `dark`?');
  });

  it('undeclared state in change', () => {
    // Line 37: `change the message to trampled` (bar after-clause, first
    // time block) → a state not in `states:`.
    const errors = errorsOf(CLOAK.replace('change the message to trampled', 'change the message to smashed'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.undeclared-state');
    expect(errors[0].span.line).toBe(37);
    expect(errors[0].message).toContain('smashed');
  });

  it('ambiguous reference, with rename suggestion', () => {
    // Line 44: the player `wears the cloak` while a second entity also
    // carries the `cloak` alias — alias match is no longer unique.
    const mutated =
      CLOAK.replace('wears the velvet cloak', 'wears the cloak') +
      '\ncreate the opera cloak\n  wearable\n  aka cloak\n\n  A spare cloak.\n';
    const errors = errorsOf(mutated);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.ambiguous-reference');
    expect(errors[0].span.line).toBe(44);
    expect(errors[0].message).toContain('velvet cloak');
    expect(errors[0].message).toContain('opera cloak');
  });

  it('refusal after mutation (phase-order rule, on-block)', () => {
    // The trampled branch mutates first (`change`), then refuses — the
    // refuse lands on line 76 of the mutated copy.
    const mutated = CLOAK.replace(
      '        phrase message-trampled',
      '        change the message to obliterated\n        refuse message-trampled',
    );
    const errors = errorsOf(mutated);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
    expect(errors[0].span.line).toBe(76);
  });

  it('unbound marker in a phrase', () => {
    // Line 92 (entry line): `{garbled}` → a marker naming no declared hatch
    // or phrase.
    const errors = errorsOf(CLOAK.replace('{garbled}', '{garbeld}'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unbound-marker');
    expect(errors[0].span.line).toBe(92);
  });
});
