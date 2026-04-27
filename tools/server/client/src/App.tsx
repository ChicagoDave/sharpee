/**
 * Application shell and routing for the Sharpee multi-user client.
 *
 * Public interface: {@link App} default export — rendered by main.tsx.
 *
 * Bounded context: client root (ADR-153 frontend, ADR-161 R11 identity
 * banner). Three routes:
 *   - `/`              → {@link Landing}
 *   - `/r/:code`       → {@link Landing} with passcode modal pre-opened
 *   - `/room/:room_id` → {@link Room}
 * Any other path falls back to the landing page.
 *
 * App also owns the persistent identity (ADR-161). When no identity is
 * stored, {@link IdentitySetupPanel} renders as a banner above the page —
 * Landing remains visible (browse/explore is unaffected) but action
 * buttons that need an identity self-disable until one exists. This is a
 * gate-as-banner, not a page-replacement, per ADR-161 R11.
 *
 * The identity is read from localStorage on mount and refreshed whenever
 * any tab (this one or another) writes/erases via
 * {@link subscribeToIdentityChanges}, so an erase in another tab
 * immediately re-locks this tab's action buttons and re-shows the panel.
 */

import { useCallback, useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Room from './pages/Room';
import ThemePicker from './components/ThemePicker';
import IdentitySetupPanel from './identity/IdentitySetupPanel';
import IdentityPickerButton from './identity/identity-picker-button';
import {
  getStoredIdentity,
  subscribeToIdentityChanges,
  type StoredIdentity,
} from './identity/identity-store';
import { matchCodePath, matchRoomPath, navigate, useRoute } from './router';

export default function App(): JSX.Element {
  const path = useRoute();
  const roomId = matchRoomPath(path);
  const code = matchCodePath(path);
  const [identity, setIdentity] = useState<StoredIdentity | null>(() =>
    getStoredIdentity(),
  );

  // Re-read on any same-tab or cross-tab identity change so the banner +
  // gating reflect the current localStorage state without polling.
  useEffect(() => {
    return subscribeToIdentityChanges(() => {
      setIdentity(getStoredIdentity());
    });
  }, []);

  const handleRoomCreated = useCallback((room_id: string) => {
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  const handleJoined = useCallback((room_id: string) => {
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  const handleIdentityEstablished = useCallback((triple: StoredIdentity) => {
    setIdentity(triple);
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        role="banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
          borderBottom: '1px solid var(--sharpee-border)',
          background: 'var(--sharpee-bg-secondary)',
        }}
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontFamily: 'var(--sharpee-font-ui)',
            fontWeight: 600,
          }}
        >
          Sharpee
        </a>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {identity && <IdentityPickerButton identity={identity} />}
          <ThemePicker />
        </div>
      </header>
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {!identity && (
          <IdentitySetupPanel onIdentityEstablished={handleIdentityEstablished} />
        )}
        {roomId !== null ? (
          <Room roomId={roomId} />
        ) : (
          <Landing
            onRoomCreated={handleRoomCreated}
            onJoined={handleJoined}
            prefillCode={code ?? undefined}
            identity={identity}
          />
        )}
      </main>
    </div>
  );
}
