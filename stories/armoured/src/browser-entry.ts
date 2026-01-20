/**
 * Browser Entry Point for Armoured
 *
 * This file initializes the game engine and connects it to the browser UI.
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { story } from './index';

// Game metadata
const GAME_TITLE = 'ARMOURED';
const GAME_DESCRIPTION = 'A sample story demonstrating trait composition';
const GAME_AUTHORS = 'Sharpee Examples';
const GAME_VERSION = '0.1.0';

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
    displayText(text);
    currentTurn = turn;
    updateStatusLine();
  });

  engine.on('event', (event: any) => {
    // Handle specific events if needed
    if (event.type === 'command.failed' || event.type === 'action.blocked') {
      beep();
    }
  });

  // Set the story
  engine.setStory(story);
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
    commandInput?.focus();
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
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
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
 * Display the game title block
 */
function displayTitle(): void {
  displayText(GAME_TITLE);
  displayText(GAME_DESCRIPTION);
  displayText(`By ${GAME_AUTHORS}`);
  displayText('');
  displayText(`Version ${GAME_VERSION}`);
  displayText('');
  displayText('Type HELP for instructions.');
  displayText('');
}

/**
 * Update the status line
 */
function updateStatusLine(): void {
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
    statusScore.textContent = `Turns: ${currentTurn}`;
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
 * Simple beep for errors
 */
function beep(): void {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Start the game
 */
async function start(): Promise<void> {
  console.log('=== ARMOURED BROWSER START ===');

  try {
    setupDOM();
    initializeGame();

    await engine.start();

    displayTitle();
    await engine.executeTurn('look');

    commandInput?.focus();
  } catch (error) {
    console.error('Startup error:', error);
    displayText(`[Startup Error: ${error}]`);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
