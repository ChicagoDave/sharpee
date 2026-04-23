/**
 * ReactDOM entry point for the Sharpee multi-user browser client.
 *
 * Public interface: none (side-effect module; bootstraps React).
 *
 * Bounded context: client bootstrap (ADR-153 frontend).
 *
 * Theme is applied to <html> synchronously before React mounts so the initial
 * paint uses the user's preferred palette (no flash-of-unstyled-theme).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initThemeOnBoot } from './storage/theme';
import './styles/themes.css';

initThemeOnBoot();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
