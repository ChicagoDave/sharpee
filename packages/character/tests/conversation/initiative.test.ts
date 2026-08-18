/**
 * Authored initiative tests (ADR-320 D7; Phase 5) — occasion heads match,
 * `, when` refinements gate, the lone hold-tongue body suppresses, and
 * goal-step occasions never match (deliberately unsurfaced).
 */

import { describe, it, expect } from 'vitest';
import type { IRInitiativeRow, IRStatement } from '@sharpee/chord';
import { authoredInitiativeFor, type SceneOccasion } from '../../src/conversation';

const SPAN = { line: 1, column: 1, endLine: 1, endColumn: 2 };

const HOLD_TONGUE = { kind: 'hold-tongue', span: SPAN } as IRStatement;
const SAY_SOMETHING = { kind: 'leave', span: SPAN } as IRStatement;

function initiativeRow(
  occasion: IRInitiativeRow['occasion'],
  body: IRStatement[],
  condition: IRInitiativeRow['condition'] = null,
): IRInitiativeRow {
  return { occasion, condition, body, span: SPAN };
}

const OPEN_FLOOR: SceneOccasion = { kind: 'open-floor', sceneId: 'scene-1' };
const SILENCE: SceneOccasion = { kind: 'silence', sceneId: 'scene-1' };

describe('authoredInitiativeFor', () => {
  it('a matching occasion head with a statement body forces', () => {
    const rows = [initiativeRow({ kind: 'open-floor' }, [SAY_SOMETHING, SAY_SOMETHING])];
    const answer = authoredInitiativeFor(rows, OPEN_FLOOR, () => true);
    expect(answer?.authored).toBe('forces');
    expect(answer?.row).toBe(rows[0]);
  });

  it('the lone hold-tongue body suppresses', () => {
    const rows = [initiativeRow({ kind: 'silence' }, [HOLD_TONGUE])];
    expect(authoredInitiativeFor(rows, SILENCE, () => true)?.authored).toBe('suppresses');
  });

  it('a non-matching occasion head leaves disposition to decide', () => {
    const rows = [initiativeRow({ kind: 'silence' }, [SAY_SOMETHING])];
    expect(authoredInitiativeFor(rows, OPEN_FLOOR, () => true)).toBeUndefined();
  });

  it('a false `, when` refinement skips the row; the next matching row answers', () => {
    const gated = initiativeRow({ kind: 'open-floor' }, [SAY_SOMETHING], { kind: 'subject-changes' });
    const open = initiativeRow({ kind: 'open-floor' }, [HOLD_TONGUE]);
    const answer = authoredInitiativeFor([gated, open], OPEN_FLOOR, (r) => r !== gated);
    expect(answer?.authored).toBe('suppresses');
    expect(answer?.row).toBe(open);
  });

  it('act rows match witnessed-event occasions by the committed action id', () => {
    const rows = [initiativeRow({ kind: 'act', action: 'if.action.attacking' }, [SAY_SOMETHING])];
    const witnessed: SceneOccasion = { kind: 'witnessed-event', eventId: 'evt-9' };

    expect(authoredInitiativeFor(rows, witnessed, () => true, 'if.action.attacking')?.authored)
      .toBe('forces');
    expect(authoredInitiativeFor(rows, witnessed, () => true, 'if.action.taking')).toBeUndefined();
    expect(authoredInitiativeFor(rows, witnessed, () => true)).toBeUndefined();
  });

  it('goal-step occasions never match (deliberately unsurfaced)', () => {
    const rows = [
      initiativeRow({ kind: 'open-floor' }, [SAY_SOMETHING]),
      initiativeRow({ kind: 'silence' }, [SAY_SOMETHING]),
      initiativeRow({ kind: 'subject-change' }, [SAY_SOMETHING]),
      initiativeRow({ kind: 'act', action: 'if.action.attacking' }, [SAY_SOMETHING]),
    ];
    const goalStep: SceneOccasion = { kind: 'goal-step', goalId: 'goal-1' };
    expect(authoredInitiativeFor(rows, goalStep, () => true, 'if.action.attacking')).toBeUndefined();
  });
});
