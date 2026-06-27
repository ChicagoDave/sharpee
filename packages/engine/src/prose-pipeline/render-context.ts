/**
 * Per-turn RenderContext runtime for the phrase pipeline (ADR-192 §6, W2).
 *
 * The Assembler realizes a phrase tree against a `RenderContext`: a read-only
 * world, the bound params, locale settings, and three declared seams
 * (`reference` / `textState` / `contribute`). This module supplies the engine's
 * runtime for that contract — a thin adapter over the world model plus inert
 * placeholder seams whose real implementations land in ADR-195–197. The engine
 * owns this per turn; nothing here mutates world state.
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
  ReferenceContext,
  RenderContext,
  RenderWorld,
  SlotContributionOptions,
  TextStateStore,
  Phrase,
} from '@sharpee/if-domain';

/**
 * The minimal world surface the render world adapter needs. The engine's
 * `WorldModel` satisfies this structurally; declaring only the three methods
 * keeps the prose pipeline honest about what it reads (it never mutates).
 */
export interface WorldModelLike {
  getEntity(id: EntityId): IEntity | undefined;
  getContents(containerId: EntityId): IEntity[];
  getContainingRoom(entityId: EntityId): IEntity | undefined;
}

/**
 * Wrap a world model as the read-only `RenderWorld` the Assembler consumes.
 *
 * @param world the live world model (read-only access only)
 * @returns a `RenderWorld` delegating to the model's lookup methods
 */
export function createRenderWorld(world: WorldModelLike): RenderWorld {
  return {
    getEntity: (entityId) => world.getEntity(entityId),
    getEntityContents: (entityId) => world.getContents(entityId),
    getContainingRoom: (entityId) => world.getContainingRoom(entityId),
  };
}

/**
 * Placeholder last-mentioned context (ADR-197 SEAM). Reports no last-mentioned
 * entity and discards notes; a later `Pronoun` realization replaces this with a
 * real implementation. Inert but contract-complete so the seam is exercised.
 */
class PlaceholderReferenceContext implements ReferenceContext {
  lastMentioned(): EntityId | undefined {
    return undefined;
  }
  note(_referableId: EntityId): void {
    // ADR-197: no-op until last-mentioned tracking lands.
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
 * World, locale settings, and the three seams are the turn's invariants and are
 * captured once; only `params` vary per message, so the returned factory is
 * called once per rendered message. The `contribute` channel collects slot
 * contributions for the turn (no-op consumers until ADR-195).
 *
 * @param world the read-only render world (see {@link createRenderWorld})
 * @param settings the locale realization settings for this turn
 * @returns a factory that yields a `RenderContext` for a message's params
 */
export function createRenderContextFactory(
  world: RenderWorld,
  settings: LocaleSettings,
): RenderContextFactory {
  // Per-turn seams: shared across every message rendered this turn.
  const reference = new PlaceholderReferenceContext();
  const textState = new EmptyTextStateStore();
  const contribute = (
    _slotKey: string,
    _phrase: Phrase,
    _opts?: SlotContributionOptions,
  ): void => {
    // ADR-195: slot contributions are dropped until the slot channel lands.
  };

  return (params) => ({
    world,
    params,
    settings,
    reference,
    textState,
    contribute,
  });
}
