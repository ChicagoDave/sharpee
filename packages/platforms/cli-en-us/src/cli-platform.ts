import type { GameEngine, SequencedEvent, PlatformEvent, SaveContext, RestoreContext, QuitContext, RestartContext } from '@sharpee/sharpee';
import { 
  QueryManager, 
  createQueryManager, 
  PendingQuery,
  QueryResponse,
  QuerySource,
  QueryType,
  PlatformEventType,
  isPlatformRequestEvent,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent,
  SemanticEvent
} from '@sharpee/sharpee';
import { CLIInput } from './cli-input';
import { CLIOutput } from './cli-output';
import { CLIQuery } from './cli-query';

export class CLIPlatform {
  private input: CLIInput;
  private output: CLIOutput;
  private query: CLIQuery;
  private queryManager: QueryManager;
  private pendingPlatformOps: PlatformEvent[] = [];
  
  constructor(private engine: GameEngine) {
    this.input = new CLIInput();
    this.output = new CLIOutput();
    this.query = new CLIQuery();
    this.queryManager = createQueryManager();
  }
  
  initialize(): void {
    this.setupQueryHandlers();
    this.setupEventHandlers();
    this.output.initialize(this.engine);
    // Query system is now handled by platform's QueryManager
    // this.query.initialize(this.engine);
  }
  
  private setupQueryHandlers(): void {
    // Setup query manager event handlers
    this.queryManager.on('query:pending', (query: PendingQuery) => {
      // Display query to user through CLI
      // Use messageId to get the actual prompt text
      const promptText = query.messageParams?.prompt || query.messageId || 'Please answer:';
      console.log('\n' + promptText);
      if (query.options && query.options.length > 0) {
        console.log('Options:');
        query.options.forEach((opt, idx) => {
          console.log(`  ${idx + 1}. ${opt}`);
        });
      }
    });

    this.queryManager.on('query:invalid', (input: string, result: any, query: PendingQuery) => {
      if (result.message) {
        console.log(result.message);
      }
      if (result.hint) {
        console.log(`Hint: ${result.hint}`);
      }
    });

    // Subscribe query manager events to engine
    this.queryManager.getEventSource().subscribe((evt) => {
      this.engine.emitPlatformEvent(evt);
    });
  }

  private setupEventHandlers(): void {
    // Listen for semantic events through the event source
    this.engine.on('event', (event: SequencedEvent) => {
      // Convert SequencedEvent to SemanticEvent for platform event checking
      const semanticEvent: SemanticEvent = {
        id: event.source || `evt_${event.turn}_${event.sequence}`,
        type: event.type,
        timestamp: event.timestamp.getTime(),
        entities: {},
        data: event.data
      };
      
      // Check if this is a platform request event that we need to handle
      if (isPlatformRequestEvent(semanticEvent)) {
        this.pendingPlatformOps.push(semanticEvent as PlatformEvent);
        // Process it immediately (we could also batch these)
        this.processPlatformOperations();
      }
      
      // Handle platform completion events (for backwards compatibility)
      if (event.type === 'platform.quit.confirmed') {
        this.handleQuit();
      } else if (event.type === 'platform.save.completed') {
        this.handleSave(event.data);
      } else if (event.type === 'platform.restore.completed') {
        this.handleRestore(event.data);
      } else if (event.type === 'platform.restart.completed') {
        this.handleRestart();
      } else if (event.type === 'client.query') {
        // Handle queries through our QueryManager
        this.handleClientQuery(event.data);
      }
    });
    
    // Listen for text output
    this.engine.on('text:output', (text: string, turn: number) => {
      this.output.write(text);
    });
  }
  
  private handleQuit(): void {
    console.log('\nGoodbye!');
    process.exit(0);
  }
  
  private handleSave(data: any): void {
    console.log('Save functionality not yet implemented');
  }
  
  private handleRestore(data: any): void {
    console.log('Restore functionality not yet implemented');
  }
  
  private handleRestart(): void {
    console.log('Restart functionality not yet implemented');
  }
  
  async run(): Promise<void> {
    this.output.write('Welcome to the game!\n');
    
    while (true) {
      const command = await this.input.getCommand();
      if (!command) break;
      
      // Check if query manager should handle this input
      if (this.queryManager.hasPendingQuery()) {
        const queryResult = this.queryManager.processInput(command);
        if (queryResult === 'handled') {
          continue; // Input was consumed by query
        } else if (queryResult === 'interrupt') {
          // Query was interrupted, pass command to engine
        }
        // If 'pass', continue normal processing
      }
      
      try {
        await this.engine.executeTurn(command);
      } catch (error) {
        console.error('Error executing command:', error);
      }
    }
  }

