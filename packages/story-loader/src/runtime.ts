/**
 * runtime.ts — the Chord turn-by-turn runtime (Phase 5).
 *
 * Purpose: bind compiled behavior to a live world — `when` rules as keyed
 * event chains, entity `on`-clauses as ActionInterceptors (the §5.4
 * standard-semantics half; the CapabilityBehavior half is Phase B),
 * ordinal occurrence counters in world state, derived `dark while`
 * recomputation, and phrase emission with strategy Choice atoms and
 * hatch producers as params.
 *
 * Public interface: ChordRuntime.
 * Owner context: @sharpee/story-loader.
 *
 * Invariants:
 * - All registration is per-world and keyed/idempotent (ADR-207/208).
 * - Occurrence and RNG state live in world state only — the runtime holds
 *   no turn-scoped mutable fields, so save/restore needs no runtime hooks.
 * - Select decisions are snapshotted before the execute phase so a
 *   mutation inside an arm cannot re-route the report phase (§5.4).
 */
import type { IRActionDef, IRCondition, IRConversation, IREmitField, IREmitValue, IREntity, IRExchange, IRGreetingRow, IROnClause, IRMoveClause, IRPhrase, IRPhraseVariant, IRStatement, IRTimerClause, IRTimerDef, IRTopicRow, IRValue, StoryIR } from '@sharpee/chord';
import type { Span } from '@sharpee/chord';
import { conditionRequiresSelfBreaking, normalizeTopic, PHRASEBOOK_REGISTRY } from '@sharpee/chord';
import { phrasebookTemplateKey, type PhrasebookResolution } from '@sharpee/engine';
import { PHRASEBOOK_DATA } from './phrasebook-data.js';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice, Literal, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import {
  type ActionInterceptor,
  type CapabilityBehavior,
  type CapabilityEffect,
  type CapabilitySharedData,
  type CapabilityValidationResult,
  CharacterModelTrait,
  Direction,
  type DirectionType,
  type DispositionWord,
  IFEntity,
  type ITrait,
  type InterceptorReportResult,
  type InterceptorResult,
  type InterceptorSharedData,
  ReadableTrait,
  RoomTrait,
  darkKey,
  type TemperamentDef,
  TraitType,
  WorldModel,
  type ConversationIntent,
  type ConversationSceneState,
  type DialogueSelectionContext,
  type DialogueSelectionResult,
  type DialogueSelectorRegistration,
  type ExchangeState,
  type ResponseAffordance,
  type SceneDirective,
  type SceneOccasion,
  type SceneWireEvent,
  type InitiativeSeizure,
  sceneWith,
} from '@sharpee/world-model';
import { actorConsultationId, exitBlockedKey, exitMessageKey, hasTraversableExit, interceptorConsultingActionIds, killPlayer } from '@sharpee/stdlib';
import {
  absenceWordFor,
  activeThreadFor,
  advanceThreadBeat,
  arbitrateConfidedReveal,
  askedWordFor,
  authoredInitiativeFor,
  openThread,
  parkThread,
  readyThreadMove,
  resumeThread,
  stampThreadContinuability,
  threadContinuabilityFor,
  threadStateFor,
  boundaryKindOnOpen,
  createAuthorEvent,
  createTraitMemoryAccess,
  dialogueTurn,
  drainPressure,
  markConversationTurn,
  noteTopicMove,
  pinAllowsClaim,
  recordAsked,
  recordClaimDelivery,
  recordTopicDiscussed,
  revealConfidedTopic,
  selectMannerBeat,
  renderSilence,
  witnessActs,
  type ClaimTag,
  type ConversationMemoryAccess,
  type KindMembership,
} from '@sharpee/character';
import { Evaluator, EvalContext } from './evaluator.js';
import { DecisionLedger, type DecisionRecord } from './decisions.js';
import { LoadError } from './errors.js';
import {
  CHORD_OCCURRENCE_PREFIX,
  CHORD_STATE_PREFIX,
  CHORD_STORY_STATE_KEY,
  CHORD_TRAIT_PREFIX,
  counterKey,
  selectOccurrenceKey,
  timerKey,
  type TimerRecord,
} from './state-keys.js';
import { withLineBreaks } from './text.js';
import { stagingRenderContext } from './hatch-context.js';
import { crossingRegionId, enteringDestination, movedActorId, EVENT_TRIGGERS, REGION_EVENT_TRIGGERS } from './event-contract.js';
import { translateEventId } from './event-id-map.js';
import { aliasToActionMessageId } from './message-alias-map.js';

/**
 * Chord strategy adverb → phrase-algebra Choice selector (ADR-196).
 * The Z5 table (ADR-211 Decision 4): adverbs mirror the selectors 1:1;
 * `ordered`/`once` are retired at parse time and never reach here.
 * Exported as the single implementation (ratchet Z5) — the loader's Z2
 * snippet compile maps the same adverbs onto `SnippetEntry.selector`.
 */
export const STRATEGY_SELECTOR: Record<string, Choice['selector']> = {
  randomly: 'random',
  cycling: 'cycling',
  stopping: 'stopping',
  sticky: 'sticky',
  'first-time': 'firstTime',
};


/** Marker trait carried by entities with compiled `on` clauses. */
export class ChordBehaviorTrait implements ITrait {
  static readonly type = 'chord.behavior';
  readonly type = ChordBehaviorTrait.type;
}

/**
 * The two gerunds a topic table serves (ADR-239 D1 — one table, ask and
 * tell alike). The table rides these actions' interceptor dispatch.
 */
const TOPIC_GERUNDS = ['asking', 'telling'] as const;

/**
 * Flatten a semantic event into the interceptor effect envelope,
 * carrying its actor attribution through (D9): character-model events
 * are minted with `entities.actor` = the NPC, and the envelope's
 * re-mint would otherwise stamp the acting player over it.
 */
const toEffect = (e: ISemanticEvent): CapabilityEffect => ({
  type: e.type,
  payload: (e.data ?? {}) as Record<string, unknown>,
  ...(e.entities?.actor !== undefined ? { actor: e.entities.actor } : {}),
});

/** Hooks the runtime needs from the story (implemented by ChordStory). */
export interface RuntimeHost {
  entityId(irId: string): string | undefined;
  irIdOf(worldId: string): string | undefined;
  producers: Map<string, PhraseProducer>;
  triggerEnding(world: WorldModel, ending: StoryEndingKind, messageId?: string): ISemanticEvent;
  /**
   * Character-model story data for the topic dispatch (ADR-310/318 Phase
   * 6): authored temperament defs and the kind-membership half of the
   * story oracle. Undefined when the story declares no character blocks
   * — the dispatch then skips every character consultation.
   */
  characterStoryData?(): {
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    isKindMember: KindMembership;
  } | undefined;
}

interface ExecContext extends EvalContext {
  /** Occurrence count of the enclosing rule firing (ordinal blocks test it). */
  occurrence?: number;
  /**
   * How this pass answers routing questions (ADR-289 D1 as amended): the
   * mutations pass records, the reports pass replays, single-pass contexts
   * decide live. Absent means live.
   */
  ledger?: DecisionLedger;
  /**
   * The composing entity, for bodies whose compile-time owner is a TRAIT
   * (ADR-289 D2). One trait clause is shared IR; each composing entity needs
   * its own select counter, so the runtime — the layer that knows which
   * entity is executing — appends it to the compiler's statement id. Absent
   * for entity-owned bodies, whose id already names the owner.
   */
  owner?: string;
}

/**
 * A refusal veto from the validate partition: the fully-qualified message id
 * plus the render params its phrase stages (the strategy Choice, hatch
 * producers, slot bindings). Spread into an `InterceptorResult` /
 * `ValidationResult` / `CapabilityValidationResult` — all three carry
 * `error` + `params`, and stdlib threads `params` through to the blocked
 * render (lifecycle-engine `vetoOf`).
 */
interface RefusalVeto {
  error: string;
  params?: Record<string, unknown>;
}

/** What a scheduler tick provides (structural subset of plugin-scheduler's SchedulerContext). */
export interface SchedulerTick {
  world: WorldModel;
  turn: number;
  playerLocation?: string;
}

/** Structural mirror of plugin-scheduler's Daemon — registration-compatible. */
export interface SchedulerDaemon {
  id: string;
  name: string;
  condition?: (ctx: SchedulerTick) => boolean;
  run: (ctx: SchedulerTick) => ISemanticEvent[];
}

/** ADR-327 D5: the most nested move-arrivals one turn may fire before the runtime refuses. */
const MOVE_ARRIVAL_DEPTH_CAP = 8;

/** The containing room of an entity, or its raw location when it has none. */
function roomOfIn(world: WorldModel, id: string): string | undefined {
  return world.getContainingRoom(id)?.id ?? world.getLocation(id);
}

export class ChordRuntime {
  private eventSeq = 0;
  /** Declared score identities (Phase B): name → worth. */
  private readonly scoreWorth = new Map<string, number>();
  /** ADR-325 D3: timers by `qualified` key, in declaration order. */
  private readonly timerDefs = new Map<string, IRTimerDef>();
  /** ADR-325 D3e: expiry clauses by timer `qualified` key, with their `it`. */
  private readonly timerClauses = new Map<string, { clause: IRTimerClause; it: string | null }[]>();
  /** The engine's live turn counter (wired at engine-ready); null headless. */
  private turnProvider: (() => number) | null = null;
  /** The last scheduler tick's turn — the headless fallback for `turnNow`. */
  private lastTickTurn = 0;

  constructor(
    private readonly ir: StoryIR,
    private readonly host: RuntimeHost,
    private readonly evaluator: Evaluator,
  ) {
    for (const score of ir.scores) this.scoreWorth.set(score.name, score.worth);
    for (const t of ir.timers ?? []) this.timerDefs.set(t.qualified, t);
    for (const e of ir.entities) {
      for (const clause of e.timerClauses ?? []) {
        const list = this.timerClauses.get(clause.timer) ?? [];
        list.push({ clause, it: e.id });
        this.timerClauses.set(clause.timer, list);
      }
    }
    for (const clause of ir.story.timerClauses ?? []) {
      const list = this.timerClauses.get(clause.timer) ?? [];
      list.push({ clause, it: null });
      this.timerClauses.set(clause.timer, list);
    }
  }

  // ------------------------------------------------------------------ bind

