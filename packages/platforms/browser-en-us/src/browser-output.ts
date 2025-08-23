/**
 * Browser output handler for Sharpee
 * Manages text output to the browser UI
 */

import type { GameEngine } from '@sharpee/sharpee';
import type { BrowserTextService } from '@sharpee/text-service-browser';

export class BrowserOutput {
  private textContent: HTMLElement | null = null;
  private mainWindow: HTMLElement | null = null;
  private locationName: HTMLElement | null = null;
  private scoreTurns: HTMLElement | null = null;
  private currentScore: number = 0;
  private currentTurn: number = 0;
  
  constructor(private textService: BrowserTextService) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeDOM());
    } else {
      this.initializeDOM();
    }
  }
  
  private initializeDOM(): void {
    this.textContent = document.getElementById('text-content');
    this.mainWindow = document.getElementById('main-window');
    this.locationName = document.getElementById('location-name');
    this.scoreTurns = document.getElementById('score-turns');
  }
  
  initialize(engine: GameEngine): void {
    // Listen for game events to update status line
    engine.on('event', (event) => {
      if (event.type === 'room.entered' || event.type === 'game.location') {
        const location = event.data?.name || event.data?.location;
        if (location) {
          this.updateLocation(location);
        }
      } else if (event.type === 'game.score') {
        this.updateScore(event.data?.score || 0);
      } else if (event.type === 'turn.complete') {
        this.incrementTurn();
      }
    });
  }
  
  write(text: string): void {
    if (!this.textContent) return;
    
    // Check if this is a command echo
    if (text.startsWith('>')) {
      const span = document.createElement('span');
      span.className = 'command-echo';
      span.textContent = text;
      this.textContent.appendChild(span);
    } else {
      // Regular text - parse for paragraphs
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          const p = document.createElement('p');
          p.textContent = line;
          this.textContent.appendChild(p);
        }
      });
    }
    
    this.scrollToBottom();
  }
  
  showError(message: string): void {
    if (!this.textContent) return;
    
    const span = document.createElement('span');
    span.className = 'error';
    span.textContent = message + '\n';
    this.textContent.appendChild(span);
    
    this.scrollToBottom();
  }
  
  showQuery(prompt: string, options?: string[]): void {
    if (!this.textContent) return;
    
    const div = document.createElement('div');
    div.className = 'query';
    
    const promptP = document.createElement('p');
    promptP.className = 'system';
    promptP.textContent = prompt;
    div.appendChild(promptP);
    
    if (options && options.length > 0) {
      const list = document.createElement('ul');
      options.forEach((opt, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}. ${opt}`;
        list.appendChild(li);
      });
      div.appendChild(list);
    }
    
    this.textContent.appendChild(div);
    this.scrollToBottom();
  }
  
  clear(): void {
    if (this.textContent) {
      this.textContent.innerHTML = '';
    }
  }
  
  updateLocation(location: string): void {
    if (this.locationName) {
      this.locationName.textContent = location;
    }
  }
  
  updateScore(score: number): void {
    this.currentScore = score;
    this.updateStatusLine();
  }
  
  incrementTurn(): void {
    this.currentTurn++;
    this.updateStatusLine();
  }
  
  private updateStatusLine(): void {
    if (this.scoreTurns) {
      this.scoreTurns.textContent = `Score: ${this.currentScore} | Turns: ${this.currentTurn}`;
    }
  }
  
  private scrollToBottom(): void {
    if (this.mainWindow) {
      this.mainWindow.scrollTop = this.mainWindow.scrollHeight;
    }
  }
}