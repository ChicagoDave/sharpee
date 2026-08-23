/**
 * evaluator.ts — the Chord expression evaluator (design.md §5.5, Phase A).
 *
 * Purpose: evaluate IR conditions and values against a live WorldModel —
 * an AST walk, no eval(), no runtime TS. Covers the closed selector
 * subset cloak.story exercises: possessive access (`the player's
 * location`, `its state`), `is <state/trait>`, `is a`, `is in`,
 * `has`/`holds`/`wears`, named conditions, and/or/not, and
 * `one chance in <n>` through the seeded RNG.
 *
 * Public interface: Evaluator, EvalContext.
 * Owner context: @sharpee/story-loader.
 *
 * Invariants:
 * - Pure reads except the RNG draw (whose cursor persists in world state
 *   under `chord.rng`, so chance streams survive save/restore — AC-5/AC-6).
 * - Unknown constructs throw LoadError: the compiler gates should make
 *   these unreachable; reaching one is a loader bug, not author error.
 */
import type { IRCondition, IREntity, IRTimerDef, IRValue, StoryIR } from '@sharpee/chord';
import { createSeededRandom, type SeededRandom } from '@sharpee/core';
import {
  CharacterModelTrait,
  LightSourceTrait,
  LockableTrait,
  MOOD_AXES,
  OpenableTrait,
  PRESSURE_BANDS,
  SwitchableTrait,
  THREAT_LEVELS,
  TraitType,
  VisibilityBehavior,
  WearableTrait,
  WorldModel,
  applyMoodModifier,
  type Mood,
  type MoodModifier,
} from '@sharpee/world-model';
import { sceneWith } from '@sharpee/world-model';
import { askedWordFor, dialogueTurn, recencyWordFor } from '@sharpee/character';
import { LoadError } from './errors.js';
import { CHORD_RNG_KEY, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TRAIT_PREFIX, counterKey, timerKey, type TimerRecord } from './state-keys.js';

export interface EvalContext {
  world: WorldModel;
  /** IR entity id bound to `it` (the on-clause owner), when in scope. */
  it?: string;
  /**
   * Bound context values (Phase B dispatch): grammar-slot/role name →
   * WORLD entity id (`animal` → the pet target, `actor` → the actor).
   */
  slots?: Record<string, string>;
  /**
   * IR entity id bound to `the match` — the innermost enclosing `each`
   * block's current entity (ratchet E3). Nested blocks re-spread the
   * context, so the innermost binding naturally wins; `it` is untouched.
   */
  match?: string;
  /**
   * The conversation frame (ADR-320 Phase 7 design §6): WORLD entity id
   * of the owner's conversation partner, set by the dialogue dispatch
   * paths (the topic arm and the exchange registrant). Pair-dependent
   * predicates (`discussed`, `asked`, `subject-changes`) require it.
   */
  conversationPartnerId?: string;
  /**
   * The canonical topic of the row being served (entity rows: the IR id;
   * text rows: the normalized primary), for `asked`'s per-topic count.
   */
  conversationTopic?: string;
}

/** Resolves IR ids to world ids (implemented by ChordStory). */
export interface EntityIdResolver {
  entityId(irId: string): string | undefined;
  irIdOf(worldId: string): string | undefined;
  /** The player's world id once created (before the engine calls setPlayer). */
  playerWorldId(): string | undefined;
}

export class Evaluator {
  private readonly conditions = new Map<string, IRCondition>();
  private readonly rng: SeededRandom;

  /** trait name → its `entity`-typed data-field names (IR→world translation). */
  private readonly entityFields = new Map<string, Set<string>>();

  /**
   * IR entities in declaration order — the quantifier enumeration domain
   * and E3's pinned "creation order" (the loader instantiates in this
   * order; save/restore cannot reorder it, so iteration and the RNG draws
   * inside `each` bodies stay deterministic — AC-5).
   */
  private readonly irEntities: IREntity[];
  private readonly irEntityById = new Map<string, IREntity>();
  /** ADR-325 D3: timer definitions by `qualified` key, for state-word reads. */
  private readonly timerDefs = new Map<string, IRTimerDef>();

