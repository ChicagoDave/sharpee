/**
 * conversation-threads.ts — the runtime's conversation threads section.
 *
 * Conversation threads: a thread's beats, filters, and scene, served on the
 * NPC's turn or dispatched from a topic arm; the topic arm itself, which is
 * the largest single body in the runtime — deflects, scene statements, and
 * the phrase statements a row's response collects — and the turn, strength,
 * parting, and readiness hooks the loader wires into the platform's scenes.
 *
 * Public interface: ConversationThreadsSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import { activeThreadFor, advanceThreadBeat, arbitrateConfidedReveal, type ConversationMemoryAccess, createTraitMemoryAccess, dialogueTurn, drainPressure, markConversationTurn, openThread, parkThread, pinAllowsClaim, readyThreadMove, recordAsked, recordClaimDelivery, resumeThread, revealConfidedTopic, stampThreadContinuability, threadContinuabilityFor, threadStateFor, witnessActs } from '@sharpee/character';
import { conditionRequiresSelfBreaking, type IRCondition, type IRConversation, type IREntity, type IRStatement, type IRTopicRow, normalizeTopic } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { hasTraversableExit } from '@sharpee/stdlib';
import { type ActionInterceptor, type CapabilityEffect, CharacterModelTrait, type ConversationIntent, type ConversationSceneState, type DialogueSelectionContext, type DialogueSelectionResult, IFEntity, type InitiativeSeizure, type InterceptorReportResult, type InterceptorResult, type InterceptorSharedData, type SceneStrength, type SceneWireEvent, sceneWith, TraitType, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { CHORD_OCCURRENCE_PREFIX, CHORD_STATE_PREFIX } from '../state-keys.js';
import { ExecContext, toEffect, type RuntimeCore } from './core.js';

export class ConversationThreadsSection {
  constructor(private readonly core: RuntimeCore) {}

  /** The world-state key stamping a pair's dispatch-path beat advance this cycle. */
  private threadCycleKey(ownerIrId: string, actorId: string): string {
    return `chord.thread.served.${ownerIrId}.${actorId}`;
  }

  /** The hold-gate/`opens when` evaluator for one owner-partner pair. */
  private threadEval(world: WorldModel, ownerIrId: string, actorId: string): (condition: IRCondition) => boolean {
    return (condition) =>
      this.core.evaluator.evalCondition(condition, { world, it: ownerIrId, conversationPartnerId: actorId });
  }

  /** Whether the intent's topic matches the thread's `about` filter. */
  private matchesThreadFilter(thread: IRConversation, intent: ConversationIntent): boolean {
    return thread.filter !== undefined && this.core.dialogue.matchTopicFilters([thread.filter], intent) === 0;
  }

  /** Whether the thread's next beat's hold-gate is met (the conclusion is always ready). */
  private threadBeatReady(
    thread: IRConversation,
    beatCursor: number,
    evalFor: (condition: IRCondition) => boolean,
  ): boolean {
    if (beatCursor >= thread.beats.length) return true;
    const beat = thread.beats[beatCursor];
    return beat.condition === null || evalFor(beat.condition);
  }

  /**
   * Whether an off-thread ask has a real other target (D14 transitions
   * fire on actual switches): a topic-table match, or another thread —
   * parked or unopened — claiming the filter. Unmatched asks never park a
   * passive/assertive thread (nothing is pulling attention away); a
   * blocking thread refuses them regardless (single-topic completion).
   */
  private hasOtherThreadTarget(
    world: WorldModel,
    owner: IREntity,
    threads: IRConversation[],
    intent: ConversationIntent,
    npcWorldId: string,
    actorId: string,
    activeKey: string,
  ): boolean {
    if (this.core.dialogue.matchTopicFilters((owner.topics ?? []).map((r) => r.filter), intent) >= 0) return true;
    for (const thread of threads) {
      if (thread.name === activeKey || !this.matchesThreadFilter(thread, intent)) continue;
      const state = threadStateFor(world, npcWorldId, actorId, thread.name);
      if (state === undefined || state.status === 'parked') return true;
    }
    return false;
  }

  /**
   * The pair's live scene for a thread engagement: the shared one, or a
   * fresh address-opened one when neither side is seated (the
   * `runConversationScene` invariant, honored here because thread
   * lifecycle wire needs the scene id at serve time — the action's own
   * scene step then finds it live and just stamps the move). Undefined
   * when a party is seated elsewhere — no scene, no thread engagement.
   */
  private ensureThreadScene(
    world: WorldModel,
    npcWorldId: string,
    actorId: string,
  ): { scene: ConversationSceneState; wire: SceneWireEvent[] } | undefined {
    const shared = sceneWith(world, npcWorldId);
    if (shared) {
      return shared.participantIds.includes(actorId) ? { scene: shared, wire: [] } : undefined;
    }
    if (sceneWith(world, actorId)) return undefined;
    const runtime = world.getSceneRuntime();
    if (!runtime) return undefined;
    const opened = runtime.openScene([actorId, npcWorldId], { kind: 'address', openerId: actorId });
    return { scene: opened.scene, wire: opened.wireEvents };
  }

  /** Pure mirror of `ensureThreadScene`'s reachability (the probe's leg). */
  private canShareThreadScene(world: WorldModel, npcWorldId: string, actorId: string): boolean {
    const shared = sceneWith(world, npcWorldId);
    if (shared) return shared.participantIds.includes(actorId);
    return !sceneWith(world, actorId) && world.getSceneRuntime() !== undefined;
  }

  /**
   * Advance the pair's ACTIVE thread one beat and serve the beat body as
   * the reply (D14's dispatch-path advance). A gate-held thread re-serves
   * its current beat when `allowHeldReserve` (the thread claims its topics
   * while unconcluded); a held thread with nothing yet served falls
   * through. Stamps the scene subject, the cycle stamp (one beat per turn
   * across both paths), and the continuability snapshot.
   */
  private serveThreadAdvance(args: {
    world: WorldModel;
    owner: IREntity;
    npc: IFEntity;
    actorId: string;
    memory: ConversationMemoryAccess;
    threads: IRConversation[];
    thread: IRConversation;
    allowHeldReserve: boolean;
  }): DialogueSelectionResult | undefined {
    const { world, owner, npc, actorId, memory, threads, thread } = args;
    const ensured = this.ensureThreadScene(world, npc.id, actorId);
    if (!ensured) return undefined;
    const sceneId = ensured.scene.id;
    const evalFor = this.threadEval(world, owner.id, actorId);

    const advance = advanceThreadBeat(world, sceneId, npc.id, actorId, thread, evalFor, memory);
    if (!advance) {
      // Held (unmet `beat, when`): re-serve the current beat — the thread
      // wins while unconcluded — or fall through when nothing served yet.
      if (!args.allowHeldReserve) return undefined;
      const state = threadStateFor(world, npc.id, actorId, thread.name);
      if (!state || state.beatCursor === 0) return undefined;
      const index = state.beatCursor - 1;
      const res = this.core.dialogue.serveConversationBody({
        world, owner, npc, actorId, scene: ensured.scene, memory,
        body: thread.beats[index].body,
        occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.beat.${index}`,
        closesExchange: false,
      });
      return { ...res, wireEvents: [...ensured.wire, ...(res.wireEvents ?? [])] };
    }

    if (thread.filter) {
      this.core.dialogue.stampSceneThread(world, npc.id, actorId, this.core.dialogue.canonicalTopic(thread.filter));
    }
    world.setStateValue(this.threadCycleKey(owner.id, actorId), this.core.dialogueTurn(world));

    const served = threadStateFor(world, npc.id, actorId, thread.name);
    const occurrenceKey =
      advance.kind === 'conclusion'
        ? `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.conclusion`
        : `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.beat.${(served?.beatCursor ?? 1) - 1}`;
    const res = this.core.dialogue.serveConversationBody({
      world, owner, npc, actorId, scene: ensured.scene, memory,
      body: advance.body,
      occurrenceKey,
      closesExchange: false,
    });
    stampThreadContinuability(
      world,
      sceneId,
      advance.kind === 'conclusion'
        ? undefined
        : threadContinuabilityFor(world, sceneId, npc.id, actorId, threads, evalFor),
    );
    return { ...res, wireEvents: [...ensured.wire, ...(res.wireEvents ?? []), ...advance.wireEvents] };
  }

  /**
   * Thread dispatch (ADR-320 D14; Phase 10.4) — the D15 walk's step
   * between the open exchange and the boundary/table paths. The
   * precedence extends D16's innermost-wins: open exchange > active
   * thread > parked-thread resume > topic table.
   *
   *  - ACTIVE + on-filter ask/tell (or TALK TO): one beat advances and its
   *    body is the reply; past the last beat, the conclusion serves.
   *  - ACTIVE + off-topic, `blocking`: refused back into the thread — the
   *    authored `on refusing:` row first, the current beat re-served
   *    otherwise (David: "authored first, repeat second").
   *  - ACTIVE + off-topic with a real other target, `assertive` with an
   *    authored `on parting:`: the protest consumes the turn — the parting
   *    body is the reply and the thread parks; the other topic serves from
   *    the next ask ("one authored beat of resistance, not a wall").
   *  - ACTIVE + off-topic, `passive` (or assertive with nothing authored):
   *    falls through — the topic arm parks the thread as it serves (its
   *    postValidate hook), the same firing.
   *  - No ACTIVE: an ask/tell matching a PARKED thread's filter resumes it
   *    (`on resuming` is the reply when authored; the next beat serves
   *    directly when not); one matching an unopened thread with a ready
   *    first beat activates it. Concluded threads never re-claim.
   *
   * An open exchange in the pair's scene owns the moment entirely — the
   * probe and this server both stand down (a `then asks` beat holds until
   * its exchange closes; unmatched exchange input keeps D16's fallthrough).
   */
  serveThreadDispatch(args: {
    world: WorldModel;
    owner: IREntity;
    npc: IFEntity;
    intent: ConversationIntent;
    ctx: DialogueSelectionContext;
    memory: ConversationMemoryAccess;
  }): DialogueSelectionResult | undefined {
    const { world, owner, npc, intent, ctx, memory } = args;
    const threads = owner.conversations ?? [];
    if (threads.length === 0 || intent.type === 'say') return undefined;
    if (ctx.scene?.openExchange) return undefined;
    const actorId = ctx.speakerId;
    const evalFor = this.threadEval(world, owner.id, actorId);

    const active = activeThreadFor(world, npc.id, actorId);
    if (active) {
      const thread = threads.find((t) => t.name === active.threadKey);
      if (!thread) return undefined;
      const onThread = intent.type === 'talk-to' || this.matchesThreadFilter(thread, intent);
      if (onThread) {
        return this.serveThreadAdvance({
          world, owner, npc, actorId, memory, threads, thread,
          allowHeldReserve: intent.type !== 'talk-to',
        });
      }
      const strength = thread.strength ?? 'passive';
      if (strength === 'blocking') {
        const cursor = active.state.beatCursor;
        const body = thread.onRefusing ?? thread.beats[Math.max(0, cursor - 1)].body;
        const occurrenceKey = thread.onRefusing
          ? `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.refusing`
          : `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.beat.${Math.max(0, cursor - 1)}`;
        const res = this.core.dialogue.serveConversationBody({
          world, owner, npc, actorId, scene: ctx.scene, memory, body, occurrenceKey, closesExchange: false,
        });
        return {
          ...res,
          authorEvents: [
            ...(res.authorEvents ?? []),
            this.core.rawEvent('character.thread.refused', { ownerId: npc.id, threadKey: thread.name }),
          ],
        };
      }
      if (
        strength === 'assertive' &&
        thread.onParting &&
        this.hasOtherThreadTarget(world, owner, threads, intent, npc.id, actorId, thread.name)
      ) {
        const res = this.core.dialogue.serveConversationBody({
          world, owner, npc, actorId, scene: ctx.scene, memory,
          body: thread.onParting,
          occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.parting`,
          closesExchange: false,
        });
        const parkWire = ctx.scene ? parkThread(world, ctx.scene.id, npc.id, actorId, thread.name) : [];
        if (ctx.scene) stampThreadContinuability(world, ctx.scene.id, undefined);
        return { ...res, wireEvents: [...(res.wireEvents ?? []), ...parkWire] };
      }
      return undefined; // passive-style transition: the topic arm parks as it serves
    }

    if (intent.type === 'talk-to') return undefined;
    for (const thread of threads) {
      if (!this.matchesThreadFilter(thread, intent)) continue;
      const state = threadStateFor(world, npc.id, actorId, thread.name);
      if (state?.status === 'parked') {
        const ensured = this.ensureThreadScene(world, npc.id, actorId);
        if (!ensured) return undefined;
        const resumeWire = resumeThread(world, ensured.scene.id, npc.id, actorId, thread.name);
        if (thread.onResuming) {
          // The resume IS this cycle's thread move (the tick path's own
          // one-move-per-turn rule): stamp the pair's cycle key so the
          // same-cycle owner floor turn stands down and the next beat
          // waits for the next engagement — never `on resuming` and the
          // beat bunched into one turn. The no-`on resuming` branch
          // advances instead, and `serveThreadAdvance` stamps there.
          world.setStateValue(this.threadCycleKey(owner.id, actorId), this.core.dialogueTurn(world));
          const res = this.core.dialogue.serveConversationBody({
            world, owner, npc, actorId, scene: ensured.scene, memory,
            body: thread.onResuming,
            occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.resuming`,
            closesExchange: false,
          });
          stampThreadContinuability(
            world,
            ensured.scene.id,
            threadContinuabilityFor(world, ensured.scene.id, npc.id, actorId, threads, evalFor),
          );
          return { ...res, wireEvents: [...ensured.wire, ...resumeWire, ...(res.wireEvents ?? [])] };
        }
        const res = this.serveThreadAdvance({
          world, owner, npc, actorId, memory, threads, thread, allowHeldReserve: true,
        });
        return res
          ? { ...res, wireEvents: [...resumeWire, ...(res.wireEvents ?? [])] }
          : { handled: true, wireEvents: [...ensured.wire, ...resumeWire] };
      }
      if (state === undefined && this.threadBeatReady(thread, 0, evalFor)) {
        const ensured = this.ensureThreadScene(world, npc.id, actorId);
        if (!ensured) return undefined;
        const openWire = openThread(world, ensured.scene.id, npc.id, actorId, thread.name);
        const res = this.serveThreadAdvance({
          world, owner, npc, actorId, memory, threads, thread, allowHeldReserve: true,
        });
        return res
          ? { ...res, wireEvents: [...openWire, ...(res.wireEvents ?? [])] }
          : { handled: true, wireEvents: [...ensured.wire, ...openWire] };
      }
      // Concluded (or not yet ready): the thread stands down for this
      // filter; a later declaration may still claim it.
    }
    return undefined;
  }

  /**
   * The PURE thread probe backing `threadClaims` (D14): mirrors
   * `serveThreadDispatch`'s decisions without mutating, so a gripped
   * firing skips the topic arm exactly when the thread will serve.
   */
  probeThreadClaims(npc: IFEntity, intent: ConversationIntent, ctx: DialogueSelectionContext): boolean {
    const owner = this.core.dialogue.irOwnerOf(npc.id);
    const threads = owner?.conversations ?? [];
    if (!owner || threads.length === 0 || intent.type === 'say') return false;
    if (ctx.scene?.openExchange) return false;
    const world = ctx.world;
    const actorId = ctx.speakerId;
    const evalFor = this.threadEval(world, owner.id, actorId);

    const active = activeThreadFor(world, npc.id, actorId);
    if (active) {
      const thread = threads.find((t) => t.name === active.threadKey);
      if (!thread) return false;
      if (intent.type === 'talk-to') {
        return this.threadBeatReady(thread, active.state.beatCursor, evalFor);
      }
      if (this.matchesThreadFilter(thread, intent)) {
        // An advance, or a held re-serve of the current beat.
        return this.threadBeatReady(thread, active.state.beatCursor, evalFor) || active.state.beatCursor > 0;
      }
      const strength = thread.strength ?? 'passive';
      if (strength === 'blocking') return true;
      return (
        strength === 'assertive' &&
        thread.onParting !== undefined &&
        this.hasOtherThreadTarget(world, owner, threads, intent, npc.id, actorId, thread.name)
      );
    }

    if (intent.type === 'talk-to') return false;
    for (const thread of threads) {
      if (!this.matchesThreadFilter(thread, intent)) continue;
      const state = threadStateFor(world, npc.id, actorId, thread.name);
      if (state?.status === 'parked') return this.canShareThreadScene(world, npc.id, actorId);
      if (state === undefined && this.threadBeatReady(thread, 0, evalFor)) {
        return this.canShareThreadScene(world, npc.id, actorId);
      }
    }
    return false;
  }

  /**
   * The scene binding's thread RUNNER (ADR-320 D14; Phase 10.4) — the
   * owner's-own-floor-turn half of the advance clause: the tick calls it
   * for the co-located player pair and the ready move executes — an
   * `opens when` open (first beat spoken), a parked resume (`on resuming`
   * as the turn's line when authored), or the active thread's next beat.
   * One beat per turn cycle across both paths: a dispatch-path advance
   * this cycle stamps the pair's cycle key and the runner stands down.
   */
  buildThreadTurn(
    world: WorldModel,
  ): (ownerId: string, partnerId: string, sceneId: string) => InitiativeSeizure | undefined {
    return (ownerId, partnerId, sceneId) => {
      const owner = this.core.dialogue.irOwnerOf(ownerId);
      const threads = owner?.conversations ?? [];
      if (!owner || threads.length === 0) return undefined;
      const evalFor = this.threadEval(world, owner.id, partnerId);
      const move = readyThreadMove(world, ownerId, partnerId, threads, evalFor);
      if (!move) return undefined;
      const memory = createTraitMemoryAccess(world);
      const events: ISemanticEvent[] = [];
      const pushWire = (wire: SceneWireEvent[]): void => {
        events.push(...this.wireToEvents(wire));
      };

      if (move.kind === 'advance') {
        const stamp = world.getStateValue(this.threadCycleKey(owner.id, partnerId));
        if (stamp === this.core.dialogueTurn(world) - 1) return undefined; // dispatch advanced this cycle
      } else {
        // Open/resume only when the turn will actually say something —
        // no lifecycle churn for a held first/next beat.
        const state = threadStateFor(world, ownerId, partnerId, move.thread.name);
        const cursor = state?.beatCursor ?? 0;
        if (!move.thread.onResuming || move.kind === 'open') {
          if (!this.threadBeatReady(move.thread, cursor, evalFor)) return undefined;
        }
      }

      const lifecycleWire: SceneWireEvent[] = [];
      if (move.kind === 'open') {
        lifecycleWire.push(...openThread(world, sceneId, ownerId, partnerId, move.thread.name));
      } else if (move.kind === 'resume') {
        lifecycleWire.push(...resumeThread(world, sceneId, ownerId, partnerId, move.thread.name));
        if (move.thread.onResuming) {
          pushWire(lifecycleWire);
          const delivery = this.core.dialogue.deliverSeizureBody(
            world, owner, ownerId, move.thread.onResuming,
            `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${move.thread.name}.resuming`,
            partnerId,
          );
          stampThreadContinuability(
            world, sceneId,
            threadContinuabilityFor(world, sceneId, ownerId, partnerId, threads, evalFor),
          );
          return { ...delivery, events: [...events, ...delivery.events] };
        }
      }

      const advance = advanceThreadBeat(world, sceneId, ownerId, partnerId, move.thread, evalFor, memory);
      if (!advance) {
        pushWire(lifecycleWire);
        return events.length > 0 ? { events } : undefined;
      }
      if (move.thread.filter) {
        this.core.dialogue.stampSceneThread(world, ownerId, partnerId, this.core.dialogue.canonicalTopic(move.thread.filter));
      }
      const served = threadStateFor(world, ownerId, partnerId, move.thread.name);
      const occurrenceKey =
        advance.kind === 'conclusion'
          ? `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${move.thread.name}.conclusion`
          : `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${move.thread.name}.beat.${(served?.beatCursor ?? 1) - 1}`;
      const delivery = this.core.dialogue.deliverSeizureBody(world, owner, ownerId, advance.body, occurrenceKey, partnerId);
      stampThreadContinuability(
        world, sceneId,
        advance.kind === 'conclusion'
          ? undefined
          : threadContinuabilityFor(world, sceneId, ownerId, partnerId, threads, evalFor),
      );
      pushWire([...lifecycleWire, ...advance.wireEvents]);
      return { ...delivery, events: [...events, ...delivery.events] };
    };
  }

  /**
   * Scene wire → semantic events (ADR-320 D12): every kind as
   * `character.scene.<kind>` (structured data, never prose), plus — for a
   * `thread-parting` (D10a, 2026-09-02) — the `character.thread.parting`
   * event the prose pipeline renders by its messageId, the same event the
   * dispatch path has always emitted for a same-pair park.
   *
   * @param wire - The wire events
   * @returns The semantic events, in order
   */
  private wireToEvents(wire: SceneWireEvent[]): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    for (const w of wire) {
      events.push(this.core.rawEvent(`character.scene.${w.kind}`, { ...w }));
      if (w.kind === 'thread-parting') {
        events.push(
          this.core.rawEvent('character.thread.parting', {
            sceneId: w.sceneId,
            ownerId: w.ownerId,
            partnerId: w.partnerId,
            threadKey: w.threadKey,
            messageId: w.messageId,
            params: w.params,
          }),
        );
      }
    }
    return events;
  }

  /**
   * The declared strength of one thread (ADR-320 D10a): what the binding
   * folds into a scene's grip so an interjection meets the thread's own
   * word — `define conversation …, blocking` holds.
   *
   * @returns The reader the binding calls
   */
  buildThreadStrength(): (ownerId: string, partnerId: string, threadKey: string) => SceneStrength | undefined {
    return (ownerId, _partnerId, threadKey) =>
      this.core.dialogue.irOwnerOf(ownerId)?.conversations?.find((t) => t.name === threadKey)?.strength ?? undefined;
  }

  /**
   * The parting-line deliverer (ADR-320 D10a): executes the parked
   * thread's authored `on parting` body under the delivery rules
   * (occurrence key, pin filter, first phrase spoken, surplus to the
   * author channel) and hands back the spoken line. Consulted by every
   * park-on-close path through the binding, and by the dispatch path's
   * same-pair park. The body's non-phrase events ride `events`; the
   * close paths, whose result is wire, carry the line alone.
   *
   * @param world - The live world
   * @returns The deliverer the binding calls
   */
  buildPartingLine(
    world: WorldModel,
  ): (
    ownerId: string,
    partnerId: string,
    threadKey: string,
  ) => { messageId: string; params: Record<string, unknown>; events: ISemanticEvent[] } | undefined {
    return (ownerId, partnerId, threadKey) => {
      const owner = this.core.dialogue.irOwnerOf(ownerId);
      const thread = owner?.conversations?.find((t) => t.name === threadKey);
      if (!owner || !thread?.onParting) return undefined;
      const delivery = this.core.dialogue.deliverSeizureBody(
        world,
        owner,
        ownerId,
        thread.onParting.filter((st) => st.kind !== 'then-open' && st.kind !== 'deflect' && st.kind !== 'leave'),
        `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.parting`,
        partnerId,
      );
      if (!delivery.spokenMessageId) return undefined;
      return { messageId: delivery.spokenMessageId, params: delivery.spokenParams ?? {}, events: delivery.events };
    };
  }

  /** The pure probe for `buildThreadTurn` — would the owner take a thread turn now? */
  buildThreadTurnReady(world: WorldModel): (ownerId: string, partnerId: string) => boolean {
    return (ownerId, partnerId) => {
      const owner = this.core.dialogue.irOwnerOf(ownerId);
      const threads = owner?.conversations ?? [];
      if (!owner || threads.length === 0) return false;
      const evalFor = this.threadEval(world, owner.id, partnerId);
      const move = readyThreadMove(world, ownerId, partnerId, threads, evalFor);
      if (!move) return false;
      if (move.kind === 'advance') {
        const stamp = world.getStateValue(this.threadCycleKey(owner.id, partnerId));
        return stamp !== this.core.dialogueTurn(world) - 1;
      }
      const state = threadStateFor(world, ownerId, partnerId, move.thread.name);
      const cursor = state?.beatCursor ?? 0;
      if (move.kind === 'resume' && move.thread.onResuming) return true;
      return this.threadBeatReady(move.thread, cursor, evalFor);
    };
  }

  /**
   * Deflect chains for a delivered table row (ADR-320 D8; Phase 7): each
   * applying `deflect to` serves the owner's own target row — its plain
   * body execs LIVE here in the report phase (the selector-path precedent:
   * dialogue mutations run at report time) under the target's own
   * occurrence key, so `first time` ordinals agree across paths. Chains
   * recurse, depth-guarded against rogue-IR cycles.
   *
   * @returns Report events the deflection produced, in order
   */
  private execTopicDeflects(
    entity: IREntity,
    rowParts: Array<{ plain: IRStatement[]; convo: IRStatement[] }>,
    rowIndex: number,
    world: WorldModel,
    actorId: string,
    depth: number = 0,
  ): ISemanticEvent[] {
    if (depth > 8) {
      throw new LoadError(`Deflect chain on \`${entity.id}\` exceeds depth 8 — a deflect cycle in rogue IR.`);
    }
    const rows = entity.topics ?? [];
    const events: ISemanticEvent[] = [];
    for (const stmt of rowParts[rowIndex].convo) {
      if (stmt.kind !== 'deflect') continue;
      const frame = {
        conversationPartnerId: actorId,
        conversationTopic: this.core.dialogue.canonicalTopic(rows[rowIndex].filter),
      };
      const when = (stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      if (when && !this.core.evaluator.evalCondition(when, { world, it: entity.id, ...frame })) continue;
      const target = stmt.target;
      const index =
        target.kind === 'entity'
          ? rows.findIndex((r) => r.filter.kind === 'entity' && r.filter.id === target.id)
          : rows.findIndex(
              (r) =>
                r.filter.kind === 'text' &&
                (normalizeTopic(r.filter.primary) === normalizeTopic(target.primary) ||
                  r.filter.aliases.some((a) => normalizeTopic(a) === normalizeTopic(target.primary))),
            );
      if (index < 0) {
        throw new LoadError(`\`deflect to\` names no row of \`${entity.id}\`'s own table.`, stmt.span);
      }
      const key = `${CHORD_OCCURRENCE_PREFIX}topic.${entity.id}.${index}`;
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      world.setStateValue(key, occurrence);
      events.push(
        ...this.core.statements.execStatements(
          rowParts[index].plain,
          {
            world,
            it: entity.id,
            occurrence,
            conversationPartnerId: actorId,
            conversationTopic: this.core.dialogue.canonicalTopic(rows[index].filter),
          },
          'all',
        ),
        ...this.execTopicDeflects(entity, rowParts, index, world, actorId, depth + 1),
      );
    }
    return events;
  }

  /**
   * `then asks`/`then invites` and `leave` after a delivered table row
   * (ADR-320 D4/D8; Phase 7): directives apply through the world's
   * registered scene runtime against the pair's live scene — opened by
   * `runConversationScene` before the interceptor's postReport runs. An
   * illegal exit drops the close (the delivered response stands, the
   * Phase 6 stdlib semantic) and rides `exit_refused` on the author
   * channel; a legal exit speaks the owner's `on leaving` row alongside.
   *
   * @returns Emit effects for everything that happened, in order
   */
  private applyTopicSceneStatements(
    entity: IREntity,
    rowParts: Array<{ plain: IRStatement[]; convo: IRStatement[] }>,
    rowIndex: number,
    world: WorldModel,
    actorId: string,
  ): ISemanticEvent[] {
    const npcWorldId = this.core.host.entityId(entity.id);
    const runtime = npcWorldId ? world.getSceneRuntime() : undefined;
    if (!npcWorldId || !runtime) return [];
    const scene = sceneWith(world, npcWorldId);
    if (!scene || !scene.participantIds.includes(actorId)) return [];

    const frame = {
      conversationPartnerId: actorId,
      conversationTopic: this.core.dialogue.canonicalTopic((entity.topics ?? [])[rowIndex].filter),
    };
    const events: ISemanticEvent[] = [];
    const wire: SceneWireEvent[] = [];
    for (const stmt of rowParts[rowIndex].convo) {
      if (stmt.kind === 'deflect') continue; // execTopicDeflects handled it
      const when = (stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      if (when && !this.core.evaluator.evalCondition(when, { world, it: entity.id, ...frame })) continue;
      if (stmt.kind === 'then-open') {
        const target = (entity.exchanges ?? []).find((e) => e.name === stmt.exchange);
        if (!target) {
          throw new LoadError(`\`then ${stmt.word}\` names an unknown exchange \`${stmt.exchange}\` on \`${entity.id}\`.`, stmt.span);
        }
        const exchangeId = `${entity.id}.${target.name}`;
        wire.push(
          ...runtime.applyDirectives(scene.id, [
            {
              kind: 'open-exchange',
              exchange: {
                exchangeId,
                speakerId: npcWorldId,
                ...(target.strength ? { strength: target.strength } : {}),
                openedTurn: this.core.dialogueTurn(world),
                responses: this.core.dialogue.exchangeResponses(exchangeId, target),
              },
            },
          ]),
        );
        events.push(this.core.rawEvent('character.exchange.opened', { exchangeId, word: stmt.word }));
      } else if (stmt.kind === 'leave') {
        const room = world.getContainingRoom(npcWorldId)?.id ?? world.getLocation(npcWorldId);
        if (!room || !hasTraversableExit(world, room)) {
          events.push(this.core.rawEvent('character.scene.exit_refused', { sceneId: scene.id, leaverId: npcWorldId }));
          continue;
        }
        const leaving = (entity.greetings ?? []).find((r) => r.head.kind === 'leaving');
        if (leaving) {
          events.push(...this.core.statements.execStatements(leaving.body, { world, it: entity.id, ...frame }, 'all'));
        }
        wire.push(
          ...runtime.applyDirectives(scene.id, [
            { kind: 'close-scene', boundary: 'exit', leaverId: npcWorldId },
          ]),
        );
      }
    }
    events.push(...this.wireToEvents(wire));
    return events;
  }

  /** Phrase statements of a row body, top-level and inside select alternatives. */
  private collectPhraseStatements(body: IRStatement[]): Array<Extract<IRStatement, { kind: 'phrase' }>> {
    const out: Array<Extract<IRStatement, { kind: 'phrase' }>> = [];
    for (const stmt of body) {
      if (stmt.kind === 'phrase') out.push(stmt);
      else if (stmt.kind === 'select-strategy') {
        for (const alt of stmt.alternatives) out.push(...this.collectPhraseStatements(alt));
      }
    }
    return out;
  }

  /**
   * Runtime dispatch for one topic-table owner (ADR-239 D4/D5): normalized
   * whole-topic lookup against the declared rows — entity tier first (the
   * platform's quiet `topicEntityId` resolution), then free-text tier
   * (primary or declared alias; the SAME normalizeTopic the analyzer's
   * overlap gates used — one implementation, imported from chord). A hit
   * runs the matched ROW's body exactly like a one-clause `on` firing
   * (its first phrase OVERRIDES the primary message; the catch-all never
   * runs — suppression, not append). A miss falls to the owner's
   * catch-all clause when one is declared; with none, `{}` leaves the
   * action's unconditional unknown_topic/not_interested default standing.
   * The asked topic reaches `data` via the lifecycle seedData hook.
   *
   * Character-model owners (ADR-310/318 Phase 6) add three consultations:
   * the confided-reveal arbitration gate (a refuse/evade verdict
   * suppresses the row — the action's default reply stands as the
   * evasion), the lie-ledger pin (a pinned claim forces the matching
   * line and filters contradicting ones), and the mint rule on every
   * delivered claims-tagged phrase. All three live HERE — the topic
   * table is Chord's one dialogue path; the selector socket stays the
   * TS-API surface.
   */
  buildTopicArm(entity: IREntity, catchAll: ActionInterceptor | undefined, gerund: string): ActionInterceptor {
    const runtime = this;
    const rows = entity.topics ?? [];

    // ADR-320 Phase 7: conversation statements (`then asks`, `deflect to`,
    // `leave`) are extracted from row bodies at build — the exec walker
    // loud-fails on them by design; postReport processes them once, after
    // the row delivers (the mutations/reports passes see `plain` only).
    const rowParts = rows.map((row) => {
      const plain: IRStatement[] = [];
      const convo: IRStatement[] = [];
      for (const stmt of row.body) {
        if (stmt.kind === 'then-open' || stmt.kind === 'deflect' || stmt.kind === 'leave') convo.push(stmt);
        else plain.push(stmt);
      }
      return { plain, convo };
    });

    // Seam-2 ruling (2026-08-16): a phrase line provably gated on the
    // owner's OWN `breaking` band is the in-conversation crack — its
    // delivery discharges (drains the curve; pins release per audience
    // via the claims path, seam 3). The gate IS the marker. Computed once
    // per row at build; keyed by phrase key = the delivered messageId.
    const dischargeKeys: Set<string>[] = rows.map((row) => {
      const keys = new Set<string>();
      const walk = (stmts: IRStatement[]): void => {
        for (const s of stmts) {
          if (s.kind === 'phrase' && s.stmtWhen && conditionRequiresSelfBreaking(s.stmtWhen, entity.id)) {
            keys.add(s.phraseKey);
          } else if (s.kind === 'ordinal' || s.kind === 'each') {
            walk(s.body);
          } else if (s.kind === 'select-on') {
            for (const arm of s.arms) walk(arm.body);
          } else if (s.kind === 'select-strategy') {
            for (const alt of s.alternatives) walk(alt);
          }
        }
      };
      walk(row.body);
      return keys;
    });

    /** Match once per firing; memoized on the consultation's sharedData. */
    const rowIndexFor = (data: InterceptorSharedData): number => {
      if (typeof data.chordTopicRow === 'number') return data.chordTopicRow;
      const askedEntity = typeof data.topicEntityId === 'string' ? data.topicEntityId : null;
      const askedText = typeof data.topic === 'string' ? normalizeTopic(data.topic) : null;
      let index = -1;
      if (askedEntity !== null) {
        index = rows.findIndex((r) => r.filter.kind === 'entity' && runtime.core.host.entityId(r.filter.id) === askedEntity);
      }
      if (index === -1 && askedText !== null && askedText !== '') {
        index = rows.findIndex(
          (r) =>
            r.filter.kind === 'text' &&
            (normalizeTopic(r.filter.primary) === askedText || r.filter.aliases.some((a) => normalizeTopic(a) === askedText)),
        );
      }
      data.chordTopicRow = index;
      return index;
    };
    // One occurrence namespace per ROW, shared across ask and tell (D1 —
    // one table serves both): a row-body `first time` ordinal counts
    // deliveries of that response, however it was reached.
    const occurrenceKeyOf = (rowIndex: number) => `${CHORD_OCCURRENCE_PREFIX}topic.${entity.id}.${rowIndex}`;

    /** The owner's character-model trait, when it carries one (ADR-310 D7: none → no consultation). */
    const speakerOf = (world: WorldModel): { worldId: string; trait: CharacterModelTrait } | null => {
      const worldId = runtime.core.host.entityId(entity.id);
      if (!worldId) return null;
      const trait = world.getEntity(worldId)?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      return trait ? { worldId, trait } : null;
    };

    /** The row's canonical topic candidates for held-knowledge lookups. */
    const topicCandidatesOf = (row: IRTopicRow): string[] => runtime.core.dialogue.topicCandidates(row.filter);

    /** The conversation frame the row's conditions evaluate under (ADR-320 Phase 7). */
    const frameOf = (row: IRTopicRow, actorId: string): Pick<ExecContext, 'conversationPartnerId' | 'conversationTopic'> => ({
      conversationPartnerId: actorId,
      conversationTopic: topicCandidatesOf(row)[0],
    });

    interface CharacterGate {
      suppress: boolean;
      confidedTopic?: string;
      authorEvents: ISemanticEvent[];
    }

    /**
     * The confided-reveal arbitration gate (ADR-318 — Phase 6). Runs AT
     * MOST once per firing (memoized on the consultation's sharedData —
     * the arbitration deposits conscience pressure, so re-running it
     * would double-charge). Null = ungated: no character model, no row,
     * or the topic is not held confided.
     */
    const characterGate = (world: WorldModel, actorId: string, data: InterceptorSharedData): CharacterGate | null => {
      if ('chordCharacterGate' in data) return data.chordCharacterGate as CharacterGate | null;
      const compute = (): CharacterGate | null => {
        const row = rows[rowIndexFor(data)];
        if (!row) return null;
        const speaker = speakerOf(world);
        if (!speaker) return null;
        const confidedTopic = topicCandidatesOf(row).find((t) => speaker.trait.getFact(t)?.confided);
        if (confidedTopic === undefined) return null;
        const story = runtime.core.host.characterStoryData?.();
        const state = world.getStateValue(CHORD_STATE_PREFIX + entity.id);
        const room = world.getLocation(speaker.worldId);
        const audiencePresent = room
          ? world.getContents(room).filter((e) => e.has(TraitType.ACTOR) && e.id !== speaker.worldId).map((e) => e.id)
          : [];
        const arb = arbitrateConfidedReveal({
          trait: speaker.trait,
          npcId: speaker.worldId,
          askerId: actorId,
          topic: confidedTopic,
          audiencePresent,
          ...(typeof state === 'string' ? { activeStates: [state] } : {}),
          ...(story?.temperamentDefs ? { temperamentDefs: story.temperamentDefs } : {}),
          ...(story ? { isKindMember: story.isKindMember } : {}),
        });
        if (!arb) return null;
        return { suppress: !arb.reveal, confidedTopic, authorEvents: arb.authorEvents };
      };
      const gate = compute();
      data.chordCharacterGate = gate;
      return gate;
    };

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const index = rowIndexFor(data);
        const row = rows[index];
        if (!row) return catchAll?.preValidate?.(target, world, actorId, data) ?? null;
        const ctx: ExecContext = { world, it: entity.id, ...frameOf(row, actorId) };
        const refusal = runtime.core.statements.findRefusal(rowParts[index].plain, ctx);
        return refusal ? { valid: false, ...refusal } : null;
      },

      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const index = rowIndexFor(data);
        const row = rows[index];
        if (!row) return catchAll?.postValidate?.(target, world, actorId, data) ?? null;
        // A refuse/evade reveal verdict suppresses the row entirely — no
        // occurrence consumed, no mutations, no phrase (the action's
        // default reply stands as the evasion).
        if (characterGate(world, actorId, data)?.suppress) return null;
        const bag = runtime.core.onClauses.clauseBag(data, `topic.${entity.id}`);
        const ctx: ExecContext = { world, it: entity.id, ...frameOf(row, actorId) };
        const key = occurrenceKeyOf(index);
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        bag.occurrence = occurrence;
        // Thread stamp and ask count BEFORE the mutations pass decides
        // row conditions, so `the subject changes` and `asked once` hold
        // on the very firing they describe (ADR-320 Phase 7 design §5-§6).
        {
          const npcWorldId = runtime.core.host.entityId(entity.id);
          if (npcWorldId) {
            runtime.core.dialogue.stampSceneThread(world, npcWorldId, actorId, topicCandidatesOf(row)[0]);
            if (gerund === 'asking') {
              const memory = createTraitMemoryAccess(world);
              recordAsked(memory, npcWorldId, actorId, topicCandidatesOf(row)[0]);
              recordAsked(memory, actorId, npcWorldId, topicCandidatesOf(row)[0]);
            }
          }
          // ADR-320 D14 transition (Phase 10.4): a table row serving while
          // the pair's thread is ACTIVE parks it — the passive path
          // (blocking and assertive-protest firings never reach the arm:
          // the thread probe gripped them). The authored `on parting`
          // body executes for its effects; its line rides the author
          // channel and the D12 wire utterance, never this reply (one
          // spoken line per firing — the delivery freeze).
          const parked = npcWorldId ? activeThreadFor(world, npcWorldId, actorId) : undefined;
          if (npcWorldId && parked) {
            // ADR-320 D10a (2026-09-02): the same-pair park renders its
            // `on parting` through the one shared deliverer every close
            // path uses; the body's own non-phrase events still ride.
            const scene = sceneWith(world, npcWorldId);
            const line = runtime.buildPartingLine(world)(npcWorldId, actorId, parked.threadKey);
            const parkWire = parkThread(world, scene?.id ?? '', npcWorldId, actorId, parked.threadKey);
            const partingWire: SceneWireEvent[] = line
              ? [{
                  kind: 'thread-parting',
                  sceneId: scene?.id ?? '',
                  ownerId: npcWorldId,
                  partnerId: actorId,
                  threadKey: parked.threadKey,
                  messageId: line.messageId,
                  params: line.params,
                }]
              : [];
            if (scene) stampThreadContinuability(world, scene.id, undefined);
            data.chordThreadPark = [...(line?.events ?? []), ...runtime.wireToEvents([...parkWire, ...partingWire])];
          }
        }
        return null;
      },

      postExecute(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): void {
        const index = rowIndexFor(data);
        const row = rows[index];
        if (!row) {
          catchAll?.postExecute?.(target, world, actorId, data);
          return;
        }
        if (characterGate(world, actorId, data)?.suppress) return;
        const ctx = { ...runtime.core.onClauses.restoreCtx(world, entity.id, runtime.core.onClauses.clauseBag(data, `topic.${entity.id}`), 'mutations'), ...frameOf(row, actorId) };
        runtime.core.statements.execStatements(rowParts[index].plain, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        // Any ask/tell reaching a character-model owner is a conversation
        // in progress (ADR-310 D16) — evasions and row-misses included —
        // so the marker is stamped before the row is consulted.
        const modeledSpeaker = speakerOf(world);
        if (modeledSpeaker) markConversationTurn(modeledSpeaker.trait, actorId, runtime.core.dialogueTurn(world));

        const rowIndex = rowIndexFor(data);
        const row = rows[rowIndex];
        if (!row) return catchAll?.postReport?.(target, world, actorId, data) ?? {};
        const gate = characterGate(world, actorId, data);
        const speaker = speakerOf(world);
        const authorEmit: CapabilityEffect[] = (gate?.authorEvents ?? []).map(toEffect);
        if (gate?.suppress) {
          // The verdict's evasion IS the action's default reply — no
          // authored text is invented for it (ADR-310 D12), and the
          // arbitration rides the author channel.
          return authorEmit.length ? { emit: authorEmit } : {};
        }
        const ctx = { ...runtime.core.onClauses.restoreCtx(world, entity.id, runtime.core.onClauses.clauseBag(data, `topic.${entity.id}`), 'reports'), ...frameOf(row, actorId) };
        let reports = runtime.core.statements.execStatements(rowParts[rowIndex].plain, ctx, 'reports');

        // Conversation statements (ADR-320 Phase 7): a deflect serves the
        // owner's own target row IN PLACE of (or before) this row's own
        // phrases — processed here so its phrases join the override loop.
        reports = reports.concat(runtime.execTopicDeflects(entity, rowParts, rowIndex, world, actorId));

        // The lie-ledger pin (ADR-318 D9 / contracts.md §4): a delivered
        // line may never contradict a claim pinned to this audience —
        // the shared filter rule, one semantics with the TS dialogue
        // extension. A row whose only passing line contradicts the pin
        // delivers nothing (the default reply is the deflection); the
        // maintained lie never evaporates below `breaking`, where the
        // pin stops gating and the truth can escape through the crack
        // (seam-4 ruling 2026-08-16).
        if (speaker) {
          reports = reports.filter((event) => {
            if (event.type !== 'chord.phrase') return true;
            const claims = runtime.core.topicTables.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
            return pinAllowsClaim(speaker.trait, actorId, claims);
          });
        }

        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        // The D14 passive-park events staged in postValidate (parting
        // effects, wire utterance, thread-parked) join the emit stream.
        for (const event of (data.chordThreadPark as ISemanticEvent[] | undefined) ?? []) {
          emit.push(toEffect(event));
        }
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          if (event.type === 'chord.phrase') {
            // A hit fully owns the response (D5) — override, never append.
            // Exclusivity is compiler-enforced (`analysis.phrase-overlap`,
            // D7 ruling 2026-08-16): at most the default and one matched
            // conditional line reach this loop, and the conditional line
            // wins. A surplus phrase (rogue IR that bypassed the compiler)
            // is dropped, never emitted as extra prose.
            if (!result.override) {
              result.override = {
                messageId: String(payload.messageId),
                params: (payload.params as Record<string, unknown>) ?? {},
              };
            }
          } else {
            emit.push(toEffect(event));
          }
        }

        if (speaker && result.override) {
          // The mint rule (D9): a delivered claims-tagged line contradicting
          // the speaker's held belief mints a pinned ledger entry; every
          // pinned delivery deposits conscience pressure.
          const claims = runtime.core.topicTables.claimsFor(result.override.messageId);
          if (claims) {
            for (const e of recordClaimDelivery(speaker.trait, speaker.worldId, actorId, claims, runtime.core.dialogueTurn(world))) {
              emit.push(toEffect(e));
            }
          }
          // A delivered confided topic is a betrayal committed (D4/D12a):
          // the room's character-model witnesses learn the derived (or
          // story-aliased) topic, so reputation travels by propagation.
          if (gate?.confidedTopic !== undefined) {
            const speakerEntity = world.getEntity(speaker.worldId);
            const act = speakerEntity ? revealConfidedTopic(speakerEntity, speaker.trait, gate.confidedTopic) : undefined;
            if (act) {
              const aliased = {
                ...act,
                derivedTopic: runtime.core.topicTables.witnessedAliasFor(entity.id, 'betray a confidence', act.derivedTopic),
              };
              const room = world.getLocation(speaker.worldId);
              const occupants = room ? world.getContents(room) : [];
              const learned = witnessActs([aliased], occupants, runtime.core.dialogueTurn(world));
              emit.push({
                type: 'character.author.act_witnessed',
                payload: { act: 'betray a confidence', topic: aliased.derivedTopic, learned },
                actor: speaker.worldId,
              });
            }
          }
          // Seam-2 ruling (2026-08-16): delivering the breaking-gated
          // crack line IS the confession — the curve drains to `clear`
          // (curve only; the claims path above already released this
          // audience's pin when the line told the truth, seam 3).
          if (dischargeKeys[rowIndexFor(data)]?.has(result.override.messageId)) {
            const transition = drainPressure(speaker.trait);
            emit.push({
              type: 'character.author.pressure_drain',
              payload: {
                npcId: speaker.worldId,
                value: speaker.trait.pressure.value,
                band: speaker.trait.pressure.band,
                ...(transition ? { transition } : {}),
              },
              actor: speaker.worldId,
            });
          }
        }

        // `then asks`/`leave` after the delivered row (ADR-320 Phase 7):
        // scene directives through the registered runtime, appended to
        // the emit stream (wire events, exchange-opened, exit_refused).
        for (const event of runtime.applyTopicSceneStatements(entity, rowParts, rowIndex, world, actorId)) {
          emit.push(toEffect(event));
        }

        // A delivered row is a discussed topic on both modeled sides
        // (ADR-320 Phase 7 design §5 — the table path's half of the
        // shared bookkeeping; the thread stamp ran in postValidate).
        if (result.override) {
          const npcWorldId = runtime.core.host.entityId(entity.id);
          if (npcWorldId) {
            runtime.core.dialogue.recordDiscussedPair(createTraitMemoryAccess(world), npcWorldId, actorId, topicCandidatesOf(row));
          }
        }

        emit.push(...authorEmit);
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }
}
