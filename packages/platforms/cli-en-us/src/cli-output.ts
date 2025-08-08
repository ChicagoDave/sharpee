import { GameEngine } from '@sharpee/engine';

export class CLIOutput {
  private engine?: GameEngine;
  
  initialize(engine: GameEngine): void {
    this.engine = engine;
    
    this.engine.events.on('output', (data) => {
      this.write(data.text);
    });
    
    this.engine.events.on('text.output', (data) => {
      this.write(data.text);
    });
  }
  
  write(text: string): void {
    process.stdout.write(text);
    if (!text.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }
}