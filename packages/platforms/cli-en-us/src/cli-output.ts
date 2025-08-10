import type { GameEngine } from '@sharpee/sharpee';

export class CLIOutput {
  private engine?: GameEngine;
  
  initialize(engine: GameEngine): void {
    this.engine = engine;
    
    // Text output is already handled in cli-platform.ts setupEventHandlers
    // This is here for any additional output handling if needed
  }
  
  write(text: string): void {
    process.stdout.write(text);
    if (!text.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }
}