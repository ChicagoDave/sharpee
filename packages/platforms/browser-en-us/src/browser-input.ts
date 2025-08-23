/**
 * Browser input handler for Sharpee
 * Manages command input from the browser UI
 */

export class BrowserInput {
  private commandInput: HTMLInputElement | null = null;
  private commandCallbacks: Array<(command: string) => void> = [];
  private enabled: boolean = false;
  
  constructor() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }
  
  private initialize(): void {
    this.commandInput = document.getElementById('command-input') as HTMLInputElement;
    
    if (!this.commandInput) {
      console.error('Command input element not found');
      return;
    }
    
    // Set up event listener
    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.enabled) {
        const command = this.commandInput!.value.trim();
        if (command) {
          this.commandInput!.value = '';
          this.notifyCallbacks(command);
        }
      }
    });
  }
  
  onCommand(callback: (command: string) => void): void {
    this.commandCallbacks.push(callback);
  }
  
  private notifyCallbacks(command: string): void {
    for (const callback of this.commandCallbacks) {
      callback(command);
    }
  }
  
  enable(): void {
    this.enabled = true;
    if (this.commandInput) {
      this.commandInput.disabled = false;
      this.commandInput.focus();
    }
  }
  
  disable(): void {
    this.enabled = false;
    if (this.commandInput) {
      this.commandInput.disabled = true;
    }
  }
  
  setValue(value: string): void {
    if (this.commandInput) {
      this.commandInput.value = value;
    }
  }
  
  focus(): void {
    if (this.commandInput && this.enabled) {
      this.commandInput.focus();
    }
  }
}