  /**
   * Live client-capability source for `client has` (ADR-216) — set by the
   * loader at engine-ready from the engine's negotiated capabilities.
   * Null (load time, headless tests) means the text-only default: every
   * gateable flag reads false.
   */
  private capabilitiesProvider: (() => Record<string, unknown> | undefined) | null = null;

  /** Wire the live capability source (loader-only; ADR-216). */
  setCapabilitiesProvider(provider: () => Record<string, unknown> | undefined): void {
    this.capabilitiesProvider = provider;
  }

  /**
   * Mood-word coordinate table for interior `is`-values (ADR-310 D16):
   * platform words plus the story's `define mood` customs, whose axes
   * resolve here (anchor mood, one-axis modifier nudge) — the same
   * resolution the compile-time seam applies, so `is <custom-mood>`
   * classifies against the identical coordinates.
   */
  private readonly moodWordAxes: Record<string, { valence: number; arousal: number }>;

  constructor(
    ir: StoryIR,
    private readonly ids: EntityIdResolver,
    seed?: number,
  ) {
    for (const c of ir.conditions) this.conditions.set(c.name, c.condition);
    this.irEntities = ir.entities;
    for (const e of ir.entities) this.irEntityById.set(e.id, e);
    for (const t of ir.timers ?? []) this.timerDefs.set(t.qualified, t);
    for (const trait of ir.traits) {
      this.entityFields.set(
        trait.name,
        new Set(trait.data.filter((f) => f.type === 'entity').map((f) => f.name)),
      );
    }
    this.moodWordAxes = { ...MOOD_AXES };
    for (const mood of ir.customMoods ?? []) {
      const anchor = MOOD_AXES[mood.like as Mood];
      this.moodWordAxes[mood.name] = mood.but ? applyMoodModifier(anchor, mood.but as MoodModifier) : anchor;
    }
    this.rng = createSeededRandom(seed);
  }

  /**
   * Axes for a mood word — manifest or story-defined custom (ADR-310 D5).
   * The one table both the predicate side and the `change mood` statement
   * resolve through, so a custom mood means the same thing everywhere.
   *
   * @param word - The mood word to resolve
   * @returns The valence/arousal axes, or undefined for an unknown word
   */
  moodAxesFor(word: string): { valence: number; arousal: number } | undefined {
    return this.moodWordAxes[word];
  }

  // ------------------------------------------------------------ conditions

