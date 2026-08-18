/**
 * Thread runtime tests (ADR-320 D14; Phase 10.3) — every assertion lands
 * on real trait/store/memory state read back from the world, not on
 * return values alone. The compiled `IRConversation` shapes are literal
 * fixtures (the Phase 10.1 IR is the fixed input).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CharacterModelTrait,
  TraitType,
  WorldModel,
  type ConversationThreadState,
} from '@sharpee/world-model';
import { normalizeTopic, type IRCondition, type IRConversation, type IRStatement } from '@sharpee/chord';
import {
  openScene,
  closeScene,
  sceneOf,
  stampThreadContinuability,
  createTraitMemoryAccess,
  threadStateFor,
  activeThreadFor,
  resolveThreadTransition,
  openThread,
  resumeThread,
  parkThread,
  advanceThreadBeat,
  concludeThread,
  readyThreadMove,
  threadContinuabilityFor,
  applySceneDirectives,
} from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

const SPAN = { line: 1, column: 1, endLine: 1, endColumn: 2 };
const GATE = { kind: 'state' } as unknown as IRCondition;
const OPENS = { kind: 'state' } as unknown as IRCondition;

function phrase(key: string): IRStatement {
  return { kind: 'phrase', phraseKey: key, span: SPAN } as unknown as IRStatement;
}

function thread(
  name: string,
  opts: {
    beats?: Array<{ condition: IRCondition | null; body: IRStatement[] }>;
    filter?: IRConversation['filter'];
    opensWhen?: IRCondition;
    strength?: IRConversation['strength'];
  } = {},
): IRConversation {
  return {
    name,
    ...(opts.strength ? { strength: opts.strength } : {}),
    ...(opts.filter ? { filter: opts.filter } : {}),
    ...(opts.opensWhen ? { opensWhen: opts.opensWhen } : {}),
    beats: (opts.beats ?? [{ condition: null, body: [phrase('beat-1')] }]).map((b) => ({
      ...b,
      span: SPAN,
    })),
    conclusion: [phrase('the-conclusion')],
    span: SPAN,
  };
}

describe('thread runtime (ADR-320 D14)', () => {
  let world: WorldModel;
  let kempId: string;
  let pcId: string;
  let sceneId: string;

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4); // dialogueTurn = 5
    const kemp = world.createEntity('kemp', 'actor');
    kemp.add(new CharacterModelTrait());
    kempId = kemp.id;
    const pc = world.createEntity('pc', 'actor');
    pc.add(new CharacterModelTrait());
    pcId = pc.id;
    sceneId = openScene(world, {
      participantIds: [kempId, pcId],
      openedBy: { kind: 'address', openerId: pcId },
    }).scene.id;
  });

  function traitOf(id: string): CharacterModelTrait {
    return world.getEntity(id)!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  }

  function stateOf(threadKey: string): ConversationThreadState | undefined {
    return traitOf(kempId).conversationThreads?.[pcId]?.[threadKey];
  }

  describe('openThread', () => {
    it('writes active/cursor-0 onto the owner trait and emits thread-opened', () => {
      const wire = openThread(world, sceneId, kempId, pcId, 'the-defection');

      expect(stateOf('the-defection')).toEqual({ status: 'active', beatCursor: 0 });
      expect(wire).toEqual([
        { kind: 'thread-opened', sceneId, ownerId: kempId, threadKey: 'the-defection' },
      ]);
    });

    it('rejects while another thread is active for the pair (at most one ACTIVE)', () => {
      openThread(world, sceneId, kempId, pcId, 'the-defection');

      expect(() => openThread(world, sceneId, kempId, pcId, 'the-jig')).toThrowError(
        /`the-jig` cannot activate while `the-defection` is active/,
      );
      expect(stateOf('the-jig')).toBeUndefined();
    });

    it('rejects re-opening: parked resumes, concluded never reopens', () => {
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      parkThread(world, sceneId, kempId, pcId, 'the-defection');

      expect(() => openThread(world, sceneId, kempId, pcId, 'the-defection')).toThrowError(
        /already parked .* a parked thread resumes/,
      );
      expect(stateOf('the-defection')).toEqual({ status: 'parked', beatCursor: 0 });
    });

    it('an unmodeled owner is a no-op (no model, no change — D7)', () => {
      const bare = world.createEntity('stagehand', 'actor');

      expect(openThread(world, sceneId, bare.id, pcId, 'the-defection')).toEqual([]);
      expect(threadStateFor(world, bare.id, pcId, 'the-defection')).toBeUndefined();
    });
  });

  describe('parkThread / resumeThread', () => {
    it('parks the active thread with the cursor held and resumes at it', () => {
      const t = thread('the-defection', {
        beats: [
          { condition: null, body: [phrase('b1')] },
          { condition: null, body: [phrase('b2')] },
        ],
      });
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, createTraitMemoryAccess(world));

      const parked = parkThread(world, sceneId, kempId, pcId, 'the-defection');
      expect(stateOf('the-defection')).toMatchObject({ status: 'parked', beatCursor: 1 });
      expect(parked).toEqual([
        { kind: 'thread-parked', sceneId, ownerId: kempId, threadKey: 'the-defection', beatCursor: 1 },
      ]);

      const resumed = resumeThread(world, sceneId, kempId, pcId, 'the-defection');
      expect(stateOf('the-defection')).toMatchObject({ status: 'active', beatCursor: 1 });
      expect(resumed).toEqual([
        { kind: 'thread-resumed', sceneId, ownerId: kempId, threadKey: 'the-defection', beatCursor: 1 },
      ]);
    });

    it('parking a non-active thread is rogue (throws)', () => {
      expect(() => parkThread(world, sceneId, kempId, pcId, 'the-defection')).toThrowError(
        /is unopened .* only the active thread parks/,
      );
    });

    it('resuming a non-parked thread is rogue (throws)', () => {
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      expect(() => resumeThread(world, sceneId, kempId, pcId, 'the-defection')).toThrowError(
        /is active .* only a parked thread resumes/,
      );
    });

    it('resuming while another thread is active rejects (at most one ACTIVE)', () => {
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      parkThread(world, sceneId, kempId, pcId, 'the-defection');
      openThread(world, sceneId, kempId, pcId, 'the-jig');

      expect(() => resumeThread(world, sceneId, kempId, pcId, 'the-defection')).toThrowError(
        /`the-defection` cannot activate while `the-jig` is active/,
      );
      expect(stateOf('the-defection')).toMatchObject({ status: 'parked' });
    });
  });

  describe('advanceThreadBeat', () => {
    const memory = () => createTraitMemoryAccess(world);

    it('serves one beat: cursor advances, lastBeatTurn stamps off the clock seam', () => {
      const t = thread('the-defection', {
        beats: [
          { condition: null, body: [phrase('b1')] },
          { condition: null, body: [phrase('b2')] },
        ],
      });
      openThread(world, sceneId, kempId, pcId, 'the-defection');

      const advance = advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, memory());

      expect(stateOf('the-defection')).toEqual({
        status: 'active',
        beatCursor: 1,
        lastBeatTurn: 5,
      });
      expect(advance).toMatchObject({ kind: 'beat', body: t.beats[0].body });
      expect(advance!.wireEvents).toEqual([
        { kind: 'thread-beat', sceneId, ownerId: kempId, threadKey: 'the-defection', beatIndex: 1 },
      ]);
    });

    it('an unmet hold-gate holds the beat — nothing mutates', () => {
      const t = thread('the-defection', { beats: [{ condition: GATE, body: [phrase('b1')] }] });
      openThread(world, sceneId, kempId, pcId, 'the-defection');

      expect(advanceThreadBeat(world, sceneId, kempId, pcId, t, () => false, memory())).toBeUndefined();
      expect(stateOf('the-defection')).toEqual({ status: 'active', beatCursor: 0 });
    });

    it('an open exchange in the scene holds the thread (a then-asks beat waits)', () => {
      const t = thread('the-defection');
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      applySceneDirectives(
        world,
        sceneId,
        [
          {
            kind: 'open-exchange',
            exchange: { exchangeId: 'kemp.the-offer', speakerId: kempId, openedTurn: 5, responses: [] },
          },
        ],
        memory(),
      );

      expect(advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, memory())).toBeUndefined();
      expect(stateOf('the-defection')).toEqual({ status: 'active', beatCursor: 0 });
    });

    it('past the last beat the advance serves the conclusion: status CONCLUDED, topics discussed both sides', () => {
      const t = thread('the-defection', {
        beats: [{ condition: null, body: [phrase('b1')] }],
        filter: { kind: 'text', primary: 'The Rose', aliases: ['the theatre'] },
      });
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, memory());

      const advance = advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, memory());

      expect(advance).toMatchObject({ kind: 'conclusion', body: t.conclusion });
      expect(advance!.wireEvents).toEqual([
        { kind: 'thread-concluded', sceneId, ownerId: kempId, threadKey: 'the-defection' },
      ]);
      // The exact read the story-loader evaluator performs for `is concluded`.
      expect(traitOf(kempId).conversationThreads?.[pcId]?.['the-defection']?.status).toBe('concluded');
      // Every `about` candidate recorded discussed, BOTH sides' memory.
      for (const topic of [normalizeTopic('The Rose'), normalizeTopic('the theatre')]) {
        expect(traitOf(kempId).conversationMemory?.[pcId]?.discussedTopics).toContain(topic);
        expect(traitOf(pcId).conversationMemory?.[kempId]?.discussedTopics).toContain(topic);
      }
    });

    it('advancing a non-active thread is rogue (throws)', () => {
      const t = thread('the-defection');
      expect(() =>
        advanceThreadBeat(world, sceneId, kempId, pcId, t, () => true, memory()),
      ).toThrowError(/is unopened .* only the active thread advances/);
    });
  });

  describe('concludeThread', () => {
    it('fires once — a second conclusion is rogue (throws), status stays concluded', () => {
      const t = thread('the-defection');
      const memory = createTraitMemoryAccess(world);
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      concludeThread(world, sceneId, kempId, pcId, t, memory);

      expect(() => concludeThread(world, sceneId, kempId, pcId, t, memory)).toThrowError(
        /is concluded .* conclusion fires once/,
      );
      expect(stateOf('the-defection')).toMatchObject({ status: 'concluded' });
    });
  });

  describe('resolveThreadTransition (the D14 table)', () => {
    it('passive parks, assertive protests then parks, blocking refuses', () => {
      expect(resolveThreadTransition('passive')).toBe('parks');
      expect(resolveThreadTransition('assertive')).toBe('protests-then-parks');
      expect(resolveThreadTransition('blocking')).toBe('refuses');
    });
  });

  describe('readyThreadMove', () => {
    it('the active thread with a ready beat claims the advance', () => {
      const threads = [thread('the-defection'), thread('the-jig', { opensWhen: OPENS })];
      openThread(world, sceneId, kempId, pcId, 'the-defection');

      const move = readyThreadMove(world, kempId, pcId, threads, () => true);
      expect(move).toEqual({ kind: 'advance', thread: threads[0] });
    });

    it('an active-but-held thread claims no other move (even with an opens-when candidate)', () => {
      const threads = [
        thread('the-defection', { beats: [{ condition: GATE, body: [phrase('b1')] }] }),
        thread('the-jig', { opensWhen: OPENS }),
      ];
      openThread(world, sceneId, kempId, pcId, 'the-defection');

      // Gate unmet: the active thread is held and nothing else may claim the floor.
      expect(readyThreadMove(world, kempId, pcId, threads, (c) => c !== GATE)).toBeUndefined();
    });

    it('with no active thread, the first declared opens-when candidate opens fresh', () => {
      const threads = [thread('the-defection', { opensWhen: OPENS }), thread('the-jig', { opensWhen: OPENS })];

      const move = readyThreadMove(world, kempId, pcId, threads, () => true);
      expect(move).toEqual({ kind: 'open', thread: threads[0] });
    });

    it('a parked opens-when candidate resumes; a concluded one never re-engages', () => {
      const threads = [thread('the-defection', { opensWhen: OPENS })];
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      parkThread(world, sceneId, kempId, pcId, 'the-defection');

      expect(readyThreadMove(world, kempId, pcId, threads, () => true)).toEqual({
        kind: 'resume',
        thread: threads[0],
      });

      resumeThread(world, sceneId, kempId, pcId, 'the-defection');
      concludeThread(world, sceneId, kempId, pcId, threads[0], createTraitMemoryAccess(world));
      expect(readyThreadMove(world, kempId, pcId, threads, () => true)).toBeUndefined();
    });
  });

  describe('threadContinuabilityFor (the D12 affordance projection)', () => {
    it('present exactly while a thread is active; continuable tracks the hold-gate', () => {
      const gated = thread('the-defection', {
        beats: [
          { condition: null, body: [phrase('b1')] },
          { condition: GATE, body: [phrase('b2')] },
        ],
      });

      expect(threadContinuabilityFor(world, sceneId, kempId, pcId, [gated], () => true)).toBeUndefined();

      openThread(world, sceneId, kempId, pcId, 'the-defection');
      expect(threadContinuabilityFor(world, sceneId, kempId, pcId, [gated], (c) => c !== GATE)).toEqual({
        sceneId,
        ownerId: kempId,
        threadKey: 'the-defection',
        beatCursor: 0,
        continuable: true,
      });

      advanceThreadBeat(world, sceneId, kempId, pcId, gated, (c) => c !== GATE, createTraitMemoryAccess(world));
      // Beat 2's gate is unmet — the thread waits for its world.
      expect(
        threadContinuabilityFor(world, sceneId, kempId, pcId, [gated], (c) => c !== GATE),
      ).toMatchObject({ beatCursor: 1, continuable: false });
    });
  });

  describe('scene close parks the active thread (D14 persistence)', () => {
    it('closeScene flips the pair active thread to parked, cursor held, with thread-parked wire', () => {
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      const memory = createTraitMemoryAccess(world);

      const wire = closeScene(world, sceneId, 'exit', memory);

      expect(stateOf('the-defection')).toEqual({ status: 'parked', beatCursor: 0 });
      expect(wire.map((w) => w.kind)).toEqual(['thread-parked', 'scene-closed']);
    });
  });

  describe('stampThreadContinuability', () => {
    it('stamps and clears the snapshot on real scene-store state', () => {
      const record = {
        sceneId,
        ownerId: kempId,
        threadKey: 'the-defection',
        beatCursor: 1,
        continuable: true,
      };
      stampThreadContinuability(world, sceneId, record);
      expect(sceneOf(world, sceneId)!.threadContinuability).toEqual(record);

      stampThreadContinuability(world, sceneId, undefined);
      expect(sceneOf(world, sceneId)!.threadContinuability).toBeUndefined();
    });
  });

  describe('activeThreadFor', () => {
    it('reads the pair one ACTIVE thread off the trait', () => {
      expect(activeThreadFor(world, kempId, pcId)).toBeUndefined();
      openThread(world, sceneId, kempId, pcId, 'the-defection');
      expect(activeThreadFor(world, kempId, pcId)).toMatchObject({
        threadKey: 'the-defection',
        state: { status: 'active', beatCursor: 0 },
      });
    });
  });
});
