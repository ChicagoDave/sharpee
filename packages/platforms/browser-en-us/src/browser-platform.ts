import type { 
  GameEngine, 
  SequencedEvent, 
  PlatformEvent, 
  SemanticEvent 
} from '@sharpee/sharpee';
import { 
  QueryManager, 
  createQueryManager,
  PendingQuery,
  QuerySource,
  QueryType,
  PlatformEventType,
  isPlatformRequestEvent,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent
} from '@sharpee/sharpee';
import { BrowserClient } from './browser-client';

export class BrowserPlatform {
  private client: BrowserClient;
  private queryManager: QueryManager;
  private pendingPlatformOps: PlatformEvent[] = [];
  private isRunning: boolean = false;
  private currentTurn: number = 0;
  private currentScore: number = 0;
  
  constructor(private engine: GameEngine) {
    this.client = new BrowserClient();
    this.queryManager = createQueryManager();
  }
  
  initialize(): void {
    this.setupQueryHandlers();
    this.setupEventHandlers();
    this.setupInputHandler();
  }
  
  private setupQueryHandlers(): void {
    // Setup query manager event handlers
    this.queryManager.on('query:pending', (query: PendingQuery) => {
      // Display query in browser UI
      const promptText = query.messageParams?.prompt || query.messageId || 'Please answer:';
      if (query.options && query.options.length > 0) {
        const optionsList = query.options.map((opt, idx) => `  ${idx + 1}. ${opt}`).join('\n');
        this.client.displayText(`${promptText}\n\n${optionsList}`);
      } else {
        this.client.displayText(promptText);
      }
    });

    this.queryManager.on('query:invalid', (input: string, result: any, query: PendingQuery) => {
      const message = result.message || 'Invalid input';
      const hint = result.hint || '';
      this.client.displayText(`[${message}${hint ? ` Hint: ${hint}` : ''}]`);
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
      // Spread original event to preserve extra properties like requiresClientAction
      const semanticEvent: SemanticEvent = {
        ...(event as any),
        id: event.source || `evt_${event.turn}_${event.sequence}`,
        type: event.type,
        timestamp: event.timestamp.getTime(),
        entities: (event as any).entities || {},
        data: event.data,
        payload: (event as any).payload || event.data
      };

      // Check if this is a platform request event that we need to handle
      if (isPlatformRequestEvent(semanticEvent)) {
        this.pendingPlatformOps.push(semanticEvent as PlatformEvent);
        // Process it immediately
        this.processPlatformOperations();
      }
      
      // Handle platform completion events
      if (event.type === 'platform.quit.confirmed') {
        this.handleQuit();
      } else if (event.type === 'platform.save.completed') {
        this.handleSave(event.data);
      } else if (event.type === 'platform.restore.completed') {
        this.handleRestore(event.data);
      } else if (event.type === 'platform.restart.completed') {
        this.handleRestart();
      } else if (event.type === 'client.query') {
        this.handleClientQuery(event.data);
      }
    });
    
    // Listen for text output from the text service
    this.engine.on('text:output', (text: string, turn: number) => {
      // Display the narrative text
      this.client.displayText(text);
      
      // Update turn counter
      this.currentTurn = turn;
      this.updateStatusLine();
    });
  }
  
  private setupInputHandler(): void {
    // Handle command input from browser
    this.client.onCommand((command: string) => {
      if (!this.isRunning) return;
      
      // Check if query manager should handle this input
      if (this.queryManager.hasPendingQuery()) {
        const queryResult = this.queryManager.processInput(command);
        if (queryResult === 'handled') {
          return; // Input was consumed by query
        } else if (queryResult === 'interrupt') {
          // Query was interrupted, pass command to engine
        }
        // If 'pass', continue normal processing
      }
      
      // Process command through engine
      this.engine.executeTurn(command).catch(error => {
        this.client.displayText(`[Error: ${error.message}]`);
      });
    });
  }
  
  private updateStatusLine(): void {
    // Get current location from world
    const world = this.engine.getWorld();
    const player = world.getPlayer();
    let location = '';
    
    if (player) {
      const locationId = world.getLocation(player.id);
      if (locationId) {
        const room = world.getEntity(locationId);
        if (room) {
          location = room.name || 'Unknown';
        }
      }
    }
    
    // Update client status line
    this.client.updateStatus(location, this.currentScore, this.currentTurn);
  }
  
  private handleQuit(): void {
    this.isRunning = false;
    this.client.displayText('\nThanks for playing!\n');
    this.client.setInputEnabled(false);
    
    // In browser, we don't exit - just disable the game
    // Could show a restart button or redirect
  }
  
  private handleSave(data: any): void {
    // Use localStorage for browser saves
    try {
      const saveData = {
        timestamp: Date.now(),
        world: data.worldState,
        engine: data.engineState,
        turn: data.turn
      };
      localStorage.setItem('sharpee-save', JSON.stringify(saveData));
      this.client.displayText('[Game saved.]');
    } catch (error) {
      this.client.displayText('[Failed to save game.]');
    }
  }
  
  private handleRestore(data: any): void {
    // Restore from localStorage
    try {
      const saveData = localStorage.getItem('sharpee-save');
      if (saveData) {
        const parsed = JSON.parse(saveData);
        // Would need to implement actual restore logic
        this.client.displayText('[Game restored.]');
      } else {
        this.client.displayText('[No saved game found.]');
      }
    } catch (error) {
      this.client.displayText('[Failed to restore game.]');
    }
  }
  
  private handleRestart(): void {
    // Reload the page for restart
    if (confirm('Are you sure you want to restart?')) {
      window.location.reload();
    }
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    this.client.setInputEnabled(true);
    
    // Start the game engine
    this.engine.start();
    
    // Show initial text
    this.client.displayText('Type commands to play.\n');
    
    // Execute 'look' command to show initial room
    await this.engine.executeTurn('look');
  }
  
  stop(): void {
    this.isRunning = false;
    this.client.setInputEnabled(false);
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
      const shouldQuit = confirm('Are you sure you want to quit?');
      if (shouldQuit) {
        const event = createQuitConfirmedEvent();
        this.engine.emitPlatformEvent(event);
      } else {
        const event = createQuitCancelledEvent();
        this.engine.emitPlatformEvent(event);
      }
      return;
    }

    await this.queryManager.askQuery(query);
  }

  private async processPlatformOperations(): Promise<void> {
    while (this.pendingPlatformOps.length > 0) {
      const platformOp = this.pendingPlatformOps.shift()!;
      
      try {
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED:
            // Trigger save
            const saveEvent = createSaveCompletedEvent(true);
            this.engine.emitPlatformEvent(saveEvent);
            break;
          
          case PlatformEventType.RESTORE_REQUESTED:
            // Trigger restore
            const restoreEvent = createRestoreCompletedEvent(true);
            this.engine.emitPlatformEvent(restoreEvent);
            break;
          
          case PlatformEventType.QUIT_REQUESTED:
            // Show confirmation dialog
            if (confirm('Are you sure you want to quit?')) {
              const event = createQuitConfirmedEvent();
              this.engine.emitPlatformEvent(event);
            } else {
              const event = createQuitCancelledEvent();
              this.engine.emitPlatformEvent(event);
            }
            break;
          
          case PlatformEventType.RESTART_REQUESTED:
            this.handleRestart();
            break;
        }
      } catch (error) {
        console.error('Error processing platform operation:', error);
      }
    }
  }
}