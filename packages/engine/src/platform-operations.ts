/**
 * Platform Operations Handler - Handles platform events (save/restore/quit/restart/undo)
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Uses strategy pattern to handle different platform operation types.
 */

import {
  IPlatformEvent,
  ISemanticEvent,
  ISemanticEventSource,
  ISaveRestoreHooks,
  ISaveData,
  ISaveContext,
  IRestoreContext,
  IQuitContext,
  IRestartContext,
  PlatformEventType,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent,
  createUndoCompletedEvent
} from '@sharpee/core';
import type { IParser } from '@sharpee/world-model';
import { SaveRestoreService, ISaveRestoreStateProvider } from './save-restore-service';
import { VocabularyManager } from './vocabulary-manager';
import { hasPronounContext } from './parser-interface';

/**
 * Context for platform operation handling
 */
export interface PlatformOperationContext {
  currentTurn: number;
  turnEvents: Map<number, ISemanticEvent[]>;
  eventSource: ISemanticEventSource;
  emitEvent: (event: ISemanticEvent) => void;
}

/**
 * Callbacks for engine-level operations that require engine access
 */
export interface EngineCallbacks {
  stopEngine: (reason?: 'quit' | 'victory' | 'defeat' | 'abort') => void;
  restartStory: () => Promise<void>;
  updateContext: (updates: { currentTurn?: number }) => void;
  updateScopeVocabulary: () => void;
  emitStateChanged: () => void;
  getParser: () => IParser | undefined;
}

/**
 * Handler for platform operations
 */
export class PlatformOperationHandler {
  constructor(
    private saveRestoreHooks: ISaveRestoreHooks | undefined,
    private saveRestoreService: SaveRestoreService,
    private stateProvider: ISaveRestoreStateProvider,
    private vocabularyManager: VocabularyManager
  ) {}

  /**
   * Process all pending platform operations
   *
   * @param pendingOps - Array of pending platform operations
   * @param context - Platform operation context
   * @param engineCallbacks - Callbacks for engine-level operations
   */
  async processAll(
    pendingOps: IPlatformEvent[],
    context: PlatformOperationContext,
    engineCallbacks: EngineCallbacks
  ): Promise<void> {
    // Ensure there's an entry for the current turn
    if (!context.turnEvents.has(context.currentTurn)) {
      context.turnEvents.set(context.currentTurn, []);
    }

    for (const platformOp of pendingOps) {
      try {
        const resultEvent = await this.handleOperation(
          platformOp,
          context,
          engineCallbacks
        );

        if (resultEvent) {
          // Add to event source and turn events
          context.eventSource.emit(resultEvent);
          context.turnEvents.get(context.currentTurn)?.push(resultEvent);
          context.emitEvent(resultEvent);
        }
      } catch (error) {
        console.error(`Error processing platform operation ${platformOp.type}:`, error);

        // Emit appropriate error event
        const errorEvent = this.createErrorEvent(
          platformOp.type,
          error instanceof Error ? error.message : 'Unknown error'
        );

        if (errorEvent) {
          context.eventSource.emit(errorEvent);
          context.turnEvents.get(context.currentTurn)?.push(errorEvent);
          context.emitEvent(errorEvent);
        }
      }
    }
  }

  /**
   * Handle a single platform operation
   */
  private async handleOperation(
    platformOp: IPlatformEvent,
    context: PlatformOperationContext,
    engineCallbacks: EngineCallbacks
  ): Promise<ISemanticEvent | null> {
    switch (platformOp.type) {
      case PlatformEventType.SAVE_REQUESTED:
        return this.handleSave(platformOp);

      case PlatformEventType.RESTORE_REQUESTED:
        return this.handleRestore(platformOp, engineCallbacks);

      case PlatformEventType.QUIT_REQUESTED:
        return this.handleQuit(platformOp, context, engineCallbacks);

      case PlatformEventType.RESTART_REQUESTED:
        return this.handleRestart(platformOp, context, engineCallbacks);

      case PlatformEventType.UNDO_REQUESTED:
        return this.handleUndo(engineCallbacks);

      default:
        return null;
    }
  }

  /**
   * Handle save request
   */
  private async handleSave(platformOp: IPlatformEvent): Promise<ISemanticEvent> {
    if (!this.saveRestoreHooks?.onSaveRequested) {
      return createSaveCompletedEvent(false, 'No save handler registered');
    }

    const saveContext = platformOp.payload.context as ISaveContext | undefined;
    const saveData = this.saveRestoreService.createSaveData(this.stateProvider);

    // Add any additional context from the platform event
    if (saveContext?.saveName) {
      saveData.metadata.description = saveContext.saveName;
    }
    if (saveContext?.metadata) {
      Object.assign(saveData.metadata, saveContext.metadata);
    }

    await this.saveRestoreHooks.onSaveRequested(saveData);
    return createSaveCompletedEvent(true);
  }

