/**
 * SchedulerService - Manages Daemons and Fuses (ADR-071)
 *
 * The scheduler runs during the turn cycle, after NPCs act:
 * 1. Player action
 * 2. NPC turns
 * 3. Scheduler tick (daemons run, fuses count down)
 * 4. Turn complete
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import {
  Daemon,
  Fuse,
  DaemonState,
  FuseState,
  DaemonInfo,
  FuseInfo,
  SchedulerContext,
  SchedulerResult,
  SchedulerState,
  RandomService,
} from './types.js';

/**
 * SchedulerService interface
 */
export interface ISchedulerService {
  // Daemon management
  registerDaemon(daemon: Daemon): void;
  removeDaemon(id: string): void;
  pauseDaemon(id: string): void;
  resumeDaemon(id: string): void;
  hasDaemon(id: string): boolean;

  // Fuse management
  setFuse(fuse: Fuse): void;
  cancelFuse(id: string): ISemanticEvent[];
  getFuseRemaining(id: string): number | undefined;
  adjustFuse(id: string, delta: number): void;
  pauseFuse(id: string): void;
  resumeFuse(id: string): void;
  hasFuse(id: string): boolean;

  // Lifecycle. `random` is the session's per-point stream owner (ADR-293),
  // threaded from the turn-plugin context into every daemon/fuse context.
  tick(world: WorldModel, turn: number, playerId: EntityId, random: RandomService): SchedulerResult;

  // Introspection
  getActiveDaemons(): DaemonInfo[];
  getActiveFuses(): FuseInfo[];

  // Serialization
  getState(): SchedulerState;
  setState(state: SchedulerState): void;

  // Entity cleanup
  cleanupEntity(entityId: EntityId): ISemanticEvent[];
}

/**
 * Create a unique event ID
 */
function createEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * SchedulerService implementation
 */
export class SchedulerService implements ISchedulerService {
  private daemons: Map<string, Daemon> = new Map();
  private daemonStates: Map<string, DaemonState> = new Map();
  private fuses: Map<string, Fuse> = new Map();
  private fuseStates: Map<string, FuseState> = new Map();
  private currentTurn: number = 0;

  // ==================== Daemon Management ====================

  registerDaemon(daemon: Daemon): void {
    if (this.daemons.has(daemon.id)) {
      throw new Error(`Daemon with id "${daemon.id}" already exists`);
    }

    this.daemons.set(daemon.id, daemon);
    this.daemonStates.set(daemon.id, {
      id: daemon.id,
      isPaused: false,
      runCount: 0,
    });
  }

  removeDaemon(id: string): void {
    this.daemons.delete(id);
    this.daemonStates.delete(id);
  }

  pauseDaemon(id: string): void {
    const state = this.daemonStates.get(id);
    if (state) {
      state.isPaused = true;
    }
  }

  resumeDaemon(id: string): void {
    const state = this.daemonStates.get(id);
    if (state) {
      state.isPaused = false;
    }
  }

  hasDaemon(id: string): boolean {
    return this.daemons.has(id);
  }

  // ==================== Fuse Management ====================

  setFuse(fuse: Fuse): void {
    // Store original turns for repeating fuses
    const fuseWithOriginal: Fuse = {
      ...fuse,
      originalTurns: fuse.originalTurns ?? fuse.turns,
    };

    this.fuses.set(fuse.id, fuseWithOriginal);
    this.fuseStates.set(fuse.id, {
      id: fuse.id,
      turnsRemaining: fuse.turns,
      isPaused: false,
      entityId: fuse.entityId,
      skipNextTick: true,
    });
  }

  cancelFuse(id: string): ISemanticEvent[] {
    const fuse = this.fuses.get(id);
    const state = this.fuseStates.get(id);

    if (!fuse || !state) {
      return [];
    }

    // Call onCancel if defined
    let events: ISemanticEvent[] = [];
    if (fuse.onCancel) {
      // Fuse cancellation runs outside a tick: no world and no RandomService
      // are available. Drawing in onCancel is a wiring error — the stub
      // throws loudly instead of minting entropy (ADR-293 D6).
      const noDrawContext = (): never => {
        throw new Error('SchedulerService: onCancel has no RandomService — draw in onTrigger instead (ADR-293)');
      };
      const context = this.createContext(undefined as unknown as WorldModel, this.currentTurn, '', undefined, {
        chance: noDrawContext,
        int: noDrawContext,
        pick: noDrawContext,
        resolve: noDrawContext,
      });
      try {
        events = fuse.onCancel(context);
      } catch (error) {
        console.error(`Error in fuse "${id}" onCancel:`, error);
      }
    }

    this.fuses.delete(id);
    this.fuseStates.delete(id);

    return events;
  }

