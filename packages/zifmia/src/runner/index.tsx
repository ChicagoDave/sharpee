/**
 * ZifmiaRunner - Loads and runs a .sharpee story bundle
 *
 * Fetches or receives a bundle, extracts it, dynamically imports the story module,
 * bootstraps the engine, and renders the game UI with save/restore and export support.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { GameProvider } from '../context';
import type { GameProviderHandle } from '../context';
import type { GameState } from '../types/game-state';
import { GameShell } from '../components';
import { loadBundle, releaseBundle } from '../loader';
import type { LoadedBundle } from '../loader';
import type { Story } from '@sharpee/engine';
import { BrowserStorageProvider } from '../storage/index.js';
import { SaveRestoreManager } from './save-integration.js';
import type { SaveData } from './save-integration.js';
import { SaveDialog } from './SaveDialog.js';
import { RestoreDialog } from './RestoreDialog.js';
import { exportTranscriptMarkdown, exportWalkthrough, downloadFile } from './transcript-export.js';

export interface ZifmiaRunnerProps {
  /** URL to fetch the .sharpee bundle from */
  bundleUrl?: string;
  /** Pre-loaded bundle data (from file picker or drag-drop) */
  bundleData?: ArrayBuffer;
  /** Called when user quits the game */
  onClose?: () => void;
  onError?: (error: Error) => void;
  onLoaded?: (metadata: LoadedBundle['metadata']) => void;
}

type RunnerState =
  | { phase: 'loading' }
  | { phase: 'error'; error: Error }
  | { phase: 'running'; engine: GameEngine; bundle: LoadedBundle; world: WorldModel };

