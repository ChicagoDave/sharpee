/**
 * React Entry Point for Dungeo
 *
 * This file is the entry point for the React browser client bundle.
 * It creates the game engine and passes it to the React client.
 *
 * Styling is handled by external theme CSS files that are embedded
 * in the HTML during build. See packages/client-react/themes/
 */

import { createRoot } from 'react-dom/client';
import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { GameProvider, GameShell } from '@sharpee/client-react';
import { PerceptionService } from '@sharpee/stdlib';
import { story } from './index';

// Create the game engine
const world = new WorldModel();
const player = world.createEntity('player', EntityType.ACTOR);
world.setPlayer(player.id);

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

const engine = new GameEngine({
  world,
  player,
  parser,
  language,
  perceptionService,
});

// Set story (but don't start yet - GameProvider will handle that)
engine.setStory(story);

// Mount the app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <GameProvider engine={engine}>
    <GameShell storyId="dungeo" />
  </GameProvider>
);