  getFuseRemaining(id: string): number | undefined {
    return this.fuseStates.get(id)?.turnsRemaining;
  }

  adjustFuse(id: string, delta: number): void {
    const state = this.fuseStates.get(id);
    if (state) {
      state.turnsRemaining = Math.max(0, state.turnsRemaining + delta);
    }
  }

  pauseFuse(id: string): void {
    const state = this.fuseStates.get(id);
    if (state) {
      state.isPaused = true;
    }
  }

  resumeFuse(id: string): void {
    const state = this.fuseStates.get(id);
    if (state) {
      state.isPaused = false;
    }
  }

  hasFuse(id: string): boolean {
    return this.fuses.has(id);
  }

  // ==================== Tick (Main Loop) ====================

  tick(world: WorldModel, turn: number, playerId: EntityId, random: RandomService): SchedulerResult {
    this.currentTurn = turn;

    const events: ISemanticEvent[] = [];
    const fusesTriggered: string[] = [];
    const daemonsRun: string[] = [];

    // Get player location
    const playerLocation = world.getLocation(playerId) || '';

    // Create context
    const context = this.createContext(world, turn, playerLocation, playerId, random);

    // 1. Run daemons (sorted by priority, highest first)
    const sortedDaemons = this.getSortedDaemons();
    for (const daemon of sortedDaemons) {
      const state = this.daemonStates.get(daemon.id);
      if (!state || state.isPaused) continue;

      // Check condition
      if (daemon.condition && !daemon.condition(context)) {
        continue;
      }

      // Run the daemon
      try {
        const daemonEvents = daemon.run(context);
        if (daemonEvents.length > 0) {
          events.push(...daemonEvents);
          daemonsRun.push(daemon.id);
          state.runCount++;

          // Remove if runOnce and produced events
          if (daemon.runOnce) {
            this.removeDaemon(daemon.id);
          }
        }
      } catch (error) {
        console.error(`Error running daemon "${daemon.id}":`, error);
      }
    }

    // 2. Process fuses
    const fusesToRemove: string[] = [];
    const sortedFuses = this.getSortedFuses();

    for (const fuse of sortedFuses) {
      const state = this.fuseStates.get(fuse.id);
      if (!state || state.isPaused) continue;

      // Skip fuses set this turn (they start ticking next turn)
      if (state.skipNextTick) {
        state.skipNextTick = false;
        continue;
      }

      // Check tick condition
      if (fuse.tickCondition && !fuse.tickCondition(context)) {
        continue;
      }

      // Decrement turns
      state.turnsRemaining--;

      // Check if triggered
      if (state.turnsRemaining <= 0) {
        try {
          const fuseEvents = fuse.trigger(context);
          events.push(...fuseEvents);
          fusesTriggered.push(fuse.id);

          if (fuse.repeat && fuse.originalTurns) {
            // Reset for repeat
            state.turnsRemaining = fuse.originalTurns;
          } else {
            // Mark for removal
            fusesToRemove.push(fuse.id);
          }
        } catch (error) {
          console.error(`Error triggering fuse "${fuse.id}":`, error);
          fusesToRemove.push(fuse.id);
        }
      }
    }

    // Remove triggered fuses
    for (const id of fusesToRemove) {
      this.fuses.delete(id);
      this.fuseStates.delete(id);
    }

    return { events, fusesTriggered, daemonsRun };
  }

  // ==================== Introspection ====================

  getActiveDaemons(): DaemonInfo[] {
    const infos: DaemonInfo[] = [];

    for (const [id, daemon] of this.daemons) {
      const state = this.daemonStates.get(id);
      if (!state) continue;

      infos.push({
        id: daemon.id,
        name: daemon.name,
        isPaused: state.isPaused,
        runCount: state.runCount,
        priority: daemon.priority ?? 0,
      });
    }

    return infos.sort((a, b) => b.priority - a.priority);
  }

