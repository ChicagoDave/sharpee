/**
 * dispatch-verbs.ts — the runtime's dispatch verbs section.
 *
 * Dispatch verbs and trait clauses: every `define action` becomes one
 * platform action whose validate/execute/report run the clause bodies over
 * the bound slots; `define trait` clauses register per trait type as
 * capability behaviors (dispatch verbs) or merged interceptors (standard
 * actions), and `set`-able trait fields write through one helper.
 *
 * Public interface: DispatchVerbsSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IRActionDef, IROnClause, Span } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice } from '@sharpee/if-domain';
import { type ActionInterceptor, type CapabilityBehavior, type CapabilityEffect, type CapabilitySharedData, type CapabilityValidationResult, Direction, IFEntity, type InterceptorReportResult, type InterceptorResult, type InterceptorSharedData, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { CHORD_OCCURRENCE_PREFIX, CHORD_TRAIT_PREFIX } from '../state-keys.js';
import { ExecContext, toEffect, type RuntimeCore } from './core.js';

export class DispatchVerbsSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Bind step: `define trait` clauses — capability behaviors for dispatch verbs, merged interceptors for standard actions. */
  bindTraitClauses(world: WorldModel): void {
    // Phase B: `define trait` clauses register per TRAIT TYPE — capability
    // behaviors for dispatch verbs, interceptors for standard-semantics
    // actions (§5.4 routing recorded on the IR by the analyzer).
    for (const trait of this.core.ir.traits) {
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
          if (!this.core.binding.isConsultedGerund(clause.action)) throw this.core.binding.deadGerundError(clause);
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
          this.core.onClauses.mergeArms(actionClauses.map((clause, index) =>
            this.buildTraitInterceptor(clause, `${trait.name}.${action}.${clause.clauseKind}.${index}`),
          )),
        );
      }
    }
  }

  /** Write a `define trait` data field on the entity's chord trait instance. */
  writeChordTraitField(world: WorldModel, worldId: string, field: string, value: unknown, span?: Span): void {
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
      it: runtime.core.host.irIdOf(entity.id),
      slots: { ...(data.chordSlots as Record<string, string> | undefined), actor: actorId },
      occurrence: data.chordOccurrence as number | undefined,
      ledger: runtime.core.onClauses.ledgerFor(data as Record<string, unknown>, 'chordDecisions', phase),
      // ADR-289 D2: a trait clause is ONE piece of IR shared by every
      // composing entity, so its selects must count per entity. The compiler
      // cannot name composing entities — the runtime is the layer that knows
      // — and the compiler's id stays a strict prefix of the key it builds,
      // keeping "every counter for this statement" addressable by prefix.
      owner: runtime.core.host.irIdOf(entity.id),
    });

    return {
      validate(entity, world, actorId, data): CapabilityValidationResult {
        const ctx = ctxOf(entity, world, actorId, data);
        // ADR-327 D1: the head names who acts — another actor's action is
        // not this clause's (the dispatcher reads `chordSkip` as not claiming).
        if (!runtime.core.moveClauses.actorMatches(clause.actor, actorId, world)) {
          data.chordSkip = true;
          return { valid: true };
        }
        // D8 (ADR-228): the `while` gate is evaluated once per firing, at
        // validate time, BEFORE findRefusal — a gated-out clause sits out
        // entirely, refusals included. ADR-229 R5: the dispatch action
        // reads `chordSkip` as "not claiming" and falls through to the
        // next candidate / body / miss; the execute/report guards below
        // stay as defense in depth. Do not move this evaluation.
        if (clause.condition && !runtime.core.evaluator.evalCondition(clause.condition, ctx)) {
          data.chordSkip = true;
          return { valid: true };
        }
        const key = `${CHORD_OCCURRENCE_PREFIX}trait.${traitName}.${clause.action}.${runtime.core.host.irIdOf(entity.id)}`;
        const occurrence = ((world.getStateValue(key) as number | undefined) ?? 0) + 1;
        if (clause.once && occurrence > 1) {
          data.chordSkip = true; // `, once` — one lifetime firing (D5)
          return { valid: true };
        }
        const refusal = runtime.core.statements.findRefusal(clause.body, ctx);
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
        runtime.core.statements.execStatements(clause.body, ctxOf(entity, world, actorId, data, 'mutations'), 'mutations');
      },
      report(entity, world, actorId, data): CapabilityEffect[] {
        if (data.chordSkip === true) return [];
        const events = runtime.core.statements.execStatements(clause.body, ctxOf(entity, world, actorId, data, 'reports'), 'reports');
        return events.map(toEffect);
      },
      blocked(entity, world, actorId, error, data): CapabilityEffect[] {
        const event = runtime.core.phrases.phraseEvent(error, ctxOf(entity, world, actorId, data));
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
    const itOf = (target: IFEntity) => runtime.core.host.irIdOf(target.id) ?? target.id;
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
        const bag = runtime.core.onClauses.clauseBag(data, ns);
        // ADR-327 D1: the head names who acts — a clause for another actor
        // sits out entirely, refusals included.
        if (!runtime.core.moveClauses.actorMatches(clause.actor, actorId, world)) {
          bag.skip = true;
          return null;
        }
        if (clause.condition && !runtime.core.evaluator.evalCondition(clause.condition, ctx)) {
          bag.skip = true;
          return null;
        }
        // `, once`: a clause that has already fired keeps its refusal out
        // too (peek only — the occurrence bump stays in postValidate).
        if (clause.once && ((world.getStateValue(occurrenceKeyOf(target)) as number | undefined) ?? 0) >= 1) {
          bag.skip = true;
          return null;
        }
        const refusal = runtime.core.statements.findRefusal(clause.body, ctx);
        return refusal ? { valid: false, ...refusal } : null;
      },
      postValidate(target: IFEntity, world: WorldModel, actorId: string, data: InterceptorSharedData): InterceptorResult | null {
        const bag = runtime.core.onClauses.clauseBag(data, ns);
        const ctx: ExecContext = { world, it: itOf(target) };
        // ADR-327 D1: same actor gate as preValidate (after-clauses reach here first).
        if (!runtime.core.moveClauses.actorMatches(clause.actor, actorId, world)) {
          bag.skip = true;
          return null;
        }
        // D8: same gate, same evaluation point (see preValidate).
        if (clause.condition && !runtime.core.evaluator.evalCondition(clause.condition, ctx)) {
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
        const bag = runtime.core.onClauses.clauseBag(data, ns);
        if (bag.skip === true) return;
        runtime.core.statements.execStatements(clause.body, runtime.core.onClauses.restoreCtx(world, itOf(target), bag, 'mutations'), 'mutations');
      },
      postReport(target: IFEntity, world: WorldModel, _actorId: string, data: InterceptorSharedData): InterceptorReportResult {
        const bag = runtime.core.onClauses.clauseBag(data, ns);
        if (bag.skip === true) return {};
        const reports = runtime.core.statements.execStatements(clause.body, runtime.core.onClauses.restoreCtx(world, itOf(target), bag, 'reports'), 'reports');
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
    return this.core.ir.actions.map((def) => this.buildDispatchAction(def));
  }

  /**
   * The canonical word a `directions` block declares for `word` (GH #285):
   * matched case-insensitively against each entry's canonical and aliases,
   * so the parser's `NORTHEAST` binds as the author's `northeast`. A word
   * no entry declares is returned unchanged.
   *
   * @param def the dispatch action whose `directions` block applies
   * @param word the value the parser bound for the `direction` slot
   */
  private canonicalDirectionWord(def: IRActionDef, word: string): string {
    const lower = word.toLowerCase();
    for (const entry of def.directions ?? []) {
      if (entry.canonical.toLowerCase() === lower || entry.aliases.some((a) => a.toLowerCase() === lower)) {
        return entry.canonical;
      }
    }
    return word;
  }

  private buildDispatchAction(def: IRActionDef) {
    const runtime = this;
    const actionId = `chord.action.${def.name}`;
    // ADR-275: a directions-block action's `direction` slot is SEMANTIC —
    // the primary (entity) slot skips it, and entity-less patterns are the
    // ones carrying no entity slot at all.
    const hasDirections = (def.directions ?? []).length > 0;
    // GH #333: an instrument-typed slot is parsed into the command's
    // instrument seat, so it is never the primary (direct-object) slot —
    // `hang the item on the target` with `the item is an instrument` has
    // `target` as its primary slot wherever the instrument sits.
    const instrumentSlotNames = new Set((def.slotTypes ?? []).filter((t) => t.type === 'instrument').map((t) => t.slot));
    const isEntitySlot = (word: string) => !(hasDirections && word === 'direction') && !instrumentSlotNames.has(word);
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
      /** Whoever is acting (ADR-328 D2) — the player, or a character performing the action. */
      actor?: IFEntity;
      player: IFEntity;
      // ADR-275 D2 (review fix): `parsed.extras` carries the matched rule's
      // defaultSemantics (merged parser-side, ADR-148) — the access seam
      // for semantic word bindings.
      command: { directObject?: { entity?: IFEntity }; instrument?: { entity?: IFEntity }; parsed?: { extras?: Record<string, unknown> } };
      sharedData: Record<string, unknown>;
      event(type: string, data: Record<string, unknown>): ISemanticEvent;
    }

    /** Entity bindings + declared semantic WORDS (ADR-275 D2), one map. */
    const bindings = (entity: IFEntity | undefined, context: DispatchContext): Record<string, string> => {
      // `the actor` is whoever performs the action — a character acting
      // through the execution entry (ADR-329 D1/D10) as much as the player.
      const slots: Record<string, string> = { actor: (context.actor ?? context.player).id };
      if (entity && primarySlot) slots[primarySlot] = entity.id;
      // GH #333: an instrument-typed slot (`the item is an instrument`) is
      // parsed into the command's instrument seat, never the direct object —
      // bind it under its own slot name so `{the item}` in a clause body
      // renders whatever the pattern's position was.
      const instrumentEntity = context.command.instrument?.entity;
      if (instrumentEntity) {
        for (const typed of def.slotTypes ?? []) {
          if (typed.type === 'instrument' && slots[typed.slot] === undefined) slots[typed.slot] = instrumentEntity.id;
        }
      }
      const extras = context.command.parsed?.extras ?? {};
      for (const key of semanticKeys) {
        const v = extras[key];
        if (typeof v !== 'string' || slots[key] !== undefined) continue;
        // GH #285: the parser converts a compass word in `extras.direction`
        // to the platform's Direction constant (`NORTHEAST`) — right for
        // stdlib going, wrong for a `directions` block whose canonicals the
        // analyzer validated as lowercase words. Bind the DECLARED canonical:
        // the entry whose canonical or alias spells the value, whatever case
        // the parser handed back. An undeclared word binds as it came.
        slots[key] = key === 'direction' && hasDirections ? runtime.canonicalDirectionWord(def, v) : v;
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
            if (runtime.core.evaluator.evalCondition(refusal.condition, evalCtx)) {
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
          if (!runtime.core.evaluator.evalCondition(must.condition, evalCtx)) {
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
            const result = candidate.validate(entity, context.world, (context.actor ?? context.player).id, candidateShared);
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
          const refusal = runtime.core.statements.findRefusal(def.body, bodyCtx);
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
          behavior.execute(entity, context.world, (context.actor ?? context.player).id, context.sharedData.capShared as CapabilitySharedData);
        }
        if (def.body.length) {
          runtime.core.statements.execStatements(def.body, runtime.actionBodyCtxFromSlots(context, 'mutations'), 'mutations');
        }
      },
      report(context: DispatchContext): ISemanticEvent[] {
        const entity = context.sharedData.capEntity as IFEntity | undefined;
        const behavior = context.sharedData.capBehavior as CapabilityBehavior | undefined;
        const events: ISemanticEvent[] = [];
        if (entity && behavior) {
          const effects = behavior.report(entity, context.world, (context.actor ?? context.player).id, context.sharedData.capShared as CapabilitySharedData);
          // The same D9 attribution override as the engine's
          // effectsToEvents: context.event stamps the acting player,
          // which is wrong for NPC-originated effects.
          events.push(...effects.map((e) => {
            const event = context.event(e.type, e.payload);
            return e.actor !== undefined ? { ...event, entities: { ...event.entities, actor: e.actor } } : event;
          }));
        }
        if (def.body.length) {
          events.push(...runtime.core.statements.execStatements(def.body, runtime.actionBodyCtxFromSlots(context, 'reports'), 'reports'));
        }
        // After-clauses bind to the target entity — an entity-less command
        // has no owner to react (ADR-275 D1).
        if (entity) events.push(...runtime.core.timers.fireAfterClauses(def.name, entity, context.world, (context.actor ?? context.player).id));
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
        const event = runtime.core.phrases.phraseEvent(key, { world: context.world });
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
      /** Whoever is acting (ADR-328 D2); the player when absent. */
      actor?: IFEntity;
      player: IFEntity;
      sharedData: Record<string, unknown>;
    },
    phase?: 'mutations' | 'reports',
  ): ExecContext {
    return {
      world: context.world,
      slots: (context.sharedData.chordSlotMap as Record<string, string> | undefined) ?? { actor: (context.actor ?? context.player).id },
      ledger: this.core.onClauses.ledgerFor(context.sharedData, 'chordBodyDecisions', phase),
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
}
