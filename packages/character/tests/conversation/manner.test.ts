/**
 * Manner beat selection tests (ADR-320 D5/D8; Phase 5) — first matching
 * row in declaration order, beat rotation without back-to-back repeats
 * (cursor persisted in the scene store), silence rendered like any other
 * delivery.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import type { IRMannerRow } from '@sharpee/chord';
import { selectMannerBeat, renderSilence, readSceneStore } from '../../src/conversation';

const SPAN = { line: 1, column: 1, endLine: 1, endColumn: 2 };

function row(beatKeys: string[], voice?: string): IRMannerRow {
  return {
    condition: { kind: 'subject-changes' },
    beatKeys,
    ...(voice ? { voice } : {}),
    span: SPAN,
  };
}

describe('selectMannerBeat', () => {
  it('picks the first matching row in declaration order and carries its voice', () => {
    const world = new WorldModel();
    const rows = [row(['nervous-1'], 'clipped'), row(['easy-1'])];

    const selection = selectMannerBeat(world, 'npc-kemp', rows, (r) => r === rows[1]);

    expect(selection).toEqual({ beatKey: 'easy-1', rowIndex: 1 });

    const first = selectMannerBeat(world, 'npc-kemp', rows, () => true);
    expect(first).toEqual({ beatKey: 'nervous-1', voice: 'clipped', rowIndex: 0 });
  });

  it('rotates beats with no back-to-back repeats, cursor persisted in the store', () => {
    const world = new WorldModel();
    const rows = [row(['beat-a', 'beat-b', 'beat-c'])];

    const emitted = [1, 2, 3, 4].map(
      () => selectMannerBeat(world, 'npc-kemp', rows, () => true)!.beatKey,
    );

    expect(emitted).toEqual(['beat-a', 'beat-b', 'beat-c', 'beat-a']);
    for (let i = 1; i < emitted.length; i++) {
      expect(emitted[i]).not.toBe(emitted[i - 1]);
    }
    expect(readSceneStore(world).mannerRotation['npc-kemp:0']).toBe(0);
  });

  it('rotation cursors are scoped per owner', () => {
    const world = new WorldModel();
    const rows = [row(['beat-a', 'beat-b'])];

    selectMannerBeat(world, 'npc-kemp', rows, () => true);
    const other = selectMannerBeat(world, 'npc-burbage', rows, () => true);

    expect(other!.beatKey).toBe('beat-a'); // fresh cursor, not kemp's
  });

  it('returns undefined — cursor untouched — when no row matches or the row has no beats', () => {
    const world = new WorldModel();
    expect(selectMannerBeat(world, 'npc-kemp', [row(['beat-a'])], () => false)).toBeUndefined();
    expect(selectMannerBeat(world, 'npc-kemp', [row([])], () => true)).toBeUndefined();
    expect(readSceneStore(world).mannerRotation).toEqual({});
  });
});

describe('renderSilence', () => {
  it('emits a rendered-silence wire event carrying the selected beat', () => {
    const world = new WorldModel();
    const rows = [row(['cold-shoulder-1'], 'flat')];

    const event = renderSilence(world, 'scene-1', 'npc-kemp', rows, () => true);

    expect(event).toEqual({
      kind: 'rendered-silence',
      sceneId: 'scene-1',
      speakerId: 'npc-kemp',
      beats: ['cold-shoulder-1'],
    });
    expect(readSceneStore(world).mannerRotation['npc-kemp:0']).toBe(0);
  });

  it('an uncolored silence still renders — empty beats, never an absence', () => {
    const world = new WorldModel();
    const event = renderSilence(world, 'scene-1', 'npc-kemp', [], () => true);
    expect(event.kind).toBe('rendered-silence');
    expect(event.kind === 'rendered-silence' && event.beats).toEqual([]);
  });
});
