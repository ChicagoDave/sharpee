import * as readline from 'readline';

export class CLIInput {
  private rl: readline.Interface;
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  async getCommand(): Promise<string | null> {
    return new Promise((resolve) => {
      this.rl.question('> ', (answer) => {
        resolve(answer.trim() || null);
      });
    });
  }
  
  close(): void {
    this.rl.close();
  }
}