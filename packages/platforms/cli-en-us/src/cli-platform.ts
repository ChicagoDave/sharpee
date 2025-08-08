import { GameEngine } from '@sharpee/engine';
import { CLIInput } from './cli-input';
import { CLIOutput } from './cli-output';
import { CLIQuery } from './cli-query';

export class CLIPlatform {
  private input: CLIInput;
  private output: CLIOutput;
  private query: CLIQuery;
  
  constructor(private engine: GameEngine) {
    this.input = new CLIInput();
    this.output = new CLIOutput();
    this.query = new CLIQuery();
  }
  
  initialize(): void {
    this.setupEventHandlers();
    this.output.initialize(this.engine);
    this.query.initialize(this.engine);
  }
  
  private setupEventHandlers(): void {
    this.engine.events.on('platform.quit', () => {
      this.handleQuit();
    });
    
    this.engine.events.on('platform.save', (data) => {
      this.handleSave(data);
    });
    
    this.engine.events.on('platform.restore', (data) => {
      this.handleRestore(data);
    });
    
    this.engine.events.on('platform.restart', () => {
      this.handleRestart();
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
      
      await this.engine.processCommand(command);
    }
  }
}