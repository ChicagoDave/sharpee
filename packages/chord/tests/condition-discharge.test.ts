/**
 * condition-discharge.test.ts — the seam-2 discharge marker (ADR-318 D8,
 * ruling 2026-08-16): a condition provably requiring the owner's OWN
 * `breaking` band. Conservative walker: `and` needs one operand, `or`
 * needs all, everything else proves nothing.
 */
import { describe, expect, it } from 'vitest';
import { conditionRequiresSelfBreaking } from '../src/condition-discharge';
import type { IRCondition } from '../src/ir';

const selfBreaking: IRCondition = {
  kind: 'predicate', pred: 'is', negated: false,
  subject: { kind: 'it' }, object: { kind: 'symbol', name: 'breaking' },
};

const namedBreaking = (id: string): IRCondition => ({
  kind: 'predicate', pred: 'is', negated: false,
  subject: { kind: 'entity', id }, object: { kind: 'symbol', name: 'breaking' },
});

const other: IRCondition = { kind: 'story-state', state: 'after-hours' };

describe('conditionRequiresSelfBreaking', () => {
  it('matches `it is breaking`', () => {
    expect(conditionRequiresSelfBreaking(selfBreaking)).toBe(true);
  });

  it('matches the owner named outright when the caller supplies the id', () => {
    expect(conditionRequiresSelfBreaking(namedBreaking('viola'), 'viola')).toBe(true);
    expect(conditionRequiresSelfBreaking(namedBreaking('viola'))).toBe(false);
  });

  it('another entity at breaking never discharges the owner', () => {
    expect(conditionRequiresSelfBreaking(namedBreaking('catherine'), 'viola')).toBe(false);
  });

  it('other bands and negation prove nothing', () => {
    expect(conditionRequiresSelfBreaking({
      kind: 'predicate', pred: 'is', negated: false,
      subject: { kind: 'it' }, object: { kind: 'symbol', name: 'burdened' },
    })).toBe(false);
    expect(conditionRequiresSelfBreaking({
      kind: 'predicate', pred: 'is', negated: true,
      subject: { kind: 'it' }, object: { kind: 'symbol', name: 'breaking' },
    })).toBe(false);
    expect(conditionRequiresSelfBreaking({ kind: 'not', operand: selfBreaking })).toBe(false);
  });

  it('and: one self-breaking operand suffices; or: every operand must require it', () => {
    expect(conditionRequiresSelfBreaking({ kind: 'and', operands: [other, selfBreaking] })).toBe(true);
    expect(conditionRequiresSelfBreaking({ kind: 'and', operands: [other, other] })).toBe(false);
    expect(conditionRequiresSelfBreaking({ kind: 'or', operands: [selfBreaking, selfBreaking] })).toBe(true);
    expect(conditionRequiresSelfBreaking({ kind: 'or', operands: [selfBreaking, other] })).toBe(false);
    expect(conditionRequiresSelfBreaking({ kind: 'or', operands: [] })).toBe(false);
  });
});