  /**
   * Handle restore request
   */
  private async handleRestore(
    platformOp: IPlatformEvent,
    engineCallbacks: EngineCallbacks
  ): Promise<ISemanticEvent> {
    if (!this.saveRestoreHooks?.onRestoreRequested) {
      return createRestoreCompletedEvent(false, 'No restore handler registered');
    }

    const saveData = await this.saveRestoreHooks.onRestoreRequested();
    if (!saveData) {
      return createRestoreCompletedEvent(
        false,
        'No save data available or restore cancelled'
      );
    }

    const result = this.saveRestoreService.loadSaveData(saveData, this.stateProvider);

    // Update context
    engineCallbacks.updateContext({ currentTurn: result.currentTurn });

    // Reset pronoun context
    const parser = engineCallbacks.getParser();
    if (parser && hasPronounContext(parser)) {
      parser.resetPronounContext();
    }

    // Update vocabulary for current scope
    engineCallbacks.updateScopeVocabulary();
    engineCallbacks.emitStateChanged();

    return createRestoreCompletedEvent(true);
  }

  /**
   * Handle quit request
   */
  private async handleQuit(
    platformOp: IPlatformEvent,
    context: PlatformOperationContext,
    engineCallbacks: EngineCallbacks
  ): Promise<ISemanticEvent> {
    const quitContext = platformOp.payload.context as IQuitContext | undefined;

    if (this.saveRestoreHooks?.onQuitRequested) {
      const shouldQuit = await this.saveRestoreHooks.onQuitRequested(quitContext || {});
      if (shouldQuit) {
        engineCallbacks.stopEngine('quit');
        return createQuitConfirmedEvent();
      } else {
        return createQuitCancelledEvent();
      }
    } else {
      // No quit hook registered, auto-confirm
      return createQuitConfirmedEvent();
    }
  }

  /**
   * Handle restart request
   */
  private async handleRestart(
    platformOp: IPlatformEvent,
    context: PlatformOperationContext,
    engineCallbacks: EngineCallbacks
  ): Promise<ISemanticEvent> {
    const restartContext = platformOp.payload.context as IRestartContext | undefined;

    if (this.saveRestoreHooks?.onRestartRequested) {
      const shouldRestart = await this.saveRestoreHooks.onRestartRequested(
        restartContext || {}
      );
      if (shouldRestart) {
        // Reset pronoun context
        const parser = engineCallbacks.getParser();
        if (parser && hasPronounContext(parser)) {
          parser.resetPronounContext();
        }

        await engineCallbacks.restartStory();
        return createRestartCompletedEvent(true);
      } else {
        return createRestartCompletedEvent(false);
      }
    } else {
      // No restart hook registered - default behavior is to restart
      const parser = engineCallbacks.getParser();
      if (parser && hasPronounContext(parser)) {
        parser.resetPronounContext();
      }

      await engineCallbacks.restartStory();
      return createRestartCompletedEvent(true);
    }
  }

  /**
   * Handle undo request
   */
  private handleUndo(engineCallbacks: EngineCallbacks): ISemanticEvent {
    const world = this.stateProvider.getWorld();
    const result = this.saveRestoreService.undo(world);

    if (result) {
      // Update context with restored turn
      engineCallbacks.updateContext({ currentTurn: result.turn });

      // Update vocabulary for current scope
      engineCallbacks.updateScopeVocabulary();
      engineCallbacks.emitStateChanged();

      return createUndoCompletedEvent(true, result.turn);
    } else {
      return createUndoCompletedEvent(false, undefined, 'Nothing to undo');
    }
  }

  /**
   * Create an error event for a failed operation
   */
  private createErrorEvent(
    operationType: string,
    errorMessage: string
  ): ISemanticEvent | null {
    switch (operationType) {
      case PlatformEventType.SAVE_REQUESTED:
        return createSaveCompletedEvent(false, errorMessage);
      case PlatformEventType.RESTORE_REQUESTED:
        return createRestoreCompletedEvent(false, errorMessage);
      case PlatformEventType.QUIT_REQUESTED:
        return createQuitCancelledEvent();
      case PlatformEventType.RESTART_REQUESTED:
        return createRestartCompletedEvent(false);
      case PlatformEventType.UNDO_REQUESTED:
        return createUndoCompletedEvent(false, undefined, errorMessage);
      default:
        return null;
    }
  }
}

/**
 * Create a platform operation handler instance
 */
export function createPlatformOperationHandler(
  saveRestoreHooks: ISaveRestoreHooks | undefined,
  saveRestoreService: SaveRestoreService,
  stateProvider: ISaveRestoreStateProvider,
  vocabularyManager: VocabularyManager
): PlatformOperationHandler {
  return new PlatformOperationHandler(
    saveRestoreHooks,
    saveRestoreService,
    stateProvider,
    vocabularyManager
  );
}
