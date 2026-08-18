/**
 * Conversation-thread runtime — open, resume, park, advance, conclude
 * (ADR-320 D14; Phase 10.3)
 *
 * The one writer of per-pair thread state: an author-scripted subject the
 * owner carries beat by beat to a defined conclusion, across as many
 * sittings as it takes. State lives on the owner's trait
 * (`CharacterModelTrait.conversationThreads`, schema v3 — Phase 10.2's
 * home), so it rides the world snapshot, survives scene closes and day
 * boundaries, and restores mid-beat. The compiled `define conversation`
 * shape (`IRConversation`, Phase 10.1) is this runtime's fixed input;
 * serving a beat's statement body is the loader's (Phase 10.4) — this
 * module owns cursor/status mutations, the D14 transition table, and the
 * wire events. All turn reads go through the character clock seam (D6).
 *
 * Public interface: threadStateFor, activeThreadFor, ThreadTransition,
 *   resolveThreadTransition, openThread, resumeThread, parkThread,
 *   ThreadAdvance, advanceThreadBeat, concludeThread, ThreadMove,
 *   readyThreadMove, threadContinuabilityFor.
 * Owner context: @sharpee/character / conversation
 */

import {
  TraitType,
  CharacterModelTrait,
  type WorldModel,
  type ConversationThreadState,
  type SceneStrength,
  type SceneWireEvent,
  type ThreadContinuability,
} from '@sharpee/world-model';
import { normalizeTopic, type IRCondition, type IRConversation, type IRStatement } from '@sharpee/chord';
import { dialogueTurn } from '../character-clock.js';
import { sceneOf, sceneWith } from './scene-store.js';
import { type ConversationMemoryAccess, recordTopicDiscussed } from './conversation-memory.js';

/** A hold-gate/`opens when` evaluator, bound by the caller (the loader's). */
export type ThreadConditionEval = (condition: IRCondition) => boolean;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The owner's trait, or undefined for an unmodeled owner (D7: no model, no change). */
function traitOf(world: WorldModel, ownerId: string): CharacterModelTrait | undefined {
  return world.getEntity(ownerId)?.get(TraitType.CHARACTER_MODEL) as
    | CharacterModelTrait
    | undefined;
}

/**
 * The owner's state for one thread with one partner, or undefined when the
 * thread has never engaged (pre-v3 rehydrated traits lack the field — the
 * absence reads the same).
 *
 * @param world - The live world
 * @param ownerId - The thread's owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The per-pair state, or undefined
 */
export function threadStateFor(
  world: WorldModel,
  ownerId: string,
  partnerId: string,
  threadKey: string,
): ConversationThreadState | undefined {
  return traitOf(world, ownerId)?.conversationThreads?.[partnerId]?.[threadKey];
}

/**
 * The pair's one ACTIVE thread, or undefined (the at-most-one-ACTIVE
 * invariant's read side).
 *
 * @param world - The live world
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @returns The active thread's key and state, or undefined
 */