  evalCondition(cond: IRCondition, ctx: EvalContext): boolean {
    switch (cond.kind) {
      case 'and':
        return cond.operands.every((o) => this.evalCondition(o, ctx));
      case 'or':
        return cond.operands.some((o) => this.evalCondition(o, ctx));
      case 'not':
        return !this.evalCondition(cond.operand, ctx);
      case 'chance':
        return this.drawChance(cond.n, ctx.world);
      case 'condition': {
        const named = this.conditions.get(cond.name);
        if (!named) throw new LoadError(`Unknown condition \`${cond.name}\` at evaluation time.`);
        return this.evalCondition(named, ctx);
      }
      case 'story-state':
        // The story object's phase (`while after-hours`, ratchet D2).
        return ctx.world.getStateValue(CHORD_STORY_STATE_KEY) === cond.state;
      case 'timer-has': {
        // ADR-325 D3d: `has started` = running, stopped, or expired; `has
        // expired` = over. Idle (never started, or reset) answers no to both.
        const record = this.timerRecord(cond.timer, ctx);
        return cond.what === 'started' ? record.phase !== 'idle' : record.phase === 'expired';
      }
      case 'client-has': {
        // ADR-216: the live negotiated client capability. Without a
        // provider (load time, headless tests) the engine's text-only
        // default applies: only `text` is true, and `text` cannot be
        // written in a `client has` (the compiler's closed flag set).
        const capabilities = this.capabilitiesProvider?.();
        if (!capabilities) return false;
        return (capabilities as Record<string, unknown>)[cond.capability] === true;
      }
      case 'any-of':
        // E1 (ratchet 2026-07-12): true iff some entity satisfies the
        // named open condition; false over the empty set. Short-circuits.
        return this.someMatch(cond.condition, ctx);
      case 'none-of':
        // E2: the negated existential — true over the empty set.
        return !this.someMatch(cond.condition, ctx);
      case 'satisfies': {
        // `<subject> must be any <name>` membership (David, 2026-07-12):
        // the subject satisfies the open condition — its `it` bound to
        // the subject. A subject outside the quantification domain (no
        // story identity) is not one of the matches: false, not a throw.
        const named = this.namedCondition(cond.condition);
        const subjectId = this.entityValue(cond.subject, ctx);
        const irId = this.ids.irIdOf(subjectId);
        if (irId === undefined) return false;
        return this.evalCondition(named, { ...ctx, it: irId });
      }
      case 'predicate':
        return this.evalPredicate(cond, ctx);
      case 'feels': {
        // ADR-310 D13: the subject's disposition toward the target reads
        // as the named word band. No character model = the predicate
        // simply does not hold (D7: no model, no change).
        const trait = this.characterTrait(this.entityValue(cond.subject, ctx), ctx);
        if (!trait) return false;
        const targetId = this.entityValue(cond.target, ctx);
        return trait.getDispositionWord(targetId) === cond.disposition;
      }
      case 'knows-topic': {
        // ADR-310 D13: the subject holds the topic (valueless knowledge).
        const trait = this.characterTrait(this.entityValue(cond.subject, ctx), ctx);
        return trait ? trait.knows(cond.topic) : false;
      }
      case 'compare': {
        // ADR-264 D3: numeric comparison of two values (a counter vs a number).
        const left = Number(this.evalValue(cond.left, ctx));
        const right = Number(this.evalValue(cond.right, ctx));
        switch (cond.op) {
          case 'gte': return left >= right;
          case 'gt': return left > right;
          case 'lte': return left <= right;
          case 'lt': return left < right;
          case 'eq': return left === right;
        }
        return false;
      }
      case 'recency': {
        // ADR-320 D6: recency over the holder's ledger turn stamps — the
        // holder is the context's owner (`it`), the runtime owns the curve
        // (recencyWordFor, clock-seam turns). No trait or no fact: the
        // predicate simply does not hold (the feels/knows-topic precedent).
        const trait = this.characterTrait(this.conversationOwnerId(cond.kind, ctx), ctx);
        const fact = trait?.getFact(cond.topic);
        if (!fact) return false;
        return recencyWordFor(dialogueTurn(ctx.world), fact.turnLearned) === cond.word;
      }
      case 'discussed': {
        // ADR-320 D9: per-pair discussed-ness between the owner and the
        // conversation partner, across scenes, any order. Reads the
        // holder's trait memory directly (the Phase 7 home).
        const trait = this.characterTrait(this.conversationOwnerId(cond.kind, ctx), ctx);
        const partnerId = this.conversationPartnerId(cond.kind, ctx);
        return trait?.conversationMemory?.[partnerId]?.discussedTopics.includes(cond.topic) ?? false;
      }
      case 'asked': {
        // ADR-320 D4: the current topic's per-pair ask count read as a
        // word; topic and pair come from the conversation frame.
        const trait = this.characterTrait(this.conversationOwnerId(cond.kind, ctx), ctx);
        const partnerId = this.conversationPartnerId(cond.kind, ctx);
        if (ctx.conversationTopic === undefined) {
          throw new LoadError(
            '`asked` needs the conversation frame\'s current topic — it holds only inside dialogue dispatch.',
          );
        }
        const count = trait?.conversationMemory?.[partnerId]?.askedCounts[ctx.conversationTopic] ?? 0;
        return askedWordFor(count) === cond.word;
      }
      case 'concluded': {
        // ADR-320 D14: the thread's conclusion beat has fired between the
        // owner and the conversation partner. Reads the holder's trait
        // thread state directly (the Phase 10.2 home, schema v3); pre-v3
        // traits lack the field entirely — absent reads false, never a
        // throw (a thread that never ran is simply not concluded).
        const trait = this.characterTrait(this.conversationOwnerId(cond.kind, ctx), ctx);
        const partnerId = this.conversationPartnerId(cond.kind, ctx);
        return trait?.conversationThreads?.[partnerId]?.[cond.thread]?.status === 'concluded';
      }
      case 'subject-changes': {
        // ADR-320 D9: the scene between owner and partner noticed a live
        // thread abandoned THIS turn (the scene runtime's noteTopicMove
        // stamp). No live scene between the pair: false, not an error.
        const ownerWorldId = this.ids.entityId(this.requireIt(cond.kind, ctx));
        if (ownerWorldId === undefined) return false;
        const partnerId = this.conversationPartnerId(cond.kind, ctx);
        const scene = sceneWith(ctx.world, ownerWorldId);
        if (!scene || !scene.participantIds.includes(partnerId)) return false;
        return scene.subjectChangedTurn === dialogueTurn(ctx.world);
      }
    }
  }

