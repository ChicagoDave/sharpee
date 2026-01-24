/**
 * React Entry Point for Dungeo
 *
 * This file is the entry point for the React browser client bundle.
 * It creates the game engine and passes it to the React client.
 */

import { createRoot } from 'react-dom/client';
import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { GameProvider, GameShell, gameShellStyles } from '@sharpee/client-react';
import { story } from './index';

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = gameShellStyles;
document.head.appendChild(styleSheet);

// Create the game engine
const world = new WorldModel();
const player = world.createEntity('player', EntityType.ACTOR);
world.setPlayer(player.id);

const language = new LanguageProvider();
const parser = new Parser(language);

const engine = new GameEngine({
  world,
  player,
  parser,
  language,
});

// Set story and start
engine.setStory(story);
engine.start();

// Mount the app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <GameProvider engine={engine}>
    <GameShell theme="infocom" storyId="dungeo" />
  </GameProvider>
);
