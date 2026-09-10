/**
 * dialogue.ts — the runtime's dialogue section.
 *
 * Dialogue: the topic dispatch an NPC answers through — canonical topics and
 * their candidates, filter matching, exchange rows and greetings, the
 * discussed-pair record — packaged as the dialogue selector registration the
 * loader hands the platform, plus the authored initiative and seizure the
 * scene evaluation consults.
 *
 * Public interface: DialogueSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import { absenceWordFor, askedWordFor, authoredInitiativeFor, boundaryKindOnOpen, type ConversationMemoryAccess, createTraitMemoryAccess, dialogueTurn, markConversationTurn, noteTopicMove, pinAllowsClaim, recordAsked, recordClaimDelivery, recordTopicDiscussed, renderSilence, selectMannerBeat } from '@sharpee/character';
import { type IRCondition, type IREntity, type IRExchange, type IRGreetingRow, type IRStatement, normalizeTopic } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { hasTraversableExit } from '@sharpee/stdlib';
import { CharacterModelTrait, type ConversationIntent, type ConversationSceneState, type DialogueSelectionResult, type DialogueSelectorRegistration, type ExchangeState, IFEntity, type InitiativeSeizure, type ResponseAffordance, type SceneDirective, type SceneOccasion, type SceneWireEvent, sceneWith, TraitType, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { CHORD_OCCURRENCE_PREFIX } from '../state-keys.js';
import { ExecContext, type RuntimeCore } from './core.js';

export class DialogueSection {
  constructor(private readonly core: RuntimeCore) {}

  /** IR entities by id, for dialogue lookups (built lazily, IR is immutable). */
  private irEntityIndex?: Map<string, IREntity>;

  /** The IR entity a live NPC compiled from, if any. */
  irOwnerOf(worldId: string): IREntity | undefined {
    if (!this.irEntityIndex) {
      this.irEntityIndex = new Map(this.core.ir.entities.map((e) => [e.id, e]));
    }
    const irId = this.core.host.irIdOf(worldId);
    return irId === undefined ? undefined : this.irEntityIndex.get(irId);
  }

  /**
   * The canonical per-pair topic key of a row filter (ADR-320 Phase 7
   * design §5): entity rows key by IR id (stable across saves), text rows
   * by the normalized primary. Recorders and predicate reads share this
   * one keying so `asked`/`discussed` always find their counts.
   */
  canonicalTopic(filter: { kind: 'entity'; id: string } | { kind: 'text'; primary: string }): string {
    return filter.kind === 'entity' ? filter.id : normalizeTopic(filter.primary);
  }

  /** Every canonical key a row filter answers to (primary first, then aliases). */
  topicCandidates(
    filter: { kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] },
  ): string[] {
    return filter.kind === 'entity'
      ? [filter.id]
      : [normalizeTopic(filter.primary), ...filter.aliases.map((alias) => normalizeTopic(alias))];
  }

  /**
   * Match an intent against row filters — entity tier first (quiet
   * `topicEntityId` resolution), then normalized free-text tier: the
   * topic arm's rule, shared by exchange answer rows. Null slots (act and
   * silence rows) never match typed input.
   *
   * @returns The matched index, or -1
   */
  matchTopicFilters(
    filters: Array<{ kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] } | null>,
    intent: ConversationIntent,
  ): number {
    const askedEntity = intent.topicEntityId ?? null;
    const askedText = intent.text !== undefined ? normalizeTopic(intent.text) : null;
    if (askedEntity !== null) {
      const index = filters.findIndex((f) => f?.kind === 'entity' && this.core.host.entityId(f.id) === askedEntity);
      if (index !== -1) return index;
    }
    if (askedText !== null && askedText !== '') {
      return filters.findIndex(
        (f) =>
          f?.kind === 'text' &&
          (normalizeTopic(f.primary) === askedText || f.aliases.some((a) => normalizeTopic(a) === askedText)),
      );
    }
    return -1;
  }

  /** The matched `answer`-row index of an open exchange for typed input. */
  private matchExchangeRow(exchange: IRExchange, intent: ConversationIntent): number {
    return this.matchTopicFilters(
      exchange.rows.map((r) => (r.head.kind === 'answer' ? r.head.filter : null)),
      intent,
    );
  }

  /**
   * The advertised response set of an exchange (ADR-320 D12), enumerated
   * from the compiled rows at open time and snapshotted onto the
   * `ExchangeState`. Entity topic filters advertise the resolved world
   * entity id (what a consumer can act on), not the Chord-level id. Ends
   * with exactly one `silence` affordance — the authored silence row when
   * present, appended otherwise (D8, the inalienable move).
   */
  exchangeResponses(exchangeId: string, exchange: IRExchange): ResponseAffordance[] {
    const responses: ResponseAffordance[] = [];
    let hasSilence = false;
    exchange.rows.forEach((row, index) => {
      const rowId = `${exchangeId}#${index}`;
      if (row.head.kind === 'answer') {
        const filter = row.head.filter;
        const topic =
          filter.kind === 'entity'
            ? { kind: 'entity' as const, id: this.core.host.entityId(filter.id) ?? filter.id }
            : { kind: 'text' as const, primary: filter.primary, aliases: [...filter.aliases] };
        responses.push({ kind: 'verbal', rowId, topic });
      } else if (row.head.kind === 'act') {
        responses.push({ kind: 'act', rowId, actionId: row.head.action });
      } else if (!hasSilence) {
        responses.push({ kind: 'silence' });
        hasSilence = true;
      }
    });
    if (!hasSilence) responses.push({ kind: 'silence' });
    return responses;
  }

  /** The compiled exchange an open `ExchangeState` instantiates, when it is this owner's. */
  private openExchangeOf(
    owner: IREntity,
    scene: ConversationSceneState | undefined,
  ): { exchange: IRExchange; state: ExchangeState } | undefined {
    const state = scene?.openExchange;
    if (!state) return undefined;
    const prefix = `${owner.id}.`;
    if (!state.exchangeId.startsWith(prefix)) return undefined;
    const exchange = (owner.exchanges ?? []).find((e) => e.name === state.exchangeId.slice(prefix.length));
    return exchange ? { exchange, state } : undefined;
  }

  /**
   * The boundary row a scene-opening firing serves (ADR-320 D4; Phase 7
   * design §4): first-meeting rows on a blank pair; on return, the
   * absence-refined row, then the repetition (`asked`) row over the
   * pair's total ask count, then the bare `on return` row —
   * most-specific-wins, refinement before declaration order.
   */
  private pickGreetingRow(
    owner: IREntity,
    memory: ConversationMemoryAccess,
    world: WorldModel,
    npcId: string,
    actorId: string,
  ): IRGreetingRow | undefined {
    const rows = owner.greetings ?? [];
    if (rows.length === 0) return undefined;
    if (boundaryKindOnOpen(memory, npcId, actorId) === 'first-meeting') {
      return rows.find((r) => r.head.kind === 'first-time');
    }
    const pair = memory.get(npcId, actorId);
    const absence = absenceWordFor(this.core.dialogueTurn(world), pair?.lastSceneClosedTurn);
    const refined = rows.find((r) => r.head.kind === 'return' && r.head.absence !== null && r.head.absence === absence);
    if (refined) return refined;
    const totalAsks = Object.values(pair?.askedCounts ?? {}).reduce((sum, n) => sum + n, 0);
    const askedWord = askedWordFor(totalAsks);
    const repetition = rows.find((r) => r.head.kind === 'asked' && r.head.word === askedWord);
    if (repetition) return repetition;
    return rows.find((r) => r.head.kind === 'return' && r.head.absence === null);
  }

  /** The per-pair key an unmatched or matched ask counts under (Phase 7 design §5). */
  private askedTopicKey(owner: IREntity, intent: ConversationIntent): string | undefined {
    const rows = owner.topics ?? [];
    const index = this.matchTopicFilters(rows.map((r) => r.filter), intent);
    if (index >= 0) return this.canonicalTopic(rows[index].filter);
    if (intent.topicEntityId !== undefined) return this.core.host.irIdOf(intent.topicEntityId);
    const text = intent.text !== undefined ? normalizeTopic(intent.text) : '';
    return text !== '' ? text : undefined;
  }

  /** Record a served topic as discussed on both modeled sides (history — post-delivery). */
  recordDiscussedPair(
    memory: ConversationMemoryAccess,
    npcId: string,
    actorId: string,
    topics: string[],
  ): void {
    for (const topic of topics) {
      recordTopicDiscussed(memory, npcId, actorId, topic);
      recordTopicDiscussed(memory, actorId, npcId, topic);
    }
  }

  /**
   * Stamp the pair's scene thread BEFORE row conditions are decided (the
   * mutations pass resolves `when` truths), so `the subject changes`
   * holds during the very firing that changes it (Phase 7 design §6).
   */
  stampSceneThread(world: WorldModel, npcWorldId: string, actorId: string, topic: string): void {
    const scene = sceneWith(world, npcWorldId);
    if (scene && scene.participantIds.includes(actorId)) {
      noteTopicMove(world, scene.id, topic);
    }
  }

  /**
   * Serve one conversation row body as a D15 selection (ADR-320 Phase 7
   * design §4): exec the plain statements live (the select IS the
   * mutating report phase — Phase 6's contract), translate conversation
   * statements into scene directives, and finish with the topic arm's
   * exclusivity/pin/mint rules. Deflects recurse into the owner's own
   * table row (depth-guarded); an illegal `leave` serves a rendered
   * silence INSTEAD of the row — no mutations, no occurrence, the world
   * refused the departure so the prose never announces it.
   */
  serveConversationBody(args: {
    world: WorldModel;
    owner: IREntity;
    npc: IFEntity;
    actorId: string;
    scene: ConversationSceneState | undefined;
    memory: ConversationMemoryAccess;
    body: IRStatement[];
    occurrenceKey: string;
    canonicalTopic?: string;
    /** Every key the served row answers to (aliases included); defaults to the canonical alone. */
    discussTopics?: string[];
    closesExchange: boolean;
  }): DialogueSelectionResult {
    const { world, owner, npc, actorId, scene, memory } = args;
    const frame = {
      conversationPartnerId: actorId,
      ...(args.canonicalTopic !== undefined ? { conversationTopic: args.canonicalTopic } : {}),
    };
    const evalWhen = (condition: IRCondition | null | undefined): boolean =>
      !condition || this.core.evaluator.evalCondition(condition, { world, it: owner.id, ...frame });
    const mannerCondition = (row: { condition: IRCondition }): boolean =>
      this.core.evaluator.evalCondition(row.condition, { world, it: owner.id, ...frame });

    // An applying `leave` is checked FIRST (design §4): illegal exits
    // refuse the whole row — rendered silence instead, nothing mutated.
    const leaveApplies = args.body.some(
      (s) => s.kind === 'leave' && evalWhen((s as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen),
    );
    if (leaveApplies && scene) {
      const room = world.getContainingRoom(npc.id)?.id ?? world.getLocation(npc.id);
      if (!room || !hasTraversableExit(world, room)) {
        return {
          handled: true,
          authorEvents: [this.core.rawEvent('character.scene.exit_refused', { sceneId: scene.id, leaverId: npc.id })],
          wireEvents: [renderSilence(world, scene.id, npc.id, owner.manner ?? [], mannerCondition)],
        };
      }
    }

    const reports: ISemanticEvent[] = [];
    const directives: SceneDirective[] = [];
    const authorEvents: ISemanticEvent[] = [];
    let openedAnother = false;
    let leftScene = false;

    const bump = (key: string): number => {
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      world.setStateValue(key, occurrence);
      return occurrence;
    };

    // Thread stamp BEFORE the body's conditions are decided, so `the
    // subject changes` holds on the abandoning firing (design §6).
    if (scene && args.canonicalTopic !== undefined) {
      noteTopicMove(world, scene.id, args.canonicalTopic);
    }

    const processBody = (body: IRStatement[], occurrenceKey: string, topicKey: string | undefined, depth: number): void => {
      if (depth > 8) {
        throw new LoadError(`Deflect chain on \`${owner.id}\` exceeds depth 8 — a deflect cycle in rogue IR.`);
      }
      const plain: IRStatement[] = [];
      const convo: IRStatement[] = [];
      for (const stmt of body) {
        if (stmt.kind === 'then-open' || stmt.kind === 'deflect' || stmt.kind === 'leave') convo.push(stmt);
        else plain.push(stmt);
      }
      const occurrence = bump(occurrenceKey);
      const ctx: ExecContext = {
        world,
        it: owner.id,
        occurrence,
        conversationPartnerId: actorId,
        ...(topicKey !== undefined ? { conversationTopic: topicKey } : {}),
      };
      reports.push(...this.core.statements.execStatements(plain, ctx, 'all'));

      for (const stmt of convo) {
        if (!evalWhen((stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen)) continue;
        if (stmt.kind === 'then-open') {
          const target = (owner.exchanges ?? []).find((e) => e.name === stmt.exchange);
          if (!target) {
            throw new LoadError(`\`then ${stmt.word}\` names an unknown exchange \`${stmt.exchange}\` on \`${owner.id}\`.`, stmt.span);
          }
          const exchangeId = `${owner.id}.${target.name}`;
          directives.push({
            kind: 'open-exchange',
            exchange: {
              exchangeId,
              speakerId: npc.id,
              ...(target.strength ? { strength: target.strength } : {}),
              openedTurn: this.core.dialogueTurn(world),
              responses: this.exchangeResponses(exchangeId, target),
            },
          });
          // The `asks`/`invites` word rides the author channel (Phase 9's feed).
          authorEvents.push(this.core.rawEvent('character.exchange.opened', { exchangeId, word: stmt.word }));
          openedAnother = true;
        } else if (stmt.kind === 'deflect') {
          const target = stmt.target;
          const rows = owner.topics ?? [];
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
            throw new LoadError(`\`deflect to\` names no row of \`${owner.id}\`'s own table.`, stmt.span);
          }
          // The deflection response serves the target row under ITS
          // occurrence key, so `first time` ordinals agree across paths.
          processBody(
            rows[index].body,
            `${CHORD_OCCURRENCE_PREFIX}topic.${owner.id}.${index}`,
            this.canonicalTopic(rows[index].filter),
            depth + 1,
          );
        } else {
          // `leave` (legality already held above): the scene closes on the
          // exit boundary; an `on leaving` greeting row speaks alongside.
          const leaving = (owner.greetings ?? []).find((r) => r.head.kind === 'leaving');
          if (leaving) {
            reports.push(...this.core.statements.execStatements(leaving.body, { world, it: owner.id, ...frame }, 'all'));
          }
          leftScene = true;
        }
      }
    };

    processBody(args.body, args.occurrenceKey, args.canonicalTopic, 0);

    if (args.closesExchange && !openedAnother) directives.push({ kind: 'close-exchange' });
    if (leftScene) directives.push({ kind: 'close-scene', boundary: 'exit', leaverId: npc.id });

    // The topic arm's delivery rules, one semantics (pin filter, first
    // phrase wins, surplus phrases ride the author channel, mint rule).
    const speakerTrait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    let filtered = reports;
    if (speakerTrait) {
      filtered = reports.filter((event) => {
        if (event.type !== 'chord.phrase') return true;
        const claims = this.core.topicTables.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
        return pinAllowsClaim(speakerTrait, actorId, claims);
      });
    }
    let override: { messageId: string; params: Record<string, unknown> } | undefined;
    for (const event of filtered) {
      const payload = (event.data ?? {}) as Record<string, unknown>;
      if (event.type === 'chord.phrase' && !override) {
        override = { messageId: String(payload.messageId), params: (payload.params as Record<string, unknown>) ?? {} };
      } else {
        authorEvents.push(event);
      }
    }
    if (speakerTrait && override) {
      const claims = this.core.topicTables.claimsFor(override.messageId);
      if (claims) {
        for (const e of recordClaimDelivery(speakerTrait, npc.id, actorId, claims, this.core.dialogueTurn(world))) {
          authorEvents.push(e);
        }
      }
    }
    // A served delivery is a conversation in progress (ADR-310 D16).
    if (speakerTrait) markConversationTurn(speakerTrait, actorId, this.core.dialogueTurn(world));

    // Manner coloring on the wire (D5; rendering is Phase 9's).
    const wireEvents: SceneWireEvent[] = [];
    if (scene && override) {
      const beat = selectMannerBeat(world, npc.id, owner.manner ?? [], mannerCondition);
      wireEvents.push({
        kind: 'utterance',
        sceneId: scene.id,
        speakerId: npc.id,
        addresseeId: actorId,
        messageId: override.messageId,
        beats: beat ? [beat.beatKey] : [],
      });
    }

    if (args.canonicalTopic !== undefined && override) {
      this.recordDiscussedPair(memory, npc.id, actorId, args.discussTopics ?? [args.canonicalTopic]);
    }

    return {
      handled: true,
      ...(override ? { messageId: override.messageId, params: override.params } : {}),
      ...(authorEvents.length ? { authorEvents } : {}),
      ...(directives.length ? { sceneDirectives: directives } : {}),
      ...(wireEvents.length ? { wireEvents } : {}),
    };
  }

  /**
   * The D15 dialogue registration serving compiled Chord conversation
   * blocks (ADR-320 Phase 7 design §4) — the socket's first production
   * registrant. The probe is pure (D16: validation-time); `select` is the
   * mutating report-phase servant for exchange answers and boundary
   * (greeting) rows, returning undefined wherever the topic table or the
   * action default should stand (never a crash, never a silent swallow).
   */
  buildDialogueRegistration(): DialogueSelectorRegistration {
    const runtime = this;
    return {
      exchangeClaims: (npc, intent, ctx): boolean => {
        const owner = runtime.irOwnerOf(npc.id);
        if (!owner) return false;
        const open = runtime.openExchangeOf(owner, ctx.scene);
        if (!open) return false;
        return runtime.matchExchangeRow(open.exchange, intent) >= 0;
      },

      threadClaims: (npc, intent, ctx): boolean => runtime.core.threads.probeThreadClaims(npc, intent, ctx),

      select: (npc, intent, ctx): DialogueSelectionResult | undefined => {
        const world = ctx.world;
        const actorId = ctx.speakerId;
        const owner = runtime.irOwnerOf(npc.id);
        if (!owner) return undefined;
        const memory = createTraitMemoryAccess(world);
        const open = runtime.openExchangeOf(owner, ctx.scene);
        const grippedRow = open ? runtime.matchExchangeRow(open.exchange, intent) : -1;

        // Every ask with a topic counts, matched or not (design §5) — on
        // both modeled sides; the access ignores unmodeled holders. The
        // topic arm's postValidate bumps matched table asks (the count
        // must precede the mutations pass that decides `asked` words);
        // this covers the paths the arm cannot: gripped firings (the
        // interceptor phases are skipped) and unmatched asks.
        if (intent.type === 'ask') {
          const tableMatched =
            runtime.matchTopicFilters((owner.topics ?? []).map((r) => r.filter), intent) >= 0;
          if (grippedRow >= 0 || !tableMatched) {
            const topicKey = runtime.askedTopicKey(owner, intent);
            if (topicKey !== undefined) {
              recordAsked(memory, npc.id, actorId, topicKey);
              recordAsked(memory, actorId, npc.id, topicKey);
            }
          }
        }

        // 1) An open exchange claims the input outright (D16 innermost-wins).
        if (open) {
          const rowIndex = grippedRow;
          if (rowIndex < 0) return undefined; // fallthrough: the table's chance
          const row = open.exchange.rows[rowIndex];
          const answerFilter = row.head.kind === 'answer' ? row.head.filter : undefined;
          return runtime.serveConversationBody({
            world,
            owner,
            npc,
            actorId,
            scene: ctx.scene,
            memory,
            body: row.body,
            occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}exchange.${owner.id}.${open.exchange.name}.${rowIndex}`,
            ...(answerFilter !== undefined
              ? {
                  canonicalTopic: runtime.canonicalTopic(answerFilter),
                  discussTopics: runtime.topicCandidates(answerFilter),
                }
              : {}),
            closesExchange: true,
          });
        }

        // 1.5) Conversation threads (ADR-320 D14): between the exchange
        // and the boundary/table paths — active-thread advance, blocking
        // refusal, assertive protest, parked resume, and activation all
        // serve HERE; the passive transition falls through and the topic
        // arm parks as it serves.
        {
          const threadServe = runtime.core.threads.serveThreadDispatch({ world, owner, npc, intent, ctx, memory });
          if (threadServe) {
            // A thread-served ask still counts against the pair's asked
            // record when a table row also matched (the arm is skipped
            // for gripped firings; the unmatched case was recorded above).
            if (
              intent.type === 'ask' &&
              runtime.matchTopicFilters((owner.topics ?? []).map((r) => r.filter), intent) >= 0
            ) {
              const topicKey = runtime.askedTopicKey(owner, intent);
              if (topicKey !== undefined) {
                recordAsked(memory, npc.id, actorId, topicKey);
                recordAsked(memory, actorId, npc.id, topicKey);
              }
            }
            return threadServe;
          }
        }

        // 2) A scene-opening firing serves the boundary row — unless a
        // content row claims the input (content rows always win, D5).
        if (!ctx.scene && (owner.greetings ?? []).length > 0) {
          if (
            (intent.type === 'ask' || intent.type === 'tell') &&
            runtime.matchTopicFilters((owner.topics ?? []).map((r) => r.filter), intent) >= 0
          ) {
            return undefined;
          }
          const row = runtime.pickGreetingRow(owner, memory, world, npc.id, actorId);
          if (!row) return undefined;
          return runtime.serveConversationBody({
            world,
            owner,
            npc,
            actorId,
            scene: undefined,
            memory,
            body: row.body,
            occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}greeting.${owner.id}.${(owner.greetings ?? []).indexOf(row)}`,
            closesExchange: false,
          });
        }

        return undefined;
      },
    };
  }

  /**
   * The scene binding's authored-initiative hook (D7 most-specific-wins;
   * Phase 7 design §3): compiled `define initiative` rows answer an
   * occasion through `authoredInitiativeFor`, refinements bound to the
   * loader's evaluator. Witnessed-act occasions carry the committed
   * action id from Phase 8's scheduling.
   */
  buildAuthoredInitiative(world: WorldModel): (participantId: string, occasion: SceneOccasion, witnessedAction?: string) => 'forces' | 'suppresses' | undefined {
    return (participantId, occasion, witnessedAction) => {
      const owner = this.irOwnerOf(participantId);
      const rows = owner?.initiative ?? [];
      if (rows.length === 0) return undefined;
      const answer = authoredInitiativeFor(
        rows,
        occasion,
        (row) => this.core.evaluator.evalCondition(row.condition!, { world, it: owner!.id }),
        witnessedAction,
      );
      return answer?.authored;
    };
  }

  /**
   * The scene binding's initiative RUNNER (ADR-320 D7; Phase 8 design §5):
   * a forcing `define initiative` row's body executes here — occurrence
   * key advanced, pin rule enforced against the occasion's principal when
   * known, first phrase becomes the seizure's spoken line (the serve-path
   * delivery rules), claims recorded on delivery. Returns undefined when
   * no forcing row answers — disposition alone never seizes a
   * content-bearing occasion.
   */
  buildInitiativeSeizure(
    world: WorldModel,
  ): (
    participantId: string,
    occasion: SceneOccasion,
    witnessedAction?: string,
    audienceId?: string,
  ) => InitiativeSeizure | undefined {
    return (participantId, occasion, witnessedAction, audienceId) => {
      const owner = this.irOwnerOf(participantId);
      const rows = owner?.initiative ?? [];
      if (!owner || rows.length === 0) return undefined;
      const answer = authoredInitiativeFor(
        rows,
        occasion,
        (row) => this.core.evaluator.evalCondition(row.condition!, { world, it: owner.id }),
        witnessedAction,
      );
      if (!answer || answer.authored !== 'forces') return undefined;

      const rowIndex = rows.indexOf(answer.row);
      return this.deliverSeizureBody(
        world,
        owner,
        participantId,
        answer.row.body,
        `${CHORD_OCCURRENCE_PREFIX}initiative.${owner.id}.${rowIndex}`,
        audienceId,
      );
    };
  }

  /**
   * Deliver one seizure-style body (ADR-320 D7/D14 — the tick-side serve
   * path, shared by the initiative runner and the thread floor turn):
   * occurrence key advanced, `then asks` extracted into the seizure's
   * `openExchange` instead of reaching the statement walker (#273 — the
   * caller opens it only against a player scene), pin rule enforced
   * against the audience when known, first phrase becomes the spoken
   * line, surplus rides the author channel, claims recorded on delivery.
   *
   * @returns The seizure-shaped delivery
   */
  deliverSeizureBody(
    world: WorldModel,
    owner: IREntity,
    participantId: string,
    body: IRStatement[],
    occurrenceKey: string,
    audienceId?: string,
  ): InitiativeSeizure {
    const occurrence = ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) + 1;
    world.setStateValue(occurrenceKey, occurrence);

    const thenOpens = body.filter(
      (s): s is Extract<IRStatement, { kind: 'then-open' }> => s.kind === 'then-open',
    );
    // GH #349: a beat served on the speaker's own turn may carry `leave`
    // exactly as one served in reply; here it is lifted out of the body
    // (the walker refuses conversation statements) and reported as
    // `leaves` for the tick caller to close the scene.
    const leaveFrame = { world, it: owner.id, ...(audienceId !== undefined ? { conversationPartnerId: audienceId } : {}) };
    const leaves = body.some((s) => {
      if (s.kind !== 'leave') return false;
      const when = (s as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      return !when || this.core.evaluator.evalCondition(when, leaveFrame);
    });
    const reports = this.core.statements.execStatements(
      body.filter((s) => s.kind !== 'hold-tongue' && s.kind !== 'then-open' && s.kind !== 'leave'),
      {
        world,
        it: owner.id,
        occurrence,
        ...(audienceId !== undefined ? { conversationPartnerId: audienceId } : {}),
      },
      'all',
    );

    let openExchange: ExchangeState | undefined;
    let openWord: string | undefined;
    for (const stmt of thenOpens) {
      const when = (stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      const frame = audienceId !== undefined ? { conversationPartnerId: audienceId } : {};
      if (when && !this.core.evaluator.evalCondition(when, { world, it: owner.id, ...frame })) continue;
      const target = (owner.exchanges ?? []).find((e) => e.name === stmt.exchange);
      if (!target) {
        throw new LoadError(`\`then ${stmt.word}\` names an unknown exchange \`${stmt.exchange}\` on \`${owner.id}\`.`, stmt.span);
      }
      const exchangeId = `${owner.id}.${target.name}`;
      openExchange = {
        exchangeId,
        speakerId: participantId,
        ...(target.strength ? { strength: target.strength } : {}),
        openedTurn: this.core.dialogueTurn(world),
        responses: this.exchangeResponses(exchangeId, target),
      };
      openWord = stmt.word;
      break; // at most one open exchange (D4) — the first applying row's wins
    }

    // The delivery rules, one semantics (pin filter, first phrase wins,
    // surplus rides the author channel, claims recorded on delivery).
    const trait = world.getEntity(participantId)?.get(TraitType.CHARACTER_MODEL) as
      | CharacterModelTrait
      | undefined;
    let filtered = reports;
    if (trait && audienceId !== undefined) {
      filtered = reports.filter((event) => {
        if (event.type !== 'chord.phrase') return true;
        const claims = this.core.topicTables.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
        return pinAllowsClaim(trait, audienceId, claims);
      });
    }
    let spoken: { messageId: string; params: Record<string, unknown> } | undefined;
    const events: ISemanticEvent[] = [];
    for (const event of filtered) {
      const payload = (event.data ?? {}) as Record<string, unknown>;
      if (event.type === 'chord.phrase' && !spoken) {
        spoken = {
          messageId: String(payload.messageId),
          params: (payload.params as Record<string, unknown>) ?? {},
        };
      } else if (event.type === 'chord.phrase') {
        // Surplus phrases ride the author channel, never the player
        // stream (the delivery rule, one semantics with the dispatch
        // path): re-typed under the `character.author.` prefix, with the
        // id carried as `surplusMessageId` — a top-level `data.messageId`
        // would re-enter prose through the ADR-097 domain-message
        // handler, which renders by that field regardless of type.
        events.push({
          ...event,
          type: 'character.author.phrase_surplus',
          data: {
            surplusMessageId: String(payload.messageId),
            params: (payload.params as Record<string, unknown>) ?? {},
          },
        });
      } else {
        events.push(event);
      }
    }
    if (trait && audienceId !== undefined && spoken) {
      const claims = this.core.topicTables.claimsFor(spoken.messageId);
      if (claims) {
        events.push(
          ...recordClaimDelivery(trait, participantId, audienceId, claims, this.core.dialogueTurn(world)),
        );
      }
    }

    return {
      events,
      ...(spoken ? { spokenMessageId: spoken.messageId, spokenParams: spoken.params } : {}),
      ...(openExchange !== undefined && openWord !== undefined ? { openExchange, openWord } : {}),
      ...(leaves ? { leaves: true } : {}),
    };
  }
}