  getActiveFuses(): FuseInfo[] {
    const infos: FuseInfo[] = [];

    for (const [id, fuse] of this.fuses) {
      const state = this.fuseStates.get(id);
      if (!state) continue;

      infos.push({
        id: fuse.id,
        name: fuse.name,
        turnsRemaining: state.turnsRemaining,
        isPaused: state.isPaused,
        entityId: state.entityId,
        priority: fuse.priority ?? 0,
        repeat: fuse.repeat ?? false,
      });
    }

    return infos.sort((a, b) => b.priority - a.priority);
  }

  // ==================== Serialization ====================

  getState(): SchedulerState {
    const daemons: DaemonState[] = [];
    const fuses: FuseState[] = [];

    for (const state of this.daemonStates.values()) {
      const daemon = this.daemons.get(state.id);
      const runnerState = daemon?.getRunnerState?.();
      daemons.push({ ...state, ...(runnerState !== undefined ? { runnerState } : {}) });
    }

    for (const state of this.fuseStates.values()) {
      fuses.push({ ...state });
    }

    return {
      turn: this.currentTurn,
      daemons,
      fuses,
    };
  }

  /**
   * Restore scheduler state from a save.
   *
   * **A restore is a reset, not a merge.** This used to iterate the SAVE and
   * overwrite whatever ids it happened to name, which meant anything created
   * after the save survived untouched. Fuses are the sharp edge: unlike
   * daemons, which register once at game start, a fuse is lit during play —
   * so a fuse lit after the save went on ticking in a world that restored to
   * before it was lit.
   *
   * That is invisible in ordinary play, where you restore over your own
   * later state and a stray fuse looks like the story. It is not invisible
   * to branch testing, where two children restore the same parent save
   * (ADR-302 D10): the first child's pending fuses leaked into the second,
   * so a test passed alone and failed with a sibling — an order-dependent
   * result from a mechanism whose whole purpose is that order does not
   * matter. Found by running Fernhill's tree; see issue #226.
   *
   * Reconciliation, in both directions:
   *  - registered AND in the save → restore the saved state;
   *  - a daemon registered but absent from the save → reset to its
   *    registration default, since the save predates whatever it counted;
   *  - a fuse absent from the save → it did not exist then, so it is
   *    extinguished rather than left to burn.
   *
   * A fuse present in the save but no longer registered cannot be revived: a
   * fuse's callback is not serializable, so the definition is gone with it.
   * That is a pre-existing limit of the format, not something this
   * reconciliation introduces, and it is skipped rather than faked.
   */
  setState(state: SchedulerState): void {
    this.currentTurn = state.turn;

    const savedDaemons = new Map(state.daemons.map((d) => [d.id, d]));
    for (const id of [...this.daemonStates.keys()]) {
      const saved = savedDaemons.get(id);
      if (saved) {
        this.daemonStates.set(id, { ...saved });
        if (saved.runnerState) {
          this.daemons.get(id)?.restoreRunnerState?.(saved.runnerState);
        }
        continue;
      }
      this.daemonStates.set(id, { id, isPaused: false, runCount: 0 });
    }

    const savedFuses = new Map(state.fuses.map((f) => [f.id, f]));
    for (const id of [...this.fuseStates.keys()]) {
      const saved = savedFuses.get(id);
      if (saved) {
        this.fuseStates.set(id, { ...saved });
        continue;
      }
      this.fuses.delete(id);
      this.fuseStates.delete(id);
    }
  }

  // ==================== Entity Cleanup ====================

  cleanupEntity(entityId: EntityId): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    // Cancel any fuses bound to this entity
    for (const [id, state] of this.fuseStates) {
      if (state.entityId === entityId) {
        events.push(...this.cancelFuse(id));
      }
    }

    return events;
  }

  // ==================== Private Helpers ====================

  private createContext(
    world: WorldModel,
    turn: number,
    playerLocation: EntityId,
    playerId: EntityId | undefined,
    random: RandomService
  ): SchedulerContext {
    return {
      world,
      turn,
      random,
      playerLocation,
      playerId: playerId || '',
    };
  }

  private getSortedDaemons(): Daemon[] {
    return Array.from(this.daemons.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }

  private getSortedFuses(): Fuse[] {
    return Array.from(this.fuses.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }
}

/**
 * Create a new SchedulerService instance. The scheduler owns no stream of
 * its own (ADR-293): daemons draw through declared points on the
 * RandomService threaded into `tick()`.
 */
export function createSchedulerService(): ISchedulerService {
  return new SchedulerService();
}
