/**
 * scene.test.ts — the scene explain projection (ADR-320 D12).
 *
 * Derived from the module's behavior: row extraction tolerates non-row
 * values; per-kind describers render the load-bearing fields with digest
 * names; grouping is per scene in emission order; affordances project one
 * group per open exchange with per-response assert fragments on the
 * `exchange-affordances` channel; unknown kinds fall back to an honest
 * raw line.
 */

import { describe, expect, it } from 'vitest';
import {
  affordanceGroupsOf,
  sceneExplainGroups,
  sceneRowsOf,
  threadAffordanceGroupsOf,
  type SceneRow,
} from '../src/scene';

const row = (kind: string, data: Record<string, unknown>): SceneRow => ({ turn: 4, kind, data });

const names = (id: string) => (id === 'a1' ? 'Aemilia' : id === 'b1' ? 'Bram' : undefined);

describe('sceneRowsOf', () => {
  it('extracts rows from the scene capture, skipping non-row values', () => {
    const rows = sceneRowsOf({
      scene: [
        [{ turn: 2, kind: 'character.scene.scene-opened', data: { sceneId: 'scene-1' } }],
        'noise',
        [null, { kind: 42 }, { kind: 'character.exchange.opened', data: { exchangeId: 'a.x' } }],
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'character.scene.scene-opened', turn: 2 });
    expect(rows[1]).toMatchObject({ kind: 'character.exchange.opened', turn: 0, data: { exchangeId: 'a.x' } });
  });

  it('yields nothing when the channel is absent', () => {
    expect(sceneRowsOf(undefined)).toEqual([]);
    expect(sceneRowsOf({ character: [[{ kind: 'character.author.pin_held' }]] })).toEqual([]);
  });
});

describe('sceneExplainGroups', () => {
  it('groups rows per scene in emission order and renders the wire describers', () => {
    const groups = sceneExplainGroups([
      row('character.scene.scene-opened', {
        sceneId: 'scene-1', participantIds: ['a1', 'pc-1'],
        openedBy: { kind: 'address', openerId: 'pc-1' },
      }),
      row('character.scene.utterance', {
        sceneId: 'scene-2', speakerId: 'b1', addresseeId: 'a1',
        messageId: 'bram-greets', beats: ['bram-gruff'],
      }),
      row('character.scene.floor-change', { sceneId: 'scene-1', holderId: 'a1' }),
      row('character.scene.interruption', { sceneId: 'scene-1', interrupterId: 'b1', outcome: 'protests' }),
      row('character.scene.scene-closed', { sceneId: 'scene-1', boundary: 'exit' }),
    ], names);

    expect(groups.map((g) => g.npcLabel)).toEqual(['scene-1', 'scene-2']);
    expect(groups[0].lines.map((l) => l.text)).toEqual([
      'scene opened — Aemilia, the player (address by the player)',
      'floor to Aemilia',
      'Bram interrupts — scene protests',
      'scene closed — exit boundary',
    ]);
    expect(groups[1].lines[0].text).toBe('Bram speaks to Aemilia — bram-greets · beats: bram-gruff');
  });

  it('claims land on the scene channel with volatile fields left out', () => {
    const [group] = sceneExplainGroups([
      row('character.scene.utterance', {
        sceneId: 'scene-3', speakerId: 'a1', messageId: 'aemilia-tour', beats: [],
      }),
    ], names);
    const line = group.lines[0];
    expect(line.claimChannel).toBe('scene');
    expect(line.fragments).toEqual([
      '"kind":"character.scene.utterance"',
      '"speakerId":"a1"',
      '"messageId":"aemilia-tour"',
    ]);
    // sceneId is runtime-minted — deliberately not pinned.
    expect(line.fragments.join(' ')).not.toContain('scene-3');
  });

  it('renders unknown kinds as an honest raw fallback', () => {
    const [group] = sceneExplainGroups([row('character.scene.future_kind', { x: 1 })], names);
    expect(group.lines[0].text).toBe('future_kind {"x":1}');
    expect(group.lines[0].fragments).toEqual(['"kind":"character.scene.future_kind"']);
  });
});

describe('affordanceGroupsOf', () => {
  const capture = {
    'exchange-affordances': [
      [
        {
          sceneId: 'scene-1',
          exchangeId: 'aemilia.the-offer',
          responses: [
            { kind: 'verbal', rowId: 'aemilia.the-offer#0', topic: { kind: 'text', primary: 'yes', aliases: ['aye'] } },
            { kind: 'verbal', rowId: 'aemilia.the-offer#1', topic: { kind: 'entity', id: 'b1' } },
            { kind: 'act', rowId: 'aemilia.the-offer#2', actionId: 'leaving' },
            { kind: 'silence' },
          ],
        },
      ],
    ],
  };

  it('projects one group per open exchange, one line per advertised response', () => {
    const groups = affordanceGroupsOf(capture, names);
    expect(groups).toHaveLength(1);
    expect(groups[0].npcLabel).toBe('responses — aemilia.the-offer');
    expect(groups[0].lines.map((l) => l.text)).toEqual([
      'say: "yes" (aye)',
      'say: Bram',
      'act: leaving',
      'silence',
    ]);
  });

  it('each response asserts into a claim on exchange-affordances pinning the choice', () => {
    const [group] = affordanceGroupsOf(capture, names);
    expect(group.lines.every((l) => l.claimChannel === 'exchange-affordances')).toBe(true);
    expect(group.lines[0].fragments).toEqual([
      '"exchangeId":"aemilia.the-offer"',
      '"kind":"verbal"',
      '"primary":"yes"',
    ]);
    expect(group.lines[2].fragments).toEqual([
      '"exchangeId":"aemilia.the-offer"',
      '"kind":"act"',
      '"actionId":"leaving"',
    ]);
    expect(group.lines[3].fragments).toEqual([
      '"exchangeId":"aemilia.the-offer"',
      '"kind":"silence"',
    ]);
  });

  it('yields nothing when the channel is absent or malformed', () => {
    expect(affordanceGroupsOf(undefined, names)).toEqual([]);
    expect(affordanceGroupsOf({ 'exchange-affordances': ['noise', [null, { exchangeId: 7 }]] }, names))
      .toEqual([]);
  });
});

describe('thread lifecycle rows (ADR-320 D14, Phase 10.6)', () => {
  it('renders the five thread kinds with digest names and pins threadKey', () => {
    const groups = sceneExplainGroups(
      [
        row('character.scene.thread-opened', { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection' }),
        row('character.scene.thread-beat', { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection', beatIndex: 2 }),
        row('character.scene.thread-parked', { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection', beatCursor: 2 }),
        row('character.scene.thread-resumed', { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection', beatCursor: 2 }),
        row('character.scene.thread-concluded', { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection' }),
      ],
      names,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].lines.map((l) => l.text)).toEqual([
      'thread opened — the-defection (Aemilia)',
      'Aemilia carries the-defection — beat 2',
      'thread parked — the-defection at beat 2',
      'thread resumed — the-defection at beat 2',
      'thread concluded — the-defection (Aemilia)',
    ]);
    for (const line of groups[0].lines) {
      expect(line.claimChannel).toBe('scene');
      expect(line.fragments).toContain('"threadKey":"the-defection"');
    }
    expect(groups[0].lines[1].fragments).toContain('"beatIndex":2');
  });
});

describe('threadAffordanceGroupsOf', () => {
  const capture = {
    'thread-affordances': [
      [
        { sceneId: 's1', ownerId: 'a1', threadKey: 'the-defection', beatCursor: 1, continuable: true },
        { sceneId: 's2', ownerId: 'b1', threadKey: 'the-wager', beatCursor: 2, continuable: false },
      ],
    ],
  };

  it('projects one group per active thread, stating the continuability', () => {
    const groups = threadAffordanceGroupsOf(capture, names);
    expect(groups).toHaveLength(2);
    expect(groups[0].npcLabel).toBe('thread — the-defection');
    expect(groups[0].lines[0].text).toBe('Aemilia has more to say — beat 1 served, next ready');
    expect(groups[1].npcLabel).toBe('thread — the-wager');
    expect(groups[1].lines[0].text).toBe('Bram holds — beat 2 served, next beat waits on its gate');
  });

  it('each line asserts into a claim on thread-affordances pinning the thread', () => {
    const [first, second] = threadAffordanceGroupsOf(capture, names);
    expect(first.lines[0].claimChannel).toBe('thread-affordances');
    expect(first.lines[0].fragments).toEqual([
      '"threadKey":"the-defection"',
      '"continuable":true',
    ]);
    expect(second.lines[0].fragments).toEqual([
      '"threadKey":"the-wager"',
      '"continuable":false',
    ]);
  });

  it('yields nothing when the channel is absent or malformed', () => {
    expect(threadAffordanceGroupsOf(undefined, names)).toEqual([]);
    expect(
      threadAffordanceGroupsOf({ 'thread-affordances': ['noise', [null, { threadKey: 7 }]] }, names),
    ).toEqual([]);
  });
});