export function ZifmiaRunner({ bundleUrl, bundleData, onClose, onError, onLoaded }: ZifmiaRunnerProps) {
  const [state, setState] = useState<RunnerState>({ phase: 'loading' });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const gameHandleRef = useRef<GameProviderHandle | null>(null);
  const saveManagerRef = useRef<SaveRestoreManager | null>(null);
  const storageProvider = useRef(new BrowserStorageProvider()).current;

  useEffect(() => {
    let cancelled = false;
    let loadedBundle: LoadedBundle | undefined;

    async function boot() {
      try {
        // 1. Get the bundle bytes
        let arrayBuffer: ArrayBuffer;
        if (bundleData) {
          arrayBuffer = bundleData;
        } else if (bundleUrl) {
          const response = await fetch(bundleUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        } else {
          throw new Error('ZifmiaRunner requires either bundleUrl or bundleData');
        }

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

        // 4. Bootstrap engine
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

        // 5. Set up save/restore manager with baseline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const srm = new SaveRestoreManager(world as any, story.config.id);
        srm.captureBaseline();
        saveManagerRef.current = srm;

        // 6. Apply story theme CSS
        if (loadedBundle.themeCSS) {
          const style = document.createElement('style');
          style.setAttribute('data-sharpee-story-theme', story.config.id);
          style.textContent = loadedBundle.themeCSS;
          document.head.appendChild(style);
        }

        onLoaded?.(loadedBundle.metadata);
        setState({ phase: 'running', engine: engine as unknown as GameEngine, bundle: loadedBundle, world });
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
      const themeStyle = document.querySelector('style[data-sharpee-story-theme]');
      if (themeStyle) {
        themeStyle.remove();
      }
    };
  }, [bundleUrl, bundleData]);

  // --- Callbacks ---

  const getStoryId = useCallback(() => {
    return saveManagerRef.current?.getStoryId() ?? 'unknown';
  }, []);

  const handleSave = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleRestore = useCallback(() => {
    setShowRestoreDialog(true);
  }, []);

  const handleQuit = useCallback(() => {
    // Auto-save before quitting
    const handle = gameHandleRef.current;
    const srm = saveManagerRef.current;
    if (handle && srm) {
      const gameState = handle.getState();
      const saveData = srm.captureState(gameState.transcript, gameState.turns, gameState.score);
      storageProvider.autoSave(srm.getStoryId(), saveData);
    }
    onClose?.();
  }, [onClose, storageProvider]);

  const handleSaveConfirm = useCallback(async (slotName: string) => {
    const handle = gameHandleRef.current;
    const srm = saveManagerRef.current;
    if (!handle || !srm) return;

    const gameState = handle.getState();
    const saveData = srm.captureState(gameState.transcript, gameState.turns, gameState.score);
    await storageProvider.save(srm.getStoryId(), slotName, saveData);
    setShowSaveDialog(false);
  }, [storageProvider]);

  const handleRestoreConfirm = useCallback(async (slotName: string) => {
    const handle = gameHandleRef.current;
    const srm = saveManagerRef.current;
    if (!handle || !srm) return;

    const raw = await storageProvider.restore(srm.getStoryId(), slotName);
    if (!raw) return;

    const restored = srm.restoreState(raw as SaveData);
    handle.dispatch({
      type: 'TRANSCRIPT_RESTORED',
      transcript: restored.transcript,
      turns: restored.turnCount,
      score: restored.score,
    });
    setShowRestoreDialog(false);
  }, [storageProvider]);

  const handleExportTranscript = useCallback(() => {
    const handle = gameHandleRef.current;
    if (!handle) return;
    const { transcript } = handle.getState();
    const storyTitle = state.phase === 'running' ? state.bundle.metadata.title : undefined;
    const md = exportTranscriptMarkdown(transcript, storyTitle);
    const filename = `${getStoryId()}-transcript-${Date.now()}.md`;
    downloadFile(md, filename, 'text/markdown');
  }, [state, getStoryId]);

  const handleExportWalkthrough = useCallback(() => {
    const handle = gameHandleRef.current;
    if (!handle) return;
    const { transcript } = handle.getState();
    const wt = exportWalkthrough(transcript);
    const filename = `${getStoryId()}-walkthrough-${Date.now()}.transcript`;
    downloadFile(wt, filename, 'text/plain');
  }, [getStoryId]);

  const handleTurnCompleted = useCallback((gameState: GameState) => {
    const srm = saveManagerRef.current;
    if (!srm) return;
    const saveData = srm.captureState(gameState.transcript, gameState.turns, gameState.score);
    storageProvider.autoSave(srm.getStoryId(), saveData);
  }, [storageProvider]);

  // --- Render ---

  if (state.phase === 'loading') {
    return <div className="zifmia-loading">Loading story…</div>;
  }

  if (state.phase === 'error') {
    return (
      <div className="zifmia-error">
        <h2>Failed to load story</h2>
        <p>{state.error.message}</p>
        {onClose && <button onClick={onClose}>Back to Library</button>}
      </div>
    );
  }

  const storyTitle = state.bundle.metadata.title;
  const storyId = getStoryId();

  return (
    <>
      <GameProvider
        engine={state.engine as unknown as Parameters<typeof GameProvider>[0]['engine']}
        handleRef={gameHandleRef}
        onTurnCompleted={handleTurnCompleted}
      >
        <GameShell
          storyId={storyId}
          storyTitle={storyTitle}
          onSave={handleSave}
          onRestore={handleRestore}
          onQuit={handleQuit}
          onExportTranscript={handleExportTranscript}
          onExportWalkthrough={handleExportWalkthrough}
        />
      </GameProvider>

      {showSaveDialog && (
        <SaveDialog
          storageProvider={storageProvider}
          storyId={storyId}
          suggestedName={saveManagerRef.current?.suggestSaveName(
            gameHandleRef.current?.getState().turns ?? 0
          ) ?? 'save'}
          onSave={handleSaveConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {showRestoreDialog && (
        <RestoreDialog
          storageProvider={storageProvider}
          storyId={storyId}
          onRestore={handleRestoreConfirm}
          onCancel={() => setShowRestoreDialog(false)}
        />
      )}
    </>
  );
}
