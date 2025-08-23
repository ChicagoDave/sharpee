/**
 * Browser Client for Sharpee IF
 * 
 * This is the browser-specific UI layer that:
 * 1. Displays text from the text service
 * 2. Captures player input
 * 3. Updates status line
 * 
 * It does NOT translate events - that's the text service's job
 */

export class BrowserClient {
    private statusLine: HTMLElement | null = null;
    private locationElement: HTMLElement | null = null;
    private scoreElement: HTMLElement | null = null;
    private textContent: HTMLElement | null = null;
    private mainWindow: HTMLElement | null = null;
    private commandInput: HTMLInputElement | null = null;
    
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private onCommandCallback?: (command: string) => void;
    
    constructor() {
        this.initialize();
    }
    
    private initialize(): void {
        // Wait for DOM if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDOM());
        } else {
            this.setupDOM();
        }
    }
    
    private setupDOM(): void {
        // Get DOM elements
        this.statusLine = document.getElementById('status-line');
        this.locationElement = document.getElementById('location-name');
        this.scoreElement = document.getElementById('score-turns');
        this.textContent = document.getElementById('text-content');
        this.mainWindow = document.getElementById('main-window');
        this.commandInput = document.getElementById('command-input') as HTMLInputElement;
        
        if (!this.commandInput) {
            console.error('Browser client: Command input element not found');
            return;
        }
        
        // Set up input handling
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });
        
        // Keep focus on input
        document.addEventListener('click', () => {
            if (this.commandInput && !this.commandInput.disabled) {
                this.commandInput.focus();
            }
        });
    }
    
    /**
     * Display text in the main window
     * This is the primary output from the text service
     */
    displayText(text: string): void {
        if (!this.textContent) return;
        
        // Parse text for special formatting
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.trim()) {
                const element = this.createTextElement(line);
                this.textContent.appendChild(element);
            }
        }
        
        this.scrollToBottom();
    }
    
    /**
     * Display command echo (what the player typed)
     */
    displayCommand(command: string): void {
        if (!this.textContent) return;
        
        const element = document.createElement('div');
        element.className = 'command-echo';
        element.textContent = `> ${command}`;
        this.textContent.appendChild(element);
        
        this.scrollToBottom();
    }
    
    /**
     * Clear the main text window
     */
    clearText(): void {
        if (this.textContent) {
            this.textContent.innerHTML = '';
        }
    }
    
    /**
     * Update the status line
     */
    updateStatus(location?: string, score?: number, turns?: number): void {
        if (location && this.locationElement) {
            this.locationElement.textContent = location;
        }
        
        if (this.scoreElement) {
            if (score !== undefined || turns !== undefined) {
                const scoreText = score !== undefined ? score : 0;
                const turnsText = turns !== undefined ? turns : 0;
                this.scoreElement.textContent = `Score: ${scoreText} | Turns: ${turnsText}`;
            }
        }
    }
    
    /**
     * Enable/disable command input
     */
    setInputEnabled(enabled: boolean): void {
        if (this.commandInput) {
            this.commandInput.disabled = !enabled;
            if (enabled) {
                this.commandInput.focus();
            }
        }
    }
    
    /**
     * Set callback for when player enters a command
     */
    onCommand(callback: (command: string) => void): void {
        this.onCommandCallback = callback;
    }
    
    private handleCommand(): void {
        if (!this.commandInput) return;
        
        const command = this.commandInput.value.trim();
        if (!command) return;
        
        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Clear input
        this.commandInput.value = '';
        
        // Display echo
        this.displayCommand(command);
        
        // Notify callback
        if (this.onCommandCallback) {
            this.onCommandCallback(command);
        }
    }
    
    private navigateHistory(direction: number): void {
        if (!this.commandInput) return;
        
        const newIndex = this.historyIndex + direction;
        
        if (newIndex < 0 || newIndex >= this.commandHistory.length) {
            if (newIndex >= this.commandHistory.length) {
                this.historyIndex = this.commandHistory.length;
                this.commandInput.value = '';
            }
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
    
    private createTextElement(line: string): HTMLElement {
        const element = document.createElement('p');
        
        // Check for special formatting
        if (line.startsWith('***') && line.endsWith('***')) {
            // Game over / victory message
            element.className = 'game-status';
            element.textContent = line;
        } else if (line.startsWith('[') && line.endsWith(']')) {
            // System message
            element.className = 'system-message';
            element.textContent = line;
        } else {
            // Normal text
            element.textContent = line;
        }
        
        return element;
    }
    
    private scrollToBottom(): void {
        if (this.mainWindow) {
            this.mainWindow.scrollTop = this.mainWindow.scrollHeight;
        }
    }
}