/**
 * Browser Client for Sharpee IF
 *
 * This is the browser-specific UI layer that:
 * 1. Displays text from the text service
 * 2. Captures player input
 * 3. Updates status line
 * 4. Forwards audio events to a registered handler
 *
 * It does NOT translate events - that's the text service's job.
 * Audio events are forwarded to an optional handler; if none is
 * registered, audio events are logged and silently dropped.
 *
 * Owner context: @sharpee/platform-browser-en-us
 */

import type { AudioEvent } from '@sharpee/sharpee';

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
    private onAudioEventCallback?: (event: AudioEvent) => void;
    private currentPrompt: string = '> ';

    /** Active ambient audio channels — keyed by channel name */
    private ambientChannels: Map<string, HTMLAudioElement> = new Map();
    /** Active music track */
    private musicTrack: HTMLAudioElement | null = null;
    /** Whether audio has been unlocked by a user gesture */
    private audioUnlocked: boolean = false;
    /** Audio events received before unlock — replayed after first gesture */
    private pendingAudioEvents: AudioEvent[] = [];
    
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
            this.unlockAudio();
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
        element.textContent = `${this.currentPrompt}${command}`;
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
     * Set the command prompt text (ADR-137)
     */
    setPrompt(prompt: string): void {
        this.currentPrompt = prompt;
        // Update placeholder to reflect current prompt
        if (this.commandInput) {
            this.commandInput.placeholder = prompt;
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
     * Set callback for when player enters a command.
     */
    onCommand(callback: (command: string) => void): void {
        this.onCommandCallback = callback;
    }

    /**
     * Set callback for audio events. Clients that support audio (e.g., a
     * Web Audio renderer) register here to receive forwarded audio events.
     *
     * @param callback - Handler invoked for each audio event
     */
    onAudioEvent(callback: (event: AudioEvent) => void): void {
        this.onAudioEventCallback = callback;
    }

    /**
     * Handle an audio event from the engine's event pipeline.
     * Delegates to the registered callback if present, otherwise
     * uses the built-in HTML5 audio renderer.
     *
     * @param event - The audio event from the engine's event pipeline
     */
    handleAudioEvent(event: AudioEvent): void {
        if (this.onAudioEventCallback) {
            this.onAudioEventCallback(event);
            return;
        }
        this.renderAudio(event);
    }

    /**
     * Unlock audio playback on the first user gesture. Browsers
     * (especially Safari) block Audio.play() until a user-initiated
     * event. Called from the keydown handler so the gesture context
     * propagates. Replays any queued audio events after unlock.
     */
    private unlockAudio(): void {
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;

        // Replay any audio events that arrived before the first gesture
        const pending = this.pendingAudioEvents.splice(0);
        for (const event of pending) {
            this.renderAudioNow(event);
        }
    }

    /**
     * Built-in HTML5 audio renderer. Queues events until audio is
     * unlocked by a user gesture, then plays immediately.
     */
    private renderAudio(event: AudioEvent): void {
        if (!this.audioUnlocked) {
            this.pendingAudioEvents.push(event);
            return;
        }
        this.renderAudioNow(event);
    }

    /**
     * Actually play/stop audio. Only called after audio is unlocked.
     */
    private renderAudioNow(event: AudioEvent): void {
        const data = (event as any).data ?? event;

        switch (event.type) {
            case 'audio.ambient.play': {
                const channel = data.channel as string;
                // Stop existing channel if playing
                const existing = this.ambientChannels.get(channel);
                if (existing) {
                    existing.pause();
                    existing.remove();
                }
                const audio = new Audio(data.src);
                audio.loop = data.loop !== false;
                audio.volume = data.volume ?? 0.3;
                audio.play().catch(() => {
                    // Autoplay blocked — browser requires user interaction first
                    console.debug('[audio] Autoplay blocked for ambient channel:', channel);
                });
                this.ambientChannels.set(channel, audio);
                break;
            }

            case 'audio.ambient.stop': {
                const ch = data.channel as string;
                const el = this.ambientChannels.get(ch);
                if (el) {
                    el.pause();
                    el.remove();
                    this.ambientChannels.delete(ch);
                }
                break;
            }

            case 'audio.ambient.stop_all': {
                for (const [, el] of this.ambientChannels) {
                    el.pause();
                    el.remove();
                }
                this.ambientChannels.clear();
                break;
            }

            case 'audio.music.play': {
                if (this.musicTrack) {
                    this.musicTrack.pause();
                    this.musicTrack.remove();
                }
                const music = new Audio(data.src);
                music.loop = data.loop !== false;
                music.volume = data.volume ?? 0.5;
                music.play().catch(() => {
                    console.debug('[audio] Autoplay blocked for music');
                });
                this.musicTrack = music;
                break;
            }

            case 'audio.music.stop': {
                if (this.musicTrack) {
                    this.musicTrack.pause();
                    this.musicTrack.remove();
                    this.musicTrack = null;
                }
                break;
            }

            default:
                console.debug('[audio] Unhandled audio event:', event.type);
        }
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