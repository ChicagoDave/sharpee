/**
 * Platform-operation dispatcher: the one place a platform request (save,
 * restore, quit, restart, undo, again) becomes its completion or failure
 * event.
 *
 * Both engine paths call `dispatchPlatformOperations` with the same
 * contract and differ only in the list they hand over. A meta command
 * passes the one request its action emitted and collects the delivered
 * events into its result; a regular turn passes the drained pending list
 * and delivers each event to the event source, the turn's event list, and
 * the engine's emitter. The switch on the request type lives here and
 * nowhere else under the engine's source; a request whose hook throws is
 * answered by `platformOperationFailure`, the one error mapping, and never
 * stops the rest of the list.
 *
 * Delivery happens inside each operation at the point the old inline
 * paths emitted — a restart's acknowledgment is delivered before the
 * engine stops, a quit's confirmation after — so the order of events in a
 * turn is the order it always was.
 *
 * Public interface: `dispatchPlatformOperations`, `PlatformOperationHost`,
 * `platformOperationFailure`, `PlatformEventDelivery`.
 * Owner context: `@sharpee/engine` — turn cycle, platform operations.
 *
 * References: ADR-334 D3 (one dispatcher, AGAIN included); ADR-248
 * (a confirmed restart acknowledges in the final packet and stops with
 * reason 'restart'; no pre-emptive completion event).
 */

import {
  type IPlatformEvent,
  type ISemanticEvent,
  type ISaveRestoreHooks,
  type ISaveData,
  type ISaveContext,
  type IQuitContext,
  type IRestartContext,
  type IAgainContext,
  PlatformEventType,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent,
  createUndoCompletedEvent,
  createAgainFailedEvent
} from '@sharpee/core';

/**
 * What an operation needs from the engine. The engine builds one per
 * dispatch so the hooks read are the hooks registered now, never a copy
 * captured at construction.
 */
export interface PlatformOperationHost {
  /** The save/restore hooks as currently registered, if any. */
  readonly saveRestoreHooks: Partial<ISaveRestoreHooks> | undefined;
  /** Snapshot the engine's state for a save. */
  createSaveData(): ISaveData;
  /** Load a save into the engine, replacing the world and turn. */
  loadSaveData(saveData: ISaveData): void;
  /** Stop the engine with the given reason. */
  stop(reason: 'quit' | 'restart'): void;
  /** The restart acknowledgment rendered in the final packet. */
  createRestartAckEvent(): ISemanticEvent;
  /** Undo one turn; false when there is nothing to undo. */
  undo(): boolean;
  /** The turn number after an undo. */
  currentTurn(): number;
  /** Run a command as a fresh turn (the AGAIN repeat). */
  repeatCommand(command: string): Promise<void>;
}

/** Receives each completion or failure event as the operation produces it. */
export type PlatformEventDelivery = (event: ISemanticEvent) => void;

/**
 * Run each request in order, delivering its completion events as they
 * arise. A request whose hook throws delivers its failure event instead
 * and the next request still runs.
 *
 * @param operations - The requests to run: one for a meta command, the
 *   drained pending list for a turn
 * @param host - The engine surface the operations act on
 * @param deliver - Where each completion or failure event goes
 */
export async function dispatchPlatformOperations(
  operations: readonly IPlatformEvent[],
  host: PlatformOperationHost,
  deliver: PlatformEventDelivery
): Promise<void> {
  for (const operation of operations) {
    try {
      await runPlatformOperation(operation, host, deliver);
    } catch (error) {
      console.error(`Error processing platform operation ${operation.type}:`, error);
      const failure = platformOperationFailure(operation.type, error);
      if (failure) {
        deliver(failure);
      }
    }
  }
}

/**
 * The failure event for a request whose operation threw, or undefined for
 * an event type that is not a request.
 *
 * @param operationType - The request's event type
 * @param error - What the operation threw
 */
export function platformOperationFailure(
  operationType: string,
  error: unknown
): IPlatformEvent | undefined {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return FAILURE_EVENT[operationType]?.(message);
}

