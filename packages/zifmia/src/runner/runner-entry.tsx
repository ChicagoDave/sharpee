/**
 * Zifmia Runner — Browser entry point
 *
 * App shell state machine:
 *   library  → loading  (user selects story)
 *   loading  → playing  (bundle loaded)
 *   loading  → error    (load failed)
 *   playing  → library  (user quits)
 *   error    → library  (user clicks back)
 *
 * ?bundle= query param skips the library and loads directly.
 */

import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ZifmiaRunner } from './index';
import { StoryLibrary, addRecentStory } from './StoryLibrary';
import type { LoadedBundle } from '../loader';

type AppState =
  | { phase: 'library' }
  | { phase: 'playing'; bundleUrl?: string; bundleData?: ArrayBuffer }
  | { phase: 'error'; error: string };

function App() {
  // If ?bundle= is in the URL, go straight to playing
  const params = new URLSearchParams(window.location.search);
  const initialBundleUrl = params.get('bundle');

  const [state, setState] = useState<AppState>(
    initialBundleUrl
      ? { phase: 'playing', bundleUrl: initialBundleUrl }
      : { phase: 'library' }
  );

  const handleSelectUrl = useCallback((url: string) => {
    setState({ phase: 'playing', bundleUrl: url });
  }, []);

  const handleSelectFile = useCallback((data: ArrayBuffer, _filename: string) => {
    setState({ phase: 'playing', bundleData: data });
  }, []);

  const handleClose = useCallback(() => {
    setState({ phase: 'library' });
  }, []);

  const handleError = useCallback((error: Error) => {
    setState({ phase: 'error', error: error.message });
  }, []);

  const handleLoaded = useCallback((metadata: LoadedBundle['metadata']) => {
    document.title = `${metadata.title} — Zifmia`;

    // Track in recent stories
    const url = state.phase === 'playing' ? state.bundleUrl : undefined;
    addRecentStory({
      title: metadata.title,
      author: Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author,
      storyId: metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      source: url ? 'url' : 'file',
      url,
    });
  }, [state]);

  if (state.phase === 'library') {
    return (
      <StoryLibrary
        onSelectUrl={handleSelectUrl}
        onSelectFile={handleSelectFile}
      />
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="zifmia-error" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h2>Error</h2>
        <p>{state.error}</p>
        <button onClick={() => setState({ phase: 'library' })}>Back to Library</button>
      </div>
    );
  }

  return (
    <ZifmiaRunner
      bundleUrl={state.bundleUrl}
      bundleData={state.bundleData}
      onClose={handleClose}
      onError={handleError}
      onLoaded={handleLoaded}
    />
  );
}

// --- Mount ---

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);
