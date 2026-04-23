/**
 * Application shell and routing for the Sharpee multi-user client.
 *
 * Public interface: {@link App} default export — rendered by main.tsx.
 *
 * Bounded context: client root (ADR-153 frontend). Three routes:
 *   - `/`              → {@link Landing}
 *   - `/r/:code`       → {@link Landing} with passcode modal pre-opened
 *   - `/room/:room_id` → {@link Room}
 * Any other path falls back to the landing page.
 */

import { useCallback } from 'react';
import Landing from './pages/Landing';
import Room from './pages/Room';
import ThemePicker from './components/ThemePicker';
import { matchCodePath, matchRoomPath, navigate, useRoute } from './router';

export default function App(): JSX.Element {
  const path = useRoute();
  const roomId = matchRoomPath(path);
  const code = matchCodePath(path);

  const handleRoomCreated = useCallback((room_id: string) => {
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  const handleJoined = useCallback((room_id: string) => {
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
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
        <ThemePicker />
      </header>
      <main style={{ flex: 1 }}>
        {roomId !== null ? (
          <Room roomId={roomId} />
        ) : (
          <Landing
            onRoomCreated={handleRoomCreated}
            onJoined={handleJoined}
            prefillCode={code ?? undefined}
          />
        )}
      </main>
    </div>
  );
}