  /** The conversation owner's WORLD id — `it` resolved (ADR-320 predicates). */
  private conversationOwnerId(kind: string, ctx: EvalContext): string {
    const worldId = this.ids.entityId(this.requireIt(kind, ctx));
    if (worldId === undefined) {
      throw new LoadError(`\`${kind}\`: the owner \`${ctx.it}\` was never built into the world.`);
    }
    return worldId;
  }

  /** The context's `it`, required (ADR-320 predicates are owner-scoped). */
  private requireIt(kind: string, ctx: EvalContext): string {
    if (ctx.it === undefined) {
      throw new LoadError(`\`${kind}\` needs an owner (\`it\`) in scope — it holds only inside an entity's own rows.`);
    }
    return ctx.it;
  }

  /**
   * The conversation partner from the frame, required (ADR-320
   * pair-dependent predicates hold only inside dialogue dispatch — the
   * analyzer parse-gates them there; arriving without a frame is rogue IR).
   */
  private conversationPartnerId(kind: string, ctx: EvalContext): string {
    if (ctx.conversationPartnerId === undefined) {
      throw new LoadError(
        `\`${kind}\` needs a conversation partner — it holds only inside dialogue dispatch.`,
      );
    }
    return ctx.conversationPartnerId;
  }

  private evalPredicate(
    cond: Extract<IRCondition, { kind: 'predicate' }>,
    ctx: EvalContext,
  ): boolean {
    const raw = (result: boolean) => (cond.negated ? !result : result);
    switch (cond.pred) {
      case 'is': {
        const subject = this.evalValue(cond.subject, ctx);
        if (cond.object.kind === 'symbol') {
          return raw(this.symbolHolds(subject, cond.object.name, ctx));
        }
        return raw(String(subject) === String(this.evalValue(cond.object, ctx)));
      }
      case 'is-a': {
        // Classification (landed with the each package, P4): the subject's
        // IR kind-noun compositions (`a marble`, `a room`). An entity
        // outside the story's IR classifies as nothing.
        const subjectId = this.entityValue(cond.subject, ctx);
        const irId = this.ids.irIdOf(subjectId);
        const irEntity = irId !== undefined ? this.irEntityById.get(irId) : undefined;
        if (!irEntity) return raw(false);
        const classifier =
          cond.object.kind === 'symbol' ? cond.object.name : String(this.evalValue(cond.object, ctx));
        return raw(irEntity.kinds.some((k) => k.name === classifier));
      }
      case 'is-in': {
        // ADR-325 D1: the place may be `<owner>'s location`; an offstage
        // owner has none, and `is in` nothing is false, never an error.
        const subjectId = this.entityValue(cond.subject, ctx);
        const placeId = this.evalValue(cond.object, ctx);
        if (typeof placeId !== 'string' || !ctx.world.getEntity(placeId)) return raw(false);
        return raw(this.isWithin(ctx.world, subjectId, placeId));
      }
      case 'is-here': {
        // Z4 deictic — Decision 10 presence semantics, mirroring the
        // runtime's playerPresentAt: a room subject means the player is IN
        // it; anything else shares the player's containing room; a
        // no-location subject is never here (false, not an error).
        const subjectId = this.entityValue(cond.subject, ctx);
        const playerId = ctx.world.getPlayer()?.id;
        if (!playerId) return raw(false);
        if (subjectId === playerId) return raw(true);
        const playerRoom = ctx.world.getContainingRoom(playerId)?.id ?? ctx.world.getLocation(playerId);
        if (ctx.world.getEntity(subjectId)?.has(TraitType.ROOM)) return raw(playerRoom === subjectId);
        const subjectRoom = ctx.world.getContainingRoom(subjectId)?.id ?? ctx.world.getLocation(subjectId);
        return raw(subjectRoom !== undefined && subjectRoom === playerRoom);
      }
      case 'has': {
        const owner = this.entityValue(cond.subject, ctx);
        const thing = this.entityValue(cond.object, ctx);
        return this.isWithin(ctx.world, thing, owner);
      }
      case 'holds': {
        const owner = this.entityValue(cond.subject, ctx);
        const thing = this.entityValue(cond.object, ctx);
        return ctx.world.getLocation(thing) === owner;
      }
      case 'wears': {
        const wearer = this.entityValue(cond.subject, ctx);
        const thing = this.entityValue(cond.object, ctx);
        const entity = ctx.world.getEntity(thing);
        const wearable = entity?.get(TraitType.WEARABLE) as WearableTrait | undefined;
        return wearable?.worn === true && wearable.wornBy === wearer;
      }
      case 'can-see':
      case 'can-reach': {
        // Phase B semantics: co-location — subject and object share a
        // containing room. (Full perception/reach services are a later
        // refinement; this matches the Zoo constructs' intent.)
        const subjectId = this.entityValue(cond.subject, ctx);
        const objectId = this.entityValue(cond.object, ctx);
        const subjectRoom = ctx.world.getContainingRoom(subjectId)?.id ?? ctx.world.getLocation(subjectId);
        const objectRoom = ctx.world.getContainingRoom(objectId)?.id ?? ctx.world.getLocation(objectId);
        return raw(subjectRoom !== undefined && subjectRoom === objectRoom);
      }
    }
  }

