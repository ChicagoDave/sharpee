/**
 * Browser Entry Point for Dungeo
 *
 * This file is the entry point for the browser bundle.
 * It initializes the game engine and connects it to the browser UI.
 */

import { GameEngine, SequencedEvent } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { story } from './index';

// DOM elements
let statusLocation: HTMLElement | null;
let statusScore: HTMLElement | null;
let textContent: HTMLElement | null;
let mainWindow: HTMLElement | null;
let commandInput: HTMLInputElement | null;

// Game state
let engine: GameEngine;
let world: WorldModel;
let commandHistory: string[] = [];
let historyIndex = -1;
let currentTurn = 0;
let currentScore = 0;

// Audio context for PC speaker beep
let audioContext: AudioContext | null = null;

/**
 * Play classic Infocom PC speaker beep
 * ~800Hz square wave, short duration
 */
function beep(frequency = 800, duration = 100): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square'; // PC speaker was square wave
    oscillator.frequency.value = frequency;

    gainNode.gain.value = 0.1; // Not too loud

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    // Audio not available, silently ignore
  }
}

/**
 * Initialize the game
 */
function initializeGame(): void {
  // Create world and player
  world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser and language
  const language = new LanguageProvider();
  const parser = new Parser(language);

  // Extend parser and language with story-specific vocabulary
  if (story.extendParser) {
    story.extendParser(parser);
  }
  if (story.extendLanguage) {
    story.extendLanguage(language);
  }

  // Create perception service
  const perceptionService = new PerceptionService();

  // Create engine
  engine = new GameEngine({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  // Set up event handlers
  engine.on('text:output', (text: string, turn: number) => {
    console.log('[text:output]', { text, turn });
    displayText(text);
    currentTurn = turn;
    updateStatusLine();
  });

  engine.on('event', (event: SequencedEvent) => {
    console.log('[event]', event.type, event.data);

    // Beep on errors/failures (classic Infocom style)
    if (event.type === 'command.failed' ||
        event.type === 'action.blocked' ||
        event.type.includes('.blocked') ||
        event.type === 'game.player_death') {
      beep();
    }

    // Track score changes
    if (event.type === 'game.score_changed' && event.data) {
      currentScore = event.data.newScore ?? currentScore;
      updateStatusLine();
      // Celebratory beep on score increase
      if (event.data.newScore > (event.data.oldScore ?? 0)) {
        beep(1000, 50); // Higher, shorter beep for points
      }
    }
  });

  // Set the story and start
  engine.setStory(story);
  engine.start();
}

/**
 * Set up DOM elements and event handlers
 */
function setupDOM(): void {
  statusLocation = document.getElementById('location-name');
  statusScore = document.getElementById('score-turns');
  textContent = document.getElementById('text-content');
  mainWindow = document.getElementById('main-window');
  commandInput = document.getElementById('command-input') as HTMLInputElement;

  if (!commandInput) {
    console.error('Command input element not found');
    return;
  }

  // Handle keyboard input
  commandInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  });

  // Keep focus on input
  document.addEventListener('click', () => {
    if (commandInput && !commandInput.disabled) {
      commandInput.focus();
    }
  });
}

/**
 * Handle command submission
 */
async function handleCommand(): Promise<void> {
  if (!commandInput) return;

  const command = commandInput.value.trim();
  if (!command) return;

  // Add to history
  commandHistory.push(command);
  historyIndex = commandHistory.length;

  // Clear input
  commandInput.value = '';

  // Display command echo
  displayCommand(command);

  // Execute command
  try {
    await engine.executeTurn(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    displayText(`[Error: ${message}]`);
  }
}

/**
 * Navigate command history
 */
function navigateHistory(direction: number): void {
  if (!commandInput) return;

  const newIndex = historyIndex + direction;

  if (newIndex < 0) return;

  if (newIndex >= commandHistory.length) {
    historyIndex = commandHistory.length;
    commandInput.value = '';
    return;
  }

  historyIndex = newIndex;
  commandInput.value = commandHistory[historyIndex];

  // Move cursor to end
  commandInput.setSelectionRange(
    commandInput.value.length,
    commandInput.value.length
  );
}

/**
 * Display text in the main window
 */
function displayText(text: string): void {
  if (!textContent) return;

  const lines = text.split('\n');

  for (const line of lines) {
    if (line.trim()) {
      const p = document.createElement('p');
      p.textContent = line;
      textContent.appendChild(p);
    }
  }

  scrollToBottom();
}

/**
 * Display command echo
 */
function displayCommand(command: string): void {
  if (!textContent) return;

  const div = document.createElement('div');
  div.className = 'command-echo';
  div.textContent = `> ${command}`;
  textContent.appendChild(div);

  scrollToBottom();
}

/**
 * Update the status line
 */
function updateStatusLine(): void {
  // Get current location
  const player = world.getPlayer();
  let locationName = '';

  if (player) {
    const locationId = world.getLocation(player.id);
    if (locationId) {
      const room = world.getEntity(locationId);
      if (room) {
        locationName = room.name || 'Unknown';
      }
    }
  }

  if (statusLocation) {
    statusLocation.textContent = locationName;
  }

  if (statusScore) {
    statusScore.textContent = `Score: ${currentScore} | Turns: ${currentTurn}`;
  }
}

/**
 * Scroll main window to bottom
 */
function scrollToBottom(): void {
  if (mainWindow) {
    mainWindow.scrollTop = mainWindow.scrollHeight;
  }
}

/**
 * Start the game
 */
async function start(): Promise<void> {
  console.log('=== DUNGEO BROWSER START ===');

  try {
    setupDOM();
    console.log('DOM setup complete');

    initializeGame();
    console.log('Game initialized');

    // Show initial room description
    displayText('');
    console.log('Executing initial look command...');
    await engine.executeTurn('look');
    console.log('Initial look complete');

    // Focus input
    if (commandInput) {
      commandInput.focus();
    }
  } catch (error) {
    console.error('=== STARTUP ERROR ===', error);
    displayText(`[Startup Error: ${error}]`);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
