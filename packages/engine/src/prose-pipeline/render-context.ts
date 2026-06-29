/**
 * Per-turn RenderContext runtime for the phrase pipeline (ADR-192 §6, W2).
 *
 * The Assembler realizes a phrase tree against a `RenderContext`: a read-only
 * world, the bound params, locale settings, and the declared seams
 * (`reference` / `textState` / `contribute` + `slotContributions`). This module
 * supplies the engine's runtime for that contract — a thin adapter over the world
 * model, the live turn-scoped slot store (ADR-195), and the still-inert `textState`
 * placeholder (ADR-196). The engine owns this per turn; nothing here mutates world
 * state.
 *
 * Public interface: `createRenderWorld`, `createRenderContextFactory`,
 * `WorldModelLike`. The factory binds the per-turn invariants (world, settings,
 * seams) once and yields a per-message `RenderContext` by adding that message's
 * params.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-192 §6 (report pipeline / render context)
 * @see ADR-195 (contribute seam) / ADR-196 (textState seam) / ADR-197 (reference seam)
 */

import type { EntityId, IEntity } from '@sharpee/core';
import type {
  LocaleSettings,
  Mentioned,
  NarrativeAgreement,
  ReferenceContext,
  RenderContext,
  RenderWorld,
  SlotContributionOptions,
  TextStateStore,
  Phrase,
} from '@sharpee/if-domain';
import type { IFEntity } from '@sharpee/world-model';
import { nounPhraseFor as nounPhraseForEntity } from '@sharpee/stdlib';

/**
 * The minimal world surface the render world adapter needs. The engine's
 * `WorldModel` satisfies this structurally; declaring only the methods the
 * pipeline reads keeps it honest (it never mutates).
 */
export interface WorldModelLike {
  getEntity(id: EntityId): IEntity | undefined;
  getContents(containerId: EntityId): IEntity[];
  getContainingRoom(entityId: EntityId): IEntity | undefined;
  /** The player entity, for narrative verb-person agreement (ADR-199 §4 B). */
  getPlayer(): IEntity | undefined;
}

/**
 * Wrap a world model as the read-only `RenderWorld` the Assembler consumes.
 *
 * Supplies the entity→`NounPhrase` bridge (`nounPhraseFor`, ADR-194) by delegating
 * to stdlib's producer — the engine may depend on stdlib, lang-en-us may not, so the
 * bridge crosses here rather than in the Assembler.
 *
 * @param world the live world model (read-only access only)
 * @returns a `RenderWorld` delegating to the model's lookup methods
 */
export function createRenderWorld(world: WorldModelLike): RenderWorld {
  return {
    getEntity: (entityId) => world.getEntity(entityId),
    getEntityContents: (entityId) => world.getContents(entityId),
    getContainingRoom: (entityId) => world.getContainingRoom(entityId),
    nounPhraseFor: (entityId) => {
      const entity = world.getEntity(entityId);
      return entity ? nounPhraseForEntity(entity as IFEntity) : undefined;
    },
  };
}

/**
 * Last-mentioned reference context (ADR-197). Keeps the most recently realized
 * referent for the turn so a following `Pronoun` resolves to it. Per-turn and
 * realization-order-deterministic (the Assembler walks the tree in a fixed order).
 */
class TurnReferenceContext implements ReferenceContext {
  private last: Mentioned | undefined;
  lastMentioned(): Mentioned | undefined {
    return this.last;
  }
  note(mentioned: Mentioned): void {
    this.last = mentioned;
  }
}

/**
 * Placeholder per-`(entityId, messageKey)` store (ADR-196 SEAM). Always empty,
 * so `Choice` / `Optional` selections are unseeded; the real seeded store lands
 * in ADR-196.
 */
class EmptyTextStateStore implements TextStateStore {
  get(_entityId: EntityId, _messageKey: string): number | undefined {
    return undefined;
  }
  set(_entityId: EntityId, _messageKey: string, _value: number): void {
    // ADR-196: no-op until the deterministic text-state store lands.
  }
}

