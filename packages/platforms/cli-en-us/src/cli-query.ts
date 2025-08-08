import { GameEngine } from '@sharpee/engine';
import * as readline from 'readline';

export class CLIQuery {
  private engine?: GameEngine;
  private rl?: readline.Interface;
  
  initialize(engine: GameEngine): void {
    this.engine = engine;
    
    this.engine.events.on('client.query', async (data) => {
      const response = await this.handleQuery(data);
      this.engine.events.emit('client.queryResponse', {
        queryId: data.queryId,
        response
      });
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
      
      this.rl.question(`\n${prompt} `, (answer) => {
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