  /** Register on/after clauses, event clauses, and derived-property chains. */
  bind(world: WorldModel): void {
    // The interceptor registry is keyed (traitType, actionId) — a second
    // registration for the same action would REPLACE the first, silently
    // disabling earlier entities' clauses. Group clauses by action and
    // register one dispatching interceptor per action that routes by the
    // action's target entity.
    const byAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause | null }>>();
    // ADR-327 D1 bare heads — consulted through the lifecycle engine's actor
    // slot, under `actorConsultationId(...)`, never under the action's own id.
    const byActorAction = new Map<string, Array<{ entity: IREntity; clause: IROnClause | null }>>();
    for (const entity of this.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        // Entity every-turn clauses are scheduler daemons, not interceptors.
        if (clause.binding === 'every-turn') return;
        // Event clauses (`after entering it`) bind to the event stream per
        // the selector contract — the ownership package's replacement for
        // floating `when` rules. A REGION owner re-homes the verb onto the
        // crossing events (ADR-236 D6): entering → region_entered, leaving
        // → region_exited.
        const trigger = this.eventTriggerFor(entity, clause);
        if (trigger) {
          this.bindEventClause(world, entity, clause, clauseIndex, trigger);
          return;
        }
        if (REGION_EVENT_TRIGGERS[clause.action]) {
          // `leaving` exists only as a region crossing reaction (D6) — on
          // any other owner it would silently never fire. Refuse at load.
          throw new LoadError(
            `\`${clause.clauseKind} the player ${clause.action}\` — \`${clause.action}\` is a region crossing reaction (ADR-236), and \`${entity.name}\` is not a region. Put the clause on the region block whose boundary it reacts to.`,
            clause.span,
          );
        }
        // ADR-327 D1: a bare head is the owner's own action, reached through
        // the lifecycle engine's actor consultation — so the OWNER carries the
        // interceptor, like any other arm. Dispatch actions consult no actor:
        // a bare head there could never fire, so refuse at load.
        if (clause.binding === 'self' && this.isDispatchAction(clause.action)) {
          throw new LoadError(
            `\`${clause.clauseKind} ${clause.action}\` in \`${entity.name}\`'s block — \`${clause.action}\` is a Chord dispatch action, which consults no actor, so a bare head could never fire. React on the thing acted on instead: \`after the player ${clause.action}\` in its block.`,
            clause.span,
          );
        }
        // D5 fail-fast (ADR-228): only bind clauses something will consult.
        if (!this.isConsultedGerund(clause.action)) {
          if (this.isDispatchAction(clause.action)) {
            // Dispatch reactions fire via fireAfterClauses (the runtime owns
            // those actions — interceptors never fire on the dispatch path),
            // so `after` is live without any registration here…
            if (clause.clauseKind === 'after') return;
            // …but an entity `on` clause has no dispatch surface at all.
            throw new LoadError(
              `\`on the player ${clause.action}\` — \`${clause.action}\` is a Chord dispatch action, and entity \`on\` clauses never fire on the dispatch path. Move the clause into a trait (\`define trait … on the player ${clause.action}\`) and compose the trait, or react with \`after the player ${clause.action}\`.`,
              clause.span,
            );
          }
          throw this.deadGerundError(clause);
        }
        this.prepareOnClauseTarget(world, entity, clause);
        // Bare heads register under the actor-consultation key (the owner
        // is consulted as the actor); explicit heads under the action's own
        // id (the owner is consulted as the target).
        const table = clause.binding === 'self' ? byActorAction : byAction;
        const list = table.get(clause.action) ?? [];
        list.push({ entity, clause });
        table.set(clause.action, list);
      });
    }
    // ADR-239: topic tables ride the asking/telling dispatch. Every table
    // owner gets an arm — with or without a catch-all clause (D5: with no
    // catch-all declared, a miss simply returns {} and the action's
    // unconditional unknown_topic/not_interested default stands).
    for (const gerund of TOPIC_GERUNDS) {
      for (const entity of this.ir.entities) {
        if (!(entity.topics ?? []).length) continue;
        const list = byAction.get(gerund) ?? [];
        if (!list.some((c) => c.entity.id === entity.id)) {
          this.prepareTopicTarget(world, entity);
          list.push({ entity, clause: null });
          byAction.set(gerund, list);
        }
      }
    }

    for (const [action, clauses] of byAction) {
      const interceptor = this.buildDispatchingInterceptor(action, clauses);
      world.registerActionInterceptor(ChordBehaviorTrait.type, `if.action.${action}`, interceptor);
    }
    for (const [action, clauses] of byActorAction) {
      const interceptor = this.buildDispatchingInterceptor(action, clauses);
      world.registerActionInterceptor(ChordBehaviorTrait.type, actorConsultationId(`if.action.${action}`), interceptor);
    }

    // `when <entity> moves` clauses (ADR-325 D3h) ride the actor-moved event.
    for (const entity of this.ir.entities) {
      (entity.moveClauses ?? []).forEach((clause, clauseIndex) => {
        const key = `chord.moves.${entity.id}.${clauseIndex}`;
        world.chainEvent(
          EVENT_TRIGGERS.entering,
          (event, w) => this.fireMoveClause(entity, clause, key, event, w as WorldModel),
          { key },
        );
      });
    }

    // Phase B: `define trait` clauses register per TRAIT TYPE — capability
    // behaviors for dispatch verbs, interceptors for standard-semantics
    // actions (§5.4 routing recorded on the IR by the analyzer).
    for (const trait of this.ir.traits) {
      const traitType = CHORD_TRAIT_PREFIX + trait.name;
      const interceptorClauses = new Map<string, IROnClause[]>();
      const capabilityActions = new Set<string>();
      for (const clause of trait.onClauses) {
        if (clause.binding === 'every-turn') continue; // scheduler phase (plan phase 5)
        if (clause.binding === 'role') {
          throw new LoadError(
            `Role-bound trait clauses (\`on ${clause.action} anything as the ${clause.role}\`) are not wired yet — the standard-action role path is post-Zoo scope.`,
            clause.span,
          );
        }
        if (clause.routing === 'capability') {
          // The capability registry is (traitType, action)-keyed and
          // last-wins: a second clause for the same dispatch action would
          // silently OVERWRITE the first. Refuse legibly (never-guess)
          // until the capability pair is wired.
          if (capabilityActions.has(clause.action)) {
            throw new LoadError(
              `Trait \`${trait.name}\` declares more than one clause for the dispatch action \`${clause.action}\` — the capability registry holds one behavior per (trait, action), so the second clause could never fire. Merge the bodies into one clause.`,
              clause.span,
            );
          }
          capabilityActions.add(clause.action);
          world.registerCapabilityBehavior(
            traitType,
            `chord.action.${clause.action}`,
            this.buildCapabilityBehavior(trait.name, clause),
          );
        } else {
          // D5 fail-fast (ADR-228): the analyzer routed this clause to the
          // interceptor path, so its gerund must name a consulted action.
          if (!this.isConsultedGerund(clause.action)) throw this.deadGerundError(clause);
          const list = interceptorClauses.get(clause.action) ?? [];
          list.push(clause);
          interceptorClauses.set(clause.action, list);
        }
      }
      // One MERGED interceptor per (trait, action) — the D3 `on`/`after`
      // pair both fire (the idempotent registry would otherwise keep only
      // the last-registered clause, silently).
      for (const [action, actionClauses] of interceptorClauses) {
        world.registerActionInterceptor(
          traitType,
          `if.action.${action}`,
          this.mergeArms(actionClauses.map((clause, index) =>
            this.buildTraitInterceptor(clause, `${trait.name}.${action}.${clause.clauseKind}.${index}`),
          )),
        );
      }
    }

    // Derived properties (`dark while`, blocked exits) — ADR-240: registered
    // as live evaluators consulted at point of use. Nothing is stamped and
    // nothing recomputes: mutations are instant, every reader sees current
    // truth (the former eleven-event recompute trigger list is gone).
    this.registerDerivedEvaluators(world);

    // Phrasebooks (ADR-250 D4): one evaluator per book-covered key the
    // story does not define — same ADR-240 seam, resolved at render time.
    this.registerPhrasebookEvaluators(world);

    // Message overrides (ADR-255 D6): standard-action message baselines,
    // registered on the same seam so they beat the platform default but lose
    // to per-entity/on-clause message ids.
    this.registerMessageOverrideEvaluators(world);
  }

  /** Resolved books cache (built once per runtime — see resolvedBooks). */
  private books: Array<{ name: string; condition: IRCondition | null; entries: Record<string, IRPhrase> }> | null = null;

  /**
   * The story's phrasebooks in arbitration order, entries resolved:
   * `define`d books carry their entries in the IR; `use`d books resolve
   * from the packaged-data registry with manifest-key conformance (ADR-250
   * D3 — LoadError on a missing book or a key mismatch), plus the D1 key
   * rules the story compiler never saw the packaged data pass through.
   */
  private resolvedBooks(): Array<{ name: string; condition: IRCondition | null; entries: Record<string, IRPhrase> }> {
    if (this.books) return this.books;
    this.books = this.ir.phrasebooks.map((book) => {
      if (book.source === 'define') {
        return { name: book.name, condition: book.condition ?? null, entries: book.entries ?? {} };
      }
      const data = PHRASEBOOK_DATA.get(book.name);
      if (!data) {
        throw new LoadError(`Phrasebook \`${book.name}\` is not in the load-time data registry — the compile-time manifest knows the name, the runtime has no entries for it.`);
      }
      const manifestKeys = [...(PHRASEBOOK_REGISTRY.get(book.name)?.keys ?? [])].sort();
      const dataKeys = Object.keys(data.entries).sort();
      if (manifestKeys.join('\u0000') !== dataKeys.join('\u0000')) {
        throw new LoadError(`Phrasebook \`${book.name}\`: manifest keys [${manifestKeys.join(', ')}] and data keys [${dataKeys.join(', ')}] disagree.`);
      }
      for (const key of dataKeys) {
        if (key.includes('.')) {
          throw new LoadError(`Phrasebook \`${book.name}\`: \`${key}\` is a dotted platform ID — books voice story keys only (ADR-250 D1).`);
        }
      }
      return { name: book.name, condition: book.condition ?? null, entries: data.entries };
    });
    return this.books;
  }

  /** Book entries covering a key, in arbitration order (emit-time staging). */
  private bookEntriesFor(key: string): IRPhrase[] {
    return this.resolvedBooks().flatMap((b) => (b.entries[key] ? [b.entries[key]] : []));
  }

  /**
   * ADR-250 D4.2: register ONE evaluator per key that some book covers and
   * the story does NOT define — story-beats-book is decided here,
   * statically, so a story-defined key never pays predicate evaluation.
   * The key convention (`phrasebook.template.<key>`) is built by the
   * engine's read point (`phrasebookTemplateKey`) and here — nowhere else.
   */
  private registerPhrasebookEvaluators(world: WorldModel): void {
    const books = this.resolvedBooks();
    if (books.length === 0) return;
    const storyTable = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const covered = new Set<string>();
    for (const book of books) {
      for (const key of Object.keys(book.entries)) {
        if (!storyTable[key]) covered.add(key);
      }
    }
    for (const key of covered) {
      world.registerEvaluator(phrasebookTemplateKey(key), (w) => this.resolvePhrasebook(key, w as WorldModel));
    }
  }

  /**
   * The evaluator body: first book in declaration order whose predicate
   * holds AND that covers the key supplies it (ADR-245 D3 arbitration).
   * Derivation mirrors registered phrases — verbatim/single/multi-variant
   * templates and a Choice atom keyed `phrasebook.<book>` / key so
   * cycling/first-time/sticky counters stay per (book, key) (ADR-250 D5)
   * — keeping every Chord IR shape loader-side (ADR-210 direction rule).
   */
  private resolvePhrasebook(key: string, world: WorldModel): PhrasebookResolution | undefined {
    for (const book of this.resolvedBooks()) {
      const entry = book.entries[key];
      if (!entry) continue;
      if (book.condition && !this.evaluator.evalCondition(book.condition, { world })) continue;
      const { template, params } = this.derivePhraseTemplate(entry, `phrasebook.${book.name}`, key);
      return { book: book.name, key, template, ...(Object.keys(params).length > 0 ? { params } : {}) };
    }
    return undefined;
  }

  /**
   * Derive the render-time template + bound params for an IR phrase body,
   * shared by phrasebook resolution and ADR-255 message overrides: a verbatim
   * or single-variant phrase becomes its literal template; a strategy/multi
   * phrase becomes `{variants}` plus a Choice atom keyed by (counterEntityId,
   * messageKey) so cycling/first-time/sticky counters stay per source+key.
   */
  private derivePhraseTemplate(
    entry: IRPhrase,
    counterEntityId: string,
    messageKey: string,
  ): { template: string; params: Record<string, unknown> } {
    const params: Record<string, unknown> = {};
    let template: string;
    if (entry.verbatim) {
      template = '{verbatim:text}';
      params.text = entry.variants[0]?.text ?? '';
    } else if (entry.strategy === null && entry.variants.length === 1) {
      template = withLineBreaks(entry.variants[0].text);
    } else {
      template = '{variants}';
      if (entry.strategy) {
        const choice: Choice = {
          kind: 'choice',
          alternatives: entry.variants.map((v): Literal => ({ kind: 'literal', text: withLineBreaks(v.text) })),
          selector: STRATEGY_SELECTOR[entry.strategy],
          entityId: counterEntityId,
          messageKey,
        };
        params.variants = choice;
      }
    }
    return { template, params };
  }

  /**
   * ADR-255 D6: register one evaluator per overridden standard-action message,
   * on the SAME phrasebook resolution seam (`phrasebook.template.<id>`) the
   * engine consults before the platform default — so an `override message`
   * sets the story-wide baseline (with full strategy/cycling parity) while a
   * per-entity phrase or on-clause refusal, which emit their own message ids,
   * still win. The alias is resolved to its dotted `if.action.*` id here, on
   * the loader side (Interface Contract 3); the alias never reaches the engine.
   */
  private registerMessageOverrideEvaluators(world: WorldModel): void {
    const table = this.ir.messageOverrides.locales[this.ir.messageOverrides.defaultLocale] ?? {};
    for (const [alias, entry] of Object.entries(table)) {
      const messageId = aliasToActionMessageId(alias);
      if (!messageId) continue; // analyzer already rejected unknown aliases
      world.registerEvaluator(phrasebookTemplateKey(messageId), () => {
        if (entry.condition && !this.evaluator.evalCondition(entry.condition, { world })) return undefined;
        const { template, params } = this.derivePhraseTemplate(entry, 'message-override', messageId);
        return { book: 'message-override', key: messageId, template, ...(Object.keys(params).length > 0 ? { params } : {}) };
      });
    }
  }

  /**
   * ADR-240 D2/D3: register every derived property as a named world-evaluator.
   * `dark while` rooms register on `dark.<roomId>`; EVERY blocked exit —
   * conditional or not (a constant-true predicate) — registers on
   * `exit.blocked.<roomId>.<direction>`, with its refusal message on
   * `exit.message.*` resolved AT REFUSAL TIME (phrase strategies vary per
   * attempt). Registration is idempotent per world; re-binding re-registers.
   */
  private registerDerivedEvaluators(world: WorldModel): void {
    for (const { entity, condition } of this.derivedDarkRooms()) {
      const worldId = this.host.entityId(entity.id);
      if (!worldId) continue;
      world.registerEvaluator(darkKey(worldId), (w) =>
        this.evaluator.evalCondition(condition, { world: w as WorldModel }),
      );
    }

    for (const irEntity of this.ir.entities) {
      if (irEntity.blockedExits.length === 0) continue;
      const worldId = this.host.entityId(irEntity.id);
      if (!worldId) continue;
      // GH #315: the evaluator registry is one-value-per-key (idempotent
      // last-wins, ADR-240 D6), so a direction's N blocked lines must compose
      // into ONE registration per key — registering per line silently kept
      // only the last. Group by direction, declaration order preserved.
      const byDirection = new Map<DirectionType, typeof irEntity.blockedExits>();
      for (const blocked of irEntity.blockedExits) {
        const direction = (Direction as Record<string, DirectionType>)[blocked.direction.toUpperCase()];
        if (!direction) continue;
        const group = byDirection.get(direction);
        if (group) group.push(blocked);
        else byDirection.set(direction, [blocked]);
      }
      for (const [direction, arms] of byDirection) {
        // One arm selection per (room, direction): first line in declaration
        // order whose condition holds; a condition-less line is the always-true
        // fallback (the mergeArms idiom). Both keys below are views of this one
        // selection, so the blocked boolean and the refusal phrase cannot drift.
        const selectArm = (w: WorldModel) =>
          arms.find(
            (arm) => !arm.condition || this.evaluator.evalCondition(arm.condition, { world: w, it: irEntity.id }),
          );
        world.registerEvaluator(
          exitBlockedKey(worldId, direction),
          (w) => selectArm(w as WorldModel) !== undefined,
        );
        world.registerEvaluator(exitMessageKey(worldId, direction), (w) => {
          const arm = selectArm(w as WorldModel) ?? arms[0];
          return this.blockedPhraseText(arm.phraseKey, w as WorldModel);
        });
      }
    }
  }

  // ------------------------------------------------------- D5 fail-fast

  /**
   * True when an interceptor registered under `if.action.<gerund>` can ever
   * fire: a wired stdlib action consults the id (the ADR-228 D5 registry,
   * derived from the descriptor table), or the gerund names a `define
   * action X from` hatch — an author-owned TS Action the loader can't see
   * inside, which may consult its own id.
   * @param gerund the clause's action word (e.g. `taking`)
   */
  private isConsultedGerund(gerund: string): boolean {
    if (interceptorConsultingActionIds.has(`if.action.${gerund}`)) return true;
    return this.ir.hatches.some((h) => h.hatchKind === 'action' && h.name === gerund);
  }

  /** True when the gerund names a `define action` dispatch action. */
  private isDispatchAction(gerund: string): boolean {
    return this.ir.actions.some((a) => a.name === gerund);
  }

  /**
   * Load-time diagnostic for a clause whose gerund nothing will ever
   * consult (ADR-228 D5): a typo or an unimplemented action word would
   * otherwise register and silently die. lowering/raising get the pointed
   * capability-dispatch message (they are full-delegation by design).
   * @param clause the dead clause (its span anchors the diagnostic)
   */
  private deadGerundError(clause: IROnClause): LoadError {
    const phrase = `${clause.clauseKind} ${clause.action} it`;
    if (clause.action === 'lowering' || clause.action === 'raising') {
      return new LoadError(
        `\`${phrase}\` — \`${clause.action}\` is a full-delegation capability action by design (ADR-118): the standard action never consults interceptors. Use a capability behavior or a Chord dispatch action (\`define action ${clause.action}\`) instead.`,
        clause.span,
      );
    }
    return new LoadError(
      `\`${phrase}\` — no standard action consults \`if.action.${clause.action}\`, so this clause would never fire. Check the action word's spelling, or create the verb with \`define action ${clause.action}\`.`,
      clause.span,
    );
  }

  // ---------------------------------------------------------- event clauses

  /**
   * Bind an event clause (`after entering it` on a room or region) to its
   * trigger event per the selector contract — the ownership package's
   * replacement for floating `when` rules: the same firing semantics,
   * owned by the entity the event is about.
   */
  private bindEventClause(world: WorldModel, entity: IREntity, clause: IROnClause, clauseIndex: number, trigger: string): void {
    const key = `chord.clause.${entity.id}.${clause.action}.${clauseIndex}`;
    world.chainEvent(
      trigger,
      (event, w) => this.fireEventClause(entity, clause, key, event, w as WorldModel),
      { key },
    );
  }

  /** The clause's trigger event type by owner kind, or undefined for non-event clauses. */
  private eventTriggerFor(entity: IREntity, clause: IROnClause): string | undefined {
    const isRegionOwner = entity.kinds.some((k) => k.name === 'region');
    return isRegionOwner ? REGION_EVENT_TRIGGERS[clause.action] : EVENT_TRIGGERS[clause.action];
  }

  /** Test/debug entry: run every event clause bound to this event type. */
  fireEventClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    for (const entity of this.ir.entities) {
      entity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding === 'every-turn' || this.eventTriggerFor(entity, clause) !== event.type) return;
        const key = `chord.clause.${entity.id}.${clause.action}.${clauseIndex}`;
        const produced = this.fireEventClause(entity, clause, key, event, world);
        if (produced) out.push(...produced);
      });
    }
    return out;
  }

  private fireEventClause(
    entity: IREntity,
    clause: IROnClause,
    key: string,
    event: ISemanticEvent,
    world: WorldModel,
  ): ISemanticEvent[] | null {
    // The clause is about its owner. Region owners (ADR-236 D6): the
    // crossing event names which boundary was crossed — fire only for this
    // region's own boundary (the emitter's getRegionCrossings already made
    // parent reactions crossing-accurate; no transitive widening here).
    if (entity.kinds.some((k) => k.name === 'region')) {
      if (crossingRegionId(event.data) !== this.host.entityId(entity.id)) return null;
    } else if (clause.action === 'entering' && enteringDestination(event.data) !== this.host.entityId(entity.id)) {
      // Room/enterable owners: `after the player entering` fires when the
      // movement's destination IS the owner — read through the AC-9 payload
      // guard, never a blind cast (the stdlib event is a foreign surface).
      return null;
    }
    // ADR-327 D1: the head names who arrives — the event's actor (the
    // walker, or the `move`d entity under D5) must be the head's actor.
    if (!this.actorMatches(clause.actor, movedActorId(event), world)) return null;

    const ctx: ExecContext = { world, it: entity.id };
    if (clause.condition && !this.evaluator.evalCondition(clause.condition, ctx)) return null;

    const occKey = CHORD_OCCURRENCE_PREFIX + key;
    const occurrence = ((world.getStateValue(occKey) as number | undefined) ?? 0) + 1;
    if (clause.once && occurrence > 1) return null; // `, once` — one lifetime firing (D5)
    world.setStateValue(occKey, occurrence);
    ctx.occurrence = occurrence;

    // Single pass — routing decided live, nothing recorded (ADR-289 D1).
    return this.execStatements(clause.body, ctx);
  }

  // ---------------------------------------------------------- move clauses

  /** Test/debug entry: run every `when <entity> moves` clause for this event. */
  fireMoveClauses(world: WorldModel, event: ISemanticEvent): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    if (event.type !== EVENT_TRIGGERS.entering) return out;
    for (const entity of this.ir.entities) {
      (entity.moveClauses ?? []).forEach((clause, clauseIndex) => {
        const produced = this.fireMoveClause(entity, clause, `chord.moves.${entity.id}.${clauseIndex}`, event, world);
        if (produced) out.push(...produced);
      });
    }
    return out;
  }

  /**
   * ADR-327 D1: does this actor satisfy a clause head? `the player` is the
   * ROLE — compared against `world.getPlayer()` at fire time, never cached,
   * so a head follows a PC switch (ADR-132/D9); a named actor is its world
   * entity. A null head (bare / every-turn) is gated by its own path.
   * @param actor the IR head actor, or null
   * @param actorId the acting entity's world id, if the path knows one
   * @param world the live world (for the player role)
   */
  actorMatches(actor: IRValue | null, actorId: string | undefined, world: WorldModel): boolean {
    if (actor === null) return true;
    if (actorId === undefined) return false;
    if (actor.kind === 'player') return actorId === world.getPlayer()?.id;
    if (actor.kind === 'entity') return actorId === this.host.entityId(actor.id);
    return false;
  }

  /**
   * `when <entity> moves [, while <cond>]` (ADR-325 D3h): fires when the
   * actor-moved event's actor is the mover's world entity — the completed
   * move only (a refused go emits no actor-moved event). `it` is the owner.
   */
  private fireMoveClause(
    entity: IREntity,
    clause: IRMoveClause,
    key: string,
    event: ISemanticEvent,
    world: WorldModel,
  ): ISemanticEvent[] | null {
    const moverId = clause.mover.kind === 'player'
      ? world.getPlayer()?.id
      : clause.mover.kind === 'entity' ? this.host.entityId(clause.mover.id) : undefined;
    if (!moverId || movedActorId(event) !== moverId) return null;

    const ctx: ExecContext = { world, it: entity.id };
    if (clause.condition && !this.evaluator.evalCondition(clause.condition, ctx)) return null;

    const occKey = CHORD_OCCURRENCE_PREFIX + key;
    const occurrence = ((world.getStateValue(occKey) as number | undefined) ?? 0) + 1;
    world.setStateValue(occKey, occurrence);
    ctx.occurrence = occurrence;
    return this.execStatements(clause.body, ctx);
  }

  // ------------------------------------------------------------ on-clauses

  /**
   * Does the player's own block carry clauses that need the player entity
   * marked for interceptor resolution (ADR-327 D1 bare heads, or heads on
   * the player as target)? The loader consults this at `createPlayer`,
   * which may run before or after `bind` depending on the host's order.
   */
  playerCarriesClauses(): boolean {
    const player = this.ir.entities.find((e) => e.isPlayer);
    return !!player && player.onClauses.some((c) => c.binding !== 'every-turn' && !this.eventTriggerFor(player, c));
  }

  /** Mark the clause's target entity so interceptor resolution finds it. */
  private prepareOnClauseTarget(world: WorldModel, entity: IREntity, clause: IROnClause): void {
    const worldId = this.host.entityId(entity.id);
    // The player is created by the host on its own schedule — in the direct/
    // test order after the world is built, so it has no instance at bind
    // time. `createPlayer` marks it instead (`playerCarriesClauses`).
    if (!worldId && entity.isPlayer) return;
    if (!worldId) throw new LoadError(`Entity \`${entity.id}\` has no world instance.`, clause.span);
    const target = world.getEntity(worldId);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, clause.span);

    if (!target.has(ChordBehaviorTrait.type)) {
      target.add(new ChordBehaviorTrait());
    }
    // `on the player reading` targets must satisfy the reading action's
    // trait gate (a bare-head owner is the reader, not the text — untouched).
    if (clause.action === 'reading' && clause.binding !== 'self' && !target.has(TraitType.READABLE)) {
      target.add(new ReadableTrait({ text: '' }));
    }
  }

  /** Mark a topic-table owner so interceptor resolution finds it (no clause needed). */
  private prepareTopicTarget(world: WorldModel, entity: IREntity): void {
    const worldId = this.host.entityId(entity.id);
    if (!worldId) throw new LoadError(`Entity \`${entity.id}\` has no world instance.`, entity.span);
    const target = world.getEntity(worldId);
    if (!target) throw new LoadError(`Entity \`${entity.id}\` vanished before binding.`, entity.span);
    if (!target.has(ChordBehaviorTrait.type)) {
      target.add(new ChordBehaviorTrait());
    }
  }

  /**
   * Per-clause consultation state. Two live arms on one owner (ratchet D3's
   * `on` + `after` pair) share ONE InterceptorSharedData bag per firing —
   * each clause keeps its skip/occurrence/decision state in its own
   * namespaced sub-bag so the arms never clobber each other.
   */
  private clauseBag(data: InterceptorSharedData, ns: string): Record<string, unknown> {
    const key = `chord.arm.${ns}`;
    let bag = data[key] as Record<string, unknown> | undefined;
    if (!bag) {
      bag = {};
      data[key] = bag;
    }
    return bag;
  }

  /**
   * Merge one owner's clause interceptors into a single arm, in declaration
   * order (the ratchet D3 contract, previously broken by first-match arm
   * routing — an `on`/`after` pair on the same owner+gerund silently
   * shadowed the second clause): the first refusal wins preValidate; every
   * arm's postValidate/postExecute runs (own namespaced state); postReport
   * merges — the first `on` override wins (only `on` clauses override),
   * every arm's emits APPEND (the `after` half of D3).
   */
  private mergeArms(arms: ActionInterceptor[]): ActionInterceptor {
    if (arms.length === 1) return arms[0];
    return {
      preValidate(target, world, actorId, data): InterceptorResult | null {
        for (const arm of arms) {
          const veto = arm.preValidate?.(target, world, actorId, data);
          if (veto) return veto;
        }
        return null;
      },
      postValidate(target, world, actorId, data): InterceptorResult | null {
        for (const arm of arms) arm.postValidate?.(target, world, actorId, data);
        return null;
      },
      postExecute(target, world, actorId, data): void {
        for (const arm of arms) arm.postExecute?.(target, world, actorId, data);
      },
      postReport(target, world, actorId, data): InterceptorReportResult {
        const merged: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const arm of arms) {
          const result = arm.postReport?.(target, world, actorId, data) ?? {};
          if (result.override && !merged.override) merged.override = result.override;
          if (result.emit) emit.push(...result.emit);
        }
        if (emit.length) merged.emit = emit;
        return merged;
      },
    };
  }

  /**
   * One interceptor per action: each hook forwards to the arm whose entity
   * is the action's target. An owner's arm is the D3-merged composite of
   * ALL its clauses for this action (each clause keeps its own namespaced
   * occurrence keys and decision snapshots). On the topic gerunds
   * (asking/telling, ADR-239) a table owner's arm consults its declared
   * topic table first; the merged clause composite serves as the
   * catch-all, firing only on a table miss (D5).
   */
  private buildDispatchingInterceptor(action: string, clauses: Array<{ entity: IREntity; clause: IROnClause | null }>): ActionInterceptor {
    const runtime = this;
    const isTopicAction = (TOPIC_GERUNDS as readonly string[]).includes(action);
    const byEntity = new Map<string, { entity: IREntity; entityClauses: IROnClause[] }>();
    for (const { entity, clause } of clauses) {
      const group = byEntity.get(entity.id) ?? { entity, entityClauses: [] };
      if (clause) group.entityClauses.push(clause);
      byEntity.set(entity.id, group);
    }
    const arms = [...byEntity.values()].map(({ entity, entityClauses }) => {
      const built = entityClauses.map((clause, index) =>
        this.buildInterceptor(entity, clause, `${entity.id}.${action}.${clause.clauseKind}.${index}`),
      );
      const catchAll = built.length ? this.mergeArms(built) : undefined;
      const interceptor = isTopicAction && (entity.topics ?? []).length
        ? this.buildTopicArm(entity, catchAll, action)
        : catchAll ?? {};
      return { entity, interceptor };
    });
    // The consulted entity IS the arm's owner — as the action's target
    // (explicit heads) or as the actor (ADR-327 D1 bare heads, reached
    // through the lifecycle engine's actor consultation). Each clause then
    // gates on who acts.
    const armFor = (target: IFEntity): ActionInterceptor | undefined =>
      arms.find((a) => runtime.host.entityId(a.entity.id) === target.id)?.interceptor;

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        return armFor(target)?.preValidate?.(target, world, actorId, data) ?? null;
      },
      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        return armFor(target)?.postValidate?.(target, world, actorId, data) ?? null;
      },
      postExecute(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): void {
        armFor(target)?.postExecute?.(target, world, actorId, data);
      },
      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        return armFor(target)?.postReport?.(target, world, actorId, data) ?? {};
      },
    };
  }

  /**
   * Compile one `on`/`after` clause to an ActionInterceptor via the §5.4
   * partition: leading refusals → preValidate (`on` only — `after` reacts
   * and cannot refuse, ratchet D3); mutations → postExecute; phrase/emit/
   * win/lose → postReport. An `on` clause's first phrase OVERRIDES the
   * primary message; an `after` clause's phrases APPEND (D3).
   */
  private buildInterceptor(entity: IREntity, clause: IROnClause, ns: string): ActionInterceptor {
    const runtime = this;
    // ADR-327 D1: the hook's target is always the owner — consulted as the
    // action's object (explicit head: fire when the head's actor is acting)
    // or as the actor itself (bare head: fire when the owner is the actor).
    const isMine = (target: IFEntity, world: WorldModel, actorId: string): boolean =>
      target.id === runtime.host.entityId(entity.id) &&
      (clause.binding === 'self' ? actorId === target.id : runtime.actorMatches(clause.actor, actorId, world));
    const occurrenceKey = CHORD_OCCURRENCE_PREFIX + `on.${ns}`;

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (!isMine(target, world, actorId) || clause.clauseKind === 'after') return null;
        const bag = runtime.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: entity.id };
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. preValidate and postValidate may both
        // evaluate the gate: no mutation occurs between them within one
        // action, so the answers cannot differ. Do not move this evaluation.
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) >= 1) {
          bag.skip = true;
          return null;
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, ...refusal } : null;
      },

      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (!isMine(target, world, actorId)) return null;
        const bag = runtime.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: entity.id };
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true; // `while <cond>` gate — clause sits out this firing
          return null;
        }
        const occurrence = ((world.getStateValue(occurrenceKey) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          bag.skip = true; // `, once` — one lifetime firing (D5)
          return null;
        }
        world.setStateValue(occurrenceKey, occurrence);
        ctx.occurrence = occurrence;
        bag.occurrence = occurrence;
        return null;
      },

      postExecute(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): void {
        const bag = runtime.clauseBag(data, ns);
        if (!isMine(target, world, actorId) || bag.skip === true) return;
        const ctx = runtime.restoreCtx(world, entity.id, bag, 'mutations');
        runtime.execStatements(clause.body, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        const bag = runtime.clauseBag(data, ns);
        if (!isMine(target, world, actorId) || bag.skip === true) return {};
        const ctx = runtime.restoreCtx(world, entity.id, bag, 'reports');
        const reports = runtime.execStatements(clause.body, ctx, 'reports');

        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          if (clause.clauseKind === 'on' && event.type === 'chord.phrase' && !result.override) {
            result.override = {
              messageId: String(payload.messageId),
              params: (payload.params as Record<string, unknown>) ?? {},
            };
          } else {
            emit.push(toEffect(event));
          }
        }
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  /**
   * Rebuild the exec context for one pass of a two-pass clause body.
   *
   * @param phase `'mutations'` opens a fresh record in the bag and decides
   *   into it; `'reports'` replays that record; omitted decides live.
   */
  private restoreCtx(
    world: WorldModel,
    itIrId: string,
    bag: Record<string, unknown>,
    phase?: 'mutations' | 'reports',
  ): ExecContext {
    return {
      world,
      it: itIrId,
      occurrence: bag.occurrence as number | undefined,
      ledger: this.ledgerFor(bag, 'decisions', phase),
    };
  }

  /**
   * The ledger for one pass, backed by `slot` on the caller's shared bag.
   *
   * The mutations pass installs a fresh record BEFORE executing (the Map is
   * shared by reference, so it fills as the walk proceeds) and the reports
   * pass reads that same record back. Anything else decides live.
   */
  private ledgerFor(
    bag: Record<string, unknown>,
    slot: string,
    phase?: 'mutations' | 'reports',
  ): DecisionLedger {
    if (phase === 'mutations') {
      const entries: DecisionRecord = new Map();
      bag[slot] = entries;
      return DecisionLedger.recording(entries);
    }
    if (phase === 'reports') {
      return DecisionLedger.replaying(bag[slot] as DecisionRecord | undefined);
    }
    return DecisionLedger.live();
  }

  // ------------------------------------------------- topic tables (ADR-239)

  /** Lazily built phrase-key → claims-tag map (ADR-318 D9). */
  private phraseClaims?: Map<string, ClaimTag>;

  /** The claims tag a phrase key carries, if any (ADR-318 D9). */
  private claimsFor(phraseKey: string): ClaimTag | undefined {
    if (!this.phraseClaims) {
      this.phraseClaims = new Map();
      const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
      for (const [key, phrase] of Object.entries(table)) {
        if (phrase.claims) this.phraseClaims.set(key, { ...phrase.claims });
      }
    }
    return this.phraseClaims.get(phraseKey);
  }

  /**
   * The turn the player is acting in, for dialogue-path bookkeeping —
   * delegates to the character clock seam's mirror read.
   */
  private dialogueTurn(world: WorldModel): number {
    return dialogueTurn(world);
  }

  /**
   * The D12a witnessed-topic alias for (actor, act), when the story
   * declares one (`define topic <actor> <act> as <alias>`); otherwise
   * the deterministic derived name stands.
   */
  private witnessedAliasFor(actorIrId: string | undefined, act: string, derived: string): string {
    if (!actorIrId) return derived;
    const alias = (this.ir.witnessedTopics ?? []).find((w) => w.actor === actorIrId && w.act === act);
    return alias?.alias ?? derived;
  }

  // ------------------- Chord dialogue registration (ADR-320 Phase 7, D15)

  /** IR entities by id, for dialogue lookups (built lazily, IR is immutable). */
  private irEntityIndex?: Map<string, IREntity>;

  /** The IR entity a live NPC compiled from, if any. */
  private irOwnerOf(worldId: string): IREntity | undefined {
    if (!this.irEntityIndex) {
      this.irEntityIndex = new Map(this.ir.entities.map((e) => [e.id, e]));
    }
    const irId = this.host.irIdOf(worldId);
    return irId === undefined ? undefined : this.irEntityIndex.get(irId);
  }

  /**
   * The canonical per-pair topic key of a row filter (ADR-320 Phase 7
   * design §5): entity rows key by IR id (stable across saves), text rows
   * by the normalized primary. Recorders and predicate reads share this
   * one keying so `asked`/`discussed` always find their counts.
   */
  private canonicalTopic(filter: { kind: 'entity'; id: string } | { kind: 'text'; primary: string }): string {
    return filter.kind === 'entity' ? filter.id : normalizeTopic(filter.primary);
  }

  /** Every canonical key a row filter answers to (primary first, then aliases). */
  private topicCandidates(
    filter: { kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] },
  ): string[] {
    return filter.kind === 'entity'
      ? [filter.id]
      : [normalizeTopic(filter.primary), ...filter.aliases.map(normalizeTopic)];
  }

  /**
   * Match an intent against row filters — entity tier first (quiet
   * `topicEntityId` resolution), then normalized free-text tier: the
   * topic arm's rule, shared by exchange answer rows. Null slots (act and
   * silence rows) never match typed input.
   *
   * @returns The matched index, or -1
   */
  private matchTopicFilters(
    filters: Array<{ kind: 'entity'; id: string } | { kind: 'text'; primary: string; aliases: string[] } | null>,
    intent: ConversationIntent,
  ): number {
    const askedEntity = intent.topicEntityId ?? null;
    const askedText = intent.text !== undefined ? normalizeTopic(intent.text) : null;
    if (askedEntity !== null) {
      const index = filters.findIndex((f) => f?.kind === 'entity' && this.host.entityId(f.id) === askedEntity);
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
  private exchangeResponses(exchangeId: string, exchange: IRExchange): ResponseAffordance[] {
    const responses: ResponseAffordance[] = [];
    let hasSilence = false;
    exchange.rows.forEach((row, index) => {
      const rowId = `${exchangeId}#${index}`;
      if (row.head.kind === 'answer') {
        const filter = row.head.filter;
        const topic =
          filter.kind === 'entity'
            ? { kind: 'entity' as const, id: this.host.entityId(filter.id) ?? filter.id }
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
    const absence = absenceWordFor(this.dialogueTurn(world), pair?.lastSceneClosedTurn);
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
    if (intent.topicEntityId !== undefined) return this.host.irIdOf(intent.topicEntityId);
    const text = intent.text !== undefined ? normalizeTopic(intent.text) : '';
    return text !== '' ? text : undefined;
  }

  /** Record a served topic as discussed on both modeled sides (history — post-delivery). */
  private recordDiscussedPair(
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
  private stampSceneThread(world: WorldModel, npcWorldId: string, actorId: string, topic: string): void {
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
  private serveConversationBody(args: {
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
      !condition || this.evaluator.evalCondition(condition, { world, it: owner.id, ...frame });
    const mannerCondition = (row: { condition: IRCondition }): boolean =>
      this.evaluator.evalCondition(row.condition, { world, it: owner.id, ...frame });

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
          authorEvents: [this.rawEvent('character.scene.exit_refused', { sceneId: scene.id, leaverId: npc.id })],
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
      reports.push(...this.execStatements(plain, ctx, 'all'));

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
              openedTurn: this.dialogueTurn(world),
              responses: this.exchangeResponses(exchangeId, target),
            },
          });
          // The `asks`/`invites` word rides the author channel (Phase 9's feed).
          authorEvents.push(this.rawEvent('character.exchange.opened', { exchangeId, word: stmt.word }));
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
            reports.push(...this.execStatements(leaving.body, { world, it: owner.id, ...frame }, 'all'));
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
        const claims = this.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
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
      const claims = this.claimsFor(override.messageId);
      if (claims) {
        for (const e of recordClaimDelivery(speakerTrait, npc.id, actorId, claims, this.dialogueTurn(world))) {
          authorEvents.push(e);
        }
      }
    }
    // A served delivery is a conversation in progress (ADR-310 D16).
    if (speakerTrait) markConversationTurn(speakerTrait, actorId, this.dialogueTurn(world));

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

      threadClaims: (npc, intent, ctx): boolean => runtime.probeThreadClaims(npc, intent, ctx),

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
          const threadServe = runtime.serveThreadDispatch({ world, owner, npc, intent, ctx, memory });
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
        (row) => this.evaluator.evalCondition(row.condition!, { world, it: owner!.id }),
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
        (row) => this.evaluator.evalCondition(row.condition!, { world, it: owner.id }),
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
  private deliverSeizureBody(
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
    const reports = this.execStatements(
      body.filter((s) => s.kind !== 'hold-tongue' && s.kind !== 'then-open'),
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
      if (when && !this.evaluator.evalCondition(when, { world, it: owner.id, ...frame })) continue;
      const target = (owner.exchanges ?? []).find((e) => e.name === stmt.exchange);
      if (!target) {
        throw new LoadError(`\`then ${stmt.word}\` names an unknown exchange \`${stmt.exchange}\` on \`${owner.id}\`.`, stmt.span);
      }
      const exchangeId = `${owner.id}.${target.name}`;
      openExchange = {
        exchangeId,
        speakerId: participantId,
        ...(target.strength ? { strength: target.strength } : {}),
        openedTurn: this.dialogueTurn(world),
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
        const claims = this.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
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
      const claims = this.claimsFor(spoken.messageId);
      if (claims) {
        events.push(
          ...recordClaimDelivery(trait, participantId, audienceId, claims, this.dialogueTurn(world)),
        );
      }
    }

    return {
      events,
      ...(spoken ? { spokenMessageId: spoken.messageId, spokenParams: spoken.params } : {}),
      ...(openExchange !== undefined && openWord !== undefined ? { openExchange, openWord } : {}),
    };
  }

  // ------------------- Conversation threads (ADR-320 D14, Phase 10.4)

  /** The world-state key stamping a pair's dispatch-path beat advance this cycle. */
  private threadCycleKey(ownerIrId: string, actorId: string): string {
    return `chord.thread.served.${ownerIrId}.${actorId}`;
  }

  /** The hold-gate/`opens when` evaluator for one owner-partner pair. */
  private threadEval(world: WorldModel, ownerIrId: string, actorId: string): (condition: IRCondition) => boolean {
    return (condition) =>
      this.evaluator.evalCondition(condition, { world, it: ownerIrId, conversationPartnerId: actorId });
  }

  /** Whether the intent's topic matches the thread's `about` filter. */
  private matchesThreadFilter(thread: IRConversation, intent: ConversationIntent): boolean {
    return thread.filter !== undefined && this.matchTopicFilters([thread.filter], intent) === 0;
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
    if (this.matchTopicFilters((owner.topics ?? []).map((r) => r.filter), intent) >= 0) return true;
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
      const res = this.serveConversationBody({
        world, owner, npc, actorId, scene: ensured.scene, memory,
        body: thread.beats[index].body,
        occurrenceKey: `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.beat.${index}`,
        closesExchange: false,
      });
      return { ...res, wireEvents: [...ensured.wire, ...(res.wireEvents ?? [])] };
    }

    if (thread.filter) {
      this.stampSceneThread(world, npc.id, actorId, this.canonicalTopic(thread.filter));
    }
    world.setStateValue(this.threadCycleKey(owner.id, actorId), this.dialogueTurn(world));

    const served = threadStateFor(world, npc.id, actorId, thread.name);
    const occurrenceKey =
      advance.kind === 'conclusion'
        ? `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.conclusion`
        : `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${thread.name}.beat.${(served?.beatCursor ?? 1) - 1}`;
    const res = this.serveConversationBody({
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
  private serveThreadDispatch(args: {
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
        const res = this.serveConversationBody({
          world, owner, npc, actorId, scene: ctx.scene, memory, body, occurrenceKey, closesExchange: false,
        });
        return {
          ...res,
          authorEvents: [
            ...(res.authorEvents ?? []),
            this.rawEvent('character.thread.refused', { ownerId: npc.id, threadKey: thread.name }),
          ],
        };
      }
      if (
        strength === 'assertive' &&
        thread.onParting &&
        this.hasOtherThreadTarget(world, owner, threads, intent, npc.id, actorId, thread.name)
      ) {
        const res = this.serveConversationBody({
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
          world.setStateValue(this.threadCycleKey(owner.id, actorId), this.dialogueTurn(world));
          const res = this.serveConversationBody({
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
  private probeThreadClaims(npc: IFEntity, intent: ConversationIntent, ctx: DialogueSelectionContext): boolean {
    const owner = this.irOwnerOf(npc.id);
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
      const owner = this.irOwnerOf(ownerId);
      const threads = owner?.conversations ?? [];
      if (!owner || threads.length === 0) return undefined;
      const evalFor = this.threadEval(world, owner.id, partnerId);
      const move = readyThreadMove(world, ownerId, partnerId, threads, evalFor);
      if (!move) return undefined;
      const memory = createTraitMemoryAccess(world);
      const events: ISemanticEvent[] = [];
      const pushWire = (wire: SceneWireEvent[]): void => {
        for (const w of wire) events.push(this.rawEvent(`character.scene.${w.kind}`, { ...w }));
      };

      if (move.kind === 'advance') {
        const stamp = world.getStateValue(this.threadCycleKey(owner.id, partnerId));
        if (stamp === this.dialogueTurn(world) - 1) return undefined; // dispatch advanced this cycle
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
          const delivery = this.deliverSeizureBody(
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
        this.stampSceneThread(world, ownerId, partnerId, this.canonicalTopic(move.thread.filter));
      }
      const served = threadStateFor(world, ownerId, partnerId, move.thread.name);
      const occurrenceKey =
        advance.kind === 'conclusion'
          ? `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${move.thread.name}.conclusion`
          : `${CHORD_OCCURRENCE_PREFIX}thread.${owner.id}.${move.thread.name}.beat.${(served?.beatCursor ?? 1) - 1}`;
      const delivery = this.deliverSeizureBody(world, owner, ownerId, advance.body, occurrenceKey, partnerId);
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

  /** The pure probe for `buildThreadTurn` — would the owner take a thread turn now? */
  buildThreadTurnReady(world: WorldModel): (ownerId: string, partnerId: string) => boolean {
    return (ownerId, partnerId) => {
      const owner = this.irOwnerOf(ownerId);
      const threads = owner?.conversations ?? [];
      if (!owner || threads.length === 0) return false;
      const evalFor = this.threadEval(world, owner.id, partnerId);
      const move = readyThreadMove(world, ownerId, partnerId, threads, evalFor);
      if (!move) return false;
      if (move.kind === 'advance') {
        const stamp = world.getStateValue(this.threadCycleKey(owner.id, partnerId));
        return stamp !== this.dialogueTurn(world) - 1;
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
        conversationTopic: this.canonicalTopic(rows[rowIndex].filter),
      };
      const when = (stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      if (when && !this.evaluator.evalCondition(when, { world, it: entity.id, ...frame })) continue;
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
        ...this.execStatements(
          rowParts[index].plain,
          {
            world,
            it: entity.id,
            occurrence,
            conversationPartnerId: actorId,
            conversationTopic: this.canonicalTopic(rows[index].filter),
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
    const npcWorldId = this.host.entityId(entity.id);
    const runtime = npcWorldId ? world.getSceneRuntime() : undefined;
    if (!npcWorldId || !runtime) return [];
    const scene = sceneWith(world, npcWorldId);
    if (!scene || !scene.participantIds.includes(actorId)) return [];

    const frame = {
      conversationPartnerId: actorId,
      conversationTopic: this.canonicalTopic((entity.topics ?? [])[rowIndex].filter),
    };
    const events: ISemanticEvent[] = [];
    const wire: SceneWireEvent[] = [];
    for (const stmt of rowParts[rowIndex].convo) {
      if (stmt.kind === 'deflect') continue; // execTopicDeflects handled it
      const when = (stmt as IRStatement & { stmtWhen?: IRCondition | null }).stmtWhen;
      if (when && !this.evaluator.evalCondition(when, { world, it: entity.id, ...frame })) continue;
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
                openedTurn: this.dialogueTurn(world),
                responses: this.exchangeResponses(exchangeId, target),
              },
            },
          ]),
        );
        events.push(this.rawEvent('character.exchange.opened', { exchangeId, word: stmt.word }));
      } else if (stmt.kind === 'leave') {
        const room = world.getContainingRoom(npcWorldId)?.id ?? world.getLocation(npcWorldId);
        if (!room || !hasTraversableExit(world, room)) {
          events.push(this.rawEvent('character.scene.exit_refused', { sceneId: scene.id, leaverId: npcWorldId }));
          continue;
        }
        const leaving = (entity.greetings ?? []).find((r) => r.head.kind === 'leaving');
        if (leaving) {
          events.push(...this.execStatements(leaving.body, { world, it: entity.id, ...frame }, 'all'));
        }
        wire.push(
          ...runtime.applyDirectives(scene.id, [
            { kind: 'close-scene', boundary: 'exit', leaverId: npcWorldId },
          ]),
        );
      }
    }
    events.push(...wire.map((w) => this.rawEvent(`character.scene.${w.kind}`, { ...w })));
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
  private buildTopicArm(entity: IREntity, catchAll: ActionInterceptor | undefined, gerund: string): ActionInterceptor {
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
        index = rows.findIndex((r) => r.filter.kind === 'entity' && runtime.host.entityId(r.filter.id) === askedEntity);
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
      const worldId = runtime.host.entityId(entity.id);
      if (!worldId) return null;
      const trait = world.getEntity(worldId)?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      return trait ? { worldId, trait } : null;
    };

    /** The row's canonical topic candidates for held-knowledge lookups. */
    const topicCandidatesOf = (row: IRTopicRow): string[] => runtime.topicCandidates(row.filter);

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
        const story = runtime.host.characterStoryData?.();
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
        const refusal = runtime.findRefusal(rowParts[index].plain, ctx);
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
        const bag = runtime.clauseBag(data, `topic.${entity.id}`);
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
          const npcWorldId = runtime.host.entityId(entity.id);
          if (npcWorldId) {
            runtime.stampSceneThread(world, npcWorldId, actorId, topicCandidatesOf(row)[0]);
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
            const parkEvents: ISemanticEvent[] = [];
            const thread = (entity.conversations ?? []).find((t) => t.name === parked.threadKey);
            const scene = sceneWith(world, npcWorldId);
            if (thread?.onParting) {
              const partingKey = `${CHORD_OCCURRENCE_PREFIX}thread.${entity.id}.${parked.threadKey}.parting`;
              const partingOccurrence = ((world.getStateValue(partingKey) as number | undefined) ?? 0) + 1;
              world.setStateValue(partingKey, partingOccurrence);
              const partingReports = runtime.execStatements(
                thread.onParting.filter((st) => st.kind !== 'then-open' && st.kind !== 'deflect' && st.kind !== 'leave'),
                { world, it: entity.id, occurrence: partingOccurrence, conversationPartnerId: actorId },
                'all',
              );
              for (const event of partingReports) {
                if (event.type === 'chord.phrase') {
                  const payload = (event.data ?? {}) as Record<string, unknown>;
                  parkEvents.push(
                    runtime.rawEvent('character.thread.parting', {
                      ownerId: npcWorldId,
                      threadKey: parked.threadKey,
                      messageId: String(payload.messageId),
                      params: (payload.params as Record<string, unknown>) ?? {},
                    }),
                  );
                  if (scene) {
                    parkEvents.push(
                      runtime.rawEvent('character.scene.utterance', {
                        sceneId: scene.id,
                        speakerId: npcWorldId,
                        addresseeId: actorId,
                        messageId: String(payload.messageId),
                        beats: [],
                      }),
                    );
                  }
                } else {
                  parkEvents.push(event);
                }
              }
            }
            const parkWire = parkThread(world, scene?.id ?? '', npcWorldId, actorId, parked.threadKey);
            parkEvents.push(...parkWire.map((w) => runtime.rawEvent(`character.scene.${w.kind}`, { ...w })));
            if (scene) stampThreadContinuability(world, scene.id, undefined);
            data.chordThreadPark = parkEvents;
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
        const ctx = { ...runtime.restoreCtx(world, entity.id, runtime.clauseBag(data, `topic.${entity.id}`), 'mutations'), ...frameOf(row, actorId) };
        runtime.execStatements(rowParts[index].plain, ctx, 'mutations');
      },

      postReport(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        // Any ask/tell reaching a character-model owner is a conversation
        // in progress (ADR-310 D16) — evasions and row-misses included —
        // so the marker is stamped before the row is consulted.
        const modeledSpeaker = speakerOf(world);
        if (modeledSpeaker) markConversationTurn(modeledSpeaker.trait, actorId, runtime.dialogueTurn(world));

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
        const ctx = { ...runtime.restoreCtx(world, entity.id, runtime.clauseBag(data, `topic.${entity.id}`), 'reports'), ...frameOf(row, actorId) };
        let reports = runtime.execStatements(rowParts[rowIndex].plain, ctx, 'reports');

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
            const claims = runtime.claimsFor(String((event.data as Record<string, unknown> | undefined)?.messageId));
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
          const claims = runtime.claimsFor(result.override.messageId);
          if (claims) {
            for (const e of recordClaimDelivery(speaker.trait, speaker.worldId, actorId, claims, runtime.dialogueTurn(world))) {
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
                derivedTopic: runtime.witnessedAliasFor(entity.id, 'betray a confidence', act.derivedTopic),
              };
              const room = world.getLocation(speaker.worldId);
              const occupants = room ? world.getContents(room) : [];
              const learned = witnessActs([aliased], occupants, runtime.dialogueTurn(world));
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
          const npcWorldId = runtime.host.entityId(entity.id);
          if (npcWorldId) {
            runtime.recordDiscussedPair(createTraitMemoryAccess(world), npcWorldId, actorId, topicCandidatesOf(row));
          }
        }

        emit.push(...authorEmit);
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  // ------------------------------------------- dispatch verbs (Phase B, §5.4)

  /** Write a `define trait` data field on the entity's chord trait instance. */
  private writeChordTraitField(world: WorldModel, worldId: string, field: string, value: unknown, span?: Span): void {
    const entity = world.getEntity(worldId);
    for (const trait of entity?.traits.values() ?? []) {
      if (!trait.type.startsWith(CHORD_TRAIT_PREFIX)) continue;
      const record = trait as unknown as Record<string, unknown>;
      if (field in record) {
        record[field] = typeof value === 'boolean' ? String(value) : value;
        return;
      }
    }
    throw new LoadError(`No trait on this entity carries the field \`${field}\`.`, span);
  }

  /**
   * A `define trait` clause on a dispatch verb → CapabilityBehavior
   * (§5.4's second half): refusal scan in validate (with the occurrence
   * bump and decision snapshot stashed in sharedData), mutations in
   * execute, phrase/emit/win/lose in report.
   */
  private buildCapabilityBehavior(traitName: string, clause: IROnClause): CapabilityBehavior {
    const runtime = this;
    const ctxOf = (
      entity: IFEntity,
      world: WorldModel,
      actorId: string,
      data: CapabilitySharedData,
      phase?: 'mutations' | 'reports',
    ): ExecContext => ({
      world,
      it: runtime.host.irIdOf(entity.id),
      slots: { ...(data.chordSlots as Record<string, string> | undefined), actor: actorId },
      occurrence: data.chordOccurrence as number | undefined,
      ledger: runtime.ledgerFor(data as Record<string, unknown>, 'chordDecisions', phase),
      // ADR-289 D2: a trait clause is ONE piece of IR shared by every
      // composing entity, so its selects must count per entity. The compiler
      // cannot name composing entities — the runtime is the layer that knows
      // — and the compiler's id stays a strict prefix of the key it builds,
      // keeping "every counter for this statement" addressable by prefix.
      owner: runtime.host.irIdOf(entity.id),
    });

    return {
      validate(entity, world, actorId, data): CapabilityValidationResult {
        const ctx = ctxOf(entity, world, actorId, data);
        // ADR-327 D1: the head names who acts — another actor's action is
        // not this clause's (the dispatcher reads `chordSkip` as not claiming).
        if (!runtime.actorMatches(clause.actor, actorId, world)) {
          data.chordSkip = true;
          return { valid: true };
        }
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. ADR-229 R5: the dispatch action
        // reads `chordSkip` as "not claiming" and falls through to the
        // next candidate / body / miss; the execute/report guards below
        // stay as defense in depth. Do not move this evaluation.
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true;
          return { valid: true };
        }
        const key = `${CHORD_OCCURRENCE_PREFIX}trait.${traitName}.${clause.action}.${runtime.host.irIdOf(entity.id)}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          data.chordSkip = true; // `, once` — one lifetime firing (D5)
          return { valid: true };
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        // Key only — this path's own blocked() re-renders via phraseEvent,
        // which stages the Choice itself; the staged params are not read.
        if (refusal) return { valid: false, error: refusal.error };
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        data.chordOccurrence = occurrence;
        return { valid: true };
      },
      execute(entity, world, actorId, data): void {
        if (data.chordSkip === true) return;
        runtime.execStatements(clause.body, ctxOf(entity, world, actorId, data, 'mutations'), 'mutations');
      },
      report(entity, world, actorId, data): CapabilityEffect[] {
        if (data.chordSkip === true) return [];
        const events = runtime.execStatements(clause.body, ctxOf(entity, world, actorId, data, 'reports'), 'reports');
        return events.map(toEffect);
      },
      blocked(entity, world, actorId, error, data): CapabilityEffect[] {
        const event = runtime.phraseEvent(error, ctxOf(entity, world, actorId, data));
        return [toEffect(event)];
      },
    };
  }

  /**
   * A `define trait` clause on a standard-semantics action → one
   * ActionInterceptor registered under the trait type (ADR-118 resolves it
   * for every entity carrying the trait).
   */
  private buildTraitInterceptor(clause: IROnClause, ns: string): ActionInterceptor {
    const runtime = this;
    const itOf = (target: IFEntity) => runtime.host.irIdOf(target.id) ?? target.id;
    const occurrenceKeyOf = (target: IFEntity) => `${CHORD_OCCURRENCE_PREFIX}trait.${ns}.${itOf(target)}`;

    return {
      preValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        if (clause.clauseKind === 'after') return null;
        const ctx: ExecContext = { world, it: itOf(target) };
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. preValidate and postValidate may both
        // evaluate the gate: no mutation occurs between them within one
        // action, so the answers cannot differ. Do not move this evaluation.
        const bag = runtime.clauseBag(data, ns);
        // ADR-327 D1: the head names who acts — a clause for another actor
        // sits out entirely, refusals included.
        if (!runtime.actorMatches(clause.actor, actorId, world)) {
          bag.skip = true;
          return null;
        }
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKeyOf(target)) as number | undefined) ?? 0) >= 1) {
          bag.skip = true;
          return null;
        }
        const refusal = runtime.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, ...refusal } : null;
      },
      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const bag = runtime.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: itOf(target) };
        // ADR-327 D1: same actor gate as preValidate (after-clauses reach here first).
        if (!runtime.actorMatches(clause.actor, actorId, world)) {
          bag.skip = true;
          return null;
        }
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true; // `while <cond>` gate — clause sits out this firing
          return null;
        }
        const key = occurrenceKeyOf(target);
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          bag.skip = true; // `, once` — one lifetime firing (D5)
          return null;
        }
        world.setStateValue(key, occurrence);
        ctx.occurrence = occurrence;
        bag.occurrence = occurrence;
        return null;
      },
      postExecute(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): void {
        const bag = runtime.clauseBag(data, ns);
        if (bag.skip === true) return;
        runtime.execStatements(clause.body, runtime.restoreCtx(world, itOf(target), bag, 'mutations'), 'mutations');
      },
      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        const bag = runtime.clauseBag(data, ns);
        if (bag.skip === true) return {};
        const reports = runtime.execStatements(clause.body, runtime.restoreCtx(world, itOf(target), bag, 'reports'), 'reports');
        const result: InterceptorReportResult = {};
        const emit: CapabilityEffect[] = [];
        for (const event of reports) {
          const payload = (event.data ?? {}) as Record<string, unknown>;
          // Only `on` clauses override the primary message; `after` phrases
          // APPEND (ratchet D3 — mirrors the entity interceptor's guard).
          if (clause.clauseKind === 'on' && event.type === 'chord.phrase' && !result.override) {
            result.override = { messageId: String(payload.messageId), params: (payload.params as Record<string, unknown>) ?? {} };
          } else {
            emit.push(toEffect(event));
          }
        }
        if (emit.length) result.emit = emit;
        return result;
      },
    };
  }

  /**
   * `define action` → a four-phase dispatch action (structurally typed —
   * `Story.getCustomActions()` is untyped by design): the refusal ladder
   * runs in validate, the matched CapabilityBehavior carries the phases,
   * `otherwise refuse` is the dispatch-miss, and `when <player> <verbs>`
   * rules fire in report.
   */
  buildDispatchActions(): unknown[] {
    return this.ir.actions.map((def) => this.buildDispatchAction(def));
  }

  private buildDispatchAction(def: IRActionDef) {
    const runtime = this;
    const actionId = `chord.action.${def.name}`;
    // ADR-275: a directions-block action's `direction` slot is SEMANTIC —
    // the primary (entity) slot skips it, and entity-less patterns are the
    // ones carrying no entity slot at all.
    const hasDirections = (def.directions ?? []).length > 0;
    const isEntitySlot = (word: string) => !(hasDirections && word === 'direction');
    const primarySlot = def.patterns
      .flatMap((p) => p.parts)
      .filter((part): part is { kind: 'slot'; word: string } => part.kind === 'slot')
      .find((part) => isEntitySlot(part.word))?.word;
    const hasEntityLessPattern = def.patterns.some(
      (p) => !p.parts.some((part) => part.kind === 'slot' && isEntitySlot((part as { word: string }).word)),
    );
    // Semantic keys this action declares (ADR-275 D2): `direction` under a
    // directions block, plus every `means` key. Only DECLARED keys bind —
    // arbitrary parser extras never leak into body scope.
    const semanticKeys = new Set<string>();
    if (hasDirections) semanticKeys.add('direction');
    for (const p of def.patterns) for (const m of p.means ?? []) semanticKeys.add(m.key);

    interface DispatchContext {
      world: WorldModel;
      player: IFEntity;
      // ADR-275 D2 (review fix): `parsed.extras` carries the matched rule's
      // defaultSemantics (merged parser-side, ADR-148) — the access seam
      // for semantic word bindings.
      command: { directObject?: { entity?: IFEntity }; parsed?: { extras?: Record<string, unknown> } };
      sharedData: Record<string, unknown>;
      event(type: string, data: Record<string, unknown>): ISemanticEvent;
    }

    /** Entity bindings + declared semantic WORDS (ADR-275 D2), one map. */
    const bindings = (entity: IFEntity | undefined, context: DispatchContext): Record<string, string> => {
      const slots: Record<string, string> = { actor: context.player.id };
      if (entity && primarySlot) slots[primarySlot] = entity.id;
      const extras = context.command.parsed?.extras ?? {};
      for (const key of semanticKeys) {
        const v = extras[key];
        if (typeof v === 'string' && slots[key] === undefined) slots[key] = v;
      }
      return slots;
    };

    return {
      id: actionId,
      group: 'interaction',
      validate(context: DispatchContext): { valid: boolean; error?: string } {
        const entity = context.command.directObject?.entity;
        const slots = bindings(entity, context);
        const evalCtx: ExecContext = { world: context.world, slots };
        for (const refusal of def.refusals) {
          if (refusal.kind === 'without') {
            // ADR-275 D1: the arm fires when the named binding is absent on
            // THIS command — an entity slot needs the entity, a semantic
            // key needs its word.
            const bound = semanticKeys.has(refusal.slot ?? '') ? slots[refusal.slot!] !== undefined : !!entity;
            if (!bound) return { valid: false, error: refusal.phraseKey };
          }
          if (refusal.kind === 'when') {
            // ADR-275 D6: an arm whose condition references a binding
            // absent on this command shape does NOT fire (prohibitions
            // fail open where requirements fail closed) — the evaluator's
            // unbound-read throw stays a loader bug, never author-reachable.
            if (!runtime.conditionBindable(refusal.condition, slots)) continue;
            if (runtime.evaluator.evalCondition(refusal.condition, evalCtx)) {
              return { valid: false, error: refusal.phraseKey };
            }
          }
        }
        // ADR-275 D1: entity-less dispatch exists only for actions that
        // declare an entity-less shape AND carry a body (the body IS the
        // semantics — no behavior host without an entity).
        if (!entity && !(hasEntityLessPattern && def.body.length > 0)) {
          return { valid: false, error: def.otherwise ?? 'cant' };
        }

        // Action-level requirements (`<subject> must …: <key>`, D6) run
        // after the refusal ladder, before dispatch — the action's own
        // gate, evaluated in the slots context (wired with the each
        // package's zoo-chain fixes, 2026-07-12). ADR-275 D6: a must whose
        // subject cannot be bound on this command shape is UNMET — it
        // refuses with its authored key, never silently evaporates.
        for (const must of def.musts) {
          if (!runtime.conditionBindable(must.condition, slots)) {
            return { valid: false, error: must.phraseKey };
          }
          if (!runtime.evaluator.evalCondition(must.condition, evalCtx)) {
            return { valid: false, error: must.phraseKey };
          }
        }

        // Dispatch: the first trait on the target with a behavior bound for
        // this action claims it (per-world binding map, ADR-090/207).
        // Instance-type lookup: ChordDataTrait types are per-instance, so
        // the constructor-static path (getBehaviorForCapability) can't see
        // them.
        //
        // ADR-229 R5: a gated-out behavior does NOT claim the dispatch.
        // A candidate whose validate returns valid with `chordSkip` set
        // (false `while` gate, or consumed `, once` — both side-effect-free
        // probes) is treated as if its clause were never declared: selection
        // falls through to the next trait's behavior, the action body, or
        // the `otherwise refuse` miss. A real refusal (valid: false) still
        // claims immediately, exactly as before.
        let behavior: CapabilityBehavior | undefined;
        let capShared: CapabilitySharedData = { chordSlots: slots };
        if (entity) {
          for (const trait of entity.traits.values()) {
            const candidate = context.world.getBehaviorBinding(trait.type, actionId)?.behavior;
            if (!candidate) continue;
            const candidateShared: CapabilitySharedData = { chordSlots: slots };
            const result = candidate.validate(entity, context.world, context.player.id, candidateShared);
            if (!result.valid) return { valid: false, error: result.error };
            if (candidateShared.chordSkip === true) continue; // gated out — not claiming
            behavior = candidate;
            capShared = candidateShared;
            break;
          }
        }
        // A behavior host is optional when the action carries its own body
        // (§5.4: the body IS the action's semantics — photographing has no
        // per-trait behavior by design). No claiming behavior AND no body =
        // the dispatch miss.
        if (!behavior && def.body.length === 0) return { valid: false, error: def.otherwise ?? 'cant' };
        if (def.body.length) {
          // The body's own validate partition (leading refusals/musts).
          // Routing is decided by the mutations pass, not here (ADR-289 D1).
          const bodyCtx: ExecContext = { world: context.world, slots };
          const refusal = runtime.findRefusal(def.body, bodyCtx);
          if (refusal) return { valid: false, ...refusal };
        }
        context.sharedData.capEntity = entity;
        context.sharedData.capBehavior = behavior;
        context.sharedData.capShared = capShared;
        // ADR-275: one binding source — validate's map (entity ids +
        // semantic words) carries to execute/report via sharedData.
        context.sharedData.chordSlotMap = slots;
        return { valid: true };
      },
      execute(context: DispatchContext): void {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        if (entity && behavior) {
          behavior.execute(entity, context.world, context.player.id, context.sharedData.capShared as CapabilitySharedData);
        }
        if (def.body.length) {
          runtime.execStatements(def.body, runtime.actionBodyCtxFromSlots(context, 'mutations'), 'mutations');
        }
      },
      report(context: DispatchContext): ISemanticEvent[] {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        const events: ISemanticEvent[] = [];
        if (entity && behavior) {
          const effects = behavior.report(entity, context.world, context.player.id, context.sharedData.capShared as CapabilitySharedData);
          // The same D9 attribution override as the engine's
          // effectsToEvents: context.event stamps the acting player,
          // which is wrong for NPC-originated effects.
          events.push(...effects.map((e) => {
            const event = context.event(e.type, e.payload);
            return e.actor !== undefined ? { ...event, entities: { ...event.entities, actor: e.actor } } : event;
          }));
        }
        if (def.body.length) {
          events.push(...runtime.execStatements(def.body, runtime.actionBodyCtxFromSlots(context, 'reports'), 'reports'));
        }
        // After-clauses bind to the target entity — an entity-less command
        // has no owner to react (ADR-275 D1).
        if (entity) events.push(...runtime.fireAfterClauses(def.name, entity, context.world, context.player.id));
        return events;
      },
      blocked(context: DispatchContext, result: { error?: string }): ISemanticEvent[] {
        // Known gap (D9 verification, 2026-08-16): this dispatcher never
        // calls behavior.blocked() — a trait capability behavior bound to
        // a custom Chord action gets only the authored otherwise/refusal
        // rendering below. Pre-existing; wire behavior.blocked() here if
        // a story ever needs its effects on this path.
        const key = result.error ?? def.otherwise ?? 'cant';
        // Platform default (Phase 8 #13): `'cant'` is the built-in fallback
        // key for an action with no authored `otherwise`/refusal — no story
        // phrase exists for it, and phraseEvent would throw a LoadError at
        // emit time. Render the platform's generic refusal instead
        // (lang-en-us `scope.out_of_scope`: "You can't do that.").
        if (key === 'cant') {
          return [context.event('action.blocked', { messageId: 'scope.out_of_scope', reason: 'cant' })];
        }
        const event = runtime.phraseEvent(key, { world: context.world });
        return [context.event(event.type, (event.data ?? {}) as Record<string, unknown>)];
      },
    };
  }

  private slotBindings(primarySlot: string | undefined, entity: IFEntity, player: IFEntity): Record<string, string> {
    const slots: Record<string, string> = { actor: player.id };
    if (primarySlot) slots[primarySlot] = entity.id;
    return slots;
  }

  /**
   * Execution context for a `define action` body (§5.4): the binding map
   * validate built (entity ids + ADR-275 semantic words), no `it` (action
   * bodies have no owner), decision snapshot carried through sharedData.
   */
  private actionBodyCtxFromSlots(
    context: {
      world: WorldModel;
      player: IFEntity;
      sharedData: Record<string, unknown>;
    },
    phase?: 'mutations' | 'reports',
  ): ExecContext {
    return {
      world: context.world,
      slots: (context.sharedData.chordSlotMap as Record<string, string> | undefined) ?? { actor: context.player.id },
      ledger: this.ledgerFor(context.sharedData, 'chordBodyDecisions', phase),
    };
  }

  /**
   * ADR-275 D6: true when every `{kind: 'slot'}` context read in the IR
   * condition tree has a binding. Musts fail CLOSED on an unbindable
   * subject (refuse with the authored key); `refuse when` arms fail OPEN
   * (the arm gates a shape this command isn't). Keeps the evaluator's
   * unbound-read throw a loader bug, never author-reachable.
   */
  private conditionBindable(node: unknown, slots: Record<string, string>): boolean {
    if (Array.isArray(node)) return node.every((n) => this.conditionBindable(n, slots));
    if (node && typeof node === 'object') {
      const rec = node as Record<string, unknown>;
      if (rec.kind === 'slot' && typeof rec.name === 'string') {
        return rec.name === 'actor' || slots[rec.name] !== undefined;
      }
      return Object.values(rec).every((v) => this.conditionBindable(v, slots));
    }
    return true;
  }

  // -------------------------------------------- scheduler constructs (Phase B)

  /**
   * Build the story's scheduler daemons (`once` / `every N turns` /
   * `define sequence` / every-turn trait clauses). ALL progression state is
   * namespaced world state — save/restore/undo cover it with no
   * getRunnerState plumbing (design.md §6). Registered by
   * ChordStory.onEngineReady; exposed for direct unit driving.
   */
  buildSchedulerDaemons(): SchedulerDaemon[] {
    const daemons: SchedulerDaemon[] = [];

    // ADR-325 D3f: the timer stepper runs ahead of every other daemon
    // kind — a timer's turn is decided before anything else reacts to it.
    if (this.timerDefs.size > 0) {
      daemons.push({
        id: 'chord.timers',
        name: 'ADR-325 timers',
        run: (ctx) => this.stepTimers(ctx),
      });
    }

    for (const sequence of this.ir.sequences) {
      // Steps arm in order: `at turn N` on the wall clock, `N turns later`
      // relative to the PREVIOUS step's firing turn, `when <owner> becomes
      // <state>` on a state anchor (ratchet D10). Pointer and last-fired
      // turn live in world state — save/restore covers progression.
      const slug = sequence.name.replace(/\s+/g, '-');
      const key = `${CHORD_OCCURRENCE_PREFIX}sequence.${slug}`;
      const firedKey = `${key}.turn`;
      const stepReady = (step: (typeof sequence.steps)[number], world: WorldModel, turn: number): boolean => {
        switch (step.timing) {
          case 'at-turn':
            return turn >= step.turns;
          case 'later': {
            const lastFired = (world.getStateValue(firedKey) as number | undefined) ?? 0;
            return turn >= lastFired + step.turns;
          }
          case 'becomes': {
            if (!step.anchor) return false;
            if (step.anchor.owner === 'story') {
              return world.getStateValue(CHORD_STORY_STATE_KEY) === step.anchor.state;
            }
            return world.getStateValue(CHORD_STATE_PREFIX + step.anchor.owner) === step.anchor.state;
          }
        }
      };
      daemons.push({
        id: `chord.sequence.${slug}`,
        name: `sequence ${sequence.name}`,
        condition: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          return next < sequence.steps.length && stepReady(sequence.steps[next], ctx.world, ctx.turn);
        },
        run: (ctx) => {
          const next = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
          ctx.world.setStateValue(key, next + 1);
          ctx.world.setStateValue(firedKey, ctx.turn);
          const step = sequence.steps[next];
          return this.narrated(this.execStatements(step.body, { world: ctx.world, occurrence: next + 1 }));
        },
      });
    }

    // Entity every-turn clauses (`on every turn while …[, once]` in a
    // create block): one daemon per clause, `it` = the owning entity
    // (stickiness — the ownership package's replacement for floating
    // `once <cond>` rules).
    this.ir.entities.forEach((irEntity) => {
      irEntity.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        const key = `${CHORD_OCCURRENCE_PREFIX}entity-turn.${irEntity.id}.${clauseIndex}`;
        daemons.push({
          id: `chord.entity-turn.${irEntity.id}.${clauseIndex}`,
          name: `on every turn (${irEntity.id})`,
          run: (ctx) => {
            // Presence gate (decision 10): performances need an audience —
            // the clause does not FIRE off-stage. Checked before the
            // condition so an off-stage `one chance in N` never draws the
            // RNG (AC-5 determinism for on-stage firings) and `, once` is
            // never consumed unwitnessed. Presence, not sight.
            if (!this.playerPresentAt(ctx.world, irEntity.id)) return [];
            const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
            if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) return [];
            const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
            if (clause.once && fired > 1) return []; // `, once` (D5)
            ctx.world.setStateValue(key, fired);
            evalCtx.occurrence = fired;
            return this.narrated(this.execStatements(clause.body, evalCtx));
          },
        });
      });
    });

    // Story-owned every-turn clauses (`on every turn` in the story header
    // body — ADR-236 D7, ratchet R4): one daemon per clause with NO
    // presence gate — the story is everywhere ("a background clock for the
    // whole game"); narration broadcasts. `it` never appears in the body
    // (the analyzer's story-clause-it gate refused it at compile).
    (this.ir.story.onClauses ?? []).forEach((clause, clauseIndex) => {
      if (clause.binding !== 'every-turn') return;
      const key = `${CHORD_OCCURRENCE_PREFIX}story-turn.${clauseIndex}`;
      daemons.push({
        id: `chord.story-turn.${clauseIndex}`,
        name: 'on every turn (story)',
        run: (ctx) => {
          const evalCtx: ExecContext = { world: ctx.world };
          if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) return [];
          const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
          if (clause.once && fired > 1) return []; // `, once` (D5)
          ctx.world.setStateValue(key, fired);
          evalCtx.occurrence = fired;
          return this.narrated(this.execStatements(clause.body, evalCtx));
        },
      });
    });

    // Every-turn trait clauses (`on every turn while …[, once]`): one
    // daemon per clause, evaluated per entity carrying the trait. The
    // composition condition (`chatty while not after-hours`) gates per
    // entity per turn (Prerequisite 2's NPC-behavior shape).
    this.ir.traits.forEach((trait) => {
      trait.onClauses.forEach((clause, clauseIndex) => {
        if (clause.binding !== 'every-turn') return;
        const traitType = CHORD_TRAIT_PREFIX + trait.name;
        daemons.push({
          id: `chord.trait-turn.${trait.name}.${clauseIndex}`,
          name: `on every turn (${trait.name})`,
          run: (ctx) => {
            const out: ISemanticEvent[] = [];
            for (const irEntity of this.ir.entities) {
              const comp = irEntity.traits.find((t) => t.name === trait.name);
              if (!comp) continue;
              const worldId = this.host.entityId(irEntity.id);
              const entity = worldId ? ctx.world.getEntity(worldId) : undefined;
              if (!entity?.has(traitType)) continue;
              // Presence gate (decision 10) — before any condition so the
              // RNG stream and `, once` are untouched off-stage.
              if (!this.playerPresentAt(ctx.world, irEntity.id)) continue;
              const evalCtx: ExecContext = { world: ctx.world, it: irEntity.id };
              if (comp.condition && !this.evaluator.evalCondition(comp.condition, evalCtx)) continue;
              if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) continue;
              const key = `${CHORD_OCCURRENCE_PREFIX}trait-turn.${trait.name}.${clauseIndex}.${irEntity.id}`;
              const fired = ((ctx.world.getStateValue(key) as number | undefined) ?? 0) + 1;
              if (clause.once && fired > 1) continue; // `, once` (D5)
              ctx.world.setStateValue(key, fired);
              evalCtx.occurrence = fired;
              out.push(...this.execStatements(clause.body, evalCtx));
            }
            return this.narrated(out);
          },
        });
      });
    });

    // Z3: a `disappeared` narration enqueued OUTSIDE statement execution
    // (a TS-initiated removeEntity — daemon, hatch, interceptor) has no
    // report pass to drain it; this daemon delivers it on the tick.
    // Registered only when the channel is authored, so channel-less
    // stories keep their exact daemon roster.
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    if (Object.keys(table).some((key) => key.endsWith('.disappeared'))) {
      daemons.push({
        id: 'chord.channel-drain',
        name: 'Z3 channel narration drain',
        condition: () => this.pendingChannelEvents.length > 0,
        run: () => this.drainChannelEvents(),
      });
    }

    return daemons;
  }

  /** Scheduler-returned events must narrate to reach the transcript. */
  private narrated(events: ISemanticEvent[]): ISemanticEvent[] {
    return events.map((e) => ({ ...e, narrate: true } as ISemanticEvent));
  }

  /**
   * Execute a machine body (`on enter`/`on exit`/transition effects,
   * ADR-215 state-machines depth) — story-owned: no `it` (compile-gated),
   * narration broadcasts like any story-owned surface.
   * @param statements the resolved IR statement tree
   * @param world the live world the effect runs against
   */
  execMachineBody(statements: IRStatement[], world: WorldModel): ISemanticEvent[] {
    return this.narrated(this.execStatements(statements, { world }));
  }

  /**
   * Decision 10 presence semantics: the player shares the owner's location.
   * A room owner means the player is IN that room; a region owner "is" at
   * every member room — presence is `isInRegion(player, region)`, transitive
   * through nesting (ADR-236 D4); for anything else the two share a
   * containing room (same co-location rule as can-see/can-reach — presence,
   * not sight, so the snake speaks in darkness).
   */
  // ---------------------------------------------------------------- timers

  /** Wire the engine's turn counter (loader-only; ADR-325 D3f). */
  setTurnProvider(provider: () => number): void {
    this.turnProvider = provider;
  }

  /** The current turn: the engine's when wired, else the last tick's. */
  private turnNow(): number {
    return this.turnProvider ? this.turnProvider() : this.lastTickTurn;
  }

  private timerRecord(qualified: string, world: WorldModel): TimerRecord {
    return this.evaluator.timerRecord(qualified, { world });
  }

  private writeTimer(qualified: string, world: WorldModel, record: TimerRecord): void {
    world.setStateValue(timerKey(qualified), record);
  }

  /**
   * ADR-325 D3c verb semantics. `start` on a started timer is a no-op;
   * `restart` always runs from the top; `reset` returns to idle;
   * `stop` holds; `interrupt` expires any started timer now (idle: no-op).
   */
  private runTimerVerb(verb: 'start' | 'stop' | 'restart' | 'reset' | 'interrupt', qualified: string, ctx: ExecContext): ISemanticEvent[] {
    const world = ctx.world;
    const record = this.timerRecord(qualified, world);
    switch (verb) {
      case 'start':
        if (record.phase === 'idle') this.writeTimer(qualified, world, { phase: 'running', index: 0, startedTurn: this.turnNow() });
        return [];
      case 'restart':
        this.writeTimer(qualified, world, { phase: 'running', index: 0, startedTurn: this.turnNow() });
        return [];
      case 'reset':
        this.writeTimer(qualified, world, { phase: 'idle', index: 0, startedTurn: -1 });
        return [];
      case 'stop':
        if (record.phase === 'running') this.writeTimer(qualified, world, { ...record, phase: 'stopped' });
        return [];
      case 'interrupt':
        if (record.phase === 'idle' || record.phase === 'expired') return [];
        return this.expireTimer(qualified, world);
    }
  }

  /** Mark a timer expired and fire its `when … expires` clauses (once per run). */
  private expireTimer(qualified: string, world: WorldModel): ISemanticEvent[] {
    const record = this.timerRecord(qualified, world);
    this.writeTimer(qualified, world, { ...record, phase: 'expired' });
    const out: ISemanticEvent[] = [];
    for (const { clause, it } of this.timerClauses.get(qualified) ?? []) {
      const evalCtx: ExecContext = it ? { world, it } : { world };
      if (clause.condition && !this.evaluator.evalCondition(clause.condition, evalCtx)) continue;
      out.push(...this.execStatements(clause.body, evalCtx));
    }
    return out;
  }

  /**
   * ADR-325 D3f: one step for every running timer, in declaration order.
   * A timer started this turn waits for the next. Each step: the
   * `interrupted` roll, then the next named turn (its prose spoken, owner
   * present) or expiry; `meanwhile` only while still running afterward.
   */
  private stepTimers(tick: SchedulerTick): ISemanticEvent[] {
    this.lastTickTurn = tick.turn;
    const world = tick.world;
    const out: ISemanticEvent[] = [];
    for (const def of this.timerDefs.values()) {
      const record = this.timerRecord(def.qualified, world);
      if (record.phase !== 'running') continue;
      if (record.startedTurn === tick.turn) continue; // first named turn is next turn
      const ownerCtx: ExecContext = def.owner && def.owner !== 'player' ? { world, it: def.owner } : { world };
      if (def.interrupted !== null && this.evaluator.evalCondition({ kind: 'chance', n: def.interrupted }, ownerCtx)) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      const index = record.index + 1;
      if (index > def.states.length) {
        out.push(...this.expireTimer(def.qualified, world));
        continue;
      }
      this.writeTimer(def.qualified, world, { ...record, index });
      const state = def.states[index - 1];
      const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
      if (table[`${def.qualified}.${state}`] && this.timerOwnerPresent(def, world)) {
        out.push(this.phraseEvent(`${def.qualified}.${state}`, { world }));
      }
      if (def.meanwhile && (def.meanwhile.chance === null || this.evaluator.evalCondition({ kind: 'chance', n: def.meanwhile.chance }, ownerCtx))) {
        out.push(...this.execStatements(def.meanwhile.body, ownerCtx));
      }
    }
    return this.narrated(out);
  }

  /** A state's prose needs its audience: the owner's room (story/player: always). */
  private timerOwnerPresent(def: IRTimerDef, world: WorldModel): boolean {
    if (def.owner === null || def.owner === 'player') return true;
    return this.playerPresentAt(world, def.owner);
  }

  private playerPresentAt(world: WorldModel, irEntityId: string): boolean {
    const ownerId = this.host.entityId(irEntityId);
    const playerId = world.getPlayer()?.id;
    if (!ownerId || !playerId) return false;
    if (ownerId === playerId) return true;
    const owner = world.getEntity(ownerId);
    if (owner?.has(TraitType.REGION)) return world.isInRegion(playerId, ownerId);
    const playerRoom = world.getContainingRoom(playerId)?.id ?? world.getLocation(playerId);
    if (owner?.has(TraitType.ROOM)) return playerRoom === ownerId;
    const ownerRoom = world.getContainingRoom(ownerId)?.id ?? world.getLocation(ownerId);
    return ownerRoom !== undefined && ownerRoom === playerRoom;
  }

  /**
   * Fire the target entity's `after <verb> it` clauses when a dispatch
   * action completes — the loader-internal mechanism the Phase 1 spike
   * confirmed (interceptor hooks never fire on the dispatch path; the
   * runtime owns these actions, so reactions run in their report phase).
   */
  private fireAfterClauses(actionName: string, target: IFEntity, world: WorldModel, actorId: string): ISemanticEvent[] {
    const out: ISemanticEvent[] = [];
    const targetIrId = this.host.irIdOf(target.id);
    if (targetIrId === undefined) return out;
    const irEntity = this.ir.entities.find((e) => e.id === targetIrId);
    if (!irEntity) return out;

    irEntity.onClauses.forEach((clause, clauseIndex) => {
      if (clause.clauseKind !== 'after' || clause.action !== actionName) return;
      // ADR-327 D1: the head names who acts.
      if (!this.actorMatches(clause.actor, actorId, world)) return;
      const ctx: ExecContext = { world, it: targetIrId };
      if (clause.condition && !this.evaluator.evalCondition(clause.condition, ctx)) return;
      const key = `${CHORD_OCCURRENCE_PREFIX}after.${irEntity.id}.${actionName}.${clauseIndex}`;
      const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
      if (clause.once && occurrence > 1) return; // `, once` (D5)
      world.setStateValue(key, occurrence);
      ctx.occurrence = occurrence;
      // Single pass: one walk cannot disagree with itself, so routing is
      // decided live and nothing is recorded (ADR-289 D1 as amended).
      out.push(...this.execStatements(clause.body, ctx));
    });
    return out;
  }

  // ------------------------------------------------------ derived (dark)

  private derivedDarkRooms(): Array<{ entity: IREntity; condition: NonNullable<IREntity['traits'][number]['condition']> }> {
    const out = [];
    for (const entity of this.ir.entities) {
      for (const trait of entity.traits) {
        if (trait.name === 'dark' && trait.condition) out.push({ entity, condition: trait.condition });
      }
    }
    return out;
  }

  // ADR-240 D4: `recomputeDerived` and its trigger wiring are DELETED — the
  // registered evaluators above are consulted live at every read; there is
  // no cached derivation left to refresh.

  /**
   * Blocked-exit refusal text, resolved AT REFUSAL TIME (ADR-240 D6): a
   * multi-variant phrase honors its strategy per attempt — `randomly`
   * through the seeded story RNG, `cycling`/`stopping`/`first-time`
   * through a world-state counter, `sticky` through a stored pick — so
   * refusal text varies exactly as ADR-211 phrase semantics intend.
   */
  private blockedPhraseText(key: string, world: WorldModel): string {
    const phrase = this.ir.phrases.locales[this.ir.phrases.defaultLocale]?.[key];
    if (!phrase) return '';
    const variants = phrase.variants;
    if (variants.length <= 1) return variants[0]?.text ?? '';

    const stateKey = `${CHORD_OCCURRENCE_PREFIX}blocked.${key}`;
    switch (phrase.strategy) {
      case 'randomly':
        return variants[this.evaluator.pickIndex(variants.length, world)].text;
      case 'sticky': {
        const stored = world.getStateValue(stateKey);
        if (typeof stored === 'number') return variants[stored]!.text;
        const pick = this.evaluator.pickIndex(variants.length, world);
        world.setStateValue(stateKey, pick);
        return variants[pick]!.text;
      }
      case 'stopping': {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, Math.min(n + 1, variants.length - 1));
        return variants[Math.min(n, variants.length - 1)]!.text;
      }
      case 'first-time': {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, n + 1);
        return variants[n === 0 ? 0 : Math.min(1, variants.length - 1)]!.text;
      }
      case 'cycling':
      default: {
        const n = (world.getStateValue(stateKey) as number | undefined) ?? 0;
        world.setStateValue(stateKey, n + 1);
        return variants[n % variants.length]!.text;
      }
    }
  }

  // ------------------------------------------------------------ statements

  /**
   * Execute a statement tree. `phase` narrows which leaves act:
   * 'mutations' applies change/set/move only; 'reports' collects
   * phrase/emit/win/lose only; 'all' (rules) does both in source order.
   */
  private execStatements(
    body: IRStatement[],
    ctx: ExecContext,
    phase: 'all' | 'mutations' | 'reports' = 'all',
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const ledger = ctx.ledger ?? DecisionLedger.live();
    // Statement `when` suffix (ratchet D7): the statement acts only if the
    // condition holds. ADR-289 D1 as amended — the truth is decided at this
    // statement's OWN position during the mutations pass and replayed in the
    // reports pass, so each line sees the effects of the lines above it and
    // both passes agree. (The comment that stood here claimed the passes
    // agree because the suffix runs before either phase's own mutations. That
    // is the guarantee that did not hold: `phrase … when it is armed`
    // followed by `change it to spent` emitted nothing, because by the reports
    // pass the mutation had already landed.)
    const whenHolds = (stmt: IRStatement & { stmtWhen?: IRCondition | null }): boolean => {
      const suffix = stmt.stmtWhen;
      if (!suffix) return true;
      return ledger.resolve(stmt, 'when', () => this.evaluator.evalCondition(suffix, ctx));
    };
    for (const stmt of body) {
      // Evaluated FIRST, before the phase gate, so the mutations pass decides
      // (and records) the suffix of a report-only statement at its position in
      // the sequence. Short-circuiting on `phase` here — as `phase !== '…' &&
      // whenHolds(stmt)` used to — would skip the recording pass entirely for
      // phrase/emit/win/lose/kill and leave the reports pass to re-derive.
      const holds = whenHolds(stmt);
      switch (stmt.kind) {
        case 'phrase':
          if (phase !== 'mutations' && holds) events.push(this.phraseEvent(stmt.phraseKey, ctx, stmt.params));
          break;
        case 'emit':
          // ADR-216: the payload evaluates live against the turn context —
          // literals as numbers/strings, value expressions through the
          // shared evaluator, arrays/objects recursively.
          // ADR-256: the Chord IR event id is dotless; translate it to the
          // platform runtime type here (media.* → dotted; author events pass
          // through). Not inside rawEvent — that also mints the internal
          // `chord.phrase` event, which must not be translated.
          if (phase !== 'mutations' && holds) events.push(this.rawEvent(translateEventId(stmt.event), this.emitPayload(stmt.payload, ctx)));
          break;
        case 'win':
        case 'lose':
          if (phase !== 'mutations' && holds) {
            if (stmt.phraseKey) events.push(this.phraseEvent(stmt.phraseKey, ctx));
            events.push(
              this.host.triggerEnding(ctx.world, stmt.kind === 'win' ? 'victory' : 'defeat', stmt.phraseKey ?? undefined),
            );
          }
          break;
        case 'kill':
          // `kill the player` (ADR-227 Decision 4): terminal death via the
          // platform's killPlayer sink — the engine routes game-over off the
          // canonical if.event.player.died it returns; triggerEnding is NOT
          // called (a distinct lowering target from win/lose). The phrase
          // carries the death text; the cause derives from the phrase key.
          if (phase !== 'mutations' && holds) {
            if (stmt.phraseKey) events.push(this.phraseEvent(stmt.phraseKey, ctx));
            const player = ctx.world.getPlayer();
            if (player) {
              const died = killPlayer(ctx.world, player, {
                cause: stmt.phraseKey ?? 'killed',
                terminal: true,
              });
              if (died) events.push(died);
            }
          }
          break;
        case 'change': {
          if (phase !== 'reports' && holds) {
            if (stmt.entity.kind === 'story') {
              // `change the story to <state>` — the story object's phase (D2).
              this.checkForwardMarch(
                this.ir.story.states,
                this.ir.story.reversible,
                ctx.world.getStateValue(CHORD_STORY_STATE_KEY),
                stmt.state,
                'the story',
                stmt.span,
              );
              ctx.world.setStateValue(CHORD_STORY_STATE_KEY, stmt.state);
            } else {
              const irId = this.irIdOfValue(stmt.entity, ctx);
              const set = this.stateSetOf(irId, stmt.state);
              if (set) {
                this.checkForwardMarch(
                  set.states,
                  set.reversible,
                  ctx.world.getStateValue(CHORD_STATE_PREFIX + irId),
                  stmt.state,
                  irId,
                  stmt.span,
                );
              }
              ctx.world.setStateValue(CHORD_STATE_PREFIX + irId, stmt.state);
            }
          }
          break;
        }
        case 'move': {
          if (phase !== 'reports' && holds) {
            const thing = this.evaluator.entityValue(stmt.entity, ctx);
            this.moveWithLifecycle(thing, this.resolvePlace(stmt.place, ctx, thing), ctx);
          }
          break;
        }
        case 'remove': {
          if (phase !== 'reports' && holds) {
            const thing = this.evaluator.entityValue(stmt.entity, ctx);
            // Z6 (ADR-213): the loader's pre-removal observer fires inside
            // removeEntity and enqueues any witnessed `disappeared`
            // narration; the report-collecting pass drains it. Never
            // rendered inline from the mutation pass.
            ctx.world.removeEntity(thing);
          }
          break;
        }
        case 'set': {
          if (phase !== 'reports' && holds) {
            const value = this.evaluator.evalValue(stmt.value, ctx);
            if (stmt.target.kind === 'field' && stmt.target.field === 'landing') {
              // `set <region>'s landing to <room>` (ADR-325 D5).
              const regionId = this.evaluator.entityValue(stmt.target.base, ctx);
              if (typeof value !== 'string' || !ctx.world.getEntity(value)?.has(TraitType.ROOM)) {
                throw new LoadError('A landing is set to a room.', stmt.span);
              }
              this.evaluator.setLanding(regionId, value, ctx.world);
            } else if (stmt.target.kind === 'field') {
              // Trait data fields (`set its treats to 3`) write the entity's
              // chord trait instance — world state via traits (AC-6-safe).
              const baseId = this.evaluator.entityValue(stmt.target.base, ctx);
              this.writeChordTraitField(ctx.world, baseId, stmt.target.field, value, stmt.span);
            } else {
              throw new LoadError('`set` targets a trait data field.', stmt.span);
            }
          }
          break;
        }
        case 'award': {
          if (phase !== 'reports' && holds) {
            // `award <score>` — dedup by identity (ADR-129), so repeat
            // awards are no-ops and `, once` is automatic. Names arrive
            // owner-qualified from the analyzer (ratchet D12).
            if (stmt.expression.length !== 1) {
              throw new LoadError('Only `award <score-name>` is supported (expression awards are later scope).', stmt.span);
            }
            const name = stmt.expression[0];
            const worth = this.scoreWorth.get(name);
            if (worth === undefined) {
              throw new LoadError(`\`${name}\` is not a declared score.`, stmt.span);
            }
            ctx.world.awardScore(name, worth, name);
          }
          break;
        }
        case 'timer': {
          // ADR-325 D3c: the five verbs. `interrupt` expires the timer now
          // and fires its expiry clauses in place — decided once in the
          // mutations pass, their narration replayed to the reports pass.
          if (!holds) break;
          const fired = ledger.resolve(stmt, 'expiry', () => this.runTimerVerb(stmt.verb, stmt.timer, ctx));
          if (phase !== 'mutations') events.push(...fired);
          break;
        }
        case 'raise':
        case 'lower': {
          // ADR-264 D2: additive counter mutation with silent two-sided clamp.
          if (phase !== 'reports' && holds) {
            const ownerIrId = stmt.owner === null ? null : this.irIdOfValue(stmt.owner, ctx);
            const key = counterKey(stmt.counter, ownerIrId ?? undefined);
            const bounds = this.counterBounds(stmt.counter, ownerIrId);
            const current = Number(ctx.world.getStateValue(key) ?? 0);
            let next = current + (stmt.kind === 'raise' ? stmt.amount : -stmt.amount);
            if (bounds) {
              if (bounds.lo !== null && next < bounds.lo) next = bounds.lo;
              if (bounds.hi !== null && next > bounds.hi) next = bounds.hi;
            }
            ctx.world.setStateValue(key, next);
          }
          break;
        }
        case 'set-counter': {
          // ADR-325 D4: absolute tally assignment, clamped like raise/lower.
          if (phase !== 'reports' && holds) {
            const ownerIrId = stmt.owner === null ? null : this.irIdOfValue(stmt.owner, ctx);
            const key = counterKey(stmt.counter, ownerIrId ?? undefined);
            const bounds = this.counterBounds(stmt.counter, ownerIrId);
            let next = stmt.value;
            if (bounds) {
              if (bounds.lo !== null && next < bounds.lo) next = bounds.lo;
              if (bounds.hi !== null && next > bounds.hi) next = bounds.hi;
            }
            ctx.world.setStateValue(key, next);
          }
          break;
        }
        case 'refuse':
        case 'must':
        case 'refuse-when':
          // The refusal partition is consumed by findRefusal (validate
          // phase); nothing to do in execute/report passes.
          break;
        case 'change-mood':
        case 'change-feeling': {
          // ADR-310 D3 transitions: the clause owner's character model
          // mutates in the mutations pass; the from→to record replays to
          // the reports pass, which emits the author-channel transition
          // row (D11) — never player prose (D12).
          if (!holds) break;
          const record = ledger.resolve(stmt, 'transition', () => this.execCharacterTransition(stmt, ctx));
          if (phase !== 'mutations' && record && record.from !== record.to) {
            events.push({
              id: `chord-${record.type}-${this.eventSeq++}`,
              type: record.type,
              timestamp: Date.now(),
              entities: { actor: record.actor },
              data: {
                from: record.from,
                to: record.to,
                ...(record.target !== undefined ? { target: record.target } : {}),
              },
            });
          }
          break;
        }
        case 'select-on': {
          const decided = ledger.resolve(stmt, 'arm', () => this.decideSelectOn(stmt, ctx));
          const arm = stmt.arms.find((a) => a.value === decided);
          if (arm) events.push(...this.execStatements(arm.body, ctx, phase));
          break;
        }
        case 'select-strategy': {
          // ADR-289 D1: the counter is consumed by the mutations pass, at this
          // position, and the index replayed to the reports pass. Deciding in
          // both passes is the H1 double-advance.
          const index = ledger.resolve(stmt, 'alternative', () => this.decideStrategy(stmt, ctx));
          const alternative = stmt.alternatives[index];
          if (alternative) events.push(...this.execStatements(alternative, ctx, phase));
          break;
        }
        case 'ordinal': {
          const met = ledger.resolve(stmt, 'ordinalMet', () => ctx.occurrence === stmt.ordinal);
          if (met) {
            events.push(...this.execStatements(stmt.body, ctx, phase));
          }
          break;
        }
        case 'each':
          // E3 (ratchet 2026-07-12): run the body once per matching entity
          // in creation order, `the match` bound to it; `it` and every
          // other binding pass through untouched. Empty set = no-op.
          //
          // ADR-289 D1: the match SET is recorded (one answer, keyed by this
          // statement), but the BODY runs under a live ledger in both passes.
          // The record is keyed by statement identity alone, so recording
          // inside the body would hand every iteration the last iteration's
          // answer. Live-in-both-passes is how `each` bodies behaved before
          // the ledger existed; the two passes may disagree there, and that
          // is D1's one recorded gap.
          for (const irId of this.eachMatches(stmt, ctx)) {
            events.push(...this.execStatements(stmt.body, { ...ctx, match: irId, ledger: DecisionLedger.live() }, phase));
          }
          break;
        case 'then-open':
        case 'deflect':
        case 'leave':
        case 'hold-tongue':
          // ADR-320 conversation statements are extracted by the dialogue
          // dispatch paths before a body reaches this walker (`hold-tongue`
          // never leaves authoredInitiativeFor). Reaching one here is rogue
          // IR — loud failure, never a silent fallthrough (Phase 7 design §7).
          throw new LoadError(
            `Conversation statement \`${stmt.kind}\` outside dialogue dispatch.`,
            stmt.span,
          );
      }
    }
    // Z3: witnessed lifecycle narration enqueued during mutation phases
    // (move/remove above; the removal observer) lands in the next report-
    // collecting pass. Mutations-only passes never drain — their return
    // value is discarded by the interceptor call sites.
    if (phase !== 'mutations') events.push(...this.drainChannelEvents());
    return events;
  }

  /**
   * Z3: `move` with witnessed-only lifecycle narration (D11). `exited`
   * fires when the player shares the mover's SOURCE room at the transition
   * (and the move really changes rooms); `entered` when the player shares
   * the DESTINATION room after arrival. Unwitnessed transitions narrate
   * nothing and consume nothing; narration is enqueued, never emitted
   * inline from the mutation pass. Moving the player itself never narrates.
   *
   * @param thingWorldId the moved entity's world id
   * @param placeWorldId the destination's world id
   * @param ctx the executing context (live world)
   */
  /**
   * Resolve a `move` destination (ADR-325 D1–D2) to a world id, or null for
   * `offstage`. A possessive `location` whose owner is offstage has no
   * place to move to: a diagnostic naming the owner, never a silent no-op.
   */
  private resolvePlace(place: IRValue, ctx: ExecContext, moverWorldId: string): string | null {
    if (place.kind === 'symbol' && place.name === 'offstage') return null;
    if (place.kind === 'symbol' && place.name === 'adjacent-room') {
      // ADR-326 D1–D3: drawn at effect time from the mover's own room.
      const drawn = this.evaluator.drawAdjacentRoom(moverWorldId, ctx.world);
      if (drawn === undefined) {
        const mover = ctx.world.getEntity(moverWorldId);
        const roomId = ctx.world.getContainingRoom(moverWorldId)?.id ?? ctx.world.getLocation(moverWorldId);
        const room = roomId ? ctx.world.getEntity(roomId) : undefined;
        throw new LoadError(
          `Cannot move ${mover?.name ?? moverWorldId} to a random adjacent room — no exit from ${room?.name ?? 'its location'} is traversable right now.`,
        );
      }
      return drawn;
    }
    const resolved = this.evaluator.evalValue(place, ctx);
    if (typeof resolved === 'string' && ctx.world.getEntity(resolved)) {
      // ADR-325 D5: a region with a landing is a place — land there.
      return this.evaluator.drawLanding(resolved, ctx.world) ?? resolved;
    }
    if (place.kind === 'field' && place.field === 'location') {
      const ownerId = this.evaluator.evalValue(place.base, ctx);
      const owner = typeof ownerId === 'string' ? ctx.world.getEntity(ownerId) : undefined;
      const name = owner?.name ?? 'the owner';
      throw new LoadError(`Cannot move to ${name}'s location — ${name} is offstage.`);
    }
    throw new LoadError(`Expected a place, got \`${String(resolved)}\`.`);
  }

  /**
   * Move an entity and enqueue what the player witnessed: `exited` when it
   * leaves the player's room, `entered` when it arrives, and `disappeared`
   * (ADR-325 D2, the same row `remove` uses) when it goes offstage from the
   * player's room. `placeWorldId` null detaches the entity (offstage).
   */
  private moveWithLifecycle(thingWorldId: string, placeWorldId: string | null, ctx: ExecContext): void {
    const world = ctx.world;
    const roomOf = (id: string): string | undefined =>
      world.getContainingRoom(id)?.id ?? world.getLocation(id);
    const fromRoom = roomOf(thingWorldId);
    world.moveEntity(thingWorldId, placeWorldId);
    const toRoom = roomOf(thingWorldId);

    this.witnessMove(thingWorldId, placeWorldId, fromRoom, toRoom, world);

    // ADR-327 D5: an arrival is an arrival, walked or moved — a room
    // transition fires the destination's entering clauses and every
    // `when <entity> moves` clause for the mover, whoever the mover is.
    if (placeWorldId !== null && toRoom !== undefined && fromRoom !== toRoom) {
      this.fireMoveArrival(thingWorldId, fromRoom, toRoom, world);
    }
  }

  /** The witnessed `exited`/`entered`/`disappeared` rows for a move (ADR-325 D2, Z3). */
  private witnessMove(
    thingWorldId: string,
    placeWorldId: string | null,
    fromRoom: string | undefined,
    toRoom: string | undefined,
    world: WorldModel,
  ): void {
    const playerId = world.getPlayer()?.id;
    if (!playerId || thingWorldId === playerId) return;
    const irId = this.host.irIdOf(thingWorldId);
    if (!irId) return;
    if (fromRoom === toRoom) return; // not a room transition — nothing to witness
    const playerRoom = roomOfIn(world, playerId);
    if (playerRoom === undefined) return;
    if (playerRoom === fromRoom) {
      const event = this.channelEvent(irId, placeWorldId === null ? 'disappeared' : 'exited', world);
      if (event) this.enqueueChannelEvent(event);
    }
    if (playerRoom === toRoom) {
      const event = this.channelEvent(irId, 'entered', world);
      if (event) this.enqueueChannelEvent(event);
    }
  }

  /** Nesting depth of move-arrival firings in flight (ADR-327 D5's re-entry cap). */
  private moveArrivalDepth = 0;
  /** The rooms of the arrival chain in flight, for the diagnostic. */
  private readonly moveArrivalChain: string[] = [];

  /**
   * Fire the loader's own arrival for a `move` (ADR-327 D5): the destination
   * room's `entering` event clauses and the `when <entity> moves` clauses,
   * exactly as a walked arrival's `actor_moved` would through the engine's
   * chain — but fired here, not emitted, so the engine never fires them a
   * second time. Whatever the clauses produce is enqueued as channel
   * narration and drained by the enclosing report pass (the Z3 sink).
   * @throws LoadError `runtime.move-arrival-reentry` past 8 nested arrivals
   */
  private fireMoveArrival(actorId: string, fromRoom: string | undefined, toRoom: string, world: WorldModel): void {
    if (this.moveArrivalDepth >= MOVE_ARRIVAL_DEPTH_CAP) {
      const chain = [...this.moveArrivalChain, toRoom].map((id) => world.getEntity(id)?.name ?? id).join(' → ');
      throw new LoadError(
        `runtime.move-arrival-reentry: a \`move\` arrival re-entered ${MOVE_ARRIVAL_DEPTH_CAP} times (${chain}) — an entering clause keeps moving the arriver into a room whose entering clause moves them again.`,
      );
    }
    const event: ISemanticEvent = {
      id: `chord-move-arrival-${++this.eventSeq}`,
      type: EVENT_TRIGGERS.entering,
      timestamp: Date.now(),
      entities: { actor: actorId },
      data: { actorId, fromRoom, toRoom },
    };
    this.moveArrivalDepth++;
    this.moveArrivalChain.push(toRoom);
    try {
      const produced = [...this.fireEventClauses(world, event), ...this.fireMoveClauses(world, event)];
      for (const e of produced) this.enqueueChannelEvent(e);
    } finally {
      this.moveArrivalDepth--;
      this.moveArrivalChain.pop();
    }
  }

  /**
   * The declared set a `change` target state belongs to on an entity, with
   * its D4 policy — a composed trait's set, or the entity's own `states:`
   * line (merged list minus trait states). Null when the state is unknown
   * (the analyzer gates that; being lenient here keeps the check pure).
   */
  private stateSetOf(irId: string, state: string): { states: string[]; reversible: boolean } | null {
    const irEntity = this.ir.entities.find((e) => e.id === irId);
    if (!irEntity) return null;
    const traitStates = new Set<string>();
    for (const comp of irEntity.traits) {
      const trait = this.ir.traits.find((t) => t.name === comp.name);
      if (!trait) continue;
      if (trait.states.includes(state)) {
        return { states: trait.states, reversible: trait.statesReversible };
      }
      for (const s of trait.states) traitStates.add(s);
    }
    const own = irEntity.states.filter((s) => !traitStates.has(s));
    return own.includes(state) ? { states: own, reversible: irEntity.statesReversible } : null;
  }

  /**
   * D4 forward-march, runtime half: within a non-reversible set, `change`
   * may only move forward in declaration order. (The analyzer catches the
   * statically provable case — change-to-initial; this catches the rest
   * with the live current state.) Cross-set transitions and same-state
   * no-ops pass.
   */
  private checkForwardMarch(
    states: string[],
    reversible: boolean,
    current: unknown,
    target: string,
    ownerDesc: string,
    span?: import('@sharpee/chord').Span,
  ): void {
    if (reversible || typeof current !== 'string') return;
    const from = states.indexOf(current);
    const to = states.indexOf(target);
    if (from >= 0 && to >= 0 && to < from) {
      throw new LoadError(
        `\`change\` to \`${target}\` moves ${ownerDesc} backward in a forward-only set (currently \`${current}\`) — add \`, reversible\` to the \`states:\` line to permit back-transitions (D4).`,
        span,
      );
    }
  }

  /**
   * Leading-refusal scan (§5.4 validate partition): unconditional `refuse`,
   * `must` requirements (refuse when the requirement FAILS, ratchet D6),
   * and `refuse when` prohibitions (refuse when the hazard HOLDS) — checked
   * in source order until the first non-refusal statement.
   */
  private findRefusal(body: IRStatement[], ctx: ExecContext): RefusalVeto | null {
    for (const stmt of body) {
      if (stmt.kind === 'refuse') return this.refusalOf(stmt.phraseKey, ctx);
      if (stmt.kind === 'must') {
        if (!this.evaluator.evalCondition(stmt.condition, ctx)) return this.refusalOf(stmt.phraseKey, ctx);
        continue;
      }
      if (stmt.kind === 'refuse-when') {
        if (this.evaluator.evalCondition(stmt.condition, ctx)) return this.refusalOf(stmt.phraseKey, ctx);
        continue;
      }
      break; // first non-refusal statement ends the validate partition
    }
    return null;
  }

  /**
   * Resolve a refusal phrase key to its veto payload. A per-entity
   * `phrase <key>:` declaration registers entity-scoped as `<irId>.<key>` —
   * the same override rule `phraseEvent` applies at emit time — so a bare
   * refusal key written inside that entity's clause must travel as the
   * scoped id: the key crosses into stdlib's blocked() as a fully-qualified
   * message id (ADR-231 D1). A key with a phrase-table entry additionally
   * stages that phrase's render params — in particular the strategy
   * variants as a Choice — so the refusal selects an arm exactly as a
   * `phrase <key>` statement does, instead of rendering the registered
   * `{variants}` template's placeholder literally (GH #304). A key with no
   * table entry (a bare message id, or a book-covered key whose template
   * the render-path book layer supplies, ADR-250) travels alone, as before.
   */
  private refusalOf(key: string, ctx: ExecContext): RefusalVeto {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    if (!phrase) return { error: overrideKey };
    const params: Record<string, unknown> = {};
    this.stagePhraseParams(params, overrideKey, phrase, null, ctx);
    return Object.keys(params).length > 0 ? { error: overrideKey, params } : { error: overrideKey };
  }

  /**
   * The match set for an `each` block: decided by the mutations pass at this
   * statement's position and replayed to the reports pass (§5.4 — the report
   * pass must visit the same entities the execute pass did, even after the
   * body's own mutations change who matches). Live in single-pass contexts.
   */
  private eachMatches(stmt: Extract<IRStatement, { kind: 'each' }>, ctx: ExecContext): string[] {
    const ledger = ctx.ledger ?? DecisionLedger.live();
    return ledger.resolve(stmt, 'matches', () => this.evaluator.matchesOf(stmt.condition, ctx));
  }

  private decideSelectOn(stmt: Extract<IRStatement, { kind: 'select-on' }>, ctx: ExecContext): string {
    return String(this.evaluator.evalValue(stmt.subject, ctx));
  }

  private decideStrategy(stmt: Extract<IRStatement, { kind: 'select-strategy' }>, ctx: ExecContext): number {
    const count = stmt.alternatives.length;
    if (count === 0) return 0;
    // Occurrence-ordered strategies key off world state; randomly keys off
    // the persisted chance stream (via one draw per firing). Sticky (Z5)
    // reuses the same slot with the Choice encoding instead of an
    // occurrence count: stored = chosen index + 1, 0/undefined = unchosen.
    const key = selectOccurrenceKey(stmt.id, ctx.owner);
    if (stmt.strategy === 'sticky') {
      const stored = ctx.world.getStateValue(key) as number | undefined;
      if (stored && stored > 0) return Math.min(stored - 1, count - 1);
      const i = this.randomIndex(count, ctx);
      ctx.world.setStateValue(key, i + 1);
      return i;
    }
    const n = (ctx.world.getStateValue(key) as number | undefined) ?? 0;
    ctx.world.setStateValue(key, n + 1);
    switch (stmt.strategy) {
      case 'cycling':
        return n % count;
      case 'stopping':
        return Math.min(n, count - 1);
      case 'first-time':
        return n === 0 ? 0 : Math.min(1, count - 1);
      case 'randomly':
        return this.randomIndex(count, ctx);
      default:
        throw new LoadError(`Unknown select strategy \`${stmt.strategy}\`.`, stmt.span);
    }
  }

  private randomIndex(count: number, ctx: ExecContext): number {
    // Reuse the persisted chance stream: draw until a bucket resolves.
    for (let i = 0; i < count - 1; i++) {
      if (this.evaluator.evalCondition({ kind: 'chance', n: count - i }, ctx)) return i;
    }
    return count - 1;
  }

  // --------------------------------------------------------------- phrases

  /** Z3 lifecycle narration awaiting the next report-collecting pass (never rendered inline — ADR-213 §2). */
  private readonly pendingChannelEvents: ISemanticEvent[] = [];

  /** Enqueue witnessed channel narration (Z3) — it lands in the turn's report pass. */
  enqueueChannelEvent(event: ISemanticEvent): void {
    this.pendingChannelEvents.push(event);
  }

  /** Drain pending channel narration (Z3) — report-collecting passes and the drain daemon consume it. */
  drainChannelEvents(): ISemanticEvent[] {
    return this.pendingChannelEvents.splice(0, this.pendingChannelEvents.length);
  }

  /**
   * Z3: build the channel phrase event for an owner (`entered` / `exited` /
   * `disappeared`). The phrase is the owner's `<irId>.<channel>` block;
   * `Choice` counters key `(ownerWorldId, channel)` — ADR-212 §4's owner +
   * channel-key convention, shared with the `present` slot entries.
   *
   * @param ownerIrId the channel owner's IR entity id
   * @param channel the channel key (`entered`/`exited`/`disappeared`)
   * @param world the live world
   * @returns the phrase event, or null when the owner has no such block
   */
  channelEvent(ownerIrId: string, channel: string, world: WorldModel): ISemanticEvent | null {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    if (!table[`${ownerIrId}.${channel}`]) return null;
    const ownerWorldId = this.host.entityId(ownerIrId);
    if (!ownerWorldId) return null;
    return this.phraseEvent(`${ownerIrId}.${channel}`, { world, it: ownerIrId }, undefined, {
      entityId: ownerWorldId,
      messageKey: channel,
    });
  }

  /**
   * Build the semantic event for `phrase <key>`: entity-scoped override
   * resolution (prereq 4), strategy variants as a persistent Choice atom,
   * and hatch producers bound by marker name.
   *
   * @param counter Z3 channel counter identity — overrides the default
   *   `('chord', overrideKey)` Choice keying with `(owner, channelKey)`.
   */
  private phraseEvent(
    key: string,
    ctx: ExecContext,
    stmtParams?: ReadonlyArray<{ param: string; value: IRValue }>,
    counter?: { entityId: string; messageKey: string },
  ): ISemanticEvent {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    // ADR-250: a key covered only by phrasebooks has no table entry — emit
    // the bare key (the render-path book layer supplies the winning
    // template and its Choice) but still stage stmt params and any hatch
    // producers the book entries reference, since staging is emit-time work.
    const bookVariants: IRPhraseVariant[] | null = phrase ? null : this.bookEntriesFor(key).flatMap((e) => e.variants);
    if (!phrase && bookVariants!.length === 0) {
      throw new LoadError(`Phrase \`${key}\` is missing from the IR at emit time.`);
    }

    const params: Record<string, unknown> = {};
    // Authored `with <param> = <value>` bindings (zoo-chain follow-up,
    // 2026-07-12): entity values pass as their display name (the template's
    // article hint does the rest); scalars pass through.
    for (const p of stmtParams ?? []) {
      const value = this.evaluator.evalValue(p.value, ctx);
      const asEntity = typeof value === 'string' ? ctx.world.getEntity(value) : undefined;
      params[p.param] = asEntity ? asEntity.name : (value as string | number | boolean);
    }
    this.stagePhraseParams(params, overrideKey, phrase ?? null, bookVariants, ctx, counter);
    return this.rawEvent('chord.phrase', { messageId: overrideKey, params });
  }

  /**
   * Stage the render params a phrase's template consumes — hatch producers
   * bound by marker name, grammar-slot bindings, verbatim text, and the
   * strategy variants as a persistent Choice atom. Shared by `phraseEvent`
   * (`phrase <key>` statements) and `refusalOf` (the validate partition's
   * veto path): a refusal keyed to a strategy phrase must carry the same
   * Choice the statement path carries, or the registered `{variants}`
   * template renders its raw placeholder.
   *
   * @param params Mutated in place. Keys already present (authored `with`
   *   bindings) are overridden by hatch producers but win over grammar-slot
   *   bindings — exactly the precedence `phraseEvent` had before this was
   *   extracted.
   */
  private stagePhraseParams(
    params: Record<string, unknown>,
    overrideKey: string,
    phrase: IRPhrase | null,
    bookVariants: IRPhraseVariant[] | null,
    ctx: ExecContext,
    counter?: { entityId: string; messageKey: string },
  ): void {
    for (const variant of phrase ? phrase.variants : bookVariants!) {
      for (const marker of variant.markers) {
        const producer = this.host.producers.get(marker);
        if (producer) {
          // Params carry phrase ATOMS, not functions — the template binder
          // string-coerces anything that isn't a Phrase (ADR-196: producers
          // are invoked at staging, their atoms realized by the assembler).
          // The context is the narrow staging facade (design.md §5.6): a
          // producer reaching outside it fails HERE, named, not as an
          // anonymous TypeError downstream.
          try {
            params[marker] = producer(stagingRenderContext(ctx.world));
          } catch (error) {
            throw new LoadError(
              `Hatch \`${marker}\` threw while staging phrase \`${overrideKey}\`: ${error instanceof Error ? error.message : String(error)}. Hatches see the narrow staging context only (design.md §5.6).`,
            );
          }
        }
      }
    }
    // Grammar-slot params (`{the target}` in a dispatch-action or trait
    // clause body, zoo-chain fixes 2026-07-12): the slot entity's name
    // binds as the NounPhrase-default string — the template's own article
    // hint supplies `the`/`a`. Producers above win on a name collision.
    // ADR-275 D2: a WORD binding (semantic value — `direction`, `means`
    // keys) has no entity to resolve and renders VERBATIM — bound as a
    // Literal atom, which the template binder passes through untouched
    // (never an article-bearing NounPhrase: "swings port", not "swings
    // the port").
    if (ctx.slots) {
      for (const [name, worldId] of Object.entries(ctx.slots)) {
        if (params[name] !== undefined) continue;
        const slotEntity = ctx.world.getEntity(worldId);
        params[name] = slotEntity ? slotEntity.name : ({ kind: 'literal', text: worldId } satisfies Literal);
      }
    }
    if (phrase?.verbatim) {
      // `{verbatim:text}` template (loader registration) — the atom is
      // exempt from whitespace collapse, so line structure and interior
      // spacing survive as authored (grammar log 2026-07-10).
      params.text = phrase.variants[0]?.text ?? '';
    } else if (phrase?.strategy) {
      const choice: Choice = {
        kind: 'choice',
        alternatives: phrase.variants.map((v): Literal => ({ kind: 'literal', text: withLineBreaks(v.text) })),
        selector: STRATEGY_SELECTOR[phrase.strategy],
        entityId: counter?.entityId ?? 'chord',
        messageKey: counter?.messageKey ?? overrideKey,
      };
      params.variants = choice;
    }
  }

  /**
   * Evaluate an emit payload (ADR-216) against the live turn context.
   * Keys pass VERBATIM; number literals become numbers; `true`/`false`
   * symbols become booleans; other value expressions evaluate through the
   * shared evaluator (entity refs → world ids, field reads → live values).
   */
  private emitPayload(fields: IREmitField[] | undefined, ctx: ExecContext): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const field of fields ?? []) {
      data[field.key] = this.emitValue(field.value, ctx);
    }
    return data;
  }

  private emitValue(value: IREmitValue, ctx: ExecContext): unknown {
    switch (value.kind) {
      case 'literal':
        return value.valueType === 'number' ? Number(value.value) : value.value;
      case 'value':
        if (value.value.kind === 'symbol' && (value.value.name === 'true' || value.value.name === 'false')) {
          return value.value.name === 'true';
        }
        return this.evaluator.evalValue(value.value, ctx);
      case 'array':
        return value.items.map((item) => this.emitValue(item, ctx));
      case 'object': {
        const nested: Record<string, unknown> = {};
        for (const field of value.fields) nested[field.key] = this.emitValue(field.value, ctx);
        return nested;
      }
    }
  }

  /**
   * The declared bounds of a counter (ADR-264 D2) — story-global when
   * `entityIrId` is null, else the entity's own counter. Undefined when
   * unbounded / undeclared (no clamp).
   */
  private counterBounds(counter: string, entityIrId: string | null): { lo: number | null; hi: number | null } | undefined {
    if (entityIrId === null) {
      const def = this.ir.counters.find((c) => c.name === counter);
      return def ? { lo: def.lo, hi: def.hi } : undefined;
    }
    const entity = this.ir.entities.find((e) => e.id === entityIrId);
    const def = entity?.counters.find((c) => c.name === counter);
    return def ? { lo: def.lo, hi: def.hi } : undefined;
  }

  /**
   * ADR-310 D3 transition statements (`change mood to <word>`, `change
   * feeling toward <target> to <word>`): mutate the clause owner's
   * character model and return the from→to record the reports pass
   * replays as the author-channel transition row.
   *
   * @param stmt - The transition statement
   * @param ctx - The executing clause's context (`it` is the owner)
   * @returns The transition record, for the reports pass to emit
   * @throws LoadError when the owner carries no character model or the
   *   mood word is unknown to the manifest + custom-mood table
   */
  private execCharacterTransition(
    stmt: Extract<IRStatement, { kind: 'change-mood' } | { kind: 'change-feeling' }>,
    ctx: ExecContext,
  ): { type: string; actor: string; from: string; to: string; target?: string } {
    const ownerWorldId = ctx.it !== undefined ? this.host.entityId(ctx.it) : undefined;
    const owner = ownerWorldId !== undefined ? ctx.world.getEntity(ownerWorldId) : undefined;
    const trait = owner?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (ownerWorldId === undefined || !trait) {
      // A transition on a person without the model is an authoring error,
      // not a silent no-op (the loader's loud-wiring rule).
      throw new LoadError('`change mood`/`change feeling` targets a character-model person.', stmt.span);
    }
    if (stmt.kind === 'change-mood') {
      const axes = this.evaluator.moodAxesFor(stmt.mood);
      if (!axes) throw new LoadError(`Unknown mood \`${stmt.mood}\`.`, stmt.span);
      const from = trait.getMood();
      trait.moodValence = axes.valence;
      trait.moodArousal = axes.arousal;
      return { type: 'npc.character.mood_changed', actor: ownerWorldId, from, to: stmt.mood };
    }
    const targetWorldId = this.evaluator.entityValue(stmt.target, ctx);
    const from = trait.getDispositionWord(targetWorldId);
    trait.setDisposition(targetWorldId, stmt.disposition as DispositionWord);
    return {
      type: 'npc.character.disposition_changed',
      actor: ownerWorldId,
      from,
      to: stmt.disposition,
      target: targetWorldId,
    };
  }

  private rawEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
    return {
      id: `chord-${type}-${this.eventSeq++}`,
      type,
      timestamp: Date.now(),
      entities: {},
      data,
    };
  }

  // --------------------------------------------------------------- helpers

  private irIdOfValue(value: IRValue, ctx: ExecContext): string {
    if (value.kind === 'entity') return value.id;
    if (value.kind === 'it') {
      if (!ctx.it) throw new LoadError('`it` used outside an entity-scoped clause.');
      return ctx.it;
    }
    const worldId = this.evaluator.entityValue(value, ctx);
    const irId = this.host.irIdOf(worldId);
    if (!irId) throw new LoadError('Cannot change the state of a non-story entity.');
    return irId;
  }
}