/**
 * One staged slot contribution: the phrase plus its two ordering keys (ADR-195 §2).
 */
interface SlotContribution {
  /** The contributed phrase (bare clause/sentence content). */
  phrase: Phrase;
  /** Primary ordering key from `SlotContributionOptions.order` (default 0). */
  order: number;
  /** Monotonic insertion index — the deterministic tie-break within one `order`. */
  seq: number;
}

/**
 * Turn-scoped slot contribution store (ADR-195 §2). One instance per turn — created
 * inside `createRenderContextFactory` and shared across every message rendered that
 * turn, so a contribution staged while building one message is visible when a
 * `{slot:key}` realizes in another.
 *
 * `read` is a PEEK, not a drain: it never consumes the store, so repeated reads and
 * two `{slot:key}` nodes sharing a key both see the same ordered list. Ordering is
 * `(order asc, seq asc)` — `seq` is monotonic insertion order, deterministic because
 * producers and contributors run in a fixed order, so output is stable across
 * save/replay (no `Date.now` / random). Never serialized — rebuilt every turn.
 */
class TurnSlotStore {
  private readonly byKey = new Map<string, SlotContribution[]>();
  private seq = 0;

  /** Stage a contribution under `slotKey`; orphan keys are simply never read. */
  contribute(slotKey: string, phrase: Phrase, opts?: SlotContributionOptions): void {
    const entry: SlotContribution = { phrase, order: opts?.order ?? 0, seq: this.seq++ };
    const list = this.byKey.get(slotKey);
    if (list) {
      list.push(entry);
    } else {
      this.byKey.set(slotKey, [entry]);
    }
  }

  /** Peek the key's contributions, ordered `(order asc, insertion asc)`; `[]` if none. */
  read(slotKey: string): Phrase[] {
    const list = this.byKey.get(slotKey);
    if (!list) return [];
    return [...list]
      .sort((a, b) => a.order - b.order || a.seq - b.seq)
      .map((c) => c.phrase);
  }
}

/**
 * A per-message render-context builder bound to a turn's invariants.
 *
 * @param params the message's parameter/producer bindings
 * @returns a `RenderContext` carrying those params plus the bound world,
 *   settings, and per-turn seams
 */
export type RenderContextFactory = (
  params: Record<string, unknown>,
) => RenderContext;

/**
 * Build the per-turn render-context factory.
 *
 * World, locale settings, and the seams are the turn's invariants and are
 * captured once; only `params` vary per message, so the returned factory is
 * called once per rendered message. The `contribute` / `slotContributions` pair
 * shares one turn-scoped {@link TurnSlotStore} across every message context, so a
 * slot contribution staged while building one message is visible when another
 * message's `{slot:key}` realizes (ADR-195 §2).
 *
 * @param world the read-only render world (see {@link createRenderWorld})
 * @param settings the locale realization settings for this turn
 * @param narrative the player id + narrative person for verb agreement (ADR-199 §4 B)
 * @returns a factory that yields a `RenderContext` for a message's params
 */
export function createRenderContextFactory(
  world: RenderWorld,
  settings: LocaleSettings,
  narrative: NarrativeAgreement,
): RenderContextFactory {
  // Per-turn seams: shared across every message rendered this turn.
  const reference = new TurnReferenceContext();
  const textState = new EmptyTextStateStore();
  const slots = new TurnSlotStore();
  const contribute = (
    slotKey: string,
    phrase: Phrase,
    opts?: SlotContributionOptions,
  ): void => slots.contribute(slotKey, phrase, opts);
  const slotContributions = (slotKey: string): Phrase[] => slots.read(slotKey);

  return (params) => ({
    world,
    params,
    settings,
    narrative,
    reference,
    textState,
    contribute,
    slotContributions,
  });
}
