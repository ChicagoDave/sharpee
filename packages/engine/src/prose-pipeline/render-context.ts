/**
 * Per-turn RenderContext runtime for the phrase pipeline (ADR-192 §6, W2).
 *
 * The Assembler realizes a phrase tree against a `RenderContext`: a read-only
 * world, the bound params, locale settings, and the declared seams
 * (`reference` / `textState` / `contribute` + `slotContributions`). This module
 * supplies the engine's runtime for that contract — a thin adapter over the world
 * model, the live turn-scoped slot store (ADR-195), and the live persistent
 * `textState` store (ADR-196). The engine owns this per turn. The ONE sanctioned
 * mutation is the `textState` capability write (ADR-196 §4 — the declared exception
 * ADR-192 §7 reserved for deterministic `Choice` variation); entity and spatial
 * state are never touched here.
 *
 * Public interface: `createRenderWorld`, `createRenderContextFactory`,
 * `WorldTextStateStore`, `WorldModelLike`. The factory binds the per-turn
 * invariants (world, settings, seams) once and yields a per-message
 * `RenderContext` by adding that message's params.
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
import { StandardCapabilities } from '@sharpee/world-model';
import { nounPhraseFor as nounPhraseForEntity } from '@sharpee/stdlib';

/** The world capability backing the persistent text-state store (ADR-196 §4). */
const TEXT_STATE_CAPABILITY: string = StandardCapabilities.TEXT_STATE;

/**
 * The minimal world surface the render world adapter needs. The engine's
 * `WorldModel` satisfies this structurally; declaring only the methods the
 * pipeline reads keeps it honest. The pipeline never mutates entity/spatial
 * state — the one sanctioned write is the `textState` capability (ADR-196 §4),
 * exposed through the OPTIONAL capability accessors below. They are optional
 * (the ADR-195 optional-seam precedent) so test mocks that wire only the read
 * methods keep compiling; a world without them degrades to an empty text-state
 * store (no persistence, `Choice` starts at counter 0 — AC-9).
 */
export interface WorldModelLike {
  getEntity(id: EntityId): IEntity | undefined;
  getContents(containerId: EntityId): IEntity[];
  getContainingRoom(entityId: EntityId): IEntity | undefined;
  /** The player entity, for narrative verb-person agreement (ADR-199 §4 B). */
  getPlayer(): IEntity | undefined;
  /** Read a capability's data map (ADR-196 text-state read). */
  getCapability?(name: string): Record<string, unknown> | undefined;
  /** Merge into a capability's data map (ADR-196 text-state write — the one sanctioned mutation). */
  updateCapability?(name: string, updates: Record<string, unknown>): void;
  /** Whether a capability is registered (guards the defensive self-register). */
  hasCapability?(name: string): boolean;
  /** Register a capability if absent (defensive — the engine normally registers `textState` at setup). */
  registerCapability?(name: string, registration?: { initialData?: Record<string, unknown> }): void;
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
 * Empty per-`(entityId, messageKey)` store — the world-less fallback (ADR-196).
 * A render context built without a capability-bearing world uses this: every
 * `get` is `undefined` (so `Choice` starts at counter 0) and `set` is a no-op.
 * Used by the no-world / string-path pipelines and test stubs.
 */
class EmptyTextStateStore implements TextStateStore {
  get(_entityId: EntityId, _messageKey: string): number | undefined {
    return undefined;
  }
  set(_entityId: EntityId, _messageKey: string, _value: number): void {
    // No backing capability — nothing to persist.
  }
}

/** The `textState` map shape (ADR-196 §4): `{ [entityId]: { [messageKey]: number } }`. */
type TextStateData = Record<string, Record<string, number>>;

/**
 * The persistent per-`(entityId, messageKey)` text-state store (ADR-196 §4).
 *
 * Backed by the `textState` world capability, which serializes with the world —
 * so a `Choice`'s cycle index / trigger count / sticky pick survives turns and
 * save/restore (S13–S14). The engine registers the capability at setup
 * (`game-engine.ts`); this store also self-registers defensively so it works in
 * tests and standalone render contexts.
 *
 * A world that does not expose the optional capability accessors degrades to the
 * empty-store behavior (no persistence) — AC-9.
 */
export class WorldTextStateStore implements TextStateStore {
  constructor(private readonly world: WorldModelLike) {}

  get(entityId: EntityId, messageKey: string): number | undefined {
    const data = this.world.getCapability?.(TEXT_STATE_CAPABILITY) as TextStateData | undefined;
    return data?.[entityId]?.[messageKey];
  }

  set(entityId: EntityId, messageKey: string, value: number): void {
    // Degrade silently when the world has no capability surface (AC-9 / world-less).
    if (!this.world.updateCapability || !this.world.getCapability) return;
    // Defensive self-register: the engine registers `textState` at setup, but a
    // standalone/test world may not. Guarded so we never double-register.
    if (this.world.hasCapability?.(TEXT_STATE_CAPABILITY) === false) {
      this.world.registerCapability?.(TEXT_STATE_CAPABILITY, { initialData: {} });
    }
    const data = (this.world.getCapability(TEXT_STATE_CAPABILITY) as TextStateData | undefined) ?? {};
    // Merge into this entity's submap, preserving its other message keys; other
    // entities' submaps are untouched (updateCapability Object.assigns the top key).
    const forEntity = { ...(data[entityId] ?? {}), [messageKey]: value };
    this.world.updateCapability(TEXT_STATE_CAPABILITY, { [entityId]: forEntity });
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
 * @param textState the persistent text-state store backing `Choice` (ADR-196 §4);
 *   defaults to the empty store for world-less / string-path callers
 * @returns a factory that yields a `RenderContext` for a message's params
 */
export function createRenderContextFactory(
  world: RenderWorld,
  settings: LocaleSettings,
  narrative: NarrativeAgreement,
  textState: TextStateStore = new EmptyTextStateStore(),
): RenderContextFactory {
  // Per-turn seams: shared across every message rendered this turn. `textState`
  // is the ONE persistent seam (ADR-196) — it lives in the world capability, not
  // the turn; the others (reference, slots) are turn-scoped.
  const reference = new TurnReferenceContext();
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
