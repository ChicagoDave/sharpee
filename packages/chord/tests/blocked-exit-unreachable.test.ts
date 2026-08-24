/**
 * blocked-exit-unreachable.test.ts — GH #315's compile-time half: blocked-exit
 * arms compose in declaration order, so a line after a condition-less line on
 * the same direction can never fire. The analyzer says so as a warning;
 * correctly ordered arms (fallback last) and multi-arm conditionals stay clean.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

function storyWith(blockedLines: string): string {
  return `story
  title: Gate Order
  authors:
    T
  id: gate-order
  story-version: 0.0.1
  states: calm, hunted

create the Junction
  a room
  north to the Road
${blockedLines}

  The junction.

create the Road
  a room
  south to the Junction

  The road.

create the player
  starts in the Junction

  You.

define phrase turned-back
  Turned back.
end phrase

define phrase shut
  Shut.
end phrase
`;
}

function diagnosticsFor(blockedLines: string) {
  const result = compile(storyWith(blockedLines));
  return result.diagnostics.filter((d) => d.code === 'analysis.blocked-exit-unreachable');
}

describe('analysis.blocked-exit-unreachable', () => {
  it('warns on a line after a condition-less line on the same direction', () => {
    const found = diagnosticsFor(
      '  north is blocked: shut\n  north is blocked while calm: turned-back',
    );

    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toContain('never fire');
    expect(found[0].message).toContain('north');
  });

  it('stays silent when the condition-less fallback is last', () => {
    expect(
      diagnosticsFor('  north is blocked while calm: turned-back\n  north is blocked: shut'),
    ).toEqual([]);
  });

  it('stays silent for multiple conditional arms with no fallback', () => {
    expect(
      diagnosticsFor(
        '  north is blocked while calm: turned-back\n  north is blocked while hunted: shut',
      ),
    ).toEqual([]);
  });

  it('scopes the shadow check per direction — a fallback on one direction never flags another', () => {
    const found = diagnosticsFor(
      '  north is blocked: shut\n  east is blocked while calm: turned-back',
    );

    expect(found).toEqual([]);
  });
});
