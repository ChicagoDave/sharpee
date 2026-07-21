/**
 * Interceptor lifecycle descriptors (ADR-228).
 *
 * A descriptor is an action's declarative statement of its interceptor
 * surface: which command entities carry interceptors under which action
 * ids, in what order they are consulted, and which rare special contracts
 * apply. The shared lifecycle engine (`lifecycle-engine.ts`) executes the
 * ADR-228 rulings (D1 veto-only, D2 structured onBlocked, D3 all-entities
 * fixed order, D4 per-item multi-object) against this declaration — the
 * action never hand-rolls hook plumbing.
 *
 * An action is "wired" for interceptors iff it has a descriptor; the
 * stdlib wired-action registry (ADR-228 D5) is derived mechanically from
 * the descriptor table, never hand-maintained.
 *
 * Public interface: `ActionLifecycleDescriptor`, `EntitySlotSpec`,
 * `LifecycleContracts`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 */

import { IFEntity } from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types.js';

/**
 * One consultable entity slot of a command.
 *
 * Slots are declared in the published consultation order (ADR-228 D3-B):
 * direct object → indirect object / instrument → action-specific implicit
 * entities (e.g. going's door, source room, destination room; exiting's
 * current container). Validate-phase vetoes stop the chain at the first
 * vetoing slot; postExecute/postReport run for every slot that survived.
 *
 * Both-ids rule (ADR-228 D6): a slot may consult more than one action id
 * (specific id first — e.g. removing consults `if.action.removing` then
 * `if.action.taking` on the item). One physical operation can therefore
 * fire hooks under two ids; a trait should register its interceptor under
 * exactly one of them to avoid double-mutation.
 */
export interface EntitySlotSpec {
  /**
   * Slot identity — stable, human-readable, unique within the descriptor
   * (e.g. 'directObject', 'container', 'item', 'weapon', 'door', 'source',
   * 'destination'). Used in docs, diagnostics, and tests.
   */
  id: string;

  /**
   * Action ids to consult on this slot's entity, in consultation order
   * (specific id before delegated id per D6).
   */
  actionIds: string[];

  /**
   * Resolve this slot's entity from the command. Return `undefined` when
   * the slot is not present in this particular command (e.g. no indirect
   * object) — the slot is then skipped, never an error.
   *
   * Implicit-entity slots resolve here too (going's source/destination
   * rooms, exiting's current container) — resolution is not limited to
   * parsed command objects.
   */
  resolve(context: ActionContext): IFEntity | undefined;

  /**
   * Optional seed for the slot's per-consultation sharedData, applied at
   * resolve time. Used for symmetric cross-entity context (ADR-228 D3
   * sub-ruling: the item-side hook in putting/inserting receives the
   * container id, mirroring how the container's hook receives the item id).
   *
   * @param context - The action context.
   * @param entity - This slot's resolved entity.
   * @param multiObjectItem - In a multi-object per-item resolution (D4),
   *   the item currently being processed — so a shared slot (e.g. the
   *   container in "put all in case") can seed per-item context like the
   *   item id. Undefined for single-object commands and for the item slot
   *   itself (where `entity` IS the item).
   */
  seedData?(
    context: ActionContext,
    entity: IFEntity,
    multiObjectItem?: IFEntity
  ): Record<string, unknown>;
}

/**
 * Rare, explicit special contracts (ADR-228 D7.3). A contract changes the
 * engine's standard hook semantics for the action and MUST be declared
 * here — never encoded as a comment or an ad-hoc branch in the action.
 */
export interface LifecycleContracts {
  /**
   * attacking only: when a combatant target's interceptor implements
   * postExecute, that hook REPLACES the action's standard combat
   * resolution instead of running after it. The action reads this flag to
   * decide whether to run its core execute logic; the engine still runs
   * the hook itself normally.
   */
  postExecuteReplacesCore?: boolean;
}

/**
 * An action's declarative interceptor surface (ADR-228 D0-B).
 *
 * Supplied by the action to the lifecycle engine at each phase boundary.
 * Descriptors are static per action (module-level constants) — anything
 * command-dependent lives in slot `resolve`/`seedData` functions.
 */
export interface ActionLifecycleDescriptor {
  /**
   * The action's primary id (e.g. `IFActions.TAKING`). Used for
   * diagnostics and the D5 registry derivation.
   */
  actionId: string;

  /**
   * Entity slots in the published consultation order (D3-B): direct
   * object → indirect/instrument → implicit entities.
   */
  slots: EntitySlotSpec[];

  /** Rare special contracts (D7.3). Omit unless the ADR names one. */
  contracts?: LifecycleContracts;
}