export function activeThreadFor(
  world: WorldModel,
  ownerId: string,
  partnerId: string,
): { threadKey: string; state: ConversationThreadState } | undefined {
  const threads = traitOf(world, ownerId)?.conversationThreads?.[partnerId];
  if (!threads) return undefined;
  for (const [threadKey, state] of Object.entries(threads)) {
    if (state.status === 'active') return { threadKey, state };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// The D14 transition table
// ---------------------------------------------------------------------------

/**
 * How an ACTIVE thread answers an off-thread ask (ADR-320 D14): `parks`
 * silently by default (`on parting` renders if authored), `protests-then-
 * parks` renders `on parting` as one authored beat of resistance then
 * yields, `refuses` turns the ask back into the thread (the authored
 * `on refusing:` row first, the current beat re-served otherwise).
 */
export type ThreadTransition = 'parks' | 'protests-then-parks' | 'refuses';

/**
 * The strength-governed transition answer (ADR-320 D14's table). Pure —
 * the caller parks/serves/refuses accordingly.
 *
 * @param strength - The ACTIVE thread's effective strength
 * @returns The transition word
 */
export function resolveThreadTransition(strength: SceneStrength): ThreadTransition {
  switch (strength) {
    case 'passive':
      return 'parks';
    case 'assertive':
      return 'protests-then-parks';
    case 'blocking':
      return 'refuses';
  }
}

// ---------------------------------------------------------------------------
// Mutations (this module is the one writer of thread state)
// ---------------------------------------------------------------------------

/** Write one pair-thread state onto the owner's trait (creates the maps). */
function writeThreadState(
  trait: CharacterModelTrait,
  partnerId: string,
  threadKey: string,
  state: ConversationThreadState,
): void {
  if (!trait.conversationThreads) trait.conversationThreads = {};
  if (!trait.conversationThreads[partnerId]) trait.conversationThreads[partnerId] = {};
  trait.conversationThreads[partnerId][threadKey] = state;
}

/** Invariant guard: no other thread may be ACTIVE for the pair. */
function assertNoOtherActive(
  world: WorldModel,
  ownerId: string,
  partnerId: string,
  threadKey: string,
): void {
  const active = activeThreadFor(world, ownerId, partnerId);
  if (active && active.threadKey !== threadKey) {
    throw new Error(
      `Thread \`${threadKey}\` cannot activate while \`${active.threadKey}\` is active for ` +
        `\`${ownerId}\`↔\`${partnerId}\` — park or conclude it first (at most one ACTIVE per pair).`,
    );
  }
}

/**
 * Open a thread fresh (ADR-320 D14): first engagement of the pair — a
 * matching ask or an `opens when` occasion. Writes `active`/cursor 0.
 *
 * @param world - The live world
 * @param sceneId - The scene the opening lands in (wire attribution)
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-opened wire event (empty for an unmodeled owner)
 * @throws Error when the pair already has state for this thread, or
 *   another thread is ACTIVE for the pair
 */
export function openThread(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  threadKey: string,
): SceneWireEvent[] {
  const trait = traitOf(world, ownerId);
  if (!trait) return []; // D7: no model, no change

  const existing = threadStateFor(world, ownerId, partnerId, threadKey);
  if (existing) {
    throw new Error(
      `Thread \`${threadKey}\` is already ${existing.status} for \`${ownerId}\`↔\`${partnerId}\` — ` +
        `a parked thread resumes, a concluded thread never reopens.`,
    );
  }
  assertNoOtherActive(world, ownerId, partnerId, threadKey);

  writeThreadState(trait, partnerId, threadKey, { status: 'active', beatCursor: 0 });
  return [{ kind: 'thread-opened', sceneId, ownerId, threadKey }];
}

/**
 * Resume a parked thread (ADR-320 D14): re-engagement at the held cursor
 * — same scene, the next day, or after a restore alike. The caller serves
 * the authored `on resuming:` row alongside.
 *
 * @param world - The live world
 * @param sceneId - The scene the resumption lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-resumed wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not PARKED, or another thread is
 *   ACTIVE for the pair
 */
export function resumeThread(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  threadKey: string,
): SceneWireEvent[] {
  const trait = traitOf(world, ownerId);
  if (!trait) return [];

  const state = threadStateFor(world, ownerId, partnerId, threadKey);
  if (state?.status !== 'parked') {
    throw new Error(
      `Thread \`${threadKey}\` is ${state?.status ?? 'unopened'} for \`${ownerId}\`↔\`${partnerId}\` — ` +
        `only a parked thread resumes.`,
    );
  }
  assertNoOtherActive(world, ownerId, partnerId, threadKey);

  state.status = 'active';
  return [{ kind: 'thread-resumed', sceneId, ownerId, threadKey, beatCursor: state.beatCursor }];
}

/**
 * Park the ACTIVE thread (ADR-320 D14): the subject switched away, the
 * scene closed, or the player left — the cursor holds. The caller serves
 * the authored `on parting:` row alongside (silently absent for a passive
 * thread with none authored).
 *
 * @param world - The live world
 * @param sceneId - The scene the parking lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-parked wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not ACTIVE
 */
export function parkThread(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  threadKey: string,
): SceneWireEvent[] {
  const trait = traitOf(world, ownerId);
  if (!trait) return [];

  const state = threadStateFor(world, ownerId, partnerId, threadKey);
  if (state?.status !== 'active') {
    throw new Error(
      `Thread \`${threadKey}\` is ${state?.status ?? 'unopened'} for \`${ownerId}\`↔\`${partnerId}\` — ` +
        `only the active thread parks.`,
    );
  }

  state.status = 'parked';
  return [{ kind: 'thread-parked', sceneId, ownerId, threadKey, beatCursor: state.beatCursor }];
}

/**
 * Park every ACTIVE thread between the scene's participants (ADR-320
 * D14's persistence clause): a scene close never resets a thread — it
 * parks it, cursor held, so the next engagement is a resume (`on
 * resuming` renders whether the gap is three turns, a day boundary, or a
 * restore). Called by `closeScene` for every ordered participant pair;
 * unmodeled holders read blank and nothing changes.
 *
 * @param world - The live world
 * @param sceneId - The closing scene (wire attribution)
 * @param participantIds - The scene's participants
 * @returns The thread-parked wire events, holder order
 */
export function parkActiveThreadsOnClose(
  world: WorldModel,
  sceneId: string,
  participantIds: string[],
): SceneWireEvent[] {
  const wireEvents: SceneWireEvent[] = [];
  for (const holderId of participantIds) {
    for (const partnerId of participantIds) {
      if (holderId === partnerId) continue;
      const active = activeThreadFor(world, holderId, partnerId);
      if (active) {
        wireEvents.push(...parkThread(world, sceneId, holderId, partnerId, active.threadKey));
      }
    }
  }
  return wireEvents;
}

/** Every canonical key the thread's `about` filter answers to (the topic-row keying). */
function threadTopicCandidates(thread: IRConversation): string[] {
  const filter = thread.filter;
  if (!filter) return [];
  return filter.kind === 'entity'
    ? [filter.id]
    : [normalizeTopic(filter.primary), ...filter.aliases.map(normalizeTopic)];
}

/**
 * Conclude the ACTIVE thread (ADR-320 D14): status CONCLUDED — terminal —
 * and every `about` topic candidate recorded discussed on BOTH sides'
 * conversation memory (the "topics record as discussed" clause; the
 * `is concluded` evaluator reads the status straight off the trait).
 *
 * @param world - The live world
 * @param sceneId - The scene the conclusion lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param thread - The compiled thread (key and `about` filter)
 * @param memory - The per-pair conversation-memory home
 * @returns The thread-concluded wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not ACTIVE (conclusion fires once)
 */
export function concludeThread(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  thread: IRConversation,
  memory: ConversationMemoryAccess,
): SceneWireEvent[] {
  const trait = traitOf(world, ownerId);
  if (!trait) return [];

  const state = threadStateFor(world, ownerId, partnerId, thread.name);
  if (state?.status !== 'active') {
    throw new Error(
      `Thread \`${thread.name}\` is ${state?.status ?? 'unopened'} for \`${ownerId}\`↔\`${partnerId}\` — ` +
        `conclusion fires once, from the active thread.`,
    );
  }

  state.status = 'concluded';
  for (const topic of threadTopicCandidates(thread)) {
    recordTopicDiscussed(memory, ownerId, partnerId, topic);
    recordTopicDiscussed(memory, partnerId, ownerId, topic);
  }
  return [{ kind: 'thread-concluded', sceneId, ownerId, threadKey: thread.name }];
}

/** What one advance served: a numbered beat, or the conclusion. */
export interface ThreadAdvance {
  /** `beat` while beats remain; `conclusion` on the final advance. */
  kind: 'beat' | 'conclusion';

  /** The statement body to serve (the loader executes it — Phase 10.4). */
  body: IRStatement[];

  /** Wire events the advance produced. */
  wireEvents: SceneWireEvent[];
}

/**
 * Advance the ACTIVE thread one beat (ADR-320 D14's advance clause —
 * fired on the owner's own floor turns AND on player continuation
 * prompts; both paths land here). A held beat advances on neither: an
 * open exchange in the pair's scene holds (a `then asks` beat waits for
 * its exchange to close), and an unmet `beat, when` hold-gate waits for
 * the world. Past the last beat, the advance serves the conclusion
 * (`concludeThread`).
 *
 * @param world - The live world
 * @param sceneId - The scene the advance lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param thread - The compiled thread
 * @param evalCondition - Hold-gate evaluator (the loader's, bound by the caller)
 * @param memory - The per-pair conversation-memory home (conclusion's record)
 * @returns The served advance, or undefined when the beat is held
 * @throws Error when the thread is not ACTIVE for the pair
 */
export function advanceThreadBeat(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  thread: IRConversation,
  evalCondition: ThreadConditionEval,
  memory: ConversationMemoryAccess,
): ThreadAdvance | undefined {
  const trait = traitOf(world, ownerId);
  if (!trait) return undefined;

  const state = threadStateFor(world, ownerId, partnerId, thread.name);
  if (state?.status !== 'active') {
    throw new Error(
      `Thread \`${thread.name}\` is ${state?.status ?? 'unopened'} for \`${ownerId}\`↔\`${partnerId}\` — ` +
        `only the active thread advances.`,
    );
  }

  // A `then asks` beat holds until its exchange closes — any open
  // exchange in the pair's scene holds the thread (at most one exchange
  // is ever open, D4).
  if (sceneOf(world, sceneId)?.openExchange) return undefined;

  if (state.beatCursor >= thread.beats.length) {
    return {
      kind: 'conclusion',
      body: thread.conclusion,
      wireEvents: concludeThread(world, sceneId, ownerId, partnerId, thread, memory),
    };
  }

  const beat = thread.beats[state.beatCursor];
  if (beat.condition !== null && !evalCondition(beat.condition)) return undefined;

  state.beatCursor += 1;
  state.lastBeatTurn = dialogueTurn(world);
  return {
    kind: 'beat',
    body: beat.body,
    wireEvents: [
      { kind: 'thread-beat', sceneId, ownerId, threadKey: thread.name, beatIndex: state.beatCursor },
    ],
  };
}

// ---------------------------------------------------------------------------
// The floor-machinery consumable (Phase 5's scoring stays the judge)
// ---------------------------------------------------------------------------

/**
 * The thread move an owner would make with the floor (ADR-320 D14): what
 * dispatch (Phase 10.4) turns into a forcing floor answer — threads claim
 * the owner's floor turns the way authored initiative rows claim their
 * occasions (D7 most-specific-wins), so disposition, interruption, and
 * decay stay unchanged around them.
 */
export type ThreadMove =
  | { kind: 'advance'; thread: IRConversation }
  | { kind: 'resume'; thread: IRConversation }
  | { kind: 'open'; thread: IRConversation };

/**
 * The pair's ready thread move, if any: the ACTIVE thread's next advance
 * when it is not held; otherwise the first declared thread whose `opens
 * when` holds — unopened opens fresh, parked resumes (a concluded thread
 * never re-engages).
 *
 * @param world - The live world
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param conversations - The owner's compiled threads, declaration order
 * @param evalCondition - Hold-gate/`opens when` evaluator (the loader's)
 * @returns The ready move, or undefined when no thread claims the moment
 */
export function readyThreadMove(
  world: WorldModel,
  ownerId: string,
  partnerId: string,
  conversations: IRConversation[],
  evalCondition: ThreadConditionEval,
): ThreadMove | undefined {
  const active = activeThreadFor(world, ownerId, partnerId);
  if (active) {
    const thread = conversations.find((c) => c.name === active.threadKey);
    if (thread && nextBeatReady(world, ownerId, active.state, thread, evalCondition)) {
      return { kind: 'advance', thread };
    }
    return undefined; // an active-but-held thread claims no other move
  }

  for (const thread of conversations) {
    if (!thread.opensWhen || !evalCondition(thread.opensWhen)) continue;
    const state = threadStateFor(world, ownerId, partnerId, thread.name);
    if (state === undefined) return { kind: 'open', thread };
    if (state.status === 'parked') return { kind: 'resume', thread };
    // concluded: terminal — never re-engages.
  }
  return undefined;
}

/** Whether the thread's next advance would serve (gate met, no open exchange). */
function nextBeatReady(
  world: WorldModel,
  ownerId: string,
  state: ConversationThreadState,
  thread: IRConversation,
  evalCondition: ThreadConditionEval,
): boolean {
  if (sceneWith(world, ownerId)?.openExchange) return false;
  if (state.beatCursor >= thread.beats.length) return true; // the conclusion is always ready
  const beat = thread.beats[state.beatCursor];
  return beat.condition === null || evalCondition(beat.condition);
}

// ---------------------------------------------------------------------------
// Affordance projection (D12 — "Kemp has more to say")
// ---------------------------------------------------------------------------

/**
 * The pair's thread continuability (ADR-320 D14, the D12 affordance
 * surface): present exactly while a thread is ACTIVE; `continuable` is
 * false while the next beat is held (unmet gate or open exchange).
 *
 * @param world - The live world
 * @param sceneId - The scene the affordance describes
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param conversations - The owner's compiled threads
 * @param evalCondition - Hold-gate evaluator (the loader's)
 * @returns The continuability record, or undefined when no thread is active
 */
export function threadContinuabilityFor(
  world: WorldModel,
  sceneId: string,
  ownerId: string,
  partnerId: string,
  conversations: IRConversation[],
  evalCondition: ThreadConditionEval,
): ThreadContinuability | undefined {
  const active = activeThreadFor(world, ownerId, partnerId);
  if (!active) return undefined;
  const thread = conversations.find((c) => c.name === active.threadKey);
  if (!thread) return undefined;
  return {
    sceneId,
    ownerId,
    threadKey: active.threadKey,
    beatCursor: active.state.beatCursor,
    continuable: nextBeatReady(world, ownerId, active.state, thread, evalCondition),
  };
}