  /**
   * `<subject> is <bare-word>`: a declared state, a state adjective read
   * live from world trait state (ratchet D1 — never stored), or the `dark`
   * trait.
   */
  private symbolHolds(subject: unknown, symbol: string, ctx: EvalContext): boolean {
    if (typeof subject === 'string') {
      // A state string read from a `state` field compares directly.
      if (subject === symbol) return true;
      const entity = ctx.world.getEntity(subject);
      if (entity) {
        if (symbol === 'dark') {
          // Effective darkness is owned by VisibilityBehavior — it also accounts
          // for a carried lit light source — never the raw `requiresLight` field.
          return VisibilityBehavior.isDark(entity, ctx.world);
        }
        const irId = this.ids.irIdOf(subject);
        if (irId !== undefined) {
          const state = ctx.world.getStateValue(CHORD_STATE_PREFIX + irId);
          if (state !== undefined && state === symbol) return true;
        }
        const adjective = this.stateAdjectiveHolds(entity, symbol);
        if (adjective !== null) return adjective;
        // ADR-310 D16 / ADR-318: interior classification — mood, threat,
        // and pressure-band words read the character-model trait, the
        // same pure-read pattern as the state adjectives above.
        const character = entity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
        if (character) {
          const interior = this.characterWordHolds(character, symbol);
          if (interior !== null) return interior;
        }
      }
    }
    return false;
  }

