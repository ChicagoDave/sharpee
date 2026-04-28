/**
 * `useWorld` — React hook + context for the room's read-only world mirror
 * (ADR-162 AC-5).
 *
 * Public interface: {@link WorldContext}, {@link WorldProvider}, {@link useWorld}.
 *
 * Bounded context: client room view (ADR-153 frontend). The provider is
 * mounted by `Room.tsx` once `RoomState.world` exists; `useWorld()` is the
 * single read seam every renderer feature (StatusLine, future map /
 * inventory / scope-aware UI) should consume.
 *
 * Design:
 *   - The context value is the `ReadOnlyWorldModel | null` from the room
 *     reducer. Components read it directly — no per-render hydration.
 *   - The narrowing to `ReadOnlyWorldModel` is type-only; the underlying
 *     instance is a full `WorldModel` with mutators present at runtime.
 *     Compile-time enforcement of read-only-ness is the value of the
 *     narrowing — see ADR-162 AC-7.
 *   - `null` while the room is unhydrated and after a malformed snapshot
 *     where no prior mirror existed; renderers must guard.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { ReadOnlyWorldModel } from '../types/wire';

export const WorldContext = createContext<ReadOnlyWorldModel | null>(null);

export interface WorldProviderProps {
  world: ReadOnlyWorldModel | null;
  children: ReactNode;
}

/**
 * Provide the room's mirror to every descendant. The provider is a thin
 * pass-through; identity changes (a new mirror after each turn) propagate
 * normally through React's context machinery.
 */
export function WorldProvider({ world, children }: WorldProviderProps): JSX.Element {
  return <WorldContext.Provider value={world}>{children}</WorldContext.Provider>;
}

/**
 * Read the current world mirror. Returns `null` before the first
 * hydration; renderers must check before querying.
 *
 * @example
 *   const world = useWorld();
 *   if (!world) return <span>…</span>;
 *   const player = world.getEntity(playerId);
 */
export function useWorld(): ReadOnlyWorldModel | null {
  return useContext(WorldContext);
}
