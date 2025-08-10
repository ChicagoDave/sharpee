import type { GameEngine, SequencedEvent } from '@sharpee/sharpee';
import * as readline from 'readline';

export class CLIQuery {
  private engine?: GameEngine;
  private rl?: readline.Interface;
  
  initialize(engine: GameEngine): void {
    this.engine = engine;
    
    // Listen for query events through the event system
    this.engine.on('event', async (event: SequencedEvent) => {
      if (event.type === 'client.query') {
        const response = await this.handleQuery(event.data);
        // TODO: Need to emit response back through the engine
        // This might need a method on the engine to handle query responses
        console.log('Query response:', response);
      }
    });
  }
  
  private async handleQuery(data: any): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      
      const prompt = data.prompt || 'Please answer: ';
      const options = data.options || [];
      
      if (options.length > 0) {
        console.log('\nOptions:');
        options.forEach((opt: string, idx: number) => {
          console.log(`  ${idx + 1}. ${opt}`);
        });
      }
      
      this.rl.question(`\n${prompt} `, (answer: string) => {
        resolve(answer.trim());
      });
    });
  }
  
  close(): void {
    if (this.rl) {
      this.rl.close();
    }
  }
}