/** One failure event per request type — the one error mapping. */
const FAILURE_EVENT: Readonly<Record<string, (message: string) => IPlatformEvent>> = {
  [PlatformEventType.SAVE_REQUESTED]: (message) => createSaveCompletedEvent(false, message),
  [PlatformEventType.RESTORE_REQUESTED]: (message) => createRestoreCompletedEvent(false, message),
  [PlatformEventType.QUIT_REQUESTED]: () => createQuitCancelledEvent(),
  [PlatformEventType.RESTART_REQUESTED]: () => createRestartCompletedEvent(false),
  [PlatformEventType.UNDO_REQUESTED]: (message) => createUndoCompletedEvent(false, undefined, message),
  [PlatformEventType.AGAIN_REQUESTED]: (message) => createAgainFailedEvent(message)
};

/**
 * The one switch: run a single request against the host, delivering its
 * completion events at the points the operation produces them. Throws
 * propagate to the dispatcher's error mapping.
 */
async function runPlatformOperation(
  operation: IPlatformEvent,
  host: PlatformOperationHost,
  deliver: PlatformEventDelivery
): Promise<void> {
  const hooks = host.saveRestoreHooks;

  switch (operation.type) {
    case PlatformEventType.SAVE_REQUESTED: {
      if (!hooks?.onSaveRequested) {
        deliver(createSaveCompletedEvent(false, 'No save handler registered'));
        return;
      }
      const context = operation.payload.context as ISaveContext | undefined;
      const saveData = host.createSaveData();
      if (context?.saveName) {
        saveData.metadata.description = context.saveName;
      }
      if (context?.metadata) {
        Object.assign(saveData.metadata, context.metadata);
      }
      await hooks.onSaveRequested(saveData);
      deliver(createSaveCompletedEvent(true));
      return;
    }

    case PlatformEventType.RESTORE_REQUESTED: {
      if (!hooks?.onRestoreRequested) {
        deliver(createRestoreCompletedEvent(false, 'No restore handler registered'));
        return;
      }
      const saveData = await hooks.onRestoreRequested();
      if (!saveData) {
        deliver(createRestoreCompletedEvent(false, 'No save data available'));
        return;
      }
      host.loadSaveData(saveData);
      deliver(createRestoreCompletedEvent(true));
      return;
    }

    case PlatformEventType.QUIT_REQUESTED: {
      const context = operation.payload.context as IQuitContext;
      if (hooks?.onQuitRequested) {
        const shouldQuit = await hooks.onQuitRequested(context);
        if (!shouldQuit) {
          deliver(createQuitCancelledEvent());
          return;
        }
        host.stop('quit');
      }
      // No quit hook registered: auto-confirm without stopping here.
      deliver(createQuitConfirmedEvent());
      return;
    }

    case PlatformEventType.RESTART_REQUESTED: {
      const context = operation.payload.context as IRestartContext;
      const shouldRestart = hooks?.onRestartRequested
        ? await hooks.onRestartRequested(context)
        : true; // No restart hook: auto-confirm
      if (!shouldRestart) {
        deliver(createRestartCompletedEvent(false));
        return;
      }
      // The acknowledgment lands in the final packet, then the engine
      // stops; the client's reboot is the success signal.
      deliver(host.createRestartAckEvent());
      host.stop('restart');
      return;
    }

    case PlatformEventType.UNDO_REQUESTED: {
      if (!host.undo()) {
        deliver(createUndoCompletedEvent(false, undefined, 'Nothing to undo'));
        return;
      }
      deliver(createUndoCompletedEvent(true, host.currentTurn()));
      return;
    }

    case PlatformEventType.AGAIN_REQUESTED: {
      const context = operation.payload.context as IAgainContext | undefined;
      if (!context?.command) {
        deliver(createAgainFailedEvent('No command to repeat'));
        return;
      }
      // The repeated command dispatches as its own turn (meta or regular)
      // and reports its own text; a successful repeat needs no completion
      // event. A throw reaches the dispatcher's failure mapping.
      await host.repeatCommand(context.command);
      return;
    }

    default:
      // Completion events and other platform types are not requests.
      return;
  }
}
