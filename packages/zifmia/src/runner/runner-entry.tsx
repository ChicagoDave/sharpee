/**
 * Zifmia Runner — Browser entry point
 *
 * Reads ?bundle= query parameter and loads the .sharpee story bundle.
 * Served from dist/runner/index.html with an importmap for @sharpee/* packages.
 */

import { createRoot } from 'react-dom/client';
import { ZifmiaRunner } from './index';

const params = new URLSearchParams(window.location.search);
const bundleUrl = params.get('bundle');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

if (!bundleUrl) {
  root.render(
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Zifmia Story Runner</h1>
      <p>No story bundle specified. Use <code>?bundle=path/to/story.sharpee</code></p>
      <p>Or drag and drop a <code>.sharpee</code> file here.</p>
    </div>
  );
} else {
  root.render(
    <ZifmiaRunner
      bundleUrl={bundleUrl}
      onError={(err) => console.error('Zifmia load error:', err)}
      onLoaded={(meta) => {
        document.title = `${meta.title} — Zifmia`;
        console.log('Story loaded:', meta.title, 'v' + meta.version);
      }}
    />
  );
}