  /**
   * Interior `is`-value reads (ADR-310 D16, ADR-318 D8): mood words
   * (platform + story customs) classify by nearest coordinates over the
   * extended table; threat words read the threat curve's word; band
   * words read the conscience band. Null when `symbol` is none of these.
   */
  private characterWordHolds(trait: CharacterModelTrait, symbol: string): boolean | null {
    if (symbol in this.moodWordAxes) {
      return this.nearestMoodWord(trait.moodValence, trait.moodArousal) === symbol;
    }
    if ((THREAT_LEVELS as readonly string[]).includes(symbol)) {
      return trait.getThreat() === symbol;
    }
    if ((PRESSURE_BANDS as readonly string[]).includes(symbol)) {
      return trait.pressure.band === symbol;
    }
    return null;
  }

  /** Nearest mood word over the extended (platform + custom) coordinate table — world-model's `nearestMood` metric. */
  private nearestMoodWord(valence: number, arousal: number): string {
    let best = 'calm';
    let bestDist = Infinity;
    for (const [word, axes] of Object.entries(this.moodWordAxes)) {
      const dist = (axes.valence - valence) ** 2 + (axes.arousal - arousal) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = word;
      }
    }
    return best;
  }

  /** The character-model trait of a WORLD entity, if it carries one. */
  private characterTrait(worldId: string, ctx: EvalContext): CharacterModelTrait | undefined {
    return ctx.world.getEntity(worldId)?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
  }

  /**
   * State adjectives (ratchet D1): `open`/`closed`, `locked`/`unlocked`,
   * `on`/`off`, `worn`, `lit` — pure reads of world trait state. Null when
   * `symbol` is not a state adjective (or the trait is absent, so the
   * adjective cannot hold either way).
   */
  private stateAdjectiveHolds(entity: NonNullable<ReturnType<WorldModel['getEntity']>>, symbol: string): boolean | null {
    switch (symbol) {
      case 'open':
      case 'closed': {
        const openable = entity.get(TraitType.OPENABLE) as OpenableTrait | undefined;
        if (!openable) return null;
        return symbol === 'open' ? openable.isOpen === true : openable.isOpen !== true;
      }
      case 'locked':
      case 'unlocked': {
        const lockable = entity.get(TraitType.LOCKABLE) as LockableTrait | undefined;
        if (!lockable) return null;
        return symbol === 'locked' ? lockable.isLocked === true : lockable.isLocked !== true;
      }
      case 'on':
      case 'off': {
        const switchable = entity.get(TraitType.SWITCHABLE) as SwitchableTrait | undefined;
        if (!switchable) return null;
        return symbol === 'on' ? switchable.isOn === true : switchable.isOn !== true;
      }
      case 'worn': {
        const wearable = entity.get(TraitType.WEARABLE) as WearableTrait | undefined;
        if (!wearable) return null;
        return wearable.worn === true;
      }
      case 'lit': {
        const source = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait | undefined;
        if (!source) return null;
        return source.isLit === true;
      }
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------- values

  evalValue(value: IRValue, ctx: EvalContext): unknown {
    switch (value.kind) {
      case 'literal':
        return value.valueType === 'number' ? Number(value.value) : value.value;
      case 'symbol':
        return value.name;
      case 'player':
        return this.playerId(ctx.world);
      case 'it': {
        if (!ctx.it) throw new LoadError('`it` used outside an entity-scoped clause.');
        return this.requireWorldId(ctx.it);
      }
      case 'story':
        // The story object is not an entity — only `change` targets it.
        throw new LoadError('The story object has no entity value — use `change the story to <state>`.');
      case 'entity':
        return this.requireWorldId(value.id);
      case 'field': {
        const base = this.evalValue(value.base, ctx);
        if (typeof base !== 'string') {
          throw new LoadError(`Cannot read \`${value.field}\` of a non-entity value.`);
        }
        return this.readField(base, value.field, ctx);
      }
      case 'timer': {
        // ADR-325 D3d: the timer's current named turn, `expired` once over,
        // and no value (null) before it starts or after a reset.
        const record = this.timerRecord(value.timer, ctx);
        if (record.phase === 'idle') return null;
        if (record.phase === 'expired') return 'expired';
        const def = this.timerDefs.get(value.timer);
        return record.index >= 1 && def ? def.states[record.index - 1] ?? null : null;
      }
      case 'counter': {
        // ADR-264 D3: read a counter's current value from world state. The
        // owner (per-entity) resolves to an IR entity id, matching how the
        // loader seeds and the runtime mutates the counter.
        let ownerId: string | null = null;
        if (value.owner) {
          if (value.owner.kind === 'entity') ownerId = value.owner.id;
          else if (value.owner.kind === 'it') ownerId = ctx.it ?? null;
        }
        const key = counterKey(value.name, ownerId ?? undefined);
        return Number(ctx.world.getStateValue(key) ?? 0);
      }
      case 'slot': {
        const bound = ctx.slots?.[value.name];
        if (!bound) {
          throw new LoadError(`Context value \`${value.name}\` is not bound here.`);
        }
        return bound;
      }
      case 'match': {
        // The `each`-block binder (ratchet E3) — the analyzer's
        // match-outside-each gate makes an unbound read a loader bug.
        if (!ctx.match) throw new LoadError('`the match` used outside an `each` block.');
        return this.requireWorldId(ctx.match);
      }
    }
  }

  // ------------------------------------------------------------ quantifiers

  /** The named condition's body, or a loader-bug throw. */
  private namedCondition(name: string): IRCondition {
    const named = this.conditions.get(name);
    if (!named) throw new LoadError(`Unknown condition \`${name}\` at evaluation time.`);
    return named;
  }

  /** True when some domain entity satisfies the open condition (short-circuit). */
  private someMatch(name: string, ctx: EvalContext): boolean {
    const named = this.namedCondition(name);
    return this.irEntities.some(
      (e) => this.ids.entityId(e.id) !== undefined && this.evalCondition(named, { ...ctx, it: e.id }),
    );
  }

  /**
   * The entities satisfying a named open condition, as IR ids in
   * declaration order — E3's pinned creation-order enumeration. Used by
   * the runtime's `each` execution and its pre-mutation snapshot.
   */
  matchesOf(name: string, ctx: EvalContext): string[] {
    const named = this.namedCondition(name);
    return this.irEntities
      .filter((e) => this.ids.entityId(e.id) !== undefined && this.evalCondition(named, { ...ctx, it: e.id }))
      .map((e) => e.id);
  }

  /** A timer's persisted record (ADR-325 D3g); idle when never written. */
  timerRecord(qualified: string, ctx: EvalContext): TimerRecord {
    const stored = ctx.world.getStateValue(timerKey(qualified)) as TimerRecord | undefined;
    return stored ?? { phase: 'idle', index: 0, startedTurn: -1 };
  }

  /** Evaluate a value that must be an entity (world id). */
  entityValue(value: IRValue, ctx: EvalContext): string {
    const result = this.evalValue(value, ctx);
    if (typeof result !== 'string' || !ctx.world.getEntity(result)) {
      throw new LoadError(`Expected an entity, got \`${String(result)}\`.`);
    }
    return result;
  }

  private readField(worldId: string, field: string, ctx: EvalContext): unknown {
    switch (field) {
      case 'location':
        // ADR-325 D1: `location` is the containing room, always — a room is
        // its own; a thing carried or on a supporter reads the room around
        // it. Undefined when the entity is offstage.
        if (ctx.world.getEntity(worldId)?.has(TraitType.ROOM)) return worldId;
        return ctx.world.getContainingRoom(worldId)?.id ?? ctx.world.getLocation(worldId);
      case 'state': {
        const irId = this.ids.irIdOf(worldId);
        if (irId === undefined) throw new LoadError('Cannot read `state` of a non-story entity.');
        return ctx.world.getStateValue(CHORD_STATE_PREFIX + irId);
      }
      default: {
        // Chord trait data fields (Phase B): stored as own properties on
        // the entity's `chord.trait.*` instances. ONLY fields the trait
        // declares as `entity`-typed translate IR id → world id — a plain
        // word value may coincide with an entity id (`kind: parrot` on the
        // parrot itself) and must stay a symbol.
        const value = this.readChordTraitField(worldId, field, ctx);
        if (value !== undefined) {
          if (value.isEntityField && typeof value.value === 'string') {
            const asEntity = this.ids.entityId(value.value);
            if (asEntity) return asEntity;
          }
          return value.value;
        }
        throw new LoadError(`Field \`${field}\` is not supported here.`);
      }
    }
  }

  /** Read a `define trait` data field off the entity's chord trait instances. */
  private readChordTraitField(
    worldId: string,
    field: string,
    ctx: EvalContext,
  ): { value: unknown; isEntityField: boolean } | undefined {
    const entity = ctx.world.getEntity(worldId);
    if (!entity) return undefined;
    for (const trait of entity.traits.values()) {
      if (!trait.type.startsWith(CHORD_TRAIT_PREFIX)) continue;
      const record = trait as unknown as Record<string, unknown>;
      if (field in record) {
        const traitName = trait.type.slice(CHORD_TRAIT_PREFIX.length);
        return { value: record[field], isEntityField: this.entityFields.get(traitName)?.has(field) ?? false };
      }
    }
    return undefined;
  }

  // --------------------------------------------------------------- helpers

  private playerId(world: WorldModel): string {
    const id = world.getPlayer()?.id ?? this.ids.playerWorldId();
    if (!id) throw new LoadError('No player entity exists yet.');
    return id;
  }

  private requireWorldId(irId: string): string {
    const id = this.ids.entityId(irId);
    if (!id) throw new LoadError(`Entity \`${irId}\` has no world instance.`);
    return id;
  }

  /** True when `thing` is located inside `container` at any depth. */
  /**
   * Walk the containment chain upward from `thing`, looking for `container`.
   *
   * The visited set (ADR-289 D8) is a termination guard, not a correctness
   * one: a containment CYCLE is rogue world state that no author construct
   * can produce, but `AuthorModel.moveEntity` writes the spatial index with
   * no cycle check, so one bad world-construction step used to spin this loop
   * forever. A hang is the worst failure shape available — a synchronous
   * infinite loop cannot be interrupted by a test timeout or a turn budget,
   * so it takes the whole process with it rather than failing loudly.
   *
   * @param thing     the entity to walk up from
   * @param container the ancestor being looked for
   * @returns true when `container` is an ancestor of `thing`; false on a cycle
   */
  private isWithin(world: WorldModel, thing: string, container: string): boolean {
    const visited = new Set<string>([thing]);
    let current = world.getLocation(thing);
    while (current) {
      if (current === container) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = world.getLocation(current);
    }
    return false;
  }

  /**
   * `one chance in <n>`: seeded draw whose cursor persists in world state,
   * so a fixed seed yields a byte-identical stream (AC-5) and restores
   * resume the stream (AC-6).
   */
  private drawChance(n: number, world: WorldModel): boolean {
    if (n <= 1) return true;
    const stored = world.getStateValue(CHORD_RNG_KEY);
    if (typeof stored === 'number') this.rng.setSeed(stored);
    const hit = this.rng.int(1, n) === 1;
    world.setStateValue(CHORD_RNG_KEY, this.rng.getSeed());
    return hit;
  }

  /**
   * Pick a 0-based index in [0, n) through the seeded story RNG (the same
   * world-state seed chain `chance` uses — deterministic under a fixed
   * seed, AC-5 class). Used by `randomly`/`sticky` phrase selection at
   * point of use (ADR-240's live blocked-message resolution).
   */
  pickIndex(n: number, world: WorldModel): number {
    const stored = world.getStateValue(CHORD_RNG_KEY);
    if (typeof stored === 'number') this.rng.setSeed(stored);
    const pick = this.rng.int(1, n) - 1;
    world.setStateValue(CHORD_RNG_KEY, this.rng.getSeed());
    return pick;
  }
}
