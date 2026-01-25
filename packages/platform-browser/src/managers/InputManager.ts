/**
 * InputManager - handles command input and history navigation
 */

export interface InputManagerConfig {
  /** Command input element */
  commandInput: HTMLInputElement | null;
  /** Callback to execute a command */
  onCommand: (command: string) => Promise<void>;
  /** Check if dialog is open (to prevent input) */
  isDialogOpen: () => boolean;
}

export class InputManager {
  private commandInput: HTMLInputElement | null;
  private onCommand: (command: string) => Promise<void>;
  private isDialogOpen: () => boolean;

  // Command history
  private commandHistory: string[] = [];
  private historyIndex = -1;

  constructor(config: InputManagerConfig) {
    this.commandInput = config.commandInput;
    this.onCommand = config.onCommand;
    this.isDialogOpen = config.isDialogOpen;
  }

  /**
   * Set up input event handlers
   */
  setupHandlers(): void {
    if (!this.commandInput) return;

    // Handle keyboard input
    this.commandInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      }
    });

    // Keep focus on input (but not when dialog is open)
    document.addEventListener('click', (e) => {
      if (this.commandInput && !this.commandInput.disabled && !this.isDialogOpen()) {
        // Don't steal focus from dialog elements
        const target = e.target as HTMLElement;
        if (!target.closest('.modal-dialog')) {
          this.commandInput.focus();
        }
      }
    });
  }

  /**
   * Handle command submission
   */
  private async handleSubmit(): Promise<void> {
    if (!this.commandInput) return;

    const command = this.commandInput.value.trim();
    if (!command) return;

    // Add to history
    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    // Clear input
    this.commandInput.value = '';

    // Execute command
    await this.onCommand(command);
  }

  /**
   * Navigate command history
   */
  navigateHistory(direction: number): void {
    if (!this.commandInput) return;

    const newIndex = this.historyIndex + direction;

    if (newIndex < 0) return;

    if (newIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.commandInput.value = '';
      return;
    }

    this.historyIndex = newIndex;
    this.commandInput.value = this.commandHistory[this.historyIndex];

    // Move cursor to end
    this.commandInput.setSelectionRange(
      this.commandInput.value.length,
      this.commandInput.value.length
    );
  }

  /**
   * Clear the input field
   */
  clearInput(): void {
    if (this.commandInput) {
      this.commandInput.value = '';
    }
  }

  /**
   * Focus the input field
   */
  focus(): void {
    this.commandInput?.focus();
  }

  /**
   * Disable the input field
   */
  disable(): void {
    if (this.commandInput) {
      this.commandInput.disabled = true;
    }
  }

  /**
   * Enable the input field
   */
  enable(): void {
    if (this.commandInput) {
      this.commandInput.disabled = false;
    }
  }

  /**
   * Get the command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }
}
