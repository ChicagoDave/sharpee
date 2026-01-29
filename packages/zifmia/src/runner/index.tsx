/**
 * ZifmiaRunner - Loads and runs a .sharpee story bundle
 *
 * Fetches a bundle URL, extracts it, dynamically imports the story module,
 * bootstraps the engine, and renders the game UI.
 */

import React, { useEffect, useState } from 'react';
import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { GameProvider } from '../context';
import { GameShell } from '../components';
import { loadBundle, releaseBundle } from '../loader';
import type { LoadedBundle } from '../loader';
import type { Story } from '@sharpee/engine';

export interface ZifmiaRunnerProps {
  bundleUrl: string;
  onError?: (error: Error) => void;
  onLoaded?: (metadata: LoadedBundle['metadata']) => void;
}

type RunnerState =
  | { phase: 'loading' }
  | { phase: 'error'; error: Error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { phase: 'running'; engine: any; bundle: LoadedBundle };

export function ZifmiaRunner({ bundleUrl, onError, onLoaded }: ZifmiaRunnerProps) {
  const [state, setState] = useState<RunnerState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let loadedBundle: LoadedBundle | undefined;

    async function boot() {
      try {
        // 1. Fetch the .sharpee bundle
        const response = await fetch(bundleUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // 2. Extract bundle contents
        loadedBundle = await loadBundle(arrayBuffer);
        if (cancelled) return;

        // 3. Dynamically import the story module
        const storyModule = await import(/* @vite-ignore */ loadedBundle.storyModuleUrl);
        if (cancelled) return;

        const story: Story = storyModule.story ?? storyModule.default?.story ?? storyModule.default;
        if (!story || !story.config) {
          throw new Error('Bundle story.js does not export a valid story object');
        }

        // 4. Bootstrap engine (same pattern as react-entry.tsx)
        const world = new WorldModel();
        const player = world.createEntity('player', EntityType.ACTOR);
        world.setPlayer(player.id);

        const language = new LanguageProvider();
        const parser = new Parser(language);

        if (story.extendParser) {
          story.extendParser(parser);
        }
        if (story.extendLanguage) {
          story.extendLanguage(language);
        }

        const perceptionService = new PerceptionService();

        const engine = new GameEngine({
          world,
          player,
          parser,
          language,
          perceptionService,
        });

        engine.setStory(story);

        if (cancelled) return;

        // 5. Apply story theme CSS
        if (loadedBundle.themeCSS) {
          const style = document.createElement('style');
          style.setAttribute('data-sharpee-story-theme', story.config.id);
          style.textContent = loadedBundle.themeCSS;
          document.head.appendChild(style);
        }

        onLoaded?.(loadedBundle.metadata);
        setState({ phase: 'running', engine, bundle: loadedBundle });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        setState({ phase: 'error', error });
      }
    }

    boot();

    return () => {
      cancelled = true;
      if (loadedBundle) {
        releaseBundle(loadedBundle);
      }
      // Clean up injected theme style
      const themeStyle = document.querySelector('style[data-sharpee-story-theme]');
      if (themeStyle) {
        themeStyle.remove();
      }
    };
  }, [bundleUrl]);

  if (state.phase === 'loading') {
    return <div className="zifmia-loading">Loading story…</div>;
  }

  if (state.phase === 'error') {
    return (
      <div className="zifmia-error">
        <h2>Failed to load story</h2>
        <p>{state.error.message}</p>
      </div>
    );
  }

  return (
    <GameProvider engine={state.engine}>
      <GameShell storyId={state.bundle.metadata.title} />
    </GameProvider>
  );
}
