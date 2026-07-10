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
import type { IRCondition, IRValue, StoryIR } from '@sharpee/chord';
import { createSeededRandom, SeededRandom } from '@sharpee/core';
import { RoomTrait, TraitType, WearableTrait, WorldModel } from '@sharpee/world-model';
import { LoadError } from './errors';
import { CHORD_RNG_KEY, CHORD_STATE_PREFIX } from './state-keys';

export interface EvalContext {
  world: WorldModel;
  /** IR entity id bound to `it` (the on-clause owner), when in scope. */
  it?: string;
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

  constructor(
    ir: StoryIR,
    private readonly ids: EntityIdResolver,
    seed?: number,
  ) {
    for (const c of ir.conditions) this.conditions.set(c.name, c.condition);
    this.rng = createSeededRandom(seed);
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
      case 'predicate':
        return this.evalPredicate(cond, ctx);
    }
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
        // Classification checks land with the quantifier grammar (Phase B).
        throw new LoadError('`is a` classification is not supported by the Phase A evaluator.');
      }
      case 'is-in': {
        const subjectId = this.entityValue(cond.subject, ctx);
        const placeId = this.entityValue(cond.object, ctx);
        return raw(this.isWithin(ctx.world, subjectId, placeId));
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
    }
  }

  /** `<subject> is <bare-word>`: a declared state or the `dark` trait. */
  private symbolHolds(subject: unknown, symbol: string, ctx: EvalContext): boolean {
    if (typeof subject === 'string') {
      // A state string read from a `state` field compares directly.
      if (subject === symbol) return true;
      const entity = ctx.world.getEntity(subject);
      if (entity) {
        if (symbol === 'dark') {
          const room = entity.get(TraitType.ROOM) as RoomTrait | undefined;
          return room?.isDark === true;
        }
        const irId = this.ids.irIdOf(subject);
        if (irId !== undefined) {
          const state = ctx.world.getStateValue(CHORD_STATE_PREFIX + irId);
          if (state !== undefined) return state === symbol;
        }
      }
    }
    return false;
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
      case 'entity':
        return this.requireWorldId(value.id);
      case 'field': {
        const base = this.evalValue(value.base, ctx);
        if (typeof base !== 'string') {
          throw new LoadError(`Cannot read \`${value.field}\` of a non-entity value.`);
        }
        return this.readField(base, value.field, ctx);
      }
    }
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
        return ctx.world.getLocation(worldId);
      case 'state': {
        const irId = this.ids.irIdOf(worldId);
        if (irId === undefined) throw new LoadError('Cannot read `state` of a non-story entity.');
        return ctx.world.getStateValue(CHORD_STATE_PREFIX + irId);
      }
      default:
        throw new LoadError(`Field \`${field}\` is not supported by the Phase A evaluator.`);
    }
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
  private isWithin(world: WorldModel, thing: string, container: string): boolean {
    let current = world.getLocation(thing);
    while (current) {
      if (current === container) return true;
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
}