  private async handleClientQuery(data: any): Promise<void> {
    const query: PendingQuery = {
      id: data.id || `query_${Date.now()}`,
      source: data.source || QuerySource.SYSTEM,
      type: data.type || QueryType.FREE_TEXT,
      messageId: data.messageId || 'query.prompt',
      messageParams: { prompt: data.prompt || 'Please answer:' },
      options: data.options,
      validator: data.validator,
      context: data.context || {},
      allowInterruption: data.allowInterruption !== false,
      timeout: data.timeout,
      priority: data.priority,
      created: Date.now()
    };

    // Special handling for quit confirmation
    if (query.messageId === 'quit_confirmation') {
      const quitHandler = {
        canHandle: (q: PendingQuery) => q.messageId === 'quit_confirmation',
        handleResponse: async (response: QueryResponse) => {
          if (response.response === 'yes' || response.response === true) {
            const event = createQuitConfirmedEvent();
            this.engine.emitPlatformEvent(event);
          } else {
            const event = createQuitCancelledEvent();
            this.engine.emitPlatformEvent(event);
          }
        },
        handleCancel: async () => {
          const event = createQuitCancelledEvent();
          this.engine.emitPlatformEvent(event);
        }
      };
      this.queryManager.registerHandler('quit', quitHandler);
    }

    await this.queryManager.askQuery(query);
  }

  private async processPlatformOperations(): Promise<void> {
    while (this.pendingPlatformOps.length > 0) {
      const platformOp = this.pendingPlatformOps.shift()!;
      
      try {
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED: {
            const context = (platformOp.data as any).context as SaveContext;
            // For now, just emit completion event
            // In a real implementation, would handle actual save
            const event = createSaveCompletedEvent(false, 'Save not yet implemented');
            this.engine.emitPlatformEvent(event);
            break;
          }
          
          case PlatformEventType.RESTORE_REQUESTED: {
            const context = (platformOp.data as any).context as RestoreContext;
            // For now, just emit completion event
            const event = createRestoreCompletedEvent(false, 'Restore not yet implemented');
            this.engine.emitPlatformEvent(event);
            break;
          }
          
          case PlatformEventType.QUIT_REQUESTED: {
            const context = (platformOp.data as any).context as QuitContext;
            
            // Always ask for confirmation unless explicitly disabled
            const shouldConfirm = context.hasUnsavedChanges !== false;
            if (shouldConfirm) {
              const query: PendingQuery = {
                id: `quit_${Date.now()}`,
                source: QuerySource.SYSTEM,
                type: QueryType.YES_NO,
                messageId: 'quit_confirmation',
                messageParams: { prompt: 'Are you sure you want to quit? (yes/no)' },
                validator: 'yes_no',
                context: { source: 'quit', ...context },
                allowInterruption: false,
                created: Date.now()
              };
              await this.queryManager.askQuery(query);
            } else {
              // Quit without confirmation
              const event = createQuitConfirmedEvent();
              this.engine.emitPlatformEvent(event);
            }
            break;
          }
          
          case PlatformEventType.RESTART_REQUESTED: {
            const context = (platformOp.data as any).context as RestartContext;
            // For now, just emit completion event
            const event = createRestartCompletedEvent(false);
            this.engine.emitPlatformEvent(event);
            break;
          }
        }
      } catch (error) {
        console.error('Error processing platform operation:', error);
        // Emit appropriate error event based on operation type
        let errorEvent: PlatformEvent;
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED:
            errorEvent = createSaveCompletedEvent(false, error instanceof Error ? error.message : 'Unknown error');
            break;
          case PlatformEventType.RESTORE_REQUESTED:
            errorEvent = createRestoreCompletedEvent(false, error instanceof Error ? error.message : 'Unknown error');
            break;
          case PlatformEventType.QUIT_REQUESTED:
            errorEvent = createQuitCancelledEvent();
            break;
          case PlatformEventType.RESTART_REQUESTED:
            errorEvent = createRestartCompletedEvent(false);
            break;
          default:
            continue;
        }
        this.engine.emitPlatformEvent(errorEvent);
      }
    }
  }
}